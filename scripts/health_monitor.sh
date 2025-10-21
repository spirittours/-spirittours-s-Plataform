#!/bin/bash

# Health Monitoring Script for Spirit Tours
# Checks all services and sends alerts if issues detected

# Configuration
API_URL="http://localhost:8000/health"
ALERT_EMAIL="admin@spirittours.com"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"
LOG_FILE="/var/log/spirit_tours/health.log"

# Function to send alert
send_alert() {
    local service=$1
    local status=$2
    local message=$3
    
    # Log the issue
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ALERT: $service is $status - $message" >> $LOG_FILE
    
    # Send email alert (if configured)
    if [ ! -z "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "Spirit Tours Alert: $service is $status" $ALERT_EMAIL
    fi
    
    # Send Slack alert (if configured)
    if [ ! -z "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 *Spirit Tours Alert*\n*Service:* $service\n*Status:* $status\n*Message:* $message\"}" \
            $SLACK_WEBHOOK
    fi
}

# Check API Health
check_api() {
    response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL)
    if [ "$response" != "200" ]; then
        send_alert "API" "DOWN" "API health check returned status $response"
        return 1
    fi
    
    # Check detailed health
    health_data=$(curl -s $API_URL)
    db_status=$(echo $health_data | jq -r '.services.database.status')
    ws_connections=$(echo $health_data | jq -r '.services.websocket.connections.total_connections')
    
    if [ "$db_status" != "up" ]; then
        send_alert "Database" "DOWN" "Database connection failed"
    fi
    
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] API: OK, DB: $db_status, WS Connections: $ws_connections" >> $LOG_FILE
}

# Check Docker containers
check_containers() {
    containers=("spirit_tours_api" "spirit_tours_db" "spirit_tours_redis")
    
    for container in "${containers[@]}"; do
        if ! docker ps | grep -q $container; then
            send_alert "Container" "DOWN" "Container $container is not running"
            
            # Attempt to restart
            docker-compose up -d ${container#spirit_tours_}
        fi
    done
}

# Check disk space
check_disk_space() {
    threshold=90
    usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -gt "$threshold" ]; then
        send_alert "Disk" "WARNING" "Disk usage is at ${usage}% (threshold: ${threshold}%)"
    fi
}

# Check memory
check_memory() {
    threshold=90
    usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    
    if [ "$usage" -gt "$threshold" ]; then
        send_alert "Memory" "WARNING" "Memory usage is at ${usage}% (threshold: ${threshold}%)"
    fi
}

# Check SSL certificate expiry
check_ssl() {
    days_warning=30
    cert_file="/etc/nginx/ssl/spirittours.com.crt"
    
    if [ -f "$cert_file" ]; then
        expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
        expiry_epoch=$(date -d "$expiry_date" +%s)
        current_epoch=$(date +%s)
        days_left=$(( ($expiry_epoch - $current_epoch) / 86400 ))
        
        if [ "$days_left" -lt "$days_warning" ]; then
            send_alert "SSL" "WARNING" "SSL certificate expires in $days_left days"
        fi
    fi
}

# Main monitoring loop
main() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting health check..." >> $LOG_FILE
    
    check_api
    check_containers
    check_disk_space
    check_memory
    check_ssl
    
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] Health check completed" >> $LOG_FILE
}

# Run main function
main