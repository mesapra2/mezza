// src/features/user/pages/UserSettings.jsx (Refatorado)
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { LogOut, Loader, Lock, Trash2 } from 'lucide-react'; // Ícones necessários
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/features/shared/components/ui/button.jsx';
import { toast } from '@/features/shared/components/ui/use-toast';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import { useNavigate } from 'react-router-dom';


const UserSettings = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Handler para sucesso na alteração de senha
  const handlePasswordChangeSuccess = (message) => {
    toast({
      title: "✅ Senha alterada",
      description: message,
    });
  };

  // Handler para conta deletada
  const handleAccountDeleted = () => {
    toast({
      title: "✅ Conta eliminada",
      description: "Sua conta foi permanentemente removida.",
    });
    logout();
    navigate('/');
  };

  


  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Simplificado: apenas verifica se o usuário existe
  if (!user) {
      return (
          <div className="py-6 px-4 sm:px-6 lg:px-8 text-center text-white/70">
              Erro ao carregar dados do usuário. Faça login novamente.
          </div>
      )
  }

  return (
    <>
      <Helmet>
        {/* Título pode ser ajustado para "Configurações da Conta" se preferir */}
        <title>Minhas Configurações | Mesapra2</title>
      </Helmet>
      <div className="space-y-8 max-w-3xl mx-auto py-8">
        <h1 className="text-3xl font-bold gradient-text mb-4">
          Minhas Configurações
        </h1>

        {/* Seção Perfil Básico REMOVIDA */}
        {/* Seção Aparência REMOVIDA */}
        {/* Seção Notificações REMOVIDA */}
        {/* Seção Privacidade REMOVIDA */}
        {/* Botão Salvar Geral REMOVIDO */}

        {/* Seção Conta MANTIDA */}
        <motion.div
             initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} // Delay ajustado
            className="glass-effect rounded-2xl p-6 border border-white/10 space-y-4"
        >
            <h2 className="text-xl font-semibold text-white mb-4 border-b border-white/10 pb-3">Segurança da Conta</h2>
            
            {/* Alterar Senha */}
            <Button 
              onClick={() => setShowPasswordModal(true)}
              variant="outline" 
              className="w-full justify-start glass-effect border-white/10 hover:bg-white/5"
            >
              <Lock className="mr-2 h-4 w-4" />
              Alterar Senha
            </Button>

            {/* Logout */}
            <Button
                type="button"
                onClick={async () => { await logout(); }}
                variant="outline"
                className="w-full justify-start glass-effect border-white/10 hover:bg-white/5"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Deslogar
            </Button>

            {/* Deletar Conta */}
             <Button 
               onClick={() => setShowDeleteModal(true)}
               variant="destructive" 
               className="w-full justify-start"
             >
               <Trash2 className="mr-2 h-4 w-4" />
               Deletar Conta
             </Button>
        </motion.div>

      </div>

      {/* Modais */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={handlePasswordChangeSuccess}
      />

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onAccountDeleted={handleAccountDeleted}
        userType="user"
      />
    </>
  );
};

export default UserSettings;