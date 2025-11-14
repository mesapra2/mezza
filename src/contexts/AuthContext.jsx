// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useToast } from '@/features/shared/components/ui/use-toast.js';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { getUserType, PROFILE_TYPES } from '@/config/userTypes';
import { useCurrentUserPresence } from '@/hooks/usePresence';
import LocationService from '@/services/LocationService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

// 🎯 Função helper para mensagens de erro amigáveis
const getErrorMessage = (error) => {
  if (error.message === 'Email not confirmed') {
    return 'Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada e spam.';
  }
  if (error.message === 'Invalid login credentials') {
    return 'Email ou senha incorretos.';
  }
  if (error.message.includes('User already registered')) {
    return 'Este email já está cadastrado. Faça login ou recupere sua senha.';
  }
  return error.message;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  /**
   * ✅ FUNÇÃO PARA CAPTURAR LOCALIZAÇÃO AUTOMATICAMENTE
   * ⚠️ TEMPORARIAMENTE DESABILITADA - Colunas de localização não existem na tabela profiles
   */
  const requestLocationOnLogin = useCallback(async (userId) => {
    if (locationRequested) return;
    
    console.log('📍 [Auth] Localização desabilitada - colunas não existem na tabela profiles');
    
    // TODO: Descomentar quando executar a migração add_location_fields_to_profiles.sql
    /*
    try {
      setLocationRequested(true);
      console.log('📍 [Auth] Solicitando localização após login...');
      
      // Verificar se já tem localização recente
      const savedLocation = await LocationService.getUserLocation(userId);
      
      if (savedLocation && !LocationService.shouldUpdateLocation(savedLocation.timestamp, 1800000)) {
        console.log('✅ [Auth] Localização recente encontrada, não solicitando nova');
        return;
      }
      
      // Verificar permissões primeiro
      const permissionStatus = await LocationService.checkLocationPermission();
      
      if (permissionStatus.granted) {
        // Se já tem permissão, obter localização silenciosamente
        try {
          const location = await LocationService.getCurrentLocation(false);
          
          // Obter endereço opcional
          const addressInfo = await LocationService.getAddressFromCoordinates(
            location.latitude,
            location.longitude
          );
          
          const locationWithAddress = {
            ...location,
            ...addressInfo
          };
          
          // Salvar no banco
          await LocationService.saveUserLocation(userId, locationWithAddress);
          
          console.log('✅ [Auth] Localização capturada e salva automaticamente');
          
          toast({
            title: "📍 Localização atualizada",
            description: `Eventos próximos em ${addressInfo.city || 'sua região'} serão priorizados`,
          });
          
        } catch (error) {
          console.warn('⚠️ [Auth] Erro ao obter localização automaticamente:', error.message);
          // Não mostrar erro para não interromper o login
        }
      } else if (permissionStatus.prompt) {
        // Se precisa solicitar permissão, fazer isso depois de um delay
        setTimeout(() => {
          console.log('🔔 [Auth] Permissão de localização será solicitada');
          // A solicitação será feita pelo componente LocationPermissionRequest
        }, 3000);
      }
      
    } catch (error) {
      console.error('❌ [Auth] Erro no processo de localização:', error);
    } finally {
      // Reset flag after some time to allow retry
      setTimeout(() => {
        setLocationRequested(false);
      }, 60000); // 1 minuto
    }
    */
  }, [locationRequested]);

  // Função para buscar o perfil com controle simplificado
  const getProfile = useCallback(async (currentUser) => {
    if (!currentUser) return null;
    console.log(`📄 [getProfile] Buscando perfil para ${currentUser.id}`);
    
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select(`
          id, username, bio, avatar_url, photos, hashtags_interesse,
          is_premium, profile_type, partner_id,
          theme, profile_visibility, notification_prefs,
          phone, phone_verified
        `)
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      if (!profileData) return null;

      profileData.theme = profileData.theme || 'system';
      profileData.profile_visibility = profileData.profile_visibility || 'public';
      profileData.notification_prefs = profileData.notification_prefs || { emailEventUpdates: true, pushNewMessages: true };

      // ✅ SE FOR PARCEIRO, BUSCAR DADOS DO PARTNER
      if (profileData.profile_type === PROFILE_TYPES.PARTNER && profileData.partner_id) {
        console.log(`🏢 Buscando dados do partner: ${profileData.partner_id}`);
        
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select('id, name, email, plan, is_premium, capacity')
          .eq('id', profileData.partner_id)
          .single();
        
        if (!partnerError && partnerData) {
          console.log('✅ Dados do partner:', partnerData);
          profileData.partner_data = partnerData;
          profileData.isPremiumPartner = partnerData.is_premium === true;
          
          console.log('🔍 Status Premium:', {
            partnerId: partnerData.id,
            partnerName: partnerData.name,
            plan: partnerData.plan,
            isPremium: partnerData.is_premium,
            isPremiumPartner: profileData.isPremiumPartner,
          });
        } else if (partnerError) {
          console.error(`❌ Erro ao buscar dados do parceiro ${profileData.partner_id}:`, partnerError);
        }
      }

      const enrichedProfile = {
        ...profileData,
        isPartner: profileData.profile_type === PROFILE_TYPES.PARTNER || profileData.partner_id != null,
        isPremium: profileData.is_premium || false,
        userType: getUserType(profileData)
      };

      console.log('✅ Perfil carregado:', enrichedProfile.username, '| Phone:', enrichedProfile.phone || 'sem telefone');
      return enrichedProfile;
    } catch (error) {
      console.error('❌ Erro em getProfile:', error);
      toast({ variant: "destructive", title: "Erro ao buscar perfil", description: error.message });
      return null;
    }
  }, [toast]);

  // Função para criar o perfil se não existir
  const createProfileIfNotExists = useCallback(async (currentUser) => {
    if (!currentUser) return null;
    console.log(`[createProfile] Verificando/Criando perfil para ${currentUser.id}`);
    
    // Adicionar delay para evitar requisições muito rápidas
    await new Promise(resolve => setTimeout(resolve, 200));
    
    try {
      let profileData = await getProfile(currentUser);
      if (!profileData) {
        console.log(`ℹ️ [createProfile] Perfil não existe para ${currentUser.id}. Criando...`);
        const profileType = currentUser.user_metadata?.profile_type || PROFILE_TYPES.USER;

        // ✅ Capturar avatar do OAuth (Google/Facebook)
        const avatarUrl = currentUser.user_metadata?.avatar_url ||
                         currentUser.user_metadata?.picture ||
                         null;

        const newProfileData = {
          id: currentUser.id,
          username: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || `user_${currentUser.id.substring(0, 5)}`,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
          theme: 'system',
          profile_visibility: 'public',
          notification_prefs: { emailEventUpdates: true, pushNewMessages: true },
          profile_type: profileType,
        };

        console.log(`📸 [createProfile] Avatar do OAuth: ${avatarUrl ? 'Capturado' : 'Não disponível'}`);
        const { error: insertError } = await supabase.from('profiles').insert(newProfileData);
        if (insertError) throw insertError;

        console.log(`✅ [createProfile] Perfil criado para ${currentUser.id}`);
        toast({ title: "Perfil criado!", description: "Bem-vindo!" });
        profileData = await getProfile(currentUser);
      } else {
        console.log(`✅ [createProfile] Perfil já existe para ${currentUser.id}`);

        // ✅ Atualizar avatar se não existir mas estiver disponível no OAuth
        if (!profileData.avatar_url) {
          const avatarUrl = currentUser.user_metadata?.avatar_url ||
                           currentUser.user_metadata?.picture ||
                           null;

          if (avatarUrl) {
            console.log(`📸 [createProfile] Atualizando avatar do OAuth para perfil existente`);
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ avatar_url: avatarUrl })
              .eq('id', currentUser.id);

            if (!updateError) {
              profileData.avatar_url = avatarUrl;
              console.log(`✅ Avatar atualizado com sucesso`);
            }
          }
        }
      }
      return profileData;
    } catch (error) {
      console.error('❌ Erro em createProfileIfNotExists:', error);
      // Não exibir toast para erros de AbortError
      if (!error.message.includes('AbortError') && !error.message.includes('aborted')) {
        toast({ variant: "destructive", title: "Erro ao criar/verificar perfil", description: error.message });
      }
      return null;
    }
  }, [getProfile, toast]);

  // Efeito principal para auth state change e inicialização
  useEffect(() => {
    let mounted = true;
    let isInitializing = false;
    
    console.log('[Auth Effect Init] Montando e buscando sessão inicial...');
    setLoading(true);

    const initializeAuth = async () => {
        if (isInitializing) return;
        isInitializing = true;
        
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;
            if (!mounted) return;
            
            console.log('[Auth Effect Init] Sessão inicial:', session ? `User ${session.user.id}` : 'Nenhuma');

            const initialUser = session?.user ?? null;
            setUser(initialUser);

            if (initialUser && mounted) {
                const initialProfile = await createProfileIfNotExists(initialUser);
                if (mounted && initialProfile) {
                    setProfile(initialProfile);
                    
                    // ✅ Capturar localização automaticamente após login
                    // requestLocationOnLogin(initialUser.id); // Desabilitado - colunas não existem
                    
                    // ✅ Sistema de presença será inicializado pelo hook
                    
                    const currentPath = window.location.pathname;
                    
                    // ✅ NÃO redireciona se estiver em /verify-phone ou se for usuário antigo sem telefone
                    // 🔧 FIX: Adicionar mais verificações para evitar loops no mobile
                    const allowedRedirectPaths = ['/', '/login', '/register', '/auth/callback'];
                    if (initialProfile && allowedRedirectPaths.includes(currentPath)) {
                        const targetRoute = initialProfile.isPartner ? '/partner/dashboard' : '/dashboard';
                        console.log(`[Auth Effect Init] Navegando para rota inicial: ${targetRoute} (mobile: ${/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)})`);
                        
                        // Verificar se não está já na rota correta para evitar loop
                        if (currentPath !== targetRoute) {
                            navigate(targetRoute, { replace: true });
                        } else {
                            console.log('✅ Já está na rota correta, evitando redirecionamento');
                        }
                    }
                }
            } else if (mounted) {
                setProfile(null);
                // ✅ Presença será limpa automaticamente pelo hook
            }
        } catch (err) {
            console.error('❌ Erro na inicialização do Auth:', err);
            if (mounted) {
                setUser(null);
                setProfile(null);
            }
        } finally {
            if (mounted) {
                console.log('[Auth Effect Init] Carregamento inicial concluído.');
                setLoading(false);
            }
            isInitializing = false;
        }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!mounted) return;
        console.log(`[AuthStateChange] Evento: ${_event}`, session ? `User ${session.user.id}` : 'Nenhuma sessão');

        const currentUser = session?.user ?? null;

        setUser(prevUser => {
            if (prevUser?.id === currentUser?.id) {
                if (_event === 'USER_UPDATED') {
                    console.log('[AuthStateChange] Evento USER_UPDATED, recarregando perfil...');
                }
                return prevUser;
            }

            if (currentUser) {
                console.log('[AuthStateChange] Usuário alterado/logado, buscando/criando perfil...');
                
                createProfileIfNotExists(currentUser).then(async (p) => {
                    if (mounted && p) {
                        setProfile(p);
                        
                        // ✅ Capturar localização automaticamente após login/mudança de usuário
                        // requestLocationOnLogin(currentUser.id); // Desabilitado - colunas não existem
                        
                        // ✅ Presença será gerenciada pelo hook
                    }
                }).catch(err => {
                    if (!err.message.includes('AbortError') && !err.message.includes('aborted')) {
                        console.error('❌ Erro no AuthStateChange:', err);
                    }
                });
            } else {
                console.log('[AuthStateChange] Usuário deslogado, limpando perfil.');
                setProfile(null);
                // ✅ Presença será limpa automaticamente pelo hook
                console.log('[AuthStateChange] Navegando para /login após logout.');
                navigate('/login', { replace: true });
            }
            return currentUser;
        });
    });

    return () => {
        console.log('[Auth Effect Init] Desmontando...');
        mounted = false;
        subscription?.unsubscribe();
    };
  }, [createProfileIfNotExists, navigate]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast({ title: "Login realizado com sucesso!", description: "Bem-vindo de volta!" });
      return data.user;
    } catch (error) {
      console.error('❌ Erro no login:', error);
      const friendlyMessage = getErrorMessage(error);
      toast({ 
        variant: "destructive", 
        title: error.message === 'Email not confirmed' ? "Email não confirmado" : "Erro de Login", 
        description: friendlyMessage,
        duration: 8000
      });
      setLoading(false);
      throw error;
    }
  }, [toast]);

  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      const baseUrl = window.location.origin;
      // ✅ FIX: Usar sempre auth/callback para evitar loops no mobile
      const redirectTo = `${baseUrl}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      if (error) throw error;
      console.log('✅ Redirecionando para Google...');
    } catch (error) {
      console.error('❌ Erro no login com Google:', error);
      toast({ variant: "destructive", title: "Erro com Login Google", description: error.message });
      setLoading(false);
      throw error;
    }
  }, [toast]);

  const signInWithApple = useCallback(async () => {
    setLoading(true);
    try {
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const baseUrl = window.location.origin;
      const redirectTo = isMobile 
        ? `${baseUrl}/dashboard` 
        : `${baseUrl}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { 
          redirectTo,
          scopes: 'name email'
        }
      });
      if (error) throw error;
      console.log('✅ Redirecionando para Apple... (mobile:', isMobile, ')');
    } catch (error) {
      console.error('❌ Erro no login com Apple:', error);
      toast({ variant: "destructive", title: "Erro com Login Apple", description: error.message });
      setLoading(false);
      throw error;
    }
  }, [toast]);

  const signInWithFacebook = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ CORREÇÃO: Usar sempre auth/callback para Facebook
      const baseUrl = window.location.origin;
      const redirectTo = `${baseUrl}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { 
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
          // ✅ CRÍTICO: Scopes específicos para evitar erro de exchange
          scopes: 'email,public_profile'
        }
      });
      
      if (error) {
        console.error('❌ Erro no login Facebook:', error);
        throw error;
      }
      
      console.log('✅ Redirecionando para Facebook...', data);
      return data;
    } catch (error) {
      console.error('❌ Erro no login com Facebook:', error.message);
      
      // ✅ Error handling específico para Facebook
      if (error.message?.includes('exchange external code') || error.message?.includes('Unable to exchange')) {
        toast({ 
          variant: "destructive", 
          title: "Erro de Autenticação Facebook", 
          description: "Erro na autenticação do Facebook. Tente novamente ou use outro método de login."
        });
      } else {
        toast({ 
          variant: "destructive", 
          title: "Erro com Login Facebook", 
          description: error.message || "Erro desconhecido"
        });
      }
      setLoading(false);
      throw error;
    }
  }, [toast]);

  const signInWithInstagram = useCallback(async () => {
    setLoading(true);
    try {
      const baseUrl = window.location.origin;
      const redirectTo = `${baseUrl}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { 
          redirectTo,
          scopes: 'email'
        }
      });
      
      if (error) {
        console.error('❌ Erro no login Instagram (via Facebook):', error);
        throw error;
      }
      
      console.log('✅ Redirecionando para Instagram (via Facebook)...', data);
      return data;
    } catch (error) {
      console.error('❌ Erro no login com Instagram:', error.message);
      
      toast({ 
        variant: "destructive", 
        title: "Erro de Login Instagram", 
        description: "Erro na autenticação do Instagram. Tente novamente ou use outro método de login."
      });
      setLoading(false);
      throw error;
    }
  }, [toast]);

  const register = useCallback(async (userData) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: { 
          data: { 
            full_name: userData.name, 
            profile_type: userData.profile_type || PROFILE_TYPES.USER 
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });
      
      if (error) throw error;
      
      // Verifica se precisa confirmar email
      const needsEmailConfirmation = data.user && !data.session;
      
      if (needsEmailConfirmation) {
        toast({ 
          title: "Cadastro realizado! 📧", 
          description: "Enviamos um email de confirmação. Por favor, verifique sua caixa de entrada (e spam) antes de fazer login.",
          duration: 10000
        });
        setLoading(false);
      } else {
        toast({ 
          title: "Cadastro realizado com sucesso!", 
          description: `Bem-vindo(a), ${userData.name}!` 
        });
      }
      
      return data.user;
    } catch (error) {
      console.error('❌ Erro no registro:', error);
      const friendlyMessage = getErrorMessage(error);
      toast({ 
        variant: "destructive", 
        title: "Erro de Cadastro", 
        description: friendlyMessage 
      });
      setLoading(false);
      throw error;
    }
  }, [toast]);

  const logout = useCallback(async () => {
    console.log('[Logout] Iniciando logout...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({ title: "Logout realizado!", description: "Até logo!" });
      console.log('[Logout] Logout concluído no Supabase.');
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      toast({ variant: "destructive", title: "Erro ao Sair", description: error.message });
    }
  }, [toast]);

  const updateProfile = useCallback(async (updates) => {
    if (!user) {
      toast({ variant: "destructive", title: "Erro", description: "Usuário não autenticado." });
      return null;
    }
    console.log(`[updateProfile] Atualizando perfil para ${user.id}:`, updates);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Perfil atualizado no DB:', data);
      toast({ title: "Sucesso!", description: "Seu perfil foi atualizado." });

      const updatedProfileData = {
        ...profile,
        ...data,
        isPartner: data.profile_type === PROFILE_TYPES.PARTNER || data.partner_id != null,
        isPremium: data.is_premium || false,
        userType: getUserType(data),
        isPremiumPartner: profile?.partner_data?.is_premium === true
      };

      setProfile(updatedProfileData);
      console.log('✅ Estado do perfil atualizado localmente.');
      return updatedProfileData;
    } catch (error) {
      console.error('❌ Erro ao atualizar perfil:', error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar as alterações." });
      throw error;
    }
  }, [user, toast, profile]);

  const uploadAvatar = useCallback(async (file, isAdditionalPhoto = false) => {
    if (!user || !file) {
      toast({ variant: "destructive", title: "Erro", description: "Usuário não logado ou arquivo inválido." });
      return null;
    }
    console.log(`[uploadAvatar] Iniciando upload (${isAdditionalPhoto ? 'photo' : 'avatar'}) para ${user.id}`);
    try {
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      // Usar estrutura consistente para todos os uploads
      const fileName = isAdditionalPhoto 
        ? `${user.id}/profile-photos/${timestamp}.${fileExt}`  // Nova estrutura organizada
        : `${user.id}-avatar-${timestamp}.${fileExt}`;         // Avatar mantém formato simples
      
      const bucket = 'avatars'; // Usar sempre o mesmo bucket para consistência
      const options = { 
        cacheControl: '3600', 
        upsert: true,
        contentType: file.type || 'application/octet-stream' 
      };

      console.log(`[uploadAvatar] Enviando para bucket '${bucket}', arquivo '${fileName}'`);
      const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, options);

      if (error) throw error;

      console.log(`✅ Upload bem-sucedido. Path:`, data?.path);
      return data?.path ?? null;

    } catch (error) {
      console.error('❌ Erro detalhado no upload:', error);
      toast({ variant: "destructive", title: "Erro no Upload", description: `Não foi possível enviar sua foto. Detalhes: ${error.message}` });
      return null;
    }
  }, [user, toast]);

  const value = useMemo(() => ({
    user,
    loading,
    profile,
    login,
    register,
    logout,
    signInWithGoogle,
    signInWithApple,
    signInWithFacebook,
    signInWithInstagram,
    updateProfile,
    uploadAvatar,
  }), [user, loading, profile, login, register, logout, signInWithGoogle, signInWithApple, signInWithFacebook, signInWithInstagram, updateProfile, uploadAvatar]);

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="w-screen h-screen flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};