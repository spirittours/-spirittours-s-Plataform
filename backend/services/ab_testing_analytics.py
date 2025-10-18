"""
A/B Testing Framework and Advanced Analytics System
===================================================
Sistema completo de A/B testing y analytics avanzado para optimización continua.

Features:
- Multi-variant testing (A/B/n)
- Statistical significance calculation
- Real-time analytics dashboard
- User segmentation
- Conversion funnel analysis  
- Cohort analysis
- Revenue attribution
- Predictive analytics
- Custom event tracking
- Heat maps and session recording
"""

import asyncio
import json
import hashlib
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Set, Union
from dataclasses import dataclass, field
from enum import Enum
import logging
import random
import math

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
import plotly.graph_objects as go
import plotly.express as px

logger = logging.getLogger(__name__)

# ================== Configuration ==================

@dataclass
class ABTestConfig:
    """A/B test configuration"""
    test_id: str
    name: str
    description: str
    hypothesis: str
    
    # Variants
    control: 'Variant'
    variants: List['Variant']
    
    # Targeting
    user_segments: Optional[List[str]] = None
    percentage_traffic: float = 1.0  # Percentage of traffic to include
    
    # Metrics
    primary_metric: str = "conversion_rate"
    secondary_metrics: List[str] = field(default_factory=list)
    
    # Duration
    start_date: datetime = field(default_factory=datetime.utcnow)
    end_date: Optional[datetime] = None
    min_sample_size: int = 1000
    
    # Statistical settings
    confidence_level: float = 0.95
    power: float = 0.8
    minimum_detectable_effect: float = 0.05
    
    # Status
    status: str = "draft"  # draft, running, paused, completed
    
    # Results
    winner: Optional[str] = None
    conclusion: Optional[str] = None

@dataclass
class Variant:
    """A/B test variant"""
    variant_id: str
    name: str
    description: str
    weight: float = 1.0  # Traffic weight
    
    # Configuration changes
    config: Dict[str, Any] = field(default_factory=dict)
    
    # Feature flags
    features: Dict[str, bool] = field(default_factory=dict)
    
    # UI changes
    ui_changes: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ExperimentResult:
    """Experiment results"""
    variant_id: str
    variant_name: str
    
    # Sample size
    users: int
    sessions: int
    
    # Primary metric
    conversions: int
    conversion_rate: float
    confidence_interval: Tuple[float, float]
    
    # Revenue metrics
    revenue: float
    average_order_value: float
    revenue_per_user: float
    
    # Engagement metrics
    bounce_rate: float
    pages_per_session: float
    session_duration: float
    
    # Statistical results
    p_value: Optional[float] = None
    z_score: Optional[float] = None
    is_significant: bool = False
    lift: Optional[float] = None
    probability_to_be_best: Optional[float] = None

class EventType(Enum):
    """Analytics event types"""
    PAGE_VIEW = "page_view"
    CLICK = "click"
    SCROLL = "scroll"
    FORM_SUBMIT = "form_submit"
    PURCHASE = "purchase"
    SIGNUP = "signup"
    LOGIN = "login"
    LOGOUT = "logout"
    SEARCH = "search"
    SHARE = "share"
    ADD_TO_CART = "add_to_cart"
    CHECKOUT = "checkout"
    CUSTOM = "custom"

@dataclass
class AnalyticsEvent:
    """Analytics event"""
    event_id: str
    event_type: EventType
    user_id: Optional[str]
    session_id: str
    timestamp: datetime
    
    # Event data
    page_url: Optional[str] = None
    referrer_url: Optional[str] = None
    element_id: Optional[str] = None
    element_class: Optional[str] = None
    
    # User context
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    
    # Custom properties
    properties: Dict[str, Any] = field(default_factory=dict)
    
    # A/B test context
    experiment_id: Optional[str] = None
    variant_id: Optional[str] = None

# ================== A/B Testing Framework ==================

class ABTestingFramework:
    """Advanced A/B testing framework"""
    
    def __init__(self, redis_client: redis.Redis, db_session: AsyncSession):
        self.redis = redis_client
        self.db = db_session
        
        # Active experiments
        self.experiments: Dict[str, ABTestConfig] = {}
        
        # User assignments cache
        self.user_assignments: Dict[str, Dict[str, str]] = {}
        
        # Results cache
        self.results_cache: Dict[str, List[ExperimentResult]] = {}
        
        # Analytics engine
        self.analytics = AdvancedAnalytics(redis_client, db_session)
    
    async def initialize(self):
        """Initialize A/B testing framework"""
        # Load active experiments
        await self._load_active_experiments()
        
        # Start background tasks
        asyncio.create_task(self._monitor_experiments())
        asyncio.create_task(self._calculate_results_periodically())
        
        logger.info("A/B Testing framework initialized")
    
    # ================== Experiment Management ==================
    
    async def create_experiment(self, config: ABTestConfig) -> str:
        """Create new A/B test experiment"""
        # Validate configuration
        self._validate_experiment_config(config)
        
        # Calculate required sample size
        config.min_sample_size = self._calculate_sample_size(
            config.minimum_detectable_effect,
            config.confidence_level,
            config.power
        )
        
        # Store experiment
        self.experiments[config.test_id] = config
        await self._save_experiment(config)
        
        logger.info(f"Created experiment: {config.name} (ID: {config.test_id})")
        
        return config.test_id
    
    async def start_experiment(self, test_id: str):
        """Start an experiment"""
        if test_id not in self.experiments:
            raise ValueError(f"Experiment {test_id} not found")
        
        experiment = self.experiments[test_id]
        experiment.status = "running"
        experiment.start_date = datetime.utcnow()
        
        await self._save_experiment(experiment)
        
        logger.info(f"Started experiment: {experiment.name}")
    
    async def pause_experiment(self, test_id: str):
        """Pause an experiment"""
        if test_id not in self.experiments:
            raise ValueError(f"Experiment {test_id} not found")
        
        experiment = self.experiments[test_id]
        experiment.status = "paused"
        
        await self._save_experiment(experiment)
        
        logger.info(f"Paused experiment: {experiment.name}")
    
    async def complete_experiment(self, test_id: str) -> ExperimentResult:
        """Complete an experiment and determine winner"""
        if test_id not in self.experiments:
            raise ValueError(f"Experiment {test_id} not found")
        
        experiment = self.experiments[test_id]
        
        # Calculate final results
        results = await self.calculate_results(test_id)
        
        # Determine winner
        winner = self._determine_winner(results)
        
        experiment.status = "completed"
        experiment.end_date = datetime.utcnow()
        experiment.winner = winner.variant_id if winner else None
        experiment.conclusion = self._generate_conclusion(results, winner)
        
        await self._save_experiment(experiment)
        
        logger.info(f"Completed experiment: {experiment.name}, Winner: {experiment.winner}")
        
        return winner
    
    # ================== User Assignment ==================
    
    async def get_variant(
        self, 
        test_id: str, 
        user_id: str,
        user_context: Optional[Dict[str, Any]] = None
    ) -> Variant:
        """Get variant assignment for user"""
        if test_id not in self.experiments:
            raise ValueError(f"Experiment {test_id} not found")
        
        experiment = self.experiments[test_id]
        
        # Check if experiment is running
        if experiment.status != "running":
            return experiment.control  # Return control if not running
        
        # Check user segment
        if not self._check_user_segment(user_id, user_context, experiment.user_segments):
            return experiment.control
        
        # Check traffic percentage
        if not self._check_traffic_percentage(user_id, experiment.percentage_traffic):
            return experiment.control
        
        # Check cached assignment
        if user_id in self.user_assignments and test_id in self.user_assignments[user_id]:
            variant_id = self.user_assignments[user_id][test_id]
            return self._get_variant_by_id(experiment, variant_id)
        
        # Assign variant
        variant = self._assign_variant(experiment, user_id)
        
        # Cache assignment
        if user_id not in self.user_assignments:
            self.user_assignments[user_id] = {}
        self.user_assignments[user_id][test_id] = variant.variant_id
        
        # Store assignment
        await self._store_assignment(test_id, user_id, variant.variant_id)
        
        # Track assignment event
        await self.analytics.track_event(
            AnalyticsEvent(
                event_id=str(uuid.uuid4()),
                event_type=EventType.CUSTOM,
                user_id=user_id,
                session_id=user_context.get('session_id', ''),
                timestamp=datetime.utcnow(),
                properties={
                    'event_name': 'experiment_assignment',
                    'experiment_id': test_id,
                    'variant_id': variant.variant_id,
                    'variant_name': variant.name
                },
                experiment_id=test_id,
                variant_id=variant.variant_id
            )
        )
        
        return variant
    
    def _assign_variant(self, experiment: ABTestConfig, user_id: str) -> Variant:
        """Assign variant to user using consistent hashing"""
        # Create hash from user_id and experiment_id
        hash_input = f"{experiment.test_id}:{user_id}"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        
        # Normalize to 0-1
        normalized = (hash_value % 10000) / 10000.0
        
        # Calculate variant weights
        all_variants = [experiment.control] + experiment.variants
        total_weight = sum(v.weight for v in all_variants)
        
        # Assign based on weight
        cumulative = 0
        for variant in all_variants:
            cumulative += variant.weight / total_weight
            if normalized <= cumulative:
                return variant
        
        return experiment.control  # Fallback
    
    def _check_user_segment(
        self, 
        user_id: str, 
        user_context: Optional[Dict],
        segments: Optional[List[str]]
    ) -> bool:
        """Check if user belongs to target segment"""
        if not segments:
            return True  # No segment restriction
        
        # Get user segment from context or database
        user_segment = user_context.get('segment') if user_context else None
        
        if user_segment:
            return user_segment in segments
        
        # TODO: Load user segment from database
        return True
    
    def _check_traffic_percentage(self, user_id: str, percentage: float) -> bool:
        """Check if user should be included based on traffic percentage"""
        if percentage >= 1.0:
            return True
        
        # Consistent hashing for traffic control
        hash_value = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
        normalized = (hash_value % 10000) / 10000.0
        
        return normalized <= percentage
    
    # ================== Results Calculation ==================
    
    async def calculate_results(self, test_id: str) -> List[ExperimentResult]:
        """Calculate experiment results"""
        if test_id not in self.experiments:
            raise ValueError(f"Experiment {test_id} not found")
        
        experiment = self.experiments[test_id]
        results = []
        
        # Get all variants
        all_variants = [experiment.control] + experiment.variants
        
        for variant in all_variants:
            # Get metrics from analytics
            metrics = await self.analytics.get_experiment_metrics(
                test_id,
                variant.variant_id,
                experiment.start_date,
                experiment.end_date or datetime.utcnow()
            )
            
            # Create result object
            result = ExperimentResult(
                variant_id=variant.variant_id,
                variant_name=variant.name,
                users=metrics.get('users', 0),
                sessions=metrics.get('sessions', 0),
                conversions=metrics.get('conversions', 0),
                conversion_rate=metrics.get('conversion_rate', 0),
                confidence_interval=self._calculate_confidence_interval(
                    metrics.get('conversions', 0),
                    metrics.get('users', 0),
                    experiment.confidence_level
                ),
                revenue=metrics.get('revenue', 0),
                average_order_value=metrics.get('aov', 0),
                revenue_per_user=metrics.get('rpu', 0),
                bounce_rate=metrics.get('bounce_rate', 0),
                pages_per_session=metrics.get('pages_per_session', 0),
                session_duration=metrics.get('session_duration', 0)
            )
            
            results.append(result)
        
        # Calculate statistical significance
        if len(results) >= 2:
            control_result = results[0]
            
            for variant_result in results[1:]:
                # Z-test for proportions
                p_value, z_score = self._calculate_significance(
                    control_result.conversions,
                    control_result.users,
                    variant_result.conversions,
                    variant_result.users
                )
                
                variant_result.p_value = p_value
                variant_result.z_score = z_score
                variant_result.is_significant = p_value < (1 - experiment.confidence_level)
                
                # Calculate lift
                if control_result.conversion_rate > 0:
                    variant_result.lift = (
                        (variant_result.conversion_rate - control_result.conversion_rate) 
                        / control_result.conversion_rate * 100
                    )
                
                # Bayesian probability to be best
                variant_result.probability_to_be_best = self._calculate_bayesian_probability(
                    variant_result.conversions,
                    variant_result.users,
                    control_result.conversions,
                    control_result.users
                )
        
        # Cache results
        self.results_cache[test_id] = results
        
        return results
    
    def _calculate_confidence_interval(
        self, 
        conversions: int, 
        users: int, 
        confidence_level: float
    ) -> Tuple[float, float]:
        """Calculate confidence interval for conversion rate"""
        if users == 0:
            return (0, 0)
        
        p = conversions / users
        z = stats.norm.ppf((1 + confidence_level) / 2)
        margin = z * math.sqrt(p * (1 - p) / users)
        
        return (max(0, p - margin), min(1, p + margin))
    
    def _calculate_significance(
        self,
        control_conversions: int,
        control_users: int,
        variant_conversions: int,
        variant_users: int
    ) -> Tuple[float, float]:
        """Calculate statistical significance using z-test"""
        if control_users == 0 or variant_users == 0:
            return 1.0, 0.0
        
        p1 = control_conversions / control_users
        p2 = variant_conversions / variant_users
        
        # Pooled proportion
        p_pooled = (control_conversions + variant_conversions) / (control_users + variant_users)
        
        # Standard error
        se = math.sqrt(p_pooled * (1 - p_pooled) * (1/control_users + 1/variant_users))
        
        if se == 0:
            return 1.0, 0.0
        
        # Z-score
        z_score = (p2 - p1) / se
        
        # Two-tailed p-value
        p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))
        
        return p_value, z_score
    
    def _calculate_bayesian_probability(
        self,
        variant_conversions: int,
        variant_users: int,
        control_conversions: int,
        control_users: int,
        simulations: int = 10000
    ) -> float:
        """Calculate Bayesian probability that variant is better than control"""
        # Beta distributions for each variant
        variant_alpha = variant_conversions + 1
        variant_beta = variant_users - variant_conversions + 1
        
        control_alpha = control_conversions + 1
        control_beta = control_users - control_conversions + 1
        
        # Monte Carlo simulation
        variant_samples = np.random.beta(variant_alpha, variant_beta, simulations)
        control_samples = np.random.beta(control_alpha, control_beta, simulations)
        
        # Probability that variant is better
        probability = np.mean(variant_samples > control_samples)
        
        return probability
    
    def _calculate_sample_size(
        self,
        mde: float,  # Minimum detectable effect
        confidence_level: float,
        power: float
    ) -> int:
        """Calculate required sample size for experiment"""
        # Z-scores
        z_alpha = stats.norm.ppf((1 + confidence_level) / 2)
        z_beta = stats.norm.ppf(power)
        
        # Assumed baseline conversion rate (can be customized)
        p1 = 0.1  # 10% baseline
        p2 = p1 * (1 + mde)
        
        # Pooled proportion
        p_pooled = (p1 + p2) / 2
        
        # Sample size formula
        n = (2 * p_pooled * (1 - p_pooled) * (z_alpha + z_beta)**2) / (p2 - p1)**2
        
        return int(math.ceil(n))
    
    def _determine_winner(self, results: List[ExperimentResult]) -> Optional[ExperimentResult]:
        """Determine experiment winner"""
        if not results:
            return None
        
        # Find variant with highest conversion rate that is statistically significant
        control = results[0]
        best_variant = control
        
        for variant in results[1:]:
            if variant.is_significant and variant.conversion_rate > best_variant.conversion_rate:
                best_variant = variant
        
        # Only declare winner if significantly better than control
        if best_variant != control and best_variant.is_significant:
            return best_variant
        
        return None
    
    def _generate_conclusion(
        self, 
        results: List[ExperimentResult], 
        winner: Optional[ExperimentResult]
    ) -> str:
        """Generate experiment conclusion"""
        if not results:
            return "No data available"
        
        control = results[0]
        
        if winner:
            lift = winner.lift if winner.lift else 0
            return (
                f"Variant '{winner.variant_name}' is the winner with "
                f"{winner.conversion_rate:.2%} conversion rate, "
                f"a {lift:.1f}% lift over control "
                f"(p-value: {winner.p_value:.4f})"
            )
        else:
            return (
                f"No significant winner found. Control conversion rate: "
                f"{control.conversion_rate:.2%}. Consider running the test longer "
                f"or testing larger changes."
            )
    
    def _validate_experiment_config(self, config: ABTestConfig):
        """Validate experiment configuration"""
        if not config.test_id:
            raise ValueError("Test ID is required")
        
        if not config.name:
            raise ValueError("Test name is required")
        
        if not config.control:
            raise ValueError("Control variant is required")
        
        if not config.variants:
            raise ValueError("At least one test variant is required")
        
        total_weight = config.control.weight + sum(v.weight for v in config.variants)
        if total_weight <= 0:
            raise ValueError("Total variant weight must be positive")
    
    def _get_variant_by_id(self, experiment: ABTestConfig, variant_id: str) -> Optional[Variant]:
        """Get variant by ID"""
        if experiment.control.variant_id == variant_id:
            return experiment.control
        
        for variant in experiment.variants:
            if variant.variant_id == variant_id:
                return variant
        
        return None
    
    # ================== Monitoring ==================
    
    async def _monitor_experiments(self):
        """Monitor running experiments"""
        while True:
            try:
                await asyncio.sleep(300)  # Check every 5 minutes
                
                for test_id, experiment in self.experiments.items():
                    if experiment.status != "running":
                        continue
                    
                    # Check if experiment should be auto-completed
                    if experiment.end_date and datetime.utcnow() > experiment.end_date:
                        await self.complete_experiment(test_id)
                        continue
                    
                    # Check sample size
                    results = await self.calculate_results(test_id)
                    total_users = sum(r.users for r in results)
                    
                    if total_users >= experiment.min_sample_size * len(results):
                        # Check for early stopping
                        if self._should_stop_early(results):
                            logger.info(f"Early stopping experiment {test_id}")
                            await self.complete_experiment(test_id)
                
            except Exception as e:
                logger.error(f"Error monitoring experiments: {e}")
    
    def _should_stop_early(self, results: List[ExperimentResult]) -> bool:
        """Check if experiment should be stopped early"""
        # Implement sequential testing or other early stopping rules
        for result in results[1:]:
            if result.is_significant and result.probability_to_be_best > 0.95:
                return True
        return False
    
    async def _calculate_results_periodically(self):
        """Calculate results periodically for caching"""
        while True:
            try:
                await asyncio.sleep(3600)  # Every hour
                
                for test_id in self.experiments:
                    if self.experiments[test_id].status == "running":
                        await self.calculate_results(test_id)
                
            except Exception as e:
                logger.error(f"Error calculating results: {e}")
    
    # ================== Storage ==================
    
    async def _load_active_experiments(self):
        """Load active experiments from storage"""
        # Load from Redis or database
        experiments_data = await self.redis.get("ab_tests:active")
        
        if experiments_data:
            experiments = json.loads(experiments_data)
            for exp_data in experiments:
                # Reconstruct experiment objects
                pass
    
    async def _save_experiment(self, experiment: ABTestConfig):
        """Save experiment to storage"""
        # Save to Redis for quick access
        await self.redis.hset(
            f"ab_test:{experiment.test_id}",
            mapping={
                'config': json.dumps(experiment.__dict__, default=str),
                'status': experiment.status,
                'start_date': experiment.start_date.isoformat(),
                'end_date': experiment.end_date.isoformat() if experiment.end_date else ''
            }
        )
        
        # Also save to database for persistence
        # TODO: Implement database storage
    
    async def _store_assignment(self, test_id: str, user_id: str, variant_id: str):
        """Store user assignment"""
        await self.redis.hset(
            f"ab_test:assignments:{test_id}",
            user_id,
            variant_id
        )

# ================== Advanced Analytics ==================

class AdvancedAnalytics:
    """Advanced analytics system"""
    
    def __init__(self, redis_client: redis.Redis, db_session: AsyncSession):
        self.redis = redis_client
        self.db = db_session
        
        # Event buffer for batch processing
        self.event_buffer: List[AnalyticsEvent] = []
        self.buffer_size = 100
        
        # Metrics cache
        self.metrics_cache = {}
        
        # User profiles
        self.user_profiles = {}
    
    async def track_event(self, event: AnalyticsEvent):
        """Track analytics event"""
        # Add to buffer
        self.event_buffer.append(event)
        
        # Process buffer if full
        if len(self.event_buffer) >= self.buffer_size:
            await self._flush_event_buffer()
        
        # Real-time processing for critical events
        if event.event_type in [EventType.PURCHASE, EventType.SIGNUP]:
            await self._process_critical_event(event)
    
    async def _flush_event_buffer(self):
        """Flush event buffer to storage"""
        if not self.event_buffer:
            return
        
        events = self.event_buffer.copy()
        self.event_buffer.clear()
        
        # Store events
        for event in events:
            await self._store_event(event)
        
        # Update aggregates
        await self._update_aggregates(events)
    
    async def _store_event(self, event: AnalyticsEvent):
        """Store event to database"""
        # Store in time-series format
        key = f"events:{event.event_type.value}:{event.timestamp.strftime('%Y%m%d')}"
        
        event_data = {
            'event_id': event.event_id,
            'user_id': event.user_id,
            'session_id': event.session_id,
            'timestamp': event.timestamp.isoformat(),
            'properties': json.dumps(event.properties),
            'experiment_id': event.experiment_id,
            'variant_id': event.variant_id
        }
        
        await self.redis.lpush(key, json.dumps(event_data))
        
        # Set expiry for old events
        await self.redis.expire(key, 86400 * 90)  # 90 days
    
    async def _update_aggregates(self, events: List[AnalyticsEvent]):
        """Update aggregate metrics"""
        for event in events:
            # Update daily aggregates
            date_key = event.timestamp.strftime('%Y%m%d')
            
            # Increment counters
            await self.redis.hincrby(f"metrics:daily:{date_key}", event.event_type.value, 1)
            
            # Update user metrics
            if event.user_id:
                await self.redis.hincrby(f"user:events:{event.user_id}", event.event_type.value, 1)
            
            # Update experiment metrics
            if event.experiment_id and event.variant_id:
                exp_key = f"experiment:{event.experiment_id}:variant:{event.variant_id}"
                await self.redis.hincrby(exp_key, event.event_type.value, 1)
    
    async def _process_critical_event(self, event: AnalyticsEvent):
        """Process critical events immediately"""
        # Update conversion tracking
        if event.event_type == EventType.PURCHASE:
            if event.experiment_id and event.variant_id:
                await self.redis.hincrby(
                    f"experiment:{event.experiment_id}:variant:{event.variant_id}",
                    "conversions",
                    1
                )
                
                # Update revenue
                revenue = event.properties.get('revenue', 0)
                await self.redis.hincrbyfloat(
                    f"experiment:{event.experiment_id}:variant:{event.variant_id}",
                    "revenue",
                    revenue
                )
    
    async def get_experiment_metrics(
        self,
        experiment_id: str,
        variant_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get metrics for experiment variant"""
        key = f"experiment:{experiment_id}:variant:{variant_id}"
        
        # Get from Redis
        metrics_raw = await self.redis.hgetall(key)
        
        # Parse metrics
        metrics = {
            'users': int(metrics_raw.get(b'users', 0)),
            'sessions': int(metrics_raw.get(b'sessions', 0)),
            'conversions': int(metrics_raw.get(b'conversions', 0)),
            'revenue': float(metrics_raw.get(b'revenue', 0)),
            'page_views': int(metrics_raw.get(b'page_view', 0)),
            'clicks': int(metrics_raw.get(b'click', 0))
        }
        
        # Calculate derived metrics
        if metrics['users'] > 0:
            metrics['conversion_rate'] = metrics['conversions'] / metrics['users']
            metrics['revenue_per_user'] = metrics['revenue'] / metrics['users']
        else:
            metrics['conversion_rate'] = 0
            metrics['revenue_per_user'] = 0
        
        if metrics['conversions'] > 0:
            metrics['average_order_value'] = metrics['revenue'] / metrics['conversions']
        else:
            metrics['average_order_value'] = 0
        
        if metrics['sessions'] > 0:
            metrics['pages_per_session'] = metrics['page_views'] / metrics['sessions']
        else:
            metrics['pages_per_session'] = 0
        
        # Get bounce rate and session duration from detailed analysis
        # TODO: Implement detailed session analysis
        metrics['bounce_rate'] = 0.3  # Placeholder
        metrics['session_duration'] = 180  # Placeholder (seconds)
        
        return metrics
    
    # ================== Advanced Analytics Features ==================
    
    async def funnel_analysis(
        self,
        funnel_steps: List[str],
        start_date: datetime,
        end_date: datetime,
        segment: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyze conversion funnel"""
        funnel_data = {
            'steps': [],
            'drop_off_rates': [],
            'total_conversion_rate': 0
        }
        
        previous_users = None
        
        for i, step in enumerate(funnel_steps):
            # Get users who completed this step
            users = await self._get_users_for_event(
                step,
                start_date,
                end_date,
                segment
            )
            
            step_data = {
                'name': step,
                'users': len(users),
                'conversion_rate': 0,
                'drop_off_rate': 0
            }
            
            if i == 0:
                step_data['conversion_rate'] = 1.0
            elif previous_users:
                step_data['conversion_rate'] = len(users) / len(previous_users)
                step_data['drop_off_rate'] = 1 - step_data['conversion_rate']
            
            funnel_data['steps'].append(step_data)
            funnel_data['drop_off_rates'].append(step_data['drop_off_rate'])
            
            previous_users = users
        
        # Calculate total conversion
        if funnel_data['steps']:
            funnel_data['total_conversion_rate'] = (
                funnel_data['steps'][-1]['users'] / 
                funnel_data['steps'][0]['users']
                if funnel_data['steps'][0]['users'] > 0 else 0
            )
        
        return funnel_data
    
    async def cohort_analysis(
        self,
        cohort_period: str = 'week',  # day, week, month
        metric: str = 'retention',
        periods: int = 12
    ) -> pd.DataFrame:
        """Perform cohort analysis"""
        # Create cohort DataFrame
        cohorts = []
        
        for i in range(periods):
            if cohort_period == 'week':
                cohort_start = datetime.utcnow() - timedelta(weeks=i+1)
                cohort_end = cohort_start + timedelta(weeks=1)
            elif cohort_period == 'month':
                cohort_start = datetime.utcnow() - timedelta(days=30*(i+1))
                cohort_end = cohort_start + timedelta(days=30)
            else:  # day
                cohort_start = datetime.utcnow() - timedelta(days=i+1)
                cohort_end = cohort_start + timedelta(days=1)
            
            # Get cohort users
            cohort_users = await self._get_new_users(cohort_start, cohort_end)
            
            cohort_data = {
                'cohort': cohort_start.strftime('%Y-%m-%d'),
                'users': len(cohort_users),
                'period_0': 100.0  # 100% at start
            }
            
            # Calculate retention for subsequent periods
            for period in range(1, min(i+1, 12)):
                if cohort_period == 'week':
                    period_start = cohort_end + timedelta(weeks=period-1)
                    period_end = period_start + timedelta(weeks=1)
                else:
                    period_start = cohort_end + timedelta(days=30*(period-1))
                    period_end = period_start + timedelta(days=30)
                
                retained_users = await self._get_active_users(
                    period_start,
                    period_end,
                    cohort_users
                )
                
                retention_rate = (
                    len(retained_users) / len(cohort_users) * 100 
                    if cohort_users else 0
                )
                cohort_data[f'period_{period}'] = retention_rate
            
            cohorts.append(cohort_data)
        
        return pd.DataFrame(cohorts)
    
    async def user_segmentation(
        self,
        n_segments: int = 5,
        features: List[str] = None
    ) -> Dict[str, List[str]]:
        """Segment users using clustering"""
        # Default features
        if not features:
            features = [
                'total_sessions',
                'total_purchases',
                'total_revenue',
                'days_since_signup',
                'avg_session_duration'
            ]
        
        # Get user data
        users_data = await self._get_users_features(features)
        
        if not users_data:
            return {}
        
        # Prepare data for clustering
        X = np.array([
            [user_data.get(f, 0) for f in features]
            for user_data in users_data.values()
        ])
        
        # Normalize features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Perform clustering
        kmeans = KMeans(n_clusters=n_segments, random_state=42)
        clusters = kmeans.fit_predict(X_scaled)
        
        # Group users by segment
        segments = {}
        for user_id, cluster in zip(users_data.keys(), clusters):
            segment_name = f"segment_{cluster}"
            if segment_name not in segments:
                segments[segment_name] = []
            segments[segment_name].append(user_id)
        
        return segments
    
    async def revenue_attribution(
        self,
        attribution_model: str = 'last_click'  # first_click, linear, time_decay
    ) -> Dict[str, float]:
        """Attribute revenue to marketing channels"""
        attribution = {}
        
        # Get all purchases
        purchases = await self._get_purchase_events()
        
        for purchase in purchases:
            user_id = purchase['user_id']
            revenue = purchase['revenue']
            
            # Get user's touchpoints
            touchpoints = await self._get_user_touchpoints(user_id, purchase['timestamp'])
            
            if not touchpoints:
                continue
            
            # Apply attribution model
            if attribution_model == 'last_click':
                channel = touchpoints[-1]['channel']
                attribution[channel] = attribution.get(channel, 0) + revenue
                
            elif attribution_model == 'first_click':
                channel = touchpoints[0]['channel']
                attribution[channel] = attribution.get(channel, 0) + revenue
                
            elif attribution_model == 'linear':
                credit = revenue / len(touchpoints)
                for touchpoint in touchpoints:
                    channel = touchpoint['channel']
                    attribution[channel] = attribution.get(channel, 0) + credit
                    
            elif attribution_model == 'time_decay':
                # More recent touchpoints get more credit
                total_weight = sum(i+1 for i in range(len(touchpoints)))
                for i, touchpoint in enumerate(touchpoints):
                    weight = (i + 1) / total_weight
                    channel = touchpoint['channel']
                    attribution[channel] = attribution.get(channel, 0) + revenue * weight
        
        return attribution
    
    # ================== Visualization ==================
    
    def create_experiment_dashboard(self, results: List[ExperimentResult]) -> Dict[str, Any]:
        """Create visualization dashboard for experiment results"""
        dashboard = {
            'charts': [],
            'metrics': [],
            'insights': []
        }
        
        # Conversion rate comparison
        fig = go.Figure(data=[
            go.Bar(
                x=[r.variant_name for r in results],
                y=[r.conversion_rate * 100 for r in results],
                error_y=dict(
                    type='data',
                    array=[(r.confidence_interval[1] - r.conversion_rate) * 100 for r in results],
                    arrayminus=[(r.conversion_rate - r.confidence_interval[0]) * 100 for r in results]
                ),
                text=[f"{r.conversion_rate:.2%}" for r in results],
                textposition='outside'
            )
        ])
        fig.update_layout(
            title="Conversion Rate by Variant",
            yaxis_title="Conversion Rate (%)",
            xaxis_title="Variant"
        )
        dashboard['charts'].append(fig.to_json())
        
        # Revenue comparison
        fig2 = go.Figure(data=[
            go.Bar(
                x=[r.variant_name for r in results],
                y=[r.revenue_per_user for r in results],
                text=[f"${r.revenue_per_user:.2f}" for r in results],
                textposition='outside'
            )
        ])
        fig2.update_layout(
            title="Revenue per User by Variant",
            yaxis_title="Revenue ($)",
            xaxis_title="Variant"
        )
        dashboard['charts'].append(fig2.to_json())
        
        # Probability to be best (Bayesian)
        if len(results) > 1:
            fig3 = go.Figure(data=[
                go.Pie(
                    labels=[r.variant_name for r in results[1:]],
                    values=[r.probability_to_be_best * 100 for r in results[1:]],
                    text=[f"{r.probability_to_be_best:.1%}" for r in results[1:]]
                )
            ])
            fig3.update_layout(title="Probability to Be Best")
            dashboard['charts'].append(fig3.to_json())
        
        # Key metrics
        for result in results:
            dashboard['metrics'].append({
                'variant': result.variant_name,
                'users': result.users,
                'conversion_rate': f"{result.conversion_rate:.2%}",
                'revenue': f"${result.revenue:,.2f}",
                'aov': f"${result.average_order_value:.2f}",
                'significance': 'Yes' if result.is_significant else 'No',
                'lift': f"{result.lift:.1f}%" if result.lift else "N/A"
            })
        
        # Generate insights
        dashboard['insights'] = self._generate_insights(results)
        
        return dashboard
    
    def _generate_insights(self, results: List[ExperimentResult]) -> List[str]:
        """Generate insights from experiment results"""
        insights = []
        
        if not results:
            return insights
        
        control = results[0]
        
        # Check for significant winners
        winners = [r for r in results[1:] if r.is_significant and r.conversion_rate > control.conversion_rate]
        if winners:
            best = max(winners, key=lambda x: x.conversion_rate)
            insights.append(
                f"✅ {best.variant_name} shows a {best.lift:.1f}% improvement in conversion rate"
            )
        
        # Check for negative results
        losers = [r for r in results[1:] if r.is_significant and r.conversion_rate < control.conversion_rate]
        if losers:
            worst = min(losers, key=lambda x: x.conversion_rate)
            insights.append(
                f"⚠️ {worst.variant_name} performs {abs(worst.lift):.1f}% worse than control"
            )
        
        # Check sample size
        total_users = sum(r.users for r in results)
        if total_users < 1000 * len(results):
            insights.append(
                f"📊 Consider running the test longer. Current sample size: {total_users:,}"
            )
        
        # Check for high variance
        conversion_rates = [r.conversion_rate for r in results]
        if max(conversion_rates) - min(conversion_rates) < 0.01:
            insights.append(
                "📈 Variants show minimal difference. Consider testing bigger changes"
            )
        
        return insights
    
    # ================== Helper Methods ==================
    
    async def _get_users_for_event(
        self,
        event_type: str,
        start_date: datetime,
        end_date: datetime,
        segment: Optional[str] = None
    ) -> Set[str]:
        """Get users who performed specific event"""
        users = set()
        
        # Get from Redis
        current = start_date
        while current <= end_date:
            key = f"events:{event_type}:{current.strftime('%Y%m%d')}"
            events = await self.redis.lrange(key, 0, -1)
            
            for event_data in events:
                event = json.loads(event_data)
                if event.get('user_id'):
                    users.add(event['user_id'])
            
            current += timedelta(days=1)
        
        return users
    
    async def _get_new_users(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Set[str]:
        """Get new users in period"""
        return await self._get_users_for_event(
            EventType.SIGNUP.value,
            start_date,
            end_date
        )
    
    async def _get_active_users(
        self,
        start_date: datetime,
        end_date: datetime,
        user_set: Set[str]
    ) -> Set[str]:
        """Get active users from a specific set"""
        all_active = await self._get_users_for_event(
            EventType.PAGE_VIEW.value,
            start_date,
            end_date
        )
        
        return all_active.intersection(user_set)
    
    async def _get_users_features(self, features: List[str]) -> Dict[str, Dict[str, float]]:
        """Get user features for segmentation"""
        # TODO: Implement user feature extraction
        return {}
    
    async def _get_purchase_events(self) -> List[Dict]:
        """Get all purchase events"""
        # TODO: Implement purchase event retrieval
        return []
    
    async def _get_user_touchpoints(
        self,
        user_id: str,
        before: datetime
    ) -> List[Dict]:
        """Get user's marketing touchpoints"""
        # TODO: Implement touchpoint tracking
        return []

# ================== Usage Example ==================

async def example_usage():
    """Example usage of A/B testing and analytics"""
    
    # Initialize Redis and DB
    redis_client = await redis.from_url("redis://localhost")
    db_session = None  # Initialize your DB session
    
    # Create A/B testing framework
    ab_testing = ABTestingFramework(redis_client, db_session)
    await ab_testing.initialize()
    
    # Create an experiment
    experiment = ABTestConfig(
        test_id="homepage_cta_test",
        name="Homepage CTA Button Test",
        description="Testing different CTA button colors",
        hypothesis="A green CTA button will increase conversion rate by 10%",
        control=Variant(
            variant_id="control",
            name="Blue Button",
            description="Original blue CTA button",
            config={"button_color": "#007bff"}
        ),
        variants=[
            Variant(
                variant_id="variant_a",
                name="Green Button",
                description="Green CTA button",
                config={"button_color": "#28a745"}
            ),
            Variant(
                variant_id="variant_b",
                name="Red Button", 
                description="Red CTA button",
                config={"button_color": "#dc3545"}
            )
        ],
        primary_metric="conversion_rate",
        confidence_level=0.95,
        minimum_detectable_effect=0.1
    )
    
    # Create and start experiment
    test_id = await ab_testing.create_experiment(experiment)
    await ab_testing.start_experiment(test_id)
    
    # Get variant for user
    user_id = "user_123"
    variant = await ab_testing.get_variant(test_id, user_id)
    print(f"User {user_id} assigned to: {variant.name}")
    
    # Track conversion event
    await ab_testing.analytics.track_event(
        AnalyticsEvent(
            event_id=str(uuid.uuid4()),
            event_type=EventType.PURCHASE,
            user_id=user_id,
            session_id="session_123",
            timestamp=datetime.utcnow(),
            properties={
                'revenue': 99.99,
                'product': 'Premium Plan'
            },
            experiment_id=test_id,
            variant_id=variant.variant_id
        )
    )
    
    # Get experiment results
    results = await ab_testing.calculate_results(test_id)
    
    for result in results:
        print(f"""
        Variant: {result.variant_name}
        Users: {result.users}
        Conversion Rate: {result.conversion_rate:.2%}
        Revenue per User: ${result.revenue_per_user:.2f}
        Significant: {result.is_significant}
        Lift: {result.lift:.1f}% if result.lift else 'N/A'
        """)
    
    # Create dashboard
    dashboard = ab_testing.analytics.create_experiment_dashboard(results)
    
    # Perform funnel analysis
    funnel = await ab_testing.analytics.funnel_analysis(
        funnel_steps=['home_page', 'product_view', 'add_to_cart', 'checkout', 'purchase'],
        start_date=datetime.utcnow() - timedelta(days=30),
        end_date=datetime.utcnow()
    )
    
    print(f"Funnel conversion rate: {funnel['total_conversion_rate']:.2%}")
    
    # Cohort analysis
    cohorts = await ab_testing.analytics.cohort_analysis(
        cohort_period='week',
        metric='retention',
        periods=8
    )
    print(cohorts)

if __name__ == "__main__":
    asyncio.run(example_usage())