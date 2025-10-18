"""
Monitoring Module.

This module provides monitoring and observability features.

Components:
- Prometheus metrics
- Health checks (liveness, readiness)
- System metrics collection

Author: GenSpark AI Developer
Phase: 10 - Monitoring & Observability
"""

from backend.monitoring.metrics import (
    MetricsCollector,
    get_metrics_collector,
    track_request_metrics,
    collect_system_metrics_periodically
)

from backend.monitoring.health_checks import (
    HealthCheckManager,
    HealthCheck,
    HealthStatus,
    DependencyType,
    get_health_manager
)

__all__ = [
    # Metrics
    'MetricsCollector',
    'get_metrics_collector',
    'track_request_metrics',
    'collect_system_metrics_periodically',
    
    # Health Checks
    'HealthCheckManager',
    'HealthCheck',
    'HealthStatus',
    'DependencyType',
    'get_health_manager',
]
