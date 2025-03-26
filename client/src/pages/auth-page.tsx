import { useState, useEffect, useRef } from "react";
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
 * Componente de rede com pontos se conectando
 * Cria um efeito visual de nós conectados em uma rede
 */
function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Redimensionar o canvas para ocupar toda a tela
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Definir pontos na rede
    const pointCount = 60;
    const points: { x: number; y: number; dx: number; dy: number; radius: number; }[] = [];
    
    for (let i = 0; i < pointCount; i++) {
      points.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        dx: (Math.random() - 0.5) * 0.5,
        dy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 1.5 + 0.5,
      });
    }
    
    // Função para desenhar a rede
    const drawNetwork = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Desenhar pontos
      for (let i = 0; i < pointCount; i++) {
        const point = points[i];
        
        // Atualizar posição
        point.x += point.dx;
        point.y += point.dy;
        
        // Rebater nas bordas
        if (point.x < 0 || point.x > canvas.width) point.dx *= -1;
        if (point.y < 0 || point.y > canvas.height) point.dy *= -1;
        
        // Desenhar ponto
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();
        
        // Desenhar linhas conectando pontos próximos
        for (let j = i + 1; j < pointCount; j++) {
          const otherPoint = points[j];
          const distance = Math.sqrt(
            Math.pow(point.x - otherPoint.x, 2) + Math.pow(point.y - otherPoint.y, 2)
          );
          
          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(otherPoint.x, otherPoint.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 - distance / 1500})`;
            ctx.lineWidth = 0.3;
            ctx.stroke();
          }
        }
      }
      
      requestAnimationFrame(drawNetwork);
    };
    
    const animationId = requestAnimationFrame(drawNetwork);
    
    // Limpar evento e animação ao desmontar
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full z-0 bg-transparent pointer-events-none"
    />
  );
}

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
      {/* Fundo com pontos se conectando em rede */}
      <div className="absolute inset-0 bg-black z-0">
        {/* Gradiente de fundo profundo */}
        <div className="absolute inset-0 bg-gradient-to-br from-black via-[#0A0A14] to-[#070711] opacity-90"></div>
        
        {/* Componente de rede com pontos se conectando */}
        <NetworkBackground />
      </div>
      
      <div className="max-w-md w-full z-10 relative">
        {/* Logo com B conectado */}
        <div className="relative mb-10">
          {/* Sem elementos decorativos */}
          
          <div className="mx-auto flex flex-col items-center justify-center relative">
            {/* Logo com estilo de fonte de rua tipo pintura */}
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="relative h-40 flex justify-center items-center mb-4">
                  {/* Fundo completamente limpo */}
                  <div className="absolute inset-0 w-full h-full overflow-hidden">
                    {/* Sem elementos de fundo */}
                  </div>
                  
                  {/* Logo com efeito de brilho suave */}
                  <div className="relative z-10 transform hover:scale-105 transition-all duration-500">
                    {/* Texto com brilho */}
                    <h1 className="relative text-8xl uppercase" 
                        style={{
                          fontFamily: 'Futura, "Trebuchet MS", Arial, sans-serif',
                          fontWeight: '600',
                          letterSpacing: '0.05em'
                        }}>
                      {/* Logo com gradiente laranja para amarelo */}
                      <span className="bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-400 bg-clip-text text-transparent animate-pulse-slow">BACO</span>
                    </h1>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-white mt-5 text-center tracking-widest uppercase text-xs font-light" 
               style={{letterSpacing: '0.35em', fontFamily: 'serif'}}>
              <span className="inline-block px-1 animate-float">O N D E</span>
              <span className="inline-block px-2 animate-float" style={{animationDelay: '0.15s'}}>V O C Ê</span>
              <span className="inline-block px-2 animate-float" style={{animationDelay: '0.3s'}}>S E</span>
              <span className="inline-block px-2 animate-float" style={{animationDelay: '0.45s'}}>C O N E C T A</span>
              <span className="inline-block px-2 animate-float" style={{animationDelay: '0.6s'}}>À</span>
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
      {/* Efeito de brilho atrás do card (mais sutil) */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary via-primary to-baco-blue opacity-20 blur-md rounded-[30px_10px_30px_10px]"></div>
      
      <div className="relative backdrop-blur-sm bg-black/60 border border-white/10 p-6 rounded-[30px_10px_30px_10px] text-white overflow-hidden shadow-[0_10px_40px_-15px_rgba(0,0,0,0.3)]">
        {/* Decoração de círculos (mais sutil) */}
        <div className="absolute -top-8 -right-8 w-16 h-16 bg-primary/10 rounded-full blur-md"></div>
        <div className="absolute -bottom-8 -left-8 w-16 h-16 bg-baco-blue/10 rounded-full blur-md"></div>
        
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
      {/* Efeito de brilho atrás do card (mais sutil) */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary via-baco-blue to-primary opacity-20 blur-md rounded-[10px_30px_10px_30px]"></div>
      
      <div className="relative backdrop-blur-sm bg-black/60 border border-white/10 p-6 rounded-[10px_30px_10px_30px] text-white overflow-hidden shadow-[0_10px_40px_-15px_rgba(0,0,0,0.3)]">
        {/* Decoração de círculos (mais sutil) */}
        <div className="absolute -top-8 -left-8 w-16 h-16 bg-primary/10 rounded-full blur-md"></div>
        <div className="absolute -bottom-8 -right-8 w-16 h-16 bg-baco-blue/10 rounded-full blur-md"></div>
        
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
