import React from 'react';
import { Button, Card, Typography, Space, Alert } from 'antd';
import { ReloadOutlined, HomeOutlined, BugOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReportError = () => {
    // Send error to monitoring service
    console.error('Error reported:', error);
    // You can integrate with Sentry or other error tracking service here
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full shadow-lg">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BugOutlined className="text-2xl text-red-600" />
          </div>
          
          <Title level={3} className="mb-2">
            Xatolik yuz berdi
          </Title>
          
          <Paragraph className="text-gray-600 mb-6">
            Nimadir noto'g'ri ketdi. Iltimos, sahifani yangilashga harakat qiling yoki bosh sahifaga qayting.
          </Paragraph>

          <Alert
            message="Texnik ma'lumotlar"
            description={
              <details className="text-left">
                <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                  Xatolik tafsilotlari
                </summary>
                <pre className="text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-32">
                  {error.message}
                  {error.stack && (
                    <>
                      {'\n'}
                      {error.stack}
                    </>
                  )}
                </pre>
              </details>
            }
            type="error"
            showIcon
            className="mb-4"
          />

          <Space direction="vertical" className="w-full">
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={resetErrorBoundary}
              className="w-full"
            >
              Qayta urinish
            </Button>
            
            <Button
              icon={<HomeOutlined />}
              onClick={handleGoHome}
              className="w-full"
            >
              Bosh sahifa
            </Button>
            
            <Button
              icon={<BugOutlined />}
              onClick={handleReportError}
              className="w-full"
            >
              Xatolikni hisobot qilish
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default ErrorFallback;