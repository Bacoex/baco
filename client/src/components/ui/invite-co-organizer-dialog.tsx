import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, UserPlus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

/**
 * Interface para as propriedades do componente
 */
interface InviteCoOrganizerDialogProps {
  eventId: number;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Componente de diálogo para convidar co-organizador
 * Permite enviar um convite por e-mail para uma pessoa gerenciar o evento junto
 */
export function InviteCoOrganizerDialog({ 
  eventId,
  isOpen,
  onClose
}: InviteCoOrganizerDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(
    `Olá,\n\nGostaria de convidar você para ser co-organizador do meu evento. Juntos podemos gerenciar inscrições, detalhes e comunicação.\n\nAtenciosamente,\n${user?.firstName} ${user?.lastName}`
  );

  // Mutation para enviar o convite
  const sendInviteMutation = useMutation({
    mutationFn: async (data: { email: string; message?: string }) => {
      const res = await apiRequest("POST", `/api/events/${eventId}/co-organizer-invites`, data);
      return await res.json();
    },
    onSuccess: () => {
      // Limpar os campos
      setEmail("");
      setMessage(
        `Olá,\n\nGostaria de convidar você para ser co-organizador do meu evento. Juntos podemos gerenciar inscrições, detalhes e comunicação.\n\nAtenciosamente,\n${user?.firstName} ${user?.lastName}`
      );
      
      // Fechar o modal
      onClose();
      
      // Mostrar mensagem de sucesso
      toast({
        title: "Convite enviado",
        description: "O convite foi enviado com sucesso para o e-mail informado.",
      });
      
      // Atualizar a lista de convites
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/co-organizer-invites`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar convite",
        description: error.message || "Não foi possível enviar o convite. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Função para enviar o convite
  const handleSendInvite = () => {
    if (!email) {
      toast({
        title: "E-mail obrigatório",
        description: "Por favor, informe o e-mail do co-organizador.",
        variant: "destructive",
      });
      return;
    }

    // Validar formato do e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "E-mail inválido",
        description: "Por favor, informe um e-mail válido.",
        variant: "destructive",
      });
      return;
    }

    sendInviteMutation.mutate({ email, message });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar Co-Organizador
          </DialogTitle>
          <DialogDescription>
            Envie um convite por e-mail para alguém ajudar a gerenciar este evento com você.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              E-mail
            </Label>
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Digite o e-mail da pessoa que você deseja convidar"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={sendInviteMutation.isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">
              Mensagem personalizada (opcional)
            </Label>
            <Textarea
              id="message"
              placeholder="Escreva uma mensagem personalizada para o convite"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sendInviteMutation.isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={sendInviteMutation.isPending}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSendInvite}
            disabled={sendInviteMutation.isPending}
          >
            {sendInviteMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Convite"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}