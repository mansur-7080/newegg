import React from 'react';
import { Card, Table, Tag } from 'antd';

const InventoryManagement: React.FC = () => {
  const columns = [
    {
      title: 'Product',
      dataIndex: 'product',
      key: 'product',
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
    },
    {
      title: 'Current Stock',
      dataIndex: 'currentStock',
      key: 'currentStock',
    },
    {
      title: 'Min Stock',
      dataIndex: 'minStock',
      key: 'minStock',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'in-stock' ? 'green' : status === 'low-stock' ? 'orange' : 'red';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
  ];

  const data = [
    {
      key: '1',
      product: 'Sample Product',
      sku: 'SKU-001',
      currentStock: 50,
      minStock: 10,
      status: 'in-stock',
    },
  ];

  return (
    <div>
      <h2>Inventory Management</h2>
      <Card>
        <Table columns={columns} dataSource={data} />
      </Card>
    </div>
  );
};

export default InventoryManagement;