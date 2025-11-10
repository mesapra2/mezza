// src/services/StoragePhotoService.js
// Serviço para listar fotos diretamente do storage quando tabela não existe

import { supabase } from '@/lib/supabaseClient';

class StoragePhotoService {
  static BUCKET = 'event-photos';

  /**
   * Lista fotos de um evento diretamente do storage
   * Usado quando tabela event_photos não existe
   */
  static async getEventPhotosFromStorage(eventId) {
    try {
      // Listar arquivos na pasta do evento
      const { data: files, error } = await supabase.storage
        .from(this.BUCKET)
        .list(`${eventId}/`, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('❌ Erro ao listar fotos do storage:', error);
        return [];
      }

      if (!files || files.length === 0) {
        return [];
      }

      // Converter arquivos em objetos de foto
      const photos = files
        .filter(file => file.name && !file.name.endsWith('/')) // Filtrar pastas
        .map(file => {
          // Extrair user_id do nome do arquivo (formato: userID-timestamp.ext)
          const userId = file.name.split('-')[0];
          
          // Gerar URL pública
          const { data: urlData } = supabase.storage
            .from(this.BUCKET)
            .getPublicUrl(`${eventId}/${file.name}`);

          return {
            id: `storage_${file.name}`,
            event_id: eventId,
            user_id: userId,
            photo_url: urlData.publicUrl,
            status: 'aprovado',
            created_at: file.created_at || new Date().toISOString(),
            file_size: file.metadata?.size || 0,
            source: 'storage' // Flag para identificar origem
          };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      console.log(`📸 Encontradas ${photos.length} fotos no storage para evento ${eventId}`);
      return photos;

    } catch (error) {
      console.error('❌ Erro ao buscar fotos do storage:', error);
      return [];
    }
  }

  /**
   * Busca foto de um usuário específico no storage
   */
  static async getUserPhotoFromStorage(eventId, userId) {
    try {
      const { data: files, error } = await supabase.storage
        .from(this.BUCKET)
        .list(`${eventId}/`, {
          limit: 100
        });

      if (error || !files) {
        return null;
      }

      // Procurar arquivo que começa com o userId
      const userFile = files.find(file => 
        file.name && file.name.startsWith(`${userId}-`)
      );

      if (!userFile) {
        return null;
      }

      // Gerar URL pública
      const { data: urlData } = supabase.storage
        .from(this.BUCKET)
        .getPublicUrl(`${eventId}/${userFile.name}`);

      return {
        id: `storage_${userFile.name}`,
        event_id: eventId,
        user_id: userId,
        photo_url: urlData.publicUrl,
        status: 'aprovado',
        created_at: userFile.created_at || new Date().toISOString(),
        source: 'storage'
      };

    } catch (error) {
      console.error('❌ Erro ao buscar foto do usuário no storage:', error);
      return null;
    }
  }

  /**
   * Busca fotos híbrida: tenta banco primeiro, depois storage
   */
  static async getEventPhotosHybrid(eventId) {
    // Primeiro tentar buscar do banco
    try {
      const { data: dbPhotos, error: dbError } = await supabase
        .from('event_photos')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'aprovado')
        .order('created_at', { ascending: false });

      // Se banco funcionar, usar fotos do banco
      if (!dbError && dbPhotos) {
        console.log(`📸 Usando ${dbPhotos.length} fotos do banco para evento ${eventId}`);
        return dbPhotos.map(photo => ({ ...photo, source: 'database' }));
      }

      // Se banco falhar por tabela inexistente, buscar do storage
      if (dbError && (
        dbError.message.includes('does not exist') || 
        dbError.code === '42703' || 
        dbError.code === '42P01' ||
        dbError.code === 'PGRST204'
      )) {
        console.log('📸 Tabela event_photos não existe, buscando fotos do storage...');
        return await this.getEventPhotosFromStorage(eventId);
      }

      // Erro real do banco
      throw dbError;

    } catch (error) {
      console.error('❌ Erro na busca híbrida de fotos:', error);
      return [];
    }
  }
}

export default StoragePhotoService;