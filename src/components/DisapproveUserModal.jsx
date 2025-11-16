// src/components/DisapproveUserModal.jsx
import { useState, useEffect } from 'react';
import { Button } from '@/features/shared/components/ui/button';
import { Textarea } from '@/features/shared/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/shared/components/ui/dialog';
import { AlertTriangle, Clock, MessageSquare, User, UserX, Loader2 } from 'lucide-react';
import { toast } from '@/features/shared/components/ui/use-toast';
import ResolutionService from '@/services/ResolutionService';

const DisapproveUserModal = ({ 
  isOpen, 
  onClose, 
  eventId, 
  userId, 
  userName,
  hostId,
  onSuccess 
}) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [detailedDescription, setDetailedDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [accidentalTimeCheck, setAccidentalTimeCheck] = useState(null);

  // Verificar prazo para aprovação acidental
  useEffect(() => {
    const checkAccidentalWindow = async () => {
      if (eventId && userId) {
        const timeCheck = await ResolutionService.isWithinAccidentalWindow(eventId, userId);
        setAccidentalTimeCheck(timeCheck);
      }
    };
    
    if (isOpen) {
      checkAccidentalWindow();
    }
  }, [isOpen, eventId, userId]);

  const reasons = ResolutionService.DISAPPROVAL_REASONS;
  const selectedReasonConfig = reasons.find(r => r.code === selectedReason);

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast({
        variant: "destructive",
        title: "Selecione um motivo",
        description: "É necessário selecionar um motivo para a desaprovação."
      });
      return;
    }

    // Validar descrição detalhada se necessária
    if (selectedReasonConfig?.requiresDetailed && (!detailedDescription || detailedDescription.length < 100)) {
      toast({
        variant: "destructive",
        title: "Descrição insuficiente",
        description: "Para este motivo, é necessária uma descrição com pelo menos 100 caracteres."
      });
      return;
    }

    setLoading(true);

    try {
      const result = await ResolutionService.disapproveUser({
        eventId,
        userId,
        hostId,
        reason: selectedReason,
        detailedDescription: selectedReasonConfig?.requiresDetailed ? detailedDescription : undefined
      });

      if (result.success) {
        toast({
          title: "Usuário desaprovado",
          description: result.message,
        });
        onSuccess?.();
        onClose();
      } else {
        toast({
          variant: "destructive",
          title: "Erro ao desaprovar",
          description: result.message
        });
      }

    } catch (error) {
      console.error('Erro:', error);
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: "Ocorreu um erro ao processar a desaprovação."
      });
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setSelectedReason('');
    setDetailedDescription('');
    setAccidentalTimeCheck(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        resetModal();
      }
    }}>
      <DialogContent className="sm:max-w-md glass-effect border border-white/20">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-400">
            <UserX className="w-5 h-5 mr-2" />
            Desaprovar Participante
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Desaprovar: <span className="text-white font-medium">{userName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seleção do motivo */}
          <div className="space-y-3">
            <label className="text-white font-medium">Motivo da desaprovação:</label>
            
            {reasons.map((reason) => {
              const isAccidentalValid = reason.code === 'accidental_approval' 
                ? accidentalTimeCheck?.isValid 
                : true;

              return (
                <div 
                  key={reason.code}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedReason === reason.code
                      ? 'border-purple-500/50 bg-purple-500/10'
                      : isAccidentalValid 
                        ? 'border-white/20 bg-white/5 hover:border-white/30'
                        : 'border-red-500/30 bg-red-500/5 opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => isAccidentalValid && setSelectedReason(reason.code)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="mt-1">
                      {reason.code === 'behavior_chat' && <MessageSquare className="w-4 h-4" />}
                      {reason.code === 'identity_mismatch' && <User className="w-4 h-4" />}
                      {reason.code === 'accidental_approval' && <Clock className="w-4 h-4" />}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{reason.label}</h4>
                      <p className="text-white/60 text-sm mt-1">{reason.description}</p>
                      
                      {reason.requiresDetailed && (
                        <p className="text-yellow-400 text-xs mt-2">
                          * Requer descrição detalhada (mínimo 100 caracteres)
                        </p>
                      )}
                      
                      {reason.code === 'accidental_approval' && accidentalTimeCheck && (
                        <p className={`text-xs mt-2 ${
                          accidentalTimeCheck.isValid ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {accidentalTimeCheck.isValid 
                            ? `✅ Válido (${accidentalTimeCheck.minutesElapsed || 0} min desde aprovação)`
                            : `❌ Prazo expirado (${accidentalTimeCheck.minutesElapsed || 0} min desde aprovação)`
                          }
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Descrição detalhada para identity_mismatch */}
          {selectedReasonConfig?.requiresDetailed && (
            <div className="space-y-2">
              <label className="text-white font-medium">
                Descrição detalhada <span className="text-red-400">*</span>
              </label>
              <Textarea
                value={detailedDescription}
                onChange={(e) => setDetailedDescription(e.target.value)}
                placeholder="Descreva detalhadamente o que aconteceu... (mínimo 100 caracteres)"
                className="glass-effect border-white/20 text-white"
                rows={4}
              />
              <p className="text-xs text-white/60">
                Caracteres: {detailedDescription.length}/100 (mínimo)
              </p>
            </div>
          )}

          {/* Informações sobre comportamento no chat */}
          {selectedReason === 'behavior_chat' && (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <div className="flex items-start space-x-2">
                <MessageSquare className="w-4 h-4 text-yellow-400 mt-0.5" />
                <div className="text-sm text-yellow-300">
                  <p className="font-medium">Análise automática de chat</p>
                  <p className="text-yellow-300/80">
                    O sistema buscará automaticamente todas as mensagens deste usuário 
                    no chat do evento para incluir como evidência no ticket.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Aviso sobre envio para resolutions */}
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-medium">Processo de resolução</p>
                <p className="text-blue-300/80">
                  Esta desaprovação será enviada para nossa equipe de moderação 
                  para análise e possível ação adicional.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-4 border-t border-white/10">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
            className="flex-1 glass-effect border-white/20"
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit}
            disabled={loading || !selectedReason}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <UserX className="w-4 h-4 mr-2" />
                Desaprovar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DisapproveUserModal;