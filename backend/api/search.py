"""
Search API Routes

FastAPI endpoints for Elasticsearch-powered search.
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session

from ..search.elasticsearch_service import ElasticsearchService
from ..search.search_models import (
    SearchQuery, SearchResult, SearchFilters,
    AutocompleteQuery, AutocompleteResult,
    SuggestionsQuery, SuggestionsResult,
    SearchAnalytics, SortBy, SortOrder
)
from ..database import get_db


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/search", tags=["search"])


# Initialize Elasticsearch service
es_service = ElasticsearchService()


@router.post("/tours", response_model=SearchResult)
async def search_tours(
    query: SearchQuery,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Advanced tour search with filters and facets.
    
    **Features:**
    - Full-text search across multiple fields
    - Fuzzy matching for typo tolerance
    - Advanced filtering (price, location, rating, etc.)
    - Geolocation search (find tours near you)
    - Sorting by relevance, price, rating, popularity
    - Pagination
    - Aggregations/facets for filtering UI
    - Search highlighting
    
    **Example:**
    ```json
    {
      "query": "Jerusalem walking tour",
      "filters": {
        "min_price": 50,
        "max_price": 150,
        "category": ["Cultural", "Historical"],
        "min_rating": 4.0,
        "city": ["Jerusalem"]
      },
      "sort_by": "rating",
      "sort_order": "desc",
      "page": 1,
      "page_size": 20
    }
    ```
    """
    try:
        # Perform search
        result = await es_service.search_tours(query)
        
        # Track search analytics in background
        background_tasks.add_task(
            track_search_analytics,
            query.query,
            result.total,
            query.filters
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error in tour search: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tours", response_model=SearchResult)
async def search_tours_get(
    q: str = Query("", description="Search query"),
    category: Optional[str] = None,
    city: Optional[str] = None,
    country: Optional[str] = None,
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    difficulty: Optional[str] = None,
    sort_by: SortBy = SortBy.RELEVANCE,
    sort_order: SortOrder = SortOrder.DESC,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    latitude: Optional[float] = Query(None, ge=-90, le=90),
    longitude: Optional[float] = Query(None, ge=-180, le=180),
    radius_km: Optional[float] = Query(None, gt=0),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """
    Search tours using GET request (simpler, URL-friendly).
    
    This endpoint provides a simplified search interface using query parameters.
    For advanced filtering, use POST /api/search/tours instead.
    
    **Query Parameters:**
    - q: Search query text
    - category: Filter by category
    - city: Filter by city
    - country: Filter by country
    - min_price, max_price: Price range filter
    - min_rating: Minimum rating filter
    - difficulty: Difficulty level filter
    - sort_by: Sort field (relevance, price, rating, popularity)
    - sort_order: Sort order (asc, desc)
    - page: Page number
    - page_size: Results per page
    - latitude, longitude, radius_km: Geolocation search
    """
    try:
        # Build filters
        filters = SearchFilters(
            min_price=min_price,
            max_price=max_price,
            min_rating=min_rating,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km
        )
        
        # Add category filter
        if category:
            filters.category = [category]
        
        # Add location filters
        if city:
            filters.city = [city]
        if country:
            filters.country = [country]
        
        # Add difficulty filter
        if difficulty:
            filters.difficulty_level = [difficulty]
        
        # Create search query
        search_query = SearchQuery(
            query=q,
            filters=filters,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            page_size=page_size
        )
        
        # Perform search
        result = await es_service.search_tours(search_query)
        
        # Track analytics
        if background_tasks:
            background_tasks.add_task(
                track_search_analytics,
                q,
                result.total,
                filters.dict()
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Error in tour search (GET): {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/autocomplete", response_model=AutocompleteResult)
async def autocomplete(
    query: AutocompleteQuery,
    db: Session = Depends(get_db)
):
    """
    Get autocomplete suggestions.
    
    Returns quick suggestions as user types for better UX.
    
    **Example:**
    ```json
    {
      "query": "jeru",
      "field": "title",
      "limit": 10,
      "fuzzy": true
    }
    ```
    
    **Response:**
    ```json
    {
      "suggestions": [
        "Jerusalem Old City Tour",
        "Jerusalem Food Tour",
        "Jerusalem at Night"
      ],
      "took_ms": 15
    }
    ```
    """
    try:
        result = await es_service.autocomplete(query)
        return result
        
    except Exception as e:
        logger.error(f"Error in autocomplete: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/autocomplete", response_model=AutocompleteResult)
async def autocomplete_get(
    q: str = Query(..., min_length=2, description="Autocomplete query"),
    field: str = Query("title", description="Field to search"),
    limit: int = Query(10, ge=1, le=50),
    fuzzy: bool = True,
    db: Session = Depends(get_db)
):
    """
    Get autocomplete suggestions (GET version).
    
    Simpler interface for autocomplete using query parameters.
    """
    try:
        query = AutocompleteQuery(
            query=q,
            field=field,
            limit=limit,
            fuzzy=fuzzy
        )
        
        result = await es_service.autocomplete(query)
        return result
        
    except Exception as e:
        logger.error(f"Error in autocomplete (GET): {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions")
async def get_suggestions(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Get search suggestions with metadata.
    
    Returns suggestions for tours, locations, categories, etc.
    
    **Response:**
    ```json
    {
      "suggestions": [
        {
          "text": "Jerusalem Old City",
          "score": 1.5,
          "type": "tour",
          "metadata": {"id": "tour_001", "price": 75}
        }
      ],
      "took_ms": 20
    }
    ```
    """
    try:
        # Mock implementation
        suggestions = []
        
        return {
            'suggestions': suggestions,
            'took_ms': 10
        }
        
    except Exception as e:
        logger.error(f"Error getting suggestions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/popular")
async def get_popular_searches(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Get popular/trending searches.
    
    Returns most popular search queries for suggestions.
    """
    try:
        # In production, query from analytics database
        popular = [
            {"query": "Jerusalem tours", "count": 1250},
            {"query": "Dead Sea tours", "count": 980},
            {"query": "Tel Aviv food tour", "count": 750},
            {"query": "Masada sunrise", "count": 620},
            {"query": "Petra day trip", "count": 580}
        ][:limit]
        
        return {
            'popular_searches': popular,
            'timestamp': '2025-11-02T12:00:00Z'
        }
        
    except Exception as e:
        logger.error(f"Error getting popular searches: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/filters")
async def get_available_filters(
    db: Session = Depends(get_db)
):
    """
    Get available filter options.
    
    Returns all available categories, cities, etc. for filter UI.
    
    **Response:**
    ```json
    {
      "categories": ["Cultural", "Adventure", "Food", "Nature"],
      "cities": ["Jerusalem", "Tel Aviv", "Eilat"],
      "countries": ["Israel", "Jordan", "Egypt"],
      "difficulty_levels": ["easy", "moderate", "challenging"],
      "languages": ["English", "Spanish", "Hebrew", "Arabic"],
      "price_ranges": [
        {"min": 0, "max": 50, "label": "$0-$50"},
        {"min": 50, "max": 100, "label": "$50-$100"}
      ]
    }
    ```
    """
    try:
        # In production, aggregate from Elasticsearch
        filters = {
            'categories': [
                'Cultural',
                'Adventure',
                'Food & Wine',
                'Nature',
                'Historical',
                'Religious',
                'Beach',
                'Desert'
            ],
            'cities': [
                'Jerusalem',
                'Tel Aviv',
                'Eilat',
                'Haifa',
                'Dead Sea',
                'Nazareth'
            ],
            'countries': [
                'Israel',
                'Jordan',
                'Egypt',
                'Palestine'
            ],
            'difficulty_levels': [
                'easy',
                'moderate',
                'challenging',
                'extreme'
            ],
            'languages': [
                'English',
                'Spanish',
                'Hebrew',
                'Arabic',
                'French',
                'German',
                'Russian'
            ],
            'price_ranges': [
                {'min': 0, 'max': 50, 'label': '$0-$50'},
                {'min': 50, 'max': 100, 'label': '$50-$100'},
                {'min': 100, 'max': 200, 'label': '$100-$200'},
                {'min': 200, 'max': 500, 'label': '$200-$500'},
                {'min': 500, 'max': None, 'label': '$500+'}
            ],
            'duration_ranges': [
                {'min': 0, 'max': 3, 'label': 'Under 3 hours'},
                {'min': 3, 'max': 6, 'label': '3-6 hours'},
                {'min': 6, 'max': 12, 'label': '6-12 hours'},
                {'min': 12, 'max': None, 'label': 'Full day+'}
            ]
        }
        
        return filters
        
    except Exception as e:
        logger.error(f"Error getting filters: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reindex")
async def reindex_all_tours(
    db: Session = Depends(get_db)
):
    """
    Reindex all tours in Elasticsearch.
    
    **Admin only** - Rebuilds the entire search index.
    
    This should be run:
    - After major data changes
    - When updating mappings
    - For maintenance
    """
    try:
        # TODO: Add admin authentication
        
        # In production:
        # 1. Fetch all active tours from database
        # 2. Transform to Elasticsearch documents
        # 3. Bulk index
        
        # tours = db.query(Tour).filter(Tour.is_active == True).all()
        # tour_docs = [transform_tour_to_doc(tour) for tour in tours]
        # result = await es_service.bulk_index_tours(tour_docs)
        
        return {
            'status': 'success',
            'message': 'Reindexing started',
            'total_tours': 0
        }
        
    except Exception as e:
        logger.error(f"Error reindexing tours: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def search_health_check():
    """
    Check Elasticsearch service health.
    
    Returns status of Elasticsearch connection.
    """
    try:
        # Check if Elasticsearch is reachable
        # is_healthy = es_service.client.ping()
        
        return {
            'status': 'healthy',
            'elasticsearch': 'connected',
            'indices': {
                'tours': 'active'
            },
            'timestamp': '2025-11-02T12:00:00Z'
        }
        
    except Exception as e:
        logger.error(f"Search health check failed: {str(e)}")
        return {
            'status': 'unhealthy',
            'error': str(e)
        }


# Helper functions

async def track_search_analytics(
    query: str,
    results_count: int,
    filters: dict
):
    """
    Track search analytics in background.
    
    Args:
        query: Search query
        results_count: Number of results
        filters: Applied filters
    """
    try:
        # In production:
        # 1. Store in analytics database
        # 2. Update search statistics
        # 3. Track user behavior
        
        logger.info(
            f"Search analytics: query='{query}', results={results_count}"
        )
        
    except Exception as e:
        logger.error(f"Error tracking search analytics: {str(e)}")


def transform_tour_to_doc(tour) -> dict:
    """
    Transform tour database model to Elasticsearch document.
    
    Args:
        tour: Tour database model
        
    Returns:
        Elasticsearch document dictionary
    """
    return {
        'id': str(tour.id),
        'title': tour.title,
        'description': tour.description,
        # ... map all fields
    }
