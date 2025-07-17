# Production Dockerfile for UltraMarket Product Service
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconfig \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    dumb-init

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
FROM base AS dependencies
RUN npm ci --only=production && npm cache clean --force

# Development dependencies for building
FROM base AS build-deps
RUN npm ci

# Copy source code
COPY . .

# Build the application
FROM build-deps AS build
RUN npm run build

# Production image
FROM base AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S ultramarket -u 1001

# Copy production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy built application
COPY --from=build /app/dist ./dist

# Copy shared library
COPY --from=build /app/libs/shared ./libs/shared

# Copy package.json for version info
COPY package.json ./

# Create necessary directories and set permissions
RUN mkdir -p logs uploads temp && \
    chown -R ultramarket:nodejs /app

# Switch to non-root user
USER ultramarket

# Set environment variables
ENV NODE_ENV=production \
    PORT=3003 \
    NODE_OPTIONS="--max-old-space-size=512"

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3003/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]