import React from 'react';
import { Typography, Card } from 'antd';

const { Title } = Typography;

const PromotionManagement: React.FC = () => {
  return (
    <div>
      <Title level={2}>Promotion Management</Title>
      <Card>
        <p>Promotion management functionality will be implemented here.</p>
      </Card>
    </div>
  );
};

export default PromotionManagement;