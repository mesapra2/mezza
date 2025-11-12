// src/utils/replaceConsoleLog.js
// Utilitário para migrar console.log para logger em arquivos existentes

import logger from './prodLogger.js';

/**
 * Helper para migração gradual de console.log para logger
 * Use este em arquivos legados enquanto migra
 */

const isDev = import.meta.env.MODE === 'development';

// Wrapper que mantém comportamento mas com melhor controle
export const smartLog = {
  // Debug: apenas em desenvolvimento
  debug: (...args) => {
    if (isDev) console.log('🔍', ...args);
  },
  
  // Info: importante mas condicional
  info: (...args) => {
    if (isDev) console.log('ℹ️', ...args);
  },
  
  // Success: operações bem-sucedidas  
  success: (...args) => {
    if (isDev) console.log('✅', ...args);
  },
  
  // Error: sempre mostrar
  error: (...args) => {
    console.error('❌', ...args);
  },
  
  // Warn: sempre mostrar
  warn: (...args) => {
    console.warn('⚠️', ...args);
  },
  
  // Service logs: para debugging de serviços
  service: (serviceName, action, ...args) => {
    if (isDev) {
      console.log(`🔧 ${serviceName}:${action}`, ...args);
    }
  },
  
  // Database logs: para queries
  db: (operation, table, ...args) => {
    if (isDev) {
      console.log(`🗄️ DB:${operation}:${table}`, ...args);
    }
  },
  
  // Performance logs
  perf: (label, duration) => {
    if (isDev) {
      console.log(`⚡ ${label}: ${duration}ms`);
    }
  }
};

// Export individual functions para facilitar import
export const { debug, info, success, error, warn, service, db, perf } = smartLog;

export default smartLog;