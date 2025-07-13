import React from 'react';
import { Card, Row, Col, Statistic, Typography, Space, Progress } from 'antd';
import {
  ShoppingCartOutlined,
  UserOutlined,
  DollarOutlined,
  ShopOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';

const { Title } = Typography;

const Dashboard: React.FC = () => {
  const stats = [
    {
      title: 'Total Sales',
      value: 1234567,
      prefix: '$',
      icon: <DollarOutlined />,
      color: '#3f8600',
      trend: 12.5,
    },
    {
      title: 'Total Orders',
      value: 8542,
      icon: <ShoppingCartOutlined />,
      color: '#1890ff',
      trend: 8.2,
    },
    {
      title: 'Total Users',
      value: 45123,
      icon: <UserOutlined />,
      color: '#722ed1',
      trend: -2.1,
    },
    {
      title: 'Total Products',
      value: 1256,
      icon: <ShopOutlined />,
      color: '#fa541c',
      trend: 5.7,
    },
  ];

  return (
    <div>
      <Title level={2}>Dashboard</Title>
      
      <Row gutter={[16, 16]}>
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                valueStyle={{ color: stat.color }}
                prefix={
                  <div style={{ color: stat.color, fontSize: '24px' }}>
                    {stat.icon}
                  </div>
                }
                                 suffix={
                   <Space>
                     {stat.trend > 0 ? (
                       <ArrowUpOutlined style={{ color: '#3f8600' }} />
                     ) : (
                       <ArrowDownOutlined style={{ color: '#cf1322' }} />
                     )}
                     <span style={{ color: stat.trend > 0 ? '#3f8600' : '#cf1322' }}>
                       {Math.abs(stat.trend)}%
                     </span>
                   </Space>
                 }
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="Sales Overview" bordered={false}>
            <div style={{ padding: '20px 0' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>This Month</span>
                  <span>$125,000</span>
                </div>
                <Progress percent={75} strokeColor="#52c41a" />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Last Month</span>
                  <span>$98,000</span>
                </div>
                <Progress percent={60} strokeColor="#1890ff" />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Target</span>
                  <span>$150,000</span>
                </div>
                <Progress percent={83} strokeColor="#722ed1" />
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card title="Recent Activity" bordered={false}>
            <div style={{ padding: '20px 0' }}>
              <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>New Order #12345</div>
                <div style={{ color: '#666', fontSize: '12px' }}>2 minutes ago</div>
              </div>
              <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Product Updated</div>
                <div style={{ color: '#666', fontSize: '12px' }}>5 minutes ago</div>
              </div>
              <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>New User Registration</div>
                <div style={{ color: '#666', fontSize: '12px' }}>10 minutes ago</div>
              </div>
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Payment Received</div>
                <div style={{ color: '#666', fontSize: '12px' }}>15 minutes ago</div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;