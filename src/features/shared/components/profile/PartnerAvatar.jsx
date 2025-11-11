// src/features/shared/components/profile/PartnerAvatar.jsx
import PropTypes from 'prop-types';
import { getPartnerAvatarUrl } from '@/utils/avatarHelper';

/**
 * Componente de Avatar específico para Partners
 * Usa a estrutura nova (avatar_url) ou legada (photos[0])
 */
const PartnerAvatar = ({ partner, size = 'md', className = '' }) => {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-20 h-20 text-xl',
    '2xl': 'w-24 h-24 text-2xl',
    '3xl': 'w-32 h-32 text-3xl',
  };

  const sizePixels = {
    xs: 24,
    sm: 32,
    md: 48,
    lg: 64,
    xl: 80,
    '2xl': 96,
    '3xl': 128,
  };

  // Processa a URL do avatar usando o helper
  const avatarUrl = getPartnerAvatarUrl(partner, sizePixels[size] || 48);
  const partnerName = partner?.name || 'Partner';

  return (
    <img
      src={avatarUrl}
      alt={`Avatar de ${partnerName}`}
      className={`${sizes[size]} rounded-full object-cover border-2 border-purple-500/50 ${className}`}
      onError={(e) => {
        // Fallback se a imagem falhar ao carregar
        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
          partnerName
        )}&background=8b5cf6&color=fff&size=${sizePixels[size] || 48}`;
      }}
    />
  );
};

PartnerAvatar.propTypes = {
  partner: PropTypes.shape({
    name: PropTypes.string,
    avatar_url: PropTypes.string,
    photos: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']),
  className: PropTypes.string,
};

export default PartnerAvatar;