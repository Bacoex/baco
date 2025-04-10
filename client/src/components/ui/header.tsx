import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, Menu, User, HelpCircle, Info, Bell, AlertCircle } from "lucide-react";
import { NotificationsMenu } from "@/components/ui/notifications-menu";
import { SupportDialog } from "@/components/ui/support-dialog";

export function Header() {
  const { user, logoutMutation } = useAuth();
  
  // Função para lidar com o logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="fixed w-full top-0 left-0 z-50 flex justify-between items-center px-4 py-2 bg-gradient-to-b from-black/70 to-transparent">
      {/* Espaço à esquerda para manter o balanceamento */}
      <div className="w-[100px]"></div>
      
      {/* Logo SVG centralizada */}
      <Link href="/" className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 hover:opacity-80 transition-opacity">
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

      {/* Ações no lado direito */}
      {user && (
        <div className="flex items-center gap-2">
          {/* Menu de Notificações */}
          <NotificationsMenu />

          {/* Mini Menu */}
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
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <SupportDialog>
                  <div className="flex items-center w-full">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Suporte</span>
                  </div>
                </SupportDialog>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/about">
                  <Info className="mr-2 h-4 w-4" />
                  Sobre
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/error-logs">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Logs de Erros
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}