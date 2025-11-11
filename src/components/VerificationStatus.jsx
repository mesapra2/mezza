/**
 * ========================================
 * COMPONENTE DE STATUS DE VERIFICAÇÃO
 * ========================================
 * 
 * Mostra o progresso das verificações necessárias
 * para o usuário poder assinar o Premium
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Phone, 
  FileText, 
  ArrowRight,
  Shield
} from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import PremiumFlowService from '@/services/PremiumFlowService';
import { useNavigate } from 'react-router-dom';

const VerificationStatus = ({ onStatusChange, className = '' }) => {
  const { user } = useAuth();
  const [verificationSummary, setVerificationSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.id) {
      loadVerificationStatus();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const loadVerificationStatus = async () => {
    try {
      setLoading(true);
      const summary = await PremiumFlowService.getVerificationSummary(user.id);
      setVerificationSummary(summary);
      
      // Notificar componente pai sobre mudança de status
      if (onStatusChange) {
        onStatusChange(summary.isReady);
      }
    } catch (error) {
      console.error('Erro ao carregar status de verificação:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueVerification = () => {
    if (verificationSummary?.nextStepUrl) {
      navigate(verificationSummary.nextStepUrl);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-white/10 rounded w-full"></div>
            <div className="h-3 bg-white/10 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <motion.div 
        className={`bg-red-500/10 backdrop-blur-lg rounded-2xl p-6 border border-red-500/20 ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center space-x-3 mb-4">
          <XCircle className="w-6 h-6 text-red-400" />
          <h3 className="text-lg font-semibold text-white">Login Necessário</h3>
        </div>
        <p className="text-white/70 mb-4">
          Você precisa fazer login para verificar seu status e assinar o Premium.
        </p>
        <Button
          onClick={() => navigate('/login')}
          className="bg-red-500 hover:bg-red-600 text-white"
        >
          Fazer Login
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    );
  }

  if (verificationSummary?.isPremium) {
    return (
      <motion.div 
        className={`bg-yellow-500/10 backdrop-blur-lg rounded-2xl p-6 border border-yellow-500/20 ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="w-6 h-6 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Você já é Premium!</h3>
        </div>
        <p className="text-white/70">
          Sua assinatura Premium está ativa. Aproveite todos os benefícios exclusivos!
        </p>
      </motion.div>
    );
  }

  const verificationItems = [
    {
      id: 'phone',
      title: 'Verificação de Telefone',
      description: 'Confirme seu número de telefone',
      icon: Phone,
      status: verificationSummary?.progress?.phone ? 'completed' : 'pending',
      isNext: verificationSummary?.nextStep?.includes('phone')
    },
    {
      id: 'document',
      title: 'Documento de Identidade',
      description: 'Envie um documento oficial com foto',
      icon: FileText,
      status: verificationSummary?.progress?.document ? 'completed' : 'pending',
      isNext: verificationSummary?.nextStep?.includes('document')
    }
  ];

  const getStatusIcon = (status, isNext) => {
    if (status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    }
    if (isNext) {
      return <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />;
    }
    return <XCircle className="w-5 h-5 text-red-400" />;
  };

  const getStatusColor = (status, isNext) => {
    if (status === 'completed') return 'border-green-500/30 bg-green-500/10';
    if (isNext) return 'border-yellow-500/30 bg-yellow-500/10';
    return 'border-red-500/30 bg-red-500/10';
  };

  return (
    <motion.div 
      className={`backdrop-blur-lg rounded-2xl p-6 border border-white/20 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center space-x-3 mb-6">
        <Shield className="w-6 h-6 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">Status de Verificação</h3>
      </div>

      {verificationSummary?.isReady ? (
        <motion.div 
          className="bg-green-500/10 rounded-xl p-4 border border-green-500/30 mb-6"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <div>
              <h4 className="font-semibold text-white">Todas as verificações completas!</h4>
              <p className="text-green-200 text-sm">Você está pronto para assinar o Premium.</p>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/30 mb-6">
          <p className="text-white/80 text-sm leading-relaxed">
            {verificationSummary?.message || 'Complete as verificações abaixo para poder assinar o Premium.'}
          </p>
        </div>
      )}

      {/* Lista de Verificações */}
      <div className="space-y-4 mb-6">
        {verificationItems.map((item, index) => (
          <motion.div
            key={item.id}
            className={`rounded-xl p-4 border transition-all duration-300 ${getStatusColor(item.status, item.isNext)}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <item.icon className="w-6 h-6 text-white/70" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-white">{item.title}</h4>
                <p className="text-white/60 text-sm">{item.description}</p>
              </div>
              <div className="flex-shrink-0">
                {getStatusIcon(item.status, item.isNext)}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Botão de Ação */}
      {!verificationSummary?.isReady && verificationSummary?.nextStepUrl && (
        <Button
          onClick={handleContinueVerification}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
        >
          Continuar Verificação
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      )}
    </motion.div>
  );
};

VerificationStatus.propTypes = {
  onStatusChange: PropTypes.func,
  className: PropTypes.string
};

export default VerificationStatus;