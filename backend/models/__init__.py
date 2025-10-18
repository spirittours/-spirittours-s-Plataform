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

from .ticketing_models import (
    Department, Ticket, TicketAssignment, TicketComment, TicketWatcher,
    TicketHistory, TicketChecklist, TicketReminder, TicketAttachment,
    TicketEscalation, TicketPriority, TicketStatus, TicketType,
    EscalationReason, CommentType, TicketCreate, TicketUpdate,
    TicketResponse, TicketAssignRequest, TicketEscalateRequest,
    TicketCommentCreate, TicketWatcherAdd, ChecklistItemCreate,
    TicketStatsResponse, TicketDetailedResponse, ChecklistItemResponse,
    TicketCommentResponse, DepartmentCreate, DepartmentResponse
)

from .training_models import (
    TrainingModule, TrainingLesson, TrainingProgress, TrainingLessonProgress,
    TrainingQuiz, TrainingQuizQuestion, TrainingQuizAttempt, TrainingCertification,
    TrainingConfiguration, TrainingReminderSent, TrainingAchievement,
    TrainingUserAchievement, TrainingUserPoints, ModuleCategory, ContentType,
    ProgressStatus, QuestionType, CertificationLevel, ReminderType,
    ModuleCreate, ModuleUpdate, ModuleResponse, LessonCreate, LessonUpdate,
    LessonResponse, ProgressResponse, QuizQuestionCreate, QuizCreate,
    QuizAnswerSubmit, QuizAttemptSubmit, QuizAttemptResponse,
    CertificationResponse, TrainingStatsResponse, ConfigurationUpdate,
    AchievementResponse, LeaderboardEntry
)

from .email_system_models import (
    EmailProvider, EmailQueue, EmailLog, EmailMetric, EmailTemplate,
    EmailBounce, EmailWebhook, EmailCampaign, EmailQueueStatus, EmailPriority,
    EmailProviderType, EmailProviderStatus, EmailEventType, BounceType,
    EmailTemplateCategory, EmailProviderCreate, EmailProviderUpdate,
    EmailProviderResponse, EmailQueueCreate, EmailQueueResponse,
    EmailMetricResponse, EmailTemplateCreate, EmailTemplateResponse,
    SendEmailRequest, SendEmailResponse, EmailStatistics, ProviderHealthCheck
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
    'SendResponseRequest', 'CreateEmailTemplateRequest',
    
    # Ticketing Models
    'Department', 'Ticket', 'TicketAssignment', 'TicketComment', 'TicketWatcher',
    'TicketHistory', 'TicketChecklist', 'TicketReminder', 'TicketAttachment',
    'TicketEscalation', 'TicketPriority', 'TicketStatus', 'TicketType',
    'EscalationReason', 'CommentType', 'TicketCreate', 'TicketUpdate',
    'TicketResponse', 'TicketAssignRequest', 'TicketEscalateRequest',
    'TicketCommentCreate', 'TicketWatcherAdd', 'ChecklistItemCreate',
    'TicketStatsResponse', 'TicketDetailedResponse', 'ChecklistItemResponse',
    'TicketCommentResponse', 'DepartmentCreate', 'DepartmentResponse',
    
    # Training Models - Database Tables
    'TrainingModule', 'TrainingLesson', 'TrainingProgress', 'TrainingLessonProgress',
    'TrainingQuiz', 'TrainingQuizQuestion', 'TrainingQuizAttempt', 'TrainingCertification',
    'TrainingConfiguration', 'TrainingReminderSent', 'TrainingAchievement',
    'TrainingUserAchievement', 'TrainingUserPoints',
    
    # Training Models - Enums
    'ModuleCategory', 'ContentType', 'ProgressStatus', 'QuestionType',
    'CertificationLevel', 'ReminderType',
    
    # Training Models - Pydantic Schemas
    'ModuleCreate', 'ModuleUpdate', 'ModuleResponse', 'LessonCreate', 'LessonUpdate',
    'LessonResponse', 'ProgressResponse', 'QuizQuestionCreate', 'QuizCreate',
    'QuizAnswerSubmit', 'QuizAttemptSubmit', 'QuizAttemptResponse',
    'CertificationResponse', 'TrainingStatsResponse', 'ConfigurationUpdate',
    'AchievementResponse', 'LeaderboardEntry',
    
    # Email System Models - Database Tables
    'EmailProvider', 'EmailQueue', 'EmailLog', 'EmailMetric', 'EmailTemplate',
    'EmailBounce', 'EmailWebhook', 'EmailCampaign',
    
    # Email System Models - Enums
    'EmailQueueStatus', 'EmailPriority', 'EmailProviderType', 'EmailProviderStatus',
    'EmailEventType', 'BounceType', 'EmailTemplateCategory',
    
    # Email System Models - Pydantic Schemas
    'EmailProviderCreate', 'EmailProviderUpdate', 'EmailProviderResponse',
    'EmailQueueCreate', 'EmailQueueResponse', 'EmailMetricResponse',
    'EmailTemplateCreate', 'EmailTemplateResponse', 'SendEmailRequest',
    'SendEmailResponse', 'EmailStatistics', 'ProviderHealthCheck'
]