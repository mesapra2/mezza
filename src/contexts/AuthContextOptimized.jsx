// src/contexts/AuthContextOptimized.jsx
// ✅ VERSÃO OTIMIZADA PARA MOBILE - Performance maximizada
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useToast } from '@/features/shared/components/ui/use-toast.js';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { getUserType, PROFILE_TYPES } from '@/config/userTypes';
import { smartLog } from '@/utils/replaceConsoleLog';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

// ✅ Detectar mobile
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent) || window.innerWidth < 768;
};

// ✅ Cache simples para perfis
const profileCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

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

  // ✅ Função otimizada para buscar perfil com cache
  const getProfile = useCallback(async (currentUser, useCache = true) => {
    if (!currentUser) return null;
    
    const cacheKey = currentUser.id;
    
    // Verificar cache primeiro
    if (useCache && profileCache.has(cacheKey)) {
      const cached = profileCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        smartLog.debug('Perfil carregado do cache:', cached.data.username);
        return cached.data;
      }
    }

    smartLog.service('AuthContext', 'getProfile', `Buscando perfil para ${currentUser.id}`);
    
    try {
      // ✅ Query otimizada - apenas campos essenciais
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, full_name, phone, verified, partner_id, avatar_url, bio, public_profile, trust_score, created_at')
        .eq('id', currentUser.id)
        .single();

      if (profileError) throw profileError;

      let enrichedProfile = { ...profileData };
      
      // ✅ Carregar dados do partner apenas se necessário
      if (profileData.partner_id) {
        smartLog.service('AuthContext', 'getPartner', `Buscando dados do partner: ${profileData.partner_id}`);
        
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select('id, name, verified, premium_until')
          .eq('id', profileData.partner_id)
          .single();

        if (!partnerError && partnerData) {
          const isPremium = partnerData.premium_until && new Date(partnerData.premium_until) > new Date();
          enrichedProfile = {
            ...enrichedProfile,
            partner: partnerData,
            isPremium
          };
        } else {
          smartLog.error('Erro ao buscar dados do parceiro:', partnerError);
        }
      }

      // ✅ Cache do resultado
      profileCache.set(cacheKey, {
        data: enrichedProfile,
        timestamp: Date.now()
      });

      smartLog.success('Perfil carregado:', enrichedProfile.username, '| Phone:', enrichedProfile.phone || 'sem telefone');
      return enrichedProfile;
    } catch (error) {
      smartLog.error('Erro em getProfile:', error);
      return null;
    }
  }, []);

  // ✅ Criar perfil otimizado
  const createProfileIfNotExists = useCallback(async (currentUser) => {
    if (!currentUser) return;

    smartLog.service('AuthContext', 'createProfile', `Verificando perfil para ${currentUser.id}`);
    
    // ✅ Pequeno delay para evitar race conditions
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', currentUser.id)
        .single();

      if (!existingProfile) {
        smartLog.service('AuthContext', 'createProfile', 'Perfil não existe, criando...');
        
        // ✅ Criar perfil com dados mínimos
        const profileData = {
          id: currentUser.id,
          full_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
          username: currentUser.user_metadata?.user_name || currentUser.user_metadata?.preferred_username || currentUser.email?.split('@')[0] || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { error: insertError } = await supabase
          .from('profiles')
          .insert([profileData]);

        if (insertError) throw insertError;
        smartLog.success('Perfil criado para', currentUser.id);
      } else {
        smartLog.debug('Perfil já existe para', currentUser.id);
      }
    } catch (error) {
      smartLog.error('Erro em createProfileIfNotExists:', error);
    }
  }, []);

  // ✅ Efeito principal otimizado
  useEffect(() => {
    let mounted = true;
    let authSubscription = null;

    const initAuth = async () => {
      smartLog.service('AuthContext', 'init', 'Iniciando autenticação...');
      
      try {
        // ✅ Buscar sessão inicial com timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );
        
        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]);

        if (!mounted) return;

        if (sessionError) {
          smartLog.error('Erro ao buscar sessão:', sessionError);
          setLoading(false);
          return;
        }

        if (session?.user) {
          smartLog.debug('Sessão inicial encontrada:', session.user.id);
          setUser(session.user);
          
          // ✅ Carregar perfil em background
          const profileData = await getProfile(session.user);
          if (mounted && profileData) {
            setProfile(profileData);
          }
          
          // ✅ Navegação inteligente baseada no tipo de usuário
          if (mounted) {
            const currentPath = window.location.pathname;
            const userType = getUserType(profileData);
            
            // ✅ Redirecionamento otimizado para mobile
            if (currentPath === '/login' || currentPath === '/') {
              const targetRoute = userType === PROFILE_TYPES.PARTNER ? '/partner/dashboard' : '/dashboard';
              
              if (isMobile()) {
                // Delay pequeno para melhor UX mobile
                setTimeout(() => navigate(targetRoute, { replace: true }), 150);
              } else {
                navigate(targetRoute, { replace: true });
              }
            }
          }
        } else {
          smartLog.debug('Nenhuma sessão encontrada');
        }
      } catch (error) {
        if (error.message !== 'Timeout') {
          smartLog.error('Erro na inicialização do Auth:', error);
        } else {
          smartLog.warn('Timeout na inicialização - continuando...');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // ✅ Auth state change listener otimizado
    const setupAuthListener = () => {
      authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        
        smartLog.service('AuthContext', 'authChange', `Evento: ${event}`);
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          await createProfileIfNotExists(session.user);
          const profileData = await getProfile(session.user, false); // Sem cache em login
          if (mounted) {
            setProfile(profileData);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          profileCache.clear(); // Limpar cache
          
          const currentPath = window.location.pathname;
          if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
            navigate('/login', { replace: true });
          }
        }
      });
    };

    initAuth();
    setupAuthListener();

    return () => {
      mounted = false;
      if (authSubscription?.subscription) {
        authSubscription.subscription.unsubscribe();
      }
    };
  }, [navigate, getProfile, createProfileIfNotExists]);

  // ✅ Login otimizado
  const login = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) throw error;
      
      smartLog.success('Login realizado com sucesso');
      return data;
    } catch (error) {
      smartLog.error('Erro no login:', error);
      throw new Error(getErrorMessage(error));
    }
  }, []);

  // ✅ Social logins otimizados
  const signInWithGoogle = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        }
      });

      if (error) throw error;
      smartLog.success('Redirecionando para Google...');
      return data;
    } catch (error) {
      smartLog.error('Erro no login com Google:', error);
      throw error;
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) throw error;
      smartLog.success('Redirecionando para Apple...');
      return data;
    } catch (error) {
      smartLog.error('Erro no login com Apple:', error);
      throw error;
    }
  }, []);

  const signInWithFacebook = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) throw error;
      smartLog.success('Redirecionando para Facebook...');
      return data;
    } catch (error) {
      smartLog.error('Erro no login com Facebook:', error);
      throw error;
    }
  }, []);

  // ✅ Register otimizado
  const register = useCallback(async (email, password, fullName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName?.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      toast({
        title: "✅ Cadastro realizado!",
        description: "Enviamos um email de confirmação. Verifique sua caixa de entrada (e spam) antes de fazer login.",
      });

      return data;
    } catch (error) {
      smartLog.error('Erro no registro:', error);
      throw new Error(getErrorMessage(error));
    }
  }, [toast]);

  // ✅ Logout otimizado
  const logout = useCallback(async () => {
    smartLog.service('AuthContext', 'logout', 'Iniciando logout...');
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Limpar cache
      profileCache.clear();
      
      smartLog.success('Logout concluído');
    } catch (error) {
      smartLog.error('Erro no logout:', error);
      throw error;
    }
  }, []);

  // ✅ Memoized value
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
    // Funções extras para otimização
    refreshProfile: () => getProfile(user, false),
    isMobile: isMobile(),
  }), [user, loading, profile, login, register, logout, signInWithGoogle, signInWithApple, signInWithFacebook, getProfile]);

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="w-screen h-screen flex items-center justify-center bg-gray-900">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            <p className="text-gray-400 text-sm">Carregando...</p>
          </div>
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