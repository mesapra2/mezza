<<<<<<< HEAD
import { supabase } from '@/lib/supabaseClient';
import NotificationService from '@/services/NotificationService';
=======
import { supabase } from '@/lib/supabaseClient';  // ✅ Correto
import NotificationService from '../../shared/services/notificationService';
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925

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

class UserEventService {
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

  static async cancelParticipation(participationId: string, userId: string): Promise<ServiceResult> {
    try {
      const { data: participation, error: partError } = await supabase
        .from('event_participants')
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
        .from('event_participants')
        .update({ 
          status: 'cancelado',
          updated_at: new Date().toISOString()
        })
        .eq('id', participationId);

      if (updateError) throw updateError;

      if (part.status === 'aprovado') {
        await this.incrementEventVacancy(part.event_id);
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
    const { error } = await supabase.rpc('decrement_event_vacancy', { 
      event_id: eventId 
    });
    
    if (error) {
      const { data: event } = await supabase
        .from('events')
        .select('vagas')
        .eq('id', eventId)
        .single();
      
      const eventData = event as unknown as Event;
      if (eventData && eventData.vagas > 0) {
        await supabase
          .from('events')
          .update({ vagas: eventData.vagas - 1 })
          .eq('id', eventId);
      }
    }
  }

  static async incrementEventVacancy(eventId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_event_vacancy', { 
      event_id: eventId 
    });
    
    if (error) {
      const { data: event } = await supabase
        .from('events')
        .select('vagas, max_vagas')
        .eq('id', eventId)
        .single();
      
      const eventData = event as unknown as Event;
      if (eventData && (!eventData.max_vagas || eventData.vagas < eventData.max_vagas)) {
        await supabase
          .from('events')
          .update({ vagas: eventData.vagas + 1 })
          .eq('id', eventId);
      }
    }
  }
}

export default UserEventService;