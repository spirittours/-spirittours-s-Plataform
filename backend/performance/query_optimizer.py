"""
Database Query Optimizer - Phase 7

Optimizes database queries for better performance:
- Query analysis
- Index recommendations
- Query rewriting
- Batch operations
- Connection pooling
- Query caching

Autor: Spirit Tours Performance Team
Fecha: 2025-10-18
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import time
import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class QueryType(str, Enum):
    """Types of database queries."""
    SELECT = "SELECT"
    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    JOIN = "JOIN"
    AGGREGATE = "AGGREGATE"


class OptimizationLevel(str, Enum):
    """Optimization levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class QueryMetrics:
    """Query execution metrics."""
    query_id: str
    query_type: QueryType
    execution_time_ms: float
    rows_affected: int
    cpu_usage: float
    memory_usage: float
    cache_hit: bool
    timestamp: datetime
    
    def is_slow(self, threshold_ms: float = 100) -> bool:
        """Check if query is slow."""
        return self.execution_time_ms > threshold_ms


@dataclass
class IndexRecommendation:
    """Index recommendation for optimization."""
    table_name: str
    columns: List[str]
    index_type: str  # "btree", "hash", "gin", "gist"
    estimated_improvement: float  # percentage
    reason: str
    priority: OptimizationLevel


class QueryOptimizer:
    """
    Database query optimizer with intelligent analysis.
    """
    
    def __init__(self):
        """Initialize query optimizer."""
        self.query_history: List[QueryMetrics] = []
        self.slow_query_threshold_ms = 100
        self.cache_hit_target = 0.80  # 80% cache hit rate
        logger.info("QueryOptimizer initialized")
    
    def analyze_query(self, query: str) -> Dict[str, Any]:
        """
        Analyze query for optimization opportunities.
        
        Args:
            query: SQL query string
        
        Returns:
            Analysis results with recommendations
        """
        analysis = {
            "query": query,
            "query_type": self._detect_query_type(query),
            "issues": [],
            "recommendations": [],
            "estimated_cost": 0
        }
        
        # Check for common anti-patterns
        issues = self._detect_antipatterns(query)
        analysis["issues"].extend(issues)
        
        # Check for missing indexes
        if "WHERE" in query.upper():
            analysis["recommendations"].append(
                "Consider adding index on WHERE clause columns"
            )
        
        # Check for SELECT *
        if "SELECT *" in query.upper():
            analysis["issues"].append(
                "Using SELECT * - specify only needed columns"
            )
            analysis["recommendations"].append(
                "Replace SELECT * with specific column names"
            )
        
        # Check for LIKE with leading wildcard
        if "LIKE '%%" in query.upper() or "LIKE '%" in query.upper():
            analysis["issues"].append(
                "LIKE with leading wildcard prevents index usage"
            )
            analysis["recommendations"].append(
                "Consider full-text search or restructure query"
            )
        
        # Check for N+1 queries
        if analysis["query_type"] == QueryType.SELECT:
            analysis["recommendations"].append(
                "Check for N+1 query pattern - use JOIN or batch loading"
            )
        
        # Estimate query cost (simplified)
        analysis["estimated_cost"] = self._estimate_query_cost(query)
        
        return analysis
    
    def _detect_query_type(self, query: str) -> QueryType:
        """Detect query type from SQL."""
        query_upper = query.upper().strip()
        
        if query_upper.startswith("SELECT"):
            if "JOIN" in query_upper:
                return QueryType.JOIN
            elif any(agg in query_upper for agg in ["COUNT", "SUM", "AVG", "MAX", "MIN", "GROUP BY"]):
                return QueryType.AGGREGATE
            return QueryType.SELECT
        elif query_upper.startswith("INSERT"):
            return QueryType.INSERT
        elif query_upper.startswith("UPDATE"):
            return QueryType.UPDATE
        elif query_upper.startswith("DELETE"):
            return QueryType.DELETE
        
        return QueryType.SELECT
    
    def _detect_antipatterns(self, query: str) -> List[str]:
        """Detect common query anti-patterns."""
        issues = []
        query_upper = query.upper()
        
        # No WHERE clause on UPDATE/DELETE
        if ("UPDATE" in query_upper or "DELETE" in query_upper) and "WHERE" not in query_upper:
            issues.append("CRITICAL: UPDATE/DELETE without WHERE clause")
        
        # Multiple JOINs without proper indexing
        join_count = query_upper.count("JOIN")
        if join_count > 3:
            issues.append(f"Query has {join_count} JOINs - may need optimization")
        
        # Subqueries in SELECT
        if "SELECT" in query_upper and query_upper.count("SELECT") > 1:
            issues.append("Subquery in SELECT - consider JOIN instead")
        
        # OR in WHERE clause
        if "WHERE" in query_upper and " OR " in query_upper:
            issues.append("OR in WHERE clause may prevent index usage")
        
        # Function on indexed column
        for func in ["LOWER(", "UPPER(", "SUBSTRING(", "DATE("]:
            if func in query_upper:
                issues.append(f"Function {func} on column may prevent index usage")
        
        return issues
    
    def _estimate_query_cost(self, query: str) -> int:
        """Estimate query cost (simplified)."""
        cost = 1
        query_upper = query.upper()
        
        # Base costs
        if "SELECT *" in query_upper:
            cost += 2
        
        # JOIN costs
        join_count = query_upper.count("JOIN")
        cost += join_count * 10
        
        # Subquery costs
        subquery_count = query_upper.count("SELECT") - 1
        cost += subquery_count * 5
        
        # LIKE costs
        if "LIKE" in query_upper:
            cost += 3
        
        # Sort costs
        if "ORDER BY" in query_upper:
            cost += 2
        
        # Aggregate costs
        for agg in ["COUNT", "SUM", "AVG", "GROUP BY"]:
            if agg in query_upper:
                cost += 2
        
        return cost
    
    def recommend_indexes(
        self,
        table_name: str,
        frequent_where_columns: List[str],
        frequent_join_columns: List[str],
        query_patterns: List[str]
    ) -> List[IndexRecommendation]:
        """
        Recommend indexes based on query patterns.
        
        Args:
            table_name: Table name
            frequent_where_columns: Columns frequently used in WHERE
            frequent_join_columns: Columns frequently used in JOINs
            query_patterns: Common query patterns
        
        Returns:
            List of index recommendations
        """
        recommendations = []
        
        # Single-column indexes for WHERE clauses
        for column in frequent_where_columns:
            recommendations.append(
                IndexRecommendation(
                    table_name=table_name,
                    columns=[column],
                    index_type="btree",
                    estimated_improvement=25.0,
                    reason=f"Column '{column}' frequently used in WHERE clauses",
                    priority=OptimizationLevel.HIGH
                )
            )
        
        # Indexes for JOIN columns
        for column in frequent_join_columns:
            recommendations.append(
                IndexRecommendation(
                    table_name=table_name,
                    columns=[column],
                    index_type="btree",
                    estimated_improvement=40.0,
                    reason=f"Column '{column}' frequently used in JOINs",
                    priority=OptimizationLevel.CRITICAL
                )
            )
        
        # Composite indexes for common WHERE combinations
        if len(frequent_where_columns) >= 2:
            recommendations.append(
                IndexRecommendation(
                    table_name=table_name,
                    columns=frequent_where_columns[:3],  # Top 3 columns
                    index_type="btree",
                    estimated_improvement=35.0,
                    reason="Composite index for common query patterns",
                    priority=OptimizationLevel.HIGH
                )
            )
        
        # Text search indexes
        for pattern in query_patterns:
            if "LIKE" in pattern.upper() or "ILIKE" in pattern.upper():
                # Recommend GIN index for full-text search
                recommendations.append(
                    IndexRecommendation(
                        table_name=table_name,
                        columns=["_text_search_column"],
                        index_type="gin",
                        estimated_improvement=60.0,
                        reason="Full-text search optimization with GIN index",
                        priority=OptimizationLevel.MEDIUM
                    )
                )
                break
        
        return recommendations
    
    def optimize_batch_operations(
        self,
        operations: List[Dict[str, Any]],
        batch_size: int = 1000
    ) -> List[List[Dict[str, Any]]]:
        """
        Optimize batch operations by grouping.
        
        Args:
            operations: List of database operations
            batch_size: Size of each batch
        
        Returns:
            Batched operations
        """
        batches = []
        current_batch = []
        
        for op in operations:
            current_batch.append(op)
            
            if len(current_batch) >= batch_size:
                batches.append(current_batch)
                current_batch = []
        
        # Add remaining operations
        if current_batch:
            batches.append(current_batch)
        
        logger.info(f"Optimized {len(operations)} operations into {len(batches)} batches")
        
        return batches
    
    def track_query_performance(
        self,
        query_id: str,
        query_type: QueryType,
        execution_time_ms: float,
        rows_affected: int = 0,
        cache_hit: bool = False
    ) -> QueryMetrics:
        """
        Track query performance metrics.
        
        Args:
            query_id: Unique query identifier
            query_type: Type of query
            execution_time_ms: Execution time in milliseconds
            rows_affected: Number of rows affected
            cache_hit: Whether result was from cache
        
        Returns:
            Query metrics
        """
        metrics = QueryMetrics(
            query_id=query_id,
            query_type=query_type,
            execution_time_ms=execution_time_ms,
            rows_affected=rows_affected,
            cpu_usage=0.0,  # Would be measured in production
            memory_usage=0.0,  # Would be measured in production
            cache_hit=cache_hit,
            timestamp=datetime.now()
        )
        
        self.query_history.append(metrics)
        
        # Log slow queries
        if metrics.is_slow(self.slow_query_threshold_ms):
            logger.warning(
                f"SLOW QUERY: {query_id} took {execution_time_ms:.2f}ms "
                f"({rows_affected} rows)"
            )
        
        return metrics
    
    def get_performance_report(
        self,
        last_hours: int = 24
    ) -> Dict[str, Any]:
        """
        Generate performance report.
        
        Args:
            last_hours: Report period in hours
        
        Returns:
            Performance report
        """
        cutoff = datetime.now() - timedelta(hours=last_hours)
        recent_queries = [
            q for q in self.query_history
            if q.timestamp >= cutoff
        ]
        
        if not recent_queries:
            return {"message": "No query data available"}
        
        # Calculate statistics
        total_queries = len(recent_queries)
        slow_queries = [q for q in recent_queries if q.is_slow()]
        cache_hits = [q for q in recent_queries if q.cache_hit]
        
        avg_execution_time = sum(q.execution_time_ms for q in recent_queries) / total_queries
        
        # Group by query type
        by_type = {}
        for query in recent_queries:
            if query.query_type not in by_type:
                by_type[query.query_type] = []
            by_type[query.query_type].append(query)
        
        type_stats = {}
        for qtype, queries in by_type.items():
            type_stats[qtype.value] = {
                "count": len(queries),
                "avg_time_ms": sum(q.execution_time_ms for q in queries) / len(queries),
                "slow_count": len([q for q in queries if q.is_slow()])
            }
        
        return {
            "period_hours": last_hours,
            "total_queries": total_queries,
            "slow_queries": {
                "count": len(slow_queries),
                "percentage": (len(slow_queries) / total_queries) * 100
            },
            "cache_performance": {
                "hits": len(cache_hits),
                "hit_rate": (len(cache_hits) / total_queries) * 100,
                "target": self.cache_hit_target * 100
            },
            "avg_execution_time_ms": round(avg_execution_time, 2),
            "by_query_type": type_stats,
            "top_slow_queries": [
                {
                    "query_id": q.query_id,
                    "type": q.query_type.value,
                    "time_ms": q.execution_time_ms,
                    "rows": q.rows_affected
                }
                for q in sorted(
                    slow_queries,
                    key=lambda x: x.execution_time_ms,
                    reverse=True
                )[:10]
            ]
        }


# Singleton instance
_optimizer: Optional[QueryOptimizer] = None


def get_optimizer() -> QueryOptimizer:
    """Get query optimizer singleton instance."""
    global _optimizer
    
    if _optimizer is None:
        _optimizer = QueryOptimizer()
    
    return _optimizer
