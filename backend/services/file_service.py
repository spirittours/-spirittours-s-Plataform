"""
Advanced File Management Service for Enterprise Booking Platform
Supports local storage, AWS S3, Azure Blob, and Google Cloud Storage
"""

import os
import asyncio
import logging
import hashlib
import mimetypes
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union, BinaryIO, Any
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
import aiofiles
import aiohttp
from PIL import Image
import io

# Cloud storage imports
try:
    import boto3
    from botocore.exceptions import ClientError
    AWS_AVAILABLE = True
except ImportError:
    AWS_AVAILABLE = False
    logger.warning("AWS SDK not available - S3 storage disabled")

try:
    from azure.storage.blob import BlobServiceClient
    from azure.core.exceptions import ResourceNotFoundError
    AZURE_AVAILABLE = True
except ImportError:
    AZURE_AVAILABLE = False
    logger.warning("Azure SDK not available - Blob storage disabled")

try:
    from google.cloud import storage as gcs
    GCP_AVAILABLE = True
except ImportError:
    GCP_AVAILABLE = False
    logger.warning("Google Cloud SDK not available - GCS disabled")

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, BigInteger
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel, Field, validator
import magic

# Configure logging
logger = logging.getLogger(__name__)

Base = declarative_base()

class StorageProvider(str, Enum):
    LOCAL = "local"
    AWS_S3 = "aws_s3"
    AZURE_BLOB = "azure_blob"
    GOOGLE_CLOUD = "google_cloud"

class FileCategory(str, Enum):
    DOCUMENT = "document"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    AVATAR = "avatar"
    ATTACHMENT = "attachment"
    BACKUP = "backup"
    TEMPORARY = "temporary"

class FileStatus(str, Enum):
    UPLOADING = "uploading"
    READY = "ready"
    PROCESSING = "processing"
    FAILED = "failed"
    DELETED = "deleted"

class ImageFormat(str, Enum):
    JPEG = "jpeg"
    PNG = "png"
    WEBP = "webp"
    GIF = "gif"

# Database model
class FileRecord(Base):
    __tablename__ = "file_records"
    
    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(String(100), unique=True, index=True, nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    
    # File metadata
    file_size = Column(BigInteger, nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_hash = Column(String(64), nullable=False, index=True)
    category = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False, default="uploading")
    
    # Storage information
    storage_provider = Column(String(50), nullable=False)
    storage_bucket = Column(String(100))
    storage_path = Column(String(500))
    
    # URLs and access
    public_url = Column(String(500))
    download_url = Column(String(500))
    thumbnail_url = Column(String(500))
    
    # Image-specific metadata
    image_width = Column(Integer)
    image_height = Column(Integer)
    
    # Ownership and permissions
    uploaded_by = Column(String(100), nullable=False)
    is_public = Column(Boolean, default=False)
    access_permissions = Column(JSON)
    
    # Lifecycle
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime)
    
    # Additional metadata
    metadata = Column(JSON)
    tags = Column(JSON)

@dataclass
class StorageConfig:
    """File storage configuration"""
    
    # Local storage
    local_upload_path: str = "uploads"
    local_temp_path: str = "temp"
    local_max_file_size: int = 100 * 1024 * 1024  # 100MB
    
    # AWS S3
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    aws_bucket_name: str = ""
    
    # Azure Blob Storage
    azure_connection_string: str = ""
    azure_container_name: str = ""
    
    # Google Cloud Storage
    gcp_project_id: str = ""
    gcp_bucket_name: str = ""
    gcp_credentials_path: str = ""
    
    # CDN and URLs
    cdn_base_url: str = ""
    public_base_url: str = ""
    
    # File processing
    enable_image_processing: bool = True
    image_quality: int = 85
    thumbnail_sizes: List[tuple] = None
    
    # Security
    allowed_mime_types: List[str] = None
    blocked_extensions: List[str] = None
    scan_for_viruses: bool = False
    
    # Performance
    chunk_size: int = 8192
    max_concurrent_uploads: int = 10
    
    def __post_init__(self):
        if self.thumbnail_sizes is None:
            self.thumbnail_sizes = [(150, 150), (300, 300), (600, 600)]
        
        if self.allowed_mime_types is None:
            self.allowed_mime_types = [
                "image/jpeg", "image/png", "image/gif", "image/webp",
                "application/pdf", "text/plain", "text/csv",
                "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ]
        
        if self.blocked_extensions is None:
            self.blocked_extensions = [".exe", ".bat", ".cmd", ".scr", ".pif", ".com"]

class FileInfo(BaseModel):
    file_id: str
    original_filename: str
    stored_filename: str
    file_size: int
    mime_type: str
    file_hash: str
    category: FileCategory
    status: FileStatus
    storage_provider: StorageProvider
    public_url: Optional[str]
    download_url: Optional[str]
    thumbnail_url: Optional[str]
    image_width: Optional[int]
    image_height: Optional[int]
    uploaded_by: str
    is_public: bool
    created_at: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)

class UploadResult(BaseModel):
    success: bool
    file_info: Optional[FileInfo] = None
    error: Optional[str] = None
    processing_status: Optional[str] = None

class LocalStorageProvider:
    """Local file system storage provider"""
    
    def __init__(self, config: StorageConfig):
        self.config = config
        self.upload_path = Path(config.local_upload_path)
        self.temp_path = Path(config.local_temp_path)
        
        # Ensure directories exist
        self.upload_path.mkdir(parents=True, exist_ok=True)
        self.temp_path.mkdir(parents=True, exist_ok=True)
    
    async def upload_file(self, file_data: bytes, file_path: str) -> bool:
        """Upload file to local storage"""
        try:
            full_path = self.upload_path / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            
            async with aiofiles.open(full_path, 'wb') as f:
                await f.write(file_data)
            
            return True
            
        except Exception as e:
            logger.error(f"Local file upload failed: {str(e)}")
            return False
    
    async def download_file(self, file_path: str) -> Optional[bytes]:
        """Download file from local storage"""
        try:
            full_path = self.upload_path / file_path
            
            if not full_path.exists():
                return None
            
            async with aiofiles.open(full_path, 'rb') as f:
                return await f.read()
                
        except Exception as e:
            logger.error(f"Local file download failed: {str(e)}")
            return None
    
    async def delete_file(self, file_path: str) -> bool:
        """Delete file from local storage"""
        try:
            full_path = self.upload_path / file_path
            
            if full_path.exists():
                full_path.unlink()
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Local file deletion failed: {str(e)}")
            return False
    
    def get_public_url(self, file_path: str) -> str:
        """Get public URL for file"""
        base_url = self.config.public_base_url or "http://localhost:8000"
        return f"{base_url}/files/{file_path}"

class S3StorageProvider:
    """AWS S3 storage provider"""
    
    def __init__(self, config: StorageConfig):
        self.config = config
        if not AWS_AVAILABLE:
            raise ImportError("AWS SDK not available")
        
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=config.aws_access_key_id,
            aws_secret_access_key=config.aws_secret_access_key,
            region_name=config.aws_region
        )
        self.bucket_name = config.aws_bucket_name
    
    async def upload_file(self, file_data: bytes, file_path: str) -> bool:
        """Upload file to S3"""
        try:
            # Run S3 upload in thread pool
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=file_path,
                    Body=file_data
                )
            )
            
            return True
            
        except ClientError as e:
            logger.error(f"S3 upload failed: {str(e)}")
            return False
    
    async def download_file(self, file_path: str) -> Optional[bytes]:
        """Download file from S3"""
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.s3_client.get_object(Bucket=self.bucket_name, Key=file_path)
            )
            
            return response['Body'].read()
            
        except ClientError as e:
            logger.error(f"S3 download failed: {str(e)}")
            return None
    
    async def delete_file(self, file_path: str) -> bool:
        """Delete file from S3"""
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: self.s3_client.delete_object(Bucket=self.bucket_name, Key=file_path)
            )
            
            return True
            
        except ClientError as e:
            logger.error(f"S3 deletion failed: {str(e)}")
            return False
    
    def get_public_url(self, file_path: str) -> str:
        """Get public URL for S3 file"""
        if self.config.cdn_base_url:
            return f"{self.config.cdn_base_url}/{file_path}"
        
        return f"https://{self.bucket_name}.s3.{self.config.aws_region}.amazonaws.com/{file_path}"

class AzureBlobProvider:
    """Azure Blob Storage provider"""
    
    def __init__(self, config: StorageConfig):
        self.config = config
        if not AZURE_AVAILABLE:
            raise ImportError("Azure SDK not available")
        
        self.blob_service = BlobServiceClient.from_connection_string(config.azure_connection_string)
        self.container_name = config.azure_container_name
    
    async def upload_file(self, file_data: bytes, file_path: str) -> bool:
        """Upload file to Azure Blob"""
        try:
            blob_client = self.blob_service.get_blob_client(
                container=self.container_name,
                blob=file_path
            )
            
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: blob_client.upload_blob(file_data, overwrite=True)
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Azure Blob upload failed: {str(e)}")
            return False
    
    async def download_file(self, file_path: str) -> Optional[bytes]:
        """Download file from Azure Blob"""
        try:
            blob_client = self.blob_service.get_blob_client(
                container=self.container_name,
                blob=file_path
            )
            
            loop = asyncio.get_event_loop()
            download_stream = await loop.run_in_executor(
                None,
                lambda: blob_client.download_blob()
            )
            
            return download_stream.readall()
            
        except ResourceNotFoundError:
            logger.warning(f"Azure Blob file not found: {file_path}")
            return None
        except Exception as e:
            logger.error(f"Azure Blob download failed: {str(e)}")
            return None
    
    async def delete_file(self, file_path: str) -> bool:
        """Delete file from Azure Blob"""
        try:
            blob_client = self.blob_service.get_blob_client(
                container=self.container_name,
                blob=file_path
            )
            
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: blob_client.delete_blob()
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Azure Blob deletion failed: {str(e)}")
            return False
    
    def get_public_url(self, file_path: str) -> str:
        """Get public URL for Azure Blob"""
        if self.config.cdn_base_url:
            return f"{self.config.cdn_base_url}/{file_path}"
        
        account_name = self.blob_service.account_name
        return f"https://{account_name}.blob.core.windows.net/{self.container_name}/{file_path}"

class ImageProcessor:
    """Image processing utilities"""
    
    def __init__(self, config: StorageConfig):
        self.config = config
        self.quality = config.image_quality
        self.thumbnail_sizes = config.thumbnail_sizes
    
    async def process_image(self, image_data: bytes, format_hint: str = None) -> Dict[str, Any]:
        """Process image and extract metadata"""
        
        try:
            # Load image
            image = Image.open(io.BytesIO(image_data))
            
            # Extract metadata
            metadata = {
                "width": image.width,
                "height": image.height,
                "format": image.format,
                "mode": image.mode,
                "has_transparency": image.mode in ('RGBA', 'LA') or 'transparency' in image.info
            }
            
            # Optimize image if needed
            if image.format in ['JPEG', 'PNG']:
                optimized_data = await self._optimize_image(image_data, image.format)
            else:
                optimized_data = image_data
            
            # Generate thumbnails
            thumbnails = await self._generate_thumbnails(image_data)
            
            return {
                "metadata": metadata,
                "optimized_data": optimized_data,
                "thumbnails": thumbnails,
                "original_size": len(image_data),
                "optimized_size": len(optimized_data)
            }
            
        except Exception as e:
            logger.error(f"Image processing failed: {str(e)}")
            return {"error": str(e)}
    
    async def _optimize_image(self, image_data: bytes, format: str) -> bytes:
        """Optimize image for web delivery"""
        
        try:
            image = Image.open(io.BytesIO(image_data))
            
            # Convert RGBA to RGB for JPEG
            if format == 'JPEG' and image.mode == 'RGBA':
                # Create white background
                background = Image.new('RGB', image.size, (255, 255, 255))
                background.paste(image, mask=image.split()[-1])  # Use alpha channel as mask
                image = background
            
            # Save optimized
            output = io.BytesIO()
            save_kwargs = {"format": format, "optimize": True}
            
            if format == 'JPEG':
                save_kwargs["quality"] = self.quality
                save_kwargs["progressive"] = True
            elif format == 'PNG':
                save_kwargs["compress_level"] = 6
            
            image.save(output, **save_kwargs)
            
            return output.getvalue()
            
        except Exception as e:
            logger.error(f"Image optimization failed: {str(e)}")
            return image_data
    
    async def _generate_thumbnails(self, image_data: bytes) -> Dict[str, bytes]:
        """Generate thumbnails in different sizes"""
        
        thumbnails = {}
        
        try:
            original_image = Image.open(io.BytesIO(image_data))
            
            for size in self.thumbnail_sizes:
                # Create thumbnail
                thumb = original_image.copy()
                thumb.thumbnail(size, Image.Resampling.LANCZOS)
                
                # Save thumbnail
                output = io.BytesIO()
                
                # Use JPEG for thumbnails unless original has transparency
                if thumb.mode == 'RGBA' or 'transparency' in thumb.info:
                    thumb.save(output, format='PNG', optimize=True)
                else:
                    # Convert to RGB and save as JPEG
                    if thumb.mode != 'RGB':
                        thumb = thumb.convert('RGB')
                    thumb.save(output, format='JPEG', quality=self.quality, optimize=True)
                
                size_key = f"{size[0]}x{size[1]}"
                thumbnails[size_key] = output.getvalue()
            
        except Exception as e:
            logger.error(f"Thumbnail generation failed: {str(e)}")
        
        return thumbnails

class FileService:
    """Main file management service"""
    
    def __init__(self, config: StorageConfig, db_session):
        self.config = config
        self.db = db_session
        
        # Initialize storage providers
        self.storage_providers = {}
        
        # Local storage (always available)
        self.storage_providers[StorageProvider.LOCAL] = LocalStorageProvider(config)
        
        # Cloud storage providers
        if AWS_AVAILABLE and config.aws_bucket_name:
            try:
                self.storage_providers[StorageProvider.AWS_S3] = S3StorageProvider(config)
                logger.info("✅ AWS S3 storage provider initialized")
            except Exception as e:
                logger.warning(f"AWS S3 provider failed to initialize: {str(e)}")
        
        if AZURE_AVAILABLE and config.azure_container_name:
            try:
                self.storage_providers[StorageProvider.AZURE_BLOB] = AzureBlobProvider(config)
                logger.info("✅ Azure Blob storage provider initialized")
            except Exception as e:
                logger.warning(f"Azure Blob provider failed to initialize: {str(e)}")
        
        # Image processor
        if config.enable_image_processing:
            self.image_processor = ImageProcessor(config)
        else:
            self.image_processor = None
        
        logger.info(f"FileService initialized with {len(self.storage_providers)} storage providers")
    
    def _get_file_category(self, mime_type: str) -> FileCategory:
        """Determine file category from MIME type"""
        
        if mime_type.startswith("image/"):
            return FileCategory.IMAGE
        elif mime_type.startswith("video/"):
            return FileCategory.VIDEO
        elif mime_type.startswith("audio/"):
            return FileCategory.AUDIO
        elif mime_type in ["application/pdf", "text/plain", "text/csv"]:
            return FileCategory.DOCUMENT
        else:
            return FileCategory.ATTACHMENT
    
    def _calculate_file_hash(self, file_data: bytes) -> str:
        """Calculate SHA-256 hash of file data"""
        return hashlib.sha256(file_data).hexdigest()
    
    def _validate_file(self, filename: str, file_data: bytes, mime_type: str) -> Optional[str]:
        """Validate file against security policies"""
        
        # Check file size
        if len(file_data) > self.config.local_max_file_size:
            return f"File size exceeds limit of {self.config.local_max_file_size} bytes"
        
        # Check MIME type
        if mime_type not in self.config.allowed_mime_types:
            return f"MIME type {mime_type} not allowed"
        
        # Check file extension
        file_ext = Path(filename).suffix.lower()
        if file_ext in self.config.blocked_extensions:
            return f"File extension {file_ext} is blocked"
        
        # Additional security checks could go here
        # (virus scanning, content inspection, etc.)
        
        return None
    
    async def upload_file(
        self,
        filename: str,
        file_data: bytes,
        category: FileCategory = None,
        storage_provider: StorageProvider = StorageProvider.LOCAL,
        uploaded_by: str = "system",
        is_public: bool = False,
        tags: List[str] = None,
        metadata: Dict[str, Any] = None
    ) -> UploadResult:
        """Upload file to specified storage provider"""
        
        try:
            # Detect MIME type
            mime_type = magic.from_buffer(file_data, mime=True)
            
            # Validate file
            validation_error = self._validate_file(filename, file_data, mime_type)
            if validation_error:
                return UploadResult(success=False, error=validation_error)
            
            # Generate file ID and hash
            file_id = str(uuid.uuid4())
            file_hash = self._calculate_file_hash(file_data)
            
            # Check for duplicate files
            existing_file = self.db.query(FileRecord).filter(
                FileRecord.file_hash == file_hash
            ).first()
            
            if existing_file:
                logger.info(f"Duplicate file detected, returning existing file: {existing_file.file_id}")
                return UploadResult(
                    success=True,
                    file_info=FileInfo.from_orm(existing_file)
                )
            
            # Determine category
            if category is None:
                category = self._get_file_category(mime_type)
            
            # Generate storage path
            date_path = datetime.utcnow().strftime("%Y/%m/%d")
            file_ext = Path(filename).suffix
            stored_filename = f"{file_id}{file_ext}"
            storage_path = f"{category.value}/{date_path}/{stored_filename}"
            
            # Get storage provider
            provider = self.storage_providers.get(storage_provider)
            if not provider:
                return UploadResult(success=False, error=f"Storage provider {storage_provider} not available")
            
            # Process image if applicable
            processed_data = file_data
            image_metadata = {}
            
            if category == FileCategory.IMAGE and self.image_processor:
                processing_result = await self.image_processor.process_image(file_data)
                if "error" not in processing_result:
                    processed_data = processing_result.get("optimized_data", file_data)
                    image_metadata = processing_result.get("metadata", {})
            
            # Upload to storage
            upload_success = await provider.upload_file(processed_data, storage_path)
            
            if not upload_success:
                return UploadResult(success=False, error="Failed to upload file to storage")
            
            # Create file record
            file_record = FileRecord(
                file_id=file_id,
                original_filename=filename,
                stored_filename=stored_filename,
                file_path=storage_path,
                file_size=len(file_data),
                mime_type=mime_type,
                file_hash=file_hash,
                category=category.value,
                status=FileStatus.READY.value,
                storage_provider=storage_provider.value,
                storage_bucket=getattr(provider, 'bucket_name', None) or getattr(provider, 'container_name', None),
                storage_path=storage_path,
                public_url=provider.get_public_url(storage_path) if is_public else None,
                download_url=provider.get_public_url(storage_path),
                image_width=image_metadata.get("width"),
                image_height=image_metadata.get("height"),
                uploaded_by=uploaded_by,
                is_public=is_public,
                metadata=metadata or {},
                tags=tags or []
            )
            
            self.db.add(file_record)
            self.db.commit()
            
            logger.info(f"File uploaded successfully: {file_id} ({filename})")
            
            return UploadResult(
                success=True,
                file_info=FileInfo(
                    file_id=file_record.file_id,
                    original_filename=file_record.original_filename,
                    stored_filename=file_record.stored_filename,
                    file_size=file_record.file_size,
                    mime_type=file_record.mime_type,
                    file_hash=file_record.file_hash,
                    category=FileCategory(file_record.category),
                    status=FileStatus(file_record.status),
                    storage_provider=StorageProvider(file_record.storage_provider),
                    public_url=file_record.public_url,
                    download_url=file_record.download_url,
                    thumbnail_url=file_record.thumbnail_url,
                    image_width=file_record.image_width,
                    image_height=file_record.image_height,
                    uploaded_by=file_record.uploaded_by,
                    is_public=file_record.is_public,
                    created_at=file_record.created_at,
                    metadata=file_record.metadata or {},
                    tags=file_record.tags or []
                )
            )
            
        except Exception as e:
            logger.error(f"File upload failed: {str(e)}")
            return UploadResult(success=False, error=str(e))
    
    async def get_file_info(self, file_id: str) -> Optional[FileInfo]:
        """Get file information"""
        
        try:
            file_record = self.db.query(FileRecord).filter(
                FileRecord.file_id == file_id,
                FileRecord.status != FileStatus.DELETED.value
            ).first()
            
            if not file_record:
                return None
            
            return FileInfo(
                file_id=file_record.file_id,
                original_filename=file_record.original_filename,
                stored_filename=file_record.stored_filename,
                file_size=file_record.file_size,
                mime_type=file_record.mime_type,
                file_hash=file_record.file_hash,
                category=FileCategory(file_record.category),
                status=FileStatus(file_record.status),
                storage_provider=StorageProvider(file_record.storage_provider),
                public_url=file_record.public_url,
                download_url=file_record.download_url,
                thumbnail_url=file_record.thumbnail_url,
                image_width=file_record.image_width,
                image_height=file_record.image_height,
                uploaded_by=file_record.uploaded_by,
                is_public=file_record.is_public,
                created_at=file_record.created_at,
                metadata=file_record.metadata or {},
                tags=file_record.tags or []
            )
            
        except Exception as e:
            logger.error(f"Failed to get file info: {str(e)}")
            return None
    
    async def download_file(self, file_id: str) -> Optional[bytes]:
        """Download file data"""
        
        try:
            file_record = self.db.query(FileRecord).filter(
                FileRecord.file_id == file_id,
                FileRecord.status == FileStatus.READY.value
            ).first()
            
            if not file_record:
                return None
            
            # Get storage provider
            provider = self.storage_providers.get(StorageProvider(file_record.storage_provider))
            if not provider:
                logger.error(f"Storage provider not available: {file_record.storage_provider}")
                return None
            
            # Download file
            file_data = await provider.download_file(file_record.storage_path)
            
            return file_data
            
        except Exception as e:
            logger.error(f"File download failed: {str(e)}")
            return None
    
    async def delete_file(self, file_id: str, permanent: bool = False) -> bool:
        """Delete file (soft delete by default)"""
        
        try:
            file_record = self.db.query(FileRecord).filter(
                FileRecord.file_id == file_id
            ).first()
            
            if not file_record:
                return False
            
            if permanent:
                # Delete from storage
                provider = self.storage_providers.get(StorageProvider(file_record.storage_provider))
                if provider:
                    await provider.delete_file(file_record.storage_path)
                
                # Delete record
                self.db.delete(file_record)
            else:
                # Soft delete
                file_record.status = FileStatus.DELETED.value
                file_record.deleted_at = datetime.utcnow()
            
            self.db.commit()
            
            logger.info(f"File deleted ({'permanent' if permanent else 'soft'}): {file_id}")
            return True
            
        except Exception as e:
            logger.error(f"File deletion failed: {str(e)}")
            return False
    
    def get_storage_statistics(self) -> Dict[str, Any]:
        """Get storage usage statistics"""
        
        try:
            # Query database statistics
            total_files = self.db.query(FileRecord).filter(
                FileRecord.status != FileStatus.DELETED.value
            ).count()
            
            total_size = self.db.query(
                self.db.query(FileRecord.file_size).filter(
                    FileRecord.status != FileStatus.DELETED.value
                ).statement.c.file_size
            ).scalar() or 0
            
            # Count by category
            from sqlalchemy import func
            category_stats = self.db.query(
                FileRecord.category,
                func.count(FileRecord.id),
                func.sum(FileRecord.file_size)
            ).filter(
                FileRecord.status != FileStatus.DELETED.value
            ).group_by(FileRecord.category).all()
            
            return {
                "total_files": total_files,
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / 1024 / 1024, 2),
                "by_category": {
                    category: {
                        "count": count,
                        "size_bytes": size or 0,
                        "size_mb": round((size or 0) / 1024 / 1024, 2)
                    }
                    for category, count, size in category_stats
                },
                "available_providers": list(self.storage_providers.keys()),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get storage statistics: {str(e)}")
            return {}

# Export main classes
__all__ = [
    "FileService",
    "StorageConfig",
    "FileInfo",
    "UploadResult",
    "StorageProvider",
    "FileCategory",
    "FileStatus",
    "FileRecord"
]