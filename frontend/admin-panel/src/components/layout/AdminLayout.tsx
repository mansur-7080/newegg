import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Badge, Space } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  ShopOutlined,
  BarChartOutlined,
  FileTextOutlined,
  TeamOutlined,
  MonitorOutlined,
  AuditOutlined,
  GiftOutlined,
  MessageOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'products',
      icon: <ShopOutlined />,
      label: 'Products',
      children: [
        {
          key: '/products',
          label: 'Product List',
        },
        {
          key: '/products/add',
          label: 'Add Product',
        },
        {
          key: '/products/categories',
          label: 'Categories',
        },
      ],
    },
    {
      key: 'orders',
      icon: <ShoppingOutlined />,
      label: 'Orders',
      children: [
        {
          key: '/orders',
          label: 'Order List',
        },
        {
          key: '/orders/pending',
          label: 'Pending Orders',
        },
        {
          key: '/orders/completed',
          label: 'Completed Orders',
        },
      ],
    },
    {
      key: '/inventory',
      icon: <AppstoreOutlined />,
      label: 'Inventory',
    },
    {
      key: '/users',
      icon: <TeamOutlined />,
      label: 'Users',
    },
    {
      key: '/reviews',
      icon: <MessageOutlined />,
      label: 'Reviews',
    },
    {
      key: '/promotions',
      icon: <GiftOutlined />,
      label: 'Promotions',
    },
    {
      key: '/content',
      icon: <FileTextOutlined />,
      label: 'Content',
    },
    {
      key: 'analytics',
      icon: <BarChartOutlined />,
      label: 'Analytics',
      children: [
        {
          key: '/analytics',
          label: 'Dashboard',
        },
        {
          key: '/analytics/sales',
          label: 'Sales Analytics',
        },
        {
          key: '/analytics/users',
          label: 'User Analytics',
        },
      ],
    },
    {
      key: '/reports',
      icon: <FileTextOutlined />,
      label: 'Reports',
    },
    {
      key: 'system',
      icon: <MonitorOutlined />,
      label: 'System',
      children: [
        {
          key: '/monitoring',
          label: 'Monitoring',
        },
        {
          key: '/audit-logs',
          label: 'Audit Logs',
        },
        {
          key: '/settings',
          label: 'Settings',
        },
      ],
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/auth/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  const getSelectedKeys = () => {
    const pathname = location.pathname;
    // Find the exact match or closest parent match
    for (const item of menuItems) {
      if (item?.key === pathname) {
        return [pathname];
      }
      if (item && 'children' in item && item.children) {
        for (const child of item.children) {
          if (child?.key === pathname) {
            return [pathname];
          }
        }
      }
    }
    return ['/dashboard'];
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={256}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px',
            fontWeight: 'bold',
            borderBottom: '1px solid #434343',
          }}
        >
          {collapsed ? 'UM' : 'UltraMarket Admin'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 256, transition: 'all 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          <Space size="middle">
            <Badge count={5} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                style={{ fontSize: '16px' }}
              />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span>Admin User</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: '24px',
            padding: '24px',
            background: '#fff',
            borderRadius: '8px',
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;