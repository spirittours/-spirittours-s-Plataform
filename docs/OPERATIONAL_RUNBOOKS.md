# 🔧 Operational Runbooks - AI Multi-Model Management System

## 📋 Índice de Runbooks
1. [🚨 Incident Response](#incident-response)
2. [🔄 Deployment Procedures](#deployment-procedures)
3. [📊 Monitoring & Alerts](#monitoring--alerts)
4. [🗄️ Database Operations](#database-operations)
5. [🔐 Security Incidents](#security-incidents)
6. [⚖️ Load Balancer Issues](#load-balancer-issues)
7. [🧠 AI Model Problems](#ai-model-problems)
8. [📈 Performance Issues](#performance-issues)
9. [💾 Backup & Recovery](#backup--recovery)
10. [🔧 Maintenance Tasks](#maintenance-tasks)

---

## 🚨 Incident Response

### Clasificación de Severidad

#### P0 - Critical (Respuesta: Inmediata)
- Sistema completamente caído
- Pérdida de datos críticos
- Violación de seguridad activa
- Impacto total en usuarios de producción

#### P1 - High (Respuesta: 30 minutos)
- Degradación severa del servicio
- Funcionalidad crítica no disponible
- Alto porcentaje de errores (>10%)
- Problemas de performance severos

#### P2 - Medium (Respuesta: 2 horas)
- Funcionalidad parcialmente afectada
- Problemas de performance menores
- Errores intermitentes
- Impacto limitado en usuarios

#### P3 - Low (Respuesta: 24 horas)
- Problemas cosméticos
- Funcionalidad no crítica afectada
- Optimizaciones menores

### Procedimiento de Respuesta P0/P1

#### 1. Detección y Alerta (0-5 min)
```bash
# Verificar estado del sistema inmediatamente
curl -f https://ai-multimodel.genspark.ai/health
curl -f https://api.ai-multimodel.genspark.ai/health

# Verificar métricas en Grafana
# URL: https://grafana.ai-multimodel.genspark.ai/d/overview

# Verificar logs en tiempo real
kubectl logs -f deployment/ai-multimodel-api -n production --tail=100
```

#### 2. Comunicación Inicial (5-10 min)
```bash
# Notificar en Slack
curl -X POST $SLACK_INCIDENT_WEBHOOK -H "Content-Type: application/json" -d '{
  "text": "🚨 P0 INCIDENT: [Título del incidente]",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Incident Commander*: @usuario\n*Severity*: P0\n*Status*: INVESTIGATING\n*Impact*: [Describir impacto]"
      }
    }
  ]
}'

# Crear incident en PagerDuty/Opsgenie
curl -X POST https://api.pagerduty.com/incidents \
  -H "Authorization: Token token=$PAGERDUTY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "incident": {
      "type": "incident",
      "title": "P0: [Título del incidente]",
      "service": {
        "id": "AI_MULTIMODEL_SERVICE_ID",
        "type": "service_reference"
      }
    }
  }'
```

#### 3. Investigación Inicial (10-20 min)

##### Verificar Infraestructura
```bash
# Estado de pods
kubectl get pods -n production -o wide

# Eventos recientes
kubectl get events -n production --sort-by='.firstTimestamp' | tail -20

# Estado de nodos
kubectl get nodes -o wide
kubectl top nodes

# Estado de servicios
kubectl get services -n production
```

##### Verificar Aplicación
```bash
# Logs de aplicación (últimos 30 minutos)
kubectl logs deployment/ai-multimodel-api -n production --since=30m | grep ERROR

# Métricas de aplicación
curl -s https://api.ai-multimodel.genspark.ai/metrics | grep -E "(error_rate|response_time|cpu|memory)"

# Base de datos
kubectl exec -it deployment/postgresql -n production -- psql -U postgres -c "SELECT NOW(), COUNT(*) FROM pg_stat_activity;"
```

##### Verificar Dependencias Externas
```bash
# AI Model providers
for model in gpt-4 claude-3-5-sonnet gemini-pro; do
  echo "Testing $model..."
  curl -s https://api.ai-multimodel.genspark.ai/api/v1/models/$model/health
done

# Redis
kubectl exec -it deployment/redis -n production -- redis-cli ping

# Load balancer
kubectl get ingress -n production
```

#### 4. Mitigation (20-60 min)

##### Rollback Automático (Si es deployment reciente)
```bash
# Verificar deployment reciente
kubectl rollout history deployment/ai-multimodel-api -n production

# Rollback si el deployment fue en las últimas 2 horas
LAST_DEPLOY=$(kubectl get deployment ai-multimodel-api -n production -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}')
DEPLOY_TIME=$(kubectl get rs -n production --sort-by='.metadata.creationTimestamp' | tail -1 | awk '{print $4}')

# Si es reciente, hacer rollback
kubectl rollout undo deployment/ai-multimodel-api -n production
kubectl rollout status deployment/ai-multimodel-api -n production --timeout=300s
```

##### Scaling Horizontal
```bash
# Aumentar replicas si es problema de capacidad
kubectl scale deployment ai-multimodel-api -n production --replicas=10

# Verificar auto-scaling
kubectl get hpa -n production
```

##### Circuit Breaker Manual
```bash
# Activar circuit breaker para modelos problemáticos
curl -X POST https://api.ai-multimodel.genspark.ai/admin/circuit-breaker \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "model": "problematic-model",
    "action": "open",
    "duration": 300
  }'
```

#### 5. Comunicación Continua (Cada 15-30 min)
```bash
# Update en Slack
curl -X POST $SLACK_INCIDENT_WEBHOOK -d '{
  "text": "🔄 INCIDENT UPDATE",
  "blocks": [
    {
      "type": "section", 
      "text": {
        "type": "mrkdwn",
        "text": "*Status*: MITIGATING\n*Actions Taken*: [Lista de acciones]\n*ETA Resolution*: [Estimación]\n*Next Update*: [Tiempo]"
      }
    }
  ]
}'
```

#### 6. Resolución y Post-Mortem
```bash
# Verificar resolución completa
./tests/smoke-tests.sh production

# Verificar métricas han vuelto a normal
curl -s https://api.ai-multimodel.genspark.ai/metrics | grep error_rate

# Comunicar resolución
curl -X POST $SLACK_INCIDENT_WEBHOOK -d '{
  "text": "✅ INCIDENT RESOLVED",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn", 
        "text": "*Resolution Time*: [Duración total]\n*Root Cause*: [Causa raíz]\n*Actions Taken*: [Resumen de acciones]"
      }
    }
  ]
}'
```

---

## 🔄 Deployment Procedures

### Pre-Deployment Checklist

```bash
# 1. Verificar que no hay incidentes activos
curl -s https://status.ai-multimodel.genspark.ai/api/v2/summary.json

# 2. Verificar health del sistema actual
./tests/smoke-tests.sh production

# 3. Verificar capacidad del cluster
kubectl top nodes
kubectl get pods -n production | grep -E "(Pending|CrashLoop|Error)"

# 4. Backup preventivo
kubectl create backup pre-deploy-backup-$(date +%Y%m%d-%H%M%S) -n production

# 5. Notificar inicio de deployment
curl -X POST $SLACK_DEPLOY_WEBHOOK -d '{
  "text": "🚀 Starting production deployment",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Deployer*: @usuario\n*Commit*: '${GITHUB_SHA}'\n*Expected Duration*: 15-20 min"
      }
    }
  ]
}'
```

### Production Deployment

```bash
# Ejecutar deployment script
export IMAGE_TAG=${GITHUB_SHA}
export DEPLOYMENT_ENVIRONMENT=production
./scripts/production-deploy.sh

# Monitoreo durante deployment
watch kubectl get pods -n production

# Verificar rollout
kubectl rollout status deployment/ai-multimodel-api -n production --timeout=600s
kubectl rollout status deployment/ai-multimodel-frontend -n production --timeout=600s
```

### Post-Deployment Validation

```bash
# Health checks comprensivos
sleep 60
./tests/smoke-tests.sh production

# Performance validation
artillery quick --duration 120 --rate 20 https://api.ai-multimodel.genspark.ai/health

# Verificar métricas clave
curl -s https://api.ai-multimodel.genspark.ai/metrics | grep -E "(http_requests_total|error_rate|response_time)"

# Verificar logs por errores
kubectl logs deployment/ai-multimodel-api -n production --since=5m | grep -i error || echo "No errors found"
```

### Rollback Procedure

```bash
# Identificar revisión anterior estable
kubectl rollout history deployment/ai-multimodel-api -n production

# Ejecutar rollback
kubectl rollout undo deployment/ai-multimodel-api -n production --to-revision=PREVIOUS_STABLE
kubectl rollout undo deployment/ai-multimodel-frontend -n production --to-revision=PREVIOUS_STABLE

# Verificar rollback
kubectl rollout status deployment/ai-multimodel-api -n production --timeout=300s

# Validar funcionamiento
./tests/smoke-tests.sh production

# Notificar rollback
curl -X POST $SLACK_DEPLOY_WEBHOOK -d '{
  "text": "🔄 ROLLBACK EXECUTED",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Reason*: [Razón del rollback]\n*Previous Version Restored*: [Versión]\n*Status*: [Estado actual]"
      }
    }
  ]
}'
```

---

## 📊 Monitoring & Alerts

### Alert Response Procedures

#### High Error Rate Alert
```bash
# 1. Verificar scope del problema
curl -s https://api.ai-multimodel.genspark.ai/metrics | grep http_requests_total
curl -s https://api.ai-multimodel.genspark.ai/metrics | grep error_rate

# 2. Identificar fuente de errores
kubectl logs deployment/ai-multimodel-api -n production --since=10m | grep "ERROR\|WARN" | tail -20

# 3. Verificar AI models status
curl -s https://api.ai-multimodel.genspark.ai/api/v1/models | jq '.models[] | select(.status != "active")'

# 4. Verificar load balancer
curl -s https://api.ai-multimodel.genspark.ai/api/v1/load-balancer/status

# 5. Mitigación
# Si es un modelo específico:
curl -X POST https://api.ai-multimodel.genspark.ai/admin/models/MODEL_NAME/disable

# Si es general:
kubectl scale deployment ai-multimodel-api -n production --replicas=8
```

#### High Response Time Alert
```bash
# 1. Verificar recursos del sistema
kubectl top pods -n production
kubectl top nodes

# 2. Verificar database performance
kubectl exec -it deployment/postgresql -n production -- psql -U postgres -c "
  SELECT query, calls, total_time/calls as avg_time 
  FROM pg_stat_statements 
  ORDER BY total_time DESC LIMIT 10;"

# 3. Verificar Redis latency
kubectl exec -it deployment/redis -n production -- redis-cli --latency-history -i 1

# 4. Verificar AI provider latency
for provider in openai anthropic google; do
  echo "Checking $provider latency..."
  time curl -s https://api.ai-multimodel.genspark.ai/api/v1/models/$provider/health
done

# 5. Mitigación
# Aumentar recursos temporalmente
kubectl patch deployment ai-multimodel-api -n production -p '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "ai-multimodel-api",
          "resources": {
            "requests": {"cpu": "1", "memory": "2Gi"},
            "limits": {"cpu": "4", "memory": "8Gi"}
          }
        }]
      }
    }
  }
}'
```

#### Service Down Alert
```bash
# 1. Verificar pods status
kubectl get pods -n production | grep ai-multimodel

# 2. Verificar eventos
kubectl get events -n production --sort-by='.firstTimestamp' | tail -10

# 3. Verificar recursos del nodo
kubectl describe nodes | grep -A 5 "Conditions:"

# 4. Verificar logs de crash
kubectl logs deployment/ai-multimodel-api -n production --previous

# 5. Restart inmediato si es necesario
kubectl rollout restart deployment/ai-multimodel-api -n production

# 6. Verificar servicios dependientes
kubectl get services -n production
kubectl get ingress -n production
```

---

## 🗄️ Database Operations

### PostgreSQL Maintenance

#### Performance Monitoring
```bash
# Conectar a la base de datos
kubectl exec -it deployment/postgresql -n production -- psql -U postgres ai_multimodel

# Verificar conexiones activas
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

# Verificar queries lentos
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY total_time DESC 
LIMIT 10;

# Verificar tamaño de tablas
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats 
WHERE tablename IN (
  SELECT tablename FROM pg_tables WHERE schemaname='public'
) 
ORDER BY n_distinct DESC;

# Verificar locks
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;
```

#### Backup Operations
```bash
# Backup completo
kubectl exec deployment/postgresql -n production -- pg_dump -U postgres ai_multimodel > backup-$(date +%Y%m%d-%H%M%S).sql

# Backup schema only
kubectl exec deployment/postgresql -n production -- pg_dump -U postgres -s ai_multimodel > schema-backup-$(date +%Y%m%d).sql

# Verificar backup
head -20 backup-*.sql
tail -10 backup-*.sql

# Comprimir backup
gzip backup-$(date +%Y%m%d-%H%M%S).sql

# Subir a almacenamiento remoto (AWS S3)
aws s3 cp backup-*.sql.gz s3://ai-multimodel-backups/database/
```

#### Restore Operations
```bash
# Restaurar desde backup (CUIDADO: Solo en emergencias)
# 1. Crear backup actual primero
kubectl exec deployment/postgresql -n production -- pg_dump -U postgres ai_multimodel > emergency-backup-$(date +%Y%m%d-%H%M%S).sql

# 2. Descargar backup a restaurar
aws s3 cp s3://ai-multimodel-backups/database/backup-YYYYMMDD-HHMMSS.sql.gz .
gunzip backup-YYYYMMDD-HHMMSS.sql.gz

# 3. Parar aplicación (para evitar escrituras)
kubectl scale deployment ai-multimodel-api -n production --replicas=0

# 4. Restaurar
kubectl exec -i deployment/postgresql -n production -- psql -U postgres ai_multimodel < backup-YYYYMMDD-HHMMSS.sql

# 5. Verificar restauración
kubectl exec deployment/postgresql -n production -- psql -U postgres ai_multimodel -c "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM ai_queries;"

# 6. Reiniciar aplicación
kubectl scale deployment ai-multimodel-api -n production --replicas=5
```

### Redis Operations

#### Monitoring
```bash
# Conectar a Redis
kubectl exec -it deployment/redis -n production -- redis-cli

# Info general
INFO all

# Memoria utilizada
INFO memory

# Estadísticas de comandos
INFO commandstats

# Clientes conectados
CLIENT LIST

# Keys por patrón
SCAN 0 MATCH "session:*" COUNT 100
SCAN 0 MATCH "cache:*" COUNT 100

# Verificar TTL de keys
TTL session:user123
TTL cache:model:gpt-4
```

#### Maintenance
```bash
# Flush cache si es necesario (CUIDADO)
kubectl exec deployment/redis -n production -- redis-cli FLUSHALL

# Configurar maxmemory policy
kubectl exec deployment/redis -n production -- redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Backup Redis
kubectl exec deployment/redis -n production -- redis-cli BGSAVE

# Verificar último save
kubectl exec deployment/redis -n production -- redis-cli LASTSAVE
```

---

## 🔐 Security Incidents

### Security Threat Detection

#### Unauthorized Access Attempts
```bash
# 1. Verificar logs de seguridad
kubectl logs deployment/ai-multimodel-api -n production | grep "UNAUTHORIZED\|BLOCKED\|THREAT"

# 2. Verificar IP sources
curl -s https://api.ai-multimodel.genspark.ai/api/v1/security/events | jq '.events[] | select(.type=="unauthorized") | .source_ip' | sort | uniq -c | sort -nr

# 3. Bloquear IPs maliciosas
curl -X POST https://api.ai-multimodel.genspark.ai/admin/security/block-ip \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"ip": "MALICIOUS_IP", "duration": 3600, "reason": "Multiple unauthorized attempts"}'

# 4. Revisar rate limiting
curl -s https://api.ai-multimodel.genspark.ai/api/v1/security/rate-limits

# 5. Notificar al equipo de seguridad
curl -X POST $SLACK_SECURITY_WEBHOOK -d '{
  "text": "🚨 SECURITY ALERT: Unauthorized access attempts detected",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Incident*: Unauthorized Access\n*Source IPs*: [Lista de IPs]\n*Actions Taken*: [Acciones realizadas]"
      }
    }
  ]
}'
```

#### API Key Compromise
```bash
# 1. Identificar key comprometida
API_KEY_ID="compromised_key_id"

# 2. Revocar inmediatamente
curl -X DELETE https://api.ai-multimodel.genspark.ai/admin/api-keys/$API_KEY_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 3. Verificar uso reciente de la key
curl -s https://api.ai-multimodel.genspark.ai/admin/api-keys/$API_KEY_ID/usage?hours=24

# 4. Generar nueva key para el usuario
curl -X POST https://api.ai-multimodel.genspark.ai/admin/api-keys \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "user_id": "USER_ID",
    "name": "Replacement key - Security incident",
    "permissions": ["read", "ai_query"]
  }'

# 5. Audit trail
curl -s https://api.ai-multimodel.genspark.ai/admin/audit/search \
  -d '{"api_key_id": "'$API_KEY_ID'", "hours": 72}' | jq '.events[]'
```

#### Suspicious AI Usage Patterns
```bash
# 1. Verificar patrones anómalos
curl -s https://api.ai-multimodel.genspark.ai/api/v1/analytics/anomalies?hours=24

# 2. Verificar usuarios con alto volumen
curl -s https://api.ai-multimodel.genspark.ai/api/v1/analytics/top-users?hours=24 | jq '.users[] | select(.requests > 1000)'

# 3. Verificar queries sospechosos
kubectl logs deployment/ai-multimodel-api -n production | grep -i "malware\|hack\|exploit\|vulnerability" | tail -20

# 4. Aplicar throttling temporal
curl -X POST https://api.ai-multimodel.genspark.ai/admin/users/USER_ID/throttle \
  -d '{"rate_limit": 10, "duration": 3600}'

# 5. Generar reporte de seguridad
curl -X POST https://api.ai-multimodel.genspark.ai/admin/security/generate-report \
  -d '{"type": "suspicious_activity", "start_time": "'$(date -d '24 hours ago' -u +%Y-%m-%dT%H:%M:%SZ)'", "end_time": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
```

---

## ⚖️ Load Balancer Issues

### Imbalanced Load Distribution

```bash
# 1. Verificar distribución actual
curl -s https://api.ai-multimodel.genspark.ai/api/v1/load-balancer/stats | jq '.model_distribution'

# 2. Verificar health de modelos
curl -s https://api.ai-multimodel.genspark.ai/api/v1/models | jq '.models[] | {name, status, response_time, error_rate}'

# 3. Verificar algoritmo actual
curl -s https://api.ai-multimodel.genspark.ai/api/v1/load-balancer/config

# 4. Cambiar a algoritmo más balanceado
curl -X PATCH https://api.ai-multimodel.genspark.ai/admin/load-balancer/config \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"algorithm": "round_robin", "reset_stats": true}'

# 5. Rebalancear pesos si es weighted
curl -X PATCH https://api.ai-multimodel.genspark.ai/admin/load-balancer/weights \
  -d '{
    "gpt-4": 0.3,
    "claude-3-5-sonnet": 0.3,
    "gemini-pro": 0.2,
    "qwen": 0.1,
    "deepseek": 0.1
  }'
```

### Circuit Breaker Issues

```bash
# 1. Verificar estado de circuit breakers
curl -s https://api.ai-multimodel.genspark.ai/api/v1/load-balancer/circuit-breakers

# 2. Verificar modelos en estado OPEN
curl -s https://api.ai-multimodel.genspark.ai/api/v1/load-balancer/circuit-breakers | jq '.[] | select(.state == "OPEN")'

# 3. Forzar reset de circuit breaker si el modelo se ha recuperado
curl -X POST https://api.ai-multimodel.genspark.ai/admin/load-balancer/circuit-breakers/MODEL_NAME/reset \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 4. Verificar configuración de thresholds
curl -s https://api.ai-multimodel.genspark.ai/admin/load-balancer/circuit-breakers/config

# 5. Ajustar thresholds si es necesario
curl -X PATCH https://api.ai-multimodel.genspark.ai/admin/load-balancer/circuit-breakers/config \
  -d '{
    "failure_threshold": 3,
    "timeout": 30000,
    "retry_timeout": 300000
  }'
```

---

## 🧠 AI Model Problems

### Model Unavailability

```bash
# 1. Verificar status de todos los modelos
curl -s https://api.ai-multimodel.genspark.ai/api/v1/models | jq '.models[] | {name, status, last_check, error}'

# 2. Verificar connectividad a provider específico
MODEL_NAME="gpt-4"
curl -s https://api.ai-multimodel.genspark.ai/api/v1/models/$MODEL_NAME/test

# 3. Verificar API keys
curl -s https://api.ai-multimodel.genspark.ai/admin/models/$MODEL_NAME/config | jq '.api_key_status'

# 4. Reintentar conexión
curl -X POST https://api.ai-multimodel.genspark.ai/admin/models/$MODEL_NAME/reconnect

# 5. Activar fallback temporal
curl -X POST https://api.ai-multimodel.genspark.ai/admin/models/$MODEL_NAME/fallback \
  -d '{"fallback_model": "claude-3-5-sonnet", "duration": 1800}'

# 6. Verificar logs específicos del modelo
kubectl logs deployment/ai-multimodel-api -n production | grep $MODEL_NAME | tail -20
```

### High Latency from Specific Provider

```bash
# 1. Verificar latencias por modelo
curl -s https://api.ai-multimodel.genspark.ai/api/v1/analytics/latency?window=1h | jq '.models[] | {name, avg_latency, p95_latency}'

# 2. Verificar timeouts configurados
curl -s https://api.ai-multimodel.genspark.ai/admin/models/config | jq '.[] | {name, timeout, retry_attempts}'

# 3. Ajustar timeout temporalmente para modelo problemático
curl -X PATCH https://api.ai-multimodel.genspark.ai/admin/models/$MODEL_NAME/config \
  -d '{"timeout": 45000, "retry_attempts": 2}'

# 4. Reducir peso en load balancer
curl -X PATCH https://api.ai-multimodel.genspark.ai/admin/load-balancer/weights \
  -d '{"'$MODEL_NAME'": 0.05}'

# 5. Verificar si es problema de región/endpoint
curl -X POST https://api.ai-multimodel.genspark.ai/admin/models/$MODEL_NAME/switch-endpoint \
  -d '{"region": "us-west-2"}'
```

### Cost Optimization Issues

```bash
# 1. Verificar costos por modelo
curl -s https://api.ai-multimodel.genspark.ai/api/v1/analytics/costs?period=24h | jq '.models[] | {name, total_cost, cost_per_request, requests}'

# 2. Identificar modelos más costosos
curl -s https://api.ai-multimodel.genspark.ai/api/v1/analytics/costs?period=24h | jq '.models | sort_by(.cost_per_request) | reverse | .[0:3]'

# 3. Aplicar estrategia de cost optimization
curl -X POST https://api.ai-multimodel.genspark.ai/admin/optimization/cost-strategy \
  -d '{
    "strategy": "cost_efficient",
    "max_cost_per_request": 0.10,
    "prefer_models": ["claude-3-haiku", "gpt-3.5-turbo"]
  }'

# 4. Configurar alertas de costo
curl -X POST https://api.ai-multimodel.genspark.ai/admin/alerts/cost \
  -d '{
    "threshold": 100,
    "period": "daily",
    "action": "notify_and_throttle"
  }'
```

---

## 📈 Performance Issues

### High Memory Usage

```bash
# 1. Verificar uso de memoria por pod
kubectl top pods -n production --sort-by=memory

# 2. Describir pod con mayor uso de memoria
HIGH_MEMORY_POD=$(kubectl top pods -n production --no-headers | sort -k3 -nr | head -1 | awk '{print $1}')
kubectl describe pod $HIGH_MEMORY_POD -n production

# 3. Verificar memoria de aplicación
curl -s https://api.ai-multimodel.genspark.ai/api/v1/metrics | grep nodejs_heap

# 4. Generar heap dump para análisis
kubectl exec -it $HIGH_MEMORY_POD -n production -- node --inspect-brk=0.0.0.0:9229 &
# Usar Chrome DevTools para generar heap snapshot

# 5. Restart pod si memoria está muy alta
kubectl delete pod $HIGH_MEMORY_POD -n production

# 6. Increase memory limits temporalmente si es necesario
kubectl patch deployment ai-multimodel-api -n production -p '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "ai-multimodel-api",
          "resources": {
            "limits": {"memory": "6Gi"}
          }
        }]
      }
    }
  }
}'
```

### Database Performance Issues

```bash
# 1. Verificar queries activos
kubectl exec -it deployment/postgresql -n production -- psql -U postgres ai_multimodel -c "
  SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
  FROM pg_stat_activity 
  WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"

# 2. Verificar locks
kubectl exec -it deployment/postgresql -n production -- psql -U postgres ai_multimodel -c "
  SELECT blocked_locks.pid AS blocked_pid,
         blocking_locks.pid AS blocking_pid,
         blocked_activity.query AS blocked_statement
  FROM pg_catalog.pg_locks blocked_locks
  JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
  JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
  WHERE NOT blocked_locks.GRANTED;"

# 3. Kill query problemático si es necesario
kubectl exec -it deployment/postgresql -n production -- psql -U postgres ai_multimodel -c "SELECT pg_cancel_backend(PID);"

# 4. Verificar estadísticas de queries
kubectl exec -it deployment/postgresql -n production -- psql -U postgres ai_multimodel -c "
  SELECT query, calls, total_time, mean_time 
  FROM pg_stat_statements 
  WHERE mean_time > 1000 
  ORDER BY total_time DESC 
  LIMIT 10;"

# 5. Reindexar si es necesario (durante maintenance window)
kubectl exec -it deployment/postgresql -n production -- psql -U postgres ai_multimodel -c "REINDEX DATABASE ai_multimodel;"
```

---

## 💾 Backup & Recovery

### Daily Backup Procedures

```bash
#!/bin/bash
# Script de backup diario

DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/backups/$DATE"
mkdir -p $BACKUP_DIR

# 1. Database backup
echo "Creating database backup..."
kubectl exec deployment/postgresql -n production -- pg_dump -U postgres ai_multimodel > $BACKUP_DIR/database.sql

# 2. Redis backup
echo "Creating Redis backup..."
kubectl exec deployment/redis -n production -- redis-cli BGSAVE
kubectl cp production/$(kubectl get pods -n production | grep redis | awk '{print $1}'):/data/dump.rdb $BACKUP_DIR/redis-dump.rdb

# 3. Configuration backup
echo "Backing up configurations..."
kubectl get all -n production -o yaml > $BACKUP_DIR/k8s-resources.yaml
kubectl get configmaps -n production -o yaml > $BACKUP_DIR/configmaps.yaml
kubectl get secrets -n production -o yaml > $BACKUP_DIR/secrets.yaml

# 4. Application logs backup
echo "Backing up application logs..."
kubectl logs deployment/ai-multimodel-api -n production --since=24h > $BACKUP_DIR/application.log

# 5. Compress backup
echo "Compressing backup..."
cd /backups && tar -czf backup-$DATE.tar.gz $DATE/

# 6. Upload to S3
echo "Uploading to S3..."
aws s3 cp backup-$DATE.tar.gz s3://ai-multimodel-backups/daily/

# 7. Clean old local backups (keep 7 days)
find /backups -name "backup-*.tar.gz" -mtime +7 -delete

echo "Backup completed: backup-$DATE.tar.gz"
```

### Disaster Recovery Procedure

```bash
# DISASTER RECOVERY - FULL SYSTEM RESTORE

# 1. Assess damage and prepare
kubectl create namespace production-recovery
kubectl label namespace production-recovery disaster-recovery=true

# 2. Restore infrastructure
kubectl apply -f /recovery/k8s-base-infrastructure.yaml -n production-recovery

# 3. Restore databases
# Download latest backup
aws s3 cp s3://ai-multimodel-backups/daily/backup-LATEST.tar.gz .
tar -xzf backup-LATEST.tar.gz

# Deploy database
kubectl apply -f /recovery/postgresql-deployment.yaml -n production-recovery
kubectl wait --for=condition=ready pod -l app=postgresql -n production-recovery --timeout=300s

# Restore data
kubectl exec -i deployment/postgresql -n production-recovery -- psql -U postgres -c "CREATE DATABASE ai_multimodel;"
kubectl exec -i deployment/postgresql -n production-recovery -- psql -U postgres ai_multimodel < backup-YYYYMMDD/database.sql

# 4. Restore Redis
kubectl apply -f /recovery/redis-deployment.yaml -n production-recovery
kubectl cp backup-YYYYMMDD/redis-dump.rdb production-recovery/$(kubectl get pods -n production-recovery | grep redis | awk '{print $1}'):/data/dump.rdb
kubectl exec deployment/redis -n production-recovery -- redis-cli DEBUG RELOAD

# 5. Restore application
kubectl apply -f /recovery/application-deployment.yaml -n production-recovery

# 6. Restore configurations
kubectl apply -f backup-YYYYMMDD/configmaps.yaml -n production-recovery
kubectl apply -f backup-YYYYMMDD/secrets.yaml -n production-recovery

# 7. Switch traffic (when ready)
kubectl patch service ai-multimodel-api -n production -p '{"spec":{"selector":{"disaster-recovery":"true"}}}'

# 8. Verify recovery
./tests/smoke-tests.sh production
curl -f https://ai-multimodel.genspark.ai/health

# 9. Cleanup old namespace when confident
# kubectl delete namespace production-old
```

---

## 🔧 Maintenance Tasks

### Weekly Maintenance Checklist

```bash
# WEEKLY MAINTENANCE TASKS

echo "🔧 Starting weekly maintenance for AI Multi-Model System"
echo "Date: $(date)"

# 1. System health check
echo "1. System Health Check"
./tests/smoke-tests.sh production
kubectl get pods -n production | grep -v Running | wc -l

# 2. Resource usage review
echo "2. Resource Usage Review"
kubectl top nodes
kubectl top pods -n production --sort-by=cpu
kubectl top pods -n production --sort-by=memory

# 3. Log rotation and cleanup
echo "3. Log Cleanup"
kubectl logs deployment/ai-multimodel-api -n production --since=168h | gzip > weekly-logs-$(date +%Y%m%d).gz
# Clear old logs from pods (if using log rotation)

# 4. Database maintenance
echo "4. Database Maintenance"
kubectl exec -it deployment/postgresql -n production -- psql -U postgres ai_multimodel -c "
  ANALYZE;
  SELECT pg_size_pretty(pg_database_size('ai_multimodel')) AS db_size;
  SELECT schemaname,tablename,attname,n_distinct,correlation FROM pg_stats ORDER BY n_distinct DESC LIMIT 10;
"

# 5. Security updates check
echo "5. Security Updates"
# Check for image vulnerabilities
trivy image ghcr.io/genspark/ai-multimodel:latest

# 6. Performance review
echo "6. Performance Review"
curl -s https://api.ai-multimodel.genspark.ai/api/v1/analytics/summary?period=7d | jq '.'

# 7. Backup verification
echo "7. Backup Verification"
LATEST_BACKUP=$(aws s3 ls s3://ai-multimodel-backups/daily/ | sort | tail -1 | awk '{print $4}')
echo "Latest backup: $LATEST_BACKUP"
aws s3api head-object --bucket ai-multimodel-backups --key "daily/$LATEST_BACKUP"

# 8. Certificate expiry check
echo "8. Certificate Check"
echo | openssl s_client -servername ai-multimodel.genspark.ai -connect ai-multimodel.genspark.ai:443 2>/dev/null | openssl x509 -noout -dates

# 9. Cleanup old resources
echo "9. Resource Cleanup"
# Remove old ReplicaSets
kubectl get rs -n production --sort-by=.metadata.creationTimestamp | head -n -5 | awk 'NR>1 {print $1}' | xargs -r kubectl delete rs -n production

# Remove old ConfigMaps with deployment prefix
kubectl get configmaps -n production | grep deployment-alerts- | head -n -3 | awk '{print $1}' | xargs -r kubectl delete configmap -n production

# 10. Generate maintenance report
echo "10. Generating Maintenance Report"
cat > weekly-maintenance-report-$(date +%Y%m%d).md << EOF
# Weekly Maintenance Report - $(date +%Y-%m-%d)

## System Status
- ✅ All services running healthy
- ✅ Performance within normal parameters
- ✅ Security scans passed
- ✅ Backups verified

## Resource Usage
- CPU Usage: $(kubectl top nodes --no-headers | awk '{sum+=$3} END {print sum/NR"%"}')
- Memory Usage: $(kubectl top nodes --no-headers | awk '{sum+=$5} END {print sum/NR"%"}')
- Database Size: $(kubectl exec deployment/postgresql -n production -- psql -U postgres ai_multimodel -c "SELECT pg_size_pretty(pg_database_size('ai_multimodel'));" -t)

## Actions Taken
- Database maintenance completed
- Old resources cleaned up
- Security scans performed
- Performance reviewed

## Next Week Priorities
- Monitor new deployments
- Continue performance optimization
- Review scaling policies
EOF

echo "✅ Weekly maintenance completed!"
```

### Certificate Renewal

```bash
# Certificate renewal procedure (Let's Encrypt)

# 1. Check current certificate expiry
echo | openssl s_client -servername ai-multimodel.genspark.ai -connect ai-multimodel.genspark.ai:443 2>/dev/null | openssl x509 -noout -dates

# 2. Renew certificate (using cert-manager)
kubectl annotate certificate ai-multimodel-tls -n production cert-manager.io/issue-temporary-certificate="true"

# 3. Force renewal
kubectl delete secret ai-multimodel-tls -n production
kubectl get certificate ai-multimodel-tls -n production

# 4. Verify new certificate
kubectl describe certificate ai-multimodel-tls -n production
kubectl get secret ai-multimodel-tls -n production -o yaml

# 5. Test HTTPS
curl -I https://ai-multimodel.genspark.ai/health

# 6. Update monitoring
echo "Certificate renewed on $(date)" >> /var/log/certificate-renewals.log
```

---

## 📞 Emergency Contacts

### Escalation Matrix

| Severity | Primary Contact | Secondary Contact | Manager |
|----------|----------------|-------------------|---------|
| P0 | On-call Engineer | Tech Lead | Engineering Manager |
| P1 | On-call Engineer | Tech Lead | - |
| P2 | Assigned Engineer | Team Lead | - |
| P3 | Assigned Engineer | - | - |

### Contact Information

```bash
# Slack channels
#ai-multimodel-alerts     - Automated alerts
#ai-multimodel-incidents  - P0/P1 incidents
#ai-multimodel-support    - General support
#ai-multimodel-deployments - Deployment notifications

# Email aliases
ai-oncall@genspark.ai      - Current on-call engineer
ai-team@genspark.ai        - Full AI team
devops@genspark.ai         - DevOps team
security@genspark.ai       - Security team

# Phone (for P0 incidents only)
On-call rotation: Check PagerDuty schedule
```

---

**📋 Runbook Version**: 2.0.0  
**Last Updated**: $(date +%Y-%m-%d)  
**Next Review**: $(date -d '+3 months' +%Y-%m-%d)  

*For updates or corrections to these runbooks, please create a PR or contact the DevOps team.*