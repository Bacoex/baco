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
    <Card className="overflow-hidden hover:shadow-lg transition duration-200">
      <div className="relative h-48">
        <img 
          src={imageSrc}
          alt={event.name} 
          className="w-full h-full object-cover"
        />
        <div 
          className="absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded"
          style={{ backgroundColor: event.category.color }}
        >
          {event.category.name}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">{event.name}</h3>
        
        <div className="flex items-center mb-2">
          <MapPinIcon className="text-gray-500 h-4 w-4 mr-1" />
          <p className="text-gray-600 text-sm">{event.location}</p>
        </div>
        
        <div className="flex items-center mb-3">
          <CalendarIcon className="text-gray-500 h-4 w-4 mr-1" />
          <p className="text-gray-600 text-sm">{formatDate(event.date)}, {event.time}</p>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-primary font-medium">{formatPrice(event.price)}</span>
          <Button 
            size="sm" 
            className="rounded-full"
            variant="secondary"
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
