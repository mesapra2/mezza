// src/utils/chatAvailability.js

export const isChatAvailable = (event, isCreator, isApprovedParticipant) => {
  if (!event) {
    return {
      available: false,
      reason: 'Evento não encontrado.'
    };
  }

  // Criador sempre tem acesso ao chat
  if (isCreator) {
    return {
      available: true,
      reason: null
    };
  }

  // Para eventos institucionais, qualquer participante aprovado pode acessar
  if (event.event_type === 'institucional') {
    if (isApprovedParticipant) {
      return {
        available: true,
        reason: null
      };
    }
    return {
      available: false,
      reason: 'Você precisa ser aprovado para acessar o chat deste evento institucional.'
    };
  }

  // ✅ FIX CRÍTICO: Para eventos normais, se é participante aprovado/confirmado, SEMPRE libera
  // Isso garante que mesmo com 1 só pessoa, o chat funciona
  if (isApprovedParticipant) {
    return {
      available: true,
      reason: null
    };
  }

  // Se não é participante aprovado/confirmado, bloqueia
  return {
    available: false,
    reason: 'Você precisa ser um participante aprovado/confirmado para acessar o chat.'
  };
};