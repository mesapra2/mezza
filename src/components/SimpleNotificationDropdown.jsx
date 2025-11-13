/**
 * ========================================
 * COMPONENTE SIMPLIFICADO DE NOTIFICAÇÕES
 * ========================================
 * 
 * Versão mais simples e robusta sem dependências complexas
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Hand, CheckCircle, UserPlus, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SimpleNotificationDropdown = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [pokes, setPokes] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Função simples para carregar notificações
  const loadNotifications = async () => {
    if (!userId) return;

    setLoading(true);
    console.log('🔔 Carregando notificações para usuário:', userId);

    try {
      // Carregar notificações
      const { data: notificationData, error: notificationError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (notificationError) {
        console.warn('⚠️ Erro ao carregar notificações:', notificationError);
        setNotifications([]);
      } else {
        setNotifications(notificationData || []);
        console.log('✅ Notificações carregadas:', notificationData?.length || 0);
      }

      // Carregar pokes
      const { data: pokeData, error: pokeError } = await supabase
        .from('pokes')
        .select(`
          *,
          from_user:profiles!pokes_from_user_id_fkey(id, username, avatar_url, full_name)
        `)
        .eq('to_user_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (pokeError) {
        console.warn('⚠️ Erro ao carregar pokes:', pokeError);
        setPokes([]);
      } else {
        setPokes(pokeData || []);
        console.log('✅ Pokes carregados:', pokeData?.length || 0);
      }

    } catch (error) {
      console.error('❌ Erro geral ao carregar notificações:', error);
      setNotifications([]);
      setPokes([]);
    } finally {
      setLoading(false);
    }
  };

  // Carregar notificações quando o dropdown abre
  useEffect(() => {
    if (isOpen && userId) {
      loadNotifications();
    }
  }, [isOpen, userId]);

  // Calcular total de não lidas
  const unreadNotifications = notifications.filter(n => !n.is_read).length;
  const totalUnread = unreadNotifications + pokes.length;

  // Função para clicar no botão
  const handleToggle = () => {
    console.log('🔔 Botão de notificações clicado! Estado atual:', isOpen);
    setIsOpen(!isOpen);
  };

  // Função para marcar poke como lido
  const handlePokeClick = async (poke) => {
    try {
      await supabase
        .from('pokes')
        .update({ read: true })
        .eq('id', poke.id);

      // Remover da lista local
      setPokes(prev => prev.filter(p => p.id !== poke.id));
      
      // Navegar para perfil
      if (poke.from_user_id) {
        navigate(`/profile/${poke.from_user_id}`);
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('❌ Erro ao processar poke:', error);
    }
  };

  // Função para clicar em notificação
  const handleNotificationClick = async (notification) => {
    try {
      // Marcar como lida se não estiver
      if (!notification.is_read) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification.id);

        // Atualizar localmente
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
      }

      // Navegar para evento se houver
      if (notification.event_id) {
        navigate(`/event/${notification.event_id}`);
      }

      setIsOpen(false);
    } catch (error) {
      console.error('❌ Erro ao processar notificação:', error);
    }
  };

  // Marcar todas como lidas
  const handleMarkAllAsRead = async () => {
    try {
      // Marcar notificações como lidas
      if (unreadNotifications > 0) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', userId)
          .eq('is_read', false);

        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }

      // Marcar pokes como lidos
      if (pokes.length > 0) {
        await supabase
          .from('pokes')
          .update({ read: true })
          .eq('to_user_id', userId)
          .eq('read', false);

        setPokes([]);
      }

    } catch (error) {
      console.error('❌ Erro ao marcar todas como lidas:', error);
    }
  };

  // Ícone da notificação baseado no tipo
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'participation_approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
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
      {/* Botão do sino */}
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label={`Notificações ${totalUnread > 0 ? `(${totalUnread} não lidas)` : ''}`}
      >
        <Bell className="w-6 h-6 text-white/80" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center font-medium">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[1010]"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown Content */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl z-[1020] overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">Notificações</h3>
                  {totalUnread > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
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
                        onClick={() => handlePokeClick(poke)}
                        className="p-3 border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                            <Hand className="w-4 h-4 text-yellow-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">
                              <span className="font-medium">
                                {poke.from_user?.full_name || poke.from_user?.username || 'Usuário'}
                              </span>
                              {' '}te enviou um cutucão
                            </p>
                            <p className="text-xs text-white/60 mt-1">
                              {format(new Date(poke.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Notificações */}
                    {notifications.map(notification => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-3 border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer ${
                          !notification.is_read ? 'bg-purple-500/10' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {getNotificationIcon(notification.notification_type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white">
                              {notification.title}
                            </p>
                            {notification.message && (
                              <p className="text-xs text-white/60 mt-1">
                                {notification.message}
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
                    {notifications.length === 0 && pokes.length === 0 && !loading && (
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

              {/* Footer */}
              {(notifications.length > 0 || pokes.length > 0) && (
                <div className="p-3 border-t border-white/10 text-center">
                  <button
                    onClick={() => {
                      navigate('/notifications');
                      setIsOpen(false);
                    }}
                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium"
                  >
                    Ver todas as notificações
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SimpleNotificationDropdown;