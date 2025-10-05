"""
LocalImpactAnalyzer AI Agent
Analyzes and optimizes the impact of tourism on local communities
"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import json
import random


class ImpactType(Enum):
    ECONOMIC = "economic"
    SOCIAL = "social"
    CULTURAL = "cultural"
    ENVIRONMENTAL = "environmental"
    INFRASTRUCTURE = "infrastructure"


class ImpactLevel(Enum):
    VERY_POSITIVE = "very_positive"
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    VERY_NEGATIVE = "very_negative"


@dataclass
class LocalBusiness:
    business_id: str
    name: str
    type: str
    owner_origin: str  # local/non-local
    employees_local: int
    employees_total: int
    revenue_to_community: float
    certifications: List[str]


@dataclass
class CommunityImpact:
    community_id: str
    community_name: str
    population: int
    impact_score: float
    impact_level: ImpactLevel
    economic_benefit: float
    social_changes: List[str]
    cultural_preservation: float
    environmental_impact: float
    recommendations: List[str]
    timestamp: datetime


@dataclass
class StakeholderFeedback:
    stakeholder_id: str
    stakeholder_type: str  # resident/business/government/ngo
    satisfaction_score: float
    concerns: List[str]
    suggestions: List[str]
    priority_level: str


class LocalImpactAnalyzerAgent:
    """
    AI Agent for analyzing and optimizing tourism's impact on local communities
    """
    
    def __init__(self):
        self.agent_id = "local_impact_analyzer"
        self.version = "1.0.0"
        self.capabilities = [
            "impact_assessment",
            "community_benefit_analysis",
            "stakeholder_engagement",
            "local_business_promotion",
            "cultural_preservation",
            "economic_distribution",
            "social_monitoring",
            "recommendation_generation"
        ]
        
        # Impact metrics and weights
        self.impact_weights = {
            "economic": 0.30,
            "social": 0.25,
            "cultural": 0.25,
            "environmental": 0.20
        }
        
        # Stakeholder categories
        self.stakeholder_types = [
            "local_residents",
            "local_businesses",
            "indigenous_communities",
            "local_government",
            "cultural_organizations",
            "environmental_groups",
            "youth_groups",
            "women_organizations"
        ]
        
        # Local business categories
        self.local_business_categories = [
            "accommodation",
            "restaurants",
            "guides",
            "transportation",
            "crafts",
            "entertainment",
            "agriculture",
            "services"
        ]
    
    async def analyze_community_impact(self,
                                      tourism_data: Dict,
                                      community_data: Dict) -> CommunityImpact:
        """
        Comprehensive analysis of tourism impact on local community
        """
        # Calculate economic impact
        economic_impact = await self._calculate_economic_impact(
            tourism_data, community_data
        )
        
        # Analyze social impact
        social_impact = await self._analyze_social_impact(
            tourism_data, community_data
        )
        
        # Evaluate cultural impact
        cultural_impact = await self._evaluate_cultural_impact(
            tourism_data, community_data
        )
        
        # Assess environmental impact
        environmental_impact = await self._assess_environmental_impact(
            tourism_data, community_data
        )
        
        # Calculate overall impact score
        overall_score = (
            economic_impact["score"] * self.impact_weights["economic"] +
            social_impact["score"] * self.impact_weights["social"] +
            cultural_impact["score"] * self.impact_weights["cultural"] +
            environmental_impact["score"] * self.impact_weights["environmental"]
        )
        
        # Determine impact level
        impact_level = self._determine_impact_level(overall_score)
        
        # Generate recommendations
        recommendations = await self._generate_community_recommendations(
            economic_impact, social_impact, cultural_impact, environmental_impact
        )
        
        return CommunityImpact(
            community_id=community_data.get("id", ""),
            community_name=community_data.get("name", ""),
            population=community_data.get("population", 0),
            impact_score=round(overall_score, 2),
            impact_level=impact_level,
            economic_benefit=economic_impact["total_benefit"],
            social_changes=social_impact["changes"],
            cultural_preservation=cultural_impact["preservation_score"],
            environmental_impact=environmental_impact["impact_score"],
            recommendations=recommendations,
            timestamp=datetime.utcnow()
        )
    
    async def _calculate_economic_impact(self,
                                        tourism_data: Dict,
                                        community_data: Dict) -> Dict:
        """
        Calculate economic impact of tourism on local community
        """
        # Direct economic impact
        tourist_spending = tourism_data.get("annual_spending", 0)
        local_employment = tourism_data.get("local_jobs_created", 0)
        
        # Calculate local retention rate
        local_businesses = community_data.get("local_business_percentage", 50) / 100
        local_retention = tourist_spending * local_businesses
        
        # Calculate multiplier effect
        multiplier = 1.5  # Economic multiplier for tourism
        total_economic_impact = local_retention * multiplier
        
        # Employment impact
        avg_local_wage = community_data.get("average_wage", 30000)
        employment_value = local_employment * avg_local_wage
        
        # Tax revenue
        tax_rate = 0.15
        tax_revenue = total_economic_impact * tax_rate
        
        # Calculate score (0-100)
        gdp = community_data.get("local_gdp", 1000000)
        economic_contribution = (total_economic_impact / gdp) * 100
        score = min(economic_contribution * 2, 100)  # Cap at 100
        
        return {
            "score": score,
            "total_benefit": total_economic_impact,
            "local_retention": local_retention,
            "employment_value": employment_value,
            "tax_revenue": tax_revenue,
            "contribution_to_gdp": economic_contribution,
            "details": {
                "direct_spending": tourist_spending,
                "jobs_created": local_employment,
                "multiplier_effect": multiplier,
                "local_business_share": local_businesses
            }
        }
    
    async def _analyze_social_impact(self,
                                    tourism_data: Dict,
                                    community_data: Dict) -> Dict:
        """
        Analyze social impact of tourism
        """
        changes = []
        positive_impacts = 0
        negative_impacts = 0
        
        # Population pressure
        tourist_volume = tourism_data.get("annual_visitors", 0)
        population = community_data.get("population", 1)
        visitor_ratio = tourist_volume / population
        
        if visitor_ratio > 10:
            changes.append("High tourism pressure on local infrastructure")
            negative_impacts += 2
        elif visitor_ratio > 5:
            changes.append("Moderate tourism pressure")
            negative_impacts += 1
        else:
            changes.append("Sustainable visitor-to-resident ratio")
            positive_impacts += 1
        
        # Cost of living impact
        if tourism_data.get("price_inflation", 0) > 10:
            changes.append("Significant increase in cost of living")
            negative_impacts += 2
        elif tourism_data.get("price_inflation", 0) > 5:
            changes.append("Moderate increase in living costs")
            negative_impacts += 1
        
        # Social cohesion
        if community_data.get("community_involvement", 0) > 60:
            changes.append("Strong community involvement in tourism")
            positive_impacts += 2
        
        # Youth opportunities
        if tourism_data.get("youth_employment", 0) > 30:
            changes.append("Good youth employment opportunities")
            positive_impacts += 2
        
        # Gender equality
        if tourism_data.get("women_employment", 0) > 40:
            changes.append("Positive impact on gender equality")
            positive_impacts += 1
        
        # Calculate score
        score = 50 + (positive_impacts * 10) - (negative_impacts * 10)
        score = max(0, min(100, score))
        
        return {
            "score": score,
            "changes": changes,
            "positive_impacts": positive_impacts,
            "negative_impacts": negative_impacts,
            "visitor_pressure": visitor_ratio,
            "community_sentiment": "positive" if score > 60 else "mixed" if score > 40 else "negative"
        }
    
    async def _evaluate_cultural_impact(self,
                                       tourism_data: Dict,
                                       community_data: Dict) -> Dict:
        """
        Evaluate impact on local culture
        """
        preservation_factors = 0
        degradation_factors = 0
        
        # Cultural preservation initiatives
        if tourism_data.get("cultural_programs", 0) > 5:
            preservation_factors += 2
        
        if tourism_data.get("traditional_craft_support", False):
            preservation_factors += 1
        
        if tourism_data.get("language_preservation", False):
            preservation_factors += 1
        
        if tourism_data.get("cultural_center", False):
            preservation_factors += 1
        
        # Cultural degradation risks
        if tourism_data.get("cultural_commodification", False):
            degradation_factors += 2
        
        if tourism_data.get("tradition_modification", False):
            degradation_factors += 1
        
        if community_data.get("youth_cultural_disconnect", 0) > 30:
            degradation_factors += 1
        
        # Calculate preservation score
        preservation_score = 50 + (preservation_factors * 10) - (degradation_factors * 15)
        preservation_score = max(0, min(100, preservation_score))
        
        # Cultural authenticity index
        authenticity = 100 - tourism_data.get("commercialization_level", 0)
        
        # Overall cultural impact score
        score = (preservation_score + authenticity) / 2
        
        return {
            "score": score,
            "preservation_score": preservation_score,
            "authenticity_index": authenticity,
            "preservation_initiatives": preservation_factors,
            "risk_factors": degradation_factors,
            "cultural_programs": tourism_data.get("cultural_programs", 0),
            "recommendations": self._get_cultural_recommendations(preservation_score)
        }
    
    def _get_cultural_recommendations(self, preservation_score: float) -> List[str]:
        """
        Generate cultural preservation recommendations
        """
        recommendations = []
        
        if preservation_score < 50:
            recommendations.extend([
                "Establish cultural preservation fund",
                "Create authentic cultural experiences program",
                "Support traditional artisan training"
            ])
        elif preservation_score < 70:
            recommendations.extend([
                "Expand cultural education programs",
                "Increase support for traditional festivals"
            ])
        else:
            recommendations.append("Continue current cultural preservation efforts")
        
        return recommendations
    
    async def _assess_environmental_impact(self,
                                          tourism_data: Dict,
                                          community_data: Dict) -> Dict:
        """
        Assess environmental impact on local area
        """
        impact_score = 50  # Start neutral
        
        # Resource consumption
        water_stress = tourism_data.get("water_consumption_increase", 0)
        if water_stress > 20:
            impact_score -= 15
        elif water_stress > 10:
            impact_score -= 8
        
        # Waste management
        if tourism_data.get("waste_management_system", False):
            impact_score += 10
        else:
            impact_score -= 10
        
        # Conservation efforts
        if tourism_data.get("conservation_programs", 0) > 3:
            impact_score += 15
        
        # Pollution levels
        pollution_increase = tourism_data.get("pollution_increase", 0)
        if pollution_increase > 15:
            impact_score -= 20
        elif pollution_increase > 5:
            impact_score -= 10
        
        # Protected area management
        if tourism_data.get("protected_area_fees", False):
            impact_score += 10
        
        impact_score = max(0, min(100, impact_score))
        
        return {
            "score": impact_score,
            "impact_score": impact_score,
            "water_stress": water_stress,
            "pollution_level": pollution_increase,
            "conservation_investment": tourism_data.get("conservation_budget", 0),
            "sustainability_rating": "high" if impact_score > 70 else "moderate" if impact_score > 40 else "low"
        }
    
    def _determine_impact_level(self, score: float) -> ImpactLevel:
        """
        Determine overall impact level
        """
        if score >= 80:
            return ImpactLevel.VERY_POSITIVE
        elif score >= 60:
            return ImpactLevel.POSITIVE
        elif score >= 40:
            return ImpactLevel.NEUTRAL
        elif score >= 20:
            return ImpactLevel.NEGATIVE
        else:
            return ImpactLevel.VERY_NEGATIVE
    
    async def _generate_community_recommendations(self,
                                                 economic: Dict,
                                                 social: Dict,
                                                 cultural: Dict,
                                                 environmental: Dict) -> List[str]:
        """
        Generate comprehensive recommendations for community
        """
        recommendations = []
        
        # Economic recommendations
        if economic["local_retention"] < economic["total_benefit"] * 0.5:
            recommendations.append("Increase local business ownership and participation")
        
        if economic["contribution_to_gdp"] < 5:
            recommendations.append("Develop strategies to increase tourism economic contribution")
        
        # Social recommendations
        if social["visitor_pressure"] > 10:
            recommendations.append("Implement visitor management strategies to reduce overcrowding")
        
        if "cost of living" in " ".join(social["changes"]):
            recommendations.append("Create affordable housing programs for locals")
        
        # Cultural recommendations
        recommendations.extend(cultural["recommendations"])
        
        # Environmental recommendations
        if environmental["impact_score"] < 50:
            recommendations.append("Strengthen environmental protection measures")
        
        if environmental["water_stress"] > 15:
            recommendations.append("Implement water conservation programs")
        
        return recommendations[:10]  # Return top 10 recommendations
    
    async def identify_local_businesses(self,
                                      location: Dict,
                                      category: Optional[str] = None) -> List[LocalBusiness]:
        """
        Identify and promote local businesses
        """
        businesses = []
        
        # Generate sample local businesses (would fetch from database)
        categories = [category] if category else self.local_business_categories
        
        for cat in categories:
            for i in range(random.randint(2, 5)):
                business = LocalBusiness(
                    business_id=f"BUS_{cat}_{i}",
                    name=f"Local {cat.title()} Business {i+1}",
                    type=cat,
                    owner_origin="local" if random.random() > 0.3 else "non-local",
                    employees_local=random.randint(5, 20),
                    employees_total=random.randint(5, 25),
                    revenue_to_community=random.uniform(0.4, 0.9),
                    certifications=self._get_random_certifications()
                )
                businesses.append(business)
        
        # Filter for truly local businesses
        local_businesses = [b for b in businesses if b.owner_origin == "local" 
                          and b.employees_local / b.employees_total > 0.7]
        
        return local_businesses
    
    def _get_random_certifications(self) -> List[str]:
        """
        Get random certifications for businesses
        """
        all_certifications = [
            "Fair Trade",
            "B Corporation",
            "Green Business",
            "Local First",
            "Sustainable Tourism",
            "Community Benefit",
            "Social Enterprise"
        ]
        
        num_certs = random.randint(0, 3)
        return random.sample(all_certifications, num_certs)
    
    async def analyze_stakeholder_feedback(self,
                                          feedback_data: List[Dict]) -> Dict:
        """
        Analyze feedback from various stakeholders
        """
        stakeholder_analysis = {}
        
        for stakeholder_type in self.stakeholder_types:
            type_feedback = [f for f in feedback_data if f.get("type") == stakeholder_type]
            
            if type_feedback:
                avg_satisfaction = sum(f.get("satisfaction", 0) for f in type_feedback) / len(type_feedback)
                
                # Aggregate concerns and suggestions
                all_concerns = []
                all_suggestions = []
                
                for feedback in type_feedback:
                    all_concerns.extend(feedback.get("concerns", []))
                    all_suggestions.extend(feedback.get("suggestions", []))
                
                # Count frequency
                concern_frequency = {}
                for concern in all_concerns:
                    concern_frequency[concern] = concern_frequency.get(concern, 0) + 1
                
                suggestion_frequency = {}
                for suggestion in all_suggestions:
                    suggestion_frequency[suggestion] = suggestion_frequency.get(suggestion, 0) + 1
                
                # Get top concerns and suggestions
                top_concerns = sorted(concern_frequency.items(), key=lambda x: x[1], reverse=True)[:3]
                top_suggestions = sorted(suggestion_frequency.items(), key=lambda x: x[1], reverse=True)[:3]
                
                stakeholder_analysis[stakeholder_type] = {
                    "satisfaction_score": round(avg_satisfaction, 2),
                    "response_count": len(type_feedback),
                    "top_concerns": [c[0] for c in top_concerns],
                    "top_suggestions": [s[0] for s in top_suggestions],
                    "priority_level": self._determine_priority(avg_satisfaction)
                }
        
        # Overall analysis
        all_satisfaction = [s["satisfaction_score"] for s in stakeholder_analysis.values()]
        overall_satisfaction = sum(all_satisfaction) / len(all_satisfaction) if all_satisfaction else 0
        
        return {
            "overall_satisfaction": round(overall_satisfaction, 2),
            "stakeholder_breakdown": stakeholder_analysis,
            "critical_issues": self._identify_critical_issues(stakeholder_analysis),
            "consensus_areas": self._find_consensus_areas(stakeholder_analysis),
            "action_priorities": self._generate_action_priorities(stakeholder_analysis)
        }
    
    def _determine_priority(self, satisfaction: float) -> str:
        """
        Determine priority level based on satisfaction
        """
        if satisfaction < 30:
            return "critical"
        elif satisfaction < 50:
            return "high"
        elif satisfaction < 70:
            return "medium"
        else:
            return "low"
    
    def _identify_critical_issues(self, analysis: Dict) -> List[str]:
        """
        Identify critical issues from stakeholder analysis
        """
        critical = []
        
        for stakeholder, data in analysis.items():
            if data["priority_level"] in ["critical", "high"]:
                for concern in data["top_concerns"]:
                    if concern not in critical:
                        critical.append(concern)
        
        return critical[:5]
    
    def _find_consensus_areas(self, analysis: Dict) -> List[str]:
        """
        Find areas where stakeholders agree
        """
        all_suggestions = []
        
        for data in analysis.values():
            all_suggestions.extend(data.get("top_suggestions", []))
        
        # Find suggestions that appear multiple times
        suggestion_count = {}
        for suggestion in all_suggestions:
            suggestion_count[suggestion] = suggestion_count.get(suggestion, 0) + 1
        
        consensus = [s for s, count in suggestion_count.items() if count >= 2]
        
        return consensus
    
    def _generate_action_priorities(self, analysis: Dict) -> List[Dict]:
        """
        Generate prioritized action items
        """
        priorities = []
        
        # Address critical stakeholder concerns first
        for stakeholder, data in analysis.items():
            if data["priority_level"] == "critical":
                for concern in data["top_concerns"][:2]:
                    priorities.append({
                        "action": f"Address {concern} for {stakeholder}",
                        "priority": "immediate",
                        "stakeholder": stakeholder
                    })
        
        # Add consensus suggestions
        consensus = self._find_consensus_areas(analysis)
        for suggestion in consensus[:3]:
            priorities.append({
                "action": f"Implement: {suggestion}",
                "priority": "high",
                "stakeholder": "multiple"
            })
        
        return priorities[:7]
    
    async def generate_benefit_distribution_plan(self,
                                                tourism_revenue: float,
                                                community_needs: Dict) -> Dict:
        """
        Generate plan for equitable distribution of tourism benefits
        """
        # Allocation percentages
        allocation = {
            "community_development": 0.25,
            "education_training": 0.20,
            "infrastructure": 0.20,
            "cultural_preservation": 0.15,
            "environmental_protection": 0.10,
            "health_services": 0.05,
            "emergency_fund": 0.05
        }
        
        # Calculate amounts
        distribution_plan = {}
        
        for category, percentage in allocation.items():
            amount = tourism_revenue * percentage
            
            # Adjust based on community needs
            need_level = community_needs.get(category, "medium")
            if need_level == "high":
                amount *= 1.2
            elif need_level == "low":
                amount *= 0.8
            
            distribution_plan[category] = {
                "allocated_amount": round(amount, 2),
                "percentage": percentage * 100,
                "priority": need_level,
                "projects": self._suggest_projects(category, amount)
            }
        
        # Ensure total doesn't exceed revenue
        total_allocated = sum(d["allocated_amount"] for d in distribution_plan.values())
        if total_allocated > tourism_revenue:
            scale_factor = tourism_revenue / total_allocated
            for category in distribution_plan:
                distribution_plan[category]["allocated_amount"] *= scale_factor
        
        return {
            "total_revenue": tourism_revenue,
            "distribution_plan": distribution_plan,
            "beneficiaries": self._identify_beneficiaries(distribution_plan),
            "implementation_timeline": self._create_implementation_timeline(),
            "monitoring_framework": self._create_monitoring_framework()
        }
    
    def _suggest_projects(self, category: str, budget: float) -> List[str]:
        """
        Suggest specific projects for each category
        """
        projects_map = {
            "community_development": [
                "Community center renovation",
                "Public space improvement",
                "Local market upgrade"
            ],
            "education_training": [
                "Tourism skills training program",
                "Language education courses",
                "Digital literacy workshops"
            ],
            "infrastructure": [
                "Road improvement project",
                "Water system upgrade",
                "Internet connectivity expansion"
            ],
            "cultural_preservation": [
                "Traditional arts center",
                "Cultural festival support",
                "Heritage site restoration"
            ],
            "environmental_protection": [
                "Waste management system",
                "Reforestation program",
                "Clean energy initiative"
            ],
            "health_services": [
                "Mobile health clinic",
                "Health worker training",
                "Medical equipment upgrade"
            ],
            "emergency_fund": [
                "Disaster preparedness",
                "Emergency response training",
                "Reserve fund establishment"
            ]
        }
        
        return projects_map.get(category, ["General community projects"])[:2]
    
    def _identify_beneficiaries(self, plan: Dict) -> Dict:
        """
        Identify beneficiaries of distribution plan
        """
        beneficiaries = {
            "direct": [],
            "indirect": [],
            "total_people": 0
        }
        
        for category, details in plan.items():
            if category in ["education_training", "health_services"]:
                beneficiaries["direct"].append(f"Students and patients ({category})")
            elif category in ["infrastructure", "community_development"]:
                beneficiaries["indirect"].append(f"All community members ({category})")
        
        beneficiaries["total_people"] = random.randint(1000, 5000)
        
        return beneficiaries
    
    def _create_implementation_timeline(self) -> List[Dict]:
        """
        Create implementation timeline for benefit distribution
        """
        return [
            {
                "phase": "Planning",
                "duration": "Month 1-2",
                "activities": ["Stakeholder consultation", "Project design", "Budget finalization"]
            },
            {
                "phase": "Implementation",
                "duration": "Month 3-9",
                "activities": ["Project execution", "Community engagement", "Progress monitoring"]
            },
            {
                "phase": "Evaluation",
                "duration": "Month 10-12",
                "activities": ["Impact assessment", "Feedback collection", "Report generation"]
            }
        ]
    
    def _create_monitoring_framework(self) -> Dict:
        """
        Create monitoring framework for benefit distribution
        """
        return {
            "indicators": [
                "Number of beneficiaries reached",
                "Funds disbursed vs allocated",
                "Project completion rate",
                "Community satisfaction score",
                "Economic impact metrics"
            ],
            "reporting_frequency": "quarterly",
            "responsible_parties": [
                "Community development committee",
                "Local government",
                "Tourism board",
                "Independent auditor"
            ],
            "evaluation_methods": [
                "Surveys",
                "Focus groups",
                "Financial audits",
                "Impact assessments"
            ]
        }
    
    async def process_query(self, query: str, context: Optional[Dict] = None) -> Dict:
        """
        Process local impact analysis queries
        """
        query_lower = query.lower()
        
        if "analyze" in query_lower or "impact" in query_lower:
            # Analyze community impact
            tourism_data = context.get("tourism_data", {
                "annual_visitors": 50000,
                "annual_spending": 5000000,
                "local_jobs_created": 200
            })
            
            community_data = context.get("community_data", {
                "id": "COM001",
                "name": "Local Community",
                "population": 10000,
                "local_gdp": 50000000
            })
            
            impact = await self.analyze_community_impact(tourism_data, community_data)
            
            return {
                "response_type": "impact_analysis",
                "data": {
                    "impact_score": impact.impact_score,
                    "impact_level": impact.impact_level.value,
                    "economic_benefit": impact.economic_benefit,
                    "recommendations": impact.recommendations[:5]
                }
            }
        
        elif "business" in query_lower or "local" in query_lower:
            # Identify local businesses
            location = context.get("location", {"name": "City Center"})
            category = context.get("category")
            
            businesses = await self.identify_local_businesses(location, category)
            
            return {
                "response_type": "local_businesses",
                "data": [
                    {
                        "name": b.name,
                        "type": b.type,
                        "local_employees": b.employees_local,
                        "community_revenue": b.revenue_to_community
                    }
                    for b in businesses[:5]
                ]
            }
        
        elif "stakeholder" in query_lower or "feedback" in query_lower:
            # Analyze stakeholder feedback
            feedback_data = context.get("feedback", [
                {
                    "type": "local_residents",
                    "satisfaction": 65,
                    "concerns": ["Traffic", "Cost of living"],
                    "suggestions": ["Better traffic management", "Affordable housing"]
                }
            ])
            
            analysis = await self.analyze_stakeholder_feedback(feedback_data)
            
            return {
                "response_type": "stakeholder_analysis",
                "data": analysis
            }
        
        elif "distribution" in query_lower or "benefit" in query_lower:
            # Generate benefit distribution plan
            revenue = context.get("tourism_revenue", 1000000)
            needs = context.get("community_needs", {
                "education_training": "high",
                "infrastructure": "high"
            })
            
            plan = await self.generate_benefit_distribution_plan(revenue, needs)
            
            return {
                "response_type": "distribution_plan",
                "data": plan
            }
        
        else:
            return {
                "response_type": "general_info",
                "data": {
                    "message": "I analyze tourism's impact on local communities and help optimize benefits.",
                    "capabilities": self.capabilities,
                    "metrics": list(self.impact_weights.keys())
                }
            }