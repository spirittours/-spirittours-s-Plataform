"""
Enterprise Analytics Service
Comprehensive real-time analytics and reporting system for B2C/B2B/B2B2C booking platform.

Features:
- Real-time booking metrics and KPIs
- Payment analytics and financial reporting  
- User engagement and behavioral analytics
- System performance monitoring
- Revenue tracking by business model
- AI agent usage analytics
- Customizable dashboards and reports
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import pandas as pd
from sqlalchemy import and_, or_, func, text, desc, asc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from ..database import get_db_session
from ..models.database_models import (
    User, BookingRequest, PaymentTransaction, PaymentRefund,
    NotificationLog, AIQueryLog, TourOperator, TravelAgency, SalesAgent,
    BusinessBooking, AIAgentConfig
)

logger = logging.getLogger(__name__)

class MetricType(str, Enum):
    """Types of analytics metrics"""
    BOOKING = "booking"
    PAYMENT = "payment"
    USER = "user"
    REVENUE = "revenue"
    AI_USAGE = "ai_usage"
    SYSTEM = "system"
    ENGAGEMENT = "engagement"

class TimeFrame(str, Enum):
    """Analytics time frame options"""
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"

class BusinessModel(str, Enum):
    """Business model types"""
    B2C = "b2c"
    B2B = "b2b"
    B2B2C = "b2b2c"

@dataclass
class MetricValue:
    """Individual metric value with metadata"""
    value: Union[int, float, Decimal]
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['timestamp'] = self.timestamp.isoformat()
        if isinstance(self.value, Decimal):
            result['value'] = float(self.value)
        return result

@dataclass
class AnalyticsReport:
    """Comprehensive analytics report"""
    report_id: str
    report_type: str
    time_frame: TimeFrame
    start_date: datetime
    end_date: datetime
    metrics: Dict[str, List[MetricValue]]
    summary: Dict[str, Any]
    generated_at: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['start_date'] = self.start_date.isoformat()
        result['end_date'] = self.end_date.isoformat()
        result['generated_at'] = self.generated_at.isoformat()
        result['metrics'] = {
            key: [metric.to_dict() for metric in values]
            for key, values in self.metrics.items()
        }
        return result

@dataclass
class KPIMetrics:
    """Key Performance Indicators"""
    total_bookings: int
    total_revenue: Decimal
    average_booking_value: Decimal
    conversion_rate: float
    user_retention_rate: float
    ai_satisfaction_score: float
    system_uptime: float
    response_time: float
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        # Convert Decimal to float for JSON serialization
        for key, value in result.items():
            if isinstance(value, Decimal):
                result[key] = float(value)
        return result

class AnalyticsService:
    """
    Advanced analytics service for comprehensive business intelligence.
    
    Provides real-time metrics, KPIs, and detailed reports for the enterprise
    booking platform across B2C, B2B, and B2B2C business models.
    """
    
    def __init__(self, db_session: AsyncSession = None):
        self.db = db_session
        self.cache = {}  # In-memory cache for frequently accessed metrics
        self.cache_ttl = 300  # 5 minutes cache TTL
        
    async def get_real_time_kpis(self, time_frame: TimeFrame = TimeFrame.DAY) -> KPIMetrics:
        """Get real-time Key Performance Indicators"""
        try:
            end_date = datetime.now(timezone.utc)
            start_date = self._get_start_date(end_date, time_frame)
            
            async with get_db_session() as db:
                # Total bookings
                booking_query = await db.execute(
                    text("""
                        SELECT COUNT(*) as total_bookings,
                               COALESCE(AVG(total_amount), 0) as avg_booking_value,
                               COALESCE(SUM(total_amount), 0) as total_revenue
                        FROM booking_requests 
                        WHERE created_at BETWEEN :start_date AND :end_date
                        AND status = 'confirmed'
                    """),
                    {"start_date": start_date, "end_date": end_date}
                )
                booking_stats = booking_query.fetchone()
                
                # User metrics
                user_query = await db.execute(
                    text("""
                        SELECT COUNT(DISTINCT user_id) as active_users
                        FROM booking_requests 
                        WHERE created_at BETWEEN :start_date AND :end_date
                    """),
                    {"start_date": start_date, "end_date": end_date}
                )
                user_stats = user_query.fetchone()
                
                # Conversion rate (bookings / total queries)
                total_users_query = await db.execute(
                    text("""
                        SELECT COUNT(*) as total_users
                        FROM users 
                        WHERE created_at BETWEEN :start_date AND :end_date
                    """),
                    {"start_date": start_date, "end_date": end_date}
                )
                total_users = total_users_query.fetchone()
                
                # AI satisfaction from query logs
                ai_satisfaction_query = await db.execute(
                    text("""
                        SELECT AVG(
                            CASE 
                                WHEN response_metadata::text LIKE '%satisfaction%' 
                                THEN CAST(response_metadata->>'satisfaction' AS FLOAT)
                                ELSE 4.0
                            END
                        ) as satisfaction
                        FROM ai_query_logs 
                        WHERE created_at BETWEEN :start_date AND :end_date
                    """),
                    {"start_date": start_date, "end_date": end_date}
                )
                ai_satisfaction = ai_satisfaction_query.fetchone()
                
                # System metrics
                system_query = await db.execute(
                    text("""
                        SELECT AVG(response_time_ms) as avg_response_time
                        FROM ai_query_logs 
                        WHERE created_at BETWEEN :start_date AND :end_date
                        AND response_time_ms IS NOT NULL
                    """),
                    {"start_date": start_date, "end_date": end_date}
                )
                system_stats = system_query.fetchone()
            
            # Calculate metrics
            total_bookings = booking_stats.total_bookings or 0
            total_revenue = Decimal(str(booking_stats.total_revenue or 0))
            avg_booking_value = Decimal(str(booking_stats.avg_booking_value or 0))
            active_users = user_stats.active_users or 1
            total_new_users = total_users.total_users or 1
            
            # Conversion rate: bookings / total new users
            conversion_rate = (total_bookings / max(total_new_users, 1)) * 100
            
            # User retention (active users from previous period)
            retention_rate = await self._calculate_retention_rate(start_date, end_date)
            
            # AI satisfaction score (1-5 scale, default 4.0)
            ai_satisfaction_score = float(ai_satisfaction.satisfaction or 4.0)
            
            # System performance
            avg_response_time = float(system_stats.avg_response_time or 100) / 1000  # Convert to seconds
            system_uptime = 99.9  # Placeholder - would integrate with monitoring service
            
            return KPIMetrics(
                total_bookings=total_bookings,
                total_revenue=total_revenue,
                average_booking_value=avg_booking_value,
                conversion_rate=conversion_rate,
                user_retention_rate=retention_rate,
                ai_satisfaction_score=ai_satisfaction_score,
                system_uptime=system_uptime,
                response_time=avg_response_time
            )
            
        except Exception as e:
            logger.error(f"Error calculating KPIs: {str(e)}")
            # Return default KPIs on error
            return KPIMetrics(
                total_bookings=0,
                total_revenue=Decimal('0'),
                average_booking_value=Decimal('0'),
                conversion_rate=0.0,
                user_retention_rate=0.0,
                ai_satisfaction_score=4.0,
                system_uptime=99.9,
                response_time=0.1
            )
    
    async def get_booking_analytics(self, 
                                  time_frame: TimeFrame = TimeFrame.DAY,
                                  business_model: Optional[BusinessModel] = None) -> Dict[str, Any]:
        """Get comprehensive booking analytics"""
        try:
            end_date = datetime.now(timezone.utc)
            start_date = self._get_start_date(end_date, time_frame)
            
            async with get_db_session() as db:
                # Base booking query
                base_query = """
                    SELECT 
                        DATE_TRUNC(:time_frame, created_at) as period,
                        COUNT(*) as booking_count,
                        SUM(total_amount) as total_revenue,
                        AVG(total_amount) as avg_booking_value,
                        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
                        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
                        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings
                    FROM booking_requests 
                    WHERE created_at BETWEEN :start_date AND :end_date
                """
                
                # Add business model filter if specified
                if business_model:
                    if business_model == BusinessModel.B2C:
                        base_query += " AND user_id NOT IN (SELECT user_id FROM tour_operators UNION SELECT user_id FROM travel_agencies)"
                    elif business_model == BusinessModel.B2B:
                        base_query += " AND (user_id IN (SELECT user_id FROM tour_operators) OR user_id IN (SELECT user_id FROM travel_agencies))"
                
                base_query += " GROUP BY period ORDER BY period"
                
                # Execute query
                result = await db.execute(
                    text(base_query),
                    {
                        "time_frame": time_frame.value,
                        "start_date": start_date,
                        "end_date": end_date
                    }
                )
                
                booking_data = result.fetchall()
                
                # Get top destinations
                destination_query = await db.execute(
                    text("""
                        SELECT destination, COUNT(*) as booking_count,
                               SUM(total_amount) as revenue
                        FROM booking_requests 
                        WHERE created_at BETWEEN :start_date AND :end_date
                        AND status = 'confirmed'
                        GROUP BY destination 
                        ORDER BY booking_count DESC 
                        LIMIT 10
                    """),
                    {"start_date": start_date, "end_date": end_date}
                )
                destinations = destination_query.fetchall()
                
                # Get booking sources
                source_query = await db.execute(
                    text("""
                        SELECT 
                            CASE 
                                WHEN user_id IN (SELECT user_id FROM tour_operators) THEN 'Tour Operator'
                                WHEN user_id IN (SELECT user_id FROM travel_agencies) THEN 'Travel Agency'
                                ELSE 'Direct/B2C'
                            END as source,
                            COUNT(*) as booking_count,
                            SUM(total_amount) as revenue
                        FROM booking_requests 
                        WHERE created_at BETWEEN :start_date AND :end_date
                        AND status = 'confirmed'
                        GROUP BY source
                    """),
                    {"start_date": start_date, "end_date": end_date}
                )
                sources = source_query.fetchall()
            
            # Format response
            return {
                "time_frame": time_frame.value,
                "period_data": [
                    {
                        "period": row.period.isoformat(),
                        "booking_count": row.booking_count,
                        "total_revenue": float(row.total_revenue or 0),
                        "avg_booking_value": float(row.avg_booking_value or 0),
                        "confirmed_bookings": row.confirmed_bookings,
                        "cancelled_bookings": row.cancelled_bookings,
                        "pending_bookings": row.pending_bookings,
                        "confirmation_rate": (row.confirmed_bookings / max(row.booking_count, 1)) * 100
                    }
                    for row in booking_data
                ],
                "top_destinations": [
                    {
                        "destination": row.destination,
                        "booking_count": row.booking_count,
                        "revenue": float(row.revenue or 0)
                    }
                    for row in destinations
                ],
                "booking_sources": [
                    {
                        "source": row.source,
                        "booking_count": row.booking_count,
                        "revenue": float(row.revenue or 0)
                    }
                    for row in sources
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting booking analytics: {str(e)}")
            return {"error": f"Failed to get booking analytics: {str(e)}"}
    
    async def get_payment_analytics(self, time_frame: TimeFrame = TimeFrame.DAY) -> Dict[str, Any]:
        """Get comprehensive payment and financial analytics"""
        try:
            end_date = datetime.now(timezone.utc)
            start_date = self._get_start_date(end_date, time_frame)
            
            async with get_db_session() as db:
                # Payment transactions by period
                transaction_query = await db.execute(
                    text("""
                        SELECT 
                            DATE_TRUNC(:time_frame, created_at) as period,
                            COUNT(*) as transaction_count,
                            SUM(amount) as total_amount,
                            AVG(amount) as avg_amount,
                            COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_payments,
                            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
                            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
                            payment_method,
                            currency
                        FROM payment_transactions 
                        WHERE created_at BETWEEN :start_date AND :end_date
                        GROUP BY period, payment_method, currency 
                        ORDER BY period
                    """),
                    {
                        "time_frame": time_frame.value,
                        "start_date": start_date,
                        "end_date": end_date
                    }
                )
                
                transaction_data = transaction_query.fetchall()
                
                # Refund analytics
                refund_query = await db.execute(
                    text("""
                        SELECT 
                            COUNT(*) as refund_count,
                            SUM(refund_amount) as total_refunds,
                            AVG(refund_amount) as avg_refund
                        FROM payment_refunds 
                        WHERE created_at BETWEEN :start_date AND :end_date
                        AND status = 'completed'
                    """),
                    {"start_date": start_date, "end_date": end_date}
                )
                refund_stats = refund_query.fetchone()
                
                # Commission analytics by business model
                commission_query = await db.execute(
                    text("""
                        SELECT 
                            CASE 
                                WHEN pt.booking_id IN (
                                    SELECT br.id FROM booking_requests br 
                                    JOIN tour_operators to ON br.user_id = to.user_id
                                ) THEN 'Tour Operator'
                                WHEN pt.booking_id IN (
                                    SELECT br.id FROM booking_requests br 
                                    JOIN travel_agencies ta ON br.user_id = ta.user_id
                                ) THEN 'Travel Agency'
                                ELSE 'Direct/B2C'
                            END as business_model,
                            SUM(amount * 0.10) as estimated_commission
                        FROM payment_transactions pt
                        WHERE pt.created_at BETWEEN :start_date AND :end_date
                        AND pt.status = 'completed'
                        GROUP BY business_model
                    """),
                    {"start_date": start_date, "end_date": end_date}
                )
                commission_data = commission_query.fetchall()
            
            # Process payment method data
            payment_methods = {}
            period_data = {}
            
            for row in transaction_data:
                period_str = row.period.isoformat()
                method_key = f"{row.payment_method}_{row.currency}"
                
                if period_str not in period_data:
                    period_data[period_str] = {
                        "period": period_str,
                        "total_transactions": 0,
                        "total_amount": 0,
                        "success_rate": 0,
                        "methods": {}
                    }
                
                period_data[period_str]["total_transactions"] += row.transaction_count
                period_data[period_str]["total_amount"] += float(row.total_amount or 0)
                period_data[period_str]["methods"][method_key] = {
                    "method": row.payment_method,
                    "currency": row.currency,
                    "count": row.transaction_count,
                    "amount": float(row.total_amount or 0),
                    "success_rate": (row.successful_payments / max(row.transaction_count, 1)) * 100
                }
                
                if row.payment_method not in payment_methods:
                    payment_methods[row.payment_method] = {
                        "total_transactions": 0,
                        "total_amount": 0,
                        "currencies": set()
                    }
                
                payment_methods[row.payment_method]["total_transactions"] += row.transaction_count
                payment_methods[row.payment_method]["total_amount"] += float(row.total_amount or 0)
                payment_methods[row.payment_method]["currencies"].add(row.currency)
            
            # Calculate success rates for periods
            for period in period_data.values():
                if period["total_transactions"] > 0:
                    successful = sum(
                        method["count"] * (method["success_rate"] / 100) 
                        for method in period["methods"].values()
                    )
                    period["success_rate"] = (successful / period["total_transactions"]) * 100
            
            return {
                "time_frame": time_frame.value,
                "period_data": list(period_data.values()),
                "payment_methods": {
                    method: {
                        "total_transactions": data["total_transactions"],
                        "total_amount": data["total_amount"],
                        "currencies": list(data["currencies"])
                    }
                    for method, data in payment_methods.items()
                },
                "refund_analytics": {
                    "total_refunds": refund_stats.refund_count or 0,
                    "total_refund_amount": float(refund_stats.total_refunds or 0),
                    "average_refund": float(refund_stats.avg_refund or 0)
                },
                "commission_breakdown": [
                    {
                        "business_model": row.business_model,
                        "estimated_commission": float(row.estimated_commission or 0)
                    }
                    for row in commission_data
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting payment analytics: {str(e)}")
            return {"error": f"Failed to get payment analytics: {str(e)}"}
    
    async def get_ai_usage_analytics(self, time_frame: TimeFrame = TimeFrame.DAY) -> Dict[str, Any]:
        """Get AI agent usage and performance analytics"""
        try:
            end_date = datetime.now(timezone.utc)
            start_date = self._get_start_date(end_date, time_frame)
            
            async with get_db_session() as db:
                # AI query analytics by agent
                agent_query = await db.execute(
                    text("""
                        SELECT 
                            agent_name,
                            COUNT(*) as query_count,
                            AVG(response_time_ms) as avg_response_time,
                            COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_queries,
                            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_queries,
                            AVG(
                                CASE 
                                    WHEN response_metadata::text LIKE '%satisfaction%' 
                                    THEN CAST(response_metadata->>'satisfaction' AS FLOAT)
                                    ELSE 4.0
                                END
                            ) as avg_satisfaction
                        FROM ai_query_logs 
                        WHERE created_at BETWEEN :start_date AND :end_date
                        GROUP BY agent_name 
                        ORDER BY query_count DESC
                    """),
                    {"start_date": start_date, "end_date": end_date}
                )
                agent_stats = agent_query.fetchall()
                
                # Query trends by period
                trend_query = await db.execute(
                    text("""
                        SELECT 
                            DATE_TRUNC(:time_frame, created_at) as period,
                            COUNT(*) as query_count,
                            AVG(response_time_ms) as avg_response_time,
                            COUNT(DISTINCT agent_name) as active_agents,
                            COUNT(DISTINCT user_id) as active_users
                        FROM ai_query_logs 
                        WHERE created_at BETWEEN :start_date AND :end_date
                        GROUP BY period 
                        ORDER BY period
                    """),
                    {
                        "time_frame": time_frame.value,
                        "start_date": start_date,
                        "end_date": end_date
                    }
                )
                trend_data = trend_query.fetchall()
                
                # Most popular query types
                query_type_query = await db.execute(
                    text("""
                        SELECT 
                            query_metadata->>'intent' as query_intent,
                            COUNT(*) as count
                        FROM ai_query_logs 
                        WHERE created_at BETWEEN :start_date AND :end_date
                        AND query_metadata->>'intent' IS NOT NULL
                        GROUP BY query_intent 
                        ORDER BY count DESC 
                        LIMIT 10
                    """),
                    {"start_date": start_date, "end_date": end_date}
                )
                query_types = query_type_query.fetchall()
            
            return {
                "time_frame": time_frame.value,
                "agent_performance": [
                    {
                        "agent_name": row.agent_name,
                        "query_count": row.query_count,
                        "avg_response_time_ms": float(row.avg_response_time or 0),
                        "success_rate": (row.successful_queries / max(row.query_count, 1)) * 100,
                        "avg_satisfaction": float(row.avg_satisfaction or 4.0)
                    }
                    for row in agent_stats
                ],
                "usage_trends": [
                    {
                        "period": row.period.isoformat(),
                        "query_count": row.query_count,
                        "avg_response_time_ms": float(row.avg_response_time or 0),
                        "active_agents": row.active_agents,
                        "active_users": row.active_users
                    }
                    for row in trend_data
                ],
                "popular_query_types": [
                    {
                        "query_intent": row.query_intent,
                        "count": row.count
                    }
                    for row in query_types
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting AI usage analytics: {str(e)}")
            return {"error": f"Failed to get AI usage analytics: {str(e)}"}
    
    async def get_user_engagement_analytics(self, time_frame: TimeFrame = TimeFrame.DAY) -> Dict[str, Any]:
        """Get user engagement and behavioral analytics"""
        try:
            end_date = datetime.now(timezone.utc)
            start_date = self._get_start_date(end_date, time_frame)
            
            async with get_db_session() as db:
                # User activity trends
                activity_query = await db.execute(
                    text("""
                        SELECT 
                            DATE_TRUNC(:time_frame, created_at) as period,
                            COUNT(DISTINCT user_id) as active_users,
                            COUNT(*) as total_activity
                        FROM (
                            SELECT user_id, created_at FROM booking_requests
                            UNION ALL
                            SELECT user_id, created_at FROM ai_query_logs
                        ) as user_activity
                        WHERE created_at BETWEEN :start_date AND :end_date
                        GROUP BY period 
                        ORDER BY period
                    """),
                    {
                        "time_frame": time_frame.value,
                        "start_date": start_date,
                        "end_date": end_date
                    }
                )
                activity_data = activity_query.fetchall()
                
                # User segmentation by booking frequency
                segmentation_query = await db.execute(
                    text("""
                        SELECT 
                            CASE 
                                WHEN booking_count = 0 THEN 'New User'
                                WHEN booking_count = 1 THEN 'One-time Booker'
                                WHEN booking_count BETWEEN 2 AND 5 THEN 'Regular Customer'
                                WHEN booking_count > 5 THEN 'VIP Customer'
                            END as user_segment,
                            COUNT(*) as user_count,
                            AVG(total_spent) as avg_lifetime_value
                        FROM (
                            SELECT 
                                u.id,
                                COUNT(br.id) as booking_count,
                                COALESCE(SUM(br.total_amount), 0) as total_spent
                            FROM users u
                            LEFT JOIN booking_requests br ON u.id = br.user_id 
                                AND br.created_at >= :start_date
                            WHERE u.created_at <= :end_date
                            GROUP BY u.id
                        ) as user_stats
                        GROUP BY user_segment
                    """),
                    {"start_date": start_date, "end_date": end_date}
                )
                segmentation_data = segmentation_query.fetchall()
                
                # Notification engagement
                notification_query = await db.execute(
                    text("""
                        SELECT 
                            notification_type,
                            COUNT(*) as sent_count,
                            COUNT(CASE WHEN delivery_status = 'delivered' THEN 1 END) as delivered_count,
                            AVG(
                                CASE 
                                    WHEN metadata::text LIKE '%opened%' 
                                    THEN 1 
                                    ELSE 0 
                                END
                            ) * 100 as open_rate
                        FROM notification_logs 
                        WHERE created_at BETWEEN :start_date AND :end_date
                        GROUP BY notification_type
                    """),
                    {"start_date": start_date, "end_date": end_date}
                )
                notification_data = notification_query.fetchall()
            
            return {
                "time_frame": time_frame.value,
                "activity_trends": [
                    {
                        "period": row.period.isoformat(),
                        "active_users": row.active_users,
                        "total_activity": row.total_activity,
                        "activity_per_user": row.total_activity / max(row.active_users, 1)
                    }
                    for row in activity_data
                ],
                "user_segmentation": [
                    {
                        "segment": row.user_segment,
                        "user_count": row.user_count,
                        "avg_lifetime_value": float(row.avg_lifetime_value or 0)
                    }
                    for row in segmentation_data
                ],
                "notification_engagement": [
                    {
                        "notification_type": row.notification_type,
                        "sent_count": row.sent_count,
                        "delivery_rate": (row.delivered_count / max(row.sent_count, 1)) * 100,
                        "open_rate": float(row.open_rate or 0)
                    }
                    for row in notification_data
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting user engagement analytics: {str(e)}")
            return {"error": f"Failed to get user engagement analytics: {str(e)}"}
    
    async def generate_comprehensive_report(self, 
                                          report_type: str,
                                          time_frame: TimeFrame = TimeFrame.DAY,
                                          business_model: Optional[BusinessModel] = None) -> AnalyticsReport:
        """Generate a comprehensive analytics report"""
        try:
            end_date = datetime.now(timezone.utc)
            start_date = self._get_start_date(end_date, time_frame)
            report_id = f"{report_type}_{time_frame.value}_{int(end_date.timestamp())}"
            
            # Gather all analytics data
            metrics = {}
            
            # Get KPIs
            kpis = await self.get_real_time_kpis(time_frame)
            metrics["kpis"] = [MetricValue(value=kpis.to_dict(), timestamp=end_date)]
            
            # Get booking analytics
            booking_data = await self.get_booking_analytics(time_frame, business_model)
            metrics["bookings"] = [MetricValue(value=booking_data, timestamp=end_date)]
            
            # Get payment analytics
            payment_data = await self.get_payment_analytics(time_frame)
            metrics["payments"] = [MetricValue(value=payment_data, timestamp=end_date)]
            
            # Get AI usage analytics
            ai_data = await self.get_ai_usage_analytics(time_frame)
            metrics["ai_usage"] = [MetricValue(value=ai_data, timestamp=end_date)]
            
            # Get user engagement analytics
            engagement_data = await self.get_user_engagement_analytics(time_frame)
            metrics["user_engagement"] = [MetricValue(value=engagement_data, timestamp=end_date)]
            
            # Generate summary
            summary = {
                "total_bookings": kpis.total_bookings,
                "total_revenue": float(kpis.total_revenue),
                "conversion_rate": kpis.conversion_rate,
                "ai_satisfaction": kpis.ai_satisfaction_score,
                "system_performance": {
                    "uptime": kpis.system_uptime,
                    "avg_response_time": kpis.response_time
                },
                "business_model": business_model.value if business_model else "all",
                "report_generated_at": end_date.isoformat()
            }
            
            return AnalyticsReport(
                report_id=report_id,
                report_type=report_type,
                time_frame=time_frame,
                start_date=start_date,
                end_date=end_date,
                metrics=metrics,
                summary=summary,
                generated_at=end_date
            )
            
        except Exception as e:
            logger.error(f"Error generating comprehensive report: {str(e)}")
            raise Exception(f"Failed to generate report: {str(e)}")
    
    def _get_start_date(self, end_date: datetime, time_frame: TimeFrame) -> datetime:
        """Calculate start date based on time frame"""
        if time_frame == TimeFrame.HOUR:
            return end_date - timedelta(hours=1)
        elif time_frame == TimeFrame.DAY:
            return end_date - timedelta(days=1)
        elif time_frame == TimeFrame.WEEK:
            return end_date - timedelta(weeks=1)
        elif time_frame == TimeFrame.MONTH:
            return end_date - timedelta(days=30)
        elif time_frame == TimeFrame.QUARTER:
            return end_date - timedelta(days=90)
        elif time_frame == TimeFrame.YEAR:
            return end_date - timedelta(days=365)
        else:
            return end_date - timedelta(days=1)
    
    async def _calculate_retention_rate(self, start_date: datetime, end_date: datetime) -> float:
        """Calculate user retention rate"""
        try:
            async with get_db_session() as db:
                # Users from previous period
                prev_start = start_date - (end_date - start_date)
                prev_users_query = await db.execute(
                    text("""
                        SELECT COUNT(DISTINCT user_id) as prev_users
                        FROM booking_requests 
                        WHERE created_at BETWEEN :prev_start AND :start_date
                    """),
                    {"prev_start": prev_start, "start_date": start_date}
                )
                prev_users = prev_users_query.fetchone().prev_users or 1
                
                # Returning users in current period
                returning_users_query = await db.execute(
                    text("""
                        SELECT COUNT(DISTINCT br1.user_id) as returning_users
                        FROM booking_requests br1
                        WHERE br1.created_at BETWEEN :start_date AND :end_date
                        AND br1.user_id IN (
                            SELECT DISTINCT user_id 
                            FROM booking_requests 
                            WHERE created_at BETWEEN :prev_start AND :start_date
                        )
                    """),
                    {
                        "start_date": start_date,
                        "end_date": end_date,
                        "prev_start": prev_start
                    }
                )
                returning_users = returning_users_query.fetchone().returning_users or 0
                
                return (returning_users / max(prev_users, 1)) * 100
                
        except Exception as e:
            logger.error(f"Error calculating retention rate: {str(e)}")
            return 0.0

# Global analytics service instance
analytics_service = AnalyticsService()

async def get_analytics_service() -> AnalyticsService:
    """Dependency injection for analytics service"""
    return analytics_service