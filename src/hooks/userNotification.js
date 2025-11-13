// src/hooks/useNotifications.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export const useNotifications = (userId, pollingInterval = 10000) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Função para buscar notificações
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('id, user_id, event_id, notification_type, title, message, sent, is_read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        // Se for erro de tabela não encontrada ou RLS, tratar graciosamente
        if (fetchError.code === 'PGRST106' || fetchError.message?.includes('does not exist')) {
          console.warn('⚠️ Tabela notifications não existe. Criando estrutura...');
          setNotifications([]);
          setUnreadCount(0);
          return;
        }
        if (fetchError.code === 'PGRST116' || fetchError.message?.includes('406')) {
          console.warn('⚠️ Sem permissão para acessar notificações');
          setNotifications([]);
          setUnreadCount(0);
          return;
        }
        throw fetchError;
      }

      setNotifications(data || []);
      
      // Conta não lidas
      const unread = data?.filter(n => !n.is_read).length || 0;
      setUnreadCount(unread);
      
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Marcar como lida
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (updateError) {
        // Tratar erros de RLS ou tabela não encontrada graciosamente
        if (updateError.code === 'PGRST106' || updateError.code === 'PGRST116') {
          console.warn('⚠️ Erro ao marcar notificação como lida:', updateError.message);
          return;
        }
        throw updateError;
      }

      // Atualiza localmente
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    }
  }, []);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (updateError) {
        // Tratar erros de RLS ou tabela não encontrada graciosamente
        if (updateError.code === 'PGRST106' || updateError.code === 'PGRST116') {
          console.warn('⚠️ Erro ao marcar todas notificações como lidas:', updateError.message);
          return;
        }
        throw updateError;
      }

      // Atualiza localmente
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
    }
  }, [userId]);

  // Deletar notificação
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (deleteError) {
        // Tratar erros de RLS ou tabela não encontrada graciosamente
        if (deleteError.code === 'PGRST106' || deleteError.code === 'PGRST116') {
          console.warn('⚠️ Erro ao deletar notificação:', deleteError.message);
          return;
        }
        throw deleteError;
      }

      // Atualiza localmente
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId);
        return notification && !notification.is_read ? Math.max(0, prev - 1) : prev;
      });
    } catch (err) {
      console.error('Erro ao deletar notificação:', err);
    }
  }, [notifications]);

  // Polling - busca inicial e intervalo
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [fetchNotifications, pollingInterval]);

  // Real-time subscription (opcional - melhor que polling!)
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔔 Notificação em tempo real:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Nova notificação
            setNotifications(prev => [payload.new, ...prev]);
            if (!payload.new.is_read) {
              setUnreadCount(prev => prev + 1);
            }
          } else if (payload.eventType === 'UPDATE') {
            // Notificação atualizada
            setNotifications(prev =>
              prev.map(n => n.id === payload.new.id ? payload.new : n)
            );
            // Atualizar contador se mudou status de leitura
            if (payload.old.is_read !== payload.new.is_read) {
              if (payload.new.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
              } else {
                setUnreadCount(prev => prev + 1);
              }
            }
          } else if (payload.eventType === 'DELETE') {
            // Notificação deletada
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
            if (!payload.old.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Conectado às notificações em tempo real');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Erro na conexão de notificações em tempo real');
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ Timeout na conexão de notificações');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications
  };
};