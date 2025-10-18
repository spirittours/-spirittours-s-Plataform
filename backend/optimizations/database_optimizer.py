"""
Database Indexing and Query Optimization System
===============================================
Sistema completo de optimización de base de datos con índices inteligentes,
análisis de queries, y auto-tuning para PostgreSQL.

Features:
- Automatic index recommendation
- Query performance analysis
- Index usage statistics
- Partition management
- Query plan optimization
- Connection pooling optimization
- Vacuum and maintenance automation
- Real-time performance monitoring
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Set
from dataclasses import dataclass, field
from enum import Enum
import hashlib
import re

from sqlalchemy import (
    create_engine, text, inspect, MetaData,
    Table, Column, Index, ForeignKey,
    Integer, String, DateTime, Boolean, Float, Text, 
    select, and_, or_, func, desc, asc
)
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool, QueuePool, StaticPool
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY, TSVECTOR
import asyncpg
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# ================== Configuration ==================

@dataclass
class DatabaseOptimizerConfig:
    """Database optimizer configuration"""
    # Connection
    database_url: str
    pool_size: int = 20
    max_overflow: int = 10
    pool_timeout: int = 30
    pool_recycle: int = 3600
    
    # Analysis
    slow_query_threshold_ms: int = 100
    analyze_interval_minutes: int = 60
    sample_rate: float = 0.1  # Sample 10% of queries
    
    # Indexing
    min_selectivity: float = 0.1  # Minimum selectivity for index
    max_index_size_gb: float = 10.0
    max_indexes_per_table: int = 10
    
    # Maintenance
    autovacuum_enabled: bool = True
    autovacuum_threshold: int = 50
    autoanalyze_enabled: bool = True
    autoanalyze_threshold: int = 50
    
    # Monitoring
    enable_monitoring: bool = True
    metrics_retention_days: int = 30

class IndexType(Enum):
    """Types of database indexes"""
    BTREE = "btree"          # Default, good for equality and range
    HASH = "hash"            # Good for equality only
    GIN = "gin"              # Good for arrays, JSONB, full-text search
    GIST = "gist"            # Good for geometric types, full-text search
    BRIN = "brin"            # Good for large tables with natural ordering
    BLOOM = "bloom"          # Good for multi-column equality

@dataclass
class IndexRecommendation:
    """Index recommendation"""
    table_name: str
    columns: List[str]
    index_type: IndexType
    estimated_improvement: float  # Percentage improvement
    estimated_size_mb: float
    reason: str
    priority: int  # 1-10, higher is more important
    where_clause: Optional[str] = None  # For partial indexes
    include_columns: Optional[List[str]] = None  # For covering indexes

@dataclass
class QueryStatistics:
    """Query performance statistics"""
    query_hash: str
    query_text: str
    calls: int
    total_time_ms: float
    mean_time_ms: float
    max_time_ms: float
    min_time_ms: float
    stddev_time_ms: float
    rows_returned: int
    cache_hits: int
    cache_misses: int

# ================== Database Optimizer ==================

class DatabaseOptimizer:
    """Advanced database optimization system"""
    
    def __init__(self, config: DatabaseOptimizerConfig):
        self.config = config
        self.engine = None
        self.async_engine = None
        self.connection_pool = None
        
        # Statistics storage
        self.query_stats: Dict[str, QueryStatistics] = {}
        self.index_stats: Dict[str, Dict] = {}
        self.table_stats: Dict[str, Dict] = {}
        
        # Recommendations
        self.index_recommendations: List[IndexRecommendation] = []
        
        # Background tasks
        self.monitoring_task = None
        self.maintenance_task = None
    
    async def initialize(self):
        """Initialize database optimizer"""
        try:
            # Create async engine with optimized pool
            self.async_engine = create_async_engine(
                self.config.database_url,
                pool_size=self.config.pool_size,
                max_overflow=self.config.max_overflow,
                pool_timeout=self.config.pool_timeout,
                pool_recycle=self.config.pool_recycle,
                pool_pre_ping=True,  # Verify connections
                echo=False
            )
            
            # Create connection pool for raw queries
            self.connection_pool = await asyncpg.create_pool(
                self.config.database_url.replace('postgresql+asyncpg://', ''),
                min_size=10,
                max_size=self.config.pool_size,
                command_timeout=60,
                max_queries=50000,
                max_inactive_connection_lifetime=300
            )
            
            # Enable necessary extensions
            await self._enable_extensions()
            
            # Create monitoring tables
            await self._create_monitoring_tables()
            
            # Start background tasks
            if self.config.enable_monitoring:
                self.monitoring_task = asyncio.create_task(self._monitor_performance())
                self.maintenance_task = asyncio.create_task(self._run_maintenance())
            
            logger.info("Database optimizer initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize database optimizer: {e}")
            raise
    
    async def _enable_extensions(self):
        """Enable PostgreSQL extensions for optimization"""
        extensions = [
            'pg_stat_statements',  # Query statistics
            'pg_trgm',             # Trigram indexes for text search
            'btree_gin',           # GIN indexes on common types
            'btree_gist',          # GIST indexes on common types
            'bloom',               # Bloom filter indexes
            'pg_prewarm'           # Preload data into cache
        ]
        
        async with self.connection_pool.acquire() as conn:
            for ext in extensions:
                try:
                    await conn.execute(f'CREATE EXTENSION IF NOT EXISTS {ext}')
                    logger.info(f"Extension {ext} enabled")
                except Exception as e:
                    logger.warning(f"Could not enable extension {ext}: {e}")
    
    async def _create_monitoring_tables(self):
        """Create tables for monitoring and optimization"""
        create_tables_sql = """
        -- Query statistics table
        CREATE TABLE IF NOT EXISTS optimizer_query_stats (
            id SERIAL PRIMARY KEY,
            query_hash VARCHAR(64),
            query_text TEXT,
            calls BIGINT,
            total_time FLOAT,
            mean_time FLOAT,
            max_time FLOAT,
            rows_returned BIGINT,
            cache_hit_ratio FLOAT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(query_hash, timestamp)
        );
        
        -- Index recommendations table
        CREATE TABLE IF NOT EXISTS optimizer_index_recommendations (
            id SERIAL PRIMARY KEY,
            table_name VARCHAR(255),
            columns TEXT[],
            index_type VARCHAR(50),
            estimated_improvement FLOAT,
            estimated_size_mb FLOAT,
            reason TEXT,
            priority INTEGER,
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            applied_at TIMESTAMP
        );
        
        -- Table statistics
        CREATE TABLE IF NOT EXISTS optimizer_table_stats (
            id SERIAL PRIMARY KEY,
            table_name VARCHAR(255),
            row_count BIGINT,
            table_size_mb FLOAT,
            index_size_mb FLOAT,
            dead_tuples BIGINT,
            last_vacuum TIMESTAMP,
            last_analyze TIMESTAMP,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Create indexes on monitoring tables
        CREATE INDEX IF NOT EXISTS idx_query_stats_timestamp 
            ON optimizer_query_stats(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_query_stats_mean_time 
            ON optimizer_query_stats(mean_time DESC);
        CREATE INDEX IF NOT EXISTS idx_recommendations_status 
            ON optimizer_index_recommendations(status, priority DESC);
        """
        
        async with self.connection_pool.acquire() as conn:
            await conn.execute(create_tables_sql)
    
    # ================== Query Analysis ==================
    
    async def analyze_slow_queries(self) -> List[QueryStatistics]:
        """Analyze slow queries from pg_stat_statements"""
        query = """
        SELECT 
            queryid::text as query_hash,
            query,
            calls,
            total_time,
            mean_time,
            max_time,
            min_time,
            stddev_time,
            rows,
            100.0 * shared_blks_hit / 
                NULLIF(shared_blks_hit + shared_blks_read, 0) AS cache_hit_ratio
        FROM pg_stat_statements
        WHERE mean_time > $1
            AND query NOT LIKE '%pg_stat_statements%'
            AND query NOT LIKE '%optimizer_%'
        ORDER BY mean_time DESC
        LIMIT 100
        """
        
        slow_queries = []
        
        try:
            async with self.connection_pool.acquire() as conn:
                rows = await conn.fetch(query, self.config.slow_query_threshold_ms)
                
                for row in rows:
                    stat = QueryStatistics(
                        query_hash=row['query_hash'],
                        query_text=row['query'],
                        calls=row['calls'],
                        total_time_ms=row['total_time'],
                        mean_time_ms=row['mean_time'],
                        max_time_ms=row['max_time'],
                        min_time_ms=row['min_time'],
                        stddev_time_ms=row['stddev_time'] or 0,
                        rows_returned=row['rows'],
                        cache_hits=int(row['cache_hit_ratio'] or 0),
                        cache_misses=100 - int(row['cache_hit_ratio'] or 0)
                    )
                    slow_queries.append(stat)
                    self.query_stats[stat.query_hash] = stat
                
                # Store in monitoring table
                await self._store_query_stats(slow_queries)
                
        except Exception as e:
            logger.error(f"Error analyzing slow queries: {e}")
        
        return slow_queries
    
    async def analyze_query_plan(self, query: str, params: List[Any] = None) -> Dict[str, Any]:
        """Analyze query execution plan"""
        explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}"
        
        try:
            async with self.connection_pool.acquire() as conn:
                if params:
                    result = await conn.fetchval(explain_query, *params)
                else:
                    result = await conn.fetchval(explain_query)
                
                plan = json.loads(result)[0]
                
                # Extract key metrics
                analysis = {
                    'total_cost': plan['Plan']['Total Cost'],
                    'execution_time': plan['Execution Time'],
                    'planning_time': plan['Planning Time'],
                    'node_types': self._extract_node_types(plan['Plan']),
                    'scans': self._extract_scans(plan['Plan']),
                    'joins': self._extract_joins(plan['Plan']),
                    'sorts': self._extract_sorts(plan['Plan']),
                    'recommendations': self._generate_plan_recommendations(plan['Plan'])
                }
                
                return analysis
                
        except Exception as e:
            logger.error(f"Error analyzing query plan: {e}")
            return {}
    
    def _extract_node_types(self, plan_node: Dict) -> List[str]:
        """Extract all node types from query plan"""
        node_types = [plan_node.get('Node Type', '')]
        
        if 'Plans' in plan_node:
            for child in plan_node['Plans']:
                node_types.extend(self._extract_node_types(child))
        
        return node_types
    
    def _extract_scans(self, plan_node: Dict) -> List[Dict]:
        """Extract scan operations from query plan"""
        scans = []
        
        if 'Scan' in plan_node.get('Node Type', ''):
            scans.append({
                'type': plan_node['Node Type'],
                'table': plan_node.get('Relation Name', ''),
                'rows': plan_node.get('Actual Rows', 0),
                'cost': plan_node.get('Total Cost', 0),
                'filter': plan_node.get('Filter', '')
            })
        
        if 'Plans' in plan_node:
            for child in plan_node['Plans']:
                scans.extend(self._extract_scans(child))
        
        return scans
    
    def _extract_joins(self, plan_node: Dict) -> List[Dict]:
        """Extract join operations from query plan"""
        joins = []
        
        if 'Join' in plan_node.get('Node Type', ''):
            joins.append({
                'type': plan_node['Node Type'],
                'condition': plan_node.get('Join Filter', ''),
                'rows': plan_node.get('Actual Rows', 0),
                'cost': plan_node.get('Total Cost', 0)
            })
        
        if 'Plans' in plan_node:
            for child in plan_node['Plans']:
                joins.extend(self._extract_joins(child))
        
        return joins
    
    def _extract_sorts(self, plan_node: Dict) -> List[Dict]:
        """Extract sort operations from query plan"""
        sorts = []
        
        if plan_node.get('Node Type') == 'Sort':
            sorts.append({
                'keys': plan_node.get('Sort Key', []),
                'method': plan_node.get('Sort Method', ''),
                'space_used': plan_node.get('Sort Space Used', 0),
                'rows': plan_node.get('Actual Rows', 0)
            })
        
        if 'Plans' in plan_node:
            for child in plan_node['Plans']:
                sorts.extend(self._extract_sorts(child))
        
        return sorts
    
    def _generate_plan_recommendations(self, plan_node: Dict) -> List[str]:
        """Generate recommendations from query plan"""
        recommendations = []
        
        # Check for sequential scans on large tables
        if plan_node.get('Node Type') == 'Seq Scan':
            if plan_node.get('Actual Rows', 0) > 1000:
                recommendations.append(
                    f"Consider adding index on {plan_node.get('Relation Name', 'table')} "
                    f"for filter: {plan_node.get('Filter', 'no filter')}"
                )
        
        # Check for expensive sorts
        if plan_node.get('Node Type') == 'Sort':
            if plan_node.get('Sort Space Used', 0) > 1024:  # > 1MB
                recommendations.append(
                    f"Large sort operation detected. Consider adding index on sort keys: "
                    f"{plan_node.get('Sort Key', [])}"
                )
        
        # Check for nested loops on large datasets
        if plan_node.get('Node Type') == 'Nested Loop':
            if plan_node.get('Actual Rows', 0) > 10000:
                recommendations.append(
                    "Nested loop on large dataset. Consider using hash join or merge join"
                )
        
        # Recursively check child nodes
        if 'Plans' in plan_node:
            for child in plan_node['Plans']:
                recommendations.extend(self._generate_plan_recommendations(child))
        
        return recommendations
    
    # ================== Index Analysis ==================
    
    async def analyze_missing_indexes(self) -> List[IndexRecommendation]:
        """Analyze and recommend missing indexes"""
        recommendations = []
        
        # Analyze slow queries for missing indexes
        slow_queries = await self.analyze_slow_queries()
        
        for query_stat in slow_queries:
            # Parse query to extract WHERE, JOIN, and ORDER BY clauses
            recommendations.extend(
                await self._recommend_indexes_for_query(query_stat)
            )
        
        # Analyze foreign key constraints without indexes
        recommendations.extend(await self._check_foreign_key_indexes())
        
        # Analyze frequently filtered columns
        recommendations.extend(await self._analyze_column_selectivity())
        
        # Sort by priority and remove duplicates
        recommendations = self._deduplicate_recommendations(recommendations)
        recommendations.sort(key=lambda x: x.priority, reverse=True)
        
        # Store recommendations
        self.index_recommendations = recommendations
        await self._store_index_recommendations(recommendations)
        
        return recommendations
    
    async def _recommend_indexes_for_query(
        self, 
        query_stat: QueryStatistics
    ) -> List[IndexRecommendation]:
        """Recommend indexes for a specific query"""
        recommendations = []
        
        try:
            # Parse query to extract table and column references
            parsed = self._parse_query(query_stat.query_text)
            
            # Check for WHERE clause columns without indexes
            for table, columns in parsed['where_columns'].items():
                existing_indexes = await self._get_table_indexes(table)
                
                for column in columns:
                    if not self._column_has_index(column, existing_indexes):
                        # Check column selectivity
                        selectivity = await self._calculate_column_selectivity(table, column)
                        
                        if selectivity > self.config.min_selectivity:
                            recommendations.append(IndexRecommendation(
                                table_name=table,
                                columns=[column],
                                index_type=IndexType.BTREE,
                                estimated_improvement=selectivity * 50,  # Rough estimate
                                estimated_size_mb=await self._estimate_index_size(table, [column]),
                                reason=f"Missing index on WHERE clause column with {selectivity:.1%} selectivity",
                                priority=8 if selectivity > 0.5 else 6
                            ))
            
            # Check for JOIN columns without indexes
            for table, columns in parsed['join_columns'].items():
                existing_indexes = await self._get_table_indexes(table)
                
                for column in columns:
                    if not self._column_has_index(column, existing_indexes):
                        recommendations.append(IndexRecommendation(
                            table_name=table,
                            columns=[column],
                            index_type=IndexType.HASH if '=' in query_stat.query_text else IndexType.BTREE,
                            estimated_improvement=30,
                            estimated_size_mb=await self._estimate_index_size(table, [column]),
                            reason="Missing index on JOIN column",
                            priority=7
                        ))
            
            # Check for ORDER BY columns without indexes
            for table, columns in parsed['order_columns'].items():
                if len(columns) > 1:
                    # Multi-column index for ORDER BY
                    recommendations.append(IndexRecommendation(
                        table_name=table,
                        columns=columns,
                        index_type=IndexType.BTREE,
                        estimated_improvement=25,
                        estimated_size_mb=await self._estimate_index_size(table, columns),
                        reason="Missing index for ORDER BY clause",
                        priority=5
                    ))
            
            # Check for full-text search patterns
            if 'LIKE' in query_stat.query_text or 'ILIKE' in query_stat.query_text:
                for table, columns in parsed['where_columns'].items():
                    for column in columns:
                        if await self._is_text_column(table, column):
                            recommendations.append(IndexRecommendation(
                                table_name=table,
                                columns=[column],
                                index_type=IndexType.GIN,
                                estimated_improvement=40,
                                estimated_size_mb=await self._estimate_index_size(table, [column]) * 1.5,
                                reason="Text search without GIN index",
                                priority=6
                            ))
            
        except Exception as e:
            logger.error(f"Error recommending indexes for query: {e}")
        
        return recommendations
    
    def _parse_query(self, query_text: str) -> Dict[str, Dict[str, List[str]]]:
        """Parse SQL query to extract table and column references"""
        parsed = {
            'where_columns': {},
            'join_columns': {},
            'order_columns': {},
            'group_columns': {}
        }
        
        # Simplified parsing (in production, use a proper SQL parser)
        # Extract WHERE clause
        where_match = re.search(r'WHERE\s+(.*?)(?:GROUP|ORDER|LIMIT|$)', query_text, re.IGNORECASE | re.DOTALL)
        if where_match:
            where_clause = where_match.group(1)
            # Extract table.column references
            column_refs = re.findall(r'(\w+)\.(\w+)', where_clause)
            for table, column in column_refs:
                if table not in parsed['where_columns']:
                    parsed['where_columns'][table] = []
                parsed['where_columns'][table].append(column)
        
        # Extract JOIN clauses
        join_matches = re.findall(r'JOIN\s+(\w+)\s+ON\s+(.*?)(?:JOIN|WHERE|GROUP|ORDER|$)', query_text, re.IGNORECASE)
        for table, condition in join_matches:
            column_refs = re.findall(r'(\w+)\.(\w+)', condition)
            for t, column in column_refs:
                if t not in parsed['join_columns']:
                    parsed['join_columns'][t] = []
                parsed['join_columns'][t].append(column)
        
        # Extract ORDER BY clause
        order_match = re.search(r'ORDER\s+BY\s+(.*?)(?:LIMIT|$)', query_text, re.IGNORECASE)
        if order_match:
            order_clause = order_match.group(1)
            column_refs = re.findall(r'(\w+)\.(\w+)', order_clause)
            for table, column in column_refs:
                if table not in parsed['order_columns']:
                    parsed['order_columns'][table] = []
                parsed['order_columns'][table].append(column)
        
        return parsed
    
    async def _check_foreign_key_indexes(self) -> List[IndexRecommendation]:
        """Check for missing indexes on foreign key columns"""
        recommendations = []
        
        query = """
        SELECT
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
        """
        
        async with self.connection_pool.acquire() as conn:
            fk_columns = await conn.fetch(query)
            
            for row in fk_columns:
                table = row['table_name']
                column = row['column_name']
                
                # Check if index exists
                existing_indexes = await self._get_table_indexes(table)
                
                if not self._column_has_index(column, existing_indexes):
                    recommendations.append(IndexRecommendation(
                        table_name=table,
                        columns=[column],
                        index_type=IndexType.BTREE,
                        estimated_improvement=35,
                        estimated_size_mb=await self._estimate_index_size(table, [column]),
                        reason=f"Missing index on foreign key to {row['foreign_table_name']}.{row['foreign_column_name']}",
                        priority=7
                    ))
        
        return recommendations
    
    async def _analyze_column_selectivity(self) -> List[IndexRecommendation]:
        """Analyze column selectivity for index recommendations"""
        recommendations = []
        
        # Get frequently accessed tables
        query = """
        SELECT 
            schemaname,
            tablename,
            n_tup_ins + n_tup_upd + n_tup_del as write_activity,
            idx_scan + seq_scan as read_activity
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY read_activity DESC
        LIMIT 20
        """
        
        async with self.connection_pool.acquire() as conn:
            tables = await conn.fetch(query)
            
            for table_row in tables:
                table = table_row['tablename']
                
                # Analyze columns in this table
                columns = await self._get_table_columns(table)
                
                for column in columns:
                    # Skip if already has index
                    existing_indexes = await self._get_table_indexes(table)
                    if self._column_has_index(column['name'], existing_indexes):
                        continue
                    
                    # Calculate selectivity
                    selectivity = await self._calculate_column_selectivity(table, column['name'])
                    
                    if selectivity > self.config.min_selectivity:
                        # Determine index type based on data type
                        index_type = self._recommend_index_type(column['type'], selectivity)
                        
                        recommendations.append(IndexRecommendation(
                            table_name=table,
                            columns=[column['name']],
                            index_type=index_type,
                            estimated_improvement=selectivity * 30,
                            estimated_size_mb=await self._estimate_index_size(table, [column['name']]),
                            reason=f"High selectivity column ({selectivity:.1%}) without index",
                            priority=int(selectivity * 10)
                        ))
        
        return recommendations
    
    async def _calculate_column_selectivity(self, table: str, column: str) -> float:
        """Calculate selectivity of a column (distinct values / total rows)"""
        try:
            query = f"""
            SELECT 
                COUNT(DISTINCT {column})::float / NULLIF(COUNT(*)::float, 0) as selectivity
            FROM {table}
            """
            
            async with self.connection_pool.acquire() as conn:
                result = await conn.fetchval(query)
                return result or 0.0
                
        except Exception as e:
            logger.error(f"Error calculating selectivity for {table}.{column}: {e}")
            return 0.0
    
    def _recommend_index_type(self, data_type: str, selectivity: float) -> IndexType:
        """Recommend index type based on data type and selectivity"""
        data_type = data_type.upper()
        
        # JSONB columns
        if 'JSON' in data_type:
            return IndexType.GIN
        
        # Array columns
        if 'ARRAY' in data_type or '[]' in data_type:
            return IndexType.GIN
        
        # Text columns for full-text search
        if data_type in ['TEXT', 'VARCHAR'] and selectivity > 0.7:
            return IndexType.GIN
        
        # High selectivity with equality only
        if selectivity > 0.95:
            return IndexType.HASH
        
        # Large tables with natural ordering
        if data_type in ['TIMESTAMP', 'DATE', 'INTEGER', 'BIGINT']:
            return IndexType.BTREE  # Could be BRIN for very large tables
        
        # Default
        return IndexType.BTREE
    
    async def _estimate_index_size(self, table: str, columns: List[str]) -> float:
        """Estimate index size in MB"""
        try:
            # Get table statistics
            query = f"""
            SELECT 
                pg_relation_size('{table}'::regclass) / 1024.0 / 1024.0 as table_size_mb,
                reltuples as row_count,
                relpages as pages
            FROM pg_class
            WHERE relname = '{table}'
            """
            
            async with self.connection_pool.acquire() as conn:
                stats = await conn.fetchrow(query)
                
                if not stats:
                    return 0.0
                
                # Estimate based on column types and row count
                # Simplified estimation (in production, use more sophisticated calculation)
                bytes_per_entry = len(columns) * 8  # Assume 8 bytes average per column
                overhead_factor = 1.3  # 30% overhead for B-tree structure
                
                estimated_size_bytes = stats['row_count'] * bytes_per_entry * overhead_factor
                estimated_size_mb = estimated_size_bytes / 1024 / 1024
                
                return estimated_size_mb
                
        except Exception as e:
            logger.error(f"Error estimating index size: {e}")
            return 0.0
    
    # ================== Index Management ==================
    
    async def create_recommended_indexes(
        self, 
        max_indexes: int = 5,
        min_priority: int = 5
    ) -> List[str]:
        """Create recommended indexes"""
        created_indexes = []
        
        # Get top recommendations
        recommendations = [
            r for r in self.index_recommendations 
            if r.priority >= min_priority
        ][:max_indexes]
        
        for rec in recommendations:
            try:
                index_name = f"idx_{rec.table_name}_{'_'.join(rec.columns)}"
                
                # Build CREATE INDEX statement
                index_sql = self._build_create_index_sql(index_name, rec)
                
                # Create index concurrently to avoid locking
                async with self.connection_pool.acquire() as conn:
                    await conn.execute(index_sql)
                    
                    created_indexes.append(index_name)
                    logger.info(f"Created index: {index_name}")
                    
                    # Update recommendation status
                    await self._update_recommendation_status(rec, 'applied')
                    
            except Exception as e:
                logger.error(f"Error creating index for {rec.table_name}: {e}")
        
        return created_indexes
    
    def _build_create_index_sql(self, index_name: str, rec: IndexRecommendation) -> str:
        """Build CREATE INDEX SQL statement"""
        columns_str = ', '.join(rec.columns)
        
        sql = f"CREATE INDEX CONCURRENTLY IF NOT EXISTS {index_name} ON {rec.table_name}"
        
        # Add USING clause for index type
        if rec.index_type != IndexType.BTREE:
            sql += f" USING {rec.index_type.value}"
        
        sql += f" ({columns_str})"
        
        # Add WHERE clause for partial index
        if rec.where_clause:
            sql += f" WHERE {rec.where_clause}"
        
        # Add INCLUDE clause for covering index
        if rec.include_columns:
            sql += f" INCLUDE ({', '.join(rec.include_columns)})"
        
        return sql
    
    async def drop_unused_indexes(self, days_unused: int = 30) -> List[str]:
        """Drop indexes that haven't been used recently"""
        dropped_indexes = []
        
        query = """
        SELECT 
            schemaname,
            tablename,
            indexname,
            idx_scan,
            pg_size_pretty(pg_relation_size(indexrelid)) as index_size
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
            AND indexname NOT LIKE 'pk_%'
            AND indexname NOT LIKE '%_pkey'
            AND idx_scan = 0
        """
        
        async with self.connection_pool.acquire() as conn:
            unused_indexes = await conn.fetch(query)
            
            for idx in unused_indexes:
                try:
                    # Drop index
                    await conn.execute(f"DROP INDEX CONCURRENTLY IF EXISTS {idx['indexname']}")
                    dropped_indexes.append(idx['indexname'])
                    logger.info(f"Dropped unused index: {idx['indexname']}")
                    
                except Exception as e:
                    logger.error(f"Error dropping index {idx['indexname']}: {e}")
        
        return dropped_indexes
    
    # ================== Table Optimization ==================
    
    async def optimize_table_partitioning(self, table: str, partition_key: str = 'created_at'):
        """Recommend and create table partitions"""
        try:
            # Check table size
            query = f"""
            SELECT 
                pg_size_pretty(pg_total_relation_size('{table}'::regclass)) as total_size,
                pg_total_relation_size('{table}'::regclass) / 1024.0 / 1024.0 as size_mb,
                reltuples as row_count
            FROM pg_class
            WHERE relname = '{table}'
            """
            
            async with self.connection_pool.acquire() as conn:
                stats = await conn.fetchrow(query)
                
                # Recommend partitioning for large tables
                if stats and stats['size_mb'] > 1000:  # > 1GB
                    logger.info(f"Table {table} is {stats['total_size']}, recommending partitioning")
                    
                    # Create partitioned table
                    await self._create_partitioned_table(table, partition_key)
                    
        except Exception as e:
            logger.error(f"Error optimizing table partitioning: {e}")
    
    async def _create_partitioned_table(self, table: str, partition_key: str):
        """Create partitioned version of table"""
        # Implementation depends on specific partitioning strategy
        # Example: Range partitioning by date
        pass
    
    # ================== Connection Pool Optimization ==================
    
    async def optimize_connection_pool(self) -> Dict[str, Any]:
        """Optimize database connection pool settings"""
        recommendations = {}
        
        # Get current connection statistics
        query = """
        SELECT 
            count(*) as total_connections,
            count(*) FILTER (WHERE state = 'active') as active_connections,
            count(*) FILTER (WHERE state = 'idle') as idle_connections,
            count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
            max(EXTRACT(EPOCH FROM (now() - state_change))) as max_idle_time
        FROM pg_stat_activity
        WHERE datname = current_database()
        """
        
        async with self.connection_pool.acquire() as conn:
            stats = await conn.fetchrow(query)
            
            # Recommend pool size adjustments
            if stats['active_connections'] > self.config.pool_size * 0.8:
                recommendations['pool_size'] = int(self.config.pool_size * 1.5)
                recommendations['reason'] = "High connection utilization"
            elif stats['active_connections'] < self.config.pool_size * 0.2:
                recommendations['pool_size'] = max(10, int(self.config.pool_size * 0.5))
                recommendations['reason'] = "Low connection utilization"
            
            # Check for connection leaks
            if stats['idle_in_transaction'] > 5:
                recommendations['warning'] = "Possible connection leak - idle transactions detected"
            
            # Check for long-running connections
            if stats['max_idle_time'] > 3600:  # 1 hour
                recommendations['pool_recycle'] = 1800  # 30 minutes
                recommendations['idle_timeout'] = 600  # 10 minutes
        
        return recommendations
    
    # ================== Maintenance ==================
    
    async def _run_maintenance(self):
        """Run periodic maintenance tasks"""
        while True:
            try:
                await asyncio.sleep(self.config.analyze_interval_minutes * 60)
                
                # Run VACUUM on tables with dead tuples
                await self._vacuum_tables()
                
                # Update table statistics
                await self._analyze_tables()
                
                # Clean old monitoring data
                await self._cleanup_monitoring_data()
                
            except Exception as e:
                logger.error(f"Error in maintenance task: {e}")
    
    async def _vacuum_tables(self):
        """Run VACUUM on tables that need it"""
        query = """
        SELECT 
            schemaname,
            tablename,
            n_dead_tup,
            n_live_tup,
            last_vacuum,
            last_autovacuum
        FROM pg_stat_user_tables
        WHERE n_dead_tup > 1000
            AND n_dead_tup > n_live_tup * 0.1
        ORDER BY n_dead_tup DESC
        LIMIT 10
        """
        
        async with self.connection_pool.acquire() as conn:
            tables = await conn.fetch(query)
            
            for table in tables:
                try:
                    # Run VACUUM (non-blocking)
                    await conn.execute(f"VACUUM (ANALYZE) {table['tablename']}")
                    logger.info(f"Vacuumed table {table['tablename']} ({table['n_dead_tup']} dead tuples)")
                except Exception as e:
                    logger.error(f"Error vacuuming table {table['tablename']}: {e}")
    
    async def _analyze_tables(self):
        """Update table statistics"""
        query = """
        SELECT 
            tablename
        FROM pg_stat_user_tables
        WHERE last_analyze < NOW() - INTERVAL '1 day'
            OR last_analyze IS NULL
        ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC
        LIMIT 10
        """
        
        async with self.connection_pool.acquire() as conn:
            tables = await conn.fetch(query)
            
            for table in tables:
                try:
                    await conn.execute(f"ANALYZE {table['tablename']}")
                    logger.info(f"Analyzed table {table['tablename']}")
                except Exception as e:
                    logger.error(f"Error analyzing table {table['tablename']}: {e}")
    
    async def _cleanup_monitoring_data(self):
        """Clean up old monitoring data"""
        cutoff_date = datetime.now() - timedelta(days=self.config.metrics_retention_days)
        
        queries = [
            f"DELETE FROM optimizer_query_stats WHERE timestamp < '{cutoff_date}'",
            f"DELETE FROM optimizer_table_stats WHERE timestamp < '{cutoff_date}'"
        ]
        
        async with self.connection_pool.acquire() as conn:
            for query in queries:
                try:
                    deleted = await conn.execute(query)
                    logger.info(f"Cleaned up monitoring data: {deleted}")
                except Exception as e:
                    logger.error(f"Error cleaning monitoring data: {e}")
    
    # ================== Monitoring ==================
    
    async def _monitor_performance(self):
        """Monitor database performance continuously"""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute
                
                # Collect performance metrics
                metrics = await self._collect_performance_metrics()
                
                # Check for issues
                issues = self._check_performance_issues(metrics)
                
                if issues:
                    logger.warning(f"Performance issues detected: {issues}")
                    
                    # Take corrective action
                    await self._handle_performance_issues(issues)
                
            except Exception as e:
                logger.error(f"Error in performance monitoring: {e}")
    
    async def _collect_performance_metrics(self) -> Dict[str, Any]:
        """Collect current performance metrics"""
        metrics = {}
        
        queries = {
            'connections': """
                SELECT count(*) as total,
                       count(*) FILTER (WHERE state = 'active') as active,
                       count(*) FILTER (WHERE wait_event IS NOT NULL) as waiting
                FROM pg_stat_activity
            """,
            'cache_hit_ratio': """
                SELECT 
                    sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100 as cache_hit_ratio
                FROM pg_statio_user_tables
            """,
            'transaction_stats': """
                SELECT 
                    xact_commit,
                    xact_rollback,
                    deadlocks,
                    conflicts
                FROM pg_stat_database
                WHERE datname = current_database()
            """,
            'table_bloat': """
                SELECT 
                    tablename,
                    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as total_size,
                    n_dead_tup,
                    n_live_tup
                FROM pg_stat_user_tables
                WHERE n_dead_tup > 10000
                ORDER BY n_dead_tup DESC
                LIMIT 5
            """
        }
        
        async with self.connection_pool.acquire() as conn:
            for key, query in queries.items():
                try:
                    result = await conn.fetch(query)
                    metrics[key] = result
                except Exception as e:
                    logger.error(f"Error collecting metric {key}: {e}")
        
        return metrics
    
    def _check_performance_issues(self, metrics: Dict[str, Any]) -> List[str]:
        """Check for performance issues in metrics"""
        issues = []
        
        # Check connection saturation
        if metrics.get('connections'):
            conn_stats = metrics['connections'][0]
            if conn_stats['active'] > self.config.pool_size * 0.9:
                issues.append("Connection pool near saturation")
            if conn_stats['waiting'] > 10:
                issues.append(f"{conn_stats['waiting']} connections waiting for locks")
        
        # Check cache hit ratio
        if metrics.get('cache_hit_ratio'):
            ratio = metrics['cache_hit_ratio'][0]['cache_hit_ratio']
            if ratio and ratio < 90:
                issues.append(f"Low cache hit ratio: {ratio:.1f}%")
        
        # Check for deadlocks
        if metrics.get('transaction_stats'):
            stats = metrics['transaction_stats'][0]
            if stats['deadlocks'] > 0:
                issues.append(f"{stats['deadlocks']} deadlocks detected")
        
        # Check table bloat
        if metrics.get('table_bloat'):
            for table in metrics['table_bloat']:
                if table['n_dead_tup'] > table['n_live_tup'] * 0.2:
                    issues.append(f"Table {table['tablename']} has excessive bloat")
        
        return issues
    
    async def _handle_performance_issues(self, issues: List[str]):
        """Take corrective action for performance issues"""
        for issue in issues:
            if "Connection pool" in issue:
                # Increase pool size temporarily
                self.config.pool_size = min(100, self.config.pool_size + 10)
                logger.info(f"Increased pool size to {self.config.pool_size}")
                
            elif "cache hit ratio" in issue:
                # Recommend increasing shared_buffers
                logger.warning("Consider increasing shared_buffers in PostgreSQL config")
                
            elif "deadlocks" in issue:
                # Log deadlock details for investigation
                await self._log_deadlock_details()
                
            elif "bloat" in issue:
                # Schedule vacuum for bloated tables
                await self._vacuum_tables()
    
    async def _log_deadlock_details(self):
        """Log details about deadlocks for debugging"""
        query = """
        SELECT 
            pid,
            usename,
            state,
            query,
            wait_event_type,
            wait_event
        FROM pg_stat_activity
        WHERE wait_event_type = 'Lock'
        """
        
        async with self.connection_pool.acquire() as conn:
            locks = await conn.fetch(query)
            for lock in locks:
                logger.warning(f"Deadlock detail: {lock}")
    
    # ================== Helper Methods ==================
    
    async def _get_table_indexes(self, table: str) -> List[Dict]:
        """Get existing indexes for a table"""
        query = """
        SELECT 
            indexname,
            indexdef
        FROM pg_indexes
        WHERE tablename = $1
        """
        
        async with self.connection_pool.acquire() as conn:
            indexes = await conn.fetch(query, table)
            return [dict(idx) for idx in indexes]
    
    async def _get_table_columns(self, table: str) -> List[Dict]:
        """Get columns for a table"""
        query = """
        SELECT 
            column_name as name,
            data_type as type,
            is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
            AND table_schema = 'public'
        """
        
        async with self.connection_pool.acquire() as conn:
            columns = await conn.fetch(query, table)
            return [dict(col) for col in columns]
    
    def _column_has_index(self, column: str, indexes: List[Dict]) -> bool:
        """Check if column has an index"""
        for idx in indexes:
            if f'({column})' in idx['indexdef'] or f'{column},' in idx['indexdef']:
                return True
        return False
    
    async def _is_text_column(self, table: str, column: str) -> bool:
        """Check if column is text type"""
        columns = await self._get_table_columns(table)
        for col in columns:
            if col['name'] == column:
                return col['type'] in ['text', 'varchar', 'character varying']
        return False
    
    def _deduplicate_recommendations(
        self, 
        recommendations: List[IndexRecommendation]
    ) -> List[IndexRecommendation]:
        """Remove duplicate index recommendations"""
        seen = set()
        unique = []
        
        for rec in recommendations:
            key = (rec.table_name, tuple(sorted(rec.columns)))
            if key not in seen:
                seen.add(key)
                unique.append(rec)
        
        return unique
    
    async def _store_query_stats(self, stats: List[QueryStatistics]):
        """Store query statistics in monitoring table"""
        if not stats:
            return
        
        query = """
        INSERT INTO optimizer_query_stats 
        (query_hash, query_text, calls, total_time, mean_time, max_time, rows_returned, cache_hit_ratio)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (query_hash, timestamp) DO NOTHING
        """
        
        async with self.connection_pool.acquire() as conn:
            for stat in stats:
                try:
                    await conn.execute(
                        query,
                        stat.query_hash,
                        stat.query_text[:5000],  # Truncate long queries
                        stat.calls,
                        stat.total_time_ms,
                        stat.mean_time_ms,
                        stat.max_time_ms,
                        stat.rows_returned,
                        stat.cache_hits
                    )
                except Exception as e:
                    logger.error(f"Error storing query stat: {e}")
    
    async def _store_index_recommendations(self, recommendations: List[IndexRecommendation]):
        """Store index recommendations in monitoring table"""
        if not recommendations:
            return
        
        query = """
        INSERT INTO optimizer_index_recommendations
        (table_name, columns, index_type, estimated_improvement, estimated_size_mb, reason, priority)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        """
        
        async with self.connection_pool.acquire() as conn:
            for rec in recommendations:
                try:
                    await conn.execute(
                        query,
                        rec.table_name,
                        rec.columns,
                        rec.index_type.value,
                        rec.estimated_improvement,
                        rec.estimated_size_mb,
                        rec.reason,
                        rec.priority
                    )
                except Exception as e:
                    logger.error(f"Error storing recommendation: {e}")
    
    async def _update_recommendation_status(self, rec: IndexRecommendation, status: str):
        """Update status of index recommendation"""
        query = """
        UPDATE optimizer_index_recommendations
        SET status = $1, applied_at = CURRENT_TIMESTAMP
        WHERE table_name = $2 AND columns = $3
        """
        
        async with self.connection_pool.acquire() as conn:
            try:
                await conn.execute(query, status, rec.table_name, rec.columns)
            except Exception as e:
                logger.error(f"Error updating recommendation status: {e}")
    
    async def close(self):
        """Close database connections"""
        if self.monitoring_task:
            self.monitoring_task.cancel()
        if self.maintenance_task:
            self.maintenance_task.cancel()
        
        if self.connection_pool:
            await self.connection_pool.close()
        if self.async_engine:
            await self.async_engine.dispose()

# ================== Usage Example ==================

async def example_usage():
    """Example usage of database optimizer"""
    
    config = DatabaseOptimizerConfig(
        database_url="postgresql+asyncpg://user:password@localhost/spirittours",
        slow_query_threshold_ms=100,
        analyze_interval_minutes=60
    )
    
    optimizer = DatabaseOptimizer(config)
    await optimizer.initialize()
    
    # Analyze slow queries
    slow_queries = await optimizer.analyze_slow_queries()
    print(f"Found {len(slow_queries)} slow queries")
    
    # Get index recommendations
    recommendations = await optimizer.analyze_missing_indexes()
    print(f"Found {len(recommendations)} index recommendations")
    
    # Create top recommended indexes
    created = await optimizer.create_recommended_indexes(max_indexes=3)
    print(f"Created indexes: {created}")
    
    # Optimize connection pool
    pool_recommendations = await optimizer.optimize_connection_pool()
    print(f"Pool recommendations: {pool_recommendations}")
    
    # Close connections
    await optimizer.close()

if __name__ == "__main__":
    asyncio.run(example_usage())