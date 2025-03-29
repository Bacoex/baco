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
  const [participationStatus, setParticipationStatus] = useState<string | null>(participation?.status || null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Verifica se o usuário já está participando do evento
  const participationQuery = useQuery({
    queryKey: [`/api/events/${event.id}/participation`, user?.id],
    // Substituímos o queryFn padrão por uma implementação personalizada que trata resposta vazia com status 200
    queryFn: async ({ queryKey }) => {
      console.log(`Verificando participação para evento ${event.id}`);
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });
      
      console.log(`Resposta de verificação: status=${res.status}, contentType=${res.headers.get('content-type')}`);
      
      // Se o status for 200, significa que o usuário ESTÁ participando, mesmo que não tenha corpo JSON
      if (res.status === 200) {
        try {
          // Tenta fazer o parse do JSON
          const data = await res.json();
          console.log("Dados de participação:", data);
          return data;
        } catch (e) {
          // Se não conseguir fazer o parse, retorna um objeto padrão com status approved
          console.log("Resposta 200 sem JSON válido, assumindo participação aprovada");
          return { 
            id: -1, // ID temporário
            status: "approved",
            eventId: event.id,
            userId: user?.id
          };
        }
      } else if (res.status === 404) {
        // Não está participando
        console.log("Status 404, usuário não está participando");
        return null;
      } else if (res.status === 401) {
        // Não autenticado
        console.log("Status 401, usuário não autenticado");
        return null;
      }
      
      // Para outros erros, lançamos uma exceção
      throw new Error(`Erro ao verificar participação: ${res.status}`);
    },
    enabled: !!user && !isCreator, // Só verificar participação se o usuário estiver logado e não for o criador
    staleTime: 30000, // Considerar os dados frescos por 30 segundos
    refetchOnMount: true, // Refetch sempre que o componente montar
    refetchOnWindowFocus: true, // Refetch quando a janela ganhar foco
    retry: 1, // Reduzir o número de tentativas para evitar muitas requisições em caso de erro
    refetchInterval: 10000 // Refetch a cada 10 segundos para garantir dados atualizados
  });

  // Atualiza o estado isParticipating e participationStatus com base no participation prop ou no resultado da query
  useEffect(() => {
    // Log para debug
    console.debug(`EventCard ${event.id} - Atualizando status de participação:`, {
      participation,
      queryData: participationQuery.data,
      queryError: participationQuery.error,
      queryStatus: participationQuery.status,
      isLoading: participationQuery.isLoading,
      isFetching: participationQuery.isFetching,
    });

    if (participation) {
      // Se já temos informação de participação via props, usamos ela
      setIsParticipating(true);
      setParticipationStatus(participation.status);
      console.debug(`Usando status via props: ${participation.status} (ID: ${participation.id})`);
    } else if (participationQuery.data) {
      // Se a query retornou dados, o usuário está participando
      // Verificar se o objeto tem a propriedade status
      if (typeof participationQuery.data === 'object' && participationQuery.data !== null) {
        // Se tiver um ID mas não tiver status, assumimos approved como padrão
        const status = participationQuery.data.status || 'approved';
        setIsParticipating(true);
        setParticipationStatus(status);
        console.debug(`Usando status via query: ${status} (ID: ${participationQuery.data.id})`);
      } else {
        // Se a data retornada não for um objeto válido, assumimos que não está participando
        setIsParticipating(false);
        setParticipationStatus(null);
        console.debug('Query retornou dados inválidos, assumindo não-participação');
      }
    } else if (participationQuery.error) {
      // Se houve erro na query, assumimos que não está participando
      setIsParticipating(false);
      setParticipationStatus(null);
      console.debug('Query retornou erro, assumindo não-participação', participationQuery.error);
    } else {
      // Caso contrário, não está participando
      setIsParticipating(false);
      setParticipationStatus(null);
      console.debug('Sem dados de participação, usuário não está participando');
    }
  }, [participation, participationQuery.data, participationQuery.error, participationQuery.status, event.id]);

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

      console.log(`Tentando participar do evento ${event.id}...`);
      
      const response = await fetch(`/api/events/${event.id}/participate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      // Mostrar o status da resposta para diagnóstico
      console.log(`Resposta da API de participação - Status: ${response.status}`);
      console.log(`Content-Type: ${response.headers.get('content-type')}`);
      
      // Tenta ler a resposta como JSON para pegar mensagens de erro específicas
      let responseData;
      try {
        // Clone a resposta para poder ler o corpo duas vezes (para debug)
        const respClone = response.clone();
        responseData = await response.json();
        
        // Log para debug
        console.log(`Resposta de participação (json):`, responseData);
      } catch (e) {
        // Se não for JSON, tenta ler como texto para debug
        console.warn(`Resposta não é JSON válido ao participar do evento ${event.id}:`, e);
        try {
          const text = await response.text();
          console.log(`Resposta como texto:`, text);
        } catch (textError) {
          console.error(`Não foi possível ler a resposta nem como texto:`, textError);
        }
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
      
      // Define o status com base no tipo de evento
      const newStatus = event.eventType === 'private_application' ? 'pending' : 'approved';
      setParticipationStatus(newStatus);
      
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
      
      console.log(`Tentando cancelar participação no evento ${event.id}...`);
      console.log(`Estado atual:`, {
        isParticipating,
        participationStatus,
        participationViaProps: participation,
        participationViaQuery: participationQuery.data
      });
      
      let participationId;
      
      // Pegamos o ID da participação das props ou da query
      if (participation) {
        participationId = participation.id;
        console.log(`Usando ID de participação via props: ${participationId}`);
      } else if (participationQuery.data && typeof participationQuery.data === 'object') {
        // Verificar se o objeto tem a propriedade id antes de acessá-la
        if ('id' in participationQuery.data) {
          participationId = participationQuery.data.id;
          console.log(`Usando ID de participação via query: ${participationId}`);
        } else {
          console.warn('Objeto de participação não possui a propriedade id:', participationQuery.data);
        }
      } else {
        console.log('Tentando buscar dados de participação da API diretamente...');
        // Se não temos o ID da participação, tentamos buscar novamente com mais robustez
        try {
          const refreshResponse = await fetch(`/api/events/${event.id}/participation`, {
            credentials: 'include'
          });
          
          console.log(`Resposta de verificação - Status: ${refreshResponse.status}`);
          console.log(`Content-Type: ${refreshResponse.headers.get('content-type')}`);
          
          if (refreshResponse.status === 404) {
            // Usuário não está participando, então atualizamos o estado local
            console.log('API retornou 404 - usuário não está participando');
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
          
          let refreshData;
          try {
            refreshData = await refreshResponse.json();
            console.log('Dados de participação recebidos:', refreshData);
          } catch (jsonError) {
            console.error('Erro ao fazer parse da resposta como JSON:', jsonError);
            const text = await refreshResponse.text();
            console.log('Resposta como texto:', text);
            throw new Error('Resposta não é um JSON válido');
          }
          
          if (!refreshData || typeof refreshData !== 'object' || !('id' in refreshData)) {
            console.error('Dados de participação inválidos:', refreshData);
            throw new Error('Informações de participação não encontradas ou inválidas');
          }
          
          participationId = refreshData.id;
          console.log(`ID de participação obtido da API: ${participationId}`);
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
      
      console.log(`Enviando requisição DELETE para /api/participants/${participationId}`);
      
      const response = await fetch(`/api/participants/${participationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      console.log(`Resposta de cancelamento - Status: ${response.status}`);
      console.log(`Content-Type: ${response.headers.get('content-type')}`);
      
      // Tenta ler a resposta como JSON para pegar mensagens de erro específicas
      let responseData;
      try {
        // Clone a resposta para poder ler o corpo duas vezes (para debug)
        const respClone = response.clone();
        responseData = await response.json();
        
        // Log para debug
        console.log(`Resposta de cancelamento (json):`, responseData);
      } catch (e) {
        // Se não for JSON, tenta ler como texto para debug
        console.warn(`Resposta não é JSON válido ao cancelar participação:`, e);
        try {
          const text = await response.text();
          console.log(`Resposta como texto:`, text);
        } catch (textError) {
          console.error(`Não foi possível ler a resposta nem como texto:`, textError);
        }
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
      setParticipationStatus(null);
      
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

          <div className="mt-4 flex flex-col space-y-2">
            {/* Indicador de Status de Participação */}
            {!isCreator && isParticipating && participationStatus && (
              <div className={cn(
                "text-xs px-2 py-1 rounded-md text-center font-medium",
                participationStatus === "pending" && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                participationStatus === "approved" && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                participationStatus === "rejected" && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                participationStatus === "confirmed" && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              )}>
                {participationStatus === "pending" && "Aguardando aprovação"}
                {participationStatus === "approved" && "Aprovado"}
                {participationStatus === "rejected" && "Negado"}
                {participationStatus === "confirmed" && "Confirmado"}
              </div>
            )}
            
            {/* Botões de Ação */}
            <div className="flex items-center justify-between">
              {!isCreator && (
                isParticipating ? (
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation(); // Impede que o clique do botão abra o modal
                      handleCancelParticipation();
                    }}
                    variant="destructive"
                    size="sm"
                    className={cn(
                      "text-xs",
                      participationStatus === "rejected" && "bg-gray-500 hover:bg-gray-600"
                    )}
                    disabled={participationStatus === "rejected"}
                  >
                    {participationStatus === "rejected" 
                      ? "Participação negada" 
                      : "Cancelar participação"}
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