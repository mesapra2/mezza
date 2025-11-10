// src/components/AccessibleToast.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * Componente de Toast acessível com suporte para screen readers
 * Usa live regions para anunciar mensagens automaticamente
 */
const AccessibleToast = ({ message, type, onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          if (onClose) onClose();
        }, 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colors = {
    success: 'bg-green-500/10 border-green-500/20 text-green-200',
    error: 'bg-red-500/10 border-red-500/20 text-red-200',
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-200',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-200',
  };

  const iconColors = {
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
  };

  const Icon = icons[type] || Info;

  if (!isVisible) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[9999] max-w-sm w-full"
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <div
        className={`
          flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm
          transform transition-all duration-300 ease-in-out
          ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
          ${colors[type] || colors.info}
        `}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColors[type] || iconColors.info}`} />
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{message}</p>
        </div>

        {onClose && (
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onClose(), 300);
            }}
            className="flex-shrink-0 text-white/60 hover:text-white transition-colors p-1 -m-1 rounded focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Fechar notificação"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

AccessibleToast.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']).isRequired,
  onClose: PropTypes.func,
  duration: PropTypes.number,
};

export default AccessibleToast;