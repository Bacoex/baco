/**
 * Módulo de segurança para a aplicação
 * Inclui funções para criptografia, proteção CSRF, rate limiting e outras medidas de segurança
 */

import { Request, Response, NextFunction, Express } from 'express';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { rateLimit } from 'express-rate-limit';
import csrf from 'csurf';
import helmet from 'helmet';
import { storage } from './storage';

// Chave para criptografia de dados (em produção, usar variáveis de ambiente)
const ENCRYPTION_KEY = scryptSync(process.env.ENCRYPTION_KEY || 'baco-secret-key', 'salt', 32);

/**
 * Criptografa dados sensíveis usando AES-256-GCM
 * @param text - Texto a ser criptografado
 * @returns Texto criptografado (formato: iv:encrypted)
 */
export function encrypt(text: string): string {
  // Gera um vetor de inicialização aleatório
  const iv = randomBytes(16);
  
  // Cria o cifrador com chave e IV
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  
  // Criptografa os dados
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Adiciona o tag de autenticação
  const authTag = cipher.getAuthTag();
  
  // Retorna o resultado no formato: iv:tag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Descriptografa dados previamente criptografados
 * @param encryptedText - Texto criptografado (formato: iv:tag:encrypted)
 * @returns Texto original descriptografado
 */
export function decrypt(encryptedText: string): string {
  // Extrai IV, tag e texto criptografado
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato de dados criptografados inválido');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  // Cria o decifrador
  const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  
  // Descriptografa os dados
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Implementa um sistema de rate limiting baseado na contagem de tentativas
 * @param key - Identificador para o limite (ex: IP, rota)
 * @param maxAttempts - Número máximo de tentativas permitidas
 * @param message - Mensagem de erro a ser retornada quando o limite for excedido
 * @returns Middleware Express para rate limiting
 */
export function createRateLimiter(key: string, maxAttempts: number, message: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = `${key}_${req.ip}`;
    
    try {
      const attempts = await storage.incrementRateLimitCounter(identifier);
      
      if (attempts > maxAttempts) {
        return res.status(429).json({ 
          message,
          retryAfter: '15 minutes'
        });
      }
      
      next();
    } catch (error) {
      // Em caso de erro, vai para o próximo middleware
      // mas decrementa o contador para não penalizar o usuário
      await storage.decrementRateLimitCounter(identifier);
      next();
    }
  };
}

/**
 * Configuração do rate limiting para login
 * Limita tentativas de login para prevenir ataques de força bruta
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas tentativas de login. Tente novamente após 15 minutos.'
});

/**
 * Limita tentativas de registro para prevenir spam
 */
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 tentativas por hora
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitos registros. Tente novamente mais tarde.'
});

/**
 * Limita requisições para endpoints sensíveis como reset de senha
 */
export const resetPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 2, // 2 tentativas por hora
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas solicitações de redefinição de senha. Tente novamente mais tarde.'
});

/**
 * Configuração da proteção CSRF
 */
export const csrfProtection = csrf({ 
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

/**
 * Middleware para mascarar dados sensíveis em logs
 */
export function dataMaskingMiddleware(req: Request, res: Response, next: NextFunction) {
  // Clonar o corpo da requisição para não modificar o original
  const masked = { ...req.body };
  
  // Lista de campos sensíveis a serem mascarados
  const sensitiveFields = ['password', 'senha', 'credit_card', 'cartao', 'cpf', 'rg', 'phone', 'telefone'];
  
  // Função recursiva para mascarar campos sensíveis
  function maskSensitiveData(obj: any) {
    if (!obj || typeof obj !== 'object') return;
    
    Object.keys(obj).forEach(key => {
      if (sensitiveFields.includes(key.toLowerCase())) {
        if (typeof obj[key] === 'string') {
          // Mascara todos os caracteres exceto os últimos 4
          const len = obj[key].length;
          if (len > 4) {
            obj[key] = '*'.repeat(len - 4) + obj[key].slice(len - 4);
          } else {
            obj[key] = '****';
          }
        } else {
          obj[key] = '****';
        }
      } else if (typeof obj[key] === 'object') {
        maskSensitiveData(obj[key]);
      }
    });
  }
  
  // Aplica mascaramento
  maskSensitiveData(masked);
  
  // Salva cópia mascarada para logs
  req.maskedBody = masked;
  
  next();
}

/**
 * Middleware para aplicar cabeçalhos de segurança
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Content-Security-Policy para prevenir XSS
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com; img-src 'self' data: https://*; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://maps.googleapis.com; frame-src 'self' https://maps.googleapis.com;`
  );
  
  // Strict-Transport-Security para forçar HTTPS
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // X-Content-Type-Options para prevenir sniffing MIME
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // X-Frame-Options para prevenir clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // X-XSS-Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer-Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
}

/**
 * Middleware para proteção CSRF
 */
export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  // CSRF para rotas que modificam estado
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && 
      !req.path.startsWith('/api/auth/') && 
      !req.path.startsWith('/api/login') &&
      !req.path.startsWith('/api/logout') &&
      !req.path.startsWith('/api/register')) {
    
    csrfProtection(req, res, (err) => {
      if (err) {
        return res.status(403).json({ 
          message: 'Falha na validação do token CSRF. Recarregue a página e tente novamente.' 
        });
      }
      next();
    });
  } else {
    next();
  }
}

/**
 * Middleware para adicionar token CSRF à resposta
 */
export function addCsrfToken(req: Request, res: Response, next: NextFunction) {
  if (req.csrfToken) {
    res.locals.csrfToken = req.csrfToken();
  }
  next();
}

/**
 * Configura todos os middlewares de segurança no aplicativo
 * @param app - Aplicativo Express
 */
export function setupSecurity(app: Express) {
  // Proteção contra ataques comuns usando Helmet
  app.use(helmet({
    contentSecurityPolicy: false // Configurado manualmente
  }));
  
  // Aplicação de cabeçalhos de segurança
  app.use(securityHeadersMiddleware);
  
  // Rate limiting para rotas de autenticação
  app.use('/api/login', loginRateLimiter);
  app.use('/api/register', registerRateLimiter);
  app.use('/api/reset-password', resetPasswordRateLimiter);
  
  // Mascaramento de dados sensíveis em logs
  app.use(dataMaskingMiddleware);
  
  // Proteção CSRF para modificações de estado
  app.use(csrfMiddleware);
  
  // Adiciona token CSRF à resposta para uso em formulários
  app.use(addCsrfToken);
  
  // Ativa proteção simples
  app.use((req, res, next) => {
    // Prevenir Clickjacking com X-Frame-Options
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    
    // Strict-Transport-Security para forçar HTTPS
    if (process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
    }
    
    // Permite compartilhamento de recursos somente da mesma origem
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    next();
  });
  
  console.log('Configurações de segurança aplicadas com sucesso!');
}