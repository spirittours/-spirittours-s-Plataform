"""
Database Connection Pool Management.

This module provides database connection pooling functionality to optimize
database connections and improve performance.

Features:
- Connection pool management with size limits
- Connection lifecycle tracking
- Health checks for connections
- Pool statistics and monitoring
- Automatic connection cleanup
- Connection timeout handling

Author: GenSpark AI Developer
Phase: 7 - Performance Optimization
"""

import asyncio
import time
from dataclasses import dataclass
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import asyncpg
from contextlib import asynccontextmanager

from utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class ConnectionConfig:
    """Database connection configuration."""
    host: str
    port: int
    database: str
    user: str
    password: str
    min_size: int = 10
    max_size: int = 50
    max_queries: int = 50000
    max_inactive_connection_lifetime: float = 300.0  # 5 minutes
    timeout: float = 30.0
    command_timeout: float = 60.0
    ssl: Optional[str] = None


@dataclass
class ConnectionStats:
    """Connection pool statistics."""
    total_connections: int
    active_connections: int
    idle_connections: int
    total_queries_executed: int
    avg_query_time_ms: float
    max_query_time_ms: float
    connection_errors: int
    pool_hits: int
    pool_misses: int
    created_at: datetime
    uptime_seconds: float


class ConnectionPool:
    """
    Database connection pool manager.
    
    This class manages a pool of database connections for optimal performance
    and resource utilization.
    """
    
    def __init__(self, config: ConnectionConfig):
        """
        Initialize connection pool.
        
        Args:
            config: Connection pool configuration
        """
        self.config = config
        self.pool: Optional[asyncpg.Pool] = None
        self._stats = {
            'total_queries': 0,
            'total_query_time_ms': 0.0,
            'max_query_time_ms': 0.0,
            'connection_errors': 0,
            'pool_hits': 0,
            'pool_misses': 0,
        }
        self._created_at = datetime.now()
        self._connection_times: List[float] = []
        logger.info("Connection pool initialized with config", extra={
            'min_size': config.min_size,
            'max_size': config.max_size
        })
    
    async def initialize(self) -> None:
        """Initialize the connection pool."""
        try:
            self.pool = await asyncpg.create_pool(
                host=self.config.host,
                port=self.config.port,
                database=self.config.database,
                user=self.config.user,
                password=self.config.password,
                min_size=self.config.min_size,
                max_size=self.config.max_size,
                max_queries=self.config.max_queries,
                max_inactive_connection_lifetime=self.config.max_inactive_connection_lifetime,
                timeout=self.config.timeout,
                command_timeout=self.config.command_timeout,
                ssl=self.config.ssl
            )
            logger.info("Connection pool created successfully")
        except Exception as e:
            self._stats['connection_errors'] += 1
            logger.error(f"Failed to create connection pool: {e}")
            raise
    
    async def close(self) -> None:
        """Close the connection pool."""
        if self.pool:
            await self.pool.close()
            logger.info("Connection pool closed")
    
    @asynccontextmanager
    async def acquire(self):
        """
        Acquire a connection from the pool.
        
        Yields:
            Database connection
            
        Example:
            async with pool.acquire() as conn:
                result = await conn.fetch('SELECT * FROM users')
        """
        if not self.pool:
            await self.initialize()
        
        start_time = time.time()
        connection = None
        
        try:
            connection = await self.pool.acquire()
            acquire_time_ms = (time.time() - start_time) * 1000
            self._connection_times.append(acquire_time_ms)
            
            if len(self._connection_times) > 1000:
                self._connection_times = self._connection_times[-1000:]
            
            self._stats['pool_hits'] += 1
            
            yield connection
            
        except asyncio.TimeoutError:
            self._stats['pool_misses'] += 1
            self._stats['connection_errors'] += 1
            logger.error("Connection acquisition timeout")
            raise
        except Exception as e:
            self._stats['connection_errors'] += 1
            logger.error(f"Error acquiring connection: {e}")
            raise
        finally:
            if connection:
                try:
                    await self.pool.release(connection)
                except Exception as e:
                    logger.error(f"Error releasing connection: {e}")
    
    async def execute_query(self, query: str, *args, timeout: Optional[float] = None) -> Any:
        """
        Execute a query using a pooled connection.
        
        Args:
            query: SQL query to execute
            *args: Query parameters
            timeout: Query timeout in seconds
            
        Returns:
            Query result
        """
        start_time = time.time()
        
        async with self.acquire() as conn:
            try:
                result = await conn.fetch(query, *args, timeout=timeout or self.config.command_timeout)
                
                query_time_ms = (time.time() - start_time) * 1000
                self._stats['total_queries'] += 1
                self._stats['total_query_time_ms'] += query_time_ms
                self._stats['max_query_time_ms'] = max(
                    self._stats['max_query_time_ms'],
                    query_time_ms
                )
                
                if query_time_ms > 1000:  # Log slow queries
                    logger.warning(f"Slow query detected: {query_time_ms:.2f}ms", extra={
                        'query': query[:100],
                        'time_ms': query_time_ms
                    })
                
                return result
                
            except Exception as e:
                logger.error(f"Query execution error: {e}", extra={'query': query[:100]})
                raise
    
    async def execute_many(self, query: str, args_list: List[tuple], timeout: Optional[float] = None) -> None:
        """
        Execute a query multiple times with different parameters.
        
        Args:
            query: SQL query to execute
            args_list: List of parameter tuples
            timeout: Query timeout in seconds
        """
        async with self.acquire() as conn:
            try:
                await conn.executemany(query, args_list, timeout=timeout or self.config.command_timeout)
                self._stats['total_queries'] += len(args_list)
                logger.info(f"Executed batch query with {len(args_list)} parameter sets")
            except Exception as e:
                logger.error(f"Batch query execution error: {e}")
                raise
    
    async def check_connection_health(self) -> bool:
        """
        Check if the connection pool is healthy.
        
        Returns:
            True if pool is healthy, False otherwise
        """
        try:
            async with self.acquire() as conn:
                result = await conn.fetchval('SELECT 1')
                return result == 1
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    def get_statistics(self) -> ConnectionStats:
        """
        Get current connection pool statistics.
        
        Returns:
            ConnectionStats object with current statistics
        """
        uptime = (datetime.now() - self._created_at).total_seconds()
        
        avg_query_time = 0.0
        if self._stats['total_queries'] > 0:
            avg_query_time = self._stats['total_query_time_ms'] / self._stats['total_queries']
        
        # Get pool size info
        pool_size = self.pool.get_size() if self.pool else 0
        pool_free = self.pool.get_idle_size() if self.pool else 0
        
        return ConnectionStats(
            total_connections=pool_size,
            active_connections=pool_size - pool_free,
            idle_connections=pool_free,
            total_queries_executed=self._stats['total_queries'],
            avg_query_time_ms=avg_query_time,
            max_query_time_ms=self._stats['max_query_time_ms'],
            connection_errors=self._stats['connection_errors'],
            pool_hits=self._stats['pool_hits'],
            pool_misses=self._stats['pool_misses'],
            created_at=self._created_at,
            uptime_seconds=uptime
        )
    
    def get_statistics_dict(self) -> Dict[str, Any]:
        """
        Get connection pool statistics as a dictionary.
        
        Returns:
            Dictionary with statistics
        """
        stats = self.get_statistics()
        return {
            'total_connections': stats.total_connections,
            'active_connections': stats.active_connections,
            'idle_connections': stats.idle_connections,
            'total_queries_executed': stats.total_queries_executed,
            'avg_query_time_ms': round(stats.avg_query_time_ms, 2),
            'max_query_time_ms': round(stats.max_query_time_ms, 2),
            'connection_errors': stats.connection_errors,
            'pool_hits': stats.pool_hits,
            'pool_misses': stats.pool_misses,
            'hit_rate': round(
                (stats.pool_hits / (stats.pool_hits + stats.pool_misses) * 100)
                if (stats.pool_hits + stats.pool_misses) > 0 else 0,
                2
            ),
            'uptime_seconds': round(stats.uptime_seconds, 2),
            'queries_per_second': round(
                stats.total_queries_executed / stats.uptime_seconds
                if stats.uptime_seconds > 0 else 0,
                2
            )
        }
    
    async def get_pool_status(self) -> Dict[str, Any]:
        """
        Get detailed pool status information.
        
        Returns:
            Dictionary with pool status
        """
        stats = self.get_statistics_dict()
        
        # Add configuration info
        stats.update({
            'config': {
                'min_size': self.config.min_size,
                'max_size': self.config.max_size,
                'max_queries': self.config.max_queries,
                'timeout': self.config.timeout,
                'command_timeout': self.config.command_timeout,
            },
            'health': 'healthy' if await self.check_connection_health() else 'unhealthy'
        })
        
        return stats
    
    async def warm_pool(self) -> None:
        """Warm up the connection pool by creating minimum connections."""
        if not self.pool:
            await self.initialize()
        
        logger.info(f"Warming up connection pool to {self.config.min_size} connections")
        
        # Acquire and release connections to warm up the pool
        connections = []
        try:
            for _ in range(self.config.min_size):
                conn = await self.pool.acquire()
                connections.append(conn)
            
            logger.info(f"Pool warmed up with {len(connections)} connections")
        finally:
            for conn in connections:
                await self.pool.release(conn)


# Singleton instance
_connection_pool: Optional[ConnectionPool] = None


def init_connection_pool(config: ConnectionConfig) -> ConnectionPool:
    """
    Initialize the global connection pool.
    
    Args:
        config: Connection pool configuration
        
    Returns:
        ConnectionPool instance
    """
    global _connection_pool
    _connection_pool = ConnectionPool(config)
    logger.info("Global connection pool initialized")
    return _connection_pool


def get_connection_pool() -> ConnectionPool:
    """
    Get the global connection pool instance.
    
    Returns:
        ConnectionPool instance
        
    Raises:
        RuntimeError: If pool not initialized
    """
    if _connection_pool is None:
        raise RuntimeError("Connection pool not initialized. Call init_connection_pool first.")
    return _connection_pool


async def get_pool_statistics() -> Dict[str, Any]:
    """
    Get statistics from the global connection pool.
    
    Returns:
        Dictionary with pool statistics
    """
    pool = get_connection_pool()
    return pool.get_statistics_dict()
