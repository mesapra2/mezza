// src/features/user/pages/CreateEventParticular.jsx (Corrigido)
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Loader, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Label } from '@/features/shared/components/ui/label';
import { Textarea } from '@/features/shared/components/ui/textarea';
import { toast } from '@/features/shared/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import EventHashtagSelector from '@/features/shared/components/events/EventHashtagSelector'; //

const CreateEventParticular = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showHashtagError, setShowHashtagError] = useState(false); //
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    hashtags: [],
    cep: '',
    endereco_completo: '',
    start_time: '',
    end_time: '',
    vagas: 2,
    acceptedTerms: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleHashtagsChange = (newHashtags) => {
    setFormData({ ...formData, hashtags: newHashtags });
    setShowHashtagError(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validação dos termos
      if (!formData.acceptedTerms) {
        throw new Error('Você precisa concordar com os Termos de Uso e Políticas');
      }

      // Validações
      if (new Date(formData.start_time) >= new Date(formData.end_time)) {
        throw new Error('A data de término deve ser depois da data de início');
      }

      if (formData.vagas < 1 || formData.vagas > 3) {
        throw new Error('O número de vagas deve estar entre 1 e 3');
      }

      // Valida CEP
      if (!formData.cep || formData.cep.length < 8) {
        throw new Error('Informe um CEP válido');
      }

      // Valida endereço
      if (!formData.endereco_completo || formData.endereco_completo.trim().length < 10) {
        throw new Error('Informe o endereço completo');
      }

      // Valida hashtags (1 premium obrigatória)
      const hasPremium = formData.hashtags.some(tag => 
        ['aniversário', 'confraternização', 'churrascompiscina', 'passeiodelancha', 'cinema'].includes(tag.toLowerCase())
      );

      if (!hasPremium) {
        setShowHashtagError(true);
        throw new Error('Selecione pelo menos uma hashtag premium');
      }

      // Prepara dados do evento
      const eventData = {
        creator_id: user.id,
        event_type: 'particular',
        title: formData.title,
        description: formData.description,
        hashtags: formData.hashtags,
        cep: formData.cep,
        endereco_completo: formData.endereco_completo,
        start_time: formData.start_time,
        end_time: formData.end_time,
        vagas: formData.vagas,
        max_vagas: formData.vagas,
        status: 'Aberto',
      };

      // Insere o evento no Supabase
      const { error } = await supabase
        .from('events')
        .insert([eventData]);

      if (error) throw error;

      toast({
        title: 'Evento Particular criado!',
        description: 'Seu evento foi criado com sucesso.',
      });

      navigate('/meus-eventos');
    } catch (error) {
      console.error('❌ Erro ao criar evento particular:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao criar evento',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Criar Evento Particular - Mesapra2</title>
        <meta name="description" content="Crie um evento particular premium." />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto space-y-8"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-white/70 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold gradient-text">
              Criar Evento Particular
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">Título do Evento</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="glass-effect border-white/10"
                required
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="glass-effect border-white/10 min-h-[120px]"
                required
              />
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <Label>Hashtags</Label>
              {/* CORREÇÃO DO BUG AQUI:
                1. Mudar 'value' para 'selectedHashtags'
                2. Adicionar 'eventType="particular"'
                3. Adicionar 'showError={showHashtagError}'
              */}
              <EventHashtagSelector
                eventType="particular"
                selectedHashtags={formData.hashtags}
                onChange={handleHashtagsChange}
                showError={showHashtagError}
              />
              {showHashtagError && (
                <p className="text-red-300 text-sm">
                  Selecione pelo menos uma hashtag premium
                </p>
              )}
            </div>

            {/* Endereço */}
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                name="cep"
                value={formData.cep}
                onChange={handleChange}
                className="glass-effect border-white/10"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco_completo">Endereço Completo</Label>
              <Input
                id="endereco_completo"
                name="endereco_completo"
                value={formData.endereco_completo}
                onChange={handleChange}
                className="glass-effect border-white/10"
                required
              />
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="start_time">Data e Hora de Início</Label>
                <Input
                  id="start_time"
                  name="start_time"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={handleChange}
                  className="glass-effect border-white/10"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">Data e Hora de Término</Label>
                <Input
                  id="end_time"
                  name="end_time"
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={handleChange}
                  className="glass-effect border-white/10"
                  required
                />
              </div>
            </div>

            {/* Vagas */}
            <div className="space-y-2">
              <Label htmlFor="vagas">Número de Vagas (1-3)</Label>
              <Input
                id="vagas"
                name="vagas"
                type="number"
                min="1"
                max="3"
                value={formData.vagas}
                onChange={handleChange}
                className="glass-effect border-white/10"
                required
              />
            </div>

            {/* Termos */}
            <div className="flex items-start gap-3 glass-effect rounded-lg p-4 border border-white/10">
              <input
                type="checkbox"
                id="acceptedTerms"
                name="acceptedTerms"
                checked={formData.acceptedTerms}
                onChange={handleChange}
                className="mt-1"
                required
              />
              <label htmlFor="acceptedTerms" className="text-sm text-white/80">
                Concordo com os{' '}
                <a href="#" className="text-purple-400 hover:underline">
                  Termos de Uso
                </a>{' '}
                e{' '}
                <a href="#" className="text-purple-400 hover:underline">
                  Políticas de Cancelamento
                </a>
              </label>
            </div>

            {/* Botão Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-12 text-base font-semibold"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Criando Evento...
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5 mr-2" />
                  Criar Evento Particular
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </>
  );
};

export default CreateEventParticular;