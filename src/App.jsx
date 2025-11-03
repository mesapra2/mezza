// src/App.jsx
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import PropTypes from 'prop-types';
import { useAuth } from '@/contexts/AuthContext';
import EventStatusService from '@/services/EventStatusService';

// Layout
import Layout from '@/components/Layout';

// Autenticação
import AuthCallbackPage from '@/features/shared/pages/AuthCallbackPage';
import LoginPage from '@/features/shared/pages/LoginPage';
import RegisterPage from '@/features/shared/pages/RegisterPage';
import PartnerRegisterPage from '@/features/partner/pages/PartnerRegisterPage';
import PhoneVerificationPage from '@/features/shared/pages/PhoneVerificationPage';

// === PÁGINAS DO USUÁRIO (features/user/pages) ===
import Dashboard from '@/features/user/pages/Dashboard';
import CreateEvent from '@/features/user/pages/CreateEvent';
import CreateEventParticular from '@/features/user/pages/CreateEventParticular';
import CreateEventCrusher from '@/features/user/pages/CreateEventCrusher';
import EditEventPage from '@/features/user/pages/EditEventPage';
import UserSettings from '@/features/user/pages/UserSettings';

// === PÁGINAS DO PARCEIRO (features/partner/pages) ===
import PartnerDashboard from '@/features/partner/pages/PartnerDashboard';
import CreateEventPartner from '@/features/partner/pages/CreateEventPartner';
import EditEventPagePartner from '@/features/partner/pages/EditEventPagePartner';
import EventManagementPartner from '@/features/partner/pages/EventManagementPartner';
import FeedPartnerEvent from '@/features/partner/pages/FeedPartnerEvent';
import PartnerSettings from '@/features/partner/pages/PartnerSettings';

// === PÁGINAS COMPARTILHADAS (features/shared/pages) ===
import EventsPage from '@/features/shared/pages/EventsPage';
import RestaurantsPage from '@/features/shared/pages/RestaurantsPage';
import PeoplePage from '@/features/shared/pages/PeoplePage';
import NotificationsPage from '@/features/shared/pages/NotificationsPage';
import EventDetails from '@/features/shared/pages/EventDetails';
import EventChatPage from '@/features/shared/pages/EventChatPage';
import ChatHistoryPage from '@/features/shared/pages/ChatHistoryPage';
import ProfilePage from '@/features/shared/pages/ProfilePage';
import PartnerProfilePage from '@/features/shared/pages/PartnerProfilePage';
import MyEventsPage from '@/features/shared/pages/MyEventsPage';

// 🛡️ Componente para verificar telefone verificado
const RequirePhoneVerification = ({ children }) => {
  const { user, profile } = useAuth();
  const location = useLocation();

  // Aguarda o profile carregar
  if (user && !profile) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // ✅ Se o usuário NÃO TEM telefone cadastrado, permite acesso
  // (usuários antigos que não precisam verificar)
  if (profile && !profile.phone) {
    console.log('✅ Usuário sem telefone - acesso liberado');
    return children;
  }

  // ✅ Se o telefone JÁ ESTÁ VERIFICADO, permite acesso
  if (profile && profile.phone_verified) {
    console.log('✅ Telefone verificado - acesso liberado');
    return children;
  }

  // ❌ Se tem telefone MAS NÃO verificou, redireciona para verificação
  if (profile && profile.phone && !profile.phone_verified) {
    console.log('⚠️ Telefone não verificado - redirecionando para /verify-phone');
    return <Navigate to="/verify-phone" state={{ from: location }} replace />;
  }

  return children;
};

// Validação de PropTypes
RequirePhoneVerification.propTypes = {
  children: PropTypes.node.isRequired,
};

function App() {
  const { user, profile, loading } = useAuth();

  const isLoading = loading || (user && !profile);

  // 🔄 Iniciar monitoramento automático de status de eventos
  useEffect(() => {
    if (user) {
      console.log('✅ Iniciando monitoramento automático de status de eventos');
      EventStatusService.startAutoUpdate(30); // Atualiza a cada 30 segundos

      return () => {
        console.log('ℹ️ Parando monitoramento de status de eventos');
        EventStatusService.stopAutoUpdate();
      };
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isPartner = profile?.profile_type === 'partner' || profile?.partner_id != null;

  return (
    <>
      <Helmet>
        <title>Mesapra2</title>
        <meta name="description" content="Conectando pessoas através de eventos de social dining." />
      </Helmet>

      <Routes>
        {/* ===== 🔐 ROTA DO CALLBACK - DEVE ESTAR FORA DO CONDICIONAL user ===== */}
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* ROTAS PÚBLICAS (sem login) */}
        {!user ? (
          <Route path="/" element={<Layout isPublic={true} />}>
            <Route index element={<Navigate to="/login" replace />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="partner/register" element={<PartnerRegisterPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Route>
        ) : (
          /* ROTAS AUTENTICADAS */
          <>
            {/* 📱 ROTA DE VERIFICAÇÃO DE TELEFONE - PhoneVerificationPage é uma página completa */}
            <Route path="/verify-phone" element={<PhoneVerificationPage />} />

            {/* PARCEIROS */}
            {isPartner ? (
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/partner/dashboard" replace />} />
                
                {/* 🛡️ Rotas protegidas - requerem telefone verificado */}
                <Route 
                  path="partner/dashboard" 
                  element={
                    <RequirePhoneVerification>
                      <PartnerDashboard />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="partner/settings" 
                  element={
                    <RequirePhoneVerification>
                      <PartnerSettings />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="events" 
                  element={
                    <RequirePhoneVerification>
                      <FeedPartnerEvent />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="meus-eventos" 
                  element={
                    <RequirePhoneVerification>
                      <EventManagementPartner />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="restaurants" 
                  element={
                    <RequirePhoneVerification>
                      <RestaurantsPage />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="people" 
                  element={
                    <RequirePhoneVerification>
                      <PeoplePage />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="chats" 
                  element={
                    <RequirePhoneVerification>
                      <ChatHistoryPage />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="profile/:id" 
                  element={
                    <RequirePhoneVerification>
                      <ProfilePage />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="partner/create-event" 
                  element={
                    <RequirePhoneVerification>
                      <CreateEventPartner />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="partner/edit-event/:id" 
                  element={
                    <RequirePhoneVerification>
                      <EditEventPagePartner />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="event/:id" 
                  element={
                    <RequirePhoneVerification>
                      <EventDetails />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="event/:id/chat" 
                  element={
                    <RequirePhoneVerification>
                      <EventChatPage />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="restaurant/:id" 
                  element={
                    <RequirePhoneVerification>
                      <PartnerProfilePage />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="notifications" 
                  element={
                    <RequirePhoneVerification>
                      <NotificationsPage />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route path="*" element={<Navigate to="/partner/dashboard" replace />} />
              </Route>
            ) : (
              /* USUÁRIOS NORMAIS */
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                
                {/* 🛡️ Rotas protegidas - requerem telefone verificado */}
                <Route 
                  path="dashboard" 
                  element={
                    <RequirePhoneVerification>
                      <Dashboard />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="events" 
                  element={
                    <RequirePhoneVerification>
                      <EventsPage />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="event/:id" 
                  element={
                    <RequirePhoneVerification>
                      <EventDetails />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="event/:id/chat" 
                  element={
                    <RequirePhoneVerification>
                      <EventChatPage />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="notifications" 
                  element={
                    <RequirePhoneVerification>
                      <NotificationsPage />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="meus-eventos" 
                  element={
                    <RequirePhoneVerification>
                      <MyEventsPage />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="editar-evento/:id" 
                  element={
                    <RequirePhoneVerification>
                      <EditEventPage />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="criar-evento" 
                  element={
                    <RequirePhoneVerification>
                      <CreateEvent />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="criar-evento/particular" 
                  element={
                    <RequirePhoneVerification>
                      <CreateEventParticular />
                    </RequirePhoneVerification>
                  } 
                />
                
                {/* ✅ ROTA CRUSHER CORRIGIDA - estava faltando esta rota! */}
                <Route 
                  path="criar-evento/crusher" 
                  element={
                    <RequirePhoneVerification>
                      <CreateEventCrusher />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="restaurants" 
                  element={
                    <RequirePhoneVerification>
                      <RestaurantsPage />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="restaurant/:id" 
                  element={
                    <RequirePhoneVerification>
                      <PartnerProfilePage />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="people" 
                  element={
                    <RequirePhoneVerification>
                      <PeoplePage />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="profile/:id" 
                  element={
                    <RequirePhoneVerification>
                      <ProfilePage />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="chats" 
                  element={
                    <RequirePhoneVerification>
                      <ChatHistoryPage />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route 
                  path="settings" 
                  element={
                    <RequirePhoneVerification>
                      <UserSettings />
                    </RequirePhoneVerification>
                  } 
                />
                
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            )}
          </>
        )}
      </Routes>
    </>
  );
}

export default App;