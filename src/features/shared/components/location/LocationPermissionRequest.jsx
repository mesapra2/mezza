/**
 * ========================================
 * COMPONENTE DE SOLICITAÇÃO DE LOCALIZAÇÃO
 * ========================================
 * 
 * Interface para solicitar permissão de localização do usuário
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, X, AlertCircle, Settings, Loader2 } from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { useLocation } from '@/hooks/useLocation';

const LocationPermissionRequest = ({ 
  onPermissionGranted, 
  onPermissionDenied,
  onClose,
  autoShow = true,
  showAsModal = true 
}) => {
  const {
    permission,
    location,
    loading,
    error,
    requestLocation,
    checkPermission
  } = useLocation();

  const [dismissed, setDismissed] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Verificar se deve mostrar a solicitação
  const shouldShow = autoShow && 
    !dismissed && 
    permission !== 'granted' && 
    permission !== 'unknown' && 
    !location;

  /**
   * ✅ HANDLE SOLICITAR LOCALIZAÇÃO
   */
  const handleRequestLocation = async () => {
    try {
      const result = await requestLocation();
      
      if (result && onPermissionGranted) {
        onPermissionGranted(result);
      }
    } catch (err) {
      console.error('❌ Erro ao solicitar localização:', err);
      if (onPermissionDenied) {
        onPermissionDenied(err);
      }
    }
  };

  /**
   * ✅ HANDLE FECHAR/DISPENSAR
   */
  const handleDismiss = () => {
    setDismissed(true);
    if (onClose) {
      onClose();
    }
  };

  /**
   * ✅ HANDLE MOSTRAR INSTRUÇÕES
   */
  const handleShowInstructions = () => {
    setShowInstructions(true);
  };

  /**
   * ✅ VERIFICAR PERMISSÕES PERIODICAMENTE
   */
  useEffect(() => {
    const interval = setInterval(() => {
      if (permission === 'prompt' || permission === 'unknown') {
        checkPermission();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [permission, checkPermission]);

  /**
   * ✅ RENDERIZAR CONTEÚDO BASEADO NO STATUS
   */
  const renderContent = () => {
    if (permission === 'granted' && location) {
      return (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
            <Navigation className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              ✅ Localização Ativada
            </h3>
            <p className="text-white/60 text-sm">
              Você verá eventos próximos a {location.city || 'sua região'}
            </p>
            {location.accuracy && (
              <p className="text-white/40 text-xs mt-1">
                Precisão: {Math.round(location.accuracy)}m
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-white/60 hover:text-white"
          >
            Fechar
          </Button>
        </div>
      );
    }

    if (permission === 'denied') {
      return (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Localização Bloqueada
            </h3>
            <p className="text-white/60 text-sm mb-3">
              Para ver eventos próximos, ative a localização nas configurações do navegador
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleShowInstructions}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Settings className="w-4 h-4 mr-2" />
              Como ativar?
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-white/60 hover:text-white"
            >
              Continuar sem localização
            </Button>
          </div>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Obtendo Localização...
            </h3>
            <p className="text-white/60 text-sm">
              Aguarde enquanto obtemos sua localização
            </p>
          </div>
        </div>
      );
    }

    // Estado padrão: solicitar permissão
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center">
          <MapPin className="w-8 h-8 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Encontrar Eventos Próximos
          </h3>
          <p className="text-white/60 text-sm mb-3">
            Permita acesso à sua localização para ver eventos no raio de 10km
          </p>
          <div className="flex items-center gap-2 text-white/40 text-xs">
            <MapPin className="w-3 h-3" />
            <span>Sua localização não será compartilhada publicamente</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleRequestLocation}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Navigation className="w-4 h-4 mr-2" />
            {loading ? 'Obtendo...' : 'Ativar Localização'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-white/60 hover:text-white"
          >
            Talvez mais tarde
          </Button>
        </div>
      </div>
    );
  };

  /**
   * ✅ RENDERIZAR INSTRUÇÕES PARA ATIVAR LOCALIZAÇÃO
   */
  const renderInstructions = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-white font-semibold">Como ativar a localização?</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowInstructions(false)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="text-white/60 text-sm space-y-3">
        <div className="bg-white/5 rounded-lg p-3">
          <p className="font-medium text-white/80 mb-2">🔧 Chrome/Edge:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Clique no ícone de cadeado na barra de endereços</li>
            <li>Selecione "Localização" → "Permitir"</li>
            <li>Recarregue a página</li>
          </ol>
        </div>
        
        <div className="bg-white/5 rounded-lg p-3">
          <p className="font-medium text-white/80 mb-2">🦊 Firefox:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Clique no ícone de escudo na barra de endereços</li>
            <li>Clique em "Permitir" para localização</li>
            <li>Recarregue a página</li>
          </ol>
        </div>

        <div className="bg-white/5 rounded-lg p-3">
          <p className="font-medium text-white/80 mb-2">📱 Mobile:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Ative a localização nas configurações do dispositivo</li>
            <li>Permita localização para o navegador</li>
            <li>Recarregue a página</li>
          </ol>
        </div>
      </div>

      <Button
        onClick={() => setShowInstructions(false)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        Entendi
      </Button>
    </div>
  );

  if (!shouldShow && !showAsModal) return null;

  const content = showInstructions ? renderInstructions() : renderContent();

  if (showAsModal) {
    return (
      <AnimatePresence>
        {shouldShow && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && handleDismiss()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-white/10 shadow-2xl"
            >
              {!showInstructions && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="absolute top-4 right-4 text-white/40 hover:text-white/80"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              {content}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 border border-white/10 shadow-lg"
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LocationPermissionRequest;