"""
Elasticsearch Search Module

Provides advanced search capabilities for Spirit Tours.
"""

from .elasticsearch_service import ElasticsearchService
from .search_models import SearchQuery, SearchResult, SearchFilters

__all__ = [
    'ElasticsearchService',
    'SearchQuery',
    'SearchResult',
    'SearchFilters'
]
