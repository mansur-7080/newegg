import { logger } from '@ultramarket/shared/logging';

/**
 * Jest Global Teardown
 * Runs once after all test suites
 */

module.exports = async () => {
  // Clean up any global resources
  logger.log('🧹 Jest global teardown completed');
};
