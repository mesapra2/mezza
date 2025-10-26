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

  // Se já é URL completa (http/https), retorna direto
  if (avatarUrl.startsWith('http')) {
    return avatarUrl;
  }

  // Constrói a URL pública do Supabase Storage
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(avatarUrl);
  
  // Adiciona timestamp para evitar cache
  return `${data.publicUrl}?t=${new Date().getTime()}`;
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