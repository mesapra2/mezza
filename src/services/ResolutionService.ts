// src/services/ResolutionService.ts
import { supabase } from '../lib/supabaseClient';

export interface ResolutionTicket {
  id?: number;
  type: 'user_disapproval' | 'behavior_issue' | 'identity_concern' | 'accidental_approval';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'resolved' | 'escalated';
  event_id: number;
  reporter_id: string;
  affected_user_id: string;
  title: string;
  description: string;
  evidence?: any; // Chat logs, screenshots, etc.
  admin_notes?: string;
  resolution?: string;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string;
  resolved_by?: string;
}

export interface UserDisapprovalReason {
  code: 'behavior_chat' | 'identity_mismatch' | 'accidental_approval';
  label: string;
  description: string;
  requiresDetailed: boolean;
  timeLimit?: number; // em minutos
}

/**
 * Serviço para gerenciar o sistema de resolutions e conflitos
 */
class ResolutionService {

  /**
   * Motivos disponíveis para desaprovação
   */
  static readonly DISAPPROVAL_REASONS: UserDisapprovalReason[] = [
    {
      code: 'behavior_chat',
      label: 'Comportamento inadequado no chat',
      description: 'Usuário demonstrou comportamento inadequado nas conversas do evento',
      requiresDetailed: false // Sistema buscará automaticamente o chat
    },
    {
      code: 'identity_mismatch', 
      label: 'Parece ser outra pessoa',
      description: 'Perfil ou comportamento não condiz com a identidade apresentada',
      requiresDetailed: true // Requer descrição detalhada (100+ caracteres)
    },
    {
      code: 'accidental_approval',
      label: 'Aprovei sem querer',
      description: 'Aprovação foi feita acidentalmente pelo anfitrião',
      requiresDetailed: false,
      timeLimit: 30 // Só válido por 30 minutos
    }
  ];

  /**
   * Criar ticket no sistema de resolutions
   */
  static async createResolutionTicket(ticket: Omit<ResolutionTicket, 'id' | 'created_at' | 'updated_at'>): Promise<{
    success: boolean;
    ticketId?: number;
    message: string;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('resolution_tickets')
        .insert([{
          ...ticket,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (error) throw error;

      console.log('✅ Ticket de resolution criado:', data.id);

      return {
        success: true,
        ticketId: data.id,
        message: 'Ticket enviado para análise administrativa'
      };

    } catch (error) {
      console.error('❌ Erro ao criar ticket:', error);
      return {
        success: false,
        message: 'Erro interno ao criar ticket',
        error: error.message
      };
    }
  }

  /**
   * Verificar se aprovação ainda está dentro do prazo para cancelamento acidental
   */
  static async isWithinAccidentalWindow(eventId: number, userId: string): Promise<{
    isValid: boolean;
    approvalTime?: Date;
    minutesElapsed?: number;
  }> {
    try {
      const { data: participation, error } = await supabase
        .from('event_participants')
        .select('updated_at, created_at')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('status', 'aprovado')
        .single();

      if (error || !participation) {
        return { isValid: false };
      }

      // Usar updated_at se disponível, senão created_at
      const approvalTime = new Date(participation.updated_at || participation.created_at);
      const now = new Date();
      const minutesElapsed = Math.floor((now.getTime() - approvalTime.getTime()) / (1000 * 60));

      return {
        isValid: minutesElapsed <= 30,
        approvalTime,
        minutesElapsed
      };

    } catch (error) {
      console.error('Erro ao verificar prazo:', error);
      return { isValid: false };
    }
  }

  /**
   * Buscar conversas do chat do evento para evidência
   */
  static async getChatEvidence(eventId: number, userId: string): Promise<{
    hasMessages: boolean;
    messages?: any[];
    chatSummary?: string;
  }> {
    try {
      // Buscar mensagens do usuário no chat do evento
      const { data: messages, error } = await supabase
        .from('event_chat_messages') // Assumindo que existe essa tabela
        .select(`
          id, message, created_at, user_id,
          user:profiles(id, username, full_name)
        `)
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) {
        console.warn('Erro ao buscar mensagens do chat:', error);
        return { hasMessages: false };
      }

      if (!messages || messages.length === 0) {
        return { hasMessages: false };
      }

      // Criar resumo das mensagens
      const chatSummary = `Chat do usuário no evento (${messages.length} mensagens):\n\n` +
        messages.map((msg, index) => 
          `${index + 1}. [${new Date(msg.created_at).toLocaleString('pt-BR')}] ${msg.message}`
        ).join('\n\n');

      return {
        hasMessages: true,
        messages,
        chatSummary
      };

    } catch (error) {
      console.error('Erro ao buscar evidências do chat:', error);
      return { hasMessages: false };
    }
  }

  /**
   * Desaprovar usuário com motivo específico
   */
  static async disapproveUser(params: {
    eventId: number;
    userId: string;
    hostId: string;
    reason: 'behavior_chat' | 'identity_mismatch' | 'accidental_approval';
    detailedDescription?: string;
  }): Promise<{
    success: boolean;
    message: string;
    ticketId?: number;
    error?: string;
  }> {
    try {
      const { eventId, userId, hostId, reason, detailedDescription } = params;

      // 1. Validar motivo
      const reasonConfig = this.DISAPPROVAL_REASONS.find(r => r.code === reason);
      if (!reasonConfig) {
        return {
          success: false,
          message: 'Motivo de desaprovação inválido'
        };
      }

      // 2. Verificar prazo para aprovação acidental
      if (reason === 'accidental_approval') {
        const timeCheck = await this.isWithinAccidentalWindow(eventId, userId);
        if (!timeCheck.isValid) {
          return {
            success: false,
            message: `Prazo de 30 minutos expirado. ${timeCheck.minutesElapsed || 0} minutos desde a aprovação.`
          };
        }
      }

      // 3. Validar descrição detalhada se necessária
      if (reasonConfig.requiresDetailed) {
        if (!detailedDescription || detailedDescription.length < 100) {
          return {
            success: false,
            message: 'Descrição detalhada com pelo menos 100 caracteres é obrigatória para este motivo.'
          };
        }
      }

      // 4. Buscar dados do evento e usuário
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, title, creator_id')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return {
          success: false,
          message: 'Evento não encontrado'
        };
      }

      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return {
          success: false,
          message: 'Usuário não encontrado'
        };
      }

      // 5. Buscar evidências do chat se for por comportamento
      let evidence: any = {};
      if (reason === 'behavior_chat') {
        const chatEvidence = await this.getChatEvidence(eventId, userId);
        evidence = {
          chatMessages: chatEvidence.messages,
          chatSummary: chatEvidence.chatSummary,
          hasChatEvidence: chatEvidence.hasMessages
        };
      }

      // 6. Criar ticket de resolution
      const ticketData: Omit<ResolutionTicket, 'id' | 'created_at' | 'updated_at'> = {
        type: 'user_disapproval',
        priority: reason === 'identity_mismatch' ? 'high' : reason === 'behavior_chat' ? 'medium' : 'low',
        status: 'pending',
        event_id: eventId,
        reporter_id: hostId,
        affected_user_id: userId,
        title: `Desaprovação de usuário: ${reasonConfig.label}`,
        description: this.buildTicketDescription(reasonConfig, event, user, detailedDescription),
        evidence
      };

      const ticketResult = await this.createResolutionTicket(ticketData);

      if (!ticketResult.success) {
        return ticketResult;
      }

      // 7. Desaprovar o usuário
      const { error: updateError } = await supabase
        .from('event_participants')
        .update({
          status: 'rejeitado',
          rejection_reason: reason,
          rejected_at: new Date().toISOString(),
          rejected_by: hostId
        })
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      console.log('✅ Usuário desaprovado e ticket criado:', ticketResult.ticketId);

      return {
        success: true,
        message: `Usuário desaprovado. Ticket #${ticketResult.ticketId} enviado para análise.`,
        ticketId: ticketResult.ticketId
      };

    } catch (error) {
      console.error('❌ Erro ao desaprovar usuário:', error);
      return {
        success: false,
        message: 'Erro interno ao processar desaprovação',
        error: error.message
      };
    }
  }

  /**
   * Construir descrição detalhada do ticket
   */
  private static buildTicketDescription(
    reason: UserDisapprovalReason,
    event: any,
    user: any,
    detailedDescription?: string
  ): string {
    let description = `DESAPROVAÇÃO DE USUÁRIO\n\n`;
    description += `Motivo: ${reason.label}\n`;
    description += `Evento: ${event.title} (ID: ${event.id})\n`;
    description += `Usuário afetado: ${user.full_name || user.username} (ID: ${user.id})\n`;
    description += `Data: ${new Date().toLocaleString('pt-BR')}\n\n`;
    
    description += `Descrição do motivo:\n${reason.description}\n\n`;
    
    if (detailedDescription) {
      description += `Detalhes fornecidos pelo anfitrião:\n${detailedDescription}\n\n`;
    }
    
    description += `Status: Aguardando análise administrativa\n`;
    description += `Prioridade: ${reason.requiresDetailed ? 'Alta' : 'Média'}\n`;
    
    return description;
  }

  /**
   * Listar tickets para administração
   */
  static async getResolutionTickets(filters?: {
    status?: string;
    type?: string;
    priority?: string;
    limit?: number;
  }): Promise<ResolutionTicket[]> {
    try {
      let query = supabase
        .from('resolution_tickets')
        .select(`
          *,
          event:events(id, title),
          reporter:profiles!resolution_tickets_reporter_id_fkey(id, username, full_name),
          affected_user:profiles!resolution_tickets_affected_user_id_fkey(id, username, full_name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];

    } catch (error) {
      console.error('Erro ao buscar tickets:', error);
      return [];
    }
  }
}

export default ResolutionService;