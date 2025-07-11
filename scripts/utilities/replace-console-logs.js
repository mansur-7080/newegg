#!/usr/bin/env node

/**
 * Console.log Replacement Script
 * Replaces console.log statements with Winston logger in production code
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const EXCLUDE_DIRS = [
  'node_modules',
  'dist',
  'build',
  'coverage',
  'tests',
  'scripts',
  'security-audit',
  '.git'
];

const INCLUDE_EXTENSIONS = ['.ts', '.js', '.tsx', '.jsx'];

// Logger import statement
const LOGGER_IMPORT = "import { logger } from '@ultramarket/shared/logging';";

// Replacement patterns
const REPLACEMENTS = [
  {
    pattern: /console\.log\s*\(\s*([^)]+)\s*\)/g,
    replacement: 'logger.log($1)',
    description: 'console.log() -> logger.log()'
  },
  {
    pattern: /console\.error\s*\(\s*([^)]+)\s*\)/g,
    replacement: 'logger.error($1)',
    description: 'console.error() -> logger.error()'
  },
  {
    pattern: /console\.warn\s*\(\s*([^)]+)\s*\)/g,
    replacement: 'logger.warn($1)',
    description: 'console.warn() -> logger.warn()'
  },
  {
    pattern: /console\.info\s*\(\s*([^)]+)\s*\)/g,
    replacement: 'logger.info($1)',
    description: 'console.info() -> logger.info()'
  },
  {
    pattern: /console\.debug\s*\(\s*([^)]+)\s*\)/g,
    replacement: 'logger.debug($1)',
    description: 'console.debug() -> logger.debug()'
  }
];

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  return INCLUDE_EXTENSIONS.includes(ext);
}

function shouldSkipDirectory(dirName) {
  return EXCLUDE_DIRS.includes(dirName);
}

function addLoggerImport(content) {
  // Check if logger is already imported
  if (content.includes('import { logger }') || content.includes('import logger')) {
    return content;
  }

  // Find the last import statement
  const importRegex = /^import\s+.*$/gm;
  const imports = content.match(importRegex);
  
  if (imports) {
    const lastImport = imports[importports.length - 1];
    const lastImportIndex = content.lastIndexOf(lastImport);
    const insertIndex = lastImportIndex + lastImport.length;
    
    return content.slice(0, insertIndex) + '\n' + LOGGER_IMPORT + content.slice(insertIndex);
  } else {
    // No imports found, add at the beginning
    return LOGGER_IMPORT + '\n\n' + content;
  }
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let replacements = 0;

    // Apply replacements
    REPLACEMENTS.forEach(({ pattern, replacement, description }) => {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        replacements += matches.length;
        modified = true;
        console.log(`  ✓ ${description}: ${matches.length} replacements`);
      }
    });

    // Add logger import if needed
    if (modified) {
      content = addLoggerImport(content);
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✓ Updated ${filePath} (${replacements} total replacements)`);
      return replacements;
    }

    return 0;
  } catch (error) {
    console.error(`  ✗ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

function walkDirectory(dirPath, basePath = '') {
  let totalReplacements = 0;
  let processedFiles = 0;

  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const relativePath = path.join(basePath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!shouldSkipDirectory(item)) {
          console.log(`📁 Processing directory: ${relativePath}`);
          const { replacements, files } = walkDirectory(fullPath, relativePath);
          totalReplacements += replacements;
          processedFiles += files;
        }
      } else if (stat.isFile() && shouldProcessFile(fullPath)) {
        console.log(`📄 Processing file: ${relativePath}`);
        const replacements = processFile(fullPath);
        totalReplacements += replacements;
        if (replacements > 0) {
          processedFiles++;
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error.message);
  }

  return { replacements: totalReplacements, files: processedFiles };
}

function main() {
  console.log('🔧 Console.log Replacement Script');
  console.log('================================\n');

  const startTime = Date.now();
  const workspacePath = process.cwd();
  
  console.log(`📂 Scanning workspace: ${workspacePath}\n`);

  const { replacements, files } = walkDirectory(workspacePath);
  
  const duration = Date.now() - startTime;
  
  console.log('\n📊 Summary:');
  console.log(`   Files processed: ${files}`);
  console.log(`   Total replacements: ${replacements}`);
  console.log(`   Duration: ${duration}ms`);
  
  if (replacements > 0) {
    console.log('\n✅ Console.log statements successfully replaced with Winston logger!');
    console.log('\n📝 Next steps:');
    console.log('   1. Review the changes in your version control system');
    console.log('   2. Test the application to ensure logging works correctly');
    console.log('   3. Update any remaining console.log statements manually if needed');
  } else {
    console.log('\nℹ️  No console.log statements found to replace.');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  processFile,
  walkDirectory,
  REPLACEMENTS
};