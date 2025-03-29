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
        const res = await fetch(`/api/events/${event.id}/participation`, {
          credentials: 'include'
        });
        
        // Se o status for 404, significa que o usuário não está participando
        if (res.status === 404) return null;
        
        // Se houver qualquer outro erro
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || `Erro ao verificar participação: ${res.status}`);
        }
        
        // Tenta fazer o parse do JSON, se falhar retorna null
        try {
          return await res.json();
        } catch (jsonError) {
          console.warn("Resposta não é JSON válido:", jsonError);
          return null;
        }
      } catch (error) {
        // Registra o erro no sistema de logs com mais detalhes
        console.error(`Erro ao verificar participação no evento ${event.id}:`, 
          error instanceof Error ? error.message : 'Erro desconhecido');
        return null;
      }
    },
    enabled: !!user && !isCreator, // Só verificar participação se o usuário estiver logado e não for o criador
    staleTime: 60000, // Considerar os dados frescos por 1 minuto
    refetchOnMount: true, // Refetch sempre que o componente montar
    refetchOnWindowFocus: true, // Refetch quando a janela ganhar foco
    retry: 1 // Reduzir o número de tentativas para evitar muitas requisições em caso de erro
  });

  // Atualiza o estado isParticipating com base no participation prop ou no resultado da query
  useEffect(() => {
    if (participation) {
      // Se já temos informação de participação via props, usamos ela
      setIsParticipating(true);
    } else if (participationQuery.data) {
      // Se a query retornou dados, o usuário está participando
      setIsParticipating(true);
    } else {
      // Caso contrário, não está participando
      setIsParticipating(false);
    }
  }, [participation, participationQuery.data]);

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

  // Função para participar do evento
  const handleParticipate = async () => {
    try {
      // Se já está participando, evita enviar a requisição
      if (isParticipating) {
        toast({
          title: "Atenção",
          description: "Você já está participando deste evento.",
          variant: "default"
        });
        return;
      }

      const response = await fetch(`/api/events/${event.id}/participate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      // Tenta ler a resposta como JSON para pegar mensagens de erro específicas
      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        // Se não for JSON, continua com o fluxo normal
      }

      if (!response.ok) {
        // Se temos uma mensagem de erro específica da API, usamos ela
        if (responseData && responseData.message) {
          throw new Error(responseData.message);
        }
        throw new Error('Falha ao participar do evento');
      }

      // Atualiza o estado local e na API
      setIsParticipating(true);
      
      // Invalidação de queries em cascata para garantir consistência
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/participation`] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/events/participating'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      
      toast({
        title: "Sucesso!",
        description: "Sua solicitação foi enviada com sucesso."
      });
    } catch (error) {
      // Registra o erro no sistema de logs com detalhes
      console.error(`Erro ao participar do evento ${event.id}:`, 
        error instanceof Error ? error.message : 'Erro desconhecido');
      
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível participar do evento.",
        variant: "destructive"
      });
    }
  };
  
  // Função para cancelar participação
  const handleCancelParticipation = async () => {
    try {
      // Se não está participando, evita enviar a requisição
      if (!isParticipating) {
        toast({
          title: "Atenção",
          description: "Você não está participando deste evento.",
          variant: "default"
        });
        return;
      }
      
      let participationId;
      
      // Pegamos o ID da participação das props ou da query
      if (participation) {
        participationId = participation.id;
      } else if (participationQuery.data) {
        participationId = participationQuery.data.id;
      } else {
        // Se não temos o ID da participação, tentamos buscar novamente com mais robustez
        try {
          const refreshResponse = await fetch(`/api/events/${event.id}/participation`, {
            credentials: 'include'
          });
          
          if (refreshResponse.status === 404) {
            // Usuário não está participando, então atualizamos o estado local
            setIsParticipating(false);
            toast({
              title: "Informação",
              description: "Você já não está participando deste evento.",
            });
            return;
          }
          
          if (!refreshResponse.ok) {
            throw new Error(`Falha ao verificar participação: ${refreshResponse.status}`);
          }
          
          const refreshData = await refreshResponse.json();
          if (!refreshData || !refreshData.id) {
            throw new Error('Informações de participação não encontradas');
          }
          
          participationId = refreshData.id;
        } catch (error) {
          console.error(`Erro ao verificar participação para cancelar: ${event.id}`, error);
          throw new Error('Não foi possível encontrar sua participação');
        }
      }
      
      // Se mesmo após a verificação não temos um ID, interrompemos
      if (!participationId) {
        setIsParticipating(false);
        throw new Error('Não foi possível encontrar seu registro de participação');
      }
      
      const response = await fetch(`/api/participants/${participationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      // Tenta ler a resposta como JSON para pegar mensagens de erro específicas
      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        // Se não for JSON, continua com o fluxo normal
      }

      if (!response.ok) {
        // Se temos uma mensagem de erro específica da API, usamos ela
        if (responseData && responseData.message) {
          throw new Error(responseData.message);
        }
        throw new Error('Falha ao cancelar participação');
      }

      // Atualiza o estado local e na API
      setIsParticipating(false);
      
      // Invalidação de queries em cascata para garantir consistência
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/participation`] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/events/participating'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      
      toast({
        title: "Participação cancelada",
        description: "Você não está mais participando deste evento."
      });
    } catch (error) {
      console.error('Erro ao cancelar participação:', 
        error instanceof Error ? error.message : 'Erro desconhecido');
      
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível cancelar sua participação.",
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
              isParticipating ? (
                <Button 
                  onClick={(e) => {
                    e.stopPropagation(); // Impede que o clique do botão abra o modal
                    handleCancelParticipation();
                  }}
                  variant="destructive"
                  size="sm"
                  className="text-xs"
                >
                  Cancelar participação
                </Button>
              ) : (
                <Button 
                  onClick={(e) => {
                    e.stopPropagation(); // Impede que o clique do botão abra o modal
                    handleParticipate();
                  }}
                  variant="secondary"
                >
                  Participar
                </Button>
              )
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