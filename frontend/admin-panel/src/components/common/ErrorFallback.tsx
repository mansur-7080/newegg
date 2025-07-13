import React from 'react';
import { Result, Button, Typography, Alert } from 'antd';
import { ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';

const { Paragraph, Text } = Typography;

interface ErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  const handleReload = () => {
    if (resetErrorBoundary) {
      resetErrorBoundary();
    } else {
      window.location.reload();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        padding: '24px',
      }}
    >
      <Result
        status="error"
        icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
        title="Something went wrong"
        subTitle="An unexpected error occurred. Please try again or contact support if the problem persists."
        extra={[
          <Button type="primary" key="reload" icon={<ReloadOutlined />} onClick={handleReload}>
            Try Again
          </Button>,
          <Button key="home" onClick={() => window.location.href = '/dashboard'}>
            Go to Dashboard
          </Button>,
        ]}
      >
        {error && (
          <div style={{ textAlign: 'left', marginTop: '24px' }}>
            <Alert
              message="Error Details (Development Mode)"
              description={
                <div>
                  <Paragraph>
                    <Text strong>Error Message:</Text>
                    <br />
                    <Text code>{error.message}</Text>
                  </Paragraph>
                  {error.stack && (
                    <Paragraph>
                      <Text strong>Stack Trace:</Text>
                      <br />
                      <Text code style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                        {error.stack}
                      </Text>
                    </Paragraph>
                  )}
                </div>
              }
              type="error"
              showIcon
              style={{ textAlign: 'left' }}
            />
          </div>
        )}
      </Result>
    </div>
  );
};

export default ErrorFallback;