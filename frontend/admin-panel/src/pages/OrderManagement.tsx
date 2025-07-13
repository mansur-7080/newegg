import React from 'react';
import { Typography, Card } from 'antd';

const { Title } = Typography;

const OrderManagement: React.FC = () => {
  return (
    <div>
      <Title level={2}>Order Management</Title>
      <Card>
        <p>Order management functionality will be implemented here.</p>
      </Card>
    </div>
  );
};

export default OrderManagement;