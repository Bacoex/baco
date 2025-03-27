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
  
  // Participantes
  getParticipants(eventId: number): Promise<EventParticipant[]>;
  getParticipant(id: number): Promise<EventParticipant | undefined>;
  getParticipation(eventId: number, userId: number): Promise<EventParticipant | undefined>;
  createParticipation(participation: InsertEventParticipant): Promise<EventParticipant>;
  removeParticipation(id: number): Promise<void>;
  updateParticipationStatus(id: number, status: string): Promise<EventParticipant>;
  
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
   * Cria usuários e eventos de teste para a aplicação
   */
  private _createTestUsersAndEvents() {
    console.log("Criando usuários e eventos de teste...");
    
    // 1. Criar 5 usuários de teste
    const testUsers: InsertUser[] = [
      {
        username: "12345678901",
        password: "445c678c04146877b6fb1cd930af60213a78b098e05b8a6a4ff9dbf4ff8bafa01c6b05b851f43f27d4bb3dcb7504e8645a026013cd91901704d24ae5eeec03c0.73b9deb7c7cd0891f61221d27b10b44a", // Teste@123
        firstName: "Ana",
        lastName: "Silva",
        birthDate: "1990-05-15",
        email: "ana.silva@example.com",
        phone: "11987654321",
        rg: "223344556",
        zodiacSign: "Touro",
        city: "São Paulo",
        state: "SP",
        biography: "Adoro eventos culturais e conhecer pessoas novas.",
        instagramUsername: "ana.silvaa",
        threadsUsername: "ana.silvaa",
        termsAccepted: true,
        privacyPolicyAccepted: true,
        dataProcessingConsent: true,
        marketingConsent: true,
        tituloEleitor: "123456789012",
        googleId: null
      },
      {
        username: "23456789012",
        password: "445c678c04146877b6fb1cd930af60213a78b098e05b8a6a4ff9dbf4ff8bafa01c6b05b851f43f27d4bb3dcb7504e8645a026013cd91901704d24ae5eeec03c0.73b9deb7c7cd0891f61221d27b10b44a", // Teste@123
        firstName: "Carlos",
        lastName: "Oliveira",
        birthDate: "1988-10-22",
        email: "carlos.oliveira@example.com",
        phone: "21976543210",
        rg: "334455667",
        zodiacSign: "Libra",
        city: "Rio de Janeiro",
        state: "RJ",
        biography: "DJ profissional, curto festas e música eletrônica.",
        instagramUsername: "dj_carlos",
        threadsUsername: "dj_carlos",
        termsAccepted: true,
        privacyPolicyAccepted: true,
        dataProcessingConsent: true,
        marketingConsent: true,
        tituloEleitor: "234567890123",
        googleId: null
      },
      {
        username: "34567890123",
        password: "445c678c04146877b6fb1cd930af60213a78b098e05b8a6a4ff9dbf4ff8bafa01c6b05b851f43f27d4bb3dcb7504e8645a026013cd91901704d24ae5eeec03c0.73b9deb7c7cd0891f61221d27b10b44a", // Teste@123
        firstName: "Beatriz",
        lastName: "Santos",
        birthDate: "1995-03-08",
        email: "beatriz.santos@example.com",
        phone: "31965432109",
        rg: "445566778",
        zodiacSign: "Peixes",
        city: "Belo Horizonte",
        state: "MG",
        biography: "Fotógrafa, amo registrar momentos especiais.",
        instagramUsername: "beatriz.foto",
        threadsUsername: "beatriz.foto",
        termsAccepted: true,
        privacyPolicyAccepted: true,
        dataProcessingConsent: true,
        marketingConsent: true,
        tituloEleitor: "345678901234",
        googleId: null
      },
      {
        username: "45678901234",
        password: "445c678c04146877b6fb1cd930af60213a78b098e05b8a6a4ff9dbf4ff8bafa01c6b05b851f43f27d4bb3dcb7504e8645a026013cd91901704d24ae5eeec03c0.73b9deb7c7cd0891f61221d27b10b44a", // Teste@123
        firstName: "Rafael",
        lastName: "Costa",
        birthDate: "1992-07-18",
        email: "rafael.costa@example.com",
        phone: "51954321098",
        rg: "556677889",
        zodiacSign: "Câncer",
        city: "Porto Alegre",
        state: "RS",
        biography: "Chef de cozinha, especialista em churrasco.",
        instagramUsername: "chef_rafael",
        threadsUsername: "chef_rafael",
        termsAccepted: true,
        privacyPolicyAccepted: true,
        dataProcessingConsent: true,
        marketingConsent: true,
        tituloEleitor: "456789012345",
        googleId: null
      },
      {
        username: "56789012345",
        password: "445c678c04146877b6fb1cd930af60213a78b098e05b8a6a4ff9dbf4ff8bafa01c6b05b851f43f27d4bb3dcb7504e8645a026013cd91901704d24ae5eeec03c0.73b9deb7c7cd0891f61221d27b10b44a", // Teste@123
        firstName: "Fernanda",
        lastName: "Lima",
        birthDate: "1991-12-05",
        email: "fernanda.lima@example.com",
        phone: "81943210987",
        rg: "667788990",
        zodiacSign: "Sagitário",
        city: "Recife",
        state: "PE",
        biography: "Organizadora de eventos profissional.",
        instagramUsername: "fer.eventos",
        threadsUsername: "fer.eventos",
        termsAccepted: true,
        privacyPolicyAccepted: true,
        dataProcessingConsent: true,
        marketingConsent: true,
        tituloEleitor: "567890123456",
        googleId: null
      }
    ];

    // Criar os usuários e armazenar seus IDs
    const userIds: number[] = [];
    testUsers.forEach((userData) => {
      const id = this.userIdCounter++;
      const newUser: User = {
        ...userData,
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
        termsAcceptedAt: null
      };
      this.usersMap.set(id, newUser);
      userIds.push(id);
      console.log(`Usuário criado: ${id} - ${userData.firstName} ${userData.lastName}`);
    });

    // 2. Criar um evento do Kevin (usuário 1) que precisa de aprovação
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
      ticketPrice: null,
      isActive: true,
      createdAt: new Date(),
      importantInfo: "Traga sua própria câmera. Haverá alguns modelos disponíveis para empréstimo.",
      additionalTickets: null,
      paymentMethods: null
    };
    this.eventsMap.set(kevinEventId, kevinEvent);
    console.log(`Evento criado: ${kevinEventId} - ${kevinEvent.name} (Criador: Kevin)`);
    
    // 3. Criar eventos para os outros usuários
    const eventDetails = [
      {
        name: "Festa de Aniversário",
        description: "Comemoração de 30 anos com open bar e DJ.",
        date: "2025-05-20",
        category: 1, // Aniversário
        creator: userIds[0], // Ana
        type: "private_ticket",
        image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?q=80&w=2070&auto=format&fit=crop"
      },
      {
        name: "Night Eletrônica",
        description: "A melhor noite de música eletrônica da cidade com DJs internacionais.",
        date: "2025-04-10",
        category: 6, // Festa
        creator: userIds[1], // Carlos
        type: "public",
        image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=2070&auto=format&fit=crop"
      },
      {
        name: "Exposição de Fotografia",
        description: "Exposição de fotografia urbana com coquetel de abertura.",
        date: "2025-04-25",
        category: 7, // Show (usando para exposição)
        creator: userIds[2], // Beatriz
        type: "public",
        image: "https://images.unsplash.com/photo-1602580165725-11edd5492687?q=80&w=2071&auto=format&fit=crop"
      },
      {
        name: "Festival Gastronômico",
        description: "Festival com os melhores chefs da região sul. Pratos típicos e harmonização.",
        date: "2025-06-05",
        category: 5, // Churrasco (usando para gastronomia)
        creator: userIds[3], // Rafael
        type: "private_ticket",
        image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=2087&auto=format&fit=crop"
      },
      {
        name: "Workshop de Organização de Eventos",
        description: "Aprenda a organizar eventos profissionais com foco em experiência do cliente.",
        date: "2025-05-10",
        category: 4, // Reunião
        creator: userIds[4], // Fernanda
        type: "private_application",
        image: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?q=80&w=2070&auto=format&fit=crop"
      },
      {
        name: "Casamento Ana & João",
        description: "Cerimônia e recepção para celebrar nossa união. Traje: Esporte fino.",
        date: "2025-07-12",
        category: 2, // Casamento
        creator: userIds[0], // Ana
        type: "private_application",
        image: "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop"
      },
      {
        name: "Culto Especial de Páscoa",
        description: "Celebração especial com apresentações musicais e reflexão.",
        date: "2025-04-20",
        category: 3, // Religioso
        creator: userIds[2], // Beatriz
        type: "public",
        image: "https://images.unsplash.com/photo-1520187044487-b2efb58f0cba?q=80&w=2070&auto=format&fit=crop"
      },
      {
        name: "Pride Parade 2025",
        description: "Celebração da diversidade com shows, desfiles e atividades culturais.",
        date: "2025-06-28",
        category: 8, // LGBT+
        creator: userIds[1], // Carlos
        type: "public",
        image: "https://images.unsplash.com/photo-1516655855035-d5d3c5f19e21?q=80&w=2070&auto=format&fit=crop"
      },
      {
        name: "Encontro de Empreendedores",
        description: "Networking e palestras para empreendedores da região.",
        date: "2025-05-15",
        category: 4, // Reunião
        creator: userIds[4], // Fernanda
        type: "private_application",
        image: "https://images.unsplash.com/photo-1577497445563-e1ecff94b40d?q=80&w=2070&auto=format&fit=crop"
      }
    ];

    // Criar os eventos
    eventDetails.forEach((eventDetail, index) => {
      const eventId = this.eventIdCounter++;
      const event: Event = {
        id: eventId,
        name: eventDetail.name,
        description: eventDetail.description,
        date: eventDetail.date,
        timeStart: "19:00",
        timeEnd: "23:00",
        location: "Local a confirmar",
        coordinates: null,
        coverImage: eventDetail.image,
        eventType: eventDetail.type as 'public' | 'private_ticket' | 'private_application',
        categoryId: eventDetail.category,
        creatorId: eventDetail.creator,
        capacity: 50,
        ticketPrice: eventDetail.type === 'private_ticket' ? 50 + (index * 10) : null,
        isActive: true,
        createdAt: new Date(),
        importantInfo: eventDetail.type === 'private_ticket' ? "Ingresso não inclui bebidas. Proibido entrada com bebidas de fora." : null,
        additionalTickets: eventDetail.type === 'private_ticket' ? '{"vip":{"nome":"VIP","preco":120,"descricao":"Acesso à área VIP com open bar premium"}}' : null,
        paymentMethods: eventDetail.type === 'private_ticket' ? '{"cartao":true,"pix":true,"dinheiro":false}' : null
      };
      this.eventsMap.set(eventId, event);
      console.log(`Evento criado: ${eventId} - ${event.name} (Criador: ${event.creatorId})`);
    });

    // 4. Criar candidaturas para o evento do Kevin
    // Três usuários se candidatam ao workshop de fotografia
    [userIds[0], userIds[2], userIds[4]].forEach((userId, index) => {
      const participationId = this.participantIdCounter++;
      const participation: EventParticipant = {
        id: participationId,
        eventId: kevinEventId,
        userId: userId,
        status: "pending", // Pendente de aprovação
        applicationReason: `Gostaria de participar do workshop porque tenho interesse em fotografia e quero aprimorar minhas habilidades. ${index === 1 ? 'Tenho experiência prévia como fotógrafa amadora.' : ''}`,
        reviewedBy: null,
        reviewedAt: null,
        createdAt: new Date()
      };
      this.participantsMap.set(participationId, participation);
      console.log(`Candidatura criada: Usuário ${userId} para o evento ${kevinEventId}`);
    });

    console.log("Criação de dados de teste concluída!");
    console.log(`Total de usuários: ${this.usersMap.size}`);
    console.log(`Total de eventos: ${this.eventsMap.size}`);
    console.log(`Total de participações: ${this.participantsMap.size}`);
  }
  
  /**
   * Cria categorias iniciais para uso na aplicação
   */
  private _createInitialCategories() {
    const categories: InsertEventCategory[] = [
      { name: "Aniversário", slug: "birthday", color: "#a78bfa" },
      { name: "Casamento", slug: "wedding", color: "#ec4899" },
      { name: "Religioso", slug: "religious", color: "#8b5cf6" },
      { name: "Reunião", slug: "meeting", color: "#3b82f6" },
      { name: "Churrasco", slug: "barbecue", color: "#f59e0b" },
      { name: "Festa", slug: "party", color: "#ec4899" },
      { name: "Show", slug: "concert", color: "#10b981" },
      { name: "LGBT+", slug: "lgbt", color: "pride" }
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
      termsAcceptedAt: null
    };
    this.usersMap.set(id, newUser);
    return newUser;
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
}

// Exporta a instância de armazenamento
export const storage = new MemStorage();
