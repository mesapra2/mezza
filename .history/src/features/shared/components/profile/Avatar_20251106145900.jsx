// src/features/shared/components/profile/Avatar.jsx
import PropTypes from 'prop-types';
import { getAvatarUrl } from '@/utils/avatarHelper';
import { usePresence } from '@/hooks/usePresence';
import PresenceService from '@/services/PresenceService';

/**
 * Componente Avatar com indicador de presença online
 */
const Avatar = ({ 
  url = null, 
  name = 'U', 
  size = 'md', 
  isPublic = true,
  userId = null,
  showPresence = true,
} = {}) => {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-20 h-20 text-xl',
  };

  const sizePixels = {
    xs: 24,
    sm: 32,
    md: 48,
    lg: 64,
    xl: 80,
  };

  // Tamanhos da bolinha de presença
  const presenceSizes = {
    xs: 'w-1.5 h-1.5 border',
    sm: 'w-2 h-2 border',
    md: 'w-2.5 h-2.5 border-2',
    lg: 'w-3 h-3 border-2',
    xl: 'w-4 h-4 border-2',
  };

  // Hook para obter presença do usuário
  const { status, isLoading } = usePresence(showPresence && userId ? userId : null);

  // Processar URL do avatar
  const processedUrl = getAvatarUrl(url, name || 'U', sizePixels[size] || 40);

  // Obter cor do status
  const statusColor = PresenceService.getStatusColor(status);

  // Avatar público (com imagem)
  if (isPublic) {
    return (
      <div className="relative inline-block">
        <img
          src={processedUrl}
          alt={name || 'Avatar'}
          className={`${sizes[size]} rounded-full object-cover border-2 border-purple-500/50`}
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
              name || 'U'
            )}&background=8b5cf6&color=fff&size=${sizePixels[size] || 40}`;
          }}
        />
        
        {/* Bolinha de Presença */}
        {showPresence && userId && !isLoading && (
          <span
            className={`
              absolute bottom-0 right-0 
              ${presenceSizes[size]} 
              ${statusColor}
              rounded-full 
              border-gray-900
              ring-2 ring-gray-900
              transition-colors duration-300
            `}
            title={PresenceService.getStatusLabel(status)}
            aria-label={`Status: ${PresenceService.getStatusLabel(status)}`}
          />
        )}
      </div>
    );
  }

  // Avatar com iniciais
  const initials = name 
    ? name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
    : '??';
  
  return (
    <div className="relative inline-block">
      <div 
        className={`
          ${sizes[size]} 
          rounded-full 
          bg-purple-500/20 
          flex items-center justify-center 
          text-purple-300 
          font-bold 
          border-2 border-purple-500/50
        `}
      >
        {initials}
      </div>

      {/* Bolinha de Presença */}
      {showPresence && userId && !isLoading && (
        <span
          className={`
            absolute bottom-0 right-0 
            ${presenceSizes[size]} 
            ${statusColor}
            rounded-full 
            border-gray-900
            ring-2 ring-gray-900
            transition-colors duration-300
          `}
          title={PresenceService.getStatusLabel(status)}
          aria-label={`Status: ${PresenceService.getStatusLabel(status)}`}
        />
      )}
    </div>
  );
};

Avatar.propTypes = {
  url: PropTypes.string,
  name: PropTypes.string,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  isPublic: PropTypes.bool,
  userId: PropTypes.string,
  showPresence: PropTypes.bool,
};

export default Avatar;