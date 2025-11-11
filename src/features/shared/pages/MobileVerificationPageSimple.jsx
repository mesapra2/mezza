/**
 * ========================================
 * PÁGINA DE VERIFICAÇÃO MOBILE - SIMPLIFICADA
 * ========================================
 * 
 * Versão simplificada temporária para resolver erro crítico
 */

import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Camera, 
  X,
  User,
  CreditCard,
  FileText,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Configurar Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const MobileVerificationPageSimple = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get('userId');
  const sessionId = searchParams.get('sessionId');
  
  // Estados principais
  const [currentStep, setCurrentStep] = useState('cpf');
  const [cpf, setCpf] = useState('');
  const [photos, setPhotos] = useState({
    documentFront: null,
    documentBack: null,
    selfie: null
  });
  const [processing, setProcessing] = useState(false);
  
  // Refs para câmera
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Verificar se parâmetros estão presentes
  useEffect(() => {
    if (!userId || !sessionId) {
      console.error('Parâmetros ausentes:', { userId, sessionId });
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    }
  }, [userId, sessionId]);

  // Formatar CPF
  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, '').substring(0, 11);
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Validar CPF básico
  const validateCPF = (cpfValue) => {
    const numbers = cpfValue.replace(/\D/g, '');
    return numbers.length === 11 && !/^(\d)\1+$/.test(numbers);
  };

  // Avançar para próximo passo
  const handleNextStep = () => {
    switch (currentStep) {
      case 'cpf':
        if (validateCPF(cpf)) {
          setCurrentStep('document-front');
          setTimeout(() => startCamera(), 500);
        }
        break;
      case 'document-front':
        setCurrentStep('document-back');
        setTimeout(() => startCamera(), 500);
        break;
      case 'document-back':
        setCurrentStep('selfie');
        setTimeout(() => startCamera(), 500);
        break;
      case 'selfie':
        setCurrentStep('processing');
        processDocuments();
        break;
    }
  };

  // Inicializar câmera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: currentStep === 'selfie' ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error('Erro ao acessar câmera:', error);
      alert('Não foi possível acessar a câmera');
    }
  };

  // Parar câmera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Tirar foto
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      const file = new File([blob], `${currentStep}-${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      setPhotos(prev => ({
        ...prev,
        [currentStep === 'document-front' ? 'documentFront' : 
         currentStep === 'document-back' ? 'documentBack' : 'selfie']: file
      }));

      stopCamera();
      handleNextStep();
    }, 'image/jpeg', 0.8);
  };

  // Processar documentos com Google Vision
  const processDocuments = async () => {
    setProcessing(true);
    
    try {
      console.log('🔄 Iniciando processamento de documentos...');
      
      // 1. Fazer upload das imagens para Supabase Storage
      const documentFrontUrl = await uploadPhoto(photos.documentFront, 'document-front');
      const documentBackUrl = await uploadPhoto(photos.documentBack, 'document-back');
      const selfieUrl = await uploadPhoto(photos.selfie, 'selfie');

      console.log('📤 Fotos enviadas:', {
        documentFrontUrl,
        documentBackUrl,
        selfieUrl
      });

      // 2. Chamar API de verificação
      const response = await fetch('/api/verify-cpf-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          cpfInformado: cpf.replace(/\D/g, ''),
          documentFrontUrl,
          documentBackUrl,
          selfieUrl
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ Verificação aprovada:', result);
        setCurrentStep('success');
        setTimeout(() => {
          window.location.href = '/?verified=true';
        }, 3000);
      } else {
        console.error('❌ Verificação rejeitada:', result);
        setCurrentStep('error');
      }

    } catch (error) {
      console.error('💥 Erro no processamento:', error);
      setCurrentStep('error');
    } finally {
      setProcessing(false);
    }
  };

  // Fazer upload de uma foto para o Supabase Storage
  const uploadPhoto = async (photoFile, photoType) => {
    if (!photoFile) throw new Error(`Foto ${photoType} não encontrada`);

    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${userId}-${sessionId}-${photoType}-${Date.now()}.${fileExt}`;
    const filePath = `verifications/${fileName}`;

    // Upload para o bucket de verificações
    const { data, error } = await supabase.storage
      .from('user-verifications')
      .upload(filePath, photoFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Erro no upload:', error);
      throw new Error(`Erro ao enviar ${photoType}: ${error.message}`);
    }

    // Retornar URL pública
    const { data: urlData } = supabase.storage
      .from('user-verifications')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  // Cleanup
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!userId || !sessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <X className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold mb-2">Link Inválido</h1>
          <p>Este link de verificação não é válido.</p>
          <p className="mt-2 text-sm opacity-80">Redirecionando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center text-white mb-8 mt-8">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Verificação de Identidade</h1>
          <p className="text-sm opacity-80">Complete a verificação pelo seu celular</p>
        </div>

        {/* Conteúdo */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
          {/* Passo 1: CPF */}
          {currentStep === 'cpf' && (
            <div>
              <div className="text-center text-white mb-6">
                <User className="w-12 h-12 mx-auto mb-3 text-blue-300" />
                <h2 className="text-xl font-bold mb-2">Informe seu CPF</h2>
                <p className="text-sm opacity-80">Digite o CPF que será verificado no documento</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-1">CPF</label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full p-3 bg-white/10 border border-white/20 text-white placeholder:text-white/60 rounded-lg"
                    maxLength={14}
                  />
                </div>

                <button
                  onClick={handleNextStep}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  disabled={cpf.replace(/\D/g, '').length !== 11}
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Passos de foto */}
          {['document-front', 'document-back', 'selfie'].includes(currentStep) && (
            <div>
              <div className="text-center text-white mb-6">
                {currentStep === 'document-front' && (
                  <>
                    <CreditCard className="w-12 h-12 mx-auto mb-3 text-green-300" />
                    <h2 className="text-xl font-bold mb-2">Documento - Frente</h2>
                    <p className="text-sm opacity-80">Fotografe a frente do seu documento (RG ou CNH)</p>
                  </>
                )}
                {currentStep === 'document-back' && (
                  <>
                    <CreditCard className="w-12 h-12 mx-auto mb-3 text-orange-300" />
                    <h2 className="text-xl font-bold mb-2">Documento - Verso</h2>
                    <p className="text-sm opacity-80">Fotografe o verso do seu documento</p>
                  </>
                )}
                {currentStep === 'selfie' && (
                  <>
                    <User className="w-12 h-12 mx-auto mb-3 text-purple-300" />
                    <h2 className="text-xl font-bold mb-2">Selfie</h2>
                    <p className="text-sm opacity-80">Tire uma selfie para confirmar sua identidade</p>
                  </>
                )}
              </div>

              {/* Câmera */}
              <div className="relative mb-6">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-lg bg-black"
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>

              {/* Controles */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    stopCamera();
                    setCurrentStep('cpf');
                  }}
                  className="flex-1 py-3 px-4 border border-white/20 text-white hover:bg-white/10 rounded-lg font-medium transition-colors"
                >
                  <X className="w-4 h-4 inline mr-2" />
                  Voltar
                </button>
                <button
                  onClick={takePhoto}
                  className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Camera className="w-4 h-4 inline mr-2" />
                  Fotografar
                </button>
              </div>
            </div>
          )}

          {/* Processando */}
          {currentStep === 'processing' && (
            <div className="text-center text-white">
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-blue-300 animate-spin" />
              <h2 className="text-xl font-bold mb-2">Verificando documentos...</h2>
              <p className="text-sm opacity-80">
                Aguarde enquanto verificamos se o CPF corresponde ao documento apresentado.
              </p>
            </div>
          )}

          {/* Sucesso */}
          {currentStep === 'success' && (
            <div className="text-center text-white">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
              <h2 className="text-xl font-bold mb-2">Verificação Aprovada!</h2>
              <p className="text-sm opacity-80 mb-4">
                Sua identidade foi verificada com sucesso. O CPF corresponde ao documento apresentado.
              </p>
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                <p className="text-sm text-green-300">
                  ✅ Agora você pode acessar recursos Premium!
                </p>
              </div>
              <p className="text-xs opacity-60 mt-4">Redirecionando...</p>
            </div>
          )}

          {/* Erro */}
          {currentStep === 'error' && (
            <div className="text-center text-white">
              <XCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
              <h2 className="text-xl font-bold mb-2">Verificação Rejeitada</h2>
              <p className="text-sm opacity-80 mb-4">
                Não foi possível verificar sua identidade. Possíveis motivos:
              </p>
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
                <ul className="text-sm text-red-300 text-left space-y-1">
                  <li>• CPF não corresponde ao documento</li>
                  <li>• Documento ilegível ou borrado</li>
                  <li>• Selfie não corresponde ao documento</li>
                </ul>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setCurrentStep('cpf');
                    setPhotos({ documentFront: null, documentBack: null, selfie: null });
                  }}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Tentar Novamente
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex-1 py-3 px-4 border border-white/20 text-white hover:bg-white/10 rounded-lg font-medium transition-colors"
                >
                  Voltar ao Início
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileVerificationPageSimple;