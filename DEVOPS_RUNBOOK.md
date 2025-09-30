# 🚀 DevOps Runbook - AI Multi-Model Management System

## 📋 Overview
Comprehensive operational guide for maintaining, troubleshooting, and scaling the AI Multi-Model Management System in production environments.

---

## 🎯 Quick Reference

### 📞 **Emergency Contacts**
- **On-Call Engineer**: Slack `@devops-oncall` or PagerDuty
- **System Architect**: `@ai-platform-team`
- **Security Team**: `@security-team`
- **Management Escalation**: `@engineering-manager`

### 🔗 **Critical Links**
- **Monitoring**: https://grafana.ai-multimodel.genspark.ai
- **Status Page**: https://status.ai-multimodel.genspark.ai
- **Logs**: https://kibana.ai-multimodel.genspark.ai
- **CI/CD**: https://github.com/spirittours/-spirittours-s-Plataform/actions
- **Documentation**: https://docs.ai-multimodel.genspark.ai

---

## 🚨 INCIDENT RESPONSE PROCEDURES

### ⚡ **P0 - Critical (System Down)**

#### 🔍 **Immediate Actions (First 5 Minutes)**
```bash
# 1. Acknowledge the incident
curl -X POST "https://api.pagerduty.com/incidents/acknowledge" \
  -H "Authorization: Token token=$PD_TOKEN"

# 2. Check system health
kubectl get pods -n production -o wide
kubectl get services -n production
curl -f https://ai-multimodel.genspark.ai/health

# 3. Check recent deployments
kubectl rollout history deployment/ai-multimodel-api -n production
git log --oneline -n 10

# 4. Update status page
curl -X POST "https://api.statuspage.io/v1/pages/$PAGE_ID/incidents" \
  -H "Authorization: OAuth $STATUSPAGE_TOKEN"
```

#### 🛠️ **Investigation Steps (5-15 Minutes)**
```bash
# Check application logs
kubectl logs deployment/ai-multimodel-api -n production --tail=100

# Check system resources
kubectl top pods -n production
kubectl top nodes

# Check external dependencies
curl -f https://api.openai.com/v1/models
curl -f https://api.anthropic.com/v1/health
redis-cli -h redis.production ping
psql -h postgres.production -c "SELECT 1"

# Check load balancer
kubectl get ingress -n production
curl -I https://ai-multimodel.genspark.ai
```

#### 🔄 **Recovery Actions**
```bash
# Option 1: Restart problematic pods
kubectl rollout restart deployment/ai-multimodel-api -n production
kubectl rollout status deployment/ai-multimodel-api -n production --timeout=300s

# Option 2: Scale up resources
kubectl scale deployment/ai-multimodel-api --replicas=10 -n production

# Option 3: Emergency rollback
PREVIOUS_REVISION=$(kubectl rollout history deployment/ai-multimodel-api -n production | tail -n 2 | head -n 1 | awk '{print $1}')
kubectl rollout undo deployment/ai-multimodel-api -n production --to-revision=$PREVIOUS_REVISION

# Option 4: Traffic diversion
kubectl patch service ai-multimodel-api -n production -p '{"spec":{"selector":{"version":"blue"}}}'
```

### ⚠️ **P1 - High (Major Feature Broken)**

#### 🔍 **Investigation Process**
```bash
# Identify affected component
kubectl get pods -n production -l app=ai-multimodel-api
kubectl describe pod <failing-pod> -n production

# Check specific service logs
kubectl logs -l app=ai-multimodel-api -n production --since=30m | grep ERROR

# Verify AI model connectivity
curl -X POST "https://api.ai-multimodel.genspark.ai/api/v1/models/test" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{"model": "gpt-4", "prompt": "test"}'

# Check database connectivity
kubectl exec -it deployment/postgres -n production -- \
  psql -c "SELECT COUNT(*) FROM ai_requests WHERE created_at > NOW() - INTERVAL '1 hour'"
```

#### 🛠️ **Resolution Steps**
```bash
# Restart specific service
kubectl rollout restart deployment/ai-multimodel-api -n production

# Check configuration
kubectl get configmap ai-multimodel-config -n production -o yaml

# Validate secrets
kubectl get secrets ai-multimodel-secrets -n production -o yaml

# Test AI provider endpoints
for provider in openai anthropic google; do
  echo "Testing $provider..."
  curl -f "https://api.$provider.com/health" || echo "$provider failed"
done
```

---

## 📊 MONITORING & ALERTING

### 🎯 **Key Metrics Dashboard**
```bash
# CPU and Memory Usage
kubectl top pods -n production --sort-by=cpu
kubectl top pods -n production --sort-by=memory

# Request Rate and Response Time
curl -s "https://prometheus.ai-multimodel.genspark.ai/api/v1/query?query=rate(http_requests_total[5m])"
curl -s "https://prometheus.ai-multimodel.genspark.ai/api/v1/query?query=histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"

# Error Rate
curl -s "https://prometheus.ai-multimodel.genspark.ai/api/v1/query?query=rate(http_requests_total{status=~'5..'}[5m])/rate(http_requests_total[5m])"
```

### 🚨 **Alert Thresholds**
| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CPU Usage | 70% | 85% | Scale up |
| Memory Usage | 80% | 90% | Investigate leak |
| Error Rate | 2% | 5% | Check logs |
| Response Time | 1.5s | 3s | Optimize |
| Disk Space | 80% | 90% | Clean up |

### 📧 **Alert Routing**
```yaml
# Alertmanager routing
route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
  - match:
      severity: critical
    receiver: pagerduty
  - match:
      severity: warning  
    receiver: slack
```

---

## 🚀 DEPLOYMENT PROCEDURES

### 📦 **Standard Deployment**
```bash
# 1. Pre-deployment checks
git pull origin main
npm test
docker build -t ai-multimodel:$VERSION .

# 2. Deploy to staging
kubectl set image deployment/ai-multimodel-api ai-multimodel-api=ai-multimodel:$VERSION -n staging
kubectl rollout status deployment/ai-multimodel-api -n staging --timeout=600s

# 3. Run smoke tests
./tests/smoke-tests.sh staging

# 4. Deploy to production (Blue-Green)
kubectl apply -f infrastructure/k8s/production/deployment-green.yaml
kubectl rollout status deployment/ai-multimodel-api-green -n production --timeout=900s

# 5. Health check green environment
kubectl port-forward service/ai-multimodel-api-green 8081:80 -n production &
sleep 10
curl -f http://localhost:8081/health

# 6. Switch traffic
kubectl patch service ai-multimodel-api -n production -p '{"spec":{"selector":{"version":"green"}}}'

# 7. Monitor for 15 minutes
sleep 900
curl -f https://ai-multimodel.genspark.ai/health

# 8. Clean up old deployment
kubectl delete deployment ai-multimodel-api-blue -n production
```

### 🔄 **Emergency Rollback**
```bash
# Immediate rollback
kubectl rollout undo deployment/ai-multimodel-api -n production

# Rollback to specific version
kubectl rollout undo deployment/ai-multimodel-api -n production --to-revision=5

# Check rollback status
kubectl rollout status deployment/ai-multimodel-api -n production

# Verify health after rollback
curl -f https://ai-multimodel.genspark.ai/health
```

### 🧪 **Canary Deployment**
```bash
# Deploy canary version (10% traffic)
kubectl apply -f infrastructure/k8s/production/canary-deployment.yaml
kubectl patch service ai-multimodel-api -n production -p '{"spec":{"selector":{"version":"canary"}}}'

# Monitor canary metrics
kubectl get pods -l version=canary -n production
curl -s "https://prometheus.ai-multimodel.genspark.ai/api/v1/query?query=rate(http_requests_total{version='canary'}[5m])"

# Promote canary if successful
kubectl scale deployment/ai-multimodel-api-canary --replicas=5 -n production
kubectl scale deployment/ai-multimodel-api --replicas=0 -n production
```

---

## 📊 SCALING OPERATIONS

### 📈 **Auto-Scaling Configuration**
```yaml
# HPA Configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ai-multimodel-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ai-multimodel-api
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### ⚡ **Manual Scaling**
```bash
# Scale up for high load
kubectl scale deployment/ai-multimodel-api --replicas=20 -n production

# Scale down during low traffic
kubectl scale deployment/ai-multimodel-api --replicas=3 -n production

# Check scaling status
kubectl get hpa -n production
kubectl get pods -n production -l app=ai-multimodel-api
```

### 🌍 **Multi-Region Scaling**
```bash
# Deploy to additional regions
kubectl config use-context us-west-2
kubectl apply -f infrastructure/k8s/production/

kubectl config use-context eu-west-1  
kubectl apply -f infrastructure/k8s/production/

# Configure global load balancer
aws route53 create-traffic-policy --name ai-multimodel-global \
  --document file://traffic-policy.json
```

---

## 🔧 MAINTENANCE PROCEDURES

### 📅 **Scheduled Maintenance**

#### 🔄 **Weekly Tasks**
```bash
#!/bin/bash
# Weekly maintenance script

# Update system packages
kubectl get nodes -o name | xargs -I {} kubectl drain {} --ignore-daemonsets --delete-emptydir-data
sudo apt update && sudo apt upgrade -y
kubectl uncordon node-name

# Database maintenance
kubectl exec -it deployment/postgres -n production -- \
  psql -c "VACUUM ANALYZE; REINDEX DATABASE ai_multimodel;"

# Clean up old logs
kubectl delete pods -n production -l app=logrotate
find /var/log -name "*.log.*.gz" -mtime +7 -delete

# Certificate renewal check
kubectl get certificates -n production -o custom-columns=NAME:.metadata.name,READY:.status.conditions[-1].status,AGE:.metadata.creationTimestamp

# Backup verification
aws s3 ls s3://ai-multimodel-backups/$(date +%Y-%m-%d)/
```

#### 🗓️ **Monthly Tasks**
```bash
#!/bin/bash
# Monthly maintenance script

# Security updates
kubectl get images --all-namespaces -o jsonpath='{.items[*].spec.containers[*].image}' | \
  xargs -n1 -I{} trivy image {}

# Performance optimization
kubectl exec -it deployment/postgres -n production -- \
  psql -c "SELECT schemaname, tablename, attname, n_distinct, correlation FROM pg_stats WHERE schemaname = 'public' ORDER BY n_distinct DESC LIMIT 20;"

# Capacity planning
kubectl describe nodes | grep -A 5 "Allocated resources"
kubectl top nodes --sort-by=cpu

# Cost optimization review
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

### 🗄️ **Database Maintenance**
```bash
# Daily backup
kubectl exec -it deployment/postgres -n production -- \
  pg_dump ai_multimodel | gzip > backup-$(date +%Y%m%d).sql.gz

# Upload to S3
aws s3 cp backup-$(date +%Y%m%d).sql.gz s3://ai-multimodel-backups/

# Database performance tuning
kubectl exec -it deployment/postgres -n production -- psql -c "
  SELECT query, calls, total_time, mean_time, rows
  FROM pg_stat_statements
  ORDER BY total_time DESC
  LIMIT 10;
"

# Index optimization
kubectl exec -it deployment/postgres -n production -- psql -c "
  SELECT schemaname, tablename, attname, n_distinct, correlation
  FROM pg_stats
  WHERE schemaname = 'public'
  ORDER BY n_distinct DESC;
"
```

---

## 🛡️ SECURITY OPERATIONS

### 🔒 **Security Monitoring**
```bash
# Check for unauthorized access attempts
kubectl logs -l app=ai-multimodel-api -n production | grep "401\|403" | tail -50

# Scan for vulnerabilities
trivy image ghcr.io/genspark/ai-multimodel:latest

# Certificate monitoring
kubectl get certificates -n production -o custom-columns=NAME:.metadata.name,READY:.status.conditions[-1].status,EXPIRY:.status.notAfter

# Security audit
kubectl auth can-i --list --as=system:serviceaccount:production:ai-multimodel
```

### 🚨 **Incident Response**
```bash
# Isolate compromised pod
kubectl label pod suspicious-pod-name quarantine=true -n production
kubectl patch networkpolicy default-deny -n production --type='json' -p='[{"op": "add", "path": "/spec/podSelector/matchLabels/quarantine", "value": "true"}]'

# Rotate secrets
kubectl delete secret ai-multimodel-secrets -n production
kubectl create secret generic ai-multimodel-secrets --from-env-file=.env.production -n production
kubectl rollout restart deployment/ai-multimodel-api -n production

# Security scan
nmap -sV -O ai-multimodel.genspark.ai
```

---

## 🔍 TROUBLESHOOTING GUIDE

### 🐛 **Common Issues**

#### Issue: High CPU Usage
```bash
# Identify high CPU pods
kubectl top pods -n production --sort-by=cpu

# Profile application
kubectl exec -it <high-cpu-pod> -n production -- \
  node --prof --prof-process app.js

# Check for memory leaks
kubectl exec -it <pod-name> -n production -- \
  node -e "console.log(process.memoryUsage())"

# Scale temporarily
kubectl scale deployment/ai-multimodel-api --replicas=10 -n production
```

#### Issue: Database Connection Errors
```bash
# Check database connectivity
kubectl exec -it deployment/postgres -n production -- psql -c "SELECT 1"

# Check connection pool
kubectl exec -it deployment/ai-multimodel-api -n production -- \
  node -e "console.log(require('./config/database').pool.totalCount)"

# Check for blocking queries
kubectl exec -it deployment/postgres -n production -- psql -c "
  SELECT pid, now() - pg_stat_activity.query_start AS duration, query
  FROM pg_stat_activity
  WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
"
```

#### Issue: AI Provider Rate Limits
```bash
# Check rate limit headers
curl -I "https://api.openai.com/v1/models" \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Switch to backup providers
kubectl patch configmap ai-multimodel-config -n production \
  --type='json' -p='[{"op": "replace", "path": "/data/FALLBACK_PROVIDERS", "value": "anthropic,google"}]'

# Monitor usage
curl "https://api.openai.com/v1/usage" \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### 📋 **Diagnostic Commands**
```bash
# System health overview
kubectl get all -n production
kubectl top nodes
kubectl top pods -n production

# Network diagnostics
kubectl exec -it <pod-name> -n production -- nslookup ai-multimodel.genspark.ai
kubectl exec -it <pod-name> -n production -- curl -I https://api.openai.com

# Storage diagnostics
kubectl get pv,pvc -n production
df -h /var/lib/docker

# Application diagnostics
kubectl logs -l app=ai-multimodel-api -n production --tail=100
kubectl describe pod <pod-name> -n production
```

---

## 📊 PERFORMANCE OPTIMIZATION

### ⚡ **Application Optimization**
```bash
# Enable performance profiling
kubectl patch deployment ai-multimodel-api -n production -p '{"spec":{"template":{"spec":{"containers":[{"name":"ai-multimodel-api","env":[{"name":"NODE_OPTIONS","value":"--prof"}]}]}}}}'

# Database query optimization
kubectl exec -it deployment/postgres -n production -- psql -c "
  CREATE INDEX CONCURRENTLY idx_ai_requests_created_model ON ai_requests(created_at, model_name);
  CREATE INDEX CONCURRENTLY idx_users_last_activity ON users(last_activity) WHERE active = true;
"

# Redis optimization
kubectl exec -it deployment/redis -n production -- redis-cli CONFIG SET maxmemory-policy allkeys-lru
kubectl exec -it deployment/redis -n production -- redis-cli CONFIG SET save ""
```

### 🚀 **Infrastructure Optimization**
```bash
# Node optimization
kubectl patch node node-name -p '{"spec":{"taints":[{"key":"high-performance","value":"true","effect":"NoSchedule"}]}}'

# Pod resource optimization
kubectl patch deployment ai-multimodel-api -n production -p '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "ai-multimodel-api",
          "resources": {
            "requests": {"cpu": "500m", "memory": "1Gi"},
            "limits": {"cpu": "2", "memory": "4Gi"}
          }
        }]
      }
    }
  }
}'

# Network optimization
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ai-multimodel-optimized
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: ai-multimodel-api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 443
    - protocol: TCP
      port: 80
EOF
```

---

## 📋 CHECKLISTS

### ✅ **Pre-Deployment Checklist**
- [ ] All tests passing in CI/CD
- [ ] Security scan completed
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Rollback plan prepared
- [ ] Monitoring alerts configured
- [ ] Stakeholders notified

### ✅ **Post-Deployment Checklist**
- [ ] Health checks passing
- [ ] Smoke tests completed
- [ ] Performance metrics normal
- [ ] Error rates within limits
- [ ] User acceptance verified
- [ ] Monitoring dashboards updated
- [ ] Documentation updated

### ✅ **Incident Response Checklist**
- [ ] Incident acknowledged < 5 minutes
- [ ] Stakeholders notified
- [ ] Status page updated
- [ ] Investigation started
- [ ] Logs collected
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Solution verified
- [ ] Post-mortem scheduled

---

## 📞 ESCALATION PROCEDURES

### 📈 **Escalation Matrix**
| Time | P0 Critical | P1 High | P2 Medium |
|------|-------------|---------|-----------|
| 0-5 min | On-call Engineer | On-call Engineer | Assignee |
| 15 min | Team Lead | Team Lead | Team Lead |
| 30 min | Engineering Manager | Engineering Manager | - |
| 1 hour | VP Engineering | - | - |
| 2 hours | CTO | - | - |

### 📞 **Contact Information**
```bash
# PagerDuty integration
curl -X POST "https://events.pagerduty.com/v2/enqueue" \
  -H "Content-Type: application/json" \
  -d '{
    "routing_key": "$PAGERDUTY_INTEGRATION_KEY",
    "event_action": "trigger",
    "payload": {
      "summary": "P0: AI Multi-Model System Down",
      "source": "monitoring",
      "severity": "critical"
    }
  }'

# Slack notification
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "🚨 P0 Incident: AI Multi-Model System requires immediate attention",
    "channel": "#ops-alerts"
  }'
```

---

## 🎯 Success Metrics

### 📊 **Operational KPIs**
- **Mean Time to Recovery (MTTR)**: < 15 minutes
- **Mean Time to Detection (MTTD)**: < 2 minutes  
- **Deployment Success Rate**: > 99%
- **System Uptime**: > 99.99%
- **Alert Noise Ratio**: < 5%

### 📈 **Performance Targets**
- **API Response Time**: < 2s (P95)
- **Throughput**: > 1000 RPS
- **Error Rate**: < 0.1%
- **Resource Utilization**: 60-80% CPU/Memory
- **Cost per Request**: < $0.10

---

**🎯 This runbook is a living document. Update it regularly based on operational learnings and system changes.**

*For questions or improvements, contact the DevOps team at `#devops-team` on Slack.*