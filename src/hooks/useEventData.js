// src/hooks/useEventData.js
// Hook otimizado para carregar dados de evento com cache e debounce

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

const CACHE_TTL = 30000; // 30 segundos
const eventCache = new Map();

export const useEventData = (eventId, userId) => {
  const [event, setEvent] = useState(null);
  const [creator, setCreator] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [userParticipation, setUserParticipation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const abortControllerRef = useRef(null);
  const cacheKey = `event_${eventId}`;

  const fetchEventData = useCallback(async (useCache = true) => {
    // Cancelar requisição anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    try {
      setLoading(true);
      setError(null);

      // Verificar cache primeiro
      if (useCache && eventCache.has(cacheKey)) {
        const cached = eventCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
          setEvent(cached.data.event);
          setCreator(cached.data.creator);
          setParticipants(cached.data.participants);
          setUserParticipation(cached.data.userParticipation);
          setLoading(false);
          return;
        }
      }

      console.log('🔄 Carregando dados do evento (otimizado):', eventId);

      // Query otimizada - buscar evento com partner em uma query
      const eventQuery = supabase
        .from('events')
        .select(`
          *,
          partners (
            id,
            name,
            address
          )
        `)
        .eq('id', eventId)
        .single();

      if (signal.aborted) return;

      const { data: eventData, error: eventError } = await eventQuery;
      
      if (eventError) throw eventError;
      if (!eventData) throw new Error('Evento não encontrado');

      // Queries paralelas para otimizar carregamento
      const promises = [];

      // 1. Buscar creator
      promises.push(
        supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, public_profile')
          .eq('id', eventData.creator_id)
          .maybeSingle()
      );

      // 2. Buscar participação do usuário (se logado)
      if (userId) {
        promises.push(
          supabase
            .from('event_participants')
            .select('*')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .eq('status', 'aprovado')
            .maybeSingle()
        );
      } else {
        promises.push(Promise.resolve({ data: null }));
      }

      // 3. Buscar participantes aprovados (otimizado com join)
      promises.push(
        supabase
          .from('event_participants')
          .select(`
            user_id,
            participant:profiles (
              id,
              username,
              full_name,
              avatar_url,
              public_profile
            )
          `)
          .eq('event_id', eventId)
          .eq('status', 'aprovado')
      );

      if (signal.aborted) return;

      const [creatorResult, userPartResult, participantsResult] = await Promise.all(promises);

      if (signal.aborted) return;

      const creatorData = creatorResult.data;
      const userPartData = userPartResult.data;
      const participantsData = participantsResult.data?.map(p => p.participant).filter(Boolean) || [];

      // Cache dos resultados
      const cacheData = {
        timestamp: Date.now(),
        data: {
          event: eventData,
          creator: creatorData,
          participants: participantsData,
          userParticipation: userPartData
        }
      };
      
      eventCache.set(cacheKey, cacheData);

      // Limpar cache antigo
      setTimeout(() => {
        if (eventCache.has(cacheKey)) {
          const cached = eventCache.get(cacheKey);
          if (Date.now() - cached.timestamp >= CACHE_TTL) {
            eventCache.delete(cacheKey);
          }
        }
      }, CACHE_TTL);

      setEvent(eventData);
      setCreator(creatorData);
      setParticipants(participantsData);
      setUserParticipation(userPartData);

    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('❌ Erro ao carregar evento:', err);
        setError(err.message || 'Erro ao carregar detalhes do evento');
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [eventId, userId, cacheKey]);

  // Função para invalidar cache e recarregar
  const refreshData = useCallback(() => {
    eventCache.delete(cacheKey);
    return fetchEventData(false);
  }, [cacheKey, fetchEventData]);

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchEventData]);

  return {
    event,
    creator,
    participants,
    userParticipation,
    loading,
    error,
    refreshData
  };
};