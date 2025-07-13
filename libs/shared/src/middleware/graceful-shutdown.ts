import { Server } from 'http';

// Simple logger interface for graceful shutdown
interface Logger {
  info: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
}

// Default console logger if winston is not available
const defaultLogger: Logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
};

export interface GracefulShutdownConfig {
  timeout?: number; // Shutdown timeout in milliseconds
  signals?: string[]; // Signals to listen for
  onShutdown?: () => Promise<void>; // Custom cleanup function
  logger?: Logger; // Optional custom logger
}

export class GracefulShutdown {
  private server: Server;
  private config: GracefulShutdownConfig;
  private isShuttingDown = false;
  private logger: Logger;

  constructor(server: Server, config: GracefulShutdownConfig = {}) {
    this.server = server;
    this.config = {
      timeout: config.timeout || 30000, // 30 seconds default
      signals: config.signals || ['SIGTERM', 'SIGINT', 'SIGUSR2'],
      onShutdown: config.onShutdown || (() => Promise.resolve()),
      logger: config.logger || defaultLogger,
    };
    
    this.logger = this.config.logger!;
    this.setupSignalHandlers();
  }

  private setupSignalHandlers(): void {
    this.config.signals!.forEach((signal) => {
      process.on(signal, () => {
        this.logger.info(`Received ${signal}, starting graceful shutdown`);
        this.shutdown();
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception, shutting down gracefully', { error });
      this.shutdown(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled promise rejection, shutting down gracefully', { 
        reason, 
        promise 
      });
      this.shutdown(1);
    });
  }

  private async shutdown(exitCode = 0): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    this.logger.info('Starting graceful shutdown process');

    const shutdownTimer = setTimeout(() => {
      this.logger.error('Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, this.config.timeout!);

    try {
      // Stop accepting new connections
      this.server.close(() => {
        this.logger.info('HTTP server closed');
      });

      // Run custom cleanup
      await this.config.onShutdown!();

      // Clear the timeout
      clearTimeout(shutdownTimer);

      this.logger.info('Graceful shutdown completed successfully');
      process.exit(exitCode);
    } catch (error) {
      this.logger.error('Error during graceful shutdown', { error });
      clearTimeout(shutdownTimer);
      process.exit(1);
    }
  }

  // Manual shutdown trigger
  public async triggerShutdown(exitCode = 0): Promise<void> {
    await this.shutdown(exitCode);
  }
}

// Helper function to setup graceful shutdown
export const setupGracefulShutdown = (
  server: Server, 
  config?: GracefulShutdownConfig
): GracefulShutdown => {
  return new GracefulShutdown(server, config);
};