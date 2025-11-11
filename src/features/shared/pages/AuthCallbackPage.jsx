// src/features/auth/pages/AuthCallbackPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/features/shared/components/ui/button';

/**
 * Página de callback para processar confirmação de email e OAuth social
 * Esta página é chamada quando:
 * 1. Usuário clica no link de confirmação enviado por email
 * 2. Retorno do OAuth (Google, Facebook, Apple)
 */
const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    // 🔧 FIX: Timeout de segurança para evitar loops no mobile
    const safetyTimeout = setTimeout(() => {
      console.warn('⚠️ Timeout na autenticação - Forçando redirecionamento');
      setStatus('error');
      setMessage('Tempo limite excedido. Redirecionando para login...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    }, 10000); // 10 segundos de timeout

    const handleAuthCallback = async () => {
      try {
        // Verificar se é um callback OAuth (como Facebook, Google)
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionData?.session) {
          // ✅ Login social bem-sucedido - usuário já autenticado
          console.log('✅ Login OAuth bem-sucedido:', sessionData.session.user.email);
          setStatus('success');
          setMessage('Login realizado com sucesso! Redirecionando...');
          
          // 🔧 FIX: Verificar tipo de usuário e redirecionar adequadamente
          const user = sessionData.session.user;
          let targetRoute = '/dashboard'; // Default para usuários comuns
          
          try {
            // Buscar perfil para determinar rota correta
            const { data: profile } = await supabase
              .from('profiles')
              .select('profile_type, partner_id')
              .eq('id', user.id)
              .single();
            
            // Se for parceiro, redirecionar para dashboard do parceiro
            if (profile?.profile_type === 'partner' || profile?.partner_id) {
              targetRoute = '/partner/dashboard';
            }
          } catch (error) {
            console.log('Perfil não encontrado, usando rota padrão');
          }
          
          console.log(`🎯 Redirecionando para: ${targetRoute}`);
          clearTimeout(safetyTimeout); // Limpar timeout de segurança
          setTimeout(() => {
            navigate(targetRoute, { replace: true });
          }, 1500);
          return;
        }

        // Se não há sessão ativa, verificar se é confirmação de email
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        
        // Verificar se tem parâmetros de confirmação de email
        if (token_hash && type === 'email') {
          // Processar confirmação de email
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'email'
          });

          if (error) {
            throw error;
          }

          setStatus('success');
          setMessage('Email confirmado com sucesso! Agora você pode fazer login.');
          
          // 🔧 FIX: Determinar rota adequada após confirmação de email
          let targetRoute = '/dashboard';
          
          if (data?.user) {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('profile_type, partner_id')
                .eq('id', data.user.id)
                .single();
              
              if (profile?.profile_type === 'partner' || profile?.partner_id) {
                targetRoute = '/partner/dashboard';
              }
            } catch (error) {
              console.log('Perfil não encontrado após confirmação, usando rota padrão');
            }
          }
          
          console.log(`🎯 Email confirmado - Redirecionando para: ${targetRoute}`);
          clearTimeout(safetyTimeout); // Limpar timeout de segurança
          setTimeout(() => {
            navigate(targetRoute, { replace: true });
          }, 1500);
          return;
        }

        // Se chegou até aqui, verificar se há erro OAuth nos parâmetros
        const error_description = searchParams.get('error_description');
        const error = searchParams.get('error');
        
        if (error) {
          throw new Error(error_description || `Erro OAuth: ${error}`);
        }

        // Nenhum parâmetro válido encontrado
        throw new Error('Callback inválido - parâmetros não reconhecidos');

      } catch (error) {
        console.error('Erro no callback de autenticação:', error);
        clearTimeout(safetyTimeout); // Limpar timeout de segurança
        setStatus('error');
        
        if (error.message.includes('already confirmed')) {
          setMessage('Este email já foi confirmado anteriormente. Você pode fazer login normalmente.');
        } else if (error.message.includes('expired')) {
          setMessage('Este link de confirmação expirou. Solicite um novo link de confirmação.');
        } else if (error.message.includes('OAuth')) {
          setMessage('Erro no login social. Tente fazer login novamente.');
        } else {
          setMessage(error.message || 'Erro na autenticação. Tente novamente.');
        }
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate]);

  return (
    <>
      <Helmet>
        <title>Confirmação de Email - Mesa Pra 2</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
            {status === 'loading' && (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <Loader2 className="w-16 h-16 text-purple-400 animate-spin" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Processando autenticação...
                </h2>
                <p className="text-white/60">
                  Aguarde enquanto validamos seu acesso
                </p>
              </div>
            )}

            {status === 'success' && (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Autenticação Bem-sucedida!
                </h2>
                <p className="text-white/60">{message}</p>
                <p className="text-sm text-white/40">
                  Redirecionando para o login...
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                    <XCircle className="w-10 h-10 text-red-500" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white">
                  Erro na Confirmação
                </h2>
                <p className="text-white/60">{message}</p>
                
                <div className="space-y-3">
                  <Button
                    onClick={() => navigate('/login')}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    Ir para Login
                  </Button>
                  
                  <Button
                    onClick={() => navigate('/partner/register')}
                    variant="outline"
                    className="w-full"
                  >
                    Tentar Novamente
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default AuthCallbackPage;