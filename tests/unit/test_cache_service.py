"""
Tests Unitarios para el Servicio Avanzado de Caché
"""

import pytest
import time
from unittest.mock import Mock, patch, MagicMock
from backend.services.advanced_cache_service import (
    AdvancedCacheService,
    CacheStrategy,
    CachePriority
)


@pytest.fixture
def mock_redis():
    """Mock de cliente Redis"""
    with patch('redis.Redis') as mock:
        redis_instance = Mock()
        mock.return_value = redis_instance
        yield redis_instance


@pytest.fixture
def cache_service(mock_redis):
    """Fixture que proporciona una instancia del servicio de caché"""
    service = AdvancedCacheService(host='localhost', port=6379)
    service.redis_client = mock_redis
    return service


class TestCacheServiceInitialization:
    """Tests de inicialización del servicio"""
    
    def test_service_initialization(self, cache_service):
        """Verifica que el servicio se inicialice correctamente"""
        assert cache_service is not None
        assert cache_service.redis_client is not None
        assert len(cache_service.ttl_config) == 5
    
    def test_ttl_configuration(self, cache_service):
        """Verifica la configuración de TTL"""
        assert cache_service.ttl_config[CachePriority.CRITICAL] == 86400
        assert cache_service.ttl_config[CachePriority.HIGH] == 43200
        assert cache_service.ttl_config[CachePriority.MEDIUM] == 21600
        assert cache_service.ttl_config[CachePriority.LOW] == 3600
        assert cache_service.ttl_config[CachePriority.TEMPORARY] == 900
    
    def test_metrics_initialization(self, cache_service):
        """Verifica que las métricas se inicialicen en cero"""
        assert cache_service.metrics['hits'] == 0
        assert cache_service.metrics['misses'] == 0
        assert cache_service.metrics['sets'] == 0
        assert cache_service.metrics['deletes'] == 0


class TestBasicCacheOperations:
    """Tests de operaciones básicas de caché"""
    
    def test_set_cache_value(self, cache_service, mock_redis):
        """Test de guardado de valor en caché"""
        mock_redis.setex.return_value = True
        
        result = cache_service.set(
            namespace="user",
            identifier="123",
            value={"name": "John", "email": "john@example.com"},
            priority=CachePriority.HIGH
        )
        
        assert result is True
        assert cache_service.metrics['sets'] == 1
        mock_redis.setex.assert_called_once()
    
    def test_get_cache_value_hit(self, cache_service, mock_redis):
        """Test de obtención de valor existente (cache hit)"""
        mock_value = '{"name": "John", "email": "john@example.com"}'
        mock_redis.get.return_value = mock_value
        
        result = cache_service.get(
            namespace="user",
            identifier="123"
        )
        
        assert result is not None
        assert result["name"] == "John"
        assert cache_service.metrics['hits'] == 1
        mock_redis.get.assert_called_once()
    
    def test_get_cache_value_miss(self, cache_service, mock_redis):
        """Test de obtención de valor inexistente (cache miss)"""
        mock_redis.get.return_value = None
        
        result = cache_service.get(
            namespace="user",
            identifier="999",
            default={"empty": True}
        )
        
        assert result == {"empty": True}
        assert cache_service.metrics['misses'] == 1
    
    def test_delete_cache_value(self, cache_service, mock_redis):
        """Test de eliminación de valor del caché"""
        mock_redis.delete.return_value = 1
        
        result = cache_service.delete(
            namespace="user",
            identifier="123"
        )
        
        assert result is True
        assert cache_service.metrics['deletes'] == 1
        mock_redis.delete.assert_called_once()
    
    def test_exists_cache_value(self, cache_service, mock_redis):
        """Test de verificación de existencia"""
        mock_redis.exists.return_value = 1
        
        result = cache_service.exists(
            namespace="user",
            identifier="123"
        )
        
        assert result is True
        mock_redis.exists.assert_called_once()


class TestCachePriorities:
    """Tests de prioridades de caché"""
    
    def test_critical_priority_ttl(self, cache_service, mock_redis):
        """Test de TTL para prioridad crítica"""
        mock_redis.setex.return_value = True
        
        cache_service.set(
            namespace="system",
            identifier="config",
            value={"key": "value"},
            priority=CachePriority.CRITICAL
        )
        
        # Verificar que se llamó con TTL correcto
        call_args = mock_redis.setex.call_args
        assert call_args[0][1] == 86400  # 24 horas
    
    def test_temporary_priority_ttl(self, cache_service, mock_redis):
        """Test de TTL para prioridad temporal"""
        mock_redis.setex.return_value = True
        
        cache_service.set(
            namespace="session",
            identifier="temp_data",
            value={"data": "temporary"},
            priority=CachePriority.TEMPORARY
        )
        
        call_args = mock_redis.setex.call_args
        assert call_args[0][1] == 900  # 15 minutos
    
    def test_custom_ttl(self, cache_service, mock_redis):
        """Test de TTL personalizado"""
        mock_redis.setex.return_value = True
        custom_ttl = 5000
        
        cache_service.set(
            namespace="custom",
            identifier="data",
            value={"custom": True},
            ttl=custom_ttl
        )
        
        call_args = mock_redis.setex.call_args
        assert call_args[0][1] == custom_ttl


class TestAdvancedFeatures:
    """Tests de características avanzadas"""
    
    def test_get_ttl(self, cache_service, mock_redis):
        """Test de obtención de TTL restante"""
        mock_redis.ttl.return_value = 3600
        
        ttl = cache_service.get_ttl(
            namespace="user",
            identifier="123"
        )
        
        assert ttl == 3600
        mock_redis.ttl.assert_called_once()
    
    def test_extend_ttl(self, cache_service, mock_redis):
        """Test de extensión de TTL"""
        mock_redis.ttl.return_value = 1000
        mock_redis.expire.return_value = True
        
        result = cache_service.extend_ttl(
            namespace="user",
            identifier="123",
            additional_seconds=500
        )
        
        assert result is True
        mock_redis.expire.assert_called_once()
        call_args = mock_redis.expire.call_args
        assert call_args[0][1] == 1500  # 1000 + 500
    
    def test_delete_pattern(self, cache_service, mock_redis):
        """Test de eliminación por patrón"""
        mock_redis.keys.return_value = ['user:1', 'user:2', 'user:3']
        mock_redis.delete.return_value = 3
        
        count = cache_service.delete_pattern("user:*")
        
        assert count == 3
        mock_redis.keys.assert_called_once_with("user:*")
        mock_redis.delete.assert_called_once()
    
    def test_invalidate_user_cache(self, cache_service, mock_redis):
        """Test de invalidación de caché de usuario"""
        mock_redis.keys.return_value = []
        mock_redis.delete.return_value = 0
        
        count = cache_service.invalidate_user_cache("user_123")
        
        # Debe intentar eliminar múltiples patrones
        assert mock_redis.keys.call_count == 4  # 4 patrones diferentes


class TestCacheWarming:
    """Tests de cache warming"""
    
    def test_warm_cache_success(self, cache_service, mock_redis):
        """Test de precarga exitosa de caché"""
        mock_redis.setex.return_value = True
        
        def data_loader(identifier):
            return {"id": identifier, "data": f"Data for {identifier}"}
        
        identifiers = ["1", "2", "3", "4", "5"]
        
        count = cache_service.warm_cache(
            data_loader=data_loader,
            namespace="products",
            identifiers=identifiers,
            priority=CachePriority.HIGH
        )
        
        assert count == 5
        assert mock_redis.setex.call_count == 5
    
    def test_warm_cache_with_failures(self, cache_service, mock_redis):
        """Test de precarga con algunos fallos"""
        mock_redis.setex.return_value = True
        
        def data_loader(identifier):
            if identifier == "3":
                return None  # Simular fallo
            return {"id": identifier}
        
        identifiers = ["1", "2", "3", "4", "5"]
        
        count = cache_service.warm_cache(
            data_loader=data_loader,
            namespace="products",
            identifiers=identifiers
        )
        
        assert count == 4  # 5 - 1 fallo


class TestMetrics:
    """Tests de métricas"""
    
    def test_get_metrics(self, cache_service, mock_redis):
        """Test de obtención de métricas"""
        # Simular algunas operaciones
        cache_service.metrics['hits'] = 80
        cache_service.metrics['misses'] = 20
        cache_service.metrics['sets'] = 50
        
        mock_redis.info.return_value = {
            'used_memory_human': '10.5M',
            'connected_clients': 5,
            'keyspace_hits': 1000,
            'keyspace_misses': 100
        }
        
        metrics = cache_service.get_metrics()
        
        assert metrics['hits'] == 80
        assert metrics['misses'] == 20
        assert metrics['total_requests'] == 100
        assert metrics['hit_rate_percentage'] == 80.0
        assert 'redis_info' in metrics
    
    def test_reset_metrics(self, cache_service):
        """Test de reseteo de métricas"""
        cache_service.metrics['hits'] = 100
        cache_service.metrics['misses'] = 50
        
        cache_service.reset_metrics()
        
        assert cache_service.metrics['hits'] == 0
        assert cache_service.metrics['misses'] == 0
        assert cache_service.metrics['sets'] == 0
    
    def test_hit_rate_calculation(self, cache_service, mock_redis):
        """Test de cálculo de tasa de hits"""
        cache_service.metrics['hits'] = 75
        cache_service.metrics['misses'] = 25
        
        mock_redis.info.return_value = {}
        
        metrics = cache_service.get_metrics()
        
        assert metrics['hit_rate_percentage'] == 75.0


class TestDecorator:
    """Tests del decorador de caché"""
    
    def test_cached_decorator(self, cache_service, mock_redis):
        """Test del decorador @cached"""
        mock_redis.get.return_value = None  # Cache miss
        mock_redis.setex.return_value = True
        
        @cache_service.cached('users', CachePriority.HIGH)
        def get_user(user_id):
            return {"id": user_id, "name": "Test User"}
        
        # Primera llamada: cache miss, ejecuta función
        result1 = get_user("123")
        assert result1["name"] == "Test User"
        
        # Simular cache hit en segunda llamada
        mock_redis.get.return_value = '{"id": "123", "name": "Test User"}'
        result2 = get_user("123")
        assert result2["name"] == "Test User"


class TestErrorHandling:
    """Tests de manejo de errores"""
    
    def test_get_with_redis_error(self, cache_service, mock_redis):
        """Test de manejo de error en GET"""
        mock_redis.get.side_effect = Exception("Redis error")
        
        result = cache_service.get(
            namespace="user",
            identifier="123",
            default={"error": True}
        )
        
        assert result == {"error": True}
        assert cache_service.metrics['errors'] == 1
    
    def test_set_with_redis_error(self, cache_service, mock_redis):
        """Test de manejo de error en SET"""
        mock_redis.setex.side_effect = Exception("Redis error")
        
        result = cache_service.set(
            namespace="user",
            identifier="123",
            value={"name": "Test"}
        )
        
        assert result is False
        assert cache_service.metrics['errors'] == 1
    
    def test_delete_with_redis_error(self, cache_service, mock_redis):
        """Test de manejo de error en DELETE"""
        mock_redis.delete.side_effect = Exception("Redis error")
        
        result = cache_service.delete(
            namespace="user",
            identifier="123"
        )
        
        assert result is False
        assert cache_service.metrics['errors'] == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
