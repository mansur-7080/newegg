import { logger } from '@ultramarket/shared/logging';

const http = require('http');

const options = {
  host: 'localhost',
  port: process.env.PORT || 3020,
  path: '/health',
  timeout: 5000,
  method: 'GET',
};

const request = http.request(options, (response) => {
  if (response.statusCode === 200) {
    logger.log('Config Service health check passed');
    process.exit(0);
  } else {
    logger.error(`Config Service health check failed with status: ${response.statusCode}`);
    process.exit(1);
  }
});

request.on('error', (error) => {
  logger.error(`Config Service health check failed: ${error.message}`);
  process.exit(1);
});

request.on('timeout', () => {
  logger.error('Config Service health check timed out');
  request.destroy();
  process.exit(1);
});

request.setTimeout(options.timeout);
request.end();
