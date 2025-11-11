import React, { useState, useEffect } from 'react';
import { X, User, Moon, Sun, Mail, Bell, Gift, MessageCircle, Check, Hand, Lock, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/features/shared/components/ui/use-toast';
import { Button } from '@/features/shared/components/ui/button';
import { Label } from '@/features/shared/components/ui/label';
import ChangePasswordModal from '../../../../components/ChangePasswordModal';
import DeleteAccountModal from '../../../../components/DeleteAccountModal';
import { useNavigate } from 'react-router-dom';

const Settings = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [settings, setSettings] = useState({
    public_profile: false,
    allow_pokes: true,
    dark_mode: true,
    email_notifications: true,
    push_notifications: true,
  });

  useEffect(() => {
    if (isOpen && user) {
      loadSettings();
    }
  }, [isOpen, user]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('public_profile, allow_pokes, dark_mode, email_notifications, push_notifications')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          public_profile: data.public_profile || false,
          allow_pokes: data.allow_pokes !== false, // Default true
          dark_mode: data.dark_mode !== false,
          email_notifications: data.email_notifications !== false,
          push_notifications: true,
        });

        applyTheme(data.dark_mode !== false);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key) => {
    if (key === 'push_notifications') {
      toast({
        title: "⚠️ Notificações Push Obrigatórias",
        description: "As notificações push são necessárias para manter você atualizado sobre seus eventos.",
        variant: "destructive",
      });
      return;
    }

    const newValue = !settings[key];
    const newSettings = { ...settings, [key]: newValue };
    setSettings(newSettings);

    if (key === 'dark_mode') {
      applyTheme(newValue);
    }

    await saveSettings({ [key]: newValue });
  };

  const applyTheme = (isDark) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.background = 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)';
    }
  };

  const saveSettings = async (updatedSettings) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updatedSettings)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "✅ Configurações salvas",
        description: "Suas preferências foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "❌ Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Handler para sucesso na alteração de senha
  const handlePasswordChangeSuccess = (message) => {
    toast({
      title: "✅ Senha alterada",
      description: message || "Sua senha foi alterada com sucesso.",
    });
    setShowPasswordModal(false);
  };

  // Handler para conta deletada
  const handleAccountDeleted = () => {
    toast({
      title: "✅ Conta eliminada",
      description: "Sua conta foi permanentemente removida.",
    });
    setShowDeleteModal(false);
    onClose(); // Fechar modal de configurações
    navigate('/'); // Navegar para home
  };

  if (!isOpen) return null;

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-2xl z-50"
          >
            <div className="glass-effect rounded-2xl border border-white/10 shadow-2xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Configurações
                </h2>
                <button
                  onClick={onClose}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                ) : (
                  <>
                    {/* Perfil Público */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <Label className="text-white font-semibold text-base">
                            Perfil Público
                          </Label>
                          <p className="text-white/60 text-sm">
                            Permite que todos vejam seu perfil, receba gifts e ative o chat
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle('public_profile')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.public_profile ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/20'
                          }`}
                          disabled={saving}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.public_profile ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {settings.public_profile && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="ml-13 pl-4 border-l-2 border-purple-500/30 space-y-2"
                        >
                          <div className="flex items-center gap-2 text-white/70 text-sm">
                            <Gift className="w-4 h-4 text-pink-400" />
                            <span>Receber gifts de outros usuários</span>
                          </div>
                          <div className="flex items-center gap-2 text-white/70 text-sm">
                            <MessageCircle className="w-4 h-4 text-purple-400" />
                            <span>Chat ativado para conversas</span>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <div className="border-t border-white/10"></div>

                    {/* 👋 NOVO: Aceitar Cutucadas */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
                          <Hand className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <Label className="text-white font-semibold text-base">
                            Aceitar Cutucadas
                          </Label>
                          <p className="text-white/60 text-sm">
                            Permite que outros usuários te cutuquem diariamente
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle('allow_pokes')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.allow_pokes ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-white/20'
                          }`}
                          disabled={saving}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.allow_pokes ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {!settings.allow_pokes && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="ml-13 pl-4 border-l-2 border-pink-500/30 bg-pink-500/10 rounded-lg p-3"
                        >
                          <div className="flex items-start gap-2 text-white/70 text-sm">
                            <MessageCircle className="w-4 h-4 text-pink-400 mt-0.5 flex-shrink-0" />
                            <span>Com cutucadas desabilitadas, outros usuários poderão te enviar convites Crusher - uma forma mais séria de demonstrar interesse.</span>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <div className="border-t border-white/10"></div>

                    {/* Modo Escuro/Claro */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                          {settings.dark_mode ? (
                            <Moon className="w-5 h-5 text-white" />
                          ) : (
                            <Sun className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <Label className="text-white font-semibold text-base">
                            {settings.dark_mode ? 'Modo Escuro' : 'Modo Claro'}
                          </Label>
                          <p className="text-white/60 text-sm">
                            Alterna entre tema escuro e claro
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle('dark_mode')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.dark_mode ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gradient-to-r from-yellow-400 to-orange-500'
                          }`}
                          disabled={saving}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.dark_mode ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-white/10"></div>

                    {/* Notificações por Email */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <Label className="text-white font-semibold text-base">
                            Notificações por Email
                          </Label>
                          <p className="text-white/60 text-sm">
                            Receba alertas de eventos também por email
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggle('email_notifications')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.email_notifications ? 'bg-gradient-to-r from-green-500 to-teal-500' : 'bg-white/20'
                          }`}
                          disabled={saving}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.email_notifications ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-white/10"></div>

                    {/* Push Notifications */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                          <Bell className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <Label className="text-white font-semibold text-base flex items-center gap-2">
                            Notificações Push
                            <span className="text-xs bg-red-500 px-2 py-0.5 rounded-full">
                              Obrigatório
                            </span>
                          </Label>
                          <p className="text-white/60 text-sm">
                            Alertas em tempo real sobre seus eventos (não pode ser desativado)
                          </p>
                        </div>
                        <button
                          className="relative inline-flex h-6 w-11 items-center rounded-full bg-gradient-to-r from-orange-500 to-red-500 opacity-50 cursor-not-allowed"
                          disabled
                        >
                          <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                        </button>
                      </div>

                      <div className="ml-13 pl-4 border-l-2 border-red-500/30">
                        <div className="flex items-center gap-2 text-white/70 text-sm">
                          <Check className="w-4 h-4 text-green-400" />
                          <span>Sempre ativo para não perder nenhum evento importante</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* ✅ NOVA SEÇÃO: Segurança da Conta */}
              <div className="border-t border-white/10 pt-6 space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Segurança da Conta
                </h3>

                {/* Alterar Senha */}
                <div className="glass-effect rounded-xl p-4 border border-white/10 flex items-center justify-between">
                  <div>
                    <h4 className="text-white font-medium">Alterar Senha</h4>
                    <p className="text-white/60 text-sm">Atualize sua senha para manter sua conta segura</p>
                  </div>
                  <Button
                    onClick={() => setShowPasswordModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    Alterar
                  </Button>
                </div>

                {/* Eliminar Conta */}
                <div className="glass-effect rounded-xl p-4 border border-red-500/20 bg-red-500/5 flex items-center justify-between">
                  <div>
                    <h4 className="text-red-400 font-medium">Eliminar Conta</h4>
                    <p className="text-red-300/60 text-sm">Remove permanentemente todos os seus dados</p>
                  </div>
                  <Button
                    onClick={() => setShowDeleteModal(true)}
                    className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-6 border-t border-white/10">
                <p className="text-white/40 text-sm">
                  {saving ? 'Salvando...' : 'Alterações são salvas automaticamente'}
                </p>
                <Button
                  onClick={onClose}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* ✅ NOVOS MODAIS */}
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

export default Settings;