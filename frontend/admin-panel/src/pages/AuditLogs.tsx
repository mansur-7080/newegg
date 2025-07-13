import React from 'react';
import { Typography, Card } from 'antd';

const { Title } = Typography;

const AuditLogs: React.FC = () => {
  return (
    <div>
      <Title level={2}>Audit Logs</Title>
      <Card>
        <p>Audit logs functionality will be implemented here.</p>
      </Card>
    </div>
  );
};

export default AuditLogs;