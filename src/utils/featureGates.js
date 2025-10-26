// src/utils/featureGates.js
import { PREMIUM_FEATURES, FREE_LIMITS } from '@/config/premiumFeatures';
import { USER_TYPES } from '@/config/userTypes';

/**
 * Verifica se um usuário tem acesso a uma feature
 */
export const hasFeatureAccess = (userType, feature) => {
  // Premium sempre tem acesso
  if (userType === USER_TYPES.USER_PREMIUM || userType === USER_TYPES.PARTNER_PREMIUM) {
    return true;
  }

  // Features gratuitas (adicione aqui features que free users têm)
  const freeFeatures = [];
  
  return freeFeatures.includes(feature);
};

/**
 * Verifica se atingiu um limite específico
 */
export const hasReachedLimit = (userType, limitKey, currentValue) => {
  // Premium não tem limites
  if (userType === USER_TYPES.USER_PREMIUM || userType === USER_TYPES.PARTNER_PREMIUM) {
    return false;
  }

  const isPartner = userType === USER_TYPES.PARTNER_FREE;
  const limits = isPartner ? FREE_LIMITS.PARTNER : FREE_LIMITS.USER;

  if (!limits[limitKey]) return false;

  return currentValue >= limits[limitKey];
};

/**
 * Retorna os limites para um tipo de usuário
 */
export const getLimitsForUserType = (userType) => {
  // Premium não tem limites
  if (userType === USER_TYPES.USER_PREMIUM || userType === USER_TYPES.PARTNER_PREMIUM) {
    return null;
  }

  const isPartner = userType === USER_TYPES.PARTNER_FREE;
  return isPartner ? FREE_LIMITS.PARTNER : FREE_LIMITS.USER;
};

/**
 * Retorna mensagem de upgrade apropriada
 */
export const getUpgradeMessage = (userType, feature) => {
  if (hasFeatureAccess(userType, feature)) {
    return null;
  }

  const isPartner = userType === USER_TYPES.PARTNER_FREE;
  
  return isPartner
    ? 'Este recurso está disponível apenas no plano Partner Premium. Faça upgrade para desbloquear!'
    : 'Este recurso está disponível apenas no plano Premium. Faça upgrade para desbloquear!';
};

/**
 * Retorna features disponíveis para um tipo de usuário
 */
export const getAvailableFeaturesForUserType = (userType) => {
  const isPartner = userType === USER_TYPES.PARTNER_FREE || userType === USER_TYPES.PARTNER_PREMIUM;
  return isPartner ? PREMIUM_FEATURES.PARTNER : PREMIUM_FEATURES.USER;
};

/**
 * Verifica se pode criar evento baseado no limite
 */
export const canCreateEvent = (userType, currentEventCount) => {
  const limits = getLimitsForUserType(userType);
  if (!limits) return true;
  
  return currentEventCount < limits.MAX_EVENTS;
};

/**
 * Verifica se pode adicionar participante baseado no limite
 */
export const canAddParticipant = (userType, currentParticipantCount) => {
  const limits = getLimitsForUserType(userType);
  if (!limits) return true;
  
  return currentParticipantCount < limits.MAX_PARTICIPANTS_PER_EVENT;
};

/**
 * Calcula progresso em relação ao limite
 */
export const calculateLimitProgress = (userType, limitKey, currentValue) => {
  const limits = getLimitsForUserType(userType);
  if (!limits) return { percentage: 0, isAtLimit: false };

  const max = limits[limitKey];
  if (!max) return { percentage: 0, isAtLimit: false };

  const percentage = Math.min(100, (currentValue / max) * 100);
  const isAtLimit = currentValue >= max;

  return { percentage, isAtLimit, current: currentValue, max };
};