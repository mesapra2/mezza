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
  CheckCircle
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
  const [step, setStep] = useState(1); // 1 ou 2
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
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: personalData.email,
        password: personalData.password,
        options: {
          data: {
            full_name: personalData.fullName,
            profile_type: 'partner'
          }
        }
      });

      if (authError) throw authError;

      const userId = authData.user.id;

      // 2. Criar registro na tabela partners
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .insert({
          cnpj: cleanCNPJ(restaurantData.cnpj),
          name: restaurantData.restaurantName,
          contact_name: restaurantData.contactName,
          description: restaurantData.description,
          email: personalData.email,
          phone: restaurantData.phone.replace(/\D/g, ''),
          website: restaurantData.website || null,
          address: {
            street: restaurantData.street,
            number: restaurantData.number,
            complement: restaurantData.complement,
            neighborhood: restaurantData.neighborhood,
            city: restaurantData.city,
            state: restaurantData.state,
            zip_code: restaurantData.zipCode
          },
          cuisine_type: restaurantData.cuisineType || null,
          price_range: restaurantData.priceRange || null,
          capacity: restaurantData.capacity ? parseInt(restaurantData.capacity) : null,
          owner_id: userId,
          is_verified: false, // Aguarda aprovação manual
          is_active: true,
          type: 'normal',
          photos: []
        })
        .select()
        .single();

      if (partnerError) throw partnerError;

      // 3. Atualizar profile com partner_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          partner_id: partnerData.id,
          profile_type: 'partner',
          username: restaurantData.restaurantName
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      toast({
        title: 'Cadastro realizado com sucesso! 🎉',
        description: 'Seu restaurante está em análise. Você já pode configurar seu perfil!'
      });

      // Redireciona para o dashboard do parceiro
      navigate('/partner/dashboard');

    } catch (error) {
      console.error('Erro no cadastro:', error);
      toast({
        variant: 'destructive',
        title: 'Erro no cadastro',
        description: error.message || 'Tente novamente mais tarde'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Cadastro de Parceiro - Mesapra2</title>
        <meta name="description" content="Cadastre seu restaurante na plataforma Mesapra2" />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <div className="glass-effect rounded-2xl p-8 border border-white/10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4">
                <Store className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold gradient-text mb-2">
                Cadastro de Parceiro
              </h1>
              <p className="text-white/60">
                {step === 1 ? 'Dados pessoais' : 'Dados do restaurante'}
              </p>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className={`w-12 h-2 rounded-full transition-colors ${
                step === 1 ? 'bg-purple-500' : 'bg-green-500'
              }`} />
              <div className={`w-12 h-2 rounded-full transition-colors ${
                step === 2 ? 'bg-purple-500' : 'bg-white/20'
              }`} />
            </div>

            {/* Forms */}
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
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

                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    Próximo: Dados do Restaurante
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </motion.div>
              ) : (
                <motion.form
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleSubmit}
                  className="space-y-6"
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
                        onChange={(e) => setRestaurantData({ 
                          ...restaurantData, 
                          cnpj: formatCNPJ(e.target.value) 
                        })}
                        className="pl-10"
                        maxLength={18}
                        required
                      />
                    </div>
                    <p className="text-xs text-white/40">
                      Verificaremos se o CNPJ já está cadastrado
                    </p>
                  </div>

                  {/* Nome do Restaurante */}
                  <div className="space-y-2">
                    <Label htmlFor="restaurantName">Nome do Restaurante *</Label>
                    <div className="relative">
                      <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input
                        id="restaurantName"
                        type="text"
                        placeholder="Nome fantasia do estabelecimento"
                        value={restaurantData.restaurantName}
                        onChange={(e) => setRestaurantData({ ...restaurantData, restaurantName: e.target.value })}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {/* Nome de Contato */}
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Nome do Responsável *</Label>
                    <Input
                      id="contactName"
                      type="text"
                      placeholder="Nome da pessoa responsável"
                      value={restaurantData.contactName}
                      onChange={(e) => setRestaurantData({ ...restaurantData, contactName: e.target.value })}
                      required
                    />
                  </div>

                  {/* Descrição */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição do Restaurante *</Label>
                    <Textarea
                      id="description"
                      placeholder="Conte sobre seu restaurante, especialidades, diferenciais... (mínimo 20 caracteres)"
                      value={restaurantData.description}
                      onChange={(e) => setRestaurantData({ ...restaurantData, description: e.target.value })}
                      rows={4}
                      required
                    />
                    <p className="text-xs text-white/40">
                      {restaurantData.description.length}/20 caracteres mínimos
                    </p>
                  </div>

                  {/* Telefone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone *</Label>
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
                        <p className="font-semibold mb-1">Aprovação Manual</p>
                        <p className="text-yellow-200/80">
                          Seu restaurante será analisado pela nossa equipe. Você já pode configurar 
                          seu perfil e explorar a plataforma, mas seu estabelecimento só aparecerá 
                          na lista pública após aprovação.
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
            <p className="text-center text-white/60 mt-6 text-sm">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-purple-400 hover:text-purple-300 font-semibold">
                Faça login
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default PartnerRegisterPage;