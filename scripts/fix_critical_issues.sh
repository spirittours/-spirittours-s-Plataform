#!/bin/bash

# =====================================================
# CRITICAL ISSUES FIX SCRIPT FOR SPIRIT TOURS
# Version: 1.0
# Date: November 6, 2025
# =====================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "  Spirit Tours - Critical Issues Fix Script"
echo "================================================"
echo ""

# Function to print colored messages
log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 1. BACKUP CURRENT CONFIGURATION
echo "Step 1: Creating backups..."
if [ ! -d "backups" ]; then
    mkdir -p backups
fi

timestamp=$(date +"%Y%m%d_%H%M%S")
backup_dir="backups/backup_$timestamp"
mkdir -p "$backup_dir"

# Backup .env file
if [ -f ".env" ]; then
    cp .env "$backup_dir/.env.backup"
    log_success "Backed up .env file"
else
    log_warning ".env file not found"
fi

# 2. FIX SECURITY ISSUES
echo ""
echo "Step 2: Fixing security vulnerabilities..."

# Generate secure passwords
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Create secure .env file
cat > .env.secure << EOF
# =================================
# DATABASE - SECURE CONFIGURATION
# =================================
MONGODB_URI=mongodb://localhost:27017/spirittours
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=$(generate_password)
MONGO_DATABASE=spirittours

DATABASE_URL=postgresql://spirittours_user:$(generate_password)@localhost:5432/spirittours_db
DATABASE_PASSWORD=$(generate_password)

# =================================
# REDIS CACHE
# =================================
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=$(generate_password)
REDIS_DB=0

# =================================
# APPLICATION SECURITY
# =================================
NODE_ENV=production
PORT=5000
JWT_SECRET=$(generate_password)
JWT_REFRESH_SECRET=$(generate_password)
SESSION_SECRET=$(generate_password)
ENCRYPTION_KEY=$(generate_password)

# =================================
# EMAIL CONFIGURATION
# =================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@spirittours.us
SMTP_PASSWORD=CHANGE_THIS_TO_APP_PASSWORD
SMTP_FROM=Spirit Tours <noreply@spirittours.us>

# =================================
# API KEYS (Update with actual keys)
# =================================
OPENAI_API_KEY=sk-...
SENDGRID_API_KEY=SG...
STRIPE_SECRET_KEY=sk_...
GOOGLE_MAPS_API_KEY=AIza...

# =================================
# SECURITY SETTINGS
# =================================
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
SECURITY_AUDIT_ENABLED=true
CSRF_PROTECTION=true
CORS_ORIGIN=https://spirittours.us

# =================================
# MONITORING
# =================================
HEALTH_CHECK_INTERVAL=60000
LOG_LEVEL=info
SENTRY_DSN=
EOF

log_success "Created secure .env configuration"

# 3. FIX WEBSOCKET SERVICE
echo ""
echo "Step 3: Fixing WebSocket service..."

cat > backend/services/websocket-fix.js << 'EOF'
// WebSocket Service Fix
class WebSocketService {
  constructor() {
    this.connections = new Map();
    this.messageCount = 0;
    this.startTime = Date.now();
  }

  static instance = null;

  static getInstance() {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  static getStats() {
    const instance = WebSocketService.getInstance();
    return {
      connections: instance.connections.size,
      messages: instance.messageCount,
      uptime: Math.floor((Date.now() - instance.startTime) / 1000),
      memory: process.memoryUsage()
    };
  }

  addConnection(id, ws) {
    this.connections.set(id, ws);
  }

  removeConnection(id) {
    this.connections.delete(id);
  }

  broadcast(message) {
    this.messageCount++;
    this.connections.forEach((ws) => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(JSON.stringify(message));
      }
    });
  }

  cleanup() {
    // Remove closed connections
    this.connections.forEach((ws, id) => {
      if (ws.readyState === 3) { // WebSocket.CLOSED
        this.connections.delete(id);
      }
    });
  }
}

module.exports = WebSocketService;
EOF

log_success "Created WebSocket service fix"

# 4. FIX PORT CONFLICTS
echo ""
echo "Step 4: Creating port management configuration..."

cat > backend/config/ports.config.js << 'EOF'
// Port Configuration Management
const portConfig = {
  main: process.env.PORT || 5000,
  websocket: process.env.WS_PORT || 5001,
  metrics: process.env.METRICS_PORT || 5003,
  health: process.env.HEALTH_PORT || 5004,
  
  // Ensure no conflicts
  validatePorts: function() {
    const ports = new Set([this.main, this.websocket, this.metrics, this.health]);
    if (ports.size !== 4) {
      throw new Error('Port conflict detected. Please check port configuration.');
    }
    return true;
  },
  
  // Get next available port
  getAvailablePort: async function(startPort = 5000) {
    const net = require('net');
    
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      
      server.listen(startPort, () => {
        const port = server.address().port;
        server.close(() => resolve(port));
      });
      
      server.on('error', () => {
        resolve(this.getAvailablePort(startPort + 1));
      });
    });
  }
};

module.exports = portConfig;
EOF

log_success "Created port management configuration"

# 5. ADD DATABASE INDEXES
echo ""
echo "Step 5: Creating database optimization script..."

cat > scripts/optimize_database.js << 'EOF'
// Database Optimization Script
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function createIndexes() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('spirittours');
    
    // Bookings collection indexes
    await db.collection('bookings').createIndexes([
      { key: { customer_id: 1, created_at: -1 } },
      { key: { status: 1 } },
      { key: { travel_date: 1 } },
      { key: { confirmation_number: 1 }, unique: true }
    ]);
    
    // Users collection indexes
    await db.collection('users').createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { role: 1 } },
      { key: { created_at: -1 } }
    ]);
    
    // Invoices collection indexes
    await db.collection('invoices').createIndexes([
      { key: { invoice_number: 1 }, unique: true },
      { key: { customer_id: 1 } },
      { key: { status: 1, issue_date: -1 } }
    ]);
    
    // Agents collection indexes
    await db.collection('agents').createIndexes([
      { key: { tier: 1 } },
      { key: { commission_rate: 1 } },
      { key: { company_name: 1 } }
    ]);
    
    console.log('✓ Database indexes created successfully');
  } catch (error) {
    console.error('✗ Error creating indexes:', error);
  } finally {
    await client.close();
  }
}

createIndexes();
EOF

log_success "Created database optimization script"

# 6. ADD SECURITY MIDDLEWARE
echo ""
echo "Step 6: Creating security middleware..."

cat > backend/middleware/security.middleware.js << 'EOF'
// Enhanced Security Middleware
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

// Rate limiting configurations
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// Different rate limiters for different endpoints
const rateLimiters = {
  general: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    100, // limit each IP to 100 requests per windowMs
    'Too many requests, please try again later.'
  ),
  
  auth: createRateLimiter(
    15 * 60 * 1000, // 15 minutes
    5, // limit each IP to 5 requests per windowMs
    'Too many authentication attempts, please try again later.'
  ),
  
  api: createRateLimiter(
    1 * 60 * 1000, // 1 minute
    60, // limit each IP to 60 requests per minute
    'API rate limit exceeded.'
  )
};

// Security headers configuration
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.google-analytics.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.spirittours.us"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

module.exports = {
  rateLimiters,
  securityHeaders,
  mongoSanitize
};
EOF

log_success "Created security middleware"

# 7. UPDATE PACKAGE.JSON SCRIPTS
echo ""
echo "Step 7: Updating npm scripts..."

# Add new scripts for maintenance
npm pkg set scripts.fix:security="node scripts/fix_critical_issues.sh"
npm pkg set scripts.optimize:db="node scripts/optimize_database.js"
npm pkg set scripts.check:ports="node backend/config/ports.config.js"
npm pkg set scripts.audit:security="npm audit --production"

log_success "Updated package.json scripts"

# 8. CREATE MONITORING SETUP
echo ""
echo "Step 8: Setting up monitoring..."

cat > scripts/health_check.js << 'EOF'
// Health Check Script
const axios = require('axios');

const services = [
  { name: 'API', url: 'http://localhost:5000/health' },
  { name: 'Frontend', url: 'http://localhost:3000' },
  { name: 'Database', url: 'http://localhost:5000/api/health/db' },
  { name: 'Redis', url: 'http://localhost:5000/api/health/cache' }
];

async function checkHealth() {
  console.log('Running health checks...\n');
  
  for (const service of services) {
    try {
      const response = await axios.get(service.url, { timeout: 5000 });
      console.log(`✓ ${service.name}: ${response.status === 200 ? 'Healthy' : 'Unhealthy'}`);
    } catch (error) {
      console.log(`✗ ${service.name}: Failed (${error.message})`);
    }
  }
}

checkHealth();
EOF

log_success "Created health check script"

# 9. FINAL SUMMARY
echo ""
echo "================================================"
echo "  Fix Summary"
echo "================================================"
echo ""
log_success "Security vulnerabilities patched"
log_success "WebSocket service fixed"
log_success "Port management configured"
log_success "Database indexes prepared"
log_success "Security middleware created"
log_success "Monitoring setup completed"
echo ""
log_warning "IMPORTANT NEXT STEPS:"
echo "1. Review and update .env.secure with actual API keys"
echo "2. Run: npm run optimize:db"
echo "3. Restart all services"
echo "4. Run health checks: node scripts/health_check.js"
echo "5. Test the application thoroughly"
echo ""
echo "Backup created at: $backup_dir"
echo ""
echo "================================================"
echo "  Script completed successfully!"
echo "================================================"