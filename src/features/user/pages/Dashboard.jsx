import { useState, useEffect, useCallback } from 'react';
import { Helmet } from "react-helmet-async";
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, Users, Star, MapPin, Clock, Settings as SettingsIcon, UserPlus, XCircle, CheckCircle, MessageSquare, Heart, Loader } from 'lucide-react'; // <-- 1. LOADER ADICIONADO
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/features/shared/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabaseClient';
import Settings from '@/features/user/components/common/Settings';
import EventApply from '@/features/shared/components/events/EventApply';
import ParticipationService from '@/services/ParticipationService';
import { toast } from '@/features/shared/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/features/shared/components/ui/dialog';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    eventosParticipados: 0,
    proximosEventos: 0,
    avaliacaoMedia: 0,
  });
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [userAvatar, setUserAvatar] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [eventToCancel, setEventToCancel] = useState(null);
  const [cancelError, setCancelError] = useState(null);
  const [eventParticipants, setEventParticipants] = useState({});
  const [userParticipations, setUserParticipations] = useState({});
  const [crusherInvites, setCrusherInvites] = useState({});
  const [pendingParticipations, setPendingParticipations] = useState({});
  const [isRegistering, setIsRegistering] = useState(false); // <-- 2. ESTADO ADICIONADO

  const loadUserAvatar = useCallback(async () => {
    if (!user) return;
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

      if (!error && profileData?.avatar_url) {
        setUserAvatar(profileData.avatar_url);
      } else {
        setUserAvatar(user?.user_metadata?.avatar_url || null);
      }
    } catch (err) {
      console.error('Erro ao carregar avatar:', err);
      setUserAvatar(user?.user_metadata?.avatar_url || null);
    }
  }, [user]); 

  const loadParticipantsForUserEvents = useCallback(async (events) => {
    if (!user) return;
    try {
      const participantsMap = {};

      for (const event of events) {
        const { data: participants, error } = await supabase
          .from('event_participants')
        .select(`
            id,
            status,
            user:profiles!NOME_DA_CONSTRAINT_AQUI(id, username, avatar_url)
          `)
          .eq('event_id', event.id)
          .eq('status', 'aprovado');

        if (!error && participants) {
          participantsMap[event.id] = participants;
        }
      }

      setEventParticipants(participantsMap);
    } catch (error) {
      console.error('Erro ao carregar participantes:', error);
    }
  }, [user]);

  const loadPendingParticipations = useCallback(async (events) => {
    if (!user) return;
    try {
      const pendingMap = {};

      for (const event of events) {
        if (event.creator_id === user.id) {
          const { data: pendingParticipants, error } = await supabase
            .from('event_participants')
            .select('id')
            .eq('event_id', event.id)
            .eq('status', 'pendente');

          if (!error && pendingParticipants) {
            pendingMap[event.id] = pendingParticipants.length;
          }
        }
      }

      setPendingParticipations(pendingMap);
    } catch (error) {
      console.error('Erro ao carregar candidaturas pendentes:', error);
    }
  }, [user]); 

  const loadUserParticipations = useCallback(async (events) => {
    if (!user) return;
    try {
      const eventIds = events.map(e => e.id);
      
      const { data: participations, error } = await supabase
        .from('event_participants')
        .select('event_id, status')
        .eq('user_id', user.id)
        .in('event_id', eventIds);

      if (!error && participations) {
        const participationsMap = {};
        participations.forEach(p => {
          participationsMap[p.event_id] = p.status;
        });
        setUserParticipations(participationsMap);
      }
    } catch (error) {
      console.error('Erro ao carregar participações do usuário:', error);
    }
  }, [user]);

  const checkCrusherInvites = useCallback(async (events) => {
    if (!user) return {};
    try {
      const crusherInvitesMap = {};
      
      for (const event of events) {
        if (event.event_type === 'crusher' && event.crusher_invited_user_id === user.id) {
          const { data: participation } = await supabase
            .from('event_participants')
            .select('id, status')
            .eq('event_id', event.id)
            .eq('user_id', user.id)
            .single();
          
          if (participation && participation.status === 'pendente') {
            crusherInvitesMap[event.id] = participation.id;
          }
        }
      }
      
      return crusherInvitesMap;
    } catch (error) {
      console.error('Erro ao verificar convites Crusher:', error);
      return {};
    }
  }, [user]);
  
  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('reputation_stars')
        .eq('id', user.id)
        .single();

      const { data: participations, error: participationsError } = await supabase
        .from('event_participants')
        .select('*')
        .eq('user_id', user.id);

      if (participationsError) throw participationsError;

      const userParticipations = participations.filter(p => p.status === 'aprovado');
      const eventIds = userParticipations.map(p => p.event_id);
      
      const { data: userEvents, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds);

      if (eventsError) throw eventsError;

      const upcoming = userEvents.filter(e =>
        new Date(e.start_time) > new Date() && e.status !== 'Cancelado'
      );

      const { data: allEvents, error: allEventsError } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_creator_id_fkey(id, username, avatar_url),
          partner:partners(id, name, logo_url, photos, address)
        `)
        .in('status', ['Aberto', 'Confirmado'])
        .order('start_time', { ascending: true })
        .limit(6);

      if (allEventsError) throw allEventsError;

      setStats({
        eventosParticipados: userParticipations.length,
        proximosEventos: upcoming.length,
        avaliacaoMedia: profileData?.reputation_stars || 0,
      });

      setRecentEvents(allEvents);
      await loadParticipantsForUserEvents(allEvents);
      await loadPendingParticipations(allEvents);
      await loadUserParticipations(allEvents);
      
      const invites = await checkCrusherInvites(allEvents);
      setCrusherInvites(invites || {});
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error.message);
    } finally {
      setLoading(false);
    }
  }, [user, loadParticipantsForUserEvents, loadPendingParticipations, loadUserParticipations, checkCrusherInvites]); 
  
  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadUserAvatar();
    } else {
      setLoading(false);
    }
  }, [user, loadDashboardData, loadUserAvatar]); 

  // ✅ FUNÇÃO CORRIGIDA: Avatar do usuário logado
  const getAvatarUrl = () => {
    if (!userAvatar) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user?.email || 'Usuário'
      )}&background=8b5cf6&color=fff&size=40`;
    }

    // Se já é URL completa (http/https), retorna direto
    if (userAvatar.startsWith('http')) {
      return userAvatar;
    }

    // ✅ Constrói a URL pública do Supabase
    const { data } = supabase.storage.from('avatars').getPublicUrl(userAvatar);
    return `${data.publicUrl}?t=${new Date().getTime()}`;
  };

  // ✅ FUNÇÃO CORRIGIDA: Avatar do criador do evento
  const getCreatorAvatar = (creator) => {
    if (!creator?.avatar_url) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        creator?.username || 'Anfitrião'
      )}&background=8b5cf6&color=fff&size=48`;
    }

    // Se já é URL completa (http/https), retorna direto
    if (creator.avatar_url.startsWith('http')) {
      return creator.avatar_url;
    }

    // ✅ Constrói a URL pública do Supabase
    const { data } = supabase.storage.from('avatars').getPublicUrl(creator.avatar_url);
    return `${data.publicUrl}?t=${new Date().getTime()}`;
  };

  const getPartnerBackground = (partner) => {
    if (!partner) return null;

    if (partner.photos && Array.isArray(partner.photos) && partner.photos.length > 0) {
      const firstPhoto = partner.photos[0];
      
      if (firstPhoto.startsWith('http')) {
        return firstPhoto;
      }
      
      const { data } = supabase.storage
        .from('partner-photos')
        .getPublicUrl(firstPhoto);
      
      return data.publicUrl;
    }
    
    if (partner.logo_url) {
      if (partner.logo_url.startsWith('http')) {
        return partner.logo_url;
      }
      
      const { data } = supabase.storage
        .from('partner-photos')
        .getPublicUrl(partner.logo_url);
      
      return data.publicUrl;
    }
    
    return null;
  };

  const getPartnerAddress = (partner) => {
    if (!partner) return 'Local não informado';
    if (!partner.address) return partner.name;
    
    if (typeof partner.address === 'string') {
      return partner.address;
    }
    
    if (typeof partner.address === 'object') {
      const parts = [
        partner.address.street || partner.address.rua,
        partner.address.city || partner.address.cidade,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : partner.name;
    }
    
    return partner.name;
  };

  const handleOpenApplyModal = (event) => {
    setSelectedEvent(event);
    setApplyModalOpen(true);
  };

  const handleApplySuccess = () => {
    setApplyModalOpen(false);
    loadDashboardData();
  };

  const handleAcceptCrusherInvite = async (event) => {
    try {
      const participationId = crusherInvites[event.id];
      const result = await ParticipationService.acceptCrusherInvite(
        participationId,
        event.id,
        user.id
      );
      
      if (result.success) {
        toast({ 
          title: "💘 Convite aceito!",
          description: "Você confirmou sua participação no evento Crusher."
        });
        loadDashboardData();
      } else {
        toast({ 
          variant: "destructive", 
          title: "Erro", 
          description: result.error 
        });
      }
    } catch (error) {
      console.error('Erro ao aceitar convite:', error);
      toast({ 
        variant: "destructive", 
        title: "Erro", 
        description: "Não foi possível aceitar o convite." 
      });
    }
  };

  const handleRejectCrusherInvite = async (event) => {
    const reason = prompt('Motivo da recusa (opcional):');
    if (reason === null) return;
    
    try {
      const participationId = crusherInvites[event.id];
      const result = await ParticipationService.rejectCrusherInvite(
        participationId,
        event.id,
        user.id,
        reason
      );
      
      if (result.success) {
        toast({ 
          title: "Convite recusado",
          description: "O anfitrião será notificado."
        });
        loadDashboardData();
      } else {
        toast({ 
          variant: "destructive", 
          title: "Erro", 
          description: result.error 
        });
      }
    } catch (error) {
      console.error('Erro ao recusar convite:', error);
      toast({ 
        variant: "destructive", 
        title: "Erro", 
        description: "Não foi possível recusar o convite." 
      });
    }
  };

  // =================================================================
  // 🆕 3. FUNÇÃO PARA INSCRIÇÃO DIRETA (INSTITUCIONAL) ADICIONADA
  // =================================================================
  const handleInstitutionalApply = async (event) => {
    if (!user || !event) return;
    
    setIsRegistering(true);
    try {
      // Inscrição direta, status 'aprovado', sem mensagem_candidatura
      const { error } = await supabase
        .from('event_participants')
        .insert({
          event_id: event.id,
          user_id: user.id,
          status: 'aprovado' 
        });
      
      if (error) throw error;

      toast({
        title: '✅ Inscrição Confirmada!',
        description: 'Você foi inscrito automaticamente neste evento.',
      });
      
      // Recarrega os dados do dashboard
      await loadDashboardData();
      // Fecha o modal
      setApplyModalOpen(false);

    } catch (error) {
      console.error('Erro ao inscrever-se (institucional):', error);
      toast({
        variant: 'destructive',
        title: 'Erro na inscrição',
        description: error.message || 'Não foi possível se inscrever.',
      });
    } finally {
      setIsRegistering(false);
    }
  };

  // ✅ FUNÇÃO CORRIGIDA: Avatar dos participantes
  const renderParticipantAvatars = (event) => {
    const maxVagas = event.max_vagas || event.vagas;
    const approvedParticipants = eventParticipants[event.id] || [];
    const avatars = [];

    approvedParticipants.forEach((participant) => {
      // ✅ Constrói URL do avatar corretamente
      const getParticipantAvatar = () => {
        const avatarUrl = participant.user?.avatar_url;
        if (!avatarUrl) {
          return `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.user?.username || 'User')}&background=8b5cf6&color=fff&size=40`;
        }
        // Se já é URL completa (http/https), retorna direto
        if (avatarUrl.startsWith('http')) {
          return avatarUrl;
        }
        // ✅ Constrói a URL pública do Supabase com timestamp para evitar cache
        const { data } = supabase.storage.from('avatars').getPublicUrl(avatarUrl);
        return `${data.publicUrl}?t=${new Date().getTime()}`;
      };

      avatars.push(
        <img
          key={`participant-${participant.id}`}
          src={getParticipantAvatar()}
          alt={participant.user?.username || 'Participante'}
          className="w-10 h-10 rounded-full border-2 border-green-500/70 object-cover"
          title={participant.user?.username || 'Participante'}
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
              participant.user?.username || 'User'
            )}&background=8b5cf6&color=fff&size=40`;
          }}
        />
      );
    });

    const remainingSlots = maxVagas - approvedParticipants.length;
    for (let i = 0; i < remainingSlots; i++) {
      avatars.push(
        <div
          key={`empty-${i}`}
          className="w-10 h-10 rounded-full border-2 border-white/20 bg-white/5 flex items-center justify-center"
          title="Vaga disponível"
        >
          <Users className="w-5 h-5 text-white/40" />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {avatars}
      </div>
    );
  };

  const getUserParticipationBadge = (eventId) => {
    const status = userParticipations[eventId];
    
    if (!status) return null;

    const badges = {
      aprovado: {
        label: '✓ Inscrito',
        className: 'bg-green-500/20 text-green-300 border-green-500/50',
        icon: CheckCircle
      },
      pendente: {
        label: '⏳ Pendente',
        className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
        icon: Clock
      },
      rejeitado: {
        label: '✗ Rejeitado',
        className: 'bg-red-500/20 text-red-300 border-red-500/50',
        icon: XCircle
      },
      cancelado: {
        label: 'Cancelado',
        className: 'bg-gray-500/20 text-gray-300 border-gray-500/50',
        icon: XCircle
      }
    };

    const badge = badges[status];
    if (!badge) return null;

    const Icon = badge.icon;

    if (status === 'aprovado') {
      return (
        <div className="space-y-2">
          <div className={`w-full px-4 py-3 rounded-lg border-2 ${badge.className} flex items-center justify-center gap-2 font-semibold`}>
            <Icon className="w-5 h-5" />
            {badge.label}
          </div>
          <Link to={`/event/${eventId}/chat`}>
            <Button className="w-full" variant="outline" size="sm">
              <MessageSquare className="w-4 h-4 mr-2" />
              Acessar Chat
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <div className={`w-full px-4 py-3 rounded-lg border-2 ${badge.className} flex items-center justify-center gap-2 font-semibold`}>
        <Icon className="w-5 h-5" />
        {badge.label}
      </div>
    );
  };

  const handleCancelEvent = async (event) => {
    setEventToCancel(event);
    setCancelError(null);

    try {
      const { data: participants, error: participantsError } = await supabase
        .from('event_participants')
        .select('id, status')
        .eq('event_id', event.id)
        .eq('status', 'aprovado');

      if (participantsError) throw participantsError;

      const hasConfirmedParticipants = participants && participants.length > 0;
      const eventStart = new Date(event.start_time);
      const now = new Date();
      const hoursUntilEvent = (eventStart - now) / (1000 * 60 * 60);

      if (hasConfirmedParticipants && hoursUntilEvent < 24) {
        setCancelError(
          `Não é possível cancelar este evento com menos de 24 horas de antecedência quando há participantes confirmados. ${participants.length} ${participants.length === 1 ? 'participante confirmado' : 'participantes confirmados'}.`
        );
        setCancelModalOpen(true);
        return;
      }

      setCancelModalOpen(true);
    } catch (error) {
      console.error('Erro ao verificar participantes:', error);
      alert('Erro ao verificar participantes do evento');
    }
  };

  const confirmCancelEvent = async () => {
    if (!eventToCancel) return;

    const reason = prompt('Motivo do cancelamento (opcional):');
    
    try {
      const { error } = await supabase
        .from('events')
        .update({ 
          status: 'Cancelado',
          cancelamento_motivo: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventToCancel.id);

      if (error) throw error;

      setCancelModalOpen(false);
      setEventToCancel(null);
      loadDashboardData();
      
      toast({ title: 'Evento cancelado com sucesso!' });
    } catch (error) {
      console.error('Erro ao cancelar evento:', error);
      toast({ 
        variant: "destructive",
        title: 'Erro ao cancelar evento',
        description: error.message
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Calendar className="w-16 h-16 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Dashboard | Mesapra2</title>
      </Helmet>

      <div className="flex justify-between items-center px-6 py-4 bg-gray-900/80 backdrop-blur-lg border-b border-white/10 sticky top-0 z-40 rounded-b-2xl">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors group relative"
            title="Configurações"
          >
            <SettingsIcon className="w-6 h-6 text-white/80 group-hover:text-white group-hover:rotate-45 transition-all duration-300" />
          </button>

          <div className="relative">
            <button
              className="focus:outline-none"
              onClick={() => setShowMenu(!showMenu)}
            >
              <img
                src={getAvatarUrl()}
                alt="Avatar do usuário"
                className="w-10 h-10 rounded-full border-2 border-purple-500/50 object-cover hover:border-purple-500 transition-colors"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user?.email || 'Usuário'
                  )}&background=8b5cf6&color=fff&size=40`;
                }}
              />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-gray-800/90 backdrop-blur-md border border-white/10 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="py-1">
                  <div className="px-4 py-3">
                    <p className="text-sm font-semibold text-white truncate">
                      {user?.user_metadata?.name || 'Usuário'}
                    </p>
                    <p className="text-xs text-white/60 truncate">{user?.email}</p>
                  </div>

                  <div className="border-t border-white/10"></div>

                  <Link
                    to="/profile"
                    className="flex items-center w-full px-4 py-2 text-sm text-white/80 hover:bg-white/10"
                    onClick={() => setShowMenu(false)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-3 h-5 w-5"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="10" r="3" />
                      <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
                    </svg>
                    Meu Perfil
                  </Link>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setSettingsOpen(true);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-white/80 hover:bg-white/10"
                  >
                    <SettingsIcon className="mr-3 h-5 w-5" />
                    Configurações
                  </button>

                  <div className="border-t border-white/10"></div>

                  <button
                    className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-white/10"
                    onClick={() => supabase.auth.signOut()}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-3 h-5 w-5"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" x2="9" y1="12" y2="12" />
                    </svg>
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-effect rounded-2xl p-6 border border-white/10 flex items-center">
              <Calendar className="w-8 h-8 text-purple-500 mr-4" />
              <div>
                <p className="text-white/60 text-sm">Eventos Participados</p>
                <p className="text-white text-xl font-semibold">{stats.eventosParticipados}</p>
              </div>
            </div>
            <div className="glass-effect rounded-2xl p-6 border border-white/10 flex items-center">
              <Clock className="w-8 h-8 text-green-500 mr-4" />
              <div>
                <p className="text-white/60 text-sm">Próximos Eventos</p>
                <p className="text-white text-xl font-semibold">{stats.proximosEventos}</p>
              </div>
            </div>
            <div className="glass-effect rounded-2xl p-6 border border-white/10 flex items-center">
              <Star className="w-8 h-8 text-yellow-500 mr-4" />
              <div>
                <p className="text-white/60 text-sm">Avaliação Média</p>
                <p className="text-white text-xl font-semibold">{stats.avaliacaoMedia.toFixed(1)}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-white mb-4">Eventos Recentes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentEvents.map((event) => {
                const backgroundImage = getPartnerBackground(event.partner);
                
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * recentEvents.indexOf(event) }}
                    className="group"
                  >
                    <div className="relative rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all cursor-pointer h-full">
                      {/* 🔔 Badge de candidaturas pendentes */}
                      {event.creator_id === user.id && pendingParticipations[event.id] > 0 && (
                        <div className="absolute top-3 right-3 z-20">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="relative"
                          >
                            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold border-2 border-white/80 shadow-lg">
                              {pendingParticipations[event.id] > 9 ? '9+' : pendingParticipations[event.id]}
                            </div>
                          </motion.div>
                        </div>
                      )}

                      <div 
                        className="absolute inset-0 z-0"
                        style={{
                          background: backgroundImage
                            ? `linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url(${backgroundImage})`
                            : 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(236, 72, 153, 0.3) 100%)',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      
                      <div className="absolute inset-0 z-0 bg-black/40 backdrop-blur-sm" />

                      <div className="relative z-10 p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <img
                            src={getCreatorAvatar(event.creator)}
                            alt={event.creator?.username || 'Anfitrião'}
                            className="w-10 h-10 rounded-full border-2 border-purple-500/70 object-cover"
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                event.creator?.username || 'Anfitrião'
                              )}&background=8b5cf6&color=fff&size=48`;
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white/90 text-sm font-medium truncate">
                              {event.creator?.username || 'Anfitrião'}
                            </p>
                            <p className="text-white/50 text-xs">organizador</p>
                          </div>
                        </div>

                        <Link to={`/event/${event.id}`}>
                          <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 hover:text-purple-300 transition-colors">
                            {event.title}
                          </h3>
                        </Link>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-white/70 text-sm">
                            <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">
                              {getPartnerAddress(event.partner)}
                            </span>
                          </div>

                          <div className="flex items-center text-white/70 text-sm">
                            <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">
                              {format(new Date(event.start_time), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>

                          <div className="flex items-center text-white/70 text-sm">
                            <Users className="w-4 h-4 mr-2 flex-shrink-0" />
                            {event.vagas} {event.vagas === 1 ? 'vaga' : 'vagas'}
                          </div>
                        </div>

                        {event.hashtags && event.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {event.hashtags.slice(0, 2).map((tag, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 rounded-full bg-purple-500/30 backdrop-blur-sm text-purple-200 text-xs border border-purple-400/30"
                              >
                                #{tag}
                              </span>
                            ))}
                            {event.hashtags.length > 2 && (
                              <span className="px-2 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/60 text-xs">
                                +{event.hashtags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Mostrar participantes se houver e o usuário NÃO é o criador */}
                        {eventParticipants[event.id] && eventParticipants[event.id].length > 0 && event.creator_id !== user.id && (
                          <div className="space-y-2">
                            <span className="text-white/60 text-sm font-medium">Participantes ({eventParticipants[event.id].length})</span>
                            {renderParticipantAvatars(event)}
                          </div>
                        )}
                        
                        {event.creator_id === user.id ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-white/60 text-sm font-medium">
                                Participantes
                              </span>
                              <span className="text-white/40 text-xs">
                                {(eventParticipants[event.id] || []).length} / {event.max_vagas || event.vagas}
                              </span>
                            </div>
                            {renderParticipantAvatars(event)}

                            <Link to={`/event/${event.id}/chat`}>
                              <Button className="w-full" variant="outline" size="sm">
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Acessar Chat do Evento
                              </Button>
                            </Link>
                            
                            <Button
                              onClick={(e) => {
                                e.preventDefault();
                                handleCancelEvent(event);
                              }}
                              variant="destructive"
                              className="w-full"
                              size="sm"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancelar Evento
                            </Button>
                          </div>
                        ) : crusherInvites[event.id] ? (
                          <div className="space-y-2">
                            <div className="glass-effect rounded-lg p-3 border border-pink-500/30 bg-pink-500/10">
                              <p className="text-pink-300 text-sm font-medium flex items-center gap-2">
                                <Heart className="w-4 h-4" />
                                Você recebeu um convite Crusher exclusivo!
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleAcceptCrusherInvite(event);
                                }}
                                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500"
                                size="sm"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Aceitar Convite
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleRejectCrusherInvite(event);
                                }}
                                variant="outline"
                                size="sm"
                                className="flex-1"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Recusar
                              </Button>
                            </div>
                          </div>
                        ) : userParticipations[event.id] ? (
                          getUserParticipationBadge(event.id)
                        ) : (
                          <Button
                            onClick={(e) => {
                              e.preventDefault();
                              handleOpenApplyModal(event);
                            }}
                            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
                            size="sm"
                          >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Participar
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {recentEvents.length === 0 && (
              <div className="glass-effect rounded-2xl p-12 border border-white/10 text-center">
                <Calendar className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <p className="text-white/60 text-lg mb-4">
                  Nenhum evento disponível no momento
                </p>
                <Link to="/criar-evento">
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                    Criar Primeiro Evento
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <Settings 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
      />

      {/* ================================================================= */}
      {/* 💡 4. DIALOG CORRIGIDO COM LÓGICA CONDICIONAL 💡 */}
      {/* ================================================================= */}
      <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              {selectedEvent?.event_type === 'institucional'
                ? 'Confirme sua inscrição para este evento.'
                : 'Candidate-se para participar deste evento'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <>
              {selectedEvent.event_type === 'institucional' ? (
                // 1. Lógica para Evento Institucional
                <div className="space-y-4 pt-4">
                  <div className="p-4 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
                    <p>Este é um evento institucional. Sua inscrição será aprovada automaticamente.</p>
                  </div>
                  <Button
                    onClick={() => handleInstitutionalApply(selectedEvent)}
                    disabled={isRegistering}
                    className="w-full"
                  >
                    {isRegistering ? (
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {isRegistering ? 'Inscrevendo...' : 'Inscrever-se Agora'}
                  </Button>
                </div>
              ) : (
                // 2. Lógica para Evento Normal (como estava antes)
                <EventApply 
                  event={selectedEvent} 
                  onSuccess={handleApplySuccess}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Evento</DialogTitle>
            <DialogDescription>
              {eventToCancel?.title}
            </DialogDescription>
          </DialogHeader>
          
          {cancelError ? (
            <div className="space-y-4">
              <div className="glass-effect rounded-lg p-4 border border-red-500/30 bg-red-500/10">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-red-300 font-semibold mb-1">
                      Cancelamento Não Permitido
                    </h4>
                    <p className="text-red-200/80 text-sm">
                      {cancelError}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => {
                  setCancelModalOpen(false);
                  setCancelError(null);
                  setEventToCancel(null);
                }}
                className="w-full"
              >
                Entendi
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="glass-effect rounded-lg p-4 border border-yellow-500/30 bg-yellow-500/10">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-yellow-300 font-semibold mb-1">
                      Confirmar Cancelamento
                    </h4>
                    <p className="text-yellow-200/80 text-sm">
                      Tem certeza que deseja cancelar este evento? Esta ação não pode ser desfeita.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCancelModalOpen(false);
                    setEventToCancel(null);
                  }}
                  className="flex-1 glass-effect border-white/10"
                >
                  Voltar
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmCancelEvent}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar Evento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Dashboard;