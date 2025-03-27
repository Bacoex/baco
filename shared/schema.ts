import { pgTable, text, serial, integer, boolean, date, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Função para validar CPF
 * @param cpf CPF a ser validado
 * @returns true se o CPF for válido, false caso contrário
 */
function validarCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  cpf = cpf.replace(/[^\d]/g, '');
  
  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais (caso inválido)
  if (/^(\d)\1+$/.test(cpf)) return false;
  
  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = soma % 11;
  let digitoVerificador1 = resto < 2 ? 0 : 11 - resto;
  
  if (digitoVerificador1 !== parseInt(cpf.charAt(9))) return false;
  
  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = soma % 11;
  let digitoVerificador2 = resto < 2 ? 0 : 11 - resto;
  
  if (digitoVerificador2 !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}

/**
 * Função para validar RG
 * @param rg RG a ser validado
 * @returns true se o RG for válido, false caso contrário
 */
function validarRG(rg: string): boolean {
  // Remove caracteres não alfanuméricos
  const rgLimpo = rg.replace(/[^\w]/g, '');
  
  // Verifica se tem entre 8 e 10 caracteres (padrão para RGs no Brasil)
  if (rgLimpo.length < 8 || rgLimpo.length > 10) return false;
  
  // Verificação do formato para RGs de São Paulo (mais comum no Brasil)
  // Formato básico: XX.XXX.XXX-X
  const regexSP = /^[0-9]{2}\.?[0-9]{3}\.?[0-9]{3}-?[0-9xX]{1}$/;
  
  // Se for um RG de SP, faz validação mais rigorosa do dígito verificador
  if (regexSP.test(rg.replace(/[^\dxX]/g, ''))) {
    const rgDigits = rg.replace(/[^\dxX]/g, '');
    const digits = rgDigits.slice(0, -1).split('').map(d => parseInt(d));
    const verifier = rgDigits.slice(-1).toLowerCase();
    
    // Calcula dígito verificador (algoritmo para SP)
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum += digits[i] * (2 + i);
    }
    
    const remainder = sum % 11;
    const expectedVerifier = remainder === 0 ? '0' : remainder === 1 ? 'x' : (11 - remainder).toString();
    
    // Verifica se o dígito verificador é válido
    if (verifier !== expectedVerifier) return false;
  }
  
  return true;
}

/**
 * Função para validar Título de Eleitor
 * @param titulo Título de eleitor a ser validado
 * @returns true se o título for válido, false caso contrário
 */
function validarTituloEleitor(titulo: string): boolean {
  // Remove caracteres não numéricos
  const tituloLimpo = titulo.replace(/[^\d]/g, '');
  
  // Verifica se tem 12 dígitos
  if (tituloLimpo.length !== 12) return false;
  
  // Extrai os dígitos verificadores
  const dv1 = parseInt(tituloLimpo.charAt(10));
  const dv2 = parseInt(tituloLimpo.charAt(11));
  
  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 8; i++) {
    soma += parseInt(tituloLimpo.charAt(i)) * (i + 2);
  }
  let resto = soma % 11;
  if (resto === 0) resto = 1;
  
  // Se o resto for 10, o DV deve ser 0
  const digitoVerificador1 = resto === 10 ? 0 : resto;
  
  if (digitoVerificador1 !== dv1) return false;
  
  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 8; i < 10; i++) {
    soma += parseInt(tituloLimpo.charAt(i)) * (i - 1);
  }
  
  soma += digitoVerificador1 * 9;
  resto = soma % 11;
  if (resto === 0) resto = 1;
  
  // Se o resto for 10, o DV deve ser 0
  const digitoVerificador2 = resto === 10 ? 0 : resto;
  
  return digitoVerificador2 === dv2;
}

/**
 * Esquema da tabela de usuários
 * Contém todos os dados necessários para autenticação e informações de perfil
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  // CPF é usado como username para login
  username: text("username").notNull().unique(), // CPF
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  birthDate: date("birth_date").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  rg: text("rg").notNull(),
  tituloEleitor: text("titulo_eleitor"), // Título de eleitor
  zodiacSign: text("zodiac_sign").notNull(),
  // Campos adicionais para perfil
  profileImage: text("profile_image"),
  biography: text("biography"),
  instagramUsername: text("instagram_username"),
  threadsUsername: text("threads_username"),
  city: text("city"),
  state: text("state"),
  interests: text("interests"), // Armazenado como JSON
  // Campos para controle
  isActive: boolean("is_active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  // Campos para segurança
  emailVerified: boolean("email_verified").notNull().default(false), 
  phoneVerified: boolean("phone_verified").notNull().default(false),
  documentVerified: boolean("document_verified").notNull().default(false),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),
  // Campos para conformidade com privacidade
  termsAccepted: boolean("terms_accepted").notNull().default(false),
  privacyPolicyAccepted: boolean("privacy_policy_accepted").notNull().default(false),
  marketingConsent: boolean("marketing_consent").notNull().default(false),
  dataProcessingConsent: boolean("data_processing_consent").notNull().default(false),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  // Campos para registro de dispositivos e segurança
  lastLoginIP: text("last_login_ip"),
  lastUserAgent: text("last_user_agent"),
  deviceIds: text("device_ids"), // Armazenado como JSON
  // Campos para autenticação com serviços externos
  googleId: text("google_id").unique()
});

/**
 * Esquema da tabela de categorias de eventos
 */
export const eventCategories = pgTable("event_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  color: text("color").notNull(),
});

/**
 * Esquema da tabela de eventos
 * Contém todas as informações sobre os eventos criados
 */
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  date: date("date").notNull(),
  timeStart: text("time_start").notNull(),
  timeEnd: text("time_end"),
  location: text("location").notNull(),
  coordinates: text("coordinates"), // Para armazenar coordenadas do mapa
  coverImage: text("cover_image"),
  categoryId: integer("category_id").notNull(),
  creatorId: integer("creator_id").notNull(),
  // Tipo de evento: 'public', 'private_ticket', 'private_application'
  eventType: text("event_type").notNull().default('public'),
  // Informações adicionais para eventos públicos
  importantInfo: text("important_info"),
  // Informações para eventos com venda de ingressos
  ticketPrice: doublePrecision("ticket_price").default(0),
  additionalTickets: text("additional_tickets"), // JSON com diferentes tipos de ingressos
  paymentMethods: text("payment_methods"), // JSON com métodos de pagamento
  // Informações de controle
  capacity: integer("capacity"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Esquema da tabela de participantes de eventos
 */
export const eventParticipants = pgTable("event_participants", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  // Para eventos de candidatura
  applicationReason: text("application_reason"),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Esquema da tabela de convites de co-organizadores para eventos
 * Permite convidar usuários para ajudar na gestão do evento
 */
export const eventCoOrganizerInvites = pgTable("event_co_organizer_invites", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  inviterId: integer("inviter_id").notNull(), // ID do usuário que enviou o convite
  email: text("email").notNull(), // Email do convidado (pode ser um usuário existente ou não)
  inviteToken: text("invite_token").notNull(), // Token único para aceitar o convite
  status: text("status").notNull().default("pending"), // pending, accepted, rejected
  invitedAt: timestamp("invited_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  // Informações sobre o usuário convidado (se já existir)
  inviteeId: integer("invitee_id"), // ID do usuário convidado (se existir)
  // Mensagem personalizada para o convite
  message: text("message"),
});

/**
 * Esquema da tabela de mensagens de chat
 * Para comunicação entre participantes de um evento
 */
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  senderId: integer("sender_id").notNull(),
  content: text("content").notNull(),
  attachmentUrl: text("attachment_url"),
  sentAt: timestamp("sent_at").defaultNow(),
  readBy: text("read_by"), // Array de IDs como JSON
});

/**
 * Regexp para validação de senha forte
 * Requer pelo menos 1 caractere especial, 1 letra maiúscula, 1 letra minúscula e 1 número
 */
const senhaForteRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/;

/**
 * Esquemas de validação para inserção na tabela de usuários
 */
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  profileImage: true,
  // Campos de segurança que não devem ser preenchidos no cadastro
  emailVerified: true,
  phoneVerified: true,
  documentVerified: true,
  twoFactorEnabled: true,
  twoFactorSecret: true,
  lastLoginIP: true,
  lastUserAgent: true,
  deviceIds: true,
  lastLogin: true,
  termsAcceptedAt: true,
  googleId: true
}).extend({
  // Validação personalizada para CPF - menos restritiva quando usuário tem googleId
  username: z.string()
    .transform(val => val.trim()),
  
  // Validação personalizada para RG - menos restritiva quando usuário tem googleId
  rg: z.string()
    .transform(val => val.trim()),
    
  // Campo para ID do Google (opcional)
  googleId: z.string().optional(),
    
  // Validação para título de eleitor (opcional)
  tituloEleitor: z.string()
    .optional()
    .refine(val => !val || validarTituloEleitor(val), {
      message: "Título de eleitor inválido. Verifique se digitou corretamente."
    }),
  
  // Validação personalizada para senha forte
  password: z.string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .refine(val => senhaForteRegex.test(val), {
      message: "Senha deve conter pelo menos 1 caractere especial, 1 letra maiúscula, 1 letra minúscula e 1 número"
    }),
    
  // Validação para aceitação dos termos e políticas
  termsAccepted: z.boolean()
    .refine(val => val === true, {
      message: "Você precisa aceitar os termos de uso para se cadastrar."
    }),
    
  privacyPolicyAccepted: z.boolean()
    .refine(val => val === true, {
      message: "Você precisa aceitar a política de privacidade para se cadastrar."
    }),
    
  // Consentimento para processamento de dados (obrigatório pela LGPD)
  dataProcessingConsent: z.boolean()
    .refine(val => val === true, {
      message: "Você precisa consentir com o processamento dos seus dados para se cadastrar."
    }),
    
  // Consentimento para marketing (opcional)
  marketingConsent: z.boolean().optional()
});

/**
 * Esquema de validação para login
 */
export const loginUserSchema = z.object({
  username: z.string()
    .min(11, "CPF inválido")
    .max(14, "CPF inválido")
    .refine(val => validarCPF(val), {
      message: "CPF inválido. Verifique se digitou corretamente."
    }),
  password: z.string().min(6, "Senha inválida"),
});

/**
 * Esquema de validação para inserção na tabela de eventos
 */
export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
  creatorId: true
});

/**
 * Esquema de validação para inserção na tabela de categorias
 */
export const insertEventCategorySchema = createInsertSchema(eventCategories).omit({
  id: true
});

/**
 * Esquema de validação para inserção na tabela de participantes
 */
export const insertEventParticipantSchema = createInsertSchema(eventParticipants).omit({
  id: true,
  createdAt: true
});

/**
 * Esquema de validação para mensagens de chat
 */
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  sentAt: true,
  readBy: true
});

/**
 * Esquema de validação para convites de co-organizadores
 */
export const insertEventCoOrganizerInviteSchema = createInsertSchema(eventCoOrganizerInvites).omit({
  id: true,
  invitedAt: true,
  respondedAt: true,
  status: true,
  inviteToken: true
}).extend({
  // Validação do email
  email: z.string().email("E-mail inválido"),
  // Mensagem personalizada (opcional)
  message: z.string().optional()
});

/**
 * Esquema de validação para atualizar perfil de usuário
 */
export const updateUserProfileSchema = z.object({
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  birthDate: z.string(),
  zodiacSign: z.string(),
  city: z.string().optional(),
  state: z.string().optional(),
  biography: z.string().optional(),
  instagramUsername: z.string().optional(),
  threadsUsername: z.string().optional(),
  interests: z.string().optional(),
});

// Tipos exportados para uso na aplicação
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEventCategory = z.infer<typeof insertEventCategorySchema>;
export type EventCategory = typeof eventCategories.$inferSelect;
export type InsertEventParticipant = z.infer<typeof insertEventParticipantSchema>;
export type EventParticipant = typeof eventParticipants.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type InsertEventCoOrganizerInvite = z.infer<typeof insertEventCoOrganizerInviteSchema>;
export type EventCoOrganizerInvite = typeof eventCoOrganizerInvites.$inferSelect;
