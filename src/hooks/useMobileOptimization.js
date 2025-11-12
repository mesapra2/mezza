// src/hooks/useMobileOptimization.js
// ✅ Hook especializado para otimizações mobile
import { useState, useEffect, useCallback, useRef } from 'react';

export const useMobileOptimization = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [deviceSpecs, setDeviceSpecs] = useState({});
  const connectionRef = useRef(null);

  // ✅ Detectar tipo de dispositivo e connection
  useEffect(() => {
    const detectMobile = () => {
      const userAgent = navigator.userAgent;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth < 768;
      return isMobileDevice || isSmallScreen;
    };

    const detectConnection = () => {
      if ('connection' in navigator) {
        connectionRef.current = navigator.connection;
        const connection = navigator.connection;
        
        // Considerar lenta se: 2G, slow-2g, ou effectiveType <= '2g'
        const slowTypes = ['slow-2g', '2g'];
        return slowTypes.includes(connection.effectiveType) || connection.downlink < 1.5;
      }
      return false; // Assumir boa conexão se não conseguir detectar
    };

    const detectDeviceSpecs = () => {
      return {
        cores: navigator.hardwareConcurrency || 2,
        memory: navigator.deviceMemory || 2,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        pixelRatio: window.devicePixelRatio || 1
      };
    };

    setIsMobile(detectMobile());
    setIsSlowConnection(detectConnection());
    setDeviceSpecs(detectDeviceSpecs());

    // ✅ Listener para mudanças de conexão
    const handleConnectionChange = () => {
      setIsSlowConnection(detectConnection());
    };

    // ✅ Listener para mudanças de tela (orientação)
    const handleResize = () => {
      setIsMobile(detectMobile());
    };

    if (connectionRef.current) {
      connectionRef.current.addEventListener('change', handleConnectionChange);
    }
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      if (connectionRef.current) {
        connectionRef.current.removeEventListener('change', handleConnectionChange);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // ✅ Configurações otimizadas baseadas no device
  const getOptimizedSettings = useCallback(() => {
    const baseSettings = {
      animationsEnabled: true,
      lazyLoadThreshold: 100,
      imageQuality: 'high',
      pollingInterval: 30000,
      cacheEnabled: true,
      preloadEnabled: true
    };

    if (isMobile) {
      baseSettings.animationsEnabled = !isSlowConnection;
      baseSettings.lazyLoadThreshold = 50;
      baseSettings.pollingInterval = 60000; // 60s em mobile
      baseSettings.imageQuality = isSlowConnection ? 'low' : 'medium';
    }

    if (isSlowConnection) {
      baseSettings.animationsEnabled = false;
      baseSettings.lazyLoadThreshold = 20;
      baseSettings.pollingInterval = 120000; // 2min em conexão lenta
      baseSettings.imageQuality = 'low';
      baseSettings.preloadEnabled = false;
    }

    if (deviceSpecs.memory && deviceSpecs.memory < 2) {
      baseSettings.cacheEnabled = false;
      baseSettings.preloadEnabled = false;
    }

    return baseSettings;
  }, [isMobile, isSlowConnection, deviceSpecs]);

  // ✅ Helper para lazy loading de componentes
  const shouldLazyLoad = useCallback((componentType = 'default') => {
    if (!isMobile) return false;
    
    const lazyComponents = {
      'social-buttons': true,
      'video-background': true,
      'heavy-animations': true,
      'charts': true,
      'maps': true,
      'default': isSlowConnection
    };

    return lazyComponents[componentType] || lazyComponents.default;
  }, [isMobile, isSlowConnection]);

  // ✅ Helper para otimizar imagens
  const getOptimizedImageProps = useCallback((originalSrc, alt = '') => {
    const settings = getOptimizedSettings();
    
    return {
      src: originalSrc,
      alt,
      loading: 'lazy',
      decoding: 'async',
      style: {
        contentVisibility: 'auto',
        containIntrinsicSize: '300px 200px' // Hint para layout
      },
      // Adicionar breakpoints responsivos se necessário
      ...(isMobile && {
        sizes: '(max-width: 768px) 100vw, 50vw'
      })
    };
  }, [isMobile, getOptimizedSettings]);

  // ✅ Helper para debounce otimizado
  const getOptimizedDebounce = useCallback(() => {
    if (isSlowConnection) return 800; // Mais tempo em conexão lenta
    if (isMobile) return 300; // Tempo médio para mobile
    return 150; // Rápido para desktop
  }, [isMobile, isSlowConnection]);

  // ✅ Helper para batch operations
  const shouldBatchOperations = useCallback(() => {
    return isMobile || isSlowConnection || deviceSpecs.cores < 4;
  }, [isMobile, isSlowConnection, deviceSpecs.cores]);

  // ✅ Configurar viewport para mobile
  const setOptimizedViewport = useCallback(() => {
    if (!isMobile) return;

    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      // Otimizar viewport para performance
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }
  }, [isMobile]);

  // ✅ Aplicar viewport otimizado ao montar
  useEffect(() => {
    setOptimizedViewport();
  }, [setOptimizedViewport]);

  return {
    // Estados
    isMobile,
    isSlowConnection,
    deviceSpecs,
    
    // Configurações
    optimizedSettings: getOptimizedSettings(),
    
    // Helpers
    shouldLazyLoad,
    getOptimizedImageProps,
    getOptimizedDebounce: getOptimizedDebounce(),
    shouldBatchOperations: shouldBatchOperations(),
    
    // Utilitários
    setOptimizedViewport,
    
    // Info para debug
    connectionInfo: connectionRef.current ? {
      effectiveType: connectionRef.current.effectiveType,
      downlink: connectionRef.current.downlink,
      rtt: connectionRef.current.rtt,
      saveData: connectionRef.current.saveData
    } : null
  };
};

export default useMobileOptimization;