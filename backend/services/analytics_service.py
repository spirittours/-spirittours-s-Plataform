"""
Analytics Service - Real-time Business Intelligence
Provides comprehensive analytics and KPIs for B2C/B2B/B2B2C models
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy import select, func, and_, or_, case
from sqlalchemy.orm import Session
import pandas as pd
import numpy as np
from decimal import Decimal
import json
from collections import defaultdict

from backend.models.database import (
    User, Booking, BusinessBooking, PaymentTransaction,
    TourOperator, TravelAgency, SalesAgent, Tour,
    NotificationLog, AIQueryLog, PaymentRefund
)


class AnalyticsService:
    """
    Comprehensive analytics service for business intelligence
    """
    
    def __init__(self, db: Session):
        self.db = db
        
    async def get_dashboard_metrics(self, 
                                   start_date: Optional[datetime] = None,
                                   end_date: Optional[datetime] = None,
                                   business_model: Optional[str] = None) -> Dict:
        """
        Get comprehensive dashboard metrics
        """
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)
            
        metrics = {
            "overview": await self._get_overview_metrics(start_date, end_date),
            "revenue": await self._get_revenue_metrics(start_date, end_date, business_model),
            "bookings": await self._get_booking_metrics(start_date, end_date, business_model),
            "customers": await self._get_customer_metrics(start_date, end_date),
            "ai_usage": await self._get_ai_usage_metrics(start_date, end_date),
            "operational": await self._get_operational_metrics(start_date, end_date),
            "trends": await self._get_trend_analysis(start_date, end_date)
        }
        
        return metrics
    
    async def _get_overview_metrics(self, start_date: datetime, end_date: datetime) -> Dict:
        """
        Get high-level overview metrics
        """
        # Total revenue
        revenue_query = self.db.query(
            func.sum(PaymentTransaction.amount).label('total_revenue'),
            func.count(PaymentTransaction.id).label('total_transactions')
        ).filter(
            and_(
                PaymentTransaction.created_at >= start_date,
                PaymentTransaction.created_at <= end_date,
                PaymentTransaction.status == 'completed'
            )
        ).first()
        
        # Active users
        active_users = self.db.query(func.count(func.distinct(Booking.user_id))).filter(
            and_(
                Booking.created_at >= start_date,
                Booking.created_at <= end_date
            )
        ).scalar() or 0
        
        # Total bookings
        total_bookings = self.db.query(func.count(Booking.id)).filter(
            and_(
                Booking.created_at >= start_date,
                Booking.created_at <= end_date
            )
        ).scalar() or 0
        
        # Conversion rate
        total_visitors = self.db.query(func.count(func.distinct(AIQueryLog.user_id))).filter(
            and_(
                AIQueryLog.created_at >= start_date,
                AIQueryLog.created_at <= end_date
            )
        ).scalar() or 1
        
        conversion_rate = (active_users / total_visitors) * 100 if total_visitors > 0 else 0
        
        return {
            "total_revenue": float(revenue_query.total_revenue or 0),
            "total_transactions": revenue_query.total_transactions or 0,
            "active_users": active_users,
            "total_bookings": total_bookings,
            "conversion_rate": round(conversion_rate, 2),
            "average_order_value": float(revenue_query.total_revenue or 0) / max(total_bookings, 1)
        }
    
    async def _get_revenue_metrics(self, start_date: datetime, end_date: datetime, 
                                  business_model: Optional[str] = None) -> Dict:
        """
        Get detailed revenue metrics by business model
        """
        # Revenue by model
        revenue_by_model = {}
        
        # B2C Revenue
        b2c_revenue = self.db.query(func.sum(PaymentTransaction.amount)).join(
            Booking, PaymentTransaction.booking_id == Booking.id
        ).filter(
            and_(
                PaymentTransaction.created_at >= start_date,
                PaymentTransaction.created_at <= end_date,
                PaymentTransaction.status == 'completed',
                Booking.booking_type == 'b2c'
            )
        ).scalar() or 0
        
        # B2B Revenue  
        b2b_revenue = self.db.query(func.sum(PaymentTransaction.amount)).join(
            BusinessBooking, PaymentTransaction.business_booking_id == BusinessBooking.id
        ).filter(
            and_(
                PaymentTransaction.created_at >= start_date,
                PaymentTransaction.created_at <= end_date,
                PaymentTransaction.status == 'completed'
            )
        ).scalar() or 0
        
        # Revenue growth
        prev_period_start = start_date - (end_date - start_date)
        prev_revenue = self.db.query(func.sum(PaymentTransaction.amount)).filter(
            and_(
                PaymentTransaction.created_at >= prev_period_start,
                PaymentTransaction.created_at < start_date,
                PaymentTransaction.status == 'completed'
            )
        ).scalar() or 0
        
        current_revenue = float(b2c_revenue) + float(b2b_revenue)
        growth_rate = ((current_revenue - float(prev_revenue)) / max(float(prev_revenue), 1)) * 100
        
        # Revenue by currency
        revenue_by_currency = self.db.query(
            PaymentTransaction.currency,
            func.sum(PaymentTransaction.amount).label('total')
        ).filter(
            and_(
                PaymentTransaction.created_at >= start_date,
                PaymentTransaction.created_at <= end_date,
                PaymentTransaction.status == 'completed'
            )
        ).group_by(PaymentTransaction.currency).all()
        
        # Refund metrics
        total_refunds = self.db.query(func.sum(PaymentRefund.amount)).filter(
            and_(
                PaymentRefund.created_at >= start_date,
                PaymentRefund.created_at <= end_date,
                PaymentRefund.status == 'completed'
            )
        ).scalar() or 0
        
        return {
            "total_revenue": current_revenue,
            "b2c_revenue": float(b2c_revenue),
            "b2b_revenue": float(b2b_revenue),
            "revenue_growth_rate": round(growth_rate, 2),
            "revenue_by_currency": {
                curr: float(total) for curr, total in revenue_by_currency
            },
            "total_refunds": float(total_refunds),
            "net_revenue": current_revenue - float(total_refunds)
        }
    
    async def _get_booking_metrics(self, start_date: datetime, end_date: datetime,
                                  business_model: Optional[str] = None) -> Dict:
        """
        Get detailed booking metrics
        """
        # Bookings by status
        booking_status = self.db.query(
            Booking.status,
            func.count(Booking.id).label('count')
        ).filter(
            and_(
                Booking.created_at >= start_date,
                Booking.created_at <= end_date
            )
        ).group_by(Booking.status).all()
        
        # Bookings by type
        b2c_bookings = self.db.query(func.count(Booking.id)).filter(
            and_(
                Booking.created_at >= start_date,
                Booking.created_at <= end_date,
                Booking.booking_type == 'b2c'
            )
        ).scalar() or 0
        
        b2b_bookings = self.db.query(func.count(BusinessBooking.id)).filter(
            and_(
                BusinessBooking.created_at >= start_date,
                BusinessBooking.created_at <= end_date
            )
        ).scalar() or 0
        
        # Popular tours
        popular_tours = self.db.query(
            Tour.name,
            Tour.id,
            func.count(Booking.id).label('bookings')
        ).join(
            Booking, Booking.tour_id == Tour.id
        ).filter(
            and_(
                Booking.created_at >= start_date,
                Booking.created_at <= end_date
            )
        ).group_by(Tour.id, Tour.name).order_by(
            func.count(Booking.id).desc()
        ).limit(10).all()
        
        # Cancellation rate
        total_bookings = b2c_bookings + b2b_bookings
        cancelled_bookings = self.db.query(func.count(Booking.id)).filter(
            and_(
                Booking.created_at >= start_date,
                Booking.created_at <= end_date,
                Booking.status == 'cancelled'
            )
        ).scalar() or 0
        
        cancellation_rate = (cancelled_bookings / max(total_bookings, 1)) * 100
        
        return {
            "total_bookings": total_bookings,
            "b2c_bookings": b2c_bookings,
            "b2b_bookings": b2b_bookings,
            "booking_by_status": {
                status: count for status, count in booking_status
            },
            "popular_tours": [
                {"name": name, "id": tour_id, "bookings": bookings}
                for name, tour_id, bookings in popular_tours
            ],
            "cancellation_rate": round(cancellation_rate, 2)
        }
    
    async def _get_customer_metrics(self, start_date: datetime, end_date: datetime) -> Dict:
        """
        Get customer analytics
        """
        # New customers
        new_customers = self.db.query(func.count(User.id)).filter(
            and_(
                User.created_at >= start_date,
                User.created_at <= end_date
            )
        ).scalar() or 0
        
        # Repeat customers
        repeat_customers = self.db.query(func.count(func.distinct(Booking.user_id))).filter(
            Booking.user_id.in_(
                self.db.query(Booking.user_id).group_by(
                    Booking.user_id
                ).having(func.count(Booking.id) > 1).subquery()
            )
        ).scalar() or 0
        
        # Customer lifetime value
        clv = self.db.query(
            func.avg(
                self.db.query(func.sum(PaymentTransaction.amount)).filter(
                    PaymentTransaction.user_id == User.id
                ).scalar_subquery()
            )
        ).scalar() or 0
        
        # Customer segments
        segments = {
            "b2c": self.db.query(func.count(User.id)).filter(
                User.user_type == 'customer'
            ).scalar() or 0,
            "b2b": self.db.query(func.count(User.id)).filter(
                User.user_type.in_(['operator', 'agency', 'agent'])
            ).scalar() or 0
        }
        
        return {
            "new_customers": new_customers,
            "repeat_customers": repeat_customers,
            "customer_lifetime_value": float(clv),
            "customer_segments": segments,
            "retention_rate": round((repeat_customers / max(new_customers, 1)) * 100, 2)
        }
    
    async def _get_ai_usage_metrics(self, start_date: datetime, end_date: datetime) -> Dict:
        """
        Get AI agent usage analytics
        """
        # Total queries
        total_queries = self.db.query(func.count(AIQueryLog.id)).filter(
            and_(
                AIQueryLog.created_at >= start_date,
                AIQueryLog.created_at <= end_date
            )
        ).scalar() or 0
        
        # Queries by agent
        queries_by_agent = self.db.query(
            AIQueryLog.agent_name,
            func.count(AIQueryLog.id).label('count'),
            func.avg(AIQueryLog.response_time).label('avg_time')
        ).filter(
            and_(
                AIQueryLog.created_at >= start_date,
                AIQueryLog.created_at <= end_date
            )
        ).group_by(AIQueryLog.agent_name).all()
        
        # Success rate
        successful_queries = self.db.query(func.count(AIQueryLog.id)).filter(
            and_(
                AIQueryLog.created_at >= start_date,
                AIQueryLog.created_at <= end_date,
                AIQueryLog.status == 'success'
            )
        ).scalar() or 0
        
        success_rate = (successful_queries / max(total_queries, 1)) * 100
        
        return {
            "total_queries": total_queries,
            "success_rate": round(success_rate, 2),
            "queries_by_agent": [
                {
                    "agent": agent,
                    "queries": count,
                    "avg_response_time": float(avg_time or 0)
                }
                for agent, count, avg_time in queries_by_agent
            ],
            "average_response_time": self.db.query(
                func.avg(AIQueryLog.response_time)
            ).filter(
                and_(
                    AIQueryLog.created_at >= start_date,
                    AIQueryLog.created_at <= end_date
                )
            ).scalar() or 0
        }
    
    async def _get_operational_metrics(self, start_date: datetime, end_date: datetime) -> Dict:
        """
        Get operational efficiency metrics
        """
        # Notification metrics
        notifications_sent = self.db.query(func.count(NotificationLog.id)).filter(
            and_(
                NotificationLog.created_at >= start_date,
                NotificationLog.created_at <= end_date
            )
        ).scalar() or 0
        
        notification_delivery_rate = self.db.query(
            func.count(NotificationLog.id)
        ).filter(
            and_(
                NotificationLog.created_at >= start_date,
                NotificationLog.created_at <= end_date,
                NotificationLog.status == 'delivered'
            )
        ).scalar() or 0
        
        # Payment processing metrics
        payment_success_rate = self.db.query(
            case(
                [(PaymentTransaction.status == 'completed', 1)],
                else_=0
            ).label('success')
        ).filter(
            and_(
                PaymentTransaction.created_at >= start_date,
                PaymentTransaction.created_at <= end_date
            )
        ).all()
        
        # System performance
        api_response_time = self.db.query(
            func.avg(AIQueryLog.response_time)
        ).filter(
            and_(
                AIQueryLog.created_at >= start_date,
                AIQueryLog.created_at <= end_date
            )
        ).scalar() or 0
        
        return {
            "notifications_sent": notifications_sent,
            "notification_delivery_rate": round(
                (notification_delivery_rate / max(notifications_sent, 1)) * 100, 2
            ),
            "payment_success_rate": round(
                sum([p.success for p in payment_success_rate]) / max(len(payment_success_rate), 1) * 100, 2
            ),
            "average_api_response_time": float(api_response_time),
            "system_uptime": 99.9  # Placeholder - would connect to monitoring
        }
    
    async def _get_trend_analysis(self, start_date: datetime, end_date: datetime) -> Dict:
        """
        Get trend analysis and predictions
        """
        # Daily revenue trend
        daily_revenue = self.db.query(
            func.date(PaymentTransaction.created_at).label('date'),
            func.sum(PaymentTransaction.amount).label('revenue')
        ).filter(
            and_(
                PaymentTransaction.created_at >= start_date,
                PaymentTransaction.created_at <= end_date,
                PaymentTransaction.status == 'completed'
            )
        ).group_by(func.date(PaymentTransaction.created_at)).all()
        
        # Daily bookings trend
        daily_bookings = self.db.query(
            func.date(Booking.created_at).label('date'),
            func.count(Booking.id).label('bookings')
        ).filter(
            and_(
                Booking.created_at >= start_date,
                Booking.created_at <= end_date
            )
        ).group_by(func.date(Booking.created_at)).all()
        
        # Convert to pandas for trend analysis
        if daily_revenue:
            df_revenue = pd.DataFrame(daily_revenue)
            df_revenue['date'] = pd.to_datetime(df_revenue['date'])
            df_revenue = df_revenue.set_index('date')
            
            # Calculate moving average
            df_revenue['ma7'] = df_revenue['revenue'].rolling(window=7).mean()
            revenue_trend = df_revenue.to_dict('records')
        else:
            revenue_trend = []
        
        if daily_bookings:
            df_bookings = pd.DataFrame(daily_bookings)
            df_bookings['date'] = pd.to_datetime(df_bookings['date'])
            df_bookings = df_bookings.set_index('date')
            
            # Calculate moving average
            df_bookings['ma7'] = df_bookings['bookings'].rolling(window=7).mean()
            bookings_trend = df_bookings.to_dict('records')
        else:
            bookings_trend = []
        
        return {
            "revenue_trend": revenue_trend,
            "bookings_trend": bookings_trend,
            "growth_forecast": self._calculate_growth_forecast(revenue_trend),
            "seasonality_index": self._calculate_seasonality(daily_bookings)
        }
    
    def _calculate_growth_forecast(self, revenue_trend: List) -> Dict:
        """
        Simple growth forecast based on trend
        """
        if len(revenue_trend) < 7:
            return {"next_30_days": 0, "confidence": "low"}
        
        # Simple linear regression forecast
        recent_trend = revenue_trend[-7:]
        avg_daily = sum([r.get('revenue', 0) for r in recent_trend]) / 7
        
        return {
            "next_30_days": avg_daily * 30,
            "confidence": "medium",
            "trend": "increasing" if recent_trend[-1].get('revenue', 0) > recent_trend[0].get('revenue', 0) else "decreasing"
        }
    
    def _calculate_seasonality(self, daily_bookings: List) -> Dict:
        """
        Calculate seasonality patterns
        """
        if not daily_bookings:
            return {}
        
        # Group by day of week
        day_patterns = defaultdict(list)
        for date, bookings in daily_bookings:
            day_of_week = date.strftime('%A')
            day_patterns[day_of_week].append(bookings)
        
        seasonality = {}
        for day, values in day_patterns.items():
            seasonality[day] = {
                "average": sum(values) / len(values) if values else 0,
                "peak": max(values) if values else 0,
                "low": min(values) if values else 0
            }
        
        return seasonality
    
    async def get_realtime_metrics(self) -> Dict:
        """
        Get real-time metrics for live dashboard
        """
        now = datetime.utcnow()
        today_start = datetime(now.year, now.month, now.day)
        
        # Today's metrics
        todays_revenue = self.db.query(
            func.sum(PaymentTransaction.amount)
        ).filter(
            and_(
                PaymentTransaction.created_at >= today_start,
                PaymentTransaction.status == 'completed'
            )
        ).scalar() or 0
        
        todays_bookings = self.db.query(func.count(Booking.id)).filter(
            Booking.created_at >= today_start
        ).scalar() or 0
        
        # Active users right now (last 5 minutes)
        active_now = self.db.query(
            func.count(func.distinct(AIQueryLog.user_id))
        ).filter(
            AIQueryLog.created_at >= now - timedelta(minutes=5)
        ).scalar() or 0
        
        # Current processing
        pending_payments = self.db.query(func.count(PaymentTransaction.id)).filter(
            PaymentTransaction.status == 'pending'
        ).scalar() or 0
        
        pending_bookings = self.db.query(func.count(Booking.id)).filter(
            Booking.status == 'pending'
        ).scalar() or 0
        
        return {
            "timestamp": now.isoformat(),
            "todays_revenue": float(todays_revenue),
            "todays_bookings": todays_bookings,
            "active_users_now": active_now,
            "pending_payments": pending_payments,
            "pending_bookings": pending_bookings
        }
    
    async def get_custom_report(self, 
                               report_type: str,
                               filters: Dict,
                               group_by: Optional[str] = None) -> Dict:
        """
        Generate custom reports based on requirements
        """
        if report_type == "revenue_by_operator":
            return await self._revenue_by_operator_report(filters)
        elif report_type == "agent_performance":
            return await self._agent_performance_report(filters)
        elif report_type == "tour_profitability":
            return await self._tour_profitability_report(filters)
        elif report_type == "customer_acquisition":
            return await self._customer_acquisition_report(filters)
        else:
            raise ValueError(f"Unknown report type: {report_type}")
    
    async def _revenue_by_operator_report(self, filters: Dict) -> Dict:
        """
        Revenue breakdown by tour operator
        """
        start_date = filters.get('start_date', datetime.utcnow() - timedelta(days=30))
        end_date = filters.get('end_date', datetime.utcnow())
        
        operator_revenue = self.db.query(
            TourOperator.name,
            func.sum(PaymentTransaction.amount).label('revenue'),
            func.count(BusinessBooking.id).label('bookings')
        ).join(
            BusinessBooking, BusinessBooking.operator_id == TourOperator.id
        ).join(
            PaymentTransaction, PaymentTransaction.business_booking_id == BusinessBooking.id
        ).filter(
            and_(
                PaymentTransaction.created_at >= start_date,
                PaymentTransaction.created_at <= end_date,
                PaymentTransaction.status == 'completed'
            )
        ).group_by(TourOperator.name).all()
        
        return {
            "operators": [
                {
                    "name": name,
                    "revenue": float(revenue or 0),
                    "bookings": bookings
                }
                for name, revenue, bookings in operator_revenue
            ],
            "total_revenue": sum([float(r[1] or 0) for r in operator_revenue])
        }
    
    async def _agent_performance_report(self, filters: Dict) -> Dict:
        """
        Sales agent performance metrics
        """
        start_date = filters.get('start_date', datetime.utcnow() - timedelta(days=30))
        end_date = filters.get('end_date', datetime.utcnow())
        
        agent_performance = self.db.query(
            SalesAgent.name,
            func.count(BusinessBooking.id).label('bookings'),
            func.sum(PaymentTransaction.amount).label('revenue')
        ).join(
            BusinessBooking, BusinessBooking.agent_id == SalesAgent.id
        ).join(
            PaymentTransaction, PaymentTransaction.business_booking_id == BusinessBooking.id
        ).filter(
            and_(
                BusinessBooking.created_at >= start_date,
                BusinessBooking.created_at <= end_date
            )
        ).group_by(SalesAgent.name).all()
        
        return {
            "agents": [
                {
                    "name": name,
                    "bookings": bookings,
                    "revenue": float(revenue or 0),
                    "average_sale": float(revenue or 0) / max(bookings, 1)
                }
                for name, bookings, revenue in agent_performance
            ]
        }
    
    async def _tour_profitability_report(self, filters: Dict) -> Dict:
        """
        Tour profitability analysis
        """
        start_date = filters.get('start_date', datetime.utcnow() - timedelta(days=30))
        end_date = filters.get('end_date', datetime.utcnow())
        
        tour_metrics = self.db.query(
            Tour.name,
            Tour.price,
            func.count(Booking.id).label('bookings'),
            func.sum(PaymentTransaction.amount).label('revenue')
        ).join(
            Booking, Booking.tour_id == Tour.id
        ).join(
            PaymentTransaction, PaymentTransaction.booking_id == Booking.id
        ).filter(
            and_(
                Booking.created_at >= start_date,
                Booking.created_at <= end_date
            )
        ).group_by(Tour.id, Tour.name, Tour.price).all()
        
        return {
            "tours": [
                {
                    "name": name,
                    "base_price": float(price),
                    "bookings": bookings,
                    "revenue": float(revenue or 0),
                    "profit_margin": ((float(revenue or 0) - (float(price) * bookings * 0.7)) / 
                                    max(float(revenue or 0), 1)) * 100
                }
                for name, price, bookings, revenue in tour_metrics
            ]
        }
    
    async def _customer_acquisition_report(self, filters: Dict) -> Dict:
        """
        Customer acquisition funnel analysis
        """
        start_date = filters.get('start_date', datetime.utcnow() - timedelta(days=30))
        end_date = filters.get('end_date', datetime.utcnow())
        
        # Funnel stages
        visitors = self.db.query(func.count(func.distinct(AIQueryLog.user_id))).filter(
            and_(
                AIQueryLog.created_at >= start_date,
                AIQueryLog.created_at <= end_date
            )
        ).scalar() or 0
        
        registered = self.db.query(func.count(User.id)).filter(
            and_(
                User.created_at >= start_date,
                User.created_at <= end_date
            )
        ).scalar() or 0
        
        first_booking = self.db.query(func.count(func.distinct(Booking.user_id))).filter(
            and_(
                Booking.created_at >= start_date,
                Booking.created_at <= end_date
            )
        ).scalar() or 0
        
        repeat_booking = self.db.query(func.count(func.distinct(Booking.user_id))).filter(
            Booking.user_id.in_(
                self.db.query(Booking.user_id).filter(
                    and_(
                        Booking.created_at >= start_date,
                        Booking.created_at <= end_date
                    )
                ).group_by(Booking.user_id).having(func.count(Booking.id) > 1).subquery()
            )
        ).scalar() or 0
        
        return {
            "funnel": {
                "visitors": visitors,
                "registered": registered,
                "first_booking": first_booking,
                "repeat_booking": repeat_booking
            },
            "conversion_rates": {
                "visitor_to_registration": round((registered / max(visitors, 1)) * 100, 2),
                "registration_to_booking": round((first_booking / max(registered, 1)) * 100, 2),
                "first_to_repeat": round((repeat_booking / max(first_booking, 1)) * 100, 2)
            }
        }