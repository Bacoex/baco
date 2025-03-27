import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, Menu, User, HelpCircle, Info } from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <div className="fixed w-full z-50 flex justify-between items-center px-4 py-2">
      {/* Logo SVG */}
      <Link href="/" className="hover:opacity-80 transition-opacity">
        <div className="relative h-12 w-auto">
          <svg width="100" height="48" viewBox="0 0 100 48" className="animate-smoke">
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#FF9900"
              fontSize="32px"
              fontFamily="Futura, 'Trebuchet MS', Arial, sans-serif"
              fontWeight="600"
              style={{ letterSpacing: '0.05em' }}
            >
              BACO
            </text>
          </svg>
        </div>
      </Link>

      {/* Mini Menu */}
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 flex items-center justify-center">
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