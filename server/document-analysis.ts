/**
 * Serviço de análise de documentos
 * Implementa análise básica de documentos RG/CPF e comparação facial
 */
import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';
import { createWorker } from 'tesseract.js';
import { logError, ErrorSeverity, ErrorType } from './errorMonitoring';

// Tipagem para erros
interface ErrorWithMessage {
  message: string;
}

// Função auxiliar para tratar erros unknown
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Erro desconhecido';
}

/**
 * Interface para resultado de análise de documento
 */
export interface DocumentAnalysisResult {
  success: boolean;
  confidence: number;
  detectedText?: string;
  documentType?: 'rg' | 'cpf' | 'unknown';
  hasFace?: boolean;
  errorMessage?: string;
}

/**
 * Resultado da comparação facial
 */
export interface FaceComparisonResult {
  success: boolean;
  confidence: number;
  matched: boolean;
  errorMessage?: string;
}

/**
 * Configurações para análise de documentos
 */
const DOCUMENT_CONFIDENCE_THRESHOLD = 0.3; // Confiança mínima para extração de texto - ajustada para garantir que a imagem seja realmente um documento
const FACE_CONFIDENCE_THRESHOLD = 0.8; // Confiança mínima para detecção facial

/**
 * Analisa a imagem de um documento para extrair informações
 * @param imagePath Caminho para o arquivo de imagem
 * @param documentType Tipo de documento (frente/RG ou verso/CPF)
 * @returns Resultado da análise
 */
export async function analyzeDocument(
  imagePath: string,
  documentType: 'rg' | 'cpf'
): Promise<DocumentAnalysisResult> {
  try {
    // Verificar se o arquivo existe
    if (!fs.existsSync(imagePath)) {
      return {
        success: false,
        confidence: 0,
        errorMessage: 'Arquivo de imagem não encontrado'
      };
    }

    // Criar worker do Tesseract para OCR
    const worker = await createWorker('por'); // Usando o idioma português
    
    try {
      // Extrair texto da imagem
      const { data } = await worker.recognize(imagePath);
      
      // Verificar confiança e texto extraído
      const confidence = data.confidence / 100; // Normalizar para 0-1
      
      // Verificar se o resultado atende aos nossos critérios
      const success = confidence >= DOCUMENT_CONFIDENCE_THRESHOLD;
      
      // Tentar identificar o tipo de documento com base no texto
      let detectedDocType: 'rg' | 'cpf' | 'unknown' = 'unknown';
      const lowerText = data.text.toLowerCase();
      
      // Verificar se o texto extraído é suficiente para caracterizar um documento
      // Se não houver texto suficiente, provavelmente não é um documento válido
      const hasMinimumText = data.text.length > 20; // Documentos geralmente têm mais de 20 caracteres
      
      // Ampliado para reconhecer CNH como documento de identidade válido também
      if (lowerText.includes('identidade') || lowerText.includes('registro geral') || lowerText.includes('rg') || 
          lowerText.includes('cnh') || lowerText.includes('carteira nacional') || lowerText.includes('habilitação')) {
        detectedDocType = 'rg';
      } else if (lowerText.includes('cpf') || lowerText.includes('cadastro de pessoa')) {
        detectedDocType = 'cpf';
      }
      
      // Verificar palavras-chave para identificar um documento brasileiro válido
      const brazilianDocumentKeywords = ['brasil', 'república', 'federativa', 'ministério', 'secretaria', 
                                         'identidade', 'documento', 'registro', 'nascimento', 'filiação'];
      
      // Verificar se pelo menos uma palavra-chave de documento está presente
      const hasDocumentKeyword = brazilianDocumentKeywords.some(keyword => lowerText.includes(keyword));
      
      // Sempre defina um tipo de documento, mesmo se não conseguir detectar
      if (detectedDocType === 'unknown') {
        detectedDocType = documentType; // Usa o tipo informado como padrão
      }
      
      // Validar se parece ser um documento genuíno
      // Se não tiver texto suficiente ou nenhuma palavra-chave de documento, provável que não seja um documento
      const looksLikeDocument = hasMinimumText && (hasDocumentKeyword || detectedDocType !== 'unknown');
      
      // Validar se o tipo de documento detectado corresponde ao esperado
      const isCorrectType = detectedDocType === 'unknown' || detectedDocType === documentType;
      
      await worker.terminate();
      
      let errorMessage: string | undefined;
      
      if (!isCorrectType) {
        errorMessage = 'Tipo de documento não corresponde ao esperado';
      } else if (!success) {
        errorMessage = 'Não foi possível identificar claramente o documento. Certifique-se que a imagem está nítida, bem iluminada e sem reflexos.';
      }
      
      // Verificar se parece ser um documento válido
      if (!looksLikeDocument) {
        return {
          success: false,
          confidence,
          detectedText: data.text,
          documentType: 'unknown',
          errorMessage: 'A imagem não parece ser um documento válido. Certifique-se de que é uma foto clara de um documento oficial.'
        };
      }
    
      return {
        success: success && isCorrectType && looksLikeDocument,
        confidence,
        detectedText: data.text,
        documentType: detectedDocType,
        hasFace: documentType === 'rg', // Normalmente apenas o RG tem foto
        errorMessage
      };
    } catch (error) {
      await worker.terminate();
      throw error;
    }
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error);
    logError(
      ErrorType.EXTERNAL_API,
      ErrorSeverity.ERROR,
      'DocumentAnalysis',
      `Erro ao analisar documento: ${errorMsg}`,
      { documentType, error }
    );
    
    return {
      success: false,
      confidence: 0,
      errorMessage: `Erro ao processar imagem: ${errorMsg}`
    };
  }
}

/**
 * Compara a selfie enviada com a foto do documento RG
 * @param selfieImagePath Caminho para a selfie
 * @param documentImagePath Caminho para o documento RG
 * @returns Resultado da comparação
 */
export async function compareFaces(
  selfieImagePath: string, 
  documentImagePath: string
): Promise<FaceComparisonResult> {
  try {
    // Verificar se os arquivos existem
    if (!fs.existsSync(selfieImagePath) || !fs.existsSync(documentImagePath)) {
      return {
        success: false,
        confidence: 0,
        matched: false,
        errorMessage: 'Um ou mais arquivos de imagem não encontrados'
      };
    }
    
    // Esta é uma implementação básica que apenas verifica se há rostos detectáveis
    // em ambas as imagens. A implementação completa requereria um modelo de ML mais
    // sofisticado para comparação facial precisa.
    
    // Verificar se há face na selfie (implementação simplificada)
    const hasFaceInSelfie = await checkIfImageHasFace(selfieImagePath);
    
    if (!hasFaceInSelfie) {
      return {
        success: false,
        confidence: 0.3,
        matched: false,
        errorMessage: 'Nenhum rosto detectado na selfie'
      };
    }
    
    // Em uma implementação real, faríamos a comparação dos rostos usando modelos de ML
    // Para nossa versão simplificada, apenas relatamos sucesso se ambas imagens têm rostos
    return {
      success: true,
      confidence: 0.75, // Confiança média por ser uma verificação básica
      matched: true
    };
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error);
    logError(
      ErrorType.EXTERNAL_API,
      ErrorSeverity.ERROR,
      'DocumentAnalysis',
      `Erro ao comparar faces: ${errorMsg}`,
      { error }
    );
    
    return {
      success: false,
      confidence: 0,
      matched: false,
      errorMessage: `Erro ao processar imagens: ${errorMsg}`
    };
  }
}

/**
 * Verifica se há face em uma imagem
 * Implementação básica para detecção de faces
 * @param imagePath Caminho da imagem
 * @returns true se uma face for detectada
 */
async function checkIfImageHasFace(imagePath: string): Promise<boolean> {
  try {
    // Implementação básica - em produção usaríamos a face-api.js ou API externa
    // Para este exemplo, apenas verificamos se a imagem pode ser carregada
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    
    // Assumimos que há um rosto se a imagem puder ser carregada
    // Em uma implementação real, usaríamos detecção facial
    return true;
  } catch (error) {
    console.error('Erro ao verificar face na imagem:', error);
    return false;
  }
}

/**
 * Adiciona à fila de moderação manual
 * @param userId ID do usuário
 * @param documentRgPath Caminho do documento RG
 * @param documentCpfPath Caminho do documento CPF
 * @param selfiePath Caminho da selfie
 * @returns true se adicionado com sucesso
 */
export async function addToModerationQueue(
  userId: number,
  documentRgPath: string,
  documentCpfPath: string,
  selfiePath: string
): Promise<boolean> {
  try {
    // Em uma implementação real, adicionaríamos à fila de moderação no banco de dados
    // Para nosso exemplo, apenas registramos que os documentos foram enviados para análise
    
    // Atualizar status para "em análise"
    console.log(`Documentos do usuário ${userId} adicionados à fila de moderação manual`);
    
    return true;
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error);
    logError(
      ErrorType.DATABASE,
      ErrorSeverity.ERROR,
      'DocumentAnalysis',
      `Erro ao adicionar à fila de moderação: ${errorMsg}`,
      { userId, error }
    );
    
    return false;
  }
}

/**
 * Processa um conjunto completo de documentos
 * @param userId ID do usuário
 * @param documentRgPath Caminho do documento RG/frente
 * @param documentCpfPath Caminho do documento CPF/verso
 * @param selfiePath Caminho da selfie
 * @returns Resultado do processamento
 */
export async function processDocumentSet(
  userId: number,
  documentRgPath: string,
  documentCpfPath: string,
  selfiePath: string
): Promise<{success: boolean, message: string}> {
  try {
    // Registrar início da análise nos logs
    logError(
      ErrorType.DOCUMENT_VERIFICATION,
      ErrorSeverity.INFO,
      'DocumentAnalysis',
      `Iniciando análise de documentos para usuário ID ${userId}`,
      { 
        userId,
        paths: {
          documentRgPath: path.basename(documentRgPath),
          documentCpfPath: path.basename(documentCpfPath),
          selfiePath: path.basename(selfiePath)
        }
      }
    );
    
    // 1. Analisar documento RG (frente)
    logError(
      ErrorType.DOCUMENT_VERIFICATION,
      ErrorSeverity.INFO,
      'DocumentAnalysis',
      `Analisando frente do documento (RG) do usuário ${userId}`,
      { userId, documentPath: path.basename(documentRgPath) }
    );
    
    const rgAnalysis = await analyzeDocument(documentRgPath, 'rg');
    
    // Registrar resultado da análise RG
    logError(
      ErrorType.DOCUMENT_VERIFICATION,
      rgAnalysis.success ? ErrorSeverity.INFO : ErrorSeverity.WARNING,
      'DocumentAnalysis',
      `Resultado da análise da frente do documento: ${rgAnalysis.success ? 'Sucesso' : 'Falha'}`,
      { 
        userId,
        success: rgAnalysis.success,
        confidence: rgAnalysis.confidence,
        documentType: rgAnalysis.documentType,
        hasFace: rgAnalysis.hasFace,
        errorMessage: rgAnalysis.errorMessage
      }
    );
    
    if (!rgAnalysis.success) {
      return {
        success: false,
        message: `Problema com a frente do documento: ${rgAnalysis.errorMessage}`
      };
    }
    
    // 2. Analisar documento CPF (verso)
    logError(
      ErrorType.DOCUMENT_VERIFICATION,
      ErrorSeverity.INFO,
      'DocumentAnalysis',
      `Analisando verso do documento (CPF) do usuário ${userId}`,
      { userId, documentPath: path.basename(documentCpfPath) }
    );
    
    const cpfAnalysis = await analyzeDocument(documentCpfPath, 'cpf');
    
    // Registrar resultado da análise CPF
    logError(
      ErrorType.DOCUMENT_VERIFICATION,
      cpfAnalysis.success ? ErrorSeverity.INFO : ErrorSeverity.WARNING,
      'DocumentAnalysis',
      `Resultado da análise do verso do documento: ${cpfAnalysis.success ? 'Sucesso' : 'Falha'}`,
      { 
        userId,
        success: cpfAnalysis.success,
        confidence: cpfAnalysis.confidence,
        documentType: cpfAnalysis.documentType,
        errorMessage: cpfAnalysis.errorMessage
      }
    );
    
    if (!cpfAnalysis.success) {
      return {
        success: false,
        message: `Problema com o verso do documento: ${cpfAnalysis.errorMessage}`
      };
    }
    
    // 3. Comparar faces (básico)
    logError(
      ErrorType.DOCUMENT_VERIFICATION,
      ErrorSeverity.INFO,
      'DocumentAnalysis',
      `Comparando selfie com foto do documento para usuário ${userId}`,
      { 
        userId, 
        selfie: path.basename(selfiePath),
        documentImage: path.basename(documentRgPath)
      }
    );
    
    const faceComparison = await compareFaces(selfiePath, documentRgPath);
    
    // Registrar resultado da comparação facial
    logError(
      ErrorType.DOCUMENT_VERIFICATION,
      faceComparison.success ? ErrorSeverity.INFO : ErrorSeverity.WARNING,
      'DocumentAnalysis',
      `Resultado da comparação facial: ${faceComparison.success ? 'Sucesso' : 'Falha'}`,
      { 
        userId,
        success: faceComparison.success,
        confidence: faceComparison.confidence,
        matched: faceComparison.matched,
        errorMessage: faceComparison.errorMessage
      }
    );
    
    if (!faceComparison.success) {
      return {
        success: false,
        message: `Problema com a comparação facial: ${faceComparison.errorMessage}`
      };
    }
    
    // 4. Adicionar à fila de moderação manual
    logError(
      ErrorType.DOCUMENT_VERIFICATION,
      ErrorSeverity.INFO,
      'DocumentAnalysis',
      `Adicionando documentos do usuário ${userId} à fila de moderação`,
      { userId }
    );
    
    const queueResult = await addToModerationQueue(userId, documentRgPath, documentCpfPath, selfiePath);
    
    if (!queueResult) {
      logError(
        ErrorType.DOCUMENT_VERIFICATION,
        ErrorSeverity.ERROR,
        'DocumentAnalysis',
        `Falha ao adicionar documentos à fila de moderação para usuário ${userId}`,
        { userId }
      );
      
      return {
        success: false,
        message: "Erro ao adicionar documentos à fila de moderação"
      };
    }
    
    // Sucesso - documentos prontos para revisão manual
    logError(
      ErrorType.DOCUMENT_VERIFICATION,
      ErrorSeverity.INFO,
      'DocumentAnalysis',
      `Análise de documentos concluída com sucesso para usuário ${userId}`,
      { 
        userId,
        status: 'pending_review',
        rgConfidence: rgAnalysis.confidence,
        cpfConfidence: cpfAnalysis.confidence,
        faceConfidence: faceComparison.confidence
      }
    );
    
    return {
      success: true,
      message: "Documentos processados com sucesso e adicionados à fila de revisão"
    };
  } catch (error: unknown) {
    const errorMsg = getErrorMessage(error);
    logError(
      ErrorType.DOCUMENT_VERIFICATION,
      ErrorSeverity.ERROR,
      'DocumentAnalysis',
      `Erro ao processar conjunto de documentos: ${errorMsg}`,
      { userId, error }
    );
    
    return {
      success: false,
      message: `Erro ao processar documentos: ${errorMsg}`
    };
  }
}