// src/services/PresenceService.js
// Serviço para gerenciar presença online dos usuários

import { supabase } from '@/lib/supabaseClient';

class PresenceService {
  static presenceChannel = null;
  static currentUserId = null;
  static onlineUsers = new Set();
  static presenceListeners = new Set();

  /**
   * Inicializar sistema de presença para o usuário logado
   */
  static async initialize(userId) {
    if (!userId) {
      console.warn('❌ PresenceService: userId é obrigatório');
      return;
    }

    this.currentUserId = userId;
    
    // Limpar presença anterior se existir
    await this.cleanup();

    // Criar canal de presença
    this.presenceChannel = supabase.channel('online_users', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // Configurar listeners
    this.setupPresenceListeners();

    // Entrar no canal
    await this.presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ PresenceService: Canal de presença conectado');
        
        // Marcar como online
        await this.setUserOnline();
      }
    });

    // Atualizar timestamp no perfil
    await this.updateLastSeen();
    
    // Atualizar last_seen a cada 30 segundos
    this.heartbeatInterval = setInterval(() => {
      this.updateLastSeen();
    }, 30000);

    // Listener para detectar quando o usuário sai da página
    window.addEventListener('beforeunload', () => {
      this.setUserOffline();
    });

    // Listener para detectar quando a aba fica inativa/ativa
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.setUserOffline();
      } else {
        this.setUserOnline();
      }
    });
  }

  /**
   * Configurar listeners de presença
   */
  static setupPresenceListeners() {
    if (!this.presenceChannel) return;

    // Quando alguém entra online
    this.presenceChannel.on('presence', { event: 'sync' }, () => {
      const newState = this.presenceChannel.presenceState();
      this.onlineUsers.clear();
      
      Object.keys(newState).forEach(userId => {
        this.onlineUsers.add(userId);
      });

      console.log(`👥 Usuários online: ${this.onlineUsers.size}`);
      
      // Notificar listeners
      this.notifyPresenceListeners();
    });

    // Quando alguém sai
    this.presenceChannel.on('presence', { event: 'leave' }, ({ key }) => {
      this.onlineUsers.delete(key);
      console.log(`👋 Usuário ${key} saiu`);
      this.notifyPresenceListeners();
    });

    // Quando alguém entra
    this.presenceChannel.on('presence', { event: 'join' }, ({ key }) => {
      this.onlineUsers.add(key);
      console.log(`👋 Usuário ${key} entrou`);
      this.notifyPresenceListeners();
    });
  }

  /**
   * Marcar usuário como online
   */
  static async setUserOnline() {
    if (!this.presenceChannel || !this.currentUserId) return;

    const status = await this.presenceChannel.track({
      user_id: this.currentUserId,
      online_at: new Date().toISOString(),
    });

    if (status === 'ok') {
      console.log('✅ PresenceService: Usuário marcado como online');
    }
  }

  /**
   * Marcar usuário como offline
   */
  static async setUserOffline() {
    if (!this.presenceChannel) return;

    await this.presenceChannel.untrack();
    console.log('👋 PresenceService: Usuário marcado como offline');
  }

  /**
   * Atualizar timestamp de last_seen no banco
   */
  static async updateLastSeen() {
    if (!this.currentUserId) return;

    try {
      // Verificar se a coluna last_seen existe antes de tentar atualizar
      const { error } = await supabase
        .from('profiles')
        .update({ 
          updated_at: new Date().toISOString(), // Usar updated_at como fallback
        })
        .eq('id', this.currentUserId);

      if (error && !error.message.includes('column "last_seen" does not exist')) {
        console.error('❌ Erro ao atualizar timestamp:', error);
      }
    } catch (err) {
      // Ignorar erros relacionados à coluna inexistente
      if (!err.message?.includes('last_seen')) {
        console.error('❌ Erro ao atualizar timestamp:', err);
      }
    }
  }

  /**
   * Verificar se um usuário está online
   */
  static isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }

  /**
   * Obter lista de usuários online
   */
  static getOnlineUsers() {
    return Array.from(this.onlineUsers);
  }

  /**
   * Adicionar listener para mudanças de presença
   */
  static addPresenceListener(callback) {
    this.presenceListeners.add(callback);
    
    // Retorna função para remover o listener
    return () => {
      this.presenceListeners.delete(callback);
    };
  }

  /**
   * Notificar todos os listeners
   */
  static notifyPresenceListeners() {
    this.presenceListeners.forEach(callback => {
      try {
        callback(this.getOnlineUsers());
      } catch (err) {
        console.error('❌ Erro em presence listener:', err);
      }
    });
  }

  /**
   * Determinar se usuário está recentemente ativo (nos últimos 5 minutos)
   */
  static isRecentlyActive(lastSeen) {
    if (!lastSeen) return false;
    
    const lastSeenDate = new Date(lastSeen);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    return lastSeenDate > fiveMinutesAgo;
  }

  /**
   * Obter status de presença para um usuário
   * @param {string} userId - ID do usuário
   * @param {string} lastSeen - Timestamp do last_seen
   * @returns {string} - 'online', 'recently-active', ou 'offline'
   */
  static getUserPresenceStatus(userId, lastSeen) {
    // Se está no canal de presença, está online
    if (this.isUserOnline(userId)) {
      return 'online';
    }
    
    // Se tem atividade recente (últimos 5 minutos), está recentemente ativo
    if (this.isRecentlyActive(lastSeen)) {
      return 'recently-active';
    }
    
    // Caso contrário, está offline
    return 'offline';
  }

  /**
   * Limpar recursos
   */
  static async cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.presenceChannel) {
      await this.setUserOffline();
      await this.presenceChannel.unsubscribe();
      this.presenceChannel = null;
    }

    this.onlineUsers.clear();
    this.presenceListeners.clear();
    this.currentUserId = null;
  }
}

export default PresenceService;