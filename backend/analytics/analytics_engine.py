"""
Analytics Engine - Advanced BI & Data Warehouse (Phase 4)

Sistema avanzado de Business Intelligence que proporciona:
- Motor de análisis de datos profundo
- Generador de reportes personalizados
- Data warehouse con agregaciones
- KPIs en tiempo real
- Alertas automáticas
- Análisis predictivo

Autor: Spirit Tours BI Team
Fecha: 2025-10-18
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
import json
import logging

logger = logging.getLogger(__name__)


# ============================================================================
# ENUMS & DATA CLASSES
# ============================================================================

class MetricType(str, Enum):
    """Tipos de métricas analíticas."""
    REVENUE = "revenue"
    BOOKINGS = "bookings"
    CUSTOMERS = "customers"
    AGENTS = "agents"
    COMMISSIONS = "commissions"
    CONVERSION = "conversion"
    RETENTION = "retention"
    SATISFACTION = "satisfaction"


class AggregationPeriod(str, Enum):
    """Períodos de agregación."""
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"


class DimensionType(str, Enum):
    """Dimensiones de análisis."""
    TIME = "time"
    GEOGRAPHY = "geography"
    PRODUCT = "product"
    CUSTOMER_SEGMENT = "customer_segment"
    CHANNEL = "channel"
    AGENT = "agent"


class AlertSeverity(str, Enum):
    """Niveles de severidad de alertas."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class AnalyticsMetric:
    """Métrica analítica con metadatos."""
    metric_type: MetricType
    value: Decimal
    timestamp: datetime
    dimensions: Dict[str, str] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertir a diccionario."""
        return {
            "metric_type": self.metric_type.value,
            "value": float(self.value),
            "timestamp": self.timestamp.isoformat(),
            "dimensions": self.dimensions,
            "metadata": self.metadata
        }


@dataclass
class AnalyticsAlert:
    """Alerta del sistema de analytics."""
    alert_id: str
    severity: AlertSeverity
    title: str
    description: str
    metric_type: MetricType
    current_value: Decimal
    threshold_value: Decimal
    triggered_at: datetime
    dimensions: Dict[str, str] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertir a diccionario."""
        return {
            "alert_id": self.alert_id,
            "severity": self.severity.value,
            "title": self.title,
            "description": self.description,
            "metric_type": self.metric_type.value,
            "current_value": float(self.current_value),
            "threshold_value": float(self.threshold_value),
            "triggered_at": self.triggered_at.isoformat(),
            "dimensions": self.dimensions
        }


@dataclass
class CustomReport:
    """Reporte personalizado."""
    report_id: str
    report_name: str
    description: str
    metrics: List[MetricType]
    dimensions: List[DimensionType]
    filters: Dict[str, Any]
    aggregation_period: AggregationPeriod
    created_at: datetime
    created_by: int
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertir a diccionario."""
        return {
            "report_id": self.report_id,
            "report_name": self.report_name,
            "description": self.description,
            "metrics": [m.value for m in self.metrics],
            "dimensions": [d.value for d in self.dimensions],
            "filters": self.filters,
            "aggregation_period": self.aggregation_period.value,
            "created_at": self.created_at.isoformat(),
            "created_by": self.created_by
        }


# ============================================================================
# DATA WAREHOUSE MANAGER
# ============================================================================

class DataWarehouseManager:
    """
    Administrador del Data Warehouse.
    
    Gestiona el almacenamiento y agregación de datos históricos
    para análisis de largo plazo.
    """
    
    def __init__(self):
        """Inicializar Data Warehouse Manager."""
        self.aggregated_data: Dict[str, List[Dict[str, Any]]] = {}
        logger.info("DataWarehouseManager initialized")
    
    async def aggregate_metrics(
        self,
        metric_type: MetricType,
        period: AggregationPeriod,
        from_date: date,
        to_date: date
    ) -> List[Dict[str, Any]]:
        """
        Agregar métricas por período.
        
        Args:
            metric_type: Tipo de métrica a agregar
            period: Período de agregación
            from_date: Fecha inicio
            to_date: Fecha fin
        
        Returns:
            Lista de métricas agregadas por período
        """
        logger.info(f"Aggregating {metric_type.value} by {period.value} from {from_date} to {to_date}")
        
        # TODO: Implementar query real a data warehouse
        # Por ahora, generar datos de ejemplo
        
        aggregated = []
        current_date = from_date
        
        while current_date <= to_date:
            period_value = self._calculate_period_value(metric_type, current_date)
            
            aggregated.append({
                "period": current_date.isoformat(),
                "metric_type": metric_type.value,
                "value": float(period_value),
                "aggregation_period": period.value
            })
            
            current_date = self._next_period(current_date, period)
        
        return aggregated
    
    def _calculate_period_value(self, metric_type: MetricType, period_date: date) -> Decimal:
        """Calcular valor para un período (mock data)."""
        import random
        
        base_values = {
            MetricType.REVENUE: Decimal("50000"),
            MetricType.BOOKINGS: Decimal("150"),
            MetricType.CUSTOMERS: Decimal("120"),
            MetricType.AGENTS: Decimal("25"),
            MetricType.COMMISSIONS: Decimal("3000"),
            MetricType.CONVERSION: Decimal("2.5"),
            MetricType.RETENTION: Decimal("75"),
            MetricType.SATISFACTION: Decimal("4.5")
        }
        
        base = base_values.get(metric_type, Decimal("1000"))
        variation = Decimal(str(random.uniform(0.8, 1.2)))
        
        return base * variation
    
    def _next_period(self, current_date: date, period: AggregationPeriod) -> date:
        """Calcular siguiente período."""
        if period == AggregationPeriod.DAY:
            return current_date + timedelta(days=1)
        elif period == AggregationPeriod.WEEK:
            return current_date + timedelta(weeks=1)
        elif period == AggregationPeriod.MONTH:
            # Siguiente mes
            if current_date.month == 12:
                return date(current_date.year + 1, 1, 1)
            else:
                return date(current_date.year, current_date.month + 1, 1)
        elif period == AggregationPeriod.QUARTER:
            # Siguiente trimestre
            next_month = current_date.month + 3
            if next_month > 12:
                return date(current_date.year + 1, next_month - 12, 1)
            else:
                return date(current_date.year, next_month, 1)
        elif period == AggregationPeriod.YEAR:
            return date(current_date.year + 1, 1, 1)
        else:
            return current_date + timedelta(days=1)
    
    async def create_materialized_view(
        self,
        view_name: str,
        metrics: List[MetricType],
        dimensions: List[DimensionType],
        refresh_interval: int = 3600
    ) -> Dict[str, Any]:
        """
        Crear vista materializada para consultas rápidas.
        
        Args:
            view_name: Nombre de la vista
            metrics: Métricas a incluir
            dimensions: Dimensiones de análisis
            refresh_interval: Intervalo de refresco en segundos
        
        Returns:
            Configuración de la vista creada
        """
        logger.info(f"Creating materialized view: {view_name}")
        
        view_config = {
            "view_name": view_name,
            "metrics": [m.value for m in metrics],
            "dimensions": [d.value for d in dimensions],
            "refresh_interval_seconds": refresh_interval,
            "created_at": datetime.now().isoformat(),
            "status": "active"
        }
        
        # TODO: Implementar creación real de vista materializada en BD
        
        return view_config
    
    async def get_fact_table(
        self,
        metric_type: MetricType,
        from_date: date,
        to_date: date
    ) -> List[Dict[str, Any]]:
        """
        Obtener tabla de hechos (fact table) para análisis dimensional.
        
        Args:
            metric_type: Tipo de métrica
            from_date: Fecha inicio
            to_date: Fecha fin
        
        Returns:
            Registros de la fact table
        """
        logger.info(f"Fetching fact table for {metric_type.value}")
        
        # TODO: Implementar query real a fact table
        
        facts = []
        current_date = from_date
        
        while current_date <= to_date:
            facts.append({
                "fact_id": f"FACT-{current_date.isoformat()}-{metric_type.value}",
                "metric_type": metric_type.value,
                "value": float(self._calculate_period_value(metric_type, current_date)),
                "date_key": current_date.isoformat(),
                "dimensions": {
                    "geography": "Spain",
                    "product": "Package",
                    "channel": "B2B2B"
                }
            })
            
            current_date += timedelta(days=1)
        
        return facts


# ============================================================================
# CUSTOM REPORT BUILDER
# ============================================================================

class CustomReportBuilder:
    """
    Constructor de reportes personalizados.
    
    Permite a los usuarios crear reportes ad-hoc con métricas,
    dimensiones y filtros personalizados.
    """
    
    def __init__(self, warehouse_manager: DataWarehouseManager):
        """Inicializar Custom Report Builder."""
        self.warehouse_manager = warehouse_manager
        self.saved_reports: Dict[str, CustomReport] = {}
        logger.info("CustomReportBuilder initialized")
    
    async def create_report(
        self,
        report_name: str,
        description: str,
        metrics: List[MetricType],
        dimensions: List[DimensionType],
        filters: Dict[str, Any],
        aggregation_period: AggregationPeriod,
        created_by: int
    ) -> CustomReport:
        """
        Crear reporte personalizado.
        
        Args:
            report_name: Nombre del reporte
            description: Descripción del reporte
            metrics: Métricas a incluir
            dimensions: Dimensiones de análisis
            filters: Filtros aplicados
            aggregation_period: Período de agregación
            created_by: ID del usuario creador
        
        Returns:
            Reporte personalizado creado
        """
        report_id = f"REPORT-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        report = CustomReport(
            report_id=report_id,
            report_name=report_name,
            description=description,
            metrics=metrics,
            dimensions=dimensions,
            filters=filters,
            aggregation_period=aggregation_period,
            created_at=datetime.now(),
            created_by=created_by
        )
        
        self.saved_reports[report_id] = report
        
        logger.info(f"Created custom report: {report_id} - {report_name}")
        
        return report
    
    async def execute_report(
        self,
        report_id: str,
        from_date: date,
        to_date: date
    ) -> Dict[str, Any]:
        """
        Ejecutar reporte personalizado.
        
        Args:
            report_id: ID del reporte
            from_date: Fecha inicio
            to_date: Fecha fin
        
        Returns:
            Datos del reporte ejecutado
        """
        if report_id not in self.saved_reports:
            raise ValueError(f"Report {report_id} not found")
        
        report = self.saved_reports[report_id]
        
        logger.info(f"Executing report: {report_id} - {report.report_name}")
        
        # Obtener datos para cada métrica
        data_by_metric = {}
        
        for metric in report.metrics:
            metric_data = await self.warehouse_manager.aggregate_metrics(
                metric,
                report.aggregation_period,
                from_date,
                to_date
            )
            data_by_metric[metric.value] = metric_data
        
        # Aplicar filtros
        filtered_data = self._apply_filters(data_by_metric, report.filters)
        
        # Formatear resultado
        result = {
            "report": report.to_dict(),
            "execution": {
                "from_date": from_date.isoformat(),
                "to_date": to_date.isoformat(),
                "executed_at": datetime.now().isoformat()
            },
            "data": filtered_data,
            "summary": self._calculate_summary(filtered_data)
        }
        
        return result
    
    def _apply_filters(
        self,
        data: Dict[str, List[Dict[str, Any]]],
        filters: Dict[str, Any]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Aplicar filtros al data set."""
        # TODO: Implementar lógica de filtrado real
        # Por ahora, retornar data sin filtrar
        return data
    
    def _calculate_summary(
        self,
        data: Dict[str, List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """Calcular resumen estadístico del reporte."""
        summary = {}
        
        for metric_name, metric_data in data.items():
            values = [Decimal(str(d["value"])) for d in metric_data]
            
            if values:
                summary[metric_name] = {
                    "count": len(values),
                    "sum": float(sum(values)),
                    "avg": float(sum(values) / len(values)),
                    "min": float(min(values)),
                    "max": float(max(values))
                }
            else:
                summary[metric_name] = {
                    "count": 0,
                    "sum": 0,
                    "avg": 0,
                    "min": 0,
                    "max": 0
                }
        
        return summary
    
    async def list_reports(self, created_by: Optional[int] = None) -> List[CustomReport]:
        """
        Listar reportes guardados.
        
        Args:
            created_by: Filtrar por usuario creador (opcional)
        
        Returns:
            Lista de reportes
        """
        reports = list(self.saved_reports.values())
        
        if created_by is not None:
            reports = [r for r in reports if r.created_by == created_by]
        
        return reports
    
    async def delete_report(self, report_id: str) -> bool:
        """
        Eliminar reporte personalizado.
        
        Args:
            report_id: ID del reporte
        
        Returns:
            True si se eliminó correctamente
        """
        if report_id in self.saved_reports:
            del self.saved_reports[report_id]
            logger.info(f"Deleted report: {report_id}")
            return True
        
        return False


# ============================================================================
# ANALYTICS ALERT SYSTEM
# ============================================================================

class AnalyticsAlertSystem:
    """
    Sistema de alertas automáticas.
    
    Monitorea métricas en tiempo real y genera alertas cuando
    se superan umbrales configurados.
    """
    
    def __init__(self, warehouse_manager: DataWarehouseManager):
        """Inicializar Alert System."""
        self.warehouse_manager = warehouse_manager
        self.alert_rules: List[Dict[str, Any]] = []
        self.active_alerts: Dict[str, AnalyticsAlert] = {}
        logger.info("AnalyticsAlertSystem initialized")
    
    async def add_alert_rule(
        self,
        metric_type: MetricType,
        threshold_value: Decimal,
        condition: str,  # "above", "below", "equals"
        severity: AlertSeverity,
        title: str,
        description: str
    ) -> str:
        """
        Agregar regla de alerta.
        
        Args:
            metric_type: Tipo de métrica a monitorear
            threshold_value: Valor umbral
            condition: Condición de disparo
            severity: Severidad de la alerta
            title: Título de la alerta
            description: Descripción de la alerta
        
        Returns:
            ID de la regla creada
        """
        rule_id = f"RULE-{len(self.alert_rules) + 1:03d}"
        
        rule = {
            "rule_id": rule_id,
            "metric_type": metric_type,
            "threshold_value": threshold_value,
            "condition": condition,
            "severity": severity,
            "title": title,
            "description": description,
            "enabled": True,
            "created_at": datetime.now().isoformat()
        }
        
        self.alert_rules.append(rule)
        
        logger.info(f"Added alert rule: {rule_id} - {title}")
        
        return rule_id
    
    async def check_alerts(self, current_metrics: List[AnalyticsMetric]) -> List[AnalyticsAlert]:
        """
        Verificar métricas contra reglas de alerta.
        
        Args:
            current_metrics: Métricas actuales a verificar
        
        Returns:
            Lista de alertas disparadas
        """
        triggered_alerts = []
        
        for metric in current_metrics:
            # Buscar reglas aplicables
            for rule in self.alert_rules:
                if not rule["enabled"]:
                    continue
                
                if rule["metric_type"] != metric.metric_type:
                    continue
                
                # Evaluar condición
                triggered = False
                threshold = rule["threshold_value"]
                
                if rule["condition"] == "above" and metric.value > threshold:
                    triggered = True
                elif rule["condition"] == "below" and metric.value < threshold:
                    triggered = True
                elif rule["condition"] == "equals" and metric.value == threshold:
                    triggered = True
                
                if triggered:
                    alert_id = f"ALERT-{datetime.now().strftime('%Y%m%d%H%M%S')}-{rule['rule_id']}"
                    
                    alert = AnalyticsAlert(
                        alert_id=alert_id,
                        severity=rule["severity"],
                        title=rule["title"],
                        description=rule["description"],
                        metric_type=metric.metric_type,
                        current_value=metric.value,
                        threshold_value=threshold,
                        triggered_at=datetime.now(),
                        dimensions=metric.dimensions
                    )
                    
                    triggered_alerts.append(alert)
                    self.active_alerts[alert_id] = alert
                    
                    logger.warning(f"Alert triggered: {alert_id} - {alert.title}")
        
        return triggered_alerts
    
    async def get_active_alerts(
        self,
        severity: Optional[AlertSeverity] = None
    ) -> List[AnalyticsAlert]:
        """
        Obtener alertas activas.
        
        Args:
            severity: Filtrar por severidad (opcional)
        
        Returns:
            Lista de alertas activas
        """
        alerts = list(self.active_alerts.values())
        
        if severity is not None:
            alerts = [a for a in alerts if a.severity == severity]
        
        return alerts
    
    async def acknowledge_alert(self, alert_id: str) -> bool:
        """
        Reconocer/cerrar alerta.
        
        Args:
            alert_id: ID de la alerta
        
        Returns:
            True si se cerró correctamente
        """
        if alert_id in self.active_alerts:
            del self.active_alerts[alert_id]
            logger.info(f"Alert acknowledged: {alert_id}")
            return True
        
        return False


# ============================================================================
# MAIN ANALYTICS ENGINE
# ============================================================================

class AnalyticsEngine:
    """
    Motor principal de Analytics & BI.
    
    Coordina todos los componentes del sistema de analytics:
    - Data Warehouse
    - Custom Report Builder
    - Alert System
    - Real-time KPIs
    """
    
    def __init__(self):
        """Inicializar Analytics Engine."""
        self.warehouse_manager = DataWarehouseManager()
        self.report_builder = CustomReportBuilder(self.warehouse_manager)
        self.alert_system = AnalyticsAlertSystem(self.warehouse_manager)
        logger.info("AnalyticsEngine initialized")
    
    async def get_realtime_kpis(self) -> Dict[str, Any]:
        """
        Obtener KPIs en tiempo real.
        
        Returns:
            Diccionario con KPIs principales del sistema
        """
        logger.info("Fetching real-time KPIs")
        
        # TODO: Implementar query real a base de datos
        # Por ahora, generar datos de ejemplo
        
        today = date.today()
        month_start = date(today.year, today.month, 1)
        
        kpis = {
            "revenue": {
                "today": 12500.50,
                "month_to_date": 285000.00,
                "vs_last_month": "+12.5%",
                "trend": "up"
            },
            "bookings": {
                "today": 45,
                "month_to_date": 1250,
                "vs_last_month": "+8.3%",
                "trend": "up"
            },
            "conversion_rate": {
                "current": 3.2,
                "vs_last_month": "+0.5%",
                "trend": "up"
            },
            "avg_booking_value": {
                "current": 450.75,
                "vs_last_month": "+15.2%",
                "trend": "up"
            },
            "customer_satisfaction": {
                "current": 4.7,
                "total_reviews": 320,
                "trend": "stable"
            },
            "agent_performance": {
                "active_agents": 45,
                "top_performer": "AG001",
                "avg_commission": 1250.00
            },
            "updated_at": datetime.now().isoformat()
        }
        
        return kpis
    
    async def get_trend_analysis(
        self,
        metric_type: MetricType,
        period: AggregationPeriod,
        from_date: date,
        to_date: date
    ) -> Dict[str, Any]:
        """
        Análisis de tendencias para una métrica.
        
        Args:
            metric_type: Tipo de métrica
            period: Período de agregación
            from_date: Fecha inicio
            to_date: Fecha fin
        
        Returns:
            Análisis de tendencias con proyecciones
        """
        logger.info(f"Analyzing trends for {metric_type.value}")
        
        # Obtener datos históricos
        historical_data = await self.warehouse_manager.aggregate_metrics(
            metric_type, period, from_date, to_date
        )
        
        # Calcular tendencia
        values = [Decimal(str(d["value"])) for d in historical_data]
        
        if len(values) > 1:
            # Tendencia simple: comparar promedio primera mitad vs segunda mitad
            mid = len(values) // 2
            first_half_avg = sum(values[:mid]) / len(values[:mid])
            second_half_avg = sum(values[mid:]) / len(values[mid:])
            
            change_pct = ((second_half_avg - first_half_avg) / first_half_avg) * Decimal("100")
            
            trend_direction = "up" if change_pct > 0 else "down" if change_pct < 0 else "stable"
        else:
            change_pct = Decimal("0")
            trend_direction = "stable"
        
        return {
            "metric_type": metric_type.value,
            "period": period.value,
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat(),
            "data_points": len(historical_data),
            "historical_data": historical_data,
            "trend": {
                "direction": trend_direction,
                "change_percentage": float(change_pct),
                "avg_value": float(sum(values) / len(values)) if values else 0
            }
        }
    
    async def get_cohort_analysis(
        self,
        cohort_type: str,  # "monthly", "quarterly"
        from_date: date,
        to_date: date
    ) -> Dict[str, Any]:
        """
        Análisis de cohortes para retención de clientes.
        
        Args:
            cohort_type: Tipo de cohorte
            from_date: Fecha inicio
            to_date: Fecha fin
        
        Returns:
            Análisis de cohortes con tasas de retención
        """
        logger.info(f"Performing cohort analysis: {cohort_type}")
        
        # TODO: Implementar análisis real de cohortes
        
        cohorts = []
        current_date = from_date
        
        while current_date <= to_date:
            cohort = {
                "cohort_period": current_date.strftime("%Y-%m"),
                "initial_size": 100,
                "retention": {
                    "month_0": 100.0,
                    "month_1": 85.5,
                    "month_2": 72.3,
                    "month_3": 65.8,
                    "month_6": 48.2,
                    "month_12": 35.7
                }
            }
            cohorts.append(cohort)
            
            # Siguiente período
            if current_date.month == 12:
                current_date = date(current_date.year + 1, 1, 1)
            else:
                current_date = date(current_date.year, current_date.month + 1, 1)
        
        return {
            "cohort_type": cohort_type,
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat(),
            "cohorts": cohorts,
            "summary": {
                "avg_retention_month_1": 85.5,
                "avg_retention_month_3": 65.8,
                "avg_retention_month_12": 35.7
            }
        }


# ============================================================================
# SINGLETON PATTERN
# ============================================================================

_analytics_engine: Optional[AnalyticsEngine] = None


def get_analytics_engine() -> AnalyticsEngine:
    """Obtener instancia singleton del Analytics Engine."""
    global _analytics_engine
    
    if _analytics_engine is None:
        _analytics_engine = AnalyticsEngine()
    
    return _analytics_engine
