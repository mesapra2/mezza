/**
 * ========================================
 * PÁGINA DE FAVORITOS
 * ========================================
 * 
 * Página dedicada para exibir todos os restaurantes favoritos do usuário
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Heart, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/features/shared/components/ui/button';
import FavoriteRestaurantsList from '@/features/shared/components/restaurants/FavoriteRestaurantsList';
import { useFavoriteRestaurants } from '@/hooks/useFavoriteRestaurants';

const FavoritesPage = () => {
  const { favoritesCount, hasFavorites } = useFavoriteRestaurants();

  return (
    <>
      <Helmet>
        <title>Meus Favoritos - Mesapra2</title>
        <meta name="description" content="Seus restaurantes favoritos salvos no Mesapra2" />
      </Helmet>

      <div className="space-y-8 py-6 px-4 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Botão Voltar */}
          <Link to="/dashboard">
            <Button
              variant="ghost"
              className="text-white/60 hover:text-white -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </Link>

          {/* Título */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30">
                <Heart className="w-8 h-8 text-red-500 fill-red-500" />
              </div>
            </div>
            
            <h1 className="text-4xl font-bold gradient-text mb-2">
              Meus Favoritos
            </h1>
            
            <p className="text-white/60 text-lg">
              {hasFavorites 
                ? `Você tem ${favoritesCount} restaurante${favoritesCount !== 1 ? 's' : ''} favorito${favoritesCount !== 1 ? 's' : ''}`
                : 'Seus restaurantes favoritos aparecerão aqui'
              }
            </p>
          </div>
        </motion.div>

        {/* Conteúdo Principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-effect rounded-2xl border border-white/10 p-6"
        >
          <FavoriteRestaurantsList 
            showTitle={false}
            className=""
            onRestaurantClick={(restaurant) => {
              // Navegar para página do restaurante quando disponível
              console.log('Clique no restaurante:', restaurant);
            }}
          />
        </motion.div>

        {/* Call to Action quando não há favoritos */}
        {!hasFavorites && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center py-8"
          >
            <div className="glass-effect rounded-2xl border border-white/10 p-8">
              <div className="max-w-md mx-auto space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Heart className="w-10 h-10 text-purple-400" />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Comece a favoritar restaurantes
                  </h3>
                  <p className="text-white/60 mb-6">
                    Descubra lugares incríveis e adicione aos seus favoritos para acesso rápido
                  </p>
                </div>

                <Link to="/restaurants">
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    Explorar Restaurantes
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Estatísticas dos favoritos */}
        {hasFavorites && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="glass-effect rounded-xl border border-white/10 p-6 text-center">
              <div className="text-2xl font-bold text-white mb-2">
                {favoritesCount}
              </div>
              <div className="text-white/60 text-sm">
                Restaurante{favoritesCount !== 1 ? 's' : ''} Favorito{favoritesCount !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="glass-effect rounded-xl border border-white/10 p-6 text-center">
              <div className="text-2xl font-bold text-purple-400 mb-2">
                💾
              </div>
              <div className="text-white/60 text-sm">
                Acesso Rápido
              </div>
            </div>
          </motion.div>
        )}

        {/* Link para explorar mais restaurantes */}
        {hasFavorites && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <Link to="/restaurants">
              <Button 
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Descobrir Mais Restaurantes
              </Button>
            </Link>
          </motion.div>
        )}
      </div>
    </>
  );
};

export default FavoritesPage;