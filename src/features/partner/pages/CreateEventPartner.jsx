// src/pages/CreateEventPartner.jsx
import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Users, Loader, AlertTriangle, Zap } from 'lucide-react'; // Importado Zap
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Label } from '@/features/shared/components/ui/label';
import { Textarea } from '@/features/shared/components/ui/textarea';
import { toast } from '@/features/shared/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

const CreateEventPartner = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // ✅ VERIFICA O STATUS PREMIUM DO PARCEIRO
const isPremiumPartner = profile?.isPremiumPartner === true;

  const [loading, setLoading] = useState(true);
  const [partnerCapacity, setPartnerCapacity] = useState(10);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    vagas: 2,
    acceptedTerms: false,
  });

  // Busca a capacidade máxima (só se for premium)
  useEffect(() => {
    const fetchPartnerCapacity = async () => {
      // ✅ BLOQUEIA SE NÃO FOR PREMIUM
      if (!isPremiumPartner) {
        setError("Apenas Parceiros Premium podem criar eventos institucionais.");
        setLoading(false);
        return;
      }
      if (!profile?.partner_id) {
        setError("Perfil de parceiro não encontrado.");
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase 
          .from('partners')
          .select('capacity')
          .eq('id', profile.partner_id)
          .single();

        if (error) throw error;
        
        if (data && data.capacity > 0) {
          setPartnerCapacity(data.capacity);
          setFormData(prev => ({ ...prev, vagas: data.capacity }));
        } else {
          setPartnerCapacity(10);
          setFormData(prev => ({ ...prev, vagas: 10 }));
          toast({
            title: "Aviso",
            description: "Capacidade não definida no seu perfil. Usando 10 como máximo.",
            variant: "destructive",
          });
        }
      } catch (err) {
        setError("Erro ao buscar capacidade do restaurante.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPartnerCapacity();
  }, [profile, user, isPremiumPartner]); // Adicionado isPremiumPartner

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ Checagem dupla no submit
      if (!isPremiumPartner) {
        throw new Error('Você não tem permissão para criar este evento.');
      }
      if (!formData.acceptedTerms) {
        throw new Error('Você precisa concordar com os Termos de Uso e Políticas para criar um evento');
      }
      if (new Date(formData.start_time) >= new Date(formData.end_time)) {
        throw new Error('A data de término deve ser depois da data de início');
      }
      if (formData.vagas < 1 || formData.vagas > partnerCapacity) {
        throw new Error(`O número de vagas deve estar entre 1 e ${partnerCapacity}`);
      }
      if (!profile?.partner_id) {
        throw new Error("Não foi possível identificar seu restaurante.");
      }

      const eventData = {
        creator_id: user.id,
        event_type: 'institucional',
        title: formData.title,
        description: formData.description,
        start_time: formData.start_time,
        end_time: formData.end_time,
        vagas: parseInt(formData.vagas),
        max_vagas: parseInt(formData.vagas),
        partner_id: profile.partner_id,
        is_paid: false,
        price: 0,
        status: 'Aberto',
        hashtags: ['institucional'],
      };

      const { error } = await supabase
        .from('events')
        .insert([eventData]);

      if (error) throw error;

      toast({
        title: "🎉 Evento criado com sucesso!",
        description: "Seu evento foi publicado. As inscrições são automáticas.",
      });

      navigate('/meus-eventos');

    } catch (error) {
      console.error('Erro ao criar evento:', error);
      toast({
        title: "❌ Erro ao criar evento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  if (loading && !error) { // Mostra loading inicial
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // ✅ Tela de Erro ou Permissão Negada
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">{error}</h2>
        
        {/* Mostra botão de upgrade se for erro de permissão */}
        {!isPremiumPartner ? (
          <>
            <p className="text-white/60 mb-6">Faça o upgrade para criar eventos institucionais.</p>
            <Button
              variant="outline"
              className="border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400"
              // onClick={() => navigate('/partner/planos')}
            >
              <Zap className="w-4 h-4 mr-2" />
              Conhecer Planos Premium
            </Button>
          </>
        ) : (
          <Button onClick={() => navigate('/meus-eventos')}>Voltar</Button>
        )}
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Criar Evento - Mesapra2</title>
      </Helmet>
      <div className="max-w-3xl mx-auto py-6 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">
              Criar Evento Institucional
            </h1>
            <p className="text-white/60 text-lg">
              Crie um evento no seu estabelecimento com inscrição automática.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="glass-effect rounded-2xl p-8 border border-white/10 space-y-6">
            
            <div className="glass-effect rounded-lg p-4 border border-purple-500/30">
              <p className="text-white font-semibold">Local do Evento</p>
              <p className="text-white/70 text-sm">
                Este evento será automaticamente vinculado ao seu restaurante.
              </p>
            </div>

            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">Título do Evento</Label>
              <Input
                id="title"
                name="title"
                placeholder="Ex: Noite de Jazz no Restaurante"
                value={formData.title}
                onChange={handleChange}
                className="glass-effect border-white/10"
                maxLength={100}
                required
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Descreva seu evento, o que os participantes podem esperar..."
                value={formData.description}
                onChange={handleChange}
                className="glass-effect border-white/10 min-h-[120px]"
                maxLength={500}
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
                  min={new Date().toISOString().slice(0, 16)}
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
                  min={formData.start_time}
                  className="glass-effect border-white/10"
                  required
                />
              </div>
            </div>

            {/* Vagas */}
            <div className="space-y-2">
              <Label htmlFor="vagas">Número de Vagas (Lotação)</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <Input
                  id="vagas"
                  name="vagas"
                  type="number"
                  min="1"
                  max={partnerCapacity}
                  value={formData.vagas}
                  onChange={handleChange}
                  className="pl-10 glass-effect border-white/10"
                  required
                />
              </div>
              <p className="text-white/40 text-xs">
                Inscrição automática. Limite máximo baseado na capacidade do seu restaurante: {partnerCapacity}
              </p>
            </div>

            {/* Concordância com Termos */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="acceptedTerms"
                  name="acceptedTerms"
                  checked={formData.acceptedTerms}
                  onChange={handleChange}
                  className="w-5 h-5 mt-0.5 rounded border-white/10 bg-white/5 checked:bg-purple-500"
                  required
                />
                <Label htmlFor="acceptedTerms" className="cursor-pointer text-sm leading-relaxed">
                  Concordo com os Termos de Uso e Políticas de Cancelamento *
                </Label>
              </div>
            </div>

            {/* Botão de Criar */}
            <Button
              type="submit"
              disabled={loading || !formData.acceptedTerms}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-12 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Criando Evento...
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5 mr-2" />
                  Criar Evento
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </>
  );
};

export default CreateEventPartner;