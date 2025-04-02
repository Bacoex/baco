import { useState, useRef, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EventChatProps {
  eventId: number;
  className?: string;
}

export function EventChat({ eventId, className }: EventChatProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    isLoadingMessages,
    messagesError,
    sendMessage,
    isSending
  } = useChat(eventId);

  // Rolar para o final do chat quando novas mensagens chegarem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Enviar mensagem ao pressionar Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && newMessage.trim()) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      sendMessage(newMessage.trim());
      setNewMessage("");
    }
  };

  // Função para formatar data da mensagem
  const formatMessageTime = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return format(date, "HH:mm", { locale: ptBR });
  };

  // Agrupar mensagens por dia
  const groupedMessages = messages.reduce<{ date: string; messages: typeof messages }[]>((groups, message) => {
    if (!message.sentAt) return groups;
    
    const date = new Date(message.sentAt);
    const dateStr = format(date, "dd 'de' MMMM, yyyy", { locale: ptBR });
    
    const existingGroup = groups.find(group => group.date === dateStr);
    if (existingGroup) {
      existingGroup.messages.push(message);
    } else {
      groups.push({ date: dateStr, messages: [message] });
    }
    
    return groups;
  }, []);

  return (
    <div className={`flex flex-col h-full rounded-lg overflow-hidden shadow-lg bg-card ${className || ""}`}>
      <div className="px-4 py-3 bg-primary/5 border-b">
        <h3 className="text-lg font-semibold">Chat do Evento</h3>
      </div>
      
      {/* Área de mensagens */}
      <ScrollArea className="flex-1 p-4">
        {isLoadingMessages ? (
          // Estado de carregamento
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-12 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        ) : messagesError ? (
          // Estado de erro
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2 text-destructive" />
            <p>Não foi possível carregar as mensagens</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : messages.length === 0 ? (
          // Estado vazio
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p>Ainda não há mensagens neste chat</p>
            <p className="text-sm">Seja o primeiro a enviar uma mensagem!</p>
          </div>
        ) : (
          // Exibir mensagens agrupadas por dia
          <div className="space-y-6">
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-2 text-xs text-muted-foreground">
                      {group.date}
                    </span>
                  </div>
                </div>
                
                {group.messages.map((message) => {
                  const isOwnMessage = message.senderId === user?.id;
                  
                  return (
                    <div 
                      key={message.id}
                      className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isOwnMessage && (
                        <Avatar className="h-8 w-8">
                          {message.user?.profileImage ? (
                            <AvatarImage src={message.user.profileImage} alt={message.user.firstName} />
                          ) : (
                            <AvatarFallback>
                              {message.user?.firstName.charAt(0)}{message.user?.lastName.charAt(0)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      )}
                      
                      <div className={`max-w-[70%] ${isOwnMessage ? 'order-first' : 'order-last'}`}>
                        {!isOwnMessage && (
                          <p className="text-xs font-medium mb-1">
                            {message.user ? 
                              `${message.user.firstName} ${message.user.lastName}` : 
                              "Usuário desconhecido"}
                          </p>
                        )}
                        
                        <div className={`rounded-lg p-3 ${
                          isOwnMessage 
                            ? 'bg-primary text-primary-foreground ml-auto' 
                            : 'bg-muted'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                        </div>
                        
                        <p className={`text-xs text-muted-foreground mt-1 ${
                          isOwnMessage ? 'text-right' : 'text-left'
                        }`}>
                          {formatMessageTime(message.sentAt)}
                        </p>
                      </div>
                      
                      {isOwnMessage && (
                        <Avatar className="h-8 w-8">
                          {user?.profileImage ? (
                            <AvatarImage src={user.profileImage} alt={user.firstName} />
                          ) : (
                            <AvatarFallback>
                              {user?.firstName.charAt(0)}{user?.lastName.charAt(0)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {/* Referência para rolagem automática para o final */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
      
      {/* Área de input para nova mensagem */}
      <div className="px-4 py-3 bg-card border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            disabled={isSending}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!newMessage.trim() || isSending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}