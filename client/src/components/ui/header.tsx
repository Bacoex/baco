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
            <svg 
              width="32" 
              height="32" 
              viewBox="0 0 80 80" 
              xmlns="http://www.w3.org/2000/svg"
              className="text-orange-500"
            >
              <defs>
                <linearGradient id="bacoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff9900" />
                  <stop offset="100%" stopColor="#ff6600" />
                </linearGradient>
              </defs>
              <g fill="url(#bacoGradient)">
                <path d="M20 10 H60 A10 10 0 0 1 70 20 V30 A10 10 0 0 1 60 40 A10 10 0 0 1 70 50 V60 A10 10 0 0 1 60 70 H20 A10 10 0 0 1 10 60 V20 A10 10 0 0 1 20 10 Z" />
                <circle cx="40" cy="25" r="8" fill="#000" />
                <circle cx="40" cy="55" r="8" fill="#000" />
              </g>
              <path d="M30 40 H50 Z" stroke="#000" strokeWidth="2" />
            </svg>
            <span className="hidden font-bold sm:inline-block bg-gradient-to-r from-orange-500 to-orange-600 text-transparent bg-clip-text">
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