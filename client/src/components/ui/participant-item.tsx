import { CheckCircle, XCircle, RotateCcw, User } from "lucide-react";
import { getUserDisplayName } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Eneagon from "@/components/ui/eneagon";
import { logError, ErrorSeverity } from "@/lib/errorLogger";
import { useState } from "react";
import { UserProfileDialog } from "./user-profile-dialog";

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
  onViewProfile?: (userId: number) => void;
}

export function ParticipantItem({
  participant,
  eventType,
  statusColors,
  statusText,
  onApprove,
  onReject,
  onRemove,
  onRevert,
  onViewProfile
}: ParticipantItemProps) {
  // Estado para controlar a visibilidade do diálogo de perfil
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  
  // Status colors para os badges
  const status = participant.status;

  return (
    <>
      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg group">
        <div 
          className="flex items-center flex-1 p-2 rounded-md transition-colors cursor-pointer"
          onClick={() => {
            if (onViewProfile) {
              onViewProfile(participant.userId);
            } else {
              setIsProfileDialogOpen(true);
            }
          }}
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
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn(`${statusColors[status]} text-xs`)}>
                {statusText[status]}
              </Badge>
              <Button
                variant="link"
                size="sm"
                className="text-xs text-orange-600 hover:text-orange-800 p-0 h-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onViewProfile) {
                    onViewProfile(participant.userId);
                  } else {
                    setIsProfileDialogOpen(true);
                  }
                }}
              >
                Ver perfil
              </Button>
            </div>
          </div>
        </div>
        
        {/* Exibe os botões de ação apenas para eventos do tipo candidatura */}
        {eventType === 'private_application' && (
          <div className="flex space-x-1">
            {/* Botão para ver perfil - presente para todos os status */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-orange-600 hover:text-orange-800 hover:bg-orange-100"
              onClick={() => {
                if (onViewProfile) {
                  onViewProfile(participant.userId);
                } else {
                  setIsProfileDialogOpen(true);
                }
              }}
              title="Ver perfil"
            >
              <User className="h-5 w-5" />
            </Button>
            {/* Botões para candidaturas pendentes */}
            {status === 'pending' && onApprove && onReject && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-green-600 hover:text-green-800 hover:bg-green-100"
                  onClick={() => {
                    try {
                      onApprove(participant.id);
                    } catch (error) {
                      // Registra o erro no sistema de log
                      logError(
                        `Erro ao aprovar participante ${participant.id}`, 
                        ErrorSeverity.ERROR, 
                        {
                          context: 'ApproveParticipant',
                          component: 'ParticipantItem',
                          error: error instanceof Error ? error : new Error(String(error)),
                          additionalData: { 
                            participantId: participant.id,
                            userId: participant.userId,
                            eventId: participant.eventId,
                            previousStatus: participant.status,
                            timestamp: new Date().toISOString()
                          }
                        }
                      );
                    }
                  }}
                  title="Aprovar"
                >
                  <CheckCircle className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-100"
                  onClick={() => {
                    try {
                      onReject(participant.id);
                    } catch (error) {
                      // Registra o erro no sistema de log
                      logError(
                        `Erro ao rejeitar participante ${participant.id}`, 
                        ErrorSeverity.ERROR, 
                        {
                          context: 'RejectParticipant',
                          component: 'ParticipantItem',
                          error: error instanceof Error ? error : new Error(String(error)),
                          additionalData: { 
                            participantId: participant.id,
                            userId: participant.userId,
                            eventId: participant.eventId,
                            previousStatus: participant.status,
                            timestamp: new Date().toISOString()
                          }
                        }
                      );
                    }
                  }}
                  title="Rejeitar"
                >
                  <XCircle className="h-5 w-5" />
                </Button>
              </>
            )}
            
            {/* Botão de reverter para candidaturas já avaliadas (approved/rejected) */}
            {(status === 'approved' || status === 'rejected') && onRevert && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-amber-600 hover:text-amber-800 hover:bg-amber-100"
                onClick={() => {
                  try {
                    onRevert(participant.id);
                  } catch (error) {
                    // Registra o erro no sistema de log
                    logError(
                      `Erro ao revogar decisão para participante ${participant.id}`, 
                      ErrorSeverity.ERROR, 
                      {
                        context: 'RevertParticipant',
                        component: 'ParticipantItem',
                        error: error instanceof Error ? error : new Error(String(error)),
                        additionalData: { 
                          participantId: participant.id,
                          userId: participant.userId,
                          eventId: participant.eventId,
                          previousStatus: participant.status,
                          timestamp: new Date().toISOString()
                        }
                      }
                    );
                  }
                }}
                title="Revogar decisão"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            )}
            
            {/* Botão de remover para todos os status */}
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-600 hover:text-gray-800 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  try {
                    onRemove(participant.id);
                  } catch (error) {
                    // Registra o erro no sistema de log
                    logError(
                      `Erro ao remover participante ${participant.id}`, 
                      ErrorSeverity.ERROR, 
                      {
                        context: 'RemoveParticipant',
                        component: 'ParticipantItem',
                        error: error instanceof Error ? error : new Error(String(error)),
                        additionalData: { 
                          participantId: participant.id,
                          userId: participant.userId,
                          eventId: participant.eventId,
                          previousStatus: participant.status,
                          timestamp: new Date().toISOString()
                        }
                      }
                    );
                  }
                }}
                title="Remover participante"
              >
                <XCircle className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Diálogo de perfil do usuário */}
      {onViewProfile ? (
        // Usar a função passada via props para ter integração com o componente pai
        <div onClick={() => {
          onViewProfile(participant.userId);
          setIsProfileDialogOpen(false);
        }} className="hidden" />
      ) : (
        // Mostrar o diálogo interno se não tiver função externa de visualização
        <UserProfileDialog 
          userId={participant.userId}
          isOpen={isProfileDialogOpen}
          onClose={() => setIsProfileDialogOpen(false)}
        />
      )}
    </>
  );
}