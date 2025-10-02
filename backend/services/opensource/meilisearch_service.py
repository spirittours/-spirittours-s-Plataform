"""
Meilisearch Service - Free Alternative to Algolia/Elasticsearch
Lightning-fast, open-source search engine
Cost: $0 (self-hosted)
Features:
- Instant search-as-you-type
- Typo tolerance
- Faceted search & filters
- Synonyms support
- Multi-language support
- Geo-search capabilities
- Custom ranking rules
- Stop words
- Highlighting
- RESTful API
"""

import asyncio
import httpx
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import json
import hashlib
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class IndexStatus(Enum):
    READY = "ready"
    PROCESSING = "processing"
    ERROR = "error"

@dataclass
class SearchResult:
    """Search result item"""
    id: str
    score: float
    document: Dict[str, Any]
    formatted: Optional[Dict[str, Any]] = None
    matches_info: Optional[Dict[str, Any]] = None
    
@dataclass
class SearchResponse:
    """Search response"""
    hits: List[SearchResult]
    processing_time_ms: int
    query: str
    limit: int
    offset: int
    estimated_total_hits: int
    facet_distribution: Optional[Dict[str, Dict]] = None
    
@dataclass
class Index:
    """Search index"""
    uid: str
    primary_key: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
@dataclass
class Task:
    """Async task"""
    uid: int
    index_uid: str
    status: str
    type: str
    details: Optional[Dict] = None
    error: Optional[Dict] = None
    duration: Optional[str] = None
    enqueued_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    
class MeilisearchService:
    """
    Complete Meilisearch integration
    Ultra-fast, typo-tolerant search engine
    """
    
    def __init__(
        self,
        host: str = "http://localhost:7700",
        api_key: Optional[str] = None
    ):
        self.host = host
        self.api_key = api_key
        self.headers = {}
        
        if api_key:
            self.headers["Authorization"] = f"Bearer {api_key}"
            
        # Cache for index settings
        self.index_cache: Dict[str, Index] = {}
        
        # Default search settings
        self.default_search_settings = {
            "rankingRules": [
                "words",
                "typo",
                "proximity",
                "attribute",
                "sort",
                "exactness"
            ],
            "searchableAttributes": ["*"],
            "displayedAttributes": ["*"],
            "stopWords": [],
            "synonyms": {},
            "filterableAttributes": [],
            "sortableAttributes": [],
            "distinctAttribute": None,
            "faceting": {
                "maxValuesPerFacet": 100
            },
            "pagination": {
                "maxTotalHits": 1000
            }
        }
        
    async def create_index(
        self,
        uid: str,
        primary_key: Optional[str] = None
    ) -> Optional[Task]:
        """
        Create new search index
        """
        try:
            data = {"uid": uid}
            if primary_key:
                data["primaryKey"] = primary_key
                
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.host}/indexes",
                    json=data,
                    headers=self.headers
                )
                
                if response.status_code in [201, 202]:
                    task_data = response.json()
                    return Task(
                        uid=task_data["taskUid"],
                        index_uid=uid,
                        status=task_data["status"],
                        type=task_data["type"]
                    )
                    
        except Exception as e:
            logger.error(f"Create index error: {e}")
            
        return None
        
    async def add_documents(
        self,
        index_uid: str,
        documents: List[Dict[str, Any]],
        primary_key: Optional[str] = None
    ) -> Optional[Task]:
        """
        Add or update documents in index
        """
        try:
            params = {}
            if primary_key:
                params["primaryKey"] = primary_key
                
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.host}/indexes/{index_uid}/documents",
                    json=documents,
                    params=params,
                    headers=self.headers
                )
                
                if response.status_code == 202:
                    task_data = response.json()
                    return Task(
                        uid=task_data["taskUid"],
                        index_uid=index_uid,
                        status=task_data["status"],
                        type=task_data["type"]
                    )
                    
        except Exception as e:
            logger.error(f"Add documents error: {e}")
            
        return None
        
    async def search(
        self,
        index_uid: str,
        query: str,
        limit: int = 20,
        offset: int = 0,
        filter: Optional[str] = None,
        facets: Optional[List[str]] = None,
        sort: Optional[List[str]] = None,
        attributes_to_retrieve: Optional[List[str]] = None,
        attributes_to_highlight: Optional[List[str]] = None,
        attributes_to_crop: Optional[List[str]] = None,
        crop_length: int = 200,
        highlight_pre_tag: str = "<mark>",
        highlight_post_tag: str = "</mark>",
        show_matches_position: bool = False
    ) -> Optional[SearchResponse]:
        """
        Search documents with instant results
        """
        try:
            search_params = {
                "q": query,
                "limit": limit,
                "offset": offset
            }
            
            if filter:
                search_params["filter"] = filter
                
            if facets:
                search_params["facets"] = facets
                
            if sort:
                search_params["sort"] = sort
                
            if attributes_to_retrieve:
                search_params["attributesToRetrieve"] = attributes_to_retrieve
                
            if attributes_to_highlight:
                search_params["attributesToHighlight"] = attributes_to_highlight
                
            if attributes_to_crop:
                search_params["attributesToCrop"] = attributes_to_crop
                search_params["cropLength"] = crop_length
                
            search_params["highlightPreTag"] = highlight_pre_tag
            search_params["highlightPostTag"] = highlight_post_tag
            search_params["showMatchesPosition"] = show_matches_position
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.host}/indexes/{index_uid}/search",
                    json=search_params,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    hits = []
                    for hit in data.get("hits", []):
                        hits.append(SearchResult(
                            id=str(hit.get("id", "")),
                            score=hit.get("_score", 1.0),
                            document=hit,
                            formatted=hit.get("_formatted"),
                            matches_info=hit.get("_matchesPosition")
                        ))
                        
                    return SearchResponse(
                        hits=hits,
                        processing_time_ms=data.get("processingTimeMs", 0),
                        query=data.get("query", query),
                        limit=data.get("limit", limit),
                        offset=data.get("offset", offset),
                        estimated_total_hits=data.get("estimatedTotalHits", 0),
                        facet_distribution=data.get("facetDistribution")
                    )
                    
        except Exception as e:
            logger.error(f"Search error: {e}")
            
        return None
        
    async def multi_search(
        self,
        queries: List[Dict[str, Any]]
    ) -> List[Optional[SearchResponse]]:
        """
        Perform multiple searches in one request
        """
        results = []
        
        try:
            search_data = {"queries": queries}
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.host}/multi-search",
                    json=search_data,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    for result in data.get("results", []):
                        hits = []
                        for hit in result.get("hits", []):
                            hits.append(SearchResult(
                                id=str(hit.get("id", "")),
                                score=hit.get("_score", 1.0),
                                document=hit,
                                formatted=hit.get("_formatted"),
                                matches_info=hit.get("_matchesPosition")
                            ))
                            
                        results.append(SearchResponse(
                            hits=hits,
                            processing_time_ms=result.get("processingTimeMs", 0),
                            query=result.get("query", ""),
                            limit=result.get("limit", 20),
                            offset=result.get("offset", 0),
                            estimated_total_hits=result.get("estimatedTotalHits", 0),
                            facet_distribution=result.get("facetDistribution")
                        ))
                        
        except Exception as e:
            logger.error(f"Multi-search error: {e}")
            
        return results
        
    async def update_settings(
        self,
        index_uid: str,
        settings: Dict[str, Any]
    ) -> Optional[Task]:
        """
        Update index settings
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.host}/indexes/{index_uid}/settings",
                    json=settings,
                    headers=self.headers
                )
                
                if response.status_code == 202:
                    task_data = response.json()
                    return Task(
                        uid=task_data["taskUid"],
                        index_uid=index_uid,
                        status=task_data["status"],
                        type=task_data["type"]
                    )
                    
        except Exception as e:
            logger.error(f"Update settings error: {e}")
            
        return None
        
    async def set_ranking_rules(
        self,
        index_uid: str,
        ranking_rules: List[str]
    ) -> Optional[Task]:
        """
        Set custom ranking rules
        """
        return await self.update_settings(
            index_uid,
            {"rankingRules": ranking_rules}
        )
        
    async def set_searchable_attributes(
        self,
        index_uid: str,
        attributes: List[str]
    ) -> Optional[Task]:
        """
        Set searchable attributes
        """
        return await self.update_settings(
            index_uid,
            {"searchableAttributes": attributes}
        )
        
    async def set_filterable_attributes(
        self,
        index_uid: str,
        attributes: List[str]
    ) -> Optional[Task]:
        """
        Set filterable attributes for faceted search
        """
        return await self.update_settings(
            index_uid,
            {"filterableAttributes": attributes}
        )
        
    async def set_sortable_attributes(
        self,
        index_uid: str,
        attributes: List[str]
    ) -> Optional[Task]:
        """
        Set sortable attributes
        """
        return await self.update_settings(
            index_uid,
            {"sortableAttributes": attributes}
        )
        
    async def set_synonyms(
        self,
        index_uid: str,
        synonyms: Dict[str, List[str]]
    ) -> Optional[Task]:
        """
        Set synonyms for better search
        Example: {"sneakers": ["shoes", "footwear"]}
        """
        return await self.update_settings(
            index_uid,
            {"synonyms": synonyms}
        )
        
    async def set_stop_words(
        self,
        index_uid: str,
        stop_words: List[str]
    ) -> Optional[Task]:
        """
        Set stop words to ignore
        """
        return await self.update_settings(
            index_uid,
            {"stopWords": stop_words}
        )
        
    async def set_typo_tolerance(
        self,
        index_uid: str,
        enabled: bool = True,
        min_word_size_for_typos: Dict[str, int] = None
    ) -> Optional[Task]:
        """
        Configure typo tolerance
        """
        typo_settings = {"enabled": enabled}
        
        if min_word_size_for_typos:
            typo_settings["minWordSizeForTypos"] = min_word_size_for_typos
            
        return await self.update_settings(
            index_uid,
            {"typoTolerance": typo_settings}
        )
        
    async def delete_document(
        self,
        index_uid: str,
        document_id: str
    ) -> Optional[Task]:
        """
        Delete single document
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.host}/indexes/{index_uid}/documents/{document_id}",
                    headers=self.headers
                )
                
                if response.status_code == 202:
                    task_data = response.json()
                    return Task(
                        uid=task_data["taskUid"],
                        index_uid=index_uid,
                        status=task_data["status"],
                        type=task_data["type"]
                    )
                    
        except Exception as e:
            logger.error(f"Delete document error: {e}")
            
        return None
        
    async def delete_all_documents(
        self,
        index_uid: str
    ) -> Optional[Task]:
        """
        Delete all documents in index
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.host}/indexes/{index_uid}/documents",
                    headers=self.headers
                )
                
                if response.status_code == 202:
                    task_data = response.json()
                    return Task(
                        uid=task_data["taskUid"],
                        index_uid=index_uid,
                        status=task_data["status"],
                        type=task_data["type"]
                    )
                    
        except Exception as e:
            logger.error(f"Delete all documents error: {e}")
            
        return None
        
    async def get_task(self, task_uid: int) -> Optional[Task]:
        """
        Get task status
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.host}/tasks/{task_uid}",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return Task(
                        uid=data["uid"],
                        index_uid=data.get("indexUid"),
                        status=data["status"],
                        type=data["type"],
                        details=data.get("details"),
                        error=data.get("error"),
                        duration=data.get("duration"),
                        enqueued_at=datetime.fromisoformat(data["enqueuedAt"]) if data.get("enqueuedAt") else None,
                        started_at=datetime.fromisoformat(data["startedAt"]) if data.get("startedAt") else None,
                        finished_at=datetime.fromisoformat(data["finishedAt"]) if data.get("finishedAt") else None
                    )
                    
        except Exception as e:
            logger.error(f"Get task error: {e}")
            
        return None
        
    async def wait_for_task(
        self,
        task_uid: int,
        timeout: int = 60,
        interval: float = 0.5
    ) -> Optional[Task]:
        """
        Wait for task completion
        """
        start_time = datetime.now()
        
        while (datetime.now() - start_time).total_seconds() < timeout:
            task = await self.get_task(task_uid)
            
            if task and task.status in ["succeeded", "failed"]:
                return task
                
            await asyncio.sleep(interval)
            
        return None
        
    async def get_stats(self, index_uid: str) -> Optional[Dict[str, Any]]:
        """
        Get index statistics
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.host}/indexes/{index_uid}/stats",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    return response.json()
                    
        except Exception as e:
            logger.error(f"Get stats error: {e}")
            
        return None
        
    async def create_snapshot(self) -> Optional[Task]:
        """
        Create database snapshot
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.host}/snapshots",
                    headers=self.headers
                )
                
                if response.status_code == 202:
                    task_data = response.json()
                    return Task(
                        uid=task_data["taskUid"],
                        index_uid="",
                        status=task_data["status"],
                        type=task_data["type"]
                    )
                    
        except Exception as e:
            logger.error(f"Create snapshot error: {e}")
            
        return None
        
    # Spirit Tours specific search implementations
    
    async def setup_tours_index(self) -> bool:
        """
        Setup tours search index with optimal settings
        """
        # Create index
        task = await self.create_index("tours", "id")
        
        if task:
            # Configure settings
            settings = {
                "rankingRules": [
                    "words",
                    "typo",
                    "proximity",
                    "attribute",
                    "sort",
                    "exactness",
                    "rating:desc",
                    "bookings:desc"
                ],
                "searchableAttributes": [
                    "title",
                    "description",
                    "highlights",
                    "location",
                    "category",
                    "tags"
                ],
                "filterableAttributes": [
                    "category",
                    "price",
                    "duration",
                    "rating",
                    "availability",
                    "location",
                    "language",
                    "group_size"
                ],
                "sortableAttributes": [
                    "price",
                    "rating",
                    "duration",
                    "bookings",
                    "created_at"
                ],
                "displayedAttributes": [
                    "id",
                    "title",
                    "description",
                    "price",
                    "duration",
                    "rating",
                    "images",
                    "location",
                    "category",
                    "availability"
                ],
                "synonyms": {
                    "walking": ["hike", "trek", "walk"],
                    "spiritual": ["sacred", "religious", "mystical"],
                    "adventure": ["extreme", "thrill", "exciting"],
                    "cultural": ["heritage", "traditional", "historical"]
                }
            }
            
            await self.update_settings("tours", settings)
            return True
            
        return False
        
    async def search_tours(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        sort_by: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Optional[SearchResponse]:
        """
        Search tours with filters
        """
        filter_strings = []
        
        if filters:
            # Build filter string
            if "category" in filters:
                filter_strings.append(f'category = "{filters["category"]}"')
                
            if "min_price" in filters:
                filter_strings.append(f'price >= {filters["min_price"]}')
                
            if "max_price" in filters:
                filter_strings.append(f'price <= {filters["max_price"]}')
                
            if "min_rating" in filters:
                filter_strings.append(f'rating >= {filters["min_rating"]}')
                
            if "location" in filters:
                filter_strings.append(f'location = "{filters["location"]}"')
                
            if "available" in filters:
                filter_strings.append(f'availability = true')
                
        filter_string = " AND ".join(filter_strings) if filter_strings else None
        
        # Determine sort
        sort = []
        if sort_by == "price_asc":
            sort = ["price:asc"]
        elif sort_by == "price_desc":
            sort = ["price:desc"]
        elif sort_by == "rating":
            sort = ["rating:desc"]
        elif sort_by == "newest":
            sort = ["created_at:desc"]
            
        return await self.search(
            index_uid="tours",
            query=query,
            limit=per_page,
            offset=(page - 1) * per_page,
            filter=filter_string,
            sort=sort,
            facets=["category", "location", "price"],
            attributes_to_highlight=["title", "description"],
            attributes_to_crop=["description"],
            crop_length=150
        )
        
    async def search_guides(
        self,
        query: str,
        specializations: Optional[List[str]] = None,
        languages: Optional[List[str]] = None,
        min_rating: Optional[float] = None
    ) -> Optional[SearchResponse]:
        """
        Search tour guides
        """
        filter_strings = []
        
        if specializations:
            spec_filters = [f'specializations = "{spec}"' for spec in specializations]
            filter_strings.append(f'({" OR ".join(spec_filters)})')
            
        if languages:
            lang_filters = [f'languages = "{lang}"' for lang in languages]
            filter_strings.append(f'({" OR ".join(lang_filters)})')
            
        if min_rating:
            filter_strings.append(f'rating >= {min_rating}')
            
        filter_string = " AND ".join(filter_strings) if filter_strings else None
        
        return await self.search(
            index_uid="guides",
            query=query,
            filter=filter_string,
            sort=["rating:desc", "experience_years:desc"],
            facets=["specializations", "languages", "location"]
        )
        
    async def autocomplete(
        self,
        index_uid: str,
        query: str,
        limit: int = 5
    ) -> List[str]:
        """
        Get autocomplete suggestions
        """
        response = await self.search(
            index_uid=index_uid,
            query=query,
            limit=limit,
            attributes_to_retrieve=["title", "name"],
            attributes_to_highlight=[]
        )
        
        if response:
            suggestions = []
            for hit in response.hits:
                title = hit.document.get("title") or hit.document.get("name")
                if title and title not in suggestions:
                    suggestions.append(title)
                    
            return suggestions[:limit]
            
        return []
        
    async def geo_search(
        self,
        index_uid: str,
        lat: float,
        lng: float,
        radius: int = 10000,  # meters
        limit: int = 20
    ) -> Optional[SearchResponse]:
        """
        Search by geographic location
        """
        filter_string = f"_geoRadius({lat}, {lng}, {radius})"
        
        return await self.search(
            index_uid=index_uid,
            query="",
            filter=filter_string,
            limit=limit,
            sort=[f"_geoPoint({lat}, {lng}):asc"]
        )
        

# Export service
meilisearch_service = MeilisearchService()