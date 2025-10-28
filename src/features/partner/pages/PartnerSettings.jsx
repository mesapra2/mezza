// src/features/partner/pages/PartnerSettings.jsx
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  User, 
  Store, 
  Save, 
  Trash2, 
  Upload,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Label } from '@/features/shared/components/ui/label';
import { Textarea } from '@/features/shared/components/ui/textarea';
import { useToast } from '@/features/shared/components/ui/use-toast';

const PartnerSettings = () => {
  const { user: _user, profile, updateProfile, uploadAvatar } = useAuth(); // _user disponível para validações futuras
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [partnerData, setPartnerData] = useState(null);

  // Buscar dados do partner
  useEffect(() => {
    const fetchPartnerData = async () => {
      if (!profile?.partner_id) return;

      try {
        const { data, error } = await supabase
          .from('partners')
          .select('*')
          .eq('id', profile.partner_id)
          .single();

        if (error) throw error;
        setPartnerData(data);
      } catch (error) {
        console.error('Erro ao buscar dados do partner:', error);
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível carregar os dados do restaurante'
        });
      }
    };

    fetchPartnerData();
  }, [profile, toast]);

  // Upload de avatar pessoal
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem'
      });
      return;
    }

    // Validar tamanho (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 2MB'
      });
      return;
    }

    setUploadingAvatar(true);

    try {
      const avatarPath = await uploadAvatar(file, false);
      
      if (!avatarPath) {
        throw new Error('Falha no upload');
      }

      // Construir URL pública
      const { data: publicData } = supabase.storage
        .from('avatars')
        .getPublicUrl(avatarPath);

      // Atualizar perfil
      await updateProfile({ avatar_url: publicData.publicUrl });

      toast({
        title: 'Foto atualizada!',
        description: 'Sua foto de perfil foi atualizada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        variant: 'destructive',
        title: 'Erro no upload',
        description: error.message
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Selecionar foto do restaurante como avatar
  const handleSelectRestaurantPhoto = async (photoUrl) => {
    setLoading(true);
    try {
      await updateProfile({ avatar_url: photoUrl });
      toast({
        title: 'Foto atualizada!',
        description: 'Foto do restaurante definida como seu avatar'
      });
    } catch (error) {
      console.error('Erro:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar a foto'
      });
    } finally {
      setLoading(false);
    }
  };

  // Upload de fotos do restaurante
  const handleRestaurantPhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentPhotos = partnerData?.photos || [];
    const totalPhotos = currentPhotos.length + files.length;

    if (totalPhotos > 6) {
      toast({
        variant: 'destructive',
        title: 'Limite excedido',
        description: `Você pode ter no máximo 6 fotos. Você já tem ${currentPhotos.length}`
      });
      return;
    }

    setUploadingPhoto(true);

    try {
      const uploadPromises = files.map(async (file) => {
        // Validar arquivo
        if (!file.type.startsWith('image/')) return null;
        if (file.size > 2 * 1024 * 1024) return null;

        const path = await uploadAvatar(file, true);
        if (!path) return null;

        const { data: publicData } = supabase.storage
          .from('photos')
          .getPublicUrl(path);

        return publicData.publicUrl;
      });

      const uploadedUrls = (await Promise.all(uploadPromises)).filter(Boolean);

      if (uploadedUrls.length === 0) {
        throw new Error('Nenhuma foto foi enviada');
      }

      // Atualizar fotos no banco
      const updatedPhotos = [...currentPhotos, ...uploadedUrls];

      const { error } = await supabase
        .from('partners')
        .update({ photos: updatedPhotos })
        .eq('id', profile.partner_id);

      if (error) throw error;

      setPartnerData({ ...partnerData, photos: updatedPhotos });

      toast({
        title: 'Fotos adicionadas!',
        description: `${uploadedUrls.length} foto(s) adicionada(s) com sucesso`
      });
    } catch (error) {
      console.error('Erro ao enviar fotos:', error);
      toast({
        variant: 'destructive',
        title: 'Erro no upload',
        description: error.message
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Remover foto do restaurante
  const handleRemoveRestaurantPhoto = async (photoUrl) => {
    if (!confirm('Deseja realmente remover esta foto?')) return;

    setLoading(true);

    try {
      const updatedPhotos = (partnerData?.photos || []).filter(p => p !== photoUrl);

      const { error } = await supabase
        .from('partners')
        .update({ photos: updatedPhotos })
        .eq('id', profile.partner_id);

      if (error) throw error;

      setPartnerData({ ...partnerData, photos: updatedPhotos });

      toast({
        title: 'Foto removida',
        description: 'A foto foi removida com sucesso'
      });
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível remover a foto'
      });
    } finally {
      setLoading(false);
    }
  };

  // Salvar alterações do restaurante
  const handleSaveRestaurantData = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('partners')
        .update({
          name: partnerData.name,
          description: partnerData.description,
          phone: partnerData.phone,
          website: partnerData.website,
          cuisine_type: partnerData.cuisine_type,
          price_range: partnerData.price_range,
          capacity: partnerData.capacity
        })
        .eq('id', profile.partner_id);

      if (error) throw error;

      toast({
        title: 'Dados salvos!',
        description: 'As informações do restaurante foram atualizadas'
      });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar as alterações'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!partnerData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-t-2 border-b-2 rounded-full border-primary animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Configurações do Restaurante - Mesapra2</title>
      </Helmet>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold gradient-text">
            Configurações do Restaurante
          </h1>
          <p className="text-white/60 mt-2">
            Gerencie as informações do seu estabelecimento
          </p>
        </div>

        {/* Status de Verificação */}
        {!partnerData.is_verified && (
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-200">
                <p className="font-semibold mb-1">Aguardando Aprovação</p>
                <p className="text-yellow-200/80">
                  Seu restaurante está em análise pela nossa equipe. Você já pode 
                  configurar tudo, mas o estabelecimento só aparecerá na lista pública após aprovação.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Seção: Foto de Perfil Pessoal */}
        <div className="glass-effect rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-purple-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">Foto de Perfil Pessoal</h2>
              <p className="text-sm text-white/60">
                Esta foto aparece quando você cria eventos
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar Atual */}
            <div className="flex-shrink-0">
              <div className="relative w-32 h-32 rounded-full overflow-hidden bg-white/5 border-2 border-white/10">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-12 h-12 text-white/40" />
                  </div>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="w-8 h-8 border-t-2 border-white rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Opções */}
            <div className="flex-1 space-y-4">
              {/* Upload nova foto */}
              <div>
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition-colors">
                    <Upload className="w-4 h-4" />
                    Fazer upload de nova foto
                  </div>
                </Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
                <p className="text-xs text-white/40 mt-2">
                  Recomendado: Imagem quadrada, máx. 2MB
                </p>
              </div>

              {/* Ou usar foto do restaurante */}
              {partnerData.photos && partnerData.photos.length > 0 && (
                <div>
                  <p className="text-sm text-white/60 mb-3">
                    Ou escolha uma das fotos do restaurante:
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {partnerData.photos.slice(0, 4).map((photo, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectRestaurantPhoto(photo)}
                        disabled={loading}
                        className="w-16 h-16 rounded-lg overflow-hidden border-2 border-white/10 hover:border-purple-500/50 transition-colors"
                      >
                        <img
                          src={photo}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Seção: Fotos do Restaurante */}
        <div className="glass-effect rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Store className="w-6 h-6 text-purple-400" />
              <div>
                <h2 className="text-xl font-semibold text-white">Fotos do Restaurante</h2>
                <p className="text-sm text-white/60">
                  Adicione até 6 fotos (máx. 2MB cada - redimensionamento automático)
                </p>
              </div>
            </div>
            <span className="text-sm text-white/40">
              {partnerData.photos?.length || 0}/6
            </span>
          </div>

          {/* Grid de Fotos */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Fotos existentes */}
            {partnerData.photos?.map((photo, index) => (
              <div
                key={index}
                className="relative aspect-video rounded-lg overflow-hidden bg-white/5 border border-white/10 group"
              >
                <img
                  src={photo}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {index === 0 && (
                  <div className="absolute top-2 left-2 px-2 py-1 rounded bg-purple-500 text-white text-xs font-semibold">
                    Principal
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveRestaurantPhoto(photo)}
                  disabled={loading}
                  className="absolute top-2 right-2 p-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* Botão adicionar nova */}
            {(!partnerData.photos || partnerData.photos.length < 6) && (
              <Label
                htmlFor="restaurant-photos"
                className="aspect-video rounded-lg border-2 border-dashed border-white/20 hover:border-purple-500/50 flex flex-col items-center justify-center cursor-pointer transition-colors"
              >
                {uploadingPhoto ? (
                  <div className="w-8 h-8 border-t-2 border-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ImageIcon className="w-8 h-8 text-white/40 mb-2" />
                    <span className="text-sm text-white/60">Adicionar foto</span>
                  </>
                )}
              </Label>
            )}
            <Input
              id="restaurant-photos"
              type="file"
              accept="image/*"
              multiple
              onChange={handleRestaurantPhotoUpload}
              className="hidden"
              disabled={uploadingPhoto}
            />
          </div>
        </div>

        {/* Seção: Informações Básicas */}
        <form onSubmit={handleSaveRestaurantData} className="glass-effect rounded-2xl p-6 border border-white/10 space-y-6">
          <h2 className="text-xl font-semibold text-white mb-4">Informações Básicas</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Restaurante *</Label>
              <Input
                id="name"
                value={partnerData.name || ''}
                onChange={(e) => setPartnerData({ ...partnerData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                type="tel"
                value={partnerData.phone || ''}
                onChange={(e) => setPartnerData({ ...partnerData, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={partnerData.website || ''}
                onChange={(e) => setPartnerData({ ...partnerData, website: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cuisine_type">Tipo de Cozinha</Label>
              <Input
                id="cuisine_type"
                value={partnerData.cuisine_type || ''}
                onChange={(e) => setPartnerData({ ...partnerData, cuisine_type: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_range">Faixa de Preço</Label>
              <select
                id="price_range"
                value={partnerData.price_range || ''}
                onChange={(e) => setPartnerData({ ...partnerData, price_range: e.target.value })}
                className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white"
              >
                <option value="">Selecione</option>
                <option value="$">$ - Econômico</option>
                <option value="$$">$$ - Moderado</option>
                <option value="$$$">$$$ - Caro</option>
                <option value="$$$$">$$$$ - Premium</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacidade</Label>
              <Input
                id="capacity"
                type="number"
                value={partnerData.capacity || ''}
                onChange={(e) => setPartnerData({ ...partnerData, capacity: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={partnerData.description || ''}
              onChange={(e) => setPartnerData({ ...partnerData, description: e.target.value })}
              rows={5}
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full md:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </form>

        {/* Informações do CNPJ (somente leitura) */}
        <div className="glass-effect rounded-2xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-4">Informações Fiscais</h2>
          <div className="flex items-center gap-3 text-white/60">
            <CheckCircle className="w-5 h-5" />
            <div>
              <p className="text-sm">CNPJ cadastrado</p>
              <p className="font-mono text-lg text-white">{partnerData.cnpj}</p>
            </div>
          </div>
          <p className="text-xs text-white/40 mt-4">
            O CNPJ não pode ser alterado. Entre em contato com o suporte se necessário.
          </p>
        </div>
      </div>
    </>
  );
};

export default PartnerSettings;