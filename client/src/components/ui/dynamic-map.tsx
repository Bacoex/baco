import { useEffect, useRef, useState } from "react";
import { Loader } from "lucide-react";

interface DynamicMapProps {
  coordinates: string;
  height?: string;
  width?: string;
  zoom?: number;
  title?: string;
}

/**
 * Componente de mapa dinâmico que carrega a API JavaScript do Google Maps
 * Este componente é mais interativo que o mapa estático
 */
export default function DynamicMap({ 
  coordinates, 
  height = "120px", 
  width = "100%", 
  zoom = 14,
  title = "Localização do evento" 
}: DynamicMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  // Inicializar o mapa quando o componente for montado
  useEffect(() => {
    // Verificar se coordenadas estão presentes e válidas
    if (!coordinates || coordinates.trim() === "") {
      setError("Coordenadas não fornecidas");
      setLoading(false);
      return;
    }

    // Parse de coordenadas
    const [latStr, lngStr] = coordinates.split(",");
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      setError("Coordenadas inválidas");
      setLoading(false);
      return;
    }

    // Verificar se o script do Google Maps já foi carregado
    if (!window.google || !window.google.maps) {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
      
      if (!apiKey) {
        setError("Chave de API do Google Maps não configurada");
        setLoading(false);
        return;
      }

      // Carregar o script do Google Maps
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        setError("Erro ao carregar o Google Maps");
        setLoading(false);
      };
      script.onload = () => initializeMap(lat, lng);
      
      document.head.appendChild(script);
      return () => {
        // Remover script ao desmontar
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    } else {
      // Se o script já estiver carregado, inicializar o mapa
      initializeMap(lat, lng);
    }
  }, [coordinates]);

  // Função para inicializar o mapa
  const initializeMap = (lat: number, lng: number) => {
    if (!mapRef.current) return;

    try {
      const position = { lat, lng };
      const map = new google.maps.Map(mapRef.current, {
        center: position,
        zoom: zoom,
        disableDefaultUI: true, // Interface de usuário simplificada
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      });

      // Adicionar marcador
      new google.maps.Marker({
        position,
        map,
        title
      });

      setMapInstance(map);
      setLoading(false);
    } catch (err) {
      console.error("Erro ao inicializar o mapa", err);
      setError("Erro ao inicializar o mapa");
      setLoading(false);
    }
  };

  // Ajustar centro do mapa quando as coordenadas mudarem
  useEffect(() => {
    if (!mapInstance || !coordinates) return;

    const [latStr, lngStr] = coordinates.split(",");
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) return;

    const position = { lat, lng };
    mapInstance.setCenter(position);

    // Tentar encontrar marcadores existentes no mapa
    // Esta é uma abordagem mais segura que não depende de propriedades não documentadas
    // Criamos um novo marcador quando necessário
    new google.maps.Marker({
      position,
      map: mapInstance,
      title
    });
  }, [coordinates, mapInstance, title]);

  return (
    <div 
      style={{ 
        position: "relative", 
        height, 
        width, 
        borderRadius: "0.375rem", 
        overflow: "hidden" 
      }}
    >
      {loading && (
        <div 
          style={{ 
            position: "absolute", 
            inset: 0, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            backgroundColor: "#f3f4f6"
          }}
        >
          <Loader className="h-6 w-6 animate-spin text-primary/70" />
        </div>
      )}
      
      {error && (
        <div 
          style={{ 
            position: "absolute", 
            inset: 0, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            backgroundColor: "#f3f4f6",
            padding: "1rem",
            textAlign: "center",
            color: "#ef4444",
            fontSize: "0.875rem"
          }}
        >
          {error}
        </div>
      )}
      
      <div 
        ref={mapRef} 
        style={{ 
          height: "100%", 
          width: "100%",
          visibility: loading || error ? "hidden" : "visible" 
        }}
      />
    </div>
  );
}