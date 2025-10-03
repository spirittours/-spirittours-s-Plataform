#!/usr/bin/env python3
"""
End-to-End Encryption System for Spirit Tours
Comprehensive encryption for communications, data storage, and secure key management
"""

import asyncio
import base64
import hashlib
import hmac
import json
import logging
import os
import secrets
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Union, Tuple, Bytes
from dataclasses import dataclass, field
from enum import Enum

# Cryptographic libraries
from cryptography.hazmat.primitives import hashes, serialization, padding
from cryptography.hazmat.primitives.asymmetric import rsa, padding as asym_padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.fernet import Fernet, MultiFernet
from cryptography.hazmat.backends import default_backend
import nacl.secret
import nacl.utils
import nacl.public
import nacl.signing
from nacl.encoding import Base64Encoder


class EncryptionAlgorithm(Enum):
    """Supported encryption algorithms"""
    FERNET = "fernet"
    AES_256_GCM = "aes_256_gcm"
    AES_256_CBC = "aes_256_cbc"
    CHACHA20_POLY1305 = "chacha20_poly1305"
    NACL_SECRETBOX = "nacl_secretbox"
    RSA_OAEP = "rsa_oaep"
    HYBRID_RSA_AES = "hybrid_rsa_aes"


class KeyType(Enum):
    """Types of encryption keys"""
    SYMMETRIC = "symmetric"
    ASYMMETRIC_PUBLIC = "asymmetric_public"
    ASYMMETRIC_PRIVATE = "asymmetric_private"
    SIGNING_PUBLIC = "signing_public"
    SIGNING_PRIVATE = "signing_private"
    MASTER_KEY = "master_key"
    DATA_ENCRYPTION_KEY = "data_encryption_key"


@dataclass
class EncryptionKey:
    """Represents an encryption key with metadata"""
    key_id: str
    key_type: KeyType
    algorithm: EncryptionAlgorithm
    key_data: bytes
    created_at: datetime
    expires_at: Optional[datetime] = None
    usage_count: int = 0
    max_usage: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class EncryptedData:
    """Represents encrypted data with all necessary metadata"""
    ciphertext: bytes
    algorithm: EncryptionAlgorithm
    key_id: str
    iv: Optional[bytes] = None
    tag: Optional[bytes] = None
    salt: Optional[bytes] = None
    nonce: Optional[bytes] = None
    signature: Optional[bytes] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            'ciphertext': base64.b64encode(self.ciphertext).decode(),
            'algorithm': self.algorithm.value,
            'key_id': self.key_id,
            'iv': base64.b64encode(self.iv).decode() if self.iv else None,
            'tag': base64.b64encode(self.tag).decode() if self.tag else None,
            'salt': base64.b64encode(self.salt).decode() if self.salt else None,
            'nonce': base64.b64encode(self.nonce).decode() if self.nonce else None,
            'signature': base64.b64encode(self.signature).decode() if self.signature else None,
            'metadata': self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EncryptedData':
        """Create from dictionary"""
        return cls(
            ciphertext=base64.b64decode(data['ciphertext']),
            algorithm=EncryptionAlgorithm(data['algorithm']),
            key_id=data['key_id'],
            iv=base64.b64decode(data['iv']) if data.get('iv') else None,
            tag=base64.b64decode(data['tag']) if data.get('tag') else None,
            salt=base64.b64decode(data['salt']) if data.get('salt') else None,
            nonce=base64.b64decode(data['nonce']) if data.get('nonce') else None,
            signature=base64.b64decode(data['signature']) if data.get('signature') else None,
            metadata=data.get('metadata', {})
        )


class AdvancedEncryptionManager:
    """
    Advanced encryption manager with multiple algorithms and key management
    """
    
    def __init__(self, master_key: Optional[bytes] = None):
        self.logger = logging.getLogger(__name__)
        self.backend = default_backend()
        
        # Key storage
        self.keys: Dict[str, EncryptionKey] = {}
        
        # Master key for key encryption
        self.master_key = master_key or self._generate_master_key()
        
        # Initialize master key Fernet
        self.master_fernet = Fernet(base64.urlsafe_b64encode(self.master_key[:32]))
        
        # Key rotation settings
        self.key_rotation_interval = timedelta(days=30)
        self.max_key_usage = 1000000  # 1 million operations per key
        
        # Performance metrics
        self.operation_count = 0
        self.last_performance_check = time.time()
    
    def _generate_master_key(self) -> bytes:
        """Generate a new master key"""
        return secrets.token_bytes(32)
    
    async def generate_key(self, 
                          algorithm: EncryptionAlgorithm,
                          key_type: KeyType = KeyType.SYMMETRIC,
                          expires_in: Optional[timedelta] = None,
                          metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate a new encryption key
        """
        try:
            key_id = secrets.token_hex(16)
            current_time = datetime.now(timezone.utc)
            expires_at = current_time + expires_in if expires_in else None
            
            if algorithm == EncryptionAlgorithm.FERNET:
                key_data = Fernet.generate_key()
            elif algorithm == EncryptionAlgorithm.AES_256_GCM:
                key_data = secrets.token_bytes(32)  # 256 bits
            elif algorithm == EncryptionAlgorithm.AES_256_CBC:
                key_data = secrets.token_bytes(32)  # 256 bits
            elif algorithm == EncryptionAlgorithm.CHACHA20_POLY1305:
                key_data = secrets.token_bytes(32)  # 256 bits
            elif algorithm == EncryptionAlgorithm.NACL_SECRETBOX:
                key_data = nacl.utils.random(nacl.secret.SecretBox.KEY_SIZE)
            elif algorithm == EncryptionAlgorithm.RSA_OAEP:
                if key_type == KeyType.ASYMMETRIC_PRIVATE:
                    private_key = rsa.generate_private_key(
                        public_exponent=65537,
                        key_size=2048,
                        backend=self.backend
                    )
                    key_data = private_key.private_bytes(
                        encoding=serialization.Encoding.PEM,
                        format=serialization.PrivateFormat.PKCS8,
                        encryption_algorithm=serialization.NoEncryption()
                    )
                else:
                    raise ValueError("RSA key generation requires ASYMMETRIC_PRIVATE key type")
            elif algorithm == EncryptionAlgorithm.HYBRID_RSA_AES:
                # Generate RSA key pair for hybrid encryption
                private_key = rsa.generate_private_key(
                    public_exponent=65537,
                    key_size=2048,
                    backend=self.backend
                )
                key_data = private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                )
            else:
                raise ValueError(f"Unsupported algorithm: {algorithm}")
            
            # Create key object
            encryption_key = EncryptionKey(
                key_id=key_id,
                key_type=key_type,
                algorithm=algorithm,
                key_data=key_data,
                created_at=current_time,
                expires_at=expires_at,
                max_usage=self.max_key_usage,
                metadata=metadata or {}
            )
            
            # Store encrypted key
            await self._store_key(encryption_key)
            
            # Generate public key if asymmetric
            if algorithm in [EncryptionAlgorithm.RSA_OAEP, EncryptionAlgorithm.HYBRID_RSA_AES]:
                await self._generate_public_key(key_id, key_data)
            
            self.logger.info(f"Generated {algorithm.value} key with ID {key_id}")
            return key_id
            
        except Exception as e:
            self.logger.error(f"Failed to generate key: {str(e)}")
            raise
    
    async def encrypt(self, 
                     data: Union[str, bytes],
                     algorithm: EncryptionAlgorithm,
                     key_id: Optional[str] = None,
                     additional_data: Optional[bytes] = None) -> EncryptedData:
        """
        Encrypt data using specified algorithm
        """
        try:
            self.operation_count += 1
            
            # Convert string to bytes
            if isinstance(data, str):
                data = data.encode('utf-8')
            
            # Get or generate key
            if key_id is None:
                key_id = await self.generate_key(algorithm)
            
            encryption_key = await self._get_key(key_id)
            
            # Check key validity
            await self._validate_key(encryption_key)
            
            # Encrypt based on algorithm
            if algorithm == EncryptionAlgorithm.FERNET:
                return await self._encrypt_fernet(data, encryption_key)
            elif algorithm == EncryptionAlgorithm.AES_256_GCM:
                return await self._encrypt_aes_gcm(data, encryption_key, additional_data)
            elif algorithm == EncryptionAlgorithm.AES_256_CBC:
                return await self._encrypt_aes_cbc(data, encryption_key)
            elif algorithm == EncryptionAlgorithm.CHACHA20_POLY1305:
                return await self._encrypt_chacha20(data, encryption_key, additional_data)
            elif algorithm == EncryptionAlgorithm.NACL_SECRETBOX:
                return await self._encrypt_nacl_secretbox(data, encryption_key)
            elif algorithm == EncryptionAlgorithm.RSA_OAEP:
                return await self._encrypt_rsa_oaep(data, encryption_key)
            elif algorithm == EncryptionAlgorithm.HYBRID_RSA_AES:
                return await self._encrypt_hybrid_rsa_aes(data, encryption_key)
            else:
                raise ValueError(f"Unsupported encryption algorithm: {algorithm}")
                
        except Exception as e:
            self.logger.error(f"Encryption failed: {str(e)}")
            raise
    
    async def decrypt(self, encrypted_data: EncryptedData) -> bytes:
        """
        Decrypt data using the specified algorithm and key
        """
        try:
            self.operation_count += 1
            
            # Get decryption key
            encryption_key = await self._get_key(encrypted_data.key_id)
            
            # Check key validity
            await self._validate_key(encryption_key)
            
            # Decrypt based on algorithm
            if encrypted_data.algorithm == EncryptionAlgorithm.FERNET:
                return await self._decrypt_fernet(encrypted_data, encryption_key)
            elif encrypted_data.algorithm == EncryptionAlgorithm.AES_256_GCM:
                return await self._decrypt_aes_gcm(encrypted_data, encryption_key)
            elif encrypted_data.algorithm == EncryptionAlgorithm.AES_256_CBC:
                return await self._decrypt_aes_cbc(encrypted_data, encryption_key)
            elif encrypted_data.algorithm == EncryptionAlgorithm.CHACHA20_POLY1305:
                return await self._decrypt_chacha20(encrypted_data, encryption_key)
            elif encrypted_data.algorithm == EncryptionAlgorithm.NACL_SECRETBOX:
                return await self._decrypt_nacl_secretbox(encrypted_data, encryption_key)
            elif encrypted_data.algorithm == EncryptionAlgorithm.RSA_OAEP:
                return await self._decrypt_rsa_oaep(encrypted_data, encryption_key)
            elif encrypted_data.algorithm == EncryptionAlgorithm.HYBRID_RSA_AES:
                return await self._decrypt_hybrid_rsa_aes(encrypted_data, encryption_key)
            else:
                raise ValueError(f"Unsupported decryption algorithm: {encrypted_data.algorithm}")
                
        except Exception as e:
            self.logger.error(f"Decryption failed: {str(e)}")
            raise
    
    async def sign_data(self, data: bytes, signing_key_id: str) -> bytes:
        """
        Sign data using private key
        """
        try:
            signing_key = await self._get_key(signing_key_id)
            
            # Load private signing key
            private_key = serialization.load_pem_private_key(
                signing_key.key_data,
                password=None,
                backend=self.backend
            )
            
            # Sign data
            signature = private_key.sign(
                data,
                asym_padding.PSS(
                    mgf=asym_padding.MGF1(hashes.SHA256()),
                    salt_length=asym_padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            return signature
            
        except Exception as e:
            self.logger.error(f"Data signing failed: {str(e)}")
            raise
    
    async def verify_signature(self, data: bytes, signature: bytes, public_key_id: str) -> bool:
        """
        Verify data signature using public key
        """
        try:
            public_key_obj = await self._get_key(public_key_id)
            
            # Load public key
            public_key = serialization.load_pem_public_key(
                public_key_obj.key_data,
                backend=self.backend
            )
            
            # Verify signature
            public_key.verify(
                signature,
                data,
                asym_padding.PSS(
                    mgf=asym_padding.MGF1(hashes.SHA256()),
                    salt_length=asym_padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            return True
            
        except Exception:
            return False
    
    async def rotate_key(self, key_id: str) -> str:
        """
        Rotate encryption key (generate new key, mark old as deprecated)
        """
        try:
            old_key = await self._get_key(key_id)
            
            # Generate new key with same algorithm
            new_key_id = await self.generate_key(
                algorithm=old_key.algorithm,
                key_type=old_key.key_type,
                expires_in=self.key_rotation_interval,
                metadata=old_key.metadata
            )
            
            # Mark old key as deprecated
            old_key.metadata['deprecated'] = True
            old_key.metadata['replaced_by'] = new_key_id
            old_key.expires_at = datetime.now(timezone.utc) + timedelta(days=7)  # Grace period
            
            await self._store_key(old_key)
            
            self.logger.info(f"Rotated key {key_id} -> {new_key_id}")
            return new_key_id
            
        except Exception as e:
            self.logger.error(f"Key rotation failed: {str(e)}")
            raise
    
    async def derive_key(self, 
                        password: str, 
                        salt: Optional[bytes] = None,
                        algorithm: EncryptionAlgorithm = EncryptionAlgorithm.AES_256_GCM,
                        iterations: int = 100000) -> Tuple[str, bytes]:
        """
        Derive encryption key from password
        """
        try:
            if salt is None:
                salt = secrets.token_bytes(32)
            
            # Use PBKDF2 for key derivation
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=iterations,
                backend=self.backend
            )
            
            derived_key = kdf.derive(password.encode('utf-8'))
            
            # Store the derived key
            key_id = secrets.token_hex(16)
            encryption_key = EncryptionKey(
                key_id=key_id,
                key_type=KeyType.DATA_ENCRYPTION_KEY,
                algorithm=algorithm,
                key_data=derived_key,
                created_at=datetime.now(timezone.utc),
                metadata={'derived': True, 'salt': base64.b64encode(salt).decode()}
            )
            
            await self._store_key(encryption_key)
            
            return key_id, salt
            
        except Exception as e:
            self.logger.error(f"Key derivation failed: {str(e)}")
            raise
    
    async def secure_delete_key(self, key_id: str) -> bool:
        """
        Securely delete encryption key
        """
        try:
            if key_id in self.keys:
                # Overwrite key data multiple times
                key_obj = self.keys[key_id]
                key_data_len = len(key_obj.key_data)
                
                # Multiple pass overwrite
                for _ in range(3):
                    key_obj.key_data = secrets.token_bytes(key_data_len)
                
                # Remove from memory
                del self.keys[key_id]
                
                self.logger.info(f"Securely deleted key {key_id}")
                return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Secure key deletion failed: {str(e)}")
            return False
    
    # Algorithm-specific encryption methods
    async def _encrypt_fernet(self, data: bytes, key: EncryptionKey) -> EncryptedData:
        """Encrypt using Fernet"""
        fernet = Fernet(key.key_data)
        ciphertext = fernet.encrypt(data)
        
        return EncryptedData(
            ciphertext=ciphertext,
            algorithm=EncryptionAlgorithm.FERNET,
            key_id=key.key_id
        )
    
    async def _decrypt_fernet(self, encrypted_data: EncryptedData, key: EncryptionKey) -> bytes:
        """Decrypt using Fernet"""
        fernet = Fernet(key.key_data)
        return fernet.decrypt(encrypted_data.ciphertext)
    
    async def _encrypt_aes_gcm(self, data: bytes, key: EncryptionKey, additional_data: Optional[bytes]) -> EncryptedData:
        """Encrypt using AES-256-GCM"""
        iv = secrets.token_bytes(12)  # 96-bit IV for GCM
        
        cipher = Cipher(
            algorithms.AES(key.key_data),
            modes.GCM(iv),
            backend=self.backend
        )
        
        encryptor = cipher.encryptor()
        if additional_data:
            encryptor.authenticate_additional_data(additional_data)
        
        ciphertext = encryptor.update(data) + encryptor.finalize()
        
        return EncryptedData(
            ciphertext=ciphertext,
            algorithm=EncryptionAlgorithm.AES_256_GCM,
            key_id=key.key_id,
            iv=iv,
            tag=encryptor.tag
        )
    
    async def _decrypt_aes_gcm(self, encrypted_data: EncryptedData, key: EncryptionKey) -> bytes:
        """Decrypt using AES-256-GCM"""
        cipher = Cipher(
            algorithms.AES(key.key_data),
            modes.GCM(encrypted_data.iv, encrypted_data.tag),
            backend=self.backend
        )
        
        decryptor = cipher.decryptor()
        return decryptor.update(encrypted_data.ciphertext) + decryptor.finalize()
    
    async def _encrypt_aes_cbc(self, data: bytes, key: EncryptionKey) -> EncryptedData:
        """Encrypt using AES-256-CBC"""
        iv = secrets.token_bytes(16)  # 128-bit IV for CBC
        
        # Pad data
        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(data) + padder.finalize()
        
        cipher = Cipher(
            algorithms.AES(key.key_data),
            modes.CBC(iv),
            backend=self.backend
        )
        
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(padded_data) + encryptor.finalize()
        
        return EncryptedData(
            ciphertext=ciphertext,
            algorithm=EncryptionAlgorithm.AES_256_CBC,
            key_id=key.key_id,
            iv=iv
        )
    
    async def _decrypt_aes_cbc(self, encrypted_data: EncryptedData, key: EncryptionKey) -> bytes:
        """Decrypt using AES-256-CBC"""
        cipher = Cipher(
            algorithms.AES(key.key_data),
            modes.CBC(encrypted_data.iv),
            backend=self.backend
        )
        
        decryptor = cipher.decryptor()
        padded_data = decryptor.update(encrypted_data.ciphertext) + decryptor.finalize()
        
        # Remove padding
        unpadder = padding.PKCS7(128).unpadder()
        return unpadder.update(padded_data) + unpadder.finalize()
    
    async def _encrypt_chacha20(self, data: bytes, key: EncryptionKey, additional_data: Optional[bytes]) -> EncryptedData:
        """Encrypt using ChaCha20-Poly1305"""
        nonce = secrets.token_bytes(12)  # 96-bit nonce
        
        cipher = Cipher(
            algorithms.ChaCha20(key.key_data, nonce),
            modes.GCM(b'\x00' * 12),  # ChaCha20Poly1305 uses internal counter
            backend=self.backend
        )
        
        encryptor = cipher.encryptor()
        if additional_data:
            encryptor.authenticate_additional_data(additional_data)
        
        ciphertext = encryptor.update(data) + encryptor.finalize()
        
        return EncryptedData(
            ciphertext=ciphertext,
            algorithm=EncryptionAlgorithm.CHACHA20_POLY1305,
            key_id=key.key_id,
            nonce=nonce,
            tag=encryptor.tag
        )
    
    async def _decrypt_chacha20(self, encrypted_data: EncryptedData, key: EncryptionKey) -> bytes:
        """Decrypt using ChaCha20-Poly1305"""
        cipher = Cipher(
            algorithms.ChaCha20(key.key_data, encrypted_data.nonce),
            modes.GCM(b'\x00' * 12, encrypted_data.tag),
            backend=self.backend
        )
        
        decryptor = cipher.decryptor()
        return decryptor.update(encrypted_data.ciphertext) + decryptor.finalize()
    
    async def _encrypt_nacl_secretbox(self, data: bytes, key: EncryptionKey) -> EncryptedData:
        """Encrypt using NaCl SecretBox"""
        box = nacl.secret.SecretBox(key.key_data)
        encrypted = box.encrypt(data)
        
        # Extract nonce and ciphertext
        nonce = encrypted[:nacl.secret.SecretBox.NONCE_SIZE]
        ciphertext = encrypted[nacl.secret.SecretBox.NONCE_SIZE:]
        
        return EncryptedData(
            ciphertext=ciphertext,
            algorithm=EncryptionAlgorithm.NACL_SECRETBOX,
            key_id=key.key_id,
            nonce=nonce
        )
    
    async def _decrypt_nacl_secretbox(self, encrypted_data: EncryptedData, key: EncryptionKey) -> bytes:
        """Decrypt using NaCl SecretBox"""
        box = nacl.secret.SecretBox(key.key_data)
        # Reconstruct the encrypted message
        encrypted_message = encrypted_data.nonce + encrypted_data.ciphertext
        return box.decrypt(encrypted_message)
    
    async def _encrypt_rsa_oaep(self, data: bytes, key: EncryptionKey) -> EncryptedData:
        """Encrypt using RSA-OAEP"""
        # Get public key
        public_key_id = f"{key.key_id}_public"
        public_key_obj = await self._get_key(public_key_id)
        
        public_key = serialization.load_pem_public_key(
            public_key_obj.key_data,
            backend=self.backend
        )
        
        # RSA has size limitations, so we encrypt in chunks
        max_chunk_size = (public_key.key_size // 8) - 2 * (256 // 8) - 2  # OAEP padding
        
        if len(data) > max_chunk_size:
            raise ValueError(f"Data too large for RSA encryption. Maximum size: {max_chunk_size} bytes")
        
        ciphertext = public_key.encrypt(
            data,
            asym_padding.OAEP(
                mgf=asym_padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        
        return EncryptedData(
            ciphertext=ciphertext,
            algorithm=EncryptionAlgorithm.RSA_OAEP,
            key_id=key.key_id
        )
    
    async def _decrypt_rsa_oaep(self, encrypted_data: EncryptedData, key: EncryptionKey) -> bytes:
        """Decrypt using RSA-OAEP"""
        private_key = serialization.load_pem_private_key(
            key.key_data,
            password=None,
            backend=self.backend
        )
        
        plaintext = private_key.decrypt(
            encrypted_data.ciphertext,
            asym_padding.OAEP(
                mgf=asym_padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        
        return plaintext
    
    async def _encrypt_hybrid_rsa_aes(self, data: bytes, key: EncryptionKey) -> EncryptedData:
        """Encrypt using Hybrid RSA-AES"""
        # Generate AES key for data encryption
        aes_key = secrets.token_bytes(32)
        
        # Encrypt data with AES
        temp_key = EncryptionKey(
            key_id="temp",
            key_type=KeyType.SYMMETRIC,
            algorithm=EncryptionAlgorithm.AES_256_GCM,
            key_data=aes_key,
            created_at=datetime.now(timezone.utc)
        )
        
        aes_encrypted = await self._encrypt_aes_gcm(data, temp_key, None)
        
        # Encrypt AES key with RSA
        rsa_encrypted_key = await self._encrypt_rsa_oaep(aes_key, key)
        
        # Combine encrypted key and data
        combined_ciphertext = len(rsa_encrypted_key.ciphertext).to_bytes(4, 'big') + \
                            rsa_encrypted_key.ciphertext + aes_encrypted.ciphertext
        
        return EncryptedData(
            ciphertext=combined_ciphertext,
            algorithm=EncryptionAlgorithm.HYBRID_RSA_AES,
            key_id=key.key_id,
            iv=aes_encrypted.iv,
            tag=aes_encrypted.tag
        )
    
    async def _decrypt_hybrid_rsa_aes(self, encrypted_data: EncryptedData, key: EncryptionKey) -> bytes:
        """Decrypt using Hybrid RSA-AES"""
        # Extract encrypted AES key length and data
        key_length = int.from_bytes(encrypted_data.ciphertext[:4], 'big')
        encrypted_aes_key = encrypted_data.ciphertext[4:4+key_length]
        encrypted_data_part = encrypted_data.ciphertext[4+key_length:]
        
        # Decrypt AES key with RSA
        rsa_encrypted_data = EncryptedData(
            ciphertext=encrypted_aes_key,
            algorithm=EncryptionAlgorithm.RSA_OAEP,
            key_id=key.key_id
        )
        aes_key = await self._decrypt_rsa_oaep(rsa_encrypted_data, key)
        
        # Decrypt data with AES
        aes_encrypted_data = EncryptedData(
            ciphertext=encrypted_data_part,
            algorithm=EncryptionAlgorithm.AES_256_GCM,
            key_id="temp",
            iv=encrypted_data.iv,
            tag=encrypted_data.tag
        )
        
        temp_key = EncryptionKey(
            key_id="temp",
            key_type=KeyType.SYMMETRIC,
            algorithm=EncryptionAlgorithm.AES_256_GCM,
            key_data=aes_key,
            created_at=datetime.now(timezone.utc)
        )
        
        return await self._decrypt_aes_gcm(aes_encrypted_data, temp_key)
    
    async def _generate_public_key(self, private_key_id: str, private_key_data: bytes):
        """Generate and store public key from private key"""
        try:
            private_key = serialization.load_pem_private_key(
                private_key_data,
                password=None,
                backend=self.backend
            )
            
            public_key = private_key.public_key()
            public_key_data = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
            
            public_key_obj = EncryptionKey(
                key_id=f"{private_key_id}_public",
                key_type=KeyType.ASYMMETRIC_PUBLIC,
                algorithm=self.keys[private_key_id].algorithm,
                key_data=public_key_data,
                created_at=datetime.now(timezone.utc),
                metadata={'private_key_id': private_key_id}
            )
            
            await self._store_key(public_key_obj)
            
        except Exception as e:
            self.logger.error(f"Failed to generate public key: {str(e)}")
            raise
    
    async def _store_key(self, key: EncryptionKey):
        """Store encryption key securely"""
        # Encrypt key data with master key before storing
        encrypted_key_data = self.master_fernet.encrypt(key.key_data)
        
        # Store encrypted key
        stored_key = EncryptionKey(
            key_id=key.key_id,
            key_type=key.key_type,
            algorithm=key.algorithm,
            key_data=encrypted_key_data,
            created_at=key.created_at,
            expires_at=key.expires_at,
            usage_count=key.usage_count,
            max_usage=key.max_usage,
            metadata=key.metadata
        )
        
        self.keys[key.key_id] = stored_key
    
    async def _get_key(self, key_id: str) -> EncryptionKey:
        """Retrieve and decrypt encryption key"""
        if key_id not in self.keys:
            raise ValueError(f"Key {key_id} not found")
        
        stored_key = self.keys[key_id]
        
        # Decrypt key data
        decrypted_key_data = self.master_fernet.decrypt(stored_key.key_data)
        
        # Return decrypted key
        return EncryptionKey(
            key_id=stored_key.key_id,
            key_type=stored_key.key_type,
            algorithm=stored_key.algorithm,
            key_data=decrypted_key_data,
            created_at=stored_key.created_at,
            expires_at=stored_key.expires_at,
            usage_count=stored_key.usage_count,
            max_usage=stored_key.max_usage,
            metadata=stored_key.metadata
        )
    
    async def _validate_key(self, key: EncryptionKey):
        """Validate key before use"""
        # Check expiration
        if key.expires_at and datetime.now(timezone.utc) > key.expires_at:
            raise ValueError(f"Key {key.key_id} has expired")
        
        # Check usage count
        if key.max_usage and key.usage_count >= key.max_usage:
            raise ValueError(f"Key {key.key_id} has exceeded maximum usage count")
        
        # Check if deprecated
        if key.metadata.get('deprecated'):
            self.logger.warning(f"Using deprecated key {key.key_id}")
        
        # Increment usage count
        key.usage_count += 1
        await self._store_key(key)
    
    async def get_key_info(self, key_id: str) -> Dict[str, Any]:
        """Get key information without exposing key data"""
        try:
            key = self.keys[key_id]
            
            return {
                'key_id': key.key_id,
                'key_type': key.key_type.value,
                'algorithm': key.algorithm.value,
                'created_at': key.created_at.isoformat(),
                'expires_at': key.expires_at.isoformat() if key.expires_at else None,
                'usage_count': key.usage_count,
                'max_usage': key.max_usage,
                'is_expired': key.expires_at and datetime.now(timezone.utc) > key.expires_at,
                'is_deprecated': key.metadata.get('deprecated', False),
                'metadata': {k: v for k, v in key.metadata.items() if k not in ['key_data']}
            }
            
        except KeyError:
            raise ValueError(f"Key {key_id} not found")
    
    async def list_keys(self, 
                       key_type: Optional[KeyType] = None,
                       algorithm: Optional[EncryptionAlgorithm] = None,
                       include_expired: bool = False) -> List[Dict[str, Any]]:
        """List available keys with filtering"""
        keys_info = []
        current_time = datetime.now(timezone.utc)
        
        for key in self.keys.values():
            # Filter by type
            if key_type and key.key_type != key_type:
                continue
            
            # Filter by algorithm
            if algorithm and key.algorithm != algorithm:
                continue
            
            # Filter expired keys
            if not include_expired and key.expires_at and current_time > key.expires_at:
                continue
            
            keys_info.append(await self.get_key_info(key.key_id))
        
        return keys_info
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get encryption system performance metrics"""
        current_time = time.time()
        time_elapsed = current_time - self.last_performance_check
        
        return {
            'total_operations': self.operation_count,
            'operations_per_second': self.operation_count / time_elapsed if time_elapsed > 0 else 0,
            'active_keys': len(self.keys),
            'master_key_rotations': 0,  # Would track rotations
            'memory_usage_mb': sum(len(key.key_data) for key in self.keys.values()) / (1024 * 1024),
            'last_check': datetime.fromtimestamp(self.last_performance_check).isoformat()
        }


class SecureMessageProtocol:
    """
    Secure message protocol for end-to-end encrypted communications
    """
    
    def __init__(self, encryption_manager: AdvancedEncryptionManager):
        self.encryption_manager = encryption_manager
        self.logger = logging.getLogger(__name__)
    
    async def create_secure_message(self, 
                                  message: str,
                                  recipient_public_key_id: str,
                                  sender_private_key_id: str,
                                  message_type: str = "text") -> Dict[str, Any]:
        """
        Create encrypted and signed message
        """
        try:
            message_data = {
                'type': message_type,
                'content': message,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'sender_id': sender_private_key_id
            }
            
            message_bytes = json.dumps(message_data).encode('utf-8')
            
            # Encrypt message using hybrid encryption
            encrypted_message = await self.encryption_manager.encrypt(
                data=message_bytes,
                algorithm=EncryptionAlgorithm.HYBRID_RSA_AES,
                key_id=recipient_public_key_id.replace('_public', '')
            )
            
            # Sign the encrypted message
            signature = await self.encryption_manager.sign_data(
                data=encrypted_message.ciphertext,
                signing_key_id=sender_private_key_id
            )
            
            encrypted_message.signature = signature
            
            return {
                'encrypted_message': encrypted_message.to_dict(),
                'protocol_version': '1.0',
                'encryption_algorithm': encrypted_message.algorithm.value
            }
            
        except Exception as e:
            self.logger.error(f"Failed to create secure message: {str(e)}")
            raise
    
    async def decrypt_secure_message(self, 
                                   encrypted_message_dict: Dict[str, Any],
                                   recipient_private_key_id: str,
                                   sender_public_key_id: str) -> Dict[str, Any]:
        """
        Decrypt and verify signed message
        """
        try:
            encrypted_message = EncryptedData.from_dict(encrypted_message_dict['encrypted_message'])
            
            # Verify signature first
            if encrypted_message.signature:
                signature_valid = await self.encryption_manager.verify_signature(
                    data=encrypted_message.ciphertext,
                    signature=encrypted_message.signature,
                    public_key_id=sender_public_key_id
                )
                
                if not signature_valid:
                    raise ValueError("Message signature verification failed")
            
            # Decrypt message
            decrypted_bytes = await self.encryption_manager.decrypt(encrypted_message)
            message_data = json.loads(decrypted_bytes.decode('utf-8'))
            
            return {
                'message_type': message_data['type'],
                'content': message_data['content'],
                'timestamp': message_data['timestamp'],
                'sender_id': message_data['sender_id'],
                'signature_verified': encrypted_message.signature is not None
            }
            
        except Exception as e:
            self.logger.error(f"Failed to decrypt secure message: {str(e)}")
            raise


# Example usage and testing
async def main():
    """
    Example usage of the encryption system
    """
    print("Spirit Tours - End-to-End Encryption System Demo")
    print("=" * 60)
    
    # Initialize encryption manager
    encryption_manager = AdvancedEncryptionManager()
    
    try:
        # Test symmetric encryption
        print("\n1. Testing Symmetric Encryption (AES-256-GCM)")
        test_data = "Confidential call recording: Customer interested in Machu Picchu tour"
        
        encrypted_data = await encryption_manager.encrypt(
            data=test_data,
            algorithm=EncryptionAlgorithm.AES_256_GCM
        )
        
        print(f"Original: {test_data}")
        print(f"Encrypted: {base64.b64encode(encrypted_data.ciphertext).decode()[:50]}...")
        
        decrypted_data = await encryption_manager.decrypt(encrypted_data)
        print(f"Decrypted: {decrypted_data.decode()}")
        
        # Test asymmetric encryption
        print("\n2. Testing Asymmetric Encryption (RSA-OAEP)")
        rsa_key_id = await encryption_manager.generate_key(
            algorithm=EncryptionAlgorithm.RSA_OAEP,
            key_type=KeyType.ASYMMETRIC_PRIVATE
        )
        
        short_message = "Secret agent code: SPIRIT123"
        rsa_encrypted = await encryption_manager.encrypt(
            data=short_message,
            algorithm=EncryptionAlgorithm.RSA_OAEP,
            key_id=rsa_key_id
        )
        
        rsa_decrypted = await encryption_manager.decrypt(rsa_encrypted)
        print(f"RSA Encrypted/Decrypted: {rsa_decrypted.decode()}")
        
        # Test hybrid encryption
        print("\n3. Testing Hybrid Encryption (RSA + AES)")
        large_data = "Large customer database export: " + "x" * 1000
        
        hybrid_encrypted = await encryption_manager.encrypt(
            data=large_data,
            algorithm=EncryptionAlgorithm.HYBRID_RSA_AES,
            key_id=rsa_key_id
        )
        
        hybrid_decrypted = await encryption_manager.decrypt(hybrid_encrypted)
        print(f"Hybrid encryption successful: {len(hybrid_decrypted)} bytes decrypted")
        
        # Test secure messaging
        print("\n4. Testing Secure Message Protocol")
        message_protocol = SecureMessageProtocol(encryption_manager)
        
        # Generate key pairs for Alice and Bob
        alice_private = await encryption_manager.generate_key(
            algorithm=EncryptionAlgorithm.HYBRID_RSA_AES,
            key_type=KeyType.ASYMMETRIC_PRIVATE
        )
        
        bob_private = await encryption_manager.generate_key(
            algorithm=EncryptionAlgorithm.HYBRID_RSA_AES,
            key_type=KeyType.ASYMMETRIC_PRIVATE
        )
        
        alice_public = f"{alice_private}_public"
        bob_public = f"{bob_private}_public"
        
        # Alice sends message to Bob
        secure_message = await message_protocol.create_secure_message(
            message="Meeting tomorrow at 2 PM to discuss Peru tour packages",
            recipient_public_key_id=bob_public,
            sender_private_key_id=alice_private
        )
        
        print("Secure message created and encrypted")
        
        # Bob receives and decrypts message
        decrypted_message = await message_protocol.decrypt_secure_message(
            encrypted_message_dict=secure_message,
            recipient_private_key_id=bob_private,
            sender_public_key_id=alice_public
        )
        
        print(f"Decrypted message: {decrypted_message['content']}")
        print(f"Signature verified: {decrypted_message['signature_verified']}")
        
        # Test key management
        print("\n5. Testing Key Management")
        keys = await encryption_manager.list_keys()
        print(f"Total keys generated: {len(keys)}")
        
        for key_info in keys[:3]:  # Show first 3 keys
            print(f"  Key ID: {key_info['key_id'][:16]}...")
            print(f"  Algorithm: {key_info['algorithm']}")
            print(f"  Type: {key_info['key_type']}")
            print(f"  Usage: {key_info['usage_count']}")
            print()
        
        # Performance metrics
        print("6. Performance Metrics")
        metrics = encryption_manager.get_performance_metrics()
        print(f"Total operations: {metrics['total_operations']}")
        print(f"Active keys: {metrics['active_keys']}")
        print(f"Memory usage: {metrics['memory_usage_mb']:.2f} MB")
        
        print("\n✅ All encryption tests passed successfully!")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())