// src/features/shared/components/events/SmartMenuSuggestions.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChefHat, Sparkles, Clock, Users, Star, MapPin, Phone } from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { useToast } from '@/features/shared/components/ui/use-toast';
import SmartMenuService from '@/services/SmartMenuService';

/**
 * Componente para Cardápio Inteligente - Feature Premium
 * Exibe sugestões de cardápio baseadas nas hashtags selecionadas
 */
const SmartMenuSuggestions = ({ 
  selectedHashtags = [], 
  onMenuSelected,
  onRestaurantSelected,
  userLocation,
  showRestaurants = true 
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState(null);
  const [showServiceOptions, setShowServiceOptions] = useState(false);
  const [eventProfile, setEventProfile] = useState(null);
  const { toast } = useToast();

  // Carrega sugestões quando hashtags mudam
  useEffect(() => {
    if (selectedHashtags && selectedHashtags.length >= 3) {
      loadSmartSuggestions();
    } else {
      setSuggestions([]);
      setEventProfile(null);
    }
  }, [selectedHashtags]);

  const loadSmartSuggestions = async () => {
    setLoading(true);
    try {
      // Detectar perfil do evento
      const profile = SmartMenuService.detectEventProfile(selectedHashtags);
      setEventProfile(profile);

      // Buscar sugestões de cardápio
      const menuSuggestions = await SmartMenuService.getSuggestionsByHashtags(selectedHashtags);
      setSuggestions(menuSuggestions);

      // Buscar restaurantes compatíveis se solicitado
      if (showRestaurants) {
        const compatibleRestaurants = await SmartMenuService.findCompatibleRestaurants(
          selectedHashtags, 
          userLocation
        );
        setRestaurants(compatibleRestaurants);
      }

    } catch (error) {
      console.error('Erro ao carregar sugestões:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as sugestões de cardápio."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMenuSelection = (menu) => {
    setSelectedMenu(menu);
    setShowServiceOptions(true);
    onMenuSelected?.(menu);
  };

  const handleServiceChoice = (serviceType) => {
    if (serviceType === 'restaurant' && restaurants.length > 0) {
      // Mostrar seção de restaurantes
      document.getElementById('restaurants-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (serviceType === 'home') {
      // Implementar visualização de receitas (futuro)
      toast({
        title: "Em breve",
        description: "Receitas para cozinhar em casa estarão disponíveis em breve!"
      });
    }
  };

  const handleRestaurantSelection = (restaurant) => {
    onRestaurantSelected?.(restaurant);
    toast({
      title: "Restaurante selecionado",
      description: `${restaurant.name} foi adicionado ao seu evento.`
    });
  };

  if (!selectedHashtags || selectedHashtags.length < 3) {
    return (
      <div className="text-center py-8">
        <ChefHat className="h-12 w-12 text-white/40 mx-auto mb-4" />
        <p className="text-white/60">
          Selecione 3 hashtags para ativar o Cardápio Inteligente
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header do Cardápio Inteligente */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Sparkles className="h-6 w-6 text-purple-400" />
          <h3 className="text-xl font-bold text-white">Cardápio Inteligente</h3>
          <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-2 py-1 rounded-full">
            Premium
          </span>
        </div>
        
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {selectedHashtags.map((hashtag, index) => (
            <span 
              key={index}
              className="bg-white/10 text-white px-3 py-1 rounded-full text-sm"
            >
              #{hashtag}
            </span>
          ))}
        </div>

        {eventProfile && (
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h4 className="text-white font-semibold">{eventProfile.name}</h4>
            <p className="text-white/60 text-sm">{eventProfile.description}</p>
            <p className="text-purple-300 text-sm mt-2">
              💡 {eventProfile.suggestedStyle}
            </p>
          </div>
        )}
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <span className="ml-3 text-white/60">Analisando suas preferências...</span>
        </div>
      ) : (
        <>
          {/* Sugestões de Cardápio */}
          {suggestions.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white">
                Sugestões de Cardápio ({suggestions.length})
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggestions.map((suggestion, index) => (
                  <motion.div
                    key={suggestion.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-white/5 rounded-lg border border-white/10 p-4 hover:bg-white/10 transition-all cursor-pointer ${
                      selectedMenu?.id === suggestion.id ? 'ring-2 ring-purple-500' : ''
                    }`}
                    onClick={() => handleMenuSelection(suggestion)}
                  >
                    {/* Header do Card */}
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-white">{suggestion.name}</h5>
                      <div className="flex items-center space-x-1">
                        <span className={`w-2 h-2 rounded-full ${
                          suggestion.difficulty === 'facil' ? 'bg-green-500' :
                          suggestion.difficulty === 'medio' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></span>
                        <span className="text-xs text-white/60 capitalize">{suggestion.difficulty}</span>
                      </div>
                    </div>

                    {/* Descrição */}
                    <p className="text-white/60 text-sm mb-3">{suggestion.description}</p>

                    {/* Pratos */}
                    <div className="space-y-2 mb-3">
                      <div className="text-xs">
                        <span className="text-purple-300">Entrada:</span>
                        <span className="text-white/80 ml-1">{suggestion.appetizer}</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-purple-300">Principal:</span>
                        <span className="text-white/80 ml-1">{suggestion.main_course}</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-purple-300">Sobremesa:</span>
                        <span className="text-white/80 ml-1">{suggestion.dessert}</span>
                      </div>
                    </div>

                    {/* Compatibilidade */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {suggestion.matching_hashtags?.slice(0, 3).map((hashtag, i) => (
                          <span key={i} className="bg-purple-500/20 text-purple-300 text-xs px-2 py-1 rounded">
                            #{hashtag}
                          </span>
                        ))}
                      </div>
                      <span className="text-green-400 text-sm font-semibold">
                        {suggestion.compatibility_score}% match
                      </span>
                    </div>

                    <Button 
                      size="sm" 
                      className="w-full mt-3 bg-purple-600 hover:bg-purple-700"
                    >
                      Escolher este cardápio
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Opções de Serviço */}
          {showServiceOptions && selectedMenu && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 rounded-lg border border-white/10 p-6"
            >
              <h4 className="text-lg font-semibold text-white mb-4">
                Como prefere servir este cardápio?
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleServiceChoice('home')}
                  className="p-4 rounded-lg border border-white/10 hover:bg-white/5 transition-all text-left"
                >
                  <ChefHat className="h-6 w-6 text-purple-400 mb-2" />
                  <h5 className="font-semibold text-white">Cozinhar em casa</h5>
                  <p className="text-white/60 text-sm">Receba receitas detalhadas para preparar</p>
                </button>

                <button
                  onClick={() => handleServiceChoice('restaurant')}
                  className="p-4 rounded-lg border border-white/10 hover:bg-white/5 transition-all text-left"
                >
                  <MapPin className="h-6 w-6 text-green-400 mb-2" />
                  <h5 className="font-semibold text-white">Encomendar restaurante</h5>
                  <p className="text-white/60 text-sm">Solicite orçamento de restaurantes parceiros</p>
                </button>
              </div>
            </motion.div>
          )}

          {/* Restaurantes Compatíveis */}
          {showRestaurants && restaurants.length > 0 && selectedMenu && (
            <motion.div
              id="restaurants-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h4 className="text-lg font-semibold text-white">
                Restaurantes com hashtags similares ({restaurants.length})
              </h4>

              <div className="space-y-4">
                {restaurants.map((restaurant, index) => (
                  <motion.div
                    key={restaurant.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/5 rounded-lg border border-white/10 p-4 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h5 className="font-semibold text-white">{restaurant.name}</h5>
                        <div className="flex items-center space-x-4 text-sm text-white/60 mt-1">
                          <span className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-400 mr-1" />
                            {restaurant.rating || '4.5'}
                          </span>
                          <span>{restaurant.cuisine_type}</span>
                          <span>{restaurant.price_range}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {restaurant.matching_hashtags?.map((hashtag, i) => (
                            <span key={i} className="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded">
                              #{hashtag}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-green-400 font-semibold text-sm mb-2">
                          {restaurant.compatibility_score}% match
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleRestaurantSelection(restaurant)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Solicitar Orçamento
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {suggestions.length === 0 && !loading && (
            <div className="text-center py-8">
              <ChefHat className="h-12 w-12 text-white/40 mx-auto mb-4" />
              <p className="text-white/60">
                Nenhuma sugestão encontrada para essas hashtags.
              </p>
              <p className="text-white/40 text-sm">
                Tente combinações diferentes de hashtags.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SmartMenuSuggestions;