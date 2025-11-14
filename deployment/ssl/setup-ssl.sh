#!/bin/bash
# Spirit Tours - SSL Certificate Setup Script
# Uses Let's Encrypt with Certbot
# Version: 1.0.0

set -e

# ============================================
# Configuration
# ============================================
DOMAIN="${1:-spirittours.com}"
API_DOMAIN="api.${DOMAIN}"
EMAIL="${2:-admin@${DOMAIN}}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

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

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        log "Installing certbot..."
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y certbot python3-certbot-nginx
        elif command -v yum &> /dev/null; then
            sudo yum install -y certbot python3-certbot-nginx
        else
            error "Package manager not supported. Please install certbot manually."
        fi
    fi
    
    log "Prerequisites check passed ✓"
}

obtain_certificate() {
    local domain="$1"
    
    log "Obtaining SSL certificate for $domain..."
    
    # Obtain certificate
    sudo certbot certonly \
        --nginx \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        --domains "$domain" \
        --staging  # Remove --staging for production
    
    log "Certificate obtained for $domain ✓"
}

setup_auto_renewal() {
    log "Setting up automatic certificate renewal..."
    
    # Test renewal
    sudo certbot renew --dry-run
    
    # Certbot automatically creates a cron job or systemd timer
    log "Auto-renewal configured ✓"
}

configure_nginx() {
    log "Configuring Nginx for SSL..."
    
    # Reload Nginx to apply changes
    sudo nginx -t && sudo nginx -s reload
    
    log "Nginx configured ✓"
}

test_ssl() {
    local domain="$1"
    
    log "Testing SSL configuration for $domain..."
    
    # Test HTTPS endpoint
    if curl -I "https://${domain}" 2>&1 | grep -q "200 OK"; then
        log "SSL is working correctly ✓"
    else
        error "SSL test failed for $domain"
    fi
}

print_summary() {
    log "=========================================="
    log "SSL Certificate Setup Complete!"
    log "=========================================="
    log ""
    log "Certificates obtained for:"
    log "  - $DOMAIN"
    log "  - $API_DOMAIN"
    log ""
    log "Certificate location:"
    log "  - Cert: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    log "  - Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
    log ""
    log "Auto-renewal: Enabled (runs twice daily)"
    log "Certificate valid for: 90 days"
    log ""
    log "To manually renew: sudo certbot renew"
    log "=========================================="
}

# ============================================
# Main Execution
# ============================================
main() {
    if [ -z "$DOMAIN" ]; then
        echo "Usage: $0 <domain> [email]"
        echo "Example: $0 spirittours.com admin@spirittours.com"
        exit 1
    fi
    
    log "Starting SSL setup for $DOMAIN..."
    
    check_prerequisites
    obtain_certificate "$DOMAIN"
    obtain_certificate "$API_DOMAIN"
    setup_auto_renewal
    configure_nginx
    test_ssl "$DOMAIN"
    print_summary
}

main "$@"
