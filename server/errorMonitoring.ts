/**
 * Sistema de monitoramento de erros do servidor
 * Responsável por capturar, registrar e rastrear erros em chamadas API
 */
import { storage } from "./storage";

// Não aplicamos o monitoramento imediatamente, pois o storage pode não estar completamente inicializado
// O monitoredStorage será criado através da função abaixo
export function getMonitoredStorage() {
  return monitorServerObject(storage, 'StorageService', ['sessionStore']);
}

// Níveis de severidade de erro
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Tipos específicos de erro para o sistema
export enum ErrorType {
  GENERAL = 'general_error',
  DATABASE = 'database_error',
  AUTHENTICATION = 'auth_error',
  VALIDATION = 'validation_error',
  NOTIFICATION_DUPLICATE = 'notification_duplicate',
  EXTERNAL_API = 'external_api_error'
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
// Armazenar erros para a página de logs
const errorLogs: Array<{
  timestamp: Date;
  type: string;
  severity: ErrorSeverity;
  component: string;
  message: string;
  details?: any;
}> = [];

// Período de retenção de logs em dias
const LOG_RETENTION_DAYS = 14;

/**
 * Registra um erro no sistema
 * @param type Tipo do erro
 * @param severity Severidade do erro
 * @param component Componente onde ocorreu o erro
 * @param message Mensagem de erro
 * @param details Detalhes adicionais (opcional)
 */
export function logError(
  type: ErrorType | string,
  severity: ErrorSeverity,
  component: string,
  message: string,
  details?: any
) {
  const errorLog = {
    timestamp: new Date(),
    type,
    severity,
    component,
    message,
    details
  };
  
  // Adicionar ao início para exibir erros mais recentes primeiro
  errorLogs.unshift(errorLog);
  
  // Remover logs antigos (mais de 14 dias)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - LOG_RETENTION_DAYS);
  
  // Filtrar logs para manter apenas os mais recentes
  while (errorLogs.length > 0 && errorLogs[errorLogs.length - 1].timestamp < cutoffDate) {
    errorLogs.pop();
  }
  
  // Logar no console para depuração
  console.error(`[${severity}] [${type}] ${component}: ${message}`);
}

/**
 * Verifica se já existe uma notificação idêntica para evitar duplicações
 * @param type Tipo da notificação
 * @param sourceId ID da fonte (ex: participante, evento)
 * @param userId ID do usuário destinatário
 * @param eventId ID do evento relacionado
 * @returns True se for uma duplicação, false caso contrário
 */
export function checkNotificationDuplicate(
  type: string, 
  sourceId: number, 
  userId: number, 
  eventId: number
): boolean {
  // Verificar notificações existentes
  const duplicateExists = true; // Implementar a lógica real
  
  if (duplicateExists) {
    // Registrar como erro de duplicação
    logError(
      ErrorType.NOTIFICATION_DUPLICATE,
      ErrorSeverity.WARNING,
      'NotificationService',
      `Tentativa de criar notificação duplicada: tipo=${type}, evento=${eventId}, destinatário=${userId}`,
      { type, sourceId, userId, eventId }
    );
    return true;
  }
  
  return false;
}

/**
 * Obter todos os logs de erro para exibição na página de logs
 * @returns Array de logs de erro
 */
export function getErrorLogs() {
  return errorLogs;
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
      
      // Se for um erro do sistema, registrar também o corpo da resposta e adicionar ao log
      if (res.statusCode >= 500) {
        console.error(`Resposta: ${body}`);
        
        // Adicionar ao log de erros
        logError(
          ErrorType.GENERAL,
          ErrorSeverity.ERROR,
          'APIService',
          `Erro ${res.statusCode} em ${req.method} ${req.originalUrl}`,
          { 
            request: { 
              method: req.method, 
              url: req.originalUrl, 
              body: req.body 
            },
            response: { 
              status: res.statusCode, 
              body: typeof body === 'string' ? body : JSON.stringify(body) 
            }
          }
        );
      }
    }
    
    // Chamar o método original
    return originalSend.call(this, body);
  };
  
  next();
}