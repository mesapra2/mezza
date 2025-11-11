// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useToast } from '@/features/shared/components/ui/use-toast.js';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { getUserType, PROFILE_TYPES } from '@/config/userTypes';
<<<<<<< HEAD
import { useCurrentUserPresence } from '@/hooks/usePresence';
=======
import PresenceService from '@/services/PresenceService';
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925

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
  const { toast } = useToast();
  const navigate = useNavigate();

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
        const newProfileData = {
          id: currentUser.id,
          username: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || `user_${currentUser.id.substring(0, 5)}`,
          updated_at: new Date().toISOString(),
          theme: 'system',
          profile_visibility: 'public',
          notification_prefs: { emailEventUpdates: true, pushNewMessages: true },
          profile_type: profileType,
        };

        const { error: insertError } = await supabase.from('profiles').insert(newProfileData);
        if (insertError) throw insertError;
        
        console.log(`✅ [createProfile] Perfil criado para ${currentUser.id}`);
        toast({ title: "Perfil criado!", description: "Bem-vindo!" });
        profileData = await getProfile(currentUser);
      } else {
        console.log(`✅ [createProfile] Perfil já existe para ${currentUser.id}`);
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
                    
<<<<<<< HEAD
                    // ✅ Sistema de presença será inicializado pelo hook
=======
                    // ✅ Inicializar sistema de presença
                    try {
                        await PresenceService.initialize(initialUser.id);
                    } catch (presenceError) {
                        console.warn('⚠️ Erro ao inicializar presença:', presenceError);
                    }
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
                    
                    const currentPath = window.location.pathname;
                    
                    // ✅ NÃO redireciona se estiver em /verify-phone ou se for usuário antigo sem telefone
                    if (initialProfile && ['/', '/login', '/register'].includes(currentPath)) {
                        const targetRoute = initialProfile.isPartner ? '/partner/dashboard' : '/dashboard';
                        console.log(`[Auth Effect Init] Navegando para rota inicial: ${targetRoute}`);
                        navigate(targetRoute, { replace: true });
                    }
                }
            } else if (mounted) {
                setProfile(null);
<<<<<<< HEAD
                // ✅ Presença será limpa automaticamente pelo hook
=======
                // ✅ Limpar presença quando não há usuário
                try {
                    await PresenceService.cleanup();
                } catch (presenceError) {
                    console.warn('⚠️ Erro ao limpar presença:', presenceError);
                }
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
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
<<<<<<< HEAD
                        // ✅ Presença será gerenciada pelo hook
=======
                        // ✅ Inicializar presença para novo usuário
                        try {
                            await PresenceService.initialize(currentUser.id);
                        } catch (presenceError) {
                            console.warn('⚠️ Erro ao inicializar presença no AuthStateChange:', presenceError);
                        }
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
                    }
                }).catch(err => {
                    if (!err.message.includes('AbortError') && !err.message.includes('aborted')) {
                        console.error('❌ Erro no AuthStateChange:', err);
                    }
                });
            } else {
                console.log('[AuthStateChange] Usuário deslogado, limpando perfil.');
                setProfile(null);
<<<<<<< HEAD
                // ✅ Presença será limpa automaticamente pelo hook
=======
                // ✅ Limpar presença no logout
                try {
                    PresenceService.cleanup();
                } catch (presenceError) {
                    console.warn('⚠️ Erro ao limpar presença no logout:', presenceError);
                }
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
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
<<<<<<< HEAD
      // Detectar se é mobile para ajustar o redirect
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const baseUrl = window.location.origin;
      const redirectTo = isMobile 
        ? `${baseUrl}/dashboard` 
        : `${baseUrl}/auth/callback`;

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
      console.log('✅ Redirecionando para Google... (mobile:', isMobile, ')');
=======
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
      if (error) throw error;
      console.log('✅ Redirecionando para Google...');
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
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
<<<<<<< HEAD
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const baseUrl = window.location.origin;
      const redirectTo = isMobile 
        ? `${baseUrl}/dashboard` 
        : `${baseUrl}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { 
          redirectTo,
=======
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { 
          redirectTo: window.location.origin,
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
          scopes: 'name email'
        }
      });
      if (error) throw error;
<<<<<<< HEAD
      console.log('✅ Redirecionando para Apple... (mobile:', isMobile, ')');
=======
      console.log('✅ Redirecionando para Apple...');
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
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
<<<<<<< HEAD
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const baseUrl = window.location.origin;
      const redirectTo = isMobile 
        ? `${baseUrl}/dashboard` 
        : `${baseUrl}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { 
          redirectTo,
=======
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { 
          redirectTo: window.location.origin,
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
          scopes: 'email public_profile'
        }
      });
      if (error) throw error;
<<<<<<< HEAD
      console.log('✅ Redirecionando para Facebook... (mobile:', isMobile, ')');
=======
      console.log('✅ Redirecionando para Facebook...');
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
    } catch (error) {
      console.error('❌ Erro no login com Facebook:', error);
      toast({ variant: "destructive", title: "Erro com Login Facebook", description: error.message });
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
<<<<<<< HEAD
=======
      // ✅ Limpar presença antes do logout
      await PresenceService.cleanup();
      
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
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
      const fileName = `${user.id}-${isAdditionalPhoto ? 'photo' : 'avatar'}-${timestamp}.${fileExt}`;
      
      const bucket = isAdditionalPhoto ? 'photos' : 'avatars';
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
    updateProfile,
    uploadAvatar,
  }), [user, loading, profile, login, register, logout, signInWithGoogle, signInWithApple, signInWithFacebook, updateProfile, uploadAvatar]);

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