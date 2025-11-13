/**
 * ========================================
 * COMPONENTE DE INTEGRAÇÃO COM INSTAGRAM
 * ========================================
 * 
 * Permite conectar conta Instagram e importar fotos para o perfil
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Instagram, Download, X, Loader2, ExternalLink, Unlink } from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { useToast } from '@/features/shared/components/ui/use-toast';
import InstagramService from '@/services/InstagramService';

const InstagramIntegration = ({ 
  userId, 
  onPhotoImport, 
  availableSlots = 3,
  disabled = false 
}) => {
  const { toast } = useToast();
  
  const [isConnected, setIsConnected] = useState(false);
  const [instagramData, setInstagramData] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(null);
  const [showPhotos, setShowPhotos] = useState(false);

  /**
   * ✅ VERIFICAR CONEXÃO EXISTENTE AO CARREGAR
   */
  useEffect(() => {
    checkInstagramConnection();
  }, [userId]);

  /**
   * ✅ VERIFICAR SE USUÁRIO JÁ TEM INSTAGRAM CONECTADO
   */
  const checkInstagramConnection = async () => {
    if (!userId) return;

    try {
      const connection = await InstagramService.getInstagramConnection(userId);
      
      if (connection) {
        setIsConnected(true);
        setInstagramData(connection);
        console.log('✅ Instagram já conectado:', connection.username);
      } else {
        setIsConnected(false);
        setInstagramData(null);
      }
    } catch (error) {
      console.error('❌ Erro ao verificar conexão Instagram:', error);
    }
  };

  /**
   * ✅ CONECTAR COM INSTAGRAM
   */
  const handleConnectInstagram = async () => {
    try {
      setLoading(true);
      
      toast({
        title: "🔄 Conectando...",
        description: "Redirecionando para o Instagram...",
      });

      await InstagramService.connectInstagram();
    } catch (error) {
      console.error('❌ Erro ao conectar Instagram:', error);
      toast({
        title: "❌ Erro na conexão",
        description: error.message || "Não foi possível conectar com Instagram",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * ✅ CARREGAR FOTOS DO INSTAGRAM
   */
  const loadInstagramPhotos = async () => {
    if (!instagramData?.token) return;

    try {
      setLoading(true);
      const instagramPhotos = await InstagramService.fetchInstagramPhotos(instagramData.token);
      setPhotos(instagramPhotos);
      setShowPhotos(true);
      
      toast({
        title: "✅ Fotos carregadas!",
        description: `${instagramPhotos.length} fotos encontradas do Instagram`,
      });
    } catch (error) {
      console.error('❌ Erro ao carregar fotos:', error);
      
      if (error.message.includes('expirada')) {
        // Token expirado, desconectar
        await handleDisconnectInstagram();
        toast({
          title: "⚠️ Sessão expirada",
          description: "Conecte novamente ao Instagram para importar fotos",
          variant: "destructive",
        });
      } else {
        toast({
          title: "❌ Erro ao carregar fotos",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * ✅ IMPORTAR FOTO ESPECÍFICA DO INSTAGRAM
   */
  const handleImportPhoto = async (photo) => {
    if (availableSlots <= 0) {
      toast({
        title: "❌ Limite atingido",
        description: "Você já tem o máximo de fotos no perfil",
        variant: "destructive",
      });
      return;
    }

    try {
      setImporting(photo.id);
      
      const photoPath = await InstagramService.importInstagramPhoto(photo.url, userId);
      
      if (onPhotoImport) {
        onPhotoImport(photoPath);
      }

      toast({
        title: "✅ Foto importada!",
        description: "Foto do Instagram adicionada ao seu perfil",
      });
    } catch (error) {
      console.error('❌ Erro ao importar foto:', error);
      toast({
        title: "❌ Erro ao importar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(null);
    }
  };

  /**
   * ✅ DESCONECTAR INSTAGRAM
   */
  const handleDisconnectInstagram = async () => {
    try {
      await InstagramService.disconnectInstagram(userId);
      setIsConnected(false);
      setInstagramData(null);
      setPhotos([]);
      setShowPhotos(false);
      
      toast({
        title: "✅ Instagram desconectado",
        description: "Conta Instagram removida do seu perfil",
      });
    } catch (error) {
      console.error('❌ Erro ao desconectar Instagram:', error);
      toast({
        title: "❌ Erro ao desconectar",
        description: "Não foi possível desconectar do Instagram",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Status da Conexão Instagram */}
      <div className="bg-gradient-to-r from-pink-900/30 to-purple-900/30 border border-pink-500/20 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-pink-500/20 rounded-lg">
              <Instagram className="w-5 h-5 text-pink-300" />
            </div>
            <div>
              <h4 className="text-white/90 font-medium text-sm">
                {isConnected ? 'Instagram Conectado' : 'Conectar Instagram'}
              </h4>
              <p className="text-white/60 text-xs">
                {isConnected 
                  ? `@${instagramData?.username} • Conectado em ${new Date(instagramData?.connectedAt).toLocaleDateString()}`
                  : 'Importe fotos diretamente do seu Instagram'
                }
              </p>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadInstagramPhotos}
                  disabled={loading || disabled}
                  className="text-pink-400 hover:text-pink-300 hover:bg-pink-500/20"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnectInstagram}
                  disabled={loading}
                  className="text-white/40 hover:text-red-400 hover:bg-red-500/20"
                >
                  <Unlink className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleConnectInstagram}
                disabled={loading || disabled}
                className="text-pink-400 hover:text-pink-300 hover:bg-pink-500/20"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Fotos do Instagram */}
      <AnimatePresence>
        {showPhotos && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-black/40 rounded-xl border border-white/10 p-4 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h5 className="text-white font-medium text-sm">
                Suas Fotos do Instagram ({photos.length})
              </h5>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPhotos(false)}
                className="text-white/40 hover:text-white/80"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Grid de Fotos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-80 overflow-y-auto">
              {photos.map((photo) => (
                <motion.div
                  key={photo.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative group aspect-square rounded-lg overflow-hidden"
                >
                  <img
                    src={photo.thumbnail}
                    alt={photo.caption}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay com botão de importar */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <Button
                      size="sm"
                      onClick={() => handleImportPhoto(photo)}
                      disabled={importing === photo.id || availableSlots <= 0}
                      className="bg-pink-500 hover:bg-pink-600 text-white"
                    >
                      {importing === photo.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {/* Badge se não há slots disponíveis */}
                  {availableSlots <= 0 && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                      Limite
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {photos.length === 0 && (
              <div className="text-center py-8 text-white/40">
                <Instagram className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Nenhuma foto encontrada no Instagram</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InstagramIntegration;