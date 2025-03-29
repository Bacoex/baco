import { Users } from "lucide-react";
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

interface ParticipantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventName: string;
  eventType: "public" | "private_ticket" | "private_application";
  participants: ParticipantWithUser[];
  onApprove?: (participantId: number) => void;
  onReject?: (participantId: number) => void;
  onRemove?: (participantId: number) => void;
  onRevert?: (participantId: number) => void;
}

export function ParticipantsDialog({
  open,
  onOpenChange,
  eventName,
  eventType,
  participants,
  onApprove,
  onReject,
  onRemove,
  onRevert
}: ParticipantsDialogProps) {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Participantes: {eventName}</DialogTitle>
          <div className="mt-1.5 text-sm text-muted-foreground">
            {eventType === 'private_application' ? 
              'Gerencie as candidaturas para o seu evento.' : 
              'Veja quem está participando do seu evento.'}
          </div>
        </DialogHeader>
        
        {participants && participants.length > 0 ? (
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
            <p className="mt-2 text-gray-500">Nenhum participante ainda.</p>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}