import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { User } from "@shared/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Utilitário para obter o nome de exibição de um usuário
 * Por regra do sistema, todos os usuários são sempre chamados pelo sobrenome
 * @param user - Objeto do usuário ou null/undefined
 * @returns Sobrenome do usuário ou string vazia se não houver usuário
 */
export function getUserDisplayName(user: { lastName: string } | User | null | undefined): string {
  return user?.lastName || "";
}
