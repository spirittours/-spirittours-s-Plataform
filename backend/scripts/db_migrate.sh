#!/bin/bash
###############################################################################
# Database Migration Management Script
# Comprehensive tool for managing Alembic migrations
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to backend directory
cd "$BACKEND_DIR"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

check_database() {
    print_info "Checking database connection..."
    
    if ! python3 -c "
import sys
from sqlalchemy import create_engine, text
import os

try:
    db_url = os.getenv('DATABASE_URL', 'postgresql://spirittours:spirit2024@localhost:5432/spirittours_db')
    engine = create_engine(db_url)
    with engine.connect() as conn:
        result = conn.execute(text('SELECT 1'))
        result.fetchone()
    print('✓ Database connection successful')
    sys.exit(0)
except Exception as e:
    print(f'✗ Database connection failed: {e}')
    sys.exit(1)
" 2>&1; then
        print_error "Cannot connect to database"
        return 1
    fi
    
    print_success "Database connection verified"
    return 0
}

###############################################################################
# Migration Commands
###############################################################################

cmd_status() {
    print_header "Migration Status"
    
    if ! check_database; then
        exit 1
    fi
    
    print_info "Current migration status:"
    echo ""
    
    python3 -m alembic current 2>&1 || {
        print_warning "Alembic may not be initialized yet"
        return 1
    }
    
    echo ""
    print_info "Migration history:"
    echo ""
    python3 -m alembic history --verbose 2>&1 | tail -20
}

cmd_upgrade() {
    local target="${1:-head}"
    
    print_header "Upgrading Database"
    
    if ! check_database; then
        exit 1
    fi
    
    print_info "Target migration: $target"
    echo ""
    
    if [[ "$target" == "head" ]]; then
        print_info "Upgrading to latest migration..."
    else
        print_info "Upgrading to migration: $target"
    fi
    
    python3 -m alembic upgrade "$target" 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Database upgraded successfully"
    else
        print_error "Migration upgrade failed"
        return 1
    fi
}

cmd_downgrade() {
    local target="${1:--1}"
    
    print_header "Downgrading Database"
    
    if ! check_database; then
        exit 1
    fi
    
    print_warning "This will rollback your database!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        print_info "Downgrade cancelled"
        return 0
    fi
    
    print_info "Target: $target"
    echo ""
    
    python3 -m alembic downgrade "$target" 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Database downgraded successfully"
    else
        print_error "Migration downgrade failed"
        return 1
    fi
}

cmd_create() {
    local message="$1"
    
    if [ -z "$message" ]; then
        print_error "Migration message is required"
        echo "Usage: $0 create \"migration message\""
        exit 1
    fi
    
    print_header "Creating New Migration"
    
    print_info "Message: $message"
    echo ""
    
    python3 -m alembic revision --autogenerate -m "$message" 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Migration created successfully"
        print_info "Review the generated migration file before applying"
    else
        print_error "Migration creation failed"
        return 1
    fi
}

cmd_seed() {
    print_header "Seeding Database"
    
    if ! check_database; then
        exit 1
    fi
    
    if [ ! -f "database/seeds.py" ]; then
        print_error "Seeds file not found: database/seeds.py"
        exit 1
    fi
    
    print_info "Running seed script..."
    echo ""
    
    python3 database/seeds.py "$@"
    
    if [ $? -eq 0 ]; then
        print_success "Database seeded successfully"
    else
        print_error "Seeding failed"
        return 1
    fi
}

cmd_reset() {
    print_header "Resetting Database"
    
    if ! check_database; then
        exit 1
    fi
    
    print_warning "This will:"
    echo "  1. Downgrade all migrations"
    echo "  2. Upgrade to latest"
    echo "  3. Seed with test data"
    echo ""
    read -p "Are you ABSOLUTELY sure? Type 'RESET' to confirm: " confirm
    
    if [[ "$confirm" != "RESET" ]]; then
        print_info "Reset cancelled"
        return 0
    fi
    
    print_info "Step 1: Downgrading to base..."
    python3 -m alembic downgrade base 2>&1
    
    print_info "Step 2: Upgrading to head..."
    python3 -m alembic upgrade head 2>&1
    
    print_info "Step 3: Seeding database..."
    python3 database/seeds.py 2>&1
    
    print_success "Database reset complete"
}

cmd_backup() {
    local backup_dir="${BACKUP_DIR:-./backups}"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$backup_dir/spirittours_backup_$timestamp.sql"
    
    print_header "Database Backup"
    
    mkdir -p "$backup_dir"
    
    print_info "Creating backup: $backup_file"
    
    # Extract connection details
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
    DB_NAME="${DB_NAME:-spirittours_db}"
    DB_USER="${DB_USER:-spirittours}"
    
    PGPASSWORD="${DB_PASSWORD:-spirit2024}" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -F p \
        -f "$backup_file" 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Backup created: $backup_file"
        
        # Compress backup
        gzip "$backup_file" 2>&1
        print_success "Backup compressed: ${backup_file}.gz"
    else
        print_error "Backup failed"
        return 1
    fi
}

cmd_restore() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        print_error "Backup file is required"
        echo "Usage: $0 restore path/to/backup.sql.gz"
        exit 1
    fi
    
    print_header "Database Restore"
    
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_warning "This will OVERWRITE the current database!"
    read -p "Are you sure? Type 'RESTORE' to confirm: " confirm
    
    if [[ "$confirm" != "RESTORE" ]]; then
        print_info "Restore cancelled"
        return 0
    fi
    
    # Extract connection details
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
    DB_NAME="${DB_NAME:-spirittours_db}"
    DB_USER="${DB_USER:-spirittours}"
    
    print_info "Restoring from: $backup_file"
    
    # Decompress if needed
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" | PGPASSWORD="${DB_PASSWORD:-spirit2024}" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" 2>&1
    else
        PGPASSWORD="${DB_PASSWORD:-spirit2024}" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -f "$backup_file" 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        print_success "Database restored successfully"
    else
        print_error "Restore failed"
        return 1
    fi
}

cmd_help() {
    cat << EOF
${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${BLUE}  Spirit Tours - Database Migration Manager${NC}
${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${GREEN}Usage:${NC}
  $0 <command> [options]

${GREEN}Commands:${NC}
  ${YELLOW}status${NC}                    Show current migration status
  ${YELLOW}upgrade [target]${NC}          Upgrade to target migration (default: head)
  ${YELLOW}downgrade [target]${NC}        Downgrade to target migration (default: -1)
  ${YELLOW}create "message"${NC}          Create new migration with message
  ${YELLOW}seed [--no-cleanup]${NC}       Seed database with test data
  ${YELLOW}reset${NC}                     Reset database (downgrade + upgrade + seed)
  ${YELLOW}backup${NC}                    Create database backup
  ${YELLOW}restore <file>${NC}            Restore database from backup
  ${YELLOW}help${NC}                      Show this help message

${GREEN}Examples:${NC}
  $0 status                                    # Show current status
  $0 upgrade                                   # Upgrade to latest
  $0 upgrade 005_complete_schema              # Upgrade to specific migration
  $0 downgrade -1                             # Downgrade one step
  $0 create "add user preferences table"      # Create new migration
  $0 seed                                     # Seed with test data
  $0 reset                                    # Full reset
  $0 backup                                   # Create backup
  $0 restore backups/backup_20251101.sql.gz  # Restore from backup

${GREEN}Environment Variables:${NC}
  DATABASE_URL       Full database connection URL
  DB_HOST            Database host (default: localhost)
  DB_PORT            Database port (default: 5432)
  DB_NAME            Database name (default: spirittours_db)
  DB_USER            Database user (default: spirittours)
  DB_PASSWORD        Database password (default: spirit2024)
  BACKUP_DIR         Backup directory (default: ./backups)

${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
EOF
}

###############################################################################
# Main
###############################################################################

main() {
    local command="${1:-help}"
    shift || true
    
    case "$command" in
        status)
            cmd_status "$@"
            ;;
        upgrade)
            cmd_upgrade "$@"
            ;;
        downgrade)
            cmd_downgrade "$@"
            ;;
        create)
            cmd_create "$@"
            ;;
        seed)
            cmd_seed "$@"
            ;;
        reset)
            cmd_reset "$@"
            ;;
        backup)
            cmd_backup "$@"
            ;;
        restore)
            cmd_restore "$@"
            ;;
        help|--help|-h)
            cmd_help
            ;;
        *)
            print_error "Unknown command: $command"
            echo ""
            cmd_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
