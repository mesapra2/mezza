// src/components/shared/PremiumBadge.jsx
import PropTypes from 'prop-types';
import { Star, Crown } from 'lucide-react';

/**
 * Badge para indicar status premium
 */
export function PremiumBadge({ size = 'md', variant = 'default', showIcon = true }) {
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const icons = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const variants = {
    default: 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white',
    outline: 'border-2 border-yellow-500 text-yellow-500 bg-transparent',
    subtle: 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20',
  };

  return (
    <span 
      className={`
        inline-flex items-center gap-1.5 rounded-full font-semibold
        ${sizes[size]} ${variants[variant]}
      `}
    >
      {showIcon && <Star className={`${icons[size]} fill-current`} />}
      Premium
    </span>
  );
}

PremiumBadge.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  variant: PropTypes.oneOf(['default', 'outline', 'subtle']),
  showIcon: PropTypes.bool,
};

/**
 * Badge para indicar status de parceiro
 */
export function PartnerBadge({ size = 'md', variant = 'default', showIcon = true }) {
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const icons = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const variants = {
    default: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white',
    outline: 'border-2 border-purple-500 text-purple-500 bg-transparent',
    subtle: 'bg-purple-500/10 text-purple-500 border border-purple-500/20',
  };

  return (
    <span 
      className={`
        inline-flex items-center gap-1.5 rounded-full font-semibold
        ${sizes[size]} ${variants[variant]}
      `}
    >
      {showIcon && <Crown className={`${icons[size]}`} />}
      Parceiro
    </span>
  );
}

PartnerBadge.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  variant: PropTypes.oneOf(['default', 'outline', 'subtle']),
  showIcon: PropTypes.bool,
};

/**
 * Badge combinado para parceiro premium
 */
export function PartnerPremiumBadge({ size = 'md' }) {
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const icons = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span 
      className={`
        inline-flex items-center gap-1.5 rounded-full font-semibold
        bg-gradient-to-r from-yellow-500 via-purple-600 to-pink-600 text-white
        ${sizes[size]}
      `}
    >
      <Crown className={`${icons[size]}`} />
      <Star className={`${icons[size]} fill-current`} />
      Partner Premium
    </span>
  );
}

PartnerPremiumBadge.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};