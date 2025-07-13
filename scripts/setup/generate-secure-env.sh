#!/bin/bash

# Generate secure environment variables for UltraMarket

echo "🔐 Generating secure environment variables..."

# Function to generate secure random strings
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

generate_secret() {
    openssl rand -base64 64 | tr -d "=+/" | cut -c1-50
}

# Create .env file if it doesn't exist
ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
    echo "⚠️  .env file already exists. Creating .env.new instead..."
    ENV_FILE=".env.new"
fi

# Generate secure values
cat > "$ENV_FILE" << EOF
# Generated secure environment variables
# Created: $(date)

# Database Passwords
POSTGRES_PASSWORD=$(generate_password)
MONGODB_PASSWORD=$(generate_password)
REDIS_PASSWORD=$(generate_password)
ANALYTICS_READER_PASSWORD=$(generate_password)

# JWT Secrets
JWT_SECRET=$(generate_secret)
JWT_REFRESH_SECRET=$(generate_secret)

# Encryption Keys
ENCRYPTION_KEY=$(openssl rand -hex 32)
SESSION_SECRET=$(generate_secret)

# Service API Keys
ESKIZ_PASSWORD=$(generate_password)
PLAYMOBILE_PASSWORD=$(generate_password)
CLICK_SECRET_KEY=$(generate_secret)
PAYME_SECRET_KEY=$(generate_secret)
UZCARD_SECRET_KEY=$(generate_secret)

# External API Keys (need to be filled manually)
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
FACEBOOK_APP_SECRET=YOUR_FACEBOOK_APP_SECRET
CURRENCY_API_KEY=YOUR_CURRENCY_API_KEY

# SMTP Password (need to be filled manually)
SMTP_PASSWORD=YOUR_SMTP_APP_PASSWORD
EOF

echo "✅ Secure environment variables generated in $ENV_FILE"
echo ""
echo "⚠️  IMPORTANT:"
echo "1. Review and update the generated values if needed"
echo "2. Replace placeholder values for external services"
echo "3. Keep this file secure and never commit to version control"
echo "4. Use different values for production environment"