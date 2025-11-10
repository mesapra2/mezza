// src/features/shared/pages/RestaurantDetailsPage.jsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { MapPin, Phone, ExternalLink, Calendar, Users, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const RestaurantDetailsPage = () => {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    loadRestaurantData();
  }, [id]);

  const loadRestaurantData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Buscar dados do restaurante
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('partners')
        .select('*')
        .eq('id', id)
        .single();

      if (restaurantError) throw restaurantError;
      setRestaurant(restaurantData);

      // 2. Buscar fotos dos eventos deste restaurante (últimas 50)
      const { data: photosData, error: photosError } = await supabase
        .from('event_photos')
        .select(`
          *,
          event:events!event_photos_event_id_fkey(
            id,
            title,
            partner_id
          ),
          user:users!event_photos_user_id_fkey(
            id,
            username,
            full_name
          )
        `)
        .eq('status', 'aprovado')
        .order('created_at', { ascending: false })
        .limit(50);

      if (photosError) throw photosError;

      // Filtrar fotos apenas deste restaurante
      const restaurantPhotos = (photosData || []).filter(
        photo => photo.event?.partner_id === parseInt(id)
      );

      console.log('✅ Fotos do restaurante:', restaurantPhotos.length);
      setPhotos(restaurantPhotos);

      // 3. Buscar eventos futuros deste restaurante
      const now = new Date().toISOString();
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('partner_id', id)
        .gte('start_time', now)
        .in('status', ['Aberto', 'Confirmado'])
        .order('start_time', { ascending: true })
        .limit(6);

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

    } catch (err) {
      console.error('❌ Erro ao carregar dados do restaurante:', err);
      setError('Erro ao carregar informações do restaurante.');
    } finally {
      setLoading(false);
    }
  };

  const getAddress = (restaurant) => {
    if (!restaurant?.address) return 'Endereço não informado';
    
    if (typeof restaurant.address === 'string') {
      return restaurant.address;
    }
    
    if (typeof restaurant.address === 'object') {
      const parts = [
        restaurant.address.street || restaurant.address.rua,
        restaurant.address.city || restaurant.address.cidade,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : 'Endereço não informado';
    }
    
    return 'Endereço não informado';
  };

  const getRestaurantPhoto = (restaurant) => {
    if (!restaurant?.photos || !Array.isArray(restaurant.photos)) return null;
    if (restaurant.photos.length === 0) return null;
    
    const photo = restaurant.photos[0];
    if (photo.startsWith('http')) return photo;

    const { data } = supabase.storage
      .from('photos')
      .getPublicUrl(photo);
    
    return data.publicUrl;
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-white/60 text-lg mb-4">{error || 'Restaurante não encontrado'}</p>
        <Link to="/restaurants">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Restaurantes
          </Button>
        </Link>
      </div>
    );
  }

  const mainPhoto = getRestaurantPhoto(restaurant);

  return (
    <>
      <Helmet>
        <title>{restaurant.name} - Mesapra2</title>
        <meta name="description" content={restaurant.description || `Conheça ${restaurant.name}`} />
      </Helmet>

      <div className="space-y-8 py-6 px-4">
        {/* Botão Voltar */}
        <Link to="/restaurants">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>

        {/* Header com foto principal */}
        <div className="glass-effect rounded-2xl overflow-hidden border border-white/10">
          <div className="relative h-64 md:h-96 overflow-hidden">
            {mainPhoto ? (
              <img
                src={mainPhoto}
                alt={restaurant.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(restaurant.name)}&size=800&background=8b5cf6&color=fff`;
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <MapPin className="w-24 h-24 text-white/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Badge Premium */}
            {restaurant.type === 'premium' && (
              <div className="absolute top-4 left-4">
                <span className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold">
                  Premium
                </span>
              </div>
            )}

            {/* Nome e tipo de culinária */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h1 className="text-4xl font-bold text-white mb-2">
                {restaurant.name}
              </h1>
              {restaurant.cuisine_type && (
                <span className="px-3 py-1 rounded-full bg-purple-500/30 backdrop-blur-sm text-purple-200 text-sm border border-purple-400/50 font-medium">
                  {restaurant.cuisine_type}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Informações */}
        <div className="glass-effect rounded-2xl p-6 border border-white/10">
          <h2 className="text-2xl font-semibold text-white mb-4">Informações</h2>
          
          {restaurant.description && (
            <p className="text-white/70 mb-6">
              {restaurant.description}
            </p>
          )}

          <div className="space-y-3">
            {restaurant.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                <span className="text-white/80">
                  {getAddress(restaurant)}
                </span>
              </div>
            )}

            {restaurant.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-purple-400 flex-shrink-0" />
                <a href={`tel:${restaurant.phone}`} className="text-white/80 hover:text-purple-400 transition-colors">
                  {restaurant.phone}
                </a>
              </div>
            )}

            {restaurant.website && (
              <div className="flex items-center gap-3">
                <ExternalLink className="w-5 h-5 text-purple-400 flex-shrink-0" />
                <a 
                  href={restaurant.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-purple-400 transition-colors"
                >
                  Visitar website
                </a>
              </div>
            )}

            {restaurant.google_profile_url && (
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <a 
                  href={restaurant.google_profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/80 hover:text-purple-400 transition-colors"
                >
                  Ver no Google Business
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ============================================ */}
        {/* ✅ CAROUSEL DE FOTOS DOS EVENTOS */}
        {/* ============================================ */}
        {photos.length > 0 && (
          <div className="glass-effect rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">
                Fotos dos Eventos
              </h2>
              <span className="text-white/60 text-sm">
                {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
              </span>
            </div>

            {/* Carousel principal */}
            <div className="relative">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-white/5">
                <img
                  src={photos[currentPhotoIndex].photo_url}
                  alt={`Foto do evento ${photos[currentPhotoIndex].event?.title || ''}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'https://ui-avatars.com/api/?name=Evento&size=800&background=8b5cf6&color=fff';
                  }}
                />

                {/* Overlay com info */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <p className="text-white font-semibold">
                    {photos[currentPhotoIndex].event?.title || 'Evento'}
                  </p>
                  <p className="text-white/70 text-sm">
                    Por {photos[currentPhotoIndex].user?.username || photos[currentPhotoIndex].user?.full_name || 'Participante'}
                  </p>
                  <p className="text-white/50 text-xs mt-1">
                    {format(new Date(photos[currentPhotoIndex].created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>

                {/* Botões de navegação */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
                      aria-label="Foto anterior"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
                      aria-label="Próxima foto"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}

                {/* Indicador de posição */}
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-sm">
                  {currentPhotoIndex + 1} / {photos.length}
                </div>
              </div>

              {/* Thumbnails */}
              {photos.length > 1 && (
                <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all ${
                        index === currentPhotoIndex
                          ? 'ring-2 ring-purple-500 opacity-100'
                          : 'opacity-50 hover:opacity-75'
                      }`}
                    >
                      <img
                        src={photo.photo_url}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://ui-avatars.com/api/?name=Foto&size=80&background=8b5cf6&color=fff';
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Eventos futuros */}
        {events.length > 0 && (
          <div className="glass-effect rounded-2xl p-6 border border-white/10">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Próximos Eventos
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => (
                <Link key={event.id} to={`/event/${event.id}`}>
                  <div className="glass-effect rounded-xl p-4 border border-white/10 hover:bg-white/5 transition-colors cursor-pointer">
                    <h3 className="text-white font-semibold mb-2 line-clamp-2">
                      {event.title}
                    </h3>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-white/60">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>
                          {format(new Date(event.start_time), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-white/60">
                        <Users className="w-4 h-4 mr-2" />
                        <span>
                          {event.vagas} {event.vagas === 1 ? 'vaga' : 'vagas'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-medium">
                        {event.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RestaurantDetailsPage;