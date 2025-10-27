// src/services/EventStatusService.ts
// ✅ VERSÃO CONSOLIDADA FINAL

import { supabase } from '../lib/supabaseClient';
import EventSecurityService from './EventSecurityService';
import PushNotificationService from './PushNotificationService';
import TrustScoreService from './TrustScoreService';

interface Event {
  id: number;
  status: string;
  start_time: string;
  end_time: string;
  creator_id: string;
  [key: string]: any;
}

interface Participation {
  id: string;
  user_id: string;
  event_id: number;
  status: string;
  presenca_confirmada: boolean;
  avaliacao_feita: boolean;
  [key: string]: any;
}

class EventStatusService {
  // ============================================
  // 🔄 PROPRIEDADE PRIVADA PARA AUTO-UPDATE
  // ============================================
  private static updateInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * 🎯 Atualiza status de TODOS os eventos
   * Executa a cada X segundos (Real-time via Supabase)
   */
  static async updateAllEventStatuses(): Promise<void> {
    try {
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .neq('status', 'Cancelado')
        .neq('status', 'Concluído');

      if (error) {
        console.error('❌ Erro ao buscar eventos:', error);
        return;
      }

      if (!events || events.length === 0) {
        console.log('✅ Nenhum evento para atualizar');
        return;
      }

      console.log(`🔄 Atualizando ${events.length} eventos...`);

      for (const event of events) {
        try {
          await this.calculateEventStatus(event as Event);
        } catch (eventError) {
          console.error(`❌ Erro ao processar evento ${event.id}:`, eventError);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar todos os eventos:', error);
    }
  }

  /**
   * 📊 Calcula o status de um evento específico
   */
  static async calculateEventStatus(event: Event): Promise<void> {
    const now = new Date();
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    const currentStatus = event.status;

    // ============================================
    // 🎯 FASE 1: Detectar "falta 1 minuto" → Gerar senha + Enviar push
    // ============================================
    await this.detectAndHandlePasswordGeneration(event, now, startTime);

    // ============================================
    // 🎯 FASE 2: Detectar "falta 2 minutos para fim" → Bloquear entrada
    // ============================================
    await this.detectAndHandleEntryLocking(event, now, endTime);

    // ============================================
    // 🎯 FASE 3: Evento está acontecendo
    // ============================================
    if (now >= startTime && now < endTime && currentStatus !== 'Em Andamento') {
      await this.updateEventStatus(event.id, 'Em Andamento');
    }

    // ============================================
    // 🎯 FASE 4: Evento terminou
    // ============================================
    if (now >= endTime && currentStatus !== 'Finalizado') {
      console.log(`⏹️ Evento ${event.id} terminou`);
      await this.updateEventStatus(event.id, 'Finalizado');

      // 📊 Penalizar não-presenças
      await TrustScoreService.penalizeNoShowsForEvent(event.id);

      // 🔍 Verificar auto-conclusão
      const shouldComplete = await this.shouldAutoCompleteEvent(event);
      if (shouldComplete) {
        await this.updateEventStatus(event.id, 'Concluído');
      }
    }
  }

  /**
   * 🎲 Detecta "falta 1 minuto" → Gera senha + Envia push
   */
  private static async detectAndHandlePasswordGeneration(
    event: Event,
    now: Date,
    startTime: Date
  ): Promise<void> {
    try {
      // Calcular: falta 1 minuto?
      const oneMinBeforeStart = new Date(startTime.getTime() - 60 * 1000);
      const twoMinBeforeStart = new Date(startTime.getTime() - 120 * 1000);

      // ✅ Se está na faixa de 1-2 minutos antes
      if (now >= twoMinBeforeStart && now < oneMinBeforeStart) {
        // Verificar se JÁ foi gerada senha
        if (event.event_entry_password) {
          console.log(`✅ Evento ${event.id} já tem senha. Pulando geração.`);
          return;
        }

        console.log(`🎲 Gerando senha para evento ${event.id}...`);

        // 1️⃣ Gerar e salvar senha
        const passwordResult = await EventSecurityService.generateAndSavePassword(event.id);
        if (!passwordResult.success) {
          console.error('❌ Erro ao gerar senha:', passwordResult.error);
          return;
        }

        const password = passwordResult.password!;

        // 2️⃣ Buscar anfitrião e participantes
        const { data: hostProfile, error: hostError } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', event.creator_id)
          .single();

        if (hostError) {
          console.error('❌ Erro ao buscar anfitrião:', hostError);
          return;
        }

        const { data: participations, error: partError } = await supabase
          .from('participations')
          .select('user_id')
          .eq('event_id', event.id)
          .eq('status', 'aprovado');

        if (partError) {
          console.error('❌ Erro ao buscar participantes:', partError);
          return;
        }

        // 3️⃣ Enviar push para ANFITRIÃO (com senha)
        console.log(`📨 Enviando SENHA para anfitrião...`);
        await PushNotificationService.sendPasswordToHost(
          event.creator_id,
          event.id,
          password,
          event.title
        );

        // 4️⃣ Enviar push para PARTICIPANTES (genérica)
        if (participations && participations.length > 0) {
          const participantIds = participations.map(p => p.user_id);
          console.log(`📨 Enviando notificação de INÍCIO para ${participantIds.length} participantes...`);
          await PushNotificationService.sendEventStartNotificationToParticipants(
            participantIds,
            event.id,
            event.title
          );
        }

        console.log(`✅ Notificações de entrada enviadas para evento ${event.id}`);
      }
    } catch (error) {
      console.error('❌ Erro ao processar geração de senha:', error);
    }
  }

  /**
   * 🔒 Detecta "falta 2 minutos para fim" → Bloqueia entrada
   */
  private static async detectAndHandleEntryLocking(
    event: Event,
    now: Date,
    endTime: Date
  ): Promise<void> {
    try {
      const twoMinBeforeEnd = new Date(endTime.getTime() - 2 * 60 * 1000);

      // ✅ Se chegou à faixa de bloqueio (falta 2 min ou menos)
      if (now >= twoMinBeforeEnd && !event.entry_locked) {
        console.log(`🔒 Bloqueando entrada do evento ${event.id}...`);

        const lockResult = await EventSecurityService.lockEventEntry(event.id);
        if (lockResult.success) {
          console.log(`✅ Entrada bloqueada para evento ${event.id}`);
        } else {
          console.error('❌ Erro ao bloquear entrada:', lockResult.error);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao processar bloqueio de entrada:', error);
    }
  }

  /**
   * 👇 Verifica auto-conclusão (7 dias OU todos avaliaram)
   */
  static async shouldAutoCompleteEvent(event: Event): Promise<boolean> {
    let retries = 2;

    while (retries > 0) {
      try {
        const endTime = new Date(event.end_time);
        const now = new Date();
        const daysSinceEnd = (now.getTime() - endTime.getTime()) / (1000 * 60 * 60 * 24);

        // 💡 Condição 1: Passou 7 dias? → Concluído
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
          console.log(`⏳ Evento ${event.id} sem participações aprovadas ainda`);
          return false;
        }

        const presentParticipants = (participations as unknown as Participation[]).filter(
          p => p.presenca_confirmada === true
        );

        if (presentParticipants.length === 0) {
          console.log(`⏳ Evento ${event.id} ninguém compareceu`);
          return false;
        }

        const allEvaluated = presentParticipants.every(p => p.avaliacao_feita === true);

        if (allEvaluated) {
          console.log(`✅ Evento ${event.id} auto-concluído - TODOS avaliaram TUDO`);
          return true;
        }

        const pendingCount = presentParticipants.filter(p => !p.avaliacao_feita).length;
        console.log(`⏳ Evento ${event.id} aguardando ${pendingCount} avaliação(ões)`);
        return false;
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

  /**
   * 🔄 Atualiza o status de um evento
   */
  static async updateEventStatus(eventId: number, newStatus: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) throw error;

      console.log(`✅ Evento ${eventId} status atualizado para: ${newStatus}`);
    } catch (error) {
      console.error(`❌ Erro ao atualizar status do evento ${eventId}:`, error);
    }
  }

  /**
   * 📊 Obtém estatísticas do evento
   */
  static async getEventStats(eventId: number): Promise<{
    success: boolean;
    data?: any;
    error?: any;
  }> {
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      const { data: participations, error: partError } = await supabase
        .from('participations')
        .select('status, presenca_confirmada, com_acesso, avaliacao_feita')
        .eq('event_id', eventId);

      if (partError) throw partError;

      const stats = {
        event,
        participants: {
          total: participations?.length || 0,
          approved: participations?.filter(p => p.status === 'aprovado').length || 0,
          present: participations?.filter(p => p.presenca_confirmada).length || 0,
          withAccess: participations?.filter(p => p.com_acesso).length || 0,
          evaluated: participations?.filter(p => p.avaliacao_feita).length || 0
        }
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error('❌ Erro ao obter stats do evento:', error);
      return { success: false, error };
    }
  }

  // ============================================
  // 🔄 MÉTODOS DE AUTO-UPDATE
  // ============================================

  /**
   * 🚀 Inicia atualização automática de eventos
   * @param intervalSeconds - Intervalo em segundos (padrão: 30)
   * @returns ID do intervalo para poder parar depois
   */
  static startAutoUpdate(intervalSeconds: number = 30): ReturnType<typeof setInterval> {
    // Se já existe um intervalo rodando, para ele primeiro
    if (this.updateInterval) {
      this.stopAutoUpdate();
    }

    console.log(`🔄 Iniciando auto-update de eventos a cada ${intervalSeconds}s`);

    // Executar imediatamente
    this.updateAllEventStatuses();

    // Depois executar a cada X segundos
    this.updateInterval = setInterval(() => {
      this.updateAllEventStatuses();
    }, intervalSeconds * 1000);

    return this.updateInterval;
  }

  /**
   * 🛑 Para a atualização automática
   */
  static stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('🛑 Auto-update de eventos parado');
    }
  }

  /**
   * 🔍 Verifica se auto-update está rodando
   */
  static isAutoUpdateRunning(): boolean {
    return this.updateInterval !== null;
  }
}

export default EventStatusService;