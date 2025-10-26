import React from 'react';
import { Tag, Star, AlertCircle } from 'lucide-react';
import { getHashtagsByEventType, validateEventHashtags } from '@/config/hashtagsConfig';

/**
 * Componente para selecionar hashtags ao criar/editar eventos
 * Mostra hashtags premium APENAS para eventos tipo "particular"
 * Para eventos particulares: 1 premium (obrigatória) + comuns (opcionais)
 * Para outros eventos: apenas comuns
 */
const EventHashtagSelector = ({ 
  eventType = 'padrao', 
  selectedHashtags = [], 
  onChange,
  showError = false 
}) => {
  const { premium, comum } = getHashtagsByEventType(eventType);
  const isParticular = eventType === 'particular';
  
  // Valida hashtags
  const validation = validateEventHashtags(eventType, selectedHashtags);
  const hasError = showError && !validation.valid;

  const handleToggleHashtag = (tag) => {
    const tagLower = tag.toLowerCase();
    const isSelected = selectedHashtags.map(t => t.toLowerCase()).includes(tagLower);
    
    if (isSelected) {
      // Remove hashtag
      onChange(selectedHashtags.filter(t => t.toLowerCase() !== tagLower));
    } else {
      // Adiciona hashtag
      onChange([...selectedHashtags, tagLower]);
    }
  };

  const renderHashtagButton = (tag, isPremium = false) => {
    const tagLower = tag.toLowerCase();
    const isSelected = selectedHashtags.map(t => t.toLowerCase()).includes(tagLower);
    
    return (
      <button
        key={tag}
        type="button"
        onClick={() => handleToggleHashtag(tag)}
        className={`
          px-3 py-2 rounded-lg text-sm font-medium transition-all transform hover:scale-105
          ${isSelected 
            ? isPremium
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-2 border-yellow-400 shadow-lg'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-2 border-purple-400 shadow-lg'
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
      {/* Aviso de Erro de Validação */}
      {hasError && (
        <div className="glass-effect rounded-lg p-4 border border-red-500/30 bg-red-500/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-red-300 font-semibold mb-1">Atenção!</h4>
              <p className="text-red-200/80 text-sm">{validation.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Hashtags Premium - APENAS para eventos particulares */}
      {isParticular && premium.length > 0 && (
        <div className="space-y-3">
          <div className="glass-effect rounded-lg p-4 border border-yellow-500/30 bg-yellow-500/10">
            <div className="flex items-start gap-3">
              <Star className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-yellow-300 font-semibold mb-1">
                  Hashtag Premium - Obrigatória
                </h4>
                <p className="text-yellow-200/80 text-sm">
                  Eventos particulares devem ter <strong>1 hashtag premium</strong> que identifica o tipo do evento.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {premium.map(tag => renderHashtagButton(tag, true))}
          </div>
        </div>
      )}

      {/* Hashtags Comuns */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-purple-400" />
          <h4 className="text-white font-semibold">
            Hashtags Comuns {isParticular ? '(Opcionais)' : ''}
          </h4>
        </div>
        <p className="text-white/60 text-sm">
          {isParticular 
            ? 'Adicione hashtags comuns para ajudar outros usuários a encontrarem seu evento.'
            : 'Escolha hashtags que descrevam seu evento para facilitar a busca.'
          }
        </p>
        <div className="flex flex-wrap gap-2">
          {comum.map(tag => renderHashtagButton(tag, false))}
        </div>
      </div>

      {/* Preview das hashtags selecionadas */}
      {selectedHashtags.length > 0 && (
        <div className="glass-effect rounded-lg p-4 border border-purple-500/30 bg-purple-500/10">
          <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4 text-purple-400" />
            Hashtags do Evento ({selectedHashtags.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedHashtags.map(tag => {
              const isPremiumTag = premium.map(p => p.toLowerCase()).includes(tag.toLowerCase());
              return (
                <span
                  key={tag}
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${
                    isPremiumTag
                      ? 'bg-yellow-500/30 text-yellow-200 border-yellow-400/50'
                      : 'bg-purple-500/30 text-purple-200 border-purple-400/50'
                  }`}
                >
                  {isPremiumTag && <Star className="w-3 h-3 inline mr-1" />}
                  #{tag}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventHashtagSelector;