"""
Tests Unitarios para el Sistema de Orquestación de IA
"""

import pytest
import asyncio
from datetime import datetime
from backend.services.ai_orchestration_enhanced import (
    AIOrchestrationEnhanced,
    AgentTask,
    AgentPriority,
    AgentCategory,
    AgentResult
)


@pytest.fixture
def orchestrator():
    """Fixture que proporciona una instancia del orquestador"""
    return AIOrchestrationEnhanced()


@pytest.fixture
def sample_task():
    """Fixture que proporciona una tarea de ejemplo"""
    return AgentTask(
        agent_name="CustomerProphetAgent",
        task_type="predict_churn",
        data={"user_id": "123", "behavior_data": {}},
        priority=AgentPriority.HIGH
    )


class TestAIOrchestrationInitialization:
    """Tests de inicialización del orquestador"""
    
    def test_orchestrator_initialization(self, orchestrator):
        """Verifica que el orquestador se inicialice correctamente"""
        assert orchestrator is not None
        assert len(orchestrator.agents_registry) > 0
        assert len(orchestrator.agent_relationships) > 0
    
    def test_all_agents_registered(self, orchestrator):
        """Verifica que todos los agentes estén registrados"""
        expected_agents = [
            "CustomerProphetAgent",
            "RevenueMaximizerAgent",
            "SecurityGuardAgent",
            "BookingOptimizerAgent",
        ]
        
        for agent_name in expected_agents:
            assert agent_name in orchestrator.agents_registry
    
    def test_agent_categories_configured(self, orchestrator):
        """Verifica que los agentes tengan categorías asignadas"""
        for agent_name, agent_info in orchestrator.agents_registry.items():
            assert "category" in agent_info
            assert isinstance(agent_info["category"], AgentCategory)


class TestAgentExecution:
    """Tests de ejecución de agentes"""
    
    @pytest.mark.asyncio
    async def test_execute_single_agent(self, orchestrator, sample_task):
        """Test de ejecución de un solo agente"""
        result = await orchestrator.execute_agent_task(sample_task)
        
        assert isinstance(result, AgentResult)
        assert result.success is True
        assert result.agent_name == "CustomerProphetAgent"
        assert result.execution_time >= 0
    
    @pytest.mark.asyncio
    async def test_execute_nonexistent_agent(self, orchestrator):
        """Test de ejecución de agente inexistente"""
        task = AgentTask(
            agent_name="NonExistentAgent",
            task_type="test",
            data={}
        )
        
        result = await orchestrator.execute_agent_task(task)
        assert result.success is False
        assert result.error is not None
    
    @pytest.mark.asyncio
    async def test_execute_with_dependencies(self, orchestrator):
        """Test de ejecución con dependencias"""
        task = AgentTask(
            agent_name="RevenueMaximizerAgent",
            task_type="optimize_pricing",
            data={"product_id": "123"}
        )
        
        result = await orchestrator.execute_agent_task(task)
        
        assert result.success is True
        # RevenueMaximizerAgent tiene dependencias configuradas
        assert len(orchestrator.agent_relationships.get("RevenueMaximizerAgent", [])) > 0


class TestWorkflows:
    """Tests de workflows predefinidos"""
    
    @pytest.mark.asyncio
    async def test_customer_onboarding_workflow(self, orchestrator):
        """Test del workflow de onboarding de clientes"""
        result = await orchestrator.execute_workflow(
            "customer_onboarding",
            {"user_id": "new_user_123", "preferences": {}}
        )
        
        assert result["workflow"] == "customer_onboarding"
        assert result["total_agents"] > 0
        assert result["successful"] >= 0
        assert "results" in result
    
    @pytest.mark.asyncio
    async def test_booking_optimization_workflow(self, orchestrator):
        """Test del workflow de optimización de reservas"""
        result = await orchestrator.execute_workflow(
            "booking_optimization",
            {"booking_id": "booking_456"}
        )
        
        assert result["workflow"] == "booking_optimization"
        assert result["total_time"] >= 0
    
    @pytest.mark.asyncio
    async def test_crisis_response_workflow(self, orchestrator):
        """Test del workflow de respuesta a crisis"""
        result = await orchestrator.execute_workflow(
            "crisis_response",
            {"incident_type": "system_outage", "severity": "high"}
        )
        
        assert result["workflow"] == "crisis_response"
        # Crisis response debe ejecutar agentes críticos
        assert result["total_agents"] >= 3
    
    @pytest.mark.asyncio
    async def test_invalid_workflow(self, orchestrator):
        """Test de workflow inválido"""
        with pytest.raises(ValueError):
            await orchestrator.execute_workflow(
                "invalid_workflow",
                {}
            )


class TestAgentRelationships:
    """Tests de relaciones entre agentes"""
    
    def test_relationships_configured(self, orchestrator):
        """Verifica que las relaciones estén configuradas"""
        assert len(orchestrator.agent_relationships) > 0
    
    def test_dependent_agents_exist(self, orchestrator):
        """Verifica que los agentes dependientes existan"""
        for agent_name, dependencies in orchestrator.agent_relationships.items():
            assert agent_name in orchestrator.agents_registry
            
            for dep_name in dependencies:
                assert dep_name in orchestrator.agents_registry
    
    def test_get_agents_by_category(self, orchestrator):
        """Test de obtención de agentes por categoría"""
        revenue_agents = orchestrator.get_agents_by_category(
            AgentCategory.REVENUE_OPTIMIZATION
        )
        
        assert len(revenue_agents) > 0
        assert "RevenueMaximizerAgent" in revenue_agents
    
    def test_get_agent_info(self, orchestrator):
        """Test de obtención de información de agente"""
        info = orchestrator.get_agent_info("CustomerProphetAgent")
        
        assert info is not None
        assert "name" in info
        assert "category" in info
        assert "capabilities" in info
        assert "dependencies" in info
        assert "dependent_agents" in info


class TestMetricsAndStatistics:
    """Tests de métricas y estadísticas"""
    
    @pytest.mark.asyncio
    async def test_execution_history(self, orchestrator, sample_task):
        """Test de historial de ejecución"""
        initial_length = len(orchestrator.execution_history)
        
        await orchestrator.execute_agent_task(sample_task)
        
        assert len(orchestrator.execution_history) == initial_length + 1
    
    @pytest.mark.asyncio
    async def test_execution_stats(self, orchestrator, sample_task):
        """Test de estadísticas de ejecución"""
        # Ejecutar algunas tareas
        for _ in range(3):
            await orchestrator.execute_agent_task(sample_task)
        
        stats = orchestrator.get_execution_stats()
        
        assert "total_executions" in stats
        assert "successful" in stats
        assert "failed" in stats
        assert "success_rate" in stats
        assert "avg_execution_time" in stats
        assert stats["total_executions"] >= 3
    
    @pytest.mark.asyncio
    async def test_agent_specific_stats(self, orchestrator):
        """Test de estadísticas específicas por agente"""
        task1 = AgentTask(
            agent_name="SecurityGuardAgent",
            task_type="scan",
            data={}
        )
        task2 = AgentTask(
            agent_name="SecurityGuardAgent",
            task_type="monitor",
            data={}
        )
        
        await orchestrator.execute_agent_task(task1)
        await orchestrator.execute_agent_task(task2)
        
        stats = orchestrator.get_execution_stats()
        
        assert "agent_stats" in stats
        assert "SecurityGuardAgent" in stats["agent_stats"]
        assert stats["agent_stats"]["SecurityGuardAgent"]["executions"] >= 2


class TestPriorities:
    """Tests de prioridades de agentes"""
    
    def test_critical_agents_have_high_priority(self, orchestrator):
        """Verifica que agentes críticos tengan alta prioridad"""
        critical_agents = [
            "SecurityGuardAgent",
            "CrisisManagementAgent",
            "RevenueMaximizerAgent"
        ]
        
        for agent_name in critical_agents:
            agent_info = orchestrator.agents_registry.get(agent_name)
            if agent_info:
                assert agent_info["priority"] in [
                    AgentPriority.CRITICAL,
                    AgentPriority.HIGH
                ]
    
    @pytest.mark.asyncio
    async def test_priority_based_execution(self, orchestrator):
        """Test de ejecución basada en prioridad"""
        critical_task = AgentTask(
            agent_name="SecurityGuardAgent",
            task_type="alert",
            data={},
            priority=AgentPriority.CRITICAL
        )
        
        low_task = AgentTask(
            agent_name="KnowledgeCuratorAgent",
            task_type="curate",
            data={},
            priority=AgentPriority.LOW
        )
        
        # Ambas tareas deben completarse
        result1 = await orchestrator.execute_agent_task(critical_task)
        result2 = await orchestrator.execute_agent_task(low_task)
        
        assert result1.success is True
        assert result2.success is True


class TestErrorHandling:
    """Tests de manejo de errores"""
    
    @pytest.mark.asyncio
    async def test_invalid_agent_name(self, orchestrator):
        """Test con nombre de agente inválido"""
        task = AgentTask(
            agent_name="InvalidAgent",
            task_type="test",
            data={}
        )
        
        result = await orchestrator.execute_agent_task(task)
        
        assert result.success is False
        assert result.error is not None
        assert "not found" in result.error.lower()
    
    @pytest.mark.asyncio
    async def test_execution_with_empty_data(self, orchestrator):
        """Test de ejecución con datos vacíos"""
        task = AgentTask(
            agent_name="CustomerProphetAgent",
            task_type="predict",
            data={}
        )
        
        result = await orchestrator.execute_agent_task(task)
        # Debe manejar datos vacíos sin fallar
        assert isinstance(result, AgentResult)


@pytest.mark.integration
class TestIntegration:
    """Tests de integración"""
    
    @pytest.mark.asyncio
    async def test_full_workflow_integration(self, orchestrator):
        """Test de integración de workflow completo"""
        workflows = [
            "customer_onboarding",
            "booking_optimization",
            "market_expansion"
        ]
        
        results = []
        for workflow_name in workflows:
            result = await orchestrator.execute_workflow(
                workflow_name,
                {"test": "data"}
            )
            results.append(result)
        
        # Todos los workflows deben completarse
        assert len(results) == len(workflows)
        for result in results:
            assert result["total_agents"] > 0
    
    @pytest.mark.asyncio
    async def test_concurrent_agent_execution(self, orchestrator):
        """Test de ejecución concurrente de agentes"""
        tasks = [
            AgentTask(
                agent_name=f"SecurityGuardAgent",
                task_type="monitor",
                data={"id": i}
            )
            for i in range(5)
        ]
        
        # Ejecutar tareas concurrentemente
        results = await asyncio.gather(
            *[orchestrator.execute_agent_task(task) for task in tasks]
        )
        
        assert len(results) == 5
        assert all(r.success for r in results)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
