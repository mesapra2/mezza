// src/services/ParticipationService.ts
import { supabase } from '@/lib/supabaseClient';
import NotificationService from '@/services/NotificationService';
import WaitingListService from '@/services/WaitingListService';

type EventStatus = 'Aberto' | 'Confirmado' | 'Em Andamento' | 'Finalizado' | 'Concluído' | 'Cancelado';
type ParticipationStatus = 'pendente' | 'aprovado' | 'rejeitado' | 'cancelado';
type EventType = 'institucional' | 'privado' | 'publico' | 'padrao' | 'particular' | 'crusher';

interface Event {
  id: string;
  status: EventStatus;
  start_time: string;
  end_time: string;
  vagas: number;
  max_vagas?: number;
  event_type: EventType;
  creator_id: string;
  title: string;
  [key: string]: any;
}

interface Participation {
  id: string;
  event_id: string;
  user_id: string;
  status: ParticipationStatus;
  created_at?: string;
  updated_at?: string;
  events?: Event;
  event?: Event;
  user?: any;
  [key: string]: any;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface ServiceResult {
  success: boolean;
  error?: string | any;
  message?: string;
  participation?: Participation;
  data?: any;
  isLateCancellation?: boolean;
  isAutoApproved?: boolean;
}

class ParticipationService {

  static async applyToEvent(eventId: string, userId: string, message: string = ''): Promise<ServiceResult> {
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      const validations = await this.validateApplication(event as unknown as Event, userId);
      if (!validations.valid) {
        return { success: false, error: validations.error };
      }

      const isDirectEnrollment = (event as unknown as Event).event_type === 'institucional';
      const initialStatus: ParticipationStatus = isDirectEnrollment ? 'aprovado' : 'pendente';

      const { data: participation, error: participationError } = await supabase
        .from('participations')
        .insert({
          event_id: eventId,
          user_id: userId,
          status: initialStatus,
          mensagem_candidatura: message,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (participationError) throw participationError;

      if (isDirectEnrollment) {
        await this.decrementEventVacancy(eventId);
      }

      return {
        success: true,
        isAutoApproved: isDirectEnrollment,
        participation: participation as unknown as Participation,
        message: isDirectEnrollment 
          ? 'Inscrição confirmada! Você está participando do evento.'
          : 'Candidatura enviada! Aguarde aprovação do anfitrião.'
      };

    } catch (error: any) {
      console.error('❌ Erro ao candidatar-se:', error);
      return { success: false, error: error.message };
    }
  }

  static async validateApplication(event: Event, userId: string): Promise<ValidationResult> {
    if (event.status !== 'Aberto' && event.status !== 'Confirmado') {
      return { valid: false, error: 'Este evento não está aceitando candidaturas' };
    }

    if (event.vagas <= 0) {
      return { valid: false, error: 'Evento sem vagas disponíveis' };
    }

    const now = new Date();
    const startTime = new Date(event.start_time);
    const fiveMinutesBefore = new Date(startTime.getTime() - 5 * 60 * 1000);
    
    if (now >= fiveMinutesBefore) {
      return { valid: false, error: 'Prazo para candidatura encerrado (5 min antes do início)' };
    }

    // 🔒 BLOQUEAR APROVAÇÃO AUTOMÁTICA (INSTITUCIONAL) SE FALTAREM MENOS DE 1 MINUTO
    if (event.event_type === 'institucional' && this.isEventTooClose(event)) {
      return { valid: false, error: 'Inscrição bloqueada: evento começa em menos de 1 minuto' };
    }

    const participationCheck = await supabase
      .from('participations')
      .select('id, status')
      .eq('event_id', event.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (participationCheck.data) {
      const existingStatus = (participationCheck.data as any).status;
      if (existingStatus === 'aprovado') {
        return { valid: false, error: 'Você já está participando deste evento' };
      }
      if (existingStatus === 'pendente') {
        return { valid: false, error: 'Você já se candidatou a este evento' };
      }
    }

    const hasConflict = await this.checkTimeConflict(event, userId);
    if (hasConflict) {
      return { valid: false, error: 'Você já está participando de outro evento neste horário' };
    }

    return { valid: true };
  }

  static async checkTimeConflict(event: Event, userId: string): Promise<boolean> {
    const { data: userEvents } = await supabase
      .from('participations')
      .select('event_id, events!inner(start_time, end_time, status)')
      .eq('user_id', userId)
      .eq('status', 'aprovado');

    if (!userEvents || userEvents.length === 0) return false;

    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);

    for (const participation of userEvents) {
      const existingEvent = (participation as any).events;
      
      if (['Cancelado', 'Concluido'].includes(existingEvent.status)) continue;

      const existingStart = new Date(existingEvent.start_time);
      const existingEnd = new Date(existingEvent.end_time);

      const hasOverlap = (eventStart < existingEnd && eventEnd > existingStart);
      if (hasOverlap) return true;
    }

    return false;
  }

  /**
   * 🔒 Valida se faltam menos de 1 minuto para o evento começar
   * @param event - Evento a verificar
   * @returns true se faltam menos de 1 minuto, false caso contrário
   */
  static isEventTooClose(event: Event): boolean {
    const now = new Date();
    const startTime = new Date(event.start_time);
    const oneMinuteBefore = new Date(startTime.getTime() - 1 * 60 * 1000);
    
    return now >= oneMinuteBefore;
  }

  static async approveParticipation(participationId: string, eventId: string): Promise<ServiceResult> {
    try {
      console.log('🔔 [approveParticipation] Iniciando aprovação:', { participationId, eventId });

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('vagas, title, start_time')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('❌ Erro ao buscar evento:', eventError);
        throw eventError;
      }

      // 🔒 BLOQUEAR APROVAÇÃO SE FALTAREM MENOS DE 1 MINUTO
      const eventData = event as unknown as Event;
      if (this.isEventTooClose(eventData)) {
        console.warn('⚠️ Aprovação bloqueada: evento começa em menos de 1 minuto');
        return { 
          success: false, 
          error: 'Não é possível aprovar participações a menos de 1 minuto do evento' 
        };
      }

      if (eventData.vagas <= 0) {
        console.warn('⚠️ Sem vagas disponíveis');
        return { success: false, error: 'Sem vagas disponíveis' };
      }

      const { data: participation, error: partError } = await supabase
        .from('participations')
        .select('user_id')
        .eq('id', participationId)
        .single();

      if (partError) {
        console.error('❌ Erro ao buscar participação:', partError);
        throw partError;
      }

      console.log('📋 Dados obtidos:', {
        userId: (participation as any).user_id,
        eventTitle: eventData.title
      });

      const { error: updateError } = await supabase
        .from('participations')
        .update({ 
          status: 'aprovado',
          updated_at: new Date().toISOString()
        })
        .eq('id', participationId);

      if (updateError) {
        console.error('❌ Erro ao atualizar participação:', updateError);
        throw updateError;
      }

      console.log('✅ Status atualizado para aprovado');

      await this.decrementEventVacancy(eventId);
      console.log('✅ Vaga decrementada');

      console.log('🔔 Enviando notificação ao participante...');
      const notifResult = await NotificationService.notifyParticipationApproved(
        (participation as any).user_id,
        parseInt(eventId),
        eventData.title
      );

      if (notifResult.success) {
        console.log('✅ Notificação enviada com sucesso');
      } else {
        console.error('⚠️ Erro ao enviar notificação (aprovação concluída):', notifResult.error);
      }

      return { 
        success: true, 
        message: 'Participação aprovada com sucesso!' 
      };

    } catch (error: any) {
      console.error('❌ Erro ao aprovar participação:', error);
      return { success: false, error: error.message };
    }
  }

  static async rejectParticipation(participationId: string, reason?: string): Promise<ServiceResult> {
    try {
      const { data: participation } = await supabase
        .from('participations')
        .select('user_id, event_id, events!inner(title)')
        .eq('id', participationId)
        .single();

      const { error: updateError } = await supabase
        .from('participations')
        .update({ 
          status: 'rejeitado',
          motivo_rejeicao: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', participationId);

      if (updateError) throw updateError;

      return { success: true, message: 'Participação rejeitada' };

    } catch (error: any) {
      console.error('❌ Erro ao rejeitar participação:', error);
      return { success: false, error: error.message };
    }
  }

  static async cancelParticipation(participationId: string, userId: string): Promise<ServiceResult> {
    try {
      const { data: participation, error: partError } = await supabase
        .from('participations')
        .select('*, events!inner(*)')
        .eq('id', participationId)
        .eq('user_id', userId)
        .single();

      if (partError) throw partError;

      const part = participation as any;

      const now = new Date();
      const eventStart = new Date(part.events.start_time);
      const hoursDifference = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);
      const isLateCancellation = hoursDifference < 4;

      const { error: updateError } = await supabase
        .from('participations')
        .update({ 
          status: 'cancelado',
          updated_at: new Date().toISOString()
        })
        .eq('id', participationId);

      if (updateError) throw updateError;

      if (part.status === 'aprovado') {
        await this.incrementEventVacancy(part.event_id);
        
        console.log('🔔 Vaga liberada, processando fila de espera...');
        await WaitingListService.processWaitingList(part.event_id);
      }

      return { 
        success: true, 
        isLateCancellation,
        message: isLateCancellation 
          ? 'Participação cancelada. Cancelamento tardio registrado.'
          : 'Participação cancelada com sucesso'
      };

    } catch (error: any) {
      console.error('❌ Erro ao cancelar participação:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Aceita um convite Crusher
   */
  static async acceptCrusherInvite(participationId: string, eventId: string, userId: string): Promise<ServiceResult> {
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('event_type, title, crusher_invited_user_id, creator_id')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      if (event.event_type !== 'crusher') {
        return { success: false, error: 'Este não é um evento Crusher' };
      }

      if (event.crusher_invited_user_id !== userId) {
        return { success: false, error: 'Você não foi convidado para este evento' };
      }

      const { error: updateError } = await supabase
        .from('participations')
        .update({ 
          status: 'aprovado',
          updated_at: new Date().toISOString()
        })
        .eq('id', participationId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      await this.decrementEventVacancy(eventId);

      await NotificationService.createForUser({
        target_user_id: event.creator_id,
        target_event_id: parseInt(eventId),
        notification_type: 'participation_approved',
        title: '💘 Convite Crusher Aceito!',
        message: `Seu convite para "${event.title}" foi aceito!`
      });

      return { 
        success: true, 
        message: 'Convite aceito com sucesso!' 
      };

    } catch (error: any) {
      console.error('❌ Erro ao aceitar convite Crusher:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Rejeita um convite Crusher
   */
  static async rejectCrusherInvite(participationId: string, eventId: string, userId: string, reason?: string): Promise<ServiceResult> {
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('event_type, title, crusher_invited_user_id, creator_id')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      if (event.event_type !== 'crusher') {
        return { success: false, error: 'Este não é um evento Crusher' };
      }

      if (event.crusher_invited_user_id !== userId) {
        return { success: false, error: 'Você não foi convidado para este evento' };
      }

      const { error: updateError } = await supabase
        .from('participations')
        .update({ 
          status: 'rejeitado',
          motivo_rejeicao: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', participationId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      await NotificationService.createForUser({
        target_user_id: event.creator_id,
        target_event_id: parseInt(eventId),
        notification_type: 'participation_rejected',
        title: '💔 Convite Crusher Recusado',
        message: `Seu convite para "${event.title}" foi recusado.${reason ? ` Motivo: ${reason}` : ''}`
      });

      return { 
        success: true, 
        message: 'Convite recusado' 
      };

    } catch (error: any) {
      console.error('❌ Erro ao rejeitar convite Crusher:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verifica se uma participação é um convite Crusher pendente
   */
  static async isCrusherInvite(participationId: string, userId: string): Promise<boolean> {
    try {
      const { data: participation, error } = await supabase
        .from('participations')
        .select('event_id, status')
        .eq('id', participationId)
        .eq('user_id', userId)
        .single();

      if (error || !participation || participation.status !== 'pendente') {
        return false;
      }

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('event_type, crusher_invited_user_id')
        .eq('id', participation.event_id)
        .single();

      if (eventError) return false;

      return event.event_type === 'crusher' && event.crusher_invited_user_id === userId;

    } catch (error) {
      console.error('❌ Erro ao verificar convite Crusher:', error);
      return false;
    }
  }

  static async getEventParticipations(eventId: string): Promise<ServiceResult> {
    try {
      const { data: participations, error } = await supabase
        .from('participations')
        .select('*, user:profiles!participations_user_id_fkey(*)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: participations };

    } catch (error: any) {
      console.error('❌ Erro ao buscar participações:', error);
      return { success: false, error: error.message };
    }
  }

  static async getUserParticipations(userId: string): Promise<ServiceResult> {
    try {
      const { data, error } = await supabase
        .from('participations')
        .select('*, event:events(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data };

    } catch (error: any) {
      console.error('❌ Erro ao buscar participações do usuário:', error);
      return { success: false, error: error.message };
    }
  }

  static async decrementEventVacancy(eventId: string): Promise<void> {
    try {
      const { data: event, error: fetchError } = await supabase
        .from('events')
        .select('vagas')
        .eq('id', eventId)
        .single();

      if (fetchError || !event) {
        console.error('❌ Erro ao buscar evento para decrementar vaga:', fetchError);
        return;
      }

      const eventData = event as unknown as Event;
      if (eventData.vagas > 0) {
        const { error: updateError } = await supabase
          .from('events')
          .update({ vagas: eventData.vagas - 1 })
          .eq('id', eventId);

        if (updateError) {
          console.error('❌ Erro ao decrementar vaga:', updateError);
        } else {
          console.log(`✅ Vaga decrementada. Vagas restantes: ${eventData.vagas - 1}`);
        }
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao decrementar vaga:', error);
    }
  }

  static async incrementEventVacancy(eventId: string): Promise<void> {
    try {
      const { data: event, error: fetchError } = await supabase
        .from('events')
        .select('vagas, max_vagas')
        .eq('id', eventId)
        .single();

      if (fetchError || !event) {
        console.error('❌ Erro ao buscar evento para incrementar vaga:', fetchError);
        return;
      }

      const eventData = event as unknown as Event;
      const maxVagas = eventData.max_vagas || 0;
      
      // Só incrementa se não atingiu o máximo de vagas
      if (!maxVagas || eventData.vagas < maxVagas) {
        const { error: updateError } = await supabase
          .from('events')
          .update({ vagas: eventData.vagas + 1 })
          .eq('id', eventId);

        if (updateError) {
          console.error('❌ Erro ao incrementar vaga:', updateError);
        } else {
          console.log(`✅ Vaga incrementada. Vagas disponíveis: ${eventData.vagas + 1}`);
        }
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao incrementar vaga:', error);
    }
  }

  /**
   * 🔒 NOVO: Verifica se o usuário pode criar um novo evento
   * Regra: Máximo 1 evento por dia, e não pode ter eventos não concluídos
   * @param userId - ID do usuário
   * @returns { can: boolean, reason?: string }
   */
  static async canUserCreateNewEvent(userId: string): Promise<{ can: boolean; reason?: string }> {
    try {
      // 1️⃣ Buscar eventos criados pelo usuário que NÃO estão concluídos
      const { data: unfinishedEvents, error: eventError } = await supabase
        .from('events')
.select('id, status, created_at, title')
        .eq('creator_id', userId)
        .neq('status', 'Concluído');

      if (eventError) {
        console.error('❌ Erro ao buscar eventos:', eventError);
        return { can: false, reason: 'Erro ao verificar eventos' };
      }

      // ❌ Se tem eventos não concluídos, bloqueia
      if (unfinishedEvents && unfinishedEvents.length > 0) {
        const pendingEvent = unfinishedEvents[0];
        return {
          can: false,
          reason: `Você tem eventos aguardando conclusão. Por favor, finalize "${unfinishedEvents[0]?.title || 'o evento'}" para criar outro.`
        };
      }

      // 2️⃣ Verificar limite de 1 evento por dia
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      const { data: todayEvents, error: todayError } = await supabase
        .from('events')
        .select('id')
        .eq('creator_id', userId)
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString());

      if (todayError) {
        console.error('❌ Erro ao verificar limite diário:', todayError);
        return { can: false, reason: 'Erro ao verificar limite diário' };
      }

      if (todayEvents && todayEvents.length >= 1) {
        return {
          can: false,
          reason: 'Você já criou um evento hoje. Tente novamente amanhã.'
        };
      }

      return { can: true };
    } catch (error) {
      console.error('❌ Erro ao verificar permissão de criar evento:', error);
      return { can: false, reason: 'Erro ao verificar permissão' };
    }
  }
}

export default ParticipationService;