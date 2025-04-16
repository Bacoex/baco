# Guia de Deploy para bacoexperiencias.com (Hostinger)

Este documento descreve o processo simplificado para implantar o aplicativo Baco no domínio bacoexperiencias.com hospedado na Hostinger.

## Pré-requisitos

1. Conta na Hostinger com acesso ao painel de controle
2. Domínio bacoexperiencias.com já configurado
3. Banco de dados PostgreSQL existente (Neon.tech)
4. Credenciais FTP da Hostinger

## Opção 1: Deploy via GitHub Actions (Recomendado)

Esta é a solução mais automatizada que configura um pipeline de CI/CD no GitHub para realizar o deploy automático sempre que novos commits forem enviados à branch principal.

### Passos para implementação:

1. Configurar secrets no repositório GitHub:
   - Acesse **Settings > Secrets and variables > Actions**
   - Adicione os seguintes secrets:
     - `HOSTINGER_USERNAME`: Seu nome de usuário FTP
     - `HOSTINGER_PASSWORD`: Sua senha FTP
     - `HOSTINGER_SERVER`: ftp.bacoexperiencias.com
     - `DATABASE_URL`: URL de conexão com o banco de dados PostgreSQL
     - `SESSION_SECRET`: Uma chave secreta forte para sessões
     - `VITE_GOOGLE_MAPS_API_KEY`: Sua chave de API do Google Maps

2. Crie o arquivo de workflow GitHub Actions:
   - Crie uma pasta `.github/workflows` no repositório
   - Adicione um arquivo `deploy.yml` com o conteúdo abaixo:

```yaml
name: Deploy to Hostinger

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build Project
        run: npm run build

      - name: Prepare Environment File
        run: |
          echo "DATABASE_URL=${{ secrets.DATABASE_URL }}" > .env
          echo "VITE_GOOGLE_MAPS_API_KEY=${{ secrets.VITE_GOOGLE_MAPS_API_KEY }}" >> .env
          echo "SESSION_SECRET=${{ secrets.SESSION_SECRET }}" >> .env
          echo "NODE_ENV=production" >> .env

      - name: Create Uploads Directory
        run: mkdir -p uploads

      - name: Prepare Setup Script
        run: |
          cp scripts/hostinger_setup.js .

      - name: Deploy to Hostinger
        uses: SamKirkland/FTP-Deploy-Action@v4.3.4
        with:
          server: ${{ secrets.HOSTINGER_SERVER }}
          username: ${{ secrets.HOSTINGER_USERNAME }}
          password: ${{ secrets.HOSTINGER_PASSWORD }}
          local-dir: ./
          server-dir: /public_html/
          exclude: |
            **/.git*
            **/.git*/**
            **/node_modules/**
            **/docs/**
            **/.github/**
            **/scripts/**
```

3. Fazer push do workflow para o GitHub:
```bash
git add .github/
git commit -m "Add GitHub Actions workflow for automatic deployment"
git push origin main
```

4. Após o primeiro deploy:
   - Acesse o painel da Hostinger
   - Vá para a seção Node.js
   - Configure o arquivo principal como `dist/index.js`
   - Configure o comando de inicialização como `node dist/index.js`

## Opção 2: Deploy Manual via FTP

Se preferir fazer o deploy manualmente, siga estes passos:

1. Prepare o projeto localmente:
```bash
# Construa o projeto
npm run build

# Crie o arquivo .env para produção
cp .env .env.production
# Edite .env.production com as configurações de produção

# Prepare os arquivos para upload
mkdir -p deploy_temp
cp -r dist package.json .env.production deploy_temp/
mv deploy_temp/.env.production deploy_temp/.env
mkdir -p deploy_temp/uploads
cp scripts/hostinger_setup.js deploy_temp/
```

2. Faça upload via FTP:
   - Conecte-se ao servidor FTP (ftp.bacoexperiencias.com) usando seu cliente FTP preferido (FileZilla, por exemplo)
   - Faça upload de todos os arquivos da pasta `deploy_temp` para o diretório `/public_html` do seu servidor

3. Configure a aplicação no painel da Hostinger:
   - Acesse o painel da Hostinger
   - Vá para a seção Node.js
   - Configure o arquivo principal como `dist/index.js`
   - Configure o comando de inicialização como `node dist/index.js`

4. Execute o script de configuração:
   - Acesse a seção de Console/SSH no painel da Hostinger
   - Navegue até o diretório da aplicação: `cd /public_html`
   - Execute o script de configuração: `node hostinger_setup.js`

## Verificação do Deploy

Para verificar se o deploy foi bem-sucedido:

1. Acesse https://bacoexperiencias.com no navegador
2. Verifique os logs de inicialização no painel da Hostinger
3. Teste o login e outras funcionalidades principais

## Considerações Adicionais

### Banco de Dados
- O banco de dados é mantido no Neon.tech
- Certifique-se de que o IP do servidor da Hostinger está na lista de permissões do Neon.tech

### Requisitos de Servidor
- Plano de hospedagem com suporte a Node.js
- Certificado SSL/TLS para HTTPS
- Acesso a WebSockets (para funcionalidade de chat)

### Manutenção
- Faça backups regulares do banco de dados
- Monitore o uso de recursos de servidor
- Configure alertas para quedas de servidor

### Segurança
- Configure firewall adequadamente
- Implemente limitação de taxa (rate-limiting)
- Mantenha pacotes npm atualizados