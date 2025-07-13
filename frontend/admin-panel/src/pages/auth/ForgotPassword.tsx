import React, { useState } from 'react';
import { Form, Input, Button, Typography, Alert, Result } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Title, Text } = Typography;

const ForgotPassword: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: { email: string }) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess(true);
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Result
        status="success"
        title="Reset Email Sent"
        subTitle="We've sent a password reset link to your email address. Please check your inbox and follow the instructions."
        extra={[
          <Link to="/auth/login" key="login">
            <Button type="primary">
              Back to Login
            </Button>
          </Link>
        ]}
      />
    );
  }

  return (
    <div>
      <Title level={3} style={{ textAlign: 'center', marginBottom: '8px' }}>
        Reset Password
      </Title>
      <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: '32px' }}>
        Enter your email address and we'll send you a link to reset your password
      </Text>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          style={{ marginBottom: '24px' }}
          closable
          onClose={() => setError(null)}
        />
      )}

      <Form
        form={form}
        name="forgot-password"
        onFinish={handleSubmit}
        layout="vertical"
        requiredMark={false}
      >
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Please input your email!' },
            { type: 'email', message: 'Please enter a valid email!' },
          ]}
        >
          <Input
            prefix={<MailOutlined />}
            placeholder="Enter your email address"
            size="large"
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
            style={{ marginTop: '16px' }}
          >
            Send Reset Link
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <Link to="/auth/login">
          <Button type="link" icon={<ArrowLeftOutlined />}>
            Back to Login
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;