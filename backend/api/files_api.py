"""
File Management API for Enterprise Booking Platform
Provides comprehensive file upload, download, and management capabilities
"""

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Query, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
import io
import os
import mimetypes

from config.database import get_db
from services.file_service import (
    FileService, StorageConfig, FileInfo, UploadResult,
    StorageProvider, FileCategory, FileStatus
)
from auth.dependencies import get_current_user
from pydantic import BaseModel, Field

# Configure logging
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/api/files", tags=["files"])

# Pydantic models
class FileUploadRequest(BaseModel):
    category: Optional[FileCategory] = None
    storage_provider: StorageProvider = StorageProvider.LOCAL
    is_public: bool = False
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class FileInfoResponse(BaseModel):
    file_id: str
    original_filename: str
    file_size: int
    mime_type: str
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
    metadata: Dict[str, Any]
    tags: List[str]

class FileListResponse(BaseModel):
    files: List[FileInfoResponse]
    total_count: int
    page: int
    page_size: int
    total_pages: int

class FileUploadResponse(BaseModel):
    success: bool
    file_info: Optional[FileInfoResponse] = None
    error: Optional[str] = None
    processing_status: Optional[str] = None

class BulkUploadResponse(BaseModel):
    success: bool
    uploaded_files: List[FileInfoResponse]
    failed_uploads: List[Dict[str, str]]
    total_uploaded: int
    total_failed: int

class StorageStatsResponse(BaseModel):
    total_files: int
    total_size_bytes: int
    total_size_mb: float
    by_category: Dict[str, Dict[str, Any]]
    available_providers: List[str]
    timestamp: str

class FileSearchRequest(BaseModel):
    filename: Optional[str] = None
    category: Optional[FileCategory] = None
    mime_type: Optional[str] = None
    uploaded_by: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

# Dependency to get file service
def get_file_service(db: Session = Depends(get_db)) -> FileService:
    """Get file service with configuration from environment"""
    
    config = StorageConfig(
        # Local storage
        local_upload_path=os.environ.get("FILE_UPLOAD_PATH", "uploads"),
        local_temp_path=os.environ.get("FILE_TEMP_PATH", "temp"),
        local_max_file_size=int(os.environ.get("MAX_FILE_SIZE", str(100 * 1024 * 1024))),  # 100MB
        
        # AWS S3
        aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID", ""),
        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY", ""),
        aws_region=os.environ.get("AWS_REGION", "us-east-1"),
        aws_bucket_name=os.environ.get("AWS_S3_BUCKET", ""),
        
        # Azure Blob
        azure_connection_string=os.environ.get("AZURE_STORAGE_CONNECTION_STRING", ""),
        azure_container_name=os.environ.get("AZURE_CONTAINER_NAME", ""),
        
        # CDN and URLs
        cdn_base_url=os.environ.get("CDN_BASE_URL", ""),
        public_base_url=os.environ.get("PUBLIC_BASE_URL", "http://localhost:8000"),
        
        # Processing
        enable_image_processing=os.environ.get("ENABLE_IMAGE_PROCESSING", "true").lower() == "true",
        image_quality=int(os.environ.get("IMAGE_QUALITY", "85"))
    )
    
    return FileService(config, db)

def _convert_file_info_to_response(file_info: FileInfo) -> FileInfoResponse:
    """Convert FileInfo to FileInfoResponse"""
    return FileInfoResponse(
        file_id=file_info.file_id,
        original_filename=file_info.original_filename,
        file_size=file_info.file_size,
        mime_type=file_info.mime_type,
        category=file_info.category,
        status=file_info.status,
        storage_provider=file_info.storage_provider,
        public_url=file_info.public_url,
        download_url=file_info.download_url,
        thumbnail_url=file_info.thumbnail_url,
        image_width=file_info.image_width,
        image_height=file_info.image_height,
        uploaded_by=file_info.uploaded_by,
        is_public=file_info.is_public,
        created_at=file_info.created_at,
        metadata=file_info.metadata,
        tags=file_info.tags
    )

# File Upload Endpoints
@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    category: Optional[str] = Form(None),
    storage_provider: str = Form(StorageProvider.LOCAL.value),
    is_public: bool = Form(False),
    tags: Optional[str] = Form(None),  # JSON string of tags
    metadata: Optional[str] = Form(None),  # JSON string of metadata
    current_user: dict = Depends(get_current_user),
    file_service: FileService = Depends(get_file_service)
):
    """Upload a single file"""
    
    try:
        # Read file data
        file_data = await file.read()
        
        if not file_data:
            raise HTTPException(status_code=400, detail="Empty file")
        
        # Parse optional JSON fields
        import json
        
        parsed_tags = []
        if tags:
            try:
                parsed_tags = json.loads(tags)
            except json.JSONDecodeError:
                parsed_tags = [tag.strip() for tag in tags.split(",")]
        
        parsed_metadata = {}
        if metadata:
            try:
                parsed_metadata = json.loads(metadata)
            except json.JSONDecodeError:
                logger.warning(f"Invalid metadata JSON: {metadata}")
        
        # Convert category
        file_category = None
        if category:
            try:
                file_category = FileCategory(category)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
        
        # Convert storage provider
        try:
            storage_prov = StorageProvider(storage_provider)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid storage provider: {storage_provider}")
        
        # Upload file
        result = await file_service.upload_file(
            filename=file.filename,
            file_data=file_data,
            category=file_category,
            storage_provider=storage_prov,
            uploaded_by=current_user.get("user_id"),
            is_public=is_public,
            tags=parsed_tags,
            metadata=parsed_metadata
        )
        
        if result.success and result.file_info:
            logger.info(f"File uploaded by user {current_user.get('user_id')}: {result.file_info.file_id}")
            
            return FileUploadResponse(
                success=True,
                file_info=_convert_file_info_to_response(result.file_info),
                processing_status=result.processing_status
            )
        else:
            return FileUploadResponse(
                success=False,
                error=result.error
            )
            
    except Exception as e:
        logger.error(f"File upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-multiple", response_model=BulkUploadResponse)
async def upload_multiple_files(
    files: List[UploadFile] = File(...),
    category: Optional[str] = Form(None),
    storage_provider: str = Form(StorageProvider.LOCAL.value),
    is_public: bool = Form(False),
    tags: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
    file_service: FileService = Depends(get_file_service)
):
    """Upload multiple files"""
    
    try:
        if len(files) > 20:  # Limit bulk uploads
            raise HTTPException(status_code=400, detail="Maximum 20 files per bulk upload")
        
        # Parse common parameters
        import json
        
        parsed_tags = []
        if tags:
            try:
                parsed_tags = json.loads(tags)
            except json.JSONDecodeError:
                parsed_tags = [tag.strip() for tag in tags.split(",")]
        
        file_category = None
        if category:
            try:
                file_category = FileCategory(category)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
        
        try:
            storage_prov = StorageProvider(storage_provider)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid storage provider: {storage_provider}")
        
        # Upload files
        uploaded_files = []
        failed_uploads = []
        
        for file in files:
            try:
                file_data = await file.read()
                
                if not file_data:
                    failed_uploads.append({
                        "filename": file.filename,
                        "error": "Empty file"
                    })
                    continue
                
                result = await file_service.upload_file(
                    filename=file.filename,
                    file_data=file_data,
                    category=file_category,
                    storage_provider=storage_prov,
                    uploaded_by=current_user.get("user_id"),
                    is_public=is_public,
                    tags=parsed_tags,
                    metadata={"bulk_upload": True}
                )
                
                if result.success and result.file_info:
                    uploaded_files.append(_convert_file_info_to_response(result.file_info))
                else:
                    failed_uploads.append({
                        "filename": file.filename,
                        "error": result.error or "Upload failed"
                    })
                    
            except Exception as e:
                failed_uploads.append({
                    "filename": file.filename,
                    "error": str(e)
                })
        
        logger.info(
            f"Bulk upload by user {current_user.get('user_id')}: "
            f"{len(uploaded_files)} successful, {len(failed_uploads)} failed"
        )
        
        return BulkUploadResponse(
            success=len(uploaded_files) > 0,
            uploaded_files=uploaded_files,
            failed_uploads=failed_uploads,
            total_uploaded=len(uploaded_files),
            total_failed=len(failed_uploads)
        )
        
    except Exception as e:
        logger.error(f"Bulk file upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# File Download Endpoints
@router.get("/download/{file_id}")
async def download_file(
    file_id: str,
    current_user: dict = Depends(get_current_user),
    file_service: FileService = Depends(get_file_service)
):
    """Download file by ID"""
    
    try:
        # Get file info
        file_info = await file_service.get_file_info(file_id)
        
        if not file_info:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check permissions
        if not file_info.is_public and file_info.uploaded_by != current_user.get("user_id"):
            user_role = current_user.get("role", "")
            if user_role not in ["admin", "manager"]:
                raise HTTPException(status_code=403, detail="Access denied")
        
        # Download file data
        file_data = await file_service.download_file(file_id)
        
        if not file_data:
            raise HTTPException(status_code=404, detail="File data not found")
        
        # Return file as streaming response
        return StreamingResponse(
            io.BytesIO(file_data),
            media_type=file_info.mime_type,
            headers={
                "Content-Disposition": f"attachment; filename={file_info.original_filename}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File download failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/view/{file_id}")
async def view_file(
    file_id: str,
    current_user: dict = Depends(get_current_user),
    file_service: FileService = Depends(get_file_service)
):
    """View file in browser (for images, PDFs, etc.)"""
    
    try:
        # Get file info
        file_info = await file_service.get_file_info(file_id)
        
        if not file_info:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check permissions
        if not file_info.is_public and file_info.uploaded_by != current_user.get("user_id"):
            user_role = current_user.get("role", "")
            if user_role not in ["admin", "manager"]:
                raise HTTPException(status_code=403, detail="Access denied")
        
        # Download file data
        file_data = await file_service.download_file(file_id)
        
        if not file_data:
            raise HTTPException(status_code=404, detail="File data not found")
        
        # Return file for viewing
        return StreamingResponse(
            io.BytesIO(file_data),
            media_type=file_info.mime_type,
            headers={
                "Content-Disposition": f"inline; filename={file_info.original_filename}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File view failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# File Management Endpoints
@router.get("/info/{file_id}", response_model=FileInfoResponse)
async def get_file_info(
    file_id: str,
    current_user: dict = Depends(get_current_user),
    file_service: FileService = Depends(get_file_service)
):
    """Get file information"""
    
    try:
        file_info = await file_service.get_file_info(file_id)
        
        if not file_info:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check permissions for private files
        if not file_info.is_public and file_info.uploaded_by != current_user.get("user_id"):
            user_role = current_user.get("role", "")
            if user_role not in ["admin", "manager"]:
                raise HTTPException(status_code=403, detail="Access denied")
        
        return _convert_file_info_to_response(file_info)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get file info failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list", response_model=FileListResponse)
async def list_files(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    category: Optional[FileCategory] = Query(None),
    uploaded_by: Optional[str] = Query(None),
    is_public: Optional[bool] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    file_service: FileService = Depends(get_file_service)
):
    """List files with pagination and filters"""
    
    try:
        from services.file_service import FileRecord
        
        # Build query
        query = db.query(FileRecord).filter(
            FileRecord.status != FileStatus.DELETED.value
        )
        
        # Apply filters
        if category:
            query = query.filter(FileRecord.category == category.value)
        
        if uploaded_by:
            query = query.filter(FileRecord.uploaded_by == uploaded_by)
        
        if is_public is not None:
            query = query.filter(FileRecord.is_public == is_public)
        
        # Check permissions - non-admin users can only see their own files or public files
        user_role = current_user.get("role", "")
        if user_role not in ["admin", "manager"]:
            query = query.filter(
                (FileRecord.uploaded_by == current_user.get("user_id")) |
                (FileRecord.is_public == True)
            )
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        
        # Order by creation date (newest first)
        query = query.order_by(FileRecord.created_at.desc())
        
        # Execute query
        file_records = query.all()
        
        # Convert to response format
        files = []
        for record in file_records:
            file_info = FileInfo(
                file_id=record.file_id,
                original_filename=record.original_filename,
                stored_filename=record.stored_filename,
                file_size=record.file_size,
                mime_type=record.mime_type,
                file_hash=record.file_hash,
                category=FileCategory(record.category),
                status=FileStatus(record.status),
                storage_provider=StorageProvider(record.storage_provider),
                public_url=record.public_url,
                download_url=record.download_url,
                thumbnail_url=record.thumbnail_url,
                image_width=record.image_width,
                image_height=record.image_height,
                uploaded_by=record.uploaded_by,
                is_public=record.is_public,
                created_at=record.created_at,
                metadata=record.metadata or {},
                tags=record.tags or []
            )
            files.append(_convert_file_info_to_response(file_info))
        
        total_pages = (total_count + page_size - 1) // page_size
        
        return FileListResponse(
            files=files,
            total_count=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"List files failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/search", response_model=FileListResponse)
async def search_files(
    search_request: FileSearchRequest,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search files with advanced filters"""
    
    try:
        from services.file_service import FileRecord
        from sqlalchemy import and_, or_
        
        # Build query
        query = db.query(FileRecord).filter(
            FileRecord.status != FileStatus.DELETED.value
        )
        
        # Apply search filters
        if search_request.filename:
            query = query.filter(
                FileRecord.original_filename.ilike(f"%{search_request.filename}%")
            )
        
        if search_request.category:
            query = query.filter(FileRecord.category == search_request.category.value)
        
        if search_request.mime_type:
            query = query.filter(FileRecord.mime_type.ilike(f"%{search_request.mime_type}%"))
        
        if search_request.uploaded_by:
            query = query.filter(FileRecord.uploaded_by == search_request.uploaded_by)
        
        if search_request.date_from:
            query = query.filter(FileRecord.created_at >= search_request.date_from)
        
        if search_request.date_to:
            query = query.filter(FileRecord.created_at <= search_request.date_to)
        
        if search_request.tags:
            # Search for files that have any of the specified tags
            tag_conditions = []
            for tag in search_request.tags:
                tag_conditions.append(FileRecord.tags.contains([tag]))
            query = query.filter(or_(*tag_conditions))
        
        # Check permissions
        user_role = current_user.get("role", "")
        if user_role not in ["admin", "manager"]:
            query = query.filter(
                (FileRecord.uploaded_by == current_user.get("user_id")) |
                (FileRecord.is_public == True)
            )
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        
        # Order by relevance (creation date for now)
        query = query.order_by(FileRecord.created_at.desc())
        
        # Execute query
        file_records = query.all()
        
        # Convert to response format
        files = []
        for record in file_records:
            file_info = FileInfo(
                file_id=record.file_id,
                original_filename=record.original_filename,
                stored_filename=record.stored_filename,
                file_size=record.file_size,
                mime_type=record.mime_type,
                file_hash=record.file_hash,
                category=FileCategory(record.category),
                status=FileStatus(record.status),
                storage_provider=StorageProvider(record.storage_provider),
                public_url=record.public_url,
                download_url=record.download_url,
                thumbnail_url=record.thumbnail_url,
                image_width=record.image_width,
                image_height=record.image_height,
                uploaded_by=record.uploaded_by,
                is_public=record.is_public,
                created_at=record.created_at,
                metadata=record.metadata or {},
                tags=record.tags or []
            )
            files.append(_convert_file_info_to_response(file_info))
        
        total_pages = (total_count + page_size - 1) // page_size
        
        return FileListResponse(
            files=files,
            total_count=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"File search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    permanent: bool = Query(False),
    current_user: dict = Depends(get_current_user),
    file_service: FileService = Depends(get_file_service)
):
    """Delete file (soft delete by default, permanent with admin rights)"""
    
    try:
        # Get file info first
        file_info = await file_service.get_file_info(file_id)
        
        if not file_info:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Check permissions
        user_role = current_user.get("role", "")
        if file_info.uploaded_by != current_user.get("user_id") and user_role not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Only admins can perform permanent deletion
        if permanent and user_role != "admin":
            raise HTTPException(status_code=403, detail="Admin role required for permanent deletion")
        
        # Delete file
        success = await file_service.delete_file(file_id, permanent=permanent)
        
        if success:
            logger.info(
                f"File deleted ({'permanent' if permanent else 'soft'}) by user {current_user.get('user_id')}: {file_id}"
            )
            return {
                "success": True,
                "message": f"File {'permanently deleted' if permanent else 'moved to trash'}",
                "file_id": file_id
            }
        else:
            return {
                "success": False,
                "message": "Failed to delete file",
                "file_id": file_id
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"File deletion failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Statistics and Management
@router.get("/statistics", response_model=StorageStatsResponse)
async def get_storage_statistics(
    current_user: dict = Depends(get_current_user),
    file_service: FileService = Depends(get_file_service)
):
    """Get storage usage statistics"""
    
    try:
        # Check permissions
        user_role = current_user.get("role", "")
        if user_role not in ["admin", "manager"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        stats = file_service.get_storage_statistics()
        
        return StorageStatsResponse(
            total_files=stats.get("total_files", 0),
            total_size_bytes=stats.get("total_size_bytes", 0),
            total_size_mb=stats.get("total_size_mb", 0.0),
            by_category=stats.get("by_category", {}),
            available_providers=stats.get("available_providers", []),
            timestamp=stats.get("timestamp", datetime.utcnow().isoformat())
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get storage statistics failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def file_service_health(
    file_service: FileService = Depends(get_file_service)
):
    """Check file service health"""
    
    try:
        # Test basic functionality
        stats = file_service.get_storage_statistics()
        
        # Check available storage providers
        providers_status = {}
        for provider_name in file_service.storage_providers.keys():
            providers_status[provider_name] = "available"
        
        return {
            "status": "healthy",
            "storage_providers": providers_status,
            "total_files": stats.get("total_files", 0),
            "total_size_mb": stats.get("total_size_mb", 0.0),
            "image_processing": file_service.image_processor is not None,
            "max_file_size_mb": round(file_service.config.local_max_file_size / 1024 / 1024, 2),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"File service health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@router.get("/config")
async def get_file_service_config(
    current_user: dict = Depends(get_current_user),
    file_service: FileService = Depends(get_file_service)
):
    """Get file service configuration (admin only)"""
    
    try:
        # Check permissions
        user_role = current_user.get("role", "")
        if user_role != "admin":
            raise HTTPException(status_code=403, detail="Admin role required")
        
        return {
            "service": "File Management Service",
            "version": "1.0.0",
            "configuration": {
                "max_file_size_mb": round(file_service.config.local_max_file_size / 1024 / 1024, 2),
                "upload_path": file_service.config.local_upload_path,
                "temp_path": file_service.config.local_temp_path,
                "image_processing_enabled": file_service.config.enable_image_processing,
                "image_quality": file_service.config.image_quality,
                "thumbnail_sizes": file_service.config.thumbnail_sizes,
                "allowed_mime_types": file_service.config.allowed_mime_types,
                "blocked_extensions": file_service.config.blocked_extensions
            },
            "storage_providers": list(file_service.storage_providers.keys()),
            "features": [
                "Multi-cloud storage support",
                "Image processing and thumbnails",
                "File deduplication",
                "Secure file validation",
                "Bulk upload support",
                "Advanced search and filtering"
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get file service config failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Export router
__all__ = ["router"]