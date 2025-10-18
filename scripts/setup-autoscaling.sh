#!/bin/bash

################################################################################
# AUTO-SCALING SETUP SCRIPT
################################################################################
# Purpose: Configure auto-scaling for production environment
# Author: AI Developer
# Date: 2025-10-18
# Version: 1.0.0
#
# Usage: sudo ./scripts/setup-autoscaling.sh
#
# Features:
# - Docker Swarm configuration
# - Service auto-scaling rules
# - Load balancing
# - Health-based scaling
# - Resource-based scaling
#
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

################################################################################
# DOCKER SWARM INITIALIZATION
################################################################################

init_swarm() {
    log_info "Initializing Docker Swarm..."
    
    if docker info | grep -q "Swarm: active"; then
        log "Docker Swarm already initialized"
    else
        docker swarm init
        log "✅ Docker Swarm initialized"
    fi
}

################################################################################
# CREATE AUTO-SCALING STACK
################################################################################

create_autoscaling_stack() {
    log_info "Creating auto-scaling Docker stack..."
    
    cat > "${PROJECT_ROOT}/docker-stack-autoscale.yml" << 'EOF'
version: '3.8'

services:
  api:
    image: ${DOCKER_REGISTRY}/api:${VERSION:-latest}
    deploy:
      mode: replicated
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
        monitor: 30s
      rollback_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
      placement:
        constraints:
          - node.role == worker
        preferences:
          - spread: node.labels.zone
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.api.rule=Host(`api.yourdomain.com`)"
        - "traefik.http.services.api.loadbalancer.server.port=8000"
        - "traefik.http.services.api.loadbalancer.healthcheck.path=/health"
        - "traefik.http.services.api.loadbalancer.healthcheck.interval=10s"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - SECRET_KEY=${SECRET_KEY}
    networks:
      - app_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  email_worker:
    image: ${DOCKER_REGISTRY}/email_worker:${VERSION:-latest}
    deploy:
      mode: replicated
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      placement:
        constraints:
          - node.role == worker
      resources:
        limits:
          cpus: '1'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
    networks:
      - app_network

  frontend:
    image: ${DOCKER_REGISTRY}/frontend:${VERSION:-latest}
    deploy:
      mode: replicated
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.frontend.rule=Host(`yourdomain.com`)"
        - "traefik.http.services.frontend.loadbalancer.server.port=80"
    networks:
      - app_network

  traefik:
    image: traefik:v2.10
    command:
      - "--api.dashboard=true"
      - "--providers.docker.swarmMode=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@yourdomain.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--metrics.prometheus=true"
    deploy:
      mode: global
      placement:
        constraints:
          - node.role == manager
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.dashboard.rule=Host(`traefik.yourdomain.com`)"
        - "traefik.http.routers.dashboard.service=api@internal"
        - "traefik.http.routers.dashboard.middlewares=auth"
        - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$..."
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_letsencrypt:/letsencrypt
    networks:
      - app_network

networks:
  app_network:
    driver: overlay
    attachable: true

volumes:
  traefik_letsencrypt:
EOF
    
    log "✅ Auto-scaling stack configuration created"
}

################################################################################
# AUTO-SCALING SCRIPT
################################################################################

create_autoscaling_script() {
    log_info "Creating auto-scaling monitor script..."
    
    cat > "${PROJECT_ROOT}/scripts/autoscale-monitor.sh" << 'EOF'
#!/bin/bash

################################################################################
# AUTO-SCALING MONITOR
################################################################################
# Purpose: Monitor metrics and scale services automatically
#
# Usage: Run as cron job: */5 * * * * /path/to/autoscale-monitor.sh
################################################################################

set -euo pipefail

# Configuration
SERVICE_NAME="api"
MIN_REPLICAS=2
MAX_REPLICAS=10
CPU_THRESHOLD=70
MEMORY_THRESHOLD=80
RESPONSE_TIME_THRESHOLD=500  # milliseconds
SCALE_UP_COOLDOWN=300  # 5 minutes
SCALE_DOWN_COOLDOWN=600  # 10 minutes

# State file
STATE_FILE="/tmp/autoscale_state"
touch "$STATE_FILE"

# Get current metrics
get_current_replicas() {
    docker service ls --filter name="${SERVICE_NAME}" --format "{{.Replicas}}" | cut -d'/' -f1
}

get_cpu_usage() {
    # Query Prometheus for average CPU usage
    curl -s "http://localhost:9090/api/v1/query?query=avg(rate(container_cpu_usage_seconds_total{name=~\"${SERVICE_NAME}.*\"}[5m]))*100" \
        | jq -r '.data.result[0].value[1]' | cut -d'.' -f1
}

get_memory_usage() {
    # Query Prometheus for average memory usage
    curl -s "http://localhost:9090/api/v1/query?query=avg(container_memory_usage_bytes{name=~\"${SERVICE_NAME}.*\"}/container_spec_memory_limit_bytes{name=~\"${SERVICE_NAME}.*\"})*100" \
        | jq -r '.data.result[0].value[1]' | cut -d'.' -f1
}

get_response_time() {
    # Query Prometheus for p95 response time
    curl -s "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95,sum(rate(http_request_duration_seconds_bucket[5m]))by(le))*1000" \
        | jq -r '.data.result[0].value[1]' | cut -d'.' -f1
}

get_request_rate() {
    # Query Prometheus for request rate
    curl -s "http://localhost:9090/api/v1/query?query=sum(rate(http_requests_total[5m]))" \
        | jq -r '.data.result[0].value[1]'
}

check_cooldown() {
    local action=$1
    local last_action_time=$(grep "^last_${action}_time=" "$STATE_FILE" 2>/dev/null | cut -d'=' -f2 || echo 0)
    local current_time=$(date +%s)
    local cooldown_period
    
    if [ "$action" = "scale_up" ]; then
        cooldown_period=$SCALE_UP_COOLDOWN
    else
        cooldown_period=$SCALE_DOWN_COOLDOWN
    fi
    
    if [ $((current_time - last_action_time)) -lt $cooldown_period ]; then
        return 1  # Still in cooldown
    fi
    return 0  # Cooldown expired
}

update_last_action_time() {
    local action=$1
    sed -i "/^last_${action}_time=/d" "$STATE_FILE"
    echo "last_${action}_time=$(date +%s)" >> "$STATE_FILE"
}

scale_service() {
    local new_replicas=$1
    local reason=$2
    
    echo "[$(date)] Scaling ${SERVICE_NAME} to ${new_replicas} replicas. Reason: ${reason}"
    docker service scale "${SERVICE_NAME}=${new_replicas}"
    
    # Send notification
    curl -X POST http://localhost:9093/api/v1/alerts -d "[{
        \"labels\": {
            \"alertname\": \"AutoScaling\",
            \"service\": \"${SERVICE_NAME}\",
            \"severity\": \"info\"
        },
        \"annotations\": {
            \"summary\": \"Service auto-scaled\",
            \"description\": \"${SERVICE_NAME} scaled to ${new_replicas} replicas. Reason: ${reason}\"
        }
    }]"
}

# Main logic
main() {
    # Get current state
    CURRENT_REPLICAS=$(get_current_replicas)
    CPU_USAGE=$(get_cpu_usage)
    MEMORY_USAGE=$(get_memory_usage)
    RESPONSE_TIME=$(get_response_time)
    REQUEST_RATE=$(get_request_rate)
    
    echo "[$(date)] Current: replicas=${CURRENT_REPLICAS}, CPU=${CPU_USAGE}%, Memory=${MEMORY_USAGE}%, Response=${RESPONSE_TIME}ms, Rate=${REQUEST_RATE}req/s"
    
    # Decide whether to scale
    SHOULD_SCALE_UP=false
    SHOULD_SCALE_DOWN=false
    SCALE_REASON=""
    
    # Scale up conditions
    if [ "${CPU_USAGE}" -gt "${CPU_THRESHOLD}" ]; then
        SHOULD_SCALE_UP=true
        SCALE_REASON="High CPU usage (${CPU_USAGE}%)"
    elif [ "${MEMORY_USAGE}" -gt "${MEMORY_THRESHOLD}" ]; then
        SHOULD_SCALE_UP=true
        SCALE_REASON="High memory usage (${MEMORY_USAGE}%)"
    elif [ "${RESPONSE_TIME}" -gt "${RESPONSE_TIME_THRESHOLD}" ]; then
        SHOULD_SCALE_UP=true
        SCALE_REASON="High response time (${RESPONSE_TIME}ms)"
    fi
    
    # Scale down conditions
    if [ "${CPU_USAGE}" -lt 30 ] && [ "${MEMORY_USAGE}" -lt 40 ] && [ "${RESPONSE_TIME}" -lt 200 ]; then
        SHOULD_SCALE_DOWN=true
        SCALE_REASON="Low resource usage"
    fi
    
    # Execute scaling
    if [ "$SHOULD_SCALE_UP" = true ] && [ "${CURRENT_REPLICAS}" -lt "${MAX_REPLICAS}" ]; then
        if check_cooldown "scale_up"; then
            NEW_REPLICAS=$((CURRENT_REPLICAS + 1))
            scale_service "$NEW_REPLICAS" "$SCALE_REASON"
            update_last_action_time "scale_up"
        else
            echo "[$(date)] Scale up requested but in cooldown period"
        fi
    elif [ "$SHOULD_SCALE_DOWN" = true ] && [ "${CURRENT_REPLICAS}" -gt "${MIN_REPLICAS}" ]; then
        if check_cooldown "scale_down"; then
            NEW_REPLICAS=$((CURRENT_REPLICAS - 1))
            scale_service "$NEW_REPLICAS" "$SCALE_REASON"
            update_last_action_time "scale_down"
        else
            echo "[$(date)] Scale down requested but in cooldown period"
        fi
    else
        echo "[$(date)] No scaling action needed"
    fi
}

main "$@"
EOF
    
    chmod +x "${PROJECT_ROOT}/scripts/autoscale-monitor.sh"
    
    log "✅ Auto-scaling monitor script created"
}

################################################################################
# SETUP CRON JOB
################################################################################

setup_cron() {
    log_info "Setting up cron job for auto-scaling..."
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "*/5 * * * * ${PROJECT_ROOT}/scripts/autoscale-monitor.sh >> /var/log/autoscale.log 2>&1") | crontab -
    
    log "✅ Cron job configured (runs every 5 minutes)"
}

################################################################################
# MAIN
################################################################################

main() {
    log "=========================================="
    log "AUTO-SCALING SETUP"
    log "=========================================="
    
    init_swarm
    create_autoscaling_stack
    create_autoscaling_script
    setup_cron
    
    log "=========================================="
    log "AUTO-SCALING SETUP COMPLETE"
    log "=========================================="
    log ""
    log "Next steps:"
    log "1. Deploy stack: docker stack deploy -c docker-stack-autoscale.yml myapp"
    log "2. Monitor scaling: watch docker service ls"
    log "3. View logs: tail -f /var/log/autoscale.log"
}

main "$@"
