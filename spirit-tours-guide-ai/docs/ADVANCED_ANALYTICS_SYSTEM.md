# Advanced Analytics System

## 📋 Overview

The Advanced Analytics System provides comprehensive real-time insights, predictive analytics, and performance tracking for the Spirit Tours platform. It enables data-driven decision making through automated tracking, intelligent forecasting, and actionable alerts.

## 🎯 Key Features

### 1. Real-Time Metrics
- **Live dashboard updates**: Metrics refresh every 30 seconds
- **Hourly revenue tracking**: Granular performance monitoring
- **Active user counting**: Current engagement levels
- **Conversion rate tracking**: Booking funnel optimization
- **Average order value**: Revenue per transaction

### 2. Tour Performance Analysis
- **Detailed tour metrics**: Duration, distance, passengers, revenue
- **Rating analytics**: Customer satisfaction tracking
- **Guide performance correlation**: Individual guide metrics
- **Route optimization data**: Most profitable routes
- **Waypoint engagement**: Perspective exploration rates

### 3. Guide Performance Tracking
- **Tours completed**: Volume metrics per guide
- **Revenue generated**: Financial contribution
- **Average ratings**: Quality scores
- **Efficiency scoring**: Tours per hour worked
- **Excellent vs. poor tours**: Performance distribution
- **Daily breakdown**: Detailed day-by-day analysis

### 4. Revenue Forecasting
- **7, 30, 90-day predictions**: Multiple time horizons
- **Machine learning models**: Linear regression baseline
- **Confidence intervals**: Upper and lower bounds
- **Trend analysis**: Increasing, decreasing, or stable
- **Historical data leverage**: Pattern recognition

### 5. Customer Behavior Analysis
- **Event tracking**: Page views, clicks, interactions
- **Session analytics**: Duration and engagement
- **Lifetime value (LTV)**: Customer worth calculation
- **Cohort analysis**: Retention tracking
- **Churn prediction**: At-risk customer identification

### 6. Automated Alerts
- **Threshold-based triggers**: Revenue, ratings, complaints
- **Severity levels**: Critical, warning, info
- **Real-time notifications**: WebSocket broadcasts
- **Acknowledgment tracking**: Alert management
- **Historical alert log**: Audit trail

### 7. Export & Reporting
- **CSV exports**: Tours, events, revenue data
- **Comprehensive reports**: Multi-metric summaries
- **Date range filtering**: Custom periods
- **Scheduled reports**: Automated delivery (future)
- **Visual dashboards**: Interactive charts

## 💎 Analytics Categories

### Business Metrics
- **Revenue**: Total, daily, hourly, per route, per guide
- **Bookings**: Count, conversion rate, cancellation rate
- **Average Order Value (AOV)**: Revenue per booking
- **Monthly Recurring Revenue (MRR)**: Subscription-like tracking
- **Annual Recurring Revenue (ARR)**: Yearly projections

### Operational Metrics
- **Tour completion rate**: Successfully finished tours
- **Tour delay rate**: On-time performance
- **Tour cancellation rate**: Lost opportunities
- **Average tour duration**: Operational efficiency
- **Vehicle utilization**: Fleet optimization

### Quality Metrics
- **Average rating**: Overall satisfaction score
- **Net Promoter Score (NPS)**: Customer loyalty
- **Feedback count**: Engagement level
- **Complaint rate**: Quality issues
- **Resolution time**: Support efficiency

### Engagement Metrics
- **Active users**: Daily, weekly, monthly
- **Session duration**: Time on platform
- **Retention rate**: Repeat customers
- **Churn rate**: Customer loss
- **Pages per session**: Engagement depth

### Financial Metrics
- **Customer Acquisition Cost (CAC)**: Marketing efficiency
- **Lifetime Value (LTV)**: Customer profitability
- **LTV/CAC ratio**: Unit economics
- **Profit margin**: Revenue vs. costs
- **Cash flow**: Financial health

### Guide Metrics
- **Tours per guide**: Workload distribution
- **Revenue per guide**: Individual contribution
- **Average rating per guide**: Quality scores
- **Efficiency score**: Tours per hour
- **Hours worked**: Labor tracking

## 🏗️ System Architecture

### Database Schema

#### `analytics_events` Table
```sql
CREATE TABLE analytics_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  user_id VARCHAR(100),
  session_id VARCHAR(100),
  tour_id VARCHAR(100),
  guide_id VARCHAR(100),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);
```

**Purpose**: Raw event stream for all user interactions
**Indexes**: timestamp, event_type, user_id, tour_id

#### `analytics_metrics` Table
```sql
CREATE TABLE analytics_metrics (
  id SERIAL PRIMARY KEY,
  metric_type VARCHAR(100) NOT NULL,
  metric_value NUMERIC NOT NULL,
  dimension_keys JSONB,
  dimension_values JSONB,
  granularity VARCHAR(50),
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(metric_type, dimension_keys, granularity, period_start)
);
```

**Purpose**: Aggregated metrics with multi-dimensional analysis
**Indexes**: metric_type + period_start, granularity

#### `analytics_tours` Table
```sql
CREATE TABLE analytics_tours (
  id SERIAL PRIMARY KEY,
  tour_id VARCHAR(100) NOT NULL,
  route_id VARCHAR(100),
  guide_id VARCHAR(100),
  vehicle_id VARCHAR(100),
  passengers_count INTEGER,
  revenue NUMERIC,
  duration_minutes INTEGER,
  distance_km NUMERIC,
  rating NUMERIC,
  feedback_count INTEGER,
  waypoints_visited INTEGER,
  perspectives_explored INTEGER,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Detailed tour performance tracking
**Indexes**: tour_id, guide_id, completed_at

#### `analytics_guides` Table
```sql
CREATE TABLE analytics_guides (
  id SERIAL PRIMARY KEY,
  guide_id VARCHAR(100) NOT NULL,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  tours_count INTEGER DEFAULT 0,
  passengers_count INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  average_rating NUMERIC,
  total_hours NUMERIC,
  efficiency_score NUMERIC,
  nps_score NUMERIC,
  complaint_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(guide_id, period_start)
);
```

**Purpose**: Guide performance aggregations by period
**Indexes**: guide_id + period_start

#### `analytics_revenue` Table
```sql
CREATE TABLE analytics_revenue (
  id SERIAL PRIMARY KEY,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  granularity VARCHAR(50) NOT NULL,
  total_revenue NUMERIC DEFAULT 0,
  bookings_count INTEGER DEFAULT 0,
  average_order_value NUMERIC,
  revenue_by_route JSONB,
  revenue_by_guide JSONB,
  conversion_rate NUMERIC,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(period_start, granularity)
);
```

**Purpose**: Revenue tracking with multiple breakdowns
**Indexes**: period_start DESC

#### `analytics_cohorts` Table
```sql
CREATE TABLE analytics_cohorts (
  id SERIAL PRIMARY KEY,
  cohort_id VARCHAR(100) NOT NULL UNIQUE,
  cohort_name VARCHAR(255),
  cohort_date DATE NOT NULL,
  users_count INTEGER DEFAULT 0,
  retention_day_1 NUMERIC,
  retention_day_7 NUMERIC,
  retention_day_30 NUMERIC,
  retention_day_90 NUMERIC,
  average_ltv NUMERIC,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Cohort retention analysis
**Indexes**: cohort_id

#### `analytics_predictions` Table
```sql
CREATE TABLE analytics_predictions (
  id SERIAL PRIMARY KEY,
  prediction_type VARCHAR(100) NOT NULL,
  prediction_date DATE NOT NULL,
  predicted_value NUMERIC NOT NULL,
  confidence_score NUMERIC,
  model_version VARCHAR(50),
  features_used JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: ML model predictions and forecasts
**Indexes**: prediction_type + prediction_date DESC

#### `analytics_ab_tests` Table
```sql
CREATE TABLE analytics_ab_tests (
  id SERIAL PRIMARY KEY,
  test_id VARCHAR(100) UNIQUE NOT NULL,
  test_name VARCHAR(255) NOT NULL,
  description TEXT,
  variants JSONB NOT NULL,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active',
  results JSONB,
  winner VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: A/B testing framework
**Indexes**: test_id, status

#### `analytics_alerts` Table
```sql
CREATE TABLE analytics_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  metric_type VARCHAR(100),
  threshold_value NUMERIC,
  current_value NUMERIC,
  triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by VARCHAR(100),
  acknowledged_at TIMESTAMP
);
```

**Purpose**: Automated alert system
**Indexes**: triggered_at DESC, acknowledged

### Redis Data Structures

#### Real-Time Counters
```javascript
// Daily revenue counter (in cents)
SET analytics:revenue:2024-01-20 2500000  // $25,000.00
EXPIRE analytics:revenue:2024-01-20 86400  // 24h TTL

// Hourly revenue counter
SET analytics:revenue:2024-01-20:14 125000  // $1,250.00 at 2 PM
EXPIRE analytics:revenue:2024-01-20:14 86400

// Daily tours counter
SET analytics:tours:2024-01-20 45
EXPIRE analytics:tours:2024-01-20 86400

// Daily passengers counter
SET analytics:passengers:2024-01-20 178
EXPIRE analytics:passengers:2024-01-20 86400

// Active users set
SADD analytics:active_users:2024-01-20 user123 user456 user789
EXPIRE analytics:active_users:2024-01-20 86400
```

#### Guide Metrics
```javascript
// Guide daily tours
SET analytics:guide:guide123:tours:2024-01-20 8
// Guide daily revenue
SET analytics:guide:guide123:revenue:2024-01-20 180000  // $1,800.00
```

## 🔌 API Reference

### Real-Time Metrics

#### Get Real-Time Dashboard Metrics
```http
GET /api/analytics/realtime?timeRange=today
```

**Response:**
```json
{
  "success": true,
  "current": {
    "revenue": 25000.00,
    "tours": 45,
    "passengers": 178,
    "activeUsers": 234,
    "conversionRate": 3.42,
    "averageOrderValue": 555.56
  },
  "hourly": [
    { "hour": 0, "revenue": 0, "tours": 0 },
    { "hour": 1, "revenue": 0, "tours": 0 },
    { "hour": 8, "revenue": 1250.00, "tours": 3 },
    { "hour": 14, "revenue": 2800.00, "tours": 7 }
  ],
  "timestamp": "2024-01-20T14:30:00Z"
}
```

### Event Tracking

#### Track an Event
```http
POST /api/analytics/events/track
Content-Type: application/json

{
  "eventType": "page_view",
  "eventData": {
    "page": "/tours/istanbul",
    "referrer": "https://google.com",
    "duration": 45
  },
  "context": {
    "userId": "user123",
    "sessionId": "session456",
    "tourId": "tour789"
  }
}
```

**Response:**
```json
{
  "success": true,
  "eventId": 12345
}
```

#### Get Recent Events
```http
GET /api/analytics/events/recent?limit=100&eventType=booking_completed
```

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "id": 12345,
      "event_type": "booking_completed",
      "event_data": { "tourId": "tour789", "amount": 250 },
      "user_id": "user123",
      "timestamp": "2024-01-20T14:30:00Z"
    }
  ],
  "total": 100
}
```

### Tour Analytics

#### Record Tour Analytics
```http
POST /api/analytics/tours/record
Content-Type: application/json

{
  "tourId": "tour123",
  "routeId": "route456",
  "guideId": "guide789",
  "vehicleId": "vehicle012",
  "passengersCount": 4,
  "revenue": 500.00,
  "durationMinutes": 120,
  "distanceKm": 15.5,
  "rating": 4.8,
  "feedbackCount": 3,
  "waypointsVisited": 8,
  "perspectivesExplored": 12,
  "startedAt": "2024-01-20T10:00:00Z",
  "completedAt": "2024-01-20T12:00:00Z",
  "status": "completed"
}
```

**Response:**
```json
{
  "success": true
}
```

#### Get Tour Performance
```http
GET /api/analytics/tours/performance?routeId=route456&startDate=2024-01-01&endDate=2024-01-31&limit=100
```

**Response:**
```json
{
  "success": true,
  "tours": [...],
  "summary": {
    "totalTours": 45,
    "totalRevenue": 22500.00,
    "totalPassengers": 178,
    "averageRating": "4.65",
    "averageDuration": 115,
    "averageRevenuePerTour": "500.00"
  }
}
```

#### Get Tour Analytics by ID
```http
GET /api/analytics/tours/tour123
```

**Response:**
```json
{
  "success": true,
  "tour": {
    "tour_id": "tour123",
    "route_id": "route456",
    "guide_id": "guide789",
    "passengers_count": 4,
    "revenue": 500.00,
    "rating": 4.8,
    "status": "completed"
  }
}
```

### Guide Analytics

#### Get Guide Performance
```http
GET /api/analytics/guides/guide789/performance?timeRange=30d
```

**Response:**
```json
{
  "success": true,
  "guideId": "guide789",
  "timeRange": "30d",
  "summary": {
    "totalTours": 32,
    "totalPassengers": 127,
    "totalRevenue": 16000.00,
    "averageRating": "4.72",
    "hoursWorked": "64.5",
    "efficiencyScore": "49.61",
    "excellentToursRate": "68.8",
    "poorToursRate": "6.2"
  },
  "dailyBreakdown": [...]
}
```

#### Get All Guides Summary
```http
GET /api/analytics/guides/summary?timeRange=30d
```

**Response:**
```json
{
  "success": true,
  "guides": [
    {
      "guide_id": "guide789",
      "tours_count": 32,
      "total_passengers": 127,
      "total_revenue": 16000.00,
      "average_rating": 4.72,
      "hours_worked": 64.5
    }
  ],
  "timeRange": "30d"
}
```

### Revenue Analytics

#### Get Revenue Analytics
```http
GET /api/analytics/revenue?startDate=2024-01-01&endDate=2024-01-31&granularity=day
```

**Parameters:**
- `granularity`: `hour`, `day`, `week`, `month`

**Response:**
```json
{
  "success": true,
  "revenue": [
    {
      "period": "2024-01-20",
      "total_revenue": 25000.00,
      "bookings_count": 45,
      "avg_order_value": 555.56,
      "total_passengers": 178
    }
  ],
  "granularity": "day",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-31T23:59:59Z"
}
```

#### Generate Revenue Forecast
```http
POST /api/analytics/revenue/forecast
Content-Type: application/json

{
  "daysAhead": 7
}
```

**Response:**
```json
{
  "success": true,
  "forecasts": [
    {
      "date": "2024-01-21",
      "predictedRevenue": "26500.00",
      "lowerBound": "22525.00",
      "upperBound": "30475.00",
      "confidence": 0.85
    }
  ],
  "model": "linear_regression",
  "historicalDataPoints": 30,
  "trend": "increasing",
  "generatedAt": "2024-01-20T14:30:00Z"
}
```

### Customer Analytics

#### Get Customer Behavior
```http
GET /api/analytics/customers/behavior?timeRange=30d
```

**Response:**
```json
{
  "success": true,
  "eventPatterns": [
    {
      "event_type": "page_view",
      "event_count": 12543,
      "unique_users": 2341
    },
    {
      "event_type": "booking_completed",
      "event_count": 432,
      "unique_users": 401
    }
  ],
  "sessionStats": {
    "total_sessions": 3245,
    "unique_users": 2341,
    "avg_session_duration": 456.7
  },
  "timeRange": "30d"
}
```

#### Get Customer Lifetime Value
```http
GET /api/analytics/customers/ltv
```

**Response:**
```json
{
  "success": true,
  "customers": [
    {
      "user_id": "user123",
      "total_tours": 8,
      "lifetime_value": 4000.00,
      "first_tour_date": "2023-06-15",
      "last_tour_date": "2024-01-15",
      "avg_rating": 4.9
    }
  ],
  "summary": {
    "totalCustomers": 100,
    "totalLTV": 250000.00,
    "averageLTV": "2500.00"
  }
}
```

### Alerts

#### Create an Alert
```http
POST /api/analytics/alerts
Content-Type: application/json

{
  "alertType": "low_rating",
  "severity": "warning",
  "title": "Low Rating Alert",
  "message": "Tour tour123 received a rating below 3.0",
  "metricType": "rating",
  "thresholdValue": 3.0,
  "currentValue": 2.5
}
```

**Response:**
```json
{
  "success": true,
  "alertId": 456
}
```

#### Get Active Alerts
```http
GET /api/analytics/alerts/active
```

**Response:**
```json
{
  "success": true,
  "alerts": [
    {
      "id": 456,
      "alert_type": "low_rating",
      "severity": "warning",
      "title": "Low Rating Alert",
      "message": "Tour tour123 received a rating below 3.0",
      "triggered_at": "2024-01-20T14:30:00Z",
      "acknowledged": false
    }
  ],
  "total": 1
}
```

#### Acknowledge an Alert
```http
POST /api/analytics/alerts/456/acknowledge
Content-Type: application/json

{
  "acknowledgedBy": "admin_user"
}
```

**Response:**
```json
{
  "success": true
}
```

### Reporting

#### Generate Comprehensive Report
```http
POST /api/analytics/reports/generate
Content-Type: application/json

{
  "reportType": "comprehensive",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "filters": {}
}
```

**Report Types:**
- `comprehensive`: All metrics
- `revenue`: Revenue-focused
- `guides`: Guide performance

**Response:**
```json
{
  "success": true,
  "report": {
    "reportType": "comprehensive",
    "generatedAt": "2024-01-20T14:30:00Z",
    "period": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    },
    "tourPerformance": {...},
    "realTimeMetrics": {...},
    "guidesSummary": [...]
  }
}
```

#### Export Data as CSV
```http
GET /api/analytics/export/csv?dataType=tours&startDate=2024-01-01&endDate=2024-01-31
```

**Data Types:**
- `tours`: Tour analytics
- `events`: Event stream

**Response:**
CSV file download

### Statistics

#### Get System Statistics
```http
GET /api/analytics/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalEvents": 125432,
    "totalTours": 3245,
    "totalGuides": 87,
    "databaseSize": "N/A",
    "redisKeys": "N/A"
  }
}
```

### Maintenance

#### Cleanup Old Data
```http
POST /api/analytics/maintenance/cleanup
Content-Type: application/json

{
  "retentionDays": 365
}
```

**Response:**
```json
{
  "success": true,
  "deletedEvents": 45231
}
```

## 🎨 Frontend Integration

### React Component Usage

```typescript
import React, { useEffect, useState } from 'react';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import { io } from 'socket.io-client';

function App() {
  const [socket, setSocket] = useState(null);
  
  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);
    
    // Listen for analytics events
    newSocket.on('analytics-event-tracked', (data) => {
      console.log('Event tracked:', data);
    });
    
    newSocket.on('analytics-tour-recorded', (data) => {
      console.log('Tour recorded:', data);
      // Refresh dashboard metrics
    });
    
    newSocket.on('analytics-alert', (data) => {
      console.log('Analytics alert:', data);
      // Show alert notification
    });
    
    return () => {
      newSocket.disconnect();
    };
  }, []);
  
  const handleExport = (dataType, format) => {
    // Handle export logic
    window.location.href = `/api/analytics/export/${format}?dataType=${dataType}`;
  };
  
  return (
    <div className="App">
      <AnalyticsDashboard
        userRole="admin"
        guideId={null}
        onExport={handleExport}
      />
    </div>
  );
}
```

### Integration with Tour Flow

```typescript
// After tour completion
async function handleTourCompletion(tourData) {
  try {
    // Complete the tour in main system
    await fetch('/api/tours/${tourData.tourId}/end', { method: 'POST' });
    
    // Record analytics
    await fetch('/api/analytics/tours/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tourId: tourData.tourId,
        routeId: tourData.routeId,
        guideId: tourData.guideId,
        vehicleId: tourData.vehicleId,
        passengersCount: tourData.passengersCount,
        revenue: tourData.revenue,
        durationMinutes: tourData.durationMinutes,
        distanceKm: tourData.distanceKm,
        rating: tourData.rating,
        feedbackCount: tourData.feedbackCount,
        waypointsVisited: tourData.waypointsVisited,
        perspectivesExplored: tourData.perspectivesExplored,
        startedAt: tourData.startedAt,
        completedAt: new Date().toISOString(),
        status: 'completed',
      }),
    });
    
    console.log('Tour analytics recorded successfully');
    
  } catch (error) {
    console.error('Error recording tour analytics:', error);
  }
}
```

### Event Tracking

```typescript
// Track user events
async function trackEvent(eventType, eventData, context = {}) {
  try {
    await fetch('/api/analytics/events/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType,
        eventData,
        context: {
          userId: getCurrentUserId(),
          sessionId: getSessionId(),
          ...context,
        },
      }),
    });
  } catch (error) {
    console.error('Error tracking event:', error);
  }
}

// Usage examples
trackEvent('page_view', { page: '/tours/istanbul' });
trackEvent('booking_started', { tourId: 'tour123' });
trackEvent('booking_completed', { tourId: 'tour123', amount: 250 });
trackEvent('search_performed', { query: 'historical tours', results: 15 });
```

## 🔒 Security Considerations

### Input Validation
- All numeric values are validated and sanitized
- Date ranges are validated for logical consistency
- JSON payloads are parsed safely
- SQL injection prevention through parameterized queries

### Rate Limiting
- API endpoints are rate-limited
- Heavy queries have additional restrictions
- Export operations have cooldown periods

### Access Control
- Role-based access to sensitive metrics
- Guide-specific data isolation
- Admin-only access to system-wide analytics
- Audit trail for all data access

### Data Privacy
- PII is minimized in analytics
- User data is anonymized where possible
- GDPR-compliant data retention
- Secure data export mechanisms

## 📈 Performance Optimization

### Database Optimization
```sql
-- Indexes for fast queries
CREATE INDEX idx_analytics_tours_completed_at ON analytics_tours(completed_at DESC);
CREATE INDEX idx_analytics_tours_guide_id ON analytics_tours(guide_id);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp DESC);
CREATE INDEX idx_analytics_metrics_type_period ON analytics_metrics(metric_type, period_start DESC);

-- Partitioning for large tables (future)
CREATE TABLE analytics_events_2024_01 PARTITION OF analytics_events
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### Redis Optimization
- Use TTL for automatic cleanup (24-48 hours)
- Pipeline commands for bulk operations
- Use appropriate data structures (counters, sets, sorted sets)
- Memory optimization with data compression

### Query Optimization
- Use appropriate indexes
- Limit result sets with LIMIT clause
- Use COUNT estimates for large tables
- Cache frequently accessed queries

### Caching Strategy
- Real-time metrics cached for 30 seconds
- Aggregated metrics cached for 5 minutes
- Historical reports cached for 1 hour
- Invalidate cache on data updates

## 🚀 Best Practices

### For Developers

1. **Track all significant events**: Don't miss important user actions
2. **Use consistent event naming**: Follow event_type conventions
3. **Include relevant context**: userId, sessionId, metadata
4. **Handle errors gracefully**: Analytics failures shouldn't break app
5. **Test analytics locally**: Verify tracking before production

### For Data Analysis

1. **Define clear KPIs**: Know what metrics matter
2. **Set up alerts**: Proactive monitoring
3. **Regular reporting**: Weekly/monthly summaries
4. **Trend analysis**: Look for patterns over time
5. **Action on insights**: Data-driven decisions

### For Operations

1. **Monitor system health**: Database size, query performance
2. **Regular cleanup**: Remove old data per retention policy
3. **Backup analytics data**: Separate from main database
4. **Scale horizontally**: Read replicas for heavy queries
5. **Optimize queries**: Review slow query logs

## 🔧 Configuration

### Environment Variables

```bash
# PostgreSQL connection
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spirit_tours
DB_USER=postgres
DB_PASSWORD=your_password

# Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379

# Analytics settings
ANALYTICS_ENABLED=true
ANALYTICS_DEBUG=false
ANALYTICS_RETENTION_DAYS=365
ANALYTICS_BATCH_SIZE=1000
```

### Feature Flags

```javascript
const analyticsConfig = {
  features: {
    realTimeMetrics: true,
    predictions: true,
    alerts: true,
    exports: true,
    abTesting: false, // Coming soon
  },
  
  retention: {
    events: 365, // days
    metrics: 730, // days
    predictions: 90, // days
  },
  
  thresholds: {
    lowRating: 3.0,
    highCancellationRate: 0.15,
    lowConversionRate: 0.02,
  },
};
```

## 📊 Predictive Models

### Linear Regression (Current)
- **Use case**: Revenue forecasting
- **Features**: Historical daily revenue
- **Accuracy**: ~80-85% for 7-day forecast
- **Limitations**: Doesn't account for seasonality

### Future Models (Planned)

#### ARIMA (Time Series)
- Better handling of seasonal patterns
- Improved accuracy for longer forecasts
- Accounts for trends and cycles

#### Machine Learning (TensorFlow.js)
- Multi-feature predictions
- Non-linear relationships
- Ensemble methods
- 90%+ accuracy target

## 💡 Tips for Success

### Maximizing Insights
1. **Combine metrics**: Look at correlations
2. **Segment data**: By route, guide, time, etc.
3. **Compare periods**: Week-over-week, year-over-year
4. **Use forecasts**: Plan capacity and resources
5. **Act on alerts**: Respond quickly to issues

### Dashboard Best Practices
1. **Focus on KPIs**: Don't overwhelm with data
2. **Use visualizations**: Charts over tables
3. **Set time ranges**: Relevant period analysis
4. **Enable auto-refresh**: Real-time monitoring
5. **Export regularly**: Share with stakeholders

### Reporting Guidelines
1. **Executive summary**: Key metrics first
2. **Trend analysis**: Show progress over time
3. **Actionable insights**: Recommend next steps
4. **Visual appeal**: Charts and graphs
5. **Regular cadence**: Weekly/monthly consistency

## 🎯 Future Enhancements

### Short-term (Next Quarter)
- [ ] Advanced ML models (ARIMA, Prophet)
- [ ] A/B testing framework implementation
- [ ] Automated report scheduling
- [ ] Advanced cohort analysis
- [ ] Funnel analysis

### Medium-term (6 months)
- [ ] Predictive churn modeling
- [ ] Dynamic pricing recommendations
- [ ] Customer segmentation (RFM)
- [ ] Attribution modeling
- [ ] Anomaly detection

### Long-term (1 year)
- [ ] Real-time OLAP cube
- [ ] Custom dashboard builder
- [ ] Natural language queries
- [ ] AI-powered insights
- [ ] Predictive maintenance

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Maintained by**: Spirit Tours Development Team
