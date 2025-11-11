// src/features/shared/components/events/ParticipantsManager.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, CheckCircle, XCircle, Clock, UserCheck } from 'lucide-react'; // Removido Star
import { Button } from '@/features/shared/components/ui/button';
import ParticipationService from '@/services/ParticipationService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/features/shared/components/ui/use-toast';
import PropTypes from 'prop-types';
import { getAvatarUrl } from '@/utils/avatarHelper';
import { supabase } from '@/lib/supabaseClient';

/**
 * Componente para gerenciar participantes de um evento (Anfitrião)
 */
const ParticipantsManagement = ({ eventId, eventType, onUpdate }) => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos'); // todos, pendente, aprovado, rejeitado
  const [eventStartTime, setEventStartTime] = useState(null);

  // 🕐 Verifica se o evento começa em menos de 1 minuto
  const isEventTooClose = () => {
    if (!eventStartTime) return false;
    const now = new Date();
    const startTime = new Date(eventStartTime);
    const oneMinuteBefore = new Date(startTime.getTime() - 1 * 60 * 1000);
    return now >= oneMinuteBefore;
  };

  const loadParticipants = async () => {
    setLoading(true);
    const result = await ParticipationService.getEventParticipations(eventId);
    if (result.success) {
      setParticipants(result.data);
    }
    setLoading(false);
  };

  // Buscar start_time do evento
  const loadEventStartTime = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('start_time')
        .eq('id', eventId)
        .single();

      if (!error && data) {
        setEventStartTime(data.start_time);
      }
    } catch (err) {
      console.error('Erro ao buscar start_time do evento:', err);
    }
  };

  useEffect(() => {
    if (eventId) {
      loadParticipants();
      loadEventStartTime();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handleApprove = async (participationId) => {
    try {
      // 🔒 Verificar se o evento não está muito perto
      if (isEventTooClose()) {
        toast({
          variant: "destructive",
          title: "Aprovação bloqueada",
          description: "Não é possível aprovar participantes a menos de 1 minuto do evento",
        });
        return;
      }

      console.log('Aprovando participação:', participationId);
      
      const result = await ParticipationService.approveParticipation(participationId, eventId);
      
      if (result.success) {
        console.log('Participação aprovada com sucesso');
        loadParticipants();
        if (onUpdate) onUpdate();
        
        toast({
          title: "Participante aprovado!",
          description: "O participante foi notificado da aprovação.",
        });
      } else {
        console.error('Erro ao aprovar:', result.error);
        toast({
          variant: "destructive",
          title: "Erro ao aprovar",
          description: result.error,
        });
      }
    } catch (error) {
      console.error('Erro:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao aprovar participação",
      });
    }
  };

  const handleReject = async (participationId) => {
    const confirmed = confirm('Deseja realmente rejeitar esta candidatura?');
    if (!confirmed) return;

    try {
      const result = await ParticipationService.rejectParticipation(participationId);
      if (result.success) {
        loadParticipants();
        if (onUpdate) onUpdate();
        
        toast({
          title: "Rejeitado",
          description: "A candidatura foi rejeitada.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao rejeitar:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao rejeitar participação",
      });
    }
  };

  const filteredParticipants = participants.filter(p => {
    if (filter === 'todos') return true;
    if (filter === 'pendente') return p.status === 'pendente';
    if (filter === 'aprovado') return p.status === 'aprovado';
    if (filter === 'rejeitado') return p.status === 'rejeitado';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {['todos', 'pendente', 'aprovado', 'rejeitado'].map(f => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f} ({participants.filter(p => p.status === f || f === 'todos').length})
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : filteredParticipants.length === 0 ? (
        <div className="glass-effect rounded-lg p-6 border border-white/10 text-center">
          <Users className="w-8 h-8 mx-auto mb-2 text-white/40" />
          <p className="text-white/60">Nenhum participante encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredParticipants.map((participant) => (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="glass-effect rounded-lg p-4 border border-white/10"
            >
              <div className="flex items-start gap-4">
                <img
                  src={getAvatarUrl(participant.user.avatar_url, participant.user.username, 48)}
                  alt={participant.user.username}
                  className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/30"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      participant.user.username || 'U'
                    )}&background=8b5cf6&color=fff&size=48`;
                  }}
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <span className="font-medium text-white">{participant.user.username}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      participant.status === 'aprovado' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                      participant.status === 'pendente' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                      'bg-red-500/20 text-red-300 border-red-500/30'
                    }`}>
                      {participant.status === 'aprovado' && <CheckCircle className="w-3 h-3" />}
                      {participant.status === 'pendente' && <Clock className="w-3 h-3" />}
                      {participant.status === 'rejeitado' && <XCircle className="w-3 h-3" />}
                      {participant.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <UserCheck className="w-3 h-3" />
                    {participant.user.reputation_stars || 0} estrelas
                    <span>•</span>
                    <span>
                      Candidatura: {format(new Date(participant.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>

                  {participant.mensagem_candidatura && (
                    <p className="text-white/60 text-sm bg-white/5 rounded p-2 mb-2">
                      &quot;{participant.mensagem_candidatura}&quot;
                    </p>
                  )}

                  {/* Ações */}
                  {participant.status === 'pendente' && eventType !== 'institucional' && (
                    <div className="space-y-2 mt-2">
                      {/* 🔒 Alerta se evento está muito próximo */}
                      {isEventTooClose() && (
                        <div className="p-2 rounded bg-red-500/20 border border-red-500/30">
                          <p className="text-red-300 text-xs font-medium">
                            ⏰ Evento começa em menos de 1 minuto - aprovações bloqueadas
                          </p>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprove(participant.id)}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600"
                          disabled={isEventTooClose()}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          onClick={() => handleReject(participant.id)}
                          size="sm"
                          variant="destructive"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Nota sobre eventos institucionais */}
      {eventType === 'institucional' && (
        <div className="glass-effect rounded-lg p-4 border border-blue-500/30 bg-blue-500/10">
          <p className="text-blue-300 text-sm flex items-start gap-2">
            <Users className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Evento Institucional:</strong> As inscrições são aprovadas automaticamente.
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

ParticipantsManagement.propTypes = {
  eventId: PropTypes.string.isRequired,
  eventType: PropTypes.string.isRequired,
  onUpdate: PropTypes.func,
};

export default ParticipantsManagement;