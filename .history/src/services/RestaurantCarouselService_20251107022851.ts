/**
 * RestaurantCarouselService
 *
 * Serviço para gerenciar fotos do carousel de restaurantes
 * Busca fotos publicadas por usuários durante eventos específicos
 */

import { supabase } from '@/lib/supabaseClient';

// ✅ CORREÇÃO: Variável para o nome da tabela. 
// ATENÇÃO: Se o nome correto no seu banco não for 'restaurant_photos', 
// substitua o valor abaixo pelo nome EXATO da sua tabela (ex: 'fotos_carrossel_real').
const CAROUSEL_TABLE = 'restaurant_photos'; 

export type CarouselPhoto = {
  id: string;
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
 * Estrutura: { eventId: { url, timestamp, photo } }
 */
const thumbnailCache = new Map<string, {
  url: string | null;
  timestamp: number;
  photo: CarouselPhoto | null;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

class RestaurantCarouselServiceClass {

  /**
   * Busca a última foto publicada no carousel de um restaurante durante um evento
   * @param eventId - ID do evento
   * @param restaurantId - ID do restaurante
   * @param eventStartTime - Data/hora de início do evento
   * @param eventEndTime - Data/hora de fim do evento (opcional)
   * @returns URL da última foto ou null
   */
  async getEventThumbnail(
    eventId: string,
    restaurantId: string,
    eventStartTime: string,
    eventEndTime?: string
  ): Promise<ThumbnailResult> {
    try {
      // Verificar cache primeiro
      const cached = this.getCachedThumbnail(eventId);
      if (cached) {
        return { url: cached.url, photo: cached.photo };
      }

      // ✅ CORREÇÃO: Uso da constante com o nome da tabela
      let query = supabase
        .from(CAROUSEL_TABLE)
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', eventStartTime)
        .order('created_at', { ascending: false })
        .limit(1);

      // Se o evento já terminou, filtrar até o fim
      if (eventEndTime) {
        query = query.lte('created_at', eventEndTime);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar thumbnail do evento:', error);
        return { url: null, photo: null, error: error.message };
      }

      if (!data || data.length === 0) {
        // Cachear resultado vazio
        this.setCachedThumbnail(eventId, null, null);
        return { url: null, photo: null };
      }

      const photo = data[0] as CarouselPhoto;
      const publicUrl = this.getPublicUrl(photo.image_url);

      // Cachear resultado
      this.setCachedThumbnail(eventId, publicUrl, photo);

      return { url: publicUrl, photo };
    } catch (error: any) {
      console.error('Erro ao buscar thumbnail:', error);
      return { url: null, photo: null, error: error.message };
    }
  }

  /**
   * Busca múltiplas fotos do carousel de um restaurante durante um evento
   * @param restaurantId - ID do restaurante
   * @param eventStartTime - Data/hora de início do evento
   * @param eventEndTime - Data/hora de fim do evento (opcional)
   * @param limit - Número máximo de fotos (padrão: 10)
   * @returns Array de fotos
   */
  async getEventPhotos(
    restaurantId: string,
    eventStartTime: string,
    eventEndTime?: string,
    limit: number = 10
  ): Promise<CarouselPhoto[]> {
    try {
      // ✅ CORREÇÃO: Uso da constante com o nome da tabela
      let query = supabase
        .from(CAROUSEL_TABLE)
        .select('*')
        .eq('restaurant_id', restaurantId)
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
   * @param restaurantId - ID do restaurante
   * @param userId - ID do usuário
   * @param file - Arquivo de imagem
   * @param eventId - ID do evento (opcional)
   * @param caption - Legenda (opcional)
   * @returns Foto criada ou null
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
        .from('restaurant-carousel')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Criar registro no banco
      const { data: photoData, error: insertError } = await supabase
        .from(CAROUSEL_TABLE) // ✅ CORREÇÃO: Uso da constante com o nome da tabela
        .insert({
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
          .from('restaurant-carousel')
          .remove([fileName]);
        throw insertError;
      }

      // Limpar cache do evento se fornecido
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
   * @param imagePath - Caminho da imagem no storage
   * @returns URL pública
   */
  getPublicUrl(imagePath: string): string {
    const { data } = supabase.storage
      .from('restaurant-carousel')
      .getPublicUrl(imagePath);

    return data.publicUrl;
  }

  /**
   * Busca thumbnail do cache
   * @param eventId - ID do evento
   * @returns Dados do cache ou null
   */
  private getCachedThumbnail(eventId: string): { url: string | null; photo: CarouselPhoto | null } | null {
    const cached = thumbnailCache.get(eventId);

    if (!cached) {
      return null;
    }

    // Verificar se cache ainda é válido
    const now = Date.now();
    if (now - cached.timestamp > CACHE_DURATION) {
      thumbnailCache.delete(eventId);
      return null;
    }

    return { url: cached.url, photo: cached.photo };
  }

  /**
   * Salva thumbnail no cache
   * @param eventId - ID do evento
   * @param url - URL da foto
   * @param photo - Dados da foto
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
   * @param eventId - ID do evento
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