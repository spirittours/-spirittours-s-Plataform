# 🧪 FASE 2: DEPLOYMENT A STAGING

## Objetivo
Desplegar el ERP Hub completo en un ambiente staging para probar con datos sandbox antes de producción.

---

## PRE-REQUISITOS

✅ Todas las credenciales SANDBOX obtenidas (Fase 1)  
✅ AWS account configurado  
✅ Acceso SSH a servidores  
✅ Git repository accesible  

---

## ARQUITECTURA STAGING

```
┌──────────────────────────────────────────────────────┐
│                  STAGING ENVIRONMENT                  │
├──────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────┐         ┌──────────────┐          │
│  │  Web Server  │────────▶│  PostgreSQL  │          │
│  │  (EC2 t3.med)│         │  (RDS t3.med)│          │
│  │  Node.js     │         │  Staging DB  │          │
│  └──────┬───────┘         └──────────────┘          │
│         │                                            │
│         │                 ┌──────────────┐          │
│         └────────────────▶│    Redis     │          │
│                           │(ElastiCache) │          │
│                           └──────────────┘          │
│                                                       │
│  ERPs Conectados:                                    │
│  ├─ QuickBooks Sandbox                              │
│  ├─ Xero Demo Company                               │
│  ├─ FreshBooks Test Account                         │
│  ├─ CONTPAQi Test Database                          │
│  ├─ QuickBooks MX Sandbox                           │
│  └─ Alegra Test Account                             │
│                                                       │
└──────────────────────────────────────────────────────┘
```

**Costos mensuales estimados:** ~$200 USD

---

## PASO 1: PROVISIONAR INFRAESTRUCTURA (1 hora)

### 1.1 Crear VPC y Networking

```bash
#!/bin/bash
# setup-staging-network.sh

# Variables
AWS_REGION="us-east-1"
VPC_CIDR="10.1.0.0/16"
PUBLIC_SUBNET_CIDR="10.1.1.0/24"
PRIVATE_SUBNET_CIDR="10.1.10.0/24"
PROJECT_NAME="erp-hub-staging"

# Crear VPC
VPC_ID=$(aws ec2 create-vpc \
    --cidr-block $VPC_CIDR \
    --region $AWS_REGION \
    --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$PROJECT_NAME-vpc}]" \
    --query 'Vpc.VpcId' \
    --output text)

echo "✅ VPC Created: $VPC_ID"

# Crear Internet Gateway
IGW_ID=$(aws ec2 create-internet-gateway \
    --region $AWS_REGION \
    --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=$PROJECT_NAME-igw}]" \
    --query 'InternetGateway.InternetGatewayId' \
    --output text)

aws ec2 attach-internet-gateway \
    --vpc-id $VPC_ID \
    --internet-gateway-id $IGW_ID \
    --region $AWS_REGION

echo "✅ Internet Gateway: $IGW_ID"

# Crear Public Subnet
PUBLIC_SUBNET_ID=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block $PUBLIC_SUBNET_CIDR \
    --availability-zone ${AWS_REGION}a \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_NAME-public-subnet}]" \
    --query 'Subnet.SubnetId' \
    --output text)

echo "✅ Public Subnet: $PUBLIC_SUBNET_ID"

# Crear Private Subnet
PRIVATE_SUBNET_ID=$(aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block $PRIVATE_SUBNET_CIDR \
    --availability-zone ${AWS_REGION}a \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_NAME-private-subnet}]" \
    --query 'Subnet.SubnetId' \
    --output text)

echo "✅ Private Subnet: $PRIVATE_SUBNET_ID"

# Crear Route Table y asociar con Public Subnet
RT_ID=$(aws ec2 create-route-table \
    --vpc-id $VPC_ID \
    --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$PROJECT_NAME-public-rt}]" \
    --query 'RouteTable.RouteTableId' \
    --output text)

aws ec2 create-route \
    --route-table-id $RT_ID \
    --destination-cidr-block 0.0.0.0/0 \
    --gateway-id $IGW_ID

aws ec2 associate-route-table \
    --subnet-id $PUBLIC_SUBNET_ID \
    --route-table-id $RT_ID

echo "✅ Route Table configured"

# Guardar IDs para uso posterior
cat > staging-network-ids.env << EOF
VPC_ID=$VPC_ID
PUBLIC_SUBNET_ID=$PUBLIC_SUBNET_ID
PRIVATE_SUBNET_ID=$PRIVATE_SUBNET_ID
IGW_ID=$IGW_ID
RT_ID=$RT_ID
EOF

echo "✅ Network setup complete! IDs saved to staging-network-ids.env"
```

**Ejecutar:**
```bash
chmod +x setup-staging-network.sh
./setup-staging-network.sh
```

### 1.2 Crear Security Groups

```bash
#!/bin/bash
# setup-security-groups.sh

source staging-network-ids.env

# Web Server Security Group
WEB_SG_ID=$(aws ec2 create-security-group \
    --group-name erp-hub-staging-web-sg \
    --description "Security group for ERP Hub staging web server" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text)

# Allow SSH (22)
aws ec2 authorize-security-group-ingress \
    --group-id $WEB_SG_ID \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0

# Allow HTTP (80)
aws ec2 authorize-security-group-ingress \
    --group-id $WEB_SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0

# Allow HTTPS (443)
aws ec2 authorize-security-group-ingress \
    --group-id $WEB_SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0

echo "✅ Web SG: $WEB_SG_ID"

# Database Security Group
DB_SG_ID=$(aws ec2 create-security-group \
    --group-name erp-hub-staging-db-sg \
    --description "Security group for staging database" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text)

# Allow PostgreSQL (5432) from Web SG only
aws ec2 authorize-security-group-ingress \
    --group-id $DB_SG_ID \
    --protocol tcp \
    --port 5432 \
    --source-group $WEB_SG_ID

echo "✅ DB SG: $DB_SG_ID"

# Redis Security Group
REDIS_SG_ID=$(aws ec2 create-security-group \
    --group-name erp-hub-staging-redis-sg \
    --description "Security group for staging Redis" \
    --vpc-id $VPC_ID \
    --query 'GroupId' \
    --output text)

# Allow Redis (6379) from Web SG only
aws ec2 authorize-security-group-ingress \
    --group-id $REDIS_SG_ID \
    --protocol tcp \
    --port 6379 \
    --source-group $WEB_SG_ID

echo "✅ Redis SG: $REDIS_SG_ID"

# Guardar IDs
cat >> staging-network-ids.env << EOF
WEB_SG_ID=$WEB_SG_ID
DB_SG_ID=$DB_SG_ID
REDIS_SG_ID=$REDIS_SG_ID
EOF

echo "✅ Security Groups configured!"
```

### 1.3 Crear RDS PostgreSQL

```bash
#!/bin/bash
# setup-rds-staging.sh

source staging-network-ids.env

# Crear DB Subnet Group
aws rds create-db-subnet-group \
    --db-subnet-group-name erp-hub-staging-subnet-group \
    --db-subnet-group-description "Subnet group for ERP Hub staging" \
    --subnet-ids $PUBLIC_SUBNET_ID $PRIVATE_SUBNET_ID

# Crear RDS Instance
aws rds create-db-instance \
    --db-instance-identifier erp-hub-staging-db \
    --db-instance-class db.t3.medium \
    --engine postgres \
    --engine-version 14.10 \
    --master-username erp_admin \
    --master-user-password "StrongPassword123!" \
    --allocated-storage 20 \
    --storage-type gp3 \
    --vpc-security-group-ids $DB_SG_ID \
    --db-subnet-group-name erp-hub-staging-subnet-group \
    --backup-retention-period 7 \
    --publicly-accessible \
    --tags Key=Environment,Value=staging Key=Project,Value=erp-hub

echo "⏳ RDS instance creating... (takes ~10 minutes)"
echo "   Check status: aws rds describe-db-instances --db-instance-identifier erp-hub-staging-db"

# Wait for RDS to be available
aws rds wait db-instance-available --db-instance-identifier erp-hub-staging-db

# Get endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier erp-hub-staging-db \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)

echo "✅ RDS Ready! Endpoint: $DB_ENDPOINT"

# Save to env
echo "DB_ENDPOINT=$DB_ENDPOINT" >> staging-network-ids.env
```

### 1.4 Crear ElastiCache Redis

```bash
#!/bin/bash
# setup-redis-staging.sh

source staging-network-ids.env

# Crear Cache Subnet Group
aws elasticache create-cache-subnet-group \
    --cache-subnet-group-name erp-hub-staging-redis-subnet \
    --cache-subnet-group-description "Redis subnet group for staging" \
    --subnet-ids $PUBLIC_SUBNET_ID $PRIVATE_SUBNET_ID

# Crear Redis Cluster
aws elasticache create-cache-cluster \
    --cache-cluster-id erp-hub-staging-redis \
    --cache-node-type cache.t3.micro \
    --engine redis \
    --engine-version 7.0 \
    --num-cache-nodes 1 \
    --cache-subnet-group-name erp-hub-staging-redis-subnet \
    --security-group-ids $REDIS_SG_ID \
    --tags Key=Environment,Value=staging Key=Project,Value=erp-hub

echo "⏳ Redis creating... (takes ~5 minutes)"

# Wait
sleep 300

# Get endpoint
REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
    --cache-cluster-id erp-hub-staging-redis \
    --show-cache-node-info \
    --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
    --output text)

echo "✅ Redis Ready! Endpoint: $REDIS_ENDPOINT"
echo "REDIS_ENDPOINT=$REDIS_ENDPOINT" >> staging-network-ids.env
```

### 1.5 Crear EC2 Instance

```bash
#!/bin/bash
# setup-ec2-staging.sh

source staging-network-ids.env

# Crear Key Pair (si no existe)
aws ec2 create-key-pair \
    --key-name erp-hub-staging-key \
    --query 'KeyMaterial' \
    --output text > erp-hub-staging-key.pem

chmod 400 erp-hub-staging-key.pem

echo "✅ Key pair created: erp-hub-staging-key.pem"

# Latest Ubuntu 22.04 AMI
AMI_ID=$(aws ec2 describe-images \
    --owners 099720109477 \
    --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
    --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
    --output text)

# Create EC2 Instance
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --instance-type t3.medium \
    --key-name erp-hub-staging-key \
    --security-group-ids $WEB_SG_ID \
    --subnet-id $PUBLIC_SUBNET_ID \
    --associate-public-ip-address \
    --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=erp-hub-staging},{Key=Environment,Value=staging}]' \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "⏳ EC2 instance launching: $INSTANCE_ID"

# Wait for running
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "✅ EC2 Ready! Public IP: $PUBLIC_IP"
echo "INSTANCE_ID=$INSTANCE_ID" >> staging-network-ids.env
echo "PUBLIC_IP=$PUBLIC_IP" >> staging-network-ids.env

echo ""
echo "🔌 Connect with: ssh -i erp-hub-staging-key.pem ubuntu@$PUBLIC_IP"
```

---

## PASO 2: CONFIGURAR SERVIDOR (1 hora)

### 2.1 Conectar y Setup Inicial

```bash
# Conectar al servidor
source staging-network-ids.env
ssh -i erp-hub-staging-key.pem ubuntu@$PUBLIC_IP
```

Una vez conectado:

```bash
#!/bin/bash
# Ejecutar en el servidor EC2

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install essentials
sudo apt-get install -y \
    build-essential \
    git \
    curl \
    wget \
    nginx \
    certbot \
    python3-certbot-nginx

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node -v  # Should show v20.x.x
npm -v   # Should show 10.x.x

# Install PM2 globally
sudo npm install -g pm2

# Install PostgreSQL client
sudo apt-get install -y postgresql-client

echo "✅ Server software installed!"
```

### 2.2 Clone Repository

```bash
# Create app directory
sudo mkdir -p /var/www/erp-hub
sudo chown ubuntu:ubuntu /var/www/erp-hub

# Clone repo
cd /var/www/erp-hub
git clone https://github.com/spirittours/-spirittours-s-Plataform.git .

# Checkout main branch
git checkout main
git pull origin main

echo "✅ Repository cloned!"
```

### 2.3 Install Dependencies

```bash
cd /var/www/erp-hub

# Backend dependencies
npm ci --only=production

# Frontend dependencies
cd frontend
npm ci --only=production
npm run build

cd ..

echo "✅ Dependencies installed!"
```

### 2.4 Configure Environment

```bash
cd /var/www/erp-hub

# Create .env file
cat > .env << 'EOF'
# ==============================================================================
# ERP HUB - STAGING ENVIRONMENT
# ==============================================================================

NODE_ENV=staging
PORT=3000
LOG_LEVEL=debug

# Database (from staging-network-ids.env)
DATABASE_URL=postgresql://erp_admin:StrongPassword123!@[DB_ENDPOINT]:5432/erp_hub_staging
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_SSL=true

# Redis (from staging-network-ids.env)
REDIS_URL=redis://[REDIS_ENDPOINT]:6379
REDIS_TLS=false

# Session & Security
SESSION_SECRET=[generate with: openssl rand -hex 32]
JWT_SECRET=[generate with: openssl rand -hex 32]
ENCRYPTION_KEY=[generate with: openssl rand -hex 16]

# Spirit Tours API (staging)
SPIRIT_TOURS_API_URL=https://staging-api.spirittours.com
SPIRIT_TOURS_API_KEY=[staging_api_key]

# ==================== USA ERPs (SANDBOX) ====================

# QuickBooks USA Sandbox
QB_USA_CLIENT_ID=[from developer.intuit.com]
QB_USA_CLIENT_SECRET=[from developer.intuit.com]
QB_USA_REDIRECT_URI=http://[PUBLIC_IP]:3000/oauth/quickbooks/callback
QB_USA_ENVIRONMENT=sandbox
QB_USA_API_VERSION=v3
QB_USA_MINOR_VERSION=65

# Xero USA Demo
XERO_USA_CLIENT_ID=[from developer.xero.com]
XERO_USA_CLIENT_SECRET=[from developer.xero.com]
XERO_USA_REDIRECT_URI=http://[PUBLIC_IP]:3000/oauth/xero/callback

# FreshBooks Test
FRESHBOOKS_CLIENT_ID=[from freshbooks]
FRESHBOOKS_CLIENT_SECRET=[from freshbooks]
FRESHBOOKS_REDIRECT_URI=http://[PUBLIC_IP]:3000/oauth/freshbooks/callback

# ==================== MÉXICO ERPs (TEST) ====================

# CONTPAQi Test
CONTPAQI_API_KEY=[test_api_key]
CONTPAQI_LICENSE_KEY=[test_license]
CONTPAQI_USER_ID=test_user
CONTPAQI_PASSWORD=[test_password]
CONTPAQI_COMPANY_DATABASE=TEST_DB
CONTPAQI_API_ENDPOINT=https://api.contpaqi.com/v1
CONTPAQI_ENVIRONMENT=test

# QuickBooks México Sandbox
QB_MX_CLIENT_ID=[from developer.intuit.com]
QB_MX_CLIENT_SECRET=[from developer.intuit.com]
QB_MX_REDIRECT_URI=http://[PUBLIC_IP]:3000/oauth/quickbooks-mx/callback
QB_MX_ENVIRONMENT=sandbox

# Alegra Test
ALEGRA_USERNAME=test@spirittours.com
ALEGRA_API_TOKEN=[test_token]
ALEGRA_API_ENDPOINT=https://api.alegra.com/api/v1

# ==================== CFDI 4.0 (TEST) ====================

# Test CSD (simulación)
CSD_CERTIFICATE_PATH=/etc/erp-hub/test-certs/certificado.pem
CSD_PRIVATE_KEY_PATH=/etc/erp-hub/test-certs/clave_privada.pem
CSD_PRIVATE_KEY_PASSWORD=test_password

# PAC Test (Finkok sandbox)
PAC_PROVIDER=finkok
PAC_USERNAME=test_user
PAC_PASSWORD=test_password
PAC_ENDPOINT=http://demo-facturacion.finkok.com/servicios/soap
PAC_ENVIRONMENT=test

# SAT Info (test)
SAT_RFC=AAA010101AAA
SAT_NOMBRE=SPIRIT TOURS TEST
SAT_REGIMEN_FISCAL=601

# CFDI Configuration
CFDI_ENABLE=true
CFDI_AUTO_STAMP=true

# ==================== MONITORING (OPTIONAL FOR STAGING) ====================

SENTRY_DSN=[optional for staging]
DATADOG_API_KEY=[optional]

# Email (test)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=[mailtrap_user]
SMTP_PASSWORD=[mailtrap_password]

# Slack (test channel)
SLACK_WEBHOOK_URL=[staging_webhook]
SLACK_CHANNEL=#erp-hub-staging

# Feature Flags
FEATURE_AUTO_SYNC=true
FEATURE_BATCH_SYNC=true
FEATURE_MULTI_ERP=true
FEATURE_CFDI_MEXICO=true

EOF

# Replace placeholders
sed -i "s/\[DB_ENDPOINT\]/$DB_ENDPOINT/g" .env
sed -i "s/\[REDIS_ENDPOINT\]/$REDIS_ENDPOINT/g" .env
sed -i "s/\[PUBLIC_IP\]/$PUBLIC_IP/g" .env

# Generate secrets
SESSION_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 16)

sed -i "s/\[generate with: openssl rand -hex 32\]/$SESSION_SECRET/g" .env
sed -i "s/\[generate with: openssl rand -hex 32\]/$JWT_SECRET/g" .env
sed -i "s/\[generate with: openssl rand -hex 16\]/$ENCRYPTION_KEY/g" .env

echo "✅ .env file created!"
echo "⚠️  IMPORTANT: Update the following manually:"
echo "   - All ERP credentials ([from ...])"
echo "   - SPIRIT_TOURS_API_KEY"
echo "   - Email/Slack settings"
```

---

## PASO 3: DATABASE SETUP (30 minutos)

```bash
# Connect to RDS
source staging-network-ids.env
psql -h $DB_ENDPOINT -U erp_admin -d postgres

# In psql:
CREATE DATABASE erp_hub_staging;
\c erp_hub_staging

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create application user
CREATE USER erp_hub_user WITH PASSWORD 'AppUserPassword123!';

-- Grant permissions
GRANT CONNECT ON DATABASE erp_hub_staging TO erp_hub_user;
GRANT USAGE ON SCHEMA public TO erp_hub_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO erp_hub_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO erp_hub_user;

\q

# Run migrations
cd /var/www/erp-hub
npm run migrate:staging

echo "✅ Database configured!"
```

---

## PASO 4: START APPLICATION (15 minutos)

```bash
cd /var/www/erp-hub

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
    apps: [
        {
            name: 'erp-hub-staging-web',
            script: './server.js',
            instances: 2,
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'staging',
                PORT: 3000
            },
            error_file: '/var/log/erp-hub/staging-error.log',
            out_file: '/var/log/erp-hub/staging-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            max_memory_restart: '512M'
        }
    ]
};
EOF

# Create log directory
sudo mkdir -p /var/log/erp-hub
sudo chown ubuntu:ubuntu /var/log/erp-hub

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
# Follow the command it outputs

# Check status
pm2 status
pm2 logs

echo "✅ Application started!"
```

---

## PASO 5: CONFIGURE NGINX (20 minutos)

```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/erp-hub-staging << 'EOF'
server {
    listen 80;
    server_name [PUBLIC_IP];

    client_max_body_size 10M;

    # Logs
    access_log /var/log/nginx/erp-hub-staging-access.log;
    error_log /var/log/nginx/erp-hub-staging-error.log;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location /health {
        access_log off;
        proxy_pass http://localhost:3000/health;
    }
}
EOF

# Replace PUBLIC_IP
sudo sed -i "s/\[PUBLIC_IP\]/$PUBLIC_IP/g" /etc/nginx/sites-available/erp-hub-staging

# Enable site
sudo ln -s /etc/nginx/sites-available/erp-hub-staging /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

echo "✅ Nginx configured!"
```

---

## PASO 6: TESTING (1 hora)

### 6.1 Health Check

```bash
# From your local machine
source deployment/staging-network-ids.env

curl http://$PUBLIC_IP/health

# Expected: {"status":"ok","timestamp":"2025-11-02T..."}
```

### 6.2 Run Automated Tests

```bash
# On the server
cd /var/www/erp-hub

# Run test suite
./backend/tests/run-e2e-tests.sh

# Expected: All tests should pass or skip (if no sandbox credentials yet)
```

### 6.3 Manual Testing Checklist

```
□ Access admin panel: http://[PUBLIC_IP]/admin
□ Login with test credentials
□ Navigate through all pages
□ Try connecting a sandbox ERP (if credentials available)
□ Test sync monitor
□ View logs
□ Check account mapping
□ Verify no console errors
```

---

## PASO 7: MONITORING SETUP (30 minutos)

```bash
# Install Netdata for real-time monitoring
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# Access: http://[PUBLIC_IP]:19999

# Setup CloudWatch Agent (optional)
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure log shipping to CloudWatch
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/config.json << 'EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/erp-hub/staging-error.log",
            "log_group_name": "/erp-hub/staging",
            "log_stream_name": "error"
          },
          {
            "file_path": "/var/log/nginx/erp-hub-staging-error.log",
            "log_group_name": "/erp-hub/staging",
            "log_stream_name": "nginx-error"
          }
        ]
      }
    }
  }
}
EOF

sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json \
    -s

echo "✅ Monitoring configured!"
```

---

## RESUMEN FINAL

### ✅ STAGING DEPLOYMENT COMPLETADO

**Infraestructura:**
- ✅ VPC y subnets
- ✅ Security groups
- ✅ RDS PostgreSQL (t3.medium)
- ✅ ElastiCache Redis
- ✅ EC2 Instance (t3.medium)
- ✅ Nginx reverse proxy

**Aplicación:**
- ✅ Código deployed
- ✅ Dependencies installed
- ✅ Database migrated
- ✅ PM2 running (2 instances)
- ✅ Logs configured

**Acceso:**
```
Admin Panel: http://[PUBLIC_IP]/admin
API Endpoint: http://[PUBLIC_IP]/api
Health Check: http://[PUBLIC_IP]/health
Monitoring: http://[PUBLIC_IP]:19999
```

**Credentials:**
```
Database: erp_admin / StrongPassword123!
App User: erp_hub_user / AppUserPassword123!
SSH Key: erp-hub-staging-key.pem
```

---

## 🎯 NEXT STEPS

Una vez validado staging:

1. ⏳ **Configure sandbox ERP credentials** en `.env`
2. ⏳ **Test con datos reales** (sandbox)
3. ⏳ **Performance testing** (100 concurrent users)
4. ⏳ **Security audit** (npm audit, OWASP ZAP)

**→ Si todo funciona correctamente: PASAR A FASE 3 (TRAINING)**

¿Necesitas ayuda con algún paso específico del deployment?
