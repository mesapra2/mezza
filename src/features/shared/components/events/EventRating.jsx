import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Star, Check, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/features/shared/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import RatingService from '@/services/RatingService';
import RatingModal from './RatingModal';

// 1. CORREÇÃO: 'hostName' removido, pois não estava sendo usado.
const EventRating = ({ eventId, hostId, onAllRatingsComplete }) => {
  const { user } = useAuth();
  // 2. CORREÇÃO: 'toast' agora será usado nos blocos 'catch'.
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hostData, setHostData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [ratedStatus, setRatedStatus] = useState({});
  const [selectedRatingModal, setSelectedRatingModal] = useState(null);

  const loadRatingData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: host, error: hostError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, reputation_stars')
        .eq('id', hostId)
        .single();

      if (hostError) throw hostError;
      setHostData(host);

      const { data: eventParticipants, error: partError } = await supabase
        .from('participations')
        .select(`
          id,
          participant_id,
          status,
          presenca_confirmada,
          participant:profiles(id, username, avatar_url, reputation_stars)
        `)
        .eq('event_id', eventId)
        .eq('presenca_confirmada', true)
        .not('participant_id', 'eq', user.id);

      if (partError) throw partError;

      const validParticipants = (eventParticipants || []).filter(
        p => p.participant && p.participant_id !== hostId
      );

      setParticipants(validParticipants);

      // 3. CORREÇÃO (IMPORTANTE): Removemos a chamada do loadRatingStatus daqui
      // para quebrar o loop infinito de dependência.
      // await loadRatingStatus(); 
    } catch (err) {
      console.error('Erro ao carregar dados de avaliação:', err);
      setError('Erro ao carregar dados. Tente novamente.');
      // 2. CORREÇÃO: Usando o 'toast' no erro.
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível buscar os participantes para avaliação.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  // 4. CORREÇÃO: Adicionado 'toast' às dependências. 'loadRatingStatus' foi removido.
  }, [eventId, hostId, user.id, toast]);

  const loadRatingStatus = useCallback(async () => {
    try {
      const status = {};

      if (hostData) {
        const hasHostRating = await RatingService.hasUserRated(
          eventId,
          user.id,
          hostId,
          'host'
        );
        status[`host-${hostId}`] = hasHostRating;
      }

      for (const p of participants) {
        const hasParticipantRating = await RatingService.hasUserRated(
          eventId,
          user.id,
          p.participant_id,
          'participant'
        );
        status[`participant-${p.participant_id}`] = hasParticipantRating;
      }

      setRatedStatus(status);
    } catch (error) {
      console.error('Erro ao carregar status de avaliações:', error);
      // 2. CORREÇÃO: Usando o 'toast' no erro.
      toast({
        title: 'Erro ao verificar status',
        description: 'Não foi possível verificar suas avaliações pendentes.',
        variant: 'destructive',
      });
    }
  // 5. CORREÇÃO: Adicionado 'toast' às dependências.
  }, [eventId, hostData, hostId, participants, user.id, toast]);

  // useEffect 1: Busca os dados principais (participantes e host)
  useEffect(() => {
    if (eventId && user) {
      loadRatingData();
    }
  }, [eventId, user, loadRatingData]);

  // 6. CORREÇÃO (IMPORTANTE): Novo useEffect para carregar o STATUS das avaliações.
  // Ele só roda DEPOIS que 'hostData' ou 'participants' forem carregados,
  // quebrando o ciclo de dependência.
  useEffect(() => {
    if (hostData || participants.length > 0) {
      loadRatingStatus();
    }
  }, [hostData, participants, loadRatingStatus]);


  const handleRatingClick = (targetUser, ratingType) => {
    setSelectedRatingModal({
      targetUser,
      ratingType,
      ratedId: targetUser.id,
      ratedName: targetUser.username
    });
  };

  const handleRatingSubmit = async () => {
    // Recarrega o status após uma avaliação ser submetida
    await loadRatingStatus();

    // NOTA: É preciso checar o 'ratedStatus' atualizado.
    // O 'loadRatingStatus' atualiza o estado, mas o 'ratedStatus'
    // nesta função ainda será o antigo. Precisamos de uma lógica
    // um pouco diferente para verificar 'allRated'
    
    // Vamos re-checar o status aqui
    const status = {};
    if (hostData) {
      const hasHostRating = await RatingService.hasUserRated(eventId, user.id, hostId, 'host');
      status[`host-${hostId}`] = hasHostRating;
    }
    for (const p of participants) {
      const hasParticipantRating = await RatingService.hasUserRated(eventId, user.id, p.participant_id, 'participant');
      status[`participant-${p.participant_id}`] = hasParticipantRating;
    }
    setRatedStatus(status); // Atualiza o estado para a UI

    // Verifica com o status recém-buscado
    const allRated = participants.every(p =>
      status[`participant-${p.participant_id}`]
    ) && status[`host-${hostId}`];

    if (allRated && onAllRatingsComplete) {
      onAllRatingsComplete();
    }
  };

  if (isLoading) {
    return <div className="text-white/60 text-center py-8">Carregando avaliações...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
        <p className="text-red-200">{error}</p>
        <button
          onClick={() => loadRatingData()}
          className="mt-4 px-4 py-2 bg-red-600/50 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const hostRated = ratedStatus[`host-${hostId}`];
  const participantsRated = participants.filter(p =>
    ratedStatus[`participant-${p.participant_id}`]
  );
  const allRated = hostRated && participantsRated.length === participants.length;
  
  // Evita divisão por zero se não houver participantes + host
  const totalToRate = participants.length + (hostData ? 1 : 0);
  const totalRated = participantsRated.length + (hostRated ? 1 : 0);
  const percentage = totalToRate > 0 ? (totalRated / totalToRate) * 100 : 100;

  return (
    <div className="space-y-6">
      <div className="glass-effect rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Avaliações do Evento</h2>
          {totalToRate > 0 && (
            <span className="text-sm font-semibold px-3 py-1 rounded-full bg-purple-600/30 text-purple-200 border border-purple-500/30">
              {totalRated} / {totalToRate}
            </span>
          )}
        </div>

        {totalToRate > 0 && (
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-full transition-all duration-500"
              style={{
                width: `${percentage}%`
              }}
            />
          </div>
        )}

        {allRated && totalToRate > 0 && (
          <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <p className="text-sm text-green-200 flex items-center gap-2">
              <Check size={16} className="text-green-400" />
              Você completou todas as avaliações!
            </p>
          </div>
        )}
      </div>

      {hostData && (
        <div className="glass-effect rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 p-1 flex-shrink-0">
                {hostData.avatar_url ? (
                  <img
                    src={hostData.avatar_url}
                    alt={hostData.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center text-white font-semibold">
                    {hostData.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">{hostData.username}</h3>
                <p className="text-sm text-white/60">Anfitrião do evento</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={
                          i < Math.floor(hostData.reputation_stars || 0)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-white/20'
                        }
                      />
                    ))}
                  </div>
                  <span className="text-sm text-white/60">
                    {hostData.reputation_stars || '0'} estrelas
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {hostRated ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Check size={18} className="text-green-400" />
                  <span className="text-sm font-semibold text-green-200">Avaliado</span>
                </div>
              ) : (
                <button
                  onClick={() => handleRatingClick(hostData, 'host')}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold transition-all hover:shadow-lg active:scale-95"
                >
                  Avaliar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {participants.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs font-semibold text-white/50 px-2">PARTICIPANTES</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>
      )}

      {participants.length > 0 ? (
        <div className="space-y-3">
          {participants.map((participation) => {
            const participant = participation.participant;
            const isRated = ratedStatus[`participant-${participant.id}`];

            return (
              <div
                key={participant.id}
                className="glass-effect rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 p-1 flex-shrink-0">
                      {participant.avatar_url ? (
                        <img
                          src={participant.avatar_url}
                          alt={participant.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center text-white font-semibold text-sm">
                          {participant.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white truncate">{participant.username}</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              className={
                                i < Math.floor(participant.reputation_stars || 0)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-white/20'
                              }
                            />
                          ))}
                        </div>
                        <span className="text-xs text-white/60">
                          {participant.reputation_stars || '0'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isRated ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20 flex-shrink-0">
                      <Check size={14} className="text-green-400" />
                      <span className="text-xs font-semibold text-green-200">Avaliado</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRatingClick(participant, 'participant')}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors flex-shrink-0"
                    >
                      Avaliar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-white/60">
          <Clock size={32} className="mx-auto mb-3 opacity-50" />
          <p>Nenhum outro participante confirmou presença</p>
        </div>
      )}

      {selectedRatingModal && (
        <RatingModal
          isOpen={true}
          onClose={() => setSelectedRatingModal(null)}
          eventId={eventId}
          raterId={user.id}
          ratedId={selectedRatingModal.ratedId}
          ratedName={selectedRatingModal.ratedName}
          ratingType={selectedRatingModal.ratingType}
          onRatingSubmit={handleRatingSubmit}
        />
      )}
    </div>
  );
};

// 7. CORREÇÃO: Removido 'hostName' dos propTypes.
EventRating.propTypes = {
  eventId: PropTypes.number.isRequired,
  hostId: PropTypes.string.isRequired,
  onAllRatingsComplete: PropTypes.func
};

export default EventRating;