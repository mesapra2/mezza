// src/features/admin/components/ResolutionStats.jsx
import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const ResolutionStats = () => {
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    resolved: 0,
    total: 0,
    avgResolutionTime: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Buscar contagens por status
        const { data: statusCounts, error: statusError } = await supabase
          .from('resolution_tickets')
          .select('status')
          .then(result => {
            if (result.error) throw result.error;
            
            const counts = {
              pending: 0,
              inProgress: 0,
              resolved: 0,
              total: result.data.length
            };

            result.data.forEach(ticket => {
              if (ticket.status === 'pending') counts.pending++;
              else if (ticket.status === 'in_progress') counts.inProgress++;
              else if (ticket.status === 'resolved') counts.resolved++;
            });

            return { data: counts, error: null };
          });

        if (statusError) throw statusError;

        // Calcular tempo médio de resolução (últimos 30 dias)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const { data: resolvedTickets, error: resolvedError } = await supabase
          .from('resolution_tickets')
          .select('created_at, resolved_at')
          .eq('status', 'resolved')
          .gte('resolved_at', thirtyDaysAgo.toISOString());

        if (resolvedError) throw resolvedError;

        let avgResolutionTime = 0;
        if (resolvedTickets && resolvedTickets.length > 0) {
          const totalTime = resolvedTickets.reduce((sum, ticket) => {
            const created = new Date(ticket.created_at);
            const resolved = new Date(ticket.resolved_at);
            return sum + (resolved.getTime() - created.getTime());
          }, 0);
          
          avgResolutionTime = totalTime / resolvedTickets.length / (1000 * 60 * 60); // em horas
        }

        setStats({
          ...statusCounts,
          avgResolutionTime: Math.round(avgResolutionTime * 10) / 10 // 1 casa decimal
        });

      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-effect rounded-xl p-6 border border-white/10 animate-pulse">
            <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-white/20 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Tickets Pendentes',
      value: stats.pending,
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20 border-yellow-500/30'
    },
    {
      title: 'Em Análise',
      value: stats.inProgress,
      icon: AlertTriangle,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20 border-blue-500/30'
    },
    {
      title: 'Resolvidos',
      value: stats.resolved,
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20 border-green-500/30'
    },
    {
      title: 'Tempo Médio (h)',
      value: stats.avgResolutionTime || 0,
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20 border-purple-500/30',
      isTime: true
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <div key={index} className={`glass-effect rounded-xl p-6 border ${stat.bgColor}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm mb-1">{stat.title}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.isTime ? `${stat.value}h` : stat.value}
              </p>
            </div>
            <stat.icon className={`w-8 h-8 ${stat.color}`} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ResolutionStats;