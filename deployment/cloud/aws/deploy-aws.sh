#!/bin/bash
# Spirit Tours - AWS Production Deployment Script
# Version: 1.0.0
# Deploys complete infrastructure to AWS using EC2, RDS, ElastiCache, and S3

set -e

# ============================================
# Configuration
# ============================================
PROJECT_NAME="spirit-tours"
ENVIRONMENT="production"
AWS_REGION="${AWS_REGION:-us-east-1}"
VPC_CIDR="10.0.0.0/16"

# Instance configuration
WEB_INSTANCE_TYPE="t3.large"
WEB_INSTANCE_COUNT=3
DB_INSTANCE_TYPE="db.t3.xlarge"
CACHE_NODE_TYPE="cache.t3.medium"

# Domain configuration
DOMAIN="${DOMAIN:-spirittours.com}"
API_DOMAIN="api.${DOMAIN}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# Functions
# ============================================
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI not found. Please install it first."
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured. Run 'aws configure' first."
    fi
    
    # Check jq
    if ! command -v jq &> /dev/null; then
        error "jq not found. Please install it first."
    fi
    
    log "Prerequisites check passed ✓"
}

create_vpc() {
    log "Creating VPC..."
    
    VPC_ID=$(aws ec2 create-vpc \
        --cidr-block "$VPC_CIDR" \
        --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$PROJECT_NAME-vpc},{Key=Environment,Value=$ENVIRONMENT}]" \
        --query 'Vpc.VpcId' \
        --output text)
    
    log "VPC created: $VPC_ID"
    
    # Enable DNS hostnames
    aws ec2 modify-vpc-attribute \
        --vpc-id "$VPC_ID" \
        --enable-dns-hostnames
    
    # Create Internet Gateway
    IGW_ID=$(aws ec2 create-internet-gateway \
        --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=$PROJECT_NAME-igw}]" \
        --query 'InternetGateway.InternetGatewayId' \
        --output text)
    
    aws ec2 attach-internet-gateway \
        --internet-gateway-id "$IGW_ID" \
        --vpc-id "$VPC_ID"
    
    log "Internet Gateway created: $IGW_ID"
}

create_subnets() {
    log "Creating subnets..."
    
    # Get availability zones
    AZS=($(aws ec2 describe-availability-zones \
        --region "$AWS_REGION" \
        --query 'AvailabilityZones[0:3].ZoneName' \
        --output text))
    
    # Create public subnets
    PUBLIC_SUBNET_1=$(aws ec2 create-subnet \
        --vpc-id "$VPC_ID" \
        --cidr-block "10.0.1.0/24" \
        --availability-zone "${AZS[0]}" \
        --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_NAME-public-1}]" \
        --query 'Subnet.SubnetId' \
        --output text)
    
    PUBLIC_SUBNET_2=$(aws ec2 create-subnet \
        --vpc-id "$VPC_ID" \
        --cidr-block "10.0.2.0/24" \
        --availability-zone "${AZS[1]}" \
        --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_NAME-public-2}]" \
        --query 'Subnet.SubnetId' \
        --output text)
    
    # Create private subnets for database
    PRIVATE_SUBNET_1=$(aws ec2 create-subnet \
        --vpc-id "$VPC_ID" \
        --cidr-block "10.0.11.0/24" \
        --availability-zone "${AZS[0]}" \
        --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_NAME-private-1}]" \
        --query 'Subnet.SubnetId' \
        --output text)
    
    PRIVATE_SUBNET_2=$(aws ec2 create-subnet \
        --vpc-id "$VPC_ID" \
        --cidr-block "10.0.12.0/24" \
        --availability-zone "${AZS[1]}" \
        --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$PROJECT_NAME-private-2}]" \
        --query 'Subnet.SubnetId' \
        --output text)
    
    log "Subnets created ✓"
}

create_security_groups() {
    log "Creating security groups..."
    
    # ALB Security Group
    ALB_SG=$(aws ec2 create-security-group \
        --group-name "$PROJECT_NAME-alb-sg" \
        --description "Security group for ALB" \
        --vpc-id "$VPC_ID" \
        --query 'GroupId' \
        --output text)
    
    # Allow HTTP and HTTPS from internet
    aws ec2 authorize-security-group-ingress \
        --group-id "$ALB_SG" \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0
    
    aws ec2 authorize-security-group-ingress \
        --group-id "$ALB_SG" \
        --protocol tcp \
        --port 443 \
        --cidr 0.0.0.0/0
    
    # Web Server Security Group
    WEB_SG=$(aws ec2 create-security-group \
        --group-name "$PROJECT_NAME-web-sg" \
        --description "Security group for web servers" \
        --vpc-id "$VPC_ID" \
        --query 'GroupId' \
        --output text)
    
    # Allow traffic from ALB
    aws ec2 authorize-security-group-ingress \
        --group-id "$WEB_SG" \
        --protocol tcp \
        --port 8000 \
        --source-group "$ALB_SG"
    
    # Database Security Group
    DB_SG=$(aws ec2 create-security-group \
        --group-name "$PROJECT_NAME-db-sg" \
        --description "Security group for database" \
        --vpc-id "$VPC_ID" \
        --query 'GroupId' \
        --output text)
    
    # Allow PostgreSQL from web servers
    aws ec2 authorize-security-group-ingress \
        --group-id "$DB_SG" \
        --protocol tcp \
        --port 5432 \
        --source-group "$WEB_SG"
    
    log "Security groups created ✓"
}

create_rds_database() {
    log "Creating RDS PostgreSQL database..."
    
    # Create DB subnet group
    aws rds create-db-subnet-group \
        --db-subnet-group-name "$PROJECT_NAME-db-subnet" \
        --db-subnet-group-description "Subnet group for Spirit Tours database" \
        --subnet-ids "$PRIVATE_SUBNET_1" "$PRIVATE_SUBNET_2" \
        --tags "Key=Name,Value=$PROJECT_NAME-db-subnet"
    
    # Generate database password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    # Create RDS instance
    aws rds create-db-instance \
        --db-instance-identifier "$PROJECT_NAME-db" \
        --db-instance-class "$DB_INSTANCE_TYPE" \
        --engine postgres \
        --engine-version 15.4 \
        --master-username spirittours \
        --master-user-password "$DB_PASSWORD" \
        --allocated-storage 100 \
        --storage-type gp3 \
        --storage-encrypted \
        --vpc-security-group-ids "$DB_SG" \
        --db-subnet-group-name "$PROJECT_NAME-db-subnet" \
        --backup-retention-period 30 \
        --preferred-backup-window "03:00-04:00" \
        --preferred-maintenance-window "sun:04:00-sun:05:00" \
        --multi-az \
        --publicly-accessible false \
        --auto-minor-version-upgrade true \
        --tags "Key=Name,Value=$PROJECT_NAME-db" "Key=Environment,Value=$ENVIRONMENT"
    
    log "RDS database creation initiated (this may take 10-15 minutes)"
    
    # Store password in AWS Secrets Manager
    aws secretsmanager create-secret \
        --name "$PROJECT_NAME/db/password" \
        --description "Spirit Tours Database Password" \
        --secret-string "{\"password\":\"$DB_PASSWORD\"}"
    
    log "Database password stored in AWS Secrets Manager ✓"
}

create_elasticache() {
    log "Creating ElastiCache Redis cluster..."
    
    # Create cache subnet group
    aws elasticache create-cache-subnet-group \
        --cache-subnet-group-name "$PROJECT_NAME-cache-subnet" \
        --cache-subnet-group-description "Subnet group for Spirit Tours cache" \
        --subnet-ids "$PRIVATE_SUBNET_1" "$PRIVATE_SUBNET_2"
    
    # Create cache security group
    CACHE_SG=$(aws ec2 create-security-group \
        --group-name "$PROJECT_NAME-cache-sg" \
        --description "Security group for Redis cache" \
        --vpc-id "$VPC_ID" \
        --query 'GroupId' \
        --output text)
    
    aws ec2 authorize-security-group-ingress \
        --group-id "$CACHE_SG" \
        --protocol tcp \
        --port 6379 \
        --source-group "$WEB_SG"
    
    # Create Redis cluster
    aws elasticache create-replication-group \
        --replication-group-id "$PROJECT_NAME-redis" \
        --replication-group-description "Spirit Tours Redis Cache" \
        --engine redis \
        --cache-node-type "$CACHE_NODE_TYPE" \
        --num-cache-clusters 2 \
        --automatic-failover-enabled \
        --cache-subnet-group-name "$PROJECT_NAME-cache-subnet" \
        --security-group-ids "$CACHE_SG" \
        --at-rest-encryption-enabled \
        --transit-encryption-enabled \
        --tags "Key=Name,Value=$PROJECT_NAME-redis"
    
    log "Redis cluster creation initiated ✓"
}

create_load_balancer() {
    log "Creating Application Load Balancer..."
    
    # Create ALB
    ALB_ARN=$(aws elbv2 create-load-balancer \
        --name "$PROJECT_NAME-alb" \
        --subnets "$PUBLIC_SUBNET_1" "$PUBLIC_SUBNET_2" \
        --security-groups "$ALB_SG" \
        --scheme internet-facing \
        --type application \
        --ip-address-type ipv4 \
        --tags "Key=Name,Value=$PROJECT_NAME-alb" \
        --query 'LoadBalancers[0].LoadBalancerArn' \
        --output text)
    
    # Create target group
    TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
        --name "$PROJECT_NAME-tg" \
        --protocol HTTP \
        --port 8000 \
        --vpc-id "$VPC_ID" \
        --health-check-protocol HTTP \
        --health-check-path /health \
        --health-check-interval-seconds 30 \
        --health-check-timeout-seconds 5 \
        --healthy-threshold-count 2 \
        --unhealthy-threshold-count 3 \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text)
    
    # Create HTTPS listener (requires SSL certificate)
    # aws elbv2 create-listener \
    #     --load-balancer-arn "$ALB_ARN" \
    #     --protocol HTTPS \
    #     --port 443 \
    #     --certificates CertificateArn=<your-certificate-arn> \
    #     --default-actions Type=forward,TargetGroupArn="$TARGET_GROUP_ARN"
    
    # Create HTTP listener (redirect to HTTPS in production)
    aws elbv2 create-listener \
        --load-balancer-arn "$ALB_ARN" \
        --protocol HTTP \
        --port 80 \
        --default-actions Type=forward,TargetGroupArn="$TARGET_GROUP_ARN"
    
    log "Load balancer created ✓"
}

create_s3_buckets() {
    log "Creating S3 buckets..."
    
    # Backups bucket
    aws s3 mb "s3://$PROJECT_NAME-backups-$AWS_REGION" --region "$AWS_REGION"
    
    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "$PROJECT_NAME-backups-$AWS_REGION" \
        --versioning-configuration Status=Enabled
    
    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket "$PROJECT_NAME-backups-$AWS_REGION" \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }]
        }'
    
    # Lifecycle policy for old backups
    aws s3api put-bucket-lifecycle-configuration \
        --bucket "$PROJECT_NAME-backups-$AWS_REGION" \
        --lifecycle-configuration '{
            "Rules": [{
                "Id": "DeleteOldBackups",
                "Status": "Enabled",
                "Filter": {"Prefix": "backups/"},
                "Expiration": {"Days": 90},
                "NoncurrentVersionExpiration": {"NoncurrentDays": 30}
            }]
        }'
    
    # Static assets bucket
    aws s3 mb "s3://$PROJECT_NAME-assets-$AWS_REGION" --region "$AWS_REGION"
    
    log "S3 buckets created ✓"
}

print_summary() {
    log "=========================================="
    log "AWS Infrastructure Deployment Complete!"
    log "=========================================="
    log ""
    log "Resources created:"
    log "  VPC: $VPC_ID"
    log "  Load Balancer: $ALB_ARN"
    log "  RDS Database: $PROJECT_NAME-db (initializing...)"
    log "  Redis Cache: $PROJECT_NAME-redis (initializing...)"
    log "  S3 Backups: s3://$PROJECT_NAME-backups-$AWS_REGION"
    log ""
    log "Next steps:"
    log "  1. Wait for RDS and Redis to finish provisioning (10-15 minutes)"
    log "  2. Request SSL certificate from AWS Certificate Manager"
    log "  3. Deploy application code to EC2 instances"
    log "  4. Configure Route53 DNS records"
    log "  5. Set up CloudWatch alarms and monitoring"
    log ""
    log "Estimated monthly cost: ~$840/month"
    log "=========================================="
}

# ============================================
# Main Execution
# ============================================
main() {
    log "Starting AWS production deployment for $PROJECT_NAME..."
    
    check_prerequisites
    create_vpc
    create_subnets
    create_security_groups
    create_rds_database
    create_elasticache
    create_load_balancer
    create_s3_buckets
    print_summary
}

# Run main function
main "$@"
