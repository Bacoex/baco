import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema, loginUserSchema } from "@shared/schema";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

/**
 * Tipos de formulários de autenticação disponíveis
 */
type AuthFormType = "login" | "register" | "recovery";

/**
 * Esquema estendido para o formulário de registro
 * Adiciona validação para a confirmação de senha
 */
const registerFormSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

/**
 * Esquema para o formulário de recuperação de senha
 */
const recoveryFormSchema = z.object({
  username: z.string().min(11, "CPF deve ter 11 dígitos").max(14, "CPF inválido"),
  email: z.string().email("E-mail inválido"),
});

/**
 * Lista de signos para o dropdown
 */
const zodiacSigns = [
  { value: "aries", label: "Áries" },
  { value: "touro", label: "Touro" },
  { value: "gemeos", label: "Gêmeos" },
  { value: "cancer", label: "Câncer" },
  { value: "leao", label: "Leão" },
  { value: "virgem", label: "Virgem" },
  { value: "libra", label: "Libra" },
  { value: "escorpiao", label: "Escorpião" },
  { value: "sagitario", label: "Sagitário" },
  { value: "capricornio", label: "Capricórnio" },
  { value: "aquario", label: "Aquário" },
  { value: "peixes", label: "Peixes" },
];

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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo e cabeçalho */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">Baco</h1>
          <p className="text-gray-600">Sua plataforma de eventos</p>
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
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Login</h2>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite seu CPF" 
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
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Digite sua senha" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Entrar
            </Button>
          </form>
        </Form>
        
        <div className="mt-6 text-center">
          <Button 
            variant="link" 
            onClick={onShowRecovery}
            className="text-primary hover:text-primary-600 text-sm font-medium"
          >
            Esqueci minha senha
          </Button>
          <div className="mt-4">
            <span className="text-gray-600 text-sm">Não tem uma conta?</span> 
            <Button 
              variant="link" 
              onClick={onShowRegister}
              className="text-primary hover:text-primary-600 text-sm font-medium ml-1"
            >
              Cadastre-se
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
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
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Recuperar Senha</h2>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite seu CPF" 
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
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="Digite seu e-mail" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full">
              Recuperar Senha
            </Button>
          </form>
        </Form>
        
        <div className="mt-6 text-center">
          <Button 
            variant="link" 
            onClick={onBackToLogin}
            className="text-primary hover:text-primary-600 text-sm font-medium"
          >
            Voltar para o login
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Componente de formulário de cadastro
 */
function RegisterForm({
  onBackToLogin,
}: {
  onBackToLogin: () => void;
}) {
  const { registerMutation } = useAuth();
  
  // Inicializa o formulário com o esquema de validação do cadastro
  const form = useForm<z.infer<typeof registerFormSchema>>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      birthDate: "",
      email: "",
      phone: "",
      rg: "",
      zodiacSign: "",
    },
  });

  // Função para lidar com o envio do formulário
  function onSubmit(values: z.infer<typeof registerFormSchema>) {
    // Remove a confirmação de senha antes de enviar
    const { confirmPassword, ...userData } = values;
    registerMutation.mutate(userData);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Cadastro</h2>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite seu nome" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sobrenome</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite seu sobrenome" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Nascimento</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite seu CPF" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="rg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RG</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite seu RG" 
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
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="Digite seu e-mail" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Celular</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="(XX) XXXXX-XXXX" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="zodiacSign"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Signo</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione seu signo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {zodiacSigns.map((sign) => (
                        <SelectItem key={sign.value} value={sign.value}>
                          {sign.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Digite sua senha" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirme sua Senha</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Confirme sua senha" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Cadastrar
            </Button>
          </form>
        </Form>
        
        <div className="mt-6 text-center">
          <Button 
            variant="link" 
            onClick={onBackToLogin}
            className="text-primary hover:text-primary-600 text-sm font-medium"
          >
            Já tem uma conta? Faça login
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
