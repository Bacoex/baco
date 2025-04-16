/**
 * Script para inicialização da aplicação Baco em ambiente de produção
 * 
 * Executa verificações e configurações iniciais antes de iniciar o servidor.
 * Este script é usado como ponto de entrada principal no ambiente de produção
 * da Hostinger e deve ser configurado como o script de inicialização.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { config } = require('dotenv');

// Carregar variáveis de ambiente
config();

// Função para executar comandos no shell
function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executando comando: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro ao executar comando: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
      }
      if (stdout) {
        console.log(`stdout: ${stdout}`);
      }
      resolve(stdout);
    });
  });
}

// Verificar e criar diretórios necessários
function ensureDirectories() {
  const directories = [
    'logs',
    'uploads',
    'uploads/profile',
    'uploads/events',
    'uploads/documents'
  ];
  
  console.log('Verificando diretórios necessários...');
  
  for (const dir of directories) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      console.log(`Criando diretório: ${dir}`);
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}

// Configurar permissões dos diretórios
async function configurePermissions() {
  console.log('Configurando permissões dos diretórios...');
  try {
    await runCommand('chmod -R 755 dist');
    await runCommand('chmod -R 777 uploads');
    await runCommand('chmod -R 777 logs');
    console.log('Permissões configuradas com sucesso');
  } catch (error) {
    console.error('Aviso: Falha ao configurar permissões');
  }
}

// Verificar conexão com o banco de dados
async function testDatabaseConnection() {
  console.log('Testando conexão com o banco de dados...');
  
  try {
    const { Pool } = require('@neondatabase/serverless');
    
    if (!process.env.DATABASE_URL) {
      throw new Error('Variável DATABASE_URL não encontrada no ambiente');
    }
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const result = await pool.query('SELECT NOW()');
    console.log(`Conexão com banco de dados bem-sucedida. Hora do servidor: ${result.rows[0].now}`);
    await pool.end();
    return true;
  } catch (error) {
    console.error(`Erro ao conectar ao banco de dados: ${error.message}`);
    return false;
  }
}

// Função principal
async function main() {
  try {
    console.log('=== INICIANDO APLICAÇÃO BACO EM PRODUÇÃO ===');
    console.log(`Data/hora: ${new Date().toISOString()}`);
    console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Versão Node.js: ${process.version}`);
    
    // Verificar diretórios
    ensureDirectories();
    
    // Configurar permissões
    await configurePermissions();
    
    // Testar conexão com banco de dados
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      console.error('AVISO: Não foi possível conectar ao banco de dados. Verifique a configuração.');
    }
    
    // Imprimir informações sobre o ambiente
    console.log('\n=== INFORMAÇÕES DO AMBIENTE ===');
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'não definido'}`);
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '(configurado)' : '(não configurado)'}`);
    console.log(`SESSION_SECRET: ${process.env.SESSION_SECRET ? '(configurado)' : '(não configurado)'}`);
    console.log(`VITE_GOOGLE_MAPS_API_KEY: ${process.env.VITE_GOOGLE_MAPS_API_KEY ? '(configurado)' : '(não configurado)'}`);
    
    // Iniciar a aplicação
    console.log('\n=== INICIANDO SERVIDOR BACO ===');
    console.log('Executando: node dist/index.js\n');
    
    // Iniciar o servidor principal
    require('../dist/index.js');
    
  } catch (error) {
    console.error('Erro durante inicialização:', error);
    process.exit(1);
  }
}

// Executar o script
main();