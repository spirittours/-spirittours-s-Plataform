"""
Sistema Avanzado de Caché con Redis
Implementa estrategias inteligentes de caché, invalidación y warming
"""

import redis
from redis import Redis
from typing import Any, Optional, List, Dict, Callable
import json
import hashlib
import logging
from datetime import datetime, timedelta
from functools import wraps
import asyncio
from enum import Enum

logger = logging.getLogger(__name__)


class CacheStrategy(Enum):
    """Estrategias de caché disponibles"""
    LRU = "lru"  # Least Recently Used
    LFU = "lfu"  # Least Frequently Used
    TTL = "ttl"  # Time To Live
    WRITE_THROUGH = "write_through"
    WRITE_BEHIND = "write_behind"
    READ_THROUGH = "read_through"


class CachePriority(Enum):
    """Prioridades de caché"""
    CRITICAL = 1  # 24 horas
    HIGH = 2      # 12 horas
    MEDIUM = 3    # 6 horas
    LOW = 4       # 1 hora
    TEMPORARY = 5 # 15 minutos


class AdvancedCacheService:
    """
    Servicio avanzado de caché con Redis
    Implementa múltiples estrategias y optimizaciones
    """
    
    def __init__(
        self,
        host: str = 'localhost',
        port: int = 6379,
        db: int = 0,
        password: Optional[str] = None,
        max_connections: int = 50
    ):
        # Conexión a Redis con pool
        self.pool = redis.ConnectionPool(
            host=host,
            port=port,
            db=db,
            password=password,
            max_connections=max_connections,
            decode_responses=True
        )
        self.redis_client: Redis = redis.Redis(connection_pool=self.pool)
        
        # Configuración de TTLs por prioridad
        self.ttl_config = {
            CachePriority.CRITICAL: 86400,      # 24 horas
            CachePriority.HIGH: 43200,          # 12 horas
            CachePriority.MEDIUM: 21600,        # 6 horas
            CachePriority.LOW: 3600,            # 1 hora
            CachePriority.TEMPORARY: 900,       # 15 minutos
        }
        
        # Métricas de caché
        self.metrics = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'deletes': 0,
            'errors': 0
        }
        
        logger.info("Advanced Cache Service initialized")
    
    def _generate_key(self, namespace: str, identifier: str) -> str:
        """Genera una clave única para el caché"""
        return f"{namespace}:{identifier}"
    
    def _generate_hash_key(self, data: Dict[str, Any]) -> str:
        """Genera un hash MD5 para datos complejos"""
        data_string = json.dumps(data, sort_keys=True)
        return hashlib.md5(data_string.encode()).hexdigest()
    
    def get(
        self,
        namespace: str,
        identifier: str,
        default: Any = None
    ) -> Optional[Any]:
        """
        Obtiene un valor del caché
        
        Args:
            namespace: Namespace del caché (ej: 'user', 'booking')
            identifier: Identificador único
            default: Valor por defecto si no existe
            
        Returns:
            Valor cacheado o default
        """
        try:
            key = self._generate_key(namespace, identifier)
            value = self.redis_client.get(key)
            
            if value is not None:
                self.metrics['hits'] += 1
                logger.debug(f"Cache HIT: {key}")
                return json.loads(value)
            else:
                self.metrics['misses'] += 1
                logger.debug(f"Cache MISS: {key}")
                return default
                
        except Exception as e:
            self.metrics['errors'] += 1
            logger.error(f"Cache GET error: {e}")
            return default
    
    def set(
        self,
        namespace: str,
        identifier: str,
        value: Any,
        priority: CachePriority = CachePriority.MEDIUM,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Guarda un valor en el caché
        
        Args:
            namespace: Namespace del caché
            identifier: Identificador único
            value: Valor a cachear
            priority: Prioridad del caché (afecta TTL)
            ttl: TTL personalizado en segundos
            
        Returns:
            True si se guardó correctamente
        """
        try:
            key = self._generate_key(namespace, identifier)
            serialized_value = json.dumps(value)
            
            # Determinar TTL
            cache_ttl = ttl if ttl is not None else self.ttl_config[priority]
            
            # Guardar con TTL
            self.redis_client.setex(key, cache_ttl, serialized_value)
            
            self.metrics['sets'] += 1
            logger.debug(f"Cache SET: {key} (TTL: {cache_ttl}s)")
            return True
            
        except Exception as e:
            self.metrics['errors'] += 1
            logger.error(f"Cache SET error: {e}")
            return False
    
    def delete(self, namespace: str, identifier: str) -> bool:
        """Elimina un valor del caché"""
        try:
            key = self._generate_key(namespace, identifier)
            result = self.redis_client.delete(key)
            
            self.metrics['deletes'] += 1
            logger.debug(f"Cache DELETE: {key}")
            return bool(result)
            
        except Exception as e:
            self.metrics['errors'] += 1
            logger.error(f"Cache DELETE error: {e}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """
        Elimina múltiples claves que coinciden con un patrón
        
        Args:
            pattern: Patrón de búsqueda (ej: 'user:*')
            
        Returns:
            Número de claves eliminadas
        """
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                count = self.redis_client.delete(*keys)
                logger.info(f"Deleted {count} keys matching pattern: {pattern}")
                return count
            return 0
            
        except Exception as e:
            logger.error(f"Cache DELETE_PATTERN error: {e}")
            return 0
    
    def exists(self, namespace: str, identifier: str) -> bool:
        """Verifica si una clave existe en el caché"""
        try:
            key = self._generate_key(namespace, identifier)
            return bool(self.redis_client.exists(key))
        except Exception as e:
            logger.error(f"Cache EXISTS error: {e}")
            return False
    
    def get_ttl(self, namespace: str, identifier: str) -> Optional[int]:
        """Obtiene el TTL restante de una clave en segundos"""
        try:
            key = self._generate_key(namespace, identifier)
            ttl = self.redis_client.ttl(key)
            return ttl if ttl > 0 else None
        except Exception as e:
            logger.error(f"Cache GET_TTL error: {e}")
            return None
    
    def extend_ttl(
        self,
        namespace: str,
        identifier: str,
        additional_seconds: int
    ) -> bool:
        """Extiende el TTL de una clave existente"""
        try:
            key = self._generate_key(namespace, identifier)
            current_ttl = self.redis_client.ttl(key)
            
            if current_ttl > 0:
                new_ttl = current_ttl + additional_seconds
                self.redis_client.expire(key, new_ttl)
                logger.debug(f"Extended TTL for {key} by {additional_seconds}s")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Cache EXTEND_TTL error: {e}")
            return False
    
    # ==================== CACHE WARMING ====================
    
    def warm_cache(
        self,
        data_loader: Callable,
        namespace: str,
        identifiers: List[str],
        priority: CachePriority = CachePriority.MEDIUM
    ) -> int:
        """
        Precarga datos en el caché (cache warming)
        
        Args:
            data_loader: Función que carga los datos
            namespace: Namespace del caché
            identifiers: Lista de identificadores a precargar
            priority: Prioridad del caché
            
        Returns:
            Número de elementos precargados
        """
        loaded_count = 0
        
        for identifier in identifiers:
            try:
                # Cargar datos
                data = data_loader(identifier)
                
                if data is not None:
                    # Cachear datos
                    if self.set(namespace, identifier, data, priority):
                        loaded_count += 1
                        
            except Exception as e:
                logger.error(f"Error warming cache for {namespace}:{identifier}: {e}")
        
        logger.info(f"Cache warming completed: {loaded_count}/{len(identifiers)} items loaded")
        return loaded_count
    
    # ==================== CACHE INVALIDATION ====================
    
    def invalidate_related(
        self,
        namespace: str,
        related_patterns: List[str]
    ) -> int:
        """
        Invalida caché de múltiples patrones relacionados
        
        Args:
            namespace: Namespace principal
            related_patterns: Lista de patrones relacionados
            
        Returns:
            Total de claves invalidadas
        """
        total_invalidated = 0
        
        for pattern in related_patterns:
            full_pattern = f"{namespace}:{pattern}"
            count = self.delete_pattern(full_pattern)
            total_invalidated += count
        
        logger.info(f"Invalidated {total_invalidated} related cache entries")
        return total_invalidated
    
    def invalidate_user_cache(self, user_id: str) -> int:
        """Invalida todo el caché relacionado con un usuario"""
        patterns = [
            f"user:{user_id}:*",
            f"bookings:user:{user_id}:*",
            f"payments:user:{user_id}:*",
            f"preferences:user:{user_id}:*",
        ]
        
        total = 0
        for pattern in patterns:
            total += self.delete_pattern(pattern)
        
        return total
    
    # ==================== CACHE STATISTICS ====================
    
    def get_metrics(self) -> Dict[str, Any]:
        """Obtiene métricas del caché"""
        total_requests = self.metrics['hits'] + self.metrics['misses']
        hit_rate = (self.metrics['hits'] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'hits': self.metrics['hits'],
            'misses': self.metrics['misses'],
            'sets': self.metrics['sets'],
            'deletes': self.metrics['deletes'],
            'errors': self.metrics['errors'],
            'total_requests': total_requests,
            'hit_rate_percentage': round(hit_rate, 2),
            'redis_info': self._get_redis_info()
        }
    
    def _get_redis_info(self) -> Dict[str, Any]:
        """Obtiene información del servidor Redis"""
        try:
            info = self.redis_client.info()
            return {
                'used_memory_human': info.get('used_memory_human'),
                'connected_clients': info.get('connected_clients'),
                'total_commands_processed': info.get('total_commands_processed'),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
            }
        except Exception as e:
            logger.error(f"Error getting Redis info: {e}")
            return {}
    
    def reset_metrics(self):
        """Resetea las métricas del caché"""
        self.metrics = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'deletes': 0,
            'errors': 0
        }
        logger.info("Cache metrics reset")
    
    # ==================== DECORADORES ====================
    
    def cached(
        self,
        namespace: str,
        priority: CachePriority = CachePriority.MEDIUM,
        key_builder: Optional[Callable] = None
    ):
        """
        Decorador para cachear resultados de funciones
        
        Uso:
            @cache_service.cached('users', CachePriority.HIGH)
            def get_user(user_id):
                return fetch_user_from_db(user_id)
        """
        def decorator(func: Callable):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Construir clave de caché
                if key_builder:
                    cache_key = key_builder(*args, **kwargs)
                else:
                    # Usar primer argumento como clave
                    cache_key = str(args[0]) if args else self._generate_hash_key(kwargs)
                
                # Intentar obtener del caché
                cached_value = self.get(namespace, cache_key)
                if cached_value is not None:
                    return cached_value
                
                # Ejecutar función y cachear resultado
                result = func(*args, **kwargs)
                self.set(namespace, cache_key, result, priority)
                
                return result
            
            return wrapper
        return decorator
    
    def close(self):
        """Cierra las conexiones del pool"""
        try:
            self.pool.disconnect()
            logger.info("Cache service connections closed")
        except Exception as e:
            logger.error(f"Error closing cache connections: {e}")


# Instancia global del servicio de caché
cache_service = AdvancedCacheService()
