#!/bin/bash

###############################################################################
# Spirit Tours - Database Initialization Script
# Version: 1.0.0
# Descripción: Inicialización completa de base de datos para producción
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="/opt/spirit-tours"
ENV_FILE="${PROJECT_ROOT}/.env.production"

log_info() {
    echo -e "${BLUE}ℹ ${NC}$@"
}

log_success() {
    echo -e "${GREEN}✓${NC} $@"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $@"
}

log_error() {
    echo -e "${RED}✗${NC} $@"
}

print_header() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
    log_success "Variables de entorno cargadas"
else
    log_error "Archivo .env.production no encontrado"
    exit 1
fi

main() {
    cat << "EOF"
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║        🗄️  SPIRIT TOURS - DATABASE INITIALIZATION  🗄️              ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
EOF

    print_header "Verificando Conexión a PostgreSQL"
    
    # Test database connection
    if PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d postgres -c '\q' 2>/dev/null; then
        log_success "Conexión a PostgreSQL exitosa"
    else
        log_error "No se pudo conectar a PostgreSQL"
        log_error "Verifique que PostgreSQL esté corriendo y las credenciales sean correctas"
        exit 1
    fi
    
    print_header "Creando Base de Datos"
    
    # Check if database exists
    if PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -lqt | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
        log_warning "Base de datos '${DB_NAME}' ya existe"
        
        read -p "¿Desea recrearla? Esto BORRARÁ todos los datos (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Eliminando base de datos existente..."
            PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d postgres -c "DROP DATABASE ${DB_NAME};"
            log_success "Base de datos eliminada"
        else
            log_info "Usando base de datos existente"
        fi
    fi
    
    # Create database if it doesn't exist
    if ! PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -lqt | cut -d \| -f 1 | grep -qw "${DB_NAME}"; then
        log_info "Creando base de datos '${DB_NAME}'..."
        PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
        log_success "Base de datos creada"
    fi
    
    print_header "Instalando Extensiones de PostgreSQL"
    
    # Install extensions
    local extensions=(
        "uuid-ossp"
        "pg_trgm"
        "btree_gin"
        "pgcrypto"
        "hstore"
    )
    
    for ext in "${extensions[@]}"; do
        log_info "Instalando extensión: ${ext}..."
        PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" \
            -c "CREATE EXTENSION IF NOT EXISTS \"${ext}\";" 2>/dev/null || log_warning "Extensión ${ext} ya existe o no está disponible"
    done
    
    log_success "Extensiones instaladas"
    
    print_header "Ejecutando Migraciones"
    
    cd "${PROJECT_ROOT}/backend"
    
    # Activate virtual environment
    if [ -d "${PROJECT_ROOT}/venv" ]; then
        source "${PROJECT_ROOT}/venv/bin/activate"
    fi
    
    # Run migrations
    log_info "Ejecutando init_database.py..."
    python init_database.py
    
    if [ $? -eq 0 ]; then
        log_success "Migraciones ejecutadas exitosamente"
    else
        log_error "Error al ejecutar migraciones"
        exit 1
    fi
    
    print_header "Creando Datos Iniciales"
    
    # Create initial data
    log_info "Creando usuario administrador..."
    
    PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" << EOF
-- Create admin user if not exists
INSERT INTO users (id, email, username, password_hash, role, is_active, created_at)
VALUES (
    gen_random_uuid(),
    'admin@spirittours.com',
    'admin',
    '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5UpNKfNJZIZGi', -- password: Admin123!
    'admin',
    true,
    NOW()
)
ON CONFLICT (email) DO NOTHING;
EOF
    
    log_success "Datos iniciales creados"
    
    print_header "Verificando Estructura de Base de Datos"
    
    # Count tables
    local table_count=$(PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    
    log_success "Total de tablas: ${table_count}"
    
    # List tables
    log_info "Listando tablas principales..."
    PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -c "\dt" | grep -E "users|bookings|email_campaigns|contacts"
    
    print_header "Configurando Backup Automático"
    
    # Create backup script
    cat > /usr/local/bin/backup-spirit-db.sh << 'BACKUP_SCRIPT'
#!/bin/bash
BACKUP_DIR="/var/backups/spirit-tours"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="spirit_tours_${DATE}.sql.gz"

mkdir -p $BACKUP_DIR

# Dump database
PGPASSWORD="${DB_PASSWORD}" pg_dump -h "${DB_HOST}" -U "${DB_USER}" "${DB_NAME}" | gzip > "${BACKUP_DIR}/${FILENAME}"

# Delete old backups (30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${FILENAME}"
BACKUP_SCRIPT
    
    chmod +x /usr/local/bin/backup-spirit-db.sh
    log_success "Script de backup creado"
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-spirit-db.sh >> /var/log/spirit-tours/backup.log 2>&1") | crontab -
    log_success "Cron job de backup configurado (diario a las 2 AM)"
    
    print_header "Resumen de Inicialización"
    
    echo ""
    echo "✅ Base de datos inicializada exitosamente"
    echo ""
    echo "📊 Información:"
    echo "   • Base de datos: ${DB_NAME}"
    echo "   • Host: ${DB_HOST}"
    echo "   • Usuario: ${DB_USER}"
    echo "   • Tablas creadas: ${table_count}"
    echo ""
    echo "👤 Usuario administrador:"
    echo "   • Email: admin@spirittours.com"
    echo "   • Password: Admin123! (¡Cámbielo inmediatamente!)"
    echo ""
    echo "💾 Backup:"
    echo "   • Script: /usr/local/bin/backup-spirit-db.sh"
    echo "   • Ubicación: /var/backups/spirit-tours"
    echo "   • Frecuencia: Diaria a las 2 AM"
    echo "   • Retención: 30 días"
    echo ""
    
    log_success "Inicialización completada"
}

main "$@"
