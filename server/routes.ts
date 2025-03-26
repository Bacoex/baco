import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { insertEventSchema, insertEventParticipantSchema } from "@shared/schema";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

/**
 * Registra todas as rotas da API
 * @param app - Instância do Express
 * @returns Instância do servidor HTTP
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Configura autenticação e suas rotas (/api/login, /api/register, etc.)
  setupAuth(app);
  
  // API para debug - lista todos os usuários (remover em produção)
  app.get("/api/debug/users", async (req, res) => {
    const users = Array.from(storage.usersMap.values()).map(user => {
      // Retorna uma versão segura sem o hash completo da senha
      const { password, ...safeUser } = user;
      return {
        ...safeUser,
        passwordLength: password.length,
        passwordStartsWith: password.substring(0, 20) + "..."
      };
    });
    res.json(users);
  });

  // API para debug - Verifica a autenticação de um usuário
  app.post("/api/debug/verify-password", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "CPF e senha são obrigatórios" });
    }

    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Verifica a senha usando a mesma função do auth.ts
    const scryptAsync = promisify(scrypt);
    
    try {
      const [hashed, salt] = user.password.split(".");
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = await scryptAsync(password, salt, 64) as Buffer;
      
      const isMatch = timingSafeEqual(hashedBuf, suppliedBuf);
      
      return res.json({
        isMatch,
        passwordProvided: password,
        providedSalt: salt,
        hashFromPassword: (await scryptAsync(password, salt, 64) as Buffer).toString('hex'),
        storedHash: hashed,
        doHashesMatch: (await scryptAsync(password, salt, 64) as Buffer).toString('hex') === hashed
      });
    } catch (error) {
      return res.status(500).json({ message: "Erro ao verificar senha", error: (error as Error).message });
    }
  });
  
  // Middleware para verificar autenticação nas rotas protegidas
  const ensureAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Não autorizado" });
  };

  /**
   * API de Categorias
   */
  
  // Obtém todas as categorias de eventos
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar categorias" });
    }
  });

  /**
   * API de Eventos
   */
  
  // Obtém todos os eventos
  app.get("/api/events", async (req, res) => {
    try {
      let events;
      
      if (req.query.category) {
        const category = await storage.getCategoryBySlug(req.query.category as string);
        if (category) {
          events = await storage.getEventsByCategory(category.id);
        } else {
          events = await storage.getEvents();
        }
      } else {
        events = await storage.getEvents();
      }
      
      // Obtém os detalhes das categorias para cada evento
      const eventsWithCategories = await Promise.all(
        events.map(async (event) => {
          const categoriasArray = await storage.getCategories();
          const categoria = categoriasArray.find(cat => cat.id === event.categoryId);
          return {
            ...event,
            category: categoria
          };
        })
      );
      
      res.json(eventsWithCategories);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar eventos" });
    }
  });
  
  // Obtém um evento específico
  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getEvent(parseInt(req.params.id));
      
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      // Obtém os detalhes da categoria
      const categoriasArray = await storage.getCategories();
      const categoria = categoriasArray.find(cat => cat.id === event.categoryId);
      
      // Obtém o criador do evento
      const creator = await storage.getUser(event.creatorId);
      
      // Obtém os participantes
      const participants = await storage.getParticipants(event.id);
      
      res.json({
        ...event,
        category: categoria,
        creator: creator ? {
          id: creator.id,
          firstName: creator.firstName,
          lastName: creator.lastName,
          profileImage: creator.profileImage
        } : null,
        participantsCount: participants.length
      });
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar evento" });
    }
  });
  
  // Obtém eventos criados pelo usuário logado
  app.get("/api/my-events", ensureAuthenticated, async (req, res) => {
    try {
      const events = await storage.getEventsByCreator(req.user!.id);
      
      // Obtém os detalhes das categorias para cada evento
      const eventsWithCategories = await Promise.all(
        events.map(async (event) => {
          const categoriasArray = await storage.getCategories();
          const categoria = categoriasArray.find(cat => cat.id === event.categoryId);
          return {
            ...event,
            category: categoria
          };
        })
      );
      
      res.json(eventsWithCategories);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar seus eventos" });
    }
  });
  
  // Cria um novo evento
  app.post("/api/events", ensureAuthenticated, async (req, res) => {
    try {
      // Valida os dados do evento
      const eventData = insertEventSchema.parse(req.body);
      
      // Cria o evento
      const event = await storage.createEvent(eventData, req.user!.id);
      
      // Obtém os detalhes da categoria
      const categoriasArray = await storage.getCategories();
      const categoria = categoriasArray.find(cat => cat.id === event.categoryId);
      
      res.status(201).json({
        ...event,
        category: categoria
      });
    } catch (err) {
      if (err instanceof ZodError) {
        const validationError = fromZodError(err);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Erro ao criar evento" });
    }
  });
  
  /**
   * API de Participação em Eventos
   */
  
  // Participa de um evento
  app.post("/api/events/:id/participate", ensureAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Verifica se o evento existe
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      // Verifica se já está participando
      const existingParticipation = await storage.getParticipation(eventId, userId);
      if (existingParticipation) {
        return res.status(400).json({ message: "Você já está participando deste evento" });
      }
      
      // Cria a participação
      const participationData = insertEventParticipantSchema.parse({
        eventId,
        userId,
        status: event.eventType === 'private_application' ? "pending" : "confirmed"
      });
      
      const participation = await storage.createParticipation(participationData);
      
      // Obtém o usuário para incluir na resposta
      const user = await storage.getUser(userId);
      
      res.status(201).json({
        ...participation,
        user: user ? {
          firstName: user.firstName,
          lastName: user.lastName,
          profileImage: user.profileImage
        } : null
      });
    } catch (err) {
      if (err instanceof ZodError) {
        const validationError = fromZodError(err);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Erro ao participar do evento" });
    }
  });
  
  // Cancela participação em um evento
  app.delete("/api/events/:id/cancel-participation", ensureAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Verifica se existe a participação
      const participation = await storage.getParticipation(eventId, userId);
      if (!participation) {
        return res.status(404).json({ message: "Você não está participando deste evento" });
      }
      
      // Remove a participação
      await storage.removeParticipation(participation.id);
      
      res.status(200).json({ message: "Participação cancelada com sucesso" });
    } catch (err) {
      res.status(500).json({ message: "Erro ao cancelar participação" });
    }
  });
  
  // Atualiza status de participação (para o criador do evento)
  app.patch("/api/participations/:id/status", ensureAuthenticated, async (req, res) => {
    try {
      const participationId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status inválido" });
      }
      
      // Atualiza o status
      const participation = await storage.updateParticipationStatus(participationId, status);
      
      res.json(participation);
    } catch (err) {
      res.status(500).json({ message: "Erro ao atualizar status de participação" });
    }
  });

  // Cria servidor HTTP
  const httpServer = createServer(app);
  
  return httpServer;
}
