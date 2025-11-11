import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Users, 
  Star, 
  Camera, 
  Heart, 
  Clock,
  Utensils,
  Trophy,
  User,
  Loader2
} from 'lucide-react';
import { toast } from '@/features/shared/components/ui/use-toast';

const UserProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Helper para construir URL do avatar
  const getAvatarUrl = (avatarUrl) => {
    if (!avatarUrl || typeof avatarUrl !== 'string' || avatarUrl.trim() === '') {
      return null;
    }

    if (avatarUrl.startsWith('http')) {
      return avatarUrl;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(avatarUrl);
    return `${data.publicUrl}?t=${new Date().getTime()}`;
  };

  // Helper para construir URL das fotos
  const getPhotoUrl = (photoPath) => {
    if (!photoPath || typeof photoPath !== 'string' || photoPath.trim() === '') {
      return null;
    }

    if (photoPath.startsWith('http')) {
      return photoPath;
    }

    const { data } = supabase.storage.from('photos').getPublicUrl(photoPath);
    return data.publicUrl;
  };

  // Buscar dados do perfil
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Erro ao buscar perfil:', error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar o perfil.",
            variant: "destructive",
          });
          navigate('/people');
          return;
        }

        setProfile(data);
      } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        toast({
          title: "Erro",
          description: "Erro inesperado ao carregar perfil.",
          variant: "destructive",
        });
        navigate('/people');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId, navigate]);

  // Buscar eventos participados
  useEffect(() => {
    const fetchUserEvents = async () => {
      try {
        // Primeira query: buscar participações do usuário
        const { data: participations, error: participationsError } = await supabase
          .from('event_participants')
          .select(`
            id,
            created_at,
            event_id
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (participationsError) {
          console.error('Erro ao buscar participações:', participationsError);
          return;
        }

        console.log('🔍 Participações encontradas:', participations?.length || 0);

        if (!participations || participations.length === 0) {
          console.log('⚠️ Nenhuma participação encontrada para o usuário:', userId);
          setEvents([]);
          return;
        }

        // Segunda query: buscar dados dos eventos (sem join)
        const eventIds = participations.map(p => p.event_id);
        console.log('🎯 Event IDs para buscar:', eventIds);
        
        const { data: eventsData, error } = await supabase
          .from('events')
          .select(`
            id,
            title,
            description,
            start_time,
            end_time,
            location,
            vagas,
            status,
            created_at,
            creator_id,
            partner:partners(id, name, address, photos, logo_url)
          `)
          .in('id', eventIds);

        if (error) {
          console.error('Erro ao buscar eventos:', error);
          return;
        }

        console.log('📅 Eventos encontrados:', eventsData?.length || 0);

        // Terceira query: buscar dados dos organizadores
        const creatorIds = [...new Set(eventsData?.map(e => e.creator_id).filter(Boolean) || [])];
        console.log('👥 Creator IDs para buscar:', creatorIds);
        let creatorsData = [];
        
        if (creatorIds.length > 0) {
          const { data: creators, error: creatorsError } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .in('id', creatorIds);
            
          if (!creatorsError) {
            creatorsData = creators || [];
            console.log('👤 Organizadores encontrados:', creatorsData?.length || 0);
          } else {
            console.error('Erro ao buscar organizadores:', creatorsError);
          }
        }

        // Combinar os dados
        const eventsWithParticipation = participations
          .map(participation => {
            const event = eventsData?.find(e => e.id === participation.event_id);
            if (!event) return null;
            
            // Adicionar dados do organizador
            const creator = creatorsData.find(c => c.id === event.creator_id);
            event.profiles = creator || null;
            
            return { ...participation, events: event };
          })
          .filter(Boolean);

        console.log('✅ Eventos finais processados:', eventsWithParticipation?.length || 0);
        setEvents(eventsWithParticipation || []);
      } catch (error) {
        console.error('Erro ao buscar eventos:', error);
      } finally {
        setEventsLoading(false);
      }
    };

    if (userId) {
      fetchUserEvents();
    }
  }, [userId]);

  // Função para formatar data
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Função para obter imagem de fundo do restaurante
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

  // Função para calcular idade
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white mb-4">Perfil não encontrado.</p>
          <Link 
            to="/people" 
            className="text-purple-300 hover:text-purple-200 underline"
          >
            Voltar para Pessoas
          </Link>
        </div>
      </div>
    );
  }

  const avatarUrl = getAvatarUrl(profile.avatar_url);
  const age = calculateAge(profile.birth_date);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header com botão voltar */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
        </div>

        {/* Card do Perfil Principal */}
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar e informações básicas */}
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={profile.full_name || profile.username}
                    className="w-32 h-32 rounded-full object-cover border-4 border-purple-500/50"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center border-4 border-purple-500/50">
                    <User className="w-16 h-16 text-white" />
                  </div>
                )}
              </div>
              
              <h1 className="text-2xl font-bold text-white mt-4">
                {profile.full_name || profile.username}
              </h1>
              
              {profile.username && profile.full_name && (
                <p className="text-purple-300">@{profile.username}</p>
              )}

              {age && (
                <p className="text-white/60 mt-1">{age} anos</p>
              )}
            </div>

            {/* Informações detalhadas */}
            <div className="flex-1 space-y-4">
              {/* Bio/Descrição */}
              {profile.bio && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Sobre</h3>
                  <p className="text-white/80">{profile.bio}</p>
                </div>
              )}

              {/* Informações básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.location && (
                  <div className="flex items-center gap-2 text-white/70">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-white/70">
                  <Calendar className="w-4 h-4" />
                  <span>Membro desde {formatDate(profile.created_at)}</span>
                </div>

                {profile.interests && Array.isArray(profile.interests) && profile.interests.length > 0 && (
                  <div className="md:col-span-2">
                    <h4 className="text-sm font-semibold text-white/60 mb-2">Interesses</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.map((interest, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-purple-600/30 text-purple-300 text-sm rounded-full border border-purple-500/30"
                        >
                          #{interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fotos do Perfil */}
        {profile.photos && Array.isArray(profile.photos) && profile.photos.length > 0 && (
          <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Fotos
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {profile.photos
                .filter(photo => photo && typeof photo === 'string' && photo.trim() !== '')
                .map((photoPath, index) => {
                  const photoUrl = getPhotoUrl(photoPath);
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

        {/* Eventos Participados */}
        <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Eventos Participados
            {!eventsLoading && <span className="text-sm text-white/60">({events.length})</span>}
          </h3>

          {eventsLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-white mx-auto mb-2" />
              <p className="text-white/60">Carregando eventos...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-white/30 mx-auto mb-2" />
              <p className="text-white/60">Nenhum evento participado ainda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((participation) => {
                const event = participation.events;
                const organizer = event.profiles;
                const organizerAvatarUrl = getAvatarUrl(organizer?.avatar_url);
                const backgroundImage = getPartnerBackground(event.partner);

                return (
                  <div 
                    key={participation.id} 
                    className="relative border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors"
                    style={{
                      background: backgroundImage
                        ? `linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0.9)), url(${backgroundImage})`
                        : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    <div className="relative p-4 z-10">
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Informações do evento */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-lg font-semibold text-white">{event.title}</h4>
                          <span className="text-xs text-white/50">
                            Participou em {formatDate(participation.created_at)}
                          </span>
                        </div>

                        <p className="text-white/70 mb-3 text-sm">{event.description}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-white/60">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(event.date)}</span>
                          </div>

                          <div className="flex items-center gap-2 text-white/60">
                            <MapPin className="w-4 h-4" />
                            <span>{event.location}</span>
                          </div>

                          {event.partner?.name && (
                            <>
                              <div className="flex items-center gap-2 text-white/60">
                                <Utensils className="w-4 h-4" />
                                <span>{event.partner.name}</span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Organizador */}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                          {organizerAvatarUrl ? (
                            <img
                              src={organizerAvatarUrl}
                              alt={organizer?.full_name || organizer?.username}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                              <User className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <span className="text-sm text-white/60">
                            Organizado por {organizer?.full_name || organizer?.username}
                          </span>
                        </div>
                      </div>

                      {/* Detalhes do restaurante (se houver) */}
                      {event.partner?.name && (
                        <div className="md:w-64 bg-white/5 rounded-lg p-3">
                          <h5 className="font-semibold text-white mb-2 flex items-center gap-2">
                            <Utensils className="w-4 h-4" />
                            Restaurante
                          </h5>
                          <div className="space-y-1 text-sm">
                            <p className="text-white">{event.partner.name}</p>
                            {event.partner.address && (
                              <p className="text-white/60">
                                {typeof event.partner.address === 'string' 
                                  ? event.partner.address 
                                  : `${event.partner.address?.street || ''} ${event.partner.address?.city || ''}`
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;