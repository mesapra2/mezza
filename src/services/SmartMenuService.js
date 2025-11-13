// src/services/SmartMenuService.js
import { supabase } from '@/lib/supabaseClient';

/**
 * Serviço para Cardápio Inteligente - Feature Premium
 * Analisa hashtags selecionadas e sugere cardápios compatíveis
 */
class SmartMenuService {
  
  /**
   * Analisa hashtags e retorna sugestões de cardápio ordenadas por compatibilidade
   * @param {Array<string>} selectedHashtags - Array de hashtags selecionadas pelo usuário
   * @returns {Promise<Array>} - Array de sugestões ordenadas por score
   */
  static async getSuggestionsByHashtags(selectedHashtags) {
    try {
      console.log('🤖 Cardápio Inteligente - Analisando hashtags:', selectedHashtags);
      
      // Buscar todas as sugestões de cardápio
      const { data: suggestions, error } = await supabase
        .from('menu_suggestions')
        .select('*');

      if (error) throw error;

      // Calcular score de compatibilidade para cada sugestão
      const scoredSuggestions = suggestions.map(suggestion => ({
        ...suggestion,
        compatibility_score: this.calculateCompatibilityScore(
          selectedHashtags,
          suggestion.compatible_hashtags
        ),
        matching_hashtags: this.findMatchingHashtags(
          selectedHashtags,
          suggestion.compatible_hashtags
        )
      }));

      // Filtrar apenas sugestões com score > 0 e ordenar por score
      const relevantSuggestions = scoredSuggestions
        .filter(s => s.compatibility_score > 0)
        .sort((a, b) => b.compatibility_score - a.compatibility_score)
        .slice(0, 6); // Máximo 6 sugestões

      console.log('✅ Sugestões encontradas:', relevantSuggestions.length);
      
      return relevantSuggestions;
    } catch (error) {
      console.error('❌ Erro ao buscar sugestões de cardápio:', error);
      return [];
    }
  }

  /**
   * Calcula score de compatibilidade entre hashtags selecionadas e cardápio
   * @param {Array<string>} selectedHashtags 
   * @param {Array<string>} cardapioHashtags 
   * @returns {number} - Score de 0 a 100
   */
  static calculateCompatibilityScore(selectedHashtags, cardapioHashtags) {
    if (!selectedHashtags || !cardapioHashtags) return 0;
    
    const selected = selectedHashtags.map(h => h.toLowerCase());
    const cardapio = cardapioHashtags.map(h => h.toLowerCase());
    
    // Contar hashtags que coincidem
    const matches = selected.filter(hashtag => cardapio.includes(hashtag));
    
    if (matches.length === 0) return 0;
    
    // Score baseado na porcentagem de match + bônus por matches múltiplos
    const baseScore = (matches.length / selected.length) * 100;
    const bonusMultipleMatches = matches.length > 1 ? matches.length * 10 : 0;
    
    return Math.min(100, Math.round(baseScore + bonusMultipleMatches));
  }

  /**
   * Encontra hashtags que coincidem
   * @param {Array<string>} selectedHashtags 
   * @param {Array<string>} cardapioHashtags 
   * @returns {Array<string>} - Hashtags em comum
   */
  static findMatchingHashtags(selectedHashtags, cardapioHashtags) {
    if (!selectedHashtags || !cardapioHashtags) return [];
    
    const selected = selectedHashtags.map(h => h.toLowerCase());
    const cardapio = cardapioHashtags.map(h => h.toLowerCase());
    
    return selected.filter(hashtag => cardapio.includes(hashtag));
  }

  /**
   * Detecta perfil do evento baseado nas hashtags
   * @param {Array<string>} hashtags 
   * @returns {Object} - Perfil detectado
   */
  static detectEventProfile(hashtags) {
    const hashtagsLower = hashtags.map(h => h.toLowerCase());
    
    // Definir perfis e suas hashtags características
    const profiles = {
      casual_social: {
        name: 'Casual e Social',
        description: 'Ambiente descontraído para socializar',
        keywords: ['futebol', 'cerveja', 'descontraído', 'amigos', 'casual', 'boteco'],
        suggestedStyle: 'Cardápios compartilháveis, petiscos, comida de boteco'
      },
      sofisticado_cultural: {
        name: 'Sofisticado e Cultural',
        description: 'Experiência refinada e cultural',
        keywords: ['vinho', 'jazz', 'gourmet', 'sofisticado', 'clássico', 'romântico'],
        suggestedStyle: 'Cardápios autorais, harmonização, apresentação refinada'
      },
      saudavel_consciente: {
        name: 'Saudável e Consciente',
        description: 'Foco em bem-estar e sustentabilidade',
        keywords: ['vegano', 'yoga', 'sustentabilidade', 'saudável', 'natureba', 'orgânico'],
        suggestedStyle: 'Cardápios plant-based, orgânicos, bowls'
      },
      familiar_tradicional: {
        name: 'Familiar e Tradicional',
        description: 'Ambiente acolhedor para família',
        keywords: ['família', 'tradição', 'caseiro', 'conforto', 'domingo'],
        suggestedStyle: 'Cardápios tradicionais, pratos de conforto'
      },
      jovem_moderno: {
        name: 'Jovem e Moderno',
        description: 'Tendências atuais e inovação',
        keywords: ['moderno', 'jovem', 'inovador', 'tecnologia', 'urbano'],
        suggestedStyle: 'Cardápios fusion, apresentação criativa'
      }
    };

    // Calcular score para cada perfil
    let bestProfile = null;
    let bestScore = 0;

    Object.entries(profiles).forEach(([key, profile]) => {
      const matches = hashtagsLower.filter(hashtag => 
        profile.keywords.includes(hashtag)
      );
      
      const score = matches.length;
      
      if (score > bestScore) {
        bestScore = score;
        bestProfile = { 
          ...profile, 
          id: key, 
          score,
          matching_keywords: matches 
        };
      }
    });

    return bestProfile || {
      id: 'generico',
      name: 'Genérico',
      description: 'Perfil não identificado',
      suggestedStyle: 'Cardápios variados',
      score: 0,
      matching_keywords: []
    };
  }

  /**
   * Busca restaurantes compatíveis com as hashtags do evento
   * @param {Array<string>} hashtags 
   * @param {Object} userLocation - { lat, lng }
   * @returns {Promise<Array>} - Restaurantes ordenados por relevância
   */
  static async findCompatibleRestaurants(hashtags, userLocation = null) {
    try {
      // Buscar partners que tenham hashtags compatíveis
      const { data: partners, error } = await supabase
        .from('partners')
        .select(`
          id,
          name,
          description,
          cuisine_type,
          price_range,
          menu_complexity,
          hashtags,
          address,
          phone,
          rating,
          photos,
          accepts_catering
        `)
        .not('hashtags', 'is', null);

      if (error) throw error;

      // Calcular compatibilidade com hashtags do evento
      const scoredPartners = partners
        .map(partner => ({
          ...partner,
          compatibility_score: this.calculateCompatibilityScore(
            hashtags,
            partner.hashtags || []
          ),
          matching_hashtags: this.findMatchingHashtags(
            hashtags,
            partner.hashtags || []
          )
        }))
        .filter(p => p.compatibility_score > 0)
        .sort((a, b) => b.compatibility_score - a.compatibility_score);

      console.log('🏪 Restaurantes compatíveis encontrados:', scoredPartners.length);
      
      return scoredPartners;
    } catch (error) {
      console.error('❌ Erro ao buscar restaurantes compatíveis:', error);
      return [];
    }
  }

  /**
   * Formata sugestão para exibição
   * @param {Object} suggestion 
   * @returns {Object} - Sugestão formatada
   */
  static formatSuggestion(suggestion) {
    const difficultyMap = {
      'facil': { label: 'Fácil', color: 'green', icon: '🟢' },
      'medio': { label: 'Médio', color: 'yellow', icon: '🟡' },
      'elaborado': { label: 'Elaborado', color: 'red', icon: '🔴' }
    };

    const difficulty = difficultyMap[suggestion.difficulty] || difficultyMap['facil'];

    return {
      ...suggestion,
      formatted_difficulty: difficulty,
      course_summary: {
        appetizer: suggestion.appetizer,
        main: suggestion.main_course,
        dessert: suggestion.dessert
      },
      compatibility_percent: `${suggestion.compatibility_score}%`
    };
  }
}

export default SmartMenuService;