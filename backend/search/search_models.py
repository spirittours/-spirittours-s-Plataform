"""
Search Models

Pydantic models for search requests and responses.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, date
from enum import Enum
from pydantic import BaseModel, Field


class SortOrder(str, Enum):
    """Sort order options"""
    ASC = "asc"
    DESC = "desc"


class SortBy(str, Enum):
    """Available sort fields"""
    RELEVANCE = "_score"
    PRICE = "price"
    RATING = "rating"
    POPULARITY = "popularity_score"
    DATE_CREATED = "created_at"
    TITLE = "title.keyword"
    DURATION = "duration_hours"


class DifficultyLevel(str, Enum):
    """Tour difficulty levels"""
    EASY = "easy"
    MODERATE = "moderate"
    CHALLENGING = "challenging"
    EXTREME = "extreme"


class SearchFilters(BaseModel):
    """
    Search filters for advanced tour search.
    """
    # Price range
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = "USD"
    
    # Duration
    min_duration_hours: Optional[float] = Field(None, ge=0)
    max_duration_hours: Optional[float] = Field(None, ge=0)
    min_duration_days: Optional[int] = Field(None, ge=0)
    max_duration_days: Optional[int] = Field(None, ge=0)
    
    # Location
    city: Optional[List[str]] = None
    country: Optional[List[str]] = None
    
    # Geolocation search
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    radius_km: Optional[float] = Field(None, gt=0)
    
    # Category and tags
    category: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    
    # Difficulty
    difficulty_level: Optional[List[DifficultyLevel]] = None
    
    # Rating
    min_rating: Optional[float] = Field(None, ge=0, le=5)
    
    # Participants
    min_participants: Optional[int] = Field(None, ge=1)
    max_participants: Optional[int] = Field(None, ge=1)
    
    # Availability
    available_from: Optional[date] = None
    available_to: Optional[date] = None
    
    # Languages
    languages: Optional[List[str]] = None
    
    # Features
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = True
    has_guide: Optional[bool] = None
    
    # Booking info
    min_booking_count: Optional[int] = Field(None, ge=0)


class SearchQuery(BaseModel):
    """
    Search query with filters and pagination.
    """
    # Query text
    query: str = Field("", description="Search query text")
    
    # Filters
    filters: Optional[SearchFilters] = Field(default_factory=SearchFilters)
    
    # Sorting
    sort_by: SortBy = SortBy.RELEVANCE
    sort_order: SortOrder = SortOrder.DESC
    
    # Pagination
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
    
    # Search options
    include_highlights: bool = True
    include_aggregations: bool = True
    fuzzy: bool = True
    
    @property
    def offset(self) -> int:
        """Calculate offset from page number"""
        return (self.page - 1) * self.page_size


class TourSearchResult(BaseModel):
    """
    Individual tour search result.
    """
    id: str
    title: str
    description: str
    short_description: Optional[str] = None
    category: str
    tags: List[str] = []
    
    # Location
    location_name: str
    city: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # Pricing
    price: float
    currency: str
    
    # Duration
    duration_hours: Optional[float] = None
    duration_days: Optional[int] = None
    
    # Capacity
    max_participants: int
    min_participants: int
    
    # Quality metrics
    rating: Optional[float] = None
    reviews_count: int = 0
    booking_count: int = 0
    
    # Features
    difficulty_level: Optional[str] = None
    languages: List[str] = []
    is_featured: bool = False
    availability: str
    
    # Guide info
    guide_id: Optional[str] = None
    guide_name: Optional[str] = None
    
    # Images
    images: List[Dict[str, str]] = []
    main_image: Optional[str] = None
    
    # Metadata
    created_at: datetime
    updated_at: datetime
    
    # Search metadata
    score: Optional[float] = None
    highlights: Optional[Dict[str, List[str]]] = None


class SearchAggregation(BaseModel):
    """
    Search aggregation/facet result.
    """
    field: str
    buckets: List[Dict[str, Any]]
    total: int


class SearchResult(BaseModel):
    """
    Complete search result with tours and metadata.
    """
    # Results
    tours: List[TourSearchResult]
    total: int
    
    # Pagination
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool
    
    # Search metadata
    took_ms: int
    query: str
    
    # Aggregations/Facets
    aggregations: Optional[Dict[str, SearchAggregation]] = None
    
    # Suggestions (for autocomplete)
    suggestions: Optional[List[str]] = None


class AutocompleteQuery(BaseModel):
    """
    Autocomplete query model.
    """
    query: str = Field(..., min_length=2, description="Autocomplete query")
    field: str = Field("title", description="Field to search")
    limit: int = Field(10, ge=1, le=50)
    fuzzy: bool = True


class AutocompleteResult(BaseModel):
    """
    Autocomplete result.
    """
    suggestions: List[str]
    took_ms: int


class SearchSuggestion(BaseModel):
    """
    Search suggestion with metadata.
    """
    text: str
    score: float
    type: str  # tour, location, category, etc.
    metadata: Optional[Dict[str, Any]] = None


class SuggestionsQuery(BaseModel):
    """
    Query for search suggestions.
    """
    query: str = Field(..., min_length=1)
    limit: int = Field(10, ge=1, le=50)
    types: Optional[List[str]] = None  # Filter by suggestion type


class SuggestionsResult(BaseModel):
    """
    Search suggestions result.
    """
    suggestions: List[SearchSuggestion]
    took_ms: int


class SearchAnalytics(BaseModel):
    """
    Search analytics data.
    """
    query: str
    results_count: int
    clicked_result: Optional[str] = None  # tour_id if clicked
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user_id: Optional[str] = None
    filters_applied: Optional[Dict[str, Any]] = None
    took_ms: int
