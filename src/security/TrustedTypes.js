// TrustedTypes.js - Mitigação XSS baseado em DOM
export function initTrustedTypes() {
  // Verificar se Trusted Types está disponível
  if (typeof window !== 'undefined' && window.trustedTypes) {
    try {
      // Criar política para HTML dinâmico
      const htmlPolicy = trustedTypes.createPolicy('mesapra2-html', {
        createHTML: (string) => {
          // Sanitizar HTML básico
          return string
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
            .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
            .replace(/javascript:/gi, ''); // Remove javascript: URLs
        }
      });

      // Criar política para scripts
      const scriptPolicy = trustedTypes.createPolicy('mesapra2-script', {
        createScript: (string) => {
          // Apenas permitir scripts conhecidos/seguros
          const allowedScripts = [
            'console.log', 
            'window.gtag',
            'window.dataLayer',
            'window.fbAsyncInit'
          ];
          
          // Verificar se o script contém apenas funções permitidas
          const isAllowed = allowedScripts.some(allowed => 
            string.includes(allowed)
          );
          
          if (isAllowed || string.trim() === '') {
            return string;
          }
          
          console.warn('Script bloqueado por Trusted Types:', string);
          return ''; // Bloquear script suspeito
        }
      });

      // Criar política para URLs
      const urlPolicy = trustedTypes.createPolicy('mesapra2-url', {
        createScriptURL: (string) => {
          // Lista de domínios permitidos para scripts
          const allowedDomains = [
            'app.mesapra2.com',
            'www.googletagmanager.com',
            'www.google-analytics.com',
            'connect.facebook.net',
            'apis.google.com',
            'fonts.googleapis.com',
            'fonts.gstatic.com'
          ];
          
          try {
            const url = new URL(string);
            const isAllowed = allowedDomains.some(domain => 
              url.hostname === domain || url.hostname.endsWith('.' + domain)
            );
            
            if (isAllowed || url.protocol === 'blob:' || url.hostname === location.hostname) {
              return string;
            }
            
            console.warn('URL bloqueada por Trusted Types:', string);
            return 'about:blank';
          } catch (e) {
            console.warn('URL inválida bloqueada:', string);
            return 'about:blank';
          }
        }
      });

      // Expor políticas globalmente para uso em componentes
      window.mesapra2TrustedTypes = {
        html: htmlPolicy,
        script: scriptPolicy,
        url: urlPolicy
      };

      console.log('✅ Trusted Types configurado com sucesso');
      
    } catch (error) {
      console.warn('⚠️ Erro ao configurar Trusted Types:', error);
    }
  } else {
    console.warn('⚠️ Trusted Types não suportado neste navegador');
  }
}

// Helper functions para uso seguro
export const secureDOMHelpers = {
  // Inserir HTML de forma segura
  setInnerHTML: (element, htmlString) => {
    if (window.mesapra2TrustedTypes?.html) {
      element.innerHTML = window.mesapra2TrustedTypes.html.createHTML(htmlString);
    } else {
      // Fallback básico sem Trusted Types
      const sanitized = htmlString
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/javascript:/gi, '');
      element.innerHTML = sanitized;
    }
  },

  // Adicionar script de forma segura
  addScript: (scriptContent) => {
    if (window.mesapra2TrustedTypes?.script) {
      const script = document.createElement('script');
      script.textContent = window.mesapra2TrustedTypes.script.createScript(scriptContent);
      document.head.appendChild(script);
    } else {
      console.warn('Script bloqueado - Trusted Types não configurado');
    }
  },

  // Definir src de script de forma segura
  setScriptSrc: (script, url) => {
    if (window.mesapra2TrustedTypes?.url) {
      script.src = window.mesapra2TrustedTypes.url.createScriptURL(url);
    } else {
      // Verificação básica de domínio
      try {
        const urlObj = new URL(url);
        const allowedDomains = ['app.mesapra2.com', 'www.googletagmanager.com'];
        if (allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
          script.src = url;
        }
      } catch (e) {
        console.warn('URL de script inválida:', url);
      }
    }
  }
};