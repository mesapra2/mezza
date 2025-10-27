// src/services/EventSecurityService.ts
import { supabase } from '../lib/supabaseClient';

interface GeneratePasswordResult {
  success: boolean;
  password?: string;
  error?: any;
}

interface ValidatePasswordResult {
  success: boolean;
  message?: string;
  shouldAutoStart?: boolean;
  error?: any;
}

interface PasswordValidationParams {
  eventId: number;
  participantId: string;
  password: string;
}

/**
 * 🔐 Serviço de Segurança de Eventos
 * Gerencia senhas de entrada 4 dígitos
 */
class EventSecurityService {
  /**
   * 🎲 Gera uma senha aleatória de 4 dígitos
   * @returns Senha no formato "1234"
   */
  static generatePassword(): string {
    const password = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(`🎲 Senha gerada: ${password}`);
    return password;
  }

  /**
   * 💾 Salva a senha no evento
   * @param eventId - ID do evento
   * @param password - Senha de 4 dígitos
   */
  static async savePasswordToEvent(eventId: number, password: string): Promise<GeneratePasswordResult> {
    try {
      if (!password || password.length !== 4 || !/^\d+$/.test(password)) {
        return {
          success: false,
          error: 'Senha deve ser exatamente 4 dígitos'
        };
      }

      const { error } = await supabase
        .from('events')
        .update({
          event_entry_password: password,
          entry_opened_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) throw error;

      console.log(`✅ Senha ${password} salva no evento ${eventId}`);
      return { success: true, password };
    } catch (error) {
      console.error('❌ Erro ao salvar senha:', error);
      return { success: false, error };
    }
  }

  /**
   * 🔑 Gera e salva uma nova senha de entrada
   * @param eventId - ID do evento
   */
  static async generateAndSavePassword(eventId: number): Promise<GeneratePasswordResult> {
    try {
      const password = this.generatePassword();
      return this.savePasswordToEvent(eventId, password);
    } catch (error) {
      console.error('❌ Erro ao gerar e salvar senha:', error);
      return { success: false, error };
    }
  }

  /**
   * 🕐 Verifica se está no horário permitido para entrada
   * Regra: 1 minuto antes até 2 minutos antes do fim
   * @param eventId - ID do evento
   * @returns { allowed: boolean, reason?: string }
   */
  static async isEntryTimeValid(eventId: number): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('start_time, end_time, status')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      if (!event) {
        return { allowed: false, reason: 'Evento não encontrado' };
      }

      const now = new Date();
      const startTime = new Date(event.start_time);
      const endTime = new Date(event.end_time);

      // 🕐 Verificar: falta 1 minuto para começar?
      const oneMinBeforeStart = new Date(startTime.getTime() - 60 * 1000);
      if (now < oneMinBeforeStart) {
        return {
          allowed: false,
          reason: `Entrada disponível a partir de ${oneMinBeforeStart.toLocaleTimeString()}`
        };
      }

      // 🕐 Verificar: falta 2 minutos para terminar?
      const twoMinBeforeEnd = new Date(endTime.getTime() - 2 * 60 * 1000);
      if (now >= twoMinBeforeEnd) {
        return {
          allowed: false,
          reason: 'Entrada encerrada (faltam 2 minutos para o fim do evento)'
        };
      }

      // 🕐 Verificar: evento já começou ou ainda está confirmado?
      if (event.status !== 'Confirmado' && event.status !== 'Em Andamento') {
        return {
          allowed: false,
          reason: `Evento não está disponível para entrada (status: ${event.status})`
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('❌ Erro ao validar timing de entrada:', error);
      return { allowed: false, reason: 'Erro ao validar timing' };
    }
  }

  /**
   * ✅ Valida a senha digitada
   * @param params - { eventId, participantId, password }
   */
  static async validateEntryPassword(params: PasswordValidationParams): Promise<ValidatePasswordResult> {
    try {
      const { eventId, participantId, password } = params;

      // 1️⃣ Verificar timing
      const timingCheck = await this.isEntryTimeValid(eventId);
      if (!timingCheck.allowed) {
        return {
          success: false,
          message: timingCheck.reason
        };
      }

      // 2️⃣ Buscar evento e senha correta
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('event_entry_password, status')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      if (!event) {
        return { success: false, message: 'Evento não encontrado' };
      }

      // 3️⃣ Validar senha
      if (password !== event.event_entry_password) {
        console.warn(`❌ Participante ${participantId} digitou senha errada no evento ${eventId}`);
        return {
          success: false,
          message: 'Senha incorreta. Tente novamente.'
        };
      }

      // 4️⃣ Senha correta! Registrar entrada
      console.log(`✅ Participante ${participantId} digitou a senha correta do evento ${eventId}`);

      const { error: updateError } = await supabase
        .from('participations')
        .update({
          com_acesso: true,
          entry_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('event_id', eventId)
        .eq('user_id', participantId);

      if (updateError) throw updateError;

      console.log(`✅ Participação atualizada: com_acesso = true para ${participantId}`);

      // 5️⃣ Verificar se deve auto-iniciar evento
      // (Se é o primeiro a entrar e evento está em CONFIRMADO)
      const shouldAutoStart = event.status === 'Confirmado';

      return {
        success: true,
        message: '✅ Acesso liberado! Bem-vindo ao evento.',
        shouldAutoStart
      };
    } catch (error) {
      console.error('❌ Erro ao validar senha:', error);
      return { success: false, message: 'Erro ao validar entrada', error };
    }
  }

  /**
   * 🔍 Verifica se um participante já tem acesso
   * @param eventId - ID do evento
   * @param participantId - ID do participante
   */
  static async hasUserAccess(eventId: number, participantId: string): Promise<boolean> {
    try {
      const { data: participation, error } = await supabase
        .from('participations')
        .select('com_acesso')
        .eq('event_id', eventId)
        .eq('user_id', participantId)
        .single();

      if (error && error.code === 'PGRST116') return false; // Not found
      if (error) throw error;

      return participation?.com_acesso === true;
    } catch (error) {
      console.error('❌ Erro ao verificar acesso:', error);
      return false;
    }
  }

  /**
   * 🔒 Bloqueia entrada de novos participantes (2 min antes do fim)
   * @param eventId - ID do evento
   */
  static async lockEventEntry(eventId: number): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          entry_locked: true,
          entry_locked_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) throw error;

      console.log(`🔒 Entrada bloqueada para evento ${eventId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao bloquear entrada:', error);
      return { success: false, error };
    }
  }

  /**
   * 📊 Obtém status de entrada do evento
   */
  static async getEntryStatus(eventId: number): Promise<{
    success: boolean;
    data?: {
      password: string;
      isLocked: boolean;
      lockedAt?: string;
      openedAt?: string;
      totalWithAccess: number;
      totalParticipants: number;
    };
    error?: any;
  }> {
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('event_entry_password, entry_locked, entry_locked_at, entry_opened_at')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      const { data: participations, error: partError } = await supabase
        .from('participations')
        .select('com_acesso')
        .eq('event_id', eventId)
        .eq('status', 'aprovado');

      if (partError) throw partError;

      const totalWithAccess = (participations || []).filter(p => p.com_acesso).length;
      const totalParticipants = participations?.length || 0;

      return {
        success: true,
        data: {
          password: event?.event_entry_password || '****',
          isLocked: event?.entry_locked || false,
          lockedAt: event?.entry_locked_at,
          openedAt: event?.entry_opened_at,
          totalWithAccess,
          totalParticipants
        }
      };
    } catch (error) {
      console.error('❌ Erro ao obter status de entrada:', error);
      return { success: false, error };
    }
  }
}

export default EventSecurityService;