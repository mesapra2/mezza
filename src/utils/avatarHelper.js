// src/utils/avatarHelper.js
import { supabase } from '@/lib/supabaseClient';

/**
 * Processa avatar_url do Supabase Storage ou retorna fallback
 * @param {string} avatarUrl - URL do avatar (pode ser path do storage ou URL completa)
 * @param {string} name - Nome para fallback (username ou full_name)
 * @param {number} size - Tamanho do avatar fallback (padrão: 40)
 * @returns {string} URL processada do avatar
 */
export const getAvatarUrl = (avatarUrl, name = 'U', size = 40) => {
  // Se não tem avatar_url, retorna fallback do UI Avatars
  if (!avatarUrl) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8b5cf6&color=fff&size=${size}`;
  }

  // ✅ CORREÇÃO 1: Limpar URL (remover espaços/quebras)
  const cleanUrl = avatarUrl.trim();

  // ✅ CORREÇÃO 2: Se já é URL completa (http/https), adiciona timestamp e retorna
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    // Adicionar timestamp para quebrar cache
    const separator = cleanUrl.includes('?') ? '&' : '?';
    return `${cleanUrl}${separator}t=${Date.now()}`;
  }

  // ✅ CORREÇÃO 3: Detectar bucket correto baseado no path
  let bucketName = 'avatars'; // padrão
  
  if (cleanUrl.includes('photos/') || cleanUrl.startsWith('photos/')) {
    bucketName = 'photos';
  } else if (cleanUrl.includes('event-photos/') || cleanUrl.startsWith('event-photos/')) {
    bucketName = 'event-photos';
  }

  // ✅ CORREÇÃO 4: Tentar construir URL com tratamento de erro
  try {
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(cleanUrl);
    
    // Adiciona timestamp para evitar cache
    return `${data.publicUrl}?t=${Date.now()}`;
  } catch (error) {
    console.error('Erro ao construir URL do avatar:', error, { avatarUrl, bucketName });
    // Retornar fallback em caso de erro
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8b5cf6&color=fff&size=${size}`;
  }
};

/**
 * Processa avatar de um perfil completo (objeto com avatar_url, username, full_name)
 * @param {Object} profile - Objeto do perfil com avatar_url, username, full_name
 * @param {number} size - Tamanho do avatar fallback
 * @returns {string} URL processada do avatar
 */
export const getProfileAvatarUrl = (profile, size = 40) => {
  const name = profile?.username || profile?.full_name || profile?.name || 'U';
  return getAvatarUrl(profile?.avatar_url, name, size);
};