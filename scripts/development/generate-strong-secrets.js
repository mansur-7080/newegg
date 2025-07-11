#!/usr/bin/env node

/**
 * Strong Secrets Generator
 * Generates cryptographically strong secrets for JWT and security purposes
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Secret types and their requirements
const SECRET_TYPES = {
  JWT_ACCESS_SECRET: {
    length: 64,
    description: 'JWT Access Token Secret',
    requirements: ['uppercase', 'lowercase', 'numbers', 'special']
  },
  JWT_REFRESH_SECRET: {
    length: 64,
    description: 'JWT Refresh Token Secret',
    requirements: ['uppercase', 'lowercase', 'numbers', 'special']
  },
  JWT_RESET_SECRET: {
    length: 64,
    description: 'JWT Password Reset Secret',
    requirements: ['uppercase', 'lowercase', 'numbers', 'special']
  },
  SESSION_SECRET: {
    length: 48,
    description: 'Session Secret',
    requirements: ['uppercase', 'lowercase', 'numbers', 'special']
  },
  COOKIE_SECRET: {
    length: 48,
    description: 'Cookie Secret',
    requirements: ['uppercase', 'lowercase', 'numbers', 'special']
  },
  ENCRYPTION_KEY: {
    length: 32,
    description: 'Data Encryption Key',
    requirements: ['base64']
  },
  API_KEY_SECRET: {
    length: 56,
    description: 'API Key Generation Secret',
    requirements: ['uppercase', 'lowercase', 'numbers', 'special']
  }
};

function generateStrongSecret(type, config) {
  const { length, requirements } = config;
  
  if (requirements.includes('base64')) {
    // Generate base64 encoded secret
    return crypto.randomBytes(length).toString('base64');
  }
  
  // Generate complex string secret
  const charset = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    special: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };
  
  let secret = '';
  
  // Ensure at least one character from each required category
  requirements.forEach(req => {
    if (charset[req]) {
      secret += charset[req][crypto.randomInt(charset[req].length)];
    }
  });
  
  // Fill the rest with random characters
  const allChars = requirements.map(req => charset[req]).join('');
  for (let i = secret.length; i < length; i++) {
    secret += allChars[crypto.randomInt(allChars.length)];
  }
  
  // Shuffle the secret
  return secret.split('').sort(() => 0.5 - Math.random()).join('');
}

function validateSecretStrength(secret, requirements) {
  const checks = {
    uppercase: /[A-Z]/.test(secret),
    lowercase: /[a-z]/.test(secret),
    numbers: /\d/.test(secret),
    special: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(secret),
    length: secret.length >= 32
  };
  
  return requirements.every(req => checks[req] || req === 'base64');
}

function generateAllSecrets() {
  console.log('🔐 Generating Strong Cryptographic Secrets...\n');
  
  const secrets = {};
  const validationResults = {};
  
  Object.entries(SECRET_TYPES).forEach(([key, config]) => {
    let secret;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      secret = generateStrongSecret(key, config);
      attempts++;
    } while (!validateSecretStrength(secret, config.requirements) && attempts < maxAttempts);
    
    secrets[key] = secret;
    validationResults[key] = validateSecretStrength(secret, config.requirements);
    
    console.log(`✅ ${config.description}: ${secret.substring(0, 20)}...`);
  });
  
  // Generate environment file content
  const envContent = Object.entries(secrets)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  // Save to .env file
  const envPath = path.join(process.cwd(), '.env.secrets');
  fs.writeFileSync(envPath, envContent, 'utf8');
  
  // Generate validation report
  const validationReport = Object.entries(validationResults)
    .map(([key, isValid]) => `${isValid ? '✅' : '❌'} ${key}: ${isValid ? 'Valid' : 'Invalid'}`)
    .join('\n');
  
  console.log('\n📊 Secret Generation Summary:');
  console.log(`Total secrets generated: ${Object.keys(secrets).length}`);
  console.log(`Secrets file: ${envPath}`);
  
  console.log('\n🔍 Validation Report:');
  console.log(validationReport);
  
  console.log('\n⚠️  Security Recommendations:');
  console.log('• Store secrets in a secure password manager');
  console.log('• Never commit secrets to version control');
  console.log('• Rotate secrets every 90 days');
  console.log('• Use different secrets for different environments');
  console.log('• Consider using a secrets management service');
  
  return { secrets, validationResults };
}

function generateProductionSecrets() {
  console.log('🚀 Generating Production-Ready Secrets...\n');
  
  const productionSecrets = {
    // Database passwords (32+ characters)
    POSTGRES_PASSWORD: generateStrongSecret('POSTGRES_PASSWORD', { length: 32, requirements: ['uppercase', 'lowercase', 'numbers', 'special'] }),
    MONGO_ROOT_PASSWORD: generateStrongSecret('MONGO_ROOT_PASSWORD', { length: 32, requirements: ['uppercase', 'lowercase', 'numbers', 'special'] }),
    REDIS_PASSWORD: generateStrongSecret('REDIS_PASSWORD', { length: 32, requirements: ['uppercase', 'lowercase', 'numbers', 'special'] }),
    
    // JWT secrets (64+ characters)
    JWT_SECRET: generateStrongSecret('JWT_SECRET', { length: 64, requirements: ['uppercase', 'lowercase', 'numbers', 'special'] }),
    JWT_REFRESH_SECRET: generateStrongSecret('JWT_REFRESH_SECRET', { length: 64, requirements: ['uppercase', 'lowercase', 'numbers', 'special'] }),
    JWT_RESET_SECRET: generateStrongSecret('JWT_RESET_SECRET', { length: 64, requirements: ['uppercase', 'lowercase', 'numbers', 'special'] }),
    
    // Security keys
    SESSION_SECRET: generateStrongSecret('SESSION_SECRET', { length: 48, requirements: ['uppercase', 'lowercase', 'numbers', 'special'] }),
    COOKIE_SECRET: generateStrongSecret('COOKIE_SECRET', { length: 48, requirements: ['uppercase', 'lowercase', 'numbers', 'special'] }),
    ENCRYPTION_KEY: generateStrongSecret('ENCRYPTION_KEY', { length: 32, requirements: ['base64'] }),
    
    // External service keys (placeholder format)
    STRIPE_SECRET_KEY: 'sk_live_' + crypto.randomBytes(24).toString('hex'),
    STRIPE_WEBHOOK_SECRET: 'whsec_' + crypto.randomBytes(32).toString('hex'),
    PAYPAL_CLIENT_ID: crypto.randomBytes(16).toString('hex'),
    PAYPAL_CLIENT_SECRET: crypto.randomBytes(32).toString('hex')
  };
  
  // Generate production .env file
  const envContent = Object.entries(productionSecrets)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  const envPath = path.join(process.cwd(), '.env.production');
  fs.writeFileSync(envPath, envContent, 'utf8');
  
  console.log('✅ Production secrets generated successfully!');
  console.log(`📁 File: ${envPath}`);
  
  return productionSecrets;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--production')) {
    generateProductionSecrets();
  } else {
    generateAllSecrets();
  }
}

module.exports = { generateStrongSecret, generateAllSecrets, generateProductionSecrets };