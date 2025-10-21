# Guía de Deployment - Sistema de Comunicación Inteligente

## Pre-requisitos

- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Node.js 18+ (para frontend)
- Configuración de canales (WhatsApp, Telegram, etc.)

## Variables de Entorno

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379/0

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_TOKEN=your_webhook_token

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token

# Facebook/Instagram
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_token
FACEBOOK_APP_SECRET=your_app_secret

# Application
SECRET_KEY=your_secret_key
ENVIRONMENT=production
```

## Deployment con Docker

### 1. Build

```bash
# Build backend
docker build -t communication-backend -f Dockerfile .

# Build frontend
docker build -t communication-frontend -f Dockerfile.frontend ./frontend
```

### 2. Run with Docker Compose

```yaml
version: '3.8'

services:
  backend:
    image: communication-backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/communication
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  frontend:
    image: communication-frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://backend:8000

  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=communication

  redis:
    image: redis:7-alpine
```

```bash
docker-compose up -d
```

## Deployment Manual

### 1. Backend

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start workers
celery -A backend.celery_app worker -l info &

# Start server
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run build
npm start
```

## Configurar Webhooks

```bash
# WhatsApp - Configure en Facebook Dashboard

# Telegram
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -d "url=https://yoursite.com/api/intelligent-communication/webhook/telegram"

# Verify
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

## Registrar Agentes

```bash
curl -X POST http://localhost:8000/api/intelligent-communication/agents/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "agent_id": "agent_001",
    "name": "Juan Pérez",
    "email": "juan@company.com",
    "departments": ["customer_service", "sales"],
    "max_concurrent": 3,
    "skills": ["spanish", "english"]
  }'
```

## Monitoring

### Health Checks

```bash
# System health
curl http://localhost:8000/api/intelligent-communication/health

# Queue status
curl http://localhost:8000/api/intelligent-communication/queue/status

# Metrics
curl http://localhost:8000/api/communication-dashboard/metrics/realtime
```

### Logs

```bash
# Backend logs
tail -f logs/app.log

# Celery logs
tail -f logs/celery.log
```

## Troubleshooting

### Webhooks no reciben mensajes
1. Verificar URL pública accesible
2. Verificar SSL válido
3. Verificar token correcto
4. Ver logs de la plataforma (Facebook/Telegram)

### Cola se llena
1. Verificar agentes disponibles
2. Aumentar max_concurrent
3. Registrar más agentes
4. Verificar performance del sistema

### Alta latencia
1. Verificar conexión a Redis
2. Verificar conexión a Database
3. Escalar workers de Celery
4. Optimizar queries

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.yml
services:
  backend:
    image: communication-backend
    deploy:
      replicas: 3
    
  worker:
    image: communication-backend
    command: celery -A backend.celery_app worker
    deploy:
      replicas: 5
```

### Database Optimization

```sql
-- Add indexes
CREATE INDEX idx_conversation_session ON conversations(session_id);
CREATE INDEX idx_conversation_timestamp ON conversations(timestamp DESC);
CREATE INDEX idx_message_user ON messages(user_id);
```

## Security

- Use HTTPS for all webhooks
- Validate webhook signatures
- Use environment variables for secrets
- Implement rate limiting
- Regular security updates

## Backup

```bash
# Database
pg_dump -U user -d communication > backup_$(date +%Y%m%d).sql

# Redis
redis-cli --rdb dump.rdb

# Restore
psql -U user -d communication < backup.sql
```
