#!/bin/bash

################################################################################
# ADVANCED MONITORING SETUP SCRIPT
################################################################################
# Purpose: Complete monitoring stack with Prometheus, Grafana, Loki, and Alertmanager
# Author: AI Developer
# Date: 2025-10-18
# Version: 1.0.0
#
# Usage: sudo ./scripts/setup-monitoring-advanced.sh
#
# Features:
# - Prometheus metrics collection
# - Grafana visualization dashboards
# - Loki log aggregation
# - Alertmanager notification routing
# - Pre-configured dashboards and alerts
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
MONITORING_DIR="${PROJECT_ROOT}/monitoring"
PROMETHEUS_VERSION="2.45.0"
GRAFANA_VERSION="10.0.0"
LOKI_VERSION="2.8.0"

################################################################################
# LOGGING FUNCTIONS
################################################################################

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
# DIRECTORY SETUP
################################################################################

create_directories() {
    log_info "Creating monitoring directories..."
    
    mkdir -p "${MONITORING_DIR}"/{prometheus,grafana,loki,alertmanager,promtail}
    mkdir -p "${MONITORING_DIR}/grafana/dashboards"
    mkdir -p "${MONITORING_DIR}/grafana/datasources"
    
    log "✅ Directories created"
}

################################################################################
# PROMETHEUS CONFIGURATION
################################################################################

setup_prometheus() {
    log_info "Configuring Prometheus..."
    
    cat > "${MONITORING_DIR}/prometheus/prometheus.yml" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'production'
    environment: 'prod'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

# Load rules once and periodically evaluate them
rule_files:
  - "alerts/*.yml"

# Scrape configurations
scrape_configs:
  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
  
  # API Service
  - job_name: 'api'
    static_configs:
      - targets: ['api:8000']
    metrics_path: '/metrics'
  
  # Email Worker
  - job_name: 'email_worker'
    static_configs:
      - targets: ['email_worker:8001']
    metrics_path: '/metrics'
  
  # PostgreSQL
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
  
  # Redis
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
  
  # Node Exporter (system metrics)
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
  
  # Nginx
  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx-exporter:9113']
  
  # Blackbox Exporter (endpoint monitoring)
  - job_name: 'blackbox'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
        - http://api:8000/health
        - http://frontend/health
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115
EOF
    
    log "✅ Prometheus configured"
}

################################################################################
# PROMETHEUS ALERTS
################################################################################

setup_prometheus_alerts() {
    log_info "Creating Prometheus alert rules..."
    
    mkdir -p "${MONITORING_DIR}/prometheus/alerts"
    
    cat > "${MONITORING_DIR}/prometheus/alerts/api_alerts.yml" << 'EOF'
groups:
  - name: api_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) > 0.01
        for: 5m
        labels:
          severity: critical
          component: api
        annotations:
          summary: "High API error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 1%)"
      
      # Slow response time
      - alert: SlowResponseTime
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
          ) > 1
        for: 10m
        labels:
          severity: warning
          component: api
        annotations:
          summary: "API response time is slow"
          description: "95th percentile response time is {{ $value }}s (threshold: 1s)"
      
      # High CPU usage
      - alert: HighCPUUsage
        expr: |
          100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 10m
        labels:
          severity: warning
          component: system
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is {{ $value }}% (threshold: 80%)"
      
      # High memory usage
      - alert: HighMemoryUsage
        expr: |
          (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 10m
        labels:
          severity: warning
          component: system
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is {{ $value }}% (threshold: 85%)"
      
      # Disk space
      - alert: LowDiskSpace
        expr: |
          (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 20
        for: 5m
        labels:
          severity: critical
          component: system
        annotations:
          summary: "Low disk space"
          description: "Disk space is {{ $value }}% available (threshold: 20%)"
      
      # Email queue backlog
      - alert: EmailQueueBacklog
        expr: redis_list_length{key="email_queue"} > 10000
        for: 15m
        labels:
          severity: warning
          component: email
        annotations:
          summary: "Email queue backlog"
          description: "Email queue has {{ $value }} pending emails (threshold: 10000)"
      
      # Database connection pool exhaustion
      - alert: DatabaseConnectionPoolExhaustion
        expr: |
          (
            pg_stat_database_numbackends
            /
            pg_settings_max_connections
          ) > 0.8
        for: 5m
        labels:
          severity: critical
          component: database
        annotations:
          summary: "Database connection pool near exhaustion"
          description: "Using {{ $value | humanizePercentage }} of available connections"
EOF
    
    log "✅ Prometheus alerts configured"
}

################################################################################
# ALERTMANAGER CONFIGURATION
################################################################################

setup_alertmanager() {
    log_info "Configuring Alertmanager..."
    
    cat > "${MONITORING_DIR}/alertmanager/alertmanager.yml" << 'EOF'
global:
  resolve_timeout: 5m
  smtp_smarthost: '${SMTP_HOST}:${SMTP_PORT}'
  smtp_from: '${ALERT_FROM_EMAIL}'
  smtp_auth_username: '${SMTP_USERNAME}'
  smtp_auth_password: '${SMTP_PASSWORD}'
  smtp_require_tls: true

# Templates for notifications
templates:
  - '/etc/alertmanager/templates/*.tmpl'

# Route tree
route:
  # Default receiver
  receiver: 'team-email'
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  
  # Routes for different severity levels
  routes:
    # Critical alerts - immediate notification
    - match:
        severity: critical
      receiver: 'team-email'
      continue: true
      repeat_interval: 5m
    
    - match:
        severity: critical
      receiver: 'slack-critical'
      continue: true
    
    # Warning alerts - less frequent
    - match:
        severity: warning
      receiver: 'team-email'
      repeat_interval: 4h
    
    # Info alerts - low priority
    - match:
        severity: info
      receiver: 'slack-info'

# Receivers
receivers:
  - name: 'team-email'
    email_configs:
      - to: '${ALERT_TO_EMAIL}'
        headers:
          Subject: '🚨 {{ .GroupLabels.alertname }} - {{ .GroupLabels.severity }}'
        html: |
          <h2>Alert: {{ .GroupLabels.alertname }}</h2>
          <p><strong>Severity:</strong> {{ .GroupLabels.severity }}</p>
          <p><strong>Summary:</strong> {{ .CommonAnnotations.summary }}</p>
          <p><strong>Description:</strong> {{ .CommonAnnotations.description }}</p>
          <p><strong>Started:</strong> {{ .StartsAt }}</p>
  
  - name: 'slack-critical'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts-critical'
        title: '🚨 {{ .GroupLabels.alertname }}'
        text: '{{ .CommonAnnotations.summary }}\n{{ .CommonAnnotations.description }}'
        send_resolved: true
  
  - name: 'slack-info'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts-info'
        title: 'ℹ️ {{ .GroupLabels.alertname }}'
        text: '{{ .CommonAnnotations.summary }}'
        send_resolved: false

# Inhibition rules (suppress certain alerts)
inhibit_rules:
  # Suppress warning if critical is firing
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'cluster', 'service']
EOF
    
    log "✅ Alertmanager configured"
}

################################################################################
# LOKI CONFIGURATION
################################################################################

setup_loki() {
    log_info "Configuring Loki..."
    
    cat > "${MONITORING_DIR}/loki/loki-config.yml" << 'EOF'
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2023-01-01
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    cache_ttl: 24h
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

compactor:
  working_directory: /loki/boltdb-shipper-compactor
  shared_store: filesystem

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  ingestion_rate_mb: 10
  ingestion_burst_size_mb: 20

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: true
  retention_period: 720h

ruler:
  alertmanager_url: http://alertmanager:9093
EOF
    
    log "✅ Loki configured"
}

################################################################################
# PROMTAIL CONFIGURATION
################################################################################

setup_promtail() {
    log_info "Configuring Promtail..."
    
    cat > "${MONITORING_DIR}/promtail/promtail-config.yml" << 'EOF'
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Docker containers
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: 'stream'
    pipeline_stages:
      - json:
          expressions:
            timestamp: timestamp
            level: level
            message: message
      - timestamp:
          source: timestamp
          format: RFC3339
      - labels:
          level:
  
  # System logs
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: syslog
          __path__: /var/log/syslog
  
  # Nginx access logs
  - job_name: nginx
    static_configs:
      - targets:
          - localhost
        labels:
          job: nginx
          __path__: /var/log/nginx/access.log
    pipeline_stages:
      - regex:
          expression: '^(?P<remote_addr>[\w\.]+) - (?P<remote_user>[^ ]*) \[(?P<time_local>.*)\] "(?P<request>[^"]*)" (?P<status>\d+) (?P<body_bytes_sent>\d+)'
      - labels:
          remote_addr:
          status:
EOF
    
    log "✅ Promtail configured"
}

################################################################################
# GRAFANA DASHBOARDS
################################################################################

setup_grafana_dashboards() {
    log_info "Creating Grafana dashboards..."
    
    # Dashboard provisioning
    cat > "${MONITORING_DIR}/grafana/dashboards/dashboard-provisioning.yml" << 'EOF'
apiVersion: 1

providers:
  - name: 'Default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
      foldersFromFilesStructure: true
EOF
    
    # Datasource provisioning
    cat > "${MONITORING_DIR}/grafana/datasources/datasources.yml" << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
  
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: false
EOF
    
    log "✅ Grafana dashboards configured"
}

################################################################################
# DOCKER COMPOSE MONITORING STACK
################################################################################

create_monitoring_compose() {
    log_info "Creating monitoring Docker Compose stack..."
    
    cat > "${MONITORING_DIR}/docker-compose.monitoring.yml" << 'EOF'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    volumes:
      - ./prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - monitoring
  
  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    restart: unless-stopped
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    volumes:
      - ./alertmanager:/etc/alertmanager
      - alertmanager_data:/alertmanager
    ports:
      - "9093:9093"
    networks:
      - monitoring
  
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_ADMIN_USER:-admin}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    volumes:
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
      - grafana_data:/var/lib/grafana
    ports:
      - "3000:3000"
    networks:
      - monitoring
    depends_on:
      - prometheus
      - loki
  
  loki:
    image: grafana/loki:latest
    container_name: loki
    restart: unless-stopped
    command: -config.file=/etc/loki/loki-config.yml
    volumes:
      - ./loki:/etc/loki
      - loki_data:/loki
    ports:
      - "3100:3100"
    networks:
      - monitoring
  
  promtail:
    image: grafana/promtail:latest
    container_name: promtail
    restart: unless-stopped
    command: -config.file=/etc/promtail/promtail-config.yml
    volumes:
      - ./promtail:/etc/promtail
      - /var/log:/var/log:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - monitoring
    depends_on:
      - loki
  
  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    restart: unless-stopped
    command:
      - '--path.rootfs=/host'
    volumes:
      - /:/host:ro,rslave
    ports:
      - "9100:9100"
    networks:
      - monitoring
  
  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    container_name: postgres-exporter
    restart: unless-stopped
    environment:
      DATA_SOURCE_NAME: "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}?sslmode=disable"
    ports:
      - "9187:9187"
    networks:
      - monitoring
  
  redis-exporter:
    image: oliver006/redis_exporter:latest
    container_name: redis-exporter
    restart: unless-stopped
    environment:
      REDIS_ADDR: "redis:6379"
    ports:
      - "9121:9121"
    networks:
      - monitoring

networks:
  monitoring:
    driver: bridge

volumes:
  prometheus_data:
  alertmanager_data:
  grafana_data:
  loki_data:
EOF
    
    log "✅ Monitoring Docker Compose created"
}

################################################################################
# MAIN SETUP
################################################################################

main() {
    log "=========================================="
    log "ADVANCED MONITORING SETUP"
    log "=========================================="
    
    create_directories
    setup_prometheus
    setup_prometheus_alerts
    setup_alertmanager
    setup_loki
    setup_promtail
    setup_grafana_dashboards
    create_monitoring_compose
    
    log "=========================================="
    log "MONITORING SETUP COMPLETE"
    log "=========================================="
    log ""
    log "Next steps:"
    log "1. Configure environment variables in .env file"
    log "2. Start monitoring stack:"
    log "   cd ${MONITORING_DIR}"
    log "   docker compose -f docker-compose.monitoring.yml up -d"
    log ""
    log "Access:"
    log "- Prometheus: http://localhost:9090"
    log "- Grafana: http://localhost:3000 (admin/${GRAFANA_ADMIN_PASSWORD})"
    log "- Alertmanager: http://localhost:9093"
    log "- Loki: http://localhost:3100"
}

main "$@"
