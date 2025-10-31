# B2B2B Platform - System Architecture

## Table of Contents

1. [Overview](#overview)
2. [System Components](#system-components)
3. [Architecture Patterns](#architecture-patterns)
4. [Data Flow](#data-flow)
5. [Database Schema](#database-schema)
6. [Security Architecture](#security-architecture)
7. [Scalability & Performance](#scalability--performance)
8. [Technology Stack](#technology-stack)

## Overview

The B2B2B Platform is a comprehensive travel management system built with a microservices-ready architecture, designed for high availability, scalability, and performance.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Clients                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Web    │  │  Mobile  │  │   PWA    │  │    API   │   │
│  │  (React) │  │  (RN)    │  │          │  │  Clients │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                          │
        ┌─────────────────▼─────────────────┐
        │      Nginx Reverse Proxy          │
        │  - Load Balancing                 │
        │  - SSL Termination                │
        │  - Rate Limiting                  │
        └─────────────────┬─────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                    │
┌───────▼────────┐               ┌──────────▼─────────┐
│   Frontend     │               │    Backend API     │
│   (React)      │               │   (FastAPI)        │
│                │               │                    │
│ - Static Files │               │ - REST API         │
│ - Service      │               │ - Business Logic   │
│   Worker       │               │ - Authentication   │
└────────────────┘               └──────────┬─────────┘
                                            │
                  ┌─────────────────────────┼─────────────────────────┐
                  │                         │                         │
         ┌────────▼────────┐       ┌───────▼────────┐      ┌────────▼────────┐
         │   PostgreSQL    │       │     Redis      │      │     Celery      │
         │                 │       │                │      │                 │
         │ - Main Database │       │ - Cache        │      │ - Background    │
         │ - ACID          │       │ - Session      │      │   Tasks         │
         │ - Relational    │       │ - Rate Limit   │      │ - Async Jobs    │
         └─────────────────┘       └────────────────┘      └─────────────────┘
```

## System Components

### 1. Frontend Layer

#### Web Application (React)
- **Purpose:** Main user interface
- **Technology:** React 18, TypeScript
- **Features:**
  - Server-side rendering (SSR)
  - Code splitting
  - Progressive Web App (PWA)
  - Responsive design
  - Internationalization (i18n)

#### Mobile Application (React Native)
- **Purpose:** Native mobile experience
- **Technology:** React Native 0.72.6
- **Features:**
  - Cross-platform (iOS/Android)
  - Offline-first architecture
  - Push notifications
  - Biometric authentication
  - Deep linking

### 2. API Layer

#### Backend API (FastAPI)
- **Purpose:** Core business logic and data management
- **Technology:** Python 3.11, FastAPI
- **Components:**
  - **Authentication Service:** JWT-based auth
  - **Booking Service:** Flight/hotel bookings
  - **Payment Service:** Payment processing
  - **Accounting Service:** Invoice generation
  - **Analytics Service:** Business intelligence
  - **B2B2B Service:** Agent/reseller management
  - **AI Service:** Recommendations engine

### 3. Data Layer

#### PostgreSQL Database
- **Purpose:** Primary data store
- **Schema Design:** Normalized relational model
- **Key Tables:**
  - Users, Customers
  - Bookings, Payments
  - Invoices, Transactions
  - Products (Flights, Hotels)
  - Agents, Commissions
  - Analytics Facts

#### Redis Cache
- **Purpose:** Caching and session management
- **Use Cases:**
  - API response caching
  - Session storage
  - Rate limiting counters
  - Real-time data
  - Queue management

### 4. Background Processing

#### Celery Workers
- **Purpose:** Asynchronous task execution
- **Tasks:**
  - Email notifications
  - Report generation
  - Data synchronization
  - Batch processing
  - Scheduled jobs

#### Celery Beat
- **Purpose:** Task scheduling
- **Scheduled Tasks:**
  - Daily reports
  - Cache warmup
  - Data cleanup
  - Metrics aggregation

### 5. Infrastructure Layer

#### Nginx
- **Purpose:** Reverse proxy and load balancer
- **Features:**
  - SSL/TLS termination
  - Rate limiting
  - Request buffering
  - Static file serving
  - Load balancing

#### Monitoring Stack
- **Prometheus:** Metrics collection
- **Grafana:** Visualization
- **AlertManager:** Alert routing

## Architecture Patterns

### 1. Clean Architecture

```
┌────────────────────────────────────────┐
│         Presentation Layer             │
│  (Controllers, API Endpoints)          │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│         Application Layer              │
│  (Use Cases, Business Logic)           │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│         Domain Layer                   │
│  (Entities, Domain Logic)              │
└────────────────┬───────────────────────┘
                 │
┌────────────────▼───────────────────────┐
│         Infrastructure Layer           │
│  (Database, External APIs, Cache)      │
└────────────────────────────────────────┘
```

### 2. Dependency Injection

- Services are singletons accessed via factory functions
- Database connections injected into services
- Easy testing with mock dependencies

### 3. Repository Pattern

```python
class BookingRepository:
    def get_by_id(booking_id: str) -> Booking
    def save(booking: Booking) -> None
    def delete(booking_id: str) -> None
    def find_all(filters: Dict) -> List[Booking]
```

### 4. Service Layer Pattern

```python
class BookingService:
    def __init__(self, repo: BookingRepository):
        self.repo = repo
    
    async def create_booking(data: BookingCreate) -> Booking:
        # Business logic
        booking = self.repo.save(data)
        return booking
```

## Data Flow

### 1. Typical Request Flow

```
1. Client Request
   ↓
2. Nginx (SSL, Rate Limit)
   ↓
3. Backend API (FastAPI)
   ↓
4. Middleware (Auth, Logging)
   ↓
5. Router (Endpoint)
   ↓
6. Service Layer (Business Logic)
   ↓
7. Cache Check (Redis)
   ├─ Hit → Return
   └─ Miss ↓
8. Database Query (PostgreSQL)
   ↓
9. Cache Write (Redis)
   ↓
10. Response Transformation
   ↓
11. Client Response
```

### 2. Background Task Flow

```
1. API Request
   ↓
2. Create Celery Task
   ↓
3. Return Immediate Response
   ↓
4. Celery Worker Picks Task
   ↓
5. Execute Task
   ↓
6. Update Database
   ↓
7. Send Notification
```

### 3. Analytics Flow

```
1. Event Occurs (Booking, Payment, etc.)
   ↓
2. Write to Transactional Tables
   ↓
3. Async Processing (Celery)
   ↓
4. Write to Analytics Tables
   ↓
5. Materialized View Refresh
   ↓
6. Metrics Available in Dashboard
```

## Database Schema

### Core Tables

#### Users & Authentication
```sql
users
├─ id (UUID, PK)
├─ email (VARCHAR, UNIQUE)
├─ password_hash (VARCHAR)
├─ role (ENUM: admin, agent, customer)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)
```

#### Bookings
```sql
bookings
├─ id (UUID, PK)
├─ customer_id (UUID, FK → customers)
├─ product_type (ENUM: flight, hotel, package)
├─ product_id (VARCHAR)
├─ status (ENUM: pending, confirmed, cancelled)
├─ amount (DECIMAL)
├─ currency (VARCHAR)
├─ travel_date (DATE)
├─ created_at (TIMESTAMP)
└─ updated_at (TIMESTAMP)
```

#### Invoices
```sql
invoices
├─ id (UUID, PK)
├─ invoice_number (VARCHAR, UNIQUE)
├─ booking_id (UUID, FK → bookings)
├─ customer_id (UUID, FK → customers)
├─ subtotal (DECIMAL)
├─ tax (DECIMAL)
├─ total (DECIMAL)
├─ status (ENUM: draft, issued, paid, cancelled)
├─ issue_date (DATE)
├─ due_date (DATE)
└─ created_at (TIMESTAMP)
```

#### Agents & Commissions
```sql
agents
├─ id (UUID, PK)
├─ company_name (VARCHAR)
├─ cif (VARCHAR, UNIQUE)
├─ tier (ENUM: Bronze, Silver, Gold, Platinum)
├─ commission_rate (DECIMAL)
└─ created_at (TIMESTAMP)

commissions
├─ id (UUID, PK)
├─ agent_id (UUID, FK → agents)
├─ booking_id (UUID, FK → bookings)
├─ amount (DECIMAL)
├─ rate (DECIMAL)
├─ status (ENUM: pending, paid)
└─ created_at (TIMESTAMP)
```

### Analytics Schema

#### Fact Tables
```sql
fact_bookings
├─ booking_id (UUID, FK)
├─ date_id (INT, FK → dim_date)
├─ customer_id (UUID, FK → dim_customer)
├─ product_id (INT, FK → dim_product)
├─ agent_id (UUID, FK → dim_agent)
├─ amount (DECIMAL)
├─ commission (DECIMAL)
└─ created_at (TIMESTAMP)
```

#### Dimension Tables
```sql
dim_date
├─ date_id (INT, PK)
├─ full_date (DATE)
├─ year (INT)
├─ quarter (INT)
├─ month (INT)
├─ day (INT)
└─ day_of_week (INT)

dim_customer
├─ customer_id (UUID, PK)
├─ segment (VARCHAR)
├─ country (VARCHAR)
└─ registration_date (DATE)

dim_product
├─ product_id (INT, PK)
├─ product_type (VARCHAR)
├─ category (VARCHAR)
└─ provider (VARCHAR)
```

## Security Architecture

### 1. Authentication & Authorization

```
┌─────────────────────────────────────┐
│    Client Login Request             │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│  1. Validate Credentials            │
│  2. Check Password Hash (bcrypt)    │
│  3. Generate JWT Token              │
│  4. Set Secure Cookie               │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│  Subsequent Requests                │
│  - Bearer Token in Header           │
│  - Verify Signature                 │
│  - Check Expiration                 │
│  - Extract User Claims              │
└─────────────────────────────────────┘
```

### 2. Data Protection

- **At Rest:**
  - Database encryption (AES-256)
  - Field-level encryption for PII
  - Encrypted backups

- **In Transit:**
  - TLS 1.3 for all connections
  - Certificate pinning in mobile apps
  - Encrypted WebSocket connections

### 3. Security Layers

1. **Network Layer:**
   - Firewall rules
   - DDoS protection
   - Rate limiting

2. **Application Layer:**
   - Input validation
   - SQL injection prevention
   - XSS protection
   - CSRF tokens

3. **Data Layer:**
   - Encryption at rest
   - Access control
   - Audit logging

## Scalability & Performance

### 1. Horizontal Scaling

```
Load Balancer
    ├─ Backend Instance 1
    ├─ Backend Instance 2
    ├─ Backend Instance 3
    └─ Backend Instance N
```

- Auto-scaling based on CPU/Memory
- Kubernetes HPA (3-10 replicas)
- Stateless application design

### 2. Caching Strategy

**Multi-Level Caching:**

```
Request
  ↓
Browser Cache (Service Worker)
  ↓
CDN Cache (CloudFlare)
  ↓
Redis Cache
  ↓
Database
```

### 3. Database Optimization

- **Read Replicas:** For analytics queries
- **Connection Pooling:** 10-50 connections
- **Indexes:** On frequently queried columns
- **Materialized Views:** For complex analytics
- **Partitioning:** By date for large tables

### 4. Performance Metrics

- **API Response Time:** < 200ms (p95)
- **Database Query Time:** < 50ms (p95)
- **Cache Hit Rate:** > 85%
- **Availability:** 99.9% uptime SLA

## Technology Stack

### Backend
- **Language:** Python 3.11
- **Framework:** FastAPI 0.104
- **ORM:** SQLAlchemy 2.0
- **Migrations:** Alembic
- **Validation:** Pydantic
- **Authentication:** PyJWT, bcrypt
- **Testing:** pytest, pytest-asyncio

### Frontend
- **Language:** TypeScript
- **Framework:** React 18
- **State:** Redux Toolkit
- **Routing:** React Router
- **UI:** Material-UI
- **Build:** Vite

### Mobile
- **Framework:** React Native 0.72.6
- **Navigation:** React Navigation
- **Storage:** MMKV
- **State:** Redux Toolkit

### Data
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **Queue:** Celery + Redis

### Infrastructure
- **Containers:** Docker
- **Orchestration:** Kubernetes
- **CI/CD:** GitHub Actions
- **Monitoring:** Prometheus + Grafana
- **Logging:** ELK Stack
- **CDN:** CloudFlare

### Development
- **Version Control:** Git
- **Code Quality:** Black, Flake8, ESLint
- **Type Checking:** mypy, TypeScript
- **Documentation:** OpenAPI/Swagger

## Deployment Architecture

### Production Environment

```
┌────────────────────────────────────────┐
│         CloudFlare CDN                 │
└────────────┬───────────────────────────┘
             │
┌────────────▼───────────────────────────┐
│    Kubernetes Cluster (EKS/GKE)        │
│  ┌──────────────────────────────────┐  │
│  │  Ingress (Nginx)                 │  │
│  └────────┬─────────────────────────┘  │
│           │                             │
│  ┌────────┴─────────┬──────────────┐   │
│  │                  │              │   │
│  │  Backend Pods    │  Frontend    │   │
│  │  (3-10 replicas) │  Pods        │   │
│  └──────────────────┴──────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  PostgreSQL StatefulSet         │   │
│  │  Redis StatefulSet              │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
        │
┌───────▼────────────────────────────────┐
│    Persistent Volumes (EBS/GCE Disk)   │
└────────────────────────────────────────┘
```

## Future Enhancements

1. **Microservices Migration:**
   - Split into independent services
   - Service mesh (Istio)
   - Event-driven architecture

2. **Advanced AI:**
   - ML model serving
   - Real-time recommendations
   - Fraud detection

3. **Global Distribution:**
   - Multi-region deployment
   - Active-active setup
   - Data replication

4. **Enhanced Monitoring:**
   - Distributed tracing (Jaeger)
   - Log aggregation (ELK)
   - Error tracking (Sentry)
