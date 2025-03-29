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
  statusColors: Record<string, string>;
  statusText: Record<string, string>;
  onApprove?: (participantId: number) => void;
  onReject?: (participantId: number) => void;
  onRemove?: (participantId: number) => void;
  onRevert?: (participantId: number) => void;
}

export function ParticipantItem({
  participant,
  eventType,
  statusColors,
  statusText,
  onApprove,
  onReject,
  onRemove,
  onRevert
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
      
      {/* Exibe os botões de ação apenas para eventos do tipo candidatura */}
      {eventType === 'private_application' && (
        <div className="flex space-x-1">
          {/* Botões para candidaturas pendentes */}
          {status === 'pending' && onApprove && onReject && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-600 hover:text-green-800 hover:bg-green-100"
                onClick={() => onApprove(participant.id)}
                title="Aprovar"
              >
                <CheckCircle className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-100"
                onClick={() => onReject(participant.id)}
                title="Rejeitar"
              >
                <XCircle className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}