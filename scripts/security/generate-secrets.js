#!/usr/bin/env node

/**
 * UltraMarket Security Secret Generator
 * Generates strong cryptographic secrets for JWT, encryption, and other security needs
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecretGenerator {
  constructor() {
    this.secrets = {};
  }

  /**
   * Generate a random string of specified length
   */
  generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a strong JWT secret
   */
  generateJWTSecret() {
    return crypto.randomBytes(64).toString('base64');
  }

  /**
   * Generate a strong encryption key
   */
  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate a strong password
   */
  generatePassword(length = 16) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  /**
   * Generate all required secrets
   */
  generateAllSecrets() {
    console.log('🔐 Generating UltraMarket Security Secrets...\n');

    // JWT Secrets
    this.secrets.JWT_SECRET = this.generateJWTSecret();
    this.secrets.JWT_REFRESH_SECRET = this.generateJWTSecret();

    // Encryption Keys
    this.secrets.ENCRYPTION_KEY = this.generateEncryptionKey();

    // Database Passwords
    this.secrets.POSTGRES_PASSWORD = this.generatePassword(20);
    this.secrets.MONGODB_PASSWORD = this.generatePassword(20);
    this.secrets.REDIS_PASSWORD = this.generatePassword(20);

    // External Service Passwords
    this.secrets.SMTP_PASSWORD = this.generatePassword(16);
    this.secrets.ESKIZ_PASSWORD = this.generatePassword(16);
    this.secrets.PLAYMOBILE_PASSWORD = this.generatePassword(16);

    // Payment Gateway Secrets
    this.secrets.CLICK_SECRET_KEY = this.generateRandomString(32);
    this.secrets.PAYME_SECRET_KEY = this.generateRandomString(32);
    this.secrets.UZCARD_SECRET_KEY = this.generateRandomString(32);

    // API Keys
    this.secrets.CURRENCY_API_KEY = this.generateRandomString(32);
    this.secrets.GOOGLE_CLIENT_SECRET = this.generateRandomString(32);
    this.secrets.GOOGLE_MAPS_API_KEY = this.generateRandomString(32);

    // Session and Cookie Secrets
    this.secrets.SESSION_SECRET = this.generateJWTSecret();
    this.secrets.COOKIE_SECRET = this.generateJWTSecret();

    console.log('✅ All secrets generated successfully!\n');
  }

  /**
   * Display secrets in a formatted way
   */
  displaySecrets() {
    console.log('📋 Generated Secrets:\n');

    const categories = {
      'JWT Configuration': ['JWT_SECRET', 'JWT_REFRESH_SECRET'],
      'Encryption': ['ENCRYPTION_KEY'],
      'Database Passwords': ['POSTGRES_PASSWORD', 'MONGODB_PASSWORD', 'REDIS_PASSWORD'],
      'External Services': ['SMTP_PASSWORD', 'ESKIZ_PASSWORD', 'PLAYMOBILE_PASSWORD'],
      'Payment Gateways': ['CLICK_SECRET_KEY', 'PAYME_SECRET_KEY', 'UZCARD_SECRET_KEY'],
      'API Keys': ['CURRENCY_API_KEY', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_MAPS_API_KEY'],
      'Session Security': ['SESSION_SECRET', 'COOKIE_SECRET'],
    };

    Object.entries(categories).forEach(([category, keys]) => {
      console.log(`🔹 ${category}:`);
      keys.forEach(key => {
        const value = this.secrets[key];
        const truncated = value.length > 20 ? value.substring(0, 20) + '...' : value;
        console.log(`   ${key}=${truncated}`);
      });
      console.log('');
    });
  }

  /**
   * Save secrets to environment file
   */
  saveToEnvFile(filename = 'secrets.env') {
    const envContent = Object.entries(this.secrets)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const filePath = path.join(process.cwd(), filename);
    fs.writeFileSync(filePath, envContent);

    console.log(`💾 Secrets saved to: ${filePath}`);
    console.log('⚠️  IMPORTANT: Keep this file secure and never commit it to version control!');
  }

  /**
   * Generate .env.example with placeholder values
   */
  generateEnvExample() {
    const exampleContent = Object.entries(this.secrets)
      .map(([key, value]) => {
        const placeholder = key.includes('PASSWORD') || key.includes('SECRET') || key.includes('KEY') 
          ? 'your_secure_' + key.toLowerCase()
          : 'your_' + key.toLowerCase();
        return `${key}=${placeholder}`;
      })
      .join('\n');

    const filePath = path.join(process.cwd(), 'secrets.example.env');
    fs.writeFileSync(filePath, exampleContent);

    console.log(`📝 Example file generated: ${filePath}`);
  }

  /**
   * Validate secrets strength
   */
  validateSecrets() {
    console.log('🔍 Validating secret strength...\n');

    const issues = [];

    // Check JWT secrets
    if (this.secrets.JWT_SECRET.length < 64) {
      issues.push('JWT_SECRET should be at least 64 characters long');
    }

    if (this.secrets.JWT_REFRESH_SECRET.length < 64) {
      issues.push('JWT_REFRESH_SECRET should be at least 64 characters long');
    }

    // Check encryption key
    if (this.secrets.ENCRYPTION_KEY.length !== 64) {
      issues.push('ENCRYPTION_KEY should be exactly 64 characters (32 bytes)');
    }

    // Check passwords
    const passwordKeys = ['POSTGRES_PASSWORD', 'MONGODB_PASSWORD', 'REDIS_PASSWORD'];
    passwordKeys.forEach(key => {
      if (this.secrets[key].length < 12) {
        issues.push(`${key} should be at least 12 characters long`);
      }
    });

    if (issues.length > 0) {
      console.log('❌ Secret validation failed:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      return false;
    }

    console.log('✅ All secrets meet security requirements!');
    return true;
  }

  /**
   * Generate security recommendations
   */
  generateSecurityRecommendations() {
    console.log('\n🔒 Security Recommendations:\n');

    const recommendations = [
      'Store secrets in environment variables, never in code',
      'Use different secrets for each environment (dev, staging, prod)',
      'Rotate secrets regularly (every 90 days)',
      'Use a secrets management service in production',
      'Enable audit logging for secret access',
      'Use HTTPS for all API communications',
      'Implement rate limiting on authentication endpoints',
      'Enable MFA for admin accounts',
      'Regular security audits and penetration testing',
      'Keep all dependencies updated',
    ];

    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }

  /**
   * Run the complete secret generation process
   */
  run() {
    try {
      this.generateAllSecrets();
      this.displaySecrets();
      
      if (this.validateSecrets()) {
        this.saveToEnvFile();
        this.generateEnvExample();
        this.generateSecurityRecommendations();
        
        console.log('\n🎉 Secret generation completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Copy secrets.env to your environment');
        console.log('2. Update your .env files with the generated secrets');
        console.log('3. Restart your services');
        console.log('4. Test authentication and encryption');
      } else {
        console.log('\n❌ Secret generation failed validation');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error generating secrets:', error.message);
      process.exit(1);
    }
  }
}

// Run the generator if this script is executed directly
if (require.main === module) {
  const generator = new SecretGenerator();
  generator.run();
}

module.exports = SecretGenerator;