import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { Input } from './input';
import { Button } from './button';
import { Search, X, Navigation, Loader2 } from 'lucide-react';

// Definir estilos do mapa para a identidade visual do Baco
const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem'
};

// Centro inicial do mapa (Brasil)
const defaultCenter = {
  lat: -15.77972,
  lng: -47.92972
};

// Opções do mapa
const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
};

// Definir as bibliotecas como constante para evitar recriação a cada renderização
const libraries = ['places'];

interface LocationMapSelectorProps {
  onLocationSelect: (location: string, coordinates: string) => void;
  initialLocation?: string;
}

export function LocationMapSelector({ onLocationSelect, initialLocation }: LocationMapSelectorProps) {
  const [searchQuery, setSearchQuery] = useState(initialLocation || '');
  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>(initialLocation || '');
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Carregar a API do Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // Inicializar o geocoder quando a API estiver carregada
  useEffect(() => {
    if (isLoaded && !geocoderRef.current) {
      geocoderRef.current = new window.google.maps.Geocoder();
    }
  }, [isLoaded]);

  // Geocodificar o endereço quando o usuário pesquisar
  const handleSearch = useCallback(() => {
    if (!isLoaded || !geocoderRef.current || !searchQuery) return;

    setIsSearching(true);
    setErrorMessage(null);

    geocoderRef.current.geocode({ address: searchQuery }, (results, status) => {
      setIsSearching(false);

      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        const newPosition = {
          lat: location.lat(),
          lng: location.lng()
        };
        
        setMarkerPosition(newPosition);
        setSelectedAddress(results[0].formatted_address);
        
        // Centralizar o mapa na nova posição
        if (mapRef.current) {
          mapRef.current.panTo(newPosition);
          mapRef.current.setZoom(15);
        }
      } else {
        setErrorMessage('Não foi possível encontrar este endereço. Tente novamente.');
      }
    });
  }, [isLoaded, searchQuery]);

  // Lidar com clique no mapa para definir marcador
  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (!event.latLng || !geocoderRef.current) return;

    const clickedPosition = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng()
    };

    setMarkerPosition(clickedPosition);
    
    // Geocodificar a posição reversa para obter o endereço
    geocoderRef.current.geocode({ location: clickedPosition }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        setSelectedAddress(results[0].formatted_address);
        setSearchQuery(results[0].formatted_address);
      } else {
        setSelectedAddress(`${clickedPosition.lat.toFixed(6)}, ${clickedPosition.lng.toFixed(6)}`);
      }
    });
  }, []);

  // Referência para o mapa carregado
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Lidar com a confirmação da seleção
  const handleConfirmLocation = useCallback(() => {
    if (markerPosition && selectedAddress) {
      const coordinates = `${markerPosition.lat},${markerPosition.lng}`;
      onLocationSelect(selectedAddress, coordinates);
    }
  }, [markerPosition, selectedAddress, onLocationSelect]);

  // Tentar localizar a posição atual do usuário
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          setMarkerPosition(currentPosition);
          
          // Centralizar mapa e buscar endereço
          if (mapRef.current) {
            mapRef.current.panTo(currentPosition);
            mapRef.current.setZoom(15);
          }
          
          // Geocodificar para obter o endereço
          if (geocoderRef.current) {
            geocoderRef.current.geocode({ location: currentPosition }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                setSelectedAddress(results[0].formatted_address);
                setSearchQuery(results[0].formatted_address);
              } else {
                setSelectedAddress(`${currentPosition.lat.toFixed(6)}, ${currentPosition.lng.toFixed(6)}`);
              }
            });
          }
        },
        (error) => {
          setErrorMessage(`Erro ao obter localização: ${error.message}`);
        }
      );
    } else {
      setErrorMessage('Geolocalização não é suportada pelo seu navegador');
    }
  };

  // Função para lidar com tecla Enter na busca
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearch();
    }
  };

  if (loadError) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md text-red-500">
        <p>Erro ao carregar o mapa. Por favor, tente novamente mais tarde.</p>
        <p className="text-xs mt-1">{loadError.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-grow">
          <Input
            placeholder="Digite um endereço para pesquisar"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pr-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleSearch}
          disabled={isSearching || !searchQuery}
        >
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleUseCurrentLocation}
          title="Usar minha localização atual"
        >
          <Navigation className="h-4 w-4" />
        </Button>
      </div>

      {errorMessage && (
        <div className="text-sm text-red-500 p-2 bg-red-50 rounded border border-red-200">
          {errorMessage}
        </div>
      )}

      <div className="rounded-md overflow-hidden border">
        {!isLoaded ? (
          <div className="flex items-center justify-center bg-slate-100" style={mapContainerStyle}>
            <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={markerPosition || defaultCenter}
            zoom={markerPosition ? 15 : 4}
            options={mapOptions}
            onClick={handleMapClick}
            onLoad={onMapLoad}
          >
            {markerPosition && <Marker position={markerPosition} />}
          </GoogleMap>
        )}
      </div>

      {selectedAddress && (
        <div className="p-2 bg-orange-50 border border-orange-200 rounded-md">
          <p className="text-sm font-medium">Endereço selecionado:</p>
          <p className="text-sm">{selectedAddress}</p>
        </div>
      )}

      <Button
        type="button"
        className="w-full bg-orange-500 text-white hover:bg-orange-600 mt-2"
        onClick={handleConfirmLocation}
        disabled={!markerPosition}
      >
        Confirmar Localização
      </Button>
    </div>
  );
}