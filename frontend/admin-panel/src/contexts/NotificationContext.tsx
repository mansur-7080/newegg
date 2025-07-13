import React, { createContext, useContext, ReactNode } from 'react';
import { notification } from 'antd';
import type { NotificationArgsProps } from 'antd';

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
      duration: 4.5,
    });
  };

  const showError = (message: string, description?: string) => {
    api.error({
      message,
      description,
      placement: 'topRight',
      duration: 6,
    });
  };

  const showWarning = (message: string, description?: string) => {
    api.warning({
      message,
      description,
      placement: 'topRight',
      duration: 4.5,
    });
  };

  const showInfo = (message: string, description?: string) => {
    api.info({
      message,
      description,
      placement: 'topRight',
      duration: 4.5,
    });
  };

  const value: NotificationContextType = {
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

export default NotificationContext;