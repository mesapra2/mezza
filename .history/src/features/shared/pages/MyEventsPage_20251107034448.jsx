// src/features/shared/pages/MyEventsPage.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types'; 
import {
  Calendar,
  Users,
  MapPin,
  Clock,
  Plus,
  Edit,
  EyeOff,
  Camera,
  CheckCircle,
  AlertCircle,
  Loader,
  Star,
  Key,
  Lock,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { format, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/features/shared/components/ui/use-toast';
import EventStatusService from '@/services/EventStatusService';
import EventPhotosService from '@/services/EventPhotosService';
import EventEntryForm from '@/features/shared/components/ui/EventEntryForm';
import { useEventThumbnails } from '@/hooks/useEventThumbnail';

// Componente para renderizar thumbnail do carousel
const EventThumbnail = ({ eventId, thumbnails }) => {
  // ✅ CORREÇÃO 1 (Hooks): Chamada de hooks (useState/useEffect) sempre no topo.
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const thumbnail = thumbnails.get(eventId);
  
  // Desestruturação segura para evitar erros se 'thumbnail' for undefined/null
  const { url, isLoading } = thumbnail || {}; 
  
  // Resetar estados quando URL muda (Hook é chamado no topo)
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [url]);

  // ✅ RETORNO CONDICIONAL SÓ PODE VIR DEPOIS DOS HOOKS.
  if (!thumbnail) return null;

  const showImage = url && !imageError;

  return (
    <div className="relative w-full h-32 rounded-t-2xl overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 -mx-6 -mt-6 mb-4">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50">
          <Loader className="w-6 h-6 text-white/60 animate-spin" />
        </div>
      )}

      {showImage ? (
        <>
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-800 animate-pulse" />
          )}
          <img
            src={url}
            alt="Thumbnail do evento"
            loading="lazy"
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {imageLoaded && (
            <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
              <ImageIcon className="w-3 h-3 text-white" />
              <span className="text-xs text-white">Carousel</span>
            </div>
          )}
        </>
      ) : !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <ImageIcon className="w-8 h-8 text-white/30" />
          <span className="text-xs text-white/40">Sem foto</span>
        </div>
      )}
    </div>
  );
};

// ✅ CORREÇÃO 2 (PropTypes): Adicionar PropTypes para resolver avisos do ESLint
EventThumbnail.propTypes = {
    eventId: PropTypes.string.isRequired,
    thumbnails: PropTypes.instanceOf(Map).isRequired, 
};


const MyEventsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [filter, setFilter] = useState('futuros');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [eventStats, setEventStats] = useState({});
  const [uploading, setUploading] = useState({});

  // ✅ NOVO: Armazena eventos onde sou participante
  const [participatingEvents, setParticipatingEvents] = useState([]);

  // ✅ NOVO: Estado para mostrar/esconder formulário de senha
  const [showPasswordForm, setShowPasswordForm] = useState({});

  // ✅ Buscar thumbnails dos eventos do carousel
  const thumbnails = useEventThumbnails(filteredEvents);

  // --------------------------------------------------
  // ✅ CARREGAR EVENTOS ONDE SOU CRIADOR
  // --------------------------------------------------
  const loadCreatedEvents = useCallback(async () => {
    if (!user?.id) return [];
    try {
      const { data, error: fetchError } = await supabase
        .from('events')
        .select(
          `
          *,
          partner:partners(id, name, address),
          creator:profiles!events_creator_id_fkey(
            id, username, avatar_url, full_name, public_profile
          )
        `,
        )
        .eq('creator_id', user.id)
        .eq('hidden', false)
        .order('start_time', { ascending: false });

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      console.error('Erro ao carregar eventos criados:', err);
      return [];
    }
  }, [user?.id]);

  // --------------------------------------------------
  // ✅ CARREGAR EVENTOS ONDE SOU PARTICIPANTE
  // --------------------------------------------------
  const loadParticipatingEvents = useCallback(async () => {
    if (!user?.id) return [];
    try {
      // 1. Buscar minhas participações aprovadas
      const { data: participations, error: partError } = await supabase
        .from('event_participants')
        .select('event_id, presenca_confirmada, com_acesso')
        .eq('user_id', user.id)
        .eq('status', 'aprovado');

      if (partError) throw partError;
      if (!participations || participations.length === 0) return [];

      const eventIds = participations.map(p => p.event_id);

      // 2. Buscar os eventos completos
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(
          `
          *,
          partner:partners(id, name, address),
          creator:profiles!events_creator_id_fkey(
            id, username, avatar_url, full_name, public_profile
          )
        `,
        )
        .in('id', eventIds)
        .eq('hidden', false)
        .order('start_time', { ascending: false });

      if (eventsError) throw eventsError;

      // 3. ✅ Adicionar dados de participação ao evento
      const eventsWithParticipation = (eventsData || []).map(event => {
        const participation = participations.find(p => p.event_id === event.id);
        return {
          ...event,
          myParticipation: participation
        };
      });

      return eventsWithParticipation;
    } catch (err) {
      console.error('Erro ao carregar eventos participando:', err);
      return [];
    }
  }, [user?.id]);
  // --------------------------------------------------
  // ✅ CARREGAR TODOS OS EVENTOS (CRIADOS + PARTICIPANDO)
  // --------------------------------------------------
  const loadEvents = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    
    try {
      const [createdEvents, participatingEventsData] = await Promise.all([
        loadCreatedEvents(),
        loadParticipatingEvents(),
      ]);

      // Combinar sem duplicatas (prioriza eventos criados)
      const createdIds = new Set(createdEvents.map(e => e.id));
      const uniqueParticipating = participatingEventsData.filter(e => !createdIds.has(e.id));
      
      const allEvents = [...createdEvents, ...uniqueParticipating];
      
      setEvents(createdEvents);
      setParticipatingEvents(uniqueParticipating);
      
      await loadEventStats(allEvents);
    } catch (err) {
      console.error('Erro ao carregar eventos:', err);
      setError('Erro ao carregar seus eventos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadCreatedEvents, loadParticipatingEvents]);

  useEffect(() => {
    if (user?.id) {
      loadEvents();
    }
  }, [user?.id, loadEvents]);

  // --------------------------------------------------
  // CARREGAR ESTATÍSTICAS DE PARTICIPAÇÃO
  // --------------------------------------------------
  const loadEventStats = async (eventList) => {
    const stats = {};
    for (const event of eventList) {
      const result = await EventStatusService.getEventStats(event.id);
      if (result.success && result.data?.participants) {
        stats[event.id] = result.data;
      }
    }
    setEventStats(stats);
  };

  // --------------------------------------------------
  // ✅ FILTRAR EVENTOS (CRIADOS + PARTICIPANDO) - CORRIGIDO
  // --------------------------------------------------
  const filterEvents = useCallback(() => {
    const now = new Date();
    const allEvents = [...events, ...participatingEvents];
    let filtered = allEvents;

    switch (filter) {
      case 'futuros':
        // ✅ CORREÇÃO: Incluir eventos "Em Andamento" no filtro futuros
        filtered = allEvents.filter((e) => {
          const endTime = new Date(e.end_time);
          const isActive = e.status === 'Em Andamento';
          return endTime >= now || isActive;
        });
        break;
      case 'passados':
        filtered = allEvents.filter((e) => new Date(e.end_time) < now && e.status !== 'Em Andamento');
        break;
      case 'finalizados':
        filtered = allEvents.filter((e) => e.status === 'Finalizado');
        break;
      case 'concluidos':
        filtered = allEvents.filter((e) => e.status === 'Concluído');
        break;
      default:
        filtered = allEvents;
    }

    setFilteredEvents(filtered);
  }, [events, participatingEvents, filter]);

  useEffect(() => {
    filterEvents();
  }, [filterEvents]);

  // --------------------------------------------------
  // OCULTAR EVENTO
  // --------------------------------------------------
  const handleHideEvent = async (eventId) => {
    if (!window.confirm('Tem certeza que deseja ocultar este evento? Ele não aparecerá mais no seu histórico.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('events')
        .update({ hidden: true })
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: 'Evento ocultado',
        description: 'O evento foi removido do seu histórico.',
      });
      await loadEvents();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível ocultar o evento.',
      });
    }
  };

  // --------------------------------------------------
  // UPLOAD DE FOTO
  // --------------------------------------------------
  const handlePhotoUpload = async (eventId) => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading((prev) => ({ ...prev, [eventId]: true }));

    try {
      const result = await EventPhotosService.uploadEventPhoto(eventId, user.id, file);
      if (result.success) {
        toast({ title: 'Foto enviada!', description: 'Sua foto foi publicada no evento.' });
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: result.error });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha no upload da foto.' });
    } finally {
      setUploading((prev) => ({ ...prev, [eventId]: false }));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --------------------------------------------------
  // PODE ENVIAR FOTO?
  // --------------------------------------------------
  const canUploadPhoto = (event) => {
    if (!['Finalizado', 'Concluído'].includes(event.status)) return false;

    const stats = eventStats[event.id];
    if (!stats?.participants || !Array.isArray(stats.participants)) return false;

    const myParticipation = stats.participants.find((p) => p.user_id === user.id);
    if (!myParticipation?.presenca_confirmada) return false;

    const monthsSinceEnd = differenceInMonths(new Date(), new Date(event.end_time));
    return monthsSinceEnd < 6;
  };

  // --------------------------------------------------
  // ✅ VERIFICAR SE SOU CRIADOR DO EVENTO
  // --------------------------------------------------
  const isEventCreator = (event) => {
    return event.creator_id === user?.id;
  };

  // --------------------------------------------------
  // ✅ DEVE MOSTRAR SENHA DO ANFITRIÃO? (1 min antes de começar até 2 min antes de acabar)
  // --------------------------------------------------
  const shouldShowPassword = (event) => {
    // Só mostra senha se for o criador
    if (!isEventCreator(event)) return false;
    if (!event.event_entry_password) return false;
    
    const now = new Date();
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    
    // 1 minuto antes de começar
    const oneMinuteBeforeStart = new Date(startTime.getTime() - 60 * 1000);
    
    // 2 minutos antes de acabar
    const twoMinutesBeforeEnd = new Date(endTime.getTime() - 2 * 60 * 1000);
    
    // Está no período correto?
    return now >= oneMinuteBeforeStart && now < twoMinutesBeforeEnd;
  };

  // --------------------------------------------------
  // ✅ NOVO: DEVE MOSTRAR INPUT DE SENHA PARA PARTICIPANTE?
  // --------------------------------------------------
  const shouldShowPasswordInput = (event) => {
    // Não é o criador
    if (isEventCreator(event)) return false;
    
    // Evento deve estar "Em Andamento"
    if (event.status !== 'Em Andamento') return false;
    
    // Deve ter dados de participação
    if (!event.myParticipation) return false;
    
    // Ainda não confirmou presença
    if (event.myParticipation.presenca_confirmada) return false;
    
    // Ainda não tem acesso
    if (event.myParticipation.com_acesso) return false;
    
    return true;
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-12 h-12 text-white/40 animate-spin" />
      </div>
    );
  }

  // --------------------------------------------------
  // FILTROS
  // --------------------------------------------------
  const filters = [
    { value: 'futuros', label: 'Futuros' },
    { value: 'passados', label: 'Passados' },
    { value: 'finalizados', label: 'Finalizados' },
    { value: 'concluidos', label: 'Concluídos' },
  ];

  return (
    <>
      <Helmet>
        <title>Meus Eventos - Mesapra2</title>
        <meta name="description" content="Gerencie seus eventos criados no Mesapra2" />
      </Helmet>

      <div className="py-6 px-4 sm:px-6 lg:px-8 space-y-6 max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-white">Meus Eventos</h1>
          <Link to="/criar-evento">
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Plus className="w-5 h-5 mr-2" /> Criar Evento
            </Button>
          </Link>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? 'default' : 'outline'}
              onClick={() => setFilter(f.value)}
              className={
                filter === f.value
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                  : 'glass-effect border-white/10'
              }
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Erro */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Grid de Eventos */}
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event, index) => {
              const stats = eventStats[event.id] || {};
              const participants = Array.isArray(stats.participants) ? stats.participants : [];
              const isFinalized = event.status === 'Finalizado';
              const isConcluded = event.status === 'Concluído';
              const canUpload = canUploadPhoto(event);
              const isUploading = uploading[event.id];
              const showPassword = shouldShowPassword(event);
              const showPasswordInput = shouldShowPasswordInput(event);
              const isCreator = isEventCreator(event);

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-effect rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all h-full flex flex-col justify-between overflow-hidden"
                >
                  {/* Thumbnail do Carousel */}
                  {/* 🚨 CORREÇÃO APLICADA AQUI: Convertendo event.id para String */}
                  <EventThumbnail eventId={String(event.id)} thumbnails={thumbnails} />

                  {/* Status + Badge de Participante */}
                  <div className="mb-4 flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        isConcluded
                          ? 'bg-green-500/20 text-green-300'
                          : isFinalized
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : event.status === 'Em Andamento'
                          ? 'bg-purple-500/20 text-purple-300 animate-pulse'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {event.status}
                    </span>
                    
                    {/* ✅ Badge de Participante */}
                    {!isCreator && (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Participante
                      </span>
                    )}
                  </div>

                  {/* 🔑 SENHA DO EVENTO (só para criadores) */}
                  {showPassword && (
                    <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-400/40 animate-pulse">
                      <div className="flex items-center gap-2 mb-2">
                        <Key className="w-5 h-5 text-purple-300" />
                        <h4 className="text-sm font-bold text-purple-200">Senha do Evento</h4>
                      </div>
                      <div className="bg-black/30 rounded-lg p-3 text-center">
                        <p className="text-3xl font-mono font-bold text-white tracking-widest">
                          {event.event_entry_password}
                        </p>
                      </div>
                      <p className="text-xs text-purple-200/80 mt-2 text-center">
                        Compartilhe esta senha com os participantes para iniciar o evento
                      </p>
                    </div>
                  )}

                  {/* 🔐 FORMULÁRIO DE SENHA PARA PARTICIPANTE - USANDO EventEntryForm */}
                  {showPasswordInput && (
                    <div className="mb-4">
                      {showPasswordForm[event.id] ? (
                        <EventEntryForm
                          eventId={String(event.id)}
                          onSuccess={() => {
                            setShowPasswordForm(prev => ({ ...prev, [event.id]: false }));
                            loadEvents();
                          }}
                          isDisabled={false}
                        />
                      ) : (
                        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-2 border-blue-400/40">
                          <div className="flex items-center gap-2 mb-3">
                            <Lock className="w-5 h-5 text-blue-300" />
                            <h4 className="text-sm font-bold text-blue-200">Digite a Senha de Entrada</h4>
                          </div>
                          <p className="text-xs text-blue-200/80 mb-3">
                            O anfitrião compartilhará a senha para você acessar o evento
                          </p>
                          <Button
                            onClick={() => setShowPasswordForm(prev => ({ ...prev, [event.id]: true }))}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Lock className="w-4 h-4 mr-2" />
                            Digitar Senha
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

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
                        até {format(new Date(event.end_time), 'HH:mm', { locale: ptBR })}
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

                  {/* Avaliações (Finalizado) */}
                  {isFinalized && participants.length > 0 && isCreator && (
                    <div className="my-4 p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-xs text-white/60 mb-2">Avaliações:</p>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm text-white">
                          {participants.filter((p) => p.avaliacao_feita).length} de{' '}
                          {participants.filter((p) => p.presenca_confirmada).length} avaliados
                        </span>
                      </div>
                      <p className="text-xs text-white/50 mt-2">
                        Será concluído automaticamente quando todos avaliarem ou em 7 dias
                      </p>
                    </div>
                  )}

                  {/* Concluído */}
                  {isConcluded && (
                    <div className="my-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-sm text-green-200">Evento concluído com sucesso!</p>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="space-y-2 pt-4 border-t border-white/10">
                    {/* Primeira linha: Editar + Ver Detalhes (não concluído) */}
                    {!isConcluded && (
                      <div className="flex gap-2">
                        {isCreator && (
                          <Link to={`/editar-evento/${event.id}`} className="flex-1">
                            <Button variant="outline" className="w-full border-white/20">
                              <Edit className="w-4 h-4 mr-2" /> Editar
                            </Button>
                          </Link>
                        )}
                        <Link to={`/event/${event.id}`} className="flex-1">
                          <Button variant="outline" className="w-full border-white/20">
                            Ver Detalhes
                          </Button>
                        </Link>
                      </div>
                    )}

                    {/* Concluído: Ver + Ocultar (só criador) */}
                    {isConcluded && (
                      <div className="flex gap-2">
                        <Link to={`/event/${event.id}`} className="flex-1">
                          <Button variant="outline" className="w-full border-white/20">
                            Ver Detalhes
                          </Button>
                        </Link>
                        {isCreator && (
                          <Button
                            variant="ghost"
                            onClick={() => handleHideEvent(event.id)}
                            className="flex-1 text-purple-400 hover:bg-purple-500/10"
                          >
                            <EyeOff className="w-4 h-4 mr-1" /> Ocultar
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Segunda linha: Qualificar + Foto */}
                    {(isFinalized || isConcluded) && (
                      <div className="flex gap-2">
                        <Link to={`/event/${event.id}`} className="flex-1">
                          <Button
                            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold"
                          >
                            <Star className="w-4 h-4 mr-2" />
                            Qualificar
                          </Button>
                        </Link>

                        {/* Botão Enviar Foto */}
                        {canUpload && (
                          <>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={() => handlePhotoUpload(event.id)}
                            />
                            <Button
                              variant="outline"
                              className="flex-1 border-white/20"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading}
                            >
                              {isUploading ? (
                                <Loader className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Camera className="w-4 h-4 mr-2" />
                              )}
                              {isUploading ? 'Enviando...' : 'Foto'}
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          // Sem eventos
          <div className="glass-effect rounded-2xl p-12 border border-white/10 text-center">
            <AlertCircle className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 text-lg mb-4">
              {events.length === 0 && participatingEvents.length === 0
                ? 'Você não criou eventos ainda'
                : `Nenhum evento ${
                    filter === 'futuros'
                      ? 'futuro'
                      : filter === 'passados'
                      ? 'passado'
                      : filter === 'finalizados'
                      ? 'finalizado'
                      : 'concluído'
                  }`}
            </p>
            <Link to="/criar-evento">
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500">
                <Plus className="w-5 h-5 mr-2" /> Criar Evento
              </Button>
            </Link>
          </div>
        )}
      </div>
    </>
  );
};



export default MyEventsPage;