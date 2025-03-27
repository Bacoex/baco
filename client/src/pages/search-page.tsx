import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/ui/header";
import NetworkBackground from "@/components/ui/network-background";
import EventCard from "@/components/ui/event-card";
import { Card } from "@/components/ui/card";

/**
 * Componente da página de pesquisa
 * Mostra os resultados da pesquisa com base na query string
 */
export default function SearchPage() {
  // Obtém a localização atual e o parâmetro de pesquisa
  const [location] = useLocation();
  const queryParams = new URLSearchParams(location.split("?")[1]);
  const searchQuery = queryParams.get("q") || "";

  // Estado para guardar os resultados da pesquisa
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);

  // Busca todos os eventos
  const eventsQuery = useQuery({
    queryKey: ["/api/events"],
    initialData: [],
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      console.log("Eventos recuperados para pesquisa:", data);
    },
    onError: (error) => {
      console.error("Erro ao buscar eventos para pesquisa:", error);
    }
  });

  // Filtra os eventos com base na pesquisa
  useEffect(() => {
    if (eventsQuery.data && searchQuery) {
      // Normaliza a string para pesquisa (remove acentos, converte para lowercase)
      const normalizedQuery = searchQuery.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      const filtered = eventsQuery.data.filter((event: any) => {
        // Normaliza o nome do evento (verificando se existe)
        const normalizedName = event.name 
          ? event.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          : "";
        
        // Normaliza a descrição do evento (verificando se existe)
        const normalizedDescription = event.description 
          ? event.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          : "";
        
        // Normaliza a localização do evento (verificando se existe)
        const normalizedLocation = event.location 
          ? event.location.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          : "";
        
        // Verifica se o termo de pesquisa está presente em algum dos campos
        return (
          normalizedName.includes(normalizedQuery) ||
          normalizedDescription.includes(normalizedQuery) ||
          normalizedLocation.includes(normalizedQuery)
        );
      });
      
      setFilteredEvents(filtered);
    }
  }, [eventsQuery.data, searchQuery]);

  return (
    <div className="flex flex-col min-h-screen bg-black">
      <NetworkBackground />
      <Header />
      
      <main className="flex-grow px-4 pb-20 pt-28 relative z-10">
        <div className="container mx-auto">
          <div className="text-center py-4">
            <h2 className="text-xl font-semibold mb-2 inline-block text-white">
              Resultados para: <span className="text-primary">"{searchQuery}"</span>
            </h2>
            <div className="mx-auto w-24 h-0.5 bg-primary rounded-full"></div>
          </div>
          
          {eventsQuery.isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {filteredEvents.length === 0 ? (
                <Card className="p-8 text-center border-dashed border-gray-700 bg-black/30 backdrop-blur-sm">
                  <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
                  <p className="text-muted-foreground">
                    Não foram encontrados eventos correspondentes à sua pesquisa.
                    Tente usar termos diferentes ou mais gerais.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}