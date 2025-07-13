import React from 'react';
import { Spin, Space } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface LoadingSpinnerProps {
  size?: 'small' | 'default' | 'large';
  tip?: string;
  spinning?: boolean;
  children?: React.ReactNode;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  tip = 'Loading...',
  spinning = true,
  children,
}) => {
  const antIcon = <LoadingOutlined style={{ fontSize: size === 'large' ? 24 : 16 }} spin />;

  if (children) {
    return (
      <Spin spinning={spinning} indicator={antIcon} tip={tip}>
        {children}
      </Spin>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        width: '100%',
      }}
    >
      <Space direction="vertical" align="center" size="middle">
        <Spin indicator={antIcon} size={size} />
        {tip && (
          <div style={{ color: '#666', fontSize: '14px' }}>
            {tip}
          </div>
        )}
      </Space>
    </div>
  );
};

export default LoadingSpinner;