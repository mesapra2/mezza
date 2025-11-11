import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, 
  HelpCircle, 
  Shield, 
  Mail, 
  ExternalLink,
  Heart,
  Code,
  Coffee,
  Github,
  Linkedin,
  Globe
} from 'lucide-react';
import MesaPra2Logo from './MesaPra2Logo';

/**
 * Footer Inteligente - Sistema sofisticado de rodapé
 * com links úteis e créditos do desenvolvedor
 */
const Footer = ({ 
  variant = 'default', // 'default', 'minimal', 'floating'
  showDeveloper = true,
  className = ''
}) => {
  // Links de navegação organizados
  const navigationLinks = [
    {
      icon: Home,
      label: 'Home',
      path: '/',
      description: 'Voltar ao início'
    },
    {
      icon: HelpCircle,
      label: 'FAQ',
      path: '/faq',
      description: 'Perguntas frequentes'
    },
    {
      icon: Shield,
      label: 'Privacidade',
      path: '/politicas.html',
      description: 'Política de privacidade',
      external: true
    },
    {
      icon: Mail,
      label: 'Contato',
      path: '/contato',
      description: 'Entre em contato'
    }
  ];

  // Informações do desenvolvedor
  const developerInfo = {
    name: 'Rovo Dev',
    role: 'Full Stack Developer',
    description: 'Desenvolvido com ❤️ por especialistas em experiências digitais',
    links: [
      {
        icon: Github,
        url: 'https://github.com',
        label: 'GitHub'
      },
      {
        icon: Linkedin,
        url: 'https://linkedin.com',
        label: 'LinkedIn'
      },
      {
        icon: Globe,
        url: 'https://rovodev.com',
        label: 'Portfolio'
      }
    ]
  };

  if (variant === 'minimal') {
    return (
      <footer className={`py-6 px-4 border-t border-white/5 bg-black/20 backdrop-blur-sm ${className}`}>
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-white/40 text-sm">
            © 2024 MesaPra2. Desenvolvido com <Heart className="w-4 h-4 inline text-red-400" /> por Rovo Dev
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className={`relative border-t border-white/5 bg-gradient-to-br from-gray-950 via-black to-purple-950/30 ${className}`}>
      {/* Background pattern sutil */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(147,51,234,0.1)_1px,_transparent_0)] bg-[size:20px_20px] opacity-20"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 py-12">
        {/* Links de navegação - Uma linha */}
        <div className="mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {navigationLinks.map((link, index) => {
                const IconComponent = link.icon;
                
                const LinkWrapper = link.external ? 'a' : Link;
                const linkProps = link.external 
                  ? { href: link.path, target: '_blank', rel: 'noopener noreferrer' }
                  : { to: link.path };

                return (
                  <LinkWrapper
                    key={index}
                    {...linkProps}
                    className="group flex items-center space-x-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-purple-500/30 transition-all duration-300 hover:transform hover:scale-105"
                  >
                    <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                      <IconComponent className="w-4 h-4 text-purple-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/90 font-medium text-sm group-hover:text-white transition-colors">
                        {link.label}
                      </p>
                      <p className="text-white/50 text-xs truncate">
                        {link.description}
                      </p>
                    </div>
                    {link.external && (
                      <ExternalLink className="w-3 h-3 text-white/40 group-hover:text-white/60" />
                    )}
                  </LinkWrapper>
                );
              })}
          </div>
        </div>

        {/* Separador elegante */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          </div>
          <div className="relative flex justify-center">
            <div className="bg-black px-4">
              <div className="w-8 h-px bg-gradient-to-r from-purple-500 to-blue-500"></div>
            </div>
          </div>
        </div>

        {/* Card Developer CodeMix */}
        {showDeveloper && (
          <div className="text-center py-8 px-5 pb-5 font-mono text-xs text-gray-400 relative z-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 mb-8">
            <a 
              href="https://codemix.com.br" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1.5 text-inherit no-underline transition-all duration-300 ease-out hover:text-green-400 hover:drop-shadow-[0_0_8px_rgba(0,255,136,0.6)]"
            >
              <span className="text-base font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent animate-pulse">
                &lt;/&gt;
              </span>
              <span className="text-xs">
                Desenvolvido por{' '}
                <span className="bg-gradient-to-r from-cyan-400 to-pink-500 bg-clip-text text-transparent font-bold">
                  CodeMix
                </span>
              </span>
            </a>
            
            {/* CSS personalizado injetado via style tag */}
            <style>{`
              @keyframes neonPulse {
                from { 
                  filter: drop-shadow(0 0 3px #00ff88); 
                }
                to { 
                  filter: drop-shadow(0 0 8px #00d4ff); 
                }
              }
              
              .animate-neon {
                animation: neonPulse 2s infinite alternate;
              }
            `}</style>
          </div>
        )}

        {/* Copyright */}
        <div className="text-center">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} MesaPra2. Todos os direitos reservados.
          </p>
          <p className="text-white/30 text-xs mt-1">
            Versão 2.0 • Feito no Brasil 🇧🇷
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;