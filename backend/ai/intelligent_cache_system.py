#!/usr/bin/env python3
"""
🧠 Sistema Inteligente de Cache para Agentes IA
Sistema avanzado de cache TTL con predicción inteligente, warming automático,
y optimización basada en patrones de uso.

Features:
- Cache TTL con múltiples niveles
- Predicción de cache misses
- Auto-warming inteligente
- Compresión automática de datos grandes
- Cache distribuido para escalabilidad
- Métricas de performance detalladas
- Invalidación inteligente
- Cache adaptativo basado en uso
"""

import asyncio
import logging
import hashlib
import pickle
import gzip
import json
import time
from typing import Dict, List, Optional, Any, Callable, Union, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict, OrderedDict
import weakref
from cachetools import TTLCache, LRUCache, LFUCache
import threading
import redis.asyncio as redis
from concurrent.futures import ThreadPoolExecutor

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CacheLevel(Enum):
    """Niveles de cache según importancia y frecuencia"""
    L1_HOT = "l1_hot"          # Datos más frecuentes, TTL corto
    L2_WARM = "l2_warm"        # Datos regulares, TTL medio
    L3_COLD = "l3_cold"        # Datos ocasionales, TTL largo
    L4_ARCHIVE = "l4_archive"  # Datos históricos, TTL muy largo

class CacheStrategy(Enum):
    """Estrategias de cache disponibles"""
    LRU = "lru"          # Least Recently Used
    LFU = "lfu"          # Least Frequently Used
    TTL = "ttl"          # Time To Live
    ADAPTIVE = "adaptive" # Adaptativo basado en patrones

@dataclass
class CacheMetrics:
    """Métricas detalladas del sistema de cache"""
    total_requests: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    cache_evictions: int = 0
    compression_saves: int = 0
    prediction_accuracy: float = 0.0
    avg_response_time: float = 0.0
    memory_usage_mb: float = 0.0
    hit_rate_by_level: Dict[str, float] = None
    
    def __post_init__(self):
        if self.hit_rate_by_level is None:
            self.hit_rate_by_level = {}

@dataclass
class CacheEntry:
    """Entrada de cache con metadatos"""
    key: str
    value: Any
    created_at: datetime
    last_accessed: datetime
    access_count: int
    ttl_seconds: int
    compressed: bool
    size_bytes: int
    level: CacheLevel
    tags: List[str]
    
class IntelligentCacheSystem:
    """
    Sistema inteligente de cache multi-nivel para agentes IA
    
    Características:
    - Cache TTL jerárquico (L1-L4)
    - Predicción inteligente de cache misses
    - Auto-warming basado en patrones
    - Compresión automática
    - Cache distribuido con Redis
    - Métricas avanzadas
    """
    
    def __init__(self, 
                 redis_url: str = "redis://localhost:6379",
                 enable_distributed: bool = True,
                 compression_threshold: int = 1024,  # bytes
                 prediction_enabled: bool = True):
        
        # Configuración de cache levels
        self.cache_configs = {
            CacheLevel.L1_HOT: {
                "maxsize": 1000,
                "ttl": 300,        # 5 minutos
                "strategy": CacheStrategy.LRU
            },
            CacheLevel.L2_WARM: {
                "maxsize": 5000,
                "ttl": 1800,       # 30 minutos
                "strategy": CacheStrategy.TTL
            },
            CacheLevel.L3_COLD: {
                "maxsize": 10000,
                "ttl": 7200,       # 2 horas
                "strategy": CacheStrategy.LFU
            },
            CacheLevel.L4_ARCHIVE: {
                "maxsize": 20000,
                "ttl": 86400,      # 24 horas
                "strategy": CacheStrategy.TTL
            }
        }
        
        # Inicializar caches locales
        self.caches = {}
        self._initialize_local_caches()
        
        # Cache distribuido
        self.redis_client = None
        self.enable_distributed = enable_distributed
        self.redis_url = redis_url
        
        # Sistema de predicción
        self.prediction_enabled = prediction_enabled
        self.access_patterns = defaultdict(list)
        self.prediction_model = {}
        
        # Compresión
        self.compression_threshold = compression_threshold
        
        # Métricas
        self.metrics = CacheMetrics()
        self.performance_history = defaultdict(list)
        
        # Threading para operaciones pesadas
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # Auto-warming
        self.warming_patterns = defaultdict(int)
        self.warming_schedule = {}
        
        # Lock para operaciones thread-safe
        self.lock = threading.RLock()
        
        # Estado del sistema
        self.is_initialized = False

    def _initialize_local_caches(self):
        """Inicializar caches locales según configuración"""
        for level, config in self.cache_configs.items():
            strategy = config["strategy"]
            
            if strategy == CacheStrategy.LRU:
                cache = LRUCache(maxsize=config["maxsize"])
            elif strategy == CacheStrategy.LFU:
                cache = LFUCache(maxsize=config["maxsize"])
            elif strategy == CacheStrategy.TTL:
                cache = TTLCache(maxsize=config["maxsize"], ttl=config["ttl"])
            else:  # ADAPTIVE
                cache = TTLCache(maxsize=config["maxsize"], ttl=config["ttl"])
            
            self.caches[level] = cache
            logger.info(f"📦 Initialized {level.value} cache: {strategy.value}, size={config['maxsize']}, ttl={config['ttl']}s")

    async def initialize(self):
        """Inicializar sistema de cache"""
        try:
            logger.info("🚀 Initializing Intelligent Cache System...")
            
            # Inicializar Redis si está habilitado
            if self.enable_distributed:
                await self._initialize_redis()
            
            # Cargar patrones históricos
            await self._load_access_patterns()
            
            # Iniciar tareas de background
            asyncio.create_task(self._background_optimizer())
            asyncio.create_task(self._metrics_collector())
            asyncio.create_task(self._auto_warmer())
            
            self.is_initialized = True
            logger.info("✅ Intelligent Cache System initialized successfully")
            
            return await self.get_cache_stats()
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize cache system: {e}")
            raise

    async def _initialize_redis(self):
        """Inicializar conexión Redis"""
        try:
            self.redis_client = redis.from_url(self.redis_url)
            
            # Test de conexión
            await self.redis_client.ping()
            logger.info("🔗 Redis connection established")
            
        except Exception as e:
            logger.warning(f"⚠️ Redis connection failed: {e}, using local cache only")
            self.enable_distributed = False

    async def _background_optimizer(self):
        """Optimizador de background para ajustar cache dinámicamente"""
        while True:
            try:
                await asyncio.sleep(300)  # 5 minutos
                await self._optimize_cache_levels()
                await self._update_prediction_model()
                
            except Exception as e:
                logger.error(f"❌ Background optimizer error: {e}")

    async def _metrics_collector(self):
        """Recolector de métricas en background"""
        while True:
            try:
                await asyncio.sleep(60)  # 1 minuto
                await self._collect_metrics()
                
            except Exception as e:
                logger.error(f"❌ Metrics collector error: {e}")

    async def _auto_warmer(self):
        """Auto-warmer de cache basado en patrones"""
        while True:
            try:
                await asyncio.sleep(600)  # 10 minutos
                await self._execute_cache_warming()
                
            except Exception as e:
                logger.error(f"❌ Auto-warmer error: {e}")

    def _determine_cache_level(self, key: str, value: Any, access_pattern: Dict = None) -> CacheLevel:
        """Determinar el nivel de cache apropiado para un elemento"""
        
        # Análisis de tamaño
        size_bytes = len(str(value).encode('utf-8'))
        
        # Análisis de patrones de acceso
        access_frequency = self.access_patterns.get(key, [])
        recent_accesses = len([t for t in access_frequency if time.time() - t < 3600])  # última hora
        
        # Predicción basada en key patterns
        key_priority = self._analyze_key_priority(key)
        
        # Lógica de clasificación
        if recent_accesses > 10 or key_priority == "critical":
            return CacheLevel.L1_HOT
        elif recent_accesses > 3 or key_priority == "high":
            return CacheLevel.L2_WARM
        elif recent_accesses > 0 or key_priority == "medium":
            return CacheLevel.L3_COLD
        else:
            return CacheLevel.L4_ARCHIVE

    def _analyze_key_priority(self, key: str) -> str:
        """Analizar prioridad basada en patrones de key"""
        critical_patterns = ["agent_config", "user_session", "auth_token"]
        high_patterns = ["conversation", "voice_model", "crm_data"]
        medium_patterns = ["analytics", "metrics", "logs"]
        
        key_lower = key.lower()
        
        if any(pattern in key_lower for pattern in critical_patterns):
            return "critical"
        elif any(pattern in key_lower for pattern in high_patterns):
            return "high"
        elif any(pattern in key_lower for pattern in medium_patterns):
            return "medium"
        else:
            return "low"

    def _should_compress(self, value: Any) -> bool:
        """Determinar si un valor debe ser comprimido"""
        try:
            serialized = pickle.dumps(value)
            return len(serialized) > self.compression_threshold
        except:
            return False

    def _compress_value(self, value: Any) -> Tuple[bytes, bool]:
        """Comprimir valor si es beneficioso"""
        try:
            serialized = pickle.dumps(value)
            
            if len(serialized) > self.compression_threshold:
                compressed = gzip.compress(serialized)
                if len(compressed) < len(serialized) * 0.8:  # Al menos 20% de ahorro
                    return compressed, True
            
            return serialized, False
            
        except Exception as e:
            logger.warning(f"⚠️ Compression failed for value: {e}")
            return pickle.dumps(value), False

    def _decompress_value(self, data: bytes, compressed: bool) -> Any:
        """Descomprimir valor"""
        try:
            if compressed:
                decompressed = gzip.decompress(data)
                return pickle.loads(decompressed)
            else:
                return pickle.loads(data)
                
        except Exception as e:
            logger.error(f"❌ Decompression failed: {e}")
            raise

    async def set(self, key: str, value: Any, 
                 ttl: Optional[int] = None,
                 level: Optional[CacheLevel] = None,
                 tags: List[str] = None) -> bool:
        """
        Almacenar valor en cache con nivel inteligente
        
        Args:
            key: Clave del cache
            value: Valor a almacenar
            ttl: TTL custom (opcional)
            level: Nivel específico (opcional)
            tags: Tags para invalidación (opcional)
        """
        try:
            start_time = time.time()
            
            # Determinar nivel si no se especifica
            if level is None:
                level = self._determine_cache_level(key, value)
            
            # Comprimir si es necesario
            compressed_data, is_compressed = self._compress_value(value)
            
            # Crear entrada de cache
            cache_entry = CacheEntry(
                key=key,
                value=compressed_data,
                created_at=datetime.now(),
                last_accessed=datetime.now(),
                access_count=1,
                ttl_seconds=ttl or self.cache_configs[level]["ttl"],
                compressed=is_compressed,
                size_bytes=len(compressed_data),
                level=level,
                tags=tags or []
            )
            
            # Almacenar en cache local
            with self.lock:
                self.caches[level][key] = cache_entry
            
            # Almacenar en Redis si está disponible
            if self.enable_distributed and self.redis_client:
                try:
                    redis_key = f"cache:{level.value}:{key}"
                    redis_value = {
                        "data": compressed_data,
                        "compressed": is_compressed,
                        "created_at": cache_entry.created_at.isoformat(),
                        "tags": cache_entry.tags,
                        "level": level.value
                    }
                    
                    await self.redis_client.setex(
                        redis_key,
                        cache_entry.ttl_seconds,
                        pickle.dumps(redis_value)
                    )
                except Exception as e:
                    logger.warning(f"⚠️ Redis set failed: {e}")
            
            # Actualizar métricas
            response_time = time.time() - start_time
            self._update_set_metrics(response_time, is_compressed)
            
            # Registrar patrón de acceso
            self.access_patterns[key].append(time.time())
            
            logger.debug(f"📝 Cached '{key}' in {level.value} (compressed: {is_compressed})")
            return True
            
        except Exception as e:
            logger.error(f"❌ Cache set failed for key '{key}': {e}")
            return False

    async def get(self, key: str, level: Optional[CacheLevel] = None) -> Optional[Any]:
        """
        Obtener valor del cache
        
        Args:
            key: Clave a buscar
            level: Nivel específico (busca en todos si no se especifica)
            
        Returns:
            Valor encontrado o None
        """
        try:
            start_time = time.time()
            
            # Buscar en nivel específico
            if level:
                result = await self._get_from_level(key, level)
                if result is not None:
                    self._record_cache_hit(key, level)
                    return result
            else:
                # Buscar en todos los niveles (L1 -> L4)
                for cache_level in CacheLevel:
                    result = await self._get_from_level(key, cache_level)
                    if result is not None:
                        self._record_cache_hit(key, cache_level)
                        return result
            
            # Cache miss
            self._record_cache_miss(key)
            
            # Predicción para cache warming
            if self.prediction_enabled:
                await self._predict_related_keys(key)
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Cache get failed for key '{key}': {e}")
            return None

    async def _get_from_level(self, key: str, level: CacheLevel) -> Optional[Any]:
        """Obtener valor de un nivel específico"""
        try:
            # Buscar en cache local primero
            with self.lock:
                if key in self.caches[level]:
                    entry = self.caches[level][key]
                    
                    # Actualizar access info
                    entry.last_accessed = datetime.now()
                    entry.access_count += 1
                    
                    # Descomprimir si es necesario
                    return self._decompress_value(entry.value, entry.compressed)
            
            # Buscar en Redis si no está en local
            if self.enable_distributed and self.redis_client:
                try:
                    redis_key = f"cache:{level.value}:{key}"
                    redis_data = await self.redis_client.get(redis_key)
                    
                    if redis_data:
                        redis_value = pickle.loads(redis_data)
                        
                        # Reconstruir en cache local
                        await self.set(
                            key=key,
                            value=self._decompress_value(redis_value["data"], redis_value["compressed"]),
                            level=level
                        )
                        
                        return self._decompress_value(redis_value["data"], redis_value["compressed"])
                        
                except Exception as e:
                    logger.warning(f"⚠️ Redis get failed: {e}")
            
            return None
            
        except Exception as e:
            logger.warning(f"⚠️ Get from {level.value} failed: {e}")
            return None

    async def invalidate(self, pattern: str = None, tags: List[str] = None, level: CacheLevel = None):
        """
        Invalidar entradas de cache
        
        Args:
            pattern: Patrón de keys a invalidar
            tags: Tags de entradas a invalidar  
            level: Nivel específico a invalidar
        """
        try:
            invalidated_count = 0
            
            levels_to_check = [level] if level else list(CacheLevel)
            
            for cache_level in levels_to_check:
                with self.lock:
                    cache = self.caches[cache_level]
                    keys_to_remove = []
                    
                    for key, entry in cache.items():
                        should_invalidate = False
                        
                        # Invalidar por patrón
                        if pattern and pattern in key:
                            should_invalidate = True
                        
                        # Invalidar por tags
                        if tags and any(tag in entry.tags for tag in tags):
                            should_invalidate = True
                        
                        if should_invalidate:
                            keys_to_remove.append(key)
                    
                    # Remover keys
                    for key in keys_to_remove:
                        del cache[key]
                        invalidated_count += 1
                        
                        # Remover de Redis también
                        if self.enable_distributed and self.redis_client:
                            try:
                                redis_key = f"cache:{cache_level.value}:{key}"
                                await self.redis_client.delete(redis_key)
                            except Exception as e:
                                logger.warning(f"⚠️ Redis delete failed: {e}")
            
            logger.info(f"🗑️ Invalidated {invalidated_count} cache entries")
            return invalidated_count
            
        except Exception as e:
            logger.error(f"❌ Cache invalidation failed: {e}")
            return 0

    async def _predict_related_keys(self, missed_key: str):
        """Predecir keys relacionadas para cache warming"""
        if not self.prediction_enabled:
            return
        
        try:
            # Análisis de patrones de keys relacionadas
            related_patterns = []
            
            # Patrón por prefijo
            key_parts = missed_key.split(":")
            if len(key_parts) > 1:
                prefix = key_parts[0]
                related_patterns.append(f"{prefix}:*")
            
            # Patrón por sufijo común
            if "_" in missed_key:
                base = missed_key.rsplit("_", 1)[0]
                related_patterns.append(f"{base}_*")
            
            # Registrar para warming futuro
            for pattern in related_patterns:
                self.warming_patterns[pattern] += 1
                
            logger.debug(f"🔮 Predicted warming patterns for '{missed_key}': {related_patterns}")
            
        except Exception as e:
            logger.warning(f"⚠️ Prediction failed for '{missed_key}': {e}")

    def _record_cache_hit(self, key: str, level: CacheLevel):
        """Registrar cache hit"""
        self.metrics.total_requests += 1
        self.metrics.cache_hits += 1
        
        # Métricas por nivel
        level_key = level.value
        if level_key not in self.metrics.hit_rate_by_level:
            self.metrics.hit_rate_by_level[level_key] = {"hits": 0, "requests": 0}
        
        self.metrics.hit_rate_by_level[level_key]["hits"] += 1
        self.metrics.hit_rate_by_level[level_key]["requests"] += 1

    def _record_cache_miss(self, key: str):
        """Registrar cache miss"""
        self.metrics.total_requests += 1
        self.metrics.cache_misses += 1

    def _update_set_metrics(self, response_time: float, compressed: bool):
        """Actualizar métricas de set operation"""
        if compressed:
            self.metrics.compression_saves += 1
        
        # Actualizar tiempo promedio de respuesta
        total_ops = self.metrics.cache_hits + self.metrics.cache_misses
        if total_ops > 0:
            self.metrics.avg_response_time = (
                (self.metrics.avg_response_time * (total_ops - 1) + response_time) / total_ops
            )

    async def get_cache_stats(self) -> Dict[str, Any]:
        """Obtener estadísticas detalladas del cache"""
        try:
            # Calcular hit rate general
            total_requests = max(self.metrics.total_requests, 1)
            overall_hit_rate = (self.metrics.cache_hits / total_requests) * 100
            
            # Calcular uso de memoria
            memory_usage = 0
            level_stats = {}
            
            for level, cache in self.caches.items():
                level_size = len(cache)
                level_memory = sum(
                    entry.size_bytes for entry in cache.values() 
                    if hasattr(entry, 'size_bytes')
                )
                memory_usage += level_memory
                
                level_stats[level.value] = {
                    "entries": level_size,
                    "max_size": self.cache_configs[level]["maxsize"],
                    "memory_mb": level_memory / 1024 / 1024,
                    "hit_rate": self.metrics.hit_rate_by_level.get(level.value, {}).get("hits", 0) / 
                               max(self.metrics.hit_rate_by_level.get(level.value, {}).get("requests", 1), 1) * 100
                }
            
            return {
                "overall_metrics": {
                    "hit_rate_percent": overall_hit_rate,
                    "total_requests": self.metrics.total_requests,
                    "cache_hits": self.metrics.cache_hits,
                    "cache_misses": self.metrics.cache_misses,
                    "avg_response_time_ms": self.metrics.avg_response_time * 1000,
                    "compression_saves": self.metrics.compression_saves,
                    "memory_usage_mb": memory_usage / 1024 / 1024
                },
                "level_stats": level_stats,
                "system_info": {
                    "distributed_enabled": self.enable_distributed,
                    "prediction_enabled": self.prediction_enabled,
                    "compression_threshold": self.compression_threshold,
                    "warming_patterns": len(self.warming_patterns)
                },
                "performance": {
                    "top_accessed_keys": self._get_top_accessed_keys(10),
                    "warming_candidates": self._get_warming_candidates(5)
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get cache stats: {e}")
            return {"error": str(e)}

    def _get_top_accessed_keys(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Obtener keys más accedidas"""
        try:
            access_stats = []
            
            for level, cache in self.caches.items():
                for key, entry in cache.items():
                    if hasattr(entry, 'access_count'):
                        access_stats.append({
                            "key": key,
                            "access_count": entry.access_count,
                            "level": level.value,
                            "last_accessed": entry.last_accessed.isoformat()
                        })
            
            # Ordenar por access_count descendente
            access_stats.sort(key=lambda x: x["access_count"], reverse=True)
            return access_stats[:limit]
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to get top accessed keys: {e}")
            return []

    def _get_warming_candidates(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Obtener candidatos para cache warming"""
        try:
            candidates = []
            
            for pattern, frequency in self.warming_patterns.items():
                candidates.append({
                    "pattern": pattern,
                    "frequency": frequency,
                    "priority": "high" if frequency > 10 else "medium" if frequency > 5 else "low"
                })
            
            candidates.sort(key=lambda x: x["frequency"], reverse=True)
            return candidates[:limit]
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to get warming candidates: {e}")
            return []

    async def cleanup(self):
        """Limpiar recursos del sistema de cache"""
        try:
            logger.info("🧹 Cleaning up Intelligent Cache System...")
            
            # Limpiar caches locales
            with self.lock:
                for cache in self.caches.values():
                    cache.clear()
            
            # Cerrar conexión Redis
            if self.redis_client:
                await self.redis_client.close()
            
            # Cerrar thread pool
            self.executor.shutdown(wait=True)
            
            logger.info("✅ Cache system cleanup completed")
            
        except Exception as e:
            logger.error(f"❌ Cache cleanup error: {e}")

# Función de utilidad para crear instancia
async def create_intelligent_cache_system(config: Dict[str, Any]) -> IntelligentCacheSystem:
    """
    Factory function para crear sistema de cache configurado
    
    Args:
        config: Configuración del sistema de cache
        
    Returns:
        Instancia inicializada de IntelligentCacheSystem
    """
    cache_system = IntelligentCacheSystem(
        redis_url=config.get("redis_url", "redis://localhost:6379"),
        enable_distributed=config.get("enable_distributed", True),
        compression_threshold=config.get("compression_threshold", 1024),
        prediction_enabled=config.get("prediction_enabled", True)
    )
    
    await cache_system.initialize()
    return cache_system

# Ejemplo de uso
if __name__ == "__main__":
    async def main():
        config = {
            "redis_url": "redis://localhost:6379",
            "enable_distributed": True,
            "compression_threshold": 1024,
            "prediction_enabled": True
        }
        
        try:
            # Crear sistema de cache
            cache = await create_intelligent_cache_system(config)
            
            # Ejemplo de uso
            await cache.set("agent_config:123", {"name": "Agent123", "model": "gpt-4"})
            await cache.set("conversation:456", {"messages": ["Hello", "World"] * 100}, tags=["conversation"])
            
            # Recuperar valores
            config_data = await cache.get("agent_config:123")
            print(f"📦 Retrieved: {config_data}")
            
            # Obtener estadísticas
            stats = await cache.get_cache_stats()
            print(f"📊 Cache Stats: {json.dumps(stats, indent=2, default=str)}")
            
            # Invalidar por tags
            invalidated = await cache.invalidate(tags=["conversation"])
            print(f"🗑️ Invalidated {invalidated} entries")
            
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            if 'cache' in locals():
                await cache.cleanup()
    
    asyncio.run(main())