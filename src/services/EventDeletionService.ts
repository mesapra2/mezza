// src/services/EventDeletionService.ts
import { supabase } from '../lib/supabaseClient';

interface EventDeletionResult {
  success: boolean;
  message: string;
  error?: string;
}

interface EventDeletionCheck {
  canDelete: boolean;
  reason: string;
  hasParticipants: boolean;
  hasAccessedUsers: boolean;
}

/**
 * Serviço para gerenciar exclusão de eventos sem participação efetiva
 */
class EventDeletionService {
  /**
   * Verifica se um evento pode ser deletado
   * NOVA REGRA: Todo evento SEM usuários CONFIRMADOS pode ser deletado
   * Critérios:
   * 1. Nenhum participante confirmado (status = 'aprovado') OU
   * 2. Participantes pendentes mas nenhum confirmado
   */
  static async canDeleteEvent(eventId: number, creatorId: string): Promise<EventDeletionCheck> {
    try {
      // 1. Verificar se é o criador
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('creator_id, status, title')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return {
          canDelete: false,
          reason: 'Evento não encontrado',
          hasParticipants: false,
          hasAccessedUsers: false
        };
      }

      // ✅ CORREÇÃO DEFINITIVA: Remover verificação de creator_id aqui
      // A verificação será feita apenas na interface, não no serviço
      console.log('🔍 Processando evento:', {
        eventId: event.id,
        eventCreatorId: event.creator_id,
        creatorIdParam: creatorId,
        title: event.title
      });

      // 2. Verificar se evento já está finalizado ou concluído
      if (['Finalizado', 'Concluído'].includes(event.status)) {
        return {
          canDelete: false,
          reason: 'Eventos finalizados ou concluídos não podem ser deletados',
          hasParticipants: false,
          hasAccessedUsers: false
        };
      }

      // ✅ CORREÇÃO: Verificar se evento passou da hora de início mas ainda está "Aberto"
      const now = new Date();
      const eventStart = new Date(event.start_time);
      const eventHasPassed = eventStart <= now;

      // Se evento passou da hora e ainda está "Aberto", considerar para deleção
      const isOpenPastEvent = event.status === 'Aberto' && eventHasPassed;

      // 3. ✅ NOVA LÓGICA: Buscar participantes CONFIRMADOS (aprovados)
      const { data: participants, error: participantsError } = await supabase
        .from('event_participants')
        .select('id, user_id, com_acesso, status')
        .eq('event_id', eventId)
        .eq('status', 'aprovado'); // Apenas confirmados

      console.log(`🔍 Evento ${eventId} - Participantes confirmados:`, participants);

      if (participantsError) {
        return {
          canDelete: false,
          reason: 'Erro ao verificar participantes',
          hasParticipants: false,
          hasAccessedUsers: false
        };
      }

      const hasConfirmedParticipants = participants && participants.length > 0;
      
      // ✅ NOVA REGRA SIMPLIFICADA: Se não tem participantes CONFIRMADOS, pode deletar
      if (!hasConfirmedParticipants) {
        return {
          canDelete: true,
          reason: isOpenPastEvent 
            ? 'Evento passou da hora de início sem participantes confirmados'
            : 'Evento sem participantes confirmados',
          hasParticipants: false,
          hasAccessedUsers: false
        };
      }

      // ✅ Se tem participantes CONFIRMADOS, NÃO pode deletar
      return {
        canDelete: false,
        reason: `${participants.length} participante(s) confirmado(s) no evento`,
        hasParticipants: true,
        hasAccessedUsers: true
      };

    } catch (error) {
      console.error('Erro ao verificar se pode deletar evento:', error);
      return {
        canDelete: false,
        reason: 'Erro interno ao verificar evento',
        hasParticipants: false,
        hasAccessedUsers: false
      };
    }
  }

  /**
   * Deleta um evento e limpa dados relacionados
   */
  static async deleteEvent(eventId: number, creatorId: string): Promise<EventDeletionResult> {
    try {
      // 1. Verificar se pode deletar
      const check = await this.canDeleteEvent(eventId, creatorId);
      if (!check.canDelete) {
        return {
          success: false,
          message: check.reason
        };
      }

      // 2. Deletar em ordem (relacionamentos primeiro)
      
      // Deletar participações
      await supabase
        .from('event_participants')
        .delete()
        .eq('event_id', eventId);

      // Deletar notificações relacionadas
      await supabase
        .from('notifications')
        .delete()
        .eq('event_id', eventId);

      // Deletar fotos do evento (se houver)
      await supabase
        .from('event_photos')
        .delete()
        .eq('event_id', eventId);

      // ✅ REMOVIDO: Deletar avaliações (tabela não existe - causava erro 404)
      // await supabase
      //   .from('event_ratings')
      //   .delete()
      //   .eq('event_id', eventId);

      // 3. Deletar o evento principal
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('creator_id', creatorId); // Dupla verificação de segurança

      if (deleteError) {
        throw deleteError;
      }

      return {
        success: true,
        message: check.hasParticipants 
          ? 'Evento deletado (sem participação efetiva)'
          : 'Evento deletado (sem participantes)'
      };

    } catch (error) {
      console.error('Erro ao deletar evento:', error);
      return {
        success: false,
        message: 'Erro interno ao deletar evento',
        error: error.message
      };
    }
  }

  /**
   * Verifica quais eventos de um usuário podem ser deletados
   */
  static async getEventsDeletionStatus(events: any[], userId: string): Promise<{[eventId: number]: EventDeletionCheck}> {
    const deletionStatus: {[eventId: number]: EventDeletionCheck} = {};

    // ✅ NOVA LÓGICA: Processar TODOS os eventos do usuário
    for (const event of events) {
      // ✅ Como são eventos criados pelo usuário, sempre processar
      console.log(`✅ Processando evento ${event.id} para verificação de deleção`);
      deletionStatus[event.id] = await this.canDeleteEvent(event.id, userId);
    }

    console.log('🗑️ Status final gerado:', deletionStatus);
    return deletionStatus;
  }

  /**
   * ✅ NOVA FUNÇÃO: Verifica se evento pode ser editado completamente
   * Critério: Nenhum participante confirmado
   */
  static async canEditEventCompletely(eventId: number, creatorId: string): Promise<boolean> {
    try {
      const check = await this.canDeleteEvent(eventId, creatorId);
      // Se pode deletar, pode editar completamente
      return check.canDelete;
    } catch (error) {
      console.error('Erro ao verificar edição completa:', error);
      return false;
    }
  }

  /**
   * ✅ NOVA FUNÇÃO: Deleção automática de eventos passados sem inscritos
   * Deleta eventos que passaram há 5+ minutos e não têm NENHUM inscrito
   */
  static async autoDeleteExpiredEvents(): Promise<void> {
    try {
      console.log('🔄 Iniciando deleção automática de eventos expirados...');
      
      const fiveMinutesAgo = new Date(Date.now() - (5 * 60 * 1000));
      
      // Buscar eventos que passaram há 5+ minutos e estão ainda "Aberto"
      const { data: expiredEvents, error: eventsError } = await supabase
        .from('events')
        .select('id, title, start_time, creator_id')
        .eq('status', 'Aberto')
        .lt('start_time', fiveMinutesAgo.toISOString());

      if (eventsError || !expiredEvents?.length) {
        console.log('🔍 Nenhum evento expirado encontrado');
        return;
      }

      console.log(`🔍 Encontrados ${expiredEvents.length} eventos expirados para verificação`);

      for (const event of expiredEvents) {
        // Verificar se tem ALGUM participante (mesmo pendente)
        const { data: anyParticipants, error: participantsError } = await supabase
          .from('event_participants')
          .select('id')
          .eq('event_id', event.id);

        if (participantsError) {
          console.error(`❌ Erro ao verificar participantes do evento ${event.id}:`, participantsError);
          continue;
        }

        // Se NÃO tem NENHUM inscrito, deletar automaticamente
        if (!anyParticipants || anyParticipants.length === 0) {
          console.log(`🗑️ Auto-deletando evento ${event.id} (${event.title}) - sem inscritos há 5+ min`);
          
          const result = await this.deleteEvent(event.id, event.creator_id);
          if (result.success) {
            console.log(`✅ Evento ${event.id} deletado automaticamente`);
          } else {
            console.error(`❌ Falha ao deletar evento ${event.id}:`, result.message);
          }
        } else {
          console.log(`⏳ Evento ${event.id} tem ${anyParticipants.length} inscrito(s) - mantendo`);
        }
      }
      
      console.log('✅ Deleção automática concluída');
    } catch (error) {
      console.error('❌ Erro na deleção automática:', error);
    }
  }

  /**
   * ✅ NOVA FUNÇÃO: Iniciar monitoramento automático de deleção
   */
  static startAutoDeleteMonitoring(): void {
    // Executar deleção automática a cada 2 minutos
    setInterval(() => {
      this.autoDeleteExpiredEvents();
    }, 2 * 60 * 1000); // 2 minutos

    // Executar uma vez imediatamente
    this.autoDeleteExpiredEvents();
    
    console.log('🔄 Monitoramento automático de deleção iniciado (a cada 2 min)');
  }

  /**
   * Filtra eventos para histórico - só mostra eventos onde houve participação efetiva
   */
  static async filterEventsForHistory(events: any[], userId: string): Promise<any[]> {
    const filteredEvents = [];

    for (const event of events) {
      // Se é criador, verificar se houve participação efetiva
      if (event.creator_id === userId) {
        const check = await this.canDeleteEvent(event.id, userId);
        
        // Só incluir no histórico se houve participação efetiva OU se o evento está em andamento
        if (check.hasAccessedUsers || ['Aberto', 'Confirmado', 'Em Andamento'].includes(event.status)) {
          filteredEvents.push(event);
        }
      } else {
        // Se é participante, verificar se digitou a senha
        try {
          const { data: participation } = await supabase
            .from('event_participants')
            .select('com_acesso')
            .eq('event_id', event.id)
            .eq('user_id', userId)
            .eq('status', 'aprovado')
            .single();

          // Só incluir se digitou a senha OU se o evento ainda está ativo
          if (participation?.com_acesso === true || ['Aberto', 'Confirmado', 'Em Andamento'].includes(event.status)) {
            filteredEvents.push(event);
          }
        } catch (error) {
          // Em caso de erro, incluir no histórico
          filteredEvents.push(event);
        }
      }
    }

    return filteredEvents;
  }
}

export default EventDeletionService;