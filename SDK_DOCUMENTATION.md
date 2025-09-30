# 📚 **SDK DOCUMENTATION COMPLETA**
## AI Multi-Model Platform - Developer SDK
### $100K IA Multi-Modelo Upgrade - Phase 2 Extended

---

## 🎯 **OVERVIEW**

Este SDK proporciona acceso completo a la plataforma AI Multi-Model Enterprise, permitiendo a los desarrolladores integrar fácilmente capacidades de IA avanzadas en sus aplicaciones.

### 🚀 **Características Principales**
- **23+ Modelos de IA** - Acceso a OpenAI, Anthropic, Google, Perplexity, Cohere y más
- **Procesamiento por Consenso** - Combina resultados de múltiples modelos
- **WebSocket en Tiempo Real** - Métricas y actualizaciones en vivo
- **Procesamiento por Lotes** - Maneja grandes volúmenes de requests
- **Analytics Avanzados** - Métricas de rendimiento y costos
- **Webhooks** - Notificaciones automáticas de eventos
- **Rate Limiting Inteligente** - Reintento automático con backoff exponencial

---

## 📦 **INSTALACIÓN**

### JavaScript/Node.js
```bash
npm install ai-multi-model-sdk
# o
yarn add ai-multi-model-sdk
```

### Python
```bash
pip install ai-multi-model-sdk
```

---

## 🔧 **CONFIGURACIÓN INICIAL**

### JavaScript
```javascript
const { AIMultiModelSDK } = require('ai-multi-model-sdk');

const sdk = new AIMultiModelSDK({
    apiKey: 'sk_your_api_key_here',
    baseURL: 'https://api.yourcompany.com',
    enableWebSocket: true,
    debug: true
});
```

### Python
```python
from ai_multi_model_sdk import AIMultiModelSDK

async def main():
    async with AIMultiModelSDK(
        api_key='sk_your_api_key_here',
        base_url='https://api.yourcompany.com',
        enable_websocket=True,
        debug=True
    ) as sdk:
        # Usar el SDK aquí
        result = await sdk.ai.process("Hello, world!")
        print(result.data)

# Ejecutar
import asyncio
asyncio.run(main())
```

---

## 🤖 **MÓDULO AI - PROCESAMIENTO DE IA**

### Procesamiento Simple

#### JavaScript
```javascript
// Procesamiento básico
const result = await sdk.ai.process({
    prompt: "Analiza estos datos de ventas y proporciona insights",
    model: "gpt-4", // Opcional - se selecciona automáticamente si no se especifica
    parameters: {
        temperature: 0.7,
        maxTokens: 1000
    },
    useCase: "business_analysis" // Para selección inteligente de modelo
});

console.log(result.data.response);
console.log(`Modelo usado: ${result.model}`);
console.log(`Costo: $${result.cost}`);
```

#### Python
```python
result = await sdk.ai.process(
    prompt="Analiza estos datos de ventas y proporciona insights",
    model="gpt-4",
    parameters={
        "temperature": 0.7,
        "max_tokens": 1000
    },
    use_case="business_analysis"
)

print(result.data['response'])
print(f"Modelo usado: {result.model}")
print(f"Costo: ${result.cost}")
```

### Procesamiento por Consenso

#### JavaScript
```javascript
// Usa múltiples modelos para mejor precisión
const consensus = await sdk.ai.consensus({
    prompt: "¿Cuáles son las tendencias del mercado de IA para 2024?",
    models: ["gpt-4", "claude-3.5-sonnet", "gemini-2.0-flash"],
    parameters: {
        temperature: 0.3 // Menor temperatura para análisis
    }
});

console.log("Resultado recomendado:", consensus.recommendedResult.data);
console.log("Resumen del consenso:", consensus.summary);
console.log(`Costo total: $${consensus.totalCost}`);

// Ver todos los resultados
consensus.consensus.forEach((result, index) => {
    console.log(`Modelo ${result.model}: ${result.data.response}`);
});
```

#### Python
```python
consensus = await sdk.ai.consensus(
    prompt="¿Cuáles son las tendencias del mercado de IA para 2024?",
    models=["gpt-4", "claude-3.5-sonnet", "gemini-2.0-flash"],
    parameters={"temperature": 0.3}
)

print("Resultado recomendado:", consensus.recommended_result.data)
print("Resumen:", consensus.summary)
print(f"Costo total: ${consensus.total_cost}")
```

### Obtener Modelos Disponibles

#### JavaScript
```javascript
const models = await sdk.ai.getModels();
console.log(`Disponibles: ${models.data.totalModels} modelos`);

models.data.models.forEach(model => {
    console.log(`${model.name} - ${model.provider} - $${model.costPer1kTokens}/1K tokens`);
});

// Información específica de un modelo
const modelInfo = await sdk.ai.getModelInfo('gpt-4');
console.log(modelInfo.data.model);
```

#### Python
```python
models = await sdk.ai.get_models()
print(f"Disponibles: {models['data']['totalModels']} modelos")

for model in models['data']['models']:
    print(f"{model['name']} - {model['provider']} - ${model['costPer1kTokens']}/1K tokens")

# Información específica
model_info = await sdk.ai.get_model_info('gpt-4')
print(model_info['data']['model'])
```

### Testing de Modelos

#### JavaScript
```javascript
// Probar múltiples modelos con el mismo prompt
const testResults = await sdk.ai.test({
    prompt: "Explica qué es machine learning en una oración",
    models: ["gpt-4", "claude-3.5-sonnet", "gemini-2.0-flash"],
    parameters: { maxTokens: 100 }
});

testResults.data.results.forEach(result => {
    console.log(`${result.model}: ${result.response}`);
    console.log(`Tiempo: ${result.processingTime}ms, Costo: $${result.cost}`);
});
```

---

## 📊 **MÓDULO ANALYTICS**

### Métricas de Uso

#### JavaScript
```javascript
// Analíticas de las últimas 24 horas
const usage = await sdk.analytics.getUsage('24h');
console.log(`Total requests: ${usage.data.totalRequests}`);
console.log(`Costo total: $${usage.data.totalCost}`);
console.log(`Modelos más usados:`, usage.data.topModels);

// Métricas de rendimiento
const performance = await sdk.analytics.getPerformance('7d');
console.log(`Tiempo promedio de respuesta: ${performance.data.averageResponseTime}ms`);
console.log(`Tasa de éxito: ${performance.data.successRate}%`);

// Análisis de costos
const costs = await sdk.analytics.getCosts('30d');
console.log(`Costo mensual: $${costs.data.totalCost}`);
console.log(`Costo por modelo:`, costs.data.costByModel);
```

#### Python
```python
# Analíticas de uso
usage = await sdk.analytics.get_usage('24h')
print(f"Total requests: {usage['data']['totalRequests']}")
print(f"Costo total: ${usage['data']['totalCost']}")

# Rendimiento
performance = await sdk.analytics.get_performance('7d')
print(f"Tiempo promedio: {performance['data']['averageResponseTime']}ms")

# Costos
costs = await sdk.analytics.get_costs('30d')
print(f"Costo mensual: ${costs['data']['totalCost']}")
```

---

## 🔄 **MÓDULO BATCH - PROCESAMIENTO POR LOTES**

### Envío de Trabajos por Lotes

#### JavaScript
```javascript
// Preparar múltiples requests
const requests = [
    {
        prompt: "Resumen de este artículo: [contenido]",
        model: "claude-3.5-sonnet",
        parameters: { maxTokens: 500 }
    },
    {
        prompt: "Traduce este texto al español: [texto]",
        model: "gpt-4",
        parameters: { temperature: 0.3 }
    },
    // ... más requests
];

// Enviar trabajo por lotes
const batchJob = await sdk.batch.submit({
    requests: requests,
    callbackUrl: "https://yourapp.com/webhook/batch-complete",
    priority: "high"
});

console.log(`Job ID: ${batchJob.data.jobId}`);
console.log(`Estado: ${batchJob.data.status}`);
```

### Monitoreo de Trabajos

#### JavaScript
```javascript
// Verificar estado del trabajo
const status = await sdk.batch.getStatus(jobId);
console.log(`Progreso: ${status.progress}%`);
console.log(`Completados: ${status.completedRequests}/${status.totalRequests}`);
console.log(`Tiempo estimado: ${status.estimatedCompletion}`);

// Cancelar trabajo si es necesario
if (status.status === 'processing') {
    const cancelled = await sdk.batch.cancel(jobId);
    console.log('Trabajo cancelado:', cancelled.data);
}
```

#### Python
```python
# Envío de lote
batch_job = await sdk.batch.submit(
    requests=[
        {
            "prompt": "Analiza este sentimiento: [texto]",
            "model": "claude-3.5-sonnet"
        }
    ],
    callback_url="https://yourapp.com/webhook",
    priority="normal"
)

# Monitoreo
status = await sdk.batch.get_status(batch_job['data']['jobId'])
print(f"Progreso: {status.progress}%")
```

---

## 🔔 **MÓDULO WEBHOOKS**

### Configuración de Webhooks

#### JavaScript
```javascript
// Registrar webhook para notificaciones
const webhook = await sdk.webhooks.register({
    url: "https://yourapp.com/webhooks/ai-events",
    events: [
        "ai.request.completed",
        "batch.job.completed", 
        "system.alert",
        "cost.threshold.exceeded"
    ],
    secret: "your_webhook_secret_for_validation"
});

console.log(`Webhook registrado: ${webhook.data.id}`);

// Listar webhooks existentes
const webhooks = await sdk.webhooks.list();
webhooks.data.webhooks.forEach(wh => {
    console.log(`${wh.id}: ${wh.url} - Eventos: ${wh.events.join(', ')}`);
});

// Actualizar webhook
await sdk.webhooks.update(webhookId, {
    events: ["ai.request.completed", "batch.job.failed"]
});

// Eliminar webhook
await sdk.webhooks.delete(webhookId);
```

### Manejo de Eventos de Webhook

```javascript
// En tu servidor Express
app.post('/webhooks/ai-events', (req, res) => {
    const event = req.body;
    
    switch (event.event) {
        case 'ai.request.completed':
            console.log(`Request ${event.data.requestId} completado`);
            console.log(`Modelo: ${event.data.model}, Tiempo: ${event.data.responseTime}ms`);
            break;
            
        case 'batch.job.completed':
            console.log(`Trabajo por lotes ${event.data.jobId} terminado`);
            console.log(`Éxito: ${event.data.successCount}, Fallas: ${event.data.failureCount}`);
            break;
            
        case 'cost.threshold.exceeded':
            console.log('⚠️ Umbral de costo excedido!');
            console.log(`Costo actual: $${event.data.currentCost}`);
            // Implementar lógica de alerta
            break;
    }
    
    res.status(200).send('OK');
});
```

---

## 📡 **WEBSOCKET - TIEMPO REAL**

### Suscripción a Eventos

#### JavaScript
```javascript
// Suscribirse a métricas en tiempo real
sdk.subscribe('ai_metrics', (metrics) => {
    console.log(`Requests activos: ${metrics.activeRequests}`);
    console.log(`Tiempo promedio: ${metrics.averageResponseTime}ms`);
    console.log(`Costo por hora: $${metrics.costPerHour}`);
});

// Suscribirse a actualizaciones de rendimiento
sdk.subscribe('performance_update', (perf) => {
    console.log(`CPU: ${perf.cpuUsage}%, Memoria: ${perf.memoryUsage}%`);
    console.log(`Cache hit rate: ${perf.cacheHitRate}%`);
});

// Suscribirse a alertas del sistema
sdk.subscribe('system_alert', (alert) => {
    if (alert.severity === 'high') {
        console.log('🚨 ALERTA CRÍTICA:', alert.message);
        // Implementar notificación push
    }
});

// Eventos de conexión
sdk.on('connected', () => {
    console.log('✅ Conectado a WebSocket');
});

sdk.on('disconnected', () => {
    console.log('❌ Desconectado de WebSocket');
});
```

#### Python
```python
# Callback para métricas
async def on_metrics(data):
    print(f"Requests activos: {data['activeRequests']}")
    print(f"Tiempo promedio: {data['averageResponseTime']}ms")

# Callback para alertas
async def on_alert(data):
    if data['severity'] == 'high':
        print(f"🚨 ALERTA: {data['message']}")

# Suscribirse
sdk.subscribe('ai_metrics', on_metrics)
sdk.subscribe('system_alert', on_alert)
```

---

## 👤 **MÓDULO ACCOUNT**

### Información de Cuenta

#### JavaScript
```javascript
// Obtener información de la cuenta
const accountInfo = await sdk.account.getInfo();
console.log(`Tier: ${accountInfo.data.tier}`);
console.log(`Requests disponibles: ${accountInfo.data.remainingRequests}`);
console.log(`Límite de rate: ${accountInfo.data.rateLimit}`);
console.log(`Uso del mes: $${accountInfo.data.monthlyUsage}`);

// Obtener documentación de la API
const docs = await sdk.account.getDocs();
console.log('Documentación disponible:', docs.data.endpoints);
```

---

## ⚠️ **MANEJO DE ERRORES**

### JavaScript
```javascript
try {
    const result = await sdk.ai.process({
        prompt: "Test prompt",
        model: "invalid-model"
    });
} catch (error) {
    if (error instanceof AIError) {
        console.log('Error de IA:', error.message);
        console.log('Código de estado:', error.statusCode);
        console.log('Datos de respuesta:', error.responseData);
    } else if (error instanceof RateLimitError) {
        console.log('Rate limit excedido, reintentando automáticamente...');
    } else {
        console.log('Error general:', error.message);
    }
}
```

### Python
```python
from ai_multi_model_sdk import AIError, RateLimitError

try:
    result = await sdk.ai.process("Test prompt", model="invalid-model")
except AIError as e:
    print(f"Error de IA: {e}")
    print(f"Código: {e.status_code}")
except RateLimitError as e:
    print("Rate limit excedido")
except Exception as e:
    print(f"Error general: {e}")
```

---

## 🔒 **SEGURIDAD Y MEJORES PRÁCTICAS**

### Configuración de API Key

```bash
# Variables de entorno (recomendado)
export AI_API_KEY="sk_your_api_key_here"
export AI_BASE_URL="https://api.yourcompany.com"
```

```javascript
// Usar variables de entorno
const sdk = new AIMultiModelSDK({
    apiKey: process.env.AI_API_KEY,
    baseURL: process.env.AI_BASE_URL
});
```

### Validación de Webhooks

```javascript
const crypto = require('crypto');

// Validar webhook signature
function validateWebhookSignature(payload, signature, secret) {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(`sha256=${expectedSignature}`)
    );
}

app.post('/webhooks/ai-events', (req, res) => {
    const signature = req.headers['x-webhook-signature'];
    const payload = JSON.stringify(req.body);
    
    if (!validateWebhookSignature(payload, signature, webhookSecret)) {
        return res.status(401).send('Invalid signature');
    }
    
    // Procesar webhook...
    res.status(200).send('OK');
});
```

---

## 📈 **OPTIMIZACIÓN Y PERFORMANCE**

### Mejores Prácticas

#### 1. Selección Inteligente de Modelos
```javascript
// Use casos específicos para selección automática
const result = await sdk.ai.process({
    prompt: "Analizar datos financieros complejos",
    useCase: "financial_analysis", // Seleccionará el mejor modelo
    parameters: { temperature: 0.1 } // Baja temperatura para precisión
});
```

#### 2. Caching de Resultados
```javascript
const cache = new Map();

async function getCachedResult(prompt, model) {
    const cacheKey = `${model}:${crypto.createHash('md5').update(prompt).digest('hex')}`;
    
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }
    
    const result = await sdk.ai.process({ prompt, model });
    cache.set(cacheKey, result);
    
    return result;
}
```

#### 3. Procesamiento por Lotes para Volumen
```javascript
// Para muchas requests similares, usar batch
if (requests.length > 10) {
    const batchJob = await sdk.batch.submit({ requests });
    // Monitorear progreso via WebSocket
} else {
    // Procesamiento individual para requests pequeñas
    const results = await Promise.all(
        requests.map(req => sdk.ai.process(req))
    );
}
```

#### 4. Monitoreo de Costos
```javascript
// Monitorear costos en tiempo real
sdk.subscribe('cost_update', (costData) => {
    if (costData.dailyCost > DAILY_BUDGET_LIMIT) {
        console.log('🚨 Presupuesto diario excedido!');
        // Implementar lógica de parada o switching a modelos más baratos
    }
});
```

---

## 🧪 **EJEMPLOS DE CASOS DE USO**

### 1. Análisis de Sentimientos
```javascript
async function analyzeSentiment(texts) {
    const requests = texts.map(text => ({
        prompt: `Analiza el sentimiento del siguiente texto y clasifícalo como positivo, negativo o neutral. Proporciona también una puntuación del 1-10: "${text}"`,
        model: "claude-3.5-sonnet",
        parameters: { temperature: 0.1, maxTokens: 100 }
    }));
    
    if (requests.length > 5) {
        // Usar batch para múltiples textos
        const batchJob = await sdk.batch.submit({ requests });
        return batchJob;
    } else {
        // Procesamiento directo
        return await Promise.all(
            requests.map(req => sdk.ai.process(req))
        );
    }
}
```

### 2. Generación de Contenido con Consenso
```javascript
async function generateMarketingCopy(product, audience) {
    const prompt = `Genera copy de marketing para ${product} dirigido a ${audience}. El copy debe ser persuasivo, claro y llamativo.`;
    
    const consensus = await sdk.ai.consensus({
        prompt,
        models: ["gpt-4", "claude-3.5-sonnet", "gemini-2.0-flash"],
        parameters: { temperature: 0.7, maxTokens: 300 }
    });
    
    return {
        recommended: consensus.recommendedResult.data.response,
        alternatives: consensus.consensus.map(r => r.data.response),
        confidence: consensus.summary.successRate
    };
}
```

### 3. Asistente de Código
```javascript
async function codeAssistant(codeRequest) {
    const result = await sdk.ai.process({
        prompt: `Como experto programador, ${codeRequest}. Proporciona código limpio, comentado y siguiendo mejores prácticas.`,
        model: "gpt-4", // Mejor para código
        parameters: { 
            temperature: 0.2, // Baja para consistencia
            maxTokens: 2000 
        },
        useCase: "code_generation"
    });
    
    return result.data.response;
}

// Uso
const code = await codeAssistant(
    "crea una función Python que calcule el factorial de un número de forma recursiva"
);
```

### 4. Traducción Multiidioma
```javascript
async function translateText(text, targetLanguages) {
    const requests = targetLanguages.map(lang => ({
        prompt: `Traduce el siguiente texto al ${lang}, manteniendo el tono y contexto: "${text}"`,
        model: "gpt-4",
        parameters: { temperature: 0.3 }
    }));
    
    const results = await Promise.all(
        requests.map(req => sdk.ai.process(req))
    );
    
    return targetLanguages.reduce((translations, lang, index) => {
        translations[lang] = results[index].data.response;
        return translations;
    }, {});
}
```

---

## 📋 **REFERENCIA COMPLETA DE API**

### Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/v1/ai/process` | Procesar request individual |
| `POST` | `/api/v1/ai/consensus` | Procesamiento con consenso |
| `GET` | `/api/v1/ai/models` | Listar modelos disponibles |
| `GET` | `/api/v1/ai/models/{id}` | Información de modelo específico |
| `POST` | `/api/v1/ai/test` | Probar modelos |
| `GET` | `/api/v1/analytics/usage` | Métricas de uso |
| `GET` | `/api/v1/analytics/performance` | Métricas de rendimiento |
| `GET` | `/api/v1/analytics/costs` | Análisis de costos |
| `POST` | `/api/v1/batch/submit` | Enviar trabajo por lotes |
| `GET` | `/api/v1/batch/{jobId}` | Estado de trabajo por lotes |
| `DELETE` | `/api/v1/batch/{jobId}` | Cancelar trabajo por lotes |
| `POST` | `/api/v1/webhooks` | Registrar webhook |
| `GET` | `/api/v1/webhooks` | Listar webhooks |
| `PUT` | `/api/v1/webhooks/{id}` | Actualizar webhook |
| `DELETE` | `/api/v1/webhooks/{id}` | Eliminar webhook |
| `GET` | `/api/v1/account` | Información de cuenta |

### Tipos de Datos

#### AIResponse
```typescript
interface AIResponse {
    success: boolean;
    data?: {
        response: string;
        model: string;
        tokens_used: number;
        processing_time: number;
    };
    error?: string;
    cost: number;
    request_id: string;
}
```

#### ConsensusResponse
```typescript
interface ConsensusResponse {
    success: boolean;
    consensus: AIResponse[];
    summary: {
        totalModels: number;
        successfulModels: number;
        averageProcessingTime: number;
        totalCost: number;
        successRate: string;
    };
    recommendedResult: AIResponse;
}
```

---

## 🆘 **SOPORTE Y TROUBLESHOOTING**

### Problemas Comunes

#### 1. Error de Autenticación
```
Error: 401 Unauthorized - Invalid API key
```
**Solución**: Verificar que el API key sea válido y tenga el formato correcto (`sk_...`)

#### 2. Rate Limiting
```
Error: 429 Too Many Requests
```
**Solución**: El SDK maneja automáticamente el retry con backoff exponencial

#### 3. Modelo No Disponible
```
Error: Model 'xyz' not available for your tier
```
**Solución**: Verificar modelos disponibles con `sdk.ai.getModels()` o actualizar plan

#### 4. WebSocket No Conecta
```
WebSocket connection failed
```
**Solución**: Verificar URL de WebSocket y que esté habilitado en la configuración

### Debug y Logging

#### JavaScript
```javascript
// Habilitar debug completo
const sdk = new AIMultiModelSDK({
    apiKey: 'your_key',
    debug: true // Mostrará logs detallados
});

// Custom logger
sdk.on('request', (requestData) => {
    console.log('Request enviado:', requestData);
});

sdk.on('response', (responseData) => {
    console.log('Response recibido:', responseData);
});
```

#### Python
```python
import logging

# Habilitar logging detallado
logging.basicConfig(level=logging.DEBUG)

sdk = AIMultiModelSDK(
    api_key='your_key',
    debug=True
)
```

---

## 📞 **CONTACTO Y SOPORTE**

- **Documentación**: `https://docs.yourcompany.com/sdk`
- **API Reference**: `https://api.yourcompany.com/docs`
- **GitHub**: `https://github.com/yourcompany/ai-multi-model-sdk`
- **Soporte**: `support@yourcompany.com`
- **Discord**: `https://discord.gg/yourcompany`

---

## 🔄 **CHANGELOG**

### v2.0.0 (Actual)
- ✅ Soporte para 23+ modelos de IA
- ✅ Procesamiento por consenso
- ✅ WebSocket en tiempo real
- ✅ Procesamiento por lotes
- ✅ Analytics avanzados
- ✅ Sistema de webhooks
- ✅ Manejo automático de rate limiting
- ✅ SDKs para JavaScript y Python

### v1.0.0
- ✅ Funcionalidad básica de AI
- ✅ Soporte para OpenAI y Anthropic
- ✅ API REST básica

---

## 📄 **LICENCIA**

MIT License - Ver archivo `LICENSE` para detalles completos.

---

**🚀 ¡Empieza a desarrollar con el SDK más avanzado para IA Multi-Modelo!**