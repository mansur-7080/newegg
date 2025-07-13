import React from 'react';
import { Typography, Card } from 'antd';

const { Title } = Typography;

const SettingsPage: React.FC = () => {
  return (
    <div>
      <Title level={2}>Settings</Title>
      <Card>
        <p>Settings functionality will be implemented here.</p>
      </Card>
    </div>
  );
};

export default SettingsPage;