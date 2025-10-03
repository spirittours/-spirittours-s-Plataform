"""
LocalImpactAnalyzerAgent - Agente especializado en análisis de impacto local
Evalúa y optimiza el impacto del turismo en las comunidades locales
"""

import json
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict, field
from enum import Enum
import asyncio
from sqlalchemy.orm import Session
import numpy as np
import pandas as pd

from ..base_agent import BaseAgent, AgentCapability, AgentResponse
from ..decorators import log_performance, handle_errors, require_capability
from ...backend.models.community_models import (
    CommunityImpact,
    LocalBusiness,
    CommunityProject,
    StakeholderEngagement
)

logger = logging.getLogger(__name__)

class ImpactCategory(Enum):
    """Categorías de impacto"""
    ECONOMIC = "economic"  # Impacto económico
    SOCIAL = "social"  # Impacto social
    CULTURAL = "cultural"  # Impacto cultural
    ENVIRONMENTAL = "environmental"  # Impacto ambiental
    INFRASTRUCTURE = "infrastructure"  # Impacto en infraestructura
    EMPLOYMENT = "employment"  # Impacto en empleo
    EDUCATION = "education"  # Impacto educativo
    HEALTH = "health"  # Impacto en salud

class StakeholderType(Enum):
    """Tipos de stakeholders"""
    LOCAL_BUSINESS = "local_business"
    COMMUNITY_LEADER = "community_leader"
    LOCAL_GOVERNMENT = "local_government"
    RESIDENTS = "residents"
    INDIGENOUS_GROUPS = "indigenous_groups"
    YOUTH_GROUPS = "youth_groups"
    WOMEN_GROUPS = "women_groups"
    ENVIRONMENTAL_GROUPS = "environmental_groups"

class ImpactLevel(Enum):
    """Niveles de impacto"""
    VERY_POSITIVE = "very_positive"
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    VERY_NEGATIVE = "very_negative"

@dataclass
class CommunityProfile:
    """Perfil de la comunidad local"""
    community_id: str
    name: str
    population: int
    demographics: Dict[str, Any]
    economic_indicators: Dict[str, float]
    cultural_assets: List[str]
    infrastructure_status: Dict[str, Any]
    vulnerable_groups: List[Dict[str, Any]]
    development_priorities: List[str]
    tourism_readiness: float
    capacity_limits: Dict[str, int]

@dataclass
class ImpactAssessment:
    """Evaluación de impacto"""
    assessment_id: str
    community_id: str
    assessment_date: datetime
    impact_scores: Dict[ImpactCategory, float]
    overall_impact: ImpactLevel
    economic_benefits: Dict[str, float]
    social_effects: List[Dict[str, Any]]
    cultural_preservation: Dict[str, Any]
    environmental_footprint: Dict[str, float]
    recommendations: List[Dict[str, Any]]
    mitigation_measures: List[Dict[str, Any]]
    monitoring_indicators: List[Dict[str, Any]]

@dataclass
class LocalBusinessPartnership:
    """Asociación con negocios locales"""
    partnership_id: str
    business_id: str
    business_name: str
    business_type: str
    partnership_type: str
    revenue_share: float
    employment_created: int
    skills_transferred: List[str]
    investment_amount: float
    sustainability_practices: List[str]
    community_benefits: List[str]
    performance_metrics: Dict[str, float]

@dataclass
class CommunityEngagementPlan:
    """Plan de engagement comunitario"""
    plan_id: str
    community_id: str
    stakeholders: List[Dict[str, Any]]
    engagement_activities: List[Dict[str, Any]]
    communication_channels: List[str]
    feedback_mechanisms: List[str]
    decision_making_process: Dict[str, Any]
    benefit_sharing_model: Dict[str, Any]
    conflict_resolution: Dict[str, Any]
    timeline: List[Dict[str, Any]]
    success_metrics: Dict[str, Any]

@dataclass
class EconomicLeakageAnalysis:
    """Análisis de fuga económica"""
    analysis_id: str
    total_tourism_revenue: float
    local_retention: float
    leakage_amount: float
    leakage_percentage: float
    leakage_breakdown: Dict[str, float]
    retention_strategies: List[Dict[str, Any]]
    local_supply_chain: Dict[str, Any]
    import_dependencies: List[Dict[str, Any]]
    recommendations: List[str]

class LocalImpactAnalyzerAgent(BaseAgent):
    """
    Agente especializado en analizar y optimizar el impacto del turismo en comunidades locales
    """
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.capabilities = [
            AgentCapability.ANALYSIS,
            AgentCapability.MONITORING,
            AgentCapability.RECOMMENDATION,
            AgentCapability.INTEGRATION,
            AgentCapability.REPORTING
        ]
        
        # Configuración de impacto
        self.impact_thresholds = {
            'economic_benefit_minimum': 0.3,  # 30% debe quedarse local
            'employment_local_ratio': 0.7,  # 70% empleos locales
            'cultural_preservation': 0.8,  # 80% preservación cultural
            'environmental_limit': 100,  # Límite de impacto ambiental
            'overtourism_threshold': 0.5  # Ratio turistas/residentes
        }
        
        # Base de datos de comunidades
        self.communities_database = {}
        self.partnerships_database = {}
        self.impact_history = []
        
        # Indicadores de desarrollo sostenible
        self.sdg_indicators = self._load_sdg_indicators()
        
        # Métricas
        self.metrics = {
            'communities_assessed': 0,
            'partnerships_created': 0,
            'local_jobs_created': 0,
            'economic_impact_generated': 0.0,
            'cultural_projects_supported': 0,
            'environmental_initiatives': 0
        }
    
    @log_performance
    @handle_errors
    async def assess_community_impact(
        self,
        community_id: str,
        tourism_data: Dict[str, Any],
        period: str = "monthly"
    ) -> ImpactAssessment:
        """
        Evalúa el impacto del turismo en una comunidad
        """
        logger.info(f"Assessing impact on community {community_id}")
        
        # Obtener perfil de la comunidad
        community_profile = await self._get_community_profile(community_id)
        
        # Calcular impactos por categoría
        economic_impact = await self._calculate_economic_impact(
            community_profile,
            tourism_data
        )
        
        social_impact = await self._calculate_social_impact(
            community_profile,
            tourism_data
        )
        
        cultural_impact = await self._calculate_cultural_impact(
            community_profile,
            tourism_data
        )
        
        environmental_impact = await self._calculate_environmental_impact(
            community_profile,
            tourism_data
        )
        
        infrastructure_impact = await self._calculate_infrastructure_impact(
            community_profile,
            tourism_data
        )
        
        # Compilar scores de impacto
        impact_scores = {
            ImpactCategory.ECONOMIC: economic_impact['score'],
            ImpactCategory.SOCIAL: social_impact['score'],
            ImpactCategory.CULTURAL: cultural_impact['score'],
            ImpactCategory.ENVIRONMENTAL: environmental_impact['score'],
            ImpactCategory.INFRASTRUCTURE: infrastructure_impact['score']
        }
        
        # Determinar impacto general
        overall_impact = self._determine_overall_impact(impact_scores)
        
        # Generar recomendaciones
        recommendations = await self._generate_impact_recommendations(
            impact_scores,
            community_profile
        )
        
        # Identificar medidas de mitigación
        mitigation_measures = self._identify_mitigation_measures(
            impact_scores,
            tourism_data
        )
        
        # Definir indicadores de monitoreo
        monitoring_indicators = self._define_monitoring_indicators(
            impact_scores,
            community_profile
        )
        
        assessment = ImpactAssessment(
            assessment_id=f"impact_{datetime.now().timestamp()}",
            community_id=community_id,
            assessment_date=datetime.now(),
            impact_scores=impact_scores,
            overall_impact=overall_impact,
            economic_benefits=economic_impact['details'],
            social_effects=social_impact['effects'],
            cultural_preservation=cultural_impact['preservation'],
            environmental_footprint=environmental_impact['footprint'],
            recommendations=recommendations,
            mitigation_measures=mitigation_measures,
            monitoring_indicators=monitoring_indicators
        )
        
        # Guardar evaluación
        await self._save_assessment(assessment)
        
        self.metrics['communities_assessed'] += 1
        
        return assessment
    
    @log_performance
    @handle_errors
    async def analyze_economic_leakage(
        self,
        community_id: str,
        financial_data: Dict[str, Any]
    ) -> EconomicLeakageAnalysis:
        """
        Analiza la fuga económica del turismo
        """
        logger.info(f"Analyzing economic leakage for community {community_id}")
        
        # Calcular ingresos totales
        total_revenue = financial_data.get('total_tourism_revenue', 0)
        
        # Analizar cadena de valor local
        local_value_chain = await self._analyze_local_value_chain(
            community_id,
            financial_data
        )
        
        # Calcular retención local
        local_retention = self._calculate_local_retention(local_value_chain)
        
        # Calcular fuga
        leakage_amount = total_revenue - local_retention
        leakage_percentage = (leakage_amount / total_revenue * 100) if total_revenue > 0 else 0
        
        # Desglosar fuga por categoría
        leakage_breakdown = self._breakdown_leakage(
            financial_data,
            local_value_chain
        )
        
        # Identificar estrategias de retención
        retention_strategies = self._identify_retention_strategies(
            leakage_breakdown,
            community_id
        )
        
        # Analizar dependencias de importación
        import_dependencies = self._analyze_import_dependencies(financial_data)
        
        # Generar recomendaciones
        recommendations = self._generate_leakage_recommendations(
            leakage_percentage,
            leakage_breakdown
        )
        
        analysis = EconomicLeakageAnalysis(
            analysis_id=f"leakage_{datetime.now().timestamp()}",
            total_tourism_revenue=total_revenue,
            local_retention=local_retention,
            leakage_amount=leakage_amount,
            leakage_percentage=leakage_percentage,
            leakage_breakdown=leakage_breakdown,
            retention_strategies=retention_strategies,
            local_supply_chain=local_value_chain,
            import_dependencies=import_dependencies,
            recommendations=recommendations
        )
        
        return analysis
    
    @log_performance
    @handle_errors
    async def create_local_partnership(
        self,
        business_data: Dict[str, Any],
        partnership_terms: Dict[str, Any]
    ) -> LocalBusinessPartnership:
        """
        Crea asociación con negocio local
        """
        logger.info(f"Creating partnership with local business {business_data.get('name')}")
        
        # Evaluar negocio local
        business_evaluation = await self._evaluate_local_business(business_data)
        
        # Determinar tipo de asociación
        partnership_type = self._determine_partnership_type(
            business_evaluation,
            partnership_terms
        )
        
        # Calcular distribución de ingresos
        revenue_share = self._calculate_revenue_share(
            business_evaluation,
            partnership_terms
        )
        
        # Estimar creación de empleo
        employment_impact = self._estimate_employment_creation(
            business_data,
            partnership_terms
        )
        
        # Identificar transferencia de habilidades
        skills_transfer = self._identify_skills_transfer(
            business_data,
            partnership_terms
        )
        
        # Evaluar prácticas de sostenibilidad
        sustainability_practices = self._evaluate_sustainability_practices(
            business_data
        )
        
        # Definir beneficios comunitarios
        community_benefits = self._define_community_benefits(
            business_data,
            partnership_terms
        )
        
        # Establecer métricas de desempeño
        performance_metrics = self._establish_performance_metrics(
            partnership_type,
            partnership_terms
        )
        
        partnership = LocalBusinessPartnership(
            partnership_id=f"partner_{datetime.now().timestamp()}",
            business_id=business_data.get('id'),
            business_name=business_data.get('name'),
            business_type=business_data.get('type'),
            partnership_type=partnership_type,
            revenue_share=revenue_share,
            employment_created=employment_impact,
            skills_transferred=skills_transfer,
            investment_amount=partnership_terms.get('investment', 0),
            sustainability_practices=sustainability_practices,
            community_benefits=community_benefits,
            performance_metrics=performance_metrics
        )
        
        # Guardar asociación
        await self._save_partnership(partnership)
        
        self.metrics['partnerships_created'] += 1
        self.metrics['local_jobs_created'] += employment_impact
        
        return partnership
    
    @log_performance
    @handle_errors
    async def develop_engagement_plan(
        self,
        community_id: str,
        project_details: Dict[str, Any]
    ) -> CommunityEngagementPlan:
        """
        Desarrolla plan de engagement comunitario
        """
        logger.info(f"Developing engagement plan for community {community_id}")
        
        # Identificar stakeholders
        stakeholders = await self._identify_stakeholders(community_id)
        
        # Mapear intereses y poder
        stakeholder_mapping = self._map_stakeholder_interests(stakeholders)
        
        # Diseñar actividades de engagement
        engagement_activities = self._design_engagement_activities(
            stakeholder_mapping,
            project_details
        )
        
        # Establecer canales de comunicación
        communication_channels = self._establish_communication_channels(
            stakeholders,
            community_id
        )
        
        # Crear mecanismos de feedback
        feedback_mechanisms = self._create_feedback_mechanisms(
            stakeholders
        )
        
        # Definir proceso de toma de decisiones
        decision_process = self._define_decision_process(
            stakeholder_mapping
        )
        
        # Desarrollar modelo de distribución de beneficios
        benefit_sharing = self._develop_benefit_sharing_model(
            community_id,
            project_details
        )
        
        # Establecer resolución de conflictos
        conflict_resolution = self._establish_conflict_resolution(
            stakeholders
        )
        
        # Crear timeline
        timeline = self._create_engagement_timeline(
            engagement_activities,
            project_details
        )
        
        # Definir métricas de éxito
        success_metrics = self._define_success_metrics(
            project_details,
            stakeholders
        )
        
        plan = CommunityEngagementPlan(
            plan_id=f"engage_{datetime.now().timestamp()}",
            community_id=community_id,
            stakeholders=stakeholder_mapping,
            engagement_activities=engagement_activities,
            communication_channels=communication_channels,
            feedback_mechanisms=feedback_mechanisms,
            decision_making_process=decision_process,
            benefit_sharing_model=benefit_sharing,
            conflict_resolution=conflict_resolution,
            timeline=timeline,
            success_metrics=success_metrics
        )
        
        return plan
    
    @log_performance
    @handle_errors
    async def monitor_overtourism_risk(
        self,
        community_id: str,
        visitor_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Monitorea riesgo de sobreturismo
        """
        logger.info(f"Monitoring overtourism risk for community {community_id}")
        
        # Obtener capacidad de carga
        carrying_capacity = await self._get_carrying_capacity(community_id)
        
        # Calcular ratio turistas/residentes
        tourist_resident_ratio = self._calculate_tourist_resident_ratio(
            community_id,
            visitor_data
        )
        
        # Evaluar presión sobre recursos
        resource_pressure = self._assess_resource_pressure(
            visitor_data,
            carrying_capacity
        )
        
        # Analizar congestión
        congestion_analysis = self._analyze_congestion(
            visitor_data,
            community_id
        )
        
        # Evaluar impacto en calidad de vida
        quality_of_life_impact = self._assess_quality_of_life_impact(
            tourist_resident_ratio,
            resource_pressure
        )
        
        # Calcular índice de riesgo
        risk_index = self._calculate_overtourism_risk_index({
            'ratio': tourist_resident_ratio,
            'resource_pressure': resource_pressure,
            'congestion': congestion_analysis,
            'quality_impact': quality_of_life_impact
        })
        
        # Generar alertas
        alerts = self._generate_overtourism_alerts(risk_index)
        
        # Recomendar medidas
        mitigation_measures = self._recommend_overtourism_measures(
            risk_index,
            community_id
        )
        
        return {
            'community_id': community_id,
            'timestamp': datetime.now().isoformat(),
            'tourist_resident_ratio': tourist_resident_ratio,
            'carrying_capacity_usage': resource_pressure,
            'congestion_level': congestion_analysis,
            'quality_of_life_impact': quality_of_life_impact,
            'risk_index': risk_index,
            'risk_level': self._classify_risk_level(risk_index),
            'alerts': alerts,
            'mitigation_measures': mitigation_measures
        }
    
    @log_performance
    @handle_errors
    async def support_local_development(
        self,
        community_id: str,
        development_goals: List[str]
    ) -> Dict[str, Any]:
        """
        Apoya el desarrollo local sostenible
        """
        logger.info(f"Supporting local development for community {community_id}")
        
        # Evaluar necesidades de desarrollo
        development_needs = await self._assess_development_needs(
            community_id,
            development_goals
        )
        
        # Identificar proyectos prioritarios
        priority_projects = self._identify_priority_projects(
            development_needs,
            development_goals
        )
        
        # Diseñar intervenciones
        interventions = []
        for project in priority_projects:
            intervention = await self._design_intervention(
                project,
                community_id
            )
            interventions.append(intervention)
        
        # Calcular inversión necesaria
        investment_required = self._calculate_investment_needs(interventions)
        
        # Identificar fuentes de financiamiento
        funding_sources = await self._identify_funding_sources(
            investment_required,
            community_id
        )
        
        # Crear plan de implementación
        implementation_plan = self._create_implementation_plan(
            interventions,
            funding_sources
        )
        
        # Establecer monitoreo y evaluación
        monitoring_framework = self._establish_monitoring_framework(
            interventions,
            development_goals
        )
        
        self.metrics['cultural_projects_supported'] += len(
            [p for p in priority_projects if p['type'] == 'cultural']
        )
        self.metrics['environmental_initiatives'] += len(
            [p for p in priority_projects if p['type'] == 'environmental']
        )
        
        return {
            'community_id': community_id,
            'development_needs': development_needs,
            'priority_projects': priority_projects,
            'interventions': interventions,
            'investment_required': investment_required,
            'funding_sources': funding_sources,
            'implementation_plan': implementation_plan,
            'monitoring_framework': monitoring_framework,
            'expected_outcomes': self._project_outcomes(interventions),
            'timeline': self._estimate_timeline(implementation_plan)
        }
    
    @log_performance
    @handle_errors
    async def measure_social_return(
        self,
        project_id: str,
        investment_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Mide el retorno social de la inversión (SROI)
        """
        logger.info(f"Measuring social return for project {project_id}")
        
        # Identificar stakeholders afectados
        stakeholders = await self._identify_affected_stakeholders(project_id)
        
        # Mapear outcomes
        outcomes = self._map_project_outcomes(project_id, stakeholders)
        
        # Monetizar outcomes
        monetized_outcomes = self._monetize_outcomes(outcomes)
        
        # Calcular valor presente
        present_value = self._calculate_present_value(
            monetized_outcomes,
            investment_data.get('discount_rate', 0.05)
        )
        
        # Calcular SROI
        total_investment = investment_data.get('total_investment', 0)
        sroi_ratio = present_value / total_investment if total_investment > 0 else 0
        
        # Análisis de sensibilidad
        sensitivity_analysis = self._perform_sensitivity_analysis(
            monetized_outcomes,
            total_investment
        )
        
        # Distribución de valor
        value_distribution = self._analyze_value_distribution(
            monetized_outcomes,
            stakeholders
        )
        
        return {
            'project_id': project_id,
            'total_investment': total_investment,
            'social_value_created': present_value,
            'sroi_ratio': sroi_ratio,
            'interpretation': f"Every $1 invested generates ${sroi_ratio:.2f} in social value",
            'outcomes': outcomes,
            'monetized_outcomes': monetized_outcomes,
            'value_distribution': value_distribution,
            'sensitivity_analysis': sensitivity_analysis,
            'confidence_level': self._calculate_confidence_level(outcomes)
        }
    
    # Métodos auxiliares privados
    
    async def _get_community_profile(self, community_id: str) -> CommunityProfile:
        """Obtiene perfil de la comunidad"""
        # Implementación simplificada
        return CommunityProfile(
            community_id=community_id,
            name="Local Community",
            population=10000,
            demographics={'age_distribution': {}, 'education_levels': {}},
            economic_indicators={'gdp_per_capita': 5000, 'unemployment': 0.15},
            cultural_assets=['heritage_sites', 'traditional_crafts'],
            infrastructure_status={'roads': 'good', 'utilities': 'moderate'},
            vulnerable_groups=[{'type': 'elderly', 'size': 1500}],
            development_priorities=['education', 'healthcare', 'infrastructure'],
            tourism_readiness=0.7,
            capacity_limits={'daily_visitors': 500, 'accommodation': 200}
        )
    
    async def _calculate_economic_impact(
        self,
        profile: CommunityProfile,
        tourism_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calcula impacto económico"""
        visitor_spending = tourism_data.get('visitor_spending', 0)
        local_employment = tourism_data.get('local_employment', 0)
        
        # Calcular multiplicador económico
        multiplier = 1.5  # Simplified
        total_impact = visitor_spending * multiplier
        
        # Calcular retención local
        local_retention = total_impact * 0.4  # 40% stays local
        
        score = min(100, (local_retention / profile.economic_indicators['gdp_per_capita']) * 10)
        
        return {
            'score': score,
            'details': {
                'direct_impact': visitor_spending,
                'indirect_impact': total_impact - visitor_spending,
                'local_retention': local_retention,
                'employment_created': local_employment,
                'tax_revenue': visitor_spending * 0.1
            }
        }
    
    async def _calculate_social_impact(
        self,
        profile: CommunityProfile,
        tourism_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calcula impacto social"""
        visitor_numbers = tourism_data.get('visitor_numbers', 0)
        
        # Calcular presión social
        pressure_ratio = visitor_numbers / profile.population
        
        # Evaluar efectos
        effects = []
        
        if pressure_ratio > 0.5:
            effects.append({
                'type': 'overcrowding',
                'severity': 'high',
                'affected_groups': ['residents', 'elderly']
            })
        
        if tourism_data.get('night_tourism', False):
            effects.append({
                'type': 'noise_pollution',
                'severity': 'medium',
                'affected_groups': ['residents']
            })
        
        # Calcular score (inverso de la presión)
        score = max(0, 100 - (pressure_ratio * 100))
        
        return {
            'score': score,
            'effects': effects,
            'pressure_ratio': pressure_ratio
        }
    
    async def _calculate_cultural_impact(
        self,
        profile: CommunityProfile,
        tourism_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calcula impacto cultural"""
        cultural_activities = tourism_data.get('cultural_activities', [])
        
        # Evaluar preservación
        preservation_score = 80  # Base score
        
        if 'traditional_crafts' in cultural_activities:
            preservation_score += 10
        
        if tourism_data.get('cultural_commodification', False):
            preservation_score -= 20
        
        return {
            'score': preservation_score,
            'preservation': {
                'traditional_practices': preservation_score > 70,
                'language_preservation': True,
                'cultural_authenticity': preservation_score > 60
            }
        }
    
    async def _calculate_environmental_impact(
        self,
        profile: CommunityProfile,
        tourism_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calcula impacto ambiental"""
        visitor_numbers = tourism_data.get('visitor_numbers', 0)
        
        # Calcular huella
        carbon_footprint = visitor_numbers * 10  # kg CO2 per visitor
        water_usage = visitor_numbers * 200  # liters per visitor
        waste_generated = visitor_numbers * 2  # kg per visitor
        
        # Score basado en capacidad
        environmental_pressure = (carbon_footprint / 10000) * 100
        score = max(0, 100 - environmental_pressure)
        
        return {
            'score': score,
            'footprint': {
                'carbon': carbon_footprint,
                'water': water_usage,
                'waste': waste_generated
            }
        }
    
    async def _calculate_infrastructure_impact(
        self,
        profile: CommunityProfile,
        tourism_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calcula impacto en infraestructura"""
        visitor_numbers = tourism_data.get('visitor_numbers', 0)
        
        # Evaluar presión sobre infraestructura
        capacity_usage = visitor_numbers / profile.capacity_limits['daily_visitors']
        
        score = max(0, 100 - (capacity_usage * 50))
        
        return {
            'score': score,
            'usage_rate': capacity_usage,
            'stress_points': ['roads', 'water_system'] if capacity_usage > 0.8 else []
        }
    
    def _determine_overall_impact(self, scores: Dict[ImpactCategory, float]) -> ImpactLevel:
        """Determina nivel de impacto general"""
        avg_score = sum(scores.values()) / len(scores)
        
        if avg_score >= 80:
            return ImpactLevel.VERY_POSITIVE
        elif avg_score >= 60:
            return ImpactLevel.POSITIVE
        elif avg_score >= 40:
            return ImpactLevel.NEUTRAL
        elif avg_score >= 20:
            return ImpactLevel.NEGATIVE
        else:
            return ImpactLevel.VERY_NEGATIVE
    
    async def _generate_impact_recommendations(
        self,
        scores: Dict[ImpactCategory, float],
        profile: CommunityProfile
    ) -> List[Dict[str, Any]]:
        """Genera recomendaciones de impacto"""
        recommendations = []
        
        for category, score in scores.items():
            if score < 60:
                if category == ImpactCategory.ECONOMIC:
                    recommendations.append({
                        'category': 'economic',
                        'priority': 'high',
                        'action': 'Increase local procurement',
                        'expected_impact': '20% improvement in local retention'
                    })
                elif category == ImpactCategory.SOCIAL:
                    recommendations.append({
                        'category': 'social',
                        'priority': 'high',
                        'action': 'Implement visitor flow management',
                        'expected_impact': 'Reduce overcrowding by 30%'
                    })
        
        return recommendations
    
    def _identify_mitigation_measures(
        self,
        scores: Dict[ImpactCategory, float],
        tourism_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Identifica medidas de mitigación"""
        measures = []
        
        if scores[ImpactCategory.ENVIRONMENTAL] < 50:
            measures.append({
                'type': 'environmental',
                'measure': 'Implement carbon offset program',
                'timeline': '3 months',
                'cost': 10000
            })
        
        if scores[ImpactCategory.SOCIAL] < 50:
            measures.append({
                'type': 'social',
                'measure': 'Create community liaison committee',
                'timeline': '1 month',
                'cost': 5000
            })
        
        return measures
    
    def _define_monitoring_indicators(
        self,
        scores: Dict[ImpactCategory, float],
        profile: CommunityProfile
    ) -> List[Dict[str, Any]]:
        """Define indicadores de monitoreo"""
        indicators = [
            {
                'name': 'Local Employment Rate',
                'category': 'economic',
                'target': 70,
                'frequency': 'monthly'
            },
            {
                'name': 'Tourist-Resident Ratio',
                'category': 'social',
                'target': 0.3,
                'frequency': 'daily'
            },
            {
                'name': 'Cultural Activity Participation',
                'category': 'cultural',
                'target': 100,
                'frequency': 'weekly'
            }
        ]
        
        return indicators
    
    async def _save_assessment(self, assessment: ImpactAssessment) -> None:
        """Guarda evaluación de impacto"""
        self.impact_history.append(assessment)
    
    async def _analyze_local_value_chain(
        self,
        community_id: str,
        financial_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analiza cadena de valor local"""
        return {
            'local_suppliers': 0.4,
            'local_labor': 0.7,
            'local_services': 0.5,
            'total_local_content': 0.53
        }
    
    def _calculate_local_retention(self, value_chain: Dict[str, Any]) -> float:
        """Calcula retención local"""
        return value_chain.get('total_local_content', 0.5) * 10000  # Simplified
    
    def _breakdown_leakage(
        self,
        financial_data: Dict[str, Any],
        value_chain: Dict[str, Any]
    ) -> Dict[str, float]:
        """Desglosa fuga económica"""
        return {
            'imported_goods': 2000,
            'external_services': 1500,
            'repatriated_profits': 1000,
            'external_labor': 500
        }
    
    def _identify_retention_strategies(
        self,
        leakage: Dict[str, float],
        community_id: str
    ) -> List[Dict[str, Any]]:
        """Identifica estrategias de retención"""
        strategies = []
        
        if leakage.get('imported_goods', 0) > 1000:
            strategies.append({
                'strategy': 'Local sourcing initiative',
                'potential_retention': 0.3,
                'implementation_time': '6 months'
            })
        
        return strategies
    
    def _analyze_import_dependencies(
        self,
        financial_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Analiza dependencias de importación"""
        return [
            {
                'item': 'Luxury goods',
                'annual_value': 5000,
                'substitutable': True,
                'local_alternative': 'Local crafts'
            }
        ]
    
    def _generate_leakage_recommendations(
        self,
        leakage_percentage: float,
        breakdown: Dict[str, float]
    ) -> List[str]:
        """Genera recomendaciones sobre fuga económica"""
        recommendations = []
        
        if leakage_percentage > 50:
            recommendations.append("Develop local supplier network")
            recommendations.append("Implement buy-local policies")
        
        return recommendations
    
    async def _evaluate_local_business(
        self,
        business_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Evalúa negocio local"""
        return {
            'sustainability_score': 75,
            'community_involvement': 80,
            'quality_score': 85,
            'capacity': 100
        }
    
    def _determine_partnership_type(
        self,
        evaluation: Dict[str, Any],
        terms: Dict[str, Any]
    ) -> str:
        """Determina tipo de asociación"""
        if evaluation['sustainability_score'] > 70:
            return "strategic_partner"
        else:
            return "supplier"
    
    def _calculate_revenue_share(
        self,
        evaluation: Dict[str, Any],
        terms: Dict[str, Any]
    ) -> float:
        """Calcula distribución de ingresos"""
        base_share = 0.3
        
        if evaluation['community_involvement'] > 75:
            base_share += 0.1
        
        return base_share
    
    def _estimate_employment_creation(
        self,
        business_data: Dict[str, Any],
        terms: Dict[str, Any]
    ) -> int:
        """Estima creación de empleo"""
        investment = terms.get('investment', 0)
        
        # Simplified: 1 job per $10,000 investment
        return int(investment / 10000)
    
    def _identify_skills_transfer(
        self,
        business_data: Dict[str, Any],
        terms: Dict[str, Any]
    ) -> List[str]:
        """Identifica transferencia de habilidades"""
        return ['hospitality', 'customer_service', 'digital_marketing']
    
    def _evaluate_sustainability_practices(
        self,
        business_data: Dict[str, Any]
    ) -> List[str]:
        """Evalúa prácticas de sostenibilidad"""
        return ['waste_reduction', 'local_sourcing', 'energy_efficiency']
    
    def _define_community_benefits(
        self,
        business_data: Dict[str, Any],
        terms: Dict[str, Any]
    ) -> List[str]:
        """Define beneficios comunitarios"""
        return [
            'local_employment',
            'skills_development',
            'community_fund_contribution'
        ]
    
    def _establish_performance_metrics(
        self,
        partnership_type: str,
        terms: Dict[str, Any]
    ) -> Dict[str, float]:
        """Establece métricas de desempeño"""
        return {
            'local_employment_rate': 0.8,
            'customer_satisfaction': 0.85,
            'sustainability_compliance': 0.9
        }
    
    async def _save_partnership(self, partnership: LocalBusinessPartnership) -> None:
        """Guarda asociación"""
        self.partnerships_database[partnership.partnership_id] = partnership
    
    async def _identify_stakeholders(self, community_id: str) -> List[Dict[str, Any]]:
        """Identifica stakeholders"""
        return [
            {'type': StakeholderType.LOCAL_BUSINESS, 'name': 'Local Merchants Association'},
            {'type': StakeholderType.COMMUNITY_LEADER, 'name': 'Community Council'},
            {'type': StakeholderType.RESIDENTS, 'name': 'Residents Group'}
        ]
    
    def _map_stakeholder_interests(
        self,
        stakeholders: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Mapea intereses de stakeholders"""
        mapped = []
        
        for stakeholder in stakeholders:
            mapped.append({
                **stakeholder,
                'interests': ['economic_development', 'cultural_preservation'],
                'influence': 'high',
                'support_level': 'supportive'
            })
        
        return mapped
    
    def _design_engagement_activities(
        self,
        stakeholder_mapping: List[Dict[str, Any]],
        project_details: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Diseña actividades de engagement"""
        return [
            {
                'activity': 'Community consultation meeting',
                'frequency': 'monthly',
                'participants': ['all_stakeholders'],
                'objective': 'Gather feedback and concerns'
            },
            {
                'activity': 'Progress updates',
                'frequency': 'weekly',
                'participants': ['community_leaders'],
                'objective': 'Keep stakeholders informed'
            }
        ]
    
    def _establish_communication_channels(
        self,
        stakeholders: List[Dict[str, Any]],
        community_id: str
    ) -> List[str]:
        """Establece canales de comunicación"""
        return ['community_meetings', 'whatsapp_groups', 'local_radio', 'notice_boards']
    
    def _create_feedback_mechanisms(
        self,
        stakeholders: List[Dict[str, Any]]
    ) -> List[str]:
        """Crea mecanismos de feedback"""
        return ['suggestion_box', 'monthly_surveys', 'hotline', 'community_liaison']
    
    def _define_decision_process(
        self,
        stakeholder_mapping: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Define proceso de toma de decisiones"""
        return {
            'structure': 'collaborative',
            'voting_mechanism': 'consensus',
            'veto_rights': ['community_council'],
            'decision_timeline': '2_weeks'
        }
    
    def _develop_benefit_sharing_model(
        self,
        community_id: str,
        project_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Desarrolla modelo de distribución de beneficios"""
        return {
            'revenue_share': 0.3,
            'community_fund': 0.1,
            'infrastructure_investment': 0.15,
            'education_programs': 0.05
        }
    
    def _establish_conflict_resolution(
        self,
        stakeholders: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Establece resolución de conflictos"""
        return {
            'mechanism': 'mediation',
            'mediator': 'neutral_third_party',
            'escalation_path': ['community_liaison', 'council', 'external_mediator'],
            'resolution_timeline': '30_days'
        }
    
    def _create_engagement_timeline(
        self,
        activities: List[Dict[str, Any]],
        project_details: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Crea timeline de engagement"""
        return [
            {'phase': 'consultation', 'duration': '2_months', 'activities': activities[:2]},
            {'phase': 'implementation', 'duration': '6_months', 'activities': activities[2:]}
        ]
    
    def _define_success_metrics(
        self,
        project_details: Dict[str, Any],
        stakeholders: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Define métricas de éxito"""
        return {
            'stakeholder_satisfaction': 0.8,
            'participation_rate': 0.7,
            'conflict_resolution_rate': 0.9,
            'benefit_distribution_equity': 0.85
        }
    
    async def _get_carrying_capacity(self, community_id: str) -> Dict[str, int]:
        """Obtiene capacidad de carga"""
        return {
            'daily_visitors': 500,
            'peak_visitors': 800,
            'overnight_capacity': 200
        }
    
    def _calculate_tourist_resident_ratio(
        self,
        community_id: str,
        visitor_data: Dict[str, Any]
    ) -> float:
        """Calcula ratio turistas/residentes"""
        visitors = visitor_data.get('daily_average', 0)
        population = 10000  # Simplified
        
        return visitors / population
    
    def _assess_resource_pressure(
        self,
        visitor_data: Dict[str, Any],
        capacity: Dict[str, int]
    ) -> float:
        """Evalúa presión sobre recursos"""
        current_visitors = visitor_data.get('current_visitors', 0)
        max_capacity = capacity.get('daily_visitors', 500)
        
        return current_visitors / max_capacity
    
    def _analyze_congestion(
        self,
        visitor_data: Dict[str, Any],
        community_id: str
    ) -> Dict[str, Any]:
        """Analiza congestión"""
        return {
            'level': 'moderate',
            'hotspots': ['main_square', 'heritage_site'],
            'peak_times': ['10am-2pm', '5pm-7pm']
        }
    
    def _assess_quality_of_life_impact(
        self,
        ratio: float,
        pressure: float
    ) -> Dict[str, Any]:
        """Evalúa impacto en calidad de vida"""
        impact_score = (ratio * 50 + pressure * 50)
        
        return {
            'score': impact_score,
            'level': 'moderate' if impact_score < 60 else 'high',
            'affected_aspects': ['noise', 'crowding', 'prices']
        }
    
    def _calculate_overtourism_risk_index(self, factors: Dict[str, Any]) -> float:
        """Calcula índice de riesgo de sobreturismo"""
        weights = {
            'ratio': 0.3,
            'resource_pressure': 0.3,
            'congestion': 0.2,
            'quality_impact': 0.2
        }
        
        # Simplified calculation
        risk_index = (
            factors['ratio'] * weights['ratio'] * 100 +
            factors['resource_pressure'] * weights['resource_pressure'] * 100 +
            0.5 * weights['congestion'] * 100 +  # Moderate congestion
            factors['quality_impact']['score'] * weights['quality_impact']
        )
        
        return min(100, risk_index)
    
    def _generate_overtourism_alerts(self, risk_index: float) -> List[Dict[str, Any]]:
        """Genera alertas de sobreturismo"""
        alerts = []
        
        if risk_index > 70:
            alerts.append({
                'level': 'warning',
                'message': 'High overtourism risk detected',
                'action_required': 'Immediate visitor flow management needed'
            })
        
        return alerts
    
    def _recommend_overtourism_measures(
        self,
        risk_index: float,
        community_id: str
    ) -> List[Dict[str, Any]]:
        """Recomienda medidas contra sobreturismo"""
        measures = []
        
        if risk_index > 60:
            measures.append({
                'measure': 'Implement visitor quota system',
                'urgency': 'high',
                'implementation_time': '1_month'
            })
            measures.append({
                'measure': 'Diversify tourist attractions',
                'urgency': 'medium',
                'implementation_time': '3_months'
            })
        
        return measures
    
    def _classify_risk_level(self, risk_index: float) -> str:
        """Clasifica nivel de riesgo"""
        if risk_index < 30:
            return 'low'
        elif risk_index < 60:
            return 'moderate'
        elif risk_index < 80:
            return 'high'
        else:
            return 'critical'
    
    async def _assess_development_needs(
        self,
        community_id: str,
        goals: List[str]
    ) -> Dict[str, Any]:
        """Evalúa necesidades de desarrollo"""
        return {
            'infrastructure': {'priority': 'high', 'gap': 0.4},
            'education': {'priority': 'high', 'gap': 0.3},
            'healthcare': {'priority': 'medium', 'gap': 0.25}
        }
    
    def _identify_priority_projects(
        self,
        needs: Dict[str, Any],
        goals: List[str]
    ) -> List[Dict[str, Any]]:
        """Identifica proyectos prioritarios"""
        projects = []
        
        for area, details in needs.items():
            if details['priority'] == 'high':
                projects.append({
                    'name': f"{area.capitalize()} improvement project",
                    'type': area,
                    'priority': details['priority'],
                    'estimated_cost': 50000 * details['gap']
                })
        
        return projects
    
    async def _design_intervention(
        self,
        project: Dict[str, Any],
        community_id: str
    ) -> Dict[str, Any]:
        """Diseña intervención"""
        return {
            'project': project,
            'activities': ['assessment', 'planning', 'implementation', 'monitoring'],
            'resources_required': ['funding', 'expertise', 'local_labor'],
            'expected_impact': 'significant'
        }
    
    def _calculate_investment_needs(
        self,
        interventions: List[Dict[str, Any]]
    ) -> float:
        """Calcula necesidades de inversión"""
        total = 0
        for intervention in interventions:
            total += intervention['project']['estimated_cost']
        
        return total
    
    async def _identify_funding_sources(
        self,
        required: float,
        community_id: str
    ) -> List[Dict[str, Any]]:
        """Identifica fuentes de financiamiento"""
        return [
            {'source': 'tourism_revenue', 'amount': required * 0.3},
            {'source': 'government_grants', 'amount': required * 0.4},
            {'source': 'development_funds', 'amount': required * 0.3}
        ]
    
    def _create_implementation_plan(
        self,
        interventions: List[Dict[str, Any]],
        funding: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Crea plan de implementación"""
        return {
            'phases': ['preparation', 'execution', 'monitoring'],
            'timeline': '12_months',
            'milestones': ['funding_secured', 'contracts_signed', 'project_completed'],
            'responsible_parties': ['community_council', 'project_manager']
        }
    
    def _establish_monitoring_framework(
        self,
        interventions: List[Dict[str, Any]],
        goals: List[str]
    ) -> Dict[str, Any]:
        """Establece marco de monitoreo"""
        return {
            'indicators': ['progress_rate', 'budget_utilization', 'quality_metrics'],
            'reporting_frequency': 'monthly',
            'evaluation_schedule': 'quarterly',
            'responsible_party': 'monitoring_committee'
        }
    
    def _project_outcomes(
        self,
        interventions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Proyecta resultados"""
        return [
            {'outcome': 'improved_infrastructure', 'timeline': '6_months', 'probability': 0.8},
            {'outcome': 'increased_employment', 'timeline': '3_months', 'probability': 0.9}
        ]
    
    def _estimate_timeline(self, plan: Dict[str, Any]) -> str:
        """Estima timeline"""
        return plan.get('timeline', '12_months')
    
    async def _identify_affected_stakeholders(
        self,
        project_id: str
    ) -> List[Dict[str, Any]]:
        """Identifica stakeholders afectados"""
        return [
            {'group': 'local_residents', 'size': 5000},
            {'group': 'local_businesses', 'size': 200}
        ]
    
    def _map_project_outcomes(
        self,
        project_id: str,
        stakeholders: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Mapea resultados del proyecto"""
        return {
            'employment': {'value': 50, 'beneficiaries': 'local_residents'},
            'income_increase': {'value': 10000, 'beneficiaries': 'local_businesses'}
        }
    
    def _monetize_outcomes(self, outcomes: Dict[str, Any]) -> Dict[str, float]:
        """Monetiza resultados"""
        monetized = {}
        
        for outcome, details in outcomes.items():
            if outcome == 'employment':
                monetized[outcome] = details['value'] * 20000  # Annual salary
            else:
                monetized[outcome] = details['value']
        
        return monetized
    
    def _calculate_present_value(
        self,
        outcomes: Dict[str, float],
        discount_rate: float
    ) -> float:
        """Calcula valor presente"""
        # Simplified: assume 5-year impact
        total_pv = 0
        annual_value = sum(outcomes.values())
        
        for year in range(1, 6):
            total_pv += annual_value / ((1 + discount_rate) ** year)
        
        return total_pv
    
    def _perform_sensitivity_analysis(
        self,
        outcomes: Dict[str, float],
        investment: float
    ) -> Dict[str, Any]:
        """Realiza análisis de sensibilidad"""
        base_sroi = sum(outcomes.values()) / investment if investment > 0 else 0
        
        return {
            'base_case': base_sroi,
            'pessimistic': base_sroi * 0.7,
            'optimistic': base_sroi * 1.3
        }
    
    def _analyze_value_distribution(
        self,
        outcomes: Dict[str, float],
        stakeholders: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Analiza distribución de valor"""
        total_value = sum(outcomes.values())
        
        return {
            'local_residents': total_value * 0.6,
            'local_businesses': total_value * 0.3,
            'government': total_value * 0.1
        }
    
    def _calculate_confidence_level(self, outcomes: Dict[str, Any]) -> float:
        """Calcula nivel de confianza"""
        # Simplified: based on data completeness
        return 0.75
    
    def _load_sdg_indicators(self) -> Dict[str, Any]:
        """Carga indicadores de ODS"""
        return {
            'sdg1': 'No poverty',
            'sdg8': 'Decent work and economic growth',
            'sdg11': 'Sustainable cities and communities'
        }