#!/bin/bash

###############################################################################
# Spirit Tours - Production Deployment Script
# Version: 1.0.0
# Descripción: Script automatizado para deployment en producción
#
# Uso:
#   ./scripts/deploy-production.sh [options]
#
# Options:
#   --skip-backup     Skip database backup
#   --skip-tests      Skip test execution
#   --force           Force deployment without confirmation
#   --help            Show this help message
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="/opt/spirit-tours"
BACKUP_DIR="/var/backups/spirit-tours"
LOG_FILE="/var/log/spirit-tours/deployment.log"
VENV_PATH="${PROJECT_ROOT}/venv"

# Flags
SKIP_BACKUP=false
SKIP_TESTS=false
FORCE=false

###############################################################################
# Functions
###############################################################################

log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() {
    echo -e "${BLUE}ℹ ${NC}$@"
    log "INFO" "$@"
}

log_success() {
    echo -e "${GREEN}✓${NC} $@"
    log "SUCCESS" "$@"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $@"
    log "WARNING" "$@"
}

log_error() {
    echo -e "${RED}✗${NC} $@"
    log "ERROR" "$@"
}

print_header() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

check_root() {
    if [ "$EUID" -ne 0 ]; then 
        log_error "Este script debe ejecutarse como root o con sudo"
        exit 1
    fi
}

check_prerequisites() {
    print_header "Verificando Pre-requisitos"
    
    local missing_deps=()
    
    # Check required commands
    for cmd in git python3 node npm nginx postgresql redis-server docker docker-compose; do
        if ! command -v $cmd &> /dev/null; then
            missing_deps+=($cmd)
            log_error "$cmd no está instalado"
        else
            log_success "$cmd está instalado"
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Dependencias faltantes: ${missing_deps[*]}"
        log_error "Por favor instale las dependencias requeridas antes de continuar"
        exit 1
    fi
    
    log_success "Todos los pre-requisitos están instalados"
}

check_environment() {
    print_header "Verificando Variables de Entorno"
    
    if [ ! -f "${PROJECT_ROOT}/.env.production" ]; then
        log_error "Archivo .env.production no encontrado"
        log_error "Por favor cree el archivo basándose en .env.example"
        exit 1
    fi
    
    log_success "Archivo .env.production encontrado"
    
    # Source environment variables
    set -a
    source "${PROJECT_ROOT}/.env.production"
    set +a
    
    # Check critical environment variables
    local required_vars=(
        "DB_HOST" "DB_NAME" "DB_USER" "DB_PASSWORD"
        "REDIS_HOST" "JWT_SECRET"
        "SMTP_HOST" "SMTP_USER" "SMTP_PASSWORD"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            log_error "Variable de entorno $var no está definida"
            exit 1
        else
            log_success "$var está configurada"
        fi
    done
}

backup_database() {
    if [ "$SKIP_BACKUP" = true ]; then
        log_warning "Saltando backup de base de datos (--skip-backup)"
        return 0
    fi
    
    print_header "Creando Backup de Base de Datos"
    
    mkdir -p "${BACKUP_DIR}"
    
    local backup_file="${BACKUP_DIR}/pre_deployment_$(date +%Y%m%d_%H%M%S).sql.gz"
    
    log_info "Creando backup en: ${backup_file}"
    
    PGPASSWORD="${DB_PASSWORD}" pg_dump \
        -h "${DB_HOST}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        | gzip > "${backup_file}"
    
    if [ $? -eq 0 ]; then
        log_success "Backup creado exitosamente"
        log_info "Ubicación: ${backup_file}"
    else
        log_error "Error al crear backup"
        exit 1
    fi
}

stop_services() {
    print_header "Deteniendo Servicios"
    
    local services=(
        "spirit-tours-api"
        "spirit-tours-email-worker"
        "nginx"
    )
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service"; then
            log_info "Deteniendo $service..."
            systemctl stop "$service"
            log_success "$service detenido"
        else
            log_warning "$service ya está detenido"
        fi
    done
}

pull_latest_code() {
    print_header "Actualizando Código"
    
    cd "${PROJECT_ROOT}"
    
    log_info "Obteniendo últimos cambios de Git..."
    git fetch origin
    
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    log_info "Branch actual: ${current_branch}"
    
    log_info "Haciendo pull de origin/${current_branch}..."
    git pull origin "${current_branch}"
    
    local commit_hash=$(git rev-parse --short HEAD)
    log_success "Código actualizado a commit: ${commit_hash}"
}

install_backend_dependencies() {
    print_header "Instalando Dependencias del Backend"
    
    cd "${PROJECT_ROOT}"
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "${VENV_PATH}" ]; then
        log_info "Creando virtual environment..."
        python3 -m venv "${VENV_PATH}"
    fi
    
    log_info "Activando virtual environment..."
    source "${VENV_PATH}/bin/activate"
    
    log_info "Actualizando pip..."
    pip install --upgrade pip
    
    log_info "Instalando dependencias de requirements.txt..."
    pip install -r requirements.txt
    
    log_success "Dependencias del backend instaladas"
}

install_frontend_dependencies() {
    print_header "Instalando Dependencias del Frontend"
    
    cd "${PROJECT_ROOT}/frontend"
    
    log_info "Instalando dependencias de npm..."
    npm ci --production
    
    log_success "Dependencias del frontend instaladas"
}

build_frontend() {
    print_header "Compilando Frontend"
    
    cd "${PROJECT_ROOT}/frontend"
    
    log_info "Ejecutando build de producción..."
    npm run build
    
    if [ $? -eq 0 ]; then
        log_success "Frontend compilado exitosamente"
        log_info "Build ubicado en: ${PROJECT_ROOT}/frontend/build"
    else
        log_error "Error al compilar frontend"
        exit 1
    fi
}

run_database_migrations() {
    print_header "Ejecutando Migraciones de Base de Datos"
    
    cd "${PROJECT_ROOT}/backend"
    source "${VENV_PATH}/bin/activate"
    
    log_info "Ejecutando migraciones..."
    python init_database.py
    
    if [ $? -eq 0 ]; then
        log_success "Migraciones ejecutadas exitosamente"
    else
        log_error "Error al ejecutar migraciones"
        exit 1
    fi
}

run_tests() {
    if [ "$SKIP_TESTS" = true ]; then
        log_warning "Saltando ejecución de tests (--skip-tests)"
        return 0
    fi
    
    print_header "Ejecutando Tests"
    
    cd "${PROJECT_ROOT}/backend"
    source "${VENV_PATH}/bin/activate"
    
    log_info "Ejecutando test suite..."
    pytest tests/ -v --tb=short
    
    if [ $? -eq 0 ]; then
        log_success "Todos los tests pasaron"
    else
        log_error "Algunos tests fallaron"
        log_error "Revise los logs para más detalles"
        
        if [ "$FORCE" = false ]; then
            read -p "¿Continuar con el deployment? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_info "Deployment cancelado"
                exit 1
            fi
        fi
    fi
}

setup_systemd_services() {
    print_header "Configurando Servicios Systemd"
    
    log_info "Recargando daemon de systemd..."
    systemctl daemon-reload
    
    log_info "Habilitando servicios..."
    systemctl enable spirit-tours-api
    systemctl enable spirit-tours-email-worker
    
    log_success "Servicios configurados"
}

start_services() {
    print_header "Iniciando Servicios"
    
    local services=(
        "postgresql"
        "redis-server"
        "spirit-tours-api"
        "spirit-tours-email-worker"
        "nginx"
    )
    
    for service in "${services[@]}"; do
        log_info "Iniciando $service..."
        systemctl start "$service"
        
        sleep 2
        
        if systemctl is-active --quiet "$service"; then
            log_success "$service iniciado correctamente"
        else
            log_error "Error al iniciar $service"
            systemctl status "$service" --no-pager
            exit 1
        fi
    done
}

health_check() {
    print_header "Verificando Health Check"
    
    local api_url="http://localhost:8000/health"
    local max_attempts=30
    local attempt=0
    
    log_info "Esperando a que la API esté lista..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf "${api_url}" > /dev/null 2>&1; then
            log_success "API está respondiendo correctamente"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    echo ""
    log_error "API no responde después de ${max_attempts} intentos"
    log_error "Revise los logs: journalctl -u spirit-tours-api -n 50"
    exit 1
}

deployment_summary() {
    print_header "Resumen del Deployment"
    
    local commit_hash=$(git rev-parse --short HEAD)
    local deployment_time=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo ""
    echo "✅ Deployment completado exitosamente"
    echo ""
    echo "📊 Información del Deployment:"
    echo "   • Commit: ${commit_hash}"
    echo "   • Fecha: ${deployment_time}"
    echo "   • Usuario: $(whoami)"
    echo "   • Host: $(hostname)"
    echo ""
    echo "🔗 URLs:"
    echo "   • API: http://$(hostname):8000"
    echo "   • Frontend: http://$(hostname)"
    echo "   • Docs: http://$(hostname)/api/docs"
    echo ""
    echo "📝 Logs:"
    echo "   • API: journalctl -u spirit-tours-api -f"
    echo "   • Email Worker: journalctl -u spirit-tours-email-worker -f"
    echo "   • Nginx: tail -f /var/log/nginx/access.log"
    echo ""
    echo "💾 Backup:"
    echo "   • Ubicación: ${BACKUP_DIR}"
    echo ""
    
    log_success "Deployment finalizado"
}

rollback() {
    print_header "Ejecutando Rollback"
    
    log_warning "Iniciando rollback..."
    
    # Find last backup
    local last_backup=$(ls -t "${BACKUP_DIR}"/pre_deployment_*.sql.gz | head -1)
    
    if [ -z "$last_backup" ]; then
        log_error "No se encontró backup para rollback"
        exit 1
    fi
    
    log_info "Restaurando desde: ${last_backup}"
    
    # Stop services
    stop_services
    
    # Restore database
    gunzip < "${last_backup}" | PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}"
    
    # Revert git
    git reset --hard HEAD~1
    
    # Restart services
    start_services
    
    log_success "Rollback completado"
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --rollback)
                rollback
                exit 0
                ;;
            --help)
                cat << EOF
Spirit Tours - Production Deployment Script

Uso: $0 [options]

Opciones:
    --skip-backup     Saltar backup de base de datos
    --skip-tests      Saltar ejecución de tests
    --force           Forzar deployment sin confirmación
    --rollback        Revertir al deployment anterior
    --help            Mostrar esta ayuda

Ejemplos:
    # Deployment completo
    sudo $0

    # Deployment sin tests
    sudo $0 --skip-tests

    # Rollback al deployment anterior
    sudo $0 --rollback

EOF
                exit 0
                ;;
            *)
                log_error "Opción desconocida: $1"
                log_info "Use --help para ver las opciones disponibles"
                exit 1
                ;;
        esac
    done
}

###############################################################################
# Main Deployment Flow
###############################################################################

main() {
    # Parse command line arguments
    parse_arguments "$@"
    
    # Print banner
    clear
    cat << "EOF"
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║           🚀  SPIRIT TOURS - PRODUCTION DEPLOYMENT  🚀              ║
║                                                                      ║
║                        Version 1.0.0                                 ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
EOF
    
    log_info "Iniciando deployment en producción..."
    log_info "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname ${LOG_FILE})"
    
    # Confirmation
    if [ "$FORCE" = false ]; then
        echo ""
        echo "⚠️  ADVERTENCIA: Esto ejecutará un deployment en PRODUCCIÓN"
        echo ""
        read -p "¿Está seguro de continuar? (yes/no): " -r
        echo
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_info "Deployment cancelado por el usuario"
            exit 0
        fi
    fi
    
    # Deployment steps
    check_root
    check_prerequisites
    check_environment
    backup_database
    stop_services
    pull_latest_code
    install_backend_dependencies
    install_frontend_dependencies
    build_frontend
    run_database_migrations
    run_tests
    setup_systemd_services
    start_services
    health_check
    deployment_summary
    
    echo ""
    log_success "🎉 Deployment completado exitosamente! 🎉"
    echo ""
}

# Trap errors
trap 'log_error "Error en línea $LINENO. Deployment fallido."; exit 1' ERR

# Run main function
main "$@"
