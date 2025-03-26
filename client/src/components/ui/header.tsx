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
        {/* Logo estilo fonte de rua */}
        <div className="flex items-center mr-6 ml-2">
          <div className="relative">
            <div className="flex items-center">
              <div className="relative h-10 w-24 flex justify-center items-center">
                {/* Efeito de glitch/digital cyberpunk */}
                <div className="absolute inset-0 w-full h-full">
                  {/* Linhas horizontais estilo digital */}
                  <div className="absolute top-[15%] left-0 w-full h-[0.5px] bg-primary/20 animate-pulse"></div>
                  <div className="absolute top-[75%] left-0 w-full h-[0.5px] bg-baco-blue/20 animate-pulse" style={{animationDelay: '0.3s'}}></div>
                  
                  {/* Linhas diagonais */}
                  <div className="absolute top-0 left-[10%] w-[0.5px] h-full bg-gradient-to-b from-transparent via-primary/10 to-transparent transform rotate-12"></div>
                  <div className="absolute top-0 right-[15%] w-[0.5px] h-full bg-gradient-to-b from-transparent via-baco-blue/10 to-transparent transform -rotate-12"></div>
                </div>
                
                {/* Logo principal com efeito neón */}
                <div className="relative z-10 transform hover:scale-105 transition-all duration-300">
                  {/* Camada de brilho externo */}
                  <div className="absolute inset-0 blur-md bg-gradient-to-br from-primary to-baco-blue opacity-20 animate-pulse filter"></div>
                  
                  {/* Texto com efeito neon */}
                  <h1 className="relative text-xl font-black tracking-tighter uppercase">
                    {/* Letras fragmentadas para efeito glitch */}
                    <span className="relative inline-block">
                      <span className="absolute -inset-0.5 text-primary blur-sm animate-pulse">B</span>
                      <span className="relative text-white mix-blend-overlay">B</span>
                    </span>
                    <span className="relative inline-block">
                      <span className="absolute -inset-0.5 text-baco-blue blur-sm animate-pulse" style={{animationDelay: '0.1s'}}>A</span>
                      <span className="relative text-white mix-blend-overlay">A</span>
                    </span>
                    <span className="relative inline-block">
                      <span className="absolute -inset-0.5 text-primary blur-sm animate-pulse" style={{animationDelay: '0.2s'}}>C</span>
                      <span className="relative text-white mix-blend-overlay">C</span>
                    </span>
                    <span className="relative inline-block">
                      <span className="absolute -inset-0.5 text-baco-blue blur-sm animate-pulse" style={{animationDelay: '0.3s'}}>O</span>
                      <span className="relative text-white mix-blend-overlay">O</span>
                    </span>
                  </h1>
                  
                  {/* Efeito de escaneamento */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent animate-scan"></div>
                </div>
              </div>
            </div>
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
