import { 
  users, type User, type InsertUser,
  events, type Event, type InsertEvent,
  eventCategories, type EventCategory, type InsertEventCategory,
  eventParticipants, type EventParticipant, type InsertEventParticipant,
  eventSubcategories, type EventSubcategory, type InsertEventSubcategory,
  eventCoOrganizerInvites, type EventCoOrganizerInvite, type InsertEventCoOrganizerInvite,
  notifications, type Notification, type InsertNotification,
  notificationRecipients, type NotificationRecipient, type InsertNotificationRecipient,
  chatMessages, type ChatMessage, type InsertChatMessage
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

// Criando store para sessões em memória
const MemoryStore = createMemoryStore(session);

// Esses tipos foram movidos para @shared/schema.ts

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
  
  // Segurança
  incrementRateLimitCounter(key: string): Promise<number>;
  decrementRateLimitCounter(key: string): Promise<void>;
  resetRateLimitCounter(key: string): Promise<void>;
  resetAllRateLimitCounters(): Promise<void>;
  storeEncryptedData(userId: number, dataType: string, data: string): Promise<void>;
  getEncryptedData(userId: number, dataType: string): Promise<string | null>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;

  // Categorias de eventos
  getCategories(): Promise<EventCategory[]>;
  getCategory(id: number): Promise<EventCategory | undefined>;
  getCategoryBySlug(slug: string): Promise<EventCategory | undefined>;
  createCategory(category: InsertEventCategory): Promise<EventCategory>;

  // Subcategorias de eventos
  getSubcategories(): Promise<EventSubcategory[]>;
  getSubcategoriesByCategory(categoryId: number): Promise<EventSubcategory[]>;
  getSubcategory(id: number): Promise<EventSubcategory | undefined>;
  createSubcategory(subcategory: InsertEventSubcategory): Promise<EventSubcategory>;

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
  sessionStore: ReturnType<typeof createMemoryStore>;

  // Notificações
  createNotification(data: InsertNotification): Promise<Notification>;
  addNotificationRecipients(notificationId: number, userIds: number[]): Promise<NotificationRecipient[]>;
  getNotificationsByUser(userId: number): Promise<{notification: Notification, recipient: NotificationRecipient}[]>;
  getNotificationsBySourceAndType(sourceId: number, type: string): Promise<Notification[]>;
  markNotificationAsRead(recipientId: number): Promise<void>;
  deleteNotificationForUser(recipientId: number): Promise<void>;
  getEventParticipantsAndCreator(eventId: number): Promise<number[]>; // Retorna IDs de todos os usuários envolvidos em um evento
  
  // Chat
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessagesByEvent(eventId: number): Promise<ChatMessage[]>;
}

/**
 * Implementação em memória do armazenamento de dados
 * Mantém todos os dados em estruturas Map para simular um banco de dados
 */
export class MemStorage implements IStorage {
  // Mapas acessíveis publicamente para API de debug (remover em produção)
  public usersMap: Map<number, User>;
  private categoriesMap: Map<number, EventCategory>;
  private subcategoriesMap: Map<number, EventSubcategory>;
  private eventsMap: Map<number, Event>;
  private participantsMap: Map<number, EventParticipant>;
  private notifications: Notification[] = []; // Array para armazenar notificações
  private notificationRecipients: NotificationRecipient[] = []; // Array para armazenar destinatários de notificações
  private notificationIdCounter: number = 1; // Contador para IDs de notificações
  private notificationRecipientIdCounter: number = 1; // Contador para IDs de destinatários de notificações
  
  // Segurança - contador para rate limiting
  private rateLimitCounters: Map<string, { count: number, resetAt: number }> = new Map();
  private encryptedUserData: Map<string, string> = new Map(); // Formato: userId_dataType -> dados criptografados
  
  // IDs para autoincrementar
  private userIdCounter: number;
  private categoryIdCounter: number;
  private subcategoryIdCounter: number;
  private eventIdCounter: number;
  private participantIdCounter: number;

  sessionStore: ReturnType<typeof createMemoryStore>;

  constructor() {
    // Inicializa as estruturas de dados
    this.usersMap = new Map();
    this.categoriesMap = new Map();
    this.subcategoriesMap = new Map();
    this.eventsMap = new Map();
    this.participantsMap = new Map();

    // Define os contadores iniciais
    this.userIdCounter = 2; // Iniciando em 2 para preservar o usuário com ID 1
    this.categoryIdCounter = 1;
    this.subcategoryIdCounter = 1;
    this.eventIdCounter = 1;
    this.participantIdCounter = 1;

    // Inicializa o sessionStore para armazenar sessões
    const store = new MemoryStore({
      checkPeriod: 86400000 // Limpa sessões expiradas a cada 24h
    });
    this.sessionStore = store;

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
      // Hash gerada para a senha "Admin@123" usando a função hashPassword (atualizada em 29/03/2025)
      password: "28ad4dcc693268d7bca7b740cac6e37b986b96846d086f0bd94f2b736045877eebd7231972f4c6a1b74bd131b370c1156348bf6b74122c11f04e6655d4978207.08498ff1bca99386942ee775f3b8f371",
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
      // Hash gerada para a senha "Admin@123" (atualizada em 29/03/2025)
      password: "28ad4dcc693268d7bca7b740cac6e37b986b96846d086f0bd94f2b736045877eebd7231972f4c6a1b74bd131b370c1156348bf6b74122c11f04e6655d4978207.08498ff1bca99386942ee775f3b8f371",
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

    // Nenhum evento será criado automaticamente
    console.log("Nenhum evento foi criado na inicialização - configuração limpa");

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
      { name: "Eventos 18+", slug: "adult", color: "#ef4444", ageRestriction: 18 },
      { name: "Esporte", slug: "sports", color: "#2563eb" },
      { name: "Turismo", slug: "tourism", color: "#16a34a" }
    ];

    console.log("Inicializando categorias...");

    categories.forEach(category => {
      const id = this.categoryIdCounter++;
      const newCategory: EventCategory = { ...category, id };
      console.log(`Adicionando categoria: ${id} - ${category.name}`);
      this.categoriesMap.set(id, newCategory);
    });

    console.log("Categorias inicializadas:", this.categoriesMap.size);

    // Após criar as categorias, criar subcategorias
    this._createInitialSubcategories();
  }

  /**
   * Cria subcategorias iniciais para as categorias existentes
   */
  private _createInitialSubcategories() {
    const subcategories: Array<{categorySlug: string, subcategory: InsertEventSubcategory}> = [
      // Subcategorias para Aniversário
      { categorySlug: "birthday", subcategory: { name: "Infantil", slug: "kids", categoryId: 0 }},
      { categorySlug: "birthday", subcategory: { name: "Adolescente", slug: "teenager", categoryId: 0 }},
      { categorySlug: "birthday", subcategory: { name: "Adulto", slug: "adult-birthday", categoryId: 0 }},
      { categorySlug: "birthday", subcategory: { name: "Idoso", slug: "senior", categoryId: 0 }},
      { categorySlug: "birthday", subcategory: { name: "Temático", slug: "themed", categoryId: 0 }},

      // Subcategorias para Casamento
      { categorySlug: "wedding", subcategory: { name: "Tradicional", slug: "traditional", categoryId: 0 }},
      { categorySlug: "wedding", subcategory: { name: "Ao ar livre", slug: "outdoor", categoryId: 0 }},
      { categorySlug: "wedding", subcategory: { name: "Cerimônia civil", slug: "civil", categoryId: 0 }},
      { categorySlug: "wedding", subcategory: { name: "Recepção", slug: "reception", categoryId: 0 }},

      // Subcategorias para Religioso
      { categorySlug: "religious", subcategory: { name: "Católico", slug: "catholic", categoryId: 0 }},
      { categorySlug: "religious", subcategory: { name: "Evangélico", slug: "evangelical", categoryId: 0 }},
      { categorySlug: "religious", subcategory: { name: "Espírita", slug: "spiritist", categoryId: 0 }},
      { categorySlug: "religious", subcategory: { name: "Judaico", slug: "jewish", categoryId: 0 }},
      { categorySlug: "religious", subcategory: { name: "Umbanda", slug: "umbanda", categoryId: 0 }},
      { categorySlug: "religious", subcategory: { name: "Budista", slug: "buddhist", categoryId: 0 }},
      { categorySlug: "religious", subcategory: { name: "Islâmico", slug: "islamic", categoryId: 0 }},

      // Subcategorias para Reunião
      { categorySlug: "meeting", subcategory: { name: "Corporativa", slug: "corporate", categoryId: 0 }},
      { categorySlug: "meeting", subcategory: { name: "Confraternização", slug: "team-building", categoryId: 0 }},
      { categorySlug: "meeting", subcategory: { name: "Workshops", slug: "workshop", categoryId: 0 }},
      { categorySlug: "meeting", subcategory: { name: "Treinamentos", slug: "training", categoryId: 0 }},

      // Subcategorias para Churrasco
      { categorySlug: "barbecue", subcategory: { name: "Familiar", slug: "family", categoryId: 0 }},
      { categorySlug: "barbecue", subcategory: { name: "Amigos", slug: "friends", categoryId: 0 }},
      { categorySlug: "barbecue", subcategory: { name: "Costela", slug: "ribs", categoryId: 0 }},
      { categorySlug: "barbecue", subcategory: { name: "Fogo de chão", slug: "ground-fire", categoryId: 0 }},

      // Subcategorias para Festa
      { categorySlug: "party", subcategory: { name: "Balada", slug: "nightclub", categoryId: 0 }},
      { categorySlug: "party", subcategory: { name: "Formatura", slug: "graduation", categoryId: 0 }},
      { categorySlug: "party", subcategory: { name: "Hallowen", slug: "halloween", categoryId: 0 }},
      { categorySlug: "party", subcategory: { name: "Carnaval", slug: "carnival", categoryId: 0 }},
      { categorySlug: "party", subcategory: { name: "Réveillon", slug: "new-year", categoryId: 0 }},
      { categorySlug: "party", subcategory: { name: "Fantasia", slug: "costume", categoryId: 0 }},

      // Subcategorias para Show
      { categorySlug: "concert", subcategory: { name: "Rock", slug: "rock", categoryId: 0 }},
      { categorySlug: "concert", subcategory: { name: "Sertanejo", slug: "country", categoryId: 0 }},
      { categorySlug: "concert", subcategory: { name: "Pop", slug: "pop", categoryId: 0 }},
      { categorySlug: "concert", subcategory: { name: "Funk", slug: "funk", categoryId: 0 }},
      { categorySlug: "concert", subcategory: { name: "Samba", slug: "samba", categoryId: 0 }},
      { categorySlug: "concert", subcategory: { name: "MPB", slug: "mpb", categoryId: 0 }},
      { categorySlug: "concert", subcategory: { name: "Jazz", slug: "jazz", categoryId: 0 }},
      { categorySlug: "concert", subcategory: { name: "Eletrônica", slug: "electronic", categoryId: 0 }},

      // Subcategorias para LGBT+
      { categorySlug: "lgbt", subcategory: { name: "Parada", slug: "pride-parade", categoryId: 0 }},
      { categorySlug: "lgbt", subcategory: { name: "Balada", slug: "lgbt-club", categoryId: 0 }},
      { categorySlug: "lgbt", subcategory: { name: "Cultural", slug: "cultural", categoryId: 0 }},
      { categorySlug: "lgbt", subcategory: { name: "Ativismo", slug: "activism", categoryId: 0 }},

      // Subcategorias para Eventos 18+
      { categorySlug: "adult", subcategory: { name: "Festa", slug: "adult-party", categoryId: 0 }},
      { categorySlug: "adult", subcategory: { name: "Balada", slug: "adult-club", categoryId: 0 }},
      { categorySlug: "adult", subcategory: { name: "Show", slug: "adult-show", categoryId: 0 }},
      
      // Subcategorias para Esporte
      { categorySlug: "sports", subcategory: { name: "Futebol", slug: "soccer", categoryId: 0 }},
      { categorySlug: "sports", subcategory: { name: "Vôlei", slug: "volleyball", categoryId: 0 }},
      { categorySlug: "sports", subcategory: { name: "Basquete", slug: "basketball", categoryId: 0 }},
      { categorySlug: "sports", subcategory: { name: "Corrida", slug: "running", categoryId: 0 }},
      { categorySlug: "sports", subcategory: { name: "Ciclismo", slug: "cycling", categoryId: 0 }},
      { categorySlug: "sports", subcategory: { name: "Natação", slug: "swimming", categoryId: 0 }},
      { categorySlug: "sports", subcategory: { name: "Tênis", slug: "tennis", categoryId: 0 }},
      { categorySlug: "sports", subcategory: { name: "Lutas", slug: "martial-arts", categoryId: 0 }},
      
      // Subcategorias para Turismo
      { categorySlug: "tourism", subcategory: { name: "Trilha Leve", slug: "easy-trail", categoryId: 0 }},
      { categorySlug: "tourism", subcategory: { name: "Trilha Moderada", slug: "moderate-trail", categoryId: 0 }},
      { categorySlug: "tourism", subcategory: { name: "Trilha Difícil", slug: "hard-trail", categoryId: 0 }},
      { categorySlug: "tourism", subcategory: { name: "Passeio Urbano", slug: "urban-tour", categoryId: 0 }},
      { categorySlug: "tourism", subcategory: { name: "Passeio Cultural", slug: "cultural-tour", categoryId: 0 }},
      { categorySlug: "tourism", subcategory: { name: "Visita Guiada", slug: "guided-tour", categoryId: 0 }},
      { categorySlug: "tourism", subcategory: { name: "Ecoturismo", slug: "eco-tourism", categoryId: 0 }},
      { categorySlug: "tourism", subcategory: { name: "Cachoeiras", slug: "waterfalls", categoryId: 0 }}
    ];

    console.log("Inicializando subcategorias...");

    subcategories.forEach(item => {
      // Buscar a categoria pelo slug
      let categoryId = 0;
      for (const [id, category] of this.categoriesMap.entries()) {
        if (category.slug === item.categorySlug) {
          categoryId = id;
          break;
        }
      }

      if (categoryId === 0) {
        console.warn(`Categoria com slug ${item.categorySlug} não encontrada para subcategoria ${item.subcategory.name}`);
        return; // skip this subcategory
      }

      // Atribuir o ID da categoria à subcategoria
      const subcategory = {...item.subcategory, categoryId};

      // Criar a subcategoria
      const id = this.subcategoryIdCounter++;
      const newSubcategory: EventSubcategory = { ...subcategory, id };
      this.subcategoriesMap.set(id, newSubcategory);
      console.log(`Adicionada subcategoria: ${id} - ${subcategory.name} (categoria: ${categoryId})`);
    });

    console.log("Subcategorias inicializadas:", this.subcategoriesMap.size);
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
    // Retorna as categorias ordenadas alfabeticamente pelo nome
    return Array.from(this.categoriesMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name, 'pt-BR')
    );
  }

  async getCategory(id: number): Promise<EventCategory | undefined> {
    return this.categoriesMap.get(id);
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

  // Implementação de subcategorias

  async getSubcategories(): Promise<EventSubcategory[]> {
    // Retorna todas as subcategorias ordenadas alfabeticamente pelo nome
    return Array.from(this.subcategoriesMap.values())
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  async getSubcategoriesByCategory(categoryId: number): Promise<EventSubcategory[]> {
    // Filtra as subcategorias pela categoria e ordena alfabeticamente pelo nome
    return Array.from(this.subcategoriesMap.values())
      .filter((subcategory) => subcategory.categoryId === categoryId)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  async getSubcategory(id: number): Promise<EventSubcategory | undefined> {
    return this.subcategoriesMap.get(id);
  }

  async createSubcategory(subcategory: InsertEventSubcategory): Promise<EventSubcategory> {
    const id = this.subcategoryIdCounter++;
    const newSubcategory: EventSubcategory = { ...subcategory, id };
    this.subcategoriesMap.set(id, newSubcategory);
    return newSubcategory;
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
    const events = Array.from(this.eventsMap.values()).filter(
      (event) => event.creatorId === creatorId
    );
    console.log(`getEventsByCreator: Buscando eventos do criador ${creatorId}, encontrados ${events.length} eventos`);
    if (events.length > 0) {
      console.log("Eventos encontrados:", events.map(e => ({ id: e.id, name: e.name, creatorId: e.creatorId })));
    }
    return events;
  }

  async createEvent(event: InsertEvent, creatorId: number): Promise<Event> {
    const id = this.eventIdCounter++;
    
    // Processa os additionalTickets se existirem no objeto do evento
    let additionalTicketsValue = event.additionalTickets;
    
    // Log para ajudar a depurar as coordenadas
    console.log(`Criando evento com coordenadas: "${event.coordinates}"`);
    
    // Se o evento tiver ingressos adicionais, fazemos log para debug
    if (event.additionalTickets) {
      console.log(`Evento com ingressos adicionais: ${event.additionalTickets}`);
      // Se for uma string, já está em formato JSON stringificado
      if (typeof event.additionalTickets === 'string') {
        additionalTicketsValue = event.additionalTickets;
      } 
      // Se for um objeto, precisamos convertê-lo para string
      else if (typeof event.additionalTickets === 'object') {
        additionalTicketsValue = JSON.stringify(event.additionalTickets);
      }
    }
    
    // Garantir que as coordenadas sejam salvas, mesmo que sejam uma string vazia
    const coordinates = event.coordinates ?? "";
    
    const newEvent: Event = { 
      ...event, 
      id, 
      creatorId,
      createdAt: new Date(),
      isActive: true,
      importantInfo: event.importantInfo || null,
      additionalTickets: additionalTicketsValue || null,
      paymentMethods: null,
      coordinates: coordinates
    };
    
    this.eventsMap.set(id, newEvent);
    console.log(`Evento criado: ID=${id}, Nome=${event.name}, Tipo=${event.eventType}, Criador=${creatorId}, Coordenadas=${coordinates || 'nenhuma'}`);
    
    // Se for do tipo ticket, mostramos informações específicas
    if (event.eventType === 'private_ticket') {
      console.log(`Preço do ticket: ${event.ticketPrice}, Ingressos adicionais: ${newEvent.additionalTickets || 'nenhum'}`);
    }
    
    return newEvent;
  }

  async updateEvent(id: number, eventData: Partial<InsertEvent>): Promise<Event> {
    const existingEvent = await this.getEvent(id);

    if (!existingEvent) {
      throw new Error(`Evento com ID ${id} não encontrado`);
    }

    // Processa os campos especiais antes de fazer a atualização
    let processedEventData = { ...eventData };
    
    // Log para ajudar a depurar as coordenadas na atualização
    console.log(`Atualizando evento com coordenadas: "${eventData.coordinates}"`);
    
    // Processar ingressos adicionais (additionalTickets)
    if (eventData.additionalTickets !== undefined) {
      console.log(`Evento ${id} atualizando ingressos adicionais:`, eventData.additionalTickets);
    }
    
    // Garantir que as coordenadas sejam preservadas ou atualizadas corretamente
    if (eventData.coordinates !== undefined) {
      processedEventData.coordinates = eventData.coordinates;
      console.log(`Atualizando coordenadas para: "${processedEventData.coordinates}"`);
    }
    
    // Atualiza apenas os campos fornecidos, mantendo os valores existentes para os demais
    const updatedEvent: Event = {
      ...existingEvent,
      ...processedEventData,
    };

    this.eventsMap.set(id, updatedEvent);
    console.log(`Evento ${id} atualizado com sucesso:`, updatedEvent.name, `Coordenadas: ${updatedEvent.coordinates || 'nenhuma'}`);
    
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

  async createNotification(data: InsertNotification): Promise<Notification> {
    const id = this.notificationIdCounter++;
    const notification = {
      id,
      ...data,
      read: false,  // Todas as notificações começam como não lidas
      createdAt: new Date()
    };
    this.notifications.push(notification);
    return notification;
  }

  async addNotificationRecipients(notificationId: number, userIds: number[]): Promise<NotificationRecipient[]> {
    const recipients: NotificationRecipient[] = [];
    
    for (const userId of userIds) {
      const recipient: NotificationRecipient = {
        id: this.notificationRecipientIdCounter++,
        notificationId,
        userId,
        read: false,
        deletedAt: null
      };
      
      this.notificationRecipients.push(recipient);
      recipients.push(recipient);
    }
    
    return recipients;
  }

  async getNotificationsByUser(userId: number): Promise<{notification: Notification, recipient: NotificationRecipient}[]> {
    const userRecipients = this.notificationRecipients.filter(
      r => r.userId === userId && r.deletedAt === null
    );
    
    const results: {notification: Notification, recipient: NotificationRecipient}[] = [];
    
    for (const recipient of userRecipients) {
      const notification = this.notifications.find(n => n.id === recipient.notificationId);
      if (notification) {
        results.push({
          notification,
          recipient
        });
      }
    }
    
    // Ordenar por data de criação, mais recentes primeiro
    return results.sort((a, b) => 
      b.notification.createdAt.getTime() - a.notification.createdAt.getTime()
    );
  }

  /**
   * Busca notificações por tipo e ID da fonte
   * @param sourceId ID da fonte (ex: participação, evento)
   * @param type Tipo da notificação (ex: participant_request, participation_approved)
   * @returns Array com notificações encontradas
   */
  async getNotificationsBySourceAndType(sourceId: number, type: string): Promise<Notification[]> {
    return this.notifications.filter(
      notification => notification.sourceId === sourceId && notification.type === type
    );
  }

  async markNotificationAsRead(recipientId: number): Promise<void> {
    const index = this.notificationRecipients.findIndex(r => r.id === recipientId);
    if (index !== -1) {
      this.notificationRecipients[index].read = true;
    }
  }

  async deleteNotificationForUser(recipientId: number): Promise<void> {
    // Encontrar o destinatário para remover
    const recipient = this.notificationRecipients.find(r => r.id === recipientId);
    
    // Se não encontrou, não há nada a fazer
    if (!recipient) {
      console.log(`Recipiente ${recipientId} não encontrado para remoção`);
      return;
    }
    
    // Salvar o ID da notificação antes de remover o destinatário
    const notificationId = recipient.notificationId;
    
    console.log(`Removendo definitivamente a notificação para o recipiente ${recipientId} (notificação ${notificationId})`);
    
    // Remover o destinatário
    const recipientIndex = this.notificationRecipients.findIndex(r => r.id === recipientId);
    if (recipientIndex !== -1) {
      this.notificationRecipients.splice(recipientIndex, 1);
    }
    
    // Verificar se ainda existem outros destinatários para esta notificação
    const hasOtherRecipients = this.notificationRecipients.some(r => r.notificationId === notificationId);
    
    // Se não há mais destinatários, remover a notificação
    if (!hasOtherRecipients) {
      const notificationIndex = this.notifications.findIndex(n => n.id === notificationId);
      if (notificationIndex !== -1) {
        console.log(`Removendo definitivamente a notificação ${notificationId} por não ter mais destinatários`);
        this.notifications.splice(notificationIndex, 1);
      }
    }
  }
  
  async getEventParticipantsAndCreator(eventId: number): Promise<number[]> {
    const event = this.eventsMap.get(eventId);
    if (!event) return [];
    
    // Adicionar o criador do evento
    const userIds = [event.creatorId];
    
    // Adicionar todos os participantes
    const participants = Array.from(this.participantsMap.values())
      .filter(p => p.eventId === eventId)
      .map(p => p.userId);
    
    // Unir os IDs sem duplicação
    return [...new Set([...userIds, ...participants])];
  }
  
  // Implementação do sistema de chat
  private chatMessages: ChatMessage[] = [];
  private chatMessageIdCounter: number = 1;
  
  /**
   * Cria uma nova mensagem de chat para um evento
   * @param message Dados da mensagem
   * @returns A mensagem criada com ID gerado
   */
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const newMessage: ChatMessage = {
      ...message,
      id: this.chatMessageIdCounter++,
      sentAt: new Date(),
      readBy: null
    };
    
    this.chatMessages.push(newMessage);
    console.log(`Nova mensagem de chat criada: ID=${newMessage.id}, EventID=${newMessage.eventId}, SenderID=${newMessage.senderId}`);
    
    return newMessage;
  }
  
  /**
   * Busca todas as mensagens de chat de um evento
   * @param eventId ID do evento
   * @returns Lista de mensagens ordenadas por data de envio (mais antigas primeiro)
   */
  async getChatMessagesByEvent(eventId: number): Promise<ChatMessage[]> {
    return this.chatMessages
      .filter(message => message.eventId === eventId)
      .sort((a, b) => {
        const timeA = a.sentAt?.getTime() || 0;
        const timeB = b.sentAt?.getTime() || 0;
        return timeA - timeB;
      });
  }
  
  // Métodos para controle de rate limit
  
  /**
   * Incrementa o contador de rate limit para uma chave específica
   * @param key Identificador único para o contador (ex: IP, rota, etc)
   * @returns O valor atual do contador após o incremento
   */
  async incrementRateLimitCounter(key: string): Promise<number> {
    const now = Date.now();
    const counter = this.rateLimitCounters.get(key);
    
    if (!counter || counter.resetAt < now) {
      // Se o contador não existe ou expirou, cria um novo
      this.rateLimitCounters.set(key, {
        count: 1,
        resetAt: now + 15 * 60 * 1000 // 15 minutos
      });
      return 1;
    } else {
      // Incrementa o contador existente
      counter.count += 1;
      return counter.count;
    }
  }
  
  /**
   * Decrementa o contador de rate limit para uma chave específica
   * @param key Identificador único para o contador
   */
  async decrementRateLimitCounter(key: string): Promise<void> {
    const counter = this.rateLimitCounters.get(key);
    
    if (counter && counter.count > 0) {
      counter.count -= 1;
    }
  }
  
  /**
   * Reseta o contador de rate limit para uma chave específica
   * @param key Identificador único para o contador
   */
  async resetRateLimitCounter(key: string): Promise<void> {
    this.rateLimitCounters.delete(key);
  }
  
  /**
   * Reseta todos os contadores de rate limit
   */
  async resetAllRateLimitCounters(): Promise<void> {
    this.rateLimitCounters.clear();
  }
  
  /**
   * Armazena dados sensíveis criptografados para um usuário
   * @param userId ID do usuário
   * @param dataType Tipo de dado (ex: 'payment', 'document', etc)
   * @param data Dados a serem criptografados e armazenados
   */
  async storeEncryptedData(userId: number, dataType: string, data: string): Promise<void> {
    // Criptografa os dados antes de armazenar (a criptografia é feita no módulo de segurança)
    // Aqui apenas armazenamos o resultado já criptografado
    const key = `${userId}_${dataType}`;
    this.encryptedUserData.set(key, data);
  }
  
  /**
   * Recupera dados sensíveis criptografados de um usuário
   * @param userId ID do usuário
   * @param dataType Tipo de dado a ser recuperado
   * @returns Dados criptografados ou null se não existirem
   */
  async getEncryptedData(userId: number, dataType: string): Promise<string | null> {
    const key = `${userId}_${dataType}`;
    return this.encryptedUserData.get(key) || null;
  }
}

// Exporta a instância de armazenamento
export const storage = new MemStorage();