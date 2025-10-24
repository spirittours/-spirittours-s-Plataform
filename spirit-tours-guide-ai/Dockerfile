# Spirit Tours AI Guide - Production Dockerfile
# Multi-stage build for optimized image size

# ==================== Stage 1: Build Frontend ====================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# ==================== Stage 2: Build Backend ====================
FROM node:18-alpine AS backend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy backend source
COPY backend/ ./backend/

# ==================== Stage 3: Production Image ====================
FROM node:18-alpine

# Install tini for proper init system
RUN apk add --no-cache tini

# Create app directory
WORKDIR /app

# Copy production dependencies from builder
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/backend ./backend
COPY --from=backend-builder /app/package*.json ./

# Copy built frontend from builder
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Create logs directory
RUN mkdir -p logs

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "backend/server.js"]
