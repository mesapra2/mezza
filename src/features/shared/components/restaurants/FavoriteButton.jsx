/**
 * ========================================
 * BOTÃO DE FAVORITAR RESTAURANTE
 * ========================================
 * 
 * Componente reutilizável para adicionar/remover restaurantes dos favoritos
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Heart, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFavoriteRestaurants } from '@/hooks/useFavoriteRestaurants';

const FavoriteButton = ({ 
  restaurant, 
  size = 'default', 
  variant = 'default',
  showLabel = false,
  className = '',
  onToggle = null 
}) => {
  const { isFavorite, toggleFavorite } = useFavoriteRestaurants();
  const [isToggling, setIsToggling] = useState(false);
  
  const restaurantId = restaurant?.id || restaurant?.restaurant_id;
  const restaurantName = restaurant?.name || restaurant?.restaurant_name;
  const isCurrentlyFavorite = isFavorite(restaurantId);

  /**
   * ✅ HANDLE TOGGLE FAVORITO
   */
  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsToggling(true);
    
    try {
      const result = await toggleFavorite(restaurant);
      
      // Callback opcional para componente pai
      if (onToggle && result.success) {
        onToggle(result.isFavorite);
      }
    } catch (error) {
      console.error('❌ Erro ao toggle favorito:', error);
    } finally {
      setIsToggling(false);
    }
  };

  /**
   * ✅ CLASSES DE ESTILO BASEADAS EM PROPS
   */
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-8 h-8 p-1.5';
      case 'large':
        return 'w-12 h-12 p-3';
      default:
        return 'w-10 h-10 p-2.5';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'outline':
        return 'bg-transparent border-2 border-white/20 hover:border-white/40';
      case 'solid':
        return 'bg-black/20 hover:bg-black/30';
      case 'minimal':
        return 'bg-transparent hover:bg-white/10';
      default:
        return 'bg-white/10 hover:bg-white/20';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 'w-4 h-4';
      case 'large':
        return 'w-6 h-6';
      default:
        return 'w-5 h-5';
    }
  };

  if (!restaurantId || !restaurantName) {
    return null;
  }

  return (
    <motion.button
      onClick={handleToggle}
      disabled={isToggling}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`
        ${getSizeClasses()}
        ${getVariantClasses()}
        rounded-full backdrop-blur-sm transition-all duration-200
        flex items-center justify-center
        focus:outline-none focus:ring-2 focus:ring-white/50
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      aria-label={
        isCurrentlyFavorite 
          ? `Remover ${restaurantName} dos favoritos` 
          : `Adicionar ${restaurantName} aos favoritos`
      }
    >
      <div className="flex items-center gap-2">
        {isToggling ? (
          <Loader2 className={`${getIconSize()} animate-spin text-white`} />
        ) : (
          <motion.div
            initial={false}
            animate={{
              scale: isCurrentlyFavorite ? 1.1 : 1,
              rotate: isCurrentlyFavorite ? [0, 10, -10, 0] : 0,
            }}
            transition={{ duration: 0.3, type: "spring" }}
          >
            <Heart 
              className={`
                ${getIconSize()} transition-colors duration-200
                ${isCurrentlyFavorite 
                  ? 'text-red-500 fill-red-500' 
                  : 'text-white hover:text-red-400'
                }
              `}
            />
          </motion.div>
        )}
        
        {showLabel && (
          <span className="text-sm text-white font-medium">
            {isCurrentlyFavorite ? 'Favoritado' : 'Favoritar'}
          </span>
        )}
      </div>
    </motion.button>
  );
};

FavoriteButton.propTypes = {
  restaurant: PropTypes.shape({
    id: PropTypes.string,
    restaurant_id: PropTypes.string,
    name: PropTypes.string,
    restaurant_name: PropTypes.string,
    address: PropTypes.string,
    restaurant_address: PropTypes.string,
    photo_url: PropTypes.string,
    restaurant_photo_url: PropTypes.string,
    rating: PropTypes.number,
    restaurant_rating: PropTypes.number,
    place_id: PropTypes.string,
    restaurant_place_id: PropTypes.string,
  }).isRequired,
  size: PropTypes.oneOf(['small', 'default', 'large']),
  variant: PropTypes.oneOf(['default', 'outline', 'solid', 'minimal']),
  showLabel: PropTypes.bool,
  className: PropTypes.string,
  onToggle: PropTypes.func,
};

export default FavoriteButton;