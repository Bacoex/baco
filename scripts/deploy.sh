#!/bin/bash
# Script de deploy automatizado para bacoexperiencias.com na Hostinger

# Configurações - Edite estas variáveis
HOSTINGER_USER="seu-usuario-ftp"
HOSTINGER_PASSWORD="sua-senha-ftp"
HOSTINGER_HOST="ftp.bacoexperiencias.com"
REMOTE_PATH="/public_html"
APP_NAME="baco"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando deploy do projeto $APP_NAME para bacoexperiencias.com...${NC}"

# 1. Build da aplicação
echo -e "${YELLOW}Fazendo build da aplicação...${NC}"
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}Erro durante o build! Abortando.${NC}"
  exit 1
fi

# 2. Criando arquivo .env.production
echo -e "${YELLOW}Criando arquivo .env.production...${NC}"
cat > .env.production << EOF
DATABASE_URL=${DATABASE_URL}
VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}
SESSION_SECRET=baco_session_secret_production
NODE_ENV=production
EOF

# 3. Criando pasta de deploy temporária
echo -e "${YELLOW}Preparando arquivos para deploy...${NC}"
mkdir -p deploy_temp
cp -r dist deploy_temp/
cp package.json deploy_temp/
cp .env.production deploy_temp/.env
mkdir -p deploy_temp/uploads

# 4. Gerando arquivo de deploy.txt com timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
echo "Deploy realizado em: $TIMESTAMP" > deploy_temp/deploy.txt
echo "Versão: 1.0.0" >> deploy_temp/deploy.txt

# 5. Compactando para deploy
echo -e "${YELLOW}Compactando arquivos para deploy...${NC}"
cd deploy_temp
zip -r ../baco-deploy.zip .
cd ..

# 6. Configurando script FTP automatizado
echo -e "${YELLOW}Preparando para enviar arquivos via FTP...${NC}"
cat > ftp_commands.txt << EOF
open $HOSTINGER_HOST
user $HOSTINGER_USER $HOSTINGER_PASSWORD
cd $REMOTE_PATH
binary
hash
put baco-deploy.zip
bye
EOF

# 7. Enviando para o servidor via FTP
echo -e "${YELLOW}Enviando arquivos para o servidor...${NC}"
ftp -inv < ftp_commands.txt

if [ $? -ne 0 ]; then
  echo -e "${RED}Falha ao enviar arquivos para o servidor! Verifique suas credenciais FTP.${NC}"
  rm -rf deploy_temp ftp_commands.txt baco-deploy.zip
  exit 1
fi

# 8. Limpeza local
echo -e "${YELLOW}Limpando arquivos temporários...${NC}"
rm -rf deploy_temp ftp_commands.txt baco-deploy.zip .env.production

echo -e "${GREEN}Arquivos enviados com sucesso!${NC}"
echo -e "${YELLOW}IMPORTANTE: Você precisa extrair o arquivo zip no painel de controle da Hostinger.${NC}"
echo -e "${YELLOW}1. Acesse o Gerenciador de Arquivos da Hostinger${NC}"
echo -e "${YELLOW}2. Navegue até /public_html${NC}"
echo -e "${YELLOW}3. Extraia o arquivo baco-deploy.zip${NC}"
echo -e "${YELLOW}4. Configure o Node.js no painel da Hostinger, apontando para dist/index.js${NC}"
echo -e "${GREEN}Acesse seu site em: https://bacoexperiencias.com${NC}"