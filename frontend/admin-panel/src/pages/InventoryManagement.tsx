import React from 'react';
import { Typography, Card } from 'antd';

const { Title } = Typography;

const InventoryManagement: React.FC = () => {
  return (
    <div>
      <Title level={2}>Inventory Management</Title>
      <Card>
        <p>Inventory management functionality will be implemented here.</p>
      </Card>
    </div>
  );
};

export default InventoryManagement;