#!/bin/bash

# =============================================================================
# AI Multi-Model Platform - Backup & Restore Manager
# Unified management interface for backup and recovery operations
# =============================================================================

set -euo pipefail

# Configuration
MANAGER_CONFIG_FILE="${MANAGER_CONFIG_FILE:-/etc/ai-platform/backup-manager.conf}"
LOG_FILE="${LOG_FILE:-/var/log/ai-platform/backup-manager.log}"
SCRIPTS_DIR="${SCRIPTS_DIR:-/opt/ai-platform/infrastructure/backup-recovery/scripts}"
CONFIGS_DIR="${CONFIGS_DIR:-/opt/ai-platform/infrastructure/backup-recovery/configs}"

# Script paths
BACKUP_SCRIPT="${SCRIPTS_DIR}/automated-backup.sh"
RECOVERY_SCRIPT="${SCRIPTS_DIR}/disaster-recovery.sh"
SCHEDULER_SCRIPT="${SCRIPTS_DIR}/backup-scheduler.sh"
DR_TEST_SCRIPT="${SCRIPTS_DIR}/dr-test-runner.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# Icons
CHECKMARK="✓"
CROSSMARK="✗"
WARNING="⚠"
INFO="ℹ"

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

# Display header
display_header() {
    clear
    echo -e "${CYAN}================================================================================================${NC}"
    echo -e "${WHITE}                    AI Multi-Model Platform - Backup & Restore Manager                         ${NC}"
    echo -e "${CYAN}================================================================================================${NC}"
    echo -e "${BLUE}System Status:${NC} $(date '+%Y-%m-%d %H:%M:%S') | ${BLUE}Hostname:${NC} $(hostname)"
    echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
    echo
}

# Check system status
check_system_status() {
    local status_color="${GREEN}"
    local status_text="Operational"
    
    # Check critical services
    local critical_services=("postgresql" "redis" "nginx" "docker")
    local failed_services=()
    
    for service in "${critical_services[@]}"; do
        if ! systemctl is-active --quiet "$service" 2>/dev/null; then
            failed_services+=("$service")
            status_color="${RED}"
            status_text="Degraded"
        fi
    done
    
    # Check disk space
    local backup_dir="/var/backups/ai-platform"
    local disk_usage
    if [[ -d "$backup_dir" ]]; then
        disk_usage=$(df "$backup_dir" | tail -1 | awk '{print $5}' | tr -d '%')
        if [[ $disk_usage -gt 90 ]]; then
            status_color="${RED}"
            status_text="Critical - Disk Full"
        elif [[ $disk_usage -gt 80 ]]; then
            status_color="${YELLOW}"
            status_text="Warning - Disk Space Low"
        fi
    fi
    
    echo -e "${BLUE}System Status:${NC} ${status_color}${status_text}${NC}"
    
    if [[ ${#failed_services[@]} -gt 0 ]]; then
        echo -e "${RED}${CROSSMARK} Failed Services:${NC} ${failed_services[*]}"
    fi
    
    if [[ -n "${disk_usage:-}" ]]; then
        local disk_color="${GREEN}"
        if [[ $disk_usage -gt 90 ]]; then
            disk_color="${RED}"
        elif [[ $disk_usage -gt 80 ]]; then
            disk_color="${YELLOW}"
        fi
        echo -e "${BLUE}Backup Disk Usage:${NC} ${disk_color}${disk_usage}%${NC}"
    fi
    
    echo
}

# Display main menu
display_main_menu() {
    display_header
    check_system_status
    
    echo -e "${WHITE}Main Menu:${NC}"
    echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
    echo "1.  ${GREEN}Backup Operations${NC}           - Create, schedule, and manage backups"
    echo "2.  ${YELLOW}Recovery Operations${NC}         - Restore systems and data from backups"  
    echo "3.  ${BLUE}Disaster Recovery Testing${NC}   - Test and validate recovery procedures"
    echo "4.  ${PURPLE}Backup Management${NC}          - View status, cleanup, and maintenance"
    echo "5.  ${CYAN}System Health Check${NC}         - Comprehensive system and backup health check"
    echo "6.  ${WHITE}Configuration${NC}               - View and manage backup/recovery configuration"
    echo "7.  ${GREEN}Monitoring & Reports${NC}        - View backup statistics and generate reports"
    echo "8.  ${YELLOW}Emergency Procedures${NC}       - Quick access to emergency recovery procedures"
    echo "9.  ${BLUE}Documentation${NC}               - Access procedural documentation and guides"
    echo "10. ${RED}Exit${NC}                        - Exit the backup manager"
    echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
    echo
}

# Backup Operations Menu
backup_operations_menu() {
    while true; do
        display_header
        echo -e "${GREEN}Backup Operations Menu:${NC}"
        echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
        echo "1. ${WHITE}Create Immediate Backup${NC}     - Start backup now"
        echo "2. ${WHITE}Schedule Automatic Backups${NC}  - Configure cron jobs"
        echo "3. ${WHITE}View Backup History${NC}         - Show recent backup operations"
        echo "4. ${WHITE}Verify Backup Integrity${NC}     - Check backup file integrity"
        echo "5. ${WHITE}Backup Configuration${NC}        - Create configuration backup only"
        echo "6. ${WHITE}Database Backup${NC}             - Create database backup only"
        echo "7. ${WHITE}Application Backup${NC}          - Create application backup only"
        echo "8. ${RED}Back to Main Menu${NC}          - Return to main menu"
        echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
        
        read -p "Select option [1-8]: " choice
        
        case $choice in
            1) create_immediate_backup ;;
            2) schedule_automatic_backups ;;
            3) view_backup_history ;;
            4) verify_backup_integrity ;;
            5) create_config_backup ;;
            6) create_database_backup ;;
            7) create_application_backup ;;
            8) break ;;
            *) echo -e "${RED}Invalid option. Please try again.${NC}"; sleep 2 ;;
        esac
    done
}

# Create immediate backup
create_immediate_backup() {
    display_header
    echo -e "${GREEN}Create Immediate Backup${NC}"
    echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
    
    echo "Backup Types:"
    echo "1. Full System Backup (all components)"
    echo "2. Database Only"
    echo "3. Application Only"
    echo "4. Configuration Only"
    echo "5. Custom Selection"
    echo
    
    read -p "Select backup type [1-5]: " backup_type
    
    local backup_command="$BACKUP_SCRIPT"
    local backup_description=""
    
    case $backup_type in
        1)
            backup_description="Full System Backup"
            ;;
        2)
            backup_command="$backup_command --components database"
            backup_description="Database Backup"
            ;;
        3)
            backup_command="$backup_command --components application"
            backup_description="Application Backup"
            ;;
        4)
            backup_command="$backup_command --components configurations"
            backup_description="Configuration Backup"
            ;;
        5)
            echo "Available components: database, application, configurations, certificates, logs, monitoring"
            read -p "Enter components (comma-separated): " components
            backup_command="$backup_command --components $components"
            backup_description="Custom Backup ($components)"
            ;;
        *)
            echo -e "${RED}Invalid selection${NC}"
            sleep 2
            return
            ;;
    esac
    
    echo
    echo -e "${BLUE}Executing:${NC} $backup_description"
    echo -e "${YELLOW}This may take several minutes...${NC}"
    echo
    
    if $backup_command; then
        echo -e "${GREEN}${CHECKMARK} Backup completed successfully${NC}"
    else
        echo -e "${RED}${CROSSMARK} Backup failed${NC}"
    fi
    
    read -p "Press Enter to continue..."
}

# Recovery Operations Menu
recovery_operations_menu() {
    while true; do
        display_header
        echo -e "${YELLOW}Recovery Operations Menu:${NC}"
        echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
        echo "1. ${WHITE}Full System Recovery${NC}        - Complete system restoration"
        echo "2. ${WHITE}Database Recovery${NC}           - Restore database from backup"
        echo "3. ${WHITE}Application Recovery${NC}        - Restore application from backup"
        echo "4. ${WHITE}Configuration Recovery${NC}      - Restore system configuration"
        echo "5. ${WHITE}Selective Recovery${NC}          - Interactive component selection"
        echo "6. ${WHITE}Point-in-Time Recovery${NC}      - Restore to specific time"
        echo "7. ${WHITE}List Available Backups${NC}      - Show available backup files"
        echo "8. ${RED}Back to Main Menu${NC}          - Return to main menu"
        echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
        
        read -p "Select option [1-8]: " choice
        
        case $choice in
            1) full_system_recovery ;;
            2) database_recovery ;;
            3) application_recovery ;;
            4) configuration_recovery ;;
            5) selective_recovery ;;
            6) point_in_time_recovery ;;
            7) list_available_backups ;;
            8) break ;;
            *) echo -e "${RED}Invalid option. Please try again.${NC}"; sleep 2 ;;
        esac
    done
}

# List available backups
list_available_backups() {
    display_header
    echo -e "${WHITE}Available Backup Files:${NC}"
    echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
    
    local backup_dir="/var/backups/ai-platform"
    
    if [[ -d "$backup_dir" ]]; then
        echo "Local Backups:"
        ls -lh "$backup_dir"/backup-*.tar.gz* 2>/dev/null | while read -r line; do
            echo "  $line"
        done
        echo
    fi
    
    # Check remote backups if configured
    if command -v aws >/dev/null 2>&1 && [[ -n "${REMOTE_STORAGE_URL:-}" ]]; then
        echo "Remote Backups (S3):"
        aws s3 ls "${REMOTE_STORAGE_URL}/" 2>/dev/null | grep backup- | tail -10 || echo "  No remote backups found"
        echo
    fi
    
    read -p "Press Enter to continue..."
}

# Full system recovery
full_system_recovery() {
    display_header
    echo -e "${YELLOW}Full System Recovery${NC}"
    echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
    echo -e "${RED}${WARNING} WARNING: This will restore the entire system and may overwrite existing data!${NC}"
    echo
    
    # List available backups
    echo "Available backups:"
    local backup_files=($(find /var/backups/ai-platform -name "backup-*.tar.gz*" -type f | sort -r | head -10))
    
    if [[ ${#backup_files[@]} -eq 0 ]]; then
        echo -e "${RED}No backup files found${NC}"
        read -p "Press Enter to continue..."
        return
    fi
    
    for i in "${!backup_files[@]}"; do
        echo "$((i+1)). $(basename "${backup_files[i]}")"
    done
    echo
    
    read -p "Select backup file [1-${#backup_files[@]}]: " selection
    
    if [[ "$selection" =~ ^[0-9]+$ ]] && [[ $selection -ge 1 ]] && [[ $selection -le ${#backup_files[@]} ]]; then
        local selected_backup="${backup_files[$((selection-1))]}"
        
        echo
        echo -e "${RED}Are you sure you want to restore from: $(basename "$selected_backup")?${NC}"
        read -p "Type 'YES' to confirm: " confirm
        
        if [[ "$confirm" == "YES" ]]; then
            echo -e "${YELLOW}Starting full system recovery...${NC}"
            echo -e "${YELLOW}This operation may take 30+ minutes...${NC}"
            echo
            
            if $RECOVERY_SCRIPT full "$selected_backup" --force; then
                echo -e "${GREEN}${CHECKMARK} System recovery completed successfully${NC}"
            else
                echo -e "${RED}${CROSSMARK} System recovery failed${NC}"
            fi
        else
            echo -e "${YELLOW}Recovery cancelled${NC}"
        fi
    else
        echo -e "${RED}Invalid selection${NC}"
    fi
    
    read -p "Press Enter to continue..."
}

# Database recovery
database_recovery() {
    display_header
    echo -e "${YELLOW}Database Recovery${NC}"
    echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
    
    # Show available backups with database components
    echo "Available backups with database components:"
    local backup_files=($(find /var/backups/ai-platform -name "backup-*.tar.gz*" -type f | sort -r | head -10))
    
    if [[ ${#backup_files[@]} -eq 0 ]]; then
        echo -e "${RED}No backup files found${NC}"
        read -p "Press Enter to continue..."
        return
    fi
    
    for i in "${!backup_files[@]}"; do
        echo "$((i+1)). $(basename "${backup_files[i]}")"
    done
    echo
    
    read -p "Select backup file [1-${#backup_files[@]}]: " selection
    
    if [[ "$selection" =~ ^[0-9]+$ ]] && [[ $selection -ge 1 ]] && [[ $selection -le ${#backup_files[@]} ]]; then
        local selected_backup="${backup_files[$((selection-1))]}"
        
        echo
        echo -e "${YELLOW}${WARNING} This will restore the database and may overwrite existing data${NC}"
        read -p "Continue? [y/N]: " confirm
        
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Starting database recovery...${NC}"
            echo
            
            if $RECOVERY_SCRIPT database "$selected_backup" --force; then
                echo -e "${GREEN}${CHECKMARK} Database recovery completed successfully${NC}"
                
                # Validate database
                echo -e "${BLUE}Validating database...${NC}"
                if sudo -u postgres psql -d ai_platform -c "SELECT COUNT(*) FROM users;" >/dev/null 2>&1; then
                    echo -e "${GREEN}${CHECKMARK} Database validation passed${NC}"
                else
                    echo -e "${RED}${CROSSMARK} Database validation failed${NC}"
                fi
            else
                echo -e "${RED}${CROSSMARK} Database recovery failed${NC}"
            fi
        else
            echo -e "${YELLOW}Recovery cancelled${NC}"
        fi
    else
        echo -e "${RED}Invalid selection${NC}"
    fi
    
    read -p "Press Enter to continue..."
}

# Disaster Recovery Testing Menu
dr_testing_menu() {
    while true; do
        display_header
        echo -e "${BLUE}Disaster Recovery Testing Menu:${NC}"
        echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
        echo "1. ${WHITE}Run Full DR Test${NC}            - Complete disaster recovery test"
        echo "2. ${WHITE}Test Database Recovery${NC}      - Test database restoration only"
        echo "3. ${WHITE}Test Application Recovery${NC}   - Test application restoration only"
        echo "4. ${WHITE}Test Backup Integrity${NC}       - Verify backup file integrity"
        echo "5. ${WHITE}Performance Test${NC}            - Test recovery performance"
        echo "6. ${WHITE}View Test History${NC}           - Show previous test results"
        echo "7. ${WHITE}Schedule Automated Tests${NC}    - Configure automatic DR testing"
        echo "8. ${RED}Back to Main Menu${NC}          - Return to main menu"
        echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
        
        read -p "Select option [1-8]: " choice
        
        case $choice in
            1) run_full_dr_test ;;
            2) test_database_recovery ;;
            3) test_application_recovery ;;
            4) test_backup_integrity ;;
            5) test_recovery_performance ;;
            6) view_test_history ;;
            7) schedule_automated_tests ;;
            8) break ;;
            *) echo -e "${RED}Invalid option. Please try again.${NC}"; sleep 2 ;;
        esac
    done
}

# Run full DR test
run_full_dr_test() {
    display_header
    echo -e "${BLUE}Full Disaster Recovery Test${NC}"
    echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
    echo -e "${YELLOW}${INFO} This test will validate all disaster recovery procedures${NC}"
    echo -e "${YELLOW}${INFO} Test will run in isolated environment and not affect production${NC}"
    echo
    
    read -p "Start full DR test? [y/N]: " confirm
    
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Starting comprehensive DR test...${NC}"
        echo -e "${YELLOW}This may take 30-60 minutes...${NC}"
        echo
        
        if $DR_TEST_SCRIPT run --environment staging; then
            echo -e "${GREEN}${CHECKMARK} DR test completed successfully${NC}"
        else
            echo -e "${RED}${CROSSMARK} DR test failed - check logs for details${NC}"
        fi
    else
        echo -e "${YELLOW}Test cancelled${NC}"
    fi
    
    read -p "Press Enter to continue..."
}

# System Health Check
system_health_check() {
    display_header
    echo -e "${CYAN}Comprehensive System Health Check${NC}"
    echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
    
    echo -e "${WHITE}Checking system components...${NC}"
    echo
    
    # Check services
    echo -e "${BLUE}Service Status:${NC}"
    local services=("postgresql" "redis" "nginx" "docker" "ai-platform-api" "ai-platform-workers")
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service" 2>/dev/null; then
            echo -e "  ${GREEN}${CHECKMARK} ${service}${NC}"
        else
            echo -e "  ${RED}${CROSSMARK} ${service}${NC}"
        fi
    done
    echo
    
    # Check disk space
    echo -e "${BLUE}Disk Usage:${NC}"
    df -h | grep -E "/$|/var|/opt|/tmp" | while read -r line; do
        local usage=$(echo "$line" | awk '{print $5}' | tr -d '%')
        local mount=$(echo "$line" | awk '{print $6}')
        local color="${GREEN}"
        
        if [[ $usage -gt 90 ]]; then
            color="${RED}"
        elif [[ $usage -gt 80 ]]; then
            color="${YELLOW}"
        fi
        
        echo -e "  ${color}${mount}: ${usage}%${NC}"
    done
    echo
    
    # Check backup system
    echo -e "${BLUE}Backup System Health:${NC}"
    if $SCHEDULER_SCRIPT health-check; then
        echo -e "  ${GREEN}${CHECKMARK} Backup system operational${NC}"
    else
        echo -e "  ${RED}${CROSSMARK} Backup system issues detected${NC}"
    fi
    echo
    
    # Check recent backups
    echo -e "${BLUE}Recent Backup Status:${NC}"
    $SCHEDULER_SCRIPT status --days 7
    
    read -p "Press Enter to continue..."
}

# Configuration Menu
configuration_menu() {
    while true; do
        display_header
        echo -e "${WHITE}Configuration Menu:${NC}"
        echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
        echo "1. ${WHITE}View Backup Configuration${NC}    - Display current backup settings"
        echo "2. ${WHITE}View DR Configuration${NC}        - Display disaster recovery settings"
        echo "3. ${WHITE}Edit Backup Configuration${NC}    - Modify backup settings"
        echo "4. ${WHITE}Edit DR Configuration${NC}        - Modify disaster recovery settings"
        echo "5. ${WHITE}Test Configuration${NC}           - Validate configuration files"
        echo "6. ${WHITE}Backup Configuration Files${NC}   - Create backup of all configs"
        echo "7. ${WHITE}Restore Configuration${NC}        - Restore configuration from backup"
        echo "8. ${RED}Back to Main Menu${NC}          - Return to main menu"
        echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
        
        read -p "Select option [1-8]: " choice
        
        case $choice in
            1) view_backup_config ;;
            2) view_dr_config ;;
            3) edit_backup_config ;;
            4) edit_dr_config ;;
            5) test_configuration ;;
            6) backup_configuration_files ;;
            7) restore_configuration ;;
            8) break ;;
            *) echo -e "${RED}Invalid option. Please try again.${NC}"; sleep 2 ;;
        esac
    done
}

# View backup configuration
view_backup_config() {
    display_header
    echo -e "${WHITE}Current Backup Configuration:${NC}"
    echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
    
    if [[ -f "${CONFIGS_DIR}/backup.conf" ]]; then
        cat "${CONFIGS_DIR}/backup.conf" | grep -E "^[A-Z]" | head -20
        echo "..."
        echo
        echo -e "${BLUE}Configuration file:${NC} ${CONFIGS_DIR}/backup.conf"
    else
        echo -e "${RED}Backup configuration file not found${NC}"
    fi
    
    read -p "Press Enter to continue..."
}

# Emergency Procedures Menu  
emergency_procedures_menu() {
    while true; do
        display_header
        echo -e "${RED}Emergency Procedures Menu:${NC}"
        echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
        echo -e "${RED}${WARNING} EMERGENCY PROCEDURES - Use only in critical situations${NC}"
        echo
        echo "1. ${RED}Emergency Database Restore${NC}   - Rapid database recovery"
        echo "2. ${RED}Emergency System Restore${NC}     - Quick system recovery"
        echo "3. ${RED}Emergency Backup Creation${NC}    - Immediate backup before intervention"
        echo "4. ${RED}System Isolation${NC}             - Isolate system for security incidents"
        echo "5. ${RED}Emergency Contacts${NC}           - Display emergency contact information"
        echo "6. ${RED}Quick Diagnostics${NC}            - Rapid system diagnostics"
        echo "7. ${WHITE}Emergency Procedures Guide${NC}  - Display emergency procedures"
        echo "8. ${GREEN}Back to Main Menu${NC}         - Return to main menu"
        echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
        
        read -p "Select option [1-8]: " choice
        
        case $choice in
            1) emergency_database_restore ;;
            2) emergency_system_restore ;;
            3) emergency_backup_creation ;;
            4) system_isolation ;;
            5) emergency_contacts ;;
            6) quick_diagnostics ;;
            7) emergency_procedures_guide ;;
            8) break ;;
            *) echo -e "${RED}Invalid option. Please try again.${NC}"; sleep 2 ;;
        esac
    done
}

# Emergency database restore
emergency_database_restore() {
    display_header
    echo -e "${RED}Emergency Database Restore${NC}"
    echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
    echo -e "${RED}${WARNING} EMERGENCY PROCEDURE - This will immediately restore the database${NC}"
    echo
    
    # Find the most recent backup
    local latest_backup
    latest_backup=$(find /var/backups/ai-platform -name "backup-*.tar.gz*" -type f | sort -r | head -1)
    
    if [[ -n "$latest_backup" ]]; then
        echo -e "${BLUE}Latest backup found:${NC} $(basename "$latest_backup")"
        echo -e "${BLUE}Backup date:${NC} $(date -r "$latest_backup")"
        echo
        
        echo -e "${RED}This will IMMEDIATELY restore the database from the latest backup${NC}"
        echo -e "${RED}Current database will be OVERWRITTEN${NC}"
        read -p "Type 'EMERGENCY' to confirm: " confirm
        
        if [[ "$confirm" == "EMERGENCY" ]]; then
            echo -e "${RED}EMERGENCY DATABASE RESTORE IN PROGRESS...${NC}"
            
            # Stop services
            systemctl stop ai-platform-api ai-platform-workers ai-platform-web
            
            # Restore database
            if $RECOVERY_SCRIPT database "$latest_backup" --force --emergency; then
                echo -e "${GREEN}${CHECKMARK} Emergency database restore completed${NC}"
                
                # Restart services
                systemctl start ai-platform-api
                systemctl start ai-platform-workers  
                systemctl start ai-platform-web
                
                echo -e "${GREEN}${CHECKMARK} Services restarted${NC}"
            else
                echo -e "${RED}${CROSSMARK} Emergency database restore failed${NC}"
            fi
        else
            echo -e "${YELLOW}Emergency restore cancelled${NC}"
        fi
    else
        echo -e "${RED}No backup files found for emergency restore${NC}"
    fi
    
    read -p "Press Enter to continue..."
}

# Quick diagnostics
quick_diagnostics() {
    display_header
    echo -e "${RED}Quick System Diagnostics${NC}"
    echo -e "${CYAN}------------------------------------------------------------------------------------------------${NC}"
    
    echo -e "${WHITE}System Overview:${NC}"
    echo "Hostname: $(hostname)"
    echo "Uptime: $(uptime -p 2>/dev/null || uptime)"
    echo "Load: $(uptime | awk -F'load average:' '{print $2}')"
    echo "Memory: $(free -h | grep '^Mem:' | awk '{print $3 "/" $2}')"
    echo "Disk: $(df -h / | tail -1 | awk '{print $5 " used"}')"
    echo
    
    echo -e "${WHITE}Critical Services:${NC}"
    systemctl is-active postgresql redis nginx docker | paste <(echo -e "PostgreSQL\nRedis\nNginx\nDocker") -
    echo
    
    echo -e "${WHITE}Network Connectivity:${NC}"
    if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        echo -e "${GREEN}${CHECKMARK} Internet connectivity${NC}"
    else
        echo -e "${RED}${CROSSMARK} No internet connectivity${NC}"
    fi
    
    if curl -s -f http://localhost:8080/health >/dev/null 2>&1; then
        echo -e "${GREEN}${CHECKMARK} API service responding${NC}"
    else
        echo -e "${RED}${CROSSMARK} API service not responding${NC}"
    fi
    echo
    
    echo -e "${WHITE}Recent Errors:${NC}"
    journalctl --since "1 hour ago" --priority err --no-pager | head -5
    
    read -p "Press Enter to continue..."
}

# Main execution
main() {
    # Check if running as root or with sudo
    if [[ $EUID -ne 0 ]]; then
        echo -e "${RED}This script must be run as root or with sudo${NC}"
        exit 1
    fi
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Check if required scripts exist
    local required_scripts=("$BACKUP_SCRIPT" "$RECOVERY_SCRIPT" "$SCHEDULER_SCRIPT" "$DR_TEST_SCRIPT")
    for script in "${required_scripts[@]}"; do
        if [[ ! -x "$script" ]]; then
            echo -e "${RED}Required script not found or not executable: $script${NC}"
            exit 1
        fi
    done
    
    log "INFO" "Backup & Restore Manager started"
    
    # Main menu loop
    while true; do
        display_main_menu
        
        read -p "Select option [1-10]: " choice
        
        case $choice in
            1) backup_operations_menu ;;
            2) recovery_operations_menu ;;
            3) dr_testing_menu ;;
            4) echo "Backup Management - Not implemented yet"; sleep 2 ;;
            5) system_health_check ;;
            6) configuration_menu ;;
            7) echo "Monitoring & Reports - Not implemented yet"; sleep 2 ;;
            8) emergency_procedures_menu ;;
            9) echo "Documentation - Not implemented yet"; sleep 2 ;;
            10) 
                echo -e "${GREEN}Goodbye!${NC}"
                log "INFO" "Backup & Restore Manager exited"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid option. Please try again.${NC}"
                sleep 2
                ;;
        esac
    done
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi