import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Certifica-se de que o diretório de uploads existe
const uploadDir = './uploads';
const eventImagesDir = path.join(uploadDir, 'events');
const documentsDir = path.join(uploadDir, 'documents');
const profileImagesDir = path.join(uploadDir, 'profiles');

// Cria os diretórios se não existirem
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

if (!fs.existsSync(eventImagesDir)) {
  fs.mkdirSync(eventImagesDir);
}

if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir);
}

if (!fs.existsSync(profileImagesDir)) {
  fs.mkdirSync(profileImagesDir);
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

// Configuração do armazenamento para documentos
const documentStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, documentsDir);
  },
  filename: function(req, file, cb) {
    // Gera um nome de arquivo único usando timestamp, hash e id do usuário
    const userId = (req as any).user?.id || 'unknown';
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    cb(null, `user_${userId}_${file.fieldname}_${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  }
});

// Configuração do armazenamento para fotos de perfil
const profileStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, profileImagesDir);
  },
  filename: function(req, file, cb) {
    // Gera um nome de arquivo único usando o id do usuário
    const userId = (req as any).user?.id || 'unknown';
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    cb(null, `user_${userId}_profile_${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  }
});

// Criação do middleware de upload para imagens de eventos
export const uploadEventImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: maxSize
  }
});

// Criação do middleware de upload para documentos
export const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: maxSize
  }
});

// Criação do middleware de upload para fotos de perfil
export const uploadProfileImage = multer({
  storage: profileStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: maxSize
  }
});

// Função para obter a URL pública de uma imagem de evento
export function getPublicImageUrl(filename: string): string {
  return `/uploads/events/${filename}`;
}

// Função para obter a URL pública de um documento
export function getPublicDocumentUrl(filename: string): string {
  return `/uploads/documents/${filename}`;
}

// Função para obter a URL pública de uma foto de perfil
export function getPublicProfileImageUrl(filename: string): string {
  return `/uploads/profiles/${filename}`;
}

// Função para excluir uma imagem de evento
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

// Função para excluir um documento
export function deleteDocument(filename: string): Promise<boolean> {
  return new Promise((resolve) => {
    const filePath = path.join(documentsDir, path.basename(filename));
    
    // Verifica se o arquivo existe
    if (!fs.existsSync(filePath)) {
      console.log(`Documento não encontrado: ${filePath}`);
      return resolve(false);
    }
    
    // Tenta excluir o arquivo
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Erro ao excluir documento ${filePath}:`, err);
        return resolve(false);
      }
      return resolve(true);
    });
  });
}