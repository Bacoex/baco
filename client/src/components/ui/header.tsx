import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu";
import { Search, Plus, Calendar, Star } from "lucide-react";
import { useState } from "react";

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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <img src="/baco-logo.png" alt="Baco" className="h-6" />
        </Link>

        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link href="/events/new" className="flex items-center px-4 py-2">
                <Plus className="mr-2 h-4 w-4" />
                Criar Evento
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/" className="flex items-center px-4 py-2">
                <Calendar className="mr-2 h-4 w-4" />
                Eventos
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/my-events" className="flex items-center px-4 py-2">
                <Star className="mr-2 h-4 w-4" />
                Meus Eventos
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto flex items-center gap-4">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar eventos..."
              className="w-[200px] pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/profile">
                <Button variant="outline">Perfil</Button>
              </Link>
              <Button variant="ghost" onClick={handleLogout}>
                Sair
              </Button>
            </div>
          ) : (
            <Button asChild variant="default">
              <Link href="/auth">Entrar</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}