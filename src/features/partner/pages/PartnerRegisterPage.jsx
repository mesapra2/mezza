// src/pages/PartnerRegisterPage.jsx
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Mail, Lock, User, Phone, MapPin, Loader } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/features/shared/components/ui/button';
import { Input } from '@/features/shared/components/ui/input';
import { Label } from '@/features/shared/components/ui/label';
import { Textarea } from '@/features/shared/components/ui/textarea';
import { toast } from '@/features/shared/components/ui/use-toast';

const PartnerRegisterPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Dados pessoais, 2: Dados do restaurante

  const [formData, setFormData] = useState({
    // Dados pessoais
    email: '',
    password: '',
    confirmPassword: '',
    contactName: '',
    phone: '',
    
    // Dados do restaurante
    restaurantName: '',
    cnpj: '',
    description: '',
    address: '',
    city: '',
    state: '',
    cuisine_type: '',
    capacity: 50,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    
    // Validações
    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "As senhas não coincidem",
      });
      return;
    }
    
    if (formData.password.length < 6) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres",
      });
      return;
    }
    
    setStep(2);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Criar usuário no Supabase Auth
      console.log('📝 Criando usuário...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.contactName,
            profile_type: 'partner', // ✅ Importante
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Usuário não foi criado');

      console.log('✅ Usuário criado:', authData.user.id);

      // 2. Criar restaurante na tabela partners
      console.log('🏢 Criando restaurante...');
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .insert({
          name: formData.restaurantName,
          cnpj: formData.cnpj,
          contact_name: formData.contactName,
          email: formData.email,
          phone: formData.phone,
          description: formData.description,
          cuisine_type: formData.cuisine_type,
          capacity: parseInt(formData.capacity),
          address: {
            text: formData.address,
            city: formData.city,
            state: formData.state,
          },
          plan: 'Partner Gratuito', // ✅ Começa gratuito
          is_premium: false, // ✅ Não é premium inicialmente
          is_active: true,
          is_verified: false, // Admin precisa verificar
          type: 'Normal',
          owner_id: authData.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (partnerError) throw partnerError;

      console.log('✅ Restaurante criado:', partnerData.id);

      // 3. Atualizar profile com partner_id
      console.log('🔗 Vinculando profile ao restaurante...');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          partner_id: partnerData.id,
          profile_type: 'partner',
          updated_at: new Date().toISOString(),
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      console.log('✅ Profile vinculado!');

      toast({
        title: "🎉 Cadastro realizado com sucesso!",
        description: "Aguarde a verificação do administrador. Você receberá um email.",
      });

      // Redirecionar para login
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      console.error('❌ Erro no cadastro:', error);
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Cadastro de Parceiros - Mesapra2</title>
      </Helmet>

      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <div className="glass-effect rounded-2xl p-8 border border-white/10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 mb-4">
                <Store className="w-8 h-8 text-purple-400" />
              </div>
              <h1 className="text-3xl font-bold gradient-text mb-2">
                Cadastro de Parceiros
              </h1>
              <p className="text-white/60">
                {step === 1 ? 'Passo 1: Seus dados pessoais' : 'Passo 2: Dados do restaurante'}
              </p>
            </div>

            {/* Progress */}
            <div className="flex items-center justify-center mb-8">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-purple-500' : 'bg-white/10'} text-white font-semibold`}>
                1
              </div>
              <div className={`w-24 h-1 ${step >= 2 ? 'bg-purple-500' : 'bg-white/10'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-purple-500' : 'bg-white/10'} text-white font-semibold`}>
                2
              </div>
            </div>

            {/* Step 1: Dados Pessoais */}
            {step === 1 && (
              <form onSubmit={handleStep1Submit} className="space-y-4">
                <div>
                  <Label htmlFor="contactName">Nome do Responsável</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                      id="contactName"
                      name="contactName"
                      placeholder="Seu nome completo"
                      value={formData.contactName}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="(61) 99999-9999"
                      value={formData.phone}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Digite a senha novamente"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-gradient-to-r from-purple-500 to-pink-500">
                  Próximo Passo
                </Button>
              </form>
            )}

            {/* Step 2: Dados do Restaurante */}
            {step === 2 && (
              <form onSubmit={handleFinalSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="restaurantName">Nome do Restaurante</Label>
                  <Input
                    id="restaurantName"
                    name="restaurantName"
                    placeholder="Ex: Pizzaria do João"
                    value={formData.restaurantName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    name="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpj}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Descreva seu restaurante..."
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="cuisine_type">Tipo de Cozinha</Label>
                  <Input
                    id="cuisine_type"
                    name="cuisine_type"
                    placeholder="Ex: Italiana, Brasileira, Japonesa"
                    value={formData.cuisine_type}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <Label htmlFor="capacity">Capacidade (lotação)</Label>
                  <Input
                    id="capacity"
                    name="capacity"
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="address">Endereço</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-white/40" />
                    <Input
                      id="address"
                      name="address"
                      placeholder="Rua, número, complemento"
                      value={formData.address}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      name="city"
                      placeholder="Brasília"
                      value={formData.city}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      name="state"
                      placeholder="DF"
                      value={formData.state}
                      onChange={handleChange}
                      maxLength={2}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      'Finalizar Cadastro'
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* Footer */}
            <div className="mt-6 text-center text-sm text-white/60">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium">
                Faça login
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default PartnerRegisterPage;