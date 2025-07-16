import React from 'react';
import { Card, Form, Input, Button, Switch, Space } from 'antd';

const SettingsPage: React.FC = () => {
  const onFinish = (values: any) => {
    console.log('Settings updated:', values);
  };

  return (
    <div>
      <h2>Settings</h2>
      <Card title="General Settings">
        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            siteName: 'UltraMarket',
            siteEmail: 'admin@ultramarket.uz',
            notifications: true,
          }}
        >
          <Form.Item
            label="Site Name"
            name="siteName"
            rules={[{ required: true, message: 'Please enter site name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Site Email"
            name="siteEmail"
            rules={[
              { required: true, message: 'Please enter site email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Enable Notifications"
            name="notifications"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Save Settings
              </Button>
              <Button>
                Reset
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SettingsPage;