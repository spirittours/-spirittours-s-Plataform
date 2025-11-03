# AGENTE IA DE CONTABILIDAD - PARTE 2

## 9. 🏗️ ARQUITECTURA TÉCNICA COMPLETA

### A. Diagrama de Arquitectura General

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   Dashboard  │  │  Checklists  │  │  ROI Calc    │               │
│  │   React UI   │  │  Interface   │  │  Dashboard   │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 │ HTTPS / WebSocket
                                 ↓
┌──────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY LAYER                            │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Nginx Reverse Proxy + Load Balancer                          │  │
│  │  • SSL/TLS Termination                                        │  │
│  │  • Rate Limiting                                              │  │
│  │  • Authentication/Authorization                               │  │
│  │  • Request Routing                                            │  │
│  └────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
                ↓                                 ↓
┌──────────────────────────────┐   ┌──────────────────────────────┐
│     APPLICATION LAYER         │   │      AI/ML LAYER             │
│  ┌────────────────────────┐  │   │  ┌────────────────────────┐ │
│  │  Node.js Backend       │  │   │  │  AI Agent Core         │ │
│  │  (Express.js)          │  │   │  │  • GPT-4 / Claude      │ │
│  │  • REST API            │←─┼───┼──│  • Fraud Detection ML  │ │
│  │  • GraphQL             │  │   │  │  • Predictive Models   │ │
│  │  • WebSocket Server    │  │   │  │  • OCR Processing      │ │
│  └────────────────────────┘  │   │  └────────────────────────┘ │
│  ┌────────────────────────┐  │   │  ┌────────────────────────┐ │
│  │  Python Services       │  │   │  │  ML Training Pipeline  │ │
│  │  (FastAPI)             │  │   │  │  • Model Training      │ │
│  │  • ML Inference        │  │   │  │  • Feature Engineering │ │
│  │  • Data Processing     │  │   │  │  • Model Evaluation    │ │
│  │  • Report Generation   │  │   │  │  • Deployment          │ │
│  └────────────────────────┘  │   │  └────────────────────────┘ │
└──────────────────────────────┘   └──────────────────────────────┘
                │                                 │
                └────────────────┬────────────────┘
                                 │
                                 ↓
┌──────────────────────────────────────────────────────────────────────┐
│                        BUSINESS LOGIC LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  ERP Hub     │  │  Accounting  │  │  Compliance  │               │
│  │  Adapters    │  │  Engine      │  │  Engine      │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  CFDI        │  │  Fraud       │  │  Reporting   │               │
│  │  Generator   │  │  Detection   │  │  Engine      │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
                ↓                                 ↓
┌──────────────────────────────┐   ┌──────────────────────────────┐
│       DATA LAYER              │   │    INTEGRATION LAYER         │
│  ┌────────────────────────┐  │   │  ┌────────────────────────┐ │
│  │  PostgreSQL            │  │   │  │  QuickBooks API        │ │
│  │  • Transactional Data  │  │   │  │  Xero API              │ │
│  │  • Financial Records   │  │   │  │  FreshBooks API        │ │
│  │  • Audit Logs          │  │   │  │  CONTPAQi API          │ │
│  └────────────────────────┘  │   │  │  Alegra API            │ │
│  ┌────────────────────────┐  │   │  └────────────────────────┘ │
│  │  MongoDB               │  │   │  ┌────────────────────────┐ │
│  │  • Documents           │  │   │  │  PAC Providers         │ │
│  │  • Logs                │  │   │  │  • Finkok              │ │
│  │  • Analytics           │  │   │  │  • SW                  │ │
│  └────────────────────────┘  │   │  │  • Diverza             │ │
│  ┌────────────────────────┐  │   │  └────────────────────────┘ │
│  │  Redis                 │  │   │  ┌────────────────────────┐ │
│  │  • Caching             │  │   │  │  Email Service         │ │
│  │  • Session Store       │  │   │  │  • SendGrid            │ │
│  │  • Job Queue           │  │   │  │  • Amazon SES          │ │
│  └────────────────────────┘  │   │  └────────────────────────┘ │
│  ┌────────────────────────┐  │   │  ┌────────────────────────┐ │
│  │  S3 / Blob Storage     │  │   │  │  SMS Service           │ │
│  │  • PDF Invoices        │  │   │  │  • Twilio              │ │
│  │  • XML CFDI            │  │   │  └────────────────────────┘ │
│  │  • Attachments         │  │   └──────────────────────────────┘
│  │  • Backups             │  │
│  └────────────────────────┘  │
└──────────────────────────────┘
                │
                ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    MONITORING & OBSERVABILITY LAYER                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  CloudWatch  │  │  Datadog     │  │  Sentry      │               │
│  │  Metrics     │  │  APM         │  │  Error Track │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  ELK Stack   │  │  Prometheus  │  │  Grafana     │               │
│  │  Log Aggr.   │  │  Metrics     │  │  Dashboards  │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
└──────────────────────────────────────────────────────────────────────┘
```

### B. Stack Tecnológico Detallado

```yaml
# Technology Stack Complete
Backend:
  API_Server:
    - Node.js 20.x LTS
    - Express.js 4.18+
    - TypeScript 5.x
    
  AI_ML_Services:
    - Python 3.11+
    - FastAPI 0.104+
    - LangChain 0.1+
    - OpenAI SDK 1.3+
    - Anthropic SDK (Claude)
    
  Background_Jobs:
    - Bull Queue (Redis-based)
    - Node-cron
    - PM2 Process Manager

Frontend:
  Framework:
    - React 18.2+
    - TypeScript 5.x
    - Vite 5.x (Build tool)
    
  UI_Libraries:
    - Material-UI (MUI) 5.x
    - Recharts (Graphs)
    - React Query (Data fetching)
    - Zustand (State management)
    
  Forms:
    - React Hook Form
    - Yup (Validation)

Databases:
  Primary:
    - PostgreSQL 15.x
    - Connection Pool: 100 connections
    - Extensions: uuid-ossp, pgcrypto
    
  Document_Store:
    - MongoDB 7.0
    - Replica Set: 3 nodes
    
  Cache:
    - Redis 7.2
    - Mode: Cluster (3 nodes)
    - Persistence: AOF + RDS

Storage:
  Object_Storage:
    - AWS S3 (Primary)
    - Cloudflare R2 (Backup)
    
  CDN:
    - CloudFlare CDN
    - Cache-Control headers
    - Edge caching

AI_ML:
  LLM_Providers:
    - OpenAI GPT-4 Turbo
    - Anthropic Claude 3.5 Sonnet
    - Fallback: GPT-3.5 Turbo
    
  ML_Models:
    - Scikit-learn 1.3+
    - TensorFlow 2.15+
    - XGBoost 2.0+
    
  OCR:
    - Tesseract 5.x
    - Google Vision API
    - Amazon Textract

Monitoring:
  APM:
    - Datadog APM
    - Custom metrics
    - Distributed tracing
    
  Logging:
    - Winston (Node.js)
    - Python logging
    - ELK Stack
    
  Error_Tracking:
    - Sentry
    - Source maps enabled
    - Release tracking
    
  Metrics:
    - Prometheus
    - Grafana dashboards
    - Custom alerts

DevOps:
  CI_CD:
    - GitHub Actions
    - Docker images
    - Automated testing
    
  Containers:
    - Docker 24.x
    - Docker Compose 2.x
    
  Orchestration:
    - Kubernetes 1.28+ (opcional)
    - PM2 (simple deployment)
    
  Infrastructure:
    - Terraform (IaC)
    - AWS CloudFormation

Security:
  Authentication:
    - JWT tokens
    - Refresh token rotation
    - OAuth 2.0 integration
    
  Encryption:
    - TLS 1.3
    - At-rest: AES-256
    - In-transit: HTTPS only
    
  Secrets:
    - AWS Secrets Manager
    - Environment variables
    - Vault (opcional)

Testing:
  Unit_Tests:
    - Jest (Node.js)
    - Pytest (Python)
    - Coverage > 80%
    
  Integration_Tests:
    - Supertest
    - TestContainers
    
  E2E_Tests:
    - Playwright
    - Cypress
    
  Load_Tests:
    - K6
    - Artillery
```

### C. Flujo de Datos Detallado

```
EJEMPLO: Procesamiento de Factura de Cliente

1. ENTRADA (Usuario/Sistema):
   ├─ Dashboard React → Botón "Nueva Factura"
   ├─ Formulario con datos del cliente y líneas de productos
   └─ Submit → POST /api/invoices

2. API GATEWAY:
   ├─ Nginx recibe request
   ├─ Valida SSL/TLS
   ├─ Verifica JWT token
   ├─ Rate limit check (500 req/min)
   └─ Enruta a Node.js Backend

3. BACKEND (Node.js):
   ├─ Express route handler: invoiceController.create()
   ├─ Validación de datos (Joi/Yup schema)
   ├─ Extrae datos del request body
   └─ Llama a InvoiceService.createInvoice()

4. BUSINESS LOGIC:
   ├─ InvoiceService.createInvoice()
   │  ├─ Valida customer exists
   │  ├─ Calcula subtotal de líneas
   │  ├─ Calcula impuestos según país
   │  │  ├─ USA: Sales Tax (por estado)
   │  │  └─ México: IVA 16%
   │  └─ Calcula total
   │
   └─ Envía a AI Agent para validación

5. AI AGENT VALIDATION:
   ├─ AIAccountingAgent.validateInvoice()
   │  ├─ Verifica completitud de datos
   │  ├─ Detecta duplicados
   │  ├─ Calcula risk score
   │  ├─ Ejecuta fraud detection
   │  └─ Retorna validation result
   │
   └─ Decisión:
      ├─ Si autoProcessing = ON && riskScore < 30:
      │  └─ Procesar automáticamente
      └─ Si autoProcessing = OFF || riskScore >= 30:
         └─ Enviar a cola de revisión humana

6. PROCESAMIENTO (Si aprobado):
   ├─ Guardar en PostgreSQL:
   │  ├─ INSERT INTO invoices (...)
   │  ├─ INSERT INTO invoice_lines (...)
   │  └─ Commit transaction
   │
   ├─ Si México → Generar CFDI:
   │  ├─ CFDIGenerator.generate()
   │  ├─ Crear XML CFDI 4.0
   │  ├─ Firmar con CSD
   │  ├─ Timbrar con PAC (Finkok/SW)
   │  ├─ Obtener UUID
   │  ├─ Generar QR code
   │  └─ Guardar XML en S3
   │
   └─ Sincronizar con ERP:
      ├─ ERPHubService.syncInvoice()
      ├─ Seleccionar adapter (QuickBooks/Xero/etc)
      ├─ Mapear a formato ERP
      ├─ Enviar vía API
      ├─ Manejar rate limiting
      └─ Guardar erpInvoiceId

7. GENERACIÓN DE DOCUMENTOS:
   ├─ InvoiceGenerator.generatePDF()
   │  ├─ Cargar plantilla (USA o México)
   │  ├─ Insertar datos
   │  ├─ Si México: incluir QR + UUID
   │  ├─ Generar PDF
   │  └─ Guardar en S3
   │
   └─ EmailService.sendInvoice()
      ├─ Cargar plantilla de email
      ├─ Adjuntar PDF (+ XML si México)
      ├─ Enviar vía SendGrid/SES
      └─ Registrar envío

8. NOTIFICACIONES:
   ├─ WebSocket broadcast (si cliente conectado):
   │  └─ ws.emit('invoice.created', invoiceData)
   │
   ├─ Notificación in-app
   │
   └─ Slack webhook (opcional)

9. AUDIT LOG:
   ├─ AuditService.log()
   │  ├─ Acción: "invoice.created"
   │  ├─ Usuario: req.user.id
   │  ├─ IP: req.ip
   │  ├─ Timestamp: new Date()
   │  ├─ Datos anteriores: null
   │  ├─ Datos nuevos: invoiceData
   │  └─ INSERT INTO audit_logs (...)
   │
   └─ Monitoring:
      ├─ Datadog metric: invoice.created
      ├─ CloudWatch log
      └─ Prometheus counter++

10. RESPONSE:
    ├─ Respuesta al frontend:
    │  {
    │    "success": true,
    │    "invoice": {
    │      "id": "uuid",
    │      "number": "INV-00123",
    │      "total": 1160.00,
    │      "status": "sent",
    │      "cfdiUUID": "abc-123..." (si México),
    │      "pdfUrl": "https://s3.../invoice.pdf",
    │      "xmlUrl": "https://s3.../cfdi.xml" (si México)
    │    }
    │  }
    │
    └─ HTTP 201 Created

11. BACKGROUND JOBS (Async):
    ├─ Analytics update
    ├─ Generate reports
    ├─ Update dashboards
    └─ Check payment status (scheduled)

TIEMPO TOTAL: 2-5 segundos
```

### D. Configuración de Infraestructura AWS

```terraform
# terraform/main.tf - Infrastructure as Code

terraform {
  required_version = ">= 1.5"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "spirittours-terraform-state"
    key    = "ai-accounting-agent/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name        = "ai-accounting-agent-vpc"
    Environment = var.environment
  }
}

# Subnets
resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  
  tags = {
    Name = "public-subnet-${count.index + 1}"
  }
}

resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  tags = {
    Name = "private-subnet-${count.index + 1}"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier             = "ai-accounting-agent-db"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = var.environment == "production" ? "db.t3.large" : "db.t3.medium"
  allocated_storage      = 100
  storage_type           = "gp3"
  storage_encrypted      = true
  
  db_name  = "accounting_db"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"
  
  multi_az               = var.environment == "production"
  skip_final_snapshot    = var.environment != "production"
  
  tags = {
    Name        = "ai-accounting-agent-db"
    Environment = var.environment
  }
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "ai-accounting-agent-redis"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.environment == "production" ? "cache.t3.medium" : "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  
  snapshot_retention_limit = 5
  snapshot_window          = "03:00-05:00"
  
  tags = {
    Name        = "ai-accounting-agent-redis"
    Environment = var.environment
  }
}

# EC2 Application Servers
resource "aws_launch_template" "app" {
  name_prefix   = "ai-accounting-agent-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = var.environment == "production" ? "t3.large" : "t3.medium"
  
  key_name = var.key_name
  
  vpc_security_group_ids = [aws_security_group.app.id]
  
  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    environment = var.environment
  }))
  
  iam_instance_profile {
    name = aws_iam_instance_profile.app.name
  }
  
  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "ai-accounting-agent-app"
      Environment = var.environment
    }
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "app" {
  name                = "ai-accounting-agent-asg"
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.app.arn]
  health_check_type   = "ELB"
  
  min_size         = var.environment == "production" ? 2 : 1
  max_size         = var.environment == "production" ? 10 : 3
  desired_capacity = var.environment == "production" ? 2 : 1
  
  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }
  
  tag {
    key                 = "Name"
    value               = "ai-accounting-agent-app"
    propagate_at_launch = true
  }
}

# Application Load Balancer
resource "aws_lb" "app" {
  name               = "ai-accounting-agent-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
  
  enable_deletion_protection = var.environment == "production"
  
  tags = {
    Name        = "ai-accounting-agent-alb"
    Environment = var.environment
  }
}

# S3 Bucket for Storage
resource "aws_s3_bucket" "storage" {
  bucket = "spirittours-ai-accounting-${var.environment}"
  
  tags = {
    Name        = "ai-accounting-storage"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "storage" {
  bucket = aws_s3_bucket.storage.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "storage" {
  bucket = aws_s3_bucket.storage.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "app" {
  name              = "/aws/ai-accounting-agent/${var.environment}"
  retention_in_days = var.environment == "production" ? 90 : 30
  
  tags = {
    Name        = "ai-accounting-agent-logs"
    Environment = var.environment
  }
}

# Secrets Manager
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "ai-accounting-agent/${var.environment}/secrets"
  recovery_window_in_days = 7
  
  tags = {
    Name        = "ai-accounting-agent-secrets"
    Environment = var.environment
  }
}

# Outputs
output "alb_dns_name" {
  value       = aws_lb.app.dns_name
  description = "DNS name of the Application Load Balancer"
}

output "rds_endpoint" {
  value       = aws_db_instance.postgres.endpoint
  description = "RDS PostgreSQL endpoint"
  sensitive   = true
}

output "redis_endpoint" {
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
  description = "Redis endpoint"
  sensitive   = true
}
```

---

## 10. 🔄 PLAN DE IMPLEMENTACIÓN (6 FASES)

### FASE 1: PREPARACIÓN Y SETUP (2 semanas)

#### Semana 1: Infraestructura Base
```bash
# Checklist Semana 1
□ Provisionar infraestructura AWS (Terraform)
  □ VPC y subnets
  □ RDS PostgreSQL
  □ ElastiCache Redis
  □ S3 buckets
  □ Load Balancer
  □ Auto Scaling Group

□ Configurar CI/CD
  □ GitHub Actions workflows
  □ Docker images
  □ Automated testing pipeline
  □ Deployment scripts

□ Setup de bases de datos
  □ Schema PostgreSQL
  □ Migraciones iniciales
  □ Índices y optimizaciones
  □ Backup strategy

□ Configurar servicios externos
  □ OpenAI API key
  □ Anthropic Claude key
  □ SendGrid/Amazon SES
  □ Twilio (SMS)
  □ Datadog/Sentry

□ Security setup
  □ SSL certificates
  □ AWS Secrets Manager
  □ IAM roles y policies
  □ Security groups
  □ VPN access (opcional)
```

#### Semana 2: Backend Core
```bash
# Checklist Semana 2
□ Node.js Backend Setup
  □ Express.js server
  □ TypeScript configuration
  □ Authentication (JWT)
  □ Database connections
  □ Redis connections
  □ Basic API routes

□ Python ML Services Setup
  □ FastAPI server
  □ AI client libraries
  □ ML model loading
  □ Inference endpoints

□ Testing Infrastructure
  □ Jest configuration
  □ Pytest configuration
  □ Test database
  □ Mock services
  □ CI test automation

□ Monitoring Setup
  □ CloudWatch integration
  □ Datadog APM
  □ Sentry error tracking
  □ Custom metrics
  □ Alert configuration
```

### FASE 2: ERP INTEGRACIÓN (3 semanas)

#### Semana 3-4: USA ERPs
```bash
# Checklist Semanas 3-4
□ QuickBooks USA Integration
  □ OAuth 2.0 implementation
  □ API adapter
  □ Rate limiting
  □ Error handling
  □ Unit tests
  □ Integration tests

□ Xero USA Integration
  □ OAuth 2.0 with PKCE
  □ API adapter
  □ Multi-tenancy support
  □ Rate limiting (60/min)
  □ Unit tests
  □ Integration tests

□ FreshBooks Integration
  □ OAuth 2.0 implementation
  □ API adapter
  □ Multi-business support
  □ Rate limiting
  □ Unit tests
  □ Integration tests

□ ERP Hub Core
  □ Adapter factory
  □ Unified models
  □ Sync orchestrator
  □ Mapping manager
  □ Webhook handlers
```

#### Semana 5: México ERPs + CFDI
```bash
# Checklist Semana 5
□ CONTPAQi Integration
  □ Session authentication
  □ API adapter
  □ Document sync
  □ Rate limiting (30/min)
  □ Unit tests

□ QuickBooks México Integration
  □ OAuth 2.0 (same as USA)
  □ CFDI CustomFields
  □ SAT catalogs
  □ Unit tests

□ Alegra Integration
  □ Basic auth
  □ REST API adapter
  □ LATAM support
  □ Unit tests

□ CFDI 4.0 Generator
  □ XML generation
  □ Digital signature (CSD)
  □ PAC integration (Finkok, SW)
  □ QR code generation
  □ PDF generation
  □ Validation
  □ Tests (40+ cases)

□ Contabilidad Electrónica
  □ Catálogo de cuentas XML
  □ Balanza XML
  □ Pólizas XML
  □ Monthly automation
```

### FASE 3: AI AGENT CORE (3 semanas)

#### Semana 6: AI Foundation
```bash
# Checklist Semana 6
□ AI Agent Core
  □ LangChain integration
  □ GPT-4 client
  □ Claude 3.5 client
  □ Prompt engineering
  □ Context management
  □ Memory system

□ Natural Language Processing
  □ Invoice understanding
  □ Transaction classification
  □ Entity extraction
  □ Intent detection
  □ Sentiment analysis

□ OCR Implementation
  □ Tesseract setup
  □ Google Vision API
  □ Amazon Textract
  □ Image preprocessing
  □ Text extraction
  □ Validation
```

#### Semana 7: Fraud Detection
```bash
# Checklist Semana 7
□ Fraud Detection Engine
  □ Layer 1: Rule-based
    □ Duplicate detection
    □ Amount anomalies
    □ Rapid transactions
    □ Off-hour activity
    □ Suspicious patterns
  
  □ Layer 2: Machine Learning
    □ Isolation Forest (anomalies)
    □ DBSCAN (clustering)
    □ LSTM (sequences)
    □ Random Forest (risk scoring)
  
  □ Layer 3: Behavioral Analysis
    □ User profiling
    □ Vendor profiling
    □ Seasonal patterns
    □ Geolocation check
  
  □ Layer 4: Network Analysis
    □ Relationship mapping
    □ Circular transactions
    □ Shell company detection
    □ Connection strength

□ Alert System
  □ 4-level severity
  □ Notification rules
  □ Escalation logic
  □ False positive tracking
  □ Model retraining pipeline

□ Testing
  □ Synthetic fraud data
  □ 10 fraud type tests
  □ Performance benchmarks
  □ Accuracy metrics (>90%)
```

#### Semana 8: Intelligent Processing
```bash
# Checklist Semana 8
□ Dual Review System
  □ Configuration manager
  □ Toggle implementation
  □ Threshold logic
  □ Role-based rules
  □ Queue management
  □ Approval workflows

□ Checklist System
  □ 5 predefined checklists
  □ Dynamic item generation
  □ AI validation
  □ Progress tracking
  □ Notes/annotations
  □ Print/export

□ Predictive Analytics
  □ Cash flow prediction (3 months)
  □ Revenue forecasting
  □ Expense prediction
  □ Churn prediction
  □ Seasonality analysis
  □ Anomaly detection

□ Recommendations Engine
  □ Cash flow recommendations
  □ Profitability analysis
  □ AR/AP optimization
  □ Service performance
  □ Cost reduction ideas
```

### FASE 4: FRONTEND & UX (2 semanas)

#### Semana 9: Core Dashboard
```bash
# Checklist Semana 9
□ Dashboard Principal
  □ Real-time metrics
  □ Financial KPIs
  □ Operational metrics
  □ Security alerts
  □ Branch comparison
  □ Charts/graphs

□ AI Agent Control Panel
  □ Dual review toggle
  □ Threshold sliders
  □ Configuration forms
  □ Live statistics
  □ Alert management

□ ROI Calculator Dashboard
  □ 4-year base (configurable)
  □ Cost inputs
  □ Savings inputs
  □ Advanced settings
  □ Charts (Line, Bar)
  □ Recommendations panel
  □ Export (PDF, Excel)

□ Responsive Design
  □ Mobile-first
  □ Tablet optimization
  □ Desktop full features
  □ Touch-friendly
  □ Accessibility (WCAG 2.1 AA)
```

#### Semana 10: Workflows & Features
```bash
# Checklist Semana 10
□ Facturación Interface
  □ Customer selection
  □ Line items builder
  □ Tax calculation UI
  □ Preview (USA / México)
  □ CFDI fields (México)
  □ Send/save actions

□ Checklist Interface
  □ Interactive checkboxes
  □ AI validation display
  □ Notes per item
  □ Progress bar
  □ Print view
  □ Approval button

□ Transacciones Manager
  □ List/grid views
  □ Filters & search
  □ Status indicators
  □ Actions menu
  □ Bulk operations
  □ Export options

□ Reportes Viewer
  □ Report selector
  □ Date range picker
  □ Parameter forms
  □ PDF viewer
  □ Download buttons
  □ Email sharing

□ Settings Panel
  □ Company settings
  □ User management
  □ Role configuration
  □ ERP connections
  □ PAC settings
  □ Notification preferences
```

### FASE 5: TESTING & QA (2 semanas)

#### Semana 11: Testing Comprehensive
```bash
# Checklist Semana 11
□ Unit Tests
  □ Backend (>80% coverage)
  □ AI services (>75% coverage)
  □ Frontend components (>70%)
  □ Utilities (100%)

□ Integration Tests
  □ API endpoints (all)
  □ Database operations
  □ ERP adapters (6)
  □ CFDI generation
  □ PAC stamping
  □ Email sending

□ E2E Tests
  □ User workflows (20+)
  □ Invoice creation (USA/MX)
  □ Payment processing
  □ Dual review flow
  □ Checklist completion
  □ Report generation

□ Performance Tests
  □ Load testing (K6)
  □ Stress testing
  □ Spike testing
  □ Soak testing
  □ API response times
  □ Database queries

□ Security Tests
  □ Penetration testing
  □ SQL injection
  □ XSS attacks
  □ CSRF protection
  □ Authentication bypass
  □ Authorization checks
```

#### Semana 12: Bug Fixing & Optimization
```bash
# Checklist Semana 12
□ Bug Triage
  □ Critical bugs (P0)
  □ High priority (P1)
  □ Medium priority (P2)
  □ Low priority (P3)

□ Performance Optimization
  □ Database query optimization
  □ API response time
  □ Frontend bundle size
  □ Image optimization
  □ Caching strategy
  □ CDN configuration

□ Code Quality
  □ ESLint fixes
  □ TypeScript strict mode
  □ Code documentation
  □ API documentation
  □ README updates

□ UAT Preparation
  □ Test environment setup
  □ Test data generation
  □ User documentation
  □ Training materials
  □ Support runbooks
```

### FASE 6: DEPLOYMENT & GO-LIVE (2 semanas)

#### Semana 13: Staging Deployment
```bash
# Checklist Semana 13
□ Staging Environment
  □ Deploy infrastructure
  □ Deploy application
  □ Configure services
  □ Load test data
  □ Smoke tests

□ User Acceptance Testing (UAT)
  □ USA team testing
  □ México team testing
  □ Accounting team testing
  □ Management testing
  □ Feedback collection
  □ Issue resolution

□ Training Sessions
  □ USA team (2 días)
  □ México team (2 días)
  □ Hands-on exercises
  □ Q&A sessions
  □ Certification test

□ Documentation Final
  □ User manual
  □ Admin guide
  □ API documentation
  □ Troubleshooting guide
  □ FAQ
```

#### Semana 14: Production Go-Live
```bash
# Checklist Semana 14
□ Pre-Deployment
  □ Production checklist review
  □ Database backup
  □ Rollback plan ready
  □ Monitoring configured
  □ On-call schedule
  □ Communication plan

□ Production Deployment
  □ Blue-green deployment
  □ Deploy v1.0.0
  □ Smoke tests
  □ Health checks
  □ Performance validation

□ Gradual Rollout
  □ 10% traffic (Day 1-2)
  □ Monitor 48 hours
  □ 50% traffic (Day 3-4)
  □ Monitor 24 hours
  □ 100% traffic (Day 5)

□ Go-Live
  □ Announce to company
  □ Enable for all users
  □ Monitor dashboards 24/7
  □ Support team ready
  □ Incident response ready

□ Post-Launch
  □ Performance review
  □ User feedback
  □ Bug tracking
  □ Feature requests
  □ Continuous improvement
```

### CRONOGRAMA VISUAL

```
FASE 1: PREPARACIÓN (2 semanas)
Sem 1: ████████████████ Infraestructura
Sem 2: ████████████████ Backend Core

FASE 2: ERP INTEGRACIÓN (3 semanas)
Sem 3-4: ████████████████████████████████ USA ERPs
Sem 5: ████████████████ México ERPs + CFDI

FASE 3: AI AGENT (3 semanas)
Sem 6: ████████████████ AI Foundation
Sem 7: ████████████████ Fraud Detection
Sem 8: ████████████████ Intelligent Processing

FASE 4: FRONTEND (2 semanas)
Sem 9: ████████████████ Core Dashboard
Sem 10: ████████████████ Workflows

FASE 5: TESTING (2 semanas)
Sem 11: ████████████████ Comprehensive Testing
Sem 12: ████████████████ Bug Fixing

FASE 6: GO-LIVE (2 semanas)
Sem 13: ████████████████ Staging & UAT
Sem 14: ████████████████ Production

TOTAL: 14 semanas (3.5 meses)
```

---

## 11. 📚 CASOS DE USO DETALLADOS

### Caso de Uso 1: Facturación Automática USA

```
ACTOR: Sistema automático / Usuario
PRECONDICIÓN: Booking confirmado en sistema
TRIGGER: Booking status = "Confirmed"

FLUJO PRINCIPAL:
1. Sistema detecta booking confirmado
2. AI Agent extrae datos necesarios:
   - Customer info (nombre, email, dirección)
   - Services purchased (tours, transfers, etc.)
   - Pricing breakdown
   - Tax jurisdiction (state)

3. AI valida completitud de datos:
   ✓ Customer name: "John Doe"
   ✓ Email: "john@example.com"
   ✓ Address: "123 Main St, Los Angeles, CA 90001"
   ✓ Services: "Grand Canyon Tour - 2 Adults"
   ✓ Subtotal: $500.00

4. Calcular Sales Tax:
   - Estado: California
   - Tasa: 7.25%
   - Tax: $500 * 0.0725 = $36.25
   - Total: $536.25

5. Generar factura:
   - Número: USA-2025-00123
   - Fecha: 2025-11-03
   - Método pago: Credit Card
   - Términos: Net 30

6. Crear PDF:
   - Cargar template "USA_B2C_Standard"
   - Insertar datos
   - Generar PDF
   - Guardar en S3: s3://invoices/2025/11/USA-2025-00123.pdf

7. Sincronizar con QuickBooks:
   - Mapear a formato QB
   - POST /v3/company/{realmId}/invoice
   - Rate limit check
   - Guardar QB Invoice ID: 12345

8. Enviar al cliente:
   - Cargar template email
   - Adjuntar PDF
   - Enviar vía SendGrid
   - Registrar envío

9. Audit log:
   - Acción: "invoice.auto_created"
   - Usuario: "AI Agent"
   - Timestamp: 2025-11-03 10:30:45
   - Datos: {...}

10. Notificación:
    - WebSocket → Dashboard
    - Slack: "Nueva factura #USA-2025-00123 generada"
    - Email al contador (opcional)

POSTCONDICIÓN:
- Factura creada en sistema
- PDF generado y almacenado
- Sincronizado con QuickBooks
- Cliente notificado
- Audit trail registrado

TIEMPO ESTIMADO: 3-4 segundos

EXCEPCIONES:
E1: Datos incompletos
    → Solicitar datos faltantes al usuario
    → Enviar email de recordatorio
    
E2: Error en QuickBooks
    → Reintentar 3 veces (backoff exponencial)
    → Si falla, marcar para revisión manual
    → Notificar al contador

E3: Error en envío de email
    → Reintentar 2 veces
    → Si falla, guardar para reenvío posterior
    → Mostrar alerta en dashboard
```

### Caso de Uso 2: CFDI 4.0 México

```
ACTOR: Usuario (contador) / Sistema automático
PRECONDICIÓN: Servicio prestado, datos del cliente completos
TRIGGER: Usuario crea factura o sistema automático

FLUJO PRINCIPAL:
1. Recopilar datos del cliente:
   ✓ RFC: XAXX010101000 (validado)
   ✓ Nombre/Razón Social: "Juan Pérez García"
   ✓ Régimen Fiscal: 612 (Personas Físicas)
   ✓ Código Postal: 01000
   ✓ Uso CFDI: G03 (Gastos en general)

2. Recopilar datos de la factura:
   ✓ Conceptos:
     - Tour Chichén Itzá - 2 personas
     - Clave Prod/Serv: 90111500 (Turismo)
     - Clave Unidad: E48 (Servicio)
     - Cantidad: 2
     - Valor Unitario: $1,500.00 MXN
     - Importe: $3,000.00 MXN
   
   ✓ Impuestos:
     - IVA 16%: $480.00 MXN
     - Total: $3,480.00 MXN
   
   ✓ Método Pago: PUE (Pago en una exhibición)
   ✓ Forma Pago: 03 (Transferencia electrónica)

3. AI valida datos:
   - RFC válido ✓
   - Uso CFDI válido ✓
   - Clave Prod/Serv válida ✓
   - Cálculo IVA correcto ✓
   - Campos obligatorios completos ✓

4. Generar XML CFDI 4.0:
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <cfdi:Comprobante 
     Version="4.0"
     Serie="A"
     Folio="123"
     Fecha="2025-11-03T10:30:00"
     FormaPago="03"
     MetodoPago="PUE"
     TipoDeComprobante="I"
     SubTotal="3000.00"
     Total="3480.00"
     Moneda="MXN"
     ...>
   ```

5. Firmar digitalmente:
   - Cargar CSD desde AWS Secrets Manager
   - Generar cadena original
   - Firmar con private key
   - Insertar sello digital en XML

6. Timbrar con PAC (Finkok):
   - POST /servicios/soap/stamp
   - Enviar XML firmado
   - Recibir:
     * UUID: 12345678-ABCD-EFGH-IJKL-123456789012
     * Fecha timbrado: 2025-11-03T10:30:15
     * Sello SAT
     * Cadena SAT

7. Generar QR Code:
   - URL: https://verificacfdi.facturaelectronica.sat.gob.mx/
   - Parámetros:
     * re=XAXX010101000 (RFC emisor)
     * rr=XAXX010101000 (RFC receptor)
     * tt=3480.00 (Total)
     * id=12345678-... (UUID)
   - Generar imagen QR

8. Generar PDF:
   - Cargar template México
   - Insertar todos los datos
   - Incluir QR code
   - Incluir cadena original SAT
   - Incluir UUID
   - Guardar: s3://cfdi/2025/11/A-123.pdf

9. Guardar XML timbrado:
   - S3: s3://cfdi/2025/11/A-123.xml
   - Retención: Permanente (obligatorio SAT)

10. Sincronizar con ERP (QuickBooks MX):
    - Crear invoice en QuickBooks
    - Agregar CustomFields:
      * CFDI_UUID
      * CFDI_UsoCFDI
      * CFDI_MetodoPago
      * CFDI_FormaPago
    - Guardar QB Invoice ID

11. Enviar al cliente:
    - Email con:
      * PDF adjunto
      * XML adjunto
      * Instrucciones de verificación SAT
    - Mensaje:
      "Su factura electrónica ha sido generada.
       UUID: 12345678-ABCD-EFGH-IJKL-123456789012
       Puede verificarla en: [link SAT]"

12. Registrar en contabilidad electrónica:
    - Agregar a póliza del mes
    - Actualizar balanza de comprobación
    - Actualizar auxiliares
    - Preparar para envío mensual SAT

POSTCONDICIÓN:
- CFDI válido generado
- UUID obtenido del SAT
- PDF y XML guardados
- Cliente notificado
- Contabilidad actualizada

TIEMPO ESTIMADO: 5-8 segundos

EXCEPCIONES:
E1: RFC inválido
    → Notificar error específico
    → Solicitar corrección
    → No permitir continuar

E2: Error al timbrar (PAC caído)
    → Intentar con PAC de respaldo (SW)
    → Si ambos fallan, guardar para reintentar
    → Notificar al contador

E3: Error en cálculo de impuestos
    → Mostrar discrepancia
    → Sugerir corrección
    → Requiere validación manual

E4: Certificado CSD expirado
    → Bloquear facturación
    → Alerta crítica
    → Solicitar renovación en SAT
```

### Caso de Uso 3: Detección de Fraude en Tiempo Real

```
ACTOR: AI Agent (automático)
TRIGGER: Cualquier transacción nueva

FLUJO PRINCIPAL:
1. Transacción entrante:
   - Tipo: Pago a proveedor
   - Proveedor: "ABC Services LLC"
   - Monto: $15,000 USD
   - Fecha: 2025-11-03 02:30 AM
   - Usuario: jsmith@spirittours.com
   - IP: 192.168.1.100

2. Layer 1 - Reglas Básicas:
   
   Regla 1: Duplicados
   - Buscar transacciones similares últimos 30 días
   - Criterio: mismo proveedor + monto similar (±5%)
   - Resultado: ✓ No encontrado
   
   Regla 2: Monto inusual
   - Histórico proveedor: $2,000 - $5,000 promedio
   - Monto actual: $15,000
   - Z-score: 4.2 (> 3 = anomalía)
   - Resultado: ⚠️ ALERTA - Monto 3x mayor al promedio
   
   Regla 3: Horario
   - Hora: 02:30 AM (fuera de horario laboral)
   - Histórico usuario: 08:00-18:00
   - Resultado: ⚠️ ALERTA - Actividad fuera de horario
   
   Regla 4: Transacciones rápidas
   - Últimas 24h: 1 transacción similar
   - Resultado: ✓ Normal

3. Layer 2 - Machine Learning:
   
   Modelo 1: Isolation Forest (Anomalías)
   - Features: amount, time, user, vendor, etc.
   - Score: 0.72 (> 0.6 = anomalía)
   - Resultado: ⚠️ ALERTA - Anomalía detectada
   
   Modelo 2: Random Forest (Risk Scoring)
   - Features: 45 variables
   - Risk Score: 78/100 (>70 = alto riesgo)
   - Resultado: 🔴 CRÍTICO - Alto riesgo de fraude
   
   Modelo 3: LSTM (Secuencias)
   - Analiza patrón de transacciones
   - Compara con patrones normales
   - Similarity: 0.35 (< 0.5 = inusual)
   - Resultado: ⚠️ ALERTA - Patrón no coincide

4. Layer 3 - Análisis Comportamental:
   
   Perfil Usuario:
   - Transacciones promedio: $3,000
   - Horario habitual: 09:00-17:00
   - Proveedores habituales: 10
   - Comportamiento: Consistente
   - Desviación actual: ALTA
   - Resultado: ⚠️ ALERTA - Fuera de perfil
   
   Perfil Proveedor:
   - Registro: 3 meses atrás
   - Transacciones totales: 4
   - Monto promedio: $3,500
   - KYC completo: ✓ Sí
   - Resultado: ⚠️ ALERTA - Proveedor relativamente nuevo

5. Layer 4 - Análisis de Red:
   
   Relaciones:
   - Buscar conexiones sospechosas
   - Analizar flujos de dinero
   - Detectar ciclos
   - Resultado: ✓ No se detectaron patrones circulares
   
   Verificación Cruzada:
   - Proveedor existe en registros públicos ✓
   - Dirección válida ✓
   - No está en lista negra ✓

6. SCORE FINAL:
   - Reglas básicas: 60/100 (3 alertas)
   - Machine Learning: 78/100 (alto riesgo)
   - Comportamental: 70/100 (desviación)
   - Red: 20/100 (sin patrones sospechosos)
   
   PROMEDIO PONDERADO: 67/100
   
   CLASIFICACIÓN: 🔴 ALTO RIESGO

7. Decisión del sistema:
   - Confianza fraude: 67%
   - Umbral crítico: 60%
   - Decisión: BLOQUEAR y REVISAR

8. Acciones automáticas:
   a) Bloquear transacción temporalmente
   b) Generar alerta crítica
   c) Notificar a:
      - CFO (email inmediato)
      - Security team (Slack)
      - Contador supervisor
   d) Crear caso en sistema
   e) Solicitar revisión manual
   f) Documentar evidencia

9. Notificación enviada:
   ```
   🔴 ALERTA CRÍTICA DE FRAUDE
   
   Caso: FRD-2025-00123
   Fecha: 2025-11-03 02:32:15
   
   Transacción Bloqueada:
   - Proveedor: ABC Services LLC
   - Monto: $15,000 USD
   - Usuario: jsmith@spirittours.com
   - Hora: 02:30 AM
   
   Indicadores de Riesgo:
   ⚠️ Monto 3x mayor al promedio ($5,000)
   ⚠️ Fuera de horario laboral (02:30 AM)
   ⚠️ Score de riesgo ML: 78/100
   ⚠️ Patrón no coincide con histórico
   ⚠️ Proveedor relativamente nuevo (3 meses)
   
   Confianza de Fraude: 67%
   
   Acción Requerida:
   1. Revisar evidencia en dashboard
   2. Contactar a usuario (jsmith)
   3. Verificar legitimidad de proveedor
   4. Aprobar o Rechazar definitivamente
   
   Link: https://dashboard.spirittours.com/fraud/FRD-2025-00123
   ```

10. Revisor humano analiza:
    - Revisa documentación adjunta
    - Contacta a usuario jsmith
    - Verifica OC (Orden de Compra)
    - Valida con proveedor
    
    Hallazgo:
    "Es una compra legítima de equipos de emergencia.
     Usuario trabajó fuera de horario por deadline.
     OC aprobada por director.
     Proveedor verificado."

11. Revisor aprueba transacción:
    - Marca como "false positive"
    - Agrega notas explicativas
    - Aprueba procesamiento
    - Feedback al ML model

12. Sistema aprende:
    - Registra como false positive
    - Ajusta modelo ML
    - Actualiza perfil usuario
    - Actualiza perfil proveedor
    - Mejora precisión futura

POSTCONDICIÓN:
- Fraude potencial detectado
- Transacción bloqueada
- Revisión humana solicitada
- Decisión final documentada
- Sistema aprendió del caso

TIEMPO ESTIMADO: 
- Detección: < 1 segundo
- Notificación: < 2 segundos
- Revisión humana: 5-30 minutos

MÉTRICAS DE ÉXITO:
- False Positive Rate: < 15%
- True Positive Rate: > 90%
- Average Detection Time: < 1s
- Average Response Time: < 5 min
```

---

*El documento continúa... Voy a agregar las secciones finales (12 y 13). ¿Deseas que continúe ahora?*
