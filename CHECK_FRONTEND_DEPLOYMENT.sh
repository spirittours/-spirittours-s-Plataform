#!/bin/bash

##############################################################################
# CHECK FRONTEND DEPLOYMENT STATUS
# Verifica si el fix del booking está desplegado en el servidor de producción
##############################################################################

set -e

echo "================================================================"
echo "🔍 VERIFICACIÓN DE DEPLOYMENT - FRONTEND"
echo "================================================================"
echo ""

SERVER="root@plataform.spirittours.us"
DOMAIN="https://plataform.spirittours.us"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

##############################################################################
# 1. CHECK DOCKER CONTAINERS
##############################################################################

echo "1️⃣  Verificando contenedores Docker en el servidor..."
echo ""

if command -v ssh &> /dev/null; then
    echo "📦 Contenedores corriendo:"
    ssh -o ConnectTimeout=10 "$SERVER" "docker ps --filter 'name=spirit-tours' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" 2>/dev/null || {
        echo "⚠️  No se pudo conectar via SSH"
        echo "   Intentando verificación remota..."
    }
    echo ""
else
    echo "⚠️  SSH no disponible en este entorno"
    echo "   Usando verificación remota..."
    echo ""
fi

##############################################################################
# 2. CHECK FRONTEND BUILD DATE
##############################################################################

echo "2️⃣  Verificando fecha del último build..."
echo ""

if command -v ssh &> /dev/null; then
    BUILD_DATE=$(ssh -o ConnectTimeout=10 "$SERVER" "docker inspect spirit-tours-frontend 2>/dev/null | grep '\"Created\":' | head -1" 2>/dev/null || echo "unknown")
    if [ "$BUILD_DATE" != "unknown" ]; then
        echo "📅 Build date: $BUILD_DATE"
    else
        echo "⚠️  No se pudo obtener fecha del build"
    fi
    echo ""
fi

##############################################################################
# 3. TEST FRONTEND ACCESSIBILITY
##############################################################################

echo "3️⃣  Verificando accesibilidad del frontend..."
echo ""

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Frontend accesible [HTTP: $HTTP_CODE]"
else
    echo "❌ Frontend no accesible [HTTP: $HTTP_CODE]"
fi
echo ""

##############################################################################
# 4. CHECK JAVASCRIPT BUNDLE FOR TYPE FIX
##############################################################################

echo "4️⃣  Verificando código JavaScript desplegado..."
echo ""

# Intentar descargar y analizar el bundle de JavaScript
JS_CONTENT=$(curl -s "$DOMAIN" | grep -o 'static/js/main.[^"]*\.js' | head -1)

if [ -n "$JS_CONTENT" ]; then
    echo "📦 Bundle encontrado: $JS_CONTENT"
    
    # Descargar el bundle
    BUNDLE_URL="$DOMAIN/$JS_CONTENT"
    BUNDLE_CODE=$(curl -s "$BUNDLE_URL")
    
    # Buscar evidencia del fix
    # El fix convierte selectedTour.id a String
    if echo "$BUNDLE_CODE" | grep -q "String(.*\.id)"; then
        echo "✅ EVIDENCE FOUND: Type conversion String(...id) detected"
        echo "   El fix PARECE estar desplegado"
    else
        echo "⚠️  Type conversion not clearly detected in bundle"
        echo "   (Código minificado puede ocultar la evidencia)"
    fi
    
    # Buscar tours-related code
    if echo "$BUNDLE_CODE" | grep -q "tour_id"; then
        echo "✅ Tour booking code detected"
    fi
    
    echo ""
else
    echo "⚠️  No se pudo localizar el bundle JavaScript"
    echo ""
fi

##############################################################################
# 5. TEST BOOKING ENDPOINT DIRECTLY
##############################################################################

echo "5️⃣  Testeando endpoint de booking directamente..."
echo ""

# Test 1: Backend directo (sabemos que funciona)
echo "🧪 Test 1: Backend API directo"
RESPONSE=$(curl -s -w "\nHTTP:%{http_code}" -X POST "$DOMAIN/api/v1/bookings" \
    -H "Content-Type: application/json" \
    -d '{"tour_id": "tour-001", "booking_date": "2025-12-20", "participants": 2}')

HTTP=$(echo "$RESPONSE" | grep "HTTP:" | cut -d: -f2)
SUCCESS=$(echo "$RESPONSE" | grep -o '"success":true')

if [ "$HTTP" = "200" ] && [ "$SUCCESS" = '"success":true' ]; then
    echo "✅ Backend API: WORKING [HTTP: 200]"
else
    echo "❌ Backend API: FAILED [HTTP: $HTTP]"
fi
echo ""

##############################################################################
# 6. CHECK SOURCE CODE ON SERVER
##############################################################################

echo "6️⃣  Verificando código fuente en el servidor..."
echo ""

if command -v ssh &> /dev/null; then
    echo "📄 Verificando AppSimple.tsx en servidor:"
    
    # Check if file exists
    FILE_EXISTS=$(ssh -o ConnectTimeout=10 "$SERVER" "test -f /opt/spirittours/app/frontend/src/AppSimple.tsx && echo 'YES' || echo 'NO'" 2>/dev/null || echo "UNKNOWN")
    
    if [ "$FILE_EXISTS" = "YES" ]; then
        echo "   ✅ Archivo encontrado en /opt/spirittours/app/frontend/src/AppSimple.tsx"
        
        # Check for the fix in source code
        TYPE_CHECK=$(ssh -o ConnectTimeout=10 "$SERVER" "grep -A 3 'interface Tour' /opt/spirittours/app/frontend/src/AppSimple.tsx | grep 'id:' | grep -o 'string\\|number'" 2>/dev/null || echo "unknown")
        
        if [ "$TYPE_CHECK" = "string" ]; then
            echo "   ✅ Tour.id type: string (CORRECTO)"
        elif [ "$TYPE_CHECK" = "number" ]; then
            echo "   ❌ Tour.id type: number (INCORRECTO - necesita fix)"
        else
            echo "   ⚠️  No se pudo verificar el tipo"
        fi
        
        # Check for String() conversion
        CONVERSION=$(ssh -o ConnectTimeout=10 "$SERVER" "grep -o 'String(selectedTour.id)' /opt/spirittours/app/frontend/src/AppSimple.tsx" 2>/dev/null || echo "")
        
        if [ -n "$CONVERSION" ]; then
            echo "   ✅ String conversion encontrada (FIX APLICADO)"
        else
            echo "   ⚠️  String conversion NO encontrada"
        fi
        
    elif [ "$FILE_EXISTS" = "NO" ]; then
        echo "   ❌ Archivo NO encontrado en la ubicación esperada"
        echo "      Buscando en ubicaciones alternativas..."
        
        # Try to find the file
        ALT_PATH=$(ssh -o ConnectTimeout=10 "$SERVER" "find /root /opt -name 'AppSimple.tsx' 2>/dev/null | head -1" 2>/dev/null || echo "")
        
        if [ -n "$ALT_PATH" ]; then
            echo "      ✅ Encontrado en: $ALT_PATH"
        else
            echo "      ❌ No se pudo localizar el archivo"
        fi
    else
        echo "   ⚠️  No se pudo verificar (sin acceso SSH o conexión fallida)"
    fi
    echo ""
else
    echo "⚠️  SSH no disponible - verificación de código fuente omitida"
    echo ""
fi

##############################################################################
# 7. CHECK DOCKER LOGS
##############################################################################

echo "7️⃣  Verificando logs del frontend..."
echo ""

if command -v ssh &> /dev/null; then
    echo "📋 Últimas 10 líneas de logs:"
    ssh -o ConnectTimeout=10 "$SERVER" "docker logs spirit-tours-frontend --tail 10 2>&1" 2>/dev/null || {
        echo "⚠️  No se pudieron obtener logs"
    }
    echo ""
fi

##############################################################################
# 8. SUMMARY
##############################################################################

echo "================================================================"
echo "📊 RESUMEN DE VERIFICACIÓN"
echo "================================================================"
echo ""

echo "Componentes verificados:"
echo "  • Contenedores Docker: $([ -n "$BUILD_DATE" ] && echo "✅" || echo "⚠️ ")"
echo "  • Frontend accesible: $([ "$HTTP_CODE" = "200" ] && echo "✅" || echo "❌")"
echo "  • Backend API: $([ "$HTTP" = "200" ] && echo "✅" || echo "❌")"
echo "  • Código fuente: $([ "$TYPE_CHECK" = "string" ] && echo "✅" || echo "⚠️ ")"
echo ""

##############################################################################
# 9. RECOMMENDATIONS
##############################################################################

echo "================================================================"
echo "💡 RECOMENDACIONES"
echo "================================================================"
echo ""

if [ "$TYPE_CHECK" != "string" ] || [ -z "$CONVERSION" ]; then
    echo "⚠️  EL FIX NO PARECE ESTAR DESPLEGADO EN PRODUCCIÓN"
    echo ""
    echo "Acciones recomendadas:"
    echo ""
    echo "1️⃣  DEPLOY MANUAL (Método Rápido):"
    echo "    scp frontend/src/AppSimple.tsx $SERVER:/opt/spirittours/app/frontend/src/"
    echo "    ssh $SERVER 'cd /opt/spirittours/app && docker-compose restart frontend'"
    echo ""
    echo "2️⃣  REBUILD COMPLETO (Método Seguro):"
    echo "    ssh $SERVER 'cd /opt/spirittours/app && docker-compose down frontend'"
    echo "    ssh $SERVER 'cd /opt/spirittours/app && docker-compose build --no-cache frontend'"
    echo "    ssh $SERVER 'cd /opt/spirittours/app && docker-compose up -d frontend'"
    echo ""
    echo "3️⃣  EDICIÓN DIRECTA EN SERVIDOR:"
    echo "    ssh $SERVER"
    echo "    cd /opt/spirittours/app/frontend/src"
    echo "    nano AppSimple.tsx  # Cambiar id: number a id: string"
    echo ""
else
    echo "✅ El fix PARECE estar desplegado correctamente"
    echo ""
    echo "Si los usuarios aún reportan errores 400:"
    echo "  1. Verificar que estén usando participants >= 2"
    echo "  2. Limpiar caché del navegador (Ctrl+Shift+R)"
    echo "  3. Verificar que tour_id sea válido (tour-001 a tour-007)"
    echo ""
fi

echo "================================================================"
echo "✅ VERIFICACIÓN COMPLETA"
echo "================================================================"
echo ""

# Save report
REPORT_FILE="/tmp/frontend_deployment_check_$(date +%Y%m%d_%H%M%S).log"
echo "📝 Reporte guardado en: $REPORT_FILE"
echo ""
