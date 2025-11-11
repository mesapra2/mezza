<<<<<<< HEAD
// src/features/user/pages/UserSettings.jsx - Versão Atualizada
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { LogOut, Loader, Lock, Trash2, User, Phone, MapPin, Save, Edit, Check, X, Mail, Calendar, Shield, Gift, Users2, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/features/shared/components/ui/button.jsx';
import { Input } from '@/features/shared/components/ui/input.jsx';
import { Label } from '@/features/shared/components/ui/label.jsx';
import { toast } from '@/features/shared/components/ui/use-toast';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import PhoneVerification from '@/features/shared/components/auth/PhoneVerification';
import DocumentVerificationNew from '@/components/DocumentVerificationNew';
import CertifiedUserService from '@/services/CertifiedUserService';
import AddressManager from '@/components/AddressManager';
import AddressService from '@/services/AddressService';
import VerificationBadge from '@/components/VerificationBadge';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';


const UserSettings = () => {
  const { user, profile, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Estados dos modais
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [showDocumentVerification, setShowDocumentVerification] = useState(false);
  const [showAddressManager, setShowAddressManager] = useState(false);
  
  // Estados dos dados do usuário
  const [userData, setUserData] = useState({
    full_name: '',
    username: '',
    email: '',
    bio: '',
    birth_date: '',
    gender: '',
    phone: '',
    public_profile: false,
    allow_pokes: true,
    dark_mode: false,
    email_notifications: true,
    is_verified: false,
    verification_status: null, // pending, approved, rejected
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zip_code: ''
    }
  });
  
  // Estados de controle
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [tempPhone, setTempPhone] = useState('');
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('');
  const [certificationData, setCertificationData] = useState(null);
  const [isCertified, setIsCertified] = useState(false);
  const [showPhoneCodeInput, setShowPhoneCodeInput] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [defaultAddress, setDefaultAddress] = useState(null);

  // Carregar dados do usuário
  useEffect(() => {
    if (user && profile) {
      loadUserData();
      loadCertificationData();
      loadDefaultAddress();
    }
  }, [user, profile]);

  // Carregar dados de certificação
  const loadCertificationData = async () => {
    if (!user?.id) return;
    
    try {
      const certified = await CertifiedUserService.isCertified(user.id);
      setIsCertified(certified);
      
      if (certified) {
        const data = await CertifiedUserService.getCertificationData(user.id);
        setCertificationData(data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados de certificação:', error);
    }
  };

  // Carregar endereço padrão do usuário
  const loadDefaultAddress = async () => {
    if (!user?.id) return;
    
    try {
      const address = await AddressService.getDefaultAddress(user.id);
      setDefaultAddress(address);
    } catch (error) {
      console.error('Erro ao carregar endereço padrão:', error);
    }
  };

  // Função para atualizar campos do userData
  const handleInputChange = (field, value) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const loadUserData = async () => {
    setLoading(true);
    try {
      // Try to get is_verified field, but handle gracefully if it doesn't exist
      let profileQuery = 'full_name, username, bio, phone, phone_verified, public_profile, allow_pokes, dark_mode, email_notifications';
      
      // Check if is_verified column exists
      try {
        const testQuery = await supabase
          .from('profiles')
          .select('is_verified')
          .eq('id', user.id)
          .limit(1);
        
        if (!testQuery.error) {
          profileQuery += ', is_verified';
        }
      } catch (error) {
        console.log('Column is_verified not found in profiles table');
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(profileQuery)
        .eq('id', user.id)
        .single();
        
      // Buscar status de verificação separadamente (se a tabela existir)
      let verificationData = null;
      try {
        const { data: verification, error: verificationError } = await supabase
          .from('user_verifications')
          .select('status, submitted_at, reviewed_at')
          .eq('user_id', user.id)
          .maybeSingle(); // Use maybeSingle() instead of single() to handle no records gracefully
        
        if (verificationError) {
          console.log('Erro ao buscar verificações:', verificationError);
        } else {
          verificationData = verification;
        }
      } catch (verificationError) {
        // Tabela user_verifications não existe ou problema de RLS
        console.log('Erro ao acessar user_verifications:', verificationError);
        
        // Check if it's a 406 error (RLS policy issue)
        if (verificationError.message?.includes('406') || verificationError.code === 'PGRST116') {
          console.log('Possível problema com política RLS na tabela user_verifications');
        }
      }

      if (error) throw error;

      setUserData({
        full_name: data.full_name || '',
        username: data.username || '',
        email: user.email || '',
        bio: data.bio || '',
        birth_date: '', // Campo não existe no banco - manter para futuro
        gender: '', // Campo não existe no banco - manter para futuro
        phone: typeof data.phone === 'object' ? data.phone?.number || '' : data.phone || '',
        public_profile: data.public_profile || false,
        allow_pokes: data.allow_pokes !== false, // default true
        dark_mode: data.dark_mode !== false, // default true
        email_notifications: data.email_notifications !== false, // default true
        is_verified: data.is_verified || false, // Use database value if available, otherwise false
        verification_status: verificationData?.status || null,
        address: {
          street: '', // Campo não existe no banco - manter para futuro
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          state: '',
          zip_code: ''
        }
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      
      // Check if error is related to missing column/table or RLS issues
      if (error.message?.includes('does not exist') || 
          error.message?.includes('42703') || 
          error.message?.includes('406') || 
          error.code === 'PGRST116') {
        console.log('Database schema or RLS policy issue detected - some features may be limited');
        console.log('Error details:', error);
        // Set basic user data without problematic fields
        setUserData({
          full_name: profile?.full_name || '',
          username: profile?.username || '',
          email: user.email || '',
          bio: profile?.bio || '',
          birth_date: '',
          gender: '',
          phone: profile?.phone || '',
          public_profile: profile?.public_profile || false,
          allow_pokes: profile?.allow_pokes !== false,
          is_verified: false,
          verification_status: null,
          address: {
            street: '',
            number: '',
            complement: '',
            neighborhood: '',
            city: '',
            state: '',
            zip_code: ''
          }
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível carregar seus dados.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Salvar dados do perfil
  const saveUserData = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: userData.full_name,
          username: userData.username,
          bio: userData.bio,
          public_profile: userData.public_profile,
          allow_pokes: userData.allow_pokes,
          dark_mode: userData.dark_mode,
          email_notifications: userData.email_notifications
          // Campos removidos: gender, birth_date, address (não existem no banco)
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "✅ Dados atualizados",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar seus dados.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Enviar código de verificação via SMS
  const sendVerificationCode = async (phone) => {
    setSendingCode(true);
    try {
      const response = await fetch('/api/send-verification-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phone: phone,
          userId: user.id 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar SMS');
      }

      toast({
        title: "Código Enviado",
        description: `Código de verificação enviado para ${formatPhoneDisplay(phone)}`,
      });

      setShowPhoneCodeInput(true);
      return true;

    } catch (error) {
      console.error('Erro ao enviar código:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível enviar o código de verificação.",
      });
      return false;
    } finally {
      setSendingCode(false);
    }
  };

  // Verificar código SMS
  const verifyPhoneCode = async () => {
    if (!phoneVerificationCode || phoneVerificationCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Código Inválido",
        description: "Digite o código de 6 dígitos enviado por SMS.",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/verify-phone-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code: phoneVerificationCode,
          userId: user.id 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Código inválido');
      }

      // Atualizar perfil como verificado
      const { error } = await supabase
        .from('profiles')
        .update({ 
          phone: { number: tempPhone, verified: true },
          phone_verified: true 
        })
        .eq('id', user.id);

      if (error) throw error;

      setUserData(prev => ({ 
        ...prev, 
        phone: tempPhone 
      }));

      toast({
        title: "Telefone Verificado",
        description: "Seu telefone foi verificado com sucesso!",
      });

      // Limpar estados
      setEditingPhone(false);
      setShowPhoneCodeInput(false);
      setPhoneVerificationCode('');
      setTempPhone('');

    } catch (error) {
      console.error('Erro ao verificar código:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Código inválido ou expirado.",
      });
    } finally {
      setSaving(false);
    }
  };

  // Iniciar edição de telefone
  const startPhoneEdit = () => {
    setTempPhone(userData.phone);
    setEditingPhone(true);
  };

  // Cancelar edição de telefone
  const cancelPhoneEdit = () => {
    setEditingPhone(false);
    setShowPhoneCodeInput(false);
    setPhoneVerificationCode('');
    setTempPhone('');
  };

  // Validar e salvar telefone (agora envia SMS)
  const savePhone = async () => {
    if (!tempPhone.trim()) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Digite um número de telefone válido.",
      });
      return;
    }

    // Validar formato do telefone brasileiro
    const phoneRegex = /^\+55\d{11}$/;
    const formattedPhone = tempPhone.startsWith('+55') ? tempPhone : `+55${tempPhone.replace(/\D/g, '')}`;

    if (!phoneRegex.test(formattedPhone)) {
      toast({
        variant: "destructive",
        title: "Formato inválido",
        description: "Digite um telefone brasileiro válido (11 dígitos).",
      });
      return;
    }

    // Se é o mesmo telefone já verificado, não precisa verificar novamente
    if (formattedPhone === userData.phone && profile?.phone_verified) {
      setEditingPhone(false);
      setTempPhone('');
      toast({
        title: "Telefone já verificado",
        description: "Este telefone já está verificado em sua conta.",
      });
      return;
    }

    // Enviar código de verificação por SMS
    const codeSent = await sendVerificationCode(formattedPhone);
    if (!codeSent) {
      return; // Erro já tratado na função sendVerificationCode
    }

    // Atualizar estado temporário
    setTempPhone(formattedPhone);
  };

  // Handler para verificação de telefone concluída
  const handlePhoneVerified = () => {
    setShowPhoneVerification(false);
    toast({
      title: "✅ Telefone verificado",
      description: "Seu número foi confirmado com sucesso!",
    });
    // Recarregar dados para atualizar status de verificação
    loadUserData();
  };
=======
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
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925

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

<<<<<<< HEAD
  // Handler para verificação de documentos concluída
  const handleDocumentVerificationComplete = (result) => {
    setShowDocumentVerification(false);
    toast({
      title: "✅ Verificação enviada",
      description: "Seus documentos foram enviados para análise. Você será notificado do resultado.",
    });
    // Recarregar dados para atualizar status
    loadUserData();
  };

  // Handler para cancelar verificação
  const handleDocumentVerificationCancel = () => {
    setShowDocumentVerification(false);
  };

  // Formatar telefone para exibição
  const formatPhoneDisplay = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13 && cleaned.startsWith('55')) {
      const number = cleaned.slice(2);
      return `(${number.slice(0,2)}) ${number.slice(2,7)}-${number.slice(7)}`;
    }
    return phone;
  };

  


  if (authLoading || loading) {
=======
  


  if (authLoading) {
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
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

<<<<<<< HEAD
  // Modal de verificação de telefone
  if (showPhoneVerification) {
    return (
      <PhoneVerification
        userId={user.id}
        phone={userData.phone}
        onVerified={handlePhoneVerified}
        onBack={() => setShowPhoneVerification(false)}
      />
    );
  }

=======
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
  return (
    <>
      <Helmet>
        {/* Título pode ser ajustado para "Configurações da Conta" se preferir */}
        <title>Minhas Configurações | Mesapra2</title>
      </Helmet>
<<<<<<< HEAD
      <div className="space-y-8 max-w-4xl mx-auto py-8">
=======
      <div className="space-y-8 max-w-3xl mx-auto py-8">
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
        <h1 className="text-3xl font-bold gradient-text mb-4">
          Minhas Configurações
        </h1>

<<<<<<< HEAD
        {/* Seção Informações Pessoais */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="glass-effect rounded-2xl p-6 border border-white/10 space-y-6"
        >
          <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-3">
            <User className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Informações Pessoais</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nome Completo */}
            <div>
              <Label htmlFor="full_name" className="text-white mb-2 block">Nome Completo *</Label>
              <Input
                id="full_name"
                value={userData.full_name}
                onChange={(e) => setUserData(prev => ({ ...prev, full_name: e.target.value }))}
                className="glass-effect border-white/10 text-white"
                placeholder="Seu nome completo"
              />
            </div>

            {/* Username */}
            <div>
              <Label htmlFor="username" className="text-white mb-2 block">Nome de Usuário</Label>
              <Input
                id="username"
                value={userData.username}
                onChange={(e) => setUserData(prev => ({ ...prev, username: e.target.value }))}
                className="glass-effect border-white/10 text-white"
                placeholder="@seuusername"
              />
            </div>

            {/* Email (apenas leitura) */}
            <div>
              <Label htmlFor="email" className="text-white mb-2 block flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                id="email"
                value={userData.email}
                readOnly
                className="glass-effect border-white/10 text-white/60 bg-white/5 cursor-not-allowed"
                placeholder="Carregando..."
              />
              <p className="text-xs text-white/40 mt-1">Email não pode ser alterado aqui</p>
            </div>

            {/* Data de Nascimento */}
            <div>
              <Label htmlFor="birth_date" className="text-white mb-2 block flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data de Nascimento
              </Label>
              <Input
                id="birth_date"
                type="date"
                value={userData.birth_date}
                onChange={(e) => setUserData(prev => ({ ...prev, birth_date: e.target.value }))}
                className="glass-effect border-white/10 text-white/60 bg-white/5 cursor-not-allowed"
                disabled
                placeholder="Em breve..."
              />
              <p className="text-xs text-white/40 mt-1">Campo em desenvolvimento</p>
            </div>

            {/* Gênero */}
            <div>
              <Label htmlFor="gender" className="text-white mb-2 block flex items-center gap-2">
                <Users2 className="w-4 h-4" />
                Gênero
              </Label>
              <select
                id="gender"
                value={userData.gender}
                onChange={(e) => setUserData(prev => ({ ...prev, gender: e.target.value }))}
                className="w-full p-2 rounded-md glass-effect border border-white/10 text-white/60 bg-white/5 cursor-not-allowed"
                disabled
              >
                <option value="">Em desenvolvimento...</option>
                <option value="masculino">Ele/dele</option>
                <option value="feminino">Ela/dela</option>
                <option value="nao-binario">Elu/dele</option>
                <option value="prefiro-nao-dizer">Prefiro não dizer</option>
              </select>
              <p className="text-xs text-white/40 mt-1">Campo em desenvolvimento</p>
            </div>
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio" className="text-white mb-2 block">Sobre você</Label>
            <textarea
              id="bio"
              value={userData.bio}
              onChange={(e) => setUserData(prev => ({ ...prev, bio: e.target.value }))}
              className="w-full p-3 rounded-md glass-effect border border-white/10 text-white bg-black/20 min-h-[100px] resize-none"
              placeholder="Conte um pouco sobre você, seus interesses, o que gosta de fazer..."
              maxLength="500"
            />
            <p className="text-xs text-white/40 mt-1">{userData.bio.length}/500 caracteres</p>
          </div>

          <Button
            onClick={saveUserData}
            disabled={saving}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {saving ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Informações
              </>
            )}
          </Button>
        </motion.div>

        {/* Seção Telefone */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          className="glass-effect rounded-2xl p-6 border border-white/10 space-y-4"
        >
          <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-3">
            <Phone className="w-5 h-5 text-green-400" />
            <h2 className="text-xl font-semibold text-white">Telefone</h2>
          </div>
          
          {!editingPhone ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">{formatPhoneDisplay(userData.phone) || 'Nenhum telefone cadastrado'}</p>
                {userData.phone && (
                  <p className="text-sm text-white/60">
                    {profile?.phone_verified ? (
                      <span className="text-green-400">✓ Verificado</span>
                    ) : (
                      <span className="text-orange-400">⚠ Não verificado</span>
                    )}
                  </p>
                )}
              </div>
              <Button
                onClick={startPhoneEdit}
                variant="outline"
                size="sm"
                className="glass-effect border-white/10 hover:bg-white/5"
              >
                <Edit className="mr-1 h-4 w-4" />
                {userData.phone ? 'Alterar' : 'Adicionar'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone" className="text-white mb-2 block">Telefone com DDD (11 dígitos)</Label>
                <Input
                  id="phone"
                  value={tempPhone}
                  onChange={(e) => setTempPhone(e.target.value)}
                  className="glass-effect border-white/10 text-white"
                  placeholder="Ex: 11999999999 ou +5511999999999"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={savePhone}
                  disabled={saving}
                  className="bg-gradient-to-r from-green-500 to-green-600"
                >
                  {saving ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  onClick={cancelPhoneEdit}
                  variant="outline"
                  className="glass-effect border-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Input para código de verificação SMS */}
              {showPhoneCodeInput && (
                <div className="space-y-4 mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div>
                    <Label htmlFor="verification_code" className="text-white mb-2 block">
                      Código de Verificação (6 dígitos)
                    </Label>
                    <Input
                      id="verification_code"
                      value={phoneVerificationCode}
                      onChange={(e) => setPhoneVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="glass-effect border-white/10 text-white text-center text-lg tracking-widest"
                      placeholder="123456"
                      maxLength="6"
                    />
                    <p className="text-sm text-white/60 mt-2">
                      Digite o código enviado para {formatPhoneDisplay(tempPhone)}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={verifyPhoneCode}
                      disabled={saving || phoneVerificationCode.length !== 6}
                      className="bg-gradient-to-r from-green-500 to-green-600"
                    >
                      {saving ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Verificar
                    </Button>
                    
                    <Button
                      onClick={() => sendVerificationCode(tempPhone)}
                      disabled={sendingCode}
                      variant="outline"
                      className="glass-effect border-white/10"
                    >
                      {sendingCode ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        'Reenviar'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Seção Configurações de Privacidade */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.25 }}
          className="glass-effect rounded-2xl p-6 border border-white/10 space-y-6"
        >
          <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-3">
            <Shield className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Privacidade e Interações</h2>
          </div>
          
          <div className="space-y-4">
            {/* Perfil Público */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div>
                <h3 className="text-white font-medium">Perfil Público</h3>
                <p className="text-white/60 text-sm">Permitir que outros usuários vejam seu perfil</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={userData.public_profile}
                  onChange={(e) => setUserData(prev => ({ ...prev, public_profile: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Aceitar Toks */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div>
                <h3 className="text-white font-medium">Aceitar Toks 👇</h3>
                <p className="text-white/60 text-sm">Permitir que outros usuários enviem Toks para você</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={userData.allow_pokes}
                  onChange={(e) => setUserData(prev => ({ ...prev, allow_pokes: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <Button
            onClick={saveUserData}
            disabled={saving}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            {saving ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </motion.div>

        {/* Seção Aceitar Toks */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.5 }}
          className="glass-effect rounded-2xl p-6 border border-white/10"
        >
          <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-3">
            <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3.5m0 0V11" />
            </svg>
            <h2 className="text-xl font-semibold text-white">Interações e Toks</h2>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3.5m0 0V11" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Permitir Toks</h3>
                <p className="text-sm text-white/60">Controla se você deseja receber toks de outros usuários</p>
              </div>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={userData.allow_pokes}
                onChange={(e) => handleInputChange('allow_pokes', e.target.checked)}
                className="sr-only"
              />
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                userData.allow_pokes ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-white/20'
              }`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  userData.allow_pokes ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </div>
            </label>
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">Sobre os tipos de interação:</p>
                <ul className="space-y-1 text-xs">
                  <li>• <strong>Toks:</strong> Interações casuais diárias {userData.allow_pokes ? '(ATIVADO)' : '(DESATIVADO)'}</li>
                  <li>• <strong>Eventos Crusher:</strong> Convites para encontros (sempre ativo)</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Seção Modo Escuro */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.6 }}
          className="glass-effect rounded-2xl p-6 border border-white/10"
        >
          <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-3">
            {userData.dark_mode ? (
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
            <h2 className="text-xl font-semibold text-white">Aparência</h2>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                userData.dark_mode ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gradient-to-r from-yellow-400 to-orange-500'
              }`}>
                {userData.dark_mode ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {userData.dark_mode ? 'Modo Escuro' : 'Modo Claro'}
                </h3>
                <p className="text-sm text-white/60">Alterna entre tema escuro e claro da interface</p>
              </div>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={userData.dark_mode}
                onChange={(e) => handleInputChange('dark_mode', e.target.checked)}
                className="sr-only"
              />
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                userData.dark_mode ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gradient-to-r from-yellow-400 to-orange-500'
              }`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  userData.dark_mode ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </div>
            </label>
          </div>
        </motion.div>

        {/* Seção Notificações por Email */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.7 }}
          className="glass-effect rounded-2xl p-6 border border-white/10"
        >
          <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-3">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h2 className="text-xl font-semibold text-white">Notificações</h2>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-teal-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Notificações por Email</h3>
                <p className="text-sm text-white/60">Receba alertas de eventos também por email</p>
              </div>
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={userData.email_notifications}
                onChange={(e) => handleInputChange('email_notifications', e.target.checked)}
                className="sr-only"
              />
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                userData.email_notifications ? 'bg-gradient-to-r from-green-500 to-teal-500' : 'bg-white/20'
              }`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  userData.email_notifications ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </div>
            </label>
          </div>
        </motion.div>

        {/* Seção Endereços de Entrega */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.8 }}
          className="glass-effect rounded-2xl p-6 border border-white/10"
        >
          <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-3">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h2 className="text-xl font-semibold text-white">Endereços de Entrega</h2>
          </div>

          {defaultAddress ? (
            <div className="space-y-4">
              {/* Endereço padrão */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-white">{defaultAddress.label}</h4>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                          Padrão
                        </span>
                      </div>
                      <p className="text-white/80 text-sm">
                        {defaultAddress.street}, {defaultAddress.number}
                        {defaultAddress.complement && `, ${defaultAddress.complement}`}
                      </p>
                      <p className="text-white/60 text-sm">
                        {defaultAddress.neighborhood} - {defaultAddress.city}/{defaultAddress.state}
                      </p>
                      <p className="text-white/60 text-sm">
                        CEP: {AddressService.formatZipCode(defaultAddress.zip_code)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowAddressManager(true)}
                variant="outline"
                className="w-full glass-effect border-white/20 text-white hover:bg-white/10"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Gerenciar Endereços
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Nenhum endereço cadastrado
              </h3>
              <p className="text-white/60 text-sm mb-4">
                Adicione um endereço para receber entregas do Mesapra2
              </p>
              
              <Button
                onClick={() => setShowAddressManager(true)}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Adicionar Primeiro Endereço
              </Button>
            </div>
          )}

          {/* Informações sobre entrega */}
          <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">Sobre entregas:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Entregas disponíveis em eventos selecionados</li>
                  <li>• Você pode cadastrar múltiplos endereços</li>
                  <li>• O endereço padrão será usado automaticamente</li>
                  <li>• Verificamos a área de entrega para cada evento</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Seção Verificação de Identidade */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }}
          className="glass-effect rounded-2xl p-6 border border-white/10 space-y-6"
        >
          <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-3">
            <Shield className="w-5 h-5 text-green-400" />
            <h2 className="text-xl font-semibold text-white">Verificação de Identidade</h2>
            {userData.is_verified && (
              <VerificationBadge 
                isVerified={true} 
                size="default" 
                showLabel={true}
                className="ml-auto"
              />
            )}
          </div>
          
          <div className="space-y-4">
            {/* Status da Verificação */}
            <div className={`
              p-4 rounded-lg border flex items-start gap-4
              ${userData.is_verified 
                ? 'bg-green-500/10 border-green-500/20' 
                : userData.verification_status === 'pending'
                  ? 'bg-yellow-500/10 border-yellow-500/20'
                  : userData.verification_status === 'rejected'
                    ? 'bg-red-500/10 border-red-500/20'
                    : 'bg-blue-500/10 border-blue-500/20'
              }
            `}>
              <div className="flex-1">
                {userData.is_verified ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="w-5 h-5 text-green-400" />
                      <h3 className="text-green-400 font-medium">Identidade Verificada</h3>
                    </div>
                    <p className="text-green-300/80 text-sm">
                      Sua identidade foi confirmada com sucesso! Você agora tem acesso a 
                      funcionalidades exclusivas e maior confiança da comunidade.
                    </p>
                  </>
                ) : userData.verification_status === 'pending' ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Loader className="w-5 h-5 text-yellow-400 animate-spin" />
                      <h3 className="text-yellow-400 font-medium">Verificação em Análise</h3>
                    </div>
                    <p className="text-yellow-300/80 text-sm">
                      Seus documentos estão sendo analisados por nossa equipe. 
                      Este processo pode levar até 24 horas. Você será notificado do resultado.
                    </p>
                  </>
                ) : userData.verification_status === 'rejected' ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <X className="w-5 h-5 text-red-400" />
                      <h3 className="text-red-400 font-medium">Verificação Rejeitada</h3>
                    </div>
                    <p className="text-red-300/80 text-sm">
                      Não foi possível verificar sua identidade. Verifique se os documentos 
                      estão legíveis e tente novamente.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-blue-400" />
                      <h3 className="text-blue-400 font-medium">Verificação Disponível</h3>
                    </div>
                    <p className="text-blue-300/80 text-sm">
                      Verifique sua identidade para aumentar a confiança da comunidade 
                      e desbloquear funcionalidades exclusivas.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Benefícios da Verificação */}
            {!userData.is_verified && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-medium">Selo Verificado</span>
                  </div>
                  <p className="text-white/60 text-sm">
                    Receba um selo azul que comprova sua identidade
                  </p>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Users2 className="w-5 h-5 text-green-400" />
                    <span className="text-white font-medium">Maior Confiança</span>
                  </div>
                  <p className="text-white/60 text-sm">
                    Outros usuários confiam mais em perfis verificados
                  </p>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <span className="text-white font-medium">Prioridade</span>
                  </div>
                  <p className="text-white/60 text-sm">
                    Maior prioridade em eventos e interações
                  </p>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Gift className="w-5 h-5 text-purple-400" />
                    <span className="text-white font-medium">Funcionalidades</span>
                  </div>
                  <p className="text-white/60 text-sm">
                    Acesso a recursos exclusivos da plataforma
                  </p>
                </div>
              </div>
            )}

            {/* Botão de Ação */}
            {!userData.is_verified && userData.verification_status !== 'pending' && (
              <Button
                onClick={() => setShowDocumentVerification(true)}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                size="lg"
              >
                <Shield className="w-5 h-5 mr-2" />
                {userData.verification_status === 'rejected' 
                  ? 'Tentar Verificação Novamente' 
                  : 'Iniciar Verificação de Identidade'
                }
              </Button>
            )}
          </div>
        </motion.div>

        {/* Seção Endereço */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }}
          className="glass-effect rounded-2xl p-6 border border-white/10 space-y-6"
        >
          <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-3">
            <MapPin className="w-5 h-5 text-orange-400" />
            <h2 className="text-xl font-semibold text-white">Endereço para Entrega</h2>
            <span className="text-sm text-white/60">(Receba Gifts)</span>
          </div>
          
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-300 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              A Funcionalidade de receber presentes necessita de seus dados de endereço.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-50">
            {/* CEP */}
            <div>
              <Label htmlFor="zip_code" className="text-white/60 mb-2 block">CEP</Label>
              <Input
                id="zip_code"
                value={userData.address.zip_code}
                onChange={(e) => setUserData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, zip_code: e.target.value }
                }))}
                className="glass-effect border-white/10 text-white/60 bg-white/5 cursor-not-allowed"
                placeholder="00000-000"
                maxLength="9"
                disabled
              />
            </div>

            {/* Rua */}
            <div>
              <Label htmlFor="street" className="text-white mb-2 block">Rua/Avenida</Label>
              <Input
                id="street"
                value={userData.address.street}
                onChange={(e) => setUserData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, street: e.target.value }
                }))}
                className="glass-effect border-white/10 text-white"
                placeholder="Nome da rua"
              />
            </div>

            {/* Número */}
            <div>
              <Label htmlFor="number" className="text-white mb-2 block">Número</Label>
              <Input
                id="number"
                value={userData.address.number}
                onChange={(e) => setUserData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, number: e.target.value }
                }))}
                className="glass-effect border-white/10 text-white"
                placeholder="123"
              />
            </div>

            {/* Complemento */}
            <div>
              <Label htmlFor="complement" className="text-white mb-2 block">Complemento</Label>
              <Input
                id="complement"
                value={userData.address.complement}
                onChange={(e) => setUserData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, complement: e.target.value }
                }))}
                className="glass-effect border-white/10 text-white"
                placeholder="Apt, bloco, etc."
              />
            </div>

            {/* Bairro */}
            <div>
              <Label htmlFor="neighborhood" className="text-white mb-2 block">Bairro</Label>
              <Input
                id="neighborhood"
                value={userData.address.neighborhood}
                onChange={(e) => setUserData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, neighborhood: e.target.value }
                }))}
                className="glass-effect border-white/10 text-white"
                placeholder="Nome do bairro"
              />
            </div>

            {/* Cidade */}
            <div>
              <Label htmlFor="city" className="text-white mb-2 block">Cidade</Label>
              <Input
                id="city"
                value={userData.address.city}
                onChange={(e) => setUserData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, city: e.target.value }
                }))}
                className="glass-effect border-white/10 text-white"
                placeholder="Nome da cidade"
              />
            </div>

            {/* Estado */}
            <div>
              <Label htmlFor="state" className="text-white mb-2 block">Estado</Label>
              <select
                id="state"
                value={userData.address.state}
                onChange={(e) => setUserData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, state: e.target.value }
                }))}
                className="w-full p-2 rounded-md glass-effect border border-white/10 text-white bg-black/20"
              >
                <option value="">Selecione</option>
                <option value="AC">Acre</option>
                <option value="AL">Alagoas</option>
                <option value="AP">Amapá</option>
                <option value="AM">Amazonas</option>
                <option value="BA">Bahia</option>
                <option value="CE">Ceará</option>
                <option value="DF">Distrito Federal</option>
                <option value="ES">Espírito Santo</option>
                <option value="GO">Goiás</option>
                <option value="MA">Maranhão</option>
                <option value="MT">Mato Grosso</option>
                <option value="MS">Mato Grosso do Sul</option>
                <option value="MG">Minas Gerais</option>
                <option value="PA">Pará</option>
                <option value="PB">Paraíba</option>
                <option value="PR">Paraná</option>
                <option value="PE">Pernambuco</option>
                <option value="PI">Piauí</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="RN">Rio Grande do Norte</option>
                <option value="RS">Rio Grande do Sul</option>
                <option value="RO">Rondônia</option>
                <option value="RR">Roraima</option>
                <option value="SC">Santa Catarina</option>
                <option value="SP">São Paulo</option>
                <option value="SE">Sergipe</option>
                <option value="TO">Tocantins</option>
              </select>
            </div>
          </div>

          <Button
            onClick={() => {}}
            disabled={true}
            className="bg-gradient-to-r from-gray-500 to-gray-600 cursor-not-allowed opacity-50"
          >
            <Save className="mr-2 h-4 w-4" />
            Em Desenvolvimento
          </Button>
        </motion.div>

        {/* Seção Segurança da Conta */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4 }}
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
=======
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
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
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
<<<<<<< HEAD

      {/* Modal de Gerenciamento de Endereços */}
      {showAddressManager && (
        <AddressManager
          onClose={() => setShowAddressManager(false)}
          onSuccess={() => {
            loadDefaultAddress();
            toast({
              title: "Endereços atualizados!",
              description: "Suas alterações foram salvas com sucesso.",
            });
          }}
        />
      )}

      {/* Modal de Verificação de Documentos */}
      {showDocumentVerification && (
        <DocumentVerificationNew
          userId={user?.id}
          onComplete={handleDocumentVerificationComplete}
          onCancel={handleDocumentVerificationCancel}
        />
      )}
=======
>>>>>>> abc780a8003f9fe8f6caa4cf223087706e04f925
    </>
  );
};

export default UserSettings;