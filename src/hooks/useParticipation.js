// src/hooks/useParticipation.js
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ParticipationService from '@/services/ParticipationService';

/**
 * Hook para gerenciar participações de eventos
 */
export const useParticipation = (eventId = null) => {
  const { user } = useAuth();
  const [participations, setParticipations] = useState([]);
  const [myParticipation, setMyParticipation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carrega participações baseado no contexto
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (eventId) {
          // Se tem eventId, busca participação do usuário neste evento
          const result = await ParticipationService.getUserParticipations(user.id);
          if (result.success) {
            const participation = result.data.find(p => p.event_id === eventId);
            setMyParticipation(participation || null);
          }
        } else {
          // Sem eventId, busca todas as participações do usuário
          const result = await ParticipationService.getUserParticipations(user.id);
          if (result.success) {
            setParticipations(result.data);
          } else {
            setError(result.error);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, eventId]);

  // Aplica para um evento
  const apply = async (eventIdToApply, message = '') => {
    setLoading(true);
    const result = await ParticipationService.applyToEvent(eventIdToApply, user.id, message);
    setLoading(false);

    if (result.success) {
      setMyParticipation(result.participation);
    }

    return result;
  };

  // Cancela participação
  const cancel = async (participationId) => {
    setLoading(true);
    const result = await ParticipationService.cancelParticipation(participationId, eventId);
    setLoading(false);

    if (result.success) {
      setMyParticipation(null);
      setParticipations(prev => prev.filter(p => p.id !== participationId));
    }

    return result;
  };

  // Confirma presença
  const confirmPresence = async (participationId, method, code) => {
    setLoading(true);
    const result = await ParticipationService.confirmPresence(participationId, method, code);
    setLoading(false);

    if (result.success && myParticipation) {
      setMyParticipation({
        ...myParticipation,
        presenca_confirmada: true,
        presenca_confirmada_em: new Date().toISOString()
      });
    }

    return result;
  };

  // Helpers
  const isParticipating = !!myParticipation;
  const isPending = myParticipation?.status === 'pendente';
  const isApproved = myParticipation?.status === 'aprovado';
  const isRejected = myParticipation?.status === 'rejeitado';
  const hasConfirmedPresence = myParticipation?.presenca_confirmada === true;

  return {
    participations,
    myParticipation,
    loading,
    error,
    apply,
    cancel,
    confirmPresence,
    isParticipating,
    isPending,
    isApproved,
    isRejected,
    hasConfirmedPresence,
  };
};