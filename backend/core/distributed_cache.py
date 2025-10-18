"""
Sistema de Caché Distribuido con Redis
Implementa cache multicapa con invalidación inteligente y sincronización
"""

import asyncio
import json
import pickle
import logging
import hashlib
from datetime import datetime, timedelta
from typing import Any, Optional, Dict, List, Set, Callable, Union
from enum import Enum
import redis.asyncio as aioredis
from redis.asyncio.client import Redis
from redis.exceptions import RedisError
import msgpack

logger = logging.getLogger(__name__)


class CacheStrategy(Enum):
    """Estrategias de caché"""
    LRU = "LRU"                    # Least Recently Used
    LFU = "LFU"                    # Least Frequently Used
    TTL = "TTL"                    # Time To Live
    WRITE_THROUGH = "WRITE_THROUGH"  # Escribe en cache y DB simultáneamente
    WRITE_BACK = "WRITE_BACK"      # Escribe en cache, luego en DB
    REFRESH_AHEAD = "REFRESH_AHEAD"  # Refresca antes de expirar


class CacheLevel(Enum):
    """Niveles de caché"""
    L1_MEMORY = "L1_MEMORY"        # Cache en memoria local
    L2_REDIS = "L2_REDIS"          # Cache en Redis
    L3_PERSISTENT = "L3_PERSISTENT"  # Cache persistente


class SerializationFormat(Enum):
    """Formatos de serialización"""
    JSON = "JSON"
    PICKLE = "PICKLE"
    MSGPACK = "MSGPACK"


class CacheTTL:
    """Configuración de TTL por tipo de dato"""
    USER_SESSION = timedelta(hours=24)
    QUOTATION = timedelta(hours=48)
    AVAILABILITY = timedelta(minutes=5)
    PRICE = timedelta(minutes=15)
    STATIC_CONTENT = timedelta(days=7)
    SEARCH_RESULTS = timedelta(minutes=10)
    ANALYTICS = timedelta(hours=1)
    CONFIGURATION = timedelta(hours=12)


class LocalCache:
    """
    Cache L1 en memoria local con límite de tamaño
    """
    
    def __init__(self, max_size: int = 1000):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.max_size = max_size
        self.access_count: Dict[str, int] = {}
        self.access_time: Dict[str, datetime] = {}
    
    async def get(self, key: str) -> Optional[Any]:
        """Obtener valor del cache local"""
        if key in self.cache:
            entry = self.cache[key]
            if entry['expires'] > datetime.utcnow():
                self.access_count[key] = self.access_count.get(key, 0) + 1
                self.access_time[key] = datetime.utcnow()
                return entry['value']
            else:
                # Expirado, eliminar
                del self.cache[key]
        return None
    
    async def set(self, key: str, value: Any, ttl: timedelta):
        """Establecer valor en cache local"""
        # Si alcanzamos el límite, eliminar LRU
        if len(self.cache) >= self.max_size:
            await self._evict_lru()
        
        self.cache[key] = {
            'value': value,
            'expires': datetime.utcnow() + ttl
        }
        self.access_count[key] = 1
        self.access_time[key] = datetime.utcnow()
    
    async def _evict_lru(self):
        """Eliminar entrada menos recientemente usada"""
        if not self.access_time:
            return
        
        lru_key = min(self.access_time.keys(), key=lambda k: self.access_time[k])
        if lru_key in self.cache:
            del self.cache[lru_key]
            del self.access_count[lru_key]
            del self.access_time[lru_key]
    
    async def invalidate(self, key: str):
        """Invalidar entrada del cache"""
        if key in self.cache:
            del self.cache[key]
        if key in self.access_count:
            del self.access_count[key]
        if key in self.access_time:
            del self.access_time[key]
    
    async def clear(self):
        """Limpiar todo el cache local"""
        self.cache.clear()
        self.access_count.clear()
        self.access_time.clear()


class DistributedCache:
    """
    Sistema de Cache Distribuido con Redis
    Implementa cache multinivel con estrategias avanzadas
    """
    
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        enable_local_cache: bool = True,
        local_cache_size: int = 1000,
        default_ttl: timedelta = timedelta(hours=1),
        serialization: SerializationFormat = SerializationFormat.MSGPACK
    ):
        self.redis_url = redis_url
        self.redis_master: Optional[Redis] = None
        self.redis_replicas: List[Redis] = []
        self.enable_local_cache = enable_local_cache
        self.local_cache = LocalCache(local_cache_size) if enable_local_cache else None
        self.default_ttl = default_ttl
        self.serialization = serialization
        
        # Configuración de sharding
        self.shard_count = 4
        self.shards: List[Redis] = []
        
        # Métricas
        self.metrics = {
            'hits': 0,
            'misses': 0,
            'l1_hits': 0,
            'l2_hits': 0,
            'writes': 0,
            'evictions': 0,
            'errors': 0
        }
        
        # Invalidación de grupos
        self.cache_groups: Dict[str, Set[str]] = {}
        
        # Callbacks de invalidación
        self.invalidation_callbacks: Dict[str, List[Callable]] = {}
    
    async def connect(self):
        """Conectar a Redis cluster"""
        try:
            # Conectar a master
            self.redis_master = await aioredis.from_url(
                self.redis_url,
                encoding="utf-8" if self.serialization == SerializationFormat.JSON else None,
                decode_responses=False
            )
            
            # Ping para verificar conexión
            await self.redis_master.ping()
            
            # Conectar a réplicas (si están configuradas)
            replica_urls = self._get_replica_urls()
            for url in replica_urls:
                try:
                    replica = await aioredis.from_url(url, decode_responses=False)
                    await replica.ping()
                    self.redis_replicas.append(replica)
                except Exception as e:
                    logger.warning(f"Failed to connect to replica {url}: {e}")
            
            # Configurar sharding
            await self._setup_sharding()
            
            logger.info(f"Connected to Redis master and {len(self.redis_replicas)} replicas")
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
    
    async def disconnect(self):
        """Desconectar de Redis"""
        if self.redis_master:
            await self.redis_master.close()
        
        for replica in self.redis_replicas:
            await replica.close()
        
        for shard in self.shards:
            await shard.close()
    
    def _get_replica_urls(self) -> List[str]:
        """Obtener URLs de réplicas desde configuración"""
        # En producción, esto vendría de configuración
        return [
            # "redis://localhost:6380",
            # "redis://localhost:6381"
        ]
    
    async def _setup_sharding(self):
        """Configurar sharding para distribución de carga"""
        # Por ahora usar el mismo Redis con diferentes prefijos
        # En producción, serían instancias separadas
        for i in range(self.shard_count):
            self.shards.append(self.redis_master)
    
    def _get_shard(self, key: str) -> Redis:
        """Obtener shard basado en hash de la clave"""
        if not self.shards:
            return self.redis_master
        
        hash_value = hashlib.md5(key.encode()).hexdigest()
        shard_index = int(hash_value[:8], 16) % len(self.shards)
        return self.shards[shard_index]
    
    def _serialize(self, value: Any) -> bytes:
        """Serializar valor según formato configurado"""
        if self.serialization == SerializationFormat.JSON:
            return json.dumps(value).encode('utf-8')
        elif self.serialization == SerializationFormat.PICKLE:
            return pickle.dumps(value)
        else:  # MSGPACK
            return msgpack.packb(value, use_bin_type=True)
    
    def _deserialize(self, data: bytes) -> Any:
        """Deserializar valor"""
        if data is None:
            return None
        
        if self.serialization == SerializationFormat.JSON:
            return json.loads(data.decode('utf-8'))
        elif self.serialization == SerializationFormat.PICKLE:
            return pickle.loads(data)
        else:  # MSGPACK
            return msgpack.unpackb(data, raw=False)
    
    async def get(
        self,
        key: str,
        default: Any = None,
        use_replica: bool = True
    ) -> Any:
        """
        Obtener valor del cache
        Intenta L1 (local) primero, luego L2 (Redis)
        """
        # Intentar cache local primero
        if self.local_cache:
            value = await self.local_cache.get(key)
            if value is not None:
                self.metrics['l1_hits'] += 1
                self.metrics['hits'] += 1
                return value
        
        # Intentar Redis
        try:
            # Usar réplica para lectura si está disponible
            redis_instance = self._get_read_instance(key) if use_replica else self.redis_master
            
            if not redis_instance:
                self.metrics['misses'] += 1
                return default
            
            data = await redis_instance.get(key)
            
            if data is not None:
                value = self._deserialize(data)
                self.metrics['l2_hits'] += 1
                self.metrics['hits'] += 1
                
                # Guardar en cache local
                if self.local_cache:
                    ttl = await self._get_ttl(key)
                    await self.local_cache.set(key, value, timedelta(seconds=ttl))
                
                return value
            
        except RedisError as e:
            logger.error(f"Redis get error for key {key}: {e}")
            self.metrics['errors'] += 1
        
        self.metrics['misses'] += 1
        return default
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[timedelta] = None,
        cache_group: Optional[str] = None,
        strategy: CacheStrategy = CacheStrategy.WRITE_THROUGH
    ) -> bool:
        """
        Establecer valor en cache con estrategia específica
        """
        if ttl is None:
            ttl = self.default_ttl
        
        try:
            # Serializar valor
            data = self._serialize(value)
            
            # Obtener shard para esta clave
            redis_instance = self._get_shard(key)
            
            if strategy == CacheStrategy.WRITE_THROUGH:
                # Escribir en Redis inmediatamente
                await redis_instance.setex(key, int(ttl.total_seconds()), data)
                
                # También guardar en cache local
                if self.local_cache:
                    await self.local_cache.set(key, value, ttl)
            
            elif strategy == CacheStrategy.WRITE_BACK:
                # Escribir en cache local primero
                if self.local_cache:
                    await self.local_cache.set(key, value, ttl)
                
                # Programar escritura a Redis (async)
                asyncio.create_task(self._write_back_to_redis(key, data, ttl))
            
            # Agregar a grupo si se especifica
            if cache_group:
                await self._add_to_group(cache_group, key)
            
            self.metrics['writes'] += 1
            return True
            
        except RedisError as e:
            logger.error(f"Redis set error for key {key}: {e}")
            self.metrics['errors'] += 1
            return False
    
    async def _write_back_to_redis(self, key: str, data: bytes, ttl: timedelta):
        """Escritura asíncrona a Redis para WRITE_BACK"""
        try:
            await asyncio.sleep(0.1)  # Pequeña demora para batching
            redis_instance = self._get_shard(key)
            await redis_instance.setex(key, int(ttl.total_seconds()), data)
        except Exception as e:
            logger.error(f"Write-back failed for key {key}: {e}")
    
    async def delete(self, key: str) -> bool:
        """Eliminar clave del cache"""
        try:
            # Eliminar de cache local
            if self.local_cache:
                await self.local_cache.invalidate(key)
            
            # Eliminar de Redis
            redis_instance = self._get_shard(key)
            result = await redis_instance.delete(key)
            
            # Ejecutar callbacks de invalidación
            await self._execute_invalidation_callbacks(key)
            
            return result > 0
            
        except RedisError as e:
            logger.error(f"Redis delete error for key {key}: {e}")
            self.metrics['errors'] += 1
            return False
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """
        Invalidar todas las claves que coincidan con un patrón
        Ejemplo: "user:*" invalida todas las claves de usuario
        """
        count = 0
        
        try:
            # Usar SCAN para no bloquear Redis
            cursor = 0
            while True:
                cursor, keys = await self.redis_master.scan(
                    cursor,
                    match=pattern,
                    count=100
                )
                
                if keys:
                    # Eliminar en batch
                    await self.redis_master.delete(*keys)
                    count += len(keys)
                    
                    # Invalidar en cache local
                    if self.local_cache:
                        for key in keys:
                            if isinstance(key, bytes):
                                key = key.decode('utf-8')
                            await self.local_cache.invalidate(key)
                
                if cursor == 0:
                    break
            
            logger.info(f"Invalidated {count} keys matching pattern {pattern}")
            
        except RedisError as e:
            logger.error(f"Error invalidating pattern {pattern}: {e}")
            self.metrics['errors'] += 1
        
        return count
    
    async def invalidate_group(self, group: str) -> int:
        """
        Invalidar todas las claves de un grupo
        """
        if group not in self.cache_groups:
            return 0
        
        keys = list(self.cache_groups[group])
        count = 0
        
        for key in keys:
            if await self.delete(key):
                count += 1
        
        # Limpiar el grupo
        self.cache_groups[group].clear()
        
        logger.info(f"Invalidated {count} keys in group {group}")
        return count
    
    async def _add_to_group(self, group: str, key: str):
        """Agregar clave a un grupo"""
        if group not in self.cache_groups:
            self.cache_groups[group] = set()
        self.cache_groups[group].add(key)
        
        # También guardar en Redis para persistencia
        await self.redis_master.sadd(f"cache_group:{group}", key)
    
    def _get_read_instance(self, key: str) -> Redis:
        """Obtener instancia para lectura (master o réplica)"""
        if self.redis_replicas:
            # Distribuir lecturas entre réplicas
            hash_value = hashlib.md5(key.encode()).hexdigest()
            index = int(hash_value[:8], 16) % (len(self.redis_replicas) + 1)
            
            if index == 0:
                return self.redis_master
            else:
                return self.redis_replicas[index - 1]
        
        return self.redis_master
    
    async def _get_ttl(self, key: str) -> int:
        """Obtener TTL restante de una clave en segundos"""
        try:
            ttl = await self.redis_master.ttl(key)
            return max(0, ttl)
        except:
            return 0
    
    async def get_or_compute(
        self,
        key: str,
        compute_func: Callable,
        ttl: Optional[timedelta] = None,
        cache_group: Optional[str] = None
    ) -> Any:
        """
        Obtener del cache o computar si no existe
        Previene cache stampede con locks
        """
        # Intentar obtener del cache
        value = await self.get(key)
        if value is not None:
            return value
        
        # Usar lock para evitar computación duplicada
        lock_key = f"lock:{key}"
        lock_acquired = False
        
        try:
            # Intentar adquirir lock
            lock_acquired = await self.redis_master.set(
                lock_key,
                "1",
                nx=True,
                ex=30  # Lock expira en 30 segundos
            )
            
            if lock_acquired:
                # Doble check después de adquirir lock
                value = await self.get(key)
                if value is not None:
                    return value
                
                # Computar valor
                if asyncio.iscoroutinefunction(compute_func):
                    value = await compute_func()
                else:
                    value = compute_func()
                
                # Guardar en cache
                await self.set(key, value, ttl, cache_group)
                
                return value
            else:
                # Otro proceso está computando, esperar
                for _ in range(60):  # Esperar máximo 30 segundos
                    await asyncio.sleep(0.5)
                    value = await self.get(key)
                    if value is not None:
                        return value
                
                # Si llegamos aquí, computar de todas formas
                if asyncio.iscoroutinefunction(compute_func):
                    return await compute_func()
                else:
                    return compute_func()
                    
        finally:
            # Liberar lock
            if lock_acquired:
                await self.redis_master.delete(lock_key)
    
    async def mget(self, keys: List[str]) -> Dict[str, Any]:
        """
        Obtener múltiples valores de una vez
        Más eficiente que múltiples get()
        """
        result = {}
        
        # Primero intentar cache local
        local_hits = []
        redis_keys = []
        
        if self.local_cache:
            for key in keys:
                value = await self.local_cache.get(key)
                if value is not None:
                    result[key] = value
                    local_hits.append(key)
                else:
                    redis_keys.append(key)
        else:
            redis_keys = keys
        
        # Obtener de Redis las que faltan
        if redis_keys:
            try:
                values = await self.redis_master.mget(redis_keys)
                
                for key, data in zip(redis_keys, values):
                    if data is not None:
                        value = self._deserialize(data)
                        result[key] = value
                        
                        # Guardar en cache local
                        if self.local_cache:
                            await self.local_cache.set(key, value, self.default_ttl)
                            
            except RedisError as e:
                logger.error(f"Redis mget error: {e}")
                self.metrics['errors'] += 1
        
        return result
    
    async def mset(
        self,
        data: Dict[str, Any],
        ttl: Optional[timedelta] = None,
        cache_group: Optional[str] = None
    ) -> bool:
        """
        Establecer múltiples valores de una vez
        """
        if ttl is None:
            ttl = self.default_ttl
        
        try:
            # Preparar pipeline
            pipe = self.redis_master.pipeline()
            
            for key, value in data.items():
                serialized = self._serialize(value)
                pipe.setex(key, int(ttl.total_seconds()), serialized)
                
                # Agregar a grupo si se especifica
                if cache_group:
                    pipe.sadd(f"cache_group:{cache_group}", key)
                
                # También guardar en cache local
                if self.local_cache:
                    await self.local_cache.set(key, value, ttl)
            
            # Ejecutar pipeline
            await pipe.execute()
            
            self.metrics['writes'] += len(data)
            return True
            
        except RedisError as e:
            logger.error(f"Redis mset error: {e}")
            self.metrics['errors'] += 1
            return False
    
    async def increment(
        self,
        key: str,
        delta: int = 1,
        ttl: Optional[timedelta] = None
    ) -> int:
        """Incrementar valor atómicamente"""
        try:
            result = await self.redis_master.incrby(key, delta)
            
            if ttl:
                await self.redis_master.expire(key, int(ttl.total_seconds()))
            
            return result
            
        except RedisError as e:
            logger.error(f"Redis increment error for key {key}: {e}")
            self.metrics['errors'] += 1
            return 0
    
    async def add_to_set(self, key: str, *values, ttl: Optional[timedelta] = None) -> int:
        """Agregar valores a un set"""
        try:
            result = await self.redis_master.sadd(key, *values)
            
            if ttl:
                await self.redis_master.expire(key, int(ttl.total_seconds()))
            
            return result
            
        except RedisError as e:
            logger.error(f"Redis sadd error for key {key}: {e}")
            return 0
    
    async def get_set_members(self, key: str) -> Set[str]:
        """Obtener miembros de un set"""
        try:
            members = await self.redis_master.smembers(key)
            return set(members)
        except RedisError:
            return set()
    
    async def add_to_sorted_set(
        self,
        key: str,
        mapping: Dict[str, float],
        ttl: Optional[timedelta] = None
    ) -> int:
        """Agregar a sorted set con scores"""
        try:
            result = await self.redis_master.zadd(key, mapping)
            
            if ttl:
                await self.redis_master.expire(key, int(ttl.total_seconds()))
            
            return result
            
        except RedisError as e:
            logger.error(f"Redis zadd error for key {key}: {e}")
            return 0
    
    async def get_sorted_set_range(
        self,
        key: str,
        start: int = 0,
        end: int = -1,
        with_scores: bool = False
    ) -> Union[List[str], List[tuple]]:
        """Obtener rango de sorted set"""
        try:
            if with_scores:
                return await self.redis_master.zrange(key, start, end, withscores=True)
            else:
                return await self.redis_master.zrange(key, start, end)
        except RedisError:
            return []
    
    def register_invalidation_callback(self, pattern: str, callback: Callable):
        """Registrar callback para invalidación de caché"""
        if pattern not in self.invalidation_callbacks:
            self.invalidation_callbacks[pattern] = []
        self.invalidation_callbacks[pattern].append(callback)
    
    async def _execute_invalidation_callbacks(self, key: str):
        """Ejecutar callbacks de invalidación"""
        for pattern, callbacks in self.invalidation_callbacks.items():
            if self._match_pattern(key, pattern):
                for callback in callbacks:
                    try:
                        if asyncio.iscoroutinefunction(callback):
                            await callback(key)
                        else:
                            callback(key)
                    except Exception as e:
                        logger.error(f"Invalidation callback error: {e}")
    
    def _match_pattern(self, key: str, pattern: str) -> bool:
        """Verificar si una clave coincide con un patrón"""
        import fnmatch
        return fnmatch.fnmatch(key, pattern)
    
    async def get_metrics(self) -> Dict[str, Any]:
        """Obtener métricas del cache"""
        hit_rate = 0
        if self.metrics['hits'] + self.metrics['misses'] > 0:
            hit_rate = self.metrics['hits'] / (self.metrics['hits'] + self.metrics['misses'])
        
        # Obtener info de Redis
        redis_info = {}
        try:
            info = await self.redis_master.info()
            redis_info = {
                'used_memory': info.get('used_memory_human', 'N/A'),
                'connected_clients': info.get('connected_clients', 0),
                'total_commands': info.get('total_commands_processed', 0),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0)
            }
        except:
            pass
        
        return {
            'cache_metrics': {
                'total_hits': self.metrics['hits'],
                'total_misses': self.metrics['misses'],
                'l1_hits': self.metrics['l1_hits'],
                'l2_hits': self.metrics['l2_hits'],
                'hit_rate': hit_rate,
                'total_writes': self.metrics['writes'],
                'total_evictions': self.metrics['evictions'],
                'total_errors': self.metrics['errors']
            },
            'redis_info': redis_info,
            'local_cache_size': len(self.local_cache.cache) if self.local_cache else 0
        }
    
    async def warmup(self, warmup_func: Callable, keys: List[str]):
        """
        Precalentar cache con datos específicos
        Útil para cargar datos críticos al iniciar
        """
        logger.info(f"Warming up cache with {len(keys)} keys")
        
        for key in keys:
            value = await self.get(key)
            if value is None:
                # Computar y guardar
                if asyncio.iscoroutinefunction(warmup_func):
                    value = await warmup_func(key)
                else:
                    value = warmup_func(key)
                
                if value is not None:
                    await self.set(key, value)
        
        logger.info("Cache warmup completed")
    
    async def clear_all(self) -> bool:
        """
        Limpiar todo el cache (usar con precaución)
        """
        try:
            # Limpiar cache local
            if self.local_cache:
                await self.local_cache.clear()
            
            # Limpiar Redis
            await self.redis_master.flushdb()
            
            # Resetear métricas
            self.metrics = {
                'hits': 0,
                'misses': 0,
                'l1_hits': 0,
                'l2_hits': 0,
                'writes': 0,
                'evictions': 0,
                'errors': 0
            }
            
            logger.warning("All cache cleared")
            return True
            
        except RedisError as e:
            logger.error(f"Error clearing cache: {e}")
            return False


# Cache manager singleton
class CacheManager:
    """
    Manager para gestionar múltiples instancias de cache
    """
    
    def __init__(self):
        self.caches: Dict[str, DistributedCache] = {}
        self.default_cache: Optional[DistributedCache] = None
    
    async def initialize(
        self,
        redis_url: str = "redis://localhost:6379",
        enable_local_cache: bool = True
    ):
        """Inicializar cache manager"""
        # Cache por defecto
        self.default_cache = DistributedCache(
            redis_url=redis_url,
            enable_local_cache=enable_local_cache
        )
        await self.default_cache.connect()
        
        # Caches especializados
        self.caches['session'] = DistributedCache(
            redis_url=redis_url,
            enable_local_cache=True,
            default_ttl=CacheTTL.USER_SESSION
        )
        await self.caches['session'].connect()
        
        self.caches['quotation'] = DistributedCache(
            redis_url=redis_url,
            enable_local_cache=True,
            default_ttl=CacheTTL.QUOTATION
        )
        await self.caches['quotation'].connect()
        
        self.caches['search'] = DistributedCache(
            redis_url=redis_url,
            enable_local_cache=True,
            default_ttl=CacheTTL.SEARCH_RESULTS
        )
        await self.caches['search'].connect()
        
        logger.info("Cache manager initialized")
    
    def get_cache(self, name: Optional[str] = None) -> DistributedCache:
        """Obtener instancia de cache"""
        if name and name in self.caches:
            return self.caches[name]
        return self.default_cache
    
    async def shutdown(self):
        """Cerrar todas las conexiones"""
        if self.default_cache:
            await self.default_cache.disconnect()
        
        for cache in self.caches.values():
            await cache.disconnect()


# Singleton global
_cache_manager: Optional[CacheManager] = None


async def get_cache_manager() -> CacheManager:
    """Obtener instancia singleton del cache manager"""
    global _cache_manager
    
    if _cache_manager is None:
        _cache_manager = CacheManager()
        await _cache_manager.initialize()
    
    return _cache_manager


# Decorador para cachear funciones
def cached(
    ttl: Optional[timedelta] = None,
    key_prefix: Optional[str] = None,
    cache_name: Optional[str] = None
):
    """
    Decorador para cachear resultados de funciones
    
    Uso:
    @cached(ttl=timedelta(hours=1), key_prefix="user")
    async def get_user(user_id: str):
        return await db.get_user(user_id)
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Construir clave de cache
            cache_key_parts = [key_prefix or func.__name__]
            cache_key_parts.extend(str(arg) for arg in args)
            cache_key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
            cache_key = ":".join(cache_key_parts)
            
            # Obtener cache
            manager = await get_cache_manager()
            cache = manager.get_cache(cache_name)
            
            # Intentar obtener del cache
            result = await cache.get(cache_key)
            if result is not None:
                return result
            
            # Ejecutar función
            result = await func(*args, **kwargs)
            
            # Guardar en cache
            await cache.set(cache_key, result, ttl)
            
            return result
        
        return wrapper
    return decorator