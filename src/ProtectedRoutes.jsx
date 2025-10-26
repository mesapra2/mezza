// src/ProtectedRoutes.jsx
import PropTypes from 'prop-types'; // Importe PropTypes
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { user, loading, profile } = useAuth();
  const isLoading = loading || (user && !profile);

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node,
};

export const ProtectedUserRoute = ({ children }) => {
  const { profile } = useAuth();
  const isPartner = profile?.profile_type === 'partner' || profile?.partner_id != null;

  if (isPartner) {
    return <Navigate to="/partner/dashboard" replace />;
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
};

ProtectedUserRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export const ProtectedPartnerRoute = ({ children }) => {
  const { profile } = useAuth();
  const isPartner = profile?.profile_type === 'partner' || profile?.partner_id != null;

  if (!isPartner) {
    return <Navigate to="/dashboard" replace />;
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
};

ProtectedPartnerRoute.propTypes = {
  children: PropTypes.node.isRequired,
};