import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Copy, Facebook, Linkedin, Twitter, MessageSquare, Mail, AlertCircle } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { 
  FacebookShareButton, 
  TwitterShareButton, 
  LinkedinShareButton, 
  WhatsappShareButton, 
  EmailShareButton 
} from "react-share";
import { 
  logShareEventError, 
  generateFallbackShareData 
} from "@/lib/errorLogger";

/**
 * Interface para as propriedades do componente
 */
interface ShareEventDialogProps {
  eventId: number;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Interface para os dados de compartilhamento
 */
interface ShareData {
  link: string;
  title: string;
  description: string;
  image: string | null;
  event: {
    id: number;
    name: string;
    date: string;
    time: string;
    location: string;
    category: string;
    creator: string;
  };
}

/**
 * Componente de diálogo para compartilhar evento
 * Permite gerar links para compartilhar o evento em redes sociais
 */
export function ShareEventDialog({ 
  eventId,
  isOpen,
  onClose
}: ShareEventDialogProps) {
  const { toast } = useToast();
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);
  const [eventName, setEventName] = useState<string>("");
  
  // Buscar os detalhes do evento para fallback se necessário
  useEffect(() => {
    if (isOpen && eventId) {
      // Buscar detalhes básicos do evento para ter um fallback
      fetch(`/api/events/${eventId}`)
        .then(res => res.json())
        .then(eventData => {
          setEventName(eventData.name || "Evento");
        })
        .catch(error => {
          // Se não conseguir buscar os detalhes, usar um nome genérico
          setEventName("Evento");
          // Registrar o erro
          logShareEventError(eventId, "buscar detalhes para fallback", error);
        });
    }
  }, [isOpen, eventId]);

  // Redirecionar para a página de erro em caso de falha catastrófica
  const redirectToErrorPage = (errorType: string, message: string) => {
    onClose(); // Fechar o diálogo
    const params = new URLSearchParams({
      eventId: eventId.toString(),
      type: errorType,
      message: message
    });
    window.location.href = `/share-error?${params.toString()}`;
  };

  // Buscar dados de compartilhamento
  useEffect(() => {
    if (isOpen && eventId) {
      setIsLoading(true);
      setUseFallback(false);
      
      fetch(`/api/events/${eventId}/share`)
        .then(res => {
          if (!res.ok) throw new Error("Erro ao gerar link de compartilhamento");
          return res.json();
        })
        .then(data => {
          setShareData(data);
          setIsLoading(false);
        })
        .catch(error => {
          // Registrar o erro no sistema de logs
          logShareEventError(eventId, "gerar link de compartilhamento", error);
          
          try {
            // Tentar ativar o modo fallback
            setUseFallback(true);
            setIsLoading(false);
            
            toast({
              title: "Erro ao gerar link de compartilhamento",
              description: "Usando dados básicos para compartilhamento. Algumas opções podem estar limitadas.",
              variant: "destructive",
            });
          } catch (fatalError) {
            // Se falhar no fallback, redirecionar para a página de erro
            logShareEventError(eventId, "erro catastrófico no fallback", fatalError as Error);
            redirectToErrorPage("fallback_failed", 
              "Falha no mecanismo de contingência de compartilhamento"
            );
          }
        });
    }
  }, [isOpen, eventId, toast, onClose]);
  
  // Gerar dados de fallback se necessário
  useEffect(() => {
    if (useFallback && eventId && eventName) {
      const fallbackData = generateFallbackShareData(eventId, eventName);
      // Criar um objeto de compartilhamento com os dados básicos disponíveis
      setShareData({
        link: fallbackData.link,
        title: fallbackData.title,
        description: fallbackData.description,
        image: null,
        event: {
          id: eventId,
          name: eventName,
          date: "Data não disponível",
          time: "Horário não disponível",
          location: "Local não disponível",
          category: "Categoria não disponível",
          creator: "Criador não disponível"
        }
      });
    }
  }, [useFallback, eventId, eventName]);

  // Copiar link para a área de transferência
  const copyToClipboard = () => {
    if (shareData) {
      navigator.clipboard.writeText(shareData.link)
        .then(() => {
          toast({
            title: "Link copiado!",
            description: "O link do evento foi copiado para a área de transferência.",
          });
        })
        .catch(() => {
          toast({
            title: "Erro ao copiar",
            description: "Não foi possível copiar o link. Tente copiar manualmente.",
            variant: "destructive",
          });
        });
    }
  };

  // Texto para compartilhamento
  const shareText = shareData 
    ? `Participe do evento: ${shareData.event.name} em ${shareData.event.date} às ${shareData.event.time}. ${shareData.event.location}`
    : "";
    
  const emailSubject = shareData ? `Convite para o evento: ${shareData.event.name}` : "";
  const emailBody = shareData 
    ? `Olá,\n\nGostaria de convidar você para o evento ${shareData.event.name} que acontecerá em ${shareData.event.date} às ${shareData.event.time}, em ${shareData.event.location}.\n\nPara mais informações e para se inscrever, acesse: ${shareData.link}\n\nEspero te ver lá!`
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Compartilhar Evento</DialogTitle>
          <DialogDescription>
            Compartilhe este evento com seus amigos e redes sociais.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-6 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
          </div>
        ) : shareData ? (
          <>
            <div className="py-4">
              {useFallback && (
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5 mr-2" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Modo de Fallback Ativado</h4>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                      Devido a um problema técnico, estamos usando um link alternativo para compartilhamento.
                      Algumas informações do evento podem estar limitadas.
                    </p>
                  </div>
                </div>
              )}
            
              <div className="flex items-center gap-2 mb-4">
                <Input 
                  value={shareData.link} 
                  readOnly 
                  className="flex-1"
                />
                <Button onClick={copyToClipboard} variant="outline" className="flex items-center gap-1">
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <h3 className="text-sm font-medium mb-3 text-muted-foreground">Compartilhar nas redes sociais</h3>
                <div className="flex gap-3 flex-wrap">
                  <FacebookShareButton url={shareData.link} hashtag="#BacoExperiencias">
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-full">
                      <Facebook className="h-5 w-5 text-blue-600" />
                    </Button>
                  </FacebookShareButton>
                  
                  <TwitterShareButton url={shareData.link} title={shareText}>
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-full">
                      <Twitter className="h-5 w-5 text-sky-500" />
                    </Button>
                  </TwitterShareButton>
                  
                  <LinkedinShareButton url={shareData.link} title={shareData.event.name}>
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-full">
                      <Linkedin className="h-5 w-5 text-blue-700" />
                    </Button>
                  </LinkedinShareButton>
                  
                  <WhatsappShareButton url={shareData.link} title={shareText}>
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-full">
                      <SiWhatsapp className="h-5 w-5 text-green-500" />
                    </Button>
                  </WhatsappShareButton>
                  
                  <EmailShareButton url={shareData.link} subject={emailSubject} body={emailBody}>
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-full">
                      <Mail className="h-5 w-5 text-orange-500" />
                    </Button>
                  </EmailShareButton>
                  
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-12 w-12 rounded-full"
                    onClick={() => {
                      // Abrir cliente de mensagens nativo (SMS/iMessage/etc)
                      window.location.href = `sms:?body=${encodeURIComponent(shareText + ' ' + shareData.link)}`;
                    }}
                  >
                    <MessageSquare className="h-5 w-5 text-purple-500" />
                  </Button>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
                <h3 className="text-sm font-medium mb-2">Detalhes do evento</h3>
                <p className="text-sm"><strong>Nome:</strong> {shareData.event.name}</p>
                <p className="text-sm"><strong>Data:</strong> {shareData.event.date}</p>
                <p className="text-sm"><strong>Horário:</strong> {shareData.event.time}</p>
                <p className="text-sm"><strong>Local:</strong> {shareData.event.location}</p>
                <p className="text-sm"><strong>Categoria:</strong> {shareData.event.category}</p>
                <p className="text-sm"><strong>Criado por:</strong> {shareData.event.creator}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="py-6 text-center text-muted-foreground">
            Não foi possível carregar os dados de compartilhamento.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}