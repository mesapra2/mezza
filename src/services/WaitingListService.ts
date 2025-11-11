// src/features/shared/services/WaitingListService.ts
import { supabase } from '../lib/supabaseClient';
import NotificationService from '../services/NotificationService';
import ParticipationService from '../services/ParticipationService';

interface WaitingListEntry {
  id?: string;
  user_id: string;
  event_id: string;
  position: number;
  created_at?: string;
  notified?: boolean;
}

class WaitingListService {
  /**
   * Adiciona um usuário à lista de espera
   */
  async addToWaitingList(userId: string, eventId: string): Promise<WaitingListEntry | null> {
    try {
      // Verifica se o usuário já está na lista de espera
      const { data: existing, error: checkError } = await supabase
        .from('waiting_list')
        .select('*')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .single();

      if (existing) {
        console.log('Usuário já está na lista de espera');
        return existing;
      }

      // Obtém a última posição na lista
      const { data: lastEntry } = await supabase
        .from('waiting_list')
        .select('position')
        .eq('event_id', eventId)
        .order('position', { ascending: false })
        .limit(1)
        .single();

      const newPosition = lastEntry ? lastEntry.position + 1 : 1;

      // Adiciona o usuário à lista
      const { data, error } = await supabase
        .from('waiting_list')
        .insert({
          user_id: userId,
          event_id: eventId,
          position: newPosition,
          notified: false
        })
        .select()
        .single();

      if (error) throw error;

      // Envia notificação de confirmação
      await NotificationService.createForUser({
        target_user_id: userId,
        target_event_id: parseInt(eventId),
        notification_type: 'event_reminder',
        title: 'Você entrou na lista de espera',
        message: `Você está na posição ${newPosition} da lista de espera.`
      });

      return data;
    } catch (error) {
      console.error('Erro ao adicionar à lista de espera:', error);
      return null;
    }
  }

  /**
   * Remove um usuário da lista de espera
   */
  async removeFromWaitingList(userId: string, eventId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('waiting_list')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId);

      if (error) throw error;

      // Reorganiza as posições
      await this.reorganizePositions(eventId);

      return true;
    } catch (error) {
      console.error('Erro ao remover da lista de espera:', error);
      return false;
    }
  }

  /**
   * Obtém a lista de espera de um evento
   */
  async getWaitingList(eventId: string): Promise<WaitingListEntry[]> {
    try {
      const { data, error } = await supabase
        .from('waiting_list')
        .select('*')
        .eq('event_id', eventId)
        .order('position', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Erro ao obter lista de espera:', error);
      return [];
    }
  }

  /**
   * Obtém a posição de um usuário na lista de espera
   */
  async getUserPosition(userId: string, eventId: string): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('waiting_list')
        .select('position')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .single();

      if (error) throw error;

      return data?.position || null;
    } catch (error) {
      console.error('Erro ao obter posição na lista:', error);
      return null;
    }
  }

  /**
   * Processa a lista de espera quando uma vaga é liberada
   */
  async processWaitingList(eventId: string): Promise<void> {
    try {
      // Obtém o primeiro da lista que ainda não foi notificado
      const { data: nextInLine, error } = await supabase
        .from('waiting_list')
        .select('*')
        .eq('event_id', eventId)
        .eq('notified', false)
        .order('position', { ascending: true })
        .limit(1)
        .single();

      if (error || !nextInLine) {
        console.log('Nenhum usuário na lista de espera ou todos já foram notificados');
        return;
      }

      // Marca como notificado
      await supabase
        .from('waiting_list')
        .update({ notified: true })
        .eq('id', nextInLine.id);

      // Envia notificação
      // TODO: Implementar método de notificação apropriado
      console.log('Notificando usuário sobre vaga disponível:', nextInLine.user_id);

      // Tenta aplicar para o evento automaticamente
      const applied = await ParticipationService.applyToEvent(
        eventId,
        nextInLine.user_id,
        'Aplicação automática da lista de espera'
      );

      if (applied.success && applied.isAutoApproved) {
        // Remove da lista de espera se a participação foi confirmada
        await this.removeFromWaitingList(nextInLine.user_id, eventId);
      }
    } catch (error) {
      console.error('Erro ao processar lista de espera:', error);
    }
  }

  /**
   * Reorganiza as posições na lista de espera
   */
  private async reorganizePositions(eventId: string): Promise<void> {
    try {
      const waitingList = await this.getWaitingList(eventId);

      // Atualiza as posições sequencialmente
      for (let i = 0; i < waitingList.length; i++) {
        const entry = waitingList[i];
        if (entry.position !== i + 1) {
          await supabase
            .from('waiting_list')
            .update({ position: i + 1 })
            .eq('id', entry.id);
        }
      }
    } catch (error) {
      console.error('Erro ao reorganizar posições:', error);
    }
  }

  /**
   * Verifica se um usuário está na lista de espera
   */
  async isInWaitingList(userId: string, eventId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('waiting_list')
        .select('id')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .single();

      return !!data && !error;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtém o total de pessoas na lista de espera
   */
  async getWaitingListCount(eventId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('waiting_list')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('Erro ao contar lista de espera:', error);
      return 0;
    }
  }

  /**
   * Limpa a lista de espera de um evento
   */
  async clearWaitingList(eventId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('waiting_list')
        .delete()
        .eq('event_id', eventId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Erro ao limpar lista de espera:', error);
      return false;
    }
  }

  /**
   * Notifica todos os usuários da lista de espera sobre uma atualização
   */
  async notifyWaitingList(eventId: string, message: string): Promise<void> {
    try {
      const waitingList = await this.getWaitingList(eventId);

      for (const entry of waitingList) {
        // TODO: Implementar método de notificação apropriado
        console.log('Notificando usuário da lista de espera:', entry.user_id, message);
      }
    } catch (error) {
      console.error('Erro ao notificar lista de espera:', error);
    }
  }
}

export default new WaitingListService();