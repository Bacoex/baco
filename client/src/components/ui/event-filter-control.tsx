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

  return (
    <div className={`flex items-center ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <FilterDialog onFilterChange={handleFilterChange} categoryId={categoryId} />
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