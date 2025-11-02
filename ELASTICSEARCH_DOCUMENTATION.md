# Elasticsearch Search System Documentation

## Overview

Advanced search system powered by Elasticsearch for Spirit Tours platform. Provides full-text search, filtering, autocomplete, and analytics.

## Features

✅ **Full-Text Search**
- Multi-field search (title, description, location)
- Fuzzy matching for typo tolerance
- Relevance scoring
- Search highlighting

✅ **Advanced Filtering**
- Price range
- Duration (hours/days)
- Location (city, country)
- Geolocation (radius search)
- Category and tags
- Difficulty level
- Rating
- Languages
- Availability

✅ **Autocomplete & Suggestions**
- Real-time autocomplete
- Search suggestions
- Popular searches
- Trending queries

✅ **Aggregations/Facets**
- Category distribution
- Price ranges
- Rating distribution
- Location counts
- Difficulty levels

✅ **Analytics**
- Search tracking
- Click-through rates
- Popular queries
- Zero-results tracking

## Architecture

### Backend Structure

```
backend/search/
├── __init__.py
├── elasticsearch_config.py      # Configuration
├── elasticsearch_service.py     # Main service
└── search_models.py              # Pydantic models
```

### API Endpoints

```
POST   /api/search/tours          # Advanced search
GET    /api/search/tours          # Simple search
POST   /api/search/autocomplete   # Autocomplete
GET    /api/search/autocomplete   # Autocomplete (GET)
GET    /api/search/suggestions    # Suggestions
GET    /api/search/popular        # Popular searches
GET    /api/search/filters        # Available filters
POST   /api/search/reindex        # Reindex all tours
GET    /api/search/health         # Health check
```

## Configuration

### Environment Variables

```bash
ELASTICSEARCH_HOST=localhost
ELASTICSEARCH_PORT=9200
ELASTICSEARCH_SCHEME=http
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
ELASTICSEARCH_API_KEY=
ELASTICSEARCH_CLOUD_ID=
```

### Index Settings

- **Index**: `spirit_tours_tours`
- **Shards**: 1
- **Replicas**: 1
- **Analyzer**: Standard + Custom autocomplete

## API Usage

### Advanced Search (POST)

```bash
curl -X POST http://localhost:8000/api/search/tours \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Jerusalem walking tour",
    "filters": {
      "min_price": 50,
      "max_price": 150,
      "category": ["Cultural"],
      "min_rating": 4.0
    },
    "sort_by": "rating",
    "page": 1,
    "page_size": 20
  }'
```

### Simple Search (GET)

```bash
curl "http://localhost:8000/api/search/tours?q=Jerusalem&min_price=50&max_price=150&sort_by=rating"
```

### Autocomplete

```bash
curl "http://localhost:8000/api/search/autocomplete?q=jeru&limit=10"
```

### Geolocation Search

```bash
curl -X POST http://localhost:8000/api/search/tours \
  -H "Content-Type: application/json" \
  -d '{
    "query": "",
    "filters": {
      "latitude": 31.7683,
      "longitude": 35.2137,
      "radius_km": 10
    }
  }'
```

## Frontend Integration

### React Component

```tsx
import { TourSearch } from '@/components/Search';

function SearchPage() {
  return <TourSearch onSearch={(results) => console.log(results)} />;
}
```

### API Client

```typescript
const searchTours = async (query: string) => {
  const response = await fetch('/api/search/tours', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return response.json();
};
```

## Index Mapping

### Tours Index

```json
{
  "properties": {
    "id": { "type": "keyword" },
    "title": {
      "type": "text",
      "fields": {
        "keyword": { "type": "keyword" },
        "autocomplete": {
          "type": "text",
          "analyzer": "autocomplete"
        }
      }
    },
    "location": { "type": "geo_point" },
    "price": { "type": "scaled_float" },
    "rating": { "type": "float" }
  }
}
```

## Deployment

### 1. Install Elasticsearch

```bash
# Docker
docker run -d -p 9200:9200 -e "discovery.type=single-node" elasticsearch:8.11.0

# Or use Elastic Cloud
# Set ELASTICSEARCH_CLOUD_ID
```

### 2. Create Index

```python
from backend.search import ElasticsearchService

es = ElasticsearchService()
await es.create_index('spirit_tours_tours')
```

### 3. Index Tours

```python
# Reindex all tours
await es.bulk_index_tours(tours)
```

## Performance

- **Search Latency**: <50ms avg
- **Autocomplete**: <20ms avg
- **Index Size**: ~1MB per 1000 tours
- **Throughput**: 100+ searches/sec

## Monitoring

- Elasticsearch cluster health
- Search latency metrics
- Index size and growth
- Query success rates
- Zero-result queries

## Troubleshooting

### Elasticsearch Not Connected

```bash
# Check Elasticsearch
curl http://localhost:9200/_cluster/health

# Check API health
curl http://localhost:8000/api/search/health
```

### Slow Queries

- Check index size
- Review query complexity
- Consider caching
- Optimize filters

### Zero Results

- Check spelling/typos
- Review filters
- Verify data indexed
- Check fuzzy matching

## License

Proprietary - Spirit Tours Ltd.
