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
            return {
              id: `api-${item.recipient.id}`,
              title: item.notification.title,
              message: item.notification.message,
              date: new Date(item.notification.createdAt || Date.now()),
              read: item.recipient.read,
              type: item.notification.type,
              eventId: item.notification.eventId,
              // Manter o ID original do recipiente para operações como "marcar como lido"
              recipientId: item.recipient.id
            } as Notification;
          });
          
          // Atualizar o estado de notificações com as novas da API
          setNotifications(prev => {
            // IDs atuais para evitar duplicatas
            const existingIds = new Set(prev.map(n => n.id));
            // Filtrar notificações para incluir apenas as novas
            const uniqueNewNotifications = apiNotifications.filter(n => !existingIds.has(n.id));
            
            if (uniqueNewNotifications.length > 0) {
              console.log(`Adicionando ${uniqueNewNotifications.length} novas notificações da API`);
              // Mostrar toasts para novas notificações não lidas
              uniqueNewNotifications.filter(n => !n.read).forEach(n => {
                toast({
                  title: n.title,
                  description: n.message,
                });
              });
              
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
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    refetchOnWindowFocus: false, // Evita múltiplas chamadas ao focar a janela
  });
  
  // Query para buscar informações do usuário e seus eventos
  const { isLoading: isUserEventsLoading } = useQuery({
    queryKey: ['/api/user/events/creator'],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
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
      
      // Criar notificações para eventos com participantes pendentes
      if (eventsWithPendingParticipants.length > 0) {
        const newNotifications: Notification[] = [];
        
        // Para cada evento com participantes pendentes
        eventsWithPendingParticipants.forEach((event: any) => {
          // Contar participantes pendentes
          const pendingParticipants = event.participants.filter((p: any) => p.status === 'pending');
          
          // Criar uma notificação para cada participante pendente
          pendingParticipants.forEach((participant: any) => {
            const participantName = participant.user ? 
              `${participant.user.firstName} ${participant.user.lastName}` : 
              'Alguém';
              
            // Usar ID estável para evitar duplicações
            newNotifications.push({
              id: `event-${event.id}-participant-${participant.id}`,
              title: "Nova solicitação para seu evento",
              message: `${participantName} quer participar do seu evento "${event.name}"`,
              date: new Date(),
              read: false,
              type: "participant_request",
              eventId: event.id
            });
          });
        });
        
        // Adicionar novas notificações, evitando duplicatas por ID
        if (newNotifications.length > 0) {
          console.log('Adicionando novas notificações de solicitações:', newNotifications);
          
          setNotifications(prev => {
            // Obter IDs de notificações existentes para evitar duplicatas
            const existingIds = new Set(prev.map(n => n.id));
            const uniqueNewNotifications = newNotifications.filter(n => !existingIds.has(n.id));
            return [...uniqueNewNotifications, ...prev];
          });
        }
      }
      
      return data;
    },
    refetchInterval: 20000, // Atualiza a cada 20 segundos
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
    
    // Exibir um toast para a nova notificação
    toast({
      title: newNotification.title,
      description: newNotification.message,
    });
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