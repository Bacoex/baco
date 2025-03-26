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
                {/* Elementos sutis de conexão humana */}
                <div className="absolute inset-0 w-full h-full overflow-hidden">
                  {/* Ícone de pessoas se conectando */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 opacity-3">
                    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                      <g fill="white">
                        <circle cx="30" cy="30" r="8" />
                        <circle cx="70" cy="30" r="8" />
                        <path d="M30,40 L30,60 Q30,70 50,70 Q70,70 70,60 L70,40" stroke="white" strokeWidth="3" fill="none" />
                        <line x1="40" y1="50" x2="60" y2="50" stroke="white" strokeWidth="3" />
                      </g>
                    </svg>
                  </div>
                </div>
                
                {/* Logo principal com efeito de fumaça - amarelo suave */}
                <div className="relative z-10 transform hover:scale-105 transition-all duration-500">
                  {/* Efeito de fumaça ao redor */}
                  <div className="absolute inset-0 blur-2xl bg-yellow-600/10 mix-blend-soft-light"></div>
                  <div className="absolute -inset-2 blur-3xl bg-yellow-500/5 mix-blend-soft-light"></div>
                  
                  {/* Texto com efeito fumaça */}
                  <h1 className="relative text-xl uppercase" 
                      style={{
                        fontFamily: 'Futura, "Trebuchet MS", Arial, sans-serif',
                        fontWeight: '600',
                        letterSpacing: '0.05em'
                      }}>
                    {/* Logo em amarelo */}
                    <span className="text-yellow-500/80 opacity-90">BACO</span>
                  </h1>
                  
                  {/* Efeito de fumaça se movendo lentamente */}
                  <div className="absolute inset-0 bg-gradient-to-t from-yellow-600/5 via-yellow-500/10 to-yellow-600/5 mix-blend-soft-light opacity-50 animate-breathe"></div>
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
