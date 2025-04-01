import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, comparePasswords, hashPassword } from "./auth";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { 
  insertEventSchema, 
  insertEventParticipantSchema, 
  insertEventSubcategorySchema 
} from "@shared/schema";
import { errorMonitoringMiddleware, getMonitoredStorage } from "./errorMonitoring";

/**
 * Registra todas as rotas da API
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Adicionar middleware de monitoramento de erros
  app.use(errorMonitoringMiddleware);
  
  // Configura autenticação
  setupAuth(app);

  // Middleware para verificar autenticação
  const ensureAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Não autorizado" });
  };

  // Middleware para verificar admin
  const ensureAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autorizado" });
    }

    if (!req.user.isAdmin && !req.user.isSuperAdmin) {
      return res.status(403).json({ message: "Permissão negada" });
    }

    return next();
  };

  /**
   * Rotas de Categorias
   */
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (err) {
      console.error("Erro ao buscar categorias:", err);
      res.status(500).json({ message: "Erro ao buscar categorias" });
    }
  });

  /**
   * Rotas de Subcategorias
   */
  app.get("/api/subcategories", async (req, res) => {
    try {
      const subcategories = await storage.getSubcategories();
      res.json(subcategories);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar subcategorias" });
    }
  });

  app.get("/api/categories/:categoryId/subcategories", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const subcategories = await storage.getSubcategoriesByCategory(categoryId);
      res.json(subcategories);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar subcategorias" });
    }
  });

  /**
   * Rotas de Eventos
   */
  app.get("/api/events", async (req, res) => {
    try {
      let events;
      if (req.query.category) {
        const category = await storage.getCategoryBySlug(req.query.category as string);
        events = category ? await storage.getEventsByCategory(category.id) : await storage.getEvents();
      } else {
        events = await storage.getEvents();
      }

      const eventsWithDetails = await Promise.all(
        events.map(async (event) => {
          const categories = await storage.getCategories();
          const category = categories.find(cat => cat.id === event.categoryId);
          const creator = await storage.getUser(event.creatorId);

          return {
            ...event,
            category,
            creator: creator ? {
              id: creator.id,
              firstName: creator.firstName,
              lastName: creator.lastName,
              profileImage: creator.profileImage
            } : null
          };
        })
      );

      res.json(eventsWithDetails);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar eventos" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getEvent(parseInt(req.params.id));
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }

      const categories = await storage.getCategories();
      const category = categories.find(cat => cat.id === event.categoryId);
      const creator = await storage.getUser(event.creatorId);
      const participants = await storage.getParticipants(event.id);

      const participantsWithDetails = await Promise.all(
        participants.map(async (participant) => {
          const user = await storage.getUser(participant.userId);
          return {
            ...participant,
            user: user ? {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImage: user.profileImage
            } : null
          };
        })
      );

      res.json({
        ...event,
        category,
        creator: creator ? {
          id: creator.id,
          firstName: creator.firstName,
          lastName: creator.lastName,
          profileImage: creator.profileImage
        } : null,
        participants: participantsWithDetails
      });
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar evento" });
    }
  });

  app.post("/api/events", ensureAuthenticated, async (req, res) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData, req.user!.id);
      const categories = await storage.getCategories();
      const category = categories.find(cat => cat.id === event.categoryId);

      res.status(201).json({
        ...event,
        category
      });
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(err).message });
      }
      res.status(500).json({ message: "Erro ao criar evento" });
    }
  });

  /**
   * Rotas de Participação
   */
  app.post("/api/events/:id/participate", ensureAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user!.id;

      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }

      if (event.creatorId === userId) {
        return res.status(400).json({ message: "Você não pode participar do seu próprio evento" });
      }

      const existingParticipation = await storage.getParticipation(eventId, userId);
      if (existingParticipation) {
        return res.status(400).json({ message: "Você já está participando deste evento" });
      }
      
      const participation = await storage.createParticipation({
        eventId,
        userId,
        status: event.eventType === 'private_application' ? 'pending' : 'confirmed'
      });

      const user = await storage.getUser(userId);
      const userData = user ? {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage
      } : null;

      // Criar notificação para o criador do evento se for um evento com aprovação necessária
      let notificationForCreator = null;
      if (event.eventType === 'private_application') {
        // Criar a notificação
        const notification = await storage.createNotification({
          title: "Nova solicitação para seu evento",
          message: `${user?.firstName || 'Alguém'} ${user?.lastName || ''} quer experienciar o seu evento "${event.name}"`,
          type: "participant_request",
          eventId: event.id,
          sourceId: participation.id,
          sourceType: "participation"
        });
        
        // Adicionar o criador do evento como destinatário
        await storage.addNotificationRecipients(notification.id, [event.creatorId]);
        
        console.log(`Criada notificação ${notification.id} para o criador do evento ${event.creatorId}`);
      }

      res.status(201).json({
        ...participation,
        user: userData
      });
    } catch (err) {
      console.error("Erro ao participar do evento:", err);
      res.status(500).json({ message: "Erro ao participar do evento" });
    }
  });
  
  // Rota para verificar participação em evento específico
  app.get("/api/events/:id/participation", ensureAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      const participation = await storage.getParticipation(event.id, userId);
      if (participation) {
        return res.json(participation);
      } else {
        return res.status(404).json({ message: "Participação não encontrada" });
      }
    } catch (error) {
      console.error("Erro ao verificar participação:", error);
      return res.status(500).json({ message: "Erro interno ao verificar participação" });
    }
  });
  
  // Rota para cancelar participação em evento específico (alternativa mais semântica)
  app.post("/api/events/:id/cancel-participation", ensureAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      const participation = await storage.getParticipation(event.id, userId);
      if (!participation) {
        return res.status(404).json({ message: "Participação não encontrada" });
      }
      
      await storage.removeParticipation(participation.id);
      return res.status(200).json({ message: "Participação cancelada com sucesso" });
    } catch (error) {
      console.error("Erro ao cancelar participação:", error);
      return res.status(500).json({ message: "Erro interno ao cancelar participação" });
    }
  });
  


  /**
   * Rotas de gerenciamento de participantes
   */
  app.patch("/api/participants/:id/approve", ensureAuthenticated, async (req, res) => {
    try {
      const participantId = parseInt(req.params.id);
      const participant = await storage.getParticipant(participantId);
      
      if (!participant) {
        return res.status(404).json({ message: "Participante não encontrado" });
      }
      
      // Verificar se o usuário atual é o criador do evento
      const event = await storage.getEvent(participant.eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      if (event.creatorId !== req.user!.id) {
        return res.status(403).json({ 
          message: "Apenas o criador do evento pode aprovar participantes" 
        });
      }
      
      const updatedParticipant = await storage.updateParticipationStatus(
        participantId, 
        "approved"
      );
      
      // Verificar se já existe uma notificação para esta aprovação
      // Isso evita múltiplas notificações para a mesma aprovação
      const userNotifications = await storage.getNotificationsByUser(participant.userId);
      const existingApprovalNotification = userNotifications.find(n => 
        n.notification.type === "participation_approved" && 
        n.notification.eventId === event.id && 
        n.notification.sourceId === participant.id
      );
      
      // Preparar a resposta base
      const responseData = {
        ...updatedParticipant
      };
      
      // Variável para armazenar informações de notificação
      let notificationInfo = null;
      
      if (!existingApprovalNotification) {
        // Criar notificação para o usuário solicitante
        const notification = await storage.createNotification({
          title: "Solicitação aprovada",
          message: `Sua solicitação para experienciar o evento "${event.name}" foi aprovada!`,
          type: "participation_approved",
          eventId: event.id,
          sourceId: participant.id,
          sourceType: "participation"
        });
        
        // Adicionar o usuário solicitante como destinatário
        await storage.addNotificationRecipients(notification.id, [participant.userId]);
        
        console.log(`Criada notificação ${notification.id} para o solicitante ${participant.userId}`);
        
        // Armazenar informações da notificação para a resposta
        notificationInfo = {
          title: notification.title,
          message: notification.message,
          userId: participant.userId
        };
      } else {
        console.log(`Notificação de aprovação já existe para participante ${participant.id} no evento ${event.id}`);
        // Não retornamos notificação quando já existe uma para este evento
        notificationInfo = null;
      }
      
      // Adicionar informações de notificação como uma propriedade extra
      if (notificationInfo) {
        (responseData as any).notification = {
          forParticipant: notificationInfo
        };
      }
      
      res.json(responseData);
    } catch (err) {
      console.error("Erro ao aprovar participante:", err);
      res.status(500).json({ message: "Erro ao aprovar participante" });
    }
  });
  
  app.patch("/api/participants/:id/reject", ensureAuthenticated, async (req, res) => {
    try {
      const participantId = parseInt(req.params.id);
      const participant = await storage.getParticipant(participantId);
      
      if (!participant) {
        return res.status(404).json({ message: "Participante não encontrado" });
      }
      
      // Verificar se o usuário atual é o criador do evento
      const event = await storage.getEvent(participant.eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      if (event.creatorId !== req.user!.id) {
        return res.status(403).json({ 
          message: "Apenas o criador do evento pode rejeitar participantes" 
        });
      }
      
      const updatedParticipant = await storage.updateParticipationStatus(
        participantId, 
        "rejected"
      );
      
      // Preparar a resposta base
      const responseData = {
        ...updatedParticipant
      };
      
      // Criar notificação para o usuário solicitante
      const notification = await storage.createNotification({
        title: "Solicitação não aprovada",
        message: `Sua solicitação para experienciar o evento "${event.name}" não foi aprovada.`,
        type: "participation_rejected",
        eventId: event.id,
        sourceId: participant.id,
        sourceType: "participation"
      });
      
      // Adicionar o usuário solicitante como destinatário
      await storage.addNotificationRecipients(notification.id, [participant.userId]);
      
      console.log(`Criada notificação ${notification.id} para o solicitante ${participant.userId} (rejeição)`);
      
      // Adicionar informações de notificação como uma propriedade extra
      (responseData as any).notification = {
        forParticipant: {
          title: notification.title,
          message: notification.message,
          userId: participant.userId
        }
      };
      
      res.json(responseData);
    } catch (err) {
      console.error("Erro ao rejeitar participante:", err);
      res.status(500).json({ message: "Erro ao rejeitar participante" });
    }
  });
  
  app.patch("/api/participants/:id/revert", ensureAuthenticated, async (req, res) => {
    try {
      const participantId = parseInt(req.params.id);
      const participant = await storage.getParticipant(participantId);
      
      if (!participant) {
        return res.status(404).json({ message: "Participante não encontrado" });
      }
      
      // Verificar se o usuário atual é o criador do evento
      const event = await storage.getEvent(participant.eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      if (event.creatorId !== req.user!.id) {
        return res.status(403).json({ 
          message: "Apenas o criador do evento pode reverter participantes" 
        });
      }
      
      const updatedParticipant = await storage.updateParticipationStatus(
        participantId, 
        "pending"
      );
      
      // Retorna objeto de notificação vazio até implementarmos notificações reais
      res.json({ 
        ...updatedParticipant,
        notification: {} 
      });
    } catch (err) {
      console.error("Erro ao reverter participante:", err);
      res.status(500).json({ message: "Erro ao reverter participante" });
    }
  });
  
  app.delete("/api/participants/:id/remove", ensureAuthenticated, async (req, res) => {
    try {
      const participantId = parseInt(req.params.id);
      const participant = await storage.getParticipant(participantId);
      
      if (!participant) {
        return res.status(404).json({ message: "Participante não encontrado" });
      }
      
      // Verificar se o usuário atual é o criador do evento
      const event = await storage.getEvent(participant.eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      if (event.creatorId !== req.user!.id) {
        return res.status(403).json({ 
          message: "Apenas o criador do evento pode remover participantes" 
        });
      }
      
      await storage.removeParticipation(participantId);
      
      // Retorna objeto de notificação vazio até implementarmos notificações reais
      res.json({ 
        message: "Participante removido com sucesso",
        notification: {} 
      });
    } catch (err) {
      console.error("Erro ao remover participante:", err);
      res.status(500).json({ message: "Erro ao remover participante" });
    }
  });
  
  // Endpoint para cancelar participação em um evento (geral, tanto para usuários quanto criadores)
  app.delete("/api/participants/:participantId", ensureAuthenticated, async (req, res) => {
    try {
      const participantId = parseInt(req.params.participantId);
      const userId = req.user!.id;
      
      // Buscar o participante
      const participant = await storage.getParticipant(participantId);
      if (!participant) {
        return res.status(404).json({ message: 'Participação não encontrada' });
      }
      
      // Verificar se o participante pertence ao usuário logado ou se é o criador do evento
      if (participant.userId !== userId) {
        const event = await storage.getEvent(participant.eventId);
        
        // Se não for do usuário, verificar se o usuário é o criador do evento
        if (!event || event.creatorId !== userId) {
          return res.status(403).json({ message: 'Você não tem permissão para cancelar esta participação' });
        }
      }
      
      // Remover participante
      await storage.removeParticipation(participantId);
      
      return res.status(200).json({ message: 'Participação cancelada com sucesso' });
    } catch (error) {
      console.error('Erro ao cancelar participação:', error);
      return res.status(500).json({ message: 'Erro interno ao processar a solicitação' });
    }
  });

  /**
   * Rotas de Eventos do Usuário
   */
  app.get("/api/user/events/created", ensureAuthenticated, async (req, res) => {
    try {
      const events = await storage.getEventsByCreator(req.user!.id);
      
      const eventsWithDetails = await Promise.all(
        events.map(async (event) => {
          const categories = await storage.getCategories();
          const category = categories.find(cat => cat.id === event.categoryId);
          const creator = await storage.getUser(event.creatorId);
          const participants = await storage.getParticipants(event.id);

          const participantsWithDetails = await Promise.all(
            participants.map(async (participant) => {
              const user = await storage.getUser(participant.userId);
              return {
                ...participant,
                user: user ? {
                  id: user.id,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  profileImage: user.profileImage
                } : null
              };
            })
          );

          return {
            ...event,
            category,
            creator: creator ? {
              id: creator.id,
              firstName: creator.firstName,
              lastName: creator.lastName,
              profileImage: creator.profileImage
            } : null,
            participants: participantsWithDetails
          };
        })
      );

      res.json(eventsWithDetails);
    } catch (err) {
      console.error("Erro ao buscar eventos criados pelo usuário:", err);
      res.status(500).json({ message: "Erro ao buscar eventos criados" });
    }
  });

  // Rota alternativa para manter compatibilidade
  app.get("/api/user/events/creator", ensureAuthenticated, async (req, res) => {
    try {
      console.log(`getEventsByCreator: Buscando eventos do criador ${req.user!.id}, encontrados 0 eventos`);
      const events = await storage.getEventsByCreator(req.user!.id);
      
      const eventsWithDetails = await Promise.all(
        events.map(async (event) => {
          const categories = await storage.getCategories();
          const category = categories.find(cat => cat.id === event.categoryId);
          const creator = await storage.getUser(event.creatorId);
          const participants = await storage.getParticipants(event.id);
          
          // Adicionar informações do usuário para cada participante
          const participantsWithDetails = await Promise.all(
            participants.map(async (participant) => {
              const user = await storage.getUser(participant.userId);
              return {
                ...participant,
                user: user ? {
                  id: user.id,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  profileImage: user.profileImage
                } : null
              };
            })
          );
          
          return {
            ...event,
            category: {
              name: category?.name || "Sem categoria",
              color: category?.color || "#888888",
              slug: category?.slug || "uncategorized"
            },
            creator: {
              id: creator?.id || 0,
              firstName: creator?.firstName || "Usuário",
              lastName: creator?.lastName || "Desconhecido",
              profileImage: creator?.profileImage || null
            },
            participants: participantsWithDetails
          };
        })
      );
      
      res.json(eventsWithDetails);
    } catch (err) {
      console.error("Erro ao buscar eventos criados:", err);
      res.status(500).json({ message: "Erro ao buscar eventos criados" });
    }
  });

  app.get("/api/user/events/participating", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const allEvents = await storage.getEvents();
      const participants = [];
      
      for (const event of allEvents) {
        const participation = await storage.getParticipation(event.id, userId);
        if (participation) {
          participants.push({
            event,
            participation
          });
        }
      }
      
      // Enriquece os eventos com dados da categoria e criador
      const eventsWithDetails = await Promise.all(
        participants.map(async ({ event, participation }) => {
          const categories = await storage.getCategories();
          const category = categories.find(cat => cat.id === event.categoryId);
          const creator = await storage.getUser(event.creatorId);
          
          return {
            ...event,
            category,
            creator: creator ? {
              id: creator.id,
              firstName: creator.firstName,
              lastName: creator.lastName,
              profileImage: creator.profileImage
            } : null,
            participation
          };
        })
      );
      
      res.json(eventsWithDetails);
    } catch (err) {
      console.error("Erro ao buscar eventos que o usuário participa:", err);
      res.status(500).json({ message: "Erro ao buscar eventos participando" });
    }
  });

  /**
   * Rotas de Perfil de Usuário e Autenticação
   */
  app.post("/api/user/change-password", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body;
      
      // Buscar o usuário atual
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Usar as funções de hash e verificação de senha importadas no topo do arquivo
      
      // Verificar se a senha atual está correta
      const passwordMatch = await comparePasswords(currentPassword, user.password);
      if (!passwordMatch) {
        return res.status(400).json({ message: "Senha atual incorreta" });
      }
      
      // Fazer hash da nova senha
      const hashedPassword = await hashPassword(newPassword);
      
      // Atualizar a senha do usuário
      const updatedUser = await storage.updateUser(userId, { password: hashedPassword });
      
      // Remover a senha do objeto de resposta
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json(userWithoutPassword);
    } catch (err) {
      console.error("Erro ao alterar senha:", err);
      res.status(500).json({ message: "Erro ao alterar senha" });
    }
  });

  /**
   * Rotas de Notificações
   */
  app.get("/api/notifications", ensureAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getNotificationsByUser(req.user!.id);
      res.json(notifications);
    } catch (err) {
      console.error("Erro ao buscar notificações:", err);
      res.status(500).json({ message: "Erro ao buscar notificações" });
    }
  });
  
  // Rota para acessar logs de erro do sistema
  app.get("/api/system/error-logs", ensureAuthenticated, async (req, res) => {
    try {
      // Apenas o usuário admin pode acessar os logs completos
      if (req.user!.username === "00000000000") {
        const { getErrorLogs } = require('./errorMonitoring');
        return res.json(getErrorLogs());
      }
      
      // Outros usuários veem apenas uma mensagem genérica
      res.status(403).json({ 
        message: "Acesso permitido apenas para administradores do sistema" 
      });
    } catch (err) {
      console.error("Erro ao buscar logs de erro:", err);
      res.status(500).json({ message: "Erro ao buscar logs de erro" });
    }
  });

  app.patch("/api/notifications/:id/read", ensureAuthenticated, async (req, res) => {
    try {
      await storage.markNotificationAsRead(parseInt(req.params.id));
      res.json({ message: "Notificação marcada como lida" });
    } catch (err) {
      res.status(500).json({ message: "Erro ao marcar notificação como lida" });
    }
  });

  // Rota para marcar todas as notificações como lidas
  app.patch("/api/notifications/all/read", ensureAuthenticated, async (req, res) => {
    try {
      // Buscar todas as notificações do usuário
      const userNotifications = await storage.getNotificationsByUser(req.user!.id);
      
      // Marcar cada uma como lida
      for (const item of userNotifications) {
        await storage.markNotificationAsRead(item.recipient.id);
      }
      
      res.json({ message: "Todas as notificações marcadas como lidas" });
    } catch (err) {
      console.error("Erro ao marcar todas notificações como lidas:", err);
      res.status(500).json({ message: "Erro ao marcar notificações como lidas" });
    }
  });

  // Rota para excluir uma notificação
  app.delete("/api/notifications/:id", ensureAuthenticated, async (req, res) => {
    try {
      await storage.deleteNotificationForUser(parseInt(req.params.id));
      res.json({ message: "Notificação removida" });
    } catch (err) {
      console.error("Erro ao remover notificação:", err);
      res.status(500).json({ message: "Erro ao remover notificação" });
    }
  });

  // Criar servidor HTTP
  const httpServer = createServer(app);
  return httpServer;
}