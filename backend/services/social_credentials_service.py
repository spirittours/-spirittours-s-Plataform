"""
Social Media Credentials Management Service
Handles CRUD operations for social media API credentials with encryption
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, or_
from sqlalchemy.orm import selectinload

from backend.services.social_media_encryption import get_encryption_service
from backend.models import (
    SocialMediaCredentials,
    SocialCredentialsAuditLog,
    SocialMediaAccounts
)

logger = logging.getLogger(__name__)


class SocialCredentialsService:
    """
    Service for managing social media platform credentials
    """
    
    SUPPORTED_PLATFORMS = {
        'facebook': {
            'display_name': 'Facebook',
            'required_fields': ['app_id', 'app_secret', 'access_token', 'page_id'],
            'optional_fields': ['page_name']
        },
        'instagram': {
            'display_name': 'Instagram',
            'required_fields': ['app_id', 'app_secret', 'access_token', 'instagram_business_account_id'],
            'optional_fields': ['username']
        },
        'twitter_x': {
            'display_name': 'Twitter / X',
            'required_fields': ['api_key', 'api_secret', 'bearer_token'],
            'optional_fields': ['access_token', 'access_token_secret']
        },
        'linkedin': {
            'display_name': 'LinkedIn',
            'required_fields': ['client_id', 'client_secret'],
            'optional_fields': ['access_token', 'organization_id']
        },
        'tiktok': {
            'display_name': 'TikTok',
            'required_fields': ['client_key', 'client_secret', 'access_token'],
            'optional_fields': ['account_id']
        },
        'youtube': {
            'display_name': 'YouTube',
            'required_fields': ['client_id', 'client_secret', 'api_key'],
            'optional_fields': ['access_token', 'refresh_token', 'channel_id']
        }
    }
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.encryption = get_encryption_service()
    
    async def add_platform_credentials(
        self,
        platform: str,
        credentials: Dict[str, Any],
        admin_id: int,
        ip_address: str = None,
        user_agent: str = None
    ) -> Dict[str, Any]:
        """
        Add or update credentials for a social media platform
        
        Args:
            platform: Platform identifier (facebook, instagram, etc.)
            credentials: Dictionary with API credentials
            admin_id: ID of admin user making changes
            ip_address: IP address of admin (for audit)
            user_agent: Browser user agent (for audit)
            
        Returns:
            Dictionary with operation result
            
        Example:
            >>> service = SocialCredentialsService(db)
            >>> result = await service.add_platform_credentials(
            ...     platform='facebook',
            ...     credentials={
            ...         'app_id': '123456789',
            ...         'app_secret': 'secret123',
            ...         'access_token': 'EAAxxxxx',
            ...         'page_id': '987654321'
            ...     },
            ...     admin_id=1,
            ...     ip_address='192.168.1.1'
            ... )
        """
        # Validate platform
        if platform not in self.SUPPORTED_PLATFORMS:
            raise ValueError(f"Unsupported platform: {platform}")
        
        platform_config = self.SUPPORTED_PLATFORMS[platform]
        
        # Validate required fields
        missing_fields = [
            field for field in platform_config['required_fields']
            if field not in credentials or not credentials[field]
        ]
        if missing_fields:
            raise ValueError(f"Missing required fields for {platform}: {', '.join(missing_fields)}")
        
        # Check if credentials already exist
        stmt = select(SocialMediaCredentials).where(
            SocialMediaCredentials.platform == platform
        )
        result = await self.db.execute(stmt)
        existing_cred = result.scalar_one_or_none()
        
        # Encrypt sensitive credentials
        encrypted_creds = self.encryption.encrypt_dict(credentials)
        
        if existing_cred:
            # Update existing credentials
            update_data = {
                'platform_display_name': platform_config['display_name'],
                'updated_at': datetime.utcnow(),
                'updated_by': admin_id
            }
            
            # Add encrypted fields
            for key, value in encrypted_creds.items():
                if key.endswith('_encrypted'):
                    update_data[key] = value
                elif key in ['account_id', 'account_name', 'account_username', 'profile_url']:
                    update_data[key] = value
            
            stmt = (
                update(SocialMediaCredentials)
                .where(SocialMediaCredentials.platform == platform)
                .values(**update_data)
            )
            await self.db.execute(stmt)
            
            credential_id = existing_cred.id
            action = 'updated'
            
            logger.info(f"✏️ Updated credentials for {platform}")
        else:
            # Create new credentials
            new_cred = SocialMediaCredentials(
                platform=platform,
                platform_display_name=platform_config['display_name'],
                created_by=admin_id,
                updated_by=admin_id,
                **encrypted_creds
            )
            self.db.add(new_cred)
            await self.db.flush()
            
            credential_id = new_cred.id
            action = 'created'
            
            logger.info(f"✅ Created new credentials for {platform}")
        
        # Log audit trail
        await self._log_audit(
            credential_id=credential_id,
            platform=platform,
            action=action,
            changed_fields=list(credentials.keys()),
            admin_id=admin_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        await self.db.commit()
        
        return {
            'success': True,
            'action': action,
            'platform': platform,
            'credential_id': credential_id,
            'message': f'{platform_config["display_name"]} credentials {action} successfully'
        }
    
    async def get_platform_credentials(
        self,
        platform: str,
        decrypt: bool = True
    ) -> Optional[Dict[str, Any]]:
        """
        Get credentials for a specific platform
        
        Args:
            platform: Platform identifier
            decrypt: Whether to decrypt credentials (default True)
            
        Returns:
            Dictionary with credentials or None if not found
        """
        stmt = select(SocialMediaCredentials).where(
            SocialMediaCredentials.platform == platform
        )
        result = await self.db.execute(stmt)
        cred = result.scalar_one_or_none()
        
        if not cred:
            return None
        
        cred_dict = {
            'id': cred.id,
            'platform': cred.platform,
            'platform_display_name': cred.platform_display_name,
            'is_active': cred.is_active,
            'is_connected': cred.is_connected,
            'connection_status': cred.connection_status,
            'last_connection_test': cred.last_connection_test.isoformat() if cred.last_connection_test else None,
            'account_id': cred.account_id,
            'account_name': cred.account_name,
            'account_username': cred.account_username,
            'token_expires_at': cred.token_expires_at.isoformat() if cred.token_expires_at else None
        }
        
        if decrypt:
            # Decrypt sensitive fields
            encrypted_fields = {
                k: v for k, v in cred.__dict__.items()
                if k.endswith('_encrypted') and v is not None
            }
            decrypted = self.encryption.decrypt_dict(encrypted_fields)
            cred_dict.update(decrypted)
        else:
            # Return masked values
            for key, value in cred.__dict__.items():
                if key.endswith('_encrypted') and value is not None:
                    original_key = key[:-10]
                    cred_dict[original_key] = self.encryption.mask_credential(value)
        
        return cred_dict
    
    async def get_all_platforms_status(self) -> List[Dict[str, Any]]:
        """
        Get connection status for all platforms
        
        Returns:
            List of platform status dictionaries
        """
        stmt = select(SocialMediaCredentials).order_by(SocialMediaCredentials.platform)
        result = await self.db.execute(stmt)
        credentials = result.scalars().all()
        
        status_list = []
        
        # Add configured platforms
        for cred in credentials:
            status_list.append({
                'platform': cred.platform,
                'platform_display_name': cred.platform_display_name,
                'is_active': cred.is_active,
                'is_connected': cred.is_connected,
                'connection_status': cred.connection_status,
                'last_connection_test': cred.last_connection_test.isoformat() if cred.last_connection_test else None,
                'account_name': cred.account_name,
                'account_username': cred.account_username,
                'error_message': cred.error_message,
                'token_expires_at': cred.token_expires_at.isoformat() if cred.token_expires_at else None
            })
        
        # Add platforms that haven't been configured yet
        configured_platforms = {cred.platform for cred in credentials}
        for platform, config in self.SUPPORTED_PLATFORMS.items():
            if platform not in configured_platforms:
                status_list.append({
                    'platform': platform,
                    'platform_display_name': config['display_name'],
                    'is_active': False,
                    'is_connected': False,
                    'connection_status': 'not_configured',
                    'last_connection_test': None,
                    'account_name': None,
                    'account_username': None,
                    'error_message': None,
                    'token_expires_at': None
                })
        
        return status_list
    
    async def test_connection(
        self,
        platform: str,
        platform_adapter
    ) -> Dict[str, Any]:
        """
        Test connection to a social media platform
        
        Args:
            platform: Platform identifier
            platform_adapter: Adapter instance for the platform
            
        Returns:
            Dictionary with test results
        """
        cred = await self.get_platform_credentials(platform, decrypt=True)
        
        if not cred:
            return {
                'success': False,
                'connected': False,
                'error': 'Credentials not configured'
            }
        
        try:
            # Test connection using platform adapter
            test_result = await platform_adapter.test_connection(cred)
            
            # Update connection status in database
            stmt = (
                update(SocialMediaCredentials)
                .where(SocialMediaCredentials.platform == platform)
                .values(
                    is_connected=test_result['connected'],
                    connection_status='connected' if test_result['connected'] else 'error',
                    last_connection_test=datetime.utcnow(),
                    error_message=test_result.get('error'),
                    account_name=test_result.get('account_info', {}).get('name'),
                    account_username=test_result.get('account_info', {}).get('username'),
                    account_id=test_result.get('account_info', {}).get('id')
                )
            )
            await self.db.execute(stmt)
            await self.db.commit()
            
            if test_result['connected']:
                logger.info(f"✅ Connection test successful for {platform}")
            else:
                logger.warning(f"❌ Connection test failed for {platform}: {test_result.get('error')}")
            
            return test_result
            
        except Exception as e:
            logger.error(f"❌ Connection test error for {platform}: {e}")
            
            # Update error status
            stmt = (
                update(SocialMediaCredentials)
                .where(SocialMediaCredentials.platform == platform)
                .values(
                    is_connected=False,
                    connection_status='error',
                    last_connection_test=datetime.utcnow(),
                    error_message=str(e)
                )
            )
            await self.db.execute(stmt)
            await self.db.commit()
            
            return {
                'success': False,
                'connected': False,
                'error': str(e)
            }
    
    async def toggle_platform(
        self,
        platform: str,
        is_active: bool,
        admin_id: int
    ) -> Dict[str, Any]:
        """
        Enable or disable a platform
        
        Args:
            platform: Platform identifier
            is_active: True to enable, False to disable
            admin_id: ID of admin making change
            
        Returns:
            Dictionary with operation result
        """
        stmt = (
            update(SocialMediaCredentials)
            .where(SocialMediaCredentials.platform == platform)
            .values(
                is_active=is_active,
                updated_at=datetime.utcnow(),
                updated_by=admin_id
            )
        )
        result = await self.db.execute(stmt)
        
        if result.rowcount == 0:
            return {
                'success': False,
                'error': f'Platform {platform} not found'
            }
        
        await self._log_audit(
            credential_id=None,
            platform=platform,
            action='activated' if is_active else 'deactivated',
            admin_id=admin_id
        )
        
        await self.db.commit()
        
        action = 'enabled' if is_active else 'disabled'
        logger.info(f"🔄 Platform {platform} {action}")
        
        return {
            'success': True,
            'platform': platform,
            'is_active': is_active,
            'message': f'Platform {action} successfully'
        }
    
    async def delete_platform_credentials(
        self,
        platform: str,
        admin_id: int
    ) -> Dict[str, Any]:
        """
        Delete credentials for a platform
        
        Args:
            platform: Platform identifier
            admin_id: ID of admin making change
            
        Returns:
            Dictionary with operation result
        """
        # Log before deleting
        await self._log_audit(
            credential_id=None,
            platform=platform,
            action='deleted',
            admin_id=admin_id
        )
        
        stmt = delete(SocialMediaCredentials).where(
            SocialMediaCredentials.platform == platform
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        
        if result.rowcount == 0:
            return {
                'success': False,
                'error': f'Platform {platform} not found'
            }
        
        logger.info(f"🗑️ Deleted credentials for {platform}")
        
        return {
            'success': True,
            'platform': platform,
            'message': f'Credentials for {platform} deleted successfully'
        }
    
    async def get_audit_log(
        self,
        platform: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get audit log for credential changes
        
        Args:
            platform: Filter by platform (optional)
            limit: Maximum number of records to return
            
        Returns:
            List of audit log entries
        """
        stmt = select(SocialCredentialsAuditLog)
        
        if platform:
            stmt = stmt.where(SocialCredentialsAuditLog.platform == platform)
        
        stmt = stmt.order_by(SocialCredentialsAuditLog.created_at.desc()).limit(limit)
        
        result = await self.db.execute(stmt)
        logs = result.scalars().all()
        
        return [
            {
                'id': log.id,
                'platform': log.platform,
                'action': log.action,
                'changed_fields': log.changed_fields,
                'admin_id': log.admin_id,
                'admin_email': log.admin_email,
                'ip_address': log.ip_address,
                'created_at': log.created_at.isoformat()
            }
            for log in logs
        ]
    
    async def _log_audit(
        self,
        credential_id: Optional[int],
        platform: str,
        action: str,
        changed_fields: Optional[List[str]] = None,
        admin_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """
        Log an audit trail entry for credential changes
        
        Internal method called by other service methods
        """
        audit_entry = SocialCredentialsAuditLog(
            credential_id=credential_id,
            platform=platform,
            action=action,
            changed_fields={'fields': changed_fields} if changed_fields else None,
            admin_id=admin_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(audit_entry)
        
        logger.debug(f"📝 Audit log: {platform} - {action}")
    
    async def check_expiring_tokens(self, days_threshold: int = 7) -> List[Dict[str, Any]]:
        """
        Check for tokens expiring soon
        
        Args:
            days_threshold: Number of days before expiration to alert
            
        Returns:
            List of credentials with expiring tokens
        """
        from datetime import timedelta
        
        threshold_date = datetime.utcnow() + timedelta(days=days_threshold)
        
        stmt = select(SocialMediaCredentials).where(
            and_(
                SocialMediaCredentials.token_expires_at.isnot(None),
                SocialMediaCredentials.token_expires_at <= threshold_date,
                SocialMediaCredentials.is_active == True
            )
        )
        
        result = await self.db.execute(stmt)
        expiring = result.scalars().all()
        
        return [
            {
                'platform': cred.platform,
                'platform_display_name': cred.platform_display_name,
                'token_expires_at': cred.token_expires_at.isoformat(),
                'days_until_expiry': (cred.token_expires_at - datetime.utcnow()).days
            }
            for cred in expiring
        ]
    
    @classmethod
    def get_platform_config(cls, platform: str) -> Dict[str, Any]:
        """
        Get configuration for a specific platform
        
        Args:
            platform: Platform identifier
            
        Returns:
            Platform configuration dictionary
        """
        if platform not in cls.SUPPORTED_PLATFORMS:
            raise ValueError(f"Unsupported platform: {platform}")
        
        return cls.SUPPORTED_PLATFORMS[platform]
    
    @classmethod
    def get_all_platforms(cls) -> Dict[str, Dict[str, Any]]:
        """
        Get configuration for all supported platforms
        
        Returns:
            Dictionary mapping platform IDs to their configurations
        """
        return cls.SUPPORTED_PLATFORMS
