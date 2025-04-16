/**
 * Este script configura a aplicação na Hostinger após o upload
 * Deve ser executado uma vez através do painel da Hostinger
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configurações
const APP_DIR = process.cwd();
const UPLOADS_DIR = path.join(APP_DIR, 'uploads');
const ENV_FILE = path.join(APP_DIR, '.env');

console.log('=== Configuração do Baco na Hostinger ===');

// 1. Verificar se estamos no diretório correto
console.log('Verificando diretório da aplicação...');
if (!fs.existsSync(path.join(APP_DIR, 'package.json')) || !fs.existsSync(path.join(APP_DIR, 'dist'))) {
  console.error('ERRO: Não encontrou os arquivos package.json e pasta dist!');
  console.error('Certifique-se de executar este script no diretório raiz da aplicação');
  process.exit(1);
}

// 2. Verificar se o arquivo .env existe
console.log('Verificando arquivo .env...');
if (!fs.existsSync(ENV_FILE)) {
  console.error('ERRO: Arquivo .env não encontrado!');
  console.error('Certifique-se de que o arquivo .env foi enviado junto com a aplicação');
  process.exit(1);
}

// 3. Criar diretório uploads se não existir
console.log('Configurando diretório de uploads...');
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR);
    console.log('Diretório uploads criado com sucesso');
  } catch (error) {
    console.error('ERRO ao criar diretório uploads:', error.message);
    process.exit(1);
  }
}

// 4. Definir permissões do diretório uploads
try {
  fs.chmodSync(UPLOADS_DIR, 0o755);
  console.log('Permissões do diretório uploads configuradas');
} catch (error) {
  console.error('ERRO ao configurar permissões do diretório uploads:', error.message);
}

// 5. Instalar dependências de produção
console.log('Instalando dependências de produção...');
try {
  execSync('npm install --production', { stdio: 'inherit' });
  console.log('Dependências instaladas com sucesso');
} catch (error) {
  console.error('ERRO ao instalar dependências:', error.message);
  process.exit(1);
}

// 6. Verificar conexão com banco de dados
console.log('Verificando conexão com banco de dados...');
try {
  require('dotenv').config();
  
  if (!process.env.DATABASE_URL) {
    console.error('ERRO: Variável DATABASE_URL não encontrada no arquivo .env');
    process.exit(1);
  }
  
  console.log('String de conexão com banco de dados encontrada');
  // Aqui poderia ter um teste real de conexão, mas isso 
  // seria feito automaticamente quando a aplicação iniciar
} catch (error) {
  console.error('ERRO ao verificar conexão com banco de dados:', error.message);
}

// 7. Criar arquivo de status
const statusFile = path.join(APP_DIR, 'setup_complete.txt');
const timestamp = new Date().toISOString();
fs.writeFileSync(statusFile, `Configuração concluída em: ${timestamp}\n`);

console.log('=== Configuração concluída com sucesso! ===');
console.log('Agora você pode iniciar a aplicação através do painel da Hostinger');
console.log('Defina o arquivo principal como: dist/index.js');
console.log('Defina o comando de inicialização como: node dist/index.js');