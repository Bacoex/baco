import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { InviteCoOrganizerDialog } from "@/components/ui/invite-co-organizer-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle2, Clock, Loader2, RefreshCw, Trash2, UserMinus, UserPlus, X, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * Interface para as propriedades do componente
 */
interface ManageCoOrganizersDialogProps {
  eventId: number;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Interface para o convite de co-organizador
 */
interface CoOrganizerInvite {
  id: number;
  email: string;
  status: string;
  invitedAt: string;
  respondedAt: string | null;
  message: string | null;
  inviteeId: number | null;
  invitee?: {
    id: number;
    firstName: string;
    lastName: string;
    profileImage: string | null;
  };
}

/**
 * Componente para gerenciar convites e co-organizadores
 */
export function ManageCoOrganizersDialog({
  eventId,
  isOpen,
  onClose
}: ManageCoOrganizersDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Buscar lista de convites
  const invitesQuery = useQuery({
    queryKey: [`/api/events/${eventId}/co-organizer-invites`],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/co-organizer-invites`);
      if (!res.ok) throw new Error("Erro ao buscar convites");
      return await res.json() as CoOrganizerInvite[];
    },
    enabled: isOpen, // Só busca quando o diálogo estiver aberto
  });

  // Buscar lista de co-organizadores atuais
  const coOrganizersQuery = useQuery({
    queryKey: [`/api/events/${eventId}/co-organizers`],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/co-organizers`);
      if (!res.ok) throw new Error("Erro ao buscar co-organizadores");
      return await res.json() as any[];
    },
    enabled: isOpen, // Só busca quando o diálogo estiver aberto
  });

  // Mutation para cancelar um convite
  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: number) => {
      const res = await apiRequest("DELETE", `/api/events/${eventId}/co-organizer-invites/${inviteId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Convite cancelado",
        description: "O convite foi cancelado com sucesso.",
      });
      
      // Atualizar a lista de convites
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/co-organizer-invites`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao cancelar convite",
        description: error.message || "Não foi possível cancelar o convite. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para reenviar um convite
  const resendInviteMutation = useMutation({
    mutationFn: async (inviteId: number) => {
      const res = await apiRequest("POST", `/api/events/${eventId}/co-organizer-invites/${inviteId}/resend`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Convite reenviado",
        description: "O convite foi reenviado com sucesso.",
      });
      
      // Atualizar a lista de convites
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/co-organizer-invites`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao reenviar convite",
        description: error.message || "Não foi possível reenviar o convite. Tente novamente.",
        variant: "destructive",
      });
    },
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
      
      // Atualizar listas
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/co-organizers`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/co-organizer-invites`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover co-organizador",
        description: error.message || "Não foi possível remover o co-organizador. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Função para formatar a data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para renderizar o status do convite
  const renderInviteStatus = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <div className="inline-flex">
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
              <Clock className="h-3 w-3 mr-1" />
              Pendente
            </Badge>
          </div>
        );
      case 'accepted':
        return (
          <div className="inline-flex">
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Aceito
            </Badge>
          </div>
        );
      case 'rejected':
        return (
          <div className="inline-flex">
            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
              <XCircle className="h-3 w-3 mr-1" />
              Recusado
            </Badge>
          </div>
        );
      default:
        return (
          <div className="inline-flex">
            <Badge variant="outline">
              {status}
            </Badge>
          </div>
        );
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Gerenciar Co-Organizadores
            </DialogTitle>
            <DialogDescription>
              Convide pessoas para ajudar a gerenciar este evento. Co-organizadores podem aceitar ou rejeitar 
              inscrições, editar informações do evento e enviar mensagens aos participantes.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Co-Organizadores</h3>
              <Button onClick={() => setIsInviteDialogOpen(true)} className="flex items-center gap-1">
                <UserPlus className="h-4 w-4" />
                Convidar
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="active">Ativos</TabsTrigger>
                <TabsTrigger value="pending">Pendentes</TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                {invitesQuery.isLoading || coOrganizersQuery.isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : invitesQuery.isError || coOrganizersQuery.isError ? (
                  <div className="bg-red-50 text-red-800 rounded-md p-4">
                    <div className="font-medium">Erro ao carregar dados</div>
                    <div className="text-sm">
                      Não foi possível carregar os co-organizadores. Por favor, tente novamente.
                    </div>
                  </div>
                ) : (
                  <>
                    {coOrganizersQuery.data && coOrganizersQuery.data.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-2">Co-organizadores ativos</h4>
                        <div className="space-y-2">
                          {coOrganizersQuery.data.map((coOrg: any) => (
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
                      </div>
                    )}

                    {invitesQuery.data && invitesQuery.data.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Convites</h4>
                        <div className="space-y-2">
                          {invitesQuery.data.map((invite) => (
                            <div key={invite.id} className="p-3 border rounded-md">
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-medium">{invite.email}</div>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <div>Enviado em: {formatDate(invite.invitedAt)}</div>
                                    {renderInviteStatus(invite.status)}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {invite.status === 'pending' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => resendInviteMutation.mutate(invite.id)}
                                      disabled={resendInviteMutation.isPending}
                                    >
                                      <RefreshCw className="h-4 w-4 mr-1" />
                                      Reenviar
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                                    onClick={() => cancelInviteMutation.mutate(invite.id)}
                                    disabled={cancelInviteMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                              {invite.message && (
                                <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700 whitespace-pre-line">
                                  {invite.message}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(!invitesQuery.data || invitesQuery.data.length === 0) && 
                     (!coOrganizersQuery.data || coOrganizersQuery.data.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <div>Nenhum co-organizador ou convite encontrado.</div>
                        <div>Clique em "Convidar" para adicionar alguém para ajudar a gerenciar este evento.</div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="active">
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
                    <div>Nenhum co-organizador ativo encontrado.</div>
                    <div>Convide alguém para ajudar a gerenciar este evento.</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {coOrganizersQuery.data.map((coOrg: any) => (
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
              </TabsContent>

              <TabsContent value="pending">
                {invitesQuery.isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : invitesQuery.isError ? (
                  <div className="bg-red-50 text-red-800 rounded-md p-4">
                    <div className="font-medium">Erro ao carregar dados</div>
                    <div className="text-sm">
                      Não foi possível carregar os convites. Por favor, tente novamente.
                    </div>
                  </div>
                ) : !invitesQuery.data || !invitesQuery.data.filter(i => i.status === 'pending').length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div>Nenhum convite pendente encontrado.</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {invitesQuery.data
                      .filter(invite => invite.status === 'pending')
                      .map((invite) => (
                        <div key={invite.id} className="p-3 border rounded-md">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{invite.email}</div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div>Enviado em: {formatDate(invite.invitedAt)}</div>
                                {renderInviteStatus(invite.status)}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resendInviteMutation.mutate(invite.id)}
                                disabled={resendInviteMutation.isPending}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Reenviar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                                onClick={() => cancelInviteMutation.mutate(invite.id)}
                                disabled={cancelInviteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Cancelar
                              </Button>
                            </div>
                          </div>
                          {invite.message && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700 whitespace-pre-line">
                              {invite.message}
                            </div>
                          )}
                        </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para enviar convite */}
      <InviteCoOrganizerDialog
        eventId={eventId}
        isOpen={isInviteDialogOpen}
        onClose={() => setIsInviteDialogOpen(false)}
      />
    </>
  );
}