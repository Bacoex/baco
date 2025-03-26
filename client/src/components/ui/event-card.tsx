import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, MapPinIcon, CheckIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

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
      slug: string;
    };
  };
}

/**
 * Componente de card de evento
 * Exibe um evento com imagem, título, local, data e preço
 */
export default function EventCard({ event }: EventProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isParticipating, setIsParticipating] = useState(false);
  
  // Verifica se o usuário já está participando do evento
  const participationQuery = useQuery({
    queryKey: [`/api/events/${event.id}/participation`, user?.id],
    queryFn: async () => {
      if (!user) return null;
      try {
        const res = await fetch(`/api/events/${event.id}/participation`);
        if (!res.ok) return null;
        return await res.json();
      } catch (error) {
        return null;
      }
    },
    enabled: !!user,
  });
  
  // Atualiza o estado local quando a consulta de participação mudar
  useEffect(() => {
    setIsParticipating(!!participationQuery.data);
  }, [participationQuery.data]);
  
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
      setIsParticipating(true);
      toast({
        title: "Sucesso!",
        description: "Sua participação no evento foi confirmada.",
      });
      // Atualiza as consultas relevantes
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/participation`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao participar do evento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutação para cancelar a participação no evento
  const cancelParticipationMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/events/${event.id}/cancel-participation`);
    },
    onSuccess: () => {
      setIsParticipating(false);
      toast({
        title: "Participação cancelada",
        description: "Você não está mais participando deste evento.",
      });
      // Atualiza as consultas relevantes
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/participation`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao cancelar participação",
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
          className={cn(
            "absolute top-3 right-3 text-white text-xs font-bold px-3 py-1 rounded-full",
            event.category.slug === "lgbt" ? "pride-badge" : ""
          )}
          style={
            event.category.slug === "lgbt" && event.category.color === "pride"
            ? {} // O estilo vem direto da classe CSS pride-badge
            : { backgroundColor: event.category.color }
          }
        >
          {event.category.name}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-lg font-bold text-white mb-1 drop-shadow-md line-clamp-2">{event.name}</h3>
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-300 mr-2">
              <img 
                src={event.creator.profileImage || undefined} 
                alt={event.creator.firstName}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-sm text-white drop-shadow-md">
              {event.creator.firstName} {event.creator.lastName}
            </span>
          </div>
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
          
          {isParticipating ? (
            <Button 
              size="sm" 
              variant="destructive"
              className="rounded-full"
              onClick={() => cancelParticipationMutation.mutate()}
              disabled={cancelParticipationMutation.isPending}
            >
              {cancelParticipationMutation.isPending ? (
                "Aguarde..."
              ) : (
                <>
                  <XIcon className="h-4 w-4 mr-1" />
                  Cancelar
                </>
              )}
            </Button>
          ) : (
            <Button 
              size="sm" 
              className="rounded-full bg-gradient-to-r from-primary to-baco-blue hover:from-baco-blue hover:to-primary text-white transition-all duration-300"
              onClick={() => participateMutation.mutate()}
              disabled={participateMutation.isPending}
            >
              {participateMutation.isPending ? (
                "Aguarde..."
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-1" />
                  Participar
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
