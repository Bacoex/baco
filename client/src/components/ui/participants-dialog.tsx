import { Users, Loader2 } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ParticipantItem, ParticipantWithUser } from "./participant-item";
import { useQuery } from "@tanstack/react-query";
import { logError, ErrorSeverity } from "@/lib/errorLogger";

interface ParticipantsDialogProps {
  eventId: number;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (participantId: number) => void;
  onReject?: (participantId: number) => void;
  onRemove?: (participantId: number) => void;
  onRevert?: (participantId: number) => void;
}

export function ParticipantsDialog({
  eventId,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onRemove,
  onRevert
}: ParticipantsDialogProps) {
  // Buscar informações do evento
  const eventQuery = useQuery({
    queryKey: [`/api/events/${eventId}`],
    enabled: isOpen
  });

  // Buscar participantes do evento
  const participantsQuery = useQuery({
    queryKey: [`/api/events/${eventId}/participants`],
    enabled: isOpen,
    staleTime: 10000,
    refetchInterval: 15000
  });

  // Extrair os dados necessários
  const event = eventQuery.data || {};
  const participants = (participantsQuery.data as ParticipantWithUser[] || []);
  const eventName = (event as any)?.name || `Evento #${eventId}`;
  // Garante que o eventType é um dos valores aceitáveis para a prop do ParticipantItem
  const rawEventType = (event as any)?.eventType;
  const eventType = (
    rawEventType === 'private_application' || 
    rawEventType === 'private_ticket' || 
    rawEventType === 'public'
  ) ? rawEventType : 'public' as const;
  // Cores para os badges de status
  const statusColors = {
    "confirmed": "bg-green-100 text-green-800 border-green-300",
    "approved": "bg-green-100 text-green-800 border-green-300",
    "pending": "bg-yellow-100 text-yellow-800 border-yellow-300",
    "rejected": "bg-red-100 text-red-800 border-red-300"
  };

  // Texto para os badges
  const statusText = {
    "confirmed": "Confirmado",
    "approved": "Aprovado",
    "pending": "Pendente",
    "rejected": "Rejeitado"
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(isOpen: boolean) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent aria-describedby="participants-dialog-description" className="max-w-md">
        <DialogHeader>
          <DialogTitle>Participantes: {eventName}</DialogTitle>
          <DialogDescription id="participants-dialog-description">
            {eventType === 'private_application' ? 
              'Gerencie as candidaturas para o seu evento.' : 
              'Veja quem está participando do seu evento.'}
          </DialogDescription>
        </DialogHeader>

        {participantsQuery.isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
          </div>
        ) : participants && participants.length > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {participants.map((participant) => (
              <ParticipantItem
                key={participant.id}
                participant={participant}
                eventType={eventType}
                statusColors={statusColors}
                statusText={statusText}
                onApprove={onApprove}
                onReject={onReject}
                onRemove={onRemove}
                onRevert={onRevert}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-gray-400" />
            <span className="block mt-2 text-gray-500">Nenhum participante ainda.</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}