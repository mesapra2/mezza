/**
 * ========================================
 * SERVIÇO DE ENDEREÇOS
 * ========================================
 * 
 * Gerencia endereços de entrega dos usuários
 */

import { supabase } from '@/lib/supabaseClient';

export interface UserAddress {
  id?: string;
  user_id: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  label: string;
  is_default: boolean;
  is_active: boolean;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ZipCodeInfo {
  street?: string;
  neighborhood?: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
}

export class AddressService {
  
  /**
   * Buscar endereços do usuário
   */
  static async getUserAddresses(userId: string): Promise<UserAddress[]> {
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        // Se a tabela não existe, retorna array vazio
        if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
          console.warn('⚠️ Tabela user_addresses não encontrada. Execute o script de correção.');
          return [];
        }
        console.error('Erro ao buscar endereços:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar endereços:', error);
      return [];
    }
  }

  /**
   * Buscar endereço padrão do usuário
   */
  static async getDefaultAddress(userId: string): Promise<UserAddress | null> {
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      if (error) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar endereço padrão:', error);
      return null;
    }
  }

  /**
   * Criar novo endereço
   */
  static async createAddress(address: Omit<UserAddress, 'id' | 'created_at' | 'updated_at'>): Promise<UserAddress | null> {
    try {
      // Se é o primeiro endereço, marcar como padrão
      const existingAddresses = await this.getUserAddresses(address.user_id);
      if (existingAddresses.length === 0) {
        address.is_default = true;
      }

      const { data, error } = await supabase
        .from('user_addresses')
        .insert(address)
        .select('*')
        .single();

      if (error) {
        // Se a tabela não existe, mostrar mensagem específica
        if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
          console.error('❌ Tabela user_addresses não encontrada. Execute a migração para habilitar o gerenciamento de endereços.');
          throw new Error('Funcionalidade de endereços não disponível. Entre em contato com o suporte.');
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro ao criar endereço:', error);
      return null;
    }
  }

  /**
   * Atualizar endereço
   */
  static async updateAddress(addressId: string, updates: Partial<UserAddress>): Promise<UserAddress | null> {
    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .update(updates)
        .eq('id', addressId)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Erro ao atualizar endereço:', error);
      return null;
    }
  }

  /**
   * Marcar endereço como padrão
   */
  static async setDefaultAddress(addressId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Erro ao definir endereço padrão:', error);
      return false;
    }
  }

  /**
   * Deletar endereço (soft delete)
   */
  static async deleteAddress(addressId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_addresses')
        .update({ is_active: false })
        .eq('id', addressId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Erro ao deletar endereço:', error);
      return false;
    }
  }

  /**
   * Buscar informações do CEP via API externa
   */
  static async lookupZipCode(zipCode: string): Promise<ZipCodeInfo | null> {
    try {
      // Primeiro, tentar buscar na base local
      const { data, error } = await supabase
        .rpc('lookup_zip_code', { p_zip_code: zipCode.replace(/\D/g, '') });

      if (!error && data && data.length > 0) {
        const result = data[0];
        return {
          street: result.street,
          neighborhood: result.neighborhood,
          city: result.city,
          state: result.state,
          latitude: result.latitude,
          longitude: result.longitude
        };
      }

      // Se não encontrar localmente, buscar via API externa (ViaCEP)
      const cleanZipCode = zipCode.replace(/\D/g, '');
      if (cleanZipCode.length !== 8) {
        return null;
      }

      const response = await fetch(`https://viacep.com.br/ws/${cleanZipCode}/json/`);
      
      if (!response.ok) {
        return null;
      }

      const viaCepData = await response.json();
      
      if (viaCepData.erro) {
        return null;
      }

      const zipCodeInfo: ZipCodeInfo = {
        street: viaCepData.logradouro || undefined,
        neighborhood: viaCepData.bairro || undefined,
        city: viaCepData.localidade,
        state: viaCepData.uf
      };

      // Salvar na base local para futuras consultas
      try {
        await supabase
          .from('zip_codes')
          .upsert({
            zip_code: cleanZipCode,
            street: zipCodeInfo.street,
            neighborhood: zipCodeInfo.neighborhood,
            city: zipCodeInfo.city,
            state: zipCodeInfo.state
          });
      } catch (error) {
        // Ignorar erro de inserção, continuar com o resultado
        console.log('Aviso: não foi possível salvar CEP na base local');
      }

      return zipCodeInfo;

    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      return null;
    }
  }

  /**
   * Validar CEP brasileiro
   */
  static validateZipCode(zipCode: string): boolean {
    const cleanZipCode = zipCode.replace(/\D/g, '');
    return cleanZipCode.length === 8;
  }

  /**
   * Formatar CEP (00000-000)
   */
  static formatZipCode(zipCode: string): string {
    const clean = zipCode.replace(/\D/g, '');
    if (clean.length === 8) {
      return clean.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
    return zipCode;
  }

  /**
   * Calcular distância entre dois pontos (em km)
   */
  static calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Arredondar para 2 casas decimais
  }

  private static deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  /**
   * Obter coordenadas via geocoding (placeholder)
   */
  static async getCoordinates(address: string): Promise<{lat: number, lng: number} | null> {
    // Em produção, integrar com Google Maps API ou similar
    // Por enquanto retorna null
    return null;
  }
}

export default AddressService;