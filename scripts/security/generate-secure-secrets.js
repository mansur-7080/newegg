#!/usr/bin/env node

/**
 * UltraMarket Security Setup Script
 * Generates cryptographically secure secrets and updates environment configuration
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

const colorize = (text, color) => `${colors[color]}${text}${colors.reset}`;

class SecretGenerator {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../../');
    this.envDir = path.join(this.projectRoot, 'config/environments');
    this.secrets = new Map();
  }

  generateSecureSecret(length = 64, description = 'secret') {
    const secret = crypto.randomBytes(length).toString('hex');
    console.log(`✅ Generated secure ${description}: ${secret.length} characters`);
    return secret;
  }

  generateAllSecrets() {
    console.log(colorize('\n🔐 Generating cryptographically secure secrets...', 'cyan'));
    
    const secrets = {
      JWT_SECRET: {
        value: this.generateSecureSecret(64, 'JWT access secret'),
        description: 'JWT access token signing key',
      },
      JWT_REFRESH_SECRET: {
        value: this.generateSecureSecret(64, 'JWT refresh secret'),
        description: 'JWT refresh token signing key',
      },
      ENCRYPTION_KEY: {
        value: this.generateSecureSecret(32, 'encryption key'),
        description: 'Data encryption key',
      },
      SESSION_SECRET: {
        value: this.generateSecureSecret(32, 'session secret'),
        description: 'Session management secret',
      },
      REDIS_PASSWORD: {
        value: this.generateSecureSecret(32, 'Redis password'),
        description: 'Redis authentication password',
      },
    };

    // Generate additional production-specific secrets
    if (process.env.NODE_ENV === 'production') {
      secrets.POSTGRES_PASSWORD = {
        value: this.generateSecureSecret(24, 'PostgreSQL password'),
        description: 'PostgreSQL database password',
      };
      secrets.MONGODB_PASSWORD = {
        value: this.generateSecureSecret(24, 'MongoDB password'),
        description: 'MongoDB database password',
      };
    }

    this.secrets = new Map(Object.entries(secrets));
    return secrets;
  }

  validateExistingSecrets(envContent) {
    const warnings = [];
    const insecurePatterns = [
      'your-secret-key',
      'dev_password',
      'test123',
      'password',
      'secret',
      '123456',
    ];

    const secretLines = envContent.split('\n').filter(line => 
      line.includes('SECRET') || line.includes('PASSWORD') || line.includes('KEY')
    );

    for (const line of secretLines) {
      const [key, value] = line.split('=', 2);
      if (value) {
        const lowerValue = value.toLowerCase();
        for (const pattern of insecurePatterns) {
          if (lowerValue.includes(pattern)) {
            warnings.push(`🚨 INSECURE: ${key} contains pattern "${pattern}"`);
          }
        }
        if (value.length < 32) {
          warnings.push(`⚠️  SHORT: ${key} is only ${value.length} characters (recommend 32+)`);
        }
      }
    }

    return warnings;
  }

  async updateEnvFile(filePath, secrets, backup = true) {
    try {
      console.log(colorize(`\n📝 Updating: ${path.basename(filePath)}`, 'yellow'));

      // Read existing file
      let content = '';
      try {
        content = await fs.readFile(filePath, 'utf8');
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        console.log(`📄 Creating new file: ${path.basename(filePath)}`);
      }

      // Validate existing secrets
      const warnings = this.validateExistingSecrets(content);
      if (warnings.length > 0) {
        console.log(colorize('\n⚠️  Security warnings for existing file:', 'yellow'));
        warnings.forEach(warning => console.log(`   ${warning}`));
      }

      // Create backup if requested and file exists
      if (backup && content) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        await fs.writeFile(backupPath, content);
        console.log(`💾 Backup created: ${path.basename(backupPath)}`);
      }

      // Update content with new secrets
      let updatedContent = content;

      for (const [key, secretInfo] of secrets.entries()) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        const newLine = `${key}=${secretInfo.value}`;

        if (regex.test(updatedContent)) {
          updatedContent = updatedContent.replace(regex, newLine);
          console.log(`✅ Updated: ${key}`);
        } else {
          // Add new secret at the end of JWT/Security section
          if (key.includes('JWT') || key.includes('SECRET') || key.includes('PASSWORD')) {
            const jwtSectionRegex = /^# JWT Configuration.*$/m;
            if (jwtSectionRegex.test(updatedContent)) {
              updatedContent = updatedContent.replace(
                jwtSectionRegex,
                match => `${match}\n${newLine}`
              );
            } else {
              updatedContent += `\n# Security\n${newLine}\n`;
            }
            console.log(`➕ Added: ${key}`);
          }
        }
      }

      // Write updated content
      await fs.writeFile(filePath, updatedContent);
      console.log(colorize(`✅ Successfully updated: ${path.basename(filePath)}`, 'green'));

    } catch (error) {
      console.error(colorize(`❌ Error updating ${filePath}: ${error.message}`, 'red'));
      throw error;
    }
  }

  async createSecureEnvTemplate(filePath, secrets) {
    const template = `# UltraMarket Secure Environment Configuration
# Generated on: ${new Date().toISOString()}
# 
# ⚠️  CRITICAL SECURITY NOTICE:
# - Never commit this file to version control
# - Store secrets in a secure secret management system in production
# - Rotate secrets regularly
# - Use different secrets for each environment

# Application Configuration
NODE_ENV=development
PORT=3000
APP_NAME=UltraMarket
APP_URL=http://localhost:3000
API_VERSION=v1

# Database Configuration with Connection Pool Management
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ultramarket_dev
POSTGRES_USER=ultramarket_user
${secrets.has('POSTGRES_PASSWORD') ? `POSTGRES_PASSWORD=${secrets.get('POSTGRES_PASSWORD').value}` : 'POSTGRES_PASSWORD=your_secure_postgres_password'}
POSTGRES_SSL=false

# Connection Pool Settings (CRITICAL: Prevents connection limit issues!)
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_CONNECTION_TIMEOUT=30000
DB_IDLE_TIMEOUT=300000
DATABASE_URL=postgresql://ultramarket_user:\${POSTGRES_PASSWORD}@localhost:5432/ultramarket_dev

# MongoDB Configuration
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DB=ultramarket_dev
MONGODB_USER=ultramarket_user
${secrets.has('MONGODB_PASSWORD') ? `MONGODB_PASSWORD=${secrets.get('MONGODB_PASSWORD').value}` : 'MONGODB_PASSWORD=your_secure_mongodb_password'}

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
${secrets.has('REDIS_PASSWORD') ? `REDIS_PASSWORD=${secrets.get('REDIS_PASSWORD').value}` : `REDIS_PASSWORD=${this.generateSecureSecret(32)}`}
REDIS_DB=0
REDIS_URL=redis://:\${REDIS_PASSWORD}@\${REDIS_HOST}:\${REDIS_PORT}/\${REDIS_DB}

# JWT Configuration - CRYPTOGRAPHICALLY SECURE
JWT_SECRET=${secrets.get('JWT_SECRET').value}
JWT_REFRESH_SECRET=${secrets.get('JWT_REFRESH_SECRET').value}
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=ultramarket-platform
JWT_AUDIENCE=ultramarket-services

# Encryption & Security
ENCRYPTION_KEY=${secrets.get('ENCRYPTION_KEY').value}
SESSION_SECRET=${secrets.get('SESSION_SECRET').value}

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@ultramarket.com

# Service URLs
API_GATEWAY_URL=http://localhost:8000
AUTH_SERVICE_URL=http://localhost:8001
USER_SERVICE_URL=http://localhost:8002
PRODUCT_SERVICE_URL=http://localhost:8003
ORDER_SERVICE_URL=http://localhost:8004
PAYMENT_SERVICE_URL=http://localhost:8005
INVENTORY_SERVICE_URL=http://localhost:8008

# Security Headers & CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
TRUST_PROXY=false
SECURITY_HEADERS=true

# Monitoring & Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
METRICS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false
`;

    await fs.writeFile(filePath, template);
    console.log(colorize(`✅ Created secure environment template: ${path.basename(filePath)}`, 'green'));
  }

  async validateEnvironmentFiles() {
    console.log(colorize('\n🔍 Validating environment files for security issues...', 'cyan'));

    const envFiles = [
      'development.env.example',
      'production.env.example',
      'staging.env.example',
    ];

    let totalWarnings = 0;

    for (const filename of envFiles) {
      const filePath = path.join(this.envDir, filename);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const warnings = this.validateExistingSecrets(content);
        
        if (warnings.length > 0) {
          console.log(colorize(`\n⚠️  ${filename}:`, 'yellow'));
          warnings.forEach(warning => console.log(`   ${warning}`));
          totalWarnings += warnings.length;
        } else {
          console.log(colorize(`✅ ${filename}: No security issues found`, 'green'));
        }
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.log(colorize(`❌ Error reading ${filename}: ${error.message}`, 'red'));
        }
      }
    }

    return totalWarnings;
  }

  async run() {
    console.log(colorize('🚀 UltraMarket Security Setup Starting...', 'bold'));
    console.log(colorize('='.repeat(50), 'blue'));

    try {
      // Ensure environment directory exists
      await fs.mkdir(this.envDir, { recursive: true });

      // Generate all secrets
      const secrets = this.generateAllSecrets();

      // Validate existing files
      const warningCount = await this.validateEnvironmentFiles();

      if (warningCount > 0) {
        console.log(colorize(`\n⚠️  Found ${warningCount} security warnings in existing files`, 'yellow'));
      }

      // Create secure .env file
      const secureEnvPath = path.join(this.projectRoot, '.env.secure');
      await this.createSecureEnvTemplate(secureEnvPath, this.secrets);

      // Update example files
      const envFiles = [
        'development.env.example',
        'production.env.example',
        'staging.env.example',
      ];

      for (const filename of envFiles) {
        const filePath = path.join(this.envDir, filename);
        if (await fs.access(filePath).then(() => true).catch(() => false)) {
          await this.updateEnvFile(filePath, this.secrets, true);
        }
      }

      console.log(colorize('\n🎉 Security setup completed successfully!', 'green'));
      console.log(colorize('='.repeat(50), 'blue'));
      console.log('\n📋 Next steps:');
      console.log('   1. Copy .env.secure to .env for development');
      console.log('   2. Update production secrets using your secret management system');
      console.log('   3. Restart all services to apply new configuration');
      console.log('   4. Test authentication to ensure secrets work correctly');
      console.log('\n⚠️  Security reminders:');
      console.log('   - Never commit .env or .env.secure to version control');
      console.log('   - Rotate secrets regularly in production');
      console.log('   - Use a proper secret management system in production');

      // Print secret summary
      console.log(colorize('\n🔐 Generated secrets summary:', 'cyan'));
      for (const [key, secretInfo] of this.secrets.entries()) {
        console.log(`   ${key}: ${secretInfo.description} (${secretInfo.value.length} chars)`);
      }

    } catch (error) {
      console.error(colorize(`\n💥 Setup failed: ${error.message}`, 'red'));
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new SecretGenerator();
  generator.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = SecretGenerator;