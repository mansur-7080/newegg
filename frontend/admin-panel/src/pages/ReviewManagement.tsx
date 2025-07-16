import React from 'react';
import { Card, Table, Tag, Rate, Button } from 'antd';

const ReviewManagement: React.FC = () => {
  const columns = [
    {
      title: 'Product',
      dataIndex: 'product',
      key: 'product',
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: number) => <Rate disabled defaultValue={rating} />,
    },
    {
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'approved' ? 'green' : status === 'pending' ? 'orange' : 'red';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Button size="small">
          Moderate
        </Button>
      ),
    },
  ];

  const data = [
    {
      key: '1',
      product: 'Sample Product',
      customer: 'John Doe',
      rating: 5,
      comment: 'Great product!',
      status: 'approved',
    },
  ];

  return (
    <div>
      <h2>Review Management</h2>
      <Card>
        <Table columns={columns} dataSource={data} />
      </Card>
    </div>
  );
};

export default ReviewManagement;