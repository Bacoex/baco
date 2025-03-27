import { useState, useEffect } from 'react';
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

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Buscar notificações a cada 5 segundos
  useEffect(() => {
    if (user) {
      const fetchNotifications = async () => {
        try {
          const response = await fetch('/api/notifications');
          if (response.ok) {
            const data = await response.json();
            setNotifications(data);
          }
        } catch (error) {
          console.error('Erro ao buscar notificações:', error);
        }
      };

      // Busca inicial
      fetchNotifications();

      // Polling a cada 5 segundos
      const interval = setInterval(fetchNotifications, 5000);

      return () => clearInterval(interval);
    }
  }, [user]);

  // Marcar como lida
  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH'
      });
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
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE'
      });
      setNotifications(prev =>
        prev.filter(notification => notification.id !== id)
      );
    } catch (error) {
      console.error('Erro ao remover notificação:', error);
    }
  };

  return {
    notifications,
    markAsRead,
    removeNotification,
    unreadCount: notifications.filter(n => !n.read).length
  };
}