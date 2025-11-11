// src/pages/EventManagementPartner.jsx
import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/features/shared/components/ui/button';
import { 
  Loader2, 
  Plus, 
  Calendar, 
  AlertTriangle, 
  Edit, 
  MessageSquare, 
  Users, 
  Zap,
  ChevronDown,
  ChevronUp,
  Clock,
  Key
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import EventPasswordCard from '@/features/partner/components/EventPasswordCard';

const EventManagementPartner = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedEventId, setExpandedEventId] = useState(null);

  const isPremiumPartner = profile?.isPremiumPartner === true;

  useEffect(() => {
    const fetchMyEvents = async () => {
      if (!user || !profile?.partner_id) {
        setError("Perfil de parceiro não encontrado.");
        setLoading(false);
        return;
      }
      
      if (!isPremiumPartner) {
        setLoading(false);
        setEvents([]);
        return;
      }

      setLoading(true);
      try {
        // 🆕 Adicionar event_entry_password ao select
        const { data, error: fetchError } = await supabase
          .from('events')
          .select('id, title, start_time, end_time, vagas, status, event_type, event_entry_password')
          .eq('partner_id', profile.partner_id)
          .eq('creator_id', user.id)
          .order('start_time', { ascending: false });

        if (fetchError) throw fetchError;
        setEvents(data || []);
      } catch (err) {
        setError(err.message || 'Erro ao carregar eventos.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyEvents();

    // 🔄 Atualizar a cada 30 segundos para pegar novas senhas
    const interval = setInterval(fetchMyEvents, 30000);

    return () => clearInterval(interval);
  }, [user, profile, isPremiumPartner]);

  // 🎯 Verifica se evento está próximo (menos de 5 minutos)
  const isEventSoon = (startTime) => {
    const now = new Date();
    const start = new Date(startTime);
    const diff = start - now;
    const minutesLeft = Math.floor(diff / 1000 / 60);
    return minutesLeft >= 0 && minutesLeft <= 5;
  };

  // 🎯 Verifica se evento está em andamento
  const isEventOngoing = (startTime, endTime) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    return now >= start && now <= end;
  };

  const toggleEventExpand = (eventId) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
  };

  return (
    <>
      <Helmet>
        <title>Meus Eventos - Mesapra2</title>
      </Helmet>

      <div className="py-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2">Meus Eventos</h1>
            <p className="text-white/60">
              {isPremiumPartner
                ? 'Gerencie os eventos criados para o seu restaurante.'
                : 'Seu plano atual não permite a criação de Eventos Institucionais.'}
            </p>
          </div>

          {isPremiumPartner ? (
            <Button
              onClick={() => navigate('/partner/create-event')}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Novo Evento
            </Button>
          ) : (
            <Button
              variant="outline"
              className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400"
              onClick={() => navigate('/partner/settings')}
            >
              <Zap className="w-4 h-4 mr-2" />
              Seja Premium para Criar Eventos
            </Button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] glass-effect p-8 rounded-2xl border border-red-500/30">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Erro ao carregar</h2>
            <p className="text-white/60">{error}</p>
          </div>
        )}

        {/* Lista de Eventos */}
        {!loading && !error && (
          <>
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[40vh] glass-effect p-8 rounded-2xl border border-white/10">
                <Calendar className="w-16 h-16 text-white/20 mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">
                  {isPremiumPartner ? 'Nenhum evento criado' : 'Seu plano não permite criar eventos'}
                </h2>
                <p className="text-white/60 mb-6">
                  {isPremiumPartner
                    ? 'Que tal criar seu primeiro evento agora?'
                    : 'Faça o upgrade para Partner Premium para criar seus próprios eventos.'}
                </p>
                
                {isPremiumPartner ? (
                  <Button
                    onClick={() => navigate('/partner/create-event')}
                    className="bg-gradient-to-r from-purple-500 to-pink-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Evento
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400"
                    onClick={() => navigate('/partner/settings')}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Conhecer Planos Premium
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => {
                  const isSoon = isEventSoon(event.start_time);
                  const isOngoing = isEventOngoing(event.start_time, event.end_time);
                  const isExpanded = expandedEventId === event.id;
                  const hasPassword = !!event.event_entry_password;

                  return (
                    <div
                      key={event.id}
                      className={`glass-effect rounded-2xl border transition-all ${
                        isOngoing 
                          ? 'border-green-500/50 bg-green-500/5' 
                          : isSoon 
                          ? 'border-yellow-500/50 bg-yellow-500/5'
                          : 'border-white/10'
                      }`}
                    >
                      {/* Header do Card */}
                      <div className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          {/* Informações do Evento */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                  event.status === 'Aberto'
                                    ? 'bg-green-500/20 text-green-300'
                                    : event.status === 'Em Andamento'
                                    ? 'bg-purple-500/20 text-purple-300'
                                    : 'bg-gray-500/20 text-gray-300'
                                }`}
                              >
                                {event.status}
                              </span>
                              
                              {isOngoing && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 animate-pulse">
                                  <div className="w-2 h-2 rounded-full bg-green-400" />
                                  AO VIVO
                                </span>
                              )}
                              
                              {isSoon && !isOngoing && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300">
                                  <Clock className="w-3 h-3" />
                                  Em breve
                                </span>
                              )}

                              {hasPassword && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
                                  <Key className="w-3 h-3" />
                                  Senha gerada
                                </span>
                              )}
                            </div>
                            
                            <h3 className="text-lg font-semibold text-white truncate">{event.title}</h3>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-sm text-white/60 mt-1">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>{format(new Date(event.start_time), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4" />
                                <span>{event.vagas} vagas</span>
                              </div>
                            </div>
                          </div>

                          {/* Botões de Ação */}
                          <div className="flex flex-shrink-0 gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => navigate(`/event/${event.id}/chat`)}
                              title="Acessar Chat"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => navigate(`/partner/edit-event/${event.id}`)}
                              title="Editar Evento"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            
                            {/* Botão de Expandir */}
                            {(isSoon || isOngoing || hasPassword) && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => toggleEventExpand(event.id)}
                                title={isExpanded ? "Recolher" : "Ver senha"}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 🔐 Card de Senha (Expandível) */}
                      {isExpanded && (isSoon || isOngoing || hasPassword) && (
                        <div className="px-4 sm:px-6 pb-6">
                          <EventPasswordCard eventId={event.id} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default EventManagementPartner;