import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/ui/header";
import EventCard from "@/components/ui/event-card";
import CategoryFilter from "@/components/ui/category-filter";
import CreateEventModal from "@/components/ui/create-event-modal-final-2";
import ViewEventModal from "@/components/ui/view-event-modal";
import NetworkBackground from "@/components/ui/network-background";
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { PlusIcon, Loader2, FilterIcon } from "lucide-react";
import { EventCategory, Event } from "@shared/schema";
import { getQueryFn, queryClient } from "@/lib/queryClient";
import { FilterDialog, FilterOptions } from "@/components/ui/filter-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Componente da página inicial
 * Exibe a lista de eventos e permite filtragem por categoria
 */
export default function HomePage() {
  // Estados para controle dos modais e filtros
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [sharedEvent, setSharedEvent] = useState<Event | null>(null);
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({
    cities: [],
    subcategories: []
  });
  
  // Para obter a URL atual
  const [location] = useLocation();
  
  // Processar parâmetros de URL para abrir eventos compartilhados
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modal = params.get('modal');
    const eventId = params.get('eventId');
    
    if (modal === 'event' && eventId) {
      const id = parseInt(eventId);
      if (!isNaN(id)) {
        // Buscar os detalhes do evento
        fetch(`/api/events/${id}`)
          .then(res => {
            if (!res.ok) throw new Error("Evento não encontrado");
            return res.json();
          })
          .then(data => {
            setSharedEvent(data);
            setViewModalOpen(true);
          })
          .catch(error => {
            console.error("Erro ao buscar evento compartilhado:", error);
          });
      }
    }
  }, [location]);
  
  // Busca todas as categorias
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "returnNull" })
  });
  
  // Busca todos os eventos com possíveis filtros (categoria, cidade, subcategoria)
  const { 
    data: events = [], 
    isLoading: eventsLoading,
    isError: eventsError 
  } = useQuery({
    queryKey: ["/api/events", selectedCategory, activeFilters],
    queryFn: async ({ queryKey }) => {
      try {
        // Construir URL base com os parâmetros de filtro
        let url = "/api/events";
        const params = new URLSearchParams();
        
        // Adicionar categoria se selecionada
        if (selectedCategory) {
          params.append("category", selectedCategory);
        }
        
        // Adicionar cidades se filtradas (múltiplas)
        if (activeFilters.cities.length > 0) {
          activeFilters.cities.forEach(city => {
            params.append("city", city);
          });
        }
        
        // Adicionar subcategorias se filtradas (múltiplas)
        if (activeFilters.subcategories.length > 0) {
          activeFilters.subcategories.forEach(subcategoryId => {
            params.append("subcategory", subcategoryId.toString());
          });
        }
        
        // Adicionar parâmetros à URL se existirem
        const queryString = params.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
        
        console.log("Filtrando eventos com URL:", url);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Erro ao buscar eventos filtrados");
        }
        return await response.json();
      } catch (error) {
        console.error("Erro ao filtrar eventos:", error);
        return [];
      }
    },
    staleTime: 5 * 1000, // 5 segundos
  });
  
  // Funções auxiliares
  const openCreateModal = () => setIsCreateModalOpen(true);
  const closeCreateModal = () => setIsCreateModalOpen(false);
  const handleCategorySelect = (slug: string | null) => setSelectedCategory(slug);
  

  
  // Função para lidar com mudanças nos filtros
  const handleFilterChange = (filters: FilterOptions) => {
    setActiveFilters(filters);
  };
  
  // Não precisamos mais filtrar os eventos manualmente, pois a API já retorna os eventos filtrados
  
  // Fecha o modal de visualização de evento compartilhado
  const closeViewModal = () => {
    setViewModalOpen(false);
    setSharedEvent(null);
    
    // Remover parâmetros da URL para evitar que o modal reabra
    const url = new URL(window.location.href);
    url.searchParams.delete('modal');
    url.searchParams.delete('eventId');
    window.history.replaceState({}, '', url.toString());
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Fundo animado */}
      <NetworkBackground />
      
      {/* Cabeçalho */}
      <Header />
      
      {/* Filtro de categorias */}
      <div className="relative pt-24 w-full overflow-hidden">
        <CategoryFilter
          categories={categories as EventCategory[]}
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
        />
      </div>
      
      {/* Conteúdo principal */}
      <main className="flex-grow px-4 pb-20 relative z-10">
        <div className="container mx-auto">
          
          {/* Título da seção */}
          <div className="flex flex-col items-center pb-6">
            <div className="mb-2 flex items-center gap-3 justify-center">
              <h2 className="text-xl font-semibold inline-block text-white">
                {selectedCategory 
                  ? `Eventos de ${(categories as EventCategory[]).find(c => c.slug === selectedCategory)?.name || selectedCategory}` 
                  : "Eventos em destaque"}
              </h2>
            </div>
            <div className="mx-auto w-24 h-0.5 bg-primary rounded-full mt-1"></div>
          </div>
          
          {/* Grade de eventos */}
          {eventsLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : eventsError ? (
            <div className="text-center p-4 text-red-400">
              Erro ao carregar eventos
            </div>
          ) : (events as Event[]).length === 0 ? (
            <div className="text-center p-8 border border-dashed border-gray-700 rounded-lg bg-black/50 backdrop-blur-sm">
              <p className="text-lg text-gray-300">
                {(activeFilters.cities.length > 0 || activeFilters.subcategories.length > 0) 
                  ? "Nenhum evento encontrado com os filtros selecionados." 
                  : "Nenhum evento encontrado."}
              </p>
              <p className="text-md text-gray-400 mt-2">
                {(activeFilters.cities.length > 0 || activeFilters.subcategories.length > 0) 
                  ? <>Tente outros filtros ou <Button variant="link" className="p-0 h-auto text-primary" onClick={() => setActiveFilters({ cities: [], subcategories: [] })}>remova todos os filtros</Button>.</>
                  : "Que tal ser o primeiro a criar um evento?"}
              </p>
              {(activeFilters.cities.length === 0 && activeFilters.subcategories.length === 0) && (
                <Button onClick={openCreateModal} className="mt-4 bg-primary hover:bg-primary/90">
                  Criar Evento
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {(events as Event[]).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </main>
      
      {/* Barra de pesquisa com filtro */}
      <SearchBar
        filterButton={
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-white/70 hover:text-white">
                  <FilterDialog 
                    onFilterChange={handleFilterChange} 
                    categoryId={selectedCategory 
                      ? (categories as EventCategory[]).find(c => c.slug === selectedCategory)?.id 
                      : undefined
                    }
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Filtrar eventos por cidade ou subcategoria</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      />
      
      {/* Botão de criar evento */}
      <div className="fixed bottom-24 right-8 z-20">
        <button 
          onClick={openCreateModal}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 transform hover:scale-105"
          aria-label="Criar novo evento"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      </div>
      
      {/* Modais */}
      <CreateEventModal 
        isOpen={isCreateModalOpen} 
        setIsOpen={setIsCreateModalOpen}
        categories={categories as EventCategory[]}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/events"] });
        }}
      />
      
      {sharedEvent && (
        <ViewEventModal
          event={sharedEvent}
          isOpen={viewModalOpen}
          onClose={closeViewModal}
        />
      )}
    </div>
  );
}
