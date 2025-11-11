<<<<<<< HEAD
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Crown, 
  Heart, 
  MapPin, 
  Users, 
  Calendar, 
  Star, 
  Check, 
  Sparkles,
  Coffee,
  MessageCircle,
  Shield,
  Zap,
  ArrowRight,
  CreditCard,
  Loader2
} from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/features/shared/components/ui/use-toast';
import PremiumFlowService from '@/services/PremiumFlowService';
import { useNavigate } from 'react-router-dom';
import VerificationStatus from '@/components/VerificationStatus';

const Premium = () => {
  const { user, profile, updateProfile } = useAuth();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [isVerified, setIsVerified] = useState(false);
  const navigate = useNavigate();

  const plans = {
    monthly: {
      name: 'Premium Mensal',
      price: 'R$ 29,90',
      period: 'por mês',
      value: 2990, // em centavos
      description: 'Perfeito para começar sua jornada premium'
    },
    annual: {
      name: 'Premium Anual',
      price: 'R$ 299,00',
      period: 'por ano',
      value: 29900, // em centavos
      originalPrice: 'R$ 358,80',
      discount: '17% OFF',
      description: 'Melhor custo-benefício - economize 2 meses!'
    }
  };

  const premiumFeatures = [
    {
      icon: Heart,
      title: 'Eventos Particulares Exclusivos',
      description: 'Crie encontros íntimos em qualquer lugar: sua casa, um parque, uma praia... O limite é sua imaginação!',
      highlight: 'Encontros únicos e personalizados'
    },
    {
      icon: Users,
      title: 'MesaPra2 Personalizado',
      description: 'Convide alguém especial para um jantar romântico ou encontro casual - apenas vocês dois!',
      highlight: 'Conexões autênticas e privadas'
    },
    {
      icon: MapPin,
      title: 'Qualquer Local do Mundo',
      description: 'Não se limite a restaurantes! Organize piqueniques, cafés em casa, jantares no terraço...',
      highlight: 'Liberdade total de localização'
    },
    {
      icon: Calendar,
      title: 'Eventos Ilimitados',
      description: 'Crie quantos eventos quiser, sem restrições. Sua agenda social, suas regras!',
      highlight: 'Sem limites para sua vida social'
    },
    {
      icon: Star,
      title: 'Prioridade nos Matches',
      description: 'Seu perfil aparece primeiro nas buscas e você tem prioridade em eventos populares.',
      highlight: 'Destaque garantido'
    },
    {
      icon: MessageCircle,
      title: 'Chat Privado Avançado',
      description: 'Converse antes dos encontros, compartilhe ideias e crie a conexão perfeita.',
      highlight: 'Comunicação premium'
    },
    {
      icon: Shield,
      title: 'Verificação Premium',
      description: 'Selo de verificação que transmite confiança e autenticidade ao seu perfil.',
      highlight: 'Credibilidade aumentada'
    },
    {
      icon: Sparkles,
      title: 'Suporte VIP 24/7',
      description: 'Atendimento prioritário para resolver qualquer dúvida ou problema rapidamente.',
      highlight: 'Suporte exclusivo'
    }
  ];

  const handleUpgradeToPremium = async () => {
    setIsProcessingPayment(true);
    
    try {
      // Log da tentativa de upgrade
      await PremiumFlowService.logPremiumAttempt(
        user?.id || 'anonymous',
        'upgrade_initiated',
        'started',
        { plan: selectedPlan }
      );

      // Verificar fluxo completo de verificação
      const flowResult = await PremiumFlowService.initiatePremiumFlow(
        user?.id || null,
        selectedPlan
      );

      if (!flowResult.success) {
        // Tratar diferentes tipos de ação necessária
        switch (flowResult.action) {
          case 'require_login':
            toast({
              variant: "destructive",
              title: "Login Necessário",
              description: flowResult.message
            });
            navigate('/login');
            break;

          case 'require_verification':
            toast({
              title: "🔐 Verificação Necessária",
              description: flowResult.message,
              duration: 8000
            });
            
            // Redirecionar para a página de verificação apropriada
            if (flowResult.redirectUrl) {
              navigate(flowResult.redirectUrl);
            }
            break;

          case 'already_premium':
            toast({
              title: "👑 Você já é Premium!",
              description: flowResult.message,
              duration: 5000
            });
            break;

          default:
            toast({
              variant: "destructive",
              title: "Erro",
              description: flowResult.message
            });
        }

        // Log do resultado
        await PremiumFlowService.logPremiumAttempt(
          user?.id || 'anonymous',
          'verification_check',
          flowResult.action,
          { 
            verificationData: flowResult.verificationData,
            redirectUrl: flowResult.redirectUrl 
          }
        );

        return;
      }

      // Se chegou aqui, pode prosseguir para pagamento
      toast({
        title: "✅ Verificações completas!",
        description: "Redirecionando para pagamento...",
        duration: 3000
      });

      // Processar pagamento via service
      const paymentResult = await PremiumFlowService.processPremiumPayment(
        user.id,
        profile,
        selectedPlan,
        plans[selectedPlan]
      );

      if (paymentResult.success && paymentResult.charge) {
        // Log de sucesso
        await PremiumFlowService.logPremiumAttempt(
          user.id,
          'payment_initiated',
          'success',
          { 
            chargeId: paymentResult.charge.id,
            plan: selectedPlan 
          }
        );

        // Redirecionar para pagamento
        window.open(paymentResult.charge.paymentLinkUrl, '_blank');
        
        toast({
          title: "🎉 Redirecionando para pagamento",
          description: "Complete o pagamento para ativar seus benefícios Premium!",
          duration: 5000
        });

      } else {
        throw new Error(paymentResult.error || 'Erro ao processar pagamento');
      }

    } catch (error) {
      console.error('Erro no processo Premium:', error);
      
      // Log do erro
      await PremiumFlowService.logPremiumAttempt(
        user?.id || 'anonymous',
        'upgrade_failed',
        'error',
        { error: error.message }
      );

      toast({
        variant: "destructive",
        title: "Erro no processo",
        description: "Não foi possível processar sua solicitação. Tente novamente."
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
=======
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { toast } from '@/features/shared/components/ui/use-toast';

const Premium = () => {
  const handleAction = () => {
    toast({
      title: "🚧 Funcionalidade em desenvolvimento",
      description: "Esta feature ainda não está implementada—mas você pode solicitá-la no próximo prompt! 🚀",
    });
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
  };

  return (
    <>
      <Helmet>
<<<<<<< HEAD
        <title>Premium - Transforme seus encontros | Mesa Pra 2</title>
        <meta name="description" content="Crie eventos particulares únicos e encontros personalizados. Liberdade total para conectar-se onde quiser!" />
        <meta name="keywords" content="eventos particulares, encontros personalizados, mesa pra 2, premium, dating" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-orange-900">
        {/* Header com Hero Section */}
        <motion.div 
          className="relative overflow-hidden"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20"></div>
          <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10"></div>

          <div className="relative z-10 container mx-auto px-4 py-16 lg:py-24">
            <motion.div 
              className="text-center max-w-4xl mx-auto"
              variants={itemVariants}
            >
              {/* Crown Icon */}
              <motion.div 
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 mb-6"
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <Crown className="w-10 h-10 text-white" />
              </motion.div>

              {/* Title */}
              <motion.h1 
                className="text-4xl lg:text-6xl font-bold text-white mb-6"
                variants={itemVariants}
              >
                Transforme seus{' '}
                <span className="bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent">
                  encontros
                </span>{' '}
                em momentos únicos
              </motion.h1>

              {/* Subtitle */}
              <motion.p 
                className="text-xl lg:text-2xl text-white/80 mb-8 leading-relaxed"
                variants={itemVariants}
              >
                Crie eventos particulares em <strong>qualquer lugar</strong> e convide pessoas especiais para experiências autênticas e inesquecíveis.
              </motion.p>

              {/* CTA Button */}
              <motion.div variants={itemVariants}>
                <Button 
                  onClick={() => document.getElementById('plans-section').scrollIntoView({ behavior: 'smooth' })}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-6 text-lg font-semibold rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Descobrir o Premium
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Features Section */}
        <motion.div 
          className="py-16 lg:py-24 bg-black/20 backdrop-blur-lg"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          <div className="container mx-auto px-4">
            <motion.div 
              className="text-center mb-16"
              variants={itemVariants}
            >
              <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">
                Por que escolher o Premium?
              </h2>
              <p className="text-xl text-white/70 max-w-2xl mx-auto">
                Liberdade total para criar conexões autênticas onde você quiser
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {premiumFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-purple-400/50 transition-all duration-300 group"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-white/70 mb-3 leading-relaxed">
                        {feature.description}
                      </p>
                      <div className="inline-flex items-center text-purple-400 text-sm font-medium">
                        <Star className="w-4 h-4 mr-1" />
                        {feature.highlight}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Plans Section */}
        <motion.div 
          id="plans-section"
          className="py-16 lg:py-24"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
        >
          <div className="container mx-auto px-4">
            <motion.div 
              className="text-center mb-12"
              variants={itemVariants}
            >
              <h2 className="text-3xl lg:text-5xl font-bold text-white mb-4">
                Escolha seu plano
              </h2>
              <p className="text-xl text-white/70">
                Comece sua jornada premium hoje mesmo
              </p>
            </motion.div>

            {/* Plan Selector */}
            <motion.div 
              className="flex justify-center mb-12"
              variants={itemVariants}
            >
              <div className="bg-white/10 backdrop-blur-lg rounded-full p-1 border border-white/20">
                <button
                  onClick={() => setSelectedPlan('monthly')}
                  className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                    selectedPlan === 'monthly'
                      ? 'bg-purple-500 text-white shadow-lg'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setSelectedPlan('annual')}
                  className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                    selectedPlan === 'annual'
                      ? 'bg-purple-500 text-white shadow-lg'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Anual (17% OFF)
                </button>
              </div>
            </motion.div>

            {/* Verification Status */}
            <motion.div 
              className="max-w-lg mx-auto mb-8"
              variants={itemVariants}
            >
              <VerificationStatus 
                onStatusChange={setIsVerified}
                className="bg-white/5"
              />
            </motion.div>

            {/* Plan Card */}
            <motion.div 
              className="max-w-lg mx-auto"
              variants={itemVariants}
              key={selectedPlan}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-lg rounded-3xl p-8 border-2 border-gradient-to-r from-purple-400 to-pink-400 overflow-hidden">
                {/* Discount Badge */}
                {plans[selectedPlan].discount && (
                  <div className="absolute -top-4 -right-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white px-6 py-2 rounded-full text-sm font-bold rotate-12 shadow-lg">
                    {plans[selectedPlan].discount}
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {plans[selectedPlan].name}
                  </h3>
                  <p className="text-white/70 mb-4">
                    {plans[selectedPlan].description}
                  </p>
                  
                  <div className="flex items-baseline justify-center space-x-2">
                    {plans[selectedPlan].originalPrice && (
                      <span className="text-lg text-white/50 line-through">
                        {plans[selectedPlan].originalPrice}
                      </span>
                    )}
                    <span className="text-4xl font-bold text-white">
                      {plans[selectedPlan].price}
                    </span>
                    <span className="text-white/70">
                      {plans[selectedPlan].period}
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-4 mb-8">
                  {premiumFeatures.slice(0, 6).map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-white/80 text-sm">
                        {feature.title}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-white/80 text-sm">
                      E muito mais...
                    </span>
                  </div>
                </div>

                {/* CTA Button */}
                <Button
                  onClick={handleUpgradeToPremium}
                  disabled={isProcessingPayment || profile?.is_premium}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-4 text-lg font-semibold rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : profile?.is_premium ? (
                    <>
                      <Crown className="w-5 h-5 mr-2" />
                      Você já é Premium!
                    </>
                  ) : !user ? (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Fazer Login para Assinar
                    </>
                  ) : !isVerified ? (
                    <>
                      <Shield className="w-5 h-5 mr-2" />
                      Continuar Verificação
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      Assinar Agora
                    </>
                  )}
                </Button>

                {/* Security Badge */}
                <div className="flex items-center justify-center space-x-2 mt-4 text-white/60 text-sm">
                  <Shield className="w-4 h-4" />
                  <span>Pagamento 100% seguro via OpenPix</span>
                </div>
              </div>
            </motion.div>

            {/* Guarantee */}
            <motion.div 
              className="text-center mt-12"
              variants={itemVariants}
            >
              <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-lg rounded-full px-6 py-3 border border-white/20">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="text-white/80">
                  Ativação instantânea após o pagamento
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Social Proof / Testimonials */}
        <motion.div 
          className="py-16 bg-black/30 backdrop-blur-lg"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
        >
          <div className="container mx-auto px-4">
            <motion.div 
              className="text-center"
              variants={itemVariants}
            >
              <h2 className="text-2xl lg:text-4xl font-bold text-white mb-8">
                Junte-se a milhares de pessoas que já transformaram seus encontros
              </h2>
              
              <div className="flex items-center justify-center space-x-8 text-white/60">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400 mb-1">2.5K+</div>
                  <div className="text-sm">Usuários Premium</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-pink-400 mb-1">15K+</div>
                  <div className="text-sm">Eventos Criados</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400 mb-1">98%</div>
                  <div className="text-sm">Satisfação</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
=======
        <title>Premium - Mesapra2</title>
        <meta name="description" content="Upgrade para Premium e desbloqueie recursos exclusivos." />
      </Helmet>
      <div className="text-center py-20">
        <h1 className="text-3xl font-bold gradient-text mb-4">Planos Premium</h1>
        <p className="text-white/60 mb-8">Página em construção</p>
        <button onClick={handleAction} className="px-6 py-3 bg-purple-500 rounded-lg">
          Testar Notificação
        </button>
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
      </div>
    </>
  );
};

export default Premium;