// src/config/userTypes.js

// === TIPOS DE PERFIL (para profile_type no banco) ===
export const PROFILE_TYPES = {
  USER: 'user',
  PARTNER: 'partner',
};

// === TIPOS DE USUÁRIO (mais granulares, para lógica de negócio) ===
export const USER_TYPES = {
  USER_FREE: 'user_free',
  USER_PREMIUM: 'user_premium',
  PARTNER_FREE: 'partner_free',
  PARTNER_PREMIUM: 'partner_premium',
};

// === FUNÇÃO PARA DETERMINAR O TIPO DE USUÁRIO ===
export const getUserType = (profile) => {
  if (!profile) return null;

  const isPartner = profile.profile_type === PROFILE_TYPES.PARTNER;
  const isPremium = profile.is_premium === true;

  if (isPartner && isPremium) return USER_TYPES.PARTNER_PREMIUM;
  if (isPartner) return USER_TYPES.PARTNER_FREE;
  if (isPremium) return USER_TYPES.USER_PREMIUM;
  return USER_TYPES.USER_FREE;
};