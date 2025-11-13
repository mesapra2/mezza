// src/features/shared/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/features/shared/components/ui/use-toast';
import SocialLoginButtons from '@/features/shared/components/auth/SocialLoginButtons';

const RegisterPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithGoogle, signInWithFacebook } = useAuth();
  const { toast } = useToast();


  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Erro no login Google:', error);
      toast({
        title: '❌ Erro no cadastro',
        description: 'Não foi possível fazer cadastro com Google.',
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
        title: '❌ Erro no cadastro',
        description: 'Não foi possível fazer cadastro com Facebook.',
        variant: 'destructive'
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Cadastro - Mesapra2</title>
        <meta name="description" content="Crie sua conta no Mesapra2 e comece a participar de eventos sociais." />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 relative bg-gradient-to-br from-gray-900 via-black to-purple-900">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm sm:max-w-md relative z-20"
        >
          <div className="glass-effect rounded-2xl p-6 sm:p-8 border border-white/10 bg-black/30 backdrop-blur-xl">
            <div className="flex justify-center mb-6 sm:mb-8">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2 gradient-text">
              Junte-se ao Mesapra2
            </h1>
            <p className="text-center text-white/60 mb-6 sm:mb-8 text-sm sm:text-base">
              Crie sua conta e comece a explorar
            </p>

            <SocialLoginButtons
              onGoogleClick={handleGoogleLogin}
              onFacebookClick={handleFacebookLogin}
              loading={isLoading}
            />

            <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
              <p className="text-center text-white/60 text-xs sm:text-sm">
                Já tem uma conta?{' '}
                <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold">
                  Faça login
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

export default RegisterPage;