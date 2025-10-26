import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Star, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import EventRating from './EventRating';
import RestaurantRating from './RestaurantRating';
import EventPhotoUpload from './EventPhotoUpload';

const EventEvaluationSection = ({
  eventId,
  isCreator,
  isParticipant,
  userId,
  creator,
  participants,
  event
}) => {
  const [userRatings, setUserRatings] = useState({
    hostRating: false,
    restaurantRating: false,
    photosUploaded: false
  });
  const [loading, setLoading] = useState(true);

  const checkUserRatings = useCallback(async () => {
    if (!eventId || !userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Verifica se já avaliou o anfitrião
      const { data: hostRating } = await supabase
        .from('ratings')
        .select('id')
        .eq('event_id', eventId)
        .eq('from_user_id', userId)
        .eq('to_user_id', creator?.id)
        .eq('rating_type', 'host')
        .maybeSingle();

      // Verifica se já avaliou o restaurante
      let restaurantRatingExists = false;
      if (event?.partner_id) {
        const { data: restaurantRating } = await supabase
          .from('restaurant_ratings')
          .select('id')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .eq('restaurant_id', event.partner_id)
          .maybeSingle();

        restaurantRatingExists = !!restaurantRating;
      }

      // Verifica se já enviou fotos
      const { data: photos } = await supabase
        .from('event_photos')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .limit(1);

      setUserRatings({
        hostRating: !!hostRating,
        restaurantRating: restaurantRatingExists,
        photosUploaded: (photos?.length || 0) > 0
      });
    } catch (error) {
      console.error('Erro ao verificar avaliações:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId, userId, creator?.id, event?.partner_id]);

  useEffect(() => {
    checkUserRatings();
  }, [checkUserRatings]);

  if (loading) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-effect rounded-2xl p-6 border border-purple-500/30 bg-purple-500/10">
        <div className="flex items-center gap-3 mb-4">
          <Star className="w-6 h-6 text-yellow-400" />
          <h2 className="text-2xl font-bold text-white">
            {isCreator ? 'Avalie Participantes e Restaurante' : 'Avaliações do Evento'}
          </h2>
        </div>
        <p className="text-white/70 text-sm">
          {isCreator
            ? 'Como anfitrião, você pode avaliar a experiência com os participantes e o restaurante.'
            : 'Compartilhe suas fotos e avaliações sobre este evento incrível!'}
        </p>
      </div>

      {/* Para PARTICIPANTES */}
      {!isCreator && isParticipant && (
        <>
          {/* Upload de Fotos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Camera className={`w-5 h-5 ${userRatings.photosUploaded ? 'text-green-400' : 'text-blue-400'}`} />
              <h3 className="text-xl font-semibold text-white">
                Compartilhe suas Fotos
                {userRatings.photosUploaded && <span className="text-green-400 ml-2">✅</span>}
              </h3>
            </div>
            <EventPhotoUpload eventId={eventId} />
          </div>

          {/* Rating do Anfitrião */}
          {creator && !userRatings.hostRating && (
            <EventRating
              eventId={eventId}
              hostId={creator.id}
              hostName={creator.username || creator.full_name}
              onAllRatingsComplete={checkUserRatings}
            />
          )}

          {userRatings.hostRating && (
            <div className="glass-effect rounded-2xl p-6 border border-green-500/20 bg-green-500/5">
              <p className="text-green-200 text-sm flex items-center gap-2">
                <Star className="w-4 h-4 text-green-400" />
                ✅ Você já avaliou o anfitrião
              </p>
            </div>
          )}

          {/* Rating do Restaurante */}
          {event?.partner && !userRatings.restaurantRating && (
            <RestaurantRating
              eventId={eventId}
              restaurantId={event.partner.id}
              restaurantName={event.partner.name}
              onRatingSubmit={checkUserRatings}
            />
          )}

          {userRatings.restaurantRating && (
            <div className="glass-effect rounded-2xl p-6 border border-green-500/20 bg-green-500/5">
              <p className="text-green-200 text-sm flex items-center gap-2">
                <Star className="w-4 h-4 text-green-400" />
                ✅ Você já avaliou o restaurante
              </p>
            </div>
          )}
        </>
      )}

      {/* Para ANFITRIÃO */}
      {isCreator && (
        <>
          {/* Rating dos Participantes */}
          {participants && participants.length > 0 && (
            <EventRating
              eventId={eventId}
              hostId={userId}
              hostName="Você"
              onAllRatingsComplete={checkUserRatings}
            />
          )}

          {/* Rating do Restaurante */}
          {event?.partner && (
            <RestaurantRating
              eventId={eventId}
              restaurantId={event.partner.id}
              restaurantName={event.partner.name}
              onRatingSubmit={checkUserRatings}
            />
          )}
        </>
      )}

      {/* Resumo de Conclusão */}
      {!isCreator && isParticipant && (
        <div className="glass-effect rounded-2xl p-4 border border-white/10 text-center">
          <p className="text-white/70 text-sm">
            {userRatings.hostRating && userRatings.restaurantRating
              ? '🎉 Você completou todas as avaliações! Obrigado por participar!'
              : '⏳ Complete as avaliações para concluir seu feedback'}
          </p>
        </div>
      )}
    </div>
  );
};

EventEvaluationSection.propTypes = {
  eventId: PropTypes.number.isRequired,
  isCreator: PropTypes.bool.isRequired,
  isParticipant: PropTypes.bool.isRequired,
  userId: PropTypes.string.isRequired,
  creator: PropTypes.object,
  participants: PropTypes.array,
  event: PropTypes.object
};

export default EventEvaluationSection;