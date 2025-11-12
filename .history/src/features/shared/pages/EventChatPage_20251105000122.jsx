// src/features/shared/pages/EventChatPage.jsx - VERSÃO OTIMIZADA
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

const INITIAL_MESSAGE_LIMIT = 50; // Lazy load: apenas últimas 50 mensagens

const EventChatPage = () => {
  const { id } = useParams();
  const eventId = parseInt(id, 10);
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const profileMapRef = useRef(new Map()); // ✅ FIX #1: Usar ref ao invés de state

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ FIX #6: Combinar estados relacionados em um único objeto
  const [chatState, setChatState] = useState({
    eventName: '',
    eventStatus: 'Aberto',
    event: null,
    isCreator: false,
    isApprovedParticipant: false,
    activeParticipantCount: 0,
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const getSenderProfile = useCallback((userId) => {
    return profileMapRef.current.get(userId) || { username: 'Usuário', full_name: '', avatar_url: null };
  }, []);

  // ✅ FIX #4: Memoizar avatars URLs para evitar recalcular
  const avatarCache = useRef(new Map());

  const getAvatarUrl = useCallback((profile) => {
    if (!profile) {
      return `https://ui-avatars.com/api/?name=U&background=8b5cf6&color=fff&size=40`;
    }

    const cacheKey = profile.id || profile.username;
    if (avatarCache.current.has(cacheKey)) {
      return avatarCache.current.get(cacheKey);
    }

    let url;
    if (!profile.avatar_url) {
      const name = profile.username || profile.full_name || 'U';
      url = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8b5cf6&color=fff&size=40`;
    } else {
      try {
        const { data } = supabase.storage.from('avatars').getPublicUrl(profile.avatar_url);
        url = data.publicUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=8b5cf6&color=fff&size=40`;
      } catch {
        url = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username || 'U')}&background=8b5cf6&color=fff&size=40`;
      }
    }

    avatarCache.current.set(cacheKey, url);
    return url;
  }, []);

  // ✅ FIX #1 & #2: Remover profileMap das dependências + paralelizar queries
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
        // ✅ FIX #2: PARALELIZAR queries independentes
        const [
          eventResult,
          approvedCountResult,
          participationResult,
        ] = await Promise.all([
          // Query 1: Buscar evento
          supabase
            .from('events')
            .select('id, title, creator_id, status, event_type, vagas')
            .eq('id', eventId)
            .single(),

          // Query 2: Contar participantes aprovados
          supabase
            .from('event_participants')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId)
            .eq('status', 'aprovado'),

          // Query 3: Verificar participação do usuário
          supabase
            .from('event_participants')
            .select('status')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .maybeSingle(), // ✅ maybeSingle() não dá erro se não encontrar
        ]);

        if (eventResult.error) throw eventResult.error;
        if (approvedCountResult.error) throw approvedCountResult.error;

        const eventData = eventResult.data;
        const approvedCount = approvedCountResult.count || 0;
        const userIsCreator = eventData.creator_id === user.id;
        const userIsApproved = participationResult.data?.status === 'aprovado';

        const eventWithCount = { ...eventData, approvedCount };

        // Verificar disponibilidade do chat
        const availability = isChatAvailable(eventWithCount, userIsCreator, userIsApproved);
        if (!availability.available) {
          setError(availability.reason);

          // ✅ FIX #6: Atualizar estados em batch
          setChatState({
            eventName: eventData.title,
            eventStatus: eventData.status,
            event: eventWithCount,
            isCreator: userIsCreator,
            isApprovedParticipant: userIsApproved,
            activeParticipantCount: approvedCount,
          });

          setLoading(false);
          return;
        }

        // ✅ FIX #2: PARALELIZAR queries de dados do chat
        const [
          messagesResult,
          participantsResult,
          creatorProfileResult,
        ] = await Promise.all([
          // Query 4: Buscar mensagens (com limite para lazy load)
          supabase
            .from('event_messages')
            .select('*')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false })
            .limit(INITIAL_MESSAGE_LIMIT),

          // Query 5: Buscar participantes aprovados com perfis
          supabase
            .from('event_participants')
            .select('profile:profiles(id, username, avatar_url, full_name)')
            .eq('event_id', eventId)
            .eq('status', 'aprovado'),

          // Query 6: Buscar perfil do criador (sempre, para simplificar)
          userIsCreator
            ? supabase
                .from('profiles')
                .select('id, username, avatar_url, full_name')
                .eq('id', user.id)
                .single()
            : Promise.resolve({ data: null }),
        ]);

        if (messagesResult.error) throw messagesResult.error;
        if (participantsResult.error) throw participantsResult.error;

        // ✅ Reverter mensagens (pegamos em DESC, mas queremos ASC no display)
        const messagesData = messagesResult.data.reverse();
        setMessages(messagesData);

        // ✅ Processar profiles em batch
        const newProfileMap = new Map();
        const approvedIds = [];

        participantsResult.data.forEach(p => {
          if (p.profile) {
            newProfileMap.set(p.profile.id, p.profile);
            approvedIds.push(p.profile.id);
          }
        });

        if (creatorProfileResult.data) {
          newProfileMap.set(creatorProfileResult.data.id, creatorProfileResult.data);
        }

        // ✅ Query 7: Buscar perfis faltantes (se houver)
        const senderIds = [...new Set(messagesData.map(msg => msg.user_id))];
        const missingIds = senderIds.filter(id => !newProfileMap.has(id));

        if (missingIds.length > 0) {
          const { data: missingProfiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, full_name')
            .in('id', missingIds);

          missingProfiles?.forEach(p => newProfileMap.set(p.id, p));
        }

        // ✅ FIX #1: Usar ref ao invés de state
        profileMapRef.current = newProfileMap;

        let activeCount = approvedIds.length;
        if (userIsCreator && !approvedIds.includes(user.id)) activeCount++;

        // ✅ FIX #6: Atualizar todos os estados de uma vez
        setChatState({
          eventName: eventData.title,
          eventStatus: eventData.status,
          event: eventWithCount,
          isCreator: userIsCreator,
          isApprovedParticipant: userIsApproved,
          activeParticipantCount: activeCount,
        });

      } catch (err) {
        console.error('Erro ao carregar chat:', err);
        setError('Falha ao carregar o chat.');
      } finally {
        setLoading(false);
      }
    };

    loadChatData();

    // ✅ Realtime subscription
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
          if (!profileMapRef.current.has(newSenderId)) {
            const { data: newProfile } = await supabase
              .from('profiles')
              .select('id, username, avatar_url, full_name')
              .eq('id', newSenderId)
              .single();

            if (newProfile) {
              // ✅ FIX #1: Mutar ref diretamente (não causa re-render)
              profileMapRef.current.set(newProfile.id, newProfile);
            }
          }

          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, user, scrollToBottom]); // ✅ FIX #1: profileMap removido!

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || chatState.eventStatus === 'Concluído') return;

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

  // ✅ FIX #3: Loading skeleton melhorado
  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] bg-gray-900/50 rounded-2xl border border-white/10 overflow-hidden">
        <header className="flex items-center p-4 border-b border-white/10 bg-background/80 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-lg bg-gray-800 animate-pulse mr-4"></div>
          <div className="flex-1">
            <div className="w-32 h-5 bg-gray-800 rounded animate-pulse mb-2"></div>
            <div className="w-24 h-3 bg-gray-800 rounded animate-pulse"></div>
          </div>
        </header>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`flex items-end gap-3 ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div className="w-8 h-8 rounded-full bg-gray-800 animate-pulse"></div>
              <div className={`w-${i % 2 === 0 ? '48' : '64'} h-16 rounded-lg bg-gray-800 animate-pulse`}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    const isInstitutional = chatState.event?.event_type === 'institucional';
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center glass-effect rounded-2xl p-8 border border-white/10 max-w-md">
          <Lock className="w-16 h-16 text-purple-500 mb-4 mx-auto" />
          <h2 className="text-2xl font-semibold text-white mb-3">Chat não disponível</h2>
          <p className="text-white/70 mb-6">{error}</p>

          {isInstitutional && !chatState.isCreator && chatState.isApprovedParticipant && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
              <p className="text-blue-300 text-sm">
                Evento Institucional: O chat será liberado automaticamente assim que o primeiro participante for aprovado.
              </p>
            </div>
          )}

          {!isInstitutional && !chatState.isCreator && chatState.isApprovedParticipant && chatState.event && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
              <p className="text-purple-300 text-sm mb-2">Progresso do evento:</p>
              <p className="text-white text-lg font-semibold">
                {chatState.event.approvedCount} / {chatState.event.vagas} vagas preenchidas
              </p>
              <p className="text-white/60 text-xs mt-2">
                O chat será liberado quando houver pelo menos 1 participante aprovado ou o evento for confirmado.
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
        <title>Chat: {chatState.eventName || 'Evento'} | Mesapra2</title>
      </Helmet>

      <div className="flex flex-col h-[calc(100vh-8rem)] bg-gray-900/50 rounded-2xl border border-white/10 overflow-hidden">
        <header className="flex items-center p-4 border-b border-white/10 bg-background/80 backdrop-blur-sm z-10">
          <Link to={`/event/${eventId}`} className="mr-4">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white truncate">{chatState.eventName}</h1>
            <p className="text-xs text-white/50">
              {chatState.activeParticipantCount} participantes
              {chatState.event?.event_type === 'institucional' && <span className="ml-2 text-purple-400">• Institucional</span>}
            </p>
          </div>
        </header>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {chatState.event?.event_type === 'institucional' && messages.length === 0 && (
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
            const avatarUrl = getAvatarUrl(senderProfile); // ✅ FIX #4: Agora está memoizado

            return (
              <div key={msg.id} className={`flex items-end gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <img
                    src={avatarUrl}
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

                  {(isMe || chatState.isCreator) && (
                    <SimpleDropdown
                      trigger={
                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
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
                    src={avatarUrl}
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
          {chatState.eventStatus === 'Concluído' && (
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
              placeholder={chatState.eventStatus === 'Concluído' ? 'Chat encerrado...' : 'Digite sua mensagem...'}
              className="flex-1 bg-gray-800 border-gray-700"
              autoComplete="off"
              disabled={chatState.eventStatus === 'Concluído'}
            />
            <Button
              type="submit"
              size="icon"
              className="flex-shrink-0"
              disabled={!newMessage.trim() || chatState.eventStatus === 'Concluído'}
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
