// src/hooks/usePresence.js
import { useState, useEffect, useCallback, useRef } from 'react';
import presenceService from '@/services/PresenceService';

/**
 * Hook para gerenciar presença de um único usuário
 */
export function usePresence(userId) {
  const [status, setStatus] = useState('offline');
  const [lastSeen, setLastSeen] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let unsubscribe;

    const fetchInitialPresence = async () => {
      try {
        setIsLoading(true);
        const presence = await presenceService.getUserPresence(userId);
        
        if (presence) {
          setStatus(presence.status);
          setLastSeen(presence.last_seen);
        } else {
          setStatus('offline');
        }
      } catch (error) {
        console.error('Erro ao buscar presença:', error);
        setStatus('offline');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialPresence();

    unsubscribe = presenceService.subscribeToPresence(
      [userId],
      (presence) => {
        setStatus(presence.status);
        setLastSeen(presence.last_seen);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId]);

  return {
    status,
    lastSeen,
    isLoading,
    isOnline: status === 'online',
    isAway: status === 'away',
    isOffline: status === 'offline',
  };
}

/**
 * Hook para gerenciar presença de múltiplos usuários
 */
export function useMultiplePresence(userIds = []) {
  const [presences, setPresences] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userIds || userIds.length === 0) {
      setPresences(new Map());
      setIsLoading(false);
      return;
    }

    let unsubscribe;

    const fetchInitialPresences = async () => {
      try {
        setIsLoading(true);
        const presenceMap = await presenceService.getMultipleUsersPresence(userIds);
        setPresences(presenceMap);
      } catch (error) {
        console.error('Erro ao buscar presenças:', error);
        setPresences(new Map());
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialPresences();

    unsubscribe = presenceService.subscribeToPresence(
      userIds,
      (updatedPresence) => {
        setPresences((prev) => {
          const newMap = new Map(prev);
          newMap.set(updatedPresence.user_id, updatedPresence);
          return newMap;
        });
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userIds.join(',')]);

  const getStatus = useCallback(
    (userId) => {
      return presences.get(userId)?.status || 'offline';
    },
    [presences]
  );

  const isOnline = useCallback(
    (userId) => {
      return getStatus(userId) === 'online';
    },
    [getStatus]
  );

  const isAway = useCallback(
    (userId) => {
      return getStatus(userId) === 'away';
    },
    [getStatus]
  );

  const isOffline = useCallback(
    (userId) => {
      return getStatus(userId) === 'offline';
    },
    [getStatus]
  );

  const getPresence = useCallback(
    (userId) => {
      return presences.get(userId) || null;
    },
    [presences]
  );

  return {
    presences,
    isLoading,
    getStatus,
    getPresence,
    isOnline,
    isAway,
    isOffline,
  };
}

/**
 * Hook para gerenciar presença do usuário atual
 */
export function useCurrentUserPresence(userId, enabled = true) {
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!userId || !enabled || hasStartedRef.current) return;

    hasStartedRef.current = true;
    presenceService.startTracking(userId);

    return () => {
      presenceService.stopTracking(userId);
      hasStartedRef.current = false;
    };
  }, [userId, enabled]);
}

export default usePresence;