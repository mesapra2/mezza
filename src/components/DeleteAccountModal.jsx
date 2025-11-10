// src/components/DeleteAccountModal.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Trash2, AlertTriangle, Mail, Shield, Check, X } from 'lucide-react';
import { Input } from '@/features/shared/components/ui/input';
import { Button } from '@/features/shared/components/ui/button';
import { Label } from '@/features/shared/components/ui/label';
import AccountManagementService from '@/services/AccountManagementService';

/**
 * Modal para eliminação de conta com confirmação por email
 * Processo: 1. Aviso → 2. Envio de código → 3. Confirmação → 4. Eliminação
 */
const DeleteAccountModal = ({ isOpen, onClose, onAccountDeleted, userType = 'user' }) => {
  const [step, setStep] = useState(1); // 1: Warning, 2: Email sent, 3: Confirm code
  const [confirmationCode, setConfirmationCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expiresIn, setExpiresIn] = useState(10);

  // Reset modal state when opening
  React.useEffect(() => {
    if (isOpen) {
      setStep(1);
      setConfirmationCode('');
      setEmail('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  const handleSendCode = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await AccountManagementService.sendAccountDeletionCode();
      
      if (result.success) {
        setEmail(result.data.email);
        setExpiresIn(result.data.expiresIn);
        setStep(2);
      } else {
        setError(result.error || 'Erro ao enviar código de confirmação');
      }
    } catch (err) {
      console.error('Erro ao enviar código:', err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeletion = async () => {
    if (confirmationCode.length !== 6) {
      setError('Código deve ter 6 dígitos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await AccountManagementService.confirmAccountDeletion(confirmationCode);
      
      if (result.success) {
        onAccountDeleted();
        onClose();
      } else {
        setError(result.error || 'Erro ao confirmar eliminação da conta');
      }
    } catch (err) {
      console.error('Erro ao confirmar eliminação:', err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await AccountManagementService.resendDeletionCode();
      
      if (result.success) {
        setExpiresIn(result.data.expiresIn);
        setError('');
      } else {
        setError(result.error || 'Erro ao reenviar código');
      }
    } catch (err) {
      console.error('Erro ao reenviar código:', err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (step > 1) {
      // Cancelar processo de eliminação
      await AccountManagementService.cancelAccountDeletion();
    }
    onClose();
  };

  if (!isOpen) return null;

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white">Eliminar Conta</h2>
        <p className="text-white/70">
          Tem certeza que deseja eliminar permanentemente sua conta {userType === 'partner' ? 'de parceiro' : ''}?
        </p>
      </div>

      <div className="glass-effect rounded-lg p-4 border border-red-500/20 bg-red-500/5 space-y-3">
        <h3 className="font-semibold text-red-400 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Esta ação não pode ser desfeita
        </h3>
        <ul className="text-sm text-red-300 space-y-2">
          <li>• Todos os seus eventos serão cancelados</li>
          <li>• Suas participações em eventos serão removidas</li>
          <li>• Suas avaliações e fotos serão deletadas</li>
          <li>• Todas as notificações serão removidas</li>
          <li>• Seus dados pessoais serão permanentemente apagados</li>
          {userType === 'partner' && (
            <>
              <li>• Seu perfil de estabelecimento será removido</li>
              <li>• Histórico de eventos do restaurante será perdido</li>
            </>
          )}
        </ul>
      </div>

      <div className="glass-effect rounded-lg p-4 border border-blue-500/20 bg-blue-500/5">
        <h4 className="font-semibold text-blue-400 mb-2">Como funciona:</h4>
        <ol className="text-sm text-blue-300 space-y-1">
          <li>1. Enviaremos um código de confirmação para seu email</li>
          <li>2. Digite o código de 6 dígitos para confirmar</li>
          <li>3. Sua conta será permanentemente removida</li>
          <li>4. Se quiser se cadastrar novamente, será como um novo usuário</li>
        </ol>
      </div>

      {error && (
        <div className="glass-effect rounded-lg p-3 border border-red-500/20 bg-red-500/10">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-white/20 text-white hover:bg-white/10 font-medium rounded-lg transition-colors"
          disabled={loading}
        >
          Cancelar
        </button>
        <Button
          onClick={handleSendCode}
          disabled={loading}
          className="flex-1 bg-red-600 hover:bg-red-700"
        >
          {loading ? 'Enviando...' : 'Continuar com Eliminação'}
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
          <Mail className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-white">Código Enviado</h2>
        <p className="text-white/70">
          Enviamos um código de confirmação de 6 dígitos para:
        </p>
        <p className="font-semibold text-blue-400">{email}</p>
      </div>

      <div className="glass-effect rounded-lg p-4 border border-yellow-500/20 bg-yellow-500/5">
        <p className="text-yellow-400 text-sm text-center">
          ⏱️ O código expira em {expiresIn} minutos
        </p>
      </div>

      <div className="text-center space-y-4">
        <p className="text-white/60 text-sm">
          Não recebeu o email? Verifique sua caixa de spam ou clique em reenviar.
        </p>
        <button
          onClick={handleResendCode}
          disabled={loading}
          className="text-blue-400 hover:text-blue-300 text-sm underline disabled:opacity-50"
        >
          {loading ? 'Reenviando...' : 'Reenviar código'}
        </button>
        <button
          onClick={() => setStep(3)}
          className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Já tenho o código
        </button>
      </div>

      {error && (
        <div className="glass-effect rounded-lg p-3 border border-red-500/20 bg-red-500/10">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleCancel}
          className="flex-1 px-4 py-2 border border-white/20 text-white hover:bg-white/10 font-medium rounded-lg transition-colors"
          disabled={loading}
        >
          Cancelar Processo
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white">Confirmação Final</h2>
        <p className="text-white/70">
          Digite o código de 6 dígitos que você recebeu por email para confirmar a eliminação da conta.
        </p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="confirmationCode">Código de Confirmação</Label>
        <Input
          id="confirmationCode"
          type="text"
          value={confirmationCode}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
            setConfirmationCode(value);
            if (error) setError('');
          }}
          placeholder="000000"
          className="glass-effect border-white/10 text-center text-2xl font-mono tracking-widest"
          maxLength={6}
          disabled={loading}
          autoComplete="off"
        />
        <p className="text-white/50 text-xs text-center">
          Insira os 6 dígitos recebidos no email {email}
        </p>
      </div>

      <div className="glass-effect rounded-lg p-4 border border-red-500/20 bg-red-500/5">
        <p className="text-red-400 text-sm text-center font-semibold">
          ⚠️ ÚLTIMA CHANCE: Após confirmar, sua conta será permanentemente eliminada
        </p>
      </div>

      {error && (
        <div className="glass-effect rounded-lg p-3 border border-red-500/20 bg-red-500/10">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleCancel}
          className="flex-1 px-4 py-2 border border-white/20 text-white hover:bg-white/10 font-medium rounded-lg transition-colors"
          disabled={loading}
        >
          Cancelar
        </button>
        <Button
          onClick={handleConfirmDeletion}
          disabled={confirmationCode.length !== 6 || loading}
          className="flex-1 bg-red-600 hover:bg-red-700"
        >
          {loading ? 'Eliminando...' : 'ELIMINAR CONTA'}
        </Button>
      </div>

      <div className="text-center">
        <button
          onClick={() => setStep(2)}
          className="text-blue-400 hover:text-blue-300 text-sm underline"
          disabled={loading}
        >
          ← Voltar para reenviar código
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="glass-effect rounded-2xl p-6 border border-white/10 max-w-lg w-full animate-in fade-in zoom-in duration-300">
        
        {/* Header com botão fechar */}
        <div className="flex justify-end mb-4">
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Fechar"
            disabled={loading}
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Conteúdo baseado no step */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  );
};

DeleteAccountModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAccountDeleted: PropTypes.func.isRequired,
  userType: PropTypes.oneOf(['user', 'partner']),
};

export default DeleteAccountModal;