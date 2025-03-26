
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Menu, Search, UserCircle, Plus, Calendar, Star } from "lucide-react";
import { useState } from "react";

export function Header() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Logout realizado com sucesso",
        });
        navigate("/auth");
      },
    });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <img src="/baco-logo.png" alt="Baco" className="h-8 w-auto" />
            <span className="text-xl font-bold">Baco</span>
          </Link>

          {user && (
            <nav className="hidden md:flex items-center space-x-4">
              <Link href="/events/created">
                <Button variant="ghost" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Meus Eventos
                </Button>
              </Link>
              <Link href="/events/participating">
                <Button variant="ghost" className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Participando
                </Button>
              </Link>
              <Link href="/events/create">
                <Button variant="ghost" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Evento
                </Button>
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar eventos..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <UserCircle className="mr-2 h-4 w-4" />
                    Meu Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-500 focus:text-red-500"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href="/auth">Entrar</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
