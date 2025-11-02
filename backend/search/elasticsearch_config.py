"""
Elasticsearch Configuration

Configuration settings for Elasticsearch connection and indexing.
"""

import os
from typing import Dict, Any


class ElasticsearchConfig:
    """
    Elasticsearch configuration settings.
    
    Supports both single-node and cluster configurations.
    """
    
    # Connection settings
    ELASTICSEARCH_HOST = os.getenv('ELASTICSEARCH_HOST', 'localhost')
    ELASTICSEARCH_PORT = int(os.getenv('ELASTICSEARCH_PORT', '9200'))
    ELASTICSEARCH_SCHEME = os.getenv('ELASTICSEARCH_SCHEME', 'http')
    
    # Authentication (if required)
    ELASTICSEARCH_USERNAME = os.getenv('ELASTICSEARCH_USERNAME', '')
    ELASTICSEARCH_PASSWORD = os.getenv('ELASTICSEARCH_PASSWORD', '')
    
    # API key authentication (alternative to username/password)
    ELASTICSEARCH_API_KEY = os.getenv('ELASTICSEARCH_API_KEY', '')
    
    # Cloud ID (for Elastic Cloud)
    ELASTICSEARCH_CLOUD_ID = os.getenv('ELASTICSEARCH_CLOUD_ID', '')
    
    # Index settings
    TOURS_INDEX = 'spirit_tours_tours'
    BOOKINGS_INDEX = 'spirit_tours_bookings'
    CUSTOMERS_INDEX = 'spirit_tours_customers'
    
    # Search settings
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100
    SEARCH_TIMEOUT = 30  # seconds
    
    # Index settings
    NUMBER_OF_SHARDS = 1
    NUMBER_OF_REPLICAS = 1
    
    # Analysis settings
    DEFAULT_ANALYZER = 'standard'
    AUTOCOMPLETE_ANALYZER = 'autocomplete'
    
    @classmethod
    def get_connection_config(cls) -> Dict[str, Any]:
        """
        Get Elasticsearch connection configuration.
        
        Returns:
            Dictionary with connection parameters
        """
        config = {}
        
        # Cloud ID takes precedence
        if cls.ELASTICSEARCH_CLOUD_ID:
            config['cloud_id'] = cls.ELASTICSEARCH_CLOUD_ID
        else:
            # Use host/port configuration
            config['hosts'] = [
                {
                    'host': cls.ELASTICSEARCH_HOST,
                    'port': cls.ELASTICSEARCH_PORT,
                    'scheme': cls.ELASTICSEARCH_SCHEME
                }
            ]
        
        # API key authentication
        if cls.ELASTICSEARCH_API_KEY:
            config['api_key'] = cls.ELASTICSEARCH_API_KEY
        # Basic authentication
        elif cls.ELASTICSEARCH_USERNAME and cls.ELASTICSEARCH_PASSWORD:
            config['basic_auth'] = (
                cls.ELASTICSEARCH_USERNAME,
                cls.ELASTICSEARCH_PASSWORD
            )
        
        # Additional settings
        config['request_timeout'] = cls.SEARCH_TIMEOUT
        config['retry_on_timeout'] = True
        config['max_retries'] = 3
        
        return config
    
    @classmethod
    def get_index_settings(cls) -> Dict[str, Any]:
        """
        Get default index settings.
        
        Returns:
            Dictionary with index settings
        """
        return {
            'number_of_shards': cls.NUMBER_OF_SHARDS,
            'number_of_replicas': cls.NUMBER_OF_REPLICAS,
            'analysis': {
                'analyzer': {
                    'autocomplete': {
                        'type': 'custom',
                        'tokenizer': 'standard',
                        'filter': [
                            'lowercase',
                            'autocomplete_filter'
                        ]
                    },
                    'autocomplete_search': {
                        'type': 'custom',
                        'tokenizer': 'standard',
                        'filter': [
                            'lowercase'
                        ]
                    }
                },
                'filter': {
                    'autocomplete_filter': {
                        'type': 'edge_ngram',
                        'min_gram': 2,
                        'max_gram': 20
                    }
                }
            }
        }
    
    @classmethod
    def get_tours_mapping(cls) -> Dict[str, Any]:
        """
        Get mapping for tours index.
        
        Returns:
            Dictionary with tours mapping
        """
        return {
            'properties': {
                'id': {'type': 'keyword'},
                'title': {
                    'type': 'text',
                    'analyzer': 'standard',
                    'fields': {
                        'keyword': {'type': 'keyword'},
                        'autocomplete': {
                            'type': 'text',
                            'analyzer': 'autocomplete',
                            'search_analyzer': 'autocomplete_search'
                        }
                    }
                },
                'description': {
                    'type': 'text',
                    'analyzer': 'standard'
                },
                'short_description': {
                    'type': 'text',
                    'analyzer': 'standard'
                },
                'category': {
                    'type': 'keyword'
                },
                'tags': {
                    'type': 'keyword'
                },
                'location': {
                    'type': 'geo_point'
                },
                'location_name': {
                    'type': 'text',
                    'fields': {
                        'keyword': {'type': 'keyword'}
                    }
                },
                'city': {'type': 'keyword'},
                'country': {'type': 'keyword'},
                'price': {
                    'type': 'scaled_float',
                    'scaling_factor': 100
                },
                'currency': {'type': 'keyword'},
                'duration_hours': {'type': 'float'},
                'duration_days': {'type': 'integer'},
                'max_participants': {'type': 'integer'},
                'min_participants': {'type': 'integer'},
                'difficulty_level': {'type': 'keyword'},
                'rating': {'type': 'float'},
                'reviews_count': {'type': 'integer'},
                'availability': {'type': 'keyword'},
                'languages': {'type': 'keyword'},
                'included_items': {'type': 'text'},
                'excluded_items': {'type': 'text'},
                'highlights': {'type': 'text'},
                'itinerary': {
                    'type': 'nested',
                    'properties': {
                        'day': {'type': 'integer'},
                        'title': {'type': 'text'},
                        'description': {'type': 'text'},
                        'location': {'type': 'geo_point'}
                    }
                },
                'guide_id': {'type': 'keyword'},
                'guide_name': {'type': 'text'},
                'images': {
                    'type': 'nested',
                    'properties': {
                        'url': {'type': 'keyword'},
                        'caption': {'type': 'text'}
                    }
                },
                'is_active': {'type': 'boolean'},
                'is_featured': {'type': 'boolean'},
                'created_at': {'type': 'date'},
                'updated_at': {'type': 'date'},
                'booking_count': {'type': 'integer'},
                'view_count': {'type': 'integer'},
                'popularity_score': {'type': 'float'}
            }
        }


# Export config instance
config = ElasticsearchConfig()
