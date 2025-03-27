import { 
  users, type User, type InsertUser,
  events, type Event, type InsertEvent,
  eventCategories, type EventCategory, type InsertEventCategory,
  eventParticipants, type EventParticipant, type InsertEventParticipant
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

// Criando store para sessões em memória
const MemoryStore = createMemoryStore(session);

/**
 * Interface para o armazenamento de dados
 * Define todas as operações de CRUD necessárias para a aplicação
 */
export interface IStorage {
  // Usuários
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  updateUserGoogleId(userId: number, googleId: string): Promise<User>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;
  
  // Categorias de eventos
  getCategories(): Promise<EventCategory[]>;
  getCategoryBySlug(slug: string): Promise<EventCategory | undefined>;
  createCategory(category: InsertEventCategory): Promise<EventCategory>;
  
  // Eventos
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  getEventsByCategory(categoryId: number): Promise<Event[]>;
  getEventsByCreator(creatorId: number): Promise<Event[]>;
  createEvent(event: InsertEvent, creatorId: number): Promise<Event>;
  updateEvent(id: number, eventData: Partial<InsertEvent>): Promise<Event>;
  removeEvent(id: number): Promise<void>;
  
  // Participantes
  getParticipants(eventId: number): Promise<EventParticipant[]>;
  getParticipant(id: number): Promise<EventParticipant | undefined>;
  getParticipation(eventId: number, userId: number): Promise<EventParticipant | undefined>;
  createParticipation(participation: InsertEventParticipant): Promise<EventParticipant>;
  removeParticipation(id: number): Promise<void>;
  updateParticipationStatus(id: number, status: string): Promise<EventParticipant>;
  
  // Co-organizadores de eventos
  getEventCoOrganizers(eventId: number): Promise<User[]>;
  getEventCoOrganizerInvites(eventId: number): Promise<EventCoOrganizerInvite[]>;
  getEventCoOrganizerInvite(id: number): Promise<EventCoOrganizerInvite | undefined>;
  getEventCoOrganizerInviteByToken(token: string): Promise<EventCoOrganizerInvite | undefined>;
  createEventCoOrganizerInvite(invite: InsertEventCoOrganizerInvite, inviterId: number, eventId: number): Promise<EventCoOrganizerInvite>;
  updateEventCoOrganizerInviteStatus(id: number, status: string, inviteeId?: number): Promise<EventCoOrganizerInvite>;
  removeEventCoOrganizerInvite(id: number): Promise<void>;
  addEventCoOrganizer(eventId: number, userId: number): Promise<void>;
  removeEventCoOrganizer(eventId: number, userId: number): Promise<void>;
  
  // Sessões
  sessionStore: session.SessionStore;
}

/**
 * Implementação em memória do armazenamento de dados
 * Mantém todos os dados em estruturas Map para simular um banco de dados
 */
export class MemStorage implements IStorage {
  // Mapas acessíveis publicamente para API de debug (remover em produção)
  public usersMap: Map<number, User>;
  private categoriesMap: Map<number, EventCategory>;
  private eventsMap: Map<number, Event>;
  private participantsMap: Map<number, EventParticipant>;
  
  // IDs para autoincrementar
  private userIdCounter: number;
  private categoryIdCounter: number;
  private eventIdCounter: number;
  private participantIdCounter: number;
  
  sessionStore: session.SessionStore;
  
  constructor() {
    // Inicializa as estruturas de dados
    this.usersMap = new Map();
    this.categoriesMap = new Map();
    this.eventsMap = new Map();
    this.participantsMap = new Map();
    
    // Define os contadores iniciais
    this.userIdCounter = 2; // Iniciando em 2 para preservar o usuário com ID 1
    this.categoryIdCounter = 1;
    this.eventIdCounter = 1;
    this.participantIdCounter = 1;
    
    // Inicializa o sessionStore para armazenar sessões
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Limpa sessões expiradas a cada 24h
    });
    
    // Cria o usuário fixo com ID 1 (Kevin)
    this._createPermanentUser();
    
    // Pré-cadastra categorias de eventos comuns
    this._createInitialCategories();
    
    // Cria usuários e eventos de teste
    this._createTestUsersAndEvents();
  }
  
  /**
   * Cria um usuário permanente com ID 1
   * Este usuário (Kevin) será mantido entre reinicializações
   */
  private _createPermanentUser() {
    // Dados do usuário com ID 1 (Kevin)
    const kevinUser: User = {
      id: 1,
      username: "46318916881",
      // Hash gerada para a senha "Teste@123" usando a função hashPassword 
      password: "445c678c04146877b6fb1cd930af60213a78b098e05b8a6a4ff9dbf4ff8bafa01c6b05b851f43f27d4bb3dcb7504e8645a026013cd91901704d24ae5eeec03c0.73b9deb7c7cd0891f61221d27b10b44a",
      firstName: "Kevin",
      lastName: "Barbosa",
      email: "kevin@example.com",
      phone: "14999999999",
      birthDate: "1999-01-01",
      rg: "123456789",
      tituloEleitor: "123456789012",
      zodiacSign: "Capricórnio",
      createdAt: new Date("2023-01-01"),
      profileImage: null,
      biography: "Criador do Baco, apaixonado por tecnologia e inovação.",
      instagramUsername: "kevin.baco",
      threadsUsername: "kevin.baco",
      city: "Bauru",
      state: "SP",
      isActive: true,
      interests: null,
      emailVerified: false,
      phoneVerified: false,
      documentVerified: false,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      lastLoginIP: null,
      lastUserAgent: null,
      deviceIds: null,
      termsAcceptedAt: null,
      lastLogin: null,
      googleId: null,
      termsAccepted: true,
      privacyPolicyAccepted: true,
      dataProcessingConsent: true,
      marketingConsent: true
    };
    
    // Adiciona o usuário permanente ao mapa
    this.usersMap.set(1, kevinUser);
  }
  
  /**
   * Cria usuários e eventos iniciais para a aplicação
   */
  /**
   * Cria usuário administrador de suporte para a aplicação
   */
  private _createTestUsersAndEvents() {
    console.log("Criando usuário administrador de suporte...");
    
    // Criar usuário administrador de suporte (ID 2)
    const adminId = this.userIdCounter++;
    const adminUser: User = {
      id: adminId,
      username: "00000000000", // CPF do admin de suporte
      // Hash gerada para a senha "Admin@123" 
      password: "445c678c04146877b6fb1cd930af60213a78b098e05b8a6a4ff9dbf4ff8bafa01c6b05b851f43f27d4bb3dcb7504e8645a026013cd91901704d24ae5eeec03c0.73b9deb7c7cd0891f61221d27b10b44a",
      firstName: "Suporte",
      lastName: "Baco",
      birthDate: "2000-01-01",
      email: "suporte@bacoexperiencias.com.br",
      phone: "11999999999",
      rg: "000000000",
      tituloEleitor: "000000000000",
      zodiacSign: "Capricórnio",
      profileImage: null,
      biography: "Administrador de suporte técnico do Baco.",
      instagramUsername: "baco.suporte",
      threadsUsername: "baco.suporte",
      city: "São Paulo",
      state: "SP",
      interests: null,
      isActive: true,
      lastLogin: null,
      createdAt: new Date(),
      emailVerified: true,
      phoneVerified: true,
      documentVerified: true,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      termsAccepted: true,
      privacyPolicyAccepted: true,
      marketingConsent: true,
      dataProcessingConsent: true,
      termsAcceptedAt: new Date(),
      lastLoginIP: null,
      lastUserAgent: null,
      deviceIds: null,
      googleId: null,
      // Campos para validação de documentos
      documentRgImage: null,
      documentCpfImage: null,
      documentSelfieImage: null,
      documentRejectionReason: null,
      documentReviewedAt: null,
      documentReviewedBy: null,
      // Campos de permissões administrativas
      isAdmin: true,
      isSuperAdmin: true,
      adminSince: new Date(),
      adminPermissions: JSON.stringify({
        manageUsers: true,
        manageEvents: true,
        approveDocuments: true,
        manageCategories: true,
        viewAllData: true,
        accessDashboard: true
      })
    };
    this.usersMap.set(adminId, adminUser);
    console.log(`Usuário administrador criado: ${adminId} - ${adminUser.firstName} ${adminUser.lastName}`);
    
    // Mantém apenas o workshop do Kevin
    const kevinEventId = this.eventIdCounter++;
    const kevinEvent: Event = {
      id: kevinEventId,
      name: "Workshop de Fotografia",
      description: "Workshop exclusivo de fotografia com profissionais renomados. Vagas limitadas.",
      date: "2025-04-15",
      timeStart: "14:00",
      timeEnd: "18:00",
      location: "Estúdio Fotográfico Central, Bauru-SP",
      coordinates: "-22.3156,-49.0709",
      coverImage: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?q=80&w=2074&auto=format&fit=crop",
      eventType: "private_application",
      categoryId: 4, // Reunião
      creatorId: 1, // Kevin
      capacity: 15,
      ticketPrice: 0,
      isActive: true,
      createdAt: new Date(),
      importantInfo: "Traga sua própria câmera. Haverá alguns modelos disponíveis para empréstimo.",
      additionalTickets: null,
      paymentMethods: null
    };
    this.eventsMap.set(kevinEventId, kevinEvent);
    console.log(`Evento mantido: ${kevinEventId} - ${kevinEvent.name} (Criador: Kevin)`);

    console.log("Configuração de usuários e eventos concluída!");
    console.log(`Total de usuários: ${this.usersMap.size}`);
    console.log(`Total de eventos: ${this.eventsMap.size}`);
  }
  private _createInitialCategories() {
    const categories: InsertEventCategory[] = [
      { name: "Aniversário", slug: "birthday", color: "#a78bfa" },
      { name: "Casamento", slug: "wedding", color: "#ec4899" },
      { name: "Religioso", slug: "religious", color: "#8b5cf6" },
      { name: "Reunião", slug: "meeting", color: "#3b82f6" },
      { name: "Churrasco", slug: "barbecue", color: "#f59e0b" },
      { name: "Festa", slug: "party", color: "#ec4899" },
      { name: "Show", slug: "concert", color: "#10b981" },
      { name: "LGBT+", slug: "lgbt", color: "pride" },
      { name: "Eventos 18+", slug: "adult", color: "#ef4444", ageRestriction: 18 }
    ];
    
    console.log("Inicializando categorias...");
    
    categories.forEach(category => {
      const id = this.categoryIdCounter++;
      const newCategory: EventCategory = { ...category, id };
      console.log(`Adicionando categoria: ${id} - ${category.name}`);
      this.categoriesMap.set(id, newCategory);
    });
    
    console.log("Categorias inicializadas:", this.categoriesMap.size);
  }
  
  // Implementação de usuários
  
  async getUser(id: number): Promise<User | undefined> {
    return this.usersMap.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(
      (user) => user.username === username
    );
  }
  
  /**
   * Busca um usuário pelo e-mail
   * @param email E-mail do usuário
   * @returns O usuário encontrado ou undefined
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    // Procura o usuário pelo e-mail
    return Array.from(this.usersMap.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }
  
  /**
   * Busca um usuário pelo ID do Google
   * @param googleId ID do Google
   * @returns O usuário encontrado ou undefined
   */
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    // Procura o usuário pelo ID do Google
    return Array.from(this.usersMap.values()).find(
      (user) => user.googleId === googleId
    );
  }
  
  /**
   * Atualiza o ID do Google de um usuário existente
   * @param userId ID do usuário
   * @param googleId ID do Google
   * @returns O usuário atualizado
   */
  async updateUserGoogleId(userId: number, googleId: string): Promise<User> {
    const user = await this.getUser(userId);
    
    if (!user) {
      throw new Error(`Usuário com ID ${userId} não encontrado`);
    }
    
    // Atualiza o ID do Google
    const updatedUser = { ...user, googleId };
    
    // Salva o usuário atualizado
    this.usersMap.set(userId, updatedUser);
    
    return updatedUser;
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = { 
      ...user, 
      id,
      createdAt: new Date(), 
      profileImage: null,
      isActive: true,
      lastLogin: null,
      interests: null,
      emailVerified: false,
      phoneVerified: false,
      documentVerified: false,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      lastLoginIP: null,
      lastUserAgent: null,
      deviceIds: null,
      termsAcceptedAt: null,
      // Campos para validação de documentos
      documentRgImage: null,
      documentCpfImage: null,
      documentSelfieImage: null,
      documentRejectionReason: null,
      documentReviewedAt: null,
      documentReviewedBy: null,
      // Campos de permissões administrativas
      isAdmin: false,
      isSuperAdmin: false,
      adminSince: null,
      adminPermissions: null
    };
    this.usersMap.set(id, newUser);
    console.log(`Usuário criado: ${id} - ${newUser.firstName} ${newUser.lastName}`);
    return newUser;
  }
  
  /**
   * Atualiza um usuário existente
   * @param id ID do usuário
   * @param userData Dados parciais do usuário a serem atualizados
   * @returns O usuário atualizado
   */
  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    
    if (!user) {
      throw new Error(`Usuário com ID ${id} não encontrado`);
    }
    
    // Atualiza os campos fornecidos
    const updatedUser: User = {
      ...user,
      ...userData
    };
    
    this.usersMap.set(id, updatedUser);
    console.log(`Usuário atualizado: ${id} - ${updatedUser.firstName} ${updatedUser.lastName}`);
    return updatedUser;
  }
  
  // Implementação de categorias
  
  async getCategories(): Promise<EventCategory[]> {
    return Array.from(this.categoriesMap.values());
  }
  
  async getCategoryBySlug(slug: string): Promise<EventCategory | undefined> {
    return Array.from(this.categoriesMap.values()).find(
      (category) => category.slug === slug
    );
  }
  
  async createCategory(category: InsertEventCategory): Promise<EventCategory> {
    const id = this.categoryIdCounter++;
    const newCategory: EventCategory = { ...category, id };
    this.categoriesMap.set(id, newCategory);
    return newCategory;
  }
  
  // Implementação de eventos
  
  async getEvents(): Promise<Event[]> {
    return Array.from(this.eventsMap.values());
  }
  
  async getEvent(id: number): Promise<Event | undefined> {
    return this.eventsMap.get(id);
  }
  
  async getEventsByCategory(categoryId: number): Promise<Event[]> {
    return Array.from(this.eventsMap.values()).filter(
      (event) => event.categoryId === categoryId
    );
  }
  
  async getEventsByCreator(creatorId: number): Promise<Event[]> {
    return Array.from(this.eventsMap.values()).filter(
      (event) => event.creatorId === creatorId
    );
  }
  
  async createEvent(event: InsertEvent, creatorId: number): Promise<Event> {
    const id = this.eventIdCounter++;
    const newEvent: Event = { 
      ...event, 
      id, 
      creatorId,
      createdAt: new Date(),
      isActive: true,
      importantInfo: null,
      additionalTickets: null,
      paymentMethods: null
    };
    this.eventsMap.set(id, newEvent);
    return newEvent;
  }
  
  async updateEvent(id: number, eventData: Partial<InsertEvent>): Promise<Event> {
    const existingEvent = await this.getEvent(id);
    
    if (!existingEvent) {
      throw new Error(`Evento com ID ${id} não encontrado`);
    }
    
    // Atualiza apenas os campos fornecidos, mantendo os valores existentes para os demais
    const updatedEvent: Event = {
      ...existingEvent,
      ...eventData,
    };
    
    this.eventsMap.set(id, updatedEvent);
    return updatedEvent;
  }
  
  /**
   * Remove um evento pelo ID
   * @param id ID do evento a ser removido
   */
  async removeEvent(id: number): Promise<void> {
    if (!this.eventsMap.has(id)) {
      throw new Error(`Evento com ID ${id} não encontrado`);
    }
    
    // Remove o evento
    this.eventsMap.delete(id);
    
    // Remove também as participações relacionadas a este evento
    const participantsToRemove = Array.from(this.participantsMap.values())
      .filter(participant => participant.eventId === id)
      .map(participant => participant.id);
    
    for (const participantId of participantsToRemove) {
      this.participantsMap.delete(participantId);
    }
    
    console.log(`Evento com ID ${id} removido com sucesso`);
  }
  
  // Implementação de participantes
  
  async getParticipants(eventId: number): Promise<EventParticipant[]> {
    return Array.from(this.participantsMap.values()).filter(
      (participant) => participant.eventId === eventId
    );
  }
  
  // Busca participante por ID
  async getParticipant(id: number): Promise<EventParticipant | undefined> {
    return this.participantsMap.get(id);
  }
  
  async getParticipation(eventId: number, userId: number): Promise<EventParticipant | undefined> {
    return Array.from(this.participantsMap.values()).find(
      (participant) => participant.eventId === eventId && participant.userId === userId
    );
  }
  
  async createParticipation(participation: InsertEventParticipant): Promise<EventParticipant> {
    const id = this.participantIdCounter++;
    const newParticipation: EventParticipant = { 
      ...participation, 
      id,
      status: participation.status || "pending",
      createdAt: new Date(),
      applicationReason: participation.applicationReason || null,
      reviewedBy: participation.reviewedBy || null,
      reviewedAt: participation.reviewedAt || null
    };
    this.participantsMap.set(id, newParticipation);
    return newParticipation;
  }
  
  async removeParticipation(id: number): Promise<void> {
    if (!this.participantsMap.has(id)) {
      throw new Error("Participação não encontrada");
    }
    this.participantsMap.delete(id);
  }
  
  async updateParticipationStatus(id: number, status: string): Promise<EventParticipant> {
    const participation = this.participantsMap.get(id);
    if (!participation) {
      throw new Error("Participação não encontrada");
    }
    
    const updatedParticipation: EventParticipant = {
      ...participation,
      status
    };
    
    this.participantsMap.set(id, updatedParticipation);
    return updatedParticipation;
  }

  // Mapa para co-organizadores e convites
  private coOrganizerInvitesMap: Map<number, EventCoOrganizerInvite> = new Map();
  private coOrganizersMap: Map<string, number> = new Map(); // Formato: `${eventId}-${userId}`
  private inviteIdCounter: number = 1;

  /**
   * Busca os co-organizadores de um evento
   * @param eventId ID do evento
   * @returns Lista de usuários que são co-organizadores
   */
  async getEventCoOrganizers(eventId: number): Promise<User[]> {
    const coOrganizerIds: number[] = [];
    
    // Filtrar as entradas que começam com o eventId
    for (const [key, userId] of this.coOrganizersMap.entries()) {
      if (key.startsWith(`${eventId}-`)) {
        coOrganizerIds.push(userId);
      }
    }
    
    // Buscar os usuários correspondentes
    const coOrganizers: User[] = [];
    for (const userId of coOrganizerIds) {
      const user = await this.getUser(userId);
      if (user) {
        coOrganizers.push(user);
      }
    }
    
    return coOrganizers;
  }

  /**
   * Busca os convites de co-organizador para um evento
   * @param eventId ID do evento
   * @returns Lista de convites
   */
  async getEventCoOrganizerInvites(eventId: number): Promise<EventCoOrganizerInvite[]> {
    const invites: EventCoOrganizerInvite[] = [];
    
    for (const invite of this.coOrganizerInvitesMap.values()) {
      if (invite.eventId === eventId) {
        // Se o convite tiver um inviteeId, busca os dados do usuário convidado
        if (invite.inviteeId) {
          const invitee = await this.getUser(invite.inviteeId);
          if (invitee) {
            invites.push({
              ...invite,
              invitee: {
                id: invitee.id,
                firstName: invitee.firstName,
                lastName: invitee.lastName,
                profileImage: invitee.profileImage
              }
            });
            continue;
          }
        }
        
        // Se não tiver inviteeId ou não encontrar o usuário, retorna o convite sem o invitee
        invites.push(invite);
      }
    }
    
    return invites;
  }

  /**
   * Busca um convite específico pelo ID
   * @param id ID do convite
   * @returns O convite encontrado ou undefined
   */
  async getEventCoOrganizerInvite(id: number): Promise<EventCoOrganizerInvite | undefined> {
    return this.coOrganizerInvitesMap.get(id);
  }

  /**
   * Busca um convite específico pelo token
   * @param token Token do convite
   * @returns O convite encontrado ou undefined
   */
  async getEventCoOrganizerInviteByToken(token: string): Promise<EventCoOrganizerInvite | undefined> {
    for (const invite of this.coOrganizerInvitesMap.values()) {
      if (invite.token === token) {
        return invite;
      }
    }
    return undefined;
  }

  /**
   * Cria um novo convite de co-organizador
   * @param invite Dados do convite
   * @param inviterId ID do usuário que está enviando o convite
   * @param eventId ID do evento
   * @returns O convite criado
   */
  async createEventCoOrganizerInvite(
    invite: InsertEventCoOrganizerInvite, 
    inviterId: number, 
    eventId: number
  ): Promise<EventCoOrganizerInvite> {
    // Verificar se o evento existe
    const event = await this.getEvent(eventId);
    if (!event) {
      throw new Error(`Evento com ID ${eventId} não encontrado`);
    }
    
    // Verificar se o usuário existe
    const inviter = await this.getUser(inviterId);
    if (!inviter) {
      throw new Error(`Usuário com ID ${inviterId} não encontrado`);
    }

    // Verificar se o e-mail já foi convidado para este evento
    for (const existingInvite of this.coOrganizerInvitesMap.values()) {
      if (existingInvite.eventId === eventId && existingInvite.email === invite.email && existingInvite.status === 'pending') {
        throw new Error(`Já existe um convite pendente para ${invite.email} neste evento`);
      }
    }
    
    // Verificar se já é co-organizador pelo e-mail
    const userByEmail = await this.getUserByEmail(invite.email);
    if (userByEmail) {
      const isAlreadyCoOrganizer = this.coOrganizersMap.has(`${eventId}-${userByEmail.id}`);
      if (isAlreadyCoOrganizer) {
        throw new Error(`O usuário ${invite.email} já é co-organizador deste evento`);
      }
    }
    
    // Gerar token único para o convite
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Criar o convite
    const id = this.inviteIdCounter++;
    const newInvite: EventCoOrganizerInvite = {
      id,
      eventId,
      inviterId,
      email: invite.email,
      message: invite.message,
      token,
      status: 'pending',
      invitedAt: new Date().toISOString(),
      respondedAt: null,
      inviteeId: null
    };
    
    this.coOrganizerInvitesMap.set(id, newInvite);
    return newInvite;
  }

  /**
   * Atualiza o status de um convite
   * @param id ID do convite
   * @param status Novo status (accepted ou rejected)
   * @param inviteeId ID do usuário que está respondendo ao convite (opcional)
   * @returns O convite atualizado
   */
  async updateEventCoOrganizerInviteStatus(
    id: number, 
    status: string, 
    inviteeId?: number
  ): Promise<EventCoOrganizerInvite> {
    const invite = await this.getEventCoOrganizerInvite(id);
    if (!invite) {
      throw new Error(`Convite com ID ${id} não encontrado`);
    }
    
    // Atualizar o convite
    const updatedInvite: EventCoOrganizerInvite = {
      ...invite,
      status,
      respondedAt: new Date().toISOString(),
      inviteeId: inviteeId || invite.inviteeId
    };
    
    this.coOrganizerInvitesMap.set(id, updatedInvite);
    
    // Se o convite foi aceito, adicionar como co-organizador
    if (status === 'accepted' && inviteeId) {
      await this.addEventCoOrganizer(invite.eventId, inviteeId);
    }
    
    return updatedInvite;
  }

  /**
   * Remove um convite
   * @param id ID do convite
   */
  async removeEventCoOrganizerInvite(id: number): Promise<void> {
    const invite = await this.getEventCoOrganizerInvite(id);
    if (!invite) {
      throw new Error(`Convite com ID ${id} não encontrado`);
    }
    
    this.coOrganizerInvitesMap.delete(id);
  }

  /**
   * Adiciona um co-organizador ao evento
   * @param eventId ID do evento
   * @param userId ID do usuário
   */
  async addEventCoOrganizer(eventId: number, userId: number): Promise<void> {
    // Verificar se o evento existe
    const event = await this.getEvent(eventId);
    if (!event) {
      throw new Error(`Evento com ID ${eventId} não encontrado`);
    }
    
    // Verificar se o usuário existe
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`Usuário com ID ${userId} não encontrado`);
    }
    
    // Evitar adicionar o próprio criador como co-organizador
    if (event.creatorId === userId) {
      throw new Error(`O criador do evento não pode ser adicionado como co-organizador`);
    }
    
    // Adicionar à lista de co-organizadores
    const key = `${eventId}-${userId}`;
    this.coOrganizersMap.set(key, userId);
  }

  /**
   * Remove um co-organizador de um evento
   * @param eventId ID do evento
   * @param userId ID do usuário
   */
  async removeEventCoOrganizer(eventId: number, userId: number): Promise<void> {
    const key = `${eventId}-${userId}`;
    if (!this.coOrganizersMap.has(key)) {
      throw new Error(`Usuário com ID ${userId} não é co-organizador do evento com ID ${eventId}`);
    }
    
    this.coOrganizersMap.delete(key);
  }
}

// Exporta a instância de armazenamento
export const storage = new MemStorage();
