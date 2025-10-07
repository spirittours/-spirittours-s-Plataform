"""
Sistema de Sostenibilidad y Carbon Tracking para Spirit Tours
Monitoreo de huella de carbono y turismo sostenible
"""

import asyncio
import json
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
from decimal import Decimal
import numpy as np
from pydantic import BaseModel, Field

# Sustainability Types
class TransportType(str, Enum):
    WALKING = "walking"
    BICYCLE = "bicycle"
    ELECTRIC_CAR = "electric_car"
    HYBRID_CAR = "hybrid_car"
    GASOLINE_CAR = "gasoline_car"
    BUS = "bus"
    TRAIN = "train"
    AIRPLANE_DOMESTIC = "airplane_domestic"
    AIRPLANE_INTERNATIONAL = "airplane_international"
    CRUISE_SHIP = "cruise_ship"
    FERRY = "ferry"
    ELECTRIC_SCOOTER = "electric_scooter"

class AccommodationType(str, Enum):
    ECO_HOTEL = "eco_hotel"
    GREEN_CERTIFIED = "green_certified"
    STANDARD_HOTEL = "standard_hotel"
    LUXURY_HOTEL = "luxury_hotel"
    HOSTEL = "hostel"
    CAMPING = "camping"
    AIRBNB = "airbnb"
    RESORT = "resort"

class ActivityImpact(str, Enum):
    VERY_LOW = "very_low"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    VERY_HIGH = "very_high"

# Data Models
@dataclass
class CarbonEmission:
    """Carbon emission calculation"""
    activity_type: str
    amount: float  # kg CO2
    category: str
    timestamp: datetime
    offset_available: bool = True
    offset_cost: Optional[float] = None

class SustainabilityScore(BaseModel):
    """Sustainability score for tours"""
    overall_score: float = Field(ge=0, le=100)
    carbon_footprint: float  # kg CO2
    water_usage: float  # liters
    waste_generation: float  # kg
    local_impact_score: float = Field(ge=0, le=100)
    biodiversity_score: float = Field(ge=0, le=100)
    cultural_preservation_score: float = Field(ge=0, le=100)
    recommendations: List[str] = []

class EcoAlternative(BaseModel):
    """Eco-friendly alternative suggestion"""
    original_option: str
    eco_option: str
    carbon_savings: float  # kg CO2
    cost_difference: float  # can be negative if cheaper
    feasibility_score: float = Field(ge=0, le=100)
    description: str

class CarbonOffset(BaseModel):
    """Carbon offset project"""
    project_id: str
    project_name: str
    project_type: str  # reforestation, renewable_energy, etc.
    location: str
    cost_per_ton: float
    certification: str  # Gold Standard, VCS, etc.
    available_credits: float
    impact_description: str


class CarbonFootprintCalculator:
    """Calculate carbon footprint for travel activities"""
    
    def __init__(self):
        # Emission factors (kg CO2 per unit)
        self.transport_emissions = {
            TransportType.WALKING: 0,
            TransportType.BICYCLE: 0,
            TransportType.ELECTRIC_SCOOTER: 0.02,  # per km
            TransportType.ELECTRIC_CAR: 0.05,  # per km
            TransportType.HYBRID_CAR: 0.12,  # per km
            TransportType.GASOLINE_CAR: 0.19,  # per km
            TransportType.BUS: 0.08,  # per km per passenger
            TransportType.TRAIN: 0.04,  # per km per passenger
            TransportType.AIRPLANE_DOMESTIC: 0.25,  # per km per passenger
            TransportType.AIRPLANE_INTERNATIONAL: 0.15,  # per km per passenger
            TransportType.CRUISE_SHIP: 0.25,  # per km per passenger
            TransportType.FERRY: 0.12,  # per km per passenger
        }
        
        self.accommodation_emissions = {
            AccommodationType.CAMPING: 2,  # per night
            AccommodationType.HOSTEL: 5,  # per night
            AccommodationType.ECO_HOTEL: 10,  # per night
            AccommodationType.GREEN_CERTIFIED: 15,  # per night
            AccommodationType.AIRBNB: 20,  # per night
            AccommodationType.STANDARD_HOTEL: 30,  # per night
            AccommodationType.LUXURY_HOTEL: 50,  # per night
            AccommodationType.RESORT: 60,  # per night
        }
        
        self.activity_emissions = {
            ActivityImpact.VERY_LOW: 1,  # per activity
            ActivityImpact.LOW: 5,
            ActivityImpact.MODERATE: 10,
            ActivityImpact.HIGH: 20,
            ActivityImpact.VERY_HIGH: 50,
        }
    
    def calculate_transport_emissions(
        self,
        transport_type: TransportType,
        distance_km: float,
        passengers: int = 1
    ) -> float:
        """Calculate emissions for transportation"""
        
        emission_factor = self.transport_emissions.get(transport_type, 0.1)
        total_emissions = emission_factor * distance_km
        
        # Divide by passengers for shared transport
        if transport_type in [TransportType.BUS, TransportType.TRAIN, 
                              TransportType.AIRPLANE_DOMESTIC, TransportType.AIRPLANE_INTERNATIONAL]:
            total_emissions = total_emissions / max(1, passengers)
        
        return total_emissions
    
    def calculate_accommodation_emissions(
        self,
        accommodation_type: AccommodationType,
        nights: int
    ) -> float:
        """Calculate emissions for accommodation"""
        
        emission_factor = self.accommodation_emissions.get(accommodation_type, 25)
        return emission_factor * nights
    
    def calculate_activity_emissions(
        self,
        activities: List[Tuple[str, ActivityImpact]]
    ) -> float:
        """Calculate emissions for activities"""
        
        total = 0
        for activity_name, impact in activities:
            total += self.activity_emissions.get(impact, 10)
        
        return total
    
    def calculate_tour_footprint(
        self,
        tour_data: Dict[str, Any]
    ) -> Tuple[float, List[CarbonEmission]]:
        """Calculate total carbon footprint for a tour"""
        
        emissions = []
        total_carbon = 0
        
        # Transport emissions
        for transport in tour_data.get("transports", []):
            emission_amount = self.calculate_transport_emissions(
                TransportType(transport["type"]),
                transport["distance_km"],
                transport.get("passengers", 1)
            )
            
            emissions.append(CarbonEmission(
                activity_type=f"Transport: {transport['type']}",
                amount=emission_amount,
                category="transport",
                timestamp=datetime.now()
            ))
            total_carbon += emission_amount
        
        # Accommodation emissions
        for accommodation in tour_data.get("accommodations", []):
            emission_amount = self.calculate_accommodation_emissions(
                AccommodationType(accommodation["type"]),
                accommodation["nights"]
            )
            
            emissions.append(CarbonEmission(
                activity_type=f"Accommodation: {accommodation['type']}",
                amount=emission_amount,
                category="accommodation",
                timestamp=datetime.now()
            ))
            total_carbon += emission_amount
        
        # Activity emissions
        activities = tour_data.get("activities", [])
        if activities:
            activity_list = [(a["name"], ActivityImpact(a["impact"])) for a in activities]
            emission_amount = self.calculate_activity_emissions(activity_list)
            
            emissions.append(CarbonEmission(
                activity_type="Activities",
                amount=emission_amount,
                category="activities",
                timestamp=datetime.now()
            ))
            total_carbon += emission_amount
        
        return total_carbon, emissions


class SustainabilityAnalyzer:
    """Analyze and improve tour sustainability"""
    
    def __init__(self):
        self.carbon_calculator = CarbonFootprintCalculator()
        self.offset_providers = self._load_offset_providers()
    
    def _load_offset_providers(self) -> List[CarbonOffset]:
        """Load carbon offset project providers"""
        
        return [
            CarbonOffset(
                project_id="forest_001",
                project_name="Amazon Rainforest Conservation",
                project_type="reforestation",
                location="Brazil",
                cost_per_ton=15.0,
                certification="Gold Standard",
                available_credits=10000,
                impact_description="Protects 1000 hectares of rainforest"
            ),
            CarbonOffset(
                project_id="solar_001",
                project_name="Solar Farm India",
                project_type="renewable_energy",
                location="India",
                cost_per_ton=12.0,
                certification="VCS",
                available_credits=5000,
                impact_description="Provides clean energy to 5000 homes"
            ),
            CarbonOffset(
                project_id="wind_001",
                project_name="Wind Power Europe",
                project_type="renewable_energy",
                location="Netherlands",
                cost_per_ton=18.0,
                certification="Gold Standard",
                available_credits=8000,
                impact_description="Generates 50MW of clean energy"
            )
        ]
    
    async def analyze_tour_sustainability(
        self,
        tour_data: Dict[str, Any]
    ) -> SustainabilityScore:
        """Comprehensive sustainability analysis"""
        
        # Calculate carbon footprint
        carbon_footprint, emissions = self.carbon_calculator.calculate_tour_footprint(tour_data)
        
        # Calculate water usage (estimated)
        water_usage = self._estimate_water_usage(tour_data)
        
        # Calculate waste generation (estimated)
        waste_generation = self._estimate_waste_generation(tour_data)
        
        # Calculate impact scores
        local_impact = await self._calculate_local_impact(tour_data)
        biodiversity_impact = await self._calculate_biodiversity_impact(tour_data)
        cultural_impact = await self._calculate_cultural_impact(tour_data)
        
        # Calculate overall score
        overall_score = self._calculate_overall_score(
            carbon_footprint,
            water_usage,
            waste_generation,
            local_impact,
            biodiversity_impact,
            cultural_impact
        )
        
        # Generate recommendations
        recommendations = await self._generate_recommendations(
            tour_data,
            carbon_footprint,
            overall_score
        )
        
        return SustainabilityScore(
            overall_score=overall_score,
            carbon_footprint=carbon_footprint,
            water_usage=water_usage,
            waste_generation=waste_generation,
            local_impact_score=local_impact,
            biodiversity_score=biodiversity_impact,
            cultural_preservation_score=cultural_impact,
            recommendations=recommendations
        )
    
    def _estimate_water_usage(self, tour_data: Dict[str, Any]) -> float:
        """Estimate water usage in liters"""
        
        # Average water usage per day per person
        days = tour_data.get("duration_days", 1)
        people = tour_data.get("travelers", 1)
        
        # Base usage: 200L per person per day
        base_usage = 200 * days * people
        
        # Adjust based on accommodation type
        for accommodation in tour_data.get("accommodations", []):
            if accommodation["type"] in ["luxury_hotel", "resort"]:
                base_usage *= 1.5
            elif accommodation["type"] in ["camping", "hostel"]:
                base_usage *= 0.5
        
        return base_usage
    
    def _estimate_waste_generation(self, tour_data: Dict[str, Any]) -> float:
        """Estimate waste generation in kg"""
        
        days = tour_data.get("duration_days", 1)
        people = tour_data.get("travelers", 1)
        
        # Average: 1.5 kg waste per person per day
        return 1.5 * days * people
    
    async def _calculate_local_impact(self, tour_data: Dict[str, Any]) -> float:
        """Calculate positive local economic impact score"""
        
        score = 50  # Base score
        
        # Check for local business support
        if tour_data.get("uses_local_guides", False):
            score += 15
        if tour_data.get("local_accommodations", False):
            score += 15
        if tour_data.get("local_restaurants", False):
            score += 10
        if tour_data.get("local_transport", False):
            score += 10
        
        return min(100, score)
    
    async def _calculate_biodiversity_impact(self, tour_data: Dict[str, Any]) -> float:
        """Calculate biodiversity impact score"""
        
        score = 80  # Start optimistic
        
        # Deduct for high-impact activities
        for activity in tour_data.get("activities", []):
            if activity.get("impact") == "very_high":
                score -= 20
            elif activity.get("impact") == "high":
                score -= 10
        
        # Add for conservation activities
        if tour_data.get("includes_conservation", False):
            score += 20
        
        return max(0, min(100, score))
    
    async def _calculate_cultural_impact(self, tour_data: Dict[str, Any]) -> float:
        """Calculate cultural preservation score"""
        
        score = 60  # Base score
        
        if tour_data.get("cultural_experiences", False):
            score += 20
        if tour_data.get("respects_local_customs", True):
            score += 10
        if tour_data.get("supports_artisans", False):
            score += 10
        
        return min(100, score)
    
    def _calculate_overall_score(
        self,
        carbon: float,
        water: float,
        waste: float,
        local: float,
        biodiversity: float,
        cultural: float
    ) -> float:
        """Calculate overall sustainability score"""
        
        # Carbon score (inverse relationship)
        carbon_score = max(0, 100 - (carbon / 10))  # 1000kg = 0 score
        
        # Water score (inverse relationship)
        water_score = max(0, 100 - (water / 100))  # 10000L = 0 score
        
        # Waste score (inverse relationship)  
        waste_score = max(0, 100 - (waste * 5))  # 20kg = 0 score
        
        # Weighted average
        weights = {
            "carbon": 0.3,
            "water": 0.1,
            "waste": 0.1,
            "local": 0.2,
            "biodiversity": 0.15,
            "cultural": 0.15
        }
        
        overall = (
            carbon_score * weights["carbon"] +
            water_score * weights["water"] +
            waste_score * weights["waste"] +
            local * weights["local"] +
            biodiversity * weights["biodiversity"] +
            cultural * weights["cultural"]
        )
        
        return round(overall, 1)
    
    async def _generate_recommendations(
        self,
        tour_data: Dict[str, Any],
        carbon_footprint: float,
        overall_score: float
    ) -> List[str]:
        """Generate sustainability recommendations"""
        
        recommendations = []
        
        if carbon_footprint > 500:
            recommendations.append("Consider offsetting your carbon footprint")
            recommendations.append("Choose trains over flights for shorter distances")
        
        if overall_score < 50:
            recommendations.append("Look for eco-certified accommodations")
            recommendations.append("Support local businesses and guides")
            recommendations.append("Choose walking or cycling tours when possible")
        
        if not tour_data.get("uses_local_guides", False):
            recommendations.append("Hire local guides to support the community")
        
        return recommendations
    
    async def suggest_eco_alternatives(
        self,
        tour_component: Dict[str, Any]
    ) -> List[EcoAlternative]:
        """Suggest eco-friendly alternatives"""
        
        alternatives = []
        component_type = tour_component.get("type")
        
        if component_type == "transport":
            current = tour_component.get("mode")
            
            if current == "gasoline_car":
                alternatives.append(EcoAlternative(
                    original_option="Gasoline Car",
                    eco_option="Electric or Hybrid Car",
                    carbon_savings=50,
                    cost_difference=10,
                    feasibility_score=80,
                    description="Reduce emissions by 50% with electric vehicle"
                ))
            
            elif current == "airplane_domestic":
                alternatives.append(EcoAlternative(
                    original_option="Domestic Flight",
                    eco_option="High-speed Train",
                    carbon_savings=150,
                    cost_difference=-20,
                    feasibility_score=70,
                    description="Save money and emissions with train travel"
                ))
        
        elif component_type == "accommodation":
            current = tour_component.get("category")
            
            if current == "standard_hotel":
                alternatives.append(EcoAlternative(
                    original_option="Standard Hotel",
                    eco_option="Eco-Certified Hotel",
                    carbon_savings=15,
                    cost_difference=5,
                    feasibility_score=90,
                    description="Similar comfort with lower environmental impact"
                ))
        
        return alternatives
    
    def calculate_offset_cost(self, carbon_kg: float) -> List[Dict[str, Any]]:
        """Calculate carbon offset options and costs"""
        
        carbon_tons = carbon_kg / 1000
        offset_options = []
        
        for provider in self.offset_providers:
            if provider.available_credits >= carbon_tons:
                offset_options.append({
                    "provider": provider.project_name,
                    "type": provider.project_type,
                    "cost": carbon_tons * provider.cost_per_ton,
                    "certification": provider.certification,
                    "impact": provider.impact_description,
                    "project_id": provider.project_id
                })
        
        return sorted(offset_options, key=lambda x: x["cost"])
    
    async def generate_sustainability_report(
        self,
        tour_id: str,
        tour_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate comprehensive sustainability report"""
        
        # Analyze sustainability
        sustainability_score = await self.analyze_tour_sustainability(tour_data)
        
        # Calculate emissions breakdown
        carbon_footprint, emissions = self.carbon_calculator.calculate_tour_footprint(tour_data)
        
        # Get offset options
        offset_options = self.calculate_offset_cost(carbon_footprint)
        
        # Suggest alternatives
        eco_alternatives = []
        for component in tour_data.get("components", []):
            alternatives = await self.suggest_eco_alternatives(component)
            eco_alternatives.extend(alternatives)
        
        report = {
            "tour_id": tour_id,
            "generated_at": datetime.now().isoformat(),
            "sustainability_score": sustainability_score.dict(),
            "emissions_breakdown": [
                {
                    "category": e.category,
                    "activity": e.activity_type,
                    "emissions_kg": e.amount
                }
                for e in emissions
            ],
            "total_carbon_kg": carbon_footprint,
            "offset_options": offset_options,
            "eco_alternatives": [alt.dict() for alt in eco_alternatives],
            "certification_eligible": sustainability_score.overall_score >= 70,
            "badges_earned": self._calculate_badges(sustainability_score)
        }
        
        return report
    
    def _calculate_badges(self, score: SustainabilityScore) -> List[str]:
        """Calculate sustainability badges earned"""
        
        badges = []
        
        if score.overall_score >= 80:
            badges.append("Eco Champion")
        elif score.overall_score >= 60:
            badges.append("Green Traveler")
        
        if score.carbon_footprint < 100:
            badges.append("Low Carbon")
        
        if score.local_impact_score >= 80:
            badges.append("Local Supporter")
        
        if score.biodiversity_score >= 80:
            badges.append("Nature Protector")
        
        if score.cultural_preservation_score >= 80:
            badges.append("Cultural Ambassador")
        
        return badges


class CarbonOffsetMarketplace:
    """Marketplace for carbon offset projects"""
    
    def __init__(self):
        self.projects = []
        self.user_offsets = {}
        self.total_offset = 0
    
    async def list_projects(
        self,
        project_type: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None
    ) -> List[CarbonOffset]:
        """List available carbon offset projects"""
        
        projects = self.projects
        
        if project_type:
            projects = [p for p in projects if p.project_type == project_type]
        
        if min_price:
            projects = [p for p in projects if p.cost_per_ton >= min_price]
        
        if max_price:
            projects = [p for p in projects if p.cost_per_ton <= max_price]
        
        return projects
    
    async def purchase_offset(
        self,
        user_id: str,
        project_id: str,
        carbon_tons: float
    ) -> Dict[str, Any]:
        """Purchase carbon offset credits"""
        
        # Find project
        project = next((p for p in self.projects if p.project_id == project_id), None)
        
        if not project:
            return {"error": "Project not found"}
        
        if project.available_credits < carbon_tons:
            return {"error": "Insufficient credits available"}
        
        # Calculate cost
        total_cost = carbon_tons * project.cost_per_ton
        
        # Process purchase
        purchase_record = {
            "purchase_id": f"offset_{datetime.now().timestamp()}",
            "user_id": user_id,
            "project_id": project_id,
            "carbon_tons": carbon_tons,
            "cost": total_cost,
            "timestamp": datetime.now().isoformat(),
            "certificate_url": f"/certificates/offset_{project_id}_{user_id}.pdf"
        }
        
        # Update user offsets
        if user_id not in self.user_offsets:
            self.user_offsets[user_id] = []
        self.user_offsets[user_id].append(purchase_record)
        
        # Update project credits
        project.available_credits -= carbon_tons
        
        # Update total offset
        self.total_offset += carbon_tons
        
        return {
            "success": True,
            "purchase": purchase_record,
            "message": f"Successfully offset {carbon_tons} tons of CO2"
        }
    
    async def get_user_offset_history(self, user_id: str) -> Dict[str, Any]:
        """Get user's carbon offset history"""
        
        if user_id not in self.user_offsets:
            return {
                "total_offset": 0,
                "purchases": [],
                "impact_summary": "No offsets purchased yet"
            }
        
        purchases = self.user_offsets[user_id]
        total = sum(p["carbon_tons"] for p in purchases)
        
        return {
            "total_offset": total,
            "purchases": purchases,
            "impact_summary": f"You've offset {total} tons of CO2, equivalent to planting {int(total * 40)} trees!",
            "badges": self._calculate_offset_badges(total)
        }
    
    def _calculate_offset_badges(self, total_tons: float) -> List[str]:
        """Calculate badges based on offset amount"""
        
        badges = []
        
        if total_tons >= 100:
            badges.append("Carbon Hero")
        elif total_tons >= 50:
            badges.append("Climate Champion")
        elif total_tons >= 10:
            badges.append("Green Guardian")
        elif total_tons >= 1:
            badges.append("Eco Starter")
        
        return badges


class EcoTourismCertification:
    """Certification system for sustainable tourism"""
    
    def __init__(self):
        self.certification_levels = {
            "bronze": {"min_score": 50, "name": "Bronze Eco-Certified"},
            "silver": {"min_score": 65, "name": "Silver Eco-Certified"},
            "gold": {"min_score": 80, "name": "Gold Eco-Certified"},
            "platinum": {"min_score": 90, "name": "Platinum Eco-Certified"}
        }
    
    async def evaluate_for_certification(
        self,
        tour_provider: str,
        tour_data: Dict[str, Any],
        sustainability_score: SustainabilityScore
    ) -> Dict[str, Any]:
        """Evaluate tour for eco-certification"""
        
        score = sustainability_score.overall_score
        
        # Determine certification level
        certification_level = None
        certification_name = None
        
        for level, requirements in sorted(
            self.certification_levels.items(),
            key=lambda x: x[1]["min_score"],
            reverse=True
        ):
            if score >= requirements["min_score"]:
                certification_level = level
                certification_name = requirements["name"]
                break
        
        if not certification_level:
            return {
                "certified": False,
                "message": "Score too low for certification",
                "required_score": self.certification_levels["bronze"]["min_score"],
                "current_score": score
            }
        
        # Generate certificate
        certificate = {
            "certificate_id": f"cert_{datetime.now().timestamp()}",
            "provider": tour_provider,
            "tour_id": tour_data.get("tour_id"),
            "certification_level": certification_level,
            "certification_name": certification_name,
            "score": score,
            "issued_date": datetime.now().isoformat(),
            "valid_until": (datetime.now() + timedelta(days=365)).isoformat(),
            "verification_url": f"/verify/cert_{tour_provider}_{certification_level}"
        }
        
        return {
            "certified": True,
            "certificate": certificate,
            "benefits": self._get_certification_benefits(certification_level)
        }
    
    def _get_certification_benefits(self, level: str) -> List[str]:
        """Get benefits for certification level"""
        
        benefits = {
            "bronze": [
                "Eco-certified badge on listings",
                "Inclusion in sustainable tours section"
            ],
            "silver": [
                "Priority listing in search results",
                "Eco-certified badge on listings",
                "Inclusion in sustainable tours section",
                "Sustainability report access"
            ],
            "gold": [
                "Featured placement on homepage",
                "Priority listing in search results",
                "Gold eco-badge on all materials",
                "Sustainability marketing toolkit",
                "Carbon offset partnership discounts"
            ],
            "platinum": [
                "Exclusive platinum partner status",
                "Top featured placement",
                "Co-marketing opportunities",
                "Sustainability awards eligibility",
                "Premium carbon offset partnerships",
                "Speaking opportunities at events"
            ]
        }
        
        return benefits.get(level, [])