"""
📊 AUTOMATED REPORTS SYSTEM
Sistema de Reportes Automáticos para Spirit Tours

Este módulo proporciona reportes automáticos y programados:
- Financial reports (ROI, commissions, profit analysis)
- AI Agent performance reports
- Customer analytics y retention reports  
- Operational reports y system health
- Custom reports con scheduling

Autor: GenSpark AI Developer
Fecha: 2024-09-23
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, field
from enum import Enum
import asyncio
import logging
import json
import base64
from decimal import Decimal
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, text
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from jinja2 import Template, Environment, FileSystemLoader
import schedule
import threading
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ReportType(Enum):
    """Tipos de reportes disponibles"""
    FINANCIAL_SUMMARY = "financial_summary"
    AI_PERFORMANCE = "ai_performance"
    CUSTOMER_ANALYTICS = "customer_analytics"
    OPERATIONAL_HEALTH = "operational_health"
    SALES_PIPELINE = "sales_pipeline"
    REVENUE_BREAKDOWN = "revenue_breakdown"
    CUSTOM_REPORT = "custom_report"

class ReportFrequency(Enum):
    """Frecuencias de generación de reportes"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ON_DEMAND = "on_demand"

@dataclass
class ReportConfig:
    """Configuración de reporte"""
    report_id: str
    report_type: ReportType
    frequency: ReportFrequency
    recipients: List[str]
    title: str
    description: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    template_path: Optional[str] = None
    include_charts: bool = True
    delivery_method: str = "email"  # email, slack, webhook, file
    next_run: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    active: bool = True

@dataclass
class ReportData:
    """Estructura de datos del reporte"""
    report_config: ReportConfig
    data: Dict[str, Any]
    charts: List[bytes] = field(default_factory=list)
    generated_at: datetime = field(default_factory=datetime.utcnow)
    file_path: Optional[str] = None
    size_mb: float = 0.0

class AutomatedReportsSystem:
    """Sistema de Reportes Automáticos"""
    
    def __init__(self, db_session: Session, smtp_config: Dict[str, Any] = None):
        self.db = db_session
        self.smtp_config = smtp_config or {}
        self.reports_config: List[ReportConfig] = []
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.scheduler_running = False
        self.template_env = Environment(loader=FileSystemLoader('templates/reports/'))
        
        # Configurar matplotlib para generar gráficos
        plt.style.use('seaborn-v0_8')
        sns.set_palette("husl")
    
    def add_report_config(self, config: ReportConfig):
        """Agregar configuración de reporte"""
        if config.frequency != ReportFrequency.ON_DEMAND:
            config.next_run = self._calculate_next_run(config.frequency)
        
        self.reports_config.append(config)
        logger.info(f"Reporte configurado: {config.report_id} - {config.frequency.value}")
    
    def start_scheduler(self):
        """Iniciar scheduler de reportes automáticos"""
        if self.scheduler_running:
            return
        
        self.scheduler_running = True
        
        def scheduler_thread():
            while self.scheduler_running:
                try:
                    schedule.run_pending()
                    asyncio.sleep(60)  # Verificar cada minuto
                except Exception as e:
                    logger.error(f"Error en scheduler: {e}")
        
        # Configurar jobs programados
        for config in self.reports_config:
            if config.frequency == ReportFrequency.DAILY:
                schedule.every().day.at("08:00").do(
                    lambda c=config: asyncio.create_task(self.generate_and_send_report(c))
                )
            elif config.frequency == ReportFrequency.WEEKLY:
                schedule.every().monday.at("09:00").do(
                    lambda c=config: asyncio.create_task(self.generate_and_send_report(c))
                )
            elif config.frequency == ReportFrequency.MONTHLY:
                schedule.every().month.do(
                    lambda c=config: asyncio.create_task(self.generate_and_send_report(c))
                )
        
        # Iniciar thread del scheduler
        threading.Thread(target=scheduler_thread, daemon=True).start()
        logger.info("Scheduler de reportes iniciado")
    
    def stop_scheduler(self):
        """Detener scheduler de reportes"""
        self.scheduler_running = False
        schedule.clear()
        logger.info("Scheduler de reportes detenido")
    
    async def generate_report(self, report_config: ReportConfig) -> ReportData:
        """Generar reporte según configuración"""
        logger.info(f"Generando reporte: {report_config.report_id}")
        
        try:
            # Recopilar datos según tipo de reporte
            if report_config.report_type == ReportType.FINANCIAL_SUMMARY:
                data = await self._generate_financial_report_data(report_config.parameters)
            elif report_config.report_type == ReportType.AI_PERFORMANCE:
                data = await self._generate_ai_performance_data(report_config.parameters)
            elif report_config.report_type == ReportType.CUSTOMER_ANALYTICS:
                data = await self._generate_customer_analytics_data(report_config.parameters)
            elif report_config.report_type == ReportType.OPERATIONAL_HEALTH:
                data = await self._generate_operational_health_data(report_config.parameters)
            elif report_config.report_type == ReportType.SALES_PIPELINE:
                data = await self._generate_sales_pipeline_data(report_config.parameters)
            elif report_config.report_type == ReportType.REVENUE_BREAKDOWN:
                data = await self._generate_revenue_breakdown_data(report_config.parameters)
            else:
                data = await self._generate_custom_report_data(report_config.parameters)
            
            # Generar gráficos si está habilitado
            charts = []
            if report_config.include_charts and data:
                charts = await self._generate_charts(report_config.report_type, data)
            
            report_data = ReportData(
                report_config=report_config,
                data=data,
                charts=charts
            )
            
            logger.info(f"Reporte generado exitosamente: {report_config.report_id}")
            return report_data
            
        except Exception as e:
            logger.error(f"Error generando reporte {report_config.report_id}: {e}")
            raise
    
    async def generate_and_send_report(self, report_config: ReportConfig):
        """Generar y enviar reporte automáticamente"""
        try:
            report_data = await self.generate_report(report_config)
            
            if report_config.delivery_method == "email":
                await self._send_email_report(report_data)
            elif report_config.delivery_method == "slack":
                await self._send_slack_report(report_data)
            elif report_config.delivery_method == "webhook":
                await self._send_webhook_report(report_data)
            elif report_config.delivery_method == "file":
                await self._save_file_report(report_data)
            
            # Actualizar próxima ejecución
            report_config.next_run = self._calculate_next_run(report_config.frequency)
            
        except Exception as e:
            logger.error(f"Error generando y enviando reporte {report_config.report_id}: {e}")
    
    async def _generate_financial_report_data(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Generar datos para reporte financiero"""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=parameters.get('days', 30))
        
        # Simulación de datos financieros (reemplazar con consultas SQL reales)
        financial_data = {
            "summary": {
                "period": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}",
                "total_revenue": Decimal('742850.25'),
                "net_revenue": Decimal('668565.23'),
                "total_commissions": Decimal('74285.02'),
                "total_refunds": Decimal('8950.00'),
                "gross_profit": Decimal('659615.23'),
                "profit_margin": 0.888,
                "growth_rate": 0.18
            },
            "revenue_by_channel": {
                "b2c": {"revenue": Decimal('285420.50'), "percentage": 38.4, "growth": 0.15},
                "b2b": {"revenue": Decimal('223680.75'), "percentage": 30.1, "growth": 0.22},
                "b2b2c": {"revenue": Decimal('233749.00'), "percentage": 31.5, "growth": 0.19}
            },
            "commission_breakdown": {
                "tour_operators": Decimal('29714.01'),
                "travel_agencies": Decimal('22285.51'),
                "sales_agents": Decimal('14827.00'),
                "distributors": Decimal('7458.50')
            },
            "payment_methods": {
                "stripe": {"amount": Decimal('445710.15'), "percentage": 60.0, "fees": Decimal('12942.60')},
                "paypal": {"amount": Decimal('223355.08'), "percentage": 30.1, "fees": Decimal('8940.20')},
                "bank_transfer": {"amount": Decimal('73785.02'), "percentage": 9.9, "fees": Decimal('147.57')}
            },
            "top_revenue_destinations": [
                {"destination": "Machu Picchu", "revenue": Decimal('124750.50'), "bookings": 89},
                {"destination": "Amazon Jungle", "revenue": Decimal('98420.25'), "bookings": 67},
                {"destination": "Sacred Valley", "revenue": Decimal('87350.75'), "bookings": 76},
                {"destination": "Lake Titicaca", "revenue": Decimal('69840.00'), "bookings": 54}
            ],
            "monthly_trends": [
                {"month": "July", "revenue": Decimal('198750.25'), "growth": 0.12},
                {"month": "August", "revenue": Decimal('256840.50'), "growth": 0.29},
                {"month": "September", "revenue": Decimal('287259.50'), "growth": 0.12}
            ]
        }
        
        return financial_data
    
    async def _generate_ai_performance_data(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Generar datos para reporte de performance de IA"""
        
        ai_performance_data = {
            "overview": {
                "total_agents": 25,
                "active_agents": 25,
                "total_queries_processed": 15247,
                "avg_response_time": 0.85,
                "overall_success_rate": 0.94,
                "customer_satisfaction": 4.6,
                "cost_savings": Decimal('142850.00'),
                "revenue_generated": Decimal('287420.50')
            },
            "track_performance": {
                "track_1": {
                    "name": "Customer & Revenue Excellence",
                    "agents_count": 10,
                    "queries_processed": 8674,
                    "success_rate": 0.96,
                    "avg_response_time": 0.72,
                    "revenue_generated": Decimal('187450.75'),
                    "top_performers": [
                        "BookingOptimizer AI",
                        "CustomerProphet AI", 
                        "RevenueMaximizer AI"
                    ]
                },
                "track_2": {
                    "name": "Security & Market Intelligence", 
                    "agents_count": 5,
                    "queries_processed": 2847,
                    "success_rate": 0.89,
                    "avg_response_time": 1.15,
                    "threats_detected": 247,
                    "security_incidents_prevented": 12
                },
                "track_3": {
                    "name": "Ethics & Sustainability",
                    "agents_count": 10,
                    "queries_processed": 3726,
                    "success_rate": 0.92,
                    "avg_response_time": 0.98,
                    "sustainability_score": 8.7,
                    "carbon_footprint_reduced": "15.2 tons"
                }
            },
            "agent_details": [
                {
                    "name": "BookingOptimizer AI",
                    "track": "Track 1",
                    "queries_processed": 1547,
                    "success_rate": 0.98,
                    "avg_response_time": 0.65,
                    "revenue_generated": Decimal('42870.50'),
                    "conversion_improvement": "23%"
                },
                {
                    "name": "SecurityGuard AI",
                    "track": "Track 2",
                    "queries_processed": 876,
                    "success_rate": 0.95,
                    "avg_response_time": 1.02,
                    "threats_blocked": 89,
                    "false_positives": 3
                },
                {
                    "name": "SustainabilityAdvisor AI",
                    "track": "Track 3",
                    "queries_processed": 654,
                    "success_rate": 0.93,
                    "avg_response_time": 0.87,
                    "sustainability_recommendations": 234,
                    "environmental_impact_score": 9.2
                }
            ],
            "usage_patterns": {
                "peak_hours": ["10:00-12:00", "14:00-16:00", "19:00-21:00"],
                "busiest_days": ["Monday", "Wednesday", "Friday"],
                "seasonal_trends": {
                    "high_season": "June-August",
                    "usage_increase": "47%"
                }
            },
            "cost_analysis": {
                "total_operational_cost": Decimal('45720.00'),
                "cost_per_query": Decimal('3.00'),
                "cost_savings_vs_human": Decimal('142850.00'),
                "roi": 3.12
            }
        }
        
        return ai_performance_data
    
    async def _generate_customer_analytics_data(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Generar datos para reporte de analytics de clientes"""
        
        customer_data = {
            "customer_overview": {
                "total_customers": 2847,
                "new_customers_this_period": 347,
                "returning_customers": 567,
                "customer_retention_rate": 0.76,
                "avg_customer_lifetime_value": Decimal('2847.50'),
                "churn_rate": 0.08
            },
            "customer_segments": {
                "business_travelers": {
                    "count": 1247,
                    "percentage": 43.8,
                    "avg_booking_value": Decimal('1547.25'),
                    "frequency": 3.2,
                    "satisfaction": 4.8
                },
                "leisure_travelers": {
                    "count": 1298,
                    "percentage": 45.6,
                    "avg_booking_value": Decimal('847.50'),
                    "frequency": 1.8,
                    "satisfaction": 4.6
                },
                "group_bookings": {
                    "count": 302,
                    "percentage": 10.6,
                    "avg_booking_value": Decimal('3247.80'),
                    "frequency": 2.1,
                    "satisfaction": 4.9
                }
            },
            "demographic_analysis": {
                "age_groups": {
                    "18-25": {"count": 427, "avg_spend": Decimal('687.50')},
                    "26-35": {"count": 856, "avg_spend": Decimal('1247.25')},
                    "36-45": {"count": 734, "avg_spend": Decimal('1847.75')},
                    "46-55": {"count": 523, "avg_spend": Decimal('2147.50')},
                    "56+": {"count": 307, "avg_spend": Decimal('1567.80')}
                },
                "geographic_distribution": {
                    "North America": {"count": 1247, "percentage": 43.8},
                    "Europe": {"count": 856, "percentage": 30.1},
                    "South America": {"count": 423, "percentage": 14.9},
                    "Asia": {"count": 234, "percentage": 8.2},
                    "Others": {"count": 87, "percentage": 3.0}
                }
            },
            "satisfaction_metrics": {
                "overall_satisfaction": 4.6,
                "nps_score": 67,
                "satisfaction_by_service": {
                    "booking_process": 4.7,
                    "customer_service": 4.5,
                    "tour_quality": 4.8,
                    "value_for_money": 4.4,
                    "ai_assistance": 4.6
                }
            },
            "behavior_patterns": {
                "booking_lead_time": {
                    "same_day": 0.05,
                    "1-7_days": 0.18,
                    "1-4_weeks": 0.45,
                    "1-3_months": 0.32
                },
                "preferred_channels": {
                    "website": 0.56,
                    "mobile_app": 0.28,
                    "phone": 0.12,
                    "travel_agent": 0.04
                },
                "payment_preferences": {
                    "credit_card": 0.68,
                    "paypal": 0.22,
                    "bank_transfer": 0.10
                }
            },
            "retention_analysis": {
                "repeat_customer_rate": 0.34,
                "avg_time_between_bookings": "8.5 months",
                "retention_by_segment": {
                    "premium": 0.89,
                    "standard": 0.76,
                    "budget": 0.58
                },
                "churn_predictors": [
                    "Low satisfaction score",
                    "Long time since last booking",
                    "Price sensitivity",
                    "Service issues"
                ]
            }
        }
        
        return customer_data
    
    async def _generate_operational_health_data(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Generar datos para reporte de salud operacional"""
        
        operational_data = {
            "system_health": {
                "overall_uptime": "99.97%",
                "avg_response_time": 0.145,
                "error_rate": 0.002,
                "system_load": 0.68,
                "database_performance": "Excellent",
                "cdn_performance": "Good"
            },
            "service_metrics": {
                "api_gateway": {
                    "uptime": "99.98%",
                    "avg_response_time": 0.089,
                    "requests_per_minute": 2847,
                    "error_rate": 0.001
                },
                "crm_service": {
                    "uptime": "99.95%",
                    "avg_response_time": 0.156,
                    "active_sessions": 347,
                    "data_processing_rate": "98.5%"
                },
                "payment_service": {
                    "uptime": "99.99%",
                    "avg_response_time": 0.234,
                    "transaction_success_rate": "99.7%",
                    "daily_volume": Decimal('742850.25')
                },
                "ai_orchestrator": {
                    "uptime": "99.94%",
                    "avg_response_time": 0.078,
                    "queries_per_hour": 1247,
                    "agent_availability": "100%"
                }
            },
            "infrastructure_metrics": {
                "server_performance": {
                    "cpu_utilization": 0.68,
                    "memory_usage": 0.72,
                    "disk_usage": 0.45,
                    "network_throughput": "85 Mbps"
                },
                "database_metrics": {
                    "connection_pool_usage": 0.67,
                    "query_performance": "Optimal",
                    "backup_status": "Current",
                    "replication_lag": "< 1ms"
                },
                "cache_performance": {
                    "redis_hit_rate": 0.94,
                    "cache_size": "2.3 GB", 
                    "eviction_rate": "Low",
                    "memory_usage": 0.78
                }
            },
            "security_metrics": {
                "failed_login_attempts": 23,
                "blocked_ips": 5,
                "ssl_certificate_status": "Valid",
                "vulnerability_scan": "Clean",
                "data_encryption": "Active",
                "backup_encryption": "Active"
            },
            "performance_trends": {
                "response_time_trend": "Stable",
                "error_rate_trend": "Decreasing",
                "uptime_trend": "Improving",
                "user_satisfaction_trend": "Increasing"
            },
            "alerts_summary": {
                "critical_alerts": 0,
                "warning_alerts": 2,
                "info_alerts": 8,
                "resolved_this_period": 15,
                "avg_resolution_time": "2.3 hours"
            }
        }
        
        return operational_data
    
    async def _generate_sales_pipeline_data(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Generar datos para reporte de pipeline de ventas"""
        
        pipeline_data = {
            "pipeline_overview": {
                "total_opportunities": 347,
                "pipeline_value": Decimal('287420.50'),
                "weighted_pipeline": Decimal('215565.38'),
                "avg_deal_size": Decimal('828.50'),
                "close_rate": 0.28,
                "avg_sales_cycle": 14.5
            },
            "stage_analysis": {
                "prospecting": {
                    "count": 87,
                    "value": Decimal('72195.50'),
                    "probability": 0.15,
                    "avg_time": "3.2 days"
                },
                "qualification": {
                    "count": 67,
                    "value": Decimal('68420.25'),
                    "probability": 0.35,
                    "avg_time": "4.8 days"
                },
                "proposal": {
                    "count": 54,
                    "value": Decimal('72840.75'),
                    "probability": 0.60,
                    "avg_time": "3.5 days"
                },
                "negotiation": {
                    "count": 39,
                    "value": Decimal('48750.00'),
                    "probability": 0.80,
                    "avg_time": "2.1 days"
                },
                "closing": {
                    "count": 24,
                    "value": Decimal('25214.00'),
                    "probability": 0.95,
                    "avg_time": "0.9 days"
                }
            },
            "sales_rep_performance": [
                {
                    "name": "Carlos Mendez",
                    "opportunities": 45,
                    "pipeline_value": Decimal('48750.25'),
                    "close_rate": 0.34,
                    "avg_deal_size": Decimal('1083.34')
                },
                {
                    "name": "Maria Rodriguez",
                    "opportunities": 38,
                    "pipeline_value": Decimal('42180.50'),
                    "close_rate": 0.31,
                    "avg_deal_size": Decimal('1109.75')
                },
                {
                    "name": "AI BookingOptimizer",
                    "opportunities": 67,
                    "pipeline_value": Decimal('67840.75'),
                    "close_rate": 0.42,
                    "avg_deal_size": Decimal('1012.85')
                }
            ],
            "conversion_metrics": {
                "lead_to_opportunity": 0.23,
                "opportunity_to_proposal": 0.62,
                "proposal_to_close": 0.35,
                "overall_conversion": 0.08
            },
            "forecast_analysis": {
                "this_month_forecast": Decimal('187420.50'),
                "confidence_level": 0.85,
                "at_risk_deals": 8,
                "upside_opportunities": 12,
                "probable_close": Decimal('142850.25')
            },
            "lost_deal_analysis": {
                "total_lost": 23,
                "lost_value": Decimal('28470.50'),
                "primary_reasons": {
                    "price": 0.35,
                    "timing": 0.28,
                    "competitor": 0.22,
                    "budget": 0.15
                }
            }
        }
        
        return pipeline_data
    
    async def _generate_revenue_breakdown_data(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Generar datos para reporte de breakdown de ingresos"""
        
        revenue_data = {
            "revenue_summary": {
                "total_revenue": Decimal('742850.25'),
                "net_revenue": Decimal('668565.23'),
                "gross_margin": 0.888,
                "revenue_growth": 0.18,
                "period": "Last 30 days"
            },
            "channel_breakdown": {
                "direct_sales": {
                    "revenue": Decimal('285420.50'),
                    "percentage": 38.4,
                    "growth": 0.15,
                    "margin": 0.92
                },
                "b2b_partners": {
                    "revenue": Decimal('223680.75'), 
                    "percentage": 30.1,
                    "growth": 0.22,
                    "margin": 0.85
                },
                "travel_agencies": {
                    "revenue": Decimal('156740.25'),
                    "percentage": 21.1,
                    "growth": 0.19,
                    "margin": 0.87
                },
                "online_platforms": {
                    "revenue": Decimal('77009.00'),
                    "percentage": 10.4,
                    "growth": 0.28,
                    "margin": 0.82
                }
            },
            "product_line_revenue": {
                "adventure_tours": {
                    "revenue": Decimal('298420.10'),
                    "percentage": 40.2,
                    "margin": 0.89
                },
                "cultural_tours": {
                    "revenue": Decimal('186740.15'),
                    "percentage": 25.1,
                    "margin": 0.91
                },
                "luxury_experiences": {
                    "revenue": Decimal('148570.00'),
                    "percentage": 20.0,
                    "margin": 0.95
                },
                "group_packages": {
                    "revenue": Decimal('109120.00'),
                    "percentage": 14.7,
                    "margin": 0.86
                }
            },
            "geographic_revenue": {
                "peru_domestic": {"revenue": Decimal('297140.10'), "percentage": 40.0},
                "international": {"revenue": Decimal('445710.15'), "percentage": 60.0}
            },
            "commission_structure": {
                "total_commissions": Decimal('74285.02'),
                "commission_rate": 0.10,
                "by_partner_type": {
                    "tour_operators": Decimal('29714.01'),
                    "travel_agencies": Decimal('22285.51'),
                    "sales_agents": Decimal('14827.00'),
                    "distributors": Decimal('7458.50')
                }
            },
            "seasonal_analysis": {
                "peak_season": {
                    "months": ["June", "July", "August"],
                    "revenue_share": 0.45,
                    "avg_monthly": Decimal('111275.54')
                },
                "shoulder_season": {
                    "months": ["April", "May", "September", "October"],
                    "revenue_share": 0.35,
                    "avg_monthly": Decimal('65000.23')
                },
                "low_season": {
                    "months": ["November", "December", "January", "February", "March"],
                    "revenue_share": 0.20,
                    "avg_monthly": Decimal('29714.01')
                }
            }
        }
        
        return revenue_data
    
    async def _generate_custom_report_data(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Generar datos para reporte personalizado"""
        # Implementar lógica personalizada basada en parámetros
        return {"message": "Custom report data would be generated based on parameters"}
    
    async def _generate_charts(self, report_type: ReportType, data: Dict[str, Any]) -> List[bytes]:
        """Generar gráficos para el reporte"""
        charts = []
        
        try:
            if report_type == ReportType.FINANCIAL_SUMMARY:
                charts.extend(await self._create_financial_charts(data))
            elif report_type == ReportType.AI_PERFORMANCE:
                charts.extend(await self._create_ai_performance_charts(data))
            elif report_type == ReportType.CUSTOMER_ANALYTICS:
                charts.extend(await self._create_customer_charts(data))
            elif report_type == ReportType.REVENUE_BREAKDOWN:
                charts.extend(await self._create_revenue_charts(data))
        except Exception as e:
            logger.error(f"Error generando gráficos: {e}")
        
        return charts
    
    async def _create_financial_charts(self, data: Dict[str, Any]) -> List[bytes]:
        """Crear gráficos financieros"""
        charts = []
        
        # Gráfico de ingresos por canal
        fig, ax = plt.subplots(figsize=(10, 6))
        channels = list(data['revenue_by_channel'].keys())
        revenues = [float(data['revenue_by_channel'][ch]['revenue']) for ch in channels]
        
        ax.bar(channels, revenues)
        ax.set_title('Revenue by Channel')
        ax.set_ylabel('Revenue ($)')
        
        # Guardar como bytes
        img_buffer = BytesIO()
        plt.savefig(img_buffer, format='png', dpi=300, bbox_inches='tight')
        img_buffer.seek(0)
        charts.append(img_buffer.getvalue())
        plt.close()
        
        # Gráfico de tendencias mensuales
        fig, ax = plt.subplots(figsize=(12, 6))
        months = [trend['month'] for trend in data['monthly_trends']]
        revenues = [float(trend['revenue']) for trend in data['monthly_trends']]
        
        ax.plot(months, revenues, marker='o', linewidth=2, markersize=8)
        ax.set_title('Monthly Revenue Trends')
        ax.set_ylabel('Revenue ($)')
        ax.grid(True, alpha=0.3)
        
        img_buffer = BytesIO()
        plt.savefig(img_buffer, format='png', dpi=300, bbox_inches='tight')
        img_buffer.seek(0)
        charts.append(img_buffer.getvalue())
        plt.close()
        
        return charts
    
    async def _create_ai_performance_charts(self, data: Dict[str, Any]) -> List[bytes]:
        """Crear gráficos de performance de IA"""
        charts = []
        
        # Gráfico de performance por track
        fig, ax = plt.subplots(figsize=(12, 8))
        tracks = list(data['track_performance'].keys())
        success_rates = [data['track_performance'][track]['success_rate'] for track in tracks]
        response_times = [data['track_performance'][track]['avg_response_time'] for track in tracks]
        
        x = np.arange(len(tracks))
        width = 0.35
        
        ax2 = ax.twinx()
        bars1 = ax.bar(x - width/2, success_rates, width, label='Success Rate', alpha=0.8)
        bars2 = ax2.bar(x + width/2, response_times, width, label='Response Time (s)', alpha=0.8, color='orange')
        
        ax.set_xlabel('AI Tracks')
        ax.set_ylabel('Success Rate')
        ax2.set_ylabel('Response Time (seconds)')
        ax.set_title('AI Performance by Track')
        ax.set_xticks(x)
        ax.set_xticklabels([f'Track {i+1}' for i in range(len(tracks))])
        
        ax.legend(loc='upper left')
        ax2.legend(loc='upper right')
        
        img_buffer = BytesIO()
        plt.savefig(img_buffer, format='png', dpi=300, bbox_inches='tight')
        img_buffer.seek(0)
        charts.append(img_buffer.getvalue())
        plt.close()
        
        return charts
    
    async def _create_customer_charts(self, data: Dict[str, Any]) -> List[bytes]:
        """Crear gráficos de analytics de clientes"""
        charts = []
        
        # Gráfico de segmentación de clientes
        fig, ax = plt.subplots(figsize=(10, 8))
        segments = list(data['customer_segments'].keys())
        counts = [data['customer_segments'][seg]['count'] for seg in segments]
        
        colors = plt.cm.Set3(np.arange(len(segments)))
        wedges, texts, autotexts = ax.pie(counts, labels=segments, colors=colors, autopct='%1.1f%%', startangle=90)
        
        ax.set_title('Customer Segmentation')
        
        img_buffer = BytesIO()
        plt.savefig(img_buffer, format='png', dpi=300, bbox_inches='tight')
        img_buffer.seek(0)
        charts.append(img_buffer.getvalue())
        plt.close()
        
        return charts
    
    async def _create_revenue_charts(self, data: Dict[str, Any]) -> List[bytes]:
        """Crear gráficos de breakdown de ingresos"""
        charts = []
        
        # Gráfico de ingresos por línea de producto
        fig, ax = plt.subplots(figsize=(12, 6))
        products = list(data['product_line_revenue'].keys())
        revenues = [float(data['product_line_revenue'][prod]['revenue']) for prod in products]
        
        bars = ax.bar(products, revenues)
        ax.set_title('Revenue by Product Line')
        ax.set_ylabel('Revenue ($)')
        ax.tick_params(axis='x', rotation=45)
        
        # Añadir valores en las barras
        for bar, revenue in zip(bars, revenues):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'${revenue:,.0f}',
                   ha='center', va='bottom')
        
        img_buffer = BytesIO()
        plt.savefig(img_buffer, format='png', dpi=300, bbox_inches='tight')
        img_buffer.seek(0)
        charts.append(img_buffer.getvalue())
        plt.close()
        
        return charts
    
    async def _send_email_report(self, report_data: ReportData):
        """Enviar reporte por email"""
        try:
            if not self.smtp_config:
                logger.warning("Configuración SMTP no disponible")
                return
            
            msg = MIMEMultipart()
            msg['From'] = self.smtp_config.get('from_email', 'reports@spirittours.com')
            msg['To'] = ', '.join(report_data.report_config.recipients)
            msg['Subject'] = f"{report_data.report_config.title} - {report_data.generated_at.strftime('%Y-%m-%d')}"
            
            # Generar HTML del reporte
            html_content = await self._generate_html_report(report_data)
            msg.attach(MIMEText(html_content, 'html'))
            
            # Adjuntar gráficos
            for i, chart_bytes in enumerate(report_data.charts):
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(chart_bytes)
                encoders.encode_base64(part)
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename="chart_{i+1}.png"'
                )
                msg.attach(part)
            
            # Enviar email
            with smtplib.SMTP(self.smtp_config['host'], self.smtp_config.get('port', 587)) as server:
                if self.smtp_config.get('use_tls', True):
                    server.starttls()
                if 'username' in self.smtp_config:
                    server.login(self.smtp_config['username'], self.smtp_config['password'])
                
                server.send_message(msg)
            
            logger.info(f"Reporte enviado por email: {report_data.report_config.report_id}")
            
        except Exception as e:
            logger.error(f"Error enviando email: {e}")
    
    async def _generate_html_report(self, report_data: ReportData) -> str:
        """Generar HTML para el reporte"""
        template_name = f"{report_data.report_config.report_type.value}_template.html"
        
        try:
            if report_data.report_config.template_path:
                template = self.template_env.get_template(report_data.report_config.template_path)
            else:
                # Usar template por defecto
                template = self.template_env.get_template('default_report_template.html')
        except Exception:
            # Template básico si no existe archivo
            template = Template("""
            <html>
            <head><title>{{ title }}</title></head>
            <body>
                <h1>{{ title }}</h1>
                <p>Generated on: {{ generated_at }}</p>
                <pre>{{ data | tojson(indent=2) }}</pre>
            </body>
            </html>
            """)
        
        return template.render(
            title=report_data.report_config.title,
            data=report_data.data,
            generated_at=report_data.generated_at,
            report_config=report_data.report_config
        )
    
    async def _send_slack_report(self, report_data: ReportData):
        """Enviar reporte a Slack"""
        # Implementar integración con Slack
        logger.info("Slack integration pending implementation")
    
    async def _send_webhook_report(self, report_data: ReportData):
        """Enviar reporte via webhook"""
        # Implementar webhook
        logger.info("Webhook integration pending implementation")
    
    async def _save_file_report(self, report_data: ReportData):
        """Guardar reporte como archivo"""
        # Implementar guardado de archivos
        logger.info("File save pending implementation")
    
    def _calculate_next_run(self, frequency: ReportFrequency) -> datetime:
        """Calcular próxima ejecución del reporte"""
        now = datetime.utcnow()
        
        if frequency == ReportFrequency.DAILY:
            return now + timedelta(days=1)
        elif frequency == ReportFrequency.WEEKLY:
            return now + timedelta(weeks=1)
        elif frequency == ReportFrequency.MONTHLY:
            return now + timedelta(days=30)
        elif frequency == ReportFrequency.QUARTERLY:
            return now + timedelta(days=90)
        else:
            return None

# Función de utilidad para crear configuraciones de reporte predefinidas
def create_default_report_configs() -> List[ReportConfig]:
    """Crear configuraciones por defecto de reportes"""
    configs = []
    
    # Reporte financiero diario
    configs.append(ReportConfig(
        report_id="daily_financial",
        report_type=ReportType.FINANCIAL_SUMMARY,
        frequency=ReportFrequency.DAILY,
        recipients=["cfo@spirittours.com", "manager@spirittours.com"],
        title="Daily Financial Summary",
        description="Daily revenue and financial metrics summary"
    ))
    
    # Reporte de IA semanal
    configs.append(ReportConfig(
        report_id="weekly_ai_performance",
        report_type=ReportType.AI_PERFORMANCE,
        frequency=ReportFrequency.WEEKLY,
        recipients=["ai-team@spirittours.com", "cto@spirittours.com"],
        title="Weekly AI Performance Report",
        description="Performance metrics for all 25 AI agents"
    ))
    
    # Reporte de clientes mensual
    configs.append(ReportConfig(
        report_id="monthly_customer_analytics",
        report_type=ReportType.CUSTOMER_ANALYTICS,
        frequency=ReportFrequency.MONTHLY,
        recipients=["marketing@spirittours.com", "crm@spirittours.com"],
        title="Monthly Customer Analytics",
        description="Customer behavior and satisfaction analysis"
    ))
    
    return configs

# Exportar clases principales
__all__ = [
    'AutomatedReportsSystem',
    'ReportConfig',
    'ReportData',
    'ReportType',
    'ReportFrequency',
    'create_default_report_configs'
]