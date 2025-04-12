import { useState } from "react";
import DynamicMap from "@/components/ui/dynamic-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function MapDebugPage() {
  const [coordinates, setCoordinates] = useState("-22.3543199,-48.9596194");
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "");
  const { toast } = useToast();

  const handleTestMap = () => {
    try {
      // Validar coordenadas
      const [latStr, lngStr] = coordinates.split(",");
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      
      if (isNaN(lat) || isNaN(lng)) {
        setError("Coordenadas inválidas. Use o formato: latitude,longitude");
        return;
      }
      
      // Coordenadas válidas
      setError(null);
      toast({
        title: "Teste iniciado",
        description: "Testando mapa com as coordenadas fornecidas",
      });
    } catch (err) {
      setError("Erro ao processar coordenadas: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="container py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6">Ferramenta de Debug de Mapas</h1>
      
      <Tabs defaultValue="dynamic">
        <TabsList className="mb-4 grid w-full grid-cols-3">
          <TabsTrigger value="dynamic">Mapa Dinâmico</TabsTrigger>
          <TabsTrigger value="static">Mapa Estático</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dynamic">
          <Card>
            <CardHeader>
              <CardTitle>Teste de Mapa Dinâmico</CardTitle>
              <CardDescription>
                Teste o componente DynamicMap que utiliza a API JavaScript do Google Maps
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="col-span-3">
                  <label className="text-sm font-medium mb-1 block">Coordenadas (latitude,longitude)</label>
                  <Input 
                    value={coordinates} 
                    onChange={(e) => setCoordinates(e.target.value)}
                    placeholder="-22.3543199,-48.9596194" 
                  />
                </div>
                <Button onClick={handleTestMap}>Testar Mapa</Button>
              </div>
              
              {error && (
                <div className="p-3 rounded bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}
              
              <div className="p-4 rounded-md border">
                <h3 className="text-lg font-semibold mb-2">Preview do Mapa</h3>
                <div className="rounded-md overflow-hidden">
                  <DynamicMap coordinates={coordinates} height="300px" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="text-sm text-muted-foreground">
                Chave API: {apiKey ? apiKey.substring(0, 10) + "..." : "Não configurada"}
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="static">
          <Card>
            <CardHeader>
              <CardTitle>Teste de Mapa Estático</CardTitle>
              <CardDescription>
                Teste o mapa estático que utiliza a API Static Maps do Google
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="col-span-3">
                  <label className="text-sm font-medium mb-1 block">Coordenadas (latitude,longitude)</label>
                  <Input 
                    value={coordinates} 
                    onChange={(e) => setCoordinates(e.target.value)}
                    placeholder="-22.3543199,-48.9596194" 
                  />
                </div>
                <Button onClick={handleTestMap}>Testar Mapa</Button>
              </div>
              
              {error && (
                <div className="p-3 rounded bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}
              
              <div className="p-4 rounded-md border">
                <h3 className="text-lg font-semibold mb-2">Preview do Mapa Estático</h3>
                <div className="rounded-md overflow-hidden">
                  <img 
                    src={`https://maps.googleapis.com/maps/api/staticmap?center=${coordinates}&zoom=14&size=800x300&markers=color:red%7C${coordinates}&key=${apiKey}`}
                    alt="Mapa estático do Google"
                    className="w-full h-[300px] object-cover"
                    onError={(e) => {
                      console.log("Erro ao carregar imagem do mapa estático");
                      e.currentTarget.style.display = 'none';
                      setError("Erro ao carregar mapa estático. Verifique a chave API e as permissões.");
                    }}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="text-sm text-muted-foreground">
                Chave API: {apiKey ? apiKey.substring(0, 10) + "..." : "Não configurada"}
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configuração do Mapa</CardTitle>
              <CardDescription>
                Configurações e informações de diagnóstico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Chave API do Google Maps</label>
                <Input 
                  value={apiKey} 
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza..." 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Obs: Esta alteração é temporária e não afeta a variável de ambiente original
                </p>
              </div>
              
              <div className="p-4 rounded-md bg-muted">
                <h3 className="font-semibold">Diagnóstico</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  <li>
                    <span className="font-medium">Status da API: </span>
                    {apiKey ? (
                      <span className="text-green-600">Chave configurada</span>
                    ) : (
                      <span className="text-red-600">Chave não configurada</span>
                    )}
                  </li>
                  <li>
                    <span className="font-medium">Restrições de domínio: </span>
                    <span>Certifique-se de que o domínio do Replit está autorizado no Console do Google Cloud</span>
                  </li>
                  <li>
                    <span className="font-medium">APIs necessárias: </span>
                    <ul className="list-disc pl-5 mt-1">
                      <li>Maps JavaScript API</li>
                      <li>Maps Static API</li>
                      <li>Geocoding API</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => {
                toast({
                  title: "Configurações atualizadas",
                  description: "As configurações foram atualizadas temporariamente"
                });
              }}>
                Atualizar Configurações
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}