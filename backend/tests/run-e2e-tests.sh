#!/bin/bash

################################################################################
# ERP Hub - E2E Test Runner Script
#
# Script automatizado para ejecutar todos los tests E2E del ERP Hub.
# Incluye validación de configuración, ejecución de tests y reporte de resultados.
#
# Uso:
#   ./run-e2e-tests.sh                    # Ejecuta todos los tests
#   ./run-e2e-tests.sh --usa-only         # Solo tests USA
#   ./run-e2e-tests.sh --mexico-only      # Solo tests México
#   ./run-e2e-tests.sh --provider=xero    # Solo un provider específico
#
# @author Spirit Tours Dev Team - GenSpark AI Developer
# @version 1.0.0
################################################################################

set -e  # Exit on error

# Colors para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directorio base
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ============================================================================
# FUNCIONES DE UTILIDAD
# ============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}============================================================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}============================================================================${NC}"
    echo ""
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

# ============================================================================
# VALIDACIÓN DE CONFIGURACIÓN
# ============================================================================

validate_environment() {
    print_header "Validando Configuración de Environment"
    
    local errors=0
    local warnings=0
    
    # Verificar .env file
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        print_error "Archivo .env no encontrado en $PROJECT_ROOT"
        print_info "Crea un archivo .env basado en .env.example"
        ((errors++))
    else
        print_success "Archivo .env encontrado"
    fi
    
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js no está instalado"
        ((errors++))
    else
        NODE_VERSION=$(node -v)
        print_success "Node.js instalado: $NODE_VERSION"
    fi
    
    # Verificar npm
    if ! command -v npm &> /dev/null; then
        print_error "npm no está instalado"
        ((errors++))
    else
        NPM_VERSION=$(npm -v)
        print_success "npm instalado: $NPM_VERSION"
    fi
    
    # Verificar dependencias de Jest
    if [ ! -d "$PROJECT_ROOT/node_modules/jest" ]; then
        print_warning "Jest no está instalado. Ejecutando npm install..."
        cd "$PROJECT_ROOT" && npm install
        ((warnings++))
    else
        print_success "Jest instalado"
    fi
    
    # Validar variables de entorno críticas
    echo ""
    print_info "Validando variables de entorno para ERPs..."
    
    # USA ERPs
    if [ -n "$QB_USA_SANDBOX_CLIENT_ID" ]; then
        print_success "QuickBooks USA configurado"
    else
        print_warning "QuickBooks USA no configurado (tests se saltarán)"
        ((warnings++))
    fi
    
    if [ -n "$XERO_USA_CLIENT_ID" ]; then
        print_success "Xero USA configurado"
    else
        print_warning "Xero USA no configurado (tests se saltarán)"
        ((warnings++))
    fi
    
    if [ -n "$FRESHBOOKS_USA_CLIENT_ID" ]; then
        print_success "FreshBooks configurado"
    else
        print_warning "FreshBooks no configurado (tests se saltarán)"
        ((warnings++))
    fi
    
    # México ERPs
    if [ -n "$QB_MX_SANDBOX_CLIENT_ID" ]; then
        print_success "QuickBooks México configurado"
    else
        print_warning "QuickBooks México no configurado (tests se saltarán)"
        ((warnings++))
    fi
    
    if [ -n "$CONTPAQI_API_KEY" ]; then
        print_success "CONTPAQi configurado"
    else
        print_warning "CONTPAQi no configurado (tests se saltarán)"
        ((warnings++))
    fi
    
    if [ -n "$ALEGRA_USERNAME" ]; then
        print_success "Alegra configurado"
    else
        print_warning "Alegra no configurado (tests se saltarán)"
        ((warnings++))
    fi
    
    echo ""
    
    if [ $errors -gt 0 ]; then
        print_error "Errores encontrados: $errors. Por favor corrígelos antes de continuar."
        exit 1
    fi
    
    if [ $warnings -gt 0 ]; then
        print_warning "Advertencias encontradas: $warnings"
        print_info "Los tests continuarán, pero algunos se saltarán."
        echo ""
    fi
    
    print_success "Validación completada exitosamente"
}

# ============================================================================
# EJECUCIÓN DE TESTS
# ============================================================================

run_all_tests() {
    print_header "Ejecutando Todos los Tests E2E"
    
    cd "$PROJECT_ROOT"
    
    # Ejecutar tests con Jest
    npm test -- backend/tests/erp-hub/e2e-all-erps.test.js \
        --verbose \
        --detectOpenHandles \
        --forceExit \
        --testTimeout=120000
}

run_usa_tests() {
    print_header "Ejecutando Tests E2E - USA Only"
    
    cd "$PROJECT_ROOT"
    
    # QuickBooks USA
    if [ -n "$QB_USA_SANDBOX_CLIENT_ID" ]; then
        print_info "Ejecutando tests QuickBooks USA..."
        npm test -- backend/tests/erp-hub/quickbooks-usa.test.js --verbose
    fi
    
    # Xero USA
    if [ -n "$XERO_USA_CLIENT_ID" ]; then
        print_info "Ejecutando tests Xero USA..."
        npm test -- backend/tests/erp-hub/usa/xero-usa.test.js --verbose
    fi
    
    # FreshBooks
    if [ -n "$FRESHBOOKS_USA_CLIENT_ID" ]; then
        print_info "Ejecutando tests FreshBooks..."
        npm test -- backend/tests/erp-hub/usa/freshbooks.test.js --verbose
    fi
}

run_mexico_tests() {
    print_header "Ejecutando Tests E2E - México Only"
    
    cd "$PROJECT_ROOT"
    
    # QuickBooks México
    if [ -n "$QB_MX_SANDBOX_CLIENT_ID" ]; then
        print_info "Ejecutando tests QuickBooks México..."
        npm test -- backend/tests/erp-hub/mexico/quickbooks-mexico.test.js --verbose
    fi
    
    # CONTPAQi
    if [ -n "$CONTPAQI_API_KEY" ]; then
        print_info "Ejecutando tests CONTPAQi..."
        npm test -- backend/tests/erp-hub/mexico/contpaqi-mexico.test.js --verbose
    fi
    
    # Alegra
    if [ -n "$ALEGRA_USERNAME" ]; then
        print_info "Ejecutando tests Alegra..."
        npm test -- backend/tests/erp-hub/mexico/alegra-mexico.test.js --verbose
    fi
    
    # CFDI Service
    print_info "Ejecutando tests CFDI 4.0..."
    npm test -- backend/tests/erp-hub/cfdi/cfdi-generator.test.js --verbose
}

run_single_provider() {
    local provider=$1
    print_header "Ejecutando Tests E2E - $provider"
    
    cd "$PROJECT_ROOT"
    
    case $provider in
        quickbooks-usa)
            npm test -- backend/tests/erp-hub/quickbooks-usa.test.js --verbose
            ;;
        xero)
            npm test -- backend/tests/erp-hub/usa/xero-usa.test.js --verbose
            ;;
        freshbooks)
            npm test -- backend/tests/erp-hub/usa/freshbooks.test.js --verbose
            ;;
        quickbooks-mexico)
            npm test -- backend/tests/erp-hub/mexico/quickbooks-mexico.test.js --verbose
            ;;
        contpaqi)
            npm test -- backend/tests/erp-hub/mexico/contpaqi-mexico.test.js --verbose
            ;;
        alegra)
            npm test -- backend/tests/erp-hub/mexico/alegra-mexico.test.js --verbose
            ;;
        cfdi)
            npm test -- backend/tests/erp-hub/cfdi/cfdi-generator.test.js --verbose
            ;;
        *)
            print_error "Provider desconocido: $provider"
            print_info "Providers disponibles: quickbooks-usa, xero, freshbooks, quickbooks-mexico, contpaqi, alegra, cfdi"
            exit 1
            ;;
    esac
}

# ============================================================================
# REPORTE DE RESULTADOS
# ============================================================================

generate_report() {
    print_header "Generando Reporte de Tests"
    
    local report_file="$PROJECT_ROOT/test-results/e2e-report-$(date +%Y%m%d-%H%M%S).txt"
    
    mkdir -p "$PROJECT_ROOT/test-results"
    
    echo "ERP Hub - E2E Test Report" > "$report_file"
    echo "Generated: $(date)" >> "$report_file"
    echo "" >> "$report_file"
    echo "Test Results Summary:" >> "$report_file"
    echo "--------------------" >> "$report_file"
    
    # Aquí se agregarían los resultados de los tests
    # Por ahora solo mostramos un mensaje
    
    print_success "Reporte generado en: $report_file"
}

# ============================================================================
# PARSE ARGUMENTOS Y EJECUTAR
# ============================================================================

main() {
    print_header "ERP Hub - E2E Test Runner"
    
    # Validar entorno primero
    validate_environment
    
    # Parse argumentos
    if [ $# -eq 0 ]; then
        # Sin argumentos: ejecutar todos los tests
        run_all_tests
    else
        case $1 in
            --usa-only)
                run_usa_tests
                ;;
            --mexico-only)
                run_mexico_tests
                ;;
            --provider=*)
                provider="${1#*=}"
                run_single_provider "$provider"
                ;;
            --help|-h)
                echo "Uso: $0 [OPCIÓN]"
                echo ""
                echo "Opciones:"
                echo "  (sin opciones)          Ejecuta todos los tests E2E"
                echo "  --usa-only              Ejecuta solo tests de USA"
                echo "  --mexico-only           Ejecuta solo tests de México"
                echo "  --provider=<nombre>     Ejecuta tests de un provider específico"
                echo "  --help, -h              Muestra esta ayuda"
                echo ""
                echo "Providers disponibles:"
                echo "  quickbooks-usa, xero, freshbooks,"
                echo "  quickbooks-mexico, contpaqi, alegra, cfdi"
                exit 0
                ;;
            *)
                print_error "Opción desconocida: $1"
                echo "Use --help para ver opciones disponibles"
                exit 1
                ;;
        esac
    fi
    
    # Generar reporte
    # generate_report
    
    print_header "Tests Completados"
    print_success "Todos los tests han finalizado"
}

# Ejecutar main
main "$@"
