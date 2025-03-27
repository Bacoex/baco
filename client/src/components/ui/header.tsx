import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, Home, Calendar, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { user, logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <div className="flex items-center">
              {/* Traço esquerdo */}
              <div className="w-4 h-[2px] bg-gradient-to-r from-transparent to-orange-500"></div>
              
              {/* Texto com gradiente fixo */}
              <h1 className="text-2xl uppercase mx-2" 
                  style={{
                    fontFamily: 'Futura, "Trebuchet MS", Arial, sans-serif',
                    fontWeight: '600',
                    letterSpacing: '0.05em'
                  }}>
                <span className="bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-400 bg-clip-text text-transparent">BACO</span>
              </h1>
              
              {/* Traço direito */}
              <div className="w-4 h-[2px] bg-gradient-to-l from-transparent to-orange-500"></div>
            </div>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="flex-1">
            {/* Sem links na navbar - mantendo estilo original */}
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
                  <Link to="/">
                    <DropdownMenuItem>
                      Início
                    </DropdownMenuItem>
                  </Link>
                  <Link to="/my-events">
                    <DropdownMenuItem>
                      Meus Eventos
                    </DropdownMenuItem>
                  </Link>
                  <Link to="/profile">
                    <DropdownMenuItem>
                      Perfil
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem onClick={handleLogout}>
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