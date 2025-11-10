#!/bin/bash

# ============================================================
# Spirit Tours - DigitalOcean CLI Deployment Script
# Deploy using DigitalOcean CLI (doctl)
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_NAME="spirit-tours"
REGION="nyc3"
DROPLET_SIZE="s-4vcpu-8gb"
DB_SIZE="db-s-2vcpu-4gb"
REDIS_SIZE="db-s-1vcpu-1gb"
IMAGE="ubuntu-22-04-x64"

echo -e "${BLUE}Spirit Tours - DigitalOcean CLI Deployment${NC}"
echo "============================================"

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo -e "${RED}Error: doctl CLI is not installed${NC}"
    echo "Please install it from: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

# Check authentication
echo -e "${BLUE}Checking DigitalOcean authentication...${NC}"
if ! doctl auth list &> /dev/null; then
    echo -e "${YELLOW}Please authenticate with DigitalOcean:${NC}"
    doctl auth init
fi

# Get user inputs
read -p "Enter environment (staging/production): " ENVIRONMENT
read -p "Enter your domain name (or press Enter to skip): " DOMAIN_NAME
read -p "Enter your email for notifications: " ADMIN_EMAIL

# Generate unique names
TIMESTAMP=$(date +%Y%m%d%H%M%S)
DROPLET_NAME="${PROJECT_NAME}-${ENVIRONMENT}-${TIMESTAMP}"
DB_NAME="${PROJECT_NAME}-db-${ENVIRONMENT}"
REDIS_NAME="${PROJECT_NAME}-redis-${ENVIRONMENT}"
VPC_NAME="${PROJECT_NAME}-vpc-${ENVIRONMENT}"

# Step 1: Create SSH Key if not exists
echo -e "${BLUE}Setting up SSH keys...${NC}"
SSH_KEY_NAME="${PROJECT_NAME}-key"
SSH_KEY_PATH="$HOME/.ssh/${SSH_KEY_NAME}"

if [ ! -f "$SSH_KEY_PATH" ]; then
    ssh-keygen -t rsa -b 4096 -f "$SSH_KEY_PATH" -N "" -C "$ADMIN_EMAIL"
    doctl compute ssh-key import "$SSH_KEY_NAME" --public-key-file "${SSH_KEY_PATH}.pub"
fi

SSH_KEY_ID=$(doctl compute ssh-key list --format ID,Name --no-header | grep "$SSH_KEY_NAME" | awk '{print $1}')

# Step 2: Create VPC
echo -e "${BLUE}Creating VPC...${NC}"
VPC_UUID=$(doctl vpcs create \
    --name "$VPC_NAME" \
    --region "$REGION" \
    --ip-range "10.10.10.0/24" \
    --format ID \
    --no-header 2>/dev/null || \
    doctl vpcs list --format ID,Name --no-header | grep "$VPC_NAME" | awk '{print $1}')

echo -e "${GREEN}VPC created: $VPC_UUID${NC}"

# Step 3: Create Droplet
echo -e "${BLUE}Creating Droplet...${NC}"
DROPLET_ID=$(doctl compute droplet create "$DROPLET_NAME" \
    --size "$DROPLET_SIZE" \
    --image "$IMAGE" \
    --region "$REGION" \
    --ssh-keys "$SSH_KEY_ID" \
    --vpc-uuid "$VPC_UUID" \
    --enable-monitoring \
    --enable-backups \
    --user-data-file cloud-init.yaml \
    --wait \
    --format ID \
    --no-header)

# Get Droplet IP
DROPLET_IP=$(doctl compute droplet get "$DROPLET_ID" --format PublicIPv4 --no-header)
echo -e "${GREEN}Droplet created: $DROPLET_IP${NC}"

# Step 4: Create PostgreSQL Database
echo -e "${BLUE}Creating PostgreSQL database...${NC}"
DB_ID=$(doctl databases create "$DB_NAME" \
    --engine pg \
    --version 15 \
    --size "$DB_SIZE" \
    --region "$REGION" \
    --num-nodes 1 \
    --private-network-uuid "$VPC_UUID" \
    --wait \
    --format ID \
    --no-header)

# Get database connection details
DB_HOST=$(doctl databases get "$DB_ID" --format Host --no-header)
DB_PORT=$(doctl databases get "$DB_ID" --format Port --no-header)
DB_USER=$(doctl databases get "$DB_ID" --format User --no-header)
DB_PASSWORD=$(doctl databases get "$DB_ID" --format Password --no-header)
DB_DATABASE=$(doctl databases get "$DB_ID" --format Database --no-header)

echo -e "${GREEN}Database created: $DB_HOST:$DB_PORT${NC}"

# Step 5: Create Redis Cache
echo -e "${BLUE}Creating Redis cache...${NC}"
REDIS_ID=$(doctl databases create "$REDIS_NAME" \
    --engine redis \
    --version 7 \
    --size "$REDIS_SIZE" \
    --region "$REGION" \
    --num-nodes 1 \
    --private-network-uuid "$VPC_UUID" \
    --eviction-policy allkeys-lru \
    --wait \
    --format ID \
    --no-header)

# Get Redis connection details
REDIS_HOST=$(doctl databases get "$REDIS_ID" --format Host --no-header)
REDIS_PORT=$(doctl databases get "$REDIS_ID" --format Port --no-header)
REDIS_PASSWORD=$(doctl databases get "$REDIS_ID" --format Password --no-header)

echo -e "${GREEN}Redis created: $REDIS_HOST:$REDIS_PORT${NC}"

# Step 6: Configure Database Firewalls
echo -e "${BLUE}Configuring database firewalls...${NC}"

# PostgreSQL firewall
doctl databases firewalls append "$DB_ID" \
    --rule droplet:"$DROPLET_ID"

# Redis firewall  
doctl databases firewalls append "$REDIS_ID" \
    --rule droplet:"$DROPLET_ID"

# Step 7: Create Firewall Rules
echo -e "${BLUE}Creating firewall rules...${NC}"
FIREWALL_ID=$(doctl compute firewall create \
    --name "${PROJECT_NAME}-firewall-${ENVIRONMENT}" \
    --droplet-ids "$DROPLET_ID" \
    --inbound-rules "protocol:tcp,ports:22,address:0.0.0.0/0 protocol:tcp,ports:80,address:0.0.0.0/0 protocol:tcp,ports:443,address:0.0.0.0/0 protocol:tcp,ports:8000,address:0.0.0.0/0" \
    --outbound-rules "protocol:tcp,ports:all,address:0.0.0.0/0 protocol:udp,ports:all,address:0.0.0.0/0 protocol:icmp,address:0.0.0.0/0" \
    --format ID \
    --no-header)

# Step 8: Create Spaces Bucket for storage
echo -e "${BLUE}Creating Spaces bucket...${NC}"
SPACES_NAME="${PROJECT_NAME}-assets-${ENVIRONMENT}"
SPACES_REGION="nyc3"

# Note: Spaces creation via CLI requires s3cmd or API calls
# This is a placeholder - configure manually or use s3cmd

# Step 9: Setup DNS (if domain provided)
if [ ! -z "$DOMAIN_NAME" ]; then
    echo -e "${BLUE}Setting up DNS...${NC}"
    
    # Add domain to DigitalOcean
    doctl compute domain create "$DOMAIN_NAME" --ip-address "$DROPLET_IP"
    
    # Create DNS records
    doctl compute domain records create "$DOMAIN_NAME" \
        --record-type A \
        --record-name www \
        --record-data "$DROPLET_IP"
    
    doctl compute domain records create "$DOMAIN_NAME" \
        --record-type A \
        --record-name api \
        --record-data "$DROPLET_IP"
    
    echo -e "${GREEN}DNS configured for $DOMAIN_NAME${NC}"
fi

# Step 10: Create Load Balancer (Optional for production)
if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${BLUE}Creating Load Balancer...${NC}"
    LB_ID=$(doctl compute load-balancer create \
        --name "${PROJECT_NAME}-lb-${ENVIRONMENT}" \
        --region "$REGION" \
        --size small \
        --vpc-uuid "$VPC_UUID" \
        --droplet-ids "$DROPLET_ID" \
        --forwarding-rules entry_protocol:http,entry_port:80,target_protocol:http,target_port:80 \
        --health-check protocol:http,port:80,path:/health,check_interval_seconds:10 \
        --format ID \
        --no-header)
    
    LB_IP=$(doctl compute load-balancer get "$LB_ID" --format IP --no-header)
    echo -e "${GREEN}Load Balancer created: $LB_IP${NC}"
fi

# Step 11: Wait for Droplet to be ready
echo -e "${BLUE}Waiting for server to be ready...${NC}"
sleep 60

# Step 12: Generate environment configuration file
ENV_FILE="deployment-env-${ENVIRONMENT}.txt"
cat > "$ENV_FILE" << EOF
# Spirit Tours - DigitalOcean Deployment Configuration
# Generated: $(date)
# Environment: ${ENVIRONMENT}

# Server Details
DROPLET_ID=${DROPLET_ID}
DROPLET_IP=${DROPLET_IP}
DROPLET_NAME=${DROPLET_NAME}
SSH_KEY=${SSH_KEY_PATH}

# Database Configuration
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_DATABASE}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# Redis Configuration
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_PASSWORD=${REDIS_PASSWORD}

# Domain Configuration
DOMAIN_NAME=${DOMAIN_NAME}
ADMIN_EMAIL=${ADMIN_EMAIL}

# Access URLs
FRONTEND_URL=http://${DROPLET_IP}
API_URL=http://${DROPLET_IP}:8000
API_DOCS=http://${DROPLET_IP}:8000/docs

# SSH Access
ssh -i ${SSH_KEY_PATH} root@${DROPLET_IP}
EOF

# Step 13: Deploy application
echo -e "${BLUE}Deploying application...${NC}"

# Create deployment script
cat > deploy-app.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

# Update environment variables
cat > /home/spirittours/app/.env.production << EOF
NODE_ENV=production
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_DATABASE}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_PASSWORD=${REDIS_PASSWORD}
JWT_SECRET=$(openssl rand -base64 64)
EOF

# Deploy with Docker
cd /home/spirittours/app
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d

# Run migrations
docker-compose -f docker-compose.production.yml exec -T api python -m alembic upgrade head

echo "Application deployed successfully!"
DEPLOY_SCRIPT

# Copy and execute deployment script
scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no deploy-app.sh root@${DROPLET_IP}:/tmp/
ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no root@${DROPLET_IP} "chmod +x /tmp/deploy-app.sh && /tmp/deploy-app.sh"

# Step 14: Setup monitoring alerts
echo -e "${BLUE}Setting up monitoring alerts...${NC}"
doctl monitoring alert create \
    --type v1/insights/droplet/cpu \
    --description "High CPU usage on ${DROPLET_NAME}" \
    --compare GreaterThan \
    --value 80 \
    --window 5m \
    --entities "$DROPLET_ID" \
    --emails "$ADMIN_EMAIL"

doctl monitoring alert create \
    --type v1/insights/droplet/memory_utilization_percent \
    --description "High memory usage on ${DROPLET_NAME}" \
    --compare GreaterThan \
    --value 85 \
    --window 5m \
    --entities "$DROPLET_ID" \
    --emails "$ADMIN_EMAIL"

# Step 15: Create project and add resources
echo -e "${BLUE}Creating project...${NC}"
PROJECT_ID=$(doctl projects create \
    --name "Spirit Tours ${ENVIRONMENT}" \
    --description "Spirit Tours Platform - ${ENVIRONMENT}" \
    --environment "$ENVIRONMENT" \
    --purpose "Web Application" \
    --format ID \
    --no-header)

# Add resources to project
doctl projects resources assign "$PROJECT_ID" \
    --resource "do:droplet:$DROPLET_ID" \
    --resource "do:database:$DB_ID" \
    --resource "do:database:$REDIS_ID"

# Display summary
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${BLUE}Resource Summary:${NC}"
echo "----------------------------------------"
echo "Droplet ID: $DROPLET_ID"
echo "Droplet IP: $DROPLET_IP"
echo "Database: $DB_HOST:$DB_PORT"
echo "Redis: $REDIS_HOST:$REDIS_PORT"
echo ""
echo -e "${BLUE}Access URLs:${NC}"
echo "----------------------------------------"
echo "Frontend: http://$DROPLET_IP"
echo "API: http://$DROPLET_IP:8000"
echo "API Docs: http://$DROPLET_IP:8000/docs"
echo ""
echo -e "${BLUE}SSH Access:${NC}"
echo "----------------------------------------"
echo "ssh -i $SSH_KEY_PATH root@$DROPLET_IP"
echo ""
echo -e "${BLUE}Configuration saved to:${NC} $ENV_FILE"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update DNS records to point to $DROPLET_IP"
echo "2. Configure SSL certificates"
echo "3. Update API keys in environment variables"
echo "4. Test the deployment"
echo ""
echo -e "${GREEN}Deployment completed in $(($SECONDS / 60)) minutes!${NC}"