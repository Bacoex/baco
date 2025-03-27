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
  console.log("SearchPage: URL completa:", location);
  
  // O location vem apenas como "/search", então precisamos pegar a URL completa
  const urlCompleta = window.location.href;
  console.log("SearchPage: URL completa com janela:", urlCompleta);
  
  // Extrai o parâmetro de pesquisa da URL completa
  const url = new URL(urlCompleta);
  const searchQuery = url.searchParams.get("q") || "";
  console.log("SearchPage: Parâmetro de pesquisa:", searchQuery);
  
  // Para debugging
  useEffect(() => {
    console.log("SearchPage: Query da URL:", searchQuery);
  }, [searchQuery]);

  // Busca eventos usando a API de pesquisa
  const searchResultsQuery = useQuery({
    queryKey: [`/api/search?q=${encodeURIComponent(searchQuery)}`],
    enabled: !!searchQuery,
    refetchOnMount: true,
    retry: 1,
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