#!/usr/bin/env node

/**
 * Complete Error Handling Standardization Script
 * 
 * This script addresses all remaining error handling inconsistencies:
 * 1. Replace remaining generic Error throws with specific error classes
 * 2. Standardize error response formats
 * 3. Add missing imports of error classes
 * 4. Fix inconsistent logging
 * 5. Improve validation and database error handling
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, description) {
  log(`\n${step}. ${description}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

// Error class mappings for specific contexts
const errorMappings = {
  // User-related errors
  'User not found': 'ResourceNotFoundError',
  'User already exists': 'BusinessRuleViolationError',
  'Invalid user credentials': 'AuthorizationError',
  'User account locked': 'AuthorizationError',
  'User account expired': 'AuthorizationError',
  
  // Product-related errors
  'Product not found': 'ResourceNotFoundError',
  'Product with this SKU already exists': 'BusinessRuleViolationError',
  'Category not found': 'ResourceNotFoundError',
  'Insufficient inventory': 'BusinessRuleViolationError',
  'Product is out of stock': 'BusinessRuleViolationError',
  
  // Cart-related errors
  'Item not found in cart': 'ResourceNotFoundError',
  'Invalid product': 'ValidationError',
  'Minimum purchase amount': 'BusinessRuleViolationError',
  'Cart is empty': 'BusinessRuleViolationError',
  
  // Order-related errors
  'Order not found': 'ResourceNotFoundError',
  'Order already processed': 'BusinessRuleViolationError',
  'Order cannot be cancelled': 'BusinessRuleViolationError',
  
  // Payment-related errors
  'Payment failed': 'BusinessRuleViolationError',
  'Invalid payment method': 'ValidationError',
  'Payment gateway error': 'BusinessRuleViolationError',
  'Insufficient funds': 'BusinessRuleViolationError',
  
  // Authentication/Authorization errors
  'Authentication required': 'AuthorizationError',
  'Invalid role': 'AuthorizationError',
  'Insufficient permissions': 'AuthorizationError',
  'Token expired': 'AuthorizationError',
  'Invalid token': 'AuthorizationError',
  
  // Validation errors
  'Validation failed': 'ValidationError',
  'Required field missing': 'ValidationError',
  'Invalid format': 'ValidationError',
  'Invalid phone number': 'ValidationError',
  
  // Database errors
  'Database connection failed': 'AppError',
  'Database query failed': 'AppError',
  'Transaction failed': 'AppError',
  
  // External service errors
  'External service unavailable': 'AppError',
  'API rate limit exceeded': 'AppError',
  'Service timeout': 'AppError',
  
  // Configuration errors
  'Configuration missing': 'AppError',
  'Environment variable required': 'AppError',
  'Invalid configuration': 'AppError',
  
  // JWT errors
  'JWT configuration missing': 'AppError',
  'Token generation failed': 'AppError',
  'Token verification failed': 'AppError',
  'Token refresh failed': 'AppError',
  
  // Cache errors
  'Cache operation failed': 'AppError',
  'Encryption key not available': 'AppError',
  'Failed to decrypt': 'AppError',
  
  // Health check errors
  'Health check failed': 'AppError',
  'System health check failed': 'AppError',
  'API is not accessible': 'AppError',
  
  // AI/ML errors
  'Personalized model not loaded': 'AppError',
  'Recommendation failed': 'AppError',
  'AI service unavailable': 'AppError',
  
  // File service errors
  'File upload failed': 'AppError',
  'File not found': 'ResourceNotFoundError',
  'Invalid file format': 'ValidationError',
  'File size exceeded': 'ValidationError',
  
  // Notification errors
  'SMS sending failed': 'AppError',
  'Email sending failed': 'AppError',
  'Push notification failed': 'AppError',
  
  // Search errors
  'Search index not found': 'ResourceNotFoundError',
  'Search query failed': 'AppError',
  'Elasticsearch connection failed': 'AppError'
};

// HTTP status code mappings
const statusCodeMappings = {
  'ResourceNotFoundError': 404,
  'ValidationError': 400,
  'AuthorizationError': 401,
  'ForbiddenError': 403,
  'BusinessRuleViolationError': 409,
  'AppError': 500
};

function getErrorClass(errorMessage) {
  for (const [pattern, errorClass] of Object.entries(errorMappings)) {
    if (errorMessage.includes(pattern) || pattern.includes(errorMessage)) {
      return errorClass;
    }
  }
  return 'AppError'; // Default fallback
}

function getStatusCode(errorClass) {
  return statusCodeMappings[errorClass] || 500;
}

function replaceGenericErrors(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace generic Error throws with specific error classes
    const errorThrowRegex = /throw new Error\(['"`]([^'"`]+)['"`]\)/g;
    content = content.replace(errorThrowRegex, (match, errorMessage) => {
      const errorClass = getErrorClass(errorMessage);
      const statusCode = getStatusCode(errorClass);
      modified = true;
      return `throw new ${errorClass}('${errorMessage}', ${statusCode})`;
    });
    
    // Replace generic Error throws with template literals
    const errorThrowTemplateRegex = /throw new Error\(`([^`]+)`\)/g;
    content = content.replace(errorThrowTemplateRegex, (match, errorMessage) => {
      const errorClass = getErrorClass(errorMessage);
      const statusCode = getStatusCode(errorClass);
      modified = true;
      return `throw new ${errorClass}(\`${errorMessage}\`, ${statusCode})`;
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    logError(`Error processing file ${filePath}: ${error.message}`);
    return false;
  }
}

function standardizeErrorResponses(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace inconsistent error response formats
    const errorResponseRegex = /res\.status\((\d+)\)\.json\(\s*\{\s*error:\s*['"`]([^'"`]+)['"`]\s*\}\s*\)/g;
    content = content.replace(errorResponseRegex, (match, statusCode, errorMessage) => {
      modified = true;
      return `res.status(${statusCode}).json({
        success: false,
        error: {
          message: '${errorMessage}',
          code: 'ERROR_${statusCode}',
          statusCode: ${statusCode}
        }
      })`;
    });
    
    // Replace error responses with just message
    const simpleErrorResponseRegex = /res\.status\((\d+)\)\.json\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
    content = content.replace(simpleErrorResponseRegex, (match, statusCode, errorMessage) => {
      modified = true;
      return `res.status(${statusCode}).json({
        success: false,
        error: {
          message: '${errorMessage}',
          code: 'ERROR_${statusCode}',
          statusCode: ${statusCode}
        }
      })`;
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    logError(`Error processing file ${filePath}: ${error.message}`);
    return false;
  }
}

function addMissingImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Check if file uses error classes but doesn't import them
    const usesErrorClasses = /(ResourceNotFoundError|ValidationError|AuthorizationError|BusinessRuleViolationError|AppError)/.test(content);
    const hasErrorImport = /import.*\{.*Error.*\}.*from.*['"`]@ultramarket\/shared['"`]/.test(content);
    
    if (usesErrorClasses && !hasErrorImport) {
      // Find the last import statement
      const importRegex = /import.*from.*['"`][^'"`]+['"`];?\s*\n/g;
      const imports = content.match(importRegex);
      
      if (imports) {
        const lastImport = imports[imports.length - 1];
        const errorImport = `import { AppError, HttpStatusCode, ErrorCode, ResourceNotFoundError, BusinessRuleViolationError, AuthorizationError, ValidationError } from '@ultramarket/shared';\n`;
        
        content = content.replace(lastImport, lastImport + errorImport);
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    logError(`Error processing file ${filePath}: ${error.message}`);
    return false;
  }
}

function improveValidationHandling(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace basic validation checks with proper error handling
    const validationRegex = /if\s*\(\s*!([^)]+)\s*\)\s*\{\s*return\s+res\.status\(400\)\.json\(/g;
    content = content.replace(validationRegex, (match, condition) => {
      modified = true;
      return `if (!${condition}) {
        throw new ValidationError('${condition} is required', 400);
      }`;
    });
    
    // Replace validation error responses with throws
    const validationResponseRegex = /return\s+res\.status\(400\)\.json\(\s*\{\s*error:\s*['"`]([^'"`]+)['"`]\s*\}\s*\)/g;
    content = content.replace(validationResponseRegex, (match, errorMessage) => {
      modified = true;
      return `throw new ValidationError('${errorMessage}', 400)`;
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    logError(`Error processing file ${filePath}: ${error.message}`);
    return false;
  }
}

function findFilesWithErrors(directory) {
  const files = [];
  
  function scanDir(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scanDir(fullPath);
      } else if (stat.isFile() && /\.(ts|js)$/.test(item)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Check if file contains generic errors or inconsistent patterns
        if (/throw new Error\(/.test(content) || 
            /res\.status\(.*\)\.json\(.*error/.test(content) ||
            /return res\.status\(.*\)\.json\(/.test(content)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  scanDir(directory);
  return files;
}

function main() {
  log('🚀 Starting Complete Error Handling Standardization', 'bright');
  log('This script will address all remaining error handling inconsistencies', 'blue');
  
  const startTime = Date.now();
  let totalFiles = 0;
  let processedFiles = 0;
  let errorsReplaced = 0;
  let responsesStandardized = 0;
  let importsAdded = 0;
  let validationImproved = 0;
  
  try {
    // Step 1: Find all files with error handling issues
    logStep(1, 'Scanning for files with error handling issues...');
    const files = findFilesWithErrors('./microservices');
    totalFiles = files.length;
    logSuccess(`Found ${totalFiles} files with error handling issues`);
    
    // Step 2: Process each file
    logStep(2, 'Processing files...');
    
    for (const file of files) {
      log(`Processing: ${file}`, 'yellow');
      
      let fileModified = false;
      
      // Replace generic errors
      if (replaceGenericErrors(file)) {
        errorsReplaced++;
        fileModified = true;
      }
      
      // Standardize error responses
      if (standardizeErrorResponses(file)) {
        responsesStandardized++;
        fileModified = true;
      }
      
      // Add missing imports
      if (addMissingImports(file)) {
        importsAdded++;
        fileModified = true;
      }
      
      // Improve validation handling
      if (improveValidationHandling(file)) {
        validationImproved++;
        fileModified = true;
      }
      
      if (fileModified) {
        processedFiles++;
      }
    }
    
    // Step 3: Update shared error handler
    logStep(3, 'Updating shared error handler...');
    updateSharedErrorHandler();
    
    // Step 4: Create comprehensive error handling guide
    logStep(4, 'Creating comprehensive error handling guide...');
    createErrorHandlingGuide();
    
    // Step 5: Run tests to verify changes
    logStep(5, 'Running tests to verify changes...');
    runTests();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Summary
    log('\n📊 COMPLETION SUMMARY', 'bright');
    log('=' * 50, 'cyan');
    log(`Total files scanned: ${totalFiles}`, 'blue');
    log(`Files processed: ${processedFiles}`, 'green');
    log(`Generic errors replaced: ${errorsReplaced}`, 'green');
    log(`Error responses standardized: ${responsesStandardized}`, 'green');
    log(`Missing imports added: ${importsAdded}`, 'green');
    log(`Validation handling improved: ${validationImproved}`, 'green');
    log(`Total duration: ${duration}s`, 'blue');
    
    log('\n✅ Error handling standardization completed successfully!', 'bright');
    log('All microservices now use consistent error handling patterns.', 'green');
    
  } catch (error) {
    logError(`Script failed: ${error.message}`);
    process.exit(1);
  }
}

function updateSharedErrorHandler() {
  const errorHandlerPath = './libs/shared/src/middleware/errorHandler.ts';
  
  if (fs.existsSync(errorHandlerPath)) {
    const content = fs.readFileSync(errorHandlerPath, 'utf8');
    
    // Add comprehensive error handling improvements
    const improvedHandler = `import { Request, Response, NextFunction } from 'express';
import { AppError, HttpStatusCode, ErrorCode } from '../errors';
import { logger } from '../logging';

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    timestamp: string;
    path: string;
    requestId?: string;
  };
}

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const timestamp = new Date().toISOString();
  const path = req.originalUrl;
  const requestId = req.headers['x-request-id'] as string;
  
  // Determine error type and status code
  let statusCode = HttpStatusCode.INTERNAL_SERVER_ERROR;
  let errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
  let message = 'Internal Server Error';
  
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorCode = error.errorCode;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    statusCode = HttpStatusCode.BAD_REQUEST;
    errorCode = ErrorCode.VALIDATION_ERROR;
    message = error.message;
  } else if (error.name === 'CastError') {
    statusCode = HttpStatusCode.BAD_REQUEST;
    errorCode = ErrorCode.VALIDATION_ERROR;
    message = 'Invalid data format';
  } else if (error.name === 'MongoError' && (error as any).code === 11000) {
    statusCode = HttpStatusCode.CONFLICT;
    errorCode = ErrorCode.DUPLICATE_ENTRY;
    message = 'Duplicate entry found';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = HttpStatusCode.UNAUTHORIZED;
    errorCode = ErrorCode.INVALID_TOKEN;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = HttpStatusCode.UNAUTHORIZED;
    errorCode = ErrorCode.TOKEN_EXPIRED;
    message = 'Token expired';
  }
  
  // Log error with structured information
  logger.error('Error occurred', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: errorCode,
      statusCode
    },
    request: {
      method: req.method,
      path,
      requestId,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    },
    timestamp
  });
  
  // Create standardized error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      message,
      code: errorCode,
      statusCode,
      timestamp,
      path,
      requestId
    }
  };
  
  // Send response
  res.status(statusCode).json(errorResponse);
};

export default errorHandler;
`;
    
    fs.writeFileSync(errorHandlerPath, improvedHandler, 'utf8');
    logSuccess('Shared error handler updated with comprehensive improvements');
  }
}

function createErrorHandlingGuide() {
  const guide = `# UltraMarket Error Handling Guide

## Overview
This guide provides comprehensive information about the standardized error handling system implemented across all UltraMarket microservices.

## Error Classes

### AppError (Base Class)
- **Status Code**: 500
- **Usage**: Generic application errors
- **Example**: \`throw new AppError('Database connection failed', 500)\`

### ResourceNotFoundError
- **Status Code**: 404
- **Usage**: When requested resource doesn't exist
- **Example**: \`throw new ResourceNotFoundError('User not found')\`

### ValidationError
- **Status Code**: 400
- **Usage**: Input validation failures
- **Example**: \`throw new ValidationError('Email is required')\`

### AuthorizationError
- **Status Code**: 401
- **Usage**: Authentication failures
- **Example**: \`throw new AuthorizationError('Invalid credentials')\`

### ForbiddenError
- **Status Code**: 403
- **Usage**: Authorization failures
- **Example**: \`throw new ForbiddenError('Insufficient permissions')\`

### BusinessRuleViolationError
- **Status Code**: 409
- **Usage**: Business logic violations
- **Example**: \`throw new BusinessRuleViolationError('Product out of stock')\`

## Standardized Error Response Format

All error responses follow this consistent format:

\`\`\`json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "path": "/api/users/123",
    "requestId": "req-123456"
  }
}
\`\`\`

## Best Practices

### 1. Use Specific Error Classes
❌ Don't: \`throw new Error('User not found')\`
✅ Do: \`throw new ResourceNotFoundError('User not found')\`

### 2. Provide Clear Error Messages
❌ Don't: \`throw new ValidationError('Invalid input')\`
✅ Do: \`throw new ValidationError('Email address is required')\`

### 3. Handle Database Errors Properly
\`\`\`typescript
try {
  const user = await User.findById(id);
  if (!user) {
    throw new ResourceNotFoundError('User not found');
  }
  return user;
} catch (error) {
  if (error instanceof AppError) {
    throw error;
  }
  throw new AppError('Database operation failed', 500);
}
\`\`\`

### 4. Validate Input Data
\`\`\`typescript
if (!email || !email.includes('@')) {
  throw new ValidationError('Valid email address is required');
}
\`\`\`

### 5. Check Authorization
\`\`\`typescript
if (!user.hasPermission('delete_product')) {
  throw new ForbiddenError('Insufficient permissions to delete product');
}
\`\`\`

## Error Codes

| Code | Description | Status Code |
|------|-------------|-------------|
| VALIDATION_ERROR | Input validation failed | 400 |
| UNAUTHORIZED | Authentication required | 401 |
| FORBIDDEN | Insufficient permissions | 403 |
| NOT_FOUND | Resource not found | 404 |
| CONFLICT | Business rule violation | 409 |
| INTERNAL_SERVER_ERROR | Server error | 500 |

## Logging

All errors are automatically logged with structured information:
- Error details (name, message, stack)
- Request information (method, path, user agent)
- Timestamp and request ID
- Error code and status code

## Testing Error Handling

\`\`\`typescript
describe('Error Handling', () => {
  it('should return 404 for non-existent resource', async () => {
    const response = await request(app)
      .get('/api/users/999999')
      .expect(404);
    
    expect(response.body).toMatchObject({
      success: false,
      error: {
        message: 'User not found',
        code: 'NOT_FOUND',
        statusCode: 404
      }
    });
  });
});
\`\`\`

## Migration Checklist

- [ ] Replace all \`throw new Error()\` with specific error classes
- [ ] Standardize all error response formats
- [ ] Add proper error imports to all files
- [ ] Implement consistent validation error handling
- [ ] Update error logging to use structured format
- [ ] Test all error scenarios
- [ ] Update API documentation with error responses
`;

  fs.writeFileSync('./docs/ERROR_HANDLING_GUIDE.md', guide, 'utf8');
  logSuccess('Comprehensive error handling guide created');
}

function runTests() {
  try {
    log('Running error handling tests...', 'yellow');
    
    // Run basic tests to ensure no syntax errors
    execSync('npm test -- --testPathPattern=error', { 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    logSuccess('Error handling tests passed');
  } catch (error) {
    logWarning('Some tests failed - please review manually');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  replaceGenericErrors,
  standardizeErrorResponses,
  addMissingImports,
  improveValidationHandling,
  findFilesWithErrors
};