// src/features/auth/pages/AuthCallbackPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/features/shared/components/ui/button';

/**
 * Página de callback para processar confirmação de email
 * Esta página é chamada quando o usuário clica no link de confirmação enviado por email
 */
const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Pega os parâmetros da URL
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        
        if (!token_hash || type !== 'email') {
          throw new Error('Link de confirmação inválido');
        }

        // Verifica o token de email
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'email'
        });

        if (error) {
          throw error;
        }

        // Email confirmado com sucesso!
        setStatus('success');
        setMessage('Email confirmado com sucesso! Agora você pode fazer login.');

        // ✅ FIX: Redirecionar para dashboard após login social bem-sucedido
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);

      } catch (error) {
        console.error('Erro na confirmação:', error);
        setStatus('error');
        
        if (error.message.includes('already confirmed')) {
          setMessage('Este email já foi confirmado anteriormente. Você pode fazer login normalmente.');
        } else if (error.message.includes('expired')) {
          setMessage('Este link de confirmação expirou. Solicite um novo link de confirmação.');
        } else {
          setMessage(error.message || 'Erro ao confirmar email. Tente novamente.');
        }
      }
    };

    handleEmailConfirmation();
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
                  Confirmando seu email...
                </h2>
                <p className="text-white/60">
                  Aguarde enquanto validamos seu cadastro
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
                  Email Confirmado!
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