// src/features/shared/components/profile/Avatar.jsx
import PropTypes from 'prop-types';
import { getAvatarUrl } from '@/utils/avatarHelper';

const Avatar = ({ url = null, name = 'U', size = 'md', isPublic = true } = {}) => {
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

  // ✅ Processa a URL automaticamente usando o helper
  const processedUrl = getAvatarUrl(url, name || 'U', sizePixels[size] || 40);

  if (isPublic) {
    return (
      <img
        src={processedUrl}
        alt={name || 'Avatar'}
        className={`${sizes[size]} rounded-full object-cover border-2 border-purple-500/50`}
        onError={(e) => {
          // Fallback se a imagem falhar ao carregar
          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
            name || 'U'
          )}&background=8b5cf6&color=fff&size=${sizePixels[size] || 40}`;
        }}
      />
    );
  }

  // Iniciais se não público ou sem URL
  const initials = name 
    ? name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
    : '??';
  
  return (
    <div className={`${sizes[size]} rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold border-2 border-purple-500/50`}>
      {initials}
    </div>
  );
};

Avatar.propTypes = {
  url: PropTypes.string,
  name: PropTypes.string,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  isPublic: PropTypes.bool,
};

export default Avatar;