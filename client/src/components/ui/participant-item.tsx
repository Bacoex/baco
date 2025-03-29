import { CheckCircle, XCircle } from "lucide-react";
import { getUserDisplayName } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eneagon } from "./eneagon";

import { cn } from "@/lib/utils";

export interface ParticipantWithUser {
  id: number;
  eventId: number;
  userId: number;
  status: string;
  applicationReason?: string | null;
  reviewedBy?: number | null;
  reviewedAt?: Date | null;
  createdAt?: Date | string | null;
  user?: {
    id: number;
    firstName?: string;
    lastName?: string;
    profileImage?: string | null;
  };
}

interface ParticipantItemProps {
  participant: ParticipantWithUser;
  eventType: "public" | "private_ticket" | "private_application";
  onApprove?: (participantId: number) => void;
  onReject?: (participantId: number) => void;
  onRemove?: (participantId: number) => void;
  onRevert?: (participantId: number) => void;
  statusColors: Record<string, string>;
  statusText: Record<string, string>;
}

export function ParticipantItem({
  participant,
  eventType,
  onApprove,
  onReject,
  onRemove,
  onRevert,
  statusColors,
  statusText
}: ParticipantItemProps) {
  // Status colors para os badges
  const status = participant.status;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg group">
      <div 
        className="flex items-center flex-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-md transition-colors" 
        onClick={() => window.location.href = `/profile/${participant.userId}`}
      >
        <Eneagon className="w-10 h-10">
          <Avatar>
            <AvatarImage src={participant.user?.profileImage || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {participant.user?.firstName?.charAt(0) || ""}{participant.user?.lastName?.charAt(0) || ""}
            </AvatarFallback>
          </Avatar>
        </Eneagon>
        <div className="ml-3">
          <div className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary">
            {getUserDisplayName({ 
              firstName: participant.user?.firstName || "", 
              lastName: participant.user?.lastName || "" 
            })}
          </div>
          <div className="mt-1">
            <Badge className={cn(`${statusColors[status]} text-xs`)}>
              {statusText[status]}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Botões de ação para candidatos pendentes */}
      {eventType === 'private_application' && status === 'pending' && (
        <div className="flex space-x-1">
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
            onClick={() => onApprove && onApprove(participant.id)}
          >
            <CheckCircle className="h-5 w-5" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
            onClick={() => onReject && onReject(participant.id)}
          >
            <XCircle className="h-5 w-5" />
          </Button>
        </div>
      )}
      
      {/* Botão para remover participante aprovado */}
      {eventType === 'private_application' && status === 'approved' && (
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
          onClick={() => onRemove && onRemove(participant.id)}
        >
          <XCircle className="h-5 w-5" />
        </Button>
      )}
      
      {/* Botão para reverter rejeição */}
      {eventType === 'private_application' && status === 'rejected' && (
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-8 w-8 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100"
          onClick={() => onRevert && onRevert(participant.id)}
        >
          <CheckCircle className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}