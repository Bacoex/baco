
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, Menu, User, HelpCircle, Info } from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <div className="fixed w-full z-50 flex justify-between items-center px-4 py-2">
      {/* Logo Baco */}
      <Link href="/" className="hover:opacity-80 transition-opacity">
        <div className="relative h-40 flex justify-center items-center">
          <div className="relative z-10 flex flex-col items-center">
            <img src="/baco-logo.png" alt="Baco" className="h-32 w-auto animate-float" />
          </div>
        </div>
      </Link>

      {/* Mini Menu */}
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full w-10 h-10">
              <Menu className="h-5 w-5" />
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
              <a href="mailto:baco.suporte@gmail.com" target="_blank" rel="noopener noreferrer">
                <HelpCircle className="mr-2 h-4 w-4" />
                Suporte
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/about">
                <Info className="mr-2 h-4 w-4" />
                Sobre
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
