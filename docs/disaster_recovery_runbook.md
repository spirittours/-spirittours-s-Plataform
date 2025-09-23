# Spirit Tours - Disaster Recovery & Rollback Runbook

## 🚨 Emergency Contacts & Escalation

**Primary Contacts:**
- **Technical Lead:** admin@spirittours.com
- **DevOps Team:** devops@spirittours.com  
- **Emergency Hotline:** +1-XXX-XXX-XXXX

**Escalation Matrix:**
1. **Level 1 (0-15 minutes):** On-call Engineer
2. **Level 2 (15-30 minutes):** Technical Lead + DevOps Team
3. **Level 3 (30+ minutes):** CTO + Infrastructure Team
4. **Level 4 (1+ hour):** Executive Team + External Vendors

---

## 📋 Quick Reference Commands

### System Status Check
```bash
# Check overall system health
cd /home/user/webapp && python scripts/disaster_recovery_cli.py health

# View current recovery operations
cd /home/user/webapp && python scripts/disaster_recovery_cli.py status

# List available recovery points
cd /home/user/webapp && python scripts/disaster_recovery_cli.py list-recovery-points --days 7
```

### Emergency Operations
```bash
# Create immediate recovery point
cd /home/user/webapp && python scripts/disaster_recovery_cli.py create-recovery-point emergency_$(date +%Y%m%d_%H%M%S)

# Emergency system stop
cd /home/user/webapp && python scripts/disaster_recovery_cli.py disaster-recovery emergency_stop --emergency

# Quick rollback to last known good version
cd /home/user/webapp && python scripts/disaster_recovery_cli.py rollback v1.2.3 --force --non-interactive
```

---

## 🎯 Disaster Recovery Scenarios

### Scenario 1: Application Server Failure

**Symptoms:**
- High error rates (>5%)
- Service unavailable responses
- Memory/CPU exhaustion

**Response Steps:**
1. **Immediate Assessment (0-2 minutes)**
   ```bash
   # Check service health
   cd /home/user/webapp && python scripts/disaster_recovery_cli.py health
   
   # Check system resources
   top
   df -h
   free -h
   ```

2. **Create Recovery Point (2-3 minutes)**
   ```bash
   cd /home/user/webapp && python scripts/disaster_recovery_cli.py create-recovery-point "pre_service_recovery_$(date +%Y%m%d_%H%M%S)"
   ```

3. **Execute Service Recovery (3-8 minutes)**
   ```bash
   cd /home/user/webapp && python scripts/disaster_recovery_cli.py disaster-recovery service_recovery
   ```

4. **Verification (8-10 minutes)**
   - Monitor application metrics
   - Run smoke tests
   - Verify user accessibility

**Rollback Plan:**
If service recovery fails, execute immediate rollback:
```bash
cd /home/user/webapp && python scripts/disaster_recovery_cli.py rollback [LAST_KNOWN_GOOD_VERSION] --force
```

---

### Scenario 2: Database Failure

**Symptoms:**
- Database connection failures
- High query latency
- Data corruption alerts

**Response Steps:**
1. **Immediate Assessment (0-2 minutes)**
   ```bash
   # Check database connectivity
   psql -h localhost -U spirittours_user -d spirittours_db -c "SELECT 1;"
   
   # Check database processes
   ps aux | grep postgres
   ```

2. **Activate Standby Database (2-5 minutes)**
   ```bash
   cd /home/user/webapp && python scripts/disaster_recovery_cli.py disaster-recovery failover --emergency
   ```

3. **Update Application Configuration (5-7 minutes)**
   - Update database connection strings
   - Restart application services
   - Update load balancer configuration

4. **Data Integrity Verification (7-15 minutes)**
   ```bash
   # Run data integrity checks
   cd /home/user/webapp && python backend/scripts/verify_data_integrity.py
   ```

**Rollback Plan:**
If failover causes issues, restore from backup:
```bash
cd /home/user/webapp && python scripts/disaster_recovery_cli.py disaster-recovery restore
```

---

### Scenario 3: Infrastructure Failure

**Symptoms:**
- Node/server unreachable
- Storage system failure
- Network partition

**Response Steps:**
1. **Assessment & Notification (0-3 minutes)**
   ```bash
   # Check infrastructure status
   kubectl get nodes
   docker ps --all
   
   # Notify stakeholders
   cd /home/user/webapp && python scripts/send_emergency_notification.py "Infrastructure failure detected"
   ```

2. **Failover to Backup Infrastructure (3-10 minutes)**
   ```bash
   cd /home/user/webapp && python scripts/disaster_recovery_cli.py disaster-recovery infrastructure_recovery --emergency
   ```

3. **DNS/Load Balancer Updates (10-15 minutes)**
   - Update DNS records to point to backup infrastructure
   - Reconfigure load balancers
   - Update monitoring systems

4. **Service Validation (15-25 minutes)**
   - Verify all services are running on backup infrastructure
   - Run comprehensive integration tests
   - Monitor system performance

---

### Scenario 4: Deployment Rollback

**Symptoms:**
- New deployment causing issues
- Feature flags triggering problems
- Performance degradation after release

**Response Steps:**
1. **Stop Current Deployment (0-1 minute)**
   ```bash
   # Stop ongoing deployment
   cd /home/user/webapp && docker-compose down
   ```

2. **Create Emergency Recovery Point (1-2 minutes)**
   ```bash
   cd /home/user/webapp && python scripts/disaster_recovery_cli.py create-recovery-point "pre_rollback_$(date +%Y%m%d_%H%M%S)"
   ```

3. **Execute Rollback (2-10 minutes)**
   ```bash
   # Rollback to previous version
   cd /home/user/webapp && python scripts/disaster_recovery_cli.py rollback [PREVIOUS_VERSION] --force --non-interactive
   ```

4. **Post-Rollback Verification (10-15 minutes)**
   - Verify service functionality
   - Check database integrity
   - Run smoke tests
   - Monitor error rates

---

## 🔧 Detailed Recovery Procedures

### Database Recovery Procedures

#### 1. Point-in-Time Recovery
```bash
# List available database backups
ls -la /backups/database/

# Restore database to specific point in time
pg_restore --verbose --clean --no-acl --no-owner \
  -h localhost -U spirittours_user -d spirittours_db \
  /backups/database/backup_YYYYMMDD_HHMMSS.sql

# Verify restoration
psql -h localhost -U spirittours_user -d spirittours_db -c "\dt"
```

#### 2. Standby Database Activation
```bash
# Stop primary database
sudo systemctl stop postgresql

# Promote standby to primary
pg_ctl promote -D /var/lib/postgresql/13/standby

# Update application configuration
sed -i 's/localhost:5432/localhost:5433/g' /home/user/webapp/.env

# Restart application services
cd /home/user/webapp && docker-compose restart
```

### Application Recovery Procedures

#### 1. Container Recovery
```bash
# Stop all containers
cd /home/user/webapp && docker-compose down

# Pull latest images
cd /home/user/webapp && docker-compose pull

# Start services with health checks
cd /home/user/webapp && docker-compose up -d

# Monitor container health
cd /home/user/webapp && docker-compose logs -f
```

#### 2. Code Rollback
```bash
# Backup current code
cd /home/user/webapp && tar -czf /backups/current_code_$(date +%Y%m%d_%H%M%S).tar.gz .

# Fetch target version
cd /home/user/webapp && git fetch origin

# Rollback to specific commit/tag
cd /home/user/webapp && git reset --hard [TARGET_VERSION]

# Rebuild and restart
cd /home/user/webapp && docker-compose build --no-cache
cd /home/user/webapp && docker-compose up -d
```

### Configuration Recovery

#### 1. Environment Configuration
```bash
# Backup current configuration
cp /home/user/webapp/.env /backups/config_backup_$(date +%Y%m%d_%H%M%S).env

# Restore from backup
cp /backups/config/env_[VERSION].backup /home/user/webapp/.env

# Validate configuration
cd /home/user/webapp && python -c "import os; from dotenv import load_dotenv; load_dotenv(); print('Config loaded successfully')"
```

#### 2. Load Balancer Configuration
```bash
# Backup current nginx config
cp /etc/nginx/nginx.conf /backups/nginx_backup_$(date +%Y%m%d_%H%M%S).conf

# Restore configuration
cp /backups/config/nginx_[VERSION].conf /etc/nginx/nginx.conf

# Test and reload
nginx -t && nginx -s reload
```

---

## 📊 Monitoring & Health Checks

### Automated Health Monitoring
```bash
# Set up continuous health monitoring
cd /home/user/webapp && python scripts/continuous_health_monitor.py &

# Check specific service health
curl -f http://localhost:8000/health || echo "API health check failed"
curl -f http://localhost:3000/ || echo "Frontend health check failed"
curl -f http://localhost:6379/ping || echo "Redis health check failed"
```

### Performance Monitoring
```bash
# Monitor system resources
watch -n 5 'free -h && df -h && uptime'

# Monitor application metrics
cd /home/user/webapp && python scripts/collect_metrics.py --interval 10

# Database performance monitoring
psql -h localhost -U spirittours_user -d spirittours_db -c "
SELECT 
  query, 
  calls, 
  total_time, 
  mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;"
```

### Log Analysis
```bash
# Check application logs for errors
cd /home/user/webapp && tail -f logs/application.log | grep -i error

# Check system logs
sudo journalctl -f -u spirittours-*

# Check Docker container logs
cd /home/user/webapp && docker-compose logs --tail=100 -f
```

---

## 🧪 Testing & Validation

### Pre-Recovery Testing
```bash
# Run system health checks
cd /home/user/webapp && python scripts/disaster_recovery_cli.py health

# Validate backup integrity
cd /home/user/webapp && python scripts/validate_backups.py

# Test recovery procedures (dry run)
cd /home/user/webapp && python scripts/disaster_recovery_cli.py rollback v1.2.3 --dry-run
```

### Post-Recovery Validation
```bash
# Run smoke tests
cd /home/user/webapp && python tests/smoke_tests.py

# Run integration tests
cd /home/user/webapp && python -m pytest tests/integration/ -v

# Validate data integrity
cd /home/user/webapp && python backend/scripts/verify_data_integrity.py

# Performance validation
cd /home/user/webapp && python scripts/performance_validation.py
```

### User Acceptance Testing
1. **Core Functionality Tests:**
   - User login/registration
   - Call processing workflow
   - Appointment scheduling
   - Payment processing

2. **API Endpoint Tests:**
   ```bash
   # Test critical API endpoints
   curl -X GET http://localhost:8000/api/health
   curl -X POST http://localhost:8000/api/auth/login -d '{"username":"test","password":"test"}'
   curl -X GET http://localhost:8000/api/calls/recent
   ```

3. **Frontend Validation:**
   - Navigate to http://localhost:3000
   - Test user workflows
   - Verify data display
   - Check responsive design

---

## 📝 Communication & Documentation

### Incident Communication Template

**Subject:** [SEVERITY] Spirit Tours System Incident - [BRIEF DESCRIPTION]

**Status:** [INVESTIGATING/IDENTIFIED/MONITORING/RESOLVED]

**Start Time:** [YYYY-MM-DD HH:MM UTC]

**Impact:** [Description of user/business impact]

**Root Cause:** [If identified]

**Current Actions:**
- [Action 1]
- [Action 2]
- [Action 3]

**Next Update:** [Time of next update]

**Incident Commander:** [Name and contact]

### Post-Incident Documentation

1. **Incident Timeline:**
   - Detection time
   - Response actions
   - Resolution time
   - Communication timestamps

2. **Root Cause Analysis:**
   - Contributing factors
   - System failures
   - Process gaps
   - Human errors

3. **Lessons Learned:**
   - What worked well
   - What could be improved
   - Process changes needed
   - Technical improvements

4. **Action Items:**
   - Immediate fixes
   - Long-term improvements
   - Process updates
   - Training needs

---

## 🔐 Security Considerations

### Access Control
- Disaster recovery operations require elevated privileges
- Use multi-factor authentication for emergency access
- Log all recovery operations with operator identification
- Implement approval workflows for critical operations

### Data Protection
```bash
# Verify backup encryption
cd /home/user/webapp && python scripts/verify_backup_encryption.py

# Secure credential management
export SPIRITTOURS_DB_PASSWORD=$(cat /secrets/db_password)
export SPIRITTOURS_API_KEY=$(cat /secrets/api_key)

# Audit data access
cd /home/user/webapp && python scripts/audit_data_access.py
```

### Network Security
- Ensure recovery operations use secure connections
- Validate certificate integrity during recovery
- Monitor for unauthorized access during incidents
- Update firewall rules for backup infrastructure

---

## 📈 Performance Optimization

### Recovery Time Objectives (RTO)
- **Application Recovery:** < 15 minutes
- **Database Recovery:** < 30 minutes  
- **Full System Recovery:** < 60 minutes
- **Data Recovery:** < 2 hours

### Recovery Point Objectives (RPO)
- **Database:** < 5 minutes data loss
- **Configuration:** < 1 hour data loss
- **Application Code:** < 30 minutes data loss
- **User Data:** < 1 minute data loss

### Optimization Strategies
1. **Pre-warmed Standby Systems:**
   - Keep standby database synchronized
   - Maintain ready container images
   - Pre-configured load balancer rules

2. **Automated Recovery Procedures:**
   - Automated health checks
   - Self-healing mechanisms
   - Intelligent failover logic

3. **Resource Pre-allocation:**
   - Reserved compute capacity
   - Dedicated network bandwidth
   - Pre-provisioned storage

---

## 🚀 Continuous Improvement

### Regular Disaster Recovery Drills
```bash
# Monthly DR drill
cd /home/user/webapp && python scripts/disaster_recovery_drill.py --scenario application_failure

# Quarterly full system DR test
cd /home/user/webapp && python scripts/disaster_recovery_drill.py --scenario infrastructure_failure --full-test

# Annual DR audit
cd /home/user/webapp && python scripts/disaster_recovery_audit.py --comprehensive
```

### Metrics Collection
- Recovery time tracking
- Success rate monitoring
- Resource utilization analysis
- Cost optimization opportunities

### Process Updates
- Regular runbook reviews
- Procedure optimization
- Tool improvements
- Training updates

---

## 📞 Emergency Contact Information

| Role | Name | Primary | Secondary | Email |
|------|------|---------|-----------|-------|
| Incident Commander | TBD | +1-XXX-XXX-XXXX | +1-XXX-XXX-XXXX | incident@spirittours.com |
| Technical Lead | TBD | +1-XXX-XXX-XXXX | +1-XXX-XXX-XXXX | tech@spirittours.com |
| DevOps Lead | TBD | +1-XXX-XXX-XXXX | +1-XXX-XXX-XXXX | devops@spirittours.com |
| Database Admin | TBD | +1-XXX-XXX-XXXX | +1-XXX-XXX-XXXX | dba@spirittours.com |
| Security Lead | TBD | +1-XXX-XXX-XXXX | +1-XXX-XXX-XXXX | security@spirittours.com |

### External Vendors
- **Cloud Provider:** [Contact Info]
- **Database Vendor:** [Contact Info]
- **Monitoring Service:** [Contact Info]
- **Security Provider:** [Contact Info]

---

## 📚 Additional Resources

### Documentation Links
- [System Architecture Overview](./system_architecture.md)
- [Deployment Guide](./deployment_guide.md)
- [Monitoring Setup](./monitoring_setup.md)
- [Security Procedures](./security_procedures.md)

### Tools & Scripts
- [Disaster Recovery CLI](../scripts/disaster_recovery_cli.py)
- [Health Check Scripts](../scripts/health_checks/)
- [Backup Utilities](../scripts/backup_utilities/)
- [Monitoring Scripts](../scripts/monitoring/)

### Training Materials
- Disaster Recovery Training Videos
- Incident Response Procedures
- Recovery Simulation Exercises
- Best Practices Guide

---

**Last Updated:** 2024-01-15  
**Version:** 1.0  
**Next Review Date:** 2024-04-15

---

> ⚠️ **CRITICAL NOTICE:** This runbook contains procedures for emergency system recovery. Ensure all team members are familiar with these procedures and regularly practice disaster recovery scenarios. In case of emergency, follow the escalation matrix and document all actions taken.
