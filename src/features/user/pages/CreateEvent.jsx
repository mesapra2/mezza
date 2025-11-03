// src/features/user/pages/CreateEvent.jsx - ✅ CORRIGIDO

import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Users, Loader } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Label } from '@/features/shared/components/ui/label';
import { Textarea } from '@/features/shared/components/ui/textarea';
import { toast } from '@/features/shared/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import HashtagSelector from '@/features/shared/components/events/HashtagSelector';
import RestaurantSelector from '@/features/shared/components/ui/RestaurantSelector';

const CreateEvent = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    event_type: 'padrao',
    title: '',
    description: '',
    hashtags: [],
    partner_id: null,
    start_time: '',
    end_time: '',
    vagas: 2,
    max_vagas: 2,
    acceptedTerms: false,
  });

  // ✅ CORREÇÃO: Usar useEffect separado com replace: true
  useEffect(() => {
    if (formData.event_type === 'particular') {
      console.log('🔀 Redirecionando para evento particular');
      navigate('/criar-evento/particular', { replace: true });
    } else if (formData.event_type === 'crusher') {
      console.log('🔀 Redirecionando para evento crusher');
      // ✅ Verificar se é premium antes de redirecionar
      if (!profile?.is_premium) {
        toast({
          title: "Premium Necessário",
          description: "Eventos Crusher são exclusivos para membros Premium",
          variant: "destructive",
        });
        setFormData(prev => ({ ...prev, event_type: 'padrao' }));
        return;
      }
      navigate('/criar-evento/crusher', { replace: true });
    }
  }, [formData.event_type, navigate, profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.event_type !== 'padrao') {
        throw new Error('Tipo de evento inválido para este formulário.');
      }

      if (!formData.acceptedTerms) {
        throw new Error('Você precisa concordar com os Termos de Uso e Políticas para criar um evento');
      }

      if (new Date(formData.start_time) >= new Date(formData.end_time)) {
        throw new Error('A data de término deve ser depois da data de início');
      }

      if (formData.vagas < 1 || formData.vagas > 3) {
        throw new Error('O número de vagas deve estar entre 1 e 3');
      }

      if (formData.hashtags.length === 0) {
        throw new Error('Selecione pelo menos uma hashtag');
      }

      if (formData.event_type === 'padrao' && !formData.partner_id) {
        throw new Error('Selecione um restaurante credenciado para eventos padrão');
      }

      const eventData = {
        creator_id: user.id,
        event_type: formData.event_type,
        title: formData.title,
        description: formData.description,
        start_time: formData.start_time,
        end_time: formData.end_time,
        vagas: parseInt(formData.vagas),
        max_vagas: parseInt(formData.max_vagas || formData.vagas),
        partner_id: formData.partner_id,
        is_paid: false,
        price: 0,
        status: 'Aberto',
        hashtags: formData.hashtags,
      };

      const { error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Evento Padrão criado com sucesso!",
        description: "Seu evento foi publicado e está aberto para candidaturas.",
      });

      navigate('/meus-eventos');

    } catch (error) {
      console.error('Erro ao criar evento:', error);
      toast({
        title: "Erro ao criar evento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // ✅ Validação adicional para event_type
    if (name === 'event_type') {
      if ((value === 'particular' || value === 'crusher') && !profile?.is_premium) {
        toast({
          title: "Premium Necessário",
          description: `Eventos ${value === 'particular' ? 'Particulares' : 'Crusher'} são exclusivos para membros Premium`,
          variant: "destructive",
        });
        return;
      }
    }
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const eventTypes = [
    { 
      value: 'padrao', 
      label: 'Padrão', 
      available: true,
      description: 'Evento em restaurante credenciado com aprovação manual'
    },
    { 
      value: 'particular', 
      label: 'Particular', 
      available: !!profile?.is_premium,
      description: 'Evento privado em local de sua escolha (requer Premium)'
    },
    { 
      value: 'crusher', 
      label: 'Crusher', 
      available: !!profile?.is_premium,
      description: 'Convite especial exclusivo para uma pessoa (requer Premium)'
    },
  ];

  const selectedType = eventTypes.find(t => t.value === formData.event_type);

  return (
    <>
      <Helmet>
        <title>Criar Evento - Mesapra2</title>
        <meta name="description" content="Crie um novo evento social e conecte-se com pessoas incríveis." />
      </Helmet>

      <div className="max-w-3xl mx-auto py-6 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">
              Criar Novo Evento
            </h1>
            <p className="text-white/60 text-lg">
              Organize uma experiência incrível
            </p>
          </div>

          <form onSubmit={handleSubmit} className="glass-effect rounded-2xl p-8 border border-white/10 space-y-6">
            {/* Tipo de Evento */}
            <div className="space-y-2">
              <Label htmlFor="event_type">Tipo de Evento</Label>
              <select
                id="event_type"
                name="event_type"
                value={formData.event_type}
                onChange={handleChange}
                className="w-full h-10 rounded-md glass-effect border border-white/10 px-3 text-white bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                style={{
                  colorScheme: 'dark'
                }}
                required
              >
                {eventTypes.map((type) => (
                  <option 
                    key={type.value} 
                    value={type.value}
                    disabled={!type.available}
                    className="bg-slate-900 text-white py-2"
                  >
                    {type.label} {!type.available && type.value !== 'padrao' && '(Requer Premium)'}
                  </option>
                ))}
              </select>
              {selectedType && (
                <p className="text-white/50 text-sm mt-2">{selectedType.description}</p>
              )}
            </div>

            {/* Formulário renderizado condicionalmente (só para 'padrao') */}
            {formData.event_type === 'padrao' && (
              <>
                {/* Título */}
                <div className="space-y-2">
                  <Label htmlFor="title">Título do Evento</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Ex: Jantar de Networking Tech"
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
                  <p className="text-white/40 text-xs">{formData.description.length}/500 caracteres</p>
                </div>

                {/* Hashtags */}
                <HashtagSelector
                  eventType={formData.event_type}
                  selectedHashtags={formData.hashtags}
                  onChange={(hashtags) => setFormData({ ...formData, hashtags })}
                />

                {/* Seleção de Restaurante */}
                <RestaurantSelector
                  value={formData.partner_id}
                  onChange={(partnerId) => setFormData({ ...formData, partner_id: partnerId })}
                  eventType={formData.event_type}
                />

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

                {/* Aviso Importante */}
                <div className="glass-effect rounded-lg p-6 border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg mb-2">
                        Importante - Leia antes de criar
                      </h3>
                      <div className="space-y-2 text-white/80 text-sm">
                        <p className="flex items-start gap-2">
                          <span className="text-purple-400 mt-0.5">•</span>
                          <span>
                            <strong className="text-white">Cancelamento:</strong> Após criar o evento, o cancelamento só poderá ser feito de acordo com as{' '}
                            <a 
                              href="https://mesapra2.com/politica.html" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:text-purple-300 underline"
                            >
                              políticas de cancelamento
                            </a>
                            .
                          </span>
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="text-pink-400 mt-0.5">•</span>
                          <span>
                            <strong className="text-white">Aprovação de Participantes:</strong> Você receberá notificações no app para aprovar ou recusar os pedidos de participação. Mantenha-se atento!
                          </span>
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="text-purple-400 mt-0.5">•</span>
                          <span>
                            <strong className="text-white">Responsabilidade:</strong> Como anfitrião, você é responsável por criar um ambiente agradável e respeitoso para todos os participantes.
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vagas */}
                <div className="space-y-2">
                  <Label htmlFor="vagas">Número de Vagas</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                      id="vagas"
                      name="vagas"
                      type="number"
                      min="1"
                      max="3"
                      value={formData.vagas}
                      onChange={handleChange}
                      className="pl-10 glass-effect border-white/10"
                      required
                    />
                  </div>
                  <p className="text-white/40 text-xs">Mínimo 1, máximo 3 participantes</p>
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
                      Concordo com os{' '}
                      <a 
                        href="https://mesapra2.com/politica.html" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Termos de Uso
                      </a>
                      {' '}e{' '}
                      <a 
                        href="https://mesapra2.com/politica.html" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Políticas de Cancelamento
                      </a>
                      {' '}*
                    </Label>
                  </div>
                  {!formData.acceptedTerms && (
                    <p className="text-yellow-300 text-xs">
                      Você precisa concordar com os termos para criar um evento
                    </p>
                  )}
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
              </>
            )}
            
          </form>
        </motion.div>
      </div>
    </>
  );
};

export default CreateEvent;