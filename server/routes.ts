import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, comparePasswords, hashPassword } from "./auth";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { 
  insertEventSchema, 
  insertEventParticipantSchema, 
  insertEventSubcategorySchema,
  insertChatMessageSchema
} from "@shared/schema";
import { 
  errorMonitoringMiddleware, 
  getMonitoredStorage,
  logError,
  ErrorSeverity,
  ErrorType
} from "./errorMonitoring";

// Função de utilidade para calcular idade
function calculateAge(birthDateString: string): number {
  const birthDate = new Date(birthDateString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const month = today.getMonth() - birthDate.getMonth();
  
  if (month < 0 || (month === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Registra todas as rotas da API
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Adicionar middleware de monitoramento de erros
  app.use(errorMonitoringMiddleware);
  
  // Configura autenticação
  setupAuth(app);
  
  // Rota para obter informações de um usuário específico
  app.get('/api/users/:id', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Retornar apenas as informações públicas do usuário
      const publicUserInfo = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage,
        zodiacSign: user.zodiacSign,
        role: "Usuário", // Campo default para exibição
        bio: "", // Campo default para bio
        city: user.city,
        state: user.state,
        birthDate: user.birthDate,
        age: user.birthDate ? calculateAge(user.birthDate) : null,
        createdAt: user.createdAt
      };
      
      res.json(publicUserInfo);
    } catch (error) {
      console.error('Erro ao buscar informações do usuário:', error);
      res.status(500).json({ message: "Erro ao buscar informações do usuário" });
    }
  });

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
   * Rota de Pesquisa
   */
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string || "";
      
      if (!query || query.trim() === "") {
        return res.json([]);
      }
      
      // Logging para debug da pesquisa
      console.log(`[SEARCH] Pesquisando por termo: "${query}"`);
      
      // Buscar todos os eventos e filtrar pelo query
      const allEvents = await storage.getEvents();
      console.log(`[SEARCH] Total de eventos disponíveis para pesquisa: ${allEvents.length}`);
      
      const filteredEvents = allEvents.filter(event => {
        const searchTerm = query.toLowerCase();
        const nameMatch = event.name?.toLowerCase().includes(searchTerm) || false;
        const descMatch = event.description?.toLowerCase().includes(searchTerm) || false;
        const locMatch = event.location?.toLowerCase().includes(searchTerm) || false;
        
        // Logging detalhado para debug
        if (nameMatch || descMatch || locMatch) {
          console.log(`[SEARCH] Match encontrado no evento ID=${event.id}, Nome="${event.name}" - Match em: ${nameMatch ? 'nome' : ''}${descMatch ? ' descrição' : ''}${locMatch ? ' localização' : ''}`);
        }
        
        return nameMatch || descMatch || locMatch;
      });
      
      console.log(`[SEARCH] Eventos encontrados após filtro: ${filteredEvents.length}`);
      
      const eventsWithDetails = await Promise.all(
        filteredEvents.map(async (event) => {
          try {
            const categories = await storage.getCategories();
            const category = categories.find(cat => cat.id === event.categoryId);
            const creator = await storage.getUser(event.creatorId);
            
            return {
              ...event,
              categoryName: category?.name || "Sem categoria",
              categoryColor: category?.color || "#cccccc",
              creatorName: creator ? `${creator.firstName} ${creator.lastName}` : "Usuário desconhecido"
            };
          } catch (error) {
            console.error(`[SEARCH] Erro ao processar evento ${event.id}:`, error);
            // Retorna um objeto mínimo para não quebrar o resultado
            return {
              ...event,
              categoryName: "Erro ao carregar categoria",
              categoryColor: "#cccccc",
              creatorName: "Erro ao carregar criador"
            };
          }
        })
      );
      
      console.log(`[SEARCH] Resposta final da pesquisa para "${query}": ${eventsWithDetails.length} resultados`);
      
      // Verifica se os resultados são um array válido
      if (!Array.isArray(eventsWithDetails)) {
        console.error("[SEARCH] Erro: eventsWithDetails não é um array");
        return res.json([]);
      }
      
      return res.json(eventsWithDetails);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("[SEARCH] Erro ao realizar pesquisa:", errorMessage);
      
      // Registrar o erro no sistema de logs
      try {
        logError(`Erro na API de pesquisa: ${errorMessage}`, ErrorSeverity.ERROR, {
          component: "SearchAPI", 
          context: "Pesquisa",
          additionalData: { query: req.query.q }
        });
      } catch (logError) {
        console.error("[SEARCH] Falha ao registrar erro:", logError);
      }
      
      return res.status(500).json({ message: "Erro ao realizar pesquisa", error: errorMessage });
    }
  });

  /**
   * Rotas de Eventos
   */
  
  /**
   * Rota para gerar link de compartilhamento para um evento
   */
  app.get("/api/events/:id/share", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getEventById(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      const creator = await storage.getUser(event.creatorId);
      const category = await storage.getCategoryById(event.categoryId);
      
      if (!creator || !category) {
        return res.status(404).json({ message: "Dados do evento incompletos" });
      }
      
      // Formatar os dados para compartilhamento
      const eventDate = new Date(event.date);
      const formattedDate = eventDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      // Construir o objeto de resposta
      const shareData = {
        link: `${req.protocol}://${req.get('host')}/eventos/${eventId}`,
        title: `${event.name} - Baco Experiências`,
        description: event.description || "Participe deste evento no Baco Experiências!",
        image: event.coverImage || null,
        event: {
          id: event.id,
          name: event.name,
          date: formattedDate,
          time: event.timeStart + (event.timeEnd ? ` - ${event.timeEnd}` : ""),
          location: event.location || "Local a definir",
          category: category.name,
          creator: `${creator.firstName} ${creator.lastName}`
        }
      };
      
      return res.status(200).json(shareData);
    } catch (error) {
      console.error("Erro ao gerar link de compartilhamento:", error);
      return res.status(500).json({ 
        message: "Erro ao gerar link de compartilhamento",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
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
  
  // Rota para atualizar um evento existente
  app.put("/api/events/:id", ensureAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Verificar se o evento existe
      const existingEvent = await storage.getEvent(eventId);
      if (!existingEvent) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      // Verificar se o usuário é o criador do evento
      if (existingEvent.creatorId !== userId) {
        return res.status(403).json({ message: "Você não tem permissão para editar este evento" });
      }
      
      // Tratar dados de ingressos adicionais, similar à criação
      let additionalTicketsValue = req.body.additionalTickets;
      if (req.body.additionalTickets) {
        console.log(`Atualizando evento com ingressos adicionais: ${req.body.additionalTickets}`);
        // Se for uma string, já está em formato JSON stringificado
        if (typeof req.body.additionalTickets === 'string') {
          additionalTicketsValue = req.body.additionalTickets;
        } 
        // Se for um objeto, precisamos convertê-lo para string
        else if (typeof req.body.additionalTickets === 'object') {
          additionalTicketsValue = JSON.stringify(req.body.additionalTickets);
        }
      }
      
      // Validar e preparar os dados para atualização
      const eventData = {
        ...req.body,
        additionalTickets: additionalTicketsValue
      };
      
      // Atualizar o evento
      const updatedEvent = await storage.updateEvent(eventId, eventData);
      
      res.json(updatedEvent);
    } catch (err) {
      console.error("Erro ao atualizar evento:", err);
      if (err instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(err).message });
      }
      res.status(500).json({ message: "Erro ao atualizar evento" });
    }
  });
  
  /**
   * Rota para excluir um evento
   * Apenas o criador do evento pode excluí-lo
   */
  app.delete("/api/events/:id", ensureAuthenticated, async (req, res) => {
    const eventId = parseInt(req.params.id);
    
    try {
      // Verificar se o evento existe
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      // Verificar se o usuário é o criador do evento
      if (event.creatorId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para excluir este evento" });
      }
      
      // Obter participantes do evento para enviar notificações
      const participants = await storage.getParticipants(eventId);
      
      // Excluir o evento
      await storage.removeEvent(eventId);
      
      // Enviar notificações para os participantes
      if (participants && participants.length > 0) {
        try {
          // Criar notificação
          const notification = await storage.createNotification({
            title: "Evento cancelado",
            message: `O evento "${event.name}" foi cancelado pelo organizador.`,
            type: "event_canceled",
            createdAt: new Date(),
            eventId: eventId
          });
          
          // Obter IDs dos participantes
          const participantIds = participants.map(p => p.userId);
          
          // Adicionar destinatários à notificação
          if (participantIds.length > 0) {
            await storage.addNotificationRecipients(notification.id, participantIds);
          }
        } catch (notifError) {
          console.error("Erro ao enviar notificações sobre evento cancelado:", notifError);
          // Não interrompemos o fluxo principal se as notificações falharem
        }
      }
      
      // Responder com sucesso
      res.status(200).json({ message: "Evento excluído com sucesso" });
    } catch (error) {
      console.error(`Erro ao excluir evento ${eventId}:`, error);
      res.status(500).json({ message: "Erro ao excluir evento" });
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
  
  /**
   * Rotas de Chat para Eventos
   */
  // Sistema de monitoramento específico para o chat
  const monitorChatError = (operation: string, error: any, eventId: number, userId: number) => {
    console.error(`[ERRO-CHAT] ${operation} - Evento: ${eventId}, Usuário: ${userId}`, error);
    
    // Se o sistema de monitoramento de erros estiver disponível, registre o erro lá também
    if (typeof logError === 'function') {
      try {
        logError(
          ErrorType.GENERAL, 
          ErrorSeverity.ERROR, 
          'chat_system', 
          `Erro na operação ${operation} de chat`, 
          { 
            eventId, 
            userId,
            errorMessage: error.message || String(error),
            stack: error.stack
          }
        );
      } catch (e) {
        console.error("Erro ao registrar erro de chat no sistema de monitoramento:", e);
      }
    }
  };
  
  // Rota para obter mensagens de chat de um evento
  app.get("/api/events/:id/chat", ensureAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Verificar se o evento existe
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      // Verificar se o evento é do tipo que permite chat (apenas experienciar)
      if (event.eventType !== 'private_application') {
        return res.status(403).json({ 
          message: "Chat só está disponível para eventos do tipo 'Experienciar'" 
        });
      }
      
      // Verificar se o usuário é participante ou criador do evento
      const isCreator = event.creatorId === userId;
      
      // Para facilitar a depuração, vamos tratar esta verificação com mais robustez
      let participation = null;
      let isParticipant = isCreator; // O criador sempre é participante
      
      try {
        participation = await storage.getParticipation(eventId, userId);
        // Adicionar à verificação - participação tem que ser aprovada
        isParticipant = isParticipant || (participation && participation.status === "approved");
      } catch (participationErr) {
        // Log informativo para ajudar na depuração
        console.log(`[INFO] Usuário ${userId} não tem participação no evento ${eventId}`);
      }
      
      // Verificação adicional de segurança
      if (!isParticipant) {
        // Mensagem mais informativa
        const errorMsg = isCreator 
          ? "Erro inesperado na verificação de permissões" // Nunca deveria acontecer
          : "Apenas participantes aprovados ou o criador podem acessar o chat do evento";
        
        return res.status(403).json({ message: errorMsg });
      }
      
      // Log de acesso ao chat (debug)
      console.log(`Usuário ${userId} acessando chat do evento ${eventId}`);
      
      // Obter mensagens
      let messages = await storage.getChatMessagesByEvent(eventId);
      
      // Se o usuário não é o criador do evento, filtrar mensagens com base na data de ingresso
      if (!isCreator && participation) {
        // Filtrar apenas mensagens enviadas após a data de entrada do usuário no evento
        messages = messages.filter(message => {
          // Se a mensagem não tem data de envio, não deveria aparecer
          if (!message.sentAt) return false;
          
          // Se o participante não tem data de criação (improvável), mas devemos tratar
          if (!participation.createdAt) return true;
          
          // Converter para Date para comparação
          const messageSentAt = new Date(message.sentAt);
          const participationCreatedAt = new Date(participation.createdAt);
          
          // Retornar apenas mensagens posteriores à entrada do usuário
          return messageSentAt >= participationCreatedAt;
        });
        
        console.log(`Filtrado mensagens para usuário ${userId}: Total de ${messages.length} mensagens após sua entrada em ${participation.createdAt}`);
      }
      
      // Carregar informações dos usuários para cada mensagem
      const messagesWithUserInfo = await Promise.all(
        messages.map(async (message) => {
          const user = await storage.getUser(message.senderId);
          return {
            ...message,
            user: user ? {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImage: user.profileImage
            } : null
          };
        })
      );
      
      res.json(messagesWithUserInfo);
    } catch (error) {
      monitorChatError('get_messages', error, parseInt(req.params.id), req.user!.id);
      res.status(500).json({ message: "Erro ao buscar mensagens de chat" });
    }
  });
  
  // Rota para enviar nova mensagem de chat
  app.post("/api/events/:id/chat", ensureAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Verificar se o evento existe
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      // Verificar se o evento é do tipo que permite chat (apenas experienciar)
      if (event.eventType !== 'private_application') {
        return res.status(403).json({ 
          message: "Chat só está disponível para eventos do tipo 'Experienciar'" 
        });
      }
      
      // Verificar se o usuário é participante ou criador do evento
      const isCreator = event.creatorId === userId;
      
      // Para facilitar a depuração, vamos tratar esta verificação com mais robustez
      let participation = null;
      let isParticipant = isCreator; // O criador sempre é participante
      
      try {
        participation = await storage.getParticipation(eventId, userId);
        // Adicionar à verificação - participação tem que ser aprovada
        isParticipant = isParticipant || (participation && participation.status === "approved");
      } catch (participationErr) {
        // Log informativo para ajudar na depuração
        console.log(`[INFO] Usuário ${userId} não tem participação no evento ${eventId} para enviar mensagem`);
      }
      
      // Esta verificação é crítica para envio de mensagens
      if (!isParticipant) {
        // Mensagem mais informativa, útil para depuração
        const errorMsg = isCreator 
          ? "Erro inesperado na verificação de permissões para envio de mensagens" // Nunca deveria acontecer
          : `Apenas participantes aprovados ou o criador podem enviar mensagens no chat. Status atual: ${participation ? participation.status : 'sem participação'}`;
        
        return res.status(403).json({ message: errorMsg });
      }
      
      // Validar a mensagem
      const messageData = insertChatMessageSchema.parse({
        ...req.body,
        eventId,
        senderId: userId
      });
      
      // Criar a mensagem
      const message = await storage.createChatMessage(messageData);
      
      // Log de mensagem enviada (debug)
      console.log(`Usuário ${userId} enviou mensagem no chat do evento ${eventId}`);
      
      // Buscar informações do usuário para incluir na resposta
      const user = await storage.getUser(userId);
      
      res.status(201).json({
        ...message,
        user: user ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImage: user.profileImage
        } : null
      });
    } catch (error) {
      monitorChatError('send_message', error, parseInt(req.params.id), req.user!.id);
      
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Dados da mensagem inválidos", 
          errors: fromZodError(error).message
        });
      }
      
      res.status(500).json({ message: "Erro ao enviar mensagem de chat" });
    }
  });

  // Criar servidor HTTP
  const httpServer = createServer(app);
  return httpServer;
}