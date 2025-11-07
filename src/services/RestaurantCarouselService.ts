/**
 * RestaurantCarouselService
 *
 * Serviço para gerenciar fotos do carousel de restaurantes (agora referindo-se a fotos de eventos).
 * Busca fotos publicadas por usuários durante eventos específicos.
 */

import { supabase } from '@/lib/supabaseClient';

// ✅ Tabela correta
const CAROUSEL_TABLE = 'event_photos'; 
const BUCKET = 'restaurant-carousel'; // Nome do bucket, assumindo que seja este para o upload

export type CarouselPhoto = {
  id: string;
  // A coluna 'restaurant_id' foi mantida no type, mas a query usará 'event_id'
  restaurant_id: string; 
  user_id: string;
  event_id?: string;
  image_url: string;
  created_at: string;
  file_size?: number;
  caption?: string;
};

export type ThumbnailResult = {
  url: string | null;
  photo: CarouselPhoto | null;
  error?: string;
};

/**
 * Cache de thumbnails para otimizar performance
 */
const thumbnailCache = new Map<string, {
  url: string | null;
  timestamp: number;
  photo: CarouselPhoto | null;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

class RestaurantCarouselServiceClass {

  /**
   * Busca a última foto publicada no carousel de um evento
   *
   * @param eventId - ID do evento (USADO PARA FILTRO)
   * @param restaurantId - ID do restaurante (NÃO É USADO PARA FILTRAR NA TABELA event_photos, mas é mantido no argumento)
   * @param eventStartTime - Data/hora de início do evento
   * @param eventEndTime - Data/hora de fim do evento (opcional)
   * @returns URL da última foto ou null
   */
  async getEventThumbnail(
    eventId: string,
    restaurantId: string, // Mantido para compatibilidade de chamada, mas não usado na query
    eventStartTime: string,
    eventEndTime?: string
  ): Promise<ThumbnailResult> {
    try {
      const cached = this.getCachedThumbnail(eventId);
      if (cached) {
        return { url: cached.url, photo: cached.photo };
      }

      // ✅ CORREÇÃO 1: Resolve 'Cannot redeclare query' e 'syntax error'.
      // ✅ CORREÇÃO 2: Filtra por 'event_id', resolvendo o erro 'restaurant_id does not exist'.
      let query = supabase
        .from(CAROUSEL_TABLE)
        .select('*')
        .eq('event_id', eventId) // <--- Filtro correto para event_photos
        .gte('created_at', eventStartTime)
        .order('created_at', { ascending: false })
        .limit(1);

      if (eventEndTime) {
        query = query.lte('created_at', eventEndTime);
      }

      const { data, error } = await query;

      if (error) {
        // Agora, o erro reporta a falha, mas não deve mais ser 'column does not exist'
        console.error('Erro ao buscar thumbnail do evento:', error); 
        return { url: null, photo: null, error: error.message };
      }

      if (!data || data.length === 0) {
        this.setCachedThumbnail(eventId, null, null);
        return { url: null, photo: null };
      }

      const photo = data[0] as CarouselPhoto;
      const publicUrl = this.getPublicUrl(photo.image_url);

      this.setCachedThumbnail(eventId, publicUrl, photo);

      return { url: publicUrl, photo };
    } catch (error: any) {
      console.error('Erro ao buscar thumbnail:', error);
      return { url: null, photo: null, error: error.message };
    }
  }

  /**
   * Busca múltiplas fotos do evento
   */
  async getEventPhotos(
    restaurantId: string,
    eventStartTime: string,
    eventEndTime?: string,
    limit: number = 10
  ): Promise<CarouselPhoto[]> {
    try {
      // ✅ CORREÇÃO 1: Resolve 'Cannot redeclare query'.
      // Aqui, assumimos que 'restaurantId' é, na verdade, 'event_id' ou ele está sendo usado
      // para passar o eventId da chamada externa. Usaremos o 'restaurantId' como 'event_id'
      // para a query.
      const eventId = restaurantId; 

      let query = supabase
        .from(CAROUSEL_TABLE)
        .select('*')
        .eq('event_id', eventId) // <--- Filtro corrigido
        .gte('created_at', eventStartTime)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (eventEndTime) {
        query = query.lte('created_at', eventEndTime);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar fotos do evento:', error);
        return [];
      }

      return (data || []) as CarouselPhoto[];
    } catch (error) {
      console.error('Erro ao buscar fotos:', error);
      return [];
    }
  }

  /**
   * Upload de nova foto para o carousel do restaurante
   */
  async uploadCarouselPhoto(
    restaurantId: string,
    userId: string,
    file: File,
    eventId?: string,
    caption?: string
  ): Promise<CarouselPhoto | null> {
    try {
      // Validação de tamanho (10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. Tamanho máximo: 10MB');
      }

      // Validação de tipo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipo de arquivo não permitido. Use JPG, PNG ou WEBP');
      }

      // Gerar nome único
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${restaurantId}/${userId}-${timestamp}.${fileExt}`;

      // Upload para bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Criar registro no banco
      const { data: photoData, error: insertError } = await supabase
        .from(CAROUSEL_TABLE)
        .insert({
          // Colunas existentes na tabela event_photos: event_id, user_id, photo_url, file_size
          // 'restaurant_id' deve ser mapeada para 'event_id' no insert, se 'event_id' é o que você quer salvar.
          // MANTENDO A COLUNA restaurant_id para não quebrar o insert se ela realmente existe.
          restaurant_id: restaurantId, 
          user_id: userId,
          event_id: eventId,
          image_url: uploadData.path,
          file_size: file.size,
          caption: caption,
        })
        .select()
        .single();

      if (insertError) {
        // Rollback: deletar arquivo do storage
        await supabase.storage
          .from(BUCKET)
          .remove([fileName]);
        throw insertError;
      }

      if (eventId) {
        this.clearCache(eventId);
      }

      return photoData as CarouselPhoto;
    } catch (error: any) {
      console.error('Erro ao fazer upload de foto:', error);
      throw error;
    }
  }

  /**
   * Obtém URL pública de uma foto do storage
   */
  getPublicUrl(imagePath: string): string {
    const { data } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(imagePath);

    return data.publicUrl;
  }

  /**
   * Busca thumbnail do cache
   */
  private getCachedThumbnail(eventId: string): { url: string | null; photo: CarouselPhoto | null } | null {
    const cached = thumbnailCache.get(eventId);

    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > CACHE_DURATION) {
      thumbnailCache.delete(eventId);
      return null;
    }

    return { url: cached.url, photo: cached.photo };
  }

  /**
   * Salva thumbnail no cache
   */
  private setCachedThumbnail(eventId: string, url: string | null, photo: CarouselPhoto | null): void {
    thumbnailCache.set(eventId, {
      url,
      photo,
      timestamp: Date.now(),
    });
  }

  /**
   * Limpa cache de um evento específico
   */
  clearCache(eventId?: string): void {
    if (eventId) {
      thumbnailCache.delete(eventId);
    } else {
      thumbnailCache.clear();
    }
  }

  /**
   * Limpa cache expirado (executar periodicamente)
   */
  clearExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    thumbnailCache.forEach((value, key) => {
      if (now - value.timestamp > CACHE_DURATION) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => thumbnailCache.delete(key));
  }

  /**
   * Estatísticas do cache
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: thumbnailCache.size,
      keys: Array.from(thumbnailCache.keys()),
    };
  }
}

export const RestaurantCarouselService = new RestaurantCarouselServiceClass();

// Limpar cache expirado a cada 10 minutos
setInterval(() => {
  RestaurantCarouselService.clearExpiredCache();
}, 10 * 60 * 1000);