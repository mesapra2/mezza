import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, MapPin, Phone, ExternalLink, ChevronRight, Utensils, Calendar } from 'lucide-react';
import { Input } from '@/features/shared/components/ui/input';
import { Button } from '@/features/shared/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
<<<<<<< HEAD
import FavoriteButton from '@/features/shared/components/restaurants/FavoriteButton';
=======
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
import RestaurantStatsService from '@/services/RestaurantStatsService';

const RestaurantsPage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restaurantStats, setRestaurantStats] = useState({});

  useEffect(() => {
    loadRestaurants();
  }, []);

  useEffect(() => {
    filterRestaurants();
  }, [searchTerm, restaurants]);

  const loadRestaurants = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('partners')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      console.log('✅ Restaurantes carregados:', data?.length || 0);
      setRestaurants(data || []);

      // Carregar estatísticas de eventos para todos os restaurantes
      if (data && data.length > 0) {
        loadRestaurantStats(data);
      }
    } catch (err) {
      console.error('❌ Erro ao carregar restaurantes:', err);
      setError('Erro ao carregar restaurantes. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const loadRestaurantStats = async (restaurantList) => {
    try {
      const partnerIds = restaurantList.map(r => r.id);
      console.log('📊 Carregando estatísticas de eventos...');
      
      const stats = await RestaurantStatsService.getMultipleRestaurantStats(partnerIds);
      setRestaurantStats(stats);
      
      console.log('✅ Estatísticas carregadas para', Object.keys(stats).length, 'restaurantes');
    } catch (error) {
      console.error('❌ Erro ao carregar estatísticas:', error);
      // Não bloquear a interface se stats falharem
    }
  };

  const filterRestaurants = () => {
    if (!searchTerm) {
      setFilteredRestaurants(restaurants);
      return;
    }

    const filtered = restaurants.filter(restaurant =>
      restaurant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      restaurant.cuisine_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getAddress(restaurant).toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredRestaurants(filtered);
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
    
    // Se já for URL completa, retorna
    if (photo.startsWith('http')) return photo;

    // Busca do bucket 'photos'
    const { data } = supabase.storage
      .from('photos')
      .getPublicUrl(photo);
    
    return data.publicUrl;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-white/60 text-lg mb-4">{error}</p>
        <Button onClick={loadRestaurants} className="bg-purple-600 hover:bg-purple-700">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Restaurantes - Mesapra2</title>
        <meta name="description" content="Conheça os melhores restaurantes parceiros do Mesapra2" />
      </Helmet>

      <div className="space-y-8 py-6 px-4">
        <div>
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Restaurantes Parceiros
          </h1>
          <p className="text-white/60 text-lg">
            Descubra lugares incríveis para suas experiências gastronômicas
          </p>
          {restaurants.length > 0 && (
            <p className="text-white/40 text-sm mt-2">
              {restaurants.length} {restaurants.length === 1 ? 'restaurante parceiro' : 'restaurantes parceiros'}
            </p>
          )}
        </div>

        {/* Busca */}
        <div className="glass-effect rounded-2xl p-6 border border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              placeholder="Buscar por nome, tipo de culinária ou localização..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 glass-effect border-white/10"
            />
          </div>
        </div>

        {/* Grid de Restaurantes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRestaurants.map((restaurant, index) => {
            const photo = getRestaurantPhoto(restaurant);
            const stats = restaurantStats[restaurant.id] || { totalEvents: 0, recentEvents: 0 };
            
            return (
              <motion.div
                key={restaurant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/restaurant/${restaurant.id}`}>
                  <div className="glass-effect rounded-2xl border border-white/10 overflow-hidden hover:bg-white/5 transition-all cursor-pointer h-full group">
                    {/* Foto */}
                    <div className="relative h-48 overflow-hidden">
                      {photo ? (
                        <img
                          src={photo}
                          alt={restaurant.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(restaurant.name)}&size=400&background=8b5cf6&color=fff`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                          <Utensils className="w-16 h-16 text-white/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      
                      {/* Badge de tipo de culinária */}
                      {restaurant.cuisine_type && (
                        <div className="absolute top-3 right-3">
                          <span className="px-3 py-1 rounded-full bg-purple-500/30 backdrop-blur-sm text-purple-200 text-xs border border-purple-400/50 font-medium">
                            {restaurant.cuisine_type}
                          </span>
                        </div>
                      )}

                      {/* Badge Premium */}
                      {restaurant.type === 'premium' && (
                        <div className="absolute top-3 left-3">
                          <span className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold">
                            Premium
                          </span>
                        </div>
                      )}
<<<<<<< HEAD

                      {/* Botão de Favoritar */}
                      <div className="absolute bottom-3 right-3">
                        <FavoriteButton
                          restaurant={{
                            id: String(restaurant.id),
                            name: restaurant.name,
                            address: getAddress(restaurant),
                            photo_url: photo,
                            rating: restaurant.rating,
                            place_id: restaurant.google_place_id,
                          }}
                          size="default"
                          variant="solid"
                        />
                      </div>
=======
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
                    </div>

                    {/* Conteúdo */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-semibold text-white line-clamp-2 flex-1">
                          {restaurant.name}
                        </h3>
                        <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
                      </div>

                      {restaurant.description && (
                        <p className="text-white/60 text-sm line-clamp-2 mb-4">
                          {restaurant.description}
                        </p>
                      )}

                      <div className="space-y-2">
                        {restaurant.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                            <span className="text-white/60 text-sm line-clamp-1">
                              {getAddress(restaurant)}
                            </span>
                          </div>
                        )}

                        {restaurant.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <span className="text-white/60 text-sm">
                              {restaurant.phone}
                            </span>
                          </div>
                        )}

                        {restaurant.website && (
                          <div className="flex items-center gap-2">
                            <ExternalLink className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <span className="text-white/60 text-sm truncate">
                              Website disponível
                            </span>
                          </div>
                        )}

                        {/* Contador de eventos */}
                        {stats.totalEvents > 0 && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-green-400 flex-shrink-0" />
                            <span className="text-green-300 text-sm font-medium">
                              {stats.totalEvents} evento{stats.totalEvents !== 1 ? 's' : ''} realizados
                              {stats.recentEvents > 0 && (
                                <span className="text-green-400 ml-1">
                                  • {stats.recentEvents} recente{stats.recentEvents !== 1 ? 's' : ''}
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Mensagem quando não há resultados */}
        {filteredRestaurants.length === 0 && !loading && (
          <div className="glass-effect rounded-2xl p-12 border border-white/10 text-center">
            <Search className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60 text-lg mb-4">
              {restaurants.length === 0 
                ? 'Nenhum restaurante parceiro cadastrado ainda'
                : 'Nenhum restaurante encontrado com esses filtros'}
            </p>
            {searchTerm && (
              <Button 
                onClick={() => setSearchTerm('')}
                variant="outline"
              >
                Limpar busca
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default RestaurantsPage;

// ===== INSTRUÇÕES PARA ATUALIZAR RestaurantSelector.jsx =====
// 
// No arquivo RestaurantSelector.jsx, procure pela função getRestaurantPhoto
// e substitua 'partner-photos' por 'photos':
//
// const { data } = supabase.storage
//   .from('photos')  // <-- Era 'partner-photos', agora é 'photos'
//   .getPublicUrl(photo);
//
// ============================================================