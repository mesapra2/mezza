/**
 * ========================================
 * GERENCIADOR DE ENDEREÇOS
 * ========================================
 * 
 * Componente para gerenciar endereços de entrega do usuário
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Home, 
  Building, 
  Star,
  Check,
  X,
  Loader2,
  Search
} from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Label } from '@/features/shared/components/ui/label';
import { toast } from '@/features/shared/components/ui/use-toast';
import AddressService from '@/services/AddressService';
import { useAuth } from '@/contexts/AuthContext';

const AddressManager = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [lookingUpZip, setLookingUpZip] = useState(false);

  // Formulário de endereço
  const [formData, setFormData] = useState({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: '',
    label: 'Principal',
    is_default: false
  });

  // Carregar endereços do usuário
  useEffect(() => {
    if (user?.id) {
      loadAddresses();
    }
  }, [user]);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const userAddresses = await AddressService.getUserAddresses(user.id);
      setAddresses(userAddresses);
    } catch (error) {
      console.error('Erro ao carregar endereços:', error);
      
      // Verificar se é erro de tabela não encontrada
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        toast({
          variant: "destructive",
          title: "Funcionalidade Indisponível",
          description: "O gerenciamento de endereços ainda não está configurado no sistema. Entre em contato com o suporte.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar seus endereços.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Buscar informações do CEP
  const handleZipCodeLookup = async (zipCode) => {
    if (!AddressService.validateZipCode(zipCode)) {
      return;
    }

    setLookingUpZip(true);
    try {
      const zipInfo = await AddressService.lookupZipCode(zipCode);
      
      if (zipInfo) {
        setFormData(prev => ({
          ...prev,
          street: zipInfo.street || prev.street,
          neighborhood: zipInfo.neighborhood || prev.neighborhood,
          city: zipInfo.city,
          state: zipInfo.state,
          zip_code: AddressService.formatZipCode(zipCode)
        }));

        toast({
          title: "CEP encontrado!",
          description: `${zipInfo.city} - ${zipInfo.state}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "CEP não encontrado",
          description: "Verifique se o CEP está correto.",
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível buscar informações do CEP.",
      });
    } finally {
      setLookingUpZip(false);
    }
  };

  // Manipular mudanças no formulário
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-buscar CEP quando completar 8 dígitos
    if (field === 'zip_code') {
      const cleanZip = value.replace(/\D/g, '');
      if (cleanZip.length === 8 && cleanZip !== formData.zip_code.replace(/\D/g, '')) {
        handleZipCodeLookup(cleanZip);
      }
    }
  };

  // Salvar endereço
  const handleSaveAddress = async () => {
    // Validações básicas
    if (!formData.street || !formData.number || !formData.neighborhood || 
        !formData.city || !formData.state || !formData.zip_code) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    setSaving(true);
    try {
      const addressData = {
        ...formData,
        user_id: user.id,
        zip_code: formData.zip_code.replace(/\D/g, '')
      };

      let success = false;

      if (editingAddress) {
        // Atualizar endereço existente
        const result = await AddressService.updateAddress(editingAddress.id, addressData);
        success = !!result;
      } else {
        // Criar novo endereço
        const result = await AddressService.createAddress(addressData);
        success = !!result;
      }

      if (success) {
        toast({
          title: editingAddress ? "Endereço atualizado!" : "Endereço salvo!",
          description: "Seu endereço foi salvo com sucesso.",
        });

        // Recarregar endereços e fechar formulário
        await loadAddresses();
        handleCancelForm();
        onSuccess?.();
      } else {
        throw new Error('Falha ao salvar endereço');
      }
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar o endereço.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Cancelar formulário
  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAddress(null);
    setFormData({
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zip_code: '',
      label: 'Principal',
      is_default: false
    });
  };

  // Editar endereço
  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setFormData({
      street: address.street,
      number: address.number,
      complement: address.complement || '',
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zip_code: AddressService.formatZipCode(address.zip_code),
      label: address.label,
      is_default: address.is_default
    });
    setShowForm(true);
  };

  // Definir como padrão
  const handleSetDefault = async (addressId) => {
    try {
      const success = await AddressService.setDefaultAddress(addressId);
      
      if (success) {
        toast({
          title: "Endereço padrão definido!",
          description: "Este endereço agora é seu padrão para entregas.",
        });
        await loadAddresses();
        onSuccess?.();
      }
    } catch (error) {
      console.error('Erro ao definir endereço padrão:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível definir como padrão.",
      });
    }
  };

  // Deletar endereço
  const handleDeleteAddress = async (addressId) => {
    if (!confirm('Tem certeza que deseja remover este endereço?')) {
      return;
    }

    try {
      const success = await AddressService.deleteAddress(addressId);
      
      if (success) {
        toast({
          title: "Endereço removido!",
          description: "O endereço foi removido com sucesso.",
        });
        await loadAddresses();
        onSuccess?.();
      }
    } catch (error) {
      console.error('Erro ao deletar endereço:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover o endereço.",
      });
    }
  };

  // Ícones para tipos de endereço
  const getAddressIcon = (label) => {
    switch (label.toLowerCase()) {
      case 'casa':
      case 'principal':
        return Home;
      case 'trabalho':
        return Building;
      default:
        return MapPin;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-white">Carregando endereços...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="w-8 h-8" />
              <div>
                <h2 className="text-xl font-bold">Meus Endereços</h2>
                <p className="text-blue-100 text-sm">
                  Gerencie seus endereços de entrega
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          <AnimatePresence>
            {!showForm ? (
              // Lista de endereços
              <motion.div
                key="address-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Botão Adicionar */}
                <Button
                  onClick={() => setShowForm(true)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Novo Endereço
                </Button>

                {/* Lista de endereços */}
                {addresses.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPin className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">
                      Nenhum endereço cadastrado
                    </h3>
                    <p className="text-gray-300">
                      Adicione seu primeiro endereço de entrega
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {addresses.map((address) => {
                      const IconComponent = getAddressIcon(address.label);
                      
                      return (
                        <div
                          key={address.id}
                          className={`border-2 rounded-lg p-4 ${
                            address.is_default 
                              ? 'border-blue-500 bg-blue-500/10' 
                              : 'border-gray-600 bg-gray-800'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                address.is_default ? 'bg-blue-500' : 'bg-gray-400'
                              }`}>
                                <IconComponent className="w-5 h-5 text-white" />
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-white">
                                    {address.label}
                                  </h4>
                                  {address.is_default && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      <Star className="w-3 h-3 mr-1" />
                                      Padrão
                                    </span>
                                  )}
                                </div>
                                
                                <p className="text-white/80 text-sm">
                                  {address.street}, {address.number}
                                  {address.complement && `, ${address.complement}`}
                                </p>
                                <p className="text-white/60 text-sm">
                                  {address.neighborhood} - {address.city}/{address.state}
                                </p>
                                <p className="text-white/60 text-sm">
                                  CEP: {AddressService.formatZipCode(address.zip_code)}
                                </p>
                              </div>
                            </div>
                            
                            {/* Ações */}
                            <div className="flex items-center gap-2 ml-4">
                              {!address.is_default && (
                                <Button
                                  onClick={() => handleSetDefault(address.id)}
                                  variant="outline"
                                  size="sm"
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                >
                                  <Star className="w-4 h-4" />
                                </Button>
                              )}
                              
                              <Button
                                onClick={() => handleEditAddress(address)}
                                variant="outline"
                                size="sm"
                                className="text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              
                              <Button
                                onClick={() => handleDeleteAddress(address.id)}
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ) : (
              // Formulário de endereço
              <motion.div
                key="address-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    {editingAddress ? 'Editar Endereço' : 'Novo Endereço'}
                  </h3>
                  <Button
                    onClick={handleCancelForm}
                    variant="outline"
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CEP */}
                  <div className="md:col-span-1">
                    <Label htmlFor="zip_code" className="text-white">CEP *</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="zip_code"
                        value={formData.zip_code}
                        onChange={(e) => handleFormChange('zip_code', e.target.value)}
                        placeholder="00000-000"
                        maxLength={9}
                        className="bg-gray-800 border-gray-600 text-white"
                      />
                      {lookingUpZip && <Loader2 className="w-5 h-5 animate-spin self-center text-white" />}
                    </div>
                  </div>

                  {/* Rótulo */}
                  <div>
                    <Label htmlFor="label" className="text-white">Rótulo *</Label>
                    <select
                      id="label"
                      value={formData.label}
                      onChange={(e) => handleFormChange('label', e.target.value)}
                      className="w-full mt-1 p-2 border border-gray-600 rounded-md bg-gray-800 text-white"
                    >
                      <option value="Principal">Principal</option>
                      <option value="Casa">Casa</option>
                      <option value="Trabalho">Trabalho</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  {/* Rua */}
                  <div className="md:col-span-2">
                    <Label htmlFor="street" className="text-white">Rua/Avenida *</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) => handleFormChange('street', e.target.value)}
                      placeholder="Nome da rua"
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>

                  {/* Número e Complemento */}
                  <div>
                    <Label htmlFor="number" className="text-white">Número *</Label>
                    <Input
                      id="number"
                      value={formData.number}
                      onChange={(e) => handleFormChange('number', e.target.value)}
                      placeholder="123"
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="complement" className="text-white">Complemento</Label>
                    <Input
                      id="complement"
                      value={formData.complement}
                      onChange={(e) => handleFormChange('complement', e.target.value)}
                      placeholder="Apto, sala, etc."
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>

                  {/* Bairro */}
                  <div className="md:col-span-2">
                    <Label htmlFor="neighborhood" className="text-white">Bairro *</Label>
                    <Input
                      id="neighborhood"
                      value={formData.neighborhood}
                      onChange={(e) => handleFormChange('neighborhood', e.target.value)}
                      placeholder="Nome do bairro"
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>

                  {/* Cidade e Estado */}
                  <div>
                    <Label htmlFor="city" className="text-white">Cidade *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleFormChange('city', e.target.value)}
                      placeholder="Nome da cidade"
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="state" className="text-white">Estado *</Label>
                    <select
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleFormChange('state', e.target.value)}
                      className="w-full mt-1 p-2 border border-gray-600 rounded-md bg-gray-800 text-white"
                    >
                      <option value="">Selecione o Estado</option>
                      <option value="AC">Acre</option>
                      <option value="AL">Alagoas</option>
                      <option value="AP">Amapá</option>
                      <option value="AM">Amazonas</option>
                      <option value="BA">Bahia</option>
                      <option value="CE">Ceará</option>
                      <option value="DF">Distrito Federal</option>
                      <option value="ES">Espírito Santo</option>
                      <option value="GO">Goiás</option>
                      <option value="MA">Maranhão</option>
                      <option value="MT">Mato Grosso</option>
                      <option value="MS">Mato Grosso do Sul</option>
                      <option value="MG">Minas Gerais</option>
                      <option value="PA">Pará</option>
                      <option value="PB">Paraíba</option>
                      <option value="PR">Paraná</option>
                      <option value="PE">Pernambuco</option>
                      <option value="PI">Piauí</option>
                      <option value="RJ">Rio de Janeiro</option>
                      <option value="RN">Rio Grande do Norte</option>
                      <option value="RS">Rio Grande do Sul</option>
                      <option value="RO">Rondônia</option>
                      <option value="RR">Roraima</option>
                      <option value="SC">Santa Catarina</option>
                      <option value="SP">São Paulo</option>
                      <option value="SE">Sergipe</option>
                      <option value="TO">Tocantins</option>
                    </select>
                  </div>

                  {/* Endereço padrão */}
                  <div className="md:col-span-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.is_default}
                        onChange={(e) => handleFormChange('is_default', e.target.checked)}
                        className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800"
                      />
                      <span className="text-sm text-white">Definir como endereço padrão</span>
                    </label>
                  </div>
                </div>

                {/* Botões de ação */}
                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={handleSaveAddress}
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        {editingAddress ? 'Atualizar' : 'Salvar'} Endereço
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleCancelForm}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default AddressManager;