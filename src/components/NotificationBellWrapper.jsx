// src/components/NotificationBellWrapper.jsx
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import NotificationDropdown from './NotificationDropdown';

const NotificationBellWrapper = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return <NotificationDropdown userId={user.id} />;
};

export default NotificationBellWrapper;