// src/components/Layout.jsx
import { useState, useMemo } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  Home,
  Calendar,
  User,
  Settings,
  UtensilsCrossed,
  Users,
  MessageSquare,
  Star,
  Store,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/features/shared/components/ui/Navbar';
import SkipLinks from './SkipLinks';
import ErrorBoundary from './ErrorBoundary';

// === NavLink Component ===
const NavLink = ({ to, icon: Icon, label, onClick }) => {
  const location = useLocation();
  const isActive =
    location.pathname === to ||
    (to === '/chats' && location.pathname.includes('/chat'));

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
        isActive
          ? 'text-white bg-purple-600/30'
          : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
    >
      <Icon className="mr-3 h-6 w-6 flex-shrink-0" />
      {label}
    </Link>
  );
};

NavLink.propTypes = {
  to: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
};

// === SidebarContent Component ===
const SidebarContent = ({ onLinkClick, navLinks, bottomLinks, isPremium, isPremiumPartner }) => (
  <div className="flex flex-col h-full">
    {/* Logo + Premium Badge */}
    <div className="flex items-center h-16 flex-shrink-0 px-4">
      <div>
        <h1 className="text-2xl font-bold gradient-text" role="banner">Mesapra2</h1>
        {/* Mostra badge Premium Partner se for parceiro premium, senão mostra Premium normal */}
        {isPremiumPartner ? (
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
            <span className="text-xs font-semibold text-yellow-500">Premium Partner</span>
          </div>
        ) : isPremium ? (
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
            <span className="text-xs font-semibold text-yellow-500">Premium</span>
          </div>
        ) : null}
      </div>
    </div>

    {/* Main Navigation */}
    <div className="flex-1 overflow-y-auto">
      <nav 
        id="navigation"
        className="flex-1 px-2 py-4 space-y-2"
        aria-label="Menu principal"
        role="navigation"
      >
        {navLinks.map((link) => (
          <NavLink key={link.to} {...link} onClick={onLinkClick} />
        ))}
      </nav>

      {/* Bottom Links */}
      {bottomLinks.length > 0 && (
        <nav 
          className="px-2 py-4 space-y-1 border-t border-white/10"
          aria-label="Menu de configurações"
          role="navigation"
        >
          {bottomLinks.map((link) => (
            <NavLink key={link.to} {...link} onClick={onLinkClick} />
          ))}
        </nav>
      )}
    </div>
  </div>
);

SidebarContent.propTypes = {
  onLinkClick: PropTypes.func,
  navLinks: PropTypes.arrayOf(PropTypes.shape({
    to: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired
  })).isRequired,
  bottomLinks: PropTypes.arrayOf(PropTypes.shape({
    to: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired
  })).isRequired,
  isPremium: PropTypes.bool.isRequired,
  isPremiumPartner: PropTypes.bool.isRequired,
};

// === Main Layout Component ===
const Layout = () => {
  const { user, profile, loading } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // === Derivações do perfil ===
  const isPartner = profile?.profile_type === 'partner' || profile?.partner_id != null;
  const isPremium = profile?.is_premium === true;
  const isPremiumPartner = profile?.isPremiumPartner === true;

  // === Links da navegação (memoizados) ===
  const { navLinks, bottomLinks } = useMemo(() => {
    // ✅ LINKS BASE COMPARTILHADOS
    const baseLinks = [
      { to: '/events', icon: Calendar, label: 'Eventos' },
      { to: '/restaurants', icon: UtensilsCrossed, label: 'Restaurantes' },
      { to: '/people', icon: Users, label: 'Pessoas' },
      { to: '/chats', icon: MessageSquare, label: 'Chats' },
    ];

    if (isPartner) {
      // === NAVEGAÇÃO PARA PARCEIROS ===
      const partnerNavLinks = [
        { to: '/partner/dashboard', icon: Home, label: 'Dashboard' },
        ...baseLinks,
      ];

      // ✅ SE FOR PREMIUM PARTNER, ADICIONA "MEUS EVENTOS" E "CRIAR EVENTO"
      if (isPremiumPartner) {
        partnerNavLinks.splice(1, 0, { 
          to: '/meus-eventos', 
          icon: Calendar, 
          label: 'Meus Eventos' 
        });
        partnerNavLinks.splice(2, 0, { 
          to: '/partner/create-event', 
          icon: Plus, 
          label: 'Criar Evento' 
        });
      }

      return {
        navLinks: partnerNavLinks,
        bottomLinks: user
          ? [
              { 
                to: `/restaurant/${profile.partner_id}`, 
                icon: Store, 
                label: 'Meu Restaurante' 
              },
              { 
                to: '/partner/settings', 
                icon: Settings, 
                label: 'Minha Conta' 
              },
            ]
          : [],
      };
    }

    // === NAVEGAÇÃO PARA USUÁRIOS NORMAIS ===
    // ✅ CORREÇÃO: Cada link aponta para sua rota correta
    const userNavLinks = [
      { to: '/dashboard', icon: Home, label: 'Dashboard' },
      { to: '/meus-eventos', icon: Calendar, label: 'Meus Eventos' },
      { to: '/events', icon: Calendar, label: 'Eventos' },
      { to: '/restaurants', icon: UtensilsCrossed, label: 'Restaurantes' },
      { to: '/people', icon: Users, label: 'Pessoas' },
      { to: '/chats', icon: MessageSquare, label: 'Chats' },
    ];

    const userBottomLinks = user
      ? [
          { to: `/profile/${user.id}`, icon: User, label: 'Meu Perfil' },
          { to: '/settings', icon: Settings, label: 'Minha Conta' },
        ]
      : [];

    return {
      navLinks: userNavLinks,
      bottomLinks: userBottomLinks,
    };
  }, [isPartner, isPremiumPartner, user, profile]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  // === Loading State ===
  if (loading) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-background">
        <div className="w-12 h-12 border-t-2 border-b-2 rounded-full border-primary animate-spin"></div>
      </div>
    );
  }

  // === Unauthenticated User (Login/Register) ===
  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="flex-1">
          <div className="container px-4 mx-auto sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    );
  }

  // === Authenticated Layout ===
  return (
    <>
      <SkipLinks />
      <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside 
        className="hidden md:flex md:flex-shrink-0 w-64 border-r border-white/10"
        aria-label="Navegação principal"
        role="complementary"
      >
        <SidebarContent
          navLinks={navLinks}
          bottomLinks={bottomLinks}
          isPartner={isPartner}
          isPremium={isPremium}
          isPremiumPartner={isPremiumPartner}
        />
      </aside>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 w-64 h-full bg-background border-r border-white/10 transform transition-transform duration-300 ease-in-out md:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!isSidebarOpen}
        aria-label="Menu de navegação"
        role="dialog"
        aria-modal="true"
      >
        <SidebarContent
          onLinkClick={toggleSidebar}
          navLinks={navLinks}
          bottomLinks={bottomLinks}
          isPartner={isPartner}
          isPremium={isPremium}
          isPremiumPartner={isPremiumPartner}
        />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1">
        <div className="relative z-50">
          <Navbar toggleSidebar={toggleSidebar} />
        </div>
        
        <main 
          className="flex-1 pt-4 pb-6 overflow-y-auto md:pt-6"
          id="main-content"
          role="main"
          aria-label="Conteúdo principal"
        >
          <div className="container px-4 mx-auto sm:px-6 lg:px-8">
            <ErrorBoundary fallbackMessage="Ocorreu um erro ao carregar esta página. Tente novamente.">
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
    </>
  );
};

export default Layout;