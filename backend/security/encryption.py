"""
Encryption and Data Protection.

This module provides encryption utilities for data at rest and in transit.

Features:
- AES encryption/decryption
- Password hashing (bcrypt, argon2)
- Token generation and validation
- Field-level encryption
- PII data masking
- Secure random generation

Author: GenSpark AI Developer
Phase: 8 - Security & Compliance
"""

import base64
import hashlib
import secrets
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
from cryptography.hazmat.backends import default_backend
import bcrypt
import re

from utils.logger import get_logger

logger = get_logger(__name__)


class EncryptionService:
    """
    Service for encrypting and decrypting sensitive data.
    
    Uses Fernet (AES-128 in CBC mode) for symmetric encryption.
    """
    
    def __init__(self, encryption_key: Optional[str] = None):
        """
        Initialize encryption service.
        
        Args:
            encryption_key: Base64-encoded encryption key (will generate if None)
        """
        if encryption_key:
            self.key = encryption_key.encode()
        else:
            self.key = Fernet.generate_key()
        
        self.cipher = Fernet(self.key)
        logger.info("Encryption service initialized")
    
    def encrypt(self, plaintext: str) -> str:
        """
        Encrypt plaintext string.
        
        Args:
            plaintext: String to encrypt
            
        Returns:
            Base64-encoded encrypted string
        """
        try:
            encrypted_bytes = self.cipher.encrypt(plaintext.encode())
            return encrypted_bytes.decode()
        except Exception as e:
            logger.error(f"Encryption error: {e}")
            raise
    
    def decrypt(self, ciphertext: str) -> str:
        """
        Decrypt ciphertext string.
        
        Args:
            ciphertext: Base64-encoded encrypted string
            
        Returns:
            Decrypted plaintext string
        """
        try:
            decrypted_bytes = self.cipher.decrypt(ciphertext.encode())
            return decrypted_bytes.decode()
        except Exception as e:
            logger.error(f"Decryption error: {e}")
            raise
    
    def encrypt_dict(self, data: Dict[str, Any], fields: list) -> Dict[str, Any]:
        """
        Encrypt specific fields in a dictionary.
        
        Args:
            data: Dictionary with data
            fields: List of field names to encrypt
            
        Returns:
            Dictionary with encrypted fields
        """
        encrypted_data = data.copy()
        
        for field in fields:
            if field in encrypted_data and encrypted_data[field] is not None:
                value = str(encrypted_data[field])
                encrypted_data[field] = self.encrypt(value)
        
        return encrypted_data
    
    def decrypt_dict(self, data: Dict[str, Any], fields: list) -> Dict[str, Any]:
        """
        Decrypt specific fields in a dictionary.
        
        Args:
            data: Dictionary with encrypted data
            fields: List of field names to decrypt
            
        Returns:
            Dictionary with decrypted fields
        """
        decrypted_data = data.copy()
        
        for field in fields:
            if field in decrypted_data and decrypted_data[field] is not None:
                decrypted_data[field] = self.decrypt(decrypted_data[field])
        
        return decrypted_data
    
    @staticmethod
    def generate_key() -> str:
        """
        Generate a new encryption key.
        
        Returns:
            Base64-encoded encryption key
        """
        key = Fernet.generate_key()
        return key.decode()


class PasswordHasher:
    """
    Service for secure password hashing.
    
    Uses bcrypt for password hashing.
    """
    
    @staticmethod
    def hash_password(password: str, rounds: int = 12) -> str:
        """
        Hash a password using bcrypt.
        
        Args:
            password: Plain text password
            rounds: Number of bcrypt rounds (cost factor)
            
        Returns:
            Hashed password
        """
        try:
            salt = bcrypt.gensalt(rounds=rounds)
            hashed = bcrypt.hashpw(password.encode(), salt)
            return hashed.decode()
        except Exception as e:
            logger.error(f"Password hashing error: {e}")
            raise
    
    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """
        Verify a password against its hash.
        
        Args:
            password: Plain text password
            hashed_password: Hashed password to verify against
            
        Returns:
            True if password matches, False otherwise
        """
        try:
            return bcrypt.checkpw(password.encode(), hashed_password.encode())
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    @staticmethod
    def validate_password_strength(password: str) -> Dict[str, Any]:
        """
        Validate password strength.
        
        Args:
            password: Password to validate
            
        Returns:
            Dictionary with validation results
        """
        issues = []
        
        # Length check
        if len(password) < 8:
            issues.append("Password must be at least 8 characters long")
        
        # Uppercase check
        if not re.search(r'[A-Z]', password):
            issues.append("Password must contain at least one uppercase letter")
        
        # Lowercase check
        if not re.search(r'[a-z]', password):
            issues.append("Password must contain at least one lowercase letter")
        
        # Number check
        if not re.search(r'\d', password):
            issues.append("Password must contain at least one number")
        
        # Special character check
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            issues.append("Password must contain at least one special character")
        
        # Calculate strength score
        score = 0
        if len(password) >= 8:
            score += 1
        if len(password) >= 12:
            score += 1
        if re.search(r'[A-Z]', password):
            score += 1
        if re.search(r'[a-z]', password):
            score += 1
        if re.search(r'\d', password):
            score += 1
        if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            score += 1
        
        strength = "weak"
        if score >= 5:
            strength = "strong"
        elif score >= 3:
            strength = "medium"
        
        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'strength': strength,
            'score': score
        }


class TokenManager:
    """
    Service for generating and validating secure tokens.
    
    Used for API tokens, reset tokens, verification codes, etc.
    """
    
    @staticmethod
    def generate_token(length: int = 32) -> str:
        """
        Generate a secure random token.
        
        Args:
            length: Token length in bytes
            
        Returns:
            URL-safe token string
        """
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def generate_numeric_code(length: int = 6) -> str:
        """
        Generate a numeric verification code.
        
        Args:
            length: Code length
            
        Returns:
            Numeric code string
        """
        return ''.join([str(secrets.randbelow(10)) for _ in range(length)])
    
    @staticmethod
    def hash_token(token: str) -> str:
        """
        Hash a token for storage.
        
        Args:
            token: Token to hash
            
        Returns:
            SHA-256 hash of token
        """
        return hashlib.sha256(token.encode()).hexdigest()
    
    @staticmethod
    def verify_token(token: str, hashed_token: str) -> bool:
        """
        Verify a token against its hash.
        
        Args:
            token: Plain token
            hashed_token: Hashed token
            
        Returns:
            True if token matches hash
        """
        return TokenManager.hash_token(token) == hashed_token


class DataMasker:
    """
    Service for masking PII (Personally Identifiable Information).
    
    Used for logging, display, and data protection.
    """
    
    @staticmethod
    def mask_email(email: str) -> str:
        """
        Mask email address.
        
        Args:
            email: Email to mask
            
        Returns:
            Masked email (e.g., j***@example.com)
        """
        if '@' not in email:
            return '***'
        
        local, domain = email.split('@', 1)
        if len(local) <= 1:
            masked_local = '*'
        else:
            masked_local = local[0] + '*' * (len(local) - 1)
        
        return f"{masked_local}@{domain}"
    
    @staticmethod
    def mask_phone(phone: str) -> str:
        """
        Mask phone number.
        
        Args:
            phone: Phone number to mask
            
        Returns:
            Masked phone (e.g., +34 ***-***-789)
        """
        # Remove non-digit characters
        digits = re.sub(r'\D', '', phone)
        
        if len(digits) < 4:
            return '***'
        
        # Keep country code and last 3 digits
        if phone.startswith('+'):
            country_code = phone[:phone.index(digits[0]) + 2]
            masked = f"{country_code} ***-***-{digits[-3:]}"
        else:
            masked = f"***-***-{digits[-3:]}"
        
        return masked
    
    @staticmethod
    def mask_credit_card(card_number: str) -> str:
        """
        Mask credit card number.
        
        Args:
            card_number: Card number to mask
            
        Returns:
            Masked card (e.g., **** **** **** 1234)
        """
        # Remove non-digit characters
        digits = re.sub(r'\D', '', card_number)
        
        if len(digits) < 4:
            return '****'
        
        return f"**** **** **** {digits[-4:]}"
    
    @staticmethod
    def mask_dni(dni: str) -> str:
        """
        Mask Spanish DNI/NIE.
        
        Args:
            dni: DNI to mask
            
        Returns:
            Masked DNI (e.g., ****567Z)
        """
        if len(dni) < 4:
            return '***'
        
        return '*' * (len(dni) - 4) + dni[-4:]
    
    @staticmethod
    def mask_iban(iban: str) -> str:
        """
        Mask IBAN number.
        
        Args:
            iban: IBAN to mask
            
        Returns:
            Masked IBAN (e.g., ES** **** **** **** 1234)
        """
        # Remove spaces
        iban = iban.replace(' ', '')
        
        if len(iban) < 8:
            return '****'
        
        # Keep country code and last 4 digits
        country = iban[:2]
        last_digits = iban[-4:]
        
        return f"{country}** **** **** **** {last_digits}"
    
    @staticmethod
    def mask_dict(data: Dict[str, Any], fields: list) -> Dict[str, Any]:
        """
        Mask specific fields in a dictionary.
        
        Args:
            data: Dictionary with data
            fields: List of field names to mask
            
        Returns:
            Dictionary with masked fields
        """
        masked_data = data.copy()
        
        for field in fields:
            if field not in masked_data:
                continue
            
            value = masked_data[field]
            if value is None:
                continue
            
            # Apply appropriate masking based on field name
            if 'email' in field.lower():
                masked_data[field] = DataMasker.mask_email(str(value))
            elif 'phone' in field.lower() or 'tel' in field.lower():
                masked_data[field] = DataMasker.mask_phone(str(value))
            elif 'card' in field.lower() or 'credit' in field.lower():
                masked_data[field] = DataMasker.mask_credit_card(str(value))
            elif 'dni' in field.lower() or 'nie' in field.lower():
                masked_data[field] = DataMasker.mask_dni(str(value))
            elif 'iban' in field.lower():
                masked_data[field] = DataMasker.mask_iban(str(value))
            else:
                # Generic masking
                masked_data[field] = '***'
        
        return masked_data


# Singleton instances
_encryption_service: Optional[EncryptionService] = None


def init_encryption(encryption_key: Optional[str] = None) -> EncryptionService:
    """
    Initialize global encryption service.
    
    Args:
        encryption_key: Optional encryption key
        
    Returns:
        EncryptionService instance
    """
    global _encryption_service
    _encryption_service = EncryptionService(encryption_key)
    logger.info("Global encryption service initialized")
    return _encryption_service


def get_encryption() -> EncryptionService:
    """
    Get global encryption service.
    
    Returns:
        EncryptionService instance
        
    Raises:
        RuntimeError: If not initialized
    """
    if _encryption_service is None:
        raise RuntimeError("Encryption service not initialized. Call init_encryption first.")
    return _encryption_service
