import React from 'react';
import { Typography, Card } from 'antd';

const { Title } = Typography;

const ContentManagement: React.FC = () => {
  return (
    <div>
      <Title level={2}>Content Management</Title>
      <Card>
        <p>Content management functionality will be implemented here.</p>
      </Card>
    </div>
  );
};

export default ContentManagement;