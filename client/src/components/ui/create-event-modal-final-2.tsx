import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertEventSchema } from "@shared/schema";

// Componentes da UI
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
// Ícones
import { 
  Loader2, 
  MapPin,
  Users, 
  X,
  CalendarIcon,
  MapIcon,
  PlusCircle,
  Clock3,
  CalendarDays
} from "lucide-react";
import { LocationMapSelector } from "./location-map-selector";

/**
 * Props para o componente de modal de criação de evento
 */
interface CreateEventModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
    color?: string;
  }>;
  onSuccess?: () => void;
}

/**
 * Interface para subcategoria
 */
interface Subcategory {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
}

/**
 * Tipo para os dados do formulário de criação de evento
 */
type EventFormValues = z.infer<typeof insertEventSchema>;

/**
 * Tipo de evento
 */
type EventType = 'public' | 'private_ticket' | 'private_application';

/**
 * Interface para ingresso adicional
 */
interface AdditionalTicket {
  name: string;
  price: number;
  description?: string;
  [key: string]: string | number | undefined;
}

/**
 * Componente de modal para criação de eventos
 */
export default function CreateEventModal({ isOpen, setIsOpen, categories, onSuccess }: CreateEventModalProps) {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [eventType, setEventType] = useState<EventType>('public');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [additionalTickets, setAdditionalTickets] = useState<AdditionalTicket[]>([]);
  const [showCustomSubcategory, setShowCustomSubcategory] = useState(false);
  const [customSubcategoryName, setCustomSubcategoryName] = useState("");

  // Log das categorias disponíveis
  console.log("Categorias disponíveis no CreateEventModal:", categories);
  console.log("Tipo de categories:", typeof categories);
  console.log("É array?", Array.isArray(categories));
  console.log("Comprimento:", categories?.length);

  // Configuração do formulário com validação zod
  const form = useForm<EventFormValues>({
    resolver: zodResolver(
      insertEventSchema.extend({
        categoryId: z.number().min(1, "Selecione uma categoria"),
        subcategoryId: z.number().min(1, "Selecione uma subcategoria"),
        date: z.string().min(1, "A data é obrigatória"),
        timeStart: z.string().min(1, "O horário de início é obrigatório"),
      })
    ),
    defaultValues: {
      name: "",
      description: "",
      date: "",
      timeStart: "",
      timeEnd: "",
      location: "",
      coordinates: "",
      capacity: undefined,
      categoryId: undefined,
      subcategoryId: undefined,
      coverImage: "",
      eventType: "public",
      ticketPrice: 0,
      importantInfo: "",
    },
  });

  // Limpa o formulário quando o modal é fechado
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setSelectedCategory(null);
      setSubcategories([]);
      setImagePreview(null);
      setAdditionalTickets([]);
      setEventType('public');
    }
  }, [isOpen, form]);

  // Função para carregar subcategorias quando uma categoria é selecionada
  function handleCategoryChange(categoryId: string) {
    setSelectedCategory(categoryId);
    
    // Consulta de subcategorias
    fetch(`/api/categories/${categoryId}/subcategories`)
      .then(response => response.json())
      .then(data => {
        setSubcategories(data);
      })
      .catch(error => {
        console.error("Erro ao carregar subcategorias:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as subcategorias.",
          variant: "destructive",
        });
      });
  }

  // Altera o tipo de evento e atualiza o campo no formulário
  function handleEventTypeChange(value: string) {
    setEventType(value as EventType);
    form.setValue("eventType", value as EventType);
  }

  // Preview da imagem de capa
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        form.setValue("coverImage", base64String);
      };
      reader.readAsDataURL(file);
    }
  }

  // Funções para gerenciar os ingressos adicionais
  const addAdditionalTicket = () => {
    setAdditionalTickets([...additionalTickets, { name: "", price: 0 }]);
  };

  const updateAdditionalTicket = (index: number, field: keyof AdditionalTicket, value: string | number) => {
    const updatedTickets = [...additionalTickets];
    updatedTickets[index][field] = value;
    setAdditionalTickets(updatedTickets);
  };

  const removeAdditionalTicket = (index: number) => {
    const updatedTickets = [...additionalTickets];
    updatedTickets.splice(index, 1);
    setAdditionalTickets(updatedTickets);
  };

  // Mutação para criar evento
  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      // Adiciona os ingressos adicionais ao payload se existirem
      const payload = {
        ...data,
        additionalTickets: eventType === 'private_ticket' && additionalTickets.length > 0 
          ? JSON.stringify(additionalTickets) 
          : undefined,
      };
      
      console.log("Enviando payload para criação de evento:", payload);
      const response = await apiRequest("POST", "/api/events", payload);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Evento criado!",
        description: "Seu evento foi criado com sucesso.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/events/creator'] });
      
      setIsOpen(false);
      if (onSuccess) onSuccess();
      
      // Reset do formulário
      form.reset();
      setSelectedCategory(null);
      setSubcategories([]);
      setAdditionalTickets([]);
      setImagePreview(null);
      setEventType('public');
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar evento",
        description: error.message || "Ocorreu um erro ao criar o evento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Submit do formulário
  function onSubmit(data: EventFormValues) {
    // Não permitir envio se a opção "Outros" (-1) estiver selecionada
    // Neste caso, o usuário precisa clicar em "Confirmar" primeiro
    if (data.subcategoryId === -1) {
      toast({
        title: "Confirme a subcategoria",
        description: "Por favor, digite uma subcategoria personalizada e clique em 'Confirmar' antes de criar o evento",
        variant: "destructive"
      });
      return;
    }
    
    // Enviar normalmente com a subcategoria já criada e selecionada
    console.log("Criando evento com subcategoria:", data.subcategoryId);
    createEventMutation.mutate(data);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto left-[50%] translate-x-[-50%] scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent hover:scrollbar-thumb-primary/70">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Criar Evento</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Tipo de evento */}
            <div className="space-y-2">
              <FormLabel>Tipo de Evento</FormLabel>
              <Tabs defaultValue="public" onValueChange={handleEventTypeChange} className="w-full">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="public">Público</TabsTrigger>
                  <TabsTrigger value="private_ticket">Ingresso</TabsTrigger>
                  <TabsTrigger value="private_application">Experienciar</TabsTrigger>
                </TabsList>
                <TabsContent value="public" className="py-2">
                  <p className="text-sm text-gray-500">
                    Evento público, aberto a qualquer pessoa interessada.
                  </p>
                </TabsContent>
                <TabsContent value="private_ticket" className="py-2">
                  <p className="text-sm text-gray-500">
                    Evento com venda de ingressos. Defina preços e tipos de ingressos.
                  </p>
                </TabsContent>
                <TabsContent value="private_application" className="py-2">
                  <p className="text-sm text-gray-500">
                    Os participantes precisam se candidatar e você poderá aprovar ou rejeitar cada solicitação.
                  </p>
                </TabsContent>
              </Tabs>
            </div>

            {/* Título */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome do evento" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Categoria e Subcategoria */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(parseInt(value));
                        handleCategoryChange(value);
                      }} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories && categories.map((category) => (
                          <SelectItem 
                            key={category.id} 
                            value={category.id.toString()}
                          >
                            {category.name}
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
                name="subcategoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategoria</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        if (value === "-1") {
                          setShowCustomSubcategory(true);
                          // Mantenha o valor atual do campo para validação
                          field.onChange(parseInt(value));
                        } else {
                          setShowCustomSubcategory(false);
                          field.onChange(parseInt(value));
                        }
                      }} 
                      defaultValue={field.value?.toString()}
                      disabled={!selectedCategory || subcategories.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            !selectedCategory 
                              ? "Selecione uma categoria primeiro" 
                              : subcategories.length === 0 
                                ? "Carregando subcategorias..." 
                                : "Selecione uma subcategoria"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subcategories.map((subcategory) => (
                          <SelectItem 
                            key={subcategory.id} 
                            value={subcategory.id.toString()}
                          >
                            {subcategory.name}
                          </SelectItem>
                        ))}
                        <SelectItem 
                          key="outros" 
                          value="-1"
                          className="flex items-center text-primary font-medium"
                        >
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Outros (Digite sua própria subcategoria)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {showCustomSubcategory && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Digite uma subcategoria personalizada"
                            value={customSubcategoryName}
                            onChange={(e) => setCustomSubcategoryName(e.target.value)}
                            className="border-primary flex-grow"
                            onKeyDown={(e) => {
                              // Prevenir submissão do formulário quando pressionar Enter neste campo
                              if (e.key === 'Enter') {
                                e.preventDefault();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="bg-orange-500 text-white hover:bg-orange-600"
                            onClick={async () => {
                              if (!customSubcategoryName.trim()) {
                                toast({
                                  title: "Campo obrigatório",
                                  description: "Por favor, digite um nome para a subcategoria personalizada",
                                  variant: "destructive"
                                });
                                return;
                              }
                              
                              try {
                                // Obter o ID da categoria selecionada
                                const categoryId = form.getValues("categoryId");
                                if (!categoryId) {
                                  toast({
                                    title: "Erro",
                                    description: "Selecione uma categoria primeiro",
                                    variant: "destructive"
                                  });
                                  return;
                                }
                                
                                // Criar slug da subcategoria
                                const name = customSubcategoryName.trim();
                                const slug = name
                                  .toLowerCase()
                                  .normalize('NFD')
                                  .replace(/[\u0300-\u036f]/g, '')
                                  .replace(/[^a-z0-9]/g, '-')
                                  .replace(/-+/g, '-')
                                  .replace(/^-|-$/g, '');
                                
                                console.log("Enviando nova subcategoria:", {
                                  name,
                                  slug,
                                  categoryId
                                });
                                
                                // Enviar requisição para criar a subcategoria
                                const response = await fetch('/api/subcategories', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    name,
                                    slug,
                                    categoryId
                                  })
                                });
                                
                                if (!response.ok) {
                                  throw new Error("Falha ao criar subcategoria");
                                }
                                
                                const newSubcategory = await response.json();
                                console.log("Subcategoria criada:", newSubcategory);
                                
                                // Atualizar a lista de subcategorias
                                setSubcategories(prev => [...prev, newSubcategory]);
                                
                                // Selecionar a subcategoria recém-criada
                                form.setValue("subcategoryId", newSubcategory.id);
                                
                                // Esconder o campo de subcategoria personalizada
                                setShowCustomSubcategory(false);
                                
                                // Mostrar mensagem de sucesso
                                toast({
                                  title: "Subcategoria criada",
                                  description: `A subcategoria "${name}" foi criada com sucesso e já está disponível para todos os usuários.`,
                                });
                                
                                // Limpar o campo
                                setCustomSubcategoryName("");
                              } catch (error) {
                                console.error("Erro ao criar subcategoria:", error);
                                toast({
                                  title: "Erro",
                                  description: "Não foi possível criar a subcategoria. Tente novamente.",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            Confirmar
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                          Digite o nome da subcategoria personalizada e clique em "Confirmar"
                        </p>
                      </div>
                    )}
                  </FormItem>
                )}
              />
            </div>

            {/* Data e Hora */}
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        className="bg-orange-500 text-white border-orange-400 focus:border-orange-700 focus:ring-1 focus:ring-orange-700 placeholder-white" 
                        id={`date-input-${field.name}`}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário de Início</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        className="bg-orange-500 text-white border-orange-400 focus:border-orange-700 focus:ring-1 focus:ring-orange-700 placeholder-white"
                        id={`time-input-${field.name}`}
                        value={field.value || ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário de Término</FormLabel>
                    <FormDescription className="text-xs">Opcional</FormDescription>
                    <FormControl>
                      <Input
                        type="time"
                        className="bg-orange-500 text-white border-orange-400 focus:border-orange-700 focus:ring-1 focus:ring-orange-700 placeholder-white"
                        id={`time-input-${field.name}`}
                        value={field.value || ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Local */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local</FormLabel>
                  <div className="flex items-center space-x-2">
                    <FormControl className="flex-grow">
                      <Input placeholder="Digite o local do evento" {...field} />
                    </FormControl>
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="outline"
                      className="bg-orange-500 text-white hover:bg-orange-600"
                      onClick={() => setShowMapSelector(!showMapSelector)}
                      title="Selecionar no mapa"
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Campo oculto para coordenadas */}
            <input 
              type="hidden" 
              name="coordinates"
              value={form.getValues("coordinates") || ""}
            />

            {showMapSelector && (
              <div className="border rounded-md p-4 bg-gray-50">
                <LocationMapSelector 
                  initialLocation={form.getValues("location")}
                  onLocationSelect={(address, coordinates) => {
                    form.setValue("location", address);
                    form.setValue("coordinates", coordinates);
                    setShowMapSelector(false);
                  }}
                />
                <div className="mt-2 flex justify-end">
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowMapSelector(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Capacidade */}
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacidade</FormLabel>
                  <FormDescription className="text-xs">
                    Número máximo de participantes (deixe em branco para ilimitado)
                  </FormDescription>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Ilimitado" 
                      min="1"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campos específicos para cada tipo de evento */}
            {eventType === 'public' && (
              <FormField
                control={form.control}
                name="importantInfo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Informações Importantes</FormLabel>
                    <FormDescription className="text-xs">
                      Inclua aqui alertas ou informações essenciais sobre o evento
                    </FormDescription>
                    <FormControl>
                      <Textarea 
                        placeholder="Ex: Traga documento com foto, não é permitido animais, etc." 
                        rows={2}
                        value={field.value || ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {eventType === 'private_ticket' && (
              <>
                <FormField
                  control={form.control}
                  name="ticketPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço do Ingresso (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          min="0" 
                          step="0.01"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Ingressos adicionais */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <FormLabel>Tipos de Ingressos Adicionais</FormLabel>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      className="bg-orange-500 text-white hover:bg-orange-600"
                      onClick={addAdditionalTicket}
                    >
                      Adicionar
                    </Button>
                  </div>

                  {additionalTickets.length > 0 ? (
                    <div className="space-y-3">
                      {additionalTickets.map((ticket, index) => (
                        <div key={index} className="flex items-end gap-2 p-3 border rounded-md">
                          <div className="flex-grow">
                            <FormLabel className="text-xs">Nome</FormLabel>
                            <Input 
                              placeholder="Ex: VIP, Meia-entrada" 
                              value={ticket.name}
                              onChange={(e) => updateAdditionalTicket(index, 'name', e.target.value)}
                            />
                          </div>
                          <div className="w-1/4">
                            <FormLabel className="text-xs">Preço (R$)</FormLabel>
                            <Input 
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={ticket.price}
                              onChange={(e) => updateAdditionalTicket(index, 'price', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeAdditionalTicket(index)}
                            className="h-8 w-8 text-gray-400 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic border border-dashed rounded-md p-3 text-center">
                      Nenhum tipo de ingresso adicional cadastrado
                    </p>
                  )}
                </div>
              </>
            )}

            {eventType === 'private_application' && (
              <div className="bg-orange-50 p-4 rounded-md border border-orange-200">
                <h4 className="text-sm font-medium flex items-center mb-2">
                  <Users className="h-4 w-4 mr-2 text-orange-500" />
                  Experienciar
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  As pessoas interessadas precisarão se candidatar para participar do seu evento.
                  Você poderá aprovar ou rejeitar cada solicitação.
                </p>
                <p className="text-xs text-gray-500">
                  Depois de aprovados, os participantes poderão conversar entre si em um chat exclusivo.
                </p>
              </div>
            )}

            {/* Imagem do evento */}
            <div>
              <FormLabel>Imagem de Capa</FormLabel>
              <FormDescription className="text-xs">
                Imagem horizontal que será exibida como capa do evento (recomendado: 1200x630px)
              </FormDescription>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 rounded-md">
                <div className="space-y-1 text-center">
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="h-32 w-full object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          form.setValue("coverImage", "");
                        }}
                        className="absolute top-1 right-1 bg-white rounded-full p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                          <span>Enviar uma imagem</span>
                          <input 
                            id="file-upload" 
                            name="file-upload" 
                            type="file" 
                            className="sr-only"
                            accept="image/*"
                            onChange={handleImageChange}
                          />
                        </label>
                        <p className="pl-1">ou arraste e solte</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF até 10MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva o seu evento" 
                      rows={4}
                      value={field.value || ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botão de criar */}
            <Button 
              type="submit" 
              className="w-full bg-orange-500 text-white hover:bg-orange-600"
              disabled={createEventMutation.isPending}
            >
              {createEventMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Criar Evento
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}