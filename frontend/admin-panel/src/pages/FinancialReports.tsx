import React from 'react';
import { Card, Row, Col, Statistic, Table } from 'antd';

const FinancialReports: React.FC = () => {
  const columns = [
    {
      title: 'Period',
      dataIndex: 'period',
      key: 'period',
    },
    {
      title: 'Revenue',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (amount: number) => `${amount.toLocaleString()} UZS`,
    },
    {
      title: 'Expenses',
      dataIndex: 'expenses',
      key: 'expenses',
      render: (amount: number) => `${amount.toLocaleString()} UZS`,
    },
    {
      title: 'Profit',
      dataIndex: 'profit',
      key: 'profit',
      render: (amount: number) => `${amount.toLocaleString()} UZS`,
    },
  ];

  const data = [
    {
      key: '1',
      period: 'January 2024',
      revenue: 5000000,
      expenses: 3000000,
      profit: 2000000,
    },
  ];

  return (
    <div>
      <h2>Financial Reports</h2>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Monthly Revenue"
              value={5000000}
              suffix="UZS"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Monthly Expenses"
              value={3000000}
              suffix="UZS"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Net Profit"
              value={2000000}
              suffix="UZS"
            />
          </Card>
        </Col>
      </Row>
      <Card title="Monthly Financial Summary">
        <Table columns={columns} dataSource={data} />
      </Card>
    </div>
  );
};

export default FinancialReports;