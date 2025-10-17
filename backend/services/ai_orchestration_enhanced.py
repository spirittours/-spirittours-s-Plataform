"""
Sistema de Orquestación de IA Mejorado
Coordina inteligentemente todos los agentes IA con relaciones optimizadas
"""

import asyncio
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import logging
from enum import Enum
from dataclasses import dataclass, field
import json

logger = logging.getLogger(__name__)


class AgentPriority(Enum):
    """Prioridades de ejecución de agentes"""
    CRITICAL = 1
    HIGH = 2
    MEDIUM = 3
    LOW = 4
    BACKGROUND = 5


class AgentCategory(Enum):
    """Categorías de agentes para mejor organización"""
    CUSTOMER_SERVICE = "customer_service"
    REVENUE_OPTIMIZATION = "revenue_optimization"
    CONTENT_MARKETING = "content_marketing"
    SECURITY_COMPLIANCE = "security_compliance"
    ANALYTICS_INSIGHTS = "analytics_insights"
    COMMUNICATION = "communication"
    SUSTAINABILITY = "sustainability"


@dataclass
class AgentTask:
    """Representa una tarea para un agente"""
    agent_name: str
    task_type: str
    data: Dict[str, Any]
    priority: AgentPriority = AgentPriority.MEDIUM
    dependencies: List[str] = field(default_factory=list)
    timeout: int = 30
    created_at: datetime = field(default_factory=datetime.utcnow)
    

@dataclass
class AgentResult:
    """Resultado de ejecución de un agente"""
    agent_name: str
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    execution_time: float = 0.0
    timestamp: datetime = field(default_factory=datetime.utcnow)


class AIOrchestrationEnhanced:
    """
    Sistema mejorado de orquestación de IA que coordina todos los agentes
    con relaciones inteligentes y optimizadas
    """
    
    def __init__(self):
        self.agents_registry: Dict[str, Dict[str, Any]] = {}
        self.agent_relationships: Dict[str, List[str]] = {}
        self.execution_history: List[AgentResult] = []
        self._initialize_agents()
        self._setup_relationships()
        
    def _initialize_agents(self):
        """Inicializa el registro de todos los agentes disponibles"""
        
        # TRACK 1: Customer & Revenue Excellence
        self.agents_registry.update({
            "MultiChannelAgent": {
                "category": AgentCategory.COMMUNICATION,
                "priority": AgentPriority.HIGH,
                "capabilities": ["whatsapp", "telegram", "email", "sms"],
                "avg_execution_time": 0.5
            },
            "ContentMasterAgent": {
                "category": AgentCategory.CONTENT_MARKETING,
                "priority": AgentPriority.MEDIUM,
                "capabilities": ["content_generation", "seo_optimization"],
                "avg_execution_time": 2.0
            },
            "CompetitiveIntelAgent": {
                "category": AgentCategory.ANALYTICS_INSIGHTS,
                "priority": AgentPriority.MEDIUM,
                "capabilities": ["market_analysis", "competitor_tracking"],
                "avg_execution_time": 3.0
            },
            "CustomerProphetAgent": {
                "category": AgentCategory.ANALYTICS_INSIGHTS,
                "priority": AgentPriority.HIGH,
                "capabilities": ["behavior_prediction", "churn_prevention"],
                "avg_execution_time": 1.5
            },
            "ExperienceCuratorAgent": {
                "category": AgentCategory.CUSTOMER_SERVICE,
                "priority": AgentPriority.HIGH,
                "capabilities": ["personalization", "experience_design"],
                "avg_execution_time": 1.0
            },
            "RevenueMaximizerAgent": {
                "category": AgentCategory.REVENUE_OPTIMIZATION,
                "priority": AgentPriority.CRITICAL,
                "capabilities": ["dynamic_pricing", "revenue_optimization"],
                "avg_execution_time": 0.8
            },
            "SocialSentimentAgent": {
                "category": AgentCategory.ANALYTICS_INSIGHTS,
                "priority": AgentPriority.MEDIUM,
                "capabilities": ["sentiment_analysis", "social_monitoring"],
                "avg_execution_time": 1.2
            },
            "BookingOptimizerAgent": {
                "category": AgentCategory.REVENUE_OPTIMIZATION,
                "priority": AgentPriority.HIGH,
                "capabilities": ["conversion_optimization", "booking_funnel"],
                "avg_execution_time": 0.7
            },
            "DemandForecasterAgent": {
                "category": AgentCategory.ANALYTICS_INSIGHTS,
                "priority": AgentPriority.HIGH,
                "capabilities": ["demand_prediction", "capacity_planning"],
                "avg_execution_time": 2.5
            },
            "FeedbackAnalyzerAgent": {
                "category": AgentCategory.CUSTOMER_SERVICE,
                "priority": AgentPriority.MEDIUM,
                "capabilities": ["review_analysis", "satisfaction_tracking"],
                "avg_execution_time": 1.0
            }
        })
        
        # TRACK 2: Security & Market Intelligence
        self.agents_registry.update({
            "SecurityGuardAgent": {
                "category": AgentCategory.SECURITY_COMPLIANCE,
                "priority": AgentPriority.CRITICAL,
                "capabilities": ["threat_detection", "security_monitoring"],
                "avg_execution_time": 0.3
            },
            "MarketEntryAgent": {
                "category": AgentCategory.ANALYTICS_INSIGHTS,
                "priority": AgentPriority.MEDIUM,
                "capabilities": ["market_expansion", "opportunity_analysis"],
                "avg_execution_time": 3.0
            },
            "InfluencerMatchAgent": {
                "category": AgentCategory.CONTENT_MARKETING,
                "priority": AgentPriority.LOW,
                "capabilities": ["influencer_matching", "campaign_management"],
                "avg_execution_time": 2.0
            },
            "LuxuryUpsellAgent": {
                "category": AgentCategory.REVENUE_OPTIMIZATION,
                "priority": AgentPriority.HIGH,
                "capabilities": ["premium_upsell", "luxury_recommendations"],
                "avg_execution_time": 1.0
            },
            "RouteGeniusAgent": {
                "category": AgentCategory.CUSTOMER_SERVICE,
                "priority": AgentPriority.MEDIUM,
                "capabilities": ["route_optimization", "logistics_planning"],
                "avg_execution_time": 1.5
            }
        })
        
        # TRACK 3: Ethics & Sustainability
        self.agents_registry.update({
            "CrisisManagementAgent": {
                "category": AgentCategory.SECURITY_COMPLIANCE,
                "priority": AgentPriority.CRITICAL,
                "capabilities": ["crisis_response", "emergency_management"],
                "avg_execution_time": 0.5
            },
            "PersonalizationEngineAgent": {
                "category": AgentCategory.CUSTOMER_SERVICE,
                "priority": AgentPriority.HIGH,
                "capabilities": ["ml_personalization", "recommendation_engine"],
                "avg_execution_time": 1.0
            },
            "CulturalAdaptationAgent": {
                "category": AgentCategory.CUSTOMER_SERVICE,
                "priority": AgentPriority.MEDIUM,
                "capabilities": ["cultural_adaptation", "localization"],
                "avg_execution_time": 1.2
            },
            "SustainabilityAdvisorAgent": {
                "category": AgentCategory.SUSTAINABILITY,
                "priority": AgentPriority.MEDIUM,
                "capabilities": ["sustainability_analysis", "eco_recommendations"],
                "avg_execution_time": 1.5
            },
            "KnowledgeCuratorAgent": {
                "category": AgentCategory.CUSTOMER_SERVICE,
                "priority": AgentPriority.LOW,
                "capabilities": ["knowledge_management", "content_curation"],
                "avg_execution_time": 2.0
            },
            "WellnessOptimizerAgent": {
                "category": AgentCategory.CUSTOMER_SERVICE,
                "priority": AgentPriority.MEDIUM,
                "capabilities": ["wellness_tracking", "health_optimization"],
                "avg_execution_time": 1.0
            },
            "AccessibilitySpecialistAgent": {
                "category": AgentCategory.CUSTOMER_SERVICE,
                "priority": AgentPriority.MEDIUM,
                "capabilities": ["accessibility_compliance", "inclusive_design"],
                "avg_execution_time": 1.0
            },
            "CarbonOptimizerAgent": {
                "category": AgentCategory.SUSTAINABILITY,
                "priority": AgentPriority.LOW,
                "capabilities": ["carbon_tracking", "emissions_optimization"],
                "avg_execution_time": 1.5
            },
            "LocalImpactAnalyzerAgent": {
                "category": AgentCategory.SUSTAINABILITY,
                "priority": AgentPriority.LOW,
                "capabilities": ["local_impact", "community_analysis"],
                "avg_execution_time": 2.0
            },
            "EthicalTourismAdvisorAgent": {
                "category": AgentCategory.SUSTAINABILITY,
                "priority": AgentPriority.MEDIUM,
                "capabilities": ["ethical_tourism", "responsible_travel"],
                "avg_execution_time": 1.5
            }
        })
        
        logger.info(f"Initialized {len(self.agents_registry)} AI agents")
    
    def _setup_relationships(self):
        """
        Configura las relaciones e interdependencias entre agentes
        para optimizar el flujo de trabajo
        """
        self.agent_relationships = {
            # CustomerProphetAgent depende de datos de otros agentes
            "CustomerProphetAgent": [
                "SocialSentimentAgent",
                "FeedbackAnalyzerAgent",
                "BookingOptimizerAgent"
            ],
            
            # RevenueMaximizerAgent usa datos de demanda y comportamiento
            "RevenueMaximizerAgent": [
                "DemandForecasterAgent",
                "CustomerProphetAgent",
                "CompetitiveIntelAgent"
            ],
            
            # ExperienceCuratorAgent personaliza basándose en múltiples fuentes
            "ExperienceCuratorAgent": [
                "PersonalizationEngineAgent",
                "CulturalAdaptationAgent",
                "SustainabilityAdvisorAgent"
            ],
            
            # ContentMasterAgent usa inteligencia competitiva y sentimiento
            "ContentMasterAgent": [
                "CompetitiveIntelAgent",
                "SocialSentimentAgent"
            ],
            
            # LuxuryUpsellAgent usa personalizacion y predicción
            "LuxuryUpsellAgent": [
                "PersonalizationEngineAgent",
                "CustomerProphetAgent"
            ],
            
            # RouteGeniusAgent considera sostenibilidad
            "RouteGeniusAgent": [
                "CarbonOptimizerAgent",
                "LocalImpactAnalyzerAgent"
            ],
            
            # MarketEntryAgent usa análisis competitivo
            "MarketEntryAgent": [
                "CompetitiveIntelAgent",
                "LocalImpactAnalyzerAgent"
            ]
        }
        
        logger.info(f"Configured relationships for {len(self.agent_relationships)} agents")
    
    async def execute_agent_task(
        self, 
        task: AgentTask,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResult:
        """
        Ejecuta una tarea de agente con manejo de dependencias
        
        Args:
            task: Tarea a ejecutar
            context: Contexto adicional (resultados de dependencias)
            
        Returns:
            AgentResult con el resultado de la ejecución
        """
        start_time = datetime.utcnow()
        
        try:
            # Verificar si el agente existe
            if task.agent_name not in self.agents_registry:
                raise ValueError(f"Agent {task.agent_name} not found in registry")
            
            agent_info = self.agents_registry[task.agent_name]
            
            # Ejecutar dependencias primero si existen
            if task.agent_name in self.agent_relationships:
                dependencies_results = await self._execute_dependencies(
                    task.agent_name,
                    task.data
                )
                if context is None:
                    context = {}
                context['dependencies'] = dependencies_results
            
            # Simular ejecución del agente (aquí iría la lógica real)
            await asyncio.sleep(agent_info['avg_execution_time'] * 0.1)  # Simulación rápida
            
            # Preparar resultado
            result_data = {
                "agent": task.agent_name,
                "task_type": task.task_type,
                "category": agent_info['category'].value,
                "priority": task.priority.name,
                "processed_at": datetime.utcnow().isoformat(),
                "context_used": context is not None
            }
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            result = AgentResult(
                agent_name=task.agent_name,
                success=True,
                data=result_data,
                execution_time=execution_time
            )
            
            self.execution_history.append(result)
            logger.info(f"Agent {task.agent_name} executed successfully in {execution_time:.2f}s")
            
            return result
            
        except Exception as e:
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            result = AgentResult(
                agent_name=task.agent_name,
                success=False,
                error=str(e),
                execution_time=execution_time
            )
            self.execution_history.append(result)
            logger.error(f"Agent {task.agent_name} failed: {e}")
            return result
    
    async def _execute_dependencies(
        self,
        agent_name: str,
        data: Dict[str, Any]
    ) -> Dict[str, AgentResult]:
        """Ejecuta las dependencias de un agente en paralelo"""
        dependencies = self.agent_relationships.get(agent_name, [])
        
        if not dependencies:
            return {}
        
        # Crear tareas para cada dependencia
        tasks = [
            self.execute_agent_task(
                AgentTask(
                    agent_name=dep_name,
                    task_type="dependency",
                    data=data,
                    priority=AgentPriority.HIGH
                )
            )
            for dep_name in dependencies
        ]
        
        # Ejecutar todas las dependencias en paralelo
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Procesar resultados
        dependencies_results = {}
        for dep_name, result in zip(dependencies, results):
            if isinstance(result, Exception):
                logger.warning(f"Dependency {dep_name} failed: {result}")
                continue
            dependencies_results[dep_name] = result
        
        return dependencies_results
    
    async def execute_workflow(
        self,
        workflow_name: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Ejecuta un flujo de trabajo predefinido que coordina múltiples agentes
        
        Args:
            workflow_name: Nombre del flujo de trabajo
            data: Datos de entrada
            
        Returns:
            Resultados consolidados del workflow
        """
        workflows = {
            "customer_onboarding": [
                ("MultiChannelAgent", AgentPriority.HIGH),
                ("PersonalizationEngineAgent", AgentPriority.HIGH),
                ("ExperienceCuratorAgent", AgentPriority.MEDIUM),
                ("ContentMasterAgent", AgentPriority.LOW)
            ],
            "booking_optimization": [
                ("DemandForecasterAgent", AgentPriority.HIGH),
                ("RevenueMaximizerAgent", AgentPriority.CRITICAL),
                ("BookingOptimizerAgent", AgentPriority.HIGH),
                ("LuxuryUpsellAgent", AgentPriority.MEDIUM)
            ],
            "crisis_response": [
                ("CrisisManagementAgent", AgentPriority.CRITICAL),
                ("SecurityGuardAgent", AgentPriority.CRITICAL),
                ("MultiChannelAgent", AgentPriority.HIGH),
                ("CustomerProphetAgent", AgentPriority.HIGH)
            ],
            "market_expansion": [
                ("CompetitiveIntelAgent", AgentPriority.HIGH),
                ("MarketEntryAgent", AgentPriority.HIGH),
                ("LocalImpactAnalyzerAgent", AgentPriority.MEDIUM),
                ("SustainabilityAdvisorAgent", AgentPriority.MEDIUM)
            ],
            "sustainability_audit": [
                ("CarbonOptimizerAgent", AgentPriority.HIGH),
                ("SustainabilityAdvisorAgent", AgentPriority.HIGH),
                ("LocalImpactAnalyzerAgent", AgentPriority.MEDIUM),
                ("EthicalTourismAdvisorAgent", AgentPriority.MEDIUM)
            ]
        }
        
        if workflow_name not in workflows:
            raise ValueError(f"Workflow {workflow_name} not found")
        
        workflow = workflows[workflow_name]
        results = []
        
        logger.info(f"Executing workflow: {workflow_name} with {len(workflow)} agents")
        
        for agent_name, priority in workflow:
            task = AgentTask(
                agent_name=agent_name,
                task_type=workflow_name,
                data=data,
                priority=priority
            )
            result = await self.execute_agent_task(task)
            results.append(result)
        
        return {
            "workflow": workflow_name,
            "total_agents": len(results),
            "successful": sum(1 for r in results if r.success),
            "failed": sum(1 for r in results if not r.success),
            "total_time": sum(r.execution_time for r in results),
            "results": [
                {
                    "agent": r.agent_name,
                    "success": r.success,
                    "execution_time": r.execution_time,
                    "data": r.data
                }
                for r in results
            ]
        }
    
    def get_agents_by_category(self, category: AgentCategory) -> List[str]:
        """Obtiene todos los agentes de una categoría específica"""
        return [
            name for name, info in self.agents_registry.items()
            if info['category'] == category
        ]
    
    def get_agent_info(self, agent_name: str) -> Optional[Dict[str, Any]]:
        """Obtiene información detallada de un agente"""
        if agent_name not in self.agents_registry:
            return None
        
        info = self.agents_registry[agent_name].copy()
        info['name'] = agent_name
        info['dependencies'] = self.agent_relationships.get(agent_name, [])
        info['dependent_agents'] = [
            name for name, deps in self.agent_relationships.items()
            if agent_name in deps
        ]
        
        return info
    
    def get_execution_stats(self) -> Dict[str, Any]:
        """Obtiene estadísticas de ejecución de agentes"""
        if not self.execution_history:
            return {"message": "No execution history available"}
        
        total_executions = len(self.execution_history)
        successful = sum(1 for r in self.execution_history if r.success)
        failed = total_executions - successful
        
        avg_execution_time = sum(r.execution_time for r in self.execution_history) / total_executions
        
        agent_stats = {}
        for result in self.execution_history:
            if result.agent_name not in agent_stats:
                agent_stats[result.agent_name] = {
                    "executions": 0,
                    "successes": 0,
                    "failures": 0,
                    "total_time": 0.0
                }
            
            stats = agent_stats[result.agent_name]
            stats["executions"] += 1
            stats["total_time"] += result.execution_time
            if result.success:
                stats["successes"] += 1
            else:
                stats["failures"] += 1
        
        return {
            "total_executions": total_executions,
            "successful": successful,
            "failed": failed,
            "success_rate": (successful / total_executions * 100) if total_executions > 0 else 0,
            "avg_execution_time": avg_execution_time,
            "agent_stats": agent_stats
        }


# Instancia global del orquestador
ai_orchestrator = AIOrchestrationEnhanced()
