// src/features/shared/pages/ProfilePage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Save, Loader, UploadCloud, LogOut, X, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/features/shared/components/ui/button.jsx';
import { Input } from '@/features/shared/components/ui/input.jsx';
import { Label } from '@/features/shared/components/ui/label.jsx';
import { Textarea } from '@/features/shared/components/ui/textarea.jsx';
import HashtagInterestSelector from '@/features/shared/components/profile/HashtagInterestSelector';
import { supabase } from '@/lib/supabaseClient'; 
import { useToast } from '@/features/shared/components/ui/use-toast';
import FavoriteRestaurantsList from '@/features/shared/components/restaurants/FavoriteRestaurantsList';
import InstagramIntegration from '@/features/shared/components/profile/InstagramIntegration';
import { autoFixStoragePermissions, diagnoseStorageIssue } from '@/utils/storagePermissionsFix';
import { useNavigate } from 'react-router-dom'; 

const customStyles = {
  avatar: 'w-32 h-32 rounded-full object-cover',
};

const ProfilePage = () => {
  const { user, profile: initialProfile, getProfile, updateProfile, uploadAvatar, createProfileIfNotExists, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate(); 
  
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
  const [photoUrls, setPhotoUrls] = useState({}); // Cache de URLs das fotos
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
      console.log('📸 Fotos do perfil carregadas:', photosArray);
      console.log('📊 Tipo e estrutura das fotos:', typeof photosArray, photosArray);
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

   // Carregar URLs das fotos e limpar referências quebradas
   useEffect(() => {
     if (!photos || photos.length === 0) {
       setPhotoUrls({});
       return;
     }

     console.log('🔄 Carregando URLs para fotos:', photos);
     const urls = {};
     const brokenPhotos = [];
     
     for (let i = 0; i < photos.length; i++) {
       const photoPath = photos[i];
       if (photoPath) {
         try {
           const url = getPublicPhotoUrl(photoPath);
           
           // Verificar se a URL é válida testando se a imagem carrega
           const img = new Image();
           img.onload = () => {
             urls[photoPath] = url;
             console.log(`✅ URL válida para foto ${i + 1}:`, url);
           };
           
           img.onerror = () => {
             console.warn(`❌ Foto quebrada detectada: ${photoPath}`);
             brokenPhotos.push(photoPath);
           };
           
           img.src = url;
           
           // Adicionar URL provisoriamente (será removida se der erro)
           urls[photoPath] = url;
           
         } catch (error) {
           console.error(`❌ Erro ao carregar URL da foto ${i + 1}:`, error);
           brokenPhotos.push(photoPath);
         }
       }
     }
     
     setPhotoUrls(urls);
     console.log('🎯 Cache de URLs atualizado:', urls);
     
     // Agrupar detecção de fotos quebradas e limpar quando todas forem testadas
     let detectedBroken = 0;
     let totalToTest = photos.length;
     
     const processBrokenPhotos = async () => {
       detectedBroken++;
       
       // Aguardar até que todas as fotos sejam testadas
       if (detectedBroken === totalToTest && brokenPhotos.length > 0) {
         console.log('🧹 Todas as fotos testadas. Limpando fotos quebradas:', brokenPhotos);
         const validPhotos = photos.filter(photo => !brokenPhotos.includes(photo));
         
         if (validPhotos.length !== photos.length) {
           setPhotos(validPhotos);
           
           // Atualizar cache para remover URLs quebradas
           const cleanUrls = {};
           validPhotos.forEach(photo => {
             if (urls[photo]) {
               cleanUrls[photo] = urls[photo];
             }
           });
           setPhotoUrls(cleanUrls);
           
           // Salvar automaticamente no banco de dados
           try {
             await updateProfile({ 
               photos: validPhotos,
               username, 
               bio, 
               hashtags_interesse: hashtagsInteresse,
               avatar_url: avatarPath 
             });
             
             toast({
               title: "✅ Perfil corrigido",
               description: `${brokenPhotos.length} foto(s) quebrada(s) removidas automaticamente.`,
               variant: "default"
             });
             console.log('✅ Fotos quebradas removidas e salvas no banco');
             
           } catch (error) {
             console.error('❌ Erro ao salvar remoção de fotos quebradas:', error);
             toast({
               title: "⚠️ Ação necessária",
               description: `${brokenPhotos.length} foto(s) removidas. Clique em "Guardar Alterações".`,
               variant: "destructive"
             });
           }
         }
       }
     };
     
     // Modificar as funções de callback para usar o novo sistema
     for (let i = 0; i < photos.length; i++) {
       const photoPath = photos[i];
       if (photoPath) {
         const img = new Image();
         
         img.onload = () => {
           console.log(`✅ Foto válida: ${photoPath}`);
           processBrokenPhotos();
         };
         
         img.onerror = () => {
           console.log(`❌ Foto quebrada: ${photoPath}`);
           console.log(`🔗 URL testada: ${img.src}`);
           console.log(`📁 Bucket esperado: avatars`);
           
           // Testar URL alternativa (sem timestamp)
           const urlSemTimestamp = img.src.split('?')[0];
           console.log(`🔄 Testando URL sem timestamp: ${urlSemTimestamp}`);
           
           // Verificar se arquivo existe no storage
           supabase.storage
             .from('avatars')
             .download(photoPath)
             .then(({ data, error }) => {
               if (error) {
                 console.error(`💥 Arquivo NÃO existe no storage: ${error.message}`);
                 console.log(`📋 Possíveis causas:
                   1. Arquivo não foi enviado corretamente
                   2. Políticas RLS muito restritivas 
                   3. Bucket 'avatars' não existe ou não é público
                   4. Caminho incorreto: ${photoPath}`);
               } else {
                 console.log(`✅ Arquivo EXISTE no storage, problema de permissão de acesso público`);
                 console.log(`🛠️ Execute os SQLs do arquivo SUPABASE_STORAGE_FIX.md`);
               }
             });
           
           if (!brokenPhotos.includes(photoPath)) {
             brokenPhotos.push(photoPath);
           }
           processBrokenPhotos();
         };
         
         img.src = urls[photoPath];
       }
     }
   }, [photos, toast, updateProfile, username, bio, hashtagsInteresse, avatarPath]);

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

  // Função para visualizar perfil público
  const viewPublicProfile = () => {
    if (user?.id) {
      // Navega para a página de visualização pública do próprio perfil
      navigate(`/user/${user.id}`);
    }
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
    
    console.log('🔍 Gerando URL para foto:', path);
    
    // Verificar se é formato antigo (userId-photo-timestamp.ext)
    const isOldFormat = path.includes('-photo-') && !path.includes('/');
    
    if (isOldFormat) {
      console.log('📄 Formato antigo detectado, tentando bucket photos:', path);
      // Para fotos antigas, tentar bucket 'photos' primeiro
      const { data } = supabase.storage.from('photos').getPublicUrl(path);
      const finalUrl = `${data.publicUrl}?t=${new Date().getTime()}`;
      console.log('✅ URL gerada (formato antigo):', finalUrl);
      return finalUrl;
    }
    
    // Formato novo (userId/profile-photos/timestamp.ext) - bucket avatars
    console.log('📄 Formato novo detectado, usando bucket avatars:', path);
    try {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      let finalUrl = data.publicUrl;
      
      // ✅ CORREÇÃO: Adicionar cache busting apenas se a URL for válida
      if (finalUrl && !finalUrl.includes('?')) {
        finalUrl = `${finalUrl}?t=${new Date().getTime()}`;
      }
      
      console.log('✅ URL gerada (formato novo):', finalUrl);
      
      // ✅ CORREÇÃO: Verificar se URL do Supabase está correta
      const expectedPattern = /https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/avatars\//;
      if (!expectedPattern.test(finalUrl)) {
        console.warn('⚠️ URL não segue padrão esperado do Supabase:', finalUrl);
        console.log('🔗 Padrão esperado: https://PROJECT.supabase.co/storage/v1/object/public/avatars/...');
        
        // Tentar reconstruir URL manualmente
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ksmnfhenhppasfcikefd.supabase.co';
        const reconstructedUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${path}?t=${new Date().getTime()}`;
        console.log('🔧 URL reconstruída:', reconstructedUrl);
        return reconstructedUrl;
      }
      
      return finalUrl;
    } catch (error) {
      console.error('❌ Erro ao gerar URL pública:', error);
      return null;
    }
  };

  // Função para redimensionar imagem para <= 1MB
  const resizeImage = async (file, targetSizeKB = 1024) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // Calcular dimensões mantendo proporção
          let { width, height } = img;
          const maxDimension = 1200; // Máximo 1200px na maior dimensão

          if (width > height && width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }

          canvas.width = width;
          canvas.height = height;

          // ✅ CORREÇÃO: Configurar contexto para melhor qualidade
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // ✅ CORREÇÃO: Limpar canvas antes de desenhar
          ctx.clearRect(0, 0, width, height);
          
          // Desenhar imagem redimensionada
          ctx.drawImage(img, 0, 0, width, height);

          // Função para tentar diferentes qualidades
          const tryCompress = (quality) => {
            canvas.toBlob((blob) => {
              if (!blob) {
                console.error('❌ Falha ao gerar blob da imagem');
                reject(new Error('Falha na compressão da imagem'));
                return;
              }

              const sizeKB = blob.size / 1024;
              console.log(`🔧 Tentativa com qualidade ${quality}: ${sizeKB.toFixed(1)}KB`);

              if (sizeKB <= targetSizeKB || quality <= 0.1) {
                console.log(`✅ Imagem otimizada: ${sizeKB.toFixed(1)}KB (${((blob.size / file.size) * 100).toFixed(1)}% do original)`);
                
                // ✅ CORREÇÃO: Manter nome original mas com extensão jpeg
                const originalName = file.name.split('.')[0];
                const newFile = new File([blob], `${originalName}.jpeg`, { 
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                
                resolve(newFile);
              } else {
                // Tentar com qualidade menor
                tryCompress(Math.max(0.1, quality - 0.1));
              }
            }, 'image/jpeg', quality);
          };

          // Iniciar com qualidade 0.9 (melhor qualidade inicial)
          tryCompress(0.9);
          
        } catch (error) {
          console.error('❌ Erro no processamento da imagem:', error);
          reject(error);
        }
      };

      img.onerror = (error) => {
        console.error('❌ Erro ao carregar imagem para processamento:', error);
        reject(new Error('Falha ao carregar imagem'));
      };

      // ✅ CORREÇÃO: Adicionar crossOrigin se necessário
      img.crossOrigin = 'anonymous';
      img.src = URL.createObjectURL(file);
      
      // ✅ CORREÇÃO: Limpar URL object após uso para evitar vazamentos de memória
      setTimeout(() => {
        URL.revokeObjectURL(img.src);
      }, 5000);
    });
  };

  // Função dedicada para upload de fotos do perfil
  const uploadProfilePhoto = async (file) => {
    if (!file || !user?.id) {
      throw new Error('Arquivo ou usuário inválido');
    }

    // Validar tipo
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Tipo de arquivo inválido. Use PNG ou JPEG.');
    }

    console.log(`📷 Processando imagem: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);

    // ✅ CORREÇÃO: Redimensionar se maior que 1MB para evitar problemas
    let processedFile = file;
    if (file.size > 1 * 1024 * 1024) { // 1MB
      console.log('🔄 Imagem > 1MB, redimensionando e otimizando...');
      try {
        processedFile = await resizeImage(file, 800); // Target: 800KB (mais conservador)
        console.log(`✅ Imagem processada: ${(processedFile.size / 1024).toFixed(1)}KB`);
      } catch (error) {
        console.error('❌ Erro no redimensionamento, usando arquivo original:', error);
        // Se falhar o redimensionamento, usar arquivo original
        processedFile = file;
      }
    } else {
      console.log('✅ Imagem já está no tamanho adequado');
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const fileName = `${user.id}/profile-photos/${timestamp}.jpeg`; // Sempre JPEG após processamento

    console.log('📤 Enviando foto otimizada para:', fileName);

    // Upload para Supabase Storage com retry
    let uploadResult = null;
    let lastError = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Tentativa de upload ${attempt}/${maxRetries}`);
        
        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(fileName, processedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          throw error;
        }

        uploadResult = data;
        console.log('✅ Foto enviada com sucesso:', data.path);
        break;

      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Tentativa ${attempt} falhou:`, error.message);
        
        if (attempt < maxRetries) {
          const delay = attempt * 1000; // 1s, 2s, 3s
          console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (!uploadResult) {
      console.error('❌ Upload falhou após todas as tentativas:', lastError);
      throw new Error(`Falha no upload: ${lastError?.message || 'Erro desconhecido'}`);
    }

    // ✅ NOVO: Verificar e corrigir permissões automaticamente após upload bem-sucedido
    const photoPath = uploadResult.path;
    console.log('🔧 Verificando permissões para foto recém-enviada:', photoPath);
    
    try {
      const permissionsFixed = await autoFixStoragePermissions(photoPath);
      if (!permissionsFixed) {
        console.warn('⚠️ Permissões podem precisar de correção manual');
      }
    } catch (error) {
      console.warn('⚠️ Erro ao verificar permissões (não crítico):', error);
    }

    return photoPath;
  };

  /**
   * ✅ FUNÇÃO PARA IMPORTAR FOTO DO INSTAGRAM
   */
  const handleInstagramPhotoImport = async (photoPath) => {
    try {
      const updatedPhotos = [...photos, photoPath];
      setPhotos(updatedPhotos);
      
      // Atualizar cache de URLs para a nova foto
      const newUrls = { ...photoUrls };
      const url = getPublicPhotoUrl(photoPath);
      if (url) {
        newUrls[photoPath] = url;
        setPhotoUrls(newUrls);
      }
      
      setSuccess('Foto do Instagram importada! Clique em "Guardar Alterações" para salvar.');
      toast({ 
        title: "📸 Foto Importada!", 
        description: 'Foto do Instagram adicionada com sucesso!' 
      });
      
      console.log('✅ Foto do Instagram importada:', photoPath);
    } catch (error) {
      console.error('❌ Erro ao processar foto do Instagram:', error);
      toast({ 
        variant: "destructive", 
        title: "Erro", 
        description: "Falha ao processar foto do Instagram." 
      });
    }
  };

  const handlePhotosUpload = async (event) => {
    const filesToUpload = Array.from(event.target.files);
    const availableSlots = 3 - photos.length;
    
    console.log('📸 Iniciando upload de fotos:', {
      filesSelected: filesToUpload.length,
      availableSlots,
      currentPhotos: photos.length
    });

    if (availableSlots <= 0) {
        toast({ variant: "destructive", title: "Limite atingido", description: "Você já tem 3 fotos." });
        return;
    }

    const files = filesToUpload.slice(0, availableSlots);
    if (files.length === 0 || uploading) return;

    setUploading(true);
    setError(null);
    
    try {
      console.log(`🔄 Processando ${files.length} arquivo(s)...`);
      
      const uploadPromises = files.map(async (file, index) => {
        console.log(`📤 Enviando arquivo ${index + 1}: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
        return await uploadProfilePhoto(file);
      });
      
      const newPhotoPaths = await Promise.all(uploadPromises);
      const validPaths = newPhotoPaths.filter(Boolean);
      
      const updatedPhotos = [...photos, ...validPaths];
      setPhotos(updatedPhotos);
      
      // Atualizar cache de URLs para as novas fotos
      const newUrls = { ...photoUrls };
      for (const path of validPaths) {
        try {
          const url = getPublicPhotoUrl(path);
          if (url) {
            newUrls[path] = url;
          }
        } catch (error) {
          console.error('❌ Erro ao gerar URL para nova foto:', error);
        }
      }
      setPhotoUrls(newUrls);
      
      console.log('✅ Fotos adicionadas com sucesso:', {
        newPaths: validPaths,
        totalPhotos: updatedPhotos.length
      });

      setSuccess(`Fotos adicionadas! Clique em "Guardar Alterações" para salvar.`);
      toast({ 
        title: "Fotos Prontas!", 
        description: `${validPaths.length} foto(s) adicionada(s) com sucesso!` 
      });

      console.log('🎯 Estado atual após upload:', {
        photosAntes: photos.length,
        photosDepois: updatedPhotos.length,
        novasFotos: validPaths,
        todasFotos: updatedPhotos
      });
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('❌ Erro ao enviar fotos:', err);
      setError(`Falha ao enviar fotos: ${err.message}`);
      toast({ 
        variant: "destructive", 
        title: "Erro no Upload", 
        description: err.message || "Falha ao enviar fotos."
      });
    }
    
    setUploading(false);
    
    // Limpar input para permitir re-upload do mesmo arquivo
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDeletePhoto = async (index) => {
    const photoToDelete = photos[index];
    if (!photoToDelete) return;

    console.log('🗑️ Removendo foto:', photoToDelete);

    try {
      // Atualizar estado local primeiro
      const updatedPhotos = photos.filter((_, i) => i !== index);
      setPhotos(updatedPhotos);
      
      // Remover URL do cache
      const updatedUrls = { ...photoUrls };
      delete updatedUrls[photoToDelete];
      setPhotoUrls(updatedUrls);
      
      console.log('✅ Foto removida localmente. Array atualizado:', updatedPhotos);

      // Tentar deletar do storage se não for URL externa
      if (!photoToDelete.startsWith('http')) { 
         // Tentar deletar do bucket 'avatars' primeiro (novo formato)
         const { error: deleteError } = await supabase.storage
           .from('avatars')
           .remove([photoToDelete]);
           
         if (deleteError) {
            console.warn("⚠️ Erro ao deletar do bucket 'avatars':", deleteError.message);
            
            // Se falhar, tentar bucket 'photos' (formato antigo)
            try {
              const { error: deleteError2 } = await supabase.storage
                .from('photos')
                .remove([photoToDelete]);
                
              if (deleteError2) {
                console.warn("⚠️ Erro ao deletar do bucket 'photos':", deleteError2.message);
              } else {
                console.log("✅ Foto deletada do storage (bucket photos):", photoToDelete);
              }
            } catch (err2) {
              console.warn("⚠️ Erro secundário ao deletar:", err2.message);
            }
         } else {
             console.log("✅ Foto deletada do storage (bucket avatars):", photoToDelete);
         }
      }
      
      setSuccess('Foto removida! Clique em "Guardar Alterações" para confirmar.');
      toast({ 
        title: "Foto Removida!", 
        description: 'Clique em "Guardar Alterações" para salvar a mudança.' 
      });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('❌ Erro ao remover foto:', err);
      setError('Falha ao remover foto. Tente novamente.');
      toast({ 
        variant: "destructive", 
        title: "Erro", 
        description: "Falha ao remover foto." 
      });
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

      <div className="py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto space-y-4 sm:space-y-6"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Editar Perfil</h1>

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

              {/* 🎨 Galeria de Fotos Reimaginada */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label className="text-white font-semibold text-lg flex items-center">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                    Galeria de Fotos
                  </Label>
                  <div className="px-3 py-1 bg-purple-500/20 rounded-full border border-purple-500/30">
                    <span className="text-purple-300 text-xs font-medium">
                      {photos.length}/3 fotos
                    </span>
                  </div>
                </div>

                {/* Grid de Fotos Responsivo */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {Array.from({ length: 3 }).map((_, index) => {
                    const photoPath = photos[index];
                    const photoUrl = photoPath ? photoUrls[photoPath] : null;
                    const hasPhoto = photoUrl && photoPath;

                    return (
                      <div 
                        key={index} 
                        className="relative group aspect-square rounded-xl sm:rounded-2xl overflow-hidden"
                      >
                        {hasPhoto ? (
                          <>
                            {/* Foto Existente */}
                            <img
                              src={photoUrl}
                              alt={`Foto ${index + 1}`}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => { 
                                console.error('Erro ao carregar foto:', photoUrl);
                                // Em vez de esconder, mostrar placeholder
                                e.target.src = `data:image/svg+xml,${encodeURIComponent(`
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
                                    <rect width="200" height="200" fill="#374151"/>
                                    <path d="M100 75c-13.807 0-25 11.193-25 25s11.193 25 25 25 25-11.193 25-25-11.193-25-25-25zM60 140h80l-20-20-15 15-15-15-30 20z" fill="#6b7280"/>
                                    <text x="100" y="170" text-anchor="middle" fill="#9ca3af" font-size="10" font-family="Arial">Erro ao carregar</text>
                                  </svg>
                                `)}`;
                              }}
                            />
                            
                            {/* Overlay com ações */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleDeletePhoto(index)}
                                className="p-3 bg-red-500/90 hover:bg-red-600 rounded-full transition-all hover:scale-110 shadow-lg backdrop-blur-sm"
                                aria-label="Deletar foto"
                                title="Deletar foto"
                              >
                                <X className="w-5 h-5 text-white" />
                              </button>
                            </div>

                            {/* Badge de posição */}
                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg">
                              <span className="text-white text-xs font-medium">#{index + 1}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Slot Vazio Elegante */}
                            <div className="w-full h-full bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 border-dashed border-white/20 hover:border-purple-400/50 transition-colors duration-300 flex flex-col items-center justify-center group-hover:bg-gradient-to-br group-hover:from-purple-900/20 group-hover:to-blue-900/20">
                              <div className="p-3 bg-white/10 rounded-full mb-2 group-hover:bg-purple-500/20 transition-colors">
                                <UploadCloud className="w-6 h-6 text-white/60 group-hover:text-purple-300" />
                              </div>
                              <span className="text-white/40 text-xs text-center px-2">
                                Foto #{index + 1}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Integração com Instagram */}
                <InstagramIntegration
                  userId={user?.id}
                  onPhotoImport={handleInstagramPhotoImport}
                  availableSlots={3 - photos.length}
                  disabled={uploading || saving}
                />

                {/* Instruções Elegantes */}
                <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg flex-shrink-0">
                      <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white/90 font-medium text-sm mb-1">Dicas para fotos incríveis:</h4>
                      <ul className="text-white/60 text-xs space-y-1">
                        <li>• Use fotos nítidas e bem iluminadas</li>
                        <li>• Mostre seu rosto claramente na primeira foto</li>
                        <li>• Evite filtros excessivos</li>
                        <li>• Ou importe diretamente do seu Instagram acima ↗️</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Input de Upload Oculto */}
                <input
                  type="file"
                  ref={photosInputRef}
                  onChange={handlePhotosUpload}
                  className="hidden"
                  accept="image/png, image/jpeg"
                  multiple
                  disabled={uploading}
                />

                {/* Botão de Upload Magistral */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => photosInputRef.current.click()}
                    disabled={uploading || photos.length >= 3}
                    className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 p-[2px] transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="relative rounded-2xl bg-gradient-to-r from-gray-900 via-black to-gray-900 px-6 py-4 transition-all duration-300 group-hover:bg-opacity-80">
                      <div className="flex items-center justify-center space-x-3">
                        {uploading ? (
                          <>
                            <Loader className="h-6 w-6 animate-spin text-purple-400" />
                            <span className="text-white font-semibold">Enviando fotos...</span>
                          </>
                        ) : (
                          <>
                            <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                              <UploadCloud className="h-6 w-6 text-purple-300" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-white font-semibold">Adicionar Fotos</span>
                              <span className="text-white/60 text-xs">PNG ou JPEG • Auto-otimizado</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                  
                  {/* Efeito de brilho */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                </div>
              </div>

              {/* Mensagens de Status Elegantes */}
              {error && (
                <div className="bg-gradient-to-r from-red-900/30 to-pink-900/30 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-red-300 text-sm font-medium">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-green-300 text-sm font-medium">{success}</p>
                  </div>
                </div>
              )}

              {/* 🎯 Botões de Ação Magistrais */}
              <div className="space-y-4 pt-4">
                {/* Botões de Ação */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Botão Guardar Alterações */}
                  <div className="relative">
                    <button
                      type="submit"
                      onClick={handleUpdateProfile}
                      disabled={saving}
                      className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-500 to-pink-600 p-[2px] transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="relative rounded-2xl bg-gradient-to-r from-gray-900 via-black to-gray-900 px-6 py-4 transition-all duration-300 group-hover:bg-opacity-80">
                        <div className="flex items-center justify-center space-x-3">
                          {saving ? (
                            <>
                              <Loader className="h-6 w-6 animate-spin text-blue-400" />
                              <div className="text-left">
                                <div className="text-white font-semibold">Salvando...</div>
                                <div className="text-white/60 text-sm">Aguarde um momento</div>
                              </div>
                            </>
                          ) : (
                            <>
                              <Save className="h-6 w-6 text-blue-400" />
                              <div className="text-left">
                                <div className="text-white font-semibold">Guardar Alterações</div>
                                <div className="text-white/60 text-sm">Salvar todas as mudanças</div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Botão Ver como público */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={viewPublicProfile}
                      className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-green-600 via-teal-500 to-emerald-600 p-[2px] transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,197,94,0.4)]"
                    >
                      <div className="relative rounded-2xl bg-gradient-to-r from-gray-900 via-black to-gray-900 px-6 py-4 transition-all duration-300 group-hover:bg-opacity-80">
                        <div className="flex items-center justify-center space-x-3">
                          <Eye className="h-6 w-6 text-green-400" />
                          <div className="text-left">
                            <div className="text-white font-semibold">Ver como público</div>
                            <div className="text-white/60 text-sm">Como outros veem seu perfil</div>
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

              </div>
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

            {/* Botão Salvar Preferências */}
            <div className="relative mt-6">
              <button 
                onClick={handleUpdateProfile} 
                disabled={saving || uploading}
                className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-500 to-pink-600 p-[2px] transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="relative rounded-2xl bg-gradient-to-r from-gray-900 via-black to-gray-900 px-6 py-4 transition-all duration-300 group-hover:bg-opacity-80">
                  <div className="flex items-center justify-center space-x-3">
                    {saving ? (
                      <>
                        <Loader className="h-5 w-5 animate-spin text-blue-400" />
                        <div className="text-center">
                          <div className="text-white font-semibold">Salvando...</div>
                          <div className="text-white/60 text-xs">Atualizando preferências</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5 text-blue-400" />
                        <div className="text-center">
                          <div className="text-white font-semibold">Salvar Preferências</div>
                          <div className="text-white/60 text-xs">Interesses e configurações</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </button>
            </div>
          </div>

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

          {/* Seção de Configurações de Conta - Separada */}
          <div className="glass-effect rounded-2xl p-8 border border-white/10">
            
            <div className="space-y-4">
              {/* Aviso de Segurança */}
              <div className="flex justify-center mb-4">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>

              {/* Botão Deslogar - Danger Style */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={async () => { await logout(); }}
                  className="relative w-full overflow-hidden rounded-2xl border-2 border-red-500/30 bg-gradient-to-r from-red-900/20 to-pink-900/20 px-8 py-4 transition-all duration-300 hover:border-red-400/50 hover:bg-gradient-to-r hover:from-red-900/40 hover:to-pink-900/40 group-hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center justify-center space-x-3">
                    <div className="p-2 bg-red-500/20 rounded-lg group-hover:bg-red-500/30 transition-colors">
                      <LogOut className="h-6 w-6 text-red-400" />
                    </div>
                    <div className="text-left">
                      <div className="text-red-300 font-bold text-lg group-hover:text-red-200">Sair da Conta</div>
                      <div className="text-red-400/80 text-sm">Encerrar sessão atual</div>
                    </div>
                  </div>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 via-red-500/5 to-red-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>

                {/* Warning Icon */}
                <div className="absolute -top-2 -right-2 p-1 bg-amber-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default ProfilePage;