/**
 * Script de Configuración: Euroriente (eJuniper)
 * 
 * Este script crea y configura el operador Euroriente en la base de datos.
 * La integración es OPCIONAL - el operador puede estar activo o inactivo.
 * 
 * USO:
 * 1. Obtener credenciales de Juniper Buyer Portal
 * 2. Actualizar las credenciales en este script
 * 3. Ejecutar: node scripts/setup-euroriente-operator.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const TourOperator = require('../backend/models/TourOperator');

// ===== CONFIGURACIÓN =====
// Actualiza estos valores con tus credenciales reales

const EURORIENTE_CONFIG = {
  // Información básica
  name: 'Euroriente',
  businessName: 'Euroriente Travel S.L.',
  code: 'EUR001',
  type: 'receptive', // receptive | wholesaler | dmc | bedbank
  relationship: 'supplier', // supplier (compramos de ellos) | buyer (nos compran) | both
  
  // Contacto
  contact: {
    primaryEmail: 'reservas@euroriente.com',
    secondaryEmail: 'info@euroriente.com',
    phone: '+34 XXX XXX XXX',
    website: 'https://euroriente.com',
    address: {
      street: 'Calle Principal 123',
      city: 'Madrid',
      country: 'España',
      zipCode: '28001'
    }
  },
  
  // Sistema API - eJuniper
  apiSystem: {
    type: 'ejuniper',
    version: '1.0',
    
    // ⚠️ IMPORTANTE: Actualizar con credenciales reales de Juniper
    credentials: {
      username: 'TU_USERNAME_AQUI',        // ← Actualizar
      password: 'TU_PASSWORD_AQUI',        // ← Actualizar
      agencyCode: 'TU_AGENCY_CODE_AQUI'   // ← Actualizar
    },
    
    // Endpoints
    endpoints: {
      production: 'https://xml.bookingengine.es/WebService/JP/WebServiceJP.asmx',
      sandbox: 'https://xml-uat.bookingengine.es/WebService/JP/WebServiceJP.asmx',
      wsdl: 'https://xml-uat.bookingengine.es/WebService/JP/WebServiceJP.asmx?WSDL'
    },
    
    // Configuración
    config: {
      environment: 'sandbox', // 'sandbox' o 'production'
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      rateLimitPerMinute: 60,
      whitelistedIPs: [
        // Agregar tus IPs aquí
        'TU_IP_SERVIDOR_AQUI'
      ]
    },
    
    // Capacidades del sistema
    capabilities: {
      hotels: true,
      packages: true,
      flights: false,
      transfers: false,
      tours: false,
      tickets: false,
      insurance: false,
      carRental: false,
      cruises: false,
      
      // Funcionalidades avanzadas
      realTimeAvailability: true,
      instantConfirmation: true,
      cancellationManagement: true,
      modificationManagement: false,
      priceBreakdown: true,
      multiCurrency: true,
      dynamicPackaging: false
    }
  },
  
  // Términos comerciales
  businessTerms: {
    commissionModel: 'percentage', // percentage | fixed | markup | net_rates
    
    defaultCommission: {
      value: 10, // 10% de comisión por defecto
      type: 'percentage'
    },
    
    // Comisiones por tipo de servicio (opcional)
    commissionByService: [
      { service: 'hotel', value: 10, type: 'percentage' },
      { service: 'package', value: 12, type: 'percentage' }
    ],
    
    paymentTerms: 'prepaid', // prepaid | credit | net30 | net60
    creditLimit: 0,
    currency: 'EUR'
  },
  
  // Estado inicial
  status: 'pending_approval', // pending_approval | active | inactive
  
  // Notas
  notes: 'Operador receptivo para España. Especializado en hoteles y paquetes turísticos.',
  internalNotes: 'Configurado desde script de setup. Verificar credenciales antes de activar.'
};

// ===== FUNCIÓN PRINCIPAL =====

async function setupEurorienteOperator() {
  try {
    console.log('🚀 Iniciando configuración de Euroriente...\n');
    
    // Conectar a MongoDB
    console.log('📡 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/spirit-tours');
    console.log('✅ Conectado a MongoDB\n');
    
    // Verificar si ya existe
    const existing = await TourOperator.findOne({ code: EURORIENTE_CONFIG.code });
    
    if (existing) {
      console.log('⚠️  El operador Euroriente ya existe en la base de datos');
      console.log(`   ID: ${existing._id}`);
      console.log(`   Estado: ${existing.status}`);
      console.log(`   Activo: ${existing.integrationStatus.isActive ? 'Sí' : 'No'}\n`);
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question('¿Deseas actualizar la configuración? (s/n): ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 's') {
        console.log('❌ Operación cancelada');
        process.exit(0);
      }
      
      // Actualizar
      Object.assign(existing, EURORIENTE_CONFIG);
      await existing.save();
      
      console.log('\n✅ Operador Euroriente actualizado exitosamente\n');
      await showOperatorInfo(existing);
      
    } else {
      // Crear nuevo
      console.log('📝 Creando operador Euroriente...');
      
      const operator = new TourOperator(EURORIENTE_CONFIG);
      await operator.save();
      
      console.log('✅ Operador Euroriente creado exitosamente\n');
      await showOperatorInfo(operator);
    }
    
    console.log('\n🎉 Configuración completada\n');
    console.log('📋 Próximos pasos:');
    console.log('   1. Actualizar credenciales en el panel de administración');
    console.log('   2. Probar conexión: POST /api/admin/tour-operators/{id}/test');
    console.log('   3. Activar operador: POST /api/admin/tour-operators/{id}/activate');
    console.log('   4. Realizar primera búsqueda de hoteles\n');
    
  } catch (error) {
    console.error('❌ Error durante la configuración:', error);
    console.error('\nDetalles:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Desconectado de MongoDB');
  }
}

// ===== FUNCIONES AUXILIARES =====

async function showOperatorInfo(operator) {
  console.log('═══════════════════════════════════════════════');
  console.log('           INFORMACIÓN DEL OPERADOR            ');
  console.log('═══════════════════════════════════════════════\n');
  
  console.log(`🏢 Nombre:         ${operator.name}`);
  console.log(`📄 Código:         ${operator.code}`);
  console.log(`🔖 ID:             ${operator._id}`);
  console.log(`📊 Estado:         ${operator.status}`);
  console.log(`🔌 Sistema:        ${operator.apiSystem.type}`);
  console.log(`🌍 Ambiente:       ${operator.apiSystem.config.environment}`);
  console.log(`✅ Configurado:    ${operator.integrationStatus.isConfigured ? 'Sí' : 'No'}`);
  console.log(`🟢 Activo:         ${operator.integrationStatus.isActive ? 'Sí' : 'No'}`);
  console.log(`💰 Comisión:       ${operator.businessTerms.defaultCommission.value}%`);
  console.log(`💵 Moneda:         ${operator.businessTerms.currency}`);
  
  console.log('\n📋 Capacidades:');
  const capabilities = operator.apiSystem.capabilities;
  Object.entries(capabilities).forEach(([key, value]) => {
    if (value === true) {
      console.log(`   ✓ ${key}`);
    }
  });
  
  console.log('\n═══════════════════════════════════════════════\n');
}

// ===== VERIFICACIÓN DE CREDENCIALES =====

function checkCredentials() {
  const hasDefaultCredentials = 
    EURORIENTE_CONFIG.apiSystem.credentials.username === 'TU_USERNAME_AQUI' ||
    EURORIENTE_CONFIG.apiSystem.credentials.password === 'TU_PASSWORD_AQUI' ||
    EURORIENTE_CONFIG.apiSystem.credentials.agencyCode === 'TU_AGENCY_CODE_AQUI';
  
  if (hasDefaultCredentials) {
    console.log('\n⚠️  ADVERTENCIA: Credenciales por defecto detectadas\n');
    console.log('Por favor, actualiza las credenciales en este archivo antes de continuar:');
    console.log('   - username');
    console.log('   - password');
    console.log('   - agencyCode\n');
    console.log('Para obtener credenciales:');
    console.log('   1. Registrarse en: https://buyers-portal.junipertraveltech.com/');
    console.log('   2. Contactar a Juniper Support');
    console.log('   3. Solicitar credenciales de sandbox\n');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise(resolve => {
      rl.question('¿Continuar de todas formas? (s/n): ', (answer) => {
        rl.close();
        if (answer.toLowerCase() !== 's') {
          console.log('❌ Operación cancelada');
          process.exit(0);
        }
        resolve();
      });
    });
  }
}

// ===== EJECUTAR =====

(async () => {
  await checkCredentials();
  await setupEurorienteOperator();
})();
