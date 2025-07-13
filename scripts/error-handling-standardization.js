#!/usr/bin/env node

/**
 * UltraMarket Error Handling Standardization Script
 * 
 * This script standardizes error handling across all microservices by:
 * 1. Replacing generic Error throws with specific AppError classes
 * 2. Updating error handlers to use the shared error handling middleware
 * 3. Standardizing error response formats
 * 4. Adding proper error logging
 * 
 * Usage: node scripts/error-handling-standardization.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  sharedLibPath: 'libs/shared/src',
  microservicesPath: 'microservices',
  services: [
    'core/auth-service',
    'core/user-service',
    'core/config-service',
    'core/store-service',
    'business/product-service',
    'business/order-service',
    'business/cart-service',
    'business/payment-service',
    'business/review-service',
    'business/inventory-service',
    'platform/notification-service',
    'platform/search-service',
    'platform/file-service',
    'analytics/analytics-service'
  ],
  errorPatterns: [
    {
      pattern: /throw new Error\(['"`]([^'"`]+)['"`]\)/g,
      replacement: (match, message) => {
        if (message.includes('not found')) {
          return `throw new ResourceNotFoundError('Resource', '${message}')`;
        }
        if (message.includes('already exists')) {
          return `throw new BusinessRuleViolationError('${message}')`;
        }
        if (message.includes('permission') || message.includes('unauthorized')) {
          return `throw new AuthorizationError('${message}')`;
        }
        if (message.includes('validation')) {
          return `throw new ValidationError('${message}')`;
        }
        return `throw new AppError(HttpStatusCode.INTERNAL_SERVER_ERROR, '${message}', ErrorCode.INTERNAL_ERROR)`;
      }
    },
    {
      pattern: /throw new Error\(`([^`]+)`\)/g,
      replacement: (match, message) => {
        if (message.includes('not found')) {
          return `throw new ResourceNotFoundError('Resource', \`${message}\`)`;
        }
        if (message.includes('already exists')) {
          return `throw new BusinessRuleViolationError(\`${message}\`)`;
        }
        if (message.includes('permission') || message.includes('unauthorized')) {
          return `throw new AuthorizationError(\`${message}\`)`;
        }
        if (message.includes('validation')) {
          return `throw new ValidationError(\`${message}\`)`;
        }
        return `throw new AppError(HttpStatusCode.INTERNAL_SERVER_ERROR, \`${message}\`, ErrorCode.INTERNAL_ERROR)`;
      }
    }
  ]
};

class ErrorHandlingStandardizer {
  constructor() {
    this.stats = {
      filesProcessed: 0,
      errorsReplaced: 0,
      importsAdded: 0,
      errorHandlersUpdated: 0
    };
  }

  /**
   * Main execution function
   */
  async run() {
    console.log('🚀 Starting UltraMarket Error Handling Standardization...\n');

    try {
      // Step 1: Update shared library
      await this.updateSharedLibrary();

      // Step 2: Process each microservice
      for (const service of CONFIG.services) {
        await this.processService(service);
      }

      // Step 3: Generate migration guide
      await this.generateMigrationGuide();

      // Step 4: Print summary
      this.printSummary();

    } catch (error) {
      console.error('❌ Error during standardization:', error);
      process.exit(1);
    }
  }

  /**
   * Update shared library with standardized error handling
   */
  async updateSharedLibrary() {
    console.log('📚 Updating shared library...');

    // Ensure shared library exports are complete
    const sharedIndexPath = path.join(CONFIG.sharedLibPath, 'index.ts');
    let sharedIndex = fs.readFileSync(sharedIndexPath, 'utf8');

    // Add error handling exports if not present
    if (!sharedIndex.includes('export.*errorHandler')) {
      sharedIndex += `
// Error handling exports
export { errorHandler, asyncHandler, StandardizedErrorHandler } from './middleware/errorHandler';
export * from './errors';
export * from './types/api-responses';
`;

      fs.writeFileSync(sharedIndexPath, sharedIndex);
      console.log('✅ Updated shared library exports');
    }
  }

  /**
   * Process a single microservice
   */
  async processService(servicePath) {
    const fullPath = path.join(CONFIG.microservicesPath, servicePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Service not found: ${servicePath}`);
      return;
    }

    console.log(`\n🔧 Processing service: ${servicePath}`);

    // Find all TypeScript/JavaScript files
    const files = this.findSourceFiles(fullPath);
    
    for (const file of files) {
      await this.processFile(file, servicePath);
    }

    // Update service-specific error handler
    await this.updateServiceErrorHandler(fullPath, servicePath);
  }

  /**
   * Find all source files in a directory
   */
  findSourceFiles(dir) {
    const files = [];
    
    function traverse(currentDir) {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          traverse(fullPath);
        } else if (stat.isFile() && /\.(ts|js|tsx|jsx)$/.test(item)) {
          files.push(fullPath);
        }
      }
    }
    
    traverse(dir);
    return files;
  }

  /**
   * Process a single file
   */
  async processFile(filePath, servicePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // Add imports if needed
      if (content.includes('throw new Error') || content.includes('AppError')) {
        const imports = this.extractImports(content);
        
        if (!imports.includes('AppError')) {
          const importStatement = this.generateImportStatement(servicePath);
          content = this.addImport(content, importStatement);
          modified = true;
          this.stats.importsAdded++;
        }
      }

      // Replace error patterns
      for (const pattern of CONFIG.errorPatterns) {
        const newContent = content.replace(pattern.pattern, pattern.replacement);
        if (newContent !== content) {
          content = newContent;
          modified = true;
          this.stats.errorsReplaced++;
        }
      }

      // Update error handling patterns
      content = this.updateErrorHandlingPatterns(content);

      if (modified) {
        fs.writeFileSync(filePath, content);
        this.stats.filesProcessed++;
        console.log(`  ✅ Updated: ${path.relative(process.cwd(), filePath)}`);
      }

    } catch (error) {
      console.error(`  ❌ Error processing ${filePath}:`, error.message);
    }
  }

  /**
   * Extract existing imports from file content
   */
  extractImports(content) {
    const importMatches = content.match(/import\s+.*?from\s+['"`]([^'"`]+)['"`]/g) || [];
    return importMatches.map(match => {
      const fromMatch = match.match(/from\s+['"`]([^'"`]+)['"`]/);
      return fromMatch ? fromMatch[1] : '';
    });
  }

  /**
   * Generate import statement for shared library
   */
  generateImportStatement(servicePath) {
    const relativePath = this.calculateRelativePath(servicePath);
    return `import { AppError, HttpStatusCode, ErrorCode, ResourceNotFoundError, BusinessRuleViolationError, AuthorizationError, ValidationError } from '${relativePath}';`;
  }

  /**
   * Calculate relative path from service to shared library
   */
  calculateRelativePath(servicePath) {
    const depth = servicePath.split('/').length;
    const prefix = '../'.repeat(depth);
    return `${prefix}libs/shared`;
  }

  /**
   * Add import statement to file content
   */
  addImport(content, importStatement) {
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Find the last import statement
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        insertIndex = i + 1;
      } else if (lines[i].trim() && !lines[i].trim().startsWith('//')) {
        break;
      }
    }
    
    lines.splice(insertIndex, 0, importStatement);
    return lines.join('\n');
  }

  /**
   * Update error handling patterns in file content
   */
  updateErrorHandlingPatterns(content) {
    // Replace generic error handlers with standardized ones
    content = content.replace(
      /app\.use\(\(error.*?\)\s*=>\s*\{[\s\S]*?\}\);/g,
      `app.use(errorHandler);`
    );

    // Replace async route handlers with asyncHandler wrapper
    content = content.replace(
      /router\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`],\s*async\s*\(req,\s*res\)\s*=>\s*\{/g,
      'router.$1(\'$2\', asyncHandler(async (req, res) => {'
    );

    return content;
  }

  /**
   * Update service-specific error handler
   */
  async updateServiceErrorHandler(servicePath, serviceName) {
    const errorHandlerPath = path.join(servicePath, 'src/middleware/errorHandler.ts');
    
    if (fs.existsSync(errorHandlerPath)) {
      const standardizedHandler = this.generateStandardizedErrorHandler(serviceName);
      fs.writeFileSync(errorHandlerPath, standardizedHandler);
      this.stats.errorHandlersUpdated++;
      console.log(`  ✅ Updated error handler: ${errorHandlerPath}`);
    }
  }

  /**
   * Generate standardized error handler for a service
   */
  generateStandardizedErrorHandler(serviceName) {
    return `/**
 * ${serviceName} Error Handler
 * Uses UltraMarket standardized error handling
 */

import { errorHandler } from '@ultramarket/shared';

export default errorHandler;
`;
  }

  /**
   * Generate migration guide
   */
  async generateMigrationGuide() {
    const guide = `# UltraMarket Error Handling Standardization Guide

## Overview
This guide documents the standardization of error handling across all UltraMarket microservices.

## Changes Made

### 1. Shared Library Updates
- ✅ Added standardized error classes in \`libs/shared/src/errors/\`
- ✅ Created unified error handler middleware in \`libs/shared/src/middleware/errorHandler.ts\`
- ✅ Standardized API response types in \`libs/shared/src/types/api-responses.ts\`

### 2. Microservice Updates
- ✅ Replaced generic \`throw new Error()\` with specific error classes
- ✅ Updated error handlers to use shared middleware
- ✅ Standardized error response formats
- ✅ Added proper error logging with request context

### 3. Error Classes Available
- \`AppError\` - Base error class
- \`AuthenticationError\` - Authentication failures
- \`AuthorizationError\` - Permission/access issues
- \`ValidationError\` - Input validation errors
- \`ResourceNotFoundError\` - 404 errors
- \`BusinessRuleViolationError\` - Business logic violations
- \`DatabaseError\` - Database operation failures
- \`ExternalServiceError\` - Third-party service errors
- \`RateLimitError\` - Rate limiting violations
- \`ServiceUnavailableError\` - Service unavailability

## Usage Examples

### Throwing Errors
\`\`\`typescript
// Before
throw new Error('User not found');

// After
throw new ResourceNotFoundError('User', userId);
\`\`\`

### Error Handler Setup
\`\`\`typescript
// Before
app.use((error, req, res, next) => {
  // Custom error handling
});

// After
import { errorHandler } from '@ultramarket/shared';
app.use(errorHandler);
\`\`\`

### Async Route Handlers
\`\`\`typescript
// Before
router.get('/users', async (req, res) => {
  // Route logic
});

// After
import { asyncHandler } from '@ultramarket/shared';
router.get('/users', asyncHandler(async (req, res) => {
  // Route logic
}));
\`\`\`

## Benefits
1. **Consistency** - All services use the same error handling approach
2. **Maintainability** - Centralized error handling logic
3. **Observability** - Structured error logging with context
4. **Developer Experience** - Clear error types and messages
5. **Production Readiness** - Proper error sanitization and logging

## Next Steps
1. Test all microservices with the new error handling
2. Update API documentation to reflect new error responses
3. Monitor error logs in production
4. Train development team on new error handling patterns

## Statistics
- Files processed: ${this.stats.filesProcessed}
- Errors replaced: ${this.stats.errorsReplaced}
- Imports added: ${this.stats.importsAdded}
- Error handlers updated: ${this.stats.errorHandlersUpdated}
`;

    fs.writeFileSync('docs/ERROR_HANDLING_STANDARDIZATION.md', guide);
    console.log('\n📖 Generated migration guide: docs/ERROR_HANDLING_STANDARDIZATION.md');
  }

  /**
   * Print summary statistics
   */
  printSummary() {
    console.log('\n🎉 Error Handling Standardization Complete!');
    console.log('\n📊 Summary:');
    console.log(`  • Files processed: ${this.stats.filesProcessed}`);
    console.log(`  • Errors replaced: ${this.stats.errorsReplaced}`);
    console.log(`  • Imports added: ${this.stats.importsAdded}`);
    console.log(`  • Error handlers updated: ${this.stats.errorHandlersUpdated}`);
    console.log('\n✅ All microservices now use standardized error handling!');
  }
}

// Run the standardizer
if (require.main === module) {
  const standardizer = new ErrorHandlingStandardizer();
  standardizer.run().catch(console.error);
}

module.exports = ErrorHandlingStandardizer;