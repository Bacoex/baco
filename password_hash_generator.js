import crypto from 'crypto';
import { promisify } from 'util';

// Função para gerar o hash da senha
async function hashPassword(password) {
  const scryptAsync = promisify(crypto.scrypt);
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

// Função principal
async function main() {
  const senha = 'Admin@123';
  const hash = await hashPassword(senha);
  console.log(`Hash para senha "${senha}":`);
  console.log(hash);
}

// Executa a função principal
main().catch(console.error);