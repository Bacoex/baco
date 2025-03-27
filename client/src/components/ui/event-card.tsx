import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/use-notifications";
import { CalendarIcon, MapPinIcon, CheckIcon, XIcon, InfoIcon, ShieldAlertIcon, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import ViewEventModal from "@/components/ui/view-event-modal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Interface para os dados do evento
 */
interface EventProps {
  event: {
    id: number;
    name: string;
    description: string;
    date: string;
    timeStart: string;
    timeEnd?: string | null;
    location: string;
    categoryId: number;
    creatorId: number;
    eventType: string;
    coverImage?: string | null;
    capacity?: number | null;
    ticketPrice?: number | null;
    category: {
      name: string;
      color: string;
      slug: string;
      id: number;
      ageRestriction?: number | null;
    };
    creator?: {
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
        id: number;
        firstName: string;
        lastName: string;
        profileImage: string | null;
      };
      applicationReason?: string;
    }>;
  };
  isCreator?: boolean;
  participation?: {
    id: number;
    status: string;
  } | null;
  isFollowing?: boolean;
  onRemove?: (eventId: number) => void;
  onApprove?: (participantId: number) => void;
  onReject?: (participantId: number) => void;
  onRemoveParticipant?: (participantId: number) => void;
  onRevertParticipant?: (participantId: number) => void;
  onFollow?: (eventId: number) => void;
  onUnfollow?: (eventId: number) => void;
}

// Importar a interface do ViewEventModal em vez de duplicá-la
interface EventDetailsForModal {
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
  creator: { // Não é opcional
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
      firstName: string; // Removido id do user para corresponder ao ViewEventModal
      lastName: string;
      profileImage: string | null;
    };
    applicationReason?: string;
  }>;
}

/**
 * Componente de card de evento
 * Exibe um evento com imagem, título, local, data e preço
 */
export default function EventCard({ 
  event, 
  isCreator = false,
  participation = null,
  isFollowing = false,
  onRemove,
  onApprove,
  onReject,
  onRemoveParticipant,
  onRevertParticipant,
  onFollow,
  onUnfollow
}: EventProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isParticipating, setIsParticipating] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  // Verifica se o usuário já está participando do evento
  const participationQuery = useQuery({
    queryKey: [`/api/events/${event.id}/participation`, user?.id],
    queryFn: async () => {
      if (!user) return null;
      try {
        const res = await fetch(`/api/events/${event.id}/participation`);
        if (!res.ok) return null;
        return await res.json();
      } catch (error) {
        return null;
      }
    },
    enabled: !!user,
  });
  
  // Ouvir o evento personalizado para abrir o modal a partir das notificações
  useEffect(() => {
    const handleOpenEvent = (e: CustomEvent) => {
      if (e.detail?.eventId === event.id) {
        setIsViewModalOpen(true);
      }
    };
    
    // Adicionar o ouvinte de evento
    document.addEventListener('open-event', handleOpenEvent as EventListener);
    
    // Remover o ouvinte ao desmontar o componente
    return () => {
      document.removeEventListener('open-event', handleOpenEvent as EventListener);
    };
  }, [event.id]);

  // Atualiza o estado local quando a consulta de participação mudar ou quando recebemos props de participação
  useEffect(() => {
    // Se recebemos a informação de participação diretamente via props
    if (participation) {
      setIsParticipating(true);
      return;
    }
    
    // Se temos dados da consulta de participação
    if (participationQuery.data) {
      setIsParticipating(true);
      return;
    }
    
    // Se não temos participação
    setIsParticipating(false);
  }, [participationQuery.data, participation]);
  
  // Formata a data para exibição
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
    });
  };
  
  // Formata o preço para exibição
  const formatPrice = (price: number) => {
    if (price === 0) return "Gratuito";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };
  
  // Verifica se o usuário pode participar do evento
  const handleParticipation = () => {
    // Verificar se o usuário é o criador do evento
    if (isCreator) {
      toast({
        title: "Ação não permitida",
        description: "Você não pode participar do seu próprio evento como participante.",
        variant: "destructive",
      });
      return;
    }
    
    // Se não há restrição de idade ou o usuário tem idade suficiente
    if (isUserOldEnough) {
      participateMutation.mutate();
    } else {
      // Se o usuário não tem idade suficiente, mostra um alerta
      toast({
        title: "Restrição de idade",
        description: `Este evento é apenas para maiores de ${event.category.ageRestriction} anos.`,
        variant: "destructive",
      });
    }
  };
  
  // Importar o hook de notificações
  const { addNotification } = useNotifications();
  
  // Mutação para participar do evento
  const participateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/events/${event.id}/participate`);
      return await response.json();
    },
    onSuccess: (data) => {
      setIsParticipating(true);
      
      if (event.eventType === 'private_application') {
        toast({
          title: "Candidatura enviada!",
          description: "Sua candidatura foi recebida. Você será notificado quando for aprovado.",
        });
        
        // Se temos notificação na resposta da API
        if (data.notification) {
          // Notificação para o criador do evento
          if (data.notification.forCreator && user?.id === event.creatorId) {
            addNotification(data.notification.forCreator);
          }
          
          // Notificação para o participante (usuário atual)
          if (data.notification.forParticipant && user?.id !== event.creatorId) {
            addNotification(data.notification.forParticipant);
          }
        }
      } else {
        toast({
          title: "Sucesso!",
          description: "Sua participação no evento foi confirmada.",
        });
      }
      
      // Atualiza as consultas relevantes
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/participation`] });
    },
    onError: (error: Error) => {
      toast({
        title: event.eventType === 'private_application' 
          ? "Erro ao enviar candidatura" 
          : "Erro ao participar do evento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutação para cancelar a participação no evento
  const cancelParticipationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/events/${event.id}/cancel-participation`);
      try {
        return await response.json();
      } catch (e) {
        return null; // Se a resposta não tiver corpo JSON
      }
    },
    onSuccess: (data) => {
      setIsParticipating(false);
      
      if (event.eventType === 'private_application') {
        toast({
          title: "Candidatura cancelada",
          description: "Sua candidatura para este evento foi cancelada.",
        });
      } else {
        toast({
          title: "Participação cancelada",
          description: "Você não está mais participando deste evento.",
        });
      }
      
      // Se temos notificações na resposta da API
      if (data?.notification) {
        // Notificação para o criador do evento
        if (data.notification.forCreator && user?.id === event.creatorId) {
          addNotification(data.notification.forCreator);
        }
        
        // Notificação para o participante (usuário atual)
        if (data.notification.forParticipant && user?.id !== event.creatorId) {
          addNotification(data.notification.forParticipant);
        }
      }
      
      // Atualiza as consultas relevantes
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/participation`] });
    },
    onError: (error: Error) => {
      toast({
        title: event.eventType === 'private_application' 
          ? "Erro ao cancelar candidatura" 
          : "Erro ao cancelar participação",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Função para obter uma imagem de acordo com a categoria do evento
  const getEventImage = () => {
    if (event.coverImage) return event.coverImage;
    
    const categoryImages: Record<string, string> = {
      "birthday": "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=870&auto=format&fit=crop",
      "wedding": "https://images.unsplash.com/photo-1509927083803-4bd519298ac4?q=80&w=870&auto=format&fit=crop",
      "religious": "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?q=80&w=387&auto=format&fit=crop",
      "meeting": "https://images.unsplash.com/photo-1565688534261-c1c0e901382e?q=80&w=870&auto=format&fit=crop",
      "barbecue": "https://images.unsplash.com/photo-1529108091279-c4a68c97cd1c?q=80&w=876&auto=format&fit=crop",
      "party": "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=870&auto=format&fit=crop",
      "concert": "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=870&auto=format&fit=crop",
      "lgbt": "https://images.unsplash.com/photo-1531299983330-093763e1d963?q=80&w=870&auto=format&fit=crop",
      "adult": "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=870&auto=format&fit=crop",
      "default": "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?q=80&w=889&auto=format&fit=crop"
    };
    
    const slug = event.category.slug;
    return categoryImages[slug] || categoryImages.default;
  };

  // Imagem do evento
  const imageSrc = getEventImage();
  
  // Verifica se o evento tem restrição de idade
  const hasAgeRestriction = !!event.category.ageRestriction;
  
  // Verifica se o usuário tem idade suficiente para o evento (se houver restrição)
  const calculateAge = (birthDateString: string) => {
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };
  
  // Verifica a idade do usuário conectado (se houver restrição)
  const userAge = user && user.birthDate ? calculateAge(user.birthDate) : 0;
  const isUserOldEnough = !hasAgeRestriction || 
    (event.category.ageRestriction && userAge >= event.category.ageRestriction);

  // Função para buscar detalhes completos do evento
  const fetchEventDetails = useQuery({
    queryKey: [`/api/events/${event.id}`, user?.id],
    queryFn: async () => {
      try {
        // Buscar os detalhes completos do evento do servidor
        const response = await fetch(`/api/events/${event.id}`);
        
        if (!response.ok) {
          throw new Error("Erro ao buscar detalhes do evento");
        }
        
        const eventData = await response.json();
        
        // Garantir que o eventType seja um valor válido
        let validEventType: 'public' | 'private_ticket' | 'private_application' = 'public';
        if (eventData.eventType === 'private_ticket' || eventData.eventType === 'private_application') {
          validEventType = eventData.eventType;
        }
        
        // Converter os dados para o formato esperado pelo modal
        const eventDetails: EventDetailsForModal = {
          ...eventData,
          isActive: true,
          coordinates: eventData.coordinates || null,
          eventType: validEventType,
          createdAt: eventData.createdAt || null,
          // Garantir que campos opcionais tenham valores corretos
          timeEnd: eventData.timeEnd || null,
          coverImage: eventData.coverImage || null,
          capacity: eventData.capacity || null,
          ticketPrice: eventData.ticketPrice || null
        };
        
        return eventDetails;
      } catch (error) {
        console.error("Erro ao buscar detalhes do evento:", error);
        return null;
      }
    },
    enabled: false, // Não executa automaticamente
  });
  
  // Abre o modal com os detalhes do evento
  const openEventDetails = () => {
    fetchEventDetails.refetch();
    setIsViewModalOpen(true);
  };

  return (
    <>
      <Card 
        className={`overflow-hidden hover:shadow-xl transition-all duration-300 group transform hover:scale-[1.02] cursor-pointer ${
          event.category.slug === "lgbt" 
          ? "border-0 pride-border" 
          : "border-primary/10 hover:border-primary/30"
        }`}
        onClick={openEventDetails}
      >
        <div className="relative h-48">
          <img 
            src={imageSrc}
            alt={event.name} 
            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-50 group-hover:opacity-80 transition-all duration-300"></div>
          <div className="absolute top-3 right-3 flex gap-2">
            {hasAgeRestriction && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
                      <ShieldAlertIcon className="h-3 w-3 mr-1" />
                      {event.category.ageRestriction}+
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Evento para maiores de {event.category.ageRestriction} anos</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <div 
              className={cn(
                "text-white text-xs font-bold px-3 py-1 rounded-full",
                event.category.slug === "lgbt" ? "pride-badge" : ""
              )}
              style={
                event.category.slug === "lgbt" && event.category.color === "pride"
                ? {} // O estilo vem direto da classe CSS pride-badge
                : { backgroundColor: event.category.color }
              }
            >
              {event.category.name}
            </div>
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-lg font-bold text-white mb-1 drop-shadow-md line-clamp-2">{event.name}</h3>
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-300 mr-2">
                <img 
                  src={event.creator?.profileImage || undefined} 
                  alt={event.creator?.firstName || "Criador"}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-sm text-white drop-shadow-md">
                {event.creator?.firstName || "Usuário"} {event.creator?.lastName || ""}
              </span>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center mb-2">
            <MapPinIcon className="text-primary h-4 w-4 mr-1" />
            <p className="text-gray-700 text-sm line-clamp-1">{event.location}</p>
          </div>
          
          <div className="flex items-center mb-3">
            <CalendarIcon className="text-primary h-4 w-4 mr-1" />
            <p className="text-gray-700 text-sm">{formatDate(event.date)}, {event.timeStart}</p>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <span className="text-primary font-semibold text-lg">{formatPrice(event.ticketPrice || 0)}</span>
            
            <div onClick={(e) => e.stopPropagation()}>
              {isCreator ? (
                <Button 
                  size="sm" 
                  className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  onClick={openEventDetails}
                >
                  <SettingsIcon className="h-4 w-4 mr-1" />
                  Gerenciar
                </Button>
              ) : isParticipating ? (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="rounded-full border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600"
                  onClick={() => cancelParticipationMutation.mutate()}
                  disabled={cancelParticipationMutation.isPending}
                >
                  {cancelParticipationMutation.isPending ? (
                    "Aguarde..."
                  ) : (
                    <>
                      <XIcon className="h-4 w-4 mr-1" />
                      {event.eventType === 'private_application' ? 'Cancelar candidatura' : 'Não irei mais'}
                    </>
                  )}
                </Button>
              ) : isCreator ? (
                <Button 
                  size="sm" 
                  className={`rounded-full text-white transition-all duration-300 ${
                    event.category.slug === "lgbt" 
                    ? "pride-gradient" 
                    : "bg-primary hover:bg-primary/90"
                  }`}
                  onClick={() => setIsViewModalOpen(true)}
                >
                  <SettingsIcon className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  className={`rounded-full text-white transition-all duration-300 ${
                    event.category.slug === "lgbt" 
                    ? "pride-gradient" 
                    : "bg-primary hover:bg-primary/90"
                  }`}
                  onClick={handleParticipation}
                  disabled={participateMutation.isPending}
                >
                  {participateMutation.isPending ? (
                    "Aguarde..."
                  ) : (
                    <>
                      <CheckIcon className="h-4 w-4 mr-1" />
                      {event.eventType === 'private_application' ? 'Candidatar-se' : 'Participar'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
      
      {/* Modal de visualização de detalhes do evento */}
      {fetchEventDetails.data && (
        <ViewEventModal
          event={fetchEventDetails.data}
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          onApprove={onApprove}
          onReject={onReject}
          onRemoveParticipant={onRemoveParticipant}
          onRevertParticipant={onRevertParticipant}
        />
      )}
    </>
  );
}
