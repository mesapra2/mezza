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

  // Para eventos normais (não institucionais)
  if (!isApprovedParticipant) {
    return {
      available: false,
      reason: 'Você precisa ser um participante aprovado para acessar o chat.'
    };
  }

  // ✅ NOVA LÓGICA: Chat liberado se houver pelo menos 1 participante aprovado
  // Isso permite que criador e participantes comecem a conversar mais cedo
  const temParticipantes = event.approvedCount >= 1;
  const eventConfirmado = event.status === 'Confirmado' || event.status === 'Em andamento';

  if (!temParticipantes && !eventConfirmado) {
    return {
      available: false,
      reason: 'Chat será liberado após o primeiro participante ser aprovado.'
    };
  }

  return {
    available: true,
    reason: null
  };
};