import { supabase } from '../lib/supabaseClient';
import NotificationService from './NotificationService';

type EventStatus = 'Aberto' | 'Confirmado' | 'Em Andamento' | 'Finalizado' | 'Concluído' | 'Cancelado';

interface Event {
  id: string;
  status: EventStatus;
  start_time: string;
  end_time: string;
  vagas: number;
  cancelamento_motivo?: string;
  updated_at?: string;
  creator_id?: string;
  [key: string]: any;
}

interface Participation {
  id: string;
  event_id: string;
  status: string;
  presenca_confirmada: boolean;
  avaliacao_feita: boolean;
  [key: string]: any;
}

interface UpdateResult {
  success: boolean;
  updated?: number;
  error?: any;
}

interface EventStats {
  success: boolean;
  data?: {
    event: Event;
    totalCandidaturas: number;
    aprovados: number;
    presentes: number;
    avaliacoes: number;
  };
  error?: any;
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

/**
 * Serviço para gerenciar o ciclo de vida e status dos eventos
 * Baseado no White Paper V2.9
 */
class PartnerEventService {
  
  /**
   * Verifica e atualiza status de todos os eventos ativos
   * Deve ser chamado periodicamente (a cada minuto)
   */
  static async updateAllEventStatuses(): Promise<UpdateResult> {
    try {
      const now = new Date();
      
      // Busca eventos que não estão Concluídos ou Cancelados
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .not('status', 'in', '(Concluido,Cancelado)');

      if (error) throw error;

      const updates: Array<{ id: string; status: EventStatus; updated_at: string }> = [];

      for (const event of (events as unknown as Event[])) {
        const newStatus = this.calculateEventStatus(event, now);
        
        if (newStatus !== event.status) {
          updates.push({
            id: event.id,
            status: newStatus,
            updated_at: now.toISOString()
          });
        }
      }

      // Atualiza em batch
      if (updates.length > 0) {
        for (const update of updates) {
          await supabase
            .from('events')
            .update({ status: update.status, updated_at: update.updated_at })
            .eq('id', update.id);
        }
        
        console.log(`✅ ${updates.length} eventos atualizados`);
      }

      return { success: true, updated: updates.length };
    } catch (error) {
      console.error('❌ Erro ao atualizar status de eventos:', error);
      return { success: false, error };
    }
  }

  /**
   * Calcula o status correto de um evento baseado nas regras de negócio
   */
  static calculateEventStatus(event: Event, now: Date = new Date()): EventStatus {
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);

    // Cancelado permanece cancelado
    if (event.status === 'Cancelado') {
      return 'Cancelado';
    }

    // Concluído permanece concluído
    if (event.status === 'Concluído') {
      return 'Concluído';
    }

    // Evento já terminou → Finalizado (aguardando avaliações)
    if (now >= endTime) {
      return 'Finalizado';
    }

    // Evento está acontecendo → Em Andamento
    if (now >= startTime && now < endTime) {
      return 'Em Andamento';
    }

    // Evento futuro - verifica regras
    if (now < startTime) {
      // ✅ REGRA CRÍTICA: Confirmação manual é permanente!
      // Se o anfitrião confirmou manualmente, respeitar isso
      if (event.status === 'Confirmado') {
        return 'Confirmado';
      }

      // Se vagas preenchidas automaticamente → Confirmado
      if (event.vagas <= 0) {
        return 'Confirmado';
      }
      
      // Se ainda tem vagas e está no prazo → Aberto
      // Candidaturas aceitas até 5 minutos antes do início
      const fiveMinutesBefore = new Date(startTime.getTime() - 5 * 60 * 1000);
      if (now < fiveMinutesBefore) {
        return 'Aberto';
      }
      
      // Menos de 5 minutos para começar → Confirmado automaticamente
      return 'Confirmado';
    }

    return event.status; // Mantém status atual se nada mudou
  }

  /**
   * Confirma manualmente um evento (anfitrião fecha inscrições)
   */
  static async confirmEvent(eventId: string): Promise<UpdateResult> {
    try {
      const { error } = await supabase
        .from('events')
        .update({ 
          status: 'Confirmado',
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) throw error;

      console.log(`✅ Evento ${eventId} confirmado manualmente`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao confirmar evento:', error);
      return { success: false, error };
    }
  }

  /**
   * Cancela um evento
   */
  static async cancelEvent(eventId: string, reason: string = ''): Promise<UpdateResult> {
    try {
      const { error } = await supabase
        .from('events')
        .update({ 
          status: 'Cancelado',
          ...(reason && { cancelamento_motivo: reason }), // Só inclui se reason for fornecido
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) throw error;

      // TODO: Notificar participantes
      // TODO: Aplicar políticas de cancelamento

      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao cancelar evento:', error);
      return { success: false, error };
    }
  }

  /**
   * Marca evento como concluído após todas avaliações
   */
  static async completeEvent(eventId: string): Promise<UpdateResult> {
    try {
      // Verifica se todas avaliações foram feitas
      const { data: participations, error: participationsError } = await supabase
        .from('participations')
        .select('id, avaliacao_feita')
        .eq('event_id', eventId)
        .eq('presenca_confirmada', true);

      if (participationsError) throw participationsError;

      const allEvaluated = (participations as unknown as Participation[]).every(p => p.avaliacao_feita === true);

      if (!allEvaluated) {
        return { 
          success: false, 
          error: 'Nem todos os participantes avaliaram o evento' 
        };
      }

      const { error } = await supabase
        .from('events')
        .update({ 
          status: 'Concluído',
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao concluir evento:', error);
      return { success: false, error };
    }
  }

  /**
   * Obtém estatísticas de um evento
   */
  static async getEventStats(eventId: string): Promise<EventStats> {
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*, creator:profiles!creator_id(*)')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      const { data: participations, error: participationsError } = await supabase
        .from('participations')
        .select('*')
        .eq('event_id', eventId);

      if (participationsError) throw participationsError;

      const participationsList = participations as unknown as Participation[];

      return {
        success: true,
        data: {
          event: event as unknown as Event,
          totalCandidaturas: participationsList.length,
          aprovados: participationsList.filter(p => p.status === 'aprovado').length,
          presentes: participationsList.filter(p => p.presenca_confirmada === true).length,
          avaliacoes: participationsList.filter(p => p.avaliacao_feita === true).length,
        }
      };
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      return { success: false, error };
    }
  }

  /**
   * Inicia monitoramento automático de status
   * Atualiza a cada 1 minuto
   */
  static startAutoUpdate(): number {
    // Executa imediatamente
    this.updateAllEventStatuses();

    // Depois executa a cada 1 minuto
    const intervalId = setInterval(() => {
      this.updateAllEventStatuses();
    }, 60000); // 60 segundos

    return intervalId as unknown as number;
  }

  /**
   * Para o monitoramento automático
   */
  static stopAutoUpdate(intervalId: number): void {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }

  static async approveParticipation(participationId: string, eventId: string): Promise<ServiceResult> {
    try {
      console.log('🔔 [approveParticipation] Iniciando aprovação:', { participationId, eventId });

      // 1. Buscar dados do evento
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('vagas, title')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('❌ Erro ao buscar evento:', eventError);
        throw eventError;
      }

      if ((event as any).vagas <= 0) {
        console.warn('⚠️ Sem vagas disponíveis');
        return { success: false, error: 'Sem vagas disponíveis' };
      }

      // 2. Buscar dados do participante
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
        eventTitle: (event as any).title
      });

      // 3. Atualizar status da participação
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

      // 4. Decrementar vagas
      // Note: Using UserEventService's decrement, but since it's static, perhaps duplicate or import.
      // For now, duplicate the code to avoid circular imports or complex deps.
      const { error: decError } = await supabase.rpc('decrement_event_vacancy', { 
        event_id: eventId 
      });
      
      if (decError) {
        const { data: eventData } = await supabase
          .from('events')
          .select('vagas')
          .eq('id', eventId)
          .single();
        
        if (eventData && eventData.vagas > 0) {
          await supabase
            .from('events')
            .update({ vagas: eventData.vagas - 1 })
            .eq('id', eventId);
        }
      }
      console.log('✅ Vaga decrementada');

      // 5. 🔔 NOTIFICAR O PARTICIPANTE
      console.log('🔔 Enviando notificação ao participante...');
      const notifResult = await NotificationService.notifyParticipationApproved(
        (participation as any).user_id,
parseInt(eventId, 10),        (event as any).title
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

      // Notificar o participante sobre rejeição
      const part = participation as any;
      const notifResult = await NotificationService.notifyParticipationRejected(
        part.user_id,
        part.event_id, // Corrigido: mantido como string
        part.events.title,
        reason
      );

      if (!notifResult.success) {
        console.error('⚠️ Erro ao enviar notificação de rejeição:', notifResult.error);
      }

      return { success: true, message: 'Participação rejeitada' };

    } catch (error: any) {
      console.error('❌ Erro ao rejeitar participação:', error);
      return { success: false, error: error.message };
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
}

export default PartnerEventService;