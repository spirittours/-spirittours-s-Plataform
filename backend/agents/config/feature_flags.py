"""
Feature Flags - Enable/disable agent features
=============================================

This module provides feature flag management for controlling
agent features and capabilities.

Author: Spirit Tours Development Team
Date: 2025-11-02
"""

import os
from enum import Enum
from typing import Dict
import logging

logger = logging.getLogger(__name__)


class FeatureFlags(str, Enum):
    """
    Feature flags for agent system.
    
    Features can be enabled/disabled via environment variables:
    AGENT_FEATURE_{FLAG_NAME}=true|false
    """
    
    # Core features
    ENABLE_AGENT_COMMUNICATION = "enable_agent_communication"
    ENABLE_TASK_QUEUING = "enable_task_queuing"
    ENABLE_HEALTH_MONITORING = "enable_health_monitoring"
    
    # Tourism agents
    ENABLE_ITINERARY_PLANNING = "enable_itinerary_planning"
    ENABLE_WEATHER_FORECASTING = "enable_weather_forecasting"
    ENABLE_CULTURAL_GUIDANCE = "enable_cultural_guidance"
    ENABLE_ACCESSIBILITY_ADVISOR = "enable_accessibility_advisor"
    ENABLE_SUSTAINABILITY_GUIDE = "enable_sustainability_guide"
    ENABLE_EMERGENCY_ASSISTANT = "enable_emergency_assistant"
    
    # Operations agents
    ENABLE_RESERVATION_MANAGER = "enable_reservation_manager"
    ENABLE_DRIVER_COORDINATOR = "enable_driver_coordinator"
    ENABLE_GUIDE_SCHEDULER = "enable_guide_scheduler"
    ENABLE_INVENTORY_MANAGER = "enable_inventory_manager"
    ENABLE_CUSTOMER_SUPPORT = "enable_customer_support"
    ENABLE_FEEDBACK_ANALYZER = "enable_feedback_analyzer"
    ENABLE_CRISIS_MANAGER = "enable_crisis_manager"
    
    # Analytics agents
    ENABLE_REVENUE_ANALYST = "enable_revenue_analyst"
    ENABLE_DEMAND_FORECASTER = "enable_demand_forecaster"
    ENABLE_PRICING_OPTIMIZER = "enable_pricing_optimizer"
    ENABLE_CUSTOMER_SEGMENTATION = "enable_customer_segmentation"
    ENABLE_COMPETITIVE_ANALYST = "enable_competitive_analyst"
    ENABLE_PERFORMANCE_MONITOR = "enable_performance_monitor"
    ENABLE_CHURN_PREDICTOR = "enable_churn_predictor"
    
    # Marketing agents
    ENABLE_CONTENT_GENERATOR = "enable_content_generator"
    ENABLE_SOCIAL_MEDIA_MANAGER = "enable_social_media_manager"
    ENABLE_EMAIL_CAMPAIGNER = "enable_email_campaigner"
    ENABLE_SEO_OPTIMIZER = "enable_seo_optimizer"
    ENABLE_REVIEW_RESPONDER = "enable_review_responder"
    
    # Advanced features
    ENABLE_ML_PREDICTIONS = "enable_ml_predictions"
    ENABLE_REAL_TIME_PROCESSING = "enable_real_time_processing"
    ENABLE_AUTO_SCALING = "enable_auto_scaling"
    ENABLE_DISTRIBUTED_PROCESSING = "enable_distributed_processing"


# Default feature flag values
DEFAULT_FLAGS: Dict[FeatureFlags, bool] = {
    # Core features (enabled by default)
    FeatureFlags.ENABLE_AGENT_COMMUNICATION: True,
    FeatureFlags.ENABLE_TASK_QUEUING: True,
    FeatureFlags.ENABLE_HEALTH_MONITORING: True,
    
    # Tourism agents (enabled by default)
    FeatureFlags.ENABLE_ITINERARY_PLANNING: True,
    FeatureFlags.ENABLE_WEATHER_FORECASTING: True,
    FeatureFlags.ENABLE_CULTURAL_GUIDANCE: True,
    FeatureFlags.ENABLE_ACCESSIBILITY_ADVISOR: True,
    FeatureFlags.ENABLE_SUSTAINABILITY_GUIDE: True,
    FeatureFlags.ENABLE_EMERGENCY_ASSISTANT: True,
    
    # Operations agents (enabled by default)
    FeatureFlags.ENABLE_RESERVATION_MANAGER: True,
    FeatureFlags.ENABLE_DRIVER_COORDINATOR: True,
    FeatureFlags.ENABLE_GUIDE_SCHEDULER: True,
    FeatureFlags.ENABLE_INVENTORY_MANAGER: True,
    FeatureFlags.ENABLE_CUSTOMER_SUPPORT: True,
    FeatureFlags.ENABLE_FEEDBACK_ANALYZER: True,
    FeatureFlags.ENABLE_CRISIS_MANAGER: True,
    
    # Analytics agents (enabled by default)
    FeatureFlags.ENABLE_REVENUE_ANALYST: True,
    FeatureFlags.ENABLE_DEMAND_FORECASTER: True,
    FeatureFlags.ENABLE_PRICING_OPTIMIZER: True,
    FeatureFlags.ENABLE_CUSTOMER_SEGMENTATION: True,
    FeatureFlags.ENABLE_COMPETITIVE_ANALYST: True,
    FeatureFlags.ENABLE_PERFORMANCE_MONITOR: True,
    FeatureFlags.ENABLE_CHURN_PREDICTOR: True,
    
    # Marketing agents (enabled by default)
    FeatureFlags.ENABLE_CONTENT_GENERATOR: True,
    FeatureFlags.ENABLE_SOCIAL_MEDIA_MANAGER: True,
    FeatureFlags.ENABLE_EMAIL_CAMPAIGNER: True,
    FeatureFlags.ENABLE_SEO_OPTIMIZER: True,
    FeatureFlags.ENABLE_REVIEW_RESPONDER: True,
    
    # Advanced features (disabled by default)
    FeatureFlags.ENABLE_ML_PREDICTIONS: False,
    FeatureFlags.ENABLE_REAL_TIME_PROCESSING: False,
    FeatureFlags.ENABLE_AUTO_SCALING: False,
    FeatureFlags.ENABLE_DISTRIBUTED_PROCESSING: False,
}


def is_feature_enabled(flag: FeatureFlags) -> bool:
    """
    Check if a feature flag is enabled.
    
    Checks environment variable first, then falls back to default value.
    Environment variable format: AGENT_FEATURE_{FLAG_NAME}=true|false
    
    Args:
        flag: Feature flag to check
        
    Returns:
        True if feature is enabled
    """
    env_key = f"AGENT_FEATURE_{flag.value.upper()}"
    
    # Check environment variable
    if env_key in os.environ:
        env_value = os.environ[env_key].lower()
        return env_value in ['true', '1', 'yes', 'on']
    
    # Fall back to default
    return DEFAULT_FLAGS.get(flag, False)


def get_enabled_features() -> Dict[str, bool]:
    """
    Get all feature flags and their current values.
    
    Returns:
        Dictionary mapping feature names to their enabled status
    """
    return {
        flag.value: is_feature_enabled(flag)
        for flag in FeatureFlags
    }


def log_feature_status() -> None:
    """Log the status of all feature flags."""
    logger.info("Feature Flags Status:")
    for flag in FeatureFlags:
        status = "ENABLED" if is_feature_enabled(flag) else "DISABLED"
        logger.info(f"  {flag.value}: {status}")
