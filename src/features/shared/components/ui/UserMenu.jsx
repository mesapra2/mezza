import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { LogOut, UserCircle } from 'lucide-react';

const UserMenu = () => {
  const { user, profile, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!user) return null;

  return (
    <div className="relative z-[9999]" ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="focus:outline-none">
        <img
          src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.username || user.email}&background=8b5cf6&color=fff&size=40`}
          alt="Avatar do usuário"
          className="w-10 h-10 rounded-full border-2 border-purple-500/50 object-cover"
        />
      </button>

      {isOpen && (
        <>
          {/* Overlay invisível para capturar cliques fora */}
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)}></div>
          
          {/* Menu dropdown */}
          <div className="absolute right-0 mt-2 w-56 rounded-xl bg-gray-800/95 backdrop-blur-md border border-white/10 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-[9999]">
            <div className="py-1">
              <div className="px-4 py-3">
                <p className="text-sm font-semibold text-white truncate">{profile?.username || 'Usuário'}</p>
                <p className="text-xs text-white/60 truncate">{user.email}</p>
              </div>
              <div className="border-t border-white/10"></div>
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center w-full px-4 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                <UserCircle className="mr-3 h-5 w-5" />
                Meu Perfil
              </Link>
              <button
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-white/10"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Sair
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserMenu;