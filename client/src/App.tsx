import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ProfilePage from "@/pages/profile-page";
import MyEventsPage from "@/pages/my-events-page";
import SearchPage from "@/pages/search-page";
import PrivacyPolicyPage from "@/pages/privacy-policy-page";
import TermsOfServicePage from "@/pages/terms-of-service-page";
import AboutPage from "@/pages/about-page";
import ErrorLogsPage from "@/pages/error-logs-page";
import ShareErrorPage from "@/pages/share-error-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AuthProvider } from "./hooks/use-auth";
import { NotificationsProvider } from "./hooks/use-notifications";
import { ConsentBanner } from "@/components/ui/consent-banner";

/**
 * Componente Router
 * Gerencia todas as rotas da aplicação com navegação e proteção de rotas
 */
function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/profile/:id" component={ProfilePage} />
      <ProtectedRoute path="/my-events" component={MyEventsPage} />
      <ProtectedRoute path="/search" component={SearchPage} />
      <ProtectedRoute path="/error-logs" component={ErrorLogsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/terms-of-service" component={TermsOfServicePage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/share-error" component={ShareErrorPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

/**
 * Componente App
 * Componente principal da aplicação que configura provedores e contextos
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationsProvider>
          <Router />
          <ConsentBanner />
          <Toaster />
        </NotificationsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
