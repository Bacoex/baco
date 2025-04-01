/**
 * Sistema de log para capturar e registrar erros na aplicação
 */

// Definição dos tipos de erros
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Definição dos tipos de erros por componente
export enum ErrorComponent {
  CREATE_EVENT = 'CreateEventModal',
  EVENT_PARTICIPATION = 'EventParticipation',
  AUTHENTICATION = 'Authentication',
  NOTIFICATION = 'Notification',
  API_REQUEST = 'ApiRequest',
  NOTIFICATION_DUPLICATE = 'NotificacaoDuplicada',
  GENERAL = 'General'
}

export interface ErrorLogEntry {
  timestamp: string;
  message: string;  // Sempre será string depois do processamento em logError
  severity: ErrorSeverity;
  userId?: number;
  context?: string;  // Sempre será string depois do processamento em logError
  component?: string;
  errorStack?: string;
  additionalData?: any;
}

// Manter logs em memória durante a sessão
const inMemoryLogs: ErrorLogEntry[] = [];

// Limite de logs armazenados
const MAX_LOGS = 100;

// Limite de dias para retenção de logs (14 dias)
const LOG_RETENTION_DAYS = 14;

/**
 * Adiciona um log de erro ao sistema
 * @param message Mensagem de erro
 * @param severity Nível de severidade
 * @param options Opções adicionais
 */
export function logError(
  message: any,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  options: {
    userId?: number;
    context?: any;
    component?: string;
    error?: Error;
    additionalData?: any;
  } = {}
): void {
  // Garantir que a mensagem seja uma string
  const messageStr = typeof message === 'string' 
    ? message 
    : (message instanceof Error 
      ? message.message 
      : JSON.stringify(message));
  
  // Garantir que o contexto seja uma string
  const contextStr = options.context 
    ? (typeof options.context === 'string' 
      ? options.context 
      : JSON.stringify(options.context))
    : undefined;
  
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    message: messageStr,
    severity,
    userId: options.userId,
    context: contextStr,
    component: options.component,
    errorStack: options.error?.stack,
    additionalData: options.additionalData
  };

  // Adicionar ao início do array para os logs mais recentes ficarem primeiro
  inMemoryLogs.unshift(entry);
  
  // Manter apenas os logs mais recentes
  if (inMemoryLogs.length > MAX_LOGS) {
    inMemoryLogs.pop();
  }

  // Salvar no localStorage para persistência entre sessões
  saveLogsToStorage();
  
  // Log no console para facilitar o debugging imediato
  const consoleMethod = getConsoleMethodForSeverity(severity);
  consoleMethod(`[${severity.toUpperCase()}] ${messageStr}`);
  
  if (options.error) {
    console.error(options.error);
  }
  
  if (options.additionalData) {
    console.log('Dados adicionais:', options.additionalData);
  }
}

/**
 * Recupera o método de console adequado para o nível de severidade
 */
function getConsoleMethodForSeverity(severity: ErrorSeverity): (message: string) => void {
  switch (severity) {
    case ErrorSeverity.INFO:
      return console.info;
    case ErrorSeverity.WARNING:
      return console.warn;
    case ErrorSeverity.ERROR:
    case ErrorSeverity.CRITICAL:
      return console.error;
    default:
      return console.log;
  }
}

/**
 * Salva os logs no localStorage
 */
function saveLogsToStorage(): void {
  try {
    localStorage.setItem('baco-error-logs', JSON.stringify(inMemoryLogs));
  } catch (e) {
    console.error('Erro ao salvar logs no localStorage:', e);
  }
}

/**
 * Remove logs mais antigos que o período de retenção configurado
 * @returns Número de logs removidos
 */
export function removeOldLogs(): number {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - LOG_RETENTION_DAYS);
  
  const initialCount = inMemoryLogs.length;
  
  // Remover logs mais antigos que o período de retenção
  const filteredLogs = inMemoryLogs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= cutoffDate;
  });
  
  // Atualizar a lista de logs se algum foi removido
  if (filteredLogs.length < initialCount) {
    inMemoryLogs.length = 0; // Limpar o array
    filteredLogs.forEach(log => inMemoryLogs.push(log)); // Re-adicionar logs válidos
    saveLogsToStorage(); // Salvar alterações
    
    return initialCount - filteredLogs.length; // Retornar quantidade de logs removidos
  }
  
  return 0;
}

/**
 * Carrega os logs armazenados no localStorage
 */
function loadLogsFromStorage(): void {
  try {
    const storedLogs = localStorage.getItem('baco-error-logs');
    if (storedLogs) {
      const parsedLogs = JSON.parse(storedLogs) as ErrorLogEntry[];
      // Adicionar todos os logs carregados
      parsedLogs.forEach(log => {
        if (!inMemoryLogs.some(existingLog => 
          existingLog.timestamp === log.timestamp && 
          existingLog.message === log.message
        )) {
          inMemoryLogs.push(log);
        }
      });
      
      // Ordenar por timestamp (mais recente primeiro)
      inMemoryLogs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Limitar o tamanho
      while (inMemoryLogs.length > MAX_LOGS) {
        inMemoryLogs.pop();
      }
      
      // Remover logs antigos (mais de 14 dias)
      const removedCount = removeOldLogs();
      if (removedCount > 0) {
        console.log(`Logs removidos automaticamente: ${removedCount} logs com mais de ${LOG_RETENTION_DAYS} dias`);
      }
    }
  } catch (e) {
    console.error('Erro ao carregar logs do localStorage:', e);
  }
}

/**
 * Recupera todos os logs armazenados
 * @returns Array de logs de erro
 */
export function getLogs(): ErrorLogEntry[] {
  return [...inMemoryLogs];
}

/**
 * Limpa todos os logs armazenados
 */
export function clearLogs(): void {
  inMemoryLogs.length = 0;
  try {
    localStorage.removeItem('baco-error-logs');
  } catch (e) {
    console.error('Erro ao limpar logs do localStorage:', e);
  }
}

/**
 * Filtra os logs por severidade
 * @param severity Nível de severidade para filtrar
 * @returns Array de logs filtrados
 */
export function getLogsBySeverity(severity: ErrorSeverity): ErrorLogEntry[] {
  return inMemoryLogs.filter(log => log.severity === severity);
}

/**
 * Filtra os logs por componente
 * @param component Nome do componente para filtrar
 * @returns Array de logs filtrados
 */
export function getLogsByComponent(component: string): ErrorLogEntry[] {
  return inMemoryLogs.filter(log => log.component === component);
}

// Inicialização: carregar logs do localStorage
loadLogsFromStorage();

// Criar um log de teste para demonstrar o formato de mensagem como objeto
if (inMemoryLogs.length === 0) {
  // Log com mensagem como objeto
  logError({ message: "Este é um erro de exemplo", code: 500 }, ErrorSeverity.ERROR, {
    component: "DemoComponent",
    context: { route: "/test", method: "GET" },
    additionalData: { 
      user: { id: 1, name: "Usuário de Teste" },
      request: { url: "/api/example", headers: { "Content-Type": "application/json" } }
    }
  });
  
  // Log com mensagem como string
  logError("Erro de autenticação", ErrorSeverity.WARNING, {
    component: "AuthService",
    context: "Tentativa de login",
    additionalData: { attempt: 3, ip: "192.168.1.1" }
  });
}

// Exportar objeto singleton
/**
 * Monitora uma função e registra automaticamente erros que ocorrem
 * @param fn Função a ser monitorada
 * @param options Opções de monitoramento
 * @returns Função monitorada que registra erros automaticamente
 */
export function monitorFunction<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    functionName: string;
    component?: string;
    context?: string;
    severity?: ErrorSeverity;
  }
): (...args: Parameters<T>) => ReturnType<T> {
  return function(...args: Parameters<T>): ReturnType<T> {
    try {
      const result = fn(...args);
      
      // Para funções que retornam Promises, monitorar erros assíncronos
      if (result instanceof Promise) {
        return result.catch(error => {
          logError(
            `Erro em ${options.functionName}: ${error.message}`,
            options.severity || ErrorSeverity.ERROR,
            {
              component: options.component,
              context: options.context,
              error,
              additionalData: {
                arguments: args.map(arg => 
                  // Apenas registrar argumentos primitivos ou seus stringificados para evitar loops circulares
                  typeof arg === 'object' ? JSON.stringify(arg).substring(0, 500) : arg
                ),
                functionName: options.functionName
              }
            }
          );
          throw error; // Re-lançar o erro para manter o comportamento original
        }) as ReturnType<T>;
      }
      
      return result;
    } catch (error: unknown) {
      const err = error as Error;
      logError(
        `Erro em ${options.functionName}: ${err.message || 'Erro desconhecido'}`,
        options.severity || ErrorSeverity.ERROR,
        {
          component: options.component,
          context: options.context,
          error: err,
          additionalData: {
            arguments: args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg).substring(0, 500) : arg
            ),
            functionName: options.functionName
          }
        }
      );
      throw error; // Re-lançar o erro para manter o comportamento original
    }
  };
}

/**
 * Monitora um objeto (por exemplo, um hook) e registra automaticamente erros em suas funções
 * @param obj Objeto com funções a serem monitoradas
 * @param options Opções de monitoramento
 * @returns Objeto com funções monitoradas
 */
export function monitorObject<T extends Record<string, any>>(
  obj: T,
  options: {
    objectName: string;
    component?: string;
    context?: string;
    severity?: ErrorSeverity;
    excludeMethods?: string[]; // Métodos a serem excluídos do monitoramento
  }
): Record<string, any> {
  const monitoredObject = { ...obj };
  const excludeMethods = options.excludeMethods || [];
  
  // Percorrer todas as propriedades do objeto
  for (const key in monitoredObject) {
    if (
      typeof monitoredObject[key] === 'function' && 
      !excludeMethods.includes(key)
    ) {
      // Substituir a função por uma versão monitorada
      monitoredObject[key] = monitorFunction(
        monitoredObject[key],
        {
          functionName: `${options.objectName}.${key}`,
          component: options.component,
          context: options.context,
          severity: options.severity
        }
      );
    }
  }
  
  return monitoredObject;
}

/**
 * Funções específicas para monitorar erros do modal de criação de eventos
 */

// Função para registrar erros específicos do modal de criação de eventos
export function logCreateEventError(message: string, error?: Error, formData?: any): void {
  logError(message, ErrorSeverity.ERROR, {
    component: ErrorComponent.CREATE_EVENT,
    context: 'Criação de evento',
    error,
    additionalData: {
      formData: formData ? { ...formData } : undefined,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    }
  });
}

// Função para analisar erros de NullValue em componentes Select
export function analyzeSelectNullError(fieldName: string, fieldValue: any): void {
  logError(`Valor nulo ou indefinido detectado em campo Select: ${fieldName}`, ErrorSeverity.WARNING, {
    component: ErrorComponent.CREATE_EVENT,
    context: 'Validação de campo',
    additionalData: {
      fieldName,
      fieldValue,
      fieldType: typeof fieldValue,
      isNull: fieldValue === null,
      isUndefined: fieldValue === undefined,
      stack: new Error().stack
    }
  });
}

// Função para analisar erros de chamadas de API
export function analyzeApiCallError(endpoint: string, method: string, error: Error, requestData?: any): void {
  logError(`Erro na chamada de API: ${method} ${endpoint}`, ErrorSeverity.ERROR, {
    component: ErrorComponent.API_REQUEST,
    context: `Requisição ${method}`,
    error,
    additionalData: {
      endpoint,
      method,
      requestData,
      timestamp: new Date().toISOString()
    }
  });
}

// Função para registrar erros de notificações duplicadas
export function logNotificationDuplicateError(
  notificationType: string, 
  userId: number, 
  eventId: number, 
  details?: any
): void {
  logError(`Notificação duplicada detectada: ${notificationType}`, ErrorSeverity.WARNING, {
    component: ErrorComponent.NOTIFICATION_DUPLICATE,
    context: 'Verificação de duplicidade',
    additionalData: {
      notificationType,
      userId,
      eventId,
      details,
      timestamp: new Date().toISOString()
    }
  });
}

// Função para recuperar estatísticas de erros
export function getErrorStatistics(): { 
  totalErrors: number,
  byComponent: Record<string, number>,
  bySeverity: Record<string, number>,
  recentErrors: number, // últimas 24h
} {
  const logs = getLogs();
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Contadores
  const byComponent: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  let recentErrors = 0;
  
  // Percorrer logs para estatísticas
  logs.forEach(log => {
    // Contar por componente
    if (log.component) {
      byComponent[log.component] = (byComponent[log.component] || 0) + 1;
    }
    
    // Contar por severidade
    bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;
    
    // Contar erros recentes (últimas 24 horas)
    const logDate = new Date(log.timestamp);
    if (logDate >= oneDayAgo) {
      recentErrors++;
    }
  });
  
  return {
    totalErrors: logs.length,
    byComponent,
    bySeverity,
    recentErrors
  };
}

// Exportamos as funções diretamente em cada definição
// Como ErrorSeverity, ErrorComponent e outras funções já
// estão exportadas diretamente onde são definidas