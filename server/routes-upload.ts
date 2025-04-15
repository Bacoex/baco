import { Express, Request, Response } from "express";
import { 
  uploadEventImage,
  uploadDocument,
  uploadProfileImage,
  getPublicImageUrl,
  getPublicDocumentUrl,
  getPublicProfileImageUrl,
  deleteDocument
} from "./upload";
import { db, pool } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

// Middleware para verificar autenticação
const ensureAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ 
    success: false,
    message: "Não autorizado. Faça login para realizar esta operação." 
  });
};

/**
 * Registra as rotas relacionadas ao upload de imagens
 * @param app Instância do Express
 */
export function registerUploadRoutes(app: Express) {
  // Rota para upload de imagem de evento
  app.post('/api/upload/event-image', ensureAuthenticated, uploadEventImage.single('image'), (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nenhum arquivo foi enviado' 
        });
      }

      // Gera a URL pública para a imagem
      const imageUrl = getPublicImageUrl(req.file.filename);
      
          // Log do upload bem-sucedido
      console.log(`Upload de imagem bem-sucedido: ${req.file.filename}, tamanho: ${req.file.size} bytes, URL: ${imageUrl}, usuário: ${(req as any).user?.id || 'desconhecido'}`);
      
      // Retorna os dados da imagem
      return res.status(200).json({
        success: true,
        message: 'Imagem enviada com sucesso',
        imageUrl: imageUrl,
        filename: req.file.filename,
        size: req.file.size
      });
    } catch (error) {
      console.error('Erro no upload de imagem:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao processar upload da imagem'
      });
    }
  });

  // Rota para upload de documento RG
  app.post('/api/upload/document/rg', ensureAuthenticated, uploadDocument.single('document'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nenhum arquivo foi enviado' 
        });
      }

      const userId = (req as any).user.id;
      const documentUrl = getPublicDocumentUrl(req.file.filename);
      
      // Atualiza o usuário com a URL da imagem do documento
      await db.update(users)
        .set({ documentRgImage: documentUrl })
        .where(eq(users.id, userId));
      
      console.log(`Upload de documento RG: ${req.file.filename}, usuário: ${userId}`);
      
      return res.status(200).json({
        success: true,
        message: 'Documento RG enviado com sucesso',
        documentUrl: documentUrl,
        filename: req.file.filename,
        size: req.file.size
      });
    } catch (error) {
      console.error('Erro no upload de documento RG:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao processar upload do documento'
      });
    }
  });

  // Rota para upload de documento CPF
  app.post('/api/upload/document/cpf', ensureAuthenticated, uploadDocument.single('document'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nenhum arquivo foi enviado' 
        });
      }

      const userId = (req as any).user.id;
      const documentUrl = getPublicDocumentUrl(req.file.filename);
      
      // Atualiza o usuário com a URL da imagem do documento
      await db.update(users)
        .set({ documentCpfImage: documentUrl })
        .where(eq(users.id, userId));
      
      console.log(`Upload de documento CPF: ${req.file.filename}, usuário: ${userId}`);
      
      return res.status(200).json({
        success: true,
        message: 'Documento CPF enviado com sucesso',
        documentUrl: documentUrl,
        filename: req.file.filename,
        size: req.file.size
      });
    } catch (error) {
      console.error('Erro no upload de documento CPF:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao processar upload do documento'
      });
    }
  });

  // Rota para upload de selfie com documento
  app.post('/api/upload/document/selfie', ensureAuthenticated, uploadDocument.single('document'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nenhum arquivo foi enviado' 
        });
      }

      const userId = (req as any).user.id;
      const documentUrl = getPublicDocumentUrl(req.file.filename);
      
      // Atualiza o usuário com a URL da selfie com documento
      await db.update(users)
        .set({ 
          documentSelfieImage: documentUrl,
          // Quando a selfie é enviada, marcamos que o usuário enviou todos os documentos necessários
          // e aguardando revisão (documentVerified continua como false até que um admin aprove)
          documentReviewedAt: null,
          documentReviewedBy: null,
          documentRejectionReason: null
        })
        .where(eq(users.id, userId));
      
      console.log(`Upload de selfie com documento: ${req.file.filename}, usuário: ${userId}`);
      
      return res.status(200).json({
        success: true,
        message: 'Selfie com documento enviada com sucesso',
        documentUrl: documentUrl,
        filename: req.file.filename,
        size: req.file.size
      });
    } catch (error) {
      console.error('Erro no upload de selfie com documento:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao processar upload da selfie'
      });
    }
  });

  // Rota para verificar o status da verificação de documentos
  app.get('/api/document-verification/status', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      
      console.log(`Verificando status de documentos para o usuário ${userId}`);
      
      try {
        // Versão simplificada da consulta usando apenas a coluna document_verified
        const result = await pool.query(`
          SELECT id, document_verified 
          FROM users WHERE id = $1
        `, [userId]);
        
        const userRecord = result.rows[0];
        
        console.log(`Resultado da consulta:`, JSON.stringify(userRecord || null));

        if (!userRecord) {
          console.log(`Usuário ${userId} não encontrado no banco de dados`);
          return res.status(404).json({
            success: false,
            message: 'Usuário não encontrado'
          });
        }
        
        // Usamos apenas o status "verified" ou "not_submitted" baseado na coluna document_verified
        const status = userRecord.document_verified ? 'verified' : 'not_submitted';
        
        return res.status(200).json({
          success: true,
          status,
          documentVerified: !!userRecord.document_verified, // Garantir que seja um boolean
          hasRg: false,  // Valores padrão, já que não temos informações suficientes
          hasCpf: false,
          hasSelfie: false,
          rejectionReason: null,
          reviewedAt: null
        });
      } catch (innerError) {
        console.error('Erro na consulta SQL:', innerError);
        // Fallback para resposta mínima em caso de erro na consulta
        return res.status(200).json({
          success: true,
          status: 'not_submitted',
          documentVerified: false,
          hasRg: false,
          hasCpf: false,
          hasSelfie: false,
          rejectionReason: null,
          reviewedAt: null
        });
      }
    } catch (error) {
      console.error('Erro ao verificar status de documentos:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao verificar status de documentos'
      });
    }
  });

  // Rota para upload de imagem de perfil
  app.post('/api/upload/profile-image', ensureAuthenticated, uploadProfileImage.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nenhum arquivo foi enviado' 
        });
      }

      const userId = (req as any).user.id;
      const imageUrl = getPublicProfileImageUrl(req.file.filename);
      
      // Atualiza o usuário com a nova URL da imagem de perfil
      await db.update(users)
        .set({ profileImage: imageUrl })
        .where(eq(users.id, userId));
      
      console.log(`Upload de imagem de perfil: ${req.file.filename}, usuário: ${userId}`);
      
      return res.status(200).json({
        success: true,
        message: 'Imagem de perfil enviada com sucesso',
        imageUrl: imageUrl,
        filename: req.file.filename,
        size: req.file.size
      });
    } catch (error) {
      console.error('Erro no upload de imagem de perfil:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao processar upload da imagem de perfil'
      });
    }
  });
}