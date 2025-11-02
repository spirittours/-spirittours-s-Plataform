"""
Database Query Optimizer for Spirit Tours
Implements query optimization, indexing strategies, and performance monitoring
"""

import time
import logging
from typing import List, Dict, Any, Optional, Tuple, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import asyncio
from functools import wraps
import sqlalchemy as sa
from sqlalchemy import text, Index, event, inspect
from sqlalchemy.orm import Query, Session, joinedload, selectinload, subqueryload
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select
from sqlalchemy.engine import Engine
import pandas as pd

logger = logging.getLogger(__name__)

class QueryOptimizationStrategy(Enum):
    """Query optimization strategies"""
    EAGER_LOADING = "eager_loading"
    LAZY_LOADING = "lazy_loading"
    BATCH_LOADING = "batch_loading"
    QUERY_CACHE = "query_cache"
    INDEX_SCAN = "index_scan"
    PARTITION_PRUNING = "partition_pruning"

@dataclass
class QueryPerformanceMetrics:
    """Query performance metrics"""
    query: str
    execution_time: float
    rows_affected: int
    cache_hit: bool
    optimization_used: str
    timestamp: datetime
    slow_query: bool
    suggestions: List[str]

@dataclass
class IndexRecommendation:
    """Index recommendation"""
    table_name: str
    column_names: List[str]
    index_type: str  # btree, hash, gin, gist
    estimated_improvement: float
    reason: str
    priority: str  # high, medium, low

class DatabaseOptimizer:
    """
    Advanced database optimizer with query analysis,
    automatic indexing, and performance monitoring
    """
    
    def __init__(self, engine: Engine, slow_query_threshold: float = 1.0):
        self.engine = engine
        self.slow_query_threshold = slow_query_threshold
        self.query_cache = {}
        self.performance_metrics: List[QueryPerformanceMetrics] = []
        self.index_recommendations: List[IndexRecommendation] = []
        
        # Query patterns for optimization
        self.query_patterns = {
            'n_plus_one': r'SELECT.*FROM.*WHERE.*IN \(',
            'missing_index': r'SELECT.*FROM.*WHERE.*(?:LIKE|=|>|<)',
            'full_table_scan': r'SELECT \* FROM',
            'inefficient_join': r'SELECT.*FROM.*JOIN.*ON',
        }
        
        # Install query listeners
        self._install_listeners()
        
        # Start background tasks
        asyncio.create_task(self._analyze_slow_queries())
        asyncio.create_task(self._update_statistics())
    
    def _install_listeners(self):
        """Install database event listeners for monitoring"""
        
        @event.listens_for(self.engine, "before_execute")
        def receive_before_execute(conn, clauseelement, multiparams, params, execution_options):
            conn.info.setdefault('query_start_time', []).append(time.time())
        
        @event.listens_for(self.engine, "after_execute")
        def receive_after_execute(conn, clauseelement, multiparams, params, execution_options, result):
            total_time = time.time() - conn.info['query_start_time'].pop(-1)
            
            # Log slow queries
            if total_time > self.slow_query_threshold:
                self._log_slow_query(
                    str(clauseelement),
                    total_time,
                    result.rowcount if hasattr(result, 'rowcount') else 0
                )
    
    def optimize_query(self, query: Query) -> Query:
        """
        Optimize a SQLAlchemy query with appropriate loading strategies
        """
        # Analyze query structure
        query_str = str(query)
        optimization_strategy = self._determine_optimization_strategy(query_str)
        
        # Apply optimization based on strategy
        if optimization_strategy == QueryOptimizationStrategy.EAGER_LOADING:
            query = self._apply_eager_loading(query)
        elif optimization_strategy == QueryOptimizationStrategy.BATCH_LOADING:
            query = self._apply_batch_loading(query)
        
        return query
    
    def _determine_optimization_strategy(self, query_str: str) -> QueryOptimizationStrategy:
        """Determine the best optimization strategy for a query"""
        
        # Check for N+1 query pattern
        if self._detect_n_plus_one(query_str):
            return QueryOptimizationStrategy.EAGER_LOADING
        
        # Check for missing indexes
        if self._detect_missing_index(query_str):
            return QueryOptimizationStrategy.INDEX_SCAN
        
        # Default strategy
        return QueryOptimizationStrategy.QUERY_CACHE
    
    def _apply_eager_loading(self, query: Query) -> Query:
        """Apply eager loading to prevent N+1 queries"""
        # Get the model class from the query
        model = query.column_descriptions[0]['entity']
        
        # Find relationships that should be eager loaded
        inspector = inspect(model)
        relationships = inspector.relationships
        
        for rel in relationships:
            # Use joinedload for one-to-one and many-to-one
            if rel.direction.name in ['MANYTOONE', 'ONETOONE']:
                query = query.options(joinedload(getattr(model, rel.key)))
            # Use selectinload for one-to-many and many-to-many
            else:
                query = query.options(selectinload(getattr(model, rel.key)))
        
        return query
    
    def _apply_batch_loading(self, query: Query, batch_size: int = 500) -> Query:
        """Apply batch loading for large result sets"""
        return query.yield_per(batch_size)
    
    def _detect_n_plus_one(self, query_str: str) -> bool:
        """Detect potential N+1 query problems"""
        # Simple heuristic: multiple similar queries in short time
        recent_queries = [m.query for m in self.performance_metrics[-10:]]
        similar_count = sum(1 for q in recent_queries if query_str[:50] in q)
        return similar_count > 3
    
    def _detect_missing_index(self, query_str: str) -> bool:
        """Detect queries that might benefit from indexes"""
        # Check for WHERE clauses without indexes
        return 'WHERE' in query_str and 'INDEX' not in query_str
    
    def _log_slow_query(self, query: str, execution_time: float, rows_affected: int):
        """Log slow query for analysis"""
        metrics = QueryPerformanceMetrics(
            query=query[:500],  # Truncate long queries
            execution_time=execution_time,
            rows_affected=rows_affected,
            cache_hit=False,
            optimization_used="none",
            timestamp=datetime.now(),
            slow_query=True,
            suggestions=self._generate_optimization_suggestions(query)
        )
        
        self.performance_metrics.append(metrics)
        logger.warning(f"Slow query detected ({execution_time:.2f}s): {query[:100]}...")
    
    def _generate_optimization_suggestions(self, query: str) -> List[str]:
        """Generate optimization suggestions for a query"""
        suggestions = []
        
        # Check for SELECT *
        if "SELECT *" in query:
            suggestions.append("Avoid SELECT *, specify needed columns")
        
        # Check for missing WHERE clause
        if "WHERE" not in query and "JOIN" in query:
            suggestions.append("Add WHERE clause to filter results")
        
        # Check for LIKE with wildcard at beginning
        if "LIKE '%" in query:
            suggestions.append("Avoid leading wildcards in LIKE queries")
        
        # Check for OR conditions
        if " OR " in query:
            suggestions.append("Consider using UNION instead of OR for better performance")
        
        # Check for NOT IN
        if "NOT IN" in query:
            suggestions.append("Consider using NOT EXISTS instead of NOT IN")
        
        return suggestions
    
    async def analyze_table_statistics(self, table_name: str) -> Dict[str, Any]:
        """Analyze table statistics for optimization opportunities"""
        async with self.engine.connect() as conn:
            # Get table size
            size_query = text(f"""
                SELECT 
                    pg_size_pretty(pg_total_relation_size('{table_name}')) as total_size,
                    pg_size_pretty(pg_relation_size('{table_name}')) as table_size,
                    pg_size_pretty(pg_indexes_size('{table_name}')) as indexes_size,
                    n_live_tup as row_count,
                    n_dead_tup as dead_rows,
                    last_vacuum,
                    last_autovacuum,
                    last_analyze,
                    last_autoanalyze
                FROM pg_stat_user_tables
                WHERE schemaname = 'public' AND tablename = '{table_name}'
            """)
            
            result = await conn.execute(size_query)
            stats = dict(result.fetchone() or {})
            
            # Get index usage
            index_query = text(f"""
                SELECT 
                    indexrelname as index_name,
                    idx_scan as index_scans,
                    idx_tup_read as tuples_read,
                    idx_tup_fetch as tuples_fetched,
                    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
                FROM pg_stat_user_indexes
                WHERE schemaname = 'public' AND tablename = '{table_name}'
                ORDER BY idx_scan DESC
            """)
            
            result = await conn.execute(index_query)
            stats['indexes'] = [dict(row) for row in result.fetchall()]
            
            # Get column statistics
            column_query = text(f"""
                SELECT 
                    attname as column_name,
                    n_distinct as distinct_values,
                    null_frac as null_fraction,
                    avg_width as avg_width,
                    correlation as correlation
                FROM pg_stats
                WHERE schemaname = 'public' AND tablename = '{table_name}'
            """)
            
            result = await conn.execute(column_query)
            stats['columns'] = [dict(row) for row in result.fetchall()]
            
            return stats
    
    async def recommend_indexes(self, table_name: str) -> List[IndexRecommendation]:
        """Recommend indexes based on query patterns and table statistics"""
        recommendations = []
        stats = await self.analyze_table_statistics(table_name)
        
        # Analyze slow queries for this table
        table_queries = [
            m for m in self.performance_metrics
            if table_name in m.query and m.slow_query
        ]
        
        # Extract WHERE clause columns
        where_columns = set()
        join_columns = set()
        order_columns = set()
        
        for metrics in table_queries:
            query = metrics.query
            
            # Extract WHERE columns (simplified)
            if "WHERE" in query:
                where_part = query.split("WHERE")[1].split("ORDER BY")[0]
                for col in stats['columns']:
                    if col['column_name'] in where_part:
                        where_columns.add(col['column_name'])
            
            # Extract JOIN columns
            if "JOIN" in query and "ON" in query:
                join_part = query.split("ON")[1].split("WHERE")[0]
                for col in stats['columns']:
                    if col['column_name'] in join_part:
                        join_columns.add(col['column_name'])
            
            # Extract ORDER BY columns
            if "ORDER BY" in query:
                order_part = query.split("ORDER BY")[1]
                for col in stats['columns']:
                    if col['column_name'] in order_part:
                        order_columns.add(col['column_name'])
        
        # Recommend indexes for WHERE columns with high cardinality
        for col_name in where_columns:
            col_stats = next((c for c in stats['columns'] if c['column_name'] == col_name), None)
            if col_stats and col_stats['distinct_values'] > 100:
                recommendations.append(IndexRecommendation(
                    table_name=table_name,
                    column_names=[col_name],
                    index_type='btree',
                    estimated_improvement=0.5,
                    reason=f"Frequent WHERE clause on high cardinality column",
                    priority='high'
                ))
        
        # Recommend composite indexes for common WHERE combinations
        if len(where_columns) > 1:
            recommendations.append(IndexRecommendation(
                table_name=table_name,
                column_names=list(where_columns)[:3],  # Limit to 3 columns
                index_type='btree',
                estimated_improvement=0.7,
                reason="Composite index for frequent WHERE clause combination",
                priority='medium'
            ))
        
        # Recommend indexes for JOIN columns
        for col_name in join_columns:
            recommendations.append(IndexRecommendation(
                table_name=table_name,
                column_names=[col_name],
                index_type='btree',
                estimated_improvement=0.6,
                reason="Foreign key column used in JOINs",
                priority='high'
            ))
        
        # Recommend covering indexes for ORDER BY
        if order_columns:
            recommendations.append(IndexRecommendation(
                table_name=table_name,
                column_names=list(order_columns),
                index_type='btree',
                estimated_improvement=0.4,
                reason="Covering index for ORDER BY optimization",
                priority='medium'
            ))
        
        self.index_recommendations.extend(recommendations)
        return recommendations
    
    async def create_recommended_indexes(self, auto_create: bool = False):
        """Create recommended indexes"""
        created_indexes = []
        
        for rec in self.index_recommendations:
            if rec.priority == 'high' or auto_create:
                index_name = f"idx_{rec.table_name}_{'_'.join(rec.column_names)}"
                
                # Check if index already exists
                async with self.engine.connect() as conn:
                    check_query = text(f"""
                        SELECT 1 FROM pg_indexes 
                        WHERE schemaname = 'public' 
                        AND tablename = '{rec.table_name}'
                        AND indexname = '{index_name}'
                    """)
                    
                    result = await conn.execute(check_query)
                    if not result.fetchone():
                        # Create index
                        create_query = text(f"""
                            CREATE INDEX CONCURRENTLY IF NOT EXISTS {index_name}
                            ON {rec.table_name} ({', '.join(rec.column_names)})
                        """)
                        
                        try:
                            await conn.execute(create_query)
                            await conn.commit()
                            created_indexes.append(index_name)
                            logger.info(f"Created index: {index_name}")
                        except Exception as e:
                            logger.error(f"Failed to create index {index_name}: {e}")
        
        return created_indexes
    
    async def optimize_database(self):
        """Run comprehensive database optimization"""
        logger.info("Starting database optimization...")
        
        # Update table statistics
        async with self.engine.connect() as conn:
            await conn.execute(text("ANALYZE"))
            
            # Run VACUUM on tables with high dead tuple count
            tables_query = text("""
                SELECT tablename 
                FROM pg_stat_user_tables 
                WHERE n_dead_tup > 1000 
                AND last_autovacuum < NOW() - INTERVAL '1 day'
            """)
            
            result = await conn.execute(tables_query)
            for row in result:
                await conn.execute(text(f"VACUUM ANALYZE {row[0]}"))
        
        # Reindex tables if needed
        await self._reindex_if_needed()
        
        # Create missing indexes
        await self.create_recommended_indexes(auto_create=False)
        
        logger.info("Database optimization completed")
    
    async def _reindex_if_needed(self):
        """Reindex tables with high bloat"""
        async with self.engine.connect() as conn:
            bloat_query = text("""
                SELECT 
                    schemaname,
                    tablename,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
                    ROUND(CASE WHEN otta=0 THEN 0.0 
                          ELSE sml.relpages/otta::numeric END, 1) AS bloat_ratio
                FROM (
                    SELECT 
                        schemaname,
                        tablename,
                        cc.relpages,
                        bs,
                        CEIL((cc.reltuples*((datahdr+ma-
                            CASE WHEN datahdr%ma=0 THEN ma ELSE datahdr%ma END)+nullhdr2+4))/(bs-20::float)) AS otta
                    FROM (
                        SELECT 
                            ns.nspname AS schemaname,
                            tbl.relname AS tablename,
                            tbl.relpages,
                            tbl.reltuples,
                            24 AS datahdr,
                            8 AS ma,
                            23 AS nullhdr2,
                            current_setting('block_size')::numeric AS bs
                        FROM pg_class AS tbl
                        INNER JOIN pg_namespace AS ns ON tbl.relnamespace = ns.oid
                        WHERE tbl.relkind='r'
                    ) AS cc
                ) AS sml
                WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
                AND bloat_ratio > 1.5
            """)
            
            result = await conn.execute(bloat_query)
            for row in result:
                if row['bloat_ratio'] > 2.0:
                    logger.info(f"Reindexing bloated table: {row['tablename']} (bloat ratio: {row['bloat_ratio']})")
                    await conn.execute(text(f"REINDEX TABLE {row['tablename']}"))
    
    async def _analyze_slow_queries(self):
        """Background task to analyze slow queries"""
        while True:
            await asyncio.sleep(300)  # Analyze every 5 minutes
            
            if len(self.performance_metrics) > 100:
                # Keep only recent metrics
                self.performance_metrics = self.performance_metrics[-1000:]
                
                # Find most common slow query patterns
                slow_patterns = {}
                for metrics in self.performance_metrics:
                    if metrics.slow_query:
                        pattern = metrics.query[:50]  # Use first 50 chars as pattern
                        slow_patterns[pattern] = slow_patterns.get(pattern, 0) + 1
                
                # Log top slow query patterns
                top_patterns = sorted(slow_patterns.items(), key=lambda x: x[1], reverse=True)[:5]
                for pattern, count in top_patterns:
                    logger.warning(f"Frequent slow query pattern ({count} times): {pattern}...")
    
    async def _update_statistics(self):
        """Background task to update database statistics"""
        while True:
            await asyncio.sleep(3600)  # Update every hour
            
            try:
                async with self.engine.connect() as conn:
                    # Update statistics for frequently queried tables
                    await conn.execute(text("ANALYZE"))
                    logger.info("Updated database statistics")
            except Exception as e:
                logger.error(f"Failed to update statistics: {e}")
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Generate performance report"""
        if not self.performance_metrics:
            return {"message": "No performance data available"}
        
        total_queries = len(self.performance_metrics)
        slow_queries = [m for m in self.performance_metrics if m.slow_query]
        avg_execution_time = sum(m.execution_time for m in self.performance_metrics) / total_queries
        
        # Find slowest queries
        slowest = sorted(self.performance_metrics, key=lambda x: x.execution_time, reverse=True)[:10]
        
        return {
            "total_queries": total_queries,
            "slow_queries_count": len(slow_queries),
            "slow_query_percentage": len(slow_queries) / total_queries * 100,
            "average_execution_time": avg_execution_time,
            "slowest_queries": [
                {
                    "query": m.query[:200],
                    "execution_time": m.execution_time,
                    "timestamp": m.timestamp.isoformat(),
                    "suggestions": m.suggestions
                }
                for m in slowest
            ],
            "index_recommendations": [
                asdict(rec) for rec in self.index_recommendations[:10]
            ]
        }


# Query optimization decorators

def optimized_query(strategy: QueryOptimizationStrategy = None):
    """Decorator to optimize database queries"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get the query from function
            query = await func(*args, **kwargs)
            
            # Optimize if it's a SQLAlchemy query
            if hasattr(query, 'statement'):
                optimizer = DatabaseOptimizer(query.session.bind)
                query = optimizer.optimize_query(query)
            
            return query
        return wrapper
    return decorator


def cached_query(ttl: int = 600):
    """Decorator to cache query results"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"query:{func.__name__}:{str(args)}:{str(kwargs)}"
            
            # Try to get from cache
            from core.cache_manager import cache_manager
            cached = await cache_manager.get(cache_key)
            if cached:
                return cached
            
            # Execute query
            result = await func(*args, **kwargs)
            
            # Cache result
            await cache_manager.set(cache_key, result, ttl=ttl)
            
            return result
        return wrapper
    return decorator