"""
Advanced PMS Housekeeping Module
Complete housekeeping management system for Spirit Tours Platform
Handles room cleaning, staff assignments, schedules, and quality control
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum
import uuid
import hashlib
from dataclasses import dataclass, field
import numpy as np
from collections import defaultdict
import logging
import aioredis
import asyncpg
from scipy.optimize import linear_sum_assignment
import pandas as pd

logger = logging.getLogger(__name__)

class RoomStatus(Enum):
    """Room cleaning status definitions"""
    CLEAN = "clean"
    DIRTY = "dirty"
    IN_PROGRESS = "in_progress"
    INSPECTED = "inspected"
    OUT_OF_ORDER = "out_of_order"
    DEEP_CLEANING = "deep_cleaning"
    WAITING_INSPECTION = "waiting_inspection"
    TOUCH_UP = "touch_up"

class CleaningPriority(Enum):
    """Cleaning priority levels"""
    URGENT = "urgent"  # Check-in within 2 hours
    HIGH = "high"      # Check-in today
    MEDIUM = "medium"  # Check-in tomorrow
    LOW = "low"        # Stay-over or vacant
    SCHEDULED = "scheduled"  # Deep cleaning scheduled

class StaffRole(Enum):
    """Housekeeping staff roles"""
    HOUSEKEEPER = "housekeeper"
    SUPERVISOR = "supervisor"
    INSPECTOR = "inspector"
    LAUNDRY = "laundry"
    PUBLIC_AREA = "public_area"
    MANAGER = "manager"
    TRAINEE = "trainee"

class TaskType(Enum):
    """Types of housekeeping tasks"""
    CHECKOUT_CLEANING = "checkout_cleaning"
    STAYOVER_CLEANING = "stayover_cleaning"
    DEEP_CLEANING = "deep_cleaning"
    LINEN_CHANGE = "linen_change"
    MINIBAR_RESTOCK = "minibar_restock"
    AMENITY_REPLENISH = "amenity_replenish"
    INSPECTION = "inspection"
    TOUCH_UP = "touch_up"
    PUBLIC_AREA = "public_area"
    SPECIAL_REQUEST = "special_request"

@dataclass
class HousekeepingStaff:
    """Housekeeping staff member"""
    staff_id: str
    name: str
    role: StaffRole
    shift_start: datetime
    shift_end: datetime
    skills: List[str]
    languages: List[str]
    zones: List[str]  # Assigned floor/zones
    current_tasks: List[str] = field(default_factory=list)
    completed_tasks: List[str] = field(default_factory=list)
    performance_score: float = 1.0
    is_available: bool = True
    break_times: List[Tuple[datetime, datetime]] = field(default_factory=list)
    specializations: List[str] = field(default_factory=list)  # VIP, suite, etc.

@dataclass
class CleaningTask:
    """Individual cleaning task"""
    task_id: str
    room_number: str
    task_type: TaskType
    priority: CleaningPriority
    estimated_duration: int  # minutes
    assigned_to: Optional[str] = None
    status: str = "pending"
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    inspected_at: Optional[datetime] = None
    inspector_id: Optional[str] = None
    checklist_items: List[Dict] = field(default_factory=list)
    special_instructions: Optional[str] = None
    guest_preferences: List[str] = field(default_factory=list)
    supplies_needed: List[str] = field(default_factory=list)
    photos: List[str] = field(default_factory=list)
    quality_score: Optional[float] = None
    guest_arrival_time: Optional[datetime] = None

@dataclass
class RoomCleaningStandard:
    """Cleaning standards and checklists"""
    room_type: str
    cleaning_time: int  # Standard minutes
    checklist: List[Dict[str, Any]]
    supplies_required: List[str]
    inspection_points: List[str]
    deep_clean_frequency: int  # days
    quality_threshold: float  # minimum score

class HousekeepingModule:
    """Complete housekeeping management system"""
    
    def __init__(self):
        self.db_pool = None
        self.redis_client = None
        self.staff_members: Dict[str, HousekeepingStaff] = {}
        self.active_tasks: Dict[str, CleaningTask] = {}
        self.room_standards: Dict[str, RoomCleaningStandard] = {}
        self.initialize_standards()
        
    async def initialize(self):
        """Initialize database connections"""
        self.db_pool = await asyncpg.create_pool(
            "postgresql://user:password@localhost/spirittours_pms"
        )
        self.redis_client = await aioredis.create_redis_pool(
            'redis://localhost'
        )
        await self.create_database_schema()
    
    def initialize_standards(self):
        """Initialize room cleaning standards"""
        self.room_standards = {
            "standard": RoomCleaningStandard(
                room_type="standard",
                cleaning_time=30,
                checklist=[
                    {"item": "Strip and remake bed", "time": 5, "required": True},
                    {"item": "Clean bathroom", "time": 8, "required": True},
                    {"item": "Dust surfaces", "time": 5, "required": True},
                    {"item": "Vacuum floor", "time": 4, "required": True},
                    {"item": "Empty trash", "time": 2, "required": True},
                    {"item": "Restock amenities", "time": 3, "required": True},
                    {"item": "Clean windows", "time": 3, "required": False}
                ],
                supplies_required=["cleaning_cart", "linens", "amenities", "cleaning_chemicals"],
                inspection_points=["bed_quality", "bathroom_cleanliness", "dust_free", "floor_clean", "amenities_stocked"],
                deep_clean_frequency=30,
                quality_threshold=0.85
            ),
            "suite": RoomCleaningStandard(
                room_type="suite",
                cleaning_time=45,
                checklist=[
                    {"item": "Strip and remake beds", "time": 8, "required": True},
                    {"item": "Clean multiple bathrooms", "time": 12, "required": True},
                    {"item": "Dust all surfaces", "time": 7, "required": True},
                    {"item": "Vacuum all areas", "time": 6, "required": True},
                    {"item": "Clean kitchenette", "time": 5, "required": True},
                    {"item": "Restock minibar", "time": 4, "required": True},
                    {"item": "Arrange furniture", "time": 3, "required": True}
                ],
                supplies_required=["deluxe_cart", "premium_linens", "luxury_amenities", "minibar_items"],
                inspection_points=["bed_presentation", "bathroom_luxury", "kitchen_clean", "living_area", "minibar_stocked"],
                deep_clean_frequency=21,
                quality_threshold=0.92
            ),
            "vip": RoomCleaningStandard(
                room_type="vip",
                cleaning_time=60,
                checklist=[
                    {"item": "Premium bed service", "time": 10, "required": True},
                    {"item": "Deep clean all bathrooms", "time": 15, "required": True},
                    {"item": "Detail dust and polish", "time": 10, "required": True},
                    {"item": "Deep vacuum and spot clean", "time": 8, "required": True},
                    {"item": "Full kitchen service", "time": 7, "required": True},
                    {"item": "Premium amenity setup", "time": 5, "required": True},
                    {"item": "Fresh flowers arrangement", "time": 5, "required": True}
                ],
                supplies_required=["vip_cart", "egyptian_linens", "designer_amenities", "fresh_flowers", "champagne"],
                inspection_points=["perfect_presentation", "spotless_bathroom", "luxury_touches", "personalization", "ambiance"],
                deep_clean_frequency=14,
                quality_threshold=0.98
            )
        }
    
    async def create_database_schema(self):
        """Create database tables for housekeeping"""
        async with self.db_pool.acquire() as conn:
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS housekeeping_tasks (
                    task_id UUID PRIMARY KEY,
                    room_number VARCHAR(20),
                    task_type VARCHAR(50),
                    priority VARCHAR(20),
                    status VARCHAR(30),
                    assigned_to UUID,
                    created_at TIMESTAMP,
                    started_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    inspected_at TIMESTAMP,
                    inspector_id UUID,
                    quality_score FLOAT,
                    special_instructions TEXT,
                    guest_preferences JSONB,
                    checklist_completion JSONB,
                    photos TEXT[],
                    supplies_used JSONB
                )
            ''')
            
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS housekeeping_staff (
                    staff_id UUID PRIMARY KEY,
                    name VARCHAR(100),
                    role VARCHAR(30),
                    email VARCHAR(100),
                    phone VARCHAR(20),
                    skills JSONB,
                    languages TEXT[],
                    zones TEXT[],
                    performance_metrics JSONB,
                    schedule JSONB,
                    created_at TIMESTAMP,
                    last_active TIMESTAMP
                )
            ''')
            
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS room_status_log (
                    log_id UUID PRIMARY KEY,
                    room_number VARCHAR(20),
                    status VARCHAR(30),
                    previous_status VARCHAR(30),
                    changed_by UUID,
                    timestamp TIMESTAMP,
                    notes TEXT
                )
            ''')
            
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS cleaning_quality_scores (
                    score_id UUID PRIMARY KEY,
                    task_id UUID,
                    room_number VARCHAR(20),
                    inspector_id UUID,
                    inspection_date TIMESTAMP,
                    overall_score FLOAT,
                    category_scores JSONB,
                    issues_found JSONB,
                    photos TEXT[],
                    guest_feedback JSONB
                )
            ''')
    
    async def assign_tasks_optimally(self, tasks: List[CleaningTask]) -> Dict[str, List[CleaningTask]]:
        """Optimally assign tasks to staff using Hungarian algorithm"""
        available_staff = [s for s in self.staff_members.values() if s.is_available]
        
        if not available_staff or not tasks:
            return {}
        
        # Create cost matrix
        cost_matrix = np.zeros((len(tasks), len(available_staff)))
        
        for i, task in enumerate(tasks):
            for j, staff in enumerate(available_staff):
                cost = self.calculate_assignment_cost(task, staff)
                cost_matrix[i, j] = cost
        
        # Solve assignment problem
        row_indices, col_indices = linear_sum_assignment(cost_matrix)
        
        assignments = defaultdict(list)
        for i, j in zip(row_indices, col_indices):
            if i < len(tasks) and j < len(available_staff):
                task = tasks[i]
                staff = available_staff[j]
                task.assigned_to = staff.staff_id
                assignments[staff.staff_id].append(task)
                staff.current_tasks.append(task.task_id)
        
        return dict(assignments)
    
    def calculate_assignment_cost(self, task: CleaningTask, staff: HousekeepingStaff) -> float:
        """Calculate cost of assigning a task to a staff member"""
        cost = 0.0
        
        # Zone proximity (staff on same floor preferred)
        room_floor = task.room_number[0] if task.room_number else "1"
        if room_floor not in staff.zones:
            cost += 10
        
        # Current workload
        cost += len(staff.current_tasks) * 5
        
        # Performance score (inverse - better performers get lower cost)
        cost += (2.0 - staff.performance_score) * 20
        
        # Task type expertise
        if task.task_type == TaskType.VIP and "vip" in staff.specializations:
            cost -= 15
        elif task.task_type == TaskType.DEEP_CLEANING and "deep_clean" in staff.skills:
            cost -= 10
        
        # Priority handling
        if task.priority == CleaningPriority.URGENT:
            if staff.role in [StaffRole.SUPERVISOR, StaffRole.MANAGER]:
                cost -= 20
            cost -= (1.0 / (len(staff.current_tasks) + 1)) * 10
        
        return max(0, cost)
    
    async def create_cleaning_task(
        self,
        room_number: str,
        task_type: TaskType,
        priority: Optional[CleaningPriority] = None,
        special_instructions: Optional[str] = None,
        guest_arrival: Optional[datetime] = None
    ) -> CleaningTask:
        """Create a new cleaning task"""
        task = CleaningTask(
            task_id=str(uuid.uuid4()),
            room_number=room_number,
            task_type=task_type,
            priority=priority or self.determine_priority(guest_arrival),
            estimated_duration=self.estimate_duration(room_number, task_type),
            special_instructions=special_instructions,
            guest_arrival_time=guest_arrival
        )
        
        # Add standard checklist
        room_type = await self.get_room_type(room_number)
        if room_type in self.room_standards:
            task.checklist_items = self.room_standards[room_type].checklist
            task.supplies_needed = self.room_standards[room_type].supplies_required
        
        self.active_tasks[task.task_id] = task
        
        # Store in database
        await self.store_task_in_db(task)
        
        # Auto-assign if urgent
        if task.priority == CleaningPriority.URGENT:
            await self.assign_urgent_task(task)
        
        return task
    
    def determine_priority(self, guest_arrival: Optional[datetime]) -> CleaningPriority:
        """Determine cleaning priority based on guest arrival"""
        if not guest_arrival:
            return CleaningPriority.MEDIUM
        
        time_until_arrival = (guest_arrival - datetime.utcnow()).total_seconds() / 3600
        
        if time_until_arrival <= 2:
            return CleaningPriority.URGENT
        elif time_until_arrival <= 6:
            return CleaningPriority.HIGH
        elif time_until_arrival <= 24:
            return CleaningPriority.MEDIUM
        else:
            return CleaningPriority.LOW
    
    def estimate_duration(self, room_number: str, task_type: TaskType) -> int:
        """Estimate task duration in minutes"""
        base_times = {
            TaskType.CHECKOUT_CLEANING: 35,
            TaskType.STAYOVER_CLEANING: 20,
            TaskType.DEEP_CLEANING: 90,
            TaskType.LINEN_CHANGE: 10,
            TaskType.MINIBAR_RESTOCK: 5,
            TaskType.AMENITY_REPLENISH: 5,
            TaskType.INSPECTION: 10,
            TaskType.TOUCH_UP: 15,
            TaskType.PUBLIC_AREA: 30,
            TaskType.SPECIAL_REQUEST: 20
        }
        return base_times.get(task_type, 30)
    
    async def get_room_type(self, room_number: str) -> str:
        """Get room type from room number"""
        # Implementation would query PMS database
        # For now, simple logic based on room number
        if room_number.startswith("P"):
            return "vip"
        elif room_number.startswith("S"):
            return "suite"
        else:
            return "standard"
    
    async def store_task_in_db(self, task: CleaningTask):
        """Store task in database"""
        async with self.db_pool.acquire() as conn:
            await conn.execute('''
                INSERT INTO housekeeping_tasks (
                    task_id, room_number, task_type, priority, status,
                    created_at, special_instructions, guest_preferences
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ''', 
                uuid.UUID(task.task_id),
                task.room_number,
                task.task_type.value,
                task.priority.value,
                task.status,
                task.created_at,
                task.special_instructions,
                json.dumps(task.guest_preferences)
            )
    
    async def assign_urgent_task(self, task: CleaningTask):
        """Assign urgent task to nearest available staff"""
        available_staff = [
            s for s in self.staff_members.values()
            if s.is_available and len(s.current_tasks) < 3
        ]
        
        if not available_staff:
            # Alert supervisor
            await self.alert_supervisor(f"No staff available for urgent task {task.task_id}")
            return
        
        # Find best match
        best_staff = min(
            available_staff,
            key=lambda s: self.calculate_assignment_cost(task, s)
        )
        
        task.assigned_to = best_staff.staff_id
        best_staff.current_tasks.append(task.task_id)
        
        # Send notification
        await self.notify_staff_assignment(best_staff, task)
    
    async def start_task(self, task_id: str, staff_id: str):
        """Mark task as started"""
        if task_id not in self.active_tasks:
            raise ValueError(f"Task {task_id} not found")
        
        task = self.active_tasks[task_id]
        task.status = "in_progress"
        task.started_at = datetime.utcnow()
        task.assigned_to = staff_id
        
        # Update room status
        await self.update_room_status(task.room_number, RoomStatus.IN_PROGRESS)
        
        # Log in database
        async with self.db_pool.acquire() as conn:
            await conn.execute('''
                UPDATE housekeeping_tasks
                SET status = $1, started_at = $2, assigned_to = $3
                WHERE task_id = $4
            ''', "in_progress", task.started_at, uuid.UUID(staff_id), uuid.UUID(task_id))
    
    async def complete_task(
        self,
        task_id: str,
        staff_id: str,
        checklist_completion: Dict[str, bool],
        photos: Optional[List[str]] = None
    ):
        """Mark task as completed"""
        if task_id not in self.active_tasks:
            raise ValueError(f"Task {task_id} not found")
        
        task = self.active_tasks[task_id]
        task.status = "completed"
        task.completed_at = datetime.utcnow()
        
        # Calculate completion time
        if task.started_at:
            actual_duration = (task.completed_at - task.started_at).total_seconds() / 60
            # Update staff performance metrics
            await self.update_staff_performance(staff_id, task, actual_duration)
        
        # Store checklist and photos
        async with self.db_pool.acquire() as conn:
            await conn.execute('''
                UPDATE housekeeping_tasks
                SET status = $1, completed_at = $2, checklist_completion = $3, photos = $4
                WHERE task_id = $5
            ''', 
                "completed",
                task.completed_at,
                json.dumps(checklist_completion),
                photos or [],
                uuid.UUID(task_id)
            )
        
        # Update room status
        await self.update_room_status(task.room_number, RoomStatus.WAITING_INSPECTION)
        
        # Schedule inspection
        await self.schedule_inspection(task)
    
    async def update_room_status(self, room_number: str, status: RoomStatus):
        """Update room cleaning status"""
        # Update in Redis for real-time access
        await self.redis_client.hset(
            "room_status",
            room_number,
            status.value
        )
        
        # Log change in database
        async with self.db_pool.acquire() as conn:
            await conn.execute('''
                INSERT INTO room_status_log (
                    log_id, room_number, status, timestamp
                ) VALUES ($1, $2, $3, $4)
            ''',
                uuid.uuid4(),
                room_number,
                status.value,
                datetime.utcnow()
            )
    
    async def update_staff_performance(
        self,
        staff_id: str,
        task: CleaningTask,
        actual_duration: float
    ):
        """Update staff performance metrics"""
        if staff_id not in self.staff_members:
            return
        
        staff = self.staff_members[staff_id]
        
        # Calculate efficiency score
        expected_duration = task.estimated_duration
        efficiency = min(1.0, expected_duration / max(actual_duration, 1))
        
        # Update performance score (weighted average)
        staff.performance_score = (staff.performance_score * 0.9) + (efficiency * 0.1)
        
        # Move task to completed
        if task.task_id in staff.current_tasks:
            staff.current_tasks.remove(task.task_id)
        staff.completed_tasks.append(task.task_id)
    
    async def schedule_inspection(self, task: CleaningTask):
        """Schedule room inspection"""
        inspectors = [
            s for s in self.staff_members.values()
            if s.role in [StaffRole.INSPECTOR, StaffRole.SUPERVISOR]
            and s.is_available
        ]
        
        if inspectors:
            inspector = inspectors[0]  # Simple selection, could be optimized
            inspection_task = await self.create_cleaning_task(
                room_number=task.room_number,
                task_type=TaskType.INSPECTION,
                priority=task.priority
            )
            inspection_task.assigned_to = inspector.staff_id
            await self.notify_staff_assignment(inspector, inspection_task)
    
    async def perform_inspection(
        self,
        task_id: str,
        inspector_id: str,
        quality_scores: Dict[str, float],
        issues: Optional[List[str]] = None,
        photos: Optional[List[str]] = None
    ) -> float:
        """Perform room inspection and quality scoring"""
        if task_id not in self.active_tasks:
            raise ValueError(f"Task {task_id} not found")
        
        task = self.active_tasks[task_id]
        
        # Calculate overall quality score
        overall_score = sum(quality_scores.values()) / len(quality_scores)
        task.quality_score = overall_score
        task.inspected_at = datetime.utcnow()
        task.inspector_id = inspector_id
        
        # Store inspection results
        async with self.db_pool.acquire() as conn:
            await conn.execute('''
                INSERT INTO cleaning_quality_scores (
                    score_id, task_id, room_number, inspector_id,
                    inspection_date, overall_score, category_scores,
                    issues_found, photos
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ''',
                uuid.uuid4(),
                uuid.UUID(task_id),
                task.room_number,
                uuid.UUID(inspector_id),
                task.inspected_at,
                overall_score,
                json.dumps(quality_scores),
                json.dumps(issues or []),
                photos or []
            )
        
        # Update room status based on score
        room_type = await self.get_room_type(task.room_number)
        threshold = self.room_standards[room_type].quality_threshold
        
        if overall_score >= threshold:
            await self.update_room_status(task.room_number, RoomStatus.CLEAN)
            task.status = "approved"
        else:
            await self.update_room_status(task.room_number, RoomStatus.TOUCH_UP)
            task.status = "requires_touchup"
            # Create touch-up task
            await self.create_touchup_task(task, issues)
        
        return overall_score
    
    async def create_touchup_task(self, original_task: CleaningTask, issues: List[str]):
        """Create touch-up task for quality issues"""
        touchup_task = await self.create_cleaning_task(
            room_number=original_task.room_number,
            task_type=TaskType.TOUCH_UP,
            priority=original_task.priority,
            special_instructions=f"Touch-up required for: {', '.join(issues)}"
        )
        
        # Assign to original cleaner for training
        touchup_task.assigned_to = original_task.assigned_to
        
        if original_task.assigned_to in self.staff_members:
            staff = self.staff_members[original_task.assigned_to]
            await self.notify_staff_assignment(staff, touchup_task)
    
    async def get_real_time_dashboard(self) -> Dict[str, Any]:
        """Get real-time housekeeping dashboard data"""
        # Room status summary
        room_statuses = {}
        for status in RoomStatus:
            count = await self.redis_client.hget("room_status_counts", status.value)
            room_statuses[status.value] = int(count) if count else 0
        
        # Staff status
        staff_summary = {
            "total": len(self.staff_members),
            "available": len([s for s in self.staff_members.values() if s.is_available]),
            "busy": len([s for s in self.staff_members.values() if not s.is_available]),
            "on_break": len([s for s in self.staff_members.values() if self.is_on_break(s)])
        }
        
        # Task status
        task_summary = {
            "pending": len([t for t in self.active_tasks.values() if t.status == "pending"]),
            "in_progress": len([t for t in self.active_tasks.values() if t.status == "in_progress"]),
            "completed_today": await self.get_completed_today_count(),
            "urgent": len([t for t in self.active_tasks.values() if t.priority == CleaningPriority.URGENT])
        }
        
        # Performance metrics
        avg_cleaning_time = await self.calculate_average_cleaning_time()
        avg_quality_score = await self.calculate_average_quality_score()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "room_statuses": room_statuses,
            "staff_summary": staff_summary,
            "task_summary": task_summary,
            "metrics": {
                "avg_cleaning_time": avg_cleaning_time,
                "avg_quality_score": avg_quality_score,
                "rooms_per_hour": await self.calculate_rooms_per_hour(),
                "first_time_pass_rate": await self.calculate_first_time_pass_rate()
            },
            "alerts": await self.get_active_alerts()
        }
    
    def is_on_break(self, staff: HousekeepingStaff) -> bool:
        """Check if staff is currently on break"""
        current_time = datetime.utcnow()
        for break_start, break_end in staff.break_times:
            if break_start <= current_time <= break_end:
                return True
        return False
    
    async def get_completed_today_count(self) -> int:
        """Get count of tasks completed today"""
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0)
        
        async with self.db_pool.acquire() as conn:
            result = await conn.fetchval('''
                SELECT COUNT(*) FROM housekeeping_tasks
                WHERE completed_at >= $1 AND status = 'completed'
            ''', today_start)
        
        return result or 0
    
    async def calculate_average_cleaning_time(self) -> float:
        """Calculate average cleaning time for completed tasks"""
        async with self.db_pool.acquire() as conn:
            result = await conn.fetchval('''
                SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60)
                FROM housekeeping_tasks
                WHERE completed_at IS NOT NULL
                AND started_at IS NOT NULL
                AND completed_at >= CURRENT_DATE
            ''')
        
        return round(result or 30.0, 1)
    
    async def calculate_average_quality_score(self) -> float:
        """Calculate average quality score"""
        async with self.db_pool.acquire() as conn:
            result = await conn.fetchval('''
                SELECT AVG(overall_score)
                FROM cleaning_quality_scores
                WHERE inspection_date >= CURRENT_DATE - INTERVAL '7 days'
            ''')
        
        return round(result or 0.85, 2)
    
    async def calculate_rooms_per_hour(self) -> float:
        """Calculate rooms cleaned per hour"""
        async with self.db_pool.acquire() as conn:
            result = await conn.fetchval('''
                SELECT COUNT(*) * 1.0 / NULLIF(
                    SUM(EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600), 0
                )
                FROM housekeeping_tasks
                WHERE completed_at >= CURRENT_DATE
                AND started_at IS NOT NULL
            ''')
        
        return round(result or 2.0, 1)
    
    async def calculate_first_time_pass_rate(self) -> float:
        """Calculate percentage of rooms passing inspection first time"""
        async with self.db_pool.acquire() as conn:
            total = await conn.fetchval('''
                SELECT COUNT(*) FROM cleaning_quality_scores
                WHERE inspection_date >= CURRENT_DATE - INTERVAL '7 days'
            ''')
            
            passed = await conn.fetchval('''
                SELECT COUNT(*) FROM cleaning_quality_scores
                WHERE inspection_date >= CURRENT_DATE - INTERVAL '7 days'
                AND overall_score >= 0.85
            ''')
        
        if total and total > 0:
            return round((passed / total) * 100, 1)
        return 0.0
    
    async def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get active housekeeping alerts"""
        alerts = []
        
        # Check for urgent unassigned tasks
        urgent_unassigned = [
            t for t in self.active_tasks.values()
            if t.priority == CleaningPriority.URGENT and not t.assigned_to
        ]
        
        if urgent_unassigned:
            alerts.append({
                "type": "urgent_unassigned",
                "severity": "high",
                "message": f"{len(urgent_unassigned)} urgent tasks unassigned",
                "tasks": [t.task_id for t in urgent_unassigned]
            })
        
        # Check for overdue tasks
        overdue_tasks = []
        for task in self.active_tasks.values():
            if task.guest_arrival_time and task.status != "completed":
                if datetime.utcnow() > task.guest_arrival_time - timedelta(hours=1):
                    overdue_tasks.append(task)
        
        if overdue_tasks:
            alerts.append({
                "type": "overdue_tasks",
                "severity": "critical",
                "message": f"{len(overdue_tasks)} rooms not ready for arriving guests",
                "tasks": [t.task_id for t in overdue_tasks]
            })
        
        # Check for low staff availability
        available_staff_count = len([s for s in self.staff_members.values() if s.is_available])
        if available_staff_count < 3:
            alerts.append({
                "type": "low_staff",
                "severity": "medium",
                "message": f"Only {available_staff_count} staff available",
                "available_staff": available_staff_count
            })
        
        return alerts
    
    async def generate_staff_schedule(
        self,
        date: datetime,
        required_staff: Dict[str, int]
    ) -> Dict[str, List[Dict]]:
        """Generate optimal staff schedule"""
        schedule = {
            "morning": [],
            "afternoon": [],
            "evening": []
        }
        
        # Implementation would use optimization algorithms
        # to create optimal schedules based on:
        # - Historical occupancy data
        # - Staff availability
        # - Labor regulations
        # - Skill requirements
        
        return schedule
    
    async def notify_staff_assignment(self, staff: HousekeepingStaff, task: CleaningTask):
        """Send task assignment notification to staff"""
        notification = {
            "type": "task_assignment",
            "staff_id": staff.staff_id,
            "task_id": task.task_id,
            "room": task.room_number,
            "priority": task.priority.value,
            "estimated_duration": task.estimated_duration,
            "special_instructions": task.special_instructions,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Push to Redis for real-time updates
        await self.redis_client.lpush(
            f"staff_notifications:{staff.staff_id}",
            json.dumps(notification)
        )
        
        # Would also send push notification to staff mobile app
        logger.info(f"Task {task.task_id} assigned to {staff.name}")
    
    async def alert_supervisor(self, message: str):
        """Send alert to supervisor"""
        alert = {
            "type": "supervisor_alert",
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
            "severity": "high"
        }
        
        await self.redis_client.lpush(
            "supervisor_alerts",
            json.dumps(alert)
        )
        
        logger.warning(f"Supervisor alert: {message}")
    
    async def get_staff_productivity_report(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Generate staff productivity report"""
        async with self.db_pool.acquire() as conn:
            # Get task completion data
            staff_stats = await conn.fetch('''
                SELECT 
                    assigned_to as staff_id,
                    COUNT(*) as tasks_completed,
                    AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60) as avg_time,
                    AVG(quality_score) as avg_quality
                FROM housekeeping_tasks
                WHERE completed_at BETWEEN $1 AND $2
                GROUP BY assigned_to
            ''', start_date, end_date)
        
        report = {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "staff_performance": []
        }
        
        for stat in staff_stats:
            if stat['staff_id'] and stat['staff_id'] in self.staff_members:
                staff = self.staff_members[stat['staff_id']]
                report["staff_performance"].append({
                    "staff_id": stat['staff_id'],
                    "name": staff.name,
                    "role": staff.role.value,
                    "tasks_completed": stat['tasks_completed'],
                    "avg_cleaning_time": round(stat['avg_time'] or 0, 1),
                    "avg_quality_score": round(stat['avg_quality'] or 0, 2),
                    "efficiency_rating": self.calculate_efficiency_rating(
                        stat['avg_time'],
                        stat['avg_quality']
                    )
                })
        
        return report
    
    def calculate_efficiency_rating(
        self,
        avg_time: Optional[float],
        avg_quality: Optional[float]
    ) -> str:
        """Calculate staff efficiency rating"""
        if not avg_time or not avg_quality:
            return "N/A"
        
        # Time score (faster is better, normalized)
        time_score = max(0, min(1, 30 / avg_time)) if avg_time > 0 else 0
        
        # Combined score
        combined = (time_score * 0.4) + (avg_quality * 0.6)
        
        if combined >= 0.9:
            return "Excellent"
        elif combined >= 0.8:
            return "Good"
        elif combined >= 0.7:
            return "Satisfactory"
        else:
            return "Needs Improvement"
    
    async def handle_guest_complaint(
        self,
        room_number: str,
        complaint: str,
        severity: str = "medium"
    ):
        """Handle guest complaint about room cleanliness"""
        # Create immediate response task
        response_task = await self.create_cleaning_task(
            room_number=room_number,
            task_type=TaskType.SPECIAL_REQUEST,
            priority=CleaningPriority.URGENT if severity == "high" else CleaningPriority.HIGH,
            special_instructions=f"Guest complaint: {complaint}"
        )
        
        # Assign to supervisor or senior staff
        senior_staff = [
            s for s in self.staff_members.values()
            if s.role in [StaffRole.SUPERVISOR, StaffRole.MANAGER]
            and s.is_available
        ]
        
        if senior_staff:
            response_task.assigned_to = senior_staff[0].staff_id
            await self.notify_staff_assignment(senior_staff[0], response_task)
        
        # Log complaint
        async with self.db_pool.acquire() as conn:
            await conn.execute('''
                INSERT INTO guest_complaints (
                    complaint_id, room_number, complaint_text,
                    severity, response_task_id, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6)
            ''',
                uuid.uuid4(),
                room_number,
                complaint,
                severity,
                uuid.UUID(response_task.task_id),
                datetime.utcnow()
            )
        
        # Alert management
        await self.alert_supervisor(
            f"Guest complaint in room {room_number}: {complaint}"
        )
        
        return response_task
    
    async def close(self):
        """Clean up resources"""
        if self.db_pool:
            await self.db_pool.close()
        if self.redis_client:
            self.redis_client.close()
            await self.redis_client.wait_closed()