import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
        {/* Logo única com o B conectado */}
        <div className="flex items-center mr-6 ml-2">
          <div className="relative">
            <div className="flex items-center">
              <div className="relative">
                {/* B com conexões */}
                <div className="text-3xl font-bold text-primary relative">
                  <span className="relative">B</span>
                  {/* Pontos de conexão no B */}
                  <div className="absolute top-0 left-[10px] w-1 h-1 bg-primary rounded-full"></div>
                  <div className="absolute top-[6px] left-[18px] w-1 h-1 bg-primary rounded-full"></div>
                  <div className="absolute top-[13px] left-[18px] w-1 h-1 bg-primary rounded-full"></div>
                  <div className="absolute top-[20px] left-[10px] w-1 h-1 bg-primary rounded-full"></div>
                  <div className="absolute bottom-0 left-[10px] w-1 h-1 bg-primary rounded-full"></div>
                  
                  {/* Linhas de conexão no B */}
                  <div className="absolute top-0 left-[10px] w-[8px] h-[0.5px] bg-primary transform rotate-12 connection-line"></div>
                  <div className="absolute top-[6px] left-[10px] w-[8px] h-[0.5px] bg-primary transform connection-line"></div>
                  <div className="absolute top-[13px] left-[10px] w-[8px] h-[0.5px] bg-primary transform connection-line"></div>
                  <div className="absolute top-[20px] left-[10px] w-[8px] h-[0.5px] bg-primary transform -rotate-12 connection-line"></div>
                </div>
                <span className="text-3xl font-bold text-primary ml-1">aco</span>
              </div>
            </div>
            <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary rounded-full"></div>
            <div className="absolute -bottom-2 left-1/4 w-1/2 h-0.5 bg-primary/50 rounded-full"></div>
          </div>
        </div>
        
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
            <DropdownMenuItem onClick={() => showComingSoon("Meu Perfil")}>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Meu Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => showComingSoon("Configurações")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => showComingSoon("Meus Eventos")}>
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
