import { logger } from '@ultramarket/shared/logging';

const http = require('http');

const options = {
  host: 'localhost',
  port: process.env.PORT || 3002,
  path: '/health',
  timeout: 5000,
  method: 'GET',
};

const request = http.request(options, (response) => {
  if (response.statusCode === 200) {
    logger.log('Health check passed');
    process.exit(0);
  } else {
    logger.error(`Health check failed with status: ${response.statusCode}`);
    process.exit(1);
  }
});

request.on('error', (error) => {
  logger.error(`Health check failed: ${error.message}`);
  process.exit(1);
});

request.on('timeout', () => {
  logger.error('Health check timed out');
  request.destroy();
  process.exit(1);
});

request.setTimeout(options.timeout);
request.end();
