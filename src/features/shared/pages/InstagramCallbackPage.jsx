/**
 * ========================================
 * PÁGINA DE CALLBACK DO INSTAGRAM
 * ========================================
 * 
 * Processa o retorno da autenticação OAuth do Instagram
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/features/shared/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import InstagramService from '@/services/InstagramService';

const InstagramCallbackPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Processando conexão com Instagram...');

  useEffect(() => {
    handleInstagramCallback();
  }, []);

  const handleInstagramCallback = async () => {
    try {
      // Aguardar um momento para garantir que o usuário esteja disponível
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verificar se há um código de erro na URL
      const urlParams = new URLSearchParams(window.location.search);
      
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      if (error) {
        throw new Error(errorDescription || 'Erro na autenticação do Instagram');
      }

      // Obter código de autorização da URL
      const authCode = urlParams.get('code');
      
      if (!authCode) {
        throw new Error('Código de autorização não encontrado');
      }

      // Verificar se o usuário está logado no app
      if (!user?.id) {
        // Se não há usuário logado, aguardar mais um pouco
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (!user?.id) {
          throw new Error('Usuário não encontrado. Faça login primeiro.');
        }
      }

      setMessage('Trocando código por token de acesso...');

      // Trocar código por token de acesso
      const { accessToken, profile } = await InstagramService.exchangeCodeForToken(authCode);

      setMessage('Salvando conexão do Instagram...');

      // Salvar dados do Instagram no perfil do usuário
      await InstagramService.saveInstagramConnection(user.id, accessToken, profile);

      setStatus('success');
      setMessage('Instagram conectado com sucesso!');

      toast({
        title: "✅ Sucesso!",
        description: "Sua conta Instagram foi conectada com sucesso!",
      });

      // Redirecionar para o perfil após 2 segundos
      setTimeout(() => {
        navigate('/profile');
      }, 2000);

    } catch (error) {
      console.error('❌ Erro no callback do Instagram:', error);
      
      setStatus('error');
      setMessage(error.message || 'Erro ao conectar Instagram');

      toast({
        title: "❌ Erro na conexão",
        description: error.message || "Não foi possível conectar sua conta Instagram",
        variant: "destructive",
      });

      // Redirecionar para o perfil após 3 segundos
      setTimeout(() => {
        navigate('/profile');
      }, 3000);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-16 h-16 text-purple-400 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-400" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-red-400" />;
      default:
        return <Loader2 className="w-16 h-16 text-purple-400 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'from-purple-900/30 to-blue-900/30 border-purple-500/20';
      case 'success':
        return 'from-green-900/30 to-emerald-900/30 border-green-500/20';
      case 'error':
        return 'from-red-900/30 to-pink-900/30 border-red-500/20';
      default:
        return 'from-purple-900/30 to-blue-900/30 border-purple-500/20';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className={`max-w-md w-full bg-gradient-to-r ${getStatusColor()} rounded-2xl p-8 border text-center space-y-6`}>
        
        {/* Ícone de Status */}
        <div className="flex justify-center">
          {getStatusIcon()}
        </div>

        {/* Título */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {status === 'processing' && 'Conectando Instagram'}
            {status === 'success' && 'Conectado!'}
            {status === 'error' && 'Erro na Conexão'}
          </h1>
          <p className="text-white/60">
            {message}
          </p>
        </div>

        {/* Barra de Progresso */}
        {status === 'processing' && (
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="bg-purple-400 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
          </div>
        )}

        {/* Mensagem adicional */}
        <div className="text-sm text-white/40">
          {status === 'processing' && 'Aguarde enquanto processamos sua conexão...'}
          {status === 'success' && 'Redirecionando para seu perfil...'}
          {status === 'error' && 'Redirecionando de volta...'}
        </div>
      </div>
    </div>
  );
};

export default InstagramCallbackPage;