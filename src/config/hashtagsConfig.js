// src/config/hashtagsConfig.js
// Configuração centralizada de hashtags do sistema

/**
 * HASHTAGS PREMIUM - EXCLUSIVAS PARA EVENTOS PARTICULARES
 * Apenas estas 5 hashtags podem ser usadas em eventos do tipo "Particular"
 * O usuário DEVE escolher 1 (e apenas 1) ao criar evento particular
 */
export const HASHTAGS_PREMIUM = [
  'aniversário',
  'confraternização',
  'churrascompiscina',
  'passeiodelancha',
  'cinema'
];

/**
 * HASHTAGS COMUNS - PARA TODOS OS EVENTOS E PERFIS
 * Podem ser usadas por qualquer usuário em qualquer tipo de evento
 * Também aparecem no perfil para configurar notificações
 */
export const HASHTAGS_COMUNS = [
  'happyhour',
  'cafe',
  'brunch',
  'almoco',
  'jantar',
  'drinks',
  'cerveja',
  'petiscos',
  'comidacaseira',
  'vegetariano',
  'vegano',
  'fitness',
  'saudavel',
  'pizza',
  'hamburguer',
  'sushi',
  'churrasco',
  'italiana',
  'japonesa',
  'mexicana',
  'sobremesa',
  'acai',
  'tapioca',
  'rodadadechopp',
  'boteco'
];

/**
 * Retorna as hashtags disponíveis baseado no tipo de evento
 * @param {string} eventType - Tipo do evento ('particular', 'padrao', etc)
 * @returns {Object} { premium: [], comum: [] }
 */
export const getHashtagsByEventType = (eventType) => {
  if (eventType === 'particular') {
    return {
      premium: HASHTAGS_PREMIUM,
      comum: HASHTAGS_COMUNS
    };
  }
  
  return {
    premium: [], // Eventos normais não têm acesso a hashtags premium
    comum: HASHTAGS_COMUNS
  };
};

/**
 * Valida se um evento particular tem hashtag premium obrigatória
 * @param {string} eventType - Tipo do evento
 * @param {Array} selectedHashtags - Hashtags selecionadas
 * @returns {Object} { valid: boolean, error: string }
 */
export const validateEventHashtags = (eventType, selectedHashtags = []) => {
  if (eventType === 'particular') {
    const hasPremiumTag = selectedHashtags.some(tag => 
      HASHTAGS_PREMIUM.includes(tag.toLowerCase())
    );
    
    if (!hasPremiumTag) {
      return {
        valid: false,
        error: 'Eventos particulares devem ter pelo menos 1 hashtag premium: ' + 
               HASHTAGS_PREMIUM.map(t => `#${t}`).join(', ')
      };
    }
    
    // Verifica se tem apenas 1 hashtag premium
    const premiumCount = selectedHashtags.filter(tag => 
      HASHTAGS_PREMIUM.includes(tag.toLowerCase())
    ).length;
    
    if (premiumCount > 1) {
      return {
        valid: false,
        error: 'Escolha apenas 1 hashtag premium para o evento particular'
      };
    }
  }
  
  return { valid: true, error: null };
};