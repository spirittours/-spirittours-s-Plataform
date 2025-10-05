"""
CarbonOptimizer AI Agent
Advanced optimization of carbon footprint for sustainable tourism
"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import math
import json


class TransportMode(Enum):
    WALKING = "walking"
    BICYCLE = "bicycle"
    ELECTRIC_VEHICLE = "electric_vehicle"
    HYBRID_VEHICLE = "hybrid_vehicle"
    PUBLIC_TRANSPORT = "public_transport"
    CONVENTIONAL_CAR = "conventional_car"
    AIRPLANE = "airplane"
    TRAIN = "train"
    SHIP = "ship"


class EmissionLevel(Enum):
    VERY_LOW = "very_low"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    VERY_HIGH = "very_high"


@dataclass
class CarbonFootprint:
    activity_id: str
    activity_type: str
    co2_emissions_kg: float
    emission_level: EmissionLevel
    calculation_method: str
    breakdown: Dict[str, float]
    offset_required: float
    timestamp: datetime


@dataclass
class CarbonReduction:
    strategy_id: str
    strategy_name: str
    potential_reduction_kg: float
    implementation_cost: float
    difficulty: str
    timeframe: str
    roi_percentage: float


@dataclass
class OffsetOption:
    project_id: str
    project_name: str
    project_type: str
    location: str
    cost_per_ton: float
    certification: str
    verified: bool
    impact_description: str


class CarbonOptimizerAgent:
    """
    AI Agent for carbon footprint optimization in tourism
    """
    
    def __init__(self):
        self.agent_id = "carbon_optimizer"
        self.version = "1.0.0"
        self.capabilities = [
            "carbon_calculation",
            "emission_tracking",
            "reduction_strategies",
            "offset_recommendations",
            "route_optimization",
            "accommodation_assessment",
            "activity_evaluation",
            "reporting_analytics"
        ]
        
        # Emission factors (kg CO2 per unit)
        self.emission_factors = {
            # Transport (per km per person)
            "walking": 0.0,
            "bicycle": 0.0,
            "electric_vehicle": 0.047,
            "hybrid_vehicle": 0.068,
            "public_transport": 0.089,
            "conventional_car": 0.171,
            "airplane_short": 0.255,  # < 1000 km
            "airplane_medium": 0.186,  # 1000-3000 km
            "airplane_long": 0.150,    # > 3000 km
            "train": 0.041,
            "ship": 0.118,
            
            # Accommodation (per night per person)
            "eco_hotel": 8.5,
            "standard_hotel": 21.0,
            "luxury_hotel": 35.0,
            "hostel": 5.5,
            "camping": 2.8,
            "apartment": 12.0,
            
            # Activities (per person per activity)
            "hiking": 0.5,
            "cycling_tour": 1.0,
            "boat_tour": 15.0,
            "helicopter_tour": 250.0,
            "safari": 45.0,
            "diving": 25.0,
            "skiing": 22.0,
            
            # Food (per meal)
            "vegan_meal": 0.7,
            "vegetarian_meal": 1.5,
            "fish_meal": 4.5,
            "chicken_meal": 3.5,
            "beef_meal": 7.5,
            "local_meal": 2.0,
            "imported_meal": 5.0
        }
        
        # Carbon offset projects database
        self.offset_projects = [
            {
                "id": "PROJ001",
                "name": "Amazon Rainforest Conservation",
                "type": "Forest Conservation",
                "location": "Brazil",
                "cost_per_ton": 15.0,
                "certification": "VCS",
                "verified": True
            },
            {
                "id": "PROJ002",
                "name": "Solar Energy India",
                "type": "Renewable Energy",
                "location": "India",
                "cost_per_ton": 12.0,
                "certification": "Gold Standard",
                "verified": True
            },
            {
                "id": "PROJ003",
                "name": "Mangrove Restoration",
                "type": "Blue Carbon",
                "location": "Indonesia",
                "cost_per_ton": 18.0,
                "certification": "Plan Vivo",
                "verified": True
            }
        ]
    
    async def calculate_carbon_footprint(self,
                                        trip_data: Dict) -> CarbonFootprint:
        """
        Calculate comprehensive carbon footprint for a trip
        """
        total_emissions = 0.0
        breakdown = {}
        
        # Calculate transport emissions
        transport_emissions = await self._calculate_transport_emissions(
            trip_data.get("transport", [])
        )
        total_emissions += transport_emissions
        breakdown["transport"] = transport_emissions
        
        # Calculate accommodation emissions
        accommodation_emissions = await self._calculate_accommodation_emissions(
            trip_data.get("accommodation", {})
        )
        total_emissions += accommodation_emissions
        breakdown["accommodation"] = accommodation_emissions
        
        # Calculate activity emissions
        activity_emissions = await self._calculate_activity_emissions(
            trip_data.get("activities", [])
        )
        total_emissions += activity_emissions
        breakdown["activities"] = activity_emissions
        
        # Calculate food emissions
        food_emissions = await self._calculate_food_emissions(
            trip_data.get("meals", [])
        )
        total_emissions += food_emissions
        breakdown["food"] = food_emissions
        
        # Determine emission level
        emission_level = self._determine_emission_level(
            total_emissions, trip_data.get("duration_days", 1)
        )
        
        # Calculate offset required
        offset_required = total_emissions * 1.1  # Add 10% buffer
        
        return CarbonFootprint(
            activity_id=trip_data.get("trip_id", ""),
            activity_type="trip",
            co2_emissions_kg=round(total_emissions, 2),
            emission_level=emission_level,
            calculation_method="DEFRA 2024 factors",
            breakdown=breakdown,
            offset_required=round(offset_required, 2),
            timestamp=datetime.utcnow()
        )
    
    async def _calculate_transport_emissions(self, transport_data: List[Dict]) -> float:
        """
        Calculate transport-related emissions
        """
        total = 0.0
        
        for segment in transport_data:
            mode = segment.get("mode", "conventional_car")
            distance_km = segment.get("distance_km", 0)
            passengers = segment.get("passengers", 1)
            
            # Get appropriate emission factor
            if mode == "airplane":
                if distance_km < 1000:
                    factor = self.emission_factors["airplane_short"]
                elif distance_km < 3000:
                    factor = self.emission_factors["airplane_medium"]
                else:
                    factor = self.emission_factors["airplane_long"]
            else:
                factor = self.emission_factors.get(mode, 0.171)
            
            # Calculate emissions
            emissions = distance_km * factor * passengers
            total += emissions
        
        return round(total, 2)
    
    async def _calculate_accommodation_emissions(self, accommodation_data: Dict) -> float:
        """
        Calculate accommodation-related emissions
        """
        accommodation_type = accommodation_data.get("type", "standard_hotel")
        nights = accommodation_data.get("nights", 1)
        guests = accommodation_data.get("guests", 1)
        
        factor = self.emission_factors.get(accommodation_type, 21.0)
        emissions = factor * nights * guests
        
        # Apply reduction for eco-certifications
        if accommodation_data.get("eco_certified"):
            emissions *= 0.7  # 30% reduction for eco-certified
        
        return round(emissions, 2)
    
    async def _calculate_activity_emissions(self, activities: List[Dict]) -> float:
        """
        Calculate activity-related emissions
        """
        total = 0.0
        
        for activity in activities:
            activity_type = activity.get("type", "hiking")
            participants = activity.get("participants", 1)
            duration_hours = activity.get("duration_hours", 1)
            
            base_factor = self.emission_factors.get(activity_type, 1.0)
            
            # Adjust for duration
            if duration_hours > 4:
                factor = base_factor * (duration_hours / 4)
            else:
                factor = base_factor
            
            emissions = factor * participants
            total += emissions
        
        return round(total, 2)
    
    async def _calculate_food_emissions(self, meals: List[Dict]) -> float:
        """
        Calculate food-related emissions
        """
        total = 0.0
        
        for meal in meals:
            meal_type = meal.get("type", "local_meal")
            quantity = meal.get("quantity", 1)
            
            factor = self.emission_factors.get(meal_type, 2.0)
            emissions = factor * quantity
            total += emissions
        
        return round(total, 2)
    
    def _determine_emission_level(self, total_emissions: float, days: int) -> EmissionLevel:
        """
        Determine emission level category
        """
        daily_emissions = total_emissions / max(days, 1)
        
        if daily_emissions < 10:
            return EmissionLevel.VERY_LOW
        elif daily_emissions < 25:
            return EmissionLevel.LOW
        elif daily_emissions < 50:
            return EmissionLevel.MODERATE
        elif daily_emissions < 100:
            return EmissionLevel.HIGH
        else:
            return EmissionLevel.VERY_HIGH
    
    async def generate_reduction_strategies(self,
                                          current_footprint: CarbonFootprint,
                                          trip_data: Dict) -> List[CarbonReduction]:
        """
        Generate carbon reduction strategies
        """
        strategies = []
        
        # Transport optimization
        if current_footprint.breakdown.get("transport", 0) > 50:
            strategies.append(CarbonReduction(
                strategy_id="STRAT001",
                strategy_name="Switch to Electric/Hybrid Vehicles",
                potential_reduction_kg=current_footprint.breakdown["transport"] * 0.4,
                implementation_cost=50.0,
                difficulty="easy",
                timeframe="immediate",
                roi_percentage=150.0
            ))
            
            strategies.append(CarbonReduction(
                strategy_id="STRAT002",
                strategy_name="Use Public Transportation",
                potential_reduction_kg=current_footprint.breakdown["transport"] * 0.5,
                implementation_cost=0.0,
                difficulty="easy",
                timeframe="immediate",
                roi_percentage=200.0
            ))
        
        # Accommodation optimization
        if current_footprint.breakdown.get("accommodation", 0) > 30:
            strategies.append(CarbonReduction(
                strategy_id="STRAT003",
                strategy_name="Choose Eco-Certified Hotels",
                potential_reduction_kg=current_footprint.breakdown["accommodation"] * 0.3,
                implementation_cost=20.0,
                difficulty="easy",
                timeframe="booking",
                roi_percentage=100.0
            ))
        
        # Activity optimization
        strategies.append(CarbonReduction(
            strategy_id="STRAT004",
            strategy_name="Replace High-Emission Activities",
            potential_reduction_kg=current_footprint.breakdown.get("activities", 0) * 0.6,
            implementation_cost=0.0,
            difficulty="medium",
            timeframe="planning",
            roi_percentage=180.0
        ))
        
        # Food optimization
        strategies.append(CarbonReduction(
            strategy_id="STRAT005",
            strategy_name="Choose Local and Plant-Based Meals",
            potential_reduction_kg=current_footprint.breakdown.get("food", 0) * 0.5,
            implementation_cost=-10.0,  # Might save money
            difficulty="easy",
            timeframe="immediate",
            roi_percentage=250.0
        ))
        
        # Sort by potential reduction
        strategies.sort(key=lambda x: x.potential_reduction_kg, reverse=True)
        
        return strategies[:5]  # Return top 5 strategies
    
    async def recommend_offset_projects(self,
                                       offset_amount_kg: float,
                                       preferences: Optional[Dict] = None) -> List[OffsetOption]:
        """
        Recommend carbon offset projects
        """
        offset_options = []
        
        for project in self.offset_projects:
            tons_needed = offset_amount_kg / 1000.0
            total_cost = tons_needed * project["cost_per_ton"]
            
            offset_option = OffsetOption(
                project_id=project["id"],
                project_name=project["name"],
                project_type=project["type"],
                location=project["location"],
                cost_per_ton=project["cost_per_ton"],
                certification=project["certification"],
                verified=project["verified"],
                impact_description=f"Offset {round(offset_amount_kg, 2)} kg CO2 through {project['type'].lower()}"
            )
            
            offset_options.append(offset_option)
        
        # Filter by preferences
        if preferences:
            if preferences.get("project_type"):
                offset_options = [o for o in offset_options 
                                 if o.project_type == preferences["project_type"]]
            
            if preferences.get("max_cost_per_ton"):
                offset_options = [o for o in offset_options 
                                 if o.cost_per_ton <= preferences["max_cost_per_ton"]]
        
        # Sort by cost
        offset_options.sort(key=lambda x: x.cost_per_ton)
        
        return offset_options
    
    async def optimize_route_for_emissions(self,
                                         waypoints: List[Dict],
                                         transport_mode: Optional[str] = None) -> Dict:
        """
        Optimize travel route to minimize emissions
        """
        if len(waypoints) < 2:
            return {"error": "At least 2 waypoints required"}
        
        # Calculate emissions for different route options
        route_options = []
        
        # Direct route
        direct_route = await self._calculate_direct_route(waypoints, transport_mode)
        route_options.append(direct_route)
        
        # Optimized route (TSP-like optimization)
        optimized_route = await self._calculate_optimized_route(waypoints, transport_mode)
        route_options.append(optimized_route)
        
        # Multi-modal route
        multimodal_route = await self._calculate_multimodal_route(waypoints)
        route_options.append(multimodal_route)
        
        # Sort by emissions
        route_options.sort(key=lambda x: x["total_emissions"])
        
        return {
            "recommended_route": route_options[0],
            "alternatives": route_options[1:],
            "potential_savings": route_options[-1]["total_emissions"] - route_options[0]["total_emissions"],
            "optimization_summary": f"Best route reduces emissions by {round((1 - route_options[0]['total_emissions']/route_options[-1]['total_emissions']) * 100, 1)}%"
        }
    
    async def _calculate_direct_route(self, waypoints: List[Dict], mode: Optional[str]) -> Dict:
        """
        Calculate emissions for direct route
        """
        total_distance = 0
        total_emissions = 0
        segments = []
        
        mode = mode or "conventional_car"
        
        for i in range(len(waypoints) - 1):
            distance = self._calculate_distance(waypoints[i], waypoints[i+1])
            emissions = distance * self.emission_factors.get(mode, 0.171)
            
            segments.append({
                "from": waypoints[i].get("name", f"Point {i}"),
                "to": waypoints[i+1].get("name", f"Point {i+1}"),
                "distance_km": distance,
                "emissions_kg": emissions,
                "mode": mode
            })
            
            total_distance += distance
            total_emissions += emissions
        
        return {
            "route_type": "direct",
            "total_distance": round(total_distance, 2),
            "total_emissions": round(total_emissions, 2),
            "segments": segments,
            "transport_mode": mode
        }
    
    async def _calculate_optimized_route(self, waypoints: List[Dict], mode: Optional[str]) -> Dict:
        """
        Calculate optimized route using nearest neighbor heuristic
        """
        if len(waypoints) <= 2:
            return await self._calculate_direct_route(waypoints, mode)
        
        mode = mode or "conventional_car"
        unvisited = waypoints[1:-1]  # Exclude start and end
        current = waypoints[0]
        route = [current]
        total_distance = 0
        total_emissions = 0
        segments = []
        
        while unvisited:
            # Find nearest unvisited point
            nearest = min(unvisited, key=lambda x: self._calculate_distance(current, x))
            distance = self._calculate_distance(current, nearest)
            emissions = distance * self.emission_factors.get(mode, 0.171)
            
            segments.append({
                "from": current.get("name", "Point"),
                "to": nearest.get("name", "Point"),
                "distance_km": distance,
                "emissions_kg": emissions,
                "mode": mode
            })
            
            route.append(nearest)
            unvisited.remove(nearest)
            current = nearest
            total_distance += distance
            total_emissions += emissions
        
        # Add final segment
        distance = self._calculate_distance(current, waypoints[-1])
        emissions = distance * self.emission_factors.get(mode, 0.171)
        
        segments.append({
            "from": current.get("name", "Point"),
            "to": waypoints[-1].get("name", "End"),
            "distance_km": distance,
            "emissions_kg": emissions,
            "mode": mode
        })
        
        total_distance += distance
        total_emissions += emissions
        
        return {
            "route_type": "optimized",
            "total_distance": round(total_distance, 2),
            "total_emissions": round(total_emissions, 2),
            "segments": segments,
            "transport_mode": mode
        }
    
    async def _calculate_multimodal_route(self, waypoints: List[Dict]) -> Dict:
        """
        Calculate route using multiple transport modes
        """
        total_distance = 0
        total_emissions = 0
        segments = []
        
        for i in range(len(waypoints) - 1):
            distance = self._calculate_distance(waypoints[i], waypoints[i+1])
            
            # Choose mode based on distance
            if distance < 2:
                mode = "walking"
            elif distance < 10:
                mode = "bicycle"
            elif distance < 50:
                mode = "public_transport"
            elif distance < 500:
                mode = "train"
            else:
                mode = "airplane_medium"
            
            emissions = distance * self.emission_factors.get(mode, 0.171)
            
            segments.append({
                "from": waypoints[i].get("name", f"Point {i}"),
                "to": waypoints[i+1].get("name", f"Point {i+1}"),
                "distance_km": distance,
                "emissions_kg": emissions,
                "mode": mode
            })
            
            total_distance += distance
            total_emissions += emissions
        
        return {
            "route_type": "multimodal",
            "total_distance": round(total_distance, 2),
            "total_emissions": round(total_emissions, 2),
            "segments": segments,
            "transport_mode": "mixed"
        }
    
    def _calculate_distance(self, point1: Dict, point2: Dict) -> float:
        """
        Calculate distance between two points using Haversine formula
        """
        R = 6371  # Earth's radius in km
        
        lat1 = math.radians(point1.get("lat", 0))
        lat2 = math.radians(point2.get("lat", 0))
        lon1 = math.radians(point1.get("lon", 0))
        lon2 = math.radians(point2.get("lon", 0))
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    async def generate_sustainability_report(self,
                                           user_id: str,
                                           period: str = "month") -> Dict:
        """
        Generate comprehensive sustainability report
        """
        # Calculate period dates
        end_date = datetime.utcnow()
        if period == "week":
            start_date = end_date - timedelta(days=7)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        elif period == "year":
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=30)
        
        # Mock data for report (would fetch from database)
        report = {
            "user_id": user_id,
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "summary": {
                "total_emissions_kg": 245.8,
                "total_offset_kg": 270.0,
                "net_emissions_kg": -24.2,
                "status": "carbon_negative",
                "trips_taken": 3,
                "sustainable_choices": 15
            },
            "emissions_breakdown": {
                "transport": 120.5,
                "accommodation": 65.3,
                "activities": 35.0,
                "food": 25.0
            },
            "reduction_achieved": {
                "vs_baseline": -35.5,  # percentage
                "kg_saved": 135.2,
                "strategies_implemented": 8
            },
            "offset_projects_supported": [
                {
                    "name": "Amazon Rainforest Conservation",
                    "amount_kg": 150.0,
                    "cost": 2.25
                },
                {
                    "name": "Solar Energy India",
                    "amount_kg": 120.0,
                    "cost": 1.44
                }
            ],
            "recommendations": [
                "Continue using public transport for city trips",
                "Consider train travel for distances under 1000km",
                "Book more eco-certified accommodations"
            ],
            "achievements": [
                {
                    "badge": "Carbon Negative Traveler",
                    "description": "Offset more than emitted this period"
                },
                {
                    "badge": "Sustainable Transport",
                    "description": "Used low-emission transport for 70% of trips"
                }
            ],
            "comparison": {
                "user_emissions": 245.8,
                "average_emissions": 450.0,
                "percentile": 85,  # Better than 85% of users
                "trend": "decreasing"
            }
        }
        
        return report
    
    async def evaluate_accommodation_sustainability(self,
                                                  accommodation_data: Dict) -> Dict:
        """
        Evaluate sustainability of accommodation options
        """
        scores = {}
        
        # Energy efficiency
        energy_score = 0
        if accommodation_data.get("renewable_energy"):
            energy_score += 30
        if accommodation_data.get("energy_efficient"):
            energy_score += 20
        if accommodation_data.get("led_lighting"):
            energy_score += 10
        
        scores["energy"] = min(energy_score, 100)
        
        # Water conservation
        water_score = 0
        if accommodation_data.get("water_recycling"):
            water_score += 30
        if accommodation_data.get("low_flow_fixtures"):
            water_score += 20
        if accommodation_data.get("linen_reuse_program"):
            water_score += 15
        
        scores["water"] = min(water_score, 100)
        
        # Waste management
        waste_score = 0
        if accommodation_data.get("composting"):
            waste_score += 25
        if accommodation_data.get("recycling"):
            waste_score += 25
        if accommodation_data.get("plastic_free"):
            waste_score += 25
        
        scores["waste"] = min(waste_score, 100)
        
        # Local sourcing
        local_score = 0
        if accommodation_data.get("local_food"):
            local_score += 30
        if accommodation_data.get("local_staff"):
            local_score += 20
        if accommodation_data.get("local_materials"):
            local_score += 20
        
        scores["local"] = min(local_score, 100)
        
        # Calculate overall score
        overall_score = sum(scores.values()) / len(scores)
        
        # Determine rating
        if overall_score >= 80:
            rating = "Excellent"
            stars = 5
        elif overall_score >= 60:
            rating = "Very Good"
            stars = 4
        elif overall_score >= 40:
            rating = "Good"
            stars = 3
        elif overall_score >= 20:
            rating = "Fair"
            stars = 2
        else:
            rating = "Needs Improvement"
            stars = 1
        
        return {
            "accommodation_id": accommodation_data.get("id"),
            "name": accommodation_data.get("name"),
            "sustainability_score": round(overall_score, 1),
            "rating": rating,
            "stars": stars,
            "category_scores": scores,
            "certifications": accommodation_data.get("certifications", []),
            "carbon_footprint_per_night": self.emission_factors.get(
                accommodation_data.get("type", "standard_hotel"), 21.0
            ),
            "recommendations": self._generate_accommodation_recommendations(scores)
        }
    
    def _generate_accommodation_recommendations(self, scores: Dict) -> List[str]:
        """
        Generate recommendations for accommodation improvements
        """
        recommendations = []
        
        if scores.get("energy", 0) < 50:
            recommendations.append("Consider switching to renewable energy sources")
        
        if scores.get("water", 0) < 50:
            recommendations.append("Implement water-saving measures and fixtures")
        
        if scores.get("waste", 0) < 50:
            recommendations.append("Establish comprehensive recycling and composting programs")
        
        if scores.get("local", 0) < 50:
            recommendations.append("Increase sourcing from local suppliers and communities")
        
        return recommendations
    
    async def process_query(self, query: str, context: Optional[Dict] = None) -> Dict:
        """
        Process carbon optimization queries
        """
        query_lower = query.lower()
        
        if "calculate" in query_lower or "footprint" in query_lower:
            # Calculate carbon footprint
            trip_data = context or {
                "trip_id": "TRIP001",
                "duration_days": 7,
                "transport": [{"mode": "airplane", "distance_km": 2000, "passengers": 1}],
                "accommodation": {"type": "standard_hotel", "nights": 6, "guests": 1},
                "activities": [{"type": "hiking", "participants": 1, "duration_hours": 4}],
                "meals": [{"type": "local_meal", "quantity": 21}]
            }
            
            footprint = await self.calculate_carbon_footprint(trip_data)
            
            return {
                "response_type": "carbon_calculation",
                "data": {
                    "total_emissions_kg": footprint.co2_emissions_kg,
                    "emission_level": footprint.emission_level.value,
                    "breakdown": footprint.breakdown,
                    "offset_required": footprint.offset_required
                }
            }
        
        elif "reduce" in query_lower or "strategies" in query_lower:
            # Generate reduction strategies
            footprint = CarbonFootprint(
                activity_id="TRIP001",
                activity_type="trip",
                co2_emissions_kg=250.0,
                emission_level=EmissionLevel.MODERATE,
                calculation_method="DEFRA",
                breakdown={"transport": 150, "accommodation": 50, "activities": 30, "food": 20},
                offset_required=275.0,
                timestamp=datetime.utcnow()
            )
            
            strategies = await self.generate_reduction_strategies(footprint, context or {})
            
            return {
                "response_type": "reduction_strategies",
                "data": [
                    {
                        "name": s.strategy_name,
                        "reduction_kg": s.potential_reduction_kg,
                        "difficulty": s.difficulty,
                        "roi": s.roi_percentage
                    }
                    for s in strategies
                ]
            }
        
        elif "offset" in query_lower:
            # Recommend offset projects
            offset_amount = context.get("offset_amount_kg", 250.0)
            projects = await self.recommend_offset_projects(offset_amount)
            
            return {
                "response_type": "offset_recommendations",
                "data": [
                    {
                        "name": p.project_name,
                        "type": p.project_type,
                        "cost_per_ton": p.cost_per_ton,
                        "certification": p.certification
                    }
                    for p in projects[:3]
                ]
            }
        
        elif "route" in query_lower or "optimize" in query_lower:
            # Optimize route
            waypoints = context.get("waypoints", [
                {"name": "Start", "lat": 40.7128, "lon": -74.0060},
                {"name": "End", "lat": 41.8781, "lon": -87.6298}
            ])
            
            optimization = await self.optimize_route_for_emissions(waypoints)
            
            return {
                "response_type": "route_optimization",
                "data": optimization
            }
        
        elif "report" in query_lower:
            # Generate report
            user_id = context.get("user_id", "USER001")
            report = await self.generate_sustainability_report(user_id)
            
            return {
                "response_type": "sustainability_report",
                "data": report
            }
        
        else:
            return {
                "response_type": "general_info",
                "data": {
                    "message": "I can help with carbon footprint calculations, reduction strategies, offset recommendations, and route optimization.",
                    "capabilities": self.capabilities,
                    "emission_categories": list(self.emission_factors.keys())[:10]
                }
            }