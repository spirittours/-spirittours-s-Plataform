#!/usr/bin/env python3
"""
Models package for Spirit Tours B2C/B2B/B2B2C Platform
"""

from .rbac_models import (
    Base, User, Role, Permission, Branch, AuditLog, SessionToken,
    UserLevel, PermissionScope, PermissionChecker,
    PermissionResponse, RoleResponse, BranchResponse, UserResponse,
    CreateUserRequest, UpdateUserRequest
)

from .business_models import (
    TourOperator, TravelAgency, SalesAgent, BusinessBooking,
    PaymentStatement, CommissionRule, CustomerType, BookingChannel,
    CommissionType, PaymentTerms, TourOperatorCreate, TravelAgencyCreate,
    SalesAgentCreate, BusinessBookingCreate, TourOperatorResponse,
    PaymentStatementResponse
)

from .enhanced_audit_models import (
    ActionType, RiskLevel, EnhancedAuditLog,
    BookingAuditLog, AIAgentUsageLog, LoginActivityLog, DataAccessLog
)

from .email_models import (
    EmailAccount, EmailMessage, EmailClassification, EmailResponse,
    EmailAnalytics, EmailTemplate, EmailCategory, EmailIntent,
    EmailPriority, EmailStatus, ResponseType, EmailLanguage,
    EmailAccountResponse, EmailMessageResponse, EmailClassificationResponse,
    EmailAnalyticsResponse, EmailDashboardResponse, ClassifyEmailRequest,
    SendResponseRequest, CreateEmailTemplateRequest
)

__all__ = [
    # Base
    'Base',
    
    # RBAC Models
    'User', 'Role', 'Permission', 'Branch', 'AuditLog', 'SessionToken',
    'UserLevel', 'PermissionScope', 'PermissionChecker',
    'PermissionResponse', 'RoleResponse', 'BranchResponse', 'UserResponse',
    'CreateUserRequest', 'UpdateUserRequest',
    
    # Business Models
    'TourOperator', 'TravelAgency', 'SalesAgent', 'BusinessBooking',
    'PaymentStatement', 'CommissionRule', 'CustomerType', 'BookingChannel',
    'CommissionType', 'PaymentTerms', 'TourOperatorCreate', 'TravelAgencyCreate',
    'SalesAgentCreate', 'BusinessBookingCreate', 'TourOperatorResponse',
    'PaymentStatementResponse',
    
    # Audit Models
    'ActionType', 'RiskLevel', 'EnhancedAuditLog',
    'BookingAuditLog', 'AIAgentUsageLog', 'LoginActivityLog', 'DataAccessLog',
    
    # Email Models
    'EmailAccount', 'EmailMessage', 'EmailClassification', 'EmailResponse',
    'EmailAnalytics', 'EmailTemplate', 'EmailCategory', 'EmailIntent',
    'EmailPriority', 'EmailStatus', 'ResponseType', 'EmailLanguage',
    'EmailAccountResponse', 'EmailMessageResponse', 'EmailClassificationResponse',
    'EmailAnalyticsResponse', 'EmailDashboardResponse', 'ClassifyEmailRequest',
    'SendResponseRequest', 'CreateEmailTemplateRequest'
]