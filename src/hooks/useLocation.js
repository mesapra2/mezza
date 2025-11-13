/**
 * ========================================
 * HOOK DE LOCALIZAÇÃO
 * ========================================
 * 
 * Hook personalizado para gerenciar localização do usuário
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/features/shared/components/ui/use-toast';
import LocationService from '@/services/LocationService';

export const useLocation = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [location, setLocation] = useState(null);
  const [permission, setPermission] = useState('unknown'); // 'granted', 'denied', 'prompt', 'unknown'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Ref para evitar múltiplas solicitações simultâneas
  const requestingLocation = useRef(false);

  /**
   * ✅ VERIFICAR PERMISSÕES DE LOCALIZAÇÃO
   */
  const checkPermission = useCallback(async () => {
    try {
      const permissionStatus = await LocationService.checkLocationPermission();
      
      if (permissionStatus.granted) {
        setPermission('granted');
      } else if (permissionStatus.denied) {
        setPermission('denied');
      } else {
        setPermission('prompt');
      }
      
      if (permissionStatus.error) {
        setError(permissionStatus.error);
      }
      
      return permissionStatus;
    } catch (err) {
      console.error('❌ Erro ao verificar permissões:', err);
      setError(err.message);
      setPermission('unknown');
      return { granted: false, denied: false, prompt: false, error: err.message };
    }
  }, []);

  /**
   * ✅ SOLICITAR LOCALIZAÇÃO ATUAL
   */
  const requestLocation = useCallback(async (showToast = true, highAccuracy = true) => {
    if (requestingLocation.current) {
      console.log('⏳ Solicitação de localização já em andamento...');
      return;
    }

    try {
      requestingLocation.current = true;
      setLoading(true);
      setError(null);

      if (showToast) {
        toast({
          title: "📍 Obtendo localização...",
          description: "Permitindo acesso à sua localização para melhor experiência",
        });
      }

      // Obter localização atual
      const currentLocation = await LocationService.getCurrentLocation(highAccuracy);
      
      // Tentar obter endereço (opcional)
      try {
        const addressInfo = await LocationService.getAddressFromCoordinates(
          currentLocation.latitude,
          currentLocation.longitude
        );
        
        currentLocation.address = addressInfo.address;
        currentLocation.city = addressInfo.city;
        currentLocation.country = addressInfo.country;
      } catch (addressError) {
        console.warn('⚠️ Não foi possível obter endereço:', addressError);
      }

      // Salvar no estado
      setLocation(currentLocation);
      setLastUpdate(currentLocation.timestamp);
      setPermission('granted');

      // Salvar no banco de dados se usuário estiver logado
      if (user?.id) {
        const saved = await LocationService.saveUserLocation(user.id, currentLocation);
        if (!saved && showToast) {
          toast({
            title: "⚠️ Aviso",
            description: "Localização obtida, mas não foi salva no perfil",
            variant: "destructive",
          });
        }
      }

      if (showToast) {
        toast({
          title: "✅ Localização obtida!",
          description: currentLocation.city ? 
            `Sua localização em ${currentLocation.city} foi salva` : 
            "Sua localização foi salva com sucesso",
        });
      }

      console.log('✅ Localização atualizada:', currentLocation);
      return currentLocation;

    } catch (err) {
      console.error('❌ Erro ao obter localização:', err);
      setError(err.message);
      
      if (err.message.includes('negada')) {
        setPermission('denied');
        if (showToast) {
          toast({
            title: "❌ Permissão negada",
            description: "Ative a localização nas configurações do navegador para ver eventos próximos",
            variant: "destructive",
          });
        }
      } else if (showToast) {
        toast({
          title: "❌ Erro na localização",
          description: err.message,
          variant: "destructive",
        });
      }
      
      return null;
    } finally {
      setLoading(false);
      requestingLocation.current = false;
    }
  }, [user?.id, toast]);

  /**
   * ✅ CARREGAR LOCALIZAÇÃO SALVA DO BANCO
   */
  const loadSavedLocation = useCallback(async () => {
    if (!user?.id) return;

    try {
      const savedLocation = await LocationService.getUserLocation(user.id);
      
      if (savedLocation) {
        setLocation(savedLocation);
        setLastUpdate(savedLocation.timestamp);
        setPermission('granted');
        
        console.log('✅ Localização carregada do banco:', savedLocation);
        
        // Verificar se precisa atualizar (mais de 1 hora)
        if (LocationService.shouldUpdateLocation(savedLocation.timestamp)) {
          console.log('⏰ Localização desatualizada, solicitando nova...');
          // Solicitar nova localização silenciosamente
          requestLocation(false, false);
        }
        
        return savedLocation;
      }
    } catch (err) {
      console.error('❌ Erro ao carregar localização salva:', err);
    }
    
    return null;
  }, [user?.id, requestLocation]);

  /**
   * ✅ FILTRAR EVENTOS POR DISTÂNCIA
   */
  const filterEventsByDistance = useCallback((events, maxDistance = 10) => {
    if (!location || !events) return events;

    return LocationService.filterEventsByDistance(
      events,
      location.latitude,
      location.longitude,
      maxDistance
    );
  }, [location]);

  /**
   * ✅ BUSCAR EVENTOS PRÓXIMOS
   */
  const findNearbyEvents = useCallback(async (maxDistance = 10, limit = 50) => {
    if (!location) return [];

    return LocationService.findNearbyEvents(
      location.latitude,
      location.longitude,
      maxDistance,
      limit
    );
  }, [location]);

  /**
   * ✅ CALCULAR DISTÂNCIA PARA UM PONTO
   */
  const getDistanceTo = useCallback((lat, lon) => {
    if (!location) return null;

    return LocationService.calculateDistance(
      location.latitude,
      location.longitude,
      lat,
      lon
    );
  }, [location]);

  /**
   * ✅ RESETAR DADOS DE LOCALIZAÇÃO
   */
  const clearLocation = useCallback(() => {
    setLocation(null);
    setPermission('unknown');
    setError(null);
    setLastUpdate(null);
  }, []);

  /**
   * ✅ INICIALIZAÇÃO - VERIFICAR PERMISSÕES E CARREGAR LOCALIZAÇÃO SALVA
   */
  useEffect(() => {
    const initializeLocation = async () => {
      // Verificar permissões
      await checkPermission();
      
      // Carregar localização salva se usuário estiver logado
      if (user?.id) {
        const saved = await loadSavedLocation();
        
        // Se não tem localização salva e tem permissão, solicitar
        if (!saved && permission === 'granted') {
          requestLocation(false, false);
        }
      }
    };

    initializeLocation();
  }, [user?.id, checkPermission, loadSavedLocation, permission, requestLocation]);

  /**
   * ✅ LISTENER PARA MUDANÇAS DE PERMISSÃO
   */
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        const handlePermissionChange = () => {
          checkPermission();
        };
        
        result.addEventListener('change', handlePermissionChange);
        
        return () => {
          result.removeEventListener('change', handlePermissionChange);
        };
      });
    }
  }, [checkPermission]);

  return {
    // Estado
    location,
    permission,
    loading,
    error,
    lastUpdate,
    
    // Informações derivadas
    hasLocation: !!location,
    isLocationStale: lastUpdate ? LocationService.shouldUpdateLocation(lastUpdate) : true,
    coordinates: location ? { lat: location.latitude, lng: location.longitude } : null,
    
    // Funções
    requestLocation,
    checkPermission,
    loadSavedLocation,
    clearLocation,
    
    // Utilitários
    filterEventsByDistance,
    findNearbyEvents,
    getDistanceTo,
  };
};

export default useLocation;