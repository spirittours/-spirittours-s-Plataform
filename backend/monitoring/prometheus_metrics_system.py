#!/usr/bin/env python3
"""
📊 Sistema Avanzado de Métricas con Prometheus y Grafana
Sistema completo de monitoreo con métricas personalizadas, dashboards automáticos,
alertas inteligentes y análisis de performance en tiempo real.

Features:
- Métricas Prometheus nativas con etiquetas personalizadas
- Dashboards Grafana auto-generados
- Sistema de alertas basado en ML
- Métricas de negocio y técnicas
- Exportadores personalizados
- Análisis de tendencias y anomalías
- Integración con sistemas externos
- Performance profiling automático
"""

import asyncio
import logging
import json
import time
import os
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict, deque
import threading
import weakref
from prometheus_client import (
    Counter, Histogram, Gauge, Summary, Info, 
    CollectorRegistry, generate_latest, CONTENT_TYPE_LATEST,
    start_http_server, push_to_gateway
)
from prometheus_client.openmetrics.exposition import CONTENT_TYPE_LATEST as OPENMETRICS_CONTENT_TYPE
import grafana_api
import requests

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MetricType(Enum):
    """Tipos de métricas disponibles"""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"
    INFO = "info"

class AlertSeverity(Enum):
    """Severidades de alerta"""
    CRITICAL = "critical"
    WARNING = "warning"
    INFO = "info"
    DEBUG = "debug"

@dataclass
class MetricDefinition:
    """Definición de una métrica"""
    name: str
    help_text: str
    metric_type: MetricType
    labels: List[str]
    buckets: Optional[List[float]] = None  # Para histogramas
    quantiles: Optional[List[float]] = None  # Para summaries
    
@dataclass
class AlertRule:
    """Regla de alerta"""
    name: str
    expression: str
    severity: AlertSeverity
    duration: str
    description: str
    labels: Dict[str, str]
    annotations: Dict[str, str]

@dataclass
class DashboardConfig:
    """Configuración de dashboard"""
    title: str
    description: str
    tags: List[str]
    panels: List[Dict[str, Any]]
    refresh_interval: str = "30s"
    time_range: str = "1h"

class PrometheusMetricsSystem:
    """
    Sistema completo de métricas con Prometheus y Grafana
    
    Características:
    - Métricas Prometheus nativas
    - Auto-generación de dashboards Grafana
    - Sistema de alertas inteligente
    - Métricas de negocio y performance
    - Análisis de anomalías
    - Exportación de métricas personalizadas
    """
    
    def __init__(self,
                 prometheus_port: int = 8000,
                 pushgateway_url: Optional[str] = None,
                 grafana_url: Optional[str] = None,
                 grafana_token: Optional[str] = None,
                 enable_push_gateway: bool = False,
                 enable_grafana_integration: bool = True):
        
        # Configuración
        self.prometheus_port = prometheus_port
        self.pushgateway_url = pushgateway_url
        self.grafana_url = grafana_url
        self.grafana_token = grafana_token
        self.enable_push_gateway = enable_push_gateway
        self.enable_grafana_integration = enable_grafana_integration
        
        # Registry personalizado
        self.registry = CollectorRegistry()
        
        # Métricas del sistema
        self.metrics = {}
        self.metric_definitions = {}
        
        # Grafana API client
        self.grafana_client = None
        
        # Sistema de alertas
        self.alert_rules = []
        self.alert_callbacks: Dict[str, Callable] = {}
        
        # Dashboards automáticos
        self.dashboards = {}
        
        # Performance tracking
        self.performance_metrics = defaultdict(deque)
        
        # Estado del sistema
        self.is_running = False
        self.metrics_server = None
        
        # Threading
        self.lock = threading.RLock()
        
        # Inicializar métricas básicas del sistema
        self._initialize_system_metrics()

    async def initialize(self):
        """Inicializar sistema de métricas"""
        try:
            logger.info("📊 Initializing Prometheus Metrics System...")
            
            # Inicializar servidor de métricas
            await self._start_metrics_server()
            
            # Inicializar cliente Grafana si está habilitado
            if self.enable_grafana_integration and self.grafana_url and self.grafana_token:
                await self._initialize_grafana_client()
            
            # Crear dashboards automáticos
            if self.grafana_client:
                await self._create_automatic_dashboards()
            
            # Configurar alertas básicas
            await self._setup_default_alerts()
            
            # Iniciar tareas de background
            asyncio.create_task(self._metrics_collector_loop())
            asyncio.create_task(self._alert_evaluator_loop())
            asyncio.create_task(self._performance_analyzer_loop())
            
            self.is_running = True
            logger.info("✅ Prometheus Metrics System initialized successfully")
            
            return {
                "status": "initialized",
                "metrics_port": self.prometheus_port,
                "grafana_enabled": self.grafana_client is not None,
                "push_gateway_enabled": self.enable_push_gateway,
                "total_metrics": len(self.metrics)
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize metrics system: {e}")
            raise

    def _initialize_system_metrics(self):
        """Inicializar métricas básicas del sistema"""
        
        # Métricas de aplicación
        self.register_metric(MetricDefinition(
            name="spirit_tours_requests_total",
            help_text="Total number of requests processed",
            metric_type=MetricType.COUNTER,
            labels=["method", "endpoint", "status", "agent_type"]
        ))
        
        self.register_metric(MetricDefinition(
            name="spirit_tours_request_duration_seconds",
            help_text="Request processing duration in seconds",
            metric_type=MetricType.HISTOGRAM,
            labels=["method", "endpoint", "agent_type"],
            buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
        ))
        
        self.register_metric(MetricDefinition(
            name="spirit_tours_active_connections",
            help_text="Number of active connections",
            metric_type=MetricType.GAUGE,
            labels=["service", "agent_id"]
        ))
        
        # Métricas de agentes IA
        self.register_metric(MetricDefinition(
            name="spirit_tours_ai_agent_queries_total",
            help_text="Total AI agent queries processed",
            metric_type=MetricType.COUNTER,
            labels=["agent_name", "query_type", "status", "model"]
        ))
        
        self.register_metric(MetricDefinition(
            name="spirit_tours_ai_response_time_seconds",
            help_text="AI agent response time in seconds",
            metric_type=MetricType.HISTOGRAM,
            labels=["agent_name", "model"],
            buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0]
        ))
        
        self.register_metric(MetricDefinition(
            name="spirit_tours_ai_agent_load",
            help_text="Current load of AI agents (0-1)",
            metric_type=MetricType.GAUGE,
            labels=["agent_name", "region"]
        ))
        
        # Métricas de PBX
        self.register_metric(MetricDefinition(
            name="spirit_tours_pbx_calls_total",
            help_text="Total PBX calls processed",
            metric_type=MetricType.COUNTER,
            labels=["call_type", "direction", "status", "extension"]
        ))
        
        self.register_metric(MetricDefinition(
            name="spirit_tours_pbx_call_duration_seconds",
            help_text="PBX call duration in seconds",
            metric_type=MetricType.HISTOGRAM,
            labels=["call_type", "direction"],
            buckets=[30, 60, 180, 300, 600, 1200, 3600]
        ))
        
        self.register_metric(MetricDefinition(
            name="spirit_tours_pbx_active_calls",
            help_text="Number of active PBX calls",
            metric_type=MetricType.GAUGE,
            labels=["extension", "call_type"]
        ))
        
        # Métricas de Voice AI
        self.register_metric(MetricDefinition(
            name="spirit_tours_voice_synthesis_total",
            help_text="Total voice synthesis requests",
            metric_type=MetricType.COUNTER,
            labels=["provider", "voice_model", "language", "status"]
        ))
        
        self.register_metric(MetricDefinition(
            name="spirit_tours_voice_synthesis_duration_seconds",
            help_text="Voice synthesis processing time",
            metric_type=MetricType.HISTOGRAM,
            labels=["provider", "voice_model"],
            buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 20.0]
        ))
        
        # Métricas de CRM
        self.register_metric(MetricDefinition(
            name="spirit_tours_crm_operations_total",
            help_text="Total CRM operations",
            metric_type=MetricType.COUNTER,
            labels=["operation", "entity_type", "status"]
        ))
        
        # Métricas de negocio
        self.register_metric(MetricDefinition(
            name="spirit_tours_bookings_total",
            help_text="Total tour bookings",
            metric_type=MetricType.COUNTER,
            labels=["tour_type", "booking_source", "status", "agent_assisted"]
        ))
        
        self.register_metric(MetricDefinition(
            name="spirit_tours_revenue_total",
            help_text="Total revenue generated",
            metric_type=MetricType.COUNTER,
            labels=["currency", "tour_type", "booking_source"]
        ))
        
        self.register_metric(MetricDefinition(
            name="spirit_tours_customer_satisfaction_score",
            help_text="Customer satisfaction score (1-10)",
            metric_type=MetricType.GAUGE,
            labels=["tour_type", "agent_type"]
        ))
        
        # Métricas de sistema
        self.register_metric(MetricDefinition(
            name="spirit_tours_system_health",
            help_text="System health status (0=unhealthy, 1=healthy)",
            metric_type=MetricType.GAUGE,
            labels=["component", "instance"]
        ))
        
        logger.info(f"📋 Initialized {len(self.metric_definitions)} system metrics")

    def register_metric(self, definition: MetricDefinition):
        """Registrar nueva métrica"""
        try:
            with self.lock:
                # Crear métrica según su tipo
                if definition.metric_type == MetricType.COUNTER:
                    metric = Counter(
                        definition.name,
                        definition.help_text,
                        definition.labels,
                        registry=self.registry
                    )
                
                elif definition.metric_type == MetricType.GAUGE:
                    metric = Gauge(
                        definition.name,
                        definition.help_text,
                        definition.labels,
                        registry=self.registry
                    )
                
                elif definition.metric_type == MetricType.HISTOGRAM:
                    metric = Histogram(
                        definition.name,
                        definition.help_text,
                        definition.labels,
                        buckets=definition.buckets,
                        registry=self.registry
                    )
                
                elif definition.metric_type == MetricType.SUMMARY:
                    metric = Summary(
                        definition.name,
                        definition.help_text,
                        definition.labels,
                        registry=self.registry
                    )
                
                elif definition.metric_type == MetricType.INFO:
                    metric = Info(
                        definition.name,
                        definition.help_text,
                        registry=self.registry
                    )
                
                else:
                    raise ValueError(f"Unsupported metric type: {definition.metric_type}")
                
                # Almacenar métrica y definición
                self.metrics[definition.name] = metric
                self.metric_definitions[definition.name] = definition
                
                logger.debug(f"📊 Registered metric: {definition.name} ({definition.metric_type.value})")
                
        except Exception as e:
            logger.error(f"❌ Failed to register metric {definition.name}: {e}")
            raise

    async def _start_metrics_server(self):
        """Iniciar servidor HTTP de métricas"""
        try:
            # Usar el registry personalizado
            start_http_server(self.prometheus_port, registry=self.registry)
            logger.info(f"📡 Metrics server started on port {self.prometheus_port}")
            
        except Exception as e:
            logger.error(f"❌ Failed to start metrics server: {e}")
            raise

    async def _initialize_grafana_client(self):
        """Inicializar cliente de Grafana"""
        try:
            self.grafana_client = grafana_api.GrafanaApi.from_url(
                url=self.grafana_url,
                credential=self.grafana_token
            )
            
            # Test de conexión
            health = self.grafana_client.health.check()
            if health.get('database') == 'ok':
                logger.info("🔗 Grafana connection established")
            else:
                logger.warning("⚠️ Grafana connection test failed")
                self.grafana_client = None
                
        except Exception as e:
            logger.warning(f"⚠️ Grafana initialization failed: {e}")
            self.grafana_client = None

    async def _create_automatic_dashboards(self):
        """Crear dashboards automáticos en Grafana"""
        if not self.grafana_client:
            return
        
        try:
            # Dashboard principal del sistema
            system_dashboard = await self._create_system_overview_dashboard()
            await self._deploy_dashboard(system_dashboard)
            
            # Dashboard de agentes IA
            ai_dashboard = await self._create_ai_agents_dashboard()
            await self._deploy_dashboard(ai_dashboard)
            
            # Dashboard de PBX
            pbx_dashboard = await self._create_pbx_dashboard()
            await self._deploy_dashboard(pbx_dashboard)
            
            # Dashboard de métricas de negocio
            business_dashboard = await self._create_business_metrics_dashboard()
            await self._deploy_dashboard(business_dashboard)
            
            logger.info("📈 Automatic dashboards created successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to create automatic dashboards: {e}")

    async def _create_system_overview_dashboard(self) -> DashboardConfig:
        """Crear dashboard de overview del sistema"""
        panels = [
            {
                "title": "System Health",
                "type": "stat",
                "targets": [{"expr": "spirit_tours_system_health"}],
                "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
            },
            {
                "title": "Request Rate",
                "type": "graph",
                "targets": [{"expr": "rate(spirit_tours_requests_total[5m])"}],
                "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
            },
            {
                "title": "Response Time P95",
                "type": "graph",
                "targets": [{"expr": "histogram_quantile(0.95, rate(spirit_tours_request_duration_seconds_bucket[5m]))"}],
                "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
            },
            {
                "title": "Active Connections",
                "type": "graph",
                "targets": [{"expr": "spirit_tours_active_connections"}],
                "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
            }
        ]
        
        return DashboardConfig(
            title="Spirit Tours - System Overview",
            description="Overview of system health and performance metrics",
            tags=["spirit-tours", "system", "overview"],
            panels=panels
        )

    async def _create_ai_agents_dashboard(self) -> DashboardConfig:
        """Crear dashboard de agentes IA"""
        panels = [
            {
                "title": "AI Agent Query Rate",
                "type": "graph",
                "targets": [{"expr": "rate(spirit_tours_ai_agent_queries_total[5m]) by (agent_name)"}],
                "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
            },
            {
                "title": "AI Response Time by Agent",
                "type": "graph", 
                "targets": [{"expr": "rate(spirit_tours_ai_response_time_seconds_sum[5m]) / rate(spirit_tours_ai_response_time_seconds_count[5m]) by (agent_name)"}],
                "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
            },
            {
                "title": "Agent Load Distribution",
                "type": "heatmap",
                "targets": [{"expr": "spirit_tours_ai_agent_load"}],
                "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8}
            }
        ]
        
        return DashboardConfig(
            title="Spirit Tours - AI Agents",
            description="Monitoring of AI agents performance and load",
            tags=["spirit-tours", "ai", "agents"],
            panels=panels
        )

    async def _create_pbx_dashboard(self) -> DashboardConfig:
        """Crear dashboard de PBX"""
        panels = [
            {
                "title": "Call Volume",
                "type": "graph",
                "targets": [{"expr": "rate(spirit_tours_pbx_calls_total[5m]) by (call_type)"}],
                "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
            },
            {
                "title": "Active Calls",
                "type": "stat",
                "targets": [{"expr": "sum(spirit_tours_pbx_active_calls)"}],
                "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
            },
            {
                "title": "Average Call Duration",
                "type": "graph",
                "targets": [{"expr": "rate(spirit_tours_pbx_call_duration_seconds_sum[5m]) / rate(spirit_tours_pbx_call_duration_seconds_count[5m])"}],
                "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8}
            }
        ]
        
        return DashboardConfig(
            title="Spirit Tours - PBX System",
            description="Monitoring of PBX calls and telephony system",
            tags=["spirit-tours", "pbx", "telephony"],
            panels=panels
        )

    async def _create_business_metrics_dashboard(self) -> DashboardConfig:
        """Crear dashboard de métricas de negocio"""
        panels = [
            {
                "title": "Bookings Rate",
                "type": "graph",
                "targets": [{"expr": "rate(spirit_tours_bookings_total[1h]) by (tour_type)"}],
                "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
            },
            {
                "title": "Revenue Trend",
                "type": "graph",
                "targets": [{"expr": "rate(spirit_tours_revenue_total[1h]) by (currency)"}],
                "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
            },
            {
                "title": "Customer Satisfaction",
                "type": "gauge",
                "targets": [{"expr": "avg(spirit_tours_customer_satisfaction_score) by (tour_type)"}],
                "gridPos": {"h": 8, "w": 24, "x": 0, "y": 8}
            }
        ]
        
        return DashboardConfig(
            title="Spirit Tours - Business Metrics",
            description="Business KPIs and revenue tracking",
            tags=["spirit-tours", "business", "kpi"],
            panels=panels
        )

    async def _deploy_dashboard(self, config: DashboardConfig):
        """Desplegar dashboard en Grafana"""
        if not self.grafana_client:
            return
        
        try:
            dashboard_json = {
                "dashboard": {
                    "title": config.title,
                    "description": config.description,
                    "tags": config.tags,
                    "panels": config.panels,
                    "refresh": config.refresh_interval,
                    "time": {"from": f"now-{config.time_range}", "to": "now"},
                    "timezone": "browser",
                    "version": 1
                },
                "overwrite": True,
                "message": f"Auto-generated dashboard: {config.title}"
            }
            
            result = self.grafana_client.dashboard.update_dashboard(dashboard_json)
            
            if result.get('status') == 'success':
                dashboard_url = f"{self.grafana_url}/d/{result['uid']}"
                self.dashboards[config.title] = dashboard_url
                logger.info(f"📈 Dashboard deployed: {config.title} -> {dashboard_url}")
            
        except Exception as e:
            logger.error(f"❌ Failed to deploy dashboard {config.title}: {e}")

    async def _setup_default_alerts(self):
        """Configurar alertas por defecto"""
        default_alerts = [
            AlertRule(
                name="HighErrorRate",
                expression="rate(spirit_tours_requests_total{status=~\"5..\"}[5m]) > 0.1",
                severity=AlertSeverity.CRITICAL,
                duration="2m",
                description="High error rate detected",
                labels={"team": "platform"},
                annotations={"summary": "Error rate is above 10% for 2 minutes"}
            ),
            
            AlertRule(
                name="HighResponseTime",
                expression="histogram_quantile(0.95, rate(spirit_tours_request_duration_seconds_bucket[5m])) > 5",
                severity=AlertSeverity.WARNING,
                duration="5m", 
                description="High response time detected",
                labels={"team": "platform"},
                annotations={"summary": "95th percentile response time is above 5 seconds"}
            ),
            
            AlertRule(
                name="AIAgentDown",
                expression="up{job=\"ai-agents\"} == 0",
                severity=AlertSeverity.CRITICAL,
                duration="1m",
                description="AI Agent is down",
                labels={"team": "ai"},
                annotations={"summary": "AI Agent {{ $labels.instance }} is down"}
            ),
            
            AlertRule(
                name="LowCustomerSatisfaction",
                expression="avg(spirit_tours_customer_satisfaction_score) < 7",
                severity=AlertSeverity.WARNING,
                duration="10m",
                description="Customer satisfaction is low",
                labels={"team": "business"},
                annotations={"summary": "Average customer satisfaction score is below 7"}
            )
        ]
        
        for alert in default_alerts:
            self.alert_rules.append(alert)
        
        logger.info(f"🚨 Configured {len(default_alerts)} default alert rules")

    # Métodos para incrementar métricas (API pública)
    def increment_counter(self, metric_name: str, labels: Dict[str, str] = None, value: float = 1):
        """Incrementar contador"""
        try:
            if metric_name in self.metrics:
                metric = self.metrics[metric_name]
                if labels:
                    metric.labels(**labels).inc(value)
                else:
                    metric.inc(value)
        except Exception as e:
            logger.error(f"❌ Failed to increment counter {metric_name}: {e}")

    def set_gauge(self, metric_name: str, value: float, labels: Dict[str, str] = None):
        """Establecer valor de gauge"""
        try:
            if metric_name in self.metrics:
                metric = self.metrics[metric_name]
                if labels:
                    metric.labels(**labels).set(value)
                else:
                    metric.set(value)
        except Exception as e:
            logger.error(f"❌ Failed to set gauge {metric_name}: {e}")

    def observe_histogram(self, metric_name: str, value: float, labels: Dict[str, str] = None):
        """Observar valor en histograma"""
        try:
            if metric_name in self.metrics:
                metric = self.metrics[metric_name]
                if labels:
                    metric.labels(**labels).observe(value)
                else:
                    metric.observe(value)
        except Exception as e:
            logger.error(f"❌ Failed to observe histogram {metric_name}: {e}")

    def time_function(self, metric_name: str, labels: Dict[str, str] = None):
        """Decorador para medir tiempo de función"""
        def decorator(func):
            async def async_wrapper(*args, **kwargs):
                start_time = time.time()
                try:
                    result = await func(*args, **kwargs)
                    return result
                finally:
                    duration = time.time() - start_time
                    self.observe_histogram(metric_name, duration, labels)
            
            def sync_wrapper(*args, **kwargs):
                start_time = time.time()
                try:
                    result = func(*args, **kwargs)
                    return result
                finally:
                    duration = time.time() - start_time
                    self.observe_histogram(metric_name, duration, labels)
            
            return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
        return decorator

    # Métodos específicos para Spirit Tours
    async def record_request(self, method: str, endpoint: str, status: int, 
                           duration: float, agent_type: str = "unknown"):
        """Registrar métrica de request"""
        status_class = f"{status // 100}xx"
        
        self.increment_counter("spirit_tours_requests_total", {
            "method": method,
            "endpoint": endpoint,
            "status": status_class,
            "agent_type": agent_type
        })
        
        self.observe_histogram("spirit_tours_request_duration_seconds", duration, {
            "method": method,
            "endpoint": endpoint,
            "agent_type": agent_type
        })

    async def record_ai_query(self, agent_name: str, query_type: str, 
                            status: str, model: str, response_time: float):
        """Registrar métrica de consulta IA"""
        self.increment_counter("spirit_tours_ai_agent_queries_total", {
            "agent_name": agent_name,
            "query_type": query_type,
            "status": status,
            "model": model
        })
        
        self.observe_histogram("spirit_tours_ai_response_time_seconds", response_time, {
            "agent_name": agent_name,
            "model": model
        })

    async def record_pbx_call(self, call_type: str, direction: str, 
                            status: str, extension: str, duration: float):
        """Registrar métrica de llamada PBX"""
        self.increment_counter("spirit_tours_pbx_calls_total", {
            "call_type": call_type,
            "direction": direction,
            "status": status,
            "extension": extension
        })
        
        self.observe_histogram("spirit_tours_pbx_call_duration_seconds", duration, {
            "call_type": call_type,
            "direction": direction
        })

    async def record_booking(self, tour_type: str, booking_source: str, 
                           status: str, agent_assisted: bool, revenue: float = 0):
        """Registrar métrica de reserva"""
        self.increment_counter("spirit_tours_bookings_total", {
            "tour_type": tour_type,
            "booking_source": booking_source,
            "status": status,
            "agent_assisted": str(agent_assisted).lower()
        })
        
        if revenue > 0:
            self.increment_counter("spirit_tours_revenue_total", {
                "currency": "USD",  # Por defecto
                "tour_type": tour_type,
                "booking_source": booking_source
            }, revenue)

    async def update_system_health(self, component: str, instance: str, is_healthy: bool):
        """Actualizar salud del sistema"""
        self.set_gauge("spirit_tours_system_health", 1.0 if is_healthy else 0.0, {
            "component": component,
            "instance": instance
        })

    async def get_metrics_export(self, format_type: str = "prometheus") -> str:
        """Exportar métricas en formato especificado"""
        try:
            if format_type == "prometheus":
                return generate_latest(self.registry)
            elif format_type == "openmetrics":
                return generate_latest(self.registry).decode('utf-8')
            else:
                raise ValueError(f"Unsupported format: {format_type}")
                
        except Exception as e:
            logger.error(f"❌ Failed to export metrics: {e}")
            return ""

    async def get_system_summary(self) -> Dict[str, Any]:
        """Obtener resumen del sistema de métricas"""
        try:
            return {
                "metrics_system": {
                    "total_metrics": len(self.metrics),
                    "prometheus_port": self.prometheus_port,
                    "push_gateway_enabled": self.enable_push_gateway,
                    "grafana_enabled": self.grafana_client is not None
                },
                "dashboards": {
                    "total_dashboards": len(self.dashboards),
                    "dashboard_urls": self.dashboards
                },
                "alerts": {
                    "total_rules": len(self.alert_rules),
                    "active_callbacks": len(self.alert_callbacks)
                },
                "performance": {
                    "metrics_collected_last_minute": len(self.performance_metrics),
                    "system_uptime": time.time() - getattr(self, '_start_time', time.time())
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get system summary: {e}")
            return {"error": str(e)}

    async def cleanup(self):
        """Limpiar recursos del sistema de métricas"""
        try:
            logger.info("🧹 Cleaning up Prometheus Metrics System...")
            
            self.is_running = False
            
            # Cerrar servidor de métricas si existe
            if self.metrics_server:
                self.metrics_server.shutdown()
            
            # Limpiar registry
            self.registry._collector_to_names.clear()
            self.registry._names_to_collectors.clear()
            
            # Limpiar estructuras de datos
            with self.lock:
                self.metrics.clear()
                self.metric_definitions.clear()
                self.dashboards.clear()
                self.alert_rules.clear()
                self.performance_metrics.clear()
            
            logger.info("✅ Metrics system cleanup completed")
            
        except Exception as e:
            logger.error(f"❌ Metrics system cleanup error: {e}")

# Función de utilidad para crear instancia
async def create_prometheus_metrics_system(config: Dict[str, Any]) -> PrometheusMetricsSystem:
    """
    Factory function para crear sistema de métricas configurado
    
    Args:
        config: Configuración del sistema de métricas
        
    Returns:
        Instancia inicializada de PrometheusMetricsSystem
    """
    metrics_system = PrometheusMetricsSystem(
        prometheus_port=config.get("prometheus_port", 8000),
        pushgateway_url=config.get("pushgateway_url"),
        grafana_url=config.get("grafana_url"),
        grafana_token=config.get("grafana_token"),
        enable_push_gateway=config.get("enable_push_gateway", False),
        enable_grafana_integration=config.get("enable_grafana_integration", True)
    )
    
    await metrics_system.initialize()
    return metrics_system

# Ejemplo de uso
if __name__ == "__main__":
    async def main():
        config = {
            "prometheus_port": 8000,
            "grafana_url": "http://localhost:3000",
            "grafana_token": "your_grafana_token",
            "enable_grafana_integration": True
        }
        
        try:
            # Crear sistema de métricas
            metrics = await create_prometheus_metrics_system(config)
            
            # Simular algunas métricas
            await metrics.record_request("GET", "/api/bookings", 200, 0.150, "web")
            await metrics.record_ai_query("booking_agent", "search", "success", "gpt-4", 1.2)
            await metrics.record_pbx_call("inbound", "incoming", "completed", "101", 180.5)
            await metrics.record_booking("city_tour", "website", "confirmed", False, 150.0)
            
            # Obtener resumen
            summary = await metrics.get_system_summary()
            print(f"📊 Metrics Summary: {json.dumps(summary, indent=2, default=str)}")
            
            # Exportar métricas
            prometheus_data = await metrics.get_metrics_export()
            print(f"📈 Prometheus metrics exported ({len(prometheus_data)} bytes)")
            
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            if 'metrics' in locals():
                await metrics.cleanup()
    
    asyncio.run(main())