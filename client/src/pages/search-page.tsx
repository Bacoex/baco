import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/ui/header";
import NetworkBackground from "@/components/ui/network-background";
import EventCard from "@/components/ui/event-card";
import { Card } from "@/components/ui/card";
import { logError, ErrorSeverity } from "@/lib/errorLogger";

/**
 * Componente da página de pesquisa
 * Mostra os resultados da pesquisa com base na query string
 */
export default function SearchPage() {
  // Obtém a localização atual e o parâmetro de pesquisa
  const [location] = useLocation();
  console.log("SearchPage: URL completa:", location);
  
  // Usando window.location para obter parâmetros da URL
  // Implementação mais robusta para obter o parâmetro de pesquisa
  let searchQuery = "";
  
  try {
    // Tenta obter da URL atual usando new URL()
    const urlCompleta = window.location.href;
    console.log("SearchPage: URL completa com janela:", urlCompleta);
    const url = new URL(urlCompleta);
    searchQuery = url.searchParams.get("q") || "";
  } catch (error) {
    // Fallback: extrai manualmente da query string
    console.log("Erro ao parsear URL, usando método alternativo");
    const queryString = window.location.search;
    const params = new URLSearchParams(queryString);
    searchQuery = params.get("q") || "";
  }
  
  console.log("SearchPage: Parâmetro de pesquisa obtido:", searchQuery);
  
  // Estado para armazenar os resultados da pesquisa
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  
  // Efeito para buscar resultados quando o termo de pesquisa mudar
  useEffect(() => {
    async function fetchSearchResults() {
      if (!searchQuery) {
        setSearchResults([]);
        return;
      }
      
      setIsLoading(true);
      setIsError(false);
      
      try {
        const searchUrl = `/api/search?q=${encodeURIComponent(searchQuery)}`;
        console.log("SearchPage: Fazendo requisição para:", searchUrl);
        
        const response = await fetch(searchUrl);
        
        const responseText = await response.text();
        console.log("SearchPage: Resposta bruta:", responseText);
        
        // Tentar parsear a resposta como JSON
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          const errorMsg = `Erro ao parsear resposta JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`;
          console.error("SearchPage:", errorMsg, "Resposta bruta:", responseText);
          logError(errorMsg, ErrorSeverity.ERROR, {
            component: "SearchPage",
            context: "JSON.parse",
            error: parseError instanceof Error ? parseError : new Error(String(parseError)),
            additionalData: { 
              searchQuery, 
              responseStatus: response.status,
              responseText: responseText.substring(0, 500) 
            }
          });
          throw new Error(errorMsg);
        }
        
        if (!response.ok) {
          const errorMsg = `Erro na requisição: ${response.status}`;
          logError(errorMsg, ErrorSeverity.ERROR, {
            component: "SearchPage",
            context: "API",
            additionalData: { 
              searchQuery, 
              responseStatus: response.status,
              responseData: data 
            }
          });
          throw new Error(errorMsg);
        }
        
        console.log("SearchPage: Resultados recebidos:", data);
        
        // Verificar se resposta é um array válido
        if (Array.isArray(data)) {
          setSearchResults(data);
          console.log("SearchPage: Resultados válidos recebidos:", data.length);
        } else {
          const errorMsg = "Resposta da API não é um array";
          console.warn("SearchPage:", errorMsg, data);
          logError(errorMsg, ErrorSeverity.WARNING, {
            component: "SearchPage",
            context: "Validação",
            additionalData: { 
              searchQuery, 
              responseType: typeof data,
              responseData: JSON.stringify(data).substring(0, 500)
            }
          });
          setSearchResults([]);
        }
      } catch (error) {
        const errorMsg = `Erro na busca: ${error instanceof Error ? error.message : String(error)}`;
        console.error("SearchPage:", errorMsg);
        logError(errorMsg, ErrorSeverity.ERROR, {
          component: "SearchPage",
          context: "fetchSearchResults",
          error: error instanceof Error ? error : new Error(String(error)),
          additionalData: { searchQuery }
        });
        setIsError(true);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchSearchResults();
  }, [searchQuery]);

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
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
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
              ) : searchResults.length === 0 ? (
                <Card className="p-8 text-center border-dashed border-gray-700 bg-black/30 backdrop-blur-sm">
                  <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
                  <p className="text-muted-foreground">
                    Não foram encontrados eventos correspondentes à sua pesquisa.
                    Tente usar termos diferentes ou mais gerais.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.map((event: any) => (
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