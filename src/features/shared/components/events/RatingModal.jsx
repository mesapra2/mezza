import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Star } from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { useToast } from '@/features/shared/components/ui/use-toast';
import RatingService from '@/services/RatingService';

const RatingModal = ({
  isOpen,
  onClose,
  eventId,
  raterId,
  ratedId,
  ratedName,
  ratingType,
  onRatingSubmit
}) => {
  const { toast } = useToast();
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedScore, setSelectedScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [existingRating, setExistingRating] = useState(null);

  const loadExistingRating = useCallback(async () => {
    try {
      const rating = await RatingService.getRating(
        eventId,
        raterId,
        ratedId,
        ratingType
      );
      if (rating) {
        setSelectedScore(rating.score);
        setExistingRating(rating);
      }
    } catch (error) {
      console.error('Erro ao carregar avaliação:', error);
    }
  }, [eventId, raterId, ratedId, ratingType]);

  useEffect(() => {
    if (isOpen && eventId && raterId && ratedId) {
      loadExistingRating();
    }
  }, [isOpen, eventId, raterId, ratedId, loadExistingRating]);

  const handleStarClick = (score) => {
    setSelectedScore(score);
  };

  const handleSubmit = async () => {
    if (!selectedScore) {
      toast({
        variant: 'destructive',
        title: 'Selecione uma avaliação',
        description: 'Por favor, clique em uma estrela para avaliar'
      });
      return;
    }

    try {
      setIsLoading(true);

      const result = await RatingService.createRating({
        eventId,
        raterId,
        ratedId,
        ratingType,
        score: selectedScore
      });

      if (result.success) {
        toast({
          title: '✅ Avaliação enviada!',
          description: `Você avaliou ${ratedName} com ${selectedScore} ⭐`
        });

        if (onRatingSubmit) {
          onRatingSubmit();
        }

        setTimeout(() => {
          onClose();
          setSelectedScore(0);
        }, 500);
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: result.error?.message || 'Não foi possível enviar a avaliação'
        });
      }
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Ocorreu um erro ao enviar sua avaliação'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const typeLabel = ratingType === 'host' ? 'Anfitrião' : 'Participante';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-effect rounded-2xl p-8 border border-white/10 max-w-sm w-full mx-4 space-y-6 animate-in fade-in zoom-in duration-300">
        
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">Avaliar {typeLabel}</h2>
          <p className="text-lg text-purple-200 font-semibold">{ratedName}</p>
          <p className="text-sm text-white/60">
            {ratingType === 'host'
              ? 'Como foi sua experiência com o anfitrião?'
              : 'Como foi sua experiência com este participante?'}
          </p>
        </div>

        <div className="flex justify-center gap-4">
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              onClick={() => handleStarClick(score)}
              onMouseEnter={() => setHoveredStar(score)}
              onMouseLeave={() => setHoveredStar(0)}
              disabled={isLoading}
              className="group relative transition-transform hover:scale-125 disabled:opacity-50"
            >
              <Star
                size={48}
                className={`transition-all duration-200 ${
                  score <= (hoveredStar || selectedScore)
                    ? 'fill-yellow-400 text-yellow-400 drop-shadow-lg'
                    : 'text-white/30 hover:text-yellow-300'
                }`}
              />
              <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {score === 1 && 'Ruim'}
                {score === 2 && 'Regular'}
                {score === 3 && 'Bom'}
                {score === 4 && 'Muito Bom'}
                {score === 5 && 'Excelente'}
              </span>
            </button>
          ))}
        </div>

        {selectedScore > 0 && (
          <div className="text-center bg-white/5 rounded-lg p-3 border border-white/10">
            <p className="text-white/80 text-sm">Sua avaliação:</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{selectedScore} ⭐</p>
          </div>
        )}

        {existingRating && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-sm text-blue-200">
              💡 Você já avaliou este {ratingType === 'host' ? 'anfitrião' : 'participante'}. 
              Clique em &apos;Enviar&apos; para atualizar sua avaliação.
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            onClick={onClose}
            disabled={isLoading}
            variant="outline"
            className="flex-1 border-white/20 text-white hover:bg-white/10"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedScore || isLoading}
            className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold"
          >
            {isLoading ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>

        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 text-white/60 hover:text-white disabled:opacity-50 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

RatingModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  eventId: PropTypes.number.isRequired,
  raterId: PropTypes.string.isRequired,
  ratedId: PropTypes.string.isRequired,
  ratedName: PropTypes.string.isRequired,
  ratingType: PropTypes.oneOf(['host', 'participant']).isRequired,
  onRatingSubmit: PropTypes.func
};

export default RatingModal;