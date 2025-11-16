import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Textarea } from '@/features/shared/components/ui/textarea';
import { toast } from '@/features/shared/components/ui/use-toast';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; // Para verificar permissão

const EditEventPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // Pegar usuário logado
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: rawData, error: fetchError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (!rawData) throw new Error('Evento não encontrado');

        // ✅ CORREÇÃO: Se rawData for um array, pegar o primeiro elemento
        const data = Array.isArray(rawData) ? rawData[0] : rawData;
        
        console.log('🔍 Debug rawData vs processedData:', {
          rawData,
          isRawArray: Array.isArray(rawData),
          processedData: data,
          hasCreatorIdNow: !!data?.creator_id
        });

        // ✅ CORREÇÃO: Verificação robusta de permissão com diagnóstico de undefined
        console.log('🔍 Debug EditEvent - Dados completos:', {
          eventId: data.id,
          eventTitle: data.title,
          eventData: data, // ✅ Ver dados completos do evento
          eventCreatorId: data.creator_id,
          eventCreatorIdType: typeof data.creator_id,
          hasCreatorId: data.hasOwnProperty('creator_id'),
          userObject: user,
          userLoggedId: user?.id,
          userLoggedIdType: typeof user?.id,
          userExists: !!user,
          userIdExists: !!user?.id,
          isEqual: data.creator_id === user?.id,
          isEqualString: String(data.creator_id) === String(user?.id)
        });

        // ✅ Verificar se user está totalmente carregado
        if (!user || !user.id) {
          throw new Error('Sessão de usuário não carregada. Tente recarregar a página.');
        }

        // ✅ CORREÇÃO: Verificar se creator_id existe no evento
        if (!data.creator_id) {
          console.error('❌ creator_id está undefined no evento:', data);
          throw new Error('Erro nos dados do evento: creator_id não encontrado. Tente recarregar a página.');
        }

        // ✅ Verificar permissão com conversão de string
        if (String(data.creator_id) !== String(user.id)) {
          throw new Error(`Acesso negado. Este evento foi criado por outro usuário. (Criador: ${data.creator_id}, Você: ${user.id})`);
        }

        console.log('✅ Permissão confirmada - usuário pode editar este evento');

        setEventData(data);
      } catch (err) {
        setError(err.message || 'Erro ao carregar evento.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) { // ✅ CORREÇÃO: Verificar se user.id existe
        console.log('🚀 Iniciando fetchEvent - user carregado:', user.id);
        fetchEvent();
    } else {
        console.log('⏳ Aguardando user carregar...', { 
          user, 
          hasUser: !!user, 
          hasUserId: !!user?.id 
        });
        setLoading(false); // Para não ficar eternamente carregando
    }
  }, [id, user]); // Depende do ID do evento e do usuário

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setEventData(prev => ({
      ...prev,
      // Garante que 'vagas' seja sempre um número
      [name]: type === 'number' ? parseInt(value, 10) || 0 : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // eslint-disable-next-line no-unused-vars
    const { id: eventId, created_at, creator_id, partner, creator, status, cancelamento_motivo, ...updateData } = eventData;

    try {
      const { error: updateError } = await supabase
        .from('events')
        .update({
            ...updateData,
            updated_at: new Date().toISOString() // Atualiza timestamp
        })
        .eq('id', eventId)
        .eq('creator_id', String(user.id)); // ✅ CORREÇÃO: Usar String para compatibilidade

      if (updateError) throw updateError;

      toast({ title: "✅ Evento atualizado com sucesso!" });
      navigate('/meus-eventos'); // Volta para a lista após salvar

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
        <p className="ml-3 text-white/70">Carregando evento...</p>
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
     // Caso de segurança, já tratado pelo 'error' mas bom ter
     return <div>Evento não encontrado.</div>;
  }

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
        <h1 className="text-3xl font-bold text-white mb-6">Editar Evento</h1>

        <form onSubmit={handleSubmit} className="space-y-6 glass-effect p-8 rounded-2xl border border-white/10">
          {/* Título */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-white/80 mb-1">Título do Evento</label>
            <Input 
              id="title" 
              name="title" 
              value={eventData.title || ''} 
              onChange={handleChange} 
              required 
              className="bg-gray-800 border-gray-700"
            />
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-white/80 mb-1">Descrição</label>
            <Textarea 
              id="description" 
              name="description" 
              value={eventData.description || ''} 
              onChange={handleChange} 
              rows={4}
              className="bg-gray-800 border-gray-700"
            />
          </div>

          {/* Vagas Disponíveis */}
          <div>
            <label htmlFor="vagas" className="block text-sm font-medium text-white/80 mb-1">Vagas Disponíveis</label>
            <Input 
              id="vagas" 
              name="vagas" 
              type="number" 
              value={eventData.vagas || 0} 
              onChange={handleChange} 
              min="0" 
              required 
              className="bg-gray-800 border-gray-700"
            />
            <p className="text-xs text-white/50 mt-1">
              Defina o número atual de vagas ABERTAS. Se aumentar, novas pessoas podem se candidatar.
            </p>
          </div>

          {/* Você pode adicionar outros campos aqui se precisar (data, hora, etc.) */}
          {/* Lembre-se que campos como start_time/end_time precisam de inputs type="datetime-local" */}

          {/* Botões */}
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

export default EditEventPage;