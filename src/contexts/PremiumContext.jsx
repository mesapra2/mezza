// src/contexts/PremiumContext.jsx
import { createContext, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from './AuthContext';
import { PREMIUM_FEATURES, FREE_LIMITS } from '@/config/premiumFeatures';

const PremiumContext = createContext(null);

/**
 * Hook para acessar o contexto Premium
 */
export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium deve ser usado dentro de um PremiumProvider');
  }
  return context;
};

/**
 * Provider do contexto Premium
 */
export function PremiumProvider({ children }) {
  const { profile } = useAuth();

  const value = useMemo(() => {
    // Se não tem perfil, retorna valores padrão
    if (!profile) {
      return {
        isPremium: false,
        isPremiumPartner: false,
        isPartner: false,
        userType: null,
        hasFeature: () => false,
        getLimits: () => FREE_LIMITS.USER,
        getAvailableFeatures: () => PREMIUM_FEATURES.USER,
        hasReachedLimit: () => false,
        getUpgradeMessage: () => 'Faça upgrade para Premium para desbloquear este recurso',
      };
    }

    // ✅ Suporta tanto usuário premium quanto parceiro premium
    const isPremium = profile.isPremium || false;
    const isPremiumPartner = profile.isPremiumPartner || false;
    const isPartner = profile.isPartner || false;
    const userType = profile.userType;

    /**
     * Verifica se o usuário tem acesso a uma feature específica
     */
    const hasFeature = (feature) => {
      // Premium (usuário ou parceiro) sempre tem acesso
      if (isPremium || isPremiumPartner) return true;

      // Features gratuitas sempre disponíveis
      const freeFeatures = [
        'basic_events', // Ver eventos públicos
        'basic_chat',   // Chat básico
        'profile_view', // Ver perfis
      ];
      
      return freeFeatures.includes(feature);
    };

    /**
     * Retorna os limites do plano atual
     */
    const getLimits = () => {
      // Premium não tem limites
      if (isPremium || isPremiumPartner) return null;
      
      return isPartner ? FREE_LIMITS.PARTNER : FREE_LIMITS.USER;
    };

    /**
     * Retorna as features disponíveis para o tipo de usuário
     */
    const getAvailableFeatures = () => {
      return isPartner ? PREMIUM_FEATURES.PARTNER : PREMIUM_FEATURES.USER;
    };

    /**
     * Verifica se atingiu um limite específico
     */
    const hasReachedLimit = (limitKey, currentValue) => {
      if (isPremium || isPremiumPartner) return false;
      
      const limits = getLimits();
      if (!limits || !limits[limitKey]) return false;
      
      return currentValue >= limits[limitKey];
    };

    /**
     * Retorna mensagem de upgrade apropriada
     */
    const getUpgradeMessage = (feature) => {
      if (hasFeature(feature)) return null;
      
      if (isPartner && !isPremiumPartner) {
        return 'Este recurso está disponível apenas no plano Partner Premium. Faça upgrade para desbloquear!';
      }
      
      return 'Este recurso está disponível apenas no plano Premium. Faça upgrade para desbloquear!';
    };

    return {
      isPremium,
      isPremiumPartner, // ✅ Novo
      isPartner,
      userType,
      hasFeature,
      getLimits,
      getAvailableFeatures,
      hasReachedLimit,
      getUpgradeMessage,
    };
  }, [profile]);

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
}

PremiumProvider.propTypes = {
  children: PropTypes.node.isRequired,
};