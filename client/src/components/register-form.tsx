import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema } from "@shared/schema";

// Lista de signos para o dropdown
const zodiacSigns = [
  { value: "aries", label: "Áries" },
  { value: "taurus", label: "Touro" },
  { value: "gemini", label: "Gêmeos" },
  { value: "cancer", label: "Câncer" },
  { value: "leo", label: "Leão" },
  { value: "virgo", label: "Virgem" },
  { value: "libra", label: "Libra" },
  { value: "scorpio", label: "Escorpião" },
  { value: "sagittarius", label: "Sagitário" },
  { value: "capricorn", label: "Capricórnio" },
  { value: "aquarius", label: "Aquário" },
  { value: "pisces", label: "Peixes" },
];

/**
 * Esquema estendido para o formulário de registro
 * Adiciona validação para a confirmação de senha
 */
const registerFormSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Confirme sua senha"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

/**
 * Componente que exibe os requisitos de senha
 */
function PasswordRequirements() {
  return (
    <div className="text-xs text-gray-500 mt-1 space-y-1">
      <p>A senha deve conter pelo menos:</p>
      <ul className="list-disc pl-4">
        <li>8 caracteres</li>
        <li>1 letra maiúscula</li>
        <li>1 letra minúscula</li>
        <li>1 número</li>
        <li>1 caractere especial (ex: !@#$%&*)</li>
      </ul>
    </div>
  );
}

/**
 * Componente que exibe os requisitos de CPF
 */
function CPFRequirements() {
  return (
    <div className="text-xs text-gray-500 mt-1">
      Digite apenas os números do CPF (11 dígitos). O sistema verificará se o CPF é válido.
    </div>
  );
}

/**
 * Componente que exibe os requisitos de RG
 */
function RGRequirements() {
  return (
    <div className="text-xs text-gray-500 mt-1">
      Digite seu RG com pelo menos 5 caracteres. O sistema verificará se o formato é válido.
    </div>
  );
}

/**
 * Componente de formulário de cadastro
 */
export default function RegisterForm({
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
    <Card className="border-baco-blue bg-black text-white">
      <CardContent className="pt-6">
        <h2 className="text-2xl font-bold text-white mb-6">Cadastro</h2>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-300">Nome</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite seu nome" 
                      className="border-baco-blue focus-visible:ring-baco-blue bg-black text-white"
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
                  <FormLabel className="text-gray-300">Sobrenome</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite seu sobrenome" 
                      className="border-baco-blue focus-visible:ring-baco-blue bg-black text-white"
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
                      placeholder="Digite seu CPF (somente números)" 
                      {...field} 
                    />
                  </FormControl>
                  <CPFRequirements />
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
                  <RGRequirements />
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
                  <PasswordRequirements />
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
              className="w-full hover:bg-baco-blue"
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