import React, { useEffect, useState } from 'react';
import { Bell, Tag } from 'lucide-react';
import { HASHTAGS_COMUNS } from '@/config/hashtagsConfig';

/**
 * Componente para selecionar hashtags de interesse
 * Usado no perfil do usuário para receber notificações
 * APENAS hashtags comuns - hashtags premium não aparecem aqui
 */
const HashtagInterestSelector = ({ selectedHashtags = [], onChange }) => {
  // Estado local para garantir sincronização
  const [localSelected, setLocalSelected] = useState([]);

  // Sincroniza com prop quando mudar (normaliza para lowercase)
  useEffect(() => {
    const normalized = selectedHashtags.map(tag => tag.toLowerCase());
    setLocalSelected(normalized);
    console.log('🏷️ Hashtags carregadas:', normalized);
  }, [selectedHashtags]);

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
    
    console.log('🏷️ Nova seleção:', newSelection);
    setLocalSelected(newSelection);
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
      {/* Header */}
      <div className="glass-effect rounded-lg p-4 border border-blue-500/30 bg-blue-500/10">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-blue-300 font-semibold mb-1">
              Notificações de Eventos
            </h4>
            <p className="text-blue-200/80 text-sm">
              Selecione as hashtags dos seus interesses. Você receberá notificações quando novos eventos com essas hashtags forem criados.
            </p>
          </div>
        </div>
      </div>

      {/* Contador */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-purple-400" />
          <span className="text-white/80 font-medium">
            {localSelected.length} {localSelected.length === 1 ? 'hashtag selecionada' : 'hashtags selecionadas'}
          </span>
        </div>
        {localSelected.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setLocalSelected([]);
              onChange([]);
            }}
            className="text-red-400 hover:text-red-300 text-sm font-medium"
          >
            Limpar todas
          </button>
        )}
      </div>

      {/* Hashtags Comuns */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-purple-400" />
          <h4 className="text-white font-semibold">Hashtags Disponíveis</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {HASHTAGS_COMUNS.map(tag => renderHashtagButton(tag))}
        </div>
      </div>

      {/* Hashtags selecionadas (preview) */}
      {localSelected.length > 0 && (
        <div className="glass-effect rounded-lg p-4 border border-purple-500/30 bg-purple-500/10">
          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-400" />
            Você receberá notificações sobre:
          </h4>
          <div className="flex flex-wrap gap-2">
            {localSelected.map(tag => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-purple-500/30 text-purple-200 text-sm font-medium border border-purple-400/50"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HashtagInterestSelector;