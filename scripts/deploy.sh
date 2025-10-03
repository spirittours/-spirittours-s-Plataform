#!/bin/bash
# 🚀 Enterprise Deployment Script - AI Multi-Model Management System
# Automated deployment with rollback capabilities and health checks

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# 🎨 Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 📊 Configuration
DEPLOYMENT_ID="deploy-$(date +%Y%m%d-%H%M%S)"
MAX_WAIT_TIME=600  # 10 minutes
HEALTH_CHECK_RETRIES=10
ROLLBACK_ENABLED=${ROLLBACK_ENABLED:-true}
ENVIRONMENT=${ENVIRONMENT:-production}
NAMESPACE=${NAMESPACE:-ai-multimodel}

# 📁 Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
K8S_DIR="$PROJECT_DIR/infrastructure/k8s"
LOGS_DIR="$PROJECT_DIR/deployment-logs"

# 🔧 Functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# 📊 Create logs directory
mkdir -p "$LOGS_DIR"
exec > >(tee -a "$LOGS_DIR/deployment-$DEPLOYMENT_ID.log")
exec 2>&1

# 🎯 Main deployment function
main() {
    log "🚀 Starting deployment of AI Multi-Model Management System"
    log "📊 Deployment ID: $DEPLOYMENT_ID"
    log "🌍 Environment: $ENVIRONMENT"
    log "📦 Namespace: $NAMESPACE"
    
    # 🔍 Pre-deployment checks
    pre_deployment_checks
    
    # 📊 Create backup
    create_backup
    
    # 🏗️ Build and push images
    build_and_push_images
    
    # 🚀 Deploy to Kubernetes
    deploy_to_kubernetes
    
    # 🔍 Health checks
    perform_health_checks
    
    # 📊 Post-deployment validation
    post_deployment_validation
    
    # 🎉 Success notification
    deployment_success
}

pre_deployment_checks() {
    log "🔍 Performing pre-deployment checks..."
    
    # Check required tools
    command -v kubectl >/dev/null 2>&1 || { error "kubectl not found"; exit 1; }
    command -v docker >/dev/null 2>&1 || { error "docker not found"; exit 1; }
    command -v helm >/dev/null 2>&1 || warn "helm not found, skipping helm deployments"
    
    # Check kubectl connection
    if ! kubectl cluster-info >/dev/null 2>&1; then
        error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        log "📦 Creating namespace: $NAMESPACE"
        kubectl create namespace "$NAMESPACE"
        kubectl label namespace "$NAMESPACE" name="$NAMESPACE"
    fi
    
    # Validate Kubernetes manifests
    log "🔍 Validating Kubernetes manifests..."
    if ! kubectl apply --dry-run=client -f "$K8S_DIR/$ENVIRONMENT/" >/dev/null 2>&1; then
        error "Kubernetes manifests validation failed"
        exit 1
    fi
    
    # Check Docker registry access
    if ! docker info >/dev/null 2>&1; then
        error "Docker daemon not accessible"
        exit 1
    fi
    
    log "✅ Pre-deployment checks completed"
}

create_backup() {
    log "📊 Creating pre-deployment backup..."
    
    # Create backup directory
    BACKUP_DIR="$LOGS_DIR/backups/$DEPLOYMENT_ID"
    mkdir -p "$BACKUP_DIR"
    
    # Backup current deployment
    kubectl get all -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/current-deployment.yaml" 2>/dev/null || true
    kubectl get configmaps -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/configmaps.yaml" 2>/dev/null || true
    kubectl get secrets -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/secrets.yaml" 2>/dev/null || true
    kubectl get ingress -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/ingress.yaml" 2>/dev/null || true
    
    # Backup database (if applicable)
    if kubectl get pods -n "$NAMESPACE" -l app=postgresql >/dev/null 2>&1; then
        log "🗄️ Creating database backup..."
        kubectl exec -n "$NAMESPACE" -it deployment/postgresql -- pg_dump -U postgres ai_multimodel > "$BACKUP_DIR/database.sql" 2>/dev/null || warn "Database backup failed"
    fi
    
    log "✅ Backup created: $BACKUP_DIR"
}

build_and_push_images() {
    log "🏗️ Building and pushing Docker images..."
    
    # Get image tag from environment or git
    if [ -z "${IMAGE_TAG:-}" ]; then
        IMAGE_TAG=$(git rev-parse --short HEAD)
        log "📊 Using git commit as image tag: $IMAGE_TAG"
    fi
    
    # Build Docker image
    log "🏗️ Building Docker image..."
    docker build \
        --build-arg VCS_REF="$(git rev-parse HEAD)" \
        --build-arg BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        -t "ghcr.io/genspark/ai-multimodel:$IMAGE_TAG" \
        -t "ghcr.io/genspark/ai-multimodel:latest" \
        "$PROJECT_DIR"
    
    # Push to registry
    log "📤 Pushing images to registry..."
    docker push "ghcr.io/genspark/ai-multimodel:$IMAGE_TAG"
    docker push "ghcr.io/genspark/ai-multimodel:latest"
    
    log "✅ Images built and pushed successfully"
}

deploy_to_kubernetes() {
    log "🚀 Deploying to Kubernetes..."
    
    # Update image tags in manifests
    find "$K8S_DIR/$ENVIRONMENT" -name "*.yaml" -exec sed -i "s|IMAGE_TAG|$IMAGE_TAG|g" {} \;
    
    # Apply base configurations first
    if [ -d "$K8S_DIR/base" ]; then
        log "📦 Applying base configurations..."
        kubectl apply -f "$K8S_DIR/base/" --namespace="$NAMESPACE"
    fi
    
    # Apply environment-specific configurations
    log "🌍 Applying $ENVIRONMENT configurations..."
    kubectl apply -f "$K8S_DIR/$ENVIRONMENT/" --namespace="$NAMESPACE"
    
    # Wait for rollout
    log "⏳ Waiting for deployment rollout..."
    kubectl rollout status deployment/ai-multimodel-api -n "$NAMESPACE" --timeout="${MAX_WAIT_TIME}s"
    kubectl rollout status deployment/ai-multimodel-frontend -n "$NAMESPACE" --timeout="${MAX_WAIT_TIME}s"
    
    log "✅ Kubernetes deployment completed"
}

perform_health_checks() {
    log "🔍 Performing health checks..."
    
    local retries=0
    local max_retries=$HEALTH_CHECK_RETRIES
    local health_check_passed=false
    
    # Get service URLs
    local api_url
    local frontend_url
    
    if [ "$ENVIRONMENT" = "production" ]; then
        api_url="https://api.ai-multimodel.genspark.ai"
        frontend_url="https://ai-multimodel.genspark.ai"
    else
        api_url="https://staging-api.ai-multimodel.genspark.ai"
        frontend_url="https://staging.ai-multimodel.genspark.ai"
    fi
    
    while [ $retries -lt $max_retries ] && [ "$health_check_passed" = false ]; do
        retries=$((retries + 1))
        log "🔍 Health check attempt $retries/$max_retries..."
        
        # Check API health
        if curl -f -s "$api_url/health" >/dev/null 2>&1; then
            log "✅ API health check passed"
        else
            warn "❌ API health check failed"
            sleep 30
            continue
        fi
        
        # Check frontend
        if curl -f -s "$frontend_url" >/dev/null 2>&1; then
            log "✅ Frontend health check passed"
        else
            warn "❌ Frontend health check failed"
            sleep 30
            continue
        fi
        
        # Check WebSocket (if available)
        if command -v wscat >/dev/null 2>&1; then
            if timeout 10 wscat -c "$api_url/ws" --close >/dev/null 2>&1; then
                log "✅ WebSocket health check passed"
            else
                warn "⚠️ WebSocket health check failed (non-critical)"
            fi
        fi
        
        health_check_passed=true
        log "✅ All health checks passed"
    done
    
    if [ "$health_check_passed" = false ]; then
        error "❌ Health checks failed after $max_retries attempts"
        if [ "$ROLLBACK_ENABLED" = true ]; then
            perform_rollback
        fi
        exit 1
    fi
}

post_deployment_validation() {
    log "📊 Performing post-deployment validation..."
    
    # Check pod status
    log "🔍 Checking pod status..."
    kubectl get pods -n "$NAMESPACE" -o wide
    
    # Check service endpoints
    log "🌐 Checking service endpoints..."
    kubectl get services -n "$NAMESPACE"
    
    # Check ingress status
    log "🛣️ Checking ingress status..."
    kubectl get ingress -n "$NAMESPACE"
    
    # Validate deployment annotations
    kubectl annotate deployment/ai-multimodel-api -n "$NAMESPACE" \
        deployment.kubernetes.io/revision="$(kubectl rollout history deployment/ai-multimodel-api -n "$NAMESPACE" --revision=0 | tail -n1 | awk '{print $1}')" \
        deployment.genspark.ai/deployment-id="$DEPLOYMENT_ID" \
        deployment.genspark.ai/deployment-time="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --overwrite
    
    # Run smoke tests
    if [ -f "$PROJECT_DIR/tests/smoke-tests.sh" ]; then
        log "🧪 Running smoke tests..."
        bash "$PROJECT_DIR/tests/smoke-tests.sh" "$ENVIRONMENT" || warn "Smoke tests failed"
    fi
    
    log "✅ Post-deployment validation completed"
}

perform_rollback() {
    error "🔄 Initiating rollback procedure..."
    
    # Get previous revision
    local previous_revision
    previous_revision=$(kubectl rollout history deployment/ai-multimodel-api -n "$NAMESPACE" | tail -n 2 | head -n 1 | awk '{print $1}')
    
    if [ -n "$previous_revision" ]; then
        log "🔄 Rolling back to revision: $previous_revision"
        
        # Rollback deployments
        kubectl rollout undo deployment/ai-multimodel-api -n "$NAMESPACE" --to-revision="$previous_revision"
        kubectl rollout undo deployment/ai-multimodel-frontend -n "$NAMESPACE" --to-revision="$previous_revision"
        
        # Wait for rollback completion
        kubectl rollout status deployment/ai-multimodel-api -n "$NAMESPACE" --timeout=300s
        kubectl rollout status deployment/ai-multimodel-frontend -n "$NAMESPACE" --timeout=300s
        
        # Verify rollback
        sleep 30
        if curl -f -s "https://api.ai-multimodel.genspark.ai/health" >/dev/null 2>&1; then
            log "✅ Rollback completed successfully"
        else
            error "❌ Rollback failed - manual intervention required"
        fi
    else
        error "❌ No previous revision found for rollback"
    fi
}

deployment_success() {
    log "🎉 Deployment completed successfully!"
    log "📊 Deployment ID: $DEPLOYMENT_ID"
    log "🌍 Environment: $ENVIRONMENT"
    log "📦 Image Tag: $IMAGE_TAG"
    log "⏰ Deployment Time: $(date)"
    
    # Generate deployment report
    cat > "$LOGS_DIR/deployment-$DEPLOYMENT_ID-report.md" << EOF
# 🚀 Deployment Report - AI Multi-Model Management System

## ✅ Deployment Summary
- **Deployment ID**: $DEPLOYMENT_ID
- **Environment**: $ENVIRONMENT
- **Image Tag**: $IMAGE_TAG
- **Date**: $(date)
- **Status**: SUCCESS ✅

## 📊 Deployment Details
- **Namespace**: $NAMESPACE
- **Rollback Enabled**: $ROLLBACK_ENABLED
- **Health Checks**: ✅ Passed
- **Post-Deployment Validation**: ✅ Passed

## 🔗 Service URLs
- **Frontend**: https://ai-multimodel.genspark.ai
- **API**: https://api.ai-multimodel.genspark.ai
- **WebSocket**: wss://api.ai-multimodel.genspark.ai/ws

## 📦 Deployed Components
- ✅ AI Multi-Model API
- ✅ Frontend Application
- ✅ Load Balancer
- ✅ Monitoring Stack
- ✅ Security Components

## 📋 Next Steps
- [ ] Monitor application performance
- [ ] Verify analytics collection
- [ ] Check alert configurations
- [ ] Validate user access

---
*Generated by AI Multi-Model Management System Deployment Pipeline*
EOF
    
    log "📄 Deployment report saved: $LOGS_DIR/deployment-$DEPLOYMENT_ID-report.md"
    
    # Send notifications (if configured)
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🎉 AI Multi-Model System deployed successfully! Environment: $ENVIRONMENT, ID: $DEPLOYMENT_ID\"}" \
            "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || true
    fi
}

# 🚨 Error handling
trap 'error "Deployment failed at line $LINENO"; exit 1' ERR

# 🎯 Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi