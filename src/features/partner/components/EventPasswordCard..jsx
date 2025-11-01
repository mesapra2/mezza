// src/features/partner/components/EventPasswordCard.jsx
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { Key, Clock, Copy, CheckCircle, Eye, EyeOff, AlertCircle, Users } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/features/shared/components/ui/use-toast';

const EventPasswordCard = ({ eventId }) => {
  const [password, setPassword] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [timeUntilStart, setTimeUntilStart] = useState(null);
  const [participantsWithAccess, setParticipantsWithAccess] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    const loadEventData = async () => {
      try {
        const { data: event, error } = await supabase
          .from('events')
          .select('event_entry_password, start_time, end_time')
          .eq('id', eventId)
          .single();

        if (error) throw error;

        setPassword(event.event_entry_password);

        // Calcular tempo até o evento começar
        const startTime = new Date(event.start_time);
        const now = new Date();
        const diff = startTime - now;

        if (diff > 0) {
          setTimeUntilStart(Math.ceil(diff / 1000 / 60)); // minutos
        } else {
          setTimeUntilStart(0);
        }

        // Buscar participantes que já entraram
        if (event.event_entry_password) {
          const { data: participants, error: partError } = await supabase
            .from('event_participants')
            .select(`
              id,
              presenca_confirmada,
              entry_time,
              user:profiles!event_participants_user_id_fkey(
                id,
                username,
                avatar_url
              )
            `)
            .eq('event_id', eventId)
            .eq('status', 'aprovado')
            .eq('presenca_confirmada', true)
            .order('entry_time', { ascending: true });

          if (!partError && participants) {
            setParticipantsWithAccess(participants);
          }
        }
      } catch (error) {
        console.error('❌ Erro ao carregar senha:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEventData();

    // Atualizar a cada 10 segundos
    const interval = setInterval(loadEventData, 10000);

    return () => clearInterval(interval);
  }, [eventId]);

  const handleCopyPassword = () => {
    if (!password) return;

    navigator.clipboard.writeText(password);
    setCopied(true);
    toast({
      title: '📋 Senha copiada!',
      description: 'A senha foi copiada para a área de transferência',
    });

    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="glass-effect rounded-lg p-4 border border-white/10 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-1/2 mb-2" />
        <div className="h-4 bg-white/10 rounded w-3/4" />
      </div>
    );
  }

  // Se ainda não tem senha (falta mais de 2 minutos)
  if (!password) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-effect rounded-lg p-4 border border-blue-500/30 bg-blue-500/5"
      >
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-blue-300 font-semibold text-sm mb-1">
              Senha será gerada em breve
            </h4>
            <p className="text-blue-200/80 text-xs">
              {timeUntilStart !== null && timeUntilStart > 2
                ? `A senha será gerada faltando 1 minuto para o evento (em ~${timeUntilStart} min)`
                : 'A senha está sendo gerada...'}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Tem senha gerada
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="glass-effect rounded-lg p-4 border border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
          <Key className="w-5 h-5 text-green-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-green-300 font-semibold text-sm mb-1">
            🔐 Senha de Entrada Gerada!
          </h4>
          <p className="text-green-200/80 text-xs">
            Compartilhe esta senha com os participantes para entrarem no evento
          </p>
        </div>
      </div>

      {/* Senha */}
      <div className="space-y-3">
        <div className="relative">
          <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-green-500/30">
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/60 font-medium">SENHA:</span>
              <span className={`text-2xl font-bold tracking-wider text-green-400 font-mono ${
                showPassword ? '' : 'filter blur-sm select-none'
              }`}>
                {password}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={handleCopyPassword}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                title="Copiar senha"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Instruções */}
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-200/80">
              <p className="font-semibold mb-1">Como usar:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-200/70">
                <li>Compartilhe esta senha com os participantes</li>
                <li>Eles devem digitar na página do evento</li>
                <li>A entrada será liberada automaticamente</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Status do Evento */}
        {timeUntilStart !== null && timeUntilStart === 0 && (
          <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30 text-center">
            <p className="text-xs text-green-300 font-semibold">
              🎉 Evento em andamento!
            </p>
          </div>
        )}

        {/* Participantes que já entraram */}
        {participantsWithAccess.length > 0 && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-green-400" />
              <h5 className="text-green-300 font-semibold text-xs">
                Participantes que já entraram ({participantsWithAccess.length})
              </h5>
            </div>
            <div className="flex flex-wrap gap-2">
              {participantsWithAccess.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-2 px-2 py-1 rounded-lg bg-green-500/20 border border-green-500/30"
                  title={`Entrou: ${participant.entry_time ? new Date(participant.entry_time).toLocaleTimeString() : 'Agora'}`}
                >
                  <img
                    src={
                      participant.user?.avatar_url ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        participant.user?.username || 'User'
                      )}&background=10b981&color=fff&size=32`
                    }
                    alt={participant.user?.username}
                    className="w-5 h-5 rounded-full border border-green-400/50"
                  />
                  <span className="text-xs text-green-200 font-medium">
                    {participant.user?.username}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

EventPasswordCard.propTypes = {
  eventId: PropTypes.number.isRequired,
};

export default EventPasswordCard;