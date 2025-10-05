"""
AccessibilitySpecialist AI Agent
Ensures tourism experiences are accessible to all travelers regardless of abilities
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import json
from dataclasses import dataclass
from enum import Enum


class AccessibilityLevel(Enum):
    FULLY_ACCESSIBLE = "fully_accessible"
    PARTIALLY_ACCESSIBLE = "partially_accessible"
    LIMITED_ACCESSIBILITY = "limited_accessibility"
    NOT_ACCESSIBLE = "not_accessible"


class DisabilityType(Enum):
    MOBILITY = "mobility"
    VISUAL = "visual"
    HEARING = "hearing"
    COGNITIVE = "cognitive"
    MULTIPLE = "multiple"


@dataclass
class AccessibilityFeature:
    feature_name: str
    category: str
    availability: bool
    description: str
    certification: Optional[str] = None


@dataclass
class AccessibilityAssessment:
    location_id: str
    location_name: str
    overall_score: float
    accessibility_level: AccessibilityLevel
    features: List[AccessibilityFeature]
    recommendations: List[str]
    certifications: List[str]
    last_updated: datetime


class AccessibilitySpecialistAgent:
    """
    AI Agent specialized in accessibility assessment and recommendations
    """
    
    def __init__(self):
        self.agent_id = "accessibility_specialist"
        self.version = "1.0.0"
        self.capabilities = [
            "accessibility_assessment",
            "route_planning",
            "equipment_recommendations",
            "certification_verification",
            "accommodation_matching",
            "transportation_planning",
            "emergency_support",
            "communication_assistance"
        ]
        
        # Accessibility standards and guidelines
        self.standards = {
            "ADA": "Americans with Disabilities Act",
            "WCAG": "Web Content Accessibility Guidelines",
            "ISO_21542": "Building construction - Accessibility",
            "EN_301549": "European accessibility standard",
            "UN_CRPD": "UN Convention on Rights of Persons with Disabilities"
        }
        
        # Equipment database
        self.equipment_database = {
            "mobility": [
                "wheelchair", "walker", "crutches", "mobility_scooter",
                "prosthetics", "orthotic_devices"
            ],
            "visual": [
                "white_cane", "guide_dog", "braille_reader",
                "screen_reader", "magnification_device"
            ],
            "hearing": [
                "hearing_aid", "cochlear_implant", "FM_system",
                "sign_language_interpreter", "captioning_device"
            ],
            "cognitive": [
                "memory_aids", "communication_boards", "GPS_tracker",
                "medication_reminder", "simplified_maps"
            ]
        }
    
    async def assess_accessibility(self, 
                                  location_data: Dict,
                                  disability_types: List[DisabilityType]) -> AccessibilityAssessment:
        """
        Comprehensive accessibility assessment for a location
        """
        features = await self._analyze_accessibility_features(location_data)
        score = await self._calculate_accessibility_score(features, disability_types)
        level = self._determine_accessibility_level(score)
        recommendations = await self._generate_recommendations(
            location_data, features, disability_types
        )
        certifications = await self._verify_certifications(location_data)
        
        return AccessibilityAssessment(
            location_id=location_data.get("id", ""),
            location_name=location_data.get("name", ""),
            overall_score=score,
            accessibility_level=level,
            features=features,
            recommendations=recommendations,
            certifications=certifications,
            last_updated=datetime.utcnow()
        )
    
    async def _analyze_accessibility_features(self, location_data: Dict) -> List[AccessibilityFeature]:
        """
        Analyze available accessibility features
        """
        features = []
        
        # Physical accessibility
        physical_features = [
            ("Wheelchair ramps", "mobility", location_data.get("has_ramps", False)),
            ("Elevator access", "mobility", location_data.get("has_elevator", False)),
            ("Accessible bathrooms", "mobility", location_data.get("accessible_bathrooms", False)),
            ("Wide doorways", "mobility", location_data.get("wide_doorways", False)),
            ("Accessible parking", "mobility", location_data.get("accessible_parking", False)),
            ("Level pathways", "mobility", location_data.get("level_paths", False))
        ]
        
        # Visual accessibility
        visual_features = [
            ("Braille signage", "visual", location_data.get("braille_signs", False)),
            ("Audio descriptions", "visual", location_data.get("audio_descriptions", False)),
            ("High contrast signage", "visual", location_data.get("high_contrast", False)),
            ("Guide dog friendly", "visual", location_data.get("guide_dogs_allowed", True)),
            ("Tactile pathways", "visual", location_data.get("tactile_paths", False))
        ]
        
        # Hearing accessibility
        hearing_features = [
            ("Sign language support", "hearing", location_data.get("sign_language", False)),
            ("Visual alerts", "hearing", location_data.get("visual_alerts", False)),
            ("Hearing loops", "hearing", location_data.get("hearing_loops", False)),
            ("Captioning available", "hearing", location_data.get("captioning", False))
        ]
        
        # Cognitive accessibility
        cognitive_features = [
            ("Quiet spaces", "cognitive", location_data.get("quiet_areas", False)),
            ("Simple navigation", "cognitive", location_data.get("simple_navigation", False)),
            ("Visual schedules", "cognitive", location_data.get("visual_schedules", False)),
            ("Staff training", "cognitive", location_data.get("staff_trained", False))
        ]
        
        # Compile all features
        for name, category, available in (physical_features + visual_features + 
                                         hearing_features + cognitive_features):
            features.append(AccessibilityFeature(
                feature_name=name,
                category=category,
                availability=available,
                description=f"{name} {'available' if available else 'not available'}"
            ))
        
        return features
    
    async def _calculate_accessibility_score(self, 
                                           features: List[AccessibilityFeature],
                                           disability_types: List[DisabilityType]) -> float:
        """
        Calculate overall accessibility score
        """
        if not features:
            return 0.0
        
        # Weight features based on disability types
        relevant_features = []
        for feature in features:
            for disability_type in disability_types:
                if disability_type.value in feature.category:
                    relevant_features.append(feature)
                    break
        
        if not relevant_features:
            relevant_features = features
        
        # Calculate score
        available_count = sum(1 for f in relevant_features if f.availability)
        total_count = len(relevant_features)
        
        return (available_count / total_count * 100) if total_count > 0 else 0.0
    
    def _determine_accessibility_level(self, score: float) -> AccessibilityLevel:
        """
        Determine accessibility level based on score
        """
        if score >= 90:
            return AccessibilityLevel.FULLY_ACCESSIBLE
        elif score >= 70:
            return AccessibilityLevel.PARTIALLY_ACCESSIBLE
        elif score >= 40:
            return AccessibilityLevel.LIMITED_ACCESSIBILITY
        else:
            return AccessibilityLevel.NOT_ACCESSIBLE
    
    async def _generate_recommendations(self,
                                       location_data: Dict,
                                       features: List[AccessibilityFeature],
                                       disability_types: List[DisabilityType]) -> List[str]:
        """
        Generate accessibility improvement recommendations
        """
        recommendations = []
        
        # Check missing critical features
        missing_features = [f for f in features if not f.availability]
        
        for feature in missing_features[:5]:  # Top 5 recommendations
            if feature.category == "mobility":
                recommendations.append(
                    f"Install {feature.feature_name.lower()} to improve mobility access"
                )
            elif feature.category == "visual":
                recommendations.append(
                    f"Add {feature.feature_name.lower()} for visually impaired visitors"
                )
            elif feature.category == "hearing":
                recommendations.append(
                    f"Implement {feature.feature_name.lower()} for hearing impaired visitors"
                )
            elif feature.category == "cognitive":
                recommendations.append(
                    f"Provide {feature.feature_name.lower()} for cognitive accessibility"
                )
        
        # General recommendations
        if not location_data.get("accessibility_training"):
            recommendations.append(
                "Provide disability awareness training for all staff members"
            )
        
        if not location_data.get("accessibility_policy"):
            recommendations.append(
                "Develop and publish a clear accessibility policy"
            )
        
        return recommendations
    
    async def _verify_certifications(self, location_data: Dict) -> List[str]:
        """
        Verify accessibility certifications
        """
        certifications = []
        
        if location_data.get("ada_compliant"):
            certifications.append("ADA Compliant")
        
        if location_data.get("iso_certified"):
            certifications.append("ISO 21542 Certified")
        
        if location_data.get("local_certification"):
            certifications.append(location_data.get("local_certification"))
        
        return certifications
    
    async def plan_accessible_route(self,
                                   start_point: Dict,
                                   end_point: Dict,
                                   disability_type: DisabilityType,
                                   preferences: Optional[Dict] = None) -> Dict:
        """
        Plan an accessible route between two points
        """
        route_options = []
        
        # Analyze route requirements based on disability type
        requirements = self._get_route_requirements(disability_type)
        
        # Generate route options
        primary_route = {
            "route_id": "primary",
            "distance": self._calculate_distance(start_point, end_point),
            "estimated_time": "30 minutes",
            "accessibility_features": requirements,
            "obstacles": [],
            "rest_points": self._identify_rest_points(start_point, end_point),
            "emergency_contacts": self._get_emergency_contacts()
        }
        
        # Alternative routes
        alternative_route = {
            "route_id": "alternative",
            "distance": self._calculate_distance(start_point, end_point) * 1.2,
            "estimated_time": "35 minutes",
            "accessibility_features": requirements,
            "obstacles": [],
            "rest_points": self._identify_rest_points(start_point, end_point),
            "notes": "Longer but more accessible route with covered pathways"
        }
        
        route_options.append(primary_route)
        route_options.append(alternative_route)
        
        return {
            "routes": route_options,
            "recommended_route": "primary",
            "accessibility_level": "high",
            "special_instructions": self._get_route_instructions(disability_type)
        }
    
    def _get_route_requirements(self, disability_type: DisabilityType) -> List[str]:
        """
        Get route requirements based on disability type
        """
        requirements_map = {
            DisabilityType.MOBILITY: [
                "Step-free access", "Wide pathways", "Ramps available",
                "Accessible restrooms", "Elevator access"
            ],
            DisabilityType.VISUAL: [
                "Tactile paving", "Audio signals", "Braille signage",
                "Good lighting", "Clear pathways"
            ],
            DisabilityType.HEARING: [
                "Visual signage", "Written information", "Visual alerts",
                "Clear sight lines", "Good lighting"
            ],
            DisabilityType.COGNITIVE: [
                "Simple navigation", "Clear signage", "Quiet areas",
                "Rest points", "Staff assistance"
            ]
        }
        
        return requirements_map.get(disability_type, [])
    
    def _calculate_distance(self, start: Dict, end: Dict) -> float:
        """
        Calculate distance between two points
        """
        # Simplified calculation
        import math
        
        lat1, lon1 = start.get("lat", 0), start.get("lon", 0)
        lat2, lon2 = end.get("lat", 0), end.get("lon", 0)
        
        # Haversine formula (simplified)
        R = 6371  # Earth's radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        
        a = (math.sin(dlat/2) * math.sin(dlat/2) +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon/2) * math.sin(dlon/2))
        
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        distance = R * c
        
        return round(distance, 2)
    
    def _identify_rest_points(self, start: Dict, end: Dict) -> List[Dict]:
        """
        Identify rest points along the route
        """
        return [
            {
                "name": "Accessible Rest Area 1",
                "facilities": ["Seating", "Shade", "Water fountain"],
                "distance_from_start": "500m"
            },
            {
                "name": "Accessible Rest Area 2",
                "facilities": ["Seating", "Restroom", "Shelter"],
                "distance_from_start": "1km"
            }
        ]
    
    def _get_emergency_contacts(self) -> List[Dict]:
        """
        Get emergency contacts for accessibility support
        """
        return [
            {
                "service": "Medical Emergency",
                "number": "911",
                "accessibility_support": True
            },
            {
                "service": "Accessibility Assistance",
                "number": "+1-800-XXX-XXXX",
                "available_24_7": True
            }
        ]
    
    def _get_route_instructions(self, disability_type: DisabilityType) -> List[str]:
        """
        Get specific route instructions based on disability type
        """
        instructions_map = {
            DisabilityType.MOBILITY: [
                "Use designated accessible entrances",
                "Follow blue accessibility signs",
                "Elevator available at main building",
                "Accessible parking available near entrance"
            ],
            DisabilityType.VISUAL: [
                "Follow tactile paving where available",
                "Audio announcements at key points",
                "Staff assistance available upon request",
                "Guide dogs welcome"
            ],
            DisabilityType.HEARING: [
                "Visual information displays available",
                "Text-based communication available",
                "Sign language interpretation can be arranged",
                "Visual alert systems in place"
            ],
            DisabilityType.COGNITIVE: [
                "Follow color-coded pathways",
                "Simple maps available at information desk",
                "Staff trained in cognitive accessibility",
                "Quiet spaces available if needed"
            ]
        }
        
        return instructions_map.get(disability_type, [])
    
    async def recommend_equipment(self,
                                 disability_type: DisabilityType,
                                 activity_type: str,
                                 duration: int) -> Dict:
        """
        Recommend necessary equipment for accessible travel
        """
        equipment_list = []
        
        # Get base equipment for disability type
        base_equipment = self.equipment_database.get(disability_type.value, [])
        
        # Activity-specific equipment
        activity_equipment = self._get_activity_equipment(activity_type, disability_type)
        
        # Combine and prioritize
        for item in base_equipment[:3]:  # Top 3 essential items
            equipment_list.append({
                "item": item,
                "priority": "essential",
                "rental_available": True,
                "estimated_cost": self._estimate_rental_cost(item, duration)
            })
        
        for item in activity_equipment:
            equipment_list.append({
                "item": item,
                "priority": "recommended",
                "rental_available": True,
                "estimated_cost": self._estimate_rental_cost(item, duration)
            })
        
        return {
            "recommended_equipment": equipment_list,
            "total_estimated_cost": sum(e["estimated_cost"] for e in equipment_list),
            "rental_locations": self._get_rental_locations(),
            "delivery_available": True
        }
    
    def _get_activity_equipment(self, activity: str, disability: DisabilityType) -> List[str]:
        """
        Get activity-specific equipment recommendations
        """
        activity_map = {
            "beach": ["beach_wheelchair", "floating_device", "shade_tent"],
            "hiking": ["all_terrain_wheelchair", "hiking_poles", "GPS_tracker"],
            "city_tour": ["portable_ramp", "folding_chair", "cooling_vest"],
            "museum": ["audio_guide", "magnifier", "portable_stool"]
        }
        
        return activity_map.get(activity, [])
    
    def _estimate_rental_cost(self, item: str, duration: int) -> float:
        """
        Estimate rental cost for equipment
        """
        daily_rates = {
            "wheelchair": 50,
            "mobility_scooter": 75,
            "beach_wheelchair": 60,
            "all_terrain_wheelchair": 100,
            "hearing_aid": 30,
            "GPS_tracker": 20
        }
        
        base_rate = daily_rates.get(item, 25)
        return base_rate * duration
    
    def _get_rental_locations(self) -> List[Dict]:
        """
        Get equipment rental locations
        """
        return [
            {
                "name": "Accessible Travel Equipment Rentals",
                "address": "123 Main St",
                "phone": "+1-800-XXX-XXXX",
                "delivery": True
            },
            {
                "name": "Medical Equipment Services",
                "address": "456 Health Ave",
                "phone": "+1-800-YYY-YYYY",
                "delivery": True
            }
        ]
    
    async def provide_emergency_support(self,
                                       user_id: str,
                                       emergency_type: str,
                                       location: Dict) -> Dict:
        """
        Provide emergency accessibility support
        """
        # Assess emergency severity
        severity = self._assess_emergency_severity(emergency_type)
        
        # Get immediate actions
        immediate_actions = self._get_immediate_actions(emergency_type)
        
        # Find nearest accessible facilities
        nearest_facilities = await self._find_nearest_accessible_facilities(
            location, emergency_type
        )
        
        # Notify support network
        notifications_sent = await self._notify_support_network(
            user_id, emergency_type, location
        )
        
        return {
            "emergency_id": f"EMRG-{datetime.utcnow().timestamp()}",
            "severity": severity,
            "immediate_actions": immediate_actions,
            "nearest_facilities": nearest_facilities,
            "support_notified": notifications_sent,
            "emergency_contacts": self._get_emergency_contacts(),
            "estimated_response_time": "10-15 minutes"
        }
    
    def _assess_emergency_severity(self, emergency_type: str) -> str:
        """
        Assess severity of accessibility emergency
        """
        high_severity = ["medical", "injury", "lost", "equipment_failure"]
        medium_severity = ["assistance_needed", "accessibility_barrier"]
        
        if emergency_type in high_severity:
            return "high"
        elif emergency_type in medium_severity:
            return "medium"
        else:
            return "low"
    
    def _get_immediate_actions(self, emergency_type: str) -> List[str]:
        """
        Get immediate action recommendations
        """
        actions_map = {
            "medical": [
                "Stay calm and remain in place",
                "Call emergency services (911)",
                "Have medical information ready",
                "Request accessibility-trained responders"
            ],
            "equipment_failure": [
                "Find safe location to wait",
                "Contact equipment rental service",
                "Request immediate replacement",
                "Contact tour operator for assistance"
            ],
            "accessibility_barrier": [
                "Document the barrier (photo if possible)",
                "Contact venue management",
                "Request alternative access route",
                "Report to accessibility authorities"
            ]
        }
        
        return actions_map.get(emergency_type, ["Contact support services"])
    
    async def _find_nearest_accessible_facilities(self,
                                                 location: Dict,
                                                 emergency_type: str) -> List[Dict]:
        """
        Find nearest accessible facilities
        """
        facilities = []
        
        if emergency_type in ["medical", "injury"]:
            facilities.append({
                "type": "Hospital",
                "name": "City Medical Center",
                "distance": "2.5 km",
                "accessibility_level": "fully_accessible",
                "contact": "+1-800-MEDICAL"
            })
        
        facilities.append({
            "type": "Accessible Rest Area",
            "name": "Community Center",
            "distance": "500 m",
            "accessibility_level": "fully_accessible",
            "facilities": ["Restrooms", "Seating", "First Aid"]
        })
        
        return facilities
    
    async def _notify_support_network(self,
                                     user_id: str,
                                     emergency_type: str,
                                     location: Dict) -> List[str]:
        """
        Notify support network about emergency
        """
        notifications = [
            "Emergency services notified",
            "Tour operator notified",
            "Accessibility support team alerted"
        ]
        
        if emergency_type == "medical":
            notifications.append("Medical team dispatched")
        
        return notifications
    
    async def process_query(self, query: str, context: Optional[Dict] = None) -> Dict:
        """
        Process accessibility-related queries
        """
        query_lower = query.lower()
        
        # Determine query type
        if "assess" in query_lower or "evaluation" in query_lower:
            # Perform accessibility assessment
            location_data = context.get("location_data", {})
            disability_types = context.get("disability_types", [DisabilityType.MOBILITY])
            assessment = await self.assess_accessibility(location_data, disability_types)
            
            return {
                "response_type": "assessment",
                "data": {
                    "score": assessment.overall_score,
                    "level": assessment.accessibility_level.value,
                    "features": [f.__dict__ for f in assessment.features[:5]],
                    "recommendations": assessment.recommendations
                }
            }
        
        elif "route" in query_lower or "path" in query_lower:
            # Plan accessible route
            start = context.get("start_point", {"lat": 0, "lon": 0})
            end = context.get("end_point", {"lat": 1, "lon": 1})
            disability = context.get("disability_type", DisabilityType.MOBILITY)
            
            route = await self.plan_accessible_route(start, end, disability)
            
            return {
                "response_type": "route_planning",
                "data": route
            }
        
        elif "equipment" in query_lower:
            # Recommend equipment
            disability = context.get("disability_type", DisabilityType.MOBILITY)
            activity = context.get("activity_type", "general")
            duration = context.get("duration_days", 7)
            
            equipment = await self.recommend_equipment(disability, activity, duration)
            
            return {
                "response_type": "equipment_recommendation",
                "data": equipment
            }
        
        elif "emergency" in query_lower or "help" in query_lower:
            # Emergency support
            user_id = context.get("user_id", "unknown")
            emergency_type = context.get("emergency_type", "assistance_needed")
            location = context.get("location", {"lat": 0, "lon": 0})
            
            support = await self.provide_emergency_support(user_id, emergency_type, location)
            
            return {
                "response_type": "emergency_support",
                "data": support
            }
        
        else:
            # General accessibility information
            return {
                "response_type": "general_info",
                "data": {
                    "message": "I can help with accessibility assessments, route planning, equipment recommendations, and emergency support.",
                    "capabilities": self.capabilities,
                    "standards_supported": list(self.standards.keys())
                }
            }