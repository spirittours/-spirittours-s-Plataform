"""
⚡ Email Marketing Automation & Workflow Engine
Motor de automatizaciones similar a Mailchimp Automations

Características:
- Workflows basados en triggers
- Delays y condiciones
- A/B testing en workflows
- Analytics en tiempo real
- Workflow templates predefinidos
- Custom events support
"""

from typing import List, Dict, Optional, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import logging
import json
from uuid import uuid4

logger = logging.getLogger(__name__)


class TriggerType(Enum):
    """Tipos de triggers para workflows"""
    WELCOME = "welcome"  # Nuevo suscriptor
    ABANDONED_CART = "abandoned_cart"  # Carrito abandonado
    POST_PURCHASE = "post_purchase"  # Después de compra
    BIRTHDAY = "birthday"  # Cumpleaños
    ANNIVERSARY = "anniversary"  # Aniversario
    RE_ENGAGEMENT = "re_engagement"  # Re-engagement de inactivos
    MILESTONE = "milestone"  # Milestone alcanzado
    CUSTOM_EVENT = "custom_event"  # Evento personalizado
    TAG_ADDED = "tag_added"  # Tag agregado
    SEGMENT_ENTERED = "segment_entered"  # Entró a segmento
    PRODUCT_VIEWED = "product_viewed"  # Vio producto
    PRICE_DROP = "price_drop"  # Bajó precio


class ActionType(Enum):
    """Tipos de acciones en workflow"""
    SEND_EMAIL = "send_email"
    WAIT = "wait"
    CONDITIONAL = "conditional"
    ADD_TAG = "add_tag"
    REMOVE_TAG = "remove_tag"
    UPDATE_FIELD = "update_field"
    SEND_SMS = "send_sms"
    SEND_WEBHOOK = "send_webhook"
    CREATE_TASK = "create_task"
    CHANGE_SEGMENT = "change_segment"
    AB_SPLIT = "ab_split"
    END_WORKFLOW = "end_workflow"


class ConditionType(Enum):
    """Tipos de condiciones"""
    EMAIL_OPENED = "email_opened"
    EMAIL_CLICKED = "email_clicked"
    LINK_CLICKED = "link_clicked"
    PURCHASED = "purchased"
    NOT_PURCHASED = "not_purchased"
    TAG_HAS = "tag_has"
    FIELD_EQUALS = "field_equals"
    CUSTOM = "custom"


@dataclass
class WorkflowTrigger:
    """Configuración del trigger del workflow"""
    trigger_type: TriggerType
    config: Dict[str, Any] = field(default_factory=dict)
    
    # Filtros adicionales
    filters: Optional[List[Dict[str, Any]]] = None
    
    # Días/hora específicos
    days_of_week: Optional[List[int]] = None  # 0=Monday, 6=Sunday
    time_of_day: Optional[str] = None  # "HH:MM"
    timezone: str = "UTC"


@dataclass
class WorkflowAction:
    """Acción individual en el workflow"""
    action_id: str = field(default_factory=lambda: str(uuid4()))
    action_type: ActionType = ActionType.SEND_EMAIL
    config: Dict[str, Any] = field(default_factory=dict)
    
    # Delay antes de ejecutar
    delay_minutes: int = 0
    delay_until: Optional[datetime] = None
    
    # Condiciones para ejecutar
    conditions: Optional[List[Dict[str, Any]]] = None
    
    # Branches (para conditionals y A/B splits)
    true_branch: Optional[List['WorkflowAction']] = None
    false_branch: Optional[List['WorkflowAction']] = None
    branches: Optional[Dict[str, List['WorkflowAction']]] = None  # Para A/B split


@dataclass
class WorkflowDefinition:
    """Definición completa de un workflow"""
    workflow_id: str = field(default_factory=lambda: str(uuid4()))
    name: str = ""
    description: str = ""
    
    # Trigger
    trigger: WorkflowTrigger = None
    
    # Acciones
    actions: List[WorkflowAction] = field(default_factory=list)
    
    # Estado
    is_active: bool = True
    
    # Analytics
    total_triggered: int = 0
    total_completed: int = 0
    total_revenue: float = 0.0
    
    # Metadata
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    
    # Goals
    goal_type: Optional[str] = None  # purchase, signup, engagement
    goal_value: Optional[float] = None


@dataclass
class WorkflowExecution:
    """Ejecución de workflow para un contacto específico"""
    execution_id: str = field(default_factory=lambda: str(uuid4()))
    workflow_id: str = ""
    contact_id: int = 0
    
    # Estado
    status: str = "running"  # running, completed, failed, paused
    current_action_index: int = 0
    
    # Datos del contexto
    context: Dict[str, Any] = field(default_factory=dict)
    
    # Timestamps
    started_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    next_action_at: Optional[datetime] = None
    
    # Resultados
    actions_completed: List[str] = field(default_factory=list)
    goal_achieved: bool = False
    revenue_generated: float = 0.0


class EmailAutomationEngine:
    """
    Motor principal de automatizaciones de email
    """
    
    def __init__(self, email_engine, database_session):
        self.email_engine = email_engine
        self.session = database_session
        
        # Workflows activos
        self.workflows: Dict[str, WorkflowDefinition] = {}
        
        # Ejecuciones en proceso
        self.executions: Dict[str, WorkflowExecution] = {}
        
        # Task queue para acciones programadas
        self.action_queue = asyncio.PriorityQueue()
        
        # Background tasks
        self.worker_task = None
        self.scheduler_task = None
        
        logger.info("Email Automation Engine initialized")
    
    async def start(self):
        """Iniciar engine de automatizaciones"""
        # Cargar workflows desde DB
        await self._load_workflows()
        
        # Iniciar workers
        self.worker_task = asyncio.create_task(self._action_worker())
        self.scheduler_task = asyncio.create_task(self._scheduler())
        
        logger.info("Email Automation Engine started")
    
    async def stop(self):
        """Detener engine"""
        if self.worker_task:
            self.worker_task.cancel()
        if self.scheduler_task:
            self.scheduler_task.cancel()
        
        logger.info("Email Automation Engine stopped")
    
    # ==================== WORKFLOW MANAGEMENT ====================
    
    def create_workflow(self, workflow: WorkflowDefinition) -> str:
        """Crear nuevo workflow"""
        self.workflows[workflow.workflow_id] = workflow
        
        # Guardar en DB
        self._save_workflow_to_db(workflow)
        
        logger.info(f"Created workflow: {workflow.name} ({workflow.workflow_id})")
        
        return workflow.workflow_id
    
    def activate_workflow(self, workflow_id: str):
        """Activar workflow"""
        if workflow_id in self.workflows:
            self.workflows[workflow_id].is_active = True
            logger.info(f"Activated workflow: {workflow_id}")
    
    def deactivate_workflow(self, workflow_id: str):
        """Desactivar workflow"""
        if workflow_id in self.workflows:
            self.workflows[workflow_id].is_active = False
            logger.info(f"Deactivated workflow: {workflow_id}")
    
    # ==================== TRIGGER HANDLING ====================
    
    async def handle_trigger(
        self,
        trigger_type: TriggerType,
        contact_id: int,
        event_data: Dict[str, Any]
    ):
        """
        Manejar trigger de evento
        
        Args:
            trigger_type: Tipo de trigger
            contact_id: ID del contacto
            event_data: Datos del evento
        """
        logger.info(f"Handling trigger {trigger_type.value} for contact {contact_id}")
        
        # Buscar workflows que escuchan este trigger
        matching_workflows = [
            wf for wf in self.workflows.values()
            if wf.is_active and wf.trigger.trigger_type == trigger_type
        ]
        
        # Iniciar ejecución para cada workflow
        for workflow in matching_workflows:
            # Verificar filtros
            if not self._check_trigger_filters(workflow.trigger, event_data):
                continue
            
            # Crear ejecución
            execution = WorkflowExecution(
                workflow_id=workflow.workflow_id,
                contact_id=contact_id,
                context=event_data
            )
            
            self.executions[execution.execution_id] = execution
            
            # Programar primera acción
            await self._schedule_next_action(execution)
            
            # Actualizar contador
            workflow.total_triggered += 1
            
            logger.info(f"Started workflow execution: {execution.execution_id}")
    
    def _check_trigger_filters(
        self,
        trigger: WorkflowTrigger,
        event_data: Dict[str, Any]
    ) -> bool:
        """Verificar si el evento cumple con los filtros del trigger"""
        if not trigger.filters:
            return True
        
        for filter_rule in trigger.filters:
            field = filter_rule.get('field')
            operator = filter_rule.get('operator')
            value = filter_rule.get('value')
            
            field_value = event_data.get(field)
            
            # Evaluar condición
            if operator == "equals" and field_value != value:
                return False
            elif operator == "not_equals" and field_value == value:
                return False
            elif operator == "greater_than" and not (field_value > value):
                return False
            elif operator == "less_than" and not (field_value < value):
                return False
        
        return True
    
    # ==================== ACTION EXECUTION ====================
    
    async def _schedule_next_action(self, execution: WorkflowExecution):
        """Programar siguiente acción del workflow"""
        workflow = self.workflows.get(execution.workflow_id)
        if not workflow:
            logger.error(f"Workflow {execution.workflow_id} not found")
            return
        
        # Verificar si hay más acciones
        if execution.current_action_index >= len(workflow.actions):
            # Workflow completado
            await self._complete_execution(execution)
            return
        
        # Obtener siguiente acción
        action = workflow.actions[execution.current_action_index]
        
        # Calcular cuándo ejecutar
        if action.delay_until:
            execute_at = action.delay_until
        elif action.delay_minutes > 0:
            execute_at = datetime.utcnow() + timedelta(minutes=action.delay_minutes)
        else:
            execute_at = datetime.utcnow()
        
        execution.next_action_at = execute_at
        
        # Agregar a cola con prioridad (timestamp)
        priority = int(execute_at.timestamp())
        await self.action_queue.put((priority, execution.execution_id, action.action_id))
        
        logger.debug(f"Scheduled action {action.action_id} for {execute_at}")
    
    async def _action_worker(self):
        """Worker que procesa acciones programadas"""
        logger.info("Action worker started")
        
        while True:
            try:
                # Obtener siguiente acción
                priority, execution_id, action_id = await self.action_queue.get()
                
                # Verificar si es tiempo de ejecutar
                execute_at = datetime.fromtimestamp(priority)
                now = datetime.utcnow()
                
                if execute_at > now:
                    # Todavía no es tiempo, devolver a la cola
                    await self.action_queue.put((priority, execution_id, action_id))
                    await asyncio.sleep(1)
                    continue
                
                # Ejecutar acción
                await self._execute_action(execution_id, action_id)
                
            except asyncio.CancelledError:
                logger.info("Action worker stopped")
                break
            except Exception as e:
                logger.error(f"Error in action worker: {e}")
                await asyncio.sleep(1)
    
    async def _execute_action(self, execution_id: str, action_id: str):
        """Ejecutar acción específica"""
        execution = self.executions.get(execution_id)
        if not execution:
            logger.error(f"Execution {execution_id} not found")
            return
        
        workflow = self.workflows.get(execution.workflow_id)
        if not workflow:
            logger.error(f"Workflow {execution.workflow_id} not found")
            return
        
        action = workflow.actions[execution.current_action_index]
        
        logger.info(f"Executing action {action.action_type.value} for execution {execution_id}")
        
        try:
            # Ejecutar según tipo de acción
            if action.action_type == ActionType.SEND_EMAIL:
                await self._execute_send_email(execution, action)
            
            elif action.action_type == ActionType.WAIT:
                # Ya esperamos, solo continuar
                pass
            
            elif action.action_type == ActionType.CONDITIONAL:
                await self._execute_conditional(execution, action)
            
            elif action.action_type == ActionType.ADD_TAG:
                await self._execute_add_tag(execution, action)
            
            elif action.action_type == ActionType.AB_SPLIT:
                await self._execute_ab_split(execution, action)
            
            elif action.action_type == ActionType.END_WORKFLOW:
                await self._complete_execution(execution)
                return
            
            # Marcar acción como completada
            execution.actions_completed.append(action.action_id)
            execution.current_action_index += 1
            
            # Programar siguiente acción
            await self._schedule_next_action(execution)
            
        except Exception as e:
            logger.error(f"Error executing action {action.action_id}: {e}")
            execution.status = "failed"
    
    async def _execute_send_email(
        self,
        execution: WorkflowExecution,
        action: WorkflowAction
    ):
        """Ejecutar acción de envío de email"""
        template_id = action.config.get('template_id')
        subject = action.config.get('subject', '')
        
        # Obtener datos del contacto
        contact_data = await self._get_contact_data(execution.contact_id)
        
        # Merge variables desde contexto y contacto
        merge_vars = {
            **execution.context,
            **contact_data
        }
        
        # Crear y enviar email
        from backend.email_marketing.core.email_engine import create_email_message
        
        message = create_email_message(
            to_email=contact_data['email'],
            subject=subject,
            html_content=self._render_template(template_id, merge_vars),
            merge_vars=merge_vars,
            campaign_id=execution.workflow_id,
            contact_id=execution.contact_id
        )
        
        result = await self.email_engine.send_email(message)
        
        logger.info(f"Sent email to {contact_data['email']}: {result}")
    
    async def _execute_conditional(
        self,
        execution: WorkflowExecution,
        action: WorkflowAction
    ):
        """Ejecutar acción condicional"""
        condition_type = action.config.get('condition_type')
        condition_value = action.config.get('condition_value')
        
        # Evaluar condición
        condition_met = await self._evaluate_condition(
            execution,
            condition_type,
            condition_value
        )
        
        # Elegir branch
        if condition_met and action.true_branch:
            # Insertar acciones del branch true
            workflow = self.workflows[execution.workflow_id]
            workflow.actions[execution.current_action_index:execution.current_action_index] = action.true_branch
        elif not condition_met and action.false_branch:
            # Insertar acciones del branch false
            workflow = self.workflows[execution.workflow_id]
            workflow.actions[execution.current_action_index:execution.current_action_index] = action.false_branch
        
        logger.info(f"Conditional evaluated to {condition_met}")
    
    async def _execute_add_tag(
        self,
        execution: WorkflowExecution,
        action: WorkflowAction
    ):
        """Agregar tag a contacto"""
        tag = action.config.get('tag')
        
        # Agregar tag en base de datos
        # TODO: Implementar en DB
        logger.info(f"Added tag '{tag}' to contact {execution.contact_id}")
    
    async def _execute_ab_split(
        self,
        execution: WorkflowExecution,
        action: WorkflowAction
    ):
        """Ejecutar A/B split"""
        # Asignar variante aleatoriamente
        import random
        variants = list(action.branches.keys())
        chosen_variant = random.choice(variants)
        
        # Insertar acciones de la variante elegida
        workflow = self.workflows[execution.workflow_id]
        workflow.actions[execution.current_action_index:execution.current_action_index] = action.branches[chosen_variant]
        
        # Guardar variante en contexto
        execution.context['ab_variant'] = chosen_variant
        
        logger.info(f"A/B split chose variant: {chosen_variant}")
    
    async def _evaluate_condition(
        self,
        execution: WorkflowExecution,
        condition_type: str,
        condition_value: Any
    ) -> bool:
        """Evaluar condición"""
        
        if condition_type == "email_opened":
            # Verificar si se abrió el último email
            # TODO: Consultar en DB
            return True  # Placeholder
        
        elif condition_type == "email_clicked":
            # Verificar si se hizo click en el último email
            # TODO: Consultar en DB
            return False  # Placeholder
        
        elif condition_type == "purchased":
            # Verificar si compró
            # TODO: Consultar en DB
            return False  # Placeholder
        
        else:
            return False
    
    async def _complete_execution(self, execution: WorkflowExecution):
        """Completar ejecución de workflow"""
        execution.status = "completed"
        execution.completed_at = datetime.utcnow()
        
        # Actualizar workflow stats
        workflow = self.workflows.get(execution.workflow_id)
        if workflow:
            workflow.total_completed += 1
            workflow.total_revenue += execution.revenue_generated
        
        logger.info(f"Completed workflow execution: {execution.execution_id}")
        
        # Remover de ejecuciones activas (opcional, o mover a histórico)
        # del self.executions[execution.execution_id]
    
    # ==================== HELPERS ====================
    
    async def _get_contact_data(self, contact_id: int) -> Dict[str, Any]:
        """Obtener datos del contacto"""
        # TODO: Consultar en DB
        return {
            'email': f'user{contact_id}@example.com',
            'first_name': 'John',
            'last_name': 'Doe'
        }
    
    def _render_template(self, template_id: int, merge_vars: Dict[str, Any]) -> str:
        """Renderizar template con variables"""
        # TODO: Obtener template de DB y renderizar
        return "<html><body>Hello {{first_name}}!</body></html>"
    
    async def _load_workflows(self):
        """Cargar workflows desde DB"""
        # TODO: Implementar carga desde DB
        logger.info("Loaded workflows from database")
    
    def _save_workflow_to_db(self, workflow: WorkflowDefinition):
        """Guardar workflow en DB"""
        # TODO: Implementar guardado en DB
        logger.info(f"Saved workflow {workflow.workflow_id} to database")
    
    async def _scheduler(self):
        """Scheduler para verificar workflows programados"""
        logger.info("Workflow scheduler started")
        
        while True:
            try:
                # Aquí se pueden programar workflows recurrentes
                # Por ejemplo, re-engagement automático cada semana
                await asyncio.sleep(60)  # Revisar cada minuto
                
            except asyncio.CancelledError:
                logger.info("Workflow scheduler stopped")
                break
            except Exception as e:
                logger.error(f"Error in scheduler: {e}")


# ==================== WORKFLOW TEMPLATES ====================

class WorkflowTemplates:
    """Plantillas predefinidas de workflows"""
    
    @staticmethod
    def welcome_series() -> WorkflowDefinition:
        """Serie de bienvenida (3 emails)"""
        return WorkflowDefinition(
            name="Welcome Series",
            description="3-email welcome sequence for new subscribers",
            trigger=WorkflowTrigger(
                trigger_type=TriggerType.WELCOME
            ),
            actions=[
                # Email 1: Bienvenida inmediata
                WorkflowAction(
                    action_type=ActionType.SEND_EMAIL,
                    config={
                        'template_id': 1,
                        'subject': 'Welcome to {{company_name}}!'
                    },
                    delay_minutes=0
                ),
                # Esperar 2 días
                WorkflowAction(
                    action_type=ActionType.WAIT,
                    delay_minutes=2880  # 48 horas
                ),
                # Email 2: Características
                WorkflowAction(
                    action_type=ActionType.SEND_EMAIL,
                    config={
                        'template_id': 2,
                        'subject': 'Discover what you can do with {{company_name}}'
                    },
                    delay_minutes=0
                ),
                # Esperar 3 días
                WorkflowAction(
                    action_type=ActionType.WAIT,
                    delay_minutes=4320  # 72 horas
                ),
                # Email 3: Oferta especial
                WorkflowAction(
                    action_type=ActionType.SEND_EMAIL,
                    config={
                        'template_id': 3,
                        'subject': 'Exclusive offer just for you!'
                    },
                    delay_minutes=0
                )
            ],
            goal_type="purchase"
        )
    
    @staticmethod
    def abandoned_cart() -> WorkflowDefinition:
        """Recuperación de carrito abandonado"""
        return WorkflowDefinition(
            name="Abandoned Cart Recovery",
            description="Recover abandoned carts with 3-email sequence",
            trigger=WorkflowTrigger(
                trigger_type=TriggerType.ABANDONED_CART
            ),
            actions=[
                # Esperar 1 hora
                WorkflowAction(
                    action_type=ActionType.WAIT,
                    delay_minutes=60
                ),
                # Email 1: Recordatorio
                WorkflowAction(
                    action_type=ActionType.SEND_EMAIL,
                    config={
                        'template_id': 10,
                        'subject': 'You left something in your cart'
                    }
                ),
                # Condicional: ¿Compró?
                WorkflowAction(
                    action_type=ActionType.CONDITIONAL,
                    config={
                        'condition_type': 'purchased',
                        'condition_value': True
                    },
                    true_branch=[
                        WorkflowAction(action_type=ActionType.END_WORKFLOW)
                    ],
                    false_branch=[
                        # Esperar 24 horas
                        WorkflowAction(
                            action_type=ActionType.WAIT,
                            delay_minutes=1440
                        ),
                        # Email 2: Urgencia
                        WorkflowAction(
                            action_type=ActionType.SEND_EMAIL,
                            config={
                                'template_id': 11,
                                'subject': 'Your cart expires soon!'
                            }
                        )
                    ]
                )
            ],
            goal_type="purchase"
        )
    
    @staticmethod
    def re_engagement() -> WorkflowDefinition:
        """Re-engagement de usuarios inactivos"""
        return WorkflowDefinition(
            name="Re-Engagement Campaign",
            description="Win back inactive subscribers",
            trigger=WorkflowTrigger(
                trigger_type=TriggerType.RE_ENGAGEMENT
            ),
            actions=[
                # Email 1: ¿Todavía interesado?
                WorkflowAction(
                    action_type=ActionType.SEND_EMAIL,
                    config={
                        'template_id': 20,
                        'subject': 'We miss you! Come back for 20% off'
                    }
                ),
                # Esperar 7 días
                WorkflowAction(
                    action_type=ActionType.WAIT,
                    delay_minutes=10080
                ),
                # Condicional: ¿Abrió email?
                WorkflowAction(
                    action_type=ActionType.CONDITIONAL,
                    config={
                        'condition_type': 'email_opened',
                        'condition_value': True
                    },
                    false_branch=[
                        # Email final: Última oportunidad
                        WorkflowAction(
                            action_type=ActionType.SEND_EMAIL,
                            config={
                                'template_id': 21,
                                'subject': 'Last chance: 30% off before we say goodbye'
                            }
                        )
                    ]
                )
            ]
        )


# ==================== EXAMPLE USAGE ====================

async def example_usage():
    """Ejemplo de uso del motor de automatizaciones"""
    
    # Crear engine (necesita email_engine y db_session reales)
    engine = EmailAutomationEngine(
        email_engine=None,  # Placeholder
        database_session=None  # Placeholder
    )
    
    # Crear workflow de bienvenida
    welcome_workflow = WorkflowTemplates.welcome_series()
    workflow_id = engine.create_workflow(welcome_workflow)
    
    print(f"Created workflow: {workflow_id}")
    
    # Activar workflow
    engine.activate_workflow(workflow_id)
    
    # Iniciar engine
    await engine.start()
    
    # Simular trigger de nuevo suscriptor
    await engine.handle_trigger(
        trigger_type=TriggerType.WELCOME,
        contact_id=123,
        event_data={
            'email': 'newuser@example.com',
            'first_name': 'John',
            'company_name': 'Spirit Tours'
        }
    )
    
    # Esperar un tiempo para que se procesen acciones
    await asyncio.sleep(5)
    
    # Detener engine
    await engine.stop()


if __name__ == "__main__":
    asyncio.run(example_usage())
