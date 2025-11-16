// src/features/shared/pages/EventDetails.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Calendar, Users, MapPin, Clock, CheckCircle, X, AlertTriangle, Loader, Camera, Star, StopCircle, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import EventApply from '@/features/shared/components/events/EventApply';
import Avatar from '@/features/shared/components/profile/Avatar';
import ParticipantsManagement from '@/features/shared/components/events/ParticipantsManager';
import EventEvaluationSection from '@/features/shared/components/events/EventEvaluationSection';
import EventEntryForm from '@/features/shared/components/ui/EventEntryForm';
import DisapproveUserModal from '@/components/DisapproveUserModal';
import EventPasswordCard from '@/features/partner/components/EventPasswordCard';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInMinutes, differenceInHours, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/features/shared/components/ui/button';
import ParticipationService from '@/services/ParticipationService';
import EventSecurityService from '@/services/EventSecurityService';
import EventPhotosService from '@/services/EventPhotosService';
import { useToast } from '@/features/shared/components/ui/use-toast';
import EarlyEndEventModal from '@/components/EarlyEndEventModal';

// ============================================
// COMPONENTE: EventEntryStats 
// ============================================
const EventEntryStats = ({ eventId }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const result = await ParticipationService.getEventEntryStats(eventId);
        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
        console.error('Erro ao carregar stats:', error);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, [eventId]);

  if (!stats) return <div className="text-xs text-slate-400">Carregando...</div>;

  return (
    <div className="space-y-2 text-xs text-slate-400">
      <div className="flex justify-between">
        <span>Total de participantes:</span>
        <span className="text-white font-semibold">{stats.totalParticipants}</span>
      </div>
      <div className="flex justify-between">
        <span>Com acesso:</span>
        <span className="text-green-400 font-semibold">{stats.participantsWithAccess}</span>
      </div>
      <div className="flex justify-between">
        <span>Sem acesso:</span>
        <span className="text-orange-400 font-semibold">{stats.participantsWithoutAccess}</span>
      </div>

      <div className="mt-3 w-full bg-slate-700 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-600 to-green-500 transition-all"
          style={{ width: `${stats.accessPercentage}%` }}
        ></div>
      </div>
      <div className="text-center text-xs text-slate-500">
        {stats.accessPercentage}% de acesso
      </div>
    </div>
  );
};

EventEntryStats.propTypes = {
  eventId: PropTypes.number.isRequired
};

// ============================================
// COMPONENTE PRINCIPAL: EventDetails
// ============================================
const EventDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  // Estados básicos - versão simplificada sem hooks customizados por enquanto
  const [event, setEvent] = useState(null);
  const [creator, setCreator] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [userParticipation, setUserParticipation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados específicos do componente
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryIsBlocked, setEntryIsBlocked] = useState(false);
  const [entryStatus, setEntryStatus] = useState('');
  const [userHasAccess, setUserHasAccess] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showEarlyEndModal, setShowEarlyEndModal] = useState(false);
  const [disapprovalModal, setDisapprovalModal] = useState({ 
    isOpen: false, 
    userId: null, 
    userName: null 
  });

  // Função básica para carregar dados do evento
  const fetchEventData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*, partners(id, name, address)')
        .eq('id', id)
        .single();

      if (eventError) throw eventError;
      if (!eventData) throw new Error('Evento não encontrado');

      // ✅ CORREÇÃO: Se eventData for um array, pegar o primeiro elemento
      const event = Array.isArray(eventData) ? eventData[0] : eventData;
      
      console.log('🔍 Debug fetchEventData:', {
        rawData: eventData,
        isArray: Array.isArray(eventData),
        processedEvent: event,
        eventTitle: event?.title
      });

      setEvent(event);

      // Buscar creator
      if (event.creator_id) {
        const { data: creatorData } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, public_profile')
          .eq('id', event.creator_id)
          .maybeSingle();
        setCreator(creatorData);
      }

      // Buscar participação do usuário
      if (user) {
        const { data: userPartData } = await supabase
          .from('event_participants')
          .select('id, status, created_at')
          .eq('event_id', id)
          .eq('user_id', user.id)
          .eq('status', 'aprovado')
          .maybeSingle();
        setUserParticipation(userPartData);
      }

      // Buscar participantes aprovados
      const { data: participationsData } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', id)
        .eq('status', 'aprovado');

      if (participationsData?.length > 0) {
        const userIds = participationsData.map(p => p.user_id);
        const { data: participantsData } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, public_profile')
          .in('id', userIds);
        setParticipants(participantsData || []);
      } else {
        setParticipants([]);
      }

    } catch (err) {
      setError(err.message || 'Erro ao carregar detalhes do evento');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  const getPartnerDisplay = () => {
    if (!event) return null;
    if (event.partners && event.partners.name) {
      let addressText = event.partners.name;
      if (event.partners.address) {
        if (typeof event.partners.address === 'string') {
          addressText += ` - ${event.partners.address}`;
        } else if (typeof event.partners.address === 'object') {
          const parts = [event.partners.address.street, event.partners.address.city].filter(Boolean);
          if (parts.length > 0) {
            addressText += ` - ${parts.join(', ')}`;
          }
        }
      }
      return addressText;
    }
    return 'Local a definir';
  };

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  // Monitorar timing de entrada
  useEffect(() => {
    if (!event || !user || !userParticipation || !event.id) return;

    const checkEntryTiming = async () => {
      try {
        const now = new Date();
        const startTime = new Date(event.start_time);
        const endTime = new Date(event.end_time);
        const oneMinBeforeStart = new Date(startTime.getTime() - 60 * 1000);
        const twoMinBeforeEnd = new Date(endTime.getTime() - 2 * 60 * 1000);

        // ✅ CORREÇÃO: Verificar se event.id existe antes de chamar a função
        if (!event.id) {
          console.error('❌ event.id está undefined');
          setUserHasAccess(false);
          return;
        }

        const hasAccess = await EventSecurityService.hasUserAccess(parseInt(event.id), user.id);
        setUserHasAccess(hasAccess);

        if (hasAccess) {
          setShowEntryForm(false);
          setEntryStatus('Você tem acesso ao evento');
          return;
        }

        if (now >= twoMinBeforeEnd) {
          setShowEntryForm(false);
          setEntryIsBlocked(true);
          setEntryStatus('Entrada encerrada (evento terminando)');
          return;
        }

        if (now >= oneMinBeforeStart && now < twoMinBeforeEnd) {
          setShowEntryForm(true);
          setEntryIsBlocked(false);
          setEntryStatus('Digite a senha para entrar!');
        } else {
          setShowEntryForm(false);
          setEntryIsBlocked(false);
          const timeUntilAvailable = oneMinBeforeStart - now;
          if (timeUntilAvailable > 0) {
            const minutesLeft = Math.floor(timeUntilAvailable / 60000);
            const secondsLeft = Math.floor((timeUntilAvailable % 60000) / 1000);
            setEntryStatus(`Entrada disponível em ${minutesLeft}m ${secondsLeft}s`);
          } else if (now < startTime) {
            setEntryStatus('Evento ainda não começou');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar timing de entrada:', error);
      }
    };

    checkEntryTiming();
    const interval = setInterval(checkEntryTiming, 1000);
    return () => clearInterval(interval);
  }, [event, user, userParticipation]);

  const handleEntrySuccess = () => {
    setShowEntryForm(false);
    setUserHasAccess(true);
    setEntryStatus('Você entrou no evento!');
    toast({ title: 'Acesso liberado!', description: 'Bem-vindo ao evento. Aproveite!' });
    fetchEventData();
  };

  const canCancelParticipation = () => {
    if (!userParticipation || !event) return { canCancel: false, reason: '' };
    const now = new Date();
    const subscriptionTime = new Date(userParticipation.created_at);
    const eventStart = new Date(event.start_time);
    const minutesSinceSubscription = differenceInMinutes(now, subscriptionTime);
    const hoursUntilEvent = differenceInHours(eventStart, now);

    if (minutesSinceSubscription > 30) {
      return { canCancel: false, reason: 'O prazo de 30 minutos para cancelamento expirou.' };
    }
    if (hoursUntilEvent < 4) {
      return { canCancel: false, reason: 'Não é possível cancelar com menos de 4 horas do evento.' };
    }
    return { canCancel: true, reason: '' };
  };

  const handleCancelParticipation = async () => {
    if (!userParticipation) return;
    setCancelLoading(true);
    try {
      const result = await ParticipationService.cancelParticipation(userParticipation.id, user.id);
      if (result.success) {
        toast({ title: 'Inscrição cancelada!', description: 'Sua participação foi cancelada com sucesso.' });
        setShowCancelConfirm(false);
        await fetchEventData();
      } else {
        toast({ variant: 'destructive', title: 'Erro ao cancelar', description: result.error || 'Não foi possível cancelar a inscrição.' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao cancelar', description: 'Ocorreu um erro inesperado.' });
    } finally {
      setCancelLoading(false);
    }
  };

  const handleInstitutionalApply = async () => {
    if (!user || !event) return;
    setIsRegistering(true);
    try {
      const { error } = await supabase
        .from('event_participants')
        .insert({ event_id: event.id, user_id: user.id, status: 'aprovado' });
      if (error) throw error;

      toast({ title: 'Inscrição Confirmada!', description: 'Você foi inscrito automaticamente neste evento.' });
      await fetchEventData();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro na inscrição', description: error.message || 'Não foi possível se inscrever.' });
    } finally {
      setIsRegistering(false);
    }
  };

  // Upload de foto
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const result = await EventPhotosService.uploadEventPhoto(parseInt(id), user.id, file);
      if (result.success) {
        toast({ title: 'Foto enviada!', description: 'Sua foto foi publicada no evento.' });
        await fetchEventData(); // Recarregar dados
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: result.error });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha no upload.' });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Calendar className="w-16 h-16 text-white/40 animate-spin" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold text-red-500 mb-4">Erro</h1>
        <p className="text-white/60 mb-8">{error || 'Evento não encontrado'}</p>
        <Button asChild>
          <Link to="/events">Voltar para Eventos</Link>
        </Button>
      </div>
    );
  }

  const isCreator = user && user.id === event.creator_id;
  const isParticipant = userParticipation !== null;
  const isEventOver = new Date(event.end_time) < new Date();
  const isEventFinalized = event.status === 'Finalizado';
  const isEventConcluded = event.status === 'Concluído';
  const hasEvaluated = userParticipation?.avaliacao_feita || false;
  const hasAttended = userParticipation?.presenca_confirmada || false;
  const cancelCheck = canCancelParticipation();
  const partnerName = event.partners ? event.partners.name : null;

  // Debug para verificar as condições
  console.log('Debug EventDetails:', {
    isCreator,
    isParticipant,
    hasAttended,
    isEventFinalized,
    userId: user?.id,
    creatorId: event.creator_id,
    eventStatus: event.status,
    showEvaluationSection: isEventFinalized && (isCreator || (isParticipant && hasAttended)),
    userParticipation,
    event: event, // Debug do objeto event
    eventType: typeof event,
    isArray: Array.isArray(event)
  });

  // ✅ LÓGICA DE EXIBIÇÃO DE FOTO SIMPLIFICADA
  const canUploadPhoto = () => {
    if (!isParticipant) return false;
    
    // Em "Finalizado": pode enviar se JÁ avaliou (todos os participantes foram marcados como presentes)
    if (isEventFinalized) {
      return hasEvaluated;
    }
    
    // Em "Concluído": pode enviar/trocar se < 6 meses
    if (isEventConcluded) {
      const monthsSinceEnd = differenceInMonths(new Date(), new Date(event.end_time));
      return monthsSinceEnd < 6;
    }
    
    return false;
  };

  return (
    <>
      <Helmet>
        <title>{event?.title || 'Evento'} - Mesapra2</title>
        <meta name="description" content={event?.description || 'Detalhes do evento no Mesapra2'} />
      </Helmet>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-6 px-4 sm:px-6 lg:px-8 space-y-6 max-w-4xl mx-auto"
      >
        <h1 className="text-3xl font-bold text-white mb-4">{event.title}</h1>

        {creator && (
          <div className="glass-effect rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">Criado por</h2>
            <div className="flex items-center gap-4">
              <Avatar url={creator.avatar_url} name={creator.username || creator.full_name} size="lg" isPublic={creator.public_profile} />
              <div>
                <p className="text-white font-medium">{creator.username || creator.full_name}</p>
                <p className="text-white/60 text-sm">Anfitrião</p>
              </div>
            </div>
          </div>
        )}

        <div className="glass-effect rounded-2xl p-6 border border-white/10">
          <p className="text-white/80 mb-6">{event.description}</p>

          <div className="space-y-4">
            <div className="flex items-center text-white/60">
              <Calendar className="w-5 h-5 mr-3" />
              {(() => {
                try {
                  if (!event.start_time) return 'Data não informada';
                  const startDate = new Date(event.start_time);
                  if (isNaN(startDate.getTime())) return 'Data inválida';
                  return format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
                } catch (error) {
                  console.error('Erro ao formatar data:', error, 'start_time:', event.start_time);
                  return 'Data inválida';
                }
              })()}
            </div>
            <div className="flex items-center text-white/60">
              <Clock className="w-5 h-5 mr-3" />
              {(() => {
                try {
                  if (!event.start_time || !event.end_time) return 'Horário não informado';
                  const startDate = new Date(event.start_time);
                  const endDate = new Date(event.end_time);
                  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 'Horário inválido';
                  return `De ${format(startDate, 'HH:mm', { locale: ptBR })} até ${format(endDate, 'HH:mm', { locale: ptBR })}`;
                } catch (error) {
                  console.error('Erro ao formatar horário:', error, 'start_time:', event.start_time, 'end_time:', event.end_time);
                  return 'Horário inválido';
                }
              })()}
            </div>
            <div className="flex items-center text-white/60">
              <MapPin className="w-5 h-5 mr-3" />
              {getPartnerDisplay()}
            </div>
            <div className="flex items-center text-white/60">
              <Users className="w-5 h-5 mr-3" />
              {event.vagas} vagas disponíveis
            </div>
          </div>
        </div>

        {participants.length > 0 && (
          <div className="glass-effect rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Participantes Aprovados ({participants.length})</h2>
              
              {/* ✅ NOVO: Botão para entrar no chat quando há aprovados */}
              {(isCreator || isParticipant) && (
                <Link to={`/event/${event.id}/chat`}>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="glass-effect border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat do Evento
                  </Button>
                </Link>
              )}
            </div>
            
            <div className="flex flex-wrap gap-4">
              {participants.map(participant => (
                <div key={participant.id} className="flex flex-col items-center gap-2">
                  <Avatar url={participant.avatar_url} name={participant.username || participant.full_name} size="md" isPublic={participant.public_profile} />
                  <p className="text-white/80 text-sm">{participant.username || participant.full_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isCreator && !isEventFinalized && !isEventConcluded && (
          <ParticipantsManagement 
            eventId={String(event.id)} 
            eventType={event.event_type} 
            onUpdate={fetchEventData}
            onDisapprove={(userId, userName) => {
              setDisapprovalModal({
                isOpen: true,
                userId,
                userName
              });
            }}
          />
        )}

        {/* Inscrição */}
        {(() => {
          console.log('🔍 Debug Inscrição:', {
            isCreator,
            isParticipant,
            eventType: event?.event_type,
            shouldShowApply: !isCreator && !isParticipant,
            eventStatus: event?.status
          });
          return null;
        })()}
        {!isCreator && !isParticipant && (
          <>
            {event.event_type === 'institucional' ? (
              <div className="glass-effect rounded-2xl p-6 border border-white/10">
                <h2 className="text-xl font-semibold text-white mb-4">Inscrição Direta</h2>
                <p className="text-white/70 text-sm mb-6">
                  Este é um evento institucional. Sua inscrição será aprovada automaticamente.
                </p>
                <Button onClick={handleInstitutionalApply} disabled={isRegistering} className="w-full">
                  {isRegistering ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Inscrever-se Agora
                </Button>
              </div>
            ) : (
              event && typeof event === 'object' && !Array.isArray(event) ? (
                <EventApply event={event} onSuccess={fetchEventData} />
              ) : (
                <div className="glass-effect rounded-2xl p-6 border border-red-500/30 bg-red-500/5">
                  <p className="text-red-400">Erro: Dados do evento inválidos. Tente recarregar a página.</p>
                  {/* ✅ DEBUG: Mostrar detalhes do erro */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 text-xs text-red-300">
                      Debug: event = {JSON.stringify(event)}<br/>
                      Tipo: {typeof event}<br/>
                      É array: {Array.isArray(event).toString()}<br/>
                      É null: {(event === null).toString()}
                    </div>
                  )}
                </div>
              )
            )}
          </>
        )}

        {/* Entrada com senha */}
        {!isCreator && isParticipant && !userHasAccess && (event.status === 'Confirmado' || event.status === 'Em Andamento') && (
          <div className="glass-effect rounded-2xl p-6 border border-blue-500/30 bg-blue-500/5">
            <div className="text-center mb-6">
              <p className="text-sm text-slate-300">{entryStatus}</p>
            </div>
            {showEntryForm && !entryIsBlocked && <EventEntryForm eventId={event.id} onSuccess={handleEntrySuccess} isDisabled={entryIsBlocked} />}
            {entryIsBlocked && (
              <div className="text-center p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-lg font-semibold text-red-400 mb-2">Entrada Encerrada</p>
                <p className="text-sm text-red-300">A entrada foi bloqueada. O evento está chegando ao fim.</p>
              </div>
            )}
            {!showEntryForm && !entryIsBlocked && !userHasAccess && (
              <div className="text-center p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="mb-4">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                </div>
                <p className="text-sm text-blue-300">{entryStatus}</p>
              </div>
            )}
          </div>
        )}

        {/* Acesso liberado */}
        {!isCreator && isParticipant && userHasAccess && event.status === 'Em Andamento' && (
          <div className="glass-effect rounded-2xl p-6 border border-green-500/30 bg-green-500/5">
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg mb-4">
              <p className="text-sm text-green-400 text-center">Você tem acesso ao evento. Aproveite!</p>
            </div>
          </div>
        )}

        {/* Participante confirmado */}
        {!isCreator && isParticipant && !isEventOver && !userHasAccess && event.status !== 'Em Andamento' && (
          <div className="glass-effect rounded-2xl p-6 border border-green-500/30 bg-green-500/5">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-2">Você está participando deste evento!</h3>
                <p className="text-white/70 text-sm mb-4">
                  Sua inscrição foi confirmada. Prepare-se para uma experiência incrível!
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-white/60 text-sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{(() => {
                      try {
                        if (!event.start_time) return 'Data não informada';
                        const startDate = new Date(event.start_time);
                        if (isNaN(startDate.getTime())) return 'Data inválida';
                        return format(startDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                      } catch (error) {
                        console.error('Erro ao formatar data (linha 554):', error, 'start_time:', event.start_time);
                        return 'Data inválida';
                      }
                    })()}</span>
                  </div>
                  {partnerName && (
                    <div className="flex items-center text-white/60 text-sm">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{partnerName}</span>
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4">
                  <p className="text-blue-300 text-sm">
                    Volte aqui após o término do evento para compartilhar suas fotos e avaliar a experiência.
                  </p>
                </div>

                {cancelCheck.canCancel ? (
                  !showCancelConfirm ? (
                    <Button
                      variant="outline"
                      onClick={() => setShowCancelConfirm(true)}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancelar Inscrição
                    </Button>
                  ) : (
                    <div className="space-y-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-red-300 font-medium mb-1">Confirmar cancelamento?</p>
                          <p className="text-red-200/80 text-sm">
                            Esta ação não pode ser desfeita. Sua vaga será liberada para outros participantes.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCancelConfirm(false)}
                          disabled={cancelLoading}
                          className="flex-1"
                        >
                          Manter Inscrição
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleCancelParticipation}
                          disabled={cancelLoading}
                          className="flex-1 bg-red-600 hover:bg-red-700"
                        >
                          {cancelLoading ? (
                            <>
                              <Loader className="w-4 h-4 mr-2 animate-spin" />
                              Cancelando...
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4 mr-2" />
                              Confirmar Cancelamento
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <p className="text-yellow-300 text-sm">{cancelCheck.reason}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 🔐 Senha do Evento - Para Anfitrião */}
        {isCreator && (event.status === 'Confirmado' || event.status === 'Em Andamento') && (
          <div className="glass-effect rounded-2xl p-6 border border-blue-500/30 bg-blue-500/5">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              🔐 Senha do Evento
            </h3>
            <p className="text-white/70 text-sm mb-4">
              Compartilhe esta senha com os participantes para que possam entrar no evento.
            </p>
            <EventPasswordCard eventId={event.id} />
          </div>
        )}

        {/* Estatísticas de Entrada */}
        {isCreator && (event.status === 'Confirmado' || event.status === 'Em Andamento') && (
          <div className="glass-effect rounded-2xl p-6 border border-white/10">
            <h3 className="text-sm font-semibold text-white mb-3">Estatísticas de Entrada</h3>
            <EventEntryStats eventId={event.id} />
          </div>
        )}


        {/* Controles do Anfitrião */}
        {isCreator && (event.status === 'Confirmado' || event.status === 'Em Andamento') && (
          <div className="glass-effect rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Controles do Anfitrião</h3>
            <div className="space-y-3">
              <p className="text-white/60 text-sm">
                Como anfitrião, você pode encerrar o evento antecipadamente caso necessário.
              </p>
              <Button
                onClick={() => setShowEarlyEndModal(true)}
                variant="outline"
                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-400"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                Encerrar Evento Antecipadamente
              </Button>
            </div>
          </div>
        )}

        {/* Controles do Participante */}
        {!isCreator && isParticipant && userHasAccess && event.status === 'Em Andamento' && (
          <div className="glass-effect rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Solicitações</h3>
            <div className="space-y-3">
              <p className="text-white/60 text-sm">
                Se houver algum problema, você pode solicitar o encerramento antecipado do evento.
              </p>
              <Button
                onClick={() => setShowEarlyEndModal(true)}
                variant="outline"
                className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-400"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                Solicitar Encerramento Antecipado
              </Button>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* ✅ SEÇÃO DE AVALIAÇÃO PARA ANFITRIÃO */}
        {/* ============================================ */}
        {isEventFinalized && isCreator && (
          <div className="glass-effect rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-6 h-6 text-yellow-400" />
              <h3 className="text-2xl font-semibold text-white">Avalie o evento como anfitrião</h3>
            </div>
            <p className="text-white/60 mb-6">
              Como anfitrião, avalie como foi organizar e conduzir este evento.
            </p>
            
            <EventEvaluationSection
              eventId={parseInt(id)}
              isCreator={true}
              isParticipant={false}
              userId={user?.id}
              creator={creator}
              participants={participants}
              event={event}
              onRefresh={fetchEventData}
            />
          </div>
        )}

        {/* ============================================ */}
        {/* ✅ SEÇÃO DE AVALIAÇÃO PARA PARTICIPANTES */}
        {/* ============================================ */}
        {isEventFinalized && !isCreator && isParticipant && (
          <div className="glass-effect rounded-2xl p-6 border border-white/10">
            <div className="space-y-6">
              {/* Seção de Avaliação */}
              {!hasEvaluated ? (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Star className="w-6 h-6 text-yellow-400" />
                    <h3 className="text-2xl font-semibold text-white">Avalie sua experiência</h3>
                  </div>
                  <p className="text-white/60 mb-6">
                    Compartilhe sua opinião sobre o evento, o anfitrião, os participantes e o restaurante.
                  </p>
                  
                  <EventEvaluationSection
                    eventId={parseInt(id)}
                    isCreator={false}
                    isParticipant={true}
                    userId={user?.id}
                    creator={creator}
                    participants={participants}
                    event={event}
                    onRefresh={fetchEventData}
                  />
                </div>
              ) : (
                <>
                  {/* Avaliação completa */}
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                    <div className="flex items-center gap-3">
                      <Star className="w-5 h-5 text-green-400 fill-green-400" />
                      <div>
                        <p className="text-green-400 font-semibold">Avaliação completa!</p>
                        <p className="text-green-300/80 text-sm">Obrigado por compartilhar sua experiência.</p>
                      </div>
                    </div>
                  </div>

                  {/* Upload de foto APÓS avaliar */}
                  {canUploadPhoto() && (
                    <div className="pt-6 border-t border-white/10">
                      <div className="flex items-center gap-3 mb-4">
                        <Camera className="w-6 h-6 text-purple-400" />
                        <h3 className="text-xl font-semibold text-white">Compartilhe uma foto</h3>
                      </div>
                      <p className="text-white/60 mb-4">
                        Envie uma foto do evento para o histórico e para o carousel do restaurante.
                      </p>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                      
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      >
                        {uploadingPhoto ? (
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4 mr-2" />
                        )}
                        {uploadingPhoto ? 'Enviando...' : 'Enviar Foto'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* ✅ SEÇÃO DE UPLOAD DE FOTO INDEPENDENTE */}
        {/* ============================================ */}
        {(isEventFinalized || isEventConcluded) && !isCreator && isParticipant && hasEvaluated && (
          <div className="glass-effect rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <Camera className="w-6 h-6 text-purple-400" />
              <h3 className="text-xl font-semibold text-white">
                {isEventFinalized ? 'Compartilhe uma foto do evento' : 'Trocar foto do evento'}
              </h3>
            </div>
            <p className="text-white/60 mb-4">
              {isEventFinalized 
                ? 'Envie uma foto do evento para o histórico e para o carousel do restaurante.'
                : 'Você pode trocar sua foto do evento por até 6 meses após a conclusão.'
              }
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {uploadingPhoto ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Camera className="w-4 h-4 mr-2" />
              )}
              {uploadingPhoto ? 'Enviando...' : (isEventFinalized ? 'Enviar Foto' : 'Trocar Foto')}
            </Button>
          </div>
        )}

      </motion.div>

      {/* Modal de Encerramento Antecipado */}
      <EarlyEndEventModal
        isOpen={showEarlyEndModal}
        onClose={() => setShowEarlyEndModal(false)}
        event={event}
        userRole={isCreator ? 'creator' : 'participant'}
        onSuccess={() => {
          fetchEventData();
          toast({
            title: "Evento encerrado com sucesso",
            description: "O fluxo de avaliação foi aberto para todos os participantes."
          });
        }}
      />

      {/* Modal de Desaprovação de Usuário */}
      <DisapproveUserModal
        isOpen={disapprovalModal.isOpen}
        onClose={() => setDisapprovalModal({ isOpen: false, userId: null, userName: null })}
        eventId={event?.id}
        userId={disapprovalModal.userId}
        userName={disapprovalModal.userName}
        hostId={user?.id}
        onSuccess={() => {
          fetchEventData();
          toast({
            title: "Usuário desaprovado",
            description: "O caso foi enviado para análise administrativa."
          });
        }}
      />
    </>
  );
};



export default EventDetails;