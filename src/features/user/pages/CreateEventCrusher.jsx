import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Loader, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Label } from '@/features/shared/components/ui/label';
import { Textarea } from '@/features/shared/components/ui/textarea';
import { toast } from '@/features/shared/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import EventHashtagSelector from '@/features/shared/components/events/EventHashtagSelector';
import NotificationService from '@/services/NotificationService';

const CreateEventCrusher = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitedUserId = searchParams.get('invite'); // ID da pessoa convidada

  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [invitedUser, setInvitedUser] = useState(null);
  const [showHashtagError, setShowHashtagError] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    hashtags: [],
    cep: '',
    endereco_completo: '',
    start_time: '',
    end_time: '',
    acceptedTerms: false,
  });

  // Carregar dados do usuário convidado
  useEffect(() => {
    if (!invitedUserId) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nenhuma pessoa foi selecionada para o convite.",
      });
      navigate('/people');
      return;
    }

    const fetchInvitedUser = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, allow_pokes')
          .eq('id', invitedUserId)
          .single();

        if (error) throw error;

        if (data.allow_pokes === true) {
          toast({
            variant: "destructive",
            title: "Ops!",
            description: "Esta pessoa aceita cutucadas. Use o botão Cutucar!",
          });
          navigate('/people');
          return;
        }

        setInvitedUser(data);
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar os dados da pessoa.",
        });
        navigate('/people');
      } finally {
        setLoadingUser(false);
      }
    };

    fetchInvitedUser();
  }, [invitedUserId, navigate]);

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
      if (!formData.acceptedTerms) {
        throw new Error('Você precisa concordar com os Termos de Uso e Políticas');
      }

      if (new Date(formData.start_time) >= new Date(formData.end_time)) {
        throw new Error('A data de término deve ser depois da data de início');
      }

      if (!formData.cep || formData.cep.length < 8) {
        throw new Error('Informe um CEP válido');
      }

      if (!formData.endereco_completo || formData.endereco_completo.trim().length < 10) {
        throw new Error('Informe o endereço completo');
      }

      // Valida hashtag premium
      const hasPremium = formData.hashtags.some(tag => 
        ['aniversário', 'confraternização', 'churrascompiscina', 'passeiodelancha', 'cinema'].includes(tag.toLowerCase())
      );

      if (!hasPremium) {
        setShowHashtagError(true);
        throw new Error('Selecione 1 hashtag premium');
      }

      // Cria evento Crusher
      const eventData = {
        creator_id: user.id,
        event_type: 'crusher',
        title: formData.title,
        description: formData.description,
        start_time: formData.start_time,
        end_time: formData.end_time,
        vagas: 1, // Sempre 1 vaga
        max_vagas: 1,
        partner_id: null,
        is_paid: false,
        status: 'Aberto',
        hashtags: formData.hashtags,
        cep: formData.cep.replace(/\D/g, ''),
        endereco_completo: formData.endereco_completo,
        crusher_invited_user_id: invitedUserId, // Pessoa convidada
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (eventError) throw eventError;

      // Cria participação automática com status "pendente" (aguardando aceite)
      const { error: participationError } = await supabase
        .from('event_participants')
        .insert({
          event_id: event.id,
          user_id: invitedUserId,
          status: 'pendente',
          mensagem_candidatura: 'Convite Crusher direto',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (participationError) throw participationError;

      // Notifica a pessoa convidada
      await NotificationService.notifyCrusherInvite(
        invitedUserId,
        event.id,
        invitedUser.username || invitedUser.full_name || 'Usuário',
        formData.title
      );

      toast({
        title: "💘 Convite Crusher Enviado!",
        description: `${invitedUser.username || invitedUser.full_name} receberá seu convite especial.`,
      });

      navigate(`/meus-eventos`);
    } catch (error) {
      console.error('Erro ao criar evento Crusher:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar evento",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Criar Evento Crusher - Mesapra2</title>
        <meta name="description" content="Envie um convite especial para alguém" />
      </Helmet>

      <div className="max-w-3xl mx-auto py-6 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/people')}
              className="mb-4 text-white/60 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            
            <h1 className="text-4xl font-bold gradient-text mb-2">
              Evento Crusher 💘
            </h1>
            <p className="text-white/60 text-lg">
              Convite especial para uma pessoa
            </p>
          </div>

          {/* Card da Pessoa Convidada */}
          <div className="glass-effect rounded-lg p-6 border border-pink-500/30 bg-pink-500/10">
            <div className="flex items-center gap-4 mb-3">
              <Heart className="w-6 h-6 text-pink-400" />
              <h3 className="text-white font-semibold text-lg">Convidando:</h3>
            </div>
            <div className="flex items-center gap-4">
              {invitedUser.avatar_url ? (
                <img
                  src={invitedUser.avatar_url}
                  alt={invitedUser.username}
                  className="w-16 h-16 rounded-full object-cover border-2 border-pink-500/50"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                  {(invitedUser.username || invitedUser.full_name || 'U')[0].toUpperCase()}
                </div>
              )}
              <div>
                <h4 className="text-white font-semibold">
                  {invitedUser.full_name || invitedUser.username}
                </h4>
                {invitedUser.username && (
                  <p className="text-white/60 text-sm">@{invitedUser.username}</p>
                )}
              </div>
            </div>
            <div className="mt-4 p-3 bg-white/5 rounded-lg">
              <p className="text-white/70 text-sm">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                Esta pessoa não aceita cutucadas, então você está enviando um convite Crusher direto para um evento exclusivo.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="glass-effect rounded-2xl p-8 border border-white/10 space-y-6">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">Título do Evento</Label>
              <Input
                id="title"
                name="title"
                placeholder="Ex: Jantar Especial a Dois"
                value={formData.title}
                onChange={handleChange}
                className="glass-effect border-white/10"
                maxLength={100}
                required
              />
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="description">Mensagem para o Convite</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Escreva uma mensagem especial explicando seu convite..."
                value={formData.description}
                onChange={handleChange}
                className="glass-effect border-white/10 min-h-[120px]"
                maxLength={500}
                required
              />
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <Label>Tipo de Evento (Hashtag Premium)</Label>
              <EventHashtagSelector
                eventType="particular"
                selectedHashtags={formData.hashtags}
                onChange={handleHashtagsChange}
                showError={showHashtagError}
              />
            </div>

            {/* CEP */}
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                name="cep"
                placeholder="00000-000"
                value={formData.cep}
                onChange={handleChange}
                className="glass-effect border-white/10"
                maxLength={9}
                required
              />
            </div>

            {/* Endereço */}
            <div className="space-y-2">
              <Label htmlFor="endereco_completo">Endereço Completo</Label>
              <Textarea
                id="endereco_completo"
                name="endereco_completo"
                placeholder="Rua, número, complemento, bairro, cidade..."
                value={formData.endereco_completo}
                onChange={handleChange}
                className="glass-effect border-white/10 min-h-[80px]"
                maxLength={300}
                required
              />
            </div>

            {/* Datas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Info de 1 vaga */}
            <div className="glass-effect rounded-lg p-4 border border-purple-500/30 bg-purple-500/10">
              <p className="text-white/80 text-sm">
                <Heart className="w-4 h-4 inline mr-2 text-pink-400" />
                Eventos Crusher têm apenas 1 vaga - exclusivo para a pessoa convidada.
              </p>
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
                </a>
              </label>
            </div>

            {/* Botão Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 h-12 text-base font-semibold"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Enviando Convite...
                </>
              ) : (
                <>
                  <Heart className="w-5 h-5 mr-2" />
                  Enviar Convite Crusher
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </>
  );
};

export default CreateEventCrusher;