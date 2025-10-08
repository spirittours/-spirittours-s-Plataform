# 🌐 B2B2C GDS Integration Guide - Spirit Tours Platform
## Guía de Integración GDS para Agencias de Viajes

### 🎯 Overview / Resumen
The Spirit Tours Platform now includes a complete B2B2C (Business-to-Business-to-Consumer) GDS integration hub that allows travel agencies to resell our services with their own branding.

La Plataforma Spirit Tours ahora incluye un hub completo de integración GDS B2B2C que permite a las agencias de viajes revender nuestros servicios con su propia marca.

---

## 🔌 Integrated GDS Providers / Proveedores GDS Integrados

### 1. **Travelport (Galileo/Worldspan)**
- **Protocol**: SOAP/XML
- **Products**: Flights, Hotels, Cars
- **Coverage**: Global
- **Real-time**: ✅

### 2. **Amadeus**
- **Protocol**: REST API
- **Products**: Flights, Hotels, Activities
- **Coverage**: Global (stronger in Europe)
- **Real-time**: ✅

### 3. **Hotelbeds**
- **Protocol**: REST API
- **Products**: Hotels, Transfers, Activities
- **Inventory**: 180,000+ hotels
- **Real-time**: ✅

### 4. **TravelBoutiqueOnline (TBO)**
- **Protocol**: REST API
- **Products**: Hotels, Holidays
- **Coverage**: Asia, Middle East focus
- **Real-time**: ✅

---

## 💻 Technical Implementation / Implementación Técnica

### Core Architecture
```python
# Location: /backend/gds_integration/multi_gds_hub.py

class MultiGDSOrchestrator:
    """
    Unified orchestrator for all GDS providers
    Orquestador unificado para todos los proveedores GDS
    """
    
    async def search_all(
        self,
        request: SearchRequest,
        providers: Optional[List[GDSProvider]] = None
    ) -> List[SearchResult]:
        """
        Search across multiple GDS providers simultaneously
        Búsqueda simultánea en múltiples proveedores GDS
        """
        
    async def book_unified(
        self,
        provider: GDSProvider,
        item_id: str,
        passenger_info: Dict,
        agency_id: Optional[str] = None
    ) -> BookingResult:
        """
        Unified booking with agency commission handling
        Reserva unificada con manejo de comisiones de agencia
        """
```

---

## 🏢 Agency Features / Funciones para Agencias

### 1. **White-Label Solution / Solución Marca Blanca**
```python
# Customization options for agencies
agency_config = {
    "agency_id": "AGN12345",
    "brand_name": "Your Travel Agency",
    "logo_url": "https://youragency.com/logo.png",
    "primary_color": "#003366",
    "commission_rate": 0.10,  # 10% commission
    "currency": "USD",
    "language": "es"
}
```

### 2. **Commission Management / Gestión de Comisiones**
- Automatic calculation / Cálculo automático
- Flexible rates by product / Tarifas flexibles por producto
- Real-time reporting / Reportes en tiempo real
- Monthly settlements / Liquidaciones mensuales

### 3. **Multi-Tenant Architecture**
- Isolated data per agency / Datos aislados por agencia
- Custom endpoints / Endpoints personalizados
- Independent scaling / Escalado independiente
- Dedicated dashboards / Dashboards dedicados

---

## 🔄 API Workflow / Flujo de Trabajo API

### Step 1: Authentication / Autenticación
```http
POST /api/v1/agency/auth
Content-Type: application/json

{
  "agency_id": "AGN12345",
  "api_key": "your-api-key",
  "secret": "your-secret"
}
```

### Step 2: Search / Búsqueda
```http
POST /api/v1/gds/search
Authorization: Bearer {token}

{
  "type": "flight",
  "origin": "MAD",
  "destination": "JFK",
  "departure_date": "2024-06-15",
  "return_date": "2024-06-22",
  "passengers": {
    "adults": 2,
    "children": 1
  },
  "providers": ["amadeus", "travelport"]
}
```

### Step 3: Book / Reservar
```http
POST /api/v1/gds/book
Authorization: Bearer {token}

{
  "provider": "amadeus",
  "offer_id": "OFF123456",
  "passengers": [...],
  "agency_commission": true,
  "payment_method": "agency_credit"
}
```

---

## 📊 Response Examples / Ejemplos de Respuesta

### Search Response
```json
{
  "results": [
    {
      "provider": "amadeus",
      "type": "flight",
      "offer_id": "OFF123456",
      "price": {
        "base": 450.00,
        "taxes": 125.00,
        "total": 575.00,
        "agency_commission": 57.50,
        "currency": "USD"
      },
      "segments": [...],
      "availability": true
    }
  ],
  "meta": {
    "total_results": 125,
    "search_time_ms": 1250,
    "providers_searched": ["amadeus", "travelport"]
  }
}
```

### Booking Confirmation
```json
{
  "booking_id": "BK20240108123456",
  "pnr": "ABC123",
  "provider": "amadeus",
  "status": "confirmed",
  "total_amount": 575.00,
  "commission": {
    "rate": 0.10,
    "amount": 57.50,
    "settlement_date": "2024-02-01"
  },
  "tickets": [...],
  "confirmation_url": "https://spirittours.com/booking/BK20240108123456"
}
```

---

## 🚀 Quick Start for Agencies / Inicio Rápido para Agencias

### 1. Register as Partner / Registrarse como Socio
```bash
curl -X POST https://api.spirittours.com/v1/agency/register \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Your Travel Agency",
    "contact_email": "contact@youragency.com",
    "country": "ES",
    "preferred_gds": ["amadeus", "hotelbeds"]
  }'
```

### 2. Get API Credentials / Obtener Credenciales API
- Agency ID / ID de Agencia
- API Key / Clave API
- Secret Key / Clave Secreta
- Webhook URL (optional)

### 3. Configure Webhook (Optional)
```http
POST /api/v1/agency/webhook
{
  "url": "https://youragency.com/webhook",
  "events": ["booking.confirmed", "booking.cancelled", "payment.received"]
}
```

### 4. Test in Sandbox / Probar en Sandbox
- Sandbox URL: `https://sandbox.spirittours.com/api/v1/`
- Test credentials provided / Credenciales de prueba proporcionadas
- No real bookings / Sin reservas reales

### 5. Go Live / Puesta en Producción
- Production URL: `https://api.spirittours.com/v1/`
- Real-time inventory / Inventario en tiempo real
- Live bookings / Reservas en vivo

---

## 💰 Commission Structure / Estructura de Comisiones

| Product Type | Base Commission | Volume Bonus | Total Possible |
|--------------|----------------|--------------|----------------|
| Flights | 8% | +2% | 10% |
| Hotels | 10% | +5% | 15% |
| Packages | 12% | +3% | 15% |
| Activities | 15% | +5% | 20% |
| Insurance | 20% | +10% | 30% |

### Volume Tiers / Niveles de Volumen
- **Bronze**: < $50K/month → Base commission
- **Silver**: $50K-200K/month → +2% bonus
- **Gold**: $200K-500K/month → +3% bonus
- **Platinum**: > $500K/month → +5% bonus

---

## 🔧 Integration Support / Soporte de Integración

### Documentation / Documentación
- API Docs: https://docs.spirittours.com/gds
- Postman Collection: Available / Disponible
- SDKs: Python, Node.js, PHP, Java

### Technical Support / Soporte Técnico
- Email: gds-support@spirittours.com
- Slack: #gds-integration channel
- Response time: < 2 hours (business days)

### Testing Tools / Herramientas de Prueba
- Sandbox environment / Entorno sandbox
- Mock data generator / Generador de datos mock
- Performance testing suite / Suite de pruebas de rendimiento

---

## 📈 Performance Metrics / Métricas de Rendimiento

### System Capabilities / Capacidades del Sistema
- **Search Speed**: < 1.5 seconds for multi-GDS search
- **Booking Speed**: < 3 seconds confirmation
- **Availability**: 99.99% uptime SLA
- **Concurrent Searches**: 10,000+
- **Daily Bookings**: 1M+ capacity

### Cache Strategy / Estrategia de Caché
- Flight availability: 5 minutes
- Hotel rates: 15 minutes
- Static content: 1 hour
- Agency settings: 24 hours

---

## 🔒 Security / Seguridad

### Authentication Methods / Métodos de Autenticación
- OAuth 2.0
- API Key + Secret
- JWT tokens (1 hour expiry)
- IP whitelisting (optional)

### Data Protection / Protección de Datos
- TLS 1.3 encryption
- PCI DSS compliance
- GDPR compliance
- Data isolation per agency

### Rate Limiting / Límite de Solicitudes
- **Search**: 100 requests/minute
- **Booking**: 20 requests/minute
- **Management**: 50 requests/minute
- Custom limits for enterprise partners

---

## 🎯 Best Practices / Mejores Prácticas

### 1. **Implement Caching**
```python
# Cache search results to improve performance
cache_key = f"search_{origin}_{destination}_{date}"
cached_result = redis.get(cache_key)
if not cached_result:
    result = await gds.search(...)
    redis.setex(cache_key, 300, result)  # 5 min cache
```

### 2. **Handle Errors Gracefully**
```python
try:
    booking = await gds.book(...)
except GDSTimeoutError:
    # Retry with exponential backoff
    await retry_with_backoff(gds.book, ...)
except GDSRateLimitError:
    # Wait and retry
    await asyncio.sleep(60)
```

### 3. **Monitor Performance**
- Track search times
- Monitor booking success rates
- Alert on errors > threshold
- Daily reconciliation reports

---

## 📞 Contact / Contacto

### Business Development / Desarrollo de Negocios
- Email: partnerships@spirittours.com
- Phone: +1-800-SPIRIT-1

### Technical Integration / Integración Técnica
- Email: gds-tech@spirittours.com
- Slack: spirittours-b2b.slack.com

### Account Management / Gestión de Cuentas
- Dedicated account manager for Gold+ partners
- Monthly business reviews
- Quarterly roadmap updates

---

*Last Updated: January 8, 2024*
*Version: 1.0.0*
*Status: Production Ready*

**🚀 Start Integration Today! / ¡Comience la Integración Hoy!**