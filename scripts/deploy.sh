#!/bin/bash

# Script para deploy manual do Baco para a Hostinger
# Uso: ./deploy.sh [usuário_ftp] [senha_ftp]

# Verificar parâmetros
if [ "$#" -lt 2 ]; then
    echo "Uso: ./deploy.sh [usuário_ftp] [senha_ftp]"
    exit 1
fi

FTP_USER=$1
FTP_PASS=$2
FTP_HOST="ftp.bacoexperiencias.com"
REMOTE_DIR="/public_html"

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando deploy do Baco para Hostinger...${NC}"

# Criar diretório temporário para o deploy
echo -e "${YELLOW}Criando diretório temporário...${NC}"
DEPLOY_DIR="deploy_temp"
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Construir o projeto
echo -e "${YELLOW}Construindo o projeto...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Falha ao construir o projeto.${NC}"
    exit 1
fi

# Copiar arquivos necessários
echo -e "${YELLOW}Preparando arquivos para deploy...${NC}"
cp -r dist package.json package-lock.json .env $DEPLOY_DIR/
mkdir -p $DEPLOY_DIR/uploads
cp scripts/hostinger_setup.js $DEPLOY_DIR/

# Criar script FTP
echo -e "${YELLOW}Criando script FTP...${NC}"
FTP_SCRIPT="ftp_commands.txt"
cat > $FTP_SCRIPT << EOF
open $FTP_HOST
user $FTP_USER $FTP_PASS
mkdir $REMOTE_DIR/dist
mkdir $REMOTE_DIR/uploads
mkdir $REMOTE_DIR/uploads/profile
mkdir $REMOTE_DIR/uploads/events
mkdir $REMOTE_DIR/uploads/documents
lcd $DEPLOY_DIR
cd $REMOTE_DIR
put package.json
put package-lock.json
put .env
put hostinger_setup.js
cd $REMOTE_DIR/dist
lcd dist
mput *
bye
EOF

# Upload via FTP
echo -e "${YELLOW}Enviando arquivos para o servidor...${NC}"
lftp -f $FTP_SCRIPT
if [ $? -ne 0 ]; then
    echo -e "${RED}Falha ao enviar arquivos via FTP.${NC}"
    exit 1
fi

# Limpar arquivos temporários
echo -e "${YELLOW}Limpando arquivos temporários...${NC}"
rm -f $FTP_SCRIPT
rm -rf $DEPLOY_DIR

echo -e "${GREEN}Deploy concluído com sucesso!${NC}"
echo -e "${YELLOW}Próximos passos:${NC}"
echo -e "1. No painel da Hostinger, configure o Node.js para usar o arquivo principal: ${GREEN}dist/index.js${NC}"
echo -e "2. Configure o comando de inicialização: ${GREEN}node dist/index.js${NC}"
echo -e "3. Execute o script de configuração: ${GREEN}node hostinger_setup.js${NC}"
echo -e "4. Reinicie a aplicação Node.js pelo painel da Hostinger"
echo -e "${GREEN}Sua aplicação Baco estará disponível em https://bacoexperiencias.com${NC}"

exit 0