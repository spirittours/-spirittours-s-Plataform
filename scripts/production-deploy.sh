#!/bin/bash
# 🚀 Production Deployment Script - AI Multi-Model Management System
# Fully automated production deployment with monitoring and rollback

set -euo pipefail

# 🎨 Colors and formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 📊 Configuration
DEPLOYMENT_ID="prod-deploy-$(date +%Y%m%d-%H%M%S)"
NAMESPACE="production"
HEALTH_CHECK_RETRIES=15
MONITORING_DURATION=900  # 15 minutes
ROLLBACK_ENABLED=${ROLLBACK_ENABLED:-true}
SLACK_ENABLED=${SLACK_ENABLED:-true}

# 🔧 URLs and endpoints
PRODUCTION_API="https://api.ai-multimodel.genspark.ai"
PRODUCTION_FRONTEND="https://ai-multimodel.genspark.ai"
WEBSOCKET_URL="wss://api.ai-multimodel.genspark.ai/ws"

# 📁 Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOGS_DIR="$PROJECT_DIR/deployment-logs/production"
K8S_DIR="$PROJECT_DIR/infrastructure/k8s"

# 🔧 Helper functions
log() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"; }
error() { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"; }
info() { echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] ℹ️  $1${NC}"; }

# 📊 Create logs directory
mkdir -p "$LOGS_DIR"
exec > >(tee -a "$LOGS_DIR/production-deployment-$DEPLOYMENT_ID.log")
exec 2>&1

# 🎯 Main deployment function
main() {
    log "🚀 Starting Production Deployment - AI Multi-Model Management System"
    log "📊 Deployment ID: $DEPLOYMENT_ID"
    log "🕐 Start Time: $(date)"
    
    # Comprehensive deployment flow
    validate_environment
    pre_deployment_checks
    backup_current_state
    deploy_infrastructure_updates
    blue_green_deployment
    comprehensive_health_checks
    performance_validation
    setup_monitoring_alerts
    post_deployment_monitoring
    cleanup_old_resources
    deployment_success_notification
    
    log "🎉 Production deployment completed successfully!"
}

validate_environment() {
    log "🔍 Validating production environment..."
    
    # Check required tools
    local required_tools=("kubectl" "helm" "docker" "curl" "jq" "bc")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            error "$tool is required but not installed"
            exit 1
        fi
    done
    
    # Validate Kubernetes connection
    if ! kubectl cluster-info >/dev/null 2>&1; then
        error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        error "Namespace '$NAMESPACE' does not exist"
        exit 1
    fi
    
    # Validate environment variables
    local required_vars=("IMAGE_TAG" "GITHUB_SHA" "GITHUB_REF_NAME")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    log "✅ Environment validation completed"
}

pre_deployment_checks() {
    log "🔍 Performing pre-deployment checks..."
    
    # Check current system health
    info "Checking current system health..."
    if ! curl -f -s "$PRODUCTION_API/health" >/dev/null 2>&1; then
        warn "Current production system is not responding"
    else
        log "Current production system is healthy"
    fi
    
    # Validate new image exists
    info "Validating Docker image..."
    if ! docker manifest inspect "ghcr.io/genspark/ai-multimodel:${IMAGE_TAG}" >/dev/null 2>&1; then
        error "Docker image ghcr.io/genspark/ai-multimodel:${IMAGE_TAG} does not exist"
        exit 1
    fi
    
    # Check resource availability
    info "Checking cluster resources..."
    local cpu_usage=$(kubectl top nodes --no-headers | awk '{sum+=$3} END {print sum}')
    local memory_usage=$(kubectl top nodes --no-headers | awk '{sum+=$5} END {print sum}')
    
    info "Current cluster CPU usage: ${cpu_usage}%"
    info "Current cluster Memory usage: ${memory_usage}%"
    
    # Validate Kubernetes manifests
    info "Validating Kubernetes manifests..."
    if ! kubectl apply --dry-run=client -f "$K8S_DIR/production/" >/dev/null 2>&1; then
        error "Kubernetes manifests validation failed"
        exit 1
    fi
    
    log "✅ Pre-deployment checks completed"
}

backup_current_state() {
    log "💾 Creating production backup..."
    
    local backup_dir="$LOGS_DIR/backups/$DEPLOYMENT_ID"
    mkdir -p "$backup_dir"
    
    # Backup Kubernetes resources
    info "Backing up Kubernetes resources..."
    kubectl get all -n "$NAMESPACE" -o yaml > "$backup_dir/current-state.yaml" 2>/dev/null || true
    kubectl get configmaps -n "$NAMESPACE" -o yaml > "$backup_dir/configmaps.yaml" 2>/dev/null || true
    kubectl get secrets -n "$NAMESPACE" -o yaml > "$backup_dir/secrets.yaml" 2>/dev/null || true
    kubectl get ingress -n "$NAMESPACE" -o yaml > "$backup_dir/ingress.yaml" 2>/dev/null || true
    kubectl get pvc -n "$NAMESPACE" -o yaml > "$backup_dir/pvc.yaml" 2>/dev/null || true
    
    # Backup database
    if kubectl get pods -n "$NAMESPACE" -l app=postgresql >/dev/null 2>&1; then
        info "Creating database backup..."
        kubectl exec -n "$NAMESPACE" deployment/postgresql -- \
            pg_dump -U postgres ai_multimodel > "$backup_dir/database-backup.sql" 2>/dev/null || \
            warn "Database backup failed - continuing anyway"
    fi
    
    # Create system snapshot
    info "Creating system snapshot..."
    cat > "$backup_dir/deployment-info.json" << EOF
{
    "deployment_id": "$DEPLOYMENT_ID",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "git_sha": "${GITHUB_SHA}",
    "git_branch": "${GITHUB_REF_NAME}",
    "image_tag": "${IMAGE_TAG}",
    "namespace": "$NAMESPACE"
}
EOF
    
    log "✅ Production backup completed: $backup_dir"
}

deploy_infrastructure_updates() {
    log "🏗️ Deploying infrastructure updates..."
    
    # Update ConfigMaps first
    info "Updating ConfigMaps..."
    kubectl apply -f "$K8S_DIR/base/configmap.yaml" -n "$NAMESPACE"
    
    # Update Services (if changed)
    info "Updating Services..."
    kubectl apply -f "$K8S_DIR/production/service.yaml" -n "$NAMESPACE"
    
    # Update Ingress configuration
    info "Updating Ingress..."
    kubectl apply -f "$K8S_DIR/production/ingress.yaml" -n "$NAMESPACE"
    
    # Update HPA and resource configurations
    info "Updating auto-scaling configurations..."
    kubectl apply -f "$K8S_DIR/production/hpa.yaml" -n "$NAMESPACE"
    
    log "✅ Infrastructure updates completed"
}

blue_green_deployment() {
    log "🔄 Starting Blue-Green deployment..."
    
    # Update image tag in deployment manifest
    info "Updating deployment manifest with new image..."
    local temp_manifest="/tmp/deployment-green-${DEPLOYMENT_ID}.yaml"
    cp "$K8S_DIR/production/deployment.yaml" "$temp_manifest"
    sed -i "s|IMAGE_TAG|${IMAGE_TAG}|g" "$temp_manifest"
    sed -i "s|version: blue|version: green|g" "$temp_manifest"
    sed -i "s|ai-multimodel-api|ai-multimodel-api-green|g" "$temp_manifest"
    
    # Deploy to green environment
    info "Deploying to green environment..."
    kubectl apply -f "$temp_manifest" -n "$NAMESPACE"
    
    # Wait for green deployment to be ready
    info "Waiting for green deployment rollout..."
    kubectl rollout status deployment/ai-multimodel-api-green -n "$NAMESPACE" --timeout=600s
    kubectl rollout status deployment/ai-multimodel-frontend-green -n "$NAMESPACE" --timeout=600s
    
    # Health check green environment
    info "Health checking green environment..."
    local green_pod_ip=$(kubectl get pods -n "$NAMESPACE" -l app=ai-multimodel-api,version=green -o jsonpath='{.items[0].status.podIP}')
    
    # Port forward to test green environment
    kubectl port-forward -n "$NAMESPACE" service/ai-multimodel-api-green 8081:3001 &
    local port_forward_pid=$!
    sleep 10
    
    # Test green environment
    local green_health_check=false
    for i in {1..10}; do
        if curl -f -s "http://localhost:8081/health" >/dev/null 2>&1; then
            green_health_check=true
            break
        fi
        sleep 5
    done
    
    # Kill port forward
    kill $port_forward_pid 2>/dev/null || true
    
    if [ "$green_health_check" = false ]; then
        error "Green environment health check failed"
        if [ "$ROLLBACK_ENABLED" = true ]; then
            cleanup_failed_green_deployment
        fi
        exit 1
    fi
    
    # Switch traffic to green
    info "Switching traffic to green environment..."
    kubectl patch service ai-multimodel-api -n "$NAMESPACE" \
        -p '{"spec":{"selector":{"version":"green"}}}'
    kubectl patch service ai-multimodel-frontend -n "$NAMESPACE" \
        -p '{"spec":{"selector":{"version":"green"}}}'
    
    # Wait for traffic switch
    sleep 30
    
    log "✅ Blue-Green deployment completed successfully"
}

comprehensive_health_checks() {
    log "🔍 Performing comprehensive health checks..."
    
    local health_passed=true
    local retry_count=0
    
    while [ $retry_count -lt $HEALTH_CHECK_RETRIES ]; do
        retry_count=$((retry_count + 1))
        info "Health check attempt $retry_count/$HEALTH_CHECK_RETRIES..."
        
        # API Health Check
        if curl -f -s "$PRODUCTION_API/health" | jq -e '.status == "ok"' >/dev/null 2>&1; then
            log "✅ API health check passed"
        else
            warn "❌ API health check failed"
            health_passed=false
        fi
        
        # Frontend Health Check
        if curl -f -s "$PRODUCTION_FRONTEND" | grep -q "AI Multi-Model"; then
            log "✅ Frontend health check passed"
        else
            warn "❌ Frontend health check failed"
            health_passed=false
        fi
        
        # WebSocket Health Check
        if command -v wscat >/dev/null 2>&1; then
            if timeout 10 wscat -c "$WEBSOCKET_URL" --close >/dev/null 2>&1; then
                log "✅ WebSocket health check passed"
            else
                warn "❌ WebSocket health check failed"
            fi
        fi
        
        # Database Connectivity Check
        if curl -f -s "$PRODUCTION_API/api/v1/health" | jq -e '.database == "connected"' >/dev/null 2>&1; then
            log "✅ Database connectivity check passed"
        else
            warn "❌ Database connectivity check failed"
            health_passed=false
        fi
        
        # Redis Connectivity Check
        if curl -f -s "$PRODUCTION_API/api/v1/health" | jq -e '.cache == "connected"' >/dev/null 2>&1; then
            log "✅ Redis connectivity check passed"
        else
            warn "❌ Redis connectivity check failed"
            health_passed=false
        fi
        
        if [ "$health_passed" = true ]; then
            log "✅ All health checks passed"
            break
        else
            if [ $retry_count -lt $HEALTH_CHECK_RETRIES ]; then
                warn "Health checks failed, retrying in 30 seconds..."
                sleep 30
                health_passed=true  # Reset for next iteration
            fi
        fi
    done
    
    if [ "$health_passed" = false ]; then
        error "Health checks failed after $HEALTH_CHECK_RETRIES attempts"
        if [ "$ROLLBACK_ENABLED" = true ]; then
            initiate_emergency_rollback
        fi
        exit 1
    fi
}

performance_validation() {
    log "📊 Performing performance validation..."
    
    # API Response Time Check
    info "Checking API response times..."
    local response_time=$(curl -w "%{time_total}" -o /dev/null -s "$PRODUCTION_API/health")
    if (( $(echo "$response_time > 2.0" | bc -l) )); then
        warn "High API response time: ${response_time}s (threshold: 2.0s)"
    else
        log "✅ API response time: ${response_time}s"
    fi
    
    # Frontend Load Time Check
    info "Checking frontend load times..."
    local frontend_load_time=$(curl -w "%{time_total}" -o /dev/null -s "$PRODUCTION_FRONTEND")
    if (( $(echo "$frontend_load_time > 3.0" | bc -l) )); then
        warn "High frontend load time: ${frontend_load_time}s (threshold: 3.0s)"
    else
        log "✅ Frontend load time: ${frontend_load_time}s"
    fi
    
    # Load Test (light)
    info "Running light load test..."
    if command -v artillery >/dev/null 2>&1; then
        artillery quick \
            --duration 60 \
            --rate 10 \
            "$PRODUCTION_API/health" > /tmp/load-test-results.txt 2>&1 || true
        
        local success_rate=$(grep "All virtual users finished" /tmp/load-test-results.txt | wc -l)
        if [ "$success_rate" -gt 0 ]; then
            log "✅ Light load test completed successfully"
        else
            warn "Load test completed with issues"
        fi
    fi
    
    log "✅ Performance validation completed"
}

setup_monitoring_alerts() {
    log "📊 Setting up monitoring and alerts..."
    
    # Update monitoring configurations
    info "Updating monitoring configurations..."
    if [ -f "$K8S_DIR/production/monitoring.yaml" ]; then
        kubectl apply -f "$K8S_DIR/production/monitoring.yaml" -n "$NAMESPACE"
    fi
    
    # Configure Prometheus alerts
    info "Configuring Prometheus alerts..."
    cat > "/tmp/deployment-alert-${DEPLOYMENT_ID}.yaml" << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: deployment-alerts-${DEPLOYMENT_ID}
  namespace: ${NAMESPACE}
data:
  deployment.yml: |
    groups:
    - name: deployment.rules
      rules:
      - alert: DeploymentHighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        annotations:
          summary: "High error rate detected after deployment"
          deployment_id: "${DEPLOYMENT_ID}"
      - alert: DeploymentHighLatency  
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        annotations:
          summary: "High latency detected after deployment"
          deployment_id: "${DEPLOYMENT_ID}"
EOF
    
    kubectl apply -f "/tmp/deployment-alert-${DEPLOYMENT_ID}.yaml"
    
    # Send deployment notification to monitoring systems
    if [ -n "${DATADOG_API_KEY:-}" ]; then
        info "Notifying Datadog of deployment..."
        curl -X POST "https://api.datadoghq.com/api/v1/events" \
            -H "Content-Type: application/json" \
            -H "DD-API-KEY: ${DATADOG_API_KEY}" \
            -d '{
                "title": "AI Multi-Model Production Deployment",
                "text": "Deployment '${DEPLOYMENT_ID}' completed successfully",
                "tags": ["environment:production", "service:ai-multimodel", "deployment_id:'${DEPLOYMENT_ID}'"],
                "alert_type": "info"
            }' >/dev/null 2>&1 || warn "Failed to notify Datadog"
    fi
    
    log "✅ Monitoring and alerts configured"
}

post_deployment_monitoring() {
    log "📊 Starting post-deployment monitoring (${MONITORING_DURATION}s)..."
    
    local monitoring_start=$(date +%s)
    local monitoring_end=$((monitoring_start + MONITORING_DURATION))
    local check_interval=60
    local issues_detected=false
    
    while [ $(date +%s) -lt $monitoring_end ]; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - monitoring_start))
        local remaining=$((monitoring_end - current_time))
        
        info "Monitoring progress: ${elapsed}s elapsed, ${remaining}s remaining..."
        
        # Check error rates
        local error_count=$(curl -s "$PRODUCTION_API/api/v1/metrics" | grep -o 'http_errors_total [0-9]*' | awk '{sum+=$2} END {print sum+0}')
        local request_count=$(curl -s "$PRODUCTION_API/api/v1/metrics" | grep -o 'http_requests_total [0-9]*' | awk '{sum+=$2} END {print sum+0}')
        
        if [ "$request_count" -gt 0 ]; then
            local error_rate=$(echo "scale=4; $error_count / $request_count" | bc)
            if (( $(echo "$error_rate > 0.05" | bc -l) )); then
                warn "High error rate detected: ${error_rate} (${error_count}/${request_count})"
                issues_detected=true
            fi
        fi
        
        # Check response times
        local response_time=$(curl -w "%{time_total}" -o /dev/null -s "$PRODUCTION_API/health")
        if (( $(echo "$response_time > 2.0" | bc -l) )); then
            warn "High response time detected: ${response_time}s"
            issues_detected=true
        fi
        
        # Check pod status
        local unhealthy_pods=$(kubectl get pods -n "$NAMESPACE" --no-headers | grep -v Running | grep -v Completed | wc -l)
        if [ "$unhealthy_pods" -gt 0 ]; then
            warn "Unhealthy pods detected: $unhealthy_pods"
            kubectl get pods -n "$NAMESPACE" --no-headers | grep -v Running | grep -v Completed
        fi
        
        sleep $check_interval
    done
    
    if [ "$issues_detected" = true ]; then
        warn "Issues detected during monitoring period"
        # Note: Not failing deployment, but alerting for investigation
    else
        log "✅ Post-deployment monitoring completed successfully"
    fi
}

cleanup_old_resources() {
    log "🧹 Cleaning up old resources..."
    
    # Remove old blue deployment
    info "Removing old blue deployment..."
    kubectl delete deployment ai-multimodel-api -n "$NAMESPACE" --ignore-not-found=true
    kubectl delete deployment ai-multimodel-frontend -n "$NAMESPACE" --ignore-not-found=true
    
    # Rename green deployment to blue (standard)
    info "Renaming green deployment to blue..."
    kubectl patch deployment ai-multimodel-api-green -n "$NAMESPACE" \
        -p '{"metadata":{"name":"ai-multimodel-api"}}'
    kubectl patch deployment ai-multimodel-frontend-green -n "$NAMESPACE" \
        -p '{"metadata":{"name":"ai-multimodel-frontend"}}'
    
    # Update service selectors to point to blue
    kubectl patch service ai-multimodel-api -n "$NAMESPACE" \
        -p '{"spec":{"selector":{"version":"blue"}}}'
    kubectl patch service ai-multimodel-frontend -n "$NAMESPACE" \
        -p '{"spec":{"selector":{"version":"blue"}}}'
    
    # Clean up old ReplicaSets (keep last 3)
    info "Cleaning up old ReplicaSets..."
    kubectl get rs -n "$NAMESPACE" --sort-by=.metadata.creationTimestamp -o name | head -n -3 | \
        xargs -r kubectl delete -n "$NAMESPACE" --ignore-not-found=true
    
    # Clean up old ConfigMaps and secrets (deployment-specific ones)
    info "Cleaning up old deployment-specific resources..."
    kubectl get configmaps -n "$NAMESPACE" -o name | grep "deployment-alerts-" | head -n -5 | \
        xargs -r kubectl delete -n "$NAMESPACE" --ignore-not-found=true
    
    log "✅ Cleanup completed"
}

initiate_emergency_rollback() {
    error "🔄 Initiating emergency rollback..."
    
    # Get previous successful deployment
    local previous_revision=$(kubectl rollout history deployment/ai-multimodel-api -n "$NAMESPACE" | tail -n 2 | head -n 1 | awk '{print $1}')
    
    if [ -n "$previous_revision" ] && [ "$previous_revision" != "REVISION" ]; then
        info "Rolling back to revision: $previous_revision"
        
        # Perform rollback
        kubectl rollout undo deployment/ai-multimodel-api -n "$NAMESPACE" --to-revision="$previous_revision"
        kubectl rollout undo deployment/ai-multimodel-frontend -n "$NAMESPACE" --to-revision="$previous_revision"
        
        # Wait for rollback completion
        kubectl rollout status deployment/ai-multimodel-api -n "$NAMESPACE" --timeout=300s
        kubectl rollout status deployment/ai-multimodel-frontend -n "$NAMESPACE" --timeout=300s
        
        # Verify rollback health
        sleep 30
        if curl -f -s "$PRODUCTION_API/health" >/dev/null 2>&1; then
            log "✅ Emergency rollback completed successfully"
            send_rollback_notification
        else
            error "❌ Emergency rollback failed - manual intervention required"
        fi
    else
        error "❌ No previous revision found for rollback - manual intervention required"
    fi
}

cleanup_failed_green_deployment() {
    warn "🧹 Cleaning up failed green deployment..."
    kubectl delete deployment ai-multimodel-api-green -n "$NAMESPACE" --ignore-not-found=true
    kubectl delete deployment ai-multimodel-frontend-green -n "$NAMESPACE" --ignore-not-found=true
}

send_rollback_notification() {
    if [ "$SLACK_ENABLED" = true ] && [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d '{
                "text": "🚨 EMERGENCY ROLLBACK EXECUTED",
                "blocks": [
                    {
                        "type": "section", 
                        "text": {
                            "type": "mrkdwn",
                            "text": "*🔄 Emergency Rollback Completed*\n\nDeployment ID: '${DEPLOYMENT_ID}'\nNamespace: '${NAMESPACE}'\nTime: '$(date)'\n\nProduction has been restored to previous stable version."
                        }
                    }
                ]
            }' >/dev/null 2>&1 || warn "Failed to send rollback notification"
    fi
}

deployment_success_notification() {
    log "📢 Sending deployment success notifications..."
    
    # Generate deployment report
    cat > "$LOGS_DIR/deployment-success-$DEPLOYMENT_ID.json" << EOF
{
    "deployment_id": "$DEPLOYMENT_ID",
    "status": "SUCCESS",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "git_sha": "${GITHUB_SHA}",
    "git_branch": "${GITHUB_REF_NAME}",
    "image_tag": "${IMAGE_TAG}",
    "namespace": "$NAMESPACE",
    "urls": {
        "frontend": "$PRODUCTION_FRONTEND",
        "api": "$PRODUCTION_API",
        "websocket": "$WEBSOCKET_URL"
    },
    "duration_seconds": $(($(date +%s) - $(date -d "$(grep "Starting Production Deployment" "$LOGS_DIR/production-deployment-$DEPLOYMENT_ID.log" | head -1 | cut -d']' -f1 | tr -d '[')" +%s))),
    "monitoring_enabled": true,
    "rollback_available": true
}
EOF
    
    # Send Slack notification
    if [ "$SLACK_ENABLED" = true ] && [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d '{
                "text": "🎉 AI Multi-Model Production Deployment Successful!",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn", 
                            "text": "*🚀 Production Deployment Completed*\n\nDeployment ID: '${DEPLOYMENT_ID}'\nCommit: '${GITHUB_SHA}'\nBranch: '${GITHUB_REF_NAME}'\nTime: '$(date)'\n\n✅ All health checks passed\n✅ Performance validated\n✅ Monitoring active\n\n🌐 Frontend: '${PRODUCTION_FRONTEND}'\n🔗 API: '${PRODUCTION_API}'"
                        }
                    }
                ]
            }' >/dev/null 2>&1 || warn "Failed to send success notification"
    fi
    
    # Update deployment status in monitoring systems
    if [ -n "${DATADOG_API_KEY:-}" ]; then
        curl -X POST "https://api.datadoghq.com/api/v1/events" \
            -H "Content-Type: application/json" \
            -H "DD-API-KEY: ${DATADOG_API_KEY}" \
            -d '{
                "title": "AI Multi-Model Production Deployment Success",
                "text": "Deployment '${DEPLOYMENT_ID}' completed successfully with all validations passed",
                "tags": ["environment:production", "service:ai-multimodel", "deployment_id:'${DEPLOYMENT_ID}'", "status:success"],
                "alert_type": "success"
            }' >/dev/null 2>&1 || warn "Failed to update Datadog"
    fi
    
    log "📢 Success notifications sent"
}

# 🚨 Error handling and cleanup
cleanup_on_exit() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        error "Deployment failed with exit code $exit_code"
        
        # Send failure notification
        if [ "$SLACK_ENABLED" = true ] && [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
            curl -X POST "$SLACK_WEBHOOK_URL" \
                -H "Content-Type: application/json" \
                -d '{
                    "text": "🚨 Production Deployment Failed",
                    "blocks": [{
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*❌ Production Deployment Failed*\n\nDeployment ID: '${DEPLOYMENT_ID}'\nExit Code: '${exit_code}'\nCheck logs for details."
                        }
                    }]
                }' >/dev/null 2>&1 || true
        fi
    fi
    
    # Cleanup temporary files
    rm -f /tmp/deployment-*.yaml
    rm -f /tmp/load-test-results.txt
}

trap cleanup_on_exit EXIT

# 🎯 Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Validate required environment variables
    if [[ -z "${IMAGE_TAG:-}" ]]; then
        export IMAGE_TAG="${GITHUB_SHA:-latest}"
    fi
    
    if [[ -z "${GITHUB_SHA:-}" ]]; then
        export GITHUB_SHA="$(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
    fi
    
    if [[ -z "${GITHUB_REF_NAME:-}" ]]; then
        export GITHUB_REF_NAME="$(git branch --show-current 2>/dev/null || echo 'unknown')"
    fi
    
    main "$@"
fi