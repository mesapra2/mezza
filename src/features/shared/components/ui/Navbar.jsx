// src/features/shared/components/ui/Navbar.jsx
import React from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import SimpleNotificationDropdown from '@/components/SimpleNotificationDropdown';
import PropTypes from 'prop-types'; // IMPORTADO

const Navbar = ({ toggleSidebar }) => {
  const { user } = useAuth();

  return (
    <nav className="bg-background/80 backdrop-blur-sm sticky top-0 z-[1000] border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Botão do Menu para telas pequenas */}
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded-md text-white/70 hover:text-white hover:bg-white/10 relative z-[1001]"
            aria-label="Abrir menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          {/* Espaçador para empurrar os ícones para a direita */}
          <div className="flex-1"></div>

          <div className="flex items-center space-x-4">
            {/* Dropdown de Notificações com z-index MUITO ALTO */}
            {user && <SimpleNotificationDropdown userId={user.id} />}
          </div>
        </div>
      </div>
    </nav>
  );
};

// ADICIONADO: Validação de props
Navbar.propTypes = {
  toggleSidebar: PropTypes.func.isRequired,
};

export default Navbar;