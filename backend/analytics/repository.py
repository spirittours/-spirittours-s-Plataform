"""
Analytics Repository - Data aggregation and metrics calculation
Handles all analytics queries and business intelligence
"""

from typing import Optional, List, Dict, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, extract
from datetime import datetime, timedelta
from decimal import Decimal

from database.models import (
    User as UserModel,
    Tour as TourModel,
    Booking as BookingModel,
    Review as ReviewModel,
    Payment as PaymentModel,
    EmailLog as EmailLogModel,
    AnalyticsEvent as AnalyticsEventModel
)


class AnalyticsRepository:
    """
    Repository for analytics data aggregation and metrics
    """
    
    # ==================== OVERVIEW METRICS ====================
    
    @staticmethod
    def get_overview_metrics(
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict:
        """
        Get high-level overview metrics
        
        Args:
            db: Database session
            start_date: Start date for filtering
            end_date: End date for filtering
            
        Returns:
            Dictionary with overview metrics
        """
        # Default to last 30 days if not specified
        if not end_date:
            end_date = datetime.utcnow()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Total users
        total_users = db.query(func.count(UserModel.id)).scalar()
        new_users = db.query(func.count(UserModel.id)).filter(
            UserModel.created_at >= start_date
        ).scalar()
        
        # Total bookings
        total_bookings = db.query(func.count(BookingModel.id)).scalar()
        bookings_in_period = db.query(func.count(BookingModel.id)).filter(
            BookingModel.created_at >= start_date
        ).scalar()
        
        # Revenue
        total_revenue = db.query(
            func.coalesce(func.sum(PaymentModel.amount), 0)
        ).filter(
            PaymentModel.status == "succeeded"
        ).scalar() or 0
        
        revenue_in_period = db.query(
            func.coalesce(func.sum(PaymentModel.amount), 0)
        ).filter(
            and_(
                PaymentModel.status == "succeeded",
                PaymentModel.created_at >= start_date
            )
        ).scalar() or 0
        
        # Reviews
        total_reviews = db.query(func.count(ReviewModel.id)).filter(
            ReviewModel.status == "approved"
        ).scalar()
        
        avg_rating = db.query(
            func.avg(ReviewModel.rating)
        ).filter(
            ReviewModel.status == "approved"
        ).scalar() or 0
        
        return {
            "users": {
                "total": total_users,
                "new": new_users
            },
            "bookings": {
                "total": total_bookings,
                "in_period": bookings_in_period
            },
            "revenue": {
                "total": float(total_revenue),
                "in_period": float(revenue_in_period),
                "currency": "USD"
            },
            "reviews": {
                "total": total_reviews,
                "average_rating": round(float(avg_rating), 2)
            },
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            }
        }
    
    
    # ==================== SALES ANALYTICS ====================
    
    @staticmethod
    def get_sales_by_period(
        db: Session,
        start_date: datetime,
        end_date: datetime,
        group_by: str = "day"  # day, week, month
    ) -> List[Dict]:
        """
        Get sales data grouped by time period
        
        Args:
            db: Database session
            start_date: Start date
            end_date: End date
            group_by: Grouping period (day, week, month)
            
        Returns:
            List of sales data points
        """
        if group_by == "day":
            date_col = func.date(PaymentModel.created_at)
        elif group_by == "week":
            date_col = func.date_trunc('week', PaymentModel.created_at)
        else:  # month
            date_col = func.date_trunc('month', PaymentModel.created_at)
        
        results = db.query(
            date_col.label('period'),
            func.count(PaymentModel.id).label('count'),
            func.sum(PaymentModel.amount).label('total')
        ).filter(
            and_(
                PaymentModel.status == "succeeded",
                PaymentModel.created_at >= start_date,
                PaymentModel.created_at <= end_date
            )
        ).group_by('period').order_by('period').all()
        
        return [
            {
                "period": str(r.period),
                "count": r.count,
                "total": float(r.total or 0)
            }
            for r in results
        ]
    
    
    @staticmethod
    def get_top_selling_tours(
        db: Session,
        limit: int = 10,
        start_date: Optional[datetime] = None
    ) -> List[Dict]:
        """
        Get top selling tours by booking count
        
        Args:
            db: Database session
            limit: Number of tours to return
            start_date: Optional start date filter
            
        Returns:
            List of top tours with stats
        """
        query = db.query(
            TourModel.id,
            TourModel.name,
            TourModel.price,
            func.count(BookingModel.id).label('booking_count'),
            func.sum(BookingModel.total_amount).label('revenue')
        ).join(
            BookingModel, TourModel.id == BookingModel.tour_id
        )
        
        if start_date:
            query = query.filter(BookingModel.created_at >= start_date)
        
        results = query.group_by(
            TourModel.id, TourModel.name, TourModel.price
        ).order_by(
            func.count(BookingModel.id).desc()
        ).limit(limit).all()
        
        return [
            {
                "tour_id": r.id,
                "tour_name": r.name,
                "price": float(r.price),
                "booking_count": r.booking_count,
                "revenue": float(r.revenue or 0)
            }
            for r in results
        ]
    
    
    # ==================== USER ANALYTICS ====================
    
    @staticmethod
    def get_user_growth(
        db: Session,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict]:
        """
        Get user growth over time
        
        Args:
            db: Database session
            start_date: Start date
            end_date: End date
            
        Returns:
            List of user growth data points
        """
        results = db.query(
            func.date(UserModel.created_at).label('date'),
            func.count(UserModel.id).label('count')
        ).filter(
            and_(
                UserModel.created_at >= start_date,
                UserModel.created_at <= end_date
            )
        ).group_by('date').order_by('date').all()
        
        # Calculate cumulative
        cumulative = 0
        data = []
        for r in results:
            cumulative += r.count
            data.append({
                "date": str(r.date),
                "new_users": r.count,
                "total_users": cumulative
            })
        
        return data
    
    
    @staticmethod
    def get_user_engagement(db: Session) -> Dict:
        """
        Get user engagement metrics
        
        Args:
            db: Database session
            
        Returns:
            Dictionary with engagement metrics
        """
        # Users with bookings
        users_with_bookings = db.query(
            func.count(func.distinct(BookingModel.user_id))
        ).scalar()
        
        # Users with reviews
        users_with_reviews = db.query(
            func.count(func.distinct(ReviewModel.user_id))
        ).scalar()
        
        # Total users
        total_users = db.query(func.count(UserModel.id)).scalar()
        
        # Average bookings per user
        avg_bookings = db.query(
            func.avg(
                db.query(func.count(BookingModel.id))
                .filter(BookingModel.user_id == UserModel.id)
                .correlate(UserModel)
                .as_scalar()
            )
        ).scalar() or 0
        
        return {
            "total_users": total_users,
            "users_with_bookings": users_with_bookings,
            "users_with_reviews": users_with_reviews,
            "engagement_rate": round((users_with_bookings / total_users * 100) if total_users > 0 else 0, 2),
            "avg_bookings_per_user": round(float(avg_bookings), 2)
        }
    
    
    # ==================== TOUR ANALYTICS ====================
    
    @staticmethod
    def get_tour_performance(db: Session, tour_id: str) -> Dict:
        """
        Get detailed performance metrics for a specific tour
        
        Args:
            db: Database session
            tour_id: Tour ID
            
        Returns:
            Dictionary with tour performance metrics
        """
        # Get tour
        tour = db.query(TourModel).filter(TourModel.id == tour_id).first()
        if not tour:
            return {}
        
        # Booking stats
        total_bookings = db.query(func.count(BookingModel.id)).filter(
            BookingModel.tour_id == tour_id
        ).scalar()
        
        confirmed_bookings = db.query(func.count(BookingModel.id)).filter(
            and_(
                BookingModel.tour_id == tour_id,
                BookingModel.status == "confirmed"
            )
        ).scalar()
        
        # Revenue
        total_revenue = db.query(
            func.coalesce(func.sum(BookingModel.total_amount), 0)
        ).filter(
            BookingModel.tour_id == tour_id
        ).scalar() or 0
        
        # Review stats
        review_stats = db.query(
            func.count(ReviewModel.id).label('count'),
            func.avg(ReviewModel.rating).label('avg_rating')
        ).filter(
            and_(
                ReviewModel.tour_id == tour_id,
                ReviewModel.status == "approved"
            )
        ).first()
        
        return {
            "tour_id": tour_id,
            "tour_name": tour.name,
            "bookings": {
                "total": total_bookings,
                "confirmed": confirmed_bookings
            },
            "revenue": {
                "total": float(total_revenue),
                "currency": "USD"
            },
            "reviews": {
                "count": review_stats.count if review_stats else 0,
                "average_rating": round(float(review_stats.avg_rating or 0), 2) if review_stats else 0
            }
        }
    
    
    # ==================== BOOKING ANALYTICS ====================
    
    @staticmethod
    def get_booking_stats(
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict:
        """
        Get booking statistics and conversion metrics
        
        Args:
            db: Database session
            start_date: Start date filter
            end_date: End date filter
            
        Returns:
            Dictionary with booking statistics
        """
        query = db.query(BookingModel)
        if start_date:
            query = query.filter(BookingModel.created_at >= start_date)
        if end_date:
            query = query.filter(BookingModel.created_at <= end_date)
        
        # Status breakdown
        status_counts = db.query(
            BookingModel.status,
            func.count(BookingModel.id)
        ).group_by(BookingModel.status).all()
        
        status_breakdown = {status: count for status, count in status_counts}
        
        # Average booking value
        avg_value = db.query(
            func.avg(BookingModel.total_amount)
        ).scalar() or 0
        
        # Average participants
        avg_participants = db.query(
            func.avg(BookingModel.participants)
        ).scalar() or 0
        
        return {
            "status_breakdown": status_breakdown,
            "average_value": round(float(avg_value), 2),
            "average_participants": round(float(avg_participants), 1),
            "conversion_rate": round(
                (status_breakdown.get("confirmed", 0) / 
                 sum(status_breakdown.values()) * 100) if status_breakdown else 0,
                2
            )
        }
    
    
    # ==================== REVENUE ANALYTICS ====================
    
    @staticmethod
    def get_revenue_breakdown(
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict:
        """
        Get detailed revenue breakdown
        
        Args:
            db: Database session
            start_date: Start date filter
            end_date: End date filter
            
        Returns:
            Dictionary with revenue breakdown
        """
        query = db.query(PaymentModel).filter(
            PaymentModel.status == "succeeded"
        )
        
        if start_date:
            query = query.filter(PaymentModel.created_at >= start_date)
        if end_date:
            query = query.filter(PaymentModel.created_at <= end_date)
        
        # Total revenue
        total_revenue = db.query(
            func.coalesce(func.sum(PaymentModel.amount), 0)
        ).filter(
            PaymentModel.status == "succeeded"
        ).scalar() or 0
        
        # Revenue by currency
        revenue_by_currency = db.query(
            PaymentModel.currency,
            func.sum(PaymentModel.amount)
        ).filter(
            PaymentModel.status == "succeeded"
        ).group_by(PaymentModel.currency).all()
        
        # Payment method breakdown
        payment_methods = db.query(
            PaymentModel.payment_method,
            func.count(PaymentModel.id)
        ).filter(
            PaymentModel.status == "succeeded"
        ).group_by(PaymentModel.payment_method).all()
        
        return {
            "total_revenue": float(total_revenue),
            "by_currency": {
                currency: float(amount) 
                for currency, amount in revenue_by_currency
            },
            "payment_methods": {
                method: count 
                for method, count in payment_methods if method
            }
        }


# Export
__all__ = ['AnalyticsRepository']
