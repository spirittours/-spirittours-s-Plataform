"""
Analytics Service

Service for calculating and retrieving analytics metrics.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case
from decimal import Decimal

from backend.models.analytics_models import (
    DashboardMetric, RevenueAnalytics, BookingAnalytics,
    CustomerAnalytics, TourPerformance, DashboardSnapshot,
    MetricType, TimeGranularity
)


logger = logging.getLogger(__name__)


class AnalyticsService:
    """
    Analytics service for calculating and retrieving metrics.
    
    Features:
    - Revenue analytics
    - Booking analytics
    - Customer analytics
    - Tour performance metrics
    - Dashboard snapshots
    - Real-time metrics
    """
    
    def __init__(self):
        pass
    
    async def get_dashboard_overview(
        self,
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Get dashboard overview with key metrics.
        
        Args:
            db: Database session
            start_date: Start date for metrics
            end_date: End date for metrics
            
        Returns:
            Dictionary with dashboard metrics
        """
        try:
            # Default to last 30 days
            if not end_date:
                end_date = date.today()
            if not start_date:
                start_date = end_date - timedelta(days=30)
            
            # Get revenue analytics
            revenue = await self.get_revenue_metrics(db, start_date, end_date)
            
            # Get booking analytics
            bookings = await self.get_booking_metrics(db, start_date, end_date)
            
            # Get customer analytics
            customers = await self.get_customer_metrics(db, start_date, end_date)
            
            # Get performance metrics
            performance = await self.get_performance_metrics(db, start_date, end_date)
            
            return {
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'days': (end_date - start_date).days
                },
                'revenue': revenue,
                'bookings': bookings,
                'customers': customers,
                'performance': performance
            }
            
        except Exception as e:
            logger.error(f"Failed to get dashboard overview: {str(e)}")
            raise
    
    async def get_revenue_metrics(
        self,
        db: Session,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Get revenue metrics for period"""
        try:
            # Query revenue analytics
            revenue_data = db.query(
                func.sum(RevenueAnalytics.total_revenue).label('total_revenue'),
                func.sum(RevenueAnalytics.booking_revenue).label('booking_revenue'),
                func.sum(RevenueAnalytics.addon_revenue).label('addon_revenue'),
                func.sum(RevenueAnalytics.total_transactions).label('transactions'),
                func.sum(RevenueAnalytics.total_refunds).label('refunds'),
                func.avg(RevenueAnalytics.average_transaction_value).label('avg_transaction')
            ).filter(
                RevenueAnalytics.date >= start_date,
                RevenueAnalytics.date <= end_date
            ).first()
            
            # Get previous period for comparison
            period_days = (end_date - start_date).days
            prev_start = start_date - timedelta(days=period_days)
            prev_end = start_date - timedelta(days=1)
            
            prev_revenue = db.query(
                func.sum(RevenueAnalytics.total_revenue).label('total_revenue')
            ).filter(
                RevenueAnalytics.date >= prev_start,
                RevenueAnalytics.date <= prev_end
            ).first()
            
            # Calculate growth
            total_revenue = float(revenue_data.total_revenue or 0)
            prev_total = float(prev_revenue.total_revenue or 0) if prev_revenue else 0
            
            growth = 0
            if prev_total > 0:
                growth = ((total_revenue - prev_total) / prev_total) * 100
            
            return {
                'total_revenue': round(total_revenue, 2),
                'booking_revenue': round(float(revenue_data.booking_revenue or 0), 2),
                'addon_revenue': round(float(revenue_data.addon_revenue or 0), 2),
                'transactions': int(revenue_data.transactions or 0),
                'refunds': round(float(revenue_data.refunds or 0), 2),
                'average_transaction': round(float(revenue_data.avg_transaction or 0), 2),
                'growth_percentage': round(growth, 2),
                'previous_period_revenue': round(prev_total, 2)
            }
            
        except Exception as e:
            logger.error(f"Failed to get revenue metrics: {str(e)}")
            return {}
    
    async def get_booking_metrics(
        self,
        db: Session,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Get booking metrics for period"""
        try:
            # Query booking analytics
            booking_data = db.query(
                func.sum(BookingAnalytics.total_bookings).label('total'),
                func.sum(BookingAnalytics.confirmed_bookings).label('confirmed'),
                func.sum(BookingAnalytics.cancelled_bookings).label('cancelled'),
                func.sum(BookingAnalytics.total_guests).label('guests'),
                func.avg(BookingAnalytics.conversion_rate).label('conversion'),
                func.avg(BookingAnalytics.cancellation_rate).label('cancellation')
            ).filter(
                BookingAnalytics.date >= start_date,
                BookingAnalytics.date <= end_date
            ).first()
            
            # Get previous period
            period_days = (end_date - start_date).days
            prev_start = start_date - timedelta(days=period_days)
            prev_end = start_date - timedelta(days=1)
            
            prev_bookings = db.query(
                func.sum(BookingAnalytics.total_bookings).label('total')
            ).filter(
                BookingAnalytics.date >= prev_start,
                BookingAnalytics.date <= prev_end
            ).first()
            
            # Calculate growth
            total_bookings = int(booking_data.total or 0)
            prev_total = int(prev_bookings.total or 0) if prev_bookings else 0
            
            growth = 0
            if prev_total > 0:
                growth = ((total_bookings - prev_total) / prev_total) * 100
            
            return {
                'total_bookings': total_bookings,
                'confirmed_bookings': int(booking_data.confirmed or 0),
                'cancelled_bookings': int(booking_data.cancelled or 0),
                'total_guests': int(booking_data.guests or 0),
                'conversion_rate': round(float(booking_data.conversion or 0), 2),
                'cancellation_rate': round(float(booking_data.cancellation or 0), 2),
                'growth_percentage': round(growth, 2),
                'previous_period_bookings': prev_total
            }
            
        except Exception as e:
            logger.error(f"Failed to get booking metrics: {str(e)}")
            return {}
    
    async def get_customer_metrics(
        self,
        db: Session,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Get customer metrics for period"""
        try:
            # Query customer analytics
            customer_data = db.query(
                func.sum(CustomerAnalytics.new_customers).label('new'),
                func.sum(CustomerAnalytics.returning_customers).label('returning'),
                func.sum(CustomerAnalytics.active_customers).label('active'),
                func.avg(CustomerAnalytics.average_customer_lifetime_value).label('ltv'),
                func.avg(CustomerAnalytics.retention_rate).label('retention'),
                func.avg(CustomerAnalytics.churn_rate).label('churn')
            ).filter(
                CustomerAnalytics.date >= start_date,
                CustomerAnalytics.date <= end_date
            ).first()
            
            return {
                'new_customers': int(customer_data.new or 0),
                'returning_customers': int(customer_data.returning or 0),
                'active_customers': int(customer_data.active or 0),
                'lifetime_value': round(float(customer_data.ltv or 0), 2),
                'retention_rate': round(float(customer_data.retention or 0), 2),
                'churn_rate': round(float(customer_data.churn or 0), 2)
            }
            
        except Exception as e:
            logger.error(f"Failed to get customer metrics: {str(e)}")
            return {}
    
    async def get_performance_metrics(
        self,
        db: Session,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """Get performance metrics for period"""
        try:
            # Query tour performance
            performance_data = db.query(
                func.avg(TourPerformance.occupancy_rate).label('occupancy'),
                func.avg(TourPerformance.conversion_rate).label('conversion'),
                func.avg(TourPerformance.average_rating).label('rating'),
                func.sum(TourPerformance.views).label('views'),
                func.avg(TourPerformance.capacity_utilization).label('capacity')
            ).filter(
                TourPerformance.date >= start_date,
                TourPerformance.date <= end_date
            ).first()
            
            return {
                'occupancy_rate': round(float(performance_data.occupancy or 0), 2),
                'conversion_rate': round(float(performance_data.conversion or 0), 2),
                'average_rating': round(float(performance_data.rating or 0), 2),
                'total_views': int(performance_data.views or 0),
                'capacity_utilization': round(float(performance_data.capacity or 0), 2)
            }
            
        except Exception as e:
            logger.error(f"Failed to get performance metrics: {str(e)}")
            return {}
    
    async def get_revenue_chart_data(
        self,
        db: Session,
        start_date: date,
        end_date: date,
        granularity: str = 'daily'
    ) -> List[Dict[str, Any]]:
        """Get revenue data for charts"""
        try:
            revenue_data = db.query(
                RevenueAnalytics.date,
                RevenueAnalytics.total_revenue,
                RevenueAnalytics.booking_revenue,
                RevenueAnalytics.addon_revenue
            ).filter(
                RevenueAnalytics.date >= start_date,
                RevenueAnalytics.date <= end_date
            ).order_by(RevenueAnalytics.date).all()
            
            return [
                {
                    'date': row.date.isoformat(),
                    'total_revenue': float(row.total_revenue),
                    'booking_revenue': float(row.booking_revenue or 0),
                    'addon_revenue': float(row.addon_revenue or 0)
                }
                for row in revenue_data
            ]
            
        except Exception as e:
            logger.error(f"Failed to get revenue chart data: {str(e)}")
            return []
    
    async def get_booking_chart_data(
        self,
        db: Session,
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        """Get booking data for charts"""
        try:
            booking_data = db.query(
                BookingAnalytics.date,
                BookingAnalytics.total_bookings,
                BookingAnalytics.confirmed_bookings,
                BookingAnalytics.cancelled_bookings
            ).filter(
                BookingAnalytics.date >= start_date,
                BookingAnalytics.date <= end_date
            ).order_by(BookingAnalytics.date).all()
            
            return [
                {
                    'date': row.date.isoformat(),
                    'total': row.total_bookings,
                    'confirmed': row.confirmed_bookings,
                    'cancelled': row.cancelled_bookings
                }
                for row in booking_data
            ]
            
        except Exception as e:
            logger.error(f"Failed to get booking chart data: {str(e)}")
            return []
    
    async def get_top_tours(
        self,
        db: Session,
        start_date: date,
        end_date: date,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get top performing tours"""
        try:
            top_tours = db.query(
                TourPerformance.tour_id,
                func.sum(TourPerformance.bookings).label('total_bookings'),
                func.sum(TourPerformance.revenue).label('total_revenue'),
                func.avg(TourPerformance.average_rating).label('avg_rating')
            ).filter(
                TourPerformance.date >= start_date,
                TourPerformance.date <= end_date
            ).group_by(
                TourPerformance.tour_id
            ).order_by(
                func.sum(TourPerformance.revenue).desc()
            ).limit(limit).all()
            
            return [
                {
                    'tour_id': row.tour_id,
                    'bookings': row.total_bookings,
                    'revenue': float(row.total_revenue),
                    'rating': round(float(row.avg_rating or 0), 2)
                }
                for row in top_tours
            ]
            
        except Exception as e:
            logger.error(f"Failed to get top tours: {str(e)}")
            return []
    
    async def create_dashboard_snapshot(
        self,
        db: Session,
        snapshot_date: date
    ) -> Dict[str, Any]:
        """Create a dashboard snapshot for quick access"""
        try:
            # Calculate snapshot data
            overview = await self.get_dashboard_overview(
                db,
                snapshot_date - timedelta(days=30),
                snapshot_date
            )
            
            # Create snapshot
            snapshot = DashboardSnapshot(
                snapshot_id=f"snapshot_{snapshot_date.isoformat()}",
                snapshot_date=snapshot_date,
                total_revenue=Decimal(str(overview['revenue'].get('total_revenue', 0))),
                total_bookings=overview['bookings'].get('total_bookings', 0),
                total_customers=overview['customers'].get('active_customers', 0),
                revenue_growth=overview['revenue'].get('growth_percentage', 0),
                booking_growth=overview['bookings'].get('growth_percentage', 0),
                average_rating=overview['performance'].get('average_rating', 0),
                conversion_rate=overview['performance'].get('conversion_rate', 0),
                snapshot_data=overview
            )
            
            db.add(snapshot)
            db.commit()
            
            logger.info(f"Dashboard snapshot created for {snapshot_date}")
            
            return {
                'success': True,
                'snapshot_id': snapshot.snapshot_id,
                'snapshot_date': snapshot_date.isoformat()
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to create dashboard snapshot: {str(e)}")
            return {'success': False, 'error': str(e)}


# Global analytics service instance
analytics_service = AnalyticsService()
