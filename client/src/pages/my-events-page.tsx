import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Definição de tipos locais para notificações temporárias
interface TempNotification {
  id: string;
  title: string;
  message: string;
  type?: string;
  date: Date;
  read: boolean;
  [key: string]: any;
}
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eneagon } from "@/components/ui/eneagon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/use-notifications";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getUserDisplayName } from "@/lib/utils";
import { logError, ErrorSeverity, logNotificationProcessingError } from "@/lib/errorLogger";
import { useLocation } from "wouter";
import { Loader2, Calendar, MapPin, Clock, Users, Edit, Trash2, CheckCircle, XCircle, MessageSquare, Plus, Heart, HeartOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Header } from "@/components/ui/header";
import { Link } from "wouter";
import CreateEventModal from "@/components/ui/create-event-modal";
import NetworkBackground from "../components/ui/network-background";
import { ParticipantsDialog } from "@/components/ui/participants-dialog";

// Tipo para categoria de evento
interface EventCategory {
  id: number;
  name: string;
  slug: string;
  color: string;
}

// Tipos para os eventos e participantes
interface EventParticipant {
  id: number;
  eventId: number;
  userId: number;
  status: string;
  applicationReason?: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    profileImage: string | null;
  };
}

// Tipo para notificações
interface NotificationType {
  title: string;
  message: string;
  id?: string | number;
  date?: Date | string;
  read?: boolean;
  [key: string]: any;
}

interface Event {
  id: number;
  name: string;
  description: string;
  date: string;
  timeStart: string;
  timeEnd: string | null;
  location: string;
  coverImage: string | null;
  eventType: 'public' | 'private_ticket' | 'private_application';
  categoryId: number;
  creatorId: number;
  capacity: number | null;
  ticketPrice: number | null;
  category: {
    name: string;
    color: string;
  };
  creator: {
    id: number;
    firstName: string;
    lastName: string;
    profileImage: string | null;
  };
  participants?: EventParticipant[];
}

// Componente para o card de evento
function EventCard({ 
  event, 
  isCreator = false, 
  participation = null, 
  onRemove,
  onApprove,
  onReject,
  onRemoveParticipant,
  onRevertParticipant,
  highlightedEventId
}: { 
  event: Event, 
  isCreator?: boolean,
  participation?: { id: number, status: string } | null,
  onRemove?: (eventId: number) => void,
  onApprove?: (participantId: number) => void,
  onReject?: (participantId: number) => void,
  onRemoveParticipant?: (participantId: number) => void,
  onRevertParticipant?: (participantId: number) => void,
  highlightedEventId?: number | null
}) {
  const { toast } = useToast();
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const { user } = useAuth();

  // Formatar a data do evento
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Função para enviar mensagem no chat
  const sendMessage = () => {
    if (!chatMessage.trim()) return;

    toast({
      title: "Mensagem enviada",
      description: "Sua mensagem foi enviada para todos os participantes.",
    });

    setChatMessage("");
    setShowChatModal(false);
  };

  // Status de participação
  const participationStatus = participation ? participation.status : null;
  const statusColors: Record<string, string> = {
    "pending": "bg-yellow-100 text-yellow-800 border-yellow-300",
    "approved": "bg-green-100 text-green-800 border-green-300",
    "rejected": "bg-red-100 text-red-800 border-red-300"
  };

  const statusText: Record<string, string> = {
    "pending": "Pendente",
    "approved": "Aprovado",
    "rejected": "Recusado"
  };
  
  return (
    <Card 
      id={`event-${event.id}`}
      className={`relative overflow-hidden border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 ${highlightedEventId === event.id ? 'highlighted-event' : ''}`}
    >
      {/* Imagem de capa do evento */}
      {event.coverImage ? (
        <div className="h-48 overflow-hidden">
          <img
            src={event.coverImage}
            alt={event.name}
            className="w-full h-full object-cover transform transition-transform hover:scale-105 duration-500"
          />
        </div>
      ) : (
        <div className="h-48 bg-gradient-to-r from-primary/20 to-primary/40 flex items-center justify-center">
          <Calendar className="h-16 w-16 text-primary/50" />
        </div>
      )}

      {/* Badge de categoria */}
      <div className="absolute top-4 left-4">
        <Badge style={{ backgroundColor: event.category.color }} className="text-white">
          {event.category.name}
        </Badge>
      </div>

      {/* Ações para criador do evento */}
      {isCreator && (
        <div className="absolute top-4 right-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full bg-white/90 dark:bg-black/90">
                <Edit className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Edit className="h-4 w-4 mr-2" /> Editar evento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowParticipants(true)}>
                <Users className="h-4 w-4 mr-2" /> Ver participantes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowChatModal(true)}>
                <MessageSquare className="h-4 w-4 mr-2" /> Enviar mensagem
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={() => onRemove && onRemove(event.id)}>
                <Trash2 className="h-4 w-4 mr-2" /> Excluir evento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* O ícone para seguir eventos foi removido */}

      {/* Status da participação */}
      {participation && (
        <div className="absolute bottom-48 right-0">
          <Badge className={`${statusColors[participationStatus || "pending"]} rounded-l-full px-3 py-1 text-xs font-medium`}>
            {statusText[participationStatus || "pending"]}
          </Badge>
        </div>
      )}

      <CardHeader>
        <CardTitle className="line-clamp-2 text-xl">{event.name}</CardTitle>
        <CardDescription className="flex items-center text-sm">
          <Calendar className="h-4 w-4 mr-1" />
          {formatDate(event.date)} • {event.timeStart}
          {event.timeEnd && ` até ${event.timeEnd}`}
        </CardDescription>
        <CardDescription className="flex items-center text-sm">
          <MapPin className="h-4 w-4 mr-1" />
          {event.location}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 h-16">
          {event.description || "Sem descrição disponível."}
        </p>

        <div className="mt-4 flex items-center">
          <div className="flex-shrink-0">
            <Eneagon className="w-10 h-10">
              <Avatar>
                <AvatarImage src={event.creator?.profileImage || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {event.creator && event.creator.firstName ? event.creator.firstName.charAt(0) : ""}
                  {event.creator && event.creator.lastName ? event.creator.lastName.charAt(0) : ""}
                </AvatarFallback>
              </Avatar>
            </Eneagon>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">
              {event.creator ? getUserDisplayName({ 
                firstName: event.creator.firstName || "", 
                lastName: event.creator.lastName || "" 
              }) : "Usuário"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {event.eventType === 'public' ? 'Evento público' : 
               event.eventType === 'private_ticket' ? 'Evento privado com ingresso' : 
               'Evento privado com candidatura'}
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between bg-gray-50 dark:bg-gray-900 py-3">
        {/* Se o usuário atual é o criador do evento */}
        {isCreator ? (
          <div className="flex w-full justify-between">
            <Button variant="outline" size="sm" onClick={() => setShowParticipants(true)}>
              <Users className="h-4 w-4 mr-1" />
              {event.participants?.length || 0} participantes
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowChatModal(true)}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Chat
            </Button>
          </div>
        ) : 
        /* Se o usuário já está participando e foi aprovado */
        (participation && participation.status === "approved") ? (
          <div className="flex w-full justify-between">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/event/${event.id}`}>Ver detalhes</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowChatModal(true)}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Chat
            </Button>
          </div>
        ) : 
        /* Se o usuário está aguardando aprovação */
        (participation && participation.status === "pending") ? (
          <div className="w-full text-center">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              Aguardando aprovação do organizador
            </p>
          </div>
        ) : 
        /* Se o usuário foi rejeitado */
        (participation && participation.status === "rejected") ? (
          <div className="w-full text-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              Candidatura rejeitada
            </p>
          </div>
        ) : 
        /* Se o usuário não participou ainda */
        (
          <div className="w-full flex justify-center">
            <Button variant="default" size="sm" asChild>
              <Link to={`/event/${event.id}`}>Ver detalhes</Link>
            </Button>
          </div>
        )}
      </CardFooter>

      {/* Modal para visualizar participantes */}
      <Dialog 
        open={showParticipants} 
        onOpenChange={setShowParticipants}
      >
        <DialogContent aria-describedby="participants-dialog-description" className="max-w-md">
          <DialogHeader>
            <DialogTitle>Participantes: {event.name}</DialogTitle>
            <DialogDescription id="participants-dialog-description">
              {event.eventType === 'private_application' ? 
                'Gerencie as candidaturas para o seu evento.' : 
                'Veja quem está participando do seu evento.'}
            </DialogDescription>
          </DialogHeader>

          {(event.participants && event.participants.length > 0) ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {event.participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={participant.user.profileImage || undefined} />
                      <AvatarFallback>{participant.user.firstName.charAt(0)}{participant.user.lastName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{participant.user.firstName} {participant.user.lastName}</p>
                      <Badge 
                        variant="outline" 
                        className={
                          participant.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-300' 
                            : participant.status === 'approved' || participant.status === 'confirmed'
                              ? 'bg-green-100 text-green-800 border-green-300' 
                              : 'bg-red-100 text-red-800 border-red-300'
                        }
                      >
                        {participant.status === 'pending' 
                          ? 'Pendente' 
                          : participant.status === 'approved' || participant.status === 'confirmed'
                            ? 'Aprovado' 
                            : 'Rejeitado'}
                      </Badge>
                    </div>
                  </div>
                  
                  {event.eventType === 'private_application' && (
                    <div className="flex space-x-1">
                      {participant.status === 'pending' && (
                        <>
                          <Button 
                            onClick={() => onApprove && onApprove(participant.id)} 
                            size="icon" 
                            variant="ghost" 
                            className="text-green-600 hover:text-green-800 hover:bg-green-100"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </Button>
                          <Button 
                            onClick={() => onReject && onReject(participant.id)} 
                            size="icon" 
                            variant="ghost" 
                            className="text-red-600 hover:text-red-800 hover:bg-red-100"
                          >
                            <XCircle className="h-5 w-5" />
                          </Button>
                        </>
                      )}
                      
                      {participant.status === 'rejected' && (
                        <Button 
                          onClick={() => onRevertParticipant && onRevertParticipant(participant.id)} 
                          size="sm" 
                          variant="outline"
                        >
                          Revisar
                        </Button>
                      )}
                      
                      <Button 
                        onClick={() => onRemoveParticipant && onRemoveParticipant(participant.id)} 
                        size="icon" 
                        variant="ghost" 
                        className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-gray-400" />
              <span className="block mt-2 text-gray-500">Nenhum participante ainda.</span>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowParticipants(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para chat do evento */}
      <Dialog open={showChatModal} onOpenChange={setShowChatModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chat do Evento</DialogTitle>
            <DialogDescription>
              Envie mensagens para todos os participantes aprovados.
            </DialogDescription>
          </DialogHeader>

          <div className="h-64 overflow-y-auto border rounded-md p-3 mb-4 bg-gray-50 dark:bg-gray-900">
            <div className="text-center text-gray-500 italic py-10">
              O histórico de mensagens aparecerá aqui.
              <p className="mt-2 text-sm">Em desenvolvimento...</p>
            </div>
          </div>

          <div className="flex space-x-2">
            <Textarea 
              placeholder="Digite sua mensagem..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              className="flex-1"
            />
            <Button onClick={sendMessage}>Enviar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Componente principal da página
export default function MyEventsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [location, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("created");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [highlightedEventId, setHighlightedEventId] = useState<number | null>(null);
  
  // Efeito para processar parâmetros da URL
  useEffect(() => {
    // Extrair parâmetros da URL
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const highlight = params.get('highlight');
    
    console.log("Parâmetros de URL detectados:", { tab, highlight });
    
    // Definir a aba ativa com base no parâmetro tab
    if (tab === 'participating' || tab === 'created') {
      setActiveTab(tab);
    }
    
    // Definir o evento destacado com base no parâmetro highlight
    if (highlight) {
      const eventId = parseInt(highlight, 10);
      if (!isNaN(eventId)) {
        setHighlightedEventId(eventId);
        
        // Adicionar classe de destaque temporariamente e fazer scroll para o evento
        setTimeout(() => {
          const eventElement = document.getElementById(`event-${eventId}`);
          if (eventElement) {
            eventElement.classList.add('highlighted-event');
            eventElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Remover a classe de destaque após alguns segundos
            setTimeout(() => {
              eventElement.classList.remove('highlighted-event');
            }, 3000); // Remove após 3 segundos
          }
        }, 500); // Pequeno atraso para garantir que o DOM foi atualizado
      }
    }
  }, [location]); // Executar quando a localização mudar

  // Buscar eventos criados pelo usuário
  const createdEventsQuery = useQuery({
    queryKey: ["/api/user/events/creator"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/user/events/creator");
        if (!res.ok) {
          throw new Error("Erro ao buscar eventos");
        }
        const data = await res.json();
        console.log("Eventos criados:", data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Erro ao buscar eventos criados:", error);
        return [];
      }
    },
    enabled: !!user,
    initialData: [], // Sempre iniciar com um array vazio
    staleTime: 5000, // Reduz o número de solicitações, considerando os dados "frescos" por 5 segundos
    refetchOnWindowFocus: false, // Evita refetch automático ao focar na janela
    refetchOnMount: true // Garante que os dados sejam buscados quando o componente é montado
  });

  // Buscar eventos que o usuário está participando
  const participatingEventsQuery = useQuery({
    queryKey: ["/api/user/events/participating"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/user/events/participating");
        const data = await res.json();
        console.log("Eventos participando:", data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Erro ao buscar eventos participando:", error);
        // Registrando o erro no sistema de logs
        logError(
          `Erro ao buscar eventos que o usuário está participando: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          ErrorSeverity.ERROR,
          {
            context: 'Participação em Eventos',
            component: 'MyEventsPage',
            error: error instanceof Error ? error : new Error(String(error))
          }
        );
        return [];
      }
    },
    enabled: !!user,
    initialData: [], // Sempre iniciar com um array vazio
    staleTime: 5000, // Reduz o número de solicitações, considerando os dados "frescos" por 5 segundos
    refetchOnWindowFocus: false, // Evita refetch automático ao focar na janela
    refetchOnMount: true // Garante que os dados sejam buscados quando o componente é montado
  });

  // Funcionalidade de seguir eventos foi removida

  // Buscar categorias (para o modal de criação)
  const categoriesQuery = useQuery<EventCategory[]>({
    queryKey: ["/api/categories"],
    initialData: [],
    staleTime: 60000, // Categorias mudam raramente, cache por 1 minuto
    refetchOnWindowFocus: false
  });

  // Mutação para remover evento
  const removeEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const res = await apiRequest("DELETE", `/api/events/${eventId}`);
      return res.json();
    },
    onSuccess: () => {
      // Invalidar múltiplas queries para garantir que todos os dados sejam atualizados
      queryClient.invalidateQueries({ queryKey: ["/api/user/events/creator"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/events/participating"] });
      
      // Force refetch dos eventos do usuário para atualizar a UI imediatamente
      createdEventsQuery.refetch();

      toast({
        title: "Evento removido!",
        description: "Seu evento foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover evento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para aprovar participante
  const approveParticipantMutation = useMutation({
    mutationFn: async (participantId: number) => {
      const res = await apiRequest("PATCH", `/api/participants/${participantId}/approve`, { status: "approved" });
      
      // Verificar se a resposta é um JSON válido
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return res.json();
      } else {
        // Se não for JSON, capturar o texto da resposta para diagnóstico
        const text = await res.text();
        throw new Error(`Resposta não-JSON recebida: ${res.status} ${res.statusText}. Conteúdo: ${text.substring(0, 150)}...`);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/events/creator"] });

      // Exibe uma notificação toast para feedback imediato
      toast({
        title: "Participante aprovado!",
        description: "O participante foi aprovado com sucesso.",
      });

      // Processa as notificações retornadas pela API
      if (data.notification) {
        console.log("Notificações disponíveis após aprovar participante:", data.notification);

        // Notificação para o criador do evento
        if (data.notification.forCreator) {
          try {
            console.log("Processando notificação para o criador (aprovar):", data.notification.forCreator);
            
            // Se o usuário atual é o destinatário da notificação, adicionamos direto na interface
            if (data.notification.forCreator.userId === user?.id) {
              console.log("Adicionando notificação para o criador atual:", data.notification.forCreator);
              addNotification(data.notification.forCreator);
            }
          } catch (error) {
            console.error("Erro ao processar notificação para criador:", error);
            logNotificationProcessingError(
              "approveParticipant", 
              data.notification.forCreator?.title || "Notificação para criador",
              data.notification.forCreator?.message || "Sem mensagem",
              error instanceof Error ? error : new Error(String(error)),
              { notificationData: data.notification.forCreator }
            );
          }
        }

        // Não fazemos nada com a notificação para o participante
        // porque a API já criou essa notificação no backend e será 
        // recuperada automaticamente pelo hook useQuery no useNotifications
        if (data.notification.forParticipant) {
          console.log("Notificação para participante já será obtida via API, ignorando duplicação");
          // Se não for o usuário atual, podemos salvar no localStorage (isso não causa duplicação)
          if (data.notification.forParticipant.userId !== user?.id) {
            console.log("Salvando notificação para o participante no localStorage:", data.notification.forParticipant);
            const userStorageKey = `baco-notifications-${data.notification.forParticipant.userId}`;
            try {
              // Recupera notificações existentes ou cria um array vazio
              const existingNotifications = JSON.parse(localStorage.getItem(userStorageKey) || '[]');
              // Verificar se não existe notificação com a mesma mensagem
              const notificationExists = existingNotifications.some((n: NotificationType) => 
                n.title === data.notification.forParticipant.title && 
                n.message === data.notification.forParticipant.message
              );
              
              // Só adiciona se não existir
              if (!notificationExists) {
                existingNotifications.unshift({
                  ...data.notification.forParticipant,
                  id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  date: new Date(),
                  read: false
                });
                // Salva de volta no localStorage
                localStorage.setItem(userStorageKey, JSON.stringify(existingNotifications));
              } else {
                console.log("Notificação já existe no localStorage, ignorando duplicação");
              }
            } catch (error) {
              console.error("Erro ao salvar notificação para participante:", error);
            }
          }
        }
      }
    },
    onError: (error: Error) => {
      // Registra o erro no sistema de log
      logError(
        `Erro ao aprovar participante: ${error.message}`, 
        ErrorSeverity.ERROR, 
        {
          userId: user?.id,
          context: 'ApproveParticipant',
          component: 'MyEventsPage',
          error: error,
          additionalData: { timestamp: new Date().toISOString() }
        }
      );

      toast({
        title: "Erro ao aprovar participante",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para rejeitar participante
  const rejectParticipantMutation = useMutation({
    mutationFn: async (participantId: number) => {
      toast({
        title: "Processando...",
        description: "Rejeitando participação...",
      });
      const res = await apiRequest("PATCH", `/api/participants/${participantId}/reject`, { status: "rejected" });
      
      // Verificar se a resposta é um JSON válido
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return res.json();
      } else {
        // Se não for JSON, capturar o texto da resposta para diagnóstico
        const text = await res.text();
        throw new Error(`Resposta não-JSON recebida: ${res.status} ${res.statusText}. Conteúdo: ${text.substring(0, 150)}...`);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/events/creator"] });

      // Exibe uma notificação toast para feedback imediato
      toast({
        title: "Participante rejeitado",
        description: "O participante foi rejeitado com sucesso.",
      });

      // Processa as notificações retornadas pela API
      if (data.notification) {
        console.log("Notificações disponíveis após rejeitar participante:", data.notification);

        // Notificação para o criador do evento
        if (data.notification.forCreator) {
          try {
            console.log("Processando notificação para o criador (rejeitar):", data.notification.forCreator);
            
            // Se o usuário atual é o destinatário da notificação, adicionamos direto na interface
            if (data.notification.forCreator.userId === user?.id) {
              console.log("Adicionando notificação para o criador atual:", data.notification.forCreator);
              addNotification(data.notification.forCreator);
            }
          } catch (error) {
            console.error("Erro ao processar notificação para criador:", error);
            logNotificationProcessingError(
              "rejectParticipant", 
              data.notification.forCreator?.title || "Notificação para criador",
              data.notification.forCreator?.message || "Sem mensagem",
              error instanceof Error ? error : new Error(String(error)),
              { notificationData: data.notification.forCreator }
            );
          }
        }

        // Não fazemos nada com a notificação para o participante
        // porque a API já criou essa notificação no backend e será 
        // recuperada automaticamente pelo hook useQuery no useNotifications
        if (data.notification.forParticipant) {
          console.log("Notificação para participante já será obtida via API, ignorando duplicação");
          // Se não for o usuário atual, podemos salvar no localStorage (isso não causa duplicação)
          if (data.notification.forParticipant.userId !== user?.id) {
            console.log("Salvando notificação para o participante no localStorage:", data.notification.forParticipant);
            const userStorageKey = `baco-notifications-${data.notification.forParticipant.userId}`;
            try {
              // Recupera notificações existentes ou cria um array vazio
              const existingNotifications = JSON.parse(localStorage.getItem(userStorageKey) || '[]');
              // Verificar se não existe notificação com a mesma mensagem
              const notificationExists = existingNotifications.some((n: NotificationType) => 
                n.title === data.notification.forParticipant.title && 
                n.message === data.notification.forParticipant.message
              );
              
              // Só adiciona se não existir
              if (!notificationExists) {
                existingNotifications.unshift({
                  ...data.notification.forParticipant,
                  id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  date: new Date(),
                  read: false
                });
                // Salva de volta no localStorage
                localStorage.setItem(userStorageKey, JSON.stringify(existingNotifications));
              } else {
                console.log("Notificação já existe no localStorage, ignorando duplicação");
              }
            } catch (error) {
              console.error("Erro ao salvar notificação para participante:", error);
            }
          }
        }
      }
    },
    onError: (error: Error) => {
      // Registra o erro no sistema de log
      logError(
        `Erro ao rejeitar participante: ${error.message}`, 
        ErrorSeverity.ERROR, 
        {
          userId: user?.id,
          context: 'RejectParticipant',
          component: 'MyEventsPage',
          error: error,
          additionalData: { timestamp: new Date().toISOString() }
        }
      );

      toast({
        title: "Erro ao rejeitar participante",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para remover participante (independente do status)
  const removeParticipantMutation = useMutation({
    mutationFn: async (participantId: number) => {
      const res = await apiRequest("DELETE", `/api/participants/${participantId}/remove`);
      
      // Verificar se a resposta é um JSON válido
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return res.json();
      } else {
        // Se não for JSON, capturar o texto da resposta para diagnóstico
        const text = await res.text();
        throw new Error(`Resposta não-JSON recebida: ${res.status} ${res.statusText}. Conteúdo: ${text.substring(0, 150)}...`);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/events/creator"] });

      // Exibe uma notificação toast para feedback imediato
      toast({
        title: "Participante removido",
        description: "O participante foi removido com sucesso.",
      });

      // Processa as notificações retornadas pela API
      if (data.notification) {
        console.log("Notificações disponíveis após remover participante:", data.notification);

        // Notificação para o criador do evento
        if (data.notification.forCreator) {
          try {
            console.log("Processando notificação para o criador (remover):", data.notification.forCreator);
            
            // Se o usuário atual é o destinatário da notificação, adicionamos direto na interface
            if (data.notification.forCreator.userId === user?.id) {
              console.log("Adicionando notificação para o criador atual:", data.notification.forCreator);
              addNotification(data.notification.forCreator);
            }
          } catch (error) {
            console.error("Erro ao processar notificação para criador:", error);
            logNotificationProcessingError(
              "removeParticipant", 
              data.notification.forCreator?.title || "Notificação para criador",
              data.notification.forCreator?.message || "Sem mensagem",
              error instanceof Error ? error : new Error(String(error)),
              { notificationData: data.notification.forCreator }
            );
          }
        }

        // Não fazemos nada com a notificação para o participante
        // porque a API já criou essa notificação no backend e será 
        // recuperada automaticamente pelo hook useQuery no useNotifications
        if (data.notification.forParticipant) {
          console.log("Notificação para participante já será obtida via API, ignorando duplicação");
          // Se não for o usuário atual, podemos salvar no localStorage (isso não causa duplicação)
          if (data.notification.forParticipant.userId !== user?.id) {
            console.log("Salvando notificação para o participante no localStorage:", data.notification.forParticipant);
            const userStorageKey = `baco-notifications-${data.notification.forParticipant.userId}`;
            try {
              // Recupera notificações existentes ou cria um array vazio
              const existingNotifications = JSON.parse(localStorage.getItem(userStorageKey) || '[]');
              // Verificar se não existe notificação com a mesma mensagem
              const notificationExists = existingNotifications.some((n: any) => 
                n.title === data.notification.forParticipant.title && 
                n.message === data.notification.forParticipant.message
              );
              
              // Só adiciona se não existir
              if (!notificationExists) {
                existingNotifications.unshift({
                  ...data.notification.forParticipant,
                  id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                  date: new Date(),
                  read: false
                });
                // Salva de volta no localStorage
                localStorage.setItem(userStorageKey, JSON.stringify(existingNotifications));
              } else {
                console.log("Notificação já existe no localStorage, ignorando duplicação");
              }
            } catch (error) {
              console.error("Erro ao salvar notificação para participante:", error);
            }
          }
        }
      }
    },
    onError: (error: Error) => {
      // Registra o erro no sistema de log
      logError(
        `Erro ao remover participante: ${error.message}`, 
        ErrorSeverity.ERROR, 
        {
          userId: user?.id,
          context: 'RemoveParticipant',
          component: 'MyEventsPage',
          error: error,
          additionalData: { timestamp: new Date().toISOString() }
        }
      );

      toast({
        title: "Erro ao remover participante",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para reverter candidatura rejeitada para pendente
  const revertParticipantMutation = useMutation({
    mutationFn: async (participantId: number) => {
      const res = await apiRequest("PATCH", `/api/participants/${participantId}/revert`, { status: "pending" });
      
      // Verificar se a resposta é um JSON válido
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return res.json();
      } else {
        // Se não for JSON, capturar o texto da resposta para diagnóstico
        const text = await res.text();
        throw new Error(`Resposta não-JSON recebida: ${res.status} ${res.statusText}. Conteúdo: ${text.substring(0, 150)}...`);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/events/creator"] });

      // Exibe uma notificação toast para feedback imediato
      toast({
        title: "Status revertido",
        description: "O candidato foi retornado para a lista de aprovação.",
      });
    },
    onError: (error: Error) => {
      // Registra o erro no sistema de log
      logError(
        `Erro ao reverter status do participante: ${error.message}`, 
        ErrorSeverity.ERROR, 
        {
          userId: user?.id,
          context: 'RevertParticipant',
          component: 'MyEventsPage',
          error: error,
          additionalData: { timestamp: new Date().toISOString() }
        }
      );

      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handlers para operações nos participantes
  const handleRemoveEvent = (eventId: number) => {
    if (confirm("Tem certeza que deseja remover este evento?")) {
      removeEventMutation.mutate(eventId);
    }
  };

  const handleApproveParticipant = (participantId: number) => {
    approveParticipantMutation.mutate(participantId);
  };

  const handleRejectParticipant = (participantId: number) => {
    rejectParticipantMutation.mutate(participantId);
  };

  const handleRemoveParticipant = (participantId: number) => {
    if (confirm("Tem certeza que deseja remover este participante?")) {
      removeParticipantMutation.mutate(participantId);
    }
  };

  const handleRevertParticipant = (participantId: number) => {
    revertParticipantMutation.mutate(participantId);
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>
              Você precisa fazer login para acessar esta página.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="default" asChild>
              <Link to="/auth">Fazer Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative pb-20">
      {/* Background de rede de conexões */}
      <div className="fixed inset-0 -z-10">
        <NetworkBackground />
      </div>
      
      {/* Cabeçalho */}
      <Header />

      {/* Conteúdo principal */}
      <div className="container mx-auto px-4 py-6 mt-20">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Painel lateral */}
          <div className="w-full lg:w-1/4 flex flex-col gap-4">

            {/* Categorias (em telas maiores) */}
            <Card className="hidden lg:block border-none shadow-md bg-white dark:bg-gray-950">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Categorias</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {categoriesQuery.data?.map((category) => (
                  <Button
                    key={category.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start mb-1 text-sm font-normal"
                    asChild
                  >
                    <Link to={`/events/category/${category.slug}`}>
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      {category.name}
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Conteúdo principal - Tabs com os eventos */}
          <div className="w-full lg:w-3/4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 mb-6 h-10 text-sm">
                <TabsTrigger value="created">Criados por mim</TabsTrigger>
                <TabsTrigger value="participating">Participando</TabsTrigger>
              </TabsList>

              {/* Tab: Eventos criados pelo usuário */}
              <TabsContent value="created">
                {createdEventsQuery.isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : createdEventsQuery.isError ? (
                  <Card className="bg-red-50 border-red-200">
                    <CardHeader>
                      <CardTitle className="text-red-800">Erro ao carregar eventos</CardTitle>
                      <CardDescription className="text-red-700">
                        Não foi possível carregar seus eventos. Tente novamente mais tarde.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : createdEventsQuery.data?.length === 0 ? (
                  <Card className="bg-black/30 backdrop-blur-sm border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-center text-white">Você ainda não criou nenhum evento</CardTitle>
                      <CardDescription className="text-center text-gray-400">
                        Clique no botão "Criar Novo Evento" para começar
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center pb-6">
                      <Button onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Evento
                      </Button>
                    </CardFooter>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {createdEventsQuery.data?.map((event: Event) => (
                      <EventCard 
                        key={event.id} 
                        event={event} 
                        isCreator={true}
                        onRemove={handleRemoveEvent}
                        onApprove={handleApproveParticipant}
                        onReject={handleRejectParticipant}
                        onRemoveParticipant={handleRemoveParticipant}
                        onRevertParticipant={handleRevertParticipant}
                        highlightedEventId={highlightedEventId}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab: Eventos que o usuário está participando */}
              <TabsContent value="participating">
                {participatingEventsQuery.isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : participatingEventsQuery.isError ? (
                  <Card className="bg-red-50 border-red-200">
                    <CardHeader>
                      <CardTitle className="text-red-800">Erro ao carregar participações</CardTitle>
                      <CardDescription className="text-red-700">
                        Não foi possível carregar os eventos que você está participando.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ) : participatingEventsQuery.data?.length === 0 ? (
                  <Card className="bg-black/30 backdrop-blur-sm border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-center text-white">Você não está participando de nenhum evento</CardTitle>
                      <CardDescription className="text-center text-gray-400">
                        Explore eventos disponíveis e participe
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center pb-6">
                      <Button asChild>
                        <Link to="/events">
                          <Calendar className="h-4 w-4 mr-2" />
                          Explorar Eventos
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {participatingEventsQuery.data?.map((event: any) => {
                      // Verificar se temos dados válidos para renderizar o card
                      if (!event || !event.id) {
                        console.error("Dados de evento inválidos:", event);
                        return null;
                      }
                      
                      // Extrair informações de participação se disponíveis
                      const participationData = event.participation ? {
                        id: event.participation.id,
                        status: event.participation.status
                      } : null;
                      
                      return (
                        <EventCard 
                          key={event.id} 
                          event={event}
                          participation={participationData}
                          highlightedEventId={highlightedEventId}
                        />
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Modal para criar evento */}
      <CreateEventModal 
        isOpen={isCreateModalOpen} 
        setIsOpen={setIsCreateModalOpen} 
        categories={categoriesQuery.data || []}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/user/events/creator"] });
          queryClient.invalidateQueries({ queryKey: ["/api/events"] });
        }}
      />
    </div>
  );
}