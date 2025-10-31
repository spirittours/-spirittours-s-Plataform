"""
Analytics & BI API Routes (Phase 4)

Endpoints para el sistema avanzado de Business Intelligence:
- KPIs en tiempo real
- Reportes personalizados
- Análisis de tendencias
- Alertas automáticas
- Data warehouse

Autor: Spirit Tours BI Team
Fecha: 2025-10-18
"""

from fastapi import APIRouter, Query, HTTPException, Depends
from datetime import date, datetime
from typing import List, Optional, Dict, Any
from decimal import Decimal

from .analytics_engine import (
    get_analytics_engine,
    AnalyticsEngine,
    MetricType,
    AggregationPeriod,
    DimensionType,
    AlertSeverity
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


# ============================================================================
# REAL-TIME KPIs
# ============================================================================

@router.get("/kpis/realtime")
async def get_realtime_kpis():
    """
    Obtener KPIs en tiempo real.
    
    Returns:
        Diccionario con todos los KPIs principales:
        - Revenue (hoy, mes, vs anterior)
        - Bookings (hoy, mes, vs anterior)
        - Conversion rate
        - Avg booking value
        - Customer satisfaction
        - Agent performance
    """
    engine = get_analytics_engine()
    kpis = await engine.get_realtime_kpis()
    return kpis


# ============================================================================
# DATA WAREHOUSE
# ============================================================================

@router.get("/warehouse/aggregate")
async def aggregate_metrics(
    metric_type: str = Query(..., description="Metric type: revenue, bookings, customers, etc."),
    period: str = Query(..., description="Aggregation period: day, week, month, quarter, year"),
    from_date: date = Query(..., description="From date"),
    to_date: date = Query(..., description="To date")
):
    """
    Agregar métricas del data warehouse por período.
    
    Retorna datos agregados listos para visualización.
    """
    engine = get_analytics_engine()
    
    try:
        aggregated = await engine.warehouse_manager.aggregate_metrics(
            MetricType(metric_type),
            AggregationPeriod(period),
            from_date,
            to_date
        )
        
        return {
            "metric_type": metric_type,
            "aggregation_period": period,
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat(),
            "data_points": len(aggregated),
            "data": aggregated
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid parameter: {str(e)}")


@router.post("/warehouse/materialized-view")
async def create_materialized_view(
    view_name: str = Query(..., min_length=3, max_length=100),
    metrics: List[str] = Query(..., description="List of metrics to include"),
    dimensions: List[str] = Query(..., description="List of dimensions for analysis"),
    refresh_interval: int = Query(3600, ge=60, le=86400, description="Refresh interval in seconds")
):
    """
    Crear vista materializada para consultas rápidas.
    
    Las vistas materializadas pre-calculan agregaciones complejas
    para mejorar el rendimiento de consultas frecuentes.
    """
    engine = get_analytics_engine()
    
    try:
        metric_types = [MetricType(m) for m in metrics]
        dimension_types = [DimensionType(d) for d in dimensions]
        
        view_config = await engine.warehouse_manager.create_materialized_view(
            view_name,
            metric_types,
            dimension_types,
            refresh_interval
        )
        
        return view_config
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid parameter: {str(e)}")


@router.get("/warehouse/fact-table")
async def get_fact_table(
    metric_type: str = Query(..., description="Metric type"),
    from_date: date = Query(..., description="From date"),
    to_date: date = Query(..., description="To date")
):
    """
    Obtener fact table para análisis dimensional.
    
    La fact table contiene registros granulares con todas las dimensiones
    disponibles para análisis multidimensional.
    """
    engine = get_analytics_engine()
    
    try:
        facts = await engine.warehouse_manager.get_fact_table(
            MetricType(metric_type),
            from_date,
            to_date
        )
        
        return {
            "metric_type": metric_type,
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat(),
            "record_count": len(facts),
            "facts": facts
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid parameter: {str(e)}")


# ============================================================================
# CUSTOM REPORTS
# ============================================================================

@router.post("/reports/custom")
async def create_custom_report(
    report_name: str = Query(..., min_length=3, max_length=200),
    description: str = Query(..., min_length=10),
    metrics: List[str] = Query(..., description="Metrics to include"),
    dimensions: List[str] = Query(..., description="Dimensions for analysis"),
    aggregation_period: str = Query(..., description="Aggregation period"),
    created_by: int = Query(..., description="User ID creating the report")
):
    """
    Crear reporte personalizado.
    
    Los reportes personalizados permiten a los usuarios definir
    sus propias combinaciones de métricas, dimensiones y filtros.
    """
    engine = get_analytics_engine()
    
    try:
        metric_types = [MetricType(m) for m in metrics]
        dimension_types = [DimensionType(d) for d in dimensions]
        
        report = await engine.report_builder.create_report(
            report_name=report_name,
            description=description,
            metrics=metric_types,
            dimensions=dimension_types,
            filters={},  # Filtros pueden agregarse en el body para POST
            aggregation_period=AggregationPeriod(aggregation_period),
            created_by=created_by
        )
        
        return report.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid parameter: {str(e)}")


@router.get("/reports/custom")
async def list_custom_reports(
    created_by: Optional[int] = Query(None, description="Filter by creator user ID")
):
    """
    Listar reportes personalizados guardados.
    
    Opcionalmente filtrar por usuario creador.
    """
    engine = get_analytics_engine()
    reports = await engine.report_builder.list_reports(created_by)
    
    return {
        "total": len(reports),
        "reports": [r.to_dict() for r in reports]
    }


@router.post("/reports/custom/{report_id}/execute")
async def execute_custom_report(
    report_id: str,
    from_date: date = Query(..., description="From date"),
    to_date: date = Query(..., description="To date")
):
    """
    Ejecutar reporte personalizado.
    
    Ejecuta el reporte con los parámetros especificados y
    retorna los datos completos con resumen estadístico.
    """
    engine = get_analytics_engine()
    
    try:
        result = await engine.report_builder.execute_report(
            report_id,
            from_date,
            to_date
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/reports/custom/{report_id}")
async def delete_custom_report(report_id: str):
    """
    Eliminar reporte personalizado.
    """
    engine = get_analytics_engine()
    
    deleted = await engine.report_builder.delete_report(report_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")
    
    return {"success": True, "report_id": report_id}


# ============================================================================
# TREND ANALYSIS
# ============================================================================

@router.get("/trends/{metric_type}")
async def get_trend_analysis(
    metric_type: str,
    period: str = Query(..., description="Aggregation period"),
    from_date: date = Query(..., description="From date"),
    to_date: date = Query(..., description="To date")
):
    """
    Análisis de tendencias para una métrica.
    
    Retorna:
    - Datos históricos agregados
    - Dirección de la tendencia (up, down, stable)
    - Porcentaje de cambio
    - Valor promedio
    """
    engine = get_analytics_engine()
    
    try:
        analysis = await engine.get_trend_analysis(
            MetricType(metric_type),
            AggregationPeriod(period),
            from_date,
            to_date
        )
        return analysis
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid parameter: {str(e)}")


@router.get("/cohorts")
async def get_cohort_analysis(
    cohort_type: str = Query("monthly", description="Cohort type: monthly or quarterly"),
    from_date: date = Query(..., description="From date"),
    to_date: date = Query(..., description="To date")
):
    """
    Análisis de cohortes para retención de clientes.
    
    Agrupa clientes por período de adquisición y analiza
    tasas de retención a lo largo del tiempo.
    """
    engine = get_analytics_engine()
    
    analysis = await engine.get_cohort_analysis(
        cohort_type,
        from_date,
        to_date
    )
    return analysis


# ============================================================================
# ALERT SYSTEM
# ============================================================================

@router.post("/alerts/rules")
async def add_alert_rule(
    metric_type: str = Query(..., description="Metric type to monitor"),
    threshold_value: Decimal = Query(..., description="Threshold value"),
    condition: str = Query(..., description="Condition: above, below, equals"),
    severity: str = Query(..., description="Severity: info, warning, critical"),
    title: str = Query(..., min_length=3, max_length=200),
    description: str = Query(..., min_length=10)
):
    """
    Agregar regla de alerta automática.
    
    El sistema monitoreará la métrica y generará alertas
    cuando se cumpla la condición.
    """
    engine = get_analytics_engine()
    
    try:
        rule_id = await engine.alert_system.add_alert_rule(
            MetricType(metric_type),
            threshold_value,
            condition,
            AlertSeverity(severity),
            title,
            description
        )
        
        return {
            "success": True,
            "rule_id": rule_id,
            "message": f"Alert rule created: {title}"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid parameter: {str(e)}")


@router.get("/alerts/active")
async def get_active_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity")
):
    """
    Obtener alertas activas.
    
    Opcionalmente filtrar por nivel de severidad.
    """
    engine = get_analytics_engine()
    
    severity_filter = AlertSeverity(severity) if severity else None
    
    alerts = await engine.alert_system.get_active_alerts(severity_filter)
    
    return {
        "total": len(alerts),
        "alerts": [alert.to_dict() for alert in alerts]
    }


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    """
    Reconocer/cerrar alerta.
    
    Marca la alerta como vista y la remueve de alertas activas.
    """
    engine = get_analytics_engine()
    
    acknowledged = await engine.alert_system.acknowledge_alert(alert_id)
    
    if not acknowledged:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
    
    return {
        "success": True,
        "alert_id": alert_id,
        "message": "Alert acknowledged"
    }


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def health_check():
    """Health check para el servicio de analytics."""
    engine = get_analytics_engine()
    
    return {
        "status": "healthy",
        "service": "analytics-bi",
        "components": {
            "warehouse_manager": engine.warehouse_manager is not None,
            "report_builder": engine.report_builder is not None,
            "alert_system": engine.alert_system is not None
        }
    }
