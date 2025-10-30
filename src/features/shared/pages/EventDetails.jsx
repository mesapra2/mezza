import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Calendar, Users, MapPin, Clock, CheckCircle, X, AlertTriangle, Loader } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import EventApply from '@/features/shared/components/events/EventApply';
import Avatar from '@/features/shared/components/profile/Avatar';
import ParticipantsManagement from '@/features/shared/components/events/ParticipantsManager';
import EventEvaluationSection from '@/features/shared/components/events/EventEvaluationSection';
import EventEntryForm from '@/features/shared/components/ui/EventEntryForm';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInMinutes, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/features/shared/components/ui/button';
import ParticipationService from '@/services/ParticipationService';
import EventSecurityService from '@/services/EventSecurityService';
import { useToast } from '@/features/shared/components/ui/use-toast';

// ============================================
// 🆕 COMPONENTE: EventEntryStats
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
// Logo após o fechamento do componente EventEntryStats, ANTES do componente EventDetails
EventEntryStats.propTypes = {
  eventId: PropTypes.number.isRequired
};
    // Carregar imediatamente e depois a cada 5 segundos
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

      {/* Progress bar */}
      <div className="mt-3 w-full bg-slate-700 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-600 to-green-500 transition-all"
          style={{
            width: `${stats.accessPercentage}%`
          }}
        ></div>
      </div>
      <div className="text-center text-xs text-slate-500">
        {stats.accessPercentage}% de acesso
      </div>
    </div>
  );
};

// ============================================
// 📱 COMPONENTE PRINCIPAL: EventDetails
// ============================================
const EventDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();

  // Estados originais
  const [event, setEvent] = useState(null);
  const [creator, setCreator] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [userParticipation, setUserParticipation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // 🆕 Novos estados para sistema de entrada
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryIsBlocked, setEntryIsBlocked] = useState(false);
  const [entryStatus, setEntryStatus] = useState('');
  const [userHasAccess, setUserHasAccess] = useState(false);

const fetchEventData = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);

    console.log('🔍 Carregando evento ID:', id);

    // ✅ CORREÇÃO: Buscar evento primeiro, sem joins
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (eventError) {
      console.error('❌ Erro ao buscar evento:', eventError);
      throw eventError;
    }
    
    if (!eventData) {
      throw new Error('Evento não encontrado');
    }

    console.log('✅ Evento carregado:', eventData);
    setEvent(eventData);

    // ✅ Buscar partner separadamente (se existir)
    if (eventData.partner_id) {
      try {
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select('id, name, address')
          .eq('id', eventData.partner_id)
          .single();

        if (!partnerError && partnerData) {
          // Adicionar partner ao evento
          eventData.partner = partnerData;
          setEvent({ ...eventData, partner: partnerData });
          console.log('✅ Partner carregado:', partnerData);
        } else {
          console.warn('⚠️ Partner não encontrado:', eventData.partner_id);
        }
      } catch (partnerErr) {
        console.warn('⚠️ Erro ao buscar partner (não crítico):', partnerErr);
      }
    } else {
      console.log('ℹ️ Evento sem partner_id');
    }

    // ✅ Buscar creator
    try {
      const { data: creatorData, error: creatorError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, public_profile')
        .eq('id', eventData.creator_id)
        .single();

      if (creatorError) {
        console.warn('⚠️ Erro ao buscar creator:', creatorError);
      } else {
        setCreator(creatorData);
        console.log('✅ Creator carregado:', creatorData);
      }
    } catch (creatorErr) {
      console.warn('⚠️ Creator não encontrado (não crítico):', creatorErr);
    }

    // ✅ Buscar participação do usuário logado
    if (user) {
      try {
        const { data: userPartData, error: userPartError } = await supabase
          .from('event_participants')
          .select('*')
          .eq('event_id', id)
          .eq('user_id', user.id)
          .eq('status', 'aprovado')
          .maybeSingle();

        if (!userPartError && userPartData) {
          setUserParticipation(userPartData);
          console.log('✅ Participação do usuário encontrada:', userPartData);
        } else {
          setUserParticipation(null);
          console.log('ℹ️ Usuário não está participando deste evento');
        }
      } catch (userPartErr) {
        console.warn('⚠️ Erro ao buscar participação do usuário:', userPartErr);
        setUserParticipation(null);
      }
    }

    // ✅ Buscar participantes aprovados
    try {
      const { data: participationsData, error: participationsError } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', id)
        .eq('status', 'aprovado');

      if (participationsError) {
        console.warn('⚠️ Erro ao buscar participações:', participationsError);
        setParticipants([]);
      } else if (participationsData && participationsData.length > 0) {
        const userIds = participationsData.map(p => p.user_id);
        
        const { data: participantsData, error: participantsError } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, public_profile')
          .in('id', userIds);

        if (participantsError) {
          console.warn('⚠️ Erro ao buscar perfis dos participantes:', participantsError);
          setParticipants([]);
        } else {
          setParticipants(participantsData || []);
          console.log('✅ Participantes carregados:', participantsData?.length || 0);
        }
      } else {
        setParticipants([]);
        console.log('ℹ️ Nenhum participante aprovado ainda');
      }
    } catch (participantsErr) {
      console.warn('⚠️ Erro ao carregar participantes:', participantsErr);
      setParticipants([]);
    }

    console.log('✅ Carregamento completo do evento concluído');

  } catch (err) {
    console.error('❌ Erro crítico ao carregar evento:', err);
    setError('Erro ao carregar detalhes do evento');
  } finally {
    setLoading(false);
  }
}, [id, user]);

  useEffect(() => {
    fetchEventData();
      }, [fetchEventData]);
const getPartnerDisplay = () => {
  if (!event) return null;
  
  if (event.partner && event.partner.name) {
    // Tem partner completo
    let addressText = event.partner.name;
    
    if (event.partner.address) {
      if (typeof event.partner.address === 'string') {
        addressText += ` - ${event.partner.address}`;
      } else if (typeof event.partner.address === 'object') {
        const parts = [
          event.partner.address.street,
          event.partner.address.city
        ].filter(Boolean);
        if (parts.length > 0) {
          addressText += ` - ${parts.join(', ')}`;
        }
      }
    }
    
    return addressText;
  }
  
  // Não tem partner ou partner incompleto
  return 'Local a definir';
};
  // 🆕 EFFECT: Monitorar timing de entrada (executar a cada segundo)
  useEffect(() => {
    if (!event || !user || !userParticipation) return;

    const checkEntryTiming = async () => {
      try {
        const now = new Date();
        const startTime = new Date(event.start_time);
        const endTime = new Date(event.end_time);

        const oneMinBeforeStart = new Date(startTime.getTime() - 60 * 1000);
        const twoMinBeforeEnd = new Date(endTime.getTime() - 2 * 60 * 1000);

        // 🔍 Verificar se usuário já tem acesso
        const hasAccess = await EventSecurityService.hasUserAccess(event.id, user.id);
        setUserHasAccess(hasAccess);

        if (hasAccess) {
          setShowEntryForm(false);
          setEntryStatus('✅ Você tem acesso ao evento');
          return;
        }

        // 🔒 Verificar se entrada está bloqueada (falta 2 min para fim)
        if (now >= twoMinBeforeEnd) {
          setShowEntryForm(false);
          setEntryIsBlocked(true);
          setEntryStatus('🔒 Entrada encerrada (evento terminando)');
          return;
        }

        // 🔓 Verificar se está na faixa de entrada (falta 1 min antes até 2 min antes do fim)
        if (now >= oneMinBeforeStart && now < twoMinBeforeEnd) {
          setShowEntryForm(true);
          setEntryIsBlocked(false);
          setEntryStatus('🔑 Digite a senha para entrar!');
        } else {
          setShowEntryForm(false);
          setEntryIsBlocked(false);

          // ⏳ Calcular tempo até estar disponível
          const timeUntilAvailable = oneMinBeforeStart - now;
          if (timeUntilAvailable > 0) {
            const minutesLeft = Math.floor(timeUntilAvailable / 60000);
            const secondsLeft = Math.floor((timeUntilAvailable % 60000) / 1000);
            setEntryStatus(
              `⏳ Entrada disponível em ${minutesLeft}m ${secondsLeft}s`
            );
          } else if (now < startTime) {
            setEntryStatus('⏳ Evento ainda não começou');
          }
        }
      } catch (error) {
        console.error('❌ Erro ao verificar timing de entrada:', error);
      }
    };

    // Verificar imediatamente
    checkEntryTiming();

    // Depois a cada 1 segundo
    const interval = setInterval(checkEntryTiming, 1000);

    return () => clearInterval(interval);
  }, [event, user, userParticipation]);

  // 🆕 CALLBACK: Quando entrada é bem-sucedida
  const handleEntrySuccess = () => {
    setShowEntryForm(false);
    setUserHasAccess(true);
    setEntryStatus('✅ Você entrou no evento!');

    toast({
      title: '✅ Acesso liberado!',
      description: 'Bem-vindo ao evento. Aproveite!',
    });

    // Recarregar dados
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

            {/*
              // ============================================
              // 🔧 SUA CORREÇÃO APLICADA AQUI
              // ============================================
              // Substituímos o acesso direto por event.partner.name
              // pela sua função getPartnerDisplay()
            */}
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

        {/* ==========================================
            🆕 SEÇÃO DE ENTRADA COM SENHA
            ========================================== */}
        {!isCreator && isParticipant && !userHasAccess && (event.status === 'Confirmado' || event.status === 'Em Andamento') && (
          <div className="glass-effect rounded-2xl p-6 border border-blue-500/30 bg-blue-500/5">
            {/* 📊 Status da Entrada */}
            <div className="text-center mb-6">
              <p className="text-sm text-slate-300">{entryStatus}</p>
            </div>

            {/* 🔑 Formulário de Entrada (condicional) */}
            {showEntryForm && !entryIsBlocked ? (
              <EventEntryForm
                eventId={event.id}
                onSuccess={handleEntrySuccess}
                isDisabled={entryIsBlocked}
              />
            ) : null}

            {/* 🔒 Entrada Bloqueada */}
            {entryIsBlocked && (
              <div className="text-center p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-lg font-semibold text-red-400 mb-2">
                  🔒 Entrada Encerrada
                </p>
                <p className="text-sm text-red-300">
                  A entrada foi bloqueada. O evento está chegando ao fim.
                </p>
              </div>
            )}

            {/* ⏳ Aguardando (mostra quando não está na janela de entrada) */}
            {!showEntryForm && !entryIsBlocked && !userHasAccess && (
              <div className="text-center p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="mb-4">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                </div>
                <p className="text-sm text-blue-300">
                  {entryStatus}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            ✅ USUÁRIO TEM ACESSO AO EVENTO
            ========================================== */}
        {!isCreator && isParticipant && userHasAccess && event.status === 'Em Andamento' && (
          <div className="glass-effect rounded-2xl p-6 border border-green-500/30 bg-green-500/5">
            {/* Badge de acesso */}
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg mb-4">
              <p className="text-sm text-green-400 text-center">
                ✅ Você tem acesso ao evento. Aproveite!
              </p>
            </div>

            {/* 💬 Chat do Evento - Adicionar aqui quando disponível */}
            {/* <EventChat eventId={event.id} /> */}
          </div>
        )}

        {/* ==========================================
            PARTICIPANTE CONFIRMADO (ANTES DO EVENTO)
            ========================================== */}
        {!isCreator && isParticipant && !isEventOver && !userHasAccess && event.status !== 'Em Andamento' && (
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

        {/* ==========================================
            📊 ESTATÍSTICAS DE ENTRADA (ANFITRIÃO)
            ========================================== */}
        {isCreator && (event.status === 'Confirmado' || event.status === 'Em Andamento') && (
          <div className="glass-effect rounded-2xl p-6 border border-white/10">
            <h3 className="text-sm font-semibold text-white mb-3">
              📊 Estatísticas de Entrada
            </h3>
            
            <EventEntryStats eventId={event.id} />
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