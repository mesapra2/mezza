/**
 * ========================================
 * SERVIÇO DE RESTAURANTES FAVORITOS
 * ========================================
 * 
 * Gerencia todas as operações relacionadas aos restaurantes favoritos dos usuários
 */

import { supabase } from '@/lib/supabaseClient';

// Temporary state manager to prevent repeated API calls to non-existent table
class FavoritesStateManager {
  private tableExists: boolean | null = null; // null = unknown, true = exists, false = doesn't exist
  private lastCheck: number | null = null;
  private checkCooldown = 30000; // 30 seconds cooldown before retrying

  isTableMissing(): boolean {
    return this.tableExists === false;
  }

  markTableAsMissing(): void {
    this.tableExists = false;
    this.lastCheck = Date.now();
    console.warn('🚫 Tabela de favoritos marcada como inexistente - API calls serão evitadas');
  }

  markTableAsExists(): void {
    this.tableExists = true;
    this.lastCheck = Date.now();
    console.log('✅ Tabela de favoritos confirmada como existente');
  }

  shouldSkipApiCall(): boolean {
    if (this.tableExists === false) {
      const timeSinceLastCheck = this.lastCheck ? Date.now() - this.lastCheck : 0;
      if (timeSinceLastCheck < this.checkCooldown) {
        return true; // Skip API call, table known to be missing
      } else {
        // Reset state after cooldown to retry
        this.tableExists = null;
        return false;
      }
    }
    return false; // Don't skip if we don't know or table exists
  }

  reset(): void {
    this.tableExists = null;
    this.lastCheck = null;
  }
}

const favoritesStateManager = new FavoritesStateManager();

export interface FavoriteRestaurant {
  id?: string;
  user_id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_address?: string;
  restaurant_photo_url?: string;
  restaurant_rating?: number;
  restaurant_place_id?: string;
  created_at?: string;
  updated_at?: string;
}

export class FavoriteRestaurantService {
  
  /**
   * ✅ ADICIONAR RESTAURANTE AOS FAVORITOS
   */
  static async addToFavorites(userId: string, restaurant: {
    restaurant_id: string;
    restaurant_name: string;
    restaurant_address?: string;
    restaurant_photo_url?: string;
    restaurant_rating?: number;
    restaurant_place_id?: string;
  }): Promise<{ success: boolean; data?: FavoriteRestaurant; error?: string }> {
    // Skip API call if we know the table doesn't exist
    if (favoritesStateManager.shouldSkipApiCall()) {
      return { success: false, error: 'Sistema de favoritos ainda não configurado' };
    }

    try {
      const { data, error } = await supabase
        .from('user_favorite_restaurants')
        .insert({
          user_id: userId,
          ...restaurant
        })
        .select()
        .single();

      if (error) {
        // Handle table not found error (PGRST205) silently
        if (error.code === 'PGRST205' && error.message.includes('user_favorite_restaurants')) {
          favoritesStateManager.markTableAsMissing();
          return { success: false, error: 'Sistema de favoritos ainda não configurado' };
        }
        
        console.error('❌ Erro ao adicionar aos favoritos:', error);
        
        // Verifica se é erro de duplicata
        if (error.code === '23505') {
          return { success: false, error: 'Restaurante já está nos seus favoritos' };
        }
        
        return { success: false, error: 'Erro ao adicionar aos favoritos' };
      }

      // Mark table as existing if we get here
      favoritesStateManager.markTableAsExists();
      console.log('✅ Restaurante adicionado aos favoritos:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Erro inesperado ao adicionar aos favoritos:', error);
      return { success: false, error: 'Erro inesperado' };
    }
  }

  /**
   * ✅ REMOVER RESTAURANTE DOS FAVORITOS
   */
  static async removeFromFavorites(userId: string, restaurantId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_favorite_restaurants')
        .delete()
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId);

      if (error) {
        console.error('❌ Erro ao remover dos favoritos:', error);
        return { success: false, error: 'Erro ao remover dos favoritos' };
      }

      console.log('✅ Restaurante removido dos favoritos');
      return { success: true };
    } catch (error) {
      console.error('❌ Erro inesperado ao remover dos favoritos:', error);
      return { success: false, error: 'Erro inesperado' };
    }
  }

  /**
   * ✅ LISTAR RESTAURANTES FAVORITOS DO USUÁRIO
   */
  static async getUserFavorites(userId: string): Promise<{ success: boolean; data?: FavoriteRestaurant[]; error?: string }> {
    // Skip API call if we know the table doesn't exist
    if (favoritesStateManager.shouldSkipApiCall()) {
      return { success: true, data: [] };
    }

    try {
      const { data, error } = await supabase
        .from('user_favorite_restaurants')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        // Handle table not found error (PGRST205) silently
        if (error.code === 'PGRST205' && error.message.includes('user_favorite_restaurants')) {
          favoritesStateManager.markTableAsMissing();
          return { success: true, data: [] }; // Return empty array instead of error
        }
        
        console.error('❌ Erro ao buscar favoritos:', error);
        return { success: false, error: 'Erro ao carregar favoritos' };
      }

      // Mark table as existing if we get here
      favoritesStateManager.markTableAsExists();
      console.log(`✅ Carregados ${data?.length || 0} restaurantes favoritos`);
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar favoritos:', error);
      return { success: false, error: 'Erro inesperado' };
    }
  }

  /**
   * ✅ VERIFICAR SE RESTAURANTE ESTÁ NOS FAVORITOS
   */
  static async isFavorite(userId: string, restaurantId: string): Promise<{ success: boolean; isFavorite?: boolean; error?: string }> {
    // Skip API call if we know the table doesn't exist
    if (favoritesStateManager.shouldSkipApiCall()) {
      return { success: true, isFavorite: false };
    }

    try {
      const { data, error } = await supabase
        .from('user_favorite_restaurants')
        .select('id')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .single();

      if (error) {
        // Handle table not found error (PGRST205) silently
        if (error.code === 'PGRST205' && error.message.includes('user_favorite_restaurants')) {
          favoritesStateManager.markTableAsMissing();
          return { success: true, isFavorite: false }; // Return false if table doesn't exist
        }
        
        // Se não encontrou, não é um erro, apenas não é favorito
        if (error.code === 'PGRST116') {
          return { success: true, isFavorite: false };
        }
        
        console.error('❌ Erro ao verificar favorito:', error);
        return { success: false, error: 'Erro ao verificar favorito' };
      }

      // Mark table as existing if we get here
      favoritesStateManager.markTableAsExists();
      return { success: true, isFavorite: !!data };
    } catch (error) {
      console.error('❌ Erro inesperado ao verificar favorito:', error);
      return { success: false, error: 'Erro inesperado' };
    }
  }

  /**
   * ✅ ALTERNAR STATUS DE FAVORITO (TOGGLE)
   */
  static async toggleFavorite(userId: string, restaurant: {
    restaurant_id: string;
    restaurant_name: string;
    restaurant_address?: string;
    restaurant_photo_url?: string;
    restaurant_rating?: number;
    restaurant_place_id?: string;
  }): Promise<{ success: boolean; isFavorite?: boolean; error?: string }> {
    try {
      // Primeiro verifica se já é favorito
      const checkResult = await this.isFavorite(userId, restaurant.restaurant_id);
      
      if (!checkResult.success) {
        return { success: false, error: checkResult.error };
      }

      if (checkResult.isFavorite) {
        // Se é favorito, remove
        const removeResult = await this.removeFromFavorites(userId, restaurant.restaurant_id);
        return { 
          success: removeResult.success, 
          isFavorite: false,
          error: removeResult.error 
        };
      } else {
        // Se não é favorito, adiciona
        const addResult = await this.addToFavorites(userId, restaurant);
        return { 
          success: addResult.success, 
          isFavorite: true,
          error: addResult.error 
        };
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao alternar favorito:', error);
      return { success: false, error: 'Erro inesperado' };
    }
  }

  /**
   * ✅ BUSCAR FAVORITOS PARA SUGESTÕES EM EVENTOS
   * Retorna favoritos formatados para uso em formulários de criação de eventos
   */
  static async getFavoritesForEventSuggestions(userId: string): Promise<{ 
    success: boolean; 
    suggestions?: Array<{
      id: string;
      name: string;
      address?: string;
      photo_url?: string;
      rating?: number;
      place_id?: string;
      isFavorite: true;
    }>; 
    error?: string 
  }> {
    try {
      const result = await this.getUserFavorites(userId);
      
      if (!result.success || !result.data) {
        return { success: false, error: result.error };
      }

      const suggestions = result.data.map(fav => ({
        id: fav.restaurant_id,
        name: fav.restaurant_name,
        address: fav.restaurant_address,
        photo_url: fav.restaurant_photo_url,
        rating: fav.restaurant_rating,
        place_id: fav.restaurant_place_id,
        isFavorite: true
      }));

      console.log(`✅ ${suggestions.length} favoritos preparados para sugestões`);
      return { success: true, suggestions };
    } catch (error) {
      console.error('❌ Erro ao preparar sugestões de favoritos:', error);
      return { success: false, error: 'Erro inesperado' };
    }
  }

  /**
   * ✅ ATUALIZAR DADOS DE UM RESTAURANTE FAVORITO
   * Útil para atualizar informações como rating ou foto quando disponíveis
   */
  static async updateFavoriteInfo(userId: string, restaurantId: string, updates: {
    restaurant_name?: string;
    restaurant_address?: string;
    restaurant_photo_url?: string;
    restaurant_rating?: number;
    restaurant_place_id?: string;
  }): Promise<{ success: boolean; data?: FavoriteRestaurant; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('user_favorite_restaurants')
        .update(updates)
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao atualizar favorito:', error);
        return { success: false, error: 'Erro ao atualizar favorito' };
      }

      console.log('✅ Informações do favorito atualizadas:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Erro inesperado ao atualizar favorito:', error);
      return { success: false, error: 'Erro inesperado' };
    }
  }
}

export default FavoriteRestaurantService;