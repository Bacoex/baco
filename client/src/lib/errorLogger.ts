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

export interface ErrorLogEntry {
  timestamp: string;
  message: string;
  severity: ErrorSeverity;
  userId?: number;
  context?: string;
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
  message: string,
  severity: ErrorSeverity = ErrorSeverity.ERROR,
  options: {
    userId?: number;
    context?: string;
    component?: string;
    error?: Error;
    additionalData?: any;
  } = {}
): void {
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    message,
    severity,
    userId: options.userId,
    context: options.context,
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
  consoleMethod(`[${severity.toUpperCase()}] ${message}`);
  
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

// Exportar objeto singleton
export default {
  logError,
  getLogs,
  clearLogs,
  removeOldLogs,
  getLogsBySeverity,
  getLogsByComponent,
  ErrorSeverity
};