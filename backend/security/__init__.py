"""
Security Module.

This module provides comprehensive security features for the application.

Components:
- Security middleware (headers, rate limiting, CSRF, input validation)
- Encryption services
- Password hashing
- Token management
- Data masking
- GDPR compliance
- PCI DSS compliance

Author: GenSpark AI Developer
Phase: 8 - Security & Compliance
"""

from backend.security.security_middleware import (
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
    InputValidationMiddleware,
    CSRFProtectionMiddleware,
    setup_cors
)

from backend.security.encryption import (
    EncryptionService,
    PasswordHasher,
    TokenManager,
    DataMasker,
    init_encryption,
    get_encryption
)

from backend.security.compliance import (
    GDPRComplianceManager,
    PCIDSSComplianceHelper,
    ConsentType,
    DataCategory,
    DataSubjectRight,
    Consent,
    DataRetentionPolicy,
    AuditLog,
    get_gdpr_manager,
    get_pci_helper
)

__all__ = [
    # Middleware
    'SecurityHeadersMiddleware',
    'RateLimitMiddleware',
    'InputValidationMiddleware',
    'CSRFProtectionMiddleware',
    'setup_cors',
    
    # Encryption
    'EncryptionService',
    'PasswordHasher',
    'TokenManager',
    'DataMasker',
    'init_encryption',
    'get_encryption',
    
    # Compliance
    'GDPRComplianceManager',
    'PCIDSSComplianceHelper',
    'ConsentType',
    'DataCategory',
    'DataSubjectRight',
    'Consent',
    'DataRetentionPolicy',
    'AuditLog',
    'get_gdpr_manager',
    'get_pci_helper',
]
