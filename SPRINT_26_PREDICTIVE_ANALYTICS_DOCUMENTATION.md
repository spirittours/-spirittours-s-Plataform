# 🚀 **SPRINT 26 COMPLETADO - PREDICTIVE ANALYTICS**
## Sistema de Análisis Predictivo con Machine Learning - Documentación Técnica

---

## 📋 **RESUMEN EJECUTIVO**

El **Sprint 26** implementa un **sistema completo de análisis predictivo** utilizando Machine Learning para proporcionar insights accionables sobre el negocio.

### 🎯 **Objetivos del Sprint**
Implementar modelos de ML para:
1. **Predicción de Churn**: Identificar clientes en riesgo de abandonar
2. **Forecasting de Ingresos**: Predecir ingresos futuros usando time-series
3. **Predicción de Demanda**: Anticipar volumen de reservas
4. **Detección de Anomalías**: Identificar patrones inusuales automáticamente

### 💰 **Valor Entregado**
- ✅ **PredictiveAnalyticsService**: Motor de ML con 4 modelos predictivos
- ✅ **Predictive API Routes**: 9 endpoints REST completos
- ✅ **ML Models**: Churn, Revenue, Demand, Anomaly Detection
- ✅ **Business Insights**: Recomendaciones automáticas basadas en IA
- ✅ **Model Management**: Training automático y caching

---

## 🏗️ **ARQUITECTURA DEL SISTEMA**

### 🧠 **PredictiveAnalyticsService** (20,308 chars)

**Propósito**: Motor centralizado de análisis predictivo y machine learning.

**Modelos Implementados**:
1. **Churn Prediction Model** - Predice probabilidad de abandono de cliente
2. **Revenue Forecasting Model** - Time-series forecasting de ingresos
3. **Demand Prediction Model** - Predice volumen de bookings futuras
4. **Anomaly Detection Model** - Detecta patrones inusuales

**Características Clave**:
- ✅ 4 modelos ML especializados
- ✅ Training automático periódico
- ✅ Caching de modelos para performance
- ✅ Feature extraction automatizado
- ✅ Confidence scores
- ✅ Recomendaciones accionables
- ✅ Event-driven architecture

---

## 📊 **MODELOS DE MACHINE LEARNING**

### 1. **Churn Prediction Model**

**Objetivo**: Predecir qué clientes están en riesgo de abandonar.

**Features Utilizadas**:
```javascript
{
  bookingFrequency: number,      // Bookings en últimos 90 días
  avgBookingValue: number,        // Valor promedio de booking
  daysSinceLastBooking: number,   // Días desde último booking
  totalSpent: number,             // Total gastado histórico
  cancellationRate: number,       // % de bookings cancelados
  avgResponseTime: number,        // Tiempo promedio de respuesta
  supportTickets: number,         // Tickets de soporte abiertos
  emailEngagement: number,        // Tasa de apertura de emails (0-1)
  accountAge: number,             // Días desde registro
  paymentIssues: number          // Número de problemas de pago
}
```

**Output**:
```javascript
{
  customerId: "customer_123",
  churnProbability: 0.78,        // 0-1
  riskLevel: "high",             // low, medium, high, critical
  confidence: 0.85,              // Confidence del modelo
  predictedChurnDate: "2024-03-15",
  factors: [                     // Top 3 factores de riesgo
    "Inactivity for 60 days",
    "Declining engagement with emails",
    "No bookings in last 90 days"
  ],
  recommendations: [             // Acciones sugeridas
    "Send personalized re-engagement email",
    "Offer 15% discount on next booking",
    "Schedule personal call from account manager"
  ]
}
```

**Niveles de Riesgo**:
```javascript
churnProbability >= 0.8  → critical (Acción inmediata)
churnProbability >= 0.7  → high     (Contacto en 48h)
churnProbability >= 0.5  → medium   (Monitorear)
churnProbability < 0.5   → low      (Clientes saludables)
```

**Uso**:
```javascript
const { getPredictiveAnalyticsService } = require('./services/ml/PredictiveAnalyticsService');

const service = getPredictiveAnalyticsService();

// Predicción individual
const prediction = await service.predictChurn({ 
  customerId: 'customer_123' 
});

console.log(`Customer ${prediction.customerId}:`);
console.log(`- Churn probability: ${(prediction.churnProbability * 100).toFixed(1)}%`);
console.log(`- Risk level: ${prediction.riskLevel}`);
console.log(`- Predicted churn date: ${prediction.predictedChurnDate}`);
console.log(`- Top factors:`, prediction.factors);
console.log(`- Recommendations:`, prediction.recommendations);
```

**Batch Prediction**:
```javascript
// Predecir para múltiples clientes
const customers = await Customer.find({ status: 'active' });

for (const customer of customers) {
  const prediction = await service.predictChurn({ customerId: customer._id });
  
  if (prediction.riskLevel === 'critical' || prediction.riskLevel === 'high') {
    // Disparar alerta o acción automática
    await sendRetentionCampaign(customer, prediction.recommendations);
  }
}
```

---

### 2. **Revenue Forecasting Model**

**Objetivo**: Predecir ingresos futuros usando análisis de time-series.

**Algoritmos**:
- Linear regression con tendencia y estacionalidad
- Moving averages
- Seasonal decomposition
- Growth rate analysis

**Input**:
```javascript
{
  period: 'week' | 'month' | 'quarter' | 'year',
  periods: number,                    // Cuántos períodos hacia adelante
  includeConfidenceIntervals: boolean
}
```

**Output**:
```javascript
{
  forecast: [
    {
      date: "2024-01",
      value: 150000,              // Ingresos predichos
      trend: "increasing",        // increasing, stable, declining
      seasonal: 1.2,              // Factor estacional
      confidence: {
        lower: 140000,            // Límite inferior (95% confianza)
        upper: 160000             // Límite superior (95% confianza)
      }
    },
    {
      date: "2024-02",
      value: 165000,
      trend: "increasing",
      seasonal: 1.3,
      confidence: {
        lower: 155000,
        upper: 175000
      }
    },
    {
      date: "2024-03",
      value: 180000,
      trend: "increasing",
      seasonal: 1.4,
      confidence: {
        lower: 170000,
        upper: 190000
      }
    }
  ],
  summary: {
    total: 495000,               // Total predicho para el período
    average: 165000,             // Promedio por período
    trend: "increasing",         // Tendencia general
    growthRate: 10.0            // % de crecimiento proyectado
  },
  metadata: {
    modelConfidence: 0.87,
    lastTrainedAt: "2024-01-01T00:00:00Z",
    dataPointsUsed: 24          // Meses de datos históricos
  }
}
```

**Uso**:
```javascript
// Forecast de 3 meses
const forecast = await service.forecastRevenue({
  period: 'month',
  periods: 3,
  includeConfidenceIntervals: true
});

console.log('Revenue Forecast:');
forecast.forecast.forEach(f => {
  console.log(`${f.date}: $${f.value.toLocaleString()} (${f.trend})`);
  console.log(`  Confidence: $${f.confidence.lower.toLocaleString()} - $${f.confidence.upper.toLocaleString()}`);
});

console.log('\nSummary:');
console.log(`Total predicted: $${forecast.summary.total.toLocaleString()}`);
console.log(`Trend: ${forecast.summary.trend}`);
console.log(`Growth rate: ${forecast.summary.growthRate}%`);
```

**Casos de Uso**:
- Planificación financiera trimestral
- Presupuestos departamentales
- Proyecciones para inversionistas
- Identificación de temporadas bajas/altas
- Decisiones de contratación

---

### 3. **Demand Prediction Model**

**Objetivo**: Predecir volumen futuro de reservas para optimizar capacidad.

**Features**:
```javascript
{
  historicalBookings: array,    // Histórico de bookings
  seasonality: number,          // Factor estacional
  marketTrends: number,         // Tendencias del mercado
  promotions: array,            // Promociones activas
  events: array,                // Eventos especiales
  tourType: string              // Tipo de tour
}
```

**Output**:
```javascript
{
  predictions: [
    {
      date: "2024-01-07",
      predicted: 45,              // Bookings predichos
      capacity: 50,               // Capacidad disponible
      utilizationRate: 0.90,      // 90% utilización
      recommendation: "Increase marketing spend",
      confidence: 0.82
    },
    {
      date: "2024-01-14",
      predicted: 52,
      capacity: 50,
      utilizationRate: 1.04,      // Sobre-capacidad
      recommendation: "Add extra tours or waitlist",
      confidence: 0.85
    },
    // ... más semanas
  ],
  summary: {
    totalPredicted: 450,          // Total de bookings predichos
    averagePerPeriod: 45,
    peakDemand: {
      date: "2024-01-21",
      bookings: 65
    },
    lowDemand: {
      date: "2024-01-07",
      bookings: 30
    }
  },
  recommendations: [
    "Consider adding 2 extra tours on January 21 (peak demand)",
    "Offer early bird discount for January 7 (low demand)",
    "Adjust pricing dynamically based on utilization rate"
  ]
}
```

**Uso**:
```javascript
// Predecir demanda para próximo mes
const demand = await service.predictDemand({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  granularity: 'week',
  tourType: 'religious_pilgrimage'
});

console.log('Demand Forecast:');
demand.predictions.forEach(p => {
  console.log(`${p.date}: ${p.predicted} bookings (${(p.utilizationRate * 100).toFixed(0)}% capacity)`);
  console.log(`  → ${p.recommendation}`);
});

console.log('\nRecommendations:');
demand.recommendations.forEach(r => console.log(`- ${r}`));
```

**Casos de Uso**:
- Planificación de capacidad de tours
- Optimización de precios dinámicos
- Decisiones de marketing
- Gestión de inventario
- Staffing y recursos

---

### 4. **Anomaly Detection Model**

**Objetivo**: Detectar automáticamente patrones inusuales en métricas de negocio.

**Métricas Soportadas**:
- **Revenue**: Ingresos diarios/semanales/mensuales
- **Bookings**: Número de reservas
- **Cancellations**: Tasa de cancelaciones
- **Response Time**: Tiempo de respuesta del sistema

**Algoritmos**:
- Statistical analysis (Z-score, IQR)
- Moving averages
- Seasonal decomposition
- Isolation Forest (ready for TensorFlow integration)

**Sensibilidades**:
```javascript
sensitivity: 'low'    → Z-score > 3.0  (solo anomalías muy extremas)
sensitivity: 'medium' → Z-score > 2.5  (anomalías moderadas)
sensitivity: 'high'   → Z-score > 2.0  (detección sensible)
```

**Output**:
```javascript
{
  anomalies: [
    {
      date: "2024-01-15",
      value: 85000,               // Valor observado
      expected: 120000,           // Valor esperado
      deviation: -35000,          // Desviación
      deviationPercent: -29.2,    // % de desviación
      severity: "critical",       // low, medium, high, critical
      type: "spike_down",         // spike_up, spike_down, pattern_break
      zScore: -3.5,              // Z-score estadístico
      explanation: "Revenue 29% below expected - possible system issue or market event",
      possibleCauses: [
        "Technical issue preventing bookings",
        "Major competitor launched promotion",
        "Seasonal dip"
      ],
      recommendedActions: [
        "Investigate booking system for errors",
        "Check competitor activity",
        "Review marketing campaigns"
      ]
    },
    {
      date: "2024-01-20",
      value: 180000,
      expected: 125000,
      deviation: 55000,
      deviationPercent: 44.0,
      severity: "high",
      type: "spike_up",
      zScore: 4.2,
      explanation: "Revenue 44% above expected - positive anomaly",
      possibleCauses: [
        "Successful marketing campaign",
        "Viral social media post",
        "Large group booking"
      ],
      recommendedActions: [
        "Analyze what drove this spike",
        "Replicate successful tactics",
        "Ensure capacity can handle increased demand"
      ]
    }
  ],
  summary: {
    total: 2,
    bySeverity: {
      critical: 1,
      high: 1,
      medium: 0,
      low: 0
    },
    byType: {
      spike_up: 1,
      spike_down: 1,
      pattern_break: 0
    },
    timeRange: {
      start: "2024-01-01",
      end: "2024-01-31"
    }
  },
  baseline: {
    mean: 125000,
    stdDev: 15000,
    threshold: {
      upper: 155000,
      lower: 95000
    }
  }
}
```

**Uso**:
```javascript
// Detectar anomalías en revenue del último mes
const anomalies = await service.detectAnomalies({
  metric: 'revenue',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  sensitivity: 'medium'
});

console.log(`Found ${anomalies.summary.total} anomalies:`);
anomalies.anomalies.forEach(a => {
  console.log(`\n${a.date} - ${a.severity.toUpperCase()}`);
  console.log(`Value: $${a.value.toLocaleString()} (expected: $${a.expected.toLocaleString()})`);
  console.log(`Deviation: ${a.deviationPercent.toFixed(1)}%`);
  console.log(`Explanation: ${a.explanation}`);
  console.log('Possible causes:', a.possibleCauses);
  console.log('Recommended actions:', a.recommendedActions);
});
```

**Casos de Uso**:
- Alertas automáticas de problemas
- Identificación de fraude
- Monitoreo de KPIs
- Detección de bugs en producción
- Análisis de impacto de campañas

---

## 🚀 **API ROUTES** (13,960 chars)

### **Endpoints Implementados**

#### 1. **POST /api/analytics/predictive/churn/predict**
Predice churn para un cliente específico.

**Request**:
```json
{
  "customerId": "customer_123"
}
```
o
```json
{
  "features": {
    "bookingFrequency": 2,
    "avgBookingValue": 1500,
    "daysSinceLastBooking": 45,
    "totalSpent": 12000,
    "cancellationRate": 0.1,
    "avgResponseTime": 2.5,
    "supportTickets": 1,
    "emailEngagement": 0.6,
    "accountAge": 365,
    "paymentIssues": 0
  }
}
```

**Response**:
```json
{
  "success": true,
  "prediction": {
    "customerId": "customer_123",
    "churnProbability": 0.78,
    "riskLevel": "high",
    "confidence": 0.85,
    "predictedChurnDate": "2024-03-15T00:00:00.000Z",
    "factors": [
      "Inactivity for 60 days",
      "Declining engagement with emails",
      "No bookings in last 90 days"
    ],
    "recommendations": [
      "Send personalized re-engagement email",
      "Offer 15% discount on next booking",
      "Schedule personal call from account manager"
    ]
  }
}
```

---

#### 2. **POST /api/analytics/predictive/churn/batch**
Predicción de churn en batch para múltiples clientes.

**Request**:
```json
{
  "customerIds": ["customer_1", "customer_2", "customer_3"],
  "riskThreshold": 0.7
}
```

**Response**:
```json
{
  "success": true,
  "total": 3,
  "highRisk": 2,
  "predictions": [
    { "customerId": "customer_1", "churnProbability": 0.85, "riskLevel": "critical" },
    { "customerId": "customer_2", "churnProbability": 0.72, "riskLevel": "high" },
    { "customerId": "customer_3", "churnProbability": 0.45, "riskLevel": "low" }
  ]
}
```

---

#### 3. **POST /api/analytics/predictive/revenue/forecast**
Forecast de ingresos usando time-series.

**Request**:
```json
{
  "period": "month",
  "periods": 3,
  "includeConfidenceIntervals": true
}
```

**Response**:
```json
{
  "success": true,
  "forecast": {
    "forecast": [
      {
        "date": "2024-01",
        "value": 150000,
        "trend": "increasing",
        "seasonal": 1.2,
        "confidence": {
          "lower": 140000,
          "upper": 160000
        }
      }
    ],
    "summary": {
      "total": 495000,
      "average": 165000,
      "trend": "increasing"
    }
  }
}
```

---

#### 4. **POST /api/analytics/predictive/demand/predict**
Predicción de demanda/volumen de bookings.

**Request**:
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "granularity": "week",
  "tourType": "religious_pilgrimage"
}
```

**Response**:
```json
{
  "success": true,
  "prediction": {
    "predictions": [
      {
        "date": "2024-01-07",
        "predicted": 45,
        "capacity": 50,
        "utilizationRate": 0.90,
        "recommendation": "Increase marketing spend"
      }
    ],
    "summary": {
      "totalPredicted": 450,
      "averagePerPeriod": 45,
      "peakDemand": { "date": "2024-01-21", "bookings": 65 }
    },
    "recommendations": [
      "Consider adding 2 extra tours on January 21 (peak demand)"
    ]
  }
}
```

---

#### 5. **POST /api/analytics/predictive/anomalies/detect**
Detección de anomalías en métricas.

**Request**:
```json
{
  "metric": "revenue",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "sensitivity": "medium"
}
```

**Response**:
```json
{
  "success": true,
  "detection": {
    "anomalies": [
      {
        "date": "2024-01-15",
        "value": 85000,
        "expected": 120000,
        "severity": "critical",
        "type": "spike_down",
        "explanation": "Revenue 29% below expected"
      }
    ],
    "summary": {
      "total": 1,
      "bySeverity": { "critical": 1 }
    }
  }
}
```

---

#### 6. **GET /api/analytics/predictive/models/status**
Estado de los modelos ML.

**Response**:
```json
{
  "success": true,
  "status": {
    "models": {
      "churn": {
        "trained": true,
        "lastTrained": "2024-01-01T00:00:00.000Z",
        "accuracy": 0.85,
        "samples": 1000
      },
      "revenue": {
        "trained": true,
        "lastTrained": "2024-01-01T00:00:00.000Z",
        "accuracy": 0.87,
        "samples": 24
      }
    },
    "cacheStats": {
      "size": 150,
      "hits": 850,
      "misses": 150,
      "hitRate": "85%"
    }
  }
}
```

---

#### 7. **POST /api/analytics/predictive/models/retrain**
Reentrenar modelos manualmente.

**Request**:
```json
{
  "model": "all"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Retraining all model(s) initiated",
  "estimatedTime": "5-15 minutes"
}
```

---

#### 8. **GET /api/analytics/predictive/insights**
Obtener insights de negocio basados en IA.

**Response**:
```json
{
  "success": true,
  "insights": [
    {
      "type": "churn",
      "severity": "high",
      "message": "15 customers at high churn risk",
      "data": { "highRiskCount": 15 },
      "recommendations": [
        "Launch retention campaign",
        "Offer loyalty rewards"
      ]
    },
    {
      "type": "revenue",
      "severity": "medium",
      "message": "Revenue trend is declining for next 3 months",
      "data": { "trend": "declining" },
      "recommendations": [
        "Review pricing strategy",
        "Increase marketing efforts"
      ]
    }
  ],
  "summary": {
    "total": 2,
    "bySeverity": { "high": 1, "medium": 1 }
  }
}
```

---

#### 9. **GET /api/analytics/predictive/health**
Health check del servicio.

**Response**:
```json
{
  "success": true,
  "status": "healthy",
  "uptime": 86400,
  "statistics": {
    "totalPredictions": 1523,
    "churnPredictions": 856,
    "revenueForecast": 423,
    "demandPredictions": 189,
    "anomaliesDetected": 55
  }
}
```

---

## 🔧 **CONFIGURACIÓN Y USO**

### **Inicialización**

```javascript
// backend/server.js

const { getPredictiveAnalyticsService } = require('./services/ml/PredictiveAnalyticsService');

// Inicializar servicio
const predictiveAnalytics = getPredictiveAnalyticsService();

// Eventos
predictiveAnalytics.on('prediction_made', (data) => {
  console.log('Prediction:', data);
});

predictiveAnalytics.on('model_trained', (model) => {
  console.log(`Model ${model} trained successfully`);
});

predictiveAnalytics.on('anomaly_detected', (anomaly) => {
  console.log('ALERT - Anomaly detected:', anomaly);
  // Enviar notificación
});

// Reentrenamiento automático cada 24 horas
setInterval(() => {
  predictiveAnalytics.trainAllModels();
}, 24 * 60 * 60 * 1000);
```

### **Integración con Alertas**

```javascript
const alertService = getAlertNotificationSystem();

predictiveAnalytics.on('high_churn_risk', async (customer) => {
  await alertService.createAlert({
    type: 'churn_risk',
    severity: 'high',
    title: `Customer ${customer.name} at high churn risk`,
    description: `Churn probability: ${(customer.churnProbability * 100).toFixed(1)}%`,
    data: customer,
    channels: ['email', 'slack']
  });
});

predictiveAnalytics.on('revenue_anomaly', async (anomaly) => {
  await alertService.createAlert({
    type: 'revenue_anomaly',
    severity: anomaly.severity,
    title: `Revenue anomaly detected`,
    description: anomaly.explanation,
    data: anomaly,
    channels: ['email', 'slack', 'sms']
  });
});
```

### **Dashboard Integration**

```javascript
// Frontend: Fetch predictions
const fetchPredictions = async () => {
  const response = await fetch('/api/analytics/predictive/insights', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  setInsights(data.insights);
};

// Display insights
insights.map(insight => (
  <Alert severity={insight.severity}>
    <AlertTitle>{insight.message}</AlertTitle>
    <Typography variant="body2">
      {insight.recommendations.join(', ')}
    </Typography>
  </Alert>
));
```

---

## 📈 **MEJORAS FUTURAS**

### **Machine Learning Avanzado**

1. **TensorFlow/Keras Integration**:
```javascript
const tf = require('@tensorflow/tfjs-node');

// Neural network para churn prediction
const model = tf.sequential({
  layers: [
    tf.layers.dense({ inputShape: [10], units: 128, activation: 'relu' }),
    tf.layers.dropout({ rate: 0.3 }),
    tf.layers.dense({ units: 64, activation: 'relu' }),
    tf.layers.dropout({ rate: 0.2 }),
    tf.layers.dense({ units: 1, activation: 'sigmoid' })
  ]
});

model.compile({
  optimizer: 'adam',
  loss: 'binaryCrossentropy',
  metrics: ['accuracy']
});
```

2. **scikit-learn via Python Child Process**:
```javascript
const { spawn } = require('child_process');

const runPythonML = (scriptName, data) => {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [scriptName]);
    
    python.stdin.write(JSON.stringify(data));
    python.stdin.end();
    
    let output = '';
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.on('close', (code) => {
      if (code === 0) {
        resolve(JSON.parse(output));
      } else {
        reject(new Error('Python script failed'));
      }
    });
  });
};
```

3. **AutoML Integration**:
- Google Cloud AutoML
- AWS SageMaker Autopilot
- Azure AutoML

---

## ✅ **CONCLUSIÓN**

El **Sprint 26 - Predictive Analytics** está **completamente implementado** con:

1. ✅ **4 Modelos ML**: Churn, Revenue, Demand, Anomaly Detection
2. ✅ **9 API Endpoints**: REST API completo
3. ✅ **Event-Driven Architecture**: Integración con alertas y notificaciones
4. ✅ **Automatic Training**: Reentrenamiento periódico
5. ✅ **Caching**: Performance optimizado
6. ✅ **Business Insights**: Recomendaciones accionables
7. ✅ **Production-Ready**: Listo para uso en producción

**Estado**: ✅ **COMPLETADO**

---

**Última actualización**: 2024-11-06
**Versión**: 1.0.0
**Sprint**: 26
