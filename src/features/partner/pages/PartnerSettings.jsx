import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabaseClient';
// Importa as funções que movemos para o utils.js
import { getPhotoUrl, compressImage } from '@/utils'; 
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/features/shared/components/ui/use-toast';
import { 
  // eslint-disable-next-line no-unused-vars
  Save, Upload, X, Image as ImageIcon, Loader2,
  // eslint-disable-next-line no-unused-vars
  MapPin, Phone, Globe, Mail, Clock, Users, DollarSign, Gift, Plus
} from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Label } from '@/features/shared/components/ui/label';
import { Textarea } from '@/features/shared/components/ui/textarea';
import { Checkbox } from '@/features/shared/components/ui/checkbox';

// Opções de benefícios predefinidas
const BENEFIT_OPTIONS = [
  '10% de desconto',
  '15% de desconto',
  '20% de desconto',
  'Drink de boas-vindas',
  'Sobremesa grátis',
  'Entrada cortesia',
  'Estacionamento grátis',
  'Wi-Fi grátis',
  'Música ao vivo',
  'Espaço kids',
  'Valet grátis',
  'Copa de champagne',
];

const PartnerSettings = () => {
  // eslint-disable-next-line no-unused-vars
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [partner, setPartner] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '', // <-- NOVO CAMPO ADICIONADO
    description: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    cuisine_type: '',
    price_range: '',
    capacity: '',
    opening_hours: '',
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zip_code: ''
    }
  });
  const [photos, setPhotos] = useState([]);
  const [selectedBenefits, setSelectedBenefits] = useState([]);
  const [customBenefit, setCustomBenefit] = useState('');

  // 2. ENVOLVEMOS 'loadPartner' COM 'useCallback'
  // A função agora só será recriada se 'user' ou 'toast' mudarem.
  const loadPartner = useCallback(async () => {
    try {
      setLoading(true);
      
      // Adicionamos uma checagem para garantir que 'user' existe
      if (!user) {
        setLoading(false);
        return; 
      }

      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        console.log('✅ Dados do parceiro carregados:', data);
        setPartner(data);
        
        // Preenche o formulário
        setFormData({
          name: data.name || '',
          cnpj: data.cnpj || '', // <-- NOVO CAMPO ADICIONADO
          description: data.description || '',
          contact_name: data.contact_name || '',
          email: data.email || '',
          phone: data.phone || '',
          website: data.website || '',
          cuisine_type: data.cuisine_type || '',
          price_range: data.price_range || '',
          capacity: data.capacity || '',
          opening_hours: data.opening_hours || '',
          address: (data.address && typeof data.address === 'object') ? data.address : {
            street: '',
            number: '',
            complement: '',
            neighborhood: '',
            city: '',
            state: '',
            zip_code: ''
          }
        });

        // Carrega fotos
        if (data.photos && Array.isArray(data.photos)) {
          setPhotos(data.photos);
        }

        // Carrega benefícios
        if (data.benefits && Array.isArray(data.benefits)) {
          setSelectedBenefits(data.benefits);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados do parceiro:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar seus dados."
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]); // 3. ADICIONAMOS AS DEPENDÊNCIAS (user e toast)

  // O useEffect agora chama a função memorizada e não causa loop.
  useEffect(() => {
    loadPartner();
  }, [loadPartner]);


  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
  };

  const toggleBenefit = (benefit) => {
    setSelectedBenefits(prev => {
      if (prev.includes(benefit)) {
        return prev.filter(b => b !== benefit);
      } else {
        return [...prev, benefit];
      }
    });
  };

  const addCustomBenefit = () => {
    if (customBenefit.trim() && !selectedBenefits.includes(customBenefit.trim())) {
      setSelectedBenefits(prev => [...prev, customBenefit.trim()]);
      setCustomBenefit('');
      toast({
        title: "Benefício adicionado!",
        description: "Não esqueça de salvar as alterações."
      });
    }
  };

  const removeBenefit = (benefit) => {
    setSelectedBenefits(prev => prev.filter(b => b !== benefit));
  };

  //
  // As funções 'compressImage' e 'getPhotoUrl' foram removidas daqui
  // e importadas do '@//utils' no topo do arquivo.
  //

  const handlePhotoUpload = async (event) => {
    const files = Array.from(event.target.files);
    
    if (photos.length + files.length > 6) {
      toast({
        variant: "destructive",
        title: "Limite excedido",
        description: "Você pode adicionar no máximo 6 fotos."
      });
      return;
    }

    setUploadingPhotos(true);

    try {
      const uploadedPhotos = [];

      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          console.warn('Arquivo ignorado (não é imagem):', file.name);
          continue;
        }

        // Usa a função importada
        const compressedFile = await compressImage(file); 
        
        console.log(`📸 Original: ${(file.size / 1024 / 1024).toFixed(2)}MB → Comprimido: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);

        const fileExt = compressedFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, compressedFile);

        if (uploadError) throw uploadError;

        uploadedPhotos.push(fileName);
      }

      setPhotos(prev => [...prev, ...uploadedPhotos]);

      toast({
        title: "Fotos enviadas!",
        description: `${uploadedPhotos.length} foto(s) adicionada(s) com sucesso.`
      });

    } catch (error) {
      console.error('❌ Erro ao fazer upload de fotos:', error);
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: "Não foi possível enviar as fotos."
      });
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleRemovePhoto = async (photoPath) => {
    try {
      const { error } = await supabase.storage
        .from('photos')
        .remove([photoPath]);

      if (error) throw error;

      setPhotos(prev => prev.filter(p => p !== photoPath));

      toast({
        title: "Foto removida",
        description: "A foto foi excluída com sucesso."
      });
    } catch (error) {
      console.error('❌ Erro ao remover foto:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível remover a foto."
      });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const updates = {
        owner_id: user.id,
        name: formData.name,
        cnpj: formData.cnpj, // <-- NOVO CAMPO ADICIONADO
        description: formData.description,
        contact_name: formData.contact_name,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        cuisine_type: formData.cuisine_type,
        price_range: formData.price_range,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        opening_hours: formData.opening_hours,
        address: formData.address,
        photos: photos,
        benefits: selectedBenefits,
        updated_at: new Date().toISOString()
      };

      let result;
      
      if (partner) {
        // Update
        result = await supabase
          .from('partners')
          .update(updates)
          .eq('id', partner.id)
          .select()
          .single();
      } else {
        // Insert
        result = await supabase
          .from('partners')
          .insert(updates)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // 🔥 Atualiza o profile com o partner_id
      if (!partner) {
        await supabase
          .from('profiles')
          .update({ 
            partner_id: result.data.id,
            profile_type: 'partner'
          })
          .eq('id', user.id);
      }

      toast({
        title: "Salvo com sucesso!",
        description: "As informações do seu restaurante foram atualizadas."
      });

      setPartner(result.data);
      
      // Redireciona para a página pública
      navigate(`/restaurant/${result.data.id}`);

    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar as alterações."
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Configurações do Restaurante - Mesapra2</title>
      </Helmet>

      <div className="py-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Configurações do Restaurante
          </h1>
          <p className="text-white/60">
            Gerencie as informações do seu estabelecimento
          </p>
        </div>

        <div className="space-y-6">
          {/* Fotos */}
          <div className="glass-effect rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white mb-1">Fotos do Restaurante</h2>
                <p className="text-white/60 text-sm">
                  Adicione até 6 fotos (máx. 2MB cada - redimensionamento automático)
                </p>
              </div>
              <span className="text-white/60 text-sm">
                {photos.length}/6
              </span>
            </div>

            {/* Grid de fotos */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {photos.map((photo, index) => {
                const photoUrl = getPhotoUrl(photo); // Usa a função importada
                return (
                  <div key={index} className="relative group aspect-video rounded-lg overflow-hidden border border-white/10">
                    {photoUrl && (
                      <img
                        src={photoUrl}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {index === 0 && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-purple-500 text-white text-xs rounded">
                        Principal
                      </div>
                    )}
                    <button
                      onClick={() => handleRemovePhoto(photo)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                );
              })}

              {/* Botão de adicionar */}
              {photos.length < 6 && (
                <label className="aspect-video rounded-lg border-2 border-dashed border-white/20 hover:border-purple-500/50 cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhotos}
                    className="hidden"
                  />
                  {uploadingPhotos ? (
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-white/40" />
                      <span className="text-white/60 text-sm">Adicionar foto</span>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>

          {/* Informações Básicas */}
          <div className="glass-effect rounded-2xl p-6 border border-white/10 space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">Informações Básicas</h2>

            <div>
              <Label htmlFor="name">Nome do Restaurante *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Ex: Restaurante Sabor & Arte"
                className="glass-effect border-white/10"
              />
            </div>
            
            {/* --- CAMPO DE CNPJ ADICIONADO AQUI --- */}
            <div>
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => handleInputChange('cnpj', e.target.value)}
                placeholder="Ex: 00.000.000/0001-00"
                className="glass-effect border-white/10"
              />
            </div>
            {/* --- FIM DA ADIÇÃO --- */}

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Conte um pouco sobre seu restaurante..."
                rows={4}
                className="glass-effect border-white/10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_name">Nome do Contato</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => handleInputChange('contact_name', e.target.value)}
                  placeholder="Ex: João Silva"
                  className="glass-effect border-white/10"
                />
              </div>

              <div>
                <Label htmlFor="cuisine_type">Tipo de Culinária</Label>
                <Input
                  id="cuisine_type"
                  value={formData.cuisine_type}
                  onChange={(e) => handleInputChange('cuisine_type', e.target.value)}
                  placeholder="Ex: Italiana, Japonesa, Brasileira"
                  className="glass-effect border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price_range">Faixa de Preço</Label>
                <Input
                  id="price_range"
                  value={formData.price_range}
                  onChange={(e) => handleInputChange('price_range', e.target.value)}
                  placeholder="Ex: $ - $ ou R$ 50-150"
                  className="glass-effect border-white/10"
                />
              </div>

              <div>
                <Label htmlFor="capacity">Capacidade (pessoas)</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => handleInputChange('capacity', e.target.value)}
                  placeholder="Ex: 100"
                  className="glass-effect border-white/10"
                />
              </div>
            </div>
          </div>

          {/* Benefícios/Vantagens */}
          <div className="glass-effect rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Gift className="w-6 h-6 text-purple-400" />
              <div>
                <h2 className="text-xl font-semibold text-white">Benefícios e Vantagens</h2>
                <p className="text-white/60 text-sm">Selecione os benefícios que oferece aos clientes</p>
              </div>
            </div>

            {/* Opções predefinidas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BENEFIT_OPTIONS.map((benefit) => (
                <div key={benefit} className="flex items-center space-x-2">
                  <Checkbox
                    id={benefit}
                    checked={selectedBenefits.includes(benefit)}
                    onCheckedChange={() => toggleBenefit(benefit)}
                  />
                  <label
                    htmlFor={benefit}
                    className="text-sm text-white/80 cursor-pointer"
                  >
                    {benefit}
                  </label>
                </div>
              ))}
            </div>

            {/* Benefício personalizado */}
            <div className="pt-4 border-t border-white/10">
              <Label htmlFor="custom_benefit">Adicionar benefício personalizado</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="custom_benefit"
                  value={customBenefit}
                  onChange={(e) => setCustomBenefit(e.target.value)}
                  placeholder="Ex: 2 pelo preço de 1 às terças"
                  className="glass-effect border-white/10 flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomBenefit();
                    }
                  }}
                />
                <Button
                  onClick={addCustomBenefit}
                  disabled={!customBenefit.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Benefícios selecionados */}
            {selectedBenefits.length > 0 && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-white/60 mb-3">Benefícios selecionados:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedBenefits.map((benefit) => (
                    <div
                      key={benefit}
                      className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-white text-sm"
                    >
                      <span>{benefit}</span>
                      <button
                        onClick={() => removeBenefit(benefit)}
                        className="hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Contato */}
          <div className="glass-effect rounded-2xl p-6 border border-white/10 space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-purple-400" />
              Contato
            </h2>

            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Ex: (11) 98765-4321"
                className="glass-effect border-white/10"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="contato@restaurante.com"
                className="glass-effect border-white/10"
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://www.seurestaurante.com"
                className="glass-effect border-white/10"
              />
            </div>

            <div>
              <Label htmlFor="opening_hours">Horário de Funcionamento</Label>
              <Textarea
                id="opening_hours"
                value={formData.opening_hours}
                onChange={(e) => handleInputChange('opening_hours', e.target.value)}
                placeholder="Ex:&#10;Seg-Sex: 12h - 23h&#10;Sáb-Dom: 12h - 00h"
                rows={3}
                className="glass-effect border-white/10"
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="glass-effect rounded-2xl p-6 border border-white/10 space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-400" />
              Endereço
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="street">Rua</Label>
                <Input
                  id="street"
                  value={formData.address.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}
                  placeholder="Ex: Rua das Flores"
                  className="glass-effect border-white/10"
                />
              </div>

              <div>
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  value={formData.address.number}
                  onChange={(e) => handleAddressChange('number', e.target.value)}
                  placeholder="Ex: 123"
                  className="glass-effect border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  value={formData.address.complement}
                  onChange={(e) => handleAddressChange('complement', e.target.value)}
                  placeholder="Ex: Sala 10"
                  className="glass-effect border-white/10"
                />
              </div>

              <div>
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={formData.address.neighborhood}
                  onChange={(e) => handleAddressChange('neighborhood', e.target.value)}
                  placeholder="Ex: Centro"
                  className="glass-effect border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.address.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}
                  placeholder="Ex: São Paulo"
                  className="glass-effect border-white/10"
                />
              </div>

              <div>
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.address.state}
                  onChange={(e) => handleAddressChange('state', e.target.value)}
                  placeholder="Ex: SP"
                  maxLength={2}
                  className="glass-effect border-white/10"
                />
              </div>

              <div>
                <Label htmlFor="zip_code">CEP</Label>
                <Input
                  id="zip_code"
                  value={formData.address.zip_code}
                  onChange={(e) => handleAddressChange('zip_code', e.target.value)}
                  placeholder="Ex: 12345-678"
                  className="glass-effect border-white/10"
                />
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => navigate(partner ? `/restaurant/${partner.id}` : '/restaurants')}
              disabled={saving}
            >
              Cancelar
            </Button>

            <Button
              onClick={handleSave}
              disabled={saving || !formData.name}
              className="bg-purple-600 hover:bg-purple-700 min-w-[120px]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PartnerSettings;