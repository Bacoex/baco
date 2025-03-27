import { useState } from "react";
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

  // Busca eventos usando a API de pesquisa
  const searchResultsQuery = useQuery({
    queryKey: ["/api/search", searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      
      try {
        console.log("Realizando pesquisa para:", searchQuery);
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        
        if (!res.ok) {
          throw new Error(`Erro ao pesquisar: ${res.status}`);
        }
        
        const data = await res.json();
        console.log("Resultados da pesquisa:", data);
        return data;
      } catch (error) {
        console.error("Erro na pesquisa:", error);
        throw error;
      }
    },
    enabled: !!searchQuery,
    initialData: []
  });

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
          
          {searchResultsQuery.isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : searchResultsQuery.isError ? (
            <Card className="p-8 text-center border-dashed border-gray-700 bg-black/30 backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-2 text-red-500">Erro na pesquisa</h3>
              <p className="text-muted-foreground">
                Ocorreu um erro ao realizar a pesquisa. Por favor, tente novamente mais tarde.
              </p>
            </Card>
          ) : (
            <>
              {!searchQuery ? (
                <Card className="p-8 text-center border-dashed border-gray-700 bg-black/30 backdrop-blur-sm">
                  <h3 className="text-lg font-semibold mb-2">Digite um termo para pesquisar</h3>
                  <p className="text-muted-foreground">
                    Use a barra de pesquisa para encontrar eventos de seu interesse.
                  </p>
                </Card>
              ) : searchResultsQuery.data.length === 0 ? (
                <Card className="p-8 text-center border-dashed border-gray-700 bg-black/30 backdrop-blur-sm">
                  <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
                  <p className="text-muted-foreground">
                    Não foram encontrados eventos correspondentes à sua pesquisa.
                    Tente usar termos diferentes ou mais gerais.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResultsQuery.data.map((event: any) => (
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