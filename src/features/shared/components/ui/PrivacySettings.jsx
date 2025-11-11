import React, { useState, useEffect } from 'react';
import { Shield, Eye, Users, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/features/shared/components/ui/use-toast';

/**
 * Componente para gerenciar configurações de privacidade do usuário
 * Deve ser usado dentro do ProfilePage ou SettingsPage
 */
const PrivacySettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    public_profile: true,
    allow_pokes: true,
  });

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('public_profile, allow_pokes')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setSettings({
        public_profile: data.public_profile !== false, // Default true
        allow_pokes: data.allow_pokes !== false, // Default true
      });
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const updateSetting = async (key, value) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      setSettings(prev => ({ ...prev, [key]: value }));

      toast({
        title: "✅ Configuração atualizada!",
        description: getSettingMessage(key, value),
      });
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar a configuração.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSettingMessage = (key, value) => {
    const messages = {
      public_profile: value
        ? "Seu perfil agora está visível na lista de pessoas."
        : "Seu perfil está privado e não aparecerá nas buscas.",
      allow_pokes: value
        ? "Você está aceitando cutucadas."
        : "Cutucadas desabilitadas. Outros usuários poderão enviar eventos Crusher.",
    };
    return messages[key] || "Configuração salva.";
  };

  const SettingToggle = ({ icon: Icon, title, description, settingKey, value }) => (
    <div className="glass-effect rounded-lg p-4 border border-white/10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Icon className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-white font-semibold mb-1">{title}</h4>
            <p className="text-white/60 text-sm">{description}</p>
          </div>
        </div>
        
        <button
          onClick={() => updateSetting(settingKey, !value)}
          disabled={loading}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${value ? 'bg-purple-600' : 'bg-white/20'}
            ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${value ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6 text-purple-400" />
        <h3 className="text-2xl font-bold text-white">Privacidade</h3>
      </div>

      <SettingToggle
        icon={Eye}
        title="Perfil Público"
        description="Permite que outros usuários vejam seu perfil na lista de pessoas e recebam gifts."
        settingKey="public_profile"
        value={settings.public_profile}
      />

      <SettingToggle
        icon={Users}
        title="Aceitar Cutucadas"
        description="Permite que outros usuários te cutuquem. Se desabilitado, eles poderão enviar convites Crusher."
        settingKey="allow_pokes"
        value={settings.allow_pokes}
      />

      {/* Aviso quando cutucadas desabilitadas */}
      {!settings.allow_pokes && (
        <div className="glass-effect rounded-lg p-4 border border-pink-500/30 bg-pink-500/10">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-pink-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-pink-300 font-semibold mb-1">Convites Crusher Ativos</h4>
              <p className="text-pink-200/80 text-sm">
                Com cutucadas desabilitadas, outros usuários poderão te enviar convites diretos para eventos Crusher - uma forma mais séria de demonstrar interesse.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacySettings;