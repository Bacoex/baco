import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, MapPinIcon } from "lucide-react";

/**
 * Interface para os dados do evento
 */
interface EventProps {
  event: {
    id: number;
    name: string;
    date: string;
    time: string;
    location: string;
    price: number;
    image?: string;
    category: {
      name: string;
      color: string;
    };
  };
}

/**
 * Componente de card de evento
 * Exibe um evento com imagem, título, local, data e preço
 */
export default function EventCard({ event }: EventProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Formata a data para exibição
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
    });
  };
  
  // Formata o preço para exibição
  const formatPrice = (price: number) => {
    if (price === 0) return "Gratuito";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };
  
  // Mutação para participar do evento
  const participateMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/events/${event.id}/participate`);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Sua participação no evento foi confirmada.",
      });
      // Atualiza a lista de eventos
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao participar do evento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Imagem de fallback se não houver imagem do evento
  const imageSrc = event.image || "https://via.placeholder.com/500x250?text=Evento";
  
  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-primary/10 hover:border-primary/30 group transform hover:scale-[1.02]">
      <div className="relative h-48">
        <img 
          src={imageSrc}
          alt={event.name} 
          className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-50 group-hover:opacity-80 transition-all duration-300"></div>
        <div 
          className="absolute top-3 right-3 text-white text-xs font-bold px-3 py-1 rounded-full"
          style={{ backgroundColor: event.category.color }}
        >
          {event.category.name}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-lg font-bold text-white mb-1 drop-shadow-md line-clamp-2">{event.name}</h3>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center mb-2">
          <MapPinIcon className="text-primary h-4 w-4 mr-1" />
          <p className="text-gray-700 text-sm line-clamp-1">{event.location}</p>
        </div>
        
        <div className="flex items-center mb-3">
          <CalendarIcon className="text-primary h-4 w-4 mr-1" />
          <p className="text-gray-700 text-sm">{formatDate(event.date)}, {event.time}</p>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <span className="bg-gradient-to-r from-primary to-baco-blue bg-clip-text text-transparent font-semibold text-lg">{formatPrice(event.price)}</span>
          <Button 
            size="sm" 
            className="rounded-full bg-gradient-to-r from-primary to-baco-blue hover:from-baco-blue hover:to-primary text-white transition-all duration-300"
            onClick={() => participateMutation.mutate()}
            disabled={participateMutation.isPending}
          >
            {participateMutation.isPending ? "Aguarde..." : "Participar"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
