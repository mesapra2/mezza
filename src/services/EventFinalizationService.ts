// src/services/EventFinalizationService.ts
import { supabase } from '../lib/supabaseClient';

/**
 * Serviço para finalizar automaticamente eventos que passaram 7+ dias sem qualificação
 */
class EventFinalizationService {

  /**
   * ✅ NOVA FUNÇÃO: Finalizar eventos que passaram 7+ dias do término sem qualificação
   */
  static async autoFinalizeExpiredEvents(): Promise<void> {
    try {
      console.log('🔄 Iniciando finalização automática de eventos expirados (7+ dias)...');
      
      const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
      
      // Buscar eventos que terminaram há 7+ dias e ainda estão "Em Andamento" ou "Confirmado"
      const { data: expiredEvents, error: eventsError } = await supabase
        .from('events')
        .select('id, title, end_time, status')
        .in('status', ['Em Andamento', 'Confirmado'])
        .lt('end_time', sevenDaysAgo.toISOString());

      if (eventsError || !expiredEvents?.length) {
        console.log('🔍 Nenhum evento para finalização automática encontrado');
        return;
      }

      console.log(`🔍 Encontrados ${expiredEvents.length} eventos para verificação de finalização`);

      for (const event of expiredEvents) {
        try {
          // ✅ CORREÇÃO: Verificar se tem participantes com acesso (sem colunas de qualificação)
          const { data: qualifiedParticipants, error: participantsError } = await supabase
            .from('event_participants')
            .select('id')
            .eq('event_id', event.id)
            .eq('status', 'aprovado')
            .eq('com_acesso', true);

          if (participantsError) {
            console.error(`❌ Erro ao verificar participantes qualificados do evento ${event.id}:`, participantsError);
            continue;
          }

          // Se NÃO tem participantes qualificados, finalizar automaticamente
          if (!qualifiedParticipants || qualifiedParticipants.length === 0) {
            console.log(`📋 Auto-finalizando evento ${event.id} (${event.title}) - 7+ dias sem qualificação`);
            
            const { error: updateError } = await supabase
              .from('events')
              .update({ 
                status: 'Finalizado',
                updated_at: new Date().toISOString()
              })
              .eq('id', event.id);

            if (updateError) {
              console.error(`❌ Erro ao finalizar evento ${event.id}:`, updateError);
            } else {
              console.log(`✅ Evento ${event.id} finalizado automaticamente (sem qualificação em 7+ dias)`);
            }
          } else {
            console.log(`⏳ Evento ${event.id} tem ${qualifiedParticipants.length} qualificado(s) - mantendo ativo`);
          }
        } catch (error) {
          console.error(`❌ Erro ao processar evento ${event.id}:`, error);
        }
      }
      
      console.log('✅ Finalização automática concluída');
    } catch (error) {
      console.error('❌ Erro na finalização automática:', error);
    }
  }

  /**
   * ✅ NOVA FUNÇÃO: Iniciar monitoramento automático de finalização
   */
  static startAutoFinalizationMonitoring(): void {
    // Executar finalização automática a cada 6 horas (4 vezes por dia)
    setInterval(() => {
      this.autoFinalizeExpiredEvents();
    }, 6 * 60 * 60 * 1000); // 6 horas

    // Executar uma vez imediatamente
    this.autoFinalizeExpiredEvents();
    
    console.log('🔄 Monitoramento automático de finalização iniciado (a cada 6h)');
  }

  /**
   * ✅ NOVA FUNÇÃO: Verificar se um evento deve ser finalizado
   */
  static async shouldEventBeFinalized(event: any): Promise<{
    shouldFinalize: boolean;
    reason: string;
    daysPassedSinceEnd: number;
  }> {
    try {
      const now = new Date();
      const eventEnd = new Date(event.end_time);
      const timeDiff = now.getTime() - eventEnd.getTime();
      const daysPassedSinceEnd = Math.floor(timeDiff / (24 * 60 * 60 * 1000));

      // Se passou menos de 7 dias, não finalizar
      if (daysPassedSinceEnd < 7) {
        return {
          shouldFinalize: false,
          reason: `Apenas ${daysPassedSinceEnd} dias desde o término`,
          daysPassedSinceEnd
        };
      }

      // ✅ CORREÇÃO: Verificar se tem participantes com acesso (sem colunas de qualificação)
      const { data: qualifiedParticipants, error } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', event.id)
        .eq('status', 'aprovado')
        .eq('com_acesso', true);

      if (error) {
        return {
          shouldFinalize: false,
          reason: 'Erro ao verificar qualificação',
          daysPassedSinceEnd
        };
      }

      // Se não tem qualificados e passou 7+ dias, finalizar
      if (!qualifiedParticipants || qualifiedParticipants.length === 0) {
        return {
          shouldFinalize: true,
          reason: `${daysPassedSinceEnd} dias sem qualificação - deve finalizar`,
          daysPassedSinceEnd
        };
      }

      // Se tem qualificados, não finalizar
      return {
        shouldFinalize: false,
        reason: `${qualifiedParticipants.length} participante(s) qualificado(s)`,
        daysPassedSinceEnd
      };

    } catch (error) {
      console.error('Erro ao verificar finalização:', error);
      return {
        shouldFinalize: false,
        reason: 'Erro na verificação',
        daysPassedSinceEnd: 0
      };
    }
  }
}

export default EventFinalizationService;