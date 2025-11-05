// src/services/EventSecurityService.ts
import { supabase } from '../lib/supabaseClient';

interface SavePasswordResult {
  success: boolean;
  password?: string;
  error?: string | Error;
}

interface EntryTimeValidation {
  allowed: boolean;
  reason?: string;
}

interface ValidatePasswordParams {
  eventId: number;
  participantId: string;
  password: string;
}

interface ValidatePasswordResult {
  success: boolean;
  message: string;
}

interface EntryStatusResult {
  success: boolean;
  data?: {
    password: string;
    isLocked: boolean;
    lockedAt: string | null;
    openedAt: string | null;
    totalWithAccess: number;
    totalParticipants: number;
    hostValidated?: boolean;
    hostValidatedAt?: string | null;
  };
  error?: string;
}

interface ValidateHostParams {
  eventId: number;
  hostId: string;
  partnerPassword: string;
}

interface PartnerPasswordResult {
  success: boolean;
  password?: string;
  error?: string;
}

class EventSecurityService {
  /**
   * Gera uma senha numérica de 4 dígitos
   */
  static generatePassword(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Salva uma senha no evento
   */
  static async savePasswordToEvent(
    eventId: number,
    password: string
  ): Promise<SavePasswordResult> {
    // Valida formato da senha
    if (!/^\d{4}$/.test(password)) {
      return {
        success: false,
        error: 'Senha deve ser exatamente 4 dígitos'
      };
    }

    try {
      const { error } = await supabase
        .from('events')
        .update({
          event_entry_password: password,
          entry_opened_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) {
        return {
          success: false,
          error
        };
      }

      return {
        success: true,
        password
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error
      };
    }
  }

  /**
   * Gera e salva uma senha automaticamente
   */
  static async generateAndSavePassword(
    eventId: number
  ): Promise<SavePasswordResult> {
    const password = this.generatePassword();
    return this.savePasswordToEvent(eventId, password);
  }

  /**
   * Verifica se o horário de entrada é válido
   */
  static async isEntryTimeValid(
    eventId: number
  ): Promise<EntryTimeValidation> {
    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('start_time, end_time, status')
        .eq('id', eventId)
        .single();

      if (error || !event) {
        return {
          allowed: false,
          reason: 'Evento não encontrado'
        };
      }

      // Verifica status do evento
      const validStatuses = ['Confirmado', 'Em Andamento'];
      if (!validStatuses.includes(event.status)) {
        return {
          allowed: false,
          reason: 'Evento não está disponível para entrada'
        };
      }

      const now = new Date();
      const startTime = new Date(event.start_time);
      const endTime = new Date(event.end_time);

      // Permite entrada 1 minuto antes do início
      const entryStartTime = new Date(startTime.getTime() - 60000);

      // Verifica se está dentro da janela de entrada
      if (now < entryStartTime) {
        return {
          allowed: false,
          reason: 'Entrada ainda não liberada'
        };
      }

      if (now > endTime) {
        return {
          allowed: false,
          reason: 'Entrada encerrada'
        };
      }

      return { allowed: true };
    } catch (error) {
      return {
        allowed: false,
        reason: 'Erro ao validar horário'
      };
    }
  }

  /**
   * ✅ Valida a senha de entrada do participante
   * FOCADO APENAS EM: Validar senha e registrar acesso
   */
  static async validateEntryPassword(
    params: ValidatePasswordParams
  ): Promise<ValidatePasswordResult> {
    const { eventId, participantId, password } = params;

    console.log(`🔓 Iniciando validação - EventID: ${eventId}, User: ${participantId}, Senha: ${password}`);

    // Normaliza a senha de entrada
    const normalizedInputPassword = String(password).trim();

    // Valida formato
    if (!/^\d{4}$/.test(normalizedInputPassword)) {
      return {
        success: false,
        message: 'Senha deve conter exatamente 4 dígitos'
      };
    }

    // Verifica timing
    const timingCheck = await this.isEntryTimeValid(eventId);
    if (!timingCheck.allowed) {
      return {
        success: false,
        message: timingCheck.reason || 'Entrada não permitida'
      };
    }

    // Busca evento e senha
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('event_entry_password, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      console.error('❌ Erro ao buscar evento:', eventError);
      return {
        success: false,
        message: 'Evento não encontrado'
      };
    }

    // Normaliza a senha armazenada
    const storedPassword = String(event.event_entry_password || '').trim();

    if (!storedPassword) {
      return {
        success: false,
        message: 'Senha do evento não configurada'
      };
    }

    console.log(`🔐 Comparando senhas: ${normalizedInputPassword} vs ${storedPassword}`);

    // Valida senha
    if (storedPassword !== normalizedInputPassword) {
      console.warn(`❌ Senha incorreta!`);
      return {
        success: false,
        message: 'Senha incorreta. Tente novamente.'
      };
    }

    console.log(`✅ Senha CORRETA! Registrando acesso...`);

    // ✅ UPDATE SIMPLIFICADO - sem .select()
    const { error: updateError } = await supabase
      .from('event_participants')
      .update({
        com_acesso: true,
        updated_at: new Date().toISOString()
      })
      .eq('event_id', eventId)
      .eq('user_id', participantId);

    if (updateError) {
      console.error('❌ ERRO NO UPDATE:', JSON.stringify(updateError, null, 2));
      console.error('Detalhes:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });
      return {
        success: false,
        message: `Erro ao registrar acesso: ${updateError.message || updateError.details || 'Verifique as permissões'}`
      };
    }

    console.log(`✅ Acesso registrado com sucesso!`);

    return {
      success: true,
      message: '✅ Acesso liberado! Bem-vindo ao evento.'
    };
  }

  /**
   * Verifica se o usuário já tem acesso
   */
  static async hasUserAccess(
    eventId: number,
    userId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select('com_acesso')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return false;
      }

      return data.com_acesso === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Bloqueia a entrada no evento
   */
  static async lockEventEntry(eventId: number): Promise<SavePasswordResult> {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          entry_locked: true,
          entry_locked_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (error) {
        return {
          success: false,
          error
        };
      }

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error
      };
    }
  }

  /**
   * Obtém o status de entrada do evento
   */
  static async getEntryStatus(eventId: number): Promise<EntryStatusResult> {
    try {
      // Busca dados do evento
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('event_entry_password, entry_locked, entry_locked_at, entry_opened_at')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return {
          success: false,
          error: 'Evento não encontrado'
        };
      }

      // Busca participantes
      const { data: participants, error: participantsError } = await supabase
        .from('event_participants')
        .select('com_acesso')
        .eq('event_id', eventId);

      if (participantsError) {
        return {
          success: false,
          error: 'Erro ao buscar participantes'
        };
      }

      const totalWithAccess = participants?.filter(p => p.com_acesso).length || 0;
      const totalParticipants = participants?.length || 0;

      return {
        success: true,
        data: {
          password: event.event_entry_password,
          isLocked: event.entry_locked,
          lockedAt: event.entry_locked_at,
          openedAt: event.entry_opened_at,
          totalWithAccess,
          totalParticipants
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Erro ao buscar status'
      };
    }
  }

  /**
   * 🏪 Busca a senha do restaurante (partner)
   */
  static async getPartnerPassword(partnerId: number): Promise<PartnerPasswordResult> {
    try {
      const { data: partner, error } = await supabase
        .from('partners')
        .select('partner_entry_password')
        .eq('id', partnerId)
        .single();

      if (error || !partner) {
        return {
          success: false,
          error: 'Restaurante não encontrado'
        };
      }

      if (!partner.partner_entry_password) {
        return {
          success: false,
          error: 'Restaurante ainda não configurou senha de entrada'
        };
      }

      return {
        success: true,
        password: partner.partner_entry_password
      };
    } catch (error) {
      return {
        success: false,
        error: 'Erro ao buscar senha do restaurante'
      };
    }
  }

  /**
   * ✅ Valida o anfitrião com a senha do restaurante
   * Usado em eventos PADRÃO - anfitrião precisa validar presença no restaurante
   */
  static async validateHostWithRestaurant(
    params: ValidateHostParams
  ): Promise<ValidatePasswordResult> {
    const { eventId, hostId, partnerPassword } = params;

    console.log(`🏪 Validando anfitrião - EventID: ${eventId}, Host: ${hostId}`);

    try {
      // 1. Buscar evento e verificar se é o criador
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('creator_id, partner_id, event_type, host_validated, status')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return {
          success: false,
          message: 'Evento não encontrado'
        };
      }

      // 2. Verificar se é o criador
      if (event.creator_id !== hostId) {
        return {
          success: false,
          message: 'Apenas o anfitrião pode validar com o restaurante'
        };
      }

      // 3. Verificar tipo de evento
      if (event.event_type !== 'padrao') {
        return {
          success: false,
          message: 'Este tipo de evento não requer validação do anfitrião'
        };
      }

      // 4. Verificar se tem restaurante
      if (!event.partner_id) {
        return {
          success: false,
          message: 'Evento sem restaurante associado'
        };
      }

      // 5. Verificar se já validou
      if (event.host_validated) {
        return {
          success: true,
          message: '✅ Você já validou sua presença anteriormente'
        };
      }

      // 6. Buscar senha do restaurante
      const partnerResult = await this.getPartnerPassword(event.partner_id);
      if (!partnerResult.success || !partnerResult.password) {
        return {
          success: false,
          message: partnerResult.error || 'Erro ao buscar senha do restaurante'
        };
      }

      // 7. Validar senha
      const normalizedInput = String(partnerPassword).trim();
      const normalizedStored = String(partnerResult.password).trim();

      if (normalizedInput !== normalizedStored) {
        console.warn(`❌ Senha do restaurante incorreta!`);
        return {
          success: false,
          message: 'Senha do restaurante incorreta. Peça a senha ao atendente.'
        };
      }

      console.log(`✅ Senha do restaurante CORRETA! Marcando host como validado...`);

      // 8. Marcar anfitrião como validado
      const { error: updateError } = await supabase
        .from('events')
        .update({
          host_validated: true,
          host_validated_at: new Date().toISOString()
        })
        .eq('id', eventId);

      if (updateError) {
        console.error('❌ ERRO AO MARCAR HOST VALIDADO:', updateError);
        return {
          success: false,
          message: 'Erro ao registrar validação'
        };
      }

      console.log(`✅ Anfitrião validado com sucesso!`);

      return {
        success: true,
        message: '✅ Presença validada com o restaurante! Agora compartilhe a senha com seus convidados.'
      };
    } catch (error) {
      console.error('❌ Erro na validação do anfitrião:', error);
      return {
        success: false,
        message: 'Erro ao validar presença com restaurante'
      };
    }
  }

  /**
   * 🔐 Determina qual tipo de validação o usuário precisa fazer
   */
  static async getUserValidationType(
    eventId: number,
    userId: string
  ): Promise<{
    type: 'host' | 'guest' | 'institutional' | 'none';
    message: string;
    requiresPassword: boolean;
  }> {
    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('creator_id, event_type, partner_id, host_validated')
        .eq('id', eventId)
        .single();

      if (error || !event) {
        return {
          type: 'none',
          message: 'Evento não encontrado',
          requiresPassword: false
        };
      }

      const isHost = event.creator_id === userId;

      // EVENTO PADRÃO
      if (event.event_type === 'padrao') {
        if (isHost && !event.host_validated) {
          return {
            type: 'host',
            message: 'Você precisa validar sua presença com o restaurante',
            requiresPassword: true
          };
        }
        if (!isHost) {
          return {
            type: 'guest',
            message: 'Digite a senha compartilhada pelo anfitrião',
            requiresPassword: true
          };
        }
        if (isHost && event.host_validated) {
          return {
            type: 'none',
            message: 'Você já validou sua presença',
            requiresPassword: false
          };
        }
      }

      // EVENTO INSTITUCIONAL
      if (event.event_type === 'institucional') {
        return {
          type: 'institutional',
          message: 'Digite a senha compartilhada pelo restaurante',
          requiresPassword: true
        };
      }

      // CRUSHER E PARTICULAR (funcionam normalmente)
      if (event.event_type === 'crusher' || event.event_type === 'particular') {
        return {
          type: 'guest',
          message: 'Digite a senha compartilhada pelo anfitrião',
          requiresPassword: true
        };
      }

      return {
        type: 'none',
        message: 'Este evento não requer validação de senha',
        requiresPassword: false
      };
    } catch (error) {
      console.error('Erro ao determinar tipo de validação:', error);
      return {
        type: 'none',
        message: 'Erro ao verificar tipo de validação',
        requiresPassword: false
      };
    }
  }
}

export default EventSecurityService;