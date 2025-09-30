#!/usr/bin/env python3
"""
Performance Optimizer Service - Spirit Tours
Sistema de optimización de rendimiento y caching inteligente
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Optional, Any, Union, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import uuid
import redis.asyncio as redis
import hashlib
import pickle
from contextlib import asynccontextmanager
from functools import wraps

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CacheType(Enum):
    """Tipos de cache"""
    MEMORY = "memory"           # Cache en memoria
    REDIS = "redis"            # Cache en Redis
    DATABASE = "database"      # Cache en base de datos
    HYBRID = "hybrid"          # Cache híbrido

class CachePriority(Enum):
    """Prioridades de cache"""
    CRITICAL = "critical"      # Datos críticos
    HIGH = "high"             # Alta prioridad
    MEDIUM = "medium"         # Prioridad media
    LOW = "low"               # Baja prioridad

@dataclass
class CacheEntry:
    """Entrada de cache"""
    key: str
    value: Any
    created_at: datetime
    expires_at: Optional[datetime] = None
    access_count: int = 0
    last_accessed: datetime = field(default_factory=datetime.utcnow)
    priority: CachePriority = CachePriority.MEDIUM
    tags: List[str] = field(default_factory=list)

@dataclass
class PerformanceMetric:
    """Métrica de rendimiento"""
    endpoint: str
    method: str
    response_time: float
    timestamp: datetime
    status_code: int
    cache_hit: bool = False
    user_id: Optional[str] = None

@dataclass
class CacheStats:
    """Estadísticas de cache"""
    total_requests: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    hit_rate: float = 0.0
    avg_response_time_cached: float = 0.0
    avg_response_time_uncached: float = 0.0
    total_size_mb: float = 0.0
    entries_count: int = 0

class PerformanceOptimizer:
    """
    Servicio de optimización de rendimiento
    
    Características:
    - Cache inteligente multi-nivel
    - Optimización automática de consultas
    - Monitoreo de rendimiento en tiempo real
    - Pre-cargado predictivo de datos
    - Compresión y serialización eficiente
    - Invalidación de cache automática
    - Analytics de performance
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        
        # Cache layers
        self.memory_cache: Dict[str, CacheEntry] = {}
        self.redis_client: Optional[redis.Redis] = None
        
        # Performance tracking
        self.performance_metrics: List[PerformanceMetric] = []
        self.cache_stats = CacheStats()
        
        # Configuration
        self.cache_config = {
            "memory_max_size_mb": self.config.get("memory_cache_size", 100),
            "redis_url": self.config.get("redis_url", "redis://localhost:6379"),
            "default_ttl_seconds": self.config.get("default_ttl", 3600),
            "compression_threshold": 1024,  # bytes
            "max_key_length": 250,
            "enable_statistics": True
        }
        
        # Cache invalidation patterns
        self.invalidation_patterns = {
            "booking_created": ["bookings:*", "availability:*", "revenue:*"],
            "price_updated": ["prices:*", "offers:*", "search:*"],
            "user_updated": ["user:*", "profile:*", "preferences:*"],
            "agent_response": [],  # No invalidation needed
            "analytics_data": ["analytics:*", "reports:*"]
        }
        
        # Preload patterns
        self.preload_patterns = {
            "popular_destinations": {
                "pattern": "destinations:popular",
                "refresh_hours": 6,
                "priority": CachePriority.HIGH
            },
            "user_preferences": {
                "pattern": "user:{user_id}:preferences",
                "refresh_hours": 24,
                "priority": CachePriority.MEDIUM
            },
            "booking_availability": {
                "pattern": "availability:{destination}:{date}",
                "refresh_hours": 1,
                "priority": CachePriority.CRITICAL
            }
        }

    async def initialize(self):
        """Inicializar optimizador de rendimiento"""
        try:
            logger.info("⚡ Initializing Performance Optimizer...")
            
            # Conectar a Redis
            self.redis_client = redis.from_url(
                self.cache_config["redis_url"],
                decode_responses=False  # Para mantener datos binarios
            )
            
            # Verificar conexión Redis
            await self.redis_client.ping()
            
            # Inicializar estadísticas
            await self._initialize_cache_stats()
            
            # Configurar tareas de limpieza automática
            asyncio.create_task(self._cleanup_expired_cache())
            asyncio.create_task(self._performance_monitoring_loop())
            asyncio.create_task(self._predictive_preload_loop())
            
            logger.info("✅ Performance Optimizer initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize Performance Optimizer: {e}")
            raise

    async def cache_get(self, key: str, cache_type: CacheType = CacheType.HYBRID) -> Optional[Any]:
        """Obtener valor del cache"""
        try:
            start_time = time.time()
            normalized_key = self._normalize_key(key)
            
            # Intentar memory cache primero
            if cache_type in [CacheType.MEMORY, CacheType.HYBRID]:
                if normalized_key in self.memory_cache:
                    entry = self.memory_cache[normalized_key]
                    
                    # Verificar expiración
                    if entry.expires_at and datetime.utcnow() > entry.expires_at:
                        await self.cache_delete(key, CacheType.MEMORY)
                    else:
                        entry.access_count += 1
                        entry.last_accessed = datetime.utcnow()
                        
                        self._update_cache_stats(hit=True, response_time=time.time() - start_time)
                        return entry.value
            
            # Intentar Redis cache
            if cache_type in [CacheType.REDIS, CacheType.HYBRID] and self.redis_client:
                redis_value = await self.redis_client.get(normalized_key)
                if redis_value:
                    try:
                        # Deserializar
                        value = pickle.loads(redis_value)
                        
                        # Añadir a memory cache si es híbrido
                        if cache_type == CacheType.HYBRID:
                            await self.cache_set(
                                key, value, 
                                ttl_seconds=self.cache_config["default_ttl_seconds"],
                                cache_type=CacheType.MEMORY
                            )
                        
                        self._update_cache_stats(hit=True, response_time=time.time() - start_time)
                        return value
                        
                    except Exception as e:
                        logger.warning(f"Failed to deserialize cached value for {key}: {e}")
            
            # Cache miss
            self._update_cache_stats(hit=False, response_time=time.time() - start_time)
            return None
            
        except Exception as e:
            logger.error(f"❌ Error getting cache for {key}: {e}")
            return None

    async def cache_set(self, key: str, value: Any, 
                       ttl_seconds: Optional[int] = None,
                       cache_type: CacheType = CacheType.HYBRID,
                       priority: CachePriority = CachePriority.MEDIUM,
                       tags: List[str] = None) -> bool:
        """Establecer valor en cache"""
        try:
            normalized_key = self._normalize_key(key)
            ttl_seconds = ttl_seconds or self.cache_config["default_ttl_seconds"]
            expires_at = datetime.utcnow() + timedelta(seconds=ttl_seconds)
            tags = tags or []
            
            # Memory cache
            if cache_type in [CacheType.MEMORY, CacheType.HYBRID]:
                # Verificar límite de memoria
                await self._enforce_memory_limits()
                
                entry = CacheEntry(
                    key=normalized_key,
                    value=value,
                    created_at=datetime.utcnow(),
                    expires_at=expires_at,
                    priority=priority,
                    tags=tags
                )
                
                self.memory_cache[normalized_key] = entry
            
            # Redis cache
            if cache_type in [CacheType.REDIS, CacheType.HYBRID] and self.redis_client:
                try:
                    # Serializar y comprimir si es necesario
                    serialized_value = pickle.dumps(value)
                    
                    if len(serialized_value) > self.cache_config["compression_threshold"]:
                        import zlib
                        serialized_value = zlib.compress(serialized_value)
                    
                    await self.redis_client.setex(
                        normalized_key, 
                        ttl_seconds, 
                        serialized_value
                    )
                    
                    # Guardar metadatos si hay tags
                    if tags:
                        await self._set_cache_tags(normalized_key, tags)
                        
                except Exception as e:
                    logger.warning(f"Failed to set Redis cache for {key}: {e}")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error setting cache for {key}: {e}")
            return False

    async def cache_delete(self, key: str, cache_type: CacheType = CacheType.HYBRID) -> bool:
        """Eliminar valor del cache"""
        try:
            normalized_key = self._normalize_key(key)
            
            # Memory cache
            if cache_type in [CacheType.MEMORY, CacheType.HYBRID]:
                if normalized_key in self.memory_cache:
                    del self.memory_cache[normalized_key]
            
            # Redis cache
            if cache_type in [CacheType.REDIS, CacheType.HYBRID] and self.redis_client:
                await self.redis_client.delete(normalized_key)
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error deleting cache for {key}: {e}")
            return False

    async def invalidate_by_pattern(self, pattern: str) -> int:
        """Invalidar cache por patrón"""
        try:
            invalidated = 0
            
            # Memory cache
            keys_to_delete = [
                key for key in self.memory_cache.keys() 
                if self._match_pattern(key, pattern)
            ]
            
            for key in keys_to_delete:
                del self.memory_cache[key]
                invalidated += 1
            
            # Redis cache
            if self.redis_client:
                redis_keys = await self.redis_client.keys(pattern)
                if redis_keys:
                    await self.redis_client.delete(*redis_keys)
                    invalidated += len(redis_keys)
            
            logger.info(f"🗑️ Invalidated {invalidated} cache entries matching pattern: {pattern}")
            return invalidated
            
        except Exception as e:
            logger.error(f"❌ Error invalidating cache pattern {pattern}: {e}")
            return 0

    async def invalidate_by_tags(self, tags: List[str]) -> int:
        """Invalidar cache por tags"""
        try:
            invalidated = 0
            
            # Memory cache
            keys_to_delete = []
            for key, entry in self.memory_cache.items():
                if any(tag in entry.tags for tag in tags):
                    keys_to_delete.append(key)
            
            for key in keys_to_delete:
                del self.memory_cache[key]
                invalidated += len(keys_to_delete)
            
            # Redis cache - requiere implementación de tags
            if self.redis_client:
                for tag in tags:
                    tag_keys = await self.redis_client.smembers(f"tag:{tag}")
                    if tag_keys:
                        await self.redis_client.delete(*tag_keys)
                        invalidated += len(tag_keys)
            
            logger.info(f"🏷️ Invalidated {invalidated} cache entries with tags: {tags}")
            return invalidated
            
        except Exception as e:
            logger.error(f"❌ Error invalidating cache by tags {tags}: {e}")
            return 0

    def cache_decorator(self, 
                       ttl_seconds: int = None,
                       cache_type: CacheType = CacheType.HYBRID,
                       key_pattern: str = None,
                       tags: List[str] = None):
        """Decorador para cache automático"""
        def decorator(func: Callable):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Generar clave de cache
                if key_pattern:
                    cache_key = key_pattern.format(*args, **kwargs)
                else:
                    cache_key = f"{func.__module__}.{func.__name__}:{hash(str(args) + str(kwargs))}"
                
                # Intentar obtener del cache
                cached_result = await self.cache_get(cache_key, cache_type)
                if cached_result is not None:
                    return cached_result
                
                # Ejecutar función
                start_time = time.time()
                result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                # Guardar en cache
                await self.cache_set(
                    cache_key, 
                    result, 
                    ttl_seconds=ttl_seconds,
                    cache_type=cache_type,
                    tags=tags or []
                )
                
                # Log performance
                logger.debug(f"💾 Cached result for {func.__name__} (execution: {execution_time:.3f}s)")
                
                return result
            
            return wrapper
        return decorator

    async def performance_monitor(self, endpoint: str, method: str = "GET"):
        """Context manager para monitoreo de rendimiento"""
        @asynccontextmanager
        async def monitor():
            start_time = time.time()
            try:
                yield
                # Success
                response_time = time.time() - start_time
                await self._record_performance_metric(
                    endpoint, method, response_time, 200
                )
            except Exception as e:
                # Error
                response_time = time.time() - start_time
                await self._record_performance_metric(
                    endpoint, method, response_time, 500
                )
                raise
        
        return monitor()

    async def preload_data(self, patterns: List[str]) -> Dict[str, Any]:
        """Pre-cargar datos por patrones"""
        try:
            preload_results = {}
            
            for pattern_name in patterns:
                if pattern_name in self.preload_patterns:
                    pattern_config = self.preload_patterns[pattern_name]
                    
                    # Verificar si necesita refresh
                    if await self._needs_refresh(pattern_config):
                        data = await self._load_pattern_data(pattern_name, pattern_config)
                        if data:
                            preload_results[pattern_name] = data
                            logger.info(f"📊 Preloaded data for pattern: {pattern_name}")
            
            return preload_results
            
        except Exception as e:
            logger.error(f"❌ Error preloading data: {e}")
            return {}

    async def get_performance_stats(self) -> Dict[str, Any]:
        """Obtener estadísticas de rendimiento"""
        try:
            # Calcular estadísticas de cache
            await self._calculate_cache_stats()
            
            # Estadísticas de endpoints
            endpoint_stats = {}
            for metric in self.performance_metrics[-1000:]:  # Últimas 1000 métricas
                if metric.endpoint not in endpoint_stats:
                    endpoint_stats[metric.endpoint] = {
                        "total_requests": 0,
                        "avg_response_time": 0.0,
                        "success_rate": 0.0,
                        "cache_hit_rate": 0.0
                    }
                
                stats = endpoint_stats[metric.endpoint]
                stats["total_requests"] += 1
                
                # Calcular promedios
                current_avg = stats["avg_response_time"]
                stats["avg_response_time"] = (
                    (current_avg * (stats["total_requests"] - 1) + metric.response_time) / 
                    stats["total_requests"]
                )
            
            return {
                "cache_stats": {
                    "hit_rate": self.cache_stats.hit_rate,
                    "total_requests": self.cache_stats.total_requests,
                    "cache_hits": self.cache_stats.cache_hits,
                    "cache_misses": self.cache_stats.cache_misses,
                    "memory_usage_mb": self.cache_stats.total_size_mb,
                    "entries_count": self.cache_stats.entries_count
                },
                "endpoint_stats": endpoint_stats,
                "memory_cache_size": len(self.memory_cache),
                "last_cleanup": getattr(self, 'last_cleanup', 'Never'),
                "optimization_suggestions": await self._get_optimization_suggestions()
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting performance stats: {e}")
            return {}

    async def _initialize_cache_stats(self):
        """Inicializar estadísticas de cache"""
        self.cache_stats = CacheStats()

    async def _cleanup_expired_cache(self):
        """Tarea de limpieza de cache expirado"""
        while True:
            try:
                await asyncio.sleep(300)  # Cada 5 minutos
                
                now = datetime.utcnow()
                expired_keys = []
                
                for key, entry in self.memory_cache.items():
                    if entry.expires_at and now > entry.expires_at:
                        expired_keys.append(key)
                
                for key in expired_keys:
                    del self.memory_cache[key]
                
                if expired_keys:
                    logger.info(f"🧹 Cleaned up {len(expired_keys)} expired cache entries")
                
                self.last_cleanup = datetime.utcnow().isoformat()
                
            except Exception as e:
                logger.error(f"❌ Error in cache cleanup: {e}")

    async def _performance_monitoring_loop(self):
        """Loop de monitoreo de rendimiento"""
        while True:
            try:
                await asyncio.sleep(60)  # Cada minuto
                
                # Limpiar métricas antiguas (mantener solo últimas 24 horas)
                cutoff_time = datetime.utcnow() - timedelta(hours=24)
                self.performance_metrics = [
                    metric for metric in self.performance_metrics
                    if metric.timestamp > cutoff_time
                ]
                
            except Exception as e:
                logger.error(f"❌ Error in performance monitoring: {e}")

    async def _predictive_preload_loop(self):
        """Loop de pre-carga predictiva"""
        while True:
            try:
                await asyncio.sleep(1800)  # Cada 30 minutos
                
                # Pre-cargar datos populares
                popular_patterns = ["popular_destinations", "booking_availability"]
                await self.preload_data(popular_patterns)
                
            except Exception as e:
                logger.error(f"❌ Error in predictive preload: {e}")

    def _normalize_key(self, key: str) -> str:
        """Normalizar clave de cache"""
        # Truncar si es muy larga
        if len(key) > self.cache_config["max_key_length"]:
            key = key[:self.cache_config["max_key_length"]] + hashlib.md5(key.encode()).hexdigest()[:8]
        
        return key

    async def cleanup(self):
        """Limpiar recursos del optimizador"""
        try:
            logger.info("🧹 Cleaning up Performance Optimizer...")
            
            # Cerrar conexión Redis
            if self.redis_client:
                await self.redis_client.close()
            
            # Limpiar caches en memoria
            self.memory_cache.clear()
            self.performance_metrics.clear()
            
            logger.info("✅ Performance Optimizer cleanup completed")
            
        except Exception as e:
            logger.error(f"❌ Performance Optimizer cleanup error: {e}")

# Factory function
async def create_performance_optimizer(config: Dict[str, Any]) -> PerformanceOptimizer:
    """Factory function para crear optimizador de rendimiento"""
    optimizer = PerformanceOptimizer(config)
    await optimizer.initialize()
    return optimizer

# Ejemplo de uso
if __name__ == "__main__":
    async def main():
        config = {
            "redis_url": "redis://localhost:6379",
            "memory_cache_size": 50,  # 50MB
            "default_ttl": 1800  # 30 minutos
        }
        
        try:
            optimizer = await create_performance_optimizer(config)
            
            # Test caching
            await optimizer.cache_set("test_key", {"data": "test_value"}, ttl_seconds=300)
            cached_value = await optimizer.cache_get("test_key")
            print(f"✅ Cached value: {cached_value}")
            
            # Test stats
            stats = await optimizer.get_performance_stats()
            print(f"✅ Performance stats: {stats['cache_stats']['hit_rate']:.2f}% hit rate")
            
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            if 'optimizer' in locals():
                await optimizer.cleanup()
    
    asyncio.run(main())