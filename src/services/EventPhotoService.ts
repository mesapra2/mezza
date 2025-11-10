// src/services/EventPhotoService.ts
import { supabase } from '@/lib/supabaseClient';

interface UploadPhotoParams {
  eventId: number;
  userId: string;
  file: File;
  caption?: string;
}

interface PhotoResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

class EventPhotoService {
  /**
   * 📸 Faz upload de uma foto do evento
   */
  static async uploadEventPhoto(params: UploadPhotoParams): Promise<PhotoResult> {
    try {
      const { eventId, userId, file, caption } = params;

      // 1️⃣ Verificar se o usuário é participante aprovado
      const { data: participation, error: partError } = await supabase
        .from('participations')
        .select('id, status, presenca_confirmada')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('status', 'aprovado')
        .maybeSingle();

      if (partError) throw partError;

      if (!participation) {
        return {
          success: false,
          error: 'Apenas participantes aprovados podem enviar fotos'
        };
      }

      // 2️⃣ Verificar se o evento está Finalizado ou Concluído
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('status, partner_id')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      if (!['Finalizado', 'Concluído'].includes(event.status)) {
        return {
          success: false,
          error: 'Fotos só podem ser enviadas após o evento ser finalizado'
        };
      }

      // 3️⃣ Verificar se o usuário já enviou foto (limit 1 por evento)
      const { data: existingPhoto } = await supabase
        .from('event_photos')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingPhoto) {
        return {
          success: false,
          error: 'Você já enviou uma foto para este evento'
        };
      }

      // 4️⃣ Upload da foto para o storage
      const fileExt = file.name.split('.').pop() || 'jpg';
      const timestamp = Date.now();
      const fileName = `${eventId}/${userId}_${timestamp}.${fileExt}`;

      console.log('📤 Enviando foto:', fileName);

      const { error: uploadError } = await supabase.storage
        .from('event-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      // 5️⃣ Salvar registro na tabela event_photos
      const { data: photoRecord, error: insertError } = await supabase
        .from('event_photos')
        .insert({
          event_id: eventId,
          user_id: userId,
          photo_url: fileName,
          caption: caption || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      console.log('✅ Foto salva com sucesso:', photoRecord.id);

      return {
        success: true,
        data: photoRecord,
        message: '✅ Foto enviada com sucesso!'
      };

    } catch (error: any) {
      console.error('❌ Erro ao fazer upload de foto:', error);
      return {
        success: false,
        error: error.message || 'Erro ao enviar foto'
      };
    }
  }

  /**
   * 🖼️ Busca fotos de um evento específico
   */
  static async getEventPhotos(eventId: number): Promise<PhotoResult> {
    try {
      const { data, error } = await supabase
        .from('event_photos')
        .select(`
          id,
          photo_url,
          caption,
          created_at,
          user_id,
          profile:profiles!user_id(username, avatar_url)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Gerar URLs públicas
      const photosWithUrls = (data || []).map(photo => ({
        ...photo,
        publicUrl: this.getPhotoPublicUrl(photo.photo_url)
      }));

      return {
        success: true,
        data: photosWithUrls
      };

    } catch (error: any) {
      console.error('❌ Erro ao buscar fotos do evento:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🏢 Busca fotos de eventos realizados em um restaurante
   */
  static async getRestaurantPhotos(partnerId: string): Promise<PhotoResult> {
    try {
      const { data, error } = await supabase
        .from('event_photos')
        .select(`
          id,
          photo_url,
          caption,
          created_at,
          event:events!inner(id, title, partner_id),
          profile:profiles!user_id(username, avatar_url)
        `)
        .eq('events.partner_id', partnerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Gerar URLs públicas
      const photosWithUrls = (data || []).map(photo => ({
        ...photo,
        publicUrl: this.getPhotoPublicUrl(photo.photo_url)
      }));

      return {
        success: true,
        data: photosWithUrls
      };

    } catch (error: any) {
      console.error('❌ Erro ao buscar fotos do restaurante:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🗑️ Deleta uma foto (apenas o dono pode deletar)
   */
  static async deletePhoto(photoId: string, userId: string): Promise<PhotoResult> {
    try {
      // 1️⃣ Buscar a foto
      const { data: photo, error: fetchError } = await supabase
        .from('event_photos')
        .select('photo_url, user_id')
        .eq('id', photoId)
        .single();

      if (fetchError) throw fetchError;

      // 2️⃣ Verificar se é o dono
      if (photo.user_id !== userId) {
        return {
          success: false,
          error: 'Você só pode deletar suas próprias fotos'
        };
      }

      // 3️⃣ Deletar do storage
      const { error: storageError } = await supabase.storage
        .from('event-photos')
        .remove([photo.photo_url]);

      if (storageError) {
        console.error('⚠️ Erro ao deletar do storage (continuando):', storageError);
      }

      // 4️⃣ Deletar do banco
      const { error: deleteError } = await supabase
        .from('event_photos')
        .delete()
        .eq('id', photoId);

      if (deleteError) throw deleteError;

      return {
        success: true,
        message: 'Foto deletada com sucesso'
      };

    } catch (error: any) {
      console.error('❌ Erro ao deletar foto:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🔗 Gera URL pública de uma foto
   */
  static getPhotoPublicUrl(photoPath: string): string {
    if (!photoPath) return '';

    // Se já for URL completa
    if (photoPath.startsWith('http')) {
      return photoPath;
    }

    const { data } = supabase.storage
      .from('event-photos')
      .getPublicUrl(photoPath);

    return data.publicUrl;
  }

  /**
   * ✅ Verifica se o usuário já enviou foto para o evento
   */
  static async hasUserUploadedPhoto(eventId: number, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('event_photos')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar foto:', error);
        return false;
      }

      return !!data;

    } catch (error) {
      console.error('❌ Erro ao verificar foto:', error);
      return false;
    }
  }

  /**
   * 📊 Estatísticas de fotos de um evento
   */
  static async getEventPhotoStats(eventId: number): Promise<{
    success: boolean;
    data?: {
      totalPhotos: number;
      totalParticipants: number;
      uploadPercentage: number;
    };
  }> {
    try {
      // Total de fotos
      const { count: photosCount, error: photosError } = await supabase
        .from('event_photos')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId);

      if (photosError) throw photosError;

      // Total de participantes aprovados
      const { count: participantsCount, error: participantsError } = await supabase
        .from('participations')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'aprovado');

      if (participantsError) throw participantsError;

      const total = participantsCount || 0;
      const uploaded = photosCount || 0;
      const percentage = total > 0 ? Math.round((uploaded / total) * 100) : 0;

      return {
        success: true,
        data: {
          totalPhotos: uploaded,
          totalParticipants: total,
          uploadPercentage: percentage
        }
      };

    } catch (error: any) {
      console.error('❌ Erro ao buscar stats de fotos:', error);
      return { success: false };
    }
  }
}

export default EventPhotoService;