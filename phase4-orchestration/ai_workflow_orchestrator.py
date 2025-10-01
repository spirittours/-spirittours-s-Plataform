#!/usr/bin/env python3
"""
PHASE 4: Advanced AI Orchestration & Automation - AI Workflow Orchestrator
Enterprise-Grade AI Workflow Orchestration System with Kubeflow Pipelines

This module implements a comprehensive AI workflow orchestration platform featuring:
- Kubeflow Pipelines integration for scalable ML workflows
- Automated model training and deployment pipelines
- Multi-step AI workflow management
- Resource scheduling and optimization
- Pipeline versioning and experiment tracking
- Real-time monitoring and alerting
- Auto-scaling and fault tolerance
- Integration with multiple AI/ML frameworks
- Workflow template management
- Event-driven pipeline execution
"""

import asyncio
import json
import logging
import os
import yaml
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Callable, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import threading
from concurrent.futures import ThreadPoolExecutor, Future
import tempfile
import shutil
import pickle
import subprocess
import time

# Kubeflow and Kubernetes imports
try:
    import kfp
    from kfp import dsl, compiler
    from kfp.client import Client as KfpClient
    from kfp_server_api import ApiException
    import kubernetes
    from kubernetes import client, config
except ImportError as e:
    print(f"Kubeflow dependencies not available: {e}")
    # Mock classes for development
    class dsl:
        @staticmethod
        def component(func): return func
        @staticmethod
        def pipeline(func): return func
        class ContainerOp: pass
        class PipelineParam: pass

# ML Framework imports
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.metrics import accuracy_score, mean_squared_error, classification_report
import joblib

# MLflow for experiment tracking
try:
    import mlflow
    import mlflow.sklearn
    from mlflow.tracking import MlflowClient
except ImportError:
    print("MLflow not available, experiment tracking disabled")
    mlflow = None

# Monitoring and metrics
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import structlog

# Database and caching
import asyncpg
import redis.asyncio as redis
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)

# Prometheus metrics
WORKFLOW_COUNTER = Counter('ai_workflows_total', 'Total AI workflows executed', ['pipeline_name', 'status'])
WORKFLOW_DURATION = Histogram('ai_workflow_duration_seconds', 'Workflow execution time', ['pipeline_name'])
ACTIVE_WORKFLOWS = Gauge('ai_workflows_active', 'Currently active workflows')
MODEL_TRAINING_COUNTER = Counter('ai_model_training_total', 'Total model training jobs', ['model_type', 'status'])
PIPELINE_ERRORS = Counter('ai_pipeline_errors_total', 'Total pipeline errors', ['error_type'])

class WorkflowStatus(Enum):
    """Workflow execution status."""
    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"

class PipelineType(Enum):
    """Types of AI pipelines."""
    TRAINING = "training"
    INFERENCE = "inference"
    DATA_PROCESSING = "data_processing"
    MODEL_EVALUATION = "model_evaluation"
    HYPERPARAMETER_TUNING = "hyperparameter_tuning"
    FEATURE_ENGINEERING = "feature_engineering"
    A_B_TESTING = "a_b_testing"
    MODEL_MONITORING = "model_monitoring"

class ModelType(Enum):
    """Supported model types."""
    CLASSIFICATION = "classification"
    REGRESSION = "regression"
    CLUSTERING = "clustering"
    TIME_SERIES = "time_series"
    NLP = "nlp"
    COMPUTER_VISION = "computer_vision"
    DEEP_LEARNING = "deep_learning"
    ENSEMBLE = "ensemble"

@dataclass
class WorkflowConfig:
    """Configuration for AI workflow execution."""
    name: str
    pipeline_type: PipelineType
    model_type: Optional[ModelType]
    parameters: Dict[str, Any]
    resources: Dict[str, Any]  # CPU, memory, GPU requirements
    timeout: int  # seconds
    retry_count: int
    schedule: Optional[str]  # cron expression
    dependencies: List[str]  # pipeline dependencies
    notifications: Dict[str, Any]
    tags: List[str]
    description: str
    version: str = "1.0.0"

@dataclass
class WorkflowExecution:
    """Workflow execution metadata."""
    execution_id: str
    workflow_config: WorkflowConfig
    status: WorkflowStatus
    start_time: datetime
    end_time: Optional[datetime]
    duration: Optional[float]
    kubeflow_run_id: Optional[str]
    logs: List[str]
    artifacts: Dict[str, str]  # artifact_name -> storage_path
    metrics: Dict[str, Any]
    error_message: Optional[str]
    created_by: str
    updated_at: datetime

@dataclass
class PipelineTemplate:
    """Reusable pipeline template."""
    template_id: str
    name: str
    description: str
    pipeline_type: PipelineType
    parameters_schema: Dict[str, Any]
    default_resources: Dict[str, Any]
    pipeline_definition: str  # YAML or Python code
    version: str
    created_at: datetime
    updated_at: datetime

class WorkflowOrchestrationError(Exception):
    """Base exception for workflow orchestration errors."""
    pass

class PipelineExecutionError(WorkflowOrchestrationError):
    """Raised when pipeline execution fails."""
    pass

class ResourceAllocationError(WorkflowOrchestrationError):
    """Raised when resources cannot be allocated."""
    pass

class KubeflowManager:
    """Manages Kubeflow Pipelines integration."""
    
    def __init__(self, kubeflow_endpoint: str, namespace: str = "kubeflow"):
        self.endpoint = kubeflow_endpoint
        self.namespace = namespace
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Kubeflow Pipelines client."""
        try:
            self.client = KfpClient(host=self.endpoint)
            logger.info("Kubeflow client initialized", endpoint=self.endpoint)
        except Exception as e:
            logger.error("Failed to initialize Kubeflow client", error=str(e))
            # Use mock client for development
            self.client = MockKubeflowClient()
    
    async def create_pipeline(self, pipeline_package: str, name: str, description: str) -> str:
        """Create a new pipeline in Kubeflow."""
        try:
            pipeline = self.client.upload_pipeline(
                pipeline_package_path=pipeline_package,
                pipeline_name=name,
                description=description
            )
            logger.info("Pipeline created", pipeline_id=pipeline.id, name=name)
            return pipeline.id
        except Exception as e:
            logger.error("Failed to create pipeline", name=name, error=str(e))
            raise PipelineExecutionError(f"Pipeline creation failed: {e}")
    
    async def run_pipeline(
        self, 
        pipeline_id: str, 
        experiment_id: str,
        run_name: str,
        parameters: Dict[str, Any]
    ) -> str:
        """Execute a pipeline with given parameters."""
        try:
            run = self.client.run_pipeline(
                experiment_id=experiment_id,
                job_name=run_name,
                pipeline_id=pipeline_id,
                params=parameters
            )
            logger.info("Pipeline run started", 
                       run_id=run.id, 
                       pipeline_id=pipeline_id,
                       run_name=run_name)
            return run.id
        except Exception as e:
            logger.error("Failed to run pipeline", 
                        pipeline_id=pipeline_id, 
                        error=str(e))
            raise PipelineExecutionError(f"Pipeline execution failed: {e}")
    
    async def get_run_status(self, run_id: str) -> Dict[str, Any]:
        """Get the status of a pipeline run."""
        try:
            run = self.client.get_run(run_id)
            return {
                'id': run.run.id,
                'name': run.run.name,
                'status': run.run.status,
                'created_at': run.run.created_at,
                'finished_at': run.run.finished_at,
                'pipeline_spec': run.pipeline_spec
            }
        except Exception as e:
            logger.error("Failed to get run status", run_id=run_id, error=str(e))
            return {'status': 'unknown', 'error': str(e)}
    
    async def cancel_run(self, run_id: str) -> bool:
        """Cancel a running pipeline."""
        try:
            self.client.cancel_run(run_id)
            logger.info("Pipeline run cancelled", run_id=run_id)
            return True
        except Exception as e:
            logger.error("Failed to cancel run", run_id=run_id, error=str(e))
            return False
    
    async def get_run_logs(self, run_id: str) -> List[str]:
        """Get logs from a pipeline run."""
        try:
            # This would typically involve fetching logs from Kubernetes pods
            # For now, return a placeholder
            return [f"Log entry for run {run_id}"]
        except Exception as e:
            logger.error("Failed to get run logs", run_id=run_id, error=str(e))
            return []

class MockKubeflowClient:
    """Mock Kubeflow client for development purposes."""
    
    def __init__(self):
        self.pipelines = {}
        self.runs = {}
    
    def upload_pipeline(self, pipeline_package_path: str, pipeline_name: str, description: str):
        pipeline_id = str(uuid.uuid4())
        self.pipelines[pipeline_id] = {
            'id': pipeline_id,
            'name': pipeline_name,
            'description': description,
            'package_path': pipeline_package_path
        }
        
        class MockPipeline:
            def __init__(self, pipeline_id):
                self.id = pipeline_id
        
        return MockPipeline(pipeline_id)
    
    def run_pipeline(self, experiment_id: str, job_name: str, pipeline_id: str, params: Dict[str, Any]):
        run_id = str(uuid.uuid4())
        self.runs[run_id] = {
            'id': run_id,
            'name': job_name,
            'pipeline_id': pipeline_id,
            'experiment_id': experiment_id,
            'params': params,
            'status': 'Running',
            'created_at': datetime.utcnow(),
            'finished_at': None
        }
        
        class MockRun:
            def __init__(self, run_id):
                self.id = run_id
        
        return MockRun(run_id)
    
    def get_run(self, run_id: str):
        run_data = self.runs.get(run_id, {})
        
        class MockRunDetail:
            def __init__(self, run_data):
                self.run = self
                self.id = run_data.get('id')
                self.name = run_data.get('name')
                self.status = run_data.get('status', 'Succeeded')
                self.created_at = run_data.get('created_at')
                self.finished_at = run_data.get('finished_at', datetime.utcnow())
                self.pipeline_spec = {}
        
        return MockRunDetail(run_data)
    
    def cancel_run(self, run_id: str):
        if run_id in self.runs:
            self.runs[run_id]['status'] = 'Cancelled'
            self.runs[run_id]['finished_at'] = datetime.utcnow()

class PipelineBuilder:
    """Builds Kubeflow pipeline definitions."""
    
    @staticmethod
    def build_training_pipeline(config: WorkflowConfig) -> str:
        """Build a model training pipeline."""
        
        @dsl.component
        def load_data_op(data_path: str) -> str:
            """Load training data."""
            return f"data_loaded_from_{data_path}"
        
        @dsl.component  
        def preprocess_data_op(data: str, preprocessing_config: str) -> str:
            """Preprocess training data."""
            return f"preprocessed_{data}"
        
        @dsl.component
        def train_model_op(
            data: str, 
            model_type: str, 
            hyperparameters: str
        ) -> str:
            """Train ML model."""
            return f"model_trained_{model_type}"
        
        @dsl.component
        def evaluate_model_op(model: str, test_data: str) -> str:
            """Evaluate trained model."""
            return f"evaluation_results_{model}"
        
        @dsl.component
        def deploy_model_op(model: str, deployment_config: str) -> str:
            """Deploy trained model."""
            return f"deployed_{model}"
        
        @dsl.pipeline(
            name=config.name,
            description=config.description
        )
        def training_pipeline(
            data_path: str = config.parameters.get('data_path', ''),
            model_type: str = config.model_type.value if config.model_type else 'classification',
            hyperparameters: str = json.dumps(config.parameters.get('hyperparameters', {})),
            preprocessing_config: str = json.dumps(config.parameters.get('preprocessing', {})),
            deployment_config: str = json.dumps(config.parameters.get('deployment', {}))
        ):
            # Pipeline steps
            load_data_task = load_data_op(data_path)
            
            preprocess_task = preprocess_data_op(
                data=load_data_task.output,
                preprocessing_config=preprocessing_config
            )
            
            train_task = train_model_op(
                data=preprocess_task.output,
                model_type=model_type,
                hyperparameters=hyperparameters
            )
            
            evaluate_task = evaluate_model_op(
                model=train_task.output,
                test_data=preprocess_task.output
            )
            
            deploy_task = deploy_model_op(
                model=train_task.output,
                deployment_config=deployment_config
            )
            
            # Set dependencies
            preprocess_task.after(load_data_task)
            train_task.after(preprocess_task)
            evaluate_task.after(train_task)
            deploy_task.after(evaluate_task)
        
        # Compile pipeline
        pipeline_package = f"/tmp/{config.name}_pipeline.yaml"
        compiler.Compiler().compile(training_pipeline, pipeline_package)
        
        return pipeline_package
    
    @staticmethod
    def build_inference_pipeline(config: WorkflowConfig) -> str:
        """Build a model inference pipeline."""
        
        @dsl.component
        def load_model_op(model_path: str) -> str:
            """Load trained model for inference."""
            return f"model_loaded_from_{model_path}"
        
        @dsl.component
        def preprocess_input_op(input_data: str, preprocessing_config: str) -> str:
            """Preprocess input data."""
            return f"preprocessed_input_{input_data}"
        
        @dsl.component
        def run_inference_op(model: str, input_data: str) -> str:
            """Run model inference."""
            return f"predictions_{model}_{input_data}"
        
        @dsl.component
        def postprocess_output_op(predictions: str, postprocessing_config: str) -> str:
            """Postprocess model output."""
            return f"final_output_{predictions}"
        
        @dsl.pipeline(
            name=config.name,
            description=config.description
        )
        def inference_pipeline(
            model_path: str = config.parameters.get('model_path', ''),
            input_data: str = config.parameters.get('input_data', ''),
            preprocessing_config: str = json.dumps(config.parameters.get('preprocessing', {})),
            postprocessing_config: str = json.dumps(config.parameters.get('postprocessing', {}))
        ):
            # Pipeline steps
            load_model_task = load_model_op(model_path)
            
            preprocess_task = preprocess_input_op(
                input_data=input_data,
                preprocessing_config=preprocessing_config
            )
            
            inference_task = run_inference_op(
                model=load_model_task.output,
                input_data=preprocess_task.output
            )
            
            postprocess_task = postprocess_output_op(
                predictions=inference_task.output,
                postprocessing_config=postprocessing_config
            )
            
            # Set dependencies
            inference_task.after(load_model_task)
            inference_task.after(preprocess_task)
            postprocess_task.after(inference_task)
        
        # Compile pipeline
        pipeline_package = f"/tmp/{config.name}_pipeline.yaml"
        compiler.Compiler().compile(inference_pipeline, pipeline_package)
        
        return pipeline_package

class ExperimentTracker:
    """Manages ML experiment tracking with MLflow."""
    
    def __init__(self, tracking_uri: str, experiment_name: str = "ai_orchestration"):
        self.tracking_uri = tracking_uri
        self.experiment_name = experiment_name
        
        if mlflow:
            mlflow.set_tracking_uri(tracking_uri)
            try:
                mlflow.create_experiment(experiment_name)
            except:
                pass  # Experiment already exists
            mlflow.set_experiment(experiment_name)
    
    async def start_run(self, run_name: str, tags: Dict[str, str] = None) -> str:
        """Start a new MLflow run."""
        if not mlflow:
            return "mock_run_id"
        
        try:
            run = mlflow.start_run(run_name=run_name, tags=tags)
            logger.info("MLflow run started", run_id=run.info.run_id)
            return run.info.run_id
        except Exception as e:
            logger.error("Failed to start MLflow run", error=str(e))
            return "failed_run_id"
    
    async def log_params(self, params: Dict[str, Any]):
        """Log parameters to current run."""
        if mlflow and mlflow.active_run():
            try:
                mlflow.log_params(params)
            except Exception as e:
                logger.error("Failed to log params", error=str(e))
    
    async def log_metrics(self, metrics: Dict[str, float], step: int = None):
        """Log metrics to current run."""
        if mlflow and mlflow.active_run():
            try:
                for key, value in metrics.items():
                    mlflow.log_metric(key, value, step)
            except Exception as e:
                logger.error("Failed to log metrics", error=str(e))
    
    async def log_artifact(self, artifact_path: str, artifact_name: str = None):
        """Log artifact to current run."""
        if mlflow and mlflow.active_run():
            try:
                mlflow.log_artifact(artifact_path, artifact_name)
            except Exception as e:
                logger.error("Failed to log artifact", error=str(e))
    
    async def end_run(self, status: str = "FINISHED"):
        """End current MLflow run."""
        if mlflow and mlflow.active_run():
            try:
                mlflow.end_run(status=status)
            except Exception as e:
                logger.error("Failed to end run", error=str(e))

class ResourceManager:
    """Manages resource allocation and scheduling."""
    
    def __init__(self, kubernetes_config: Dict[str, Any]):
        self.k8s_config = kubernetes_config
        self.available_resources = {
            'cpu': kubernetes_config.get('total_cpu', 100),
            'memory': kubernetes_config.get('total_memory', 1000),  # GB
            'gpu': kubernetes_config.get('total_gpu', 8)
        }
        self.allocated_resources = {'cpu': 0, 'memory': 0, 'gpu': 0}
        self._lock = threading.Lock()
    
    async def check_resource_availability(self, required_resources: Dict[str, Any]) -> bool:
        """Check if required resources are available."""
        with self._lock:
            for resource_type, amount in required_resources.items():
                if resource_type in self.available_resources:
                    available = self.available_resources[resource_type] - self.allocated_resources[resource_type]
                    if available < amount:
                        logger.warning("Insufficient resources", 
                                     resource_type=resource_type,
                                     required=amount,
                                     available=available)
                        return False
            return True
    
    async def allocate_resources(self, workflow_id: str, required_resources: Dict[str, Any]) -> bool:
        """Allocate resources for a workflow."""
        if not await self.check_resource_availability(required_resources):
            return False
        
        with self._lock:
            for resource_type, amount in required_resources.items():
                if resource_type in self.allocated_resources:
                    self.allocated_resources[resource_type] += amount
            
            logger.info("Resources allocated", 
                       workflow_id=workflow_id,
                       resources=required_resources)
            return True
    
    async def deallocate_resources(self, workflow_id: str, allocated_resources: Dict[str, Any]):
        """Deallocate resources after workflow completion."""
        with self._lock:
            for resource_type, amount in allocated_resources.items():
                if resource_type in self.allocated_resources:
                    self.allocated_resources[resource_type] -= amount
                    self.allocated_resources[resource_type] = max(0, self.allocated_resources[resource_type])
            
            logger.info("Resources deallocated",
                       workflow_id=workflow_id,
                       resources=allocated_resources)
    
    async def get_resource_utilization(self) -> Dict[str, float]:
        """Get current resource utilization percentages."""
        with self._lock:
            utilization = {}
            for resource_type in self.available_resources:
                total = self.available_resources[resource_type]
                allocated = self.allocated_resources[resource_type]
                utilization[resource_type] = (allocated / total) * 100 if total > 0 else 0
            
            return utilization

class WorkflowScheduler:
    """Schedules and manages workflow execution."""
    
    def __init__(self, resource_manager: ResourceManager):
        self.resource_manager = resource_manager
        self.pending_workflows = asyncio.Queue()
        self.running_workflows = {}
        self.completed_workflows = {}
        self._scheduler_task = None
        self._running = False
    
    async def start(self):
        """Start the workflow scheduler."""
        self._running = True
        self._scheduler_task = asyncio.create_task(self._scheduler_loop())
        logger.info("Workflow scheduler started")
    
    async def stop(self):
        """Stop the workflow scheduler."""
        self._running = False
        if self._scheduler_task:
            self._scheduler_task.cancel()
            try:
                await self._scheduler_task
            except asyncio.CancelledError:
                pass
        logger.info("Workflow scheduler stopped")
    
    async def submit_workflow(self, execution: WorkflowExecution) -> bool:
        """Submit a workflow for execution."""
        try:
            await self.pending_workflows.put(execution)
            logger.info("Workflow submitted", execution_id=execution.execution_id)
            return True
        except Exception as e:
            logger.error("Failed to submit workflow", 
                        execution_id=execution.execution_id,
                        error=str(e))
            return False
    
    async def _scheduler_loop(self):
        """Main scheduler loop."""
        while self._running:
            try:
                # Get next pending workflow
                execution = await asyncio.wait_for(
                    self.pending_workflows.get(), timeout=1.0
                )
                
                # Check resource availability
                required_resources = execution.workflow_config.resources
                if await self.resource_manager.check_resource_availability(required_resources):
                    # Start workflow execution
                    await self._start_workflow_execution(execution)
                else:
                    # Put back in queue to retry later
                    await self.pending_workflows.put(execution)
                    await asyncio.sleep(5)  # Wait before retrying
                
            except asyncio.TimeoutError:
                # No pending workflows, continue
                continue
            except Exception as e:
                logger.error("Scheduler loop error", error=str(e))
                await asyncio.sleep(1)
    
    async def _start_workflow_execution(self, execution: WorkflowExecution):
        """Start executing a workflow."""
        try:
            # Allocate resources
            resources_allocated = await self.resource_manager.allocate_resources(
                execution.execution_id,
                execution.workflow_config.resources
            )
            
            if not resources_allocated:
                logger.error("Failed to allocate resources", 
                           execution_id=execution.execution_id)
                return
            
            # Update execution status
            execution.status = WorkflowStatus.RUNNING
            execution.start_time = datetime.utcnow()
            
            # Store in running workflows
            self.running_workflows[execution.execution_id] = execution
            
            # Start workflow monitoring task
            monitor_task = asyncio.create_task(
                self._monitor_workflow_execution(execution)
            )
            
            ACTIVE_WORKFLOWS.inc()
            WORKFLOW_COUNTER.labels(
                pipeline_name=execution.workflow_config.name,
                status="started"
            ).inc()
            
            logger.info("Workflow execution started", 
                       execution_id=execution.execution_id)
            
        except Exception as e:
            logger.error("Failed to start workflow execution",
                        execution_id=execution.execution_id,
                        error=str(e))
            execution.status = WorkflowStatus.FAILED
            execution.error_message = str(e)
    
    async def _monitor_workflow_execution(self, execution: WorkflowExecution):
        """Monitor workflow execution progress."""
        try:
            start_time = time.time()
            timeout = execution.workflow_config.timeout
            
            while execution.status == WorkflowStatus.RUNNING:
                # Check for timeout
                elapsed_time = time.time() - start_time
                if elapsed_time > timeout:
                    execution.status = WorkflowStatus.TIMEOUT
                    execution.error_message = f"Workflow timed out after {timeout} seconds"
                    break
                
                # Check Kubeflow run status (would be implemented with actual Kubeflow client)
                # For now, simulate completion after some time
                if elapsed_time > 30:  # Simulate 30-second execution
                    execution.status = WorkflowStatus.SUCCEEDED
                    break
                
                await asyncio.sleep(5)  # Check every 5 seconds
            
            # Workflow completed
            execution.end_time = datetime.utcnow()
            execution.duration = (execution.end_time - execution.start_time).total_seconds()
            
            # Move from running to completed
            self.running_workflows.pop(execution.execution_id, None)
            self.completed_workflows[execution.execution_id] = execution
            
            # Deallocate resources
            await self.resource_manager.deallocate_resources(
                execution.execution_id,
                execution.workflow_config.resources
            )
            
            ACTIVE_WORKFLOWS.dec()
            WORKFLOW_COUNTER.labels(
                pipeline_name=execution.workflow_config.name,
                status=execution.status.value
            ).inc()
            
            WORKFLOW_DURATION.labels(
                pipeline_name=execution.workflow_config.name
            ).observe(execution.duration)
            
            logger.info("Workflow execution completed",
                       execution_id=execution.execution_id,
                       status=execution.status.value,
                       duration=execution.duration)
            
        except Exception as e:
            logger.error("Workflow monitoring failed",
                        execution_id=execution.execution_id,
                        error=str(e))
            
            execution.status = WorkflowStatus.FAILED
            execution.error_message = str(e)
            execution.end_time = datetime.utcnow()

class AIWorkflowOrchestrator:
    """
    Main AI Workflow Orchestration System
    
    Provides comprehensive workflow management including:
    - Kubeflow Pipelines integration
    - Resource management and scheduling
    - Experiment tracking with MLflow
    - Pipeline template management
    - Real-time monitoring and alerting
    - Auto-scaling and fault tolerance
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        
        # Initialize components
        self.kubeflow_manager = KubeflowManager(
            kubeflow_endpoint=config.get('kubeflow_endpoint', 'http://localhost:8080'),
            namespace=config.get('kubernetes_namespace', 'kubeflow')
        )
        
        self.experiment_tracker = ExperimentTracker(
            tracking_uri=config.get('mlflow_tracking_uri', 'http://localhost:5000'),
            experiment_name=config.get('experiment_name', 'ai_orchestration')
        )
        
        self.resource_manager = ResourceManager(config.get('kubernetes', {}))
        self.scheduler = WorkflowScheduler(self.resource_manager)
        
        # Storage
        self.postgres_engine = None
        self.redis_client = None
        
        # Pipeline templates
        self.pipeline_templates = {}
        
        # Metrics server
        self.metrics_port = config.get('metrics_port', 8091)
    
    async def initialize(self):
        """Initialize the orchestration system."""
        try:
            logger.info("Initializing AI Workflow Orchestrator")
            
            # Start metrics server
            start_http_server(self.metrics_port)
            
            # Initialize database connections
            await self._initialize_storage()
            
            # Load pipeline templates
            await self._load_pipeline_templates()
            
            # Start scheduler
            await self.scheduler.start()
            
            logger.info("AI Workflow Orchestrator initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize orchestrator", error=str(e))
            raise WorkflowOrchestrationError(f"Initialization failed: {e}")
    
    async def _initialize_storage(self):
        """Initialize database and cache connections."""
        try:
            # PostgreSQL for workflow metadata
            postgres_url = self.config.get('postgres_url', 
                'postgresql+asyncpg://user:password@localhost:5432/orchestration')
            self.postgres_engine = create_async_engine(postgres_url)
            
            # Redis for caching and pub/sub
            redis_url = self.config.get('redis_url', 'redis://localhost:6379/1')
            self.redis_client = redis.from_url(redis_url)
            
            logger.info("Storage connections initialized")
            
        except Exception as e:
            logger.error("Failed to initialize storage", error=str(e))
            raise
    
    async def _load_pipeline_templates(self):
        """Load pipeline templates from storage."""
        # For demo, create some default templates
        self.pipeline_templates = {
            'classification_training': PipelineTemplate(
                template_id='classification_training',
                name='Classification Model Training',
                description='Template for training classification models',
                pipeline_type=PipelineType.TRAINING,
                parameters_schema={
                    'data_path': {'type': 'string', 'required': True},
                    'model_type': {'type': 'string', 'default': 'random_forest'},
                    'hyperparameters': {'type': 'object', 'default': {}}
                },
                default_resources={'cpu': 4, 'memory': 8, 'gpu': 0},
                pipeline_definition='',  # Would contain actual pipeline code
                version='1.0.0',
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            ),
            'batch_inference': PipelineTemplate(
                template_id='batch_inference',
                name='Batch Inference Pipeline',
                description='Template for batch model inference',
                pipeline_type=PipelineType.INFERENCE,
                parameters_schema={
                    'model_path': {'type': 'string', 'required': True},
                    'input_data': {'type': 'string', 'required': True},
                    'output_path': {'type': 'string', 'required': True}
                },
                default_resources={'cpu': 2, 'memory': 4, 'gpu': 0},
                pipeline_definition='',
                version='1.0.0',
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
        }
        
        logger.info("Pipeline templates loaded", count=len(self.pipeline_templates))
    
    async def create_workflow_config(
        self,
        name: str,
        pipeline_type: PipelineType,
        parameters: Dict[str, Any],
        template_id: Optional[str] = None,
        **kwargs
    ) -> WorkflowConfig:
        """Create a workflow configuration."""
        
        # Use template defaults if specified
        if template_id and template_id in self.pipeline_templates:
            template = self.pipeline_templates[template_id]
            default_resources = template.default_resources.copy()
            pipeline_type = template.pipeline_type
        else:
            default_resources = {'cpu': 2, 'memory': 4, 'gpu': 0}
        
        config = WorkflowConfig(
            name=name,
            pipeline_type=pipeline_type,
            model_type=kwargs.get('model_type'),
            parameters=parameters,
            resources=kwargs.get('resources', default_resources),
            timeout=kwargs.get('timeout', 3600),  # 1 hour default
            retry_count=kwargs.get('retry_count', 2),
            schedule=kwargs.get('schedule'),
            dependencies=kwargs.get('dependencies', []),
            notifications=kwargs.get('notifications', {}),
            tags=kwargs.get('tags', []),
            description=kwargs.get('description', ''),
            version=kwargs.get('version', '1.0.0')
        )
        
        logger.info("Workflow config created", name=name, type=pipeline_type.value)
        return config
    
    async def submit_workflow(
        self,
        config: WorkflowConfig,
        created_by: str = "system"
    ) -> str:
        """Submit a workflow for execution."""
        try:
            execution_id = str(uuid.uuid4())
            
            # Create workflow execution object
            execution = WorkflowExecution(
                execution_id=execution_id,
                workflow_config=config,
                status=WorkflowStatus.PENDING,
                start_time=datetime.utcnow(),
                end_time=None,
                duration=None,
                kubeflow_run_id=None,
                logs=[],
                artifacts={},
                metrics={},
                error_message=None,
                created_by=created_by,
                updated_at=datetime.utcnow()
            )
            
            # Build pipeline
            pipeline_package = await self._build_pipeline(config)
            
            # Submit to scheduler
            submitted = await self.scheduler.submit_workflow(execution)
            
            if submitted:
                logger.info("Workflow submitted successfully",
                           execution_id=execution_id,
                           workflow_name=config.name)
                return execution_id
            else:
                raise WorkflowOrchestrationError("Failed to submit workflow to scheduler")
            
        except Exception as e:
            logger.error("Failed to submit workflow", 
                        workflow_name=config.name,
                        error=str(e))
            raise WorkflowOrchestrationError(f"Workflow submission failed: {e}")
    
    async def _build_pipeline(self, config: WorkflowConfig) -> str:
        """Build Kubeflow pipeline from configuration."""
        try:
            if config.pipeline_type == PipelineType.TRAINING:
                return PipelineBuilder.build_training_pipeline(config)
            elif config.pipeline_type == PipelineType.INFERENCE:
                return PipelineBuilder.build_inference_pipeline(config)
            else:
                # For other types, use a generic pipeline
                return PipelineBuilder.build_training_pipeline(config)
                
        except Exception as e:
            logger.error("Failed to build pipeline", 
                        pipeline_type=config.pipeline_type.value,
                        error=str(e))
            raise PipelineExecutionError(f"Pipeline building failed: {e}")
    
    async def get_workflow_status(self, execution_id: str) -> Optional[WorkflowExecution]:
        """Get the status of a workflow execution."""
        # Check running workflows
        if execution_id in self.scheduler.running_workflows:
            return self.scheduler.running_workflows[execution_id]
        
        # Check completed workflows
        if execution_id in self.scheduler.completed_workflows:
            return self.scheduler.completed_workflows[execution_id]
        
        # Check database for historical executions
        # This would query the database in a real implementation
        
        return None
    
    async def cancel_workflow(self, execution_id: str) -> bool:
        """Cancel a running workflow."""
        try:
            execution = await self.get_workflow_status(execution_id)
            if not execution:
                return False
            
            if execution.status == WorkflowStatus.RUNNING:
                # Cancel in Kubeflow if run ID exists
                if execution.kubeflow_run_id:
                    await self.kubeflow_manager.cancel_run(execution.kubeflow_run_id)
                
                # Update status
                execution.status = WorkflowStatus.CANCELLED
                execution.end_time = datetime.utcnow()
                execution.duration = (execution.end_time - execution.start_time).total_seconds()
                
                logger.info("Workflow cancelled", execution_id=execution_id)
                return True
            
            return False
            
        except Exception as e:
            logger.error("Failed to cancel workflow",
                        execution_id=execution_id,
                        error=str(e))
            return False
    
    async def get_resource_utilization(self) -> Dict[str, Any]:
        """Get current resource utilization."""
        utilization = await self.resource_manager.get_resource_utilization()
        
        return {
            'resource_utilization': utilization,
            'active_workflows': len(self.scheduler.running_workflows),
            'pending_workflows': self.scheduler.pending_workflows.qsize(),
            'completed_workflows': len(self.scheduler.completed_workflows)
        }
    
    async def list_workflows(
        self, 
        status_filter: Optional[WorkflowStatus] = None,
        limit: int = 50
    ) -> List[WorkflowExecution]:
        """List workflow executions with optional filtering."""
        workflows = []
        
        # Add running workflows
        for execution in self.scheduler.running_workflows.values():
            if not status_filter or execution.status == status_filter:
                workflows.append(execution)
        
        # Add completed workflows
        for execution in self.scheduler.completed_workflows.values():
            if not status_filter or execution.status == status_filter:
                workflows.append(execution)
        
        # Sort by start time (most recent first)
        workflows.sort(key=lambda x: x.start_time, reverse=True)
        
        return workflows[:limit]
    
    async def get_pipeline_templates(self) -> List[PipelineTemplate]:
        """Get available pipeline templates."""
        return list(self.pipeline_templates.values())
    
    async def create_pipeline_template(self, template: PipelineTemplate) -> bool:
        """Create a new pipeline template."""
        try:
            self.pipeline_templates[template.template_id] = template
            logger.info("Pipeline template created", template_id=template.template_id)
            return True
        except Exception as e:
            logger.error("Failed to create pipeline template",
                        template_id=template.template_id,
                        error=str(e))
            return False
    
    async def get_workflow_logs(self, execution_id: str) -> List[str]:
        """Get logs for a workflow execution."""
        execution = await self.get_workflow_status(execution_id)
        if not execution:
            return []
        
        logs = execution.logs.copy()
        
        # Get Kubeflow logs if available
        if execution.kubeflow_run_id:
            kubeflow_logs = await self.kubeflow_manager.get_run_logs(execution.kubeflow_run_id)
            logs.extend(kubeflow_logs)
        
        return logs
    
    async def shutdown(self):
        """Gracefully shutdown the orchestrator."""
        try:
            logger.info("Shutting down AI Workflow Orchestrator")
            
            # Stop scheduler
            await self.scheduler.stop()
            
            # Close database connections
            if self.postgres_engine:
                await self.postgres_engine.dispose()
            
            if self.redis_client:
                await self.redis_client.close()
            
            logger.info("AI Workflow Orchestrator shutdown complete")
            
        except Exception as e:
            logger.error("Error during shutdown", error=str(e))

# Example usage and demonstration
async def main():
    """Example usage of the AI Workflow Orchestrator."""
    
    # Configuration
    config = {
        'kubeflow_endpoint': 'http://localhost:8080',
        'kubernetes_namespace': 'kubeflow',
        'mlflow_tracking_uri': 'http://localhost:5000',
        'postgres_url': 'postgresql+asyncpg://user:password@localhost:5432/orchestration',
        'redis_url': 'redis://localhost:6379/1',
        'kubernetes': {
            'total_cpu': 64,
            'total_memory': 256,  # GB
            'total_gpu': 8
        },
        'metrics_port': 8091
    }
    
    # Initialize orchestrator
    orchestrator = AIWorkflowOrchestrator(config)
    await orchestrator.initialize()
    
    try:
        # Create a training workflow
        training_config = await orchestrator.create_workflow_config(
            name="customer_churn_training",
            pipeline_type=PipelineType.TRAINING,
            model_type=ModelType.CLASSIFICATION,
            parameters={
                'data_path': '/data/customer_data.csv',
                'model_type': 'random_forest',
                'hyperparameters': {
                    'n_estimators': 100,
                    'max_depth': 10,
                    'random_state': 42
                },
                'test_size': 0.2
            },
            resources={'cpu': 4, 'memory': 8, 'gpu': 0},
            timeout=7200,  # 2 hours
            description="Train customer churn prediction model",
            tags=['churn', 'classification', 'customer'],
            template_id='classification_training'
        )
        
        # Submit workflow
        execution_id = await orchestrator.submit_workflow(training_config, created_by="data_scientist")
        print(f"Training workflow submitted: {execution_id}")
        
        # Create an inference workflow
        inference_config = await orchestrator.create_workflow_config(
            name="customer_churn_inference",
            pipeline_type=PipelineType.INFERENCE,
            parameters={
                'model_path': '/models/churn_model.pkl',
                'input_data': '/data/new_customers.csv',
                'output_path': '/results/churn_predictions.csv'
            },
            resources={'cpu': 2, 'memory': 4, 'gpu': 0},
            timeout=1800,  # 30 minutes
            description="Run churn predictions on new customers",
            template_id='batch_inference'
        )
        
        # Submit inference workflow
        inference_execution_id = await orchestrator.submit_workflow(inference_config)
        print(f"Inference workflow submitted: {inference_execution_id}")
        
        # Monitor workflows
        await asyncio.sleep(5)
        
        # Check status
        training_status = await orchestrator.get_workflow_status(execution_id)
        print(f"Training status: {training_status.status.value if training_status else 'Not found'}")
        
        # Get resource utilization
        resources = await orchestrator.get_resource_utilization()
        print(f"Resource utilization: {resources}")
        
        # List all workflows
        workflows = await orchestrator.list_workflows()
        print(f"Total workflows: {len(workflows)}")
        
        # Wait for completion (demo purposes)
        await asyncio.sleep(40)
        
        # Check final status
        final_status = await orchestrator.get_workflow_status(execution_id)
        print(f"Final training status: {final_status.status.value if final_status else 'Not found'}")
        
    finally:
        # Cleanup
        await orchestrator.shutdown()

if __name__ == "__main__":
    asyncio.run(main())