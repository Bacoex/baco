import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Menu, Calendar, Star, User, LogOut, Home, HelpCircle, Info } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log("Header: Realizando busca por:", searchQuery.trim());
      const searchURL = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
      console.log("Header: Redirecionando para:", searchURL);
      setLocation(searchURL);
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Logout realizado com sucesso",
          description: "Você foi desconectado da sua conta",
        });
        setLocation("/auth");
      },
    });
  };

  return (
    <div className="relative">
      {/* Logo flutuante no canto superior esquerdo */}
      <div className="fixed top-4 left-4 z-50">
        <Link href="/" className="flex items-center space-x-2 p-2 rounded-full bg-black/50 backdrop-blur-md hover:bg-black/70 transition-all shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-[2px] bg-gradient-to-r from-transparent to-orange-500"></div>
            <h1 className="text-lg uppercase font-bold tracking-wide">
              <span className="bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-400 bg-clip-text text-transparent">BACO</span>
            </h1>
            <div className="w-4 h-[2px] bg-gradient-to-l from-transparent to-orange-500"></div>
          </div>
        </Link>
      </div>

      {/* Barra de pesquisa flutuante centralizada na parte inferior */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <form onSubmit={handleSearch} className="relative">
          <div className="bg-black/40 backdrop-blur-md rounded-full shadow-lg flex items-center pl-4 pr-2 py-2 border border-gray-800/30">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Buscar eventos..."
              className="w-[200px] sm:w-[300px] border-0 bg-transparent text-gray-200 focus:border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" size="sm" variant="ghost" className="rounded-full px-2 py-0 text-gray-400 hover:text-white">
              Buscar
            </Button>
          </div>
        </form>
      </div>

      {/* Menu flutuante no canto superior direito */}
      <div className="fixed top-4 right-4 z-50">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-black/50 backdrop-blur-md border-gray-800/50 text-orange-500 hover:text-orange-400 hover:bg-black/70 shadow-lg">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-black/90 backdrop-blur-md border-gray-800/50 shadow-xl rounded-xl mt-2">
              <DropdownMenuItem asChild>
                <Link href="/" className="flex items-center cursor-pointer">
                  <Home className="mr-2 h-4 w-4" />
                  <span>Início</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/" className="flex items-center cursor-pointer">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>Eventos</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/my-events" className="flex items-center cursor-pointer">
                  <Star className="mr-2 h-4 w-4" />
                  <span>Meus Eventos</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/about" className="flex items-center cursor-pointer">
                  <Info className="mr-2 h-4 w-4" />
                  <span>Sobre</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a 
                  href="mailto:bacoexperiencias@gmail.com" 
                  className="flex items-center cursor-pointer"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Suporte</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="flex items-center cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button 
            asChild 
            variant="default" 
            className="rounded-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 border-0 shadow-lg"
          >
            <Link href="/auth">Entrar</Link>
          </Button>
        )}
      </div>
      
      {/* Espaçador para compensar elementos flutuantes */}
      <div className="h-16"></div>
    </div>
  );
}