/**
 * ========================================
 * LISTA DE RESTAURANTES FAVORITOS
 * ========================================
 * 
 * Componente para exibir os restaurantes favoritos do usuário
 */

import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { Heart, MapPin, Star, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { useFavoriteRestaurants } from '@/hooks/useFavoriteRestaurants';
import { Button } from '@/features/shared/components/ui/button';

const FavoriteRestaurantsList = ({ 
  showTitle = true,
  maxItems = null,
  onRestaurantClick = null,
  className = ''
}) => {
  const { 
    favorites, 
    loading, 
    favoritesCount,
    removeFavorite,
    hasFavorites 
  } = useFavoriteRestaurants();

  const displayFavorites = maxItems ? favorites.slice(0, maxItems) : favorites;

  /**
   * ✅ HANDLE REMOVER FAVORITO
   */
  const handleRemove = async (e, restaurantId) => {
    e.preventDefault();
    e.stopPropagation();
    await removeFavorite(restaurantId);
  };

  /**
   * ✅ HANDLE CLICK NO RESTAURANTE
   */
  const handleRestaurantClick = (restaurant) => {
    if (onRestaurantClick) {
      onRestaurantClick(restaurant);
    }
  };

  /**
   * ✅ RENDERIZAR LOADING STATE
   */
  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {showTitle && (
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Seus Favoritos
          </h3>
        )}
        
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-white/60" />
          <span className="ml-2 text-white/60">Carregando favoritos...</span>
        </div>
      </div>
    );
  }

  /**
   * ✅ RENDERIZAR EMPTY STATE
   */
  if (!hasFavorites) {
    return (
      <div className={`space-y-4 ${className}`}>
        {showTitle && (
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Seus Favoritos
          </h3>
        )}
        
        <div className="text-center py-8 px-4 bg-white/5 rounded-lg border border-white/10">
          <Heart className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/60 text-sm mb-2">Nenhum favorito ainda</p>
          <p className="text-white/40 text-xs">
            Adicione restaurantes aos favoritos clicando no ❤️
          </p>
        </div>
      </div>
    );
  }

  /**
   * ✅ RENDERIZAR LISTA DE FAVORITOS
   */
  return (
    <div className={`space-y-4 ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            Seus Favoritos ({favoritesCount})
          </h3>
          
          {maxItems && favoritesCount > maxItems && (
            <Button
              variant="ghost"
              size="sm"
              className="text-purple-400 hover:text-purple-300"
            >
              Ver todos ({favoritesCount})
            </Button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {displayFavorites.map((restaurant, index) => (
          <motion.div
            key={restaurant.id || restaurant.restaurant_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleRestaurantClick(restaurant)}
            className={`
              bg-white/5 rounded-lg p-4 border border-white/10
              hover:bg-white/10 transition-all duration-200
              ${onRestaurantClick ? 'cursor-pointer' : ''}
            `}
          >
            <div className="flex items-start gap-4">
              {/* Foto do restaurante */}
              {restaurant.restaurant_photo_url && (
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={restaurant.restaurant_photo_url}
                    alt={restaurant.restaurant_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Informações do restaurante */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-white truncate">
                      {restaurant.restaurant_name}
                    </h4>
                    
                    {restaurant.restaurant_address && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-white/40" />
                        <span className="text-xs text-white/60 truncate">
                          {restaurant.restaurant_address}
                        </span>
                      </div>
                    )}

                    {restaurant.restaurant_rating && (
                      <div className="flex items-center gap-1 mt-2">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs text-yellow-400">
                          {restaurant.restaurant_rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {restaurant.restaurant_place_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 text-white/40 hover:text-white/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`https://maps.google.com/maps/place/?q=place_id:${restaurant.restaurant_place_id}`, '_blank');
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 text-white/40 hover:text-red-400"
                      onClick={(e) => handleRemove(e, restaurant.restaurant_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

FavoriteRestaurantsList.propTypes = {
  showTitle: PropTypes.bool,
  maxItems: PropTypes.number,
  onRestaurantClick: PropTypes.func,
  className: PropTypes.string,
};

export default FavoriteRestaurantsList;