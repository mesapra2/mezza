/**
 * ========================================
 * COMPONENTE DE METATAGS DINÂMICAS
 * ========================================
 * 
 * Gerencia metatags Open Graph e Twitter Cards dinamicamente
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const MetaTags = ({ 
  title = "Mesapra2 – Jantares sociais que conectam pessoas",
  description = "Conecte-se a pessoas incríveis através de jantares sociais. Conheça pessoas novas, faça amizades e viva experiências gastronômicas únicas no Mesapra2.",
  image = null,
  url = null
}) => {
  const location = useLocation();

  useEffect(() => {
    // URL base dinâmica
    const baseUrl = window.location.origin;
    const currentUrl = url || `${baseUrl}${location.pathname}`;
    
    // Imagem padrão ou personalizada
    const ogImage = image || `${baseUrl}/og-default.jpg`;

    // Atualizar title da página
    document.title = title;

    // Função helper para atualizar ou criar metatag
    const updateMetaTag = (selector, attribute, value) => {
      let tag = document.querySelector(selector);
      if (tag) {
        tag.setAttribute(attribute, value);
      } else {
        tag = document.createElement('meta');
        if (selector.includes('property')) {
          tag.setAttribute('property', selector.replace('meta[property="', '').replace('"]', ''));
        } else if (selector.includes('name')) {
          tag.setAttribute('name', selector.replace('meta[name="', '').replace('"]', ''));
        }
        tag.setAttribute('content', value);
        document.head.appendChild(tag);
      }
    };

    // Atualizar metatags básicas
    updateMetaTag('meta[name="description"]', 'content', description);

    // Atualizar Open Graph
    updateMetaTag('meta[property="og:title"]', 'content', title);
    updateMetaTag('meta[property="og:description"]', 'content', description);
    updateMetaTag('meta[property="og:url"]', 'content', currentUrl);
    updateMetaTag('meta[property="og:image"]', 'content', ogImage);

    // Atualizar Twitter Cards
    updateMetaTag('meta[name="twitter:title"]', 'content', title);
    updateMetaTag('meta[name="twitter:description"]', 'content', description);
    updateMetaTag('meta[name="twitter:image"]', 'content', ogImage);

    // Atualizar canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', currentUrl);
    } else {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', currentUrl);
      document.head.appendChild(canonical);
    }

    // Log para debug
    console.log('🏷️ MetaTags atualizadas:', {
      title,
      description,
      url: currentUrl,
      image: ogImage
    });

    // Testar se imagem OG está acessível
    const img = new Image();
    img.onload = () => {
      console.log('✅ Imagem OG carregada com sucesso:', ogImage);
    };
    img.onerror = () => {
      console.warn('⚠️ Imagem OG não carregou, tentando fallback:', ogImage);
      
      // Tentar imagem PNG como fallback
      const fallbackImage = ogImage.replace('.jpg', '.png');
      updateMetaTag('meta[property="og:image"]', 'content', fallbackImage);
      updateMetaTag('meta[name="twitter:image"]', 'content', fallbackImage);
      
      // Testar fallback
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        console.log('✅ Imagem fallback carregada:', fallbackImage);
      };
      fallbackImg.onerror = () => {
        console.error('❌ Nenhuma imagem OG disponível');
      };
      fallbackImg.src = fallbackImage;
    };
    img.src = ogImage;

  }, [title, description, image, url, location.pathname]);

  // Este componente não renderiza nada visível
  return null;
};

// Hook personalizado para usar em páginas específicas
export const useMetaTags = (metaTags) => {
  useEffect(() => {
    // Criar componente temporário para atualizar metatags
    const tempDiv = document.createElement('div');
    document.body.appendChild(tempDiv);
    
    // Simular a lógica do componente MetaTags
    const baseUrl = window.location.origin;
    const currentUrl = metaTags.url || `${baseUrl}${window.location.pathname}`;
    const ogImage = metaTags.image || `${baseUrl}/og-default.jpg`;

    if (metaTags.title) document.title = metaTags.title;

    const updateMetaTag = (selector, attribute, value) => {
      let tag = document.querySelector(selector);
      if (tag) {
        tag.setAttribute(attribute, value);
      }
    };

    if (metaTags.description) {
      updateMetaTag('meta[name="description"]', 'content', metaTags.description);
      updateMetaTag('meta[property="og:description"]', 'content', metaTags.description);
      updateMetaTag('meta[name="twitter:description"]', 'content', metaTags.description);
    }

    updateMetaTag('meta[property="og:title"]', 'content', metaTags.title);
    updateMetaTag('meta[property="og:url"]', 'content', currentUrl);
    updateMetaTag('meta[property="og:image"]', 'content', ogImage);
    updateMetaTag('meta[name="twitter:title"]', 'content', metaTags.title);
    updateMetaTag('meta[name="twitter:image"]', 'content', ogImage);

    // Cleanup
    document.body.removeChild(tempDiv);
  }, [metaTags]);
};

export default MetaTags;