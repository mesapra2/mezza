// src/components/partner/LatestAnnouncements.jsx
import React from 'react';
import { Megaphone, X } from 'lucide-react';

// Dados fictícios (substitua por dados do seu backend/CMS)
const mockAnnouncements = [
  {
    id: 1,
    title: 'Nova Funcionalidade: Chat em Eventos!',
    description: 'Agora você pode conversar com os participantes dos seus eventos confirmados.',
    date: '20 de Outubro, 2025',
  },
  {
    id: 2,
    title: 'Prepare-se para o Fim de Ano',
    description: 'Atualize seus horários de funcionamento e crie eventos especiais de Natal e Ano Novo.',
    date: '18 de Outubro, 2025',
  },
];

const LatestAnnouncements = () => {
  const [announcements, setAnnouncements] = React.useState(mockAnnouncements);

  const dismissAnnouncement = (id) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="glass-effect rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-purple-400" />
          Últimos Avisos
        </h2>
        {/* Adicione um link para "Ver todos" se tiver uma página de avisos */}
      </div>

      {announcements.length === 0 ? (
        <p className="text-white/60 text-sm text-center py-4">
          Nenhum aviso novo no momento.
        </p>
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <div key={item.id} className="glass-effect rounded-lg p-4 border border-white/10 relative">
              <button
                onClick={() => dismissAnnouncement(item.id)}
                className="absolute top-2 right-2 text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
              <p className="text-xs text-white/70 mb-2">{item.description}</p>
              <p className="text-xs text-white/50">{item.date}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LatestAnnouncements;