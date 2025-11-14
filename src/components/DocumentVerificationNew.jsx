/**
 * ========================================
 * VERIFICAÇÃO DE DOCUMENTOS - NOVO FLUXO
 * ========================================
 * 
 * Desktop: Apenas QR Code (não permite upload de arquivos do HD)
 * Mobile: Fotos diretas (frente, verso, selfie)
 * Verificação automática de CPF via OCR
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  X, 
  Smartphone,
  Monitor,
  QrCode,
  Shield,
  FileText,
  User,
  CheckCircle,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Label } from '@/features/shared/components/ui/label';
import { toast } from '@/features/shared/components/ui/use-toast';
import QRCode from 'qrcode';

const DocumentVerificationNew = ({ userId, onComplete, onCancel }) => {
  // Estados principais
  const [currentStep, setCurrentStep] = useState('device-check');
  const [cpf, setCpf] = useState('');
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [sessionId, setSessionId] = useState('');

  // Detectar tipo de dispositivo
  useEffect(() => {
    const checkDevice = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      setIsMobile(isMobileDevice);
      setIsDesktop(!isMobileDevice);
      
      // Definir fluxo baseado no dispositivo
      if (isMobileDevice) {
        // Mobile: redirecionar para página específica
        setCurrentStep('mobile-redirect');
      } else {
        // Desktop: solicitar CPF e mostrar QR Code
        setCurrentStep('cpf-desktop');
      }
    };

    checkDevice();
    
    // Gerar session ID único
    setSessionId(`verification_${Date.now()}_${Math.random().toString(36).substring(2)}`);
  }, []);

  // Gerar QR Code
  useEffect(() => {
    if (isDesktop && currentStep === 'qr-code') {
      generateMobileQRCode();
    }
  }, [currentStep, sessionId]);

  const generateMobileQRCode = async () => {
    try {
      // ✅ FIX: Usar URL de produção em ambiente de produção
      const getBaseUrl = () => {
        // Se tem VITE_SITE_URL definida, usar ela (produção)
        if (import.meta.env.VITE_SITE_URL) {
          return import.meta.env.VITE_SITE_URL;
        }
        // Senão, usar window.location.origin (desenvolvimento)
        return window.location.origin;
      };

      const baseUrl = getBaseUrl();
      const mobileUrl = `${baseUrl}/verify-mobile?userId=${userId}&sessionId=${sessionId}&cpf=${encodeURIComponent(cpf)}`;
      
      console.log('📱 QR Code URL gerada:', mobileUrl);
      
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

  // Formatar CPF
  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, '').substring(0, 11);
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  // Validar CPF
  const validateCPF = (cpfValue) => {
    const numbers = cpfValue.replace(/\D/g, '');
    
    if (numbers.length !== 11) {
      toast({
        variant: "destructive",
        title: "CPF inválido",
        description: "CPF deve ter 11 dígitos.",
      });
      return false;
    }

    if (/^(\d)\1+$/.test(numbers)) {
      toast({
        variant: "destructive",
        title: "CPF inválido", 
        description: "Por favor, digite um CPF válido.",
      });
      return false;
    }

    // Validação dos dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(numbers[i]) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(numbers[9])) {
      toast({
        variant: "destructive",
        title: "CPF inválido",
        description: "Por favor, digite um CPF válido.",
      });
      return false;
    }

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(numbers[i]) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(numbers[10])) {
      toast({
        variant: "destructive",
        title: "CPF inválido",
        description: "Por favor, digite um CPF válido.",
      });
      return false;
    }

    return true;
  };

  // Avançar para QR Code
  const handleDesktopNext = () => {
    if (validateCPF(cpf)) {
      setCurrentStep('qr-code');
    }
  };

  // Redirecionar para mobile
  const redirectToMobile = () => {
    // Para mobile, ir direto para a verificação sem redirecionamento
    // Fechar o modal atual e iniciar processo mobile inline
    console.log('📱 Iniciando verificação mobile inline');
    setCurrentStep('cpf-mobile');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gradient-to-br from-gray-900 via-black to-purple-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8" />
              <div>
                <h2 className="text-xl font-bold">Verificação de Identidade</h2>
                <p className="text-blue-100 text-sm">
                  {isMobile ? 'Complete a verificação no seu celular' : 'Use seu celular para fotografar os documentos'}
                </p>
              </div>
            </div>
            <Button
              onClick={onCancel}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Mobile: Redirecionar */}
            {currentStep === 'mobile-redirect' && (
              <motion.div
                key="mobile-redirect"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-6"
              >
                <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Smartphone className="w-10 h-10 text-blue-400" />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Acesso via Mobile Detectado
                  </h3>
                  <p className="text-white/60">
                    Você será redirecionado para a página de verificação otimizada para celular.
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button 
                    onClick={redirectToMobile}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Continuar no Mobile
                  </Button>
                  <Button 
                    onClick={onCancel}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Mobile: Solicitar CPF */}
            {currentStep === 'cpf-mobile' && (
              <motion.div
                key="cpf-mobile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="w-10 h-10 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    Verificação Mobile
                  </h3>
                  <p className="text-white/60">
                    Insira seu CPF para começar a verificação. Você irá fotografar seus documentos usando a câmera do celular.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cpf-mobile" className="text-sm font-medium text-white">
                      CPF
                    </Label>
                    <Input
                      id="cpf-mobile"
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      className="mt-1"
                      maxLength={14}
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Camera className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          Próximos passos:
                        </p>
                        <ol className="text-xs text-blue-700 mt-1 space-y-1">
                          <li>1. Fotografar frente do documento</li>
                          <li>2. Fotografar verso do documento</li>
                          <li>3. Tirar selfie para confirmação</li>
                          <li>4. Verificação automática</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button 
                      onClick={onCancel}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => {
                        if (validateCPF(cpf)) {
                          // Redirecionar para página mobile com CPF
                          const getBaseUrl = () => {
                            if (import.meta.env.VITE_SITE_URL) {
                              return import.meta.env.VITE_SITE_URL;
                            }
                            return window.location.origin;
                          };
                          const baseUrl = getBaseUrl();
                          const mobileUrl = `${baseUrl}/verify-mobile?userId=${userId}&sessionId=${sessionId}&cpf=${encodeURIComponent(cpf)}`;
                          console.log('📱 Redirecionando para mobile com CPF:', mobileUrl);
                          window.location.href = mobileUrl;
                        }
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      disabled={cpf.replace(/\D/g, '').length !== 11}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Iniciar Fotos
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Desktop: Solicitar CPF */}
            {currentStep === 'cpf-desktop' && (
              <motion.div
                key="cpf-desktop"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Monitor className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Verificação via Desktop
                  </h3>
                  <p className="text-gray-600">
                    Insira seu CPF para gerar o QR Code e complete a verificação usando seu celular.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        Por que não posso enviar arquivos do computador?
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Para garantir a autenticidade, as fotos dos documentos devem ser tiradas em tempo real usando a câmera do celular.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cpf" className="text-sm font-medium text-white">
                      CPF
                    </Label>
                    <Input
                      id="cpf"
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      className="mt-1"
                      maxLength={14}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Esse CPF será verificado automaticamente com o documento fotografado
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <Button 
                      onClick={onCancel}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleDesktopNext}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      disabled={cpf.replace(/\D/g, '').length !== 11}
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      Gerar QR Code
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Desktop: QR Code */}
            {currentStep === 'qr-code' && (
              <motion.div
                key="qr-code"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-6"
              >
                <div>
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <QrCode className="w-10 h-10 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Escaneie com seu Celular
                  </h3>
                  <p className="text-gray-600">
                    Use a câmera do seu celular para escanear o QR Code e completar a verificação.
                  </p>
                </div>

                {/* QR Code */}
                {qrCodeUrl && (
                  <div className="flex justify-center">
                    <div className="p-4 bg-white border-2 border-gray-200 rounded-xl shadow-lg">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code para verificação mobile"
                        className="w-64 h-64"
                      />
                    </div>
                  </div>
                )}

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-green-800">
                        Processo de verificação:
                      </p>
                      <ol className="text-xs text-green-700 mt-1 space-y-1">
                        <li>1. Escaneie o QR Code com seu celular</li>
                        <li>2. Fotografe a frente do documento (RG ou CNH)</li>
                        <li>3. Fotografe o verso do documento</li>
                        <li>4. Tire uma selfie para confirmação</li>
                        <li>5. Aguarde a verificação automática do CPF</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    onClick={() => setCurrentStep('cpf-desktop')}
                    variant="outline"
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button 
                    onClick={generateMobileQRCode}
                    variant="outline"
                    className="flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Gerar Novo QR
                  </Button>
                </div>

                <p className="text-xs text-white/40">
                  Mantenha esta página aberta até completar a verificação no celular
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

DocumentVerificationNew.propTypes = {
  userId: PropTypes.string.isRequired,
  onComplete: PropTypes.func,
  onCancel: PropTypes.func,
};

export default DocumentVerificationNew;