import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserProfileDialog } from "@/components/ui/user-profile-dialog";
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
import { logError, ErrorSeverity } from "@/lib/errorLogger";
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
import ViewEventModal from "@/components/ui/view-event-modal";
import { EditEventModal } from "@/components/ui/edit-event-modal";

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
  highlightedEventId,
  onViewProfile,
  onViewEvent,  // Prop para visualizar o evento
  onEditEvent   // Prop para editar o evento
}: { 
  event: Event, 
  isCreator?: boolean,
  participation?: { id: number, status: string } | null,
  onRemove?: (eventId: number) => void,
  onApprove?: (participantId: number) => void,
  onReject?: (participantId: number) => void,
  onRemoveParticipant?: (participantId: number) => void,
  onRevertParticipant?: (participantId: number) => void,
  highlightedEventId?: number | null,
  onViewProfile?: (userId: number) => void,
  onViewEvent?: (eventId: number) => void,  // Visualizar evento
  onEditEvent?: (eventId: number) => void   // Editar evento
}) {
  const { toast } = useToast();
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const { user } = useAuth();
  
  // Função para abrir o modal de detalhes do evento
  const handleViewEvent = (eventId: number) => {
    if (onViewEvent) {
      onViewEvent(eventId);
    }
  };

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
              <DropdownMenuItem onClick={() => onEditEvent && onEditEvent(event.id)}>
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
                  {event.creator?.firstName?.charAt(0) || ""}{event.creator?.lastName?.charAt(0) || ""}
                </AvatarFallback>
              </Avatar>
            </Eneagon>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {getUserDisplayName({ firstName: event.creator?.firstName || "", lastName: event.creator?.lastName || "" })}
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
            <div className="flex gap-2">
              {/* Botão de editar - posicionado acima do botão de chat, próximo ao topo */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onEditEvent && onEditEvent(event.id)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil h-4 w-4 mr-1">
                  <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
                Editar
              </Button>
              
              {/* Botão de participantes */}
              <Button variant="outline" size="sm" onClick={() => setShowParticipants(true)}>
                <Users className="h-4 w-4 mr-1" />
                {event.participants?.length || 0} participantes
              </Button>
            </div>
            
            <Button variant="outline" size="sm" onClick={() => setShowChatModal(true)}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Chat
            </Button>
          </div>
        ) : 
        /* Se o usuário já está participando e foi aprovado */
        (participation && participation.status === "approved") ? (
          <div className="flex w-full justify-between">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleViewEvent(event.id)}
            >
              Ver detalhes
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
            <Button 
              variant="default" 
              size="sm"
              onClick={() => handleViewEvent(event.id)}
            >
              Ver detalhes
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
                <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg bg-black/30 backdrop-blur-sm border-gray-700 group hover:bg-black/50">
                  <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onViewProfile && onViewProfile(participant.user.id)}>
                    <Avatar>
                      <AvatarImage src={participant.user.profileImage || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground">{participant.user.firstName.charAt(0)}{participant.user.lastName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-white group-hover:text-primary">{participant.user.firstName} {participant.user.lastName}</p>
                      <div className="flex items-center gap-2 mt-1">
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
                        <Button
                          variant="link"
                          size="sm"
                          className="text-xs text-orange-600 hover:text-orange-800 p-0 h-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewProfile && onViewProfile(participant.user.id);
                          }}
                        >
                          Ver perfil
                        </Button>
                      </div>
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
                      
                      {participant.status === 'approved' && (
                        <Button 
                          onClick={() => onRevertParticipant && onRevertParticipant(participant.id)} 
                          size="sm" 
                          variant="outline"
                          className="text-amber-600 hover:text-amber-800 border-amber-600 hover:bg-amber-100"
                        >
                          Revisar
                        </Button>
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
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isViewEventModalOpen, setIsViewEventModalOpen] = useState(false);
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [eventIdToEdit, setEventIdToEdit] = useState<number | null>(null);
  
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
          // Se o usuário atual é o destinatário da notificação
          if (data.notification.forCreator.userId === user?.id) {
            console.log("Adicionando notificação para o criador (aprovar):", data.notification.forCreator);
            addNotification(data.notification.forCreator);
          }
        }

        // Notificação para o participante
        if (data.notification.forParticipant) {
          // Se o usuário atual é o destinatário da notificação
          if (data.notification.forParticipant.userId === user?.id) {
            console.log("Adicionando notificação para o participante (aprovar):", data.notification.forParticipant);
            addNotification(data.notification.forParticipant);
          } else {
            // Esta notificação é para outro usuário (o participante)
            console.log("Salvando notificação para o participante no localStorage:", data.notification.forParticipant);
            const userStorageKey = `baco-notifications-${data.notification.forParticipant.userId}`;
            try {
              // Recupera notificações existentes ou cria um array vazio
              const existingNotifications = JSON.parse(localStorage.getItem(userStorageKey) || '[]');
              // Adiciona a nova notificação
              existingNotifications.unshift({
                ...data.notification.forParticipant,
                id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                date: new Date(),
                read: false
              });
              // Salva de volta no localStorage
              localStorage.setItem(userStorageKey, JSON.stringify(existingNotifications));
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
          // Se o usuário atual é o destinatário da notificação
          if (data.notification.forCreator.userId === user?.id) {
            console.log("Adicionando notificação para o criador (rejeitar):", data.notification.forCreator);
            addNotification(data.notification.forCreator);
          }
        }

        // Notificação para o participante
        if (data.notification.forParticipant) {
          // Se o usuário atual é o destinatário da notificação
          if (data.notification.forParticipant.userId === user?.id) {
            console.log("Adicionando notificação para o participante (rejeitar):", data.notification.forParticipant);
            addNotification(data.notification.forParticipant);
          } else {
            // Esta notificação é para outro usuário (o participante)
            console.log("Salvando notificação para o participante no localStorage:", data.notification.forParticipant);
            const userStorageKey = `baco-notifications-${data.notification.forParticipant.userId}`;
            try {
              // Recupera notificações existentes ou cria um array vazio
              const existingNotifications = JSON.parse(localStorage.getItem(userStorageKey) || '[]');
              // Adiciona a nova notificação
              existingNotifications.unshift({
                ...data.notification.forParticipant,
                id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                date: new Date(),
                read: false
              });
              // Salva de volta no localStorage
              localStorage.setItem(userStorageKey, JSON.stringify(existingNotifications));
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
          // Se o usuário atual é o destinatário da notificação
          if (data.notification.forCreator.userId === user?.id) {
            console.log("Adicionando notificação para o criador (remover):", data.notification.forCreator);
            addNotification(data.notification.forCreator);
          }
        }

        // Notificação para o participante
        if (data.notification.forParticipant) {
          // Se o usuário atual é o destinatário da notificação
          if (data.notification.forParticipant.userId === user?.id) {
            console.log("Adicionando notificação para o participante (remover):", data.notification.forParticipant);
            addNotification(data.notification.forParticipant);
          } else {
            // Esta notificação é para outro usuário (o participante)
            console.log("Salvando notificação para o participante no localStorage:", data.notification.forParticipant);
            const userStorageKey = `baco-notifications-${data.notification.forParticipant.userId}`;
            try {
              // Recupera notificações existentes ou cria um array vazio
              const existingNotifications = JSON.parse(localStorage.getItem(userStorageKey) || '[]');
              // Adiciona a nova notificação
              existingNotifications.unshift({
                ...data.notification.forParticipant,
                id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                date: new Date(),
                read: false
              });
              // Salva de volta no localStorage
              localStorage.setItem(userStorageKey, JSON.stringify(existingNotifications));
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
        title: "Candidatura revertida",
        description: "A candidatura foi revertida para análise.",
      });

      // Processa as notificações retornadas pela API
      if (data.notification) {
        console.log("Notificações disponíveis após reverter participante:", data.notification);

        // Notificação para o criador do evento
        if (data.notification.forCreator) {
          // Se o usuário atual é o destinatário da notificação
          if (data.notification.forCreator.userId === user?.id) {
            console.log("Adicionando notificação para o criador (reverter):", data.notification.forCreator);
            addNotification(data.notification.forCreator);
          }
        }

        // Notificação para o participante
        if (data.notification.forParticipant) {
          // Se o usuário atual é o destinatário da notificação
          if (data.notification.forParticipant.userId === user?.id) {
            console.log("Adicionando notificação para o participante (reverter):", data.notification.forParticipant);
            addNotification(data.notification.forParticipant);
          } else {
            // Esta notificação é para outro usuário (o participante)
            console.log("Salvando notificação para o participante no localStorage:", data.notification.forParticipant);
            const userStorageKey = `baco-notifications-${data.notification.forParticipant.userId}`;
            try {
              // Recupera notificações existentes ou cria um array vazio
              const existingNotifications = JSON.parse(localStorage.getItem(userStorageKey) || '[]');
              // Adiciona a nova notificação
              existingNotifications.unshift({
                ...data.notification.forParticipant,
                id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                date: new Date(),
                read: false
              });
              // Salva de volta no localStorage
              localStorage.setItem(userStorageKey, JSON.stringify(existingNotifications));
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
        `Erro ao reverter candidatura: ${error.message}`, 
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
        title: "Erro ao reverter candidatura",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Os manipuladores de participantes foram removidos conforme solicitado

  // Os handlers para seguir/deixar de seguir eventos foram removidos

  // Handlers
  const handleRemoveEvent = (eventId: number) => {
    if (window.confirm("Tem certeza que deseja remover este evento?")) {
      removeEventMutation.mutate(eventId);
    }
  };

  // Função para visualizar o evento em um modal
  const handleViewEvent = async (eventId: number) => {
    try {
      // Primeiro tenta buscar o evento completo pela API para ter dados mais completos
      const response = await fetch(`/api/events/${eventId}`);
      
      if (response.ok) {
        const completeEvent = await response.json();
        setSelectedEvent(completeEvent);
        setIsViewEventModalOpen(true);
        return;
      }
      
      // Se não conseguir buscar o evento completo, cai para o comportamento antigo
      const eventToView = [...(createdEventsQuery.data || []), ...(participatingEventsQuery.data || [])]
        .find(event => event.id === eventId);
      
      if (eventToView) {
        setSelectedEvent(eventToView);
        setIsViewEventModalOpen(true);
      } else {
        toast({
          title: "Erro",
          description: "Evento não encontrado",
          variant: "destructive"
        });
      }
    
    } catch (error) {
      console.error("Erro ao buscar detalhes do evento:", error);
      
      // Utiliza o evento da lista como fallback
      const eventToView = [...(createdEventsQuery.data || []), ...(participatingEventsQuery.data || [])]
        .find(event => event.id === eventId);
      
      if (eventToView) {
        setSelectedEvent(eventToView);
        setIsViewEventModalOpen(true);
      } else {
        toast({
          title: "Erro",
          description: "Evento não encontrado",
          variant: "destructive"
        });
      }
    }
  };

  // Função para aprovar um participante
  const handleApproveParticipant = (participantId: number) => {
    approveParticipantMutation.mutate(participantId);
  };

  // Função para rejeitar um participante
  const handleRejectParticipant = (participantId: number) => {
    rejectParticipantMutation.mutate(participantId);
  };

  // Função para remover um participante
  const handleRemoveParticipant = (participantId: number) => {
    if (window.confirm("Tem certeza que deseja remover este participante?")) {
      removeParticipantMutation.mutate(participantId);
    }
  };

  // Função para visualizar perfil de usuário
  const handleViewUserProfile = (userId: number) => {
    setSelectedUserId(userId);
    setIsUserProfileOpen(true);
  };
  
  // Função para editar evento
  const handleEditEvent = (eventId: number) => {
    // Buscamos o evento nos dados existentes
    const eventToEdit = createdEventsQuery.data?.find(event => event.id === eventId);
    
    if (eventToEdit) {
      setSelectedEvent(eventToEdit);
      setEventIdToEdit(eventId);
      setIsEditEventModalOpen(true);
    } else {
      toast({
        title: "Erro",
        description: "Evento não encontrado para edição",
        variant: "destructive"
      });
    }
  };

  // Função para reverter uma candidatura rejeitada para pendente
  const handleRevertParticipant = (participantId: number) => {
    revertParticipantMutation.mutate(participantId);
  };

  // Os handlers para seguir/deixar de seguir eventos foram removidos

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black">
        <NetworkBackground />
        <div className="text-center text-white">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-4">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-black">
      <NetworkBackground />
      <Header />

      <main className="flex-grow px-4 pb-20 pt-28 relative z-10">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-semibold text-white">Meus Eventos</h1>
            <Button onClick={() => setIsCreateModalOpen(true)} className="bg-primary hover:bg-primary/90" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Criar Evento
            </Button>
          </div>

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
                      Clique no botão "Criar Evento" para começar.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex justify-center">
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar meu primeiro evento
                    </Button>
                  </CardFooter>
                </Card>
              ) : (
                <div className="space-y-6">
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
                      onViewProfile={handleViewUserProfile}
                      onViewEvent={handleViewEvent}
                      onEditEvent={handleEditEvent}
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
                      Encontre eventos interessantes na página inicial.
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="flex justify-center">
                    <Button asChild>
                      <Link to="/">Explorar eventos</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ) : (
                <div className="space-y-6">
                  {participatingEventsQuery.data?.map((eventWithParticipation: any) => 
                    <EventCard 
                      key={eventWithParticipation.id} 
                      event={eventWithParticipation}
                      participation={eventWithParticipation.participation || { 
                        id: 0, 
                        status: 'pending' 
                      }}
                      onViewProfile={handleViewUserProfile}
                      onViewEvent={handleViewEvent}
                    />
                  )}
                </div>
              )}
            </TabsContent>


          </Tabs>
        </div>
      </main>

      {/* Modal de criação de evento */}
      <CreateEventModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        categories={categoriesQuery.data || []}
      />

      {/* Diálogo para visualizar perfil de usuário */}
      <UserProfileDialog
        isOpen={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)}
        userId={selectedUserId}
      />

      {/* Modal para visualização detalhada do evento */}
      {selectedEvent && (
        <ViewEventModal
          isOpen={isViewEventModalOpen}
          onClose={() => setIsViewEventModalOpen(false)}
          event={selectedEvent}
          isParticipant={!!participatingEventsQuery.data?.find(e => e.id === selectedEvent.id)}
          isCreator={user.id === selectedEvent.creatorId}
          onEventDeleted={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/user/events/creator"] });
            queryClient.invalidateQueries({ queryKey: ["/api/user/events/participating"] });
            setIsViewEventModalOpen(false);
          }}
        />
      )}
      
      {/* Modal para edição de evento */}
      {eventIdToEdit && (
        <EditEventModal
          isOpen={isEditEventModalOpen}
          onClose={() => setIsEditEventModalOpen(false)}
          eventId={eventIdToEdit}
        />
      )}
    </div>
  );
}