// src/features/shared/components/auth/PhoneVerification.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { Smartphone, ArrowLeft } from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { useToast } from '@/features/shared/components/ui/use-toast';
import * as authService from '@/services/authService'; // <-- CORREÇÃO AQUI

const PhoneVerification = ({ userId, phone, onVerified, onBack = () => window.history.back() }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const { toast } = useToast();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleCodeChange = (index, value) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Move para o próximo input automaticamente
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const newCode = [...code];
    
    for (let i = 0; i < pastedData.length; i++) {
      if (i < 6) {
        newCode[i] = pastedData[i];
      }
    }
    
    setCode(newCode);
    
    // Foca no próximo input vazio ou no último
    const nextEmptyIndex = newCode.findIndex(c => !c);
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
    const input = document.getElementById(`code-${focusIndex}`);
    if (input) input.focus();
  };

  const handleVerify = async () => {
    const verificationCode = code.join('');
    
    if (verificationCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Código incompleto",
        description: "Por favor, digite o código de 6 dígitos.",
      });
      return;
    }

    setIsLoading(true);
    try {
      await authService.verifyPhone({ userId, code: verificationCode });
      toast({
        title: "Telefone verificado!",
        description: "Seu cadastro foi concluído com sucesso.",
      });
      onVerified();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Código inválido",
        description: error.message || "Tente novamente.",
      });
      setCode(['', '', '', '', '', '']);
      document.getElementById('code-0')?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setIsLoading(true);
    try {
      // O teste que você enviou mostra que seu serviço usa "resendVerificationCode"
      // Se essa função não existir, mude para "authService.resendCode"
      await authService.resendVerificationCode({ userId, phone });
      toast({
        title: "Código reenviado",
        description: "Um novo código foi enviado para seu telefone.",
      });
      setCanResend(false);
      setCountdown(60);
      setCode(['', '', '', '', '', '']);
      document.getElementById('code-0')?.focus();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao reenviar",
        description: error.message || "Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhone = (phoneNumber) => {
    if (!phoneNumber) return '';
    
    // Remove tudo que não é número
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Formata (55) 99999-9999
    if (cleaned.length === 13) {
      return `(${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phoneNumber;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full"
    >
      <div className="glass-effect rounded-2xl p-8 border border-white/10">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={onBack || (() => window.history.back())}
            className="text-white/60 hover:text-white transition-colors"
            disabled={isLoading}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Ícone */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold text-center mb-2 gradient-text">
          Verificação de Telefone
        </h1>
        <p className="text-center text-white/60 mb-2">
          Digite o código de 6 dígitos enviado para
        </p>
        <p className="text-center text-purple-400 font-semibold mb-8">
          {formatPhone(phone)}
        </p>

        {/* Input do código */}
        <div className="space-y-6">
          <div className="flex justify-center gap-2 mb-8">
            {code.map((digit, index) => (
              <Input
                key={index}
                id={`code-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className="w-12 h-14 text-center text-2xl font-bold glass-effect border-white/10"
                disabled={isLoading}
              />
            ))}
          </div>

          <Button
            onClick={handleVerify}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-12 text-base font-semibold"
            disabled={isLoading || code.some(c => !c)}
          >
            {isLoading ? 'Verificando...' : 'Verificar'}
          </Button>

          {/* Reenviar código */}
          <div className="text-center">
            {canResend ? (
              <button
                onClick={handleResend}
                className="text-purple-400 hover:text-purple-300 font-semibold text-sm"
                disabled={isLoading}
              >
                Reenviar código
              </button>
            ) : (
              <p className="text-white/60 text-sm">
                Reenviar código em {countdown}s
              </p>
            )}
          </div>

          {/* Informação adicional */}
          <div className="mt-6 p-4 rounded-lg bg-white/5 border border-white/10">
            <p className="text-white/60 text-sm text-center">
              Não recebeu o código? Verifique se o número está correto ou tente reenviar.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

PhoneVerification.propTypes = {
  userId: PropTypes.string.isRequired,
  phone: PropTypes.string.isRequired,
  onVerified: PropTypes.func.isRequired,
  onBack: PropTypes.func, // ✅ Agora é opcional
};

// ✅ Valores padrão definidos como parâmetros JS (sem defaultProps)

export default PhoneVerification;