#!/bin/bash
# 💾 Backup & Disaster Recovery System - AI Multi-Model Management System
# Comprehensive backup and recovery procedures for enterprise deployment

set -euo pipefail

# 🎨 Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 📊 Configuration
BACKUP_ID="backup-$(date +%Y%m%d-%H%M%S)"
RETENTION_DAYS=${RETENTION_DAYS:-30}
S3_BUCKET=${S3_BUCKET:-"ai-multimodel-backups"}
NAMESPACE=${NAMESPACE:-"production"}
ENCRYPTION_KEY=${ENCRYPTION_KEY:-"$HOME/.backup-encryption-key"}

# 📁 Directories
BACKUP_DIR="/tmp/ai-multimodel-backups/$BACKUP_ID"
LOGS_DIR="/var/log/ai-multimodel-backups"

# 🔧 Functions
log() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"; }
error() { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"; }
info() { echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"; }

# 📊 Create directories
mkdir -p "$BACKUP_DIR" "$LOGS_DIR"
exec > >(tee -a "$LOGS_DIR/backup-$BACKUP_ID.log")
exec 2>&1

# 🎯 Main backup function
main() {
    case "${1:-backup}" in
        "backup")
            perform_backup
            ;;
        "restore")
            perform_restore "${2:-latest}"
            ;;
        "verify")
            verify_backup "${2:-latest}"
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "disaster-recovery")
            disaster_recovery_procedure
            ;;
        "test-recovery")
            test_recovery_procedure
            ;;
        *)
            show_usage
            exit 1
            ;;
    esac
}

# 💾 Comprehensive backup procedure
perform_backup() {
    log "🚀 Starting comprehensive backup procedure"
    log "📊 Backup ID: $BACKUP_ID"
    
    # 🔍 Pre-backup checks
    pre_backup_checks
    
    # 💾 Database backup
    backup_database
    
    # 📦 Application data backup
    backup_application_data
    
    # ⚙️ Configuration backup
    backup_configurations
    
    # 🗄️ Persistent volumes backup
    backup_persistent_volumes
    
    # 🔐 Secrets backup (encrypted)
    backup_secrets
    
    # 📊 Monitoring data backup
    backup_monitoring_data
    
    # 📤 Upload to cloud storage
    upload_to_cloud
    
    # ✅ Verify backup integrity
    verify_backup_integrity
    
    # 📊 Generate backup report
    generate_backup_report
    
    log "✅ Backup completed successfully: $BACKUP_ID"
}

# 🔍 Pre-backup validation
pre_backup_checks() {
    log "🔍 Performing pre-backup checks..."
    
    # Check Kubernetes connectivity
    if ! kubectl cluster-info >/dev/null 2>&1; then
        error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
        error "Namespace $NAMESPACE does not exist"
        exit 1
    fi
    
    # Check required tools
    command -v kubectl >/dev/null 2>&1 || { error "kubectl not found"; exit 1; }
    command -v pg_dump >/dev/null 2>&1 || { error "pg_dump not found"; exit 1; }
    command -v aws >/dev/null 2>&1 || { error "AWS CLI not found"; exit 1; }
    command -v gpg >/dev/null 2>&1 || { error "GPG not found"; exit 1; }
    
    # Check available disk space
    AVAILABLE_SPACE=$(df /tmp | tail -1 | awk '{print $4}')
    if [ "$AVAILABLE_SPACE" -lt 10485760 ]; then # 10GB in KB
        error "Insufficient disk space. Need at least 10GB available"
        exit 1
    fi
    
    # Check system health
    check_system_health
    
    log "✅ Pre-backup checks completed"
}

# 🏥 System health check
check_system_health() {
    info "🏥 Checking system health..."
    
    # Check pod status
    FAILED_PODS=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running --no-headers | wc -l)
    if [ "$FAILED_PODS" -gt 0 ]; then
        warn "$FAILED_PODS pods are not in Running state"
        kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running
    fi
    
    # Check service endpoints
    kubectl get endpoints -n "$NAMESPACE" -o custom-columns=NAME:.metadata.name,ENDPOINTS:.subsets[*].addresses[*].ip | grep -v "<none>" || warn "Some services have no endpoints"
    
    # Check storage
    kubectl get pv -o custom-columns=NAME:.metadata.name,STATUS:.status.phase | grep -v Available | grep -v Bound || warn "Storage issues detected"
    
    log "🏥 System health check completed"
}

# 🗄️ Database backup
backup_database() {
    log "🗄️ Starting database backup..."
    
    # Get database pod
    DB_POD=$(kubectl get pods -n "$NAMESPACE" -l app=postgresql -o jsonpath='{.items[0].metadata.name}')
    if [ -z "$DB_POD" ]; then
        error "PostgreSQL pod not found"
        exit 1
    fi
    
    # Create database backup
    log "📊 Creating PostgreSQL dump..."
    kubectl exec -n "$NAMESPACE" "$DB_POD" -- pg_dump -U postgres ai_multimodel \
        --verbose \
        --format=custom \
        --compress=9 \
        --encoding=UTF8 \
        > "$BACKUP_DIR/database-dump.sql.gz"
    
    # Create schema-only backup
    kubectl exec -n "$NAMESPACE" "$DB_POD" -- pg_dump -U postgres ai_multimodel \
        --schema-only \
        --format=plain \
        > "$BACKUP_DIR/database-schema.sql"
    
    # Export database statistics
    kubectl exec -n "$NAMESPACE" "$DB_POD" -- psql -U postgres ai_multimodel -c "
        SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup 
        FROM pg_stat_user_tables;
    " -t -A -F',' > "$BACKUP_DIR/database-stats.csv"
    
    # Backup database configuration
    kubectl exec -n "$NAMESPACE" "$DB_POD" -- cat /var/lib/postgresql/data/postgresql.conf > "$BACKUP_DIR/postgresql.conf"
    kubectl exec -n "$NAMESPACE" "$DB_POD" -- cat /var/lib/postgresql/data/pg_hba.conf > "$BACKUP_DIR/pg_hba.conf"
    
    log "✅ Database backup completed"
}

# 📦 Application data backup
backup_application_data() {
    log "📦 Starting application data backup..."
    
    # Create application directory
    mkdir -p "$BACKUP_DIR/application"
    
    # Backup application logs (last 24 hours)
    kubectl logs -n "$NAMESPACE" -l app=ai-multimodel-api --since=24h > "$BACKUP_DIR/application/api-logs-24h.log"
    kubectl logs -n "$NAMESPACE" -l app=ai-multimodel-frontend --since=24h > "$BACKUP_DIR/application/frontend-logs-24h.log"
    
    # Backup Redis data
    REDIS_POD=$(kubectl get pods -n "$NAMESPACE" -l app=redis -o jsonpath='{.items[0].metadata.name}')
    if [ -n "$REDIS_POD" ]; then
        kubectl exec -n "$NAMESPACE" "$REDIS_POD" -- redis-cli BGSAVE
        sleep 10  # Wait for background save to complete
        kubectl exec -n "$NAMESPACE" "$REDIS_POD" -- cat /data/dump.rdb > "$BACKUP_DIR/application/redis-dump.rdb"
    fi
    
    # Backup uploaded files and user data
    for pod in $(kubectl get pods -n "$NAMESPACE" -l app=ai-multimodel-api -o jsonpath='{.items[*].metadata.name}'); do
        kubectl exec -n "$NAMESPACE" "$pod" -- tar -czf - /app/uploads 2>/dev/null | cat > "$BACKUP_DIR/application/uploads-$pod.tar.gz" || warn "No uploads found in $pod"
    done
    
    # Backup metrics and analytics data
    kubectl exec -n "$NAMESPACE" -l app=ai-multimodel-api -- curl -s "http://localhost:3001/api/v1/analytics/export" > "$BACKUP_DIR/application/analytics-export.json" || warn "Analytics export failed"
    
    log "✅ Application data backup completed"
}

# ⚙️ Configuration backup
backup_configurations() {
    log "⚙️ Starting configuration backup..."
    
    mkdir -p "$BACKUP_DIR/configurations"
    
    # Backup Kubernetes manifests
    kubectl get all -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/configurations/kubernetes-resources.yaml"
    kubectl get configmaps -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/configurations/configmaps.yaml"
    kubectl get ingress -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/configurations/ingress.yaml"
    kubectl get networkpolicies -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/configurations/networkpolicies.yaml"
    kubectl get hpa -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/configurations/hpa.yaml"
    kubectl get pdb -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/configurations/pdb.yaml"
    
    # Backup Helm releases
    helm list -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/configurations/helm-releases.yaml" 2>/dev/null || warn "Helm not available"
    
    # Backup monitoring configurations
    kubectl get prometheus -n monitoring -o yaml > "$BACKUP_DIR/configurations/prometheus.yaml" 2>/dev/null || warn "Prometheus not found"
    kubectl get grafana -n monitoring -o yaml > "$BACKUP_DIR/configurations/grafana.yaml" 2>/dev/null || warn "Grafana not found"
    
    log "✅ Configuration backup completed"
}

# 💿 Persistent volumes backup
backup_persistent_volumes() {
    log "💿 Starting persistent volumes backup..."
    
    mkdir -p "$BACKUP_DIR/volumes"
    
    # Get all PVCs in the namespace
    for pvc in $(kubectl get pvc -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}'); do
        log "📦 Backing up PVC: $pvc"
        
        # Create a backup job for this PVC
        kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: backup-$pvc-$BACKUP_ID
  namespace: $NAMESPACE
spec:
  template:
    spec:
      containers:
      - name: backup
        image: busybox
        command: ["sh", "-c", "tar -czf /backup/$pvc.tar.gz -C /data . && ls -la /backup/"]
        volumeMounts:
        - name: data
          mountPath: /data
        - name: backup
          mountPath: /backup
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: $pvc
      - name: backup
        hostPath:
          path: $BACKUP_DIR/volumes
      restartPolicy: Never
  backoffLimit: 3
EOF
        
        # Wait for job completion
        kubectl wait --for=condition=complete job/backup-$pvc-$BACKUP_ID -n "$NAMESPACE" --timeout=600s
        kubectl delete job backup-$pvc-$BACKUP_ID -n "$NAMESPACE"
    done
    
    log "✅ Persistent volumes backup completed"
}

# 🔐 Secrets backup (encrypted)
backup_secrets() {
    log "🔐 Starting secrets backup (encrypted)..."
    
    mkdir -p "$BACKUP_DIR/secrets"
    
    # Export secrets (will be encrypted)
    kubectl get secrets -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/secrets/secrets-raw.yaml"
    
    # Encrypt secrets file
    if [ -f "$ENCRYPTION_KEY" ]; then
        gpg --cipher-algo AES256 --compress-algo 1 --symmetric --output "$BACKUP_DIR/secrets/secrets.yaml.gpg" "$BACKUP_DIR/secrets/secrets-raw.yaml"
        rm "$BACKUP_DIR/secrets/secrets-raw.yaml"  # Remove unencrypted version
    else
        warn "Encryption key not found. Secrets will not be encrypted."
        mv "$BACKUP_DIR/secrets/secrets-raw.yaml" "$BACKUP_DIR/secrets/secrets.yaml"
    fi
    
    # Backup TLS certificates
    kubectl get certificates -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/secrets/certificates.yaml" 2>/dev/null || warn "No certificates found"
    
    log "✅ Secrets backup completed"
}

# 📊 Monitoring data backup
backup_monitoring_data() {
    log "📊 Starting monitoring data backup..."
    
    mkdir -p "$BACKUP_DIR/monitoring"
    
    # Prometheus data export (last 24 hours)
    PROMETHEUS_URL="http://prometheus.monitoring.svc.cluster.local:9090"
    
    # Export key metrics
    curl -s "${PROMETHEUS_URL}/api/v1/query_range?query=up&start=$(date -d '24 hours ago' +%s)&end=$(date +%s)&step=300" > "$BACKUP_DIR/monitoring/up-metrics.json" || warn "Prometheus export failed"
    curl -s "${PROMETHEUS_URL}/api/v1/query_range?query=ai_multimodel_requests_total&start=$(date -d '24 hours ago' +%s)&end=$(date +%s)&step=300" > "$BACKUP_DIR/monitoring/requests-metrics.json" || warn "Request metrics export failed"
    curl -s "${PROMETHEUS_URL}/api/v1/query_range?query=ai_multimodel_response_time&start=$(date -d '24 hours ago' +%s)&end=$(date +%s)&step=300" > "$BACKUP_DIR/monitoring/response-time-metrics.json" || warn "Response time metrics export failed"
    
    # Export Grafana dashboards
    GRAFANA_URL="http://grafana.monitoring.svc.cluster.local:3000"
    curl -s -u "admin:$GRAFANA_PASSWORD" "$GRAFANA_URL/api/search" | jq -r '.[] | select(.type=="dash-db") | .uid' | while read uid; do
        curl -s -u "admin:$GRAFANA_PASSWORD" "$GRAFANA_URL/api/dashboards/uid/$uid" > "$BACKUP_DIR/monitoring/dashboard-$uid.json"
    done 2>/dev/null || warn "Grafana dashboard export failed"
    
    # Export alerting rules
    kubectl get prometheusrules -n monitoring -o yaml > "$BACKUP_DIR/monitoring/prometheus-rules.yaml" 2>/dev/null || warn "Prometheus rules export failed"
    
    log "✅ Monitoring data backup completed"
}

# ☁️ Upload to cloud storage
upload_to_cloud() {
    log "☁️ Starting cloud upload..."
    
    # Create compressed archive
    cd "$(dirname "$BACKUP_DIR")"
    tar -czf "${BACKUP_ID}.tar.gz" "$BACKUP_ID"
    
    # Upload to S3 with encryption
    aws s3 cp "${BACKUP_ID}.tar.gz" "s3://${S3_BUCKET}/$(date +%Y/%m/%d)/" \
        --server-side-encryption AES256 \
        --storage-class STANDARD_IA \
        --metadata "backup-id=${BACKUP_ID},created=$(date -u +%Y-%m-%dT%H:%M:%SZ),retention-days=${RETENTION_DAYS}"
    
    # Upload to multiple regions for redundancy
    aws s3 cp "${BACKUP_ID}.tar.gz" "s3://${S3_BUCKET}-replica/$(date +%Y/%m/%d)/" \
        --region us-west-2 \
        --server-side-encryption AES256 \
        --storage-class STANDARD_IA 2>/dev/null || warn "Replica upload failed"
    
    # Clean up local compressed file
    rm "${BACKUP_ID}.tar.gz"
    
    log "✅ Cloud upload completed"
}

# ✅ Verify backup integrity
verify_backup_integrity() {
    log "✅ Starting backup integrity verification..."
    
    # Check database dump integrity
    if [ -f "$BACKUP_DIR/database-dump.sql.gz" ]; then
        gunzip -t "$BACKUP_DIR/database-dump.sql.gz" && log "✅ Database dump integrity OK" || error "❌ Database dump corrupted"
    fi
    
    # Check compressed files
    for file in $(find "$BACKUP_DIR" -name "*.tar.gz" -o -name "*.gz"); do
        if gunzip -t "$file" 2>/dev/null || tar -tzf "$file" >/dev/null 2>&1; then
            log "✅ $file integrity OK"
        else
            error "❌ $file corrupted"
        fi
    done
    
    # Verify encrypted files can be decrypted
    if [ -f "$BACKUP_DIR/secrets/secrets.yaml.gpg" ] && [ -f "$ENCRYPTION_KEY" ]; then
        gpg --quiet --batch --decrypt "$BACKUP_DIR/secrets/secrets.yaml.gpg" >/dev/null && log "✅ Encrypted secrets can be decrypted" || error "❌ Cannot decrypt secrets"
    fi
    
    log "✅ Backup integrity verification completed"
}

# 📊 Generate backup report
generate_backup_report() {
    log "📊 Generating backup report..."
    
    cat > "$BACKUP_DIR/backup-report.json" << EOF
{
  "backup_id": "$BACKUP_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "namespace": "$NAMESPACE",
  "backup_size": "$(du -sh "$BACKUP_DIR" | cut -f1)",
  "components": {
    "database": $([ -f "$BACKUP_DIR/database-dump.sql.gz" ] && echo "true" || echo "false"),
    "application_data": $([ -d "$BACKUP_DIR/application" ] && echo "true" || echo "false"),
    "configurations": $([ -d "$BACKUP_DIR/configurations" ] && echo "true" || echo "false"),
    "persistent_volumes": $([ -d "$BACKUP_DIR/volumes" ] && echo "true" || echo "false"),
    "secrets": $([ -d "$BACKUP_DIR/secrets" ] && echo "true" || echo "false"),
    "monitoring": $([ -d "$BACKUP_DIR/monitoring" ] && echo "true" || echo "false")
  },
  "file_count": $(find "$BACKUP_DIR" -type f | wc -l),
  "cloud_storage": "s3://${S3_BUCKET}/$(date +%Y/%m/%d)/${BACKUP_ID}.tar.gz",
  "retention_until": "$(date -d "+${RETENTION_DAYS} days" -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
    
    # Send report to monitoring system
    curl -X POST "http://prometheus-pushgateway.monitoring.svc.cluster.local:9091/metrics/job/backup" \
        -H "Content-Type: text/plain" \
        --data "ai_multimodel_backup_success{backup_id=\"$BACKUP_ID\"} 1" 2>/dev/null || warn "Could not push metrics"
    
    log "✅ Backup report generated"
}

# 🔄 Restore procedure
perform_restore() {
    local backup_id="${1:-latest}"
    log "🔄 Starting restore procedure for: $backup_id"
    
    # Download backup from cloud
    download_backup "$backup_id"
    
    # Restore database
    restore_database "$backup_id"
    
    # Restore application data
    restore_application_data "$backup_id"
    
    # Restore configurations
    restore_configurations "$backup_id"
    
    # Restore persistent volumes
    restore_persistent_volumes "$backup_id"
    
    # Restore secrets
    restore_secrets "$backup_id"
    
    log "✅ Restore completed for: $backup_id"
}

# 📥 Download backup from cloud
download_backup() {
    local backup_id="$1"
    log "📥 Downloading backup: $backup_id"
    
    if [ "$backup_id" = "latest" ]; then
        # Find latest backup
        backup_id=$(aws s3 ls "s3://${S3_BUCKET}/" --recursive | sort | tail -n 1 | awk '{print $4}' | cut -d'/' -f4 | cut -d'.' -f1)
    fi
    
    # Download from S3
    aws s3 cp "s3://${S3_BUCKET}/*//${backup_id}.tar.gz" "/tmp/"
    
    # Extract
    cd /tmp
    tar -xzf "${backup_id}.tar.gz"
    
    log "✅ Backup downloaded and extracted: $backup_id"
}

# 🗄️ Restore database
restore_database() {
    local backup_id="$1"
    log "🗄️ Restoring database from: $backup_id"
    
    # Get database pod
    DB_POD=$(kubectl get pods -n "$NAMESPACE" -l app=postgresql -o jsonpath='{.items[0].metadata.name}')
    
    # Drop existing database and recreate
    kubectl exec -n "$NAMESPACE" "$DB_POD" -- psql -U postgres -c "DROP DATABASE IF EXISTS ai_multimodel;"
    kubectl exec -n "$NAMESPACE" "$DB_POD" -- psql -U postgres -c "CREATE DATABASE ai_multimodel;"
    
    # Restore from backup
    kubectl exec -i -n "$NAMESPACE" "$DB_POD" -- pg_restore -U postgres -d ai_multimodel --verbose < "/tmp/${backup_id}/database-dump.sql.gz"
    
    log "✅ Database restored"
}

# 🧪 Test recovery procedure
test_recovery_procedure() {
    log "🧪 Starting test recovery procedure..."
    
    # Create test namespace
    kubectl create namespace ai-multimodel-test || true
    
    # Run restore in test namespace
    NAMESPACE="ai-multimodel-test" perform_restore "${1:-latest}"
    
    # Validate restored system
    validate_restored_system "ai-multimodel-test"
    
    # Cleanup test namespace
    kubectl delete namespace ai-multimodel-test
    
    log "✅ Test recovery completed successfully"
}

# ✅ Validate restored system
validate_restored_system() {
    local namespace="$1"
    log "✅ Validating restored system in namespace: $namespace"
    
    # Wait for pods to be ready
    kubectl wait --for=condition=ready pods -l app=ai-multimodel-api -n "$namespace" --timeout=600s
    
    # Test database connectivity
    DB_POD=$(kubectl get pods -n "$namespace" -l app=postgresql -o jsonpath='{.items[0].metadata.name}')
    kubectl exec -n "$namespace" "$DB_POD" -- psql -U postgres ai_multimodel -c "SELECT COUNT(*) FROM ai_requests;" | grep -q "[0-9]" && log "✅ Database validation passed" || error "❌ Database validation failed"
    
    # Test API endpoints
    kubectl port-forward -n "$namespace" service/ai-multimodel-api 8080:3001 &
    sleep 5
    curl -f http://localhost:8080/health && log "✅ API validation passed" || error "❌ API validation failed"
    kill %1  # Stop port-forward
    
    log "✅ System validation completed"
}

# 🗑️ Cleanup old backups
cleanup_old_backups() {
    log "🗑️ Starting cleanup of old backups..."
    
    # Clean up local backups older than retention period
    find "/tmp/ai-multimodel-backups" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
    
    # Clean up cloud backups older than retention period
    aws s3 ls "s3://${S3_BUCKET}/" --recursive | awk '$1 <= "'$(date -d "-${RETENTION_DAYS} days" +%Y-%m-%d)'" {print $4}' | xargs -I {} aws s3 rm "s3://${S3_BUCKET}/{}"
    
    log "✅ Cleanup completed"
}

# 🚨 Disaster recovery procedure
disaster_recovery_procedure() {
    log "🚨 Starting disaster recovery procedure..."
    
    # Step 1: Assess damage
    assess_system_damage
    
    # Step 2: Implement recovery strategy
    case "$DISASTER_TYPE" in
        "data_corruption")
            recover_from_data_corruption
            ;;
        "infrastructure_failure") 
            recover_from_infrastructure_failure
            ;;
        "security_breach")
            recover_from_security_breach
            ;;
        *)
            recover_full_system
            ;;
    esac
    
    # Step 3: Validate recovery
    validate_disaster_recovery
    
    log "✅ Disaster recovery completed"
}

# 🔍 Assess system damage
assess_system_damage() {
    log "🔍 Assessing system damage..."
    
    # Check cluster health
    kubectl cluster-info || DISASTER_TYPE="infrastructure_failure"
    
    # Check data integrity
    kubectl exec -n "$NAMESPACE" -l app=postgresql -- psql -U postgres ai_multimodel -c "SELECT 1" 2>/dev/null || DISASTER_TYPE="data_corruption"
    
    # Check for security indicators
    kubectl logs -n "$NAMESPACE" -l app=ai-multimodel-api | grep -i "breach\|attack\|unauthorized" && DISASTER_TYPE="security_breach"
    
    log "📊 Disaster type identified: ${DISASTER_TYPE:-unknown}"
}

# 📋 Show usage
show_usage() {
    cat << EOF
💾 AI Multi-Model Backup & Disaster Recovery System

Usage: $0 [COMMAND] [OPTIONS]

Commands:
  backup                     Perform comprehensive backup
  restore [BACKUP_ID]        Restore from backup (default: latest)
  verify [BACKUP_ID]         Verify backup integrity
  cleanup                    Remove old backups
  disaster-recovery          Execute disaster recovery procedure
  test-recovery [BACKUP_ID]  Test recovery in isolated environment

Environment Variables:
  RETENTION_DAYS            Backup retention period (default: 30)
  S3_BUCKET                 S3 bucket for backups (default: ai-multimodel-backups)
  NAMESPACE                 Kubernetes namespace (default: production)
  ENCRYPTION_KEY            Path to GPG encryption key

Examples:
  $0 backup                              # Full system backup
  $0 restore backup-20240130-143022      # Restore specific backup
  $0 test-recovery latest                # Test latest backup
  $0 cleanup                             # Clean old backups

For emergency support: 📞 +1-555-DISASTER
EOF
}

# 🚨 Error handling
trap 'error "Script failed at line $LINENO"; exit 1' ERR

# 🎯 Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi