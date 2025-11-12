import { supabase } from '@/lib/supabaseClient';

// ✅ FIX: Usar APENAS os tipos que existem no ENUM do banco
type NotificationType =
  | 'Candidatura Recebida'
  | 'Candidatura Aprovada'
  | 'participation_request'
  | 'event_application';

interface Notification {
  id?: number;
  user_id: string;
  event_id?: number;
  notification_type: NotificationType | string;
  sent?: boolean;
  created_at?: string;
  title?: string;
  message?: string;
  participation_id?: string;
}

interface ServiceResult {
  success: boolean;
  error?: string;
  data?: any;
}

class NotificationService {
  
  /**
   * Cria uma notificação para O PRÓPRIO USUÁRIO LOGADO.
   * (Ex: O participante notifica o criador)
   * Esta função USA RLS.
   */
  static async create(notification: Omit<Notification, 'id' | 'created_at' | 'sent'>): Promise<ServiceResult> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          ...notification,
          sent: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Notificação criada (via create):', data);
      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Erro ao criar notificação (via create):', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cria uma notificação para QUALQUER USUÁRIO.
   * (Ex: O criador notifica o participante)
   * Esta função usa RPC e IGNORA RLS.
   */
  static async createForUser(params: {
    target_user_id: string;
    target_event_id: number;
    notification_type: NotificationType | string;
    title: string;
    message: string;
    target_participation_id?: string;
  }): Promise<ServiceResult> {
    try {
      if (import.meta.env.MODE === 'development') {
        console.log(`📢 Criando notificação via RPC para ${params.target_user_id}:`, params);
      }
      
      // Ajuste para lidar com participation_id nulo
      const rpcParams = {
        ...params,
        target_participation_id: params.target_participation_id || null, 
      };
      
      const { error } = await supabase.rpc('create_notification_for_user', rpcParams);

      if (error) {
        console.error('❌ ERRO RPC:', error);
        throw error;
      }

      console.log(`✅ Notificação RPC criada para ${params.target_user_id}`);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erro ao criar notificação (via RPC):', error);
      return { success: false, error: error.message };
    }
  }

  static async notifyNewParticipation(
    creatorId: string,
    eventId: number,
    participationId: string,
    participantName: string,
    eventTitle: string
  ): Promise<ServiceResult> {
    // ✨ Usar RPC para notificar o criador
    return this.createForUser({
      target_user_id: creatorId,
      target_event_id: eventId,
      notification_type: 'Candidatura Recebida',
      title: '🎉 Nova Candidatura!',
      message: `${participantName} se candidatou ao seu evento "${eventTitle}"`,
      target_participation_id: participationId,
    });
  }

  static async notifyParticipationApproved(
    userId: string,
    eventId: number,
    eventTitle: string
  ): Promise<ServiceResult> {
    // ✨ Usar RPC para notificar o participante
    return this.createForUser({
      target_user_id: userId,
      target_event_id: eventId,
      notification_type: 'Candidatura Aprovada',
      title: '✅ Você foi aprovado!',
      message: `Sua candidatura para "${eventTitle}" foi aprovada!`,
    });
  }

  static async notifyParticipationRejected(
    userId: string,
    eventId: number,
    eventTitle: string,
    reason?: string
  ): Promise<ServiceResult> {
    // ✨ Usar RPC para notificar o participante
    return this.createForUser({
      target_user_id: userId,
      target_event_id: eventId,
      notification_type: 'Candidatura Rejeitada',
      title: '❌ Candidatura não aprovada',
      message: `Sua candidatura para "${eventTitle}" não foi aprovada${reason ? `: ${reason}` : '.'}`,
    });
  }

  /**
   * ✅ CORRIGIDO: Notificar convidado de evento Crusher
   */
  static async notifyCrusherInvite(
    userId: string,
    eventId: number,
    inviterName: string,
    eventTitle: string
  ): Promise<ServiceResult> {
    if (import.meta.env.MODE === 'development') {
      console.log(`💘 Enviando notificação Crusher para ${userId}`);
    }
    
    // ✨ Usar RPC para notificar o convidado
    return this.createForUser({
      target_user_id: userId,
      target_event_id: eventId,
      notification_type: 'Convite Crusher',  // ✅ CORRIGIDO: Consistente com o tipo
      title: '💘 Convite Crusher Especial',
      message: `${inviterName} te convidou para um evento exclusivo: "${eventTitle}"`,
    });
  }

  static async notifyUsersWithMatchingHashtags(
    eventId: number,
    eventData: {
      creator_id: string;
      title: string;
      hashtags: string[];
      event_type: string;
    }
  ): Promise<ServiceResult> {
    try {
      console.log('📝 Iniciando notificação por hashtags para evento:', eventId);
      
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, hashtags')
        .not('hashtags', 'is', null)
        .neq('id', eventData.creator_id); 

      if (profileError) {
        console.error('❌ Erro ao buscar perfis:', profileError);
        throw profileError;
      }

      if (!profiles || profiles.length === 0) {
        console.log('⚠️ Nenhum usuário com hashtags encontrado');
        return { success: true, data: { notified: 0, users: [] } };
      }

      const eventHashtags = Array.isArray(eventData.hashtags) 
        ? eventData.hashtags.map(h => h.toLowerCase().trim())
        : [];

      console.log('🏷️ Hashtags do evento:', eventHashtags);

      const usersToNotify = profiles.filter(profile => {
        if (!profile.hashtags || !Array.isArray(profile.hashtags)) return false;
        
        const userHashtags = profile.hashtags.map((h: string) => h.toLowerCase().trim());
        const matchingTags = eventHashtags.filter(eventTag => 
          userHashtags.includes(eventTag)
        );
        
        return matchingTags.length > 0;
      });

      console.log(`✅ ${usersToNotify.length} usuários para notificar`);

      if (usersToNotify.length === 0) {
        return { success: true, data: { notified: 0, users: [] } };
      }

      const notifications = usersToNotify.map(user => {
        const userHashtags = user.hashtags.map((h: string) => h.toLowerCase().trim());
        const matchingTags = eventHashtags.filter(tag => userHashtags.includes(tag));
        
        return {
          user_id: user.id, 
          event_id: eventId,
          notification_type: 'Novo Evento' as NotificationType,
          title: '🎯 Novo Evento com suas Hashtags!',
          message: `"${eventData.title}" foi criado com hashtags que você segue: ${matchingTags.map(t => `#${t}`).join(', ')}`,
          sent: false,
          created_at: new Date().toISOString()
        };
      });

      // ✨ Usar RPC para inserir em lote
      // Se for chamada do CLIENTE, isso VAI FALHAR (RLS).
      // Assumindo que é chamada de um local seguro (backend/trigger):
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) {
        console.error('❌ Erro ao inserir notificações:', insertError);
        throw insertError;
      }

      console.log(`✅ ${notifications.length} notificações criadas com sucesso`);

      return { 
        success: true, 
        data: {
          notified: notifications.length,
          users: usersToNotify.map(u => u.username || u.id)
        }
      };

    } catch (error: any) {
      console.error('❌ Erro ao notificar usuários por hashtag:', error);
      return { success: false, error: error.message };
    }
  }

  static getMatchingHashtags(
    userHashtags: string[],
    eventHashtags: string[]
  ): string[] {
    if (!Array.isArray(userHashtags) || !Array.isArray(eventHashtags)) {
      return [];
    }

    const userTags = userHashtags.map(h => h.toLowerCase().trim());
    const eventTags = eventHashtags.map(h => h.toLowerCase().trim());

    return eventTags.filter(tag => userTags.includes(tag));
  }

  static async hasUnreadEventNotifications(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('sent', false)
        .eq('notification_type', 'Novo Evento')
        .limit(1);

      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      console.error('❌ Erro ao verificar notificações:', error);
      return false;
    }
  }

  static async getUserNotifications(userId: string): Promise<ServiceResult> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, event_id, notification_type, title, message, sent, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return { success: true, data };
    } catch (error: any) {
      console.error('❌ Erro ao buscar notificações:', error);
      return { success: false, error: error.message };
    }
  }

  static async markAsRead(notificationId: number): Promise<ServiceResult> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ sent: true })
        .eq('id', notificationId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('❌ Erro ao marcar como lida:', error);
      return { success: false, error: error.message };
    }
  }

  static async markAllAsRead(userId: string): Promise<ServiceResult> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ sent: true })
        .eq('user_id', userId)
        .eq('sent', false);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('❌ Erro ao marcar todas como lidas:', error);
      return { success: false, error: error.message };
    }
  }

  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('sent', false);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('❌ Erro ao contar não lidas:', error);
      return 0;
    }
  }

  static async delete(notificationId: number): Promise<ServiceResult> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('❌ Erro ao deletar notificação:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 📝 NOVO: Notifica participantes para avaliar após evento finalizado
   */
  static async notifyEvaluationRequest(eventId: number, eventTitle: string): Promise<ServiceResult> {
    try {
      console.log(`📝 Enviando pedidos de avaliação para evento ${eventId}...`);

      // Buscar participantes que confirmaram presença
      const { data: participations, error: partError } = await supabase
        .from('event_participants')
        .select('user_id, profiles!event_participants_user_id_fkey(username)')
        .eq('event_id', eventId)
        .eq('status', 'aprovado')
        .eq('presenca_confirmada', true)
        .eq('avaliacao_feita', false);

      if (partError) throw partError;

      if (!participations || participations.length === 0) {
        console.log('ℹ️ Nenhum participante para notificar sobre avaliações');
        return { success: true };
      }

      // ✅ FIX: Usar tipo válido do ENUM
      const notifications = participations.map(participation => ({
        user_id: participation.user_id,
        event_id: eventId,
        notification_type: 'event_application' as NotificationType,
        title: '⭐ Avalie sua experiência!',
        message: `O evento "${eventTitle}" terminou. Compartilhe sua opinião sobre o anfitrião, participantes e restaurante.`,
        sent: false,
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;

      console.log(`✅ ${notifications.length} notificações de avaliação enviadas`);
      return { success: true, data: { notified: notifications.length } };
    } catch (error: any) {
      console.error('❌ Erro ao enviar pedidos de avaliação:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ⏰ NOVO: Lembrete para quem não avaliou (24h depois)
   */
  static async sendEvaluationReminder(eventId: number, eventTitle: string): Promise<ServiceResult> {
    try {
      console.log(`⏰ Enviando lembretes de avaliação para evento ${eventId}...`);

      // Buscar participantes que ainda não avaliaram
      const { data: participations, error: partError } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', eventId)
        .eq('status', 'aprovado')
        .eq('presenca_confirmada', true)
        .eq('avaliacao_feita', false);

      if (partError) throw partError;

      if (!participations || participations.length === 0) {
        console.log('✅ Todos já avaliaram ou nenhum participante encontrado');
        return { success: true };
      }

      // ✅ FIX: Usar tipo válido do ENUM
      const reminders = participations.map(participation => ({
        user_id: participation.user_id,
        event_id: eventId,
        notification_type: 'participation_request' as NotificationType,
        title: '⏰ Lembrete: Avalie o evento',
        message: `Não se esqueça de avaliar "${eventTitle}". Sua opinião é importante!`,
        sent: false,
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(reminders);

      if (insertError) throw insertError;

      console.log(`✅ ${reminders.length} lembretes de avaliação enviados`);
      return { success: true, data: { reminded: reminders.length } };
    } catch (error: any) {
      console.error('❌ Erro ao enviar lembretes de avaliação:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🏁 NOVO: Notifica sobre conclusão automática em 7 dias
   */
  static async notifyAutoCompletionWarning(eventId: number, eventTitle: string, daysLeft: number): Promise<ServiceResult> {
    try {
      console.log(`🏁 Enviando aviso de conclusão automática para evento ${eventId}...`);

      // ✅ FIX: Verificar primeiro se já existe notificação para evitar duplicatas
      const { data: existingWarnings, error: checkError } = await supabase
        .from('notifications')
        .select('id')
        .eq('event_id', eventId)
        .in('notification_type', ['Candidatura Aprovada'])
        .limit(1);

      if (checkError) {
        console.warn(`⚠️ Erro ao verificar notificações existentes: ${checkError.message}`);
      } else if (existingWarnings && existingWarnings.length > 0) {
        console.log(`ℹ️ Aviso já enviado anteriormente para evento ${eventId}`);
        return { success: true, data: { warned: 0 } };
      }

      // Buscar TODOS os participantes confirmados (avaliaram ou não)
      const { data: participations, error: partError } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', eventId)
        .eq('status', 'aprovado')
        .eq('presenca_confirmada', true);

      if (partError) {
        console.error(`❌ Erro ao buscar participações: ${partError.message}`);
        throw partError;
      }

      if (!participations || participations.length === 0) {
        console.log(`ℹ️ Nenhum participante confirmado para evento ${eventId}`);
        return { success: true, data: { warned: 0 } };
      }

      // Buscar também o criador do evento
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('creator_id')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error(`❌ Erro ao buscar evento: ${eventError.message}`);
        throw eventError;
      }

      // Incluir criador na lista
      const allUserIds = [...participations.map(p => p.user_id), event.creator_id];
      const uniqueUserIds = [...new Set(allUserIds)];

      // ✅ FIX: Usar tipo válido do ENUM
      const warnings = uniqueUserIds.map(userId => ({
        user_id: userId,
        event_id: eventId,
        notification_type: 'Candidatura Aprovada' as NotificationType,
        title: `⏳ Evento será concluído em ${daysLeft} dia${daysLeft > 1 ? 's' : ''}`,
        message: `"${eventTitle}" será automaticamente marcado como concluído. Complete as avaliações pendentes.`,
        sent: false,
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(warnings);

      if (insertError) {
        console.error(`❌ Erro ao inserir notificações: ${insertError.message}`);
        throw insertError;
      }

      console.log(`✅ ${warnings.length} avisos de conclusão automática enviados`);
      return { success: true, data: { warned: warnings.length } };
    } catch (error: any) {
      console.error('❌ Erro ao enviar avisos de conclusão:', error);
      return { success: false, error: error.message };
    }
  }
}

export default NotificationService;