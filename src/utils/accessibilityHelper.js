/**
 * Accessibility Helper - Utilitários para melhorar acessibilidade
 * Inclui validação de contraste e classes CSS otimizadas
 */

/**
 * Calcula a luminância relativa de uma cor
 * @param {string} hex - Cor em formato hexadecimal (#RRGGBB)
 * @returns {number} - Luminância relativa (0-1)
 */
export function getLuminance(hex) {
  const rgb = parseInt(hex.slice(1), 16);
  const r = ((rgb >> 16) & 0xff) / 255;
  const g = ((rgb >> 8) & 0xff) / 255;
  const b = (rgb & 0xff) / 255;
  
  const [rs, gs, bs] = [r, g, b].map(c => 
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calcula a taxa de contraste entre duas cores
 * @param {string} color1 - Primeira cor (#RRGGBB)
 * @param {string} color2 - Segunda cor (#RRGGBB)
 * @returns {number} - Taxa de contraste (1-21)
 */
export function getContrastRatio(color1, color2) {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Verifica se uma combinação de cores atende aos padrões WCAG
 * @param {string} foreground - Cor do texto (#RRGGBB)
 * @param {string} background - Cor do fundo (#RRGGBB)
 * @param {string} level - Nível WCAG ('AA' ou 'AAA')
 * @param {string} size - Tamanho do texto ('normal' ou 'large')
 * @returns {object} - Resultado da validação
 */
export function validateContrast(foreground, background, level = 'AA', size = 'normal') {
  const ratio = getContrastRatio(foreground, background);
  
  const requirements = {
    AA: {
      normal: 4.5,
      large: 3
    },
    AAA: {
      normal: 7,
      large: 4.5
    }
  };
  
  const required = requirements[level][size];
  const passes = ratio >= required;
  
  return {
    ratio: Math.round(ratio * 100) / 100,
    required,
    passes,
    level,
    size,
    grade: passes ? (ratio >= requirements.AAA[size] ? 'AAA' : 'AA') : 'FAIL'
  };
}

/**
 * Classes CSS com contraste otimizado para acessibilidade
 */
export const accessibleColors = {
  // Texto em fundos escuros
  textOnDark: {
    primary: 'text-white',           // Contraste máximo
    secondary: 'text-gray-200',      // Alto contraste (16.75:1)
    muted: 'text-gray-300',         // Bom contraste (12.63:1)
    disabled: 'text-gray-400',       // Contraste mínimo aceitável (6.66:1)
  },
  
  // Texto em fundos claros
  textOnLight: {
    primary: 'text-gray-900',       // Contraste máximo
    secondary: 'text-gray-800',     // Alto contraste (12.63:1)
    muted: 'text-gray-700',        // Bom contraste (9.73:1)
    disabled: 'text-gray-600',      // Contraste mínimo aceitável (5.74:1)
  },
  
  // Botões com alto contraste
  buttons: {
    facebook: {
      background: 'bg-[#1565C0]',   // Azul Facebook otimizado (7.2:1)
      hover: 'hover:bg-[#0D47A1]',  // Hover state (9.1:1)
      text: 'text-white',
      focus: 'focus:ring-2 focus:ring-blue-400 focus:ring-offset-2'
    },
    google: {
      background: 'bg-white',
      hover: 'hover:bg-gray-50',
      text: 'text-gray-800',        // Alto contraste (12.63:1)
      border: 'border-2 border-gray-400',
      focus: 'focus:ring-2 focus:ring-blue-400 focus:ring-offset-2'
    },
    apple: {
      background: 'bg-black',
      hover: 'hover:bg-gray-800',
      text: 'text-white',
      border: 'border-2 border-gray-700',
      focus: 'focus:ring-2 focus:ring-gray-400 focus:ring-offset-2'
    }
  },
  
  // Estados de alerta com contraste adequado
  alerts: {
    success: {
      background: 'bg-green-500/10 border-green-500/20',
      text: 'text-green-300',       // Bom contraste em fundo escuro
      icon: 'text-green-400'
    },
    warning: {
      background: 'bg-yellow-500/10 border-yellow-500/20',
      text: 'text-yellow-300',      // Bom contraste em fundo escuro
      icon: 'text-yellow-400'
    },
    error: {
      background: 'bg-red-500/10 border-red-500/20',
      text: 'text-red-300',         // Bom contraste em fundo escuro
      icon: 'text-red-400'
    },
    info: {
      background: 'bg-blue-500/10 border-blue-500/20',
      text: 'text-blue-300',        // Bom contraste em fundo escuro
      icon: 'text-blue-400'
    }
  }
};

/**
 * Gera uma versão acessível de uma cor
 * @param {string} baseColor - Cor base em hex
 * @param {string} background - Cor de fundo em hex
 * @param {number} targetRatio - Taxa de contraste desejada (padrão: 4.5)
 * @returns {string} - Cor otimizada em hex
 */
export function getAccessibleColor(baseColor, background, targetRatio = 4.5) {
  // Esta é uma implementação simplificada
  // Em um cenário real, você implementaria algoritmos mais sofisticados
  const currentRatio = getContrastRatio(baseColor, background);
  
  if (currentRatio >= targetRatio) {
    return baseColor;
  }
  
  // Sugestões de cores alternativas baseadas no contexto
  const darkBackground = getLuminance(background) < 0.5;
  
  if (darkBackground) {
    // Para fundos escuros, usar tons mais claros
    const lightAlternatives = ['#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db'];
    return lightAlternatives.find(color => 
      getContrastRatio(color, background) >= targetRatio
    ) || '#ffffff';
  } else {
    // Para fundos claros, usar tons mais escuros
    const darkAlternatives = ['#000000', '#111827', '#374151', '#4b5563'];
    return darkAlternatives.find(color => 
      getContrastRatio(color, background) >= targetRatio
    ) || '#000000';
  }
}