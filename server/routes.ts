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
  
  // API para obter detalhes de um usuário específico
  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Remover campos sensíveis antes de enviar
      const { password, ...safeUser } = user;
      return res.json(safeUser);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  });
  
  // Middleware para verificar autenticação nas rotas protegidas
  const ensureAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Não autorizado" });
  };
  
  // Middleware para verificar se o usuário é administrador
  const ensureAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autorizado" });
    }
    
    if (!req.user.isAdmin && !req.user.isSuperAdmin) {
      return res.status(403).json({ message: "Permissão negada. Acesso restrito a administradores." });
    }
    
    return next();
  };
  
  // Helper para transformar rotas para o formato da aplicação
  // Permite usar ambos formatos sem modificar o frontend
  const createEndpointAlias = (app: Express, originalPath: string, aliasPath: string, methods: string[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) => {
    methods.forEach(method => {
      const methodLower = method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
      if (typeof app[methodLower] === 'function') {
        app[methodLower](aliasPath, (req: any, res: any, next: any) => {
          // Apenas redirecionar a rota internamente
          req.url = originalPath;
          next();
        });
      }
    });
  };

  /**
   * API de Categorias
   */
  
  // Obtém todas as categorias de eventos
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      console.log("Categorias recuperadas do storage:", categories);
      res.json(categories);
    } catch (err) {
      console.error("Erro ao buscar categorias:", err);
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
          
          // Obtém o criador do evento
          const creator = await storage.getUser(event.creatorId);
          
          return {
            ...event,
            category: categoria,
            creator: creator ? {
              id: creator.id,
              firstName: creator.firstName,
              lastName: creator.lastName,
              profileImage: creator.profileImage
            } : null
          };
        })
      );
      
      console.log(`Retornando ${eventsWithCategories.length} eventos`);
      res.json(eventsWithCategories);
    } catch (err) {
      console.error("Erro ao buscar eventos:", err);
      res.status(500).json({ message: "Erro ao buscar eventos" });
    }
  });
  
  // Pesquisa de eventos
  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ message: "Parâmetro de pesquisa 'q' é obrigatório" });
      }
      
      // Busca todos os eventos
      const allEvents = await storage.getEvents();
      const categories = await storage.getCategories();
      
      // Normaliza a string de busca (remove acentos, converte para lowercase)
      const normalizedQuery = query.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      
      // Filtra eventos baseado na pesquisa
      const filteredEvents = allEvents.filter(event => {
        // Normaliza os campos do evento
        const normalizedName = event.name 
          ? event.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          : "";
        
        const normalizedDescription = event.description 
          ? event.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          : "";
        
        const normalizedLocation = event.location 
          ? event.location.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          : "";
        
        // Verifica se o termo de pesquisa está presente em algum dos campos
        return (
          normalizedName.includes(normalizedQuery) ||
          normalizedDescription.includes(normalizedQuery) ||
          normalizedLocation.includes(normalizedQuery)
        );
      });
      
      // Adiciona detalhes completos aos eventos filtrados
      const eventsWithDetails = await Promise.all(
        filteredEvents.map(async (event) => {
          // Obtém a categoria
          const category = categories.find(cat => cat.id === event.categoryId);
          
          // Obtém o criador
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
      
      console.log(`Pesquisa por "${query}" retornou ${eventsWithDetails.length} resultados`);
      res.json(eventsWithDetails);
    } catch (err) {
      console.error("Erro na pesquisa de eventos:", err);
      res.status(500).json({ message: "Erro ao pesquisar eventos" });
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
  
  // Atualiza um evento existente
  app.put("/api/events/:id", ensureAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      
      // Verifica se o evento existe
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      // Verifica se o usuário é o criador do evento
      if (event.creatorId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para editar este evento" });
      }
      
      // Valida os dados do evento
      const eventData = insertEventSchema.partial().parse(req.body);
      
      // Atualiza o evento
      const updatedEvent = await storage.updateEvent(eventId, eventData);
      
      // Obtém os detalhes da categoria
      const categoriasArray = await storage.getCategories();
      const categoria = categoriasArray.find(cat => cat.id === updatedEvent.categoryId);
      
      res.json({
        ...updatedEvent,
        category: categoria
      });
    } catch (err) {
      if (err instanceof ZodError) {
        const validationError = fromZodError(err);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Erro ao atualizar evento" });
    }
  });
  
  // Exclui um evento existente
  app.delete("/api/events/:id", ensureAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      
      // Verifica se o evento existe
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      // Verifica se o usuário é o criador do evento
      if (event.creatorId !== req.user!.id) {
        return res.status(403).json({ message: "Você não tem permissão para excluir este evento" });
      }
      
      // Remove o evento e suas participações
      await storage.removeEvent(eventId);
      
      res.status(200).json({ message: "Evento excluído com sucesso" });
    } catch (err) {
      console.error("Erro ao excluir evento:", err);
      res.status(500).json({ message: "Erro ao excluir evento" });
    }
  });
  
  /**
   * API de Eventos do Usuário
   */
  
  // Obtém eventos criados pelo usuário autenticado
  app.get("/api/user/events/created", ensureAuthenticated, async (req, res) => {
    try {
      const events = await storage.getEventsByCreator(req.user!.id);
      
      // Obtém os detalhes das categorias e criador para cada evento
      const eventsWithDetails = await Promise.all(
        events.map(async (event) => {
          const categoriasArray = await storage.getCategories();
          const categoria = categoriasArray.find(cat => cat.id === event.categoryId);
          
          // Adiciona participantes
          const participants = await storage.getParticipants(event.id);
          const participantsWithUsers = await Promise.all(
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
            category: categoria,
            creator: {
              id: req.user!.id,
              firstName: req.user!.firstName,
              lastName: req.user!.lastName,
              profileImage: req.user!.profileImage
            },
            participants: participantsWithUsers
          };
        })
      );
      
      console.log("Eventos criados pelo usuário:", eventsWithDetails);
      res.json(eventsWithDetails);
    } catch (err) {
      console.error("Erro ao buscar eventos criados:", err);
      res.status(500).json({ message: "Erro ao buscar eventos criados" });
    }
  });
  
  // Obtém eventos que o usuário está participando
  app.get("/api/user/events/participating", ensureAuthenticated, async (req, res) => {
    try {
      // Obtém todos os eventos
      const allEvents = await storage.getEvents();
      const categories = await storage.getCategories();
      
      // Para cada evento, verifica se o usuário está participando
      const participations = [];
      
      for (const event of allEvents) {
        const participation = await storage.getParticipation(event.id, req.user!.id);
        
        if (participation) {
          // Obtém o criador do evento
          const creator = await storage.getUser(event.creatorId);
          
          // Adiciona categoria ao evento
          const category = categories.find(cat => cat.id === event.categoryId);
          
          participations.push({
            id: participation.id,
            status: participation.status,
            event: {
              ...event,
              category,
              creator: creator ? {
                id: creator.id,
                firstName: creator.firstName,
                lastName: creator.lastName,
                profileImage: creator.profileImage
              } : null
            }
          });
        }
      }
      
      console.log("Participações do usuário:", participations);
      res.json(participations);
    } catch (err) {
      console.error("Erro ao buscar participações:", err);
      res.status(500).json({ message: "Erro ao buscar eventos que você está participando" });
    }
  });
  
  // Obtém eventos que o usuário está seguindo
  app.get("/api/user/events/following", ensureAuthenticated, async (req, res) => {
    try {
      // Simulação - na versão atual, os eventos seguidos são apenas os que o usuário é participante
      // Num sistema real, teria uma tabela à parte para eventos seguidos
      
      // Obtém todos os eventos
      const allEvents = await storage.getEvents();
      const categories = await storage.getCategories();
      
      // Para cada evento, cria uma lista de seguidos (atualmente são os mesmos que participa)
      const followedEvents = [];
      
      for (const event of allEvents) {
        const participation = await storage.getParticipation(event.id, req.user!.id);
        
        // Se está participando, considera como seguindo
        if (participation && participation.status === "approved") {
          // Obtém o criador do evento
          const creator = await storage.getUser(event.creatorId);
          
          // Adiciona categoria ao evento
          const category = categories.find(cat => cat.id === event.categoryId);
          
          followedEvents.push({
            ...event,
            category,
            creator: creator ? {
              id: creator.id,
              firstName: creator.firstName,
              lastName: creator.lastName,
              profileImage: creator.profileImage
            } : null
          });
        }
      }
      
      console.log("Eventos seguidos pelo usuário:", followedEvents);
      res.json(followedEvents);
    } catch (err) {
      console.error("Erro ao buscar eventos seguidos:", err);
      res.status(500).json({ message: "Erro ao buscar eventos seguidos" });
    }
  });
  
  // Seguir um evento
  app.post("/api/events/:id/follow", ensureAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      
      // Verifica se o evento existe
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      // Na versão atual, seguir é o mesmo que participar com status approved
      // Se já estiver participando, atualiza o status para approved
      const existingParticipation = await storage.getParticipation(eventId, req.user!.id);
      
      if (existingParticipation) {
        // Atualiza para approved se não estiver
        if (existingParticipation.status !== "approved") {
          await storage.updateParticipationStatus(existingParticipation.id, "approved");
        }
        
        return res.status(200).json({ message: "Agora você está seguindo este evento" });
      }
      
      // Se não estiver participando, cria uma participação com status approved
      const participationData = {
        eventId,
        userId: req.user!.id,
        status: "approved"
      };
      
      await storage.createParticipation(participationData);
      
      res.status(200).json({ message: "Agora você está seguindo este evento" });
    } catch (err) {
      console.error("Erro ao seguir evento:", err);
      res.status(500).json({ message: "Erro ao seguir evento" });
    }
  });
  
  // Deixar de seguir um evento
  app.delete("/api/events/:id/follow", ensureAuthenticated, async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      
      // Verifica se existe a participação
      const participation = await storage.getParticipation(eventId, req.user!.id);
      if (!participation) {
        return res.status(404).json({ message: "Você não está seguindo este evento" });
      }
      
      // Remove a participação (deixa de seguir)
      await storage.removeParticipation(participation.id);
      
      res.status(200).json({ message: "Você deixou de seguir este evento" });
    } catch (err) {
      console.error("Erro ao deixar de seguir evento:", err);
      res.status(500).json({ message: "Erro ao deixar de seguir evento" });
    }
  });
  
  /**
   * API de Participação em Eventos
   */
  
  // Endpoints específicos para aprovar e rejeitar candidaturas
  app.patch("/api/participants/:id/approve", ensureAuthenticated, async (req, res) => {
    try {
      const participationId = parseInt(req.params.id);
      
      // Busca a participação para obter informações do usuário
      const existingParticipation = await storage.getParticipant(participationId);
      if (!existingParticipation) {
        return res.status(404).json({ message: "Participação não encontrada" });
      }
      
      // Atualiza o status
      const participation = await storage.updateParticipationStatus(participationId, "approved");
      
      // Busca dados do usuário para a notificação
      const user = await storage.getUser(participation.userId);
      const event = await storage.getEvent(participation.eventId);
      
      // Retorna informações adicionais para exibição de notificação
      res.json({
        ...participation,
        notification: {
          title: "Candidatura Aprovada!",
          message: `Candidatura para o evento "${event?.name}" foi aprovada.`,
          user: user ? {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          } : null,
          event: event ? {
            name: event.name,
            date: event.date
          } : null
        }
      });
    } catch (err) {
      console.error("Erro ao aprovar candidatura:", err);
      res.status(500).json({ message: "Erro ao aprovar candidatura" });
    }
  });
  
  app.patch("/api/participants/:id/reject", ensureAuthenticated, async (req, res) => {
    try {
      const participationId = parseInt(req.params.id);
      
      // Busca a participação para obter informações do usuário
      const existingParticipation = await storage.getParticipant(participationId);
      if (!existingParticipation) {
        return res.status(404).json({ message: "Participação não encontrada" });
      }
      
      // Atualiza o status
      const participation = await storage.updateParticipationStatus(participationId, "rejected");
      
      // Busca dados do usuário para a notificação
      const user = await storage.getUser(participation.userId);
      const event = await storage.getEvent(participation.eventId);
      
      // Retorna informações adicionais para exibição de notificação
      res.json({
        ...participation,
        notification: {
          title: "Candidatura Recusada",
          message: `Candidatura para o evento "${event?.name}" foi recusada.`,
          user: user ? {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          } : null,
          event: event ? {
            name: event.name,
            date: event.date
          } : null
        }
      });
    } catch (err) {
      console.error("Erro ao rejeitar candidatura:", err);
      res.status(500).json({ message: "Erro ao rejeitar candidatura" });
    }
  });
  
  // Remove um candidato (independente do status)
  app.delete("/api/participants/:id/remove", ensureAuthenticated, async (req, res) => {
    try {
      const participationId = parseInt(req.params.id);
      
      // Busca a participação para obter informações do usuário
      const existingParticipation = await storage.getParticipant(participationId);
      if (!existingParticipation) {
        return res.status(404).json({ message: "Participação não encontrada" });
      }

      // Obtém detalhes para a notificação antes de remover
      const user = await storage.getUser(existingParticipation.userId);
      const event = await storage.getEvent(existingParticipation.eventId);
      
      // Remove a participação
      await storage.removeParticipation(participationId);
      
      // Retorna informações adicionais para exibição de notificação
      res.json({
        participationId,
        notification: {
          title: "Participante Removido",
          message: `O participante foi removido do evento "${event?.name}".`,
          user: user ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          } : null,
          event: event ? {
            id: event.id,
            name: event.name,
            date: event.date
          } : null
        }
      });
    } catch (err) {
      console.error("Erro ao remover participante:", err);
      res.status(500).json({ message: "Erro ao remover participante" });
    }
  });
  
  // Reverte um candidato rejeitado para pendente
  app.patch("/api/participants/:id/revert", ensureAuthenticated, async (req, res) => {
    try {
      const participationId = parseInt(req.params.id);
      
      // Busca a participação para obter informações do usuário
      const existingParticipation = await storage.getParticipant(participationId);
      if (!existingParticipation) {
        return res.status(404).json({ message: "Participação não encontrada" });
      }
      
      // Verifica se o status é rejeitado
      if (existingParticipation.status !== "rejected") {
        return res.status(400).json({ message: "Apenas candidaturas rejeitadas podem ser revertidas" });
      }
      
      // Atualiza o status
      const participation = await storage.updateParticipationStatus(participationId, "pending");
      
      // Busca dados do usuário para a notificação
      const user = await storage.getUser(participation.userId);
      const event = await storage.getEvent(participation.eventId);
      
      // Retorna informações adicionais para exibição de notificação
      res.json({
        ...participation,
        notification: {
          title: "Candidatura Revertida",
          message: `A candidatura para o evento "${event?.name}" foi revertida para análise.`,
          user: user ? {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          } : null,
          event: event ? {
            name: event.name,
            date: event.date
          } : null
        }
      });
    } catch (err) {
      console.error("Erro ao reverter candidatura:", err);
      res.status(500).json({ message: "Erro ao reverter candidatura" });
    }
  });
  
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
      
      // Verifica se o usuário é o criador do evento
      if (event.creatorId === userId) {
        return res.status(400).json({ message: "Você não pode participar do seu próprio evento como participante" });
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
      
      // Busca a participação para obter informações do usuário
      const existingParticipation = await storage.getParticipant(participationId);
      if (!existingParticipation) {
        return res.status(404).json({ message: "Participação não encontrada" });
      }
      
      // Atualiza o status
      const participation = await storage.updateParticipationStatus(participationId, status);
      
      // Busca dados do usuário para a notificação
      const user = await storage.getUser(participation.userId);
      const event = await storage.getEvent(participation.eventId);
      
      // Retorna informações adicionais para exibição de notificação
      res.json({
        ...participation,
        notification: {
          title: status === "approved" ? "Candidatura Aprovada!" : "Candidatura Recusada",
          message: status === "approved" 
            ? `Sua candidatura para o evento "${event?.name}" foi aprovada.` 
            : `Sua candidatura para o evento "${event?.name}" foi recusada.`,
          user: user ? {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          } : null,
          event: event ? {
            name: event.name,
            date: event.date
          } : null
        }
      });
    } catch (err) {
      console.error("Erro ao atualizar status de participação:", err);
      res.status(500).json({ message: "Erro ao atualizar status de participação" });
    }
  });

  /**
   * API de compartilhamento de eventos
   */
   
  // Gera um link de compartilhamento para um evento
  app.get("/api/events/:id/share", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      
      // Verifica se o evento existe
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      // Obtém os detalhes da categoria
      const categoriasArray = await storage.getCategories();
      const categoria = categoriasArray.find(cat => cat.id === event.categoryId);
      
      // Obtém o criador do evento
      const creator = await storage.getUser(event.creatorId);
      
  /**
   * API de co-organizadores de eventos
   */
  
  // Middleware para verificar se o usuário é criador ou co-organizador do evento
  const checkEventPermission = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autorizado" });
    }
    
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "ID de evento inválido" });
      }
      
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      const userId = req.user!.id;
      
      // Verifica se é o criador do evento
      if (event.creatorId === userId) {
        return next();
      }
      
      // Verifica se é co-organizador do evento
      const coOrganizers = await storage.getEventCoOrganizers(eventId);
      const isCoOrganizer = coOrganizers.some(coOrg => coOrg.id === userId);
      
      if (isCoOrganizer) {
        return next();
      }
      
      // Não é criador nem co-organizador
      return res.status(403).json({ message: "Você não tem permissão para gerenciar este evento" });
    } catch (err) {
      console.error("Erro ao verificar permissões do evento:", err);
      return res.status(500).json({ message: "Erro ao verificar permissões do evento" });
    }
  };
  
  // Lista co-organizadores de um evento
  app.get("/api/events/:eventId/co-organizers", async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "ID de evento inválido" });
      }
      
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      const coOrganizers = await storage.getEventCoOrganizers(eventId);
      res.json(coOrganizers);
    } catch (err) {
      console.error("Erro ao buscar co-organizadores:", err);
      res.status(500).json({ message: "Erro ao buscar co-organizadores" });
    }
  });
  
  // Lista convites de co-organizadores para um evento
  app.get("/api/events/:eventId/co-organizer-invites", checkEventPermission, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const invites = await storage.getEventCoOrganizerInvites(eventId);
      res.json(invites);
    } catch (err) {
      console.error("Erro ao buscar convites de co-organizadores:", err);
      res.status(500).json({ message: "Erro ao buscar convites de co-organizadores" });
    }
  });
  
  // Envia um convite para co-organizador
  app.post("/api/events/:eventId/co-organizer-invites", checkEventPermission, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const { email, message } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "E-mail é obrigatório" });
      }
      
      // Criar o convite
      const invite = await storage.createEventCoOrganizerInvite(
        { email, message },
        req.user!.id,
        eventId
      );
      
      // Em uma implementação real, enviaríamos um e-mail aqui
      // Aqui estamos apenas simulando o envio
      console.log(`Simulando envio de e-mail para ${email} com token ${invite.token}`);
      
      res.status(201).json(invite);
    } catch (err) {
      console.error("Erro ao criar convite de co-organizador:", err);
      if (err instanceof Error) {
        res.status(400).json({ message: err.message });
      } else {
        res.status(500).json({ message: "Erro ao criar convite de co-organizador" });
      }
    }
  });
  
  // Reenvia um convite para co-organizador
  app.post("/api/events/:eventId/co-organizer-invites/:id/resend", checkEventPermission, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const inviteId = parseInt(req.params.id);
      
      const invite = await storage.getEventCoOrganizerInvite(inviteId);
      if (!invite) {
        return res.status(404).json({ message: "Convite não encontrado" });
      }
      
      if (invite.eventId !== eventId) {
        return res.status(403).json({ message: "Convite não pertence a este evento" });
      }
      
      if (invite.status !== 'pending') {
        return res.status(400).json({ message: "Apenas convites pendentes podem ser reenviados" });
      }
      
      // Em uma implementação real, enviaríamos o e-mail novamente aqui
      // Aqui estamos apenas simulando o reenvio
      console.log(`Simulando reenvio de e-mail para ${invite.email} com token ${invite.token}`);
      
      res.json({ message: "Convite reenviado com sucesso" });
    } catch (err) {
      console.error("Erro ao reenviar convite:", err);
      res.status(500).json({ message: "Erro ao reenviar convite" });
    }
  });
  
  // Cancela um convite de co-organizador
  app.delete("/api/events/:eventId/co-organizer-invites/:id", checkEventPermission, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const inviteId = parseInt(req.params.id);
      
      const invite = await storage.getEventCoOrganizerInvite(inviteId);
      if (!invite) {
        return res.status(404).json({ message: "Convite não encontrado" });
      }
      
      if (invite.eventId !== eventId) {
        return res.status(403).json({ message: "Convite não pertence a este evento" });
      }
      
      await storage.removeEventCoOrganizerInvite(inviteId);
      res.json({ message: "Convite removido com sucesso" });
    } catch (err) {
      console.error("Erro ao remover convite:", err);
      res.status(500).json({ message: "Erro ao remover convite" });
    }
  });
  
  // Aceita um convite de co-organizador
  app.post("/api/events/:eventId/co-organizer-invites/:id/accept", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autorizado" });
    }
    
    try {
      const eventId = parseInt(req.params.eventId);
      const inviteId = parseInt(req.params.id);
      
      const invite = await storage.getEventCoOrganizerInvite(inviteId);
      if (!invite) {
        return res.status(404).json({ message: "Convite não encontrado" });
      }
      
      if (invite.eventId !== eventId) {
        return res.status(403).json({ message: "Convite não pertence a este evento" });
      }
      
      if (invite.status !== 'pending') {
        return res.status(400).json({ message: "Este convite já foi respondido" });
      }
      
      // Verificar se o e-mail do convite corresponde ao e-mail do usuário
      const user = req.user!;
      if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
        return res.status(403).json({ message: "Este convite foi enviado para outro e-mail" });
      }
      
      // Aceitar o convite
      await storage.updateEventCoOrganizerInviteStatus(inviteId, 'accepted', user.id);
      
      res.json({ message: "Convite aceito com sucesso" });
    } catch (err) {
      console.error("Erro ao aceitar convite:", err);
      res.status(500).json({ message: "Erro ao aceitar convite" });
    }
  });
  
  // Rejeita um convite de co-organizador
  app.post("/api/events/:eventId/co-organizer-invites/:id/reject", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autorizado" });
    }
    
    try {
      const eventId = parseInt(req.params.eventId);
      const inviteId = parseInt(req.params.id);
      
      const invite = await storage.getEventCoOrganizerInvite(inviteId);
      if (!invite) {
        return res.status(404).json({ message: "Convite não encontrado" });
      }
      
      if (invite.eventId !== eventId) {
        return res.status(403).json({ message: "Convite não pertence a este evento" });
      }
      
      if (invite.status !== 'pending') {
        return res.status(400).json({ message: "Este convite já foi respondido" });
      }
      
      // Verificar se o e-mail do convite corresponde ao e-mail do usuário
      const user = req.user!;
      if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
        return res.status(403).json({ message: "Este convite foi enviado para outro e-mail" });
      }
      
      // Rejeitar o convite
      await storage.updateEventCoOrganizerInviteStatus(inviteId, 'rejected', user.id);
      
      res.json({ message: "Convite rejeitado com sucesso" });
    } catch (err) {
      console.error("Erro ao rejeitar convite:", err);
      res.status(500).json({ message: "Erro ao rejeitar convite" });
    }
  });
  
  // Remove um co-organizador do evento
  app.delete("/api/events/:eventId/co-organizers/:userId", checkEventPermission, async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const userId = parseInt(req.params.userId);
      
      const event = await storage.getEvent(eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      // Apenas o criador pode remover co-organizadores
      if (event.creatorId !== req.user!.id) {
        return res.status(403).json({ message: "Apenas o criador do evento pode remover co-organizadores" });
      }
      
      await storage.removeEventCoOrganizer(eventId, userId);
      res.json({ message: "Co-organizador removido com sucesso" });
    } catch (err) {
      console.error("Erro ao remover co-organizador:", err);
      if (err instanceof Error) {
        res.status(400).json({ message: err.message });
      } else {
        res.status(500).json({ message: "Erro ao remover co-organizador" });
      }
    }
  });
      
      // URL base da aplicação (em produção seria o domínio real)
      const baseUrl = req.protocol + '://' + req.get('host');
      
      // Parâmetros da URL para abrir o modal diretamente
      const shareParams = new URLSearchParams();
      shareParams.append('modal', 'event');
      shareParams.append('eventId', eventId.toString());
      
      // Link completo de compartilhamento
      const shareLink = `${baseUrl}/?${shareParams.toString()}`;
      
      // Informações para compartilhamento em redes sociais
      const shareData = {
        link: shareLink,
        title: `${event.name} - ${event.date}`,
        description: event.description.substring(0, 100) + (event.description.length > 100 ? '...' : ''),
        image: event.coverImage || null,
        event: {
          id: event.id,
          name: event.name,
          date: event.date,
          time: event.timeStart,
          location: event.location,
          category: categoria?.name || '',
          creator: creator ? `${creator.firstName} ${creator.lastName}` : ''
        }
      };
      
      res.json(shareData);
    } catch (err) {
      console.error("Erro ao gerar link de compartilhamento:", err);
      res.status(500).json({ message: "Erro ao gerar link de compartilhamento" });
    }
  });
  
  /**
   * API de perfil do usuário
   */

  // Atualiza o perfil do usuário
  app.patch("/api/user/profile", ensureAuthenticated, async (req, res) => {
    try {
      // Atualiza os dados no storage
      const userId = req.user!.id;
      const userData = { ...req.body };
      
      // Aqui deveria haver uma validação com updateUserProfileSchema
      // const validatedData = updateUserProfileSchema.parse(userData);
      
      // Simulação de atualização (na implementação real, seria updatedUser = await storage.updateUser(userId, validatedData))
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Atualiza os campos editáveis
      const updatedUser = {
        ...user,
        ...userData,
      };
      
      // Na implementação real seria persistido no banco de dados
      // Por enquanto, apenas retornamos o usuário atualizado
      // e ficamos confiando que o frontend vai manter o estado correto
      
      // Apenas para retornar como JSON, não como HTML
      res.setHeader('Content-Type', 'application/json');
      return res.json(updatedUser);
    } catch (err) {
      console.error("Erro ao atualizar perfil:", err);
      res.status(500).json({ message: "Erro ao atualizar perfil" });
    }
  });
  
  // Cria servidor HTTP
  /**
   * Rotas administrativas para verificação de documentos
   */
  
  // Rota para administradores listarem usuários pendentes de verificação de documentos
  app.get("/api/admin/documents/pending", ensureAdmin, async (req, res) => {
    try {
      // Obtém todos os usuários
      const allUsers = Array.from(storage.usersMap.values());
      
      // Filtra usuários com documentos pendentes de verificação
      const pendingUsers = allUsers.filter(user => 
        // Verifica se o usuário enviou documentos mas ainda não foram verificados
        (user.documentRgImage || user.documentCpfImage || user.documentSelfieImage) &&
        user.documentVerified === false
      );
      
      // Remove informações sensíveis antes de enviar
      const safeUsers = pendingUsers.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      res.json(safeUsers);
    } catch (err) {
      console.error("Erro ao listar documentos pendentes:", err);
      res.status(500).json({ message: "Erro ao listar documentos pendentes" });
    }
  });
  
  // Rota para aprovar documentos de um usuário
  app.post("/api/admin/documents/:userId/approve", ensureAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Atualiza status de verificação do usuário
      const updatedUser = await storage.updateUser(userId, {
        documentVerified: true,
        documentReviewedAt: new Date(),
        documentReviewedBy: req.user?.id || null,
        documentRejectionReason: null
      });
      
      // Remove informações sensíveis antes de enviar
      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (err) {
      console.error("Erro ao aprovar documentos:", err);
      res.status(500).json({ message: "Erro ao aprovar documentos" });
    }
  });
  
  // Rota para rejeitar documentos de um usuário
  app.post("/api/admin/documents/:userId/reject", ensureAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { rejectionReason } = req.body;
      
      if (!rejectionReason) {
        return res.status(400).json({ message: "Motivo da rejeição é obrigatório" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Atualiza status de verificação do usuário
      const updatedUser = await storage.updateUser(userId, {
        documentVerified: false,
        documentReviewedAt: new Date(),
        documentReviewedBy: req.user?.id || null,
        documentRejectionReason: rejectionReason
      });
      
      // Remove informações sensíveis antes de enviar
      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (err) {
      console.error("Erro ao rejeitar documentos:", err);
      res.status(500).json({ message: "Erro ao rejeitar documentos" });
    }
  });
  
  // Rota para administradores verificarem estatísticas gerais do sistema
  app.get("/api/admin/stats", ensureAdmin, async (req, res) => {
    try {
      // Obtém todos os usuários e eventos
      const allUsers = Array.from(storage.usersMap.values());
      const allEvents = await storage.getEvents();
      
      // Calcula estatísticas
      const totalUsers = allUsers.length;
      const verifiedUsers = allUsers.filter(user => user.documentVerified).length;
      const pendingVerification = allUsers.filter(user => 
        (user.documentRgImage || user.documentCpfImage || user.documentSelfieImage) &&
        !user.documentVerified
      ).length;
      
      const totalEvents = allEvents.length;
      const activeEvents = allEvents.filter(event => event.isActive).length;
      const upcomingEvents = allEvents.filter(event => {
        const eventDate = new Date(event.date);
        const today = new Date();
        return eventDate > today && event.isActive;
      }).length;
      
      // Eventos por categoria
      const eventsByCategory = {};
      const categories = await storage.getCategories();
      
      for (const category of categories) {
        const eventsInCategory = allEvents.filter(event => event.categoryId === category.id).length;
        eventsByCategory[category.name] = eventsInCategory;
      }
      
      res.json({
        users: {
          total: totalUsers,
          verified: verifiedUsers,
          pendingVerification: pendingVerification
        },
        events: {
          total: totalEvents,
          active: activeEvents,
          upcoming: upcomingEvents,
          byCategory: eventsByCategory
        },
        timestamp: new Date()
      });
    } catch (err) {
      console.error("Erro ao obter estatísticas:", err);
      res.status(500).json({ message: "Erro ao obter estatísticas" });
    }
  });

  const httpServer = createServer(app);
  
  return httpServer;
}
