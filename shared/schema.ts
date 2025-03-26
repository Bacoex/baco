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
  
  // Verifica se tem pelo menos 5 caracteres (padrão mínimo para RGs no Brasil)
  return rgLimpo.length >= 5;
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
  zodiacSign: text("zodiac_sign").notNull(),
  profileImage: text("profile_image"),
  createdAt: timestamp("created_at").defaultNow(),
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
  time: text("time").notNull(),
  location: text("location").notNull(),
  price: doublePrecision("price").notNull().default(0),
  image: text("image"),
  categoryId: integer("category_id").notNull(),
  creatorId: integer("creator_id").notNull(),
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
  createdAt: timestamp("created_at").defaultNow(),
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
  profileImage: true
}).extend({
  // Validação personalizada para CPF
  username: z.string()
    .min(11, "CPF deve ter 11 dígitos")
    .max(14, "CPF inválido")
    .refine(val => validarCPF(val), {
      message: "CPF inválido. Verifique se digitou corretamente."
    }),
  
  // Validação personalizada para RG
  rg: z.string()
    .min(5, "RG deve ter pelo menos 5 caracteres")
    .refine(val => validarRG(val), {
      message: "RG inválido. Verifique se digitou corretamente."
    }),
  
  // Validação personalizada para senha forte
  password: z.string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .refine(val => senhaForteRegex.test(val), {
      message: "Senha deve conter pelo menos 1 caractere especial, 1 letra maiúscula, 1 letra minúscula e 1 número"
    })
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
