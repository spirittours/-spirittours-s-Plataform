# Flight Booking System

Complete flight search and booking system with GDS and LCC integrations.

## 🎯 Features

### Implemented (Phase 1)
- ✅ **Multi-GDS Integration**: Amadeus, Sabre, Galileo
- ✅ **LCC Integration Framework**: Ryanair, EasyJet, Vueling, WizzAir (structure ready)
- ✅ **Unified Search Engine**: Aggregates results from multiple suppliers
- ✅ **Flight Search**: Multi-leg, flexible dates, cabin class selection
- ✅ **PNR Management**: Create, retrieve, cancel bookings
- ✅ **Fare Rules Engine**: Refund/change policies, baggage allowances
- ✅ **REST API**: FastAPI endpoints for all operations
- ✅ **Async Operations**: High-performance async/await architecture
- ✅ **Type Safety**: Full Pydantic model validation

### Coming Soon (Phase 2-4)
- 🔜 **B2B2B Architecture**: Sub-agent hierarchy
- 🔜 **White Label Platform**: Custom branding for partners
- 🔜 **Centralised Mid-Office**: Unified booking management
- 🔜 **Advanced BI**: Data warehouse and analytics

## 📁 Architecture

```
backend/flights/
├── __init__.py              # Module initialization
├── models.py                # Data models (20+ Pydantic models)
├── booking_engine.py        # Unified booking engine
├── routes.py                # FastAPI endpoints
├── gds_amadeus.py          # Amadeus GDS connector
├── gds_sabre.py            # Sabre GDS connector
├── gds_galileo.py          # Galileo GDS connector
├── lcc_ryanair.py          # Ryanair LCC connector
├── lcc_easyjet.py          # EasyJet LCC connector
├── lcc_vueling.py          # Vueling LCC connector
├── lcc_wizzair.py          # WizzAir LCC connector
├── config.example.yaml     # Configuration template
└── README.md               # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install fastapi uvicorn httpx pydantic python-dotenv pyyaml
```

### 2. Configure Suppliers

```bash
# Copy example configuration
cp config.example.yaml config.yaml

# Edit config.yaml with your credentials
nano config.yaml
```

### 3. Initialize in Your FastAPI App

```python
from fastapi import FastAPI
from flights import flights_router, initialize_booking_engine
import yaml

app = FastAPI(title="Spirit Tours API")

# Load configuration
with open("flights/config.yaml") as f:
    config = yaml.safe_load(f)

# Initialize flight booking engine
initialize_booking_engine(config)

# Include flight routes
app.include_router(flights_router)
```

### 4. Run the Server

```bash
uvicorn main:app --reload --port 8000
```

### 5. Test the API

```bash
# Search flights
curl -X POST "http://localhost:8000/flights/search" \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "MAD",
    "destination": "BCN",
    "departure_date": "2025-11-15",
    "adults": 2,
    "cabin_class": "economy",
    "currency": "EUR"
  }'

# Check supplier status
curl "http://localhost:8000/flights/suppliers"

# Health check
curl "http://localhost:8000/flights/health"
```

## 📊 API Endpoints

### Search Operations

#### `POST /flights/search`
Search flights across multiple suppliers.

**Request:**
```json
{
  "origin": "MAD",
  "destination": "BCN",
  "departure_date": "2025-11-15",
  "return_date": "2025-11-20",
  "adults": 2,
  "children": 0,
  "infants": 0,
  "cabin_class": "economy",
  "direct_only": false,
  "max_stops": 1,
  "currency": "EUR"
}
```

**Response:**
```json
{
  "search_id": "UNIFIED-20251018120000",
  "offers": [
    {
      "offer_id": "AMD-12345",
      "supplier": "gds_amadeus",
      "price": {
        "base_fare": 150.00,
        "taxes": 35.50,
        "total": 185.50,
        "currency": "EUR"
      },
      "outbound": {
        "segments": [...],
        "total_duration_minutes": 75,
        "stops": 0
      },
      "valid_until": "2025-10-20T23:59:59",
      "seats_available": 9
    }
  ],
  "total_results": 25,
  "search_time_ms": 1250
}
```

### Booking Operations

#### `POST /flights/book`
Create flight booking.

**Request:**
```json
{
  "offer_id": "AMD-12345",
  "passengers": [
    {
      "type": "ADT",
      "title": "Mr",
      "first_name": "John",
      "last_name": "Doe",
      "date_of_birth": "1985-05-15",
      "nationality": "US",
      "email": "john.doe@example.com",
      "phone": "+1234567890"
    }
  ],
  "contact_email": "contact@example.com",
  "contact_phone": "+1234567890",
  "payment_method": "credit_card"
}
```

**Response:**
```json
{
  "booking_id": "BKG-AMD-20251018120000",
  "pnr": {
    "pnr_number": "ABC123",
    "supplier": "gds_amadeus",
    "status": "confirmed",
    "itinerary": {...},
    "passengers": [...],
    "price": {...}
  },
  "success": true,
  "message": "Booking created successfully"
}
```

#### `GET /flights/bookings/{pnr_number}`
Retrieve booking details.

**Parameters:**
- `pnr_number`: PNR/booking reference
- `supplier`: Supplier type (query parameter)

#### `DELETE /flights/bookings/{pnr_number}`
Cancel booking.

**Parameters:**
- `pnr_number`: PNR/booking reference
- `supplier`: Supplier type (query parameter)

### Utility Operations

#### `GET /flights/suppliers`
Get available suppliers and their status.

#### `GET /flights/health`
Health check endpoint.

## 🔌 GDS Integration

### Amadeus

**Authentication:** OAuth2 Client Credentials
**Endpoints:** REST API
**Documentation:** https://developers.amadeus.com/

**Features:**
- ✅ Flight search (multi-city, flexible dates)
- ✅ Flight booking with PNR creation
- ✅ Fare rules and baggage info
- ✅ Seat selection
- ✅ Booking modification and cancellation

### Sabre

**Authentication:** OAuth2 with Base64 encoded credentials
**Endpoints:** REST API
**Documentation:** https://developer.sabre.com/

**Features:**
- ✅ Flight availability search
- ✅ PNR creation and management
- ✅ Fare rules and penalties
- ✅ Booking cancellation

### Galileo (Travelport)

**Authentication:** HTTP Basic Auth
**Endpoints:** SOAP/XML API
**Documentation:** https://support.travelport.com/

**Features:**
- ✅ Flight search via Universal API
- ✅ PNR creation
- ✅ Booking retrieval and cancellation
- ✅ Multi-segment itineraries

## 🛩️ LCC Integration

### Current Status

All LCC connectors are **structural templates** ready for implementation. 

**Why templates?**
- Most LCCs don't provide public APIs
- Require official partnership agreements
- Direct web scraping is not recommended (legal/technical issues)

### Recommended Approach

#### Option 1: Use Aggregator APIs (Recommended) ⭐

**Duffel** (Best option)
- Official partnerships with 40+ LCCs including Ryanair, EasyJet
- REST API, modern architecture
- Includes GDS access too
- https://duffel.com/

**Kiwi.com Tequila API**
- Access to 200+ LCCs
- Comprehensive search and booking
- https://tequila.kiwi.com/

**Travelfusion**
- Enterprise-grade LCC aggregator
- Strong European coverage
- https://www.travelfusion.com/

#### Option 2: Direct Partnerships

Contact LCC B2B teams:
- Ryanair: b2b@ryanair.com
- EasyJet: partnerservices@easyjet.com
- Vueling: partners@vueling.com
- WizzAir: b2b@wizzair.com

Requires:
- Business partnership agreement
- API access credentials
- Technical integration

## 💾 Data Models

### Core Models

```python
# Flight search
FlightSearchRequest
FlightSearchResponse
FlightOffer

# Booking
FlightBookingRequest
FlightBookingResponse
PNR (Passenger Name Record)

# Components
FlightSegment
FlightItinerary
Passenger
Airport
Airline
Price
FareRules
```

### Enums

```python
CabinClass: ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST
FlightStatus: PENDING, CONFIRMED, TICKETED, CANCELLED, REFUNDED
SupplierType: GDS_AMADEUS, GDS_SABRE, GDS_GALILEO, LCC_*
```

## 🔒 Security

### API Credentials
- Store credentials in environment variables or secure vaults
- Never commit credentials to version control
- Use different credentials for test/production environments

### Authentication
- Implement API authentication for your endpoints
- Use JWT tokens or OAuth2 for client authentication
- Rate limiting per client/user

### PCI Compliance
- Never store credit card details
- Use payment gateway tokenization
- Implement 3D Secure for card payments

## 📈 Performance

### Async Architecture
- All API calls use async/await
- Concurrent supplier searches
- Non-blocking I/O operations

### Optimization Strategies
- Redis caching for search results (5-minute TTL)
- Database connection pooling
- Request timeout management (15s default)
- Retry logic with exponential backoff

### Scaling
- Horizontal scaling: Deploy multiple instances
- Load balancing: Use Nginx/Traefik
- Database: PostgreSQL with read replicas
- Cache: Redis Cluster for high availability

## 🧪 Testing

### Unit Tests

```bash
pytest backend/flights/tests/
```

### Integration Tests

```bash
# Test with real GDS APIs (test environment)
pytest backend/flights/tests/integration/
```

### Load Tests

```bash
# Locust load testing
locust -f backend/flights/tests/load_test.py
```

## 📝 Development Roadmap

### Phase 1: GDS/LCC Integration ✅ (Current)
- [x] Amadeus GDS connector
- [x] Sabre GDS connector
- [x] Galileo GDS connector
- [x] LCC connector structure
- [x] Unified booking engine
- [x] FastAPI endpoints
- [x] Data models and validation

### Phase 2: B2B2B Architecture (Next)
- [ ] Sub-agent hierarchy system
- [ ] White label platform
- [ ] Multi-tenant support
- [ ] Commission management
- [ ] Redistribution API

### Phase 3: Centralised Mid-Office
- [ ] Unified booking dashboard
- [ ] Financial management
- [ ] Accounting system integrations
- [ ] Reconciliation engine

### Phase 4: Advanced Features
- [ ] AI-powered search optimization
- [ ] Dynamic pricing engine
- [ ] Cross-sell automation
- [ ] Advanced BI and analytics

## 🤝 Contributing

1. Follow the established code structure
2. Add tests for new features
3. Update documentation
4. Use type hints and Pydantic models
5. Follow async/await patterns

## 📄 License

Copyright (c) 2025 Spirit Tours. All rights reserved.

## 🆘 Support

- **Documentation**: See inline code comments and docstrings
- **Issues**: Report bugs or request features via GitHub issues
- **Email**: tech@spirit-tours.com

## 🎉 Acknowledgments

- **GDS Providers**: Amadeus, Sabre, Travelport
- **LCC Airlines**: Ryanair, EasyJet, Vueling, WizzAir
- **Frameworks**: FastAPI, Pydantic, httpx
