"""
Load Balancer Configuration for Spirit Tours System
Provides production-ready load balancing, caching, and optimization configurations
for high-availability deployment with traffic distribution and performance optimization.
"""

import os
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
import yaml

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LoadBalancingAlgorithm(Enum):
    ROUND_ROBIN = "round_robin"
    LEAST_CONNECTIONS = "least_connections"
    IP_HASH = "ip_hash"
    WEIGHTED_ROUND_ROBIN = "weighted_round_robin"
    GEOGRAPHIC = "geographic"

class HealthCheckMethod(Enum):
    HTTP_GET = "http_get"
    TCP_CONNECT = "tcp_connect"
    HTTP_POST = "http_post"

@dataclass
class ServerConfig:
    """Configuration for a backend server"""
    host: str
    port: int
    weight: int = 1
    max_fails: int = 3
    fail_timeout: int = 30
    backup: bool = False
    down: bool = False

@dataclass
class HealthCheck:
    """Health check configuration"""
    method: HealthCheckMethod
    path: str = "/health"
    interval: int = 30
    timeout: int = 5
    retries: int = 3
    expected_status: int = 200
    expected_response: Optional[str] = None

@dataclass
class LoadBalancerPool:
    """Load balancer server pool configuration"""
    name: str
    algorithm: LoadBalancingAlgorithm
    servers: List[ServerConfig]
    health_check: HealthCheck
    sticky_sessions: bool = False
    session_cookie: str = "SPIRITTOURS_SESSION"
    keepalive: int = 32

@dataclass
class CacheConfig:
    """Caching configuration"""
    enabled: bool = True
    cache_type: str = "redis"  # redis, memcached, memory
    ttl_default: int = 300  # 5 minutes
    ttl_static: int = 86400  # 24 hours
    ttl_api: int = 60  # 1 minute
    max_size: int = 1000000  # 1M entries
    compression: bool = True

@dataclass
class RateLimitConfig:
    """Rate limiting configuration"""
    enabled: bool = True
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    burst_size: int = 10
    blocked_duration: int = 300  # 5 minutes

class LoadBalancerConfiguration:
    """
    Comprehensive load balancer configuration management
    for Spirit Tours production deployment
    """
    
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.load_balancer_pools = {}
        self.cache_config = None
        self.rate_limit_config = None
        self.ssl_config = {}
        self.compression_config = {}
        self._initialize_configurations()
    
    def _initialize_configurations(self):
        """Initialize all load balancer configurations"""
        logger.info(f"Initializing load balancer configuration for environment: {self.environment}")
        
        # Initialize server pools
        self._setup_api_pool()
        self._setup_frontend_pool()
        self._setup_ai_agents_pool()
        self._setup_database_pool()
        
        # Initialize caching
        self._setup_cache_config()
        
        # Initialize rate limiting
        self._setup_rate_limiting()
        
        # Initialize SSL/TLS
        self._setup_ssl_config()
        
        # Initialize compression
        self._setup_compression_config()
    
    def _setup_api_pool(self):
        """Setup API backend server pool"""
        if self.environment == "production":
            servers = [
                ServerConfig(host="api-1.spirittours.com", port=8000, weight=3),
                ServerConfig(host="api-2.spirittours.com", port=8000, weight=3),
                ServerConfig(host="api-3.spirittours.com", port=8000, weight=2),
                ServerConfig(host="api-backup.spirittours.com", port=8000, weight=1, backup=True)
            ]
        elif self.environment == "staging":
            servers = [
                ServerConfig(host="api-staging-1.spirittours.com", port=8000, weight=2),
                ServerConfig(host="api-staging-2.spirittours.com", port=8000, weight=1)
            ]
        else:  # development
            servers = [
                ServerConfig(host="127.0.0.1", port=8000, weight=1)
            ]
        
        health_check = HealthCheck(
            method=HealthCheckMethod.HTTP_GET,
            path="/api/v1/health",
            interval=15,
            timeout=3,
            retries=2
        )
        
        self.load_balancer_pools["api"] = LoadBalancerPool(
            name="spirit_tours_api",
            algorithm=LoadBalancingAlgorithm.LEAST_CONNECTIONS,
            servers=servers,
            health_check=health_check,
            sticky_sessions=True,
            keepalive=64
        )
    
    def _setup_frontend_pool(self):
        """Setup frontend server pool"""
        if self.environment == "production":
            servers = [
                ServerConfig(host="frontend-1.spirittours.com", port=3000, weight=2),
                ServerConfig(host="frontend-2.spirittours.com", port=3000, weight=2),
                ServerConfig(host="frontend-cdn.spirittours.com", port=3000, weight=1, backup=True)
            ]
        elif self.environment == "staging":
            servers = [
                ServerConfig(host="frontend-staging.spirittours.com", port=3000, weight=1)
            ]
        else:  # development
            servers = [
                ServerConfig(host="127.0.0.1", port=3000, weight=1)
            ]
        
        health_check = HealthCheck(
            method=HealthCheckMethod.HTTP_GET,
            path="/",
            interval=20,
            timeout=5,
            retries=2
        )
        
        self.load_balancer_pools["frontend"] = LoadBalancerPool(
            name="spirit_tours_frontend",
            algorithm=LoadBalancingAlgorithm.ROUND_ROBIN,
            servers=servers,
            health_check=health_check,
            sticky_sessions=False,
            keepalive=32
        )
    
    def _setup_ai_agents_pool(self):
        """Setup AI agents server pool"""
        if self.environment == "production":
            servers = [
                ServerConfig(host="ai-agent-1.spirittours.com", port=8001, weight=3),
                ServerConfig(host="ai-agent-2.spirittours.com", port=8001, weight=3),
                ServerConfig(host="ai-agent-gpu.spirittours.com", port=8001, weight=4),  # GPU-enabled
                ServerConfig(host="ai-agent-backup.spirittours.com", port=8001, weight=1, backup=True)
            ]
        elif self.environment == "staging":
            servers = [
                ServerConfig(host="ai-staging.spirittours.com", port=8001, weight=1)
            ]
        else:  # development
            servers = [
                ServerConfig(host="127.0.0.1", port=8001, weight=1)
            ]
        
        health_check = HealthCheck(
            method=HealthCheckMethod.HTTP_GET,
            path="/health",
            interval=30,
            timeout=10,  # AI operations may take longer
            retries=2
        )
        
        self.load_balancer_pools["ai_agents"] = LoadBalancerPool(
            name="spirit_tours_ai_agents",
            algorithm=LoadBalancingAlgorithm.LEAST_CONNECTIONS,
            servers=servers,
            health_check=health_check,
            sticky_sessions=True,  # Maintain session for conversation context
            session_cookie="AI_AGENT_SESSION",
            keepalive=16
        )
    
    def _setup_database_pool(self):
        """Setup database connection pool (for connection pooling, not load balancing)"""
        # This is for database connection management, not traditional load balancing
        if self.environment == "production":
            servers = [
                ServerConfig(host="db-primary.spirittours.com", port=5432, weight=4),  # Primary
                ServerConfig(host="db-read-1.spirittours.com", port=5432, weight=2),   # Read replica
                ServerConfig(host="db-read-2.spirittours.com", port=5432, weight=2),   # Read replica
            ]
        elif self.environment == "staging":
            servers = [
                ServerConfig(host="db-staging.spirittours.com", port=5432, weight=1)
            ]
        else:  # development
            servers = [
                ServerConfig(host="127.0.0.1", port=5432, weight=1)
            ]
        
        health_check = HealthCheck(
            method=HealthCheckMethod.TCP_CONNECT,
            interval=60,
            timeout=5,
            retries=3
        )
        
        self.load_balancer_pools["database"] = LoadBalancerPool(
            name="spirit_tours_database",
            algorithm=LoadBalancingAlgorithm.WEIGHTED_ROUND_ROBIN,
            servers=servers,
            health_check=health_check,
            sticky_sessions=False,
            keepalive=100
        )
    
    def _setup_cache_config(self):
        """Setup caching configuration"""
        if self.environment == "production":
            self.cache_config = CacheConfig(
                enabled=True,
                cache_type="redis",
                ttl_default=600,    # 10 minutes
                ttl_static=86400,   # 24 hours
                ttl_api=120,        # 2 minutes
                max_size=10000000,  # 10M entries
                compression=True
            )
        elif self.environment == "staging":
            self.cache_config = CacheConfig(
                enabled=True,
                cache_type="redis",
                ttl_default=300,
                ttl_static=3600,
                ttl_api=60,
                max_size=1000000,
                compression=True
            )
        else:  # development
            self.cache_config = CacheConfig(
                enabled=False,  # Disable caching in development
                cache_type="memory",
                ttl_default=60,
                ttl_static=300,
                ttl_api=30,
                max_size=100000,
                compression=False
            )
    
    def _setup_rate_limiting(self):
        """Setup rate limiting configuration"""
        if self.environment == "production":
            self.rate_limit_config = RateLimitConfig(
                enabled=True,
                requests_per_minute=100,
                requests_per_hour=2000,
                burst_size=20,
                blocked_duration=600  # 10 minutes
            )
        elif self.environment == "staging":
            self.rate_limit_config = RateLimitConfig(
                enabled=True,
                requests_per_minute=50,
                requests_per_hour=500,
                burst_size=10,
                blocked_duration=300
            )
        else:  # development
            self.rate_limit_config = RateLimitConfig(
                enabled=False,  # Disable rate limiting in development
                requests_per_minute=1000,
                requests_per_hour=10000,
                burst_size=100,
                blocked_duration=60
            )
    
    def _setup_ssl_config(self):
        """Setup SSL/TLS configuration"""
        self.ssl_config = {
            "enabled": self.environment != "development",
            "certificate_path": f"/etc/ssl/certs/spirittours.com.crt",
            "private_key_path": f"/etc/ssl/private/spirittours.com.key",
            "protocols": ["TLSv1.2", "TLSv1.3"],
            "ciphers": [
                "ECDHE-RSA-AES128-GCM-SHA256",
                "ECDHE-RSA-AES256-GCM-SHA384",
                "ECDHE-RSA-AES128-SHA256",
                "ECDHE-RSA-AES256-SHA384"
            ],
            "hsts_enabled": True,
            "hsts_max_age": 31536000,  # 1 year
            "redirect_http": True
        }
    
    def _setup_compression_config(self):
        """Setup compression configuration"""
        self.compression_config = {
            "enabled": True,
            "types": [
                "text/html",
                "text/css",
                "text/javascript",
                "application/javascript",
                "application/json",
                "text/xml",
                "application/xml",
                "text/plain"
            ],
            "min_size": 1024,  # Only compress files larger than 1KB
            "level": 6,  # Compression level (1-9)
            "vary_header": True
        }
    
    def generate_nginx_config(self) -> str:
        """Generate Nginx configuration file"""
        config_template = """
# Spirit Tours Load Balancer Configuration
# Generated automatically - DO NOT EDIT MANUALLY

worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Hide Nginx version
    server_tokens off;
    
    # MIME Types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for" '
                   'rt=$request_time uct="$upstream_connect_time" '
                   'uht="$upstream_header_time" urt="$upstream_response_time"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
"""
        
        # Add compression settings
        if self.compression_config["enabled"]:
            config_template += """
    # Compression Settings
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level {compression_level};
    gzip_min_length {min_size};
    gzip_types {mime_types};
""".format(
                compression_level=self.compression_config["level"],
                min_size=self.compression_config["min_size"],
                mime_types=" ".join(self.compression_config["types"])
            )
        
        # Add rate limiting
        if self.rate_limit_config.enabled:
            config_template += f"""
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:{self.rate_limit_config.requests_per_minute}m rate={self.rate_limit_config.requests_per_minute}r/m;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=10r/s;
"""
        
        # Add upstream pools
        for pool_name, pool_config in self.load_balancer_pools.items():
            config_template += self._generate_upstream_config(pool_name, pool_config)
        
        # Add server blocks
        config_template += self._generate_server_blocks()
        
        config_template += "\n}"  # Close http block
        
        return config_template
    
    def _generate_upstream_config(self, pool_name: str, pool_config: LoadBalancerPool) -> str:
        """Generate upstream configuration for a server pool"""
        upstream_config = f"""
    # {pool_config.name} upstream pool
    upstream {pool_name}_backend {{
"""
        
        # Add load balancing method
        if pool_config.algorithm == LoadBalancingAlgorithm.IP_HASH:
            upstream_config += "        ip_hash;\n"
        elif pool_config.algorithm == LoadBalancingAlgorithm.LEAST_CONNECTIONS:
            upstream_config += "        least_conn;\n"
        
        # Add keepalive
        upstream_config += f"        keepalive {pool_config.keepalive};\n"
        
        # Add servers
        for server in pool_config.servers:
            server_line = f"        server {server.host}:{server.port}"
            
            if server.weight != 1:
                server_line += f" weight={server.weight}"
            
            if server.max_fails != 3:
                server_line += f" max_fails={server.max_fails}"
            
            if server.fail_timeout != 30:
                server_line += f" fail_timeout={server.fail_timeout}s"
            
            if server.backup:
                server_line += " backup"
            
            if server.down:
                server_line += " down"
            
            server_line += ";\n"
            upstream_config += server_line
        
        upstream_config += "    }\n"
        
        return upstream_config
    
    def _generate_server_blocks(self) -> str:
        """Generate server blocks configuration"""
        server_config = ""
        
        # HTTPS redirect server (if SSL enabled)
        if self.ssl_config["enabled"] and self.ssl_config["redirect_http"]:
            server_config += """
    # HTTP to HTTPS redirect
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }
"""
        
        # Main HTTPS server
        if self.ssl_config["enabled"]:
            server_config += f"""
    # Main HTTPS server
    server {{
        listen 443 ssl http2;
        server_name spirittours.com www.spirittours.com;
        
        # SSL Configuration
        ssl_certificate {self.ssl_config["certificate_path"]};
        ssl_certificate_key {self.ssl_config["private_key_path"]};
        ssl_protocols {" ".join(self.ssl_config["protocols"])};
        ssl_ciphers '{":".join(self.ssl_config["ciphers"])}';
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
"""
        else:
            server_config += """
    # Main HTTP server (development)
    server {
        listen 80;
        server_name _;
"""
        
        # Add HSTS header if enabled
        if self.ssl_config["enabled"] and self.ssl_config["hsts_enabled"]:
            server_config += f"""        
        # HSTS Header
        add_header Strict-Transport-Security "max-age={self.ssl_config['hsts_max_age']}; includeSubDomains" always;
"""
        
        # Add security headers
        server_config += """
        # Security Headers
        add_header X-Frame-Options DENY always;
        add_header X-Content-Type-Options nosniff always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        
        # API routes
        location /api/ {
"""
        
        if self.rate_limit_config.enabled:
            server_config += f"""            limit_req zone=api_limit burst={self.rate_limit_config.burst_size} nodelay;
"""
        
        server_config += """            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }
        
        # AI Agents routes
        location /ai/ {
            proxy_pass http://ai_agents_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 120s;  # AI operations may take longer
        }
        
        # Frontend routes
        location / {
            proxy_pass http://frontend_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        # Static files caching
        location ~* \\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://frontend_backend;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
"""
        
        return server_config
    
    def generate_haproxy_config(self) -> str:
        """Generate HAProxy configuration file"""
        haproxy_config = """
# Spirit Tours HAProxy Configuration
# Generated automatically - DO NOT EDIT MANUALLY

global
    maxconn 4096
    log stdout local0
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    option httplog
    option dontlognull
    option redispatch
    retries 3
    maxconn 2000
"""
        
        # Add frontend configuration
        haproxy_config += """
frontend spirit_tours_frontend
    bind *:80
"""
        
        if self.ssl_config["enabled"]:
            haproxy_config += f"""    bind *:443 ssl crt {self.ssl_config["certificate_path"]}
    redirect scheme https if !{{ ssl_fc }}
"""
        
        # Add rate limiting
        if self.rate_limit_config.enabled:
            haproxy_config += f"""    stick-table type ip size 100k expire 30s store http_req_rate(10s)
    http-request track-sc0 src
    http-request deny if {{ sc_http_req_rate(0) gt {self.rate_limit_config.requests_per_minute} }}
"""
        
        # Add routing rules
        haproxy_config += """    
    # Routing rules
    use_backend api_backend if { path_beg /api/ }
    use_backend ai_agents_backend if { path_beg /ai/ }
    default_backend frontend_backend
"""
        
        # Add backend configurations
        for pool_name, pool_config in self.load_balancer_pools.items():
            haproxy_config += self._generate_haproxy_backend(pool_name, pool_config)
        
        return haproxy_config
    
    def _generate_haproxy_backend(self, pool_name: str, pool_config: LoadBalancerPool) -> str:
        """Generate HAProxy backend configuration"""
        backend_config = f"""
backend {pool_name}_backend
    balance {self._get_haproxy_algorithm(pool_config.algorithm)}
"""
        
        # Add health check
        if pool_config.health_check.method == HealthCheckMethod.HTTP_GET:
            backend_config += f"""    option httpchk GET {pool_config.health_check.path}
"""
        
        # Add sticky sessions if enabled
        if pool_config.sticky_sessions:
            backend_config += f"""    cookie {pool_config.session_cookie} insert indirect nocache
"""
        
        # Add servers
        for i, server in enumerate(pool_config.servers):
            server_line = f"    server {pool_name}_{i+1} {server.host}:{server.port}"
            
            if pool_config.health_check.method != HealthCheckMethod.TCP_CONNECT:
                server_line += " check"
            
            if server.weight != 1:
                server_line += f" weight {server.weight}"
            
            if server.backup:
                server_line += " backup"
            
            if pool_config.sticky_sessions:
                server_line += f" cookie {pool_name}_{i+1}"
            
            server_line += "\n"
            backend_config += server_line
        
        return backend_config
    
    def _get_haproxy_algorithm(self, algorithm: LoadBalancingAlgorithm) -> str:
        """Convert load balancing algorithm to HAProxy format"""
        algorithm_map = {
            LoadBalancingAlgorithm.ROUND_ROBIN: "roundrobin",
            LoadBalancingAlgorithm.LEAST_CONNECTIONS: "leastconn",
            LoadBalancingAlgorithm.IP_HASH: "source",
            LoadBalancingAlgorithm.WEIGHTED_ROUND_ROBIN: "roundrobin",
            LoadBalancingAlgorithm.GEOGRAPHIC: "roundrobin"
        }
        return algorithm_map.get(algorithm, "roundrobin")
    
    def export_to_yaml(self) -> str:
        """Export configuration to YAML format"""
        config_dict = {
            "environment": self.environment,
            "load_balancer_pools": {
                name: {
                    "name": pool.name,
                    "algorithm": pool.algorithm.value,
                    "servers": [
                        {
                            "host": server.host,
                            "port": server.port,
                            "weight": server.weight,
                            "max_fails": server.max_fails,
                            "fail_timeout": server.fail_timeout,
                            "backup": server.backup,
                            "down": server.down
                        }
                        for server in pool.servers
                    ],
                    "health_check": {
                        "method": pool.health_check.method.value,
                        "path": pool.health_check.path,
                        "interval": pool.health_check.interval,
                        "timeout": pool.health_check.timeout,
                        "retries": pool.health_check.retries,
                        "expected_status": pool.health_check.expected_status
                    },
                    "sticky_sessions": pool.sticky_sessions,
                    "session_cookie": pool.session_cookie,
                    "keepalive": pool.keepalive
                }
                for name, pool in self.load_balancer_pools.items()
            },
            "cache_config": {
                "enabled": self.cache_config.enabled,
                "cache_type": self.cache_config.cache_type,
                "ttl_default": self.cache_config.ttl_default,
                "ttl_static": self.cache_config.ttl_static,
                "ttl_api": self.cache_config.ttl_api,
                "max_size": self.cache_config.max_size,
                "compression": self.cache_config.compression
            },
            "rate_limit_config": {
                "enabled": self.rate_limit_config.enabled,
                "requests_per_minute": self.rate_limit_config.requests_per_minute,
                "requests_per_hour": self.rate_limit_config.requests_per_hour,
                "burst_size": self.rate_limit_config.burst_size,
                "blocked_duration": self.rate_limit_config.blocked_duration
            },
            "ssl_config": self.ssl_config,
            "compression_config": self.compression_config
        }
        
        return yaml.dump(config_dict, default_flow_style=False, indent=2)
    
    def get_pool_config(self, pool_name: str) -> Optional[LoadBalancerPool]:
        """Get configuration for a specific server pool"""
        return self.load_balancer_pools.get(pool_name)
    
    def get_all_pools(self) -> Dict[str, LoadBalancerPool]:
        """Get all server pool configurations"""
        return self.load_balancer_pools.copy()
    
    def validate_configuration(self) -> List[str]:
        """Validate the current configuration and return any issues"""
        issues = []
        
        # Check if any pools are defined
        if not self.load_balancer_pools:
            issues.append("No server pools defined")
        
        # Check each pool
        for pool_name, pool in self.load_balancer_pools.items():
            if not pool.servers:
                issues.append(f"Pool '{pool_name}' has no servers defined")
            
            # Check for at least one non-backup server
            non_backup_servers = [s for s in pool.servers if not s.backup]
            if not non_backup_servers:
                issues.append(f"Pool '{pool_name}' has no active (non-backup) servers")
            
            # Check server connectivity (basic validation)
            for server in pool.servers:
                if not server.host or not server.port:
                    issues.append(f"Pool '{pool_name}': Invalid server configuration - missing host or port")
        
        # Check SSL configuration if enabled
        if self.ssl_config.get("enabled", False):
            if not self.ssl_config.get("certificate_path"):
                issues.append("SSL enabled but no certificate path specified")
            if not self.ssl_config.get("private_key_path"):
                issues.append("SSL enabled but no private key path specified")
        
        return issues

# Global configuration instance
load_balancer_config = LoadBalancerConfiguration()

def get_load_balancer_config() -> LoadBalancerConfiguration:
    """Get the global load balancer configuration instance"""
    return load_balancer_config

def generate_nginx_config_file(output_path: str = "/tmp/nginx_spirittours.conf"):
    """Generate and save Nginx configuration file"""
    config = load_balancer_config.generate_nginx_config()
    with open(output_path, 'w') as f:
        f.write(config)
    logger.info(f"Nginx configuration generated: {output_path}")
    return output_path

def generate_haproxy_config_file(output_path: str = "/tmp/haproxy_spirittours.cfg"):
    """Generate and save HAProxy configuration file"""
    config = load_balancer_config.generate_haproxy_config()
    with open(output_path, 'w') as f:
        f.write(config)
    logger.info(f"HAProxy configuration generated: {output_path}")
    return output_path