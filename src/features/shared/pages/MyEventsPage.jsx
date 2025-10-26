import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, Users, MapPin, Clock, Plus, Edit, Trash2, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Avatar from '@/features/shared/components/profile/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/features/shared/components/ui/use-toast';
import EventStatusService from '@/services/EventStatusService';

const MyEventsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [filter, setFilter] = useState('futuros');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventStats, setEventStats] = useState({});

  useEffect(() => {
    if (user?.id) {
      loadEvents();
    }
  }, [user?.id]);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('events')
        .select(`
          *,
          partner:partners(id, name, address),
          creator:profiles!events_creator_id_fkey(
            id,
            username,
            avatar_url,
            full_name,
            public_profile
          )
        `)
        .eq('creator_id', user.id)
        .order('start_time', { ascending: false });

      if (fetchError) throw fetchError;
      if (!data) {
        setEvents([]);
        return;
      }

      setEvents(data);
      await loadEventStats(data);
    } catch (err) {
      console.error('Erro ao carregar eventos:', err);
      setError('Erro ao carregar seus eventos');
    } finally {
      setLoading(false);
    }
  };

  const loadEventStats = async (eventList) => {
    try {
      const stats = {};
      for (const event of eventList) {
        const result = await EventStatusService.getEventStats(event.id);
        if (result.success) {
          stats[event.id] = result.data;
        }
      }
      setEventStats(stats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const filterEvents = useCallback(() => {
    const now = new Date();
    let filtered = events;

    if (filter === 'futuros') {
      filtered = events.filter(e => new Date(e.end_time) >= now);
    } else if (filter === 'passados') {
      filtered = events.filter(e => new Date(e.end_time) < now);
    } else if (filter === 'finalizados') {
      filtered = events.filter(e => e.status === 'Finalizado');
    } else if (filter === 'concluidos') {
      filtered = events.filter(e => e.status === 'Concluído');
    }

    setFilteredEvents(filtered);
  }, [events, filter]);

  useEffect(() => {
    filterEvents();
  }, [filterEvents]);

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Tem certeza que deseja deletar este evento?')) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: '✅ Evento deletado',
        description: 'Seu evento foi removido'
      });
      await loadEvents();
    } catch (error) {
      console.error('Erro ao deletar:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível deletar o evento'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-12 h-12 text-white/40 animate-spin" />
      </div>
    );
  }

  const filters = [
    { value: 'futuros', label: '📅 Futuros' },
    { value: 'passados', label: '⏰ Passados' },
    { value: 'finalizados', label: '🎯 Finalizados' },
    { value: 'concluidos', label: '✅ Concluídos' },
  ];

  return (
    <>
      <Helmet>
        <title>Meus Eventos - Mesapra2</title>
      </Helmet>

      <div className="py-6 px-4 sm:px-6 lg:px-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Meus Eventos</h1>
          <Link to="/criar-evento">
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Plus className="w-5 h-5 mr-2" />
              Criar Evento
            </Button>
          </Link>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <Button
              key={f.value}
              variant={filter === f.value ? 'default' : 'outline'}
              onClick={() => setFilter(f.value)}
              className={`${
                filter === f.value
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                  : 'glass-effect border-white/10'
              }`}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Grid de Eventos */}
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event, index) => {
              const stats = eventStats[event.id];
              const isFinalized = event.status === 'Finalizado';
              const isConcluded = event.status === 'Concluído';

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-effect rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all h-full flex flex-col justify-between"
                >
                  {/* Status Badge */}
                  <div className="mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      isConcluded
                        ? 'bg-green-500/20 text-green-300'
                        : isFinalized
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {event.status}
                    </span>
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">{event.title}</h3>
                    <p className="text-sm text-white/60 mb-4 line-clamp-2">{event.description}</p>

                    <div className="space-y-2 text-sm text-white/60">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(event.start_time), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        até {format(new Date(event.end_time), "HH:mm", { locale: ptBR })}
                      </div>
                      {event.partner && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {event.partner.name}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {event.vagas} vagas
                      </div>
                    </div>
                  </div>

                  {/* Stats para eventos finalizados - SEM BOTÃO DE CONCLUIR */}
                  {isFinalized && stats && (
                    <div className="my-4 p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-xs text-white/60 mb-2">Avaliações:</p>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-white">
                          {stats.avaliacoes} de {stats.presentes} avaliados
                        </span>
                      </div>
                      <p className="text-xs text-white/50 mt-2">
                        ⏳ Será concluído automaticamente quando todos avaliarem ou em 7 dias
                      </p>
                    </div>
                  )}

                  {/* Info para concluído */}
                  {isConcluded && (
                    <div className="my-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-sm text-green-200">
                        ✅ Evento concluído com sucesso!
                      </p>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex gap-2 pt-4 border-t border-white/10">
                    {!isConcluded && (
                      <>
                        <Link to={`/event/${event.id}/editar`} className="flex-1">
                          <Button variant="outline" className="w-full border-white/20">
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                        </Link>
                        <Link to={`/event/${event.id}`} className="flex-1">
                          <Button variant="outline" className="w-full border-white/20">
                            Ver Detalhes
                          </Button>
                        </Link>
                      </>
                    )}

                    {!isConcluded && (
                      <Button
                        variant="ghost"
                        onClick={() => handleDeleteEvent(event.id)}
                        className="text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}

                    {isConcluded && (
                      <Link to={`/event/${event.id}`} className="flex-1">
                        <Button variant="outline" className="w-full border-white/20">
                          Ver Detalhes
                        </Button>
                      </Link>
                    )}
                  </div>
                  
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="glass-effect rounded-2xl p-12 border border-white/10 text-center">
            <AlertCircle className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 text-lg mb-4">
              {events.length === 0
                ? 'Você não criou eventos ainda'
                : `Nenhum evento ${filter === 'futuros' ? 'futuro' : filter === 'passados' ? 'passado' : filter === 'finalizados' ? 'finalizado' : 'concluído'}`}
            </p>
            <Link to="/criar-evento">
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500">
                <Plus className="w-5 h-5 mr-2" />
                Criar Evento
              </Button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default MyEventsPage;