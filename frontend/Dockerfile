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

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./

# Install ALL dependencies (not just production) for the build
RUN npm install --legacy-peer-deps && \
    npm cache clean --force

# Copy source code
COPY . .

# Build arguments for Create React App
ARG REACT_APP_API_URL
ARG REACT_APP_WS_URL
ARG REACT_APP_ENVIRONMENT=production

# Set environment variables for Create React App build
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_WS_URL=$REACT_APP_WS_URL
ENV REACT_APP_ENVIRONMENT=$REACT_APP_ENVIRONMENT

# Build application using react-scripts
RUN npm run build

# ============================================
# Stage 2: Production with Nginx
# ============================================
FROM nginx:alpine AS production

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy custom nginx configuration files
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
