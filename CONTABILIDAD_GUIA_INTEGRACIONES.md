# 🔌 Spirit Tours - Guía de Integraciones Externas

## 📑 Tabla de Contenidos

1. [Introducción](#introducci%C3%B3n)
2. [Arquitectura de Integración](#arquitectura-de-integraci%C3%B3n)
3. [Integración Bancaria](#integraci%C3%B3n-bancaria)
4. [Integración SAT (Facturación Electrónica México)](#integraci%C3%B3n-sat)
5. [Integración CONTPAQi](#integraci%C3%B3n-contpaqi)
6. [Integración QuickBooks](#integraci%C3%B3n-quickbooks)
7. [Pasarelas de Pago](#pasarelas-de-pago)
8. [Webhooks y Notificaciones](#webhooks-y-notificaciones)
9. [Seguridad y Mejores Prácticas](#seguridad-y-mejores-pr%C3%A1cticas)

---

## 📖 Introducción

Este documento describe cómo integrar el sistema de contabilidad de Spirit Tours con servicios externos como:

- **Bancos:** Descarga automática de estados de cuenta
- **SAT:** Generación y timbrado de CFDIs (facturas electrónicas)
- **Software contable:** Exportación a CONTPAQi, QuickBooks
- **Pasarelas de pago:** Stripe, PayPal, MercadoPago

### Beneficios de las Integraciones

✅ **Automatización:** Reduce entrada manual de datos en 90%  
✅ **Precisión:** Elimina errores de transcripción  
✅ **Tiempo real:** Información actualizada al instante  
✅ **Cumplimiento:** Facturación electrónica automática conforme a SAT  
✅ **Conciliación automática:** Matching de transacciones bancarias  

---

## 🏗️ Arquitectura de Integración

### Patrones de Integración Soportados

```
┌─────────────────────────────────────────────────────────┐
│              Spirit Tours - Core System                 │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Accounting   │  │ Reconciliation│  │   Alerts     │ │
│  │   Service    │  │   Service     │  │   Service    │ │
│  └───────┬──────┘  └───────┬───────┘  └───────┬──────┘ │
│          │                 │                   │         │
└──────────┼─────────────────┼───────────────────┼─────────┘
           │                 │                   │
           ▼                 ▼                   ▼
    ┌──────────────────────────────────────────────┐
    │        Integration Layer (Middleware)        │
    │                                              │
    │  ┌─────────┐  ┌─────────┐  ┌──────────┐   │
    │  │ Adapter │  │ Adapter │  │  Adapter  │   │
    │  │  Bank   │  │   SAT   │  │ Payments  │   │
    │  └─────────┘  └─────────┘  └──────────┘   │
    └───────┬──────────────┬───────────┬──────────┘
            │              │           │
            ▼              ▼           ▼
    ┌──────────┐  ┌───────────┐  ┌──────────┐
    │  BBVA    │  │    SAT    │  │  Stripe  │
    │ Banamex  │  │   PAC     │  │  PayPal  │
    │Santander │  │  Portal   │  │MercadoPago│
    └──────────┘  └───────────┘  └──────────┘
```

### Métodos de Integración

1. **API REST:** Comunicación directa vía HTTPS
2. **Webhooks:** Notificaciones push en tiempo real
3. **SFTP/FTP:** Transferencia de archivos batch
4. **Web Services (SOAP):** Servicios XML (legacy systems)

---

## 🏦 Integración Bancaria

### 1. Integración con BBVA API

#### Configuración Inicial

```javascript
// backend/config/bank-integrations.js
const BBVA_CONFIG = {
  api_url: 'https://api.bbva.com/v1',
  client_id: process.env.BBVA_CLIENT_ID,
  client_secret: process.env.BBVA_CLIENT_SECRET,
  account_number: process.env.BBVA_ACCOUNT_NUMBER,
  oauth_token_url: 'https://connect.bbva.com/token'
};
```

#### Autenticación OAuth 2.0

```javascript
async function getBBVAAccessToken() {
  const response = await axios.post(BBVA_CONFIG.oauth_token_url, {
    grant_type: 'client_credentials',
    client_id: BBVA_CONFIG.client_id,
    client_secret: BBVA_CONFIG.client_secret
  });
  
  return response.data.access_token;
}
```

#### Descarga de Movimientos Bancarios

```javascript
async function downloadBankTransactions(fecha_inicio, fecha_fin) {
  const token = await getBBVAAccessToken();
  
  const response = await axios.get(
    `${BBVA_CONFIG.api_url}/accounts/${BBVA_CONFIG.account_number}/transactions`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
      params: {
        from: fecha_inicio.toISOString(),
        to: fecha_fin.toISOString()
      }
    }
  );
  
  return response.data.transactions.map(tx => ({
    fecha: new Date(tx.valueDate),
    monto: parseFloat(tx.amount.amount),
    tipo: tx.amount.amount > 0 ? 'ingreso' : 'egreso',
    referencia: tx.reference,
    descripcion: tx.description,
    balance_after: parseFloat(tx.balanceAfterTransaction.amount)
  }));
}
```

#### Conciliación Automática

```javascript
// Integración con ReconciliationService
async function performAutomaticReconciliation(sucursal_id, fecha) {
  // 1. Descargar transacciones bancarias
  const bankTransactions = await downloadBankTransactions(fecha, fecha);
  
  // 2. Clasificar por tipo
  const bankData = {
    ingresos: bankTransactions.filter(tx => tx.tipo === 'ingreso'),
    egresos: bankTransactions.filter(tx => tx.tipo === 'egreso')
  };
  
  // 3. Ejecutar conciliación
  const reconciliationService = new ReconciliationService(pool);
  const result = await reconciliationService.performBankReconciliation(
    sucursal_id,
    fecha,
    bankData,
    'SYSTEM_AUTO'
  );
  
  return result;
}

// Scheduled job - Diariamente a las 7 AM
cron.schedule('0 7 * * *', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const sucursales = await getAllActiveBranches();
  
  for (const sucursal of sucursales) {
    try {
      await performAutomaticReconciliation(sucursal.id, yesterday);
      logger.info(`Auto reconciliation completed for ${sucursal.nombre}`);
    } catch (error) {
      logger.error(`Auto reconciliation failed for ${sucursal.nombre}:`, error);
    }
  }
});
```

### 2. Integración con Banamex

```javascript
// Similar a BBVA pero con endpoints específicos
const BANAMEX_CONFIG = {
  api_url: 'https://api.banamex.com/v2',
  client_id: process.env.BANAMEX_CLIENT_ID,
  client_secret: process.env.BANAMEX_CLIENT_SECRET,
  // Banamex usa certificados adicionales
  cert_path: process.env.BANAMEX_CERT_PATH,
  key_path: process.env.BANAMEX_KEY_PATH
};
```

### 3. Integración con Santander

```javascript
// Santander usa SFTP para archivos batch
const SANTANDER_CONFIG = {
  sftp_host: 'sftp.santander.com.mx',
  sftp_port: 22,
  sftp_username: process.env.SANTANDER_SFTP_USER,
  sftp_password: process.env.SANTANDER_SFTP_PASS,
  download_path: '/movimientos'
};

async function downloadSantanderTransactions(fecha) {
  const sftp = new SFTPClient();
  
  await sftp.connect(SANTANDER_CONFIG);
  
  const filename = `movimientos_${fecha.toISOString().split('T')[0]}.csv`;
  const remotePath = `${SANTANDER_CONFIG.download_path}/${filename}`;
  const localPath = `/tmp/${filename}`;
  
  await sftp.fastGet(remotePath, localPath);
  await sftp.end();
  
  // Parse CSV
  const transactions = await parseCSV(localPath);
  return transactions;
}
```

---

## 🇲🇽 Integración SAT

### Generación de CFDI (Facturas Electrónicas)

#### 1. Configuración PAC (Proveedor Autorizado de Certificación)

```javascript
const SAT_CONFIG = {
  pac_name: 'FINKOK', // O 'DIVERZA', 'SW_SAPIEN', etc.
  pac_url: 'https://facturacion.finkok.com/servicios/soap/stamp',
  rfc_emisor: 'STT123456ABC',
  certificate_path: './certificates/cer.cer',
  private_key_path: './certificates/key.key',
  private_key_password: process.env.SAT_KEY_PASSWORD
};
```

#### 2. Estructura de CFDI 4.0

```javascript
async function generateCFDI(cxc_id) {
  const cxc = await getCXCById(cxc_id);
  const customer = await getCustomerById(cxc.customer_id);
  const sucursal = await getBranchById(cxc.sucursal_id);
  
  const cfdi = {
    version: '4.0',
    serie: 'A',
    folio: cxc.folio,
    fecha: new Date().toISOString(),
    formaPago: '99', // Por definir
    metodoPago: 'PUE', // Pago en una sola exhibición
    lugarExpedicion: sucursal.codigo_postal,
    
    emisor: {
      rfc: SAT_CONFIG.rfc_emisor,
      nombre: 'Spirit Tours SA de CV',
      regimenFiscal: '601' // General de Ley Personas Morales
    },
    
    receptor: {
      rfc: customer.rfc || 'XAXX010101000',
      nombre: customer.nombre,
      usoCFDI: 'G03', // Gastos en general
      domicilioFiscalReceptor: customer.codigo_postal,
      regimenFiscalReceptor: customer.regimen_fiscal || '616'
    },
    
    conceptos: [
      {
        claveProdServ: '90101501', // Servicios de turismo
        cantidad: 1,
        claveUnidad: 'E48', // Servicio
        unidad: 'Servicio',
        descripcion: `Tour ${cxc.tour_name}`,
        valorUnitario: cxc.monto_total / 1.16, // Sin IVA
        importe: cxc.monto_total / 1.16,
        objetoImp: '02', // Sí objeto de impuesto
        
        impuestos: {
          traslados: [
            {
              base: cxc.monto_total / 1.16,
              impuesto: '002', // IVA
              tipoFactor: 'Tasa',
              tasaOCuota: '0.160000',
              importe: (cxc.monto_total / 1.16) * 0.16
            }
          ]
        }
      }
    ],
    
    impuestos: {
      totalImpuestosTrasladados: (cxc.monto_total / 1.16) * 0.16,
      traslados: [
        {
          base: cxc.monto_total / 1.16,
          impuesto: '002',
          tipoFactor: 'Tasa',
          tasaOCuota: '0.160000',
          importe: (cxc.monto_total / 1.16) * 0.16
        }
      ]
    },
    
    subtotal: cxc.monto_total / 1.16,
    total: cxc.monto_total
  };
  
  return cfdi;
}
```

#### 3. Timbrado con PAC

```javascript
const soap = require('soap');

async function timbrarCFDI(cfdi) {
  const xml = generateXMLFromCFDI(cfdi);
  
  // Firmar XML con certificado
  const signedXML = await signXML(xml, {
    cert: SAT_CONFIG.certificate_path,
    key: SAT_CONFIG.private_key_path,
    password: SAT_CONFIG.private_key_password
  });
  
  // Enviar a PAC para timbrado
  const client = await soap.createClientAsync(SAT_CONFIG.pac_url);
  
  const result = await client.stampAsync({
    xml: Buffer.from(signedXML).toString('base64'),
    username: process.env.PAC_USERNAME,
    password: process.env.PAC_PASSWORD
  });
  
  if (result.success) {
    return {
      xml_timbrado: result.xml,
      uuid: result.uuid,
      fecha_timbrado: result.fecha,
      sello_sat: result.selloSAT
    };
  } else {
    throw new Error(`Error timbrado: ${result.message}`);
  }
}
```

#### 4. Almacenamiento y Envío

```javascript
async function storeCFDI(cxc_id, cfdi_data) {
  // Guardar XML en disco
  const filename = `${cfdi_data.uuid}.xml`;
  const filepath = `/var/spirittours/cfdi/${filename}`;
  await fs.writeFile(filepath, cfdi_data.xml_timbrado);
  
  // Guardar en base de datos
  await pool.query(`
    INSERT INTO facturas_electronicas (
      cxc_id, uuid, xml_path, fecha_timbrado, status
    ) VALUES ($1, $2, $3, $4, 'timbrada')
  `, [cxc_id, cfdi_data.uuid, filepath, cfdi_data.fecha_timbrado]);
  
  // Enviar por email al cliente
  await sendInvoiceEmail(cxc_id, filepath);
}
```

#### 5. Cancelación de CFDI

```javascript
async function cancelCFDI(uuid, motivo) {
  const client = await soap.createClientAsync(SAT_CONFIG.pac_url);
  
  const result = await client.cancelAsync({
    uuid: uuid,
    rfc: SAT_CONFIG.rfc_emisor,
    motivo: motivo, // '01' = Comprobante emitido con errores con relación
    folioSustitucion: null,
    username: process.env.PAC_USERNAME,
    password: process.env.PAC_PASSWORD
  });
  
  if (result.success) {
    await pool.query(`
      UPDATE facturas_electronicas
      SET status = 'cancelada', fecha_cancelacion = NOW()
      WHERE uuid = $1
    `, [uuid]);
    
    return { success: true, message: 'CFDI cancelled successfully' };
  } else {
    throw new Error(`Error cancelación: ${result.message}`);
  }
}
```

---

## 💼 Integración CONTPAQi

### Exportación de Pólizas Contables

```javascript
// Formato de póliza CONTPAQi
function exportToCONTPAQi(fecha_desde, fecha_hasta) {
  const movimientos = await getAccountingMovements(fecha_desde, fecha_hasta);
  
  const polizas = [];
  let polizaId = 1;
  
  // Agrupar por fecha y tipo
  const groupedByDate = _.groupBy(movimientos, m => 
    `${m.fecha.toISOString().split('T')[0]}-${m.tipo}`
  );
  
  for (const [key, items] of Object.entries(groupedByDate)) {
    const poliza = {
      Id: polizaId++,
      Fecha: items[0].fecha.toISOString().split('T')[0],
      Tipo: getTipoPoliza(items[0].tipo), // 'I' ingreso, 'E' egreso, 'D' diario
      Concepto: `Póliza ${items[0].tipo} ${items[0].fecha.toLocaleDateString()}`,
      Movimientos: []
    };
    
    for (const item of items) {
      poliza.Movimientos.push({
        Cuenta: mapCuentaContable(item.cuenta),
        Debe: item.debe,
        Haber: item.haber,
        Referencia: item.referencia_id,
        Concepto: item.concepto
      });
    }
    
    // Verificar que cuadre (debe = haber)
    const totalDebe = _.sumBy(poliza.Movimientos, 'Debe');
    const totalHaber = _.sumBy(poliza.Movimientos, 'Haber');
    
    if (Math.abs(totalDebe - totalHaber) > 0.01) {
      throw new Error(`Póliza ${poliza.Id} no cuadra: Debe=${totalDebe}, Haber=${totalHaber}`);
    }
    
    polizas.push(poliza);
  }
  
  // Generar archivo XML CONTPAQi
  return generateCONTPAQiXML(polizas);
}

function mapCuentaContable(cuenta) {
  const mapping = {
    'CXC': '105-001',
    'CXP': '201-001',
    'BANCO': '102-001',
    'CAJA': '101-001',
    'INGRESOS_SERVICIOS': '401-001',
    'GASTOS_OPERACION': '501-001',
    'GASTOS_BANCARIOS': '503-001'
  };
  
  return mapping[cuenta] || '999-999';
}

function generateCONTPAQiXML(polizas) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CONTABILIDAD VERSION="2.0">
  <EMPRESA RFC="${SAT_CONFIG.rfc_emisor}">
    <POLIZAS>
      ${polizas.map(p => `
      <POLIZA TIPO="${p.Tipo}" NUM="${p.Id}" FECHA="${p.Fecha}">
        <CONCEPTO>${p.Concepto}</CONCEPTO>
        ${p.Movimientos.map(m => `
        <MOVIMIENTO CUENTA="${m.Cuenta}" DEBE="${m.Debe}" HABER="${m.Haber}">
          <CONCEPTO>${m.Concepto}</CONCEPTO>
          <REFERENCIA>${m.Referencia}</REFERENCIA>
        </MOVIMIENTO>
        `).join('')}
      </POLIZA>
      `).join('')}
    </POLIZAS>
  </EMPRESA>
</CONTABILIDAD>`;
  
  return xml;
}
```

---

## 💳 Pasarelas de Pago

### 1. Integración Stripe

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createStripePaymentIntent(cxc_id) {
  const cxc = await getCXCById(cxc_id);
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(cxc.monto_pendiente * 100), // Centavos
    currency: 'mxn',
    metadata: {
      cxc_id: cxc_id,
      cxc_folio: cxc.folio,
      sucursal_id: cxc.sucursal_id
    },
    description: `Pago ${cxc.folio} - ${cxc.tour_name}`
  });
  
  return {
    client_secret: paymentIntent.client_secret,
    payment_intent_id: paymentIntent.id
  };
}

// Webhook handler para Stripe
app.post('/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    
    // Registrar pago en Spirit Tours
    await accountingService.registerPaymentReceived(
      paymentIntent.metadata.cxc_id,
      {
        monto: paymentIntent.amount / 100,
        metodo_pago: 'tarjeta_credito',
        referencia: paymentIntent.id,
        comision_bancaria: paymentIntent.amount * 0.036 / 100, // 3.6% Stripe fee
        usuario_id: 'SYSTEM_STRIPE'
      }
    );
  }
  
  res.json({received: true});
});
```

### 2. Integración PayPal

```javascript
const paypal = require('@paypal/checkout-server-sdk');

function getPayPalClient() {
  const environment = process.env.PAYPAL_MODE === 'live'
    ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
    : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
  
  return new paypal.core.PayPalHttpClient(environment);
}

async function createPayPalOrder(cxc_id) {
  const cxc = await getCXCById(cxc_id);
  const client = getPayPalClient();
  
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: cxc.folio,
      description: `Pago ${cxc.folio} - ${cxc.tour_name}`,
      amount: {
        currency_code: 'MXN',
        value: cxc.monto_pendiente.toFixed(2)
      }
    }],
    application_context: {
      return_url: 'https://spirittours.com/payment/success',
      cancel_url: 'https://spirittours.com/payment/cancel'
    }
  });
  
  const order = await client.execute(request);
  return { order_id: order.result.id };
}
```

---

## 🔐 Seguridad y Mejores Prácticas

### 1. Manejo de Credenciales

```javascript
// ❌ NUNCA hacer esto
const api_key = 'sk_live_12345abcde';

// ✅ Usar variables de entorno
const api_key = process.env.STRIPE_API_KEY;

// ✅ Usar secrets manager (AWS, Azure, etc.)
const api_key = await secretsManager.getSecret('stripe_api_key');
```

### 2. Validación de Webhooks

```javascript
function validateWebhookSignature(payload, signature, secret) {
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
}
```

### 3. Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: 'Too many requests from this IP'
});

app.use('/api/accounting/', apiLimiter);
```

### 4. Retry Logic

```javascript
async function callExternalAPIWithRetry(apiCall, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

---

## 📊 Monitoreo de Integraciones

```javascript
class IntegrationMonitor {
  async checkBankAPIHealth() {
    try {
      const response = await axios.get(`${BBVA_CONFIG.api_url}/health`, { timeout: 5000 });
      return { status: 'UP', latency: response.duration };
    } catch (error) {
      return { status: 'DOWN', error: error.message };
    }
  }
  
  async logIntegrationEvent(integration, event_type, data) {
    await pool.query(`
      INSERT INTO integration_logs (integration, event_type, data, timestamp)
      VALUES ($1, $2, $3, NOW())
    `, [integration, event_type, JSON.stringify(data)]);
  }
}
```

---

**Última actualización:** 27 de octubre de 2025  
**Versión:** 1.0
