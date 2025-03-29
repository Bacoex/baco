import { useState } from "react";
import { Calendar, MapPin, Clock, Users, Tag, User, Share2, Heart, 
         MessageSquare, MessageSquareX, LockKeyhole, UserPlus, Pencil, Trash2 } from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
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
  
  // Se não houver evento, não renderiza o modal
  if (!event) return null;
  
  // Formata a data do evento
  const eventDate = event.date ? format(new Date(event.date), "PPPP", { locale: ptBR }) : "";
  
  // Determina o tipo de evento para exibição
  const eventTypeDisplay = {
    'public': 'Público',
    'private_ticket': 'Privado (Ingresso)',
    'private_application': 'Privado (Candidatura)'
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
        // Adiciona notificação que a candidatura está pendente de aprovação
        addNotification({
          title: "Candidatura enviada",
          message: `Sua candidatura para o evento "${event.name}" foi enviada e está aguardando aprovação do organizador.`,
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
          ? "Sua candidatura foi enviada com sucesso!" 
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
  
  // Estado para controlar o modal de edição
  const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{event.name}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-none">
                  {eventTypeDisplay}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn("border-none", event.category?.slug === "lgbt" ? "pride-badge" : "")}
                  style={
                    event.category?.slug === "lgbt" && event.category?.color === "pride"
                    ? { 
                        background: "linear-gradient(90deg, rgba(255,0,0,0.7) 0%, rgba(255,154,0,0.7) 17%, rgba(208,222,33,0.7) 33%, rgba(79,220,74,0.7) 50%, rgba(63,218,216,0.7) 66%, rgba(47,201,226,0.7) 83%, rgba(28,127,238,0.7) 100%)",
                        color: "#fff",
                        textShadow: "0px 0px 2px rgba(0,0,0,0.6)"
                      }
                    : { backgroundColor: `${event.category?.color}20`, color: event.category?.color }
                  }
                >
                  {event.category?.name}
                </Badge>
                {event.category?.ageRestriction && (
                  <Badge variant="outline" className="bg-red-600 text-white border-none">
                    {event.category.ageRestriction}+
                  </Badge>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          
          {/* Imagem de capa do evento */}
          {event.coverImage && (
            <div className="relative w-full h-48 rounded-md overflow-hidden mb-4">
              <img 
                src={event.coverImage} 
                alt={event.name} 
                className="w-full h-full object-cover" 
              />
            </div>
          )}
          
          <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="participants">Participantes</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
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
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-primary" />
                    <span>{event.location}</span>
                  </div>
                  {event.capacity && (
                    <div className="flex items-center">
                      <Users className="h-5 w-5 mr-2 text-primary" />
                      <span>Capacidade: {event.capacity} pessoas</span>
                    </div>
                  )}
                  {event.eventType === 'private_ticket' && event.ticketPrice && (
                    <div className="flex items-center">
                      <Tag className="h-5 w-5 mr-2 text-primary" />
                      <span>Ingresso: R$ {event.ticketPrice.toFixed(2).replace('.', ',')}</span>
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
                    <span className="font-bold text-gray-900 dark:text-white">{getUserDisplayName(event.creator)}</span>
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
              <div className="flex justify-between mt-6">
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar
                </Button>
                
                {!isCreator && (
                  isParticipant ? (
                    <Button 
                      variant="destructive" 
                      onClick={handleCancelParticipation}
                    >
                      Cancelar participação
                    </Button>
                  ) : (
                    <Button onClick={handleParticipate}>
                      {event.eventType === 'private_application' ? 'Candidatar-se' : 'Participar'}
                    </Button>
                  )
                )}
                
                {/* Botões de status para candidatos (quando não é criador mas é candidato) */}
                {/* Candidatura pendente */}
                {!isCreator && isParticipant && event.eventType === 'private_application' && participationStatus === 'pending' && (
                  <Button disabled className="bg-amber-500 hover:bg-amber-500">
                    Candidatura Pendente
                  </Button>
                )}
                
                {/* Candidatura rejeitada */}
                {!isCreator && isParticipant && event.eventType === 'private_application' && participationStatus === 'rejected' && (
                  <div className="space-x-2">
                    <Button disabled variant="destructive" className="opacity-60">
                      Candidatura Rejeitada
                    </Button>
                    <Button onClick={handleParticipate}>
                      Candidatar-se Novamente
                    </Button>
                  </div>
                )}
                
                {/* Participante já aprovado (mostra apenas indicação visual) */}
                {!isCreator && isParticipant && participationStatus === 'approved' && (
                  <Button disabled variant="outline" className="bg-green-100 text-green-700 border-green-300">
                    <span className="mr-2">✓</span> Você está participando
                  </Button>
                )}
                
                {/* Participante confirmado (mostra apenas indicação visual) */}
                {!isCreator && isParticipant && participationStatus === 'confirmed' && (
                  <Button disabled variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                    <span className="mr-2">✓</span> Participação confirmada
                  </Button>
                )}
                
                {isCreator && (
                  <div className="space-x-2">
                    <Button 
                      variant="secondary"
                      onClick={() => setIsEditEventModalOpen(true)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar Evento
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsManageCoOrganizersOpen(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Co-organizadores
                    </Button>
                    {onRemove && (
                      <Button 
                        variant="destructive" 
                        onClick={() => {
                          if (window.confirm('Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.')) {
                            onRemove(event.id);
                            onClose();
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Evento
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Tab de participantes */}
            <TabsContent value="participants">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">
                  {isCreator 
                    ? `Participantes (${event.participants?.length || 0})` 
                    : `Participantes (${event.participants?.filter(p => p.status === 'approved' || p.status === 'confirmed').length || 0})`
                  }
                </h3>
                
                {event.participants && event.participants.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {/* Se o usuário for o criador, mostra todos os participantes, caso contrário, apenas aprovados e confirmados */}
                    {event.participants
                      .filter(participant => isCreator || participant.status === 'approved' || participant.status === 'confirmed')
                      .map((participant) => (
                      <div 
                        key={participant.id} 
                        className="flex flex-col p-2 rounded-md border bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        <div 
                          className="flex items-center space-x-2 cursor-pointer"
                          onClick={() => window.location.href = `/profile/${participant.userId}`}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={participant.user?.profileImage || undefined} />
                            <AvatarFallback>
                              {`${participant.user?.firstName?.charAt(0)}${participant.user?.lastName?.charAt(0)}`}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">{getUserDisplayName(participant.user)}</div>
                            <div className="text-xs text-muted-foreground">
                              {participant.status === 'confirmed' && 'Confirmado'}
                              {participant.status === 'approved' && 'Aprovado'}
                              {participant.status === 'pending' && 'Pendente'}
                              {participant.status === 'rejected' && 'Rejeitado'}
                            </div>
                          </div>
                        </div>
                        
                        {/* Botões de ação para cada participante (apenas para criador do evento) */}
                        {isCreator && (
                          <div className="mt-2 flex flex-wrap gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                            {participant.status === 'pending' && onApprove && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-green-500 border-green-500 hover:bg-green-500 hover:text-white flex-1"
                                onClick={() => onApprove(participant.id)}
                              >
                                Aprovar
                              </Button>
                            )}
                            
                            {participant.status === 'pending' && onReject && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-500 border-red-500 hover:bg-red-500 hover:text-white flex-1"
                                onClick={() => onReject(participant.id)}
                              >
                                Rejeitar
                              </Button>
                            )}
                            
                            {/* Botão de revogar para aprovados e rejeitados */}
                            {(participant.status === 'approved' || participant.status === 'rejected') && onRevertParticipant && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-amber-500 border-amber-500 hover:bg-amber-500 hover:text-white w-full"
                                onClick={() => onRevertParticipant(participant.id)}
                              >
                                Revogar decisão
                              </Button>
                            )}
                            
                            {/* Botão para remover participante */}
                            {onRemoveParticipant && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-500 border-red-500 hover:bg-red-500 hover:text-white w-full mt-1"
                                onClick={() => onRemoveParticipant(participant.id)}
                              >
                                Remover participante
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum participante registrado ainda.
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Tab de chat */}
            <TabsContent value="chat">
              {/* Verificar se o evento é do tipo que permite chat (privado ou com candidatura) */}
              {event.eventType === 'public' ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquareX className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                  <p>O chat não está disponível para eventos públicos.</p>
                </div>
              ) : (
                <>
                  {/* Verificar se o usuário é participante aprovado ou confirmado */}
                  {isCreator || (event.participants && event.participants.some(p => p.userId === user?.id && (p.status === 'approved' || p.status === 'confirmed'))) ? (
                    <div className="space-y-4">
                      <div className="h-64 overflow-y-auto border rounded-md p-3 mb-4 bg-gray-50 dark:bg-gray-900">
                        <div className="text-center text-gray-500 italic py-10">
                          <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                          <p>Você só verá mensagens enviadas após sua entrada no evento.</p>
                          <p className="mt-2 text-sm">O histórico de mensagens anteriores não está disponível.</p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Textarea 
                          placeholder="Digite sua mensagem..."
                          className="flex-1"
                        />
                        <Button onClick={() => {
                          toast({
                            title: "Mensagem enviada",
                            description: "Sua mensagem foi enviada para todos os participantes."
                          });
                        }}>
                          Enviar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <LockKeyhole className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p>O chat só está disponível para participantes aprovados.</p>
                      <p className="text-sm mt-2">Participe do evento para acessar o chat.</p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
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
    </>
  );
}
