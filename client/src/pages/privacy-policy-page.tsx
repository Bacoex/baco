import { Header } from "@/components/ui/header";
import NetworkBackground from "../components/ui/network-background";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

/**
 * Componente da página de Política de Privacidade
 * Fornece informações detalhadas sobre como os dados são coletados e utilizados
 */
export default function PrivacyPolicyPage() {
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
            <h1 className="text-2xl font-bold text-white mb-2">Política de Privacidade</h1>
            <p className="text-gray-400 text-sm">Última atualização: 26 de março de 2025</p>
          </div>
          
          <div className="prose prose-invert max-w-none">
            <h2>1. Introdução</h2>
            <p>
              A Baco ("nós", "nosso" ou "aplicativo") está comprometida com a proteção da sua privacidade. 
              Esta Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos suas informações pessoais 
              quando você utiliza nosso aplicativo, conforme as diretrizes da Lei Geral de Proteção de Dados (LGPD).
            </p>
            
            <h2>2. Informações que coletamos</h2>
            <p>Podemos coletar os seguintes tipos de informações:</p>
            <ul>
              <li><strong>Informações de cadastro:</strong> nome, sobrenome, e-mail, telefone, CPF, RG, data de nascimento, signo zodiacal.</li>
              <li><strong>Informações de perfil:</strong> foto de perfil, biografia, localização, interesses, redes sociais.</li>
              <li><strong>Informações de uso:</strong> eventos criados, eventos que participa, interações com outros usuários.</li>
              <li><strong>Informações técnicas:</strong> endereço IP, dispositivo utilizado, sistema operacional, navegador.</li>
            </ul>
            
            <h2>3. Como utilizamos suas informações</h2>
            <p>Utilizamos suas informações para os seguintes fins:</p>
            <ul>
              <li>Fornecer, personalizar e melhorar o aplicativo</li>
              <li>Permitir a criação e participação em eventos</li>
              <li>Facilitar a comunicação entre usuários</li>
              <li>Enviar notificações relacionadas a eventos e interações</li>
              <li>Cumprir obrigações legais e regulatórias</li>
              <li>Prevenir fraudes e promover a segurança</li>
            </ul>
            
            <h2>4. Base legal para processamento</h2>
            <p>Processamos suas informações com base nas seguintes condições:</p>
            <ul>
              <li><strong>Consentimento:</strong> quando você nos fornece explicitamente permissão.</li>
              <li><strong>Execução de contrato:</strong> quando necessário para fornecer nossos serviços.</li>
              <li><strong>Interesses legítimos:</strong> quando necessário para nossos interesses legítimos, desde que não prejudiquem seus direitos.</li>
              <li><strong>Obrigação legal:</strong> quando necessário para cumprir com a legislação aplicável.</li>
            </ul>
            
            <h2>5. Compartilhamento de informações</h2>
            <p>Podemos compartilhar suas informações nas seguintes circunstâncias:</p>
            <ul>
              <li>Com outros usuários, conforme necessário para facilitar a funcionalidade do aplicativo</li>
              <li>Com prestadores de serviços que nos ajudam a operar o aplicativo</li>
              <li>Quando exigido por lei ou para proteger nossos direitos</li>
            </ul>
            
            <h2>6. Seus direitos</h2>
            <p>Sob a LGPD, você tem os seguintes direitos:</p>
            <ul>
              <li>Direito de acesso às suas informações pessoais</li>
              <li>Direito de correção de informações imprecisas</li>
              <li>Direito de eliminação de seus dados pessoais</li>
              <li>Direito de portabilidade de dados</li>
              <li>Direito de revogar o consentimento a qualquer momento</li>
              <li>Direito de não ser sujeito a decisões automatizadas</li>
            </ul>
            
            <h2>7. Segurança das informações</h2>
            <p>
              Implementamos medidas técnicas e organizacionais apropriadas para proteger suas informações pessoais 
              contra acesso não autorizado, perda acidental ou alteração. No entanto, nenhum sistema é completamente seguro, 
              e não podemos garantir a segurança absoluta dos seus dados.
            </p>
            
            <h2>8. Período de retenção</h2>
            <p>
              Mantemos suas informações pessoais pelo tempo necessário para cumprir os propósitos descritos nesta política, 
              a menos que um período mais longo seja necessário ou permitido por lei.
            </p>
            
            <h2>9. Alterações a esta política</h2>
            <p>
              Podemos atualizar esta política periodicamente. Notificaremos você sobre quaisquer alterações materiais 
              publicando a nova política no aplicativo ou por outros meios apropriados.
            </p>
            
            <h2>10. Contato</h2>
            <p>
              Se você tiver dúvidas sobre esta política ou nossas práticas de privacidade, entre em contato conosco em:
              <br />
              <a href="mailto:bacoexperiencias@gmail.com" className="text-primary">bacoexperiencias@gmail.com</a>
            </p>
            
            <div className="mt-8 p-4 bg-gray-800/50 rounded-lg">
              <h3 className="text-white font-semibold mb-2">Declaração de Consentimento</h3>
              <p className="text-sm text-gray-300">
                Ao utilizar o aplicativo Baco, você confirma que leu, entendeu e concorda com esta Política de Privacidade. 
                Se você não concorda com esta política, por favor, não utilize o aplicativo.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}