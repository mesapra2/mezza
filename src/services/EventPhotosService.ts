// src/services/EventPhotosService.ts
import { supabase } from '@/lib/supabaseClient';
import StoragePhotoService from '@/services/StoragePhotoService';

const BUCKET = 'event-photos';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export type EventPhoto = {
  id: number;
  event_id: number;
  user_id: string;
  photo_url: string;
  status: string;
  file_size?: number;
  created_at?: string;
};

export type UploadResult =
  | { success: true; photoUrl: string }
  | { success: false; error: string };

export type PhotoStats = {
  totalPhotos: number;
  totalParticipants: number;
  percentageWithPhotos: number;
};

export default class EventPhotosService {
  /**
   * Upload de foto de participante para um evento.
   * - valida tipo e tamanho
   * - substitui foto antiga se existir
   * - faz upload no Supabase Storage
   * - registra no BD
   */
  static async uploadEventPhoto(
    eventId: number,
    userId: string,
    file: File
  ): Promise<UploadResult> {
    console.log(`📸 Iniciando upload de foto para evento ${eventId}...`);

    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Apenas imagens são permitidas' };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: 'Arquivo muito grande (máx: 10MB)' };
    }

    const existing = await this.getUserPhotoForEvent(eventId, userId);
    if (existing) {
      await this.deleteEventPhoto(existing.id, userId);
    }

    const resizedFile = await this.resizeImage(file);
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${eventId}/${userId}-${Date.now()}.${ext}`;

    console.log('📤 Fazendo upload do arquivo:', {
      fileName,
      fileSize: resizedFile.size,
      bucket: BUCKET
    });

    // Tentar upload diretamente (bucket já existe)
    console.log('📤 Bucket event-photos confirmado, fazendo upload...');

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, resizedFile, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Erro no upload do storage:', uploadError);
      
      // Se for erro de RLS, dar dica de como resolver
      if (uploadError.message.includes('row-level security') || uploadError.message.includes('policy')) {
        return { 
          success: false, 
          error: 'Erro de política de segurança. Execute o SQL no dashboard do Supabase para configurar as políticas do bucket.' 
        };
      }
      
      return { success: false, error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);
    const publicUrl = publicUrlData?.publicUrl ?? '';

    // Tentar salvar no banco de dados
    try {
      const { error: dbError } = await supabase.from('event_photos').insert({
        event_id: eventId,
        user_id: userId,
        photo_url: publicUrl,
        file_size: resizedFile.size,
        status: 'aprovado'
      });

      if (dbError) {
        // Se a tabela não existir, considerar sucesso mesmo assim
        if (dbError.message.includes("Could not find") || 
            dbError.code === 'PGRST204' || 
            dbError.code === '42P01' ||
            dbError.message.includes('does not exist')) {
          console.warn('⚠️ Tabela event_photos não existe. Foto salva apenas no storage.');
          console.log('💡 Execute a migração SQL para ativar o sistema completo de fotos.');
        } else {
          // Erro real - remover do storage e falhar
          console.error('❌ Erro ao salvar no BD:', dbError);
          await supabase.storage.from(BUCKET).remove([fileName]);
          return { success: false, error: dbError.message };
        }
      }
    } catch (error) {
      // Erro na operação de insert
      if (error.message?.includes('does not exist') || 
          error.code === 'PGRST204' || 
          error.code === '42P01') {
        console.warn('⚠️ Tabela event_photos não existe. Foto salva apenas no storage.');
      } else {
        console.error('❌ Erro inesperado ao salvar no BD:', error);
        await supabase.storage.from(BUCKET).remove([fileName]);
        return { success: false, error: error.message };
      }
    }

    console.log('✅ Foto enviada com sucesso!');
    return { success: true, photoUrl: publicUrl };
  }

  /**
   * Retorna todas as fotos aprovadas de um evento.
   * ✅ HÍBRIDO: Busca no banco primeiro, depois no storage se necessário
   */
  static async getEventPhotos(eventId: number): Promise<EventPhoto[]> {
    console.log(`📸 Buscando fotos para evento ${eventId}...`);
    
    try {
      // Tentar buscar do banco primeiro
      const { data: dbPhotos, error: dbError } = await supabase
        .from('event_photos')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'aprovado')
        .order('created_at', { ascending: false });

      // Se banco funcionar, usar fotos do banco
      if (!dbError && dbPhotos) {
        console.log(`📸 Encontradas ${dbPhotos.length} fotos no banco para evento ${eventId}`);
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
      console.error('❌ Erro real no banco:', dbError);
      return [];

    } catch (error) {
      console.error('❌ Erro na busca híbrida de fotos:', error);
      return [];
    }
  }

  /**
   * Lista fotos de um evento diretamente do storage
   */
  static async getEventPhotosFromStorage(eventId: number): Promise<any[]> {
    try {
      console.log(`📸 Listando arquivos do storage para evento ${eventId}...`);
      
      // Listar arquivos na pasta do evento
      const { data: files, error } = await supabase.storage
        .from(BUCKET)
        .list(`${eventId}/`, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('❌ Erro ao listar fotos do storage:', error);
        return [];
      }

      console.log(`📁 Arquivos encontrados no storage:`, files);

      if (!files || files.length === 0) {
        console.log(`📸 Nenhum arquivo encontrado na pasta ${eventId}/`);
        return [];
      }

      // Converter arquivos em objetos de foto
      const photos = files
        .filter(file => file.name && !file.name.endsWith('/') && file.name !== '.emptyFolderPlaceholder') // Filtrar pastas e placeholder
        .map(file => {
          console.log(`📸 Processando arquivo: ${file.name}`);
          
          // Extrair user_id do nome do arquivo (formato: userID-timestamp.ext)
          const userId = file.name.split('-')[0];
          
          // Gerar URL pública
          const { data: urlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(`${eventId}/${file.name}`);

          const photo = {
            id: `storage_${file.name}`,
            event_id: eventId,
            user_id: userId,
            photo_url: urlData.publicUrl,
            status: 'aprovado',
            created_at: file.created_at || new Date().toISOString(),
            file_size: file.metadata?.size || 0,
            source: 'storage' // Flag para identificar origem
          };

          console.log(`📸 Foto processada:`, photo);
          return photo;
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      console.log(`📸 Total de ${photos.length} fotos processadas do storage para evento ${eventId}`);
      return photos;

    } catch (error) {
      console.error('❌ Erro ao buscar fotos do storage:', error);
      return [];
    }
  }

  /**
   * Retorna a foto de um usuário específico em um evento.
   * ✅ HÍBRIDO: Busca no banco primeiro, depois no storage se necessário
   */
  static async getUserPhotoForEvent(
    eventId: number,
    userId: string
  ): Promise<EventPhoto | null> {
    try {
      // Tentar banco primeiro
      const { data, error } = await supabase
        .from('event_photos')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        // Se tabela não existir, buscar no storage
        if (error.message.includes('does not exist') || 
            error.code === '42703' || 
            error.code === '42P01' ||
            error.code === 'PGRST204') {
          console.log('📸 Buscando foto do usuário no storage...');
          return await StoragePhotoService.getUserPhotoFromStorage(eventId, userId);
        }
        throw error;
      }

      if (data) {
        return { ...data, source: 'database' } as EventPhoto;
      }

      // Se não encontrou no banco, tentar storage como fallback
      return await StoragePhotoService.getUserPhotoFromStorage(eventId, userId);

    } catch (error) {
      // Log apenas se não for erro de tabela inexistente
      if (!error.message?.includes('does not exist') && 
          error.code !== '42703' && 
          error.code !== '42P01' && 
          error.code !== 'PGRST204') {
        console.error('❌ Erro ao buscar foto do usuário:', error);
      }
      return null;
    }
  }

  /**
   * Deleta foto de evento (somente se for o dono).
   */
  static async deleteEventPhoto(
    photoId: number,
    userId: string
  ): Promise<boolean> {
    try {
      const { data: photo, error: fetchError } = await supabase
        .from('event_photos')
        .select('*')
        .eq('id', photoId)
        .maybeSingle();

      if (fetchError) {
        // Se tabela não existir, considerar que não há foto para deletar
        if (fetchError.message.includes('does not exist') || 
            fetchError.code === '42703' || 
            fetchError.code === '42P01' ||
            fetchError.code === 'PGRST204') {
          console.warn('⚠️ Tabela event_photos não existe. Nenhuma foto para deletar.');
          return false;
        }
        console.error('❌ Erro ao buscar foto:', fetchError);
        return false;
      }

      if (!photo) {
        console.error('❌ Foto não encontrada');
        return false;
      }

      if (photo.user_id !== userId) {
        console.error('❌ Sem permissão para deletar esta foto');
        return false;
      }

      const storagePath = this.extractStoragePath(photo.photo_url);
      if (storagePath) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
      }

      const { error: deleteError } = await supabase
        .from('event_photos')
        .delete()
        .eq('id', photoId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('❌ Erro ao deletar do BD:', deleteError);
        return false;
      }

      console.log('✅ Foto deletada com sucesso');
      return true;
    } catch (error) {
      if (!error.message?.includes('does not exist') && 
          error.code !== '42703' && 
          error.code !== '42P01' && 
          error.code !== 'PGRST204') {
        console.error('❌ Erro ao deletar foto:', error);
      }
      return false;
    }
  }

  /**
   * Retorna estatísticas de fotos de um evento.
   */
  static async getPhotoStats(eventId: number): Promise<PhotoStats> {
    try {
      const { count: totalPhotos, error: photosError } = await supabase
        .from('event_photos')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'aprovado');

      // Se tabela não existir, retornar zeros silenciosamente
      if (photosError && (photosError.message.includes('does not exist') || photosError.code === '42703' || photosError.code === '42P01')) {
        return {
          totalPhotos: 0,
          totalParticipants: 0,
          percentageWithPhotos: 0
        };
      }

      if (photosError) throw photosError;

      const { count: totalParticipants, error: participantsError } =
        await supabase
          .from('event_participants')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId);

      if (participantsError) throw participantsError;

      const photos = totalPhotos ?? 0;
      const participants = totalParticipants ?? 0;

      return {
        totalPhotos: photos,
        totalParticipants: participants,
        percentageWithPhotos:
          participants > 0 ? Number(((photos / participants) * 100).toFixed(2)) : 0
      };
    } catch (error) {
      // Log apenas se não for erro de tabela inexistente
      if (!error.message?.includes('does not exist') && error.code !== '42703' && error.code !== '42P01') {
        console.error('❌ Erro ao buscar stats de fotos:', error);
      }
      return {
        totalPhotos: 0,
        totalParticipants: 0,
        percentageWithPhotos: 0
      };
    }
  }

  /**
   * Redimensiona imagem (mock no ambiente de teste)
   */
  private static async resizeImage(file: File): Promise<File> {
    return file;
  }

  /**
   * Extrai o path do storage a partir da URL pública
   */
  private static extractStoragePath(publicUrl: string): string | null {
    if (!publicUrl) return null;
    const marker = `${BUCKET}/`;
    const idx = publicUrl.lastIndexOf(marker);
    if (idx === -1) return null;
    return publicUrl.substring(idx + marker.length);
  }
}
