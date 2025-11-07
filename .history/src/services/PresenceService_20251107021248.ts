// src/services/PresenceService.ts
import { supabase } from '@/lib/supabaseClient';

/**
 * Status possíveis de presença do usuário
 */
export type PresenceStatus = 'online' | 'away' | 'offline';

/**
 * Interface da presença do usuário
 */
export interface UserPresence {
  user_id: string;
  status: PresenceStatus;
  last_seen: string;
  updated_at: string;
}

/**
 * Service para gerenciar presença online dos usuários em tempo real
 */
class PresenceService {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private channel: any = null;
  private readonly HEARTBEAT_INTERVAL = 60000; // 1 minuto
  private readonly ACTIVITY_EVENTS = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click',
  ];

  /**
   * Inicia o monitoramento de presença para o usuário atual
   */
  async startTracking(userId: string): Promise<void> {
    try {
      // 1. Marcar usuário como online
      await this.updatePresence(userId, 'online');

      // 2. Configurar heartbeat
      this.startHeartbeat(userId);

      // 3. Monitorar atividade
      this.setupActivityListeners(userId);

      // 4. Handlers de saída
      this.setupExitHandlers(userId);

      console.log(`✅ Presença iniciada: ${userId}`);
    } catch (error) {
      console.error('❌ Erro ao iniciar presença:', error);
    }
  }

  /**
   * Para o monitoramento de presença
   */
  async stopTracking(userId: string): Promise<void> {
    try {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      this.ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, this.handleActivity);
      });

      await this.updatePresence(userId, 'offline');
      console.log(`✅ Presença parada: ${userId}`);
    } catch (error) {
      console.error('❌ Erro ao parar presença:', error);
    }
  }

  /**
   * Atualiza o status de presença
   */
  async updatePresence(userId: string, status: PresenceStatus): Promise<void> {
    try {
      const { error } = await supabase.from('user_presence').upsert(
        {
          user_id: userId,
          status,
          last_seen: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      );

      if (error) throw error;
    } catch (error) {
      console.error('❌ Erro ao atualizar presença:', error);
    }
  }

  /**
   * Busca presença de um usuário
   */
  async getUserPresence(userId: string): Promise<UserPresence | null> {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar presença:', error);
      return null;
    }
  }

  /**
   * Busca presença de múltiplos usuários
   */
  async getMultipleUsersPresence(userIds: string[]): Promise<Map<string, UserPresence>> {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('*')
        .in('user_id', userIds);

      if (error) throw error;

      const presenceMap = new Map<string, UserPresence>();
      data?.forEach((presence) => {
        presenceMap.set(presence.user_id, presence);
      });

      return presenceMap;
    } catch (error) {
      console.error('❌ Erro ao buscar múltiplas presenças:', error);
      return new Map();
    }
  }

  /**
   * Inscreve-se em mudanças de presença em tempo real
   */
  subscribeToPresence(
    userIds: string[],
    onPresenceChange: (presence: UserPresence) => void
  ): () => void {
    const channelName = `presence:${Date.now()}`;
    this.channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: userIds.length > 0 ? `user_id=in.(${userIds.join(',')})` : undefined,
        },
        (payload: any) => {
          console.log('🔄 Mudança de presença:', payload);
          if (payload.new) {
            onPresenceChange(payload.new as UserPresence);
          }
        }
      )
      .subscribe();

    console.log(`📡 Inscrito em presença: ${channelName}`);

    return () => {
      if (this.channel) {
        supabase.removeChannel(this.channel);
        this.channel = null;
      }
    };
  }

  private startHeartbeat(userId: string): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.updatePresence(userId, 'online');
      } catch (error) {
        console.error('❌ Erro no heartbeat:', error);
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private setupActivityListeners(userId: string): void {
    const debouncedActivity = this.debounce(async () => {
      await this.updatePresence(userId, 'online');
    }, 30000);

    this.ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, debouncedActivity, { passive: true });
    });
  }

  private setupExitHandlers(userId: string): void {
    const handleExit = async () => {
      await this.updatePresence(userId, 'offline');
    };

    window.addEventListener('beforeunload', handleExit);
    window.addEventListener('pagehide', handleExit);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        handleExit();
      } else {
        this.updatePresence(userId, 'online');
      }
    });
  }

  private handleActivity = (): void => {};

  private debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }
}

// =======================================================
// ✅ FUNÇÕES UTILITÁRIAS EXPORTADAS DIRETAMENTE (NOMEADAS)
// Isso corrige o erro de 'is not a function' no Avatar.jsx
// =======================================================

// A função calculateStatus foi mantida fora da classe (se era estática antes)
export function calculateStatus(lastSeen: string): PresenceStatus {
  const now = new Date().getTime();
  const lastSeenTime = new Date(lastSeen).getTime();
  const diffMinutes = (now - lastSeenTime) / 1000 / 60;

  if (diffMinutes < 2) return 'online';
  if (diffMinutes < 5) return 'away';
  return 'offline';
}

export function getStatusColor(status: PresenceStatus): string {
  const colors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    offline: 'bg-gray-500',
  };
  return colors[status] || colors.offline;
}

export function getStatusLabel(status: PresenceStatus): string {
  const labels = {
    online: 'Online',
    away: 'Ausente',
    offline: 'Offline',
  };
  return labels[status] || labels.offline;
}

export const presenceService = new PresenceService();
export default presenceService;