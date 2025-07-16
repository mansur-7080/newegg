import React from 'react';
import { Result, Button } from 'antd';

interface ErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetErrorBoundary 
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh' 
    }}>
      <Result
        status="error"
        title="Something went wrong"
        subTitle={error?.message || 'An unexpected error occurred'}
        extra={[
          <Button type="primary" key="retry" onClick={resetErrorBoundary}>
            Try Again
          </Button>,
          <Button key="reload" onClick={() => window.location.reload()}>
            Reload Page
          </Button>,
        ]}
      />
    </div>
  );
};

export default ErrorFallback;