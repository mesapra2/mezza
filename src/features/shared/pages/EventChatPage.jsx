// src/pages/EventChatPage.jsx
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
import { isChatAvailable } from '@/utils/chatAvailability.js';

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
  
  // 🆕 NOVOS ESTADOS para controle de disponibilidade
  const [event, setEvent] = useState(null);
  const [isApprovedParticipant, setIsApprovedParticipant] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!eventId || !user) {
        if (!eventId) setError("ID do evento inválido.");
        setLoading(false);
        return;
    }

    const loadChatData = async () => {
      setLoading(true);
      
      try {
        // 🆕 BUSCAR DADOS COMPLETOS DO EVENTO (incluindo tipo e contagem de aprovados)
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('id, title, creator_id, status, event_type, vagas')
          .eq('id', eventId)
          .single();

        if (eventError) throw eventError;
        
        // 🆕 BUSCAR CONTAGEM DE PARTICIPANTES APROVADOS
        const { count: approvedCount, error: countError } = await supabase
          .from('participations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('status', 'aprovado');

        if (countError) throw countError;

        const eventWithCount = {
          ...eventData,
          approvedCount: approvedCount || 0
        };

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
            
          if (participation && participation.status === 'aprovado') {
            userIsApproved = true;
          }
        }
        
        setIsApprovedParticipant(userIsApproved);

        // 🆕 VERIFICAR DISPONIBILIDADE DO CHAT
        const availability = isChatAvailable(eventWithCount, userIsCreator, userIsApproved);

        // 🔒 BLOQUEAR ACESSO SE CHAT NÃO DISPONÍVEL
        if (!availability.available) {
          setError(availability.reason);
          setLoading(false);
          return;
        }

        // Chat disponível - carregar mensagens
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
            if (creatorProfile) {
                newProfileMap.set(creatorProfile.id, creatorProfile);
            }
        }
        
        const missingIds = senderIds.filter(id => !newProfileMap.has(id));
        
        if (missingIds.length > 0) {
            const { data: missingProfiles } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, full_name')
                .in('id', missingIds);
                
            if (missingProfiles) {
                missingProfiles.forEach(p => {
                    newProfileMap.set(p.id, p);
                });
            }
        }

        setProfileMap(newProfileMap); 
        
        let activeCount = approvedIds.length;
        if (userIsCreator && !approvedIds.includes(user.id)) {
            activeCount++;
        }
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
        (payload) => {
          const newSenderId = payload.new.user_id;
          if (!profileMap.has(newSenderId)) {
             const fetchNewProfile = async () => {
               const { data: newProfile } = await supabase
                 .from('profiles')
                 .select('id, username, avatar_url, full_name')
                 .eq('id', newSenderId)
                 .single();
               
               if (newProfile) {
                 setProfileMap(prevMap => new Map(prevMap).set(newProfile.id, newProfile));
               }
             };
             fetchNewProfile();
          }

          setMessages(prevMessages => [...prevMessages, payload.new]);
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

  const getSenderProfile = (userId) => {
    return profileMap.get(userId) || {};
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || eventStatus === 'Concluído') return;

    try {
      const { error } = await supabase
        .from('event_messages')
        .insert({
          event_id: eventId,
          user_id: user.id,
          content: newMessage,
        });

      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      setError('Erro ao enviar mensagem.');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      const { error } = await supabase
        .from('event_messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.id !== messageId)
      );
    } catch (err) {
      console.error('Erro ao deletar mensagem:', err);
      setError('Erro ao deletar mensagem.');
    }
  };

  const getAvatarUrl = (profile) => {
    if (profile?.avatar_url) {
      try {
        if (profile.avatar_url.startsWith('http')) {
          return profile.avatar_url;
        }
      } catch {
        return `https://ui-avatars.com/api/?name=U&background=8b5cf6&color=fff&size=40`;
      }
      
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(profile.avatar_url);
      
      return data.publicUrl;
    }
    
    const name = profile?.username || profile?.full_name || 'U';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8b5cf6&color=fff&size=40`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    // 🆕 TELA DE ERRO MELHORADA com informação sobre tipo de evento
    const isInstitutional = event?.event_type === 'institucional';
    
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center px-4">
        <div className="glass-effect rounded-2xl p-8 border border-white/10 max-w-md">
          <Lock className="w-16 h-16 text-purple-500 mb-4 mx-auto" />
          <h2 className="text-2xl font-semibold text-white mb-3">Chat não disponível</h2>
          <p className="text-white/70 mb-6">{error}</p>
          
          {isInstitutional && !isCreator && isApprovedParticipant && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
              <p className="text-blue-300 text-sm">
                💡 <strong>Evento Institucional:</strong> O chat será liberado automaticamente assim que o primeiro participante for aprovado.
              </p>
            </div>
          )}
          
          {!isInstitutional && !isCreator && isApprovedParticipant && event && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
              <p className="text-purple-300 text-sm mb-2">
                📊 <strong>Progresso do evento:</strong>
              </p>
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
          {/* 🆕 Mensagem informativa para eventos institucionais */}
          {event?.event_type === 'institucional' && messages.length === 0 && (
            <div className="text-center py-8">
              <div className="inline-block p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <p className="text-purple-300 text-sm">
                  🎉 Chat liberado! Este é um evento institucional.<br />
                  Aproveite para interagir e tirar dúvidas com os outros participantes.
                </p>
              </div>
            </div>
          )}
          
          {messages.map((msg) => {
            const senderProfile = getSenderProfile(msg.user_id);
            const isMe = msg.user_id === user.id;

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}
              >
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
                      isMe
                        ? 'bg-purple-600 text-white rounded-br-none'
                        : 'bg-gray-800 text-white/90 rounded-bl-none'
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
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      }
                    >
                      <SimpleDropdownItem 
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="text-red-400"
                      >
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
                🔒 Evento concluído - Chat em modo leitura
              </p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={eventStatus === 'Concluído' ? 'Chat encerrado...' : 'Digite sua mensagem...'}
              aria-label="Campo de mensagem do chat"
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