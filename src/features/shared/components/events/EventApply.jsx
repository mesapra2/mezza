import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { Send, Loader, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { Textarea } from '@/features/shared/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import ParticipationService from '@/services/ParticipationService';
import NotificationService from '@/services/NotificationService';
import { supabase } from '@/lib/supabaseClient';

const EventApply = ({ event, onSuccess }) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Debug do componente EventApply
  console.log('🎯 EventApply renderizado:', {
    eventType: event?.event_type,
    eventId: event?.id,
    eventStatus: event?.status,
    userId: user?.id,
    event: event
  });

  const isInstitucional = event.event_type === 'institucional';
  const requiresMessage = ['padrao', 'particular', 'crusher'].includes(event.event_type);

  const handleApply = async () => {
    // ✅ Validações iniciais
    if (!user?.id) {
      setResult({ 
        success: false, 
        error: "Usuário não autenticado. Por favor, faça login e tente novamente." 
      });
      return;
    }

    if (!event?.id) {
      setResult({ 
        success: false, 
        error: "Não foi possível identificar o evento. Tente recarregar a página." 
      });
      return;
    }

    if (requiresMessage && message.trim().length < 10) {
      setResult({
        success: false,
        error: 'Por favor, escreva uma mensagem (mínimo 10 caracteres)'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // 1️⃣ Aplicar para o evento
      const response = await ParticipationService.applyToEvent(event.id, user.id, message);

      // ✅ CORREÇÃO: Verificar se a resposta foi bem-sucedida
      if (!response.success) {
        setResult(response);
        return;
      }

      // 2️⃣ Enviar notificação (apenas para eventos não institucionais)
      if (!isInstitucional) {
        try {
          // ✅ Buscar nome do aplicante
          const { data: applicantProfile } = await supabase
            .from('profiles')
            .select('username, full_name')
            .eq('id', user.id)
            .single();

          const applicantName = applicantProfile?.username || 
                               applicantProfile?.full_name || 
                               'Usuário';

          // ✅ CORREÇÃO CRÍTICA: Pegar ID da participação do objeto correto
          const participationId = response.data?.id || null;

          console.log('📢 Enviando notificação ao criador:', {
            creatorId: event.creator_id,
            eventId: event.id,
            participationId,
            applicantName,
            eventTitle: event.title
          });

          // ✅ Notificar criador do evento
          const notifResult = await NotificationService.notifyNewParticipation(
            event.creator_id,
            event.id,
            participationId,
            applicantName,
            event.title
          );

          if (notifResult.success) {
            console.log('✅ Notificação enviada com sucesso');
          } else {
            console.warn('⚠️ Erro ao enviar notificação (não crítico):', notifResult.error);
            // ✅ Não bloquear o fluxo se a notificação falhar
          }
        } catch (notifError) {
          console.warn('⚠️ Erro ao processar notificação (não crítico):', notifError);
          // ✅ Continua mesmo se a notificação falhar
        }
      }

      // 3️⃣ Mostrar resultado de sucesso
      setResult({
        ...response,
        isAutoApproved: isInstitucional
      });

      // 4️⃣ Callback de sucesso
      if (onSuccess) {
        setTimeout(() => onSuccess(), 2000);
      }

    } catch (error) {
      console.error('❌ Erro ao aplicar para o evento:', error);
      setResult({ 
        success: false, 
        error: error.message || 'Erro ao enviar candidatura' 
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Verificações de estado do evento
  const isOpen = ['Aberto', 'Confirmado'].includes(event.status);
  
  console.log('🔍 EventApply - Verificações:', {
    eventStatus: event.status,
    isOpen,
    vagas: event.vagas,
    vagasCheck: event.vagas <= 0
  });

  if (!isOpen) {
    return (
      <div className="glass-effect rounded-lg p-6 border border-yellow-500/30 bg-yellow-500/10">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-yellow-300 font-semibold mb-1">Candidaturas Encerradas</h4>
            <p className="text-yellow-200/80 text-sm">
              Este evento não está mais aceitando novas candidaturas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (event.vagas <= 0) {
    return (
      <div className="glass-effect rounded-lg p-6 border border-red-500/30 bg-red-500/10">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-red-300 font-semibold mb-1">Sem Vagas Disponíveis</h4>
            <p className="text-red-200/80 text-sm">
              Este evento já atingiu o limite de participantes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Mensagem de sucesso
  if (result?.success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-effect rounded-lg p-6 border border-green-500/30 bg-green-500/10"
      >
        <div className="flex items-start gap-3">
          {result.isAutoApproved ? (
            <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
          ) : (
            <Clock className="w-6 h-6 text-blue-400 flex-shrink-0" />
          )}
          <div>
            <h4 className="text-white font-semibold mb-2">
              {result.isAutoApproved ? '✅ Inscrição Confirmada!' : '🎉 Candidatura Enviada!'}
            </h4>
            <p className="text-white/80 text-sm">
              {result.isAutoApproved
                ? 'Você foi automaticamente aprovado para este evento institucional.'
                : 'Sua candidatura foi enviada ao anfitrião. Você será notificado quando for aprovado.'}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // ✅ Formulário de candidatura
  return (
    <div className="space-y-4">
      {/* Info sobre tipo de aprovação */}
      {isInstitucional ? (
        <div className="glass-effect rounded-lg p-4 border border-blue-500/30 bg-blue-500/10">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-blue-300 font-semibold mb-1">Inscrição Direta</h4>
              <p className="text-blue-200/80 text-sm">
                Este é um evento institucional. Sua inscrição será aprovada automaticamente.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-effect rounded-lg p-4 border border-purple-500/30 bg-purple-500/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-purple-300 font-semibold mb-1">Aprovação Manual</h4>
              <p className="text-purple-200/80 text-sm">
                O anfitrião irá avaliar sua candidatura. Escreva uma mensagem explicando 
                por que você gostaria de participar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Campo de mensagem */}
      {requiresMessage && (
        <div className="space-y-2">
          <label className="text-white/80 text-sm font-medium block">
            Mensagem para o Anfitrião <span className="text-red-400">*</span>
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Conte um pouco sobre você e por que gostaria de participar deste evento..."
            className="glass-effect border-white/10 text-white min-h-[100px]"
            maxLength={500}
          />
          <p className="text-white/40 text-xs">
            {message.length}/500 caracteres {message.length < 10 && '(mínimo 10)'}
          </p>
        </div>
      )}

      {/* Mensagem de erro */}
      {result?.error && (
        <div className="glass-effect rounded-lg p-4 border border-red-500/30 bg-red-500/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-300 text-sm">{result.error}</p>
          </div>
        </div>
      )}

      {/* Botão de envio */}
      <Button
        onClick={handleApply}
        disabled={loading || (requiresMessage && message.trim().length < 10)}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-12 text-base font-semibold"
      >
        {loading ? (
          <>
            <Loader className="w-5 h-5 mr-2 animate-spin" />
            {isInstitucional ? 'Inscrevendo...' : 'Enviando Candidatura...'}
          </>
        ) : (
          <>
            <Send className="w-5 h-5 mr-2" />
            {isInstitucional ? 'Inscrever-se Agora' : 'Enviar Candidatura'}
          </>
        )}
      </Button>

      {/* Aviso sobre políticas */}
      <p className="text-white/40 text-xs text-center">
        Ao se candidatar, você concorda com as{' '}
        <a href="/politicas.html" className="text-purple-400 hover:underline">
          políticas de cancelamento
        </a>{' '}
        do evento.
      </p>
    </div>
  );
};

EventApply.propTypes = {
  event: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    event_type: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    vagas: PropTypes.number.isRequired,
    creator_id: PropTypes.string.isRequired
  }).isRequired,
  onSuccess: PropTypes.func
};

export default EventApply;