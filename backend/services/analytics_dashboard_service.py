#!/usr/bin/env python3
"""
Analytics Dashboard Service - Spirit Tours
Servicio de análisis y métricas en tiempo real para la plataforma
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Any, Union, Tuple
from datetime import datetime, timedelta, date
from dataclasses import dataclass, field
from enum import Enum
import uuid
import random
from collections import defaultdict, Counter
import statistics

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============== ENUMS & DATA CLASSES ==============

class MetricType(Enum):
    """Tipos de métricas disponibles"""
    REVENUE = "revenue"
    BOOKINGS = "bookings"
    CUSTOMERS = "customers"
    AGENTS = "agents"
    PERFORMANCE = "performance"
    SATISFACTION = "satisfaction"
    CONVERSION = "conversion"
    OPERATIONS = "operations"

class TimeRange(Enum):
    """Rangos de tiempo para análisis"""
    REAL_TIME = "real_time"
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    CUSTOM = "custom"

class BusinessModel(Enum):
    """Modelos de negocio"""
    B2C = "b2c"
    B2B = "b2b"
    B2B2C = "b2b2c"
    ALL = "all"

@dataclass
class MetricData:
    """Datos de una métrica"""
    metric_id: str
    name: str
    value: float
    unit: str
    trend: str  # up, down, stable
    change_percentage: float
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class DashboardWidget:
    """Widget del dashboard"""
    widget_id: str
    title: str
    type: str  # chart, metric, table, map
    data: Any
    refresh_rate: int  # seconds
    position: Dict[str, int]  # x, y, width, height

# ============== ANALYTICS ENGINE ==============

class AnalyticsEngine:
    """Motor principal de análisis"""
    
    def __init__(self):
        self.engine_id = "analytics_engine_v1"
        self.is_active = True
        self.metrics_cache = {}
        self.real_time_data = defaultdict(list)
        self.historical_data = defaultdict(list)
        
    async def calculate_revenue_metrics(self, time_range: TimeRange, business_model: BusinessModel = BusinessModel.ALL) -> Dict[str, Any]:
        """Calcular métricas de ingresos"""
        try:
            await asyncio.sleep(0.1)  # Simular cálculo
            
            # Simular datos según rango temporal
            if time_range == TimeRange.REAL_TIME:
                current_revenue = random.uniform(5000, 15000)
                previous_revenue = random.uniform(4000, 14000)
            elif time_range == TimeRange.DAILY:
                current_revenue = random.uniform(50000, 150000)
                previous_revenue = random.uniform(45000, 145000)
            elif time_range == TimeRange.MONTHLY:
                current_revenue = random.uniform(1500000, 4500000)
                previous_revenue = random.uniform(1400000, 4400000)
            else:
                current_revenue = random.uniform(100000, 300000)
                previous_revenue = random.uniform(95000, 295000)
            
            change_percentage = ((current_revenue - previous_revenue) / previous_revenue) * 100
            
            # Desglose por modelo de negocio
            revenue_breakdown = {
                BusinessModel.B2C.value: current_revenue * 0.45,
                BusinessModel.B2B.value: current_revenue * 0.35,
                BusinessModel.B2B2C.value: current_revenue * 0.20
            }
            
            return {
                "metric_type": MetricType.REVENUE.value,
                "time_range": time_range.value,
                "current_period": {
                    "total_revenue": round(current_revenue, 2),
                    "currency": "EUR",
                    "breakdown": revenue_breakdown if business_model == BusinessModel.ALL else {business_model.value: current_revenue}
                },
                "previous_period": {
                    "total_revenue": round(previous_revenue, 2),
                    "currency": "EUR"
                },
                "change": {
                    "absolute": round(current_revenue - previous_revenue, 2),
                    "percentage": round(change_percentage, 2),
                    "trend": "up" if change_percentage > 0 else "down" if change_percentage < 0 else "stable"
                },
                "projections": {
                    "next_period": round(current_revenue * random.uniform(0.95, 1.15), 2),
                    "confidence": random.uniform(75, 95)
                },
                "top_revenue_sources": [
                    {"source": "Tour Packages", "amount": current_revenue * 0.4, "percentage": 40},
                    {"source": "Hotel Bookings", "amount": current_revenue * 0.25, "percentage": 25},
                    {"source": "Activities", "amount": current_revenue * 0.2, "percentage": 20},
                    {"source": "Transportation", "amount": current_revenue * 0.15, "percentage": 15}
                ],
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Revenue calculation error: {e}")
            return {"error": str(e), "status": "failed"}
    
    async def calculate_booking_metrics(self, time_range: TimeRange) -> Dict[str, Any]:
        """Calcular métricas de reservas"""
        try:
            await asyncio.sleep(0.1)  # Simular cálculo
            
            # Generar datos según rango
            if time_range == TimeRange.REAL_TIME:
                total_bookings = random.randint(10, 50)
            elif time_range == TimeRange.DAILY:
                total_bookings = random.randint(200, 800)
            else:
                total_bookings = random.randint(1000, 5000)
            
            return {
                "metric_type": MetricType.BOOKINGS.value,
                "time_range": time_range.value,
                "total_bookings": total_bookings,
                "booking_breakdown": {
                    "confirmed": int(total_bookings * 0.75),
                    "pending": int(total_bookings * 0.15),
                    "cancelled": int(total_bookings * 0.10)
                },
                "booking_by_type": {
                    "tours": int(total_bookings * 0.4),
                    "hotels": int(total_bookings * 0.3),
                    "activities": int(total_bookings * 0.2),
                    "transport": int(total_bookings * 0.1)
                },
                "average_booking_value": round(random.uniform(150, 450), 2),
                "conversion_rate": round(random.uniform(2.5, 8.5), 2),
                "popular_destinations": [
                    {"destination": "Madrid", "bookings": int(total_bookings * 0.25)},
                    {"destination": "Barcelona", "bookings": int(total_bookings * 0.20)},
                    {"destination": "Sevilla", "bookings": int(total_bookings * 0.15)},
                    {"destination": "Valencia", "bookings": int(total_bookings * 0.10)},
                    {"destination": "Others", "bookings": int(total_bookings * 0.30)}
                ],
                "peak_booking_hours": [14, 15, 20, 21],  # 2-3 PM, 8-9 PM
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Booking metrics error: {e}")
            return {"error": str(e), "status": "failed"}
    
    async def calculate_customer_metrics(self) -> Dict[str, Any]:
        """Calcular métricas de clientes"""
        try:
            await asyncio.sleep(0.1)  # Simular cálculo
            
            total_customers = random.randint(10000, 50000)
            new_customers = random.randint(500, 2000)
            
            return {
                "metric_type": MetricType.CUSTOMERS.value,
                "total_customers": total_customers,
                "new_customers_today": new_customers,
                "customer_segments": {
                    "vip": int(total_customers * 0.05),
                    "premium": int(total_customers * 0.15),
                    "regular": int(total_customers * 0.50),
                    "new": int(total_customers * 0.30)
                },
                "customer_demographics": {
                    "age_groups": {
                        "18-25": 15,
                        "26-35": 30,
                        "36-45": 25,
                        "46-55": 20,
                        "56+": 10
                    },
                    "top_countries": [
                        {"country": "Spain", "percentage": 35},
                        {"country": "USA", "percentage": 20},
                        {"country": "UK", "percentage": 15},
                        {"country": "Germany", "percentage": 10},
                        {"country": "France", "percentage": 8}
                    ]
                },
                "customer_satisfaction": {
                    "nps_score": random.randint(60, 85),
                    "csat_score": round(random.uniform(4.2, 4.8), 1),
                    "reviews_count": random.randint(100, 500),
                    "average_rating": round(random.uniform(4.3, 4.9), 1)
                },
                "retention_metrics": {
                    "retention_rate": round(random.uniform(65, 85), 1),
                    "churn_rate": round(random.uniform(5, 15), 1),
                    "lifetime_value": round(random.uniform(800, 2500), 2),
                    "repeat_purchase_rate": round(random.uniform(30, 50), 1)
                },
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Customer metrics error: {e}")
            return {"error": str(e), "status": "failed"}
    
    async def calculate_ai_agents_metrics(self) -> Dict[str, Any]:
        """Calcular métricas de agentes IA"""
        try:
            await asyncio.sleep(0.1)  # Simular cálculo
            
            total_agents = 25
            active_agents = 21
            
            agent_performance = []
            agent_names = [
                "ContentMaster", "CompetitiveIntel", "CustomerProphet", "ExperienceCurator",
                "RevenueMaximizer", "SocialSentiment", "BookingOptimizer", "DemandForecaster",
                "FeedbackAnalyzer", "SecurityGuard", "MarketEntry", "InfluencerMatch",
                "LuxuryUpsell", "RouteGenius", "CrisisManagement", "PersonalizationEngine",
                "CulturalAdaptation", "SustainabilityAdvisor", "WellnessOptimizer",
                "KnowledgeCurator", "AccessibilitySpecialist"
            ]
            
            for agent_name in agent_names[:active_agents]:
                agent_performance.append({
                    "agent_name": agent_name,
                    "status": "active",
                    "requests_processed": random.randint(100, 1000),
                    "avg_response_time_ms": random.randint(50, 500),
                    "success_rate": round(random.uniform(92, 99.5), 1),
                    "efficiency_score": round(random.uniform(85, 98), 1)
                })
            
            return {
                "metric_type": MetricType.AGENTS.value,
                "total_agents": total_agents,
                "active_agents": active_agents,
                "inactive_agents": total_agents - active_agents,
                "overall_health": "excellent" if active_agents > 20 else "good" if active_agents > 15 else "needs_attention",
                "track_status": {
                    "track_1_customer_revenue": {"agents": 10, "active": 10, "health": "excellent"},
                    "track_2_security_market": {"agents": 5, "active": 5, "health": "excellent"},
                    "track_3_ethics_sustainability": {"agents": 10, "active": 6, "health": "good"}
                },
                "agent_performance": agent_performance[:5],  # Top 5 for summary
                "total_requests_today": sum(a["requests_processed"] for a in agent_performance),
                "average_response_time": statistics.mean(a["avg_response_time_ms"] for a in agent_performance),
                "system_efficiency": round(statistics.mean(a["efficiency_score"] for a in agent_performance), 1),
                "ai_insights_generated": random.randint(500, 2000),
                "automation_savings": {
                    "hours_saved": random.randint(100, 300),
                    "cost_saved_eur": round(random.uniform(5000, 15000), 2),
                    "efficiency_gain": f"{random.uniform(25, 45):.1f}%"
                },
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"AI agents metrics error: {e}")
            return {"error": str(e), "status": "failed"}
    
    async def calculate_performance_metrics(self) -> Dict[str, Any]:
        """Calcular métricas de rendimiento del sistema"""
        try:
            await asyncio.sleep(0.1)  # Simular cálculo
            
            return {
                "metric_type": MetricType.PERFORMANCE.value,
                "system_health": {
                    "overall_status": "healthy",
                    "uptime_percentage": 99.95,
                    "last_downtime": "2024-09-10T14:30:00",
                    "health_score": 95
                },
                "api_performance": {
                    "total_requests": random.randint(10000, 50000),
                    "success_rate": round(random.uniform(98.5, 99.9), 2),
                    "avg_response_time_ms": random.randint(50, 150),
                    "p95_response_time_ms": random.randint(200, 400),
                    "p99_response_time_ms": random.randint(500, 1000),
                    "requests_per_second": random.randint(10, 100)
                },
                "database_performance": {
                    "connections_active": random.randint(10, 50),
                    "connections_max": 100,
                    "query_avg_time_ms": random.randint(5, 50),
                    "slow_queries": random.randint(0, 10),
                    "cache_hit_rate": round(random.uniform(85, 95), 1)
                },
                "resource_utilization": {
                    "cpu_usage_percent": round(random.uniform(30, 70), 1),
                    "memory_usage_percent": round(random.uniform(40, 80), 1),
                    "disk_usage_percent": round(random.uniform(35, 65), 1),
                    "network_bandwidth_mbps": round(random.uniform(10, 100), 1)
                },
                "error_tracking": {
                    "errors_last_hour": random.randint(0, 20),
                    "errors_last_24h": random.randint(10, 100),
                    "critical_errors": random.randint(0, 2),
                    "warning_count": random.randint(5, 50),
                    "most_common_error": "Connection timeout (5 occurrences)"
                },
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Performance metrics error: {e}")
            return {"error": str(e), "status": "failed"}

# ============== REAL-TIME DASHBOARD SERVICE ==============

class RealTimeDashboardService:
    """Servicio de dashboard en tiempo real"""
    
    def __init__(self):
        self.service_id = "realtime_dashboard"
        self.analytics_engine = AnalyticsEngine()
        self.widgets = {}
        self.active_connections = set()
        self.update_interval = 5  # seconds
        
    async def get_dashboard_data(self, dashboard_type: str = "executive") -> Dict[str, Any]:
        """Obtener datos completos del dashboard"""
        try:
            # Ejecutar todas las métricas en paralelo
            tasks = [
                self.analytics_engine.calculate_revenue_metrics(TimeRange.DAILY),
                self.analytics_engine.calculate_booking_metrics(TimeRange.DAILY),
                self.analytics_engine.calculate_customer_metrics(),
                self.analytics_engine.calculate_ai_agents_metrics(),
                self.analytics_engine.calculate_performance_metrics()
            ]
            
            results = await asyncio.gather(*tasks)
            
            # Construir dashboard según tipo
            if dashboard_type == "executive":
                return self._build_executive_dashboard(results)
            elif dashboard_type == "operational":
                return self._build_operational_dashboard(results)
            elif dashboard_type == "technical":
                return self._build_technical_dashboard(results)
            else:
                return self._build_default_dashboard(results)
                
        except Exception as e:
            logger.error(f"Dashboard data error: {e}")
            return {"error": str(e), "status": "failed"}
    
    def _build_executive_dashboard(self, metrics_data: List[Dict]) -> Dict[str, Any]:
        """Construir dashboard ejecutivo"""
        revenue_data = metrics_data[0]
        booking_data = metrics_data[1]
        customer_data = metrics_data[2]
        
        return {
            "dashboard_type": "executive",
            "title": "Executive Dashboard - Spirit Tours",
            "last_updated": datetime.now().isoformat(),
            "kpi_summary": {
                "total_revenue": {
                    "value": revenue_data["current_period"]["total_revenue"],
                    "change": revenue_data["change"]["percentage"],
                    "trend": revenue_data["change"]["trend"],
                    "unit": "EUR"
                },
                "total_bookings": {
                    "value": booking_data["total_bookings"],
                    "change": random.uniform(-5, 15),
                    "trend": "up",
                    "unit": "bookings"
                },
                "active_customers": {
                    "value": customer_data["total_customers"],
                    "change": random.uniform(2, 8),
                    "trend": "up",
                    "unit": "customers"
                },
                "customer_satisfaction": {
                    "value": customer_data["customer_satisfaction"]["average_rating"],
                    "change": random.uniform(-0.2, 0.3),
                    "trend": "stable",
                    "unit": "rating"
                }
            },
            "charts": {
                "revenue_trend": self._generate_trend_chart("Revenue Trend", "revenue"),
                "bookings_by_type": self._generate_pie_chart("Bookings by Type", booking_data["booking_by_type"]),
                "customer_segments": self._generate_bar_chart("Customer Segments", customer_data["customer_segments"]),
                "geographic_distribution": self._generate_geo_chart("Customer Distribution", customer_data["customer_demographics"]["top_countries"])
            },
            "alerts": self._generate_executive_alerts(),
            "recommendations": self._generate_executive_recommendations(metrics_data),
            "next_update_in_seconds": self.update_interval
        }
    
    def _build_operational_dashboard(self, metrics_data: List[Dict]) -> Dict[str, Any]:
        """Construir dashboard operacional"""
        booking_data = metrics_data[1]
        ai_data = metrics_data[3]
        performance_data = metrics_data[4]
        
        return {
            "dashboard_type": "operational",
            "title": "Operational Dashboard - Spirit Tours",
            "last_updated": datetime.now().isoformat(),
            "operations_summary": {
                "bookings_status": booking_data["booking_breakdown"],
                "ai_agents_status": {
                    "active": ai_data["active_agents"],
                    "total": ai_data["total_agents"],
                    "health": ai_data["overall_health"]
                },
                "system_performance": {
                    "api_success_rate": performance_data["api_performance"]["success_rate"],
                    "avg_response_time": performance_data["api_performance"]["avg_response_time_ms"],
                    "system_health": performance_data["system_health"]["overall_status"]
                }
            },
            "real_time_metrics": {
                "current_bookings_queue": random.randint(5, 25),
                "agents_processing": random.randint(3, 15),
                "pending_confirmations": random.randint(10, 50),
                "support_tickets_open": random.randint(2, 20)
            },
            "operational_alerts": self._generate_operational_alerts(),
            "resource_allocation": {
                "staff_utilization": f"{random.uniform(65, 85):.1f}%",
                "system_load": f"{random.uniform(40, 70):.1f}%",
                "booking_capacity": f"{random.uniform(50, 80):.1f}%"
            },
            "next_update_in_seconds": self.update_interval
        }
    
    def _build_technical_dashboard(self, metrics_data: List[Dict]) -> Dict[str, Any]:
        """Construir dashboard técnico"""
        ai_data = metrics_data[3]
        performance_data = metrics_data[4]
        
        return {
            "dashboard_type": "technical",
            "title": "Technical Dashboard - Spirit Tours",
            "last_updated": datetime.now().isoformat(),
            "system_metrics": performance_data,
            "ai_agents_performance": ai_data,
            "infrastructure_status": {
                "services": {
                    "api_gateway": "healthy",
                    "database": "healthy",
                    "cache": "healthy",
                    "message_queue": "healthy",
                    "ai_services": "healthy"
                },
                "deployments": {
                    "last_deployment": "2024-09-20T10:30:00",
                    "version": "2.3.1",
                    "environment": "production",
                    "next_maintenance": "2024-10-01T02:00:00"
                }
            },
            "monitoring_alerts": self._generate_technical_alerts(),
            "next_update_in_seconds": self.update_interval
        }
    
    def _build_default_dashboard(self, metrics_data: List[Dict]) -> Dict[str, Any]:
        """Construir dashboard por defecto"""
        return {
            "dashboard_type": "default",
            "title": "Spirit Tours Dashboard",
            "last_updated": datetime.now().isoformat(),
            "summary": {
                "revenue": metrics_data[0]["current_period"]["total_revenue"],
                "bookings": metrics_data[1]["total_bookings"],
                "customers": metrics_data[2]["total_customers"],
                "ai_agents": f"{metrics_data[3]['active_agents']}/{metrics_data[3]['total_agents']}",
                "system_health": metrics_data[4]["system_health"]["overall_status"]
            },
            "all_metrics": metrics_data,
            "next_update_in_seconds": self.update_interval
        }
    
    def _generate_trend_chart(self, title: str, metric_type: str) -> Dict[str, Any]:
        """Generar datos para gráfico de tendencia"""
        data_points = []
        for i in range(30):  # Últimos 30 días
            date = (datetime.now() - timedelta(days=29-i)).date().isoformat()
            value = random.uniform(50000, 150000) if metric_type == "revenue" else random.randint(100, 500)
            data_points.append({"date": date, "value": value})
        
        return {
            "chart_type": "line",
            "title": title,
            "data": data_points,
            "x_axis": "date",
            "y_axis": "value"
        }
    
    def _generate_pie_chart(self, title: str, data: Dict) -> Dict[str, Any]:
        """Generar datos para gráfico de pastel"""
        return {
            "chart_type": "pie",
            "title": title,
            "data": [{"label": k, "value": v} for k, v in data.items()]
        }
    
    def _generate_bar_chart(self, title: str, data: Dict) -> Dict[str, Any]:
        """Generar datos para gráfico de barras"""
        return {
            "chart_type": "bar",
            "title": title,
            "data": [{"category": k, "value": v} for k, v in data.items()],
            "x_axis": "category",
            "y_axis": "value"
        }
    
    def _generate_geo_chart(self, title: str, data: List[Dict]) -> Dict[str, Any]:
        """Generar datos para gráfico geográfico"""
        return {
            "chart_type": "geo",
            "title": title,
            "data": data
        }
    
    def _generate_executive_alerts(self) -> List[Dict]:
        """Generar alertas ejecutivas"""
        alerts = []
        
        if random.random() > 0.7:
            alerts.append({
                "level": "info",
                "message": "Revenue exceeds monthly target by 12%",
                "timestamp": datetime.now().isoformat()
            })
        
        if random.random() > 0.8:
            alerts.append({
                "level": "warning",
                "message": "Customer churn rate increased by 3% this week",
                "timestamp": datetime.now().isoformat()
            })
        
        return alerts
    
    def _generate_operational_alerts(self) -> List[Dict]:
        """Generar alertas operacionales"""
        alerts = [
            {
                "level": "info",
                "message": "15 new bookings in the last hour",
                "timestamp": datetime.now().isoformat()
            }
        ]
        
        if random.random() > 0.6:
            alerts.append({
                "level": "warning",
                "message": "High demand detected for Madrid tours",
                "timestamp": datetime.now().isoformat()
            })
        
        return alerts
    
    def _generate_technical_alerts(self) -> List[Dict]:
        """Generar alertas técnicas"""
        alerts = []
        
        if random.random() > 0.9:
            alerts.append({
                "level": "critical",
                "message": "Database connection pool reaching limit",
                "timestamp": datetime.now().isoformat()
            })
        
        if random.random() > 0.7:
            alerts.append({
                "level": "warning",
                "message": "API response time degradation detected",
                "timestamp": datetime.now().isoformat()
            })
        
        return alerts
    
    def _generate_executive_recommendations(self, metrics_data: List[Dict]) -> List[Dict]:
        """Generar recomendaciones ejecutivas basadas en datos"""
        recommendations = []
        
        revenue_data = metrics_data[0]
        if revenue_data["change"]["percentage"] < 5:
            recommendations.append({
                "priority": "high",
                "category": "revenue",
                "recommendation": "Consider promotional campaigns to boost revenue growth",
                "potential_impact": "+10-15% revenue increase",
                "implementation_time": "1-2 weeks"
            })
        
        customer_data = metrics_data[2]
        if customer_data["retention_metrics"]["churn_rate"] > 10:
            recommendations.append({
                "priority": "high",
                "category": "customer",
                "recommendation": "Implement customer retention program",
                "potential_impact": "Reduce churn by 30%",
                "implementation_time": "2-4 weeks"
            })
        
        recommendations.append({
            "priority": "medium",
            "category": "operations",
            "recommendation": "Optimize AI agent allocation for peak hours",
            "potential_impact": "15% efficiency improvement",
            "implementation_time": "1 week"
        })
        
        return recommendations[:3]  # Top 3 recommendations

# ============== REPORTING SERVICE ==============

class ReportingService:
    """Servicio de generación de reportes"""
    
    def __init__(self):
        self.service_id = "reporting_service"
        self.analytics_engine = AnalyticsEngine()
        
    async def generate_financial_report(self, period: str = "monthly") -> Dict[str, Any]:
        """Generar reporte financiero"""
        try:
            # Determinar rango temporal
            time_range = TimeRange.MONTHLY if period == "monthly" else TimeRange.QUARTERLY if period == "quarterly" else TimeRange.YEARLY
            
            # Obtener métricas financieras
            revenue_metrics = await self.analytics_engine.calculate_revenue_metrics(time_range)
            
            return {
                "report_type": "financial",
                "report_id": f"fin_report_{uuid.uuid4().hex[:8]}",
                "period": period,
                "generated_at": datetime.now().isoformat(),
                "executive_summary": {
                    "total_revenue": revenue_metrics["current_period"]["total_revenue"],
                    "revenue_growth": revenue_metrics["change"]["percentage"],
                    "projected_revenue": revenue_metrics["projections"]["next_period"],
                    "key_insights": [
                        f"Revenue {'increased' if revenue_metrics['change']['percentage'] > 0 else 'decreased'} by {abs(revenue_metrics['change']['percentage']):.1f}%",
                        f"Tour packages represent {revenue_metrics['top_revenue_sources'][0]['percentage']}% of total revenue",
                        f"Projection confidence: {revenue_metrics['projections']['confidence']:.1f}%"
                    ]
                },
                "detailed_breakdown": revenue_metrics,
                "recommendations": [
                    "Focus on high-margin tour packages",
                    "Expand B2B partnerships for stable revenue",
                    "Optimize pricing during peak seasons"
                ],
                "export_formats": ["PDF", "Excel", "CSV"],
                "next_report_date": (datetime.now() + timedelta(days=30)).date().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Financial report error: {e}")
            return {"error": str(e), "status": "failed"}
    
    async def generate_operations_report(self) -> Dict[str, Any]:
        """Generar reporte operacional"""
        try:
            # Obtener métricas operacionales
            booking_metrics = await self.analytics_engine.calculate_booking_metrics(TimeRange.WEEKLY)
            ai_metrics = await self.analytics_engine.calculate_ai_agents_metrics()
            performance_metrics = await self.analytics_engine.calculate_performance_metrics()
            
            return {
                "report_type": "operational",
                "report_id": f"ops_report_{uuid.uuid4().hex[:8]}",
                "generated_at": datetime.now().isoformat(),
                "operations_summary": {
                    "total_bookings": booking_metrics["total_bookings"],
                    "booking_success_rate": f"{(booking_metrics['booking_breakdown']['confirmed'] / booking_metrics['total_bookings'] * 100):.1f}%",
                    "ai_agents_efficiency": f"{ai_metrics['system_efficiency']:.1f}%",
                    "system_uptime": f"{performance_metrics['system_health']['uptime_percentage']:.2f}%"
                },
                "key_metrics": {
                    "bookings": booking_metrics,
                    "ai_performance": ai_metrics,
                    "system_performance": performance_metrics
                },
                "operational_insights": [
                    f"Peak booking hours: {', '.join(map(str, booking_metrics['peak_booking_hours']))}:00",
                    f"AI agents saved {ai_metrics['automation_savings']['hours_saved']} hours this week",
                    f"System health score: {performance_metrics['system_health']['health_score']}/100"
                ],
                "improvement_areas": [
                    "Optimize resource allocation during peak hours",
                    "Reduce booking cancellation rate",
                    "Improve AI agent response times"
                ],
                "export_formats": ["PDF", "PowerPoint", "Dashboard"],
                "next_report_date": (datetime.now() + timedelta(days=7)).date().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Operations report error: {e}")
            return {"error": str(e), "status": "failed"}

# ============== ANALYTICS DASHBOARD MANAGER ==============

class AnalyticsDashboardManager:
    """Manager principal del sistema de analytics y dashboards"""
    
    def __init__(self):
        self.dashboard_service = RealTimeDashboardService()
        self.reporting_service = ReportingService()
        self.analytics_engine = AnalyticsEngine()
        logger.info("✅ Analytics Dashboard Manager initialized")
    
    async def get_dashboard(self, dashboard_type: str = "executive") -> Dict[str, Any]:
        """Obtener dashboard según tipo"""
        return await self.dashboard_service.get_dashboard_data(dashboard_type)
    
    async def get_metric(self, metric_type: MetricType, time_range: TimeRange = TimeRange.DAILY, **kwargs) -> Dict[str, Any]:
        """Obtener métrica específica"""
        if metric_type == MetricType.REVENUE:
            return await self.analytics_engine.calculate_revenue_metrics(time_range, kwargs.get("business_model", BusinessModel.ALL))
        elif metric_type == MetricType.BOOKINGS:
            return await self.analytics_engine.calculate_booking_metrics(time_range)
        elif metric_type == MetricType.CUSTOMERS:
            return await self.analytics_engine.calculate_customer_metrics()
        elif metric_type == MetricType.AGENTS:
            return await self.analytics_engine.calculate_ai_agents_metrics()
        elif metric_type == MetricType.PERFORMANCE:
            return await self.analytics_engine.calculate_performance_metrics()
        else:
            return {"error": f"Unknown metric type: {metric_type}", "status": "failed"}
    
    async def generate_report(self, report_type: str, period: str = "monthly") -> Dict[str, Any]:
        """Generar reporte"""
        if report_type == "financial":
            return await self.reporting_service.generate_financial_report(period)
        elif report_type == "operational":
            return await self.reporting_service.generate_operations_report()
        else:
            return {"error": f"Unknown report type: {report_type}", "status": "failed"}
    
    def get_available_dashboards(self) -> List[str]:
        """Obtener tipos de dashboard disponibles"""
        return ["executive", "operational", "technical", "default"]
    
    def get_available_metrics(self) -> List[str]:
        """Obtener métricas disponibles"""
        return [metric.value for metric in MetricType]
    
    def get_available_reports(self) -> List[str]:
        """Obtener tipos de reportes disponibles"""
        return ["financial", "operational"]

# Instancia global del manager
analytics_manager = AnalyticsDashboardManager()

# ============== API HELPER FUNCTIONS ==============

async def get_analytics_dashboard(dashboard_type: str = "executive") -> Dict[str, Any]:
    """Helper para obtener dashboard"""
    return await analytics_manager.get_dashboard(dashboard_type)

async def get_analytics_metric(metric_type: str, time_range: str = "daily", **kwargs) -> Dict[str, Any]:
    """Helper para obtener métrica"""
    try:
        metric_enum = MetricType(metric_type)
        time_enum = TimeRange(time_range)
        return await analytics_manager.get_metric(metric_enum, time_enum, **kwargs)
    except ValueError as e:
        return {"error": str(e), "status": "invalid_parameter"}

async def generate_analytics_report(report_type: str, period: str = "monthly") -> Dict[str, Any]:
    """Helper para generar reporte"""
    return await analytics_manager.generate_report(report_type, period)

def get_analytics_info() -> Dict[str, Any]:
    """Helper para obtener información del sistema de analytics"""
    return {
        "service": "Analytics Dashboard Service",
        "version": "1.0.0",
        "status": "active",
        "available_dashboards": analytics_manager.get_available_dashboards(),
        "available_metrics": analytics_manager.get_available_metrics(),
        "available_reports": analytics_manager.get_available_reports(),
        "update_interval_seconds": 5,
        "features": [
            "Real-time metrics",
            "Executive dashboards",
            "Operational dashboards",
            "Technical dashboards",
            "Financial reports",
            "AI agent analytics",
            "Customer analytics",
            "Performance monitoring"
        ]
    }

if __name__ == "__main__":
    # Test del sistema de analytics
    async def test_analytics():
        print("\n📊 Testing Analytics Dashboard System...\n")
        
        # Test dashboard ejecutivo
        executive_dashboard = await get_analytics_dashboard("executive")
        print(f"✅ Executive Dashboard: {len(executive_dashboard.get('kpi_summary', {}))} KPIs loaded")
        
        # Test métrica de ingresos
        revenue_metric = await get_analytics_metric("revenue", "monthly")
        print(f"✅ Revenue Metric: €{revenue_metric.get('current_period', {}).get('total_revenue', 0):,.2f}")
        
        # Test reporte financiero
        financial_report = await generate_analytics_report("financial", "monthly")
        print(f"✅ Financial Report: {financial_report.get('report_id', 'N/A')}")
        
        # Mostrar info del sistema
        print("\n📊 Analytics System Info:")
        print(json.dumps(get_analytics_info(), indent=2))
    
    # Run test
    asyncio.run(test_analytics())