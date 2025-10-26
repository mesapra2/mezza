// src/features/shared/components/events/HashtagSelector.jsx (Corrigido)
import React from 'react';
import PropTypes from 'prop-types'; // 1. Adicionado para corrigir erros de lint
import { Tag } from 'lucide-react';

// Mesmas hashtags usadas na criação de eventos
export const HASHTAGS = {
  premium: [
    'rolêdelancha', 'confraternização', 'vip', 'aniversário', 'churrasnapiscina',
    'wine',
  ],
  comum: [
    'happyhour', 'cafe', 'almoco', 'jantar',
    'drinks', 'cerveja', 'petiscos', 'comidacaseira', 'vegetariano',
    'vegano', 'fitness', 'saudavel', 'pizza', 'hamburguer',
    'sushi', 'churrasco', 'italiana', 'japonesa', 'mexicana',
    'acai', 'rodadadechopp', 'boteco'
  ]
};

/**
 * Componente para selecionar hashtags.
 * Usado no CreateEvent (Padrão) - exibe apenas hashtags COMUNS.
 */
// 2. Removido 'eventType' das props (corrigindo erro de lint)
const HashtagSelector = ({ selectedHashtags, onChange }) => {
  
  // 3. Estado local e useEffect removidos para corrigir erro de ESLint.
  // Usamos a prop 'selectedHashtags' diretamente.
  const localSelected = selectedHashtags.map(tag => tag.toLowerCase());

  const handleToggleHashtag = (tag) => {
    const tagLower = tag.toLowerCase();
    const isSelected = localSelected.includes(tagLower);
    
    let newSelection;
    if (isSelected) {
      // Remove hashtag
      newSelection = localSelected.filter(t => t !== tagLower);
    } else {
      // Adiciona hashtag
      newSelection = [...localSelected, tagLower];
    }
    
    onChange(newSelection);
  };

  const renderHashtagButton = (tag) => {
    const tagLower = tag.toLowerCase();
    const isSelected = localSelected.includes(tagLower);
    
    return (
      <button
        key={tag}
        type="button"
        onClick={() => handleToggleHashtag(tag)}
        className={`
          px-3 py-2 rounded-lg text-sm font-medium transition-all transform hover:scale-105
          ${isSelected 
            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-2 border-purple-400 shadow-lg'
            : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80'
          }
        `}
      >
        #{tag}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 4. Cabeçalho de "Notificações" removido */}

      {/* Contador */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-purple-400" />
          <span className="text-white/80 font-medium">
            Hashtags do Evento
          </span>
        </div>
        {localSelected.length > 0 && (
          <button
            type="button"
            onClick={() => {
              onChange([]);
            }}
            className="text-red-400 hover:text-red-300 text-sm font-medium"
          >
            Limpar todas
          </button>
        )}
      </div>

      {/* 5. Seção de Hashtags Premium REMOVIDA */}

      {/* Hashtags Comuns */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-purple-400" />
          <h4 className="text-white font-semibold">Hashtags Comuns</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {HASHTAGS.comum.map(tag => renderHashtagButton(tag, false))}
        </div>
      </div>

      {/* 6. Seção de "preview" removida */}
    </div>
  );
};

// 7. Adicionada validação de PropTypes para corrigir erros de ESLint
HashtagSelector.propTypes = {
  selectedHashtags: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
};

HashtagSelector.defaultProps = {
  selectedHashtags: [],
};

// 8. O nome do export foi corrigido para bater com o import do CreateEvent.jsx
export default HashtagSelector;