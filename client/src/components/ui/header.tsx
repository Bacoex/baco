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
    <header className="bg-white shadow-md fixed top-0 left-0 w-full z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-primary">Baco</h1>
        </div>
        
        {/* Barra de pesquisa */}
        <div className="flex-1 max-w-md mx-4">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Input 
                type="text" 
                placeholder="Pesquisar eventos..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            </div>
          </form>
        </div>
        
        {/* Perfil do usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
              <Eneagon>
                {user?.profileImage ? (
                  <img 
                    src={user.profileImage} 
                    alt={`${user.firstName} ${user.lastName}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-primary-100 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-primary" />
                  </div>
                )}
              </Eneagon>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
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
