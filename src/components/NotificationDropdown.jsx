<<<<<<< HEAD
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X, UserPlus, Calendar, AlertCircle, Hand, Key, Copy, CheckCircle, Star, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/features/shared/components/ui/use-toast';
import { useNotifications } from '@/hooks/userNotification';

const NotificationDropdown = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pokes, setPokes] = useState([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  // ✅ Hook otimizado de notificações
  const {
    notifications,
    unreadCount: notificationUnreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications(userId, 15000);

  // Carregar pokes separadamente
  const loadPokes = useCallback(async () => {
    if (!userId) return;
    
    try {
      const { data: pokesData, error } = await supabase
        .from('pokes')
        .select(`
          *,
          from_user:profiles!pokes_from_user_id_fkey(id, username, avatar_url, full_name)
        `)
        .eq('to_user_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPokes(pokesData || []);
    } catch (error) {
      console.error('Erro ao carregar pokes:', error);
      setPokes([]);
    }
  }, [userId]);

  // Carregar pokes quando componente monta
  useEffect(() => {
    loadPokes();
  }, [loadPokes]);

  // Total de não lidas (notifications + pokes)
  const totalUnreadCount = notificationUnreadCount + pokes.length;

  // Marcar poke como lido
  const markPokeAsRead = async (pokeId) => {
=======
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, X,  UserPlus,   Calendar,   AlertCircle,   Hand,  Key,  Copy,  CheckCircle, Star, Clock} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import NotificationService from '@/services/NotificationService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/features/shared/components/ui/use-toast';
import { debounce } from '@/utils/debounce';

const NotificationDropdown = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [pokes, setPokes] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    let retries = 3;
    
    while (retries > 0) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const { data: notificationsData, error: notifError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        clearTimeout(timeoutId);

        if (notifError) throw notifError;

        const notificationsWithUsers = await Promise.all(
          (notificationsData || []).map(async (notif) => {
            if (notif.participation_id) {
              try {
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
.maybeSingle();

                return {
                  ...notif,
                  participation: participationData
                    ? {
                        id: participationData.id,
                        user: participationData.profiles,
                      }
                    : null,
                };
              } catch (err) {
                console.warn('⚠️ Erro ao carregar participação:', err);
                return notif;
              }
            }
            return notif;
          })
        );

        setNotifications(notificationsWithUsers);
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error('❌ Erro ao carregar notificações após 3 tentativas:', error);
          setNotifications([]);
        } else {
          console.warn(`⚠️ Erro ao carregar notificações. Tentando novamente... (${retries} tentativas restantes)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    setLoading(false);
  }, [userId]);

  const loadPokes = useCallback(async () => {
    let retries = 3;
    
    while (retries > 0) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

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
          .eq('to_user_id', userId)
          .gte('created_at', yesterday.toISOString())
          .order('created_at', { ascending: false })
          .limit(10);

        clearTimeout(timeoutId);

        if (pokesError) throw pokesError;

        setPokes(pokesData || []);
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error('❌ Erro ao carregar cutucadas após 3 tentativas:', error);
          setPokes([]);
        } else {
          console.warn(`⚠️ Erro ao carregar cutucadas. Tentando novamente... (${retries} tentativas restantes)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }, [userId]);

  const loadUnreadCount = useCallback(async () => {
    let retries = 3;
    
    while (retries > 0) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const notifCount = await NotificationService.getUnreadCount(userId);
        const { count: pokesCount } = await supabase
          .from('pokes')
          .select('*', { count: 'exact', head: true })
          .eq('to_user_id', userId)
          .eq('read', false);

        clearTimeout(timeoutId);

        setUnreadCount(notifCount + (pokesCount || 0));
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error('❌ Erro ao contar não lidas após 3 tentativas:', error);
          setUnreadCount(0);
        } else {
          console.warn(`⚠️ Erro ao contar não lidas. Tentando novamente... (${retries} tentativas restantes)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }, [userId]);

  // ✅ FIX: Detectar mobile para ajustar polling
  const isMobile = useRef(
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  ).current;

  // ✅ FIX: Debounced load function para evitar chamadas excessivas
  const debouncedLoadRef = useRef(
    debounce(() => {
      loadNotifications();
      loadPokes();
      loadUnreadCount();
    }, 500)
  );

  useEffect(() => {
    if (!userId) return;

    // Carregamento inicial
    loadNotifications();
    loadPokes();
    loadUnreadCount();

    // ✅ FIX: Polling adaptativo - 60s mobile, 30s desktop
    const pollingInterval = isMobile ? 60000 : 30000;
    console.log(`🔔 Polling notificações a cada ${pollingInterval / 1000}s (${isMobile ? 'mobile' : 'desktop'})`);

    const interval = setInterval(() => {
      debouncedLoadRef.current();
    }, pollingInterval);

    let notifChannel = null;
    let pokesChannel = null;

    const setupChannels = async () => {
      try {
        notifChannel = supabase
          .channel(`notifications:${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              console.log('🔔 Nova notificação recebida:', payload);
              // ✅ FIX: Usar debounced load
              debouncedLoadRef.current();
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Inscrito em notificações');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Erro ao conectar em notificações');
            }
          });

        pokesChannel = supabase
          .channel(`pokes:${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'pokes',
              filter: `to_user_id=eq.${userId}`,
            },
            (payload) => {
              console.log('👋 Novo Tok recebido:', payload);
              // ✅ FIX: Usar debounced load
              debouncedLoadRef.current();
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Inscrito em toks');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Erro ao conectar em toks');
            }
          });
      } catch (error) {
        console.error('❌ Erro ao configurar canais:', error);
      }
    };

    setupChannels();

    return () => {
      clearInterval(interval);
      // ✅ FIX: Cancelar debounce pendente
      debouncedLoadRef.current.cancel();
      if (notifChannel) {
        notifChannel.unsubscribe();
      }
      if (pokesChannel) {
        pokesChannel.unsubscribe();
      }
    };
  }, [userId]); // ✅ Only userId dependency to prevent unnecessary re-renders

  const handleMarkAsRead = async (notificationId) => {
    await NotificationService.markAsRead(notificationId);
    loadNotifications();
    loadUnreadCount();
  };

  const handleMarkPokeAsRead = async (pokeId) => {
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
    try {
      const { error } = await supabase
        .from('pokes')
        .update({ read: true })
        .eq('id', pokeId);

      if (error) throw error;
<<<<<<< HEAD
      
      // Atualizar estado local
      setPokes(prev => prev.filter(poke => poke.id !== pokeId));
      
      toast({
        title: "Poke marcado como lido",
        duration: 2000,
      });
    } catch (error) {
      console.error('Erro ao marcar poke como lido:', error);
      toast({
        title: "Erro ao marcar poke como lido",
        variant: "destructive",
      });
    }
  };

  // Função para navegar para notificação
  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    if (notification.type === 'participation_approved') {
      navigate(`/event/${notification.event_id}`);
    } else if (notification.type === 'event_reminder') {
      navigate(`/event/${notification.event_id}`);
    }
    
    setIsOpen(false);
  };

  // Renderizar ícone da notificação
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'participation_approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'participation_rejected':
        return <X className="w-4 h-4 text-red-500" />;
      case 'new_participant':
        return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'event_reminder':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="relative">
      {/* Botão de notificações */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label={`Notificações ${totalUnreadCount > 0 ? `(${totalUnreadCount} não lidas)` : ''}`}
      >
        <Bell className="w-6 h-6 text-white/80" />
        {totalUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center font-medium">
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown Content */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-gray-900 border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">Notificações</h3>
                  {totalUnreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-purple-400 hover:text-purple-300"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="text-white/60 text-sm mt-2">Carregando...</p>
                  </div>
                ) : (
                  <>
                    {/* Pokes */}
                    {pokes.map(poke => (
                      <div
                        key={`poke-${poke.id}`}
                        className="p-3 border-b border-white/10 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <Hand className="w-4 h-4 text-yellow-500 mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">
                              <span className="font-medium">
                                {poke.from_user?.username || poke.from_user?.full_name || 'Usuário'}
                              </span>
                              {' '}te cutucou
                            </p>
                            <p className="text-xs text-white/60 mt-1">
                              {format(new Date(poke.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <button
                            onClick={() => markPokeAsRead(poke.id)}
                            className="text-white/40 hover:text-white/80"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Notifications */}
                    {notifications.map(notification => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-3 border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer ${
                          !notification.is_read ? 'bg-purple-500/10' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">
                              {notification.title}
                            </p>
                            {notification.content && (
                              <p className="text-xs text-white/60 mt-1">
                                {notification.content}
                              </p>
                            )}
                            <p className="text-xs text-white/40 mt-1">
                              {format(new Date(notification.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Empty State */}
                    {notifications.length === 0 && pokes.length === 0 && (
                      <div className="p-8 text-center">
                        <Bell className="w-12 h-12 text-white/20 mx-auto mb-3" />
                        <p className="text-white/60 text-sm">Nenhuma notificação</p>
                        <p className="text-white/40 text-xs mt-1">
                          Suas notificações aparecerão aqui
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </>
=======

      loadPokes();
      loadUnreadCount();
    } catch (error) {
      console.error('❌ Erro ao marcar tok como lido:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    await NotificationService.markAllAsRead(userId);
    try {
      const { error } = await supabase
        .from('pokes')
        .update({ read: true })
        .eq('to_user_id', userId);

      if (error) throw error;

      loadNotifications();
      loadPokes();
      loadUnreadCount();
    } catch (error) {
      console.error('❌ Erro ao marcar todos como lidos:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (notification.event_id) {
      navigate(`/event/${notification.event_id}`);
      handleMarkAsRead(notification.id);
      setIsOpen(false);
    } else {
      console.warn('⚠️ Notificação sem event_id:', notification);
    }
  };

  const handlePokeClick = (poke) => {
    navigate(`/profile/${poke.from_user_id}`);
    handleMarkPokeAsRead(poke.id);
    setIsOpen(false);
  };

  // 🆕 Função para copiar senha
  const handleCopyPassword = (password, eventTitle) => {
    navigator.clipboard.writeText(password);
    toast({
      title: '🔐 Senha copiada!',
      description: `Senha do evento "${eventTitle}" copiada para área de transferência`,
    });
  };

  // 🆕 Função para renderizar notificação com senha
  const renderPasswordNotification = (notification) => {
    if (notification.notification_type !== 'event_password') return null;

    // Extrair senha do data ou message
    const password = notification.data?.password || 
                    notification.message?.match(/\d{4}/)?.[0];

    if (!password) return null;

    return (
      <div className="mt-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-green-400" />
            <div>
              <p className="text-xs text-green-300 font-semibold">Senha de Entrada</p>
              <p className="text-2xl font-bold text-green-400 font-mono tracking-wider">
                {password}
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopyPassword(password, notification.title);
            }}
            className="p-2 rounded-lg hover:bg-white/10 text-green-400 transition-colors"
            title="Copiar senha"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-green-200/70 mt-2">
          Compartilhe esta senha com os participantes para entrarem no evento
        </p>
      </div>
    );
  };

  // ✅ Memoize icon and color functions to prevent unnecessary re-creation
  const getNotificationIcon = useCallback((type) => {
    const icons = {
      'Candidatura Recebida': UserPlus,
      'Candidatura Aprovada': Check,
      'Candidatura Rejeitada': X,
      'Novo Evento': Calendar,
      'event_cancelled': AlertCircle,
      'event_confirmed': Check,
      'event_reminder': Calendar,
      'event_password': Key,
      'event_application': Star, // ✅ Avaliação de evento
      'participation_request': Clock, // ✅ Lembrete
      'poke': Hand,
    };
    return icons[type] || Bell;
  }, []);

  const getNotificationColor = useCallback((type) => {
    const colors = {
      'Candidatura Recebida': 'text-purple-400',
      'Candidatura Aprovada': 'text-green-400',
      'Candidatura Rejeitada': 'text-red-400',
      'Novo Evento': 'text-blue-400',
      'event_cancelled': 'text-yellow-400',
      'event_confirmed': 'text-blue-400',
      'event_reminder': 'text-orange-400',
      'event_password': 'text-green-400',
      'event_application': 'text-yellow-400', // ✅ Avaliação de evento
      'participation_request': 'text-orange-400', // ✅ Lembrete
      'poke': 'text-pink-400',
    };
    return colors[type] || 'text-white';
  }, []);

  const getUserAvatar = (notification) => {
    if (notification.participation?.user?.avatar_url) {
      return notification.participation.user.avatar_url;
    }
    const username = notification.participation?.user?.username || 'Usuário';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=8b5cf6&color=fff&size=48`;
  };

  // ✅ Memoize expensive computations to prevent unnecessary re-renders
  const allItems = useMemo(() => [
    ...notifications.map((n) => ({ ...n, type: 'notification' })),
    ...pokes.map((p) => ({
      ...p,
      type: 'poke',
      notification_type: 'poke',
      title: 'Novo Tok!',
      message: `${p.profiles?.full_name || p.profiles?.username || 'Alguém'} te enviou um Tok 👋`,
      sent: p.read,
    })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), [notifications, pokes]);

  return (
    <div className="relative">
      {/* Live region para anúncios de novas notificações */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {unreadCount > 0 && `${unreadCount} nova${unreadCount > 1 ? 's' : ''} notificaç${unreadCount > 1 ? 'ões' : 'ão'}`}
      </div>
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        aria-label={`Notificações ${unreadCount > 0 ? `(${unreadCount} não lida${unreadCount > 1 ? 's' : ''})` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-96 max-h-[600px] bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl z-[70] overflow-hidden"
          >
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notificações
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                  >
                    Marcar todas como lidas
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-y-auto max-h-[500px]">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Bell className="w-8 h-8 text-white/40 animate-pulse" />
                </div>
              ) : allItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Bell className="w-12 h-12 text-white/20 mb-3" />
                  <p className="text-white/60 text-sm">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {allItems.map((item) => {
                    const Icon = getNotificationIcon(item.notification_type);
                    const iconColor = getNotificationColor(item.notification_type);
                    const isUnread = !item.sent;
                    const isPasswordNotif = item.notification_type === 'event_password'; // 🆕

                    return (
                      <motion.button
                        key={`${item.type}-${item.id}`}
                        onClick={() => {
                          if (item.type === 'poke') {
                            handlePokeClick(item);
                          } else {
                            handleNotificationClick(item);
                          }
                        }}
                        className={`w-full text-left p-4 hover:bg-white/5 transition-colors ${
                          isUnread ? 'bg-purple-500/10' : ''
                        } ${isPasswordNotif ? 'bg-green-500/5' : ''}`} // 🆕
                        whileHover={{ x: 4 }}
                      >
                        <div className="flex items-start gap-3">
                          {item.type === 'poke' && item.profiles ? (
                            <div className="relative flex-shrink-0">
                              <img
                                src={
                                  item.profiles.avatar_url ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    item.profiles.username || 'User'
                                  )}&background=8b5cf6&color=fff&size=48`
                                }
                                alt={item.profiles.username}
                                className="w-10 h-10 rounded-full border-2 border-pink-500/50 object-cover"
                                onError={(e) => {
                                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    item.profiles?.username || 'User'
                                  )}&background=8b5cf6&color=fff&size=48`;
                                }}
                              />
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center">
                                <Hand className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          ) : item.notification_type === 'Candidatura Recebida' && item.participation?.user ? (
                            <div className="relative flex-shrink-0">
                              <img
                                src={getUserAvatar(item)}
                                alt={item.participation.user.username}
                                className="w-10 h-10 rounded-full border-2 border-purple-500/50 object-cover"
                                onError={(e) => {
                                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    item.participation?.user?.username || 'User'
                                  )}&background=8b5cf6&color=fff&size=48`;
                                }}
                              />
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                                <Icon className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 ${iconColor}`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-white font-medium text-sm">{item.title}</p>
                              {isUnread && (
                                <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-white/60 text-sm mb-2">{item.message}</p>
                            
                            {/* 🆕 Renderizar senha se for notificação de senha */}
                            {renderPasswordNotification(item)}
                            
                            <p className="text-white/40 text-xs mt-2">
                              {format(new Date(item.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {allItems.length > 0 && (
              <div className="p-3 text-center border-t border-white/10">
                <button
                  onClick={() => {
                    navigate('/notifications');
                    setIsOpen(false);
                  }}
                  className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                >
                  Ver todas as notificações
                </button>
              </div>
            )}
          </motion.div>
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
        )}
      </AnimatePresence>
    </div>
  );
};

NotificationDropdown.propTypes = {
  userId: PropTypes.string.isRequired,
};

export default NotificationDropdown;