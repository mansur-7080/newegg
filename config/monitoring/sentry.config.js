const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

const initSentry = (serviceName) => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Set service name for better organization
    serverName: serviceName,
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new ProfilingIntegration(),
    ],
    
    // Release tracking
    release: process.env.SENTRY_RELEASE || 'ultramarket@1.0.0',
    
    // Error filtering
    beforeSend(event, hint) {
      // Don't send 404 errors
      if (event.exception) {
        const error = hint.originalException;
        if (error && error.status === 404) {
          return null;
        }
      }
      
      // Don't send validation errors in development
      if (process.env.NODE_ENV === 'development' && event.level === 'warning') {
        return null;
      }
      
      return event;
    },
    
    // Tags for better organization
    initialScope: {
      tags: {
        service: serviceName,
        platform: 'uzbekistan',
        version: '1.0.0',
      },
    },
  });
  
  console.log(`Sentry initialized for ${serviceName}`);
};

// Express middleware
const sentryRequestHandler = () => Sentry.Handlers.requestHandler();
const sentryTracingHandler = () => Sentry.Handlers.tracingHandler();
const sentryErrorHandler = () => Sentry.Handlers.errorHandler({
  shouldHandleError(error) {
    // Capture all 4xx and 5xx errors
    return error.status >= 400;
  },
});

// Manual error reporting
const captureError = (error, context = {}) => {
  Sentry.withScope((scope) => {
    // Add context information
    Object.keys(context).forEach(key => {
      scope.setContext(key, context[key]);
    });
    
    // Capture the error
    Sentry.captureException(error);
  });
};

// Performance monitoring
const startTransaction = (name, op) => {
  return Sentry.startTransaction({ name, op });
};

// Custom metrics
const captureMetric = (name, value, tags = {}) => {
  Sentry.metrics.gauge(name, value, {
    tags: {
      ...tags,
      service: process.env.SERVICE_NAME || 'unknown',
    },
  });
};

module.exports = {
  initSentry,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  captureError,
  startTransaction,
  captureMetric,
  Sentry,
};