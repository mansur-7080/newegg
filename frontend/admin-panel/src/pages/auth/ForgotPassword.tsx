import React, { useState } from 'react';
import { Form, Input, Button, Alert } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const onFinish = async (values: { email: string }) => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(true);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div>
        <Alert
          message="Reset Email Sent"
          description="Please check your email for password reset instructions."
          type="success"
          style={{ marginBottom: '20px' }}
        />
        <Link to="/login">
          <Button type="link" style={{ padding: 0 }}>
            Back to Login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>
        Reset Password
      </h2>

      <Form
        name="forgot-password"
        onFinish={onFinish}
        autoComplete="off"
        size="large"
      >
        <Form.Item
          name="email"
          rules={[
            { required: true, message: 'Please input your email!' },
            { type: 'email', message: 'Please enter a valid email!' }
          ]}
        >
          <Input 
            prefix={<MailOutlined />} 
            placeholder="Email" 
          />
        </Form.Item>

        <Form.Item>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            style={{ width: '100%' }}
          >
            Send Reset Email
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center' }}>
        <Link to="/login">
          <Button type="link" style={{ padding: 0 }}>
            Back to Login
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;