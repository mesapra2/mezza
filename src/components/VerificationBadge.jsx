/**
 * ========================================
 * SELO DE USUÁRIO VERIFICADO
 * ========================================
 * 
 * Componente para exibir selo de verificação de identidade
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Shield, Check, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const VerificationBadge = ({ 
  isVerified = false, 
  size = 'default',
  showLabel = false,
  className = '',
  variant = 'default' 
}) => {
  
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-5 h-5';
      case 'large':
        return 'w-8 h-8';
      case 'xl':
        return 'w-12 h-12';
      default:
        return 'w-6 h-6';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 'w-3 h-3';
      case 'large':
        return 'w-5 h-5';
      case 'xl':
        return 'w-7 h-7';
      default:
        return 'w-4 h-4';
    }
  };

  const getLabelSize = () => {
    switch (size) {
      case 'small':
        return 'text-xs';
      case 'large':
        return 'text-sm';
      case 'xl':
        return 'text-lg';
      default:
        return 'text-sm';
    }
  };

  if (!isVerified) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20,
          delay: 0.1 
        }}
        className={`
          ${getSizeClasses()}
          bg-gradient-to-br from-blue-500 to-blue-600
          rounded-full flex items-center justify-center
          border-2 border-blue-400/30
          shadow-lg shadow-blue-500/25
          relative overflow-hidden
        `}
        title="Usuário Verificado - Identidade confirmada"
      >
        {/* Brilho animado */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{
            x: ['-100%', '100%']
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 3,
            ease: "linear"
          }}
        />
        
        {/* Ícone principal */}
        {variant === 'star' ? (
          <Star className={`${getIconSize()} text-white fill-white`} />
        ) : (
          <Check className={`${getIconSize()} text-white font-bold stroke-[3]`} />
        )}
      </motion.div>

      {showLabel && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className={`
            ${getLabelSize()}
            font-semibold text-blue-400
            flex items-center gap-1
          `}
        >
          <Shield className="w-3 h-3" />
          Verificado
        </motion.span>
      )}
    </div>
  );
};

VerificationBadge.propTypes = {
  isVerified: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'default', 'large', 'xl']),
  showLabel: PropTypes.bool,
  className: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'star']),
};

export default VerificationBadge;