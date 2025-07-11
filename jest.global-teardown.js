/**
 * Jest Global Teardown
 * Runs once after all test suites
 */

module.exports = async () => {
  // Clean up any global resources
  console.log('🧹 Jest global teardown completed');
};
