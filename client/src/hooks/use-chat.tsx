import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

/**
 * Interface para uma mensagem de chat com detalhes do usuário
 */
export interface ChatMessageWithUser {
  id: number;
  eventId: number;
  senderId: number;
  content: string;
  attachmentUrl: string | null;
  sentAt: string | null;
  readBy: string | null;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    profileImage: string | null;
  } | null;
}

/**
 * Hook para gerenciar o chat de um evento
 * @param eventId ID do evento cujo chat será acessado
 */
export function useChat(eventId: number) {
  const { toast } = useToast();
  
  // Buscar mensagens do chat
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    error: messagesError,
    refetch: refetchMessages
  } = useQuery<ChatMessageWithUser[]>({
    queryKey: [`/api/events/${eventId}/chat`],
    enabled: !!eventId,
    refetchInterval: 5000, // Atualiza a cada 5 segundos
    staleTime: 1000, // Considera os dados "stale" após 1 segundo
  });
  
  // Enviar nova mensagem
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/events/${eventId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao enviar mensagem');
      }
      
      return response.json();
    },
    onSuccess: (newMessage) => {
      // Adicionar a nova mensagem ao cache atual e invalidar a consulta
      queryClient.setQueryData<ChatMessageWithUser[]>(
        [`/api/events/${eventId}/chat`], 
        (oldMessages = []) => [...oldMessages, newMessage]
      );
      
      // Invalidar a consulta para forçar um refetch na próxima vez
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/chat`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  return {
    messages,
    isLoadingMessages,
    messagesError,
    refetchMessages,
    sendMessage: (content: string) => sendMessageMutation.mutate(content),
    isSending: sendMessageMutation.isPending
  };
}