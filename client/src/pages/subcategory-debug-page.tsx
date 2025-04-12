import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Trash2, RefreshCw, DownloadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface SubcategoryDebugInfo {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  timestamp: string;
  status: 'error' | 'success' | 'warning' | 'info';
  message: string;
  source: string;
  details?: any;
}

export default function SubcategoryDebugPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<SubcategoryDebugInfo[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<SubcategoryDebugInfo[]>([]);
  const [filter, setFilter] = useState('all');

  // Criar logs simulados para testes
  useEffect(() => {
    const fetchCategoriesAndSubcategories = async () => {
      try {
        // Buscar todas as categorias
        const categoriesResponse = await fetch('/api/categories');
        const categories = await categoriesResponse.json();
        
        const newLogs: SubcategoryDebugInfo[] = [];
        
        // Para cada categoria, buscar subcategorias
        for (const category of categories) {
          try {
            const subcategoriesResponse = await fetch(`/api/categories/${category.id}/subcategories`);
            const subcategories = await subcategoriesResponse.json();
            
            // Log de sucesso
            newLogs.push({
              id: Date.now() + Math.random(),
              name: category.name,
              slug: category.slug,
              categoryId: category.id,
              timestamp: new Date().toISOString(),
              status: 'success',
              message: `Carregadas ${subcategories.length} subcategorias para a categoria ${category.name}`,
              source: 'Verificador automático',
              details: { subcategories }
            });
            
            // Se não houver subcategorias, adicionar um aviso
            if (subcategories.length === 0) {
              newLogs.push({
                id: Date.now() + Math.random(),
                name: category.name,
                slug: category.slug,
                categoryId: category.id,
                timestamp: new Date().toISOString(),
                status: 'warning',
                message: `Nenhuma subcategoria encontrada para a categoria ${category.name}`,
                source: 'Verificador automático'
              });
            }
            
          } catch (error) {
            // Log de erro
            newLogs.push({
              id: Date.now() + Math.random(),
              name: category.name,
              slug: category.slug,
              categoryId: category.id,
              timestamp: new Date().toISOString(),
              status: 'error',
              message: `Erro ao carregar subcategorias para a categoria ${category.name}`,
              source: 'Verificador automático',
              details: { error: error instanceof Error ? error.message : String(error) }
            });
          }
        }
        
        // Adicionar log para verificação manual do botão "Adicionar outra subcategoria"
        newLogs.push({
          id: Date.now() + Math.random(),
          name: 'Botão Adicionar Subcategoria',
          slug: 'add-subcategory-button',
          categoryId: 0,
          timestamp: new Date().toISOString(),
          status: 'info',
          message: 'Verificação manual necessária: Verificar se o botão "Adicionar outra subcategoria" está visível no dropdown',
          source: 'Sistema'
        });
        
        setLogs(newLogs);
        setFilteredLogs(newLogs);
        
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        toast({
          title: "Erro",
          description: "Não foi possível buscar os dados para depuração",
          variant: "destructive",
        });
      }
    };
    
    fetchCategoriesAndSubcategories();
  }, [toast]);

  const handleFilterChange = (value: string) => {
    setFilter(value);
    if (value === 'all') {
      setFilteredLogs(logs);
    } else {
      setFilteredLogs(logs.filter(log => log.status === value));
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setFilteredLogs([]);
    toast({
      title: "Logs limpos",
      description: "Todos os logs foram removidos",
    });
  };

  const refreshLogs = () => {
    // Trigger a reload of the component
    window.location.reload();
  };

  const downloadLogs = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subcategory-debug-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Depuração de Subcategorias</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={downloadLogs}>
            <DownloadCloud className="h-4 w-4 mr-2" />
            Exportar Logs
          </Button>
          <Button variant="outline" onClick={clearLogs}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Logs
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all" onClick={() => handleFilterChange('all')}>
            Todos ({logs.length})
          </TabsTrigger>
          <TabsTrigger value="error" onClick={() => handleFilterChange('error')}>
            Erros ({logs.filter(log => log.status === 'error').length})
          </TabsTrigger>
          <TabsTrigger value="warning" onClick={() => handleFilterChange('warning')}>
            Avisos ({logs.filter(log => log.status === 'warning').length})
          </TabsTrigger>
          <TabsTrigger value="success" onClick={() => handleFilterChange('success')}>
            Sucesso ({logs.filter(log => log.status === 'success').length})
          </TabsTrigger>
          <TabsTrigger value="info" onClick={() => handleFilterChange('info')}>
            Info ({logs.filter(log => log.status === 'info').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredLogs.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhum log encontrado.</p>
          ) : (
            filteredLogs.map((log) => (
              <LogCard key={log.id} log={log} />
            ))
          )}
        </TabsContent>

        <TabsContent value="error" className="space-y-4">
          {filteredLogs.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhum erro encontrado.</p>
          ) : (
            filteredLogs.map((log) => (
              <LogCard key={log.id} log={log} />
            ))
          )}
        </TabsContent>

        <TabsContent value="warning" className="space-y-4">
          {filteredLogs.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhum aviso encontrado.</p>
          ) : (
            filteredLogs.map((log) => (
              <LogCard key={log.id} log={log} />
            ))
          )}
        </TabsContent>

        <TabsContent value="success" className="space-y-4">
          {filteredLogs.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhum log de sucesso encontrado.</p>
          ) : (
            filteredLogs.map((log) => (
              <LogCard key={log.id} log={log} />
            ))
          )}
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          {filteredLogs.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhuma informação encontrada.</p>
          ) : (
            filteredLogs.map((log) => (
              <LogCard key={log.id} log={log} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

const LogCard = ({ log }: { log: SubcategoryDebugInfo }) => {
  const [expanded, setExpanded] = useState(false);
  
  const statusColor = {
    error: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    success: 'bg-green-100 text-green-800',
    info: 'bg-blue-100 text-blue-800',
  };
  
  const badgeColor = {
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    success: 'bg-green-500',
    info: 'bg-blue-500',
  };
  
  return (
    <Card className={`${statusColor[log.status]} border-l-4 ${log.status === 'error' ? 'border-l-red-500' : log.status === 'warning' ? 'border-l-yellow-500' : log.status === 'success' ? 'border-l-green-500' : 'border-l-blue-500'}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              {log.name}
              <Badge className={`${badgeColor[log.status]} text-white`}>
                {log.status === 'error' ? 'Erro' : log.status === 'warning' ? 'Aviso' : log.status === 'success' ? 'Sucesso' : 'Info'}
              </Badge>
            </CardTitle>
            <CardDescription className="text-sm">
              {new Date(log.timestamp).toLocaleString('pt-BR')} • {log.source}
            </CardDescription>
          </div>
          <Badge variant="outline">{`Categoria ID: ${log.categoryId || 'N/A'}`}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-2">{log.message}</p>
        
        {log.details && (
          <>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs mt-2" 
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Esconder detalhes" : "Mostrar detalhes"}
            </Button>
            
            {expanded && (
              <div className="mt-2 p-2 bg-white/50 rounded text-sm overflow-auto max-h-40">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};