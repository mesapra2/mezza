// src/features/partner/pages/PartnerDashboard.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import LatestAnnouncements from '@/features/partner/components/LatestAnnouncements';
import EventSuggestions from '@/features/partner/components/EventSuggestions';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Award,
  LogOut,
  Star,
} from 'lucide-react';

/**
 * Componente reutilizável para exibir o status do evento
 */
export const EventStatusBadge = ({ status, size = 'md', showIcon = true }) => {
  const statusConfig = {
    Aberto: {
      color: 'bg-green-500/20 text-green-300 border-green-500/30',
      icon: AlertCircle,
      label: 'Aberto',
      description: 'Aceitando candidaturas',
    },
    Confirmado: {
      color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      icon: CheckCircle,
      label: 'Confirmado',
      description: 'Vagas preenchidas',
    },
    'Em Andamento': {
      color: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      icon: TrendingUp,
      label: 'Em Andamento',
      description: 'Evento acontecendo agora',
    },
    Finalizado: {
      color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      icon: Clock,
      label: 'Finalizado',
      description: 'Aguardando avaliações',
    },
    Concluído: {
      color: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      icon: Award,
      label: 'Concluído',
      description: 'Evento finalizado',
    },
    Cancelado: {
      color: 'bg-red-500/20 text-red-300 border-red-500/30',
      icon: XCircle,
      label: 'Cancelado',
      description: 'Evento cancelado',
    },
  };

  const config = statusConfig[status] || statusConfig.Aberto;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium border
        ${config.color} ${sizeClasses[size]}
      `}
      title={config.description}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </span>
  );
};

// Validação de props para EventStatusBadge
EventStatusBadge.propTypes = {
  status: PropTypes.oneOf([
    'Aberto',
    'Confirmado',
    'Em Andamento',
    'Finalizado',
    'Concluído',
    'Cancelado',
  ]).isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showIcon: PropTypes.bool,
};

// ✅ Valores padrão definidos como parâmetros JS (sem defaultProps)

/**
 * Dashboard do Parceiro
 */
const PartnerDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // ✅ Verifica se é Premium Partner
  const isPremiumPartner = profile?.isPremiumPartner === true;

  // Nome do restaurante ou do usuário
  const partnerName =
    profile?.partner_data?.name || profile?.full_name || 'Parceiro';

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <>
      <Helmet>
        <title>Dashboard do Parceiro - Mesapra2</title>
        <meta
          name="description"
          content="Gerencie seu restaurante e eventos."
        />
      </Helmet>

      <div className="space-y-8">
        {/* Cabeçalho com badge Premium e botão de logout */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold gradient-text">
                Bem-vindo(a), {partnerName}!
              </h1>
              {isPremiumPartner && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-sm font-semibold">
                  <Star className="w-4 h-4 fill-yellow-500" />
                  Premium Partner
                </span>
              )}
            </div>
            <p className="text-white/60 text-lg">
              Aqui está um resumo das atividades do seu restaurante.
            </p>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-all duration-200 hover:scale-105"
            title="Sair da conta"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>

        {/* Grid de componentes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <LatestAnnouncements />
          </div>

          <div className="space-y-6">
            <EventSuggestions />
          </div>
        </div>

        {/* Seção futura (comentada) */}
        {/* <div className="glass-effect rounded-2xl p-6 border border-white/10 mt-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Estatísticas Rápidas
          </h2>
          <p className="text-white/60">
            (Em breve: Gráficos de visualizações, eventos criados, etc.)
          </p>
        </div> */}
      </div>
    </>
  );
};

export default PartnerDashboard;