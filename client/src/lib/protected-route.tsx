import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

/**
 * Componente para proteger rotas que necessitam de autenticação
 * @param path Caminho da rota
 * @param component Componente a ser renderizado se o usuário estiver autenticado
 */
export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  // Exibe um loader enquanto verifica a autenticação
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // Redireciona para a página de autenticação se não estiver autenticado
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Renderiza o componente se estiver autenticado
  return <Route path={path} component={Component} />;
}
