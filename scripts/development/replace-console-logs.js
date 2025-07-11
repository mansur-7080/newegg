#!/usr/bin/env node

/**
 * Console.log Replacement Script
 * Replaces console.log statements with Winston logger in production code
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directories to process (exclude test files and scripts)
const PRODUCTION_DIRS = [
  'microservices',
  'frontend/web-app/src',
  'frontend/admin-panel/src',
  'libs/shared/src'
];

// File patterns to include
const INCLUDE_PATTERNS = ['*.ts', '*.tsx', '*.js', '*.jsx'];

// File patterns to exclude
const EXCLUDE_PATTERNS = [
  '**/*.test.*',
  '**/*.spec.*',
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/tests/**',
  '**/scripts/**'
];

// Console methods to replace
const CONSOLE_METHODS = ['log', 'error', 'warn', 'info', 'debug'];

// Winston logger import statement
const WINSTON_IMPORT = "import { logger } from '@ultramarket/shared';";

// Replacement mappings
const REPLACEMENTS = {
  'console.log': 'logger.info',
  'console.error': 'logger.error',
  'console.warn': 'logger.warn',
  'console.info': 'logger.info',
  'console.debug': 'logger.debug'
};

function findFiles(dir, patterns, excludes) {
  const files = [];
  
  function walk(currentPath) {
    if (excludes.some(pattern => currentPath.includes(pattern))) {
      return;
    }
    
    const stats = fs.statSync(currentPath);
    if (stats.isDirectory()) {
      const items = fs.readdirSync(currentPath);
      items.forEach(item => {
        walk(path.join(currentPath, item));
      });
    } else if (patterns.some(pattern => currentPath.endsWith(pattern.replace('*', '')))) {
      files.push(currentPath);
    }
  }
  
  walk(dir);
  return files;
}

function replaceConsoleStatements(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Check if Winston logger is already imported
  const hasWinstonImport = content.includes('import { logger }') || 
                          content.includes('from \'@ultramarket/shared\'');
  
  // Replace console statements
  CONSOLE_METHODS.forEach(method => {
    const consolePattern = new RegExp(`console\\.${method}\\s*\\(`, 'g');
    if (consolePattern.test(content)) {
      content = content.replace(consolePattern, `logger.${method}(`);
      modified = true;
    }
  });
  
  // Add Winston import if needed and file was modified
  if (modified && !hasWinstonImport) {
    // Find the best place to add the import
    const lines = content.split('\n');
    let importIndex = -1;
    
    // Look for existing imports
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        importIndex = i;
      }
    }
    
    if (importIndex >= 0) {
      lines.splice(importIndex + 1, 0, WINSTON_IMPORT);
    } else {
      lines.unshift(WINSTON_IMPORT);
    }
    
    content = lines.join('\n');
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

function main() {
  console.log('🔧 Starting console.log replacement process...');
  
  let totalFiles = 0;
  let modifiedFiles = 0;
  
  PRODUCTION_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`📁 Processing directory: ${dir}`);
      
      const files = findFiles(dir, INCLUDE_PATTERNS, EXCLUDE_PATTERNS);
      totalFiles += files.length;
      
      files.forEach(file => {
        try {
          if (replaceConsoleStatements(file)) {
            modifiedFiles++;
            console.log(`✅ Modified: ${file}`);
          }
        } catch (error) {
          console.error(`❌ Error processing ${file}:`, error.message);
        }
      });
    } else {
      console.log(`⚠️  Directory not found: ${dir}`);
    }
  });
  
  console.log('\n📊 Summary:');
  console.log(`Total files processed: ${totalFiles}`);
  console.log(`Files modified: ${modifiedFiles}`);
  console.log(`Files unchanged: ${totalFiles - modifiedFiles}`);
  
  if (modifiedFiles > 0) {
    console.log('\n🎉 Console.log replacement completed successfully!');
    console.log('💡 Remember to:');
    console.log('   - Test the changes thoroughly');
    console.log('   - Update any remaining console statements manually');
    console.log('   - Ensure Winston logger is properly configured');
  } else {
    console.log('\nℹ️  No console statements found to replace.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { replaceConsoleStatements, findFiles };