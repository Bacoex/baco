/**
 * Sistema de monitoramento de erros do servidor
 * Responsável por capturar, registrar e rastrear erros em chamadas API
 */
import { storage } from "./storage";

// Aplicar monitoramento automático no objeto storage
export const monitoredStorage = monitorServerObject(storage, 'StorageService', ['sessionStore']);

// Níveis de severidade de erro
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Monitora uma função para registrar erros
 * @param fn Função a ser monitorada
 * @param functionName Nome da função para o log
 * @param component Componente da função
 * @param severity Severidade do erro (padrão: ERROR)
 * @returns Função monitorada
 */
export function monitorServerFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  functionName: string,
  component: string,
  severity: ErrorSeverity = ErrorSeverity.ERROR
): T {
  return async function(...args: any[]) {
    try {
      return await fn(...args);
    } catch (error: unknown) {
      // Determinar o tipo de erro e uma mensagem mais descritiva
      const err = error as Error;
      let errorMessage = err.message || 'Erro desconhecido';
      let errorType = err.name || 'Error';
      
      // Criar uma mensagem de log bem formatada
      console.error(`[${severity}] ${component}.${functionName}: ${errorType} - ${errorMessage}`);
      console.error(`Stack: ${err.stack}`);
      
      // Registrar os argumentos não sensíveis
      const safeArgs = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          // Omitir campos sensíveis como senhas
          const safeArg = { ...arg };
          if ('password' in safeArg) safeArg.password = '[REDACTED]';
          if ('token' in safeArg) safeArg.token = '[REDACTED]';
          
          try {
            return JSON.stringify(safeArg).substring(0, 500);
          } catch (e) {
            return '[Objeto Circular]';
          }
        }
        return String(arg);
      });
      
      console.error(`Argumentos: ${safeArgs.join(', ')}`);
      
      // Repassar o erro para tratamento na rota
      throw error;
    }
  } as T;
}

/**
 * Monitora um objeto (como uma classe) para registrar erros em todos os seus métodos
 * @param obj Objeto a ser monitorado
 * @param component Nome do componente
 * @param excludeMethods Métodos a serem excluídos do monitoramento
 * @param severity Severidade dos erros
 * @returns Objeto com métodos monitorados
 */
export function monitorServerObject<T extends Record<string, any>>(
  obj: T,
  component: string,
  excludeMethods: string[] = [],
  severity: ErrorSeverity = ErrorSeverity.ERROR
): T {
  const monitoredObject = { ...obj };
  
  for (const key in monitoredObject) {
    // Monitorar apenas métodos que são funções e não estão na lista de exclusão
    if (
      typeof monitoredObject[key] === 'function' && 
      !excludeMethods.includes(key) &&
      !key.startsWith('_') // Métodos privados (por convenção) são excluídos
    ) {
      monitoredObject[key] = monitorServerFunction(
        monitoredObject[key],
        key,
        component,
        severity
      );
    }
  }
  
  return monitoredObject;
}

/**
 * Middleware para Express que monitora erros de requisição
 */
export function errorMonitoringMiddleware(req: any, res: any, next: any) {
  // Capturar o tempo inicial da requisição
  const startTime = Date.now();
  
  // Interceptar o método res.send para monitorar respostas de erro
  const originalSend = res.send;
  
  res.send = function(body: any) {
    // Calcular tempo de resposta
    const responseTime = Date.now() - startTime;
    
    // Registrar respostas de erro (códigos 4xx e 5xx)
    if (res.statusCode >= 400) {
      console.error(`[ERRO-API] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Tempo: ${responseTime}ms`);
      console.error(`Corpo da requisição: ${JSON.stringify(req.body || {})}`);
      
      // Se for um erro do sistema, registrar também o corpo da resposta
      if (res.statusCode >= 500) {
        console.error(`Resposta: ${body}`);
      }
    }
    
    // Chamar o método original
    return originalSend.call(this, body);
  };
  
  next();
}