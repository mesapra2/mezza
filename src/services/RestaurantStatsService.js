// src/services/RestaurantStatsService.js
// Serviço para buscar estatísticas de eventos dos restaurantes

import { supabase } from '@/lib/supabaseClient';

class RestaurantStatsService {
  // Cache de estatísticas para evitar requests repetidos
  static statsCache = new Map();
  static CACHE_TTL = 60000; // 1 minuto

  /**
   * Busca estatísticas de eventos de um restaurante
   */
  static async getRestaurantEventStats(partnerId) {
    if (!partnerId) return { totalEvents: 0, recentEvents: 0 };

    const cacheKey = `restaurant_stats_${partnerId}`;
    const cached = this.statsCache.get(cacheKey);
    
    // Verificar cache
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Buscar eventos do restaurante
      const { data: events, error } = await supabase
        .from('events')
        .select('id, status, created_at, end_time')
        .eq('partner_id', partnerId)
        .in('status', ['Finalizado', 'Concluído']); // Apenas eventos realizados

      if (error && !error.message.includes('does not exist')) {
        console.error('Erro ao buscar estatísticas do restaurante:', error);
        return { totalEvents: 0, recentEvents: 0 };
      }

      if (!events) {
        return { totalEvents: 0, recentEvents: 0 };
      }

      const totalEvents = events.length;
      
      // Contar eventos dos últimos 3 meses
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const recentEvents = events.filter(event => {
        const eventDate = new Date(event.end_time || event.created_at);
        return eventDate > threeMonthsAgo;
      }).length;

      const stats = { totalEvents, recentEvents };
      
      // Salvar no cache
      this.statsCache.set(cacheKey, {
        data: stats,
        timestamp: Date.now()
      });

      return stats;
      
    } catch (error) {
      console.error('Erro ao buscar stats do restaurante:', error);
      return { totalEvents: 0, recentEvents: 0 };
    }
  }

  /**
   * Busca estatísticas de múltiplos restaurantes de uma vez
   */
  static async getMultipleRestaurantStats(partnerIds) {
    if (!partnerIds || partnerIds.length === 0) return {};

    // Verificar quais já estão em cache
    const statsMap = {};
    const missingIds = [];

    partnerIds.forEach(partnerId => {
      const cacheKey = `restaurant_stats_${partnerId}`;
      const cached = this.statsCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        statsMap[partnerId] = cached.data;
      } else {
        missingIds.push(partnerId);
      }
    });

    // Buscar apenas os que não estão em cache
    if (missingIds.length > 0) {
      try {
        const { data: events, error } = await supabase
          .from('events')
          .select('id, partner_id, status, created_at, end_time')
          .in('partner_id', missingIds)
          .in('status', ['Finalizado', 'Concluído']);

        if (error && !error.message.includes('does not exist')) {
          console.error('Erro ao buscar estatísticas múltiplas:', error);
          // Retornar zeros para IDs faltantes
          missingIds.forEach(id => {
            statsMap[id] = { totalEvents: 0, recentEvents: 0 };
          });
          return statsMap;
        }

        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        // Processar estatísticas por restaurante
        missingIds.forEach(partnerId => {
          const partnerEvents = events?.filter(e => e.partner_id === partnerId) || [];
          const totalEvents = partnerEvents.length;
          const recentEvents = partnerEvents.filter(event => {
            const eventDate = new Date(event.end_time || event.created_at);
            return eventDate > threeMonthsAgo;
          }).length;

          const stats = { totalEvents, recentEvents };
          
          // Cachear
          const cacheKey = `restaurant_stats_${partnerId}`;
          this.statsCache.set(cacheKey, {
            data: stats,
            timestamp: Date.now()
          });

          statsMap[partnerId] = stats;
        });

      } catch (error) {
        console.error('Erro ao buscar estatísticas múltiplas:', error);
        missingIds.forEach(id => {
          statsMap[id] = { totalEvents: 0, recentEvents: 0 };
        });
      }
    }

    return statsMap;
  }

  /**
   * Limpar cache (útil para debug ou refresh forçado)
   */
  static clearCache() {
    this.statsCache.clear();
    console.log('🧹 Cache de estatísticas de restaurantes limpo');
  }

  /**
   * Invalidar cache de um restaurante específico
   */
  static invalidateRestaurant(partnerId) {
    const cacheKey = `restaurant_stats_${partnerId}`;
    this.statsCache.delete(cacheKey);
  }
}

export default RestaurantStatsService;