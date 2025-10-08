"""
Property Management System (PMS) Advanced Reporting
Complete reporting and analytics system for hotel operations
"""

import os
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta, date
from decimal import Decimal
import asyncio
import pandas as pd
import numpy as np
from enum import Enum
from dataclasses import dataclass, field
import logging
from sqlalchemy import select, func, and_, or_
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO
import boto3
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics.charts.piecharts import Pie

logger = logging.getLogger(__name__)

class ReportType(Enum):
    """Types of PMS reports"""
    OCCUPANCY = "occupancy"
    REVENUE = "revenue"
    ADR = "adr"  # Average Daily Rate
    REVPAR = "revpar"  # Revenue Per Available Room
    FORECAST = "forecast"
    GUEST_ANALYTICS = "guest_analytics"
    CHANNEL_PERFORMANCE = "channel_performance"
    HOUSEKEEPING = "housekeeping"
    MAINTENANCE = "maintenance"
    STAFF_PERFORMANCE = "staff_performance"
    COMPETITOR_ANALYSIS = "competitor_analysis"
    PACE = "pace"
    PICKUP = "pickup"
    SEGMENTATION = "segmentation"
    FINANCIAL = "financial"


class ReportPeriod(Enum):
    """Report time periods"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    CUSTOM = "custom"
    MTD = "mtd"  # Month to date
    YTD = "ytd"  # Year to date


@dataclass
class ReportMetrics:
    """Key performance metrics for PMS"""
    occupancy_rate: float
    adr: Decimal  # Average Daily Rate
    revpar: Decimal  # Revenue Per Available Room
    total_revenue: Decimal
    room_revenue: Decimal
    fb_revenue: Decimal  # Food & Beverage
    other_revenue: Decimal
    total_rooms: int
    occupied_rooms: int
    available_rooms: int
    arrivals: int
    departures: int
    stay_overs: int
    no_shows: int
    cancellations: int
    walk_ins: int
    average_los: float  # Length of stay
    
    def calculate_revpar(self) -> Decimal:
        """Calculate RevPAR"""
        if self.available_rooms > 0:
            return self.room_revenue / Decimal(self.available_rooms)
        return Decimal(0)
    
    def calculate_goppar(self, operating_profit: Decimal) -> Decimal:
        """Calculate Gross Operating Profit Per Available Room"""
        if self.available_rooms > 0:
            return operating_profit / Decimal(self.available_rooms)
        return Decimal(0)


class PMSReportingEngine:
    """Advanced reporting engine for Property Management System"""
    
    def __init__(self, db_session):
        self.db_session = db_session
        self.s3_client = boto3.client('s3')
        self.report_templates = self._load_report_templates()
        
    def _load_report_templates(self) -> Dict:
        """Load report templates"""
        return {
            ReportType.OCCUPANCY: {
                "name": "Occupancy Report",
                "metrics": ["occupancy_rate", "total_rooms", "occupied_rooms", "available_rooms"],
                "charts": ["occupancy_trend", "room_type_occupancy", "floor_occupancy"]
            },
            ReportType.REVENUE: {
                "name": "Revenue Report",
                "metrics": ["total_revenue", "room_revenue", "fb_revenue", "other_revenue"],
                "charts": ["revenue_trend", "revenue_by_category", "revenue_by_channel"]
            },
            ReportType.ADR: {
                "name": "Average Daily Rate Report",
                "metrics": ["adr", "room_revenue", "occupied_rooms"],
                "charts": ["adr_trend", "adr_by_room_type", "adr_by_channel"]
            },
            ReportType.REVPAR: {
                "name": "RevPAR Report",
                "metrics": ["revpar", "occupancy_rate", "adr"],
                "charts": ["revpar_trend", "revpar_vs_comp_set", "revpar_by_segment"]
            }
        }
    
    async def generate_report(
        self,
        property_id: str,
        report_type: ReportType,
        period: ReportPeriod,
        start_date: date,
        end_date: Optional[date] = None,
        options: Dict = None
    ) -> Dict:
        """Generate comprehensive PMS report"""
        
        # Determine date range
        date_range = self._calculate_date_range(period, start_date, end_date)
        
        # Fetch data based on report type
        if report_type == ReportType.OCCUPANCY:
            report_data = await self._generate_occupancy_report(property_id, date_range, options)
        elif report_type == ReportType.REVENUE:
            report_data = await self._generate_revenue_report(property_id, date_range, options)
        elif report_type == ReportType.ADR:
            report_data = await self._generate_adr_report(property_id, date_range, options)
        elif report_type == ReportType.REVPAR:
            report_data = await self._generate_revpar_report(property_id, date_range, options)
        elif report_type == ReportType.FORECAST:
            report_data = await self._generate_forecast_report(property_id, date_range, options)
        elif report_type == ReportType.GUEST_ANALYTICS:
            report_data = await self._generate_guest_analytics_report(property_id, date_range, options)
        elif report_type == ReportType.CHANNEL_PERFORMANCE:
            report_data = await self._generate_channel_performance_report(property_id, date_range, options)
        elif report_type == ReportType.PACE:
            report_data = await self._generate_pace_report(property_id, date_range, options)
        elif report_type == ReportType.COMPETITOR_ANALYSIS:
            report_data = await self._generate_competitor_analysis(property_id, date_range, options)
        else:
            report_data = await self._generate_standard_report(property_id, report_type, date_range, options)
        
        # Generate visualizations
        charts = await self._generate_charts(report_type, report_data)
        
        # Create PDF report
        pdf_url = await self._create_pdf_report(property_id, report_type, report_data, charts)
        
        # Create Excel report
        excel_url = await self._create_excel_report(property_id, report_type, report_data)
        
        return {
            "report_id": f"RPT-{property_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "type": report_type.value,
            "period": period.value,
            "date_range": {
                "start": date_range[0].isoformat(),
                "end": date_range[1].isoformat()
            },
            "data": report_data,
            "charts": charts,
            "downloads": {
                "pdf": pdf_url,
                "excel": excel_url
            },
            "generated_at": datetime.utcnow().isoformat()
        }
    
    def _calculate_date_range(
        self,
        period: ReportPeriod,
        start_date: date,
        end_date: Optional[date]
    ) -> Tuple[date, date]:
        """Calculate report date range"""
        
        if period == ReportPeriod.DAILY:
            return (start_date, start_date)
        elif period == ReportPeriod.WEEKLY:
            return (start_date, start_date + timedelta(days=6))
        elif period == ReportPeriod.MONTHLY:
            # Get last day of month
            if start_date.month == 12:
                end = date(start_date.year + 1, 1, 1) - timedelta(days=1)
            else:
                end = date(start_date.year, start_date.month + 1, 1) - timedelta(days=1)
            return (start_date.replace(day=1), end)
        elif period == ReportPeriod.QUARTERLY:
            quarter = (start_date.month - 1) // 3
            quarter_start = date(start_date.year, quarter * 3 + 1, 1)
            if quarter == 3:
                quarter_end = date(start_date.year + 1, 1, 1) - timedelta(days=1)
            else:
                quarter_end = date(start_date.year, (quarter + 1) * 3 + 1, 1) - timedelta(days=1)
            return (quarter_start, quarter_end)
        elif period == ReportPeriod.YEARLY:
            return (date(start_date.year, 1, 1), date(start_date.year, 12, 31))
        elif period == ReportPeriod.MTD:
            return (start_date.replace(day=1), start_date)
        elif period == ReportPeriod.YTD:
            return (date(start_date.year, 1, 1), start_date)
        elif period == ReportPeriod.CUSTOM:
            return (start_date, end_date or start_date)
        else:
            return (start_date, end_date or start_date)
    
    async def _generate_occupancy_report(
        self,
        property_id: str,
        date_range: Tuple[date, date],
        options: Dict
    ) -> Dict:
        """Generate occupancy report"""
        
        # Fetch occupancy data
        occupancy_data = []
        current_date = date_range[0]
        
        while current_date <= date_range[1]:
            daily_metrics = await self._get_daily_metrics(property_id, current_date)
            occupancy_data.append({
                "date": current_date.isoformat(),
                "occupancy_rate": daily_metrics.occupancy_rate,
                "occupied_rooms": daily_metrics.occupied_rooms,
                "available_rooms": daily_metrics.available_rooms,
                "out_of_order": daily_metrics.get("out_of_order", 0),
                "arrivals": daily_metrics.arrivals,
                "departures": daily_metrics.departures,
                "stay_overs": daily_metrics.stay_overs
            })
            current_date += timedelta(days=1)
        
        # Calculate summary statistics
        df = pd.DataFrame(occupancy_data)
        summary = {
            "average_occupancy": df["occupancy_rate"].mean(),
            "peak_occupancy": df["occupancy_rate"].max(),
            "lowest_occupancy": df["occupancy_rate"].min(),
            "total_room_nights_sold": df["occupied_rooms"].sum(),
            "total_room_nights_available": df["available_rooms"].sum()
        }
        
        # Room type breakdown
        room_type_occupancy = await self._get_room_type_occupancy(property_id, date_range)
        
        return {
            "daily_data": occupancy_data,
            "summary": summary,
            "room_type_breakdown": room_type_occupancy,
            "forecast": await self._generate_occupancy_forecast(property_id)
        }
    
    async def _generate_revenue_report(
        self,
        property_id: str,
        date_range: Tuple[date, date],
        options: Dict
    ) -> Dict:
        """Generate revenue report"""
        
        revenue_data = []
        current_date = date_range[0]
        
        while current_date <= date_range[1]:
            daily_revenue = await self._get_daily_revenue(property_id, current_date)
            revenue_data.append({
                "date": current_date.isoformat(),
                "room_revenue": float(daily_revenue["room"]),
                "fb_revenue": float(daily_revenue["fb"]),
                "spa_revenue": float(daily_revenue["spa"]),
                "other_revenue": float(daily_revenue["other"]),
                "total_revenue": float(daily_revenue["total"])
            })
            current_date += timedelta(days=1)
        
        df = pd.DataFrame(revenue_data)
        
        # Revenue by source
        revenue_by_source = {
            "online": await self._get_revenue_by_channel(property_id, date_range, "online"),
            "direct": await self._get_revenue_by_channel(property_id, date_range, "direct"),
            "ota": await self._get_revenue_by_channel(property_id, date_range, "ota"),
            "corporate": await self._get_revenue_by_channel(property_id, date_range, "corporate"),
            "group": await self._get_revenue_by_channel(property_id, date_range, "group")
        }
        
        # Payment method breakdown
        payment_breakdown = await self._get_payment_method_breakdown(property_id, date_range)
        
        return {
            "daily_data": revenue_data,
            "summary": {
                "total_revenue": df["total_revenue"].sum(),
                "average_daily_revenue": df["total_revenue"].mean(),
                "room_revenue_percentage": (df["room_revenue"].sum() / df["total_revenue"].sum()) * 100,
                "peak_revenue_day": df.loc[df["total_revenue"].idxmax()]["date"]
            },
            "revenue_by_source": revenue_by_source,
            "payment_breakdown": payment_breakdown,
            "year_over_year": await self._calculate_yoy_growth(property_id, date_range)
        }
    
    async def _generate_adr_report(
        self,
        property_id: str,
        date_range: Tuple[date, date],
        options: Dict
    ) -> Dict:
        """Generate Average Daily Rate report"""
        
        adr_data = []
        current_date = date_range[0]
        
        while current_date <= date_range[1]:
            daily_adr = await self._calculate_daily_adr(property_id, current_date)
            adr_data.append({
                "date": current_date.isoformat(),
                "adr": float(daily_adr["overall"]),
                "standard_adr": float(daily_adr.get("standard", 0)),
                "deluxe_adr": float(daily_adr.get("deluxe", 0)),
                "suite_adr": float(daily_adr.get("suite", 0))
            })
            current_date += timedelta(days=1)
        
        df = pd.DataFrame(adr_data)
        
        # ADR by market segment
        segment_adr = await self._get_adr_by_segment(property_id, date_range)
        
        # ADR by length of stay
        los_adr = await self._get_adr_by_los(property_id, date_range)
        
        return {
            "daily_data": adr_data,
            "summary": {
                "average_adr": df["adr"].mean(),
                "peak_adr": df["adr"].max(),
                "lowest_adr": df["adr"].min(),
                "adr_variance": df["adr"].std()
            },
            "segment_analysis": segment_adr,
            "los_analysis": los_adr,
            "rate_compression": await self._analyze_rate_compression(property_id, date_range)
        }
    
    async def _generate_revpar_report(
        self,
        property_id: str,
        date_range: Tuple[date, date],
        options: Dict
    ) -> Dict:
        """Generate RevPAR report"""
        
        revpar_data = []
        current_date = date_range[0]
        
        while current_date <= date_range[1]:
            metrics = await self._get_daily_metrics(property_id, current_date)
            revpar = metrics.calculate_revpar()
            revpar_data.append({
                "date": current_date.isoformat(),
                "revpar": float(revpar),
                "occupancy": metrics.occupancy_rate,
                "adr": float(metrics.adr)
            })
            current_date += timedelta(days=1)
        
        df = pd.DataFrame(revpar_data)
        
        # Competitive set analysis
        comp_set = await self._get_competitive_set_data(property_id, date_range)
        
        # RevPAR index calculation
        market_revpar = comp_set.get("market_average_revpar", 0)
        our_revpar = df["revpar"].mean()
        revpar_index = (our_revpar / market_revpar * 100) if market_revpar > 0 else 0
        
        return {
            "daily_data": revpar_data,
            "summary": {
                "average_revpar": df["revpar"].mean(),
                "peak_revpar": df["revpar"].max(),
                "lowest_revpar": df["revpar"].min(),
                "revpar_index": revpar_index
            },
            "competitive_analysis": comp_set,
            "revpar_components": {
                "occupancy_contribution": df["occupancy"].mean(),
                "adr_contribution": df["adr"].mean()
            }
        }
    
    async def _generate_forecast_report(
        self,
        property_id: str,
        date_range: Tuple[date, date],
        options: Dict
    ) -> Dict:
        """Generate forecast report using ML predictions"""
        
        # Historical data for model training
        historical_data = await self._get_historical_data(property_id, days=365)
        
        # Prepare features
        df = pd.DataFrame(historical_data)
        df['date'] = pd.to_datetime(df['date'])
        df['day_of_week'] = df['date'].dt.dayofweek
        df['month'] = df['date'].dt.month
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        
        # Simple forecast using rolling averages and seasonality
        forecast_days = (date_range[1] - date_range[0]).days + 1
        forecast = []
        
        for i in range(forecast_days):
            forecast_date = date_range[0] + timedelta(days=i)
            
            # Use historical average for same day of week and month
            similar_days = df[
                (df['day_of_week'] == forecast_date.weekday()) &
                (df['month'] == forecast_date.month)
            ]
            
            if not similar_days.empty:
                forecast.append({
                    "date": forecast_date.isoformat(),
                    "forecasted_occupancy": similar_days['occupancy'].mean(),
                    "forecasted_adr": float(similar_days['adr'].mean()),
                    "forecasted_revenue": float(similar_days['revenue'].mean()),
                    "confidence_level": 0.85 if len(similar_days) > 10 else 0.65
                })
            else:
                # Fallback to overall average
                forecast.append({
                    "date": forecast_date.isoformat(),
                    "forecasted_occupancy": df['occupancy'].mean(),
                    "forecasted_adr": float(df['adr'].mean()),
                    "forecasted_revenue": float(df['revenue'].mean()),
                    "confidence_level": 0.50
                })
        
        # Calculate forecast accuracy (if we have actuals)
        accuracy_metrics = await self._calculate_forecast_accuracy(property_id)
        
        return {
            "forecast": forecast,
            "accuracy_metrics": accuracy_metrics,
            "seasonality_factors": await self._get_seasonality_factors(property_id),
            "event_impact": await self._get_event_impact_forecast(property_id, date_range),
            "recommendations": await self._generate_forecast_recommendations(forecast)
        }
    
    async def _generate_guest_analytics_report(
        self,
        property_id: str,
        date_range: Tuple[date, date],
        options: Dict
    ) -> Dict:
        """Generate guest analytics report"""
        
        # Guest demographics
        demographics = await self._get_guest_demographics(property_id, date_range)
        
        # Guest satisfaction scores
        satisfaction = await self._get_guest_satisfaction_scores(property_id, date_range)
        
        # Repeat guest analysis
        repeat_guests = await self._analyze_repeat_guests(property_id, date_range)
        
        # Guest journey analysis
        journey_metrics = await self._analyze_guest_journey(property_id, date_range)
        
        # Nationality breakdown
        nationality_data = await self._get_nationality_breakdown(property_id, date_range)
        
        return {
            "total_guests": demographics["total"],
            "demographics": demographics,
            "satisfaction": {
                "average_score": satisfaction["average"],
                "nps_score": satisfaction["nps"],
                "reviews": satisfaction["review_count"],
                "top_complaints": satisfaction["top_complaints"],
                "top_compliments": satisfaction["top_compliments"]
            },
            "repeat_guests": {
                "percentage": repeat_guests["percentage"],
                "frequency": repeat_guests["frequency_distribution"],
                "lifetime_value": repeat_guests["average_ltv"]
            },
            "guest_journey": journey_metrics,
            "nationality_breakdown": nationality_data,
            "segmentation": await self._get_guest_segmentation(property_id, date_range)
        }
    
    async def _generate_channel_performance_report(
        self,
        property_id: str,
        date_range: Tuple[date, date],
        options: Dict
    ) -> Dict:
        """Generate channel performance report"""
        
        channels = ["Direct", "Booking.com", "Expedia", "Hotels.com", "Agoda", "Corporate", "Group", "Walk-in"]
        channel_data = []
        
        for channel in channels:
            performance = await self._get_channel_performance(property_id, channel, date_range)
            channel_data.append({
                "channel": channel,
                "bookings": performance["bookings"],
                "revenue": float(performance["revenue"]),
                "adr": float(performance["adr"]),
                "commission": float(performance.get("commission", 0)),
                "net_revenue": float(performance["revenue"] - performance.get("commission", 0)),
                "cancellation_rate": performance["cancellation_rate"],
                "conversion_rate": performance.get("conversion_rate", 0),
                "los": performance["average_los"]
            })
        
        df = pd.DataFrame(channel_data)
        
        # Calculate channel contribution
        total_revenue = df["revenue"].sum()
        df["revenue_contribution"] = (df["revenue"] / total_revenue * 100).round(2)
        
        # Channel profitability analysis
        df["profit_margin"] = ((df["net_revenue"] / df["revenue"]) * 100).round(2)
        
        return {
            "channel_performance": channel_data,
            "summary": {
                "best_performing_channel": df.loc[df["revenue"].idxmax()]["channel"],
                "most_profitable_channel": df.loc[df["profit_margin"].idxmax()]["channel"],
                "highest_adr_channel": df.loc[df["adr"].idxmax()]["channel"],
                "total_commission_paid": df["commission"].sum()
            },
            "channel_mix": df[["channel", "revenue_contribution"]].to_dict("records"),
            "optimization_opportunities": await self._identify_channel_opportunities(df)
        }
    
    async def _generate_pace_report(
        self,
        property_id: str,
        date_range: Tuple[date, date],
        options: Dict
    ) -> Dict:
        """Generate pace report for future bookings"""
        
        # Bookings on the books
        future_dates = pd.date_range(start=date.today(), periods=90, freq='D')
        pace_data = []
        
        for future_date in future_dates:
            bookings = await self._get_bookings_on_books(property_id, future_date.date())
            last_year_bookings = await self._get_bookings_on_books(
                property_id, 
                (future_date - pd.DateOffset(years=1)).date()
            )
            
            pace_data.append({
                "date": future_date.date().isoformat(),
                "rooms_booked": bookings["rooms"],
                "revenue_booked": float(bookings["revenue"]),
                "last_year_same_date": last_year_bookings["rooms"],
                "pace_vs_last_year": bookings["rooms"] - last_year_bookings["rooms"],
                "occupancy_on_books": (bookings["rooms"] / bookings["total_rooms"]) * 100
            })
        
        df = pd.DataFrame(pace_data)
        
        # Pickup analysis
        pickup_data = await self._analyze_booking_pickup(property_id)
        
        # Booking window analysis
        booking_window = await self._analyze_booking_window(property_id, date_range)
        
        return {
            "pace_data": pace_data,
            "summary": {
                "30_day_occupancy_on_books": df.head(30)["occupancy_on_books"].mean(),
                "60_day_occupancy_on_books": df.head(60)["occupancy_on_books"].mean(),
                "90_day_occupancy_on_books": df["occupancy_on_books"].mean(),
                "pace_vs_last_year_30": df.head(30)["pace_vs_last_year"].sum()
            },
            "pickup_analysis": pickup_data,
            "booking_window": booking_window,
            "demand_indicators": await self._identify_demand_indicators(df)
        }
    
    async def _generate_competitor_analysis(
        self,
        property_id: str,
        date_range: Tuple[date, date],
        options: Dict
    ) -> Dict:
        """Generate competitor analysis report"""
        
        # Define competitive set
        comp_set = await self._get_competitive_set(property_id)
        
        competitor_data = []
        for competitor in comp_set:
            comp_metrics = await self._get_competitor_metrics(competitor["id"], date_range)
            competitor_data.append({
                "competitor": competitor["name"],
                "occupancy": comp_metrics["occupancy"],
                "adr": float(comp_metrics["adr"]),
                "revpar": float(comp_metrics["revpar"]),
                "market_share": comp_metrics["market_share"],
                "rate_position": comp_metrics["rate_position"],
                "review_score": comp_metrics.get("review_score", 0)
            })
        
        # Our metrics
        our_metrics = await self._get_our_competitive_metrics(property_id, date_range)
        
        # Market penetration index
        mpi = (our_metrics["occupancy"] / np.mean([c["occupancy"] for c in competitor_data])) * 100
        
        # Average rate index
        ari = (our_metrics["adr"] / np.mean([c["adr"] for c in competitor_data])) * 100
        
        # Revenue generation index
        rgi = (our_metrics["revpar"] / np.mean([c["revpar"] for c in competitor_data])) * 100
        
        return {
            "competitive_set": competitor_data,
            "our_performance": our_metrics,
            "indices": {
                "mpi": mpi,  # Market Penetration Index
                "ari": ari,  # Average Rate Index
                "rgi": rgi   # Revenue Generation Index
            },
            "rate_shopping": await self._get_rate_shopping_data(property_id, comp_set, date_range),
            "market_trends": await self._analyze_market_trends(comp_set, date_range),
            "recommendations": await self._generate_competitive_recommendations(mpi, ari, rgi)
        }
    
    async def _generate_charts(self, report_type: ReportType, data: Dict) -> Dict:
        """Generate charts for report"""
        charts = {}
        
        if report_type in [ReportType.OCCUPANCY, ReportType.REVENUE, ReportType.ADR, ReportType.REVPAR]:
            # Create trend chart
            plt.figure(figsize=(12, 6))
            
            if "daily_data" in data:
                df = pd.DataFrame(data["daily_data"])
                
                if report_type == ReportType.OCCUPANCY:
                    plt.plot(pd.to_datetime(df["date"]), df["occupancy_rate"])
                    plt.ylabel("Occupancy %")
                    plt.title("Occupancy Trend")
                elif report_type == ReportType.REVENUE:
                    plt.plot(pd.to_datetime(df["date"]), df["total_revenue"])
                    plt.ylabel("Revenue ($)")
                    plt.title("Revenue Trend")
                elif report_type == ReportType.ADR:
                    plt.plot(pd.to_datetime(df["date"]), df["adr"])
                    plt.ylabel("ADR ($)")
                    plt.title("Average Daily Rate Trend")
                elif report_type == ReportType.REVPAR:
                    plt.plot(pd.to_datetime(df["date"]), df["revpar"])
                    plt.ylabel("RevPAR ($)")
                    plt.title("RevPAR Trend")
                
                plt.xlabel("Date")
                plt.xticks(rotation=45)
                plt.grid(True, alpha=0.3)
                
                # Save to buffer
                buffer = BytesIO()
                plt.tight_layout()
                plt.savefig(buffer, format='png')
                buffer.seek(0)
                
                # Upload to S3
                chart_key = f"reports/charts/{report_type.value}_trend_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.png"
                self.s3_client.put_object(
                    Bucket='spirittours-reports',
                    Key=chart_key,
                    Body=buffer.getvalue(),
                    ContentType='image/png'
                )
                
                charts["trend"] = f"https://spirittours-reports.s3.amazonaws.com/{chart_key}"
                plt.close()
        
        return charts
    
    async def _create_pdf_report(
        self,
        property_id: str,
        report_type: ReportType,
        data: Dict,
        charts: Dict
    ) -> str:
        """Create PDF report"""
        
        # Create PDF document
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        story = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Title'],
            fontSize=24,
            textColor=colors.HexColor('#003366')
        )
        story.append(Paragraph(f"{report_type.value.upper()} REPORT", title_style))
        story.append(Spacer(1, 20))
        
        # Property info
        property_info = await self._get_property_info(property_id)
        story.append(Paragraph(f"Property: {property_info['name']}", styles['Heading2']))
        story.append(Paragraph(f"Report Period: {data.get('date_range', {}).get('start', '')} to {data.get('date_range', {}).get('end', '')}", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Summary section
        if "summary" in data:
            story.append(Paragraph("Executive Summary", styles['Heading2']))
            summary_data = []
            for key, value in data["summary"].items():
                summary_data.append([key.replace("_", " ").title(), str(value)])
            
            summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 14),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(summary_table)
            story.append(Spacer(1, 20))
        
        # Add charts
        if charts:
            story.append(Paragraph("Visual Analytics", styles['Heading2']))
            for chart_name, chart_url in charts.items():
                # Download chart image
                # story.append(Image(chart_url, width=6*inch, height=3*inch))
                story.append(Spacer(1, 10))
        
        # Daily data table (if applicable)
        if "daily_data" in data and len(data["daily_data"]) > 0:
            story.append(PageBreak())
            story.append(Paragraph("Detailed Data", styles['Heading2']))
            
            # Convert to table format
            daily_df = pd.DataFrame(data["daily_data"])
            table_data = [daily_df.columns.tolist()] + daily_df.values.tolist()[:30]  # First 30 rows
            
            daily_table = Table(table_data)
            daily_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(daily_table)
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        # Upload to S3
        pdf_key = f"reports/pdf/{property_id}_{report_type.value}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.pdf"
        self.s3_client.put_object(
            Bucket='spirittours-reports',
            Key=pdf_key,
            Body=buffer.getvalue(),
            ContentType='application/pdf'
        )
        
        # Generate presigned URL
        url = self.s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': 'spirittours-reports', 'Key': pdf_key},
            ExpiresIn=86400 * 7  # 7 days
        )
        
        return url
    
    async def _create_excel_report(
        self,
        property_id: str,
        report_type: ReportType,
        data: Dict
    ) -> str:
        """Create Excel report with multiple sheets"""
        
        buffer = BytesIO()
        
        with pd.ExcelWriter(buffer, engine='xlsxwriter') as writer:
            # Summary sheet
            if "summary" in data:
                summary_df = pd.DataFrame([data["summary"]])
                summary_df.to_excel(writer, sheet_name='Summary', index=False)
            
            # Daily data sheet
            if "daily_data" in data:
                daily_df = pd.DataFrame(data["daily_data"])
                daily_df.to_excel(writer, sheet_name='Daily Data', index=False)
            
            # Additional sheets based on report type
            for key, value in data.items():
                if isinstance(value, list) and len(value) > 0 and isinstance(value[0], dict):
                    df = pd.DataFrame(value)
                    sheet_name = key.replace("_", " ").title()[:31]  # Excel sheet name limit
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
        
        buffer.seek(0)
        
        # Upload to S3
        excel_key = f"reports/excel/{property_id}_{report_type.value}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.xlsx"
        self.s3_client.put_object(
            Bucket='spirittours-reports',
            Key=excel_key,
            Body=buffer.getvalue(),
            ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        
        # Generate presigned URL
        url = self.s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': 'spirittours-reports', 'Key': excel_key},
            ExpiresIn=86400 * 7  # 7 days
        )
        
        return url
    
    # Placeholder methods for data fetching (would connect to actual database)
    async def _get_daily_metrics(self, property_id: str, date: date) -> ReportMetrics:
        """Get daily metrics (placeholder)"""
        return ReportMetrics(
            occupancy_rate=75.5,
            adr=Decimal("125.00"),
            revpar=Decimal("94.38"),
            total_revenue=Decimal("15000.00"),
            room_revenue=Decimal("12000.00"),
            fb_revenue=Decimal("2000.00"),
            other_revenue=Decimal("1000.00"),
            total_rooms=100,
            occupied_rooms=75,
            available_rooms=100,
            arrivals=30,
            departures=25,
            stay_overs=45,
            no_shows=2,
            cancellations=3,
            walk_ins=5,
            average_los=2.3
        )
    
    async def _get_property_info(self, property_id: str) -> Dict:
        """Get property information"""
        return {
            "name": "Spirit Tours Grand Hotel",
            "address": "123 Main St, New York, NY",
            "total_rooms": 200,
            "property_type": "Full Service Hotel"
        }
    
    async def _get_historical_data(self, property_id: str, days: int) -> List[Dict]:
        """Get historical data for forecasting"""
        # Placeholder - would fetch from database
        return []
    
    async def _get_daily_revenue(self, property_id: str, date: date) -> Dict:
        """Get daily revenue breakdown"""
        return {
            "room": Decimal("12000"),
            "fb": Decimal("3000"),
            "spa": Decimal("500"),
            "other": Decimal("500"),
            "total": Decimal("16000")
        }
    
    async def _calculate_daily_adr(self, property_id: str, date: date) -> Dict:
        """Calculate daily ADR by room type"""
        return {
            "overall": Decimal("125.00"),
            "standard": Decimal("95.00"),
            "deluxe": Decimal("135.00"),
            "suite": Decimal("225.00")
        }


# Export classes
__all__ = [
    'ReportType',
    'ReportPeriod',
    'ReportMetrics',
    'PMSReportingEngine'
]