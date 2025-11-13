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
    try {
      const { error } = await supabase
        .from('pokes')
        .update({ read: true })
        .eq('id', pokeId);

      if (error) throw error;
      
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

  // Função para lidar com clique no poke
  const handlePokeClick = async (poke) => {
    try {
      // Marcar como lido
      await markPokeAsRead(poke.id);
      
      // Navegar para perfil do usuário que enviou o poke
      if (poke.from_user_id) {
        navigate(`/profile/${poke.from_user_id}`);
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Erro ao processar clique no poke:', error);
      setIsOpen(false);
    }
  };

  // Marcar todas como lidas (notificações + pokes)
  const handleMarkAllAsRead = async () => {
    try {
      // Marcar todas as notificações como lidas
      await markAllAsRead();
      
      // Marcar todos os pokes como lidos
      if (pokes.length > 0) {
        const { error } = await supabase
          .from('pokes')
          .update({ read: true })
          .eq('to_user_id', userId)
          .eq('read', false);

        if (error) {
          console.error('Erro ao marcar pokes como lidos:', error);
        } else {
          // Atualizar estado local dos pokes
          setPokes([]);
        }
      }

      toast({
        title: "Todas as notificações foram marcadas como lidas",
        duration: 2000,
      });
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      toast({
        title: "Erro ao marcar notificações como lidas",
        variant: "destructive",
      });
    }
  };

  // Função para navegar para notificação
  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }
      
      // Navegar baseado no tipo de notificação
      if (notification.event_id) {
        navigate(`/event/${notification.event_id}`);
      } else if (notification.type === 'participation_approved') {
        navigate(`/event/${notification.event_id}`);
      } else if (notification.type === 'event_reminder') {
        navigate(`/event/${notification.event_id}`);
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Erro ao processar clique na notificação:', error);
      setIsOpen(false);
    }
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
                  {totalUnreadCount > 0 && (
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
                          <div className="relative flex-shrink-0">
                            {poke.from_user?.avatar_url ? (
                              <img
                                src={poke.from_user.avatar_url}
                                alt={poke.from_user.username || 'Usuário'}
                                className="w-8 h-8 rounded-full object-cover"
                                onError={(e) => {
                                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    poke.from_user?.username || 'User'
                                  )}&background=8b5cf6&color=fff&size=32`;
                                }}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Hand className="w-4 h-4 text-yellow-500" />
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center">
                              <Hand className="w-2 h-2 text-white" />
                            </div>
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markPokeAsRead(poke.id);
                            }}
                            className="text-white/40 hover:text-white/80 transition-colors"
                            aria-label="Marcar como lido"
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

              {/* Footer com link para página de notificações */}
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

NotificationDropdown.propTypes = {
  userId: PropTypes.string.isRequired,
};

export default NotificationDropdown;