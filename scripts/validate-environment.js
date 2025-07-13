#!/usr/bin/env node

/**
 * UltraMarket Environment Validation Script
 * Validates all required environment variables and their security
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.requiredVars = [
      'NODE_ENV',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'POSTGRES_HOST',
      'POSTGRES_PORT',
      'POSTGRES_DB',
      'POSTGRES_USER',
      'POSTGRES_PASSWORD',
      'MONGODB_URI',
      'REDIS_HOST',
      'REDIS_PORT',
      'ELASTICSEARCH_URL'
    ];
    
    this.productionRequiredVars = [
      'CLICK_SECRET_KEY',
      'PAYME_SECRET_KEY',
      'ESKIZ_API_KEY',
      'SENTRY_DSN',
      'SMTP_HOST',
      'SMTP_USER',
      'SMTP_PASSWORD'
    ];
    
    this.weakSecrets = [
      'default-jwt-secret-key',
      'your_jwt_secret',
      'default_secret_key_for_development',
      'test-jwt-secret',
      'password123',
      'secret123',
      'ultramarket123'
    ];
  }

  validateEnvironment() {
    console.log('🔍 Starting environment validation...\n');

    this.checkRequiredVariables();
    this.validateSecuritySettings();
    this.checkSecretStrength();
    this.validateDatabaseConnections();
    this.checkProductionSettings();
    
    this.printResults();
    
    if (this.errors.length > 0) {
      process.exit(1);
    }
  }

  checkRequiredVariables() {
    console.log('📋 Checking required environment variables...');
    
    this.requiredVars.forEach(varName => {
      const value = process.env[varName];
      
      if (!value) {
        this.errors.push(`Missing required environment variable: ${varName}`);
      } else if (value.trim() === '') {
        this.errors.push(`Environment variable ${varName} is empty`);
      } else {
        console.log(`  ✅ ${varName}: Set`);
      }
    });

    // Check production-specific variables
    if (process.env.NODE_ENV === 'production') {
      this.productionRequiredVars.forEach(varName => {
        const value = process.env[varName];
        
        if (!value) {
          this.errors.push(`Missing production environment variable: ${varName}`);
        } else {
          console.log(`  ✅ ${varName}: Set (production)`);
        }
      });
    }
  }

  validateSecuritySettings() {
    console.log('\n🔐 Validating security settings...');
    
    // JWT Secret validation
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
      if (jwtSecret.length < 32) {
        this.errors.push('JWT_SECRET must be at least 32 characters long');
      } else if (this.weakSecrets.includes(jwtSecret.toLowerCase())) {
        this.errors.push('JWT_SECRET uses a weak/default value');
      } else {
        console.log('  ✅ JWT_SECRET: Strong');
      }
    }

    // Refresh token secret validation
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (refreshSecret) {
      if (refreshSecret.length < 32) {
        this.errors.push('JWT_REFRESH_SECRET must be at least 32 characters long');
      } else if (refreshSecret === jwtSecret) {
        this.errors.push('JWT_REFRESH_SECRET must be different from JWT_SECRET');
      } else {
        console.log('  ✅ JWT_REFRESH_SECRET: Strong');
      }
    }

    // Database password validation
    const dbPassword = process.env.POSTGRES_PASSWORD;
    if (dbPassword && dbPassword.length < 12) {
      this.warnings.push('Database password should be at least 12 characters long');
    }

    // Redis password validation
    const redisPassword = process.env.REDIS_PASSWORD;
    if (!redisPassword && process.env.NODE_ENV === 'production') {
      this.warnings.push('Redis password not set for production environment');
    }
  }

  checkSecretStrength() {
    console.log('\n🛡️ Checking secret strength...');
    
    const secrets = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'CLICK_SECRET_KEY',
      'PAYME_SECRET_KEY',
      'SESSION_SECRET'
    ];

    secrets.forEach(secretName => {
      const secret = process.env[secretName];
      if (secret) {
        const entropy = this.calculateEntropy(secret);
        
        if (entropy < 3.5) {
          this.warnings.push(`${secretName} has low entropy (${entropy.toFixed(2)})`);
        } else {
          console.log(`  ✅ ${secretName}: Good entropy (${entropy.toFixed(2)})`);
        }
      }
    });
  }

  calculateEntropy(str) {
    const freq = {};
    for (let char of str) {
      freq[char] = (freq[char] || 0) + 1;
    }
    
    let entropy = 0;
    const len = str.length;
    
    for (let count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    
    return entropy;
  }

  validateDatabaseConnections() {
    console.log('\n🗄️ Validating database configurations...');
    
    // PostgreSQL validation
    const pgHost = process.env.POSTGRES_HOST;
    const pgPort = process.env.POSTGRES_PORT;
    
    if (pgPort && (isNaN(pgPort) || pgPort < 1 || pgPort > 65535)) {
      this.errors.push('POSTGRES_PORT must be a valid port number (1-65535)');
    } else {
      console.log('  ✅ PostgreSQL: Configuration valid');
    }

    // MongoDB validation
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri && !mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      this.errors.push('MONGODB_URI must be a valid MongoDB connection string');
    } else {
      console.log('  ✅ MongoDB: Configuration valid');
    }

    // Redis validation
    const redisPort = process.env.REDIS_PORT;
    if (redisPort && (isNaN(redisPort) || redisPort < 1 || redisPort > 65535)) {
      this.errors.push('REDIS_PORT must be a valid port number (1-65535)');
    } else {
      console.log('  ✅ Redis: Configuration valid');
    }
  }

  checkProductionSettings() {
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    console.log('\n🚀 Checking production-specific settings...');

    // Check for development/test values in production
    const dangerousValues = [
      'localhost',
      '127.0.0.1',
      'test',
      'development',
      'dev',
      'debug'
    ];

    const criticalVars = [
      'POSTGRES_HOST',
      'MONGODB_URI',
      'REDIS_HOST',
      'ELASTICSEARCH_URL'
    ];

    criticalVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        const lowerValue = value.toLowerCase();
        const hasDangerousValue = dangerousValues.some(dangerous => 
          lowerValue.includes(dangerous)
        );
        
        if (hasDangerousValue) {
          this.warnings.push(`${varName} contains development values in production: ${value}`);
        }
      }
    });

    // Check SSL/TLS settings
    if (!process.env.DATABASE_SSL || process.env.DATABASE_SSL !== 'true') {
      this.warnings.push('Database SSL should be enabled in production');
    }

    console.log('  ✅ Production settings validated');
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ENVIRONMENT VALIDATION RESULTS');
    console.log('='.repeat(60));

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('🎉 All environment variables are properly configured!');
    } else {
      if (this.errors.length > 0) {
        console.log('\n❌ ERRORS:');
        this.errors.forEach(error => console.log(`  • ${error}`));
      }

      if (this.warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        this.warnings.forEach(warning => console.log(`  • ${warning}`));
      }
    }

    console.log('\n📈 SUMMARY:');
    console.log(`  Total variables checked: ${this.requiredVars.length}`);
    console.log(`  Errors: ${this.errors.length}`);
    console.log(`  Warnings: ${this.warnings.length}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  }
}

// Run validation
const validator = new EnvironmentValidator();
validator.validateEnvironment();