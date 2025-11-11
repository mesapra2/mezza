// src/hooks/useOptimizedInterval.js
// Hook para intervalos otimizados que pausam quando tab está inativa

import { useEffect, useRef, useCallback } from 'react';

export const useOptimizedInterval = (callback, delay, dependencies = []) => {
  const savedCallback = useRef(callback);
  const intervalRef = useRef(null);
  const isActiveRef = useRef(true);

  // Atualizar callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Detectar se tab está ativa
  useEffect(() => {
    const handleVisibilityChange = () => {
      isActiveRef.current = !document.hidden;
      
      if (document.hidden) {
        // Tab inativa - pausar interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        // Tab ativa - retomar interval
        if (delay !== null && !intervalRef.current) {
          intervalRef.current = setInterval(() => {
            if (isActiveRef.current) {
              savedCallback.current();
            }
          }, delay);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [delay]);

  // Configurar interval
  useEffect(() => {
    if (delay !== null && isActiveRef.current) {
      intervalRef.current = setInterval(() => {
        if (isActiveRef.current) {
          savedCallback.current();
        }
      }, delay);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [delay, ...dependencies]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Função para forçar execução
  const executeNow = useCallback(() => {
    if (isActiveRef.current) {
      savedCallback.current();
    }
  }, []);

  return executeNow;
};