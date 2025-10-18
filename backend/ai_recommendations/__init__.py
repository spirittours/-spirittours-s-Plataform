"""
AI-powered Recommendations Module - Phase 4

Sistema de inteligencia artificial para recomendaciones personalizadas.

Autor: Spirit Tours AI Team
Fecha: 2025-10-18
"""

from .ml_engine import (
    CustomerBehaviorAnalyzer,
    AIRecommendationEngine,
    DemandForecastingEngine,
    CustomerProfile,
    AIRecommendation,
    DemandForecast,
    RecommendationType,
    CustomerSegment,
    PredictionConfidence,
    get_behavior_analyzer,
    get_recommendation_engine,
    get_forecasting_engine
)

__all__ = [
    # Engines
    "CustomerBehaviorAnalyzer",
    "AIRecommendationEngine",
    "DemandForecastingEngine",
    "get_behavior_analyzer",
    "get_recommendation_engine",
    "get_forecasting_engine",
    
    # Data Classes
    "CustomerProfile",
    "AIRecommendation",
    "DemandForecast",
    
    # Enums
    "RecommendationType",
    "CustomerSegment",
    "PredictionConfidence",
]
