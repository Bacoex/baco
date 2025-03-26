import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/ui/header";
import EventCard from "@/components/ui/event-card";
import CategoryFilter from "@/components/ui/category-filter";
import CreateEventModal from "@/components/ui/create-event-modal";
import { Button } from "@/components/ui/button";
import { PlusIcon, Loader2 } from "lucide-react";
import { EventCategory, Event } from "@shared/schema";

/**
 * Componente de rede com pontos se conectando
 * Cria um efeito visual de nós conectados em uma rede
 */
function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Redimensionar o canvas para ocupar toda a tela
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Definir pontos na rede
    const pointCount = 60;
    const points: { x: number; y: number; dx: number; dy: number; radius: number; }[] = [];
    
    for (let i = 0; i < pointCount; i++) {
      points.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        dx: (Math.random() - 0.5) * 0.5,
        dy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 1.5 + 0.5,
      });
    }
    
    // Função para desenhar a rede
    const drawNetwork = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Desenhar pontos
      for (let i = 0; i < pointCount; i++) {
        const point = points[i];
        
        // Atualizar posição
        point.x += point.dx;
        point.y += point.dy;
        
        // Rebater nas bordas
        if (point.x < 0 || point.x > canvas.width) point.dx *= -1;
        if (point.y < 0 || point.y > canvas.height) point.dy *= -1;
        
        // Desenhar ponto
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fill();
        
        // Desenhar linhas conectando pontos próximos
        for (let j = i + 1; j < pointCount; j++) {
          const otherPoint = points[j];
          const distance = Math.sqrt(
            Math.pow(point.x - otherPoint.x, 2) + Math.pow(point.y - otherPoint.y, 2)
          );
          
          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(otherPoint.x, otherPoint.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.05 - distance / 3000})`;
            ctx.lineWidth = 0.3;
            ctx.stroke();
          }
        }
      }
      
      requestAnimationFrame(drawNetwork);
    };
    
    const animationId = requestAnimationFrame(drawNetwork);
    
    // Limpar evento e animação ao desmontar
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full z-0 bg-transparent pointer-events-none"
    />
  );
}

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
    <div className="flex flex-col min-h-screen bg-black">
      {/* Fundo animado com rede de pontos */}
      <NetworkBackground />
      
      {/* Cabeçalho com barra de pesquisa e perfil */}
      <Header />
      
      {/* Conteúdo principal com eventos */}
      <main className="flex-grow px-4 pb-20 pt-28 relative z-10">
        <div className="container mx-auto">
          {/* Título da seção */}
          <div className="text-center py-6">
            <h2 className="text-3xl font-bold mb-2 inline-block text-white">
              {selectedCategory 
                ? `Eventos de ${categoriesQuery.data?.find(c => c.slug === selectedCategory)?.name || selectedCategory}` 
                : "Eventos em destaque"}
            </h2>
            <div className="mx-auto w-32 h-0.5 bg-primary rounded-full"></div>
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
      <div className="fixed bottom-8 right-8">
        <button 
          onClick={openCreateModal}
          className="bg-black hover:bg-black/80 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300"
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
