import { useState, useEffect, ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

interface SearchBarProps {
  filterButton?: ReactNode;
}

export function SearchBar({ filterButton }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [, navigate] = useLocation();
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Use a URL relativa sem barra inicial para evitar problemas de redirecionamento
      const searchPath = `search?q=${encodeURIComponent(searchTerm.trim())}`;
      console.log("Redirecionando para:", searchPath);
      navigate(searchPath);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-md">
      <form 
        onSubmit={handleSearch}
        className="relative flex items-center bg-black/30 backdrop-blur-sm rounded-full overflow-hidden border border-white/10 shadow-lg"
      >
        <Input
          type="text"
          placeholder="Buscar eventos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-0 p-3 pl-4 pr-10 text-white placeholder:text-white/60 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        
        {/* Botão de filtro (opcional) antes da lupa */}
        {filterButton && (
          <div className="absolute right-10 flex items-center">
            {filterButton}
          </div>
        )}
        
        <button 
          type="submit" 
          className="absolute right-3 text-white/70 hover:text-white"
          aria-label="Buscar"
        >
          <Search className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}