import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Link } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Header } from '@/components/ui/header';
import NetworkBackground from '@/components/ui/network-background';
import { 
  getLogs, 
  clearLogs, 
  removeOldLogs, 
  ErrorSeverity, 
  ErrorLogEntry,
  ErrorComponent,
  getErrorStatistics,
  logCreateEventError,
  analyzeSelectNullError,
  analyzeApiCallError
} from '@/lib/errorLogger';
import { 
  Loader2, 
  Trash2, 
  RotateCcw, 
  FileText, 
  AlertTriangle, 
  Info, 
  AlertCircle, 
  Clock 
} from 'lucide-react';

export default function ErrorLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [filter, setFilter] = useState<ErrorSeverity | 'all'>('all');
  const [componentFilter, setComponentFilter] = useState<string | 'all'>('all');
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState<boolean>(false);
  const [oldLogsRemoved, setOldLogsRemoved] = useState<number>(0);

  // Carregar logs ao iniciar a página
  useEffect(() => {
    loadLogs();
  }, []);

  // Recarregar logs quando os filtros mudarem
  useEffect(() => {
    loadLogs();
  }, [filter, componentFilter, showDuplicatesOnly]);

  // Função para carregar logs com todos os filtros aplicados
  const loadLogs = () => {
    let filteredLogs = getLogs();
    
    // Aplicar filtro de severidade
    if (filter !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.severity === filter);
    }
    
    // Aplicar filtro de componente
    if (componentFilter !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.component === componentFilter);
    }
    
    // Aplicar filtro de duplicações de notificações
    if (showDuplicatesOnly) {
      filteredLogs = filteredLogs.filter(log => 
        log.component === ErrorComponent.NOTIFICATION_DUPLICATE
      );
    }
    
    setLogs(filteredLogs);
  };

  // Função para remover logs antigos
  const handleRemoveOldLogs = () => {
    const removed = removeOldLogs();
    setOldLogsRemoved(removed);
    loadLogs();
    
    if (removed > 0) {
      toast({
        title: 'Logs antigos removidos',
        description: `${removed} logs com mais de 14 dias foram excluídos permanentemente.`
      });
    } else {
      toast({
        title: 'Não há logs antigos',
        description: 'Todos os logs existentes estão dentro do período de retenção de 14 dias.'
      });
    }
  };
  
  // Limpar todos os logs
  const handleClearLogs = () => {
    if (window.confirm('Tem certeza que deseja limpar todos os logs? Esta ação não pode ser desfeita.')) {
      clearLogs();
      setLogs([]);
      toast({
        title: 'Logs limpos',
        description: 'Todos os logs foram removidos do sistema.',
      });
    }
  };

  // Mapeia severidades para cores e ícones
  const severityConfig: Record<ErrorSeverity, { color: string; icon: React.ReactNode }> = {
    [ErrorSeverity.INFO]: { 
      color: 'bg-blue-100 text-blue-800 border-blue-300', 
      icon: <Info className="h-4 w-4" /> 
    },
    [ErrorSeverity.WARNING]: { 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
      icon: <AlertTriangle className="h-4 w-4" /> 
    },
    [ErrorSeverity.ERROR]: { 
      color: 'bg-red-100 text-red-800 border-red-300', 
      icon: <AlertCircle className="h-4 w-4" /> 
    },
    [ErrorSeverity.CRITICAL]: { 
      color: 'bg-purple-100 text-purple-900 border-purple-300', 
      icon: <AlertCircle className="h-4 w-4 fill-purple-700" /> 
    },
  };

  // Formatar data e hora
  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black">
        <NetworkBackground />
        <div className="text-center text-white">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-4">Carregando...</p>
        </div>
      </div>
    );
  }

  // Obter estatísticas de erros
  const [errorStats, setErrorStats] = useState<{
    totalErrors: number;
    byComponent: Record<string, number>;
    bySeverity: Record<string, number>;
    recentErrors: number;
  }>({
    totalErrors: 0,
    byComponent: {},
    bySeverity: {},
    recentErrors: 0
  });

  // Atualizar estatísticas ao carregar a página e quando os logs mudarem
  useEffect(() => {
    updateErrorStats();
  }, [logs]);

  // Função para atualizar estatísticas
  const updateErrorStats = () => {
    try {
      const stats = getErrorStatistics();
      setErrorStats(stats);
    } catch (error) {
      console.error("Erro ao calcular estatísticas de erros:", error);
    }
  };

  // Função para testar o registro de erros do CreateEventModal
  // Observe que isso apenas cria registros de log simulados e não tenta abrir o modal real
  const createTestErrorLog = () => {
    // Registrar erro simulado para o modal de criação 
    logCreateEventError(
      "Teste de erro no modal de criação de eventos", 
      new Error("Erro simulado para teste"),
      { 
        subcategoryId: null, 
        categoryId: 1, 
        name: "Teste de evento", 
        eventType: "public",
        date: "2025-10-10"
      }
    );
    
    // Registrar erro de campo nulo
    analyzeSelectNullError("subcategoryId", null);
    
    // Registrar erro simulado de API
    analyzeApiCallError(
      "/api/events", 
      "POST", 
      new Error("Erro de API simulado para teste"),
      { name: "Teste de evento" }
    );
    
    toast({
      title: "Logs de teste criados",
      description: "Foram gerados logs de teste para o sistema de monitoramento do modal de criação de eventos."
    });
    
    // Recarregar logs para exibir os novos
    loadLogs();
    
    // Atualizar estatísticas
    updateErrorStats();
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-black">
      <NetworkBackground />
      <Header />

      <main className="flex-grow px-4 pb-20 pt-28 relative z-10">
        <div className="container mx-auto max-w-6xl">
          {/* Painel de estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-black/30 backdrop-blur-sm border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white">Total de Erros</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-white">{errorStats.totalErrors}</p>
                <p className="text-sm text-gray-400">
                  <span className="font-semibold text-blue-400">{errorStats.recentErrors}</span> nas últimas 24h
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-black/30 backdrop-blur-sm border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white">Por Severidade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {Object.entries(errorStats.bySeverity).map(([severity, count]) => (
                    <div key={severity} className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          severity === 'info' ? 'bg-blue-500' :
                          severity === 'warning' ? 'bg-yellow-500' :
                          severity === 'error' ? 'bg-red-500' :
                          'bg-purple-500'
                        }`} />
                        <span className="text-sm text-gray-300">
                          {severity === 'info' && 'Informação'}
                          {severity === 'warning' && 'Aviso'}
                          {severity === 'error' && 'Erro'}
                          {severity === 'critical' && 'Crítico'}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-black/30 backdrop-blur-sm border-gray-700 md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-white">Por Componente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(errorStats.byComponent).map(([component, count]) => (
                    <div key={component} className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">{component}</span>
                      <span className="text-sm font-medium text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="flex flex-col space-y-4 mb-6">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <a href="/">
                  <Button variant="outline" className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left mr-1">
                      <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
                    </svg>
                    Voltar
                  </Button>
                </a>
                <h1 className="text-xl font-semibold text-white">Log de Erros</h1>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={filter}
                    onValueChange={(value) => setFilter(value as ErrorSeverity | 'all')}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrar por severidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value={ErrorSeverity.INFO}>Informação</SelectItem>
                      <SelectItem value={ErrorSeverity.WARNING}>Aviso</SelectItem>
                      <SelectItem value={ErrorSeverity.ERROR}>Erro</SelectItem>
                      <SelectItem value={ErrorSeverity.CRITICAL}>Crítico</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={componentFilter}
                    onValueChange={(value) => setComponentFilter(value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrar por componente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value={ErrorComponent.CREATE_EVENT}>Criação de Evento</SelectItem>
                      <SelectItem value={ErrorComponent.EVENT_PARTICIPATION}>Participação</SelectItem>
                      <SelectItem value={ErrorComponent.NOTIFICATION}>Notificação</SelectItem>
                      <SelectItem value={ErrorComponent.NOTIFICATION_DUPLICATE}>Duplicação de Notificação</SelectItem>
                      <SelectItem value={ErrorComponent.API_REQUEST}>API Request</SelectItem>
                      <SelectItem value={ErrorComponent.GENERAL}>Geral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={showDuplicatesOnly ? "secondary" : "outline"} 
                onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
                className="flex items-center"
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                {showDuplicatesOnly ? "Mostrar Todos" : "Apenas Notificações Duplicadas"}
              </Button>
              
              <Button variant="ghost" onClick={loadLogs}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Atualizar
              </Button>
              
              <Button variant="outline" onClick={handleRemoveOldLogs}>
                <Clock className="h-4 w-4 mr-1" />
                Remover Antigos
              </Button>
              
              <Button variant="destructive" onClick={handleClearLogs}>
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar Tudo
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="bg-black/40 backdrop-blur-sm border border-gray-700 rounded p-3 flex items-center">
                <Clock className="h-5 w-5 text-blue-400 mr-2" />
                <p className="text-sm text-gray-300">
                  Os logs são automaticamente excluídos após <span className="font-semibold text-white">14 dias</span>.
                  {oldLogsRemoved > 0 && 
                    <span className="ml-2 italic">
                      {oldLogsRemoved} logs antigos foram excluídos na última limpeza.
                    </span>
                  }
                </p>
              </div>
              
              <div className="bg-black/40 backdrop-blur-sm border border-gray-700 rounded p-3">
                <h3 className="text-sm font-medium text-white mb-2">Ferramentas de Teste</h3>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={createTestErrorLog}>
                    Testar Error CreateEventModal
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    // Criar log direto usando a função principal para teste
                    import('@/lib/errorLogger').then(module => {
                      module.logError(
                        "Notificação duplicada detectada: participation_approved",
                        ErrorSeverity.WARNING,
                        {
                          component: ErrorComponent.NOTIFICATION_DUPLICATE,
                          context: "Teste manual de duplicação",
                          additionalData: {
                            notificationType: "participation_approved",
                            userId: 1,
                            eventId: 1,
                            notificationId: 999
                          }
                        }
                      );
                      
                      toast({
                        title: "Log de notificação duplicada",
                        description: "Foi criado um registro de log para teste de notificação duplicada."
                      });
                      
                      loadLogs();
                      updateErrorStats();
                    });
                  }}>
                    Testar Notificação Duplicada
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {logs.length === 0 ? (
            <Card className="bg-black/30 backdrop-blur-sm border-gray-700">
              <CardHeader>
                <CardTitle className="text-center text-white">Nenhum log encontrado</CardTitle>
                <CardDescription className="text-center text-gray-400">
                  {showDuplicatesOnly
                    ? 'Não há registros de duplicação de notificações no sistema.'
                    : filter === 'all' 
                      ? 'Não há registros de erros no sistema.' 
                      : `Não há registros de severidade "${filter}" no sistema.`}
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-center">
                <FileText className="h-16 w-16 text-gray-600" />
              </CardFooter>
            </Card>
          ) : (
            <div className="space-y-4">
              {logs.map((log, index) => (
                <Card key={index} className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex space-x-2 items-center">
                        <Badge className={severityConfig[log.severity].color}>
                          <span className="flex items-center">
                            {severityConfig[log.severity].icon}
                            <span className="ml-1">
                              {log.severity === ErrorSeverity.INFO && 'Informação'}
                              {log.severity === ErrorSeverity.WARNING && 'Aviso'}
                              {log.severity === ErrorSeverity.ERROR && 'Erro'}
                              {log.severity === ErrorSeverity.CRITICAL && 'Crítico'}
                            </span>
                          </span>
                        </Badge>
                        {log.component && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                            {log.component}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-300">
                        {formatDateTime(log.timestamp)}
                      </span>
                    </div>
                    <CardTitle className="text-lg mt-2 text-gray-900 dark:text-white">{typeof log.message === 'string' ? log.message : JSON.stringify(log.message)}</CardTitle>
                    {log.context && (
                      <CardDescription className="text-gray-700 dark:text-gray-200 font-medium">
                        Contexto: {typeof log.context === 'string' ? log.context : JSON.stringify(log.context)}
                      </CardDescription>
                    )}
                  </CardHeader>
                  
                  <CardContent>
                    {log.errorStack && (
                      <div className="mt-2">
                        <Separator className="my-2" />
                        <p className="text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 p-2 rounded">
                          {log.errorStack}
                        </p>
                      </div>
                    )}
                    
                    {log.additionalData && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-1 text-gray-800 dark:text-gray-200">Dados adicionais:</h4>
                        <pre className="text-xs bg-gray-50 dark:bg-gray-700 p-3 rounded overflow-x-auto text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                          {JSON.stringify(log.additionalData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}