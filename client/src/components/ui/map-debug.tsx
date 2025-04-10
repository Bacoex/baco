import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MapPin, AlertTriangle, Check, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export default function MapDebug() {
  const [coordsInput, setCoordsInput] = useState("-22.3543372,-48.95975929999999");
  const [locationInput, setLocationInput] = useState("Alameda Jacu, 2 - Bauru, SP, 17037-260, Brazil");
  const [showMap, setShowMap] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${coordsInput.trim()}&zoom=14&size=600x300&markers=color:red%7C${coordsInput.trim()}&key=${apiKey}`;
  
  const handleTestMap = () => {
    setShowMap(true);
    setHasError(false);
    setErrorMessage("");
  };
  
  const handleMapError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error("Erro ao carregar o mapa estático");
    setHasError(true);
    
    // Tentar carregar o conteúdo do erro como texto
    fetch(mapUrl)
      .then(res => res.text())
      .then(text => {
        setErrorMessage(text);
      })
      .catch(err => {
        setErrorMessage("Não foi possível determinar o erro específico: " + err.message);
      });
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Testador de Mini Mapa do Google</CardTitle>
          <CardDescription>
            Diagnostique problemas com a integração do Google Maps Static API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-medium">Coordenadas:</h3>
              </div>
              <Input
                placeholder="Latitude,Longitude (ex: -22.3543372,-48.95975929999999)"
                value={coordsInput}
                onChange={(e) => setCoordsInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Formato: latitude,longitude (sem espaços)
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex gap-2 items-center">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-medium">Localização:</h3>
              </div>
              <Input
                placeholder="Endereço completo"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Apenas para referência, não afeta o mapa
              </p>
            </div>
          </div>

          <Separator />
          
          <div>
            <h3 className="text-sm font-medium mb-2">URL completa do mapa:</h3>
            <code className="text-xs bg-muted p-2 rounded block whitespace-pre-wrap">
              {mapUrl}
            </code>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Chave API:</h3>
            <code className="text-xs bg-muted p-2 rounded block">
              {apiKey ? apiKey.substring(0, 6) + '...' + apiKey.substring(apiKey.length - 4) : 'Não definida'}
            </code>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleTestMap} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Testar Mapa
          </Button>
        </CardFooter>
      </Card>
      
      {showMap && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado do Teste</CardTitle>
          </CardHeader>
          <CardContent>
            {hasError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro ao carregar o mapa</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 text-sm">
                    <p className="font-medium">Mensagem de erro:</p>
                    <code className="text-xs bg-muted p-2 rounded block mt-1 whitespace-pre-wrap">
                      {errorMessage || "Não foi possível determinar o erro específico."}
                    </code>
                  </div>
                  
                  <div className="mt-4">
                    <p className="font-medium">Possíveis soluções:</p>
                    <ul className="list-disc pl-5 mt-1 text-sm">
                      <li>Verifique se a chave de API do Google Maps está correta</li>
                      <li>Confirme se a API Static Maps está habilitada no console do Google</li>
                      <li>Verifique as restrições de domínio/IP na chave de API</li>
                      <li>Confirme se há crédito/cota disponível na sua conta Google Cloud</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <Alert variant="default" className="bg-green-50 border-green-200">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Configuração carregada</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Se o mapa aparecer abaixo, a configuração está correta.
                  </AlertDescription>
                </Alert>
                
                <div className="relative w-full h-[300px] rounded-md overflow-hidden bg-gray-100 border">
                  <div className="absolute inset-0 flex items-center justify-center opacity-60">
                    <MapPin className="h-12 w-12 text-primary" />
                    <span className="ml-2 text-gray-700 font-medium">
                      {locationInput.substring(0, 30)}...
                    </span>
                  </div>
                  <img 
                    src={mapUrl}
                    alt="Mapa de teste"
                    className="w-full h-full object-cover"
                    onError={handleMapError}
                    onLoad={() => {
                      setHasError(false);
                      setErrorMessage("");
                    }}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Coordenadas:</p>
                    <code className="text-xs bg-muted p-1 rounded">{coordsInput}</code>
                  </div>
                  <div>
                    <p className="font-medium">Localização:</p>
                    <p className="text-xs text-gray-600">{locationInput}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}