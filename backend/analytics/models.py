"""
Analytics Pydantic models for request/response validation
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum


class PeriodEnum(str, Enum):
    """Time period grouping options"""
    day = "day"
    week = "week"
    month = "month"


class DateRangeRequest(BaseModel):
    """Request model for date range queries"""
    start_date: Optional[datetime] = Field(None, description="Start date for filtering")
    end_date: Optional[datetime] = Field(None, description="End date for filtering")
    
    class Config:
        json_schema_extra = {
            "example": {
                "start_date": "2024-01-01T00:00:00",
                "end_date": "2024-12-31T23:59:59"
            }
        }


class OverviewMetrics(BaseModel):
    """Overview dashboard metrics"""
    users: Dict[str, int]
    bookings: Dict[str, int]
    revenue: Dict[str, float]
    reviews: Dict[str, float]
    period: Dict[str, str]
    
    class Config:
        json_schema_extra = {
            "example": {
                "users": {"total": 1250, "new": 145},
                "bookings": {"total": 523, "in_period": 67},
                "revenue": {"total": 125430.50, "in_period": 18920.00, "currency": "USD"},
                "reviews": {"total": 342, "average_rating": 4.7},
                "period": {"start": "2024-01-01", "end": "2024-01-31"}
            }
        }


class SalesDataPoint(BaseModel):
    """Single sales data point"""
    period: str
    count: int
    total: float
    
    class Config:
        json_schema_extra = {
            "example": {
                "period": "2024-01-15",
                "count": 12,
                "total": 3580.00
            }
        }


class SalesAnalytics(BaseModel):
    """Sales analytics response"""
    data: List[SalesDataPoint]
    summary: Dict[str, float]
    
    class Config:
        json_schema_extra = {
            "example": {
                "data": [
                    {"period": "2024-01-15", "count": 12, "total": 3580.00}
                ],
                "summary": {
                    "total_sales": 45230.00,
                    "average_sale": 289.50,
                    "total_count": 156
                }
            }
        }


class TopTour(BaseModel):
    """Top performing tour"""
    tour_id: str
    tour_name: str
    price: float
    booking_count: int
    revenue: float
    
    class Config:
        json_schema_extra = {
            "example": {
                "tour_id": "TOUR-001",
                "tour_name": "Machu Picchu Adventure",
                "price": 599.99,
                "booking_count": 45,
                "revenue": 26999.55
            }
        }


class TopToursResponse(BaseModel):
    """Top tours list response"""
    tours: List[TopTour]
    total_revenue: float
    
    class Config:
        json_schema_extra = {
            "example": {
                "tours": [],
                "total_revenue": 125430.50
            }
        }


class UserGrowthPoint(BaseModel):
    """User growth data point"""
    date: str
    new_users: int
    total_users: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "date": "2024-01-15",
                "new_users": 8,
                "total_users": 1258
            }
        }


class UserGrowthResponse(BaseModel):
    """User growth analytics"""
    data: List[UserGrowthPoint]
    summary: Dict[str, int]
    
    class Config:
        json_schema_extra = {
            "example": {
                "data": [],
                "summary": {
                    "start_count": 1200,
                    "end_count": 1350,
                    "net_growth": 150,
                    "growth_rate": 12.5
                }
            }
        }


class UserEngagement(BaseModel):
    """User engagement metrics"""
    total_users: int
    users_with_bookings: int
    users_with_reviews: int
    engagement_rate: float
    avg_bookings_per_user: float
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_users": 1250,
                "users_with_bookings": 523,
                "users_with_reviews": 342,
                "engagement_rate": 41.84,
                "avg_bookings_per_user": 1.8
            }
        }


class TourPerformance(BaseModel):
    """Detailed tour performance metrics"""
    tour_id: str
    tour_name: str
    bookings: Dict[str, int]
    revenue: Dict[str, float]
    reviews: Dict[str, float]
    
    class Config:
        json_schema_extra = {
            "example": {
                "tour_id": "TOUR-001",
                "tour_name": "Machu Picchu Adventure",
                "bookings": {"total": 45, "confirmed": 42},
                "revenue": {"total": 26999.55, "currency": "USD"},
                "reviews": {"count": 38, "average_rating": 4.8}
            }
        }


class BookingStats(BaseModel):
    """Booking statistics"""
    status_breakdown: Dict[str, int]
    average_value: float
    average_participants: float
    conversion_rate: float
    
    class Config:
        json_schema_extra = {
            "example": {
                "status_breakdown": {
                    "pending": 12,
                    "confirmed": 523,
                    "cancelled": 34,
                    "completed": 489
                },
                "average_value": 389.50,
                "average_participants": 2.3,
                "conversion_rate": 92.4
            }
        }


class RevenueBreakdown(BaseModel):
    """Revenue breakdown"""
    total_revenue: float
    by_currency: Dict[str, float]
    payment_methods: Dict[str, int]
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_revenue": 125430.50,
                "by_currency": {"USD": 125430.50, "EUR": 0},
                "payment_methods": {"card": 456, "paypal": 67}
            }
        }


class ExportFormat(str, Enum):
    """Export format options"""
    csv = "csv"
    excel = "excel"
    json = "json"


class ExportRequest(BaseModel):
    """Data export request"""
    report_type: str = Field(..., description="Type of report to export")
    format: ExportFormat = Field(default=ExportFormat.csv, description="Export format")
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "report_type": "sales",
                "format": "csv",
                "start_date": "2024-01-01T00:00:00",
                "end_date": "2024-01-31T23:59:59"
            }
        }


# Export all models
__all__ = [
    'PeriodEnum',
    'DateRangeRequest',
    'OverviewMetrics',
    'SalesDataPoint',
    'SalesAnalytics',
    'TopTour',
    'TopToursResponse',
    'UserGrowthPoint',
    'UserGrowthResponse',
    'UserEngagement',
    'TourPerformance',
    'BookingStats',
    'RevenueBreakdown',
    'ExportFormat',
    'ExportRequest',
]
