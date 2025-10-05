"""
EthicalTourismAdvisor AI Agent
Provides guidance on ethical tourism practices and responsible travel
"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import json


class EthicalPrinciple(Enum):
    ANIMAL_WELFARE = "animal_welfare"
    HUMAN_RIGHTS = "human_rights"
    ENVIRONMENTAL_PROTECTION = "environmental_protection"
    CULTURAL_RESPECT = "cultural_respect"
    FAIR_TRADE = "fair_trade"
    CHILD_PROTECTION = "child_protection"
    COMMUNITY_BENEFIT = "community_benefit"
    TRANSPARENCY = "transparency"


class EthicalRating(Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    UNETHICAL = "unethical"


@dataclass
class EthicalAssessment:
    entity_id: str
    entity_type: str  # tour/accommodation/activity/destination
    overall_score: float
    rating: EthicalRating
    principles_scores: Dict[str, float]
    violations: List[str]
    certifications: List[str]
    recommendations: List[str]
    timestamp: datetime


@dataclass
class EthicalDilemma:
    dilemma_id: str
    title: str
    description: str
    stakeholders_affected: List[str]
    ethical_principles: List[EthicalPrinciple]
    potential_solutions: List[Dict]
    recommended_action: str
    justification: str


@dataclass
class ResponsiblePractice:
    practice_id: str
    category: str
    title: str
    description: str
    implementation_difficulty: str
    impact_level: str
    resources_needed: List[str]
    expected_outcomes: List[str]


class EthicalTourismAdvisorAgent:
    """
    AI Agent for ethical tourism guidance and responsible travel practices
    """
    
    def __init__(self):
        self.agent_id = "ethical_tourism_advisor"
        self.version = "1.0.0"
        self.capabilities = [
            "ethical_assessment",
            "dilemma_resolution",
            "best_practice_guidance",
            "certification_verification",
            "policy_development",
            "training_programs",
            "compliance_monitoring",
            "stakeholder_engagement"
        ]
        
        # Ethical principles weights
        self.principle_weights = {
            "animal_welfare": 0.15,
            "human_rights": 0.20,
            "environmental_protection": 0.15,
            "cultural_respect": 0.15,
            "fair_trade": 0.10,
            "child_protection": 0.15,
            "community_benefit": 0.10
        }
        
        # Certification bodies
        self.certification_bodies = {
            "GSTC": "Global Sustainable Tourism Council",
            "Rainforest Alliance": "Rainforest Alliance Certified",
            "Green Key": "Green Key Eco-Label",
            "EarthCheck": "EarthCheck Certification",
            "Travelife": "Travelife Sustainability System",
            "B Corp": "Certified B Corporation",
            "Fair Trade Tourism": "Fair Trade Tourism Certified",
            "WTTC": "World Travel & Tourism Council SafeTravels"
        }
        
        # Common ethical violations
        self.ethical_violations = {
            "animal_exploitation": "Use of captive wildlife for entertainment",
            "cultural_appropriation": "Misrepresentation or commercialization of culture",
            "child_labor": "Employment of minors in tourism services",
            "unfair_wages": "Payment below living wage standards",
            "environmental_damage": "Practices causing ecological harm",
            "forced_displacement": "Tourism development displacing local communities",
            "discrimination": "Unfair treatment based on protected characteristics",
            "greenwashing": "False or misleading environmental claims"
        }
    
    async def assess_ethical_compliance(self,
                                       entity_data: Dict) -> EthicalAssessment:
        """
        Comprehensive ethical assessment of tourism entity
        """
        principles_scores = {}
        violations = []
        
        # Assess each ethical principle
        for principle in EthicalPrinciple:
            score = await self._assess_principle(principle, entity_data)
            principles_scores[principle.value] = score
            
            # Check for violations
            if score < 40:
                violation = self._identify_violation(principle, entity_data)
                if violation:
                    violations.append(violation)
        
        # Calculate overall score
        overall_score = sum(
            principles_scores[p] * self.principle_weights.get(p, 0.1)
            for p in principles_scores
        )
        
        # Determine rating
        rating = self._determine_ethical_rating(overall_score)
        
        # Get certifications
        certifications = self._verify_certifications(entity_data.get("certifications", []))
        
        # Generate recommendations
        recommendations = await self._generate_ethical_recommendations(
            principles_scores, violations, entity_data
        )
        
        return EthicalAssessment(
            entity_id=entity_data.get("id", ""),
            entity_type=entity_data.get("type", "unknown"),
            overall_score=round(overall_score, 2),
            rating=rating,
            principles_scores=principles_scores,
            violations=violations,
            certifications=certifications,
            recommendations=recommendations,
            timestamp=datetime.utcnow()
        )
    
    async def _assess_principle(self,
                               principle: EthicalPrinciple,
                               entity_data: Dict) -> float:
        """
        Assess compliance with specific ethical principle
        """
        score = 50  # Start with neutral score
        
        if principle == EthicalPrinciple.ANIMAL_WELFARE:
            # Check animal-related practices
            if entity_data.get("no_captive_animals", False):
                score += 30
            if entity_data.get("wildlife_viewing_guidelines", False):
                score += 20
            if entity_data.get("animal_rides", False):
                score -= 40
            if entity_data.get("animal_shows", False):
                score -= 30
        
        elif principle == EthicalPrinciple.HUMAN_RIGHTS:
            # Check labor practices
            if entity_data.get("fair_wages", False):
                score += 25
            if entity_data.get("worker_rights", False):
                score += 25
            if entity_data.get("discrimination_reports", 0) > 0:
                score -= 30
            if entity_data.get("safety_standards", False):
                score += 15
        
        elif principle == EthicalPrinciple.ENVIRONMENTAL_PROTECTION:
            # Check environmental practices
            if entity_data.get("renewable_energy", False):
                score += 20
            if entity_data.get("waste_reduction", False):
                score += 20
            if entity_data.get("water_conservation", False):
                score += 15
            if entity_data.get("plastic_free", False):
                score += 15
            if entity_data.get("carbon_offset", False):
                score += 10
        
        elif principle == EthicalPrinciple.CULTURAL_RESPECT:
            # Check cultural sensitivity
            if entity_data.get("cultural_training", False):
                score += 25
            if entity_data.get("local_guides", False):
                score += 20
            if entity_data.get("cultural_permissions", False):
                score += 20
            if entity_data.get("cultural_complaints", 0) > 0:
                score -= 25
        
        elif principle == EthicalPrinciple.FAIR_TRADE:
            # Check fair trade practices
            if entity_data.get("local_sourcing", 0) > 70:
                score += 30
            elif entity_data.get("local_sourcing", 0) > 50:
                score += 15
            if entity_data.get("fair_pricing", False):
                score += 20
        
        elif principle == EthicalPrinciple.CHILD_PROTECTION:
            # Check child protection measures
            if entity_data.get("child_protection_policy", False):
                score += 30
            if entity_data.get("staff_background_checks", False):
                score += 20
            if entity_data.get("child_labor", False):
                score -= 50
            if entity_data.get("orphanage_visits", False):
                score -= 30
        
        elif principle == EthicalPrinciple.COMMUNITY_BENEFIT:
            # Check community engagement
            if entity_data.get("local_employment", 0) > 80:
                score += 30
            elif entity_data.get("local_employment", 0) > 60:
                score += 15
            if entity_data.get("community_projects", 0) > 3:
                score += 20
            if entity_data.get("revenue_sharing", False):
                score += 15
        
        return max(0, min(100, score))
    
    def _identify_violation(self,
                          principle: EthicalPrinciple,
                          entity_data: Dict) -> Optional[str]:
        """
        Identify specific ethical violations
        """
        if principle == EthicalPrinciple.ANIMAL_WELFARE:
            if entity_data.get("animal_rides") or entity_data.get("animal_shows"):
                return self.ethical_violations["animal_exploitation"]
        
        elif principle == EthicalPrinciple.CHILD_PROTECTION:
            if entity_data.get("child_labor"):
                return self.ethical_violations["child_labor"]
            
        elif principle == EthicalPrinciple.HUMAN_RIGHTS:
            if not entity_data.get("fair_wages"):
                return self.ethical_violations["unfair_wages"]
        
        return None
    
    def _determine_ethical_rating(self, score: float) -> EthicalRating:
        """
        Determine ethical rating based on score
        """
        if score >= 85:
            return EthicalRating.EXCELLENT
        elif score >= 70:
            return EthicalRating.GOOD
        elif score >= 50:
            return EthicalRating.FAIR
        elif score >= 30:
            return EthicalRating.POOR
        else:
            return EthicalRating.UNETHICAL
    
    def _verify_certifications(self, claimed_certs: List[str]) -> List[str]:
        """
        Verify claimed certifications
        """
        verified = []
        
        for cert in claimed_certs:
            if cert in self.certification_bodies:
                # In production, would verify with certification body API
                verified.append(f"{cert} (Verified)")
            else:
                verified.append(f"{cert} (Unverified)")
        
        return verified
    
    async def _generate_ethical_recommendations(self,
                                               scores: Dict,
                                               violations: List,
                                               entity_data: Dict) -> List[str]:
        """
        Generate ethical improvement recommendations
        """
        recommendations = []
        
        # Address violations first
        for violation in violations:
            if "animal" in violation.lower():
                recommendations.append("Immediately cease all captive animal entertainment activities")
            elif "child" in violation.lower():
                recommendations.append("Implement comprehensive child protection policy")
            elif "wage" in violation.lower():
                recommendations.append("Ensure all workers receive living wages")
        
        # Improve low-scoring principles
        for principle, score in scores.items():
            if score < 60:
                if principle == "environmental_protection":
                    recommendations.append("Develop comprehensive environmental management system")
                elif principle == "cultural_respect":
                    recommendations.append("Provide cultural sensitivity training for all staff")
                elif principle == "community_benefit":
                    recommendations.append("Increase local employment and community investment")
        
        # Suggest certifications
        if not entity_data.get("certifications"):
            recommendations.append("Pursue recognized sustainability certification (e.g., GSTC)")
        
        return recommendations[:7]  # Return top 7 recommendations
    
    async def resolve_ethical_dilemma(self,
                                     dilemma_description: str,
                                     context: Dict) -> EthicalDilemma:
        """
        Help resolve ethical dilemmas in tourism
        """
        # Analyze the dilemma
        affected_stakeholders = self._identify_stakeholders(dilemma_description, context)
        relevant_principles = self._identify_relevant_principles(dilemma_description)
        
        # Generate potential solutions
        solutions = await self._generate_solutions(
            dilemma_description, affected_stakeholders, relevant_principles
        )
        
        # Evaluate and recommend
        recommended = self._evaluate_solutions(solutions, relevant_principles)
        
        return EthicalDilemma(
            dilemma_id=f"DIL-{datetime.utcnow().timestamp()}",
            title=context.get("title", "Ethical Dilemma"),
            description=dilemma_description,
            stakeholders_affected=affected_stakeholders,
            ethical_principles=relevant_principles,
            potential_solutions=solutions,
            recommended_action=recommended["action"],
            justification=recommended["justification"]
        )
    
    def _identify_stakeholders(self,
                              description: str,
                              context: Dict) -> List[str]:
        """
        Identify affected stakeholders
        """
        stakeholders = []
        
        stakeholder_keywords = {
            "local community": ["local", "community", "resident"],
            "tourists": ["tourist", "visitor", "guest", "traveler"],
            "employees": ["worker", "employee", "staff"],
            "business owners": ["owner", "operator", "company"],
            "environment": ["nature", "wildlife", "ecosystem"],
            "indigenous peoples": ["indigenous", "native", "tribal"],
            "children": ["child", "minor", "youth"],
            "animals": ["animal", "wildlife", "species"]
        }
        
        description_lower = description.lower()
        
        for stakeholder, keywords in stakeholder_keywords.items():
            if any(keyword in description_lower for keyword in keywords):
                stakeholders.append(stakeholder)
        
        return stakeholders or ["general public"]
    
    def _identify_relevant_principles(self, description: str) -> List[EthicalPrinciple]:
        """
        Identify relevant ethical principles
        """
        principles = []
        description_lower = description.lower()
        
        principle_keywords = {
            EthicalPrinciple.ANIMAL_WELFARE: ["animal", "wildlife", "species"],
            EthicalPrinciple.HUMAN_RIGHTS: ["rights", "discrimination", "freedom"],
            EthicalPrinciple.ENVIRONMENTAL_PROTECTION: ["environment", "pollution", "conservation"],
            EthicalPrinciple.CULTURAL_RESPECT: ["culture", "tradition", "heritage"],
            EthicalPrinciple.FAIR_TRADE: ["fair", "price", "trade"],
            EthicalPrinciple.CHILD_PROTECTION: ["child", "minor", "youth"],
            EthicalPrinciple.COMMUNITY_BENEFIT: ["community", "local", "benefit"]
        }
        
        for principle, keywords in principle_keywords.items():
            if any(keyword in description_lower for keyword in keywords):
                principles.append(principle)
        
        return principles or [EthicalPrinciple.TRANSPARENCY]
    
    async def _generate_solutions(self,
                                 description: str,
                                 stakeholders: List[str],
                                 principles: List[EthicalPrinciple]) -> List[Dict]:
        """
        Generate potential solutions to ethical dilemma
        """
        solutions = []
        
        # Solution 1: Stakeholder engagement
        solutions.append({
            "option": "Multi-stakeholder consultation",
            "description": "Engage all affected parties in collaborative decision-making",
            "pros": ["Inclusive", "Democratic", "Builds trust"],
            "cons": ["Time-consuming", "May not reach consensus"],
            "ethical_score": 85
        })
        
        # Solution 2: Policy implementation
        solutions.append({
            "option": "Implement strict ethical policy",
            "description": "Establish and enforce clear ethical guidelines",
            "pros": ["Clear standards", "Consistent application"],
            "cons": ["May be inflexible", "Could impact business"],
            "ethical_score": 80
        })
        
        # Solution 3: Gradual transition
        solutions.append({
            "option": "Phased ethical improvement",
            "description": "Gradually implement changes to minimize disruption",
            "pros": ["Less disruptive", "Allows adaptation"],
            "cons": ["Slower progress", "May compromise principles"],
            "ethical_score": 70
        })
        
        # Solution 4: Alternative approach
        solutions.append({
            "option": "Innovative alternative solution",
            "description": "Find creative way to address concerns of all parties",
            "pros": ["Win-win potential", "Innovation"],
            "cons": ["Uncertain outcome", "May require investment"],
            "ethical_score": 75
        })
        
        return solutions
    
    def _evaluate_solutions(self,
                          solutions: List[Dict],
                          principles: List[EthicalPrinciple]) -> Dict:
        """
        Evaluate and recommend best solution
        """
        # Sort by ethical score
        sorted_solutions = sorted(solutions, key=lambda x: x["ethical_score"], reverse=True)
        best_solution = sorted_solutions[0]
        
        justification = (
            f"This solution scores highest on ethical criteria ({best_solution['ethical_score']}/100) "
            f"and best addresses the principles of {', '.join([p.value for p in principles[:2]])}. "
            f"Key advantages include: {', '.join(best_solution['pros'][:2])}."
        )
        
        return {
            "action": best_solution["option"],
            "justification": justification
        }
    
    async def develop_responsible_practices(self,
                                          business_type: str,
                                          current_practices: Optional[Dict] = None) -> List[ResponsiblePractice]:
        """
        Develop responsible tourism practices
        """
        practices = []
        
        # Core responsible practices
        core_practices = [
            {
                "category": "Environmental",
                "title": "Zero Single-Use Plastic Policy",
                "description": "Eliminate all single-use plastics from operations",
                "difficulty": "medium",
                "impact": "high"
            },
            {
                "category": "Social",
                "title": "Local Employment Priority",
                "description": "Prioritize hiring from local communities (80% minimum)",
                "difficulty": "low",
                "impact": "high"
            },
            {
                "category": "Economic",
                "title": "Local Sourcing Program",
                "description": "Source 70% of supplies from local producers",
                "difficulty": "medium",
                "impact": "high"
            },
            {
                "category": "Cultural",
                "title": "Cultural Immersion Training",
                "description": "Mandatory cultural sensitivity training for all staff",
                "difficulty": "low",
                "impact": "medium"
            },
            {
                "category": "Governance",
                "title": "Transparency Reporting",
                "description": "Publish annual sustainability and impact reports",
                "difficulty": "medium",
                "impact": "medium"
            }
        ]
        
        # Create ResponsiblePractice objects
        for idx, practice_data in enumerate(core_practices):
            practice = ResponsiblePractice(
                practice_id=f"PRA-{idx+1:03d}",
                category=practice_data["category"],
                title=practice_data["title"],
                description=practice_data["description"],
                implementation_difficulty=practice_data["difficulty"],
                impact_level=practice_data["impact"],
                resources_needed=self._identify_resources(practice_data["category"]),
                expected_outcomes=self._define_outcomes(practice_data["category"])
            )
            practices.append(practice)
        
        # Filter based on current practices
        if current_practices:
            # Remove already implemented practices
            implemented = current_practices.get("implemented", [])
            practices = [p for p in practices if p.title not in implemented]
        
        return practices
    
    def _identify_resources(self, category: str) -> List[str]:
        """
        Identify resources needed for practice implementation
        """
        resources_map = {
            "Environmental": ["Environmental consultant", "Monitoring equipment", "Staff training"],
            "Social": ["HR specialist", "Community liaison", "Training budget"],
            "Economic": ["Supply chain analyst", "Local supplier network", "Financial planning"],
            "Cultural": ["Cultural expert", "Training materials", "Community partnerships"],
            "Governance": ["Compliance officer", "Reporting software", "Audit services"]
        }
        
        return resources_map.get(category, ["General resources"])
    
    def _define_outcomes(self, category: str) -> List[str]:
        """
        Define expected outcomes for practices
        """
        outcomes_map = {
            "Environmental": [
                "Reduced environmental footprint",
                "Cost savings from efficiency",
                "Environmental certification eligibility"
            ],
            "Social": [
                "Improved community relations",
                "Higher employee satisfaction",
                "Enhanced local economic impact"
            ],
            "Economic": [
                "Stronger local supply chains",
                "Economic multiplier effect",
                "Community prosperity"
            ],
            "Cultural": [
                "Better cultural understanding",
                "Authentic experiences",
                "Cultural preservation"
            ],
            "Governance": [
                "Increased stakeholder trust",
                "Better decision-making",
                "Risk mitigation"
            ]
        }
        
        return outcomes_map.get(category, ["Improved sustainability"])[:2]
    
    async def create_training_program(self,
                                     organization: str,
                                     focus_areas: List[str]) -> Dict:
        """
        Create ethical tourism training program
        """
        modules = []
        
        # Core modules
        core_modules = {
            "foundations": {
                "title": "Foundations of Ethical Tourism",
                "duration": "4 hours",
                "topics": [
                    "Principles of responsible travel",
                    "Global sustainability goals",
                    "Tourism impacts overview"
                ]
            },
            "animal_welfare": {
                "title": "Animal Welfare in Tourism",
                "duration": "3 hours",
                "topics": [
                    "Wildlife interaction guidelines",
                    "Identifying exploitation",
                    "Alternative experiences"
                ]
            },
            "cultural_sensitivity": {
                "title": "Cultural Sensitivity and Respect",
                "duration": "4 hours",
                "topics": [
                    "Cultural awareness",
                    "Appropriate behavior",
                    "Photography ethics"
                ]
            },
            "environmental": {
                "title": "Environmental Stewardship",
                "duration": "3 hours",
                "topics": [
                    "Leave no trace principles",
                    "Carbon footprint reduction",
                    "Resource conservation"
                ]
            },
            "community": {
                "title": "Community Engagement",
                "duration": "3 hours",
                "topics": [
                    "Supporting local economies",
                    "Fair trade practices",
                    "Community tourism benefits"
                ]
            }
        }
        
        # Select modules based on focus areas
        for area in focus_areas:
            if area.lower() in core_modules:
                modules.append(core_modules[area.lower()])
            else:
                # Add all core modules if no specific focus
                modules = list(core_modules.values())
                break
        
        # Calculate total duration
        total_hours = sum(int(m["duration"].split()[0]) for m in modules)
        
        # Create assessment
        assessment = {
            "type": "Mixed assessment",
            "components": [
                "Multiple choice quiz (30%)",
                "Case study analysis (40%)",
                "Practical application (30%)"
            ],
            "passing_score": 75,
            "certification": "Ethical Tourism Practitioner"
        }
        
        # Implementation plan
        implementation = {
            "delivery_method": "Blended learning",
            "schedule": "2 weeks (part-time)",
            "class_size": "15-20 participants",
            "materials": [
                "Training manual",
                "Video resources",
                "Case studies",
                "Best practice guides"
            ]
        }
        
        return {
            "organization": organization,
            "program_title": "Ethical Tourism Excellence Training",
            "modules": modules,
            "total_duration": f"{total_hours} hours",
            "assessment": assessment,
            "implementation": implementation,
            "expected_outcomes": [
                "100% staff awareness of ethical principles",
                "Improved customer satisfaction scores",
                "Reduced ethical incidents",
                "Enhanced reputation"
            ],
            "follow_up": {
                "refresher_training": "Annual",
                "monitoring": "Quarterly assessments",
                "updates": "Bi-annual content review"
            }
        }
    
    async def monitor_compliance(self,
                                entity_id: str,
                                monitoring_period: str) -> Dict:
        """
        Monitor ethical compliance over time
        """
        # Generate monitoring report
        metrics = {
            "compliance_score": 78.5,
            "trend": "improving",
            "violations_reported": 2,
            "violations_resolved": 2,
            "stakeholder_complaints": 3,
            "positive_feedback": 45,
            "certification_status": "Active",
            "audit_results": "Satisfactory"
        }
        
        # Identify areas of concern
        concerns = []
        if metrics["violations_reported"] > 0:
            concerns.append("Violations reported during period")
        if metrics["compliance_score"] < 80:
            concerns.append("Compliance score below target")
        
        # Generate action items
        action_items = []
        if concerns:
            action_items.extend([
                "Review and strengthen policies",
                "Conduct additional staff training",
                "Increase monitoring frequency"
            ])
        
        return {
            "entity_id": entity_id,
            "monitoring_period": monitoring_period,
            "metrics": metrics,
            "concerns": concerns,
            "action_items": action_items,
            "next_review": "3 months",
            "overall_status": "Satisfactory with areas for improvement"
        }
    
    async def process_query(self, query: str, context: Optional[Dict] = None) -> Dict:
        """
        Process ethical tourism queries
        """
        query_lower = query.lower()
        
        if "assess" in query_lower or "compliance" in query_lower:
            # Assess ethical compliance
            entity_data = context or {
                "id": "ENT001",
                "type": "tour_operator",
                "fair_wages": True,
                "local_employment": 75,
                "environmental_practices": True
            }
            
            assessment = await self.assess_ethical_compliance(entity_data)
            
            return {
                "response_type": "ethical_assessment",
                "data": {
                    "overall_score": assessment.overall_score,
                    "rating": assessment.rating.value,
                    "violations": assessment.violations,
                    "recommendations": assessment.recommendations[:3]
                }
            }
        
        elif "dilemma" in query_lower or "resolve" in query_lower:
            # Resolve ethical dilemma
            dilemma = context.get("dilemma", "Should we allow elephant riding tours?")
            
            resolution = await self.resolve_ethical_dilemma(dilemma, context or {})
            
            return {
                "response_type": "dilemma_resolution",
                "data": {
                    "recommended_action": resolution.recommended_action,
                    "justification": resolution.justification,
                    "affected_stakeholders": resolution.stakeholders_affected,
                    "solutions": [s["option"] for s in resolution.potential_solutions[:3]]
                }
            }
        
        elif "practice" in query_lower or "responsible" in query_lower:
            # Develop responsible practices
            business_type = context.get("business_type", "tour_operator")
            
            practices = await self.develop_responsible_practices(business_type)
            
            return {
                "response_type": "responsible_practices",
                "data": [
                    {
                        "title": p.title,
                        "category": p.category,
                        "impact": p.impact_level,
                        "difficulty": p.implementation_difficulty
                    }
                    for p in practices[:5]
                ]
            }
        
        elif "training" in query_lower:
            # Create training program
            organization = context.get("organization", "Tourism Company")
            focus_areas = context.get("focus_areas", ["foundations", "animal_welfare"])
            
            program = await self.create_training_program(organization, focus_areas)
            
            return {
                "response_type": "training_program",
                "data": program
            }
        
        else:
            return {
                "response_type": "general_info",
                "data": {
                    "message": "I provide guidance on ethical tourism practices and help resolve ethical dilemmas.",
                    "capabilities": self.capabilities,
                    "principles": [p.value for p in EthicalPrinciple]
                }
            }