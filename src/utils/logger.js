/**
 * 🔍 SISTEMA DE LOGS INTELIGENTE - MESAPRA2
 * 
 * Substitui console.log por sistema que funciona apenas em desenvolvimento
 * Em produção, os logs são desabilitados automaticamente
 */

const IS_DEV = import.meta.env.DEV || process.env.NODE_ENV === 'development';
const IS_DEBUG = IS_DEV && localStorage?.getItem('DEBUG_LOGS') === 'true';

// Níveis de log
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1, 
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

const CURRENT_LEVEL = IS_DEV ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR;

// Cores para cada nível (apenas dev)
const LOG_COLORS = {
  ERROR: '#ff4757',
  WARN: '#ffa726', 
  INFO: '#42a5f5',
  DEBUG: '#ab47bc',
  TRACE: '#78909c'
};

/**
 * Logger inteligente que substitui console.log
 */
class Logger {
  constructor(module = 'App') {
    this.module = module;
  }

  // Método interno para log
  _log(level, args, emoji = '') {
    if (LOG_LEVELS[level] > CURRENT_LEVEL) return;

    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const moduleTag = `[${this.module}]`;
    
    if (IS_DEV) {
      const style = `color: ${LOG_COLORS[level]}; font-weight: bold;`;
      console.log(`%c${emoji} ${timestamp} ${moduleTag}`, style, ...args);
    } else if (level === 'ERROR') {
      // Em produção, apenas erros críticos
      console.error(`${timestamp} ${moduleTag}`, ...args);
    }
  }

  // Métodos públicos
  error(...args) {
    this._log('ERROR', args, '❌');
  }

  warn(...args) {
    this._log('WARN', args, '⚠️');
  }

  info(...args) {
    this._log('INFO', args, 'ℹ️');
  }

  debug(...args) {
    this._log('DEBUG', args, '🔍');
  }

  trace(...args) {
    this._log('TRACE', args, '📋');
  }

  // Métodos temáticos para diferentes funcionalidades
  auth(...args) {
    this._log('INFO', args, '🔐');
  }

  api(...args) {
    this._log('INFO', args, '📡');
  }

  database(...args) {
    this._log('DEBUG', args, '💾');
  }

  ui(...args) {
    this._log('TRACE', args, '🎨');
  }

  performance(...args) {
    this._log('DEBUG', args, '⚡');
  }

  // Método para medir performance
  time(label) {
    if (IS_DEV) console.time(`⏱️ ${this.module} - ${label}`);
  }

  timeEnd(label) {
    if (IS_DEV) console.timeEnd(`⏱️ ${this.module} - ${label}`);
  }

  // Método para logs em grupo
  group(title, callback) {
    if (!IS_DEV) {
      callback();
      return;
    }

    console.group(`📁 ${this.module} - ${title}`);
    callback();
    console.groupEnd();
  }
}

/**
 * Factory function para criar loggers modulares
 */
export const createLogger = (module) => new Logger(module);

/**
 * Logger padrão
 */
export const logger = new Logger('MesaPra2');

/**
 * Função para ativar debug em produção (apenas para desenvolvimento)
 */
export const enableDebugMode = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('DEBUG_LOGS', 'true');
    window.location.reload();
  }
};

export const disableDebugMode = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('DEBUG_LOGS');
    window.location.reload();
  }
};

/**
 * Logs específicos para diferentes módulos
 */
export const authLogger = createLogger('Auth');
export const apiLogger = createLogger('API');
export const uiLogger = createLogger('UI');
export const dbLogger = createLogger('Database');
export const perfLogger = createLogger('Performance');

// Export como default para compatibilidade
export default logger;

/**
 * EXEMPLOS DE USO:
 * 
 * import { logger, authLogger, createLogger } from '@/utils/logger';
 * 
 * // Logger geral
 * logger.info('Aplicação iniciada');
 * logger.error('Erro crítico', error);
 * 
 * // Logger específico
 * authLogger.auth('Usuário logado:', user);
 * 
 * // Logger personalizado
 * const eventLogger = createLogger('Events');
 * eventLogger.debug('Evento criado:', event);
 * 
 * // Performance
 * logger.time('renderização');
 * // ... código ...
 * logger.timeEnd('renderização');
 * 
 * // Grouping
 * logger.group('Inicialização', () => {
 *   logger.info('Step 1');
 *   logger.info('Step 2');
 * });
 */