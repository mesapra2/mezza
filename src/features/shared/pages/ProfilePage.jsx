// src/features/shared/pages/ProfilePage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Save, Loader, UploadCloud, LogOut, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/features/shared/components/ui/button.jsx';
import { Input } from '@/features/shared/components/ui/input.jsx';
import { Label } from '@/features/shared/components/ui/label.jsx';
import { Textarea } from '@/features/shared/components/ui/textarea.jsx';
import HashtagInterestSelector from '@/features/shared/components/profile/HashtagInterestSelector';
import { supabase } from '@/lib/supabaseClient'; 
<<<<<<< HEAD
import { useToast } from '@/features/shared/components/ui/use-toast';
import FavoriteRestaurantsList from '@/features/shared/components/restaurants/FavoriteRestaurantsList'; 
=======
import { useToast } from '@/features/shared/components/ui/use-toast'; 
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925

const customStyles = {
  avatar: 'w-32 h-32 rounded-full object-cover',
};

const ProfilePage = () => {
  const { user, profile: initialProfile, getProfile, updateProfile, uploadAvatar, createProfileIfNotExists, logout } = useAuth();
  const { toast } = useToast(); 
  
  // const [loading, setLoading] = useState(false); // --- VARIÁVEL REMOVIDA ---
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null); 
  const [avatarPath, setAvatarPath] = useState(null); 
  const [photos, setPhotos] = useState([]);
  const [hashtagsInteresse, setHashtagsInteresse] = useState([]);
  const [isPremium, setIsPremium] = useState(false);
  const fileInputRef = useRef(null);
  const photosInputRef = useRef(null);

  // --- CORREÇÃO NO USEEFFECT ---
  useEffect(() => {
    console.log("⚙️ Carregando dados do perfil no ProfilePage...");
    if (initialProfile) {
      console.log('ProfileData completa (do contexto):', initialProfile);
      setUsername(initialProfile.username || '');
      setBio(initialProfile.bio || '');
      setAvatarPath(initialProfile.avatar_url || null); 
      const photosArray = initialProfile.photos || [];
      setPhotos(Array.isArray(photosArray) ? photosArray : []);
      const hashtags = initialProfile.hashtags_interesse || [];
      setHashtagsInteresse(Array.isArray(hashtags) ? hashtags : []);
      setIsPremium(initialProfile.is_premium || false);
    } else if (user) {
      // Fallback: Se o profile não veio do context, tenta buscar
      console.warn("Profile não estava no contexto, buscando manualmente...");
      const fetchProfile = async () => {
         try {
            let profileData = await getProfile(user); 
            if (!profileData) {
              profileData = await createProfileIfNotExists(user);
            }
            console.log('ProfileData completa (buscado manualmente):', profileData);
            if(profileData) {
                setUsername(profileData.username || '');
                setBio(profileData.bio || '');
                setAvatarPath(profileData.avatar_url || null);
                setPhotos(Array.isArray(profileData.photos) ? profileData.photos : []);
                setHashtagsInteresse(Array.isArray(profileData.hashtags_interesse) ? profileData.hashtags_interesse : []);
                setIsPremium(profileData.is_premium || false);
            }
         } catch (err) {
             console.error('Erro ao carregar perfil (fallback):', err);
             setError('Falha ao carregar perfil. Tente novamente.');
         }
      };
      fetchProfile();
    }
  // Desabilitamos a regra para este useEffect também, pois getProfile e createProfile...
  // são estáveis (vêm do useMemo/useCallback do Context)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, initialProfile]); 

   useEffect(() => {
    if (avatarPath) {
      if (!avatarPath.startsWith('http')) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(avatarPath);
        setAvatarUrl(`${data.publicUrl}?t=${new Date().getTime()}`);
      } else {
        setAvatarUrl(avatarPath);
      }
    } else {
       setAvatarUrl(null);
    }
   }, [avatarPath]);

  const getAvatarFallbackUrl = useCallback(() => {
     return `https://ui-avatars.com/api/?name=${encodeURIComponent(
       username || user?.email || 'U'
     )}&background=8b5cf6&color=fff&size=128`;
  }, [username, user?.email]);

  const handleUpdateProfile = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateProfile({ 
        username, 
        bio, 
        photos, 
        hashtags_interesse: hashtagsInteresse,
        avatar_url: avatarPath 
      });
      setSuccess('Perfil atualizado com sucesso!');
      toast({ title: "Sucesso!", description: "Perfil atualizado com sucesso!" });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Falha ao salvar alterações. Verifique os dados.');
      toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar alterações." });
    }
    setSaving(false);
  };

  const handleAvatarClick = () => {
    if (!uploading) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || uploading) return;

    setUploading(true);
    setError(null);
    try {
      const newAvatarPath = await uploadAvatar(file, false);
      if (newAvatarPath) {
        setAvatarPath(newAvatarPath); 
        setSuccess('Foto de perfil atualizada! Clique em "Salvar" para confirmar.');
        toast({ title: "Foto Pronta!", description: 'Clique em "Guardar Alterações" para salvar.' });
        setTimeout(() => setSuccess(null), 3000);
      } else {
         throw new Error("Upload falhou ou não retornou path.");
      }
    } catch (err) {
      setError('Falha ao enviar foto. Tente novamente.');
      toast({ variant: "destructive", title: "Erro no Upload", description: "Falha ao enviar foto." });
    }
    setUploading(false);
  };

  const getPublicPhotoUrl = (path) => {
      if (!path) return null;
      if (path.startsWith('http')) return path;
      const { data } = supabase.storage.from('photos').getPublicUrl(path);
      return data.publicUrl;
  };

  const handlePhotosUpload = async (event) => {
    const filesToUpload = Array.from(event.target.files);
    const availableSlots = 3 - photos.length;
    if (availableSlots <= 0) {
        toast({ variant: "destructive", title: "Limite atingido", description: "Você já tem 3 fotos." });
        return;
    }

    const files = filesToUpload.slice(0, availableSlots);
    if (files.length === 0 || uploading) return;

    setUploading(true);
    setError(null);
    try {
      const uploadPromises = files.map(async (file) => await uploadAvatar(file, true));
      const newPhotoPaths = (await Promise.all(uploadPromises)).filter(Boolean); 
      
      const updatedPhotos = [...photos, ...newPhotoPaths];
      setPhotos(updatedPhotos); 
      
      console.log('Fotos adicionadas (paths):', updatedPhotos);
      setSuccess('Fotos adicionadas! Clique em "Salvar" para confirmar.');
      toast({ title: "Fotos Prontas!", description: `Adicionadas ${newPhotoPaths.length} foto(s). Clique em "Guardar Alterações" para salvar.` });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Erro ao enviar fotos:', err);
      setError('Falha ao enviar fotos. Tente novamente.');
      toast({ variant: "destructive", title: "Erro no Upload", description: "Falha ao enviar fotos." });
    }
    setUploading(false);
  };

  const handleDeletePhoto = async (index) => {
    const photoToDelete = photos[index];
    if (!photoToDelete) return;

    try {
      const updatedPhotos = photos.filter((_, i) => i !== index);
      setPhotos(updatedPhotos);
      console.log('Foto removida localmente. Array atualizado:', updatedPhotos);

      if (!photoToDelete.startsWith('http')) { 
         const { error: deleteError } = await supabase.storage.from('photos').remove([photoToDelete]);
         if(deleteError) {
            console.warn("Não foi possível deletar a foto do storage (pode já ter sido removida):", deleteError.message);
         } else {
             console.log("Foto deletada do storage:", photoToDelete);
         }
      }
      
      setSuccess('Foto removida! Clique em "Salvar" para confirmar.');
      toast({ title: "Foto Removida!", description: 'Clique em "Guardar Alterações" para salvar a mudança.' });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Erro ao remover foto:', err);
      setError('Falha ao remover foto. Tente novamente.');
    }
  };

  // Se o contexto ainda estiver carregando, mostramos um spinner
  if (useAuth().loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // O resto do JSX permanece idêntico...
  return (
    <>
      <Helmet>
        <title>Meu Perfil - Mesapra2</title>
      </Helmet>

      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto space-y-6"
        >
          <h1 className="text-3xl font-bold text-white">Editar Perfil</h1>

          {/* Informações Básicas */}
          <div className="glass-effect rounded-2xl p-8 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-6">Informações Básicas</h2>
            
            <div className="flex flex-col items-center space-y-4 mb-8">
              <div className="relative group">
                <img
                  key={avatarUrl}
                  src={avatarUrl || getAvatarFallbackUrl()}
                  alt="Avatar"
                  className={customStyles.avatar}
                  onError={(e) => { e.target.src = getAvatarFallbackUrl() }}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  className="hidden"
                  accept="image/png, image/jpeg"
                  disabled={uploading}
                />
                <button
                  onClick={handleAvatarClick}
                  disabled={uploading}
                  className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  aria-label="Alterar foto de perfil"
                >
                  {uploading ? (
                    <Loader className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <UploadCloud className="w-8 h-8 text-white" />
                  )}
                </button>
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-white">{username || 'Novo Utilizador'}</p>
                <p className="text-sm text-white/60">{user?.email}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white/80">Nome de Utilizador</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-4 glass-effect border-white/10 text-white"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-white/80">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Conte um pouco sobre si..."
                  className="pl-4 glass-effect border-white/10 min-h-[100px] text-white"
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/80">Fotos Adicionais (máximo 3)</Label>
                <div className="flex gap-3 mb-4 flex-wrap">
                  {photos && photos.length > 0 ? (
                    photos.map((photoPath, index) => {
                      const photoUrl = getPublicPhotoUrl(photoPath);
                      return (
                        <div key={index} className="relative">
                          {photoUrl && (
                            <>
                              <img
                                src={photoUrl}
                                alt={`Foto ${index + 1}`}
                                className="w-24 h-24 object-cover rounded-lg border-2 border-white/20"
                                onError={(e) => { 
                                  console.error('Erro ao carregar foto:', photoUrl);
                                  e.target.style.display = 'none'; 
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(index)}
                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 rounded-full p-1.5 shadow-lg transition-all hover:scale-110"
                                aria-label="Deletar foto"
                                title="Deletar foto"
                              >
                                <X className="w-3 h-3 text-white" />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-white/50 text-sm">Nenhuma foto adicional ainda</p>
                  )}
                </div>
                {photos.length < 3 && photos.length > 0 && (
                  <p className="text-white/60 text-xs mb-2">Você pode adicionar mais {3 - photos.length} foto(s)</p>
                )}
                <input
                  type="file"
                  ref={photosInputRef}
                  onChange={handlePhotosUpload}
                  className="hidden"
                  accept="image/png, image/jpeg"
                  multiple
                  disabled={uploading}
                />
                <Button
                  type="button"
                  onClick={() => photosInputRef.current.click()}
                  disabled={uploading || photos.length >= 3}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-12 text-base font-semibold"
                >
                  {uploading ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Adicionar Fotos
                    </>
                  )}
                </Button>
              </div>

              {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
              {success && <p className="text-green-500 text-sm mt-4 text-center">{success}</p>}

              <Button type="submit" disabled={saving || uploading} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-12 text-base font-semibold">
                {saving ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    A Guardar...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Alterações
                  </>
                )}
              </Button>

              <Button
                type="button"
                onClick={async () => { await logout(); }}
                className="w-full bg-red-500 hover:bg-red-600 h-12 text-base font-semibold flex items-center justify-center"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Deslogar
              </Button>
            </form>
          </div>

          {/* Seção de Hashtags de Interesse */}
          <div className="glass-effect rounded-2xl p-8 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-6">Interesses e Notificações</h2>
            
            <HashtagInterestSelector
              selectedHashtags={hashtagsInteresse}
              onChange={setHashtagsInteresse}
              isPremium={isPremium}
            />

            <Button 
              onClick={handleUpdateProfile} 
              disabled={saving || uploading}
              className="w-full mt-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-12 text-base font-semibold"
            >
              {saving ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Preferências
                </>
              )}
            </Button>
          </div>
<<<<<<< HEAD

          {/* Seção de Restaurantes Favoritos */}
          <div className="glass-effect rounded-2xl p-8 border border-white/10">
            <FavoriteRestaurantsList
              showTitle={true}
              maxItems={5}
              onRestaurantClick={(restaurant) => {
                window.open(`https://maps.google.com/maps/place/?q=place_id:${restaurant.restaurant_place_id}`, '_blank');
              }}
            />
          </div>
=======
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
        </motion.div>
      </div>
    </>
  );
};

export default ProfilePage;