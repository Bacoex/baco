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
  type: "participant_pending" | "participant_request" | "system";
  eventId?: number | null;
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
              
            newNotifications.push({
              id: `event-${event.id}-participant-${participant.id}-${Date.now()}`,
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
  const markAsRead = (id: string) => {
    const updatedNotifications = notifications.map(notification =>
      notification.id === id
        ? { ...notification, read: true }
        : notification
    );
    setNotifications(updatedNotifications);
    
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
  const removeNotification = (id: string) => {
    const updatedNotifications = notifications.filter(notification => notification.id !== id);
    setNotifications(updatedNotifications);
    
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
  const removeAllNotifications = () => {
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
  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(notification => ({ ...notification, read: true }));
    setNotifications(updatedNotifications);
    
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