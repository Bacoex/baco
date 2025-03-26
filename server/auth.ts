import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Promisifica a função scrypt para uso com async/await
const scryptAsync = promisify(scrypt);

/**
 * Gera um hash seguro para a senha do usuário
 * Usa salt aleatório para proteger contra ataques de dicionário
 * @param password - Senha em texto plano
 * @returns Senha hasheada com salt
 */
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Compara a senha fornecida com a senha armazenada
 * Usa comparação de tempo constante para prevenir timing attacks
 * @param supplied - Senha fornecida pelo usuário
 * @param stored - Senha armazenada (hash.salt)
 * @returns Verdadeiro se as senhas coincidirem
 */
async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Configura a autenticação no aplicativo Express
 * @param app - Instância do Express
 */
export function setupAuth(app: Express) {
  // Configuração da sessão
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "baco-app-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configura a estratégia de autenticação local (username + password)
  // No nosso caso, username = CPF
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  // Serialização e deserialização do usuário para a sessão
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Rota de registro
  app.post("/api/register", async (req, res, next) => {
    try {
      // Verifica se o usuário já existe
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "CPF já cadastrado" });
      }

      // Cria o usuário com a senha hasheada
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      // Remove a senha do objeto retornado
      const { password, ...userWithoutPassword } = user;

      // Faz login automático após o registro
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      next(err);
    }
  });

  // Rota de login
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "CPF ou senha inválidos" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Remove a senha do objeto retornado
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Rota de logout
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Rota para obter o usuário atual
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Remove a senha do objeto retornado
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
  });
}
