// components/ui/SidebarContent.jsx
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Users, Store, MessageSquare, Star } from 'lucide-react';
import PropTypes from 'prop-types';

export default function SidebarContent({ isPartner, isPremium, userType }) {
  // Menus diferentes baseado no tipo
  const userMenu = [
    { to: '/dashboard', icon: Home, label: 'Home' },
    { to: '/events', icon: Calendar, label: 'Eventos' },
    { to: '/meus-eventos', icon: Calendar, label: 'Meus Eventos' },
    { to: '/restaurants', icon: Store, label: 'Restaurantes' },
    { to: '/people', icon: Users, label: 'Pessoas' },
    { to: '/chats', icon: MessageSquare, label: 'Chats' },
  ];

  const partnerMenu = [
    { to: '/partner/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/events', icon: Calendar, label: 'Feed de Eventos' },
    { to: '/meus-eventos', icon: Calendar, label: 'Meus Eventos' },
    { to: '/restaurants', icon: Store, label: 'Restaurantes' },
    { to: '/people', icon: Users, label: 'Pessoas' },
    { to: '/chats', icon: MessageSquare, label: 'Chats' },
  ];

  const menuItems = isPartner ? partnerMenu : userMenu;

  return (
    <div className="flex flex-col h-full p-4">
      {/* Logo */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-primary">Mesapra2</h1>
        {isPremium && (
          <span className="text-xs text-yellow-500 flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 fill-current" />
            Premium
          </span>
        )}
      </div>

      {/* Menu Items */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-purple-500 text-white'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer com tipo de usuário (apenas em desenvolvimento) */}
      {import.meta.env.DEV && (
        <div className="mt-auto pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Tipo: {userType}
          </p>
        </div>
      )}
    </div>
  );
}

SidebarContent.propTypes = {
  isPartner: PropTypes.bool.isRequired,
  isPremium: PropTypes.bool.isRequired,
  userType: PropTypes.string.isRequired,
};