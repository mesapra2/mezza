import { useState, useEffect, useCallback } from 'react';
import { Helmet } from "react-helmet-async";
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, Calendar, Users, MapPin, Tag, Clock, Plus } from 'lucide-react';
import { Input } from '@/features/shared/components/ui/input';
import { Button } from '@/features/shared/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Avatar from '@/features/shared/components/profile/Avatar';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [eventParticipantsMap, setEventParticipantsMap] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEvents();
  }, []);

  // ✅ FUNÇÃO CORRIGIDA: getAvatarUrl
  const getAvatarUrl = (profile, nameFallback = 'U') => {
    // Fallback se não tem avatar
    if (!profile?.avatar_url) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        profile?.username || profile?.full_name || nameFallback
      )}&background=8b5cf6&color=fff&size=40`;
    }

    // ✅ CORREÇÃO 1: Limpar URL (remover espaços/quebras de linha)
    const cleanUrl = profile.avatar_url.trim();
    
    // ✅ DEBUG: Log para verificar (remova depois que funcionar)
    console.log('🔍 DEBUG Avatar:', {
      profileId: profile?.id,
      username: profile?.username,
      originalUrl: profile?.avatar_url,
      cleanUrl: cleanUrl,
      isHttp: cleanUrl.startsWith('http')
    });
    
    // ✅ CORREÇÃO 2: Validar se URL está completa e válida
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      // Adicionar timestamp para forçar atualização (quebrar cache)
      const separator = cleanUrl.includes('?') ? '&' : '?';
      return `${cleanUrl}${separator}t=${Date.now()}`;
    }

    // ✅ CORREÇÃO 3: Se for path relativo, construir URL do Supabase
    // Detectar bucket correto
    let bucketName = 'avatars';
    if (cleanUrl.includes('photos/') || cleanUrl.startsWith('photos/')) {
      bucketName = 'photos';
    } else if (cleanUrl.includes('event-photos/')) {
      bucketName = 'event-photos';
    }

    try {
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(cleanUrl);
      
      return `${data.publicUrl}?t=${Date.now()}`;
    } catch (error) {
      console.error('Erro ao construir URL do avatar:', error);
      // Retornar fallback em caso de erro
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        profile?.username || profile?.full_name || nameFallback
      )}&background=8b5cf6&color=fff&size=40`;
    }
  };

  const loadEvents = async () => {
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
        .order('start_time', { ascending: true });

      // Fallbacks
      if (fetchError && !data) {
        console.warn('Erro com join completo, tentando sem creator:', fetchError);
        const fallback = await supabase.from('events').select(`*, partner:partners(id, name, address)`).order('start_time', { ascending: true });
        data = fallback.data;
        fetchError = fallback.error;
      }
      if (fetchError && !data) {
        console.warn('Erro com joins, carregando apenas eventos:', fetchError);
        const simple = await supabase.from('events').select('*').order('start_time', { ascending: true });
        data = simple.data;
        fetchError = simple.error;
      }
      if (fetchError) throw fetchError;
      if (!data) data = [];

      const now = new Date();
      const validEvents = data.filter(event => {
        try {
            const eventDate = new Date(event.start_time);
            if (isNaN(eventDate.getTime())) {
                console.warn("Data inválida encontrada para evento ID:", event.id, "Data:", event.start_time);
                return false;
            }
            const isFuture = eventDate >= now;
            const statusLower = typeof event.status === 'string' ? event.status.toLowerCase() : '';
            const hasValidStatus = ['aberto', 'confirmado'].includes(statusLower);
            return isFuture && hasValidStatus;
        } catch(e) {
            console.error("Erro ao processar data do evento:", event.id, event.start_time, e);
            return false;
        }
      });

      setEvents(validEvents);

      // ✅ CORREÇÃO: Busca participantes em lote com foreign key correta
      if (validEvents.length > 0) {
        const eventIds = validEvents.map(e => e.id);
        const { data: participationsData, error: participantsError } = await supabase
          .from('event_participants')
          .select('event_id, user_id, profiles!event_participants_user_id_fkey(id, username, avatar_url, full_name, public_profile)')
          .in('event_id', eventIds)
          .eq('status', 'aprovado');

        if (participantsError) {
          console.error("Erro ao buscar participantes:", participantsError);
        } else if (participationsData) {
          // ✅ CORREÇÃO: profiles ao invés de profile
          const participantsMap = participationsData.reduce((acc, participation) => {
            if (!participation.profiles) return acc;
            const eventId = participation.event_id;
            if (!acc[eventId]) acc[eventId] = [];
            acc[eventId].push(participation.profiles);
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
  };

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

    if (selectedType !== 'todos') {
        filtered = filtered.filter(e => e.event_type === selectedType || (selectedType === 'crusher' && e.event_type === 'Mesapra2'));
    }

    setFilteredEvents(filtered);
  }, [events, searchTerm, selectedType]);

  useEffect(() => {
    filterEvents();
  }, [filterEvents]);

  const eventTypes = [
    { value: 'todos', label: 'Todos' },
    { value: 'padrao', label: 'Padrão' },
    { value: 'particular', label: 'Particular' },
    { value: 'crusher', label: 'Mesapra2' },
    { value: 'institucional', label: 'Institucional' },
  ];

  const getPartnerAddress = (partner) => {
    if (!partner) return 'Local não informado';
    if (!partner.address) return partner.name;

    if (typeof partner.address === 'string') {
        try {
            const parsed = JSON.parse(partner.address);
            if (parsed.city || parsed.cidade) return `${partner.name} - ${parsed.city || parsed.cidade}`;
        } catch (e) {
            // Endereço não é JSON
        }
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
        <title>Eventos - Mesapra2</title>
        <meta name="description" content="Descubra eventos sociais incríveis em restaurantes. Encontre pessoas com interesses similares." />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Mesapra2 - Descubra Eventos Incríveis" />
        <meta property="og:description" content="Participe de experiências gastronômicas únicas e conecte-se com pessoas de verdade." />
        <meta property="og:image" content="https://app.mesapra2.com/og-default.jpg" />
        <meta property="og:url" content="https://app.mesapra2.com/eventos" />
        <meta property="og:site_name" content="Mesapra2" />
        <meta property="og:locale" content="pt_BR" />
      </Helmet>

      <div className="space-y-8 py-6 px-4">
        {/* HEADER COM BOTÃO CRIAR */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">
              Descubra Eventos
            </h1>
            <p className="text-white/60 text-lg">
              Encontre experiências incríveis e conecte-se com pessoas
            </p>
            {filteredEvents.length > 0 && (
              <p className="text-white/40 text-sm mt-2">
                {filteredEvents.length} {filteredEvents.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
              </p>
            )}
          </div>

          <Link to="/criar-evento">
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 font-semibold whitespace-nowrap">
              <Plus className="w-5 h-5 mr-2" />
              Criar Evento
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="glass-effect rounded-2xl p-6 border border-white/10">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                placeholder="Buscar eventos, hashtags, local, criador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass-effect border-white/10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {eventTypes.map((type) => (
                <Button
                  key={type.value}
                  variant={selectedType === type.value ? 'default' : 'outline'}
                  onClick={() => setSelectedType(type.value)}
                  className={`whitespace-nowrap ${selectedType === type.value
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                    : 'glass-effect border-white/10'
                  }`}
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>
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
                              key={`avatar-creator-${event.creator.id}-${event.creator.avatar_url || 'default'}`}
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
                             <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                event.event_type === 'crusher' || event.event_type === 'Mesapra2'
                                  ? 'bg-pink-500/20 text-pink-300'
                                  : event.event_type === 'institucional'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : event.event_type === 'particular'
                                  ? 'bg-purple-500/20 text-purple-300'
                                  : 'bg-green-500/20 text-green-300'
                             }`}>
                               {event.event_type}
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
                            {event.hashtags.length > 3 && (
                              <span className="px-2 py-1 rounded-full bg-white/10 text-white/60 text-xs">
                                +{event.hashtags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/10">
                      {participantsForEvent.length > 0 ? (
                        <>
                          <h4 className="text-sm font-medium text-white/80 mb-2">
                              Participantes Aprovados ({participantsForEvent.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                              {participantsForEvent.slice(0, 5).map(participant => (
                                <Avatar
                                    key={`avatar-participant-${participant.id}-${participant.avatar_url || 'default'}`}
                                    url={getAvatarUrl(participant)}
                                    name={participant.username || participant.full_name}
                                    size="xs"
                                    isPublic={participant.public_profile}
                                />
                              ))}
                              {participantsForEvent.length > 5 && (
                                  <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-white/70 border-2 border-background">
                                    +{participantsForEvent.length - 5}
                                  </div>
                              )}
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
              {events.length === 0
                ? 'Nenhum evento disponível no momento'
                : 'Nenhum evento encontrado com esses filtros'}
            </p>
            <p className="text-white/40 text-sm mb-6">
              {events.length === 0
                ? 'Seja o primeiro a criar um evento incrível!'
                : 'Tente ajustar seus filtros ou criar um novo evento'}
            </p>
            <Link to="/criar-evento">
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                <Plus className="w-5 h-5 mr-2" />
                {events.length === 0 ? 'Criar Primeiro Evento' : 'Criar Novo Evento'}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default EventsPage;