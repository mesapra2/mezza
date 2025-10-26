// AutoCancelEventService.js
// Serviço para cancelar automaticamente eventos sem candidatos

import { supabase } from '@/lib/supabaseClient';

class AutoCancelEventService {
  constructor() {
    this.checkInterval = null;
    this.MINUTES_BEFORE_START = 5; // 5 minutos antes do início
  }

  /**
   * Inicia o monitoramento automático de eventos
   */
  start() {
    // Verifica a cada 1 minuto
    this.checkInterval = setInterval(() => {
      this.checkAndCancelEvents();
    }, 60000); // 60 segundos

    // Executa imediatamente na primeira vez
    this.checkAndCancelEvents();

    console.log('✅ AutoCancelEventService iniciado');
  }

  /**
   * Para o monitoramento
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🛑 AutoCancelEventService parado');
    }
  }

  /**
   * Verifica e cancela eventos sem candidatos
   */
  async checkAndCancelEvents() {
    try {
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + (this.MINUTES_BEFORE_START * 60000));

      console.log('🔍 Verificando eventos para auto-cancelamento...');

      // Busca eventos que:
      // 1. Estão com status 'Aberto'
      // 2. Iniciam em até 5 minutos
      const { data: eventsToCheck, error: eventsError } = await supabase
        .from('events')
        .select('id, title, start_time, creator_id')
        .eq('status', 'Aberto')
        .lte('start_time', fiveMinutesFromNow.toISOString())
        .gte('start_time', now.toISOString());

      if (eventsError) {
        console.error('❌ Erro ao buscar eventos:', eventsError);
        return;
      }

      if (!eventsToCheck || eventsToCheck.length === 0) {
        console.log('✅ Nenhum evento próximo ao início encontrado');
        return;
      }

      console.log(`📋 Verificando ${eventsToCheck.length} evento(s)...`);

      // Para cada evento, verifica se tem candidatos aprovados
      for (const event of eventsToCheck) {
        await this.checkEventParticipations(event);
      }

    } catch (error) {
      console.error('❌ Erro no checkAndCancelEvents:', error);
    }
  }

  /**
   * Verifica participações de um evento específico
   */
  async checkEventParticipations(event) {
    try {
      // Busca participações aprovadas do evento
      const { data: participations, error: participationsError } = await supabase
        .from('participations')
        .select('id, status')
        .eq('event_id', event.id)
        .eq('status', 'aprovado');

      if (participationsError) {
        console.error(`❌ Erro ao buscar participações do evento ${event.id}:`, participationsError);
        return;
      }

      const hasApprovedParticipants = participations && participations.length > 0;

      if (!hasApprovedParticipants) {
        console.log(`⚠️ Evento "${event.title}" (ID: ${event.id}) não tem participantes - CANCELANDO`);
        await this.cancelEvent(event);
      } else {
        console.log(`✅ Evento "${event.title}" tem ${participations.length} participante(s) aprovado(s)`);
      }

    } catch (error) {
      console.error(`❌ Erro ao verificar participações do evento ${event.id}:`, error);
    }
  }

  /**
   * Cancela um evento automaticamente
   */
  async cancelEvent(event) {
    try {
      const { error: updateError } = await supabase
        .from('events')
        .update({
          status: 'Cancelado',
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id);

      if (updateError) {
        console.error(`❌ Erro ao cancelar evento ${event.id}:`, updateError);
        return { success: false, error: updateError.message };
      }

      console.log(`✅ Evento "${event.title}" cancelado automaticamente (sem participantes)`);

      // Opcional: Notificar o criador do evento
      await this.notifyEventCreator(event);

      return { success: true };

    } catch (error) {
      console.error(`❌ Erro ao cancelar evento:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notifica o criador do evento sobre o cancelamento
   */
  async notifyEventCreator(event) {
    try {
      // Busca informações do criador
      const { data: creator } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', event.creator_id)
        .single();

      if (!creator) return;

      // Cria notificação no sistema
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: event.creator_id,
          type: 'event_auto_cancelled',
          title: 'Evento Cancelado Automaticamente',
          message: `Seu evento "${event.title}" foi cancelado automaticamente por falta de participantes confirmados.`,
          related_event_id: event.id,
          created_at: new Date().toISOString()
        });

      if (notificationError) {
        console.error('❌ Erro ao criar notificação:', notificationError);
      } else {
        console.log(`📧 Notificação enviada para o criador do evento ${event.id}`);
      }

      // Opcional: Enviar email (se o sistema tiver configurado)
      // await this.sendCancellationEmail(creator, event);

    } catch (error) {
      console.error('❌ Erro ao notificar criador:', error);
    }
  }

  /**
   * Envia email de cancelamento (implementar se necessário)
   */
  async sendCancellationEmail(creator, event) {
    // TODO: Implementar integração com serviço de email
    console.log(`📧 Email de cancelamento seria enviado para ${creator.email}`);
  }
}

// Instância singleton
const autoCancelEventService = new AutoCancelEventService();

export default autoCancelEventService;