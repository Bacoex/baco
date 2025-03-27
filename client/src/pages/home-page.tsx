import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/ui/header";
import EventCard from "@/components/ui/event-card";
import CategoryFilter from "@/components/ui/category-filter";
import CreateEventModal from "@/components/ui/create-event-modal";
import NetworkBackground from "@/components/ui/network-background";
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
      
      {/* Conteúdo principal com eventos */}
      <main className="flex-grow px-4 pb-20 pt-28 relative z-10">
        <div className="container mx-auto">
          {/* Filtro de categorias */}
          <div className="mb-6 bg-black border border-gray-800 rounded-lg overflow-hidden">
            <CategoryFilter
              categories={categoriesQuery.data || []}
              selectedCategory={selectedCategory}
              onSelectCategory={handleCategorySelect}
            />
          </div>
          
          {/* Título da seção */}
          <div className="text-center py-4">
            <h2 className="text-xl font-semibold mb-2 inline-block text-white">
              {selectedCategory 
                ? `Eventos de ${categoriesQuery.data?.find(c => c.slug === selectedCategory)?.name || selectedCategory}` 
                : "Eventos em destaque"}
            </h2>
            <div className="mx-auto w-24 h-0.5 bg-primary rounded-full"></div>
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
      
      {/* Botão flutuante para criar evento */}
      <div className="fixed bottom-8 right-8 z-20">
        <button 
          onClick={openCreateModal}
          className="bg-orange-500 hover:bg-orange-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 transform hover:scale-105"
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
    </div>
  );
}
