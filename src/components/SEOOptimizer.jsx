import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * Componente para otimizações gerais de SEO
 * Aplica configurações globais que melhoram o score do Google
 */
const SEOOptimizer = () => {
  useEffect(() => {
    // Adicionar preload para recursos críticos
    const addPreloadLink = (href, as, type = null) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = as;
      if (type) link.type = type;
      document.head.appendChild(link);
    };

    // Preload de recursos críticos
    addPreloadLink('/fonts/inter.woff2', 'font', 'font/woff2');
    addPreloadLink('/og-default.jpg', 'image');
    
    // Adicionar manifest se não existir
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifest = document.createElement('link');
      manifest.rel = 'manifest';
      manifest.href = '/manifest.json';
      document.head.appendChild(manifest);
    }

    // Adicionar service worker registration
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('✅ Service Worker registrado'))
        .catch(err => console.log('❌ Service Worker falhou:', err));
    }

  }, []);

  return (
    <Helmet>
      {/* Meta tags globais de SEO */}
      <html lang="pt-BR" />
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      <meta name="theme-color" content="#8B5CF6" />
      <meta name="color-scheme" content="dark light" />
      
      {/* PWA Meta tags */}
      <meta name="application-name" content="MesaPra2" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="MesaPra2" />
      
      {/* Security headers */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-Frame-Options" content="DENY" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      
      {/* Robots */}
      <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      
      {/* Site verification (adicione os códigos reais) */}
      {/* <meta name="google-site-verification" content="YOUR_GOOGLE_VERIFICATION_CODE" /> */}
      {/* <meta name="msvalidate.01" content="YOUR_BING_VERIFICATION_CODE" /> */}
      
      {/* Favicons - melhorados */}
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
      <link rel="mask-icon" href="/favicon/favicon.svg" color="#8B5CF6" />
      
      {/* Open Graph globais */}
      <meta property="og:site_name" content="MesaPra2" />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:locale:alternate" content="en_US" />
      
      {/* Twitter globais */}
      <meta name="twitter:site" content="@mesapra2" />
      <meta name="twitter:creator" content="@mesapra2" />
      
      {/* Preconnect para performance */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="preconnect" href="https://ksmnfhenhppasfcikefd.supabase.co" />
      <link rel="dns-prefetch" href="https://ksmnfhenhppasfcikefd.supabase.co" />
      
      {/* Structured Data - Organization */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "MesaPra2",
          "url": "https://mesapra2.com",
          "logo": "https://mesapra2.com/logo.png",
          "description": "Plataforma de jantares sociais que conecta pessoas através de experiências gastronômicas únicas",
          "foundingDate": "2024",
          "areaServed": {
            "@type": "Country",
            "name": "Brasil"
          },
          "serviceType": "Social Dining Platform",
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer service",
            "email": "contato@mesapra2.com",
            "areaServed": "BR",
            "availableLanguage": "Portuguese"
          },
          "sameAs": [
            "https://instagram.com/mesapra2",
            "https://facebook.com/mesapra2"
          ]
        }, null, 2)}
      </script>
    </Helmet>
  );
};

export default SEOOptimizer;