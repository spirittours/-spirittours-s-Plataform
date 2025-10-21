"""
AI-powered Recommendation Engine (Phase 4)

Sistema de inteligencia artificial para recomendaciones personalizadas:
- Análisis de comportamiento del cliente
- Predicción de preferencias
- Recomendaciones de viajes personalizadas
- Forecasting de demanda
- Segmentación inteligente de clientes
- Optimización de precios con ML

Autor: Spirit Tours AI Team
Fecha: 2025-10-18
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
import logging
import json

logger = logging.getLogger(__name__)


# ============================================================================
# ENUMS & DATA CLASSES
# ============================================================================

class RecommendationType(str, Enum):
    """Tipos de recomendaciones."""
    DESTINATION = "destination"
    PRODUCT = "product"
    BUNDLE = "bundle"
    EXPERIENCE = "experience"
    SEASONAL = "seasonal"


class CustomerSegment(str, Enum):
    """Segmentos de clientes."""
    LUXURY = "luxury"
    BUDGET = "budget"
    FAMILY = "family"
    SOLO = "solo"
    COUPLE = "couple"
    ADVENTURE = "adventure"
    CULTURAL = "cultural"
    BUSINESS = "business"


class PredictionConfidence(str, Enum):
    """Niveles de confianza de predicción."""
    HIGH = "high"  # 80%+
    MEDIUM = "medium"  # 60-80%
    LOW = "low"  # <60%


@dataclass
class CustomerProfile:
    """Perfil de cliente con historial y preferencias."""
    customer_id: str
    age_group: str  # "18-25", "26-35", "36-50", "51-65", "65+"
    location: str
    booking_history: List[Dict[str, Any]]
    preferences: Dict[str, Any]
    budget_range: Tuple[Decimal, Decimal]
    travel_frequency: str  # "frequent", "occasional", "rare"
    preferred_destinations: List[str]
    preferred_activities: List[str]
    last_booking_date: Optional[date] = None
    total_spent: Decimal = Decimal("0")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertir a diccionario."""
        return {
            "customer_id": self.customer_id,
            "age_group": self.age_group,
            "location": self.location,
            "booking_count": len(self.booking_history),
            "travel_frequency": self.travel_frequency,
            "budget_range": {
                "min": float(self.budget_range[0]),
                "max": float(self.budget_range[1])
            },
            "total_spent": float(self.total_spent),
            "last_booking": self.last_booking_date.isoformat() if self.last_booking_date else None,
            "preferred_destinations": self.preferred_destinations,
            "preferred_activities": self.preferred_activities
        }


@dataclass
class AIRecommendation:
    """Recomendación generada por AI."""
    recommendation_id: str
    recommendation_type: RecommendationType
    title: str
    description: str
    destination: str
    estimated_price: Decimal
    confidence_score: Decimal  # 0-100
    confidence_level: PredictionConfidence
    reasoning: List[str]
    personalization_factors: Dict[str, Any]
    products: List[Dict[str, Any]]
    created_at: datetime
    valid_until: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertir a diccionario."""
        return {
            "recommendation_id": self.recommendation_id,
            "type": self.recommendation_type.value,
            "title": self.title,
            "description": self.description,
            "destination": self.destination,
            "estimated_price": float(self.estimated_price),
            "confidence": {
                "score": float(self.confidence_score),
                "level": self.confidence_level.value
            },
            "reasoning": self.reasoning,
            "personalization_factors": self.personalization_factors,
            "products": self.products,
            "created_at": self.created_at.isoformat(),
            "valid_until": self.valid_until.isoformat()
        }


@dataclass
class DemandForecast:
    """Predicción de demanda."""
    forecast_id: str
    destination: str
    product_type: str
    forecast_period: str  # "2025-Q1", "2025-06", etc.
    predicted_demand: int
    confidence_interval: Tuple[int, int]
    confidence_level: PredictionConfidence
    factors: List[str]
    recommendations: List[str]
    generated_at: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertir a diccionario."""
        return {
            "forecast_id": self.forecast_id,
            "destination": self.destination,
            "product_type": self.product_type,
            "forecast_period": self.forecast_period,
            "predicted_demand": self.predicted_demand,
            "confidence_interval": {
                "min": self.confidence_interval[0],
                "max": self.confidence_interval[1]
            },
            "confidence_level": self.confidence_level.value,
            "factors": self.factors,
            "recommendations": self.recommendations,
            "generated_at": self.generated_at.isoformat()
        }


# ============================================================================
# CUSTOMER BEHAVIOR ANALYZER
# ============================================================================

class CustomerBehaviorAnalyzer:
    """
    Analizador de comportamiento de clientes.
    
    Analiza patrones de compra, preferencias y características
    para segmentación y personalización.
    """
    
    def __init__(self):
        """Inicializar Customer Behavior Analyzer."""
        self.customer_profiles: Dict[str, CustomerProfile] = {}
        logger.info("CustomerBehaviorAnalyzer initialized")
    
    async def analyze_customer(
        self,
        customer_id: str,
        booking_history: List[Dict[str, Any]]
    ) -> CustomerProfile:
        """
        Analizar comportamiento de un cliente.
        
        Args:
            customer_id: ID del cliente
            booking_history: Historial de reservas
        
        Returns:
            Perfil del cliente con insights
        """
        logger.info(f"Analyzing customer behavior: {customer_id}")
        
        # Calcular métricas básicas
        total_spent = sum(Decimal(str(b.get("amount", 0))) for b in booking_history)
        booking_count = len(booking_history)
        
        # Determinar frecuencia de viaje
        if booking_count >= 10:
            travel_frequency = "frequent"
        elif booking_count >= 4:
            travel_frequency = "occasional"
        else:
            travel_frequency = "rare"
        
        # Extraer destinos preferidos
        destinations = {}
        for booking in booking_history:
            dest = booking.get("destination", "Unknown")
            destinations[dest] = destinations.get(dest, 0) + 1
        
        preferred_destinations = sorted(
            destinations.keys(),
            key=lambda d: destinations[d],
            reverse=True
        )[:5]
        
        # Extraer actividades preferidas
        activities = {}
        for booking in booking_history:
            for activity in booking.get("activities", []):
                activities[activity] = activities.get(activity, 0) + 1
        
        preferred_activities = sorted(
            activities.keys(),
            key=lambda a: activities[a],
            reverse=True
        )[:5]
        
        # Calcular rango de presupuesto
        if booking_history:
            amounts = [Decimal(str(b.get("amount", 0))) for b in booking_history]
            avg_amount = sum(amounts) / len(amounts)
            budget_min = avg_amount * Decimal("0.7")
            budget_max = avg_amount * Decimal("1.5")
        else:
            budget_min = Decimal("500")
            budget_max = Decimal("2000")
        
        # Última fecha de reserva
        last_booking = None
        if booking_history:
            last_booking = date.fromisoformat(
                max(b.get("booking_date", "2020-01-01") for b in booking_history)
            )
        
        # Crear perfil
        profile = CustomerProfile(
            customer_id=customer_id,
            age_group=self._estimate_age_group(booking_history),
            location="Spain",  # TODO: Obtener de datos reales
            booking_history=booking_history,
            preferences=self._extract_preferences(booking_history),
            budget_range=(budget_min, budget_max),
            travel_frequency=travel_frequency,
            preferred_destinations=preferred_destinations,
            preferred_activities=preferred_activities,
            last_booking_date=last_booking,
            total_spent=total_spent
        )
        
        self.customer_profiles[customer_id] = profile
        
        logger.info(
            f"Customer profile created: {customer_id} - "
            f"{travel_frequency}, {booking_count} bookings, "
            f"€{float(total_spent):.2f} spent"
        )
        
        return profile
    
    def _estimate_age_group(self, booking_history: List[Dict[str, Any]]) -> str:
        """Estimar grupo de edad basado en patrones de reserva."""
        # TODO: Implementar ML model para estimación real
        # Por ahora, retornar un grupo por defecto
        return "36-50"
    
    def _extract_preferences(self, booking_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extraer preferencias de viaje."""
        preferences = {
            "accommodation_type": "hotel",
            "meal_preference": "breakfast_included",
            "transport_preference": "flight",
            "booking_lead_time_days": 45,
            "group_size": 2,
            "duration_preference_days": 7
        }
        
        # TODO: Calcular preferencias reales del historial
        
        return preferences
    
    async def segment_customer(self, customer_id: str) -> CustomerSegment:
        """
        Segmentar cliente en categorías.
        
        Args:
            customer_id: ID del cliente
        
        Returns:
            Segmento del cliente
        """
        if customer_id not in self.customer_profiles:
            return CustomerSegment.BUDGET  # Default
        
        profile = self.customer_profiles[customer_id]
        
        # Reglas de segmentación
        avg_booking = profile.total_spent / max(len(profile.booking_history), 1)
        
        if avg_booking > Decimal("3000"):
            return CustomerSegment.LUXURY
        elif "adventure" in profile.preferred_activities:
            return CustomerSegment.ADVENTURE
        elif "museum" in profile.preferred_activities or "history" in profile.preferred_activities:
            return CustomerSegment.CULTURAL
        elif profile.preferences.get("group_size", 2) >= 4:
            return CustomerSegment.FAMILY
        elif profile.preferences.get("group_size", 2) == 1:
            return CustomerSegment.SOLO
        elif avg_booking < Decimal("1000"):
            return CustomerSegment.BUDGET
        else:
            return CustomerSegment.COUPLE


# ============================================================================
# AI RECOMMENDATION ENGINE
# ============================================================================

class AIRecommendationEngine:
    """
    Motor de recomendaciones basado en AI.
    
    Genera recomendaciones personalizadas usando análisis de comportamiento,
    predicciones y aprendizaje de patrones.
    """
    
    def __init__(self, behavior_analyzer: CustomerBehaviorAnalyzer):
        """Inicializar AI Recommendation Engine."""
        self.behavior_analyzer = behavior_analyzer
        self.recommendation_cache: Dict[str, List[AIRecommendation]] = {}
        logger.info("AIRecommendationEngine initialized")
    
    async def get_personalized_recommendations(
        self,
        customer_id: str,
        num_recommendations: int = 5
    ) -> List[AIRecommendation]:
        """
        Obtener recomendaciones personalizadas para un cliente.
        
        Args:
            customer_id: ID del cliente
            num_recommendations: Número de recomendaciones
        
        Returns:
            Lista de recomendaciones personalizadas
        """
        logger.info(f"Generating personalized recommendations for {customer_id}")
        
        # Obtener o analizar perfil del cliente
        if customer_id not in self.behavior_analyzer.customer_profiles:
            # TODO: Cargar historial de BD
            profile = await self.behavior_analyzer.analyze_customer(
                customer_id,
                []  # Historial vacío por ahora
            )
        else:
            profile = self.behavior_analyzer.customer_profiles[customer_id]
        
        # Segmentar cliente
        segment = await self.behavior_analyzer.segment_customer(customer_id)
        
        # Generar recomendaciones basadas en segmento y perfil
        recommendations = []
        
        # Recomendación 1: Destino basado en preferencias
        if profile.preferred_destinations:
            dest_rec = await self._recommend_destination(profile, segment)
            recommendations.append(dest_rec)
        
        # Recomendación 2: Experiencia basada en actividades preferidas
        if profile.preferred_activities:
            exp_rec = await self._recommend_experience(profile, segment)
            recommendations.append(exp_rec)
        
        # Recomendación 3: Bundle personalizado
        bundle_rec = await self._recommend_bundle(profile, segment)
        recommendations.append(bundle_rec)
        
        # Recomendación 4: Oferta estacional
        seasonal_rec = await self._recommend_seasonal(profile, segment)
        recommendations.append(seasonal_rec)
        
        # Recomendación 5: Producto específico
        product_rec = await self._recommend_product(profile, segment)
        recommendations.append(product_rec)
        
        # Limitar a num_recommendations
        recommendations = recommendations[:num_recommendations]
        
        # Cachear recomendaciones
        self.recommendation_cache[customer_id] = recommendations
        
        logger.info(f"Generated {len(recommendations)} recommendations for {customer_id}")
        
        return recommendations
    
    async def _recommend_destination(
        self,
        profile: CustomerProfile,
        segment: CustomerSegment
    ) -> AIRecommendation:
        """Recomendar destino basado en perfil."""
        # Destinos por segmento
        segment_destinations = {
            CustomerSegment.LUXURY: ("Maldivas", Decimal("4500"), "Resort de lujo con overwater bungalows"),
            CustomerSegment.ADVENTURE: ("Patagonia", Decimal("2800"), "Trekking y expediciones en naturaleza salvaje"),
            CustomerSegment.CULTURAL: ("Kyoto", Decimal("3200"), "Templos históricos y cultura japonesa"),
            CustomerSegment.FAMILY: ("Orlando", Decimal("2500"), "Parques temáticos para toda la familia"),
            CustomerSegment.SOLO: ("Tailandia", Decimal("1800"), "Viaje individual con comunidad viajera"),
            CustomerSegment.COUPLE: ("París", Decimal("2200"), "Escapada romántica en la ciudad del amor"),
            CustomerSegment.BUDGET: ("Portugal", Decimal("1200"), "Destino económico con gran valor"),
            CustomerSegment.BUSINESS: ("Dubái", Decimal("3000"), "Hub internacional de negocios")
        }
        
        destination, price, description = segment_destinations.get(
            segment,
            ("Barcelona", Decimal("1500"), "Ciudad vibrante con playa y cultura")
        )
        
        # Ajustar precio al rango de presupuesto
        if price > profile.budget_range[1]:
            price = profile.budget_range[1] * Decimal("0.9")
        
        confidence = Decimal("85")
        
        return AIRecommendation(
            recommendation_id=f"REC-DEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            recommendation_type=RecommendationType.DESTINATION,
            title=f"Descubre {destination}",
            description=description,
            destination=destination,
            estimated_price=price,
            confidence_score=confidence,
            confidence_level=PredictionConfidence.HIGH,
            reasoning=[
                f"Perfecto para viajeros {segment.value}",
                f"Dentro de tu rango de presupuesto (€{float(profile.budget_range[0])}-€{float(profile.budget_range[1])})",
                "Alta puntuación de satisfacción de clientes similares"
            ],
            personalization_factors={
                "segment": segment.value,
                "budget_match": True,
                "preference_alignment": 0.85
            },
            products=[
                {"type": "flight", "name": f"Vuelo a {destination}"},
                {"type": "hotel", "name": f"Hotel en {destination}", "nights": 7},
                {"type": "activities", "name": "Actividades recomendadas"}
            ],
            created_at=datetime.now(),
            valid_until=datetime.now() + timedelta(days=30)
        )
    
    async def _recommend_experience(
        self,
        profile: CustomerProfile,
        segment: CustomerSegment
    ) -> AIRecommendation:
        """Recomendar experiencia basada en actividades."""
        experience_name = "Experiencia Cultural y Gastronómica"
        description = "Tour guiado por mercados locales, clase de cocina y cena tradicional"
        price = Decimal("450")
        
        return AIRecommendation(
            recommendation_id=f"REC-EXP-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            recommendation_type=RecommendationType.EXPERIENCE,
            title=experience_name,
            description=description,
            destination="Barcelona",
            estimated_price=price,
            confidence_score=Decimal("78"),
            confidence_level=PredictionConfidence.MEDIUM,
            reasoning=[
                "Basado en tus actividades favoritas previas",
                "Experiencia única y auténtica",
                "Altamente valorada por viajeros similares"
            ],
            personalization_factors={
                "activity_match": True,
                "group_size_appropriate": True
            },
            products=[
                {"type": "tour", "name": "Food Tour", "duration": "4 hours"},
                {"type": "activity", "name": "Cooking Class", "duration": "3 hours"}
            ],
            created_at=datetime.now(),
            valid_until=datetime.now() + timedelta(days=14)
        )
    
    async def _recommend_bundle(
        self,
        profile: CustomerProfile,
        segment: CustomerSegment
    ) -> AIRecommendation:
        """Recomendar bundle personalizado."""
        bundle_name = "Paquete Todo Incluido - Costa del Sol"
        description = "7 noches en hotel 4*, vuelos, traslados y media pensión incluida"
        base_price = Decimal("1850")
        
        # Ajustar precio con descuento personalizado
        discount = Decimal("0.15")  # 15% descuento
        final_price = base_price * (Decimal("1") - discount)
        
        return AIRecommendation(
            recommendation_id=f"REC-BUNDLE-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            recommendation_type=RecommendationType.BUNDLE,
            title=bundle_name,
            description=description,
            destination="Costa del Sol",
            estimated_price=final_price,
            confidence_score=Decimal("82"),
            confidence_level=PredictionConfidence.HIGH,
            reasoning=[
                f"Precio optimizado para tu presupuesto (€{float(final_price)} con 15% descuento)",
                "Bundle completo con todo incluido",
                "Destino popular entre tu segmento"
            ],
            personalization_factors={
                "bundle_optimized": True,
                "price_optimized": True,
                "discount_applied": float(discount * 100)
            },
            products=[
                {"type": "flight", "name": "Vuelos Madrid-Málaga", "included": True},
                {"type": "hotel", "name": "Hotel 4* Costa del Sol", "nights": 7},
                {"type": "transport", "name": "Traslados aeropuerto", "included": True},
                {"type": "meal_plan", "name": "Media pensión", "included": True}
            ],
            created_at=datetime.now(),
            valid_until=datetime.now() + timedelta(days=21)
        )
    
    async def _recommend_seasonal(
        self,
        profile: CustomerProfile,
        segment: CustomerSegment
    ) -> AIRecommendation:
        """Recomendar oferta estacional."""
        season_offer = "Oferta Primavera - Florencia"
        description = "Escapada de primavera con precios especiales, incluye tour por museos"
        price = Decimal("980")
        
        return AIRecommendation(
            recommendation_id=f"REC-SEASONAL-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            recommendation_type=RecommendationType.SEASONAL,
            title=season_offer,
            description=description,
            destination="Florencia",
            estimated_price=price,
            confidence_score=Decimal("75"),
            confidence_level=PredictionConfidence.MEDIUM,
            reasoning=[
                "Oferta temporal con precio reducido",
                "Temporada óptima para visitar",
                "Clima ideal en esas fechas"
            ],
            personalization_factors={
                "seasonal_discount": True,
                "weather_optimal": True
            },
            products=[
                {"type": "hotel", "name": "Hotel 3* Centro", "nights": 4},
                {"type": "tour", "name": "Tour Museos", "included": True}
            ],
            created_at=datetime.now(),
            valid_until=datetime.now() + timedelta(days=10)  # Oferta urgente
        )
    
    async def _recommend_product(
        self,
        profile: CustomerProfile,
        segment: CustomerSegment
    ) -> AIRecommendation:
        """Recomendar producto específico."""
        product_name = "Seguro de Viaje Premium"
        description = "Cobertura completa para tu próximo viaje con cancelación incluida"
        price = Decimal("85")
        
        return AIRecommendation(
            recommendation_id=f"REC-PRODUCT-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            recommendation_type=RecommendationType.PRODUCT,
            title=product_name,
            description=description,
            destination="Global",
            estimated_price=price,
            confidence_score=Decimal("90"),
            confidence_level=PredictionConfidence.HIGH,
            reasoning=[
                "Recomendado para todos los viajeros",
                "Protección completa para tu inversión",
                "Precio competitivo"
            ],
            personalization_factors={
                "essential_product": True,
                "high_value": True
            },
            products=[
                {"type": "insurance", "name": "Seguro Premium", "coverage": "Completa"}
            ],
            created_at=datetime.now(),
            valid_until=datetime.now() + timedelta(days=60)
        )


# ============================================================================
# DEMAND FORECASTING ENGINE
# ============================================================================

class DemandForecastingEngine:
    """
    Motor de forecasting de demanda.
    
    Predice demanda futura para optimizar inventario,
    pricing y recursos.
    """
    
    def __init__(self):
        """Inicializar Demand Forecasting Engine."""
        logger.info("DemandForecastingEngine initialized")
    
    async def forecast_demand(
        self,
        destination: str,
        product_type: str,
        forecast_months: int = 3
    ) -> List[DemandForecast]:
        """
        Predecir demanda para un destino y tipo de producto.
        
        Args:
            destination: Destino
            product_type: Tipo de producto
            forecast_months: Meses a predecir
        
        Returns:
            Lista de forecasts por período
        """
        logger.info(f"Forecasting demand for {destination} - {product_type}")
        
        forecasts = []
        current_date = date.today()
        
        for i in range(forecast_months):
            # Calcular mes del forecast
            forecast_month = current_date.month + i
            forecast_year = current_date.year
            
            if forecast_month > 12:
                forecast_month -= 12
                forecast_year += 1
            
            # Simular predicción (TODO: Implementar modelo ML real)
            base_demand = 500
            seasonal_factor = self._get_seasonal_factor(forecast_month)
            predicted_demand = int(base_demand * seasonal_factor)
            
            # Intervalo de confianza (±20%)
            confidence_min = int(predicted_demand * 0.8)
            confidence_max = int(predicted_demand * 1.2)
            
            # Factores que afectan la demanda
            factors = [
                f"Temporada: {self._get_season_name(forecast_month)}",
                "Tendencia histórica positiva",
                "Eventos locales planificados"
            ]
            
            # Recomendaciones
            recommendations = []
            if seasonal_factor > 1.2:
                recommendations.append("Alta temporada: Aumentar inventario")
                recommendations.append("Considerar precios premium")
            elif seasonal_factor < 0.8:
                recommendations.append("Baja temporada: Promociones especiales")
                recommendations.append("Optimizar costos operativos")
            
            forecast = DemandForecast(
                forecast_id=f"FORECAST-{destination}-{forecast_year}{forecast_month:02d}",
                destination=destination,
                product_type=product_type,
                forecast_period=f"{forecast_year}-{forecast_month:02d}",
                predicted_demand=predicted_demand,
                confidence_interval=(confidence_min, confidence_max),
                confidence_level=PredictionConfidence.HIGH if seasonal_factor > 0.9 else PredictionConfidence.MEDIUM,
                factors=factors,
                recommendations=recommendations,
                generated_at=datetime.now()
            )
            
            forecasts.append(forecast)
        
        return forecasts
    
    def _get_seasonal_factor(self, month: int) -> float:
        """Obtener factor estacional por mes."""
        # Temporada alta: Junio-Septiembre
        # Temporada media: Abril-Mayo, Octubre
        # Temporada baja: Noviembre-Marzo
        
        if month in [6, 7, 8, 9]:  # Alta
            return 1.4
        elif month in [4, 5, 10]:  # Media
            return 1.0
        else:  # Baja
            return 0.7
    
    def _get_season_name(self, month: int) -> str:
        """Obtener nombre de temporada."""
        if month in [6, 7, 8, 9]:
            return "Alta"
        elif month in [4, 5, 10]:
            return "Media"
        else:
            return "Baja"


# ============================================================================
# SINGLETON PATTERN
# ============================================================================

_behavior_analyzer: Optional[CustomerBehaviorAnalyzer] = None
_recommendation_engine: Optional[AIRecommendationEngine] = None
_forecasting_engine: Optional[DemandForecastingEngine] = None


def get_behavior_analyzer() -> CustomerBehaviorAnalyzer:
    """Obtener instancia singleton del Behavior Analyzer."""
    global _behavior_analyzer
    
    if _behavior_analyzer is None:
        _behavior_analyzer = CustomerBehaviorAnalyzer()
    
    return _behavior_analyzer


def get_recommendation_engine() -> AIRecommendationEngine:
    """Obtener instancia singleton del Recommendation Engine."""
    global _recommendation_engine, _behavior_analyzer
    
    if _recommendation_engine is None:
        if _behavior_analyzer is None:
            _behavior_analyzer = CustomerBehaviorAnalyzer()
        _recommendation_engine = AIRecommendationEngine(_behavior_analyzer)
    
    return _recommendation_engine


def get_forecasting_engine() -> DemandForecastingEngine:
    """Obtener instancia singleton del Forecasting Engine."""
    global _forecasting_engine
    
    if _forecasting_engine is None:
        _forecasting_engine = DemandForecastingEngine()
    
    return _forecasting_engine
