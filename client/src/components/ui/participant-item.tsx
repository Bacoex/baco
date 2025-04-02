import { useState } from "react";
import { CheckCircle, Trash2, XCircle } from "lucide-react";
import { Badge } from "./badge";
import { Button } from "./button";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { getUserDisplayName } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export interface ParticipantItemProps {
  participant: {
    id: number;
    userId: number;
    status: string;
    user?: {
      firstName: string;
      lastName: string;
      profileImage: string | null;
    };
  };
  eventType: 'public' | 'private_ticket' | 'private_application';
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
  const { user } = useAuth();
  const isCreator = user?.id !== participant.userId;
  
  // Estado para controlar o hover no componente
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="flex flex-col p-3 rounded-md border bg-card hover:bg-accent/10 transition-colors"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={participant.user?.profileImage || undefined} />
            <AvatarFallback>
              {participant.user 
                ? `${participant.user.firstName?.charAt(0)}${participant.user.lastName?.charAt(0)}`
                : "U"}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <div className="text-sm">
              <Badge 
                variant="outline" 
                className={statusColors[participant.status] || ""}
              >
                {statusText[participant.status] || "Status Desconhecido"}
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Botões de ação para o criador do evento */}
        {isCreator && eventType === 'private_application' && (
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
                onClick={() => onRevert && onRevert(participant.id)} 
                size="sm" 
                variant="outline"
                className="text-amber-600 hover:text-amber-800 border-amber-600 hover:bg-amber-100"
              >
                Revisar
              </Button>
            )}
            
            {participant.status === 'rejected' && (
              <Button 
                onClick={() => onRevert && onRevert(participant.id)} 
                size="sm" 
                variant="outline"
              >
                Revisar
              </Button>
            )}
            
            <Button 
              onClick={() => onRemove && onRemove(participant.id)} 
              size="icon" 
              variant="ghost" 
              className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}