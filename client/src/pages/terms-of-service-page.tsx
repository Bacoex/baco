import { Header } from "@/components/ui/header";
import NetworkBackground from "../components/ui/network-background";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

/**
 * Componente da página de Termos de Serviço
 * Fornece informações detalhadas sobre os termos de uso do aplicativo
 */
export default function TermsOfServicePage() {
  return (
    <div className="flex flex-col min-h-screen bg-black">
      <NetworkBackground />
      <Header />
      
      <main className="flex-grow px-4 pb-20 pt-28 relative z-10">
        <div className="container mx-auto max-w-4xl bg-black/60 backdrop-blur-sm rounded-lg p-6 border border-gray-800">
          <div className="mb-6">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-white mb-2">Termos de Serviço</h1>
            <p className="text-gray-400 text-sm">Última atualização: 26 de março de 2025</p>
          </div>
          
          <div className="prose prose-invert max-w-none">
            <h2>1. Aceitação dos Termos</h2>
            <p>
              Bem-vindo ao Baco! Estes Termos de Serviço ("Termos") constituem um acordo legal entre você e Baco
              ("nós", "nosso" ou "aplicativo") que rege o uso do aplicativo Baco, incluindo todos os serviços, funcionalidades,
              conteúdos e aplicativos oferecidos por meio do aplicativo.
              Ao acessar ou usar nosso aplicativo, você concorda em ficar vinculado a estes Termos.
            </p>
            
            <h2>2. Elegibilidade</h2>
            <p>
              Para usar o Baco, você deve ter pelo menos 18 anos de idade. Ao usar nosso aplicativo, você declara e garante que tem pelo menos 18 anos
              e que tem capacidade legal para celebrar este acordo.
            </p>
            
            <h2>3. Cadastro e Conta</h2>
            <p>
              Para acessar determinados recursos do aplicativo, você precisará criar uma conta. Você concorda em:
            </p>
            <ul>
              <li>Fornecer informações precisas, atualizadas e completas durante o processo de registro</li>
              <li>Manter a confidencialidade de sua senha e não compartilhar sua conta com terceiros</li>
              <li>Ser responsável por todas as atividades que ocorram em sua conta</li>
              <li>Notificar-nos imediatamente sobre qualquer uso não autorizado de sua conta</li>
            </ul>
            
            <h2>4. Uso Permitido</h2>
            <p>Você concorda em usar o Baco apenas para fins legais e de acordo com estes Termos. Especificamente, você concorda em:</p>
            <ul>
              <li>Não violar quaisquer leis aplicáveis</li>
              <li>Não publicar conteúdo que seja ilegal, abusivo, difamatório, obsceno, ou que viole direitos de terceiros</li>
              <li>Não enviar vírus, malware ou outros códigos prejudiciais</li>
              <li>Não tentar acessar áreas restritas do aplicativo sem autorização</li>
              <li>Não usar o aplicativo para assediar, ameaçar ou violar os direitos de terceiros</li>
            </ul>
            
            <h2>5. Conteúdo do Usuário</h2>
            <p>
              Você mantém todos os direitos sobre o conteúdo que você publica no Baco ("Conteúdo do Usuário").
              Ao postar Conteúdo do Usuário, você nos concede uma licença mundial, não exclusiva, transferível, sublicenciável,
              livre de royalties para usar, reproduzir, modificar, publicar, traduzir e distribuir esse conteúdo em conexão com o aplicativo.
            </p>
            <p>
              Você é o único responsável por seu Conteúdo do Usuário e pelas consequências de compartilhá-lo.
              Reservamo-nos o direito de remover qualquer Conteúdo do Usuário que viole estes Termos ou que consideremos inadequado.
            </p>
            
            <h2>6. Propriedade Intelectual</h2>
            <p>
              O aplicativo Baco, incluindo seu design, texto, gráficos, logotipos, ícones e software, é de nossa propriedade ou licenciado para nós
              e é protegido por leis de direitos autorais, marcas registradas e outras leis de propriedade intelectual.
              Você não adquire nenhum direito de propriedade sobre o aplicativo ou seu conteúdo.
            </p>
            
            <h2>7. Eventos</h2>
            <p>
              O Baco permite que os usuários criem, promovam e participem de eventos. Como criador de evento, você:
            </p>
            <ul>
              <li>É responsável pela precisão das informações do evento</li>
              <li>Deve cumprir todas as leis e regulamentos aplicáveis</li>
              <li>Reconhece que não somos responsáveis por quaisquer danos ou perdas relacionados ao seu evento</li>
            </ul>
            <p>
              Como participante do evento, você:
            </p>
            <ul>
              <li>Assume todos os riscos associados à sua participação</li>
              <li>Reconhece que não somos responsáveis pela conduta de outros participantes</li>
              <li>Concorda em seguir todas as regras estabelecidas pelo criador do evento</li>
            </ul>
            
            <h2>8. Limitações de Responsabilidade</h2>
            <p>
              O aplicativo é fornecido "como está" e "conforme disponível", sem garantias de qualquer tipo.
              Não garantimos que o aplicativo será ininterrupto, seguro ou livre de erros.
              Em nenhuma circunstância seremos responsáveis por quaisquer danos indiretos, incidentais, especiais, punitivos ou consequentes.
            </p>
            
            <h2>9. Indenização</h2>
            <p>
              Você concorda em indenizar, defender e isentar o Baco, seus diretores, funcionários e agentes de quaisquer reivindicações,
              responsabilidades, danos, perdas e despesas, incluindo honorários advocatícios razoáveis, decorrentes ou relacionados
              com seu uso do aplicativo ou qualquer violação destes Termos.
            </p>
            
            <h2>10. Modificações nos Termos</h2>
            <p>
              Reservamo-nos o direito de modificar estes Termos a qualquer momento. As alterações entrarão em vigor após a publicação dos Termos revisados.
              Seu uso continuado do aplicativo após a publicação dos Termos revisados constitui aceitação dos novos Termos.
            </p>
            
            <h2>11. Rescisão</h2>
            <p>
              Podemos encerrar ou suspender seu acesso ao aplicativo a qualquer momento, sem aviso prévio, por qualquer motivo,
              incluindo violação destes Termos. Após a rescisão, seu direito de usar o aplicativo será imediatamente revogado.
            </p>
            
            <h2>12. Lei Aplicável</h2>
            <p>
              Estes Termos são regidos pelas leis do Brasil, sem considerar seus princípios de conflito de leis.
              Quaisquer disputas decorrentes destes Termos serão submetidas à jurisdição exclusiva dos tribunais brasileiros.
            </p>
            
            <h2>13. Contato</h2>
            <p>
              Se você tiver dúvidas sobre estes Termos, entre em contato conosco em:
              <br />
              <a href="mailto:bacoexperiencias@gmail.com" className="text-primary">termos@bacoapp.com.br</a>
            </p>
            
            <div className="mt-8 p-4 bg-gray-800/50 rounded-lg">
              <h3 className="text-white font-semibold mb-2">Declaração de Aceitação</h3>
              <p className="text-sm text-gray-300">
                Ao utilizar o aplicativo Baco, você confirma que leu, entendeu e concorda com estes Termos de Serviço. 
                Se você não concorda com estes Termos, por favor, não utilize o aplicativo.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}