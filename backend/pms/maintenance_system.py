"""
Advanced PMS Maintenance System
Complete maintenance management for Spirit Tours Platform
Handles preventive maintenance, work orders, asset tracking, and vendor management
"""

import asyncio
import json
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Tuple, Any, Set
from enum import Enum
import uuid
import hashlib
from dataclasses import dataclass, field
import numpy as np
from collections import defaultdict
import logging
import aioredis
import asyncpg
import pandas as pd
from scipy import stats
import aiohttp

logger = logging.getLogger(__name__)

class MaintenanceType(Enum):
    """Types of maintenance work"""
    PREVENTIVE = "preventive"       # Scheduled maintenance
    CORRECTIVE = "corrective"       # Repair/fix issues
    PREDICTIVE = "predictive"       # Based on condition monitoring
    EMERGENCY = "emergency"         # Urgent repairs
    INSPECTION = "inspection"       # Regular inspections
    CALIBRATION = "calibration"     # Equipment calibration
    UPGRADE = "upgrade"            # System upgrades
    SEASONAL = "seasonal"          # Seasonal maintenance

class WorkOrderStatus(Enum):
    """Work order status tracking"""
    PENDING = "pending"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    VERIFIED = "verified"
    CANCELLED = "cancelled"
    WAITING_PARTS = "waiting_parts"

class Priority(Enum):
    """Maintenance priority levels"""
    CRITICAL = "critical"    # Safety/operations critical
    HIGH = "high"           # Major impact
    MEDIUM = "medium"       # Moderate impact
    LOW = "low"            # Minor impact
    SCHEDULED = "scheduled"  # Routine scheduled

class AssetCategory(Enum):
    """Asset categories for maintenance"""
    HVAC = "hvac"
    ELECTRICAL = "electrical"
    PLUMBING = "plumbing"
    ELEVATORS = "elevators"
    FIRE_SAFETY = "fire_safety"
    KITCHEN = "kitchen"
    LAUNDRY = "laundry"
    IT_EQUIPMENT = "it_equipment"
    FURNITURE = "furniture"
    POOLS_SPA = "pools_spa"
    LANDSCAPING = "landscaping"
    VEHICLES = "vehicles"
    SECURITY = "security"
    AUDIOVISUAL = "audiovisual"

@dataclass
class Asset:
    """Asset/equipment information"""
    asset_id: str
    name: str
    category: AssetCategory
    location: str
    model: str
    serial_number: str
    manufacturer: str
    purchase_date: datetime
    warranty_end: Optional[datetime]
    expected_lifetime: int  # months
    current_condition: float  # 0-1 score
    last_maintenance: Optional[datetime] = None
    next_scheduled: Optional[datetime] = None
    maintenance_interval: int = 90  # days
    criticality: str = "medium"
    documentation: List[str] = field(default_factory=list)
    maintenance_history: List[str] = field(default_factory=list)
    replacement_cost: float = 0.0
    energy_rating: Optional[str] = None
    specifications: Dict[str, Any] = field(default_factory=dict)

@dataclass
class WorkOrder:
    """Maintenance work order"""
    order_id: str
    title: str
    description: str
    maintenance_type: MaintenanceType
    priority: Priority
    status: WorkOrderStatus
    asset_id: Optional[str]
    location: str
    requested_by: str
    assigned_to: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    scheduled_date: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    estimated_hours: float = 1.0
    actual_hours: Optional[float] = None
    estimated_cost: float = 0.0
    actual_cost: Optional[float] = None
    parts_required: List[Dict] = field(default_factory=list)
    vendor_required: bool = False
    vendor_id: Optional[str] = None
    safety_requirements: List[str] = field(default_factory=list)
    completion_notes: Optional[str] = None
    photos_before: List[str] = field(default_factory=list)
    photos_after: List[str] = field(default_factory=list)
    guest_impact: str = "none"  # none, minimal, moderate, significant

@dataclass
class MaintenanceSchedule:
    """Preventive maintenance schedule"""
    schedule_id: str
    asset_id: str
    task_name: str
    frequency: str  # daily, weekly, monthly, quarterly, annual
    last_performed: Optional[datetime]
    next_due: datetime
    estimated_duration: float  # hours
    checklist: List[Dict]
    required_parts: List[str]
    required_tools: List[str]
    safety_procedures: List[str]
    vendor_required: bool = False
    auto_generate_wo: bool = True

@dataclass
class Vendor:
    """Maintenance vendor/contractor"""
    vendor_id: str
    company_name: str
    contact_name: str
    phone: str
    email: str
    specialties: List[AssetCategory]
    certifications: List[str]
    insurance_expiry: datetime
    contract_expiry: Optional[datetime]
    hourly_rate: float
    emergency_rate: float
    response_time: int  # hours
    rating: float  # 0-5
    is_preferred: bool = False
    is_emergency: bool = False
    service_history: List[str] = field(default_factory=list)
    blackout_dates: List[Tuple[date, date]] = field(default_factory=list)

@dataclass
class SparePart:
    """Spare parts inventory"""
    part_id: str
    name: str
    part_number: str
    manufacturer: str
    category: AssetCategory
    quantity_on_hand: int
    minimum_quantity: int
    reorder_quantity: int
    unit_cost: float
    supplier: str
    lead_time: int  # days
    location: str
    compatible_assets: List[str]
    last_ordered: Optional[datetime] = None
    last_used: Optional[datetime] = None

class MaintenanceSystem:
    """Complete maintenance management system"""
    
    def __init__(self):
        self.db_pool = None
        self.redis_client = None
        self.assets: Dict[str, Asset] = {}
        self.work_orders: Dict[str, WorkOrder] = {}
        self.schedules: Dict[str, MaintenanceSchedule] = {}
        self.vendors: Dict[str, Vendor] = {}
        self.spare_parts: Dict[str, SparePart] = {}
        self.initialize_default_schedules()
        
    async def initialize(self):
        """Initialize database connections"""
        self.db_pool = await asyncpg.create_pool(
            "postgresql://user:password@localhost/spirittours_pms"
        )
        self.redis_client = await aioredis.create_redis_pool(
            'redis://localhost'
        )
        await self.create_database_schema()
        await self.load_assets()
        await self.load_vendors()
    
    async def create_database_schema(self):
        """Create database tables for maintenance"""
        async with self.db_pool.acquire() as conn:
            # Assets table
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS maintenance_assets (
                    asset_id UUID PRIMARY KEY,
                    name VARCHAR(200),
                    category VARCHAR(50),
                    location VARCHAR(100),
                    model VARCHAR(100),
                    serial_number VARCHAR(100) UNIQUE,
                    manufacturer VARCHAR(100),
                    purchase_date TIMESTAMP,
                    warranty_end TIMESTAMP,
                    expected_lifetime INTEGER,
                    current_condition FLOAT,
                    last_maintenance TIMESTAMP,
                    next_scheduled TIMESTAMP,
                    maintenance_interval INTEGER,
                    criticality VARCHAR(20),
                    replacement_cost DECIMAL(10,2),
                    specifications JSONB,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            ''')
            
            # Work orders table
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS maintenance_work_orders (
                    order_id UUID PRIMARY KEY,
                    title VARCHAR(200),
                    description TEXT,
                    maintenance_type VARCHAR(50),
                    priority VARCHAR(20),
                    status VARCHAR(30),
                    asset_id UUID REFERENCES maintenance_assets(asset_id),
                    location VARCHAR(100),
                    requested_by VARCHAR(100),
                    assigned_to VARCHAR(100),
                    created_at TIMESTAMP,
                    scheduled_date TIMESTAMP,
                    started_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    verified_at TIMESTAMP,
                    estimated_hours FLOAT,
                    actual_hours FLOAT,
                    estimated_cost DECIMAL(10,2),
                    actual_cost DECIMAL(10,2),
                    parts_required JSONB,
                    vendor_id UUID,
                    safety_requirements JSONB,
                    completion_notes TEXT,
                    photos_before TEXT[],
                    photos_after TEXT[],
                    guest_impact VARCHAR(20)
                )
            ''')
            
            # Maintenance schedules table
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS maintenance_schedules (
                    schedule_id UUID PRIMARY KEY,
                    asset_id UUID REFERENCES maintenance_assets(asset_id),
                    task_name VARCHAR(200),
                    frequency VARCHAR(20),
                    last_performed TIMESTAMP,
                    next_due TIMESTAMP,
                    estimated_duration FLOAT,
                    checklist JSONB,
                    required_parts JSONB,
                    required_tools JSONB,
                    safety_procedures JSONB,
                    vendor_required BOOLEAN,
                    auto_generate_wo BOOLEAN,
                    is_active BOOLEAN DEFAULT TRUE
                )
            ''')
            
            # Maintenance history table
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS maintenance_history (
                    history_id UUID PRIMARY KEY,
                    asset_id UUID REFERENCES maintenance_assets(asset_id),
                    work_order_id UUID REFERENCES maintenance_work_orders(order_id),
                    maintenance_date TIMESTAMP,
                    maintenance_type VARCHAR(50),
                    description TEXT,
                    performed_by VARCHAR(100),
                    hours_spent FLOAT,
                    cost DECIMAL(10,2),
                    parts_used JSONB,
                    condition_before FLOAT,
                    condition_after FLOAT,
                    notes TEXT
                )
            ''')
            
            # Vendors table
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS maintenance_vendors (
                    vendor_id UUID PRIMARY KEY,
                    company_name VARCHAR(200),
                    contact_name VARCHAR(100),
                    phone VARCHAR(50),
                    email VARCHAR(100),
                    specialties JSONB,
                    certifications JSONB,
                    insurance_expiry TIMESTAMP,
                    contract_expiry TIMESTAMP,
                    hourly_rate DECIMAL(10,2),
                    emergency_rate DECIMAL(10,2),
                    response_time INTEGER,
                    rating FLOAT,
                    is_preferred BOOLEAN,
                    is_emergency BOOLEAN,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            ''')
            
            # Spare parts inventory
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS spare_parts_inventory (
                    part_id UUID PRIMARY KEY,
                    name VARCHAR(200),
                    part_number VARCHAR(100),
                    manufacturer VARCHAR(100),
                    category VARCHAR(50),
                    quantity_on_hand INTEGER,
                    minimum_quantity INTEGER,
                    reorder_quantity INTEGER,
                    unit_cost DECIMAL(10,2),
                    supplier VARCHAR(200),
                    lead_time INTEGER,
                    location VARCHAR(100),
                    compatible_assets JSONB,
                    last_ordered TIMESTAMP,
                    last_used TIMESTAMP
                )
            ''')
            
            # Energy monitoring table
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS energy_monitoring (
                    reading_id UUID PRIMARY KEY,
                    asset_id UUID REFERENCES maintenance_assets(asset_id),
                    reading_date TIMESTAMP,
                    energy_consumption FLOAT,
                    efficiency_rating FLOAT,
                    anomaly_detected BOOLEAN,
                    notes TEXT
                )
            ''')
    
    def initialize_default_schedules(self):
        """Initialize default preventive maintenance schedules"""
        self.default_schedules = {
            AssetCategory.HVAC: [
                {
                    "task": "Filter replacement",
                    "frequency": "monthly",
                    "duration": 0.5,
                    "checklist": ["Remove old filter", "Check filter size", "Install new filter", "Check airflow"]
                },
                {
                    "task": "Coil cleaning",
                    "frequency": "quarterly",
                    "duration": 2.0,
                    "checklist": ["Turn off system", "Apply coil cleaner", "Rinse thoroughly", "Check fins"]
                },
                {
                    "task": "Full system inspection",
                    "frequency": "annual",
                    "duration": 4.0,
                    "checklist": ["Check refrigerant", "Test controls", "Inspect ductwork", "Calibrate thermostat"]
                }
            ],
            AssetCategory.ELEVATORS: [
                {
                    "task": "Safety inspection",
                    "frequency": "monthly",
                    "duration": 2.0,
                    "checklist": ["Test emergency stop", "Check door sensors", "Test alarm", "Check lighting"]
                },
                {
                    "task": "Lubrication",
                    "frequency": "quarterly",
                    "duration": 3.0,
                    "checklist": ["Lubricate rails", "Check cables", "Oil motor", "Test operation"]
                },
                {
                    "task": "State inspection",
                    "frequency": "annual",
                    "duration": 8.0,
                    "checklist": ["Full safety test", "Load test", "Certificate renewal", "Update logs"]
                }
            ],
            AssetCategory.FIRE_SAFETY: [
                {
                    "task": "Alarm test",
                    "frequency": "weekly",
                    "duration": 1.0,
                    "checklist": ["Test pull stations", "Check panel", "Test strobes", "Log results"]
                },
                {
                    "task": "Extinguisher inspection",
                    "frequency": "monthly",
                    "duration": 2.0,
                    "checklist": ["Check pressure", "Check seals", "Check mounting", "Update tags"]
                },
                {
                    "task": "Sprinkler test",
                    "frequency": "quarterly",
                    "duration": 4.0,
                    "checklist": ["Flow test", "Check valves", "Test alarms", "Inspect heads"]
                }
            ],
            AssetCategory.POOLS_SPA: [
                {
                    "task": "Water quality test",
                    "frequency": "daily",
                    "duration": 0.5,
                    "checklist": ["Test pH", "Test chlorine", "Check temperature", "Log readings"]
                },
                {
                    "task": "Filter backwash",
                    "frequency": "weekly",
                    "duration": 1.0,
                    "checklist": ["Backwash filter", "Check pressure", "Inspect pump", "Clean skimmers"]
                },
                {
                    "task": "Deep clean",
                    "frequency": "quarterly",
                    "duration": 6.0,
                    "checklist": ["Drain pool", "Acid wash", "Inspect tiles", "Refill and balance"]
                }
            ]
        }
    
    async def load_assets(self):
        """Load assets from database"""
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch('''
                SELECT * FROM maintenance_assets
                WHERE criticality IN ('high', 'critical')
                ORDER BY next_scheduled ASC
            ''')
            
            for row in rows:
                asset = Asset(
                    asset_id=str(row['asset_id']),
                    name=row['name'],
                    category=AssetCategory(row['category']),
                    location=row['location'],
                    model=row['model'],
                    serial_number=row['serial_number'],
                    manufacturer=row['manufacturer'],
                    purchase_date=row['purchase_date'],
                    warranty_end=row['warranty_end'],
                    expected_lifetime=row['expected_lifetime'],
                    current_condition=row['current_condition'],
                    last_maintenance=row['last_maintenance'],
                    next_scheduled=row['next_scheduled'],
                    maintenance_interval=row['maintenance_interval'],
                    criticality=row['criticality'],
                    replacement_cost=float(row['replacement_cost']),
                    specifications=row['specifications'] or {}
                )
                self.assets[asset.asset_id] = asset
    
    async def load_vendors(self):
        """Load vendors from database"""
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch('''
                SELECT * FROM maintenance_vendors
                WHERE is_preferred = TRUE
                OR is_emergency = TRUE
            ''')
            
            for row in rows:
                vendor = Vendor(
                    vendor_id=str(row['vendor_id']),
                    company_name=row['company_name'],
                    contact_name=row['contact_name'],
                    phone=row['phone'],
                    email=row['email'],
                    specialties=[AssetCategory(s) for s in row['specialties']],
                    certifications=row['certifications'],
                    insurance_expiry=row['insurance_expiry'],
                    contract_expiry=row['contract_expiry'],
                    hourly_rate=float(row['hourly_rate']),
                    emergency_rate=float(row['emergency_rate']),
                    response_time=row['response_time'],
                    rating=row['rating'],
                    is_preferred=row['is_preferred'],
                    is_emergency=row['is_emergency']
                )
                self.vendors[vendor.vendor_id] = vendor
    
    async def create_work_order(
        self,
        title: str,
        description: str,
        maintenance_type: MaintenanceType,
        priority: Priority,
        location: str,
        requested_by: str,
        asset_id: Optional[str] = None,
        scheduled_date: Optional[datetime] = None,
        estimated_hours: float = 1.0,
        estimated_cost: float = 0.0,
        parts_required: Optional[List[Dict]] = None,
        vendor_required: bool = False,
        safety_requirements: Optional[List[str]] = None
    ) -> WorkOrder:
        """Create a new work order"""
        work_order = WorkOrder(
            order_id=str(uuid.uuid4()),
            title=title,
            description=description,
            maintenance_type=maintenance_type,
            priority=priority,
            status=WorkOrderStatus.PENDING,
            asset_id=asset_id,
            location=location,
            requested_by=requested_by,
            scheduled_date=scheduled_date,
            estimated_hours=estimated_hours,
            estimated_cost=estimated_cost,
            parts_required=parts_required or [],
            vendor_required=vendor_required,
            safety_requirements=safety_requirements or []
        )
        
        # Determine guest impact
        work_order.guest_impact = self.assess_guest_impact(
            location,
            maintenance_type,
            estimated_hours
        )
        
        # Auto-assign if critical
        if priority == Priority.CRITICAL:
            await self.auto_assign_work_order(work_order)
        
        # Store in database
        await self.store_work_order(work_order)
        
        # Add to active work orders
        self.work_orders[work_order.order_id] = work_order
        
        # Send notifications
        await self.notify_work_order_created(work_order)
        
        return work_order
    
    def assess_guest_impact(
        self,
        location: str,
        maintenance_type: MaintenanceType,
        estimated_hours: float
    ) -> str:
        """Assess impact of maintenance on guests"""
        # Guest area locations
        guest_areas = ["lobby", "pool", "restaurant", "gym", "spa", "room"]
        
        is_guest_area = any(area in location.lower() for area in guest_areas)
        
        if maintenance_type == MaintenanceType.EMERGENCY:
            return "significant" if is_guest_area else "moderate"
        elif is_guest_area:
            if estimated_hours > 4:
                return "significant"
            elif estimated_hours > 2:
                return "moderate"
            else:
                return "minimal"
        else:
            return "none"
    
    async def auto_assign_work_order(self, work_order: WorkOrder):
        """Auto-assign critical work order"""
        if work_order.vendor_required:
            # Find suitable vendor
            suitable_vendors = [
                v for v in self.vendors.values()
                if work_order.asset_id and 
                self.assets[work_order.asset_id].category in v.specialties
                and (v.is_emergency if work_order.priority == Priority.CRITICAL else True)
            ]
            
            if suitable_vendors:
                # Choose vendor with best rating and fastest response
                best_vendor = min(
                    suitable_vendors,
                    key=lambda v: (v.response_time, -v.rating)
                )
                work_order.vendor_id = best_vendor.vendor_id
                work_order.assigned_to = best_vendor.company_name
        else:
            # Assign to internal maintenance staff
            work_order.assigned_to = "maintenance_team"
        
        work_order.status = WorkOrderStatus.SCHEDULED
    
    async def store_work_order(self, work_order: WorkOrder):
        """Store work order in database"""
        async with self.db_pool.acquire() as conn:
            await conn.execute('''
                INSERT INTO maintenance_work_orders (
                    order_id, title, description, maintenance_type, priority,
                    status, asset_id, location, requested_by, assigned_to,
                    created_at, scheduled_date, estimated_hours, estimated_cost,
                    parts_required, vendor_id, safety_requirements, guest_impact
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            ''',
                uuid.UUID(work_order.order_id),
                work_order.title,
                work_order.description,
                work_order.maintenance_type.value,
                work_order.priority.value,
                work_order.status.value,
                uuid.UUID(work_order.asset_id) if work_order.asset_id else None,
                work_order.location,
                work_order.requested_by,
                work_order.assigned_to,
                work_order.created_at,
                work_order.scheduled_date,
                work_order.estimated_hours,
                work_order.estimated_cost,
                json.dumps(work_order.parts_required),
                uuid.UUID(work_order.vendor_id) if work_order.vendor_id else None,
                json.dumps(work_order.safety_requirements),
                work_order.guest_impact
            )
    
    async def notify_work_order_created(self, work_order: WorkOrder):
        """Send notifications for new work order"""
        notification = {
            "type": "work_order_created",
            "order_id": work_order.order_id,
            "title": work_order.title,
            "priority": work_order.priority.value,
            "location": work_order.location,
            "assigned_to": work_order.assigned_to,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Notify via Redis
        await self.redis_client.lpush(
            "maintenance_notifications",
            json.dumps(notification)
        )
        
        # Send email/SMS for critical issues
        if work_order.priority == Priority.CRITICAL:
            await self.send_critical_alert(work_order)
    
    async def send_critical_alert(self, work_order: WorkOrder):
        """Send critical maintenance alert"""
        alert_message = f"""
        CRITICAL MAINTENANCE ALERT
        
        Work Order: {work_order.order_id}
        Title: {work_order.title}
        Location: {work_order.location}
        Guest Impact: {work_order.guest_impact}
        
        Immediate action required!
        """
        
        # Would integrate with SMS/email service
        logger.critical(alert_message)
    
    async def start_work_order(
        self,
        order_id: str,
        technician: str,
        notes: Optional[str] = None
    ):
        """Start work on a maintenance order"""
        if order_id not in self.work_orders:
            raise ValueError(f"Work order {order_id} not found")
        
        work_order = self.work_orders[order_id]
        work_order.status = WorkOrderStatus.IN_PROGRESS
        work_order.started_at = datetime.utcnow()
        
        # Update database
        async with self.db_pool.acquire() as conn:
            await conn.execute('''
                UPDATE maintenance_work_orders
                SET status = $1, started_at = $2
                WHERE order_id = $3
            ''',
                work_order.status.value,
                work_order.started_at,
                uuid.UUID(order_id)
            )
        
        # Update asset status if applicable
        if work_order.asset_id:
            await self.update_asset_status(work_order.asset_id, "under_maintenance")
    
    async def complete_work_order(
        self,
        order_id: str,
        actual_hours: float,
        actual_cost: float,
        completion_notes: str,
        parts_used: Optional[List[Dict]] = None,
        photos_after: Optional[List[str]] = None
    ):
        """Complete a work order"""
        if order_id not in self.work_orders:
            raise ValueError(f"Work order {order_id} not found")
        
        work_order = self.work_orders[order_id]
        work_order.status = WorkOrderStatus.COMPLETED
        work_order.completed_at = datetime.utcnow()
        work_order.actual_hours = actual_hours
        work_order.actual_cost = actual_cost
        work_order.completion_notes = completion_notes
        work_order.photos_after = photos_after or []
        
        # Update database
        async with self.db_pool.acquire() as conn:
            await conn.execute('''
                UPDATE maintenance_work_orders
                SET status = $1, completed_at = $2, actual_hours = $3,
                    actual_cost = $4, completion_notes = $5, photos_after = $6
                WHERE order_id = $7
            ''',
                work_order.status.value,
                work_order.completed_at,
                actual_hours,
                actual_cost,
                completion_notes,
                photos_after or [],
                uuid.UUID(order_id)
            )
        
        # Update parts inventory
        if parts_used:
            await self.update_parts_inventory(parts_used)
        
        # Update asset maintenance history
        if work_order.asset_id:
            await self.update_asset_history(work_order, parts_used)
        
        # Schedule verification if required
        if work_order.priority in [Priority.CRITICAL, Priority.HIGH]:
            await self.schedule_verification(work_order)
    
    async def update_asset_status(self, asset_id: str, status: str):
        """Update asset operational status"""
        await self.redis_client.hset(
            "asset_status",
            asset_id,
            status
        )
    
    async def update_parts_inventory(self, parts_used: List[Dict]):
        """Update spare parts inventory after use"""
        for part_usage in parts_used:
            part_id = part_usage['part_id']
            quantity_used = part_usage['quantity']
            
            if part_id in self.spare_parts:
                part = self.spare_parts[part_id]
                part.quantity_on_hand -= quantity_used
                part.last_used = datetime.utcnow()
                
                # Check if reorder needed
                if part.quantity_on_hand <= part.minimum_quantity:
                    await self.create_reorder_request(part)
                
                # Update database
                async with self.db_pool.acquire() as conn:
                    await conn.execute('''
                        UPDATE spare_parts_inventory
                        SET quantity_on_hand = $1, last_used = $2
                        WHERE part_id = $3
                    ''',
                        part.quantity_on_hand,
                        part.last_used,
                        uuid.UUID(part_id)
                    )
    
    async def create_reorder_request(self, part: SparePart):
        """Create automatic reorder request for low inventory"""
        reorder_request = {
            "part_id": part.part_id,
            "part_name": part.name,
            "part_number": part.part_number,
            "current_quantity": part.quantity_on_hand,
            "reorder_quantity": part.reorder_quantity,
            "supplier": part.supplier,
            "estimated_cost": part.unit_cost * part.reorder_quantity,
            "lead_time": part.lead_time,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Notify purchasing department
        await self.redis_client.lpush(
            "reorder_requests",
            json.dumps(reorder_request)
        )
        
        logger.info(f"Reorder request created for {part.name}")
    
    async def update_asset_history(
        self,
        work_order: WorkOrder,
        parts_used: Optional[List[Dict]]
    ):
        """Update asset maintenance history"""
        if work_order.asset_id not in self.assets:
            return
        
        asset = self.assets[work_order.asset_id]
        
        # Update asset last maintenance
        asset.last_maintenance = work_order.completed_at
        
        # Calculate next scheduled maintenance
        asset.next_scheduled = asset.last_maintenance + timedelta(days=asset.maintenance_interval)
        
        # Store history record
        async with self.db_pool.acquire() as conn:
            await conn.execute('''
                INSERT INTO maintenance_history (
                    history_id, asset_id, work_order_id, maintenance_date,
                    maintenance_type, description, performed_by, hours_spent,
                    cost, parts_used, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ''',
                uuid.uuid4(),
                uuid.UUID(work_order.asset_id),
                uuid.UUID(work_order.order_id),
                work_order.completed_at,
                work_order.maintenance_type.value,
                work_order.description,
                work_order.assigned_to,
                work_order.actual_hours,
                work_order.actual_cost,
                json.dumps(parts_used or []),
                work_order.completion_notes
            )
            
            # Update asset record
            await conn.execute('''
                UPDATE maintenance_assets
                SET last_maintenance = $1, next_scheduled = $2
                WHERE asset_id = $3
            ''',
                asset.last_maintenance,
                asset.next_scheduled,
                uuid.UUID(asset.asset_id)
            )
    
    async def schedule_verification(self, work_order: WorkOrder):
        """Schedule work order verification"""
        verification_task = {
            "work_order_id": work_order.order_id,
            "scheduled_for": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
            "priority": "high"
        }
        
        await self.redis_client.lpush(
            "verification_queue",
            json.dumps(verification_task)
        )
    
    async def generate_preventive_maintenance_schedule(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict]:
        """Generate preventive maintenance schedule"""
        schedule = []
        
        # Get all active maintenance schedules
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch('''
                SELECT * FROM maintenance_schedules
                WHERE is_active = TRUE
                AND next_due BETWEEN $1 AND $2
                ORDER BY next_due ASC
            ''', start_date, end_date)
        
        for row in rows:
            # Create work orders for due maintenance
            if row['auto_generate_wo']:
                work_order = await self.create_work_order(
                    title=row['task_name'],
                    description=f"Scheduled preventive maintenance for {row['asset_id']}",
                    maintenance_type=MaintenanceType.PREVENTIVE,
                    priority=Priority.SCHEDULED,
                    location=await self.get_asset_location(str(row['asset_id'])),
                    requested_by="system",
                    asset_id=str(row['asset_id']),
                    scheduled_date=row['next_due'],
                    estimated_hours=row['estimated_duration'],
                    vendor_required=row['vendor_required']
                )
                
                schedule.append({
                    "work_order_id": work_order.order_id,
                    "asset_id": str(row['asset_id']),
                    "task": row['task_name'],
                    "scheduled_date": row['next_due'].isoformat(),
                    "estimated_duration": row['estimated_duration']
                })
        
        return schedule
    
    async def get_asset_location(self, asset_id: str) -> str:
        """Get asset location"""
        if asset_id in self.assets:
            return self.assets[asset_id].location
        
        async with self.db_pool.acquire() as conn:
            location = await conn.fetchval('''
                SELECT location FROM maintenance_assets
                WHERE asset_id = $1
            ''', uuid.UUID(asset_id))
        
        return location or "Unknown"
    
    async def predict_asset_failure(self, asset_id: str) -> Dict[str, Any]:
        """Predict potential asset failure using historical data"""
        if asset_id not in self.assets:
            raise ValueError(f"Asset {asset_id} not found")
        
        asset = self.assets[asset_id]
        
        # Get historical failure data
        async with self.db_pool.acquire() as conn:
            history = await conn.fetch('''
                SELECT maintenance_date, maintenance_type, hours_spent, cost
                FROM maintenance_history
                WHERE asset_id = $1
                AND maintenance_type IN ('corrective', 'emergency')
                ORDER BY maintenance_date DESC
                LIMIT 20
            ''', uuid.UUID(asset_id))
        
        if len(history) < 3:
            return {
                "asset_id": asset_id,
                "prediction": "insufficient_data",
                "probability": 0.0
            }
        
        # Calculate failure patterns
        failure_intervals = []
        for i in range(len(history) - 1):
            interval = (history[i]['maintenance_date'] - history[i+1]['maintenance_date']).days
            failure_intervals.append(interval)
        
        if failure_intervals:
            # Simple prediction based on mean time between failures
            mean_interval = np.mean(failure_intervals)
            std_interval = np.std(failure_intervals)
            
            days_since_last = (datetime.utcnow() - asset.last_maintenance).days if asset.last_maintenance else 0
            
            # Calculate probability using normal distribution
            if std_interval > 0:
                z_score = (days_since_last - mean_interval) / std_interval
                failure_probability = stats.norm.cdf(z_score)
            else:
                failure_probability = 0.5 if days_since_last > mean_interval else 0.0
            
            prediction = {
                "asset_id": asset_id,
                "prediction": "potential_failure" if failure_probability > 0.7 else "normal",
                "probability": round(failure_probability, 2),
                "expected_days_to_failure": max(0, int(mean_interval - days_since_last)),
                "confidence": "high" if len(history) > 10 else "medium",
                "recommendation": self.get_failure_recommendation(failure_probability)
            }
        else:
            prediction = {
                "asset_id": asset_id,
                "prediction": "normal",
                "probability": 0.0
            }
        
        return prediction
    
    def get_failure_recommendation(self, probability: float) -> str:
        """Get maintenance recommendation based on failure probability"""
        if probability > 0.8:
            return "Schedule immediate preventive maintenance"
        elif probability > 0.6:
            return "Plan maintenance within next week"
        elif probability > 0.4:
            return "Monitor closely, schedule maintenance soon"
        else:
            return "Continue regular maintenance schedule"
    
    async def calculate_maintenance_costs(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Calculate maintenance costs for period"""
        async with self.db_pool.acquire() as conn:
            # Total costs by category
            category_costs = await conn.fetch('''
                SELECT 
                    a.category,
                    SUM(wo.actual_cost) as total_cost,
                    COUNT(wo.order_id) as work_order_count,
                    AVG(wo.actual_cost) as avg_cost
                FROM maintenance_work_orders wo
                JOIN maintenance_assets a ON wo.asset_id = a.asset_id
                WHERE wo.completed_at BETWEEN $1 AND $2
                GROUP BY a.category
            ''', start_date, end_date)
            
            # Labor vs parts costs
            cost_breakdown = await conn.fetchrow('''
                SELECT 
                    SUM(actual_cost) as total_cost,
                    SUM(actual_hours * 50) as labor_cost,
                    COUNT(*) as total_work_orders
                FROM maintenance_work_orders
                WHERE completed_at BETWEEN $1 AND $2
            ''', start_date, end_date)
        
        total_cost = cost_breakdown['total_cost'] or 0
        labor_cost = cost_breakdown['labor_cost'] or 0
        parts_cost = total_cost - labor_cost
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "total_cost": float(total_cost),
            "breakdown": {
                "labor": float(labor_cost),
                "parts": float(parts_cost),
                "external_vendors": await self.calculate_vendor_costs(start_date, end_date)
            },
            "by_category": [
                {
                    "category": row['category'],
                    "total": float(row['total_cost'] or 0),
                    "work_orders": row['work_order_count'],
                    "average": float(row['avg_cost'] or 0)
                }
                for row in category_costs
            ],
            "cost_trends": await self.analyze_cost_trends()
        }
    
    async def calculate_vendor_costs(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> float:
        """Calculate total vendor costs"""
        async with self.db_pool.acquire() as conn:
            result = await conn.fetchval('''
                SELECT SUM(actual_cost)
                FROM maintenance_work_orders
                WHERE vendor_id IS NOT NULL
                AND completed_at BETWEEN $1 AND $2
            ''', start_date, end_date)
        
        return float(result or 0)
    
    async def analyze_cost_trends(self) -> Dict[str, Any]:
        """Analyze maintenance cost trends"""
        async with self.db_pool.acquire() as conn:
            # Get monthly costs for last 6 months
            monthly_costs = await conn.fetch('''
                SELECT 
                    DATE_TRUNC('month', completed_at) as month,
                    SUM(actual_cost) as total_cost
                FROM maintenance_work_orders
                WHERE completed_at >= CURRENT_DATE - INTERVAL '6 months'
                GROUP BY month
                ORDER BY month
            ''')
        
        if len(monthly_costs) < 2:
            return {"trend": "insufficient_data"}
        
        costs = [float(row['total_cost'] or 0) for row in monthly_costs]
        
        # Simple linear trend
        x = np.arange(len(costs))
        trend_coefficient = np.polyfit(x, costs, 1)[0]
        
        return {
            "trend": "increasing" if trend_coefficient > 0 else "decreasing",
            "average_monthly": np.mean(costs),
            "change_rate": abs(trend_coefficient),
            "projection_next_month": costs[-1] + trend_coefficient
        }
    
    async def get_maintenance_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive maintenance dashboard"""
        # Work order statistics
        wo_stats = {
            "pending": len([wo for wo in self.work_orders.values() if wo.status == WorkOrderStatus.PENDING]),
            "in_progress": len([wo for wo in self.work_orders.values() if wo.status == WorkOrderStatus.IN_PROGRESS]),
            "completed_today": await self.get_completed_today(),
            "critical": len([wo for wo in self.work_orders.values() if wo.priority == Priority.CRITICAL])
        }
        
        # Asset health
        asset_health = await self.calculate_overall_asset_health()
        
        # Upcoming preventive maintenance
        upcoming_pm = await self.get_upcoming_preventive_maintenance()
        
        # Cost metrics
        current_month_costs = await self.get_current_month_costs()
        
        # Vendor performance
        vendor_performance = await self.get_vendor_performance()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "work_orders": wo_stats,
            "asset_health": asset_health,
            "upcoming_maintenance": upcoming_pm,
            "costs": current_month_costs,
            "vendor_performance": vendor_performance,
            "alerts": await self.get_maintenance_alerts()
        }
    
    async def get_completed_today(self) -> int:
        """Get count of work orders completed today"""
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0)
        
        count = len([
            wo for wo in self.work_orders.values()
            if wo.completed_at and wo.completed_at >= today_start
        ])
        
        return count
    
    async def calculate_overall_asset_health(self) -> Dict[str, Any]:
        """Calculate overall asset health metrics"""
        total_assets = len(self.assets)
        
        if total_assets == 0:
            return {"status": "no_assets"}
        
        conditions = [asset.current_condition for asset in self.assets.values()]
        avg_condition = np.mean(conditions)
        
        # Categorize assets by condition
        excellent = len([c for c in conditions if c >= 0.9])
        good = len([c for c in conditions if 0.7 <= c < 0.9])
        fair = len([c for c in conditions if 0.5 <= c < 0.7])
        poor = len([c for c in conditions if c < 0.5])
        
        return {
            "average_condition": round(avg_condition, 2),
            "total_assets": total_assets,
            "breakdown": {
                "excellent": excellent,
                "good": good,
                "fair": fair,
                "poor": poor
            },
            "critical_assets_at_risk": await self.identify_critical_assets_at_risk()
        }
    
    async def identify_critical_assets_at_risk(self) -> List[Dict]:
        """Identify critical assets that may need attention"""
        at_risk = []
        
        for asset in self.assets.values():
            if asset.criticality in ["critical", "high"]:
                failure_prediction = await self.predict_asset_failure(asset.asset_id)
                
                if failure_prediction["probability"] > 0.6:
                    at_risk.append({
                        "asset_id": asset.asset_id,
                        "name": asset.name,
                        "location": asset.location,
                        "failure_probability": failure_prediction["probability"],
                        "recommendation": failure_prediction["recommendation"]
                    })
        
        return at_risk
    
    async def get_upcoming_preventive_maintenance(self) -> List[Dict]:
        """Get upcoming preventive maintenance tasks"""
        next_week = datetime.utcnow() + timedelta(days=7)
        
        async with self.db_pool.acquire() as conn:
            upcoming = await conn.fetch('''
                SELECT 
                    s.schedule_id,
                    s.task_name,
                    s.next_due,
                    a.name as asset_name,
                    a.location
                FROM maintenance_schedules s
                JOIN maintenance_assets a ON s.asset_id = a.asset_id
                WHERE s.is_active = TRUE
                AND s.next_due <= $1
                ORDER BY s.next_due ASC
                LIMIT 10
            ''', next_week)
        
        return [
            {
                "schedule_id": str(row['schedule_id']),
                "task": row['task_name'],
                "asset": row['asset_name'],
                "location": row['location'],
                "due_date": row['next_due'].isoformat()
            }
            for row in upcoming
        ]
    
    async def get_current_month_costs(self) -> Dict[str, float]:
        """Get current month maintenance costs"""
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
        
        async with self.db_pool.acquire() as conn:
            result = await conn.fetchrow('''
                SELECT 
                    SUM(actual_cost) as total,
                    COUNT(*) as work_orders
                FROM maintenance_work_orders
                WHERE completed_at >= $1
            ''', month_start)
        
        return {
            "total": float(result['total'] or 0),
            "work_order_count": result['work_orders'] or 0,
            "average_per_order": float(result['total'] or 0) / max(result['work_orders'] or 1, 1)
        }
    
    async def get_vendor_performance(self) -> List[Dict]:
        """Get vendor performance metrics"""
        performance = []
        
        for vendor in self.vendors.values():
            # Get vendor work orders
            async with self.db_pool.acquire() as conn:
                stats = await conn.fetchrow('''
                    SELECT 
                        COUNT(*) as total_orders,
                        AVG(actual_hours) as avg_hours,
                        AVG(actual_cost) as avg_cost
                    FROM maintenance_work_orders
                    WHERE vendor_id = $1
                    AND completed_at >= CURRENT_DATE - INTERVAL '3 months'
                ''', uuid.UUID(vendor.vendor_id))
            
            if stats['total_orders'] and stats['total_orders'] > 0:
                performance.append({
                    "vendor": vendor.company_name,
                    "rating": vendor.rating,
                    "work_orders": stats['total_orders'],
                    "avg_completion_time": round(stats['avg_hours'] or 0, 1),
                    "avg_cost": float(stats['avg_cost'] or 0)
                })
        
        # Sort by rating
        performance.sort(key=lambda x: x['rating'], reverse=True)
        
        return performance[:5]  # Top 5 vendors
    
    async def get_maintenance_alerts(self) -> List[Dict]:
        """Get current maintenance alerts"""
        alerts = []
        
        # Check for overdue preventive maintenance
        async with self.db_pool.acquire() as conn:
            overdue = await conn.fetchval('''
                SELECT COUNT(*)
                FROM maintenance_schedules
                WHERE is_active = TRUE
                AND next_due < CURRENT_DATE
            ''')
        
        if overdue > 0:
            alerts.append({
                "type": "overdue_maintenance",
                "severity": "high",
                "message": f"{overdue} preventive maintenance tasks overdue"
            })
        
        # Check for critical work orders
        critical_count = len([
            wo for wo in self.work_orders.values()
            if wo.priority == Priority.CRITICAL and wo.status != WorkOrderStatus.COMPLETED
        ])
        
        if critical_count > 0:
            alerts.append({
                "type": "critical_work_orders",
                "severity": "critical",
                "message": f"{critical_count} critical work orders pending"
            })
        
        # Check for low spare parts inventory
        low_inventory = [
            part for part in self.spare_parts.values()
            if part.quantity_on_hand <= part.minimum_quantity
        ]
        
        if low_inventory:
            alerts.append({
                "type": "low_inventory",
                "severity": "medium",
                "message": f"{len(low_inventory)} spare parts below minimum quantity"
            })
        
        return alerts
    
    async def close(self):
        """Clean up resources"""
        if self.db_pool:
            await self.db_pool.close()
        if self.redis_client:
            self.redis_client.close()
            await self.redis_client.wait_closed()

# Energy Monitoring Extension
class EnergyMonitoring:
    """Energy monitoring and optimization for maintenance"""
    
    def __init__(self, maintenance_system: MaintenanceSystem):
        self.maintenance = maintenance_system
        
    async def record_energy_reading(
        self,
        asset_id: str,
        consumption: float,
        efficiency_rating: float
    ):
        """Record energy consumption reading"""
        async with self.maintenance.db_pool.acquire() as conn:
            # Check for anomaly
            anomaly = await self.detect_energy_anomaly(asset_id, consumption)
            
            await conn.execute('''
                INSERT INTO energy_monitoring (
                    reading_id, asset_id, reading_date,
                    energy_consumption, efficiency_rating, anomaly_detected
                ) VALUES ($1, $2, $3, $4, $5, $6)
            ''',
                uuid.uuid4(),
                uuid.UUID(asset_id),
                datetime.utcnow(),
                consumption,
                efficiency_rating,
                anomaly
            )
            
            if anomaly:
                # Create maintenance work order
                await self.maintenance.create_work_order(
                    title=f"Energy anomaly detected in {asset_id}",
                    description="Abnormal energy consumption detected, inspection required",
                    maintenance_type=MaintenanceType.INSPECTION,
                    priority=Priority.HIGH,
                    location=await self.maintenance.get_asset_location(asset_id),
                    requested_by="energy_monitoring",
                    asset_id=asset_id,
                    estimated_hours=2.0
                )
    
    async def detect_energy_anomaly(self, asset_id: str, current_reading: float) -> bool:
        """Detect energy consumption anomalies"""
        async with self.maintenance.db_pool.acquire() as conn:
            # Get historical readings
            history = await conn.fetch('''
                SELECT energy_consumption
                FROM energy_monitoring
                WHERE asset_id = $1
                AND reading_date >= CURRENT_DATE - INTERVAL '30 days'
                ORDER BY reading_date DESC
                LIMIT 30
            ''', uuid.UUID(asset_id))
        
        if len(history) < 10:
            return False
        
        readings = [row['energy_consumption'] for row in history]
        mean = np.mean(readings)
        std = np.std(readings)
        
        # Detect if current reading is > 2 standard deviations from mean
        if std > 0:
            z_score = abs((current_reading - mean) / std)
            return z_score > 2
        
        return False