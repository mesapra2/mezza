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

  // Verifica se todas as vagas foram preenchidas ou se o evento foi confirmado
  const allVacasPreenchidas = event.approvedCount >= event.vagas;
  const eventConfirmado = event.status === 'Confirmado' || event.status === 'Em andamento';

  if (!allVacasPreenchidas && !eventConfirmado) {
    return {
      available: false,
      reason: `Aguardando ${event.vagas - event.approvedCount} participante(s) ou confirmação do evento para liberar o chat.`
    };
  }

  return {
    available: true,
    reason: null
  };
};