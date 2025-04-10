import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Certifica-se de que o diretório de uploads existe
const uploadDir = './uploads';
const eventImagesDir = path.join(uploadDir, 'events');

// Cria os diretórios se não existirem
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

if (!fs.existsSync(eventImagesDir)) {
  fs.mkdirSync(eventImagesDir);
}

// Configuração do armazenamento para imagens de eventos
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, eventImagesDir);
  },
  filename: function(req, file, cb) {
    // Gera um nome de arquivo único usando timestamp e hash
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
  }
});

// Função para filtrar arquivos e permitir apenas imagens
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Aceita apenas imagens (jpg, jpeg, png, gif, webp)
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Apenas arquivos de imagem são permitidos (jpg, jpeg, png, gif, webp)'));
  }
};

// Limite de tamanho do arquivo (em bytes): 5MB
const maxSize = 5 * 1024 * 1024;

// Criação do middleware de upload para imagens de eventos
export const uploadEventImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: maxSize
  }
});

// Função para obter a URL pública de uma imagem
export function getPublicImageUrl(filename: string): string {
  // Retorna a URL relativa para o arquivo
  return `/uploads/events/${filename}`;
}

// Função para excluir uma imagem
export function deleteImage(filename: string): Promise<boolean> {
  return new Promise((resolve) => {
    const filePath = path.join(eventImagesDir, path.basename(filename));
    
    // Verifica se o arquivo existe
    if (!fs.existsSync(filePath)) {
      console.log(`Arquivo não encontrado: ${filePath}`);
      return resolve(false);
    }
    
    // Tenta excluir o arquivo
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Erro ao excluir arquivo ${filePath}:`, err);
        return resolve(false);
      }
      return resolve(true);
    });
  });
}