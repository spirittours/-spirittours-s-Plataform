"""
InfluencerMatch AI Agent - Marketing Automation & Influencer Intelligence System

Este agente especializado automatiza y optimiza las campañas de marketing con influencers
para Spirit Tours, incluyendo:
- Descubrimiento y evaluación de influencers
- Análisis de audiencia y engagement
- Predicción de ROI de campañas
- Automatización de outreach y negociación
- Monitoreo de campañas en tiempo real
- Optimización de contenido y timing
- Análisis de competencia en influencer marketing

Parte del sistema Track 2 de Spirit Tours Platform
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, field
from enum import Enum
import json
import re
from pathlib import Path
import hashlib

# Importar clase base
import sys
sys.path.append(str(Path(__file__).parent.parent / "core"))
from base_agent import BaseAgent, AgentStatus

class InfluencerTier(Enum):
    """Niveles de influencers"""
    NANO = "nano"  # 1K-10K followers
    MICRO = "micro"  # 10K-100K followers
    MACRO = "macro"  # 100K-1M followers
    MEGA = "mega"  # 1M+ followers
    CELEBRITY = "celebrity"  # 10M+ followers

class PlatformType(Enum):
    """Plataformas de redes sociales"""
    INSTAGRAM = "instagram"
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"
    FACEBOOK = "facebook"
    TWITTER = "twitter"
    LINKEDIN = "linkedin"
    PINTEREST = "pinterest"
    TWITCH = "twitch"

class ContentType(Enum):
    """Tipos de contenido"""
    PHOTO = "photo"
    VIDEO = "video"
    STORY = "story"
    REEL = "reel"
    IGTV = "igtv"
    LIVE_STREAM = "live_stream"
    BLOG_POST = "blog_post"
    PODCAST = "podcast"

class CampaignObjective(Enum):
    """Objetivos de campaña"""
    BRAND_AWARENESS = "brand_awareness"
    ENGAGEMENT = "engagement"
    TRAFFIC = "traffic"
    CONVERSIONS = "conversions"
    SALES = "sales"
    LEAD_GENERATION = "lead_generation"
    APP_INSTALLS = "app_installs"

class InfluencerStatus(Enum):
    """Estados de influencers"""
    DISCOVERED = "discovered"
    ANALYZED = "analyzed"
    CONTACTED = "contacted"
    NEGOTIATING = "negotiating"
    CONTRACTED = "contracted"
    ACTIVE = "active"
    COMPLETED = "completed"
    BLACKLISTED = "blacklisted"

class CampaignStatus(Enum):
    """Estados de campaña"""
    PLANNING = "planning"
    RECRUITING = "recruiting"
    ACTIVE = "active"
    MONITORING = "monitoring"
    OPTIMIZING = "optimizing"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"

@dataclass
class AudienceInsights:
    """Insights de audiencia del influencer"""
    total_followers: int
    age_demographics: Dict[str, float]  # "18-24": 0.35
    gender_split: Dict[str, float]  # "female": 0.65
    top_locations: List[Dict[str, Any]]  # [{"country": "Mexico", "percentage": 0.4}]
    interests: List[Dict[str, float]]  # [{"travel": 0.8}, {"food": 0.6}]
    engagement_rate: float
    avg_likes: int
    avg_comments: int
    avg_shares: int
    follower_growth_rate: float
    authenticity_score: float  # 0-1 score para detectar bots/fake followers

@dataclass
class ContentAnalysis:
    """Análisis de contenido del influencer"""
    posting_frequency: float  # posts per week
    best_posting_times: List[str]  # ["18:00-20:00", "12:00-14:00"]
    popular_hashtags: List[Dict[str, int]]  # [{"hashtag": "#travel", "usage": 45}]
    content_themes: List[Dict[str, float]]  # [{"travel": 0.6}, {"lifestyle": 0.3}]
    brand_mentions: List[Dict[str, Any]]  # Marcas mencionadas previamente
    performance_metrics: Dict[str, float]  # Métricas promedio por tipo de contenido
    content_quality_score: float  # Puntuación de calidad 0-1
    brand_safety_score: float  # Puntuación de seguridad de marca 0-1

@dataclass
class InfluencerProfile:
    """Perfil completo del influencer"""
    influencer_id: str
    username: str
    display_name: str
    platform: PlatformType
    tier: InfluencerTier
    
    # Información básica
    bio: str
    profile_url: str
    avatar_url: str
    verified: bool
    location: str
    languages: List[str]
    
    # Métricas de audiencia
    audience_insights: AudienceInsights
    content_analysis: ContentAnalysis
    
    # Evaluación y scoring
    overall_score: float  # Puntuación general 0-100
    relevance_score: float  # Relevancia para turismo 0-1
    engagement_quality: float  # Calidad del engagement 0-1
    brand_fit_score: float  # Fit con Spirit Tours 0-1
    
    # Información comercial
    estimated_cost_per_post: float
    previous_tourism_collabs: int
    response_rate: float
    average_negotiation_time: int  # días
    
    # Estado y tracking
    status: InfluencerStatus
    last_contacted: Optional[datetime] = None
    last_analysis_update: datetime = field(default_factory=datetime.now)
    
    # Métricas de campaña (si aplica)
    campaigns_participated: int = 0
    total_reach_generated: int = 0
    total_engagement_generated: int = 0
    average_campaign_roi: float = 0.0

@dataclass
class CampaignBrief:
    """Brief de campaña de marketing"""
    campaign_id: str
    campaign_name: str
    objective: CampaignObjective
    
    # Targeting
    target_platforms: List[PlatformType]
    target_tiers: List[InfluencerTier]
    target_demographics: Dict[str, Any]
    target_locations: List[str]
    
    # Contenido
    content_requirements: List[ContentType]
    key_messages: List[str]
    hashtags_required: List[str]
    hashtags_optional: List[str]
    brand_guidelines: Dict[str, Any]
    
    # Comercial
    total_budget: float
    target_reach: int
    target_engagement: int
    expected_conversions: int
    
    # Timeline
    start_date: datetime
    end_date: datetime
    content_deadlines: Dict[str, datetime]
    
    # Creación y estado
    created_date: datetime = field(default_factory=datetime.now)
    status: CampaignStatus = CampaignStatus.PLANNING
    assigned_influencers: List[str] = field(default_factory=list)

@dataclass
class CampaignPerformance:
    """Métricas de performance de campaña"""
    campaign_id: str
    
    # Métricas de alcance
    total_reach: int
    unique_reach: int
    impressions: int
    
    # Métricas de engagement
    total_likes: int
    total_comments: int
    total_shares: int
    total_saves: int
    engagement_rate: float
    
    # Métricas de conversión
    website_clicks: int
    profile_visits: int
    story_taps: int
    swipe_ups: int
    conversions: int
    conversion_rate: float
    
    # Métricas financieras
    cost_per_reach: float
    cost_per_engagement: float
    cost_per_click: float
    cost_per_conversion: float
    roi_percentage: float
    
    # Análisis de contenido
    best_performing_content: Dict[str, Any]
    worst_performing_content: Dict[str, Any]
    optimal_posting_times: List[str]
    
    # Timestamp
    last_updated: datetime = field(default_factory=datetime.now)

@dataclass
class OutreachMessage:
    """Mensaje de outreach automatizado"""
    message_id: str
    influencer_id: str
    campaign_id: str
    platform: PlatformType
    
    # Contenido del mensaje
    subject: str
    message_body: str
    call_to_action: str
    
    # Personalización
    personalization_tokens: Dict[str, str]
    
    # Estado y tracking
    sent_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    response_sentiment: Optional[str] = None
    
    # Resultados
    response_received: bool = False
    interest_level: Optional[str] = None  # "high", "medium", "low"
    next_follow_up: Optional[datetime] = None

class InfluencerMatchAgent(BaseAgent):
    """
    Agente de Automatización de Marketing con Influencers
    
    Especializado en descubrir, evaluar y gestionar relaciones con influencers
    para maximizar el ROI de las campañas de marketing de Spirit Tours.
    Incluye análisis predictivo, automatización de outreach y optimización continua.
    """
    
    def __init__(self):
        super().__init__("InfluencerMatch AI", "influencer_match")
        
        # Base de datos de influencers
        self.influencer_database: Dict[str, InfluencerProfile] = {}
        self.campaign_database: Dict[str, CampaignBrief] = {}
        self.performance_database: Dict[str, CampaignPerformance] = {}
        self.outreach_database: Dict[str, OutreachMessage] = {}
        
        # Cache y configuración
        self.search_cache: Dict[str, List[str]] = {}
        self.analysis_cache: Dict[str, Dict[str, Any]] = {}
        
        # Configuración de automatización
        self.auto_discovery_enabled = True
        self.auto_outreach_enabled = True
        self.auto_optimization_enabled = True
        
        # Thresholds y configuraciones
        self.min_follower_count = 1000
        self.max_follower_count = 10000000
        self.min_engagement_rate = 0.02
        self.min_authenticity_score = 0.7
        self.min_brand_safety_score = 0.8
        
        # Intervalos de monitoreo
        self.discovery_interval = 21600  # 6 horas
        self.performance_update_interval = 3600  # 1 hora
        self.outreach_follow_up_interval = 604800  # 1 semana
        
        # Datos simulados para demostración
        self._initialize_demo_data()
    
    def _initialize_agent_specific(self):
        """Inicialización específica del agente de influencer marketing"""
        self.logger.info("Inicializando InfluencerMatch AI Agent...")
        
        # Cargar datos existentes
        self._load_influencer_database()
        
        # Iniciar tareas de monitoreo
        asyncio.create_task(self._start_continuous_discovery())
        asyncio.create_task(self._start_performance_monitoring())
        asyncio.create_task(self._start_outreach_automation())
        
        self.logger.info("InfluencerMatch AI Agent inicializado correctamente")
    
    def _initialize_demo_data(self):
        """Inicializar datos de demostración"""
        
        # Crear perfiles de influencers de ejemplo
        demo_influencers = [
            {
                "username": "travel_maria_mx",
                "display_name": "María Travels",
                "platform": PlatformType.INSTAGRAM,
                "tier": InfluencerTier.MICRO,
                "followers": 45000,
                "engagement_rate": 0.068,
                "location": "Mexico City, Mexico",
                "niche": "travel",
                "languages": ["Spanish", "English"]
            },
            {
                "username": "adventure_carlos",
                "display_name": "Carlos Adventures",
                "platform": PlatformType.YOUTUBE,
                "tier": InfluencerTier.MACRO,
                "followers": 280000,
                "engagement_rate": 0.045,
                "location": "Barcelona, Spain",
                "niche": "adventure_travel",
                "languages": ["Spanish", "English", "French"]
            },
            {
                "username": "foodie_travels_ana",
                "display_name": "Ana's Food Journey",
                "platform": PlatformType.TIKTOK,
                "tier": InfluencerTier.MICRO,
                "followers": 85000,
                "engagement_rate": 0.092,
                "location": "São Paulo, Brazil",
                "niche": "food_travel",
                "languages": ["Portuguese", "English"]
            }
        ]
        
        # Convertir a objetos InfluencerProfile
        for demo_data in demo_influencers:
            profile = self._create_demo_influencer_profile(demo_data)
            self.influencer_database[profile.influencer_id] = profile
        
        # Crear campaña de ejemplo
        demo_campaign = CampaignBrief(
            campaign_id="summer_2024_latam",
            campaign_name="Summer Adventures LATAM 2024",
            objective=CampaignObjective.BRAND_AWARENESS,
            target_platforms=[PlatformType.INSTAGRAM, PlatformType.TIKTOK],
            target_tiers=[InfluencerTier.MICRO, InfluencerTier.MACRO],
            target_demographics={
                "age_range": "25-45",
                "interests": ["travel", "adventure", "culture"],
                "income_level": "middle_to_high"
            },
            target_locations=["Mexico", "Brazil", "Argentina", "Colombia"],
            content_requirements=[ContentType.PHOTO, ContentType.VIDEO, ContentType.STORY],
            key_messages=[
                "Discover authentic local experiences",
                "Travel with confidence and safety",
                "Create unforgettable memories"
            ],
            hashtags_required=["#SpiritTours", "#AuthenticTravel"],
            hashtags_optional=["#TravelMexico", "#ExploreBrazil", "#VisitColombia"],
            brand_guidelines={
                "tone": "authentic, inspiring, adventurous",
                "colors": ["#FF6B35", "#004E89", "#FFF"],
                "logo_placement": "bottom_right"
            },
            total_budget=50000.0,
            target_reach=500000,
            target_engagement=25000,
            expected_conversions=1000,
            start_date=datetime.now() + timedelta(days=30),
            end_date=datetime.now() + timedelta(days=90),
            content_deadlines={
                "initial_posts": datetime.now() + timedelta(days=35),
                "mid_campaign": datetime.now() + timedelta(days=60),
                "final_posts": datetime.now() + timedelta(days=85)
            }
        )
        
        self.campaign_database[demo_campaign.campaign_id] = demo_campaign
    
    def _create_demo_influencer_profile(self, demo_data: Dict[str, Any]) -> InfluencerProfile:
        """Crear perfil de influencer de demostración"""
        
        influencer_id = hashlib.md5(demo_data["username"].encode()).hexdigest()[:12]
        
        # Crear audience insights simulados
        audience_insights = AudienceInsights(
            total_followers=demo_data["followers"],
            age_demographics={
                "18-24": 0.25,
                "25-34": 0.45,
                "35-44": 0.20,
                "45-54": 0.08,
                "55+": 0.02
            },
            gender_split={"female": 0.62, "male": 0.36, "other": 0.02},
            top_locations=[
                {"country": demo_data["location"].split(", ")[1], "percentage": 0.45},
                {"country": "United States", "percentage": 0.15},
                {"country": "Canada", "percentage": 0.10}
            ],
            interests=[
                {"travel": 0.85}, {"photography": 0.72}, {"food": 0.68},
                {"culture": 0.61}, {"adventure": 0.58}
            ],
            engagement_rate=demo_data["engagement_rate"],
            avg_likes=int(demo_data["followers"] * demo_data["engagement_rate"] * 0.8),
            avg_comments=int(demo_data["followers"] * demo_data["engagement_rate"] * 0.15),
            avg_shares=int(demo_data["followers"] * demo_data["engagement_rate"] * 0.05),
            follower_growth_rate=0.035,  # 3.5% monthly growth
            authenticity_score=0.85
        )
        
        # Crear análisis de contenido simulado
        content_analysis = ContentAnalysis(
            posting_frequency=4.5,  # posts per week
            best_posting_times=["18:00-20:00", "12:00-14:00", "08:00-09:00"],
            popular_hashtags=[
                {"hashtag": "#travel", "usage": 85},
                {"hashtag": "#adventure", "usage": 72},
                {"hashtag": "#photography", "usage": 68}
            ],
            content_themes=[
                {"travel": 0.65}, {"lifestyle": 0.25}, {"food": 0.10}
            ],
            brand_mentions=[
                {"brand": "GoPro", "mentions": 12, "sentiment": "positive"},
                {"brand": "Airbnb", "mentions": 8, "sentiment": "positive"}
            ],
            performance_metrics={
                "photo_avg_engagement": demo_data["engagement_rate"],
                "video_avg_engagement": demo_data["engagement_rate"] * 1.3,
                "story_avg_views": demo_data["followers"] * 0.3
            },
            content_quality_score=0.82,
            brand_safety_score=0.91
        )
        
        # Calcular scores
        overall_score = self._calculate_overall_score(audience_insights, content_analysis, demo_data)
        relevance_score = self._calculate_relevance_score(demo_data["niche"])
        brand_fit_score = self._calculate_brand_fit_score(content_analysis, audience_insights)
        
        # Crear perfil completo
        profile = InfluencerProfile(
            influencer_id=influencer_id,
            username=demo_data["username"],
            display_name=demo_data["display_name"],
            platform=demo_data["platform"],
            tier=demo_data["tier"],
            bio=f"Travel enthusiast sharing authentic {demo_data['niche'].replace('_', ' ')} experiences 🌍✈️",
            profile_url=f"https://{demo_data['platform'].value}.com/{demo_data['username']}",
            avatar_url=f"https://example.com/avatars/{influencer_id}.jpg",
            verified=demo_data["followers"] > 100000,
            location=demo_data["location"],
            languages=demo_data["languages"],
            audience_insights=audience_insights,
            content_analysis=content_analysis,
            overall_score=overall_score,
            relevance_score=relevance_score,
            engagement_quality=demo_data["engagement_rate"] * 10,  # Convert to 0-1 scale
            brand_fit_score=brand_fit_score,
            estimated_cost_per_post=self._estimate_cost_per_post(demo_data["tier"], demo_data["followers"]),
            previous_tourism_collabs=5,
            response_rate=0.78,
            average_negotiation_time=3,
            status=InfluencerStatus.ANALYZED
        )
        
        return profile
    
    async def process_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Procesar solicitud de marketing con influencers"""
        try:
            request_type = request_data.get("type", "influencer_discovery")
            
            if request_type == "influencer_discovery":
                return await self._discover_influencers(request_data)
            elif request_type == "influencer_analysis":
                return await self._analyze_influencer(request_data)
            elif request_type == "campaign_creation":
                return await self._create_campaign(request_data)
            elif request_type == "campaign_optimization":
                return await self._optimize_campaign(request_data)
            elif request_type == "outreach_automation":
                return await self._automate_outreach(request_data)
            elif request_type == "performance_analysis":
                return await self._analyze_campaign_performance(request_data)
            elif request_type == "influencer_matching":
                return await self._match_influencers_to_campaign(request_data)
            elif request_type == "competitive_analysis":
                return await self._analyze_competitor_influencers(request_data)
            elif request_type == "roi_prediction":
                return await self._predict_campaign_roi(request_data)
            else:
                return await self._comprehensive_influencer_intelligence(request_data)
                
        except Exception as e:
            self.logger.error(f"Error procesando solicitud de influencer marketing: {e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def _discover_influencers(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Descubrir influencers relevantes"""
        
        # Parámetros de búsqueda
        niche = request_data.get("niche", "travel")
        platform = request_data.get("platform", "instagram")
        min_followers = request_data.get("min_followers", self.min_follower_count)
        max_followers = request_data.get("max_followers", self.max_follower_count)
        location = request_data.get("location", "")
        language = request_data.get("language", "")
        
        # Simular tiempo de búsqueda
        await asyncio.sleep(2)
        
        # Filtrar influencers existentes
        matching_influencers = []
        for profile in self.influencer_database.values():
            if self._matches_search_criteria(profile, niche, platform, min_followers, 
                                           max_followers, location, language):
                matching_influencers.append(profile)
        
        # Simular descubrimiento de nuevos influencers
        if len(matching_influencers) < 10:
            new_influencers = await self._simulate_new_influencer_discovery(
                niche, platform, min_followers, max_followers, location
            )
            matching_influencers.extend(new_influencers)
        
        # Ordenar por relevancia
        matching_influencers.sort(key=lambda x: x.overall_score, reverse=True)
        
        return {
            "success": True,
            "data": {
                "total_found": len(matching_influencers),
                "search_criteria": {
                    "niche": niche,
                    "platform": platform,
                    "follower_range": f"{min_followers:,} - {max_followers:,}",
                    "location": location or "Any",
                    "language": language or "Any"
                },
                "influencers": [
                    self._serialize_influencer_profile(profile, include_detailed=False)
                    for profile in matching_influencers[:20]  # Límite de 20 resultados
                ],
                "discovery_insights": {
                    "avg_engagement_rate": sum(p.audience_insights.engagement_rate for p in matching_influencers) / len(matching_influencers) if matching_influencers else 0,
                    "avg_follower_count": sum(p.audience_insights.total_followers for p in matching_influencers) / len(matching_influencers) if matching_influencers else 0,
                    "platform_distribution": self._analyze_platform_distribution(matching_influencers),
                    "tier_distribution": self._analyze_tier_distribution(matching_influencers),
                    "location_distribution": self._analyze_location_distribution(matching_influencers)
                }
            }
        }
    
    async def _analyze_influencer(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Análisis detallado de un influencer específico"""
        
        influencer_id = request_data.get("influencer_id")
        username = request_data.get("username")
        
        # Buscar influencer
        profile = None
        if influencer_id and influencer_id in self.influencer_database:
            profile = self.influencer_database[influencer_id]
        elif username:
            for p in self.influencer_database.values():
                if p.username.lower() == username.lower():
                    profile = p
                    break
        
        if not profile:
            return {
                "success": False,
                "error": "Influencer not found"
            }
        
        # Simular análisis profundo
        await asyncio.sleep(1.5)
        
        # Análisis de compatibilidad con Spirit Tours
        compatibility_analysis = await self._analyze_brand_compatibility(profile)
        
        # Análisis predictivo de performance
        predicted_performance = await self._predict_influencer_performance(profile, request_data)
        
        # Recomendaciones de colaboración
        collaboration_recommendations = await self._generate_collaboration_recommendations(profile)
        
        return {
            "success": True,
            "data": {
                "profile": self._serialize_influencer_profile(profile, include_detailed=True),
                "compatibility_analysis": compatibility_analysis,
                "predicted_performance": predicted_performance,
                "collaboration_recommendations": collaboration_recommendations,
                "risk_assessment": self._assess_collaboration_risks(profile),
                "pricing_analysis": self._analyze_pricing_structure(profile),
                "content_strategy": self._suggest_content_strategy(profile),
                "timeline_recommendations": self._suggest_collaboration_timeline(profile)
            }
        }
    
    async def _create_campaign(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Crear nueva campaña de influencer marketing"""
        
        # Extraer datos de la campaña
        campaign_data = request_data.get("campaign", {})
        
        # Generar ID único
        campaign_id = hashlib.md5(f"{campaign_data.get('name', 'campaign')}_{datetime.now().isoformat()}".encode()).hexdigest()[:12]
        
        # Parsear fechas
        start_date = datetime.fromisoformat(campaign_data.get("start_date", (datetime.now() + timedelta(days=7)).isoformat()))
        end_date = datetime.fromisoformat(campaign_data.get("end_date", (datetime.now() + timedelta(days=37)).isoformat()))
        
        # Crear brief de campaña
        campaign = CampaignBrief(
            campaign_id=campaign_id,
            campaign_name=campaign_data.get("name", "New Influencer Campaign"),
            objective=CampaignObjective(campaign_data.get("objective", "brand_awareness")),
            target_platforms=[PlatformType(p) for p in campaign_data.get("platforms", ["instagram"])],
            target_tiers=[InfluencerTier(t) for t in campaign_data.get("tiers", ["micro"])],
            target_demographics=campaign_data.get("demographics", {}),
            target_locations=campaign_data.get("locations", []),
            content_requirements=[ContentType(c) for c in campaign_data.get("content_types", ["photo"])],
            key_messages=campaign_data.get("messages", []),
            hashtags_required=campaign_data.get("hashtags_required", ["#SpiritTours"]),
            hashtags_optional=campaign_data.get("hashtags_optional", []),
            brand_guidelines=campaign_data.get("guidelines", {}),
            total_budget=campaign_data.get("budget", 10000.0),
            target_reach=campaign_data.get("target_reach", 100000),
            target_engagement=campaign_data.get("target_engagement", 5000),
            expected_conversions=campaign_data.get("expected_conversions", 200),
            start_date=start_date,
            end_date=end_date,
            content_deadlines={}
        )
        
        # Guardar campaña
        self.campaign_database[campaign_id] = campaign
        
        # Buscar influencers compatibles automáticamente
        matching_influencers = await self._find_matching_influencers_for_campaign(campaign)
        
        # Simular tiempo de procesamiento
        await asyncio.sleep(2)
        
        return {
            "success": True,
            "data": {
                "campaign": self._serialize_campaign_brief(campaign),
                "matching_influencers": {
                    "total_found": len(matching_influencers),
                    "recommended": [
                        self._serialize_influencer_profile(inf, include_detailed=False)
                        for inf in matching_influencers[:10]
                    ],
                    "budget_allocation": self._calculate_budget_allocation(campaign.total_budget, matching_influencers[:10]),
                    "projected_metrics": self._project_campaign_metrics(campaign, matching_influencers[:10])
                },
                "next_steps": [
                    "Review and approve recommended influencers",
                    "Initiate outreach to selected influencers", 
                    "Negotiate terms and finalize contracts",
                    "Schedule content creation and publication",
                    "Set up campaign monitoring and analytics"
                ]
            }
        }
    
    async def _optimize_campaign(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Optimizar campaña activa"""
        
        campaign_id = request_data.get("campaign_id")
        if not campaign_id or campaign_id not in self.campaign_database:
            return {"success": False, "error": "Campaign not found"}
        
        campaign = self.campaign_database[campaign_id]
        
        # Simular análisis de performance actual
        await asyncio.sleep(1.5)
        
        # Obtener métricas actuales (simuladas)
        current_performance = self._simulate_current_campaign_performance(campaign)
        
        # Identificar oportunidades de optimización
        optimization_opportunities = self._identify_optimization_opportunities(campaign, current_performance)
        
        # Generar recomendaciones específicas
        recommendations = self._generate_optimization_recommendations(campaign, current_performance, optimization_opportunities)
        
        return {
            "success": True,
            "data": {
                "campaign_id": campaign_id,
                "current_performance": current_performance,
                "optimization_opportunities": optimization_opportunities,
                "recommendations": recommendations,
                "projected_improvements": self._calculate_projected_improvements(recommendations),
                "implementation_priority": self._prioritize_recommendations(recommendations),
                "estimated_impact": {
                    "reach_increase": "15-25%",
                    "engagement_increase": "20-30%", 
                    "conversion_increase": "10-18%",
                    "cost_reduction": "8-12%"
                }
            }
        }
    
    async def _automate_outreach(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Automatizar outreach a influencers"""
        
        campaign_id = request_data.get("campaign_id")
        influencer_ids = request_data.get("influencer_ids", [])
        message_template = request_data.get("message_template", "default")
        
        if not campaign_id or campaign_id not in self.campaign_database:
            return {"success": False, "error": "Campaign not found"}
        
        campaign = self.campaign_database[campaign_id]
        
        # Procesar cada influencer
        outreach_results = []
        
        for influencer_id in influencer_ids:
            if influencer_id not in self.influencer_database:
                continue
            
            influencer = self.influencer_database[influencer_id]
            
            # Generar mensaje personalizado
            personalized_message = await self._generate_personalized_outreach_message(
                influencer, campaign, message_template
            )
            
            # Simular envío de mensaje
            outreach_message = OutreachMessage(
                message_id=f"msg_{influencer_id}_{campaign_id}",
                influencer_id=influencer_id,
                campaign_id=campaign_id,
                platform=influencer.platform,
                subject=personalized_message["subject"],
                message_body=personalized_message["body"],
                call_to_action=personalized_message["cta"],
                personalization_tokens=personalized_message["tokens"],
                sent_at=datetime.now()
            )
            
            # Guardar mensaje
            self.outreach_database[outreach_message.message_id] = outreach_message
            
            # Simular tiempo de envío
            await asyncio.sleep(0.2)
            
            outreach_results.append({
                "influencer_id": influencer_id,
                "username": influencer.username,
                "message_id": outreach_message.message_id,
                "status": "sent",
                "platform": influencer.platform.value,
                "estimated_response_time": f"{influencer.average_negotiation_time} days",
                "response_probability": influencer.response_rate
            })
        
        return {
            "success": True,
            "data": {
                "campaign_id": campaign_id,
                "outreach_summary": {
                    "total_sent": len(outreach_results),
                    "platforms_used": list(set(r["platform"] for r in outreach_results)),
                    "estimated_responses": sum(r["response_probability"] for r in outreach_results),
                    "follow_up_scheduled": datetime.now() + timedelta(days=7)
                },
                "outreach_results": outreach_results,
                "next_steps": [
                    "Monitor response rates and engagement",
                    "Follow up with non-responders in 1 week",
                    "Begin negotiations with interested influencers",
                    "Update campaign status based on confirmations"
                ]
            }
        }
    
    async def _analyze_campaign_performance(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analizar performance de campaña"""
        
        campaign_id = request_data.get("campaign_id")
        if not campaign_id or campaign_id not in self.campaign_database:
            return {"success": False, "error": "Campaign not found"}
        
        campaign = self.campaign_database[campaign_id]
        
        # Simular recopilación de métricas
        await asyncio.sleep(2)
        
        # Generar performance report completo
        performance = self._generate_comprehensive_performance_report(campaign)
        
        return {
            "success": True,
            "data": performance
        }
    
    async def _match_influencers_to_campaign(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Hacer match de influencers con campaña específica"""
        
        campaign_id = request_data.get("campaign_id")
        max_results = request_data.get("max_results", 20)
        
        if not campaign_id or campaign_id not in self.campaign_database:
            return {"success": False, "error": "Campaign not found"}
        
        campaign = self.campaign_database[campaign_id]
        
        # Encontrar influencers matching
        matching_influencers = await self._find_matching_influencers_for_campaign(campaign)
        
        # Calcular scores de compatibilidad
        scored_matches = []
        for influencer in matching_influencers[:max_results]:
            compatibility_score = self._calculate_campaign_compatibility_score(influencer, campaign)
            
            scored_matches.append({
                "influencer": self._serialize_influencer_profile(influencer, include_detailed=False),
                "compatibility_score": compatibility_score,
                "estimated_cost": self._estimate_campaign_cost_for_influencer(influencer, campaign),
                "projected_reach": influencer.audience_insights.total_followers,
                "projected_engagement": int(influencer.audience_insights.total_followers * influencer.audience_insights.engagement_rate),
                "fit_reasons": self._explain_campaign_fit(influencer, campaign)
            })
        
        # Ordenar por compatibility score
        scored_matches.sort(key=lambda x: x["compatibility_score"], reverse=True)
        
        return {
            "success": True,
            "data": {
                "campaign_id": campaign_id,
                "campaign_name": campaign.campaign_name,
                "total_matches": len(scored_matches),
                "matches": scored_matches,
                "summary": {
                    "avg_compatibility_score": sum(m["compatibility_score"] for m in scored_matches) / len(scored_matches) if scored_matches else 0,
                    "total_estimated_cost": sum(m["estimated_cost"] for m in scored_matches),
                    "total_projected_reach": sum(m["projected_reach"] for m in scored_matches),
                    "total_projected_engagement": sum(m["projected_engagement"] for m in scored_matches)
                }
            }
        }
    
    async def _analyze_competitor_influencers(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analizar influencers de la competencia"""
        
        competitors = request_data.get("competitors", ["viator", "getyourguide", "airbnb"])
        analysis_depth = request_data.get("depth", "standard")
        
        # Simular análisis de competencia
        await asyncio.sleep(3)
        
        competitor_analysis = {}
        
        for competitor in competitors:
            competitor_data = {
                "brand": competitor.title(),
                "influencer_strategy": {
                    "total_influencers_used": random.randint(50, 200),
                    "primary_platforms": ["instagram", "tiktok", "youtube"],
                    "preferred_tiers": ["micro", "macro"],
                    "avg_campaign_duration": "4-6 weeks",
                    "estimated_monthly_spend": random.randint(100000, 500000)
                },
                "top_influencers": self._simulate_competitor_influencers(competitor),
                "content_themes": [
                    "destination highlights",
                    "user-generated content", 
                    "behind-the-scenes",
                    "seasonal campaigns",
                    "influencer takeovers"
                ],
                "performance_insights": {
                    "avg_engagement_rate": round(random.uniform(0.03, 0.08), 3),
                    "successful_campaigns": random.randint(8, 15),
                    "total_reach_last_quarter": random.randint(5000000, 20000000)
                },
                "opportunities": self._identify_competitor_gaps(competitor)
            }
            
            competitor_analysis[competitor] = competitor_data
        
        return {
            "success": True,
            "data": {
                "analysis_overview": {
                    "competitors_analyzed": len(competitors),
                    "analysis_depth": analysis_depth,
                    "key_insights": [
                        "Most competitors focus on micro-influencer strategies",
                        "Instagram and TikTok are primary platforms",
                        "Seasonal campaigns show highest engagement",
                        "UGC content performs 40% better than branded content"
                    ]
                },
                "competitor_breakdown": competitor_analysis,
                "strategic_recommendations": [
                    "Target underutilized nano-influencer segment",
                    "Increase focus on video content creation",
                    "Develop year-round campaign calendar",
                    "Implement influencer ambassador program",
                    "Focus on authentic storytelling approach"
                ],
                "market_opportunities": [
                    "Latin American travel micro-influencers underserved",
                    "Sustainable travel niche gaining momentum", 
                    "Food tourism crossover potential",
                    "Multi-generational travel content gap"
                ]
            }
        }
    
    async def _predict_campaign_roi(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predecir ROI de campaña"""
        
        campaign_data = request_data.get("campaign", {})
        influencer_list = request_data.get("influencers", [])
        
        # Simular análisis predictivo
        await asyncio.sleep(2.5)
        
        # Calcular métricas predictivas
        total_budget = campaign_data.get("budget", 10000)
        
        predictions = {
            "budget_breakdown": {
                "influencer_fees": total_budget * 0.70,
                "content_creation": total_budget * 0.15,
                "platform_costs": total_budget * 0.10,
                "management_fees": total_budget * 0.05
            },
            "reach_predictions": {
                "total_reach": random.randint(100000, 1000000),
                "unique_reach": random.randint(80000, 800000),
                "reach_by_platform": {
                    "instagram": 0.45,
                    "tiktok": 0.35,
                    "youtube": 0.20
                }
            },
            "engagement_predictions": {
                "total_engagement": random.randint(5000, 50000),
                "engagement_rate": round(random.uniform(0.04, 0.09), 3),
                "engagement_by_content_type": {
                    "video": 0.45,
                    "photo": 0.30,
                    "story": 0.25
                }
            },
            "conversion_predictions": {
                "website_clicks": random.randint(2000, 15000),
                "conversions": random.randint(200, 1500),
                "conversion_rate": round(random.uniform(0.08, 0.15), 3),
                "revenue_generated": random.randint(50000, 300000)
            },
            "roi_analysis": {
                "total_investment": total_budget,
                "projected_revenue": random.randint(int(total_budget * 1.5), int(total_budget * 8)),
                "roi_percentage": random.randint(150, 800),
                "payback_period": f"{random.randint(2, 8)} weeks",
                "confidence_level": "85%"
            }
        }
        
        # Calcular ROI final
        roi_percentage = ((predictions["roi_analysis"]["projected_revenue"] - total_budget) / total_budget) * 100
        predictions["roi_analysis"]["roi_percentage"] = round(roi_percentage, 1)
        
        return {
            "success": True,
            "data": {
                "campaign_overview": campaign_data,
                "predictions": predictions,
                "risk_factors": [
                    "Influencer availability and response rates",
                    "Content performance variability",
                    "Platform algorithm changes",
                    "Seasonal demand fluctuations"
                ],
                "optimization_suggestions": [
                    "Focus on video content for higher engagement",
                    "Implement A/B testing for content variations",
                    "Schedule posts during optimal engagement hours",
                    "Use data-driven influencer selection"
                ],
                "success_probability": "87%"
            }
        }
    
    async def _comprehensive_influencer_intelligence(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Análisis comprensivo de inteligencia de influencers"""
        
        # Ejecutar múltiples análisis en paralelo
        tasks = [
            self._get_market_overview(),
            self._get_trending_influencers(),
            self._get_platform_insights(),
            self._get_content_trends(),
            self._get_pricing_intelligence()
        ]
        
        results = await asyncio.gather(*tasks)
        
        return {
            "success": True,
            "data": {
                "market_overview": results[0],
                "trending_influencers": results[1],
                "platform_insights": results[2],
                "content_trends": results[3],
                "pricing_intelligence": results[4],
                "strategic_insights": self._generate_strategic_insights(),
                "action_recommendations": self._generate_action_recommendations()
            }
        }
    
    # Métodos auxiliares y de utilidad
    
    def _matches_search_criteria(self, profile: InfluencerProfile, niche: str, platform: str,
                                min_followers: int, max_followers: int, location: str, language: str) -> bool:
        """Verificar si influencer coincide con criterios de búsqueda"""
        
        # Verificar plataforma
        if profile.platform.value.lower() != platform.lower():
            return False
        
        # Verificar rango de followers
        if not (min_followers <= profile.audience_insights.total_followers <= max_followers):
            return False
        
        # Verificar ubicación (si se especifica)
        if location and location.lower() not in profile.location.lower():
            return False
        
        # Verificar idioma (si se especifica)
        if language and not any(lang.lower().startswith(language.lower()) for lang in profile.languages):
            return False
        
        # Verificar relevancia de nicho (búsqueda en bio y temas de contenido)
        niche_keywords = niche.lower().split()
        bio_text = profile.bio.lower()
        content_themes = [theme for themes_dict in profile.content_analysis.content_themes for theme in themes_dict.keys()]
        
        niche_match = any(
            keyword in bio_text or 
            any(keyword in theme for theme in content_themes)
            for keyword in niche_keywords
        )
        
        return niche_match
    
    async def _simulate_new_influencer_discovery(self, niche: str, platform: str, 
                                               min_followers: int, max_followers: int, location: str) -> List[InfluencerProfile]:
        """Simular descubrimiento de nuevos influencers"""
        
        # Simular tiempo de búsqueda en APIs
        await asyncio.sleep(1)
        
        new_influencers = []
        num_to_generate = random.randint(3, 8)
        
        for i in range(num_to_generate):
            # Generar datos aleatorios realistas
            followers = random.randint(min_followers, min(max_followers, min_followers * 10))
            
            demo_data = {
                "username": f"{niche}_creator_{random.randint(100, 999)}",
                "display_name": f"{niche.title()} Creator {i+1}",
                "platform": PlatformType(platform),
                "tier": self._determine_tier_by_followers(followers),
                "followers": followers,
                "engagement_rate": random.uniform(0.025, 0.12),
                "location": location or "Global",
                "niche": niche,
                "languages": ["English", "Spanish"] if not location else [self._get_primary_language(location), "English"]
            }
            
            profile = self._create_demo_influencer_profile(demo_data)
            profile.status = InfluencerStatus.DISCOVERED
            
            # Guardar en base de datos
            self.influencer_database[profile.influencer_id] = profile
            new_influencers.append(profile)
        
        return new_influencers
    
    def _determine_tier_by_followers(self, followers: int) -> InfluencerTier:
        """Determinar tier basado en número de followers"""
        if followers < 10000:
            return InfluencerTier.NANO
        elif followers < 100000:
            return InfluencerTier.MICRO
        elif followers < 1000000:
            return InfluencerTier.MACRO
        elif followers < 10000000:
            return InfluencerTier.MEGA
        else:
            return InfluencerTier.CELEBRITY
    
    def _get_primary_language(self, location: str) -> str:
        """Obtener idioma principal por ubicación"""
        language_map = {
            "mexico": "Spanish",
            "brazil": "Portuguese",
            "spain": "Spanish",
            "france": "French",
            "germany": "German",
            "italy": "Italian",
            "japan": "Japanese"
        }
        
        for country, language in language_map.items():
            if country in location.lower():
                return language
        
        return "English"
    
    def _calculate_overall_score(self, audience: AudienceInsights, content: ContentAnalysis, demo_data: Dict) -> float:
        """Calcular puntuación general del influencer"""
        
        # Factores de scoring
        engagement_score = min(1.0, audience.engagement_rate * 10)  # 0-1 scale
        authenticity_score = audience.authenticity_score
        quality_score = content.content_quality_score
        safety_score = content.brand_safety_score
        
        # Peso por factores
        overall = (
            engagement_score * 0.3 +
            authenticity_score * 0.25 +
            quality_score * 0.25 +
            safety_score * 0.20
        )
        
        return round(overall * 100, 1)  # Convertir a escala 0-100
    
    def _calculate_relevance_score(self, niche: str) -> float:
        """Calcular puntuación de relevancia para turismo"""
        travel_related_niches = {
            "travel": 1.0,
            "adventure_travel": 0.95,
            "food_travel": 0.85,
            "luxury_travel": 0.9,
            "budget_travel": 0.8,
            "photography": 0.7,
            "lifestyle": 0.6,
            "food": 0.5,
            "culture": 0.75
        }
        
        return travel_related_niches.get(niche, 0.3)
    
    def _calculate_brand_fit_score(self, content: ContentAnalysis, audience: AudienceInsights) -> float:
        """Calcular compatibilidad con la marca Spirit Tours"""
        
        # Factores positivos
        travel_theme_weight = next((theme_dict.get("travel", 0) for theme_dict in content.content_themes if "travel" in theme_dict), 0)
        safety_score = content.brand_safety_score
        engagement_quality = min(1.0, audience.engagement_rate * 8)
        
        # Calcular fit score
        brand_fit = (travel_theme_weight * 0.4 + safety_score * 0.3 + engagement_quality * 0.3)
        
        return round(brand_fit, 2)
    
    def _estimate_cost_per_post(self, tier: InfluencerTier, followers: int) -> float:
        """Estimar costo por post basado en tier y followers"""
        
        base_rates = {
            InfluencerTier.NANO: 0.01,      # $10 per 1K followers
            InfluencerTier.MICRO: 0.008,     # $8 per 1K followers
            InfluencerTier.MACRO: 0.006,     # $6 per 1K followers
            InfluencerTier.MEGA: 0.004,      # $4 per 1K followers
            InfluencerTier.CELEBRITY: 0.002   # $2 per 1K followers
        }
        
        base_cost = followers * base_rates.get(tier, 0.01)
        
        # Agregar variación aleatoria ±20%
        variation = random.uniform(0.8, 1.2)
        
        return round(base_cost * variation, 2)
    
    async def _start_continuous_discovery(self):
        """Iniciar descubrimiento continuo de influencers"""
        while self.status == AgentStatus.ACTIVE and self.auto_discovery_enabled:
            try:
                # Buscar nuevos influencers en nichos prioritarios
                for niche in ["travel", "adventure", "food_travel", "luxury_travel"]:
                    for platform in ["instagram", "tiktok", "youtube"]:
                        await self._discover_new_influencers_batch(niche, platform)
                
                await asyncio.sleep(self.discovery_interval)
                
            except Exception as e:
                self.logger.error(f"Error en descubrimiento continuo: {e}")
                await asyncio.sleep(1800)  # 30 minutos antes de reintentar
    
    async def _start_performance_monitoring(self):
        """Iniciar monitoreo de performance de campañas"""
        while self.status == AgentStatus.ACTIVE:
            try:
                # Actualizar métricas de campañas activas
                for campaign_id, campaign in self.campaign_database.items():
                    if campaign.status == CampaignStatus.ACTIVE:
                        await self._update_campaign_metrics(campaign_id)
                
                await asyncio.sleep(self.performance_update_interval)
                
            except Exception as e:
                self.logger.error(f"Error en monitoreo de performance: {e}")
                await asyncio.sleep(900)  # 15 minutos antes de reintentar
    
    async def _start_outreach_automation(self):
        """Iniciar automatización de outreach"""
        while self.status == AgentStatus.ACTIVE and self.auto_outreach_enabled:
            try:
                # Procesar follow-ups pendientes
                await self._process_outreach_followups()
                
                # Procesar respuestas recibidas
                await self._process_outreach_responses()
                
                await asyncio.sleep(self.outreach_follow_up_interval)
                
            except Exception as e:
                self.logger.error(f"Error en automatización de outreach: {e}")
                await asyncio.sleep(3600)  # 1 hora antes de reintentar
    
    async def _discover_new_influencers_batch(self, niche: str, platform: str):
        """Descubrir lote de nuevos influencers"""
        # Simular búsqueda
        await asyncio.sleep(0.5)
        
        # En producción, aquí se conectaría a APIs reales de plataformas
        self.logger.debug(f"Buscando influencers en {platform} para nicho {niche}")
    
    async def _update_campaign_metrics(self, campaign_id: str):
        """Actualizar métricas de campaña"""
        # Simular recopilación de métricas
        await asyncio.sleep(0.2)
        
        # En producción, aquí se conectaría a APIs de analytics
        self.logger.debug(f"Actualizando métricas para campaña {campaign_id}")
    
    async def _process_outreach_followups(self):
        """Procesar follow-ups de outreach"""
        # Identificar mensajes que necesitan follow-up
        now = datetime.now()
        
        for message in self.outreach_database.values():
            if (message.next_follow_up and 
                message.next_follow_up <= now and 
                not message.response_received):
                
                # Enviar follow-up automático
                await self._send_automated_followup(message)
    
    async def _process_outreach_responses(self):
        """Procesar respuestas recibidas"""
        # En producción, esto leería de APIs de mensajería
        # Por ahora simularemos algunas respuestas aleatorias
        pass
    
    async def _send_automated_followup(self, original_message: OutreachMessage):
        """Enviar follow-up automático"""
        # Simular envío de follow-up
        await asyncio.sleep(0.1)
        
        self.logger.debug(f"Enviando follow-up para mensaje {original_message.message_id}")
    
    # Métodos de análisis y serialización
    
    def _serialize_influencer_profile(self, profile: InfluencerProfile, include_detailed: bool = False) -> Dict[str, Any]:
        """Serializar perfil de influencer para JSON"""
        
        basic_data = {
            "influencer_id": profile.influencer_id,
            "username": profile.username,
            "display_name": profile.display_name,
            "platform": profile.platform.value,
            "tier": profile.tier.value,
            "verified": profile.verified,
            "location": profile.location,
            "languages": profile.languages,
            "followers": profile.audience_insights.total_followers,
            "engagement_rate": profile.audience_insights.engagement_rate,
            "overall_score": profile.overall_score,
            "relevance_score": profile.relevance_score,
            "brand_fit_score": profile.brand_fit_score,
            "estimated_cost_per_post": profile.estimated_cost_per_post,
            "status": profile.status.value
        }
        
        if include_detailed:
            basic_data.update({
                "bio": profile.bio,
                "profile_url": profile.profile_url,
                "avatar_url": profile.avatar_url,
                "audience_insights": {
                    "total_followers": profile.audience_insights.total_followers,
                    "age_demographics": profile.audience_insights.age_demographics,
                    "gender_split": profile.audience_insights.gender_split,
                    "top_locations": profile.audience_insights.top_locations,
                    "interests": profile.audience_insights.interests,
                    "engagement_rate": profile.audience_insights.engagement_rate,
                    "avg_likes": profile.audience_insights.avg_likes,
                    "avg_comments": profile.audience_insights.avg_comments,
                    "follower_growth_rate": profile.audience_insights.follower_growth_rate,
                    "authenticity_score": profile.audience_insights.authenticity_score
                },
                "content_analysis": {
                    "posting_frequency": profile.content_analysis.posting_frequency,
                    "best_posting_times": profile.content_analysis.best_posting_times,
                    "popular_hashtags": profile.content_analysis.popular_hashtags,
                    "content_themes": profile.content_analysis.content_themes,
                    "content_quality_score": profile.content_analysis.content_quality_score,
                    "brand_safety_score": profile.content_analysis.brand_safety_score
                },
                "commercial_info": {
                    "estimated_cost_per_post": profile.estimated_cost_per_post,
                    "previous_tourism_collabs": profile.previous_tourism_collabs,
                    "response_rate": profile.response_rate,
                    "average_negotiation_time": profile.average_negotiation_time
                },
                "performance_history": {
                    "campaigns_participated": profile.campaigns_participated,
                    "total_reach_generated": profile.total_reach_generated,
                    "total_engagement_generated": profile.total_engagement_generated,
                    "average_campaign_roi": profile.average_campaign_roi
                }
            })
        
        return basic_data
    
    def _serialize_campaign_brief(self, campaign: CampaignBrief) -> Dict[str, Any]:
        """Serializar brief de campaña para JSON"""
        return {
            "campaign_id": campaign.campaign_id,
            "campaign_name": campaign.campaign_name,
            "objective": campaign.objective.value,
            "target_platforms": [p.value for p in campaign.target_platforms],
            "target_tiers": [t.value for t in campaign.target_tiers],
            "target_demographics": campaign.target_demographics,
            "target_locations": campaign.target_locations,
            "content_requirements": [c.value for c in campaign.content_requirements],
            "key_messages": campaign.key_messages,
            "hashtags_required": campaign.hashtags_required,
            "hashtags_optional": campaign.hashtags_optional,
            "brand_guidelines": campaign.brand_guidelines,
            "total_budget": campaign.total_budget,
            "target_reach": campaign.target_reach,
            "target_engagement": campaign.target_engagement,
            "expected_conversions": campaign.expected_conversions,
            "start_date": campaign.start_date.isoformat(),
            "end_date": campaign.end_date.isoformat(),
            "status": campaign.status.value,
            "assigned_influencers": campaign.assigned_influencers,
            "created_date": campaign.created_date.isoformat()
        }
    
    # Métodos auxiliares que faltan por implementar (continuarán en la siguiente parte...)
    
    def get_agent_status(self) -> Dict[str, Any]:
        """Obtener estado detallado del agente"""
        return {
            **super().get_agent_status(),
            "total_influencers": len(self.influencer_database),
            "active_campaigns": len([c for c in self.campaign_database.values() if c.status == CampaignStatus.ACTIVE]),
            "pending_outreach": len([m for m in self.outreach_database.values() if not m.response_received]),
            "discovery_enabled": self.auto_discovery_enabled,
            "outreach_enabled": self.auto_outreach_enabled,
            "optimization_enabled": self.auto_optimization_enabled
        }

# Funciones auxiliares continuadas (los métodos que faltan se implementarían aquí)
# Por brevedad, se incluyen las implementaciones básicas

    async def _analyze_brand_compatibility(self, profile: InfluencerProfile) -> Dict[str, Any]:
        """Analizar compatibilidad con la marca"""
        return {
            "overall_compatibility": "High",
            "brand_values_alignment": 0.85,
            "audience_overlap": 0.78,
            "content_style_fit": 0.82,
            "risk_factors": ["None identified"],
            "opportunities": ["Strong travel focus", "Engaged audience", "Quality content"]
        }
    
    async def _predict_influencer_performance(self, profile: InfluencerProfile, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predecir performance del influencer"""
        return {
            "projected_reach": profile.audience_insights.total_followers * 0.3,
            "projected_engagement": int(profile.audience_insights.total_followers * profile.audience_insights.engagement_rate),
            "conversion_probability": 0.08,
            "confidence_level": "85%"
        }
    
    async def _generate_collaboration_recommendations(self, profile: InfluencerProfile) -> List[str]:
        """Generar recomendaciones de colaboración"""
        return [
            "Focus on destination highlight content",
            "Leverage storytelling approach",
            "Include user-generated content elements",
            "Schedule posts during peak engagement hours"
        ]
    
    def _assess_collaboration_risks(self, profile: InfluencerProfile) -> Dict[str, Any]:
        """Evaluar riesgos de colaboración"""
        return {
            "overall_risk_level": "Low",
            "identified_risks": [],
            "mitigation_strategies": ["Clear contract terms", "Content approval process"]
        }
    
    def _analyze_pricing_structure(self, profile: InfluencerProfile) -> Dict[str, Any]:
        """Analizar estructura de precios"""
        return {
            "estimated_cost_per_post": profile.estimated_cost_per_post,
            "market_comparison": "Below average",
            "negotiation_potential": "Moderate"
        }
    
    def _suggest_content_strategy(self, profile: InfluencerProfile) -> Dict[str, Any]:
        """Sugerir estrategia de contenido"""
        return {
            "content_mix": {"photos": 0.4, "videos": 0.4, "stories": 0.2},
            "posting_schedule": "3-4 times per week",
            "optimal_times": profile.content_analysis.best_posting_times
        }
    
    def _suggest_collaboration_timeline(self, profile: InfluencerProfile) -> Dict[str, str]:
        """Sugerir cronograma de colaboración"""
        return {
            "outreach": "Week 1",
            "negotiation": "Week 2",
            "content_creation": "Weeks 3-4",
            "publication": "Weeks 5-6",
            "monitoring": "Weeks 7-8"
        }

# Función de utilidad para crear instancia
def create_influencer_match_agent() -> InfluencerMatchAgent:
    """Crear y configurar instancia del agente de influencer matching"""
    return InfluencerMatchAgent()

if __name__ == "__main__":
    # Ejemplo de uso
    import asyncio
    
    async def test_agent():
        agent = create_influencer_match_agent()
        
        # Test descubrimiento de influencers
        result = await agent.process_request({
            "type": "influencer_discovery",
            "niche": "travel",
            "platform": "instagram",
            "min_followers": 10000,
            "max_followers": 100000,
            "location": "Mexico"
        })
        
        print("Influencer Discovery Result:")
        print(json.dumps(result, indent=2, default=str))
    
    asyncio.run(test_agent())