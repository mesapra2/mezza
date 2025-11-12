// src/services/ParticipationService.ts
// ✅ VERSÃO CONSOLIDADA (alinhada ao NotificationService, WaitingListService e EventSecurityService)

import { supabase } from '@/lib/supabaseClient';
import NotificationService from '@/services/NotificationService';
import WaitingListService from '@/services/WaitingListService';
import EventSecurityService from './EventSecurityService';

const toNumber = (value: string | number): number =>
  typeof value === 'string' ? Number(value) : value;

type EventStatus =
  | 'Aberto'
  | 'Confirmado'
  | 'Em Andamento'
  | 'Finalizado'
  | 'Concluído'
  | 'Cancelado';

type ParticipationStatus =
  | 'pendente'
  | 'aprovado'
  | 'rejeitado'
  | 'cancelado';

type EventType =
  | 'institucional'
  | 'privado'
  | 'publico'
  | 'padrao'
  | 'particular'
  | 'crusher';

interface Event {
  id: number | string;
  status: EventStatus;
  start_time: string;
  end_time: string;
  vagas?: number | null;
  event_type: EventType;
  creator_id: string;
  title: string;
  event_entry_password?: string | null;
  entry_locked?: boolean | null;
  crusher_invited_user_id?: string | null;
  [key: string]: any;
}

// ✅ CORREÇÃO: Interface 'Participation' removida pois não estava sendo usada (TS6196)

interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  [key: string]: any;
}


class ParticipationService {
  /**
   * 🧪 verifica se o evento está muito perto do horário
   */
  private static isEventTooClose(event: Event): boolean {
    if (!event.start_time) return false;
    const start = new Date(event.start_time).getTime();
    const now = Date.now();
    const diffMs = start - now;
    // 1 minuto
    return diffMs <= 60_000;
  }

  /**
   * 🔎 Verifica se o usuário já participa do evento
   */
  static async userAlreadyInEvent(
    eventId: string | number,
    userId: string,
  ): Promise<{ exists: boolean; participation?: any }> {
    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select('id, status, mensagem_candidatura, created_at')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao verificar se usuário já participa do evento:', error);
        return { exists: false };
      }

      if (data) {
        console.log(`ℹ️ Usuário ${userId} já está inscrito no evento ${eventId} com status: ${data.status}`);
      }

      return { exists: !!data, participation: data };
    } catch (error) {
      console.error('❌ Erro inesperado ao verificar participação:', error);
      return { exists: false };
    }
  }

  /**
   * 🧠 Valida se o usuário pode se inscrever num evento
   */
  static async validateApplication(
    event: Event,
    userId: string,
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const { data: userEvents, error: userEventsError } = await supabase
        .from('event_participants')
        .select(
          `
          id,
          status,
          events:events!inner (
            id,
            start_time,
            end_time,
            status
          )
        `,
        )
        .eq('user_id', userId)
        .eq('status', 'aprovado');

      if (userEventsError) {
        console.error(
          '❌ Erro ao buscar eventos do usuário para validar inscrição:',
          userEventsError,
        );
        return { valid: false, error: 'Erro ao validar inscrição.' };
      }

      if (!userEvents || userEvents.length === 0) {
        return { valid: true };
      }

      const eventStart = new Date(event.start_time);
      const eventEnd = new Date(event.end_time);

      for (const participation of userEvents as any[]) {
        const existingEvent = participation.events;
        if (
          existingEvent.status === 'Cancelado' ||
          existingEvent.status === 'Concluído'
        ) {
          continue;
        }

        const existingStart = new Date(existingEvent.start_time);
        const existingEnd = new Date(existingEvent.end_time);

        const hasOverlap =
          eventStart < existingEnd && eventEnd > existingStart;

        if (hasOverlap) {
          return {
            valid: false,
            error: 'Você já tem um evento neste horário.',
          };
        }
      }

      return { valid: true };
    } catch (error) {
      console.error('❌ Erro inesperado na validação de inscrição:', error);
      return { valid: false, error: 'Erro ao validar inscrição.' };
    }
  }

  /**
   * 📨 Candidatar-se a um evento
   */
  static async applyToEvent(
    eventId: string | number,
    userId: string,
    message?: string,
  ): Promise<ServiceResult> {
    try {
      console.log(`📋 Iniciando inscrição: usuário ${userId} → evento ${eventId}`);

      // ✅ CORREÇÃO: Verificar se usuário já está inscrito
      const { exists, participation: existingParticipation } = await this.userAlreadyInEvent(eventId, userId);
      
      if (exists && existingParticipation) {
        const statusMessages: Record<string, string> = {
          'pendente': 'Sua candidatura já foi enviada e está aguardando aprovação.',
          'aprovado': 'Você já está inscrito e aprovado neste evento.',
          'rejeitado': 'Sua candidatura anterior foi rejeitada.',
          'cancelado': 'Você cancelou sua participação anterior neste evento.',
        };

        const msg = statusMessages[existingParticipation.status] || `Você já está inscrito neste evento (status: ${existingParticipation.status}).`;
        console.warn(`⚠️ Tentativa de inscrição duplicada: ${msg}`);
        
        return {
          success: false,
          error: msg,
          isDuplicate: true,
          existingParticipation: existingParticipation,
        };
      }

      // 1. busca o evento
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, title, start_time, end_time, status, creator_id, entry_locked')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        throw eventError ?? new Error('Evento não encontrado');
      }

      const eventData = event as unknown as Event;

      // 2. valida conflitos
      const validations = await this.validateApplication(eventData, userId);
      if (!validations.valid) {
        return { success: false, error: validations.error };
      }

      // 3. decide status inicial
      const isDirectEnrollment = eventData.event_type === 'institucional';
      const initialStatus: ParticipationStatus = isDirectEnrollment
        ? 'aprovado'
        : 'pendente';

      // 4. checa vagas
      if (
        typeof eventData.vagas === 'number' &&
        eventData.vagas !== null &&
        eventData.vagas !== undefined
      ) {
        if (eventData.vagas <= 0) {
          // sem vagas → lista de espera
          // ✅ ajustado: espera string
          await WaitingListService.addToWaitingList(String(eventId), userId);
          return {
            success: true,
            message: 'Sem vagas. Você foi colocado na lista de espera.',
          };
        }
      }

      // 5. ✅ UPSERT - insere ou atualiza se já existir (previne duplicação)
      const { data: newParticipation, error: participationError } = await supabase
        .from('event_participants')
        .upsert(
          {
            event_id: eventId,
            user_id: userId,
            status: initialStatus,
            mensagem_candidatura: message ?? null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'event_id,user_id',
            ignoreDuplicates: false,
          }
        )
        .select()
        .single();

      if (participationError) {
        console.error('❌ Erro ao inserir/atualizar participação:', participationError);
        throw participationError;
      }

      // 6. se entrou aprovado → decrementa vaga
      if (initialStatus === 'aprovado') {
        await this.decrementEventVacancy(eventId);
      }

      // 7. notifica dono do evento
      await NotificationService.createForUser({
        target_user_id: eventData.creator_id,
        target_event_id: toNumber(eventId),
        notification_type: 'event_application',
        title: '📩 Nova participação',
        message: `Novo pedido de participação no evento "${eventData.title}"`,
      });

      return {
        success: true,
        data: newParticipation,
        message:
          initialStatus === 'aprovado'
            ? 'Entrada confirmada no evento.'
            : 'Solicitação enviada ao anfitrião.',
      };
    } catch (error: any) {
      console.error('❌ Erro ao se candidatar ao evento:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ⬇️ Decrementa vaga de um evento aprovado
   */
  static async decrementEventVacancy(
    eventId: string | number,
  ): Promise<void> {
    try {
      const { data: event, error: fetchError } = await supabase
        .from('events')
        .select('vagas')
        .eq('id', eventId)
        .single();

      if (fetchError || !event) {
        console.error(
          '❌ Erro ao buscar evento para decrementar vaga:',
          fetchError,
        );
        return;
      }

      const eventData = event as unknown as Event;

      if (
        typeof eventData.vagas === 'number' &&
        eventData.vagas !== null &&
        eventData.vagas !== undefined
      ) {
        const { error: updateError } = await supabase
          .from('events')
          .update({
            vagas: eventData.vagas > 0 ? eventData.vagas - 1 : 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', eventId);

        if (updateError) {
          console.error('❌ Erro ao decrementar vaga:', updateError);
        } else {
          console.log(
            `✅ Vaga decrementada. Vagas restantes: ${
              eventData.vagas > 0 ? eventData.vagas - 1 : 0
            }`,
          );
        }
      }
    } catch (error) {
      console.error(
        '❌ Erro inesperado ao decrementar vaga do evento:',
        error,
      );
    }
  }

  /**
   * ✅ Aprovar participação (anfitrião)
   */
  static async approveParticipation(
    participationId: string,
    eventId: string | number,
    _hostId?: string,
  ): Promise<ServiceResult> {
    try {
      console.log('🔔 [approveParticipation] Iniciando aprovação:', {
        participationId,
        eventId,
      });

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('vagas, title, start_time')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('❌ Erro ao buscar evento:', eventError);
        throw eventError;
      }

      const eventData = event as unknown as Event;

      // se estiver a menos de 1 minuto, bloqueia
      if (this.isEventTooClose(eventData)) {
        return {
          success: false,
          error: 'Não é possível aprovar participações tão perto do evento.',
        };
      }

      // busca participação pra pegar o user
      const { data: participation, error: partError } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('id', participationId)
        .single();

      if (partError) {
        console.error('❌ Erro ao buscar participação:', partError);
        throw partError;
      }

      // atualiza participação
      const { error: updateError } = await supabase
        .from('event_participants')
        .update({
          status: 'aprovado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', participationId);

      if (updateError) {
        console.error('❌ Erro ao atualizar participação:', updateError);
        throw updateError;
      }

      // decrementa vaga
      await this.decrementEventVacancy(eventId);

      // notifica usuário aprovado
      await NotificationService.createForUser({
        target_user_id: (participation as any).user_id,
        target_event_id: toNumber(eventId),
        notification_type: 'candidate_approved',
        title: '✅ Participação Aprovada',
        message: `Sua participação em "${eventData.title}" foi aprovada!`,
      });

      return { success: true, message: 'Participação aprovada!' };
    } catch (error: any) {
      console.error('❌ [approveParticipation] Erro:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ❌ Rejeitar participação (anfitrião)
   */
  static async rejectParticipation(
    participationId: string,
    eventId: string | number,
    reason = '',
  ): Promise<ServiceResult> {
    try {
      const { data: participation, error: partError } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('id', participationId)
        .single();

      if (partError) {
        throw partError;
      }

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('start_time, title, creator_id, event_type')
        .eq('id', eventId)
        .single();

      if (eventError) {
        throw eventError;
      }

      const { error: updateError } = await supabase
        .from('event_participants')
        .update({
          status: 'rejeitado',
          motivo_rejeicao: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', participationId);

      if (updateError) {
        throw updateError;
      }

      await NotificationService.createForUser({
        target_user_id: (participation as any).user_id,
        target_event_id: toNumber(eventId),
        notification_type: 'participation_rejected',
        title: '❌ Participação Rejeitada',
        message: `Sua candidatura para "${(event as any).title}" foi rejeitada.${
          reason ? ` Motivo: ${reason}` : ''
        }`,
      });

      return {
        success: true,
        message: 'Participação rejeitada',
      };
    } catch (error: any) {
      console.error('❌ Erro ao rejeitar participação:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🛑 Cancelar participação (usuário saindo do evento)
   */
  static async cancelParticipation(
    participationId: string,
    eventId: string | number,
    userId: string,
  ): Promise<ServiceResult> {
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('start_time, title, creator_id, event_type')
        .eq('id', eventId)
        .single();

      if (eventError) {
        throw eventError;
      }

      const { data: participation, error: partError } = await supabase
        .from('event_participants')
        .select('status')
        .eq('id', participationId)
        .eq('user_id', userId)
        .single();

      if (partError) {
        throw partError;
      }

      if ((participation as any).status !== 'aprovado') {
        return {
          success: false,
          error: 'Apenas participações aprovadas podem ser canceladas',
        };
      }

      const startTime = new Date((event as any).start_time);
      const now = new Date();
      const hoursUntilEvent =
        (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      const isLateCancellation = hoursUntilEvent < 2;

      const { error: updateError } = await supabase
        .from('event_participants')
        .update({
          status: 'cancelado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', participationId);

      if (updateError) {
        throw updateError;
      }

      // devolve vaga
      await this.incrementEventVacancy(eventId);

      // notifica dono
      await NotificationService.createForUser({
        target_user_id: (event as any).creator_id,
        target_event_id: toNumber(eventId),
        notification_type: 'participation_cancelled',
        title: '❌ Participante desistiu',
        message: `Um participante cancelou sua presença em "${(event as any).title}"`,
      });

      // ✅ ajustado: tua WaitingListService espera string
      await WaitingListService.processWaitingList(String(eventId));

      return {
        success: true,
        message: isLateCancellation
          ? 'Participação cancelada, mas foi em cima da hora.'
          : 'Participação cancelada.',
      };
    } catch (error: any) {
      console.error('❌ Erro ao cancelar participação:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ⬆️ Incrementa vaga quando alguém sai
   */
  static async incrementEventVacancy(
    eventId: string | number,
  ): Promise<void> {
    try {
      const { data: event, error: fetchError } = await supabase
        .from('events')
        .select('vagas')
        .eq('id', eventId)
        .single();

      if (fetchError || !event) {
        console.error(
          '❌ Erro ao buscar evento para incrementar vaga:',
          fetchError,
        );
        return;
      }

      const eventData = event as unknown as Event;

      if (
        typeof eventData.vagas === 'number' &&
        eventData.vagas !== null &&
        eventData.vagas !== undefined
      ) {
        const { error: updateError } = await supabase
          .from('events')
          .update({
            vagas: eventData.vagas + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', eventId);

        if (updateError) {
          console.error('❌ Erro ao incrementar vaga:', updateError);
        } else {
          console.log(
            `✅ Vaga incrementada. Vagas disponíveis: ${
              eventData.vagas + 1
            }`,
          );
        }
      }
    } catch (error) {
      console.error(
        '❌ Erro inesperado ao incrementar vaga do evento:',
        error,
      );
    }
  }

  /**
   * 🎯 Aceitar convite “Crusher”
   */
  static async acceptCrusherInvite(
    participationId: string,
    eventId: string | number,
    userId: string,
  ): Promise<ServiceResult> {
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('event_type, title, crusher_invited_user_id, creator_id')
        .eq('id', eventId)
        .single();

      if (eventError) {
        throw eventError;
      }

      if (event.event_type !== 'crusher') {
        return {
          success: false,
          error: 'Este não é um evento Crusher',
        };
      }

      if (event.crusher_invited_user_id !== userId) {
        return {
          success: false,
          error: 'Você não foi convidado para este evento',
        };
      }

      const { error: updateError } = await supabase
        .from('event_participants')
        .update({
          status: 'aprovado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', participationId)
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }

      await NotificationService.createForUser({
        target_user_id: event.creator_id,
        target_event_id: toNumber(eventId),
        notification_type: 'crusher_accepted',
        title: '💜 Convite Crusher Aceito!',
        message: `Seu convite para "${event.title}" foi aceito!`,
      });

      return {
        success: true,
        message: 'Convite aceito!',
      };
    } catch (error: any) {
      console.error('❌ Erro ao aceitar convite Crusher:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🎯 Rejeitar convite “Crusher”
   */
  static async rejectCrusherInvite(
    participationId: string,
    eventId: string | number,
    userId: string,
    reason = '',
  ): Promise<ServiceResult> {
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('event_type, title, crusher_invited_user_id, creator_id')
        .eq('id', eventId)
        .single();

      if (eventError) {
        throw eventError;
      }

      if (event.event_type !== 'crusher') {
        return {
          success: false,
          error: 'Este não é um evento Crusher',
        };
      }

      if (event.crusher_invited_user_id !== userId) {
        return {
          success: false,
          error: 'Você não foi convidado para este evento',
        };
      }

      const { error: updateError } = await supabase
        .from('event_participants')
        .update({
          status: 'rejeitado',
          rejeicao_motivo: reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', participationId)
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }

      await NotificationService.createForUser({
        target_user_id: event.creator_id,
        target_event_id: toNumber(eventId),
        notification_type: 'participation_rejected',
        title: '💔 Convite Crusher Recusado',
        message: `Seu convite para "${event.title}" foi recusado.${
          reason ? ` Motivo: ${reason}` : ''
        }`,
      });

      return {
        success: true,
        message: 'Convite recusado',
      };
    } catch (error: any) {
      console.error('❌ Erro ao rejeitar convite Crusher:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 👀 Verifica se um usuário é o convidado do evento Crusher
   */
  static async isUserCrusherInvitee(
    eventId: string | number,
    userId: string,
  ): Promise<boolean> {
    try {
      const { data: participation, error } = await supabase
        .from('event_participants')
        .select('event_id')
        .eq('event_id', eventId)
        .single();

      if (error || !participation) {
        return false;
      }

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('event_type, crusher_invited_user_id')
        .eq('id', participation.event_id)
        .single();

      if (eventError) {
        return false;
      }

      return (
        event.event_type === 'crusher' &&
        event.crusher_invited_user_id === userId
      );
    } catch (error) {
      console.error('❌ Erro ao verificar convite Crusher:', error);
      return false;
    }
  }

  /**
   * 📥 Lista TODAS as participações de um evento (para anfitrião)
   * ⚠️ AQUI estava dando 406 porque usava id=eq.<evento>
   */
  static async getEventParticipations(
    eventId: string | number,
  ): Promise<ServiceResult> {
    try {
      const { data: participations, error } = await supabase
        .from('event_participants')
        .select(
          `
          id,
          event_id,
          user_id,
          status,
          presenca_confirmada,
          com_acesso,
          mensagem_candidatura,
          created_at,
          user:profiles!event_participants_user_id_fkey (
            id,
            username,
            avatar_url,
            reputation_stars
          )
        `,
        )
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return { success: true, data: participations };
    } catch (error: any) {
      console.error('❌ Erro ao buscar participações:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 👤 Participações de um usuário em todos os eventos
   */
  static async getUserParticipations(
    userId: string,
  ): Promise<ServiceResult> {
    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select(
          `
          id,
          event_id,
          status,
          presenca_confirmada,
          avaliacao_feita,
          com_acesso,
          events:events!inner (
            id,
            title,
            start_time,
            end_time,
            status,
            event_type
          )
        `,
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Erro ao buscar participações do usuário:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 📌 Ver detalhes de uma participação específica
   */
  static async getParticipationById(
    participationId: string,
  ): Promise<ServiceResult> {
    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select(
          `
          id,
          event_id,
          user_id,
          status,
          presenca_confirmada,
          com_acesso,
          avaliacao_feita,
          events:events!inner (
            id,
            title,
            start_time,
            end_time,
            status
          ),
          user:profiles!event_participants_user_id_fkey (
            id,
            username,
            avatar_url
          )
        `,
        )
        .eq('id', participationId)
        .single();

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Erro ao buscar participação:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✅ Confirma presença
   */
  static async confirmPresence(
    participationId: string,
  ): Promise<ServiceResult> {
    try {
      const { error } = await supabase
        .from('event_participants')
        .update({
          presenca_confirmada: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', participationId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('❌ Erro ao confirmar presença:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🚪 Libera acesso do participante dentro do evento
   */
  static async grantAccess(
    participationId: string,
  ): Promise<ServiceResult> {
    try {
      const { error } = await supabase
        .from('event_participants')
        .update({
          com_acesso: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', participationId);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('❌ Erro ao liberar acesso:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🔐 Valida senha de entrada do evento
   */
  static async validateEventEntryPassword(
    eventId: string | number,
    participantId: string,
    password: string,
  ): Promise<{
    success: boolean;
    canEnter: boolean;
    message: string;
    error?: string;
  }> {
    try {
      console.log(
        `🔍 Validando entrada: participante ${participantId} no evento ${eventId}`,
      );

      // 1️⃣ Verificar se participante está aprovado
      const { data: participation, error: partError } = await supabase
        .from('event_participants')
        .select('id, status, com_acesso, presenca_confirmada')
        .eq('event_id', eventId)
        .eq('user_id', participantId)
        .single();

      if (partError || !participation) {
        return {
          success: false,
          canEnter: false,
          message: 'Você não está inscrito neste evento',
        };
      }

      if (participation.status !== 'aprovado') {
        return {
          success: false,
          canEnter: false,
          message: `Sua inscrição está com status: ${participation.status}`,
        };
      }

      // 2️⃣ Validar a senha usando o serviço já existente
      const securityResult = await EventSecurityService.validateEntryPassword({
        eventId: toNumber(eventId), // ✅ ajustado: o service espera number
        participantId,
        password,
      });

      if (!securityResult.success) {
        return {
          success: false,
          canEnter: false,
          message: securityResult.message || 'Senha inválida.',
        };
      }

      // 3️⃣ Senha correta → marcar presença
      const { error: presencaError } = await supabase
        .from('event_participants')
        .update({
          presenca_confirmada: true,
          updated_at: new Date().toISOString(),
        })
        .eq('event_id', eventId)
        .eq('user_id', participantId);

      if (presencaError) {
        throw presencaError;
      }

      console.log(
        `✅ Participante ${participantId} agora tem acesso ao evento ${eventId}`,
      );

      return {
        success: true,
        canEnter: true,
        message:
          securityResult.message || '✅ Acesso liberado! Bem-vindo ao evento.',
      };
    } catch (error) {
      console.error('❌ Erro ao validar entrada:', error);
      return {
        success: false,
        canEnter: false,
        message: 'Erro ao processar sua entrada',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 📊 Estatísticas de entrada
   */
  static async getEventEntryStats(
    eventId: string | number,
  ): Promise<ServiceResult> {
    try {
      const { data: participants, error } = await supabase
        .from('event_participants')
        .select('id, com_acesso')
        .eq('event_id', eventId);

      if (error) {
        throw error;
      }

      const total = participants.length;
      const withAccess = participants.filter(p => p.com_acesso).length;
      const withoutAccess = total - withAccess;
      const percentage = total > 0 ? (withAccess / total) * 100 : 0;

      return {
        success: true,
        data: {
          totalParticipants: total,
          participantsWithAccess: withAccess,
          participantsWithoutAccess: withoutAccess,
          accessPercentage: percentage,
        },
      };
    } catch (error) {
      console.error('❌ Erro ao obter stats de entrada:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 🔒 verifica se o usuário pode criar mais eventos (regra extra sua)
   */
  static async canUserCreateEvent(
    userId: string,
  ): Promise<ServiceResult> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // eventos hoje
      const { data: todayEvents, error: todayError } = await supabase
        .from('events')
        .select('id')
        .eq('creator_id', userId)
        .gte('start_time', `${today}T00:00:00`)
        .lte('start_time', `${today}T23:59:59`);

      if (todayError) {
        throw todayError;
      }

      if (todayEvents && todayEvents.length > 0) {
        return {
          success: false,
          error: 'Você já tem um evento hoje.',
        };
      }

      // eventos não concluídos
      const { data: unfinished, error: unfinishedError } = await supabase
        .from('events')
        .select('id, title')
        .eq('creator_id', userId)
        .in('status', [
          'Aberto',
          'Confirmado',
          'Em Andamento',
          'Finalizado',
        ]);

      if (unfinishedError) {
        throw unfinishedError;
      }

      if (unfinished && unfinished.length > 0) {
        return {
          success: false,
          error:
            'Você tem eventos em aberto. Conclua ou cancele antes de criar outro.',
        };
      }

      return { success: true };
    } catch (error: any) {
      console.error(
        '❌ Erro ao verificar se usuário pode criar evento:',
        error,
      );
      return { success: false, error: error.message };
    }
  }
}

export default ParticipationService;

