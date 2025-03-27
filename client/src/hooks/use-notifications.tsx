import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from './use-auth';

export interface Notification {
  id: string;
  title: string;
  message: string;
  date: Date;
  read: boolean;
  type: "event_application" | "event_approval" | "event_rejection" | "system";
  eventId?: number;
  userId?: number;
}

// Interface para o contexto de notificações
interface NotificationsContextType {
  notifications: Notification[];
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  removeAllNotifications: () => Promise<void>;
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'date' | 'read'>) => void;
}

// Criação do contexto
const NotificationsContext = createContext<NotificationsContextType | null>(null);

// Provider do contexto
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

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
    try {
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  // Remover notificação
  const removeNotification = async (id: string) => {
    try {
      setNotifications(prev =>
        prev.filter(notification => notification.id !== id)
      );
    } catch (error) {
      console.error('Erro ao remover notificação:', error);
    }
  };

  // Remover todas as notificações
  const removeAllNotifications = async () => {
    try {
      setNotifications([]);
    } catch (error) {
      console.error('Erro ao remover todas as notificações:', error);
    }
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    try {
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
    }
  };

  // Adicionar nova notificação
  const addNotification = (notificationData: Omit<Notification, 'id' | 'date' | 'read'>) => {
    const newNotification: Notification = {
      ...notificationData,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      date: new Date(),
      read: false
    };

    setNotifications(prev => [newNotification, ...prev]);
  };

  // Valor do contexto
  const value = {
    notifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    removeAllNotifications,
    unreadCount: notifications.filter(n => !n.read).length,
    addNotification
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