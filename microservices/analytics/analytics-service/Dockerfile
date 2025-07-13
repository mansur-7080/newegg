# UltraMarket Analytics Service - Production Dockerfile
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY prisma/ ./prisma/

# Generate Prisma client if schema exists
RUN if [ -f "prisma/schema.prisma" ]; then npx prisma generate; fi

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S analytics-service -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=analytics-service:nodejs /app/dist ./dist
COPY --from=builder --chown=analytics-service:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=analytics-service:nodejs /app/package*.json ./

# Copy Prisma files if they exist
COPY --from=builder --chown=analytics-service:nodejs /app/prisma ./prisma 2>/dev/null || true

# Create logs directory
RUN mkdir -p logs && chown analytics-service:nodejs logs

# Switch to non-root user
USER analytics-service

# Expose port
EXPOSE 3020

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3020/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]