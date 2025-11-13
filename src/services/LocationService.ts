/**
 * ========================================
 * SERVIÇO DE LOCALIZAÇÃO
 * ========================================
 * 
 * Gerencia geolocalização do usuário e cálculos de distância
 */

import { supabase } from '@/lib/supabaseClient';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
  address?: string;
  city?: string;
  country?: string;
}

export interface LocationPermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
  error?: string;
}

export class LocationService {
  
  /**
   * ✅ VERIFICAR SE GEOLOCALIZAÇÃO É SUPORTADA
   */
  static isGeolocationSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * ✅ VERIFICAR STATUS DAS PERMISSÕES DE LOCALIZAÇÃO
   */
  static async checkLocationPermission(): Promise<LocationPermissionStatus> {
    try {
      if (!this.isGeolocationSupported()) {
        return {
          granted: false,
          denied: true,
          prompt: false,
          error: 'Geolocalização não suportada neste dispositivo'
        };
      }

      // Verificar permissões usando a API de Permissions (se suportada)
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        
        return {
          granted: permission.state === 'granted',
          denied: permission.state === 'denied',
          prompt: permission.state === 'prompt'
        };
      }

      // Fallback: tentar obter localização para verificar permissões
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve({ granted: true, denied: false, prompt: false }),
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              resolve({ granted: false, denied: true, prompt: false });
            } else {
              resolve({ granted: false, denied: false, prompt: true });
            }
          },
          { timeout: 1000 }
        );
      });
    } catch (error) {
      console.error('❌ Erro ao verificar permissões de localização:', error);
      return {
        granted: false,
        denied: false,
        prompt: true,
        error: 'Erro ao verificar permissões'
      };
    }
  }

  /**
   * ✅ SOLICITAR PERMISSÃO E OBTER LOCALIZAÇÃO ATUAL
   */
  static async getCurrentLocation(highAccuracy = true): Promise<UserLocation> {
    return new Promise((resolve, reject) => {
      if (!this.isGeolocationSupported()) {
        reject(new Error('Geolocalização não suportada neste dispositivo'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: highAccuracy,
        timeout: highAccuracy ? 15000 : 10000, // Mais tempo para alta precisão
        maximumAge: highAccuracy ? 0 : 300000 // Cache por 5 min se não for alta precisão
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };
          
          console.log('✅ Localização obtida:', location);
          resolve(location);
        },
        (error) => {
          console.error('❌ Erro ao obter localização:', error);
          
          let errorMessage = 'Erro desconhecido ao obter localização';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permissão de localização negada pelo usuário';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Localização indisponível no momento';
              break;
            case error.TIMEOUT:
              errorMessage = 'Tempo limite para obter localização excedido';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        options
      );
    });
  }

  /**
   * ✅ OBTER ENDEREÇO A PARTIR DAS COORDENADAS (GEOCODING REVERSO)
   */
  static async getAddressFromCoordinates(latitude: number, longitude: number): Promise<{
    address?: string;
    city?: string;
    country?: string;
  }> {
    try {
      // Usar API de geocoding gratuita (OpenStreetMap Nominatim)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=pt`
      );

      if (!response.ok) {
        throw new Error(`Erro na API de geocoding: ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.display_name) {
        return {
          address: data.display_name,
          city: data.address?.city || data.address?.town || data.address?.village,
          country: data.address?.country
        };
      }

      return {};
    } catch (error) {
      console.warn('⚠️ Erro ao obter endereço:', error);
      return {};
    }
  }

  /**
   * ✅ SALVAR LOCALIZAÇÃO DO USUÁRIO NO BANCO DE DADOS
   */
  static async saveUserLocation(userId: string, location: UserLocation): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          current_latitude: location.latitude,
          current_longitude: location.longitude,
          location_accuracy: location.accuracy,
          location_updated_at: new Date().toISOString(),
          current_address: location.address,
          current_city: location.city,
          current_country: location.country
        })
        .eq('id', userId);

      if (error) throw error;

      console.log('✅ Localização salva no banco de dados');
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar localização:', error);
      return false;
    }
  }

  /**
   * ✅ CALCULAR DISTÂNCIA ENTRE DUAS COORDENADAS (HAVERSINE)
   */
  static calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371; // Raio da Terra em km
    
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distância em km
  }

  /**
   * ✅ CONVERTER GRAUS PARA RADIANOS
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * ✅ FILTRAR EVENTOS DENTRO DO RAIO ESPECIFICADO
   */
  static filterEventsByDistance(
    events: any[], 
    userLat: number, 
    userLon: number, 
    maxDistance: number = 10
  ): any[] {
    return events.filter(event => {
      if (!event.restaurant_latitude || !event.restaurant_longitude) {
        return true; // Incluir eventos sem localização
      }

      const distance = this.calculateDistance(
        userLat,
        userLon,
        event.restaurant_latitude,
        event.restaurant_longitude
      );

      return distance <= maxDistance;
    }).map(event => {
      // Adicionar distância ao objeto do evento
      if (event.restaurant_latitude && event.restaurant_longitude) {
        event.distance = this.calculateDistance(
          userLat,
          userLon,
          event.restaurant_latitude,
          event.restaurant_longitude
        );
      }
      return event;
    });
  }

  /**
   * ✅ BUSCAR EVENTOS PRÓXIMOS VIA SQL (MAIS EFICIENTE)
   */
  static async findNearbyEvents(
    userLat: number,
    userLon: number,
    maxDistance: number = 10,
    limit: number = 50
  ): Promise<any[]> {
    try {
      // Usar função SQL personalizada para busca geográfica
      const { data, error } = await supabase.rpc('find_nearby_events', {
        user_lat: userLat,
        user_lon: userLon,
        max_distance_km: maxDistance,
        limit_count: limit
      });

      if (error) {
        console.warn('⚠️ Função SQL não encontrada, usando filtro JavaScript');
        // Fallback: buscar todos os eventos e filtrar
        const { data: allEvents, error: eventsError } = await supabase
          .from('events')
          .select('*, restaurant_latitude, restaurant_longitude')
          .not('restaurant_latitude', 'is', null)
          .not('restaurant_longitude', 'is', null)
          .limit(200);

        if (eventsError) throw eventsError;

        return this.filterEventsByDistance(allEvents || [], userLat, userLon, maxDistance);
      }

      console.log(`✅ Encontrados ${data?.length || 0} eventos próximos`);
      return data || [];
    } catch (error) {
      console.error('❌ Erro ao buscar eventos próximos:', error);
      return [];
    }
  }

  /**
   * ✅ OBTER LOCALIZAÇÃO SALVA DO USUÁRIO
   */
  static async getUserLocation(userId: string): Promise<UserLocation | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('current_latitude, current_longitude, location_accuracy, location_updated_at, current_address, current_city, current_country')
        .eq('id', userId)
        .single();

      if (error || !data?.current_latitude || !data?.current_longitude) {
        return null;
      }

      return {
        latitude: data.current_latitude,
        longitude: data.current_longitude,
        accuracy: data.location_accuracy,
        timestamp: new Date(data.location_updated_at).getTime(),
        address: data.current_address,
        city: data.current_city,
        country: data.current_country
      };
    } catch (error) {
      console.error('❌ Erro ao obter localização do usuário:', error);
      return null;
    }
  }

  /**
   * ✅ VERIFICAR SE LOCALIZAÇÃO PRECISA SER ATUALIZADA
   */
  static shouldUpdateLocation(lastUpdate: number, maxAge: number = 3600000): boolean {
    // Padrão: atualizar se passou mais de 1 hora (3600000ms)
    return Date.now() - lastUpdate > maxAge;
  }
}

export default LocationService;