"""
Security Auditing and Compliance System
Spirit Tours Platform - Security Monitoring
"""

import json
import hashlib
import logging
import asyncio
from typing import Dict, List, Optional, Any, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict
import re
import os
from pathlib import Path

logger = logging.getLogger(__name__)


class AuditEventType(Enum):
    """Types of audit events"""
    # Authentication Events
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET = "password_reset"
    MFA_ENABLED = "mfa_enabled"
    MFA_DISABLED = "mfa_disabled"
    
    # Authorization Events
    ACCESS_GRANTED = "access_granted"
    ACCESS_DENIED = "access_denied"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    ROLE_CHANGE = "role_change"
    
    # Data Events
    DATA_ACCESS = "data_access"
    DATA_MODIFICATION = "data_modification"
    DATA_DELETION = "data_deletion"
    DATA_EXPORT = "data_export"
    
    # System Events
    CONFIG_CHANGE = "config_change"
    SYSTEM_START = "system_start"
    SYSTEM_STOP = "system_stop"
    BACKUP_CREATED = "backup_created"
    BACKUP_RESTORED = "backup_restored"
    
    # Security Events
    SECURITY_ALERT = "security_alert"
    ATTACK_DETECTED = "attack_detected"
    VULNERABILITY_FOUND = "vulnerability_found"
    SECURITY_SCAN = "security_scan"
    
    # Compliance Events
    COMPLIANCE_CHECK = "compliance_check"
    COMPLIANCE_VIOLATION = "compliance_violation"
    AUDIT_TRAIL_ACCESS = "audit_trail_access"


class ComplianceStandard(Enum):
    """Compliance standards"""
    PCI_DSS = "pci_dss"
    GDPR = "gdpr"
    HIPAA = "hipaa"
    SOC2 = "soc2"
    ISO27001 = "iso27001"


@dataclass
class AuditEvent:
    """Audit event structure"""
    event_id: str
    timestamp: datetime
    event_type: AuditEventType
    user_id: Optional[str]
    user_email: Optional[str]
    ip_address: str
    user_agent: str
    resource: Optional[str]
    action: str
    result: str
    details: Dict[str, Any]
    risk_score: int
    session_id: Optional[str]
    correlation_id: Optional[str]


class SecurityAuditor:
    """Main security auditing system"""
    
    def __init__(self):
        self.audit_log = []
        self.audit_file_path = Path("/var/log/spirit-tours/audit.log")
        self.compliance_rules = self._load_compliance_rules()
        self.sensitive_data_patterns = self._load_sensitive_patterns()
        self.anomaly_detector = AnomalyDetector()
        self.compliance_checker = ComplianceChecker()
        
    def _load_compliance_rules(self) -> Dict[ComplianceStandard, Dict]:
        """Load compliance rules"""
        return {
            ComplianceStandard.PCI_DSS: {
                "password_requirements": {
                    "min_length": 8,
                    "complexity": True,
                    "rotation_days": 90
                },
                "session_timeout": 15,  # minutes
                "failed_login_attempts": 6,
                "audit_retention_days": 365,
                "encryption_required": True
            },
            ComplianceStandard.GDPR: {
                "data_retention_days": 730,
                "consent_required": True,
                "right_to_erasure": True,
                "data_portability": True,
                "breach_notification_hours": 72
            },
            ComplianceStandard.SOC2: {
                "access_control": True,
                "encryption_in_transit": True,
                "encryption_at_rest": True,
                "audit_logging": True,
                "incident_response": True
            }
        }
    
    def _load_sensitive_patterns(self) -> List[re.Pattern]:
        """Load patterns for sensitive data detection"""
        return [
            re.compile(r'\b(?:\d{4}[-\s]?){3}\d{4}\b'),  # Credit card
            re.compile(r'\b\d{3}-\d{2}-\d{4}\b'),  # SSN
            re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),  # Email
            re.compile(r'\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'),  # Phone
            re.compile(r'(?i)(password|passwd|pwd|secret|token|api[_-]?key)[\s]*[:=][\s]*\S+'),  # Credentials
        ]
    
    async def log_event(self, event: AuditEvent):
        """Log an audit event"""
        
        # Add to in-memory log
        self.audit_log.append(event)
        
        # Detect sensitive data
        if self._contains_sensitive_data(event.details):
            event.details = self._redact_sensitive_data(event.details)
            event.risk_score += 20
        
        # Check for anomalies
        if self.anomaly_detector.is_anomaly(event):
            event.risk_score += 30
            await self._trigger_security_alert(event, "Anomaly detected")
        
        # Write to file
        await self._write_to_file(event)
        
        # Check compliance
        compliance_issues = self.compliance_checker.check_event(event)
        if compliance_issues:
            await self._handle_compliance_violations(event, compliance_issues)
        
        # Real-time alerting for high-risk events
        if event.risk_score >= 70:
            await self._trigger_security_alert(event, "High-risk event detected")
    
    def _contains_sensitive_data(self, data: Dict) -> bool:
        """Check if data contains sensitive information"""
        data_str = json.dumps(data)
        return any(pattern.search(data_str) for pattern in self.sensitive_data_patterns)
    
    def _redact_sensitive_data(self, data: Dict) -> Dict:
        """Redact sensitive data"""
        data_str = json.dumps(data)
        
        # Redact credit cards
        data_str = re.sub(r'\b(?:\d{4}[-\s]?){3}\d{4}\b', 'XXXX-XXXX-XXXX-XXXX', data_str)
        
        # Redact SSNs
        data_str = re.sub(r'\b\d{3}-\d{2}-\d{4}\b', 'XXX-XX-XXXX', data_str)
        
        # Redact passwords
        data_str = re.sub(r'(?i)(password|passwd|pwd)[\s]*[:=][\s]*\S+', r'\1=REDACTED', data_str)
        
        return json.loads(data_str)
    
    async def _write_to_file(self, event: AuditEvent):
        """Write audit event to file"""
        try:
            self.audit_file_path.parent.mkdir(parents=True, exist_ok=True)
            
            log_entry = {
                **asdict(event),
                "timestamp": event.timestamp.isoformat(),
                "event_type": event.event_type.value
            }
            
            with open(self.audit_file_path, 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
        
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")
    
    async def _trigger_security_alert(self, event: AuditEvent, reason: str):
        """Trigger security alert"""
        alert = {
            "alert_id": hashlib.sha256(f"{event.event_id}{datetime.utcnow()}".encode()).hexdigest()[:16],
            "timestamp": datetime.utcnow().isoformat(),
            "event_id": event.event_id,
            "reason": reason,
            "risk_score": event.risk_score,
            "user": event.user_email,
            "ip_address": event.ip_address,
            "details": event.details
        }
        
        # Log alert
        logger.critical(f"SECURITY ALERT: {json.dumps(alert)}")
        
        # Send notifications (implement notification service)
        # await notification_service.send_security_alert(alert)
    
    async def _handle_compliance_violations(self, event: AuditEvent, violations: List[str]):
        """Handle compliance violations"""
        for violation in violations:
            logger.error(f"Compliance violation: {violation} for event {event.event_id}")
            
            # Log compliance violation event
            violation_event = AuditEvent(
                event_id=hashlib.sha256(f"violation_{event.event_id}".encode()).hexdigest()[:16],
                timestamp=datetime.utcnow(),
                event_type=AuditEventType.COMPLIANCE_VIOLATION,
                user_id=event.user_id,
                user_email=event.user_email,
                ip_address=event.ip_address,
                user_agent=event.user_agent,
                resource=event.resource,
                action="compliance_violation",
                result="violation_detected",
                details={"original_event": event.event_id, "violation": violation},
                risk_score=80,
                session_id=event.session_id,
                correlation_id=event.event_id
            )
            
            await self.log_event(violation_event)
    
    def generate_compliance_report(self, standard: ComplianceStandard, 
                                  start_date: datetime, end_date: datetime) -> Dict:
        """Generate compliance report"""
        
        report = {
            "standard": standard.value,
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "summary": {
                "total_events": 0,
                "compliant_events": 0,
                "violations": 0,
                "risk_events": 0
            },
            "details": defaultdict(list)
        }
        
        # Filter events by date range
        filtered_events = [
            e for e in self.audit_log 
            if start_date <= e.timestamp <= end_date
        ]
        
        report["summary"]["total_events"] = len(filtered_events)
        
        # Check each event for compliance
        for event in filtered_events:
            issues = self.compliance_checker.check_event_for_standard(event, standard)
            
            if issues:
                report["summary"]["violations"] += 1
                report["details"]["violations"].append({
                    "event_id": event.event_id,
                    "timestamp": event.timestamp.isoformat(),
                    "issues": issues
                })
            else:
                report["summary"]["compliant_events"] += 1
            
            if event.risk_score >= 50:
                report["summary"]["risk_events"] += 1
                report["details"]["high_risk_events"].append({
                    "event_id": event.event_id,
                    "risk_score": event.risk_score,
                    "type": event.event_type.value
                })
        
        # Calculate compliance score
        if report["summary"]["total_events"] > 0:
            report["compliance_score"] = (
                report["summary"]["compliant_events"] / 
                report["summary"]["total_events"] * 100
            )
        else:
            report["compliance_score"] = 100
        
        return report
    
    def search_audit_log(self, filters: Dict) -> List[AuditEvent]:
        """Search audit log with filters"""
        results = self.audit_log
        
        # Filter by user
        if "user_id" in filters:
            results = [e for e in results if e.user_id == filters["user_id"]]
        
        # Filter by event type
        if "event_type" in filters:
            results = [e for e in results if e.event_type == filters["event_type"]]
        
        # Filter by date range
        if "start_date" in filters and "end_date" in filters:
            results = [
                e for e in results 
                if filters["start_date"] <= e.timestamp <= filters["end_date"]
            ]
        
        # Filter by risk score
        if "min_risk_score" in filters:
            results = [e for e in results if e.risk_score >= filters["min_risk_score"]]
        
        # Filter by IP address
        if "ip_address" in filters:
            results = [e for e in results if e.ip_address == filters["ip_address"]]
        
        return results


class AnomalyDetector:
    """Detect anomalies in audit events"""
    
    def __init__(self):
        self.user_baselines = defaultdict(lambda: {"login_times": [], "ip_addresses": set()})
        self.global_patterns = defaultdict(list)
        
    def is_anomaly(self, event: AuditEvent) -> bool:
        """Check if event is anomalous"""
        anomalies = []
        
        # Check for unusual login time
        if event.event_type == AuditEventType.LOGIN_SUCCESS:
            anomalies.append(self._check_login_time_anomaly(event))
        
        # Check for new IP address
        anomalies.append(self._check_ip_anomaly(event))
        
        # Check for privilege escalation
        if event.event_type == AuditEventType.PRIVILEGE_ESCALATION:
            anomalies.append(True)
        
        # Check for data exfiltration patterns
        if event.event_type == AuditEventType.DATA_EXPORT:
            anomalies.append(self._check_data_exfiltration(event))
        
        # Check for brute force patterns
        if event.event_type == AuditEventType.LOGIN_FAILURE:
            anomalies.append(self._check_brute_force(event))
        
        return any(anomalies)
    
    def _check_login_time_anomaly(self, event: AuditEvent) -> bool:
        """Check for unusual login times"""
        hour = event.timestamp.hour
        
        # Get user's baseline
        baseline = self.user_baselines[event.user_id]
        baseline["login_times"].append(hour)
        
        # Check if login is outside normal hours (e.g., 2 AM - 5 AM)
        if 2 <= hour <= 5:
            return True
        
        # Check if significantly different from user's pattern
        if len(baseline["login_times"]) > 10:
            avg_hour = sum(baseline["login_times"]) / len(baseline["login_times"])
            if abs(hour - avg_hour) > 6:  # More than 6 hours difference
                return True
        
        return False
    
    def _check_ip_anomaly(self, event: AuditEvent) -> bool:
        """Check for new or suspicious IP addresses"""
        if not event.user_id:
            return False
        
        baseline = self.user_baselines[event.user_id]
        
        # Check if IP is new for this user
        if event.ip_address not in baseline["ip_addresses"]:
            baseline["ip_addresses"].add(event.ip_address)
            
            # If user has established pattern and this is new
            if len(baseline["ip_addresses"]) > 1:
                return True
        
        return False
    
    def _check_data_exfiltration(self, event: AuditEvent) -> bool:
        """Check for data exfiltration patterns"""
        # Check for large data exports
        if "size" in event.details and event.details["size"] > 100000000:  # 100MB
            return True
        
        # Check for rapid sequential exports
        recent_exports = [
            e for e in self.global_patterns["data_exports"]
            if e.user_id == event.user_id and 
            (event.timestamp - e.timestamp).seconds < 300  # Within 5 minutes
        ]
        
        if len(recent_exports) > 5:
            return True
        
        self.global_patterns["data_exports"].append(event)
        return False
    
    def _check_brute_force(self, event: AuditEvent) -> bool:
        """Check for brute force attack patterns"""
        # Get recent login failures for this IP
        recent_failures = [
            e for e in self.global_patterns["login_failures"]
            if e.ip_address == event.ip_address and
            (event.timestamp - e.timestamp).seconds < 300  # Within 5 minutes
        ]
        
        self.global_patterns["login_failures"].append(event)
        
        # Keep only recent events
        cutoff_time = datetime.utcnow() - timedelta(minutes=5)
        self.global_patterns["login_failures"] = [
            e for e in self.global_patterns["login_failures"]
            if e.timestamp > cutoff_time
        ]
        
        return len(recent_failures) >= 5


class ComplianceChecker:
    """Check events for compliance violations"""
    
    def check_event(self, event: AuditEvent) -> List[str]:
        """Check event against all compliance standards"""
        violations = []
        
        for standard in ComplianceStandard:
            issues = self.check_event_for_standard(event, standard)
            violations.extend(issues)
        
        return violations
    
    def check_event_for_standard(self, event: AuditEvent, 
                                standard: ComplianceStandard) -> List[str]:
        """Check event against specific compliance standard"""
        violations = []
        
        if standard == ComplianceStandard.PCI_DSS:
            violations.extend(self._check_pci_dss(event))
        elif standard == ComplianceStandard.GDPR:
            violations.extend(self._check_gdpr(event))
        elif standard == ComplianceStandard.SOC2:
            violations.extend(self._check_soc2(event))
        
        return violations
    
    def _check_pci_dss(self, event: AuditEvent) -> List[str]:
        """Check PCI DSS compliance"""
        violations = []
        
        # Check for unencrypted card data
        if "card_number" in str(event.details) and not event.details.get("encrypted"):
            violations.append("PCI DSS: Unencrypted card data detected")
        
        # Check for excessive failed login attempts
        if event.event_type == AuditEventType.LOGIN_FAILURE:
            # Would need to track failed attempts per user
            pass
        
        return violations
    
    def _check_gdpr(self, event: AuditEvent) -> List[str]:
        """Check GDPR compliance"""
        violations = []
        
        # Check for data access without consent
        if event.event_type == AuditEventType.DATA_ACCESS:
            if not event.details.get("consent_verified"):
                violations.append("GDPR: Data access without verified consent")
        
        # Check for data retention violations
        if event.event_type == AuditEventType.DATA_DELETION:
            if event.details.get("retention_days", 0) > 730:
                violations.append("GDPR: Data retention exceeds maximum period")
        
        return violations
    
    def _check_soc2(self, event: AuditEvent) -> List[str]:
        """Check SOC2 compliance"""
        violations = []
        
        # Check for unencrypted data transmission
        if not event.details.get("encrypted_transport"):
            violations.append("SOC2: Unencrypted data transmission")
        
        # Check for missing audit trail
        if not event.correlation_id:
            violations.append("SOC2: Missing audit trail correlation")
        
        return violations


# Global auditor instance
security_auditor = SecurityAuditor()