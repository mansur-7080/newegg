import React from 'react';
import { Card, Table, Tag, Space, Button } from 'antd';
import { EyeOutlined } from '@ant-design/icons';

const OrderManagement: React.FC = () => {
  const columns = [
    {
      title: 'Order ID',
      dataIndex: 'id',
      key: 'id',
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
      render: (status: string) => {
        const color = status === 'completed' ? 'green' : status === 'processing' ? 'blue' : 'orange';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Space>
          <Button icon={<EyeOutlined />} size="small">
            View
          </Button>
        </Space>
      ),
    },
  ];

  const data = [
    {
      key: '1',
      id: 'ORD-001',
      customer: 'John Doe',
      amount: 125000,
      status: 'completed',
    },
  ];

  return (
    <div>
      <h2>Order Management</h2>
      <Card>
        <Table columns={columns} dataSource={data} />
      </Card>
    </div>
  );
};

export default OrderManagement;