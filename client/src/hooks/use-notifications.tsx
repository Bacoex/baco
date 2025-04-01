import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from './use-auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Interface para notificações no frontend
export interface Notification {
  id: string;
  title: string;
  message: string;
  date: Date;
  read: boolean;
  type: string; // Aceita qualquer tipo de notificação do backend: "event_application", "event_approval", "event_rejection", etc.
  eventId?: number | null;
  recipientId?: number; // ID do destinatário no backend (usado para marcar como lido)
}

// Interface para o contexto de notificações
interface NotificationsContextType {
  notifications: Notification[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  removeAllNotifications: () => void;
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'date' | 'read'>) => void;
  isLoading: boolean;
}

// Criação do contexto
const NotificationsContext = createContext<NotificationsContextType | null>(null);

// Provider do contexto
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar notificações do backend
  const { isLoading: isNotificationsLoading } = useQuery({
    queryKey: ['/api/notifications'],
    enabled: !!user,
    refetchInterval: 15000, // Atualizar a cada 15 segundos
    staleTime: 5000, // Considerar dados frescos por 5 segundos
    refetchOnWindowFocus: true, // Atualizar ao focar na janela
    queryFn: async () => {
      if (!user) return [];
      
      try {
        console.log('Buscando notificações da API...');
        const response = await apiRequest('GET', '/api/notifications');
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          console.log('Notificações recebidas da API:', data);
          
          // Transformar notificações da API para o formato do frontend
          const apiNotifications = data.map((item: any) => {
            console.log("Mapeando notificação da API:", item.notification);
            return {
              id: `api-${item.recipient.id}`,
              title: item.notification.title,
              message: item.notification.message,
              date: new Date(item.notification.createdAt || Date.now()),
              read: item.recipient.read,
              // Garantir que type nunca seja undefined
              type: item.notification.type || "unknown",
              eventId: item.notification.eventId,
              // Manter o ID original do recipiente para operações como "marcar como lido"
              recipientId: item.recipient.id
            } as Notification;
          });
          
          // Eliminar qualquer duplicação baseada em título e mensagem de notificação
          const deduplicatedApiNotifications: Notification[] = [];
          const notificationSignatures = new Set<string>();
          
          for (const notification of apiNotifications) {
            // Cria uma assinatura única baseada no título, mensagem e tipo
            const signature = `${notification.title}|${notification.message}|${notification.type || 'unknown'}`;
            
            // Se essa assinatura ainda não foi vista, adiciona à lista de notificações
            if (!notificationSignatures.has(signature)) {
              notificationSignatures.add(signature);
              deduplicatedApiNotifications.push(notification);
            } else {
              console.log('Detectada notificação duplicada com assinatura:', signature);
            }
          }
          
          console.log(`Após deduplicação: ${deduplicatedApiNotifications.length} de ${apiNotifications.length} notificações`);
          
          // Atualizar o estado de notificações com as novas da API
          setNotifications(prev => {
            // IDs atuais para evitar duplicatas
            const existingIds = new Set(prev.map(n => n.id));
            
            // Evitar adicionar notificações semelhantes às existentes
            const existingSignatures = new Set(
              prev.map(n => `${n.title}|${n.message}|${n.type || 'unknown'}`)
            );
            
            // Filtrar notificações para incluir apenas as novas e não similares às existentes
            const uniqueNewNotifications = deduplicatedApiNotifications.filter(n => {
              const signature = `${n.title}|${n.message}|${n.type || 'unknown'}`;
              return !existingIds.has(n.id) && !existingSignatures.has(signature);
            });
            
            if (uniqueNewNotifications.length > 0) {
              console.log(`Adicionando ${uniqueNewNotifications.length} novas notificações da API`);
              // Mostrar toast apenas para a primeira notificação não lida
              // Evitando múltiplos toasts que podem confundir o usuário
              const unreadNotifications = uniqueNewNotifications.filter(n => !n.read);
              if (unreadNotifications.length > 0) {
                const firstNotification = unreadNotifications[0];
                toast({
                  title: unreadNotifications.length > 1 
                    ? `${firstNotification.title} (+${unreadNotifications.length - 1} mais)` 
                    : firstNotification.title,
                  description: firstNotification.message,
                });
              }
              
              return [...uniqueNewNotifications, ...prev];
            }
            
            return prev;
          });
        }
        
        return data;
      } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        return [];
      }
    }
  });
  
  // Query para buscar informações do usuário e seus eventos
  const { isLoading: isUserEventsLoading } = useQuery({
    queryKey: ['/api/user/events/creator'],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      console.log('[DEBUG-NOTIFICAÇÕES] Iniciando verificação de eventos com participantes pendentes...');
      const response = await apiRequest('GET', '/api/user/events/creator');
      const data = await response.json();
      
      console.log('Eventos do usuário para verificação de solicitações pendentes:', data);
      
      // Filtrar eventos com participantes pendentes
      const eventsWithPendingParticipants = data.filter((event: any) => {
        // Verificar se o evento tem participantes
        if (!event.participants || !Array.isArray(event.participants)) {
          return false;
        }
        
        // Conta quantos participantes estão com status "pending"
        const pendingCount = event.participants.filter((p: any) => p.status === 'pending').length;
        console.log(`Evento ${event.id} (${event.name}) tem ${pendingCount} participantes pendentes`);
        
        return pendingCount > 0;
      });
      
      console.log('Eventos com participantes pendentes:', eventsWithPendingParticipants);
      
      // Verificar se já temos essas notificações no estado
      // Para evitar duplicação, vamos manter um registro das notificações que já geramos
      // em vez de tentar adicionar e depois filtrar
      if (eventsWithPendingParticipants.length > 0) {
        // Coletar todos os IDs de notificações existentes
        const existingIds = new Set(notifications.map(n => n.id));
        const processedEventsParticipants = new Set<string>();
        
        // Para debug: registrar notificações existentes
        console.log('Notificações existentes:', notifications.length, 
          notifications.map(n => ({ id: n.id, title: n.title })));
        
        // Para cada evento com participantes pendentes
        eventsWithPendingParticipants.forEach((event: any) => {
          // Obter participantes pendentes
          const pendingParticipants = event.participants.filter((p: any) => p.status === 'pending');
          
          pendingParticipants.forEach((participant: any) => {
            // Criar um ID único baseado no evento e participante
            const notificationId = `event-${event.id}-participant-${participant.id}`;
            
            // Verificar se já temos essa notificação
            if (!existingIds.has(notificationId)) {
              // Registrar que estamos processando essa combinação
              processedEventsParticipants.add(notificationId);
              
              const participantName = participant.user ? 
                `${participant.user.firstName} ${participant.user.lastName}` : 
                'Alguém';
                
              // Adicionar nova notificação
              setNotifications(prev => [
                {
                  id: notificationId,
                  title: "Nova solicitação para seu evento",
                  message: `${participantName} quer participar do seu evento "${event.name}"`,
                  date: new Date(),
                  read: false,
                  type: "participant_request",
                  eventId: event.id
                },
                ...prev
              ]);
              
              console.log(`Adicionada notificação: ${notificationId} para ${participantName}`);
            } else {
              console.log(`Ignorando notificação já existente: ${notificationId}`);
            }
          });
        });
        
        // Para debug: quantas novas notificações foram adicionadas
        if (processedEventsParticipants.size > 0) {
          console.log(`Adicionadas ${processedEventsParticipants.size} novas notificações.`);
        } else {
          console.log('Nenhuma nova notificação para adicionar.');
        }
      }
      
      return data;
    }
  });

  // Efeito para carregar notificações do localStorage na inicialização
  useEffect(() => {
    if (user) {
      try {
        const storageKey = `baco-notifications-${user.id}`;
        const stored = localStorage.getItem(storageKey);
        
        if (stored) {
          const parsedNotifications = JSON.parse(stored);
          
          // Converter strings de data em objetos Date
          const convertedNotifications = parsedNotifications.map((notif: any) => ({
            ...notif,
            date: new Date(notif.date)
          }));
          
          setNotifications(convertedNotifications);
        }
      } catch (error) {
        console.error('Erro ao carregar notificações do localStorage:', error);
      }
    }
  }, [user]);

  // Efeito para salvar notificações no localStorage quando alteradas
  useEffect(() => {
    if (user && notifications.length > 0) {
      try {
        const storageKey = `baco-notifications-${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(notifications));
      } catch (error) {
        console.error('Erro ao salvar notificações no localStorage:', error);
      }
    }
  }, [notifications, user]);

  // Marcar como lida
  const markAsRead = async (id: string) => {
    // Busca a notificação pelo ID
    const notification = notifications.find(n => n.id === id);
    if (!notification) return;
    
    // Marca como lida no estado local
    const updatedNotifications = notifications.map(notification =>
      notification.id === id
        ? { ...notification, read: true }
        : notification
    );
    setNotifications(updatedNotifications);
    
    // Se a notificação veio da API (tem o formato 'api-X'), também marca como lida no backend
    if (id.startsWith('api-') && notification.recipientId) {
      try {
        console.log(`Marcando notificação ${notification.recipientId} como lida no backend`);
        await apiRequest('PATCH', `/api/notifications/${notification.recipientId}/read`);
        // Invalidar a query para que seja buscada novamente
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      } catch (error) {
        console.error('Erro ao marcar notificação como lida no backend:', error);
      }
    }
    
    // Atualiza localStorage manualmente
    if (user) {
      try {
        const storageKey = `baco-notifications-${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedNotifications));
      } catch (error) {
        console.error('Erro ao atualizar localStorage:', error);
      }
    }
  };

  // Remover notificação
  const removeNotification = async (id: string) => {
    // Busca a notificação pelo ID
    const notification = notifications.find(n => n.id === id);
    if (!notification) return;
    
    // Remove do estado local
    const updatedNotifications = notifications.filter(notification => notification.id !== id);
    setNotifications(updatedNotifications);
    
    // Se a notificação veio da API (tem o formato 'api-X'), remove também no backend
    if (id.startsWith('api-') && notification.recipientId) {
      try {
        console.log(`Excluindo notificação ${notification.recipientId} no backend`);
        await apiRequest('DELETE', `/api/notifications/${notification.recipientId}`);
        // Invalidar a query para que seja buscada novamente
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      } catch (error) {
        console.error('Erro ao excluir notificação no backend:', error);
        // Mesmo em caso de erro, mantemos a UI consistente removendo localmente
      }
    }
    
    // Atualiza localStorage manualmente
    if (user && updatedNotifications.length > 0) {
      try {
        const storageKey = `baco-notifications-${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedNotifications));
      } catch (error) {
        console.error('Erro ao atualizar localStorage:', error);
      }
    } else if (user) {
      // Se não há mais notificações, limpar o localStorage
      try {
        const storageKey = `baco-notifications-${user.id}`;
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.error('Erro ao limpar localStorage:', error);
      }
    }
  };

  // Remover todas as notificações
  const removeAllNotifications = async () => {
    // Verificar se há notificações da API para remover
    const apiNotifications = notifications.filter(n => n.id.startsWith('api-') && n.recipientId);
    
    // Se houver notificações da API, tentar removê-las uma a uma no backend
    if (apiNotifications.length > 0) {
      console.log(`Removendo ${apiNotifications.length} notificações no backend`);
      
      for (const notification of apiNotifications) {
        if (notification.recipientId) {
          try {
            await apiRequest('DELETE', `/api/notifications/${notification.recipientId}`);
          } catch (error) {
            console.error(`Erro ao excluir notificação ${notification.recipientId} no backend:`, error);
          }
        }
      }
      
      // Invalidar a query para que seja buscada novamente
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
    
    // Remover todas as notificações no estado local
    setNotifications([]);
    
    // Limpar localStorage
    if (user) {
      try {
        const storageKey = `baco-notifications-${user.id}`;
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.error('Erro ao limpar localStorage:', error);
      }
    }
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    // Marca todas as notificações como lidas no estado local
    const updatedNotifications = notifications.map(notification => ({ ...notification, read: true }));
    setNotifications(updatedNotifications);
    
    // Obter notificações da API que precisam ser marcadas como lidas no backend
    const apiNotifications = notifications.filter(n => n.id.startsWith('api-') && !n.read && n.recipientId);
    
    // Se houver notificações da API não lidas, marca todas como lidas no backend
    if (apiNotifications.length > 0) {
      try {
        console.log(`Marcando todas as ${apiNotifications.length} notificações como lidas no backend`);
        await apiRequest('PATCH', `/api/notifications/all/read`);
        // Invalidar a query para que seja buscada novamente
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      } catch (error) {
        console.error('Erro ao marcar todas as notificações como lidas no backend:', error);
      }
    }
    
    // Atualiza localStorage manualmente
    if (user && updatedNotifications.length > 0) {
      try {
        const storageKey = `baco-notifications-${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(updatedNotifications));
      } catch (error) {
        console.error('Erro ao atualizar localStorage:', error);
      }
    }
  };

  // Adicionar nova notificação
  const addNotification = (notificationData: Omit<Notification, 'id' | 'date' | 'read'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      date: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);
    
    // Exibir um toast para a nova notificação apenas quando for criada manualmente
    // Para notificações do sistema, usamos o toast controlado acima
    // para evitar duplicidade de mensagens
    if (notificationData.type !== 'event_approval' && notificationData.type !== 'participant_request') {
      toast({
        title: newNotification.title,
        description: newNotification.message,
      });
    }
  };

  // Valor do contexto
  const value = {
    notifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    removeAllNotifications,
    unreadCount: notifications.filter(n => !n.read).length,
    addNotification,
    isLoading: isUserEventsLoading
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

// Hook para usar o contexto
export function useNotifications() {
  const context = useContext(NotificationsContext);
  
  if (!context) {
    throw new Error('useNotifications deve ser usado dentro de um NotificationsProvider');
  }
  
  return context;
}