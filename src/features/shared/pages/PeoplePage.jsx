import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, Loader2, Heart, Eye, XCircle, Star } from 'lucide-react';
import { toast } from '@/features/shared/components/ui/use-toast';
import { useMultiplePresence } from '@/hooks/usePresence';
import { calculateStatus, getStatusColor, getStatusLabel } from '@/services/PresenceService.ts';
import { FavoriteRestaurantService } from '@/services/FavoriteRestaurantService';
import MesaPra2Logo from '@/components/MesaPra2Logo';

const PeoplePage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [selectedUserFavorites, setSelectedUserFavorites] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [pokingStates, setPokingStates] = useState({});
  const isPartner = profile?.profile_type === 'partner';
  const isPremium = profile?.is_premium === true;

  // ✅ Obter IDs dos usuários para monitorar presença
  const userIds = people.map(person => person.id);
  
  // ✅ Hook para monitorar presença de múltiplos usuários
  const { getStatus, getPresence, isLoading: presenceLoading } = useMultiplePresence(userIds);

  // ✅ Função para obter status de presença com fallback
  const getPresenceStatus = useCallback((userId, lastSeen) => {
    const realtimeStatus = getStatus(userId);
    if (realtimeStatus !== 'offline') {
      return realtimeStatus;
    }
    
    // Se offline no realtime, verificar last_seen se disponível
    if (lastSeen) {
      return calculateStatus(lastSeen);
    }
    
    return 'offline';
  }, [getStatus]);

  // ✅ Função para obter cor do indicador de presença
  const getPresenceColor = (status) => {
    return getStatusColor(status);
  };

  // ✅ Função para obter texto do status
  const getPresenceText = (status) => {
    return getStatusLabel(status);
  };

  // ✅ FUNÇÃO ADICIONADA: Helper para construir URL do avatar corretamente
  const getAvatarUrl = (person) => {
    if (!person?.avatar_url || typeof person.avatar_url !== 'string' || person.avatar_url.trim() === '') {
      return null;
    }

    // Se já é URL completa (http/https), retorna direto
    if (person.avatar_url.startsWith('http')) {
      return person.avatar_url;
    }

    // ✅ Constrói a URL pública do Supabase
    const { data } = supabase.storage.from('avatars').getPublicUrl(person.avatar_url);
    return `${data.publicUrl}?t=${new Date().getTime()}`;
  };

  const fetchPeople = useCallback(async () => {
    if (!user) {
        setLoading(false);
        setPeople([]);
        return;
    }
    try {
      setLoading(true);
      setError(null);

      // Busca os perfis públicos (last_seen será adicionado após migração)
      const { data: profilesData, error: fetchError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio, public_profile, allow_pokes, reputation_stars')
        .neq('id', user.id)
        .eq('public_profile', true)
        .order('username', { ascending: true});

      if (fetchError) throw fetchError;

      // Para cada perfil, busca o número de eventos participados
      const peopleWithStats = await Promise.all(
        (profilesData || []).map(async (person) => {
          console.log(`🔎 Contando eventos de ${person.username} (${person.id})...`);
          
          // Conta eventos onde o usuário participou (status aprovado)
          const { count: eventsCount, error: countError } = await supabase
            .from('event_participants')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', person.id)
            .eq('status', 'aprovado');

          if (countError) {
            console.error(`❌ Erro ao contar eventos de ${person.username}:`, countError);
            return { ...person, events_participated: 0 };
          }

          console.log(`✅ ${person.username}: ${eventsCount || 0} eventos aprovados`);

          return {
            ...person,
            events_participated: eventsCount || 0
          };
        })
      );

      setPeople(peopleWithStats);
    } catch (err) {
      console.error('❌ Erro ao carregar pessoas:', err);
      setError(`Não foi possível carregar as pessoas: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPeople();
  }, [user, fetchPeople]);

  // ✅ Log para debug da presença
  useEffect(() => {
    if (userIds.length > 0) {
      console.log('👥 Monitorando presença para:', userIds.length, 'usuários');
      console.log('👥 Status de presença carregando:', presenceLoading);
    }
  }, [userIds.length, presenceLoading]);

  const sendPoke = async (targetUserId, targetUsername) => {
    setPokingStates(prev => ({ ...prev, [targetUserId]: true }));
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error: checkError, count } = await supabase
        .from('pokes')
        .select('id', { count: 'exact', head: true })
        .eq('from_user_id', user.id)
        .eq('to_user_id', targetUserId)
        .gte('created_at', `${today}T00:00:00Z`);

      if (checkError) throw checkError;

      if (count > 0) {
        toast({
            variant: "destructive",
            title: "Limite Atingido",
            description: `Você já enviou um Tok para ${targetUsername || 'esta pessoa'} hoje.`,
        });
        return;
      }

      const { error: insertError } = await supabase
        .from('pokes')
        .insert({
            from_user_id: user.id,
            to_user_id: targetUserId,
          });

      if (insertError) throw insertError;

      toast({
          title: "Tok Enviado!",
          description: `Você enviou um Tok para ${targetUsername || 'esta pessoa'} 👋`,
      });

    } catch (err) {
      console.error('Erro ao enviar Tok:', err);
      toast({
          variant: "destructive",
          title: "Erro",
          description: `Não foi possível enviar o Tok: ${err.message}`,
      });
    } finally {
       setPokingStates(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const createCrusher = (targetUserId) => {
    // ✅ Verificar se é Premium
    if (!isPremium) {
      toast({
        variant: "destructive",
        title: "Premium Necessário",
        description: "Eventos Crusher são exclusivos para membros Premium",
      });
      return;
    }

    navigate(`/criar-evento/crusher?invite=${targetUserId}`);
  };

  const viewProfile = async (userId) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (!profileData) throw new Error("Perfil não encontrado");

      // Busca o número de eventos participados (status aprovado)
      const { count: eventsCount } = await supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'aprovado');

      setSelectedProfile({
        ...profileData,
        events_participated: eventsCount || 0
      });

      // Buscar favoritos do usuário (apenas se o perfil é público)
      if (profileData.public_profile) {
        setLoadingFavorites(true);
        try {
          const favoritesResult = await FavoriteRestaurantService.getUserFavorites(userId);
          if (favoritesResult.success) {
            setSelectedUserFavorites(favoritesResult.data || []);
          } else {
            setSelectedUserFavorites([]);
          }
        } catch (favError) {
          console.error('❌ Erro ao carregar favoritos do usuário:', favError);
          setSelectedUserFavorites([]);
        } finally {
          setLoadingFavorites(false);
        }
      } else {
        setSelectedUserFavorites([]);
      }
    } catch (err) {
      console.error('❌ Erro ao carregar perfil:', err);
      toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar o perfil.",
      });
    }
  };

  const closeProfileModal = () => {
    setSelectedProfile(null);
    setSelectedUserFavorites([]);
    setLoadingFavorites(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchPeople}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="mb-8">
        <div className="flex items-center space-x-6 mb-4">
          {/* Logo com efeito suave */}
          <MesaPra2Logo 
            size="lg" 
            variant="dark"
            glow={true}
            animate={false}
            className="hover:scale-105 transition-transform duration-300"
          />
          
          {/* Separador minimalista */}
          <div className="hidden sm:block h-12 w-px bg-gradient-to-b from-transparent via-blue-400 to-transparent"></div>
          
          {/* Textos */}
          <div>
            <h1 className="text-3xl font-bold mb-2 gradient-text">Pessoas Ativas</h1>
            <p className="text-white/60">Conecte-se com outros membros da comunidade</p>
          </div>
        </div>
      </div>

      {!isPartner && (
        <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <span className="text-2xl">👇</span>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Sobre as Interações</h3>
              <p className="text-white/70 text-sm">
                <strong>Tok 👇:</strong> Demonstre interesse de forma leve (1x por dia).<br/>
                <strong>Mesapra2 💘:</strong> Envie um convite especial direto para um evento exclusivo (requer Premium).
              </p>
            </div>
          </div>
        </div>
      )}

      {people.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto mb-4 text-white/20" />
          <h3 className="text-xl font-semibold mb-2">Nenhuma pessoa pública no momento</h3>
          <p className="text-white/60">
            Nenhum usuário habilitou seu perfil como público ainda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {people.map((person) => {
            const allowsPokes = person.allow_pokes === true;
            const isPoking = pokingStates[person.id];
            const avatarUrl = getAvatarUrl(person);
            const presenceStatus = getPresenceStatus(person.id, person.last_seen);
            const presenceColor = getPresenceColor(presenceStatus);
            const presenceText = getPresenceText(presenceStatus);

            return (
              <div
                key={person.id}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={person.username || 'Usuário'}
                          className="w-16 h-16 rounded-full object-cover border-2 border-purple-500/30"
                          onError={(e) => {
                             e.target.style.display = 'none';
                             e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold"
                        style={{ display: avatarUrl ? 'none' : 'flex' }}
                      >
                        {(person.username || person.full_name || 'U')[0].toUpperCase()}
                      </div>
                      {/* ✅ Indicador de presença real */}
                      <div 
                        className={`absolute -bottom-1 -right-1 w-4 h-4 ${presenceColor} rounded-full border-2 border-background`}
                        title={presenceText}
                      ></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {person.full_name || person.username || 'Usuário'}
                      </h3>
                      {person.username && (
                        <p className="text-white/60 text-sm">@{person.username}</p>
                      )}
                      {/* Estatísticas: Ranking e Eventos */}
                      <div className="flex gap-2 mt-2">
                        {/* Ranking de Qualificação */}
                        {person.reputation_stars !== null && person.reputation_stars !== undefined && (
                          <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs font-medium text-yellow-400">
                              {person.reputation_stars.toFixed(1)}
                            </span>
                          </div>
                        )}
                        {/* Eventos Participados */}
                        <div className="flex items-center gap-1 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                          <span className="text-xs font-medium text-purple-400">
                            {person.events_participated || 0} {person.events_participated === 1 ? 'evento' : 'eventos'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {person.bio && (
                    <p className="text-white/70 text-sm mb-4 line-clamp-2">
                      {person.bio}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex gap-2 mt-4">
                    
                    {!isPartner && (
                      <>
                        {/* ✅ Botão Tok - sempre visível, desabilitado se não aceita */}
                        <button
                          onClick={() => sendPoke(person.id, person.username || person.full_name)}
                          className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                            allowsPokes
                              ? 'bg-purple-600 hover:bg-purple-700 text-white'
                              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          }`}
                          title={allowsPokes ? "Enviar Tok" : "Não aceita Toks"}
                          disabled={isPoking || !allowsPokes}
                        >
                          {isPoking ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Tok 👇'
                          )}
                        </button>

                        {/* ✅ Botão Mesapra2 - sempre visível, requer Premium */}
                        <button
                          onClick={() => createCrusher(person.id)}
                          className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                            isPremium
                              ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white'
                              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          }`}
                          title={isPremium ? "Criar Evento Mesapra2" : "Requer Premium"}
                          disabled={!isPremium}
                        >
                          <Heart className="w-4 h-4" />
                          Mesapra2 {!isPremium && '🔒'}
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => viewProfile(person.id)}
                      className={`px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors ${isPartner ? 'flex-1 w-full' : ''}`}
                      title="Ver Perfil"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  {/* ✅ Indicador visual - mostra se não aceita Toks */}
                  {!isPartner && !allowsPokes && (
                    <div className="mt-3 text-center">
                      <span className="text-xs text-red-400/80">
                        🚫 Não aceita Toks
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Perfil */}
      {selectedProfile && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeProfileModal}
        >
          <div
            className="bg-gradient-to-br from-[#1a112e] to-[#2e112a] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-black/50 backdrop-blur-sm border-b border-white/10 p-4 sm:p-6 flex items-center justify-between z-10">
              <h2 className="text-xl sm:text-2xl font-bold gradient-text truncate">Perfil</h2>
              <button
                onClick={closeProfileModal}
                className="text-white/60 hover:text-white transition-colors p-1 rounded-full -mr-2"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-6">
                 <div className="relative flex-shrink-0">
                  {getAvatarUrl(selectedProfile) ? (
                    <img
                      src={getAvatarUrl(selectedProfile)}
                      alt={selectedProfile.username}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-purple-500/50"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold">
                      {(selectedProfile.username || selectedProfile.full_name || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <h3 className="text-xl sm:text-2xl font-bold mb-1 truncate">
                    {selectedProfile.full_name || selectedProfile.username}
                  </h3>
                  {selectedProfile.username && (
                    <p className="text-white/60 truncate">@{selectedProfile.username}</p>
                  )}
                  {/* Estatísticas: Ranking e Eventos */}
                  <div className="flex gap-3 mt-3 justify-center sm:justify-start flex-wrap">
                    {/* Ranking de Qualificação */}
                    {selectedProfile.reputation_stars !== null && selectedProfile.reputation_stars !== undefined && (
                      <div className="flex items-center gap-1.5 bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400"/>
                        <span className="text-sm font-medium text-yellow-400">{selectedProfile.reputation_stars.toFixed(1)}</span>
                        <span className="text-xs text-yellow-400/70">ranking</span>
                      </div>
                    )}
                    {/* Eventos Participados */}
                    <div className="flex items-center gap-1.5 bg-purple-500/10 px-3 py-1.5 rounded-full border border-purple-500/20">
                      <span className="text-sm font-medium text-purple-400">
                        {selectedProfile.events_participated || 0}
                      </span>
                      <span className="text-xs text-purple-400/70">
                        {selectedProfile.events_participated === 1 ? 'evento' : 'eventos'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedProfile.bio && (
                <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                  <h4 className="text-sm font-semibold text-white/60 mb-2">Sobre</h4>
                  <p className="text-white whitespace-pre-wrap">{selectedProfile.bio}</p>
                </div>
              )}

              {selectedProfile.hashtags_interesse && selectedProfile.hashtags_interesse.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-white/60 mb-3">Interesses</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProfile.hashtags_interesse.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm border border-purple-500/30"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ✅ SEÇÃO DE FOTOS CORRIGIDA */}
              {selectedProfile.photos && Array.isArray(selectedProfile.photos) && selectedProfile.photos.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-white/60 mb-3">Fotos</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedProfile.photos
                      .filter(photo => photo && typeof photo === 'string' && photo.trim() !== '')
                      .map((photoPath, index) => {
                      const photoUrl = photoPath.startsWith('http') 
                        ? photoPath 
                        : supabase.storage.from('photos').getPublicUrl(photoPath).data.publicUrl;
                      
                      return photoUrl ? (
                        <a href={photoUrl} target="_blank" rel="noopener noreferrer" key={index}>
                          <img
                            src={photoUrl}
                            alt={`Foto ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-white/10 hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* ✅ SEÇÃO DE FAVORITOS PÚBLICOS */}
              {selectedProfile && selectedProfile.public_profile && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                    Restaurantes Favoritos
                  </h4>
                  
                  {loadingFavorites ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-white/60" />
                      <span className="ml-2 text-white/60 text-sm">Carregando favoritos...</span>
                    </div>
                  ) : selectedUserFavorites.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {selectedUserFavorites.map((restaurant) => (
                        <div
                          key={restaurant.id}
                          className="bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {restaurant.restaurant_photo_url && (
                              <img
                                src={restaurant.restaurant_photo_url}
                                alt={restaurant.restaurant_name}
                                className="w-12 h-12 rounded-lg object-cover border border-white/10"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-white text-sm truncate">
                                {restaurant.restaurant_name}
                              </h5>
                              {restaurant.restaurant_address && (
                                <p className="text-white/60 text-xs truncate">
                                  {restaurant.restaurant_address}
                                </p>
                              )}
                              {restaurant.restaurant_rating && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                  <span className="text-xs text-yellow-400">
                                    {restaurant.restaurant_rating.toFixed(1)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <Heart className="w-4 h-4 text-red-500 fill-red-500 flex-shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-white/5 rounded-lg border border-white/10">
                      <Heart className="w-8 h-8 text-white/20 mx-auto mb-2" />
                      <p className="text-white/60 text-sm">Nenhum favorito compartilhado</p>
                    </div>
                  )}
                </div>
              )}

              {/* ✅ BOTÕES DO MODAL CORRIGIDOS */}
              <div className="space-y-4 pt-6 border-t border-white/10">
                {/* ✅ Botão Ver Perfil - sempre visível para todos */}
                <button
                  onClick={() => {
                    navigate(`/user/${selectedProfile.id}`);
                    closeProfileModal();
                  }}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold"
                >
                  <Eye className="w-4 h-4" />
                  Ver Perfil Completo
                </button>
                
                {!isPartner && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* ✅ Botão Tok - sempre visível, desabilitado se não aceita */}
                    <button
                      onClick={() => {
                        sendPoke(selectedProfile.id, selectedProfile.username || selectedProfile.full_name);
                      }}
                      className={`flex-1 px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold ${
                        selectedProfile.allow_pokes === true
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={pokingStates[selectedProfile.id] || selectedProfile.allow_pokes !== true}
                      title={selectedProfile.allow_pokes === true ? "Enviar Tok" : "Não aceita Toks"}
                    >
                      {pokingStates[selectedProfile.id] ? <Loader2 className="w-5 h-5 animate-spin"/> : '👇'}
                      Enviar Tok
                    </button>

                    {/* ✅ Botão Mesapra2 - sempre visível, requer Premium */}
                    <button
                      onClick={() => {
                        createCrusher(selectedProfile.id);
                        closeProfileModal();
                      }}
                      className={`flex-1 px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold ${
                        isPremium
                          ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={!isPremium}
                      title={isPremium ? "Criar Mesapra2" : "Requer Premium"}
                    >
                      <Heart className="w-4 h-4" />
                      Criar Mesapra2 {!isPremium && '(Requer Premium)'}
                    </button>
                  </div>
                )}
              </div>

              {/* ✅ Indicador se não aceita Toks */}
              {!isPartner && selectedProfile.allow_pokes !== true && (
                <div className="text-center mt-3">
                  <span className="text-xs text-red-400/80">
                    🚫 Não aceita Toks
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeoplePage;