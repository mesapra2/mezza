// src/features/shared/pages/EventManagement.jsx
import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Plus,
  Pencil,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/features/shared/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import EventStatusService from '@/services/EventStatusService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import NotificationService from '@/services/NotificationService';
import Avatar from '@/features/shared/components/profile/Avatar';
import { toast } from '@/features/shared/components/ui/use-toast';

const EventManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventStats, setEventStats] = useState(null);
  const [eventParticipants, setEventParticipants] = useState({});

  const loadMyEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('creator_id', user.id)
        .order('start_time', { ascending: false });

      if (error) throw error;

      setMyEvents(data || []);

      const participantsByEvent = {};
      // eslint-disable-next-line no-restricted-syntax
      for (const event of data) {
        // participantes aprovados
        // eslint-disable-next-line no-await-in-loop
        const { data: participationsData } = await supabase
          .from('event_participants')
          .select('user_id')
          .eq('event_id', event.id)
          .eq('status', 'aprovado');

        if (participationsData && participationsData.length > 0) {
          const userIds = participationsData.map((p) => p.user_id);
          // eslint-disable-next-line no-await-in-loop
          const { data: participantsData } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, public_profile')
            .in('id', userIds);

          participantsByEvent[event.id] = participantsData;
        } else {
          participantsByEvent[event.id] = [];
        }
      }
      setEventParticipants(participantsByEvent);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Erro ao carregar eventos:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar eventos',
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadMyEvents();
      const intervalId = EventStatusService.startAutoUpdate();
      return () => EventStatusService.stopAutoUpdate(intervalId);
    }
    return undefined;
  }, [user, loadMyEvents]);

  const loadEventStats = async (eventId) => {
    const result = await EventStatusService.getEventStats(eventId);
    if (result.success) {
      setEventStats(result.data);
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar estatísticas',
        description: result.error?.message || 'Ocorreu um erro.',
      });
    }
  };

  const handleConfirmEvent = async (eventId) => {
    const result = await EventStatusService.confirmEvent(eventId);
    if (result.success) {
      await loadMyEvents();
      const { data: event } = await supabase
        .from('events')
        .select('title')
        .eq('id', eventId)
        .single();

      await NotificationService.createForUser({
        target_user_id: user.id,
        target_event_id: eventId,
        notification_type: 'event_confirmed',
        title: '✅ Evento Confirmado',
        message: `Seu evento "${event.title}" foi confirmado com sucesso!`,
      });

      toast({
        title: '✅ Evento confirmado!',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro ao confirmar evento',
        description: result.error?.message || 'Não foi possível confirmar.',
      });
    }
  };

  const handleCancelEvent = async (eventId) => {
    // eslint-disable-next-line no-alert
    const reason = prompt('Motivo do cancelamento (opcional):');
    if (reason === null) return;

    const result = await EventStatusService.cancelEvent(eventId, reason || '');
    if (result.success) {
      await loadMyEvents();

      const { data: participants } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', eventId)
        .eq('status', 'aprovado');

      const { data: event } = await supabase
        .from('events')
        .select('title')
        .eq('id', eventId)
        .single();

      // eslint-disable-next-line no-restricted-syntax
      for (const part of participants) {
        // eslint-disable-next-line no-await-in-loop
        await NotificationService.createForUser({
          target_user_id: part.user_id,
          target_event_id: eventId,
          notification_type: 'event_cancelled',
          title: '❌ Evento Cancelado',
          message: `O evento "${event.title}" foi cancelado. Motivo: ${
            reason || 'Não especificado'
          }`,
        });
      }
      toast({
        title: 'Evento cancelado',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro ao cancelar evento',
        description: result.error?.message || 'Não foi possível cancelar.',
      });
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      Aberto: 'border-green-500/30 text-green-300',
      Confirmado: 'border-blue-500/30 text-blue-300',
      'Em Andamento': 'border-purple-500/30 text-purple-300',
      Finalizado: 'border-yellow-500/30 text-yellow-300',
      Concluído: 'border-gray-500/30 text-gray-300',
      Cancelado: 'border-red-500/30 text-red-300',
    };
    return colors[status] || colors.Aberto;
  };

  const getStatusIcon = (status) => {
    const icons = {
      Aberto: <AlertCircle className="w-3 h-3" />,
      Confirmado: <CheckCircle className="w-3 h-3" />,
      'Em Andamento': <TrendingUp className="w-3 h-3" />,
      Finalizado: <Clock className="w-3 h-3" />,
      Concluído: <CheckCircle className="w-3 h-3" />,
      Cancelado: <XCircle className="w-3 h-3" />,
    };
    return icons[status] || icons.Aberto;
  };

  return (
    <>
      <Helmet>
        <title>Meus Eventos - Mesapra2</title>
        <meta name="description" content="Gerencie seus eventos criados" />
      </Helmet>
      <div className="py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Meus Eventos</h1>
          <Button
            onClick={() => navigate('/criar-evento')}
            className="bg-gradient-to-r from-purple-500 to-pink-500"
          >
            <Plus className="w-5 h-5 mr-2" />
            Criar Evento
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Calendar className="w-16 h-16 text-white/40 animate-spin" />
          </div>
        ) : myEvents.length === 0 ? (
          <div className="glass-effect rounded-2xl p-12 border border-white/10 text-center">
            <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 text-lg mb-4">Você ainda não criou nenhum evento</p>
            <p className="text-white/40 text-sm mb-6">
              Crie seu primeiro evento e comece a conectar pessoas!
            </p>
            <Button
              onClick={() => navigate('/criar-evento')}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Plus className="w-5 h-5 mr-2" />
              Criar Meu Primeiro Evento
            </Button>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {myEvents.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="glass-effect rounded-2xl p-6 border border-white/10 hover:border-purple-500/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedEvent(event);
                      loadEventStats(event.id);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setSelectedEvent(event);
                        loadEventStats(event.id);
                      }
                    }}
                  >
                    <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${getStatusColor(
                        event.status,
                      )}`}
                    >
                      {getStatusIcon(event.status)}
                      {event.status}
                    </span>
                    <div className="space-y-2 text-white/60 text-sm">
                      <p className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(event.start_time), "dd 'de' MMMM 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Duração:{' '}
                        {Math.round(
                          (new Date(event.end_time).getTime() -
                            new Date(event.start_time).getTime()) /
                            (1000 * 60 * 60),
                        )}{' '}
                        horas
                      </p>
                      <p className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {event.vagas} vagas disponíveis
                      </p>
                    </div>
                  </div>

                  {eventParticipants[event.id]?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-white mb-2">
                        Participantes Aprovados ({eventParticipants[event.id].length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {eventParticipants[event.id].map((participant) => (
                          <Avatar
                            key={participant.id}
                            url={participant.avatar_url}
                            name={participant.username || participant.full_name}
                            size="sm"
                            isPublic={participant.public_profile}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  {event.status === 'Aberto' && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirmEvent(event.id);
                      }}
                      size="sm"
                      className="flex-1 bg-blue-500 hover:bg-blue-600"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Confirmar Evento
                    </Button>
                  )}

                  {event.status === 'Confirmado' && (
                    <Link to={`/event/${event.id}/editar`} className="flex-1">
                      <Button
                        onClick={(e) => e.stopPropagation()}
                        variant="outline"
                        size="sm"
                        className="w-full glass-effect border-white/20 hover:border-white/40"
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Editar Evento
                      </Button>
                    </Link>
                  )}

                  {event.status !== 'Cancelado' &&
                    !['Finalizado', 'Concluído'].includes(event.status) && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelEvent(event.id);
                        }}
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Cancelar Evento
                      </Button>
                    )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {selectedEvent && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-effect rounded-2xl p-6 border border-white/10 max-w-md w-full"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedEvent.title}</h2>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1 ${getStatusColor(
                      selectedEvent.status,
                    )}`}
                  >
                    {getStatusIcon(selectedEvent.status)}
                    {selectedEvent.status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEvent(null);
                    setEventStats(null);
                  }}
                  className="text-white/60 hover:text-white"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {!eventStats ? (
                <div className="flex justify-center items-center h-48">
                  <Calendar className="w-10 h-10 text-white/40 animate-spin" />
                  <p className="text-white/60 ml-3">Carregando estatísticas...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-effect rounded-lg p-4 border border-white/10">
                    <p className="text-white/60 text-sm mb-1">Total de Candidaturas</p>
                    <p className="text-white text-2xl font-bold">
                      {eventStats.totalCandidaturas}
                    </p>
                  </div>
                  <div className="glass-effect rounded-lg p-4 border border-white/10">
                    <p className="text-white/60 text-sm mb-1">Aprovados</p>
                    <p className="text-white text-2xl font-bold">{eventStats.aprovados}</p>
                  </div>
                  <div className="glass-effect rounded-lg p-4 border border-white/10">
                    <p className="text-white/60 text-sm mb-1">Presentes</p>
                    <p className="text-white text-2xl font-bold">{eventStats.presentes}</p>
                  </div>
                  <div className="glass-effect rounded-lg p-4 border border-white/10">
                    <p className="text-white/60 text-sm mb-1">Avaliações</p>
                    <p className="text-white text-2xl font-bold">{eventStats.avaliacoes}</p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </>
  );
};

export default EventManagement;
