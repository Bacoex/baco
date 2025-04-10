import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertEventSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { MapPin, X, Upload, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
}

const formSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório"),
  description: z.string().min(1, "A descrição é obrigatória"),
  date: z.string().min(1, "A data é obrigatória"),
  timeStart: z.string().min(1, "O horário de início é obrigatório"),
  timeEnd: z.string().optional(),
  location: z.string().min(1, "O local é obrigatório"),
  coordinates: z.string().optional(),
  coverImage: z.string().optional(),
  capacity: z.string().optional().nullable(),
  ticketPrice: z.string().optional().nullable(),
  categoryId: z.string().min(1, "A categoria é obrigatória"),
  eventType: z.enum(["public", "private_ticket", "private_application"]),
});

export function EditEventModal({ isOpen, onClose, eventId }: EditEventModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Buscar informações do evento
  const { data: event, isLoading } = useQuery({
    queryKey: [`/api/events/${eventId}`],
    queryFn: getEventById,
    enabled: isOpen && !!eventId,
  });

  // Buscar categorias
  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/categories");
        const data = await response.json();
        console.log("Categorias disponíveis no EditEventModal:", data);
        console.log("Tipo de categories:", typeof data);
        console.log("É array?", Array.isArray(data));
        console.log("Comprimento:", data.length);
        return data;
      } catch (error) {
        console.error("Erro ao buscar categorias:", error);
        return [];
      }
    },
  });

  async function getEventById() {
    const response = await fetch(`/api/events/${eventId}`);
    if (!response.ok) {
      throw new Error("Erro ao buscar detalhes do evento");
    }
    return response.json();
  }

  // Configuração do formulário
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      date: "",
      timeStart: "",
      timeEnd: "",
      location: "",
      coordinates: "",
      coverImage: "",
      categoryId: "",
      eventType: "public",
      capacity: "",
      ticketPrice: "",
    },
  });

  // Atualizar valores do formulário quando o evento for carregado
  useEffect(() => {
    if (event) {
      form.reset({
        name: event.name,
        description: event.description,
        date: event.date,
        timeStart: event.timeStart,
        timeEnd: event.timeEnd || "",
        location: event.location,
        coordinates: event.coordinates || "",
        coverImage: event.coverImage || "",
        categoryId: String(event.categoryId),
        eventType: event.eventType as "public" | "private_ticket" | "private_application",
        capacity: event.capacity ? String(event.capacity) : "",
        ticketPrice: event.ticketPrice ? String(event.ticketPrice) : "",
      });
      
      // Atualizar preview da imagem se houver
      if (event.coverImage) {
        setImagePreview(event.coverImage);
      }
    }
  }, [event, form]);

  const updateEventMutation = useMutation({
    mutationFn: async (formData: z.infer<typeof formSchema>) => {
      // Preparar os dados para envio
      const eventData = {
        ...formData,
        categoryId: Number(formData.categoryId),
        capacity: formData.capacity ? Number(formData.capacity) : null,
        ticketPrice: formData.ticketPrice ? Number(formData.ticketPrice) : null,
      };

      const response = await apiRequest("PUT", `/api/events/${eventId}`, eventData);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao atualizar evento");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Evento atualizado",
        description: "O evento foi atualizado com sucesso.",
      });
      
      // Invalidar consultas para atualizar a interface
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}`] });
      
      // Fechar o modal
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar evento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Função para upload de imagem local
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload/event-image', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao fazer upload da imagem');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Atualiza o campo coverImage com a URL da imagem enviada
      form.setValue('coverImage', data.imageUrl);
      setImagePreview(data.imageUrl);
      
      toast({
        title: 'Imagem enviada',
        description: 'A imagem foi enviada com sucesso.',
      });
      
      // Não devemos fechar o modal após o upload da imagem,
      // apenas mostrar uma mensagem de sucesso e continuar na edição
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao enviar imagem',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });
  
  // Manipula a seleção de arquivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Verifica o tipo do arquivo
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast({
        title: 'Tipo de arquivo inválido',
        description: 'Por favor, selecione uma imagem (jpg, jpeg, png, gif, webp)',
        variant: 'destructive',
      });
      return;
    }
    
    // Verifica o tamanho do arquivo (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo permitido é 5MB',
        variant: 'destructive',
      });
      return;
    }
    
    // Faz o upload do arquivo
    uploadImageMutation.mutate(file);
  };
  
  // Função para abrir o seletor de arquivos
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Função para enviar o formulário
  function onSubmit(data: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    updateEventMutation.mutate(data);
  }

  if (isLoading) {
    return (
      <Dialog 
        open={isOpen} 
        onOpenChange={(open) => {
          // Impede que o modal feche durante o carregamento
          if (!open) {
            onClose();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carregando...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Impede que o modal feche durante o upload de imagem
        if (!open && isUploading) {
          return;
        }
        // Caso contrário, fecha normalmente
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Evento</DialogTitle>
          <DialogDescription>
            Altere as informações do seu evento. Clique em salvar quando terminar.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Informações básicas */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Evento*</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do evento" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição*</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o evento, suas atrações e o que os participantes podem esperar"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Data e hora */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data*</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="timeStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário de Início*</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
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
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Localização */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local*</FormLabel>
                    <div className="flex items-center space-x-2">
                      <FormControl className="flex-grow">
                        <Input placeholder="Endereço do evento" {...field} />
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

              {/* Campo oculto de coordenadas */}
              <FormField
                control={form.control}
                name="coordinates"
                render={({ field }) => (
                  <input type="hidden" {...field} />
                )}
              />
            </div>

            <Separator />

            {/* Categoria e tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria*</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((category: any) => (
                          <SelectItem
                            key={category.id}
                            value={String(category.id)}
                          >
                            {category.name}
                            {category.ageRestriction && ` (${category.ageRestriction}+)`}
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
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Evento*</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="public">Público</SelectItem>
                        <SelectItem value="private_ticket">
                          Privado (Ingresso)
                        </SelectItem>
                        <SelectItem value="private_application">
                          Privado (Candidatura)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Imagem e configurações adicionais */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="coverImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imagem de Capa</FormLabel>
                    <div className="space-y-2">
                      <FormControl>
                        <Input
                          placeholder="URL da imagem"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            setImagePreview(e.target.value);
                          }}
                        />
                      </FormControl>
                      
                      {/* Preview da imagem */}
                      {imagePreview && (
                        <div className="relative mt-2 max-w-md mx-auto">
                          <img 
                            src={imagePreview} 
                            alt="Preview da imagem" 
                            className="h-48 w-full object-cover rounded-md" 
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview(null);
                              field.onChange("");
                            }}
                            className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-full hover:bg-black/90"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      
                      {/* Input para upload de arquivo (oculto) */}
                      <input
                        type="file"
                        id="file-upload"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handleFileSelect}
                      />
                      
                      {!imagePreview && (
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 rounded-md">
                          <div className="space-y-3 text-center">
                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex flex-col gap-3 text-sm text-gray-600">
                              <div className="flex items-center justify-center">
                                <label
                                  htmlFor="image-url"
                                  className="relative cursor-pointer rounded-md bg-white font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2"
                                >
                                  <span>Adicione a URL da imagem</span>
                                </label>
                              </div>
                              <div className="flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={triggerFileInput}
                                  className="relative cursor-pointer rounded-md bg-white font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 flex items-center gap-1"
                                  disabled={isUploading}
                                >
                                  <ImageIcon className="h-4 w-4" />
                                  <span>{isUploading ? "Enviando..." : "Enviar imagem do computador"}</span>
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500">
                              Formatos suportados: JPG, PNG, GIF, WEBP (max. 5MB)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <FormDescription>
                      URL da imagem que será exibida no topo do card do evento
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacidade</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Número de participantes"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ticketPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Preço do Ingresso {form.watch("eventType") === "private_ticket" && "*"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Valor em R$"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}