import { useState } from "react";
import { CheckCircle, Trash2, XCircle, User } from "lucide-react";
import { Badge } from "./badge";
import { Button } from "./button";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { getUserDisplayName } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  isCreator?: boolean;
  onApprove?: (participantId: number) => void;
  onReject?: (participantId: number) => void;
  onRemove?: (participantId: number) => void;
  onRevert?: (participantId: number) => void;
  onViewProfile?: (userId: number) => void;
}

export function ParticipantItem({
  participant,
  eventType,
  statusColors,
  statusText,
  isCreator: isCreatorProp,
  onApprove,
  onReject,
  onRemove,
  onRevert,
  onViewProfile
}: ParticipantItemProps) {
  const { user } = useAuth();
  // Usar propriedade passada pelo pai ou calcular com base na sessão atual
  const isCreator = isCreatorProp !== undefined ? isCreatorProp : user?.id !== participant.userId;
  
  // Estado para controlar o hover no componente
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="flex flex-col p-3 rounded-md border bg-card hover:bg-accent/10 transition-colors"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="flex items-center space-x-3 cursor-pointer" 
                onClick={() => onViewProfile && onViewProfile(participant.userId)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={participant.user?.profileImage || undefined} />
                  <AvatarFallback>
                    {participant.user 
                      ? `${participant.user.firstName?.charAt(0)}${participant.user.lastName?.charAt(0)}`
                      : "U"}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <div className="font-bold text-sm mb-1">
                    {participant.user ? `${participant.user.lastName}` : ""}
                  </div>
                  
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
            </TooltipTrigger>
            <TooltipContent>
              <p>Clique para ver perfil</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Botões de ação para o criador do evento */}
        {isCreator && eventType === 'private_application' && (
          <div className="flex space-x-1">
            {participant.status === 'pending' && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={() => onApprove && onApprove(participant.id)} 
                        size="icon" 
                        variant="ghost" 
                        className="text-green-600 hover:text-green-800 hover:bg-green-100"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Aprovar participante</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={() => onReject && onReject(participant.id)} 
                        size="icon" 
                        variant="ghost" 
                        className="text-red-600 hover:text-red-800 hover:bg-red-100"
                      >
                        <XCircle className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Rejeitar participante</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
            
            {participant.status === 'approved' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => onRevert && onRevert(participant.id)} 
                      size="sm" 
                      variant="outline"
                      className="text-amber-600 hover:text-amber-800 border-amber-600 hover:bg-amber-100"
                    >
                      Revisar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Voltar para pendente</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {participant.status === 'rejected' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => onRevert && onRevert(participant.id)} 
                      size="sm" 
                      variant="outline"
                    >
                      Revisar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Voltar para pendente</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={() => onRemove && onRemove(participant.id)} 
                    size="icon" 
                    variant="ghost" 
                    className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Remover participante</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
}