import React from 'react';
import { Row, Col, Card, Statistic, Table, Progress } from 'antd';
import { 
  ShoppingCartOutlined, 
  UserOutlined, 
  DollarCircleOutlined,
  RiseOutlined 
} from '@ant-design/icons';

const Dashboard: React.FC = () => {
  const stats = [
    {
      title: 'Total Sales',
      value: 125430,
      prefix: <DollarCircleOutlined />,
      suffix: 'UZS',
    },
    {
      title: 'Orders',
      value: 1234,
      prefix: <ShoppingCartOutlined />,
    },
    {
      title: 'Users',
      value: 2456,
      prefix: <UserOutlined />,
    },
    {
      title: 'Growth',
      value: 15.3,
      prefix: <RiseOutlined />,
      suffix: '%',
    },
  ];

  const recentOrders = [
    {
      key: '1',
      orderId: 'ORD-001',
      customer: 'John Doe',
      amount: 1250,
      status: 'Completed',
    },
    {
      key: '2',
      orderId: 'ORD-002',
      customer: 'Jane Smith',
      amount: 890,
      status: 'Processing',
    },
  ];

  const orderColumns = [
    {
      title: 'Order ID',
      dataIndex: 'orderId',
      key: 'orderId',
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `${amount} UZS`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
  ];

  return (
    <div>
      <h2>Dashboard</h2>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {stats.map((stat, index) => (
          <Col span={6} key={index}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.prefix}
                suffix={stat.suffix}
              />
            </Card>
          </Col>
        ))}
      </Row>
      
      <Row gutter={16}>
        <Col span={16}>
          <Card title="Recent Orders">
            <Table 
              dataSource={recentOrders} 
              columns={orderColumns}
              pagination={false}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Sales Progress">
            <Progress type="circle" percent={75} />
            <p style={{ textAlign: 'center', marginTop: 16 }}>
              Monthly Target: 75%
            </p>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;