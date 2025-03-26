import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEventSchema } from "@shared/schema";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, X, Info, Ticket, Users } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";

/**
 * Props para o componente de modal de criação de evento
 */
interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
}

/**
 * Tipo para os dados do formulário de criação de evento
 */
type EventFormValues = z.infer<typeof insertEventSchema>;

// Tipos de eventos disponíveis
type EventType = 'public' | 'private_ticket' | 'private_application';

// Interface para ticket adicional
interface AdditionalTicket {
  name: string;
  price: number;
  description?: string;
}

/**
 * Componente de modal para criação de eventos
 */
export default function CreateEventModal({ isOpen, onClose, categories }: CreateEventModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [eventType, setEventType] = useState<EventType>('public');
  const [additionalTickets, setAdditionalTickets] = useState<AdditionalTicket[]>([]);
  const [showMapSelector, setShowMapSelector] = useState(false);
  
  // Inicializa o formulário com o esquema de validação
  const form = useForm<EventFormValues>({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      name: "",
      description: "",
      date: "",
      timeStart: "",
      timeEnd: "",
      location: "",
      coordinates: "",
      coverImage: "",
      categoryId: 0,
      eventType: "public",
      importantInfo: "",
      ticketPrice: 0,
      capacity: 0,
    },
  });
  
  // Observa mudanças no tipo de evento
  const watchEventType = form.watch("eventType");
  
  // Efeito para atualizar o tipo de evento interno quando o formulário muda
  useEffect(() => {
    if (watchEventType) {
      setEventType(watchEventType as EventType);
    }
  }, [watchEventType]);
  
  // Mutação para criar um novo evento
  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      // Preparar os dados adicionais conforme o tipo de evento
      let eventData = { ...data };
      
      // Se for evento com ingressos, processa os ingressos adicionais
      if (data.eventType === 'private_ticket' && additionalTickets.length > 0) {
        eventData.additionalTickets = JSON.stringify(additionalTickets);
      }
      
      const res = await apiRequest("POST", "/api/events", eventData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Evento criado com sucesso!",
        description: "Seu evento foi publicado e já está disponível para todos.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      form.reset();
      setImagePreview(null);
      setAdditionalTickets([]);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar evento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Função para lidar com o envio do formulário
  function onSubmit(data: EventFormValues) {
    // Converte tipos numéricos
    const eventData = {
      ...data,
      categoryId: Number(data.categoryId),
      ticketPrice: data.eventType === 'private_ticket' ? Number(data.ticketPrice) : 0,
      capacity: data.capacity ? Number(data.capacity) : null,
    };
    
    createEventMutation.mutate(eventData);
  }
  
  // Função para simular o upload de imagem (sem backend real neste momento)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Em um app real, aqui enviaria a imagem para o servidor
      // e obteria a URL, mas para fins de demonstração, usamos URL.createObjectURL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      form.setValue("coverImage", previewUrl);
    }
  };
  
  // Função para adicionar um novo tipo de ingresso
  const addAdditionalTicket = () => {
    setAdditionalTickets([...additionalTickets, { name: "", price: 0 }]);
  };
  
  // Função para atualizar um ingresso adicional
  const updateAdditionalTicket = (index: number, field: keyof AdditionalTicket, value: string | number) => {
    const updatedTickets = [...additionalTickets];
    updatedTickets[index] = { ...updatedTickets[index], [field]: value };
    setAdditionalTickets(updatedTickets);
  };
  
  // Função para remover um ingresso adicional
  const removeAdditionalTicket = (index: number) => {
    setAdditionalTickets(additionalTickets.filter((_, i) => i !== index));
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="absolute right-4 top-4 z-10">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="rounded-full h-8 w-8 text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-primary">Criar Evento</DialogTitle>
          <DialogDescription>
            Preencha os detalhes do seu evento para publicá-lo na plataforma.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Tipo de evento */}
            <FormField
              control={form.control}
              name="eventType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Tipo de Evento</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2 px-4 py-2 border rounded-md hover:bg-gray-50 cursor-pointer">
                        <RadioGroupItem value="public" id="event-public" />
                        <label htmlFor="event-public" className="cursor-pointer flex items-center">
                          <Info className="h-4 w-4 mr-2 text-blue-500" />
                          <div>
                            <div className="font-medium">Evento Público</div>
                            <div className="text-sm text-gray-500">Aberto para todos, sem restrições.</div>
                          </div>
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2 px-4 py-2 border rounded-md hover:bg-gray-50 cursor-pointer">
                        <RadioGroupItem value="private_ticket" id="event-ticket" />
                        <label htmlFor="event-ticket" className="cursor-pointer flex items-center">
                          <Ticket className="h-4 w-4 mr-2 text-green-500" />
                          <div>
                            <div className="font-medium">Evento com Ingressos</div>
                            <div className="text-sm text-gray-500">Acesso mediante compra de ingresso.</div>
                          </div>
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2 px-4 py-2 border rounded-md hover:bg-gray-50 cursor-pointer">
                        <RadioGroupItem value="private_application" id="event-application" />
                        <label htmlFor="event-application" className="cursor-pointer flex items-center">
                          <Users className="h-4 w-4 mr-2 text-orange-500" />
                          <div>
                            <div className="font-medium">Evento com Candidatura</div>
                            <div className="text-sm text-gray-500">Participantes precisam se candidatar e ser aprovados.</div>
                          </div>
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Separator className="my-4" />
            
            {/* Nome do evento */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Evento</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome do evento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Categoria */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Data e hora */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                      <Input type="time" value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
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
                      <Input type="time" value={field.value || ""} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
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
            
            {showMapSelector && (
              <div className="border rounded-md p-4 bg-gray-50">
                <p className="text-sm text-gray-500 mb-4">
                  Aqui seria integrada a API do Google Maps para seleção de localização.
                  No momento, insira o endereço manualmente.
                </p>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowMapSelector(false)}
                >
                  Fechar mapa
                </Button>
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
                  Evento com Candidatura
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
              className="w-full"
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
