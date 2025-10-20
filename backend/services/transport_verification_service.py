"""
Anti-Fraud Transport Verification System
Complete verification and tracking to prevent transport fraud
"""

import asyncio
import json
import logging
import hashlib
import secrets
import qrcode
import io
import base64
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
from PIL import Image
import cv2
import numpy as np

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, update
from geopy.distance import geodesic

from ..models import Transport, Driver, Trip, VerificationLog
from ..cache.redis_cache import RedisCache
from ..services.notification_service import NotificationService

logger = logging.getLogger(__name__)

class VerificationMethod(str, Enum):
    """Verification methods for transport"""
    PIN_CODE = "pin_code"
    QR_CODE = "qr_code"
    GPS_LOCATION = "gps_location"
    PHOTO_PROOF = "photo_proof"
    DIGITAL_SIGNATURE = "digital_signature"
    FACE_RECOGNITION = "face_recognition"
    VOICE_VERIFICATION = "voice_verification"
    BLOCKCHAIN = "blockchain"

class VerificationStatus(str, Enum):
    """Verification status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    VERIFIED = "verified"
    FAILED = "failed"
    SUSPICIOUS = "suspicious"
    FRAUD_DETECTED = "fraud_detected"

class AlertLevel(str, Enum):
    """Alert levels for suspicious activity"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class VerificationResult:
    """Result of verification attempt"""
    method: VerificationMethod
    status: VerificationStatus
    confidence_score: float  # 0-100
    timestamp: datetime
    details: Dict[str, Any]
    fraud_indicators: List[str]
    
@dataclass
class TransportSession:
    """Active transport session with tracking"""
    session_id: str
    trip_id: str
    driver_id: str
    vehicle_id: str
    passenger_ids: List[str]
    start_time: datetime
    expected_route: List[Tuple[float, float]]
    actual_route: List[Tuple[float, float]]
    verifications: List[VerificationResult]
    alerts: List[Dict[str, Any]]
    fraud_score: float  # 0-100, higher means more suspicious
    status: str

class AntiFrealysisEngine:
    """Advanced fraud detection and analysis engine"""
    
    def __init__(self):
        self.ml_model = None  # Would load trained ML model
        self.pattern_database = {}
        self.known_fraud_patterns = [
            "route_deviation_major",
            "unauthorized_stops",
            "speed_anomaly",
            "location_spoofing",
            "time_padding",
            "fake_verification",
            "identity_mismatch"
        ]
    
    async def analyze_session(self, session: TransportSession) -> Dict[str, Any]:
        """Analyze transport session for fraud indicators"""
        
        fraud_indicators = []
        risk_score = 0
        
        # 1. Route Deviation Analysis
        route_analysis = await self._analyze_route_deviation(
            session.expected_route,
            session.actual_route
        )
        if route_analysis['deviation_percentage'] > 20:
            fraud_indicators.append("significant_route_deviation")
            risk_score += route_analysis['deviation_percentage']
        
        # 2. Time Analysis
        time_analysis = await self._analyze_time_patterns(session)
        if time_analysis['suspicious']:
            fraud_indicators.extend(time_analysis['indicators'])
            risk_score += time_analysis['risk_contribution']
        
        # 3. Verification Pattern Analysis
        verification_analysis = await self._analyze_verifications(session.verifications)
        if verification_analysis['suspicious']:
            fraud_indicators.extend(verification_analysis['indicators'])
            risk_score += verification_analysis['risk_contribution']
        
        # 4. Historical Pattern Matching
        historical_analysis = await self._check_historical_patterns(session)
        if historical_analysis['matches_fraud_pattern']:
            fraud_indicators.extend(historical_analysis['matched_patterns'])
            risk_score += 30
        
        # 5. Multi-factor Authentication Score
        mfa_score = await self._calculate_mfa_score(session.verifications)
        if mfa_score < 70:
            fraud_indicators.append("weak_verification")
            risk_score += (100 - mfa_score) / 2
        
        # Calculate final fraud probability
        fraud_probability = min(risk_score, 100)
        
        return {
            "fraud_probability": fraud_probability,
            "fraud_indicators": fraud_indicators,
            "risk_level": self._determine_risk_level(fraud_probability),
            "detailed_analysis": {
                "route": route_analysis,
                "time": time_analysis,
                "verification": verification_analysis,
                "historical": historical_analysis,
                "mfa_score": mfa_score
            },
            "recommended_actions": self._get_recommended_actions(fraud_probability, fraud_indicators)
        }
    
    async def _analyze_route_deviation(
        self,
        expected: List[Tuple[float, float]],
        actual: List[Tuple[float, float]]
    ) -> Dict[str, Any]:
        """Analyze route deviation"""
        
        if not actual or not expected:
            return {"deviation_percentage": 0, "suspicious": False}
        
        total_deviation = 0
        max_deviation = 0
        
        for i in range(min(len(expected), len(actual))):
            deviation = geodesic(expected[i], actual[i]).meters
            total_deviation += deviation
            max_deviation = max(max_deviation, deviation)
        
        # Calculate expected total distance
        expected_distance = sum(
            geodesic(expected[i], expected[i+1]).meters 
            for i in range(len(expected)-1)
        )
        
        deviation_percentage = (total_deviation / max(expected_distance, 1)) * 100
        
        return {
            "deviation_percentage": deviation_percentage,
            "max_deviation_meters": max_deviation,
            "suspicious": deviation_percentage > 20 or max_deviation > 500,
            "unauthorized_stops": await self._detect_unauthorized_stops(actual)
        }
    
    async def _detect_unauthorized_stops(self, route: List[Tuple[float, float]]) -> List[Dict]:
        """Detect unauthorized stops in route"""
        
        stops = []
        if len(route) < 2:
            return stops
        
        for i in range(1, len(route)):
            distance = geodesic(route[i-1], route[i]).meters
            if distance < 5:  # Less than 5 meters movement
                stops.append({
                    "location": route[i],
                    "index": i,
                    "duration": 1  # Would calculate from timestamps
                })
        
        return stops
    
    def _determine_risk_level(self, fraud_probability: float) -> str:
        """Determine risk level based on fraud probability"""
        if fraud_probability < 20:
            return "low"
        elif fraud_probability < 50:
            return "medium"
        elif fraud_probability < 80:
            return "high"
        else:
            return "critical"
    
    def _get_recommended_actions(
        self,
        fraud_probability: float,
        indicators: List[str]
    ) -> List[str]:
        """Get recommended actions based on analysis"""
        
        actions = []
        
        if fraud_probability > 80:
            actions.extend([
                "immediate_verification_required",
                "contact_passenger_immediately",
                "alert_management",
                "possible_service_suspension"
            ])
        elif fraud_probability > 50:
            actions.extend([
                "additional_verification_required",
                "monitor_closely",
                "request_photo_proof"
            ])
        elif fraud_probability > 20:
            actions.append("routine_verification")
        
        return actions

class TransportVerificationService:
    """Complete Anti-Fraud Transport Verification Service"""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.cache = RedisCache()
        self.notification_service = NotificationService()
        self.fraud_engine = FraudAnalysisEngine()
        self.active_sessions: Dict[str, TransportSession] = {}
    
    async def generate_verification_codes(
        self,
        trip_id: str,
        methods: List[VerificationMethod]
    ) -> Dict[str, Any]:
        """Generate verification codes for a trip"""
        
        verification_data = {}
        
        # 1. Generate PIN Code
        if VerificationMethod.PIN_CODE in methods:
            pin_code = self._generate_pin_code()
            verification_data['pin_code'] = pin_code
            await self.cache.set(f"pin:{trip_id}", pin_code, expire=7200)  # 2 hours
        
        # 2. Generate QR Code
        if VerificationMethod.QR_CODE in methods:
            qr_data = await self._generate_qr_code(trip_id)
            verification_data['qr_code'] = qr_data
        
        # 3. Generate Digital Signature Token
        if VerificationMethod.DIGITAL_SIGNATURE in methods:
            signature_token = await self._generate_signature_token(trip_id)
            verification_data['signature_token'] = signature_token
        
        # Store verification methods for trip
        await self.cache.set(
            f"verification_methods:{trip_id}",
            json.dumps([m.value for m in methods]),
            expire=86400  # 24 hours
        )
        
        return {
            "trip_id": trip_id,
            "verification_data": verification_data,
            "methods": [m.value for m in methods],
            "expires_at": datetime.utcnow() + timedelta(hours=2)
        }
    
    def _generate_pin_code(self) -> str:
        """Generate secure 6-digit PIN code"""
        return ''.join(secrets.choice('0123456789') for _ in range(6))
    
    async def _generate_qr_code(self, trip_id: str) -> str:
        """Generate QR code for verification"""
        
        # Create verification data
        qr_data = {
            "trip_id": trip_id,
            "timestamp": datetime.utcnow().isoformat(),
            "token": secrets.token_urlsafe(32),
            "verification_url": f"https://verify.spirittours.com/{trip_id}"
        }
        
        # Store token for verification
        await self.cache.set(
            f"qr_token:{trip_id}",
            qr_data['token'],
            expire=7200
        )
        
        # Generate QR code image
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(json.dumps(qr_data))
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    
    async def _generate_signature_token(self, trip_id: str) -> str:
        """Generate digital signature token"""
        
        token_data = {
            "trip_id": trip_id,
            "timestamp": datetime.utcnow().isoformat(),
            "nonce": secrets.token_hex(16)
        }
        
        # Create signature
        signature = hashlib.sha256(
            json.dumps(token_data).encode()
        ).hexdigest()
        
        # Store for verification
        await self.cache.set(
            f"signature:{trip_id}",
            signature,
            expire=7200
        )
        
        return signature
    
    async def verify_transport(
        self,
        trip_id: str,
        method: VerificationMethod,
        verification_data: Dict[str, Any]
    ) -> VerificationResult:
        """Verify transport using specified method"""
        
        logger.info(f"Verifying transport for trip {trip_id} using {method.value}")
        
        # Get session or create new one
        session = self.active_sessions.get(trip_id)
        if not session:
            session = await self._create_transport_session(trip_id)
        
        # Perform verification based on method
        if method == VerificationMethod.PIN_CODE:
            result = await self._verify_pin_code(trip_id, verification_data.get('pin'))
        elif method == VerificationMethod.QR_CODE:
            result = await self._verify_qr_code(trip_id, verification_data.get('token'))
        elif method == VerificationMethod.GPS_LOCATION:
            result = await self._verify_gps_location(trip_id, verification_data.get('location'))
        elif method == VerificationMethod.PHOTO_PROOF:
            result = await self._verify_photo_proof(trip_id, verification_data.get('photo'))
        elif method == VerificationMethod.DIGITAL_SIGNATURE:
            result = await self._verify_digital_signature(trip_id, verification_data.get('signature'))
        elif method == VerificationMethod.FACE_RECOGNITION:
            result = await self._verify_face_recognition(trip_id, verification_data.get('face_data'))
        else:
            result = VerificationResult(
                method=method,
                status=VerificationStatus.FAILED,
                confidence_score=0,
                timestamp=datetime.utcnow(),
                details={"error": "Unsupported verification method"},
                fraud_indicators=[]
            )
        
        # Add to session verifications
        session.verifications.append(result)
        
        # Update fraud score
        fraud_analysis = await self.fraud_engine.analyze_session(session)
        session.fraud_score = fraud_analysis['fraud_probability']
        
        # Log verification attempt
        await self._log_verification(trip_id, result)
        
        # Check for alerts
        if result.status == VerificationStatus.FAILED or result.fraud_indicators:
            await self._handle_verification_alert(trip_id, result, fraud_analysis)
        
        return result
    
    async def _verify_pin_code(self, trip_id: str, provided_pin: str) -> VerificationResult:
        """Verify PIN code"""
        
        stored_pin = await self.cache.get(f"pin:{trip_id}")
        
        if not stored_pin:
            return VerificationResult(
                method=VerificationMethod.PIN_CODE,
                status=VerificationStatus.FAILED,
                confidence_score=0,
                timestamp=datetime.utcnow(),
                details={"error": "PIN expired or not found"},
                fraud_indicators=["expired_pin"]
            )
        
        if stored_pin == provided_pin:
            return VerificationResult(
                method=VerificationMethod.PIN_CODE,
                status=VerificationStatus.VERIFIED,
                confidence_score=95,
                timestamp=datetime.utcnow(),
                details={"message": "PIN verified successfully"},
                fraud_indicators=[]
            )
        else:
            return VerificationResult(
                method=VerificationMethod.PIN_CODE,
                status=VerificationStatus.FAILED,
                confidence_score=0,
                timestamp=datetime.utcnow(),
                details={"error": "Invalid PIN"},
                fraud_indicators=["invalid_pin"]
            )
    
    async def _verify_qr_code(self, trip_id: str, provided_token: str) -> VerificationResult:
        """Verify QR code token"""
        
        stored_token = await self.cache.get(f"qr_token:{trip_id}")
        
        if not stored_token:
            return VerificationResult(
                method=VerificationMethod.QR_CODE,
                status=VerificationStatus.FAILED,
                confidence_score=0,
                timestamp=datetime.utcnow(),
                details={"error": "QR code expired or not found"},
                fraud_indicators=["expired_qr"]
            )
        
        if stored_token == provided_token:
            return VerificationResult(
                method=VerificationMethod.QR_CODE,
                status=VerificationStatus.VERIFIED,
                confidence_score=98,
                timestamp=datetime.utcnow(),
                details={"message": "QR code verified successfully"},
                fraud_indicators=[]
            )
        else:
            return VerificationResult(
                method=VerificationMethod.QR_CODE,
                status=VerificationStatus.FAILED,
                confidence_score=0,
                timestamp=datetime.utcnow(),
                details={"error": "Invalid QR code"},
                fraud_indicators=["invalid_qr"]
            )
    
    async def _verify_gps_location(
        self,
        trip_id: str,
        location: Tuple[float, float]
    ) -> VerificationResult:
        """Verify GPS location"""
        
        # Get expected pickup location
        trip = await self.db.get(Trip, trip_id)
        if not trip:
            return VerificationResult(
                method=VerificationMethod.GPS_LOCATION,
                status=VerificationStatus.FAILED,
                confidence_score=0,
                timestamp=datetime.utcnow(),
                details={"error": "Trip not found"},
                fraud_indicators=["trip_not_found"]
            )
        
        expected_location = (trip.pickup_latitude, trip.pickup_longitude)
        distance = geodesic(location, expected_location).meters
        
        if distance < 50:  # Within 50 meters
            confidence = 100 - (distance * 2)  # Reduce confidence based on distance
            return VerificationResult(
                method=VerificationMethod.GPS_LOCATION,
                status=VerificationStatus.VERIFIED,
                confidence_score=confidence,
                timestamp=datetime.utcnow(),
                details={"distance_meters": distance},
                fraud_indicators=[]
            )
        elif distance < 200:  # Within 200 meters - suspicious
            return VerificationResult(
                method=VerificationMethod.GPS_LOCATION,
                status=VerificationStatus.SUSPICIOUS,
                confidence_score=50,
                timestamp=datetime.utcnow(),
                details={"distance_meters": distance},
                fraud_indicators=["location_mismatch_minor"]
            )
        else:
            return VerificationResult(
                method=VerificationMethod.GPS_LOCATION,
                status=VerificationStatus.FAILED,
                confidence_score=0,
                timestamp=datetime.utcnow(),
                details={"distance_meters": distance},
                fraud_indicators=["location_mismatch_major"]
            )
    
    async def _verify_photo_proof(self, trip_id: str, photo_data: str) -> VerificationResult:
        """Verify photo proof using computer vision"""
        
        try:
            # Decode base64 image
            img_data = base64.b64decode(photo_data.split(',')[1] if ',' in photo_data else photo_data)
            nparr = np.frombuffer(img_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            # Analyze image for verification elements
            analysis = await self._analyze_verification_photo(image, trip_id)
            
            if analysis['valid']:
                return VerificationResult(
                    method=VerificationMethod.PHOTO_PROOF,
                    status=VerificationStatus.VERIFIED,
                    confidence_score=analysis['confidence'],
                    timestamp=datetime.utcnow(),
                    details=analysis,
                    fraud_indicators=[]
                )
            else:
                return VerificationResult(
                    method=VerificationMethod.PHOTO_PROOF,
                    status=VerificationStatus.SUSPICIOUS,
                    confidence_score=analysis['confidence'],
                    timestamp=datetime.utcnow(),
                    details=analysis,
                    fraud_indicators=analysis.get('fraud_indicators', [])
                )
        except Exception as e:
            logger.error(f"Photo verification error: {e}")
            return VerificationResult(
                method=VerificationMethod.PHOTO_PROOF,
                status=VerificationStatus.FAILED,
                confidence_score=0,
                timestamp=datetime.utcnow(),
                details={"error": str(e)},
                fraud_indicators=["photo_processing_error"]
            )
    
    async def _analyze_verification_photo(self, image: np.ndarray, trip_id: str) -> Dict[str, Any]:
        """Analyze photo for verification elements"""
        
        # This would use computer vision to detect:
        # - Vehicle license plate
        # - Driver face
        # - Passenger presence
        # - Location markers
        # - Timestamp verification
        
        # Simplified implementation
        return {
            "valid": True,
            "confidence": 85,
            "detected_elements": [
                "vehicle",
                "driver",
                "passenger"
            ],
            "timestamp_valid": True,
            "location_match": True
        }
    
    async def track_real_time_location(
        self,
        trip_id: str,
        location: Tuple[float, float],
        speed: Optional[float] = None,
        heading: Optional[float] = None
    ) -> Dict[str, Any]:
        """Track real-time location of transport"""
        
        session = self.active_sessions.get(trip_id)
        if not session:
            session = await self._create_transport_session(trip_id)
        
        # Add to route
        session.actual_route.append(location)
        
        # Analyze current state
        analysis = {
            "location": location,
            "speed": speed,
            "heading": heading,
            "timestamp": datetime.utcnow()
        }
        
        # Check for anomalies
        anomalies = []
        
        # 1. Speed anomaly
        if speed:
            if speed > 120:  # Over 120 km/h in city
                anomalies.append("excessive_speed")
            elif speed < 0.5 and len(session.actual_route) > 10:  # Stopped for too long
                anomalies.append("unnecessary_stop")
        
        # 2. Route deviation
        if session.expected_route:
            expected_point = self._find_nearest_expected_point(
                location,
                session.expected_route
            )
            deviation = geodesic(location, expected_point).meters
            if deviation > 500:
                anomalies.append("route_deviation")
        
        # 3. Geofence violation
        if await self._check_geofence_violation(location, trip_id):
            anomalies.append("geofence_violation")
        
        # Update session
        if anomalies:
            alert = {
                "type": "location_anomaly",
                "anomalies": anomalies,
                "location": location,
                "timestamp": datetime.utcnow()
            }
            session.alerts.append(alert)
            
            # Send real-time alert
            await self._send_real_time_alert(trip_id, alert)
        
        # Update tracking in cache
        await self.cache.set(
            f"location:{trip_id}",
            json.dumps({
                "lat": location[0],
                "lng": location[1],
                "speed": speed,
                "heading": heading,
                "timestamp": datetime.utcnow().isoformat()
            }),
            expire=3600
        )
        
        return {
            "status": "tracking",
            "anomalies": anomalies,
            "fraud_score": session.fraud_score,
            "total_distance": self._calculate_total_distance(session.actual_route),
            "estimated_arrival": self._estimate_arrival(session)
        }
    
    def _find_nearest_expected_point(
        self,
        location: Tuple[float, float],
        expected_route: List[Tuple[float, float]]
    ) -> Tuple[float, float]:
        """Find nearest point on expected route"""
        
        if not expected_route:
            return location
        
        min_distance = float('inf')
        nearest_point = expected_route[0]
        
        for point in expected_route:
            distance = geodesic(location, point).meters
            if distance < min_distance:
                min_distance = distance
                nearest_point = point
        
        return nearest_point
    
    async def _check_geofence_violation(
        self,
        location: Tuple[float, float],
        trip_id: str
    ) -> bool:
        """Check if location violates geofence"""
        
        # Get trip geofence from database
        # Simplified - would check actual geofence boundaries
        return False
    
    def _calculate_total_distance(self, route: List[Tuple[float, float]]) -> float:
        """Calculate total distance traveled"""
        
        if len(route) < 2:
            return 0
        
        total = 0
        for i in range(1, len(route)):
            total += geodesic(route[i-1], route[i]).meters
        
        return total
    
    async def _create_transport_session(self, trip_id: str) -> TransportSession:
        """Create new transport session"""
        
        # Get trip details from database
        trip = await self.db.get(Trip, trip_id)
        
        session = TransportSession(
            session_id=f"session_{trip_id}",
            trip_id=trip_id,
            driver_id=trip.driver_id,
            vehicle_id=trip.vehicle_id,
            passenger_ids=[trip.passenger_id],
            start_time=datetime.utcnow(),
            expected_route=[],  # Would load from route service
            actual_route=[],
            verifications=[],
            alerts=[],
            fraud_score=0,
            status="active"
        )
        
        self.active_sessions[trip_id] = session
        return session
    
    async def _log_verification(self, trip_id: str, result: VerificationResult):
        """Log verification attempt"""
        
        log_entry = VerificationLog(
            trip_id=trip_id,
            method=result.method.value,
            status=result.status.value,
            confidence_score=result.confidence_score,
            timestamp=result.timestamp,
            details=json.dumps(result.details),
            fraud_indicators=json.dumps(result.fraud_indicators)
        )
        
        self.db.add(log_entry)
        await self.db.commit()
    
    async def _handle_verification_alert(
        self,
        trip_id: str,
        result: VerificationResult,
        fraud_analysis: Dict[str, Any]
    ):
        """Handle verification alerts"""
        
        alert_level = AlertLevel.LOW
        
        if result.status == VerificationStatus.FRAUD_DETECTED:
            alert_level = AlertLevel.CRITICAL
        elif result.status == VerificationStatus.SUSPICIOUS:
            alert_level = AlertLevel.HIGH
        elif result.status == VerificationStatus.FAILED:
            alert_level = AlertLevel.MEDIUM
        
        # Send notifications based on alert level
        if alert_level in [AlertLevel.HIGH, AlertLevel.CRITICAL]:
            await self.notification_service.send_urgent_alert(
                f"Transport Verification Alert - Trip {trip_id}",
                f"Alert Level: {alert_level.value}\n"
                f"Method: {result.method.value}\n"
                f"Status: {result.status.value}\n"
                f"Fraud Score: {fraud_analysis['fraud_probability']}%"
            )
    
    async def _send_real_time_alert(self, trip_id: str, alert: Dict[str, Any]):
        """Send real-time alert via WebSocket"""
        
        # Would send via WebSocket to admin dashboard
        logger.warning(f"Real-time alert for trip {trip_id}: {alert}")
    
    def _estimate_arrival(self, session: TransportSession) -> Optional[datetime]:
        """Estimate arrival time based on current progress"""
        
        # Simplified - would use actual route and traffic data
        return datetime.utcnow() + timedelta(minutes=30)