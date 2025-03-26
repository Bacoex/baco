import { useState } from "react";
import { Calendar, MapPin, Clock, Users, Tag, User, Share2, Heart } from "lucide-react";
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
import { getUserDisplayName, cn } from "@/lib/utils";

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
}

/**
 * Componente de modal para visualização de detalhes do evento
 */
export default function ViewEventModal({ event, isOpen, onClose }: ViewEventModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
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
  
  // Função para lidar com a ação de compartilhar
  const handleShare = () => {
    // Implementação futura: compartilhamento
    toast({
      title: "Compartilhar",
      description: "Funcionalidade de compartilhamento será implementada em breve!",
    });
  };
  
  // Função para lidar com a ação de seguir
  const handleFollow = () => {
    // Implementação futura: seguir evento
    toast({
      title: "Seguir evento",
      description: "Funcionalidade de seguir evento será implementada em breve!",
    });
  };
  
  // Função para lidar com a ação de participar
  const handleParticipate = async () => {
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
      
      // Atualizar o estado do componente para refletir a participação
      const updatedEvent = {
        ...event,
        participants: [...(event.participants || []), participationData]
      };
      
      // Fecha o modal para forçar uma atualização
      onClose();
      
      toast({
        title: "Sucesso!",
        description: event.eventType === 'private_application' 
          ? "Sua candidatura foi enviada com sucesso!" 
          : "Você está participando deste evento!",
      });
      
      // Recarrega a lista de eventos para atualizar a interface
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao participar do evento",
        variant: "destructive"
      });
    }
  };
  
  // Verifica se o usuário atual é o criador do evento
  const isCreator = user?.id === event.creatorId;
  
  // Verifica se o usuário já é participante do evento
  const isParticipant = event.participants?.some(p => p.userId === user?.id) || false;
  
  return (
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
                  <span>{getUserDisplayName(event.creator)}</span>
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
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar
                </Button>
                <Button variant="outline" size="sm" onClick={handleFollow}>
                  <Heart className="h-4 w-4 mr-2" />
                  Seguir
                </Button>
              </div>
              
              {!isCreator && !isParticipant && (
                <Button onClick={handleParticipate}>
                  {event.eventType === 'private_application' ? 'Candidatar-se' : 'Participar'}
                </Button>
              )}
              
              {isCreator && (
                <Button variant="secondary">
                  Gerenciar Evento
                </Button>
              )}
              
              {isParticipant && (
                <Button variant="destructive" onClick={async () => {
                  try {
                    const response = await fetch(`/api/events/${event.id}/cancel-participation`, {
                      method: 'DELETE',
                      credentials: 'include'
                    });
                    
                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(errorData.message || 'Erro ao cancelar participação');
                    }
                    
                    // Fecha o modal para forçar uma atualização
                    onClose();
                    
                    toast({
                      title: "Participação cancelada",
                      description: "Você não está mais participando deste evento.",
                    });
                    
                    // Recarrega a lista de eventos para atualizar a interface
                    setTimeout(() => {
                      window.location.reload();
                    }, 1500);
                    
                  } catch (error) {
                    toast({
                      title: "Erro",
                      description: error instanceof Error ? error.message : "Erro ao cancelar participação",
                      variant: "destructive"
                    });
                  }
                }}>
                  Cancelar Participação
                </Button>
              )}
            </div>
          </TabsContent>
          
          {/* Tab de participantes */}
          <TabsContent value="participants">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Participantes ({event.participants?.length || 0})</h3>
              
              {event.participants && event.participants.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {event.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center space-x-2 p-2 rounded-md border">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={participant.user?.profileImage || undefined} />
                        <AvatarFallback>
                          {`${participant.user?.firstName?.charAt(0)}${participant.user?.lastName?.charAt(0)}`}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{getUserDisplayName(participant.user)}</div>
                        <div className="text-xs text-muted-foreground">
                          {participant.status === 'confirmed' && 'Confirmado'}
                          {participant.status === 'pending' && 'Pendente'}
                          {participant.status === 'rejected' && 'Rejeitado'}
                        </div>
                      </div>
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
            <div className="text-center py-8 text-muted-foreground">
              O chat para este evento estará disponível em breve.
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}