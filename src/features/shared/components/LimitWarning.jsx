// src/components/shared/LimitWarning.jsx
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { AlertTriangle, Info, Crown } from 'lucide-react';
import { usePremium } from '@/contexts/PremiumContext';

/**
 * Componente para mostrar avisos sobre limites de plano gratuito
 */
export function LimitWarning({ 
  current, 
  max, 
  resourceName = 'itens',
  showUpgradeButton = true 
}) {
  const { isPartner } = usePremium();
  const percentage = (current / max) * 100;
  const remaining = max - current;
  
  // Define variante baseada na porcentagem
  let variant = 'info';
  if (percentage >= 90) variant = 'danger';
  else if (percentage >= 70) variant = 'warning';

  const variants = {
    info: {
      bg: 'bg-blue-500/10 border-blue-500/20',
      text: 'text-blue-400',
      icon: Info,
    },
    warning: {
      bg: 'bg-yellow-500/10 border-yellow-500/20',
      text: 'text-yellow-400',
      icon: AlertTriangle,
    },
    danger: {
      bg: 'bg-red-500/10 border-red-500/20',
      text: 'text-red-400',
      icon: AlertTriangle,
    },
  };

  const { bg, text, icon: Icon } = variants[variant];
  const upgradeLink = isPartner ? '/partner/settings' : '/settings';

  return (
    <div className={`p-4 rounded-lg border ${bg}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${text} flex-shrink-0 mt-0.5`} />
        
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${text} mb-1`}>
            Você está usando {current} de {max} {resourceName}
          </p>
          
          {remaining > 0 ? (
            <p className="text-xs text-gray-300">
              Ainda restam {remaining} {resourceName} disponíveis no seu plano gratuito.
            </p>
          ) : (
            <p className="text-xs text-gray-200">
              Você atingiu o limite do plano gratuito.
            </p>
          )}

          {/* Barra de progresso */}
          <div className="mt-3 mb-3">
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  percentage >= 90 
                    ? 'bg-red-500' 
                    : percentage >= 70 
                      ? 'bg-yellow-500' 
                      : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>

          {showUpgradeButton && (
            <Link 
              to={upgradeLink}
              className="inline-flex items-center gap-2 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors"
            >
              <Crown className="w-4 h-4" />
              Fazer upgrade para Premium
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

LimitWarning.propTypes = {
  current: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  resourceName: PropTypes.string,
  showUpgradeButton: PropTypes.bool,
};

/**
 * Componente para aviso de limite atingido
 */
export function LimitReachedWarning({ 
  resourceName = 'itens',
  action = 'criar mais',
}) {
  const { isPartner } = usePremium();
  const upgradeLink = isPartner ? '/partner/settings' : '/settings';

  return (
    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-lg">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-red-500/20 rounded-lg">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-2">
            Limite Atingido
          </h3>
          <p className="text-sm text-gray-300 mb-4">
            Você atingiu o limite de {resourceName} do plano gratuito. 
            Faça upgrade para {action} sem restrições.
          </p>
          <Link 
            to={upgradeLink}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all"
          >
            <Crown className="w-4 h-4" />
            Fazer Upgrade Agora
          </Link>
        </div>
      </div>
    </div>
  );
}

LimitReachedWarning.propTypes = {
  resourceName: PropTypes.string,
  action: PropTypes.string,
};