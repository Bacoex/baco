import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Menu, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleLogout = () => {
    logout();
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <img src="/logo.png" alt="Logo Baco" className="h-8" />
            <span className="hidden font-bold sm:inline-block">
              Baco
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <nav className="flex items-center">
              <Link to="/">
                <Button variant="ghost" className="mr-2">Início</Button>
              </Link>
              {user && (
                <>
                  <Link to="/my-events">
                    <Button variant="ghost" className="mr-2">Meus Eventos</Button>
                  </Link>
                  <Link to="/profile">
                    <Button variant="ghost" className="mr-2">Perfil</Button>
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button variant="default">Entrar</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}