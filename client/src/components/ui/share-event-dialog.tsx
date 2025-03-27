import { useState } from "react";
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogDescription, DialogClose 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { 
  FacebookShareButton, 
  TwitterShareButton,
  WhatsappShareButton,
  TelegramShareButton,
  EmailShareButton,
  FacebookIcon, 
  TwitterIcon,
  WhatsappIcon,
  TelegramIcon,
  EmailIcon
} from 'react-share';
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Copy, X } from "lucide-react";

interface ShareEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
}

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

export function ShareEventDialog({ isOpen, onClose, eventId }: ShareEventDialogProps) {
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Carrega os dados de compartilhamento quando o diálogo abrir
  useState(() => {
    if (isOpen && eventId) {
      setIsLoading(true);
      apiRequest("GET", `/api/events/${eventId}/share`)
        .then(res => res.json())
        .then(data => {
          setShareData(data);
          setIsLoading(false);
        })
        .catch(error => {
          console.error("Erro ao carregar dados de compartilhamento:", error);
          toast({
            title: "Erro ao gerar link de compartilhamento",
            description: "Ocorreu um erro ao tentar gerar o link para compartilhar este evento.",
            variant: "destructive"
          });
          setIsLoading(false);
        });
    }
  });

  // Função para copiar o link para a área de transferência
  const copyToClipboard = () => {
    if (shareData?.link) {
      navigator.clipboard.writeText(shareData.link)
        .then(() => {
          setCopied(true);
          toast({
            title: "Link copiado!",
            description: "O link foi copiado para a área de transferência.",
          });
          setTimeout(() => setCopied(false), 3000); // Reset após 3 segundos
        })
        .catch(() => {
          toast({
            title: "Erro ao copiar",
            description: "Não foi possível copiar o link para a área de transferência.",
            variant: "destructive"
          });
        });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 text-transparent bg-clip-text">
            Compartilhar Evento
          </DialogTitle>
          <DialogDescription>
            Compartilhe este evento com seus amigos e convide-os a participar!
          </DialogDescription>
        </DialogHeader>
        
        <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </DialogClose>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : shareData ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-medium">Detalhes do Evento</h3>
              <div className="text-sm rounded-md bg-muted p-4">
                <p className="font-semibold">{shareData.event.name}</p>
                <p>Data: {shareData.event.date} às {shareData.event.time}</p>
                <p>Local: {shareData.event.location}</p>
                <p>Categoria: {shareData.event.category}</p>
                <p>Criado por: {shareData.event.creator}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Link para compartilhar</h3>
              <div className="flex items-center space-x-2">
                <Input 
                  readOnly 
                  value={shareData.link} 
                  className="text-sm font-mono"
                />
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={copyToClipboard}
                  className={copied ? "bg-green-100 text-green-700" : ""}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Compartilhar em redes sociais</h3>
              <div className="flex flex-wrap gap-3 justify-center">
                <FacebookShareButton url={shareData.link} quote={shareData.title}>
                  <FacebookIcon size={40} round />
                </FacebookShareButton>
                
                <TwitterShareButton url={shareData.link} title={shareData.title}>
                  <TwitterIcon size={40} round />
                </TwitterShareButton>
                
                <WhatsappShareButton url={shareData.link} title={shareData.title}>
                  <WhatsappIcon size={40} round />
                </WhatsappShareButton>
                
                <TelegramShareButton url={shareData.link} title={shareData.title}>
                  <TelegramIcon size={40} round />
                </TelegramShareButton>
                
                <EmailShareButton 
                  url={shareData.link} 
                  subject={`Convite para o evento: ${shareData.event.name}`}
                  body={`Olá, gostaria de convidar você para o evento ${shareData.event.name} que acontecerá em ${shareData.event.date} às ${shareData.event.time}.\n\n${shareData.description}\n\nLocal: ${shareData.event.location}\n\nPara mais informações e confirmar sua presença, acesse o link: ${shareData.link}`}
                >
                  <EmailIcon size={40} round />
                </EmailShareButton>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center">
            <p className="text-red-500">Não foi possível carregar os dados do evento.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}