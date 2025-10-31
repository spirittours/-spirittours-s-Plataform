"""
Analytics & BI Module - Phase 4

Sistema avanzado de Business Intelligence y Data Warehouse.

Autor: Spirit Tours BI Team
Fecha: 2025-10-18
"""

from .analytics_engine import (
    AnalyticsEngine,
    DataWarehouseManager,
    CustomReportBuilder,
    AnalyticsAlertSystem,
    MetricType,
    AggregationPeriod,
    DimensionType,
    AlertSeverity,
    AnalyticsMetric,
    AnalyticsAlert,
    CustomReport,
    get_analytics_engine
)

__all__ = [
    # Main Engine
    "AnalyticsEngine",
    "get_analytics_engine",
    
    # Components
    "DataWarehouseManager",
    "CustomReportBuilder",
    "AnalyticsAlertSystem",
    
    # Enums
    "MetricType",
    "AggregationPeriod",
    "DimensionType",
    "AlertSeverity",
    
    # Data Classes
    "AnalyticsMetric",
    "AnalyticsAlert",
    "CustomReport",
]
