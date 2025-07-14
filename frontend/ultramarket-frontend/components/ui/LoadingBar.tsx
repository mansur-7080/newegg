import React from 'react';
import { motion } from 'framer-motion';

interface LoadingBarProps {
  isLoading?: boolean;
  progress?: number;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  height?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingBar: React.FC<LoadingBarProps> = ({
  isLoading = true,
  progress = 0,
  color = 'primary',
  height = 'sm',
  className = ''
}) => {
  const colorClasses = {
    primary: 'from-blue-500 to-purple-600',
    secondary: 'from-gray-500 to-gray-600',
    success: 'from-green-500 to-emerald-600',
    warning: 'from-yellow-500 to-orange-600',
    danger: 'from-red-500 to-pink-600'
  };

  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  if (!isLoading && progress === 0) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
      <div className={`w-full bg-gray-200 ${heightClasses[height]}`}>
        {progress > 0 ? (
          // Determinate progress bar
          <motion.div
            className={`h-full bg-gradient-to-r ${colorClasses[color]} rounded-r-full`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        ) : (
          // Indeterminate loading bar
          <motion.div
            className={`h-full bg-gradient-to-r ${colorClasses[color]} rounded-full`}
            initial={{ x: '-100%', width: '30%' }}
            animate={{ x: '100vw' }}
            transition={{
              duration: 1.5,
              ease: 'easeInOut',
              repeat: Infinity,
            }}
          />
        )}
      </div>
      
      {/* Pulsing effect overlay */}
      <motion.div
        className={`absolute top-0 left-0 w-full h-full bg-gradient-to-r ${colorClasses[color]} opacity-30`}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{
          duration: 2,
          ease: 'easeInOut',
          repeat: Infinity,
        }}
      />
    </div>
  );
};

export default LoadingBar;