// src/features/admin/pages/ResolutionsFeed.jsx
import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/features/shared/components/ui/button';
import { Badge } from '@/features/shared/components/ui/badge';
import { Textarea } from '@/features/shared/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/shared/components/ui/dialog';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MessageSquare,
  User,
  Filter,
  RefreshCw,
  Eye,
  Edit
} from 'lucide-react';
import { toast } from '@/features/shared/components/ui/use-toast';
import ResolutionService from '@/services/ResolutionService';
import { supabase } from '@/lib/supabaseClient';

const ResolutionsFeed = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    type: 'all'
  });
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const statusOptions = [
    { value: 'all', label: 'Todos os Status' },
    { value: 'pending', label: 'Pendente' },
    { value: 'in_progress', label: 'Em Análise' },
    { value: 'resolved', label: 'Resolvido' },
    { value: 'escalated', label: 'Escalado' }
  ];

  const priorityOptions = [
    { value: 'all', label: 'Todas as Prioridades' },
    { value: 'urgent', label: 'Urgente' },
    { value: 'high', label: 'Alta' },
    { value: 'medium', label: 'Média' },
    { value: 'low', label: 'Baixa' }
  ];

  const typeOptions = [
    { value: 'all', label: 'Todos os Tipos' },
    { value: 'user_disapproval', label: 'Desaprovação de Usuário' },
    { value: 'behavior_issue', label: 'Problema de Comportamento' },
    { value: 'identity_concern', label: 'Questão de Identidade' }
  ];

  // Carregar tickets
  const loadTickets = async () => {
    setLoading(true);
    try {
      const filterParams = {
        status: filters.status !== 'all' ? filters.status : undefined,
        priority: filters.priority !== 'all' ? filters.priority : undefined,
        type: filters.type !== 'all' ? filters.type : undefined,
        limit: 50
      };

      const data = await ResolutionService.getResolutionTickets(filterParams);
      setTickets(data);

    } catch (error) {
      console.error('Erro ao carregar tickets:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os tickets"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [filters]);

  // Atualizar status do ticket
  const updateTicketStatus = async (ticketId, newStatus, resolution = '') => {
    setIsUpdating(true);
    try {
      const updateData = {
        status: newStatus,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'resolved') {
        updateData.resolution = resolution;
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = 'admin'; // TODO: usar ID do admin logado
      }

      const { error } = await supabase
        .from('resolution_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Ticket atualizado",
        description: `Status alterado para: ${newStatus}`
      });

      setSelectedTicket(null);
      setAdminNotes('');
      loadTickets();

    } catch (error) {
      console.error('Erro ao atualizar ticket:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar o ticket"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Renderizar badge de status
  const StatusBadge = ({ status }) => {
    const variants = {
      pending: { variant: "destructive", icon: Clock },
      in_progress: { variant: "default", icon: RefreshCw },
      resolved: { variant: "success", icon: CheckCircle },
      escalated: { variant: "warning", icon: AlertTriangle }
    };
    
    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status === 'pending' ? 'Pendente' :
         status === 'in_progress' ? 'Em Análise' :
         status === 'resolved' ? 'Resolvido' :
         status === 'escalated' ? 'Escalado' : status}
      </Badge>
    );
  };

  // Renderizar badge de prioridade
  const PriorityBadge = ({ priority }) => {
    const colors = {
      urgent: "bg-red-500/20 text-red-400 border-red-500/50",
      high: "bg-orange-500/20 text-orange-400 border-orange-500/50",
      medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
      low: "bg-green-500/20 text-green-400 border-green-500/50"
    };

    return (
      <span className={`px-2 py-1 rounded text-xs border ${colors[priority]}`}>
        {priority === 'urgent' ? 'Urgente' :
         priority === 'high' ? 'Alta' :
         priority === 'medium' ? 'Média' :
         priority === 'low' ? 'Baixa' : priority}
      </span>
    );
  };

  return (
    <>
      <Helmet>
        <title>Feed de Resolutions - Admin</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-7xl mx-auto">
          
          {/* Cabeçalho */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Feed de Resolutions
            </h1>
            <p className="text-white/70">
              Central de moderação e resolução de conflitos
            </p>
          </div>

          {/* Filtros */}
          <div className="glass-effect rounded-xl p-6 border border-white/10 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Filter className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Filtros</span>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={loadTickets}
                disabled={loading}
                className="ml-auto glass-effect border-white/20"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-white/80 text-sm mb-2 block">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full p-2 rounded glass-effect border border-white/20 text-white bg-slate-900/50"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-white/80 text-sm mb-2 block">Prioridade</label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full p-2 rounded glass-effect border border-white/20 text-white bg-slate-900/50"
                >
                  {priorityOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-white/80 text-sm mb-2 block">Tipo</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full p-2 rounded glass-effect border border-white/20 text-white bg-slate-900/50"
                >
                  {typeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Lista de tickets */}
          <div className="space-y-4">
            {loading ? (
              <div className="glass-effect rounded-xl p-8 border border-white/10 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-white/60 mb-4" />
                <p className="text-white/60">Carregando tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="glass-effect rounded-xl p-8 border border-white/10 text-center">
                <AlertTriangle className="w-8 h-8 mx-auto text-white/60 mb-4" />
                <p className="text-white/60">Nenhum ticket encontrado</p>
              </div>
            ) : (
              tickets.map((ticket) => (
                <div key={ticket.id} className="glass-effect rounded-xl p-6 border border-white/10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          Ticket #{ticket.id}
                        </h3>
                        <StatusBadge status={ticket.status} />
                        <PriorityBadge priority={ticket.priority} />
                      </div>
                      
                      <h4 className="text-white font-medium mb-2">{ticket.title}</h4>
                      
                      <div className="text-white/70 text-sm space-y-1">
                        <p>Evento: <span className="text-white">{ticket.event?.title}</span></p>
                        <p>Reportado por: <span className="text-white">{ticket.reporter?.full_name || ticket.reporter?.username}</span></p>
                        <p>Usuário afetado: <span className="text-white">{ticket.affected_user?.full_name || ticket.affected_user?.username}</span></p>
                        <p>Data: <span className="text-white">{new Date(ticket.created_at).toLocaleString('pt-BR')}</span></p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedTicket(ticket)}
                      className="glass-effect border-white/20"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </div>

                  <div className="text-white/80 text-sm bg-slate-900/30 p-3 rounded-lg">
                    {ticket.description.substring(0, 200)}
                    {ticket.description.length > 200 && '...'}
                  </div>

                  {/* Evidências */}
                  {ticket.evidence && (
                    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-yellow-400 text-sm font-medium mb-1">
                        Evidências disponíveis
                      </p>
                      {ticket.evidence.hasChatEvidence && (
                        <p className="text-yellow-300/80 text-xs">
                          📱 Conversas do chat incluídas
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de detalhes do ticket */}
      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-effect border border-white/20">
            <DialogHeader>
              <DialogTitle className="flex items-center text-white">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Ticket #{selectedTicket.id} - {selectedTicket.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Informações gerais */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/80 text-sm">Status</label>
                  <div className="mt-1">
                    <StatusBadge status={selectedTicket.status} />
                  </div>
                </div>
                <div>
                  <label className="text-white/80 text-sm">Prioridade</label>
                  <div className="mt-1">
                    <PriorityBadge priority={selectedTicket.priority} />
                  </div>
                </div>
              </div>

              {/* Descrição completa */}
              <div>
                <label className="text-white/80 text-sm mb-2 block">Descrição Completa</label>
                <div className="bg-slate-900/50 p-4 rounded-lg text-white/90 text-sm whitespace-pre-wrap border border-white/10">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Evidências */}
              {selectedTicket.evidence && selectedTicket.evidence.chatSummary && (
                <div>
                  <label className="text-white/80 text-sm mb-2 block">Evidências do Chat</label>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
                    <pre className="text-yellow-200 text-xs whitespace-pre-wrap">
                      {selectedTicket.evidence.chatSummary}
                    </pre>
                  </div>
                </div>
              )}

              {/* Notas do admin */}
              <div>
                <label className="text-white/80 text-sm mb-2 block">Notas da Administração</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Adicione suas notas sobre este caso..."
                  className="glass-effect border-white/20 text-white"
                  rows={3}
                />
              </div>

              {/* Ações */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                {selectedTicket.status === 'pending' && (
                  <Button
                    onClick={() => updateTicketStatus(selectedTicket.id, 'in_progress')}
                    disabled={isUpdating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Iniciar Análise
                  </Button>
                )}
                
                {selectedTicket.status === 'in_progress' && (
                  <Button
                    onClick={() => updateTicketStatus(selectedTicket.id, 'resolved', 'Caso resolvido pela administração')}
                    disabled={isUpdating}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Marcar como Resolvido
                  </Button>
                )}
                
                <Button
                  onClick={() => updateTicketStatus(selectedTicket.id, 'escalated')}
                  disabled={isUpdating}
                  variant="outline"
                  className="glass-effect border-orange-500/50"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Escalar
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setSelectedTicket(null)}
                  disabled={isUpdating}
                  className="glass-effect border-white/20 ml-auto"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ResolutionsFeed;