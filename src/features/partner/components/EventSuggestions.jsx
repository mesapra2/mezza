// src/components/partner/EventSuggestions.jsx
// import React from 'react';
import { Link } from 'react-router-dom';
// Corrigido: Removido 'CalendarPlus' que não estava sendo usado
import { Lightbulb, ArrowRight } from 'lucide-react'; 
import { Button } from '@/features/shared/components/ui/button'; // Importe seu componente de botão

// Dados fictícios
const mockSuggestions = [
  {
    id: 1,
    title: 'Noite de Degustação de Vinhos',
    description: 'Atraia entusiastas de vinho com um evento de degustação harmonizado.',
    cta: 'Criar Evento de Degustação',
    link: '/criar-evento', // Link genérico por enquanto
  },
  {
    id: 2,
    title: 'Música ao Vivo Acústica',
    description: 'Crie um ambiente relaxante com música ao vivo para o jantar.',
    cta: 'Agendar Música ao Vivo',
    link: '/criar-evento',
  },
  {
    id: 3,
    title: 'Happy Hour Temático',
    description: 'Aumente o movimento durante a semana com um happy hour temático.',
    cta: 'Lançar Happy Hour',
    link: '/criar-evento',
  },
];

const EventSuggestions = () => {
  return (
    <div className="glass-effect rounded-2xl p-6 border border-white/10">
      <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-yellow-400" />
        Sugestões para seu Restaurante
      </h2>

      <div className="space-y-4">
        {mockSuggestions.map((item) => (
          <div key={item.id} className="glass-effect rounded-lg p-4 border border-white/10">
            <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
            <p className="text-xs text-white/70 mb-3">{item.description}</p>
            <Link to={item.link}>
              <Button
                variant="outline"
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/10 border-white/20"
              >
                {item.cta}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventSuggestions;