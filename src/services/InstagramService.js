// src/services/InstagramService.js
import { supabase } from '@/lib/supabaseClient';

/**
 * Serviço para integração com Instagram
 * Permite conectar conta Instagram e importar fotos para o perfil
 */
class InstagramService {
  
  /**
   * Conecta conta Instagram via OAuth manual
   * @returns {Promise<void>} - Redireciona para o Instagram
   */
  static async connectInstagram() {
    try {
      // Configurações do Instagram OAuth
      const instagramAppId = import.meta.env.VITE_INSTAGRAM_APP_ID;
      const baseUrl = window.location.origin;
      const redirectUri = `${baseUrl}/auth/instagram-callback`;
      
      if (!instagramAppId) {
        throw new Error('Instagram App ID não configurado. Configure VITE_INSTAGRAM_APP_ID no arquivo .env');
      }

      // URL de autorização do Instagram
      const authUrl = new URL('https://api.instagram.com/oauth/authorize');
      authUrl.searchParams.set('client_id', instagramAppId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', 'user_profile,user_media');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('state', `instagram_${Date.now()}`); // Estado para segurança

      console.log('✅ Redirecionando para Instagram OAuth...', authUrl.toString());
      
      // Redirecionar para o Instagram
      window.location.href = authUrl.toString();
      
    } catch (error) {
      console.error('❌ Erro ao conectar Instagram:', error);
      throw new Error(error.message || 'Não foi possível conectar com o Instagram. Tente novamente.');
    }
  }

  /**
   * Troca código de autorização por token de acesso
   * @param {string} authCode - Código de autorização recebido do Instagram
   * @returns {Promise<Object>} - Dados do token e perfil
   */
  static async exchangeCodeForToken(authCode) {
    try {
      const instagramAppId = import.meta.env.VITE_INSTAGRAM_APP_ID;
      const instagramAppSecret = import.meta.env.VITE_INSTAGRAM_APP_SECRET;
      const baseUrl = window.location.origin;
      const redirectUri = `${baseUrl}/auth/instagram-callback`;

      if (!instagramAppId || !instagramAppSecret) {
        throw new Error('Credenciais do Instagram não configuradas');
      }

      // Primeira etapa: trocar código por token de acesso
      const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: instagramAppId,
          client_secret: instagramAppSecret,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code: authCode,
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Erro ao obter token: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();

      // Segunda etapa: obter dados do perfil
      const profileResponse = await fetch(
        `https://graph.instagram.com/me?fields=id,username&access_token=${tokenData.access_token}`
      );

      if (!profileResponse.ok) {
        throw new Error(`Erro ao obter perfil: ${profileResponse.status}`);
      }

      const profileData = await profileResponse.json();

      return {
        accessToken: tokenData.access_token,
        profile: {
          id: profileData.id,
          username: profileData.username,
        },
      };
    } catch (error) {
      console.error('❌ Erro ao trocar código por token:', error);
      throw error;
    }
  }

  /**
   * Salva token do Instagram no perfil do usuário
   * @param {string} userId - ID do usuário
   * @param {string} accessToken - Token de acesso do Instagram
   * @param {Object} profileData - Dados do perfil do Instagram
   * @returns {Promise<boolean>} - Sucesso da operação
   */
  static async saveInstagramConnection(userId, accessToken, profileData) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          instagram_token: accessToken,
          instagram_user_id: profileData.id,
          instagram_username: profileData.username,
          instagram_connected_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      console.log('✅ Conexão Instagram salva com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar conexão Instagram:', error);
      throw error;
    }
  }

  /**
   * Verifica se usuário tem Instagram conectado
   * @param {string} userId - ID do usuário
   * @returns {Promise<Object|null>} - Dados da conexão ou null
   */
  static async getInstagramConnection(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('instagram_token, instagram_user_id, instagram_username, instagram_connected_at')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data.instagram_token && data.instagram_user_id) {
        return {
          token: data.instagram_token,
          userId: data.instagram_user_id,
          username: data.instagram_username,
          connectedAt: data.instagram_connected_at
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Erro ao verificar conexão Instagram:', error);
      return null;
    }
  }

  /**
   * Busca fotos do Instagram do usuário
   * @param {string} accessToken - Token de acesso
   * @returns {Promise<Array>} - Array de fotos do Instagram
   */
  static async fetchInstagramPhotos(accessToken) {
    try {
      const response = await fetch(
        `https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,caption&access_token=${accessToken}`
      );

      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.status}`);
      }

      const data = await response.json();

      // Filtrar apenas imagens (não vídeos)
      const photos = data.data
        ?.filter(item => item.media_type === 'IMAGE')
        ?.slice(0, 20) // Máximo 20 fotos
        ?.map(photo => ({
          id: photo.id,
          url: photo.media_url,
          thumbnail: photo.thumbnail_url || photo.media_url,
          caption: photo.caption || '',
          source: 'instagram'
        })) || [];

      console.log('✅ Fotos do Instagram carregadas:', photos.length);
      return photos;
    } catch (error) {
      console.error('❌ Erro ao buscar fotos do Instagram:', error);
      
      // Se token expirou, limpar conexão
      if (error.message.includes('190') || error.message.includes('401')) {
        throw new Error('Sessão do Instagram expirada. Conecte novamente.');
      }
      
      throw new Error('Não foi possível carregar fotos do Instagram.');
    }
  }

  /**
   * Importa foto do Instagram para o perfil do usuário
   * @param {string} photoUrl - URL da foto do Instagram
   * @param {string} userId - ID do usuário
   * @returns {Promise<string>} - Path da foto importada
   */
  static async importInstagramPhoto(photoUrl, userId) {
    try {
      // Fazer download da imagem
      const response = await fetch(photoUrl);
      if (!response.ok) throw new Error('Erro ao baixar imagem');

      const blob = await response.blob();
      
      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const fileName = `instagram_import_${timestamp}.jpg`;
      const filePath = `${userId}/profile-photos/${fileName}`;

      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false,
          cacheControl: '3600'
        });

      if (error) throw error;

      console.log('✅ Foto do Instagram importada:', data.path);
      return data.path;
    } catch (error) {
      console.error('❌ Erro ao importar foto do Instagram:', error);
      throw new Error('Não foi possível importar a foto.');
    }
  }

  /**
   * Remove conexão com Instagram
   * @param {string} userId - ID do usuário
   * @returns {Promise<boolean>} - Sucesso da operação
   */
  static async disconnectInstagram(userId) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          instagram_token: null,
          instagram_user_id: null,
          instagram_username: null,
          instagram_connected_at: null
        })
        .eq('id', userId);

      if (error) throw error;

      console.log('✅ Instagram desconectado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao desconectar Instagram:', error);
      throw error;
    }
  }

  /**
   * Valida se token do Instagram ainda é válido
   * @param {string} accessToken - Token de acesso
   * @returns {Promise<boolean>} - Se token é válido
   */
  static async validateInstagramToken(accessToken) {
    try {
      const response = await fetch(
        `https://graph.instagram.com/me?fields=id&access_token=${accessToken}`
      );

      return response.ok;
    } catch (error) {
      console.error('❌ Erro ao validar token Instagram:', error);
      return false;
    }
  }
}

export default InstagramService;