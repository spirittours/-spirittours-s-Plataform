"""
Transport Service Verification System with GPS Tracking
Complete fraud prevention and service verification
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from enum import Enum
import hashlib
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy import select, and_, or_, func

from ..services.gps_service import GPSService
from ..services.notification_service import NotificationService
from ..cache.redis_cache import RedisCache

logger = logging.getLogger(__name__)

Base = declarative_base()

# ===================== ENUMS =====================

class ServiceStatus(str, Enum):
    """Status of transport service"""
    SCHEDULED = "scheduled"
    DRIVER_ASSIGNED = "driver_assigned"
    DRIVER_EN_ROUTE = "driver_en_route"
    DRIVER_ARRIVED = "driver_arrived"
    PASSENGER_ONBOARD = "passenger_onboard"
    IN_TRANSIT = "in_transit"
    ARRIVED_DESTINATION = "arrived_destination"
    SERVICE_COMPLETED = "service_completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    DELAYED = "delayed"

class VerificationMethod(str, Enum):
    """Methods for service verification"""
    GPS_LOCATION = "gps_location"
    PHOTO_PROOF = "photo_proof"
    QR_CODE = "qr_code"
    PIN_CODE = "pin_code"
    DIGITAL_SIGNATURE = "digital_signature"
    FACE_RECOGNITION = "face_recognition"
    VOICE_CONFIRMATION = "voice_confirmation"

class AlertType(str, Enum):
    """Types of alerts in the system"""
    DRIVER_NOT_MOVING = "driver_not_moving"
    WRONG_ROUTE = "wrong_route"
    SERVICE_DELAYED = "service_delayed"
    NO_SHOW_RISK = "no_show_risk"
    FRAUD_SUSPECTED = "fraud_suspected"
    EMERGENCY = "emergency"
    PASSENGER_COMPLAINT = "passenger_complaint"

# ===================== MODELS =====================

class TransportService(Base):
    """Transport service record with full tracking"""
    __tablename__ = "transport_services"
    
    id = Column(Integer, primary_key=True)
    service_id = Column(String(100), unique=True, nullable=False)
    trip_id = Column(String(100), nullable=False)
    
    # Service details
    service_type = Column(String(50))  # airport_transfer, tour_transport, etc
    service_date = Column(DateTime, nullable=False)
    scheduled_pickup_time = Column(DateTime, nullable=False)
    scheduled_arrival_time = Column(DateTime)
    
    # Locations
    pickup_location = Column(JSON)  # {lat, lng, address, notes}
    dropoff_location = Column(JSON)  # {lat, lng, address, notes}
    route_waypoints = Column(JSON)  # List of waypoints
    
    # People involved
    passenger_id = Column(String(100), nullable=False)
    passenger_name = Column(String(200))
    passenger_phone = Column(String(50))
    passenger_count = Column(Integer, default=1)
    
    driver_id = Column(String(100))
    driver_name = Column(String(200))
    driver_phone = Column(String(50))
    vehicle_info = Column(JSON)  # {plate, model, color, capacity}
    
    # Status tracking
    status = Column(SQLEnum(ServiceStatus), default=ServiceStatus.SCHEDULED)
    
    # Actual times (for verification)
    actual_pickup_time = Column(DateTime)
    actual_arrival_time = Column(DateTime)
    driver_arrival_time = Column(DateTime)
    passenger_boarding_time = Column(DateTime)
    
    # GPS Tracking
    tracking_enabled = Column(Boolean, default=True)
    tracking_interval_seconds = Column(Integer, default=30)
    last_known_location = Column(JSON)  # {lat, lng, timestamp, speed}
    route_deviation_detected = Column(Boolean, default=False)
    
    # Verification
    pickup_verified = Column(Boolean, default=False)
    pickup_verification_method = Column(SQLEnum(VerificationMethod))
    pickup_verification_data = Column(JSON)
    
    dropoff_verified = Column(Boolean, default=False)
    dropoff_verification_method = Column(SQLEnum(VerificationMethod))
    dropoff_verification_data = Column(JSON)
    
    # Communication
    pin_code = Column(String(6))  # For passenger verification
    qr_code = Column(String(500))  # QR code data
    share_location_enabled = Column(Boolean, default=True)
    location_share_expires = Column(DateTime)
    
    # Quality metrics
    on_time_pickup = Column(Boolean)
    on_time_arrival = Column(Boolean)
    route_efficiency = Column(Float)  # Percentage of optimal route
    passenger_rating = Column(Integer)
    driver_rating = Column(Integer)
    
    # Issues and alerts
    alerts = Column(JSON)  # List of alerts raised
    issues_reported = Column(JSON)  # Any issues during service
    fraud_check_passed = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # Relationships
    location_history = relationship("LocationHistory", back_populates="service")
    verification_logs = relationship("VerificationLog", back_populates="service")
    service_alerts = relationship("ServiceAlert", back_populates="service")

class LocationHistory(Base):
    """GPS location history for transport services"""
    __tablename__ = "location_history"
    
    id = Column(Integer, primary_key=True)
    service_id = Column(Integer, ForeignKey("transport_services.id"), nullable=False)
    
    # Location data
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float)
    accuracy = Column(Float)  # GPS accuracy in meters
    speed = Column(Float)  # Speed in km/h
    heading = Column(Float)  # Direction of travel
    
    # Context
    stage = Column(String(50))  # pickup_approach, in_transit, etc
    distance_to_destination = Column(Float)  # Meters
    estimated_arrival = Column(DateTime)
    
    # Device info
    device_id = Column(String(100))
    battery_level = Column(Integer)
    network_type = Column(String(20))
    
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    service = relationship("TransportService", back_populates="location_history")

class VerificationLog(Base):
    """Log of all verification attempts and results"""
    __tablename__ = "verification_logs"
    
    id = Column(Integer, primary_key=True)
    service_id = Column(Integer, ForeignKey("transport_services.id"), nullable=False)
    
    # Verification details
    verification_type = Column(SQLEnum(VerificationMethod), nullable=False)
    verification_stage = Column(String(50))  # pickup, dropoff, checkpoint
    verified_by = Column(String(100))  # driver, passenger, system
    
    # Result
    success = Column(Boolean, nullable=False)
    failure_reason = Column(String(500))
    
    # Data
    verification_data = Column(JSON)  # Photo URL, GPS coords, etc
    location = Column(JSON)  # {lat, lng} where verification happened
    
    # Anti-fraud
    fraud_score = Column(Float)  # 0-100, higher = more suspicious
    fraud_indicators = Column(JSON)  # List of suspicious patterns
    
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    service = relationship("TransportService", back_populates="verification_logs")

class ServiceAlert(Base):
    """Alerts raised during transport service"""
    __tablename__ = "service_alerts"
    
    id = Column(Integer, primary_key=True)
    service_id = Column(Integer, ForeignKey("transport_services.id"), nullable=False)
    
    # Alert details
    alert_type = Column(SQLEnum(AlertType), nullable=False)
    severity = Column(String(20))  # low, medium, high, critical
    title = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Context
    location = Column(JSON)  # Where alert was triggered
    triggered_by = Column(String(50))  # system, driver, passenger, admin
    
    # Resolution
    resolved = Column(Boolean, default=False)
    resolved_by = Column(String(100))
    resolved_at = Column(DateTime)
    resolution_notes = Column(Text)
    
    # Notifications
    notifications_sent = Column(JSON)  # Who was notified
    escalated = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    service = relationship("TransportService", back_populates="service_alerts")

# ===================== TRANSPORT VERIFICATION SERVICE =====================

class TransportVerificationService:
    """Complete transport verification and fraud prevention system"""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.gps_service = GPSService()
        self.notification_service = NotificationService()
        self.cache = RedisCache()
        self.active_tracking: Dict[str, bool] = {}
        
    async def create_transport_service(
        self,
        trip_id: str,
        service_details: Dict[str, Any]
    ) -> TransportService:
        """Create a new transport service with verification setup"""
        
        # Generate unique codes
        service_id = f"TS-{trip_id}-{uuid.uuid4().hex[:8]}"
        pin_code = self._generate_pin_code()
        qr_code = self._generate_qr_code(service_id, pin_code)
        
        # Create service record
        service = TransportService(
            service_id=service_id,
            trip_id=trip_id,
            service_type=service_details.get('service_type', 'transfer'),
            service_date=service_details['service_date'],
            scheduled_pickup_time=service_details['pickup_time'],
            scheduled_arrival_time=service_details.get('arrival_time'),
            pickup_location=service_details['pickup_location'],
            dropoff_location=service_details['dropoff_location'],
            passenger_id=service_details['passenger_id'],
            passenger_name=service_details.get('passenger_name'),
            passenger_phone=service_details.get('passenger_phone'),
            passenger_count=service_details.get('passenger_count', 1),
            driver_id=service_details.get('driver_id'),
            driver_name=service_details.get('driver_name'),
            driver_phone=service_details.get('driver_phone'),
            vehicle_info=service_details.get('vehicle_info'),
            pin_code=pin_code,
            qr_code=qr_code,
            status=ServiceStatus.SCHEDULED,
            location_share_expires=datetime.utcnow() + timedelta(hours=24)
        )
        
        self.db.add(service)
        await self.db.commit()
        await self.db.refresh(service)
        
        # Send notifications
        await self._send_service_notifications(service, "created")
        
        return service
    
    async def verify_pickup(
        self,
        service_id: str,
        verification_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Verify pickup has occurred with fraud prevention"""
        
        # Get service
        query = select(TransportService).where(TransportService.service_id == service_id)
        result = await self.db.execute(query)
        service = result.scalar_one_or_none()
        
        if not service:
            return {"success": False, "error": "Service not found"}
        
        # Determine verification method
        method = VerificationMethod(verification_data['method'])
        
        # Perform verification based on method
        verification_result = await self._perform_verification(
            service, method, verification_data, "pickup"
        )
        
        if verification_result['success']:
            # Update service status
            service.pickup_verified = True
            service.pickup_verification_method = method
            service.pickup_verification_data = verification_data
            service.actual_pickup_time = datetime.utcnow()
            service.passenger_boarding_time = datetime.utcnow()
            service.status = ServiceStatus.PASSENGER_ONBOARD
            
            # Check if on time
            time_diff = abs((service.actual_pickup_time - service.scheduled_pickup_time).total_seconds())
            service.on_time_pickup = time_diff <= 600  # Within 10 minutes
            
            await self.db.commit()
            
            # Start active tracking
            await self.start_gps_tracking(service)
            
            # Notify relevant parties
            await self._send_service_notifications(service, "pickup_confirmed")
            
            return {
                "success": True,
                "message": "Pickup verified successfully",
                "service_status": service.status.value,
                "tracking_enabled": True
            }
        else:
            # Log failed verification
            await self._log_verification_failure(service, method, verification_data, "pickup")
            
            # Check for fraud
            fraud_score = await self._calculate_fraud_score(service, verification_data)
            
            if fraud_score > 70:
                await self._raise_fraud_alert(service, fraud_score, verification_data)
            
            return {
                "success": False,
                "error": verification_result['error'],
                "fraud_score": fraud_score
            }
    
    async def verify_dropoff(
        self,
        service_id: str,
        verification_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Verify dropoff/service completion"""
        
        # Get service
        query = select(TransportService).where(TransportService.service_id == service_id)
        result = await self.db.execute(query)
        service = result.scalar_one_or_none()
        
        if not service:
            return {"success": False, "error": "Service not found"}
        
        # Determine verification method
        method = VerificationMethod(verification_data['method'])
        
        # Perform verification
        verification_result = await self._perform_verification(
            service, method, verification_data, "dropoff"
        )
        
        if verification_result['success']:
            # Update service
            service.dropoff_verified = True
            service.dropoff_verification_method = method
            service.dropoff_verification_data = verification_data
            service.actual_arrival_time = datetime.utcnow()
            service.status = ServiceStatus.SERVICE_COMPLETED
            
            # Check if on time
            if service.scheduled_arrival_time:
                time_diff = abs((service.actual_arrival_time - service.scheduled_arrival_time).total_seconds())
                service.on_time_arrival = time_diff <= 900  # Within 15 minutes
            
            # Calculate route efficiency
            service.route_efficiency = await self._calculate_route_efficiency(service)
            
            await self.db.commit()
            
            # Stop tracking
            await self.stop_gps_tracking(service)
            
            # Send completion notifications
            await self._send_service_notifications(service, "service_completed")
            
            return {
                "success": True,
                "message": "Service completed successfully",
                "on_time": service.on_time_arrival,
                "route_efficiency": service.route_efficiency
            }
        else:
            return {
                "success": False,
                "error": verification_result['error']
            }
    
    async def update_driver_location(
        self,
        service_id: str,
        location: Tuple[float, float],
        additional_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Update driver's current location and check for issues"""
        
        # Get service
        query = select(TransportService).where(TransportService.service_id == service_id)
        result = await self.db.execute(query)
        service = result.scalar_one_or_none()
        
        if not service:
            return {"success": False, "error": "Service not found"}
        
        # Create location history entry
        location_entry = LocationHistory(
            service_id=service.id,
            latitude=location[0],
            longitude=location[1],
            speed=additional_data.get('speed') if additional_data else None,
            heading=additional_data.get('heading') if additional_data else None,
            accuracy=additional_data.get('accuracy') if additional_data else None,
            stage=self._determine_stage(service),
            device_id=additional_data.get('device_id') if additional_data else None,
            battery_level=additional_data.get('battery_level') if additional_data else None
        )
        
        self.db.add(location_entry)
        
        # Update last known location
        service.last_known_location = {
            'lat': location[0],
            'lng': location[1],
            'timestamp': datetime.utcnow().isoformat(),
            'speed': additional_data.get('speed') if additional_data else None
        }
        
        # Check for issues
        issues = await self._check_location_issues(service, location)
        
        if issues:
            for issue in issues:
                await self._create_alert(service, issue['type'], issue['description'])
        
        await self.db.commit()
        
        # Broadcast location to passengers if sharing enabled
        if service.share_location_enabled:
            await self._broadcast_driver_location(service, location)
        
        return {
            "success": True,
            "location_updated": True,
            "issues_detected": issues,
            "current_stage": self._determine_stage(service)
        }
    
    async def start_gps_tracking(self, service: TransportService):
        """Start active GPS tracking for a service"""
        
        self.active_tracking[service.service_id] = True
        
        # Start tracking loop
        asyncio.create_task(self._gps_tracking_loop(service))
        
        logger.info(f"Started GPS tracking for service {service.service_id}")
    
    async def stop_gps_tracking(self, service: TransportService):
        """Stop GPS tracking for a service"""
        
        self.active_tracking[service.service_id] = False
        
        logger.info(f"Stopped GPS tracking for service {service.service_id}")
    
    async def _gps_tracking_loop(self, service: TransportService):
        """Background loop for GPS tracking"""
        
        while self.active_tracking.get(service.service_id, False):
            try:
                # Wait for tracking interval
                await asyncio.sleep(service.tracking_interval_seconds)
                
                # Get current location from driver's device
                # This would be received via WebSocket or API in production
                
                # Check if driver is moving when they should be
                await self._check_driver_movement(service)
                
                # Check route deviation
                await self._check_route_deviation(service)
                
                # Update ETA
                await self._update_eta(service)
                
            except Exception as e:
                logger.error(f"Error in GPS tracking loop: {e}")
    
    async def _perform_verification(
        self,
        service: TransportService,
        method: VerificationMethod,
        data: Dict,
        stage: str
    ) -> Dict[str, Any]:
        """Perform verification based on method"""
        
        verification_log = VerificationLog(
            service_id=service.id,
            verification_type=method,
            verification_stage=stage,
            verified_by=data.get('verified_by', 'system'),
            verification_data=data,
            location=data.get('location')
        )
        
        success = False
        error = None
        
        if method == VerificationMethod.GPS_LOCATION:
            # Verify driver is at correct location
            driver_location = (data['latitude'], data['longitude'])
            expected_location = (
                service.pickup_location['lat'] if stage == 'pickup' else service.dropoff_location['lat'],
                service.pickup_location['lng'] if stage == 'pickup' else service.dropoff_location['lng']
            )
            
            distance = self._calculate_distance(driver_location, expected_location)
            
            if distance <= 50:  # Within 50 meters
                success = True
            else:
                error = f"Driver is {distance:.0f} meters away from {stage} location"
        
        elif method == VerificationMethod.PIN_CODE:
            # Verify PIN code
            if data.get('pin_code') == service.pin_code:
                success = True
            else:
                error = "Invalid PIN code"
        
        elif method == VerificationMethod.QR_CODE:
            # Verify QR code
            if data.get('qr_data') == service.qr_code:
                success = True
            else:
                error = "Invalid QR code"
        
        elif method == VerificationMethod.PHOTO_PROOF:
            # Store photo and mark as verified (would include AI verification in production)
            if data.get('photo_url'):
                success = True
            else:
                error = "No photo provided"
        
        elif method == VerificationMethod.DIGITAL_SIGNATURE:
            # Verify digital signature
            if self._verify_signature(data.get('signature'), service.service_id):
                success = True
            else:
                error = "Invalid signature"
        
        # Log verification attempt
        verification_log.success = success
        verification_log.failure_reason = error
        verification_log.fraud_score = await self._calculate_fraud_score(service, data)
        
        self.db.add(verification_log)
        await self.db.commit()
        
        return {"success": success, "error": error}
    
    def _generate_pin_code(self) -> str:
        """Generate 6-digit PIN code"""
        import random
        return ''.join([str(random.randint(0, 9)) for _ in range(6)])
    
    def _generate_qr_code(self, service_id: str, pin_code: str) -> str:
        """Generate QR code data"""
        qr_data = {
            "service_id": service_id,
            "pin": pin_code,
            "timestamp": datetime.utcnow().isoformat()
        }
        return hashlib.sha256(json.dumps(qr_data).encode()).hexdigest()
    
    def _verify_signature(self, signature: str, service_id: str) -> bool:
        """Verify digital signature"""
        # Simplified - in production would use proper cryptographic verification
        expected = hashlib.sha256(service_id.encode()).hexdigest()
        return signature == expected
    
    def _calculate_distance(self, loc1: Tuple[float, float], loc2: Tuple[float, float]) -> float:
        """Calculate distance between two points in meters"""
        import math
        R = 6371000  # Earth radius in meters
        lat1, lon1 = math.radians(loc1[0]), math.radians(loc1[1])
        lat2, lon2 = math.radians(loc2[0]), math.radians(loc2[1])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    def _determine_stage(self, service: TransportService) -> str:
        """Determine current stage of service"""
        if service.status == ServiceStatus.SCHEDULED:
            return "scheduled"
        elif service.status == ServiceStatus.DRIVER_EN_ROUTE:
            return "pickup_approach"
        elif service.status == ServiceStatus.DRIVER_ARRIVED:
            return "waiting_passenger"
        elif service.status in [ServiceStatus.PASSENGER_ONBOARD, ServiceStatus.IN_TRANSIT]:
            return "in_transit"
        elif service.status == ServiceStatus.ARRIVED_DESTINATION:
            return "arrived"
        else:
            return "completed"
    
    async def _check_location_issues(
        self,
        service: TransportService,
        location: Tuple[float, float]
    ) -> List[Dict]:
        """Check for location-related issues"""
        issues = []
        
        # Check if driver is on wrong route
        if service.status == ServiceStatus.IN_TRANSIT:
            on_route = await self._check_if_on_route(service, location)
            if not on_route:
                issues.append({
                    "type": AlertType.WRONG_ROUTE,
                    "description": "Driver appears to be off the planned route"
                })
        
        # Check if driver is not moving when they should be
        if service.status in [ServiceStatus.DRIVER_EN_ROUTE, ServiceStatus.IN_TRANSIT]:
            if service.last_known_location:
                last_loc = (
                    service.last_known_location['lat'],
                    service.last_known_location['lng']
                )
                distance_moved = self._calculate_distance(location, last_loc)
                
                if distance_moved < 10:  # Less than 10 meters
                    issues.append({
                        "type": AlertType.DRIVER_NOT_MOVING,
                        "description": "Driver has not moved significantly"
                    })
        
        return issues
    
    async def _check_if_on_route(
        self,
        service: TransportService,
        location: Tuple[float, float]
    ) -> bool:
        """Check if driver is on the planned route"""
        # Simplified - would use routing API in production
        return True  # Placeholder
    
    async def _check_driver_movement(self, service: TransportService):
        """Check if driver is moving appropriately"""
        if service.status in [ServiceStatus.DRIVER_EN_ROUTE, ServiceStatus.IN_TRANSIT]:
            # Check last few location entries
            query = select(LocationHistory).where(
                LocationHistory.service_id == service.id
            ).order_by(LocationHistory.timestamp.desc()).limit(5)
            
            result = await self.db.execute(query)
            recent_locations = result.scalars().all()
            
            if len(recent_locations) >= 3:
                # Check if positions are too similar (not moving)
                distances = []
                for i in range(len(recent_locations) - 1):
                    dist = self._calculate_distance(
                        (recent_locations[i].latitude, recent_locations[i].longitude),
                        (recent_locations[i+1].latitude, recent_locations[i+1].longitude)
                    )
                    distances.append(dist)
                
                avg_distance = sum(distances) / len(distances)
                
                if avg_distance < 5:  # Less than 5 meters average movement
                    await self._create_alert(
                        service,
                        AlertType.DRIVER_NOT_MOVING,
                        "Driver appears to be stationary"
                    )
    
    async def _check_route_deviation(self, service: TransportService):
        """Check if driver is deviating from planned route"""
        # Would integrate with routing API
        pass
    
    async def _update_eta(self, service: TransportService):
        """Update estimated time of arrival"""
        # Would calculate based on current location and traffic
        pass
    
    async def _calculate_fraud_score(
        self,
        service: TransportService,
        data: Dict
    ) -> float:
        """Calculate fraud score based on various indicators"""
        score = 0.0
        
        # Check if verification is happening too far from expected location
        if 'location' in data:
            expected_loc = (
                service.pickup_location['lat'],
                service.pickup_location['lng']
            )
            actual_loc = (data['location']['lat'], data['location']['lng'])
            distance = self._calculate_distance(expected_loc, actual_loc)
            
            if distance > 1000:  # More than 1km away
                score += 30
            elif distance > 500:  # More than 500m away
                score += 15
        
        # Check timing
        if service.status == ServiceStatus.SCHEDULED:
            time_until_pickup = (service.scheduled_pickup_time - datetime.utcnow()).total_seconds() / 60
            
            if time_until_pickup > 60:  # More than 1 hour early
                score += 20
            elif time_until_pickup < -30:  # More than 30 minutes late
                score += 25
        
        # Check verification attempts
        query = select(func.count(VerificationLog.id)).where(
            and_(
                VerificationLog.service_id == service.id,
                VerificationLog.success == False
            )
        )
        result = await self.db.execute(query)
        failed_attempts = result.scalar()
        
        if failed_attempts > 3:
            score += 30
        elif failed_attempts > 1:
            score += 15
        
        return min(score, 100.0)
    
    async def _calculate_route_efficiency(self, service: TransportService) -> float:
        """Calculate how efficient the route taken was"""
        # Would compare actual route to optimal route
        return 95.0  # Placeholder
    
    async def _create_alert(
        self,
        service: TransportService,
        alert_type: AlertType,
        description: str
    ):
        """Create an alert for a service"""
        alert = ServiceAlert(
            service_id=service.id,
            alert_type=alert_type,
            severity=self._determine_severity(alert_type),
            title=alert_type.value.replace('_', ' ').title(),
            description=description,
            triggered_by="system"
        )
        
        self.db.add(alert)
        await self.db.commit()
        
        # Send notifications based on severity
        if alert.severity in ['high', 'critical']:
            await self._send_alert_notifications(service, alert)
    
    def _determine_severity(self, alert_type: AlertType) -> str:
        """Determine severity of an alert type"""
        severity_map = {
            AlertType.DRIVER_NOT_MOVING: "medium",
            AlertType.WRONG_ROUTE: "high",
            AlertType.SERVICE_DELAYED: "medium",
            AlertType.NO_SHOW_RISK: "high",
            AlertType.FRAUD_SUSPECTED: "critical",
            AlertType.EMERGENCY: "critical",
            AlertType.PASSENGER_COMPLAINT: "high"
        }
        return severity_map.get(alert_type, "low")
    
    async def _raise_fraud_alert(
        self,
        service: TransportService,
        fraud_score: float,
        data: Dict
    ):
        """Raise a fraud alert"""
        await self._create_alert(
            service,
            AlertType.FRAUD_SUSPECTED,
            f"Fraud score: {fraud_score:.1f}. Suspicious activity detected."
        )
        
        service.fraud_check_passed = False
        await self.db.commit()
    
    async def _send_service_notifications(self, service: TransportService, event: str):
        """Send notifications for service events"""
        # Would integrate with notification service
        pass
    
    async def _send_alert_notifications(self, service: TransportService, alert: ServiceAlert):
        """Send notifications for alerts"""
        # Would integrate with notification service
        pass
    
    async def _broadcast_driver_location(self, service: TransportService, location: Tuple[float, float]):
        """Broadcast driver location to passengers"""
        # Would use WebSocket to send real-time updates
        pass
    
    async def _log_verification_failure(
        self,
        service: TransportService,
        method: VerificationMethod,
        data: Dict,
        stage: str
    ):
        """Log a failed verification attempt"""
        # Already handled in _perform_verification
        pass
    
    async def get_service_status(self, service_id: str) -> Dict[str, Any]:
        """Get complete status of a transport service"""
        query = select(TransportService).where(TransportService.service_id == service_id)
        result = await self.db.execute(query)
        service = result.scalar_one_or_none()
        
        if not service:
            return {"error": "Service not found"}
        
        # Get recent alerts
        alerts_query = select(ServiceAlert).where(
            and_(
                ServiceAlert.service_id == service.id,
                ServiceAlert.resolved == False
            )
        ).order_by(ServiceAlert.created_at.desc()).limit(5)
        
        alerts_result = await self.db.execute(alerts_query)
        alerts = alerts_result.scalars().all()
        
        return {
            "service_id": service.service_id,
            "status": service.status.value,
            "pickup_verified": service.pickup_verified,
            "dropoff_verified": service.dropoff_verified,
            "current_location": service.last_known_location,
            "on_time_pickup": service.on_time_pickup,
            "on_time_arrival": service.on_time_arrival,
            "active_alerts": [
                {
                    "type": alert.alert_type.value,
                    "severity": alert.severity,
                    "description": alert.description
                }
                for alert in alerts
            ],
            "tracking_active": service.service_id in self.active_tracking
        }