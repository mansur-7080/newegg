#!/usr/bin/env node

/**
 * Environment Validation Script
 * Comprehensive validation for all microservices environment variables
 */

const fs = require('fs');
const path = require('path');

// Environment validation schemas for different services
const ENVIRONMENT_SCHEMAS = {
  'auth-service': {
    required: [
      'NODE_ENV',
      'PORT',
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET'
    ],
    optional: [
      'LOG_LEVEL',
      'CORS_ORIGIN',
      'RATE_LIMIT_WINDOW_MS',
      'RATE_LIMIT_MAX_REQUESTS'
    ],
    validation: {
      'JWT_SECRET': (value) => value && value.length >= 32,
      'JWT_REFRESH_SECRET': (value) => value && value.length >= 32,
      'PORT': (value) => !isNaN(value) && parseInt(value) > 0 && parseInt(value) <= 65535,
      'NODE_ENV': (value) => ['development', 'staging', 'production', 'test'].includes(value)
    }
  },
  'user-service': {
    required: [
      'NODE_ENV',
      'PORT',
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET'
    ],
    optional: [
      'LOG_LEVEL',
      'BCRYPT_ROUNDS',
      'USER_SERVICE_URL'
    ],
    validation: {
      'JWT_SECRET': (value) => value && value.length >= 32,
      'JWT_REFRESH_SECRET': (value) => value && value.length >= 32,
      'BCRYPT_ROUNDS': (value) => !isNaN(value) && parseInt(value) >= 10 && parseInt(value) <= 14,
      'PORT': (value) => !isNaN(value) && parseInt(value) > 0 && parseInt(value) <= 65535
    }
  },
  'product-service': {
    required: [
      'NODE_ENV',
      'PORT',
      'MONGODB_URL',
      'REDIS_URL',
      'ELASTICSEARCH_URL'
    ],
    optional: [
      'LOG_LEVEL',
      'UPLOAD_MAX_SIZE',
      'UPLOAD_ALLOWED_TYPES'
    ],
    validation: {
      'PORT': (value) => !isNaN(value) && parseInt(value) > 0 && parseInt(value) <= 65535,
      'UPLOAD_MAX_SIZE': (value) => !isNaN(value) && parseInt(value) > 0
    }
  },
  'order-service': {
    required: [
      'NODE_ENV',
      'PORT',
      'DATABASE_URL',
      'REDIS_URL',
      'USER_SERVICE_URL',
      'PRODUCT_SERVICE_URL',
      'PAYMENT_SERVICE_URL'
    ],
    optional: [
      'LOG_LEVEL',
      'ORDER_TIMEOUT_MINUTES'
    ],
    validation: {
      'PORT': (value) => !isNaN(value) && parseInt(value) > 0 && parseInt(value) <= 65535,
      'ORDER_TIMEOUT_MINUTES': (value) => !isNaN(value) && parseInt(value) > 0
    }
  },
  'payment-service': {
    required: [
      'NODE_ENV',
      'PORT',
      'DATABASE_URL',
      'REDIS_URL',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ],
    optional: [
      'LOG_LEVEL',
      'PAYPAL_CLIENT_ID',
      'PAYPAL_CLIENT_SECRET'
    ],
    validation: {
      'PORT': (value) => !isNaN(value) && parseInt(value) > 0 && parseInt(value) <= 65535,
      'STRIPE_SECRET_KEY': (value) => value && (value.startsWith('sk_test_') || value.startsWith('sk_live_')),
      'STRIPE_WEBHOOK_SECRET': (value) => value && value.startsWith('whsec_')
    }
  }
};

// Database connection validation
async function validateDatabaseConnection(databaseUrl) {
  try {
    // Basic URL validation
    if (!databaseUrl || typeof databaseUrl !== 'string') {
      return { valid: false, error: 'Invalid database URL format' };
    }
    
    // PostgreSQL URL validation
    if (databaseUrl.startsWith('postgresql://')) {
      const url = new URL(databaseUrl);
      if (!url.hostname || !url.port || !url.pathname) {
        return { valid: false, error: 'Invalid PostgreSQL URL structure' };
      }
    }
    
    // MongoDB URL validation
    if (databaseUrl.startsWith('mongodb://') || databaseUrl.startsWith('mongodb+srv://')) {
      const url = new URL(databaseUrl);
      if (!url.hostname || !url.pathname) {
        return { valid: false, error: 'Invalid MongoDB URL structure' };
      }
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Redis connection validation
async function validateRedisConnection(redisUrl) {
  try {
    if (!redisUrl || typeof redisUrl !== 'string') {
      return { valid: false, error: 'Invalid Redis URL format' };
    }
    
    const url = new URL(redisUrl);
    if (url.protocol !== 'redis:') {
      return { valid: false, error: 'Invalid Redis URL protocol' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// JWT secret validation
function validateJWTSecret(secret) {
  if (!secret || typeof secret !== 'string') {
    return { valid: false, error: 'JWT secret is required' };
  }
  
  if (secret.length < 32) {
    return { valid: false, error: 'JWT secret must be at least 32 characters long' };
  }
  
  // Check for common weak secrets
  const weakSecrets = [
    'dev-jwt-secret-key-minimum-32-characters-long-for-development-only',
    'test-jwt-secret-key-for-testing-purposes-only-must-be-at-least-32-characters',
    'your-secret-key',
    'secret',
    'password',
    '123456789'
  ];
  
  if (weakSecrets.includes(secret)) {
    return { valid: false, error: 'JWT secret is too weak or common' };
  }
  
  return { valid: true };
}

// Environment variable validation
function validateEnvironmentVariable(key, value, schema) {
  const validation = schema.validation[key];
  
  if (validation) {
    try {
      const result = validation(value);
      return { valid: result, error: result ? null : `Invalid value for ${key}` };
    } catch (error) {
      return { valid: false, error: `Validation error for ${key}: ${error.message}` };
    }
  }
  
  return { valid: true };
}

// Main validation function
async function validateServiceEnvironment(serviceName, environment) {
  const schema = ENVIRONMENT_SCHEMAS[serviceName];
  
  if (!schema) {
    return {
      valid: false,
      errors: [`No validation schema found for service: ${serviceName}`]
    };
  }
  
  const errors = [];
  const warnings = [];
  const validationResults = {};
  
  // Check required variables
  for (const requiredVar of schema.required) {
    const value = environment[requiredVar];
    
    if (!value) {
      errors.push(`Missing required environment variable: ${requiredVar}`);
      continue;
    }
    
    // Validate specific variables
    if (requiredVar === 'DATABASE_URL' || requiredVar === 'MONGODB_URL') {
      const dbValidation = await validateDatabaseConnection(value);
      if (!dbValidation.valid) {
        errors.push(`Database connection validation failed: ${dbValidation.error}`);
      }
    }
    
    if (requiredVar === 'REDIS_URL') {
      const redisValidation = await validateRedisConnection(value);
      if (!redisValidation.valid) {
        errors.push(`Redis connection validation failed: ${redisValidation.error}`);
      }
    }
    
    if (requiredVar.includes('JWT_SECRET')) {
      const jwtValidation = validateJWTSecret(value);
      if (!jwtValidation.valid) {
        errors.push(`JWT secret validation failed: ${jwtValidation.error}`);
      }
    }
    
    // Run custom validation
    const customValidation = validateEnvironmentVariable(requiredVar, value, schema);
    if (!customValidation.valid) {
      errors.push(customValidation.error);
    }
    
    validationResults[requiredVar] = { value: value.substring(0, 10) + '...', valid: true };
  }
  
  // Check optional variables
  for (const optionalVar of schema.optional) {
    const value = environment[optionalVar];
    
    if (value) {
      const customValidation = validateEnvironmentVariable(optionalVar, value, schema);
      if (!customValidation.valid) {
        warnings.push(customValidation.error);
      }
      
      validationResults[optionalVar] = { value: value.substring(0, 10) + '...', valid: true };
    } else {
      validationResults[optionalVar] = { value: 'not set', valid: true };
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    validationResults
  };
}

// Generate validation report
function generateValidationReport(results) {
  let report = '\n🔍 Environment Validation Report\n';
  report += '='.repeat(50) + '\n\n';
  
  let totalServices = 0;
  let validServices = 0;
  
  Object.entries(results).forEach(([serviceName, result]) => {
    totalServices++;
    if (result.valid) validServices++;
    
    report += `📦 ${serviceName.toUpperCase()}\n`;
    report += `${result.valid ? '✅ Valid' : '❌ Invalid'}\n`;
    
    if (result.errors.length > 0) {
      report += '\n❌ Errors:\n';
      result.errors.forEach(error => {
        report += `  • ${error}\n`;
      });
    }
    
    if (result.warnings.length > 0) {
      report += '\n⚠️  Warnings:\n';
      result.warnings.forEach(warning => {
        report += `  • ${warning}\n`;
      });
    }
    
    report += '\n📊 Variables:\n';
    Object.entries(result.validationResults).forEach(([varName, varResult]) => {
      const status = varResult.valid ? '✅' : '❌';
      report += `  ${status} ${varName}: ${varResult.value}\n`;
    });
    
    report += '\n' + '-'.repeat(30) + '\n\n';
  });
  
  report += `📈 Summary: ${validServices}/${totalServices} services valid\n`;
  
  if (validServices === totalServices) {
    report += '🎉 All services have valid environment configurations!\n';
  } else {
    report += '⚠️  Some services have configuration issues that need to be fixed.\n';
  }
  
  return report;
}

// Main function
async function validateAllEnvironments() {
  console.log('🔍 Starting comprehensive environment validation...\n');
  
  const results = {};
  
  // Validate each service
  for (const serviceName of Object.keys(ENVIRONMENT_SCHEMAS)) {
    console.log(`Validating ${serviceName}...`);
    
    // Get environment variables (you can modify this to load from specific .env files)
    const environment = process.env;
    
    const result = await validateServiceEnvironment(serviceName, environment);
    results[serviceName] = result;
    
    console.log(`${result.valid ? '✅' : '❌'} ${serviceName} validation completed`);
  }
  
  // Generate and display report
  const report = generateValidationReport(results);
  console.log(report);
  
  // Save report to file
  const reportPath = path.join(process.cwd(), 'environment-validation-report.txt');
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`📄 Detailed report saved to: ${reportPath}`);
  
  return results;
}

// CLI interface
if (require.main === module) {
  validateAllEnvironments()
    .then(results => {
      const allValid = Object.values(results).every(result => result.valid);
      process.exit(allValid ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  validateServiceEnvironment,
  validateAllEnvironments,
  validateDatabaseConnection,
  validateRedisConnection,
  validateJWTSecret
};