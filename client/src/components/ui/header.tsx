import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, Info, HelpCircle } from "lucide-react";
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
    <div className="fixed w-full h-full pointer-events-none">
      {/* Logo flutuante no canto superior esquerdo */}
      <div className="fixed top-4 left-4 z-50 pointer-events-auto">
        <Link to="/">
          <div className="flex items-center bg-black/30 backdrop-blur-sm px-3 py-2 rounded-full shadow-md">
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

      {/* Menu flutuante no canto superior direito */}
      <div className="fixed top-4 right-4 z-50 pointer-events-auto">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full bg-black/30 backdrop-blur-sm border-none text-white hover:bg-black/50">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-black/80 backdrop-blur-md border-white/10">
              <Link to="/">
                <DropdownMenuItem className="text-white/90 hover:text-white focus:text-white">
                  Início
                </DropdownMenuItem>
              </Link>
              <Link to="/my-events">
                <DropdownMenuItem className="text-white/90 hover:text-white focus:text-white">
                  Meus Eventos
                </DropdownMenuItem>
              </Link>
              <Link to="/profile">
                <DropdownMenuItem className="text-white/90 hover:text-white focus:text-white">
                  Perfil
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator className="bg-white/10" />
              <Link to="/about-page">
                <DropdownMenuItem className="text-white/90 hover:text-white focus:text-white">
                  <Info className="h-4 w-4 mr-2" />
                  Sobre
                </DropdownMenuItem>
              </Link>
              <a href="mailto:bacoexperiencias@gmail.com">
                <DropdownMenuItem className="text-white/90 hover:text-white focus:text-white">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Suporte
                </DropdownMenuItem>
              </a>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={handleLogout} className="text-white/90 hover:text-white focus:text-white">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link to="/auth">
            <Button variant="outline" className="rounded-full bg-black/30 backdrop-blur-sm border-none text-white hover:bg-black/50">
              Entrar
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}