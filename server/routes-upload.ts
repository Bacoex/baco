import { Express, Request, Response } from "express";
import { uploadEventImage, getPublicImageUrl } from "./upload";

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
}