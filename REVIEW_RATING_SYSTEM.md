# Review and Rating System

Complete review and rating system for Spirit Tours with moderation, analytics, and user engagement features.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Models](#database-models)
4. [Backend Services](#backend-services)
5. [API Endpoints](#api-endpoints)
6. [Frontend Components](#frontend-components)
7. [Features](#features)
8. [Usage Examples](#usage-examples)
9. [Configuration](#configuration)
10. [Best Practices](#best-practices)

## Overview

The Review and Rating System provides comprehensive functionality for collecting, managing, and displaying customer reviews including:

- **Multi-dimensional Ratings**: Overall rating plus detailed ratings (value, guide, organization, experience)
- **Content Moderation**: Automatic and manual review moderation
- **User Engagement**: Helpful votes, responses, and flagging
- **Media Support**: Photos and videos in reviews
- **Analytics**: Rating aggregation, trends, and insights
- **Verified Reviews**: Automatic verification for completed bookings
- **Tour Operator Responses**: Official responses to reviews

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                           │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ RatingDisplay    │  │  ReviewList      │                 │
│  │   Component      │  │   Component      │                 │
│  └──────────────────┘  └──────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Review API (/api/reviews)                           │   │
│  │  - Review CRUD operations                            │   │
│  │  - Voting and flagging                               │   │
│  │  - Responses                                         │   │
│  │  - Rating summaries                                  │   │
│  │  - Admin moderation                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ReviewService                                       │   │
│  │  - Content validation                                │   │
│  │  - Automatic moderation                              │   │
│  │  - Rating aggregation                                │   │
│  │  - Analytics tracking                                │   │
│  │  - Vote management                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐        │
│  │  reviews    │  │review_votes │  │review_flags  │        │
│  └─────────────┘  └─────────────┘  └──────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐        │
│  │review_media │  │review_      │  │tour_rating_  │        │
│  │             │  │responses    │  │aggregates    │        │
│  └─────────────┘  └─────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Database Models

### Review

Main review entity with ratings and content.

```python
class Review:
    id: int
    user_id: int
    tour_id: int
    booking_id: int | None
    
    # Ratings (1-5)
    rating: int  # Overall rating
    value_rating: int | None
    guide_rating: int | None
    organization_rating: int | None
    experience_rating: int | None
    
    # Content
    title: str
    content: str
    pros: str | None
    cons: str | None
    
    # Traveler info
    traveler_type: str | None  # solo, couple, family, business, friends
    travel_date: date | None
    
    # Status
    status: ReviewStatus  # pending, approved, rejected, flagged, hidden
    is_verified_purchase: bool
    is_featured: bool
    
    # Engagement
    helpful_count: int
    not_helpful_count: int
    flag_count: int
    response_count: int
    
    # Timestamps
    created_at: datetime
    published_at: datetime | None
    moderated_at: datetime | None
    
    # Language
    language: str
```

**Status Flow:**
```
PENDING → APPROVED (published)
   ↓         ↓
REJECTED  FLAGGED → HIDDEN
```

### TourRatingAggregate

Denormalized rating statistics for performance.

```python
class TourRatingAggregate:
    tour_id: int
    
    # Overall stats
    total_reviews: int
    average_rating: Decimal  # 0.00 to 5.00
    
    # Distribution
    rating_5_count: int
    rating_4_count: int
    rating_3_count: int
    rating_2_count: int
    rating_1_count: int
    
    # Detailed averages
    average_value_rating: Decimal | None
    average_guide_rating: Decimal | None
    average_organization_rating: Decimal | None
    average_experience_rating: Decimal | None
    
    # Counts
    verified_reviews_count: int
    featured_reviews_count: int
    
    # Activity
    last_review_date: datetime | None
    updated_at: datetime
```

**Methods:**
- `get_rating_distribution()`: Returns dict of rating counts
- `get_rating_percentages()`: Returns dict of rating percentages

### ReviewMedia

Photos and videos attached to reviews.

```python
class ReviewMedia:
    id: int
    review_id: int
    media_type: MediaType  # image, video
    file_url: str
    thumbnail_url: str | None
    caption: str | None
    display_order: int
    is_approved: bool
```

### ReviewResponse

Tour operator or user responses to reviews.

```python
class ReviewResponse:
    id: int
    review_id: int
    user_id: int
    content: str
    is_official: bool  # From tour operator
    is_visible: bool
    created_at: datetime
```

### ReviewVote

Helpful/not helpful votes on reviews.

```python
class ReviewVote:
    id: int
    review_id: int
    user_id: int
    is_helpful: bool
    created_at: datetime
```

**Constraint:** One vote per user per review (enforced by unique constraint).

### ReviewFlagReport

User-reported inappropriate reviews.

```python
class ReviewFlagReport:
    id: int
    review_id: int
    user_id: int
    flag_reason: ReviewFlag  # spam, inappropriate, fake, off_topic, harassment, other
    description: str | None
    is_resolved: bool
    resolution_notes: str | None
    resolved_at: datetime | None
    resolved_by: int | None
```

### ReviewAnalytics

Daily/weekly/monthly review metrics.

```python
class ReviewAnalytics:
    id: int
    tour_id: int | None  # NULL = global
    date: date
    period_type: str  # daily, weekly, monthly
    
    # Metrics
    new_reviews: int
    total_reviews: int
    average_rating: Decimal | None
    total_votes: int
    total_responses: int
    total_flags: int
    verified_reviews: int
```

## Backend Services

### ReviewService

Core service for review management.

#### Review Creation

```python
async def create_review(
    user_id: int,
    tour_id: int,
    rating: int,
    title: str,
    content: str,
    booking_id: Optional[int] = None,
    # ... detailed ratings, traveler info, media
) -> Review:
    """
    Create a new review with validation.
    
    Validation:
    - Rating 1-5
    - Title >= 5 characters
    - Content >= 20 characters
    - No inappropriate content
    - User hasn't reviewed this tour from same booking
    - Booking is completed (if specified)
    
    Auto-moderation:
    - Verified reviews with good content auto-approved
    - Suspicious patterns flagged for manual review
    """
```

**Content Validation:**
- No URLs, phone numbers, or emails
- No spam keywords
- Minimum length requirements
- Character encoding validation

**Auto-Moderation Rules:**
- First-time reviewers → Manual review
- Very short 5-star reviews → Manual review
- Very long 1-star reviews → Manual review
- Verified + good content → Auto-approve

#### Moderation

```python
async def approve_review(
    review_id: int,
    moderator_id: Optional[int] = None,
    auto_approved: bool = False
) -> Review:
    """
    Approve review for publication.
    Triggers rating aggregate update.
    """

async def reject_review(
    review_id: int,
    moderator_id: int,
    reason: str
) -> Review:
    """Reject review with reason."""
```

#### Voting

```python
async def vote_review(
    review_id: int,
    user_id: int,
    is_helpful: bool
) -> ReviewVote:
    """
    Vote on review helpfulness.
    
    - Creates new vote or updates existing
    - Updates review helpful/not_helpful counts
    - One vote per user per review
    """
```

#### Flagging

```python
async def flag_review(
    review_id: int,
    user_id: int,
    flag_reason: ReviewFlag,
    description: Optional[str] = None
) -> ReviewFlagReport:
    """
    Flag review as inappropriate.
    
    - Auto-flags review if >= 3 flags
    - Changes status from APPROVED to FLAGGED
    """
```

#### Rating Aggregation

```python
async def _update_tour_rating_aggregate(tour_id: int):
    """
    Update aggregated rating statistics.
    
    Calculates:
    - Total reviews
    - Average rating
    - Rating distribution (1-5 star counts)
    - Detailed rating averages
    - Verified review count
    - Last review date
    """

async def get_tour_rating_summary(tour_id: int) -> Dict[str, Any]:
    """
    Get rating summary for display.
    
    Returns:
    - total_reviews
    - average_rating
    - rating_distribution
    - rating_percentages
    - detailed_ratings
    - verification stats
    """
```

#### Review Retrieval

```python
async def get_reviews(
    tour_id: Optional[int] = None,
    user_id: Optional[int] = None,
    status: Optional[ReviewStatus] = ReviewStatus.APPROVED,
    min_rating: Optional[int] = None,
    verified_only: bool = False,
    with_media: bool = False,
    sort_by: str = 'recent',  # recent, helpful, rating_high, rating_low
    limit: int = 20,
    offset: int = 0
) -> Tuple[List[Review], int]:
    """Get reviews with filtering, sorting, and pagination."""
```

## API Endpoints

### Public Review Endpoints

#### POST /api/reviews/

Create a new review.

**Request:**
```json
{
  "tour_id": 1,
  "booking_id": 123,
  "rating": 5,
  "title": "Amazing Jerusalem Tour!",
  "content": "Had an incredible experience on this tour. Our guide was knowledgeable...",
  "value_rating": 5,
  "guide_rating": 5,
  "organization_rating": 4,
  "experience_rating": 5,
  "traveler_type": "couple",
  "travel_date": "2025-10-15",
  "pros": "Excellent guide, well-organized",
  "cons": "Could be a bit longer",
  "language": "en"
}
```

**Response:**
```json
{
  "id": 456,
  "tour_id": 1,
  "rating": 5,
  "title": "Amazing Jerusalem Tour!",
  "status": "pending",
  "is_verified_purchase": true,
  "created_at": "2025-11-02T10:00:00Z"
}
```

#### GET /api/reviews/tour/{tour_id}

Get reviews for a tour with filtering and sorting.

**Query Parameters:**
- `min_rating`: Filter by minimum rating (1-5)
- `verified_only`: Only verified purchase reviews
- `with_media`: Only reviews with photos/videos
- `sort_by`: recent | helpful | rating_high | rating_low
- `limit`: Results per page (1-100, default 20)
- `offset`: Pagination offset

**Response:**
```json
{
  "reviews": [
    {
      "id": 456,
      "user_name": "John D.",
      "rating": 5,
      "title": "Amazing Jerusalem Tour!",
      "content": "Had an incredible experience...",
      "is_verified_purchase": true,
      "is_featured": false,
      "helpful_count": 12,
      "not_helpful_count": 1,
      "helpfulness_score": 0.92,
      "created_at": "2025-11-02T10:00:00Z",
      "media_count": 3,
      "has_response": true,
      "detailed_ratings": {
        "value": 5,
        "guide": 5,
        "organization": 4,
        "experience": 5
      }
    }
  ],
  "total": 127,
  "limit": 20,
  "offset": 0
}
```

#### GET /api/reviews/{review_id}

Get detailed information about a specific review.

#### PUT /api/reviews/{review_id}

Update own review.

#### DELETE /api/reviews/{review_id}

Delete own review (soft delete - status becomes HIDDEN).

### Engagement Endpoints

#### POST /api/reviews/{review_id}/vote

Vote on review helpfulness.

**Request:**
```json
{
  "is_helpful": true
}
```

#### POST /api/reviews/{review_id}/flag

Flag review as inappropriate.

**Request:**
```json
{
  "flag_reason": "spam",
  "description": "Contains promotional content"
}
```

#### POST /api/reviews/{review_id}/response

Add a response to a review.

**Request:**
```json
{
  "content": "Thank you for your feedback! We're glad you enjoyed..."
}
```

### Statistics Endpoints

#### GET /api/reviews/tour/{tour_id}/summary

Get rating summary and statistics.

**Response:**
```json
{
  "total_reviews": 127,
  "average_rating": 4.6,
  "rating_distribution": {
    "5": 85,
    "4": 30,
    "3": 8,
    "2": 3,
    "1": 1
  },
  "rating_percentages": {
    "5": 66.9,
    "4": 23.6,
    "3": 6.3,
    "2": 2.4,
    "1": 0.8
  },
  "verified_count": 98,
  "featured_count": 12,
  "detailed_ratings": {
    "value": 4.5,
    "guide": 4.8,
    "organization": 4.6,
    "experience": 4.7
  },
  "last_review_date": "2025-11-02T10:00:00Z"
}
```

### User Endpoints

#### GET /api/reviews/user/me

Get all reviews by current user.

### Admin Endpoints

#### POST /api/reviews/{review_id}/moderate

Moderate a review (approve or reject).

**Request:**
```json
{
  "action": "approve",
  "reason": "Content meets guidelines"
}
```

#### GET /api/reviews/admin/pending

Get reviews pending moderation.

#### GET /api/reviews/admin/flagged

Get flagged reviews.

## Frontend Components

### RatingDisplay Component

Visual display of ratings with stars.

**Props:**
```typescript
interface RatingDisplayProps {
  rating: number;  // 0-5
  totalReviews?: number;
  showCount?: boolean;
  size?: 'small' | 'medium' | 'large';
  interactive?: boolean;
  onChange?: (rating: number) => void;
}
```

**Features:**
- Partial star fill for decimal ratings
- Interactive mode for rating input
- Hover effects
- Accessible (ARIA labels, keyboard navigation)

**Usage:**
```tsx
import RatingDisplay from '@/components/RatingDisplay/RatingDisplay';

// Display rating
<RatingDisplay rating={4.6} totalReviews={127} />

// Interactive rating input
<RatingDisplay
  rating={currentRating}
  interactive
  onChange={(newRating) => setCurrentRating(newRating)}
/>
```

## Features

### 1. Multi-dimensional Ratings

- **Overall Rating**: 1-5 stars
- **Detailed Ratings**:
  - Value for money
  - Tour guide quality
  - Organization
  - Overall experience

### 2. Content Moderation

**Automatic Checks:**
- URL detection
- Phone/email detection
- Spam keyword matching
- Length validation
- Character encoding

**Manual Moderation:**
- Admin review queue
- Approval/rejection with notes
- Bulk moderation tools

**Auto-Approval Criteria:**
- Verified purchase
- Good content quality
- No suspicious patterns

### 3. User Engagement

- ✅ Helpful/Not Helpful votes
- ✅ Tour operator responses
- ✅ User comments
- ✅ Flag inappropriate content
- ✅ Share reviews

### 4. Media Support

- Photo uploads (up to 10 per review)
- Video uploads
- Thumbnail generation
- Caption support
- Moderation approval

### 5. Analytics & Insights

- Rating trends over time
- Sentiment analysis
- Common themes extraction
- Response rate tracking
- Engagement metrics

### 6. Verification

- Automatic verification for completed bookings
- "Verified Purchase" badge
- Higher trust weighting

## Usage Examples

### Creating a Review

```python
service = ReviewService(db)

review = await service.create_review(
    user_id=current_user.id,
    tour_id=1,
    rating=5,
    title="Amazing experience!",
    content="This was the best tour I've ever taken. The guide was knowledgeable...",
    booking_id=123,  # Links to verified booking
    value_rating=5,
    guide_rating=5,
    organization_rating=4,
    experience_rating=5,
    traveler_type="couple",
    travel_date=date(2025, 10, 15)
)
```

### Getting Tour Rating Summary

```python
summary = await service.get_tour_rating_summary(tour_id=1)

print(f"Average: {summary['average_rating']}")
print(f"Total: {summary['total_reviews']} reviews")
print(f"5 stars: {summary['rating_percentages'][5]}%")
```

### Moderating Reviews

```python
# Approve
await service.approve_review(
    review_id=456,
    moderator_id=admin_user.id
)

# Reject
await service.reject_review(
    review_id=457,
    moderator_id=admin_user.id,
    reason="Contains inappropriate language"
)
```

## Configuration

### Environment Variables

```bash
# Review Settings
REVIEW_MIN_LENGTH=20
REVIEW_MAX_LENGTH=5000
REVIEW_AUTO_APPROVE_VERIFIED=true
REVIEW_FLAG_THRESHOLD=3

# Moderation
REVIEW_MODERATION_QUEUE_SIZE=50
REVIEW_AUTO_REJECT_SPAM=false

# Media
REVIEW_MAX_PHOTOS=10
REVIEW_MAX_VIDEO_SIZE_MB=50
REVIEW_ALLOWED_FORMATS=jpg,png,mp4
```

## Best Practices

### 1. Content Quality

```python
# Validate before saving
if len(content.strip()) < 20:
    raise ValidationError("Review too short")

# Check for inappropriate content
if contains_inappropriate_content(content):
    review.status = ReviewStatus.PENDING
```

### 2. Performance Optimization

```python
# Use aggregates instead of live calculations
aggregate = db.query(TourRatingAggregate).filter(
    TourRatingAggregate.tour_id == tour_id
).first()

# Cache expensive queries
@cache.memoize(timeout=300)
def get_featured_reviews(tour_id):
    return db.query(Review).filter(
        Review.tour_id == tour_id,
        Review.is_featured == True
    ).limit(3).all()
```

### 3. User Experience

```python
# Always show verified badge
if review.is_verified_purchase:
    badge = "✓ Verified Purchase"

# Highlight helpful reviews
if review.calculate_helpfulness_score() > 0.8:
    display_prominence = "high"
```

### 4. Security

```python
# Check ownership before modification
if review.user_id != current_user.id and not current_user.is_admin:
    raise PermissionError()

# Sanitize content
content = bleach.clean(
    content,
    tags=[],  # No HTML tags allowed
    strip=True
)
```

## Migration

Run the review system migration:

```bash
cd backend
alembic upgrade head
```

This creates:
- `reviews` table
- `review_media` table
- `review_responses` table
- `review_votes` table
- `review_flags` table
- `tour_rating_aggregates` table
- `review_insights` table
- `review_analytics` table
- All necessary indexes and constraints

## Summary

The Review and Rating System provides:

✅ **Comprehensive rating system** with multi-dimensional ratings  
✅ **Intelligent moderation** with automatic and manual approval  
✅ **User engagement** with votes, responses, and flagging  
✅ **Media support** for photos and videos  
✅ **Performance optimization** with denormalized aggregates  
✅ **Analytics and insights** for continuous improvement  
✅ **Verification system** for trusted reviews  
✅ **Flexible filtering** and sorting options  
✅ **Admin tools** for moderation and management  

The system is designed to build trust, encourage engagement, and provide valuable feedback for both customers and tour operators.
