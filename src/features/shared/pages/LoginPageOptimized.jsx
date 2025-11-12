// src/features/shared/pages/LoginPageOptimized.jsx
// ✅ VERSÃO OTIMIZADA PARA MOBILE - Performance maximizada
import React, { useState, useCallback, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Label } from '@/features/shared/components/ui/label';
import { useToast } from '@/features/shared/components/ui/use-toast';
import { smartLog } from '@/utils/replaceConsoleLog';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { supabase } from '@/lib/supabaseClient';

// ✅ Lazy load componentes não críticos
const SocialLoginButtons = lazy(() => import('@/features/shared/components/auth/SocialLoginButtonsOptimized'));

// ✅ Detectar mobile
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent) || window.innerWidth < 768;
};

const LoginPageOptimized = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  const [showSocialButtons, setShowSocialButtons] = useState(false);
  
  const { login, signInWithGoogle, signInWithApple, signInWithFacebook } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    isMobile: isMobileDevice, 
    shouldLazyLoad, 
    optimizedSettings,
    getOptimizedDebounce 
  } = useMobileOptimization();

  // ✅ Memoized submit handler
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setShowResendButton(false);

    try {
      await login(email, password);
      smartLog.success('Login realizado com sucesso');
      
      // ✅ Navegação otimizada para mobile
      if (isMobileDevice) {
        // Pequeno delay para melhor UX mobile
        setTimeout(() => navigate('/dashboard'), 100);
      } else {
        navigate('/dashboard');
      }
      
    } catch (error) {
      smartLog.error('Erro no login:', error.message);
      setLoading(false);

      if (error.message === 'Email not confirmed') {
        setShowResendButton(true);
        toast({
          variant: "destructive",
          title: "📧 Confirme seu email",
          description: 'Por favor, verifique sua caixa de entrada e confirme seu email antes de fazer login.',
        });
      }
      else if (error.message?.includes('Invalid login credentials')) {
        toast({
          variant: "destructive", 
          title: "🔐 Credenciais inválidas",
          description: 'Email ou senha incorretos. Verifique seus dados.',
        });
      }
      else {
        toast({
          variant: "destructive",
          title: '❌ Erro ao fazer login',
          description: error.message || 'Ocorreu um erro inesperado. Tente novamente.',
        });
      }
    }
  }, [email, password, login, navigate, toast]);

  // ✅ Resend email otimizado
  const handleResendEmail = useCallback(async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email necessário",
        description: "Digite seu email primeiro.",
      });
      return;
    }

    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      toast({
        title: "✅ Email reenviado",
        description: "Verifique sua caixa de entrada.",
      });
      setShowResendButton(false);
    } catch (error) {
      smartLog.error('Erro ao reenviar email:', error);
      toast({
        variant: "destructive",
        title: "Erro ao reenviar",
        description: "Tente novamente em alguns minutos.",
      });
    } finally {
      setResendingEmail(false);
    }
  }, [email, toast]);

  // ✅ Social login handlers otimizados
  const handleGoogleLogin = useCallback(async () => {
    try {
      await signInWithGoogle();
      smartLog.success('Login Google iniciado');
    } catch (error) {
      smartLog.error('Erro no login Google:', error);
      toast({
        variant: "destructive",
        title: '❌ Erro no login',
        description: 'Não foi possível fazer login com Google.',
      });
    }
  }, [signInWithGoogle, toast]);

  const handleAppleLogin = useCallback(async () => {
    try {
      await signInWithApple();
      smartLog.success('Login Apple iniciado');
    } catch (error) {
      smartLog.error('Erro no login Apple:', error);
      toast({
        variant: "destructive",
        title: '❌ Erro no login',
        description: 'Não foi possível fazer login com Apple.',
      });
    }
  }, [signInWithApple, toast]);

  const handleFacebookLogin = useCallback(async () => {
    try {
      await signInWithFacebook();
      smartLog.success('Login Facebook iniciado');
    } catch (error) {
      smartLog.error('Erro no login Facebook:', error);
      toast({
        variant: "destructive",
        title: '❌ Erro no login',
        description: 'Não foi possível fazer login com Facebook.',
      });
    }
  }, [signInWithFacebook, toast]);

  return (
    <>
      <Helmet>
        <title>Login - Mesapra2</title>
        <meta name="description" content="Faça login no Mesapra2 e participe de eventos sociais em restaurantes." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Helmet>

      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* ✅ DESKTOP: Background otimizado (só carrega se não for mobile) */}
        {!isMobileDevice && (
          <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20 z-10" />
            <div className="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900">
              {optimizedSettings.animationsEnabled && (
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-purple-500 rounded-full blur-xl animate-pulse"></div>
                  <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-blue-500 rounded-full blur-lg animate-pulse delay-1000"></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ✅ MOBILE/DESKTOP: Form optimizado */}
        <div className={`${isMobileDevice ? 'w-full' : 'w-full lg:w-1/2'} flex items-center justify-center p-4 sm:p-6 lg:p-8`}>
          <div className="w-full max-w-md space-y-6">
            {/* ✅ Logo/Header otimizado */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-purple-500 mr-2" />
                <span className="text-2xl font-bold text-white">Mesapra2</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Bem-vindo de volta
              </h1>
              <p className="text-gray-400 text-sm sm:text-base">
                Entre na sua conta para continuar
              </p>
            </div>

            {/* ✅ Form otimizado para mobile */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500/20 h-12 text-base"
                    placeholder="seu@email.com"
                    required
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    inputMode="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white text-sm font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500/20 h-12 text-base"
                    placeholder="Sua senha"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* ✅ Botão de submit otimizado */}
              <Button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold h-12 text-base"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </div>
                ) : (
                  'Entrar'
                )}
              </Button>

              {/* ✅ Resend button condicional */}
              {showResendButton && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResendEmail}
                  disabled={resendingEmail}
                  className="w-full border-white/20 text-white hover:bg-white/10 h-10"
                >
                  {resendingEmail ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Reenviando...
                    </div>
                  ) : (
                    '📧 Reenviar email de confirmação'
                  )}
                </Button>
              )}
            </form>

            {/* ✅ Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900 text-gray-400">ou</span>
              </div>
            </div>

            {/* ✅ Social buttons com lazy loading inteligente */}
            <div className="space-y-3">
              {shouldLazyLoad('social-buttons') && !showSocialButtons ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSocialButtons(true)}
                  className="w-full border-white/20 text-white hover:bg-white/10 h-10 transition-colors duration-200"
                >
                  {isMobileDevice ? '📱 Opções de login' : '🔗 Mostrar opções de login social'}
                </Button>
              ) : (
                <Suspense fallback={
                  <div className="text-center text-gray-400 py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-500 mx-auto mb-2"></div>
                    Carregando opções...
                  </div>
                }>
                  <SocialLoginButtons
                    onGoogleClick={handleGoogleLogin}
                    onAppleClick={handleAppleLogin}
                    onFacebookClick={handleFacebookLogin}
                    optimized={isMobileDevice}
                  />
                </Suspense>
              )}
            </div>

            {/* ✅ Footer links */}
            <div className="text-center space-y-4">
              <div className="text-sm text-gray-400">
                Não tem uma conta?{' '}
                <Link to="/register" className="text-purple-400 hover:text-purple-300 font-semibold">
                  Cadastre-se
                </Link>
              </div>
              
              <div className="text-xs text-gray-500">
                <Link to="/forgot-password" className="hover:text-gray-300">
                  Esqueceu a senha?
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPageOptimized;