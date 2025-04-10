import { useState, useEffect } from 'react';
import { Button } from './button';
import { Card } from './card';
import { MapPin } from 'lucide-react';

/**
 * Componente de depuração para testar a funcionalidade do mapa estático
 * Mostra informações detalhadas sobre localização e coordenadas
 * e testa a renderização do mapa estático
 */
export default function MapDebug() {
  const [testLocation, setTestLocation] = useState("Alameda Jacu, 2 - Bauru, SP, 17037-260, Brazil");
  const [testCoordinates, setTestCoordinates] = useState("-22.3543372,-48.95975929999999");
  const [mapApiKey, setMapApiKey] = useState(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '');
  const [mapUrl, setMapUrl] = useState("");
  const [showMap, setShowMap] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const url = showMap && testCoordinates && testCoordinates.trim() !== ""
      ? `https://maps.googleapis.com/maps/api/staticmap?center=${testCoordinates}&zoom=14&size=400x200&markers=color:red%7C${testCoordinates}&key=${mapApiKey}`
      : "";
    setMapUrl(url);
  }, [testCoordinates, showMap, mapApiKey]);

  const testMapRendering = () => {
    setShowMap(true);
    setErrorMessage("");
  };

  const handleImageError = () => {
    setErrorMessage("Erro ao carregar imagem do mapa estático. Verifique as coordenadas e a chave API.");
  };

  return (
    <Card className="p-4 m-4 max-w-2xl">
      <h2 className="text-xl font-bold mb-4">Depuração do Mapa Estático</h2>
      
      <div className="space-y-4">
        <div>
          <p className="font-semibold">Localização de teste:</p>
          <input
            type="text"
            value={testLocation}
            onChange={(e) => setTestLocation(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <p className="font-semibold">Coordenadas de teste:</p>
          <input
            type="text"
            value={testCoordinates}
            onChange={(e) => setTestCoordinates(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <p className="font-semibold">Chave API Google Maps:</p>
          <input
            type="text"
            value={mapApiKey}
            onChange={(e) => setMapApiKey(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Chave API do Google Maps"
          />
        </div>
        
        <Button onClick={testMapRendering}>Testar Renderização do Mapa</Button>
        
        <div className="mt-4 border p-2 rounded">
          <h3 className="font-medium">Valores atuais:</h3>
          <p>Localização: {testLocation || "(vazio)"}</p>
          <p>Coordenadas: {testCoordinates || "(vazio)"}</p>
          <p>Tem chave API: {mapApiKey ? "Sim" : "Não"}</p>
          <p>Tem coordenadas válidas: {(testCoordinates && testCoordinates.trim() !== "") ? "Sim" : "Não"}</p>
          <p>Show Map: {showMap ? "Sim" : "Não"}</p>
        </div>
        
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {errorMessage}
          </div>
        )}
        
        {showMap && (
          <div className="mt-4">
            <p className="font-semibold">Resultado:</p>
            {testCoordinates && testCoordinates.trim() !== "" ? (
              <div className="relative w-full h-[200px] rounded-md overflow-hidden bg-gray-100">
                <img 
                  src={mapUrl}
                  alt="Mapa de teste"
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] bg-gray-100 rounded">
                <MapPin className="h-10 w-10 text-gray-400" />
                <span className="ml-2 text-gray-500">Coordenadas não disponíveis</span>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-4">
          <p className="font-semibold">URL do mapa completa:</p>
          <div className="p-2 bg-gray-100 rounded overflow-x-auto">
            <code className="text-xs whitespace-normal break-words">{mapUrl || "(não gerada)"}</code>
          </div>
        </div>
      </div>
    </Card>
  );
}