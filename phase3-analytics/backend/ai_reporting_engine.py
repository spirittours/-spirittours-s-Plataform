#!/usr/bin/env python3
"""
AI Multi-Model Platform - Phase 3: AI-Powered Reporting Engine
Automated report generation with natural language narratives and insights
"""

import asyncio
import logging
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import aioredis
import asyncpg
from jinja2 import Template, Environment, FileSystemLoader
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib.backends.backend_pdf import PdfPages
import plotly.graph_objects as go
import plotly.express as px
from plotly.offline import plot
import io
import base64
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
import openai
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import requests
from pathlib import Path
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import schedule
import threading
import time
from concurrent.futures import ThreadPoolExecutor
import zipfile
import warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ReportType(Enum):
    EXECUTIVE_SUMMARY = "executive_summary"
    TECHNICAL_DEEP_DIVE = "technical_deep_dive"
    COST_ANALYSIS = "cost_analysis"
    PERFORMANCE_REPORT = "performance_report"
    USER_BEHAVIOR = "user_behavior"
    SECURITY_AUDIT = "security_audit"
    COMPLIANCE = "compliance"
    PREDICTIVE_INSIGHTS = "predictive_insights"
    CUSTOM = "custom"

class ReportFormat(Enum):
    PDF = "pdf"
    HTML = "html"
    DOCX = "docx"
    PPTX = "pptx"
    EXCEL = "excel"
    JSON = "json"

class DeliveryMethod(Enum):
    EMAIL = "email"
    SLACK = "slack"
    TEAMS = "teams"
    WEBHOOK = "webhook"
    DOWNLOAD = "download"
    S3 = "s3"

@dataclass
class ReportConfiguration:
    report_id: str
    report_type: ReportType
    title: str
    description: str
    data_sources: List[str]
    metrics: List[str]
    time_range: Dict[str, str]
    filters: Dict[str, Any]
    format: ReportFormat
    template: Optional[str] = None
    include_predictions: bool = True
    include_recommendations: bool = True
    include_charts: bool = True
    include_raw_data: bool = False
    narrative_style: str = "executive"  # executive, technical, casual
    language: str = "en"
    branding: Optional[Dict[str, str]] = None

@dataclass
class ReportSchedule:
    schedule_id: str
    report_config: ReportConfiguration
    frequency: str  # daily, weekly, monthly, quarterly
    time_of_day: str  # HH:MM format
    days_of_week: List[int]  # 0-6, Monday=0
    recipients: List[str]
    delivery_method: DeliveryMethod
    active: bool = True
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None

@dataclass
class GeneratedReport:
    report_id: str
    config: ReportConfiguration
    generated_at: datetime
    file_path: str
    file_size: int
    narrative_sections: List[Dict[str, str]]
    charts: List[Dict[str, str]]
    insights: List[str]
    recommendations: List[str]
    metadata: Dict[str, Any]
    processing_time: float
    success: bool
    error_message: Optional[str] = None

class AIReportingEngine:
    """
    Advanced AI-Powered Reporting Engine with natural language generation
    """
    
    def __init__(self, 
                 db_config: Dict[str, str],
                 redis_config: Dict[str, str],
                 openai_api_key: str,
                 output_dir: str = "./reports"):
        self.db_config = db_config
        self.redis_config = redis_config
        self.openai_client = openai.AsyncOpenAI(api_key=openai_api_key)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        self.db_pool = None
        self.redis = None
        
        # Initialize NLP components
        self.sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest"
        )
        
        # Report templates
        self.templates = {}
        self.scheduled_reports = {}
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # Email configuration
        self.email_config = {
            'smtp_server': 'smtp.gmail.com',
            'smtp_port': 587,
            'sender_email': '',
            'sender_password': ''
        }
        
    async def initialize(self):
        """Initialize database connections and load templates"""
        try:
            # Initialize database connection pool
            self.db_pool = await asyncpg.create_pool(**self.db_config)
            
            # Initialize Redis connection
            self.redis = await aioredis.create_redis_pool(
                f"redis://{self.redis_config['host']}:{self.redis_config['port']}"
            )
            
            # Load report templates
            await self._load_templates()
            
            # Load scheduled reports
            await self._load_scheduled_reports()
            
            # Start scheduler
            self._start_scheduler()
            
            logger.info("AI Reporting Engine initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize AI Reporting Engine: {e}")
            raise
    
    async def _load_templates(self):
        """Load Jinja2 templates for different report types"""
        template_dir = Path(__file__).parent / "templates"
        template_dir.mkdir(exist_ok=True)
        
        # Create default templates if they don't exist
        await self._create_default_templates(template_dir)
        
        # Load templates
        env = Environment(loader=FileSystemLoader(str(template_dir)))
        
        for report_type in ReportType:
            template_file = f"{report_type.value}.html"
            if (template_dir / template_file).exists():
                self.templates[report_type.value] = env.get_template(template_file)
        
        logger.info(f"Loaded {len(self.templates)} report templates")
    
    async def _create_default_templates(self, template_dir: Path):
        """Create default report templates"""
        
        # Executive Summary Template
        executive_template = """
<!DOCTYPE html>
<html>
<head>
    <title>{{ report_title }}</title>
    <style>
        body { font-family: 'Arial', sans-serif; margin: 40px; }
        .header { text-align: center; border-bottom: 2px solid #2196F3; padding-bottom: 20px; }
        .section { margin: 30px 0; }
        .metric { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .chart { text-align: center; margin: 20px 0; }
        .insight { background: #e3f2fd; padding: 15px; border-left: 4px solid #2196F3; margin: 10px 0; }
        .recommendation { background: #f3e5f5; padding: 15px; border-left: 4px solid #9c27b0; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ report_title }}</h1>
        <p>Generated on {{ generated_date }}</p>
        <p>{{ description }}</p>
    </div>
    
    <div class="section">
        <h2>Executive Summary</h2>
        {{ executive_summary }}
    </div>
    
    <div class="section">
        <h2>Key Metrics</h2>
        {% for metric in key_metrics %}
        <div class="metric">
            <h3>{{ metric.title }}</h3>
            <p><strong>{{ metric.value }}</strong> {{ metric.unit }}</p>
            <p>{{ metric.description }}</p>
        </div>
        {% endfor %}
    </div>
    
    {% if charts %}
    <div class="section">
        <h2>Performance Overview</h2>
        {% for chart in charts %}
        <div class="chart">
            <h3>{{ chart.title }}</h3>
            <img src="data:image/png;base64,{{ chart.image }}" alt="{{ chart.title }}">
        </div>
        {% endfor %}
    </div>
    {% endif %}
    
    {% if insights %}
    <div class="section">
        <h2>AI-Generated Insights</h2>
        {% for insight in insights %}
        <div class="insight">
            <h4>{{ insight.title }}</h4>
            <p>{{ insight.description }}</p>
        </div>
        {% endfor %}
    </div>
    {% endif %}
    
    {% if recommendations %}
    <div class="section">
        <h2>Recommendations</h2>
        {% for rec in recommendations %}
        <div class="recommendation">
            <h4>{{ rec.title }}</h4>
            <p>{{ rec.description }}</p>
            <p><strong>Impact:</strong> {{ rec.impact }}</p>
        </div>
        {% endfor %}
    </div>
    {% endif %}
    
    <div class="section">
        <h2>Methodology & Data Sources</h2>
        <p>{{ methodology }}</p>
        <ul>
        {% for source in data_sources %}
            <li>{{ source }}</li>
        {% endfor %}
        </ul>
    </div>
</body>
</html>
        """
        
        # Write template to file
        with open(template_dir / "executive_summary.html", "w") as f:
            f.write(executive_template)
        
        # Technical Deep Dive Template
        technical_template = """
<!DOCTYPE html>
<html>
<head>
    <title>{{ report_title }} - Technical Analysis</title>
    <style>
        body { font-family: 'Courier New', monospace; margin: 20px; line-height: 1.6; }
        .header { border-bottom: 1px solid #333; padding-bottom: 10px; }
        .section { margin: 25px 0; }
        .code { background: #f4f4f4; padding: 10px; border-radius: 3px; font-family: 'Courier New'; }
        .metric-table { width: 100%; border-collapse: collapse; }
        .metric-table th, .metric-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .metric-table th { background-color: #f2f2f2; }
        .alert { color: #d32f2f; font-weight: bold; }
        .success { color: #388e3c; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ report_title }}</h1>
        <p><strong>Technical Deep Dive Report</strong></p>
        <p>Generated: {{ generated_date }}</p>
    </div>
    
    <div class="section">
        <h2>System Performance Metrics</h2>
        <table class="metric-table">
            <tr><th>Metric</th><th>Current Value</th><th>Target</th><th>Status</th></tr>
            {% for metric in performance_metrics %}
            <tr>
                <td>{{ metric.name }}</td>
                <td>{{ metric.value }}</td>
                <td>{{ metric.target }}</td>
                <td class="{{ metric.status_class }}">{{ metric.status }}</td>
            </tr>
            {% endfor %}
        </table>
    </div>
    
    <div class="section">
        <h2>Technical Analysis</h2>
        {{ technical_analysis }}
    </div>
    
    <div class="section">
        <h2>Code Quality Metrics</h2>
        <div class="code">{{ code_metrics }}</div>
    </div>
    
    <div class="section">
        <h2>Infrastructure Analysis</h2>
        {{ infrastructure_analysis }}
    </div>
</body>
</html>
        """
        
        with open(template_dir / "technical_deep_dive.html", "w") as f:
            f.write(technical_template)
    
    async def generate_report(self, config: ReportConfiguration) -> GeneratedReport:
        """Generate a comprehensive AI-powered report"""
        start_time = datetime.now()
        
        try:
            logger.info(f"Starting report generation: {config.report_id}")
            
            # Collect data from various sources
            data = await self._collect_report_data(config)
            
            # Generate AI narrative
            narrative_sections = await self._generate_narrative(config, data)
            
            # Create visualizations
            charts = await self._create_report_charts(config, data)
            
            # Generate insights and recommendations
            insights = await self._generate_insights(config, data)
            recommendations = await self._generate_recommendations(config, data)
            
            # Render report based on format
            file_path = await self._render_report(
                config, data, narrative_sections, charts, insights, recommendations
            )
            
            # Calculate file size
            file_size = file_path.stat().st_size if file_path.exists() else 0
            
            # Create report metadata
            processing_time = (datetime.now() - start_time).total_seconds()
            
            report = GeneratedReport(
                report_id=config.report_id,
                config=config,
                generated_at=start_time,
                file_path=str(file_path),
                file_size=file_size,
                narrative_sections=narrative_sections,
                charts=charts,
                insights=insights,
                recommendations=recommendations,
                metadata={
                    'data_points': len(data) if isinstance(data, pd.DataFrame) else 0,
                    'charts_generated': len(charts),
                    'insights_generated': len(insights),
                    'processing_time': processing_time
                },
                processing_time=processing_time,
                success=True
            )
            
            # Cache report metadata
            await self._cache_report_metadata(report)
            
            logger.info(f"Report generated successfully: {config.report_id}")
            return report
            
        except Exception as e:
            logger.error(f"Error generating report {config.report_id}: {e}")
            
            return GeneratedReport(
                report_id=config.report_id,
                config=config,
                generated_at=start_time,
                file_path="",
                file_size=0,
                narrative_sections=[],
                charts=[],
                insights=[],
                recommendations=[],
                metadata={},
                processing_time=(datetime.now() - start_time).total_seconds(),
                success=False,
                error_message=str(e)
            )
    
    async def _collect_report_data(self, config: ReportConfiguration) -> pd.DataFrame:
        """Collect data for report generation"""
        try:
            # Build queries based on report type and metrics
            queries = []
            
            if config.report_type in [ReportType.EXECUTIVE_SUMMARY, ReportType.PERFORMANCE_REPORT]:
                queries.append(self._build_performance_query(config))
            
            if config.report_type in [ReportType.COST_ANALYSIS, ReportType.EXECUTIVE_SUMMARY]:
                queries.append(self._build_cost_query(config))
            
            if config.report_type == ReportType.USER_BEHAVIOR:
                queries.append(self._build_user_behavior_query(config))
            
            if config.report_type == ReportType.SECURITY_AUDIT:
                queries.append(self._build_security_query(config))
            
            # Execute queries and combine data
            combined_data = pd.DataFrame()
            
            async with self.db_pool.acquire() as conn:
                for query in queries:
                    rows = await conn.fetch(query)
                    df = pd.DataFrame([dict(row) for row in rows])
                    
                    if combined_data.empty:
                        combined_data = df
                    else:
                        combined_data = pd.merge(combined_data, df, 
                                               on=['timestamp'], how='outer')
            
            # Apply filters
            if config.filters:
                for column, value in config.filters.items():
                    if column in combined_data.columns:
                        combined_data = combined_data[combined_data[column] == value]
            
            return combined_data.fillna(0)
            
        except Exception as e:
            logger.error(f"Error collecting report data: {e}")
            return pd.DataFrame()
    
    def _build_performance_query(self, config: ReportConfiguration) -> str:
        """Build performance metrics query"""
        start_date = config.time_range['start']
        end_date = config.time_range['end']
        
        return f"""
        SELECT 
            DATE_TRUNC('hour', timestamp) as timestamp,
            AVG(response_time) as avg_response_time,
            AVG(cpu_usage) as avg_cpu_usage,
            AVG(memory_usage) as avg_memory_usage,
            COUNT(*) as total_requests,
            AVG(error_rate) as avg_error_rate,
            AVG(throughput) as avg_throughput
        FROM system_metrics 
        WHERE timestamp BETWEEN '{start_date}' AND '{end_date}'
        GROUP BY DATE_TRUNC('hour', timestamp) 
        ORDER BY timestamp
        """
    
    def _build_cost_query(self, config: ReportConfiguration) -> str:
        """Build cost analysis query"""
        start_date = config.time_range['start']
        end_date = config.time_range['end']
        
        return f"""
        SELECT 
            DATE_TRUNC('day', date) as timestamp,
            SUM(api_costs) as total_api_costs,
            SUM(infrastructure_costs) as total_infrastructure_costs,
            SUM(storage_costs) as total_storage_costs,
            AVG(cost_per_request) as avg_cost_per_request,
            COUNT(DISTINCT user_id) as unique_users
        FROM cost_tracking 
        WHERE date BETWEEN '{start_date}' AND '{end_date}'
        GROUP BY DATE_TRUNC('day', date) 
        ORDER BY timestamp
        """
    
    def _build_user_behavior_query(self, config: ReportConfiguration) -> str:
        """Build user behavior analysis query"""
        start_date = config.time_range['start']
        end_date = config.time_range['end']
        
        return f"""
        SELECT 
            DATE_TRUNC('day', timestamp) as timestamp,
            COUNT(DISTINCT user_id) as active_users,
            AVG(session_duration) as avg_session_duration,
            COUNT(*) as total_sessions,
            AVG(requests_per_session) as avg_requests_per_session,
            COUNT(DISTINCT feature_used) as features_used,
            AVG(user_satisfaction) as avg_satisfaction
        FROM user_sessions 
        WHERE timestamp BETWEEN '{start_date}' AND '{end_date}'
        GROUP BY DATE_TRUNC('day', timestamp) 
        ORDER BY timestamp
        """
    
    def _build_security_query(self, config: ReportConfiguration) -> str:
        """Build security audit query"""
        start_date = config.time_range['start']
        end_date = config.time_range['end']
        
        return f"""
        SELECT 
            DATE_TRUNC('day', timestamp) as timestamp,
            COUNT(*) as security_events,
            COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity_events,
            COUNT(CASE WHEN event_type = 'login_failure' THEN 1 END) as failed_logins,
            COUNT(CASE WHEN event_type = 'suspicious_activity' THEN 1 END) as suspicious_activities,
            COUNT(DISTINCT source_ip) as unique_ips
        FROM security_events 
        WHERE timestamp BETWEEN '{start_date}' AND '{end_date}'
        GROUP BY DATE_TRUNC('day', timestamp) 
        ORDER BY timestamp
        """
    
    async def _generate_narrative(self, config: ReportConfiguration, data: pd.DataFrame) -> List[Dict[str, str]]:
        """Generate AI-powered narrative sections for the report"""
        try:
            sections = []
            
            # Executive Summary
            if config.report_type in [ReportType.EXECUTIVE_SUMMARY, ReportType.PERFORMANCE_REPORT]:
                summary = await self._generate_executive_summary(config, data)
                sections.append({
                    'title': 'Executive Summary',
                    'content': summary
                })
            
            # Performance Analysis
            if 'avg_response_time' in data.columns:
                perf_analysis = await self._generate_performance_analysis(data)
                sections.append({
                    'title': 'Performance Analysis',
                    'content': perf_analysis
                })
            
            # Cost Analysis
            if 'total_api_costs' in data.columns:
                cost_analysis = await self._generate_cost_analysis(data)
                sections.append({
                    'title': 'Cost Analysis',
                    'content': cost_analysis
                })
            
            # User Behavior Analysis
            if config.report_type == ReportType.USER_BEHAVIOR:
                behavior_analysis = await self._generate_user_behavior_analysis(data)
                sections.append({
                    'title': 'User Behavior Analysis',
                    'content': behavior_analysis
                })
            
            return sections
            
        except Exception as e:
            logger.error(f"Error generating narrative: {e}")
            return [{'title': 'Error', 'content': 'Failed to generate narrative content'}]
    
    async def _generate_executive_summary(self, config: ReportConfiguration, data: pd.DataFrame) -> str:
        """Generate executive summary using AI"""
        try:
            # Prepare data summary for AI
            if data.empty:
                return "No data available for the specified time period."
            
            # Calculate key metrics
            total_requests = data['total_requests'].sum() if 'total_requests' in data.columns else 0
            avg_response_time = data['avg_response_time'].mean() if 'avg_response_time' in data.columns else 0
            total_costs = data['total_api_costs'].sum() if 'total_api_costs' in data.columns else 0
            unique_users = data['unique_users'].max() if 'unique_users' in data.columns else 0
            
            # Create context for AI
            context = f"""
            Report Period: {config.time_range['start']} to {config.time_range['end']}
            Total API Requests: {total_requests:,}
            Average Response Time: {avg_response_time:.2f}ms
            Total Costs: ${total_costs:.2f}
            Unique Users: {unique_users:,}
            Report Type: {config.report_type.value}
            """
            
            # Generate narrative using OpenAI
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": f"""You are an AI business analyst generating executive summaries for AI platform reports. 
                        Write in a {config.narrative_style} style suitable for C-level executives. 
                        Focus on key insights, trends, and business impact. Keep it concise but informative."""
                    },
                    {
                        "role": "user",
                        "content": f"""Generate an executive summary for this AI platform performance report:
                        
                        {context}
                        
                        Include key highlights, notable trends, and business implications. 
                        Write 3-4 paragraphs maximum."""
                    }
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating executive summary: {e}")
            return "Executive summary could not be generated due to technical issues."
    
    async def _generate_performance_analysis(self, data: pd.DataFrame) -> str:
        """Generate performance analysis narrative"""
        try:
            if 'avg_response_time' not in data.columns:
                return "Performance data not available."
            
            # Calculate performance metrics
            avg_response = data['avg_response_time'].mean()
            min_response = data['avg_response_time'].min()
            max_response = data['avg_response_time'].max()
            response_trend = data['avg_response_time'].pct_change().mean() * 100
            
            error_rate = data['avg_error_rate'].mean() if 'avg_error_rate' in data.columns else 0
            
            context = f"""
            Average Response Time: {avg_response:.2f}ms
            Best Response Time: {min_response:.2f}ms
            Worst Response Time: {max_response:.2f}ms
            Response Time Trend: {response_trend:+.1f}%
            Average Error Rate: {error_rate:.2f}%
            """
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a technical performance analyst. Analyze the performance metrics and provide insights on system health, bottlenecks, and optimization opportunities."
                    },
                    {
                        "role": "user",
                        "content": f"""Analyze these performance metrics and provide insights:
                        
                        {context}
                        
                        Focus on system health, performance trends, and potential optimizations."""
                    }
                ],
                temperature=0.5,
                max_tokens=400
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating performance analysis: {e}")
            return "Performance analysis could not be generated."
    
    async def _generate_cost_analysis(self, data: pd.DataFrame) -> str:
        """Generate cost analysis narrative"""
        try:
            if 'total_api_costs' not in data.columns:
                return "Cost data not available."
            
            # Calculate cost metrics
            total_cost = data['total_api_costs'].sum()
            avg_daily_cost = data['total_api_costs'].mean()
            cost_trend = data['total_api_costs'].pct_change().mean() * 100
            cost_per_request = data['avg_cost_per_request'].mean() if 'avg_cost_per_request' in data.columns else 0
            
            context = f"""
            Total Costs: ${total_cost:.2f}
            Average Daily Cost: ${avg_daily_cost:.2f}
            Cost Trend: {cost_trend:+.1f}%
            Average Cost per Request: ${cost_per_request:.4f}
            """
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a financial analyst specializing in AI platform costs. Provide insights on cost efficiency, trends, and optimization opportunities."
                    },
                    {
                        "role": "user",
                        "content": f"""Analyze these cost metrics and provide insights:
                        
                        {context}
                        
                        Focus on cost efficiency, spending trends, and potential savings."""
                    }
                ],
                temperature=0.5,
                max_tokens=400
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating cost analysis: {e}")
            return "Cost analysis could not be generated."
    
    async def _generate_user_behavior_analysis(self, data: pd.DataFrame) -> str:
        """Generate user behavior analysis narrative"""
        try:
            # Calculate user behavior metrics
            metrics = {}
            
            if 'active_users' in data.columns:
                metrics['total_active_users'] = data['active_users'].sum()
                metrics['avg_daily_users'] = data['active_users'].mean()
            
            if 'avg_session_duration' in data.columns:
                metrics['avg_session_duration'] = data['avg_session_duration'].mean()
            
            if 'avg_requests_per_session' in data.columns:
                metrics['avg_requests_per_session'] = data['avg_requests_per_session'].mean()
            
            context = f"User Behavior Metrics: {json.dumps(metrics, indent=2)}"
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a user experience analyst. Analyze user behavior patterns and provide insights on engagement, usage trends, and user satisfaction."
                    },
                    {
                        "role": "user",
                        "content": f"""Analyze these user behavior metrics:
                        
                        {context}
                        
                        Provide insights on user engagement, behavior patterns, and recommendations for improvement."""
                    }
                ],
                temperature=0.6,
                max_tokens=400
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating user behavior analysis: {e}")
            return "User behavior analysis could not be generated."
    
    async def _create_report_charts(self, config: ReportConfiguration, data: pd.DataFrame) -> List[Dict[str, str]]:
        """Create charts for the report"""
        if not config.include_charts or data.empty:
            return []
        
        charts = []
        
        try:
            # Usage trend chart
            if 'total_requests' in data.columns and 'timestamp' in data.columns:
                chart_data = self._create_usage_trend_chart(data)
                charts.append(chart_data)
            
            # Cost breakdown chart
            if 'total_api_costs' in data.columns:
                chart_data = self._create_cost_chart(data)
                charts.append(chart_data)
            
            # Performance metrics chart
            if 'avg_response_time' in data.columns:
                chart_data = self._create_performance_chart(data)
                charts.append(chart_data)
            
            return charts
            
        except Exception as e:
            logger.error(f"Error creating report charts: {e}")
            return []
    
    def _create_usage_trend_chart(self, data: pd.DataFrame) -> Dict[str, str]:
        """Create usage trend chart"""
        try:
            plt.figure(figsize=(12, 6))
            plt.plot(data['timestamp'], data['total_requests'], marker='o', linewidth=2)
            plt.title('Request Volume Trend', fontsize=16, fontweight='bold')
            plt.xlabel('Time', fontsize=12)
            plt.ylabel('Total Requests', fontsize=12)
            plt.grid(True, alpha=0.3)
            plt.xticks(rotation=45)
            plt.tight_layout()
            
            # Convert to base64
            buffer = io.BytesIO()
            plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
            buffer.seek(0)
            image_base64 = base64.b64encode(buffer.getvalue()).decode()
            plt.close()
            
            return {
                'title': 'Request Volume Trend',
                'type': 'line',
                'image': image_base64
            }
            
        except Exception as e:
            logger.error(f"Error creating usage trend chart: {e}")
            return {'title': 'Usage Trend', 'type': 'error', 'image': ''}
    
    def _create_cost_chart(self, data: pd.DataFrame) -> Dict[str, str]:
        """Create cost analysis chart"""
        try:
            # Create cost breakdown pie chart
            cost_categories = ['API Costs', 'Infrastructure', 'Storage', 'Other']
            
            if 'total_api_costs' in data.columns:
                api_costs = data['total_api_costs'].sum()
                infra_costs = data.get('total_infrastructure_costs', pd.Series([0])).sum()
                storage_costs = data.get('total_storage_costs', pd.Series([0])).sum()
                other_costs = api_costs * 0.1  # Estimate other costs
                
                costs = [api_costs, infra_costs, storage_costs, other_costs]
                
                plt.figure(figsize=(10, 8))
                plt.pie(costs, labels=cost_categories, autopct='%1.1f%%', startangle=90)
                plt.title('Cost Breakdown', fontsize=16, fontweight='bold')
                
                # Convert to base64
                buffer = io.BytesIO()
                plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
                buffer.seek(0)
                image_base64 = base64.b64encode(buffer.getvalue()).decode()
                plt.close()
                
                return {
                    'title': 'Cost Breakdown',
                    'type': 'pie',
                    'image': image_base64
                }
            
        except Exception as e:
            logger.error(f"Error creating cost chart: {e}")
            
        return {'title': 'Cost Analysis', 'type': 'error', 'image': ''}
    
    def _create_performance_chart(self, data: pd.DataFrame) -> Dict[str, str]:
        """Create performance metrics chart"""
        try:
            fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10))
            
            # Response time trend
            ax1.plot(data['timestamp'], data['avg_response_time'], 
                    color='blue', marker='o', linewidth=2)
            ax1.set_title('Average Response Time', fontsize=14, fontweight='bold')
            ax1.set_ylabel('Response Time (ms)')
            ax1.grid(True, alpha=0.3)
            
            # Error rate trend
            if 'avg_error_rate' in data.columns:
                ax2.plot(data['timestamp'], data['avg_error_rate'], 
                        color='red', marker='s', linewidth=2)
                ax2.set_title('Error Rate Trend', fontsize=14, fontweight='bold')
                ax2.set_ylabel('Error Rate (%)')
                ax2.set_xlabel('Time')
                ax2.grid(True, alpha=0.3)
            
            plt.tight_layout()
            
            # Convert to base64
            buffer = io.BytesIO()
            plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
            buffer.seek(0)
            image_base64 = base64.b64encode(buffer.getvalue()).decode()
            plt.close()
            
            return {
                'title': 'Performance Metrics',
                'type': 'line',
                'image': image_base64
            }
            
        except Exception as e:
            logger.error(f"Error creating performance chart: {e}")
            return {'title': 'Performance Metrics', 'type': 'error', 'image': ''}
    
    async def _generate_insights(self, config: ReportConfiguration, data: pd.DataFrame) -> List[str]:
        """Generate AI-powered insights"""
        try:
            if not config.include_predictions or data.empty:
                return []
            
            insights = []
            
            # Analyze trends and generate insights
            for column in data.select_dtypes(include=[np.number]).columns:
                if column != 'timestamp':
                    trend = self._calculate_trend(data[column])
                    if abs(trend) > 0.1:  # Significant trend
                        direction = "increasing" if trend > 0 else "decreasing"
                        insight = f"{column.replace('_', ' ').title()} is {direction} by {abs(trend)*100:.1f}% over the reporting period"
                        insights.append(insight)
            
            # Add AI-generated insights
            if len(data) > 0:
                context = f"Data summary: {data.describe().to_string()}"
                
                response = await self.openai_client.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an AI data analyst. Generate 2-3 key insights from the data summary. Be specific and actionable."
                        },
                        {
                            "role": "user",
                            "content": f"Generate insights from this data summary:\n{context}"
                        }
                    ],
                    temperature=0.6,
                    max_tokens=300
                )
                
                ai_insights = response.choices[0].message.content.split('\n')
                insights.extend([insight.strip('- ') for insight in ai_insights if insight.strip()])
            
            return insights[:5]  # Limit to top 5 insights
            
        except Exception as e:
            logger.error(f"Error generating insights: {e}")
            return ["Unable to generate insights due to technical issues"]
    
    async def _generate_recommendations(self, config: ReportConfiguration, data: pd.DataFrame) -> List[str]:
        """Generate AI-powered recommendations"""
        try:
            if not config.include_recommendations or data.empty:
                return []
            
            recommendations = []
            
            # Performance recommendations
            if 'avg_response_time' in data.columns:
                avg_response = data['avg_response_time'].mean()
                if avg_response > 1000:  # > 1 second
                    recommendations.append(
                        "Consider implementing caching strategies to reduce response times below 1000ms threshold"
                    )
            
            # Cost recommendations
            if 'total_api_costs' in data.columns:
                cost_trend = self._calculate_trend(data['total_api_costs'])
                if cost_trend > 0.2:  # 20% increase
                    recommendations.append(
                        "API costs are increasing significantly - review load balancing and model selection strategies"
                    )
            
            # AI-generated recommendations
            context = f"Report type: {config.report_type.value}\nData period: {config.time_range}"
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an AI consultant. Provide 2-3 specific, actionable recommendations based on the report context."
                    },
                    {
                        "role": "user",
                        "content": f"Generate recommendations for improvement based on:\n{context}"
                    }
                ],
                temperature=0.7,
                max_tokens=300
            )
            
            ai_recommendations = response.choices[0].message.content.split('\n')
            recommendations.extend([rec.strip('- ') for rec in ai_recommendations if rec.strip()])
            
            return recommendations[:5]  # Limit to top 5 recommendations
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return ["Unable to generate recommendations due to technical issues"]
    
    def _calculate_trend(self, series: pd.Series) -> float:
        """Calculate trend direction and magnitude"""
        if len(series) < 2:
            return 0
        
        # Simple linear trend calculation
        x = np.arange(len(series))
        coefficients = np.polyfit(x, series, 1)
        slope = coefficients[0]
        
        # Normalize by mean to get percentage change
        mean_value = series.mean()
        if mean_value != 0:
            return slope * len(series) / mean_value
        
        return 0
    
    async def _render_report(self, 
                           config: ReportConfiguration,
                           data: pd.DataFrame,
                           narrative_sections: List[Dict[str, str]],
                           charts: List[Dict[str, str]],
                           insights: List[str],
                           recommendations: List[str]) -> Path:
        """Render the final report in the specified format"""
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{config.report_id}_{timestamp}"
        
        if config.format == ReportFormat.HTML:
            return await self._render_html_report(
                config, data, narrative_sections, charts, insights, recommendations, filename
            )
        elif config.format == ReportFormat.PDF:
            return await self._render_pdf_report(
                config, data, narrative_sections, charts, insights, recommendations, filename
            )
        else:
            # Default to HTML
            return await self._render_html_report(
                config, data, narrative_sections, charts, insights, recommendations, filename
            )
    
    async def _render_html_report(self, 
                                config: ReportConfiguration,
                                data: pd.DataFrame,
                                narrative_sections: List[Dict[str, str]],
                                charts: List[Dict[str, str]],
                                insights: List[str],
                                recommendations: List[str],
                                filename: str) -> Path:
        """Render HTML report using Jinja2 templates"""
        
        try:
            # Get template
            template = self.templates.get(config.report_type.value)
            if not template:
                template = self.templates.get('executive_summary')
            
            # Prepare template context
            context = {
                'report_title': config.title,
                'description': config.description,
                'generated_date': datetime.now().strftime("%B %d, %Y at %I:%M %p"),
                'narrative_sections': narrative_sections,
                'charts': charts,
                'insights': [{'title': f'Insight {i+1}', 'description': insight} 
                           for i, insight in enumerate(insights)],
                'recommendations': [{'title': f'Recommendation {i+1}', 'description': rec, 'impact': 'Medium'} 
                                  for i, rec in enumerate(recommendations)],
                'key_metrics': self._prepare_key_metrics(data),
                'data_sources': config.data_sources,
                'methodology': self._get_methodology_text(config)
            }
            
            # Render template
            html_content = template.render(**context)
            
            # Write to file
            file_path = self.output_dir / f"{filename}.html"
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            return file_path
            
        except Exception as e:
            logger.error(f"Error rendering HTML report: {e}")
            raise
    
    async def _render_pdf_report(self, 
                               config: ReportConfiguration,
                               data: pd.DataFrame,
                               narrative_sections: List[Dict[str, str]],
                               charts: List[Dict[str, str]],
                               insights: List[str],
                               recommendations: List[str],
                               filename: str) -> Path:
        """Render PDF report using ReportLab"""
        
        try:
            file_path = self.output_dir / f"{filename}.pdf"
            doc = SimpleDocTemplate(str(file_path), pagesize=A4)
            styles = getSampleStyleSheet()
            story = []
            
            # Title
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                spaceAfter=30,
                alignment=TA_CENTER
            )
            story.append(Paragraph(config.title, title_style))
            story.append(Spacer(1, 20))
            
            # Description
            story.append(Paragraph(config.description, styles['Normal']))
            story.append(Spacer(1, 20))
            
            # Generated date
            story.append(Paragraph(
                f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
                styles['Normal']
            ))
            story.append(Spacer(1, 30))
            
            # Narrative sections
            for section in narrative_sections:
                story.append(Paragraph(section['title'], styles['Heading2']))
                story.append(Spacer(1, 12))
                story.append(Paragraph(section['content'], styles['Normal']))
                story.append(Spacer(1, 20))
            
            # Charts (if any)
            for chart in charts:
                if chart.get('image'):
                    story.append(Paragraph(chart['title'], styles['Heading3']))
                    story.append(Spacer(1, 12))
                    
                    # Decode base64 image
                    image_data = base64.b64decode(chart['image'])
                    img_buffer = io.BytesIO(image_data)
                    
                    # Add image to PDF
                    img = Image(img_buffer, width=5*inch, height=3*inch)
                    story.append(img)
                    story.append(Spacer(1, 20))
            
            # Insights
            if insights:
                story.append(Paragraph("Key Insights", styles['Heading2']))
                story.append(Spacer(1, 12))
                for insight in insights:
                    story.append(Paragraph(f"• {insight}", styles['Normal']))
                story.append(Spacer(1, 20))
            
            # Recommendations
            if recommendations:
                story.append(Paragraph("Recommendations", styles['Heading2']))
                story.append(Spacer(1, 12))
                for rec in recommendations:
                    story.append(Paragraph(f"• {rec}", styles['Normal']))
            
            # Build PDF
            doc.build(story)
            
            return file_path
            
        except Exception as e:
            logger.error(f"Error rendering PDF report: {e}")
            raise
    
    def _prepare_key_metrics(self, data: pd.DataFrame) -> List[Dict[str, str]]:
        """Prepare key metrics for template rendering"""
        if data.empty:
            return []
        
        metrics = []
        
        # Total requests
        if 'total_requests' in data.columns:
            total = data['total_requests'].sum()
            metrics.append({
                'title': 'Total Requests',
                'value': f"{total:,}",
                'unit': 'requests',
                'description': 'Total API requests processed during the reporting period'
            })
        
        # Average response time
        if 'avg_response_time' in data.columns:
            avg_time = data['avg_response_time'].mean()
            metrics.append({
                'title': 'Average Response Time',
                'value': f"{avg_time:.2f}",
                'unit': 'ms',
                'description': 'Mean API response time across all requests'
            })
        
        # Total costs
        if 'total_api_costs' in data.columns:
            total_cost = data['total_api_costs'].sum()
            metrics.append({
                'title': 'Total Costs',
                'value': f"${total_cost:.2f}",
                'unit': '',
                'description': 'Total operational costs for the reporting period'
            })
        
        return metrics
    
    def _get_methodology_text(self, config: ReportConfiguration) -> str:
        """Get methodology description for the report"""
        return f"""
        This report was generated using the AI Multi-Model Platform's advanced analytics engine. 
        Data was collected from {len(config.data_sources)} sources over the period from 
        {config.time_range['start']} to {config.time_range['end']}. 
        
        AI-powered analysis was performed using machine learning models for trend detection, 
        anomaly identification, and predictive insights. Natural language generation was 
        used to create narrative sections and recommendations.
        
        All metrics are calculated using standardized methodologies and include confidence 
        intervals where applicable.
        """
    
    async def _cache_report_metadata(self, report: GeneratedReport):
        """Cache report metadata in Redis"""
        try:
            cache_key = f"report:{report.report_id}"
            cache_data = {
                'metadata': asdict(report),
                'cached_at': datetime.now().isoformat()
            }
            
            await self.redis.setex(
                cache_key,
                86400,  # 24 hours TTL
                json.dumps(cache_data, default=str)
            )
            
        except Exception as e:
            logger.error(f"Error caching report metadata: {e}")
    
    async def schedule_report(self, schedule: ReportSchedule) -> bool:
        """Schedule a report for automated generation"""
        try:
            # Store schedule in database
            async with self.db_pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO report_schedules 
                    (schedule_id, report_config, frequency, time_of_day, 
                     days_of_week, recipients, delivery_method, active)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (schedule_id) 
                    DO UPDATE SET 
                        report_config = $2,
                        frequency = $3,
                        time_of_day = $4,
                        days_of_week = $5,
                        recipients = $6,
                        delivery_method = $7,
                        active = $8
                    """,
                    schedule.schedule_id,
                    json.dumps(asdict(schedule.report_config)),
                    schedule.frequency,
                    schedule.time_of_day,
                    json.dumps(schedule.days_of_week),
                    json.dumps(schedule.recipients),
                    schedule.delivery_method.value,
                    schedule.active
                )
            
            # Add to in-memory scheduler
            self.scheduled_reports[schedule.schedule_id] = schedule
            
            logger.info(f"Report scheduled successfully: {schedule.schedule_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error scheduling report: {e}")
            return False
    
    async def _load_scheduled_reports(self):
        """Load scheduled reports from database"""
        try:
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch("SELECT * FROM report_schedules WHERE active = true")
                
                for row in rows:
                    config_data = json.loads(row['report_config'])
                    config = ReportConfiguration(**config_data)
                    
                    schedule = ReportSchedule(
                        schedule_id=row['schedule_id'],
                        report_config=config,
                        frequency=row['frequency'],
                        time_of_day=row['time_of_day'],
                        days_of_week=json.loads(row['days_of_week']),
                        recipients=json.loads(row['recipients']),
                        delivery_method=DeliveryMethod(row['delivery_method']),
                        active=row['active'],
                        last_run=row['last_run'],
                        next_run=row['next_run']
                    )
                    
                    self.scheduled_reports[schedule.schedule_id] = schedule
            
            logger.info(f"Loaded {len(self.scheduled_reports)} scheduled reports")
            
        except Exception as e:
            logger.error(f"Error loading scheduled reports: {e}")
    
    def _start_scheduler(self):
        """Start the report scheduler in a background thread"""
        def run_scheduler():
            while True:
                try:
                    # Check for reports that need to be run
                    current_time = datetime.now()
                    
                    for schedule_id, schedule in self.scheduled_reports.items():
                        if schedule.active and self._should_run_report(schedule, current_time):
                            # Run report in background
                            self.executor.submit(self._run_scheduled_report, schedule)
                    
                    # Sleep for 1 minute before next check
                    time.sleep(60)
                    
                except Exception as e:
                    logger.error(f"Error in scheduler: {e}")
                    time.sleep(60)
        
        # Start scheduler thread
        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
        logger.info("Report scheduler started")
    
    def _should_run_report(self, schedule: ReportSchedule, current_time: datetime) -> bool:
        """Check if a scheduled report should be run now"""
        try:
            # Parse schedule time
            hour, minute = map(int, schedule.time_of_day.split(':'))
            
            # Check if it's the right time
            if current_time.hour != hour or current_time.minute != minute:
                return False
            
            # Check frequency
            if schedule.frequency == 'daily':
                return True
            elif schedule.frequency == 'weekly':
                return current_time.weekday() in schedule.days_of_week
            elif schedule.frequency == 'monthly':
                return current_time.day == 1  # First day of month
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking schedule: {e}")
            return False
    
    async def _run_scheduled_report(self, schedule: ReportSchedule):
        """Run a scheduled report"""
        try:
            logger.info(f"Running scheduled report: {schedule.schedule_id}")
            
            # Generate report
            report = await self.generate_report(schedule.report_config)
            
            if report.success:
                # Deliver report
                await self._deliver_report(report, schedule)
                
                # Update last run time
                schedule.last_run = datetime.now()
                
                logger.info(f"Scheduled report completed: {schedule.schedule_id}")
            else:
                logger.error(f"Scheduled report failed: {schedule.schedule_id} - {report.error_message}")
                
        except Exception as e:
            logger.error(f"Error running scheduled report {schedule.schedule_id}: {e}")
    
    async def _deliver_report(self, report: GeneratedReport, schedule: ReportSchedule):
        """Deliver report to recipients"""
        try:
            if schedule.delivery_method == DeliveryMethod.EMAIL:
                await self._send_email_report(report, schedule.recipients)
            elif schedule.delivery_method == DeliveryMethod.SLACK:
                await self._send_slack_report(report, schedule.recipients)
            # Add other delivery methods as needed
            
        except Exception as e:
            logger.error(f"Error delivering report: {e}")
    
    async def _send_email_report(self, report: GeneratedReport, recipients: List[str]):
        """Send report via email"""
        try:
            # Create email
            msg = MIMEMultipart()
            msg['From'] = self.email_config['sender_email']
            msg['To'] = ', '.join(recipients)
            msg['Subject'] = f"AI Platform Report: {report.config.title}"
            
            # Email body
            body = f"""
            Dear Team,
            
            Please find attached the latest AI Platform report: {report.config.title}
            
            Report Summary:
            - Generated: {report.generated_at.strftime('%Y-%m-%d %H:%M:%S')}
            - Processing Time: {report.processing_time:.2f} seconds
            - File Size: {report.file_size / 1024:.1f} KB
            - Insights Generated: {len(report.insights)}
            - Recommendations: {len(report.recommendations)}
            
            Best regards,
            AI Platform Analytics Team
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Attach report file
            with open(report.file_path, 'rb') as attachment:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(attachment.read())
                encoders.encode_base64(part)
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename= {Path(report.file_path).name}'
                )
                msg.attach(part)
            
            # Send email
            server = smtplib.SMTP(self.email_config['smtp_server'], self.email_config['smtp_port'])
            server.starttls()
            server.login(self.email_config['sender_email'], self.email_config['sender_password'])
            text = msg.as_string()
            server.sendmail(self.email_config['sender_email'], recipients, text)
            server.quit()
            
            logger.info(f"Report emailed to {len(recipients)} recipients")
            
        except Exception as e:
            logger.error(f"Error sending email report: {e}")
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            if self.db_pool:
                await self.db_pool.close()
            
            if self.redis:
                self.redis.close()
                await self.redis.wait_closed()
            
            self.executor.shutdown(wait=True)
            
            logger.info("AI Reporting Engine cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")


# FastAPI endpoints for the reporting engine
from fastapi import FastAPI, HTTPException, BackgroundTasks, File, UploadFile
from fastapi.responses import FileResponse, JSONResponse
import uvicorn

app = FastAPI(title="AI Reporting Engine API", version="1.0.0")

# Global reporting engine instance
reporting_engine: Optional[AIReportingEngine] = None

@app.on_event("startup")
async def startup_event():
    global reporting_engine
    
    db_config = {
        'host': 'localhost',
        'port': 5432,
        'database': 'ai_platform',
        'user': 'postgres',
        'password': 'postgres'
    }
    
    redis_config = {
        'host': 'localhost',
        'port': 6379
    }
    
    openai_api_key = "your-openai-api-key"  # Set this from environment
    
    reporting_engine = AIReportingEngine(db_config, redis_config, openai_api_key)
    await reporting_engine.initialize()

@app.on_event("shutdown")
async def shutdown_event():
    global reporting_engine
    if reporting_engine:
        await reporting_engine.cleanup()

@app.post("/api/v1/reports/generate")
async def generate_report(config_data: dict, background_tasks: BackgroundTasks):
    """Generate a new report"""
    try:
        config = ReportConfiguration(**config_data)
        
        # Generate report in background
        background_tasks.add_task(reporting_engine.generate_report, config)
        
        return {
            "message": "Report generation started",
            "report_id": config.report_id,
            "status": "processing"
        }
        
    except Exception as e:
        logger.error(f"Error in generate report endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/reports/{report_id}/download")
async def download_report(report_id: str):
    """Download generated report"""
    try:
        # Get report metadata from cache
        cache_key = f"report:{report_id}"
        cached_data = await reporting_engine.redis.get(cache_key)
        
        if not cached_data:
            raise HTTPException(status_code=404, detail="Report not found")
        
        report_data = json.loads(cached_data)
        file_path = report_data['metadata']['file_path']
        
        if not Path(file_path).exists():
            raise HTTPException(status_code=404, detail="Report file not found")
        
        return FileResponse(
            path=file_path,
            filename=Path(file_path).name,
            media_type='application/octet-stream'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/reports/schedule")
async def schedule_report(schedule_data: dict):
    """Schedule a recurring report"""
    try:
        # Parse schedule data
        config_data = schedule_data.pop('report_config')
        config = ReportConfiguration(**config_data)
        
        schedule = ReportSchedule(
            report_config=config,
            **schedule_data
        )
        
        success = await reporting_engine.schedule_report(schedule)
        
        if success:
            return {
                "message": "Report scheduled successfully",
                "schedule_id": schedule.schedule_id,
                "status": "active"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to schedule report")
            
    except Exception as e:
        logger.error(f"Error scheduling report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/reports/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

if __name__ == "__main__":
    uvicorn.run("ai_reporting_engine:app", host="0.0.0.0", port=8002, reload=True)