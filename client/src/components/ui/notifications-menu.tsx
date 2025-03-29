import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Bell, Check, Calendar, X, Trash2, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNotifications, Notification } from "@/hooks/use-notifications";
import { useLocation } from "wouter";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function NotificationsMenu() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, removeAllNotifications } = useNotifications();
  const [_, setLocation] = useLocation();

  // Função para lidar com clique na notificação
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    // Se for uma notificação relacionada a um evento, redirecionar para a página do evento
    if (notification.eventId) {
      // Para notificações de solicitações pendentes ou de candidatura, ir para a página Meus Eventos
      if (notification.type === 'participant_request' || 
          notification.type === 'event_application' || 
          notification.type.includes('event_') || 
          notification.type.includes('participant_')) {
        console.log('Redirecionando para Meus Eventos após clicar na notificação:', notification);
        setLocation(`/my-events`);
      } else {
        // Para outras notificações de eventos, ir para a página do evento específico
        setLocation(`/events/${notification.eventId}`);
      }
    }
  };

  // Função para remover uma notificação
  const handleRemoveNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    // Encontrar a notificação pelo ID para registro
    const notification = notifications.find(n => n.id === id);
    
    if (notification) {
      console.log(`Excluindo notificação: ${id}, tipo: ${notification.type}, título: ${notification.title}`);
      if (notification.recipientId) {
        console.log(`Notificação tem ID de recipiente no backend: ${notification.recipientId}`);
      }
    }
    
    removeNotification(id);
  };

  // Função para obter o ícone adequado para cada tipo de notificação
  const getNotificationIcon = (type: string) => {
    // Verifica se o tipo contém determinadas palavras-chave
    if (type.includes('application') || type.includes('participant') || type.includes('request')) {
      return <UserCheck className="h-4 w-4 mr-2" />;
    } else if (type.includes('approval') || type.includes('accepted')) {
      return <Check className="h-4 w-4 mr-2 text-green-500" />;
    } else if (type.includes('rejection') || type.includes('rejected')) {
      return <X className="h-4 w-4 mr-2 text-red-500" />;
    } else if (type.includes('event')) {
      return <Calendar className="h-4 w-4 mr-2" />;
    } else {
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
                <span className="flex items-center w-full text-sm font-medium">
                  {getNotificationIcon(notification.type)}
                  <span className="flex-1 truncate">{notification.title}</span>
                  <span className="flex items-center gap-1 ml-1">
                    {!notification.read && (
                      <Badge className="bg-blue-500 hover:bg-blue-600 px-1.5" variant="secondary">
                        Nova
                      </Badge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-4 w-4"
                      onClick={(e) => handleRemoveNotification(e, notification.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </span>
                </span>
                <span className="text-xs text-muted-foreground mt-1 ml-6">
                  {notification.message}
                </span>
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