import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

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

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, "id" | "date" | "read">) => void;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

const NOTIFICATIONS_STORAGE_KEY = 'baco-notifications';

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Carregar notificações do localStorage na inicialização
  useEffect(() => {
    if (user) {
      const userKey = `${NOTIFICATIONS_STORAGE_KEY}-${user.id}`;
      const storedNotifications = localStorage.getItem(userKey);
      if (storedNotifications) {
        try {
          const parsedNotifications = JSON.parse(storedNotifications) as Notification[];
          setNotifications(parsedNotifications);
        } catch (e) {
          console.error("Erro ao carregar notificações:", e);
          localStorage.removeItem(userKey);
        }
      }
    } else {
      setNotifications([]);
    }
  }, [user]);
  
  // Salvar notificações no localStorage sempre que elas mudarem
  useEffect(() => {
    if (user && notifications.length > 0) {
      const userKey = `${NOTIFICATIONS_STORAGE_KEY}-${user.id}`;
      localStorage.setItem(userKey, JSON.stringify(notifications));
    }
  }, [notifications, user]);
  
  // Calcular número de notificações não lidas
  const unreadCount = notifications.filter(notification => !notification.read).length;
  
  // Marcar uma notificação como lida
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };
  
  // Marcar todas as notificações como lidas
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };
  
  // Adicionar uma nova notificação
  const addNotification = (notification: Omit<Notification, "id" | "date" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      date: new Date(),
      read: false
    };
    
    setNotifications(prev => [newNotification, ...prev]);
  };
  
  return (
    <NotificationsContext.Provider 
      value={{ 
        notifications, 
        unreadCount, 
        markAsRead, 
        markAllAsRead,
        addNotification
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}