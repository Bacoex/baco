/**
 * Este script configura a aplicação na Hostinger após o upload
 * Deve ser executado uma vez através do painel da Hostinger
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Função para executar comandos shell
function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executando: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro ao executar comando: ${error.message}`);
        return reject(error);
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
      }
      console.log(`stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

// Função principal
async function setupApplication() {
  try {
    console.log('Iniciando configuração do ambiente Baco na Hostinger...');
    
    // Verificar se estamos no ambiente correto
    if (!fs.existsSync(path.join(process.cwd(), 'dist', 'index.js'))) {
      throw new Error('Arquivo dist/index.js não encontrado. Certifique-se de estar no diretório raiz do projeto.');
    }
    
    // Verificar arquivo .env
    if (!fs.existsSync(path.join(process.cwd(), '.env'))) {
      console.log('Arquivo .env não encontrado. Criando arquivo padrão...');
      const envContent = `NODE_ENV=production
DATABASE_URL=${process.env.DATABASE_URL || 'postgresql://seu_usuario:sua_senha@seu_host:5432/seu_banco'}
SESSION_SECRET=${process.env.SESSION_SECRET || Math.random().toString(36).substring(2, 15)}
VITE_GOOGLE_MAPS_API_KEY=${process.env.VITE_GOOGLE_MAPS_API_KEY || 'sua_chave_google_maps'}`;
      
      fs.writeFileSync(path.join(process.cwd(), '.env'), envContent);
      console.log('Arquivo .env criado. Por favor, atualize com suas configurações reais.');
    }
    
    // Criar pastas necessárias
    const directories = ['uploads', 'uploads/profile', 'uploads/events', 'uploads/documents'];
    directories.forEach(dir => {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        console.log(`Criando diretório: ${dir}`);
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
    
    // Configurar permissões
    console.log('Configurando permissões dos diretórios...');
    await runCommand('chmod -R 755 dist');
    await runCommand('chmod -R 777 uploads');
    
    // Verificar dependências do node
    console.log('Verificando dependências...');
    if (!fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
      console.log('Instalando dependências...');
      await runCommand('npm install --production');
    }
    
    console.log('\nConfiguração concluída com sucesso!');
    console.log('\nPróximos passos:');
    console.log('1. No painel da Hostinger, configure o Node.js para usar o arquivo principal: dist/index.js');
    console.log('2. Configure o comando de inicialização: node dist/index.js');
    console.log('3. Reinicie a aplicação Node.js pelo painel da Hostinger');
    console.log('\nSua aplicação Baco estará disponível em https://bacoexperiencias.com');
    
  } catch (error) {
    console.error('Erro durante a configuração:', error);
    process.exit(1);
  }
}

// Executar a função principal
setupApplication();