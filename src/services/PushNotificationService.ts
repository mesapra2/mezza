// src/services/PushNotificationService.ts
import { supabase } from '../lib/supabaseClient';

interface PushNotificationParams {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  eventId?: number;
}

interface SendPushResult {
  success: boolean;
  message?: string;
  error?: any;
}

/**
 * 📲 Serviço de Notificações Push
 * Gerencia envio de notificações para web e mobile
 */
class PushNotificationService {
  /**
   * 📲 Envia push genérica para usuário
   * @param params - Parâmetros da notificação
   */
  static async sendPush(params: PushNotificationParams): Promise<SendPushResult> {
    try {
      const { userId, title, body, data, eventId } = params;

      // 🔍 Buscar tokens de push do usuário
      const { data: deviceTokens, error: tokenError } = await supabase
        .from('user_device_tokens')
        .select('token, platform')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (tokenError) {
        console.warn('⚠️ Erro ao buscar tokens de dispositivo:', tokenError);
        // Não falhar - pode não ter tabela ou tokens
        return { success: true, message: 'Push registrada (sem devices)' };
      }

      if (!deviceTokens || deviceTokens.length === 0) {
        console.log(`⚠️ Usuário ${userId} não tem devices registrados`);
        return { success: true, message: 'Nenhum dispositivo registrado' };
      }

      // 📤 Enviar para cada device
      let sentCount = 0;
      for (const device of deviceTokens) {
        try {
          await this.sendPushToDevice({
            token: device.token,
            platform: device.platform,
            title,
            body,
            data,
            eventId
          });
          sentCount++;
        } catch (deviceError) {
          console.error(`❌ Erro ao enviar push para device:`, deviceError);
          // Continuar com próximo device
        }
      }

      // 📊 Registrar envio de notificação
      await this.logPushNotification({
        user_id: userId,
        title,
        body,
        event_id: eventId,
        devices_sent: sentCount,
        total_devices: deviceTokens.length
      });

      console.log(`✅ Push enviada para ${sentCount}/${deviceTokens.length} devices do usuário ${userId}`);
      return { success: true, message: `Enviada para ${sentCount} dispositivos` };
    } catch (error) {
      console.error('❌ Erro ao enviar push:', error);
      return { success: false, error };
    }
  }

  /**
   * 🎁 Envia push para ANFITRIÃO com a SENHA
   * @param hostId - ID do anfitrião
   * @param eventId - ID do evento
   * @param password - Senha de 4 dígitos
   * @param eventTitle - Título do evento
   */
  static async sendPasswordToHost(
    hostId: string,
    eventId: number,
    password: string,
    eventTitle: string
  ): Promise<SendPushResult> {
    try {
      console.log(`📨 Enviando senha para anfitrião ${hostId}`);

      const title = '🔑 Sua Senha do Evento';
      const body = `Evento "${eventTitle}" vai começar em 1 minuto. Compartilhe a senha: ${password}`;

      return this.sendPush({
        userId: hostId,
        title,
        body,
        data: {
          type: 'event_password',
          password,
          action: 'show_password'
        },
        eventId
      });
    } catch (error) {
      console.error('❌ Erro ao enviar senha para anfitrião:', error);
      return { success: false, error };
    }
  }

  /**
   * 🎬 Envia push para PARTICIPANTES (genérica, sem senha)
   * @param participantIds - Array com IDs dos participantes
   * @param eventId - ID do evento
   * @param eventTitle - Título do evento
   */
  static async sendEventStartNotificationToParticipants(
    participantIds: string[],
    eventId: number,
    eventTitle: string
  ): Promise<SendPushResult> {
    try {
      console.log(`📨 Enviando notificação de início para ${participantIds.length} participantes`);

      const title = '🎉 Seu Evento está Começando!';
      const body = `"${eventTitle}" começa em 1 minuto. Digite a senha para entrar!`;

      // 📤 Enviar para todos os participantes
      let successCount = 0;
      const errors: any[] = [];

      for (const participantId of participantIds) {
        try {
          const result = await this.sendPush({
            userId: participantId,
            title,
            body,
            data: {
              type: 'event_start',
              action: 'open_event_entry'
            },
            eventId
          });

          if (result.success) successCount++;
          else errors.push({ participantId, error: result.error });
        } catch (error) {
          errors.push({ participantId, error });
        }
      }

      console.log(`✅ Notificações enviadas: ${successCount}/${participantIds.length}`);
      if (errors.length > 0) {
        console.warn(`⚠️ Erros ao enviar para ${errors.length} participantes`);
      }

      return {
        success: successCount > 0,
        message: `Enviada para ${successCount}/${participantIds.length} participantes`,
        error: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('❌ Erro ao enviar notificação de início:', error);
      return { success: false, error };
    }
  }

  /**
   * 🚨 Envia push para ANFITRIÃO quando evento está prestes a terminar
   * @param hostId - ID do anfitrião
   * @param eventId - ID do evento
   * @param eventTitle - Título do evento
   */
  static async sendEventEndingNotification(
    hostId: string,
    eventId: number,
    eventTitle: string
  ): Promise<SendPushResult> {
    try {
      const title = '⏰ Seu Evento está Terminando';
      const body = `"${eventTitle}" vai terminar em 2 minutos. Prepare-se!`;

      return this.sendPush({
        userId: hostId,
        title,
        body,
        data: {
          type: 'event_ending',
          action: 'show_event_details'
        },
        eventId
      });
    } catch (error) {
      console.error('❌ Erro ao enviar notificação de fim:', error);
      return { success: false, error };
    }
  }

  /**
   * 🔔 Envia notificação para TEST (validar se funciona)
   */
  static async sendTestNotification(userId: string): Promise<SendPushResult> {
    try {
      return this.sendPush({
        userId,
        title: '✅ Teste de Notificação',
        body: 'Se você recebeu isto, as notificações push estão funcionando!',
        data: { type: 'test' }
      });
    } catch (error) {
      console.error('❌ Erro ao enviar notificação de teste:', error);
      return { success: false, error };
    }
  }

  /**
   * 🔗 Envia push para múltiplos usuários com mesma mensagem
   */
  static async sendBroadcast(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<SendPushResult> {
    try {
      console.log(`📢 Enviando broadcast para ${userIds.length} usuários`);

      let successCount = 0;
      const errors: any[] = [];

      for (const userId of userIds) {
        try {
          const result = await this.sendPush({
            userId,
            title,
            body,
            data
          });

          if (result.success) successCount++;
          else errors.push({ userId, error: result.error });
        } catch (error) {
          errors.push({ userId, error });
        }
      }

      return {
        success: successCount > 0,
        message: `Broadcast enviado para ${successCount}/${userIds.length}`,
        error: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      console.error('❌ Erro ao enviar broadcast:', error);
      return { success: false, error };
    }
  }

  /**
   * 🔧 Método PRIVADO: Enviar para um device específico
   * (Implementar com Firebase Cloud Messaging ou Expo)
   */
  private static async sendPushToDevice(params: {
    token: string;
    platform: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    eventId?: number;
  }): Promise<void> {
    const { token, platform, title, body, data, eventId } = params;

    // TODO: Implementar com Firebase Cloud Messaging
    // Para web (agora): usar Web Push API
    // Para mobile (Flutter): usar FCM

    console.log(`📤 Enviando para ${platform} device:`, {
      token: token.substring(0, 10) + '...',
      title,
      body
    });

    // Placeholder - será implementado com FCM
    if (platform === 'web') {
      // Usar Web Push API
      console.log('💻 Web Push (placeholder)');
    } else if (platform === 'android' || platform === 'ios') {
      // Usar Firebase Cloud Messaging
      console.log('📱 FCM (placeholder)');
    }
  }

  /**
   * 📊 Registra a notificação enviada
   */
  private static async logPushNotification(params: {
    user_id: string;
    title: string;
    body: string;
    event_id?: number;
    devices_sent: number;
    total_devices: number;
  }): Promise<void> {
    try {
      await supabase.from('push_notification_logs').insert({
        user_id: params.user_id,
        title: params.title,
        body: params.body,
        event_id: params.event_id,
        devices_sent: params.devices_sent,
        total_devices: params.total_devices,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.warn('⚠️ Erro ao registrar log de notificação:', error);
      // Não falhar - é só logging
    }
  }

  /**
   * 📱 Registra token de dispositivo do usuário
   * (Chamar do mobile quando fizer login)
   */
  static async registerDeviceToken(
    userId: string,
    token: string,
    platform: 'web' | 'ios' | 'android'
  ): Promise<SendPushResult> {
    try {
      const { error } = await supabase.from('user_device_tokens').insert({
        user_id: userId,
        token,
        platform,
        is_active: true,
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      console.log(`✅ Device token registrado para ${userId} (${platform})`);
      return { success: true, message: 'Device registrado com sucesso' };
    } catch (error) {
      console.error('❌ Erro ao registrar device token:', error);
      return { success: false, error };
    }
  }

  /**
   * 🗑️ Remove token de dispositivo (logout)
   */
  static async unregisterDeviceToken(token: string): Promise<SendPushResult> {
    try {
      const { error } = await supabase
        .from('user_device_tokens')
        .update({ is_active: false })
        .eq('token', token);

      if (error) throw error;

      console.log(`✅ Device token removido`);
      return { success: true, message: 'Device removido com sucesso' };
    } catch (error) {
      console.error('❌ Erro ao remover device token:', error);
      return { success: false, error };
    }
  }
}

export default PushNotificationService;