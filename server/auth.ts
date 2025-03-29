import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, InsertUser } from "@shared/schema";

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
export async function hashPassword(password: string) {
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
export async function comparePasswords(supplied: string, stored: string) {
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
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    cookie: {
      secure: false,
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
  
  // Configura a estratégia de autenticação Google
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Verifica se o usuário já existe pelo googleId
            let user = await storage.getUserByGoogleId(profile.id);
            
            if (user) {
              // Se o usuário já existe, retorna-o
              return done(null, user);
            }
            
            // Se o usuário não existe, verifica se já existe um usuário com o mesmo email
            if (profile.emails && profile.emails.length > 0) {
              const email = profile.emails[0].value;
              user = await storage.getUserByEmail(email);
              
              if (user) {
                // Atualiza o usuário existente com o googleId
                user = await storage.updateUserGoogleId(user.id, profile.id);
                return done(null, user);
              }
            }
            
            // Se não encontrou usuário, cria um novo
            const firstName = profile.name?.givenName || '';
            const lastName = profile.name?.familyName || '';
            const email = profile.emails?.[0]?.value || '';
            
            // Gera uma senha temporária aleatória
            const tempPassword = await hashPassword(randomBytes(16).toString('hex'));
            
            // Encontra um username único baseado no perfil do Google
            // Para o Baco, o username seria o CPF, mas para contas Google usamos um valor temporário
            // que depois o usuário pode atualizar
            const tempUsername = `google_${profile.id}`;
            
            // Cria o usuário com dados do perfil Google
            const newUser: InsertUser = {
              username: tempUsername,
              password: tempPassword,
              firstName,
              lastName,
              email,
              phone: '',
              rg: '',
              tituloEleitor: null,
              birthDate: new Date().toISOString().split('T')[0], // Data atual como placeholder
              zodiacSign: '',
              city: '',
              state: '',
              biography: '',
              instagramUsername: '',
              threadsUsername: '',
              googleId: profile.id,
              profileImage: profile.photos?.[0]?.value || null,
              termsAccepted: true,
              privacyPolicyAccepted: true,
              dataProcessingConsent: true,
              marketingConsent: true,
            };
            
            const createdUser = await storage.createUser(newUser);
            return done(null, createdUser);
          } catch (err) {
            return done(err as Error);
          }
        }
      )
    );
  }

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
  
  // Rotas de autenticação com Google
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // Rota para iniciar o fluxo de autenticação Google
    app.get("/api/auth/google", 
      passport.authenticate("google", { 
        scope: ["profile", "email"],
        // Pedir permissão mesmo se o usuário já autorizou antes
        prompt: "select_account",
      })
    );
    
    // Rota de callback do Google após autenticação
    app.get("/api/auth/google/callback", 
      passport.authenticate("google", { 
        failureRedirect: "/auth?error=google-auth-failed",
      }),
      (req, res) => {
        // Sucesso - redireciona para a página inicial
        res.redirect("/");
      }
    );
  }
}
