import React from 'react';
import { Typography, Card } from 'antd';

const { Title } = Typography;

const AnalyticsDashboard: React.FC = () => {
  return (
    <div>
      <Title level={2}>Analytics Dashboard</Title>
      <Card>
        <p>Analytics dashboard functionality will be implemented here.</p>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;