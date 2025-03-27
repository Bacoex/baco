import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Header } from "@/components/ui/header";
import EventCard from "@/components/ui/event-card";
import CategoryFilter from "@/components/ui/category-filter";
import CreateEventModal from "@/components/ui/create-event-modal";
import ViewEventModal from "@/components/ui/view-event-modal";
import NetworkBackground from "@/components/ui/network-background";
import { SearchBar } from "@/components/ui/search-bar";
import { Button } from "@/components/ui/button";
import { PlusIcon, Loader2 } from "lucide-react";
import { EventCategory, Event } from "@shared/schema";

/**
 * Componente da página inicial
 * Exibe a lista de eventos e permite filtragem por categoria
 */
export default function HomePage() {
  // Estado para controlar o modal de criação de evento
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Estado para controlar a categoria selecionada
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Estado para controlar o modal de visualização de evento via compartilhamento
  const [sharedEventId, setSharedEventId] = useState<number | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [sharedEvent, setSharedEvent] = useState<Event | null>(null);
  
  // Usar o hook useLocation para obter a URL atual
  const [location] = useLocation();
  
  // Processar parâmetros de URL para abrir eventos compartilhados
  useEffect(() => {
    // Extrair parâmetros da URL
    const params = new URLSearchParams(window.location.search);
    const modal = params.get('modal');
    const eventId = params.get('eventId');
    
    // Se houver um modal de evento para exibir
    if (modal === 'event' && eventId) {
      const id = parseInt(eventId);
      if (!isNaN(id)) {
        setSharedEventId(id);
        
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
  const categoriesQuery = useQuery<EventCategory[]>({
    queryKey: ["/api/categories"],
    initialData: [],
    onSuccess: (data) => {
      console.log("Categorias disponíveis:", data);
    },
    onError: (error) => {
      console.error("Erro ao buscar categorias:", error);
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0
  });
  
  // Busca todos os eventos com possível filtro de categoria
  const eventsQuery = useQuery<Event[]>({
    queryKey: ["/api/events", selectedCategory],
    refetchOnWindowFocus: false,
    staleTime: 30000,
    retry: 3,
    onSuccess: (data) => {
      console.log("Eventos disponíveis:", data);
    },
    onError: (error) => {
      console.error("Erro ao buscar eventos:", error);
    }
  });
  
  // Função para abrir o modal de criação de evento
  const openCreateModal = () => setIsCreateModalOpen(true);
  
  // Função para fechar o modal de criação de evento
  const closeCreateModal = () => setIsCreateModalOpen(false);
  
  // Função para selecionar uma categoria
  const handleCategorySelect = (slug: string | null) => {
    setSelectedCategory(slug);
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Fundo animado com rede de pontos */}
      <NetworkBackground />
      
      {/* Cabeçalho com barra de pesquisa e perfil */}
      <Header />
      
      {/* Filtro de categorias flutuante */}
      <div className="relative pt-24">
        <CategoryFilter
          categories={categoriesQuery.data || []}
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
        />
      </div>
      
      {/* Conteúdo principal com eventos */}
      <main className="flex-grow px-4 pb-20 relative z-10">
        <div className="container mx-auto">
          
          {/* Título da seção */}
          <div className="text-center pb-6">
            <h2 className="text-xl font-semibold inline-block text-white">
              {selectedCategory 
                ? `Eventos de ${categoriesQuery.data?.find(c => c.slug === selectedCategory)?.name || selectedCategory}` 
                : "Eventos em destaque"}
            </h2>
            <div className="mx-auto w-24 h-0.5 bg-primary rounded-full mt-2"></div>
          </div>
          
          {/* Grade de eventos */}
          {eventsQuery.isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : eventsQuery.isError ? (
            <div className="text-center p-4 text-red-400">
              Erro ao carregar eventos
            </div>
          ) : eventsQuery.data?.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-gray-700 rounded-lg bg-black/50 backdrop-blur-sm">
              <p className="text-lg text-gray-300">Nenhum evento encontrado.</p>
              <p className="text-md text-gray-400 mt-2">
                Que tal ser o primeiro a criar um evento?
              </p>
              <Button onClick={openCreateModal} className="mt-4 bg-primary hover:bg-primary/90">
                Criar Evento
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {eventsQuery.data?.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </main>
      
      {/* Barra de pesquisa flutuante na parte inferior */}
      <SearchBar />
      
      {/* Botão flutuante para criar evento */}
      <div className="fixed bottom-24 right-8 z-20">
        <button 
          onClick={openCreateModal}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 transform hover:scale-105"
          aria-label="Criar novo evento"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      </div>
      
      {/* Modal para criar evento */}
      <CreateEventModal 
        isOpen={isCreateModalOpen} 
        onClose={closeCreateModal}
        categories={categoriesQuery.data || []}
      />
      
      {/* Modal para visualizar evento compartilhado */}
      {sharedEvent && (
        <ViewEventModal
          event={sharedEvent}
          isOpen={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSharedEvent(null);
            
            // Remover parâmetros da URL para evitar que o modal reabra
            const url = new URL(window.location.href);
            url.searchParams.delete('modal');
            url.searchParams.delete('eventId');
            window.history.replaceState({}, '', url.toString());
          }}
        />
      )}
    </div>
  );
}
