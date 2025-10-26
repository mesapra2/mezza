// src/pages/FeedPartnerEvent.jsx
import { useState, useEffect, useCallback } from 'react';
import { Helmet } from "react-helmet-async";
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, Calendar, Users, MapPin, Tag, Clock } from 'lucide-react';
import { Input } from '@/features/shared/components/ui/input';
import { Button } from '@/features/shared/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Avatar from '@/features/shared/components/profile/Avatar';

const FeedPartnerEvent = () => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [eventParticipantsMap, setEventParticipantsMap] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper para Avatar
  const getAvatarUrl = (profile, nameFallback = 'U') => {
    if (profile?.avatar_url) return profile.avatar_url;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      profile?.username || profile?.full_name || nameFallback
    )}&background=8b5cf6&color=fff&size=40`;
  };

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let { data, error: fetchError } = await supabase
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
        .eq('event_type', 'institucional') // <-- FILTRO PRINCIPAL
        .order('start_time', { ascending: true });

      // Fallbacks (mantidos por segurança)
      if (fetchError && !data) {
        const fallback = await supabase.from('events').select(`*, partner:partners(id, name, address)`).eq('event_type', 'institucional').order('start_time', { ascending: true });
        data = fallback.data;
        fetchError = fallback.error;
      }
      if (fetchError && !data) {
        const simple = await supabase.from('events').select('*').eq('event_type', 'institucional').order('start_time', { ascending: true });
        data = simple.data;
        fetchError = simple.error;
      }
      if (fetchError) throw fetchError;
      if (!data) data = [];

      const now = new Date();
      const validEvents = data.filter(event => {
        try {
            const eventDate = new Date(event.start_time);
            if (isNaN(eventDate.getTime())) return false;
            const isFuture = eventDate >= now;
            const statusLower = typeof event.status === 'string' ? event.status.toLowerCase() : '';
            const hasValidStatus = ['aberto', 'confirmado'].includes(statusLower);
            return isFuture && hasValidStatus;
        } catch(e) {
            return false;
        }
      });

      setEvents(validEvents);

      // Busca participantes em lote
      if (validEvents.length > 0) {
        const eventIds = validEvents.map(e => e.id);
        const { data: participationsData, error: participantsError } = await supabase
          .from('participations')
          .select('event_id, profile:profiles(id, username, avatar_url, full_name, public_profile)')
          .in('event_id', eventIds)
          .eq('status', 'aprovado');

        if (participantsError) {
          console.error("Erro ao buscar participantes:", participantsError);
        } else if (participationsData) {
          const participantsMap = participationsData.reduce((acc, participation) => {
            if (!participation.profile) return acc;
            const eventId = participation.event_id;
            if (!acc[eventId]) acc[eventId] = [];
            acc[eventId].push(participation.profile);
            return acc;
          }, {});
          setEventParticipantsMap(participantsMap);
        }
      } else {
        setEventParticipantsMap({});
      }

    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      setError('Erro ao carregar eventos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []); // Roda só uma vez

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filterEvents = useCallback(() => {
    let filtered = events;
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.title?.toLowerCase().includes(lowerSearch) ||
        e.description?.toLowerCase().includes(lowerSearch) ||
        e.hashtags?.some(tag => tag.toLowerCase().includes(lowerSearch)) ||
        e.creator?.username?.toLowerCase().includes(lowerSearch) ||
        e.partner?.name?.toLowerCase().includes(lowerSearch)
      );
    }
    setFilteredEvents(filtered);
  }, [events, searchTerm]);


  useEffect(() => {
    filterEvents();
  }, [filterEvents]);


  const getPartnerAddress = (partner) => {
    if (!partner) return 'Local não informado';
    if (!partner.address) return partner.name;
    if (typeof partner.address === 'string') {
        try {
            const parsed = JSON.parse(partner.address);
            if (parsed.city || parsed.cidade) return `${partner.name} - ${parsed.city || parsed.cidade}`;
        } catch (e) { /* ignora erro de parse */ }
        return `${partner.name} - ${partner.address}`;
    }
    if (typeof partner.address === 'object') {
      const parts = [
        partner.address.street || partner.address.rua,
        partner.address.city || partner.address.cidade,
      ].filter(Boolean);
      return parts.length > 0 ? `${partner.name} - ${parts.join(', ')}` : partner.name;
    }
    return partner.name;
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Calendar className="w-16 h-16 text-white/40 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Calendar className="w-16 h-16 text-red-400 mb-4" />
        <p className="text-white/60 text-lg mb-4">{error}</p>
        <Button onClick={loadEvents} className="bg-purple-600 hover:bg-purple-700">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Eventos Institucionais - Mesapra2</title>
        <meta name="description" content="Descubra eventos institucionais de parceiros." />
      </Helmet>

      <div className="space-y-8 py-6 px-4">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">
              Eventos Institucionais
            </h1>
            <p className="text-white/60 text-lg">
              Veja os eventos criados por outros parceiros
            </p>
            {filteredEvents.length > 0 && (
              <p className="text-white/40 text-sm mt-2">
                {filteredEvents.length} {filteredEvents.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
              </p>
            )}
          </div>
          {/* Botão de Criar removido daqui */}
        </div>

        {/* Search */}
        <div className="glass-effect rounded-2xl p-6 border border-white/10">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              placeholder="Buscar eventos, hashtags, local, criador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 glass-effect border-white/10"
            />
          </div>
          {/* Filtros de tipo removidos */}
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event, index) => {
            const participantsForEvent = eventParticipantsMap[event.id] || [];
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/event/${event.id}`}>
                  <div className="glass-effect rounded-2xl p-6 border border-white/10 hover:bg-white/5 transition-colors cursor-pointer h-full flex flex-col justify-between">
                    <div>
                      {event.creator && (
                        <div className="flex items-center gap-2 mb-4">
                           <Avatar
                              url={getAvatarUrl(event.creator)}
                              name={event.creator.username || event.creator.full_name}
                              size="sm"
                              isPublic={event.creator.public_profile}
                           />
                          <div className='min-w-0'>
                            <p className="text-white/80 text-sm font-medium truncate">
                              {event.creator.username || event.creator.full_name || 'Anfitrião'}
                            </p>
                            <p className="text-white/50 text-xs">Organizador</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                             <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
                               Institucional
                             </span>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                              {event.status}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                            {event.title}
                          </h3>
                          <p className="text-white/60 text-sm line-clamp-2 mb-3">
                            {event.description}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center text-white/60 text-sm">
                          <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">
                            {format(new Date(event.start_time), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center text-white/60 text-sm">
                          <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">
                            até {format(new Date(event.end_time), "HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center text-white/60 text-sm">
                          <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">
                            {getPartnerAddress(event.partner)}
                          </span>
                        </div>
                        <div className="flex items-center text-white/60 text-sm">
                          <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                          {event.vagas} {event.vagas === 1 ? 'vaga disponível' : 'vagas disponíveis'}
                        </div>
                      </div>

                      {event.hashtags && event.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-4">
                            {event.hashtags.slice(0, 3).map((tag, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs flex items-center"
                              >
                                <Tag className="w-3 h-3 mr-1" />
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/10">
                      {participantsForEvent.length > 0 ? (
                        <>
                          <h4 className="text-sm font-medium text-white/80 mb-2">
                              Participantes ({participantsForEvent.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                              {participantsForEvent.slice(0, 5).map(participant => (
                                <Avatar
                                    key={participant.id}
                                    url={getAvatarUrl(participant)}
                                    name={participant.username || participant.full_name}
                                    size="xs"
                                    isPublic={participant.public_profile}
                                />
                              ))}
                          </div>
                        </>
                      ) : (
                           <p className="text-xs text-white/50">Seja o primeiro a participar!</p>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {filteredEvents.length === 0 && !loading && (
          <div className="glass-effect rounded-2xl p-12 border border-white/10 text-center mt-8">
            <Calendar className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 text-lg mb-4">
              Nenhum evento institucional encontrado
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default FeedPartnerEvent;