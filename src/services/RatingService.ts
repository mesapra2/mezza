// src/services/RatingService.ts
import { supabase } from '../lib/supabaseClient';

export type RatingType = 'host' | 'participant' | 'restaurant';

interface Rating {
  id: string;
  event_id: number;
  rater_id: string;
  rated_id: string;
  rating_type: RatingType;
  score: number;
  created_at?: string;
  updated_at?: string;
}

interface CreateRatingParams {
  eventId: number;
  raterId: string;
  ratedId: string;
  ratingType: RatingType;
  score: number;
}

interface RatingResult {
  success: boolean;
  data?: Rating;
  error?: any;
}

interface UserRatings {
  success: boolean;
  averageScore?: number;
  totalRatings?: number;
  hostRatings?: number;
  participantRatings?: number;
  error?: any;
}

interface EventRatingsStatus {
  success: boolean;
  data?: {
    totalParticipants: number;
    hostRatingsReceived: number;
    participantRatingsReceived: number;
    restaurantRatingsReceived: number;
    allRatingsComplete: boolean;
    pendingRaters: Array<{
      user_id: string;
      username: string;
      evaluated_host: boolean;
      evaluated_participants: boolean;
      evaluated_restaurant: boolean;
    }>;
  };
  error?: any;
}

class RatingService {
  static async createRating(params: CreateRatingParams): Promise<RatingResult> {
    try {
      if (params.score < 1 || params.score > 5) {
        return {
          success: false,
          error: 'Score deve estar entre 1 e 5'
        };
      }

      if (!['host', 'participant', 'restaurant'].includes(params.ratingType)) {
        return {
          success: false,
          error: 'Tipo de avaliação inválido'
        };
      }

      const { data: existingRating, error: checkError } = await supabase
        .from('ratings')
        .select('id')
        .eq('event_id', params.eventId)
        .eq('rater_id', params.raterId)
        .eq('rated_id', params.ratedId)
        .eq('rating_type', params.ratingType)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingRating) {
        return this.updateRating(existingRating.id, params.score);
      }

      const { data, error } = await supabase
        .from('ratings')
        .insert({
          event_id: params.eventId,
          rater_id: params.raterId,
          rated_id: params.ratedId,
          rating_type: params.ratingType,
          score: params.score
        })
        .select()
        .single();

      if (error) throw error;

      await this.updateParticipationEvaluationFlag(params.eventId, params.raterId);

      console.log(`✅ Avaliação criada: ${params.raterId} avaliou ${params.ratedId} com ${params.score} ⭐`);
      return { success: true, data: data as Rating };
    } catch (error) {
      console.error('❌ Erro ao criar avaliação:', error);
      return { success: false, error };
    }
  }

  static async updateRating(ratingId: string, newScore: number): Promise<RatingResult> {
    try {
      if (newScore < 1 || newScore > 5) {
        return {
          success: false,
          error: 'Score deve estar entre 1 e 5'
        };
      }

      const { data, error } = await supabase
        .from('ratings')
        .update({
          score: newScore,
          updated_at: new Date().toISOString()
        })
        .eq('id', ratingId)
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Avaliação atualizada: ${ratingId} → ${newScore} ⭐`);
      return { success: true, data: data as Rating };
    } catch (error) {
      console.error('❌ Erro ao atualizar avaliação:', error);
      return { success: false, error };
    }
  }

  static async getUserRatings(userId: string): Promise<UserRatings> {
    try {
      const { data: ratings, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('rated_id', userId);

      if (error) throw error;

      const ratingsList = (ratings || []) as Rating[];
      const hostRatings = ratingsList.filter(r => r.rating_type === 'host');
      const participantRatings = ratingsList.filter(r => r.rating_type === 'participant');

      const allScores = ratingsList.map(r => r.score);
      const averageScore = allScores.length > 0
        ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
        : 0;

      return {
        success: true,
        averageScore,
        totalRatings: ratingsList.length,
        hostRatings: hostRatings.length,
        participantRatings: participantRatings.length
      };
    } catch (error) {
      console.error('❌ Erro ao buscar avaliações do usuário:', error);
      return { success: false, error };
    }
  }

  static async getEventRatings(eventId: number): Promise<RatingResult> {
    try {
      const { data: ratings, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: ratings as any
      };
    } catch (error) {
      console.error('❌ Erro ao buscar avaliações do evento:', error);
      return { success: false, error };
    }
  }

  // 🔒 NOVO: Verifica status completo de avaliações incluindo restaurante
  static async getEventRatingsStatus(eventId: number): Promise<EventRatingsStatus> {
    try {
      const { data: participants, error: participantsError } = await supabase
        .from('participations')
        .select('id, user_id, presenca_confirmada, profile:profiles!user_id(id, username)')
        .eq('event_id', eventId)
        .eq('presenca_confirmada', true);

      if (participantsError) throw participantsError;

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('creator_id, partner_id')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      const { data: allRatings, error: ratingsError } = await supabase
        .from('ratings')
        .select('rater_id, rated_id, rating_type')
        .eq('event_id', eventId);

      if (ratingsError) throw ratingsError;

      const participantsList = (participants || []) as any[];
      const ratingsList = (allRatings || []) as Rating[];

      const hostRatingsReceived = ratingsList.filter(r => r.rating_type === 'host').length;
      const participantRatingsReceived = ratingsList.filter(r => r.rating_type === 'participant').length;
      const restaurantRatingsReceived = ratingsList.filter(r => r.rating_type === 'restaurant').length;

      // 🍽️ Pega o ID do restaurante (partner_id)
      const restaurantId = (event as any).partner_id;

      const pendingRaters = participantsList
        .map(p => {
          const userId = p.user_id;
          const username = p.profile?.username || 'Usuário';

          const raterRatings = ratingsList.filter(r => r.rater_id === userId);
          const evaluatedHost = raterRatings.some(r => r.rating_type === 'host');
          const evaluatedParticipants = raterRatings.some(r => r.rating_type === 'participant');
          const evaluatedRestaurant = raterRatings.some(r => r.rating_type === 'restaurant' && r.rated_id === restaurantId);

          return {
            user_id: userId,
            username: username,
            evaluated_host: evaluatedHost,
            evaluated_participants: evaluatedParticipants,
            evaluated_restaurant: evaluatedRestaurant
          };
        })
        .filter(p => !p.evaluated_host || !p.evaluated_participants || !p.evaluated_restaurant);

      // ✅ Só completo se TODOS avaliaram TUDO e há participantes
      const allRatingsComplete = pendingRaters.length === 0 && participantsList.length > 0;

      return {
        success: true,
        data: {
          totalParticipants: participantsList.length,
          hostRatingsReceived,
          participantRatingsReceived,
          restaurantRatingsReceived,
          allRatingsComplete,
          pendingRaters
        }
      };
    } catch (error) {
      console.error('❌ Erro ao buscar status de avaliações:', error);
      return { success: false, error };
    }
  }

  static async hasUserRated(
    eventId: number,
    raterId: string,
    ratedId: string,
    ratingType: RatingType
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('id')
        .eq('event_id', eventId)
        .eq('rater_id', raterId)
        .eq('rated_id', ratedId)
        .eq('rating_type', ratingType)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      return !!data;
    } catch (error) {
      console.error('❌ Erro ao verificar avaliação:', error);
      return false;
    }
  }

  static async getRating(
    eventId: number,
    raterId: string,
    ratedId: string,
    ratingType: RatingType
  ): Promise<Rating | null> {
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select('*')
        .eq('event_id', eventId)
        .eq('rater_id', raterId)
        .eq('rated_id', ratedId)
        .eq('rating_type', ratingType)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      return data as Rating | null;
    } catch (error) {
      console.error('❌ Erro ao buscar avaliação específica:', error);
      return null;
    }
  }

  // 🔒 CORRIGIDO: Verifica se TODAS as avaliações REQUERIDAS foram feitas
  static async updateParticipationEvaluationFlag(eventId: number, participantId: string): Promise<void> {
    try {
      const { data: participation, error: partError } = await supabase
        .from('participations')
        .select('id, event_id')
        .eq('event_id', eventId)
        .eq('user_id', participantId)
        .maybeSingle();

      if (partError) throw partError;
      if (!participation) return;

      // 1. 🔍 Buscar evento para pegar partner_id (restaurante) E creator_id (host)
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('partner_id, creator_id')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      // 2. 🔍 Verificar se há outros participantes (além do próprio avaliador e do host)
      const { count: otherParticipantsCount, error: countError } = await supabase
        .from('participations')
        .select('user_id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('presenca_confirmada', true)                 // Que compareceram
        .neq('user_id', participantId)                   // Que não seja eu
        .neq('user_id', event.creator_id);               // Que não seja o host

      if (countError) throw countError;

      // 3. 🎯 Definir o que é obrigatório
      const restaurantRatingRequired = !!event.partner_id;
      const participantRatingsRequired = (otherParticipantsCount || 0) > 0;
      
      console.log(`[Avaliação] Evento ${eventId} | User ${participantId}:`);
      console.log(`- Restaurante é obrigatório? ${restaurantRatingRequired} (ID: ${event.partner_id})`);
      console.log(`- Participantes é obrigatório? ${participantRatingsRequired} (Count: ${otherParticipantsCount})`);

      // 4. 🔍 Buscar avaliações existentes do usuário
      const { data: ratings, error: ratingsError } = await supabase
        .from('ratings')
        .select('rating_type, rated_id')
        .eq('event_id', eventId)
        .eq('rater_id', participantId);

      if (ratingsError) throw ratingsError;
      
      const userRatings = ratings || [];

      // 5. 🚦 Verificar o status de cada tipo de avaliação
      const hasHostRating = userRatings.some(r => r.rating_type === 'host');
      
      const hasParticipantRatings = !participantRatingsRequired || 
        userRatings.some(r => r.rating_type === 'participant');
        
      const hasRestaurantRating = !restaurantRatingRequired || 
        userRatings.some(r => r.rating_type === 'restaurant' && r.rated_id === event.partner_id);

      console.log(`- Status: Host=${hasHostRating}, Participantes=${hasParticipantRatings}, Restaurante=${hasRestaurantRating}`);

      // ✅ Só marca como concluído se TODAS as avaliações REQUERIDAS foram feitas
      if (hasHostRating && hasParticipantRatings && hasRestaurantRating) {
        await supabase
          .from('participations')
          .update({ avaliacao_feita: true, updated_at: new Date().toISOString() })
          .eq('id', participation.id);

        console.log(`✅ ${participantId} completou TODAS as avaliações do evento ${eventId}`);
      } else {
        console.log(`⏳ ${participantId} ainda tem avaliações pendentes para o evento ${eventId}`);
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar flag de avaliação:', error);
    }
  }

  static async deleteRating(ratingId: string): Promise<RatingResult> {
    try {
      const { error } = await supabase
        .from('ratings')
        .delete()
        .eq('id', ratingId);

      if (error) throw error;

      console.log(`✅ Avaliação deletada: ${ratingId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao deletar avaliação:', error);
      return { success: false, error };
    }
  }
}

export default RatingService;