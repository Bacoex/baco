import React, { useState } from "react";
import { FilterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterDialog, FilterOptions } from "@/components/ui/filter-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EventFilterControlProps {
  onFilterChange: (filters: FilterOptions) => void;
  categoryId?: number;
  className?: string;
}

export function EventFilterControl({ onFilterChange, categoryId, className = "" }: EventFilterControlProps) {
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({
    cities: [],
    subcategories: []
  });

  // Função para lidar com mudanças nos filtros
  const handleFilterChange = (filters: FilterOptions) => {
    setActiveFilters(filters);
    onFilterChange(filters);
  };

  // Conta o total de filtros ativos
  const totalActiveFilters = activeFilters.cities.length + activeFilters.subcategories.length;

  return (
    <div className={`flex items-center ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <FilterDialog onFilterChange={handleFilterChange} categoryId={categoryId} />
              {totalActiveFilters > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center rounded-full"
                >
                  {totalActiveFilters}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Filtrar eventos por cidade ou subcategoria</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}