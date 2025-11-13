/**
 * ========================================
 * WIDGET DE STATUS DE LOCALIZAÇÃO
 * ========================================
 * 
 * Mostra status da localização e permite configurar filtros de distância
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Navigation, 
  Settings, 
  RefreshCw, 
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { useLocation } from '@/hooks/useLocation';

const LocationStatusWidget = ({ 
  onDistanceFilterChange,
  defaultDistance = 10,
  showDistanceFilter = true,
  compact = false
}) => {
  const {
    location,
    permission,
    loading,
    error,
    lastUpdate,
    isLocationStale,
    requestLocation
  } = useLocation();

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDistance, setSelectedDistance] = useState(defaultDistance);

  const distanceOptions = [
    { value: 5, label: '5km', emoji: '🏃‍♂️' },
    { value: 10, label: '10km', emoji: '🚗' },
    { value: 20, label: '20km', emoji: '🚙' },
    { value: 50, label: '50km', emoji: '🛣️' },
    { value: 100, label: '100km', emoji: '✈️' }
  ];

  /**
   * ✅ HANDLE MUDANÇA DE DISTÂNCIA
   */
  const handleDistanceChange = (distance) => {
    setSelectedDistance(distance);
    if (onDistanceFilterChange) {
      onDistanceFilterChange(distance);
    }
  };

  /**
   * ✅ HANDLE REFRESH LOCALIZAÇÃO
   */
  const handleRefreshLocation = async () => {
    await requestLocation(true, true);
  };

  /**
   * ✅ FORMATAR ÚLTIMA ATUALIZAÇÃO
   */
  const formatLastUpdate = () => {
    if (!lastUpdate) return 'Nunca';
    
    const now = Date.now();
    const diff = now - lastUpdate;
    
    if (diff < 60000) return 'Agora há pouco';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min atrás`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
    return `${Math.floor(diff / 86400000)} dias atrás`;
  };

  /**
   * ✅ RENDERIZAR STATUS DA LOCALIZAÇÃO
   */
  const renderLocationStatus = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
          <span className="text-purple-400 text-sm">Obtendo localização...</span>
        </div>
      );
    }

    if (permission === 'denied') {
      return (
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-sm">Localização bloqueada</span>
        </div>
      );
    }

    if (!location) {
      return (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-white/40" />
          <span className="text-white/60 text-sm">Localização não disponível</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Navigation className={`w-4 h-4 ${isLocationStale ? 'text-yellow-400' : 'text-green-400'}`} />
        <div className="flex flex-col">
          <span className={`text-sm ${isLocationStale ? 'text-yellow-400' : 'text-green-400'}`}>
            {location.city || 'Localização ativa'}
          </span>
          {!compact && (
            <span className="text-white/40 text-xs">
              Atualizada {formatLastUpdate()}
            </span>
          )}
        </div>
      </div>
    );
  };

  /**
   * ✅ RENDERIZAR FILTRO DE DISTÂNCIA
   */
  const renderDistanceFilter = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-white/80 text-sm font-medium">Raio de busca:</span>
        <span className="text-purple-400 text-sm font-semibold">
          {selectedDistance}km
        </span>
      </div>
      
      <div className="grid grid-cols-5 gap-2">
        {distanceOptions.map((option) => (
          <Button
            key={option.value}
            variant={selectedDistance === option.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleDistanceChange(option.value)}
            className={`
              flex flex-col items-center p-2 h-auto text-xs
              ${selectedDistance === option.value 
                ? 'bg-purple-600 text-white' 
                : 'text-white/60 hover:text-white hover:bg-white/10'
              }
            `}
          >
            <span className="text-lg mb-1">{option.emoji}</span>
            <span>{option.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
        {renderLocationStatus()}
        
        <div className="flex items-center gap-2">
          {showDistanceFilter && location && (
            <select
              value={selectedDistance}
              onChange={(e) => handleDistanceChange(Number(e.target.value))}
              className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-xs"
            >
              {distanceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          
          {(location && (isLocationStale || error)) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefreshLocation}
              disabled={loading}
              className="w-8 h-8 p-0 text-white/40 hover:text-white/80"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-gray-900/50 to-gray-800/50 rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-medium text-white">Localização</h3>
              {renderLocationStatus()}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {(location && (isLocationStale || error)) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefreshLocation();
                }}
                disabled={loading}
                className="w-8 h-8 p-0 text-white/40 hover:text-white/80"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
            
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-white/40" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white/40" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            <div className="p-4 space-y-4">
              {/* Location Details */}
              {location && (
                <div className="space-y-2">
                  <h4 className="text-white/80 text-sm font-medium">Detalhes da localização:</h4>
                  <div className="bg-white/5 rounded-lg p-3 space-y-1">
                    {location.address && (
                      <p className="text-white/60 text-xs">{location.address}</p>
                    )}
                    <div className="flex justify-between text-white/40 text-xs">
                      <span>Coordenadas:</span>
                      <span>{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
                    </div>
                    {location.accuracy && (
                      <div className="flex justify-between text-white/40 text-xs">
                        <span>Precisão:</span>
                        <span>{Math.round(location.accuracy)}m</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Distance Filter */}
              {showDistanceFilter && location && renderDistanceFilter()}

              {/* Actions */}
              <div className="flex gap-2">
                {!location && permission !== 'denied' && (
                  <Button
                    onClick={handleRefreshLocation}
                    disabled={loading}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    {loading ? 'Obtendo...' : 'Obter Localização'}
                  </Button>
                )}
                
                {location && (
                  <Button
                    onClick={handleRefreshLocation}
                    disabled={loading}
                    variant="outline"
                    className="flex-1 border-white/20 text-white/80 hover:bg-white/10"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Atualizando...' : 'Atualizar'}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LocationStatusWidget;