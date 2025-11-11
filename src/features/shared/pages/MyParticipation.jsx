import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { useParticipation } from '@/hooks/useParticipation';
<<<<<<< HEAD
import EventStatusBadge from '@/features/shared/components/events/EventStatusBadge';
=======
import EventStatusBadge from '@/components/EventStatusBadge';
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MyParticipations = () => {
  const { participations, loading, cancel } = useParticipation();
  const [filter, setFilter] = useState('todos');

  const handleCancel = async (participationId, eventId) => {
    if (!confirm('Tem certeza que deseja cancelar esta participação?')) return;
    
    const result = await cancel(participationId);
    if (result.success) {
      alert('Participação cancelada com sucesso');
    } else {
      alert(`Erro: ${result.error}`);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pendente: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: Clock, label: 'Pendente' },
      aprovado: { color: 'bg-green-500/20 text-green-300 border-green-500/30', icon: CheckCircle, label: 'Aprovado' },
      rejeitado: { color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: XCircle, label: 'Rejeitado' },
    };
    const badge = badges[status] || badges.pendente;
    const Icon = badge.icon;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const filteredParticipations = filter === 'todos'
    ? participations
    : participations.filter(p => p.status === filter);

  const stats = {
    total: participations.length,
    pendentes: participations.filter(p => p.status === 'pendente').length,
    aprovados: participations.filter(p => p.status === 'aprovado').length,
    rejeitados: participations.filter(p => p.status === 'rejeitado').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Calendar className="w-16 h-16 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Minhas Participações | Mesapra2</title>
      </Helmet>

      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Minhas Participações</h1>
            <p className="text-white/60">Acompanhe seus eventos e candidaturas</p>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-effect rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-purple-400" />
                <p className="text-white/60 text-xs">Total</p>
              </div>
              <p className="text-white text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="glass-effect rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-yellow-400" />
                <p className="text-white/60 text-xs">Pendentes</p>
              </div>
              <p className="text-white text-2xl font-bold">{stats.pendentes}</p>
            </div>
            <div className="glass-effect rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <p className="text-white/60 text-xs">Aprovados</p>
              </div>
              <p className="text-white text-2xl font-bold">{stats.aprovados}</p>
            </div>
            <div className="glass-effect rounded-lg p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-400" />
                <p className="text-white/60 text-xs">Rejeitados</p>
              </div>
              <p className="text-white text-2xl font-bold">{stats.rejeitados}</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            {['todos', 'pendente', 'aprovado', 'rejeitado'].map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
                size="sm"
                className={filter === f 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                  : 'glass-effect border-white/10'
                }
              >
                {f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>

          {/* Lista de Participações */}
          {filteredParticipations.length === 0 ? (
            <div className="glass-effect rounded-2xl p-12 border border-white/10 text-center">
              <Calendar className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/60 text-lg mb-4">
                {filter === 'todos' 
                  ? 'Você ainda não se candidatou a nenhum evento'
                  : `Nenhuma participação ${filter}`}
              </p>
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500">
                Explorar Eventos
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredParticipations.map((participation) => (
                <motion.div
                  key={participation.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-effect rounded-2xl p-6 border border-white/10"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-xl font-semibold text-white">
                          {participation.event.titulo}
                        </h3>
                        {getStatusBadge(participation.status)}
                        <EventStatusBadge status={participation.event.status} size="sm" />
                      </div>
                      <p className="text-white/60 text-sm mb-3">
                        {participation.event.descricao}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-white/60 text-sm">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(participation.event.start_time), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </div>
                    <div className="flex items-center gap-2 text-white/60 text-sm">
                      <MapPin className="w-4 h-4" />
                      {participation.event.localizacao || 'Local a definir'}
                    </div>
                    <div className="flex items-center gap-2 text-white/60 text-sm">
                      <Users className="w-4 h-4" />
                      {participation.event.vagas} vagas disponíveis
                    </div>
                  </div>

                  {/* Mensagem da candidatura */}
                  {participation.mensagem_candidatura && (
                    <div className="glass-effect rounded-lg p-3 border border-white/10 mb-4">
                      <p className="text-white/40 text-xs mb-1">Sua mensagem:</p>
                      <p className="text-white/80 text-sm">"{participation.mensagem_candidatura}"</p>
                    </div>
                  )}

                  {/* Informações adicionais */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/40">
                      Candidatura enviada em {format(new Date(participation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2">
                      {participation.status === 'pendente' && (
                        <Button
                          onClick={() => handleCancel(participation.id, participation.event.id)}
                          variant="outline"
                          size="sm"
                          className="glass-effect border-red-500/30 text-red-300 hover:bg-red-500/20"
                        >
                          Cancelar Candidatura
                        </Button>
                      )}
                      {participation.status === 'aprovado' && (
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-purple-500 to-pink-500"
                        >
                          Ver Detalhes
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Alerta de rejeição */}
                  {participation.status === 'rejeitado' && participation.motivo_rejeicao && (
                    <div className="mt-4 glass-effect rounded-lg p-3 border border-red-500/30 bg-red-500/10">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-red-300 text-sm font-medium mb-1">Motivo da rejeição:</p>
                          <p className="text-red-200/80 text-sm">{participation.motivo_rejeicao}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
};

export default MyParticipations;