import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SupportDialogProps {
  children?: React.ReactNode;
}

export function SupportDialog({ children }: SupportDialogProps) {
  const [open, setOpen] = React.useState(false);
  const supportEmail = "bacoexperiencias@gmail.com";

  const handleOpenEmail = () => {
    window.open(`mailto:${supportEmail}`, "_blank");
    toast({
      title: "Redirecionando para o email",
      description: "Um novo email será aberto em seu aplicativo de email padrão",
    });
    setOpen(false);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    toast({
      title: "Email copiado!",
      description: "O email de suporte foi copiado para sua área de transferência",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <div className="flex items-center cursor-pointer">
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Suporte</span>
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto left-[50%] translate-x-[-50%] scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
        <DialogHeader>
          <DialogTitle className="text-xl text-center flex items-center justify-center gap-2">
            <HelpCircle className="w-5 h-5 text-orange-500" />
            <span>Suporte ao Usuário</span>
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Entre em contato com nossa equipe para obter ajuda
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="space-y-4">
            <div className="rounded-lg border p-4 bg-muted/50">
              <h3 className="font-medium mb-2 text-center">Email de Contato</h3>
              <div className="flex items-center justify-center gap-2 bg-black/30 rounded-md p-3 border border-white/10">
                <Mail className="h-5 w-5 text-orange-500" />
                <span className="font-mono text-orange-500">{supportEmail}</span>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-4 text-sm">
              <p className="mb-2">
                Nossa equipe de suporte está disponível para ajudar você com qualquer dúvida, problema ou sugestão 
                relacionada ao Baco.
              </p>
              <p>
                Tentamos responder a todas as mensagens dentro de 24 horas em dias úteis.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={handleCopyEmail}
          >
            Copiar Email
          </Button>
          <Button 
            className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500" 
            onClick={handleOpenEmail}
          >
            Enviar Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}