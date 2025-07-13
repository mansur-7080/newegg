import React from 'react';
import { Typography, Card } from 'antd';

const { Title } = Typography;

const ProductManagement: React.FC = () => {
  return (
    <div>
      <Title level={2}>Product Management</Title>
      <Card>
        <p>Product management functionality will be implemented here.</p>
      </Card>
    </div>
  );
};

export default ProductManagement;