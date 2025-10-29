// src/services/ParticipationService.ts
// ✅ VERSÃO CONSOLIDADA FINAL
import { supabase } from '@/lib/supabaseClient';
import NotificationService from '@/services/NotificationService';
import WaitingListService from '@/services/WaitingListService';
import EventSecurityService from './EventSecurityService';

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
        .from('event_participants')
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
      .from('event_participants')
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
      .from('event_participants')
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
        .from('event_participants')
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
        .from('event_participants')
        .update({ 
          status: 'aprovado',
          updated_at: new Date().toISOString()
        })
        .eq('id', participationId);

      if (updateError) {
        console.error('❌ Erro ao atualizar participação:', updateError);
        throw updateError;
      }

      await this.decrementEventVacancy(eventId);

      console.log('📨 [approveParticipation] Enviando notificação...');
      await NotificationService.createForUser({
        target_user_id: (participation as any).user_id,
        target_event_id: parseInt(eventId),
       notification_type: 'candidate_approved',  // ou 'participation_approved' se existir
        title: '✅ Participação Aprovada',
        message: `Sua participação em "${eventData.title}" foi aprovada!`
      });

      console.log('✅ [approveParticipation] Participação aprovada com sucesso');
      return { success: true, message: 'Participação aprovada!' };

    } catch (error: any) {
      console.error('❌ [approveParticipation] Erro:', error);
      return { success: false, error: error.message };
    }
  }

  static async rejectParticipation(
    participationId: string, 
    eventId: string, 
    reason: string = ''
  ): Promise<ServiceResult> {
    try {
      const { data: participation, error: partError } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('id', participationId)
        .single();

      if (partError) throw partError;

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('title')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      const { error: updateError } = await supabase
        .from('event_participants')
        .update({ 
          status: 'rejeitado',
          motivo_rejeicao: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', participationId);

      if (updateError) throw updateError;

      await NotificationService.createForUser({
        target_user_id: (participation as any).user_id,
        target_event_id: parseInt(eventId),
        notification_type: 'participation_rejected',
        title: '❌ Participação Rejeitada',
        message: `Sua candidatura para "${event.title}" foi rejeitada.${reason ? ` Motivo: ${reason}` : ''}`
      });

      return { 
        success: true, 
        message: 'Participação rejeitada' 
      };

    } catch (error: any) {
      console.error('❌ Erro ao rejeitar participação:', error);
      return { success: false, error: error.message };
    }
  }

  static async cancelParticipation(participationId: string, eventId: string, userId: string): Promise<ServiceResult> {
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('start_time, title, creator_id, event_type')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      const { data: participation, error: partError } = await supabase
        .from('event_participants')
        .select('status')
        .eq('id', participationId)
        .eq('user_id', userId)
        .single();

      if (partError) throw partError;

      if ((participation as any).status !== 'aprovado') {
        return { success: false, error: 'Apenas participações aprovadas podem ser canceladas' };
      }

      const startTime = new Date((event as any).start_time);
      const now = new Date();
      const hoursUntilEvent = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      const isLateCancellation = hoursUntilEvent < 2;

      const { error: updateError } = await supabase
        .from('event_participants')
        .update({ 
          status: 'cancelado',
          updated_at: new Date().toISOString()
        })
        .eq('id', participationId);

            await NotificationService.createForUser({
        target_user_id: (event as any).creator_id,
        target_event_id: parseInt(eventId),
        notification_type: 'participation_cancelled',
        title: '❌ Participante Desistiu',
        message: `Um participante cancelou sua presença em "${(event as any).title}"`
      });

      return { 
        success: true, 
        message: 'Participação cancelada',
        isLateCancellation 
      };

    } catch (error: any) {
      console.error('❌ Erro ao cancelar participação:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🎯 MÉTODO ESPECÍFICO PARA EVENTOS CRUSHER
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
        .from('event_participants')
        .update({ 
          status: 'aprovado',
          updated_at: new Date().toISOString()
        })
        .eq('id', participationId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      await NotificationService.createForUser({
        target_user_id: event.creator_id,
        target_event_id: parseInt(eventId),
        notification_type: 'crusher_accepted',
        title: '💜 Convite Crusher Aceito!',
        message: `Seu convite para "${event.title}" foi aceito!`
      });

      return { 
        success: true, 
        message: 'Convite aceito!' 
      };

    } catch (error: any) {
      console.error('❌ Erro ao aceitar convite Crusher:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🎯 MÉTODO ESPECÍFICO PARA REJEITAR EVENTOS CRUSHER
   */
  static async rejectCrusherInvite(
    participationId: string, 
    eventId: string, 
    userId: string, 
    reason: string = ''
  ): Promise<ServiceResult> {
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
        .from('event_participants')
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
        .from('event_participants')
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
        .from('event_participants')
        .select('*, user:profiles!event_participants_user_id_fkey(*)')
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
        .from('event_participants')
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

  // ============================================
  // 🆕 NOVOS MÉTODOS DE VALIDAÇÃO DE ENTRADA
  // ============================================

  /**
   * 🎯 Valida entrada do participante com senha
   * @param eventId - ID do evento
   * @param participantId - ID do participante
   * @param password - Senha de 4 dígitos digitada
   */
  static async validateEventEntry(
    eventId: number,
    participantId: string,
    password: string
  ): Promise<{
    success: boolean;
    message?: string;
    canEnter?: boolean;
    error?: any;
  }> {
    try {
      console.log(`🔍 Validando entrada: participante ${participantId} no evento ${eventId}`);

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
          message: 'Você não está inscrito neste evento'
        };
      }

      // ✅ Se já tem acesso, não precisa digitar de novo
      if (participation.com_acesso) {
        console.log(`✅ Participante ${participantId} já tem acesso`);
        return {
          success: true,
          canEnter: true,
          message: 'Você já possui acesso ao evento'
        };
      }

      // ❌ Se não foi aprovado
      if (participation.status !== 'aprovado') {
        return {
          success: false,
          canEnter: false,
          message: `Sua inscrição está com status: ${participation.status}`
        };
      }

      // 2️⃣ Validar a senha usando EventSecurityService
      const securityResult = await EventSecurityService.validateEntryPassword({
        eventId,
        participantId,
        password
      });

      if (!securityResult.success) {
        return {
          success: false,
          canEnter: false,
          message: securityResult.message
        };
      }

      // 3️⃣ Senha correta! Marcar presença
      console.log(`✅ Marcando presença para ${participantId} no evento ${eventId}`);

      const { error: presencaError } = await supabase
        .from('event_participants')
        .update({
          presenca_confirmada: true,
          updated_at: new Date().toISOString()
        })
        .eq('event_id', eventId)
        .eq('user_id', participantId);

      if (presencaError) throw presencaError;

      console.log(`✅ Participante ${participantId} agora tem acesso ao evento ${eventId}`);

      return {
        success: true,
        canEnter: true,
        message: securityResult.message || '✅ Acesso liberado! Bem-vindo ao evento.'
      };
    } catch (error) {
      console.error('❌ Erro ao validar entrada:', error);
      return {
        success: false,
        canEnter: false,
        message: 'Erro ao processar sua entrada',
        error
      };
    }
  }

  /**
   * 🔍 Verifica se participante pode entrar
   * @param eventId - ID do evento
   * @param participantId - ID do participante
   */
  static async canParticipantEnter(eventId: number, participantId: string): Promise<{
    can: boolean;
    reason?: string;
  }> {
    try {
      // 1️⃣ Verificar timing
      const timingCheck = await EventSecurityService.isEntryTimeValid(eventId);
      if (!timingCheck.allowed) {
        return {
          can: false,
          reason: timingCheck.reason
        };
      }

      // 2️⃣ Verificar se participante tem acesso
      const hasAccess = await EventSecurityService.hasUserAccess(eventId, participantId);
      if (hasAccess) {
        return {
          can: true,
          reason: 'Você já tem acesso ao evento'
        };
      }

      // 3️⃣ Se não tem acesso ainda, precisa digitar senha
      return {
        can: false,
        reason: 'Digite a senha para entrar no evento'
      };
    } catch (error) {
      console.error('❌ Erro ao verificar entrada:', error);
      return {
        can: false,
        reason: 'Erro ao verificar acesso'
      };
    }
  }

  /**
   * 📊 Obtém lista de participantes com acesso
   * @param eventId - ID do evento
   */
  static async getParticipantsWithAccess(eventId: number): Promise<{
    success: boolean;
    data?: Array<{
      userId: string;
      username?: string;
      entryTime?: string;
    }>;
    error?: any;
  }> {
    try {
      const { data: participations, error } = await supabase
        .from('event_participants')
        .select('user_id, entry_time, profile:profiles!user_id(username)')
        .eq('event_id', eventId)
        .eq('com_acesso', true)
        .order('entry_time', { ascending: true });

      if (error) throw error;

      const formatted = (participations || []).map(p => ({
        userId: p.user_id,
        username: (p.profile as any)?.username || 'Usuário',
        entryTime: p.entry_time
      }));

      return {
        success: true,
        data: formatted
      };
    } catch (error) {
      console.error('❌ Erro ao obter participantes com acesso:', error);
      return { success: false, error };
    }
  }

  /**
   * 📈 Obtém estatísticas de entrada do evento
   * @param eventId - ID do evento
   */
  static async getEventEntryStats(eventId: number): Promise<{
    success: boolean;
    data?: {
      totalParticipants: number;
      participantsWithAccess: number;
      participantsWithoutAccess: number;
      accessPercentage: number;
    };
    error?: any;
  }> {
    try {
      const { data: participations, error } = await supabase
        .from('event_participants')
        .select('com_acesso')
        .eq('event_id', eventId)
        .eq('status', 'aprovado');

      if (error) throw error;

      const total = participations?.length || 0;
      const withAccess = participations?.filter(p => p.com_acesso).length || 0;
      const withoutAccess = total - withAccess;
      const percentage = total > 0 ? Math.round((withAccess / total) * 100) : 0;

      return {
        success: true,
        data: {
          totalParticipants: total,
          participantsWithAccess: withAccess,
          participantsWithoutAccess: withoutAccess,
          accessPercentage: percentage
        }
      };
    } catch (error) {
      console.error('❌ Erro ao obter stats de entrada:', error);
      return { success: false, error };
    }
  }
}

export default ParticipationService;