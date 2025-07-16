import React from 'react';
import { Layout, Card } from 'antd';
// import { Outlet } from 'react-router-dom';

const { Content } = Layout;

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <Layout style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Content style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px'
      }}>
        <Card
          style={{
            width: '100%',
            maxWidth: 400,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          }}
          bodyStyle={{ padding: '40px' }}
        >
          <div style={{
            textAlign: 'center',
            marginBottom: '30px'
          }}>
            <h1 style={{ 
              color: '#1890ff',
              marginBottom: '8px',
              fontSize: '28px'
            }}>
              UltraMarket
            </h1>
            <p style={{ 
              color: '#666',
              margin: 0
            }}>
              Admin Panel
            </p>
          </div>
          {children}
        </Card>
      </Content>
    </Layout>
  );
};

export default AuthLayout;