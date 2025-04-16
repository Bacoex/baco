/**
 * Script para limpeza automática de logs antigos
 * Este script deve ser executado periodicamente via cron job
 * na Hostinger para evitar acúmulo de logs desnecessários
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('@neondatabase/serverless');
const { config } = require('dotenv');

// Carregar variáveis de ambiente
config();

// Configuração
const MAX_LOG_AGE_DAYS = 14; // Logs mais antigos que 14 dias serão removidos
const DB_ERROR_LOGS_TABLE = 'error_logs'; // Nome da tabela de logs no banco de dados

// Função para deletar logs antigos do banco de dados
async function cleanupDatabaseLogs() {
  if (!process.env.DATABASE_URL) {
    console.error('Erro: DATABASE_URL não definida no ambiente');
    return false;
  }

  try {
    console.log(`Conectando ao banco de dados...`);
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Calcular data limite (14 dias atrás)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MAX_LOG_AGE_DAYS);
    
    console.log(`Removendo logs anteriores a ${cutoffDate.toISOString()}`);
    
    // Executar query para remover logs antigos
    const result = await pool.query(
      `DELETE FROM ${DB_ERROR_LOGS_TABLE} WHERE timestamp < $1 RETURNING count(*)`,
      [cutoffDate]
    );
    
    const count = result.rows[0]?.count || 0;
    console.log(`${count} logs antigos removidos do banco de dados`);
    
    await pool.end();
    return true;
  } catch (error) {
    console.error('Erro ao limpar logs do banco de dados:', error.message);
    return false;
  }
}

// Função para limpar arquivos de log antigos
function cleanupLogFiles() {
  const logsDir = path.join(process.cwd(), 'logs');
  
  // Verificar se o diretório existe
  if (!fs.existsSync(logsDir)) {
    console.log('Diretório de logs não encontrado');
    return false;
  }
  
  try {
    const files = fs.readdirSync(logsDir);
    const now = new Date();
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(logsDir, file);
      
      // Obter estatísticas do arquivo
      const stats = fs.statSync(filePath);
      
      // Calcular idade do arquivo em dias
      const fileAgeDays = (now - stats.mtime) / (1000 * 60 * 60 * 24);
      
      // Deletar se for mais antigo que o limite
      if (fileAgeDays > MAX_LOG_AGE_DAYS) {
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`Arquivo removido: ${file} (${Math.round(fileAgeDays)} dias)`);
      }
    }
    
    console.log(`${deletedCount} arquivos de log antigos removidos`);
    return true;
  } catch (error) {
    console.error('Erro ao limpar arquivos de log:', error.message);
    return false;
  }
}

// Função principal
async function main() {
  console.log('=== LIMPEZA DE LOGS DO BACO ===');
  console.log(`Data: ${new Date().toISOString()}`);
  console.log(`Removendo logs mais antigos que ${MAX_LOG_AGE_DAYS} dias`);
  
  const dbResult = await cleanupDatabaseLogs();
  const filesResult = cleanupLogFiles();
  
  if (dbResult && filesResult) {
    console.log('Limpeza de logs concluída com sucesso');
  } else {
    console.log('Limpeza de logs concluída com avisos');
  }
}

// Executar o script
main().catch(error => {
  console.error('Erro na execução do script:', error);
  process.exit(1);
});