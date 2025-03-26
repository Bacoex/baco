import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Eneagon } from "@/components/ui/eneagon";
import { SearchIcon, UserIcon, Settings, LogOut, Calendar } from "lucide-react";
import { getUserDisplayName } from "@/lib/utils";

/**
 * Componente de cabeçalho da aplicação
 * Inclui logo, barra de pesquisa e perfil do usuário
 */
export default function Header() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  
  // Função para lidar com a pesquisa
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implementação futura: API de pesquisa
    toast({
      title: "Pesquisa",
      description: `Você pesquisou por: ${searchQuery}`,
    });
  };
  
  // Função para lidar com o logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Função para mostrar uma mensagem para funcionalidades em desenvolvimento
  const showComingSoon = (feature: string) => {
    toast({
      title: "Em breve",
      description: `A funcionalidade "${feature}" estará disponível em breve!`,
    });
  };
  
  return (
    <header className="bg-black shadow-lg fixed top-0 left-0 w-full z-10 border-b border-primary/20">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo BACO com link para página inicial */}
        <button 
          onClick={() => setLocation("/")}
          className="flex items-center mr-6 ml-2 cursor-pointer focus:outline-none"
        >
          <div className="relative">
            <div className="flex items-center">
              {/* Logo principal com texto simples */}
              <div className="flex items-center">
                <div className="w-6 h-[2px] bg-gradient-to-r from-transparent to-orange-500"></div>
                <h1 className="mx-2 text-xl uppercase" 
                    style={{
                      fontFamily: 'Futura, "Trebuchet MS", Arial, sans-serif',
                      fontWeight: '600',
                      letterSpacing: '0.05em'
                    }}>
                  <span className="bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-400 bg-clip-text text-transparent">BACO</span>
                </h1>
                <div className="w-6 h-[2px] bg-gradient-to-l from-transparent to-orange-500"></div>
              </div>
            </div>
          </div>
        </button>
        
        {/* Barra de pesquisa */}
        <div className="flex-1 max-w-md mx-4">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Input 
                type="text" 
                placeholder="Pesquisar eventos..." 
                className="pl-10 border-baco-blue focus-visible:ring-baco-blue"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>
          </form>
        </div>
        
        {/* Botão de filtros */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="mr-2 border-primary/40 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              <span className="sr-only">Filtros</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filtrar eventos por</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* TODO: Adicionar itens de filtro quando implementados */}
            <DropdownMenuItem onClick={() => showComingSoon("Filtros")}>
              Todas categorias
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => showComingSoon("Filtros")}>
              Eventos gratuitos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => showComingSoon("Filtros")}>
              Eventos próximos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => showComingSoon("Filtros")}>
              Eventos desta semana
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Perfil do usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
              <Eneagon>
                {user?.profileImage ? (
                  <img 
                    src={user.profileImage} 
                    alt={getUserDisplayName(user)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-black flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-baco-blue" />
                  </div>
                )}
              </Eneagon>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{getUserDisplayName(user) || "Minha Conta"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setLocation("/profile")}>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Meu Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation("/profile?tab=settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation("/my-events")}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Meus Eventos</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-red-500 focus:text-red-500"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
