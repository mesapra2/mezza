import React from 'react';

/**
 * Componente de Logo MesaPra2 - Sistema inteligente que escolhe automaticamente
 * a versão da logo baseada no contexto (claro/escuro)
 */
const MesaPra2Logo = ({ 
  variant = 'auto', // 'auto', 'light', 'dark'
  size = 'md', // 'xs', 'sm', 'md', 'lg', 'xl', 'hero'
  position = 'static', // 'static', 'floating', 'watermark'
  className = '',
  onClick = null,
  animate = false,
  glow = false
}) => {
  // Mapeamento de tamanhos
  const sizeClasses = {
    xs: 'h-6 w-auto',
    sm: 'h-8 w-auto', 
    md: 'h-12 w-auto',
    lg: 'h-16 w-auto',
    xl: 'h-24 w-auto',
    hero: 'h-32 w-auto'
  };

  // Escolher logo baseada no variant
  const getLogoSrc = () => {
    if (variant === 'light') return '/src/assets/logoprime.png';
    if (variant === 'dark') return '/src/assets/logoprimedark.png';
    
    // Auto: detectar se está em contexto escuro
    return '/src/assets/logoprimedark.png'; // Default para dark que funciona melhor
  };

  // Classes base
  const baseClasses = `
    ${sizeClasses[size]}
    transition-all duration-300 ease-out
    ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}
    ${animate ? 'animate-pulse hover:animate-none' : ''}
    ${glow ? 'drop-shadow-[0_0_15px_rgba(147,51,234,0.5)] hover:drop-shadow-[0_0_25px_rgba(147,51,234,0.7)]' : ''}
  `;

  // Classes específicas por posição
  const positionClasses = {
    static: '',
    floating: 'fixed top-4 left-4 z-50 backdrop-blur-sm bg-white/10 rounded-2xl p-3',
    watermark: 'fixed bottom-4 right-4 z-10 opacity-20 hover:opacity-40 pointer-events-none'
  };

  return (
    <div className={`${positionClasses[position]} ${className}`}>
      <img
        src={getLogoSrc()}
        alt="MesaPra2"
        className={baseClasses}
        onClick={onClick}
        draggable={false}
      />
    </div>
  );
};

export default MesaPra2Logo;