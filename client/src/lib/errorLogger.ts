
import { toast } from "@/components/ui/use-toast";

type ErrorLogLevel = 'error' | 'warning' | 'info';

interface ErrorLog {
  level: ErrorLogLevel;
  message: string;
  timestamp: string;
  context?: any;
}

class ErrorLogger {
  private static logs: ErrorLog[] = [];
  
  static log(level: ErrorLogLevel, message: string, context?: any) {
    const errorLog: ErrorLog = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context
    };
    
    this.logs.push(errorLog);
    
    if (level === 'error') {
      console.error(`[${errorLog.timestamp}] Error:`, message, context);
      toast({
        variant: "destructive",
        title: "Erro",
        description: message
      });
    }
  }

  static getLogs(): ErrorLog[] {
    return this.logs;
  }

  static clearLogs() {
    this.logs = [];
  }
}

export default ErrorLogger;
