// src/utils/prodLogger.js
// Logger otimizado para produção - substitui console.log direto

const isDev = import.meta.env.MODE === 'development';
const isDebugEnabled = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('DEBUG_LOGS') === 'true';
};

const shouldLog = isDev || isDebugEnabled();

export const logger = {
  // Debug: apenas em desenvolvimento ou se habilitado explicitamente
  debug: (...args) => {
    if (shouldLog) {
      console.log('🔍', ...args);
    }
  },

  // Info: informações importantes mesmo em produção
  info: (...args) => {
    if (shouldLog) {
      console.info('ℹ️', ...args);
    }
  },

  // Warning: sempre mostrar
  warn: (...args) => {
    console.warn('⚠️', ...args);
  },

  // Error: sempre mostrar
  error: (...args) => {
    console.error('❌', ...args);
  },

  // Performance: métricas de performance
  perf: (label, fn) => {
    if (!shouldLog) return fn();
    
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    
    console.log(`⚡ ${label}: ${(end - start).toFixed(2)}ms`);
    return result;
  },

  // Success: operações bem-sucedidas
  success: (...args) => {
    if (shouldLog) {
      console.log('✅', ...args);
    }
  },

  // Methods para habilitar/desabilitar debug em produção
  enableDebug: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('DEBUG_LOGS', 'true');
      console.log('🔧 Debug logs habilitados');
    }
  },

  disableDebug: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('DEBUG_LOGS');
      console.log('🔇 Debug logs desabilitados');
    }
  }
};

// Exportar como default também
export default logger;