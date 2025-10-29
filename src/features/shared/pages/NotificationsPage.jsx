// src/features/shared/pages/NotificationsPage.jsx (Corrigido)

import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Bell, Check, X, UserPlus, Calendar, AlertCircle, Trash2, Hand } from 'lucide-react'; // 1. Adicionado 'Hand'
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/features/shared/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import NotificationService from '@/services/NotificationService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [pokes, setPokes] = useState([]); // 2. Adicionado estado para 'pokes'
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todas'); // todas, não_lidas
  const navigate = useNavigate();

  // ... (loadNotifications continua igual)
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data: notificationsData, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (notifError) throw notifError;

      const notificationsWithUsers = await Promise.all(
        (notificationsData || []).map(async (notif) => {
          if (notif.participation_id) {
            const { data: participationData } = await supabase
              .from('event_participants')
              .select(`
                id,
                user_id,
                profiles!event_participants_user_id_fkey(
                  id,
                  username,
                  avatar_url
                )
              `)
              .eq('id', notif.participation_id)
              .single();

            return {
              ...notif,
              participation: participationData ? {
                id: participationData.id,
                user: participationData.profiles
              } : null
            };
          }
          return notif;
        })
      );

      setNotifications(notificationsWithUsers);
    } catch (error) {
      console.error('❌ Erro ao carregar notificações:', error);
      setNotifications([]);
    }
  }, [user]);

  // ... (loadPokes continua igual, copiado do dropdown)
  const loadPokes = useCallback(async () => {
    if (!user) return;
    try {
      const { data: pokesData, error: pokesError } = await supabase
        .from('pokes')
        .select(`
          id,
          from_user_id,
          created_at,
          read,
          profiles!pokes_from_user_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('to_user_id', user.id)
        .order('created_at', { ascending: false });

      if (pokesError) throw pokesError;
      setPokes(pokesData || []);
    } catch (error) {
      console.error('❌ Erro ao carregar toks:', error); // MUDANÇA
      setPokes([]);
    }
  }, [user]);

  // ... (useEffect continua igual)
  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        loadNotifications(),
        loadPokes()
      ]).finally(() => setLoading(false));

      // Subscrição para Notificações
      const notifChannel = supabase
        .channel('notifications-page')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => loadNotifications()
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => loadNotifications()
        )
        .subscribe();

      // Subscrição para Pokes
      const pokesChannel = supabase
        .channel('pokes-page')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'pokes', filter: `to_user_id=eq.${user.id}` },
          () => loadPokes()
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'pokes', filter: `to_user_id=eq.${user.id}` },
          () => loadPokes()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(notifChannel);
        supabase.removeChannel(pokesChannel);
      };
    }
  }, [user, loadNotifications, loadPokes]);


  const handleMarkAsRead = async (item) => {
    if (item.type === 'poke') {
      await supabase.from('pokes').update({ read: true }).eq('id', item.id);
      loadPokes();
    } else {
      await NotificationService.markAsRead(item.id);
      loadNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    await NotificationService.markAllAsRead(user.id);
    await supabase.from('pokes').update({ read: true }).eq('to_user_id', user.id).eq('read', false);
    loadNotifications();
    loadPokes();
  };

  const handleDelete = async (item) => {
    if (!confirm('Deseja realmente excluir esta notificação?')) return;
    
    if (item.type === 'poke') {
      await supabase.from('pokes').delete().eq('id', item.id);
      loadPokes();
    } else {
      await NotificationService.delete(item.id);
      loadNotifications();
    }
  };

  const handlePokeClick = async (poke) => {
    await supabase.from('pokes').update({ read: true }).eq('id', poke.id);
    loadPokes();
    navigate(`/profile/${poke.from_user_id}`);
  };

  const handleNotificationClick = async (notification) => {
    await NotificationService.markAsRead(notification.id);
    loadNotifications();
    
    if (notification.event_id) {
      navigate(`/meus-eventos`);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      // 3. MUDANÇA: Chaves atualizadas para Português
      'Candidatura Recebida': UserPlus, // Antes: participation_request
      'Candidatura Aprovada': Check, // Antes: participation_approved
      'Candidatura Rejeitada': X, // Antes: participation_rejected
      'Novo Evento': Bell, // (Adicionado)
      event_cancelled: AlertCircle,
      event_confirmed: Calendar,
      event_reminder: Bell,
      poke: Hand, // Adicionado
    };
    return icons[type] || Bell;
  };

  const getNotificationColor = (type) => {
    const colors = {
      // 4. MUDANÇA: Chaves atualizadas para Português
      'Candidatura Recebida': 'text-purple-400 bg-purple-500/20 border-purple-500/30', //
      'Candidatura Aprovada': 'text-green-400 bg-green-500/20 border-green-500/30', //
      'Candidatura Rejeitada': 'text-red-400 bg-red-500/20 border-red-500/30', //
      'Novo Evento': 'text-blue-400 bg-blue-500/20 border-blue-500/30', // (Adicionado)
      event_cancelled: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
      event_confirmed: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
      event_reminder: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
      poke: 'text-pink-400 bg-pink-500/20 border-pink-500/30', // Adicionado
    };
    return colors[type] || 'text-white bg-white/10 border-white/10';
  };

  const getUserAvatar = (notification) => {
    if (notification.participation?.user?.avatar_url) {
      return notification.participation.user.avatar_url;
    }
    const username = notification.participation?.user?.username || 'Usuário';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=8b5cf6&color=fff&size=64`;
  };

  // 5. Lógica de mesclagem e contagem
  const allItems = [
    ...notifications.map((n) => ({ ...n, type: 'notification' })),
    ...pokes.map((p) => ({
      ...p,
      type: 'poke',
      notification_type: 'poke',
      // 6. MUDANÇA: "Cutucada" -> "Tok"
      title: 'Novo Tok!',
      message: `${p.profiles?.full_name || p.profiles?.username || 'Alguém'} te enviou um Tok 👋`,
      sent: p.read, // Alinha 'read' com 'sent'
    })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const unreadCount = allItems.filter(n => !n.sent).length;
  const totalCount = allItems.length;

  const filteredItems = filter === 'todas'
    ? allItems
    : allItems.filter(n => !n.sent);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Bell className="w-16 h-16 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Notificações | Mesapra2</title>
      </Helmet>

      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Notificações</h1>
              <p className="text-white/60">
                {/* 7. MUDANÇA: "notificação" -> "item" */}
                {unreadCount > 0 
                  ? `Você tem ${unreadCount} ${unreadCount === 1 ? 'item não lido' : 'itens não lidos'}`
                  : 'Todas as notificações foram lidas'
                }
              </p>
            </div>
            
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Check className="w-5 h-5 mr-2" />
                Marcar Todas como Lidas
              </Button>
            )}
          </div>

          {/* Filtros - 8. MUDANÇA: Contagem atualizada */}
          <div className="flex gap-2">
            <Button
              variant={filter === 'todas' ? 'default' : 'outline'}
              onClick={() => setFilter('todas')}
              className={filter === 'todas' 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                : 'glass-effect border-white/10'
              }
            >
              Todas ({totalCount})
            </Button>
            <Button
              variant={filter === 'não_lidas' ? 'default' : 'outline'}
              onClick={() => setFilter('não_lidas')}
              className={filter === 'não_lidas' 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                : 'glass-effect border-white/10'
              }
            >
              Não Lidas ({unreadCount})
            </Button>
          </div>

          {/* Lista de Notificações - 9. MUDANÇA: 'filteredItems' */}
          {filteredItems.length === 0 ? (
            <div className="glass-effect rounded-2xl p-12 border border-white/10 text-center">
              <Bell className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/60 text-lg">
                {filter === 'todas' 
                  ? 'Nenhuma notificação ainda'
                  : 'Nenhuma notificação não lida'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const Icon = getNotificationIcon(item.notification_type);
                const colorClasses = getNotificationColor(item.notification_type);
                const isUnread = !item.sent;

                return (
                  <motion.div
                    key={`${item.type}-${item.id}`} // 10. MUDANÇA: Chave única
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`glass-effect rounded-xl p-6 border transition-all ${
                      isUnread ? 'border-purple-500/50 bg-purple-500/5' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar ou Ícone - 11. MUDANÇA: lógica de 'item.type' */}
                      {item.type === 'poke' && item.profiles ? (
                        <div className="relative flex-shrink-0">
                          <img
                            src={
                              item.profiles.avatar_url ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                item.profiles.username || 'User'
                              )}&background=8b5cf6&color=fff&size=64`
                            }
                            alt={item.profiles.username}
                            className="w-16 h-16 rounded-full border-2 border-pink-500/50 object-cover"
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                item.profiles?.username || 'User'
                              )}&background=8b5cf6&color=fff&size=64`;
                            }}
                          />
                          <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 border-background flex items-center justify-center ${colorClasses}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                        </div>
                      ) : item.notification_type === 'Candidatura Recebida' && item.participation?.user ? (
                        <div className="relative flex-shrink-0">
                          <img
                            src={getUserAvatar(item)}
                            alt={item.participation.user.username}
                            className="w-16 h-16 rounded-full border-2 border-purple-500/50 object-cover"
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                item.participation?.user?.username || 'User'
                              )}&background=8b5cf6&color=fff&size=64`;
                            }}
                          />
                          <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 border-background flex items-center justify-center ${colorClasses}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                        </div>
                      ) : (
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 border ${colorClasses}`}>
                          <Icon className="w-8 h-8" />
                        </div>
                      )}

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-white font-semibold text-lg">
                                {item.title}
                              </h3>
                              {isUnread && (
                                <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-xs font-medium">
                                  Nova
                                </span>
                              )}
                            </div>
                            
                            <p className="text-white/80 mb-3">
                              {item.message}
                            </p>
                            
                            <p className="text-white/40 text-sm flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(item.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>

                          {/* Ações */}
                          <div className="flex items-center gap-2">
                            {isUnread && (
                              <Button
                                onClick={() => handleMarkAsRead(item)}
                                variant="outline"
                                size="sm"
                                className="glass-effect border-green-500/30 text-green-300 hover:bg-green-500/20"
                                title="Marcar como lida"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                            
                            <Button
                              onClick={() => handleDelete(item)}
                              variant="outline"
                              size="sm"
                              className="glass-effect border-red-500/30 text-red-300 hover:bg-red-500/20"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Botão de Ação - 12. MUDANÇA: lógica de 'item.type' */}
                        {item.type === 'poke' && (
                          <Button
                            onClick={() => handlePokeClick(item)}
                            variant="outline"
                            size="sm"
                            className="glass-effect border-pink-500/30 text-pink-300 hover:bg-pink-500/20"
                          >
                            Ver Perfil
                          </Button>
                        )}
                        {item.type === 'notification' && item.event_id && (
                          <Button
                            onClick={() => handleNotificationClick(item)}
                            variant="outline"
                            size="sm"
                            className="glass-effect border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                          >
                            Ver Evento
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
};

export default NotificationsPage;