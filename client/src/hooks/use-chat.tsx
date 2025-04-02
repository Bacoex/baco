import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useEffect } from "react";

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
  
  // Logger para diagnóstico do chat
  const logChatInfo = useCallback((action: string, data?: any) => {
    console.log(`[CHAT:${eventId}] ${action}`, data || '');
  }, [eventId]);

  // Registrar quando o hook é instanciado para depuração
  useEffect(() => {
    logChatInfo('Hook inicializado');
    return () => {
      logChatInfo('Hook destruído');
    };
  }, [logChatInfo]);
  
  // Buscar mensagens do chat
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    error: messagesError,
    refetch: refetchMessages,
    status: messagesStatus
  } = useQuery<ChatMessageWithUser[]>({
    queryKey: [`/api/events/${eventId}/chat`],
    queryFn: async () => {
      logChatInfo('Buscando mensagens');
      const response = await fetch(`/api/events/${eventId}/chat`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Erro ${response.status}`;
        logChatInfo('Erro na resposta', { status: response.status, error: errorMessage });
        throw new Error(errorMessage);
      }
      return response.json();
    },
    enabled: !!eventId,
    refetchInterval: 5000, // Atualiza a cada 5 segundos
    staleTime: 1000, // Considera os dados "stale" após 1 segundo
    onSuccess: (data) => {
      logChatInfo('Mensagens carregadas', { count: data.length });
    },
    onError: (error) => {
      logChatInfo('Erro ao carregar mensagens', {
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Enviar nova mensagem
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      logChatInfo('Enviando mensagem', { content });
      
      const response = await fetch(`/api/events/${eventId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || 'Erro ao enviar mensagem';
        logChatInfo('Erro na resposta do servidor', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorMessage 
        });
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      logChatInfo('Mensagem enviada com sucesso', { id: result.id });
      return result;
    },
    onSuccess: (newMessage) => {
      logChatInfo('Atualizando cache com nova mensagem');
      // Adicionar a nova mensagem ao cache atual e invalidar a consulta
      queryClient.setQueryData<ChatMessageWithUser[]>(
        [`/api/events/${eventId}/chat`], 
        (oldMessages = []) => [...oldMessages, newMessage]
      );
      
      // Invalidar a consulta para forçar um refetch na próxima vez
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/chat`] });
      
      // Feedback visual para o usuário
      toast({
        title: "Mensagem enviada",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      logChatInfo('Erro ao enviar mensagem', { message: error.message });
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const chatActions = {
    messages,
    isLoadingMessages,
    messagesError,
    refetchMessages,
    sendMessage: (content: string) => sendMessageMutation.mutate(content),
    isSending: sendMessageMutation.isPending,
    messagesStatus
  };
  
  // Log status when debugging
  useEffect(() => {
    logChatInfo('Status atual', { 
      isLoading: isLoadingMessages, 
      isSending: sendMessageMutation.isPending,
      status: messagesStatus,
      error: messagesError ? String(messagesError) : null,
      messagesCount: messages.length
    });
  }, [messagesStatus, isLoadingMessages, sendMessageMutation.isPending, messagesError, messages.length, logChatInfo]);
  
  return chatActions;
}