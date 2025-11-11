/**
 * ========================================
 * VERIFICAÇÃO DE DOCUMENTOS
 * ========================================
 * 
 * Componente para verificação de identidade com upload de documentos
 * Suporta desktop (QR Code) e mobile (câmera direta)
 */

import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Upload, 
  Check, 
  X, 
  RotateCcw, 
  Smartphone,
  Monitor,
  QrCode,
  Shield,
  AlertTriangle,
  FileText,
  User
} from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Label } from '@/features/shared/components/ui/label';
import { toast } from '@/features/shared/components/ui/use-toast';
import QRCode from 'qrcode';

const DocumentVerification = ({ userId, onComplete, onCancel }) => {
  // Estados principais
  const [currentStep, setCurrentStep] = useState('device-check'); // device-check, cpf-desktop, qr-code, mobile-flow
  const [cpf, setCpf] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Refs
  const fileInputRefs = {
    front: useRef(null),
    back: useRef(null),
    selfie: useRef(null)
  };

  // Detectar tipo de dispositivo e definir fluxo
  useEffect(() => {
    const checkDevice = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isDesktopDevice = !isMobileDevice;
      
      setIsMobile(isMobileDevice);
      setIsDesktop(isDesktopDevice);
      
      // Definir fluxo baseado no dispositivo
      if (isMobileDevice) {
        // Mobile: vai direto para o fluxo de fotos
        setCurrentStep('mobile-flow');
      } else {
        // Desktop: mostra opção de inserir CPF e gerar QR Code
        setCurrentStep('cpf-desktop');
      }
    };

    checkDevice();
    
    // Gerar session ID único para esta verificação
    setSessionId(`verification_${Date.now()}_${Math.random().toString(36).substring(2)}`);
  }, []);

  // Gerar QR Code quando necessário
  useEffect(() => {
    if (isDesktop && currentStep === 'qr-code') {
      generateMobileQRCode();
    }
  }, [isDesktop, currentStep, sessionId]);

  const generateMobileQRCode = async () => {
    try {
      const mobileUrl = `${window.location.origin}/verify-mobile?userId=${userId}&sessionId=${sessionId}`;
      const qrDataURL = await QRCode.toDataURL(mobileUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#1f2937',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrDataURL);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível gerar o QR Code. Tente novamente.",
      });
    }
  };

  // Avançar para o QR Code (Desktop)
  const handleDesktopNext = () => {
    if (validateCPF(cpf)) {
      setCurrentStep('qr-code');
    }
  };

  // Redirecionar para mobile se acessado pelo celular
  const redirectToMobile = () => {
    const mobileUrl = `/verify-mobile?userId=${userId}&sessionId=${sessionId}`;
    window.location.href = mobileUrl;
  };

  // Validar e formatar CPF
  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const validateCPF = (cpf) => {
    const numbers = cpf.replace(/\D/g, '');
    
    if (numbers.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(numbers)) return false;
    
    // Validação algoritmo CPF
    let sum = 0;
    let remainder;
    
    for (let i = 1; i <= 9; i++) {
      sum = sum + parseInt(numbers.substring(i-1, i)) * (11 - i);
    }
    
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(numbers.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum = sum + parseInt(numbers.substring(i-1, i)) * (12 - i);
    }
    
    remainder = (sum * 10) % 11;
    if ((remainder === 10) || (remainder === 11)) remainder = 0;
    if (remainder !== parseInt(numbers.substring(10, 11))) return false;
    
    return true;
  };

  const handleCPFChange = (e) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
    
    if (formatted.length === 14) {
      if (validateCPF(formatted)) {
        setErrors(prev => ({ ...prev, cpf: null }));
      } else {
        setErrors(prev => ({ ...prev, cpf: 'CPF inválido' }));
      }
    }
  };

  const handleFileSelect = (type, file) => {
    if (!file) return;
    
    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Arquivo inválido",
        description: "Por favor, selecione apenas imagens (JPG, PNG).",
      });
      return;
    }
    
    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 5MB.",
      });
      return;
    }
    
    setDocuments(prev => ({ ...prev, [type]: file }));
    
    // Gerar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviews(prev => ({ ...prev, [type]: e.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (type) => {
    setDocuments(prev => ({ ...prev, [type]: null }));
    setPreviews(prev => ({ ...prev, [type]: null }));
    if (fileInputRefs[type].current) {
      fileInputRefs[type].current.value = '';
    }
  };

  const submitVerification = async () => {
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('cpf', cpf.replace(/\D/g, ''));
      formData.append('documentFront', documents.front);
      formData.append('documentBack', documents.back);
      formData.append('selfie', documents.selfie);
      
      const response = await fetch('/api/submit-verification', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Verificação enviada!",
          description: "Seus documentos estão em análise. Você será notificado do resultado.",
        });
        onComplete?.(result);
      } else {
        throw new Error(result.error || 'Erro ao enviar verificação');
      }
      
    } catch (error) {
      console.error('Erro ao enviar verificação:', error);
      toast({
        variant: "destructive",
        title: "Erro no envio",
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const DocumentUploadCard = ({ type, title, description, icon: Icon, required = true }) => {
    const hasFile = documents[type];
    const preview = previews[type];
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          relative border-2 border-dashed rounded-xl p-6 transition-all
          ${hasFile 
            ? 'border-green-500/50 bg-green-500/10' 
            : 'border-white/20 hover:border-white/40 bg-white/5'
          }
        `}
      >
        {preview ? (
          <div className="relative">
            <img 
              src={preview} 
              alt={title}
              className="w-full h-48 object-cover rounded-lg"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-black/50 border-white/20"
                onClick={() => fileInputRefs[type].current?.click()}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="bg-red-500/80"
                onClick={() => handleRemoveFile(type)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="absolute bottom-2 left-2">
              <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                <Check className="w-3 h-3" />
                Carregado
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <Icon className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <h3 className="text-white font-medium mb-2">{title}</h3>
            <p className="text-white/60 text-sm mb-4">{description}</p>
            
            {isDesktop ? (
              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={() => fileInputRefs[type].current?.click()}
                  className="w-full glass-effect border-white/20"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Escolher Arquivo
                </Button>
                <p className="text-xs text-white/40">
                  Ou use seu celular via QR Code abaixo
                </p>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => fileInputRefs[type].current?.click()}
                className="w-full glass-effect border-white/20"
              >
                <Camera className="w-4 h-4 mr-2" />
                Tirar Foto
              </Button>
            )}
          </div>
        )}
        
        <input
          ref={fileInputRefs[type]}
          type="file"
          accept="image/*"
          capture={!isDesktop ? "environment" : undefined}
          className="hidden"
          onChange={(e) => handleFileSelect(type, e.target.files[0])}
        />
      </motion.div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'cpf':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <Shield className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Verificação de Identidade</h2>
              <p className="text-white/60">
                Para sua segurança e dos outros usuários, precisamos verificar sua identidade
              </p>
            </div>
            
            <div>
              <Label htmlFor="cpf" className="text-white mb-2 block">
                CPF *
              </Label>
              <Input
                id="cpf"
                value={cpf}
                onChange={handleCPFChange}
                className="glass-effect border-white/10 text-white"
                placeholder="000.000.000-00"
                maxLength="14"
              />
              {errors.cpf && (
                <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  {errors.cpf}
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1 glass-effect border-white/20"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => setCurrentStep('documents')}
                disabled={!validateCPF(cpf)}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700"
              >
                Continuar
              </Button>
            </div>
          </motion.div>
        );

      case 'documents':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <FileText className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Documentos</h2>
              <p className="text-white/60">
                Fotografe ou envie as imagens do seu documento de identidade
              </p>
            </div>

            {/* QR Code para Desktop */}
            {isDesktop && qrCodeUrl && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 rounded-xl p-6 text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Smartphone className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-medium">Use seu celular</span>
                </div>
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code"
                  className="mx-auto mb-4 rounded-lg"
                />
                <p className="text-white/60 text-sm">
                  Escaneie com a câmera do celular para tirar as fotos
                </p>
              </motion.div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DocumentUploadCard
                type="front"
                title="Documento - Frente"
                description="RG, CNH ou passaporte (lado da frente)"
                icon={FileText}
              />
              
              <DocumentUploadCard
                type="back"
                title="Documento - Verso"
                description="Verso do documento com assinatura"
                icon={FileText}
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('cpf')}
                className="flex-1 glass-effect border-white/20"
              >
                Voltar
              </Button>
              <Button
                onClick={() => setCurrentStep('selfie')}
                disabled={!documents.front || !documents.back}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700"
              >
                Continuar
              </Button>
            </div>
          </motion.div>
        );

      case 'selfie':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <User className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Selfie</h2>
              <p className="text-white/60">
                Tire uma selfie clara mostrando seu rosto para confirmar sua identidade
              </p>
            </div>
            
            <DocumentUploadCard
              type="selfie"
              title="Sua Selfie"
              description="Foto clara do seu rosto, bem iluminada"
              icon={User}
            />
            
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="text-yellow-400 font-medium mb-1">Dicas para uma boa selfie</h4>
                  <ul className="text-yellow-300/80 text-sm space-y-1">
                    <li>• Certifique-se de que seu rosto esteja bem iluminado</li>
                    <li>• Remova óculos de sol ou acessórios que cubram o rosto</li>
                    <li>• Mantenha uma expressão neutra</li>
                    <li>• Enquadre apenas o rosto e ombros</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('documents')}
                className="flex-1 glass-effect border-white/20"
              >
                Voltar
              </Button>
              <Button
                onClick={() => setCurrentStep('review')}
                disabled={!documents.selfie}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700"
              >
                Continuar
              </Button>
            </div>
          </motion.div>
        );

      case 'review':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Revisão Final</h2>
              <p className="text-white/60">
                Verifique se todos os documentos estão corretos antes de enviar
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-white">CPF:</span>
                  <span className="text-white/80">{cpf}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(previews).map(([type, preview]) => (
                  preview && (
                    <div key={type} className="space-y-2">
                      <img 
                        src={preview} 
                        alt={type}
                        className="w-full h-32 object-cover rounded-lg border border-white/10"
                      />
                      <p className="text-white/60 text-xs text-center">
                        {type === 'front' && 'Documento - Frente'}
                        {type === 'back' && 'Documento - Verso'}
                        {type === 'selfie' && 'Selfie'}
                      </p>
                    </div>
                  )
                ))}
              </div>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h4 className="text-blue-400 font-medium mb-2">O que acontece agora?</h4>
              <p className="text-blue-300/80 text-sm">
                Seus documentos serão analisados por nossa equipe de segurança. 
                O processo pode levar até 24 horas. Você receberá uma notificação 
                quando a verificação for concluída.
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('selfie')}
                disabled={uploading}
                className="flex-1 glass-effect border-white/20"
              >
                Voltar
              </Button>
              <Button
                onClick={submitVerification}
                disabled={uploading}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700"
              >
                {uploading ? 'Enviando...' : 'Enviar Verificação'}
              </Button>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gradient-to-br from-[#1a112e] to-[#2e112a] rounded-2xl border border-white/20 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {['cpf', 'documents', 'selfie', 'review'].map((step, index) => (
                <div
                  key={step}
                  className={`w-4 h-4 rounded-full ${
                    currentStep === step 
                      ? 'bg-blue-500' 
                      : ['cpf', 'documents', 'selfie', 'review'].indexOf(currentStep) > index
                        ? 'bg-green-500'
                        : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                initial={{ width: '25%' }}
                animate={{ 
                  width: 
                    currentStep === 'cpf' ? '25%' :
                    currentStep === 'documents' ? '50%' :
                    currentStep === 'selfie' ? '75%' : '100%'
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

DocumentVerification.propTypes = {
  userId: PropTypes.string.isRequired,
  onComplete: PropTypes.func,
  onCancel: PropTypes.func,
};

export default DocumentVerification;