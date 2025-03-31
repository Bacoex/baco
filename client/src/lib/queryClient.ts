import { QueryClient } from '@tanstack/react-query';
import { logError, ErrorSeverity } from '@/lib/errorLogger';

type ErrorHandling = {
  on401: "throw" | "returnNull" | "passthrough";
  errorPassthrough?: boolean;
}

// Função de fetch para a API que gerencia erros 401 de autenticação
export async function apiRequest(
  method: string, 
  url: string, 
  body?: Record<string, any> | null
): Promise<Response> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
    credentials: 'include', // Para enviar cookies em requisições cross-origin
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url.startsWith('/') ? url : `/${url}`, options);
    
    if (!response.ok) {
      if (response.status === 401) {
        // Erro de autenticação (usuário não está logado)
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }
      
      // Tenta extrair a mensagem de erro do corpo da resposta
      const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
      throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error(`Erro na requisição ${method} ${url}:`, error);
    throw error;
  }
}

// Função que gera o fetcher padrão para as consultas de dados
// Simplificada para funcionar melhor com TanStack Query v5
export function getQueryFn(options: ErrorHandling = { on401: "throw" }) {
  return async (context: any) => {
    try {
      const { queryKey } = context;
      const baseUrl = Array.isArray(queryKey) ? queryKey[0] : queryKey;
      
      // Simplificamos a lógica de URL para evitar problemas com os tipos
      const url = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
      
      // Fazer requisição HTTP
      const response = await fetch(url, {
        credentials: 'include',
      });
      
      // Manejar erros de autenticação
      if (response.status === 401) {
        if (options.on401 === "returnNull") {
          return null;
        } else if (options.on401 === "throw") {
          throw new Error('Usuário não autenticado. Faça login novamente.');
        }
      }
      
      // Manejar erros 404
      if (response.status === 404) {
        if (options.errorPassthrough) {
          console.info('[INFO] Recurso não encontrado:', url);
          return null;
        }
      }
      
      // Outros erros
      if (!response.ok) {
        const errorMessage = `Erro ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }
      
      // Retornar dados de sucesso
      return response.json();
    } catch (error) {
      // Registrar erro
      logError(
        `Erro na consulta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        ErrorSeverity.WARNING,
        {
          context: 'QueryClient',
          component: 'Consulta',
          error: error instanceof Error ? error : new Error(String(error)),
          additionalData: { timestamp: new Date().toISOString() }
        }
      );
      throw error;
    }
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Removemos o queryFn padrão para evitar problemas de tipagem
      // Em vez disso, vamos usar getQueryFn diretamente nos hooks useQuery
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false
    },
    mutations: {
      retry: false
    },
  },
});

// Em vez de listeners complicados, vamos registrar erros diretamente nas consultas e mutações
// Esta abordagem é mais simples e evita problemas com os tipos de evento na v5
// Os erros serão registrados no logError quando ocorrerem diretamente nas funções getQueryFn e apiRequest