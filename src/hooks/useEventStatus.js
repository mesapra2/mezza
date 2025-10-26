// src/hooks/useEventStatus.js
import { useState, useEffect } from 'react';
import EventStatusService from '@/services/EventStatusService';

/**
 * Hook customizado para gerenciar status de eventos
 * Atualiza automaticamente o status quando necessário
 */
export const useEventStatus = (event) => {
  const [currentStatus, setCurrentStatus] = useState(event?.status);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (!event) return;

    // Atualiza status inicial
    setCurrentStatus(event.status);

    // Verifica se precisa atualizar o status
    const checkStatus = () => {
      const calculatedStatus = EventStatusService.calculateEventStatus(event);
      if (calculatedStatus !== currentStatus) {
        setCurrentStatus(calculatedStatus);
      }
    };

    // Verifica imediatamente
    checkStatus();

    // Depois verifica a cada minuto
    const intervalId = setInterval(checkStatus, 60000);

    return () => clearInterval(intervalId);
  }, [event]);

  const confirmEvent = async () => {
    setIsTransitioning(true);
    const result = await EventStatusService.confirmEvent(event.id);
    if (result.success) {
      setCurrentStatus('Confirmado');
    }
    setIsTransitioning(false);
    return result;
  };

  const cancelEvent = async (reason = '') => {
    setIsTransitioning(true);
    const result = await EventStatusService.cancelEvent(event.id, reason);
    if (result.success) {
      setCurrentStatus('Cancelado');
    }
    setIsTransitioning(false);
    return result;
  };

  const canConfirm = currentStatus === 'Aberto';
  const canCancel = ['Aberto', 'Confirmado'].includes(currentStatus);
  const isActive = !['Concluído', 'Cancelado'].includes(currentStatus);
  const needsEvaluation = currentStatus === 'Finalizado';

  return {
    currentStatus,
    isTransitioning,
    confirmEvent,
    cancelEvent,
    canConfirm,
    canCancel,
    isActive,
    needsEvaluation,
  };
};