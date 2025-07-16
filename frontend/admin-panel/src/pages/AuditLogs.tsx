import React from 'react';
import { Card, Table, Tag } from 'antd';

const AuditLogs: React.FC = () => {
  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
    },
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => (
        <Tag color="blue">{action}</Tag>
      ),
    },
    {
      title: 'Resource',
      dataIndex: 'resource',
      key: 'resource',
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
    },
  ];

  const data = [
    {
      key: '1',
      timestamp: '2024-01-01 10:30:00',
      user: 'admin@ultramarket.uz',
      action: 'LOGIN',
      resource: 'Admin Panel',
      ipAddress: '192.168.1.1',
    },
  ];

  return (
    <div>
      <h2>Audit Logs</h2>
      <Card>
        <Table columns={columns} dataSource={data} />
      </Card>
    </div>
  );
};

export default AuditLogs;