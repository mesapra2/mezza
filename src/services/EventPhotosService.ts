// src/services/EventPhotosService.ts
import { supabase } from '../lib/supabaseClient';

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

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, resizedFile, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Erro no upload:', uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);
    const publicUrl = publicUrlData?.publicUrl ?? '';

    const { error: dbError } = await supabase.from('event_photos').insert({
      event_id: eventId,
      user_id: userId,
      photo_url: publicUrl,
      file_size: resizedFile.size,
      status: 'aprovado'
    });

    if (dbError) {
      console.error('❌ Erro ao salvar no BD:', dbError);
      await supabase.storage.from(BUCKET).remove([fileName]);
      return { success: false, error: dbError.message };
    }

    console.log('✅ Foto enviada com sucesso!');
    return { success: true, photoUrl: publicUrl };
  }

  /**
   * Retorna todas as fotos aprovadas de um evento.
   */
  static async getEventPhotos(eventId: number): Promise<EventPhoto[]> {
    const { data, error } = await supabase
      .from('event_photos')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'aprovado')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar fotos:', error);
      return [];
    }

    return data ?? [];
  }

  /**
   * Retorna a foto de um usuário específico em um evento.
   */
  static async getUserPhotoForEvent(
    eventId: number,
    userId: string
  ): Promise<EventPhoto | null> {
    const { data, error } = await supabase
      .from('event_photos')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return data as EventPhoto;
  }

  /**
   * Deleta foto de evento (somente se for o dono).
   */
  static async deleteEventPhoto(
    photoId: number,
    userId: string
  ): Promise<boolean> {
    const { data: photo, error: fetchError } = await supabase
      .from('event_photos')
      .select('*')
      .eq('id', photoId)
      .maybeSingle();

    if (fetchError || !photo) {
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
      console.error('❌ Erro ao buscar stats de fotos:', error);
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
