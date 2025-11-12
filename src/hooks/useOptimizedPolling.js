// src/hooks/useOptimizedPolling.js
// Hook otimizado para polling que reduz frequência baseado no contexto

import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook de polling otimizado para performance
 * Reduz automaticamente a frequência baseado em:
 * - Se a aba está ativa
 * - Se é mobile
 * - Se há erro de rede
 */
export const useOptimizedPolling = (
  callback,
  baseInterval = 30000,
  options = {}
) => {
  const {
    enabled = true,
    retryOnError = true,
    maxRetries = 3,
    backoffMultiplier = 2,
    pauseOnHidden = true,
    mobileMultiplier = 2,
  } = options;

  const intervalRef = useRef(null);
  const retryCountRef = useRef(0);
  const isTabActiveRef = useRef(true);
  const callbackRef = useRef(callback);

  // Atualizar callback sem resetar polling
  useEffect(() => {
    callbackRef.current = callback;
  });

  // Detectar se é mobile
  const isMobile = () => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      window.navigator.userAgent
    );
  };

  // Calcular intervalo otimizado
  const getOptimizedInterval = useCallback(() => {
    let interval = baseInterval;
    
    // Mobile: intervalo maior
    if (isMobile()) {
      interval *= mobileMultiplier;
    }
    
    // Aba inativa: intervalo muito maior
    if (!isTabActiveRef.current && pauseOnHidden) {
      interval *= 4;
    }
    
    // Backoff em caso de erros consecutivos
    if (retryCountRef.current > 0) {
      interval *= Math.pow(backoffMultiplier, retryCountRef.current);
    }
    
    return Math.min(interval, 300000); // Máximo 5 minutos
  }, [baseInterval, mobileMultiplier, pauseOnHidden, backoffMultiplier]);

  // Wrapper do callback com error handling
  const wrappedCallback = useCallback(async () => {
    try {
      await callbackRef.current();
      retryCountRef.current = 0; // Reset retry count em sucesso
    } catch (error) {
      console.warn('Polling error:', error);
      
      if (retryOnError && retryCountRef.current < maxRetries) {
        retryCountRef.current++;
      } else {
        console.error('Max retries reached for polling');
      }
    }
  }, [retryOnError, maxRetries]);

  // Restart polling com novo intervalo
  const restartPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (enabled) {
      const interval = getOptimizedInterval();
      intervalRef.current = setInterval(wrappedCallback, interval);
      
      console.log(`🔄 Polling restarted: ${interval}ms (mobile: ${isMobile()}, active: ${isTabActiveRef.current})`);
    }
  }, [enabled, getOptimizedInterval, wrappedCallback]);

  // Gerenciar visibilidade da aba
  useEffect(() => {
    if (!pauseOnHidden) return;

    const handleVisibilityChange = () => {
      isTabActiveRef.current = !document.hidden;
      restartPolling(); // Restart com nova frequência
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pauseOnHidden, restartPolling]);

  // Iniciar/parar polling
  useEffect(() => {
    if (enabled) {
      // Executar imediatamente primeira vez
      wrappedCallback();
      
      // Depois iniciar polling
      restartPolling();
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, restartPolling, wrappedCallback]);

  // Funções de controle manual
  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    if (!intervalRef.current) {
      restartPolling();
    }
  }, [restartPolling]);

  const triggerNow = useCallback(() => {
    wrappedCallback();
  }, [wrappedCallback]);

  return {
    pause,
    resume,
    triggerNow,
    isActive: !!intervalRef.current,
    currentInterval: getOptimizedInterval(),
    retryCount: retryCountRef.current
  };
};

export default useOptimizedPolling;