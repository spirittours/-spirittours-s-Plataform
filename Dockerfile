# 🚀 Multi-Stage Enterprise Dockerfile
# AI Multi-Model Management System - Fase 2 Extended
# Optimized for production deployment with security and performance

# =====================================
# 📦 Stage 1: Dependencies Builder
# =====================================
FROM node:20-alpine AS deps-builder
LABEL stage=deps-builder
LABEL maintainer="GenSpark AI Team"
LABEL version="2.0.0"
LABEL description="AI Multi-Model Management System - Enterprise Edition"

# Set working directory
WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY sdk/javascript/package*.json ./sdk/javascript/

# Install dependencies with npm ci for faster, reliable, reproducible builds
RUN npm ci --only=production && npm cache clean --force
RUN cd frontend && npm ci --only=production && npm cache clean --force
RUN cd sdk/javascript && npm ci --only=production && npm cache clean --force

# =====================================
# 📦 Stage 2: Frontend Builder
# =====================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy dependencies from deps-builder
COPY --from=deps-builder /app/node_modules ./node_modules
COPY --from=deps-builder /app/frontend/node_modules ./frontend/node_modules

# Copy frontend source
COPY frontend/ ./frontend/
COPY package*.json ./

# Build frontend for production
RUN cd frontend && npm run build

# =====================================
# 📦 Stage 3: SDK Builder
# =====================================
FROM node:20-alpine AS sdk-builder
WORKDIR /app

# Copy dependencies from deps-builder
COPY --from=deps-builder /app/sdk/javascript/node_modules ./sdk/javascript/node_modules

# Copy SDK source
COPY sdk/ ./sdk/
COPY package*.json ./

# Build SDK packages
RUN cd sdk/javascript && npm run build

# Install Python and build Python SDK
RUN apk add --no-cache python3 python3-dev py3-pip py3-wheel
RUN cd sdk/python && pip3 install build && python3 -m build

# =====================================
# 🚀 Stage 4: Production Runtime
# =====================================
FROM node:20-alpine AS production

# Set labels for enterprise tracking
LABEL maintainer="GenSpark AI Team <ai-team@genspark.ai>"
LABEL version="2.0.0"
LABEL description="AI Multi-Model Management System - Phase 2 Extended"
LABEL vendor="GenSpark AI Solutions"
LABEL build-date="2024"
LABEL vcs-ref=$VCS_REF
LABEL schema-version="1.0"

# Install production system dependencies
RUN apk add --no-cache \
    curl \
    wget \
    ca-certificates \
    tzdata \
    dumb-init \
    python3 \
    py3-pip \
    redis \
    postgresql-client \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S aiapp && \
    adduser -S aiapp -u 1001 -G aiapp

# Set working directory
WORKDIR /app

# Copy production dependencies
COPY --from=deps-builder --chown=aiapp:aiapp /app/node_modules ./node_modules

# Copy built frontend
COPY --from=frontend-builder --chown=aiapp:aiapp /app/frontend/dist ./frontend/dist
COPY --from=frontend-builder --chown=aiapp:aiapp /app/frontend/public ./frontend/public

# Copy built SDK
COPY --from=sdk-builder --chown=aiapp:aiapp /app/sdk ./sdk

# Copy backend application code
COPY --chown=aiapp:aiapp backend/ ./backend/
COPY --chown=aiapp:aiapp config/ ./config/
COPY --chown=aiapp:aiapp docs/ ./docs/
COPY --chown=aiapp:aiapp scripts/ ./scripts/

# Copy configuration files
COPY --chown=aiapp:aiapp package*.json ./
COPY --chown=aiapp:aiapp ecosystem.config.js ./
COPY --chown=aiapp:aiapp requirements.txt ./

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/uploads /app/temp /app/backups && \
    chown -R aiapp:aiapp /app/logs /app/uploads /app/temp /app/backups

# Copy startup scripts
COPY --chown=aiapp:aiapp start_platform.py ./
COPY --chown=aiapp:aiapp start_enterprise_crm.py ./

# Make scripts executable
RUN chmod +x start_platform.py start_enterprise_crm.py

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV API_PORT=3001
ENV REDIS_URL=redis://redis:6379
ENV LOG_LEVEL=info
ENV ENABLE_CLUSTERING=true
ENV MAX_WORKERS=4

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Switch to non-root user
USER aiapp

# Expose ports
EXPOSE 3000 3001 3002

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default startup command
CMD ["node", "backend/server.js"]

# =====================================
# 🔧 Alternative Commands (via docker run -e)
# =====================================
# Production server: CMD ["npm", "run", "start:prod"]
# Development mode: CMD ["npm", "run", "start:dev"] 
# Cluster mode: CMD ["npm", "run", "start:cluster"]
# Worker mode: CMD ["npm", "run", "start:worker"]
# Migration: CMD ["npm", "run", "migrate"]