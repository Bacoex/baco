import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Copy, Facebook, Linkedin, Twitter, MessageSquare, Mail } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { 
  FacebookShareButton, 
  TwitterShareButton, 
  LinkedinShareButton, 
  WhatsappShareButton, 
  EmailShareButton 
} from "react-share";

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

  // Buscar dados de compartilhamento
  useEffect(() => {
    if (isOpen && eventId) {
      setIsLoading(true);
      
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
          toast({
            title: "Erro ao gerar link de compartilhamento",
            description: error.message || "Não foi possível gerar o link de compartilhamento. Tente novamente.",
            variant: "destructive",
          });
          setIsLoading(false);
          onClose();
        });
    }
  }, [isOpen, eventId, toast, onClose]);

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