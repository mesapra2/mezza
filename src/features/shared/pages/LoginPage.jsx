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

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [showResendButton, setShowResendButton] = useState(false);
  const { login, signInWithGoogle, signInWithApple, signInWithFacebook } = useAuth();
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

      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm sm:max-w-md"
        >
          <div className="glass-effect rounded-2xl p-6 sm:p-8 border border-white/10">
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
              <div className="space-y-2">
                <Label {...getLabelProps('email')}>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    {...getFieldProps('email', { required: true })}
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 glass-effect border-white/10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 glass-effect border-white/10"
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