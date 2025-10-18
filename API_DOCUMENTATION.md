# B2B2B Platform - API Documentation

## Overview

The B2B2B Platform provides a comprehensive RESTful API for managing travel bookings, accounting, analytics, and B2B2B operations.

**Base URL:** `https://api.b2b2b-platform.com/v1`  
**Documentation:** `https://api.b2b2b-platform.com/docs`  
**Version:** 1.0.0

## Authentication

All API requests require authentication using JWT tokens.

### Obtain Token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Using Token

Include the token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Core Endpoints

### 1. Flights

#### Search Flights

```http
GET /api/v1/flights/search?origin=MAD&destination=BCN&date=2024-12-01&passengers=2
```

**Parameters:**
- `origin` (required): IATA code of origin airport
- `destination` (required): IATA code of destination airport
- `date` (required): Departure date (YYYY-MM-DD)
- `passengers` (optional): Number of passengers (default: 1)
- `cabin_class` (optional): economy, business, first

**Response:**
```json
{
  "flights": [
    {
      "id": "FL123456",
      "origin": "MAD",
      "destination": "BCN",
      "departure_time": "2024-12-01T10:00:00Z",
      "arrival_time": "2024-12-01T11:15:00Z",
      "airline": "Iberia",
      "flight_number": "IB3201",
      "price": 89.99,
      "currency": "EUR",
      "available_seats": 45
    }
  ],
  "total": 1
}
```

#### Book Flight

```http
POST /api/v1/flights/book
Content-Type: application/json

{
  "flight_id": "FL123456",
  "passengers": [
    {
      "first_name": "Juan",
      "last_name": "García",
      "dni": "12345678A",
      "date_of_birth": "1990-01-15"
    }
  ],
  "payment_method": "card"
}
```

### 2. Hotels

#### Search Hotels

```http
GET /api/v1/hotels/search?city=Barcelona&checkin=2024-12-01&checkout=2024-12-05&guests=2
```

**Parameters:**
- `city` (required): City name
- `checkin` (required): Check-in date
- `checkout` (required): Check-out date
- `guests` (optional): Number of guests
- `stars` (optional): Hotel rating (1-5)

### 3. Bookings

#### Get All Bookings

```http
GET /api/v1/bookings?page=1&limit=20&status=confirmed
```

**Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `status`: Filter by status (pending, confirmed, cancelled)
- `from_date`: Start date filter
- `to_date`: End date filter

#### Get Booking Details

```http
GET /api/v1/bookings/{booking_id}
```

**Response:**
```json
{
  "id": "BK789012",
  "customer": {
    "id": "CUST001",
    "name": "María López",
    "email": "maria@example.com"
  },
  "product_type": "flight",
  "status": "confirmed",
  "amount": 89.99,
  "currency": "EUR",
  "created_at": "2024-11-15T10:30:00Z",
  "travel_date": "2024-12-01"
}
```

#### Cancel Booking

```http
POST /api/v1/bookings/{booking_id}/cancel
Content-Type: application/json

{
  "reason": "Customer request",
  "refund": true
}
```

### 4. Accounting

#### Create Invoice

```http
POST /api/v1/accounting/invoices
Content-Type: application/json

{
  "booking_id": "BK789012",
  "customer_id": "CUST001",
  "items": [
    {
      "description": "Flight MAD-BCN",
      "quantity": 1,
      "unit_price": 89.99,
      "tax_rate": 21
    }
  ]
}
```

**Response:**
```json
{
  "invoice_number": "INV-2024-001234",
  "date": "2024-11-15",
  "subtotal": 89.99,
  "tax": 18.90,
  "total": 108.89,
  "currency": "EUR",
  "status": "issued",
  "pdf_url": "https://api.b2b2b-platform.com/invoices/INV-2024-001234.pdf"
}
```

#### Get Invoice PDF

```http
GET /api/v1/accounting/invoices/{invoice_number}/pdf
```

Returns a PDF file with the invoice.

#### Generate Modelo 303 (Spanish VAT Report)

```http
POST /api/v1/accounting/reports/modelo-303
Content-Type: application/json

{
  "quarter": 4,
  "year": 2024
}
```

### 5. B2B2B (Agents & Resellers)

#### Register Agent

```http
POST /api/v1/agents/register
Content-Type: application/json

{
  "company_name": "Travel Agency SL",
  "cif": "B12345678",
  "contact_name": "Pedro Martínez",
  "email": "pedro@travelagency.com",
  "phone": "+34600123456"
}
```

#### Get Commission Report

```http
GET /api/v1/agents/commissions?from_date=2024-11-01&to_date=2024-11-30
```

**Response:**
```json
{
  "period": {
    "from": "2024-11-01",
    "to": "2024-11-30"
  },
  "agent": {
    "id": "AG001",
    "tier": "Gold",
    "commission_rate": 5.0
  },
  "summary": {
    "total_bookings": 45,
    "total_sales": 15234.50,
    "total_commission": 761.73,
    "currency": "EUR"
  },
  "by_product": {
    "flights": {
      "bookings": 30,
      "sales": 8500.00,
      "commission": 170.00
    },
    "hotels": {
      "bookings": 15,
      "sales": 6734.50,
      "commission": 591.73
    }
  }
}
```

### 6. Analytics

#### Get Dashboard Metrics

```http
GET /api/v1/analytics/dashboard?period=last_30_days
```

**Response:**
```json
{
  "revenue": {
    "total": 125000.50,
    "currency": "EUR",
    "change_percent": 15.3
  },
  "bookings": {
    "total": 456,
    "change_percent": 8.7
  },
  "conversion_rate": {
    "value": 3.2,
    "change_percent": -0.5
  },
  "top_products": [
    {
      "product_type": "flights",
      "bookings": 280,
      "revenue": 85000.00
    }
  ]
}
```

#### Get Custom Report

```http
POST /api/v1/analytics/reports/custom
Content-Type: application/json

{
  "metrics": ["revenue", "bookings", "customers"],
  "dimensions": ["product_type", "date"],
  "filters": {
    "date_range": {
      "from": "2024-11-01",
      "to": "2024-11-30"
    }
  },
  "group_by": "date"
}
```

### 7. AI Recommendations

#### Get Personalized Recommendations

```http
GET /api/v1/recommendations/customer/{customer_id}?limit=10
```

**Response:**
```json
{
  "customer_id": "CUST001",
  "segment": "Family",
  "recommendations": [
    {
      "product_id": "PKG456",
      "product_type": "package",
      "title": "Barcelona Family Package",
      "description": "3 nights hotel + attractions",
      "price": 599.00,
      "confidence_score": 0.92,
      "reasons": [
        "Previous family bookings",
        "High rating from similar customers",
        "Price match with your budget"
      ]
    }
  ]
}
```

## Webhooks

Subscribe to real-time events:

### Available Events

- `booking.created`
- `booking.confirmed`
- `booking.cancelled`
- `payment.completed`
- `payment.failed`
- `invoice.issued`

### Register Webhook

```http
POST /api/v1/webhooks
Content-Type: application/json

{
  "url": "https://your-domain.com/webhook-receiver",
  "events": ["booking.confirmed", "payment.completed"],
  "secret": "your-webhook-secret"
}
```

### Webhook Payload Example

```json
{
  "event": "booking.confirmed",
  "timestamp": "2024-11-15T10:30:00Z",
  "data": {
    "booking_id": "BK789012",
    "status": "confirmed",
    "amount": 89.99,
    "currency": "EUR"
  }
}
```

## Rate Limiting

- **Default:** 60 requests per minute per IP
- **Authenticated:** 120 requests per minute per user
- **Burst:** Up to 10 additional requests

Rate limit headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1637000000
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "The 'date' parameter must be in YYYY-MM-DD format",
    "field": "date"
  }
}
```

### Common Error Codes

- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `429` - Too Many Requests
- `500` - Internal Server Error

## Pagination

List endpoints support pagination:

```http
GET /api/v1/bookings?page=2&limit=50
```

Response includes pagination metadata:

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 500,
    "pages": 10
  }
}
```

## Filtering and Sorting

```http
GET /api/v1/bookings?status=confirmed&sort=-created_at&search=Barcelona
```

- `sort`: Field to sort by (prefix with `-` for descending)
- `search`: Full-text search
- Custom filters by field name

## Changelog

### Version 1.0.0 (2024-11-15)
- Initial API release
- Complete CRUD operations for all resources
- AI recommendations engine
- Advanced analytics
- B2B2B commission system

## Support

- **Documentation:** https://docs.b2b2b-platform.com
- **Support Email:** api-support@b2b2b-platform.com
- **Status Page:** https://status.b2b2b-platform.com
