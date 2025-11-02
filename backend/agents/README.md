# Spirit Tours AI Agents System

## 📋 Overview

The Spirit Tours AI Agents System is a comprehensive, modular framework for implementing intelligent automation across all aspects of tour operations, customer service, analytics, and marketing.

### Architecture Highlights

- **25 Specialized Agents** across 4 categories
- **Event-driven architecture** with async communication
- **Modular & extensible** design
- **Production-ready** with monitoring, health checks, and error handling
- **Type-safe** with Pydantic models

---

## 🏗️ Architecture

### Base Components

#### 1. **BaseAgent** (`base/base_agent.py`)
Abstract base class providing common functionality:
- Task execution with metrics tracking
- Error handling and retry logic
- Health monitoring
- Agent lifecycle management
- Inter-agent dependencies

```python
from agents.base import BaseAgent, AgentCapability

class MyCustomAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_name="My Custom Agent",
            agent_type="custom-agent",
            capabilities={AgentCapability.DATA_ANALYSIS}
        )
    
    async def process_task(self, task: AgentTask) -> Dict[str, Any]:
        # Implement your agent logic here
        return {"status": "success", "data": "..."}
```

#### 2. **AgentRegistry** (`base/agent_registry.py`)
Centralized registry for agent discovery and management:
- Agent registration/unregistration
- Task routing with load balancing
- Health monitoring
- Agent discovery by type/capability

```python
from agents.base import AgentRegistry

# Get singleton instance
registry = AgentRegistry.get_sync_instance()

# Register agent
registry.register_agent(my_agent)

# Find agents
agents = registry.find_agents_by_capability(AgentCapability.PREDICTION)

# Route task
result = await registry.route_task(task)
```

#### 3. **AgentTask** (`base/agent_task.py`)
Task representation with lifecycle management:
- Priority levels (CRITICAL, HIGH, NORMAL, LOW)
- Status tracking (PENDING → ASSIGNED → IN_PROGRESS → COMPLETED/FAILED)
- Execution time metrics
- Task scheduling

```python
from agents.base import AgentTask, TaskPriority

task = AgentTask(
    task_type="itinerary_plan",
    agent_type="itinerary-planner",
    priority=TaskPriority.HIGH,
    payload={
        "destination": "Jerusalem",
        "duration_days": 7,
        "interests": ["history", "culture", "food"]
    }
)
```

#### 4. **AgentProtocol** (`base/agent_protocol.py`)
Inter-agent communication protocol:
- Request/response messaging
- Broadcast notifications
- Message correlation and threading
- TTL and priority support

```python
from agents.base import AgentProtocol, AgentMessage, MessageType

protocol = AgentProtocol()

# Send message
message = AgentMessage(
    message_type=MessageType.REQUEST,
    from_agent_id=agent1.agent_id,
    to_agent_id=agent2.agent_id,
    subject="Request Weather Data",
    payload={"location": "Jerusalem", "date": "2025-11-15"}
)

await protocol.send_message(message)
```

#### 5. **Configuration System** (`config/`)
YAML-based configuration with environment overrides:

```yaml
# configs/itinerary-planner.yaml
agent_type: "itinerary-planner"
agent_name: "Itinerary Planning Agent"
enabled: true
max_concurrent_tasks: 10
timeout: 300

capabilities:
  - "recommendation"
  - "optimization"
  - "natural_language"

parameters:
  default_duration_days: 7
  max_stops_per_day: 4
  optimization_algorithm: "genetic"
```

Load configuration:
```python
from agents.config import load_agent_config

config = load_agent_config("itinerary-planner")
```

#### 6. **Feature Flags** (`config/feature_flags.py`)
Runtime feature toggles:

```python
from agents.config import FeatureFlags, is_feature_enabled

if is_feature_enabled(FeatureFlags.ENABLE_ITINERARY_PLANNING):
    # Initialize itinerary planning agent
    pass
```

Environment variables:
```bash
# Enable/disable specific agents
export AGENT_FEATURE_ENABLE_ITINERARY_PLANNING=true
export AGENT_FEATURE_ENABLE_ML_PREDICTIONS=false
```

---

## 📁 Directory Structure

```
backend/agents/
├── base/                          # Base architecture
│   ├── __init__.py
│   ├── base_agent.py             # Abstract base agent class
│   ├── agent_registry.py         # Central agent registry
│   ├── agent_task.py             # Task representation
│   └── agent_protocol.py         # Communication protocol
│
├── config/                        # Configuration system
│   ├── __init__.py
│   ├── agent_config.py           # Configuration loading
│   ├── feature_flags.py          # Feature flags
│   └── configs/                  # Agent configuration files
│       └── example-agent.yaml
│
├── tourism/                       # Tourism & Sustainability agents
│   ├── itinerary_planner.py
│   ├── weather_advisor.py
│   ├── cultural_guide.py
│   ├── accessibility_advisor.py
│   ├── sustainability_guide.py
│   └── emergency_assistant.py
│
├── operations/                    # Operations & Support agents
│   ├── reservation_manager.py
│   ├── driver_coordinator.py
│   ├── guide_scheduler.py
│   ├── inventory_manager.py
│   ├── customer_support.py
│   ├── feedback_analyzer.py
│   └── crisis_manager.py
│
├── analytics/                     # Analytics & BI agents
│   ├── revenue_analyst.py
│   ├── demand_forecaster.py
│   ├── pricing_optimizer.py
│   ├── customer_segmentation.py
│   ├── competitive_analyst.py
│   ├── performance_monitor.py
│   └── churn_predictor.py
│
├── marketing/                     # Content & Marketing agents
│   ├── content_generator.py
│   ├── social_media_manager.py
│   ├── email_campaigner.py
│   ├── seo_optimizer.py
│   └── review_responder.py
│
├── orchestration/                 # Agent orchestration
│   ├── orchestrator.py           # Task orchestration
│   ├── scheduler.py              # Task scheduling
│   └── workflow.py               # Workflow management
│
├── tests/                         # Comprehensive tests
│   ├── test_base_agent.py
│   ├── test_agent_registry.py
│   ├── test_agent_task.py
│   ├── test_tourism_agents.py
│   ├── test_operations_agents.py
│   ├── test_analytics_agents.py
│   └── test_marketing_agents.py
│
└── README.md                      # This file
```

---

## 🤖 Agent Categories

### 1. Tourism & Sustainability (6 agents)

| Agent | Purpose | Key Features |
|-------|---------|--------------|
| **Itinerary Planner** | Create optimized tour itineraries | Route optimization, POI selection, time management |
| **Weather Advisor** | Provide weather forecasts and recommendations | Real-time weather data, seasonal advice, backup plans |
| **Cultural Guide** | Cultural insights and guidance | Historical context, customs, language tips |
| **Accessibility Advisor** | Accessibility recommendations | Wheelchair access, mobility assistance, special needs |
| **Sustainability Guide** | Eco-friendly travel suggestions | Carbon footprint, eco-tours, sustainable practices |
| **Emergency Assistant** | Emergency support and coordination | 24/7 assistance, medical emergencies, embassy contacts |

### 2. Operations & Support (7 agents)

| Agent | Purpose | Key Features |
|-------|---------|--------------|
| **Reservation Manager** | Manage bookings and reservations | Real-time availability, conflict resolution, confirmations |
| **Driver Coordinator** | Coordinate driver assignments | Route optimization, availability matching, communication |
| **Guide Scheduler** | Schedule tour guides | Availability management, skill matching, shift optimization |
| **Inventory Manager** | Manage tour inventory | Stock tracking, capacity management, resource allocation |
| **Customer Support** | Automated customer support | FAQ handling, ticket routing, sentiment analysis |
| **Feedback Analyzer** | Analyze customer feedback | Sentiment analysis, trend detection, actionable insights |
| **Crisis Manager** | Handle crisis situations | Emergency protocols, stakeholder communication, escalation |

### 3. Analytics & BI (7 agents)

| Agent | Purpose | Key Features |
|-------|---------|--------------|
| **Revenue Analyst** | Revenue analysis and reporting | Revenue trends, profitability analysis, forecasting |
| **Demand Forecaster** | Forecast tour demand | Time series analysis, seasonal patterns, ML predictions |
| **Pricing Optimizer** | Dynamic pricing optimization | Demand-based pricing, competitor analysis, revenue maximization |
| **Customer Segmentation** | Segment customers | RFM analysis, persona creation, targeting strategies |
| **Competitive Analyst** | Competitor analysis | Market intelligence, pricing comparison, trend analysis |
| **Performance Monitor** | Monitor KPIs and performance | Real-time dashboards, alerts, anomaly detection |
| **Churn Predictor** | Predict customer churn | Risk scoring, retention strategies, proactive intervention |

### 4. Content & Marketing (5 agents)

| Agent | Purpose | Key Features |
|-------|---------|--------------|
| **Content Generator** | Generate marketing content | Tour descriptions, blog posts, social media content |
| **Social Media Manager** | Manage social media presence | Post scheduling, engagement tracking, trend monitoring |
| **Email Campaigner** | Manage email campaigns | Segmentation, personalization, A/B testing, analytics |
| **SEO Optimizer** | Optimize content for search | Keyword research, on-page SEO, technical SEO |
| **Review Responder** | Respond to customer reviews | Sentiment analysis, automated responses, escalation |

---

## 🚀 Quick Start

### 1. Initialize the Registry

```python
import asyncio
from agents.base import AgentRegistry

async def main():
    # Get registry instance
    registry = await AgentRegistry.get_instance()
    
    # Import and register agents
    from agents.tourism import ItineraryPlannerAgent
    from agents.operations import ReservationManagerAgent
    
    itinerary_agent = ItineraryPlannerAgent()
    reservation_agent = ReservationManagerAgent()
    
    registry.register_agent(itinerary_agent)
    registry.register_agent(reservation_agent)
    
    # Initialize all agents
    await registry.initialize_all()
    
    # Check health
    health = await registry.health_check_all()
    print(health)

if __name__ == "__main__":
    asyncio.run(main())
```

### 2. Create and Execute a Task

```python
from agents.base import AgentTask, TaskPriority

# Create task
task = AgentTask(
    task_type="create_itinerary",
    agent_type="itinerary-planner",
    priority=TaskPriority.HIGH,
    payload={
        "customer_id": "cust-123",
        "destination": "Jerusalem",
        "start_date": "2025-12-01",
        "end_date": "2025-12-07",
        "group_size": 4,
        "interests": ["history", "archaeology", "food"],
        "budget_range": "mid"
    }
)

# Route and execute
result = await registry.route_task(task)
print(result)
```

### 3. Agent-to-Agent Communication

```python
from agents.base import AgentProtocol, AgentMessage, MessageType

protocol = AgentProtocol()

# Agent 1 requests weather data from Agent 2
message = AgentMessage(
    message_type=MessageType.REQUEST,
    from_agent_id=itinerary_agent.agent_id,
    to_agent_id=weather_agent.agent_id,
    subject="Weather Forecast Request",
    payload={
        "location": "Jerusalem",
        "start_date": "2025-12-01",
        "days": 7
    }
)

# Send message
await protocol.send_message(message)

# Agent 2 processes and replies
reply = message.create_reply(
    from_agent_id=weather_agent.agent_id,
    payload={
        "forecast": [...],
        "recommendations": [...]
    }
)

await protocol.send_message(reply)
```

---

## 📊 Monitoring & Metrics

### Agent Metrics

Each agent tracks:
- **Tasks processed** (total, succeeded, failed)
- **Execution time** (total, average)
- **Success rate** / **Failure rate**
- **Last activity timestamp**
- **Task history**

```python
# Get agent metrics
metrics = agent.get_metrics()
print(f"Success rate: {metrics['success_rate']:.2%}")
print(f"Avg execution time: {metrics['average_execution_time']:.2f}s")

# Get task history
history = agent.get_task_history(limit=10)
```

### Registry Statistics

```python
stats = registry.get_statistics()
print(stats)
# {
#     'total_agents': 25,
#     'active_agents': 23,
#     'tasks_routed': 1543,
#     'failed_routings': 7,
#     'routing_success_rate': 0.995,
#     'agent_types': 4,
#     ...
# }
```

### Health Checks

```python
# Check all agents
health = await registry.health_check_all()

# Check specific agent
agent_health = await agent.health_check()
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Agent-specific settings
export AGENT_ITINERARY_PLANNER_ENABLED=true
export AGENT_ITINERARY_PLANNER_TIMEOUT=600
export AGENT_ITINERARY_PLANNER_MAX_CONCURRENT_TASKS=20

# Feature flags
export AGENT_FEATURE_ENABLE_ML_PREDICTIONS=true
export AGENT_FEATURE_ENABLE_REAL_TIME_PROCESSING=true

# API keys (example)
export OPENWEATHER_API_KEY=your_key_here
export OPENAI_API_KEY=your_key_here
```

### YAML Configuration

See `config/configs/example-agent.yaml` for a complete configuration template.

---

## 🧪 Testing

Run tests:
```bash
# All agent tests
pytest backend/agents/tests/

# Specific category
pytest backend/agents/tests/test_tourism_agents.py

# With coverage
pytest --cov=backend/agents backend/agents/tests/
```

---

## 📝 Development Guidelines

### Creating a New Agent

1. **Inherit from BaseAgent**:
```python
from agents.base import BaseAgent, AgentCapability

class MyNewAgent(BaseAgent):
    def __init__(self, config=None):
        super().__init__(
            agent_name="My New Agent",
            agent_type="my-new-agent",
            capabilities={
                AgentCapability.DATA_ANALYSIS,
                AgentCapability.RECOMMENDATION
            },
            config=config
        )
```

2. **Implement process_task()**:
```python
async def process_task(self, task: AgentTask) -> Dict[str, Any]:
    # 1. Validate task
    if not await self.validate_task(task):
        raise ValueError("Invalid task")
    
    # 2. Process task logic
    result = await self._do_work(task.payload)
    
    # 3. Return result
    return {
        "status": "success",
        "data": result
    }
```

3. **Add configuration** (`config/configs/my-new-agent.yaml`):
```yaml
agent_type: "my-new-agent"
agent_name: "My New Agent"
enabled: true
max_concurrent_tasks: 10
timeout: 300
capabilities:
  - "data_analysis"
  - "recommendation"
parameters:
  # Agent-specific parameters
```

4. **Write tests** (`tests/test_my_new_agent.py`):
```python
import pytest
from agents.my_new_agent import MyNewAgent

@pytest.mark.asyncio
async def test_my_new_agent():
    agent = MyNewAgent()
    await agent.initialize()
    
    task = AgentTask(
        task_type="test",
        agent_type="my-new-agent",
        payload={"test": "data"}
    )
    
    result = await agent.execute_task(task)
    assert result['success'] is True
```

---

## 📚 Additional Resources

- **API Reference**: See individual agent files for detailed API documentation
- **Architecture Diagrams**: `docs/architecture/agents_system.md`
- **Deployment Guide**: `docs/deployment/agents_deployment.md`
- **Performance Tuning**: `docs/performance/agents_optimization.md`

---

## 🤝 Contributing

When adding new agents:
1. Follow the BaseAgent pattern
2. Add comprehensive documentation
3. Write unit and integration tests
4. Update this README
5. Add configuration file
6. Update feature flags if needed

---

## 📄 License

Copyright © 2025 Spirit Tours. All rights reserved.

---

**Author**: Spirit Tours Development Team  
**Date**: 2025-11-02  
**Version**: 1.0.0
