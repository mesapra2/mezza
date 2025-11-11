// src/utils/chatModeration.js - Sistema de moderação de chat

/**
 * Lista de palavras e padrões considerados ofensivos ou inadequados
 */
const OFFENSIVE_WORDS = [
  // Palavrões comuns
  'porra', 'merda', 'caralho', 'puta', 'viado', 'bicha', 'buceta', 'cu',
  'fdp', 'filho da puta', 'vai tomar no cu', 'vtnc', 'vsf', 'vai se foder',
  
  // Discriminação e preconceito
  'negro de merda', 'macaco', 'favelado', 'burro', 'idiota', 'retardado',
  'mongol', 'down', 'autista', 'aleijado',
  
  // Assédio e aliciamento
  'gostosa', 'safada', 'tesuda', 'delicia', 'rabuda', 'bunduda',
  'quer transar', 'vamos pro motel', 'manda nudes', 'foto pelada',
  'whatsapp', 'instagram', 'telegram', 'numero', 'telefone',
  
  // Termos suspeitos para aliciamento
  'criança', 'menino', 'menina', 'novinha', 'novinho', 'idade',
  'escola', 'colégio', 'estudante', 'menor de idade',
  
  // Drogas
  'maconha', 'cocaina', 'crack', 'lsd', 'ecstasy', 'mdma', 'drogas',
  
  // Ameaças
  'vou te matar', 'vou te bater', 'te espero na saída', 'vai morrer',
  'vou te encontrar', 'sei onde você mora'
];

/**
 * Padrões regex para detectar comportamentos suspeitos
 */
const SUSPICIOUS_PATTERNS = [
  // Números de telefone
  /(\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}/g,
  // Links externos
  /(https?:\/\/[^\s]+)/g,
  // Redes sociais handles
  /@[a-zA-Z0-9_]+/g,
  // Repetição excessiva de caracteres
  /(.)\1{5,}/g,
  // Texto em caps lock (mais de 50% maiúsculo)
  /^[A-Z\s]{10,}$/,
  // Sequências de números (possível telefone)
  /\d{8,}/g,
];

/**
 * Verifica se uma mensagem contém conteúdo ofensivo ou inadequado
 * @param {string} message - Mensagem a ser verificada
 * @returns {Object} - Resultado da moderação
 */
export function moderateMessage(message) {
  if (!message || typeof message !== 'string') {
    return { isValid: false, reason: 'Mensagem inválida' };
  }

  const normalizedMessage = message.toLowerCase().trim();
  
  // Verificar se a mensagem está vazia ou muito longa
  if (normalizedMessage.length === 0) {
    return { isValid: false, reason: 'Mensagem vazia' };
  }
  
  if (normalizedMessage.length > 500) {
    return { isValid: false, reason: 'Mensagem muito longa (máximo 500 caracteres)' };
  }

  // Verificar palavras ofensivas
  for (const word of OFFENSIVE_WORDS) {
    if (normalizedMessage.includes(word.toLowerCase())) {
      return { 
        isValid: false, 
        reason: 'Mensagem contém linguagem inadequada',
        flaggedWord: word 
      };
    }
  }

  // Verificar padrões suspeitos
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(message)) {
      return { 
        isValid: false, 
        reason: 'Mensagem contém conteúdo não permitido (links, telefones, etc.)' 
      };
    }
  }

  // Verificar spam (repetição de palavras)
  const words = normalizedMessage.split(/\s+/);
  const wordCount = {};
  for (const word of words) {
    wordCount[word] = (wordCount[word] || 0) + 1;
    if (wordCount[word] > 3 && word.length > 2) {
      return { 
        isValid: false, 
        reason: 'Mensagem parece ser spam' 
      };
    }
  }

  return { isValid: true };
}

/**
 * Censura palavras ofensivas substituindo por asteriscos
 * @param {string} message - Mensagem original
 * @returns {string} - Mensagem censurada
 */
export function censorMessage(message) {
  if (!message || typeof message !== 'string') {
    return message;
  }

  let censoredMessage = message;
  
  for (const word of OFFENSIVE_WORDS) {
    const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const replacement = '*'.repeat(word.length);
    censoredMessage = censoredMessage.replace(regex, replacement);
  }

  return censoredMessage;
}

/**
 * Verifica se um usuário está sendo suspeito baseado no histórico de mensagens
 * @param {Array} userMessages - Últimas mensagens do usuário
 * @returns {Object} - Análise do comportamento
 */
export function analyzeUserBehavior(userMessages) {
  if (!userMessages || userMessages.length === 0) {
    return { isSuspicious: false };
  }

  const recentMessages = userMessages.slice(-10); // Últimas 10 mensagens
  const timeWindow = 60000; // 1 minuto
  const now = Date.now();

  // Verificar spam temporal (muitas mensagens em pouco tempo)
  const recentCount = recentMessages.filter(msg => 
    now - new Date(msg.created_at).getTime() < timeWindow
  ).length;

  if (recentCount > 5) {
    return { 
      isSuspicious: true, 
      reason: 'Enviando mensagens muito rapidamente' 
    };
  }

  // Verificar mensagens repetidas
  const messageTexts = recentMessages.map(msg => msg.content.toLowerCase());
  const uniqueMessages = new Set(messageTexts);
  
  if (messageTexts.length > 3 && uniqueMessages.size === 1) {
    return { 
      isSuspicious: true, 
      reason: 'Enviando mensagens repetidas' 
    };
  }

  return { isSuspicious: false };
}

export default {
  moderateMessage,
  censorMessage,
  analyzeUserBehavior
};