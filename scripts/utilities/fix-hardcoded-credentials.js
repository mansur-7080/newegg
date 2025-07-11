#!/usr/bin/env node

/**
 * Hardcoded Credentials Fix Script
 * Replaces hardcoded credentials with environment variables
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

const INCLUDE_EXTENSIONS = ['.yml', '.yaml', '.js', '.ts', '.json'];

// Credential patterns to replace
const CREDENTIAL_PATTERNS = [
  {
    name: 'Database Passwords',
    pattern: /POSTGRES_PASSWORD:\s*['"]([^'"]+)['"]/g,
    replacement: 'POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}',
    envVar: 'POSTGRES_PASSWORD',
    description: 'PostgreSQL password'
  },
  {
    name: 'MongoDB Passwords',
    pattern: /MONGO_INITDB_ROOT_PASSWORD:\s*['"]([^'"]+)['"]/g,
    replacement: 'MONGO_INITDB_ROOT_PASSWORD: ${MONGO_INITDB_ROOT_PASSWORD}',
    envVar: 'MONGO_INITDB_ROOT_PASSWORD',
    description: 'MongoDB root password'
  },
  {
    name: 'Redis Passwords',
    pattern: /--requirepass\s+([^\s]+)/g,
    replacement: '--requirepass ${REDIS_PASSWORD}',
    envVar: 'REDIS_PASSWORD',
    description: 'Redis password'
  },
  {
    name: 'JWT Secrets',
    pattern: /JWT_SECRET:\s*['"]([^'"]+)['"]/g,
    replacement: 'JWT_SECRET: ${JWT_SECRET}',
    envVar: 'JWT_SECRET',
    description: 'JWT secret'
  },
  {
    name: 'JWT Refresh Secrets',
    pattern: /JWT_REFRESH_SECRET:\s*['"]([^'"]+)['"]/g,
    replacement: 'JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}',
    envVar: 'JWT_REFRESH_SECRET',
    description: 'JWT refresh secret'
  },
  {
    name: 'Test JWT Secrets',
    pattern: /process\.env\.JWT_SECRET\s*=\s*['"]([^'"]+)['"]/g,
    replacement: "process.env.JWT_SECRET = process.env.JWT_SECRET || '$1'",
    envVar: 'JWT_SECRET',
    description: 'Test JWT secret'
  },
  {
    name: 'Test JWT Refresh Secrets',
    pattern: /process\.env\.JWT_REFRESH_SECRET\s*=\s*['"]([^'"]+)['"]/g,
    replacement: "process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '$1'",
    envVar: 'JWT_REFRESH_SECRET',
    description: 'Test JWT refresh secret'
  },
  {
    name: 'Database URLs',
    pattern: /DATABASE_URL:\s*['"]([^'"]+)['"]/g,
    replacement: 'DATABASE_URL: ${DATABASE_URL}',
    envVar: 'DATABASE_URL',
    description: 'Database URL'
  },
  {
    name: 'Redis URLs',
    pattern: /REDIS_URL:\s*['"]([^'"]+)['"]/g,
    replacement: 'REDIS_URL: ${REDIS_URL}',
    envVar: 'REDIS_URL',
    description: 'Redis URL'
  }
];

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  return INCLUDE_EXTENSIONS.includes(ext);
}

function shouldSkipDirectory(dirName) {
  return EXCLUDE_DIRS.includes(dirName);
}

function generateStrongSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let replacements = 0;

    // Apply credential replacements
    CREDENTIAL_PATTERNS.forEach(({ name, pattern, replacement, envVar, description }) => {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        replacements += matches.length;
        modified = true;
        console.log(`  ✓ ${name}: ${matches.length} replacements`);
      }
    });

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

function generateEnvTemplate() {
  const envTemplate = `# UltraMarket Environment Variables
# Generated automatically - DO NOT COMMIT TO VERSION CONTROL

# Database Configuration
POSTGRES_DB=ultramarket_prod
POSTGRES_USER=ultramarket_prod_user
POSTGRES_PASSWORD=${generateStrongSecret(32)}

# MongoDB Configuration
MONGO_INITDB_ROOT_USERNAME=ultramarket_prod_admin
MONGO_INITDB_ROOT_PASSWORD=${generateStrongSecret(32)}
MONGO_INITDB_DATABASE=ultramarket_products_prod

# Redis Configuration
REDIS_PASSWORD=${generateStrongSecret(32)}

# JWT Configuration
JWT_SECRET=${generateStrongSecret(64)}
JWT_REFRESH_SECRET=${generateStrongSecret(64)}

# Database URLs
DATABASE_URL=postgresql://ultramarket_prod_user:${generateStrongSecret(32)}@postgres:5432/ultramarket_prod
REDIS_URL=redis://:${generateStrongSecret(32)}@redis:6379

# Application Configuration
NODE_ENV=production
LOG_LEVEL=info
PORT=3000

# Security Configuration
SESSION_SECRET=${generateStrongSecret(64)}
COOKIE_SECRET=${generateStrongSecret(64)}

# External Services (Update with real credentials)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
PAYPAL_CLIENT_SECRET=your_paypal_client_secret

# Monitoring and Logging
LOG_FILE=app.log
LOG_DIR=logs
APP_VERSION=1.0.0

# Performance Configuration
BCRYPT_ROUNDS=12
CACHE_TTL=3600
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
`;

  const envPath = path.join(process.cwd(), '.env.production');
  fs.writeFileSync(envPath, envTemplate, 'utf8');
  console.log(`✅ Generated production environment template: ${envPath}`);
  
  return envPath;
}

function main() {
  console.log('🔐 Hardcoded Credentials Fix Script');
  console.log('====================================\n');

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
    console.log('\n✅ Hardcoded credentials successfully replaced with environment variables!');
    
    // Generate environment template
    const envPath = generateEnvTemplate();
    
    console.log('\n📝 Next steps:');
    console.log('   1. Review the changes in your version control system');
    console.log('   2. Update your deployment scripts to use environment variables');
    console.log('   3. Set up proper secrets management (e.g., Kubernetes secrets, AWS Secrets Manager)');
    console.log('   4. Update the generated .env.production file with real credentials');
    console.log('   5. Test the application to ensure all services can connect');
    console.log(`   6. Remove the generated ${envPath} file from version control`);
  } else {
    console.log('\nℹ️  No hardcoded credentials found to replace.');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  processFile,
  walkDirectory,
  CREDENTIAL_PATTERNS,
  generateStrongSecret,
  generateEnvTemplate
};