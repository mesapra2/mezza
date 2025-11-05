// src/services/EventStatusService.ts
// ✅ VERSÃO CORRIGIDA - Geração de senha 1 minuto antes + FIX 406
// @ts-nocheck
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
   * 🎯 Atualiza status de TODOS os eventos
   * ✅ OTIMIZADO: Select específico + limit em mobile
   */
  static async updateAllEventStatuses(): Promise<void> {
    try {
      // ✅ FIX: Limit menor em mobile para não sobrecarregar
      const limit = this.isMobile() ? 50 : 100;

      const { data: events, error } = await supabase
        .from('events')
        .select('id, status, start_time, end_time, creator_id, title, event_entry_password, entry_locked') // ✅ FIX: Campos específicos
        .neq('status', 'Cancelado')
        .neq('status', 'Concluído')
        .limit(limit); // ✅ FIX: Limit

      if (error) {
        console.error('❌ Erro ao buscar eventos:', error);
        return;
      }

      if (!events || events.length === 0) {
        console.log('✅ Nenhum evento para atualizar');
        return;
      }

      console.log(`🔄 Atualizando ${events.length} eventos (${this.isMobile() ? 'mobile' : 'desktop'})...`);

      // ✅ FIX: Processar em batch em mobile
      if (this.isMobile()) {
        // Processar em chunks de 10 para não travar
        for (let i = 0; i < events.length; i += 10) {
          const chunk = events.slice(i, i + 10);
          await Promise.all(
            chunk.map(event =>
              this.calculateEventStatus(event as Event).catch(err =>
                console.error(`❌ Erro ao processar evento ${event.id}:`, err)
              )
            )
          );
        }
      } else {
        // Desktop: processar sequencialmente (comportamento original)
        for (const event of events) {
          try {
            await this.calculateEventStatus(event as Event);
          } catch (eventError) {
            console.error(`❌ Erro ao processar evento ${event.id}:`, eventError);
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar todos os eventos:', error);
    }
  }

  /**
   * 🧠 Lógica de status de UM evento
   */
  private static async calculateEventStatus(event: Event): Promise<void> {
    const now = new Date();
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
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

      // 🔍 Verificar auto-conclusão
      const shouldComplete = await this.shouldAutoCompleteEvent(event);
      if (shouldComplete) {
        await this.updateEventStatus(event.id, 'Concluído');
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

      // 2. Está dentro da janela de 1 minuto
      const oneMinuteBeforeStart = new Date(startTime.getTime() - 60 * 1000);

      // 3. Senha ainda não foi gerada
      const shouldGeneratePassword = now >= oneMinuteBeforeStart && now < startTime;

      if (!shouldGeneratePassword) {
        // Log apenas se estiver próximo (nos últimos 5 minutos)
        if (minutesUntilEvent <= 5 && minutesUntilEvent > 0) {
          console.log(
            `⏳ Evento ${event.id}: faltam ${minutesUntilEvent} minutos (senha será gerada em 1 min)`
          );
        }
        return;
      }

      console.log(`🎲 Gerando senha para evento ${event.id} (faltam ${minutesUntilEvent} minutos)...`);

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
        const endTime = new Date(event.end_time);
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
        .select('*')
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
   * 🚀 Inicia atualização automática de eventos
   * @param intervalSeconds - Intervalo em segundos (padrão: adaptativo - 60s mobile, 30s desktop)
   * ✅ OTIMIZADO: Polling adaptativo baseado em device
   */
  static startAutoUpdate(intervalSeconds?: number): ReturnType<typeof setInterval> {
    if (this.updateInterval) {
      this.stopAutoUpdate();
    }

    // ✅ FIX: Interval adaptativo - 60s mobile, 30s desktop
    const defaultInterval = this.isMobile() ? 60 : 30;
    const actualInterval = intervalSeconds || defaultInterval;

    console.log(`🔄 Iniciando auto-update de eventos a cada ${actualInterval}s (${this.isMobile() ? 'mobile' : 'desktop'})`);

    // Executar imediatamente
    this.updateAllEventStatuses();

    // Depois executar a cada X segundos
    this.updateInterval = setInterval(() => {
      this.updateAllEventStatuses();
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
}

export default EventStatusService;