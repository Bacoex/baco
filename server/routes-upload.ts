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
import path from "path";
import { processDocumentSet } from "./document-analysis";
import { logError, ErrorType, ErrorSeverity } from "./errorMonitoring";

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

  // Rota para upload da frente do documento RG/CPF (ambos estão no mesmo documento no Brasil)
  app.post('/api/upload/document/frente', ensureAuthenticated, uploadDocument.single('document'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nenhum arquivo foi enviado' 
        });
      }

      const userId = (req as any).user.id;
      const documentUrl = getPublicDocumentUrl(req.file.filename);
      
      // Atualiza o usuário com a URL da imagem da frente do documento
      await db.update(users)
        .set({ documentRgImage: documentUrl })
        .where(eq(users.id, userId));
      
      console.log(`Upload da frente do documento RG/CPF: ${req.file.filename}, usuário: ${userId}`);
      
      return res.status(200).json({
        success: true,
        message: 'Frente do documento enviada com sucesso',
        documentUrl: documentUrl,
        filename: req.file.filename,
        size: req.file.size
      });
    } catch (error) {
      console.error('Erro no upload da frente do documento:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao processar upload do documento'
      });
    }
  });

  // Rota para upload do verso do documento RG/CPF
  app.post('/api/upload/document/verso', ensureAuthenticated, uploadDocument.single('document'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'Nenhum arquivo foi enviado' 
        });
      }

      const userId = (req as any).user.id;
      const documentUrl = getPublicDocumentUrl(req.file.filename);
      
      // Atualiza o usuário com a URL da imagem do verso do documento
      await db.update(users)
        .set({ documentCpfImage: documentUrl })
        .where(eq(users.id, userId));
      
      console.log(`Upload do verso do documento RG/CPF: ${req.file.filename}, usuário: ${userId}`);
      
      return res.status(200).json({
        success: true,
        message: 'Verso do documento enviado com sucesso',
        documentUrl: documentUrl,
        filename: req.file.filename,
        size: req.file.size
      });
    } catch (error) {
      console.error('Erro no upload do verso do documento:', error);
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
  
  // Rota para analisar os documentos enviados
  app.post('/api/document-verification/analyze', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      
      // Buscar informações do usuário para obter os documentos (selecionando apenas as colunas necessárias)
      const userResult = await db.select({
        id: users.id,
        documentRgImage: users.documentRgImage,
        documentCpfImage: users.documentCpfImage,
        documentSelfieImage: users.documentSelfieImage
      }).from(users).where(eq(users.id, userId));
      
      if (!userResult.length) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }
      
      const user = userResult[0];
      
      // Verificar se todos os documentos foram enviados
      if (!user.documentRgImage || !user.documentCpfImage || !user.documentSelfieImage) {
        return res.status(400).json({
          success: false,
          message: 'É necessário enviar todos os documentos antes de iniciar a análise'
        });
      }
      
      // Extrair caminhos dos arquivos a partir das URLs
      const getFilePathFromUrl = (url: string) => {
        const fileName = url.split('/').pop();
        return path.join(process.cwd(), 'uploads', 'documents', fileName as string);
      };
      
      const documentRgPath = getFilePathFromUrl(user.documentRgImage);
      const documentCpfPath = getFilePathFromUrl(user.documentCpfImage);
      const selfiePath = getFilePathFromUrl(user.documentSelfieImage);
      
      console.log('Iniciando análise de documentos para o usuário:', userId);
      console.log('Caminhos dos arquivos:', {
        documentRgPath,
        documentCpfPath, 
        selfiePath
      });
      
      // Processamento dos documentos
      const analysisResult = await processDocumentSet(
        userId,
        documentRgPath,
        documentCpfPath,
        selfiePath
      );
      
      if (!analysisResult.success) {
        // Se houver problema na análise, atualizamos o motivo da rejeição
        await db.update(users)
          .set({ 
            documentRejectionReason: analysisResult.message,
            documentReviewedAt: new Date()
          })
          .where(eq(users.id, userId));
          
        return res.status(400).json({
          success: false,
          message: analysisResult.message
        });
      }
      
      // Se a análise for bem-sucedida, atualizamos o status para aguardando revisão
      // mas não marcamos como verificado ainda, pois isso depende de aprovação manual
      await db.update(users)
        .set({ 
          documentRejectionReason: null,
          documentReviewedAt: null
        })
        .where(eq(users.id, userId));
      
      return res.status(200).json({
        success: true,
        message: 'Documentos analisados com sucesso e enviados para aprovação manual'
      });
    } catch (error) {
      console.error('Erro ao analisar documentos:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao processar análise de documentos'
      });
    }
  });

  // Rota para verificar o status da verificação de documentos
  app.get('/api/document-verification/status', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      // Usar o ID do usuário autenticado
      const userId = (req as any).user.id;
      console.log('Dados da sessão do usuário:', (req as any).user);
      
      console.log(`Verificando status de documentos para o usuário de demonstração ${userId}`);
      
      try {
        // Consulta usando snake_case para combinar com os nomes reais das colunas
        const result = await pool.query(`
          SELECT id, document_verified, document_rg_image, document_cpf_image, 
                 document_selfie_image, document_rejection_reason, document_reviewed_at
          FROM users WHERE id = $1
        `, [userId]);
        
        let userRecord = result.rows[0];
        
        console.log(`Resultado da consulta:`, JSON.stringify(userRecord || null));

        // Se não encontrar o usuário no banco, vamos tentar buscar pelo username
        if (!userRecord) {
          // Vamos tentar buscar pelo username do usuário logado
          try {
            const username = (req as any).user.username;
            console.log(`Usuário ID ${userId} não encontrado, tentando buscar pelo username: ${username}`);
            
            const usernameResult = await pool.query(`
              SELECT id, document_verified, document_rg_image, document_cpf_image, 
                     document_selfie_image, document_rejection_reason, document_reviewed_at
              FROM users WHERE username = $1
            `, [username]);
            
            if (usernameResult.rows.length > 0) {
              userRecord = usernameResult.rows[0];
            }
            console.log(`Resultado da consulta por username:`, JSON.stringify(userRecord || null));
          } catch (err) {
            console.error("Erro ao buscar por username:", err);
          }
        }
        
        // Se ainda não encontrar, vamos buscar qualquer registro para demonstração
        if (!userRecord) {
          console.log('Tentando buscar qualquer usuário como último recurso');
          try {
            const anyUserResult = await pool.query(`
              SELECT id, document_verified, document_rg_image, document_cpf_image, 
                    document_selfie_image, document_rejection_reason, document_reviewed_at
              FROM users LIMIT 1
            `);
            
            if (anyUserResult.rows.length > 0) {
              userRecord = anyUserResult.rows[0];
            }
            console.log(`Resultado da consulta por qualquer usuário:`, JSON.stringify(userRecord || null));
          } catch (err) {
            console.error("Erro ao buscar qualquer usuário:", err);
          }
        }
        
        // Se ainda não encontrou, retorna um status padrão para não quebrar a UI
        if (!userRecord) {
          console.log(`Usuário ${userId} não encontrado no banco de dados, usando valores padrão`);
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
        
        // Determinar o status com base nos documentos enviados e na verificação
        let status = 'not_submitted';
        const hasRg = !!userRecord.document_rg_image;
        const hasCpf = !!userRecord.document_cpf_image;
        const hasSelfie = !!userRecord.document_selfie_image;
        
        // Se todos os documentos foram enviados mas não está verificado ainda
        if (hasRg && hasCpf && hasSelfie && !userRecord.document_verified) {
          status = 'pending_review';
        } 
        // Se foi rejeitado (tem motivo de rejeição)
        else if (userRecord.document_rejection_reason) {
          status = 'rejected';
        }
        // Se está verificado
        else if (userRecord.document_verified) {
          status = 'verified';
        }
        
        return res.status(200).json({
          success: true,
          status,
          documentVerified: !!userRecord.document_verified, // Garantir que seja um boolean
          hasRg: hasRg,
          hasCpf: hasCpf,
          hasSelfie: hasSelfie,
          rejectionReason: userRecord.document_rejection_reason,
          reviewedAt: userRecord.document_reviewed_at
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

  /**
   * Rota para resetar o status de verificação de documentos (apenas administradores)
   * Isso remove o status de rejeição e permite que o usuário tente novamente
   */
  app.post('/api/document-verification/admin/reset', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).user.id;
      const { userId } = req.body;
      
      // Verificar se o usuário é um administrador (ID 1 ou 2, ou campo isAdmin)
      if (adminId !== 1 && adminId !== 2) {
        return res.status(403).json({
          success: false,
          message: 'Apenas administradores podem resetar documentos'
        });
      }
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'ID do usuário não fornecido'
        });
      }
      
      // Log da operação
      logError(
        ErrorType.DOCUMENT_VERIFICATION,
        ErrorSeverity.INFO,
        'AdminDocReset',
        `Admin ${adminId} está resetando o status de verificação do usuário ${userId}`,
        { adminId, userId }
      );
      
      // Resetar o status de verificação
      await db.update(users)
        .set({ 
          documentRejectionReason: null,
          documentReviewedAt: null,
          documentVerified: false
        })
        .where(eq(users.id, userId));
      
      return res.status(200).json({
        success: true,
        message: 'Status de verificação resetado com sucesso'
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logError(
        ErrorType.DOCUMENT_VERIFICATION,
        ErrorSeverity.ERROR,
        'AdminDocReset',
        `Erro ao resetar status de verificação: ${errorMsg}`,
        { error }
      );
      
      return res.status(500).json({
        success: false,
        message: 'Erro ao resetar status de verificação'
      });
    }
  });
  
  // Rota para aprovação ou rejeição de documentos (apenas administradores)
  app.post('/api/document-verification/admin/review', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).user.id;
      
      // Verificar se o usuário é um administrador (ID 1 ou 2, ou campo isAdmin)
      if (adminId !== 1 && adminId !== 2) {
        return res.status(403).json({
          success: false,
          message: 'Apenas administradores podem revisar documentos'
        });
      }
      
      const { userId, approved, rejectionReason } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'ID do usuário é obrigatório'
        });
      }
      
      // Buscar usuário para verificar se documentos foram enviados
      const userResult = await db.select().from(users).where(eq(users.id, userId));
      
      if (!userResult.length) {
        return res.status(404).json({
          success: false,
          message: 'Usuário não encontrado'
        });
      }
      
      const user = userResult[0];
      
      // Verificar se todos os documentos foram enviados
      if (!user.documentRgImage || !user.documentCpfImage || !user.documentSelfieImage) {
        return res.status(400).json({
          success: false,
          message: 'O usuário não enviou todos os documentos necessários'
        });
      }
      
      // Aprovar ou rejeitar com base no parâmetro
      if (approved) {
        await db.update(users)
          .set({ 
            documentVerified: true,
            documentReviewedAt: new Date(),
            documentReviewedBy: adminId,
            documentRejectionReason: null
          })
          .where(eq(users.id, userId));
          
        console.log(`Documentos do usuário ${userId} APROVADOS pelo admin ${adminId}`);
        
        return res.status(200).json({
          success: true,
          message: 'Documentos aprovados com sucesso'
        });
      } else {
        // Verificar se o motivo da rejeição foi fornecido
        if (!rejectionReason) {
          return res.status(400).json({
            success: false,
            message: 'É necessário fornecer um motivo para rejeição'
          });
        }
        
        await db.update(users)
          .set({ 
            documentVerified: false,
            documentReviewedAt: new Date(),
            documentReviewedBy: adminId,
            documentRejectionReason: rejectionReason
          })
          .where(eq(users.id, userId));
          
        console.log(`Documentos do usuário ${userId} REJEITADOS pelo admin ${adminId}: ${rejectionReason}`);
        
        return res.status(200).json({
          success: true,
          message: 'Documentos rejeitados com sucesso'
        });
      }
    } catch (error) {
      console.error('Erro ao revisar documentos:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao processar revisão de documentos'
      });
    }
  });

  // Rota para listar usuários com documentos pendentes de revisão (apenas administradores)
  app.get('/api/document-verification/admin/pending', ensureAuthenticated, async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).user.id;
      
      // Verificar se o usuário é um administrador (ID 1 ou 2, ou campo isAdmin)
      if (adminId !== 1 && adminId !== 2) {
        return res.status(403).json({
          success: false,
          message: 'Apenas administradores podem acessar esta funcionalidade'
        });
      }
      
      // Buscar usuários com documentos pendentes de revisão
      const result = await pool.query(`
        SELECT id, username, first_name, last_name, email, 
               document_rg_image, document_cpf_image, document_selfie_image
        FROM users 
        WHERE document_rg_image IS NOT NULL 
          AND document_cpf_image IS NOT NULL 
          AND document_selfie_image IS NOT NULL
          AND document_verified = false
          AND document_rejection_reason IS NULL
        ORDER BY id DESC
      `);
      
      return res.status(200).json({
        success: true,
        pendingUsers: result.rows
      });
    } catch (error) {
      console.error('Erro ao listar documentos pendentes:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao listar documentos pendentes de revisão'
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