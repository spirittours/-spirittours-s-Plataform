# Admin Dashboard with Analytics Documentation

## Overview

The Spirit Tours Admin Dashboard provides comprehensive analytics and insights for business monitoring and decision-making.

## Features

### Core Capabilities
- ✅ **Real-time Metrics**: Live dashboard with key performance indicators
- ✅ **Revenue Analytics**: Detailed revenue tracking and forecasting
- ✅ **Booking Analytics**: Booking trends and conversion metrics
- ✅ **Customer Insights**: Customer segmentation and lifetime value
- ✅ **Tour Performance**: Individual tour performance metrics
- ✅ **Charts & Visualizations**: Interactive charts with date ranges
- ✅ **Data Export**: CSV/PDF export functionality
- ✅ **Snapshots**: Pre-calculated snapshots for fast loading

### Analytics Modules

**Revenue Analytics**
- Total revenue tracking
- Revenue by source (bookings, add-ons)
- Transaction success/failure rates
- Refund tracking
- Average transaction value
- Revenue growth trends

**Booking Analytics**
- Total bookings tracking
- Booking status breakdown
- Guest count metrics
- Conversion rate tracking
- Cancellation rate monitoring
- Lead time analysis

**Customer Analytics**
- New vs returning customers
- Customer lifetime value (CLV)
- Retention and churn rates
- Customer segmentation
- Acquisition cost tracking
- Repeat purchase rate

**Tour Performance**
- Individual tour metrics
- Occupancy and capacity utilization
- Tour popularity rankings
- Revenue per tour
- Rating and review tracking
- Conversion rates by tour

## Database Models

### DashboardMetric
Stores aggregated metrics for quick access.

**Fields:**
- `metric_type`: Type of metric (revenue, bookings, etc.)
- `date`: Date of metric
- `granularity`: Time granularity (hourly, daily, weekly, monthly)
- `value`: Metric value
- `count`: Count of items
- `dimension_1/2`: Additional dimensions for filtering

### RevenueAnalytics
Detailed revenue tracking.

**Fields:**
- `total_revenue`: Total revenue for period
- `booking_revenue`: Revenue from bookings
- `addon_revenue`: Revenue from add-ons
- `total_transactions`: Transaction count
- `refund_count`: Number of refunds
- `average_transaction_value`: Average per transaction

### BookingAnalytics
Booking metrics tracking.

**Fields:**
- `total_bookings`: Total bookings
- `confirmed_bookings`: Confirmed count
- `cancelled_bookings`: Cancelled count
- `conversion_rate`: Conversion percentage
- `cancellation_rate`: Cancellation percentage
- `average_lead_time_days`: Booking lead time

### CustomerAnalytics
Customer insights.

**Fields:**
- `new_customers`: New customer count
- `returning_customers`: Returning count
- `active_customers`: Active count
- `average_customer_lifetime_value`: CLV
- `retention_rate`: Retention percentage
- `churn_rate`: Churn percentage

### TourPerformance
Tour-specific metrics.

**Fields:**
- `tour_id`: Tour reference
- `views`: Page views
- `bookings`: Booking count
- `revenue`: Revenue generated
- `occupancy_rate`: Occupancy percentage
- `average_rating`: Tour rating

## API Endpoints

### Get Dashboard Overview
```http
GET /api/dashboard/overview?start_date=2025-01-01&end_date=2025-01-31

Response:
{
  "period": {
    "start_date": "2025-01-01",
    "end_date": "2025-01-31",
    "days": 31
  },
  "revenue": {
    "total_revenue": 125000.00,
    "booking_revenue": 115000.00,
    "addon_revenue": 10000.00,
    "growth_percentage": 15.5
  },
  "bookings": {
    "total_bookings": 450,
    "confirmed_bookings": 420,
    "cancelled_bookings": 30,
    "conversion_rate": 12.5
  },
  "customers": {
    "new_customers": 120,
    "returning_customers": 80,
    "lifetime_value": 850.00,
    "retention_rate": 75.0
  },
  "performance": {
    "occupancy_rate": 85.0,
    "average_rating": 4.7,
    "conversion_rate": 12.5
  }
}
```

### Get Revenue Metrics
```http
GET /api/dashboard/revenue?start_date=2025-01-01&end_date=2025-01-31

Response:
{
  "total_revenue": 125000.00,
  "booking_revenue": 115000.00,
  "transactions": 450,
  "average_transaction": 277.78,
  "growth_percentage": 15.5,
  "previous_period_revenue": 108500.00
}
```

### Get Revenue Chart Data
```http
GET /api/dashboard/charts/revenue?start_date=2025-01-01&end_date=2025-01-31

Response:
{
  "data": [
    {
      "date": "2025-01-01",
      "total_revenue": 4000.00,
      "booking_revenue": 3700.00,
      "addon_revenue": 300.00
    },
    {
      "date": "2025-01-02",
      "total_revenue": 4200.00,
      "booking_revenue": 3900.00,
      "addon_revenue": 300.00
    }
  ]
}
```

### Get Top Tours
```http
GET /api/dashboard/top-tours?limit=10&start_date=2025-01-01&end_date=2025-01-31

Response:
{
  "tours": [
    {
      "tour_id": 1,
      "bookings": 85,
      "revenue": 25500.00,
      "rating": 4.8
    },
    {
      "tour_id": 2,
      "bookings": 72,
      "revenue": 21600.00,
      "rating": 4.7
    }
  ],
  "total": 10
}
```

### Create Dashboard Snapshot
```http
POST /api/dashboard/snapshot?snapshot_date=2025-01-31

Response:
{
  "success": true,
  "snapshot_id": "snapshot_2025-01-31",
  "snapshot_date": "2025-01-31"
}
```

## Usage Examples

### Python - Get Dashboard Overview

```python
from backend.analytics.analytics_service import analytics_service
from datetime import date, timedelta

# Get last 30 days overview
end_date = date.today()
start_date = end_date - timedelta(days=30)

overview = await analytics_service.get_dashboard_overview(
    db=db_session,
    start_date=start_date,
    end_date=end_date
)

print(f"Revenue: ${overview['revenue']['total_revenue']}")
print(f"Bookings: {overview['bookings']['total_bookings']}")
print(f"Growth: {overview['revenue']['growth_percentage']}%")
```

### React - Dashboard Component

```tsx
import { useState, useEffect } from 'react';

function DashboardOverview() {
  const [metrics, setMetrics] = useState(null);
  
  useEffect(() => {
    fetch('/api/dashboard/overview')
      .then(res => res.json())
      .then(data => setMetrics(data));
  }, []);
  
  if (!metrics) return <div>Loading...</div>;
  
  return (
    <div className="dashboard">
      <div className="metric-card">
        <h3>Total Revenue</h3>
        <p>${metrics.revenue.total_revenue.toLocaleString()}</p>
        <span className="growth">
          {metrics.revenue.growth_percentage > 0 ? '↑' : '↓'}
          {Math.abs(metrics.revenue.growth_percentage)}%
        </span>
      </div>
      
      <div className="metric-card">
        <h3>Total Bookings</h3>
        <p>{metrics.bookings.total_bookings}</p>
        <span className="growth">
          {metrics.bookings.growth_percentage > 0 ? '↑' : '↓'}
          {Math.abs(metrics.bookings.growth_percentage)}%
        </span>
      </div>
      
      <div className="metric-card">
        <h3>New Customers</h3>
        <p>{metrics.customers.new_customers}</p>
      </div>
    </div>
  );
}
```

## Key Performance Indicators (KPIs)

### Revenue KPIs
- **Total Revenue**: Sum of all revenue
- **Revenue Growth**: Period-over-period growth
- **Average Transaction Value**: Revenue / Transactions
- **Refund Rate**: Refunds / Total Revenue

### Booking KPIs
- **Conversion Rate**: Bookings / Views
- **Cancellation Rate**: Cancellations / Total Bookings
- **Average Lead Time**: Days between booking and tour
- **Occupancy Rate**: Booked capacity / Total capacity

### Customer KPIs
- **Customer Lifetime Value (CLV)**: Average revenue per customer
- **Customer Acquisition Cost (CAC)**: Marketing spend / New customers
- **Retention Rate**: Returning customers / Total customers
- **Churn Rate**: Churned customers / Active customers

### Tour KPIs
- **Tour Conversion Rate**: Bookings / Views (per tour)
- **Revenue per Tour**: Total revenue / Number of tours
- **Average Rating**: Sum of ratings / Number of reviews
- **Capacity Utilization**: Guests / Total capacity

## Best Practices

### 1. Regular Snapshots
Create daily snapshots for fast dashboard loading:

```python
# Run daily via cron
from backend.analytics.analytics_service import analytics_service
from datetime import date

async def create_daily_snapshot():
    today = date.today()
    await analytics_service.create_dashboard_snapshot(db, today)
```

### 2. Efficient Queries
Use date range filters to limit data:

```python
# Good
metrics = await analytics_service.get_revenue_metrics(
    db, start_date, end_date
)

# Avoid querying all historical data
```

### 3. Caching
Implement caching for frequently accessed metrics:

```python
from functools import lru_cache
from datetime import datetime, timedelta

@lru_cache(maxsize=128)
def get_cached_overview(date_str):
    return analytics_service.get_dashboard_overview(...)
```

### 4. Data Aggregation
Pre-aggregate data for faster queries:

```python
# Calculate daily instead of querying individual records
daily_revenue = db.query(
    func.sum(Payment.amount)
).filter(
    Payment.date == today
).scalar()
```

## Data Export

### Export to CSV

```python
import csv
from io import StringIO

def export_revenue_to_csv(revenue_data):
    output = StringIO()
    writer = csv.writer(output)
    
    # Write headers
    writer.writerow(['Date', 'Revenue', 'Bookings', 'Transactions'])
    
    # Write data
    for row in revenue_data:
        writer.writerow([
            row['date'],
            row['total_revenue'],
            row['bookings'],
            row['transactions']
        ])
    
    return output.getvalue()
```

### Export to PDF

```python
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

def export_dashboard_to_pdf(metrics):
    pdf = canvas.Canvas("dashboard.pdf", pagesize=letter)
    
    pdf.drawString(100, 750, "Spirit Tours Dashboard")
    pdf.drawString(100, 730, f"Revenue: ${metrics['revenue']['total_revenue']}")
    pdf.drawString(100, 710, f"Bookings: {metrics['bookings']['total_bookings']}")
    
    pdf.save()
```

## Performance Optimization

### Database Indexing
```sql
-- Key indexes for fast queries
CREATE INDEX idx_revenue_date ON revenue_analytics(date);
CREATE INDEX idx_booking_date ON booking_analytics(date);
CREATE INDEX idx_tour_perf ON tour_performance(tour_id, date);
```

### Query Optimization
- Use date range filters
- Limit result sets
- Use aggregation functions
- Implement pagination

### Caching Strategy
- Cache dashboard snapshots
- Cache frequently accessed metrics
- Implement Redis for real-time data
- Set appropriate TTL values

## Security

### Access Control
```python
from fastapi import Depends

def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.get('/dashboard/overview')
async def get_overview(admin: User = Depends(require_admin)):
    # Admin-only endpoint
    pass
```

### Data Protection
- Implement role-based access control (RBAC)
- Log all dashboard access
- Encrypt sensitive metrics
- Regular security audits

## Troubleshooting

### Slow Dashboard Loading
1. Check database query performance
2. Verify indexes are in place
3. Use dashboard snapshots
4. Implement caching
5. Optimize date range queries

### Incorrect Metrics
1. Verify data aggregation logic
2. Check date range filters
3. Review calculation formulas
4. Validate source data

### Missing Data
1. Check data pipeline
2. Verify daily aggregation jobs
3. Review ETL processes
4. Check for data gaps

## Deployment

### 1. Run Migrations
```bash
cd backend
alembic upgrade head
```

### 2. Setup Daily Jobs
```bash
# Crontab
0 1 * * * cd /path/to/backend && python -m scripts.aggregate_daily_metrics
0 2 * * * cd /path/to/backend && python -m scripts.create_dashboard_snapshot
```

### 3. Configure Monitoring
- Setup alerts for metric anomalies
- Monitor query performance
- Track API response times
- Log all errors

## Support

For issues or questions:
- Email: dev@spirittours.com
- Documentation: /docs/dashboard

---

**Version**: 1.0.0  
**Last Updated**: 2025-01-02  
**Status**: ✅ Production Ready
