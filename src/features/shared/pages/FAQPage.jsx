import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, HelpCircle, MessageCircle, Mail } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

/**
 * Página de FAQ - Perguntas Frequentes
 * Design elegante com busca e categorias
 */
const FAQPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [openItems, setOpenItems] = useState({});

  // Categorias de FAQ
  const categories = [
    { id: 'all', name: 'Todas', icon: HelpCircle },
    { id: 'events', name: 'Eventos', icon: MessageCircle },
    { id: 'account', name: 'Conta', icon: Mail },
    { id: 'premium', name: 'Premium', icon: ChevronUp },
    { id: 'safety', name: 'Segurança', icon: ChevronDown }
  ];

  // Perguntas e respostas organizadas
  const faqData = [
    {
      id: 1,
      category: 'events',
      question: 'Como criar um evento no MesaPra2?',
      answer: 'Para criar um evento, acesse "Criar Evento" no menu principal, escolha um restaurante parceiro, defina data/hora, número de participantes e descrição. Aguarde a aprovação que acontece em até 2 horas.'
    },
    {
      id: 2,
      category: 'events',
      question: 'Posso cancelar um evento após criar?',
      answer: 'Sim, você pode cancelar até 4 horas antes do evento. Após esse prazo, o cancelamento pode gerar penalidades. Acesse "Meus Eventos" para gerenciar.'
    },
    {
      id: 3,
      category: 'account',
      question: 'Como verificar minha identidade?',
      answer: 'Vá em Configurações > Verificação de Identidade. Envie fotos do documento (frente e verso) e uma selfie. A verificação é processada via IA em poucos minutos.'
    },
    {
      id: 4,
      category: 'account',
      question: 'Como alterar meu perfil?',
      answer: 'Acesse Configurações > Perfil. Você pode alterar foto, bio, interesses, configurações de privacidade e preferências de notificação.'
    },
    {
      id: 5,
      category: 'premium',
      question: 'Quais são os benefícios Premium?',
      answer: 'Premium inclui: eventos ilimitados, filtros avançados, prioridade nas participações, chat privado, badges exclusivos e suporte prioritário.'
    },
    {
      id: 6,
      category: 'premium',
      question: 'Como assinar o Premium?',
      answer: 'Acesse a página Premium no menu ou clique em qualquer feature Premium. Complete sua verificação de identidade primeiro, depois escolha o plano mensal ou anual.'
    },
    {
      id: 7,
      category: 'safety',
      question: 'Como funciona a segurança dos eventos?',
      answer: 'Todos os participantes são verificados, eventos acontecem em restaurantes parceiros selecionados, temos sistema de avaliações e suporte 24/7 durante eventos.'
    },
    {
      id: 8,
      category: 'safety',
      question: 'O que fazer em caso de problemas?',
      answer: 'Use o botão de emergência no evento, contate nosso suporte via chat ou WhatsApp, ou acesse Central de Ajuda. Temos protocolos específicos para cada situação.'
    },
    {
      id: 9,
      category: 'events',
      question: 'Como participar de um evento?',
      answer: 'Navegue pelos eventos disponíveis, clique em "Participar", preencha o formulário se solicitado e aguarde aprovação do organizador. Você receberá notificação por push e email.'
    },
    {
      id: 10,
      category: 'account',
      question: 'Como funciona o sistema de avaliações?',
      answer: 'Após cada evento, participants podem avaliar uns aos outros e o restaurante. Avaliações são anônimas e ajudam a manter a qualidade da comunidade.'
    }
  ];

  // Filtrar FAQs
  const filteredFAQs = faqData.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Toggle item accordion
  const toggleItem = (id) => {
    setOpenItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <>
      <Helmet>
        <title>FAQ - Perguntas Frequentes | MesaPra2</title>
        <meta name="description" content="Encontre respostas para as perguntas mais frequentes sobre o MesaPra2 - eventos, conta, premium e segurança." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl mb-6 shadow-2xl">
                <HelpCircle className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-4 bg-gradient-to-r from-purple-200 to-blue-200 bg-clip-text text-transparent">
                Perguntas Frequentes
              </h1>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                Encontre respostas rápidas para as dúvidas mais comuns sobre o MesaPra2
              </p>
            </motion.div>
          </div>

          {/* Busca */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8"
          >
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar pergunta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400"
              />
            </div>
          </motion.div>

          {/* Categorias */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <div className="flex flex-wrap justify-center gap-3">
              {categories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                      activeCategory === category.id
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="text-sm font-medium">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Lista de FAQs */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-4"
          >
            {filteredFAQs.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-white/40" />
                </div>
                <p className="text-white/60">
                  Nenhuma pergunta encontrada para "{searchTerm}"
                </p>
              </div>
            ) : (
              filteredFAQs.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="glass-effect rounded-2xl border border-white/10 overflow-hidden"
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="w-full px-6 py-4 text-left focus:outline-none focus:bg-white/5 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-white font-semibold pr-4">
                        {item.question}
                      </h3>
                      <div className="flex-shrink-0">
                        {openItems[item.id] ? (
                          <ChevronUp className="w-5 h-5 text-purple-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-white/60" />
                        )}
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {openItems[item.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-4">
                          <div className="border-t border-white/10 pt-4">
                            <p className="text-white/80 leading-relaxed">
                              {item.answer}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </motion.div>

          {/* CTA de contato */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mt-12 p-8 glass-effect rounded-2xl border border-white/10"
          >
            <h3 className="text-white font-bold text-xl mb-3">
              Não encontrou sua resposta?
            </h3>
            <p className="text-white/70 mb-6">
              Nossa equipe está sempre pronta para ajudar você
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat Ao Vivo
              </Button>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <Mail className="w-4 h-4 mr-2" />
                Enviar Email
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default FAQPage;