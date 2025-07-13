import React from 'react';
import { Typography, Card } from 'antd';

const { Title } = Typography;

const FinancialReports: React.FC = () => {
  return (
    <div>
      <Title level={2}>Financial Reports</Title>
      <Card>
        <p>Financial reports functionality will be implemented here.</p>
      </Card>
    </div>
  );
};

export default FinancialReports;