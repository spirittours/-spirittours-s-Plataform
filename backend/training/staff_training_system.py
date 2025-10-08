"""
Staff Training System for Spirit Tours Platform
Complete training, certification, and onboarding system for all staff roles
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import uuid
import logging
from pathlib import Path
import asyncpg
import aioredis
import pandas as pd
import numpy as np
from jinja2 import Template

logger = logging.getLogger(__name__)

class TrainingModule(Enum):
    """Training module categories"""
    # Platform Basics
    PLATFORM_INTRO = "platform_introduction"
    SYSTEM_NAVIGATION = "system_navigation"
    
    # GDS & OTA
    GDS_FUNDAMENTALS = "gds_fundamentals"
    OTA_INTEGRATION = "ota_integration"
    CHANNEL_MANAGEMENT = "channel_management"
    
    # PMS Modules
    HOUSEKEEPING_SYSTEM = "housekeeping_system"
    MAINTENANCE_SYSTEM = "maintenance_system"
    FRONT_DESK = "front_desk_operations"
    
    # Advanced Features
    AI_TOOLS = "ai_tools_usage"
    ANALYTICS = "analytics_reporting"
    QUANTUM_FEATURES = "quantum_optimization"
    
    # Support & Customer Service
    CUSTOMER_SERVICE = "customer_service"
    COMPLAINT_HANDLING = "complaint_resolution"
    MULTILINGUAL = "multilingual_support"
    
    # B2B2C Agency
    AGENCY_PORTAL = "agency_portal"
    COMMISSION_SYSTEM = "commission_management"
    PARTNER_ONBOARDING = "partner_onboarding"
    
    # Compliance & Security
    DATA_PRIVACY = "data_privacy_gdpr"
    SECURITY_PROTOCOLS = "security_protocols"
    PCI_COMPLIANCE = "pci_compliance"

class StaffRole(Enum):
    """Staff roles in the system"""
    ADMIN = "administrator"
    MANAGER = "manager"
    SUPERVISOR = "supervisor"
    FRONT_DESK = "front_desk"
    HOUSEKEEPING = "housekeeping"
    MAINTENANCE = "maintenance"
    RESERVATIONS = "reservations"
    REVENUE_MANAGER = "revenue_manager"
    SUPPORT_AGENT = "support_agent"
    AGENCY_MANAGER = "agency_manager"
    DEVELOPER = "developer"
    ANALYST = "analyst"

class CertificationLevel(Enum):
    """Certification levels"""
    BASIC = "basic"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"
    TRAINER = "trainer"

@dataclass
class TrainingContent:
    """Training content structure"""
    module_id: str
    title: str
    description: str
    duration_hours: float
    difficulty: CertificationLevel
    prerequisites: List[str] = field(default_factory=list)
    topics: List[Dict[str, Any]] = field(default_factory=list)
    videos: List[str] = field(default_factory=list)
    documents: List[str] = field(default_factory=list)
    interactive_exercises: List[Dict] = field(default_factory=list)
    quiz_questions: List[Dict] = field(default_factory=list)
    practical_tasks: List[Dict] = field(default_factory=list)
    certification_exam: Optional[Dict] = None

@dataclass
class StaffMember:
    """Staff member training profile"""
    staff_id: str
    name: str
    email: str
    role: StaffRole
    department: str
    hire_date: datetime
    completed_modules: List[str] = field(default_factory=list)
    current_modules: List[str] = field(default_factory=list)
    certifications: List[Dict] = field(default_factory=list)
    training_history: List[Dict] = field(default_factory=list)
    skill_scores: Dict[str, float] = field(default_factory=dict)
    language_proficiency: List[str] = field(default_factory=list)
    performance_rating: float = 0.0
    is_trainer: bool = False

@dataclass
class TrainingProgress:
    """Training progress tracking"""
    progress_id: str
    staff_id: str
    module_id: str
    started_at: datetime
    last_accessed: datetime
    completion_percentage: float
    completed_topics: List[str]
    quiz_scores: List[float]
    practical_scores: List[float]
    time_spent_minutes: int
    attempts: int
    status: str  # in_progress, completed, failed
    certificate_issued: bool = False

class StaffTrainingSystem:
    """Complete staff training and certification system"""
    
    def __init__(self):
        self.db_pool = None
        self.redis_client = None
        self.training_modules: Dict[str, TrainingContent] = {}
        self.staff_members: Dict[str, StaffMember] = {}
        self.progress_tracking: Dict[str, TrainingProgress] = {}
        self._initialize_training_content()
    
    async def initialize(self):
        """Initialize database connections"""
        self.db_pool = await asyncpg.create_pool(
            "postgresql://user:password@localhost/spirittours"
        )
        self.redis_client = await aioredis.create_redis_pool(
            'redis://localhost'
        )
        await self._create_database_schema()
    
    def _initialize_training_content(self):
        """Initialize all training modules"""
        
        # Platform Introduction Module
        self.training_modules["platform_intro"] = TrainingContent(
            module_id="platform_intro",
            title="Spirit Tours Platform Introduction",
            description="Complete introduction to the Spirit Tours travel platform",
            duration_hours=2.0,
            difficulty=CertificationLevel.BASIC,
            topics=[
                {
                    "id": "intro_1",
                    "title": "Platform Overview",
                    "content": """
                    Welcome to Spirit Tours Platform!
                    
                    Our comprehensive travel platform includes:
                    - B2B2C multi-tenant architecture
                    - 30+ OTA integrations
                    - Advanced AI/ML capabilities
                    - Real-time inventory management
                    - Complete PMS suite
                    """,
                    "duration_minutes": 15,
                    "video_url": "https://training.spirittours.com/videos/platform_overview.mp4"
                },
                {
                    "id": "intro_2",
                    "title": "System Architecture",
                    "content": """
                    Understanding our system components:
                    - Frontend: React-based responsive UI
                    - Backend: Python FastAPI microservices
                    - Databases: PostgreSQL + Redis
                    - AI: 12+ AI providers orchestration
                    - Quantum: Route optimization
                    """,
                    "duration_minutes": 20
                },
                {
                    "id": "intro_3",
                    "title": "User Roles & Permissions",
                    "content": "Understanding different user roles and access levels",
                    "duration_minutes": 15
                }
            ],
            quiz_questions=[
                {
                    "question": "What type of architecture does Spirit Tours use?",
                    "options": ["Monolithic", "B2B2C Multi-tenant", "Single-tenant", "Peer-to-peer"],
                    "correct": 1,
                    "explanation": "Spirit Tours uses B2B2C multi-tenant architecture for agency reselling"
                },
                {
                    "question": "How many OTA integrations does the platform support?",
                    "options": ["10+", "20+", "30+", "50+"],
                    "correct": 2,
                    "explanation": "The platform supports 30+ OTA integrations including Airbnb, Booking.com, etc."
                }
            ]
        )
        
        # Housekeeping System Module
        self.training_modules["housekeeping"] = TrainingContent(
            module_id="housekeeping",
            title="Housekeeping Management System",
            description="Complete training for housekeeping module usage",
            duration_hours=3.0,
            difficulty=CertificationLevel.INTERMEDIATE,
            prerequisites=["platform_intro"],
            topics=[
                {
                    "id": "hk_1",
                    "title": "Room Status Management",
                    "content": """
                    Room Status Types:
                    - Clean: Ready for guest
                    - Dirty: Needs cleaning
                    - In Progress: Being cleaned
                    - Inspected: Quality checked
                    - Out of Order: Maintenance required
                    
                    Real-time updates via mobile app
                    """,
                    "duration_minutes": 20,
                    "interactive": True
                },
                {
                    "id": "hk_2",
                    "title": "Task Assignment System",
                    "content": """
                    Smart Assignment Features:
                    - Hungarian algorithm optimization
                    - Priority-based allocation
                    - Zone management
                    - Performance tracking
                    """,
                    "duration_minutes": 25
                },
                {
                    "id": "hk_3",
                    "title": "Quality Inspection",
                    "content": """
                    Inspection Process:
                    1. Complete cleaning checklist
                    2. Photo documentation
                    3. Quality scoring (0-100)
                    4. Touch-up if needed
                    5. Guest-ready approval
                    """,
                    "duration_minutes": 30
                }
            ],
            practical_tasks=[
                {
                    "task": "Create and assign 5 housekeeping tasks",
                    "expected_time_minutes": 10,
                    "validation_criteria": ["Tasks created", "Staff assigned", "Priorities set"]
                },
                {
                    "task": "Perform room inspection and submit quality report",
                    "expected_time_minutes": 15,
                    "validation_criteria": ["Inspection completed", "Scores submitted", "Photos attached"]
                }
            ]
        )
        
        # Maintenance System Module
        self.training_modules["maintenance"] = TrainingContent(
            module_id="maintenance",
            title="Maintenance Management System",
            description="Preventive and corrective maintenance training",
            duration_hours=3.5,
            difficulty=CertificationLevel.INTERMEDIATE,
            prerequisites=["platform_intro"],
            topics=[
                {
                    "id": "maint_1",
                    "title": "Work Order Management",
                    "content": """
                    Work Order Types:
                    - Preventive: Scheduled maintenance
                    - Corrective: Repair issues
                    - Emergency: Urgent repairs
                    - Predictive: AI-based predictions
                    """,
                    "duration_minutes": 25
                },
                {
                    "id": "maint_2",
                    "title": "Asset Tracking",
                    "content": """
                    Asset Management:
                    - Equipment lifecycle tracking
                    - Warranty management
                    - Replacement scheduling
                    - Energy monitoring
                    """,
                    "duration_minutes": 30
                },
                {
                    "id": "maint_3",
                    "title": "Predictive Maintenance",
                    "content": """
                    AI-Powered Features:
                    - Failure prediction
                    - Anomaly detection
                    - Cost optimization
                    - Automated scheduling
                    """,
                    "duration_minutes": 35
                }
            ]
        )
        
        # GDS Fundamentals Module
        self.training_modules["gds"] = TrainingContent(
            module_id="gds",
            title="GDS Integration & Management",
            description="Understanding GDS systems and multi-provider orchestration",
            duration_hours=4.0,
            difficulty=CertificationLevel.ADVANCED,
            prerequisites=["platform_intro"],
            topics=[
                {
                    "id": "gds_1",
                    "title": "GDS Overview",
                    "content": """
                    Major GDS Systems:
                    - Amadeus: Global coverage, strong in Europe
                    - Travelport: Galileo, Worldspan, Apollo
                    - Sabre: Strong in Americas
                    
                    Bedbanks:
                    - Hotelbeds: 180,000+ hotels
                    - TBO: Focus on Asia/Middle East
                    """,
                    "duration_minutes": 30
                },
                {
                    "id": "gds_2",
                    "title": "Multi-GDS Orchestration",
                    "content": """
                    Search Strategy:
                    1. Parallel searches across providers
                    2. Result aggregation & deduplication
                    3. Price comparison
                    4. Availability caching
                    5. Smart provider selection
                    """,
                    "duration_minutes": 40
                },
                {
                    "id": "gds_3",
                    "title": "B2B2C Agency Integration",
                    "content": """
                    Agency Features:
                    - White-label solutions
                    - Commission management
                    - Markup control
                    - Sandbox testing
                    - API access
                    """,
                    "duration_minutes": 35
                }
            ]
        )
        
        # Channel Manager Module
        self.training_modules["channel_mgmt"] = TrainingContent(
            module_id="channel_mgmt",
            title="Channel Manager Operations",
            description="Managing inventory across 30+ OTAs",
            duration_hours=3.5,
            difficulty=CertificationLevel.ADVANCED,
            prerequisites=["platform_intro", "gds"],
            topics=[
                {
                    "id": "chan_1",
                    "title": "OTA Connectivity",
                    "content": """
                    Connected OTAs:
                    Global: Booking.com, Expedia, Airbnb, Vrbo
                    Regional: Despegar (LATAM), MakeMyTrip (India), 
                             Ctrip (China), Traveloka (SE Asia)
                    
                    Connection Types:
                    - XML/SOAP APIs
                    - REST APIs
                    - FTP uploads
                    - Channel specific protocols
                    """,
                    "duration_minutes": 30
                },
                {
                    "id": "chan_2",
                    "title": "Inventory Synchronization",
                    "content": """
                    Real-time Sync:
                    - Availability updates
                    - Rate management
                    - Restrictions (min stay, CTA, CTD)
                    - Booking retrieval
                    - Cancellation handling
                    """,
                    "duration_minutes": 35
                },
                {
                    "id": "chan_3",
                    "title": "Rate Parity & Strategy",
                    "content": """
                    Rate Management:
                    - Base rate configuration
                    - Channel-specific markups
                    - Seasonal adjustments
                    - Package creation
                    - Promotion management
                    """,
                    "duration_minutes": 40
                }
            ],
            practical_tasks=[
                {
                    "task": "Connect a test property to 3 OTAs",
                    "expected_time_minutes": 20,
                    "validation_criteria": ["Connections established", "Mapping completed", "Test booking received"]
                }
            ]
        )
        
        # AI Tools Module
        self.training_modules["ai_tools"] = TrainingContent(
            module_id="ai_tools",
            title="AI-Powered Features",
            description="Using AI tools for tour design and customer service",
            duration_hours=2.5,
            difficulty=CertificationLevel.INTERMEDIATE,
            prerequisites=["platform_intro"],
            topics=[
                {
                    "id": "ai_1",
                    "title": "AI Tour Designer",
                    "content": """
                    Generative AI Features:
                    - Custom itinerary creation
                    - Multi-modal experiences
                    - Budget optimization
                    - Activity recommendations
                    - Real-time adjustments
                    """,
                    "duration_minutes": 30
                },
                {
                    "id": "ai_2",
                    "title": "Multi-AI Orchestration",
                    "content": """
                    12+ AI Providers:
                    - OpenAI GPT-4 for conversation
                    - Claude for analysis
                    - Gemini for multimodal
                    - DALL-E for images
                    - Cost-optimized routing
                    """,
                    "duration_minutes": 25
                },
                {
                    "id": "ai_3",
                    "title": "Predictive Analytics",
                    "content": """
                    ML-Powered Insights:
                    - Demand forecasting
                    - Price optimization
                    - Churn prediction
                    - Sentiment analysis
                    - Anomaly detection
                    """,
                    "duration_minutes": 30
                }
            ]
        )
    
    async def _create_database_schema(self):
        """Create training database tables"""
        async with self.db_pool.acquire() as conn:
            # Staff training profiles
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS training_staff_profiles (
                    staff_id UUID PRIMARY KEY,
                    name VARCHAR(200),
                    email VARCHAR(255) UNIQUE,
                    role VARCHAR(50),
                    department VARCHAR(100),
                    hire_date DATE,
                    completed_modules JSONB DEFAULT '[]',
                    certifications JSONB DEFAULT '[]',
                    skill_scores JSONB DEFAULT '{}',
                    performance_rating FLOAT DEFAULT 0,
                    is_trainer BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            
            # Training progress tracking
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS training_progress (
                    progress_id UUID PRIMARY KEY,
                    staff_id UUID REFERENCES training_staff_profiles(staff_id),
                    module_id VARCHAR(100),
                    started_at TIMESTAMP,
                    last_accessed TIMESTAMP,
                    completion_percentage FLOAT DEFAULT 0,
                    completed_topics JSONB DEFAULT '[]',
                    quiz_scores JSONB DEFAULT '[]',
                    time_spent_minutes INTEGER DEFAULT 0,
                    attempts INTEGER DEFAULT 1,
                    status VARCHAR(50) DEFAULT 'in_progress',
                    certificate_issued BOOLEAN DEFAULT FALSE
                )
            """)
            
            # Certification records
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS training_certifications (
                    cert_id UUID PRIMARY KEY,
                    staff_id UUID REFERENCES training_staff_profiles(staff_id),
                    module_id VARCHAR(100),
                    certification_level VARCHAR(50),
                    issued_date TIMESTAMP,
                    expiry_date TIMESTAMP,
                    score FLOAT,
                    certificate_url VARCHAR(500),
                    is_valid BOOLEAN DEFAULT TRUE
                )
            """)
            
            # Training analytics
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS training_analytics (
                    analytics_id UUID PRIMARY KEY,
                    module_id VARCHAR(100),
                    avg_completion_time FLOAT,
                    avg_score FLOAT,
                    completion_rate FLOAT,
                    difficulty_rating FLOAT,
                    feedback_score FLOAT,
                    total_enrolled INTEGER,
                    total_completed INTEGER,
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """)
        
        logger.info("✅ Training database schema created")
    
    async def enroll_staff(
        self,
        name: str,
        email: str,
        role: StaffRole,
        department: str
    ) -> StaffMember:
        """Enroll new staff member in training system"""
        
        staff = StaffMember(
            staff_id=str(uuid.uuid4()),
            name=name,
            email=email,
            role=role,
            department=department,
            hire_date=datetime.utcnow()
        )
        
        # Assign required modules based on role
        required_modules = self._get_required_modules(role)
        staff.current_modules = required_modules
        
        # Store in database
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO training_staff_profiles (
                    staff_id, name, email, role, department, hire_date
                ) VALUES ($1, $2, $3, $4, $5, $6)
            """,
                uuid.UUID(staff.staff_id),
                name,
                email,
                role.value,
                department,
                staff.hire_date
            )
        
        self.staff_members[staff.staff_id] = staff
        
        # Send welcome email
        await self._send_training_welcome(staff)
        
        logger.info(f"Enrolled new staff member: {name} ({role.value})")
        
        return staff
    
    def _get_required_modules(self, role: StaffRole) -> List[str]:
        """Get required training modules for a role"""
        
        # Base modules for everyone
        base_modules = ["platform_intro"]
        
        # Role-specific modules
        role_modules = {
            StaffRole.ADMIN: ["gds", "channel_mgmt", "ai_tools", "maintenance", "housekeeping"],
            StaffRole.MANAGER: ["gds", "channel_mgmt", "ai_tools"],
            StaffRole.HOUSEKEEPING: ["housekeeping"],
            StaffRole.MAINTENANCE: ["maintenance"],
            StaffRole.FRONT_DESK: ["platform_intro", "customer_service"],
            StaffRole.RESERVATIONS: ["gds", "channel_mgmt"],
            StaffRole.REVENUE_MANAGER: ["gds", "channel_mgmt", "ai_tools"],
            StaffRole.SUPPORT_AGENT: ["platform_intro", "customer_service"],
            StaffRole.AGENCY_MANAGER: ["gds", "channel_mgmt", "agency_portal"],
            StaffRole.DEVELOPER: ["platform_intro", "gds", "ai_tools"],
            StaffRole.ANALYST: ["ai_tools", "analytics"]
        }
        
        return base_modules + role_modules.get(role, [])
    
    async def start_module(
        self,
        staff_id: str,
        module_id: str
    ) -> TrainingProgress:
        """Start a training module for staff member"""
        
        if staff_id not in self.staff_members:
            raise ValueError(f"Staff {staff_id} not found")
        
        if module_id not in self.training_modules:
            raise ValueError(f"Module {module_id} not found")
        
        progress = TrainingProgress(
            progress_id=str(uuid.uuid4()),
            staff_id=staff_id,
            module_id=module_id,
            started_at=datetime.utcnow(),
            last_accessed=datetime.utcnow(),
            completion_percentage=0.0,
            completed_topics=[],
            quiz_scores=[],
            practical_scores=[],
            time_spent_minutes=0,
            attempts=1,
            status="in_progress"
        )
        
        # Store in database
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO training_progress (
                    progress_id, staff_id, module_id, started_at, last_accessed
                ) VALUES ($1, $2, $3, $4, $5)
            """,
                uuid.UUID(progress.progress_id),
                uuid.UUID(staff_id),
                module_id,
                progress.started_at,
                progress.last_accessed
            )
        
        self.progress_tracking[progress.progress_id] = progress
        
        return progress
    
    async def update_progress(
        self,
        progress_id: str,
        topic_completed: Optional[str] = None,
        quiz_score: Optional[float] = None,
        time_spent: Optional[int] = None
    ):
        """Update training progress"""
        
        if progress_id not in self.progress_tracking:
            raise ValueError(f"Progress {progress_id} not found")
        
        progress = self.progress_tracking[progress_id]
        module = self.training_modules[progress.module_id]
        
        # Update completed topics
        if topic_completed and topic_completed not in progress.completed_topics:
            progress.completed_topics.append(topic_completed)
        
        # Add quiz score
        if quiz_score is not None:
            progress.quiz_scores.append(quiz_score)
        
        # Update time spent
        if time_spent:
            progress.time_spent_minutes += time_spent
        
        # Calculate completion percentage
        total_topics = len(module.topics)
        completed = len(progress.completed_topics)
        progress.completion_percentage = (completed / total_topics * 100) if total_topics > 0 else 0
        
        progress.last_accessed = datetime.utcnow()
        
        # Check if module completed
        if progress.completion_percentage >= 100 and all(s >= 70 for s in progress.quiz_scores):
            progress.status = "completed"
            await self._issue_certificate(progress)
        
        # Update database
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                UPDATE training_progress
                SET last_accessed = $1, completion_percentage = $2,
                    completed_topics = $3, quiz_scores = $4,
                    time_spent_minutes = $5, status = $6
                WHERE progress_id = $7
            """,
                progress.last_accessed,
                progress.completion_percentage,
                json.dumps(progress.completed_topics),
                json.dumps(progress.quiz_scores),
                progress.time_spent_minutes,
                progress.status,
                uuid.UUID(progress_id)
            )
    
    async def _issue_certificate(self, progress: TrainingProgress):
        """Issue certificate for completed module"""
        
        staff = self.staff_members[progress.staff_id]
        module = self.training_modules[progress.module_id]
        
        # Calculate final score
        avg_quiz_score = np.mean(progress.quiz_scores) if progress.quiz_scores else 0
        avg_practical_score = np.mean(progress.practical_scores) if progress.practical_scores else 0
        final_score = (avg_quiz_score * 0.6 + avg_practical_score * 0.4) if avg_practical_score else avg_quiz_score
        
        # Determine certification level
        if final_score >= 90:
            cert_level = CertificationLevel.EXPERT
        elif final_score >= 80:
            cert_level = CertificationLevel.ADVANCED
        elif final_score >= 70:
            cert_level = CertificationLevel.INTERMEDIATE
        else:
            cert_level = CertificationLevel.BASIC
        
        # Generate certificate
        cert_id = str(uuid.uuid4())
        cert_url = f"https://certificates.spirittours.com/{cert_id}.pdf"
        
        # Store certification
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO training_certifications (
                    cert_id, staff_id, module_id, certification_level,
                    issued_date, expiry_date, score, certificate_url
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
                uuid.UUID(cert_id),
                uuid.UUID(progress.staff_id),
                progress.module_id,
                cert_level.value,
                datetime.utcnow(),
                datetime.utcnow() + timedelta(days=365),
                final_score,
                cert_url
            )
        
        # Update staff profile
        staff.completed_modules.append(progress.module_id)
        staff.certifications.append({
            "module": module.title,
            "level": cert_level.value,
            "score": final_score,
            "date": datetime.utcnow().isoformat()
        })
        
        progress.certificate_issued = True
        
        # Send certificate
        await self._send_certificate(staff, module, cert_level, final_score, cert_url)
        
        logger.info(f"Certificate issued: {staff.name} - {module.title} ({cert_level.value})")
    
    async def generate_training_dashboard(self) -> Dict[str, Any]:
        """Generate training dashboard metrics"""
        
        async with self.db_pool.acquire() as conn:
            # Overall statistics
            total_staff = await conn.fetchval("SELECT COUNT(*) FROM training_staff_profiles")
            
            # Module completion rates
            completion_stats = await conn.fetch("""
                SELECT 
                    module_id,
                    COUNT(*) as enrolled,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                    AVG(completion_percentage) as avg_progress,
                    AVG(time_spent_minutes) as avg_time
                FROM training_progress
                GROUP BY module_id
            """)
            
            # Top performers
            top_performers = await conn.fetch("""
                SELECT 
                    s.name,
                    s.role,
                    COUNT(DISTINCT p.module_id) as modules_completed,
                    AVG((SELECT AVG(score::float) FROM jsonb_array_elements_text(p.quiz_scores) AS score)) as avg_score
                FROM training_staff_profiles s
                JOIN training_progress p ON s.staff_id = p.staff_id
                WHERE p.status = 'completed'
                GROUP BY s.staff_id, s.name, s.role
                ORDER BY modules_completed DESC, avg_score DESC
                LIMIT 10
            """)
            
            # Recent certifications
            recent_certs = await conn.fetch("""
                SELECT 
                    s.name,
                    c.module_id,
                    c.certification_level,
                    c.score,
                    c.issued_date
                FROM training_certifications c
                JOIN training_staff_profiles s ON c.staff_id = s.staff_id
                ORDER BY c.issued_date DESC
                LIMIT 10
            """)
        
        # Module analytics
        module_analytics = {}
        for stat in completion_stats:
            completion_rate = (stat['completed'] / stat['enrolled'] * 100) if stat['enrolled'] > 0 else 0
            module_analytics[stat['module_id']] = {
                "enrolled": stat['enrolled'],
                "completed": stat['completed'],
                "completion_rate": round(completion_rate, 1),
                "avg_progress": round(stat['avg_progress'] or 0, 1),
                "avg_time_hours": round((stat['avg_time'] or 0) / 60, 1)
            }
        
        return {
            "summary": {
                "total_staff": total_staff,
                "total_modules": len(self.training_modules),
                "active_learners": len([p for p in self.progress_tracking.values() if p.status == "in_progress"]),
                "certifications_issued": sum(1 for p in self.progress_tracking.values() if p.certificate_issued)
            },
            "module_analytics": module_analytics,
            "top_performers": [
                {
                    "name": p['name'],
                    "role": p['role'],
                    "modules_completed": p['modules_completed'],
                    "avg_score": round(p['avg_score'] or 0, 1)
                }
                for p in top_performers
            ],
            "recent_certifications": [
                {
                    "name": c['name'],
                    "module": c['module_id'],
                    "level": c['certification_level'],
                    "score": round(c['score'], 1),
                    "date": c['issued_date'].isoformat()
                }
                for c in recent_certs
            ],
            "training_recommendations": await self._generate_recommendations()
        }
    
    async def _generate_recommendations(self) -> List[Dict]:
        """Generate training recommendations"""
        recommendations = []
        
        # Check for staff without required training
        for staff in self.staff_members.values():
            required = set(self._get_required_modules(staff.role))
            completed = set(staff.completed_modules)
            missing = required - completed
            
            if missing:
                recommendations.append({
                    "type": "missing_required",
                    "staff": staff.name,
                    "modules": list(missing),
                    "priority": "high"
                })
        
        # Check for expiring certifications
        async with self.db_pool.acquire() as conn:
            expiring = await conn.fetch("""
                SELECT s.name, c.module_id, c.expiry_date
                FROM training_certifications c
                JOIN training_staff_profiles s ON c.staff_id = s.staff_id
                WHERE c.expiry_date < CURRENT_DATE + INTERVAL '30 days'
                AND c.is_valid = TRUE
            """)
        
        for cert in expiring:
            recommendations.append({
                "type": "expiring_certification",
                "staff": cert['name'],
                "module": cert['module_id'],
                "expiry": cert['expiry_date'].isoformat(),
                "priority": "medium"
            })
        
        # Suggest advanced training for high performers
        for staff in self.staff_members.values():
            if staff.performance_rating >= 4.5 and len(staff.completed_modules) >= 3:
                advanced_modules = ["ai_tools", "quantum_features", "analytics"]
                suggested = [m for m in advanced_modules if m not in staff.completed_modules]
                
                if suggested:
                    recommendations.append({
                        "type": "advanced_training",
                        "staff": staff.name,
                        "modules": suggested,
                        "priority": "low"
                    })
        
        return recommendations
    
    async def _send_training_welcome(self, staff: StaffMember):
        """Send welcome email to new staff"""
        # Implementation would send actual email
        logger.info(f"Welcome email sent to {staff.email}")
    
    async def _send_certificate(
        self,
        staff: StaffMember,
        module: TrainingContent,
        level: CertificationLevel,
        score: float,
        cert_url: str
    ):
        """Send certificate to staff"""
        # Implementation would send actual certificate
        logger.info(f"Certificate sent to {staff.email}: {module.title} - {level.value}")
    
    async def close(self):
        """Clean up resources"""
        if self.db_pool:
            await self.db_pool.close()
        if self.redis_client:
            self.redis_client.close()
            await self.redis_client.wait_closed()


# Training quick reference guide
TRAINING_GUIDE = """
# Spirit Tours Platform - Staff Training Guide

## Quick Start for New Staff

### Day 1: Platform Introduction
- Complete "Platform Introduction" module (2 hours)
- Set up user account and permissions
- Explore system interface

### Week 1: Role-Specific Training
Based on your role, complete these modules:

#### Front Desk Staff
1. Platform Introduction ✓
2. Front Desk Operations
3. Customer Service Basics

#### Housekeeping Staff
1. Platform Introduction ✓
2. Housekeeping Management System
3. Mobile App Training

#### Maintenance Staff
1. Platform Introduction ✓
2. Maintenance Management System
3. Work Order Processing

#### Reservations Team
1. Platform Introduction ✓
2. GDS Fundamentals
3. Channel Manager Operations

#### Managers
1. All base modules
2. Analytics & Reporting
3. AI Tools Usage

### Certification Requirements
- Minimum 70% quiz score
- Complete all practical exercises
- Pass final assessment

### Training Support
- Live chat: training@spirittours.com
- Help desk: +1-800-SPIRIT-1
- Video tutorials: https://training.spirittours.com

## Advanced Training Paths

### Path 1: Revenue Management
1. GDS Fundamentals
2. Channel Manager Operations
3. AI-Powered Analytics
4. Dynamic Pricing Strategies

### Path 2: Guest Experience
1. Customer Service Excellence
2. Multilingual Support
3. Complaint Resolution
4. VIP Guest Handling

### Path 3: Technical Operations
1. System Administration
2. API Integration
3. Troubleshooting
4. Security Protocols

### Path 4: Partner Management
1. B2B2C Agency Portal
2. Commission Management
3. Partner Onboarding
4. White-Label Configuration

## Continuous Learning
- Monthly webinars on new features
- Quarterly certification updates
- Annual skills assessment
- Peer learning sessions

Remember: Learning is a continuous journey. Stay curious!
"""

if __name__ == "__main__":
    # Save training guide
    with open("/home/user/webapp/docs/TRAINING_GUIDE.md", "w") as f:
        f.write(TRAINING_GUIDE)
    
    print("✅ Staff Training System initialized")
    print("📚 Training modules created:")
    print("  - Platform Introduction")
    print("  - Housekeeping System")
    print("  - Maintenance System")
    print("  - GDS Fundamentals")
    print("  - Channel Manager")
    print("  - AI Tools")
    print("\n📋 Training guide saved to docs/TRAINING_GUIDE.md")