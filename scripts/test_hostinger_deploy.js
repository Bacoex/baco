/**
 * Script para testar a configuração do ambiente Baco na Hostinger
 * 
 * Este script realiza uma série de verificações para garantir que 
 * o ambiente está configurado corretamente para o Baco.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');
const { Pool } = require('@neondatabase/serverless');

console.log('=== TESTE DE CONFIGURAÇÃO BACO HOSTINGER ===');
console.log(`Data/hora: ${new Date().toISOString()}\n`);

// Função para verificar requisito
function checkRequirement(name, result, details = '') {
  const status = result ? '✓' : '✗';
  const color = result ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${status}\x1b[0m ${name}`);
  if (details) {
    console.log(`   ${details}`);
  }
  return result;
}

// Verificar conexão com o banco de dados
async function checkDatabase() {
  try {
    if (!process.env.DATABASE_URL) {
      return checkRequirement('Conexão com banco de dados', false, 'Variável DATABASE_URL não encontrada');
    }
    
    console.log('Testando conexão com o banco de dados...');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const result = await pool.query('SELECT NOW()');
    const dbTime = result.rows[0].now;
    await pool.end();
    
    return checkRequirement('Conexão com banco de dados', true, 
      `Conexão bem-sucedida. Horário do banco: ${dbTime}`);
  } catch (error) {
    return checkRequirement('Conexão com banco de dados', false, 
      `Erro: ${error.message}`);
  }
}

// Verificar diretórios necessários
function checkDirectories() {
  const directories = [
    'uploads',
    'uploads/profile',
    'uploads/events',
    'uploads/documents',
    'logs'
  ];
  
  let allOk = true;
  const details = [];
  
  for (const dir of directories) {
    const dirPath = path.join(process.cwd(), dir);
    const exists = fs.existsSync(dirPath);
    allOk = allOk && exists;
    
    if (!exists) {
      details.push(`Diretório não encontrado: ${dir}`);
    }
  }
  
  return checkRequirement('Diretórios necessários', allOk, 
    details.length ? details.join('\n   ') : 'Todos os diretórios encontrados');
}

// Verificar permissões de diretórios
function checkDirectoryPermissions() {
  try {
    const testFile = path.join(process.cwd(), 'uploads', 'test_write.tmp');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return checkRequirement('Permissões de escrita', true, 'Escrita em /uploads testada com sucesso');
  } catch (error) {
    return checkRequirement('Permissões de escrita', false, 
      `Erro ao testar escrita: ${error.message}`);
  }
}

// Verificar variáveis de ambiente
function checkEnvironmentVariables() {
  const requiredVars = [
    'NODE_ENV',
    'DATABASE_URL',
    'SESSION_SECRET',
    'VITE_GOOGLE_MAPS_API_KEY'
  ];
  
  const missing = [];
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  return checkRequirement('Variáveis de ambiente', missing.length === 0, 
    missing.length ? `Variáveis ausentes: ${missing.join(', ')}` : 'Todas as variáveis encontradas');
}

// Verificar porta do servidor
async function checkServerPort() {
  try {
    // Verificar se a porta 80 ou 443 está acessível (comum em ambientes de produção)
    // Este é um teste simples para determinar se o servidor está rodando em portas padrão
    const testPort = (process.env.NODE_ENV === 'production') ? 80 : 5000;
    
    return new Promise((resolve) => {
      const req = http.request({
        method: 'HEAD',
        host: 'localhost',
        port: testPort,
        path: '/',
        timeout: 3000
      }, (res) => {
        resolve(checkRequirement(`Porta do servidor (${testPort})`, true, 
          `Resposta: ${res.statusCode}`));
      });
      
      req.on('error', (err) => {
        if (process.env.NODE_ENV === 'production') {
          // Em produção, podemos não conseguir acessar diretamente a porta 80/443
          // devido a configurações de proxy, então não consideramos um erro crítico
          resolve(checkRequirement(`Porta do servidor (${testPort})`, true, 
            `Aviso: Não foi possível conectar diretamente, mas isso é normal em ambientes com proxy`));
        } else {
          resolve(checkRequirement(`Porta do servidor (${testPort})`, false, 
            `Erro: ${err.message}`));
        }
      });
      
      req.on('timeout', () => {
        req.destroy();
        if (process.env.NODE_ENV === 'production') {
          resolve(checkRequirement(`Porta do servidor (${testPort})`, true, 
            `Timeout: Não foi possível conectar diretamente, mas isso é normal em ambientes com proxy`));
        } else {
          resolve(checkRequirement(`Porta do servidor (${testPort})`, false, 
            `Timeout ao tentar conectar`));
        }
      });
      
      req.end();
    });
  } catch (error) {
    return checkRequirement(`Porta do servidor`, false, 
      `Erro: ${error.message}`);
  }
}

// Verificar dependências do Node.js
function checkNodeDependencies() {
  try {
    if (!fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
      return checkRequirement('Dependências Node.js', false, 'Diretório node_modules não encontrado');
    }
    
    const packageJson = require(path.join(process.cwd(), 'package.json'));
    const dependencies = Object.keys(packageJson.dependencies || {});
    
    // Verificar algumas dependências críticas
    const criticalDeps = ['express', 'react', 'neon'];
    const missingDeps = criticalDeps.filter(dep => 
      !dependencies.some(d => d.includes(dep))
    );
    
    return checkRequirement('Dependências Node.js', missingDeps.length === 0, 
      missingDeps.length 
        ? `Dependências críticas não encontradas: ${missingDeps.join(', ')}` 
        : `${dependencies.length} dependências encontradas`);
  } catch (error) {
    return checkRequirement('Dependências Node.js', false, 
      `Erro ao verificar dependências: ${error.message}`);
  }
}

// Verificar versão do Node.js
function checkNodeVersion() {
  try {
    const nodeVersion = process.version;
    const versionMatch = /v(\d+)\.(\d+)\.(\d+)/.exec(nodeVersion);
    
    if (versionMatch) {
      const majorVersion = parseInt(versionMatch[1], 10);
      const isValid = majorVersion >= 18; // Node.js 18 ou superior
      
      return checkRequirement('Versão do Node.js', isValid, 
        `${nodeVersion} ${isValid ? '(compatível)' : '(incompatível, requer v18+)'}`);
    } else {
      return checkRequirement('Versão do Node.js', false, 
        `Não foi possível determinar a versão: ${nodeVersion}`);
    }
  } catch (error) {
    return checkRequirement('Versão do Node.js', false, 
      `Erro ao verificar versão: ${error.message}`);
  }
}

// Função principal
async function main() {
  try {
    // Verificações do sistema
    checkNodeVersion();
    await checkServerPort();
    checkEnvironmentVariables();
    checkDirectories();
    checkDirectoryPermissions();
    checkNodeDependencies();
    await checkDatabase();
    
    console.log('\nTestes de configuração concluídos.');
  } catch (error) {
    console.error('\nErro durante os testes:', error);
  }
}

// Executar testes
main();