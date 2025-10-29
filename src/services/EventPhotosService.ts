// src/services/EventPhotosService.ts
import { supabase } from '../lib/supabaseClient';

interface UploadResult {
  success: boolean;
  photoUrl?: string;
  error?: string;
}

interface Photo {
  id: number;
  event_id: number;
  user_id: string;
  photo_url: string;
  file_size: number;
  status: string;
  created_at: string;
  user?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

class EventPhotosService {
  private static readonly MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  private static readonly MAX_WIDTH = 1920;
  private static readonly MAX_HEIGHT = 1080;
  private static readonly QUALITY = 0.85;

  /**
   * 📸 Faz upload de foto do evento com redimensionamento automático
   */
  static async uploadEventPhoto(
    eventId: number,
    userId: string,
    file: File
  ): Promise<UploadResult> {
    try {
      console.log(`📸 Iniciando upload de foto para evento ${eventId}...`);

      // Validação: tipo de arquivo
      if (!file.type.startsWith('image/')) {
        return { success: false, error: 'Apenas imagens são permitidas' };
      }

      // Validação: tamanho inicial
      if (file.size > 10 * 1024 * 1024) { // 10MB máximo antes do redimensionamento
        return { success: false, error: 'Arquivo muito grande (máx: 10MB)' };
      }

      // Verificar se já tem foto deste usuário neste evento
      const existingPhoto = await this.getUserPhotoForEvent(eventId, userId);
      if (existingPhoto) {
        // Deletar foto antiga antes de enviar nova
        await this.deleteEventPhoto(existingPhoto.id, userId);
      }

      // Redimensionar imagem se necessário
      const resizedFile = await this.resizeImage(file);

      // Gerar nome único para o arquivo
      const fileExt = resizedFile.name.split('.').pop();
      const fileName = `${eventId}/${userId}-${Date.now()}.${fileExt}`;

      // Upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('event-photos')
        .upload(fileName, resizedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ Erro no upload:', uploadError);
        return { success: false, error: uploadError.message };
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('event-photos')
        .getPublicUrl(fileName);

      const photoUrl = urlData.publicUrl;

      // Salvar referência no banco
      const { error: dbError } = await supabase
        .from('event_photos')
        .insert({
          event_id: eventId,
          user_id: userId,
          photo_url: photoUrl,
          file_size: resizedFile.size,
          status: 'aprovado'
        });

      if (dbError) {
        console.error('❌ Erro ao salvar no BD:', dbError);
        // Tentar deletar arquivo do storage se falhou no BD
        await supabase.storage.from('event-photos').remove([fileName]);
        return { success: false, error: dbError.message };
      }

      console.log('✅ Foto enviada com sucesso!');
      return { success: true, photoUrl };

    } catch (error: any) {
      console.error('❌ Erro ao fazer upload:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🖼️ Redimensiona imagem se ultrapassar os limites
   */
  private static async resizeImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          // Calcular novas dimensões mantendo aspect ratio
          let width = img.width;
          let height = img.height;

          if (width > this.MAX_WIDTH || height > this.MAX_HEIGHT) {
            const ratio = Math.min(this.MAX_WIDTH / width, this.MAX_HEIGHT / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // Criar canvas e redimensionar
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Erro ao criar contexto do canvas'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Converter para Blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Erro ao converter imagem'));
                return;
              }

              // Se ainda estiver acima de 2MB, reduzir qualidade
              if (blob.size > this.MAX_FILE_SIZE) {
                canvas.toBlob(
                  (compressedBlob) => {
                    if (!compressedBlob) {
                      reject(new Error('Erro ao comprimir imagem'));
                      return;
                    }
                    const newFile = new File([compressedBlob], file.name, {
                      type: 'image/jpeg',
                      lastModified: Date.now()
                    });
                    resolve(newFile);
                  },
                  'image/jpeg',
                  0.7 // Qualidade reduzida
                );
              } else {
                const newFile = new File([blob], file.name, {
                  type: blob.type,
                  lastModified: Date.now()
                });
                resolve(newFile);
              }
            },
            'image/jpeg',
            this.QUALITY
          );
        };

        img.onerror = () => reject(new Error('Erro ao carregar imagem'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * 📷 Busca todas as fotos de um evento
   */
  static async getEventPhotos(eventId: number): Promise<Photo[]> {
    try {
      const { data, error } = await supabase
        .from('event_photos')
        .select(`
          *,
          user:users!event_photos_user_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('event_id', eventId)
        .eq('status', 'aprovado')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar fotos:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro ao buscar fotos:', error);
      return [];
    }
  }

  /**
   * 🔍 Busca foto de um usuário específico para um evento
   */
  static async getUserPhotoForEvent(eventId: number, userId: string): Promise<Photo | null> {
    try {
      const { data, error } = await supabase
        .from('event_photos')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao buscar foto do usuário:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar foto do usuário:', error);
      return null;
    }
  }

  /**
   * 🗑️ Deleta foto do evento
   */
  static async deleteEventPhoto(photoId: number, userId: string): Promise<boolean> {
    try {
      // Buscar foto para pegar o path no storage
      const { data: photo, error: fetchError } = await supabase
        .from('event_photos')
        .select('photo_url, user_id')
        .eq('id', photoId)
        .single();

      if (fetchError || !photo) {
        console.error('❌ Foto não encontrada');
        return false;
      }

      // Verificar permissão
      if (photo.user_id !== userId) {
        console.error('❌ Sem permissão para deletar esta foto');
        return false;
      }

      // Extrair path do storage da URL
      const urlParts = photo.photo_url.split('/event-photos/');
      const filePath = urlParts[1];

      // Deletar do storage
      if (filePath) {
        await supabase.storage.from('event-photos').remove([filePath]);
      }

      // Deletar do banco
      const { error: deleteError } = await supabase
        .from('event_photos')
        .delete()
        .eq('id', photoId)
        .eq('user_id', userId); // Dupla verificação de segurança

      if (deleteError) {
        console.error('❌ Erro ao deletar foto do BD:', deleteError);
        return false;
      }

      console.log('✅ Foto deletada com sucesso');
      return true;

    } catch (error) {
      console.error('❌ Erro ao deletar foto:', error);
      return false;
    }
  }

  /**
   * 📊 Conta quantos participantes já enviaram fotos
   */
  static async getPhotoStats(eventId: number): Promise<{
    totalPhotos: number;
    totalParticipants: number;
    percentageWithPhotos: number;
  }> {
    try {
      // Contar fotos aprovadas
      const { count: photoCount } = await supabase
        .from('event_photos')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'aprovado');

      // Contar participantes confirmados
      const { count: participantCount } = await supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'aprovado')
        .eq('presenca_confirmada', true);

      const total = participantCount || 0;
      const photos = photoCount || 0;
      const percentage = total > 0 ? Math.round((photos / total) * 100) : 0;

      return {
        totalPhotos: photos,
        totalParticipants: total,
        percentageWithPhotos: percentage
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
}

export default EventPhotosService;