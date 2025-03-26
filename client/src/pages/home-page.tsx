import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/ui/header";
import EventCard from "@/components/ui/event-card";
import CategoryFilter from "@/components/ui/category-filter";
import CreateEventModal from "@/components/ui/create-event-modal";
import { Button } from "@/components/ui/button";
import { PlusIcon, Loader2 } from "lucide-react";

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
  const categoriesQuery = useQuery({
    queryKey: ["/api/categories"],
  });
  
  // Busca todos os eventos com possível filtro de categoria
  const eventsQuery = useQuery({
    queryKey: ["/api/events", selectedCategory && `?category=${selectedCategory}`],
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
    <div className="flex flex-col min-h-screen">
      {/* Cabeçalho com barra de pesquisa e perfil */}
      <Header />
      
      {/* Filtro de categorias */}
      <div className="pt-32">
        {categoriesQuery.isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : categoriesQuery.isError ? (
          <div className="text-center p-4 text-destructive">
            Erro ao carregar categorias
          </div>
        ) : (
          <CategoryFilter 
            categories={categoriesQuery.data || []} 
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
          />
        )}
      </div>
      
      {/* Conteúdo principal com eventos */}
      <main className="flex-grow px-4 pb-20">
        <div className="container mx-auto">
          {/* Título da seção */}
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {selectedCategory 
              ? `Eventos de ${categoriesQuery.data?.find(c => c.slug === selectedCategory)?.name || selectedCategory}` 
              : "Eventos em destaque"}
          </h2>
          
          {/* Grade de eventos */}
          {eventsQuery.isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : eventsQuery.isError ? (
            <div className="text-center p-4 text-destructive">
              Erro ao carregar eventos
            </div>
          ) : eventsQuery.data?.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-lg">
              <p className="text-lg text-gray-500">Nenhum evento encontrado.</p>
              <p className="text-md text-gray-400 mt-2">
                Que tal ser o primeiro a criar um evento?
              </p>
              <Button onClick={openCreateModal} className="mt-4">
                Criar Evento
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {eventsQuery.data?.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </main>
      
      {/* Botão flutuante para criar evento */}
      <div className="fixed bottom-8 left-8">
        <button 
          onClick={openCreateModal}
          className="bg-primary text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-primary-700 transition-all duration-300 animate-float"
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
