// src/features/shared/components/EventEntryForm.jsx
import React, { useState, useRef } from 'react';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { useToast } from '@/features/shared/components/ui/use-toast';
import EventSecurityService from '@/services/EventSecurityService';
import { useAuth } from '@/contexts/AuthContext';
import PropTypes from 'prop-types';

/**
 * 🔐 Componente: Formulário de entrada com senha
 * - Input de 4 dígitos (1 dígito por input)
 * - Validação em tempo real
 * - Feedback visual
 */
const EventEntryForm = ({ eventId, onSuccess, isDisabled = false }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [digits, setDigits] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  /**
   * 🎯 Muda dígito e auto-move para próximo
   */
  const handleDigitChange = (index, value) => {
    // Apenas números
    if (!/^\d?$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    setError('');

    // Auto-move para próximo input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  /**
   * ⌫ Backspace: move para anterior
   */
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  /**
   * ✅ Submeter senha
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar se todos os dígitos foram preenchidos
    if (digits.some(d => d === '')) {
      setError('⚠️ Digite todos os 4 dígitos');
      toast({
        variant: 'destructive',
        title: 'Senha incompleta',
        description: 'Por favor, digite todos os 4 dígitos'
      });
      return;
    }

    const password = digits.join('');
    setLoading(true);
    setError('');

    try {
      console.log(`🔐 Validando senha: ${password}`);

      // ✅ CORRIGIDO: Chamada correta do EventSecurityService
      const result = await EventSecurityService.validateEntryPassword({
        eventId: parseInt(eventId),
        participantId: user.id,
        password: password
      });

      if (result.success) {
        console.log(`✅ Entrada validada!`);

        toast({
          title: '✅ Acesso Liberado!',
          description: 'Bem-vindo ao evento! Você pode entrar agora.',
          duration: 3000
        });

        // Callback de sucesso
        if (onSuccess) {
          onSuccess();
        }
      } else {
        console.log(`❌ Entrada rejeitada:`, result.message);

        setError(result.message || '❌ Senha incorreta');
        setDigits(['', '', '', '']);
        inputRefs.current[0]?.focus();

        toast({
          variant: 'destructive',
          title: 'Acesso Negado',
          description: result.message
        });
      }
    } catch (error) {
      console.error('❌ Erro ao validar entrada:', error);

      setError('❌ Erro ao processar sua entrada');
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao processar sua entrada'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🔄 Limpar form
   */
  const handleClear = () => {
    setDigits(['', '', '', '']);
    setError('');
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="w-full max-w-sm mx-auto p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 shadow-2xl">
      {/* 🎯 Título */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">🔐 Digite a Senha</h2>
        <p className="text-sm text-slate-400">
          Digite os 4 dígitos para entrar no evento
        </p>
      </div>

      {/* 📝 Formulário */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 🔢 Inputs de Dígitos */}
        <div className="flex justify-center gap-3">
          {[0, 1, 2, 3].map((index) => (
            <Input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength="1"
              value={digits[index]}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isDisabled || loading}
              placeholder="•"
              className={`w-14 h-14 text-center text-2xl font-bold rounded-lg border-2 transition-all ${
                digits[index]
                  ? 'border-blue-500 bg-blue-500/10 text-white'
                  : 'border-slate-600 bg-slate-700 text-slate-400'
              } ${error ? 'border-red-500' : ''} ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              autoFocus={index === 0}
            />
          ))}
        </div>

        {/* ❌ Mensagem de Erro */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-sm text-red-400 text-center">{error}</p>
          </div>
        )}

        {/* ⏰ Mensagem de Aviso (se desabilitado) */}
        {isDisabled && (
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <p className="text-sm text-orange-400 text-center">
              ⏰ Entrada não está disponível no momento
            </p>
          </div>
        )}

        {/* 🎯 Botões */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isDisabled || loading}
            className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Validando...
              </>
            ) : (
              '✅ Confirmar Entrada'
            )}
          </Button>

          <Button
            type="button"
            onClick={handleClear}
            disabled={isDisabled || loading}
            variant="outline"
            className="px-4 h-12 border border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            🔄
          </Button>
        </div>

        {/* ℹ️ Info */}
        <p className="text-xs text-slate-500 text-center">
          Digite a senha compartilhada pelo anfitrião
        </p>
      </form>
    </div>
  );
};
EventEntryForm.propTypes = {
  eventId: PropTypes.string.isRequired,
  onSuccess: PropTypes.func,
  isDisabled: PropTypes.bool,
};

EventEntryForm.defaultProps = {
  isDisabled: false,
};

export default EventEntryForm;