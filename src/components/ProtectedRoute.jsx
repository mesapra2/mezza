// src/components/ProtectedRoute.jsx
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import authService from '@/services/authService';
import { Loader2 } from 'lucide-react';

/**
 * Componente para proteger rotas que requerem autenticação
 * e telefone verificado
 */
const ProtectedRoute = ({ children, requirePhoneVerification = true }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkVerification = async () => {
      if (!isAuthenticated || !user) {
        setIsVerifying(false);
        return;
      }

      if (requirePhoneVerification) {
        try {
          const result = await authService.checkPhoneVerification(user.id);
          setPhoneVerified(result.phoneVerified);
        } catch (error) {
          console.error('Erro ao verificar telefone:', error);
          setPhoneVerified(false);
        }
      }

      setIsVerifying(false);
    };

    checkVerification();
  }, [isAuthenticated, user, requirePhoneVerification]);

  // Mostra loading enquanto verifica autenticação
  if (loading || isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-white/60">Verificando...</p>
        </div>
      </div>
    );
  }

  // Redireciona para login se não estiver autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redireciona para verificação se telefone não foi verificado
  if (requirePhoneVerification && !phoneVerified) {
    return <Navigate to="/verify-phone" state={{ from: location }} replace />;
  }

  // Renderiza o conteúdo protegido
  return children;
};

export default ProtectedRoute;