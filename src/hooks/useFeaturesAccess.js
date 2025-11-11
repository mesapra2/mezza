// src/hooks/useFeatureAccess.js
import { usePremium } from '@/contexts/PremiumContext';
// import { PREMIUM_FEATURES } from '@/config/premiumFeatures'; // Removido – não usado

/**
 * Hook para controlar acesso a features premium
 */
export function useFeatureAccess() {
  const { 
    hasFeature, 
    isPremium, 
    isPartner, 
    getLimits,
    hasReachedLimit,
    getUpgradeMessage 
  } = usePremium();

  /**
   * Verifica se pode criar mais eventos
   */
  const canCreateEvent = (currentEventCount = 0) => {
    const limits = getLimits();
    if (!limits) return true; // Premium sem limites
    
    return !hasReachedLimit('MAX_EVENTS', currentEventCount);
  };

  /**
   * Verifica se pode adicionar mais participantes
   */
  const canAddParticipant = (currentParticipantCount = 0) => {
    const limits = getLimits();
    if (!limits) return true; // Premium sem limites
    
    return !hasReachedLimit('MAX_PARTICIPANTS_PER_EVENT', currentParticipantCount);
  };

  /**
   * Verifica se pode adicionar mais fotos
   */
  const canAddPhoto = (currentPhotoCount = 0) => {
    const limits = getLimits();
    if (!limits) return true; // Premium sem limites
    
    return !hasReachedLimit('MAX_PHOTOS', currentPhotoCount);
  };

  /**
   * Verifica se pode acessar uma feature específica
   */
  const canAccessFeature = (feature) => {
    return hasFeature(feature);
  };

  /**
   * Retorna mensagem apropriada para feature bloqueada
   */
  const getFeatureMessage = (feature) => {
    return getUpgradeMessage(feature);
  };

  /**
   * Retorna informações sobre o limite de eventos
   */
  const getEventLimitInfo = (currentEventCount = 0) => {
    const limits = getLimits();
    
    if (!limits) {
      return {
        hasLimit: false,
        current: currentEventCount,
        max: Infinity,
        remaining: Infinity,
        percentage: 0,
      };
    }

    const max = limits.MAX_EVENTS;
    const remaining = Math.max(0, max - currentEventCount);
    const percentage = Math.min(100, (currentEventCount / max) * 100);

    return {
      hasLimit: true,
      current: currentEventCount,
      max,
      remaining,
      percentage,
      isAtLimit: currentEventCount >= max,
    };
  };

  /**
   * Retorna informações sobre o limite de participantes
   */
  const getParticipantLimitInfo = (currentParticipantCount = 0) => {
    const limits = getLimits();
    
    if (!limits) {
      return {
        hasLimit: false,
        current: currentParticipantCount,
        max: Infinity,
        remaining: Infinity,
        percentage: 0,
      };
    }

    const max = limits.MAX_PARTICIPANTS_PER_EVENT;
    const remaining = Math.max(0, max - currentParticipantCount);
    const percentage = Math.min(100, (currentParticipantCount / max) * 100);

    return {
      hasLimit: true,
      current: currentParticipantCount,
      max,
      remaining,
      percentage,
      isAtLimit: currentParticipantCount >= max,
    };
  };

  return {
    // Verificações básicas
    isPremium,
    isPartner,
    limits: getLimits(),

    // Verificações de features
    canAccessFeature,
    hasFeature,
    getFeatureMessage,

    // Verificações de limites
    canCreateEvent,
    canAddParticipant,
    canAddPhoto,
    hasReachedLimit,

    // Informações detalhadas
    getEventLimitInfo,
    getParticipantLimitInfo,
  };
}