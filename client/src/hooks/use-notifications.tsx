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
      
      // Filtrar eventos com participantes pendentes
      const eventsWithPendingParticipants = data.filter((event: any) => 
        event.pendingCount && event.pendingCount > 0
      );
      
      // Criar notificações para eventos com participantes pendentes
      if (eventsWithPendingParticipants.length > 0) {
        const newNotifications: Notification[] = eventsWithPendingParticipants.map((event: any) => ({
          id: `event-${event.id}-pending-${Date.now()}`,
          title: "Solicitações pendentes",
          message: `Você tem ${event.pendingCount} solicitação(ões) pendente(s) para o evento "${event.name}"`,
          date: new Date(),
          read: false,
          type: "participant_request",
          eventId: event.id
        }));
        
        // Adicionar novas notificações, evitando duplicatas (verificando pelo eventId)
        setNotifications(prev => {
          const eventIds = new Set(prev.filter(n => n.type === "participant_request").map(n => n.eventId));
          const uniqueNewNotifications = newNotifications.filter(n => !eventIds.has(n.eventId));
          return [...uniqueNewNotifications, ...prev];
        });
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