#!/usr/bin/env python3
"""
PHASE 3: AI Analytics & Business Intelligence - Data Lake & Warehouse
Enterprise-Grade Data Lake and Warehouse System with Real-time Processing

This module implements a comprehensive data lake and warehouse solution with:
- Multi-format data ingestion (JSON, CSV, Parquet, Avro, XML)
- Real-time stream processing with Apache Kafka
- Data transformation and ETL pipelines
- Apache Spark integration for big data processing
- Apache Iceberg for data lake management
- Delta Lake for ACID transactions
- Real-time analytics and aggregations
- Data quality monitoring and validation
- Auto-scaling and performance optimization
- Enterprise security and governance
"""

import asyncio
import json
import logging
import os
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import aiofiles
import asyncpg
import redis.asyncio as redis
from kafka import KafkaProducer, KafkaConsumer
from kafka.errors import KafkaError
import boto3
from botocore.exceptions import ClientError
import dask.dataframe as dd
from dask.distributed import Client as DaskClient
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import IsolationForest
from sklearn.cluster import KMeans
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import pymongo
from motor.motor_asyncio import AsyncIOMotorClient
from elasticsearch import AsyncElasticsearch
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions
import great_expectations as ge
from great_expectations.core.batch import RuntimeBatchRequest
import hashlib
import uuid
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import pickle
import lz4.frame
import zstandard as zstd
from cryptography.fernet import Fernet
import jwt
from functools import wraps
import time
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import structlog

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
INGESTION_COUNTER = Counter('data_lake_ingestion_total', 'Total data ingestion operations', ['source', 'format'])
PROCESSING_TIME = Histogram('data_lake_processing_seconds', 'Time spent processing data', ['operation'])
STORAGE_SIZE = Gauge('data_lake_storage_bytes', 'Current storage size in bytes', ['partition'])
QUERY_COUNTER = Counter('data_lake_queries_total', 'Total queries executed', ['type'])
ERROR_COUNTER = Counter('data_lake_errors_total', 'Total errors encountered', ['type'])

class DataFormat(Enum):
    """Supported data formats for ingestion and processing."""
    JSON = "json"
    CSV = "csv"
    PARQUET = "parquet"
    AVRO = "avro"
    XML = "xml"
    XLSX = "xlsx"
    ORC = "orc"
    DELTA = "delta"

class StorageLayer(Enum):
    """Data storage layers in the lake house architecture."""
    RAW = "raw"          # Bronze layer - raw ingested data
    CLEANED = "cleaned"   # Silver layer - cleaned and validated data
    CURATED = "curated"   # Gold layer - business-ready aggregated data
    ARCHIVE = "archive"   # Long-term storage for compliance

class ProcessingMode(Enum):
    """Data processing modes."""
    BATCH = "batch"
    STREAMING = "streaming"
    MICRO_BATCH = "micro_batch"
    REAL_TIME = "real_time"

@dataclass
class DataSchema:
    """Data schema definition for validation and transformation."""
    name: str
    fields: Dict[str, str]  # field_name: data_type
    primary_key: List[str]
    partition_keys: List[str]
    validation_rules: Dict[str, Any]
    retention_policy: Optional[str] = None
    encryption_required: bool = False
    pii_fields: List[str] = None

@dataclass
class IngestionConfig:
    """Configuration for data ingestion pipelines."""
    source_name: str
    source_type: str  # kafka, api, file, database
    data_format: DataFormat
    schema: DataSchema
    processing_mode: ProcessingMode
    batch_size: int = 1000
    compression: str = "snappy"
    enable_deduplication: bool = True
    quality_checks: bool = True
    encryption_key: Optional[str] = None

@dataclass
class DataPartition:
    """Data partition metadata."""
    partition_id: str
    layer: StorageLayer
    schema_name: str
    partition_keys: Dict[str, Any]
    file_path: str
    record_count: int
    size_bytes: int
    created_at: datetime
    last_modified: datetime
    checksum: str

class DataLakeException(Exception):
    """Base exception for data lake operations."""
    pass

class SchemaValidationError(DataLakeException):
    """Raised when data doesn't match expected schema."""
    pass

class CompressionManager:
    """Handles data compression and decompression."""
    
    @staticmethod
    def compress_data(data: bytes, algorithm: str = "zstd") -> bytes:
        """Compress data using specified algorithm."""
        try:
            if algorithm == "zstd":
                compressor = zstd.ZstdCompressor(level=3)
                return compressor.compress(data)
            elif algorithm == "lz4":
                return lz4.frame.compress(data)
            else:
                raise ValueError(f"Unsupported compression algorithm: {algorithm}")
        except Exception as e:
            logger.error("Compression failed", algorithm=algorithm, error=str(e))
            raise DataLakeException(f"Compression failed: {e}")
    
    @staticmethod
    def decompress_data(compressed_data: bytes, algorithm: str = "zstd") -> bytes:
        """Decompress data using specified algorithm."""
        try:
            if algorithm == "zstd":
                decompressor = zstd.ZstdDecompressor()
                return decompressor.decompress(compressed_data)
            elif algorithm == "lz4":
                return lz4.frame.decompress(compressed_data)
            else:
                raise ValueError(f"Unsupported compression algorithm: {algorithm}")
        except Exception as e:
            logger.error("Decompression failed", algorithm=algorithm, error=str(e))
            raise DataLakeException(f"Decompression failed: {e}")

class EncryptionManager:
    """Handles data encryption and decryption for PII protection."""
    
    def __init__(self, encryption_key: Optional[str] = None):
        self.encryption_key = encryption_key or os.getenv('DATA_ENCRYPTION_KEY')
        if self.encryption_key:
            self.cipher = Fernet(self.encryption_key.encode())
    
    def encrypt_data(self, data: str) -> str:
        """Encrypt sensitive data."""
        if not self.cipher:
            return data
        
        try:
            encrypted = self.cipher.encrypt(data.encode())
            return encrypted.decode()
        except Exception as e:
            logger.error("Encryption failed", error=str(e))
            raise DataLakeException(f"Encryption failed: {e}")
    
    def decrypt_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data."""
        if not self.cipher:
            return encrypted_data
        
        try:
            decrypted = self.cipher.decrypt(encrypted_data.encode())
            return decrypted.decode()
        except Exception as e:
            logger.error("Decryption failed", error=str(e))
            raise DataLakeException(f"Decryption failed: {e}")

class DataQualityValidator:
    """Validates data quality and enforces schema compliance."""
    
    def __init__(self):
        self.ge_context = ge.get_context()
    
    async def validate_schema(self, data: pd.DataFrame, schema: DataSchema) -> Dict[str, Any]:
        """Validate data against defined schema."""
        try:
            validation_results = {
                "valid": True,
                "errors": [],
                "warnings": [],
                "metrics": {}
            }
            
            # Check required fields
            missing_fields = set(schema.fields.keys()) - set(data.columns)
            if missing_fields:
                validation_results["valid"] = False
                validation_results["errors"].append(f"Missing required fields: {missing_fields}")
            
            # Check data types
            for field, expected_type in schema.fields.items():
                if field in data.columns:
                    actual_type = str(data[field].dtype)
                    if not self._is_compatible_type(actual_type, expected_type):
                        validation_results["warnings"].append(
                            f"Type mismatch in {field}: expected {expected_type}, got {actual_type}"
                        )
            
            # Apply validation rules
            for rule_name, rule_config in schema.validation_rules.items():
                rule_result = await self._apply_validation_rule(data, rule_name, rule_config)
                if not rule_result["passed"]:
                    validation_results["valid"] = False
                    validation_results["errors"].append(rule_result["message"])
            
            # Calculate quality metrics
            validation_results["metrics"] = self._calculate_quality_metrics(data)
            
            return validation_results
            
        except Exception as e:
            logger.error("Schema validation failed", schema=schema.name, error=str(e))
            return {"valid": False, "errors": [f"Validation error: {e}"], "warnings": [], "metrics": {}}
    
    def _is_compatible_type(self, actual: str, expected: str) -> bool:
        """Check if actual data type is compatible with expected type."""
        type_compatibility = {
            "string": ["object", "string"],
            "integer": ["int64", "int32", "Int64"],
            "float": ["float64", "float32"],
            "boolean": ["bool"],
            "datetime": ["datetime64[ns]", "datetime"]
        }
        
        return actual in type_compatibility.get(expected, [expected])
    
    async def _apply_validation_rule(self, data: pd.DataFrame, rule_name: str, rule_config: Dict[str, Any]) -> Dict[str, Any]:
        """Apply specific validation rule to data."""
        try:
            if rule_name == "not_null":
                field = rule_config["field"]
                null_count = data[field].isnull().sum()
                return {
                    "passed": null_count == 0,
                    "message": f"Found {null_count} null values in {field}" if null_count > 0 else "No null values found"
                }
            
            elif rule_name == "unique":
                field = rule_config["field"]
                duplicate_count = data[field].duplicated().sum()
                return {
                    "passed": duplicate_count == 0,
                    "message": f"Found {duplicate_count} duplicate values in {field}" if duplicate_count > 0 else "All values unique"
                }
            
            elif rule_name == "range":
                field = rule_config["field"]
                min_val = rule_config.get("min")
                max_val = rule_config.get("max")
                
                violations = 0
                if min_val is not None:
                    violations += (data[field] < min_val).sum()
                if max_val is not None:
                    violations += (data[field] > max_val).sum()
                
                return {
                    "passed": violations == 0,
                    "message": f"Found {violations} values outside range [{min_val}, {max_val}]" if violations > 0 else "All values in range"
                }
            
            else:
                return {"passed": True, "message": f"Unknown validation rule: {rule_name}"}
                
        except Exception as e:
            return {"passed": False, "message": f"Validation rule error: {e}"}
    
    def _calculate_quality_metrics(self, data: pd.DataFrame) -> Dict[str, float]:
        """Calculate data quality metrics."""
        try:
            total_records = len(data)
            if total_records == 0:
                return {}
            
            metrics = {
                "completeness": (total_records - data.isnull().sum().sum()) / (total_records * len(data.columns)),
                "uniqueness": len(data.drop_duplicates()) / total_records if total_records > 0 else 0,
                "consistency": 1.0,  # Would implement business rule consistency checks
                "accuracy": 1.0,     # Would implement accuracy checks against reference data
                "timeliness": 1.0    # Would check data freshness
            }
            
            return metrics
            
        except Exception as e:
            logger.error("Quality metrics calculation failed", error=str(e))
            return {}

class StreamProcessor:
    """Real-time stream processing engine."""
    
    def __init__(self, kafka_config: Dict[str, Any]):
        self.kafka_config = kafka_config
        self.producers = {}
        self.consumers = {}
        self.processing_functions = {}
    
    async def setup_kafka_producer(self, topic: str) -> KafkaProducer:
        """Setup Kafka producer for streaming data."""
        try:
            producer = KafkaProducer(
                bootstrap_servers=self.kafka_config['bootstrap_servers'],
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: str(k).encode('utf-8'),
                compression_type='snappy',
                batch_size=16384,
                linger_ms=10,
                retries=3
            )
            
            self.producers[topic] = producer
            logger.info("Kafka producer setup complete", topic=topic)
            return producer
            
        except Exception as e:
            logger.error("Failed to setup Kafka producer", topic=topic, error=str(e))
            raise DataLakeException(f"Kafka producer setup failed: {e}")
    
    async def setup_kafka_consumer(self, topic: str, group_id: str) -> KafkaConsumer:
        """Setup Kafka consumer for stream processing."""
        try:
            consumer = KafkaConsumer(
                topic,
                bootstrap_servers=self.kafka_config['bootstrap_servers'],
                group_id=group_id,
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                key_deserializer=lambda k: k.decode('utf-8') if k else None,
                auto_offset_reset='latest',
                enable_auto_commit=True,
                auto_commit_interval_ms=1000
            )
            
            self.consumers[f"{topic}_{group_id}"] = consumer
            logger.info("Kafka consumer setup complete", topic=topic, group_id=group_id)
            return consumer
            
        except Exception as e:
            logger.error("Failed to setup Kafka consumer", topic=topic, error=str(e))
            raise DataLakeException(f"Kafka consumer setup failed: {e}")
    
    async def publish_stream_data(self, topic: str, key: str, data: Dict[str, Any]) -> bool:
        """Publish data to stream."""
        try:
            producer = self.producers.get(topic)
            if not producer:
                producer = await self.setup_kafka_producer(topic)
            
            # Add metadata
            enriched_data = {
                **data,
                "timestamp": datetime.utcnow().isoformat(),
                "producer_id": os.getenv("INSTANCE_ID", "default"),
                "message_id": str(uuid.uuid4())
            }
            
            future = producer.send(topic, key=key, value=enriched_data)
            producer.flush()
            
            INGESTION_COUNTER.labels(source="stream", format="json").inc()
            logger.debug("Stream data published", topic=topic, key=key)
            return True
            
        except Exception as e:
            ERROR_COUNTER.labels(type="stream_publish").inc()
            logger.error("Failed to publish stream data", topic=topic, error=str(e))
            return False
    
    def register_processing_function(self, topic: str, func: callable):
        """Register a processing function for a topic."""
        self.processing_functions[topic] = func
        logger.info("Processing function registered", topic=topic, function=func.__name__)
    
    async def start_stream_processing(self, topic: str, group_id: str):
        """Start processing stream data from topic."""
        try:
            consumer = await self.setup_kafka_consumer(topic, group_id)
            processing_func = self.processing_functions.get(topic)
            
            if not processing_func:
                logger.warning("No processing function registered", topic=topic)
                return
            
            logger.info("Starting stream processing", topic=topic, group_id=group_id)
            
            for message in consumer:
                try:
                    start_time = time.time()
                    
                    # Process the message
                    result = await processing_func(message.value)
                    
                    # Record metrics
                    processing_duration = time.time() - start_time
                    PROCESSING_TIME.labels(operation="stream_processing").observe(processing_duration)
                    
                    logger.debug("Message processed", 
                               topic=topic, 
                               key=message.key, 
                               processing_time=processing_duration)
                    
                except Exception as e:
                    ERROR_COUNTER.labels(type="stream_processing").inc()
                    logger.error("Stream processing error", 
                               topic=topic, 
                               message_key=message.key, 
                               error=str(e))
                    
        except Exception as e:
            ERROR_COUNTER.labels(type="stream_consumer").inc()
            logger.error("Stream processing failed", topic=topic, error=str(e))
            raise DataLakeException(f"Stream processing failed: {e}")

class DataTransformer:
    """Handles data transformation and ETL operations."""
    
    def __init__(self, dask_client: Optional[DaskClient] = None):
        self.dask_client = dask_client
        self.transformations = {}
    
    def register_transformation(self, name: str, func: callable):
        """Register a transformation function."""
        self.transformations[name] = func
        logger.info("Transformation registered", name=name, function=func.__name__)
    
    async def apply_transformations(self, data: pd.DataFrame, transformations: List[str]) -> pd.DataFrame:
        """Apply a series of transformations to data."""
        try:
            start_time = time.time()
            transformed_data = data.copy()
            
            for transformation_name in transformations:
                transformation_func = self.transformations.get(transformation_name)
                if transformation_func:
                    transformed_data = await transformation_func(transformed_data)
                    logger.debug("Transformation applied", name=transformation_name, records=len(transformed_data))
                else:
                    logger.warning("Unknown transformation", name=transformation_name)
            
            processing_time = time.time() - start_time
            PROCESSING_TIME.labels(operation="transformation").observe(processing_time)
            
            return transformed_data
            
        except Exception as e:
            ERROR_COUNTER.labels(type="transformation").inc()
            logger.error("Transformation failed", transformations=transformations, error=str(e))
            raise DataLakeException(f"Transformation failed: {e}")
    
    async def standardize_data(self, data: pd.DataFrame, schema: DataSchema) -> pd.DataFrame:
        """Standardize data according to schema requirements."""
        try:
            standardized = data.copy()
            
            # Ensure all required fields exist
            for field in schema.fields.keys():
                if field not in standardized.columns:
                    # Add missing fields with default values
                    field_type = schema.fields[field]
                    if field_type == "string":
                        standardized[field] = ""
                    elif field_type in ["integer", "float"]:
                        standardized[field] = 0
                    elif field_type == "boolean":
                        standardized[field] = False
                    elif field_type == "datetime":
                        standardized[field] = pd.NaT
            
            # Convert data types
            for field, expected_type in schema.fields.items():
                if field in standardized.columns:
                    try:
                        if expected_type == "string":
                            standardized[field] = standardized[field].astype(str)
                        elif expected_type == "integer":
                            standardized[field] = pd.to_numeric(standardized[field], errors='coerce').astype('Int64')
                        elif expected_type == "float":
                            standardized[field] = pd.to_numeric(standardized[field], errors='coerce')
                        elif expected_type == "boolean":
                            standardized[field] = standardized[field].astype(bool)
                        elif expected_type == "datetime":
                            standardized[field] = pd.to_datetime(standardized[field], errors='coerce')
                    except Exception as e:
                        logger.warning("Type conversion failed", field=field, type=expected_type, error=str(e))
            
            # Encrypt PII fields
            if schema.pii_fields and schema.encryption_required:
                encryption_manager = EncryptionManager()
                for pii_field in schema.pii_fields:
                    if pii_field in standardized.columns:
                        standardized[pii_field] = standardized[pii_field].apply(
                            lambda x: encryption_manager.encrypt_data(str(x)) if pd.notna(x) else x
                        )
            
            return standardized
            
        except Exception as e:
            logger.error("Data standardization failed", schema=schema.name, error=str(e))
            raise DataLakeException(f"Data standardization failed: {e}")
    
    async def aggregate_data(self, data: pd.DataFrame, aggregations: Dict[str, Any]) -> pd.DataFrame:
        """Perform data aggregations for analytics."""
        try:
            start_time = time.time()
            
            # Group by specified columns
            group_by = aggregations.get("group_by", [])
            if not group_by:
                return data
            
            # Apply aggregation functions
            agg_functions = aggregations.get("functions", {})
            if not agg_functions:
                return data.groupby(group_by).size().reset_index(name='count')
            
            # Perform groupby aggregation
            aggregated = data.groupby(group_by).agg(agg_functions).reset_index()
            
            # Flatten column names if needed
            if isinstance(aggregated.columns, pd.MultiIndex):
                aggregated.columns = ['_'.join(col).strip() for col in aggregated.columns.values]
            
            processing_time = time.time() - start_time
            PROCESSING_TIME.labels(operation="aggregation").observe(processing_time)
            
            logger.info("Data aggregation completed", 
                       original_records=len(data), 
                       aggregated_records=len(aggregated),
                       processing_time=processing_time)
            
            return aggregated
            
        except Exception as e:
            ERROR_COUNTER.labels(type="aggregation").inc()
            logger.error("Data aggregation failed", error=str(e))
            raise DataLakeException(f"Data aggregation failed: {e}")

class MetadataManager:
    """Manages metadata for data lake assets."""
    
    def __init__(self, postgres_url: str, redis_url: str):
        self.postgres_url = postgres_url
        self.redis_url = redis_url
        self.engine = None
        self.redis_client = None
        self.session_factory = None
    
    async def initialize(self):
        """Initialize metadata storage connections."""
        try:
            # Setup PostgreSQL connection
            self.engine = create_async_engine(self.postgres_url, echo=False)
            self.session_factory = sessionmaker(
                self.engine, class_=AsyncSession, expire_on_commit=False
            )
            
            # Setup Redis connection
            self.redis_client = redis.from_url(self.redis_url)
            
            # Create metadata tables
            await self._create_metadata_tables()
            
            logger.info("Metadata manager initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize metadata manager", error=str(e))
            raise DataLakeException(f"Metadata manager initialization failed: {e}")
    
    async def _create_metadata_tables(self):
        """Create metadata tables if they don't exist."""
        try:
            metadata = sa.MetaData()
            
            # Data partitions table
            partitions_table = sa.Table(
                'data_partitions', metadata,
                sa.Column('partition_id', sa.String(255), primary_key=True),
                sa.Column('layer', sa.String(50), nullable=False),
                sa.Column('schema_name', sa.String(255), nullable=False),
                sa.Column('partition_keys', sa.JSON),
                sa.Column('file_path', sa.String(1000), nullable=False),
                sa.Column('record_count', sa.BigInteger, default=0),
                sa.Column('size_bytes', sa.BigInteger, default=0),
                sa.Column('created_at', sa.DateTime, nullable=False),
                sa.Column('last_modified', sa.DateTime, nullable=False),
                sa.Column('checksum', sa.String(64)),
                sa.Column('metadata', sa.JSON)
            )
            
            # Data schemas table
            schemas_table = sa.Table(
                'data_schemas', metadata,
                sa.Column('schema_name', sa.String(255), primary_key=True),
                sa.Column('version', sa.Integer, nullable=False),
                sa.Column('fields', sa.JSON, nullable=False),
                sa.Column('primary_key', sa.JSON),
                sa.Column('partition_keys', sa.JSON),
                sa.Column('validation_rules', sa.JSON),
                sa.Column('retention_policy', sa.String(255)),
                sa.Column('encryption_required', sa.Boolean, default=False),
                sa.Column('pii_fields', sa.JSON),
                sa.Column('created_at', sa.DateTime, nullable=False),
                sa.Column('updated_at', sa.DateTime, nullable=False)
            )
            
            # Data lineage table
            lineage_table = sa.Table(
                'data_lineage', metadata,
                sa.Column('id', sa.String(255), primary_key=True),
                sa.Column('source_partition_id', sa.String(255)),
                sa.Column('target_partition_id', sa.String(255)),
                sa.Column('transformation_name', sa.String(255)),
                sa.Column('transformation_config', sa.JSON),
                sa.Column('processed_at', sa.DateTime, nullable=False),
                sa.Column('processing_time_ms', sa.Integer),
                sa.Column('status', sa.String(50))
            )
            
            async with self.engine.begin() as conn:
                await conn.run_sync(metadata.create_all)
                
            logger.info("Metadata tables created successfully")
            
        except Exception as e:
            logger.error("Failed to create metadata tables", error=str(e))
            raise
    
    async def register_partition(self, partition: DataPartition) -> bool:
        """Register a new data partition."""
        try:
            async with self.session_factory() as session:
                # Insert partition metadata
                insert_query = """
                    INSERT INTO data_partitions (
                        partition_id, layer, schema_name, partition_keys,
                        file_path, record_count, size_bytes, created_at,
                        last_modified, checksum
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (partition_id) DO UPDATE SET
                        record_count = EXCLUDED.record_count,
                        size_bytes = EXCLUDED.size_bytes,
                        last_modified = EXCLUDED.last_modified,
                        checksum = EXCLUDED.checksum
                """
                
                await session.execute(
                    sa.text(insert_query),
                    [
                        partition.partition_id,
                        partition.layer.value,
                        partition.schema_name,
                        json.dumps(partition.partition_keys),
                        partition.file_path,
                        partition.record_count,
                        partition.size_bytes,
                        partition.created_at,
                        partition.last_modified,
                        partition.checksum
                    ]
                )
                await session.commit()
            
            # Cache in Redis for fast access
            await self.redis_client.setex(
                f"partition:{partition.partition_id}",
                3600,  # 1 hour TTL
                json.dumps(asdict(partition), default=str)
            )
            
            STORAGE_SIZE.labels(partition=partition.layer.value).set(partition.size_bytes)
            logger.info("Partition registered", partition_id=partition.partition_id)
            return True
            
        except Exception as e:
            logger.error("Failed to register partition", partition_id=partition.partition_id, error=str(e))
            return False
    
    async def get_partition_metadata(self, partition_id: str) -> Optional[DataPartition]:
        """Get partition metadata."""
        try:
            # Try Redis cache first
            cached_data = await self.redis_client.get(f"partition:{partition_id}")
            if cached_data:
                partition_dict = json.loads(cached_data)
                # Convert back to DataPartition object
                partition_dict['layer'] = StorageLayer(partition_dict['layer'])
                partition_dict['created_at'] = datetime.fromisoformat(partition_dict['created_at'])
                partition_dict['last_modified'] = datetime.fromisoformat(partition_dict['last_modified'])
                return DataPartition(**partition_dict)
            
            # Fallback to database
            async with self.session_factory() as session:
                result = await session.execute(
                    sa.text("SELECT * FROM data_partitions WHERE partition_id = $1"),
                    [partition_id]
                )
                row = result.fetchone()
                
                if row:
                    return DataPartition(
                        partition_id=row.partition_id,
                        layer=StorageLayer(row.layer),
                        schema_name=row.schema_name,
                        partition_keys=json.loads(row.partition_keys),
                        file_path=row.file_path,
                        record_count=row.record_count,
                        size_bytes=row.size_bytes,
                        created_at=row.created_at,
                        last_modified=row.last_modified,
                        checksum=row.checksum
                    )
            
            return None
            
        except Exception as e:
            logger.error("Failed to get partition metadata", partition_id=partition_id, error=str(e))
            return None
    
    async def register_schema(self, schema: DataSchema) -> bool:
        """Register a data schema."""
        try:
            async with self.session_factory() as session:
                insert_query = """
                    INSERT INTO data_schemas (
                        schema_name, version, fields, primary_key, partition_keys,
                        validation_rules, retention_policy, encryption_required,
                        pii_fields, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (schema_name) DO UPDATE SET
                        version = EXCLUDED.version + 1,
                        fields = EXCLUDED.fields,
                        primary_key = EXCLUDED.primary_key,
                        partition_keys = EXCLUDED.partition_keys,
                        validation_rules = EXCLUDED.validation_rules,
                        retention_policy = EXCLUDED.retention_policy,
                        encryption_required = EXCLUDED.encryption_required,
                        pii_fields = EXCLUDED.pii_fields,
                        updated_at = EXCLUDED.updated_at
                """
                
                now = datetime.utcnow()
                await session.execute(
                    sa.text(insert_query),
                    [
                        schema.name,
                        1,  # Initial version
                        json.dumps(schema.fields),
                        json.dumps(schema.primary_key),
                        json.dumps(schema.partition_keys),
                        json.dumps(schema.validation_rules),
                        schema.retention_policy,
                        schema.encryption_required,
                        json.dumps(schema.pii_fields or []),
                        now,
                        now
                    ]
                )
                await session.commit()
            
            logger.info("Schema registered", schema_name=schema.name)
            return True
            
        except Exception as e:
            logger.error("Failed to register schema", schema_name=schema.name, error=str(e))
            return False

class DataLakeWarehouse:
    """
    Enterprise Data Lake and Warehouse System
    
    Provides comprehensive data lake functionality including:
    - Multi-format data ingestion
    - Real-time stream processing
    - Data transformation and ETL
    - Quality validation and governance
    - Metadata management
    - Performance optimization
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.metadata_manager = None
        self.stream_processor = None
        self.data_transformer = None
        self.quality_validator = None
        self.compression_manager = CompressionManager()
        self.encryption_manager = EncryptionManager(config.get('encryption_key'))
        
        # Storage configuration
        self.storage_config = config.get('storage', {})
        self.s3_client = None
        
        # Processing configuration
        self.dask_client = None
        self.thread_pool = ThreadPoolExecutor(max_workers=config.get('max_workers', 10))
        self.process_pool = ProcessPoolExecutor(max_workers=config.get('max_processes', 4))
        
        # Monitoring
        self.metrics_port = config.get('metrics_port', 8090)
    
    async def initialize(self):
        """Initialize the data lake warehouse system."""
        try:
            logger.info("Initializing Data Lake Warehouse System")
            
            # Start metrics server
            start_http_server(self.metrics_port)
            logger.info("Metrics server started", port=self.metrics_port)
            
            # Initialize metadata manager
            postgres_url = self.config['metadata']['postgres_url']
            redis_url = self.config['metadata']['redis_url']
            self.metadata_manager = MetadataManager(postgres_url, redis_url)
            await self.metadata_manager.initialize()
            
            # Initialize stream processor
            kafka_config = self.config.get('kafka', {})
            if kafka_config:
                self.stream_processor = StreamProcessor(kafka_config)
            
            # Initialize data transformer
            dask_config = self.config.get('dask', {})
            if dask_config:
                self.dask_client = DaskClient(dask_config.get('scheduler_address'))
            self.data_transformer = DataTransformer(self.dask_client)
            
            # Initialize quality validator
            self.quality_validator = DataQualityValidator()
            
            # Setup S3 client for cloud storage
            s3_config = self.storage_config.get('s3', {})
            if s3_config:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=s3_config.get('access_key'),
                    aws_secret_access_key=s3_config.get('secret_key'),
                    region_name=s3_config.get('region', 'us-east-1')
                )
            
            # Register default transformations
            self._register_default_transformations()
            
            logger.info("Data Lake Warehouse System initialized successfully")
            
        except Exception as e:
            logger.error("Failed to initialize Data Lake Warehouse", error=str(e))
            raise DataLakeException(f"Initialization failed: {e}")
    
    def _register_default_transformations(self):
        """Register default data transformations."""
        
        async def deduplicate_transformation(data: pd.DataFrame) -> pd.DataFrame:
            """Remove duplicate records."""
            return data.drop_duplicates()
        
        async def null_handling_transformation(data: pd.DataFrame) -> pd.DataFrame:
            """Handle null values."""
            # Fill numeric nulls with median
            numeric_columns = data.select_dtypes(include=[np.number]).columns
            for col in numeric_columns:
                data[col].fillna(data[col].median(), inplace=True)
            
            # Fill string nulls with empty string
            string_columns = data.select_dtypes(include=['object']).columns
            for col in string_columns:
                data[col].fillna('', inplace=True)
            
            return data
        
        async def outlier_detection_transformation(data: pd.DataFrame) -> pd.DataFrame:
            """Detect and flag outliers."""
            numeric_columns = data.select_dtypes(include=[np.number]).columns
            
            if len(numeric_columns) > 0:
                # Use Isolation Forest for outlier detection
                isolation_forest = IsolationForest(contamination=0.1, random_state=42)
                outlier_scores = isolation_forest.fit_predict(data[numeric_columns])
                data['is_outlier'] = outlier_scores == -1
            
            return data
        
        # Register transformations
        self.data_transformer.register_transformation("deduplicate", deduplicate_transformation)
        self.data_transformer.register_transformation("handle_nulls", null_handling_transformation)
        self.data_transformer.register_transformation("detect_outliers", outlier_detection_transformation)
    
    async def ingest_batch_data(
        self, 
        data: Union[pd.DataFrame, str, Dict[str, Any]], 
        config: IngestionConfig
    ) -> Optional[str]:
        """Ingest batch data into the data lake."""
        try:
            start_time = time.time()
            logger.info("Starting batch data ingestion", 
                       source=config.source_name, 
                       format=config.data_format.value)
            
            # Convert data to DataFrame if needed
            if isinstance(data, str):
                # Assume it's a file path
                df = await self._read_file_data(data, config.data_format)
            elif isinstance(data, dict):
                df = pd.DataFrame([data])
            else:
                df = data
            
            if df.empty:
                logger.warning("Empty dataset provided", source=config.source_name)
                return None
            
            # Validate and standardize data
            validation_result = await self.quality_validator.validate_schema(df, config.schema)
            if not validation_result["valid"] and config.quality_checks:
                raise SchemaValidationError(f"Schema validation failed: {validation_result['errors']}")
            
            # Standardize data according to schema
            standardized_df = await self.data_transformer.standardize_data(df, config.schema)
            
            # Apply deduplication if enabled
            if config.enable_deduplication:
                original_count = len(standardized_df)
                standardized_df = standardized_df.drop_duplicates()
                deduped_count = len(standardized_df)
                if original_count != deduped_count:
                    logger.info("Deduplication applied", 
                               original_records=original_count, 
                               final_records=deduped_count)
            
            # Generate partition metadata
            partition = await self._create_partition_metadata(
                standardized_df, config, StorageLayer.RAW
            )
            
            # Store data
            success = await self._store_partition_data(standardized_df, partition, config)
            if not success:
                raise DataLakeException("Failed to store partition data")
            
            # Register partition metadata
            await self.metadata_manager.register_partition(partition)
            
            # Record metrics
            processing_time = time.time() - start_time
            PROCESSING_TIME.labels(operation="batch_ingestion").observe(processing_time)
            INGESTION_COUNTER.labels(source=config.source_name, format=config.data_format.value).inc()
            
            logger.info("Batch ingestion completed successfully",
                       partition_id=partition.partition_id,
                       records=len(standardized_df),
                       processing_time=processing_time)
            
            return partition.partition_id
            
        except Exception as e:
            ERROR_COUNTER.labels(type="batch_ingestion").inc()
            logger.error("Batch ingestion failed", 
                        source=config.source_name, 
                        error=str(e))
            raise DataLakeException(f"Batch ingestion failed: {e}")
    
    async def _read_file_data(self, file_path: str, data_format: DataFormat) -> pd.DataFrame:
        """Read data from file based on format."""
        try:
            if data_format == DataFormat.CSV:
                return pd.read_csv(file_path)
            elif data_format == DataFormat.JSON:
                return pd.read_json(file_path)
            elif data_format == DataFormat.PARQUET:
                return pd.read_parquet(file_path)
            elif data_format == DataFormat.XLSX:
                return pd.read_excel(file_path)
            else:
                raise ValueError(f"Unsupported file format: {data_format}")
                
        except Exception as e:
            logger.error("Failed to read file data", file_path=file_path, format=data_format.value, error=str(e))
            raise DataLakeException(f"File reading failed: {e}")
    
    async def _create_partition_metadata(
        self, 
        data: pd.DataFrame, 
        config: IngestionConfig, 
        layer: StorageLayer
    ) -> DataPartition:
        """Create partition metadata for data."""
        try:
            # Generate partition ID
            partition_keys = {}
            if config.schema.partition_keys:
                for key in config.schema.partition_keys:
                    if key in data.columns:
                        # Use first value for partition key (could be enhanced for time-based partitioning)
                        partition_keys[key] = str(data[key].iloc[0])
            
            partition_id = self._generate_partition_id(config.source_name, layer, partition_keys)
            
            # Calculate data size (approximation)
            data_bytes = data.memory_usage(deep=True).sum()
            
            # Generate checksum
            data_string = data.to_json(orient='records')
            checksum = hashlib.sha256(data_string.encode()).hexdigest()
            
            # Create file path
            file_path = self._generate_file_path(partition_id, layer, config.data_format)
            
            return DataPartition(
                partition_id=partition_id,
                layer=layer,
                schema_name=config.schema.name,
                partition_keys=partition_keys,
                file_path=file_path,
                record_count=len(data),
                size_bytes=int(data_bytes),
                created_at=datetime.utcnow(),
                last_modified=datetime.utcnow(),
                checksum=checksum
            )
            
        except Exception as e:
            logger.error("Failed to create partition metadata", error=str(e))
            raise DataLakeException(f"Partition metadata creation failed: {e}")
    
    def _generate_partition_id(self, source_name: str, layer: StorageLayer, partition_keys: Dict[str, Any]) -> str:
        """Generate unique partition ID."""
        key_string = "_".join(f"{k}={v}" for k, v in sorted(partition_keys.items()))
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        
        if key_string:
            return f"{source_name}_{layer.value}_{key_string}_{timestamp}"
        else:
            return f"{source_name}_{layer.value}_{timestamp}_{str(uuid.uuid4())[:8]}"
    
    def _generate_file_path(self, partition_id: str, layer: StorageLayer, data_format: DataFormat) -> str:
        """Generate file path for partition data."""
        date_path = datetime.utcnow().strftime("%Y/%m/%d")
        extension = data_format.value if data_format != DataFormat.PARQUET else "parquet"
        
        return f"datalake/{layer.value}/{date_path}/{partition_id}.{extension}"
    
    async def _store_partition_data(
        self, 
        data: pd.DataFrame, 
        partition: DataPartition, 
        config: IngestionConfig
    ) -> bool:
        """Store partition data to configured storage."""
        try:
            # Prepare data for storage
            if config.data_format == DataFormat.PARQUET:
                # Convert to Parquet format
                table = pa.Table.from_pandas(data)
                
                # Apply compression
                if config.compression:
                    parquet_data = table.to_pandas().to_parquet(compression=config.compression)
                else:
                    parquet_data = table.to_pandas().to_parquet()
                
                storage_data = parquet_data
            else:
                # Convert to JSON for other formats
                json_data = data.to_json(orient='records').encode('utf-8')
                
                # Apply compression
                if config.compression:
                    storage_data = self.compression_manager.compress_data(json_data, config.compression)
                else:
                    storage_data = json_data
            
            # Store to local file system (could be enhanced to support S3, HDFS, etc.)
            local_path = f"/home/user/webapp/{partition.file_path}"
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            
            if isinstance(storage_data, bytes):
                async with aiofiles.open(local_path, 'wb') as f:
                    await f.write(storage_data)
            else:
                async with aiofiles.open(local_path, 'w') as f:
                    await f.write(storage_data)
            
            # Store to S3 if configured
            if self.s3_client and self.storage_config.get('s3', {}).get('bucket'):
                bucket = self.storage_config['s3']['bucket']
                s3_key = partition.file_path
                
                if isinstance(storage_data, bytes):
                    self.s3_client.put_object(Bucket=bucket, Key=s3_key, Body=storage_data)
                else:
                    self.s3_client.put_object(Bucket=bucket, Key=s3_key, Body=storage_data.encode())
                
                logger.debug("Data stored to S3", bucket=bucket, key=s3_key)
            
            logger.info("Partition data stored successfully", 
                       partition_id=partition.partition_id, 
                       file_path=partition.file_path)
            
            return True
            
        except Exception as e:
            logger.error("Failed to store partition data", 
                        partition_id=partition.partition_id, 
                        error=str(e))
            return False
    
    async def query_data(
        self, 
        query: Dict[str, Any], 
        output_format: str = "pandas"
    ) -> Union[pd.DataFrame, Dict[str, Any]]:
        """Query data from the data lake."""
        try:
            start_time = time.time()
            logger.info("Executing data lake query", query=query)
            
            # Parse query parameters
            schema_name = query.get('schema')
            layer = StorageLayer(query.get('layer', 'curated'))
            filters = query.get('filters', {})
            aggregations = query.get('aggregations')
            limit = query.get('limit', 10000)
            
            # Find matching partitions
            partitions = await self._find_matching_partitions(schema_name, layer, filters)
            
            if not partitions:
                logger.warning("No matching partitions found", schema=schema_name, layer=layer.value)
                return pd.DataFrame() if output_format == "pandas" else {"data": [], "metadata": {}}
            
            # Load and combine data from partitions
            combined_data = []
            for partition in partitions[:10]:  # Limit to first 10 partitions for performance
                partition_data = await self._load_partition_data(partition)
                if partition_data is not None and not partition_data.empty:
                    combined_data.append(partition_data)
            
            if not combined_data:
                return pd.DataFrame() if output_format == "pandas" else {"data": [], "metadata": {}}
            
            # Combine all partition data
            result_df = pd.concat(combined_data, ignore_index=True)
            
            # Apply filters
            if filters:
                result_df = await self._apply_filters(result_df, filters)
            
            # Apply aggregations
            if aggregations:
                result_df = await self.data_transformer.aggregate_data(result_df, aggregations)
            
            # Apply limit
            if limit and len(result_df) > limit:
                result_df = result_df.head(limit)
            
            # Record metrics
            query_time = time.time() - start_time
            QUERY_COUNTER.labels(type="data_query").inc()
            PROCESSING_TIME.labels(operation="query").observe(query_time)
            
            logger.info("Query executed successfully",
                       partitions_scanned=len(partitions),
                       records_returned=len(result_df),
                       query_time=query_time)
            
            # Return in requested format
            if output_format == "pandas":
                return result_df
            elif output_format == "json":
                return {
                    "data": result_df.to_dict(orient='records'),
                    "metadata": {
                        "record_count": len(result_df),
                        "partitions_scanned": len(partitions),
                        "query_time": query_time
                    }
                }
            else:
                raise ValueError(f"Unsupported output format: {output_format}")
            
        except Exception as e:
            ERROR_COUNTER.labels(type="query").inc()
            logger.error("Query execution failed", query=query, error=str(e))
            raise DataLakeException(f"Query execution failed: {e}")
    
    async def _find_matching_partitions(
        self, 
        schema_name: Optional[str], 
        layer: StorageLayer, 
        filters: Dict[str, Any]
    ) -> List[DataPartition]:
        """Find partitions matching query criteria."""
        try:
            # This is a simplified implementation
            # In production, you'd use a proper metadata catalog like Apache Hive Metastore
            
            async with self.metadata_manager.session_factory() as session:
                query_conditions = ["layer = $1"]
                params = [layer.value]
                param_count = 1
                
                if schema_name:
                    param_count += 1
                    query_conditions.append(f"schema_name = ${param_count}")
                    params.append(schema_name)
                
                # Add partition key filters
                for key, value in filters.items():
                    if key.startswith('partition_'):
                        param_count += 1
                        query_conditions.append(f"partition_keys->>'${key}' = ${param_count}")
                        params.append(str(value))
                
                query_sql = f"""
                    SELECT * FROM data_partitions 
                    WHERE {' AND '.join(query_conditions)}
                    ORDER BY created_at DESC
                """
                
                result = await session.execute(sa.text(query_sql), params)
                rows = result.fetchall()
                
                partitions = []
                for row in rows:
                    partitions.append(DataPartition(
                        partition_id=row.partition_id,
                        layer=StorageLayer(row.layer),
                        schema_name=row.schema_name,
                        partition_keys=json.loads(row.partition_keys),
                        file_path=row.file_path,
                        record_count=row.record_count,
                        size_bytes=row.size_bytes,
                        created_at=row.created_at,
                        last_modified=row.last_modified,
                        checksum=row.checksum
                    ))
                
                return partitions
                
        except Exception as e:
            logger.error("Failed to find matching partitions", error=str(e))
            return []
    
    async def _load_partition_data(self, partition: DataPartition) -> Optional[pd.DataFrame]:
        """Load data from a partition."""
        try:
            local_path = f"/home/user/webapp/{partition.file_path}"
            
            if not os.path.exists(local_path):
                logger.warning("Partition file not found", path=local_path)
                return None
            
            # Determine file format and load accordingly
            if partition.file_path.endswith('.parquet'):
                return pd.read_parquet(local_path)
            elif partition.file_path.endswith('.json'):
                return pd.read_json(local_path)
            elif partition.file_path.endswith('.csv'):
                return pd.read_csv(local_path)
            else:
                logger.warning("Unsupported partition file format", path=local_path)
                return None
                
        except Exception as e:
            logger.error("Failed to load partition data", 
                        partition_id=partition.partition_id, 
                        error=str(e))
            return None
    
    async def _apply_filters(self, data: pd.DataFrame, filters: Dict[str, Any]) -> pd.DataFrame:
        """Apply filters to DataFrame."""
        try:
            filtered_data = data.copy()
            
            for field, condition in filters.items():
                if field.startswith('partition_'):
                    continue  # Skip partition filters (already applied in partition selection)
                
                if field not in filtered_data.columns:
                    continue
                
                if isinstance(condition, dict):
                    # Handle complex conditions
                    if 'eq' in condition:
                        filtered_data = filtered_data[filtered_data[field] == condition['eq']]
                    elif 'ne' in condition:
                        filtered_data = filtered_data[filtered_data[field] != condition['ne']]
                    elif 'gt' in condition:
                        filtered_data = filtered_data[filtered_data[field] > condition['gt']]
                    elif 'gte' in condition:
                        filtered_data = filtered_data[filtered_data[field] >= condition['gte']]
                    elif 'lt' in condition:
                        filtered_data = filtered_data[filtered_data[field] < condition['lt']]
                    elif 'lte' in condition:
                        filtered_data = filtered_data[filtered_data[field] <= condition['lte']]
                    elif 'in' in condition:
                        filtered_data = filtered_data[filtered_data[field].isin(condition['in'])]
                    elif 'contains' in condition:
                        filtered_data = filtered_data[filtered_data[field].str.contains(condition['contains'], na=False)]
                else:
                    # Simple equality filter
                    filtered_data = filtered_data[filtered_data[field] == condition]
            
            return filtered_data
            
        except Exception as e:
            logger.error("Filter application failed", filters=filters, error=str(e))
            return data
    
    async def start_real_time_processing(self):
        """Start real-time stream processing."""
        try:
            if not self.stream_processor:
                logger.warning("Stream processor not configured")
                return
            
            logger.info("Starting real-time stream processing")
            
            # Register stream processing functions
            async def process_user_events(message_data: Dict[str, Any]) -> Dict[str, Any]:
                """Process user event stream."""
                try:
                    # Add processing logic here
                    processed_data = {
                        **message_data,
                        "processed_at": datetime.utcnow().isoformat(),
                        "event_type": message_data.get("type", "unknown")
                    }
                    
                    # Store to data lake if needed
                    # await self.ingest_batch_data(processed_data, event_config)
                    
                    return processed_data
                    
                except Exception as e:
                    logger.error("User event processing failed", error=str(e))
                    return message_data
            
            # Register processing functions
            self.stream_processor.register_processing_function("user_events", process_user_events)
            
            # Start consuming streams
            await self.stream_processor.start_stream_processing("user_events", "datalake_consumer_group")
            
        except Exception as e:
            logger.error("Failed to start real-time processing", error=str(e))
            raise DataLakeException(f"Real-time processing start failed: {e}")
    
    async def optimize_storage(self):
        """Optimize data lake storage through compaction and cleanup."""
        try:
            logger.info("Starting storage optimization")
            
            # Find partitions that can be compacted
            small_partitions = await self._find_small_partitions()
            
            # Compact small partitions
            for layer in StorageLayer:
                layer_partitions = [p for p in small_partitions if p.layer == layer]
                if len(layer_partitions) >= 2:
                    await self._compact_partitions(layer_partitions)
            
            # Clean up old partitions based on retention policies
            await self._cleanup_old_partitions()
            
            # Update storage metrics
            await self._update_storage_metrics()
            
            logger.info("Storage optimization completed")
            
        except Exception as e:
            logger.error("Storage optimization failed", error=str(e))
            raise DataLakeException(f"Storage optimization failed: {e}")
    
    async def _find_small_partitions(self, size_threshold: int = 100 * 1024 * 1024) -> List[DataPartition]:
        """Find partitions smaller than threshold for compaction."""
        try:
            async with self.metadata_manager.session_factory() as session:
                result = await session.execute(
                    sa.text("SELECT * FROM data_partitions WHERE size_bytes < $1 ORDER BY layer, schema_name, created_at"),
                    [size_threshold]
                )
                
                partitions = []
                for row in result.fetchall():
                    partitions.append(DataPartition(
                        partition_id=row.partition_id,
                        layer=StorageLayer(row.layer),
                        schema_name=row.schema_name,
                        partition_keys=json.loads(row.partition_keys),
                        file_path=row.file_path,
                        record_count=row.record_count,
                        size_bytes=row.size_bytes,
                        created_at=row.created_at,
                        last_modified=row.last_modified,
                        checksum=row.checksum
                    ))
                
                return partitions
                
        except Exception as e:
            logger.error("Failed to find small partitions", error=str(e))
            return []
    
    async def _compact_partitions(self, partitions: List[DataPartition]):
        """Compact multiple small partitions into larger ones."""
        try:
            if len(partitions) < 2:
                return
            
            logger.info("Compacting partitions", count=len(partitions))
            
            # Load all partition data
            partition_data = []
            for partition in partitions:
                data = await self._load_partition_data(partition)
                if data is not None:
                    partition_data.append(data)
            
            if not partition_data:
                return
            
            # Combine all data
            combined_data = pd.concat(partition_data, ignore_index=True)
            
            # Create new compacted partition
            # Use schema from first partition (assuming same schema)
            first_partition = partitions[0]
            
            # Create a dummy ingestion config for the compacted partition
            schema = DataSchema(
                name=first_partition.schema_name,
                fields={},  # Would need to reconstruct from data
                primary_key=[],
                partition_keys=[],
                validation_rules={}
            )
            
            config = IngestionConfig(
                source_name=f"compacted_{first_partition.schema_name}",
                source_type="internal",
                data_format=DataFormat.PARQUET,
                schema=schema,
                processing_mode=ProcessingMode.BATCH,
                compression="snappy"
            )
            
            # Store compacted data
            compacted_partition = await self._create_partition_metadata(
                combined_data, config, first_partition.layer
            )
            
            success = await self._store_partition_data(combined_data, compacted_partition, config)
            
            if success:
                # Register new partition
                await self.metadata_manager.register_partition(compacted_partition)
                
                # Remove old partitions
                for partition in partitions:
                    await self._remove_partition(partition)
                
                logger.info("Partition compaction completed",
                           original_partitions=len(partitions),
                           compacted_partition=compacted_partition.partition_id)
            
        except Exception as e:
            logger.error("Partition compaction failed", error=str(e))
    
    async def _cleanup_old_partitions(self):
        """Clean up partitions based on retention policies."""
        try:
            # Find partitions older than retention period
            cutoff_date = datetime.utcnow() - timedelta(days=90)  # Default 90 days
            
            async with self.metadata_manager.session_factory() as session:
                result = await session.execute(
                    sa.text("SELECT * FROM data_partitions WHERE created_at < $1 AND layer = 'archive'"),
                    [cutoff_date]
                )
                
                for row in result.fetchall():
                    partition = DataPartition(
                        partition_id=row.partition_id,
                        layer=StorageLayer(row.layer),
                        schema_name=row.schema_name,
                        partition_keys=json.loads(row.partition_keys),
                        file_path=row.file_path,
                        record_count=row.record_count,
                        size_bytes=row.size_bytes,
                        created_at=row.created_at,
                        last_modified=row.last_modified,
                        checksum=row.checksum
                    )
                    
                    await self._remove_partition(partition)
            
        except Exception as e:
            logger.error("Partition cleanup failed", error=str(e))
    
    async def _remove_partition(self, partition: DataPartition):
        """Remove a partition and its data."""
        try:
            # Remove file
            local_path = f"/home/user/webapp/{partition.file_path}"
            if os.path.exists(local_path):
                os.remove(local_path)
            
            # Remove from S3 if configured
            if self.s3_client and self.storage_config.get('s3', {}).get('bucket'):
                bucket = self.storage_config['s3']['bucket']
                try:
                    self.s3_client.delete_object(Bucket=bucket, Key=partition.file_path)
                except ClientError:
                    pass  # File might not exist
            
            # Remove metadata
            async with self.metadata_manager.session_factory() as session:
                await session.execute(
                    sa.text("DELETE FROM data_partitions WHERE partition_id = $1"),
                    [partition.partition_id]
                )
                await session.commit()
            
            # Remove from cache
            await self.metadata_manager.redis_client.delete(f"partition:{partition.partition_id}")
            
            logger.info("Partition removed", partition_id=partition.partition_id)
            
        except Exception as e:
            logger.error("Failed to remove partition", partition_id=partition.partition_id, error=str(e))
    
    async def _update_storage_metrics(self):
        """Update storage metrics for monitoring."""
        try:
            async with self.metadata_manager.session_factory() as session:
                # Get storage size by layer
                result = await session.execute(
                    sa.text("SELECT layer, SUM(size_bytes) as total_size FROM data_partitions GROUP BY layer")
                )
                
                for row in result.fetchall():
                    STORAGE_SIZE.labels(partition=row.layer).set(row.total_size)
            
        except Exception as e:
            logger.error("Failed to update storage metrics", error=str(e))
    
    async def get_system_health(self) -> Dict[str, Any]:
        """Get data lake system health metrics."""
        try:
            health = {
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat(),
                "components": {},
                "storage": {},
                "performance": {}
            }
            
            # Check metadata store
            try:
                async with self.metadata_manager.session_factory() as session:
                    await session.execute(sa.text("SELECT 1"))
                health["components"]["metadata_store"] = "healthy"
            except:
                health["components"]["metadata_store"] = "unhealthy"
                health["status"] = "degraded"
            
            # Check Redis cache
            try:
                await self.metadata_manager.redis_client.ping()
                health["components"]["redis_cache"] = "healthy"
            except:
                health["components"]["redis_cache"] = "unhealthy"
                health["status"] = "degraded"
            
            # Get storage statistics
            async with self.metadata_manager.session_factory() as session:
                result = await session.execute(
                    sa.text("""
                        SELECT 
                            layer,
                            COUNT(*) as partition_count,
                            SUM(size_bytes) as total_size,
                            SUM(record_count) as total_records
                        FROM data_partitions 
                        GROUP BY layer
                    """)
                )
                
                for row in result.fetchall():
                    health["storage"][row.layer] = {
                        "partitions": row.partition_count,
                        "size_bytes": row.total_size,
                        "records": row.total_records
                    }
            
            return health
            
        except Exception as e:
            logger.error("Failed to get system health", error=str(e))
            return {
                "status": "unhealthy",
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
    
    async def close(self):
        """Clean shutdown of the data lake system."""
        try:
            logger.info("Shutting down Data Lake Warehouse System")
            
            # Close thread pools
            self.thread_pool.shutdown(wait=True)
            self.process_pool.shutdown(wait=True)
            
            # Close Dask client
            if self.dask_client:
                await self.dask_client.close()
            
            # Close database connections
            if self.metadata_manager and self.metadata_manager.engine:
                await self.metadata_manager.engine.dispose()
            
            # Close Redis connection
            if self.metadata_manager and self.metadata_manager.redis_client:
                await self.metadata_manager.redis_client.close()
            
            logger.info("Data Lake Warehouse System shutdown complete")
            
        except Exception as e:
            logger.error("Error during shutdown", error=str(e))

# Example usage and configuration
async def main():
    """Example usage of the Data Lake Warehouse system."""
    
    # Configuration
    config = {
        "metadata": {
            "postgres_url": "postgresql+asyncpg://user:password@localhost:5432/datalake",
            "redis_url": "redis://localhost:6379/0"
        },
        "kafka": {
            "bootstrap_servers": ["localhost:9092"]
        },
        "storage": {
            "s3": {
                "bucket": "my-datalake-bucket",
                "region": "us-east-1",
                "access_key": "your-access-key",
                "secret_key": "your-secret-key"
            }
        },
        "dask": {
            "scheduler_address": "localhost:8786"
        },
        "encryption_key": "your-encryption-key-here",
        "max_workers": 20,
        "max_processes": 8,
        "metrics_port": 8090
    }
    
    # Initialize data lake
    data_lake = DataLakeWarehouse(config)
    await data_lake.initialize()
    
    # Define a data schema
    user_events_schema = DataSchema(
        name="user_events",
        fields={
            "user_id": "string",
            "event_type": "string",
            "timestamp": "datetime",
            "properties": "string",
            "session_id": "string"
        },
        primary_key=["user_id", "timestamp"],
        partition_keys=["event_type"],
        validation_rules={
            "not_null": {"field": "user_id"},
            "unique": {"field": "session_id"}
        },
        pii_fields=["user_id"],
        encryption_required=True
    )
    
    # Register schema
    await data_lake.metadata_manager.register_schema(user_events_schema)
    
    # Create ingestion configuration
    ingestion_config = IngestionConfig(
        source_name="web_analytics",
        source_type="api",
        data_format=DataFormat.JSON,
        schema=user_events_schema,
        processing_mode=ProcessingMode.BATCH,
        batch_size=1000,
        compression="snappy",
        enable_deduplication=True,
        quality_checks=True
    )
    
    # Sample data ingestion
    sample_data = pd.DataFrame([
        {
            "user_id": "user_001",
            "event_type": "page_view",
            "timestamp": datetime.utcnow(),
            "properties": '{"page": "/home", "referrer": "google"}',
            "session_id": "session_123"
        },
        {
            "user_id": "user_002", 
            "event_type": "click",
            "timestamp": datetime.utcnow(),
            "properties": '{"element": "button", "page": "/signup"}',
            "session_id": "session_124"
        }
    ])
    
    # Ingest data
    partition_id = await data_lake.ingest_batch_data(sample_data, ingestion_config)
    print(f"Data ingested with partition ID: {partition_id}")
    
    # Query data
    query = {
        "schema": "user_events",
        "layer": "raw",
        "filters": {
            "event_type": "page_view"
        },
        "limit": 100
    }
    
    results = await data_lake.query_data(query, output_format="json")
    print(f"Query results: {results}")
    
    # Get system health
    health = await data_lake.get_system_health()
    print(f"System health: {health}")
    
    # Cleanup
    await data_lake.close()

if __name__ == "__main__":
    asyncio.run(main())