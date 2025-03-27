import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Bell, Check, Calendar, X, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNotifications, Notification } from "@/hooks/use-notifications";
import { Link, useLocation } from "wouter";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { toast } from "@/components/ui/use-toast";

export function NotificationsMenu() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, removeAllNotifications } = useNotifications();
  const [_, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Carregar notificações do localStorage
      const userStorageKey = `baco-notifications-${user.id}`;
      const storedNotifications = JSON.parse(localStorage.getItem(userStorageKey) || '[]');

      // Mostrar notificações não lidas
      storedNotifications
        .filter((n: any) => !n.read)
        .forEach((notification: any) => {
          toast({
            title: notification.title,
            description: notification.message,
          });
        });
    }
  }, [user]);

  const handleNotificationClick = (notification: Notification) => {
    // Marcar como lida
    markAsRead(notification.id);

    // Redirecionar para o evento se houver um eventId
    if (notification.eventId) {
      // Fechar dropdown e abrir modal de evento
      setTimeout(() => {
        // Em vez de navegar diretamente, disparamos um evento personalizado que o EventCard vai escutar
        const event = new CustomEvent('open-event', { detail: { eventId: notification.eventId } });
        document.dispatchEvent(event);
        setLocation('/');
      }, 100);
    }
  };

  // Função para remover uma notificação e evitar propagação do evento
  const handleRemoveNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeNotification(id);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'event_application':
      case 'event_approval':
      case 'event_rejection':
        return <Calendar className="h-4 w-4 mr-2" />;
      default:
        return <Bell className="h-4 w-4 mr-2" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notificações</span>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-6"
                onClick={() => markAllAsRead()}
              >
                <Check className="h-3 w-3 mr-1" />
                Marcar como lidas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs h-6"
                onClick={() => removeAllNotifications()}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpar tudo
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="py-4 px-2 text-center text-muted-foreground text-sm">
            Nenhuma notificação no momento.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map(notification => (
              <DropdownMenuItem
                key={notification.id}
                className={`px-2 py-2 cursor-pointer flex flex-col items-start ${!notification.read ? 'bg-gray-50 dark:bg-gray-900' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-center w-full text-sm font-medium">
                  {getNotificationIcon(notification.type)}
                  <span className="flex-1 truncate">{notification.title}</span>
                  <div className="flex items-center gap-1 ml-1">
                    {!notification.read && (
                      <Badge className="bg-blue-500 hover:bg-blue-600 px-1.5" variant="secondary">
                        Nova
                      </Badge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive" 
                      onClick={(e) => handleRemoveNotification(e, notification.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1 ml-6">
                  {notification.message}
                </p>
                <span className="text-xs text-muted-foreground mt-1 ml-6">
                  {format(new Date(notification.date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}