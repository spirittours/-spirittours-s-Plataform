"""
Workflow Execution Engine
Executes automated workflows
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import asyncio
from enum import Enum

class NodeType(Enum):
    TRIGGER = "trigger"
    ACTION = "action"
    CONDITION = "condition"

class WorkflowEngine:
    """
    Workflow execution engine
    Handles automated workflow execution
    """
    
    def __init__(self):
        self.workflows: Dict[str, Dict] = {}
        self.running_workflows: Dict[str, bool] = {}
    
    async def register_workflow(self, workflow_id: str, workflow_data: Dict):
        """Register a new workflow"""
        self.workflows[workflow_id] = {
            "id": workflow_id,
            "name": workflow_data.get("name", "Untitled"),
            "nodes": workflow_data.get("nodes", []),
            "edges": workflow_data.get("edges", []),
            "enabled": True,
            "created_at": datetime.utcnow()
        }
    
    async def execute_workflow(
        self,
        workflow_id: str,
        trigger_data: Optional[Dict] = None
    ) -> Dict:
        """Execute a workflow"""
        if workflow_id not in self.workflows:
            raise ValueError(f"Workflow {workflow_id} not found")
        
        workflow = self.workflows[workflow_id]
        if not workflow.get("enabled"):
            return {"status": "skipped", "reason": "workflow disabled"}
        
        # Mark as running
        self.running_workflows[workflow_id] = True
        
        try:
            # Execute workflow nodes in order
            context = {"trigger_data": trigger_data or {}}
            results = []
            
            # Start with trigger nodes
            trigger_nodes = [
                node for node in workflow["nodes"]
                if node.get("type") == NodeType.TRIGGER.value
            ]
            
            for node in trigger_nodes:
                result = await self._execute_node(node, context)
                results.append(result)
                
                # Execute connected nodes
                await self._execute_connected_nodes(node, workflow, context, results)
            
            return {
                "status": "completed",
                "workflow_id": workflow_id,
                "results": results,
                "executed_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "failed",
                "workflow_id": workflow_id,
                "error": str(e),
                "executed_at": datetime.utcnow().isoformat()
            }
        finally:
            self.running_workflows[workflow_id] = False
    
    async def _execute_node(self, node: Dict, context: Dict) -> Dict:
        """Execute a single node"""
        node_type = node.get("type")
        node_id = node.get("id")
        config = node.get("data", {}).get("config", {})
        
        if node_type == NodeType.ACTION.value:
            return await self._execute_action(node_id, config, context)
        elif node_type == NodeType.CONDITION.value:
            return await self._execute_condition(node_id, config, context)
        
        return {"node_id": node_id, "status": "skipped"}
    
    async def _execute_action(self, node_id: str, config: Dict, context: Dict) -> Dict:
        """Execute an action node"""
        action_type = node_id.split("-")[0]
        
        if action_type == "send_email":
            # Send email
            await self._send_email(config, context)
            return {"node_id": node_id, "status": "success", "action": "email_sent"}
        
        elif action_type == "send_sms":
            # Send SMS
            await self._send_sms(config, context)
            return {"node_id": node_id, "status": "success", "action": "sms_sent"}
        
        elif action_type == "create_ticket":
            # Create support ticket
            await self._create_ticket(config, context)
            return {"node_id": node_id, "status": "success", "action": "ticket_created"}
        
        return {"node_id": node_id, "status": "unknown_action"}
    
    async def _execute_condition(self, node_id: str, config: Dict, context: Dict) -> Dict:
        """Execute a condition node"""
        condition_type = node_id.split("-")[0]
        
        if condition_type == "delay":
            delay_seconds = config.get("delay_seconds", 60)
            await asyncio.sleep(delay_seconds)
            return {"node_id": node_id, "status": "success", "delayed": delay_seconds}
        
        elif condition_type == "if_then":
            # Evaluate condition
            condition_met = await self._evaluate_condition(config, context)
            return {
                "node_id": node_id,
                "status": "success",
                "condition_met": condition_met
            }
        
        return {"node_id": node_id, "status": "unknown_condition"}
    
    async def _execute_connected_nodes(
        self,
        current_node: Dict,
        workflow: Dict,
        context: Dict,
        results: List
    ):
        """Execute nodes connected to the current node"""
        current_id = current_node.get("id")
        edges = workflow.get("edges", [])
        
        # Find edges starting from current node
        connected_edges = [edge for edge in edges if edge.get("source") == current_id]
        
        for edge in connected_edges:
            target_id = edge.get("target")
            target_node = next(
                (node for node in workflow["nodes"] if node.get("id") == target_id),
                None
            )
            
            if target_node:
                result = await self._execute_node(target_node, context)
                results.append(result)
                
                # Recursively execute connected nodes
                await self._execute_connected_nodes(target_node, workflow, context, results)
    
    async def _send_email(self, config: Dict, context: Dict):
        """Send email action"""
        # Implementation would integrate with notification service
        pass
    
    async def _send_sms(self, config: Dict, context: Dict):
        """Send SMS action"""
        # Implementation would integrate with SMS service
        pass
    
    async def _create_ticket(self, config: Dict, context: Dict):
        """Create support ticket action"""
        # Implementation would integrate with ticketing system
        pass
    
    async def _evaluate_condition(self, config: Dict, context: Dict) -> bool:
        """Evaluate a condition"""
        # Implement condition evaluation logic
        return True


# Global workflow engine instance
workflow_engine = WorkflowEngine()
