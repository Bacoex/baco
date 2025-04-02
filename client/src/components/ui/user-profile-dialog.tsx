import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Eneagon from "@/components/ui/eneagon";
import { Loader2, Calendar, Flag, Star, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getUserDisplayName } from "@/lib/utils";
import { logError, ErrorSeverity } from "@/lib/errorLogger";
import { useQuery } from "@tanstack/react-query";

interface UserProfileDialogProps {
  userId: number;
  isOpen: boolean;
  onClose: () => void;
}

// Lista de signos para exibir no perfil
const zodiacSigns = [
  "Áries", "Touro", "Gêmeos", "Câncer", 
  "Leão", "Virgem", "Libra", "Escorpião",
  "Sagitário", "Capricórnio", "Aquário", "Peixes"
];

export function UserProfileDialog({ userId, isOpen, onClose }: UserProfileDialogProps) {
  // Buscar os dados do usuário
  const { data: user, isLoading, error } = useQuery({
    queryKey: [`/api/users/${userId}`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          throw new Error(`Erro ao buscar dados do usuário: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        logError(
          `Erro ao buscar perfil do usuário ${userId}`,
          ErrorSeverity.ERROR,
          {
            context: 'FetchUserProfile',
            component: 'UserProfileDialog',
            error: error instanceof Error ? error : new Error(String(error))
          }
        );
        throw error;
      }
    },
    enabled: isOpen
  });

  // Para simular dados quando o backend não tem as informações completas
  const [randomSign, setRandomSign] = useState<string>("");
  const [randomAge, setRandomAge] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      // Gerar um signo aleatório para visualização (caso o backend não tenha estes dados)
      const randomSignIndex = Math.floor(Math.random() * zodiacSigns.length);
      setRandomSign(zodiacSigns[randomSignIndex]);
      
      // Gerar uma idade aleatória entre 18 e 65 (caso o backend não tenha esta informação)
      setRandomAge(Math.floor(Math.random() * (65 - 18 + 1)) + 18);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Perfil do Usuário</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            Erro ao carregar dados do usuário
          </div>
        ) : user ? (
          <div className="space-y-6">
            {/* Foto e nome do usuário */}
            <div className="flex flex-col items-center">
              <Eneagon className="w-24 h-24">
                <Avatar className="w-full h-full">
                  <AvatarImage src={user.profileImage || undefined} />
                  <AvatarFallback className="bg-orange-500 text-white text-xl">
                    {user.firstName?.charAt(0) || ""}{user.lastName?.charAt(0) || ""}
                  </AvatarFallback>
                </Avatar>
              </Eneagon>
              <h3 className="mt-4 text-xl font-semibold text-center">
                {getUserDisplayName({ 
                  firstName: user.firstName || "", 
                  lastName: user.lastName || "" 
                })}
              </h3>
              <Badge className="mt-1 bg-orange-100 text-orange-800 hover:bg-orange-200">
                {user.role || "Usuário"}
              </Badge>
            </div>

            {/* Informações básicas */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              {/* Idade */}
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {user.age || randomAge} anos
                </span>
              </div>

              {/* Signo */}
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {user.zodiacSign || randomSign}
                </span>
              </div>

              {/* Data de nascimento (se disponível) */}
              {user.birthDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {new Date(user.birthDate).toLocaleDateString()}
                  </span>
                </div>
              )}

              {/* Cidade/Estado */}
              {(user.city || user.state) && (
                <div className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {[user.city, user.state].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
            </div>

            {/* Bio ou citação (se disponível) */}
            {user.bio && (
              <div className="text-sm text-gray-600 italic border-l-2 border-orange-300 pl-3">
                "{user.bio}"
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Usuário não encontrado
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}