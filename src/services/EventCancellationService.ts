// src/services/EventCancellationService.ts
import { supabase } from '../lib/supabaseClient';

interface CancellationCheck {
  canCancel: boolean;
  reason: string;
  hoursRemaining: number;
  participantsCount: number;
  requiredHours: number;
}

/**
 * Serviço para gerenciar cancelamento de eventos com regras específicas
 */
class EventCancellationService {

  /**
   * ✅ NOVAS REGRAS: Verificar se evento pode ser cancelado baseado em participantes e tempo
   * 
   * REGRAS:
   * - 1 participante confirmado: pode cancelar até 24h antes
   * - 2+ participantes confirmados: pode cancelar até 48h antes
   * - 0 participantes: pode cancelar a qualquer momento
   * - Evento já iniciado: não pode cancelar
   */
  static async canCancelEvent(eventId: number, creatorId: string): Promise<CancellationCheck> {
    try {
      console.log('🔍 Verificando regras de cancelamento para evento', eventId);

      // 1. Buscar dados do evento
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, title, start_time, creator_id, status')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return {
          canCancel: false,
          reason: 'Evento não encontrado',
          hoursRemaining: 0,
          participantsCount: 0,
          requiredHours: 0
        };
      }

      // 2. Verificar se é o criador
      if (String(event.creator_id) !== String(creatorId)) {
        return {
          canCancel: false,
          reason: 'Apenas o criador pode cancelar o evento',
          hoursRemaining: 0,
          participantsCount: 0,
          requiredHours: 0
        };
      }

      // 3. Verificar se evento já iniciou
      const now = new Date();
      const eventStart = new Date(event.start_time);
      const timeDiff = eventStart.getTime() - now.getTime();
      const hoursRemaining = timeDiff / (1000 * 60 * 60);

      if (hoursRemaining <= 0) {
        return {
          canCancel: false,
          reason: 'Evento já iniciou ou passou da data de início',
          hoursRemaining: Math.round(hoursRemaining),
          participantsCount: 0,
          requiredHours: 0
        };
      }

      // 4. Contar participantes confirmados (aprovados)
      const { data: participants, error: participantsError } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('status', 'aprovado');

      if (participantsError) {
        console.error('Erro ao buscar participantes:', participantsError);
        return {
          canCancel: false,
          reason: 'Erro ao verificar participantes',
          hoursRemaining: Math.round(hoursRemaining),
          participantsCount: 0,
          requiredHours: 0
        };
      }

      const participantsCount = participants?.length || 0;

      // 5. ✅ APLICAR NOVAS REGRAS BASEADAS EM PARTICIPANTES
      let requiredHours: number;
      let reason: string;

      if (participantsCount === 0) {
        // Sem participantes: pode cancelar a qualquer momento
        return {
          canCancel: true,
          reason: 'Sem participantes confirmados - pode cancelar a qualquer momento',
          hoursRemaining: Math.round(hoursRemaining),
          participantsCount,
          requiredHours: 0
        };
      } else if (participantsCount === 1) {
        // ✅ NOVA REGRA: 1 participante = 24h antes
        requiredHours = 24;
        reason = '1 participante confirmado - requer 24h de antecedência';
      } else {
        // ✅ NOVA REGRA: 2+ participantes = 48h antes
        requiredHours = 48;
        reason = `${participantsCount} participantes confirmados - requer 48h de antecedência`;
      }

      // 6. Verificar se tem tempo suficiente
      const canCancel = hoursRemaining >= requiredHours;

      if (canCancel) {
        return {
          canCancel: true,
          reason: `Pode cancelar - ${Math.round(hoursRemaining)}h restantes (mínimo ${requiredHours}h)`,
          hoursRemaining: Math.round(hoursRemaining),
          participantsCount,
          requiredHours
        };
      } else {
        const hoursNeeded = requiredHours - hoursRemaining;
        return {
          canCancel: false,
          reason: `Não pode cancelar - faltam ${Math.round(hoursNeeded)}h para atingir ${requiredHours}h mínimas`,
          hoursRemaining: Math.round(hoursRemaining),
          participantsCount,
          requiredHours
        };
      }

    } catch (error) {
      console.error('Erro ao verificar cancelamento:', error);
      return {
        canCancel: false,
        reason: 'Erro interno na verificação',
        hoursRemaining: 0,
        participantsCount: 0,
        requiredHours: 0
      };
    }
  }

  /**
   * ✅ Cancelar evento com validação das novas regras
   */
  static async cancelEvent(eventId: number, creatorId: string, reason: string = ''): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      // 1. Verificar se pode cancelar
      const check = await this.canCancelEvent(eventId, creatorId);
      
      if (!check.canCancel) {
        return {
          success: false,
          message: check.reason
        };
      }

      // 2. Cancelar o evento
      const { error: updateError } = await supabase
        .from('events')
        .update({
          status: 'Cancelado',
          cancelamento_motivo: reason || 'Cancelado pelo anfitrião',
          cancelado_em: new Date().toISOString()
        })
        .eq('id', eventId)
        .eq('creator_id', creatorId);

      if (updateError) {
        throw updateError;
      }

      console.log(`✅ Evento ${eventId} cancelado com sucesso`);
      
      return {
        success: true,
        message: `Evento cancelado com sucesso (${check.participantsCount} participantes afetados)`
      };

    } catch (error) {
      console.error('Erro ao cancelar evento:', error);
      return {
        success: false,
        message: 'Erro interno ao cancelar evento',
        error: error.message
      };
    }
  }

  /**
   * ✅ Função utilitária para formatar tempo restante
   */
  static formatTimeRemaining(hours: number): string {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} minutos`;
    } else if (hours < 24) {
      return `${Math.round(hours)} horas`;
    } else {
      const days = Math.round(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return remainingHours > 0 
        ? `${days} dias e ${remainingHours} horas`
        : `${days} dias`;
    }
  }
}

export default EventCancellationService;