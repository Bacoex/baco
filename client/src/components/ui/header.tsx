
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, Menu, Search, User } from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header>
      {/* Logo flutuante */}
      <Link href="/" className="fixed top-4 left-4 animate-float">
        <img src="/baco-logo.png" alt="Baco" className="w-12 h-12" />
      </Link>

      {/* Mini menu flutuante */}
      {user && (
        <div className="fixed top-4 right-4 animate-float">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full w-12 h-12">
                <Menu className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/my-events">
                  <User className="mr-2 h-4 w-4" />
                  Meus Eventos
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/support">
                  <User className="mr-2 h-4 w-4" />
                  Suporte
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Barra de pesquisa flutuante */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 animate-float">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input 
            type="search"
            placeholder="Buscar eventos..."
            className="w-full rounded-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-12 py-3 text-sm ring-1 ring-border"
          />
        </div>
      </div>
    </header>
  );
}
