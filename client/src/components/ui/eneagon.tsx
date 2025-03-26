import { cn } from "@/lib/utils";

/**
 * Props do componente Eneagon
 */
interface EneagonProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Componente Eneagon
 * Cria um formato de eneágono (polígono de 9 lados) para fotos de perfil
 */
export function Eneagon({ children, className }: EneagonProps) {
  return (
    <div
      className={cn(
        "overflow-hidden relative",
        className
      )}
      style={{
        clipPath: 'polygon(50% 0%, 83% 12%, 100% 43%, 94% 78%, 68% 100%, 32% 100%, 6% 78%, 0% 43%, 17% 12%)',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Componente de estilo para ser utilizado com CSS-in-JS
 */
Eneagon.styles = {
  clipPath: 'polygon(50% 0%, 83% 12%, 100% 43%, 94% 78%, 68% 100%, 32% 100%, 6% 78%, 0% 43%, 17% 12%)',
};
