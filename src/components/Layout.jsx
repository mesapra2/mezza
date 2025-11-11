// src/components/Layout.jsx
import { useState, useMemo } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  Home,
  Calendar,
  User,
  Settings,
  MapPin,
  Users,
  MessageSquare,
  Star,
  Store,
  Plus,
  Search,
  PlusCircle,
  Bell,
  Heart,
  Crown,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/features/shared/components/ui/Navbar';
import SkipLinks from './SkipLinks';
import ErrorBoundary from './ErrorBoundary';
import PresenceManager from './PresenceManager';
import { PremiumBadge, PartnerBadge, PartnerPremiumBadge } from '@/features/shared/components/PremiumBAdge';

// === NavLink Component ===
const NavLink = ({ to, icon: Icon, label, onClick, iconColor = "default" }) => {
  const location = useLocation();
  const isActive =
    location.pathname === to ||
    (to === '/chats' && location.pathname.includes('/chat'));

  // Mapa de cores sofisticadas para cada tipo de ícone
  const iconStyles = {
    dashboard: isActive 
      ? "text-blue-400 drop-shadow-lg" 
      : "text-blue-400/80 group-hover:text-blue-300 transition-all duration-300",
    events: isActive 
      ? "text-purple-400 drop-shadow-lg" 
      : "text-purple-400/80 group-hover:text-purple-300 transition-all duration-300",
    social: isActive 
      ? "text-emerald-400 drop-shadow-lg" 
      : "text-emerald-400/80 group-hover:text-emerald-300 transition-all duration-300",
    discover: isActive 
      ? "text-orange-400 drop-shadow-lg" 
      : "text-orange-400/80 group-hover:text-orange-300 transition-all duration-300",
    create: isActive 
      ? "text-pink-400 drop-shadow-lg" 
      : "text-pink-400/80 group-hover:text-pink-300 transition-all duration-300",
    premium: isActive 
      ? "text-yellow-400 drop-shadow-lg" 
      : "text-yellow-400/80 group-hover:text-yellow-300 transition-all duration-300",
    settings: isActive 
      ? "text-slate-400 drop-shadow-lg" 
      : "text-slate-400/80 group-hover:text-slate-300 transition-all duration-300",
    default: isActive 
      ? "text-white drop-shadow-lg" 
      : "text-white/70 group-hover:text-white transition-all duration-300"
  };

  const iconStyle = iconStyles[iconColor] || iconStyles.default;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 hover:scale-[1.02] ${
        isActive
          ? 'text-white bg-gradient-to-r from-purple-600/40 to-purple-500/30 shadow-lg shadow-purple-500/20 border border-purple-400/30'
          : 'text-white/80 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 hover:shadow-md hover:border hover:border-white/20'
      }`}
    >
      <div className={`mr-3 p-2 rounded-lg ${isActive ? 'bg-white/10 shadow-inner' : 'group-hover:bg-white/5'} transition-all duration-300`}>
        <Icon className={`h-5 w-5 flex-shrink-0 ${iconStyle}`} />
      </div>
      <span className="font-semibold tracking-wide">{label}</span>
    </Link>
  );
};

NavLink.propTypes = {
  to: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  iconColor: PropTypes.string,
};

// === MenuSection Component ===
const MenuSection = ({ title, children, sectionColor = "default" }) => {
  const sectionColors = {
    dashboard: "text-blue-400/80",
    events: "text-purple-400/80", 
    social: "text-emerald-400/80",
    discover: "text-orange-400/80",
    default: "text-white/60"
  };

  const titleColor = sectionColors[sectionColor] || sectionColors.default;

  return (
    <div className="mb-6">
      {title && (
        <div className="flex items-center px-3 mb-3">
          <div className={`h-0.5 w-8 bg-gradient-to-r ${
            sectionColor === 'dashboard' ? 'from-blue-500 to-blue-300' :
            sectionColor === 'events' ? 'from-purple-500 to-purple-300' :
            sectionColor === 'social' ? 'from-emerald-500 to-emerald-300' :
            sectionColor === 'discover' ? 'from-orange-500 to-orange-300' :
            'from-white/40 to-white/20'
          } rounded-full mr-3 shadow-sm`} />
          <h3 className={`text-xs font-bold ${titleColor} uppercase tracking-wider`}>
            {title}
          </h3>
        </div>
      )}
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
};

MenuSection.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  sectionColor: PropTypes.string,
};

// === SidebarContent Component ===
const SidebarContent = ({ onLinkClick, navSections, bottomLinks, isPremium, isPremiumPartner, profile }) => (
  <div className="flex flex-col h-full">
    {/* Logo + Premium Badge */}
    <div className="flex items-center h-16 flex-shrink-0 px-4">
      <div>
        <h1 className="text-2xl font-bold gradient-text" role="banner">Mesapra2</h1>
        {/* Mostra badge Premium Partner se for parceiro premium, senão mostra Premium normal */}
        {profile?.partner_data?.isPremium ? (
          <PartnerPremiumBadge size="sm" />
        ) : profile?.isPremium ? (
          <PremiumBadge size="sm" />
        ) : profile?.profile_type === 'partner' ? (
          <PartnerBadge size="sm" />
        ) : null}
      </div>
    </div>

    {/* Main Navigation with Sections */}
    <div className="flex-1 overflow-y-auto">
      <nav 
        id="navigation"
        className="flex-1 px-2 py-4"
        aria-label="Menu principal"
        role="navigation"
      >
        {navSections.map((section, index) => (
          <MenuSection 
            key={index} 
            title={section.title}
            sectionColor={section.colorTheme}
          >
            {section.items.map((link) => (
              <NavLink 
                key={link.to} 
                {...link} 
                onClick={onLinkClick} 
                iconColor={link.iconColor || section.colorTheme || 'default'}
              />
            ))}
          </MenuSection>
        ))}
      </nav>

      {/* Bottom Links */}
      {bottomLinks.length > 0 && (
        <nav 
          className="px-2 py-4 space-y-2 border-t border-gradient-to-r from-white/10 to-white/5"
          aria-label="Menu de configurações"
          role="navigation"
        >
          <div className="flex items-center px-3 mb-3">
            <div className="h-0.5 w-8 bg-gradient-to-r from-slate-500 to-slate-300 rounded-full mr-3 shadow-sm" />
            <h3 className="text-xs font-bold text-slate-400/80 uppercase tracking-wider">
              Conta
            </h3>
          </div>
          {bottomLinks.map((link) => (
            <NavLink 
              key={link.to} 
              {...link} 
              onClick={onLinkClick}
              iconColor={link.iconColor || 'settings'}
            />
          ))}
        </nav>
      )}
    </div>
  </div>
);

SidebarContent.propTypes = {
  onLinkClick: PropTypes.func,
  navSections: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string,
    items: PropTypes.arrayOf(PropTypes.shape({
      to: PropTypes.string.isRequired,
      icon: PropTypes.elementType.isRequired,
      label: PropTypes.string.isRequired
    })).isRequired
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

  // === Links da navegação organizados por seções (memoizados) ===
  const { navSections, bottomLinks } = useMemo(() => {
    if (isPartner) {
      // === NAVEGAÇÃO PARA PARCEIROS ===
      const partnerSections = [
        {
          title: 'Dashboard',
          colorTheme: 'dashboard',
          items: [
            { to: '/partner/dashboard', icon: BarChart3, label: 'Dashboard', iconColor: 'dashboard' }
          ]
        },
        {
          title: 'Eventos',
          colorTheme: 'events',
          items: isPremiumPartner ? [
            { to: '/meus-eventos', icon: Calendar, label: 'Meus Eventos', iconColor: 'events' },
            { to: '/events', icon: Search, label: 'Explorar Eventos', iconColor: 'events' },
            { to: '/partner/create-event', icon: PlusCircle, label: 'Criar Evento', iconColor: 'create' }
          ] : [
            { to: '/events', icon: Search, label: 'Explorar Eventos', iconColor: 'events' }
          ]
        },
        {
          title: 'Social',
          colorTheme: 'social',
          items: [
            { to: '/people', icon: Users, label: 'Pessoas', iconColor: 'social' },
            { to: '/chats', icon: MessageSquare, label: 'Chats', iconColor: 'social' },
            { to: '/notifications', icon: Bell, label: 'Notificações', iconColor: 'social' }
          ]
        },
        {
          title: 'Descobrir',
          colorTheme: 'discover',
          items: [
            { to: '/restaurants', icon: MapPin, label: 'Restaurantes', iconColor: 'discover' }
          ]
        }
      ];

      return {
        navSections: partnerSections,
        bottomLinks: user
          ? [
              { 
                to: `/restaurant/${profile.partner_id}`, 
                icon: Store, 
                label: 'Meu Restaurante',
                iconColor: 'discover'
              },
              { 
                to: '/partner/settings', 
                icon: Settings, 
                label: 'Configurações',
                iconColor: 'settings'
              },
            ]
          : [],
      };
    }

    // === NAVEGAÇÃO PARA USUÁRIOS NORMAIS ===
    const userSections = [
      {
        title: 'Dashboard',
        colorTheme: 'dashboard',
        items: [
          { to: '/dashboard', icon: Home, label: 'Dashboard', iconColor: 'dashboard' }
        ]
      },
      {
        title: 'Eventos',
        colorTheme: 'events',
        items: [
          { to: '/meus-eventos', icon: Calendar, label: 'Meus Eventos', iconColor: 'events' },
          { to: '/events', icon: Search, label: 'Explorar Eventos', iconColor: 'events' },
          ...(isPremium ? [{ to: '/criar-evento', icon: PlusCircle, label: 'Criar Evento', iconColor: 'create' }] : [])
        ]
      },
      {
        title: 'Social',
        colorTheme: 'social',
        items: [
          { to: '/people', icon: Users, label: 'Pessoas', iconColor: 'social' },
          { to: '/chats', icon: MessageSquare, label: 'Chats', iconColor: 'social' },
          { to: '/notifications', icon: Bell, label: 'Notificações', iconColor: 'social' }
        ]
      },
      {
        title: 'Descobrir',
        colorTheme: 'discover',
        items: [
          { to: '/restaurants', icon: MapPin, label: 'Restaurantes', iconColor: 'discover' },
          ...(isPremium ? [{ to: '/favoritos', icon: Heart, label: 'Favoritos', iconColor: 'premium' }] : [])
        ]
      }
    ];

    const userBottomLinks = user
      ? [
          { to: `/profile/${user.id}`, icon: User, label: 'Meu Perfil', iconColor: 'settings' },
          ...(!isPremium ? [{ to: '/premium', icon: Crown, label: 'Upgrade Premium', iconColor: 'premium' }] : []),
          { to: '/settings', icon: Settings, label: 'Configurações', iconColor: 'settings' },
        ]
      : [];

    return {
      navSections: userSections,
      bottomLinks: userBottomLinks,
    };
  }, [isPartner, isPremium, isPremiumPartner, user, profile]);

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
      {/* ✅ Gerenciador de Presença Online */}
      <PresenceManager />
      <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside 
        className="hidden md:flex md:flex-shrink-0 w-64 border-r border-white/10"
        aria-label="Navegação principal"
        role="complementary"
      >
        <SidebarContent
          navSections={navSections}
          bottomLinks={bottomLinks}
          isPremium={isPremium}
          isPremiumPartner={isPremiumPartner}
          profile={profile}
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
          navSections={navSections}
          bottomLinks={bottomLinks}
          isPremium={isPremium}
          isPremiumPartner={isPremiumPartner}
          profile={profile}
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