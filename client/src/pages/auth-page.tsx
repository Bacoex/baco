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
import { Loader2 } from "lucide-react";
import RegisterForm from "@/components/register-form";

/**
 * Tipos de formulários de autenticação disponíveis
 */
type AuthFormType = "login" | "register" | "recovery";

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
      {/* Fundo com formas fluidas e cores vibrantes */}
      <div className="absolute inset-0 bg-black z-0">
        {/* Círculos e formas orgânicas */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-70">
          {/* Forma fluida 1 - roxo/rosa */}
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-[60%] bg-gradient-to-br from-purple-600 via-pink-500 to-primary animate-slow-pulse" 
               style={{filter: 'blur(80px)', transform: 'rotate(-15deg)'}}></div>
          
          {/* Forma fluida 2 - azul */}
          <div className="absolute bottom-[-30%] right-[-10%] w-[70%] h-[70%] rounded-[40%] bg-gradient-to-tl from-baco-blue via-blue-500 to-cyan-400 animate-slow-float" 
               style={{filter: 'blur(80px)', transform: 'rotate(30deg)'}}></div>
          
          {/* Forma fluida 3 - amarelo/laranja */}
          <div className="absolute top-[30%] right-[-20%] w-[50%] h-[50%] rounded-[60%] bg-gradient-to-bl from-yellow-400 via-primary to-red-500 animate-slow-spin" 
               style={{filter: 'blur(70px)', transform: 'rotate(15deg)'}}></div>
          
          {/* Padrão de linhas curvas */}
          <div className="absolute inset-0 mix-blend-overlay opacity-30" 
               style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23ffffff\' fill-opacity=\'0.6\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
              backgroundSize: '150px 150px'}}>
          </div>
          
          {/* Partículas brilhantes */}
          <div className="absolute w-2 h-2 top-1/4 left-1/4 bg-white rounded-full animate-pulse-slow"></div>
          <div className="absolute w-3 h-3 bottom-1/3 right-1/3 bg-white rounded-full animate-pulse-slow" style={{animationDelay: '1s'}}></div>
          <div className="absolute w-1 h-1 top-1/2 right-1/4 bg-white rounded-full animate-pulse-slow" style={{animationDelay: '2s'}}></div>
          <div className="absolute w-2 h-2 bottom-1/4 left-1/3 bg-white rounded-full animate-pulse-slow" style={{animationDelay: '1.5s'}}></div>
        </div>
      </div>
      
      <div className="max-w-md w-full z-10 relative">
        {/* Logo com formato orgânico */}
        <div className="relative mb-10">
          <div className="absolute -top-20 -left-20 w-40 h-40 rounded-[70%_30%_70%_30%] bg-gradient-to-r from-primary to-baco-blue opacity-30 animate-slow-morph" 
               style={{filter: 'blur(30px)'}}></div>
          
          <div className="w-36 h-36 mx-auto border-4 border-white/20 rounded-[60%_40%_50%_50%] overflow-hidden flex items-center justify-center shadow-[0_0_60px_rgba(255,153,0,0.6)] backdrop-blur-sm animate-slow-morph">
            <div className="relative z-20 transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <h1 className="text-5xl font-bold bg-gradient-to-br from-yellow-300 via-primary to-baco-blue bg-clip-text text-transparent animate-text-shimmer">Baco</h1>
            </div>
          </div>
          
          <p className="text-white mt-4 text-center text-xl font-light tracking-wide">
            <span className="inline-block animate-float">Sua </span>
            <span className="inline-block animate-float" style={{animationDelay: '0.2s'}}>plataforma </span>
            <span className="inline-block animate-float" style={{animationDelay: '0.4s'}}>de </span>
            <span className="bg-gradient-to-r from-primary to-baco-blue bg-clip-text text-transparent inline-block animate-float" style={{animationDelay: '0.6s'}}>eventos</span>
          </p>
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
