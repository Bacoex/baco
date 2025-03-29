import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { 
  insertEventSchema, 
  insertEventParticipantSchema, 
  insertEventSubcategorySchema 
} from "@shared/schema";

/**
 * Registra todas as rotas da API
 */
export async function registerRoutes(app: Express): Promise<Server> {
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
      res.status(201).json({
        ...participation,
        user: user ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImage: user.profileImage
        } : null
      });
    } catch (err) {
      res.status(500).json({ message: "Erro ao participar do evento" });
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
   * Rotas de Notificações
   */
  app.get("/api/notifications", ensureAuthenticated, async (req, res) => {
    try {
      const notifications = await storage.getNotificationsByUser(req.user!.id);
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar notificações" });
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

  // Criar servidor HTTP
  const httpServer = createServer(app);
  return httpServer;
}