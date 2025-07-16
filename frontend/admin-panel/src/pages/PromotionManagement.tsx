import React from 'react';
import { Card, Table, Tag, Button, Space } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';

const PromotionManagement: React.FC = () => {
  const columns = [
    {
      title: 'Promotion Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'Discount',
      dataIndex: 'discount',
      key: 'discount',
      render: (discount: number) => `${discount}%`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'active' ? 'green' : status === 'scheduled' ? 'blue' : 'red';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
    },
    {
      title: 'End Date',
      dataIndex: 'endDate',
      key: 'endDate',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Space>
          <Button icon={<EditOutlined />} size="small">
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  const data = [
    {
      key: '1',
      name: 'Summer Sale',
      type: 'Percentage',
      discount: 20,
      status: 'active',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>Promotion Management</h2>
        <Button type="primary" icon={<PlusOutlined />}>
          Add Promotion
        </Button>
      </div>
      <Card>
        <Table columns={columns} dataSource={data} />
      </Card>
    </div>
  );
};

export default PromotionManagement;