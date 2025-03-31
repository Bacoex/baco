import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarIcon, MapPinIcon, UsersIcon } from 'lucide-react';
import ViewEventModal from './view-event-modal';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

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
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isParticipating, setIsParticipating] = useState(false);
  const [participationStatus, setParticipationStatus] = useState<string | null>(participation?.status || null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Verifica se o usuário já está participando do evento
  const participationQuery = useQuery({
    queryKey: [`/api/events/${event.id}/participation`, user?.id],
    // Usamos o queryFn padrão do queryClient que já foi configurado para lidar com erros e respostas não-JSON
    enabled: !!user && !isCreator, // Só verificar participação se o usuário estiver logado e não for o criador
    staleTime: 5000, // Reduzido para atualizar mais rápido
    refetchOnMount: true, // Refetch sempre que o componente montar
    refetchOnWindowFocus: true, // Refetch quando a janela ganhar foco
    retry: 1, // Reduzir o número de tentativas para evitar muitas requisições em caso de erro
    refetchInterval: 5000, // Reduzido para atualizar a cada 5 segundos
    // Tratar código 404 (não participante) como sucesso com dados nulos, em vez de erro
    meta: {
      errorPassthrough: true
    }
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
    } else if (participationQuery.status === 'success') {
      // Se o status é success, verificamos a presença de dados
      if (participationQuery.data) {
        // Se temos dados, o usuário está participando
        // Verificar se o objeto tem a propriedade status
        if (typeof participationQuery.data === 'object' && participationQuery.data !== null) {
          // Se tiver um ID mas não tiver status, assumimos approved como padrão
          const data = participationQuery.data as any;
          const status = data.status || 'approved';
          setIsParticipating(true);
          setParticipationStatus(status);
          console.debug(`Usando status via query: ${status} (ID: ${data.id})`);
        } else {
          // Se a data retornada não for um objeto válido, assumimos que não está participando
          setIsParticipating(false);
          setParticipationStatus(null);
          console.debug('Query retornou dados inválidos, assumindo não-participação');
        }
      } else {
        // Se o status é success mas não temos dados, significa que o usuário não está participando
        setIsParticipating(false);
        setParticipationStatus(null);
        console.debug('Query retornou sucesso, mas sem dados, usuário não está participando');
      }
    } else if (participationQuery.error) {
      // Se houve erro na query, assumimos que não está participando
      setIsParticipating(false);
      setParticipationStatus(null);
      console.debug('Query retornou erro, assumindo não-participação', participationQuery.error);
    } else {
      // Caso contrário, está carregando ou em outro estado, mantemos o estado atual
      console.debug(`Query em estado ${participationQuery.status}, mantendo estado atual`);
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
      
      // Uma abordagem diferente: em vez de buscar o ID da participação, 
      // usamos o ID do evento para simplesmente dizer que o usuário não está mais participando
      console.log(`Enviando requisição POST para /api/events/${event.id}/cancel-participation`);
      
      // Vamos usar o endpoint de participantes original, mas precisamos do ID
      let participationId: number | undefined;
      
      if (participation) {
        participationId = participation.id;
      } else if (participationQuery.data && typeof participationQuery.data === 'object') {
        const data = participationQuery.data as any;
        if ('id' in data) {
          participationId = data.id;
        }
      }
      
      if (!participationId) {
        throw new Error('Não foi possível identificar sua participação no evento');
      }
      
      const response = await fetch(`/api/participants/${participationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      console.log(`Resposta de cancelamento - Status: ${response.status}`);
      
      if (!response.ok) {
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            throw new Error(errorData.message);
          }
        } catch (e) {
          // Ignorar erros de parse
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
          event={{
            ...event,
            coordinates: '',
            isActive: true,
            createdAt: new Date(),
            category: {
              ...event.category,
              id: typeof event.categoryId === 'number' ? event.categoryId : 1,
            }
          }}
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
        />
      )}
    </>
  );
}