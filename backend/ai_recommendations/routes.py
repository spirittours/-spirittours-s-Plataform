"""
AI-powered Recommendations API Routes (Phase 4)

Endpoints para sistema de recomendaciones con inteligencia artificial:
- Recomendaciones personalizadas
- Análisis de comportamiento
- Segmentación de clientes
- Forecasting de demanda

Autor: Spirit Tours AI Team
Fecha: 2025-10-18
"""

from fastapi import APIRouter, Query, HTTPException, Body
from datetime import date
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from .ml_engine import (
    get_behavior_analyzer,
    get_recommendation_engine,
    get_forecasting_engine,
    CustomerBehaviorAnalyzer,
    AIRecommendationEngine,
    DemandForecastingEngine,
    CustomerSegment,
    RecommendationType
)

router = APIRouter(prefix="/ai", tags=["ai-recommendations"])


# ============================================================================
# REQUEST MODELS
# ============================================================================

class BookingHistoryRequest(BaseModel):
    """Modelo de request para historial de reservas."""
    customer_id: str
    bookings: List[Dict[str, Any]]


# ============================================================================
# CUSTOMER BEHAVIOR & SEGMENTATION
# ============================================================================

@router.post("/customers/{customer_id}/analyze")
async def analyze_customer_behavior(
    customer_id: str,
    booking_history: List[Dict[str, Any]] = Body(
        ...,
        description="Historial de reservas del cliente"
    )
):
    """
    Analizar comportamiento de un cliente.
    
    Genera perfil detallado con insights sobre:
    - Frecuencia de viaje
    - Presupuesto promedio
    - Destinos preferidos
    - Actividades favoritas
    - Patrones de reserva
    
    Returns:
        Perfil completo del cliente
    """
    analyzer = get_behavior_analyzer()
    
    profile = await analyzer.analyze_customer(customer_id, booking_history)
    
    return {
        "success": True,
        "profile": profile.to_dict()
    }


@router.get("/customers/{customer_id}/segment")
async def get_customer_segment(customer_id: str):
    """
    Obtener segmento del cliente.
    
    Segmentos disponibles:
    - luxury: Clientes de lujo
    - budget: Viajeros económicos
    - family: Familias
    - solo: Viajeros individuales
    - couple: Parejas
    - adventure: Aventureros
    - cultural: Interesados en cultura
    - business: Viajeros de negocios
    
    Returns:
        Segmento del cliente con características
    """
    analyzer = get_behavior_analyzer()
    
    segment = await analyzer.segment_customer(customer_id)
    
    segment_descriptions = {
        CustomerSegment.LUXURY: {
            "description": "Cliente de alto valor que busca experiencias premium",
            "characteristics": ["Budget alto", "Preferencia por 5 estrellas", "Servicios exclusivos"]
        },
        CustomerSegment.BUDGET: {
            "description": "Viajero consciente del precio que busca valor",
            "characteristics": ["Budget moderado", "Busca ofertas", "Flexible con fechas"]
        },
        CustomerSegment.FAMILY: {
            "description": "Viaja en familia con niños",
            "characteristics": ["Grupos grandes", "Actividades familiares", "Alojamiento espacioso"]
        },
        CustomerSegment.SOLO: {
            "description": "Viajero individual en busca de experiencias",
            "characteristics": ["Viaja solo", "Flexible", "Social"]
        },
        CustomerSegment.COUPLE: {
            "description": "Parejas en escapadas románticas",
            "characteristics": ["Grupos de 2", "Experiencias románticas", "Privacidad"]
        },
        CustomerSegment.ADVENTURE: {
            "description": "Busca emociones y aventura",
            "characteristics": ["Actividades físicas", "Naturaleza", "Deportes extremos"]
        },
        CustomerSegment.CULTURAL: {
            "description": "Interesado en historia y cultura",
            "characteristics": ["Museos", "Tours históricos", "Gastronomía local"]
        },
        CustomerSegment.BUSINESS: {
            "description": "Viajero de negocios frecuente",
            "characteristics": ["Viajes frecuentes", "Hoteles céntricos", "Flexibilidad"]
        }
    }
    
    return {
        "customer_id": customer_id,
        "segment": segment.value,
        "details": segment_descriptions.get(segment, {})
    }


# ============================================================================
# PERSONALIZED RECOMMENDATIONS
# ============================================================================

@router.get("/recommendations/{customer_id}")
async def get_personalized_recommendations(
    customer_id: str,
    num_recommendations: int = Query(5, ge=1, le=10, description="Número de recomendaciones")
):
    """
    Obtener recomendaciones personalizadas con AI.
    
    El sistema analiza el perfil del cliente y genera recomendaciones
    optimizadas usando machine learning y análisis de comportamiento.
    
    Tipos de recomendaciones:
    - Destinos personalizados
    - Experiencias únicas
    - Bundles optimizados
    - Ofertas estacionales
    - Productos complementarios
    
    Returns:
        Lista de recomendaciones con scores de confianza
    """
    engine = get_recommendation_engine()
    
    recommendations = await engine.get_personalized_recommendations(
        customer_id,
        num_recommendations
    )
    
    return {
        "customer_id": customer_id,
        "recommendations_count": len(recommendations),
        "recommendations": [rec.to_dict() for rec in recommendations],
        "generated_at": recommendations[0].created_at.isoformat() if recommendations else None
    }


@router.get("/recommendations/{customer_id}/by-type")
async def get_recommendations_by_type(
    customer_id: str,
    recommendation_type: str = Query(
        ...,
        description="Tipo: destination, product, bundle, experience, seasonal"
    )
):
    """
    Obtener recomendaciones de un tipo específico.
    
    Filtra recomendaciones por tipo para mostrar solo
    las más relevantes en cada categoría.
    """
    engine = get_recommendation_engine()
    
    try:
        # Validar tipo
        rec_type = RecommendationType(recommendation_type)
        
        # Obtener todas las recomendaciones
        all_recommendations = await engine.get_personalized_recommendations(
            customer_id,
            10  # Obtener más para filtrar
        )
        
        # Filtrar por tipo
        filtered = [rec for rec in all_recommendations if rec.recommendation_type == rec_type]
        
        return {
            "customer_id": customer_id,
            "recommendation_type": recommendation_type,
            "recommendations_count": len(filtered),
            "recommendations": [rec.to_dict() for rec in filtered]
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid recommendation type: {str(e)}")


# ============================================================================
# DEMAND FORECASTING
# ============================================================================

@router.get("/forecast/demand")
async def forecast_demand(
    destination: str = Query(..., description="Destino a predecir"),
    product_type: str = Query(..., description="Tipo de producto"),
    forecast_months: int = Query(3, ge=1, le=12, description="Meses a predecir")
):
    """
    Predecir demanda futura para un destino y producto.
    
    Usa modelos de machine learning para predecir:
    - Volumen de demanda esperado
    - Intervalos de confianza
    - Factores que afectan la demanda
    - Recomendaciones de acción
    
    Útil para:
    - Planificación de inventario
    - Optimización de precios
    - Gestión de recursos
    - Estrategia comercial
    
    Returns:
        Forecasts mensuales con recomendaciones
    """
    engine = get_forecasting_engine()
    
    forecasts = await engine.forecast_demand(
        destination,
        product_type,
        forecast_months
    )
    
    return {
        "destination": destination,
        "product_type": product_type,
        "forecast_periods": len(forecasts),
        "forecasts": [forecast.to_dict() for forecast in forecasts],
        "summary": {
            "total_predicted_demand": sum(f.predicted_demand for f in forecasts),
            "avg_monthly_demand": sum(f.predicted_demand for f in forecasts) // len(forecasts),
            "peak_month": max(forecasts, key=lambda f: f.predicted_demand).forecast_period,
            "low_month": min(forecasts, key=lambda f: f.predicted_demand).forecast_period
        }
    }


@router.get("/forecast/seasonal-trends")
async def get_seasonal_trends(
    destination: str = Query(..., description="Destino")
):
    """
    Analizar tendencias estacionales para un destino.
    
    Identifica patrones estacionales y recomienda mejores
    períodos para promociones y ajustes de precio.
    """
    engine = get_forecasting_engine()
    
    # Obtener forecast para 12 meses
    forecasts = await engine.forecast_demand(destination, "package", 12)
    
    # Analizar tendencias
    high_season_months = []
    low_season_months = []
    
    for forecast in forecasts:
        if forecast.predicted_demand > 550:
            high_season_months.append(forecast.forecast_period)
        elif forecast.predicted_demand < 400:
            low_season_months.append(forecast.forecast_period)
    
    return {
        "destination": destination,
        "analysis_period": "12 months",
        "seasonal_trends": {
            "high_season": {
                "months": high_season_months,
                "recommendation": "Maximizar precios y asegurar inventario"
            },
            "low_season": {
                "months": low_season_months,
                "recommendation": "Promociones especiales y descuentos"
            }
        },
        "forecasts": [f.to_dict() for f in forecasts]
    }


# ============================================================================
# ANALYTICS & INSIGHTS
# ============================================================================

@router.get("/analytics/recommendation-performance")
async def get_recommendation_performance():
    """
    Obtener métricas de rendimiento de recomendaciones.
    
    TODO: Implementar con datos reales de base de datos.
    """
    return {
        "metrics": {
            "recommendations_generated": 15000,
            "recommendations_clicked": 6750,
            "click_through_rate": 45.0,
            "recommendations_converted": 2250,
            "conversion_rate": 15.0,
            "avg_order_value_with_recommendation": 1850.00,
            "avg_order_value_without_recommendation": 1200.00,
            "uplift": 54.17
        },
        "top_performing_types": [
            {"type": "bundle", "conversion_rate": 22.5},
            {"type": "destination", "conversion_rate": 18.3},
            {"type": "experience", "conversion_rate": 14.8}
        ]
    }


@router.get("/analytics/customer-segments")
async def get_customer_segment_distribution():
    """
    Obtener distribución de segmentos de clientes.
    
    TODO: Implementar con datos reales de base de datos.
    """
    return {
        "total_customers": 5000,
        "segments": {
            "luxury": {"count": 500, "percentage": 10.0, "avg_value": 4500.00},
            "couple": {"count": 1500, "percentage": 30.0, "avg_value": 2200.00},
            "family": {"count": 1000, "percentage": 20.0, "avg_value": 2800.00},
            "adventure": {"count": 750, "percentage": 15.0, "avg_value": 2000.00},
            "cultural": {"count": 500, "percentage": 10.0, "avg_value": 1800.00},
            "budget": {"count": 500, "percentage": 10.0, "avg_value": 1100.00},
            "solo": {"count": 200, "percentage": 4.0, "avg_value": 1500.00},
            "business": {"count": 50, "percentage": 1.0, "avg_value": 2500.00}
        }
    }


# ============================================================================
# MODEL TRAINING (FUTURE)
# ============================================================================

@router.post("/models/retrain")
async def trigger_model_retraining():
    """
    Disparar re-entrenamiento de modelos ML.
    
    En producción, esto actualizaría los modelos con
    datos más recientes para mejorar predicciones.
    
    TODO: Implementar pipeline de ML real.
    """
    return {
        "status": "accepted",
        "message": "Model retraining job queued",
        "estimated_completion": "2-4 hours",
        "note": "This is a placeholder. Real ML pipeline needs to be implemented."
    }


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def health_check():
    """Health check para el servicio de AI."""
    behavior_analyzer = get_behavior_analyzer()
    recommendation_engine = get_recommendation_engine()
    forecasting_engine = get_forecasting_engine()
    
    return {
        "status": "healthy",
        "service": "ai-recommendations",
        "components": {
            "behavior_analyzer": behavior_analyzer is not None,
            "recommendation_engine": recommendation_engine is not None,
            "forecasting_engine": forecasting_engine is not None,
            "customer_profiles_loaded": len(behavior_analyzer.customer_profiles)
        }
    }
