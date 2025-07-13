import React from 'react';
import { Typography, Card } from 'antd';

const { Title } = Typography;

const UserManagement: React.FC = () => {
  return (
    <div>
      <Title level={2}>User Management</Title>
      <Card>
        <p>User management functionality will be implemented here.</p>
      </Card>
    </div>
  );
};

export default UserManagement;