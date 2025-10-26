// src/pages/EventManagementPartner.jsx
import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/features/shared/components/ui/button';
import { Loader2, Plus, Calendar, AlertTriangle, Edit, MessageSquare, Users, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const EventManagementPartner = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ USA A FLAG DO PROFILE
  const isPremiumPartner = profile?.isPremiumPartner === true;

  useEffect(() => {
    const fetchMyEvents = async () => {
      if (!user || !profile?.partner_id) {
        setError("Perfil de parceiro não encontrado.");
        setLoading(false);
        return;
      }
      // Se não for premium, não há eventos "Meus" para buscar.
      if (!isPremiumPartner) {
        setLoading(false);
        setEvents([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('events')
          .select('id, title, start_time, vagas, status, event_type')
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
  }, [user, profile, isPremiumPartner]);

  return (
    <>
      <Helmet>
        <title>Meus Eventos - Mesapra2</title>
      </Helmet>

      <div className="py-6">
        {/* Cabeçalho e Botão de Criar (Condicional) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2">Meus Eventos</h1>
            <p className="text-white/60">
              {isPremiumPartner
                ? 'Gerencie os eventos criados para o seu restaurante.'
                : 'Seu plano atual não permite a criação de Eventos Institucionais.'}
            </p>
          </div>

          {/* ✅ BOTÃO CONDICIONAL */}
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

        {/* Exibição de Loading ou Erro */}
        {loading && (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        )}

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
                
                {/* ✅ BOTÃO CONDICIONAL */}
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
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="glass-effect rounded-2xl p-4 sm:p-6 border border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    {/* Informações do Evento */}
                    <div className="flex-1 min-w-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${
                          event.status === 'Aberto'
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-gray-500/20 text-gray-300'
                        }`}
                      >
                        {event.status}
                      </span>
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default EventManagementPartner;