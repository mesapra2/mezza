// src/hooks/useCleanupEffect.js
// Hook personalizado para garantir cleanup adequado de timers e intervals

import { useEffect, useRef } from 'react';

/**
 * Hook que gerencia automaticamente cleanup de intervals e timeouts
 * @param {Function} callback - Função a ser executada
 * @param {number} delay - Delay em milissegundos
 * @param {Array} deps - Dependências do useEffect
 * @param {Object} options - Opções { type: 'interval' | 'timeout', immediate: boolean }
 */
export const useCleanupTimer = (callback, delay, deps = [], options = {}) => {
  const { type = 'interval', immediate = false } = options;
  const timerRef = useRef(null);
  const callbackRef = useRef(callback);

  // Atualizar callback sem resetar o timer
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    const tick = () => callbackRef.current();

    // Executar imediatamente se solicitado
    if (immediate) {
      tick();
    }

    // Configurar timer
    if (type === 'interval') {
      timerRef.current = setInterval(tick, delay);
    } else if (type === 'timeout') {
      timerRef.current = setTimeout(tick, delay);
    }

    // Cleanup automático
    return () => {
      if (timerRef.current) {
        if (type === 'interval') {
          clearInterval(timerRef.current);
        } else {
          clearTimeout(timerRef.current);
        }
        timerRef.current = null;
      }
    };
  }, [delay, type, immediate, ...deps]);

  // Função para limpar manualmente
  const clearTimer = () => {
    if (timerRef.current) {
      if (type === 'interval') {
        clearInterval(timerRef.current);
      } else {
        clearTimeout(timerRef.current);
      }
      timerRef.current = null;
    }
  };

  return { clearTimer, isActive: !!timerRef.current };
};

/**
 * Hook para cleanup de event listeners
 */
export const useEventListener = (target, event, handler, options = {}) => {
  useEffect(() => {
    const targetElement = target?.current || target;
    if (!targetElement?.addEventListener) return;

    targetElement.addEventListener(event, handler, options);

    return () => {
      targetElement.removeEventListener(event, handler, options);
    };
  }, [target, event, handler]);
};

/**
 * Hook para cleanup de abort controllers
 */
export const useAbortController = () => {
  const controllerRef = useRef(null);

  const getController = () => {
    if (controllerRef.current?.signal.aborted || !controllerRef.current) {
      controllerRef.current = new AbortController();
    }
    return controllerRef.current;
  };

  const abort = () => {
    if (controllerRef.current && !controllerRef.current.signal.aborted) {
      controllerRef.current.abort();
    }
  };

  useEffect(() => {
    return () => {
      abort();
    };
  }, []);

  return { getController, abort, signal: controllerRef.current?.signal };
};

export default useCleanupTimer;