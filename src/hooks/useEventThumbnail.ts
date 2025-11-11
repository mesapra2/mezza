/**
 * useEventThumbnail Hook
 *
 * Hook customizado para gerenciar thumbnails de eventos
 * Busca automaticamente a última foto do carousel do restaurante
 * durante o período do evento
 */

import { useState, useEffect } from 'react';
import { RestaurantCarouselService, ThumbnailResult } from '@/services/RestaurantCarouselService';

export interface EventForThumbnail {
  id: string;
  event_type?: string;
  partner?: {
    id: string;
    [key: string]: any;
  };
  restaurant_id?: string;
  start_time: string;
  end_time?: string;
}

export interface ThumbnailState {
  url: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook para buscar e gerenciar thumbnail de um evento
 * @param event - Dados do evento
 * @param enabled - Se deve buscar o thumbnail (padrão: true)
 * @returns Estado do thumbnail
 */
export function useEventThumbnail(
  event: EventForThumbnail | null,
  enabled: boolean = true
): ThumbnailState {
  const [state, setState] = useState<ThumbnailState>({
    url: null,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    // Não buscar se desabilitado ou sem evento
    if (!enabled || !event) {
      setState({ url: null, isLoading: false, error: null });
      return;
    }

    // Verificar se é evento de restaurante/partner
    const isRestaurantEvent = event.event_type === 'restaurante' ||
                             event.event_type === 'institucional' ||
                             !!event.partner ||
                             !!event.restaurant_id;

    if (!isRestaurantEvent) {
      setState({ url: null, isLoading: false, error: null });
      return;
    }

    // Obter ID do restaurante
    const restaurantId = event.restaurant_id || event.partner?.id;

    if (!restaurantId) {
      setState({ url: null, isLoading: false, error: 'ID do restaurante não encontrado' });
      return;
    }

    // Buscar thumbnail
    const fetchThumbnail = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const result: ThumbnailResult = await RestaurantCarouselService.getEventThumbnail(
          event.id,
          restaurantId,
          event.start_time,
          event.end_time
        );

        setState({
          url: result.url,
          isLoading: false,
          error: result.error || null,
        });
      } catch (error: any) {
        console.error('Erro ao buscar thumbnail:', error);
        setState({
          url: null,
          isLoading: false,
          error: error.message || 'Erro desconhecido',
        });
      }
    };

    fetchThumbnail();
  }, [event?.id, event?.restaurant_id, event?.partner?.id, event?.start_time, event?.end_time, enabled]);

  return state;
}

/**
 * Hook para buscar múltiplos thumbnails de uma lista de eventos
 * Otimizado para evitar múltiplas requisições simultâneas
 * @param events - Lista de eventos
 * @param enabled - Se deve buscar os thumbnails (padrão: true)
 * @returns Map de thumbnails por eventId
 */
export function useEventThumbnails(
  events: EventForThumbnail[],
  enabled: boolean = true
): Map<string, ThumbnailState> {
  const [thumbnails, setThumbnails] = useState<Map<string, ThumbnailState>>(new Map());

  useEffect(() => {
    if (!enabled || !events || events.length === 0) {
      setThumbnails(new Map());
      return;
    }

    // Filtrar apenas eventos de restaurante
    const restaurantEvents = events.filter(event => {
      const isRestaurantEvent = event.event_type === 'restaurante' ||
                               event.event_type === 'institucional' ||
                               !!event.partner ||
                               !!event.restaurant_id;
      return isRestaurantEvent && (event.restaurant_id || event.partner?.id);
    });

    if (restaurantEvents.length === 0) {
      setThumbnails(new Map());
      return;
    }

    // Inicializar estado de loading para todos os eventos
    const initialMap = new Map<string, ThumbnailState>();
    restaurantEvents.forEach(event => {
      initialMap.set(event.id, { url: null, isLoading: true, error: null });
    });
    setThumbnails(initialMap);

    // Buscar thumbnails em paralelo (com limite de concorrência)
    const fetchThumbnails = async () => {
      const BATCH_SIZE = 5; // Processar 5 por vez para não sobrecarregar
      const results = new Map<string, ThumbnailState>();

      for (let i = 0; i < restaurantEvents.length; i += BATCH_SIZE) {
        const batch = restaurantEvents.slice(i, i + BATCH_SIZE);

        const promises = batch.map(async (event) => {
          const restaurantId = event.restaurant_id || event.partner?.id;
          if (!restaurantId) {
            return { eventId: event.id, state: { url: null, isLoading: false, error: 'ID do restaurante não encontrado' } };
          }

          try {
            const result = await RestaurantCarouselService.getEventThumbnail(
              event.id,
              restaurantId,
              event.start_time,
              event.end_time
            );

            return {
              eventId: event.id,
              state: {
                url: result.url,
                isLoading: false,
                error: result.error || null,
              },
            };
          } catch (error: any) {
            return {
              eventId: event.id,
              state: {
                url: null,
                isLoading: false,
                error: error.message || 'Erro desconhecido',
              },
            };
          }
        });

        const batchResults = await Promise.all(promises);
        batchResults.forEach(({ eventId, state }) => {
          results.set(eventId, state);
        });

        // Atualizar estado incrementalmente
        setThumbnails(new Map(results));
      }
    };

    fetchThumbnails();
  }, [events.map(e => e.id).join(','), enabled]);

  return thumbnails;
}

/**
 * Hook para forçar recarregamento de um thumbnail
 * Útil após upload de nova foto
 * @param eventId - ID do evento
 * @returns Função para recarregar
 */
export function useRefreshThumbnail(eventId: string) {
  const refresh = () => {
    RestaurantCarouselService.clearCache(eventId);
  };

  return refresh;
}
