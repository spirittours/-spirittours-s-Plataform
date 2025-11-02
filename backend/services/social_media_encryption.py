"""
Social Media Credentials Encryption Service
Handles secure encryption/decryption of API credentials using Fernet symmetric encryption
"""

import os
from typing import Optional
from cryptography.fernet import Fernet
import base64
import logging

logger = logging.getLogger(__name__)


class CredentialsEncryptionService:
    """
    Secure encryption service for social media API credentials
    Uses Fernet (symmetric encryption) from cryptography library
    """
    
    def __init__(self):
        """
        Initialize encryption service with key from environment variable
        Raises ValueError if encryption key is not configured
        """
        encryption_key = os.getenv('SOCIAL_CREDENTIALS_ENCRYPTION_KEY')
        
        if not encryption_key:
            raise ValueError(
                "SOCIAL_CREDENTIALS_ENCRYPTION_KEY environment variable is not set. "
                "Generate one with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )
        
        try:
            self.fernet = Fernet(encryption_key.encode())
            logger.info("✅ Credentials encryption service initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize encryption: {e}")
            raise ValueError(f"Invalid encryption key format: {e}")
    
    def encrypt(self, value: str) -> Optional[str]:
        """
        Encrypt a sensitive credential value
        
        Args:
            value: Plain text credential to encrypt
            
        Returns:
            Base64-encoded encrypted string, or None if value is None/empty
            
        Example:
            >>> service = CredentialsEncryptionService()
            >>> encrypted = service.encrypt("my_secret_token_123")
            >>> print(encrypted)
            'gAAAAABh...'
        """
        if not value:
            return None
        
        try:
            encrypted_bytes = self.fernet.encrypt(value.encode('utf-8'))
            return encrypted_bytes.decode('utf-8')
        except Exception as e:
            logger.error(f"❌ Encryption failed: {e}")
            raise ValueError(f"Failed to encrypt credential: {e}")
    
    def decrypt(self, encrypted_value: str) -> Optional[str]:
        """
        Decrypt an encrypted credential value
        
        Args:
            encrypted_value: Encrypted credential string
            
        Returns:
            Decrypted plain text string, or None if encrypted_value is None/empty
            
        Raises:
            ValueError: If decryption fails (invalid token or wrong key)
            
        Example:
            >>> service = CredentialsEncryptionService()
            >>> decrypted = service.decrypt("gAAAAABh...")
            >>> print(decrypted)
            'my_secret_token_123'
        """
        if not encrypted_value:
            return None
        
        try:
            decrypted_bytes = self.fernet.decrypt(encrypted_value.encode('utf-8'))
            return decrypted_bytes.decode('utf-8')
        except Exception as e:
            logger.error(f"❌ Decryption failed: {e}")
            raise ValueError(f"Failed to decrypt credential: {e}")
    
    def encrypt_dict(self, credentials: dict) -> dict:
        """
        Encrypt all sensitive fields in a credentials dictionary
        
        Fields that are encrypted:
        - Any field ending in '_token'
        - Any field ending in '_secret'
        - Any field containing 'password'
        - Any field containing 'key' (except 'public_key')
        
        Args:
            credentials: Dictionary with plain text credentials
            
        Returns:
            Dictionary with sensitive fields encrypted (suffixed with '_encrypted')
            
        Example:
            >>> service = CredentialsEncryptionService()
            >>> creds = {
            ...     'app_id': '123456',
            ...     'app_secret': 'secret123',
            ...     'access_token': 'token456'
            ... }
            >>> encrypted = service.encrypt_dict(creds)
            >>> print(encrypted)
            {
                'app_id': '123456',
                'app_secret_encrypted': 'gAAAAABh...',
                'access_token_encrypted': 'gAAAAABh...'
            }
        """
        encrypted = {}
        
        for key, value in credentials.items():
            if value is None or value == '':
                continue
            
            # Determine if field should be encrypted
            should_encrypt = any([
                key.endswith('_token'),
                key.endswith('_secret'),
                'password' in key.lower(),
                ('key' in key.lower() and 'public' not in key.lower() and key != 'encryption_key')
            ])
            
            if should_encrypt:
                # Encrypt and add '_encrypted' suffix
                encrypted_key = f"{key}_encrypted" if not key.endswith('_encrypted') else key
                encrypted[encrypted_key] = self.encrypt(str(value))
                logger.debug(f"🔐 Encrypted field: {key}")
            else:
                # Keep non-sensitive fields as-is
                encrypted[key] = value
        
        return encrypted
    
    def decrypt_dict(self, encrypted_credentials: dict) -> dict:
        """
        Decrypt all encrypted fields in a credentials dictionary
        
        Args:
            encrypted_credentials: Dictionary with encrypted credential fields
            
        Returns:
            Dictionary with all fields decrypted (removes '_encrypted' suffix)
            
        Example:
            >>> service = CredentialsEncryptionService()
            >>> encrypted = {
            ...     'app_id': '123456',
            ...     'app_secret_encrypted': 'gAAAAABh...',
            ...     'access_token_encrypted': 'gAAAAABh...'
            ... }
            >>> decrypted = service.decrypt_dict(encrypted)
            >>> print(decrypted)
            {
                'app_id': '123456',
                'app_secret': 'secret123',
                'access_token': 'token456'
            }
        """
        decrypted = {}
        
        for key, value in encrypted_credentials.items():
            if value is None:
                continue
            
            if key.endswith('_encrypted'):
                # Decrypt and remove '_encrypted' suffix
                original_key = key[:-10]  # Remove '_encrypted'
                try:
                    decrypted[original_key] = self.decrypt(value)
                    logger.debug(f"🔓 Decrypted field: {original_key}")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to decrypt {key}: {e}")
                    decrypted[original_key] = None
            else:
                # Keep non-encrypted fields as-is
                decrypted[key] = value
        
        return decrypted
    
    def mask_credential(self, value: str, visible_chars: int = 4) -> str:
        """
        Mask a credential for display purposes (e.g., in logs or UI)
        
        Args:
            value: Credential string to mask
            visible_chars: Number of characters to show at the end
            
        Returns:
            Masked string like "••••••••1234"
            
        Example:
            >>> service = CredentialsEncryptionService()
            >>> masked = service.mask_credential("my_secret_token_123", 3)
            >>> print(masked)
            '••••••••••••••123'
        """
        if not value or len(value) <= visible_chars:
            return '••••'
        
        masked_length = len(value) - visible_chars
        return '•' * masked_length + value[-visible_chars:]
    
    @staticmethod
    def generate_new_key() -> str:
        """
        Generate a new Fernet encryption key
        
        Returns:
            Base64-encoded encryption key string
            
        Usage:
            Add this to your .env file:
            SOCIAL_CREDENTIALS_ENCRYPTION_KEY=<generated_key>
            
        Example:
            >>> key = CredentialsEncryptionService.generate_new_key()
            >>> print(key)
            'abcXYZ123...=='
        """
        return Fernet.generate_key().decode('utf-8')
    
    def rotate_key(self, old_key: str, new_key: str, encrypted_value: str) -> str:
        """
        Rotate encryption key by decrypting with old key and re-encrypting with new key
        Useful for key rotation security best practices
        
        Args:
            old_key: Previous encryption key
            new_key: New encryption key
            encrypted_value: Value encrypted with old key
            
        Returns:
            Value re-encrypted with new key
            
        Example:
            >>> service = CredentialsEncryptionService()
            >>> old_encrypted = service.encrypt("secret123")  # Using current key
            >>> new_key = service.generate_new_key()
            >>> new_encrypted = service.rotate_key(
            ...     old_key=os.getenv('SOCIAL_CREDENTIALS_ENCRYPTION_KEY'),
            ...     new_key=new_key,
            ...     encrypted_value=old_encrypted
            ... )
        """
        # Decrypt with old key
        old_fernet = Fernet(old_key.encode())
        decrypted_value = old_fernet.decrypt(encrypted_value.encode()).decode('utf-8')
        
        # Re-encrypt with new key
        new_fernet = Fernet(new_key.encode())
        new_encrypted = new_fernet.encrypt(decrypted_value.encode()).decode('utf-8')
        
        logger.info("🔄 Successfully rotated encryption key")
        return new_encrypted


# Singleton instance
_encryption_service: Optional[CredentialsEncryptionService] = None


def get_encryption_service() -> CredentialsEncryptionService:
    """
    Get singleton instance of encryption service
    
    Returns:
        CredentialsEncryptionService instance
        
    Usage in API endpoints:
        >>> from services.social_media_encryption import get_encryption_service
        >>> encryption = get_encryption_service()
        >>> encrypted_token = encryption.encrypt(user_token)
    """
    global _encryption_service
    
    if _encryption_service is None:
        _encryption_service = CredentialsEncryptionService()
    
    return _encryption_service


# Example usage and testing
if __name__ == "__main__":
    # Generate a new encryption key
    print("📝 Generate a new encryption key:")
    new_key = CredentialsEncryptionService.generate_new_key()
    print(f"SOCIAL_CREDENTIALS_ENCRYPTION_KEY={new_key}")
    print()
    
    # Test encryption/decryption
    print("🧪 Testing encryption/decryption:")
    os.environ['SOCIAL_CREDENTIALS_ENCRYPTION_KEY'] = new_key
    
    service = CredentialsEncryptionService()
    
    # Test single value
    original = "my_secret_api_token_12345"
    encrypted = service.encrypt(original)
    decrypted = service.decrypt(encrypted)
    
    print(f"Original:  {original}")
    print(f"Encrypted: {encrypted}")
    print(f"Decrypted: {decrypted}")
    print(f"Masked:    {service.mask_credential(original, 5)}")
    print(f"Match:     {original == decrypted} ✅" if original == decrypted else "Match: False ❌")
    print()
    
    # Test dictionary encryption
    print("🧪 Testing dictionary encryption:")
    credentials = {
        'platform': 'facebook',
        'app_id': '123456789',
        'app_secret': 'secret_abc123',
        'access_token': 'EAAxxxxxxxxxxxxx',
        'page_id': '987654321'
    }
    
    print("Original credentials:")
    for k, v in credentials.items():
        print(f"  {k}: {v}")
    
    encrypted_dict = service.encrypt_dict(credentials)
    print("\nEncrypted credentials:")
    for k, v in encrypted_dict.items():
        if k.endswith('_encrypted'):
            print(f"  {k}: {service.mask_credential(v, 8)}")
        else:
            print(f"  {k}: {v}")
    
    decrypted_dict = service.decrypt_dict(encrypted_dict)
    print("\nDecrypted credentials:")
    for k, v in decrypted_dict.items():
        print(f"  {k}: {v}")
    
    print(f"\nMatch: {credentials == {k: v for k, v in decrypted_dict.items() if k != 'encryption_key'}} ✅")
