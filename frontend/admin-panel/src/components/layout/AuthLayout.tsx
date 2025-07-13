import React from 'react';
import { Layout, Card, Typography } from 'antd';
import { ShopOutlined } from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Content
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '50px',
        }}
      >
        <Card
          style={{
            width: '100%',
            maxWidth: 400,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            borderRadius: '16px',
            border: 'none',
          }}
          bodyStyle={{
            padding: '40px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                marginBottom: '16px',
              }}
            >
              <ShopOutlined style={{ fontSize: '32px', color: 'white' }} />
            </div>
            <Title level={2} style={{ margin: 0, color: '#1f2937' }}>
              UltraMarket
            </Title>
            <Text type="secondary" style={{ fontSize: '16px' }}>
              Admin Panel
            </Text>
          </div>
          {children}
        </Card>
      </Content>
    </Layout>
  );
};

export default AuthLayout;