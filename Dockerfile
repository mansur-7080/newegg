# Multi-stage Docker build for UltraMarket Backend
FROM node:18-alpine AS builder

# Metadata
LABEL maintainer="UltraMarket Team <dev@ultramarket.uz>"
LABEL description="UltraMarket Backend - Professional E-commerce Platform"
LABEL version="1.0.0"

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    curl \
    wget \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S ultramarket -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=ultramarket:nodejs /app/dist ./dist
COPY --from=builder --chown=ultramarket:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=ultramarket:nodejs /app/package*.json ./

# Copy configuration files
COPY --chown=ultramarket:nodejs config/ ./config/
COPY --chown=ultramarket:nodejs scripts/ ./scripts/

# Create logs directory
RUN mkdir -p logs && chown -R ultramarket:nodejs logs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=Asia/Tashkent

# Switch to non-root user
USER ultramarket

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"] 