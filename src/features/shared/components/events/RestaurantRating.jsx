import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Star, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/features/shared/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

const RestaurantRating = ({ eventId, restaurantId, restaurantName, onRatingSubmit }) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restaurantData, setRestaurantData] = useState(null);
  const [selectedScore, setSelectedScore] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  const checkIfRated = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('restaurant_ratings')
        .select('id, score')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setHasRated(true);
        setSelectedScore(data.score);
      }
    } catch (err) {
      console.error('Erro ao verificar avaliação:', err);
    }
  }, [eventId, restaurantId, user.id]);

  const loadRestaurantData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (restaurantId) {
        const { data: restaurant, error: restaurantError } = await supabase
          .from('partners')
          .select('id, name, address, rating')
          .eq('id', restaurantId)
          .single();

        if (restaurantError) throw restaurantError;
        setRestaurantData(restaurant);
      }

      await checkIfRated();
    } catch (err) {
      console.error('Erro ao carregar dados do restaurante:', err);
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
}, [restaurantId, checkIfRated]);
  useEffect(() => {
    if (eventId && user && restaurantId) {
      loadRestaurantData();
    }
  }, [eventId, user, restaurantId, loadRestaurantData]);

  const handleSubmitRating = async () => {
    if (!selectedScore) {
      toast({
        variant: 'destructive',
        title: 'Selecione uma avaliação',
        description: 'Por favor, clique em uma estrela para avaliar o restaurante'
      });
      return;
    }

    try {
      setIsSubmitting(true);

      if (hasRated) {
        const { error } = await supabase
          .from('restaurant_ratings')
          .update({ score: selectedScore, updated_at: new Date().toISOString() })
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .eq('restaurant_id', restaurantId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('restaurant_ratings')
          .insert({
            event_id: eventId,
            user_id: user.id,
            restaurant_id: restaurantId,
            score: selectedScore
          });

        if (error) throw error;
        setHasRated(true);
      }

      toast({
        title: '✅ Avaliação enviada!',
        description: `Você avaliou ${restaurantName} com ${selectedScore} ⭐`
      });

      if (onRatingSubmit) {
        onRatingSubmit();
      }
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Ocorreu um erro ao enviar sua avaliação'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-white/60 text-center py-8">Carregando informações do restaurante...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
        <p className="text-red-200">{error}</p>
        <button
          onClick={() => loadRestaurantData()}
          className="mt-4 px-4 py-2 bg-red-600/50 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass-effect rounded-2xl p-6 border border-white/10">
        <h2 className="text-xl font-bold text-white mb-4">🍽️ Avaliar Restaurante</h2>

        {restaurantData && (
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">{restaurantData.name}</h3>
              <p className="text-sm text-white/60">{restaurantData.address}</p>
              {restaurantData.rating && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i < Math.floor(restaurantData.rating || 0)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-white/20'
                        }
                      />
                    ))}
                  </div>
                  <span className="text-xs text-white/60">{restaurantData.rating || '0'} média</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <label className="text-white/80 text-sm font-medium block">
            Sua Avaliação <span className="text-red-400">*</span>
          </label>

          <div className="flex justify-start gap-3">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                onClick={() => setSelectedScore(score)}
                onMouseEnter={() => setHoveredStar(score)}
                onMouseLeave={() => setHoveredStar(0)}
                disabled={isSubmitting}
                className="group relative transition-transform hover:scale-125 disabled:opacity-50"
              >
                <Star
                  size={40}
                  className={`transition-all duration-200 ${
                    score <= (hoveredStar || selectedScore)
                      ? 'fill-yellow-400 text-yellow-400 drop-shadow-lg'
                      : 'text-white/30 hover:text-yellow-300'
                  }`}
                />
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
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

          {hasRated && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <p className="text-sm text-green-200 flex items-center gap-2">
                <Check size={16} className="text-green-400" />
                ✅ Você já avaliou este restaurante. Clique em &apos;Enviar&apos; para atualizar sua avaliação.
              </p>
            </div>
          )}

          <button
            onClick={handleSubmitRating}
            disabled={!selectedScore || isSubmitting}
            className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Avaliação'}
          </button>
        </div>
      </div>
    </div>
  );
};

RestaurantRating.propTypes = {
  eventId: PropTypes.number.isRequired,
  restaurantId: PropTypes.string.isRequired,
  restaurantName: PropTypes.string.isRequired,
  onRatingSubmit: PropTypes.func
};

export default RestaurantRating;