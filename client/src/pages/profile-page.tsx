import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Phone, Instagram, MessageSquare, Lock, ExternalLink, Camera, X, Check, ChevronLeft, Home } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { updateUserProfileSchema, User } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { getUserDisplayName } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Eneagon } from "@/components/ui/eneagon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Link, useParams } from "wouter";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "A senha atual é obrigatória"),
  newPassword: z.string()
    .min(8, "A nova senha deve ter pelo menos 8 caracteres")
    .refine(val => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/.test(val), {
      message: "A senha deve conter pelo menos 1 caractere especial, 1 letra maiúscula, 1 letra minúscula e 1 número"
    }),
  confirmPassword: z.string().min(1, "Confirme a nova senha")
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"]
});

const phoneValidationSchema = z.object({
  code: z.string().min(1, "Insira o código de verificação"),
});

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const params = useParams();
  const profileId = params.id ? parseInt(params.id) : undefined;
  const isOwnProfile = !profileId;
  const [activeTab, setActiveTab] = useState("profile");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showPhoneValidation, setShowPhoneValidation] = useState(false);
  const [phoneValidationSent, setPhoneValidationSent] = useState(false);
  const [emailValidationSent, setEmailValidationSent] = useState(false);
  
  // Consulta para buscar dados do perfil do usuário, caso não seja o próprio usuário
  const userProfileQuery = useQuery({
    queryKey: ["/api/users", profileId],
    queryFn: async () => {
      if (!profileId) return null;
      const res = await apiRequest("GET", `/api/users/${profileId}`);
      return res.json();
    },
    enabled: !!profileId,
  });
  
  // Perfil a ser exibido (próprio usuário ou outro usuário)
  const profileToShow = profileId ? userProfileQuery.data : user;

  // Form para edição do perfil
  const profileForm = useForm<z.infer<typeof updateUserProfileSchema>>({
    resolver: zodResolver(updateUserProfileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      birthDate: user?.birthDate || "",
      zodiacSign: user?.zodiacSign || "",
      city: user?.city || "",
      state: user?.state || "",
      biography: user?.biography || "",
      instagramUsername: user?.instagramUsername || "",
      threadsUsername: user?.threadsUsername || "",
    },
  });
  
  // Form para troca de senha
  const passwordForm = useForm<z.infer<typeof passwordChangeSchema>>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Form para validação de telefone/email
  const validationForm = useForm<z.infer<typeof phoneValidationSchema>>({
    resolver: zodResolver(phoneValidationSchema),
    defaultValues: {
      code: "",
    },
  });

  // Atualizar form quando o usuário for carregado
  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        birthDate: user.birthDate,
        zodiacSign: user.zodiacSign,
        city: user.city || "",
        state: user.state || "",
        biography: user.biography || "",
        instagramUsername: user.instagramUsername || "",
        threadsUsername: user.threadsUsername || "",
      });
      
      // Se houver foto de perfil, mostrar preview
      if (user.profileImage) {
        setImagePreview(user.profileImage);
      }
    }
  }, [user]);

  // Funções para envio de código de validação
  const sendPhoneValidation = async () => {
    try {
      await apiRequest("POST", "/api/send-phone-validation", { phone: profileForm.getValues("phone") });
      setPhoneValidationSent(true);
      setShowPhoneValidation(true);
      toast({
        title: "Código enviado!",
        description: "Um código de validação foi enviado para o seu telefone.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar código",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const sendEmailValidation = async () => {
    try {
      await apiRequest("POST", "/api/send-email-validation", { email: profileForm.getValues("email") });
      setEmailValidationSent(true);
      toast({
        title: "Código enviado!",
        description: "Um link de validação foi enviado para o seu email.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar email",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Mutação para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof updateUserProfileSchema>) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      return res.json();
    },
    onSuccess: (updatedUser: User) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para atualizar foto de perfil
  const updateProfileImageMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const res = await apiRequest("PATCH", "/api/user/profile-image", { image: imageData });
      return res.json();
    },
    onSuccess: (updatedUser: User) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar foto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para trocar senha
  const changePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordChangeSchema>) => {
      const res = await apiRequest("POST", "/api/user/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Senha alterada!",
        description: "Sua senha foi alterada com sucesso.",
      });
      setShowPasswordDialog(false);
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para validar telefone
  const validatePhoneMutation = useMutation({
    mutationFn: async (data: z.infer<typeof phoneValidationSchema>) => {
      const res = await apiRequest("POST", "/api/validate-phone", {
        phone: profileForm.getValues("phone"),
        code: data.code,
      });
      return res.json();
    },
    onSuccess: (updatedUser: User) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Telefone validado!",
        description: "Seu telefone foi validado com sucesso.",
      });
      setShowPhoneValidation(false);
      validationForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao validar telefone",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handler para upload de imagem
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 10MB",
        variant: "destructive",
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      // Aqui estamos apenas armazenando o preview, não enviando ainda
    };
    reader.readAsDataURL(file);
  };

  // Submit do formulário de perfil
  const onSubmitProfile = (data: z.infer<typeof updateUserProfileSchema>) => {
    updateProfileMutation.mutate(data);
    
    // Se houve alteração na imagem, enviar separadamente
    if (imagePreview && imagePreview !== user?.profileImage) {
      updateProfileImageMutation.mutate(imagePreview);
    }
  };

  // Submit do formulário de senha
  const onSubmitPassword = (data: z.infer<typeof passwordChangeSchema>) => {
    changePasswordMutation.mutate(data);
  };

  // Submit do formulário de validação de telefone
  const onSubmitValidation = (data: z.infer<typeof phoneValidationSchema>) => {
    validatePhoneMutation.mutate(data);
  };

  // Verificar se os dados do usuário estão carregados
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Verificar se está visualizando perfil de outro usuário e se os dados estão carregando
  if (profileId && userProfileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Verificar se o perfil não foi encontrado
  if (profileId && userProfileQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Perfil não encontrado</h1>
        <p className="text-gray-400 mb-6">O usuário solicitado não existe ou não está disponível.</p>
        <Link to="/">
          <Button variant="default">Voltar à página inicial</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-4">
        <Link to="/">
          <Button variant="ghost" size="sm" className="flex items-center gap-1 text-white">
            <ChevronLeft className="h-4 w-4" />
            <span>Voltar à página inicial</span>
          </Button>
        </Link>
      </div>
      <div className="flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-1/3">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Eneagon className="w-32 h-32 mb-2">
                    <div className="w-full h-full">
                      {profileToShow?.profileImage ? (
                        <img 
                          src={profileToShow.profileImage} 
                          alt={getUserDisplayName(profileToShow)}
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground">
                          <span className="text-2xl font-bold">{getUserDisplayName(profileToShow).charAt(0)}</span>
                        </div>
                      )}
                    </div>
                  </Eneagon>
                  {isOwnProfile && (
                    <label 
                      htmlFor="profile-image" 
                      className="absolute bottom-2 right-2 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer shadow-lg"
                    >
                      <Camera className="h-4 w-4" />
                      <input 
                        id="profile-image" 
                        type="file" 
                        className="sr-only" 
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">{getUserDisplayName(profileToShow)}</CardTitle>
              <CardDescription>{profileToShow?.city && profileToShow?.state ? `${profileToShow.city}, ${profileToShow.state}` : ''}</CardDescription>
              
              <div className="flex gap-2 mt-2 justify-center">
                {profileToShow?.instagramUsername && (
                  <a 
                    href={`https://instagram.com/${profileToShow.instagramUsername}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white hover:text-gray-300"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {profileToShow?.threadsUsername && (
                  <a 
                    href={`https://threads.net/@${profileToShow.threadsUsername}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white hover:text-gray-300"
                  >
                    <div className="h-5 w-5 flex items-center justify-center font-semibold">@</div>
                  </a>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {profileToShow?.biography && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2">Biografia</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {profileToShow.biography}
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="rounded-full px-3">
                    {profileToShow?.zodiacSign}
                  </Badge>
                </div>
                
                <Separator className="my-3" />
                
                {!profileId && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>{profileToShow?.email}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{profileToShow?.phone}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              {isOwnProfile ? (
                <>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setShowPasswordDialog(true)}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Alterar Senha
                  </Button>
                  <Link to="/my-events">
                    <Button variant="secondary" className="w-full">
                      Meus Eventos
                    </Button>
                  </Link>
                </>
              ) : (
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={() => window.location.href = `mailto:${profileToShow?.email}`}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Entrar em contato
                </Button>
              )}
            </CardFooter>
          </Card>
        </aside>
        
        <main className="w-full md:w-2/3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="profile">Perfil</TabsTrigger>
              {isOwnProfile && (
                <TabsTrigger value="settings">Configurações</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="profile" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Perfil</CardTitle>
                  <CardDescription>
                    Atualize suas informações pessoais. CPF e RG não podem ser alterados.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome</FormLabel>
                              <FormControl>
                                <Input placeholder="Seu nome" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sobrenome</FormLabel>
                              <FormControl>
                                <Input placeholder="Seu sobrenome" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>CPF</Label>
                          <div className="flex mt-2">
                            <Input value={user.username} disabled className="bg-gray-100" />
                            <Button type="button" variant="link" className="text-xs" onClick={() => window.location.href = "mailto:bacoexperiencias@gmail.com"}>
                              Contatar suporte
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Para alterar o CPF, entre em contato com o suporte.</p>
                        </div>
                        
                        <div>
                          <Label>RG</Label>
                          <div className="flex mt-2">
                            <Input value={user.rg} disabled className="bg-gray-100" />
                            <Button type="button" variant="link" className="text-xs" onClick={() => window.location.href = "mailto:bacoexperiencias@gmail.com"}>
                              Contatar suporte
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Para alterar o RG, entre em contato com o suporte.</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <FormField
                            control={profileForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input placeholder="Seu email" {...field} />
                                  </FormControl>
                                  {field.value !== user.email && (
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      size="icon"
                                      onClick={sendEmailValidation}
                                      disabled={emailValidationSent}
                                    >
                                      {emailValidationSent ? <Check className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                                    </Button>
                                  )}
                                </div>
                                <FormMessage />
                                {field.value !== user.email && (
                                  <FormDescription>
                                    Email não verificado. Clique no botão para enviar um código de verificação.
                                  </FormDescription>
                                )}
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div>
                          <FormField
                            control={profileForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefone</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input placeholder="Seu telefone" {...field} />
                                  </FormControl>
                                  {field.value !== user.phone && (
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      size="icon"
                                      onClick={sendPhoneValidation}
                                      disabled={phoneValidationSent}
                                    >
                                      {phoneValidationSent ? <Check className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                                    </Button>
                                  )}
                                </div>
                                <FormMessage />
                                {field.value !== user.phone && (
                                  <FormDescription>
                                    Telefone não verificado. Clique no botão para enviar um código de verificação.
                                  </FormDescription>
                                )}
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="birthDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data de Nascimento</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="zodiacSign"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Signo</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione seu signo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Áries">Áries</SelectItem>
                                  <SelectItem value="Touro">Touro</SelectItem>
                                  <SelectItem value="Gêmeos">Gêmeos</SelectItem>
                                  <SelectItem value="Câncer">Câncer</SelectItem>
                                  <SelectItem value="Leão">Leão</SelectItem>
                                  <SelectItem value="Virgem">Virgem</SelectItem>
                                  <SelectItem value="Libra">Libra</SelectItem>
                                  <SelectItem value="Escorpião">Escorpião</SelectItem>
                                  <SelectItem value="Sagitário">Sagitário</SelectItem>
                                  <SelectItem value="Capricórnio">Capricórnio</SelectItem>
                                  <SelectItem value="Aquário">Aquário</SelectItem>
                                  <SelectItem value="Peixes">Peixes</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cidade</FormLabel>
                              <FormControl>
                                <Input placeholder="Sua cidade" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estado</FormLabel>
                              <FormControl>
                                <Input placeholder="Seu estado" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="instagramUsername"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome de usuário do Instagram</FormLabel>
                              <div className="flex">
                                <span className="bg-gray-100 border border-r-0 rounded-l-md px-3 flex items-center text-gray-500">
                                  @
                                </span>
                                <FormControl>
                                  <Input 
                                    placeholder="seu_usuario" 
                                    {...field} 
                                    className="rounded-l-none"
                                  />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={profileForm.control}
                          name="threadsUsername"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome de usuário do Threads</FormLabel>
                              <div className="flex">
                                <span className="bg-gray-100 border border-r-0 rounded-l-md px-3 flex items-center text-gray-500">
                                  @
                                </span>
                                <FormControl>
                                  <Input 
                                    placeholder="seu_usuario" 
                                    {...field} 
                                    className="rounded-l-none"
                                  />
                                </FormControl>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={profileForm.control}
                        name="biography"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Biografia</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Conte um pouco sobre você..." 
                                {...field} 
                                rows={4}
                              />
                            </FormControl>
                            <FormDescription>
                              Máximo de 500 caracteres.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Salvar Alterações
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações</CardTitle>
                  <CardDescription>
                    Gerencie suas configurações e preferências.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Notificações</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="notify-events" className="font-medium">Novidades e Eventos</Label>
                          <p className="text-sm text-gray-500">Receba notificações sobre novos eventos em sua área</p>
                        </div>
                        <Switch id="notify-events" defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="notify-participants" className="font-medium">Participantes</Label>
                          <p className="text-sm text-gray-500">Receba notificações quando houver novas candidaturas aos seus eventos</p>
                        </div>
                        <Switch id="notify-participants" defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="notify-messages" className="font-medium">Mensagens</Label>
                          <p className="text-sm text-gray-500">Receba notificações quando receber novas mensagens</p>
                        </div>
                        <Switch id="notify-messages" defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="notify-email" className="font-medium">Notificações por Email</Label>
                          <p className="text-sm text-gray-500">Receba um resumo semanal por email</p>
                        </div>
                        <Switch id="notify-email" />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Idioma</h3>
                    <Select defaultValue="pt-BR">
                      <SelectTrigger className="w-full md:w-1/2">
                        <SelectValue placeholder="Selecione um idioma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500 mt-1">
                      Alterar o idioma irá reiniciar a aplicação.
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Privacidade</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="profile-public" className="font-medium">Perfil Público</Label>
                          <p className="text-sm text-gray-500">Permitir que qualquer pessoa veja seu perfil</p>
                        </div>
                        <Switch id="profile-public" defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="event-public" className="font-medium">Eventos Públicos</Label>
                          <p className="text-sm text-gray-500">Tornar público os eventos que você participará</p>
                        </div>
                        <Switch id="event-public" defaultChecked />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Aparência</h3>
                    <Select defaultValue="system">
                      <SelectTrigger className="w-full md:w-1/2">
                        <SelectValue placeholder="Selecione um tema" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Claro</SelectItem>
                        <SelectItem value="dark">Escuro</SelectItem>
                        <SelectItem value="system">Padrão do Sistema</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button className="w-full">Salvar Configurações</Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      
      {/* Dialog para troca de senha */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Digite sua senha atual e a nova senha.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha Atual</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Digite sua senha atual" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Digite a nova senha" {...field} />
                    </FormControl>
                    <FormDescription>
                      A senha deve conter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirme a Nova Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirme a nova senha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowPasswordDialog(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Alterar Senha
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para validação de telefone */}
      <Dialog open={showPhoneValidation} onOpenChange={setShowPhoneValidation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validação de Telefone</DialogTitle>
            <DialogDescription>
              Digite o código de verificação enviado para seu telefone.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...validationForm}>
            <form onSubmit={validationForm.handleSubmit(onSubmitValidation)} className="space-y-4">
              <FormField
                control={validationForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Verificação</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o código" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowPhoneValidation(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={validatePhoneMutation.isPending}
                >
                  {validatePhoneMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Validar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}