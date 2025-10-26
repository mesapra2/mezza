// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import EventStatusService from '@/services/EventStatusService';

// Layout
import Layout from '@/components/Layout';

// Autenticação
import LoginPage from '@/features/shared/pages/LoginPage';
import RegisterPage from '@/features/shared/pages/RegisterPage';
import PartnerRegisterPage from '@/features/partner/pages/PartnerRegisterPage';

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

function App() {
  const { user, profile, loading } = useAuth();

  const isLoading = loading || (user && !profile);

  // 👇 Iniciar monitoramento automático de status de eventos
  useEffect(() => {
    if (user) {
      console.log('✅ Iniciando monitoramento automático de status de eventos');
      const intervalId = EventStatusService.startAutoUpdate();

      return () => {
        if (intervalId) {
          console.log('⏹️ Parando monitoramento de status de eventos');
          EventStatusService.stopAutoUpdate(intervalId);
        }
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
            {/* PARCEIROS */}
            {isPartner ? (
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/partner/dashboard" replace />} />
                <Route path="partner/dashboard" element={<PartnerDashboard />} />
                <Route path="partner/settings" element={<PartnerSettings />} />
                <Route path="events" element={<FeedPartnerEvent />} />
                <Route path="meus-eventos" element={<EventManagementPartner />} />
                <Route path="restaurants" element={<RestaurantsPage />} />
                <Route path="people" element={<PeoplePage />} />
                <Route path="chats" element={<ChatHistoryPage />} />
                <Route path="profile/:id" element={<ProfilePage />} />
                <Route path="partner/create-event" element={<CreateEventPartner />} />
                <Route path="partner/edit-event/:id" element={<EditEventPagePartner />} />
                <Route path="event/:id" element={<EventDetails />} />
                <Route path="event/:id/chat" element={<EventChatPage />} />
                <Route path="restaurant/:id" element={<PartnerProfilePage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="*" element={<Navigate to="/partner/dashboard" replace />} />
              </Route>
            ) : (
              /* USUÁRIOS NORMAIS */
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="events" element={<EventsPage />} />
                <Route path="event/:id" element={<EventDetails />} />
                <Route path="event/:id/chat" element={<EventChatPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="meus-eventos" element={<MyEventsPage />} />
                <Route path="editar-evento/:id" element={<EditEventPage />} />
                <Route path="criar-evento" element={<CreateEvent />} />
                <Route path="criar-evento/particular" element={<CreateEventParticular />} />
                <Route path="criar-evento/crusher" element={<CreateEventCrusher />} />
                <Route path="restaurants" element={<RestaurantsPage />} />
                <Route path="restaurant/:id" element={<PartnerProfilePage />} />
                <Route path="people" element={<PeoplePage />} />
                <Route path="profile/:id" element={<ProfilePage />} />
                <Route path="chats" element={<ChatHistoryPage />} />
                <Route path="settings" element={<UserSettings />} />
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