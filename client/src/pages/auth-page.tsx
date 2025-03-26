import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Info } from "lucide-react";
import RegisterForm from "@/components/register-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

/**
 * Tipos de formulários de autenticação disponíveis
 */
type AuthFormType = "login" | "register" | "recovery";

/**
 * Componente para exibir informações sobre o aplicativo e seu criador
 */
function AboutDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="absolute bottom-4 right-4 z-20 text-white/40 hover:text-white/80 hover:bg-black/30 backdrop-blur-sm">
          <Info size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-black/80 backdrop-blur-md border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center tracking-widest uppercase text-xl font-light" style={{letterSpacing: '0.25em', fontFamily: 'serif'}}>
            ✧ S O B R E ✧
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 relative">
          {/* Elementos de fundo similares à tela principal */}
          <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full opacity-20 animate-slow-spin" style={{animationDuration: '120s'}}>
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="aboutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF9900" />
                  <stop offset="100%" stopColor="#0066ff" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="45" fill="none" stroke="url(#aboutGradient)" strokeWidth="0.8" />
            </svg>
          </div>
          
          <p className="text-sm tracking-wide font-light leading-relaxed text-white/80">
            O Baco é mais que um aplicativo; é um portal para conexões reais e experiências autênticas. 
            Inspirado na celebração, na união e no compartilhar momentos que transcendem o ordinário, 
            o Baco busca reviver o ato humano de se reunir, criar laços e experimentar a essência de 
            conhecer novas pessoas.
          </p>
          
          <p className="text-sm tracking-wide font-light leading-relaxed text-white/80">
            Com uma abordagem universalista, o Baco acolhe a diversidade e promove encontros que 
            celebram o que nos torna humanos: a capacidade de se conectar, de aprender uns com os 
            outros e de perceber que todos somos parte de algo maior.
          </p>
          
          <div className="pt-4 border-t border-white/10">
            <p className="text-center text-xs text-white/70 uppercase tracking-widest" style={{letterSpacing: '0.15em'}}>C R I A D O R</p>
            <p className="text-center mt-2 font-light bg-gradient-to-r from-primary to-baco-blue bg-clip-text text-transparent">
              Kevin Matheus Barbosa
            </p>
            <p className="text-center text-xs text-white/60 mt-1">
              nascido em 1999, originário de Bauru-SP, Brasil
            </p>
          </div>
          
          <p className="text-center text-xs text-white/50 mt-2">
            ✧ O N D E &nbsp; V O C Ê &nbsp; S E &nbsp; C O N E C T A &nbsp; À &nbsp; E X P E R I Ê N C I A ✧
          </p>
        </div>
        
        <DialogClose asChild>
          <Button variant="ghost" className="text-white/70 hover:text-white mt-2 mx-auto block">
            Voltar
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Esquema para o formulário de recuperação de senha
 */
const recoveryFormSchema = z.object({
  username: z.string().min(11, "CPF deve ter 11 dígitos").max(14, "CPF inválido"),
  email: z.string().email("E-mail inválido"),
});

/**
 * Componente de página de autenticação
 * Inclui formulários de login, cadastro e recuperação de senha
 */
export default function AuthPage() {
  // Estado para controlar qual formulário está sendo exibido
  const [formType, setFormType] = useState<AuthFormType>("login");
  
  // Hook de autenticação para acessar dados e métodos
  const { user, loginMutation, registerMutation, isLoading } = useAuth();

  // Redireciona para a página inicial se o usuário já estiver autenticado
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Fundo representando a matriz espiritual/cósmica */}
      <div className="absolute inset-0 bg-black z-0">
        {/* Gradiente de fundo profundo */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-[#0A0A14] to-[#070711] opacity-90"></div>
        
        {/* Elementos geométricos sagrados e matriz cósmica */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          {/* Grade de matriz sutilmente brilhante */}
          <div className="absolute inset-0 opacity-10" 
               style={{
                 backgroundImage: 'linear-gradient(#FF9900 0.5px, transparent 0.5px), linear-gradient(90deg, #FF9900 0.5px, transparent 0.5px)',
                 backgroundSize: '40px 40px',
               }}>
          </div>
          
          {/* Flor da Vida - Geometria Sagrada */}
          <div className="absolute top-[10%] left-[10%] w-[25rem] h-[25rem] opacity-10 animate-slow-spin" 
               style={{ animationDuration: '120s' }}>
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="flowerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF9900" />
                  <stop offset="100%" stopColor="#0066ff" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="16" fill="none" stroke="url(#flowerGradient)" strokeWidth="0.5" />
              <circle cx="66" cy="50" r="16" fill="none" stroke="url(#flowerGradient)" strokeWidth="0.5" />
              <circle cx="58" cy="66" r="16" fill="none" stroke="url(#flowerGradient)" strokeWidth="0.5" />
              <circle cx="42" cy="66" r="16" fill="none" stroke="url(#flowerGradient)" strokeWidth="0.5" />
              <circle cx="34" cy="50" r="16" fill="none" stroke="url(#flowerGradient)" strokeWidth="0.5" />
              <circle cx="42" cy="34" r="16" fill="none" stroke="url(#flowerGradient)" strokeWidth="0.5" />
              <circle cx="58" cy="34" r="16" fill="none" stroke="url(#flowerGradient)" strokeWidth="0.5" />
              <circle cx="50" cy="18" r="16" fill="none" stroke="url(#flowerGradient)" strokeWidth="0.5" />
              <circle cx="50" cy="82" r="16" fill="none" stroke="url(#flowerGradient)" strokeWidth="0.5" />
              <circle cx="26" cy="34" r="16" fill="none" stroke="url(#flowerGradient)" strokeWidth="0.5" />
              <circle cx="26" cy="66" r="16" fill="none" stroke="url(#flowerGradient)" strokeWidth="0.5" />
              <circle cx="74" cy="66" r="16" fill="none" stroke="url(#flowerGradient)" strokeWidth="0.5" />
              <circle cx="74" cy="34" r="16" fill="none" stroke="url(#flowerGradient)" strokeWidth="0.5" />
            </svg>
          </div>
          
          {/* Árvore da Vida - Cabala */}
          <div className="absolute top-[20%] right-[10%] w-[15rem] h-[15rem] opacity-15 animate-pulse-slow">
            <svg viewBox="0 0 100 160" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="treeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0066ff" />
                  <stop offset="100%" stopColor="#FF9900" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="10" r="8" fill="none" stroke="url(#treeGradient)" strokeWidth="1" />
              <circle cx="30" cy="30" r="8" fill="none" stroke="url(#treeGradient)" strokeWidth="1" />
              <circle cx="70" cy="30" r="8" fill="none" stroke="url(#treeGradient)" strokeWidth="1" />
              <circle cx="50" cy="50" r="8" fill="none" stroke="url(#treeGradient)" strokeWidth="1" />
              <circle cx="20" cy="70" r="8" fill="none" stroke="url(#treeGradient)" strokeWidth="1" />
              <circle cx="80" cy="70" r="8" fill="none" stroke="url(#treeGradient)" strokeWidth="1" />
              <circle cx="35" cy="90" r="8" fill="none" stroke="url(#treeGradient)" strokeWidth="1" />
              <circle cx="65" cy="90" r="8" fill="none" stroke="url(#treeGradient)" strokeWidth="1" />
              <circle cx="50" cy="110" r="8" fill="none" stroke="url(#treeGradient)" strokeWidth="1" />
              <circle cx="50" cy="140" r="8" fill="none" stroke="url(#treeGradient)" strokeWidth="1" />
              <line x1="50" y1="18" x2="50" y2="42" stroke="url(#treeGradient)" strokeWidth="0.5" />
              <line x1="38" y1="30" x2="62" y2="30" stroke="url(#treeGradient)" strokeWidth="0.5" />
              <line x1="30" y1="38" x2="50" y2="50" stroke="url(#treeGradient)" strokeWidth="0.5" />
              <line x1="70" y1="38" x2="50" y2="50" stroke="url(#treeGradient)" strokeWidth="0.5" />
              <line x1="50" y1="58" x2="50" y2="102" stroke="url(#treeGradient)" strokeWidth="0.5" />
              <line x1="20" y1="78" x2="35" y2="90" stroke="url(#treeGradient)" strokeWidth="0.5" />
              <line x1="80" y1="78" x2="65" y2="90" stroke="url(#treeGradient)" strokeWidth="0.5" />
              <line x1="35" y1="98" x2="50" y2="110" stroke="url(#treeGradient)" strokeWidth="0.5" />
              <line x1="65" y1="98" x2="50" y2="110" stroke="url(#treeGradient)" strokeWidth="0.5" />
              <line x1="50" y1="118" x2="50" y2="132" stroke="url(#treeGradient)" strokeWidth="0.5" />
            </svg>
          </div>

          {/* Merkaba - Tetraedro Estelar */}
          <div className="absolute bottom-[15%] left-[15%] w-[12rem] h-[12rem] opacity-20 animate-slow-spin" 
               style={{ animationDuration: '80s' }}>
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <polygon points="50,15 15,65 85,65" fill="none" stroke="#FF9900" strokeWidth="0.8" opacity="0.8" />
              <polygon points="50,85 15,35 85,35" fill="none" stroke="#0066ff" strokeWidth="0.8" opacity="0.8" />
            </svg>
          </div>
          
          {/* Espiral Áurea - Sequência de Fibonacci */}
          <div className="absolute bottom-[20%] right-[15%] w-[14rem] h-[14rem] opacity-25 animate-slow-spin" 
               style={{ animationDuration: '-100s' }}>
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <path d="M95,50 A45,45 0 0,0 50,5 A45,45 0 0,0 5,50 A45,45 0 0,0 50,95 A45,45 0 0,0 95,50 Z" 
                    fill="none" stroke="#FF9900" strokeWidth="0.5" opacity="0.6" />
              <path d="M81,50 A31,31 0 0,0 50,19 A31,31 0 0,0 19,50 A31,31 0 0,0 50,81 A31,31 0 0,0 81,50 Z" 
                    fill="none" stroke="#0066ff" strokeWidth="0.5" opacity="0.6" />
              <path d="M69,50 A19,19 0 0,0 50,31 A19,19 0 0,0 31,50 A19,19 0 0,0 50,69 A19,19 0 0,0 69,50 Z" 
                    fill="none" stroke="#FF9900" strokeWidth="0.5" opacity="0.6" />
              <path d="M62,50 A12,12 0 0,0 50,38 A12,12 0 0,0 38,50 A12,12 0 0,0 50,62 A12,12 0 0,0 62,50 Z" 
                    fill="none" stroke="#0066ff" strokeWidth="0.5" opacity="0.6" />
              <path d="M57,50 A7,7 0 0,0 50,43 A7,7 0 0,0 43,50 A7,7 0 0,0 50,57 A7,7 0 0,0 57,50 Z" 
                    fill="none" stroke="#FF9900" strokeWidth="0.5" opacity="0.6" />
            </svg>
          </div>
          
          {/* Ponto de Luz brilhante simulando consciência */}
          <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full animate-pulse-bright"></div>
          
          {/* Linhas conectando os pontos - representando a rede da matriz */}
          <div className="absolute inset-0 w-full h-full">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <line x1="10%" y1="20%" x2="90%" y2="20%" stroke="#0066ff" strokeWidth="0.3" opacity="0.1" />
              <line x1="20%" y1="10%" x2="20%" y2="90%" stroke="#FF9900" strokeWidth="0.3" opacity="0.1" />
              <line x1="10%" y1="80%" x2="90%" y2="80%" stroke="#0066ff" strokeWidth="0.3" opacity="0.1" />
              <line x1="80%" y1="10%" x2="80%" y2="90%" stroke="#FF9900" strokeWidth="0.3" opacity="0.1" />
              <line x1="10%" y1="10%" x2="90%" y2="90%" stroke="#0066ff" strokeWidth="0.3" opacity="0.1" />
              <line x1="90%" y1="10%" x2="10%" y2="90%" stroke="#FF9900" strokeWidth="0.3" opacity="0.1" />
            </svg>
          </div>
        </div>
      </div>
      
      <div className="max-w-md w-full z-10 relative">
        {/* Logo com B conectado */}
        <div className="relative mb-10">
          <div className="absolute -top-20 -left-32 w-40 h-40 rounded-[70%_30%_70%_30%] bg-primary opacity-20 animate-slow-morph"></div>
          
          <div className="mx-auto flex flex-col items-center justify-center relative">
            {/* Logo com estilo de fonte de rua tipo pintura */}
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="relative h-40 flex justify-center items-center mb-4">
                  {/* Efeito de glitch/digital cyberpunk */}
                  <div className="absolute inset-0 w-full h-full">
                    {/* Linhas horizontais estilo digital */}
                    <div className="absolute top-[15%] left-0 w-full h-[1px] bg-primary/30 animate-pulse"></div>
                    <div className="absolute top-[35%] left-0 w-full h-[1px] bg-baco-blue/30 animate-pulse" style={{animationDelay: '0.5s'}}></div>
                    <div className="absolute top-[65%] left-0 w-full h-[1px] bg-primary/30 animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <div className="absolute top-[85%] left-0 w-full h-[1px] bg-baco-blue/30 animate-pulse" style={{animationDelay: '0.7s'}}></div>
                    
                    {/* Círculos decorativos */}
                    <div className="absolute top-[10%] right-[5%] w-12 h-12 rounded-full border-2 border-primary/30"></div>
                    <div className="absolute bottom-[10%] left-[5%] w-8 h-8 rounded-full border border-baco-blue/30"></div>
                    
                    {/* Linhas diagonais */}
                    <div className="absolute top-0 left-[10%] w-[1px] h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent transform rotate-12"></div>
                    <div className="absolute top-0 right-[15%] w-[1px] h-full bg-gradient-to-b from-transparent via-baco-blue/20 to-transparent transform -rotate-12"></div>
                  </div>
                  
                  {/* Logo principal com efeito neón - só amarelo */}
                  <div className="relative z-10 transform hover:scale-105 transition-all duration-300">
                    {/* Camada de brilho externo */}
                    <div className="absolute inset-0 blur-xl bg-yellow-500 opacity-30 animate-pulse filter"></div>
                    
                    {/* Camada de brilho interno */}
                    <div className="absolute inset-0 blur-md bg-yellow-400 opacity-40"></div>
                    
                    {/* Texto com efeito neon */}
                    <h1 className="relative text-8xl uppercase" 
                        style={{
                          fontFamily: 'Futura, "Trebuchet MS", Arial, sans-serif',
                          fontWeight: '600',
                          letterSpacing: '0.05em'
                        }}>
                      {/* Logo em amarelo */}
                      <span className="absolute -inset-0.5 text-yellow-300 blur-sm animate-pulse">BACO</span>
                      <span className="relative text-yellow-400">BACO</span>
                    </h1>
                    
                    {/* Efeito de escaneamento */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-yellow-400/20 to-transparent animate-scan"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-white mt-5 text-center tracking-widest uppercase text-xs font-light" 
               style={{letterSpacing: '0.35em', fontFamily: 'serif'}}>
              <span className="inline-block px-1 animate-float">O N D E</span>
              <span className="inline-block px-1 animate-float" style={{animationDelay: '0.15s'}}>V O C Ê</span>
              <span className="inline-block px-1 animate-float" style={{animationDelay: '0.3s'}}>S E</span>
              <span className="inline-block px-1 animate-float" style={{animationDelay: '0.45s'}}>C O N E C T A</span>
              <span className="inline-block px-1 animate-float" style={{animationDelay: '0.6s'}}>À</span>
            </p>
            <p className="text-center mt-1">
              <span className="text-primary inline-block text-2xl font-bold tracking-widest animate-float" 
                    style={{animationDelay: '0.75s', letterSpacing: '0.15em', fontFamily: 'serif'}}>
                ✧ E X P E R I Ê N C I A ✧
              </span>
            </p>
          </div>
        </div>

        {/* Formulário de login */}
        {formType === "login" && (
          <LoginForm
            onShowRecovery={() => setFormType("recovery")}
            onShowRegister={() => setFormType("register")}
          />
        )}

        {/* Formulário de recuperação de senha */}
        {formType === "recovery" && (
          <RecoveryForm
            onBackToLogin={() => setFormType("login")}
          />
        )}

        {/* Formulário de cadastro */}
        {formType === "register" && (
          <RegisterForm
            onBackToLogin={() => setFormType("login")}
          />
        )}
      </div>
      
      {/* Botão Sobre */}
      <AboutDialog />
    </div>
  );
}

/**
 * Componente de formulário de login
 */
function LoginForm({
  onShowRecovery,
  onShowRegister,
}: {
  onShowRecovery: () => void;
  onShowRegister: () => void;
}) {
  const { loginMutation } = useAuth();
  
  // Inicializa o formulário com o esquema de validação do login
  const form = useForm<z.infer<typeof loginUserSchema>>({
    resolver: zodResolver(loginUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Função para lidar com o envio do formulário
  function onSubmit(values: z.infer<typeof loginUserSchema>) {
    loginMutation.mutate(values);
  }

  return (
    <div className="relative">
      {/* Efeito de brilho atrás do card */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary via-primary to-baco-blue opacity-40 blur-md rounded-[30px_10px_30px_10px]"></div>
      
      <div className="relative backdrop-blur-sm bg-black/60 border border-white/10 p-6 rounded-[30px_10px_30px_10px] text-white overflow-hidden shadow-[0_10px_40px_-15px_rgba(0,0,0,0.3)]">
        {/* Decoração de círculos */}
        <div className="absolute -top-8 -right-8 w-16 h-16 bg-primary/20 rounded-full blur-md"></div>
        <div className="absolute -bottom-8 -left-8 w-16 h-16 bg-baco-blue/20 rounded-full blur-md"></div>
        
        <h2 className="text-2xl font-bold text-white mb-8 relative">
          Login
          <span className="absolute -bottom-2 left-0 w-12 h-1 bg-gradient-to-r from-primary to-baco-blue rounded-full"></span>
        </h2>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">CPF</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite seu CPF" 
                      className="border-white/10 focus-visible:ring-baco-blue bg-black/40 text-white backdrop-blur-sm rounded-lg"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Senha</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Digite sua senha" 
                      className="border-white/10 focus-visible:ring-baco-blue bg-black/40 text-white backdrop-blur-sm rounded-lg"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-primary to-baco-blue hover:from-baco-blue hover:to-primary text-white rounded-full transition-all duration-500 shadow-[0_5px_15px_rgba(255,153,0,0.3)]"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Entrar
            </Button>
          </form>
        </Form>
        
        <div className="mt-8 text-center relative">
          <Button 
            variant="link" 
            onClick={onShowRecovery}
            className="text-white hover:text-primary text-sm font-medium transition-colors"
          >
            Esqueci minha senha
          </Button>
          <div className="mt-4 flex flex-wrap justify-center items-center gap-1">
            <span className="text-gray-400 text-sm">Não tem uma conta?</span> 
            <Button 
              variant="link" 
              onClick={onShowRegister}
              className="text-primary hover:text-white text-sm font-medium ml-1 transition-colors"
            >
              Cadastre-se
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Componente de formulário de recuperação de senha
 */
function RecoveryForm({
  onBackToLogin,
}: {
  onBackToLogin: () => void;
}) {
  // Inicializa o formulário com o esquema de validação da recuperação
  const form = useForm<z.infer<typeof recoveryFormSchema>>({
    resolver: zodResolver(recoveryFormSchema),
    defaultValues: {
      username: "",
      email: "",
    },
  });

  // Função para lidar com o envio do formulário
  function onSubmit(values: z.infer<typeof recoveryFormSchema>) {
    console.log(values);
    // Implementação futura: API de recuperação de senha
    alert("E-mail de recuperação enviado com sucesso!");
    onBackToLogin();
  }

  return (
    <div className="relative">
      {/* Efeito de brilho atrás do card */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary via-baco-blue to-primary opacity-40 blur-md rounded-[10px_30px_10px_30px]"></div>
      
      <div className="relative backdrop-blur-sm bg-black/60 border border-white/10 p-6 rounded-[10px_30px_10px_30px] text-white overflow-hidden shadow-[0_10px_40px_-15px_rgba(0,0,0,0.3)]">
        {/* Decoração de círculos */}
        <div className="absolute -top-8 -left-8 w-16 h-16 bg-primary/20 rounded-full blur-md"></div>
        <div className="absolute -bottom-8 -right-8 w-16 h-16 bg-baco-blue/20 rounded-full blur-md"></div>
        
        <h2 className="text-2xl font-bold text-white mb-8 relative">
          Recuperar Senha
          <span className="absolute -bottom-2 left-0 w-12 h-1 bg-gradient-to-r from-baco-blue to-primary rounded-full"></span>
        </h2>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">CPF</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite seu CPF" 
                      className="border-white/10 focus-visible:ring-primary bg-black/40 text-white backdrop-blur-sm rounded-lg"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">E-mail</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="Digite seu e-mail" 
                      className="border-white/10 focus-visible:ring-primary bg-black/40 text-white backdrop-blur-sm rounded-lg"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-baco-blue to-primary hover:from-primary hover:to-baco-blue text-white rounded-full transition-all duration-500 shadow-[0_5px_15px_rgba(0,30,255,0.3)]"
            >
              Recuperar Senha
            </Button>
          </form>
        </Form>
        
        <div className="mt-8 text-center relative">
          <Button 
            variant="link" 
            onClick={onBackToLogin}
            className="text-white hover:text-baco-blue text-sm font-medium transition-colors"
          >
            Voltar para o login
          </Button>
        </div>
      </div>
    </div>
  );
}

// Componente RegisterForm importado de @/components/register-form
