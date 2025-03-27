import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from './use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Interface para notificações do backend
interface ServerNotification {
  id: number;
  userId: number;
  message: string;
  read: boolean;
  createdAt: string;
  title: string;
  type: string;
  eventId?: number;
}

// Interface para notificações no frontend
export interface Notification {
  id: string;
  title: string;
  message: string;
  date: Date;
  read: boolean;
  type: "event_application" | "event_approval" | "event_rejection" | "system";
  eventId?: number;
  userId?: number;
  // Campo para controle interno de sincronização
  serverId?: number;
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
  isLoading: boolean;
  error: Error | null;
}

// Criação do contexto
const NotificationsContext = createContext<NotificationsContextType | null>(null);

// Converte notificação do servidor para o formato frontend
const convertServerNotification = (serverNotif: ServerNotification): Notification => ({
  id: `server-${serverNotif.id}`,
  serverId: serverNotif.id,
  title: serverNotif.title || "Notificação",
  message: serverNotif.message,
  date: new Date(serverNotif.createdAt),
  read: serverNotif.read,
  type: serverNotif.type as any,
  eventId: serverNotif.eventId,
  userId: serverNotif.userId
});

// Provider do contexto
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar notificações do servidor
  const { 
    data: serverNotifications, 
    isLoading,
    error
  } = useQuery<ServerNotification[], Error>({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      if (!user) return [];
      const response = await apiRequest('GET', '/api/notifications');
      const data = await response.json();
      return data;
    },
    enabled: !!user,
    refetchOnWindowFocus: false
  });

  // Mutação para marcar notificação como lida no servidor
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest('PATCH', `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  // Mutação para remover notificação no servidor
  const removeNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest('DELETE', `/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
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

  // Efeito para sincronizar notificações do servidor
  useEffect(() => {
    if (serverNotifications && user) {
      // Converter notificações do servidor para formato frontend
      const serverConverted = serverNotifications.map(convertServerNotification);
      
      // Substituir todas as notificações do servidor, mantendo apenas as locais
      setNotifications(prev => {
        // Filtrar notificações locais que NÃO vieram do servidor e NÃO estão marcadas para remover
        const localOnly = prev.filter(notif => notif.id.startsWith('local-'));
        
        // Se não houver notificações do servidor, não mescle com as locais
        if (serverConverted.length === 0 && localOnly.length === 0) {
          // Limpar localStorage para evitar persistência de notificações removidas
          try {
            const storageKey = `baco-notifications-${user.id}`;
            localStorage.removeItem(storageKey);
          } catch (error) {
            console.error('Erro ao limpar localStorage:', error);
          }
          return [];
        }
        
        // Mesclar com notificações do servidor
        return [...serverConverted, ...localOnly];
      });
    }
  }, [serverNotifications, user]);

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
      // Atualiza estado local imediatamente
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
      
      // Encontrar a notificação
      const notification = notifications.find(n => n.id === id);
      
      // Se tiver serverId, fazer a chamada à API
      if (notification?.serverId) {
        await markAsReadMutation.mutateAsync(notification.serverId);
        // Invalidar a query para forçar atualização dos dados
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar a notificação como lida",
        variant: "destructive"
      });
    }
  };

  // Remover notificação
  const removeNotification = async (id: string) => {
    try {
      // Encontrar a notificação antes de remover do estado
      const notification = notifications.find(n => n.id === id);
      
      // Atualiza estado local imediatamente
      const updatedNotifications = notifications.filter(notification => notification.id !== id);
      setNotifications(updatedNotifications);
      
      // Atualiza localStorage manualmente para evitar dependência do efeito
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
      
      // Se tiver serverId, fazer a chamada à API
      if (notification?.serverId) {
        await removeNotificationMutation.mutateAsync(notification.serverId);
        // Invalidar a query para forçar atualização dos dados
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      }
    } catch (error) {
      console.error('Erro ao remover notificação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a notificação",
        variant: "destructive"
      });
    }
  };

  // Remover todas as notificações
  const removeAllNotifications = async () => {
    try {
      // Para cada notificação do servidor, chamar a API para remover
      const serverIds = notifications
        .filter(n => n.serverId)
        .map(n => n.serverId as number);
      
      // Atualiza estado local imediatamente
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
      
      // Remover cada notificação do servidor
      for (const serverId of serverIds) {
        await removeNotificationMutation.mutateAsync(serverId);
      }
      
      // Invalidar a query para forçar atualização dos dados
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    } catch (error) {
      console.error('Erro ao remover todas as notificações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover todas as notificações",
        variant: "destructive"
      });
    }
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    try {
      // Para cada notificação não lida do servidor, chamar a API para marcar como lida
      const unreadServerIds = notifications
        .filter(n => n.serverId && !n.read)
        .map(n => n.serverId as number);
      
      // Atualiza estado local imediatamente
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
      
      // Marcar cada notificação como lida no servidor
      for (const serverId of unreadServerIds) {
        await markAsReadMutation.mutateAsync(serverId);
      }
      
      // Se houve alguma alteração no servidor, invalidar a query
      if (unreadServerIds.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      }
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar todas as notificações como lidas",
        variant: "destructive"
      });
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
    isLoading,
    error: error || null
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