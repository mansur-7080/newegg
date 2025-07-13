import React from 'react';
import { Typography, Card } from 'antd';

const { Title } = Typography;

const ReviewManagement: React.FC = () => {
  return (
    <div>
      <Title level={2}>Review Management</Title>
      <Card>
        <p>Review management functionality will be implemented here.</p>
      </Card>
    </div>
  );
};

export default ReviewManagement;