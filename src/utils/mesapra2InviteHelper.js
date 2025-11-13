// src/utils/mesapra2InviteHelper.js
import { supabase } from '@/lib/supabaseClient';

/**
 * Verifica se o usuário pode receber convites Mesapra2 (eventos crusher)
 * @param {string} userId - ID do usuário
 * @returns {Promise<boolean>} - True se pode receber convites
 */
export const canReceiveMesapra2Invites = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('allow_mesapra2_invites')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('Erro ao verificar permissão de convites Mesapra2:', error);
      return false; // Default seguro
    }

    return data?.allow_mesapra2_invites !== false; // Default true
  } catch (error) {
    console.error('Erro ao verificar permissão de convites Mesapra2:', error);
    return false;
  }
};

/**
 * Filtra usuários que podem receber convites Mesapra2
 * @param {Array} userIds - Array de IDs de usuários
 * @returns {Promise<Array>} - Array de IDs de usuários que podem receber convites
 */
export const filterUsersForMesapra2Invites = async (userIds) => {
  try {
    if (!userIds || userIds.length === 0) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('id, allow_mesapra2_invites')
      .in('id', userIds);

    if (error) {
      console.warn('Erro ao filtrar usuários para convites Mesapra2:', error);
      return userIds; // Retorna todos em caso de erro
    }

    // Filtra apenas usuários que permitem convites
    return data
      .filter(profile => profile.allow_mesapra2_invites !== false)
      .map(profile => profile.id);
  } catch (error) {
    console.error('Erro ao filtrar usuários para convites Mesapra2:', error);
    return userIds; // Retorna todos em caso de erro
  }
};

/**
 * Verifica se um evento é do tipo "crusher" (Mesapra2)
 * @param {Object} event - Objeto do evento
 * @returns {boolean} - True se é evento crusher
 */
export const isCrusherEvent = (event) => {
  if (!event) return false;
  
  // Pode verificar por tipo, categoria ou outras propriedades
  return (
    event.event_type === 'crusher' ||
    event.category === 'crusher' ||
    event.is_crusher === true ||
    event.tags?.includes('crusher') ||
    event.title?.toLowerCase().includes('crusher')
  );
};

/**
 * Valida se convite pode ser enviado para evento crusher
 * @param {Object} event - Objeto do evento
 * @param {string} targetUserId - ID do usuário que receberá o convite
 * @returns {Promise<{canInvite: boolean, reason?: string}>}
 */
export const validateCrusherEventInvite = async (event, targetUserId) => {
  try {
    // Verifica se é evento crusher
    if (!isCrusherEvent(event)) {
      return { canInvite: true }; // Não é crusher, sem restrições
    }

    // Verifica se usuário permite convites Mesapra2
    const canReceive = await canReceiveMesapra2Invites(targetUserId);
    
    if (!canReceive) {
      return { 
        canInvite: false, 
        reason: 'Usuário não permite receber convites para eventos Mesapra2' 
      };
    }

    return { canInvite: true };
  } catch (error) {
    console.error('Erro ao validar convite crusher:', error);
    return { 
      canInvite: false, 
      reason: 'Erro ao verificar permissões do usuário' 
    };
  }
};

export default {
  canReceiveMesapra2Invites,
  filterUsersForMesapra2Invites,
  isCrusherEvent,
  validateCrusherEventInvite
};