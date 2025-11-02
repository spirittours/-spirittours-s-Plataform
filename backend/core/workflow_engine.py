"""
Workflow Engine para orquestación de procesos complejos
Implementa Saga pattern y manejo de transacciones distribuidas
"""

import asyncio
import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Callable, Optional, Union
from enum import Enum
from dataclasses import dataclass, asdict
import inspect

from core.event_bus import EventBus, Event, EventType, EventMetadata, get_event_bus

logger = logging.getLogger(__name__)


class WorkflowStatus(Enum):
    """Estados posibles de un workflow"""
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    COMPENSATING = "COMPENSATING"  # Ejecutando compensación (rollback)
    COMPENSATED = "COMPENSATED"     # Compensación completada


class StepStatus(Enum):
    """Estados posibles de un paso del workflow"""
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"
    COMPENSATING = "COMPENSATING"
    COMPENSATED = "COMPENSATED"


@dataclass
class StepResult:
    """Resultado de la ejecución de un paso"""
    status: StepStatus
    output: Any
    error: Optional[str] = None
    duration: Optional[float] = None
    retries: int = 0


class WorkflowStep:
    """
    Representa un paso en el workflow con capacidad de compensación
    """
    
    def __init__(
        self,
        name: str,
        handler: Callable,
        compensator: Optional[Callable] = None,
        condition: Optional[Callable] = None,
        retries: int = 3,
        timeout: Optional[float] = None,
        depends_on: Optional[List[str]] = None,
        parallel_group: Optional[str] = None
    ):
        self.name = name
        self.handler = handler
        self.compensator = compensator
        self.condition = condition
        self.retries = retries
        self.timeout = timeout
        self.depends_on = depends_on or []
        self.parallel_group = parallel_group
        self.status = StepStatus.PENDING
        self.result: Optional[StepResult] = None
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
    
    async def execute(self, context: Dict[str, Any]) -> StepResult:
        """
        Ejecutar el paso del workflow
        """
        self.status = StepStatus.RUNNING
        self.start_time = datetime.utcnow()
        
        # Verificar condición
        if self.condition:
            try:
                should_run = await self._call_handler(self.condition, context)
                if not should_run:
                    self.status = StepStatus.SKIPPED
                    return StepResult(
                        status=StepStatus.SKIPPED,
                        output=None
                    )
            except Exception as e:
                logger.error(f"Error checking condition for {self.name}: {str(e)}")
        
        # Ejecutar con reintentos
        last_error = None
        for attempt in range(self.retries):
            try:
                # Ejecutar con timeout si está configurado
                if self.timeout:
                    output = await asyncio.wait_for(
                        self._call_handler(self.handler, context),
                        timeout=self.timeout
                    )
                else:
                    output = await self._call_handler(self.handler, context)
                
                # Éxito
                self.status = StepStatus.COMPLETED
                self.end_time = datetime.utcnow()
                duration = (self.end_time - self.start_time).total_seconds()
                
                self.result = StepResult(
                    status=StepStatus.COMPLETED,
                    output=output,
                    duration=duration,
                    retries=attempt
                )
                
                return self.result
                
            except asyncio.TimeoutError:
                last_error = f"Timeout after {self.timeout} seconds"
                logger.error(f"Step {self.name} timeout (attempt {attempt + 1}/{self.retries})")
                
            except Exception as e:
                last_error = str(e)
                logger.error(f"Step {self.name} failed (attempt {attempt + 1}/{self.retries}): {str(e)}")
                
                if attempt < self.retries - 1:
                    # Espera exponencial entre reintentos
                    await asyncio.sleep(2 ** attempt)
        
        # Fallo después de todos los reintentos
        self.status = StepStatus.FAILED
        self.end_time = datetime.utcnow()
        duration = (self.end_time - self.start_time).total_seconds()
        
        self.result = StepResult(
            status=StepStatus.FAILED,
            output=None,
            error=last_error,
            duration=duration,
            retries=self.retries
        )
        
        return self.result
    
    async def compensate(self, context: Dict[str, Any]) -> bool:
        """
        Ejecutar compensación (rollback) del paso
        """
        if not self.compensator:
            logger.warning(f"No compensator defined for step {self.name}")
            return True
        
        self.status = StepStatus.COMPENSATING
        
        try:
            await self._call_handler(self.compensator, context)
            self.status = StepStatus.COMPENSATED
            return True
            
        except Exception as e:
            logger.error(f"Compensation failed for step {self.name}: {str(e)}")
            return False
    
    async def _call_handler(self, handler: Callable, context: Dict[str, Any]) -> Any:
        """
        Llamar handler con contexto, soporta funciones síncronas y asíncronas
        """
        if inspect.iscoroutinefunction(handler):
            return await handler(context)
        else:
            return handler(context)


class Workflow:
    """
    Workflow completo con múltiples pasos y capacidad de saga
    """
    
    def __init__(
        self,
        workflow_id: str,
        name: str,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.id = workflow_id
        self.name = name
        self.description = description
        self.metadata = metadata or {}
        self.steps: List[WorkflowStep] = []
        self.context: Dict[str, Any] = {}
        self.status = WorkflowStatus.PENDING
        self.current_step_index = 0
        self.created_at = datetime.utcnow()
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.error: Optional[str] = None
        self.event_bus: Optional[EventBus] = None
    
    def add_step(self, step: WorkflowStep) -> 'Workflow':
        """
        Agregar paso al workflow
        """
        self.steps.append(step)
        return self
    
    def add_parallel_steps(self, steps: List[WorkflowStep], group_name: str) -> 'Workflow':
        """
        Agregar pasos que se ejecutan en paralelo
        """
        for step in steps:
            step.parallel_group = group_name
            self.steps.append(step)
        return self
    
    async def execute(self, initial_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Ejecutar el workflow completo
        """
        self.status = WorkflowStatus.RUNNING
        self.started_at = datetime.utcnow()
        self.context.update(initial_context or {})
        
        # Obtener event bus
        self.event_bus = await get_event_bus()
        
        # Publicar evento de inicio
        await self._publish_event(EventType.WORKFLOW_STARTED)
        
        try:
            # Ejecutar pasos
            await self._execute_steps()
            
            # Workflow completado
            self.status = WorkflowStatus.COMPLETED
            self.completed_at = datetime.utcnow()
            
            # Publicar evento de completación
            await self._publish_event(EventType.WORKFLOW_COMPLETED)
            
            return {
                'status': 'success',
                'workflow_id': self.id,
                'context': self.context,
                'duration': (self.completed_at - self.started_at).total_seconds()
            }
            
        except Exception as e:
            self.error = str(e)
            logger.error(f"Workflow {self.id} failed: {str(e)}")
            
            # Ejecutar compensación
            await self._compensate()
            
            # Publicar evento de fallo
            await self._publish_event(EventType.WORKFLOW_FAILED)
            
            return {
                'status': 'failed',
                'workflow_id': self.id,
                'error': self.error,
                'context': self.context
            }
    
    async def _execute_steps(self):
        """
        Ejecutar todos los pasos del workflow
        """
        # Agrupar pasos por dependencias y paralelismo
        step_groups = self._organize_steps()
        
        for group in step_groups:
            if len(group) == 1:
                # Ejecutar paso individual
                step = group[0]
                await self._execute_single_step(step)
            else:
                # Ejecutar pasos en paralelo
                await self._execute_parallel_steps(group)
    
    async def _execute_single_step(self, step: WorkflowStep):
        """
        Ejecutar un solo paso
        """
        self.current_step_index = self.steps.index(step)
        
        # Verificar dependencias
        if not self._check_dependencies(step):
            step.status = StepStatus.SKIPPED
            return
        
        # Ejecutar paso
        result = await step.execute(self.context)
        
        # Actualizar contexto con resultado
        self.context[f"{step.name}_result"] = result.output
        self.context[f"{step.name}_status"] = result.status.value
        
        # Publicar evento de paso completado
        await self._publish_event(
            EventType.WORKFLOW_STEP_COMPLETED,
            {'step_name': step.name, 'status': result.status.value}
        )
        
        # Si falló, lanzar excepción para iniciar compensación
        if result.status == StepStatus.FAILED:
            raise Exception(f"Step {step.name} failed: {result.error}")
    
    async def _execute_parallel_steps(self, steps: List[WorkflowStep]):
        """
        Ejecutar pasos en paralelo
        """
        tasks = []
        for step in steps:
            # Verificar dependencias
            if not self._check_dependencies(step):
                step.status = StepStatus.SKIPPED
                continue
            
            task = asyncio.create_task(step.execute(self.context))
            tasks.append((step, task))
        
        # Esperar a que todos terminen
        results = []
        for step, task in tasks:
            try:
                result = await task
                results.append((step, result))
                
                # Actualizar contexto
                self.context[f"{step.name}_result"] = result.output
                self.context[f"{step.name}_status"] = result.status.value
                
                # Publicar evento
                await self._publish_event(
                    EventType.WORKFLOW_STEP_COMPLETED,
                    {'step_name': step.name, 'status': result.status.value}
                )
                
            except Exception as e:
                logger.error(f"Parallel step {step.name} failed: {str(e)}")
                # Cancelar otros tasks
                for _, t in tasks:
                    if not t.done():
                        t.cancel()
                raise
        
        # Verificar si alguno falló
        for step, result in results:
            if result.status == StepStatus.FAILED:
                raise Exception(f"Parallel step {step.name} failed: {result.error}")
    
    def _organize_steps(self) -> List[List[WorkflowStep]]:
        """
        Organizar pasos en grupos según dependencias y paralelismo
        """
        groups = []
        processed = set()
        
        while len(processed) < len(self.steps):
            current_group = []
            
            for step in self.steps:
                if step.name in processed:
                    continue
                
                # Verificar si todas las dependencias están procesadas
                if all(dep in processed for dep in step.depends_on):
                    # Si es parte de un grupo paralelo
                    if step.parallel_group:
                        # Agregar todos los pasos del mismo grupo
                        for s in self.steps:
                            if s.parallel_group == step.parallel_group and s.name not in processed:
                                current_group.append(s)
                                processed.add(s.name)
                    else:
                        current_group.append(step)
                        processed.add(step.name)
            
            if current_group:
                groups.append(current_group)
            else:
                # Prevenir loop infinito si hay dependencias circulares
                logger.error("Circular dependency detected in workflow")
                break
        
        return groups
    
    def _check_dependencies(self, step: WorkflowStep) -> bool:
        """
        Verificar si las dependencias de un paso están completas
        """
        for dep_name in step.depends_on:
            dep_step = self._get_step_by_name(dep_name)
            if not dep_step or dep_step.status != StepStatus.COMPLETED:
                return False
        return True
    
    def _get_step_by_name(self, name: str) -> Optional[WorkflowStep]:
        """
        Obtener paso por nombre
        """
        for step in self.steps:
            if step.name == name:
                return step
        return None
    
    async def _compensate(self):
        """
        Ejecutar compensación (rollback) de pasos completados
        """
        self.status = WorkflowStatus.COMPENSATING
        logger.info(f"Starting compensation for workflow {self.id}")
        
        # Compensar en orden inverso
        for step in reversed(self.steps):
            if step.status == StepStatus.COMPLETED:
                success = await step.compensate(self.context)
                if not success:
                    logger.error(f"Failed to compensate step {step.name}")
        
        self.status = WorkflowStatus.COMPENSATED
    
    async def _publish_event(self, event_type: EventType, extra_data: Optional[Dict[str, Any]] = None):
        """
        Publicar evento del workflow
        """
        if not self.event_bus:
            return
        
        payload = {
            'workflow_id': self.id,
            'workflow_name': self.name,
            'status': self.status.value,
            'current_step': self.current_step_index
        }
        
        if extra_data:
            payload.update(extra_data)
        
        await self.event_bus.publish(
            event_type,
            payload,
            EventMetadata(
                correlation_id=self.id,
                service_name='workflow_engine'
            )
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convertir workflow a diccionario
        """
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'status': self.status.value,
            'steps': [
                {
                    'name': step.name,
                    'status': step.status.value,
                    'result': asdict(step.result) if step.result else None
                }
                for step in self.steps
            ],
            'context': self.context,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'error': self.error
        }


class WorkflowEngine:
    """
    Motor de workflows para gestionar múltiples workflows
    """
    
    def __init__(self):
        self.workflows: Dict[str, Workflow] = {}
        self.templates: Dict[str, Callable] = {}
        self.event_bus: Optional[EventBus] = None
    
    async def initialize(self):
        """
        Inicializar el motor de workflows
        """
        self.event_bus = await get_event_bus()
        
        # Registrar templates predefinidos
        self._register_default_templates()
    
    def register_template(self, name: str, builder: Callable) -> None:
        """
        Registrar template de workflow
        """
        self.templates[name] = builder
    
    def _register_default_templates(self):
        """
        Registrar templates de workflow predefinidos
        """
        # Template de cotización completa
        self.register_template('complete_quotation', self._create_quotation_workflow)
        
        # Template de reserva
        self.register_template('booking_confirmation', self._create_booking_workflow)
        
        # Template de asignación de guías
        self.register_template('guide_assignment', self._create_guide_assignment_workflow)
    
    async def create_workflow(
        self,
        template_name: str,
        workflow_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Workflow:
        """
        Crear workflow desde template
        """
        if template_name not in self.templates:
            raise ValueError(f"Template {template_name} not found")
        
        workflow_id = workflow_id or str(uuid.uuid4())
        
        # Crear workflow usando template
        workflow = await self.templates[template_name](workflow_id, context or {})
        
        # Guardar workflow
        self.workflows[workflow_id] = workflow
        
        return workflow
    
    async def execute_workflow(
        self,
        workflow_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Ejecutar workflow
        """
        if workflow_id not in self.workflows:
            raise ValueError(f"Workflow {workflow_id} not found")
        
        workflow = self.workflows[workflow_id]
        result = await workflow.execute(context)
        
        return result
    
    async def get_workflow_status(self, workflow_id: str) -> Dict[str, Any]:
        """
        Obtener estado del workflow
        """
        if workflow_id not in self.workflows:
            raise ValueError(f"Workflow {workflow_id} not found")
        
        return self.workflows[workflow_id].to_dict()
    
    async def cancel_workflow(self, workflow_id: str) -> bool:
        """
        Cancelar workflow
        """
        if workflow_id not in self.workflows:
            return False
        
        workflow = self.workflows[workflow_id]
        
        if workflow.status in [WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED]:
            return False
        
        workflow.status = WorkflowStatus.CANCELLED
        
        # Ejecutar compensación
        await workflow._compensate()
        
        return True
    
    async def _create_quotation_workflow(
        self,
        workflow_id: str,
        context: Dict[str, Any]
    ) -> Workflow:
        """
        Crear workflow de cotización completa
        """
        workflow = Workflow(
            workflow_id=workflow_id,
            name="Complete Quotation Process",
            description="Proceso completo de generación de cotización"
        )
        
        # Paso 1: Validar datos del grupo
        workflow.add_step(WorkflowStep(
            name="validate_group",
            handler=self._validate_group_handler,
            compensator=None,
            retries=1
        ))
        
        # Paso 2: Verificar disponibilidad (paralelo)
        workflow.add_parallel_steps([
            WorkflowStep(
                name="check_hotels",
                handler=self._check_hotels_handler,
                compensator=self._release_hotels_handler,
                retries=3
            ),
            WorkflowStep(
                name="check_transport",
                handler=self._check_transport_handler,
                compensator=self._release_transport_handler,
                retries=3
            ),
            WorkflowStep(
                name="check_guides",
                handler=self._check_guides_handler,
                compensator=self._release_guides_handler,
                retries=3
            )
        ], group_name="availability_check")
        
        # Paso 3: Calcular costos
        workflow.add_step(WorkflowStep(
            name="calculate_costs",
            handler=self._calculate_costs_handler,
            depends_on=["check_hotels", "check_transport", "check_guides"],
            retries=2
        ))
        
        # Paso 4: Generar documento
        workflow.add_step(WorkflowStep(
            name="generate_document",
            handler=self._generate_document_handler,
            depends_on=["calculate_costs"],
            retries=2
        ))
        
        # Paso 5: Enviar notificaciones
        workflow.add_step(WorkflowStep(
            name="send_notifications",
            handler=self._send_notifications_handler,
            depends_on=["generate_document"],
            retries=3
        ))
        
        return workflow
    
    async def _create_booking_workflow(
        self,
        workflow_id: str,
        context: Dict[str, Any]
    ) -> Workflow:
        """
        Crear workflow de confirmación de reserva
        """
        workflow = Workflow(
            workflow_id=workflow_id,
            name="Booking Confirmation Process",
            description="Proceso de confirmación de reserva con pago"
        )
        
        # Paso 1: Validar reserva
        workflow.add_step(WorkflowStep(
            name="validate_booking",
            handler=self._validate_booking_handler,
            retries=1
        ))
        
        # Paso 2: Procesar pago
        workflow.add_step(WorkflowStep(
            name="process_payment",
            handler=self._process_payment_handler,
            compensator=self._refund_payment_handler,
            depends_on=["validate_booking"],
            retries=3,
            timeout=30
        ))
        
        # Paso 3: Confirmar servicios (paralelo)
        workflow.add_parallel_steps([
            WorkflowStep(
                name="confirm_hotels",
                handler=self._confirm_hotels_handler,
                compensator=self._cancel_hotels_handler,
                depends_on=["process_payment"]
            ),
            WorkflowStep(
                name="confirm_transport",
                handler=self._confirm_transport_handler,
                compensator=self._cancel_transport_handler,
                depends_on=["process_payment"]
            ),
            WorkflowStep(
                name="confirm_guides",
                handler=self._confirm_guides_handler,
                compensator=self._cancel_guides_handler,
                depends_on=["process_payment"]
            )
        ], group_name="service_confirmation")
        
        # Paso 4: Generar documentos
        workflow.add_step(WorkflowStep(
            name="generate_documents",
            handler=self._generate_booking_documents_handler,
            depends_on=["confirm_hotels", "confirm_transport", "confirm_guides"],
            retries=2
        ))
        
        # Paso 5: Enviar confirmaciones
        workflow.add_step(WorkflowStep(
            name="send_confirmations",
            handler=self._send_booking_confirmations_handler,
            depends_on=["generate_documents"],
            retries=3
        ))
        
        return workflow
    
    async def _create_guide_assignment_workflow(
        self,
        workflow_id: str,
        context: Dict[str, Any]
    ) -> Workflow:
        """
        Crear workflow de asignación de guías
        """
        workflow = Workflow(
            workflow_id=workflow_id,
            name="Guide Assignment Process",
            description="Proceso de asignación automática de guías"
        )
        
        # Paso 1: Analizar requerimientos
        workflow.add_step(WorkflowStep(
            name="analyze_requirements",
            handler=self._analyze_guide_requirements_handler,
            retries=1
        ))
        
        # Paso 2: Buscar guías disponibles
        workflow.add_step(WorkflowStep(
            name="search_available_guides",
            handler=self._search_guides_handler,
            depends_on=["analyze_requirements"],
            retries=2
        ))
        
        # Paso 3: Rankear y seleccionar
        workflow.add_step(WorkflowStep(
            name="rank_and_select",
            handler=self._rank_guides_handler,
            depends_on=["search_available_guides"],
            retries=1
        ))
        
        # Paso 4: Asignar guía
        workflow.add_step(WorkflowStep(
            name="assign_guide",
            handler=self._assign_guide_handler,
            compensator=self._unassign_guide_handler,
            depends_on=["rank_and_select"],
            retries=3
        ))
        
        # Paso 5: Notificar asignación
        workflow.add_step(WorkflowStep(
            name="notify_assignment",
            handler=self._notify_guide_assignment_handler,
            depends_on=["assign_guide"],
            retries=3
        ))
        
        return workflow
    
    # Handlers de ejemplo (estos serían implementados con lógica real)
    
    async def _validate_group_handler(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Validar datos del grupo"""
        # Implementación real validaría los datos
        return {'valid': True, 'group_size': context.get('group_size', 1)}
    
    async def _check_hotels_handler(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Verificar disponibilidad de hoteles"""
        # Implementación real verificaría con el servicio de hoteles
        return {'available': True, 'options': []}
    
    async def _check_transport_handler(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Verificar disponibilidad de transporte"""
        # Implementación real verificaría con el servicio de transporte
        return {'available': True, 'vehicles': []}
    
    async def _check_guides_handler(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Verificar disponibilidad de guías"""
        # Implementación real verificaría con el servicio de guías
        return {'available': True, 'guides': []}
    
    async def _release_hotels_handler(self, context: Dict[str, Any]) -> None:
        """Liberar reservas de hoteles"""
        pass
    
    async def _release_transport_handler(self, context: Dict[str, Any]) -> None:
        """Liberar reservas de transporte"""
        pass
    
    async def _release_guides_handler(self, context: Dict[str, Any]) -> None:
        """Liberar asignaciones de guías"""
        pass
    
    async def _calculate_costs_handler(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Calcular costos totales"""
        # Implementación real calcularía los costos
        return {'total_cost': 0, 'breakdown': {}}
    
    async def _generate_document_handler(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generar documento de cotización"""
        # Implementación real generaría el PDF
        return {'document_url': 'http://example.com/quote.pdf'}
    
    async def _send_notifications_handler(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Enviar notificaciones"""
        # Implementación real enviaría emails/SMS
        return {'notifications_sent': True}
    
    async def _validate_booking_handler(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Validar datos de reserva"""
        return {'valid': True}
    
    async def _process_payment_handler(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Procesar pago"""
        return {'payment_id': 'PAY-123', 'status': 'success'}
    
    async def _refund_payment_handler(self, context: Dict[str, Any]) -> None:
        """Reembolsar pago"""
        pass
    
    async def _confirm_hotels_handler(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Confirmar hoteles"""
        return {'confirmed': True}
    
    async def _confirm_transport_handler(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Confirmar transporte"""
        return {'confirmed': True}
    
    async def _confirm_guides_handler(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Confirmar guías"""
        return {'confirmed': True}
    
    async def _cancel_hotels_handler(self, context: Dict[str, Any]) -> None:
        """Cancelar hoteles"""
        pass
    
    async def _cancel_transport_handler(self, context: Dict[str, Any]) -> None:
        """Cancelar transporte"""
        pass
    
    async def _cancel_guides_handler(self, context: Dict[str, Any]) -> None:
        """Cancelar guías"""
        pass
    
    async def _generate_booking_documents_handler(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generar documentos de reserva"""
        return {'documents': []}
    
    async def _send_booking_confirmations_handler(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Enviar confirmaciones de reserva"""
        return {'sent': True}
    
    async def _analyze_guide_requirements_handler(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Analizar requerimientos de guía"""
        return {'requirements': {}}
    
    async def _search_guides_handler(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Buscar guías disponibles"""
        return {'guides': []}
    
    async def _rank_guides_handler(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Rankear guías por compatibilidad"""
        return {'ranked_guides': []}
    
    async def _assign_guide_handler(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Asignar guía seleccionado"""
        return {'assignment_id': 'ASSIGN-123'}
    
    async def _unassign_guide_handler(self, context: Dict[str, Any]) -> None:
        """Desasignar guía"""
        pass
    
    async def _notify_guide_assignment_handler(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Notificar asignación de guía"""
        return {'notified': True}


# Singleton global del Workflow Engine
_workflow_engine: Optional[WorkflowEngine] = None


async def get_workflow_engine() -> WorkflowEngine:
    """
    Obtener instancia singleton del Workflow Engine
    """
    global _workflow_engine
    
    if _workflow_engine is None:
        _workflow_engine = WorkflowEngine()
        await _workflow_engine.initialize()
    
    return _workflow_engine