// src/components/shared/FeatureGate.jsx
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Lock, Crown } from 'lucide-react';
import { usePremium } from '@/contexts/PremiumContext';

/**
 * Componente que controla acesso a features premium
 * Renderiza children se o usuário tem acesso, caso contrário mostra fallback ou mensagem de upgrade
 */
export function FeatureGate({ 
  feature, 
  children, 
  fallback,
  showUpgradeMessage = true,
  customMessage 
}) {
  const { hasFeature, isPartner, getUpgradeMessage } = usePremium();

  // Se tem acesso, renderiza o conteúdo
  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  // Se tem fallback customizado, usa ele
  if (fallback) {
    return <>{fallback}</>;
  }

  // Se não deve mostrar mensagem, não renderiza nada
  if (!showUpgradeMessage) {
    return null;
  }

  // Mensagem padrão de upgrade
  const upgradeMessage = customMessage || getUpgradeMessage(feature);
  const upgradeLink = isPartner ? '/partner/settings' : '/settings';

  return (
    <div className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-purple-500/20 rounded-lg">
          <Crown className="w-6 h-6 text-purple-400" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Recurso Premium
          </h3>
          <p className="text-sm text-gray-300 mb-4">
            {upgradeMessage}
          </p>
          <Link 
            to={upgradeLink} 
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all"
          >
            <Crown className="w-4 h-4" />
            Fazer Upgrade
          </Link>
        </div>
      </div>
    </div>
  );
}

FeatureGate.propTypes = {
  feature: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
  showUpgradeMessage: PropTypes.bool,
  customMessage: PropTypes.string,
};

/**
 * Versão inline do FeatureGate para usar em textos ou elementos menores
 */
export function InlineFeatureGate({ feature, children, fallback }) {
  const { hasFeature } = usePremium();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return null;
}

InlineFeatureGate.propTypes = {
  feature: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
};