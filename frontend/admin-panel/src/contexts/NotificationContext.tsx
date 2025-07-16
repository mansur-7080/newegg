import React, { createContext, useContext, useState, ReactNode } from 'react';
import { notification } from 'antd';

interface NotificationContextType {
  showSuccess: (message: string, description?: string) => void;
  showError: (message: string, description?: string) => void;
  showWarning: (message: string, description?: string) => void;
  showInfo: (message: string, description?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [api, contextHolder] = notification.useNotification();

  const showSuccess = (message: string, description?: string) => {
    api.success({
      message,
      description,
      placement: 'topRight',
    });
  };

  const showError = (message: string, description?: string) => {
    api.error({
      message,
      description,
      placement: 'topRight',
    });
  };

  const showWarning = (message: string, description?: string) => {
    api.warning({
      message,
      description,
      placement: 'topRight',
    });
  };

  const showInfo = (message: string, description?: string) => {
    api.info({
      message,
      description,
      placement: 'topRight',
    });
  };

  const value = {
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={value}>
      {contextHolder}
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};