/**
 * Database Configuration
 * MongoDB connection setup with error handling and reconnection logic
 */

import mongoose from 'mongoose';
import { logger } from '../shared/logger';

interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

const getDatabaseConfig = (): DatabaseConfig => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ultramarket-products';
  
  const options: mongoose.ConnectOptions = {
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '10', 10),
    serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT || '5000', 10),
    socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT || '45000', 10),
    family: 4, // Use IPv4, skip trying IPv6
  };

  return { uri, options };
};

export const connectDatabase = async (): Promise<void> => {
  try {
    const { uri, options } = getDatabaseConfig();
    
    // Set up connection event listeners
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected successfully', {
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        port: mongoose.connection.port,
      });
    });

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error', { error });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        logger.error('Error closing MongoDB connection', { error });
        process.exit(1);
      }
    });

    // Connect to MongoDB
    await mongoose.connect(uri, options);
    
    logger.info('Database connection established', {
      environment: process.env.NODE_ENV || 'development',
      database: mongoose.connection.name,
    });
    
  } catch (error) {
    logger.error('Failed to connect to database', { error });
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from database', { error });
    throw error;
  }
};

export const getDatabaseHealth = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  details: any;
}> => {
  try {
    const state = mongoose.connection.readyState;
    const stateMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    if (state === 1) {
      // Test the connection with a simple operation
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
      }
      
      return {
        status: 'healthy',
        details: {
          state: stateMap[state as keyof typeof stateMap],
          host: mongoose.connection.host,
          name: mongoose.connection.name,
          port: mongoose.connection.port,
        },
      };
    }

    return {
      status: 'unhealthy',
      details: {
        state: stateMap[state as keyof typeof stateMap],
        message: 'Database not connected',
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
};

// Export mongoose instance for use in models
export { mongoose };
export default mongoose;
