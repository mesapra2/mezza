import { useState, useEffect } from 'react';

/**
 * Hook para detectar breakpoints responsivos
 * Baseado nos breakpoints do Tailwind CSS
 */
const useResponsive = () => {
  const [breakpoint, setBreakpoint] = useState('sm');
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateBreakpoint = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setWindowSize({ width, height });
      
      if (width >= 1536) {
        setBreakpoint('2xl');
      } else if (width >= 1280) {
        setBreakpoint('xl');
      } else if (width >= 1024) {
        setBreakpoint('lg');
      } else if (width >= 768) {
        setBreakpoint('md');
      } else if (width >= 640) {
        setBreakpoint('sm');
      } else {
        setBreakpoint('xs');
      }
    };

    // Verifica imediatamente
    updateBreakpoint();

    // Debounce para performance
    let timeoutId;
    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateBreakpoint, 100);
    };

    window.addEventListener('resize', debouncedUpdate);
    
    return () => {
      window.removeEventListener('resize', debouncedUpdate);
      clearTimeout(timeoutId);
    };
  }, []);

  // Helpers para verificação de breakpoint
  const isMobile = breakpoint === 'xs' || breakpoint === 'sm';
  const isTablet = breakpoint === 'md';
  const isDesktop = breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl';
  const isSmallScreen = windowSize.width < 768;
  const isLargeScreen = windowSize.width >= 1024;

  return {
    breakpoint,
    windowSize,
    isMobile,
    isTablet,
    isDesktop,
    isSmallScreen,
    isLargeScreen,
    // Utilitários específicos
    is: (bp) => breakpoint === bp,
    isAtLeast: (bp) => {
      const order = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
      const currentIndex = order.indexOf(breakpoint);
      const targetIndex = order.indexOf(bp);
      return currentIndex >= targetIndex;
    },
    isBelow: (bp) => {
      const order = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
      const currentIndex = order.indexOf(breakpoint);
      const targetIndex = order.indexOf(bp);
      return currentIndex < targetIndex;
    }
  };
};

export default useResponsive;