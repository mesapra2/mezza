// src/features/shared/pages/EventChatPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Send, ArrowLeft, Loader2, Trash2, MoreVertical, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SimpleDropdown, SimpleDropdownItem } from '@/features/shared/components/ui/SimpleDropdown';
import { isChatAvailable } from '@/utils/chatAvailability';

const EventChatPage = () => {
  const { id } = useParams();
  const eventId = parseInt(id, 10);
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileMap, setProfileMap] = useState(new Map());
  const [activeParticipantCount, setActiveParticipantCount] = useState(0);
  const [eventName, setEventName] = useState('');
  const [isCreator, setIsCreator] = useState(false);
  const [eventStatus, setEventStatus] = useState('Aberto');
  const [event, setEvent] = useState(null);
  const [isApprovedParticipant, setIsApprovedParticipant] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getSenderProfile = (userId) => {
    return profileMap.get(userId) || { username: 'Usuário', full_name: '', avatar_url: null };
  };

  const getAvatarUrl = (profile) => {
    if (!profile || !profile.avatar_url) {
      const name = profile?.username || profile?.full_name || 'U';
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8b5cf6&color=fff&size=40`;
    }

    try {
      const { data } = supabase.storage.from('avatars').getPublicUrl(profile.avatar_url);
      return data.publicUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=8b5cf6&color=fff&size=40`;
    } catch {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=8b5cf6&color=fff&size=40`;
    }
  };

  useEffect(() => {
    if (!eventId || !user) {
      if (!eventId) setError('ID do evento inválido.');
      setLoading(false);
      return;
    }

    const loadChatData = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('id, title, creator_id, status, event_type, vagas')
          .eq('id', eventId)
          .single();

        if (eventError) throw eventError;

        const { count: approvedCount, error: countError } = await supabase
          .from('participations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('status', 'aprovado');

        if (countError) throw countError;

        const eventWithCount = { ...eventData, approvedCount: approvedCount || 0 };
        setEvent(eventWithCount);
        setEventName(eventData.title);
        setEventStatus(eventData.status);

        const userIsCreator = eventData.creator_id === user.id;
        setIsCreator(userIsCreator);

        let userIsApproved = false;
        if (!userIsCreator) {
          const { data: participation } = await supabase
            .from('participations')
            .select('status')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .single();

          userIsApproved = participation?.status === 'aprovado';
        }
        setIsApprovedParticipant(userIsApproved);

        const availability = isChatAvailable(eventWithCount, userIsCreator, userIsApproved);
        if (!availability.available) {
          setError(availability.reason);
          setLoading(false);
          return;
        }

        const { data: messagesData, error: messagesError } = await supabase
          .from('event_messages')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;
        setMessages(messagesData);

        const senderIds = [...new Set(messagesData.map(msg => msg.user_id))];
        const { data: approvedParticipants, error: participantsError } = await supabase
          .from('participations')
          .select('profile:profiles(id, username, avatar_url, full_name)')
          .eq('event_id', eventId)
          .eq('status', 'aprovado');

        if (participantsError) throw participantsError;

        const newProfileMap = new Map();
        const approvedIds = [];

        approvedParticipants.forEach(p => {
          if (p.profile) {
            newProfileMap.set(p.profile.id, p.profile);
            approvedIds.push(p.profile.id);
          }
        });

        if (userIsCreator && !newProfileMap.has(user.id)) {
          const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, full_name')
            .eq('id', user.id)
            .single();
          if (creatorProfile) newProfileMap.set(creatorProfile.id, creatorProfile);
        }

        const missingIds = senderIds.filter(id => !newProfileMap.has(id));
        if (missingIds.length > 0) {
          const { data: _ } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, full_name')
            .in('id', missingIds);

          _?.forEach(p => newProfileMap.set(p.id, p));
        }

        setProfileMap(newProfileMap);

        let activeCount = approvedIds.length;
        if (userIsCreator && !approvedIds.includes(user.id)) activeCount++;
        setActiveParticipantCount(activeCount);

      } catch (err) {
        console.error('Erro ao carregar chat:', err);
        setError('Falha ao carregar o chat.');
      } finally {
        setLoading(false);
      }
    };

    loadChatData();

    const channel = supabase
      .channel(`chat_room:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_messages',
          filter: `event_id=eq.${eventId}`,
        },
        async (payload) => {
          const newMsg = payload.new;
          setMessages(prev => [...prev, newMsg]);

          const newSenderId = newMsg.user_id;
          if (!profileMap.has(newSenderId)) {
            const { data: newProfile } = await supabase
              .from('profiles')
              .select('id, username, avatar_url, full_name')
              .eq('id', newSenderId)
              .single();

            if (newProfile) {
              setProfileMap(prev => new Map(prev).set(newProfile.id, newProfile));
            }
          }

          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, user, profileMap]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || eventStatus === 'Concluído') return;

    try {
      const { error } = await supabase
        .from('event_messages')
        .insert({
          event_id: eventId,
          user_id: user.id,
          content: newMessage.trim(),
        });

      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Apagar esta mensagem?')) return;

    try {
      const { error } = await supabase
        .from('event_messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', user.id);

      if (error) throw error;

      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      console.error('Erro ao apagar mensagem:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    const isInstitutional = event?.event_type === 'institucional';
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center glass-effect rounded-2xl p-8 border border-white/10 max-w-md">
          <Lock className="w-16 h-16 text-purple-500 mb-4 mx-auto" />
          <h2 className="text-2xl font-semibold text-white mb-3">Chat não disponível</h2>
          <p className="text-white/70 mb-6">{error}</p>

          {isInstitutional && !isCreator && isApprovedParticipant && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
              <p className="text-blue-300 text-sm">
                Evento Institucional: O chat será liberado automaticamente assim que o primeiro participante for aprovado.
              </p>
            </div>
          )}

          {!isInstitutional && !isCreator && isApprovedParticipant && event && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
              <p className="text-purple-300 text-sm mb-2">Progresso do evento:</p>
              <p className="text-white text-lg font-semibold">
                {event.approvedCount} / {event.vagas} vagas preenchidas
              </p>
              <p className="text-white/60 text-xs mt-2">
                O chat será liberado quando todas as vagas forem preenchidas ou o evento for confirmado.
              </p>
            </div>
          )}

          <Button onClick={() => navigate(`/event/${eventId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Evento
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Chat: {eventName || 'Evento'} | Mesapra2</title>
      </Helmet>

      <div className="flex flex-col h-[calc(100vh-8rem)] bg-gray-900/50 rounded-2xl border border-white/10 overflow-hidden">
        <header className="flex items-center p-4 border-b border-white/10 bg-background/80 backdrop-blur-sm z-10">
          <Link to={`/event/${eventId}`} className="mr-4">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white truncate">{eventName}</h1>
            <p className="text-xs text-white/50">
              {activeParticipantCount} participantes
              {event?.event_type === 'institucional' && <span className="ml-2 text-purple-400">• Institucional</span>}
            </p>
          </div>
        </header>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {event?.event_type === 'institucional' && messages.length === 0 && (
            <div className="text-center py-8">
              <div className="inline-block p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <p className="text-purple-300 text-sm">
                  Chat liberado! Este é um evento institucional.<br />
                  Aproveite para interagir e tirar dúvidas com os outros participantes.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const senderProfile = getSenderProfile(msg.user_id);
            const isMe = msg.user_id === user.id;

            return (
              <div key={msg.id} className={`flex items-end gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <img
                    src={getAvatarUrl(senderProfile)}
                    alt={senderProfile.username || 'Usuário'}
                    className="w-8 h-8 rounded-full border border-white/10 flex-shrink-0 object-cover"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=U&background=8b5cf6&color=fff&size=40`;
                    }}
                  />
                )}
                <div className="flex items-end gap-2">
                  <div
                    className={`flex flex-col max-w-xs md:max-w-md p-3 rounded-lg ${
                      isMe ? 'bg-purple-600 text-white rounded-br-none' : 'bg-gray-800 text-white/90 rounded-bl-none'
                    }`}
                  >
                    {!isMe && (
                      <span className="text-xs font-semibold text-purple-300 mb-1">
                        {senderProfile.username || senderProfile.full_name || 'Usuário'}
                      </span>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <span className="text-xs text-white/50 mt-1 self-end">
                      {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                    </span>
                  </div>

                  {(isMe || isCreator) && (
                    <SimpleDropdown
                      trigger={
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 h-4" />
                        </Button>
                      }
                    >
                      <SimpleDropdownItem onClick={() => handleDeleteMessage(msg.id)} className="text-red-400">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Apagar mensagem
                      </SimpleDropdownItem>
                    </SimpleDropdown>
                  )}
                </div>
                {isMe && (
                  <img
                    src={getAvatarUrl(senderProfile)}
                    alt="Você"
                    className="w-8 h-8 rounded-full border border-white/10 flex-shrink-0 object-cover"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=U&background=8b5cf6&color=fff&size=40`;
                    }}
                  />
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-background/80 backdrop-blur-sm">
          {eventStatus === 'Concluído' && (
            <div className="mb-3 p-2 rounded-lg bg-gray-700/50 border border-gray-600/50">
              <p className="text-gray-300 text-xs text-center">
                Evento concluído - Chat em modo leitura
              </p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={eventStatus === 'Concluído' ? 'Chat encerrado...' : 'Digite sua mensagem...'}
              className="flex-1 bg-gray-800 border-gray-700"
              autoComplete="off"
              disabled={eventStatus === 'Concluído'}
            />
            <Button
              type="submit"
              size="icon"
              className="flex-shrink-0"
              disabled={!newMessage.trim() || eventStatus === 'Concluído'}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default EventChatPage;