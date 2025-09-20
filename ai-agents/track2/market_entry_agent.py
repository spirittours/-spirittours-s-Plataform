"""
Market Entry AI Agent - Global Expansion Intelligence System

Este agente especializado proporciona análisis de mercado y estrategias de entrada
para la expansión global de Spirit Tours, incluyendo:
- Análisis de mercado objetivo
- Evaluación de competidores locales  
- Análisis cultural y regulatorio
- Estrategias de precio localizadas
- Recomendaciones de partnerships
- Métricas de viabilidad de mercado

Parte del sistema Track 2 de Spirit Tours Platform
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import json
import random
from pathlib import Path

# Importar clase base
import sys
sys.path.append(str(Path(__file__).parent.parent / "core"))
from base_agent import BaseAgent, AgentStatus

class MarketViability(Enum):
    """Niveles de viabilidad de mercado"""
    EXCELLENT = "excellent"
    GOOD = "good"
    MODERATE = "moderate"
    CHALLENGING = "challenging"
    NOT_RECOMMENDED = "not_recommended"

class ExpansionPriority(Enum):
    """Prioridades de expansión"""
    IMMEDIATE = "immediate"
    SHORT_TERM = "short_term"
    MEDIUM_TERM = "medium_term"
    LONG_TERM = "long_term"
    FUTURE_CONSIDERATION = "future_consideration"

class MarketEntryStrategy(Enum):
    """Estrategias de entrada al mercado"""
    DIRECT_INVESTMENT = "direct_investment"
    PARTNERSHIP = "partnership"
    FRANCHISE = "franchise"
    ACQUISITION = "acquisition"
    JOINT_VENTURE = "joint_venture"
    LICENSING = "licensing"

class CulturalAdaptation(Enum):
    """Niveles de adaptación cultural requerida"""
    MINIMAL = "minimal"
    MODERATE = "moderate"
    SIGNIFICANT = "significant"
    EXTENSIVE = "extensive"

@dataclass
class CompetitorAnalysis:
    """Análisis de competidor local"""
    name: str
    market_share: float
    pricing_strategy: str
    strengths: List[str]
    weaknesses: List[str]
    customer_rating: float
    revenue_estimate: float
    expansion_plans: Optional[str] = None

@dataclass
class RegulatoryEnvironment:
    """Entorno regulatorio del mercado"""
    business_license_req: List[str]
    tourism_permits: List[str]
    tax_structure: Dict[str, float]
    labor_laws: List[str]
    data_privacy_req: List[str]
    compliance_cost: float
    approval_timeline: int  # días

@dataclass
class CulturalInsights:
    """Insights culturales del mercado"""
    primary_languages: List[str]
    communication_style: str
    booking_preferences: List[str]
    payment_methods: List[str]
    seasonal_patterns: Dict[str, str]
    cultural_considerations: List[str]
    adaptation_level: CulturalAdaptation

@dataclass
class MarketMetrics:
    """Métricas clave del mercado"""
    population: int
    tourism_revenue: float
    growth_rate: float
    digital_adoption: float
    smartphone_penetration: float
    internet_usage: float
    disposable_income: float
    travel_frequency: float

@dataclass
class PartnershipOpportunity:
    """Oportunidad de partnership"""
    partner_name: str
    partner_type: str
    market_reach: int
    revenue_potential: float
    investment_required: float
    risk_level: str
    strategic_value: str
    contact_info: Optional[Dict[str, str]] = None

@dataclass
class MarketAnalysisResult:
    """Resultado completo de análisis de mercado"""
    market_name: str
    country: str
    region: str
    viability: MarketViability
    priority: ExpansionPriority
    entry_strategy: MarketEntryStrategy
    
    # Análisis detallado
    market_metrics: MarketMetrics
    competitors: List[CompetitorAnalysis]
    regulatory_env: RegulatoryEnvironment
    cultural_insights: CulturalInsights
    partnerships: List[PartnershipOpportunity]
    
    # Proyecciones financieras
    investment_required: float
    revenue_projection_y1: float
    revenue_projection_y3: float
    break_even_months: int
    roi_percentage: float
    
    # Riesgos y oportunidades
    key_risks: List[str]
    key_opportunities: List[str]
    success_factors: List[str]
    
    # Recomendaciones
    recommendations: List[str]
    timeline: Dict[str, str]
    budget_breakdown: Dict[str, float]
    
    analysis_date: datetime = field(default_factory=datetime.now)
    confidence_score: float = 0.85

class MarketEntryAgent(BaseAgent):
    """
    Agente de Inteligencia de Entrada al Mercado
    
    Proporciona análisis completo para la expansión global de Spirit Tours,
    incluyendo evaluación de mercados objetivo, análisis competitivo,
    insights culturales y estrategias de entrada optimizadas.
    """
    
    def __init__(self):
        super().__init__("MarketEntry AI", "market_entry")
        self.analysis_cache: Dict[str, MarketAnalysisResult] = {}
        self.monitoring_markets: List[str] = []
        self.competitive_data: Dict[str, List[CompetitorAnalysis]] = {}
        
        # Configuración de análisis
        self.update_interval = 86400  # 24 horas
        self.cache_duration = 604800  # 7 días
        self.confidence_threshold = 0.75
        
        # Mercados priorizados para análisis
        self.priority_markets = [
            "Mexico", "Colombia", "Brazil", "Argentina", "Chile",
            "Spain", "Italy", "France", "Germany", "UK",
            "Japan", "South Korea", "Singapore", "Thailand", "Vietnam",
            "Australia", "New Zealand", "South Africa", "Morocco", "Egypt"
        ]
        
        # Datos de mercados simulados (en producción vendría de APIs reales)
        self._initialize_market_data()
    
    def _initialize_agent_specific(self):
        """Inicialización específica del agente de entrada al mercado"""
        self.logger.info("Inicializando Market Entry AI Agent...")
        
        # Configurar cache y datos base
        self._load_cached_analyses()
        
        # Iniciar monitoreo de mercados prioritarios
        asyncio.create_task(self._start_market_monitoring())
        
        self.logger.info("Market Entry AI Agent inicializado correctamente")
    
    def _initialize_market_data(self):
        """Inicializar datos de mercado simulados"""
        self.market_database = {
            "Mexico": {
                "population": 128932753,
                "tourism_revenue": 24500000000,
                "growth_rate": 0.045,
                "digital_adoption": 0.78,
                "smartphone_penetration": 0.85,
                "internet_usage": 0.72,
                "disposable_income": 8500,
                "travel_frequency": 1.2,
                "languages": ["Spanish"],
                "competitors": [
                    {"name": "Civitatis Mexico", "market_share": 0.15, "rating": 4.2},
                    {"name": "Viator Mexico", "market_share": 0.12, "rating": 4.1},
                    {"name": "GetYourGuide Mexico", "market_share": 0.10, "rating": 4.0}
                ]
            },
            "Brazil": {
                "population": 215313498,
                "tourism_revenue": 32100000000,
                "growth_rate": 0.038,
                "digital_adoption": 0.74,
                "smartphone_penetration": 0.89,
                "internet_usage": 0.74,
                "disposable_income": 7200,
                "travel_frequency": 0.9,
                "languages": ["Portuguese"],
                "competitors": [
                    {"name": "Hurb", "market_share": 0.18, "rating": 4.3},
                    {"name": "Viator Brasil", "market_share": 0.14, "rating": 4.1},
                    {"name": "CVC Tours", "market_share": 0.16, "rating": 4.0}
                ]
            },
            "Spain": {
                "population": 47394837,
                "tourism_revenue": 92300000000,
                "growth_rate": 0.056,
                "digital_adoption": 0.92,
                "smartphone_penetration": 0.94,
                "internet_usage": 0.91,
                "disposable_income": 24500,
                "travel_frequency": 2.8,
                "languages": ["Spanish", "Catalan", "Basque"],
                "competitors": [
                    {"name": "Civitatis", "market_share": 0.22, "rating": 4.5},
                    {"name": "Musement", "market_share": 0.16, "rating": 4.2},
                    {"name": "Tiqets", "market_share": 0.14, "rating": 4.3}
                ]
            }
        }
    
    async def process_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Procesar solicitud de análisis de mercado"""
        try:
            analysis_type = request_data.get("type", "full_analysis")
            
            if analysis_type == "market_analysis":
                return await self._analyze_market(request_data)
            elif analysis_type == "competitive_intelligence":
                return await self._gather_competitive_intelligence(request_data)
            elif analysis_type == "cultural_assessment":
                return await self._assess_cultural_factors(request_data)
            elif analysis_type == "partnership_opportunities":
                return await self._identify_partnerships(request_data)
            elif analysis_type == "expansion_strategy":
                return await self._generate_expansion_strategy(request_data)
            elif analysis_type == "market_comparison":
                return await self._compare_markets(request_data)
            else:
                return await self._full_market_analysis(request_data)
                
        except Exception as e:
            self.logger.error(f"Error procesando solicitud: {e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def _analyze_market(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Realizar análisis completo de un mercado específico"""
        market_name = request_data.get("market", "Mexico")
        
        # Verificar cache
        cache_key = f"analysis_{market_name}"
        if cache_key in self.analysis_cache:
            cached_result = self.analysis_cache[cache_key]
            if (datetime.now() - cached_result.analysis_date).seconds < self.cache_duration:
                return {
                    "success": True,
                    "data": self._serialize_analysis(cached_result),
                    "cached": True
                }
        
        # Realizar nuevo análisis
        analysis = await self._perform_market_analysis(market_name)
        
        # Guardar en cache
        self.analysis_cache[cache_key] = analysis
        
        return {
            "success": True,
            "data": self._serialize_analysis(analysis),
            "cached": False
        }
    
    async def _perform_market_analysis(self, market_name: str) -> MarketAnalysisResult:
        """Realizar análisis detallado de mercado"""
        
        # Simular tiempo de análisis
        await asyncio.sleep(2)
        
        # Obtener datos base del mercado
        market_data = self.market_database.get(market_name, {})
        
        # Crear métricas de mercado
        metrics = MarketMetrics(
            population=market_data.get("population", 50000000),
            tourism_revenue=market_data.get("tourism_revenue", 15000000000),
            growth_rate=market_data.get("growth_rate", 0.04),
            digital_adoption=market_data.get("digital_adoption", 0.75),
            smartphone_penetration=market_data.get("smartphone_penetration", 0.80),
            internet_usage=market_data.get("internet_usage", 0.70),
            disposable_income=market_data.get("disposable_income", 12000),
            travel_frequency=market_data.get("travel_frequency", 1.5)
        )
        
        # Análisis de competidores
        competitors = []
        for comp_data in market_data.get("competitors", []):
            competitor = CompetitorAnalysis(
                name=comp_data["name"],
                market_share=comp_data["market_share"],
                pricing_strategy="competitive",
                strengths=["Brand recognition", "Local presence"],
                weaknesses=["Limited innovation", "High prices"],
                customer_rating=comp_data["rating"],
                revenue_estimate=metrics.tourism_revenue * comp_data["market_share"]
            )
            competitors.append(competitor)
        
        # Entorno regulatorio
        regulatory = RegulatoryEnvironment(
            business_license_req=["Business Registration", "Tourism License"],
            tourism_permits=["Tour Operator Permit", "Guide Certification"],
            tax_structure={"corporate": 0.30, "vat": 0.16},
            labor_laws=["Minimum Wage Compliance", "Worker Benefits"],
            data_privacy_req=["GDPR Compliance", "Local Data Protection"],
            compliance_cost=25000,
            approval_timeline=90
        )
        
        # Insights culturales
        cultural = CulturalInsights(
            primary_languages=market_data.get("languages", ["Local Language"]),
            communication_style="relationship-focused",
            booking_preferences=["Mobile-first", "Social proof", "Local recommendations"],
            payment_methods=["Credit cards", "Digital wallets", "Bank transfers"],
            seasonal_patterns={"high": "Dec-Mar", "low": "Jun-Sep"},
            cultural_considerations=["Family-oriented", "Price-sensitive", "Quality-focused"],
            adaptation_level=CulturalAdaptation.MODERATE
        )
        
        # Oportunidades de partnership
        partnerships = [
            PartnershipOpportunity(
                partner_name="Local Tourism Board",
                partner_type="government",
                market_reach=1000000,
                revenue_potential=2500000,
                investment_required=100000,
                risk_level="low",
                strategic_value="market_access"
            ),
            PartnershipOpportunity(
                partner_name="Regional Hotel Chain",
                partner_type="hospitality",
                market_reach=500000,
                revenue_potential=1800000,
                investment_required=150000,
                risk_level="medium",
                strategic_value="distribution"
            )
        ]
        
        # Calcular viabilidad y prioridad
        viability_score = self._calculate_viability_score(metrics, competitors, regulatory)
        viability = self._determine_viability_level(viability_score)
        priority = self._determine_expansion_priority(viability_score, metrics)
        entry_strategy = self._determine_entry_strategy(viability_score, regulatory, cultural)
        
        # Proyecciones financieras
        investment = self._calculate_investment_required(market_name, entry_strategy)
        revenue_y1 = metrics.tourism_revenue * 0.001  # 0.1% market share objetivo año 1
        revenue_y3 = revenue_y1 * 3.5  # Crecimiento proyectado
        break_even = self._calculate_break_even_months(investment, revenue_y1)
        roi = ((revenue_y3 - investment) / investment) * 100
        
        # Crear resultado completo
        analysis = MarketAnalysisResult(
            market_name=market_name,
            country=market_name,
            region=self._get_region_for_market(market_name),
            viability=viability,
            priority=priority,
            entry_strategy=entry_strategy,
            market_metrics=metrics,
            competitors=competitors,
            regulatory_env=regulatory,
            cultural_insights=cultural,
            partnerships=partnerships,
            investment_required=investment,
            revenue_projection_y1=revenue_y1,
            revenue_projection_y3=revenue_y3,
            break_even_months=break_even,
            roi_percentage=roi,
            key_risks=self._identify_key_risks(market_name, regulatory, competitors),
            key_opportunities=self._identify_key_opportunities(metrics, cultural),
            success_factors=self._identify_success_factors(cultural, competitors),
            recommendations=self._generate_recommendations(viability, cultural, regulatory),
            timeline=self._generate_expansion_timeline(entry_strategy),
            budget_breakdown=self._generate_budget_breakdown(investment),
            confidence_score=viability_score
        )
        
        return analysis
    
    def _calculate_viability_score(self, metrics: MarketMetrics, 
                                 competitors: List[CompetitorAnalysis], 
                                 regulatory: RegulatoryEnvironment) -> float:
        """Calcular puntuación de viabilidad del mercado"""
        score = 0.0
        
        # Factores de mercado (40%)
        market_factor = (
            (metrics.tourism_revenue / 100000000000) * 0.3 +  # Tamaño del mercado
            metrics.growth_rate * 10 * 0.3 +  # Tasa de crecimiento
            metrics.digital_adoption * 0.4  # Adopción digital
        ) * 0.4
        
        # Factores competitivos (30%)
        total_market_share = sum(comp.market_share for comp in competitors)
        competition_factor = max(0, (1 - total_market_share)) * 0.3
        
        # Factores regulatorios (20%)
        regulatory_factor = max(0, (1 - regulatory.compliance_cost / 100000)) * 0.2
        
        # Factores económicos (10%)
        economic_factor = (metrics.disposable_income / 30000) * 0.1
        
        score = market_factor + competition_factor + regulatory_factor + economic_factor
        return min(1.0, max(0.0, score))
    
    def _determine_viability_level(self, score: float) -> MarketViability:
        """Determinar nivel de viabilidad basado en puntuación"""
        if score >= 0.8:
            return MarketViability.EXCELLENT
        elif score >= 0.6:
            return MarketViability.GOOD
        elif score >= 0.4:
            return MarketViability.MODERATE
        elif score >= 0.2:
            return MarketViability.CHALLENGING
        else:
            return MarketViability.NOT_RECOMMENDED
    
    def _determine_expansion_priority(self, score: float, metrics: MarketMetrics) -> ExpansionPriority:
        """Determinar prioridad de expansión"""
        if score >= 0.8 and metrics.tourism_revenue > 20000000000:
            return ExpansionPriority.IMMEDIATE
        elif score >= 0.6:
            return ExpansionPriority.SHORT_TERM
        elif score >= 0.4:
            return ExpansionPriority.MEDIUM_TERM
        elif score >= 0.2:
            return ExpansionPriority.LONG_TERM
        else:
            return ExpansionPriority.FUTURE_CONSIDERATION
    
    def _determine_entry_strategy(self, score: float, regulatory: RegulatoryEnvironment, 
                                cultural: CulturalInsights) -> MarketEntryStrategy:
        """Determinar estrategia de entrada óptima"""
        if regulatory.compliance_cost < 50000 and cultural.adaptation_level == CulturalAdaptation.MINIMAL:
            return MarketEntryStrategy.DIRECT_INVESTMENT
        elif score >= 0.6:
            return MarketEntryStrategy.PARTNERSHIP
        elif cultural.adaptation_level in [CulturalAdaptation.SIGNIFICANT, CulturalAdaptation.EXTENSIVE]:
            return MarketEntryStrategy.JOINT_VENTURE
        else:
            return MarketEntryStrategy.FRANCHISE
    
    async def _gather_competitive_intelligence(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Recopilar inteligencia competitiva"""
        market = request_data.get("market", "Mexico")
        
        # Simular recopilación de datos competitivos
        await asyncio.sleep(1.5)
        
        competitive_data = {
            "market": market,
            "analysis_date": datetime.now().isoformat(),
            "top_competitors": [
                {
                    "name": "Viator Local",
                    "market_share": 0.15,
                    "revenue_estimate": 45000000,
                    "pricing_strategy": "premium",
                    "customer_satisfaction": 4.2,
                    "strengths": ["Global brand", "Technology platform", "Wide selection"],
                    "weaknesses": ["High commissions", "Limited local focus", "Generic experiences"],
                    "recent_moves": ["Expanded mobile app", "Local partnerships", "Price adjustments"]
                },
                {
                    "name": "Local Tours Pro",
                    "market_share": 0.12,
                    "revenue_estimate": 36000000,
                    "pricing_strategy": "competitive",
                    "customer_satisfaction": 4.0,
                    "strengths": ["Local expertise", "Competitive pricing", "Cultural authenticity"],
                    "weaknesses": ["Limited technology", "Marketing reach", "Scalability issues"],
                    "recent_moves": ["Digital transformation", "New tour categories", "Staff expansion"]
                }
            ],
            "market_trends": [
                "Increasing demand for authentic experiences",
                "Growth in mobile bookings",
                "Price sensitivity due to economic factors",
                "Preference for local guides",
                "Sustainability focus"
            ],
            "opportunity_gaps": [
                "AI-powered personalization",
                "Real-time experience optimization",
                "Integrated social features",
                "Advanced safety protocols",
                "Sustainable tourism focus"
            ]
        }
        
        return {
            "success": True,
            "data": competitive_data
        }
    
    async def _assess_cultural_factors(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluar factores culturales del mercado"""
        market = request_data.get("market", "Mexico")
        
        await asyncio.sleep(1)
        
        cultural_assessment = {
            "market": market,
            "cultural_dimensions": {
                "power_distance": "high",
                "individualism": "moderate",
                "uncertainty_avoidance": "high",
                "long_term_orientation": "moderate"
            },
            "communication_preferences": {
                "style": "relationship-first",
                "channels": ["WhatsApp", "Facebook", "Instagram", "Phone"],
                "language_considerations": ["Formal address", "Local idioms", "Regional variations"]
            },
            "business_practices": {
                "meeting_style": "personal_relationship_focused",
                "decision_making": "hierarchical_consensus",
                "negotiation_approach": "relationship_building",
                "time_orientation": "flexible"
            },
            "consumer_behavior": {
                "booking_patterns": ["Last-minute decisions", "Group bookings", "Family-oriented"],
                "payment_preferences": ["Cash", "Local cards", "Installments"],
                "trust_factors": ["Recommendations", "Local presence", "Personal service"],
                "service_expectations": ["Personal attention", "Flexibility", "Value for money"]
            },
            "adaptation_requirements": {
                "content_localization": "extensive",
                "service_customization": "high",
                "staff_training": "cultural_sensitivity_focus",
                "marketing_approach": "community_based"
            }
        }
        
        return {
            "success": True,
            "data": cultural_assessment
        }
    
    async def _identify_partnerships(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Identificar oportunidades de partnership"""
        market = request_data.get("market", "Mexico")
        partnership_type = request_data.get("type", "all")
        
        await asyncio.sleep(1.2)
        
        partnerships = {
            "market": market,
            "strategic_partnerships": [
                {
                    "partner": "Tourism Board Partnership",
                    "type": "government",
                    "benefits": ["Regulatory support", "Marketing co-op", "Credibility"],
                    "requirements": ["Compliance standards", "Local employment", "Sustainability"],
                    "investment": 50000,
                    "timeline": "3-6 months"
                },
                {
                    "partner": "Hotel Chain Alliance",
                    "type": "hospitality",
                    "benefits": ["Customer base access", "Cross-selling", "Local presence"],
                    "requirements": ["Revenue sharing", "Quality standards", "Integration"],
                    "investment": 100000,
                    "timeline": "2-4 months"
                }
            ],
            "technology_partnerships": [
                {
                    "partner": "Local Payment Provider",
                    "type": "fintech",
                    "benefits": ["Payment processing", "Local methods", "Lower fees"],
                    "requirements": ["Integration", "Compliance", "Volume commitments"],
                    "investment": 25000,
                    "timeline": "1-2 months"
                }
            ],
            "distribution_partnerships": [
                {
                    "partner": "Travel Agencies Network",
                    "type": "distribution",
                    "benefits": ["Retail presence", "Local expertise", "Customer reach"],
                    "requirements": ["Commission structure", "Training", "Marketing support"],
                    "investment": 75000,
                    "timeline": "2-3 months"
                }
            ]
        }
        
        return {
            "success": True,
            "data": partnerships
        }
    
    async def _generate_expansion_strategy(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generar estrategia de expansión detallada"""
        markets = request_data.get("markets", ["Mexico", "Brazil", "Spain"])
        timeline = request_data.get("timeline", "12_months")
        
        await asyncio.sleep(2)
        
        strategy = {
            "expansion_overview": {
                "total_markets": len(markets),
                "timeline": timeline,
                "total_investment": len(markets) * 200000,
                "projected_revenue_y3": len(markets) * 5000000
            },
            "phased_approach": {
                "phase_1": {
                    "markets": markets[:2],
                    "duration": "Months 1-4",
                    "focus": "Market establishment",
                    "investment": 400000,
                    "key_activities": ["Legal setup", "Local partnerships", "Team hiring"]
                },
                "phase_2": {
                    "markets": markets[2:4] if len(markets) > 2 else [],
                    "duration": "Months 5-8",
                    "focus": "Market penetration",
                    "investment": 300000,
                    "key_activities": ["Marketing launch", "Operations scaling", "Customer acquisition"]
                },
                "phase_3": {
                    "markets": markets[4:] if len(markets) > 4 else [],
                    "duration": "Months 9-12",
                    "focus": "Optimization",
                    "investment": 200000,
                    "key_activities": ["Performance optimization", "Market expansion", "Profitability focus"]
                }
            },
            "success_metrics": {
                "customer_acquisition": f"{len(markets) * 1000} customers/month by month 6",
                "revenue_targets": f"${len(markets) * 100000}/month by month 8",
                "market_share": "2-3% in each market by year end",
                "brand_recognition": "15% aided awareness by month 10"
            },
            "risk_mitigation": {
                "regulatory_risk": "Local legal partnerships, compliance audits",
                "competitive_risk": "Differentiation focus, partnership advantages",
                "cultural_risk": "Local team integration, cultural training",
                "operational_risk": "Phased rollout, performance monitoring"
            }
        }
        
        return {
            "success": True,
            "data": strategy
        }
    
    async def _compare_markets(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Comparar múltiples mercados"""
        markets = request_data.get("markets", ["Mexico", "Brazil", "Spain"])
        
        await asyncio.sleep(1.8)
        
        comparison_data = {}
        
        for market in markets:
            market_data = self.market_database.get(market, {})
            
            # Calcular puntuación compuesta
            score = (
                (market_data.get("digital_adoption", 0.5) * 0.3) +
                (market_data.get("growth_rate", 0.03) * 10 * 0.3) +
                (market_data.get("tourism_revenue", 10000000000) / 100000000000 * 0.4)
            )
            
            comparison_data[market] = {
                "overall_score": round(score, 2),
                "population": market_data.get("population", 0),
                "tourism_revenue": market_data.get("tourism_revenue", 0),
                "growth_rate": market_data.get("growth_rate", 0),
                "digital_adoption": market_data.get("digital_adoption", 0),
                "estimated_investment": 200000,
                "projected_roi": round(score * 100, 1),
                "time_to_profitability": max(6, int(18 - score * 12)),
                "recommendation": "high_priority" if score > 0.6 else "medium_priority" if score > 0.4 else "low_priority"
            }
        
        # Ordenar por puntuación
        sorted_markets = sorted(comparison_data.items(), key=lambda x: x[1]["overall_score"], reverse=True)
        
        return {
            "success": True,
            "data": {
                "comparison": dict(sorted_markets),
                "ranking": [market for market, _ in sorted_markets],
                "top_recommendation": sorted_markets[0][0] if sorted_markets else None,
                "summary": {
                    "total_markets_analyzed": len(markets),
                    "high_priority_markets": len([m for m, d in sorted_markets if d["overall_score"] > 0.6]),
                    "total_investment_required": len(markets) * 200000,
                    "combined_market_size": sum(d["tourism_revenue"] for _, d in sorted_markets)
                }
            }
        }
    
    async def _full_market_analysis(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Realizar análisis completo de mercado"""
        market = request_data.get("market", "Mexico")
        
        # Ejecutar todos los análisis en paralelo
        analysis_tasks = [
            self._analyze_market({"market": market}),
            self._gather_competitive_intelligence({"market": market}),
            self._assess_cultural_factors({"market": market}),
            self._identify_partnerships({"market": market})
        ]
        
        results = await asyncio.gather(*analysis_tasks)
        
        return {
            "success": True,
            "data": {
                "market_analysis": results[0]["data"],
                "competitive_intelligence": results[1]["data"],
                "cultural_assessment": results[2]["data"],
                "partnership_opportunities": results[3]["data"],
                "analysis_timestamp": datetime.now().isoformat(),
                "comprehensive_score": self._calculate_comprehensive_score(results)
            }
        }
    
    def _calculate_comprehensive_score(self, analysis_results: List[Dict]) -> float:
        """Calcular puntuación comprensiva del análisis"""
        # Implementar lógica de puntuación basada en todos los análisis
        return 0.78  # Puntuación simulada
    
    async def _start_market_monitoring(self):
        """Iniciar monitoreo continuo de mercados"""
        while self.status == AgentStatus.ACTIVE:
            try:
                for market in self.priority_markets:
                    # Actualizar datos de mercado cada 24 horas
                    await self._update_market_data(market)
                
                await asyncio.sleep(self.update_interval)
                
            except Exception as e:
                self.logger.error(f"Error en monitoreo de mercados: {e}")
                await asyncio.sleep(300)  # Reintentar en 5 minutos
    
    async def _update_market_data(self, market: str):
        """Actualizar datos de un mercado específico"""
        # Simular actualización de datos
        await asyncio.sleep(0.1)
        
        # En producción, aquí se conectaría a APIs reales
        self.logger.debug(f"Datos actualizados para mercado: {market}")
    
    def _serialize_analysis(self, analysis: MarketAnalysisResult) -> Dict[str, Any]:
        """Serializar análisis para respuesta JSON"""
        return {
            "market_name": analysis.market_name,
            "country": analysis.country,
            "region": analysis.region,
            "viability": analysis.viability.value,
            "priority": analysis.priority.value,
            "entry_strategy": analysis.entry_strategy.value,
            "market_metrics": {
                "population": analysis.market_metrics.population,
                "tourism_revenue": analysis.market_metrics.tourism_revenue,
                "growth_rate": analysis.market_metrics.growth_rate,
                "digital_adoption": analysis.market_metrics.digital_adoption,
                "smartphone_penetration": analysis.market_metrics.smartphone_penetration,
                "internet_usage": analysis.market_metrics.internet_usage,
                "disposable_income": analysis.market_metrics.disposable_income,
                "travel_frequency": analysis.market_metrics.travel_frequency
            },
            "competitors": [
                {
                    "name": comp.name,
                    "market_share": comp.market_share,
                    "pricing_strategy": comp.pricing_strategy,
                    "strengths": comp.strengths,
                    "weaknesses": comp.weaknesses,
                    "customer_rating": comp.customer_rating,
                    "revenue_estimate": comp.revenue_estimate
                }
                for comp in analysis.competitors
            ],
            "financial_projections": {
                "investment_required": analysis.investment_required,
                "revenue_projection_y1": analysis.revenue_projection_y1,
                "revenue_projection_y3": analysis.revenue_projection_y3,
                "break_even_months": analysis.break_even_months,
                "roi_percentage": analysis.roi_percentage
            },
            "key_insights": {
                "risks": analysis.key_risks,
                "opportunities": analysis.key_opportunities,
                "success_factors": analysis.success_factors,
                "recommendations": analysis.recommendations
            },
            "timeline": analysis.timeline,
            "budget_breakdown": analysis.budget_breakdown,
            "confidence_score": analysis.confidence_score,
            "analysis_date": analysis.analysis_date.isoformat()
        }
    
    # Métodos auxiliares para cálculos
    def _get_region_for_market(self, market: str) -> str:
        """Obtener región para mercado"""
        regions = {
            "Mexico": "Latin America",
            "Brazil": "Latin America", 
            "Spain": "Europe",
            "Italy": "Europe",
            "Japan": "Asia Pacific"
        }
        return regions.get(market, "Other")
    
    def _calculate_investment_required(self, market: str, strategy: MarketEntryStrategy) -> float:
        """Calcular inversión requerida"""
        base_investment = 150000
        
        strategy_multipliers = {
            MarketEntryStrategy.DIRECT_INVESTMENT: 1.5,
            MarketEntryStrategy.PARTNERSHIP: 1.0,
            MarketEntryStrategy.FRANCHISE: 0.7,
            MarketEntryStrategy.ACQUISITION: 3.0,
            MarketEntryStrategy.JOINT_VENTURE: 1.2,
            MarketEntryStrategy.LICENSING: 0.5
        }
        
        return base_investment * strategy_multipliers.get(strategy, 1.0)
    
    def _calculate_break_even_months(self, investment: float, monthly_revenue: float) -> int:
        """Calcular meses para punto de equilibrio"""
        if monthly_revenue <= 0:
            return 24  # Default si no hay ingresos proyectados
        
        monthly_costs = investment * 0.05  # 5% de la inversión como costos mensuales
        net_monthly = monthly_revenue - monthly_costs
        
        if net_monthly <= 0:
            return 36  # Largo plazo si no es rentable
        
        return max(6, int(investment / net_monthly))
    
    def _identify_key_risks(self, market: str, regulatory: RegulatoryEnvironment, 
                          competitors: List[CompetitorAnalysis]) -> List[str]:
        """Identificar riesgos clave"""
        risks = [
            "Regulatory changes and compliance requirements",
            "Currency fluctuation and economic instability",
            "Intense competition from established players"
        ]
        
        if regulatory.compliance_cost > 50000:
            risks.append("High regulatory compliance costs")
        
        if any(comp.market_share > 0.15 for comp in competitors):
            risks.append("Dominant market players with strong position")
        
        return risks
    
    def _identify_key_opportunities(self, metrics: MarketMetrics, 
                                  cultural: CulturalInsights) -> List[str]:
        """Identificar oportunidades clave"""
        opportunities = [
            "Growing digital adoption and smartphone penetration",
            "Increasing demand for authentic local experiences"
        ]
        
        if metrics.growth_rate > 0.04:
            opportunities.append("Strong tourism market growth trajectory")
        
        if metrics.digital_adoption > 0.75:
            opportunities.append("High digital readiness for online platforms")
        
        return opportunities
    
    def _identify_success_factors(self, cultural: CulturalInsights, 
                                competitors: List[CompetitorAnalysis]) -> List[str]:
        """Identificar factores de éxito"""
        factors = [
            "Strong local partnerships and cultural integration",
            "Competitive pricing with superior value proposition",
            "Mobile-first technology platform"
        ]
        
        if cultural.adaptation_level in [CulturalAdaptation.SIGNIFICANT, CulturalAdaptation.EXTENSIVE]:
            factors.append("Deep cultural adaptation and localization")
        
        return factors
    
    def _generate_recommendations(self, viability: MarketViability, 
                                cultural: CulturalInsights, 
                                regulatory: RegulatoryEnvironment) -> List[str]:
        """Generar recomendaciones específicas"""
        recommendations = []
        
        if viability in [MarketViability.EXCELLENT, MarketViability.GOOD]:
            recommendations.append("Proceed with market entry - strong fundamentals")
        
        if cultural.adaptation_level != CulturalAdaptation.MINIMAL:
            recommendations.append("Invest in local team and cultural training")
        
        if regulatory.compliance_cost > 30000:
            recommendations.append("Engage local legal expertise early in process")
        
        recommendations.extend([
            "Focus on mobile-first customer experience",
            "Establish strategic local partnerships",
            "Implement gradual market penetration strategy"
        ])
        
        return recommendations
    
    def _generate_expansion_timeline(self, strategy: MarketEntryStrategy) -> Dict[str, str]:
        """Generar cronograma de expansión"""
        base_timeline = {
            "market_research": "Months 1-2",
            "legal_setup": "Months 2-3",
            "partnership_development": "Months 3-4",
            "team_hiring": "Months 4-5",
            "platform_localization": "Months 5-6",
            "pilot_launch": "Month 6",
            "full_launch": "Month 7",
            "optimization": "Months 8-12"
        }
        
        # Ajustar según estrategia
        if strategy == MarketEntryStrategy.PARTNERSHIP:
            base_timeline["partnership_development"] = "Months 2-4"
            base_timeline["pilot_launch"] = "Month 5"
        elif strategy == MarketEntryStrategy.DIRECT_INVESTMENT:
            base_timeline["legal_setup"] = "Months 2-4"
            base_timeline["pilot_launch"] = "Month 7"
        
        return base_timeline
    
    def _generate_budget_breakdown(self, total_investment: float) -> Dict[str, float]:
        """Generar desglose de presupuesto"""
        return {
            "legal_and_regulatory": total_investment * 0.15,
            "technology_and_localization": total_investment * 0.25,
            "marketing_and_branding": total_investment * 0.20,
            "team_and_operations": total_investment * 0.25,
            "partnerships_and_bd": total_investment * 0.10,
            "contingency": total_investment * 0.05
        }
    
    def _load_cached_analyses(self):
        """Cargar análisis desde cache"""
        # En producción, cargaría desde almacenamiento persistente
        pass
    
    def get_agent_status(self) -> Dict[str, Any]:
        """Obtener estado detallado del agente"""
        return {
            **super().get_agent_status(),
            "markets_monitored": len(self.monitoring_markets),
            "cached_analyses": len(self.analysis_cache),
            "priority_markets": self.priority_markets,
            "update_interval_hours": self.update_interval / 3600,
            "cache_duration_days": self.cache_duration / 86400
        }

# Función de utilidad para crear instancia
def create_market_entry_agent() -> MarketEntryAgent:
    """Crear y configurar instancia del agente de entrada al mercado"""
    return MarketEntryAgent()

if __name__ == "__main__":
    # Ejemplo de uso
    import asyncio
    
    async def test_agent():
        agent = create_market_entry_agent()
        
        # Test análisis de mercado
        result = await agent.process_request({
            "type": "market_analysis",
            "market": "Mexico"
        })
        
        print("Market Analysis Result:")
        print(json.dumps(result, indent=2, default=str))
    
    asyncio.run(test_agent())