import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { logDocumentVerificationError } from '@/lib/errorLogger';
import { apiRequest } from '@/lib/queryClient';

import { 
  Camera, 
  Upload, 
  FileCheck, 
  FileX, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  CreditCard, 
  UserSquare2,
  RefreshCw,
  Info
} from 'lucide-react';

// Interface para os dados de status da verificação
export interface VerificationStatus {
  success: boolean;
  status: 'not_submitted' | 'pending_review' | 'verified' | 'rejected';
  documentVerified: boolean; // Mantido para retrocompatibilidade
  hasRg: boolean;
  hasCpf: boolean;
  hasSelfie: boolean;
  rejectionReason?: string;
  reviewedAt?: string;
}

// Interface para o resultado da análise de documentos
interface AnalysisResult {
  success: boolean;
  message: string;
}

export function DocumentVerification() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Refs para input de arquivos
  const rgFileInputRef = useRef<HTMLInputElement>(null);
  const cpfFileInputRef = useRef<HTMLInputElement>(null);
  const selfieFileInputRef = useRef<HTMLInputElement>(null);

  // Estado para controlar a aba ativa
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Estado para rastrear uploads em andamento
  const [uploading, setUploading] = useState({
    rg: false,
    cpf: false,
    selfie: false
  });

  // Consulta para obter o status atual da verificação
  const { 
    data: verificationStatus, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<VerificationStatus>({
    queryKey: ['/api/document-verification/status'],
    queryFn: async () => {
      const response = await fetch('/api/document-verification/status', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Falha ao obter status de verificação');
      }
      return response.json();
    },
    refetchInterval: 60000, // Atualiza a cada minuto
    retry: 1,
    enabled: !!user // Só executa se o usuário estiver logado
  });
  
  // Log para debug - comente após resolver o problema
  console.log("Status da verificação:", { 
    verificationStatus, 
    isLoading, 
    error: error ? (error as Error).message : null 
  });

  // Mutação para upload da frente do documento (RG/CPF são o mesmo no Brasil)
  const uploadRGMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploading(prev => ({ ...prev, rg: true }));
      const formData = new FormData();
      formData.append('document', file);
      
      const response = await fetch('/api/upload/document/frente', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao fazer upload da frente do documento');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Frente do documento enviada com sucesso',
        description: 'A frente do seu documento foi enviada e está sendo processada.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/document-verification/status'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao enviar frente do documento',
        description: error.message,
        variant: 'destructive'
      });
      
      // Registrar erro nos logs
      logDocumentVerificationError(
        'Upload',
        'frente',
        error,
        { userId: user?.id }
      );
    },
    onSettled: () => {
      setUploading(prev => ({ ...prev, rg: false }));
    }
  });

  // Mutação para upload do verso do documento (RG/CPF são o mesmo no Brasil)
  const uploadCPFMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploading(prev => ({ ...prev, cpf: true }));
      const formData = new FormData();
      formData.append('document', file);
      
      const response = await fetch('/api/upload/document/verso', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao fazer upload do verso do documento');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Verso do documento enviado com sucesso',
        description: 'O verso do seu documento foi enviado e está sendo processado.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/document-verification/status'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao enviar verso do documento',
        description: error.message,
        variant: 'destructive'
      });
      
      // Registrar erro nos logs
      logDocumentVerificationError(
        'Upload',
        'verso',
        error,
        { userId: user?.id }
      );
    },
    onSettled: () => {
      setUploading(prev => ({ ...prev, cpf: false }));
    }
  });

  // Mutação para upload de selfie com documento
  const uploadSelfieMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploading(prev => ({ ...prev, selfie: true }));
      const formData = new FormData();
      formData.append('document', file);
      
      const response = await fetch('/api/upload/document/selfie', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao fazer upload da selfie');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Selfie enviada com sucesso',
        description: 'Sua selfie com documento foi enviada e está sendo processada.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/document-verification/status'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao enviar selfie',
        description: error.message,
        variant: 'destructive'
      });
      
      // Registrar erro nos logs
      logDocumentVerificationError(
        'Upload',
        'selfie',
        error,
        { userId: user?.id }
      );
    },
    onSettled: () => {
      setUploading(prev => ({ ...prev, selfie: false }));
    }
  });
  
  // Mutação para análise automática de documentos
  const analyzeDocumentsMutation = useMutation<AnalysisResult, Error>({
    mutationFn: async () => {
      const response = await fetch('/api/document-verification/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao analisar documentos');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Análise de documentos concluída',
        description: data.message || 'Seus documentos foram analisados com sucesso.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/document-verification/status'] });
      // Mudar para a aba de revisão após a análise
      setActiveTab('review');
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro na análise de documentos',
        description: error.message,
        variant: 'destructive'
      });
      
      // Registrar erro nos logs
      logDocumentVerificationError(
        'Análise',
        'análise',
        error,
        { userId: user?.id }
      );
    }
  });
  
  // Mutação para resetar o status de verificação (quando rejeitado)
  const resetVerificationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/document-verification/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao resetar status de verificação');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Status resetado com sucesso',
        description: 'Agora você pode enviar novos documentos e tentar novamente.'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/document-verification/status'] });
      setActiveTab('overview');
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao resetar status',
        description: error.message,
        variant: 'destructive'
      });
      
      // Registrar erro nos logs
      logDocumentVerificationError(
        'Reset',
        'status',
        error,
        { userId: user?.id }
      );
    }
  });
  
  // Função para resetar o status de verificação
  const resetVerificationStatus = () => {
    resetVerificationMutation.mutate();
  };

  // Função para lidar com o upload de arquivo
  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'rg' | 'cpf' | 'selfie'
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Verificar o tipo do arquivo
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast({
        title: 'Tipo de arquivo inválido',
        description: 'Por favor, envie uma imagem (jpg, jpeg, png, gif, webp)',
        variant: 'destructive'
      });
      return;
    }
    
    // Verificar o tamanho do arquivo (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo permitido é 5MB',
        variant: 'destructive'
      });
      return;
    }
    
    // Enviar o arquivo
    if (type === 'rg') {
      uploadRGMutation.mutate(file);
    } else if (type === 'cpf') {
      uploadCPFMutation.mutate(file);
    } else if (type === 'selfie') {
      uploadSelfieMutation.mutate(file);
    }
    
    // Limpar o input
    event.target.value = '';
  };

  // Função para acionar o input de arquivo
  const triggerFileInput = (type: 'rg' | 'cpf' | 'selfie') => {
    if (type === 'rg' && rgFileInputRef.current) {
      rgFileInputRef.current.click();
    } else if (type === 'cpf' && cpfFileInputRef.current) {
      cpfFileInputRef.current.click();
    } else if (type === 'selfie' && selfieFileInputRef.current) {
      selfieFileInputRef.current.click();
    }
  };

  // Calcular o progresso da verificação
  const calculateProgress = (): number => {
    if (!verificationStatus) return 0;
    
    // Tipagem explícita para evitar erros de referência
    const vs = verificationStatus as VerificationStatus;
    
    if (vs.documentVerified) return 100;
    
    let progress = 0;
    if (vs.hasRg) progress += 30;
    if (vs.hasCpf) progress += 30;
    if (vs.hasSelfie) progress += 30;
    
    if (vs.status === 'pending_review') {
      progress += 10; // Adiciona 10% quando está em revisão
    }
    
    return progress;
  };
  
  // Função para resetar o status de verificação para administradores (manter para compatibilidade)
  const resetAdminVerificationStatus = async () => {
    try {
      const response = await apiRequest("POST", "/api/document-verification/admin/reset", {
        userId: user?.id
      });
      
      if (response.ok) {
        toast({
          title: "Status resetado (Admin)",
          description: "Os documentos podem ser enviados novamente",
        });
        
        // Recarregar os dados do status
        queryClient.invalidateQueries({ queryKey: ["/api/document-verification/status"] });
      } else {
        const error = await response.json();
        toast({
          title: "Erro ao resetar",
          description: error.message || "Ocorreu um erro ao resetar o status",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível completar a operação",
        variant: "destructive"
      });
      
      // Registrar erro nos logs
      logDocumentVerificationError(
        'ResetStatus',
        'admin',
        error instanceof Error ? error : new Error('Unknown error'),
        { userId: user?.id }
      );
    }
  };

  // Renderizar o status em texto
  const renderStatusText = (): { text: string; icon: React.ReactNode; color: string } => {
    if (!verificationStatus) {
      return { 
        text: 'Carregando...', 
        icon: <Clock className="h-5 w-5 animate-spin" />,
        color: 'text-gray-500'
      };
    }
    
    // Tipagem explícita para evitar erros de referência
    const vs = verificationStatus as VerificationStatus;
    
    if (vs.documentVerified) {
      return { 
        text: 'Verificação concluída', 
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        color: 'text-green-500'
      };
    }
    
    if (vs.status === 'rejected') {
      return { 
        text: 'Documentos rejeitados', 
        icon: <XCircle className="h-5 w-5 text-destructive" />,
        color: 'text-destructive'
      };
    }
    
    if (vs.status === 'pending_review') {
      return { 
        text: 'Em análise', 
        icon: <Clock className="h-5 w-5 text-amber-500" />,
        color: 'text-amber-500'
      };
    }
    
    // not_submitted ou status inicial
    const count = [
      vs.hasRg,
      vs.hasCpf,
      vs.hasSelfie
    ].filter(Boolean).length;
    
    if (count === 0) {
      return { 
        text: 'Verificação não iniciada', 
        icon: <Info className="h-5 w-5 text-blue-500" />,
        color: 'text-blue-500'
      };
    }
    
    return { 
      text: `Envio em andamento (${count}/3)`, 
      icon: <Upload className="h-5 w-5 text-blue-500" />,
      color: 'text-blue-500'
    };
  };

  // Efeito para mudar para a aba "revisar" quando todos os documentos forem enviados
  useEffect(() => {
    if (verificationStatus?.hasRg && 
        verificationStatus?.hasCpf && 
        verificationStatus?.hasSelfie && 
        !verificationStatus?.documentVerified &&
        verificationStatus?.status !== 'rejected') {
      setActiveTab('review');
    }
  }, [verificationStatus]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50 text-red-800">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro ao carregar verificação</AlertTitle>
        <AlertDescription>
          Ocorreu um erro ao carregar os dados de verificação. Por favor, tente novamente.
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2 ml-2"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const statusInfo = renderStatusText();
  const progress = calculateProgress();

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl">Verificação de Documentos</CardTitle>
            <CardDescription>
              Envie seus documentos para verificar sua identidade
            </CardDescription>
          </div>
          <Badge 
            variant="outline"
            className={`flex items-center gap-1 ${statusInfo.color} ${verificationStatus?.documentVerified ? "bg-green-100 text-green-800" : ""}`}
          >
            {statusInfo.icon}
            {statusInfo.text}
          </Badge>
        </div>
        <Progress value={progress} className="h-2 mt-4" />
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mx-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="upload">Enviar Documentos</TabsTrigger>
          <TabsTrigger value="review">Revisar</TabsTrigger>
        </TabsList>

        {/* Aba de Visão Geral */}
        <TabsContent value="overview" className="space-y-4 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className={`shadow-sm border ${verificationStatus?.hasRg ? 'border-green-200 bg-green-50/10' : 'bg-slate-50/50'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Frente do Documento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  {verificationStatus?.hasRg ? (
                    <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                      <FileCheck className="h-3 w-3 mr-1" />
                      Enviado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      <FileX className="h-3 w-3 mr-1" />
                      Pendente
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className={`shadow-sm border ${verificationStatus?.hasCpf ? 'border-green-200 bg-green-50/10' : 'bg-slate-50/50'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Verso do Documento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  {verificationStatus?.hasCpf ? (
                    <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                      <FileCheck className="h-3 w-3 mr-1" />
                      Enviado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      <FileX className="h-3 w-3 mr-1" />
                      Pendente
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className={`shadow-sm border ${verificationStatus?.hasSelfie ? 'border-green-200 bg-green-50/10' : 'bg-slate-50/50'}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                  <UserSquare2 className="h-5 w-5" />
                  Selfie com Documento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  {verificationStatus?.hasSelfie ? (
                    <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">
                      <FileCheck className="h-3 w-3 mr-1" />
                      Enviado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      <FileX className="h-3 w-3 mr-1" />
                      Pendente
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {verificationStatus?.status === 'rejected' && (
            <div>
              <Alert className="mt-4 border-red-200 bg-red-50 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Verificação rejeitada</AlertTitle>
                <AlertDescription>
                  {verificationStatus.rejectionReason || 'Seus documentos foram rejeitados. Por favor, verifique e envie novamente.'}
                </AlertDescription>
              </Alert>
              
              <Button
                onClick={resetVerificationStatus}
                variant="outline"
                size="sm"
                className="mt-2 w-full border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Resetar e Tentar Novamente
              </Button>
            </div>
          )}

          {verificationStatus?.status === 'pending_review' && (
            <Alert className="mt-4 border-amber-200 text-amber-800 bg-amber-50/50">
              <Clock className="h-4 w-4" />
              <AlertTitle>Verificação em análise</AlertTitle>
              <AlertDescription>
                Seus documentos foram recebidos e estão sendo analisados. Isso pode levar até 24 horas.
              </AlertDescription>
            </Alert>
          )}

          {verificationStatus?.documentVerified && (
            <Alert className="mt-4 border-green-200 text-green-800 bg-green-50/50">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Verificação completa</AlertTitle>
              <AlertDescription>
                Seus documentos foram verificados com sucesso. Agora você tem acesso completo à plataforma.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Aba de Upload */}
        <TabsContent value="upload" className="p-4 space-y-6">
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Enviar Frente do Documento
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tire uma foto nítida da frente do seu documento (RG/CPF), garantindo que todas as informações estejam visíveis.
              </p>
              <div className="flex justify-end">
                <input 
                  ref={rgFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'rg')}
                  className="hidden"
                />
                <Button 
                  onClick={() => triggerFileInput('rg')}
                  disabled={uploading.rg || verificationStatus?.documentVerified}
                  className="w-full md:w-auto"
                >
                  {uploading.rg ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {verificationStatus?.hasRg ? 'Reenviar Frente' : 'Enviar Frente'}
                    </>
                  )}
                </Button>
              </div>
              {verificationStatus?.hasRg && (
                <Badge variant="outline" className="mt-2 bg-green-100 text-green-800">
                  <FileCheck className="h-3 w-3 mr-1" />
                  Frente do documento enviada
                </Badge>
              )}
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Enviar Verso do Documento
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tire uma foto nítida do verso do seu documento (RG/CPF), garantindo que todas as informações estejam visíveis.
              </p>
              <div className="flex justify-end">
                <input 
                  ref={cpfFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'cpf')}
                  className="hidden"
                />
                <Button 
                  onClick={() => triggerFileInput('cpf')}
                  disabled={uploading.cpf || verificationStatus?.documentVerified}
                  className="w-full md:w-auto"
                >
                  {uploading.cpf ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {verificationStatus?.hasCpf ? 'Reenviar Verso' : 'Enviar Verso'}
                    </>
                  )}
                </Button>
              </div>
              {verificationStatus?.hasCpf && (
                <Badge variant="outline" className="mt-2 bg-green-100 text-green-800">
                  <FileCheck className="h-3 w-3 mr-1" />
                  Verso do documento enviado
                </Badge>
              )}
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <UserSquare2 className="h-5 w-5 mr-2" />
                Selfie com Documento
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Tire uma selfie segurando seu RG ou CPF próximo ao rosto. Certifique-se de que seu rosto e o documento estejam claramente visíveis.
              </p>
              <div className="flex justify-end">
                <input 
                  ref={selfieFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'selfie')}
                  className="hidden"
                />
                <Button 
                  onClick={() => triggerFileInput('selfie')}
                  disabled={uploading.selfie || verificationStatus?.documentVerified}
                  className="w-full md:w-auto"
                >
                  {uploading.selfie ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      {verificationStatus?.hasSelfie ? 'Reenviar Selfie' : 'Enviar Selfie'}
                    </>
                  )}
                </Button>
              </div>
              {verificationStatus?.hasSelfie && (
                <Badge variant="outline" className="mt-2 bg-green-100 text-green-800">
                  <FileCheck className="h-3 w-3 mr-1" />
                  Selfie enviada com sucesso
                </Badge>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Aba de Revisão */}
        <TabsContent value="review" className="p-4 space-y-4">
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border shadow-sm">
              <h3 className="text-lg font-medium mb-2 text-gray-800">Status da Verificação</h3>
              <div className="flex items-center gap-2">
                <div className={statusInfo.color}>
                  {statusInfo.icon}
                </div>
                <span className="font-medium text-gray-800">{statusInfo.text}</span>
              </div>
              
              {/* Exibir botão para resetar verificação (admin) ou tentar novamente (em caso de rejeição) */}
              {verificationStatus?.status === 'rejected' && (
                <div className="mt-3">
                  <Button
                    onClick={resetVerificationStatus}
                    variant="outline"
                    size="sm"
                    className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resetar e Tentar Novamente
                  </Button>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    Esta ação permitirá uma nova análise dos documentos
                  </p>
                </div>
              )}
              
              {/* Botão para analisar documentos - aparece quando todos os documentos foram enviados */}
              {verificationStatus?.hasRg && 
               verificationStatus?.hasCpf && 
               verificationStatus?.hasSelfie && 
               verificationStatus?.status !== 'verified' &&
               !verificationStatus?.documentVerified && (
                <div className="mt-4">
                  <Button
                    onClick={() => analyzeDocumentsMutation.mutate()}
                    disabled={analyzeDocumentsMutation.isPending}
                    className="w-full"
                  >
                    {analyzeDocumentsMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Analisando documentos...
                      </>
                    ) : (
                      <>
                        <FileCheck className="h-4 w-4 mr-2" />
                        {verificationStatus?.status === 'pending_review' ? 'Analisar Novamente' : 'Analisar Documentos'}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    {verificationStatus?.status === 'pending_review' 
                      ? 'Seus documentos já estão em análise, mas você pode iniciar uma nova verificação automática se preferir.'
                      : 'A análise automática verificará seus documentos. Se tudo estiver correto, sua verificação será aprovada.'}
                  </p>
                </div>
              )}
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-800">Frente do documento:</span>
                  <span className="font-medium">
                    {verificationStatus?.hasRg ? (
                      <span className="text-green-600 flex items-center">
                        <FileCheck className="h-4 w-4 mr-1" />
                        Enviado
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center">
                        <FileX className="h-4 w-4 mr-1" />
                        Pendente
                      </span>
                    )}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-800">Verso do documento:</span>
                  <span className="font-medium">
                    {verificationStatus?.hasCpf ? (
                      <span className="text-green-600 flex items-center">
                        <FileCheck className="h-4 w-4 mr-1" />
                        Enviado
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center">
                        <FileX className="h-4 w-4 mr-1" />
                        Pendente
                      </span>
                    )}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-800">Selfie com Documento:</span>
                  <span className="font-medium">
                    {verificationStatus?.hasSelfie ? (
                      <span className="text-green-600 flex items-center">
                        <FileCheck className="h-4 w-4 mr-1" />
                        Enviado
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center">
                        <FileX className="h-4 w-4 mr-1" />
                        Pendente
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {verificationStatus?.status === 'rejected' && (
              <Alert className="border-red-200 bg-red-50 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Verificação rejeitada</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p className="font-medium">
                    {verificationStatus.rejectionReason || 'Seus documentos foram rejeitados. Por favor, verifique e envie novamente.'}
                  </p>
                  
                  <div className="bg-white/20 p-3 rounded-md border border-red-300 text-sm">
                    <h4 className="font-semibold mb-2">O que fazer agora:</h4>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Envie novamente o documento que apresentou problema</li>
                      <li>Certifique-se que a imagem está nítida e bem iluminada</li>
                      <li>Verifique se todas as informações estão visíveis e legíveis</li>
                      <li>Evite reflexos, sombras ou dedos cobrindo partes importantes</li>
                      <li>Após enviar novamente, clique em "Analisar Documentos"</li>
                    </ol>
                  </div>
                  
                  <p className="text-xs italic mt-2">
                    Dica: Caso o problema persista, você pode entrar em contato com o suporte em 
                    bacoexperiencias@gmail.com para obter assistência.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {verificationStatus?.status === 'pending_review' && (
              <Alert className="border-amber-200 text-amber-800 bg-amber-50/50">
                <Clock className="h-4 w-4" />
                <AlertTitle>Em análise</AlertTitle>
                <AlertDescription>
                  Seus documentos estão sendo analisados por nossa equipe. Isso pode levar até 24 horas.
                </AlertDescription>
              </Alert>
            )}

            {verificationStatus?.documentVerified && (
              <Alert className="border-green-200 text-green-800 bg-green-50/50">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Verificação concluída</AlertTitle>
                <AlertDescription>
                  Seus documentos foram verificados com sucesso. Agora você tem acesso completo à plataforma.
                </AlertDescription>
              </Alert>
            )}

            {!verificationStatus?.hasSelfie || 
             !verificationStatus?.hasRg || 
             !verificationStatus?.hasCpf ? (
              <Alert className="border text-foreground bg-background">
                <Info className="h-4 w-4 text-blue-500" />
                <AlertTitle className="font-semibold text-black">Documentos pendentes</AlertTitle>
                <AlertDescription className="text-gray-800">
                  Você ainda precisa enviar todos os documentos necessários para a verificação.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>

      <CardFooter className="flex justify-between pt-4 pb-2">
        <p className="text-xs text-muted-foreground">
          Suas informações são criptografadas e protegidas de acordo com nossa política de privacidade.
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          className="ml-auto"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </CardFooter>
    </Card>
  );
}