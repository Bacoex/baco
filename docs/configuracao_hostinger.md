# Configuração da Hospedagem na Hostinger

Este documento detalha os passos necessários para configurar o domínio bacoexperiencias.com na Hostinger e preparar o ambiente para a aplicação Baco.

## 1. Configuração Inicial do Plano

1. Acesse o [painel da Hostinger](https://hpanel.hostinger.com/)
2. Selecione o plano de hospedagem que tenha suporte a Node.js
3. No painel, vá para "Domínios" e adicione o domínio `bacoexperiencias.com`

## 2. Configuração de DNS

1. No painel, vá para "DNS Zone Editor"
2. Configure os seguintes registros:

   | Tipo | Nome | Valor | TTL |
   |------|------|-------|-----|
   | A | @ | IP do servidor | 14400 |
   | CNAME | www | bacoexperiencias.com | 14400 |
   | CNAME | api | bacoexperiencias.com | 14400 |
   | TXT | @ | v=spf1 include:hostinger.com ~all | 14400 |

3. Aguarde a propagação do DNS (pode levar até 24 horas)

## 3. Configuração de SSL/TLS

1. No painel, vá para "SSL/TLS"
2. Selecione "Instalar certificado SSL"
3. Escolha "Let's Encrypt" como provedor
4. Selecione os domínios a serem protegidos (incluir www.bacoexperiencias.com)
5. Complete a instalação

## 4. Configuração do Servidor Node.js

1. No painel, vá para "Node.js"
2. Clique em "Criar aplicação Node.js"
3. Preencha as seguintes informações:
   - Nome da aplicação: Baco
   - Diretório raiz: public_html
   - Arquivo principal: dist/index.js
   - Comando de inicialização: node dist/index.js
   - Versão do Node.js: 20.x (ou a mais recente disponível)
4. Clique em "Criar"

## 5. Configuração do Banco de Dados

O banco de dados do Baco é hospedado externamente no Neon.tech, mas é necessário garantir que a conexão funcione corretamente.

1. No painel do Neon.tech, acesse o projeto do Baco
2. Em "Connection Details", obtenha a string de conexão
3. Vá para a seção "IP Access" e adicione o IP do servidor da Hostinger na lista de permissões

## 6. Variáveis de Ambiente

1. No painel da Hostinger, vá para "Node.js" e selecione a aplicação Baco
2. Clique em "Variáveis de Ambiente"
3. Adicione as seguintes variáveis:
   - `NODE_ENV`: production
   - `DATABASE_URL`: [URL de conexão do Neon.tech]
   - `SESSION_SECRET`: [Chave secreta para sessões]
   - `VITE_GOOGLE_MAPS_API_KEY`: [Chave da API do Google Maps]

## 7. Configuração de WebSockets

Para garantir que o sistema de chat funcione corretamente:

1. No painel, vá para "Configurações do Website"
2. Em "Advanced", verifique se "WebSockets" está habilitado
3. Se necessário, contacte o suporte da Hostinger para garantir que não há bloqueio de portas para WebSockets

## 8. Cron Jobs

Configure um cron job para limpeza periódica dos logs de erro:

1. No painel, vá para "Cron Jobs"
2. Adicione um novo cron job com a seguinte configuração:
   - Caminho: /public_html/dist/index.js
   - Comando: node /public_html/dist/cleanup_logs.js
   - Frequência: Diariamente
   - Horário: 03:00 AM

## 9. Backup Automático

Configure backups automáticos para proteger seus dados:

1. No painel, vá para "Backups"
2. Ative "Backups Automáticos"
3. Configure a frequência para "Diária"
4. Selecione "Manter por 7 dias"

## 10. Monitoramento e Saúde

1. No painel, vá para "Monitoramento"
2. Ative o monitoramento para o domínio bacoexperiencias.com
3. Configure alertas para notificá-lo em caso de queda

## 11. Verificação Final

Após concluir a configuração:

1. Acesse https://bacoexperiencias.com para verificar se o site está funcionando
2. Verifique os logs da aplicação no painel Node.js
3. Teste o login e os principais recursos da aplicação
4. Verifique se os uploads de imagens estão funcionando corretamente
5. Teste o sistema de chat para garantir que os WebSockets estão funcionando