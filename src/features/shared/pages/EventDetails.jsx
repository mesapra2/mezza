import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Calendar, Users, MapPin, Clock, CheckCircle, X, AlertTriangle, Loader } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import EventApply from '@/features/shared/components/events/EventApply';
import Avatar from '@/features/shared/components/profile/Avatar';
import ParticipantsManagement from '@/features/shared/components/events/ParticipantsManager';
import EventEvaluationSection from '@/features/shared/components/events/EventEvaluationSection';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/features/shared/components/ui/button';
import ParticipationService from '@/services/ParticipationService';
import { useToast } from '@/features/shared/components/ui/use-toast';


const EventDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [event, setEvent] = useState(null);
  const [creator, setCreator] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [userParticipation, setUserParticipation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const fetchEventData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      const { data: creatorData, error: creatorError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, public_profile')
        .eq('id', eventData.creator_id)
        .single();

      if (creatorError) throw creatorError;
      setCreator(creatorData);

      if (user) {
        const { data: userPartData } = await supabase
          .from('participations')
          .select('*')
          .eq('event_id', id)
          .eq('user_id', user.id)
          .eq('status', 'aprovado')
          .maybeSingle();

        setUserParticipation(userPartData);
      }

      const { data: participationsData, error: participationsError } = await supabase
        .from('participations')
        .select('user_id')
        .eq('event_id', id)
        .eq('status', 'aprovado');

      if (participationsError) throw participationsError;

      if (participationsData.length > 0) {
        const userIds = participationsData.map(p => p.user_id);
        const { data: participantsData, error: participantsError } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, public_profile')
          .in('id', userIds);

        if (participantsError) throw participantsError;
        setParticipants(participantsData);
      } else {
        setParticipants([]);
      }
    } catch (err) {
      setError('Erro ao carregar detalhes do evento');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  const canCancelParticipation = () => {
    if (!userParticipation || !event) return { canCancel: false, reason: '' };

    const now = new Date();
    const subscriptionTime = new Date(userParticipation.created_at);
    const eventStart = new Date(event.start_time);

    const minutesSinceSubscription = differenceInMinutes(now, subscriptionTime);
    const hoursUntilEvent = differenceInHours(eventStart, now);

    if (minutesSinceSubscription > 30) {
      return {
        canCancel: false,
        reason: 'O prazo de 30 minutos para cancelamento expirou.'
      };
    }

    if (hoursUntilEvent < 4) {
      return {
        canCancel: false,
        reason: 'Não é possível cancelar com menos de 4 horas do evento.'
      };
    }

    return { canCancel: true, reason: '' };
  };

  const handleCancelParticipation = async () => {
    if (!userParticipation) return;

    setCancelLoading(true);
    try {
      const result = await ParticipationService.cancelParticipation(
        userParticipation.id,
        user.id
      );

      if (result.success) {
        toast({
          title: '✅ Inscrição cancelada!',
          description: 'Sua participação foi cancelada com sucesso.',
        });
        setShowCancelConfirm(false);
        await fetchEventData();
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao cancelar',
          description: result.error || 'Não foi possível cancelar a inscrição.',
        });
      }
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao cancelar',
        description: 'Ocorreu um erro inesperado.',
      });
    } finally {
      setCancelLoading(false);
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
  const isParticipant = user && participants.some(p => p.id === user.id);
  const isEventOver = new Date(event.end_time) < new Date();
  const isEventFinalized = event.status === 'Finalizado';
  const cancelCheck = canCancelParticipation();

  return (
    <>
      <Helmet>
        <title>{event.title} - Mesapra2</title>
        <meta name="description" content={event.description} />
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
              <Avatar 
                url={creator.avatar_url} 
                name={creator.username || creator.full_name} 
                size="lg" 
                isPublic={creator.public_profile} 
              />
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
              {format(new Date(event.start_time), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>

            <div className="flex items-center text-white/60">
              <Clock className="w-5 h-5 mr-3" />
              De {format(new Date(event.start_time), 'HH:mm', { locale: ptBR })} até {format(new Date(event.end_time), 'HH:mm', { locale: ptBR })}
            </div>

            {event.partner && (
              <div className="flex items-center text-white/60">
                <MapPin className="w-5 h-5 mr-3" />
                {event.partner.name} - {event.partner.address}
              </div>
            )}

            <div className="flex items-center text-white/60">
              <Users className="w-5 h-5 mr-3" />
              {event.vagas} vagas disponíveis
            </div>
          </div>
        </div>

        {participants.length > 0 && (
          <div className="glass-effect rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">Participantes Aprovados ({participants.length})</h2>
            <div className="flex flex-wrap gap-4">
              {participants.map(participant => (
                <div key={participant.id} className="flex flex-col items-center gap-2">
                  <Avatar 
                    url={participant.avatar_url} 
                    name={participant.username || participant.full_name} 
                    size="md" 
                    isPublic={participant.public_profile} 
                  />
                  <p className="text-white/80 text-sm">{participant.username || participant.full_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {isCreator && !isEventFinalized && (
          <ParticipantsManagement
            eventId={String(event.id)}
            eventType={event.event_type}
            onUpdate={fetchEventData}
          />
        )}

        {!isCreator && !isParticipant && (
          <EventApply event={event} onSuccess={fetchEventData} />
        )}

        {!isCreator && isParticipant && !isEventOver && (
          <div className="glass-effect rounded-2xl p-6 border border-green-500/30 bg-green-500/5">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-2">
                  🎉 Você está participando deste evento!
                </h3>
                <p className="text-white/70 text-sm mb-4">
                  Sua inscrição foi confirmada. Prepare-se para uma experiência incrível!
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-white/60 text-sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{format(new Date(event.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                  {event.partner && (
                    <div className="flex items-center text-white/60 text-sm">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{event.partner.name}</span>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4">
                  <p className="text-blue-300 text-sm">
                    💡 Volte aqui após o término do evento para compartilhar suas fotos e avaliar a experiência.
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
                      <p className="text-yellow-300 text-sm">
                        {cancelCheck.reason}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 🎯 SEÇÃO DE AVALIAÇÃO */}
        {isEventFinalized && (
          <EventEvaluationSection
            eventId={parseInt(id)}
            isCreator={isCreator}
            isParticipant={isParticipant}
            userId={user?.id}
            creator={creator}
            participants={participants}
            event={event}
            onRefresh={fetchEventData}
          />
        )}

      </motion.div>
    </>
  );
};

export default EventDetails;