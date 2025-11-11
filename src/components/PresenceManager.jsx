// src/components/PresenceManager.jsx
import { useCurrentUserPresence } from '@/hooks/usePresence';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Componente para gerenciar a presença online do usuário atual
 * Deve ser usado dentro do layout principal da aplicação
 */
const PresenceManager = () => {
  const { user } = useAuth();
  
  // ✅ Inicializar o tracking de presença para o usuário atual
  useCurrentUserPresence(user?.id, !!user);
  
  // Este componente não renderiza nada, apenas gerencia a presença
  return null;
};

export default PresenceManager;