#!/usr/bin/env ts-node

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

interface Secrets {
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  SESSION_SECRET: string;
  COOKIE_SECRET: string;
  POSTGRES_PASSWORD: string;
  REDIS_PASSWORD: string;
  MONGODB_PASSWORD: string;
  MINIO_ROOT_USER: string;
  MINIO_ROOT_PASSWORD: string;
}

/**
 * Generate a cryptographically secure random string
 */
function generateSecret(length: number = 64): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure password with special characters
 */
function generatePassword(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}

/**
 * Generate username with random suffix
 */
function generateUsername(prefix: string): string {
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${randomSuffix}`;
}

/**
 * Generate all production secrets
 */
function generateSecrets(): Secrets {
  console.log('🔐 Generating production secrets...\n');
  
  const secrets: Secrets = {
    JWT_SECRET: generateSecret(64),
    JWT_REFRESH_SECRET: generateSecret(64),
    SESSION_SECRET: generateSecret(48),
    COOKIE_SECRET: generateSecret(48),
    POSTGRES_PASSWORD: generatePassword(32),
    REDIS_PASSWORD: generatePassword(24),
    MONGODB_PASSWORD: generatePassword(32),
    MINIO_ROOT_USER: generateUsername('ultramarket'),
    MINIO_ROOT_PASSWORD: generatePassword(24)
  };

  return secrets;
}

/**
 * Create environment file with secrets
 */
function createEnvFile(secrets: Secrets, outputPath: string): void {
  const envContent = `# ==============================================
# PRODUCTION SECRETS - GENERATED ON ${new Date().toISOString()}
# ==============================================
# 
# ⚠️  IMPORTANT: Keep these secrets secure!
# ⚠️  Never commit this file to version control
# ⚠️  Rotate these secrets regularly
# ⚠️  Use different secrets for each environment
# 
# ==============================================

# JWT Configuration
JWT_SECRET=${secrets.JWT_SECRET}
JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}

# Session Security
SESSION_SECRET=${secrets.SESSION_SECRET}
COOKIE_SECRET=${secrets.COOKIE_SECRET}

# Database Passwords
POSTGRES_PASSWORD=${secrets.POSTGRES_PASSWORD}
REDIS_PASSWORD=${secrets.REDIS_PASSWORD}
MONGODB_PASSWORD=${secrets.MONGODB_PASSWORD}

# Storage Configuration
MINIO_ROOT_USER=${secrets.MINIO_ROOT_USER}
MINIO_ROOT_PASSWORD=${secrets.MINIO_ROOT_PASSWORD}

# ==============================================
# Usage Instructions:
# ==============================================
# 
# 1. Copy these values to your production .env file
# 2. Or set them as environment variables in your deployment
# 3. Make sure to backup these secrets securely
# 4. Update your deployment configuration
# 
# Example for Docker Compose:
# export JWT_SECRET="${secrets.JWT_SECRET}"
# 
# Example for Kubernetes:
# kubectl create secret generic ultramarket-secrets \\
#   --from-literal=JWT_SECRET="${secrets.JWT_SECRET}" \\
#   --from-literal=POSTGRES_PASSWORD="${secrets.POSTGRES_PASSWORD}"
# 
# ==============================================
`;

  fs.writeFileSync(outputPath, envContent, { mode: 0o600 });
  console.log(`✅ Secrets written to: ${outputPath}`);
}

/**
 * Display secrets summary
 */
function displaySummary(secrets: Secrets): void {
  console.log('\n📋 Generated Secrets Summary:');
  console.log('================================');
  
  Object.entries(secrets).forEach(([key, value]) => {
    const maskedValue = value.substring(0, 8) + '...(' + value.length + ' chars)';
    console.log(`${key.padEnd(20)}: ${maskedValue}`);
  });
  
  console.log('\n🔒 Security Recommendations:');
  console.log('============================');
  console.log('✓ JWT secrets are 64+ characters long');
  console.log('✓ Passwords contain special characters');
  console.log('✓ All secrets are cryptographically random');
  console.log('✓ Secrets file has restricted permissions (600)');
  
  console.log('\n⚠️  Next Steps:');
  console.log('================');
  console.log('1. Copy secrets to your production environment');
  console.log('2. Delete this file after use (or store securely)');
  console.log('3. Set up secret rotation schedule');
  console.log('4. Configure monitoring for secret usage');
  console.log('5. Test your application with these secrets');
}

/**
 * Create Docker environment file
 */
function createDockerEnvFile(secrets: Secrets, outputPath: string): void {
  const dockerEnvContent = `# Docker Compose Production Secrets
# Generated on ${new Date().toISOString()}

POSTGRES_PASSWORD=${secrets.POSTGRES_PASSWORD}
REDIS_PASSWORD=${secrets.REDIS_PASSWORD}
MONGODB_PASSWORD=${secrets.MONGODB_PASSWORD}
MINIO_ROOT_USER=${secrets.MINIO_ROOT_USER}
MINIO_ROOT_PASSWORD=${secrets.MINIO_ROOT_PASSWORD}
JWT_SECRET=${secrets.JWT_SECRET}
JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}
SESSION_SECRET=${secrets.SESSION_SECRET}
COOKIE_SECRET=${secrets.COOKIE_SECRET}
`;

  fs.writeFileSync(outputPath, dockerEnvContent, { mode: 0o600 });
  console.log(`✅ Docker environment file written to: ${outputPath}`);
}

/**
 * Create Kubernetes secrets manifest
 */
function createKubernetesSecrets(secrets: Secrets, outputPath: string): void {
  const base64Encode = (str: string) => Buffer.from(str).toString('base64');
  
  const k8sManifest = `apiVersion: v1
kind: Secret
metadata:
  name: ultramarket-secrets
  namespace: default
  labels:
    app: ultramarket
    component: secrets
type: Opaque
data:
  JWT_SECRET: ${base64Encode(secrets.JWT_SECRET)}
  JWT_REFRESH_SECRET: ${base64Encode(secrets.JWT_REFRESH_SECRET)}
  SESSION_SECRET: ${base64Encode(secrets.SESSION_SECRET)}
  COOKIE_SECRET: ${base64Encode(secrets.COOKIE_SECRET)}
  POSTGRES_PASSWORD: ${base64Encode(secrets.POSTGRES_PASSWORD)}
  REDIS_PASSWORD: ${base64Encode(secrets.REDIS_PASSWORD)}
  MONGODB_PASSWORD: ${base64Encode(secrets.MONGODB_PASSWORD)}
  MINIO_ROOT_USER: ${base64Encode(secrets.MINIO_ROOT_USER)}
  MINIO_ROOT_PASSWORD: ${base64Encode(secrets.MINIO_ROOT_PASSWORD)}
---
# Apply with: kubectl apply -f ${path.basename(outputPath)}
# View with: kubectl get secret ultramarket-secrets -o yaml
`;

  fs.writeFileSync(outputPath, k8sManifest, { mode: 0o600 });
  console.log(`✅ Kubernetes secrets manifest written to: ${outputPath}`);
}

/**
 * Main function
 */
function main(): void {
  try {
    console.log('🚀 UltraMarket Production Secrets Generator');
    console.log('==========================================\n');

    // Create output directory
    const outputDir = path.join(process.cwd(), 'generated-secrets');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { mode: 0o700 });
    }

    // Generate secrets
    const secrets = generateSecrets();

    // Create different output formats
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    
    createEnvFile(secrets, path.join(outputDir, `production-secrets-${timestamp}.env`));
    createDockerEnvFile(secrets, path.join(outputDir, `docker-secrets-${timestamp}.env`));
    createKubernetesSecrets(secrets, path.join(outputDir, `k8s-secrets-${timestamp}.yaml`));

    // Display summary
    displaySummary(secrets);

    console.log(`\n📁 All files generated in: ${outputDir}`);
    console.log('\n🎉 Secret generation completed successfully!');

  } catch (error) {
    console.error('❌ Error generating secrets:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { generateSecrets, generateSecret, generatePassword };