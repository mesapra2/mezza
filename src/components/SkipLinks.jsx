// src/components/SkipLinks.jsx
import React from 'react';

/**
 * Componente de links para pular navegação - essencial para acessibilidade
 * Permite que usuários de teclado/screen reader pulem direto ao conteúdo
 */
const SkipLinks = () => {
  return (
    <div className="sr-only focus-within:not-sr-only fixed top-0 left-0 z-[9999] bg-blue-600 text-white">
      <a 
        href="#main-content" 
        className="block p-4 text-white no-underline hover:bg-blue-700 focus:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
      >
        Pular para conteúdo principal
      </a>
      <a 
        href="#navigation" 
        className="block p-4 text-white no-underline hover:bg-blue-700 focus:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
      >
        Ir para navegação
      </a>
    </div>
  );
};

export default SkipLinks;