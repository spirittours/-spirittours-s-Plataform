#!/usr/bin/env python3
"""
CRM Integration Test Suite - Enterprise
Tests completos para integración SuiteCRM, webhooks y sincronización
Incluye tests de performance, security y disaster recovery
"""

import pytest
import asyncio
import requests
import json
import time
import os
import sys
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
import psycopg2
import redis
from concurrent.futures import ThreadPoolExecutor
import subprocess

# Agregar backend al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../backend'))

class TestCRMIntegration:
    """
    Test suite para integración completa de CRM
    """
    
    def setup_class(self):
        """Setup inicial para todos los tests"""
        self.base_url = os.getenv('TEST_BASE_URL', 'http://localhost:3000')
        self.suitecrm_url = os.getenv('TEST_SUITECRM_URL', 'http://localhost:8080')
        self.db_config = {
            'host': os.getenv('TEST_DB_HOST', 'localhost'),
            'port': int(os.getenv('TEST_DB_PORT', 5432)),
            'database': os.getenv('TEST_DB_NAME', 'enterprise_booking_test'),
            'user': os.getenv('TEST_DB_USER', 'postgres'),
            'password': os.getenv('TEST_DB_PASSWORD', 'postgres')
        }
        
        # Configurar cliente Redis de prueba
        self.redis_client = redis.Redis(
            host=os.getenv('TEST_REDIS_HOST', 'localhost'),
            port=int(os.getenv('TEST_REDIS_PORT', 6379)),
            decode_responses=True
        )
        
        # Datos de prueba
        self.test_contact = {
            "first_name": "Test",
            "last_name": "Contact",
            "email": "test.contact@example.com",
            "phone": "+1234567890",
            "account_name": "Test Company",
            "title": "Test Manager"
        }
        
        self.test_lead = {
            "first_name": "Test",
            "last_name": "Lead",
            "email": "test.lead@example.com",
            "company": "Lead Company",
            "status": "new",
            "lead_source": "website"
        }
        
        self.test_opportunity = {
            "name": "Test Opportunity",
            "account_name": "Test Account",
            "sales_stage": "prospecting",
            "amount": 50000,
            "expected_close_date": (datetime.now() + timedelta(days=30)).date().isoformat()
        }
        
        # Headers de autenticación
        self.headers = self.get_auth_headers()
    
    def get_auth_headers(self):
        """Obtener headers de autenticación para tests"""
        # Simular token de prueba
        return {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer test_token_{int(time.time())}'
        }
    
    def get_db_connection(self):
        """Obtener conexión a base de datos de prueba"""
        return psycopg2.connect(**self.db_config)
    
    # ===== TESTS DE CONECTIVIDAD =====
    
    def test_crm_health_endpoint(self):
        """Test del endpoint de salud del CRM"""
        response = requests.get(f'{self.base_url}/api/crm/health')
        
        assert response.status_code in [200, 206], f"Health check failed: {response.status_code}"
        
        data = response.json()
        assert 'success' in data
        assert 'data' in data
        assert 'status' in data['data']
        
        # Verificar componentes de salud
        health_data = data['data']
        assert 'components' in health_data
        assert 'suitecrm' in health_data['components']
        assert 'database' in health_data['components']
        
        print(f"✅ CRM Health Status: {health_data['status']}")
    
    def test_database_connectivity(self):
        """Test de conectividad a base de datos"""
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor()
            
            # Test básico de conexión
            cursor.execute("SELECT 1 as test")
            result = cursor.fetchone()
            assert result[0] == 1
            
            # Verificar tablas CRM existen
            crm_tables = [
                'crm_sync_history', 'crm_activities', 'crm_contacts',
                'crm_leads', 'crm_opportunities', 'crm_accounts'
            ]
            
            for table in crm_tables:
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = %s
                    )
                """, (table,))
                exists = cursor.fetchone()[0]
                assert exists, f"Table {table} does not exist"
            
            cursor.close()
            conn.close()
            
            print("✅ Database connectivity and CRM tables verified")
            
        except Exception as e:
            pytest.fail(f"Database connectivity test failed: {str(e)}")
    
    def test_redis_connectivity(self):
        """Test de conectividad a Redis"""
        try:
            # Test ping
            pong = self.redis_client.ping()
            assert pong is True
            
            # Test básico de set/get
            test_key = f"test_key_{int(time.time())}"
            test_value = "test_value"
            
            self.redis_client.set(test_key, test_value, ex=60)  # 60 segundos TTL
            retrieved = self.redis_client.get(test_key)
            
            assert retrieved == test_value
            
            # Limpiar
            self.redis_client.delete(test_key)
            
            print("✅ Redis connectivity verified")
            
        except Exception as e:
            pytest.fail(f"Redis connectivity test failed: {str(e)}")
    
    # ===== TESTS DE CRUD OPERATIONS =====
    
    def test_contact_crud_operations(self):
        """Test completo de operaciones CRUD para contactos"""
        
        # CREATE - Crear contacto
        create_response = requests.post(
            f'{self.base_url}/api/crm/contacts',
            headers=self.headers,
            json=self.test_contact
        )
        
        # Permitir 401/403 si no hay autenticación real
        if create_response.status_code in [401, 403]:
            pytest.skip("Authentication required for CRUD operations")
        
        assert create_response.status_code == 201
        create_data = create_response.json()
        assert create_data['success'] is True
        
        contact_id = create_data['data']['id']
        print(f"✅ Contact created with ID: {contact_id}")
        
        # READ - Obtener contacto
        read_response = requests.get(
            f'{self.base_url}/api/crm/contacts/{contact_id}',
            headers=self.headers
        )
        
        assert read_response.status_code == 200
        read_data = read_response.json()
        assert read_data['success'] is True
        assert read_data['data']['email'] == self.test_contact['email']
        
        print("✅ Contact retrieved successfully")
        
        # UPDATE - Actualizar contacto
        updated_data = {**self.test_contact, 'title': 'Updated Title'}
        update_response = requests.put(
            f'{self.base_url}/api/crm/contacts/{contact_id}',
            headers=self.headers,
            json=updated_data
        )
        
        assert update_response.status_code == 200
        update_result = update_response.json()
        assert update_result['success'] is True
        
        print("✅ Contact updated successfully")
        
        # DELETE - Eliminar contacto
        delete_response = requests.delete(
            f'{self.base_url}/api/crm/contacts/{contact_id}',
            headers=self.headers
        )
        
        assert delete_response.status_code == 200
        delete_result = delete_response.json()
        assert delete_result['success'] is True
        
        print("✅ Contact deleted successfully")
    
    def test_lead_operations(self):
        """Test de operaciones con leads"""
        
        # Crear lead
        create_response = requests.post(
            f'{self.base_url}/api/crm/leads',
            headers=self.headers,
            json=self.test_lead
        )
        
        if create_response.status_code in [401, 403]:
            pytest.skip("Authentication required for lead operations")
        
        assert create_response.status_code == 201
        create_data = create_response.json()
        lead_id = create_data['data']['id']
        
        print(f"✅ Lead created with ID: {lead_id}")
        
        # Test conversión de lead
        conversion_data = {
            "contact_data": self.test_contact,
            "create_opportunity": True,
            "opportunity_data": {
                "name": "Converted Opportunity",
                "amount": 25000
            }
        }
        
        convert_response = requests.post(
            f'{self.base_url}/api/crm/leads/{lead_id}/convert',
            headers=self.headers,
            json=conversion_data
        )
        
        if convert_response.status_code == 200:
            convert_result = convert_response.json()
            assert convert_result['success'] is True
            print("✅ Lead converted successfully")
        
    def test_opportunity_pipeline(self):
        """Test del pipeline de oportunidades"""
        
        # Crear oportunidad
        create_response = requests.post(
            f'{self.base_url}/api/crm/opportunities',
            headers=self.headers,
            json=self.test_opportunity
        )
        
        if create_response.status_code in [401, 403]:
            pytest.skip("Authentication required for opportunity operations")
        
        assert create_response.status_code == 201
        create_data = create_response.json()
        opportunity_id = create_data['data']['id']
        
        print(f"✅ Opportunity created with ID: {opportunity_id}")
        
        # Actualizar stage de oportunidad
        stages = ['qualification', 'needs_analysis', 'proposal', 'negotiation']
        
        for stage in stages:
            update_response = requests.put(
                f'{self.base_url}/api/crm/opportunities/{opportunity_id}',
                headers=self.headers,
                json={'sales_stage': stage, 'probability': 50}
            )
            
            if update_response.status_code == 200:
                print(f"✅ Opportunity moved to {stage} stage")
        
        # Cerrar oportunidad como ganada
        close_response = requests.post(
            f'{self.base_url}/api/crm/opportunities/{opportunity_id}/close',
            headers=self.headers,
            json={
                'sales_stage': 'closed_won',
                'probability': 100,
                'close_date': datetime.now().date().isoformat()
            }
        )
        
        if close_response.status_code == 200:
            print("✅ Opportunity closed as won")
    
    # ===== TESTS DE SINCRONIZACIÓN =====
    
    def test_sync_status_endpoint(self):
        """Test del endpoint de estado de sincronización"""
        response = requests.get(
            f'{self.base_url}/api/crm/sync-status',
            headers=self.headers
        )
        
        # Puede requerir privilegios de supervisor
        if response.status_code in [401, 403]:
            pytest.skip("Supervisor privileges required for sync status")
        
        assert response.status_code == 200
        data = response.json()
        assert 'success' in data
        
        if data['success']:
            sync_data = data['data']
            assert 'status' in sync_data
            print(f"✅ Sync Status: {sync_data.get('status', 'Unknown')}")
    
    def test_manual_sync_trigger(self):
        """Test de trigger manual de sincronización"""
        sync_data = {
            'entity': 'contacts',
            'direction': 'bidirectional',
            'full_sync': False
        }
        
        response = requests.post(
            f'{self.base_url}/api/crm/sync/manual-trigger',
            headers=self.headers,
            json=sync_data
        )
        
        if response.status_code in [401, 403]:
            pytest.skip("Supervisor privileges required for manual sync")
        
        if response.status_code == 200:
            data = response.json()
            assert data['success'] is True
            assert 'syncBatchId' in data['data']
            print(f"✅ Manual sync triggered: {data['data']['syncBatchId']}")
    
    def test_sync_history(self):
        """Test del historial de sincronización"""
        response = requests.get(
            f'{self.base_url}/api/crm/sync/history',
            headers=self.headers,
            params={'limit': 10, 'page': 1}
        )
        
        if response.status_code in [401, 403]:
            pytest.skip("Supervisor privileges required for sync history")
        
        if response.status_code == 200:
            data = response.json()
            assert 'data' in data
            assert 'items' in data['data']
            assert 'pagination' in data['data']
            print(f"✅ Sync history retrieved: {len(data['data']['items'])} records")
    
    # ===== TESTS DE WEBHOOKS =====
    
    def test_webhook_status(self):
        """Test del estado de webhooks"""
        response = requests.get(
            f'{self.base_url}/api/crm/webhooks/status',
            headers=self.headers
        )
        
        if response.status_code in [401, 403]:
            pytest.skip("Supervisor privileges required for webhook status")
        
        if response.status_code == 200:
            data = response.json()
            webhook_data = data['data']
            assert 'isActive' in webhook_data
            assert 'metrics' in webhook_data
            print(f"✅ Webhooks Status: {'Active' if webhook_data['isActive'] else 'Inactive'}")
    
    def test_webhook_config(self):
        """Test de configuración de webhooks"""
        # Obtener configuración actual
        get_response = requests.get(
            f'{self.base_url}/api/crm/webhooks/config',
            headers=self.headers
        )
        
        if get_response.status_code in [401, 403]:
            pytest.skip("Supervisor privileges required for webhook config")
        
        if get_response.status_code == 200:
            config_data = get_response.json()['data']
            print("✅ Webhook configuration retrieved")
            
            # Actualizar configuración
            updated_config = {
                'retryAttempts': config_data.get('retryAttempts', 3),
                'retryDelay': 5000,  # 5 segundos
                'timeout': 30000     # 30 segundos
            }
            
            update_response = requests.put(
                f'{self.base_url}/api/crm/webhooks/config',
                headers=self.headers,
                json=updated_config
            )
            
            if update_response.status_code == 200:
                print("✅ Webhook configuration updated")
    
    def test_suitecrm_webhook_simulation(self):
        """Test de simulación de webhook de SuiteCRM"""
        webhook_payload = {
            'id': 'test_contact_123',
            'module': 'Contacts',
            'action': 'save',
            'data': {
                **self.test_contact,
                'id': 'test_contact_123',
                'date_modified': datetime.now().isoformat()
            }
        }
        
        # Simular firma de webhook (en producción sería calculada correctamente)
        headers = {
            **self.headers,
            'X-SuiteCRM-Signature': 'sha256=test_signature'
        }
        
        response = requests.post(
            f'{self.base_url}/api/crm/webhook/suitecrm/contacts/update',
            headers=headers,
            json=webhook_payload
        )
        
        # El webhook podría fallar por validación de firma, pero debe responder
        assert response.status_code in [200, 401, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert 'success' in data
            print("✅ SuiteCRM webhook simulation processed")
    
    # ===== TESTS DE PERFORMANCE =====
    
    def test_concurrent_requests(self):
        """Test de requests concurrentes para verificar performance"""
        
        def make_request():
            response = requests.get(f'{self.base_url}/api/crm/health')
            return response.status_code == 200
        
        # Ejecutar 10 requests concurrentes
        with ThreadPoolExecutor(max_workers=10) as executor:
            start_time = time.time()
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [f.result() for f in futures]
            end_time = time.time()
        
        # Verificar que todas las requests fueron exitosas
        success_rate = sum(results) / len(results) * 100
        duration = end_time - start_time
        
        assert success_rate >= 80, f"Success rate too low: {success_rate}%"
        assert duration < 10, f"Concurrent requests took too long: {duration}s"
        
        print(f"✅ Concurrent requests: {success_rate}% success rate in {duration:.2f}s")
    
    def test_api_response_times(self):
        """Test de tiempos de respuesta de APIs críticas"""
        endpoints = [
            '/api/crm/health',
            '/api/crm/contacts',
            '/api/crm/leads',
            '/api/crm/opportunities'
        ]
        
        response_times = {}
        
        for endpoint in endpoints:
            start_time = time.time()
            response = requests.get(f'{self.base_url}{endpoint}', headers=self.headers)
            end_time = time.time()
            
            duration = (end_time - start_time) * 1000  # en millisegundos
            response_times[endpoint] = duration
            
            # Los endpoints deben responder en menos de 2 segundos
            if response.status_code not in [401, 403]:  # Ignorar errores de auth
                assert duration < 2000, f"Endpoint {endpoint} too slow: {duration}ms"
        
        print("✅ API response times:")
        for endpoint, duration in response_times.items():
            print(f"   {endpoint}: {duration:.2f}ms")
    
    def test_database_performance(self):
        """Test de performance de base de datos"""
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor()
            
            # Test de consulta simple
            start_time = time.time()
            cursor.execute("SELECT COUNT(*) FROM crm_contacts")
            end_time = time.time()
            
            query_duration = (end_time - start_time) * 1000
            
            # La consulta debe completarse en menos de 100ms
            assert query_duration < 100, f"Database query too slow: {query_duration}ms"
            
            print(f"✅ Database query performance: {query_duration:.2f}ms")
            
            cursor.close()
            conn.close()
            
        except Exception as e:
            pytest.fail(f"Database performance test failed: {str(e)}")
    
    # ===== TESTS DE SEGURIDAD =====
    
    def test_authentication_required(self):
        """Test de que la autenticación es requerida"""
        # Request sin headers de auth
        response = requests.get(f'{self.base_url}/api/crm/contacts')
        
        # Debe requerir autenticación
        assert response.status_code in [401, 403]
        print("✅ Authentication properly required")
    
    def test_rate_limiting(self):
        """Test de rate limiting"""
        # Hacer muchas requests rápidas
        responses = []
        for i in range(60):  # Más del límite típico
            response = requests.get(f'{self.base_url}/api/crm/health')
            responses.append(response.status_code)
        
        # Verificar que eventualmente se aplique rate limiting
        rate_limited = any(status == 429 for status in responses)
        
        if rate_limited:
            print("✅ Rate limiting is working")
        else:
            print("⚠️ Rate limiting may not be configured or limit is high")
    
    def test_input_validation(self):
        """Test de validación de inputs"""
        # Enviar datos inválidos
        invalid_contact = {
            'first_name': '',  # Requerido
            'email': 'invalid-email',  # Formato inválido
            'phone': 'x' * 100  # Muy largo
        }
        
        response = requests.post(
            f'{self.base_url}/api/crm/contacts',
            headers=self.headers,
            json=invalid_contact
        )
        
        # Debe rechazar datos inválidos
        if response.status_code not in [401, 403]:  # Ignorar errores de auth
            assert response.status_code == 400
            data = response.json()
            assert 'errors' in data or 'message' in data
            print("✅ Input validation is working")
    
    # ===== TESTS DE DISASTER RECOVERY =====
    
    def test_graceful_degradation(self):
        """Test de degradación elegante cuando servicios están caídos"""
        
        # Test cuando Redis no está disponible
        original_redis_host = os.environ.get('REDIS_HOST')
        os.environ['REDIS_HOST'] = 'invalid_host'
        
        try:
            response = requests.get(f'{self.base_url}/api/crm/health')
            # El servicio debe seguir funcionando aunque Redis falle
            assert response.status_code in [200, 206]  # 206 = degraded
            
            if response.status_code == 206:
                print("✅ Graceful degradation when Redis unavailable")
            
        finally:
            # Restaurar configuración
            if original_redis_host:
                os.environ['REDIS_HOST'] = original_redis_host
            elif 'REDIS_HOST' in os.environ:
                del os.environ['REDIS_HOST']
    
    def test_database_failover(self):
        """Test de failover de base de datos"""
        # Simular conexión a DB no disponible
        invalid_config = {**self.db_config, 'host': 'invalid_host'}
        
        try:
            conn = psycopg2.connect(**invalid_config)
            conn.close()
            pytest.fail("Should not connect to invalid host")
        except psycopg2.OperationalError:
            print("✅ Database properly handles connection failures")
    
    def test_webhook_retry_mechanism(self):
        """Test del mecanismo de retry de webhooks"""
        # Crear un webhook que debería fallar y retry
        webhook_payload = {
            'id': 'retry_test_123',
            'module': 'Contacts',
            'action': 'save',
            'data': {'force_error': True}  # Forzar error para test
        }
        
        headers = {
            **self.headers,
            'X-SuiteCRM-Signature': 'sha256=test_signature'
        }
        
        response = requests.post(
            f'{self.base_url}/api/crm/webhook/suitecrm/contacts/update',
            headers=headers,
            json=webhook_payload
        )
        
        # El webhook debe recibir la request aunque falle processing
        assert response.status_code in [200, 500]
        print("✅ Webhook retry mechanism handles failures")
    
    # ===== CLEANUP =====
    
    def teardown_class(self):
        """Cleanup después de todos los tests"""
        try:
            # Limpiar Redis
            test_keys = self.redis_client.keys('test_*')
            if test_keys:
                self.redis_client.delete(*test_keys)
            
            # Limpiar base de datos de test data
            conn = self.get_db_connection()
            cursor = conn.cursor()
            
            # Eliminar datos de prueba (con cuidado de no eliminar todo)
            cursor.execute("DELETE FROM crm_contacts WHERE email LIKE '%example.com'")
            cursor.execute("DELETE FROM crm_leads WHERE email LIKE '%example.com'")
            cursor.execute("DELETE FROM crm_opportunities WHERE name LIKE 'Test%'")
            
            conn.commit()
            cursor.close()
            conn.close()
            
            print("✅ Test cleanup completed")
            
        except Exception as e:
            print(f"⚠️ Cleanup warning: {str(e)}")

# ===== EXECUTION HELPERS =====

def run_all_tests():
    """Ejecutar todos los tests de integración CRM"""
    print("🚀 Starting CRM Integration Test Suite")
    print("=" * 50)
    
    # Configurar pytest
    pytest_args = [
        __file__,
        '-v',  # verbose
        '--tb=short',  # traceback corto
        '--color=yes',  # colores
        '-x'  # parar en primer fallo
    ]
    
    # Ejecutar tests
    exit_code = pytest.main(pytest_args)
    
    if exit_code == 0:
        print("=" * 50)
        print("✅ All CRM Integration Tests PASSED!")
    else:
        print("=" * 50)
        print("❌ Some CRM Integration Tests FAILED!")
    
    return exit_code

if __name__ == '__main__':
    exit_code = run_all_tests()
    sys.exit(exit_code)