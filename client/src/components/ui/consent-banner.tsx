import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";

/**
 * Banner de consentimento LGPD
 * Exibe informações sobre o uso de dados e solicita consentimento do usuário
 */
export function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [necessary, setNecessary] = useState(true);

  // Verificar se o usuário já deu consentimento
  useEffect(() => {
    const consent = localStorage.getItem("data_consent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  // Salvar consentimento no localStorage
  const saveConsent = () => {
    const consentData = {
      necessary: true, // Sempre necessário
      analytics: analytics,
      marketing: marketing,
      timestamp: new Date().toISOString(),
      version: "1.0"
    };
    
    localStorage.setItem("data_consent", JSON.stringify(consentData));
    setShowBanner(false);
  };

  // Aceitar todos os tipos de consentimento
  const acceptAll = () => {
    setAnalytics(true);
    setMarketing(true);
    setNecessary(true);
    saveConsent();
  };

  // Aceitar apenas o necessário
  const acceptNecessary = () => {
    setAnalytics(false);
    setMarketing(false);
    setNecessary(true);
    saveConsent();
  };

  if (!showBanner) {
    return null;
  }

  return (
    <>
      {/* Banner de consentimento simplificado */}
      {!showDetails && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900 shadow-lg z-50 border-t border-gray-700">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Privacidade e Cookies</h3>
                <p className="text-sm text-gray-300 mt-1">
                  Utilizamos cookies e tecnologias similares para melhorar sua experiência. 
                  Conforme a Lei Geral de Proteção de Dados (LGPD), precisamos do seu consentimento.
                  <Link to="/privacy-policy" className="text-primary hover:underline ml-1">
                    Política de Privacidade
                  </Link>
                  <span className="mx-1">|</span>
                  <Link to="/terms-of-service" className="text-primary hover:underline">
                    Termos de Serviço
                  </Link>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setShowDetails(true)}>
                  Personalizar
                </Button>
                <Button variant="secondary" onClick={acceptNecessary}>
                  Recusar opcionais
                </Button>
                <Button onClick={acceptAll}>
                  Aceitar todos
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de configurações detalhadas */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurações de Privacidade</DialogTitle>
            <DialogDescription>
              Personalize como coletamos e utilizamos seus dados. Você pode modificar estas configurações a qualquer momento.
              <div className="flex flex-wrap gap-x-3 mt-1">
                <Link to="/privacy-policy" className="text-primary hover:underline">
                  Política de Privacidade
                </Link>
                <Link to="/terms-of-service" className="text-primary hover:underline">
                  Termos de Serviço
                </Link>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="necessary" 
                checked={necessary} 
                onCheckedChange={(checked) => setNecessary(checked === true)} 
                disabled 
              />
              <div>
                <Label htmlFor="necessary" className="font-medium text-base">Cookies Necessários</Label>
                <p className="text-sm text-gray-500">
                  Essenciais para o funcionamento do site. Não podem ser desativados.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="analytics" 
                checked={analytics} 
                onCheckedChange={(checked) => setAnalytics(checked === true)} 
              />
              <div>
                <Label htmlFor="analytics" className="font-medium text-base">Cookies Analíticos</Label>
                <p className="text-sm text-gray-500">
                  Nos ajudam a entender como você utiliza o site, melhorando a experiência.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="marketing" 
                checked={marketing} 
                onCheckedChange={(checked) => setMarketing(checked === true)} 
              />
              <div>
                <Label htmlFor="marketing" className="font-medium text-base">Cookies de Marketing</Label>
                <p className="text-sm text-gray-500">
                  Utilizados para mostrar conteúdo relevante e anúncios personalizados.
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-3">
            <Button variant="outline" onClick={() => setShowDetails(false)} type="button">
              Voltar
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={acceptNecessary} type="button">
                Aceitar necessários
              </Button>
              <Button onClick={saveConsent} type="button">
                Salvar preferências
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}