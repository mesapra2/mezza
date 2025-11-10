// src/components/EarlyEndEventModal.jsx
import React, { useState } from 'react';
import { Button } from '@/features/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/shared/components/ui/dialog';
import { Textarea } from '@/features/shared/components/ui/textarea';
import { Label } from '@/features/shared/components/ui/label';
import { AlertTriangle, Clock, CheckCircle, Loader } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/features/shared/components/ui/use-toast';

const EarlyEndEventModal = ({ 
  isOpen, 
  onClose, 
  event,
  userRole, // 'creator' | 'participant'
  onSuccess 
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!event) return;
    
    // Validar motivo
    if (reason.trim().length < 50) {
      toast({
        variant: "destructive",
        title: "Motivo muito curto",
        description: "Por favor, forneça um motivo com pelo menos 50 caracteres."
      });
      return;
    }

    setLoading(true);
    
    try {
      const now = new Date().toISOString();
      
      // Atualizar o evento para finalizado com a nova hora de fim
      const { error: updateError } = await supabase
        .from('events')
        .update({
          status: 'Finalizado',
          end_time: now,
          updated_at: now
        })
        .eq('id', event.id);

      if (updateError) throw updateError;

      // ✅ Marcar TODOS os participantes aprovados como presentes (para eventos encerrados antecipadamente)
      console.log('🎯 Marcando todos participantes como presentes...');
      const { error: attendanceError } = await supabase
        .from('event_participants')
        .update({
          presenca_confirmada: true,
          updated_at: now
        })
        .eq('event_id', event.id)
        .eq('status', 'aprovado');

      if (attendanceError) {
        console.error('❌ Erro ao marcar presenças:', attendanceError);
      } else {
        console.log('✅ Presenças marcadas com sucesso');
      }

      // Criar notificação para todos os participantes
      const { data: participants } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', event.id)
        .eq('status', 'aprovado');

      if (participants && participants.length > 0) {
        const notifications = participants.map(p => ({
          user_id: p.user_id,
          type: 'event_early_end',
          title: 'Evento encerrado antecipadamente',
          message: `O evento "${event.title}" foi encerrado antes do previsto pelo ${userRole === 'creator' ? 'anfitrião' : 'participante'}. Motivo: ${reason.slice(0, 100)}${reason.length > 100 ? '...' : ''}`,
          related_event_id: event.id,
          created_at: now
        }));

        await supabase
          .from('notifications')
          .insert(notifications);
      }

      toast({
        title: "✅ Evento encerrado",
        description: "O evento foi finalizado com sucesso. Os participantes foram notificados."
      });

      // Chamar callback de sucesso
      if (onSuccess) {
        onSuccess();
      }

      // Fechar modal
      onClose();
      setReason('');

    } catch (error) {
      console.error('Erro ao encerrar evento:', error);
      toast({
        variant: "destructive",
        title: "Erro ao encerrar evento",
        description: error.message || "Não foi possível encerrar o evento. Tente novamente."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setReason('');
    }
  };

  if (!event) return null;

  const isEventActive = event.status === 'Em Andamento' || event.status === 'Confirmado';
  const userRoleText = userRole === 'creator' ? 'anfitrião' : 'participante';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-effect border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            Encerrar Evento Antecipadamente
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Forneça um motivo detalhado para o encerramento antecipado do evento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informações do evento */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <h4 className="font-medium text-white mb-1">{event.title}</h4>
            <div className="flex items-center gap-2 text-sm text-white/60">
              <Clock className="w-4 h-4" />
              <span>
                Previsto até: {new Date(event.end_time).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Aviso */}
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-orange-400 font-medium mb-1">
                  Atenção
                </p>
                <p className="text-orange-300/80">
                  Como {userRoleText}, você está solicitando o encerramento antecipado deste evento. 
                  Todos os participantes serão notificados e o fluxo de avaliação será aberto.
                </p>
              </div>
            </div>
          </div>

          {/* Campo de motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-white">
              Motivo do encerramento antecipado *
            </Label>
            <Textarea
              id="reason"
              placeholder="Explique o motivo do encerramento antecipado do evento (mínimo 50 caracteres)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="glass-effect border-white/10 text-white placeholder-white/40 min-h-[100px]"
              disabled={loading}
              maxLength={500}
            />
            <div className="flex justify-between text-xs text-white/60">
              <span>
                {reason.length < 50 
                  ? `Ainda faltam ${50 - reason.length} caracteres` 
                  : '✓ Motivo válido'
                }
              </span>
              <span>{reason.length}/500</span>
            </div>
          </div>

          {/* Aviso sobre consequências */}
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="text-sm text-yellow-300">
              <p className="font-medium mb-1">O que acontece após o encerramento:</p>
              <ul className="space-y-1 text-yellow-200/80 text-xs list-disc list-inside">
                <li>Evento muda para status "Finalizado"</li>
                <li>Participantes recebem notificação</li>
                <li>Fluxo de avaliação é aberto automaticamente</li>
                <li>Hora de fim é atualizada para agora</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 glass-effect border-white/10"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || reason.trim().length < 50}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Encerrando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar Encerramento
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EarlyEndEventModal;