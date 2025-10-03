"""
Unit Tests for File Service
Comprehensive testing for multi-cloud file storage operations.
"""

import pytest
import asyncio
import io
import tempfile
import os
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from pathlib import Path

from backend.services.file_service import (
    FileService, StorageProvider, FileType, FileStatus,
    FileUploadRequest, FileResponse, FileMetadata,
    S3Provider, AzureBlobProvider, GCSProvider
)

class TestFileService:
    """Test suite for FileService."""

    @pytest.fixture
    def file_service(self):
        """Create file service instance."""
        return FileService()

    @pytest.fixture
    def sample_file_content(self):
        """Create sample file content."""
        return b"This is a test file content for unit testing."

    @pytest.fixture
    def sample_image_content(self):
        """Create sample image content."""
        # Create a simple test image
        from PIL import Image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        return img_bytes.getvalue()

    @pytest.fixture
    def sample_upload_request(self):
        """Create sample file upload request."""
        return FileUploadRequest(
            filename='test_document.pdf',
            content_type='application/pdf',
            size=1024,
            metadata={
                'user_id': 'user_123',
                'booking_id': 'booking_456',
                'document_type': 'invoice'
            }
        )

    @pytest.mark.asyncio
    async def test_upload_file_local_success(self, file_service, sample_file_content, sample_upload_request):
        """Test successful local file upload."""
        with patch('aiofiles.open', create=True) as mock_open:
            mock_file = AsyncMock()
            mock_open.return_value.__aenter__.return_value = mock_file
            
            with patch('os.makedirs'):
                with patch('pathlib.Path.exists', return_value=True):
                    result = await file_service.upload_file(
                        sample_upload_request,
                        sample_file_content,
                        storage_provider=StorageProvider.LOCAL
                    )
                    
                    assert isinstance(result, FileResponse)
                    assert result.success is True
                    assert result.file_id is not None
                    assert result.storage_provider == StorageProvider.LOCAL
                    assert result.file_path is not None

    @pytest.mark.asyncio
    async def test_upload_file_s3_success(self, file_service, sample_file_content, sample_upload_request):
        """Test successful S3 file upload."""
        mock_s3_client = Mock()
        mock_s3_client.upload_fileobj.return_value = None
        
        with patch('boto3.client', return_value=mock_s3_client):
            result = await file_service.upload_file(
                sample_upload_request,
                sample_file_content,
                storage_provider=StorageProvider.AWS_S3
            )
            
            assert isinstance(result, FileResponse)
            assert result.success is True
            assert result.storage_provider == StorageProvider.AWS_S3
            assert 's3://' in result.file_path
            mock_s3_client.upload_fileobj.assert_called_once()

    @pytest.mark.asyncio
    async def test_upload_file_azure_success(self, file_service, sample_file_content, sample_upload_request):
        """Test successful Azure Blob storage upload."""
        mock_blob_client = Mock()
        mock_blob_client.upload_blob.return_value = None
        
        mock_container_client = Mock()
        mock_container_client.get_blob_client.return_value = mock_blob_client
        
        with patch('azure.storage.blob.BlobServiceClient') as mock_service:
            mock_service.return_value.get_container_client.return_value = mock_container_client
            
            result = await file_service.upload_file(
                sample_upload_request,
                sample_file_content,
                storage_provider=StorageProvider.AZURE_BLOB
            )
            
            assert isinstance(result, FileResponse)
            assert result.success is True
            assert result.storage_provider == StorageProvider.AZURE_BLOB
            assert 'azure://' in result.file_path

    @pytest.mark.asyncio
    async def test_upload_file_gcs_success(self, file_service, sample_file_content, sample_upload_request):
        """Test successful Google Cloud Storage upload."""
        mock_blob = Mock()
        mock_blob.upload_from_file.return_value = None
        
        mock_bucket = Mock()
        mock_bucket.blob.return_value = mock_blob
        
        mock_client = Mock()
        mock_client.bucket.return_value = mock_bucket
        
        with patch('google.cloud.storage.Client', return_value=mock_client):
            result = await file_service.upload_file(
                sample_upload_request,
                sample_file_content,
                storage_provider=StorageProvider.GCS
            )
            
            assert isinstance(result, FileResponse)
            assert result.success is True
            assert result.storage_provider == StorageProvider.GCS
            assert 'gcs://' in result.file_path

    @pytest.mark.asyncio
    async def test_download_file_local_success(self, file_service, sample_file_content):
        """Test successful local file download."""
        file_id = 'test_file_123'
        
        with patch('aiofiles.open', create=True) as mock_open:
            mock_file = AsyncMock()
            mock_file.read.return_value = sample_file_content
            mock_open.return_value.__aenter__.return_value = mock_file
            
            with patch.object(file_service, '_get_file_metadata') as mock_metadata:
                mock_metadata.return_value = FileMetadata(
                    file_id=file_id,
                    filename='test.txt',
                    storage_provider=StorageProvider.LOCAL,
                    file_path='/local/path/test.txt'
                )
                
                result = await file_service.download_file(file_id)
                
                assert isinstance(result, tuple)
                content, metadata = result
                assert content == sample_file_content
                assert metadata.file_id == file_id

    @pytest.mark.asyncio
    async def test_download_file_s3_success(self, file_service, sample_file_content):
        """Test successful S3 file download."""
        file_id = 'test_file_s3'
        
        mock_s3_client = Mock()
        mock_response = {'Body': io.BytesIO(sample_file_content)}
        mock_s3_client.get_object.return_value = mock_response
        
        with patch('boto3.client', return_value=mock_s3_client):
            with patch.object(file_service, '_get_file_metadata') as mock_metadata:
                mock_metadata.return_value = FileMetadata(
                    file_id=file_id,
                    filename='test.txt',
                    storage_provider=StorageProvider.AWS_S3,
                    file_path='s3://bucket/test.txt'
                )
                
                result = await file_service.download_file(file_id)
                
                assert isinstance(result, tuple)
                content, metadata = result
                assert content == sample_file_content
                mock_s3_client.get_object.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_file_success(self, file_service):
        """Test successful file deletion."""
        file_id = 'test_file_delete'
        
        with patch.object(file_service, '_get_file_metadata') as mock_metadata:
            mock_metadata.return_value = FileMetadata(
                file_id=file_id,
                filename='test.txt',
                storage_provider=StorageProvider.LOCAL,
                file_path='/local/path/test.txt'
            )
            
            with patch('os.remove') as mock_remove:
                with patch.object(file_service, '_update_file_status') as mock_update:
                    result = await file_service.delete_file(file_id)
                    
                    assert result is True
                    mock_remove.assert_called_once()
                    mock_update.assert_called_once_with(file_id, FileStatus.DELETED)

    @pytest.mark.asyncio
    async def test_delete_file_s3_success(self, file_service):
        """Test successful S3 file deletion."""
        file_id = 'test_file_delete_s3'
        
        mock_s3_client = Mock()
        mock_s3_client.delete_object.return_value = {'DeleteMarker': True}
        
        with patch('boto3.client', return_value=mock_s3_client):
            with patch.object(file_service, '_get_file_metadata') as mock_metadata:
                mock_metadata.return_value = FileMetadata(
                    file_id=file_id,
                    filename='test.txt',
                    storage_provider=StorageProvider.AWS_S3,
                    file_path='s3://bucket/test.txt'
                )
                
                with patch.object(file_service, '_update_file_status') as mock_update:
                    result = await file_service.delete_file(file_id)
                    
                    assert result is True
                    mock_s3_client.delete_object.assert_called_once()

    @pytest.mark.asyncio
    async def test_image_processing_resize(self, file_service, sample_image_content):
        """Test image resizing functionality."""
        with patch('PIL.Image.open') as mock_open:
            mock_image = Mock()
            mock_image.size = (200, 200)
            mock_image.resize.return_value = mock_image
            mock_image.save = Mock()
            mock_open.return_value = mock_image
            
            processed_content = await file_service.process_image(
                sample_image_content,
                operations={
                    'resize': {'width': 100, 'height': 100},
                    'format': 'JPEG',
                    'quality': 85
                }
            )
            
            assert processed_content is not None
            mock_image.resize.assert_called_once_with((100, 100))

    @pytest.mark.asyncio
    async def test_image_processing_thumbnail(self, file_service, sample_image_content):
        """Test thumbnail generation."""
        with patch('PIL.Image.open') as mock_open:
            mock_image = Mock()
            mock_image.thumbnail = Mock()
            mock_image.save = Mock()
            mock_open.return_value = mock_image
            
            thumbnail = await file_service.generate_thumbnail(
                sample_image_content,
                size=(150, 150)
            )
            
            assert thumbnail is not None
            mock_image.thumbnail.assert_called_once_with((150, 150))

    @pytest.mark.asyncio
    async def test_file_validation_success(self, file_service, sample_file_content):
        """Test file validation for allowed types."""
        with patch('magic.from_buffer', return_value='application/pdf'):
            is_valid = await file_service.validate_file(
                sample_file_content,
                filename='document.pdf',
                allowed_types=['application/pdf', 'image/jpeg'],
                max_size=10485760  # 10MB
            )
            
            assert is_valid is True

    @pytest.mark.asyncio
    async def test_file_validation_failure_type(self, file_service, sample_file_content):
        """Test file validation failure for disallowed type."""
        with patch('magic.from_buffer', return_value='application/x-executable'):
            is_valid = await file_service.validate_file(
                sample_file_content,
                filename='malware.exe',
                allowed_types=['application/pdf', 'image/jpeg'],
                max_size=10485760
            )
            
            assert is_valid is False

    @pytest.mark.asyncio
    async def test_file_validation_failure_size(self, file_service):
        """Test file validation failure for oversized file."""
        large_content = b'x' * (20 * 1024 * 1024)  # 20MB
        
        is_valid = await file_service.validate_file(
            large_content,
            filename='large.pdf',
            allowed_types=['application/pdf'],
            max_size=10485760  # 10MB limit
        )
        
        assert is_valid is False

    @pytest.mark.asyncio
    async def test_generate_signed_url_s3(self, file_service):
        """Test signed URL generation for S3."""
        file_id = 'test_file_url'
        
        mock_s3_client = Mock()
        mock_s3_client.generate_presigned_url.return_value = 'https://s3.amazonaws.com/signed-url'
        
        with patch('boto3.client', return_value=mock_s3_client):
            with patch.object(file_service, '_get_file_metadata') as mock_metadata:
                mock_metadata.return_value = FileMetadata(
                    file_id=file_id,
                    filename='test.pdf',
                    storage_provider=StorageProvider.AWS_S3,
                    file_path='s3://bucket/test.pdf'
                )
                
                signed_url = await file_service.generate_signed_url(
                    file_id, 
                    expiration=timedelta(hours=1)
                )
                
                assert signed_url == 'https://s3.amazonaws.com/signed-url'
                mock_s3_client.generate_presigned_url.assert_called_once()

    @pytest.mark.asyncio
    async def test_batch_upload_success(self, file_service, sample_file_content):
        """Test batch file upload."""
        files = []
        for i in range(3):
            upload_request = FileUploadRequest(
                filename=f'batch_file_{i}.txt',
                content_type='text/plain',
                size=len(sample_file_content)
            )
            files.append((upload_request, sample_file_content))
        
        with patch('aiofiles.open', create=True):
            with patch('os.makedirs'):
                with patch('pathlib.Path.exists', return_value=True):
                    results = await file_service.batch_upload(files)
                    
                    assert len(results) == 3
                    for result in results:
                        assert result.success is True

    @pytest.mark.asyncio
    async def test_file_metadata_extraction(self, file_service, sample_image_content):
        """Test metadata extraction from files."""
        with patch('PIL.Image.open') as mock_open:
            mock_image = Mock()
            mock_image.size = (800, 600)
            mock_image.format = 'JPEG'
            mock_image.getexif.return_value = {
                'DateTime': '2024:09:22 10:30:00',
                'Make': 'Test Camera'
            }
            mock_open.return_value = mock_image
            
            metadata = await file_service.extract_metadata(
                sample_image_content,
                'photo.jpg'
            )
            
            assert metadata['width'] == 800
            assert metadata['height'] == 600
            assert metadata['format'] == 'JPEG'
            assert 'exif' in metadata

    @pytest.mark.asyncio
    async def test_file_search_by_metadata(self, file_service):
        """Test file search by metadata criteria."""
        search_criteria = {
            'user_id': 'user_123',
            'file_type': FileType.IMAGE,
            'date_from': datetime.now() - timedelta(days=30),
            'date_to': datetime.now()
        }
        
        mock_results = [
            {
                'file_id': 'img_1',
                'filename': 'photo1.jpg',
                'upload_date': datetime.now() - timedelta(days=5)
            },
            {
                'file_id': 'img_2',
                'filename': 'photo2.jpg',
                'upload_date': datetime.now() - timedelta(days=10)
            }
        ]
        
        with patch.object(file_service, '_search_files_in_db') as mock_search:
            mock_search.return_value = mock_results
            
            results = await file_service.search_files(search_criteria)
            
            assert len(results) == 2
            assert results[0]['file_id'] == 'img_1'
            mock_search.assert_called_once_with(search_criteria)

    @pytest.mark.asyncio
    async def test_file_duplicate_detection(self, file_service, sample_file_content):
        """Test duplicate file detection by hash."""
        file_hash = hashlib.sha256(sample_file_content).hexdigest()
        
        with patch.object(file_service, '_check_file_hash') as mock_check:
            mock_check.return_value = 'existing_file_id'
            
            duplicate_id = await file_service.check_duplicate(sample_file_content)
            
            assert duplicate_id == 'existing_file_id'
            mock_check.assert_called_once_with(file_hash)

    @pytest.mark.asyncio
    async def test_file_versioning(self, file_service, sample_file_content):
        """Test file versioning functionality."""
        original_file_id = 'file_v1'
        new_content = b"Updated file content for version 2"
        
        with patch.object(file_service, '_create_file_version') as mock_version:
            mock_version.return_value = 'file_v2'
            
            new_version_id = await file_service.create_version(
                original_file_id,
                new_content,
                version_notes="Updated content"
            )
            
            assert new_version_id == 'file_v2'
            mock_version.assert_called_once()

    @pytest.mark.asyncio
    async def test_file_backup_and_restore(self, file_service):
        """Test file backup and restore operations."""
        file_id = 'important_file'
        
        # Test backup
        with patch.object(file_service, '_create_backup') as mock_backup:
            mock_backup.return_value = 'backup_123'
            
            backup_id = await file_service.backup_file(file_id)
            
            assert backup_id == 'backup_123'
            mock_backup.assert_called_once_with(file_id)
        
        # Test restore
        with patch.object(file_service, '_restore_from_backup') as mock_restore:
            mock_restore.return_value = True
            
            restored = await file_service.restore_file(backup_id)
            
            assert restored is True
            mock_restore.assert_called_once_with(backup_id)

    def test_file_upload_request_validation(self):
        """Test FileUploadRequest model validation."""
        # Valid request
        valid_request = FileUploadRequest(
            filename='document.pdf',
            content_type='application/pdf',
            size=1024000,
            metadata={'user_id': 'user_123'}
        )
        assert valid_request.filename == 'document.pdf'
        assert valid_request.size == 1024000
        
        # Invalid filename (too long)
        with pytest.raises(ValueError):
            FileUploadRequest(
                filename='x' * 300,  # Too long
                content_type='application/pdf',
                size=1024
            )
        
        # Invalid size (negative)
        with pytest.raises(ValueError):
            FileUploadRequest(
                filename='test.pdf',
                content_type='application/pdf',
                size=-100
            )

    def test_file_response_model(self):
        """Test FileResponse data model."""
        response = FileResponse(
            success=True,
            file_id='file_123',
            filename='test.pdf',
            storage_provider=StorageProvider.AWS_S3,
            file_path='s3://bucket/test.pdf',
            size=2048,
            content_type='application/pdf',
            upload_date=datetime.now(),
            metadata={'user_id': 'user_123'}
        )
        
        assert response.success is True
        assert response.file_id == 'file_123'
        assert response.storage_provider == StorageProvider.AWS_S3
        assert response.size == 2048

    def test_storage_provider_enum(self):
        """Test StorageProvider enumeration."""
        assert StorageProvider.LOCAL.value == 'local'
        assert StorageProvider.AWS_S3.value == 'aws_s3'
        assert StorageProvider.AZURE_BLOB.value == 'azure_blob'
        assert StorageProvider.GCS.value == 'gcs'

    def test_file_type_enum(self):
        """Test FileType enumeration."""
        assert FileType.DOCUMENT.value == 'document'
        assert FileType.IMAGE.value == 'image'
        assert FileType.VIDEO.value == 'video'
        assert FileType.AUDIO.value == 'audio'

    def test_file_status_enum(self):
        """Test FileStatus enumeration."""
        assert FileStatus.UPLOADING.value == 'uploading'
        assert FileStatus.ACTIVE.value == 'active'
        assert FileStatus.ARCHIVED.value == 'archived'
        assert FileStatus.DELETED.value == 'deleted'

# Provider-specific test classes
class TestS3Provider:
    """Test suite for AWS S3 provider."""
    
    def test_s3_provider_initialization(self):
        """Test S3 provider initialization."""
        provider = S3Provider(
            bucket_name='test-bucket',
            region='us-east-1',
            access_key_id='AKIAIOSFODNN7EXAMPLE',
            secret_access_key='wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
        )
        
        assert provider.bucket_name == 'test-bucket'
        assert provider.region == 'us-east-1'
        
    @pytest.mark.asyncio
    async def test_s3_provider_upload(self):
        """Test S3 provider upload method."""
        provider = S3Provider(
            bucket_name='test-bucket',
            region='us-east-1'
        )
        
        mock_client = Mock()
        content = b'test content'
        
        with patch('boto3.client', return_value=mock_client):
            result = await provider.upload(
                'test-key',
                content,
                content_type='text/plain'
            )
            
            mock_client.upload_fileobj.assert_called_once()
            assert result == 's3://test-bucket/test-key'

class TestAzureBlobProvider:
    """Test suite for Azure Blob Storage provider."""
    
    def test_azure_provider_initialization(self):
        """Test Azure Blob provider initialization."""
        provider = AzureBlobProvider(
            account_name='teststorage',
            account_key='test_key',
            container_name='test-container'
        )
        
        assert provider.account_name == 'teststorage'
        assert provider.container_name == 'test-container'
        
    @pytest.mark.asyncio
    async def test_azure_provider_upload(self):
        """Test Azure Blob provider upload method."""
        provider = AzureBlobProvider(
            account_name='teststorage',
            account_key='test_key',
            container_name='test-container'
        )
        
        mock_blob_client = Mock()
        content = b'test content'
        
        with patch.object(provider, '_get_blob_client', return_value=mock_blob_client):
            result = await provider.upload(
                'test-blob',
                content,
                content_type='text/plain'
            )
            
            mock_blob_client.upload_blob.assert_called_once()
            assert result == 'azure://teststorage/test-container/test-blob'

class TestGCSProvider:
    """Test suite for Google Cloud Storage provider."""
    
    def test_gcs_provider_initialization(self):
        """Test GCS provider initialization."""
        provider = GCSProvider(
            bucket_name='test-gcs-bucket',
            project_id='test-project',
            credentials_path='/path/to/credentials.json'
        )
        
        assert provider.bucket_name == 'test-gcs-bucket'
        assert provider.project_id == 'test-project'
        
    @pytest.mark.asyncio
    async def test_gcs_provider_upload(self):
        """Test GCS provider upload method."""
        provider = GCSProvider(
            bucket_name='test-gcs-bucket',
            project_id='test-project'
        )
        
        mock_blob = Mock()
        mock_bucket = Mock()
        mock_bucket.blob.return_value = mock_blob
        
        mock_client = Mock()
        mock_client.bucket.return_value = mock_bucket
        
        content = b'test content'
        
        with patch.object(provider, '_get_client', return_value=mock_client):
            result = await provider.upload(
                'test-object',
                content,
                content_type='text/plain'
            )
            
            mock_blob.upload_from_file.assert_called_once()
            assert result == 'gcs://test-gcs-bucket/test-object'

# Performance and load testing
class TestFileServicePerformance:
    """Performance testing for file operations."""
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_concurrent_uploads(self, file_service):
        """Test concurrent file uploads."""
        import time
        
        files = []
        content = b'x' * 1024  # 1KB files
        
        for i in range(20):
            request = FileUploadRequest(
                filename=f'concurrent_test_{i}.txt',
                content_type='text/plain',
                size=len(content)
            )
            files.append((request, content))
        
        with patch('aiofiles.open', create=True):
            with patch('os.makedirs'):
                with patch('pathlib.Path.exists', return_value=True):
                    start_time = time.time()
                    
                    tasks = [
                        file_service.upload_file(req, content, StorageProvider.LOCAL)
                        for req, content in files
                    ]
                    results = await asyncio.gather(*tasks)
                    
                    end_time = time.time()
                    processing_time = end_time - start_time
                    
                    # Should complete within 5 seconds
                    assert processing_time < 5.0
                    
                    # All uploads should succeed
                    for result in results:
                        assert result.success is True

    @pytest.mark.asyncio
    async def test_large_file_handling(self, file_service):
        """Test handling of large files."""
        # Simulate 100MB file
        large_content = b'x' * (100 * 1024 * 1024)
        
        request = FileUploadRequest(
            filename='large_file.bin',
            content_type='application/octet-stream',
            size=len(large_content)
        )
        
        with patch('aiofiles.open', create=True):
            with patch('os.makedirs'):
                with patch('pathlib.Path.exists', return_value=True):
                    result = await file_service.upload_file(
                        request,
                        large_content,
                        StorageProvider.LOCAL
                    )
                    
                    assert result.success is True
                    assert result.size == len(large_content)

    @pytest.mark.asyncio
    async def test_memory_efficiency(self, file_service):
        """Test memory efficiency during file operations."""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Process many small files
        content = b'test' * 1000  # 4KB files
        
        with patch('aiofiles.open', create=True):
            with patch('os.makedirs'):
                with patch('pathlib.Path.exists', return_value=True):
                    for i in range(100):
                        request = FileUploadRequest(
                            filename=f'memory_test_{i}.txt',
                            content_type='text/plain',
                            size=len(content)
                        )
                        await file_service.upload_file(
                            request,
                            content,
                            StorageProvider.LOCAL
                        )
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (less than 100MB)
        assert memory_increase < 100 * 1024 * 1024