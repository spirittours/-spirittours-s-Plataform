"""
Agent System Initialization Script

Initializes all AI agents and registers common workflows.
"""

import asyncio
import logging
from typing import Dict, Any

from base import AgentRegistry, AgentOrchestrator, Workflow
from tourism import *
from operations import *
from analytics import *
from marketing import *


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def register_all_agents(registry: AgentRegistry):
    """Register all agents in the system"""
    
    agents = [
        # Tourism & Sustainability (6 agents)
        ItineraryPlannerAgent(),
        WeatherAdvisorAgent(),
        CulturalGuideAgent(),
        AccessibilityAdvisorAgent(),
        SustainabilityGuideAgent(),
        EmergencyAssistantAgent(),
        
        # Operations & Support (7 agents)
        ReservationManagerAgent(),
        DriverCoordinatorAgent(),
        GuideSchedulerAgent(),
        InventoryManagerAgent(),
        CustomerSupportAgent(),
        FeedbackAnalyzerAgent(),
        CrisisManagerAgent(),
        
        # Analytics & BI (7 agents)
        RevenueAnalystAgent(),
        DemandForecasterAgent(),
        PricingOptimizerAgent(),
        CustomerSegmentationAgent(),
        CompetitiveAnalystAgent(),
        PerformanceMonitorAgent(),
        ChurnPredictorAgent(),
        
        # Content & Marketing (5 agents)
        ContentGeneratorAgent(),
        SocialMediaManagerAgent(),
        EmailCampaignerAgent(),
        SEOOptimizerAgent(),
        ReviewResponderAgent(),
    ]
    
    for agent in agents:
        registry.register(agent)
        logger.info(f"Registered: {agent.name}")
    
    logger.info(f"\n✅ Total agents registered: {registry.get_agent_count()}")


def create_common_workflows(orchestrator: AgentOrchestrator):
    """Create and register common workflows"""
    
    # Workflow 1: Complete Tour Planning
    tour_planning_workflow = Workflow(
        name="complete_tour_planning",
        description="Complete tour planning with weather, cultural info, and itinerary"
    )
    
    tour_planning_workflow.add_step(
        agent_name="weather_advisor",
        intent="check_weather",
        parameters={'days': 7}
    )
    
    tour_planning_workflow.add_step(
        agent_name="itinerary_planner",
        intent="create_itinerary",
        parameters={'duration_days': 3, 'interests': ['history', 'culture']},
        depends_on=[0]  # Depends on weather check
    )
    
    tour_planning_workflow.add_step(
        agent_name="cultural_guide",
        intent="get_info",
        depends_on=[1]  # Depends on itinerary
    )
    
    orchestrator.register_workflow(tour_planning_workflow)
    logger.info(f"Registered workflow: {tour_planning_workflow.name}")
    
    # Workflow 2: Booking and Operations
    booking_workflow = Workflow(
        name="complete_booking",
        description="Complete booking process with resource allocation"
    )
    
    booking_workflow.add_step(
        agent_name="reservation_manager",
        intent="query",
        parameters={'action': 'check_availability'}
    )
    
    booking_workflow.add_step(
        agent_name="guide_scheduler",
        intent="query",
        parameters={'action': 'find_available_guide'},
        depends_on=[0]
    )
    
    booking_workflow.add_step(
        agent_name="driver_coordinator",
        intent="query",
        parameters={'action': 'find_available_driver'},
        depends_on=[0]
    )
    
    orchestrator.register_workflow(booking_workflow)
    logger.info(f"Registered workflow: {booking_workflow.name}")
    
    # Workflow 3: Performance Analytics
    analytics_workflow = Workflow(
        name="performance_analysis",
        description="Comprehensive performance analysis"
    )
    
    analytics_workflow.add_step(
        agent_name="revenue_analyst",
        intent="analyze",
        parameters={'period': 'last_30_days'}
    )
    
    analytics_workflow.add_step(
        agent_name="demand_forecaster",
        intent="analyze",
        parameters={'horizon_days': 30}
    )
    
    analytics_workflow.add_step(
        agent_name="pricing_optimizer",
        intent="recommend",
        depends_on=[0, 1]
    )
    
    orchestrator.register_workflow(analytics_workflow)
    logger.info(f"Registered workflow: {analytics_workflow.name}")
    
    logger.info(f"\n✅ Total workflows registered: {len(orchestrator.list_workflows())}")


async def test_agents(registry: AgentRegistry):
    """Test a few agents to ensure they work"""
    
    logger.info("\n🧪 Testing agents...")
    
    # Test Itinerary Planner
    from base.agent_base import AgentRequest
    
    itinerary_agent = registry.get_agent('itinerary_planner')
    if itinerary_agent:
        request = AgentRequest(
            intent='suggest_stops',
            parameters={
                'current_location': [35.2137, 31.7683],  # Jerusalem
                'interests': ['history', 'culture'],
                'max_results': 3
            }
        )
        response = await itinerary_agent.execute(request)
        logger.info(f"Itinerary Planner Test: {response.status.value}")
        if response.result:
            logger.info(f"  Suggestions: {len(response.result.get('suggestions', []))}")
    
    # Test Weather Advisor
    weather_agent = registry.get_agent('weather_advisor')
    if weather_agent:
        request = AgentRequest(
            intent='check_weather',
            parameters={
                'location': 'Jerusalem',
                'days': 3
            }
        )
        response = await weather_agent.execute(request)
        logger.info(f"Weather Advisor Test: {response.status.value}")
    
    logger.info("\n✅ Agent testing complete")


async def main():
    """Main initialization function"""
    
    logger.info("="*60)
    logger.info("SPIRIT TOURS AI AGENTS SYSTEM - INITIALIZATION")
    logger.info("="*60)
    
    # Create registry and orchestrator
    registry = AgentRegistry()
    orchestrator = AgentOrchestrator(registry)
    
    # Register all agents
    logger.info("\n📝 Registering agents...")
    register_all_agents(registry)
    
    # Create common workflows
    logger.info("\n🔄 Creating workflows...")
    create_common_workflows(orchestrator)
    
    # Test agents
    await test_agents(registry)
    
    # Display summary
    logger.info("\n" + "="*60)
    logger.info("SYSTEM SUMMARY")
    logger.info("="*60)
    
    metrics = registry.get_agent_metrics()
    logger.info(f"Total Agents: {metrics['total_agents']}")
    logger.info(f"Total Capabilities: {metrics['total_capabilities']}")
    logger.info(f"Total Workflows: {len(orchestrator.list_workflows())}")
    
    logger.info("\nAgent Categories:")
    logger.info(f"  • Tourism & Sustainability: 6 agents")
    logger.info(f"  • Operations & Support: 7 agents")
    logger.info(f"  • Analytics & BI: 7 agents")
    logger.info(f"  • Content & Marketing: 5 agents")
    
    logger.info("\n✅ AI Agents System initialized successfully!")
    logger.info("="*60)
    
    return registry, orchestrator


if __name__ == '__main__':
    asyncio.run(main())
