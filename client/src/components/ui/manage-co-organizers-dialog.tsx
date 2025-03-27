
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { InviteCoOrganizerDialog } from "@/components/ui/invite-co-organizer-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, UserMinus, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ManageCoOrganizersDialogProps {
  eventId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ManageCoOrganizersDialog({ eventId, isOpen, onClose }: ManageCoOrganizersDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  // Buscar lista de co-organizadores atuais
  const coOrganizersQuery = useQuery({
    queryKey: [`/api/events/${eventId}/co-organizers`],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/co-organizers`);
      if (!res.ok) throw new Error("Erro ao buscar co-organizadores");
      return await res.json();
    },
    enabled: isOpen,
  });

  // Mutation para remover um co-organizador
  const removeCoOrganizerMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/events/${eventId}/co-organizers/${userId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Co-organizador removido",
        description: "O co-organizador foi removido com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/co-organizers`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover co-organizador",
        description: error.message || "Não foi possível remover o co-organizador.",
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Gerenciar Co-organizadores</DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsInviteDialogOpen(true)}
              className="w-full mb-4"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar Co-organizador
            </Button>

            {coOrganizersQuery.isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : coOrganizersQuery.isError ? (
              <div className="bg-red-50 text-red-800 rounded-md p-4">
                <div className="font-medium">Erro ao carregar dados</div>
                <div className="text-sm">
                  Não foi possível carregar os co-organizadores. Por favor, tente novamente.
                </div>
              </div>
            ) : !coOrganizersQuery.data || coOrganizersQuery.data.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div>Nenhum co-organizador encontrado.</div>
                <div>Convide alguém para ajudar a gerenciar este evento.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {coOrganizersQuery.data.map((coOrg) => (
                  <div key={coOrg.id} className="flex justify-between items-center p-3 border rounded-md">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={coOrg.profileImage || undefined} />
                        <AvatarFallback>
                          {`${coOrg.firstName.charAt(0)}${coOrg.lastName.charAt(0)}`}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{coOrg.firstName} {coOrg.lastName}</div>
                        <div className="text-sm text-muted-foreground">{coOrg.email}</div>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                      onClick={() => removeCoOrganizerMutation.mutate(coOrg.id)}
                      disabled={removeCoOrganizerMutation.isPending}
                    >
                      <UserMinus className="h-4 w-4 mr-1" />
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <InviteCoOrganizerDialog
        eventId={eventId}
        isOpen={isInviteDialogOpen}
        onClose={() => setIsInviteDialogOpen(false)}
      />
    </>
  );
}
