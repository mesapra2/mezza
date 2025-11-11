// src/features/partner/pages/PartnerRegisterPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRight, 
  User, 
  Mail, 
  Lock, 
  Store,
  FileText,
  MapPin,
  Phone,
  Globe,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Label } from '@/features/shared/components/ui/label';
import { Textarea } from '@/features/shared/components/ui/textarea';
import { useToast } from '@/features/shared/components/ui/use-toast';
import { 
  formatCNPJ, 
  cleanCNPJ, 
  validateCNPJComplete 
} from '@/utils/validateCNPJ';

const PartnerRegisterPage = () => {
  const [step, setStep] = useState(1); // 1, 2 ou 'success'
  const [loading, setLoading] = useState(false);
  const [cnpjValidating, setCnpjValidating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // ETAPA 1 - Dados Pessoais
  const [personalData, setPersonalData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // ETAPA 2 - Dados do Restaurante
  const [restaurantData, setRestaurantData] = useState({
    cnpj: '',
    restaurantName: '',
    contactName: '',
    description: '',
    phone: '',
    website: '',
    // Endereço
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    // Outros
    cuisineType: '',
    priceRange: '',
    capacity: ''
  });

  // Validação Etapa 1
  const validateStep1 = () => {
    const { fullName, email, password, confirmPassword } = personalData;

    if (!fullName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Por favor, informe seu nome completo'
      });
      return false;
    }

    if (!email.trim() || !email.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'Email inválido',
        description: 'Por favor, informe um email válido'
      });
      return false;
    }

    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres'
      });
      return false;
    }

    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Senhas não conferem',
        description: 'As senhas digitadas não são iguais'
      });
      return false;
    }

    return true;
  };

  // Validação Etapa 2
  const validateStep2 = async () => {
    const { cnpj, restaurantName, contactName, description, phone } = restaurantData;

    if (!cnpj.trim()) {
      toast({
        variant: 'destructive',
        title: 'CNPJ obrigatório',
        description: 'Por favor, informe o CNPJ do estabelecimento'
      });
      return false;
    }

    // Valida CNPJ completo (formato + BD)
    setCnpjValidating(true);
    const validation = await validateCNPJComplete(cnpj);
    setCnpjValidating(false);

    if (!validation.valid) {
      toast({
        variant: 'destructive',
        title: 'CNPJ inválido',
        description: validation.error
      });
      return false;
    }

    if (!restaurantName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome do restaurante obrigatório',
        description: 'Por favor, informe o nome do estabelecimento'
      });
      return false;
    }

    if (!contactName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome de contato obrigatório',
        description: 'Por favor, informe o nome do responsável'
      });
      return false;
    }

    if (!description.trim() || description.length < 20) {
      toast({
        variant: 'destructive',
        title: 'Descrição muito curta',
        description: 'A descrição deve ter pelo menos 20 caracteres'
      });
      return false;
    }

    if (!phone.trim()) {
      toast({
        variant: 'destructive',
        title: 'Telefone obrigatório',
        description: 'Por favor, informe o telefone de contato'
      });
      return false;
    }

    return true;
  };

  // Avançar para Etapa 2
  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  // Voltar para Etapa 1
  const handlePrevStep = () => {
    setStep(1);
  };

  // Submeter cadastro completo
  const handleSubmit = async (e) => {
    e.preventDefault();

    const isValid = await validateStep2();
    if (!isValid) return;

    setLoading(true);

    try {
      console.log('📤 Criando partner via função SQL automatizada...');

      // Montar endereço em formato JSONB
      const address = {
        rua: restaurantData.street || '',
        numero: restaurantData.number || '',
        complemento: restaurantData.complement || '',
        bairro: restaurantData.neighborhood || '',
        cidade: restaurantData.city || '',
        estado: restaurantData.state || '',
        cep: restaurantData.zipCode || ''
      };

      // ✅ CHAMAR A FUNÇÃO SQL QUE FAZ TUDO AUTOMATICAMENTE
      // (cria usuário, profile e partner de uma vez)
      const { data, error: rpcError } = await supabase.rpc('create_partner_complete', {
        p_email: personalData.email.toLowerCase().trim(),
        p_password: personalData.password,
        p_name: restaurantData.restaurantName,
        p_cnpj: cleanCNPJ(restaurantData.cnpj),
        p_phone: restaurantData.phone,
        p_contact_name: restaurantData.contactName || restaurantData.restaurantName,
        p_address: address,
        p_cuisine_type: restaurantData.cuisineType || 'bar',
        p_price_range: restaurantData.priceRange || '$$',
        p_capacity: restaurantData.capacity ? parseInt(restaurantData.capacity) : 50
      });

      if (rpcError) {
        console.error('❌ Erro ao criar partner:', rpcError);
        
        // Tratamento especial para email já cadastrado
        if (rpcError.message.includes('duplicate key') || rpcError.message.includes('already exists')) {
          throw new Error('Este email já está cadastrado. Tente fazer login ou recuperar sua senha.');
        }
        
        throw new Error(rpcError.message || 'Erro ao criar perfil do restaurante');
      }

      if (!data?.success) {
        console.error('❌ Erro retornado pela função:', data);
        throw new Error(data?.error || 'Erro ao criar perfil do restaurante');
      }

      console.log('✅ Partner criado com sucesso!', data);

      // ✅ FAZER LOGIN AUTOMATICAMENTE
      const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
        email: personalData.email.toLowerCase().trim(),
        password: personalData.password
      });

      if (loginError) {
        console.error('❌ Erro no login automático:', loginError);
        // Não falha - apenas mostra tela de sucesso e pede para fazer login
        setStep('success');
        return;
      }

      console.log('✅ Login automático realizado!', authData);

      // ✅ REDIRECIONAR para dashboard do partner
      toast({
        title: 'Cadastro realizado!',
        description: 'Bem-vindo ao Mesapra2! Aguarde aprovação do administrador.'
      });

      setTimeout(() => {
        navigate('/partner/dashboard');
      }, 1500);

    } catch (error) {
      console.error('❌ Erro no cadastro:', error);
      toast({
        variant: 'destructive',
        title: 'Erro no cadastro',
        description: error.message || 'Erro ao criar conta. Tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Tela de sucesso - aguardando confirmação de email
  const SuccessScreen = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6 py-8"
    >
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
          <Mail className="w-10 h-10 text-green-500" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Cadastro Realizado!</h2>
        <p className="text-white/60">
          Enviamos um email de confirmação para:
        </p>
        <p className="text-purple-400 font-semibold">{personalData.email}</p>
      </div>

      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
        <div className="flex items-start gap-3 text-left">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200 space-y-2">
            <p className="font-semibold">Próximos passos:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-200/80">
              <li>Acesse seu email e clique no link de confirmação</li>
              <li>Após confirmar, faça login com seu email e senha</li>
              <li>Configure seu perfil e aguarde aprovação do admin</li>
              <li>Você receberá contato via WhatsApp para verificação</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
        <div className="flex items-start gap-3 text-left">
          <CheckCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200">
            <p className="font-semibold mb-1">Aprovação Manual Necessária</p>
            <p className="text-yellow-200/80">
              Seu restaurante ficará invisível no feed público até que um administrador 
              aprove seu cadastro após conferir os dados e entrar em contato via WhatsApp.
            </p>
          </div>
        </div>
      </div>

      <Button
        onClick={() => navigate('/login')}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
      >
        Ir para Login
      </Button>

      <p className="text-sm text-white/40">
        Não recebeu o email? Verifique sua caixa de spam ou entre em contato conosco.
      </p>
    </motion.div>
  );

  return (
    <>
      <Helmet>
        <title>Cadastro de Parceiro - Mesa Pra 2</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-block p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4"
              >
                <Store className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Cadastro de Parceiro
              </h1>
              <p className="text-white/60">
                {step === 'success' ? 'Cadastro Concluído' : `Etapa ${step} de 2`}
              </p>
            </div>

            {/* Progress Bar */}
            {step !== 'success' && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${step >= 1 ? 'text-purple-400' : 'text-white/40'}`}>
                    Dados Pessoais
                  </span>
                  <span className={`text-sm ${step >= 2 ? 'text-purple-400' : 'text-white/40'}`}>
                    Dados do Restaurante
                  </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    initial={{ width: '0%' }}
                    animate={{ width: `${(step / 2) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            {/* Tela de Sucesso */}
            {step === 'success' && <SuccessScreen />}

            {/* Formulários */}
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.form
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleNextStep();
                  }}
                >
                  {/* Nome Completo */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Seu nome completo"
                        value={personalData.fullName}
                        onChange={(e) => setPersonalData({ ...personalData, fullName: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={personalData.email}
                        onChange={(e) => setPersonalData({ ...personalData, email: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                    <p className="text-xs text-white/40">
                      Enviaremos um email de confirmação para este endereço
                    </p>
                  </div>

                  {/* Senha */}
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={personalData.password}
                        onChange={(e) => setPersonalData({ ...personalData, password: e.target.value })}
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  {/* Confirmar Senha */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Digite a senha novamente"
                        value={personalData.confirmPassword}
                        onChange={(e) => setPersonalData({ ...personalData, confirmPassword: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Botão Próximo */}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    Próxima Etapa
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </motion.form>
              )}

              {step === 2 && (
                <motion.form
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                  onSubmit={handleSubmit}
                >
                  {/* CNPJ */}
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ *</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input
                        id="cnpj"
                        type="text"
                        placeholder="00.000.000/0000-00"
                        value={restaurantData.cnpj}
                        onChange={(e) => setRestaurantData({ ...restaurantData, cnpj: formatCNPJ(e.target.value) })}
                        className="pl-10"
                        required
                        maxLength={18}
                      />
                    </div>
                  </div>

                  {/* Nome do Restaurante */}
                  <div className="space-y-2">
                    <Label htmlFor="restaurantName">Nome do Restaurante *</Label>
                    <div className="relative">
                      <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input
                        id="restaurantName"
                        type="text"
                        placeholder="Nome do estabelecimento"
                        value={restaurantData.restaurantName}
                        onChange={(e) => setRestaurantData({ ...restaurantData, restaurantName: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Nome do Contato */}
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Nome do Responsável *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input
                        id="contactName"
                        type="text"
                        placeholder="Nome do proprietário/gerente"
                        value={restaurantData.contactName}
                        onChange={(e) => setRestaurantData({ ...restaurantData, contactName: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Descrição */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição do Restaurante *</Label>
                    <Textarea
                      id="description"
                      placeholder="Conte um pouco sobre seu restaurante, especialidades, ambiente..."
                      value={restaurantData.description}
                      onChange={(e) => setRestaurantData({ ...restaurantData, description: e.target.value })}
                      className="min-h-[100px]"
                      required
                    />
                    <p className="text-xs text-white/40">
                      {restaurantData.description.length}/20 caracteres mínimos
                    </p>
                  </div>

                  {/* Telefone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone/WhatsApp *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(61) 99999-9999"
                        value={restaurantData.phone}
                        onChange={(e) => setRestaurantData({ ...restaurantData, phone: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                    <p className="text-xs text-white/40">
                      Usaremos este número para confirmar seu cadastro via WhatsApp
                    </p>
                  </div>

                  {/* Website (opcional) */}
                  <div className="space-y-2">
                    <Label htmlFor="website">Website (opcional)</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input
                        id="website"
                        type="url"
                        placeholder="https://seurestaurante.com.br"
                        value={restaurantData.website}
                        onChange={(e) => setRestaurantData({ ...restaurantData, website: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="space-y-4 p-4 rounded-lg bg-white/5 border border-white/10">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Endereço
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="street">Rua/Avenida</Label>
                        <Input
                          id="street"
                          type="text"
                          placeholder="Nome da rua"
                          value={restaurantData.street}
                          onChange={(e) => setRestaurantData({ ...restaurantData, street: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="number">Número</Label>
                        <Input
                          id="number"
                          type="text"
                          placeholder="Nº"
                          value={restaurantData.number}
                          onChange={(e) => setRestaurantData({ ...restaurantData, number: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="complement">Complemento</Label>
                        <Input
                          id="complement"
                          type="text"
                          placeholder="Apto, sala, etc"
                          value={restaurantData.complement}
                          onChange={(e) => setRestaurantData({ ...restaurantData, complement: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="neighborhood">Bairro</Label>
                        <Input
                          id="neighborhood"
                          type="text"
                          placeholder="Bairro"
                          value={restaurantData.neighborhood}
                          onChange={(e) => setRestaurantData({ ...restaurantData, neighborhood: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade</Label>
                        <Input
                          id="city"
                          type="text"
                          placeholder="Cidade"
                          value={restaurantData.city}
                          onChange={(e) => setRestaurantData({ ...restaurantData, city: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="state">Estado</Label>
                        <Input
                          id="state"
                          type="text"
                          placeholder="UF"
                          value={restaurantData.state}
                          onChange={(e) => setRestaurantData({ ...restaurantData, state: e.target.value })}
                          maxLength={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="zipCode">CEP</Label>
                        <Input
                          id="zipCode"
                          type="text"
                          placeholder="00000-000"
                          value={restaurantData.zipCode}
                          onChange={(e) => setRestaurantData({ ...restaurantData, zipCode: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Informações Adicionais */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cuisineType">Tipo de Cozinha</Label>
                      <Input
                        id="cuisineType"
                        type="text"
                        placeholder="Ex: Italiana"
                        value={restaurantData.cuisineType}
                        onChange={(e) => setRestaurantData({ ...restaurantData, cuisineType: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priceRange">Faixa de Preço</Label>
                      <select
                        id="priceRange"
                        value={restaurantData.priceRange}
                        onChange={(e) => setRestaurantData({ ...restaurantData, priceRange: e.target.value })}
                        className="w-full px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white"
                      >
                        <option value="">Selecione</option>
                        <option value="$">$ - Econômico</option>
                        <option value="$$">$$ - Moderado</option>
                        <option value="$$$">$$$ - Caro</option>
                        <option value="$$$$">$$$$ - Premium</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="capacity">Capacidade</Label>
                      <Input
                        id="capacity"
                        type="number"
                        placeholder="Nº de pessoas"
                        value={restaurantData.capacity}
                        onChange={(e) => setRestaurantData({ ...restaurantData, capacity: e.target.value })}
                        min="1"
                      />
                    </div>
                  </div>

                  {/* Aviso sobre aprovação */}
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-yellow-200">
                        <p className="font-semibold mb-1">Processo de Aprovação</p>
                        <p className="text-yellow-200/80">
                          Após confirmar seu email, você poderá fazer login e configurar seu perfil. 
                          No entanto, seu restaurante só aparecerá na lista pública após um 
                          administrador aprovar seu cadastro e entrar em contato via WhatsApp 
                          para confirmar os dados.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botões */}
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      onClick={handlePrevStep}
                      variant="outline"
                      className="flex-1"
                      disabled={loading}
                    >
                      <ArrowLeft className="mr-2 w-4 h-4" />
                      Voltar
                    </Button>

                    <Button
                      type="submit"
                      disabled={loading || cnpjValidating}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      {loading ? 'Cadastrando...' : cnpjValidating ? 'Validando CNPJ...' : 'Finalizar Cadastro'}
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Link para login */}
            {step !== 'success' && (
              <p className="text-center text-white/60 mt-6 text-sm">
                Já tem uma conta?{' '}
                <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold">
                  Faça login
                </Link>
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default PartnerRegisterPage;