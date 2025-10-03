"""
Intelligent Call Routing System with Predictive AI for Spirit Tours CRM
Advanced agent assignment and call routing with machine learning optimization
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, mean_squared_error
import scipy.stats as stats
from sqlalchemy import Column, String, DateTime, Text, JSON, Boolean, Integer, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from pydantic import BaseModel, EmailStr, validator
import redis.asyncio as redis
from celery import Celery
import uuid
from collections import defaultdict, Counter
import warnings
warnings.filterwarnings('ignore')

Base = declarative_base()

# Enums
class AgentStatus(Enum):
    AVAILABLE = "available"
    BUSY = "busy"
    ON_CALL = "on_call"
    BREAK = "break"
    OFFLINE = "offline"
    TRAINING = "training"

class AgentSkillLevel(Enum):
    NOVICE = "novice"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"
    MASTER = "master"

class CallType(Enum):
    INBOUND_SALES = "inbound_sales"
    OUTBOUND_SALES = "outbound_sales"
    CUSTOMER_SUPPORT = "customer_support"
    FOLLOW_UP = "follow_up"
    COMPLAINT = "complaint"
    BOOKING_INQUIRY = "booking_inquiry"
    CANCELLATION = "cancellation"
    TECHNICAL_SUPPORT = "technical_support"

class CallPriority(Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"
    EMERGENCY = "emergency"

class CallOutcome(Enum):
    SUCCESSFUL_CONVERSION = "successful_conversion"
    QUALIFIED_LEAD = "qualified_lead"
    INFORMATION_PROVIDED = "information_provided"
    SCHEDULED_CALLBACK = "scheduled_callback"
    TRANSFERRED = "transferred"
    NO_ANSWER = "no_answer"
    CUSTOMER_NOT_INTERESTED = "customer_not_interested"
    COMPLAINT_RESOLVED = "complaint_resolved"
    ESCALATED = "escalated"

class RoutingStrategy(Enum):
    ROUND_ROBIN = "round_robin"
    SKILL_BASED = "skill_based"
    PERFORMANCE_BASED = "performance_based"
    AI_OPTIMIZED = "ai_optimized"
    CUSTOMER_PREFERENCE = "customer_preference"
    HYBRID = "hybrid"

class CustomerTier(Enum):
    VIP = "vip"
    PREMIUM = "premium"
    STANDARD = "standard"
    NEW = "new"
    PROSPECT = "prospect"

# Database Models
class Agent(Base):
    __tablename__ = "agents"
    
    id = Column(String, primary_key=True)
    employee_id = Column(String, unique=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone = Column(String)
    
    # Status and availability
    current_status = Column(String, default="offline")  # AgentStatus enum
    last_status_change = Column(DateTime, default=datetime.utcnow)
    max_concurrent_calls = Column(Integer, default=1)
    current_call_count = Column(Integer, default=0)
    
    # Skills and specializations
    primary_language = Column(String, default="Spanish")
    secondary_languages = Column(JSON)  # List of additional languages
    specializations = Column(JSON)  # List of tour types/specialties
    skill_level = Column(String, default="intermediate")  # AgentSkillLevel enum
    
    # Performance metrics
    total_calls_handled = Column(Integer, default=0)
    avg_call_duration_minutes = Column(Float, default=0.0)
    conversion_rate = Column(Float, default=0.0)
    customer_satisfaction_score = Column(Float, default=0.0)
    avg_response_time_seconds = Column(Integer, default=30)
    
    # Availability schedule
    work_schedule = Column(JSON)  # Weekly schedule with time zones
    timezone = Column(String, default="America/Lima")
    break_schedule = Column(JSON)  # Break times
    
    # AI performance scores
    ai_performance_score = Column(Float, default=0.5)
    customer_match_score = Column(Float, default=0.5)
    upsell_success_rate = Column(Float, default=0.0)
    problem_resolution_rate = Column(Float, default=0.0)
    
    # Contact preferences
    preferred_call_types = Column(JSON)  # CallType preferences
    max_daily_calls = Column(Integer, default=50)
    calls_today = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    call_assignments = relationship("CallRoutingAssignment", back_populates="agent")
    performance_metrics = relationship("AgentPerformanceMetric", back_populates="agent")

class CallRoutingRequest(Base):
    __tablename__ = "call_routing_requests"
    
    id = Column(String, primary_key=True)
    
    # Call information
    call_type = Column(String, nullable=False)  # CallType enum
    priority = Column(String, default="normal")  # CallPriority enum
    customer_id = Column(String)
    lead_id = Column(String)
    
    # Customer information
    customer_name = Column(String)
    customer_email = Column(String)
    customer_phone = Column(String)
    customer_language = Column(String, default="Spanish")
    customer_tier = Column(String, default="standard")  # CustomerTier enum
    
    # Context and requirements
    call_context = Column(JSON)  # Call context and history
    required_skills = Column(JSON)  # Required agent skills
    preferred_agent_id = Column(String)  # Customer's preferred agent
    
    # Routing configuration
    routing_strategy = Column(String, default="ai_optimized")  # RoutingStrategy enum
    max_wait_time_minutes = Column(Integer, default=10)
    allow_voicemail = Column(Boolean, default=True)
    
    # AI predictions
    predicted_call_duration = Column(Integer)  # Seconds
    predicted_conversion_probability = Column(Float)
    predicted_satisfaction_score = Column(Float)
    optimal_agent_scores = Column(JSON)  # Agent ID -> prediction score
    
    # Status tracking
    status = Column(String, default="pending")  # pending, routed, completed, failed
    requested_at = Column(DateTime, default=datetime.utcnow)
    routed_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Results
    assigned_agent_id = Column(String)
    routing_reason = Column(Text)
    ai_confidence_score = Column(Float)

class CallRoutingAssignment(Base):
    __tablename__ = "call_routing_assignments"
    
    id = Column(String, primary_key=True)
    request_id = Column(String, ForeignKey("call_routing_requests.id"))
    agent_id = Column(String, ForeignKey("agents.id"))
    
    # Assignment details
    assignment_reason = Column(Text)
    ai_match_score = Column(Float)
    expected_outcome = Column(String)
    
    # Call execution
    call_started_at = Column(DateTime)
    call_ended_at = Column(DateTime)
    actual_duration_seconds = Column(Integer)
    
    # Results
    outcome = Column(String)  # CallOutcome enum
    conversion_achieved = Column(Boolean, default=False)
    customer_satisfaction = Column(Integer)  # 1-5 scale
    revenue_generated = Column(Float, default=0.0)
    
    # Performance tracking
    agent_performance_rating = Column(Float)  # How well the agent performed
    routing_accuracy = Column(Float)  # How accurate the AI prediction was
    
    # Notes and feedback
    agent_notes = Column(Text)
    customer_feedback = Column(Text)
    supervisor_notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    agent = relationship("Agent", back_populates="call_assignments")

class AgentPerformanceMetric(Base):
    __tablename__ = "agent_performance_metrics"
    
    id = Column(String, primary_key=True)
    agent_id = Column(String, ForeignKey("agents.id"))
    
    # Time period
    date = Column(DateTime, nullable=False)
    period_type = Column(String, default="daily")  # daily, weekly, monthly
    
    # Call volume metrics
    total_calls = Column(Integer, default=0)
    inbound_calls = Column(Integer, default=0)
    outbound_calls = Column(Integer, default=0)
    avg_calls_per_hour = Column(Float, default=0.0)
    
    # Performance metrics
    conversion_rate = Column(Float, default=0.0)
    avg_call_duration = Column(Float, default=0.0)
    customer_satisfaction_avg = Column(Float, default=0.0)
    revenue_generated = Column(Float, default=0.0)
    
    # Quality metrics
    first_call_resolution_rate = Column(Float, default=0.0)
    escalation_rate = Column(Float, default=0.0)
    callback_rate = Column(Float, default=0.0)
    complaint_rate = Column(Float, default=0.0)
    
    # Efficiency metrics
    avg_response_time = Column(Float, default=0.0)
    hold_time_avg = Column(Float, default=0.0)
    wrap_up_time_avg = Column(Float, default=0.0)
    utilization_rate = Column(Float, default=0.0)
    
    # AI performance
    ai_routing_accuracy = Column(Float, default=0.0)
    predicted_vs_actual_variance = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    agent = relationship("Agent", back_populates="performance_metrics")

class CallRoutingRule(Base):
    __tablename__ = "call_routing_rules"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    
    # Rule conditions
    conditions = Column(JSON)  # List of conditions to match
    priority = Column(Integer, default=100)  # Higher number = higher priority
    
    # Routing configuration
    routing_strategy = Column(String, nullable=False)
    agent_criteria = Column(JSON)  # Criteria for agent selection
    
    # Time-based rules
    active_hours = Column(JSON)  # When this rule is active
    timezone = Column(String, default="America/Lima")
    
    # AI configuration
    use_ai_prediction = Column(Boolean, default=True)
    min_ai_confidence = Column(Float, default=0.7)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Performance tracking
    total_applications = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    avg_outcome_score = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Pydantic Models
class CallRoutingRequestModel(BaseModel):
    call_type: CallType
    priority: CallPriority = CallPriority.NORMAL
    customer_id: Optional[str] = None
    lead_id: Optional[str] = None
    
    customer_name: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    customer_language: str = "Spanish"
    customer_tier: CustomerTier = CustomerTier.STANDARD
    
    call_context: Optional[Dict[str, Any]] = {}
    required_skills: Optional[List[str]] = []
    preferred_agent_id: Optional[str] = None
    
    routing_strategy: RoutingStrategy = RoutingStrategy.AI_OPTIMIZED
    max_wait_time_minutes: int = 10

class AgentModel(BaseModel):
    employee_id: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    
    primary_language: str = "Spanish"
    secondary_languages: Optional[List[str]] = []
    specializations: Optional[List[str]] = []
    skill_level: AgentSkillLevel = AgentSkillLevel.INTERMEDIATE
    
    max_concurrent_calls: int = 1
    max_daily_calls: int = 50
    work_schedule: Optional[Dict[str, Any]] = {}
    timezone: str = "America/Lima"

# AI Models and Predictors
class CallOutcomePredictionModel:
    """ML model to predict call outcomes and performance"""
    
    def __init__(self):
        self.outcome_classifier = RandomForestClassifier(n_estimators=100, random_state=42)
        self.duration_regressor = GradientBoostingRegressor(n_estimators=100, random_state=42)
        self.satisfaction_regressor = RandomForestRegressor(n_estimators=50, random_state=42)
        self.conversion_classifier = LogisticRegression(random_state=42)
        
        self.feature_scaler = StandardScaler()
        self.label_encoders = {}
        
        self.is_trained = False
    
    async def train_models(self, training_data: pd.DataFrame):
        """Train all prediction models"""
        
        if training_data.empty:
            return
        
        # Prepare features
        features = self._extract_features(training_data)
        
        # Train outcome prediction
        if 'outcome' in training_data.columns:
            outcome_encoder = LabelEncoder()
            outcome_labels = outcome_encoder.fit_transform(training_data['outcome'])
            self.label_encoders['outcome'] = outcome_encoder
            self.outcome_classifier.fit(features, outcome_labels)
        
        # Train duration prediction
        if 'actual_duration_seconds' in training_data.columns:
            duration_data = training_data.dropna(subset=['actual_duration_seconds'])
            if len(duration_data) > 10:
                duration_features = self._extract_features(duration_data)
                self.duration_regressor.fit(duration_features, duration_data['actual_duration_seconds'])
        
        # Train satisfaction prediction
        if 'customer_satisfaction' in training_data.columns:
            satisfaction_data = training_data.dropna(subset=['customer_satisfaction'])
            if len(satisfaction_data) > 10:
                satisfaction_features = self._extract_features(satisfaction_data)
                self.satisfaction_regressor.fit(satisfaction_features, satisfaction_data['customer_satisfaction'])
        
        # Train conversion prediction
        if 'conversion_achieved' in training_data.columns:
            conversion_data = training_data.dropna(subset=['conversion_achieved'])
            if len(conversion_data) > 10:
                conversion_features = self._extract_features(conversion_data)
                self.conversion_classifier.fit(conversion_features, conversion_data['conversion_achieved'])
        
        self.is_trained = True
    
    def _extract_features(self, data: pd.DataFrame) -> np.ndarray:
        """Extract features for ML models"""
        
        feature_columns = [
            'agent_total_calls_handled', 'agent_conversion_rate', 'agent_satisfaction_score',
            'call_priority_encoded', 'call_type_encoded', 'customer_tier_encoded',
            'hour_of_day', 'day_of_week', 'agent_utilization'
        ]
        
        # Create encoded features
        processed_data = data.copy()
        
        # Encode categorical variables
        if 'priority' in data.columns:
            priority_mapping = {'low': 1, 'normal': 2, 'high': 3, 'urgent': 4, 'emergency': 5}
            processed_data['call_priority_encoded'] = data['priority'].map(priority_mapping).fillna(2)
        
        if 'call_type' in data.columns:
            type_mapping = {call_type.value: i for i, call_type in enumerate(CallType)}
            processed_data['call_type_encoded'] = data['call_type'].map(type_mapping).fillna(0)
        
        if 'customer_tier' in data.columns:
            tier_mapping = {tier.value: i for i, tier in enumerate(CustomerTier)}
            processed_data['customer_tier_encoded'] = data['customer_tier'].map(tier_mapping).fillna(2)
        
        # Time-based features
        if 'requested_at' in data.columns:
            processed_data['hour_of_day'] = pd.to_datetime(data['requested_at']).dt.hour
            processed_data['day_of_week'] = pd.to_datetime(data['requested_at']).dt.dayofweek
        
        # Fill missing columns with defaults
        for col in feature_columns:
            if col not in processed_data.columns:
                processed_data[col] = 0
        
        # Select and scale features
        features_df = processed_data[feature_columns].fillna(0)
        return self.feature_scaler.fit_transform(features_df)
    
    async def predict_call_outcome(self, call_data: Dict[str, Any], agent_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict call outcome and performance metrics"""
        
        if not self.is_trained:
            return self._get_default_predictions()
        
        # Prepare features
        features = self._prepare_prediction_features(call_data, agent_data)
        
        predictions = {}
        
        try:
            # Predict outcome
            if hasattr(self, 'outcome_classifier'):
                outcome_proba = self.outcome_classifier.predict_proba([features])[0]
                outcome_classes = self.label_encoders['outcome'].classes_
                predictions['outcome_probabilities'] = dict(zip(outcome_classes, outcome_proba))
                predictions['predicted_outcome'] = outcome_classes[np.argmax(outcome_proba)]
            
            # Predict duration
            if hasattr(self, 'duration_regressor'):
                predicted_duration = self.duration_regressor.predict([features])[0]
                predictions['predicted_duration_seconds'] = max(60, int(predicted_duration))
            
            # Predict satisfaction
            if hasattr(self, 'satisfaction_regressor'):
                predicted_satisfaction = self.satisfaction_regressor.predict([features])[0]
                predictions['predicted_satisfaction'] = np.clip(predicted_satisfaction, 1, 5)
            
            # Predict conversion
            if hasattr(self, 'conversion_classifier'):
                conversion_proba = self.conversion_classifier.predict_proba([features])[0]
                predictions['conversion_probability'] = conversion_proba[1] if len(conversion_proba) > 1 else 0.3
            
        except Exception as e:
            logging.error(f"Prediction error: {e}")
            return self._get_default_predictions()
        
        return predictions
    
    def _prepare_prediction_features(self, call_data: Dict[str, Any], agent_data: Dict[str, Any]) -> np.ndarray:
        """Prepare features for prediction"""
        
        features = [
            agent_data.get('total_calls_handled', 0),
            agent_data.get('conversion_rate', 0.0),
            agent_data.get('customer_satisfaction_score', 3.0),
            self._encode_priority(call_data.get('priority', 'normal')),
            self._encode_call_type(call_data.get('call_type', 'inbound_sales')),
            self._encode_customer_tier(call_data.get('customer_tier', 'standard')),
            datetime.now().hour,
            datetime.now().weekday(),
            agent_data.get('current_call_count', 0) / agent_data.get('max_concurrent_calls', 1)
        ]
        
        return np.array(features).reshape(1, -1)
    
    def _encode_priority(self, priority: str) -> int:
        priority_mapping = {'low': 1, 'normal': 2, 'high': 3, 'urgent': 4, 'emergency': 5}
        return priority_mapping.get(priority, 2)
    
    def _encode_call_type(self, call_type: str) -> int:
        type_mapping = {call_type.value: i for i, call_type in enumerate(CallType)}
        return type_mapping.get(call_type, 0)
    
    def _encode_customer_tier(self, tier: str) -> int:
        tier_mapping = {tier.value: i for i, tier in enumerate(CustomerTier)}
        return tier_mapping.get(tier, 2)
    
    def _get_default_predictions(self) -> Dict[str, Any]:
        """Get default predictions when model is not trained"""
        
        return {
            'predicted_outcome': 'information_provided',
            'predicted_duration_seconds': 300,
            'predicted_satisfaction': 3.5,
            'conversion_probability': 0.3,
            'outcome_probabilities': {
                'successful_conversion': 0.2,
                'qualified_lead': 0.3,
                'information_provided': 0.4,
                'scheduled_callback': 0.1
            }
        }

class AgentMatchingEngine:
    """AI-powered agent matching and scoring engine"""
    
    def __init__(self):
        self.matching_weights = {
            'skill_match': 0.25,
            'language_match': 0.20,
            'performance_score': 0.20,
            'availability': 0.15,
            'customer_preference': 0.10,
            'workload_balance': 0.10
        }
    
    async def calculate_agent_scores(self, 
                                   call_request: Dict[str, Any], 
                                   available_agents: List[Dict[str, Any]]) -> List[Tuple[str, float, Dict[str, Any]]]:
        """Calculate matching scores for all available agents"""
        
        agent_scores = []
        
        for agent in available_agents:
            # Calculate individual score components
            skill_score = self._calculate_skill_match(call_request, agent)
            language_score = self._calculate_language_match(call_request, agent)
            performance_score = self._normalize_performance_score(agent)
            availability_score = self._calculate_availability_score(agent)
            preference_score = self._calculate_customer_preference_score(call_request, agent)
            workload_score = self._calculate_workload_balance_score(agent, available_agents)
            
            # Calculate weighted total score
            total_score = (
                skill_score * self.matching_weights['skill_match'] +
                language_score * self.matching_weights['language_match'] +
                performance_score * self.matching_weights['performance_score'] +
                availability_score * self.matching_weights['availability'] +
                preference_score * self.matching_weights['customer_preference'] +
                workload_score * self.matching_weights['workload_balance']
            )
            
            # Create detailed scoring breakdown
            scoring_details = {
                'skill_match': skill_score,
                'language_match': language_score,
                'performance_score': performance_score,
                'availability_score': availability_score,
                'customer_preference': preference_score,
                'workload_balance': workload_score,
                'total_score': total_score,
                'agent_name': f"{agent.get('first_name', '')} {agent.get('last_name', '')}",
                'agent_specializations': agent.get('specializations', []),
                'agent_languages': [agent.get('primary_language', '')] + agent.get('secondary_languages', [])
            }
            
            agent_scores.append((agent['id'], total_score, scoring_details))
        
        # Sort by score (highest first)
        agent_scores.sort(key=lambda x: x[1], reverse=True)
        
        return agent_scores
    
    def _calculate_skill_match(self, call_request: Dict[str, Any], agent: Dict[str, Any]) -> float:
        """Calculate how well agent skills match call requirements"""
        
        required_skills = set(call_request.get('required_skills', []))
        agent_specializations = set(agent.get('specializations', []))
        call_type = call_request.get('call_type', '')
        
        if not required_skills:
            # If no specific skills required, base on call type
            score = 0.7  # Default score
        else:
            # Calculate overlap between required skills and agent specializations
            matching_skills = required_skills.intersection(agent_specializations)
            if required_skills:
                score = len(matching_skills) / len(required_skills)
            else:
                score = 0.7
        
        # Boost score for call type specialization
        if call_type in agent_specializations:
            score = min(1.0, score + 0.2)
        
        # Adjust based on agent skill level
        skill_level_boost = {
            'novice': 0.0,
            'intermediate': 0.1,
            'advanced': 0.2,
            'expert': 0.3,
            'master': 0.4
        }
        
        agent_skill_level = agent.get('skill_level', 'intermediate')
        score += skill_level_boost.get(agent_skill_level, 0.1)
        
        return min(1.0, score)
    
    def _calculate_language_match(self, call_request: Dict[str, Any], agent: Dict[str, Any]) -> float:
        """Calculate language compatibility score"""
        
        customer_language = call_request.get('customer_language', 'Spanish')
        agent_primary = agent.get('primary_language', 'Spanish')
        agent_secondary = agent.get('secondary_languages', [])
        
        if customer_language == agent_primary:
            return 1.0
        elif customer_language in agent_secondary:
            return 0.8
        elif customer_language == 'Spanish' and agent_primary in ['Spanish', 'English']:
            return 0.9  # Most agents should handle Spanish well
        elif customer_language == 'English' and 'English' in agent_secondary:
            return 0.7
        else:
            return 0.3  # Language barrier present
    
    def _normalize_performance_score(self, agent: Dict[str, Any]) -> float:
        """Normalize agent performance metrics to 0-1 score"""
        
        conversion_rate = agent.get('conversion_rate', 0.0)
        satisfaction_score = agent.get('customer_satisfaction_score', 3.0)
        ai_performance = agent.get('ai_performance_score', 0.5)
        
        # Normalize and weight different performance aspects
        conversion_normalized = min(1.0, conversion_rate)  # Assuming max conversion rate is 100%
        satisfaction_normalized = (satisfaction_score - 1) / 4  # Scale 1-5 to 0-1
        
        # Combine performance metrics
        performance_score = (
            conversion_normalized * 0.4 +
            satisfaction_normalized * 0.4 +
            ai_performance * 0.2
        )
        
        return min(1.0, max(0.0, performance_score))
    
    def _calculate_availability_score(self, agent: Dict[str, Any]) -> float:
        """Calculate agent availability score"""
        
        status = agent.get('current_status', 'offline')
        current_calls = agent.get('current_call_count', 0)
        max_calls = agent.get('max_concurrent_calls', 1)
        calls_today = agent.get('calls_today', 0)
        max_daily = agent.get('max_daily_calls', 50)
        
        # Base availability score
        if status == 'available':
            base_score = 1.0
        elif status == 'busy' and current_calls < max_calls:
            base_score = 0.7
        elif status == 'on_call':
            base_score = 0.3 if current_calls < max_calls else 0.0
        else:
            base_score = 0.0
        
        # Adjust for current workload
        workload_factor = 1.0 - (current_calls / max_calls)
        
        # Adjust for daily capacity
        daily_capacity_factor = 1.0 - (calls_today / max_daily)
        
        # Combine factors
        availability_score = base_score * workload_factor * daily_capacity_factor
        
        return min(1.0, max(0.0, availability_score))
    
    def _calculate_customer_preference_score(self, call_request: Dict[str, Any], agent: Dict[str, Any]) -> float:
        """Calculate score based on customer preferences"""
        
        preferred_agent_id = call_request.get('preferred_agent_id')
        customer_tier = call_request.get('customer_tier', 'standard')
        
        if preferred_agent_id == agent['id']:
            return 1.0
        
        # VIP customers get better agents
        if customer_tier == 'vip':
            agent_skill_level = agent.get('skill_level', 'intermediate')
            if agent_skill_level in ['expert', 'master']:
                return 0.9
            elif agent_skill_level == 'advanced':
                return 0.7
            else:
                return 0.4
        
        return 0.5  # Neutral score for no specific preference
    
    def _calculate_workload_balance_score(self, agent: Dict[str, Any], all_agents: List[Dict[str, Any]]) -> float:
        """Calculate score to promote workload balance"""
        
        agent_calls_today = agent.get('calls_today', 0)
        
        if not all_agents:
            return 0.5
        
        # Calculate average calls across all agents
        total_calls = sum(a.get('calls_today', 0) for a in all_agents)
        avg_calls = total_calls / len(all_agents) if all_agents else 0
        
        if avg_calls == 0:
            return 1.0
        
        # Agents with fewer calls get higher scores
        if agent_calls_today < avg_calls:
            return 1.0 - (agent_calls_today / avg_calls) * 0.5
        else:
            return max(0.2, 1.0 - (agent_calls_today / avg_calls) * 0.3)

# Main Intelligent Call Routing System
class IntelligentCallRoutingSystem:
    """
    Advanced call routing system with AI-powered agent matching and prediction
    """
    
    def __init__(self, database_url: str, redis_url: str = "redis://localhost:6379"):
        self.database_url = database_url
        self.redis_url = redis_url
        self.engine = None
        self.session_factory = None
        self.redis_client = None
        
        # AI components
        self.prediction_model = CallOutcomePredictionModel()
        self.matching_engine = AgentMatchingEngine()
        
        # Routing strategies
        self.routing_strategies = {
            RoutingStrategy.AI_OPTIMIZED: self._ai_optimized_routing,
            RoutingStrategy.SKILL_BASED: self._skill_based_routing,
            RoutingStrategy.PERFORMANCE_BASED: self._performance_based_routing,
            RoutingStrategy.ROUND_ROBIN: self._round_robin_routing,
            RoutingStrategy.CUSTOMER_PREFERENCE: self._customer_preference_routing,
            RoutingStrategy.HYBRID: self._hybrid_routing
        }
        
        # Celery for background processing
        self.celery_app = Celery('intelligent_call_routing')
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    async def initialize(self):
        """Initialize the call routing system"""
        self.engine = create_async_engine(self.database_url, echo=True)
        self.session_factory = sessionmaker(
            self.engine, 
            class_=AsyncSession, 
            expire_on_commit=False
        )
        
        self.redis_client = redis.from_url(self.redis_url)
        
        # Create database tables
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        # Initialize AI models
        await self._initialize_prediction_models()
        
        # Setup default routing rules
        await self._setup_default_routing_rules()
        
        self.logger.info("✅ Intelligent Call Routing System initialized")
    
    async def route_call(self, request: CallRoutingRequestModel) -> Dict[str, Any]:
        """Route call to optimal agent using AI predictions"""
        
        request_id = str(uuid.uuid4())
        
        try:
            # Create routing request record
            async with self.session_factory() as session:
                routing_request = CallRoutingRequest(
                    id=request_id,
                    call_type=request.call_type.value,
                    priority=request.priority.value,
                    customer_id=request.customer_id,
                    lead_id=request.lead_id,
                    customer_name=request.customer_name,
                    customer_email=request.customer_email,
                    customer_phone=request.customer_phone,
                    customer_language=request.customer_language,
                    customer_tier=request.customer_tier.value,
                    call_context=request.call_context,
                    required_skills=request.required_skills,
                    preferred_agent_id=request.preferred_agent_id,
                    routing_strategy=request.routing_strategy.value,
                    max_wait_time_minutes=request.max_wait_time_minutes
                )
                
                session.add(routing_request)
                await session.commit()
            
            # Get available agents
            available_agents = await self._get_available_agents()
            
            if not available_agents:
                return {
                    'status': 'no_agents_available',
                    'request_id': request_id,
                    'message': 'No agents currently available',
                    'estimated_wait_time': await self._estimate_wait_time()
                }
            
            # Apply routing strategy
            routing_function = self.routing_strategies.get(
                request.routing_strategy, 
                self._ai_optimized_routing
            )
            
            routing_result = await routing_function(request, available_agents)
            
            if routing_result['status'] == 'success':
                # Create assignment record
                assignment_id = await self._create_routing_assignment(
                    request_id,
                    routing_result['agent_id'],
                    routing_result
                )
                
                # Update agent status
                await self._update_agent_status(routing_result['agent_id'], 'on_call')
                
                # Update routing request
                await self._update_routing_request_status(
                    request_id,
                    'routed',
                    routing_result['agent_id'],
                    routing_result.get('reasoning', ''),
                    routing_result.get('confidence', 0.8)
                )
                
                routing_result.update({
                    'request_id': request_id,
                    'assignment_id': assignment_id,
                    'routing_timestamp': datetime.utcnow().isoformat()
                })
            
            return routing_result
            
        except Exception as e:
            self.logger.error(f"Call routing error: {e}")
            return {
                'status': 'error',
                'request_id': request_id,
                'error_message': str(e)
            }
    
    async def complete_call(self, 
                          assignment_id: str,
                          outcome: CallOutcome,
                          duration_seconds: int,
                          customer_satisfaction: Optional[int] = None,
                          revenue_generated: float = 0.0,
                          agent_notes: Optional[str] = None) -> Dict[str, Any]:
        """Complete a call and update performance metrics"""
        
        try:
            async with self.session_factory() as session:
                # Get assignment details
                result = await session.execute(
                    "SELECT * FROM call_routing_assignments WHERE id = :id",
                    {'id': assignment_id}
                )
                assignment = result.first()
                
                if not assignment:
                    return {'status': 'error', 'message': 'Assignment not found'}
                
                # Update assignment with results
                await session.execute("""
                    UPDATE call_routing_assignments 
                    SET call_ended_at = :ended_at,
                        actual_duration_seconds = :duration,
                        outcome = :outcome,
                        conversion_achieved = :conversion,
                        customer_satisfaction = :satisfaction,
                        revenue_generated = :revenue,
                        agent_notes = :notes,
                        updated_at = :updated_at
                    WHERE id = :id
                """, {
                    'id': assignment_id,
                    'ended_at': datetime.utcnow(),
                    'duration': duration_seconds,
                    'outcome': outcome.value,
                    'conversion': outcome in [CallOutcome.SUCCESSFUL_CONVERSION, CallOutcome.QUALIFIED_LEAD],
                    'satisfaction': customer_satisfaction,
                    'revenue': revenue_generated,
                    'notes': agent_notes,
                    'updated_at': datetime.utcnow()
                })
                
                # Update agent status back to available
                await self._update_agent_status(assignment.agent_id, 'available')
                
                # Update agent performance metrics
                await self._update_agent_performance(
                    assignment.agent_id,
                    outcome,
                    duration_seconds,
                    customer_satisfaction,
                    revenue_generated
                )
                
                # Calculate routing accuracy
                routing_accuracy = await self._calculate_routing_accuracy(assignment_id)
                
                await session.commit()
            
            return {
                'status': 'success',
                'assignment_id': assignment_id,
                'routing_accuracy': routing_accuracy,
                'call_completed_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Call completion error: {e}")
            return {
                'status': 'error',
                'error_message': str(e)
            }
    
    async def get_routing_analytics(self, days: int = 30) -> Dict[str, Any]:
        """Get comprehensive routing analytics"""
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        async with self.session_factory() as session:
            # Overall routing metrics
            total_requests = await session.execute("""
                SELECT COUNT(*) as total,
                       COUNT(CASE WHEN status = 'routed' THEN 1 END) as routed,
                       AVG(ai_confidence_score) as avg_confidence
                FROM call_routing_requests
                WHERE requested_at >= :start_date
            """, {'start_date': start_date})
            
            # Agent performance metrics
            agent_metrics = await session.execute("""
                SELECT a.first_name, a.last_name, a.id,
                       COUNT(cra.id) as calls_handled,
                       AVG(cra.customer_satisfaction) as avg_satisfaction,
                       AVG(cra.actual_duration_seconds) as avg_duration,
                       COUNT(CASE WHEN cra.conversion_achieved THEN 1 END) as conversions,
                       SUM(cra.revenue_generated) as total_revenue
                FROM agents a
                LEFT JOIN call_routing_assignments cra ON a.id = cra.agent_id
                WHERE cra.created_at >= :start_date OR cra.created_at IS NULL
                GROUP BY a.id, a.first_name, a.last_name
            """, {'start_date': start_date})
            
            # Routing strategy performance
            strategy_performance = await session.execute("""
                SELECT crr.routing_strategy,
                       COUNT(*) as total_requests,
                       AVG(cra.routing_accuracy) as avg_accuracy,
                       AVG(cra.customer_satisfaction) as avg_satisfaction,
                       COUNT(CASE WHEN cra.conversion_achieved THEN 1 END) as conversions
                FROM call_routing_requests crr
                LEFT JOIN call_routing_assignments cra ON crr.id = cra.request_id
                WHERE crr.requested_at >= :start_date
                GROUP BY crr.routing_strategy
            """, {'start_date': start_date})
            
            # Call type analysis
            call_type_analysis = await session.execute("""
                SELECT crr.call_type,
                       COUNT(*) as total_calls,
                       AVG(cra.actual_duration_seconds) as avg_duration,
                       COUNT(CASE WHEN cra.conversion_achieved THEN 1 END) as conversions,
                       AVG(cra.customer_satisfaction) as avg_satisfaction
                FROM call_routing_requests crr
                LEFT JOIN call_routing_assignments cra ON crr.id = cra.request_id
                WHERE crr.requested_at >= :start_date
                GROUP BY crr.call_type
            """, {'start_date': start_date})
            
            overall = total_requests.first()
            
            return {
                'period_days': days,
                'overall_metrics': {
                    'total_requests': overall.total if overall else 0,
                    'successful_routing_rate': (overall.routed / overall.total * 100) if overall and overall.total > 0 else 0,
                    'avg_ai_confidence': float(overall.avg_confidence) if overall and overall.avg_confidence else 0
                },
                'agent_performance': [dict(row) for row in agent_metrics],
                'strategy_performance': [dict(row) for row in strategy_performance],
                'call_type_analysis': [dict(row) for row in call_type_analysis],
                'generated_at': datetime.utcnow().isoformat()
            }
    
    # Routing Strategy Implementations
    async def _ai_optimized_routing(self, request: CallRoutingRequestModel, available_agents: List[Dict]) -> Dict[str, Any]:
        """AI-optimized routing using ML predictions and agent matching"""
        
        # Get agent scores from matching engine
        agent_scores = await self.matching_engine.calculate_agent_scores(
            request.dict(),
            available_agents
        )
        
        if not agent_scores:
            return {'status': 'no_suitable_agents'}
        
        # Get top 3 candidates for AI prediction
        top_candidates = agent_scores[:3]
        
        best_agent = None
        best_score = 0
        best_predictions = None
        
        for agent_id, matching_score, score_details in top_candidates:
            agent_data = next(a for a in available_agents if a['id'] == agent_id)
            
            # Get AI predictions for this agent
            predictions = await self.prediction_model.predict_call_outcome(
                request.dict(),
                agent_data
            )
            
            # Calculate combined AI score
            conversion_prob = predictions.get('conversion_probability', 0.3)
            predicted_satisfaction = predictions.get('predicted_satisfaction', 3.5) / 5.0
            
            # Combine matching score with AI predictions
            ai_score = (
                matching_score * 0.5 +
                conversion_prob * 0.3 +
                predicted_satisfaction * 0.2
            )
            
            if ai_score > best_score:
                best_score = ai_score
                best_agent = agent_data
                best_predictions = predictions
        
        if best_agent:
            return {
                'status': 'success',
                'agent_id': best_agent['id'],
                'agent_name': f"{best_agent['first_name']} {best_agent['last_name']}",
                'confidence': best_score,
                'predictions': best_predictions,
                'reasoning': f"AI-optimized selection based on {best_score:.2f} combined score",
                'routing_strategy': 'ai_optimized'
            }
        
        return {'status': 'no_suitable_agents'}
    
    async def _skill_based_routing(self, request: CallRoutingRequestModel, available_agents: List[Dict]) -> Dict[str, Any]:
        """Skill-based routing focusing on agent specializations"""
        
        required_skills = set(request.required_skills)
        call_type = request.call_type.value
        
        scored_agents = []
        
        for agent in available_agents:
            specializations = set(agent.get('specializations', []))
            
            # Calculate skill match score
            skill_score = 0
            if call_type in specializations:
                skill_score += 0.5
            
            if required_skills:
                matching_skills = required_skills.intersection(specializations)
                skill_score += (len(matching_skills) / len(required_skills)) * 0.5
            else:
                skill_score += 0.3
            
            # Boost for higher skill level
            skill_level_boost = {
                'novice': 0.0, 'intermediate': 0.1, 'advanced': 0.2, 
                'expert': 0.3, 'master': 0.4
            }
            skill_score += skill_level_boost.get(agent.get('skill_level', 'intermediate'), 0.1)
            
            scored_agents.append((agent, skill_score))
        
        if scored_agents:
            # Sort by skill score
            scored_agents.sort(key=lambda x: x[1], reverse=True)
            best_agent = scored_agents[0][0]
            
            return {
                'status': 'success',
                'agent_id': best_agent['id'],
                'agent_name': f"{best_agent['first_name']} {best_agent['last_name']}",
                'confidence': scored_agents[0][1],
                'reasoning': f"Skill-based selection with score {scored_agents[0][1]:.2f}",
                'routing_strategy': 'skill_based'
            }
        
        return {'status': 'no_suitable_agents'}
    
    async def _performance_based_routing(self, request: CallRoutingRequestModel, available_agents: List[Dict]) -> Dict[str, Any]:
        """Performance-based routing selecting highest performing agent"""
        
        # Sort agents by performance metrics
        def performance_score(agent):
            return (
                agent.get('conversion_rate', 0) * 0.4 +
                (agent.get('customer_satisfaction_score', 3) - 1) / 4 * 0.4 +
                agent.get('ai_performance_score', 0.5) * 0.2
            )
        
        sorted_agents = sorted(available_agents, key=performance_score, reverse=True)
        
        if sorted_agents:
            best_agent = sorted_agents[0]
            score = performance_score(best_agent)
            
            return {
                'status': 'success',
                'agent_id': best_agent['id'],
                'agent_name': f"{best_agent['first_name']} {best_agent['last_name']}",
                'confidence': score,
                'reasoning': f"Performance-based selection with score {score:.2f}",
                'routing_strategy': 'performance_based'
            }
        
        return {'status': 'no_suitable_agents'}
    
    async def _round_robin_routing(self, request: CallRoutingRequestModel, available_agents: List[Dict]) -> Dict[str, Any]:
        """Round-robin routing for equal distribution"""
        
        # Get agent with least calls today
        agent_with_least_calls = min(
            available_agents,
            key=lambda a: a.get('calls_today', 0)
        )
        
        return {
            'status': 'success',
            'agent_id': agent_with_least_calls['id'],
            'agent_name': f"{agent_with_least_calls['first_name']} {agent_with_least_calls['last_name']}",
            'confidence': 0.7,
            'reasoning': f"Round-robin selection - {agent_with_least_calls.get('calls_today', 0)} calls today",
            'routing_strategy': 'round_robin'
        }
    
    async def _customer_preference_routing(self, request: CallRoutingRequestModel, available_agents: List[Dict]) -> Dict[str, Any]:
        """Customer preference-based routing"""
        
        if request.preferred_agent_id:
            # Check if preferred agent is available
            preferred_agent = next(
                (a for a in available_agents if a['id'] == request.preferred_agent_id),
                None
            )
            
            if preferred_agent:
                return {
                    'status': 'success',
                    'agent_id': preferred_agent['id'],
                    'agent_name': f"{preferred_agent['first_name']} {preferred_agent['last_name']}",
                    'confidence': 1.0,
                    'reasoning': 'Customer preferred agent available',
                    'routing_strategy': 'customer_preference'
                }
        
        # Fallback to skill-based routing
        return await self._skill_based_routing(request, available_agents)
    
    async def _hybrid_routing(self, request: CallRoutingRequestModel, available_agents: List[Dict]) -> Dict[str, Any]:
        """Hybrid routing combining multiple strategies"""
        
        # Try AI-optimized first for high priority calls
        if request.priority in [CallPriority.HIGH, CallPriority.URGENT, CallPriority.EMERGENCY]:
            result = await self._ai_optimized_routing(request, available_agents)
            if result['status'] == 'success':
                result['routing_strategy'] = 'hybrid_ai'
                return result
        
        # Try customer preference
        if request.preferred_agent_id:
            result = await self._customer_preference_routing(request, available_agents)
            if result['status'] == 'success':
                result['routing_strategy'] = 'hybrid_preference'
                return result
        
        # Fallback to performance-based
        result = await self._performance_based_routing(request, available_agents)
        if result['status'] == 'success':
            result['routing_strategy'] = 'hybrid_performance'
        
        return result
    
    # Helper methods
    async def _get_available_agents(self) -> List[Dict[str, Any]]:
        """Get list of currently available agents"""
        
        async with self.session_factory() as session:
            result = await session.execute("""
                SELECT * FROM agents 
                WHERE current_status IN ('available', 'busy') 
                AND current_call_count < max_concurrent_calls
                AND calls_today < max_daily_calls
            """)
            
            return [dict(row) for row in result]
    
    async def _initialize_prediction_models(self):
        """Initialize ML prediction models with historical data"""
        
        async with self.session_factory() as session:
            # Get historical assignment data for training
            result = await session.execute("""
                SELECT cra.*, crr.call_type, crr.priority, crr.customer_tier,
                       a.total_calls_handled, a.conversion_rate, a.customer_satisfaction_score,
                       a.skill_level
                FROM call_routing_assignments cra
                JOIN call_routing_requests crr ON cra.request_id = crr.id
                JOIN agents a ON cra.agent_id = a.id
                WHERE cra.call_ended_at IS NOT NULL
                LIMIT 1000
            """)
            
            training_data = pd.DataFrame([dict(row) for row in result])
            
            if not training_data.empty:
                await self.prediction_model.train_models(training_data)
                self.logger.info(f"Trained prediction models with {len(training_data)} samples")
    
    async def _setup_default_routing_rules(self):
        """Setup default routing rules"""
        
        default_rules = [
            {
                'name': 'VIP Customer Priority',
                'description': 'Route VIP customers to expert agents',
                'conditions': [{'field': 'customer_tier', 'operator': 'equals', 'value': 'vip'}],
                'priority': 100,
                'routing_strategy': 'performance_based',
                'agent_criteria': {'skill_level': ['expert', 'master']},
                'use_ai_prediction': True
            },
            {
                'name': 'Emergency Call Priority',
                'description': 'Route emergency calls immediately',
                'conditions': [{'field': 'priority', 'operator': 'equals', 'value': 'emergency'}],
                'priority': 200,
                'routing_strategy': 'ai_optimized',
                'agent_criteria': {'current_status': 'available'},
                'use_ai_prediction': True
            }
        ]
        
        async with self.session_factory() as session:
            for rule_data in default_rules:
                # Check if rule exists
                existing = await session.execute(
                    "SELECT id FROM call_routing_rules WHERE name = :name",
                    {'name': rule_data['name']}
                )
                
                if not existing.first():
                    rule = CallRoutingRule(
                        id=str(uuid.uuid4()),
                        name=rule_data['name'],
                        description=rule_data['description'],
                        conditions=rule_data['conditions'],
                        priority=rule_data['priority'],
                        routing_strategy=rule_data['routing_strategy'],
                        agent_criteria=rule_data['agent_criteria'],
                        use_ai_prediction=rule_data['use_ai_prediction']
                    )
                    session.add(rule)
            
            await session.commit()
    
    async def _create_routing_assignment(self, 
                                       request_id: str, 
                                       agent_id: str, 
                                       routing_result: Dict[str, Any]) -> str:
        """Create routing assignment record"""
        
        assignment_id = str(uuid.uuid4())
        
        async with self.session_factory() as session:
            assignment = CallRoutingAssignment(
                id=assignment_id,
                request_id=request_id,
                agent_id=agent_id,
                assignment_reason=routing_result.get('reasoning', ''),
                ai_match_score=routing_result.get('confidence', 0.5),
                expected_outcome=routing_result.get('predictions', {}).get('predicted_outcome', 'unknown'),
                call_started_at=datetime.utcnow()
            )
            
            session.add(assignment)
            await session.commit()
        
        return assignment_id
    
    async def _update_agent_status(self, agent_id: str, status: str):
        """Update agent status"""
        
        async with self.session_factory() as session:
            if status == 'on_call':
                # Increment call count
                await session.execute("""
                    UPDATE agents 
                    SET current_status = :status,
                        current_call_count = current_call_count + 1,
                        calls_today = calls_today + 1,
                        last_status_change = :now
                    WHERE id = :id
                """, {
                    'id': agent_id,
                    'status': status,
                    'now': datetime.utcnow()
                })
            else:
                # Decrement call count if going back to available
                await session.execute("""
                    UPDATE agents 
                    SET current_status = :status,
                        current_call_count = GREATEST(0, current_call_count - 1),
                        last_status_change = :now
                    WHERE id = :id
                """, {
                    'id': agent_id,
                    'status': status,
                    'now': datetime.utcnow()
                })
            
            await session.commit()
    
    async def _update_routing_request_status(self, 
                                           request_id: str,
                                           status: str,
                                           agent_id: str,
                                           reasoning: str,
                                           confidence: float):
        """Update routing request status"""
        
        async with self.session_factory() as session:
            await session.execute("""
                UPDATE call_routing_requests 
                SET status = :status,
                    assigned_agent_id = :agent_id,
                    routing_reason = :reasoning,
                    ai_confidence_score = :confidence,
                    routed_at = :routed_at
                WHERE id = :id
            """, {
                'id': request_id,
                'status': status,
                'agent_id': agent_id,
                'reasoning': reasoning,
                'confidence': confidence,
                'routed_at': datetime.utcnow()
            })
            
            await session.commit()
    
    async def _update_agent_performance(self,
                                      agent_id: str,
                                      outcome: CallOutcome,
                                      duration_seconds: int,
                                      satisfaction: Optional[int],
                                      revenue: float):
        """Update agent performance metrics"""
        
        # This would update rolling performance metrics
        # For now, we'll just increment the basic counters
        
        async with self.session_factory() as session:
            # Update basic agent metrics
            conversion_achieved = outcome in [CallOutcome.SUCCESSFUL_CONVERSION, CallOutcome.QUALIFIED_LEAD]
            
            await session.execute("""
                UPDATE agents 
                SET total_calls_handled = total_calls_handled + 1,
                    updated_at = :now
                WHERE id = :id
            """, {
                'id': agent_id,
                'now': datetime.utcnow()
            })
            
            await session.commit()
    
    async def _calculate_routing_accuracy(self, assignment_id: str) -> float:
        """Calculate how accurate the routing prediction was"""
        
        # Simplified accuracy calculation
        # In production, this would compare predicted vs actual outcomes
        
        async with self.session_factory() as session:
            result = await session.execute(
                "SELECT ai_match_score, outcome, customer_satisfaction FROM call_routing_assignments WHERE id = :id",
                {'id': assignment_id}
            )
            assignment = result.first()
            
            if not assignment:
                return 0.5
            
            # Simple accuracy based on outcome and satisfaction
            base_accuracy = assignment.ai_match_score or 0.5
            
            if assignment.outcome in ['successful_conversion', 'qualified_lead']:
                base_accuracy += 0.2
            
            if assignment.customer_satisfaction and assignment.customer_satisfaction >= 4:
                base_accuracy += 0.1
            
            return min(1.0, base_accuracy)
    
    async def _estimate_wait_time(self) -> int:
        """Estimate wait time when no agents available"""
        
        # Simple estimation based on average call duration and queue
        # In production, this would be more sophisticated
        
        return 15  # minutes

# Usage Example
async def main():
    """Example usage of the Intelligent Call Routing System"""
    
    # Initialize the system
    routing_system = IntelligentCallRoutingSystem(
        database_url="sqlite+aiosqlite:///intelligent_call_routing.db",
        redis_url="redis://localhost:6379"
    )
    
    await routing_system.initialize()
    
    # Example: Route a high-priority sales call
    call_request = CallRoutingRequestModel(
        call_type=CallType.INBOUND_SALES,
        priority=CallPriority.HIGH,
        customer_name="María González",
        customer_email="maria.gonzalez@email.com",
        customer_phone="+1-555-123-4567",
        customer_language="Spanish",
        customer_tier=CustomerTier.PREMIUM,
        call_context={
            'previous_interactions': 3,
            'interested_products': ['Machu Picchu Tours'],
            'budget_range': '$2000-$3000'
        },
        required_skills=['adventure_tours', 'machu_picchu'],
        routing_strategy=RoutingStrategy.AI_OPTIMIZED
    )
    
    routing_result = await routing_system.route_call(call_request)
    print(f"Routing result: {routing_result}")
    
    # Simulate call completion
    if routing_result['status'] == 'success':
        completion_result = await routing_system.complete_call(
            assignment_id=routing_result.get('assignment_id'),
            outcome=CallOutcome.SUCCESSFUL_CONVERSION,
            duration_seconds=450,
            customer_satisfaction=5,
            revenue_generated=2500.0,
            agent_notes="Customer booked 3-day Machu Picchu tour for December"
        )
        print(f"Call completion: {completion_result}")
    
    # Get analytics
    analytics = await routing_system.get_routing_analytics(days=30)
    print(f"Routing analytics: {analytics}")

if __name__ == "__main__":
    asyncio.run(main())