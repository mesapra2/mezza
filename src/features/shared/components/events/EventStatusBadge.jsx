// src/features/shared/components/events/EventStatusBadge.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { CheckCircle, XCircle, AlertCircle, Clock, TrendingUp, Award } from 'lucide-react';

/**
 * Componente reutilizável para exibir o status do evento
 */
const EventStatusBadge = ({ status, size = 'md', showIcon = true }) => {
  const statusConfig = {
    'Aberto': {
      color: 'bg-green-500/20 text-green-300 border-green-500/30',
      icon: AlertCircle,
      label: 'Aberto',
      description: 'Aceitando candidaturas'
    },
    'Confirmado': {
      color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      icon: CheckCircle,
      label: 'Confirmado',
      description: 'Vagas preenchidas'
    },
    'Em Andamento': {
      color: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      icon: TrendingUp,
      label: 'Em Andamento',
      description: 'Evento acontecendo agora'
    },
    'Finalizado': {
      color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      icon: Clock,
      label: 'Finalizado',
      description: 'Aguardando avaliações'
    },
    'Concluído': {
      color: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      icon: Award,
      label: 'Concluído',
      description: 'Evento finalizado'
    },
    'Cancelado': {
      color: 'bg-red-500/20 text-red-300 border-red-500/30',
      icon: XCircle,
      label: 'Cancelado',
      description: 'Evento cancelado'
    }
  };

  const config = statusConfig[status] || statusConfig['Aberto'];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
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

// Validação de props
EventStatusBadge.propTypes = {
  /** Status do evento */
  status: PropTypes.oneOf([
    'Aberto',
    'Confirmado',
    'Em Andamento',
    'Finalizado',
    'Concluído',
    'Cancelado'
  ]).isRequired,

  /** Tamanho do badge */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),

  /** Exibir ícone ao lado do texto */
  showIcon: PropTypes.bool
};

// Valores padrão definidos como parâmetros JS (sem defaultProps)

export default EventStatusBadge;