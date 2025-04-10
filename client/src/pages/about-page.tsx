import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

/**
 * Página Sobre - Informações sobre o aplicativo e seu criador
 */
export default function AboutPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [feedbackForm, setFeedbackForm] = useState({
    name: user?.firstName || "",
    email: user?.email || "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFeedbackForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!feedbackForm.name || !feedbackForm.email || !feedbackForm.message) {
      toast({
        title: "Formulário incompleto",
        description: "Por favor, preencha todos os campos do formulário",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Simular envio (em um cenário real, isso seria uma chamada à API)
    setTimeout(() => {
      toast({
        title: "Sugestão enviada!",
        description: "Agradecemos sua contribuição para melhorar o Baco",
      });
      
      // Resetar o formulário mantendo o nome e email
      setFeedbackForm(prev => ({
        ...prev,
        message: ""
      }));
      
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Cabeçalho com título e botão de voltar */}
      <header className="py-8 px-4 relative text-center">
        <div className="absolute top-2 left-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setLocation("/")}
            className="bg-black/30 hover:bg-black/50 text-white rounded-full h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-widest uppercase text-center" 
            style={{letterSpacing: '0.25em', fontFamily: 'serif'}}>
          <span className="text-white">✧</span>
          <span className="bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-400 bg-clip-text text-transparent px-2">
            SOBRE O BACO
          </span>
          <span className="text-white">✧</span>
        </h1>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 container max-w-3xl mx-auto px-4 pb-16">
        <div className="space-y-8 relative bg-black/60 backdrop-blur-lg p-6 rounded-xl border border-white/10 shadow-lg">
          {/* Elementos decorativos */}
          <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full opacity-20 animate-slow-spin" 
               style={{animationDuration: '120s', zIndex: -1}}>
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="aboutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF9900" />
                  <stop offset="100%" stopColor="#0066ff" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="45" fill="none" stroke="url(#aboutGradient)" strokeWidth="0.8" />
            </svg>
          </div>
          
          <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full opacity-10 animate-slow-spin" 
               style={{animationDuration: '180s', animationDirection: 'reverse', zIndex: -1}}>
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#FF9900" strokeWidth="0.6" />
            </svg>
          </div>
          
          {/* Conteúdo sobre o Baco */}
          <section>
            <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
              O Que é o Baco?
            </h2>
            <p className="text-white/80 leading-relaxed mb-4">
              O Baco é mais que um aplicativo; é um portal para conexões reais e experiências autênticas. 
              Inspirado na celebração, na união e no compartilhar momentos que transcendem o ordinário, 
              o Baco busca reviver o ato humano de se reunir, criar laços e experimentar a essência de 
              conhecer novas pessoas.
            </p>
            <p className="text-white/80 leading-relaxed">
              Com uma abordagem universalista, o Baco acolhe a diversidade e promove encontros que 
              celebram o que nos torna humanos: a capacidade de se conectar, de aprender uns com os 
              outros e de perceber que todos somos parte de algo maior.
            </p>
          </section>
          
          {/* Missão */}
          <section>
            <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-blue-500 to-blue-300 bg-clip-text text-transparent">
              Nossa Missão
            </h2>
            <p className="text-white/80 leading-relaxed">
              Facilitar conexões genuínas entre pessoas através de eventos memoráveis, promovendo 
              inclusão, diversidade e experiências autênticas. Queremos resgatar o valor dos encontros 
              presenciais num mundo cada vez mais digital, criando um espaço onde cada pessoa se sinta 
              bem-vinda e representada.
            </p>
          </section>
          
          {/* Criador */}
          <section className="pt-6 border-t border-white/10">
            <h2 className="text-center text-lg text-white/70 uppercase tracking-widest mb-4" 
                style={{letterSpacing: '0.15em'}}>
              CRIADOR
            </h2>
            <div className="flex flex-col items-center">
              <p className="text-center text-xl font-light bg-gradient-to-r from-orange-500 to-blue-500 bg-clip-text text-transparent">
                Kevin Matheus Barbosa
              </p>
              <p className="text-center text-white/60 mt-1">
                nascido em 1999, originário de Bauru-SP, Brasil
              </p>
            </div>
          </section>
          
          {/* Slogan */}
          <div className="pt-8 text-center">
            <p className="text-center text-white/50 tracking-widest uppercase" 
               style={{letterSpacing: '0.2em'}}>
              ✧ ONDE VOCÊ SE CONECTA À EXPERIÊNCIA ✧
            </p>
          </div>
          
          {/* Formulário de Sugestões de Melhorias */}
          <section className="mt-16 pt-8 border-t border-white/10">
            <Card className="bg-black/40 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-xl font-semibold bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-400 bg-clip-text text-transparent">
                  Sugestões de Melhorias
                </CardTitle>
                <CardDescription className="text-white/70">
                  Compartilhe suas ideias para tornar o Baco ainda melhor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitFeedback} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-white/80">Nome</Label>
                      <Input 
                        id="name" 
                        name="name" 
                        placeholder="Seu nome" 
                        value={feedbackForm.name}
                        onChange={handleInputChange}
                        className="bg-black/40 border-white/20 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white/80">E-mail</Label>
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        placeholder="Seu e-mail" 
                        value={feedbackForm.email}
                        onChange={handleInputChange}
                        className="bg-black/40 border-white/20 text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-white/80">Sua sugestão</Label>
                    <Textarea 
                      id="message" 
                      name="message" 
                      placeholder="Compartilhe suas ideias para melhorar o Baco" 
                      value={feedbackForm.message}
                      onChange={handleInputChange}
                      className="min-h-[120px] bg-black/40 border-white/20 text-white"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full md:w-auto bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white"
                  >
                    {isSubmitting ? "Enviando..." : "Enviar Sugestão"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}