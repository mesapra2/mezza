// src/services/EventStatusService.ts
import { supabase } from '../lib/supabaseClient';

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

class EventStatusService {
  
  static async updateAllEventStatuses(): Promise<UpdateResult> {
    let retries = 3;
    
    while (retries > 0) {
      try {
        const now = new Date();
        
        const { data: events, error } = await supabase
          .from('events')
          .select('*')
          .not('status', 'in', '(Concluído,Cancelado)');

        if (error) throw error;

        const updates: Array<{ id: string; status: EventStatus; updated_at: string }> = [];

        for (const event of (events as unknown as Event[])) {
          const newStatus = await this.calculateEventStatus(event, now);
          
          if (newStatus !== event.status) {
            updates.push({
              id: event.id,
              status: newStatus,
              updated_at: now.toISOString()
            });
          }
        }

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
        retries--;
        if (retries === 0) {
          console.error('❌ Erro ao atualizar status de eventos após 3 tentativas:', error);
          return { success: false, error };
        } else {
          console.warn(`⚠️ Erro ao atualizar status. Tentando novamente... (${retries} tentativas restantes)`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Aguarda 2s antes de tentar novamente
        }
      }
    }
    
    return { success: false, error: 'Falha ao atualizar status de eventos' };
  }

  static async calculateEventStatus(event: Event, now: Date = new Date()): Promise<EventStatus> {
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);

    if (event.status === 'Cancelado') {
      return 'Cancelado';
    }

    if (event.status === 'Concluído') {
      return 'Concluído';
    }

    if (now >= endTime) {
      // 👇 CORRIGIDO: Verifica se deve auto-concluir
      const shouldAutoComplete = await this.shouldAutoCompleteEvent(event);
      if (shouldAutoComplete) {
        return 'Concluído';
      }
      return 'Finalizado';
    }

    if (now >= startTime && now < endTime) {
      return 'Em Andamento';
    }

    if (now < startTime) {
      if (event.status === 'Confirmado') {
        return 'Confirmado';
      }

      if (event.vagas <= 0) {
        return 'Confirmado';
      }
      
      const fiveMinutesBefore = new Date(startTime.getTime() - 5 * 60 * 1000);
      if (now < fiveMinutesBefore) {
        return 'Aberto';
      }
      
      return 'Confirmado';
    }

    return event.status;
  }

  /**
   * 🔒 Verifica se o evento deve ser auto-concluído
   * Conclui se:
   * 1. Passou 7 dias desde o fim
   * 2. OU TODOS que compareceram avaliaram TUDO (anfitrião, participantes, restaurante)
   */
  static async shouldAutoCompleteEvent(event: Event): Promise<boolean> {
    let retries = 2;
    
    while (retries > 0) {
      try {
        const endTime = new Date(event.end_time);
        const now = new Date();
        const daysSinceEnd = (now.getTime() - endTime.getTime()) / (1000 * 60 * 60 * 24);

        // 💡 Condição 1: Passou 7 dias? → Conclui automaticamente
        if (daysSinceEnd >= 7) {
          console.log(`✅ Evento ${event.id} auto-concluído após 7 dias`);
          return true;
        }

        // 💡 Condição 2: Todos que compareceram avaliaram TUDO?
        const { data: participations, error: participationsError } = await supabase
          .from('participations')
          .select('id, avaliacao_feita, presenca_confirmada')
          .eq('event_id', event.id)
          .eq('status', 'aprovado');

        if (participationsError) {
          console.error('❌ Erro ao buscar participações:', participationsError);
          return false;
        }

        if (!participations || participations.length === 0) {
          // ❌ Se não tem participações, NÃO conclui (aguarda 7 dias)
          console.log(`⏳ Evento ${event.id} sem participações aprovadas ainda`);
          return false;
        }

        // Pega apenas os que confirmaram presença
        const presentParticipants = (participations as unknown as Participation[]).filter(
          p => p.presenca_confirmada === true
        );

        // ✅ Verifica se TODOS os presentes completaram TODAS as avaliações
        const allEvaluated = presentParticipants.every(p => p.avaliacao_feita === true);

        // 🔒 CORREÇÃO: Aplicando a regra exata do white paper
        // Só conclui se allEvaluated for true E houver mais de 0 participantes
        if (allEvaluated && presentParticipants.length > 0) {
          console.log(`✅ Evento ${event.id} auto-concluído - TODOS avaliaram TUDO (anfitrião + participantes + restaurante)`);
          return true;
        }
        
        // Se o 'if' acima falhar, o evento continua "Finalizado".
        // A lógica abaixo é apenas para logar o motivo.

        if (presentParticipants.length === 0) {
          // Ninguém compareceu
          console.log(`⏳ Evento ${event.id} ninguém compareceu - aguardando 7 dias`);
        } else {
          // Alguém compareceu, mas falta avaliar
          // 🐞 CORREÇÃO: Declarando 'pendingCount' dentro deste 'else' para evitar redeclaração
          const pendingCount = presentParticipants.filter(p => !p.avaliacao_feita).length;
          console.log(`⏳ Evento ${event.id} aguardando ${pendingCount} avaliação(ões) completa(s)`);
        }
        
        return false; // Continua como "Finalizado"
        
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error('❌ Erro ao verificar auto-complete após 2 tentativas:', error);
          return false;
        } else {
          console.warn(`⚠️ Erro ao verificar auto-complete. Tentando novamente...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    return false;
  }

  static async confirmEvent(eventId: string): Promise<UpdateResult> {
    let retries = 2;
    
    while (retries > 0) {
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
        retries--;
        if (retries === 0) {
          console.error('❌ Erro ao confirmar evento após 2 tentativas:', error);
          return { success: false, error };
        } else {
          console.warn(`⚠️ Erro ao confirmar evento. Tentando novamente...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    return { success: false, error: 'Falha ao confirmar evento' };
  }

  static async cancelEvent(eventId: string, reason: string = ''): Promise<UpdateResult> {
    let retries = 2;
    
    while (retries > 0) {
      try {
        const { error } = await supabase
          .from('events')
          .update({ 
            status: 'Cancelado',
            ...(reason && { cancelamento_motivo: reason }),
            updated_at: new Date().toISOString()
          })
          .eq('id', eventId);

        if (error) throw error;

        return { success: true };
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error('❌ Erro ao cancelar evento após 2 tentativas:', error);
          return { success: false, error };
        } else {
          console.warn(`⚠️ Erro ao cancelar evento. Tentando novamente...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    return { success: false, error: 'Falha ao cancelar evento' };
  }

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
        .eq('event_id', eventId)
        .eq('status', 'aprovado');

      if (participationsError) throw participationsError;

      const participationsList = (participations || []) as unknown as Participation[];

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

  static startAutoUpdate(): number {
    this.updateAllEventStatuses();

    const intervalId = setInterval(() => {
      this.updateAllEventStatuses();
    }, 60000); // 60 segundos

    return intervalId as unknown as number;
  }

  static stopAutoUpdate(intervalId: number): void {
    if (intervalId) {
      clearInterval(intervalId);
    }
  }
}

export default EventStatusService;