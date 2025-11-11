/**
 * ========================================
 * HOOK DE RESTAURANTES FAVORITOS
 * ========================================
 * 
 * Hook personalizado para gerenciar restaurantes favoritos
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FavoriteRestaurantService } from '@/services/FavoriteRestaurantService';
import { useToast } from '@/features/shared/components/ui/use-toast';

export const useFavoriteRestaurants = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [favoritesMap, setFavoritesMap] = useState(new Map()); // Para checks rápidos

  /**
   * ✅ CARREGAR FAVORITOS DO USUÁRIO
   */
  const loadFavorites = useCallback(async () => {
    if (!user?.id) {
      setFavorites([]);
      setFavoritesMap(new Map());
      return;
    }

    setLoading(true);
    try {
      const result = await FavoriteRestaurantService.getUserFavorites(user.id);
      
      if (result.success && result.data) {
        setFavorites(result.data);
        
        // Criar mapa para checks rápidos
        const map = new Map();
        result.data.forEach(fav => {
          map.set(fav.restaurant_id, true);
        });
        setFavoritesMap(map);
        
        console.log(`✅ ${result.data.length} favoritos carregados`);
      } else {
        // Don't show error toast if it's just a table not found issue
        if (result.error && !result.error.includes('ainda não configurado')) {
          console.error('❌ Erro ao carregar favoritos:', result.error);
          toast({
            title: "Erro ao carregar favoritos",
            description: result.error || "Tente novamente mais tarde",
            variant: "destructive",
          });
        } else {
          // Silently handle missing table - set empty state
          setFavorites([]);
          setFavoritesMap(new Map());
        }
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao carregar favoritos:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  /**
   * ✅ VERIFICAR SE RESTAURANTE É FAVORITO
   */
  const isFavorite = useCallback((restaurantId) => {
    return favoritesMap.has(restaurantId);
  }, [favoritesMap]);

  /**
   * ✅ ALTERNAR STATUS DE FAVORITO
   */
  const toggleFavorite = useCallback(async (restaurant) => {
    if (!user?.id) {
      toast({
        title: "Faça login para favoritar",
        description: "Você precisa estar logado para adicionar favoritos",
        variant: "destructive",
      });
      return { success: false };
    }

    try {
      const restaurantData = {
        restaurant_id: restaurant.id || restaurant.restaurant_id,
        restaurant_name: restaurant.name || restaurant.restaurant_name,
        restaurant_address: restaurant.address || restaurant.restaurant_address,
        restaurant_photo_url: restaurant.photo_url || restaurant.restaurant_photo_url,
        restaurant_rating: restaurant.rating || restaurant.restaurant_rating,
        restaurant_place_id: restaurant.place_id || restaurant.restaurant_place_id,
      };

      const result = await FavoriteRestaurantService.toggleFavorite(user.id, restaurantData);
      
      if (result.success) {
        // Atualizar estado local
        if (result.isFavorite) {
          // Adicionado aos favoritos
          const newFavorite = {
            user_id: user.id,
            ...restaurantData,
            id: `temp-${Date.now()}`, // ID temporário
            created_at: new Date().toISOString(),
          };
          
          setFavorites(prev => [newFavorite, ...prev]);
          setFavoritesMap(prev => new Map(prev).set(restaurantData.restaurant_id, true));
          
          toast({
            title: "✅ Adicionado aos favoritos!",
            description: `${restaurantData.restaurant_name} foi salvo nos seus favoritos`,
          });
        } else {
          // Removido dos favoritos
          setFavorites(prev => prev.filter(fav => fav.restaurant_id !== restaurantData.restaurant_id));
          setFavoritesMap(prev => {
            const newMap = new Map(prev);
            newMap.delete(restaurantData.restaurant_id);
            return newMap;
          });
          
          toast({
            title: "❌ Removido dos favoritos",
            description: `${restaurantData.restaurant_name} foi removido dos seus favoritos`,
          });
        }
        
        return { success: true, isFavorite: result.isFavorite };
      } else {
        toast({
          title: "Erro ao atualizar favoritos",
          description: result.error || "Tente novamente mais tarde",
          variant: "destructive",
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Erro ao alternar favorito:', error);
      toast({
        title: "Erro inesperado",
        description: "Tente novamente mais tarde",
        variant: "destructive",
      });
      return { success: false, error: 'Erro inesperado' };
    }
  }, [user?.id, toast]);

  /**
   * ✅ REMOVER FAVORITO
   */
  const removeFavorite = useCallback(async (restaurantId) => {
    if (!user?.id) return { success: false };

    try {
      const result = await FavoriteRestaurantService.removeFromFavorites(user.id, restaurantId);
      
      if (result.success) {
        setFavorites(prev => prev.filter(fav => fav.restaurant_id !== restaurantId));
        setFavoritesMap(prev => {
          const newMap = new Map(prev);
          newMap.delete(restaurantId);
          return newMap;
        });
        
        toast({
          title: "Favorito removido",
          description: "Restaurante removido dos seus favoritos",
        });
        
        return { success: true };
      } else {
        toast({
          title: "Erro ao remover favorito",
          description: result.error || "Tente novamente mais tarde",
          variant: "destructive",
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Erro ao remover favorito:', error);
      return { success: false, error: 'Erro inesperado' };
    }
  }, [user?.id, toast]);

  /**
   * ✅ OBTER FAVORITOS PARA SUGESTÕES EM EVENTOS
   */
  const getFavoritesForSuggestions = useCallback(async () => {
    if (!user?.id) return { success: true, suggestions: [] };

    try {
      const result = await FavoriteRestaurantService.getFavoritesForEventSuggestions(user.id);
      return result;
    } catch (error) {
      console.error('❌ Erro ao buscar sugestões de favoritos:', error);
      return { success: false, error: 'Erro inesperado' };
    }
  }, [user?.id]);

  /**
   * ✅ CARREGAR FAVORITOS QUANDO COMPONENTE MONTA OU USUÁRIO MUDA
   */
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return {
    // Estado
    favorites,
    loading,
    favoritesCount: favorites.length,
    
    // Funções
    isFavorite,
    toggleFavorite,
    removeFavorite,
    loadFavorites,
    getFavoritesForSuggestions,
    
    // Utilitários
    hasFavorites: favorites.length > 0,
  };
};

export default useFavoriteRestaurants;