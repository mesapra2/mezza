import React, { useState, useEffect } from 'react';
import { MapPin, Search, Store, Loader, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Label } from '@/features/shared/components/ui/label';
import { Input } from '@/features/shared/components/ui/input';

const RestaurantSelector = ({ value, onChange, eventType }) => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPartner, setSelectedPartner] = useState(null);

  useEffect(() => {
    loadPartners();
  }, []);

  useEffect(() => {
    if (value && partners.length > 0) {
      const partner = partners.find(p => p.id === value);
      setSelectedPartner(partner);
    }
  }, [value, partners]);

  const loadPartners = async () => {
    setLoading(true);
    try {
      // ✅ BUSCA TODOS OS RESTAURANTES ATIVOS
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Erro SQL:', error);
        throw error;
      }
      
      console.log('✅ Total de restaurantes no banco:', data?.length || 0);
      console.log('📋 Restaurantes:', data);
      
      // Filtra apenas os ativos no frontend (mais seguro)
      const activePartners = data?.filter(p => {
        // Aceita diferentes variações de campos de status
        return p.status === 'ativo' || 
               p.status === 'active' || 
               p.is_active === true || 
               p.active === true ||
               !p.status; // Se não tiver campo status, inclui
      }) || [];
      
      console.log('✅ Restaurantes ativos:', activePartners.length);
      setPartners(activePartners);
    } catch (error) {
      console.error('❌ Erro ao carregar restaurantes:', error);
      setPartners([]); // Garante array vazio em caso de erro
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (partner) => {
    setSelectedPartner(partner);
    onChange(partner.id);
  };

  const handleClear = () => {
    setSelectedPartner(null);
    onChange(null);
  };

  const getAddress = (partner) => {
    if (!partner.address) return null;
    
    if (typeof partner.address === 'string') {
      return partner.address;
    }
    
    if (typeof partner.address === 'object') {
      if (partner.address.text) return partner.address.text;
      
      const parts = [
        partner.address.street || partner.address.rua,
        partner.address.number || partner.address.numero,
        partner.address.city || partner.address.cidade,
      ].filter(Boolean);
      
      return parts.length > 0 ? parts.join(', ') : null;
    }
    
    return null;
  };

  const filteredPartners = partners.filter(partner => {
    const searchLower = searchTerm.toLowerCase();
    const address = getAddress(partner);
    
    return (
      partner.name?.toLowerCase().includes(searchLower) ||
      partner.contact_name?.toLowerCase().includes(searchLower) ||
      partner.description?.toLowerCase().includes(searchLower) ||
      address?.toLowerCase().includes(searchLower)
    );
  });

  if (eventType === 'institucional') {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="partner">
          Restaurante {eventType === 'padrao' && <span className="text-red-400">*</span>}
        </Label>
        <button
          type="button"
          onClick={loadPartners}
          disabled={loading}
          className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1 disabled:opacity-50"
          title="Recarregar restaurantes"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {selectedPartner ? (
        <div className="glass-effect rounded-lg p-4 border border-white/10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Store className="w-4 h-4 text-purple-400" />
                <h4 className="text-white font-semibold">{selectedPartner.name}</h4>
                {selectedPartner.type === 'premium' && (
                  <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-0.5 rounded-full">
                    Premium
                  </span>
                )}
              </div>
              {selectedPartner.contact_name && (
                <p className="text-white/50 text-xs mb-2">{selectedPartner.contact_name}</p>
              )}
              {selectedPartner.description && (
                <p className="text-white/60 text-sm mb-2 line-clamp-2">{selectedPartner.description}</p>
              )}
              {getAddress(selectedPartner) && (
                <div className="flex items-start gap-2 text-white/60 text-sm">
                  <MapPin className="w-3 h-3 mt-1 flex-shrink-0" />
                  <p>{getAddress(selectedPartner)}</p>
                </div>
              )}
              {selectedPartner.phone && (
                <p className="text-white/40 text-xs mt-1">Tel: {selectedPartner.phone}</p>
              )}
            </div>
            <button type="button" onClick={handleClear} className="text-red-400 hover:text-red-300 text-sm">
              Alterar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              type="text"
              placeholder="Buscar restaurante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 glass-effect border-white/10"
            />
          </div>

          <div className="glass-effect rounded-lg border border-white/10 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader className="w-6 h-6 text-white/40 animate-spin" />
              </div>
            ) : filteredPartners.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="w-12 h-12 text-white/20 mb-2" />
                <p className="text-white/60 text-sm">
                  {searchTerm ? 'Nenhum restaurante encontrado' : 'Nenhum restaurante disponível'}
                </p>
                {!searchTerm && partners.length === 0 && (
                  <p className="text-white/40 text-xs mt-2">
                    Total no banco: {partners.length} restaurantes
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {filteredPartners.map((partner) => {
                  const address = getAddress(partner);
                  
                  return (
                    <button
                      key={partner.id}
                      type="button"
                      onClick={() => handleSelect(partner)}
                      className="w-full text-left p-4 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Store className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-white font-medium">{partner.name}</h4>
                            {partner.type === 'premium' && (
                              <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-0.5 rounded-full">
                                Premium
                              </span>
                            )}
                          </div>
                          {partner.contact_name && (
                            <p className="text-white/50 text-xs mb-1">{partner.contact_name}</p>
                          )}
                          {partner.description && (
                            <p className="text-white/60 text-sm mb-1 line-clamp-1">
                              {partner.description}
                            </p>
                          )}
                          {address && (
                            <div className="flex items-start gap-1 text-white/60 text-sm mb-1">
                              <MapPin className="w-3 h-3 mt-1 flex-shrink-0" />
                              <p className="truncate">{address}</p>
                            </div>
                          )}
                          {partner.phone && (
                            <p className="text-white/40 text-xs">Tel: {partner.phone}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {eventType === 'particular' && (
            <p className="text-white/40 text-xs">
              Dica: Você pode criar o evento sem selecionar um restaurante e informar o local manualmente.
            </p>
          )}

          {eventType === 'padrao' && (
            <p className="text-yellow-300 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Eventos padrão devem ser realizados em restaurantes credenciados
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default RestaurantSelector;