import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Home, AlertTriangle, ArrowLeft } from "lucide-react";
import NetworkBackground from "@/components/ui/network-background";
import { Header } from "@/components/ui/header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { logShareEventError } from "@/lib/errorLogger";

/**
 * Página de erro exibida quando ocorre um problema na geração de links de compartilhamento
 */
export default function ShareErrorPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  // Extrair parâmetros da URL
  const params = new URLSearchParams(location.split("?")[1]);
  const eventId = params.get("eventId") ? parseInt(params.get("eventId")!) : null;
  const errorType = params.get("type") || "unknown";
  const errorMessage = params.get("message") || "Erro desconhecido no compartilhamento";

  // Registrar o erro no sistema de logs
  useEffect(() => {
    if (eventId) {
      const error = new Error(errorMessage);
      logShareEventError(eventId, `erro fatal (${errorType})`, error, {
        location: window.location.href,
        timestamp: new Date().toISOString()
      });
    }
  }, [eventId, errorType, errorMessage]);

  // Navegar de volta para a página inicial
  const handleGoHome = () => {
    navigate("/");
    toast({
      title: "Redirecionando para a página inicial",
      description: "Você será direcionado para a página inicial."
    });
  };

  // Navegar de volta para a página anterior
  const handleGoBack = () => {
    window.history.back();
    toast({
      title: "Retornando...",
      description: "Voltando para a página anterior."
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-black">
      <NetworkBackground />
      <Header />

      <main className="flex-grow flex items-center justify-center px-4 pb-20 pt-28">
        <Card className="w-full max-w-md bg-black/60 backdrop-blur border-gray-800">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 p-3 rounded-full bg-red-100/10 w-16 h-16 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <CardTitle className="text-xl text-white">Erro no Compartilhamento</CardTitle>
            <CardDescription className="text-gray-400">
              Não foi possível gerar o link de compartilhamento para este evento.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center py-4">
            <div className="bg-gray-900/50 p-4 rounded-md mb-4 text-left">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Detalhes do erro:</h3>
              <p className="text-sm text-white mb-1"><strong>Tipo:</strong> {errorType}</p>
              <p className="text-sm text-white"><strong>Mensagem:</strong> {errorMessage}</p>
              {eventId && <p className="text-sm text-white"><strong>Evento ID:</strong> {eventId}</p>}
              <p className="mt-3 text-xs text-gray-500">
                Este erro foi registrado e nossa equipe técnica será notificada.
              </p>
            </div>
            
            <p className="text-gray-300 text-sm mb-4">
              Você pode tentar compartilhar o evento novamente mais tarde ou entrar em contato com o suporte se o problema persistir.
            </p>
          </CardContent>
          
          <CardFooter className="flex gap-3 justify-center">
            <Button 
              variant="outline" 
              className="flex-1 flex items-center justify-center gap-2" 
              onClick={handleGoBack}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button 
              className="flex-1 flex items-center justify-center gap-2" 
              onClick={handleGoHome}
            >
              <Home className="h-4 w-4" />
              Página Inicial
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}