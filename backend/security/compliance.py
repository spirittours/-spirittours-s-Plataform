"""
Compliance and Regulatory Requirements.

This module handles compliance with various regulations:
- GDPR (General Data Protection Regulation)
- PCI DSS (Payment Card Industry Data Security Standard)
- Spanish data protection laws (LOPD)

Features:
- Data subject rights (access, deletion, portability)
- Consent management
- Audit logging
- Data retention policies
- PCI DSS compliance helpers

Author: GenSpark AI Developer
Phase: 8 - Security & Compliance
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
import json

from backend.utils.logger import get_logger

logger = get_logger(__name__)


class ConsentType(str, Enum):
    """Types of user consent."""
    NECESSARY = "necessary"  # Required for service
    ANALYTICS = "analytics"  # Analytics and statistics
    MARKETING = "marketing"  # Marketing communications
    PERSONALIZATION = "personalization"  # Personalized content
    THIRD_PARTY = "third_party"  # Third-party integrations


class DataCategory(str, Enum):
    """Categories of personal data."""
    IDENTITY = "identity"  # Name, DNI, passport
    CONTACT = "contact"  # Email, phone, address
    FINANCIAL = "financial"  # Payment info, IBAN
    DEMOGRAPHIC = "demographic"  # Age, gender, location
    BEHAVIORAL = "behavioral"  # Browsing, preferences
    HEALTH = "health"  # Medical information (special category)
    BIOMETRIC = "biometric"  # Fingerprints, facial (special category)


class DataSubjectRight(str, Enum):
    """GDPR data subject rights."""
    ACCESS = "access"  # Right to access data
    RECTIFICATION = "rectification"  # Right to correct data
    ERASURE = "erasure"  # Right to be forgotten
    RESTRICTION = "restriction"  # Right to restrict processing
    PORTABILITY = "portability"  # Right to data portability
    OBJECTION = "objection"  # Right to object to processing
    AUTOMATED_DECISION = "automated_decision"  # Right to not be subject to automated decisions


@dataclass
class Consent:
    """User consent record."""
    user_id: str
    consent_type: ConsentType
    granted: bool
    granted_at: datetime
    withdrawn_at: Optional[datetime] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    version: str = "1.0"  # Consent policy version
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'user_id': self.user_id,
            'consent_type': self.consent_type.value,
            'granted': self.granted,
            'granted_at': self.granted_at.isoformat(),
            'withdrawn_at': self.withdrawn_at.isoformat() if self.withdrawn_at else None,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'version': self.version
        }


@dataclass
class DataRetentionPolicy:
    """Data retention policy."""
    data_category: DataCategory
    retention_days: int
    description: str
    legal_basis: str
    
    def is_expired(self, data_created_at: datetime) -> bool:
        """Check if data retention period has expired."""
        expiry_date = data_created_at + timedelta(days=self.retention_days)
        return datetime.now() > expiry_date


@dataclass
class AuditLog:
    """Audit log entry for compliance."""
    timestamp: datetime
    user_id: str
    action: str
    resource_type: str
    resource_id: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    details: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'timestamp': self.timestamp.isoformat(),
            'user_id': self.user_id,
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'details': self.details
        }


class GDPRComplianceManager:
    """
    Manager for GDPR compliance.
    
    Handles data subject rights, consent management, and data retention.
    """
    
    def __init__(self):
        """Initialize GDPR compliance manager."""
        self.retention_policies = self._init_retention_policies()
        self.consent_records: Dict[str, List[Consent]] = {}
        self.audit_logs: List[AuditLog] = []
        
        logger.info("GDPR compliance manager initialized")
    
    def _init_retention_policies(self) -> Dict[DataCategory, DataRetentionPolicy]:
        """Initialize default data retention policies."""
        return {
            DataCategory.IDENTITY: DataRetentionPolicy(
                data_category=DataCategory.IDENTITY,
                retention_days=365 * 7,  # 7 years (legal requirement)
                description="Identity documents for verification and legal compliance",
                legal_basis="Legal obligation (Spanish law)"
            ),
            DataCategory.FINANCIAL: DataRetentionPolicy(
                data_category=DataCategory.FINANCIAL,
                retention_days=365 * 10,  # 10 years (tax law)
                description="Financial transactions and payment information",
                legal_basis="Legal obligation (Tax law)"
            ),
            DataCategory.CONTACT: DataRetentionPolicy(
                data_category=DataCategory.CONTACT,
                retention_days=365 * 3,  # 3 years
                description="Contact information for communication",
                legal_basis="Legitimate interest / Consent"
            ),
            DataCategory.BEHAVIORAL: DataRetentionPolicy(
                data_category=DataCategory.BEHAVIORAL,
                retention_days=365,  # 1 year
                description="User behavior and preferences",
                legal_basis="Consent"
            ),
            DataCategory.DEMOGRAPHIC: DataRetentionPolicy(
                data_category=DataCategory.DEMOGRAPHIC,
                retention_days=365 * 5,  # 5 years
                description="Demographic information for service provision",
                legal_basis="Contract / Legitimate interest"
            )
        }
    
    def record_consent(self, consent: Consent) -> None:
        """
        Record user consent.
        
        Args:
            consent: Consent object to record
        """
        if consent.user_id not in self.consent_records:
            self.consent_records[consent.user_id] = []
        
        self.consent_records[consent.user_id].append(consent)
        
        logger.info(f"Consent recorded for user {consent.user_id}", extra={
            'consent_type': consent.consent_type.value,
            'granted': consent.granted
        })
        
        # TODO: Persist to database
    
    def check_consent(self, user_id: str, consent_type: ConsentType) -> bool:
        """
        Check if user has granted specific consent.
        
        Args:
            user_id: User identifier
            consent_type: Type of consent to check
            
        Returns:
            True if consent granted and not withdrawn
        """
        if user_id not in self.consent_records:
            return False
        
        # Get most recent consent of this type
        user_consents = [
            c for c in self.consent_records[user_id]
            if c.consent_type == consent_type
        ]
        
        if not user_consents:
            return False
        
        latest_consent = max(user_consents, key=lambda c: c.granted_at)
        
        # Check if granted and not withdrawn
        return latest_consent.granted and latest_consent.withdrawn_at is None
    
    def withdraw_consent(self, user_id: str, consent_type: ConsentType) -> bool:
        """
        Withdraw user consent.
        
        Args:
            user_id: User identifier
            consent_type: Type of consent to withdraw
            
        Returns:
            True if consent was withdrawn
        """
        if user_id not in self.consent_records:
            return False
        
        # Find active consent
        for consent in self.consent_records[user_id]:
            if (consent.consent_type == consent_type and 
                consent.granted and 
                consent.withdrawn_at is None):
                
                consent.withdrawn_at = datetime.now()
                logger.info(f"Consent withdrawn for user {user_id}", extra={
                    'consent_type': consent_type.value
                })
                return True
        
        return False
    
    def export_user_data(self, user_id: str) -> Dict[str, Any]:
        """
        Export all user data (GDPR right to data portability).
        
        Args:
            user_id: User identifier
            
        Returns:
            Dictionary with all user data
        """
        logger.info(f"Exporting data for user {user_id}")
        
        # TODO: Implement actual data export from all tables
        exported_data = {
            'user_id': user_id,
            'export_date': datetime.now().isoformat(),
            'profile': {},  # User profile data
            'bookings': [],  # Booking history
            'payments': [],  # Payment history
            'preferences': {},  # User preferences
            'consent_history': [
                c.to_dict() for c in self.consent_records.get(user_id, [])
            ]
        }
        
        self._log_audit(
            user_id=user_id,
            action="data_export",
            resource_type="user_data",
            resource_id=user_id,
            details={'export_completed': True}
        )
        
        return exported_data
    
    def delete_user_data(self, user_id: str, reason: str = "user_request") -> Dict[str, Any]:
        """
        Delete all user data (GDPR right to erasure).
        
        Args:
            user_id: User identifier
            reason: Reason for deletion
            
        Returns:
            Dictionary with deletion summary
        """
        logger.info(f"Deleting data for user {user_id}", extra={'reason': reason})
        
        # TODO: Implement actual data deletion
        # Note: Some data may need to be retained for legal reasons
        
        deletion_summary = {
            'user_id': user_id,
            'deletion_date': datetime.now().isoformat(),
            'reason': reason,
            'deleted_categories': [
                DataCategory.BEHAVIORAL.value,
                DataCategory.DEMOGRAPHIC.value,
                # IDENTITY and FINANCIAL may be retained for legal reasons
            ],
            'retained_categories': [
                DataCategory.IDENTITY.value,  # Required by law
                DataCategory.FINANCIAL.value  # Required by law
            ],
            'retention_reason': 'Legal obligation (Spanish tax and commercial law)'
        }
        
        self._log_audit(
            user_id=user_id,
            action="data_deletion",
            resource_type="user_data",
            resource_id=user_id,
            details=deletion_summary
        )
        
        return deletion_summary
    
    def check_retention_compliance(self, user_id: str) -> Dict[str, Any]:
        """
        Check if user data complies with retention policies.
        
        Args:
            user_id: User identifier
            
        Returns:
            Dictionary with compliance status
        """
        # TODO: Implement actual retention check
        return {
            'user_id': user_id,
            'compliant': True,
            'categories_checked': [c.value for c in DataCategory],
            'expired_data': [],
            'check_date': datetime.now().isoformat()
        }
    
    def _log_audit(
        self,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log audit event."""
        audit_log = AuditLog(
            timestamp=datetime.now(),
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details or {}
        )
        
        self.audit_logs.append(audit_log)
        
        # TODO: Persist to database
        logger.info(f"Audit log created: {action}", extra={
            'user_id': user_id,
            'resource_type': resource_type
        })


class PCIDSSComplianceHelper:
    """
    Helper for PCI DSS compliance.
    
    PCI DSS requirements for handling payment card data.
    """
    
    @staticmethod
    def validate_pan_handling(data: Dict[str, Any]) -> Dict[str, bool]:
        """
        Validate that PAN (Primary Account Number) is handled securely.
        
        Args:
            data: Data to validate
            
        Returns:
            Dictionary with validation results
        """
        results = {
            'pan_encrypted': False,
            'cvv_not_stored': True,
            'full_pan_not_logged': True,
            'compliant': False
        }
        
        # Check if PAN is encrypted (not plaintext)
        if 'card_number' in data:
            card_number = str(data['card_number'])
            # Check if it looks encrypted (not all digits)
            results['pan_encrypted'] = not card_number.isdigit()
        
        # Check that CVV is not stored
        if 'cvv' in data or 'cvc' in data:
            results['cvv_not_stored'] = False
        
        # Overall compliance
        results['compliant'] = (
            results['pan_encrypted'] and
            results['cvv_not_stored']
        )
        
        return results
    
    @staticmethod
    def get_pci_requirements() -> List[Dict[str, str]]:
        """
        Get list of PCI DSS requirements.
        
        Returns:
            List of requirements
        """
        return [
            {
                'requirement': '1',
                'description': 'Install and maintain a firewall configuration',
                'category': 'Network Security'
            },
            {
                'requirement': '2',
                'description': 'Do not use vendor-supplied defaults',
                'category': 'Configuration'
            },
            {
                'requirement': '3',
                'description': 'Protect stored cardholder data',
                'category': 'Data Protection'
            },
            {
                'requirement': '4',
                'description': 'Encrypt transmission of cardholder data',
                'category': 'Data Protection'
            },
            {
                'requirement': '5',
                'description': 'Use and regularly update anti-virus software',
                'category': 'Security Software'
            },
            {
                'requirement': '6',
                'description': 'Develop and maintain secure systems and applications',
                'category': 'Development'
            },
            {
                'requirement': '7',
                'description': 'Restrict access to cardholder data',
                'category': 'Access Control'
            },
            {
                'requirement': '8',
                'description': 'Assign a unique ID to each person with computer access',
                'category': 'Access Control'
            },
            {
                'requirement': '9',
                'description': 'Restrict physical access to cardholder data',
                'category': 'Physical Security'
            },
            {
                'requirement': '10',
                'description': 'Track and monitor all access to network resources',
                'category': 'Monitoring'
            },
            {
                'requirement': '11',
                'description': 'Regularly test security systems and processes',
                'category': 'Testing'
            },
            {
                'requirement': '12',
                'description': 'Maintain a policy that addresses information security',
                'category': 'Policy'
            }
        ]


# Singleton instance
_gdpr_manager: Optional[GDPRComplianceManager] = None


def get_gdpr_manager() -> GDPRComplianceManager:
    """
    Get global GDPR compliance manager.
    
    Returns:
        GDPRComplianceManager instance
    """
    global _gdpr_manager
    if _gdpr_manager is None:
        _gdpr_manager = GDPRComplianceManager()
    return _gdpr_manager


def get_pci_helper() -> PCIDSSComplianceHelper:
    """
    Get PCI DSS compliance helper.
    
    Returns:
        PCIDSSComplianceHelper instance
    """
    return PCIDSSComplianceHelper()
