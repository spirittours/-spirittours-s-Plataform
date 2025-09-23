#!/usr/bin/env python3
"""
Comprehensive Security Audit and Logging System for Spirit Tours
Advanced audit trail, threat detection, and compliance monitoring
"""

import asyncio
import json
import logging
import hashlib
import ipaddress
import re
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Set, Union, Tuple
from dataclasses import dataclass, field
from enum import Enum
import redis
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Float, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import JSON, INET
from sqlalchemy.orm import relationship, sessionmaker
import geoip2.database
import user_agents
from collections import defaultdict, deque


Base = declarative_base()


class EventSeverity(Enum):
    """Security event severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EventType(Enum):
    """Types of security events"""
    # Authentication events
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    MFA_SUCCESS = "mfa_success"
    MFA_FAILURE = "mfa_failure"
    
    # Authorization events
    ACCESS_GRANTED = "access_granted"
    ACCESS_DENIED = "access_denied"
    PERMISSION_ELEVATION = "permission_elevation"
    ROLE_ASSIGNMENT = "role_assignment"
    
    # Data events
    DATA_ACCESS = "data_access"
    DATA_MODIFICATION = "data_modification"
    DATA_DELETION = "data_deletion"
    DATA_EXPORT = "data_export"
    SENSITIVE_DATA_ACCESS = "sensitive_data_access"
    
    # System events
    SYSTEM_CONFIG_CHANGE = "system_config_change"
    SERVICE_START = "service_start"
    SERVICE_STOP = "service_stop"
    DATABASE_CONNECTION = "database_connection"
    
    # Security events
    BRUTE_FORCE_ATTEMPT = "brute_force_attempt"
    SQL_INJECTION_ATTEMPT = "sql_injection_attempt"
    XSS_ATTEMPT = "xss_attempt"
    CSRF_ATTEMPT = "csrf_attempt"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    
    # Threat events
    MALWARE_DETECTED = "malware_detected"
    INTRUSION_DETECTED = "intrusion_detected"
    ANOMALY_DETECTED = "anomaly_detected"
    
    # Compliance events
    GDPR_DATA_REQUEST = "gdpr_data_request"
    PCI_COMPLIANCE_CHECK = "pci_compliance_check"
    AUDIT_LOG_ACCESS = "audit_log_access"


class ThreatLevel(Enum):
    """Threat assessment levels"""
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    SEVERE = "severe"


@dataclass
class SecurityEvent:
    """Represents a security event"""
    event_id: str
    event_type: EventType
    severity: EventSeverity
    timestamp: datetime
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    resource: Optional[str] = None
    action: Optional[str] = None
    outcome: str = "unknown"
    details: Dict[str, Any] = field(default_factory=dict)
    threat_level: ThreatLevel = ThreatLevel.NONE
    tags: Set[str] = field(default_factory=set)


class SecurityAuditLog(Base):
    """Database model for security audit logs"""
    __tablename__ = 'security_audit_logs'
    
    id = Column(Integer, primary_key=True)
    event_id = Column(String, unique=True, nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)
    severity = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    
    # User context
    user_id = Column(String, index=True)
    session_id = Column(String, index=True)
    
    # Request context
    ip_address = Column(INET)
    user_agent = Column(Text)
    request_path = Column(String)
    request_method = Column(String)
    
    # Security context
    resource = Column(String, index=True)
    action = Column(String, index=True)
    outcome = Column(String, nullable=False, index=True)
    threat_level = Column(String, nullable=False, index=True)
    
    # Geographic context
    country = Column(String)
    city = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    
    # Device context
    device_type = Column(String)
    os_family = Column(String)
    browser_family = Column(String)
    
    # Additional data
    details = Column(JSON)
    tags = Column(JSON)
    
    # Integrity
    hash_value = Column(String, nullable=False)
    
    # Indexes for performance
    __table_args__ = (
        Index('ix_audit_user_time', 'user_id', 'timestamp'),
        Index('ix_audit_ip_time', 'ip_address', 'timestamp'),
        Index('ix_audit_severity_time', 'severity', 'timestamp'),
        Index('ix_audit_threat_time', 'threat_level', 'timestamp'),
    )


class ThreatIndicator(Base):
    """Database model for threat indicators"""
    __tablename__ = 'threat_indicators'
    
    id = Column(Integer, primary_key=True)
    indicator_type = Column(String, nullable=False, index=True)  # ip, domain, hash, etc.
    value = Column(String, nullable=False, index=True)
    threat_level = Column(String, nullable=False)
    source = Column(String, nullable=False)  # internal, external_feed, etc.
    description = Column(Text)
    first_seen = Column(DateTime, nullable=False)
    last_seen = Column(DateTime, nullable=False)
    confidence = Column(Float, nullable=False)  # 0.0 - 1.0
    is_active = Column(Boolean, default=True)
    metadata = Column(JSON)


class ComplianceRule(Base):
    """Database model for compliance rules"""
    __tablename__ = 'compliance_rules'
    
    id = Column(Integer, primary_key=True)
    rule_id = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    regulation = Column(String, nullable=False)  # GDPR, PCI-DSS, SOX, etc.
    severity = Column(String, nullable=False)
    conditions = Column(JSON, nullable=False)
    actions = Column(JSON)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SecurityMetrics(Base):
    """Database model for security metrics"""
    __tablename__ = 'security_metrics'
    
    id = Column(Integer, primary_key=True)
    metric_name = Column(String, nullable=False, index=True)
    metric_value = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    labels = Column(JSON)  # Additional metadata/tags
    
    __table_args__ = (
        Index('ix_metrics_name_time', 'metric_name', 'timestamp'),
    )


class AdvancedSecurityAuditor:
    """
    Advanced security audit system with threat detection and compliance monitoring
    """
    
    def __init__(self, db_session, redis_client: Optional[redis.Redis] = None, geoip_db_path: Optional[str] = None):
        self.db_session = db_session
        self.redis_client = redis_client
        self.logger = logging.getLogger(__name__)
        
        # GeoIP database for location tracking
        self.geoip_reader = None
        if geoip_db_path and os.path.exists(geoip_db_path):
            try:
                self.geoip_reader = geoip2.database.Reader(geoip_db_path)
            except Exception as e:
                self.logger.warning(f"Failed to load GeoIP database: {e}")
        
        # Threat detection components
        self.threat_detectors = {}
        self.anomaly_baselines = defaultdict(lambda: {'mean': 0, 'std': 0, 'samples': deque(maxlen=1000)})
        
        # Rate limiting tracking
        self.rate_limits = defaultdict(lambda: deque(maxlen=100))
        
        # Security metrics cache
        self.metrics_cache = {}
        self.cache_ttl = 300  # 5 minutes
        
        # Compliance rules cache
        self.compliance_rules = {}
        
        # Initialize threat detection patterns
        self._initialize_threat_patterns()
        
        # Start background tasks
        asyncio.create_task(self._background_threat_analysis())
        asyncio.create_task(self._background_metrics_collection())
    
    def _initialize_threat_patterns(self):
        """Initialize threat detection patterns"""
        # SQL Injection patterns
        self.sql_injection_patterns = [
            r"('|(\\'))+.*(or|and|exec|union|select|insert|update|delete|drop|create|alter)",
            r"(union.*select|select.*from|insert.*into|update.*set|delete.*from)",
            r"(exec|execute|sp_|xp_)",
            r"(script.*alert|javascript:|vbscript:)",
        ]
        
        # XSS patterns
        self.xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe[^>]*>.*?</iframe>",
        ]
        
        # Path traversal patterns
        self.path_traversal_patterns = [
            r"\.\./",
            r"\.\.\\",
            r"%2e%2e%2f",
            r"%2e%2e\\",
        ]
        
        # Suspicious user agents
        self.suspicious_user_agents = [
            "sqlmap",
            "nikto",
            "dirb",
            "nmap",
            "masscan",
            "burp",
            "w3af",
        ]
    
    async def log_event(self, event: SecurityEvent) -> bool:
        """
        Log security event with full context and analysis
        """
        try:
            # Enrich event with additional context
            await self._enrich_event(event)
            
            # Detect threats in the event
            await self._analyze_threats(event)
            
            # Check compliance rules
            await self._check_compliance(event)
            
            # Store in database
            audit_log = self._create_audit_record(event)
            self.db_session.add(audit_log)
            self.db_session.commit()
            
            # Cache in Redis for real-time analysis
            if self.redis_client:
                await self._cache_event(event)
            
            # Trigger alerts if necessary
            if event.severity in [EventSeverity.HIGH, EventSeverity.CRITICAL]:
                await self._trigger_security_alert(event)
            
            # Update security metrics
            await self._update_security_metrics(event)
            
            self.logger.info(f"Logged security event: {event.event_id} - {event.event_type.value}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to log security event: {str(e)}")
            return False
    
    async def _enrich_event(self, event: SecurityEvent):
        """Enrich event with additional contextual information"""
        try:
            # Geographic enrichment
            if event.ip_address and self.geoip_reader:
                try:
                    response = self.geoip_reader.city(event.ip_address)
                    event.details.update({
                        'country': response.country.name,
                        'country_code': response.country.iso_code,
                        'city': response.city.name,
                        'latitude': float(response.location.latitude) if response.location.latitude else None,
                        'longitude': float(response.location.longitude) if response.location.longitude else None,
                        'timezone': response.location.time_zone
                    })
                except Exception:
                    pass
            
            # User agent parsing
            if event.user_agent:
                try:
                    ua = user_agents.parse(event.user_agent)
                    event.details.update({
                        'device_type': 'mobile' if ua.is_mobile else 'tablet' if ua.is_tablet else 'desktop',
                        'os_family': ua.os.family,
                        'os_version': ua.os.version_string,
                        'browser_family': ua.browser.family,
                        'browser_version': ua.browser.version_string
                    })
                except Exception:
                    pass
            
            # IP classification
            if event.ip_address:
                ip_info = await self._classify_ip_address(event.ip_address)
                event.details.update(ip_info)
            
            # Session enrichment
            if event.session_id and self.redis_client:
                session_data = await self.redis_client.hgetall(f"session:{event.session_id}")
                if session_data:
                    event.details['session_info'] = session_data
            
        except Exception as e:
            self.logger.warning(f"Failed to enrich event: {str(e)}")
    
    async def _analyze_threats(self, event: SecurityEvent):
        """Analyze event for security threats"""
        try:
            threats_detected = []
            
            # Check for known threat indicators
            if event.ip_address:
                threat_level = await self._check_threat_indicators('ip', event.ip_address)
                if threat_level != ThreatLevel.NONE:
                    threats_detected.append(f"Known malicious IP: {threat_level.value}")
                    event.threat_level = max(event.threat_level, threat_level, key=lambda x: list(ThreatLevel).index(x))
            
            # Analyze request patterns for attacks
            if event.details.get('request_data'):
                request_data = str(event.details['request_data'])
                
                # SQL Injection detection
                for pattern in self.sql_injection_patterns:
                    if re.search(pattern, request_data, re.IGNORECASE):
                        threats_detected.append("SQL Injection attempt")
                        event.event_type = EventType.SQL_INJECTION_ATTEMPT
                        event.severity = EventSeverity.HIGH
                        event.threat_level = ThreatLevel.HIGH
                        break
                
                # XSS detection
                for pattern in self.xss_patterns:
                    if re.search(pattern, request_data, re.IGNORECASE):
                        threats_detected.append("XSS attempt")
                        event.event_type = EventType.XSS_ATTEMPT
                        event.severity = EventSeverity.HIGH
                        event.threat_level = ThreatLevel.HIGH
                        break
                
                # Path traversal detection
                for pattern in self.path_traversal_patterns:
                    if re.search(pattern, request_data, re.IGNORECASE):
                        threats_detected.append("Path traversal attempt")
                        event.severity = EventSeverity.MEDIUM
                        event.threat_level = ThreatLevel.MEDIUM
                        break
            
            # Check for suspicious user agents
            if event.user_agent:
                ua_lower = event.user_agent.lower()
                for suspicious_ua in self.suspicious_user_agents:
                    if suspicious_ua in ua_lower:
                        threats_detected.append(f"Suspicious user agent: {suspicious_ua}")
                        event.severity = EventSeverity.MEDIUM
                        event.threat_level = ThreatLevel.MEDIUM
                        break
            
            # Brute force detection
            if event.event_type == EventType.LOGIN_FAILURE:
                if await self._detect_brute_force(event):
                    threats_detected.append("Brute force attack detected")
                    event.event_type = EventType.BRUTE_FORCE_ATTEMPT
                    event.severity = EventSeverity.HIGH
                    event.threat_level = ThreatLevel.HIGH
            
            # Rate limiting check
            if await self._check_rate_limits(event):
                threats_detected.append("Rate limit exceeded")
                event.event_type = EventType.RATE_LIMIT_EXCEEDED
                event.severity = EventSeverity.MEDIUM
                event.threat_level = ThreatLevel.MEDIUM
            
            # Anomaly detection
            anomaly_score = await self._detect_anomalies(event)
            if anomaly_score > 0.8:  # High anomaly threshold
                threats_detected.append(f"Anomaly detected (score: {anomaly_score:.2f})")
                event.event_type = EventType.ANOMALY_DETECTED
                event.severity = EventSeverity.MEDIUM
                event.threat_level = ThreatLevel.MEDIUM
            
            if threats_detected:
                event.details['threats_detected'] = threats_detected
                event.tags.add('threat_detected')
            
        except Exception as e:
            self.logger.error(f"Threat analysis failed: {str(e)}")
    
    async def _check_compliance(self, event: SecurityEvent):
        """Check event against compliance rules"""
        try:
            # Load compliance rules if not cached
            if not self.compliance_rules:
                await self._load_compliance_rules()
            
            violations = []
            
            for rule_id, rule in self.compliance_rules.items():
                if await self._evaluate_compliance_rule(event, rule):
                    violations.append({
                        'rule_id': rule_id,
                        'regulation': rule['regulation'],
                        'description': rule['description'],
                        'severity': rule['severity']
                    })
                    
                    # Log compliance violation
                    await self.log_event(SecurityEvent(
                        event_id=f"compliance_{int(time.time())}_{rule_id}",
                        event_type=EventType.GDPR_DATA_REQUEST if 'GDPR' in rule['regulation'] else EventType.PCI_COMPLIANCE_CHECK,
                        severity=EventSeverity(rule['severity']),
                        timestamp=datetime.now(timezone.utc),
                        user_id=event.user_id,
                        details={
                            'compliance_violation': True,
                            'rule_violated': rule,
                            'original_event': event.event_id
                        }
                    ))
            
            if violations:
                event.details['compliance_violations'] = violations
                event.tags.add('compliance_violation')
            
        except Exception as e:
            self.logger.error(f"Compliance check failed: {str(e)}")
    
    async def _detect_brute_force(self, event: SecurityEvent) -> bool:
        """Detect brute force attacks"""
        if not event.ip_address:
            return False
        
        try:
            # Check recent failed login attempts from this IP
            recent_failures = []
            
            if self.redis_client:
                failures_key = f"login_failures:{event.ip_address}"
                failures = await self.redis_client.lrange(failures_key, 0, -1)
                
                current_time = time.time()
                for failure_time in failures:
                    if current_time - float(failure_time) <= 300:  # 5 minutes window
                        recent_failures.append(failure_time)
                
                # Add current failure
                await self.redis_client.lpush(failures_key, str(current_time))
                await self.redis_client.expire(failures_key, 3600)  # 1 hour TTL
                
                # Trim old entries
                await self.redis_client.ltrim(failures_key, 0, 19)  # Keep last 20 attempts
            
            # Brute force threshold: 5 failures in 5 minutes
            return len(recent_failures) >= 5
            
        except Exception as e:
            self.logger.error(f"Brute force detection failed: {str(e)}")
            return False
    
    async def _check_rate_limits(self, event: SecurityEvent) -> bool:
        """Check if rate limits are exceeded"""
        if not event.ip_address:
            return False
        
        try:
            current_time = time.time()
            rate_key = f"rate_limit:{event.ip_address}"
            
            # Get recent requests
            self.rate_limits[rate_key].append(current_time)
            
            # Count requests in last minute
            recent_requests = [
                req_time for req_time in self.rate_limits[rate_key]
                if current_time - req_time <= 60
            ]
            
            # Update deque
            self.rate_limits[rate_key] = deque(recent_requests, maxlen=100)
            
            # Rate limit: 100 requests per minute per IP
            return len(recent_requests) > 100
            
        except Exception as e:
            self.logger.error(f"Rate limit check failed: {str(e)}")
            return False
    
    async def _detect_anomalies(self, event: SecurityEvent) -> float:
        """Detect anomalies using simple statistical methods"""
        try:
            anomaly_score = 0.0
            
            # Time-based anomaly (unusual request time)
            hour = event.timestamp.hour
            if hour < 6 or hour > 22:  # Outside business hours
                anomaly_score += 0.3
            
            # Geographic anomaly (if user typically from different location)
            if event.user_id and event.details.get('country'):
                user_countries_key = f"user_countries:{event.user_id}"
                if self.redis_client:
                    common_countries = await self.redis_client.smembers(user_countries_key)
                    if common_countries and event.details['country'] not in common_countries:
                        anomaly_score += 0.4
                    
                    # Add current country to user's set
                    await self.redis_client.sadd(user_countries_key, event.details['country'])
                    await self.redis_client.expire(user_countries_key, 86400 * 30)  # 30 days
            
            # Frequency anomaly (unusual request frequency)
            if event.user_id:
                baseline_key = f"baseline:{event.user_id}:{event.event_type.value}"
                baseline = self.anomaly_baselines[baseline_key]
                
                current_hour_requests = 1  # Current request
                if baseline['samples']:
                    mean_requests = baseline['mean']
                    if current_hour_requests > mean_requests * 3:  # 3x normal activity
                        anomaly_score += 0.3
                
                # Update baseline
                baseline['samples'].append(current_hour_requests)
                if len(baseline['samples']) >= 10:
                    import statistics
                    baseline['mean'] = statistics.mean(baseline['samples'])
                    baseline['std'] = statistics.stdev(baseline['samples']) if len(baseline['samples']) > 1 else 0
            
            return min(anomaly_score, 1.0)  # Cap at 1.0
            
        except Exception as e:
            self.logger.error(f"Anomaly detection failed: {str(e)}")
            return 0.0
    
    async def _classify_ip_address(self, ip_address: str) -> Dict[str, Any]:
        """Classify IP address (internal, external, etc.)"""
        try:
            ip = ipaddress.ip_address(ip_address)
            classification = {
                'is_private': ip.is_private,
                'is_loopback': ip.is_loopback,
                'is_multicast': ip.is_multicast,
                'is_reserved': ip.is_reserved,
                'version': ip.version
            }
            
            # Additional classification
            if ip.is_private:
                classification['network_type'] = 'internal'
            elif ip.is_loopback:
                classification['network_type'] = 'loopback'
            else:
                classification['network_type'] = 'external'
            
            return classification
            
        except Exception as e:
            self.logger.warning(f"IP classification failed for {ip_address}: {str(e)}")
            return {'network_type': 'unknown'}
    
    async def _check_threat_indicators(self, indicator_type: str, value: str) -> ThreatLevel:
        """Check value against threat intelligence indicators"""
        try:
            threat_indicator = self.db_session.query(ThreatIndicator).filter(
                ThreatIndicator.indicator_type == indicator_type,
                ThreatIndicator.value == value,
                ThreatIndicator.is_active == True
            ).first()
            
            if threat_indicator:
                # Update last seen
                threat_indicator.last_seen = datetime.utcnow()
                self.db_session.commit()
                
                return ThreatLevel(threat_indicator.threat_level)
            
            return ThreatLevel.NONE
            
        except Exception as e:
            self.logger.error(f"Threat indicator check failed: {str(e)}")
            return ThreatLevel.NONE
    
    def _create_audit_record(self, event: SecurityEvent) -> SecurityAuditLog:
        """Create database audit record from security event"""
        # Calculate hash for integrity
        event_data = {
            'event_id': event.event_id,
            'event_type': event.event_type.value,
            'timestamp': event.timestamp.isoformat(),
            'user_id': event.user_id,
            'details': event.details
        }
        
        hash_input = json.dumps(event_data, sort_keys=True).encode()
        hash_value = hashlib.sha256(hash_input).hexdigest()
        
        return SecurityAuditLog(
            event_id=event.event_id,
            event_type=event.event_type.value,
            severity=event.severity.value,
            timestamp=event.timestamp,
            user_id=event.user_id,
            session_id=event.session_id,
            ip_address=event.ip_address,
            user_agent=event.user_agent,
            resource=event.resource,
            action=event.action,
            outcome=event.outcome,
            threat_level=event.threat_level.value,
            country=event.details.get('country'),
            city=event.details.get('city'),
            latitude=event.details.get('latitude'),
            longitude=event.details.get('longitude'),
            device_type=event.details.get('device_type'),
            os_family=event.details.get('os_family'),
            browser_family=event.details.get('browser_family'),
            details=event.details,
            tags=list(event.tags),
            hash_value=hash_value
        )
    
    async def _cache_event(self, event: SecurityEvent):
        """Cache event in Redis for real-time analysis"""
        try:
            event_data = {
                'event_id': event.event_id,
                'event_type': event.event_type.value,
                'severity': event.severity.value,
                'timestamp': event.timestamp.isoformat(),
                'user_id': event.user_id,
                'ip_address': event.ip_address,
                'threat_level': event.threat_level.value,
                'tags': list(event.tags)
            }
            
            # Store event
            await self.redis_client.setex(
                f"event:{event.event_id}",
                3600,  # 1 hour TTL
                json.dumps(event_data)
            )
            
            # Add to recent events list
            await self.redis_client.lpush("recent_events", event.event_id)
            await self.redis_client.ltrim("recent_events", 0, 999)  # Keep last 1000 events
            
        except Exception as e:
            self.logger.error(f"Failed to cache event: {str(e)}")
    
    async def _trigger_security_alert(self, event: SecurityEvent):
        """Trigger security alerts for high-severity events"""
        try:
            alert_data = {
                'event_id': event.event_id,
                'event_type': event.event_type.value,
                'severity': event.severity.value,
                'timestamp': event.timestamp.isoformat(),
                'threat_level': event.threat_level.value,
                'user_id': event.user_id,
                'ip_address': event.ip_address,
                'details': event.details,
                'threats_detected': event.details.get('threats_detected', [])
            }
            
            # Store in Redis for alert processing
            if self.redis_client:
                await self.redis_client.lpush("security_alerts", json.dumps(alert_data))
            
            # Log critical alerts
            if event.severity == EventSeverity.CRITICAL:
                self.logger.critical(f"SECURITY ALERT: {event.event_type.value} - {event.details.get('threats_detected', [])}")
            
        except Exception as e:
            self.logger.error(f"Failed to trigger security alert: {str(e)}")
    
    async def _update_security_metrics(self, event: SecurityEvent):
        """Update security metrics based on event"""
        try:
            current_time = datetime.now(timezone.utc)
            
            # Count events by type
            metric_name = f"events.{event.event_type.value}"
            await self._record_metric(metric_name, 1, current_time, {'severity': event.severity.value})
            
            # Count events by severity
            metric_name = f"events.severity.{event.severity.value}"
            await self._record_metric(metric_name, 1, current_time)
            
            # Count threats
            if event.threat_level != ThreatLevel.NONE:
                metric_name = f"threats.{event.threat_level.value}"
                await self._record_metric(metric_name, 1, current_time, {'event_type': event.event_type.value})
            
            # Geographic metrics
            if event.details.get('country'):
                metric_name = "events.by_country"
                await self._record_metric(metric_name, 1, current_time, {'country': event.details['country']})
            
        except Exception as e:
            self.logger.error(f"Failed to update security metrics: {str(e)}")
    
    async def _record_metric(self, name: str, value: float, timestamp: datetime, labels: Optional[Dict[str, str]] = None):
        """Record a security metric"""
        try:
            metric = SecurityMetrics(
                metric_name=name,
                metric_value=value,
                timestamp=timestamp,
                labels=labels or {}
            )
            
            self.db_session.add(metric)
            self.db_session.commit()
            
        except Exception as e:
            self.logger.error(f"Failed to record metric {name}: {str(e)}")
    
    async def _load_compliance_rules(self):
        """Load compliance rules from database"""
        try:
            rules = self.db_session.query(ComplianceRule).filter(ComplianceRule.is_active == True).all()
            
            for rule in rules:
                self.compliance_rules[rule.rule_id] = {
                    'name': rule.name,
                    'description': rule.description,
                    'regulation': rule.regulation,
                    'severity': rule.severity,
                    'conditions': rule.conditions,
                    'actions': rule.actions or {}
                }
            
        except Exception as e:
            self.logger.error(f"Failed to load compliance rules: {str(e)}")
    
    async def _evaluate_compliance_rule(self, event: SecurityEvent, rule: Dict[str, Any]) -> bool:
        """Evaluate if event violates compliance rule"""
        try:
            conditions = rule['conditions']
            
            # Check event type condition
            if 'event_types' in conditions:
                if event.event_type.value not in conditions['event_types']:
                    return False
            
            # Check data sensitivity condition
            if 'sensitive_data_access' in conditions and conditions['sensitive_data_access']:
                if event.event_type != EventType.SENSITIVE_DATA_ACCESS:
                    return False
            
            # Check user role condition
            if 'restricted_roles' in conditions and event.user_id:
                # This would need integration with RBAC system to check user roles
                pass
            
            # Check geographic restrictions
            if 'restricted_countries' in conditions and event.details.get('country'):
                if event.details['country'] in conditions['restricted_countries']:
                    return True
            
            # Check time-based restrictions
            if 'business_hours_only' in conditions and conditions['business_hours_only']:
                hour = event.timestamp.hour
                if hour < 8 or hour > 18:  # Outside business hours
                    return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Failed to evaluate compliance rule: {str(e)}")
            return False
    
    async def get_security_dashboard_data(self, time_range_hours: int = 24) -> Dict[str, Any]:
        """Get security dashboard data"""
        try:
            end_time = datetime.now(timezone.utc)
            start_time = end_time - timedelta(hours=time_range_hours)
            
            # Get event counts by type
            events_by_type = {}
            result = self.db_session.query(
                SecurityAuditLog.event_type,
                self.db_session.query().count()
            ).filter(
                SecurityAuditLog.timestamp >= start_time
            ).group_by(SecurityAuditLog.event_type).all()
            
            for event_type, count in result:
                events_by_type[event_type] = count
            
            # Get threat levels
            threats_by_level = {}
            result = self.db_session.query(
                SecurityAuditLog.threat_level,
                self.db_session.query().count()
            ).filter(
                SecurityAuditLog.timestamp >= start_time,
                SecurityAuditLog.threat_level != ThreatLevel.NONE.value
            ).group_by(SecurityAuditLog.threat_level).all()
            
            for threat_level, count in result:
                threats_by_level[threat_level] = count
            
            # Get top countries
            top_countries = {}
            result = self.db_session.query(
                SecurityAuditLog.country,
                self.db_session.query().count()
            ).filter(
                SecurityAuditLog.timestamp >= start_time,
                SecurityAuditLog.country.isnot(None)
            ).group_by(SecurityAuditLog.country).order_by(
                self.db_session.query().count().desc()
            ).limit(10).all()
            
            for country, count in result:
                top_countries[country] = count
            
            # Recent critical events
            critical_events = self.db_session.query(SecurityAuditLog).filter(
                SecurityAuditLog.timestamp >= start_time,
                SecurityAuditLog.severity == EventSeverity.CRITICAL.value
            ).order_by(SecurityAuditLog.timestamp.desc()).limit(10).all()
            
            return {
                'time_range_hours': time_range_hours,
                'total_events': sum(events_by_type.values()),
                'events_by_type': events_by_type,
                'threats_by_level': threats_by_level,
                'top_countries': top_countries,
                'critical_events': [
                    {
                        'event_id': event.event_id,
                        'event_type': event.event_type,
                        'timestamp': event.timestamp.isoformat(),
                        'user_id': event.user_id,
                        'ip_address': str(event.ip_address) if event.ip_address else None,
                        'details': event.details
                    }
                    for event in critical_events
                ]
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get dashboard data: {str(e)}")
            return {}
    
    async def _background_threat_analysis(self):
        """Background task for continuous threat analysis"""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                
                # Analyze recent events for patterns
                if self.redis_client:
                    recent_event_ids = await self.redis_client.lrange("recent_events", 0, 99)
                    
                    # Look for attack patterns across multiple events
                    await self._analyze_attack_patterns(recent_event_ids)
                
            except Exception as e:
                self.logger.error(f"Background threat analysis error: {str(e)}")
    
    async def _background_metrics_collection(self):
        """Background task for collecting security metrics"""
        while True:
            try:
                await asyncio.sleep(60)  # Run every minute
                
                current_time = datetime.now(timezone.utc)
                
                # Collect system-wide metrics
                total_events = self.db_session.query(SecurityAuditLog).filter(
                    SecurityAuditLog.timestamp >= current_time - timedelta(minutes=1)
                ).count()
                
                await self._record_metric("events.total_per_minute", total_events, current_time)
                
                # Collect threat metrics
                total_threats = self.db_session.query(SecurityAuditLog).filter(
                    SecurityAuditLog.timestamp >= current_time - timedelta(minutes=1),
                    SecurityAuditLog.threat_level != ThreatLevel.NONE.value
                ).count()
                
                await self._record_metric("threats.total_per_minute", total_threats, current_time)
                
            except Exception as e:
                self.logger.error(f"Background metrics collection error: {str(e)}")
    
    async def _analyze_attack_patterns(self, event_ids: List[str]):
        """Analyze patterns across multiple events"""
        try:
            # This would implement more sophisticated pattern analysis
            # such as coordinated attacks, distributed brute force, etc.
            pass
        except Exception as e:
            self.logger.error(f"Attack pattern analysis failed: {str(e)}")


# Example usage and testing
async def main():
    """
    Example usage of the security audit system
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    import redis.asyncio as redis
    
    print("Spirit Tours - Security Audit System Demo")
    print("=" * 60)
    
    # Database setup
    engine = create_engine('sqlite:///security_audit.db')
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db_session = Session()
    
    # Redis setup
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    
    # Initialize security auditor
    auditor = AdvancedSecurityAuditor(db_session, redis_client)
    
    try:
        # Test various security events
        print("\n1. Testing Normal Login Event")
        login_event = SecurityEvent(
            event_id=f"login_{int(time.time())}",
            event_type=EventType.LOGIN_SUCCESS,
            severity=EventSeverity.LOW,
            timestamp=datetime.now(timezone.utc),
            user_id="user123",
            session_id="session456",
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            outcome="success",
            details={"login_method": "password"}
        )
        
        success = await auditor.log_event(login_event)
        print(f"Normal login logged: {success}")
        
        # Test suspicious event
        print("\n2. Testing Suspicious SQL Injection Attempt")
        sql_injection_event = SecurityEvent(
            event_id=f"attack_{int(time.time())}",
            event_type=EventType.DATA_ACCESS,
            severity=EventSeverity.MEDIUM,
            timestamp=datetime.now(timezone.utc),
            user_id=None,
            ip_address="10.0.0.1",
            user_agent="sqlmap/1.0",
            outcome="blocked",
            details={
                "request_data": "id=1' OR '1'='1 UNION SELECT * FROM users--",
                "request_path": "/api/users",
                "request_method": "GET"
            }
        )
        
        success = await auditor.log_event(sql_injection_event)
        print(f"SQL injection attempt logged: {success}")
        
        # Test brute force simulation
        print("\n3. Testing Brute Force Detection")
        attacker_ip = "203.0.113.1"
        
        for i in range(6):  # Simulate 6 failed logins
            brute_force_event = SecurityEvent(
                event_id=f"brute_force_{int(time.time())}_{i}",
                event_type=EventType.LOGIN_FAILURE,
                severity=EventSeverity.MEDIUM,
                timestamp=datetime.now(timezone.utc),
                user_id="admin",
                ip_address=attacker_ip,
                user_agent="Mozilla/5.0 (compatible; AttackBot/1.0)",
                outcome="failure",
                details={"reason": "invalid_credentials"}
            )
            
            success = await auditor.log_event(brute_force_event)
            await asyncio.sleep(0.1)  # Small delay between attempts
        
        print("Brute force simulation completed")
        
        # Get security dashboard data
        print("\n4. Security Dashboard Data")
        dashboard_data = await auditor.get_security_dashboard_data(time_range_hours=1)
        
        print(f"Total events in last hour: {dashboard_data.get('total_events', 0)}")
        print(f"Events by type: {dashboard_data.get('events_by_type', {})}")
        print(f"Threats by level: {dashboard_data.get('threats_by_level', {})}")
        print(f"Critical events: {len(dashboard_data.get('critical_events', []))}")
        
        print("\n✅ Security audit system tests completed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        await redis_client.close()
        db_session.close()


if __name__ == "__main__":
    import os
    asyncio.run(main())