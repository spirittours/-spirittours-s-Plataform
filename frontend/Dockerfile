# ============================================
# Spirit Tours Frontend - Docker Configuration
# ============================================
# Multi-stage build for optimized production image
# ============================================

# ============================================
# Stage 1: Build
# ============================================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY . .

# Build arguments
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_ENVIRONMENT=production

# Set environment variables
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_ENVIRONMENT=$VITE_ENVIRONMENT

# Build application
RUN npm run build

# ============================================
# Stage 2: Production with Nginx
# ============================================
FROM nginx:alpine AS production

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:80/ || exit 1

# Expose port
EXPOSE 80

# Add labels
LABEL maintainer="Spirit Tours Team"
LABEL description="Spirit Tours CRM Frontend"
LABEL version="2.0.0"

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
