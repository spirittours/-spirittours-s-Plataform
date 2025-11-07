/**
 * Script de Prueba: Integración eJuniper
 * 
 * Prueba la conexión y operaciones básicas con eJuniper
 * 
 * USO: node scripts/test-ejuniper-integration.js [operatorId]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const TourOperator = require('../backend/models/TourOperator');
const EJuniperIntegration = require('../backend/services/integration/EJuniperIntegration');

// ===== CONFIGURACIÓN DE PRUEBA =====

const TEST_SEARCH = {
  // Buscar hoteles en Madrid
  destination: '49435', // Código de Madrid en eJuniper
  checkIn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 días
  checkOut: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000), // +37 días (7 noches)
  rooms: [
    { adults: 2, children: 0 }
  ]
};

// ===== FUNCIONES DE PRUEBA =====

async function testConnection(ejuniper, operatorName) {
  console.log('\n🧪 TEST 1: Health Check');
  console.log('─────────────────────────────────────');
  
  try {
    const health = await ejuniper.healthCheck();
    
    if (health.status === 'healthy') {
      console.log('✅ Conexión exitosa');
      console.log(`   Operador: ${operatorName}`);
      console.log(`   Timestamp: ${health.timestamp}`);
    } else {
      console.log('❌ Conexión fallida');
      console.log(`   Error: ${health.error}`);
    }
    
    return health.status === 'healthy';
    
  } catch (error) {
    console.log('❌ Error en health check');
    console.log(`   ${error.message}`);
    return false;
  }
}

async function testGetZones(ejuniper) {
  console.log('\n🧪 TEST 2: Obtener Zonas/Destinos');
  console.log('─────────────────────────────────────');
  
  try {
    const zones = await ejuniper.getZoneList();
    
    console.log(`✅ ${zones.length} zonas obtenidas`);
    
    // Mostrar primeras 5 zonas
    console.log('\n   Primeras 5 zonas:');
    zones.slice(0, 5).forEach((zone, i) => {
      console.log(`   ${i + 1}. ${zone.name} (${zone.code}) - ${zone.country}`);
    });
    
    return true;
    
  } catch (error) {
    console.log('❌ Error obteniendo zonas');
    console.log(`   ${error.message}`);
    return false;
  }
}

async function testGetHotelPortfolio(ejuniper) {
  console.log('\n🧪 TEST 3: Obtener Catálogo de Hoteles');
  console.log('─────────────────────────────────────');
  
  try {
    const result = await ejuniper.getHotelPortfolio(TEST_SEARCH.destination);
    
    console.log('✅ Catálogo obtenido');
    console.log(`   Destino: ${TEST_SEARCH.destination}`);
    
    return true;
    
  } catch (error) {
    console.log('❌ Error obteniendo catálogo');
    console.log(`   ${error.message}`);
    return false;
  }
}

async function testSearchHotels(ejuniper) {
  console.log('\n🧪 TEST 4: Buscar Disponibilidad de Hoteles');
  console.log('─────────────────────────────────────');
  
  try {
    console.log('   Parámetros de búsqueda:');
    console.log(`   - Destino: ${TEST_SEARCH.destination}`);
    console.log(`   - Check-in: ${TEST_SEARCH.checkIn.toISOString().split('T')[0]}`);
    console.log(`   - Check-out: ${TEST_SEARCH.checkOut.toISOString().split('T')[0]}`);
    console.log(`   - Habitaciones: ${TEST_SEARCH.rooms.length}`);
    console.log(`   - Adultos: ${TEST_SEARCH.rooms[0].adults}\n`);
    
    console.log('   🔄 Buscando... (esto puede tomar 10-30 segundos)');
    
    const startTime = Date.now();
    const hotels = await ejuniper.searchHotelAvailability(TEST_SEARCH);
    const duration = Date.now() - startTime;
    
    console.log(`\n✅ ${hotels.length} opciones encontradas`);
    console.log(`   Tiempo de respuesta: ${duration}ms`);
    
    if (hotels.length > 0) {
      console.log('\n   Primeros 3 resultados:');
      hotels.slice(0, 3).forEach((hotel, i) => {
        console.log(`\n   ${i + 1}. ${hotel.hotelName}`);
        console.log(`      Código: ${hotel.hotelJPCode}`);
        console.log(`      Régimen: ${hotel.boardName}`);
        console.log(`      Precio: ${hotel.price.currency} ${hotel.price.gross.toFixed(2)}`);
        console.log(`      Neto: ${hotel.price.currency} ${hotel.price.net.toFixed(2)}`);
        console.log(`      Habitaciones: ${hotel.rooms.length}`);
        console.log(`      No reembolsable: ${hotel.nonRefundable ? 'Sí' : 'No'}`);
        console.log(`      RatePlanCode: ${hotel.ratePlanCode.substring(0, 50)}...`);
      });
      
      return hotels[0]; // Retornar primer hotel para siguiente test
    }
    
    return null;
    
  } catch (error) {
    console.log('❌ Error buscando hoteles');
    console.log(`   ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
    return null;
  }
}

async function testGetBookingRules(ejuniper, hotel) {
  if (!hotel) {
    console.log('\n⚠️  TEST 5: Obtener Reglas de Reserva - SALTADO');
    console.log('   (No hay hotel disponible del test anterior)');
    return null;
  }
  
  console.log('\n🧪 TEST 5: Obtener Reglas de Reserva (BookingCode)');
  console.log('─────────────────────────────────────');
  
  try {
    console.log(`   Hotel: ${hotel.hotelName}`);
    console.log(`   RatePlanCode: ${hotel.ratePlanCode.substring(0, 50)}...\n`);
    
    console.log('   🔄 Obteniendo reglas...');
    
    const rules = await ejuniper.getHotelBookingRules(hotel.ratePlanCode);
    
    console.log('\n✅ Reglas de reserva obtenidas');
    console.log(`   BookingCode: ${rules.bookingCode.substring(0, 50)}...`);
    console.log(`   Expira: ${rules.expirationDate}`);
    console.log(`   Políticas de cancelación: ${rules.cancellationPolicies ? 'Sí' : 'No'}`);
    console.log(`   Campos requeridos: ${rules.requiredFields ? 'Sí' : 'No'}`);
    
    return rules;
    
  } catch (error) {
    console.log('❌ Error obteniendo reglas');
    console.log(`   ${error.message}`);
    return null;
  }
}

async function testStatistics(ejuniper) {
  console.log('\n📊 ESTADÍSTICAS DE LA SESIÓN');
  console.log('─────────────────────────────────────');
  
  const stats = ejuniper.getStats();
  
  console.log(`   Total requests: ${stats.totalRequests}`);
  console.log(`   Successful: ${stats.successfulRequests}`);
  console.log(`   Failed: ${stats.failedRequests}`);
  console.log(`   Success rate: ${(stats.successfulRequests / stats.totalRequests * 100).toFixed(2)}%`);
  console.log(`   Avg response time: ${stats.averageResponseTime.toFixed(0)}ms`);
  console.log(`   Last request: ${stats.lastRequestTime}ms`);
  
  console.log(`\n   Cache:`);
  console.log(`   - Zones: ${stats.cacheSize.zones}`);
  console.log(`   - Hotels: ${stats.cacheSize.hotels}`);
  console.log(`   - Last update: ${stats.cacheSize.lastUpdate || 'Never'}`);
}

// ===== FUNCIÓN PRINCIPAL =====

async function runTests() {
  let operatorId = process.argv[2];
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('        TEST DE INTEGRACIÓN eJUNIPER                   ');
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    // Conectar a MongoDB
    console.log('📡 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spirit-tours');
    console.log('✅ Conectado\n');
    
    // Buscar operador
    let operator;
    
    if (operatorId) {
      console.log(`🔍 Buscando operador con ID: ${operatorId}...`);
      operator = await TourOperator.findById(operatorId);
    } else {
      console.log('🔍 Buscando operador Euroriente (EUR001)...');
      operator = await TourOperator.findOne({ code: 'EUR001' });
    }
    
    if (!operator) {
      console.log('❌ Operador no encontrado');
      console.log('\nEjecuta primero: node scripts/setup-euroriente-operator.js\n');
      process.exit(1);
    }
    
    console.log('✅ Operador encontrado');
    console.log(`   Nombre: ${operator.name}`);
    console.log(`   Código: ${operator.code}`);
    console.log(`   Sistema: ${operator.apiSystem.type}`);
    console.log(`   Ambiente: ${operator.apiSystem.config.environment}`);
    
    // Verificar que sea eJuniper
    if (operator.apiSystem.type !== 'ejuniper') {
      console.log(`\n❌ Este operador no es eJuniper (${operator.apiSystem.type})`);
      console.log('   Este script solo funciona con operadores eJuniper\n');
      process.exit(1);
    }
    
    // Crear instancia de integración
    console.log('\n🔧 Inicializando cliente eJuniper...');
    const ejuniper = new EJuniperIntegration(operator);
    await ejuniper.initialize();
    console.log('✅ Cliente inicializado\n');
    
    // Ejecutar tests
    const results = {
      connection: false,
      zones: false,
      portfolio: false,
      search: false,
      bookingRules: false
    };
    
    results.connection = await testConnection(ejuniper, operator.name);
    
    if (results.connection) {
      results.zones = await testGetZones(ejuniper);
      results.portfolio = await testGetHotelPortfolio(ejuniper);
      
      const hotel = await testSearchHotels(ejuniper);
      results.search = hotel !== null;
      
      if (hotel) {
        const rules = await testGetBookingRules(ejuniper, hotel);
        results.bookingRules = rules !== null;
      }
      
      await testStatistics(ejuniper);
    }
    
    // Resumen final
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('                  RESUMEN DE TESTS                     ');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const testList = [
      { name: 'Conexión (Health Check)', result: results.connection },
      { name: 'Obtener Zonas', result: results.zones },
      { name: 'Catálogo de Hoteles', result: results.portfolio },
      { name: 'Búsqueda de Disponibilidad', result: results.search },
      { name: 'Reglas de Reserva (BookingCode)', result: results.bookingRules }
    ];
    
    testList.forEach((test, i) => {
      const icon = test.result ? '✅' : '❌';
      console.log(`   ${i + 1}. ${icon} ${test.name}`);
    });
    
    const passed = testList.filter(t => t.result).length;
    const total = testList.length;
    const percentage = (passed / total * 100).toFixed(0);
    
    console.log(`\n   Total: ${passed}/${total} tests pasados (${percentage}%)`);
    
    if (passed === total) {
      console.log('\n   🎉 ¡Todos los tests pasaron exitosamente!');
      console.log('   ✅ Integración eJuniper funcionando correctamente\n');
    } else if (passed > 0) {
      console.log('\n   ⚠️  Algunos tests fallaron');
      console.log('   Verifica las credenciales y la configuración\n');
    } else {
      console.log('\n   ❌ Todos los tests fallaron');
      console.log('   Verifica:');
      console.log('      - Credenciales correctas');
      console.log('      - IP whitelistada en Juniper');
      console.log('      - Ambiente correcto (sandbox/production)\n');
    }
    
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Desconectado de MongoDB\n');
  }
}

// ===== EJECUTAR =====

runTests().catch(error => {
  console.error('Error no manejado:', error);
  process.exit(1);
});
