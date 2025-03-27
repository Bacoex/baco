import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Menu, Calendar, Star, User, LogOut } from "lucide-react";
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
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-black/80 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-[2px] bg-gradient-to-r from-transparent to-orange-500"></div>
            <h1 className="text-xl uppercase font-bold tracking-wide">
              <span className="bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-400 bg-clip-text text-transparent">BACO</span>
            </h1>
            <div className="w-6 h-[2px] bg-gradient-to-l from-transparent to-orange-500"></div>
          </div>
        </Link>

        {/* Links de navegação para telas maiores */}
        <div className="hidden md:flex ml-8 space-x-1">
          <Button variant="ghost" size="sm" asChild className="text-gray-300 hover:text-white hover:bg-gray-800">
            <Link href="/">
              <Calendar className="mr-2 h-4 w-4" />
              Eventos
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-gray-300 hover:text-white hover:bg-gray-800">
            <Link href="/my-events">
              <Star className="mr-2 h-4 w-4" />
              Meus Eventos
            </Link>
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Buscar eventos..."
              className="w-[200px] pl-9 border-gray-800 bg-gray-900/60 text-gray-200 focus:border-blue-700 focus:ring-blue-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {user ? (
            <div className="flex items-center gap-2">
              {/* Menu para telas grandes */}
              <div className="hidden md:flex items-center gap-2">
                <Link href="/profile">
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-800">
                    <User className="mr-2 h-4 w-4" />
                    Perfil
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-300 hover:text-white hover:bg-gray-800">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </div>
              
              {/* Menu dropdown para telas menores */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-300 hover:text-white hover:bg-gray-800">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-gray-900 border-gray-800">
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
                    <DropdownMenuItem onClick={handleLogout} className="flex items-center cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sair</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : (
            <Button asChild variant="default" className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 border-0">
              <Link href="/auth">Entrar</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}