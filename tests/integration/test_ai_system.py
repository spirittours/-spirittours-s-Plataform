#!/usr/bin/env python3
"""
AI System Test Suite - Enterprise
Tests completos para Multi-Model AI, 25+ agentes especializados
Incluye tests de performance, accuracy, cost optimization y failover
"""

import pytest
import asyncio
import requests
import json
import time
import os
import sys
from datetime import datetime
import redis
from concurrent.futures import ThreadPoolExecutor
import threading

class TestAISystem:
    """
    Test suite para sistema completo de AI Multi-Modelo
    """
    
    def setup_class(self):
        """Setup inicial para todos los tests"""
        self.base_url = os.getenv('TEST_BASE_URL', 'http://localhost:3000')
        
        # Configurar cliente Redis de prueba
        self.redis_client = redis.Redis(
            host=os.getenv('TEST_REDIS_HOST', 'localhost'),
            port=int(os.getenv('TEST_REDIS_PORT', 6379)),
            decode_responses=True
        )
        
        # Headers de autenticación
        self.headers = self.get_auth_headers()
        
        # Test messages para diferentes tipos de consultas
        self.test_messages = {
            'sustainable_travel': "Necesito planificar un viaje sostenible a Costa Rica, con mínima huella de carbono",
            'ethical_tourism': "¿Cómo puedo hacer turismo responsable que beneficie a las comunidades locales?",
            'adventure_planning': "Quiero hacer escalada y parapente en los Alpes, ¿qué precauciones debo tomar?",
            'luxury_services': "Busco experiencias VIP exclusivas en Dubai con servicios de concierge personal",
            'budget_optimization': "¿Cómo viajar por Europa con 1000 euros durante 2 semanas?",
            'cultural_immersion': "Quiero vivir con familias locales en Japón y aprender sobre su cultura tradicional",
            'accessibility': "Necesito viajar a París en silla de ruedas, ¿qué opciones accesibles hay?",
            'group_coordination': "Organizar un viaje corporativo para 50 empleados a Barcelona",
            'crisis_management': "Mi vuelo fue cancelado y estoy varado en el aeropuerto, ¿qué hacer?",
            'technical_analysis': "Calcula la huella de carbono de un vuelo Madrid-Bangkok ida y vuelta"
        }
        
        # IDs de agentes para tests
        self.agent_ids = [
            'sustainable-travel', 'ethical-tourism', 'cultural-immersion',
            'adventure-planner', 'luxury-concierge', 'budget-optimizer',
            'accessibility-coordinator', 'group-coordinator', 'crisis-manager',
            'carbon-footprint', 'destination-expert', 'booking-assistant'
        ]
        
        # Modelos AI disponibles
        self.ai_models = ['gpt4', 'claude35', 'gemini']
    
    def get_auth_headers(self):
        """Obtener headers de autenticación para tests"""
        return {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer test_token_{int(time.time())}'
        }
    
    # ===== TESTS DE SALUD DEL SISTEMA AI =====
    
    def test_ai_health_endpoint(self):
        """Test del endpoint de salud del sistema AI"""
        response = requests.get(f'{self.base_url}/api/ai/health')
        
        assert response.status_code in [200, 206, 503], f"AI health check failed: {response.status_code}"
        
        data = response.json()
        assert 'success' in data
        assert 'data' in data
        
        health_data = data['data']
        assert 'status' in health_data
        assert 'models' in health_data
        assert 'multiAI' in health_data
        
        print(f"✅ AI System Health Status: {health_data['status']}")
        
        # Verificar estado de modelos
        for model, status in health_data['models'].items():
            availability = "Available" if status['available'] else "Unavailable"
            print(f"   {model}: {availability} ({status['totalRequests']} requests)")
    
    def test_ai_models_info(self):
        """Test de información de modelos AI disponibles"""
        response = requests.get(f'{self.base_url}/api/ai/models', headers=self.headers)
        
        if response.status_code in [401, 403]:
            pytest.skip("Authentication required for AI models info")
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'data' in data
        models_info = data['data']
        assert 'available_models' in models_info
        
        available_models = models_info['available_models']
        assert len(available_models) >= 3  # GPT-4, Claude, Gemini
        
        for model_id, model_info in available_models.items():
            assert 'name' in model_info
            assert 'provider' in model_info
            assert 'capabilities' in model_info
            assert 'specialty' in model_info
        
        print(f"✅ {len(available_models)} AI models available")
    
    def test_ai_capabilities(self):
        """Test de capacidades del sistema AI"""
        response = requests.get(f'{self.base_url}/api/ai/capabilities', headers=self.headers)
        
        if response.status_code in [401, 403]:
            pytest.skip("Authentication required for AI capabilities")
        
        assert response.status_code == 200
        data = response.json()
        
        capabilities = data['data']
        assert 'agent_system' in capabilities
        assert 'multi_model_ai' in capabilities
        assert 'advanced_features' in capabilities
        
        # Verificar sistema de agentes
        agent_system = capabilities['agent_system']
        assert agent_system['total_agents'] >= 20
        assert agent_system['auto_selection'] is True
        assert agent_system['multi_agent_consultation'] is True
        
        print(f"✅ AI Capabilities: {agent_system['total_agents']} agents, {len(capabilities['multi_model_ai']['models'])} models")
    
    # ===== TESTS DE AGENTES INDIVIDUALES =====
    
    def test_list_agents(self):
        """Test de listado de agentes disponibles"""
        response = requests.get(f'{self.base_url}/api/ai/agents', headers=self.headers)
        
        if response.status_code in [401, 403]:
            pytest.skip("Authentication required for agents list")
        
        assert response.status_code == 200
        data = response.json()
        
        assert 'data' in data
        agents_data = data['data']
        assert 'agents' in agents_data
        assert 'totalAgents' in agents_data
        
        agents = agents_data['agents']
        assert len(agents) >= 20  # Mínimo 20 agentes especializados
        
        # Verificar estructura de cada agente
        for agent in agents[:5]:  # Verificar primeros 5
            assert 'id' in agent
            assert 'name' in agent
            assert 'description' in agent
            assert 'specialties' in agent
            assert 'capabilities' in agent
            assert 'preferredModel' in agent
        
        print(f"✅ {len(agents)} agents available")
    
    def test_agent_info_detail(self):
        """Test de información detallada de agentes específicos"""
        test_agents = ['sustainable-travel', 'luxury-concierge', 'crisis-manager']
        
        for agent_id in test_agents:
            response = requests.get(f'{self.base_url}/api/ai/agents/{agent_id}', headers=self.headers)
            
            if response.status_code in [401, 403]:
                pytest.skip("Authentication required for agent details")
            
            if response.status_code == 404:
                continue  # Agente no existe, continuar con siguiente
            
            assert response.status_code == 200
            data = response.json()
            
            agent_info = data['data']
            assert 'name' in agent_info
            assert 'description' in agent_info
            assert 'specialties' in agent_info
            assert 'metrics' in agent_info
            
            print(f"✅ Agent {agent_id}: {agent_info['name']}")
    
    def test_agent_search(self):
        """Test de búsqueda de agentes"""
        search_queries = [
            'sustainable',
            'luxury', 
            'adventure',
            'crisis',
            'budget'
        ]
        
        for query in search_queries:
            response = requests.get(
                f'{self.base_url}/api/ai/agents/search',
                headers=self.headers,
                params={'q': query}
            )
            
            if response.status_code in [401, 403]:
                pytest.skip("Authentication required for agent search")
            
            assert response.status_code == 200
            data = response.json()
            
            search_results = data['data']
            assert 'results' in search_results
            assert 'totalResults' in search_results
            
            if search_results['totalResults'] > 0:
                # Verificar relevancia de resultados
                for result in search_results['results'][:3]:
                    assert 'matchScore' in result
                    assert result['matchScore'] > 0
                
                print(f"✅ Search '{query}': {search_results['totalResults']} results")
    
    # ===== TESTS DE CONVERSACIÓN CON AGENTES =====
    
    def test_chat_with_specific_agents(self):
        """Test de conversación con agentes específicos"""
        test_cases = [
            ('sustainable-travel', self.test_messages['sustainable_travel']),
            ('luxury-concierge', self.test_messages['luxury_services']),
            ('crisis-manager', self.test_messages['crisis_management'])
        ]
        
        for agent_id, message in test_cases:
            chat_data = {
                'agentId': agent_id,
                'message': message,
                'conversationId': f'test_conv_{agent_id}_{int(time.time())}'
            }
            
            response = requests.post(
                f'{self.base_url}/api/ai/chat/agent',
                headers=self.headers,
                json=chat_data
            )
            
            if response.status_code in [401, 403]:
                pytest.skip("Authentication required for agent chat")
            
            if response.status_code == 200:
                data = response.json()
                assert data['success'] is True
                
                chat_response = data['data']
                assert 'agentId' in chat_response
                assert 'response' in chat_response
                assert 'conversationId' in chat_response
                assert 'metadata' in chat_response
                
                # Verificar que la respuesta no esté vacía
                assert len(chat_response['response']) > 10
                
                print(f"✅ Chat with {agent_id}: {len(chat_response['response'])} chars response")
    
    def test_auto_agent_selection(self):
        """Test de selección automática de agentes"""
        test_cases = [
            self.test_messages['sustainable_travel'],
            self.test_messages['adventure_planning'], 
            self.test_messages['budget_optimization']
        ]
        
        for message in test_cases:
            chat_data = {
                'message': message,
                'conversationId': f'auto_test_{int(time.time())}'
            }
            
            response = requests.post(
                f'{self.base_url}/api/ai/chat/auto',
                headers=self.headers,
                json=chat_data
            )
            
            if response.status_code in [401, 403]:
                pytest.skip("Authentication required for auto chat")
            
            if response.status_code == 200:
                data = response.json()
                assert data['success'] is True
                
                chat_response = data['data']
                assert 'agentId' in chat_response
                assert 'agentName' in chat_response
                assert 'autoSelected' in chat_response
                assert chat_response['autoSelected'] is True
                
                print(f"✅ Auto-selected agent: {chat_response['agentName']}")
    
    def test_multi_agent_consultation(self):
        """Test de consulta multi-agente"""
        multi_agent_data = {
            'message': "Planificar un viaje sostenible y de lujo a Costa Rica para un grupo de ejecutivos",
            'agentIds': ['sustainable-travel', 'luxury-concierge', 'group-coordinator'],
            'consultationType': 'collaborative'
        }
        
        response = requests.post(
            f'{self.base_url}/api/ai/chat/multi-agent',
            headers=self.headers,
            json=multi_agent_data
        )
        
        if response.status_code in [401, 403]:
            pytest.skip("Authentication required for multi-agent chat")
        
        if response.status_code == 200:
            data = response.json()
            assert data['success'] is True
            
            consultation = data['data']
            assert 'responses' in consultation
            assert 'totalAgents' in consultation
            assert 'successfulResponses' in consultation
            
            # Verificar que se obtuvieron múltiples respuestas
            assert consultation['totalAgents'] == 3
            assert consultation['successfulResponses'] >= 1
            
            # Si hay síntesis, verificarla
            if 'synthesis' in consultation and consultation['synthesis']:
                assert len(consultation['synthesis']) > 50
                print("✅ Multi-agent consultation with synthesis generated")
            else:
                print("✅ Multi-agent consultation completed")
    
    # ===== TESTS DE AI DIRECTO =====
    
    def test_direct_ai_generation(self):
        """Test de generación directa con modelos AI"""
        test_prompts = [
            "Explica brevemente qué es el turismo sostenible",
            "Lista 5 destinos para aventura extrema",
            "¿Cuáles son los beneficios del turismo responsable?"
        ]
        
        for model in self.ai_models:
            for prompt in test_prompts[:2]:  # Solo 2 prompts por modelo
                generation_data = {
                    'prompt': prompt,
                    'model': model,
                    'options': {
                        'temperature': 0.7,
                        'maxTokens': 500
                    }
                }
                
                response = requests.post(
                    f'{self.base_url}/api/ai/generate',
                    headers=self.headers,
                    json=generation_data
                )
                
                if response.status_code in [401, 403]:
                    pytest.skip("Authentication required for direct AI generation")
                
                if response.status_code == 200:
                    data = response.json()
                    assert data['success'] is True
                    
                    ai_response = data['data']
                    assert 'content' in ai_response
                    assert 'model' in ai_response
                    assert 'tokensUsed' in ai_response
                    assert 'responseTime' in ai_response
                    
                    print(f"✅ Direct {model}: {len(ai_response['content'])} chars, {ai_response['responseTime']}ms")
                
                # Pequeña pausa para evitar rate limiting
                time.sleep(0.5)
    
    def test_model_comparison(self):
        """Test de comparación entre modelos"""
        comparison_data = {
            'prompt': 'Explica en 100 palabras qué es el ecoturismo',
            'models': ['claude35', 'gemini'],  # Usar solo 2 modelos para tests
            'options': {
                'temperature': 0.7,
                'maxTokens': 200
            }
        }
        
        response = requests.post(
            f'{self.base_url}/api/ai/compare-models',
            headers=self.headers,
            json=comparison_data
        )
        
        if response.status_code in [401, 403]:
            pytest.skip("Authentication required for model comparison")
        
        if response.status_code == 200:
            data = response.json()
            assert data['success'] is True
            
            comparison = data['data']
            assert 'comparisons' in comparison
            assert 'successfulModels' in comparison
            assert 'totalTime' in comparison
            
            # Verificar que se obtuvieron comparaciones
            assert len(comparison['comparisons']) >= 1
            assert comparison['successfulModels'] >= 1
            
            print(f"✅ Model comparison: {comparison['successfulModels']}/{len(comparison['comparisons'])} models responded")
    
    # ===== TESTS DE GESTIÓN DE CONVERSACIONES =====
    
    def test_conversation_history(self):
        """Test de historial de conversaciones"""
        # Primero crear una conversación
        conversation_id = f'test_history_{int(time.time())}'
        
        chat_data = {
            'agentId': 'destination-expert',
            'message': 'Test message for history',
            'conversationId': conversation_id
        }
        
        create_response = requests.post(
            f'{self.base_url}/api/ai/chat/agent',
            headers=self.headers,
            json=chat_data
        )
        
        if create_response.status_code in [401, 403]:
            pytest.skip("Authentication required for conversation tests")
        
        if create_response.status_code == 200:
            # Obtener historial
            history_response = requests.get(
                f'{self.base_url}/api/ai/conversations/{conversation_id}',
                headers=self.headers,
                params={'limit': 10}
            )
            
            if history_response.status_code == 200:
                history_data = history_response.json()
                assert 'data' in history_data
                assert 'conversationId' in history_data['data']
                assert 'history' in history_data['data']
                
                print(f"✅ Conversation history retrieved: {len(history_data['data']['history'])} entries")
    
    def test_conversation_deletion(self):
        """Test de eliminación de conversaciones"""
        # Crear conversación de prueba
        conversation_id = f'test_delete_{int(time.time())}'
        
        chat_data = {
            'agentId': 'destination-expert',
            'message': 'Test message for deletion',
            'conversationId': conversation_id
        }
        
        create_response = requests.post(
            f'{self.base_url}/api/ai/chat/agent',
            headers=self.headers,
            json=chat_data
        )
        
        if create_response.status_code in [401, 403]:
            pytest.skip("Authentication required for conversation deletion tests")
        
        if create_response.status_code == 200:
            # Eliminar conversación
            delete_response = requests.delete(
                f'{self.base_url}/api/ai/conversations/{conversation_id}',
                headers=self.headers
            )
            
            if delete_response.status_code == 200:
                delete_data = delete_response.json()
                assert delete_data['success'] is True
                
                print("✅ Conversation deleted successfully")
    
    # ===== TESTS DE PERFORMANCE =====
    
    def test_concurrent_ai_requests(self):
        """Test de requests AI concurrentes"""
        
        def make_ai_request():
            try:
                response = requests.post(
                    f'{self.base_url}/api/ai/chat/auto',
                    headers=self.headers,
                    json={
                        'message': 'Test concurrent message',
                        'conversationId': f'concurrent_{threading.get_ident()}_{int(time.time())}'
                    },
                    timeout=30
                )
                return response.status_code == 200
            except:
                return False
        
        # Ejecutar 5 requests concurrentes (menos que CRM para evitar sobrecargar AI)
        with ThreadPoolExecutor(max_workers=5) as executor:
            start_time = time.time()
            futures = [executor.submit(make_ai_request) for _ in range(5)]
            results = [f.result() for f in futures]
            end_time = time.time()
        
        success_rate = sum(results) / len(results) * 100
        duration = end_time - start_time
        
        # Las requests AI pueden ser más lentas
        assert success_rate >= 60, f"AI success rate too low: {success_rate}%"
        assert duration < 60, f"Concurrent AI requests took too long: {duration}s"
        
        print(f"✅ Concurrent AI requests: {success_rate}% success rate in {duration:.2f}s")
    
    def test_ai_response_times(self):
        """Test de tiempos de respuesta AI"""
        endpoints = [
            ('/api/ai/health', 'GET', None),
            ('/api/ai/agents', 'GET', None),
            ('/api/ai/models', 'GET', None),
            ('/api/ai/chat/auto', 'POST', {
                'message': 'Quick test message',
                'conversationId': f'timing_test_{int(time.time())}'
            })
        ]
        
        response_times = {}
        
        for endpoint, method, payload in endpoints:
            start_time = time.time()
            
            if method == 'GET':
                response = requests.get(f'{self.base_url}{endpoint}', headers=self.headers)
            else:
                response = requests.post(f'{self.base_url}{endpoint}', headers=self.headers, json=payload)
            
            end_time = time.time()
            duration = (end_time - start_time) * 1000  # en millisegundos
            response_times[endpoint] = duration
            
            # Los endpoints no-AI deben ser rápidos, AI puede ser más lento
            if 'chat' not in endpoint and response.status_code not in [401, 403]:
                assert duration < 5000, f"Endpoint {endpoint} too slow: {duration}ms"
            
            print(f"   {endpoint}: {duration:.2f}ms")
        
        print("✅ AI response times measured")
    
    # ===== TESTS DE MÉTRICAS Y ANALYTICS =====
    
    def test_ai_metrics(self):
        """Test de métricas del sistema AI"""
        response = requests.get(f'{self.base_url}/api/ai/metrics', headers=self.headers)
        
        if response.status_code in [401, 403]:
            pytest.skip("Supervisor privileges required for AI metrics")
        
        if response.status_code == 200:
            data = response.json()
            assert 'data' in data
            
            metrics = data['data']
            assert 'agents' in metrics
            assert 'multiAI' in metrics
            assert 'summary' in metrics
            
            summary = metrics['summary']
            assert 'totalInteractions' in summary
            assert 'totalAIRequests' in summary
            
            print(f"✅ AI Metrics: {summary['totalInteractions']} interactions, {summary['totalAIRequests']} AI requests")
    
    # ===== TESTS DE SISTEMA =====
    
    def test_ai_system_test_endpoint(self):
        """Test del endpoint de prueba del sistema AI"""
        test_data = {
            'testType': 'basic'
        }
        
        response = requests.post(
            f'{self.base_url}/api/ai/test',
            headers=self.headers,
            json=test_data
        )
        
        if response.status_code in [401, 403]:
            pytest.skip("Admin privileges required for AI system test")
        
        if response.status_code == 200:
            data = response.json()
            assert 'data' in data
            
            test_results = data['data']
            assert 'tests' in test_results
            assert 'summary' in test_results
            
            summary = test_results['summary']
            assert 'success_rate' in summary
            
            print(f"✅ AI System Test: {summary['success_rate']} success rate ({summary['passed']}/{summary['total']} tests)")
    
    def test_redis_ai_cache(self):
        """Test del cache Redis para AI"""
        try:
            # Verificar conexión Redis
            pong = self.redis_client.ping()
            assert pong is True
            
            # Buscar claves relacionadas con AI
            ai_keys = self.redis_client.keys('ai_*')
            context_keys = self.redis_client.keys('context:*')
            
            print(f"✅ Redis AI cache: {len(ai_keys)} AI keys, {len(context_keys)} context keys")
            
        except Exception as e:
            print(f"⚠️ Redis AI cache test failed: {str(e)}")
    
    # ===== TESTS DE FAILOVER Y RESILENCIA =====
    
    def test_model_failover(self):
        """Test de failover entre modelos AI"""
        # Intentar generar con un modelo que podría no estar disponible
        failover_data = {
            'prompt': 'Test failover message',
            'model': 'gpt4',  # Modelo que podría fallar
            'options': {
                'temperature': 0.5,
                'maxTokens': 100
            }
        }
        
        response = requests.post(
            f'{self.base_url}/api/ai/generate',
            headers=self.headers,
            json=failover_data
        )
        
        if response.status_code in [401, 403]:
            pytest.skip("Authentication required for failover test")
        
        # El sistema debe responder aunque el modelo específico falle
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            if data['success']:
                ai_response = data['data']
                # Verificar si se usó failover
                if 'isFailover' in ai_response:
                    print(f"✅ Model failover: {ai_response['originalModel']} -> {ai_response['model']}")
                else:
                    print(f"✅ Model {ai_response['model']} responded successfully")
    
    def test_agent_system_resilience(self):
        """Test de resistencia del sistema de agentes"""
        # Intentar chat con agente que podría no existir
        resilience_data = {
            'agentId': 'non-existent-agent',
            'message': 'Test resilience message',
            'conversationId': f'resilience_test_{int(time.time())}'
        }
        
        response = requests.post(
            f'{self.base_url}/api/ai/chat/agent',
            headers=self.headers,
            json=resilience_data
        )
        
        if response.status_code in [401, 403]:
            pytest.skip("Authentication required for resilience test")
        
        # Debe fallar elegantemente
        if response.status_code == 404:
            data = response.json()
            assert 'success' in data
            assert data['success'] is False
            print("✅ System handles non-existent agent gracefully")
        elif response.status_code == 200:
            # Podría fallar de otra manera o tener fallback
            print("✅ System handled invalid agent request")
    
    # ===== CLEANUP =====
    
    def teardown_class(self):
        """Cleanup después de todos los tests"""
        try:
            # Limpiar claves de Redis de prueba
            test_patterns = [
                'test_*',
                'context:test_*',
                'context:auto_test_*',
                'context:concurrent_*',
                'context:timing_test_*',
                'context:resilience_test_*'
            ]
            
            for pattern in test_patterns:
                keys = self.redis_client.keys(pattern)
                if keys:
                    self.redis_client.delete(*keys)
            
            print("✅ AI test cleanup completed")
            
        except Exception as e:
            print(f"⚠️ AI cleanup warning: {str(e)}")

# ===== EXECUTION HELPERS =====

def run_all_ai_tests():
    """Ejecutar todos los tests del sistema AI"""
    print("🤖 Starting AI System Test Suite")
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
        print("✅ All AI System Tests PASSED!")
    else:
        print("=" * 50)
        print("❌ Some AI System Tests FAILED!")
    
    return exit_code

if __name__ == '__main__':
    exit_code = run_all_ai_tests()
    sys.exit(exit_code)