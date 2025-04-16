# Guia de Deploy - Hostinger

Este guia cobre o processo de deployment da aplicação Baco na plataforma Hostinger.

## Pré-requisitos

1. Conta na Hostinger com hospedagem que suporte Node.js (VPS ou plano específico para Node.js)
2. Acesso SSH à hospedagem
3. Domínio configurado
4. Banco de dados PostgreSQL (recomendamos manter o Neon.tech)

## Arquivos necessários para produção

1. Diretório `/dist` (gerado pelo comando `npm run build`)
2. Arquivo `package.json`
3. Arquivo `.env` com as variáveis de ambiente
4. Diretório `/uploads` (para armazenamento de imagens)

## Processo de Deploy

### 1. Preparação no ambiente de desenvolvimento

1. Certifique-se de que todas as dependências estão instaladas:
   ```
   npm install
   ```

2. Crie um arquivo `.env.production` com as variáveis de ambiente para produção:
   ```
   DATABASE_URL=postgresql://neondb_owner:senha@ep-soft-morning-a5hmg64m.us-east-2.aws.neon.tech/neondb?sslmode=require
   VITE_GOOGLE_MAPS_API_KEY=AIzaSyDOQ05pP30yBlS5u-PC9X_gCTOcZQegNVk
   SESSION_SECRET=uma_chave_secreta_muito_segura
   NODE_ENV=production
   ```

3. Faça o build da aplicação:
   ```
   npm run build
   ```

4. Compacte os arquivos necessários para upload:
   ```
   tar -czvf baco-deploy.tar.gz dist package.json .env.production
   ```

### 2. Configuração no servidor Hostinger

1. Acesse o servidor via SSH:
   ```
   ssh username@seu-dominio.com
   ```

2. Navegue até o diretório raiz da aplicação:
   ```
   cd ~/seu-dominio.com/
   ```

3. Faça upload do arquivo compactado usando SFTP ou SCP
   ```
   scp baco-deploy.tar.gz username@seu-dominio.com:~/seu-dominio.com/
   ```

4. Descompacte os arquivos:
   ```
   tar -xzvf baco-deploy.tar.gz
   ```

5. Renomeie o arquivo de ambiente:
   ```
   mv .env.production .env
   ```

6. Instale as dependências de produção:
   ```
   npm install --production
   ```

7. Crie o diretório de uploads se não existir:
   ```
   mkdir -p uploads
   chmod 755 uploads
   ```

### 3. Configuração do servidor Node.js na Hostinger

Para cada provedor de hospedagem, o método pode variar ligeiramente. Aqui estão os métodos mais comuns:

#### Usando PM2 (recomendado):

1. Instale o PM2 globalmente:
   ```
   npm install -g pm2
   ```

2. Inicie a aplicação com PM2:
   ```
   pm2 start dist/index.js --name baco
   ```

3. Configure o PM2 para iniciar automaticamente:
   ```
   pm2 startup
   pm2 save
   ```

#### Usando o Painel da Hostinger (se disponível):

1. Acesse o painel de controle da Hostinger
2. Navegue até a seção Node.js
3. Configure o arquivo principal como `dist/index.js`
4. Defina o comando de inicialização como `node dist/index.js`

### 4. Configurando o Nginx (se estiver usando VPS)

Se você estiver usando um VPS da Hostinger, você provavelmente precisará configurar um proxy reverso Nginx:

1. Instale o Nginx:
   ```
   sudo apt update
   sudo apt install nginx
   ```

2. Crie um arquivo de configuração para o site:
   ```
   sudo nano /etc/nginx/sites-available/baco
   ```

3. Adicione a seguinte configuração:
   ```nginx
   server {
       listen 80;
       server_name seu-dominio.com www.seu-dominio.com;

       location / {
           proxy_pass http://localhost:5000;  # A porta que seu app Node está rodando
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       location /uploads {
           alias /home/username/seu-dominio.com/uploads;
       }
   }
   ```

4. Ative o site:
   ```
   sudo ln -s /etc/nginx/sites-available/baco /etc/nginx/sites-enabled/
   ```

5. Teste e reinicie o Nginx:
   ```
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### 5. Configurando HTTPS com Let's Encrypt

1. Instale o Certbot:
   ```
   sudo apt install certbot python3-certbot-nginx
   ```

2. Obtenha um certificado:
   ```
   sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com
   ```

3. Siga as instruções na tela para completar o processo.

## Processo de Atualização

Para atualizar o aplicativo com novas versões:

1. Gere um novo build no ambiente de desenvolvimento
2. Compacte os arquivos atualizados
3. Faça upload para o servidor
4. Descompacte substituindo os arquivos antigos
5. Reinicie o serviço:
   ```
   pm2 restart baco
   ```

## Troubleshooting

### Problema: A aplicação não inicia
- Verifique os logs com `pm2 logs baco`
- Verifique se todas as variáveis de ambiente estão corretas
- Certifique-se de que a conexão com o banco de dados está funcionando

### Problema: Erro de conexão com o banco de dados
- Verifique se a string de conexão DATABASE_URL está correta
- Confirme se o IP do servidor está na lista de permissões do Neon.tech

### Problema: Imagens não são exibidas
- Verifique as permissões do diretório `/uploads`
- Confirme se o Nginx está configurado corretamente para servir arquivos estáticos

## Monitoramento

Para monitorar a saúde da aplicação:

```
pm2 status
pm2 monit
```

Para verificar os logs:

```
pm2 logs baco
```