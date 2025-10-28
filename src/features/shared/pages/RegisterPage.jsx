// src/features/shared/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Calendar, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Label } from '@/features/shared/components/ui/label';
import { useToast } from '@/features/shared/components/ui/use-toast';
import SocialLoginButtons from '@/features/shared/components/auth/SocialLoginButtons';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, signInWithGoogle, signInWithApple, signInWithFacebook } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha inválida",
        description: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }
    setIsLoading(true);
    try {
      await register({ name, email, password });
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro no Cadastro",
        description: error.message || "Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Erro no login Google:', error);
    }
  };

  const handleAppleLogin = async () => {
    try {
      await signInWithApple();
    } catch (error) {
      console.error('Erro no login Apple:', error);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      await signInWithFacebook();
    } catch (error) {
      console.error('Erro no login Facebook:', error);
    }
  };

  return (
    <>
      <Helmet>
        <title>Cadastro - Mesapra2</title>
        <meta name="description" content="Crie sua conta no Mesapra2 e comece a participar de eventos sociais." />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="glass-effect rounded-2xl p-8 border border-white/10">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Calendar className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Título */}
            <h1 className="text-3xl font-bold text-center mb-2 gradient-text">
              Junte-se ao Mesapra2
            </h1>
            <p className="text-center text-white/60 mb-8">
              Crie sua conta e comece a explorar
            </p>

            {/* Botões Sociais */}
            <SocialLoginButtons
              onGoogleClick={handleGoogleLogin}
              onAppleClick={handleAppleLogin}
              onFacebookClick={handleFacebookLogin}
              loading={isLoading}
            />

            {/* Divisor */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-background text-white/60">
                  ou cadastre-se com email
                </span>
              </div>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="pl-10 glass-effect border-white/10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="pl-10 glass-effect border-white/10"
                    required
                    disabled={isLoading}
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pl-10 glass-effect border-white/10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-12 text-base font-semibold" 
                disabled={isLoading}
              >
                {isLoading ? 'Criando conta...' : 'Criar conta'}
              </Button>
            </form>

            {/* Links */}
            <div className="mt-6 space-y-4">
              <p className="text-center text-white/60 text-sm">
                Já tem uma conta?{' '}
                <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold">
                  Faça login
                </Link>
              </p>

              <p className="text-center text-white/60 text-sm">
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

export default RegisterPage;