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
  getParticipation(eventId: number, userId: number): Promise<EventParticipant | undefined>;
  createParticipation(participation: InsertEventParticipant): Promise<EventParticipant>;
  updateParticipationStatus(id: number, status: string): Promise<EventParticipant>;
  
  // Sessões
  sessionStore: session.SessionStore;
}

/**
 * Implementação em memória do armazenamento de dados
 * Mantém todos os dados em estruturas Map para simular um banco de dados
 */
export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
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
      zodiacSign: "Capricórnio",
      createdAt: new Date("2023-01-01"),
      profileImage: null
    };
    
    // Adiciona o usuário permanente ao mapa
    this.usersMap.set(1, kevinUser);
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
      { name: "Show", slug: "concert", color: "#10b981" }
    ];
    
    categories.forEach(category => {
      const id = this.categoryIdCounter++;
      this.categoriesMap.set(id, {
        ...category,
        id
      });
    });
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
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = { 
      ...user, 
      id,
      createdAt: new Date(), 
      profileImage: null
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
      createdAt: new Date()
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
      createdAt: new Date()
    };
    this.participantsMap.set(id, newParticipation);
    return newParticipation;
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
