// src/pages/EditEventPagePartner.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Textarea } from '@/features/shared/components/ui/textarea';
import { toast } from '@/features/shared/components/ui/use-toast';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const EditEventPagePartner = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth(); // Pegar usuário e perfil
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partnerCapacity, setPartnerCapacity] = useState(10); // Capacidade

  useEffect(() => {
    const fetchEventAndCapacity = async () => {
      if (!user || !profile?.partner_id) {
        setError("Permissão negada ou perfil de parceiro não encontrado.");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // 1. Buscar dados do evento
        const { data: event, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (eventError) throw eventError;
        if (!event) throw new Error('Evento não encontrado');

        // 2. Verificar permissão (criador E parceiro do evento)
        if (event.creator_id !== user.id || event.partner_id !== profile.partner_id) {
          throw new Error('Você não tem permissão para editar este evento.');
        }

        // 3. Buscar capacidade do restaurante
        const { data: partner, error: partnerError } = await supabase
          .from('partners')
          .select('capacity')
          .eq('id', profile.partner_id)
          .single();

        if (partnerError) throw partnerError;
        if (partner && partner.capacity > 0) {
          setPartnerCapacity(partner.capacity);
        }

        setEventData(event);
      } catch (err) {
        setError(err.message || 'Erro ao carregar dados.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventAndCapacity();
  }, [id, user, profile]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setEventData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validação de vagas
    if (eventData.vagas < 1 || eventData.vagas > partnerCapacity) {
      setError(`O número de vagas deve estar entre 1 e ${partnerCapacity}`);
      setIsSubmitting(false);
      return;
    }

    // eslint-disable-next-line no-unused-vars
    const { id: eventId, created_at, creator_id, partner_id, event_type, ...updateData } = eventData;

    try {
      const { error: updateError } = await supabase
        .from('events')
        .update({
          title: updateData.title,
          description: updateData.description,
          start_time: updateData.start_time,
          end_time: updateData.end_time,
          vagas: updateData.vagas,
          max_vagas: updateData.vagas, // Garante que max_vagas seja igual
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId)
        .eq('creator_id', user.id); // Segurança

      if (updateError) throw updateError;

      toast({ title: "✅ Evento atualizado com sucesso!" });
      navigate('/meus-eventos');

    } catch (err) {
      setError(err.message || 'Erro ao salvar alterações.');
      console.error(err);
      toast({ variant: "destructive", title: "Erro ao salvar", description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">{error}</h2>
        <Button onClick={() => navigate('/meus-eventos')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Meus Eventos
        </Button>
      </div>
    );
  }

  if (!eventData) {
     return <div>Evento não encontrado.</div>;
  }
  
  // Converte datas para formato de input (se existirem)
  const formatDateTimeLocal = (isoString) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toISOString().slice(0, 16);
    } catch (e) {
      return '';
    }
  };

  return (
    <>
      <Helmet>
        <title>Editar: {eventData.title} | Mesapra2</title>
      </Helmet>
      <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/meus-eventos')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Meus Eventos
        </Button>
        <h1 className="text-3xl font-bold text-white mb-6">Editar Evento Institucional</h1>

        <form onSubmit={handleSubmit} className="space-y-6 glass-effect p-8 rounded-2xl border border-white/10">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-white/80 mb-1">Título do Evento</label>
            <Input 
              id="title" 
              name="title" 
              value={eventData.title || ''} 
              onChange={handleChange} 
              required 
              className="glass-effect border-white/10"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-white/80 mb-1">Descrição</label>
            <Textarea 
              id="description" 
              name="description" 
              value={eventData.description || ''} 
              onChange={handleChange} 
              rows={4}
              className="glass-effect border-white/10"
            />
          </div>
          
          {/* Datas */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="start_time" className="block text-sm font-medium text-white/80 mb-1">Data e Hora de Início</label>
                <Input
                  id="start_time"
                  name="start_time"
                  type="datetime-local"
                  value={formatDateTimeLocal(eventData.start_time)}
                  onChange={handleChange}
                  className="glass-effect border-white/10"
                  required
                />
              </div>
              <div>
                <label htmlFor="end_time" className="block text-sm font-medium text-white/80 mb-1">Data e Hora de Término</label>
                <Input
                  id="end_time"
                  name="end_time"
                  type="datetime-local"
                  value={formatDateTimeLocal(eventData.end_time)}
                  onChange={handleChange}
                  min={formatDateTimeLocal(eventData.start_time)}
                  className="glass-effect border-white/10"
                  required
                />
              </div>
            </div>

          <div>
            <label htmlFor="vagas" className="block text-sm font-medium text-white/80 mb-1">Vagas Disponíveis (Lotação)</label>
            <Input 
              id="vagas" 
              name="vagas" 
              type="number" 
              value={eventData.vagas || 0} 
              onChange={handleChange} 
              min="0"
              max={partnerCapacity}
              required 
              className="glass-effect border-white/10"
            />
            <p className="text-xs text-white/50 mt-1">
              Capacidade máxima do seu restaurante: {partnerCapacity}.
            </p>
          </div>

          <div className="flex gap-4 pt-4 border-t border-white/10">
            <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-purple-500 to-pink-500">
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/meus-eventos')} disabled={isSubmitting}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};

export default EditEventPagePartner;