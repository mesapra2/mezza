import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { CheckCircle2, Clock, AlertCircle, Loader2, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/features/shared/components/ui/use-toast';
import EventStatusService from '@/services/EventStatusService';
import RatingService from '@/services/RatingService';
import { Button } from '@/features/shared/components/ui/button';

const EventConclusion = ({ eventId, hostId, onEventConcluded }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isConcluding, setIsConcluding] = useState(false);
  const [ratingsStatus, setRatingsStatus] = useState(null);
  const [eventStats, setEventStats] = useState(null);
  const [isHost, setIsHost] = useState(false);

  const loadConclusionData = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsHost(user?.id === hostId);

      const ratings = await RatingService.getEventRatingsStatus(eventId);
      if (ratings.success) {
        setRatingsStatus(ratings.data);
      }

      const stats = await EventStatusService.getEventStats(eventId);
      if (stats.success) {
        setEventStats(stats.data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados de conclusão:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao carregar status do evento'
      });
    } finally {
      setIsLoading(false);
    }
  }, [eventId, hostId, user?.id, toast]);

  useEffect(() => {
    if (eventId) {
      loadConclusionData();
    }
  }, [eventId, loadConclusionData]);

  const handleConcludeEvent = async () => {
    try {
      setIsConcluding(true);

      const result = await EventStatusService.completeEvent(eventId);

      if (result.success) {
        toast({
          title: '✅ Evento Concluído!',
          description: 'O evento foi marcado como concluído e a reputação foi atualizada.'
        });

        if (onEventConcluded) {
          onEventConcluded();
        }

        setTimeout(() => loadConclusionData(), 500);
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: result.error || 'Não foi possível concluir o evento'
        });
      }
    } catch (error) {
      console.error('Erro ao concluir evento:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Ocorreu um erro ao concluir o evento'
      });
    } finally {
      setIsConcluding(false);
    }
  };

  if (isLoading) {
    return <div className="text-white/60 text-center py-8">Carregando status...</div>;
  }

  if (!ratingsStatus || !eventStats) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 text-center">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
        <p className="text-yellow-200">Dados do evento não disponíveis</p>
      </div>
    );
  }

  const allRatingsComplete = ratingsStatus.allRatingsComplete;
  const pendingCount = ratingsStatus.pendingRaters?.length || 0;
  const progressPercent = allRatingsComplete ? 100 : Math.round(((ratingsStatus.totalParticipants - pendingCount) / ratingsStatus.totalParticipants) * 100);

  return (
    <div className="space-y-6">
      <div className={`glass-effect rounded-2xl p-8 border transition-all ${allRatingsComplete ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${allRatingsComplete ? 'bg-green-500/20' : 'bg-yellow-500/20 animate-pulse'}`}>
            {allRatingsComplete ? (
              <Trophy className="w-6 h-6 text-green-400" />
            ) : (
              <Clock className="w-6 h-6 text-yellow-400" />
            )}
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">
              {allRatingsComplete ? '🎉 Todas as Avaliações Completadas!' : '⏳ Aguardando Avaliações'}
            </h2>
            
            {allRatingsComplete ? (
              <p className="text-green-200 mb-4">
                Todos os participantes completaram suas avaliações! 
                {isHost && ' Você pode marcar este evento como concluído.'}
              </p>
            ) : (
              <p className="text-yellow-200 mb-4">
                {pendingCount} {pendingCount === 1 ? 'participante ainda precisa' : 'participantes ainda precisam'} avaliar o evento.
              </p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-xs text-white/60 mb-1">Participantes</p>
                <p className="text-2xl font-bold text-white">{ratingsStatus.totalParticipants}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-xs text-white/60 mb-1">Avaliaram Anfitrião</p>
                <p className="text-2xl font-bold text-yellow-400">{ratingsStatus.hostRatingsReceived}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-xs text-white/60 mb-1">Avaliaram Participantes</p>
                <p className="text-2xl font-bold text-yellow-400">{ratingsStatus.participantRatingsReceived}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-xs text-white/60 mb-1">Progresso</p>
                <p className="text-2xl font-bold text-white">{progressPercent}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!allRatingsComplete && pendingCount > 0 && (
        <div className="glass-effect rounded-2xl p-6 border border-white/10 space-y-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertCircle size={20} className="text-yellow-400" />
            Aguardando Avaliações
          </h3>
          <div className="space-y-2">
            {ratingsStatus.pendingRaters.map((rater) => (
              <div key={rater.user_id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <div>
                  <p className="font-semibold text-white">{rater.username}</p>
                  <p className="text-xs text-white/60">
                    {!rater.evaluated_host && !rater.evaluated_participants && 'Sem avaliações'}
                    {rater.evaluated_host && !rater.evaluated_participants && 'Falta avaliar participantes'}
                    {!rater.evaluated_host && rater.evaluated_participants && 'Falta avaliar anfitrião'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isHost && allRatingsComplete && (
        <div className="glass-effect rounded-2xl p-6 border border-green-500/30 bg-green-500/5 space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 size={20} className="text-green-400" />
              Pronto para Concluir
            </h3>
            <p className="text-green-200 text-sm">
              Todos os participantes completaram suas avaliações. Clique no botão abaixo para marcar o evento como concluído.
            </p>
          </div>

          <Button
            onClick={handleConcludeEvent}
            disabled={isConcluding}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold text-lg py-6 rounded-lg transition-all"
          >
            {isConcluding ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Concluindo Evento...
              </>
            ) : (
              <>
                <Trophy className="w-5 h-5 mr-2" />
                Marcar Evento como Concluído
              </>
            )}
          </Button>

          <p className="text-xs text-white/60 text-center">
            💡 A reputação será atualizada automaticamente
          </p>
        </div>
      )}
    </div>
  );
};

EventConclusion.propTypes = {
  eventId: PropTypes.number.isRequired,
  hostId: PropTypes.string.isRequired,
  onEventConcluded: PropTypes.func
};

export default EventConclusion;