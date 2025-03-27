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

interface EventProps {
  event: {
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
      slug: string;
    };
    creator: {
      id: number;
      firstName: string;
      lastName: string;
      profileImage: string | null;
    };
  };
  isCreator?: boolean;
  participation?: { id: number; status: string } | null;
  onRemove?: (eventId: number) => void;
  onApprove?: (participantId: number) => void;
  onReject?: (participantId: number) => void;
  onRemoveParticipant?: (participantId: number) => void;
  onRevertParticipant?: (participantId: number) => void;
}

export default function EventCard({ 
  event, 
  isCreator = false,
  participation = null,
  onRemove,
  onApprove,
  onReject,
  onRemoveParticipant,
  onRevertParticipant
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

  useEffect(() => {
    const handleOpenEvent = (e: CustomEvent) => {
      if (e.detail?.eventId === event.id) {
        setIsViewModalOpen(true);
      }
    };

    document.addEventListener('open-event', handleOpenEvent as EventListener);
    return () => {
      document.removeEventListener('open-event', handleOpenEvent as EventListener);
    };
  }, [event.id]);

  const handleParticipate = async () => {
    try {
      const response = await fetch(`/api/events/${event.id}/participate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao participar do evento');
      }

      queryClient.invalidateQueries([`/api/events/${event.id}/participation`]);
      toast({
        title: "Sucesso!",
        description: "Sua solicitação foi enviada com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível participar do evento.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Card 
        className={cn(
          "overflow-hidden hover:shadow-xl transition-all duration-300 group transform hover:scale-[1.02] cursor-pointer",
          event.category.slug === "lgbt" && "border-0 pride-border"
        )}
        onClick={() => setIsViewModalOpen(true)} // Adiciona onClick para abrir o modal ao clicar no card
      >
        {event.coverImage ? (
          <div className="h-48 overflow-hidden">
            <img
              src={event.coverImage}
              alt={event.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-r from-primary/20 to-primary/40 flex items-center justify-center">
            <CalendarIcon className="h-16 w-16 text-primary/50" />
          </div>
        )}

        <div className="p-4">
          <h3 className="text-lg font-semibold mb-2">{event.name}</h3>

          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
            <MapPinIcon className="h-4 w-4" />
            <span>{event.location}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <CalendarIcon className="h-4 w-4" />
            <span>{new Date(event.date).toLocaleDateString()}</span>
          </div>

          <div className="mt-4 flex items-center justify-between">
            {!isCreator && (
              <Button 
                onClick={(e) => {
                  e.stopPropagation(); // Impede que o clique do botão abra o modal
                  handleParticipate();
                }}
                disabled={isParticipating}
                variant="secondary"
              >
                {isParticipating ? 'Participando' : 'Participar'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {isViewModalOpen && (
        <ViewEventModal
          event={event}
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
        />
      )}
    </>
  );
}