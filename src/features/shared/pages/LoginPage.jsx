// src/features/shared/pages/LoginPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Calendar, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Label } from '@/features/shared/components/ui/label';
import { useAccessibleForm } from '@/hooks/useAccessibleForm';
import { useToast } from '@/features/shared/components/ui/use-toast';
import SocialLoginButtons from '@/features/shared/components/auth/SocialLoginButtons';
import { supabase } from '@/lib/supabaseClient';
// ✅ VÍDEOS RESTAURADOS - Com otimização de performance
import vds2 from '@/assets/vds2.mp4';
import vds4 from '@/assets/vds4.mp4';
import vds5 from '@/assets/vds5.mp4';
import vds7 from '@/assets/vds7.mp4';
import vds9 from '@/assets/vds9.mp4';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  // ✅ VÍDEO RESTAURADO - Com controle otimizado
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const { login, signInWithGoogle, signInWithApple, signInWithFacebook } = useAuth();

  // ✅ VÍDEOS RESTAURADOS - Array otimizado
  const videos = [vds2, vds4, vds5, vds7, vds9];
  
  // Effect para rotação de vídeos
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % videos.length);
    }, 8000); // Troca vídeo a cada 8 segundos
    
    return () => clearInterval(interval);
  }, [videos.length]);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { getFieldProps, getLabelProps, getErrorId } = useAccessibleForm();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setShowResendButton(false);

    try {
      await login(email, password);
      
      // Se chegou aqui, login foi bem-sucedido
      toast({
        title: '✅ Login realizado!',
        description: 'Redirecionando...',
        variant: 'default'
      });
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Erro no login:', error);
      
      // Tratamento específico para email não confirmado
      if (error.message?.includes('Email not confirmed')) {
        setShowResendButton(true);
        toast({
          title: '📧 Email não confirmado',
          description: 'Por favor, verifique sua caixa de entrada e confirme seu email antes de fazer login.',
          variant: 'destructive',
          duration: 6000
        });
      } 
      // Tratamento para credenciais inválidas
      else if (error.message?.includes('Invalid login credentials')) {
        toast({
          title: '❌ Credenciais inválidas',
          description: 'Email ou senha incorretos. Tente novamente.',
          variant: 'destructive'
        });
      }
      // Outros erros
      else {
        toast({
          title: '❌ Erro ao fazer login',
          description: error.message || 'Ocorreu um erro inesperado. Tente novamente.',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Função para reenviar email de confirmação
  const handleResendConfirmation = async () => {
    if (!email) {
      toast({
        title: '⚠️ Email não informado',
        description: 'Por favor, digite seu email no campo acima.',
        variant: 'destructive'
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
        title: '✅ Email reenviado!',
        description: 'Verifique sua caixa de entrada e spam.',
        variant: 'default',
        duration: 5000
      });

      setShowResendButton(false);
    } catch (error) {
      console.error('Erro ao reenviar email:', error);
      toast({
        title: '❌ Erro ao reenviar',
        description: error.message || 'Não foi possível reenviar o email. Tente novamente mais tarde.',
        variant: 'destructive'
      });
    } finally {
      setResendingEmail(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Erro no login Google:', error);
      toast({
        title: '❌ Erro no login',
        description: 'Não foi possível fazer login com Google.',
        variant: 'destructive'
      });
    }
  };

  const handleAppleLogin = async () => {
    try {
      await signInWithApple();
    } catch (error) {
      console.error('Erro no login Apple:', error);
      toast({
        title: '❌ Erro no login',
        description: 'Não foi possível fazer login com Apple.',
        variant: 'destructive'
      });
    }
  };

  const handleFacebookLogin = async () => {
    try {
      await signInWithFacebook();
    } catch (error) {
      console.error('Erro no login Facebook:', error);
      toast({
        title: '❌ Erro no login',
        description: 'Não foi possível fazer login com Facebook.',
        variant: 'destructive'
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - Mesapra2</title>
        <meta name="description" content="Faça login no Mesapra2 e participe de eventos sociais em restaurantes." />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative bg-gradient-to-br from-gray-900 via-black to-purple-900">
        {/* ✅ VÍDEO BACKGROUND RESTAURADO - Com otimização */}
        <div className="fixed inset-0 z-0">
          {videos.map((video, index) => (
            <video
              key={index}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                index === currentVideoIndex ? 'opacity-70' : 'opacity-0'
              }`}
              autoPlay
              muted
              loop
              playsInline
              preload={index === 0 ? 'auto' : 'none'} // Carrega apenas o primeiro vídeo imediatamente
              onLoadedData={() => index === 0 && setVideoLoaded(true)}
            >
              <source src={video} type="video/mp4" />
            </video>
          ))}
          
          {/* Fallback enquanto vídeo não carrega */}
          {!videoLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-black">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-purple-500 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-blue-500 rounded-full blur-lg animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 right-1/3 w-16 h-16 bg-pink-400 rounded-full blur-md animate-pulse delay-500"></div>
              </div>
            </div>
          )}
          
          {/* Overlay escuro para melhor legibilidade */}
          <div className="absolute inset-0 bg-black/40 z-10"></div>
          
          {/* Indicadores de vídeo */}
          <div className="absolute bottom-4 left-4 flex space-x-2 z-20">
            {videos.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentVideoIndex 
                    ? 'bg-white shadow-lg' 
                    : 'bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm sm:max-w-md relative z-20"
        >
          <div className="glass-effect rounded-2xl p-6 sm:p-8 border border-white/10 bg-black/30 backdrop-blur-xl">
            {/* Logo */}
            <div className="flex justify-center mb-6 sm:mb-8">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>

            {/* Título */}
            <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2 gradient-text">
              Bem-vindo de volta
            </h1>
            <p className="text-center text-white/60 mb-6 sm:mb-8 text-sm sm:text-base">
              Entre na sua conta para continuar
            </p>

            {/* Botões Sociais */}
            <SocialLoginButtons
              onGoogleClick={handleGoogleLogin}
              onAppleClick={handleAppleLogin}
              onFacebookClick={handleFacebookLogin}
              loading={loading}
            />

            {/* Divisor */}
            <div className="relative my-4 sm:my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs sm:text-sm">
                <span className="px-3 sm:px-4 bg-background text-white/60">
                  ou continue com email
                </span>
              </div>
            </div>

            {/* Formulário Email/Senha */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="space-y-3">
                <Label {...getLabelProps('email')} className="text-sm sm:text-base">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    {...getFieldProps('email', { required: true })}
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 sm:h-14 pl-10 sm:pl-12 text-base glass-effect border-white/10 touch-manipulation"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm sm:text-base">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 sm:h-14 pl-10 sm:pl-12 text-base glass-effect border-white/10 touch-manipulation"
                    required
                  />
                </div>
              </div>

              {/* Botão de Reenviar Email (aparece só se email não confirmado) */}
              {showResendButton && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-orange-200 mb-2">
                        Você ainda não confirmou seu email. Clique no botão abaixo para receber um novo link de confirmação.
                      </p>
                      <Button
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={resendingEmail}
                        variant="outline"
                        className="w-full bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/40 text-orange-200"
                      >
                        {resendingEmail ? 'Reenviando...' : '📧 Reenviar email de confirmação'}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-11 sm:h-12 text-sm sm:text-base font-semibold"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            {/* Links */}
            <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
              <p className="text-center text-white/60 text-xs sm:text-sm">
                Não tem uma conta?{' '}
                <Link to="/register" className="text-purple-400 hover:text-purple-300 font-semibold">
                  Cadastre-se
                </Link>
              </p>
              
              <p className="text-center text-white/60 text-xs sm:text-sm">
                É um restaurante?{' '}
                <Link to="/partner/register" className="text-purple-400 hover:text-purple-300 font-semibold">
                  Cadastre seu estabelecimento
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default LoginPage;