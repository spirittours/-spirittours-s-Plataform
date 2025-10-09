"""
Web Application Firewall (WAF) Configuration
Spirit Tours Platform - Security Layer
"""

import re
import json
import logging
import hashlib
import time
from typing import Dict, List, Optional, Tuple, Set
from dataclasses import dataclass
from enum import Enum
from collections import defaultdict, deque
from datetime import datetime, timedelta
import ipaddress
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
import asyncio

logger = logging.getLogger(__name__)


class ThreatLevel(Enum):
    """Threat severity levels"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


class AttackType(Enum):
    """Types of attacks"""
    SQL_INJECTION = "sql_injection"
    XSS = "cross_site_scripting"
    PATH_TRAVERSAL = "path_traversal"
    COMMAND_INJECTION = "command_injection"
    XXE = "xml_external_entity"
    SSRF = "server_side_request_forgery"
    LDAP_INJECTION = "ldap_injection"
    CSRF = "cross_site_request_forgery"
    FILE_UPLOAD = "malicious_file_upload"
    BRUTE_FORCE = "brute_force"
    DOS = "denial_of_service"
    BOT = "bot_attack"


@dataclass
class SecurityRule:
    """Security rule definition"""
    name: str
    pattern: str
    attack_type: AttackType
    threat_level: ThreatLevel
    action: str  # block, challenge, log
    description: str


class WAFEngine:
    """Web Application Firewall Engine"""
    
    def __init__(self):
        self.rules = self._initialize_rules()
        self.ip_reputation = {}
        self.blocked_ips = set()
        self.whitelisted_ips = set()
        self.request_history = defaultdict(lambda: deque(maxlen=100))
        self.attack_patterns = self._load_attack_patterns()
        
    def _initialize_rules(self) -> List[SecurityRule]:
        """Initialize WAF rules"""
        return [
            # SQL Injection Rules
            SecurityRule(
                name="SQL_INJECTION_BASIC",
                pattern=r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b.*\b(FROM|INTO|WHERE|TABLE)\b)|(--)|(;.*\b(SELECT|INSERT|UPDATE|DELETE)\b)",
                attack_type=AttackType.SQL_INJECTION,
                threat_level=ThreatLevel.HIGH,
                action="block",
                description="Basic SQL injection pattern detected"
            ),
            SecurityRule(
                name="SQL_INJECTION_ADVANCED",
                pattern=r"(\b(OR|AND)\b\s*[\'\"]?\s*[\'\"]?\s*=\s*[\'\"]?\s*[\'\"]?)|(EXEC(\s|\+)+(SP_|XP_))|(WAITFOR\s+DELAY)",
                attack_type=AttackType.SQL_INJECTION,
                threat_level=ThreatLevel.CRITICAL,
                action="block",
                description="Advanced SQL injection pattern detected"
            ),
            
            # XSS Rules
            SecurityRule(
                name="XSS_SCRIPT_TAG",
                pattern=r"(<script[^>]*>.*?</script>)|(<script[^>]*/>)",
                attack_type=AttackType.XSS,
                threat_level=ThreatLevel.HIGH,
                action="block",
                description="Script tag injection detected"
            ),
            SecurityRule(
                name="XSS_EVENT_HANDLER",
                pattern=r"(on(click|load|mouseover|error|abort|change|focus|submit|keydown|keypress|keyup|blur)=)",
                attack_type=AttackType.XSS,
                threat_level=ThreatLevel.HIGH,
                action="block",
                description="Event handler injection detected"
            ),
            SecurityRule(
                name="XSS_JAVASCRIPT_URI",
                pattern=r"(javascript:|data:text/html|vbscript:|livescript:)",
                attack_type=AttackType.XSS,
                threat_level=ThreatLevel.HIGH,
                action="block",
                description="JavaScript URI injection detected"
            ),
            
            # Path Traversal Rules
            SecurityRule(
                name="PATH_TRAVERSAL",
                pattern=r"(\.\./|\.\.\\|%2e%2e%2f|%2e%2e/|\.\.%2f|%2e%2e%5c)",
                attack_type=AttackType.PATH_TRAVERSAL,
                threat_level=ThreatLevel.HIGH,
                action="block",
                description="Path traversal attempt detected"
            ),
            
            # Command Injection Rules
            SecurityRule(
                name="COMMAND_INJECTION",
                pattern=r"(\||;|&|`|\$\(|\)|\||<|>)",
                attack_type=AttackType.COMMAND_INJECTION,
                threat_level=ThreatLevel.CRITICAL,
                action="block",
                description="Command injection attempt detected"
            ),
            
            # XXE Rules
            SecurityRule(
                name="XXE_ATTACK",
                pattern=r"(<!ENTITY|<!DOCTYPE|SYSTEM|PUBLIC)",
                attack_type=AttackType.XXE,
                threat_level=ThreatLevel.HIGH,
                action="block",
                description="XML external entity attack detected"
            ),
            
            # SSRF Rules
            SecurityRule(
                name="SSRF_ATTACK",
                pattern=r"(localhost|127\.0\.0\.1|0\.0\.0\.0|::1|169\.254|metadata\.google|metadata\.aws)",
                attack_type=AttackType.SSRF,
                threat_level=ThreatLevel.HIGH,
                action="block",
                description="SSRF attempt detected"
            )
        ]
    
    def _load_attack_patterns(self) -> Dict[AttackType, List[str]]:
        """Load known attack patterns"""
        return {
            AttackType.SQL_INJECTION: [
                "' OR '1'='1",
                "1=1",
                "admin'--",
                "' OR 1=1--",
                "' UNION SELECT",
                "'; DROP TABLE",
                "' AND SLEEP(5)--"
            ],
            AttackType.XSS: [
                "<script>alert(",
                "javascript:alert(",
                "<img src=x onerror=",
                "<svg onload=",
                "<iframe src="
            ],
            AttackType.PATH_TRAVERSAL: [
                "../../../etc/passwd",
                "..\\..\\..\\windows\\system32",
                "%2e%2e%2f%2e%2e%2f",
                "....//....//",
                "file:///"
            ]
        }
    
    async def analyze_request(self, request: Request) -> Tuple[bool, Optional[str]]:
        """Analyze request for threats"""
        
        # Get request details
        client_ip = request.client.host
        path = request.url.path
        query_params = str(request.url.query)
        headers = dict(request.headers)
        
        # Check IP reputation
        if client_ip in self.blocked_ips:
            return False, "IP address is blocked"
        
        if client_ip in self.whitelisted_ips:
            return True, None
        
        # Check for rate limiting / DDoS
        if self._check_rate_limit(client_ip):
            self._update_ip_reputation(client_ip, -10)
            return False, "Rate limit exceeded - possible DDoS attack"
        
        # Check request against WAF rules
        threat_detected = False
        threat_messages = []
        
        # Check URL path
        for rule in self.rules:
            if re.search(rule.pattern, path, re.IGNORECASE):
                threat_detected = True
                threat_messages.append(f"{rule.name}: {rule.description}")
                self._log_threat(client_ip, rule)
                
                if rule.action == "block":
                    self._update_ip_reputation(client_ip, -5)
                    return False, f"Security threat detected: {rule.description}"
        
        # Check query parameters
        for rule in self.rules:
            if re.search(rule.pattern, query_params, re.IGNORECASE):
                threat_detected = True
                threat_messages.append(f"{rule.name}: {rule.description}")
                self._log_threat(client_ip, rule)
                
                if rule.action == "block":
                    self._update_ip_reputation(client_ip, -5)
                    return False, f"Security threat detected: {rule.description}"
        
        # Check headers
        suspicious_headers = self._check_headers(headers)
        if suspicious_headers:
            threat_messages.extend(suspicious_headers)
            self._update_ip_reputation(client_ip, -3)
        
        # Check request body if present
        if request.method in ["POST", "PUT", "PATCH"]:
            body = await self._get_request_body(request)
            if body:
                body_threats = self._check_body(body)
                if body_threats:
                    threat_messages.extend(body_threats)
                    self._update_ip_reputation(client_ip, -5)
                    return False, f"Malicious content detected in request body"
        
        # Update request history
        self._update_request_history(client_ip, request)
        
        # Check IP reputation score
        if self._get_ip_reputation_score(client_ip) < -20:
            self.blocked_ips.add(client_ip)
            return False, "IP blocked due to suspicious activity"
        
        return True, None if not threat_messages else "; ".join(threat_messages)
    
    def _check_rate_limit(self, ip: str) -> bool:
        """Check if IP exceeds rate limit"""
        history = self.request_history[ip]
        if len(history) >= 100:
            # Check if 100 requests in last minute
            minute_ago = time.time() - 60
            recent_requests = sum(1 for req_time in history if req_time > minute_ago)
            return recent_requests > 100
        return False
    
    def _check_headers(self, headers: Dict) -> List[str]:
        """Check headers for suspicious patterns"""
        threats = []
        
        # Check for missing security headers
        if "user-agent" not in headers:
            threats.append("Missing User-Agent header")
        
        # Check for suspicious user agents
        user_agent = headers.get("user-agent", "").lower()
        bot_patterns = ["bot", "crawler", "spider", "scraper", "curl", "wget", "python-requests"]
        if any(pattern in user_agent for pattern in bot_patterns):
            threats.append(f"Suspicious User-Agent: {user_agent}")
        
        # Check for header injection
        for header_name, header_value in headers.items():
            if "\n" in str(header_value) or "\r" in str(header_value):
                threats.append(f"Header injection in {header_name}")
        
        return threats
    
    def _check_body(self, body: str) -> List[str]:
        """Check request body for threats"""
        threats = []
        
        for rule in self.rules:
            if re.search(rule.pattern, body, re.IGNORECASE):
                threats.append(f"{rule.name}: {rule.description}")
        
        return threats
    
    async def _get_request_body(self, request: Request) -> Optional[str]:
        """Get request body content"""
        try:
            body = await request.body()
            return body.decode('utf-8') if body else None
        except:
            return None
    
    def _update_ip_reputation(self, ip: str, score_change: int):
        """Update IP reputation score"""
        if ip not in self.ip_reputation:
            self.ip_reputation[ip] = 0
        self.ip_reputation[ip] += score_change
    
    def _get_ip_reputation_score(self, ip: str) -> int:
        """Get IP reputation score"""
        return self.ip_reputation.get(ip, 0)
    
    def _update_request_history(self, ip: str, request: Request):
        """Update request history for IP"""
        self.request_history[ip].append(time.time())
    
    def _log_threat(self, ip: str, rule: SecurityRule):
        """Log detected threat"""
        logger.warning(f"Security threat from {ip}: {rule.name} - {rule.description}")
    
    def add_to_whitelist(self, ip: str):
        """Add IP to whitelist"""
        try:
            ipaddress.ip_address(ip)  # Validate IP
            self.whitelisted_ips.add(ip)
            logger.info(f"Added {ip} to whitelist")
        except ValueError:
            logger.error(f"Invalid IP address: {ip}")
    
    def add_to_blacklist(self, ip: str):
        """Add IP to blacklist"""
        try:
            ipaddress.ip_address(ip)  # Validate IP
            self.blocked_ips.add(ip)
            logger.info(f"Added {ip} to blacklist")
        except ValueError:
            logger.error(f"Invalid IP address: {ip}")


class DDoSProtection:
    """DDoS Protection System"""
    
    def __init__(self):
        self.connection_limits = {
            "per_ip": 100,
            "per_minute": 1000,
            "burst_size": 50
        }
        self.connection_tracking = defaultdict(lambda: {"count": 0, "timestamps": deque(maxlen=1000)})
        self.syn_flood_protection = True
        self.slowloris_protection = True
        
    def check_connection(self, ip: str) -> bool:
        """Check if connection should be allowed"""
        
        tracker = self.connection_tracking[ip]
        current_time = time.time()
        
        # Remove old timestamps
        tracker["timestamps"] = deque(
            (t for t in tracker["timestamps"] if current_time - t < 60),
            maxlen=1000
        )
        
        # Check per-minute limit
        if len(tracker["timestamps"]) >= self.connection_limits["per_minute"]:
            logger.warning(f"DDoS: IP {ip} exceeded per-minute limit")
            return False
        
        # Check burst size
        recent_timestamps = [t for t in tracker["timestamps"] if current_time - t < 1]
        if len(recent_timestamps) >= self.connection_limits["burst_size"]:
            logger.warning(f"DDoS: IP {ip} exceeded burst limit")
            return False
        
        # Track connection
        tracker["timestamps"].append(current_time)
        tracker["count"] += 1
        
        return True
    
    def check_syn_flood(self, ip: str, syn_count: int) -> bool:
        """Check for SYN flood attack"""
        if not self.syn_flood_protection:
            return True
        
        if syn_count > 100:  # Threshold for SYN packets
            logger.warning(f"Possible SYN flood from {ip}")
            return False
        
        return True
    
    def check_slowloris(self, ip: str, connection_time: float) -> bool:
        """Check for Slowloris attack"""
        if not self.slowloris_protection:
            return True
        
        # If connection is open for too long without completing
        if connection_time > 30:  # 30 seconds threshold
            logger.warning(f"Possible Slowloris attack from {ip}")
            return False
        
        return True


class WAFMiddleware(BaseHTTPMiddleware):
    """WAF Middleware for FastAPI"""
    
    def __init__(self, app, waf_engine: WAFEngine, ddos_protection: DDoSProtection):
        super().__init__(app)
        self.waf_engine = waf_engine
        self.ddos_protection = ddos_protection
        
    async def dispatch(self, request: Request, call_next):
        # Check DDoS protection
        client_ip = request.client.host
        if not self.ddos_protection.check_connection(client_ip):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests - DDoS protection triggered"
            )
        
        # Analyze request with WAF
        is_safe, threat_message = await self.waf_engine.analyze_request(request)
        
        if not is_safe:
            logger.warning(f"WAF blocked request from {client_ip}: {threat_message}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Request blocked by WAF: {threat_message}"
            )
        
        # Process request
        response = await call_next(request)
        
        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        return response


# Initialize WAF and DDoS protection
waf_engine = WAFEngine()
ddos_protection = DDoSProtection()

# Add trusted IPs to whitelist
trusted_ips = [
    "10.0.0.0/8",     # Internal network
    "172.16.0.0/12",  # Private network
    "192.168.0.0/16"  # Local network
]

for ip_range in trusted_ips:
    try:
        network = ipaddress.ip_network(ip_range)
        for ip in network:
            waf_engine.add_to_whitelist(str(ip))
    except:
        waf_engine.add_to_whitelist(ip_range)