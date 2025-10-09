"""
Database Sharding Configuration
Spirit Tours Platform - Horizontal Scaling
"""

import hashlib
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from contextlib import contextmanager
import json

logger = logging.getLogger(__name__)


class ShardingStrategy(Enum):
    """Sharding strategies"""
    HASH_BASED = "hash_based"
    RANGE_BASED = "range_based"
    GEO_BASED = "geo_based"
    CUSTOM = "custom"


class DataCategory(Enum):
    """Data categories for sharding"""
    USER_DATA = "user_data"
    BOOKING_DATA = "booking_data"
    TOUR_DATA = "tour_data"
    ANALYTICS_DATA = "analytics_data"
    TRANSACTIONAL = "transactional"


@dataclass
class ShardConfig:
    """Configuration for a database shard"""
    shard_id: int
    host: str
    port: int
    database: str
    username: str
    password: str
    min_connections: int = 5
    max_connections: int = 20
    region: Optional[str] = None
    weight: int = 1
    read_only: bool = False
    data_categories: List[DataCategory] = None


class ShardManager:
    """Manages database sharding operations"""
    
    def __init__(self):
        self.shards: Dict[int, ShardConfig] = {}
        self.shard_pools: Dict[int, ThreadedConnectionPool] = {}
        self.routing_table: Dict[str, int] = {}
        self.replication_lag: Dict[int, float] = {}
        
    def add_shard(self, config: ShardConfig):
        """Add a new shard to the cluster"""
        self.shards[config.shard_id] = config
        
        # Create connection pool for shard
        pool = ThreadedConnectionPool(
            config.min_connections,
            config.max_connections,
            host=config.host,
            port=config.port,
            database=config.database,
            user=config.username,
            password=config.password
        )
        self.shard_pools[config.shard_id] = pool
        
        logger.info(f"Added shard {config.shard_id} at {config.host}:{config.port}")
    
    def get_shard_for_key(self, key: str, strategy: ShardingStrategy = ShardingStrategy.HASH_BASED) -> int:
        """Determine which shard should handle a given key"""
        
        if strategy == ShardingStrategy.HASH_BASED:
            return self._hash_based_shard(key)
        elif strategy == ShardingStrategy.RANGE_BASED:
            return self._range_based_shard(key)
        elif strategy == ShardingStrategy.GEO_BASED:
            return self._geo_based_shard(key)
        else:
            return self._custom_shard(key)
    
    def _hash_based_shard(self, key: str) -> int:
        """Hash-based sharding using consistent hashing"""
        hash_value = int(hashlib.md5(key.encode()).hexdigest(), 16)
        shard_count = len(self.shards)
        
        if shard_count == 0:
            raise ValueError("No shards configured")
        
        # Use weighted distribution if weights are set
        weighted_shards = []
        for shard_id, config in self.shards.items():
            weighted_shards.extend([shard_id] * config.weight)
        
        if weighted_shards:
            return weighted_shards[hash_value % len(weighted_shards)]
        else:
            return hash_value % shard_count
    
    def _range_based_shard(self, key: str) -> int:
        """Range-based sharding"""
        # Example: Shard by user ID ranges
        try:
            numeric_key = int(key.split('-')[-1]) if '-' in key else int(key)
            
            # Define ranges
            ranges = {
                0: (0, 1000000),      # Shard 0: 0-1M
                1: (1000001, 2000000), # Shard 1: 1M-2M
                2: (2000001, 3000000), # Shard 2: 2M-3M
                3: (3000001, float('inf')) # Shard 3: 3M+
            }
            
            for shard_id, (min_val, max_val) in ranges.items():
                if min_val <= numeric_key <= max_val:
                    return shard_id
            
            return 0  # Default shard
            
        except (ValueError, IndexError):
            # Fallback to hash-based for non-numeric keys
            return self._hash_based_shard(key)
    
    def _geo_based_shard(self, key: str, user_region: str = None) -> int:
        """Geo-based sharding based on user location"""
        region_to_shard = {
            'us-east': 0,
            'us-west': 1,
            'eu-west': 2,
            'eu-central': 3,
            'asia-pacific': 4,
            'south-america': 5
        }
        
        if user_region and user_region in region_to_shard:
            return region_to_shard[user_region]
        
        # Fallback to hash-based
        return self._hash_based_shard(key)
    
    def _custom_shard(self, key: str) -> int:
        """Custom sharding logic"""
        # Check routing table first
        if key in self.routing_table:
            return self.routing_table[key]
        
        # Custom logic based on key patterns
        if key.startswith("premium_"):
            return 0  # Premium users on dedicated shard
        elif key.startswith("bulk_"):
            return len(self.shards) - 1  # Bulk operations on last shard
        else:
            return self._hash_based_shard(key)
    
    @contextmanager
    def get_connection(self, shard_id: int):
        """Get a database connection from shard pool"""
        pool = self.shard_pools.get(shard_id)
        if not pool:
            raise ValueError(f"Shard {shard_id} not found")
        
        conn = pool.getconn()
        try:
            yield conn
        finally:
            pool.putconn(conn)
    
    def execute_on_shard(self, shard_id: int, query: str, params: Tuple = None) -> Any:
        """Execute a query on a specific shard"""
        with self.get_connection(shard_id) as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                
                if cursor.description:
                    return cursor.fetchall()
                else:
                    conn.commit()
                    return cursor.rowcount
    
    def execute_on_all_shards(self, query: str, params: Tuple = None) -> Dict[int, Any]:
        """Execute a query on all shards (for aggregations)"""
        results = {}
        
        for shard_id in self.shards.keys():
            try:
                results[shard_id] = self.execute_on_shard(shard_id, query, params)
            except Exception as e:
                logger.error(f"Error executing on shard {shard_id}: {e}")
                results[shard_id] = None
        
        return results
    
    def rebalance_shards(self):
        """Rebalance data across shards"""
        logger.info("Starting shard rebalancing...")
        
        # Get current data distribution
        distribution = self._get_data_distribution()
        
        # Calculate target distribution
        total_rows = sum(distribution.values())
        target_per_shard = total_rows // len(self.shards)
        
        # Identify over/under loaded shards
        overloaded = {k: v for k, v in distribution.items() if v > target_per_shard * 1.2}
        underloaded = {k: v for k, v in distribution.items() if v < target_per_shard * 0.8}
        
        # Move data from overloaded to underloaded shards
        for source_shard, source_count in overloaded.items():
            for target_shard, target_count in underloaded.items():
                rows_to_move = min(
                    source_count - target_per_shard,
                    target_per_shard - target_count
                )
                
                if rows_to_move > 0:
                    self._migrate_data(source_shard, target_shard, rows_to_move)
        
        logger.info("Shard rebalancing completed")
    
    def _get_data_distribution(self) -> Dict[int, int]:
        """Get current data distribution across shards"""
        distribution = {}
        
        for shard_id in self.shards.keys():
            count_query = "SELECT COUNT(*) FROM users"  # Example table
            result = self.execute_on_shard(shard_id, count_query)
            distribution[shard_id] = result[0][0] if result else 0
        
        return distribution
    
    def _migrate_data(self, source_shard: int, target_shard: int, row_count: int):
        """Migrate data between shards"""
        logger.info(f"Migrating {row_count} rows from shard {source_shard} to {target_shard}")
        
        # This is a simplified example - in production, use proper ETL process
        # with transaction support and data validation
        
        # Select data to migrate
        select_query = f"""
            SELECT * FROM users 
            WHERE MOD(CAST(SUBSTRING(id FROM '\d+') AS INTEGER), %s) = %s
            LIMIT %s
        """
        
        with self.get_connection(source_shard) as source_conn:
            with source_conn.cursor() as cursor:
                cursor.execute(select_query, (len(self.shards), target_shard, row_count))
                rows = cursor.fetchall()
        
        # Insert into target shard
        if rows:
            with self.get_connection(target_shard) as target_conn:
                with target_conn.cursor() as cursor:
                    # Build insert query
                    insert_query = "INSERT INTO users VALUES (%s)" % ','.join(['%s'] * len(rows[0]))
                    cursor.executemany(insert_query, rows)
                    target_conn.commit()
            
            # Delete from source shard
            with self.get_connection(source_shard) as source_conn:
                with source_conn.cursor() as cursor:
                    # Delete migrated rows
                    delete_query = f"""
                        DELETE FROM users 
                        WHERE id IN ({','.join(['%s'] * len(rows))})
                    """
                    cursor.execute(delete_query, [row[0] for row in rows])
                    source_conn.commit()
    
    def add_routing_rule(self, key_pattern: str, shard_id: int):
        """Add custom routing rule"""
        self.routing_table[key_pattern] = shard_id
        logger.info(f"Added routing rule: {key_pattern} -> shard {shard_id}")
    
    def monitor_shard_health(self) -> Dict[int, Dict]:
        """Monitor health of all shards"""
        health_status = {}
        
        for shard_id, config in self.shards.items():
            try:
                with self.get_connection(shard_id) as conn:
                    with conn.cursor() as cursor:
                        # Check connection
                        cursor.execute("SELECT 1")
                        
                        # Check replication lag if applicable
                        if not config.read_only:
                            cursor.execute("""
                                SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp()))
                                AS replication_lag
                            """)
                            lag = cursor.fetchone()
                            self.replication_lag[shard_id] = lag[0] if lag and lag[0] else 0
                        
                        # Get shard statistics
                        cursor.execute("""
                            SELECT 
                                pg_database_size(current_database()) as size,
                                numbackends as connections,
                                xact_commit + xact_rollback as transactions
                            FROM pg_stat_database
                            WHERE datname = current_database()
                        """)
                        stats = cursor.fetchone()
                        
                        health_status[shard_id] = {
                            'status': 'healthy',
                            'size_bytes': stats[0] if stats else 0,
                            'connections': stats[1] if stats else 0,
                            'transactions': stats[2] if stats else 0,
                            'replication_lag': self.replication_lag.get(shard_id, 0),
                            'region': config.region,
                            'read_only': config.read_only
                        }
                        
            except Exception as e:
                health_status[shard_id] = {
                    'status': 'unhealthy',
                    'error': str(e)
                }
                logger.error(f"Shard {shard_id} health check failed: {e}")
        
        return health_status


class ShardRouter:
    """Routes database queries to appropriate shards"""
    
    def __init__(self, shard_manager: ShardManager):
        self.shard_manager = shard_manager
        self.query_cache = {}
        
    def route_query(self, query: str, key: str = None, params: Tuple = None) -> Any:
        """Route query to appropriate shard(s)"""
        
        # Determine query type
        query_lower = query.lower().strip()
        
        if query_lower.startswith('select'):
            return self._route_select(query, key, params)
        elif query_lower.startswith(('insert', 'update', 'delete')):
            return self._route_write(query, key, params)
        else:
            # DDL or other operations - execute on all shards
            return self.shard_manager.execute_on_all_shards(query, params)
    
    def _route_select(self, query: str, key: str, params: Tuple) -> Any:
        """Route SELECT queries"""
        
        # Check if it's an aggregation query
        if any(keyword in query.lower() for keyword in ['count(', 'sum(', 'avg(', 'min(', 'max(']):
            # Execute on all shards and aggregate results
            results = self.shard_manager.execute_on_all_shards(query, params)
            return self._aggregate_results(results, query)
        
        # Single shard query
        if key:
            shard_id = self.shard_manager.get_shard_for_key(key)
            return self.shard_manager.execute_on_shard(shard_id, query, params)
        else:
            # No key provided - execute on all shards
            return self.shard_manager.execute_on_all_shards(query, params)
    
    def _route_write(self, query: str, key: str, params: Tuple) -> Any:
        """Route write queries to appropriate shard"""
        
        if not key:
            raise ValueError("Key required for write operations")
        
        shard_id = self.shard_manager.get_shard_for_key(key)
        
        # Check if shard is read-only
        if self.shard_manager.shards[shard_id].read_only:
            # Find writable shard
            for sid, config in self.shard_manager.shards.items():
                if not config.read_only:
                    shard_id = sid
                    break
            else:
                raise ValueError("No writable shards available")
        
        return self.shard_manager.execute_on_shard(shard_id, query, params)
    
    def _aggregate_results(self, results: Dict[int, Any], query: str) -> Any:
        """Aggregate results from multiple shards"""
        
        # Simple aggregation logic - extend as needed
        if 'count(' in query.lower():
            total = sum(r[0][0] for r in results.values() if r and r[0])
            return [(total,)]
        elif 'sum(' in query.lower():
            total = sum(r[0][0] for r in results.values() if r and r[0] and r[0][0])
            return [(total,)]
        else:
            # Combine all results
            combined = []
            for shard_results in results.values():
                if shard_results:
                    combined.extend(shard_results)
            return combined


# Initialize sharding configuration
def initialize_sharding():
    """Initialize database sharding"""
    
    manager = ShardManager()
    
    # Configure shards
    shards = [
        ShardConfig(
            shard_id=0,
            host="postgres-shard-0.spirittours.com",
            port=5432,
            database="spirittours_shard_0",
            username="postgres",
            password="secure_password",
            region="us-east",
            weight=2,  # Higher weight for primary shard
            data_categories=[DataCategory.USER_DATA, DataCategory.TRANSACTIONAL]
        ),
        ShardConfig(
            shard_id=1,
            host="postgres-shard-1.spirittours.com",
            port=5432,
            database="spirittours_shard_1",
            username="postgres",
            password="secure_password",
            region="us-west",
            data_categories=[DataCategory.BOOKING_DATA]
        ),
        ShardConfig(
            shard_id=2,
            host="postgres-shard-2.spirittours.com",
            port=5432,
            database="spirittours_shard_2",
            username="postgres",
            password="secure_password",
            region="eu-west",
            data_categories=[DataCategory.TOUR_DATA]
        ),
        ShardConfig(
            shard_id=3,
            host="postgres-shard-3.spirittours.com",
            port=5432,
            database="spirittours_shard_3",
            username="postgres",
            password="secure_password",
            region="asia-pacific",
            data_categories=[DataCategory.ANALYTICS_DATA],
            read_only=True  # Read replica for analytics
        )
    ]
    
    for shard in shards:
        manager.add_shard(shard)
    
    # Add custom routing rules
    manager.add_routing_rule("vip_*", 0)  # VIP users to primary shard
    manager.add_routing_rule("analytics_*", 3)  # Analytics to dedicated shard
    
    return manager


# Global shard manager instance
shard_manager = None


def get_shard_manager() -> ShardManager:
    """Get global shard manager instance"""
    global shard_manager
    if not shard_manager:
        shard_manager = initialize_sharding()
    return shard_manager