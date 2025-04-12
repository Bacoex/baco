import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilterIcon, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface City {
  name: string;
  count: number;
}

interface SubCategory {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  count: number;
}

interface FilterDialogProps {
  onFilterChange: (filters: FilterOptions) => void;
  categoryId?: number;
}

export interface FilterOptions {
  cities: string[];
  subcategories: number[];
}

export function FilterDialog({ onFilterChange, categoryId }: FilterDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [subcategorySearch, setSubcategorySearch] = useState("");
  
  // Estado para os filtros ativos
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<number[]>([]);
  
  // Estado para exibir tags de filtros ativos
  const [activeFilters, setActiveFilters] = useState<{
    cities: { name: string, value: string }[];
    subcategories: { name: string, value: number }[];
  }>({
    cities: [],
    subcategories: []
  });

  // Buscar cidades disponíveis nos eventos
  const { data: citiesData, refetch: refetchCities } = useQuery<City[]>({
    queryKey: ["/api/filters/cities"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/filters/cities");
        if (!response.ok) {
          throw new Error("Erro ao buscar cidades");
        }
        const data = await response.json();
        console.log("Dados de cidades carregados:", data);
        return data;
      } catch (error) {
        console.error("Erro ao carregar cidades:", error);
        return [];
      }
    },
    refetchOnWindowFocus: true,
    staleTime: 1000, // Reduzindo para 1 segundo para garantir dados atualizados
  });

  // Buscar subcategorias ativas disponíveis (apenas aquelas que têm eventos)
  const { data: subcategoriesData } = useQuery<SubCategory[]>({
    queryKey: ["/api/filters/subcategories/active", categoryId],
    queryFn: async () => {
      try {
        // Usar a nova rota que retorna apenas subcategorias com eventos associados
        const url = categoryId 
          ? `/api/filters/subcategories/active?categoryId=${categoryId}` 
          : "/api/filters/subcategories/active";
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Erro ao buscar subcategorias ativas");
        }
        return await response.json();
      } catch (error) {
        console.error("Erro ao carregar subcategorias ativas:", error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Filtrar cidades pela busca
  const filteredCities = citiesData 
    ? citiesData
        .filter(city => city.name.toLowerCase().includes(citySearch.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Filtrar subcategorias pela busca
  const filteredSubcategories = subcategoriesData
    ? subcategoriesData
        .filter(sub => sub.name.toLowerCase().includes(subcategorySearch.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Atualizar filtros ativos
  useEffect(() => {
    const cityFilters = selectedCities.map(city => ({
      name: city,
      value: city
    }));
    
    const subcategoryFilters = selectedSubcategories.map(subId => {
      const sub = subcategoriesData?.find(s => s.id === subId);
      return {
        name: sub?.name || `ID: ${subId}`,
        value: subId
      };
    });
    
    setActiveFilters({
      cities: cityFilters,
      subcategories: subcategoryFilters
    });
  }, [selectedCities, selectedSubcategories, subcategoriesData]);

  // Aplicar filtros
  const applyFilters = () => {
    onFilterChange({
      cities: selectedCities,
      subcategories: selectedSubcategories
    });
    
    // Mostrar toast resumindo os filtros aplicados
    const cityCount = selectedCities.length;
    const subCount = selectedSubcategories.length;
    
    if (cityCount > 0 || subCount > 0) {
      toast({
        title: "Filtros aplicados",
        description: `${cityCount} ${cityCount === 1 ? 'cidade' : 'cidades'} e ${subCount} ${subCount === 1 ? 'subcategoria' : 'subcategorias'} selecionadas.`,
      });
    } else {
      toast({
        title: "Filtros removidos",
        description: "Todos os eventos serão exibidos."
      });
    }
    
    setIsOpen(false);
  };

  // Limpar todos os filtros
  const clearAllFilters = () => {
    setSelectedCities([]);
    setSelectedSubcategories([]);
    setCitySearch("");
    setSubcategorySearch("");
    
    onFilterChange({
      cities: [],
      subcategories: []
    });
    
    toast({
      title: "Filtros removidos",
      description: "Todos os eventos serão exibidos."
    });
  };

  // Remover um filtro específico
  const removeFilter = (type: 'city' | 'subcategory', value: string | number) => {
    if (type === 'city') {
      setSelectedCities(prev => prev.filter(city => city !== value));
    } else {
      setSelectedSubcategories(prev => prev.filter(id => id !== value));
    }
  };

  // Atualizar filtros quando o diálogo fechar
  useEffect(() => {
    if (!isOpen) {
      // Aplicar filtros quando o diálogo for fechado
      onFilterChange({
        cities: selectedCities,
        subcategories: selectedSubcategories
      });
    } else {
      // Quando o diálogo for aberto, atualizar dados de cidades
      refetchCities();
    }
  }, [isOpen, refetchCities]);

  // Total de filtros ativos
  const totalActiveFilters = selectedCities.length + selectedSubcategories.length;

  return (
    <div>
      {/* Botão de filtro discreto com ícone */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center justify-center h-9 w-9 rounded-full p-0 relative"
            aria-label="Filtrar eventos"
          >
            <FilterIcon className="h-4 w-4" />
            {totalActiveFilters > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full"
                aria-label={`${totalActiveFilters} filtros ativos`}
              >
                {totalActiveFilters}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Filtrar Eventos</DialogTitle>
          </DialogHeader>
          
          {/* Mostrar filtros ativos como tags */}
          {totalActiveFilters > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-2 mt-2">
                {activeFilters.cities.map((city) => (
                  <Badge 
                    key={`city-${city.value}`} 
                    variant="secondary"
                    className="pl-2 flex items-center gap-1"
                  >
                    {city.name}
                    <button 
                      className="ml-1 rounded-full hover:bg-muted p-0.5"
                      onClick={() => removeFilter('city', city.value)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                
                {activeFilters.subcategories.map((sub) => (
                  <Badge 
                    key={`sub-${sub.value}`} 
                    variant="secondary"
                    className="pl-2 flex items-center gap-1"
                  >
                    {sub.name}
                    <button 
                      className="ml-1 rounded-full hover:bg-muted p-0.5"
                      onClick={() => removeFilter('subcategory', sub.value)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2 text-xs"
                onClick={clearAllFilters}
              >
                Limpar todos os filtros
              </Button>
            </div>
          )}
          
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(80vh-160px)]">
              <Accordion type="multiple" className="w-full">
                {/* Filtro por Cidade */}
                <AccordionItem value="city">
                  <AccordionTrigger>Cidade</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="city-search">Buscar cidade</Label>
                        <Input 
                          id="city-search"
                          value={citySearch}
                          onChange={(e) => setCitySearch(e.target.value)}
                          placeholder="Digite o nome da cidade"
                          className="mt-1"
                        />
                      </div>
                      
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {filteredCities.length > 0 ? (
                          filteredCities.map((city) => (
                            <div key={city.name} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`city-${city.name}`}
                                checked={selectedCities.includes(city.name)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedCities(prev => [...prev, city.name]);
                                  } else {
                                    setSelectedCities(prev => prev.filter(c => c !== city.name));
                                  }
                                }}
                              />
                              <label 
                                htmlFor={`city-${city.name}`}
                                className="text-sm flex-1 cursor-pointer flex justify-between"
                              >
                                <span>{city.name}</span>
                                <span className="text-muted-foreground">({city.count})</span>
                              </label>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            {citySearch ? "Nenhuma cidade encontrada" : "Carregando cidades..."}
                          </p>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                {/* Filtro por Subcategoria */}
                <AccordionItem value="subcategory">
                  <AccordionTrigger>Subcategoria</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="subcategory-search">Buscar subcategoria</Label>
                        <Input 
                          id="subcategory-search"
                          value={subcategorySearch}
                          onChange={(e) => setSubcategorySearch(e.target.value)}
                          placeholder="Digite o nome da subcategoria"
                          className="mt-1"
                        />
                      </div>
                      
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {filteredSubcategories.length > 0 ? (
                          filteredSubcategories.map((subcategory) => (
                            <div key={subcategory.id} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`subcategory-${subcategory.id}`}
                                checked={selectedSubcategories.includes(subcategory.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedSubcategories(prev => [...prev, subcategory.id]);
                                  } else {
                                    setSelectedSubcategories(prev => 
                                      prev.filter(id => id !== subcategory.id)
                                    );
                                  }
                                }}
                              />
                              <label 
                                htmlFor={`subcategory-${subcategory.id}`}
                                className="text-sm flex-1 cursor-pointer flex justify-between"
                              >
                                <span>{subcategory.name}</span>
                                <span className="text-muted-foreground">({subcategory.count})</span>
                              </label>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            {subcategorySearch ? "Nenhuma subcategoria encontrada" : "Carregando subcategorias..."}
                          </p>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </ScrollArea>
          </div>
          
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={applyFilters}>Aplicar Filtros</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}