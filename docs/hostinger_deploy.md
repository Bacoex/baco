# Documentação de Deploy na Hostinger

## Informações Gerais

**Domínio:** bacoexperiencias.com
**Hospedagem:** Hostinger (Plano com suporte Node.js)
**Banco de Dados:** PostgreSQL (Neon.tech)

## Requisitos do Servidor

- Node.js 20.x ou superior
- Suporte a Node.js no plano de hospedagem
- Certificado SSL/TLS para HTTPS
- Capacidade de executar WebSockets (para chat)

## Métodos de Deploy

### 1. Deploy Automatizado (GitHub Actions)

O deploy automatizado através do GitHub Actions é o método recomendado para manter o site atualizado.

#### Configuração Inicial (apenas uma vez):

1. No repositório GitHub (https://github.com/Bacoex/baco), acesse **Settings > Secrets and variables > Actions**
2. Adicione os seguintes secrets:
   - `HOSTINGER_USERNAME`: Seu nome de usuário FTP da Hostinger
   - `HOSTINGER_PASSWORD`: Sua senha FTP da Hostinger
   - `HOSTINGER_SERVER`: Geralmente `ftp.bacoexperiencias.com`
   - `DATABASE_URL`: URL completa de conexão com o banco PostgreSQL
   - `SESSION_SECRET`: Chave aleatória para criptografia de sessões
   - `VITE_GOOGLE_MAPS_API_KEY`: Sua chave da API do Google Maps

#### Como funciona:

- Cada push na branch `main` do repositório iniciará o workflow de deploy
- O código é construído automaticamente
- Os arquivos são enviados via FTP para a Hostinger
- A aplicação é reiniciada automaticamente

#### Verificando status:

- Verifique o status do deploy na aba "Actions" do repositório
- Veja os logs na seção "Node.js" do painel da Hostinger

### 2. Deploy Manual

Se for necessário fazer um deploy manual, use o script fornecido:

```bash
# No diretório raiz do projeto
./scripts/deploy.sh [usuário_ftp] [senha_ftp]
```

O script irá:
1. Construir o projeto
2. Preparar os arquivos para deploy
3. Enviar os arquivos via FTP para a Hostinger

#### Pós-deploy manual:

1. Acesse o painel da Hostinger
2. Na seção Node.js, configure:
   - Arquivo principal: `dist/index.js`
   - Comando de inicialização: `node dist/index.js`
3. Execute o script de configuração via SSH:
   ```
   cd /public_html
   node hostinger_setup.js
   ```
4. Reinicie a aplicação Node.js

## Estrutura de Arquivos no Servidor

```
public_html/
├── dist/            # Código compilado
├── node_modules/    # Dependências
├── uploads/         # Arquivos enviados pelos usuários
│   ├── profile/     # Fotos de perfil
│   ├── events/      # Imagens de eventos
│   └── documents/   # Documentos para verificação
├── .env             # Variáveis de ambiente
├── package.json     # Dependências do projeto
└── hostinger_setup.js # Script de configuração
```

## Manutenção

### Banco de Dados

O banco de dados PostgreSQL está hospedado no serviço Neon.tech. Certifique-se de:

- Manter backups regulares do banco de dados
- Verificar se o IP do servidor da Hostinger está na lista de permissões do Neon.tech
- Monitorar o uso de armazenamento e performance

### Monitoramento

- Verifique regularmente os logs da aplicação no painel da Hostinger
- Configure alertas para notificar sobre problemas no servidor
- Monitore o uso de CPU e memória

### Atualizações

- Atualize regularmente as dependências do projeto
- Teste novas versões em ambiente de desenvolvimento antes do deploy
- Mantenha um registro das atualizações realizadas

### Segurança

- Verifique regularmente as vulnerabilidades nas dependências
- Mantenha a configuração do firewall atualizada
- Faça backups regulares de todo o ambiente

## Resolução de Problemas

### Problemas comuns e soluções:

1. **Aplicação não inicia:**
   - Verifique os logs no painel da Hostinger
   - Confirme se o arquivo principal está configurado corretamente
   - Verifique se as variáveis de ambiente estão presentes

2. **Erro de conexão com banco de dados:**
   - Verifique se a URL do banco de dados está correta
   - Confirme se o IP do servidor está na lista de permissões do Neon.tech
   - Teste a conexão com o banco de dados manualmente

3. **Uploads não funcionam:**
   - Verifique as permissões do diretório `uploads`
   - Confirme se os subdiretórios foram criados corretamente
   - Verifique os logs de erro para mais detalhes

4. **Problemas com o chat:**
   - Confirme se WebSockets estão habilitados na Hostinger
   - Verifique se não há bloqueio de portas para WebSockets
   - Revise os logs do servidor para erros específicos

## Contatos de Suporte

- **Suporte Baco:** bacoexperiencias@gmail.com
- **Desenvolvedor:** Kevin Matheus Barbosa
- **Suporte Hostinger:** suporte@hostinger.com.br
- **Suporte Neon.tech:** support@neon.tech