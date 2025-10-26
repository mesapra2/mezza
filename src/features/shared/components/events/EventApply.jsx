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

  const isInstitucional = event.event_type === 'institucional';
  const requiresMessage = ['padrao', 'particular', 'crusher'].includes(event.event_type);

  const handleApply = async () => {
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
      const response = await ParticipationService.applyToEvent(event.id, user.id, message);

      if (response.success && !isInstitucional) {
        const { data: applicantProfile } = await supabase
          .from('profiles')
          .select('username, full_name')
          .eq('id', user.id)
          .single();

        const applicantName = applicantProfile?.username || applicantProfile?.full_name || 'Usuário';

        console.log('📢 Enviando notificação ao criador:', {
          creatorId: event.creator_id,
          eventId: event.id,
          participationId: response.participation.id,
          applicantName,
          eventTitle: event.title
        });

        const notifResult = await NotificationService.notifyNewParticipation(
          event.creator_id,
          event.id,
          response.participation.id,
          applicantName,
          event.title
        );

        if (notifResult.success) {
          console.log('✅ Notificação enviada com sucesso');
        } else {
          console.error('❌ Erro ao enviar notificação:', notifResult.error);
        }
      }

      setResult(response);

      if (response.success && onSuccess) {
        setTimeout(() => onSuccess(), 2000);
      }
    } catch (error) {
      setResult({ success: false, error: error.message || 'Erro ao enviar candidatura' });
      console.error('Erro ao aplicar para o evento:', error);
    } finally {
      setLoading(false);
    }
  };

  const isOpen = ['Aberto', 'Confirmado'].includes(event.status);

  if (!isOpen) {
    return (
      <div className="glass-effect rounded-lg p-6 border border-yellow-500/30 bg-yellow-500/10">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-yellow-300 font-semibold mb-1">Candidaturas Encerradas</h4>
            <p className="text-yellow-200/80 text-sm">Este evento não está mais aceitando novas candidaturas.</p>
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
            <p className="text-red-200/80 text-sm">Este evento já atingiu o limite de participantes.</p>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="space-y-4">
      {isInstitucional ? (
        <div className="glass-effect rounded-lg p-4 border border-blue-500/30 bg-blue-500/10">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-blue-300 font-semibold mb-1">Inscrição Direta</h4>
              <p className="text-blue-200/80 text-sm">Este é um evento institucional. Sua inscrição será aprovada automaticamente.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-effect rounded-lg p-4 border border-purple-500/30 bg-purple-500/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-purple-300 font-semibold mb-1">Aprovação Manual</h4>
              <p className="text-purple-200/80 text-sm">O anfitrião irá avaliar sua candidatura. Escreva uma mensagem explicando por que você gostaria de participar.</p>
            </div>
          </div>
        </div>
      )}

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
          <p className="text-white/40 text-xs">{message.length}/500 caracteres {message.length < 10 && '(mínimo 10)'}</p>
        </div>
      )}

      {result?.error && (
        <div className="glass-effect rounded-lg p-4 border border-red-500/30 bg-red-500/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-300 text-sm">{result.error}</p>
          </div>
        </div>
      )}

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

      <p className="text-white/40 text-xs text-center">
        Ao se candidatar, você concorda com as{' '}
        <a href="#" className="text-purple-400 hover:underline">políticas de cancelamento</a> do evento.
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