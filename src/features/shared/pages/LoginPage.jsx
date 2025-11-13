// src/features/shared/pages/LoginPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/features/shared/components/ui/use-toast';
import SocialLoginButtons from '@/features/shared/components/auth/SocialLoginButtons';
// ✅ VÍDEOS RESTAURADOS - Com otimização de performance
import vds2 from '@/assets/vds2.mp4';
import vds4 from '@/assets/vds4.mp4';
import vds5 from '@/assets/vds5.mp4';
import vds7 from '@/assets/vds7.mp4';
import vds9 from '@/assets/vds9.mp4';
import vds10 from '@/assets/vds10.mp4';
import vds11 from '@/assets/vds11.mp4';

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  // ✅ VÍDEO RESTAURADO - Com controle otimizado
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const { signInWithGoogle, signInWithFacebook, signInWithInstagram } = useAuth();

  // ✅ VÍDEOS RESTAURADOS - Array otimizado
  const videos = [vds2, vds4, vds5, vds7, vds9, vds10, vds11];
  
  // Effect para rotação de vídeos
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % videos.length);
    }, 8000); // Troca vídeo a cada 8 segundos
    
    return () => clearInterval(interval);
  }, [videos.length]);

  const { toast } = useToast();

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

  const handleInstagramLogin = async () => {
    try {
      await signInWithInstagram();
    } catch (error) {
      console.error('Erro no login Instagram:', error);
      toast({
        title: '❌ Erro no login',
        description: 'Não foi possível fazer login com Instagram.',
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
          
          {/* Overlay escuro para melhor legibilidade (reduzido para mais visibilidade dos vídeos) */}
          <div className="absolute inset-0 bg-black/20 z-10"></div>
          
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
          <div className="glass-effect rounded-2xl p-6 sm:p-8 border border-white/5 bg-black/10 backdrop-blur-sm">
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
              onFacebookClick={handleFacebookLogin}
              onInstagramClick={handleInstagramLogin}
              loading={loading}
            />

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

              {/* Política de Exclusão de Dados */}
              <div className="text-center pt-2 border-t border-white/10">
                <a 
                  href="/politica-exclusao-dados.html" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-white/50 hover:text-white/70 text-xs transition-colors duration-200"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Política de Exclusão de Dados
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default LoginPage;