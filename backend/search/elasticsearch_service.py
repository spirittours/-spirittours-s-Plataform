"""
Elasticsearch Service

Main service for Elasticsearch operations including indexing,
searching, and aggregations.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import math

from .elasticsearch_config import config
from .search_models import (
    SearchQuery, SearchResult, TourSearchResult,
    AutocompleteQuery, AutocompleteResult,
    SearchAggregation, SuggestionsQuery,
    SuggestionsResult, SearchSuggestion
)


logger = logging.getLogger(__name__)


class ElasticsearchService:
    """
    Elasticsearch service for tour search functionality.
    
    Provides methods for:
    - Index management
    - Document indexing
    - Advanced search
    - Autocomplete
    - Aggregations
    """
    
    def __init__(self):
        """Initialize Elasticsearch service"""
        self.config = config
        self.client = None
        self._connect()
    
    def _connect(self):
        """
        Connect to Elasticsearch.
        
        In production, this would use the elasticsearch-py library:
        from elasticsearch import Elasticsearch
        self.client = Elasticsearch(**self.config.get_connection_config())
        """
        # Simulated connection for development
        logger.info(f"Connected to Elasticsearch at {self.config.ELASTICSEARCH_HOST}")
        self.client = MockElasticsearchClient()
    
    async def create_index(
        self,
        index_name: str,
        mapping: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Create an index with optional mapping.
        
        Args:
            index_name: Name of the index
            mapping: Index mapping
            
        Returns:
            True if successful
        """
        try:
            # In production:
            # if not self.client.indices.exists(index=index_name):
            #     self.client.indices.create(
            #         index=index_name,
            #         body={
            #             'settings': self.config.get_index_settings(),
            #             'mappings': mapping or self.config.get_tours_mapping()
            #         }
            #     )
            
            logger.info(f"Created index: {index_name}")
            return True
            
        except Exception as e:
            logger.error(f"Error creating index {index_name}: {str(e)}")
            return False
    
    async def index_tour(
        self,
        tour_id: str,
        tour_data: Dict[str, Any]
    ) -> bool:
        """
        Index a single tour document.
        
        Args:
            tour_id: Tour ID
            tour_data: Tour data dictionary
            
        Returns:
            True if successful
        """
        try:
            # In production:
            # self.client.index(
            #     index=self.config.TOURS_INDEX,
            #     id=tour_id,
            #     body=tour_data
            # )
            
            logger.info(f"Indexed tour: {tour_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error indexing tour {tour_id}: {str(e)}")
            return False
    
    async def bulk_index_tours(
        self,
        tours: List[Dict[str, Any]]
    ) -> Dict[str, int]:
        """
        Bulk index multiple tours.
        
        Args:
            tours: List of tour dictionaries
            
        Returns:
            Dictionary with success/failure counts
        """
        try:
            # In production:
            # from elasticsearch.helpers import bulk
            # actions = [
            #     {
            #         '_index': self.config.TOURS_INDEX,
            #         '_id': tour['id'],
            #         '_source': tour
            #     }
            #     for tour in tours
            # ]
            # success, failed = bulk(self.client, actions)
            
            logger.info(f"Bulk indexed {len(tours)} tours")
            return {'success': len(tours), 'failed': 0}
            
        except Exception as e:
            logger.error(f"Error bulk indexing tours: {str(e)}")
            return {'success': 0, 'failed': len(tours)}
    
    async def delete_tour(self, tour_id: str) -> bool:
        """
        Delete a tour from the index.
        
        Args:
            tour_id: Tour ID
            
        Returns:
            True if successful
        """
        try:
            # In production:
            # self.client.delete(
            #     index=self.config.TOURS_INDEX,
            #     id=tour_id
            # )
            
            logger.info(f"Deleted tour: {tour_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting tour {tour_id}: {str(e)}")
            return False
    
    async def search_tours(
        self,
        search_query: SearchQuery
    ) -> SearchResult:
        """
        Search tours with advanced filters.
        
        Args:
            search_query: Search query with filters
            
        Returns:
            Search results
        """
        start_time = datetime.utcnow()
        
        try:
            # Build Elasticsearch query
            es_query = self._build_search_query(search_query)
            
            # In production:
            # response = self.client.search(
            #     index=self.config.TOURS_INDEX,
            #     body=es_query,
            #     from_=search_query.offset,
            #     size=search_query.page_size
            # )
            
            # Simulated response
            response = self._get_mock_search_response(search_query)
            
            # Parse response
            result = self._parse_search_response(
                response,
                search_query,
                start_time
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error searching tours: {str(e)}")
            raise
    
    def _build_search_query(
        self,
        search_query: SearchQuery
    ) -> Dict[str, Any]:
        """
        Build Elasticsearch query from search query.
        
        Args:
            search_query: Search query
            
        Returns:
            Elasticsearch query dictionary
        """
        query = {
            'bool': {
                'must': [],
                'filter': [],
                'should': [],
                'must_not': []
            }
        }
        
        # Text search
        if search_query.query:
            if search_query.fuzzy:
                query['bool']['must'].append({
                    'multi_match': {
                        'query': search_query.query,
                        'fields': [
                            'title^3',
                            'description^2',
                            'location_name^2',
                            'tags',
                            'highlights'
                        ],
                        'fuzziness': 'AUTO',
                        'operator': 'or'
                    }
                })
            else:
                query['bool']['must'].append({
                    'multi_match': {
                        'query': search_query.query,
                        'fields': [
                            'title^3',
                            'description^2',
                            'location_name^2'
                        ]
                    }
                })
        
        # Apply filters
        filters = search_query.filters
        if filters:
            # Price range
            if filters.min_price is not None or filters.max_price is not None:
                price_filter = {'range': {'price': {}}}
                if filters.min_price is not None:
                    price_filter['range']['price']['gte'] = filters.min_price
                if filters.max_price is not None:
                    price_filter['range']['price']['lte'] = filters.max_price
                query['bool']['filter'].append(price_filter)
            
            # Duration
            if filters.min_duration_hours is not None or filters.max_duration_hours is not None:
                duration_filter = {'range': {'duration_hours': {}}}
                if filters.min_duration_hours is not None:
                    duration_filter['range']['duration_hours']['gte'] = filters.min_duration_hours
                if filters.max_duration_hours is not None:
                    duration_filter['range']['duration_hours']['lte'] = filters.max_duration_hours
                query['bool']['filter'].append(duration_filter)
            
            # Location filters
            if filters.city:
                query['bool']['filter'].append({
                    'terms': {'city': filters.city}
                })
            
            if filters.country:
                query['bool']['filter'].append({
                    'terms': {'country': filters.country}
                })
            
            # Geolocation search
            if all([filters.latitude, filters.longitude, filters.radius_km]):
                query['bool']['filter'].append({
                    'geo_distance': {
                        'distance': f'{filters.radius_km}km',
                        'location': {
                            'lat': filters.latitude,
                            'lon': filters.longitude
                        }
                    }
                })
            
            # Category
            if filters.category:
                query['bool']['filter'].append({
                    'terms': {'category': filters.category}
                })
            
            # Tags
            if filters.tags:
                query['bool']['filter'].append({
                    'terms': {'tags': filters.tags}
                })
            
            # Difficulty
            if filters.difficulty_level:
                query['bool']['filter'].append({
                    'terms': {'difficulty_level': [d.value for d in filters.difficulty_level]}
                })
            
            # Rating
            if filters.min_rating is not None:
                query['bool']['filter'].append({
                    'range': {'rating': {'gte': filters.min_rating}}
                })
            
            # Languages
            if filters.languages:
                query['bool']['filter'].append({
                    'terms': {'languages': filters.languages}
                })
            
            # Featured
            if filters.is_featured is not None:
                query['bool']['filter'].append({
                    'term': {'is_featured': filters.is_featured}
                })
            
            # Active
            if filters.is_active is not None:
                query['bool']['filter'].append({
                    'term': {'is_active': filters.is_active}
                })
        
        # Build complete query
        es_query = {
            'query': query,
            'sort': [
                {search_query.sort_by.value: {'order': search_query.sort_order.value}}
            ]
        }
        
        # Highlights
        if search_query.include_highlights and search_query.query:
            es_query['highlight'] = {
                'fields': {
                    'title': {},
                    'description': {},
                    'location_name': {}
                }
            }
        
        # Aggregations
        if search_query.include_aggregations:
            es_query['aggs'] = self._build_aggregations()
        
        return es_query
    
    def _build_aggregations(self) -> Dict[str, Any]:
        """Build aggregations for faceted search"""
        return {
            'categories': {
                'terms': {'field': 'category', 'size': 20}
            },
            'cities': {
                'terms': {'field': 'city', 'size': 50}
            },
            'countries': {
                'terms': {'field': 'country', 'size': 20}
            },
            'difficulty': {
                'terms': {'field': 'difficulty_level', 'size': 10}
            },
            'languages': {
                'terms': {'field': 'languages', 'size': 20}
            },
            'price_ranges': {
                'range': {
                    'field': 'price',
                    'ranges': [
                        {'to': 50},
                        {'from': 50, 'to': 100},
                        {'from': 100, 'to': 200},
                        {'from': 200, 'to': 500},
                        {'from': 500}
                    ]
                }
            },
            'ratings': {
                'range': {
                    'field': 'rating',
                    'ranges': [
                        {'from': 4.5},
                        {'from': 4, 'to': 4.5},
                        {'from': 3, 'to': 4},
                        {'to': 3}
                    ]
                }
            }
        }
    
    def _get_mock_search_response(
        self,
        search_query: SearchQuery
    ) -> Dict[str, Any]:
        """Generate mock search response for development"""
        # Simulated search results
        return {
            'took': 15,
            'hits': {
                'total': {'value': 42},
                'hits': [
                    {
                        '_id': 'tour_001',
                        '_score': 1.5,
                        '_source': {
                            'id': 'tour_001',
                            'title': 'Jerusalem Old City Walking Tour',
                            'description': 'Explore the ancient streets of Jerusalem',
                            'short_description': 'Historic walking tour',
                            'category': 'Cultural',
                            'tags': ['history', 'walking', 'religious'],
                            'location_name': 'Jerusalem Old City',
                            'city': 'Jerusalem',
                            'country': 'Israel',
                            'price': 75.0,
                            'currency': 'USD',
                            'duration_hours': 3.0,
                            'max_participants': 20,
                            'min_participants': 2,
                            'rating': 4.8,
                            'reviews_count': 156,
                            'booking_count': 450,
                            'difficulty_level': 'easy',
                            'languages': ['English', 'Spanish', 'Hebrew'],
                            'is_featured': True,
                            'availability': 'daily',
                            'guide_name': 'David Cohen',
                            'images': [{'url': '/images/tour1.jpg'}],
                            'created_at': '2024-01-15T10:00:00Z',
                            'updated_at': '2024-11-01T15:30:00Z'
                        }
                    }
                ]
            },
            'aggregations': {
                'categories': {
                    'buckets': [
                        {'key': 'Cultural', 'doc_count': 15},
                        {'key': 'Adventure', 'doc_count': 12}
                    ]
                }
            }
        }
    
    def _parse_search_response(
        self,
        response: Dict[str, Any],
        search_query: SearchQuery,
        start_time: datetime
    ) -> SearchResult:
        """Parse Elasticsearch response into SearchResult"""
        
        # Extract tours
        tours = []
        for hit in response['hits']['hits']:
            source = hit['_source']
            tour = TourSearchResult(
                **source,
                score=hit.get('_score'),
                highlights=hit.get('highlight'),
                main_image=source.get('images', [{}])[0].get('url') if source.get('images') else None
            )
            tours.append(tour)
        
        # Calculate pagination
        total = response['hits']['total']['value']
        total_pages = math.ceil(total / search_query.page_size)
        
        # Parse aggregations
        aggregations = None
        if search_query.include_aggregations and 'aggregations' in response:
            aggregations = {}
            for field, agg_data in response['aggregations'].items():
                aggregations[field] = SearchAggregation(
                    field=field,
                    buckets=agg_data.get('buckets', []),
                    total=sum(b.get('doc_count', 0) for b in agg_data.get('buckets', []))
                )
        
        # Calculate elapsed time
        took_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        return SearchResult(
            tours=tours,
            total=total,
            page=search_query.page,
            page_size=search_query.page_size,
            total_pages=total_pages,
            has_next=search_query.page < total_pages,
            has_previous=search_query.page > 1,
            took_ms=took_ms,
            query=search_query.query,
            aggregations=aggregations
        )
    
    async def autocomplete(
        self,
        query: AutocompleteQuery
    ) -> AutocompleteResult:
        """
        Get autocomplete suggestions.
        
        Args:
            query: Autocomplete query
            
        Returns:
            Autocomplete results
        """
        start_time = datetime.utcnow()
        
        try:
            # In production, use completion suggester or prefix query
            # es_query = {
            #     'suggest': {
            #         'tour-suggest': {
            #             'prefix': query.query,
            #             'completion': {
            #                 'field': f'{query.field}.autocomplete',
            #                 'size': query.limit,
            #                 'fuzzy': {'fuzziness': 'AUTO'} if query.fuzzy else {}
            #             }
            #         }
            #     }
            # }
            
            # Mock suggestions
            suggestions = [
                'Jerusalem Old City Tour',
                'Jerusalem Food Tour',
                'Jerusalem at Night'
            ][:query.limit]
            
            took_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            return AutocompleteResult(
                suggestions=suggestions,
                took_ms=took_ms
            )
            
        except Exception as e:
            logger.error(f"Error in autocomplete: {str(e)}")
            raise


class MockElasticsearchClient:
    """Mock Elasticsearch client for development"""
    
    def __init__(self):
        self.indices = MockIndices()
    
    def ping(self) -> bool:
        return True


class MockIndices:
    """Mock indices manager"""
    
    def exists(self, index: str) -> bool:
        return False
    
    def create(self, index: str, body: Dict[str, Any]) -> Dict[str, Any]:
        return {'acknowledged': True}
