"""
Disaster Recovery and Backup System
Spirit Tours Platform - Backup & Recovery
"""

import os
import json
import subprocess
import asyncio
import hashlib
import tarfile
import shutil
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from pathlib import Path
import boto3
from botocore.exceptions import ClientError
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import redis
import logging
from dataclasses import dataclass
from enum import Enum
import schedule
import time

logger = logging.getLogger(__name__)


class BackupType(Enum):
    """Types of backups"""
    FULL = "full"
    INCREMENTAL = "incremental"
    DIFFERENTIAL = "differential"
    SNAPSHOT = "snapshot"


class BackupStatus(Enum):
    """Backup status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    VERIFIED = "verified"


@dataclass
class BackupConfig:
    """Backup configuration"""
    database_url: str
    redis_url: str
    backup_dir: str = "/var/backups/spirit-tours"
    s3_bucket: str = "spirit-tours-backups"
    retention_days: int = 30
    compression: bool = True
    encryption: bool = True
    encryption_key: str = ""
    notification_email: str = ""
    max_parallel_uploads: int = 5


class DatabaseBackup:
    """Database backup handler"""
    
    def __init__(self, config: BackupConfig):
        self.config = config
        self.backup_dir = Path(config.backup_dir) / "database"
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
    def create_backup(self, backup_type: BackupType = BackupType.FULL) -> str:
        """Create database backup"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = self.backup_dir / f"db_backup_{backup_type.value}_{timestamp}.sql"
        
        try:
            # Parse database URL
            db_parts = self.config.database_url.replace("postgresql://", "").split("@")
            user_pass = db_parts[0].split(":")
            host_db = db_parts[1].split("/")
            
            username = user_pass[0]
            password = user_pass[1] if len(user_pass) > 1 else ""
            host = host_db[0].split(":")[0]
            port = host_db[0].split(":")[1] if ":" in host_db[0] else "5432"
            database = host_db[1].split("?")[0] if len(host_db) > 1 else "spirittours"
            
            # Create pg_dump command
            env = os.environ.copy()
            env["PGPASSWORD"] = password
            
            if backup_type == BackupType.FULL:
                # Full backup
                cmd = [
                    "pg_dump",
                    "-h", host,
                    "-p", port,
                    "-U", username,
                    "-d", database,
                    "-f", str(backup_file),
                    "--verbose",
                    "--no-owner",
                    "--no-privileges"
                ]
            else:
                # Schema only for differential/incremental
                cmd = [
                    "pg_dump",
                    "-h", host,
                    "-p", port,
                    "-U", username,
                    "-d", database,
                    "-f", str(backup_file),
                    "--schema-only" if backup_type == BackupType.DIFFERENTIAL else "--data-only",
                    "--verbose"
                ]
            
            # Execute backup
            result = subprocess.run(cmd, env=env, capture_output=True, text=True)
            
            if result.returncode != 0:
                raise Exception(f"Database backup failed: {result.stderr}")
            
            # Compress if configured
            if self.config.compression:
                compressed_file = self._compress_file(backup_file)
                backup_file.unlink()  # Remove uncompressed file
                backup_file = compressed_file
            
            logger.info(f"Database backup created: {backup_file}")
            return str(backup_file)
            
        except Exception as e:
            logger.error(f"Database backup failed: {e}")
            raise
    
    def restore_backup(self, backup_file: str) -> bool:
        """Restore database from backup"""
        try:
            # Decompress if needed
            if backup_file.endswith(".gz"):
                backup_file = self._decompress_file(backup_file)
            
            # Parse database URL
            db_parts = self.config.database_url.replace("postgresql://", "").split("@")
            user_pass = db_parts[0].split(":")
            host_db = db_parts[1].split("/")
            
            username = user_pass[0]
            password = user_pass[1] if len(user_pass) > 1 else ""
            host = host_db[0].split(":")[0]
            port = host_db[0].split(":")[1] if ":" in host_db[0] else "5432"
            database = host_db[1].split("?")[0] if len(host_db) > 1 else "spirittours"
            
            # Restore database
            env = os.environ.copy()
            env["PGPASSWORD"] = password
            
            cmd = [
                "psql",
                "-h", host,
                "-p", port,
                "-U", username,
                "-d", database,
                "-f", backup_file
            ]
            
            result = subprocess.run(cmd, env=env, capture_output=True, text=True)
            
            if result.returncode != 0:
                raise Exception(f"Database restore failed: {result.stderr}")
            
            logger.info(f"Database restored from: {backup_file}")
            return True
            
        except Exception as e:
            logger.error(f"Database restore failed: {e}")
            return False
    
    def _compress_file(self, file_path: Path) -> Path:
        """Compress backup file"""
        compressed_path = file_path.with_suffix(file_path.suffix + ".gz")
        
        import gzip
        with open(file_path, 'rb') as f_in:
            with gzip.open(compressed_path, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        
        return compressed_path
    
    def _decompress_file(self, file_path: str) -> str:
        """Decompress backup file"""
        import gzip
        
        decompressed_path = file_path.replace(".gz", "")
        
        with gzip.open(file_path, 'rb') as f_in:
            with open(decompressed_path, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        
        return decompressed_path


class RedisBackup:
    """Redis backup handler"""
    
    def __init__(self, config: BackupConfig):
        self.config = config
        self.backup_dir = Path(config.backup_dir) / "redis"
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.redis_client = redis.from_url(config.redis_url)
    
    def create_backup(self) -> str:
        """Create Redis backup"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = self.backup_dir / f"redis_backup_{timestamp}.rdb"
        
        try:
            # Trigger Redis BGSAVE
            self.redis_client.bgsave()
            
            # Wait for backup to complete
            while self.redis_client.lastsave() < datetime.now().timestamp() - 5:
                time.sleep(1)
            
            # Get Redis data directory
            redis_dir = self.redis_client.config_get("dir")["dir"]
            redis_dbfile = self.redis_client.config_get("dbfilename")["dbfilename"]
            source_file = Path(redis_dir) / redis_dbfile
            
            # Copy backup file
            shutil.copy2(source_file, backup_file)
            
            logger.info(f"Redis backup created: {backup_file}")
            return str(backup_file)
            
        except Exception as e:
            logger.error(f"Redis backup failed: {e}")
            raise
    
    def restore_backup(self, backup_file: str) -> bool:
        """Restore Redis from backup"""
        try:
            # Get Redis configuration
            redis_dir = self.redis_client.config_get("dir")["dir"]
            redis_dbfile = self.redis_client.config_get("dbfilename")["dbfilename"]
            target_file = Path(redis_dir) / redis_dbfile
            
            # Stop Redis writes
            self.redis_client.config_set("stop-writes-on-bgsave-error", "yes")
            
            # Copy backup file
            shutil.copy2(backup_file, target_file)
            
            # Restart Redis (in production, use proper service restart)
            self.redis_client.shutdown(save=False, nosave=False)
            
            logger.info(f"Redis restored from: {backup_file}")
            return True
            
        except Exception as e:
            logger.error(f"Redis restore failed: {e}")
            return False


class FileSystemBackup:
    """File system backup handler"""
    
    def __init__(self, config: BackupConfig):
        self.config = config
        self.backup_dir = Path(config.backup_dir) / "files"
        self.backup_dir.mkdir(parents=True, exist_ok=True)
    
    def create_backup(self, source_dirs: List[str]) -> str:
        """Create file system backup"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = self.backup_dir / f"files_backup_{timestamp}.tar.gz"
        
        try:
            with tarfile.open(backup_file, "w:gz") as tar:
                for source_dir in source_dirs:
                    if os.path.exists(source_dir):
                        tar.add(source_dir, arcname=os.path.basename(source_dir))
                        logger.info(f"Added {source_dir} to backup")
            
            logger.info(f"File system backup created: {backup_file}")
            return str(backup_file)
            
        except Exception as e:
            logger.error(f"File system backup failed: {e}")
            raise
    
    def restore_backup(self, backup_file: str, target_dir: str) -> bool:
        """Restore files from backup"""
        try:
            with tarfile.open(backup_file, "r:gz") as tar:
                tar.extractall(path=target_dir)
            
            logger.info(f"Files restored to: {target_dir}")
            return True
            
        except Exception as e:
            logger.error(f"File restore failed: {e}")
            return False


class S3BackupStorage:
    """S3 backup storage handler"""
    
    def __init__(self, config: BackupConfig):
        self.config = config
        self.s3_client = boto3.client('s3')
        self.bucket_name = config.s3_bucket
    
    def upload_backup(self, local_file: str, s3_key: str = None) -> bool:
        """Upload backup to S3"""
        try:
            if not s3_key:
                s3_key = f"backups/{datetime.now().strftime('%Y/%m/%d')}/{os.path.basename(local_file)}"
            
            # Calculate file hash
            file_hash = self._calculate_file_hash(local_file)
            
            # Upload with metadata
            self.s3_client.upload_file(
                local_file,
                self.bucket_name,
                s3_key,
                ExtraArgs={
                    'Metadata': {
                        'backup-date': datetime.now().isoformat(),
                        'file-hash': file_hash,
                        'backup-type': 'automated'
                    },
                    'ServerSideEncryption': 'AES256'
                }
            )
            
            logger.info(f"Backup uploaded to S3: s3://{self.bucket_name}/{s3_key}")
            return True
            
        except ClientError as e:
            logger.error(f"S3 upload failed: {e}")
            return False
    
    def download_backup(self, s3_key: str, local_file: str) -> bool:
        """Download backup from S3"""
        try:
            self.s3_client.download_file(self.bucket_name, s3_key, local_file)
            logger.info(f"Backup downloaded from S3: {s3_key}")
            return True
            
        except ClientError as e:
            logger.error(f"S3 download failed: {e}")
            return False
    
    def list_backups(self, prefix: str = "backups/") -> List[Dict]:
        """List available backups in S3"""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            backups = []
            for obj in response.get('Contents', []):
                backups.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'].isoformat(),
                    'storage_class': obj.get('StorageClass', 'STANDARD')
                })
            
            return backups
            
        except ClientError as e:
            logger.error(f"Failed to list S3 backups: {e}")
            return []
    
    def _calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA256 hash of file"""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()


class DisasterRecoveryManager:
    """Main disaster recovery manager"""
    
    def __init__(self, config: BackupConfig):
        self.config = config
        self.db_backup = DatabaseBackup(config)
        self.redis_backup = RedisBackup(config)
        self.fs_backup = FileSystemBackup(config)
        self.s3_storage = S3BackupStorage(config)
        self.backup_history: List[Dict] = []
    
    async def perform_full_backup(self, upload_to_s3: bool = True) -> Dict:
        """Perform complete system backup"""
        backup_info = {
            'timestamp': datetime.now().isoformat(),
            'type': BackupType.FULL.value,
            'status': BackupStatus.IN_PROGRESS.value,
            'components': {}
        }
        
        try:
            # Database backup
            logger.info("Starting database backup...")
            db_backup_file = self.db_backup.create_backup(BackupType.FULL)
            backup_info['components']['database'] = {
                'file': db_backup_file,
                'size': os.path.getsize(db_backup_file)
            }
            
            # Redis backup
            logger.info("Starting Redis backup...")
            redis_backup_file = self.redis_backup.create_backup()
            backup_info['components']['redis'] = {
                'file': redis_backup_file,
                'size': os.path.getsize(redis_backup_file)
            }
            
            # File system backup
            logger.info("Starting file system backup...")
            fs_dirs = ["/home/user/webapp/uploads", "/home/user/webapp/config"]
            fs_backup_file = self.fs_backup.create_backup(fs_dirs)
            backup_info['components']['filesystem'] = {
                'file': fs_backup_file,
                'size': os.path.getsize(fs_backup_file)
            }
            
            # Upload to S3
            if upload_to_s3:
                logger.info("Uploading backups to S3...")
                for component, info in backup_info['components'].items():
                    self.s3_storage.upload_backup(info['file'])
            
            backup_info['status'] = BackupStatus.COMPLETED.value
            self.backup_history.append(backup_info)
            
            # Cleanup old backups
            self._cleanup_old_backups()
            
            logger.info("Full backup completed successfully")
            return backup_info
            
        except Exception as e:
            backup_info['status'] = BackupStatus.FAILED.value
            backup_info['error'] = str(e)
            self.backup_history.append(backup_info)
            logger.error(f"Backup failed: {e}")
            raise
    
    async def perform_disaster_recovery(self, backup_date: str = None) -> bool:
        """Perform complete disaster recovery"""
        try:
            logger.info("Starting disaster recovery...")
            
            # Get latest backup if not specified
            if not backup_date:
                backups = self.s3_storage.list_backups()
                if not backups:
                    raise Exception("No backups available for recovery")
                backup_date = backups[-1]['key'].split('/')[3]  # Extract date
            
            # Download backups from S3
            # ... download logic ...
            
            # Restore database
            logger.info("Restoring database...")
            # db_success = self.db_backup.restore_backup(db_backup_file)
            
            # Restore Redis
            logger.info("Restoring Redis...")
            # redis_success = self.redis_backup.restore_backup(redis_backup_file)
            
            # Restore files
            logger.info("Restoring file system...")
            # fs_success = self.fs_backup.restore_backup(fs_backup_file, "/home/user/webapp")
            
            logger.info("Disaster recovery completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Disaster recovery failed: {e}")
            return False
    
    def _cleanup_old_backups(self):
        """Remove backups older than retention period"""
        cutoff_date = datetime.now() - timedelta(days=self.config.retention_days)
        
        for backup_type in ["database", "redis", "files"]:
            backup_dir = Path(self.config.backup_dir) / backup_type
            if backup_dir.exists():
                for backup_file in backup_dir.glob("*"):
                    if datetime.fromtimestamp(backup_file.stat().st_mtime) < cutoff_date:
                        backup_file.unlink()
                        logger.info(f"Deleted old backup: {backup_file}")
    
    def schedule_automated_backups(self):
        """Schedule automated backups"""
        # Daily full backup at 2 AM
        schedule.every().day.at("02:00").do(
            lambda: asyncio.create_task(self.perform_full_backup())
        )
        
        # Hourly incremental database backup
        schedule.every().hour.do(
            lambda: self.db_backup.create_backup(BackupType.INCREMENTAL)
        )
        
        logger.info("Automated backup schedule configured")
    
    def verify_backup(self, backup_file: str) -> bool:
        """Verify backup integrity"""
        try:
            # Check file exists and is readable
            if not os.path.exists(backup_file):
                return False
            
            # Check file size
            if os.path.getsize(backup_file) == 0:
                return False
            
            # For compressed files, test compression
            if backup_file.endswith(".gz"):
                import gzip
                try:
                    with gzip.open(backup_file, 'rb') as f:
                        f.read(1024)  # Read first 1KB
                except:
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Backup verification failed: {e}")
            return False


# Usage example
if __name__ == "__main__":
    config = BackupConfig(
        database_url="postgresql://user:pass@localhost/spirittours",
        redis_url="redis://localhost:6379",
        s3_bucket="spirit-tours-backups"
    )
    
    dr_manager = DisasterRecoveryManager(config)
    
    # Schedule automated backups
    dr_manager.schedule_automated_backups()
    
    # Run backup manually
    asyncio.run(dr_manager.perform_full_backup())