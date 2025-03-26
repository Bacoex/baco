import { pgTable, text, serial, integer, boolean, date, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
 * Esquemas de validação para inserção na tabela de usuários
 */
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  profileImage: true
});

/**
 * Esquema de validação para login
 */
export const loginUserSchema = z.object({
  username: z.string().min(11, "CPF inválido").max(14, "CPF inválido"),
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
