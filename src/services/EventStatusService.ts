// src/services/EventStatusService.ts
// ✅ VERSÃO CORRIGIDA - Geração de senha 1 minuto antes + FIX 406
// @ts-nocheck
import { supabase } from '../lib/supabaseClient';
import EventSecurityService from './EventSecurityService';
import PushNotificationService from './PushNotificationService';
import TrustScoreService from './TrustScoreService';
import NotificationService from './NotificationService';
import { smartLog } from '../utils/replaceConsoleLog.js';

interface Event {
  id: number;
  status: string;
  start_time: string;
  end_time?: string;
  creator_id: string;
  title: string;
  event_entry_password?: string;
  entry_locked?: boolean;
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
  private static updateInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * 🔍 Detecta se está em mobile
   */
  private static isMobile(): boolean {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      window.navigator.userAgent
    );
  }

  /**
   * 🎯 Atualiza status de eventos com throttling extremo
   * ✅ SUPER OTIMIZADO: Limit muito baixo + delay entre requests
   */
  static async updateAllEventStatuses(): Promise<void> {
    try {
      // ✅ FIX: Limits MUITO menores para evitar sobrecarga
      const limit = this.isMobile() ? 15 : 25;

      // ✅ FIX: Delay antes da requisição para spread de carga
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));

      // ✅ FIX: Retry logic melhorado com backoff exponencial
      let events = null;
      let error = null;
      let retries = 2; // Menos tentativas
      let backoffMs = 1000;
      
      while (retries > 0) {
        try {
          const response = await supabase
            .from('events')
            .select('id, status, start_time, end_time, creator_id, title, event_entry_password, entry_locked')
            .neq('status', 'Cancelado')
            .neq('status', 'Concluído')
            .limit(limit);
          
          events = response.data;
          error = response.error;
          break; // Sucesso - sair do loop
        } catch (fetchError) {
          retries--;
          error = fetchError;
          
          if (retries > 0) {
            console.log(`⚠️ Conexão falhou, aguardando ${backoffMs}ms antes de tentar novamente...`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            backoffMs *= 2; // Backoff exponencial
          }
        }
      }

      if (error) {
        // Log silencioso para não spam console
        if (error.message?.includes('Failed to fetch')) {
          console.warn('⚠️ Conexão temporariamente indisponível');
        } else {
          smartLog.error('Erro ao buscar eventos:', error);
        }
        return;
      }

      if (!events || events.length === 0) {
        smartLog.debug('Nenhum evento ativo para atualizar');
        return;
      }

      smartLog.service('EventStatusService', 'processing', `${events.length} eventos (${this.isMobile() ? 'mobile' : 'desktop'})`);

      // ✅ FIX: Processar com delays para não sobrecarregar
      const chunkSize = this.isMobile() ? 5 : 8;
      for (let i = 0; i < events.length; i += chunkSize) {
        const chunk = events.slice(i, i + chunkSize);
        
        // Processar chunk
        await Promise.all(
          chunk.map(async (event, index) => {
            try {
              // Delay pequeno entre requests dentro do chunk
              await new Promise(resolve => setTimeout(resolve, index * 100));
              await this.calculateEventStatus(event as Event);
            } catch (err) {
              smartLog.error(`Erro no evento ${event.id}:`, err);
            }
          })
        );
        
        // Delay entre chunks
        if (i + chunkSize < events.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error('❌ Erro geral no update de eventos:', error);
    }
  }

  /**
   * 🧠 Lógica de status de UM evento
   */
  private static async calculateEventStatus(event: Event): Promise<void> {
    const now = new Date();
    
    // ✅ FIX: Usar date como fallback se start_time/end_time não existirem
    let startTime: Date;
    let endTime: Date;
    
    if (event.start_time && event.end_time) {
      startTime = new Date(event.start_time);
      endTime = new Date(event.end_time);
    } else if (event.date) {
      // Usar date como base e assumir duração padrão de 3 horas
      startTime = new Date(event.date);
      endTime = new Date(startTime.getTime() + (3 * 60 * 60 * 1000)); // +3 horas
    } else {
      console.warn(`⚠️ Evento ${event.id} sem dados de data válidos`);
      return;
    }
    
    const currentStatus = event.status;

    // ============================================
    // 🎯 FASE 1: Evento futuro
    // ============================================
    if (now < startTime) {
      // checa se falta 1 min → gera senha → envia push
      await this.detectAndHandlePasswordGeneration(event, now, startTime);

      // checa se precisa bloquear entrada próximo do fim
      await this.detectAndHandleEntryLocking(event, now, endTime);
      return;
    }

    // ============================================
    // 🎯 FASE 2: Evento prestes a acabar
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
      console.log(`ℹ️ Evento ${event.id} terminou`);
      await this.updateEventStatus(event.id, 'Finalizado');

      // 📊 Penalizar não-presenças
      await TrustScoreService.penalizeNoShowsForEvent(event.id);

      // ✅ NOVO: Notificar participantes para avaliar
      await NotificationService.notifyEvaluationRequest(event.id, event.title);

      // 🔍 Verificar auto-conclusão
      const shouldComplete = await this.shouldAutoCompleteEvent(event);
      if (shouldComplete) {
        await this.updateEventStatus(event.id, 'Concluído');
      } else {
        // ⏰ Agendar lembrete para 24h depois
        this.scheduleEvaluationReminder(event.id, event.title);
        
        // 🏁 Agendar aviso de conclusão automática para 5 dias
        this.scheduleAutoCompletionWarning(event.id, event.title);
      }
    }
  }

  /**
   * 🎲 Detecta "falta 1 minuto" → Gera senha + Envia push
   * ✅ CORRIGIDO: Agora gera quando falta EXATAMENTE 1 minuto OU MENOS (se ainda não foi gerada)
   */
  private static async detectAndHandlePasswordGeneration(
    event: Event,
    now: Date,
    startTime: Date
  ): Promise<void> {
    try {
      // já tem senha? não faz nada
      if (event.event_entry_password && event.event_entry_password.length > 0) {
        return;
      }

      // falta quantos minutos?
      const diffMs = startTime.getTime() - now.getTime();
      const minutesUntilEvent = Math.floor(diffMs / (1000 * 60));

      // só processa quem está até 5 min do início (pra não ficar logando demais)
      if (minutesUntilEvent > 5) return;

      // 1. Evento ainda não começou
      if (now >= startTime) {
        return;
      }

      // 2. ✅ FIX CRÍTICO: Expandir janela para não "pular" devido ao intervalo de auto-update
      const oneMinuteBeforeStart = new Date(startTime.getTime() - 60 * 1000);
      const threeMinutesBeforeStart = new Date(startTime.getTime() - 3 * 60 * 1000);

      // 3. ✅ CORRIGIDO: Gerar senha se falta ATÉ 2 minutos (janela menor, mas mais precisa)
      // Com auto-update a cada 1min, não devemos perder a janela
      const shouldGeneratePassword = now >= threeMinutesBeforeStart && now < startTime && minutesUntilEvent <= 2;

      if (!shouldGeneratePassword) {
        // Log apenas se estiver próximo (nos últimos 5 minutos)
        if (minutesUntilEvent <= 5 && minutesUntilEvent > 3) {
          console.log(
            `⏳ Evento ${event.id}: faltam ${minutesUntilEvent} minutos (senha será gerada em até 3 min)`
          );
        }
        return;
      }

      console.log(`🎲 Gerando senha para evento ${event.id} (faltam ${minutesUntilEvent} minutos - janela de 3min ativa)...`);

      // 1️⃣ Gerar e salvar senha
      const passwordResult = await EventSecurityService.generateAndSavePassword(event.id);

      if (!passwordResult.success) {
        console.error('❌ Erro ao gerar senha:', passwordResult.error);
        return;
      }

      const password = passwordResult.password!;
      console.log(`✅ Senha gerada: ${password}`);

      // 2️⃣ Buscar anfitrião
      const { data: hostProfile, error: hostError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', event.creator_id)
        .single();

      if (hostError) {
        console.error('❌ Erro ao buscar anfitrião:', hostError);
      }

      // 3️⃣ Buscar participantes aprovados
      const { data: participations, error: partError } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', event.id)
        .eq('status', 'aprovado');

      if (partError) {
        console.error('❌ Erro ao buscar participantes:', partError);
        return;
      }

      // 4️⃣ Enviar push para ANFITRIÃO (com senha)
      console.log(`📨 Enviando SENHA para anfitrião ${event.creator_id}...`);
      const hostResult = await PushNotificationService.sendPasswordToHost(
        event.creator_id,
        event.id,
        password,
        event.title
      );

      if (hostResult.success) {
        console.log(`✅ Senha enviada para anfitrião`);
      } else {
        console.error('❌ Erro ao enviar senha para anfitrião:', hostResult.error);
      }

      // 5️⃣ Enviar push para PARTICIPANTES (genérica, sem senha)
      if (participations && participations.length > 0) {
        const participantIds = participations.map(p => p.user_id);
        console.log(`📨 Enviando notificação de INÍCIO para ${participantIds.length} participantes...`);
        
        const participantsResult = await PushNotificationService.sendEventStartNotificationToParticipants(
          participantIds,
          event.id,
          event.title
        );

        if (participantsResult.success) {
          console.log(`✅ Notificações enviadas para participantes`);
        } else {
          console.error('❌ Erro ao enviar para participantes:', participantsResult.error);
        }
      }

      console.log(`✅ Processo de geração de senha completo para evento ${event.id}`);
    } catch (error) {
      console.error('❌ Erro ao processar geração de senha:', error);
    }
  }

  /**
   * 🔒 Bloqueia entrada 1 minuto antes do fim
   */
  private static async detectAndHandleEntryLocking(
    event: Event,
    now: Date,
    endTime: Date
  ): Promise<void> {
    try {
      // se já está bloqueado, não faz nada
      if (event.entry_locked) return;

      const oneMinuteBeforeEnd = new Date(endTime.getTime() - 60 * 1000);
      const timeUntilEnd = endTime.getTime() - now.getTime();
      const minutesUntilEnd = Math.floor(timeUntilEnd / 1000 / 60);

      // ✅ Bloquear quando falta 1 minuto ou menos para terminar
      if (now >= oneMinuteBeforeEnd && now < endTime) {
        console.log(`🔒 Bloqueando entrada do evento ${event.id} (faltam ${minutesUntilEnd} min para terminar)...`);

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
   * 💡 Verifica auto-conclusão (7 dias OU todos avaliaram)
   */
  static async shouldAutoCompleteEvent(event: Event): Promise<boolean> {
    let retries = 2;

    while (retries > 0) {
      try {
        const endTime = event.end_time ? new Date(event.end_time) : (event.date ? new Date(new Date(event.date).getTime() + (3 * 60 * 60 * 1000)) : new Date());
        const now = new Date();
        const daysSinceEnd = (now.getTime() - endTime.getTime()) / (1000 * 60 * 60 * 24);

        // 💡 Condição 1: Passou 7 dias? → Concluído
        if (daysSinceEnd >= 7) {
          console.log(`✅ Evento ${event.id} auto-concluído após 7 dias`);
          return true;
        }

        // 💡 Condição 2: Todos que compareceram avaliaram?
        const { data: participations, error: participationsError } = await supabase
          .from('event_participants')
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
          console.log(`✅ Evento ${event.id} auto-concluído - TODOS avaliaram`);
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
          updated_at: new Date().toISOString(),
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
   * ✅ CORRIGIDO: Removido .single() que causava erro 406
   */
  static async getEventStats(eventId: number): Promise<{
    success: boolean;
    data?: any;
    error?: any;
  }> {
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, title, status, start_time, end_time, creator_id, event_type')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      // ✅ FIX: Usar .eq('event_id', ...) ao invés de .eq('id', ...)
      const { data: participations, error: partError } = await supabase
        .from('event_participants')
        .select(`
          id,
          user_id,
          event_id,
          status,
          presenca_confirmada,
          com_acesso,
          avaliacao_feita,
          profiles!event_participants_user_id_fkey (
            id,
            username,
            avatar_url,
            full_name
          )
        `)
        .eq('event_id', eventId); // ✅ Buscar por event_id, não por id

      if (partError) throw partError;

      return {
        success: true,
        data: {
          event,
          participants: participations || [],
        },
      };
    } catch (error) {
      console.error('Erro ao obter stats do evento:', error);
      return { success: false, error };
    }
  }

  // ============================================
  // 🔄 MÉTODOS DE AUTO-UPDATE
  // ============================================

  /**
   * 🚀 Inicia atualização automática de eventos com throttling
   * ✅ SUPER OTIMIZADO: Reduzida frequência para evitar ERR_CONNECTION_CLOSED
   */
  static startAutoUpdate(intervalSeconds?: number): ReturnType<typeof setInterval> {
    if (this.updateInterval) {
      this.stopAutoUpdate();
    }

    // ✅ FIX: Intervals ajustados para não perder geração de senha (1min antes)
    const defaultInterval = this.isMobile() ? 90 : 60; // 1.5min mobile, 1min desktop
    const actualInterval = intervalSeconds || defaultInterval;

    console.log(`🔄 Iniciando auto-update OTIMIZADO a cada ${actualInterval}s (${this.isMobile() ? 'mobile' : 'desktop'})`);

    // Executar após 10 segundos (não imediatamente)
    setTimeout(() => {
      this.updateAllEventStatuses();
    }, 10000);

    // Depois executar a cada X segundos
    let cycleCount = 0;
    this.updateInterval = setInterval(() => {
      cycleCount++;
      
      // ✅ CORREÇÃO CRÍTICA: Executar sempre para não perder geração de senha
      this.updateAllEventStatuses();
      
      // Verificar notificações perdidas apenas a cada 10 ciclos
      if (cycleCount % 10 === 0) {
        this.checkAndSendMissingNotifications();
      }
    }, actualInterval * 1000);

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

  /**
   * ⏰ NOVO: Agenda lembrete de avaliação para 24h depois
   */
  private static scheduleEvaluationReminder(eventId: number, eventTitle: string): void {
    setTimeout(async () => {
      try {
        console.log(`⏰ Executando lembrete de avaliação agendado para evento ${eventId}`);
        await NotificationService.sendEvaluationReminder(eventId, eventTitle);
      } catch (error) {
        console.error('❌ Erro no lembrete agendado:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 horas
  }

  /**
   * 🏁 NOVO: Agenda aviso de conclusão automática para 5 dias
   */
  private static scheduleAutoCompletionWarning(eventId: number, eventTitle: string): void {
    setTimeout(async () => {
      try {
        console.log(`🏁 Executando aviso de conclusão automática para evento ${eventId}`);
        await NotificationService.notifyAutoCompletionWarning(eventId, eventTitle, 2);
      } catch (error) {
        console.error('❌ Erro no aviso de conclusão automática:', error);
      }
    }, 5 * 24 * 60 * 60 * 1000); // 5 dias
  }

  /**
   * 📊 NOVO: Verifica eventos antigos que precisam de notificações
   */
  static async checkAndSendMissingNotifications(): Promise<void> {
    try {
      console.log('🔍 Verificando eventos que precisam de notificações de avaliação...');

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

      // Buscar eventos finalizados há 24h que não têm notificação de lembrete
      const { data: events24h, error: error24h } = await supabase
        .from('events')
        .select('id, title, start_time, end_time')
        .eq('status', 'Finalizado')
        .or(`end_time.lt.${oneDayAgo.toISOString()},start_time.lt.${oneDayAgo.toISOString()}`)
        .or(`end_time.gt.${fiveDaysAgo.toISOString()},start_time.gt.${fiveDaysAgo.toISOString()}`);

      if (!error24h && events24h && events24h.length > 0) {
        for (const event of events24h) {
          // ✅ FIX: Verificar se já enviou lembrete (corrigindo erro 400)
          const { data: existingReminder, error: reminderError } = await supabase
            .from('notifications')
            .select('id')
            .eq('event_id', event.id)
            .in('notification_type', ['participation_request', 'event_application'])
            .limit(1);

          if (reminderError) {
            console.warn(`⚠️ Erro ao verificar lembrete existente para evento ${event.id}:`, reminderError);
            continue; // Pula este evento e continua com o próximo
          }

          if (!existingReminder || existingReminder.length === 0) {
            console.log(`⏰ Enviando lembrete tardio para evento ${event.id}`);
            await NotificationService.sendEvaluationReminder(event.id, event.title);
          }
        }
      }

      // Buscar eventos finalizados há 5 dias que precisam de aviso de conclusão
      const { data: events5d, error: error5d } = await supabase
        .from('events')
        .select('id, title, start_time, end_time')
        .eq('status', 'Finalizado')
        .or(`end_time.lt.${fiveDaysAgo.toISOString()},start_time.lt.${fiveDaysAgo.toISOString()}`);

      if (!error5d && events5d && events5d.length > 0) {
        for (const event of events5d) {
          // ✅ FIX: Verificar se já enviou aviso (corrigindo erro 400)
          const { data: existingWarning, error: warningError } = await supabase
            .from('notifications')
            .select('id')
            .eq('event_id', event.id)
            .in('notification_type', ['Candidatura Aprovada'])
            .limit(1);

          if (warningError) {
            console.warn(`⚠️ Erro ao verificar notificação existente para evento ${event.id}:`, warningError);
            continue; // Pula este evento e continua com o próximo
          }

          if (!existingWarning || existingWarning.length === 0) {
            const endTime = event.end_time ? new Date(event.end_time) : (event.start_time ? new Date(new Date(event.start_time).getTime() + (3 * 60 * 60 * 1000)) : new Date());
            const now = new Date();
            const daysSinceEnd = Math.floor((now.getTime() - endTime.getTime()) / (1000 * 60 * 60 * 24));
            const daysLeft = 7 - daysSinceEnd;

            if (daysLeft > 0) {
              console.log(`🏁 Enviando aviso tardio para evento ${event.id}`);
              await NotificationService.notifyAutoCompletionWarning(event.id, event.title, daysLeft);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao verificar notificações perdidas:', error);
    }
  }
}

export default EventStatusService;