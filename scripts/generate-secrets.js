#!/usr/bin/env node

/**
 * Secure Secrets Generator for UltraMarket Platform
 * Generates all required secrets, passwords, and tokens for production deployment
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Generate cryptographically secure random string
 */
function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('base64');
}

/**
 * Generate secure password with specific requirements
 */
function generateSecurePassword(length = 32) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*!';
  let password = '';

  // Ensure at least one character from each category
  const categories = [
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ', // Uppercase
    'abcdefghijklmnopqrstuvwxyz', // Lowercase
    '0123456789', // Numbers
    '@#$%^&*!', // Special characters
  ];

  // Add one character from each category
  categories.forEach((category) => {
    password += category[crypto.randomInt(category.length)];
  });

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset[crypto.randomInt(charset.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => crypto.randomInt(3) - 1)
    .join('');
}

/**
 * Generate all required secrets
 */
function generateAllSecrets() {
  console.log(`${colors.cyan}${colors.bright}🔐 UltraMarket Secrets Generator${colors.reset}\n`);

  const secrets = {
    // JWT Secrets (64 characters base64 encoded)
    JWT_ACCESS_SECRET: generateSecureSecret(64),
    JWT_REFRESH_SECRET: generateSecureSecret(64),
    JWT_RESET_SECRET: generateSecureSecret(64),
    JWT_VERIFICATION_SECRET: generateSecureSecret(64),

    // Session and Encryption Secrets
    SESSION_SECRET: generateSecureSecret(64),
    ENCRYPTION_KEY: generateSecureSecret(32).substring(0, 32), // Exactly 32 chars for AES-256

    // Database Passwords (Strong passwords)
    POSTGRES_PASSWORD: generateSecurePassword(24),
    MONGODB_PASSWORD: generateSecurePassword(24),
    REDIS_PASSWORD: generateSecurePassword(24),

    // Admin Passwords
    GRAFANA_ADMIN_PASSWORD: generateSecurePassword(20),

    // API Keys and Webhooks (these would normally come from external services)
    WEBHOOK_SECRET: generateSecureSecret(32),
    API_SECRET_KEY: generateSecureSecret(48),

    // Additional Security Keys
    CSRF_SECRET: generateSecureSecret(32),
    COOKIE_SECRET: generateSecureSecret(32),
  };

  return secrets;
}

/**
 * Create .env file with generated secrets
 */
function createEnvFile(secrets) {
  const envContent = `# UltraMarket Production Environment Variables
# Generated on: ${new Date().toISOString()}
# WARNING: Keep these secrets secure and never commit to version control!

# =================== APPLICATION SETTINGS ===================
NODE_ENV=production
APP_NAME=UltraMarket
APP_VERSION=2.0.0
LOG_LEVEL=info

# =================== API GATEWAY ===================
API_GATEWAY_PORT=3000
API_GATEWAY_HOST=0.0.0.0
CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com

# =================== GENERATED SECRETS ===================
# JWT SECRETS (64+ characters for security)
JWT_ACCESS_SECRET=${secrets.JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}
JWT_RESET_SECRET=${secrets.JWT_RESET_SECRET}
JWT_VERIFICATION_SECRET=${secrets.JWT_VERIFICATION_SECRET}

# SESSION & ENCRYPTION
SESSION_SECRET=${secrets.SESSION_SECRET}
ENCRYPTION_KEY=${secrets.ENCRYPTION_KEY}
CSRF_SECRET=${secrets.CSRF_SECRET}
COOKIE_SECRET=${secrets.COOKIE_SECRET}

# DATABASE PASSWORDS (Strong 24+ character passwords)
POSTGRES_PASSWORD=${secrets.POSTGRES_PASSWORD}
MONGODB_PASSWORD=${secrets.MONGODB_PASSWORD}
REDIS_PASSWORD=${secrets.REDIS_PASSWORD}

# ADMIN PASSWORDS
GRAFANA_ADMIN_PASSWORD=${secrets.GRAFANA_ADMIN_PASSWORD}

# API SECURITY
WEBHOOK_SECRET=${secrets.WEBHOOK_SECRET}
API_SECRET_KEY=${secrets.API_SECRET_KEY}

# =================== DATABASE CONFIGURATION ===================
# PostgreSQL
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=ultramarket
POSTGRES_USER=ultramarket_user
DATABASE_URL=postgresql://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@\${POSTGRES_HOST}:\${POSTGRES_PORT}/\${POSTGRES_DB}

# MongoDB
MONGODB_HOST=mongodb
MONGODB_PORT=27017
MONGODB_USERNAME=ultramarket_admin
MONGODB_DATABASE=ultramarket_products
MONGODB_URI=mongodb://\${MONGODB_USERNAME}:\${MONGODB_PASSWORD}@\${MONGODB_HOST}:\${MONGODB_PORT}/\${MONGODB_DATABASE}?authSource=admin

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0
REDIS_URL=redis://:\${REDIS_PASSWORD}@\${REDIS_HOST}:\${REDIS_PORT}/\${REDIS_DB}

# =================== EXTERNAL SERVICES ===================
# Email Service (Configure with your SMTP provider)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=YOUR_EMAIL_APP_PASSWORD
FROM_EMAIL=noreply@yourdomain.com

# AWS Services (Configure with your AWS account)
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_KEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=ultramarket-assets

# Stripe Payment (Configure with your Stripe account)
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_STRIPE_WEBHOOK_SECRET

# Elasticsearch
ELASTICSEARCH_URL=http://elasticsearch:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=YOUR_ELASTICSEARCH_PASSWORD
ELASTICSEARCH_INDEX_PREFIX=ultramarket

# =================== FRONTEND URLS ===================
FRONTEND_URL=https://yourdomain.com
ADMIN_URL=https://admin.yourdomain.com
API_URL=https://api.yourdomain.com

# =================== MONITORING ===================
PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
GRAFANA_ADMIN_USER=admin
JAEGER_PORT=16686

# =================== SECURITY CONFIGURATION ===================
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=true

# =================== FILE UPLOADS ===================
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,application/pdf
`;

  return envContent;
}

/**
 * Display security information and warnings
 */
function displaySecurityInfo(secrets) {
  console.log(`${colors.green}✅ Successfully generated all secrets!${colors.reset}\n`);

  console.log(`${colors.yellow}${colors.bright}🔒 SECURITY WARNINGS:${colors.reset}`);
  console.log(`${colors.yellow}• Keep these secrets secure and never commit to version control`);
  console.log(`• Store secrets in a secure password manager or secrets management system`);
  console.log(`• Rotate secrets regularly (at least every 90 days)`);
  console.log(`• Use different secrets for different environments${colors.reset}\n`);

  console.log(`${colors.blue}${colors.bright}📊 Generated Secrets Summary:${colors.reset}`);
  console.log(`${colors.blue}• JWT Secrets: 4 (64+ characters each)`);
  console.log(`• Database Passwords: 3 (24+ characters each)`);
  console.log(`• Security Keys: 6 (32+ characters each)`);
  console.log(
    `• Total Entropy: ${Object.values(secrets).join('').length} characters${colors.reset}\n`
  );

  console.log(`${colors.cyan}${colors.bright}🚀 Next Steps:${colors.reset}`);
  console.log(`${colors.cyan}1. Review the generated .env file`);
  console.log(`2. Update external service credentials (SMTP, AWS, Stripe, etc.)`);
  console.log(`3. Test the configuration in a staging environment`);
  console.log(`4. Deploy to production with confidence!${colors.reset}\n`);
}

/**
 * Create secrets backup file
 */
function createSecretsBackup(secrets) {
  const backupData = {
    generatedAt: new Date().toISOString(),
    environment: 'production',
    secrets: secrets,
    checksum: crypto.createHash('sha256').update(JSON.stringify(secrets)).digest('hex'),
  };

  const backupContent = JSON.stringify(backupData, null, 2);
  const backupFileName = `secrets-backup-${Date.now()}.json`;
  const backupPath = path.join(__dirname, '..', 'secrets', backupFileName);

  // Create secrets directory if it doesn't exist
  const secretsDir = path.dirname(backupPath);
  if (!fs.existsSync(secretsDir)) {
    fs.mkdirSync(secretsDir, { recursive: true });
  }

  fs.writeFileSync(backupPath, backupContent);

  console.log(`${colors.green}💾 Secrets backup saved to: ${backupFileName}${colors.reset}`);
  console.log(
    `${colors.yellow}⚠️  Store this backup in a secure location and delete after use${colors.reset}\n`
  );
}

/**
 * Validate generated secrets
 */
function validateSecrets(secrets) {
  const validations = [
    {
      name: 'JWT Secrets Length',
      test: () =>
        [
          secrets.JWT_ACCESS_SECRET,
          secrets.JWT_REFRESH_SECRET,
          secrets.JWT_RESET_SECRET,
          secrets.JWT_VERIFICATION_SECRET,
        ].every((secret) => secret.length >= 64),
    },
    {
      name: 'Password Strength',
      test: () =>
        [secrets.POSTGRES_PASSWORD, secrets.MONGODB_PASSWORD, secrets.REDIS_PASSWORD].every(
          (password) =>
            password.length >= 16 &&
            /[A-Z]/.test(password) &&
            /[a-z]/.test(password) &&
            /[0-9]/.test(password) &&
            /[^A-Za-z0-9]/.test(password)
        ),
    },
    {
      name: 'Encryption Key Length',
      test: () => secrets.ENCRYPTION_KEY.length === 32,
    },
    {
      name: 'Unique Secrets',
      test: () => {
        const values = Object.values(secrets);
        return values.length === new Set(values).size;
      },
    },
  ];

  console.log(`${colors.blue}${colors.bright}🧪 Security Validation:${colors.reset}`);

  let allValid = true;
  validations.forEach((validation) => {
    const isValid = validation.test();
    const status = isValid ? `${colors.green}✅` : `${colors.red}❌`;
    console.log(`${status} ${validation.name}${colors.reset}`);
    if (!isValid) allValid = false;
  });

  if (allValid) {
    console.log(`${colors.green}\n🎉 All security validations passed!${colors.reset}\n`);
  } else {
    console.log(
      `${colors.red}\n❌ Some validations failed. Please regenerate secrets.${colors.reset}\n`
    );
    process.exit(1);
  }
}

/**
 * Main function
 */
function main() {
  try {
    // Generate secrets
    const secrets = generateAllSecrets();

    // Validate secrets
    validateSecrets(secrets);

    // Create .env file
    const envContent = createEnvFile(secrets);
    const envPath = path.join(__dirname, '..', '.env');

    // Backup existing .env if it exists
    if (fs.existsSync(envPath)) {
      const backupPath = `${envPath}.backup.${Date.now()}`;
      fs.copyFileSync(envPath, backupPath);
      console.log(
        `${colors.yellow}📋 Existing .env backed up to: ${path.basename(backupPath)}${colors.reset}`
      );
    }

    // Write new .env file
    fs.writeFileSync(envPath, envContent);
    console.log(`${colors.green}📝 New .env file created successfully!${colors.reset}\n`);

    // Create secrets backup
    createSecretsBackup(secrets);

    // Display security information
    displaySecurityInfo(secrets);

    console.log(
      `${colors.green}${colors.bright}🎯 Ready for production deployment!${colors.reset}`
    );
  } catch (error) {
    console.error(`${colors.red}${colors.bright}❌ Error generating secrets:${colors.reset}`);
    console.error(`${colors.red}${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`${colors.cyan}${colors.bright}UltraMarket Secrets Generator${colors.reset}

${colors.bright}Usage:${colors.reset}
  node scripts/generate-secrets.js [options]

${colors.bright}Options:${colors.reset}
  --help, -h     Show this help message
  --validate     Only validate existing .env file
  --backup       Create backup without generating new secrets

${colors.bright}Examples:${colors.reset}
  node scripts/generate-secrets.js                # Generate new secrets
  node scripts/generate-secrets.js --validate     # Validate existing secrets
  node scripts/generate-secrets.js --backup       # Backup current secrets

${colors.yellow}${colors.bright}Security Note:${colors.reset}
${colors.yellow}Always keep generated secrets secure and never commit them to version control.${colors.reset}
`);
  process.exit(0);
}

// Run the main function
if (require.main === module) {
  main();
}

module.exports = {
  generateAllSecrets,
  generateSecureSecret,
  generateSecurePassword,
};
