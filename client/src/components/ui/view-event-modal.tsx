import { useState } from "react";
import { Calendar, MapPin, Map, Clock, Users, Tag, User, Share2, Heart, 
         MessageSquare, MessageSquareX, LockKeyhole, UserPlus, Pencil, Trash2,
         CheckCircle, XCircle, Loader2, DollarSign, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import DynamicMap from "./dynamic-map";
import { ParticipantItem } from "./participant-item";
import { EventChat } from "./event-chat";
import StatusTriangle from "./status-triangle";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import DebugView from "./debug-view";
import { useNotifications } from "@/hooks/use-notifications";
import { getUserDisplayName, cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { ManageCoOrganizersDialog } from "@/components/ui/manage-co-organizers-dialog";
import { ShareEventDialog } from "@/components/ui/share-event-dialog";
import { EditEventModal } from "@/components/ui/edit-event-modal";
import { queryClient } from "@/lib/queryClient";

/**
 * Interface do evento com todos os dados necessários para exibição
 */
interface EventDetails {
  id: number;
  name: string;
  description: string;
  date: string;
  timeStart: string;
  timeEnd: string | null;
  location: string;
  coordinates: string | null;
  coverImage: string | null;
  eventType: 'public' | 'private_ticket' | 'private_application';
  categoryId: number;
  creatorId: number;
  capacity: number | null;
  ticketPrice: number | null;
  isActive: boolean;
  createdAt: Date | null;
  category: {
    id: number;
    name: string;
    slug: string;
    color: string;
    ageRestriction?: number | null;
  };
  creator: {
    id: number;
    firstName: string;
    lastName: string;
    profileImage: string | null;
  };
  participants?: Array<{
    id: number;
    userId: number;
    status: string;
    user: {
      firstName: string;
      lastName: string;
      profileImage: string | null;
    };
  }>;
}

/**
 * Props do componente de modal de visualização de evento
 */
interface ViewEventModalProps {
  event: EventDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (participantId: number) => void;
  onReject?: (participantId: number) => void;
  onRemoveParticipant?: (participantId: number) => void;
  onRevertParticipant?: (participantId: number) => void;
  onRemove?: (eventId: number) => void;
}

/**
 * Componente de modal para visualização de detalhes do evento
 */
export default function ViewEventModal({ 
  event, 
  isOpen, 
  onClose,
  onApprove,
  onReject,
  onRemoveParticipant,
  onRevertParticipant,
  onRemove
}: ViewEventModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [_location, navigate] = useLocation(); 
  const [activeTab, setActiveTab] = useState("details");
  
  // Buscar detalhes do evento (incluindo lista atualizada de participantes)
  const eventQuery = useQuery<any>({
    queryKey: [`/api/events/${event?.id}`],
    enabled: isOpen && !!event?.id,
    staleTime: 5000, // Reduzido para atualizar mais rápido
    refetchInterval: 10000
  });
  
  // Buscar participantes do evento
  const participantsQuery = useQuery<any[]>({
    queryKey: [`/api/events/${event?.id}/participants`],
    enabled: isOpen && activeTab === "participants" && !!event,
    staleTime: 5000, // Reduzido para atualizar mais rápido
    refetchInterval: 10000
  });
  
  // Funções internas para manipular participantes
  const handleApproveParticipant = async (participantId: number) => {
    if (!event) return;
    
    try {
      const response = await fetch(`/api/participants/${participantId}/approve`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao aprovar participante');
      }
      
      // Forçar atualização dos dados do evento e participantes
      eventQuery.refetch();
      participantsQuery.refetch();
      
      // Invalida todas as queries relevantes
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/participants`] });
      
      // Chamar o callback externo se existir
      if (onApprove) {
        onApprove(participantId);
      }
      
      toast({
        title: "Participante aprovado",
        description: "O participante foi aprovado com sucesso.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erro ao aprovar participante",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao aprovar o participante.",
        variant: "destructive"
      });
    }
  };
  
  const handleRejectParticipant = async (participantId: number) => {
    if (!event) return;
    
    try {
      const response = await fetch(`/api/participants/${participantId}/reject`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao rejeitar participante');
      }
      
      // Forçar atualização dos dados do evento e participantes
      eventQuery.refetch();
      participantsQuery.refetch();
      
      // Invalida todas as queries relevantes
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/participants`] });
      
      // Chamar o callback externo se existir
      if (onReject) {
        onReject(participantId);
      }
      
      toast({
        title: "Participante rejeitado",
        description: "O participante foi rejeitado com sucesso.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erro ao rejeitar participante",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao rejeitar o participante.",
        variant: "destructive"
      });
    }
  };
  
  const handleRemoveParticipant = async (participantId: number) => {
    if (!event) return;
    
    try {
      const response = await fetch(`/api/participants/${participantId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao remover participante');
      }
      
      // Forçar atualização dos dados do evento e participantes
      eventQuery.refetch();
      participantsQuery.refetch();
      
      // Invalida todas as queries relevantes
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/participants`] });
      
      // Chamar o callback externo se existir
      if (onRemoveParticipant) {
        onRemoveParticipant(participantId);
      }
      
      toast({
        title: "Participante removido",
        description: "O participante foi removido com sucesso.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erro ao remover participante",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao remover o participante.",
        variant: "destructive"
      });
    }
  };
  
  const handleRevertParticipant = async (participantId: number) => {
    if (!event) return;
    
    try {
      const response = await fetch(`/api/participants/${participantId}/revert`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao reverter status do participante');
      }
      
      // Forçar atualização dos dados do evento e participantes
      eventQuery.refetch();
      participantsQuery.refetch();
      
      // Invalida todas as queries relevantes
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/participants`] });
      
      // Chamar o callback externo se existir
      if (onRevertParticipant) {
        onRevertParticipant(participantId);
      }
      
      toast({
        title: "Status revertido",
        description: "O status do participante foi revertido para pendente.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Erro ao reverter status",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao reverter o status do participante.",
        variant: "destructive"
      });
    }
  };
  
  // Se não houver evento, não renderiza o modal
  if (!event) return null;
  
  // DEBUG: ver o evento completo incluindo coordenadas
  console.log("DEBUG - Evento completo:", event);
  
  // Formata a data do evento
  const eventDate = event.date ? format(new Date(event.date), "PPPP", { locale: ptBR }) : "";
  
  // Log para debug
  console.log("Coordenadas originais do evento:", event.coordinates);
  
  // Determina o tipo de evento para exibição
  const eventTypeDisplay = {
    'public': 'Público',
    'private_ticket': 'Privado (Ingresso)',
    'private_application': 'Experienciar'
  }[event.eventType];
  
  // Estado para abrir/fechar o diálogo de gerenciamento de co-organizadores
  const [isManageCoOrganizersOpen, setIsManageCoOrganizersOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  
  // Função para lidar com a ação de compartilhar
  const handleShare = () => {
    setIsShareDialogOpen(true);
  };
  
  // Função para lidar com a ação de seguir
  const handleFollow = () => {
    // Implementação futura: seguir evento
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "Você poderá seguir eventos em breve!",
    });
  };
  
  // Calcula a idade do usuário com base na data de nascimento
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };
  
  // Verifica se o evento tem restrição de idade
  const hasAgeRestriction = !!event.category?.ageRestriction && event.category.ageRestriction > 0;
  
  // Calcula a idade do usuário, se estiver logado e tiver data de nascimento
  const userAge = user?.birthDate ? calculateAge(user.birthDate) : 0;
  
  // Verifica se o usuário tem idade suficiente para participar do evento com restrição
  const isUserOldEnough = !hasAgeRestriction || 
    (event.category?.ageRestriction && userAge >= event.category.ageRestriction);
  
  // Função para lidar com a ação de participar
  const handleParticipate = async () => {
    // Verificar se o usuário é o criador do evento
    if (user && event.creatorId === user.id) {
      toast({
        title: "Ação não permitida",
        description: "Você não pode participar do seu próprio evento como participante.",
        variant: "destructive",
      });
      return;
    }
    
    // Verificar restrição de idade
    if (hasAgeRestriction && !isUserOldEnough) {
      toast({
        title: "Restrição de idade",
        description: `Este evento é apenas para maiores de ${event.category.ageRestriction} anos.`,
        variant: "destructive",
      });
      return;
    }
    
    try {      
      const response = await fetch(`/api/events/${event.id}/participate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao participar do evento');
      }
      
      // Adicionar o novo participante à lista de participantes
      const participationData = await response.json();
      
      // Criar notificação para o usuário participante 
      if (event.eventType === 'private_application') {
        // Adiciona notificação que o pedido para experienciar está pendente de aprovação
        addNotification({
          title: "Experienciar enviado",
          message: `Seu pedido para experienciar o evento "${event.name}" foi enviado e está aguardando aprovação do organizador.`,
          type: "participant_pending",
          eventId: event.id
        });
      } else {
        // Para eventos públicos, participação é imediata
        addNotification({
          title: "Participação confirmada",
          message: `Sua participação no evento "${event.name}" foi confirmada com sucesso!`,
          type: "participant_pending",
          eventId: event.id
        });
      }
      
      // Invalida todas as queries relevantes para atualizar a interface
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/participation`] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/events/participating'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      
      // Fecha o modal
      onClose();
      
      toast({
        title: "Sucesso!",
        description: event.eventType === 'private_application' 
          ? "Seu pedido para experienciar foi enviado com sucesso!" 
          : "Você está participando deste evento!",
      });
      
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao participar do evento",
        variant: "destructive"
      });
    }
  };
  
  // Função para cancelar participação
  const handleCancelParticipation = async () => {
    try {
      if (!userParticipation) {
        throw new Error('Não foi possível encontrar sua participação');
      }
      
      const response = await fetch(`/api/participants/${userParticipation.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao cancelar participação');
      }
      
      // Invalida todas as queries relevantes para atualizar a interface
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/participation`] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/events/participating'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      
      // Fecha o modal
      onClose();
      
      toast({
        title: "Participação cancelada",
        description: "Você não está mais participando deste evento.",
      });
      
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao cancelar participação",
        variant: "destructive"
      });
    }
  };
  
  // Verifica se o usuário atual é o criador do evento
  const isCreator = user?.id === event.creatorId;
  
  // Verifica se o usuário já é participante do evento (com qualquer status)
  const isParticipant = event.participants?.some(p => p.userId === user?.id) || false;
  
  // Pega o status atual da participação do usuário (se existir)
  const userParticipation = event.participants?.find(p => p.userId === user?.id);
  const participationStatus = userParticipation?.status;
  
  // Estados para controlar os modais
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  // Função para excluir o evento
  const handleDeleteEvent = async () => {
    if (!event) return;
    
    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir evento');
      }
      
      // Invalida todas as queries relevantes para atualizar a interface
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/events/creator'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/events/participant'] });
      
      toast({
        title: "Evento excluído",
        description: "O evento foi excluído com sucesso.",
        variant: "default"
      });
      
      // Fecha o modal
      onClose();
    } catch (error) {
      toast({
        title: "Erro ao excluir evento",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao excluir o evento.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[98vw] sm:w-[96vw] md:w-[92vw] lg:w-[90vw] xl:w-[85vw] 2xl:w-full 2xl:max-w-7xl max-h-[90vh] overflow-y-auto left-[50%] translate-x-[-50%] curved-bg scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent hover:scrollbar-thumb-primary/70">
          <DialogHeader>
            <DialogTitle className="sr-only">{event.name}</DialogTitle>
            <DialogDescription className="sr-only">
              Detalhes do evento: {event.description}
            </DialogDescription>
          </DialogHeader>
          
          {/* Header do modal com design semelhante ao card da página inicial */}
          <div className="relative overflow-hidden rounded-t-lg mb-6">
            {/* Imagem de capa ou fundo estilizado */}
            <div className="relative w-full h-52 rounded-md overflow-hidden">
              {event.coverImage ? (
                <img 
                  src={event.coverImage} 
                  alt={event.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/50 to-purple-600/50"
                  style={{
                    background: event.category?.slug === "lgbt" && event.category?.color === "pride"
                      ? "linear-gradient(135deg, rgba(255,0,0,0.6) 0%, rgba(255,154,0,0.6) 17%, rgba(208,222,33,0.6) 33%, rgba(79,220,74,0.6) 50%, rgba(63,218,216,0.6) 66%, rgba(47,201,226,0.6) 83%, rgba(28,127,238,0.6) 100%)"
                      : `linear-gradient(135deg, ${event.category?.color}40, ${event.category?.color}90)`
                  }}
                >
                  <div className="text-5xl opacity-30 text-white">
                    {event.category?.name?.charAt(0) || "E"}
                  </div>
                </div>
              )}
              
              {/* Overlay escuro para melhor legibilidade do texto */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              
              {/* Botão de compartilhar flutuante no canto superior esquerdo */}
              <div className="absolute top-2 left-2 z-10">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-8 w-8 bg-black/30 hover:bg-black/50 backdrop-blur-sm"
                        onClick={handleShare}
                      >
                        <Share2 className="h-4 w-4 text-white" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Compartilhar evento</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              {/* Informações do evento sobrepostas na imagem */}
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-md">{event.name}</h2>
                <div className="flex items-center space-x-2 flex-wrap gap-2">
                  <Badge variant="outline" className="bg-primary/30 text-white border-white/20 shadow-sm">
                    {eventTypeDisplay}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={cn("border-white/20 shadow-sm", event.category?.slug === "lgbt" ? "pride-badge" : "")}
                    style={
                      event.category?.slug === "lgbt" && event.category?.color === "pride"
                      ? { 
                          background: "linear-gradient(90deg, rgba(255,0,0,0.7) 0%, rgba(255,154,0,0.7) 17%, rgba(208,222,33,0.7) 33%, rgba(79,220,74,0.7) 50%, rgba(63,218,216,0.7) 66%, rgba(47,201,226,0.7) 83%, rgba(28,127,238,0.7) 100%)",
                          color: "#fff",
                          textShadow: "0px 0px 2px rgba(0,0,0,0.6)"
                        }
                      : { backgroundColor: `${event.category?.color}60`, color: "#fff" }
                    }
                  >
                    {event.category?.name}
                  </Badge>
                  {event.category?.ageRestriction && (
                    <Badge variant="outline" className="bg-red-600/80 text-white border-white/20 shadow-sm">
                      {event.category.ageRestriction}+
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid ${event.eventType === 'private_application' ? 'grid-cols-3' : 'grid-cols-2'} mb-4`}>
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="participants">Participantes</TabsTrigger>
              {event.eventType === 'private_application' && (
                <TabsTrigger value="chat">Chat</TabsTrigger>
              )}
            </TabsList>
            
            {/* Tab de detalhes do evento */}
            <TabsContent value="details" className="space-y-4">
              {/* Informações básicas do evento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-primary" />
                    <span>{eventDate}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-primary" />
                    <span>
                      {event.timeStart}
                      {event.timeEnd && ` - ${event.timeEnd}`}
                    </span>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <MapPin className="h-5 w-5 mr-2 text-primary" />
                      <span className="truncate max-w-[190px]">
                        {event.location && event.location.length > 0 
                          ? (event.location.length > 25 ? event.location.substring(0, 25) + '...' : event.location)
                          : "Localização não especificada"}
                      </span>
                      {event.location && event.location.length > 0 && (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-block text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors font-medium ml-2"
                        >
                          Ver
                        </a>
                      )}
                    </div>
                    
                    {/* Mini mapa dinâmico - só exibido quando tiver localização e coordenadas */}
                    {event.location && event.location.length > 0 && (
                      <div className="w-full">
                        {(event.coordinates && event.coordinates.trim() !== "") ? (
                          <>
                            <p className="text-sm mb-1 text-muted-foreground">
                              <MapPin className="h-4 w-4 inline mr-1" />
                              {event.location}
                            </p>
                            {/* Usamos o componente de mapa dinâmico */}
                            <DynamicMap coordinates={event.coordinates} height="120px" title={event.location} />
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-[120px] bg-gray-100 rounded-md">
                            <MapPin className="h-10 w-10 text-gray-400" />
                            <span className="ml-2 text-gray-500">Localização aproximada</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {event.capacity && (
                    <div className="flex items-center">
                      <Users className="h-5 w-5 mr-2 text-primary" />
                      <span>Capacidade: {event.capacity} pessoas</span>
                    </div>
                  )}
                  {event.eventType === 'private_ticket' && (
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 mr-2 text-primary" />
                      <span>Valor: R$ {event.ticketPrice ? event.ticketPrice.toFixed(2).replace('.', ',') : '0,00'}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center">
                    <User className="h-5 w-5 mr-2 text-primary" />
                    <span>Organizado por:</span>
                  </div>
                  <div className="flex items-center space-x-2 ml-7">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={event.creator?.profileImage || undefined} />
                      <AvatarFallback>
                        {`${event.creator?.firstName?.charAt(0)}${event.creator?.lastName?.charAt(0)}`}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-bold text-primary text-base">{getUserDisplayName(event.creator)}</span>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Descrição do evento */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Descrição</h3>
                <p className="whitespace-pre-line">{event.description}</p>
              </div>
              
              {/* Botões de ação */}
              <div className="mt-6">
                
                {/* Botão de participar/cancelar participação */}
                {!isCreator && (
                  <div className="w-full flex justify-end items-center">
                    {isParticipant ? (
                      <Button 
                        variant="destructive"
                        size="sm"
                        className="w-[160px]" 
                        onClick={handleCancelParticipation}
                      >
                        Cancelar participação
                      </Button>
                    ) : (
                      <Button 
                        size="sm"
                        className="w-[160px]"
                        onClick={handleParticipate}
                      >
                        {event.eventType === 'private_application' ? 'Experienciar' : 'Participar'}
                      </Button>
                    )}
                  </div>
                )}
                
                {/* Botões de status para experienciar (quando não é criador mas solicitou experienciar) */}
                {/* Experienciar pendente (usa triângulo de status) */}
                {!isCreator && isParticipant && event.eventType === 'private_application' && participationStatus === 'pending' && (
                  <div className="w-full flex flex-col justify-center items-center mt-4">
                    <StatusTriangle status="pending" className="mb-2" />
                    <span className="text-sm text-yellow-600 font-medium">Aguardando</span>
                  </div>
                )}
                
                {/* Experienciar rejeitado (com triângulo de status) */}
                {!isCreator && isParticipant && event.eventType === 'private_application' && participationStatus === 'rejected' && (
                  <div className="w-full flex flex-col justify-center items-center mt-4">
                    <StatusTriangle status="rejected" className="mb-2" />
                    <span className="text-sm text-red-600 font-medium mb-3">Rejeitado</span>
                    <Button 
                      size="sm"
                      className="w-[160px]"
                      onClick={handleParticipate}
                    >
                      Experienciar Novamente
                    </Button>
                  </div>
                )}
                
                {/* Participante já aprovado (mostra apenas indicação visual com triângulo) */}
                {!isCreator && isParticipant && participationStatus === 'approved' && (
                  <div className="w-full flex flex-col justify-center items-center mt-4">
                    <StatusTriangle status="approved" className="mb-2" />
                    <span className="text-sm text-green-600 font-medium">Aprovado</span>
                  </div>
                )}
                
                {/* Participante confirmado (mostra apenas indicação visual com triângulo) */}
                {!isCreator && isParticipant && participationStatus === 'confirmed' && (
                  <div className="w-full flex flex-col justify-center items-center mt-4">
                    <StatusTriangle status="confirmed" className="mb-2" />
                    <span className="text-sm text-blue-600 font-medium">Confirmado</span>
                  </div>
                )}
                
                {/* Botões do criador do evento */}
                {isCreator && (
                  <div className="w-full flex justify-end items-center space-x-3">
                    <Button 
                      variant="secondary"
                      size="sm"
                      className="w-[140px]"
                      onClick={() => setIsEditEventModalOpen(true)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar Evento
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-[140px]"
                      onClick={() => setIsManageCoOrganizersOpen(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Co-organizadores
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      className="w-[140px]"
                      onClick={() => setIsDeleteConfirmOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Evento
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Tab de participantes */}
            <TabsContent value="participants">
              <div className="space-y-4">
                {participantsQuery.isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
                  </div>
                ) : ((participantsQuery.data && participantsQuery.data.length > 0) || (event.participants && event.participants.length > 0)) ? (
                  <>
                    {/* Usa dados da query ou cai para os dados do evento */}
                    {(() => {
                      // Garantir que sempre temos um array de participantes mesmo se os dados forem undefined
                      const participants = (participantsQuery.data && participantsQuery.data.length > 0)
                        ? participantsQuery.data 
                        : (event.participants || []);
                      
                      return (
                        <>
                          <h3 className="text-lg font-medium">
                            {isCreator 
                              ? `Participantes (${participants.length})` 
                              : `Participantes (${participants.filter(p => 
                                  p.status === 'approved' || p.status === 'confirmed'
                                ).length})`
                            }
                          </h3>
                          
                          <div className="grid grid-cols-1 gap-2">
                            {participants.map((participant) => (
                              <ParticipantItem
                                key={participant.id}
                                participant={participant}
                                eventType={event.eventType}
                                statusColors={{
                                  "confirmed": "bg-blue-100 text-blue-800 border-blue-300",
                                  "approved": "bg-green-100 text-green-800 border-green-300",
                                  "pending": "bg-yellow-100 text-yellow-800 border-yellow-300",
                                  "rejected": "bg-red-100 text-red-800 border-red-300"
                                }}
                                statusText={{
                                  "confirmed": "Confirmado",
                                  "approved": "Aprovado",
                                  "pending": "Pendente",
                                  "rejected": "Rejeitado"
                                }}
                                isCreator={isCreator}
                                onApprove={handleApproveParticipant}
                                onReject={handleRejectParticipant}
                                onRemove={handleRemoveParticipant}
                                onRevert={handleRevertParticipant}
                              />
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium">Participantes (0)</h3>
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <span className="block">Nenhum participante registrado ainda.</span>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
            
            {/* Tab de chat - Só será exibido para eventos do tipo "Experienciar" */}
            {event.eventType === 'private_application' && (
              <TabsContent value="chat">
                {/* Verificar se o usuário é participante aprovado ou confirmado */}
                {isCreator || (event.participants && event.participants.some(p => p.userId === user?.id && (p.status === 'approved' || p.status === 'confirmed'))) ? (
                  <div className="h-[400px]">
                    <EventChat eventId={event.id} />
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <LockKeyhole className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p>O chat só está disponível para participantes aprovados.</p>
                    <p className="text-sm mt-2">Participe do evento para acessar o chat.</p>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de gerenciamento de co-organizadores */}
      {isManageCoOrganizersOpen && (
        <ManageCoOrganizersDialog
          eventId={event.id}
          isOpen={isManageCoOrganizersOpen}
          onClose={() => setIsManageCoOrganizersOpen(false)}
        />
      )}
      
      {/* Diálogo de compartilhamento */}
      {isShareDialogOpen && (
        <ShareEventDialog
          eventId={event.id}
          isOpen={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
        />
      )}
      
      {/* Modal de edição de evento */}
      {isEditEventModalOpen && (
        <EditEventModal
          isOpen={isEditEventModalOpen}
          onClose={() => {
            setIsEditEventModalOpen(false);
            
            // Invalidar todas as queries relevantes para atualizar a interface
            queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}`] });
            queryClient.invalidateQueries({ queryKey: ['/api/events'] });
            queryClient.invalidateQueries({ queryKey: ['/api/user/events/creator'] });
            
            // Fechar o modal principal
            onClose();
          }}
          eventId={event.id}
        />
      )}

      {/* Dialog de confirmação para excluir evento */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Excluir evento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita 
              e todos os participantes serão notificados.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteEvent}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Evento
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
