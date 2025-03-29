import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { logError, ErrorSeverity } from './errorLogger';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    const error = `${res.status}: ${text}`;
    
    // Registrar o erro usando o novo sistema de log
    logError(
      `Erro na requisição: ${error}`,
      ErrorSeverity.ERROR,
      {
        context: 'API Request',
        component: 'QueryClient',
        additionalData: { 
          status: res.status,
          url: res.url,
          statusText: res.statusText,
          timestamp: new Date().toISOString()
        }
      }
    );
    
    throw new Error(error);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Verifica se a requisição espera uma resposta JSON (apenas para avisar no console)
  const contentType = res.headers.get("content-type");
  if (contentType && !contentType.includes("application/json")) {
    console.warn(`Resposta não é JSON: ${url} retornou ${contentType}`);
    
    // Registra o aviso usando o sistema de log
    logError(
      `Requisição ${method} para ${url} retornou conteúdo não-JSON: ${contentType}`,
      ErrorSeverity.WARNING,
      {
        context: 'API Request',
        component: 'QueryClient',
        additionalData: { 
          status: res.status,
          url: res.url,
          contentType: contentType,
          timestamp: new Date().toISOString()
        }
      }
    );
  }
  
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
      onError: (error: unknown) => {
        // Registrar erros de consulta no sistema de logs
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
      },
    },
    mutations: {
      retry: false,
      onError: (error: unknown) => {
        // Registrar erros de mutação no sistema de logs
        logError(
          `Erro na mutação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          ErrorSeverity.ERROR,
          {
            context: 'QueryClient',
            component: 'Mutação',
            error: error instanceof Error ? error : new Error(String(error)),
            additionalData: { timestamp: new Date().toISOString() }
          }
        );
      },
    },
  },
});
