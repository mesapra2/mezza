// src/components/ChangePasswordModal.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Eye, EyeOff, Lock, Check, X } from 'lucide-react';
import { Input } from '@/features/shared/components/ui/input';
import { Button } from '@/features/shared/components/ui/button';
import { Label } from '@/features/shared/components/ui/label';
import AccountManagementService from '@/services/AccountManagementService';

/**
 * Modal para alteração de senha
 * Requer senha atual + nova senha com confirmação
 */
const ChangePasswordModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Validações da nova senha
  const passwordValidation = {
    minLength: formData.newPassword.length >= 8,
    hasUpperCase: /[A-Z]/.test(formData.newPassword),
    hasLowerCase: /[a-z]/.test(formData.newPassword),
    hasNumber: /\d/.test(formData.newPassword),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword),
    passwordsMatch: formData.newPassword === formData.confirmPassword && formData.confirmPassword.length > 0,
  };

  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpar erro do campo alterado
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      setErrors({ general: 'Por favor, preencha todos os requisitos da senha' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const result = await AccountManagementService.changePassword(
        formData.currentPassword, 
        formData.newPassword
      );

      if (result.success) {
        onSuccess('Senha alterada com sucesso!');
        onClose();
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setErrors({ general: result.error || 'Erro ao alterar senha' });
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      setErrors({ general: 'Erro inesperado. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="glass-effect rounded-2xl p-6 border border-white/10 max-w-md w-full space-y-6 animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-xl font-semibold text-white">Alterar Senha</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Senha Atual */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Senha Atual</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                name="currentPassword"
                type={showPasswords.current ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Digite sua senha atual"
                className="glass-effect border-white/10 pr-12"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70"
                aria-label="Mostrar/ocultar senha"
              >
                {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nova Senha */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <div className="relative">
              <Input
                id="newPassword"
                name="newPassword"
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Digite sua nova senha"
                className="glass-effect border-white/10 pr-12"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70"
                aria-label="Mostrar/ocultar senha"
              >
                {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar Nova Senha */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirme sua nova senha"
                className="glass-effect border-white/10 pr-12"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70"
                aria-label="Mostrar/ocultar senha"
              >
                {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Validações da Senha */}
          {formData.newPassword.length > 0 && (
            <div className="glass-effect rounded-lg p-3 border border-white/10 space-y-2">
              <h4 className="text-sm font-medium text-white mb-2">Requisitos da senha:</h4>
              {[
                { key: 'minLength', text: 'Mínimo 8 caracteres' },
                { key: 'hasUpperCase', text: 'Uma letra maiúscula' },
                { key: 'hasLowerCase', text: 'Uma letra minúscula' },
                { key: 'hasNumber', text: 'Um número' },
                { key: 'hasSpecialChar', text: 'Um caractere especial' },
                { key: 'passwordsMatch', text: 'Senhas coincidem' },
              ].map(({ key, text }) => (
                <div key={key} className="flex items-center gap-2">
                  {passwordValidation[key] ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-xs ${passwordValidation[key] ? 'text-green-400' : 'text-red-400'}`}>
                    {text}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Erro Geral */}
          {errors.general && (
            <div className="glass-effect rounded-lg p-3 border border-red-500/20 bg-red-500/10">
              <p className="text-red-400 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-white/20 text-white hover:bg-white/10 font-medium rounded-lg transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <Button
              type="submit"
              disabled={!isPasswordValid || loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50"
            >
              {loading ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

ChangePasswordModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

export default ChangePasswordModal;