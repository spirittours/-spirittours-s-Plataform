#!/bin/bash

# ============================================
# Spirit Tours CMS - Utility Scripts
# ============================================
# Collection of helpful scripts for CMS development and testing
#
# Usage: bash scripts/cms-utils.sh [command]
#
# Commands:
#   setup          - Complete CMS setup (MongoDB + seed)
#   seed           - Run seed script only
#   reset          - Delete all pages and re-seed
#   verify         - Verify CMS installation
#   backup         - Backup all CMS pages
#   restore        - Restore pages from backup
#   count          - Count pages in database
#   list           - List all pages (title, slug, status)
#   clean          - Clean up test pages
#   help           - Show this help message
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/home/user/webapp"
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/spirit-tours}"
BACKUP_DIR="$PROJECT_ROOT/backups/cms"

# Helper functions
print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check MongoDB connection
check_mongodb() {
    print_info "Checking MongoDB connection..."
    
    if ! command -v mongosh &> /dev/null; then
        print_error "mongosh not found. Please install MongoDB shell."
        return 1
    fi
    
    if mongosh "$MONGODB_URI" --eval "db.version()" &> /dev/null; then
        print_success "MongoDB is running and accessible"
        return 0
    else
        print_error "Cannot connect to MongoDB at: $MONGODB_URI"
        print_info "Make sure MongoDB is running and MONGODB_URI is correct"
        return 1
    fi
}

# Setup command - Complete CMS setup
cmd_setup() {
    print_header "CMS Complete Setup"
    
    print_info "This will set up the CMS with MongoDB and seed initial pages"
    read -p "Continue? (y/n) " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Setup cancelled"
        exit 0
    fi
    
    # Check MongoDB
    if ! check_mongodb; then
        print_error "Setup failed: MongoDB not available"
        exit 1
    fi
    
    # Run seed script
    print_info "Running seed script..."
    cd "$PROJECT_ROOT"
    node scripts/seed-institutional-pages.js
    
    print_success "CMS setup complete!"
    print_info "Access the CMS at: http://localhost:3000/admin/cms/pages"
}

# Seed command - Run seed script only
cmd_seed() {
    print_header "Running Seed Script"
    
    check_mongodb || exit 1
    
    cd "$PROJECT_ROOT"
    node scripts/seed-institutional-pages.js
}

# Reset command - Delete all and re-seed
cmd_reset() {
    print_header "Reset CMS Pages"
    
    print_warning "This will DELETE ALL PAGES and re-seed from scratch"
    read -p "Are you ABSOLUTELY SURE? (yes/no) " -r
    echo
    
    if [[ ! $REPLY == "yes" ]]; then
        print_warning "Reset cancelled"
        exit 0
    fi
    
    check_mongodb || exit 1
    
    print_info "Deleting all pages..."
    mongosh "$MONGODB_URI" --eval "db.pages.deleteMany({})" --quiet
    
    print_success "All pages deleted"
    
    print_info "Re-seeding pages..."
    cmd_seed
    
    print_success "Reset complete!"
}

# Verify command - Check installation
cmd_verify() {
    print_header "CMS Installation Verification"
    
    # Check MongoDB
    print_info "Checking MongoDB..."
    if check_mongodb; then
        print_success "MongoDB: OK"
    else
        print_error "MongoDB: FAILED"
        exit 1
    fi
    
    # Check page count
    print_info "Checking pages..."
    local count=$(mongosh "$MONGODB_URI" --eval "db.pages.countDocuments()" --quiet)
    echo -e "  Pages found: ${GREEN}$count${NC}"
    
    if [ "$count" -ge 12 ]; then
        print_success "Pages: OK (expected 12, found $count)"
    else
        print_warning "Pages: Only $count found (expected 12)"
    fi
    
    # Check backend
    print_info "Checking backend server..."
    if curl -s http://localhost:5001/health > /dev/null 2>&1; then
        print_success "Backend: Running on port 5001"
    else
        print_warning "Backend: Not running or not accessible"
        print_info "Start with: cd backend && npm start"
    fi
    
    # Check frontend
    print_info "Checking frontend server..."
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend: Running on port 3000"
    else
        print_warning "Frontend: Not running or not accessible"
        print_info "Start with: cd spirit-tours && npm start"
    fi
    
    print_header "Verification Summary"
    print_success "CMS installation verified!"
}

# Backup command - Backup all pages
cmd_backup() {
    print_header "Backup CMS Pages"
    
    check_mongodb || exit 1
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Generate backup filename with timestamp
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$BACKUP_DIR/pages_backup_$timestamp.json"
    
    print_info "Creating backup..."
    
    # Export pages to JSON
    mongosh "$MONGODB_URI" --eval "
        const pages = db.pages.find().toArray();
        print(JSON.stringify(pages, null, 2));
    " --quiet > "$backup_file"
    
    local file_size=$(du -h "$backup_file" | cut -f1)
    
    print_success "Backup created: $backup_file"
    print_info "Size: $file_size"
    print_info "Pages backed up: $(mongosh "$MONGODB_URI" --eval "db.pages.countDocuments()" --quiet)"
}

# Restore command - Restore from backup
cmd_restore() {
    print_header "Restore CMS Pages"
    
    # List available backups
    print_info "Available backups:"
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR")" ]; then
        print_warning "No backups found in $BACKUP_DIR"
        exit 1
    fi
    
    ls -1 "$BACKUP_DIR"/*.json | nl
    
    echo ""
    read -p "Enter backup number to restore (or 'q' to quit): " backup_num
    
    if [[ $backup_num == "q" ]]; then
        print_warning "Restore cancelled"
        exit 0
    fi
    
    local backup_file=$(ls -1 "$BACKUP_DIR"/*.json | sed -n "${backup_num}p")
    
    if [ ! -f "$backup_file" ]; then
        print_error "Invalid backup number"
        exit 1
    fi
    
    print_warning "This will DELETE current pages and restore from backup"
    read -p "Continue? (yes/no) " -r
    echo
    
    if [[ ! $REPLY == "yes" ]]; then
        print_warning "Restore cancelled"
        exit 0
    fi
    
    check_mongodb || exit 1
    
    print_info "Deleting current pages..."
    mongosh "$MONGODB_URI" --eval "db.pages.deleteMany({})" --quiet
    
    print_info "Restoring from backup..."
    mongoimport --uri="$MONGODB_URI" --collection=pages --file="$backup_file" --jsonArray
    
    print_success "Restore complete!"
}

# Count command - Count pages
cmd_count() {
    check_mongodb || exit 1
    
    local count=$(mongosh "$MONGODB_URI" --eval "db.pages.countDocuments()" --quiet)
    print_success "Total pages: $count"
    
    # Count by status
    print_info "Breakdown by status:"
    mongosh "$MONGODB_URI" --eval "
        db.pages.aggregate([
            { \$group: { _id: '\$status', count: { \$sum: 1 } } },
            { \$sort: { _id: 1 } }
        ]).forEach(doc => print('  ' + doc._id + ': ' + doc.count))
    " --quiet
}

# List command - List all pages
cmd_list() {
    check_mongodb || exit 1
    
    print_header "CMS Pages List"
    
    mongosh "$MONGODB_URI" --eval "
        db.pages.find({}, { title: 1, slug: 1, status: 1, type: 1, updatedAt: 1 })
            .sort({ updatedAt: -1 })
            .forEach(doc => {
                print(
                    doc.title.padEnd(40) + ' | ' +
                    doc.slug.padEnd(25) + ' | ' +
                    doc.status.padEnd(10) + ' | ' +
                    doc.type.padEnd(10)
                );
            });
    " --quiet
}

# Clean command - Remove test pages
cmd_clean() {
    print_header "Clean Test Pages"
    
    check_mongodb || exit 1
    
    print_info "This will delete pages with 'test' in the slug"
    
    # Show test pages
    local test_count=$(mongosh "$MONGODB_URI" --eval "
        db.pages.countDocuments({ slug: /test/i })
    " --quiet)
    
    if [ "$test_count" -eq 0 ]; then
        print_info "No test pages found"
        exit 0
    fi
    
    print_warning "Found $test_count test page(s):"
    mongosh "$MONGODB_URI" --eval "
        db.pages.find({ slug: /test/i }, { title: 1, slug: 1 })
            .forEach(doc => print('  - ' + doc.title + ' (' + doc.slug + ')'));
    " --quiet
    
    echo ""
    read -p "Delete these pages? (y/n) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        mongosh "$MONGODB_URI" --eval "
            const result = db.pages.deleteMany({ slug: /test/i });
            print('Deleted ' + result.deletedCount + ' page(s)');
        " --quiet
        print_success "Test pages cleaned"
    else
        print_warning "Cleaning cancelled"
    fi
}

# Help command
cmd_help() {
    cat << EOF

${BLUE}Spirit Tours CMS - Utility Scripts${NC}

${GREEN}Usage:${NC}
  bash scripts/cms-utils.sh [command]

${GREEN}Commands:${NC}
  ${YELLOW}setup${NC}          Complete CMS setup (MongoDB + seed)
  ${YELLOW}seed${NC}           Run seed script only
  ${YELLOW}reset${NC}          Delete all pages and re-seed
  ${YELLOW}verify${NC}         Verify CMS installation
  ${YELLOW}backup${NC}         Backup all CMS pages
  ${YELLOW}restore${NC}        Restore pages from backup
  ${YELLOW}count${NC}          Count pages in database
  ${YELLOW}list${NC}           List all pages (title, slug, status)
  ${YELLOW}clean${NC}          Clean up test pages
  ${YELLOW}help${NC}           Show this help message

${GREEN}Examples:${NC}
  # Complete setup
  bash scripts/cms-utils.sh setup

  # Backup before making changes
  bash scripts/cms-utils.sh backup

  # Verify everything is working
  bash scripts/cms-utils.sh verify

  # Clean up test pages
  bash scripts/cms-utils.sh clean

${GREEN}Environment Variables:${NC}
  MONGODB_URI    MongoDB connection string
                 Default: mongodb://localhost:27017/spirit-tours

${GREEN}Requirements:${NC}
  - MongoDB running and accessible
  - mongosh (MongoDB Shell) installed
  - Node.js installed

EOF
}

# Main command dispatcher
main() {
    local command="${1:-help}"
    
    case "$command" in
        setup)
            cmd_setup
            ;;
        seed)
            cmd_seed
            ;;
        reset)
            cmd_reset
            ;;
        verify)
            cmd_verify
            ;;
        backup)
            cmd_backup
            ;;
        restore)
            cmd_restore
            ;;
        count)
            cmd_count
            ;;
        list)
            cmd_list
            ;;
        clean)
            cmd_clean
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
