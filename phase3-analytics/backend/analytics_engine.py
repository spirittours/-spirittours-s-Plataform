#!/usr/bin/env python3
"""
AI Multi-Model Platform - Phase 3: Advanced Analytics Engine
Enterprise-grade analytics with Machine Learning predictive capabilities
"""

import asyncio
import logging
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, asdict
from enum import Enum
import aioredis
import asyncpg
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import plotly.graph_objects as go
import plotly.express as px
from plotly.utils import PlotlyJSONEncoder
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from transformers import pipeline
import torch
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AnalyticsType(Enum):
    PREDICTIVE = "predictive"
    DESCRIPTIVE = "descriptive"
    PRESCRIPTIVE = "prescriptive"
    DIAGNOSTIC = "diagnostic"
    REAL_TIME = "real_time"

class MetricType(Enum):
    USAGE = "usage"
    PERFORMANCE = "performance" 
    COST = "cost"
    USER_BEHAVIOR = "user_behavior"
    MODEL_ACCURACY = "model_accuracy"
    BUSINESS_KPI = "business_kpi"

@dataclass
class AnalyticsRequest:
    analysis_type: AnalyticsType
    metric_types: List[MetricType]
    time_range: Dict[str, str]
    filters: Dict[str, Any]
    prediction_horizon: Optional[int] = None
    confidence_level: float = 0.95
    include_recommendations: bool = True

@dataclass
class AnalyticsResult:
    request_id: str
    analysis_type: AnalyticsType
    timestamp: datetime
    metrics: Dict[str, Any]
    predictions: Optional[Dict[str, Any]] = None
    insights: List[str] = None
    recommendations: List[str] = None
    visualizations: Dict[str, str] = None
    confidence_score: float = 0.0
    processing_time: float = 0.0

class AdvancedAnalyticsEngine:
    """
    Enterprise-grade Analytics Engine with ML predictive capabilities
    """
    
    def __init__(self, 
                 db_config: Dict[str, str],
                 redis_config: Dict[str, str],
                 model_path: str = "./models"):
        self.db_config = db_config
        self.redis_config = redis_config
        self.model_path = model_path
        self.models = {}
        self.scalers = {}
        self.db_pool = None
        self.redis = None
        
        # ML Models initialization
        self.ml_models = {
            'usage_predictor': None,
            'cost_optimizer': None,
            'anomaly_detector': None,
            'performance_forecaster': None,
            'user_behavior_analyzer': None
        }
        
        # Sentiment analyzer for feedback analysis
        self.sentiment_analyzer = pipeline("sentiment-analysis", 
                                         model="cardiffnlp/twitter-roberta-base-sentiment-latest")
        
    async def initialize(self):
        """Initialize database connections and load ML models"""
        try:
            # Initialize database connection pool
            self.db_pool = await asyncpg.create_pool(**self.db_config)
            
            # Initialize Redis connection
            self.redis = await aioredis.create_redis_pool(
                f"redis://{self.redis_config['host']}:{self.redis_config['port']}"
            )
            
            # Load or create ML models
            await self._load_ml_models()
            
            logger.info("Analytics Engine initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Analytics Engine: {e}")
            raise
    
    async def _load_ml_models(self):
        """Load pre-trained ML models or create new ones"""
        try:
            # Usage Predictor Model (Random Forest)
            try:
                self.ml_models['usage_predictor'] = joblib.load(f"{self.model_path}/usage_predictor.pkl")
                self.scalers['usage'] = joblib.load(f"{self.model_path}/usage_scaler.pkl")
            except FileNotFoundError:
                logger.info("Creating new usage predictor model")
                self.ml_models['usage_predictor'] = RandomForestRegressor(
                    n_estimators=100, random_state=42, n_jobs=-1
                )
                self.scalers['usage'] = StandardScaler()
            
            # Cost Optimizer Model (Neural Network)
            try:
                self.ml_models['cost_optimizer'] = tf.keras.models.load_model(
                    f"{self.model_path}/cost_optimizer.h5"
                )
            except:
                logger.info("Creating new cost optimizer model")
                self.ml_models['cost_optimizer'] = self._create_cost_optimizer_model()
            
            # Anomaly Detector Model
            try:
                self.ml_models['anomaly_detector'] = joblib.load(
                    f"{self.model_path}/anomaly_detector.pkl"
                )
            except FileNotFoundError:
                logger.info("Creating new anomaly detector model")
                self.ml_models['anomaly_detector'] = IsolationForest(
                    contamination=0.1, random_state=42, n_jobs=-1
                )
            
            # Performance Forecaster (LSTM)
            try:
                self.ml_models['performance_forecaster'] = tf.keras.models.load_model(
                    f"{self.model_path}/performance_forecaster.h5"
                )
            except:
                logger.info("Creating new performance forecaster model")
                self.ml_models['performance_forecaster'] = self._create_lstm_model()
                
            logger.info("ML models loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading ML models: {e}")
    
    def _create_cost_optimizer_model(self) -> tf.keras.Model:
        """Create cost optimization neural network model"""
        model = Sequential([
            Dense(128, activation='relu', input_shape=(10,)),
            Dropout(0.3),
            Dense(64, activation='relu'),
            Dropout(0.2),
            Dense(32, activation='relu'),
            Dense(1, activation='linear')
        ])
        
        model.compile(
            optimizer='adam',
            loss='mse',
            metrics=['mae']
        )
        
        return model
    
    def _create_lstm_model(self) -> tf.keras.Model:
        """Create LSTM model for time series forecasting"""
        model = Sequential([
            LSTM(50, return_sequences=True, input_shape=(60, 1)),
            Dropout(0.2),
            LSTM(50, return_sequences=True),
            Dropout(0.2),
            LSTM(50),
            Dropout(0.2),
            Dense(1)
        ])
        
        model.compile(optimizer='adam', loss='mse')
        return model
    
    async def process_analytics_request(self, request: AnalyticsRequest) -> AnalyticsResult:
        """Process analytics request and return comprehensive results"""
        start_time = datetime.now()
        request_id = f"analytics_{int(start_time.timestamp())}"
        
        try:
            logger.info(f"Processing analytics request {request_id}")
            
            # Collect and prepare data
            data = await self._collect_analytics_data(request)
            
            # Process based on analysis type
            result = AnalyticsResult(
                request_id=request_id,
                analysis_type=request.analysis_type,
                timestamp=start_time,
                metrics={},
                insights=[],
                recommendations=[],
                visualizations={}
            )
            
            if request.analysis_type == AnalyticsType.PREDICTIVE:
                result = await self._process_predictive_analytics(request, data, result)
            elif request.analysis_type == AnalyticsType.DESCRIPTIVE:
                result = await self._process_descriptive_analytics(request, data, result)
            elif request.analysis_type == AnalyticsType.PRESCRIPTIVE:
                result = await self._process_prescriptive_analytics(request, data, result)
            elif request.analysis_type == AnalyticsType.DIAGNOSTIC:
                result = await self._process_diagnostic_analytics(request, data, result)
            elif request.analysis_type == AnalyticsType.REAL_TIME:
                result = await self._process_realtime_analytics(request, data, result)
            
            # Generate insights and recommendations
            if request.include_recommendations:
                result.insights = await self._generate_insights(data, result)
                result.recommendations = await self._generate_recommendations(data, result)
            
            # Create visualizations
            result.visualizations = await self._create_visualizations(data, result)
            
            # Calculate processing time
            result.processing_time = (datetime.now() - start_time).total_seconds()
            
            # Cache results
            await self._cache_results(result)
            
            logger.info(f"Analytics request {request_id} processed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Error processing analytics request {request_id}: {e}")
            raise
    
    async def _collect_analytics_data(self, request: AnalyticsRequest) -> pd.DataFrame:
        """Collect and prepare analytics data based on request parameters"""
        try:
            # Build query based on metric types and filters
            queries = []
            
            for metric_type in request.metric_types:
                if metric_type == MetricType.USAGE:
                    queries.append(self._build_usage_query(request))
                elif metric_type == MetricType.PERFORMANCE:
                    queries.append(self._build_performance_query(request))
                elif metric_type == MetricType.COST:
                    queries.append(self._build_cost_query(request))
                elif metric_type == MetricType.USER_BEHAVIOR:
                    queries.append(self._build_user_behavior_query(request))
                elif metric_type == MetricType.MODEL_ACCURACY:
                    queries.append(self._build_model_accuracy_query(request))
                elif metric_type == MetricType.BUSINESS_KPI:
                    queries.append(self._build_business_kpi_query(request))
            
            # Execute queries and combine data
            combined_data = pd.DataFrame()
            
            async with self.db_pool.acquire() as conn:
                for query in queries:
                    rows = await conn.fetch(query)
                    df = pd.DataFrame([dict(row) for row in rows])
                    
                    if combined_data.empty:
                        combined_data = df
                    else:
                        combined_data = pd.merge(combined_data, df, 
                                               on=['timestamp'], how='outer')
            
            # Clean and preprocess data
            combined_data = self._preprocess_data(combined_data)
            
            return combined_data
            
        except Exception as e:
            logger.error(f"Error collecting analytics data: {e}")
            raise
    
    def _build_usage_query(self, request: AnalyticsRequest) -> str:
        """Build usage metrics query"""
        base_query = """
        SELECT 
            DATE_TRUNC('hour', created_at) as timestamp,
            COUNT(*) as request_count,
            COUNT(DISTINCT user_id) as unique_users,
            AVG(processing_time) as avg_processing_time,
            SUM(tokens_used) as total_tokens,
            COUNT(DISTINCT model_id) as models_used
        FROM api_requests 
        WHERE created_at BETWEEN $1 AND $2
        """
        
        # Add filters
        if request.filters.get('user_id'):
            base_query += f" AND user_id = '{request.filters['user_id']}'"
        if request.filters.get('model_type'):
            base_query += f" AND model_type = '{request.filters['model_type']}'"
        
        base_query += " GROUP BY DATE_TRUNC('hour', created_at) ORDER BY timestamp"
        return base_query
    
    def _build_performance_query(self, request: AnalyticsRequest) -> str:
        """Build performance metrics query"""
        return """
        SELECT 
            DATE_TRUNC('hour', timestamp) as timestamp,
            AVG(response_time) as avg_response_time,
            AVG(cpu_usage) as avg_cpu_usage,
            AVG(memory_usage) as avg_memory_usage,
            AVG(error_rate) as avg_error_rate,
            COUNT(*) as total_requests
        FROM system_metrics 
        WHERE timestamp BETWEEN $1 AND $2
        GROUP BY DATE_TRUNC('hour', timestamp) 
        ORDER BY timestamp
        """
    
    def _build_cost_query(self, request: AnalyticsRequest) -> str:
        """Build cost metrics query"""
        return """
        SELECT 
            DATE_TRUNC('day', date) as timestamp,
            SUM(api_costs) as total_api_costs,
            SUM(infrastructure_costs) as total_infrastructure_costs,
            SUM(storage_costs) as total_storage_costs,
            AVG(cost_per_request) as avg_cost_per_request
        FROM cost_tracking 
        WHERE date BETWEEN $1 AND $2
        GROUP BY DATE_TRUNC('day', date) 
        ORDER BY timestamp
        """
    
    def _build_user_behavior_query(self, request: AnalyticsRequest) -> str:
        """Build user behavior metrics query"""
        return """
        SELECT 
            DATE_TRUNC('day', timestamp) as timestamp,
            COUNT(DISTINCT user_id) as active_users,
            AVG(session_duration) as avg_session_duration,
            COUNT(*) as total_sessions,
            AVG(requests_per_session) as avg_requests_per_session,
            COUNT(DISTINCT feature_used) as features_used
        FROM user_sessions 
        WHERE timestamp BETWEEN $1 AND $2
        GROUP BY DATE_TRUNC('day', timestamp) 
        ORDER BY timestamp
        """
    
    def _build_model_accuracy_query(self, request: AnalyticsRequest) -> str:
        """Build model accuracy metrics query"""
        return """
        SELECT 
            DATE_TRUNC('day', evaluation_date) as timestamp,
            model_name,
            AVG(accuracy_score) as avg_accuracy,
            AVG(precision_score) as avg_precision,
            AVG(recall_score) as avg_recall,
            AVG(f1_score) as avg_f1_score
        FROM model_evaluations 
        WHERE evaluation_date BETWEEN $1 AND $2
        GROUP BY DATE_TRUNC('day', evaluation_date), model_name 
        ORDER BY timestamp
        """
    
    def _build_business_kpi_query(self, request: AnalyticsRequest) -> str:
        """Build business KPI metrics query"""
        return """
        SELECT 
            DATE_TRUNC('day', date) as timestamp,
            SUM(revenue) as total_revenue,
            COUNT(DISTINCT customer_id) as active_customers,
            AVG(customer_satisfaction) as avg_satisfaction,
            SUM(new_signups) as new_signups,
            SUM(churn_count) as churned_customers
        FROM business_metrics 
        WHERE date BETWEEN $1 AND $2
        GROUP BY DATE_TRUNC('day', date) 
        ORDER BY timestamp
        """
    
    def _preprocess_data(self, data: pd.DataFrame) -> pd.DataFrame:
        """Clean and preprocess analytics data"""
        try:
            # Handle missing values
            data = data.fillna(method='forward').fillna(0)
            
            # Ensure timestamp column is datetime
            if 'timestamp' in data.columns:
                data['timestamp'] = pd.to_datetime(data['timestamp'])
                data = data.sort_values('timestamp')
            
            # Remove outliers using IQR method
            numeric_columns = data.select_dtypes(include=[np.number]).columns
            for col in numeric_columns:
                Q1 = data[col].quantile(0.25)
                Q3 = data[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                data[col] = data[col].clip(lower_bound, upper_bound)
            
            return data
            
        except Exception as e:
            logger.error(f"Error preprocessing data: {e}")
            return data
    
    async def _process_predictive_analytics(self, request: AnalyticsRequest, 
                                         data: pd.DataFrame, 
                                         result: AnalyticsResult) -> AnalyticsResult:
        """Process predictive analytics using ML models"""
        try:
            predictions = {}
            
            # Usage prediction
            if MetricType.USAGE in request.metric_types and 'request_count' in data.columns:
                usage_pred = await self._predict_usage(data, request.prediction_horizon)
                predictions['usage_forecast'] = usage_pred
            
            # Cost prediction
            if MetricType.COST in request.metric_types and 'total_api_costs' in data.columns:
                cost_pred = await self._predict_costs(data, request.prediction_horizon)
                predictions['cost_forecast'] = cost_pred
            
            # Performance prediction
            if MetricType.PERFORMANCE in request.metric_types and 'avg_response_time' in data.columns:
                perf_pred = await self._predict_performance(data, request.prediction_horizon)
                predictions['performance_forecast'] = perf_pred
            
            # Anomaly detection
            anomalies = await self._detect_anomalies(data)
            predictions['anomalies'] = anomalies
            
            result.predictions = predictions
            result.confidence_score = self._calculate_confidence_score(predictions)
            
            # Store predictions for future model training
            await self._store_predictions(predictions)
            
            return result
            
        except Exception as e:
            logger.error(f"Error in predictive analytics: {e}")
            return result
    
    async def _predict_usage(self, data: pd.DataFrame, horizon: int) -> Dict[str, Any]:
        """Predict future usage patterns"""
        try:
            if len(data) < 24:  # Need at least 24 hours of data
                return {"error": "Insufficient data for prediction"}
            
            # Prepare features
            features = self._extract_usage_features(data)
            
            if self.ml_models['usage_predictor'] is None:
                # Train model if not exists
                await self._train_usage_predictor(features)
            
            # Make predictions
            X = features[['hour', 'day_of_week', 'rolling_mean_24h', 'trend', 'seasonality']].tail(1)
            X_scaled = self.scalers['usage'].transform(X)
            
            predictions = []
            current_features = X_scaled[0]
            
            for i in range(horizon or 24):
                pred = self.ml_models['usage_predictor'].predict([current_features])[0]
                predictions.append(max(0, pred))  # Ensure non-negative
                
                # Update features for next prediction
                current_features[0] = (current_features[0] + 1) % 24  # Next hour
            
            return {
                'predictions': predictions,
                'horizon_hours': len(predictions),
                'confidence_intervals': self._calculate_confidence_intervals(predictions),
                'model_score': getattr(self.ml_models['usage_predictor'], 'score_', 0.0)
            }
            
        except Exception as e:
            logger.error(f"Error predicting usage: {e}")
            return {"error": str(e)}
    
    async def _predict_costs(self, data: pd.DataFrame, horizon: int) -> Dict[str, Any]:
        """Predict future costs using neural network"""
        try:
            if len(data) < 7:  # Need at least 7 days of data
                return {"error": "Insufficient data for cost prediction"}
            
            # Prepare cost features
            features = self._extract_cost_features(data)
            
            # Prepare data for neural network
            X = features[['daily_requests', 'avg_tokens', 'unique_users', 'error_rate',
                         'peak_hour_ratio', 'weekend_factor', 'growth_rate', 'seasonality',
                         'cost_trend', 'efficiency_score']].values
            
            if len(X) < 10:
                return {"error": "Insufficient feature data"}
            
            # Scale features
            X_scaled = StandardScaler().fit_transform(X)
            
            # Make predictions
            predictions = []
            for i in range(horizon or 7):
                input_features = X_scaled[-1:] if i == 0 else X_scaled[-1:] * (1 + 0.01 * i)
                pred = self.ml_models['cost_optimizer'].predict(input_features)[0][0]
                predictions.append(max(0, pred))
            
            # Calculate cost optimization recommendations
            optimization_potential = self._calculate_cost_optimization(data, predictions)
            
            return {
                'cost_predictions': predictions,
                'horizon_days': len(predictions),
                'total_predicted_cost': sum(predictions),
                'optimization_potential': optimization_potential,
                'cost_trends': self._analyze_cost_trends(data)
            }
            
        except Exception as e:
            logger.error(f"Error predicting costs: {e}")
            return {"error": str(e)}
    
    async def _predict_performance(self, data: pd.DataFrame, horizon: int) -> Dict[str, Any]:
        """Predict future performance metrics"""
        try:
            if len(data) < 60:  # Need at least 60 data points for LSTM
                return {"error": "Insufficient data for performance prediction"}
            
            # Prepare time series data
            response_times = data['avg_response_time'].values.reshape(-1, 1)
            
            # Normalize data
            scaler = StandardScaler()
            scaled_data = scaler.fit_transform(response_times)
            
            # Create sequences for LSTM
            sequence_length = 60
            X, y = [], []
            
            for i in range(sequence_length, len(scaled_data)):
                X.append(scaled_data[i-sequence_length:i, 0])
                y.append(scaled_data[i, 0])
            
            if len(X) == 0:
                return {"error": "Unable to create sequences"}
            
            X = np.array(X).reshape(-1, sequence_length, 1)
            
            # Make predictions
            last_sequence = X[-1:]
            predictions = []
            
            for i in range(horizon or 24):
                pred = self.ml_models['performance_forecaster'].predict(last_sequence)[0][0]
                predictions.append(pred)
                
                # Update sequence
                last_sequence = np.roll(last_sequence, -1, axis=1)
                last_sequence[0, -1, 0] = pred
            
            # Denormalize predictions
            predictions = scaler.inverse_transform(np.array(predictions).reshape(-1, 1)).flatten()
            
            # Detect performance bottlenecks
            bottlenecks = self._detect_performance_bottlenecks(data, predictions)
            
            return {
                'performance_predictions': predictions.tolist(),
                'horizon_hours': len(predictions),
                'bottlenecks': bottlenecks,
                'performance_score': self._calculate_performance_score(data)
            }
            
        except Exception as e:
            logger.error(f"Error predicting performance: {e}")
            return {"error": str(e)}
    
    async def _detect_anomalies(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Detect anomalies in the data using Isolation Forest"""
        try:
            # Select numeric columns for anomaly detection
            numeric_data = data.select_dtypes(include=[np.number])
            
            if numeric_data.empty:
                return {"anomalies": [], "anomaly_score": 0.0}
            
            # Fit anomaly detector
            self.ml_models['anomaly_detector'].fit(numeric_data.fillna(0))
            
            # Predict anomalies
            anomaly_labels = self.ml_models['anomaly_detector'].predict(numeric_data.fillna(0))
            anomaly_scores = self.ml_models['anomaly_detector'].score_samples(numeric_data.fillna(0))
            
            # Identify anomalous points
            anomalies = []
            for i, (label, score) in enumerate(zip(anomaly_labels, anomaly_scores)):
                if label == -1:  # Anomaly
                    anomaly_data = {
                        'index': i,
                        'timestamp': data.iloc[i]['timestamp'].isoformat() if 'timestamp' in data.columns else None,
                        'anomaly_score': float(score),
                        'affected_metrics': {}
                    }
                    
                    # Identify which metrics are anomalous
                    for col in numeric_data.columns:
                        value = numeric_data.iloc[i][col]
                        col_mean = numeric_data[col].mean()
                        col_std = numeric_data[col].std()
                        
                        if abs(value - col_mean) > 2 * col_std:  # 2 standard deviations
                            anomaly_data['affected_metrics'][col] = {
                                'value': float(value),
                                'expected_range': [float(col_mean - 2*col_std), 
                                                 float(col_mean + 2*col_std)]
                            }
                    
                    anomalies.append(anomaly_data)
            
            return {
                'anomalies': anomalies,
                'total_anomalies': len(anomalies),
                'anomaly_rate': len(anomalies) / len(data) if len(data) > 0 else 0,
                'severity': 'high' if len(anomalies) > len(data) * 0.1 else 'medium' if len(anomalies) > 0 else 'low'
            }
            
        except Exception as e:
            logger.error(f"Error detecting anomalies: {e}")
            return {"error": str(e)}
    
    def _extract_usage_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """Extract features for usage prediction"""
        features = data.copy()
        
        if 'timestamp' in features.columns:
            features['hour'] = features['timestamp'].dt.hour
            features['day_of_week'] = features['timestamp'].dt.dayofweek
            features['is_weekend'] = features['day_of_week'].isin([5, 6]).astype(int)
        
        if 'request_count' in features.columns:
            # Rolling averages
            features['rolling_mean_24h'] = features['request_count'].rolling(24).mean()
            features['rolling_std_24h'] = features['request_count'].rolling(24).std()
            
            # Trend analysis
            features['trend'] = features['request_count'].diff()
            features['seasonality'] = features['request_count'] - features['rolling_mean_24h']
        
        return features.fillna(0)
    
    def _extract_cost_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """Extract features for cost prediction"""
        features = data.copy()
        
        # Calculate derived metrics
        if 'total_api_costs' in features.columns and 'request_count' in data.columns:
            features['cost_per_request'] = features['total_api_costs'] / features['request_count']
            features['cost_efficiency'] = 1 / (features['cost_per_request'] + 1e-6)
        
        # Add temporal features
        if 'timestamp' in features.columns:
            features['day_of_week'] = features['timestamp'].dt.dayofweek
            features['weekend_factor'] = features['day_of_week'].isin([5, 6]).astype(float)
        
        # Rolling statistics
        numeric_cols = ['total_api_costs', 'total_infrastructure_costs', 'total_storage_costs']
        for col in numeric_cols:
            if col in features.columns:
                features[f'{col}_rolling_mean'] = features[col].rolling(7).mean()
                features[f'{col}_growth_rate'] = features[col].pct_change()
        
        return features.fillna(0)
    
    def _calculate_confidence_intervals(self, predictions: List[float]) -> Dict[str, List[float]]:
        """Calculate confidence intervals for predictions"""
        predictions_array = np.array(predictions)
        
        # Simple confidence interval based on standard deviation
        std_dev = np.std(predictions_array)
        mean_pred = np.mean(predictions_array)
        
        lower_bound = (predictions_array - 1.96 * std_dev).tolist()
        upper_bound = (predictions_array + 1.96 * std_dev).tolist()
        
        return {
            'lower_bound': lower_bound,
            'upper_bound': upper_bound,
            'confidence_level': 0.95
        }
    
    def _calculate_confidence_score(self, predictions: Dict[str, Any]) -> float:
        """Calculate overall confidence score for predictions"""
        scores = []
        
        for pred_type, pred_data in predictions.items():
            if isinstance(pred_data, dict):
                if 'model_score' in pred_data:
                    scores.append(pred_data['model_score'])
                elif 'error' not in pred_data:
                    scores.append(0.8)  # Default confidence for successful predictions
        
        return np.mean(scores) if scores else 0.0
    
    async def _generate_insights(self, data: pd.DataFrame, result: AnalyticsResult) -> List[str]:
        """Generate AI-powered insights from analytics results"""
        insights = []
        
        try:
            # Usage insights
            if 'request_count' in data.columns:
                avg_requests = data['request_count'].mean()
                peak_requests = data['request_count'].max()
                
                if peak_requests > avg_requests * 2:
                    insights.append(f"Peak usage is {peak_requests/avg_requests:.1f}x higher than average, indicating significant load variability")
                
                growth_rate = data['request_count'].pct_change().mean() * 100
                if growth_rate > 5:
                    insights.append(f"Usage is growing at {growth_rate:.1f}% per period - consider scaling preparations")
            
            # Cost insights
            if 'total_api_costs' in data.columns and len(data) > 7:
                recent_costs = data['total_api_costs'].tail(7).sum()
                previous_costs = data['total_api_costs'].iloc[-14:-7].sum()
                
                if recent_costs > previous_costs * 1.2:
                    insights.append(f"Costs increased by {((recent_costs/previous_costs-1)*100):.1f}% in the last week")
                elif recent_costs < previous_costs * 0.8:
                    insights.append(f"Costs decreased by {((1-recent_costs/previous_costs)*100):.1f}% - good optimization results")
            
            # Performance insights
            if 'avg_response_time' in data.columns:
                avg_response = data['avg_response_time'].mean()
                if avg_response > 1000:  # ms
                    insights.append(f"Average response time of {avg_response:.0f}ms is above optimal threshold (1000ms)")
            
            # Anomaly insights
            if result.predictions and 'anomalies' in result.predictions:
                anomaly_data = result.predictions['anomalies']
                if anomaly_data.get('total_anomalies', 0) > 0:
                    insights.append(f"Detected {anomaly_data['total_anomalies']} anomalies with {anomaly_data['severity']} severity")
            
            return insights
            
        except Exception as e:
            logger.error(f"Error generating insights: {e}")
            return ["Unable to generate insights due to data processing error"]
    
    async def _generate_recommendations(self, data: pd.DataFrame, result: AnalyticsResult) -> List[str]:
        """Generate actionable recommendations based on analytics results"""
        recommendations = []
        
        try:
            # Usage recommendations
            if result.predictions and 'usage_forecast' in result.predictions:
                usage_pred = result.predictions['usage_forecast']
                if isinstance(usage_pred, dict) and 'predictions' in usage_pred:
                    max_predicted = max(usage_pred['predictions'])
                    current_avg = data['request_count'].mean() if 'request_count' in data.columns else 0
                    
                    if max_predicted > current_avg * 1.5:
                        recommendations.append(
                            f"Scale infrastructure by {((max_predicted/current_avg-1)*100):.0f}% to handle predicted peak load"
                        )
            
            # Cost recommendations
            if result.predictions and 'cost_forecast' in result.predictions:
                cost_pred = result.predictions['cost_forecast']
                if isinstance(cost_pred, dict) and 'optimization_potential' in cost_pred:
                    savings = cost_pred['optimization_potential']
                    if savings > 0:
                        recommendations.append(
                            f"Potential cost savings of ${savings:.2f} through load balancing optimization"
                        )
            
            # Performance recommendations
            if 'avg_response_time' in data.columns:
                response_times = data['avg_response_time']
                if response_times.std() > response_times.mean() * 0.5:
                    recommendations.append(
                        "High response time variability detected - implement caching strategy"
                    )
            
            # Security recommendations
            if result.predictions and 'anomalies' in result.predictions:
                anomalies = result.predictions['anomalies']
                if anomalies.get('anomaly_rate', 0) > 0.05:
                    recommendations.append(
                        "High anomaly rate detected - review security monitoring and implement additional safeguards"
                    )
            
            # General optimization recommendations
            if len(data) > 0:
                recommendations.append(
                    "Schedule regular model retraining to maintain prediction accuracy"
                )
                
                recommendations.append(
                    "Implement automated alerting for detected anomalies and threshold breaches"
                )
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return ["Unable to generate recommendations due to processing error"]
    
    async def _create_visualizations(self, data: pd.DataFrame, result: AnalyticsResult) -> Dict[str, str]:
        """Create interactive visualizations using Plotly"""
        visualizations = {}
        
        try:
            # Usage trend visualization
            if 'request_count' in data.columns and 'timestamp' in data.columns:
                fig = px.line(data, x='timestamp', y='request_count', 
                             title='Usage Trends Over Time')
                fig.update_layout(
                    xaxis_title="Time",
                    yaxis_title="Request Count",
                    template="plotly_white"
                )
                visualizations['usage_trend'] = json.dumps(fig, cls=PlotlyJSONEncoder)
            
            # Cost analysis visualization
            cost_columns = ['total_api_costs', 'total_infrastructure_costs', 'total_storage_costs']
            available_cost_cols = [col for col in cost_columns if col in data.columns]
            
            if available_cost_cols and 'timestamp' in data.columns:
                fig = go.Figure()
                
                for col in available_cost_cols:
                    fig.add_trace(go.Scatter(
                        x=data['timestamp'],
                        y=data[col],
                        name=col.replace('_', ' ').title(),
                        mode='lines+markers'
                    ))
                
                fig.update_layout(
                    title='Cost Breakdown Over Time',
                    xaxis_title="Time",
                    yaxis_title="Cost ($)",
                    template="plotly_white"
                )
                visualizations['cost_analysis'] = json.dumps(fig, cls=PlotlyJSONEncoder)
            
            # Performance heatmap
            if 'avg_response_time' in data.columns and 'timestamp' in data.columns:
                # Create hourly performance heatmap
                data_copy = data.copy()
                data_copy['hour'] = data_copy['timestamp'].dt.hour
                data_copy['day'] = data_copy['timestamp'].dt.date
                
                pivot_data = data_copy.pivot_table(
                    values='avg_response_time', 
                    index='day', 
                    columns='hour', 
                    aggfunc='mean'
                )
                
                fig = px.imshow(
                    pivot_data,
                    title='Response Time Heatmap (Hour vs Day)',
                    labels=dict(x="Hour", y="Day", color="Response Time (ms)")
                )
                visualizations['performance_heatmap'] = json.dumps(fig, cls=PlotlyJSONEncoder)
            
            # Prediction visualization
            if result.predictions:
                for pred_type, pred_data in result.predictions.items():
                    if isinstance(pred_data, dict) and 'predictions' in pred_data:
                        predictions = pred_data['predictions']
                        
                        # Create future timestamps
                        last_timestamp = data['timestamp'].max() if 'timestamp' in data.columns else datetime.now()
                        future_timestamps = [
                            last_timestamp + timedelta(hours=i) for i in range(1, len(predictions) + 1)
                        ]
                        
                        fig = go.Figure()
                        
                        # Historical data
                        if pred_type == 'usage_forecast' and 'request_count' in data.columns:
                            fig.add_trace(go.Scatter(
                                x=data['timestamp'],
                                y=data['request_count'],
                                name='Historical',
                                mode='lines'
                            ))
                            
                            # Predictions
                            fig.add_trace(go.Scatter(
                                x=future_timestamps,
                                y=predictions,
                                name='Predicted',
                                mode='lines',
                                line=dict(dash='dash')
                            ))
                            
                            # Confidence intervals
                            if 'confidence_intervals' in pred_data:
                                ci = pred_data['confidence_intervals']
                                fig.add_trace(go.Scatter(
                                    x=future_timestamps + future_timestamps[::-1],
                                    y=ci['upper_bound'] + ci['lower_bound'][::-1],
                                    fill='toself',
                                    fillcolor='rgba(0,100,80,0.2)',
                                    line=dict(color='rgba(255,255,255,0)'),
                                    name='Confidence Interval'
                                ))
                        
                        fig.update_layout(
                            title=f'{pred_type.replace("_", " ").title()} Forecast',
                            xaxis_title="Time",
                            yaxis_title="Value",
                            template="plotly_white"
                        )
                        visualizations[f'{pred_type}_forecast'] = json.dumps(fig, cls=PlotlyJSONEncoder)
            
            return visualizations
            
        except Exception as e:
            logger.error(f"Error creating visualizations: {e}")
            return {}
    
    async def _cache_results(self, result: AnalyticsResult):
        """Cache analytics results in Redis"""
        try:
            cache_key = f"analytics:{result.request_id}"
            cache_data = {
                'result': asdict(result),
                'cached_at': datetime.now().isoformat()
            }
            
            await self.redis.setex(
                cache_key, 
                3600,  # 1 hour TTL
                json.dumps(cache_data, default=str)
            )
            
        except Exception as e:
            logger.error(f"Error caching results: {e}")
    
    async def get_cached_results(self, request_id: str) -> Optional[AnalyticsResult]:
        """Retrieve cached analytics results"""
        try:
            cache_key = f"analytics:{request_id}"
            cached_data = await self.redis.get(cache_key)
            
            if cached_data:
                data = json.loads(cached_data)
                return AnalyticsResult(**data['result'])
            
            return None
            
        except Exception as e:
            logger.error(f"Error retrieving cached results: {e}")
            return None
    
    async def train_models_with_new_data(self):
        """Retrain ML models with latest data"""
        try:
            logger.info("Starting model retraining with new data")
            
            # Collect latest data for training
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)  # Last 30 days
            
            request = AnalyticsRequest(
                analysis_type=AnalyticsType.DESCRIPTIVE,
                metric_types=[MetricType.USAGE, MetricType.COST, MetricType.PERFORMANCE],
                time_range={
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                filters={}
            )
            
            training_data = await self._collect_analytics_data(request)
            
            # Retrain usage predictor
            await self._train_usage_predictor(training_data)
            
            # Retrain cost optimizer
            await self._train_cost_optimizer(training_data)
            
            # Retrain anomaly detector
            await self._train_anomaly_detector(training_data)
            
            # Save updated models
            await self._save_models()
            
            logger.info("Model retraining completed successfully")
            
        except Exception as e:
            logger.error(f"Error during model retraining: {e}")
    
    async def _train_usage_predictor(self, data: pd.DataFrame):
        """Train the usage prediction model"""
        try:
            if 'request_count' not in data.columns or len(data) < 48:
                logger.warning("Insufficient data for usage predictor training")
                return
            
            # Extract features
            features = self._extract_usage_features(data)
            
            # Prepare training data
            feature_cols = ['hour', 'day_of_week', 'rolling_mean_24h', 'trend', 'seasonality']
            X = features[feature_cols].dropna()
            y = features['request_count'].loc[X.index]
            
            if len(X) < 10:
                logger.warning("Insufficient feature data for training")
                return
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            # Scale features
            self.scalers['usage'].fit(X_train)
            X_train_scaled = self.scalers['usage'].transform(X_train)
            X_test_scaled = self.scalers['usage'].transform(X_test)
            
            # Train model
            self.ml_models['usage_predictor'].fit(X_train_scaled, y_train)
            
            # Evaluate model
            train_score = self.ml_models['usage_predictor'].score(X_train_scaled, y_train)
            test_score = self.ml_models['usage_predictor'].score(X_test_scaled, y_test)
            
            logger.info(f"Usage predictor trained - Train score: {train_score:.3f}, Test score: {test_score:.3f}")
            
        except Exception as e:
            logger.error(f"Error training usage predictor: {e}")
    
    async def _train_cost_optimizer(self, data: pd.DataFrame):
        """Train the cost optimization model"""
        try:
            if 'total_api_costs' not in data.columns or len(data) < 14:
                logger.warning("Insufficient data for cost optimizer training")
                return
            
            # Extract features
            features = self._extract_cost_features(data)
            
            # Prepare training data
            feature_cols = ['daily_requests', 'avg_tokens', 'unique_users', 'error_rate',
                           'peak_hour_ratio', 'weekend_factor', 'growth_rate', 'seasonality',
                           'cost_trend', 'efficiency_score']
            
            # Create derived features
            if 'request_count' in data.columns:
                features['daily_requests'] = features['request_count']
            else:
                features['daily_requests'] = 0
                
            # Fill missing derived features with defaults
            for col in feature_cols:
                if col not in features.columns:
                    features[col] = 0
            
            X = features[feature_cols].dropna()
            y = features['total_api_costs'].loc[X.index]
            
            if len(X) < 5:
                logger.warning("Insufficient feature data for cost optimizer training")
                return
            
            # Scale features
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            
            # Train neural network
            self.ml_models['cost_optimizer'].fit(
                X_scaled, y,
                epochs=100,
                batch_size=min(32, len(X)),
                verbose=0,
                validation_split=0.2
            )
            
            logger.info("Cost optimizer model trained successfully")
            
        except Exception as e:
            logger.error(f"Error training cost optimizer: {e}")
    
    async def _train_anomaly_detector(self, data: pd.DataFrame):
        """Train the anomaly detection model"""
        try:
            # Select numeric columns
            numeric_data = data.select_dtypes(include=[np.number]).dropna()
            
            if numeric_data.empty or len(numeric_data) < 10:
                logger.warning("Insufficient data for anomaly detector training")
                return
            
            # Train isolation forest
            self.ml_models['anomaly_detector'].fit(numeric_data)
            
            logger.info("Anomaly detector trained successfully")
            
        except Exception as e:
            logger.error(f"Error training anomaly detector: {e}")
    
    async def _save_models(self):
        """Save trained models to disk"""
        try:
            import os
            os.makedirs(self.model_path, exist_ok=True)
            
            # Save scikit-learn models
            if self.ml_models['usage_predictor']:
                joblib.dump(self.ml_models['usage_predictor'], 
                           f"{self.model_path}/usage_predictor.pkl")
                
            if self.scalers['usage']:
                joblib.dump(self.scalers['usage'], 
                           f"{self.model_path}/usage_scaler.pkl")
                
            if self.ml_models['anomaly_detector']:
                joblib.dump(self.ml_models['anomaly_detector'], 
                           f"{self.model_path}/anomaly_detector.pkl")
            
            # Save TensorFlow models
            if self.ml_models['cost_optimizer']:
                self.ml_models['cost_optimizer'].save(f"{self.model_path}/cost_optimizer.h5")
                
            if self.ml_models['performance_forecaster']:
                self.ml_models['performance_forecaster'].save(f"{self.model_path}/performance_forecaster.h5")
            
            logger.info("Models saved successfully")
            
        except Exception as e:
            logger.error(f"Error saving models: {e}")
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            if self.db_pool:
                await self.db_pool.close()
            
            if self.redis:
                self.redis.close()
                await self.redis.wait_closed()
                
            logger.info("Analytics Engine cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")


# Analytics API endpoints
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
import uvicorn

app = FastAPI(title="AI Analytics Engine API", version="1.0.0")

# Global analytics engine instance
analytics_engine: Optional[AdvancedAnalyticsEngine] = None

@app.on_event("startup")
async def startup_event():
    global analytics_engine
    
    db_config = {
        'host': 'localhost',
        'port': 5432,
        'database': 'ai_platform',
        'user': 'postgres',
        'password': 'postgres'
    }
    
    redis_config = {
        'host': 'localhost',
        'port': 6379
    }
    
    analytics_engine = AdvancedAnalyticsEngine(db_config, redis_config)
    await analytics_engine.initialize()

@app.on_event("shutdown")
async def shutdown_event():
    global analytics_engine
    if analytics_engine:
        await analytics_engine.cleanup()

@app.post("/api/v1/analytics/analyze")
async def analyze_data(request_data: dict):
    """Process analytics request"""
    try:
        request = AnalyticsRequest(**request_data)
        result = await analytics_engine.process_analytics_request(request)
        return JSONResponse(content=asdict(result))
        
    except Exception as e:
        logger.error(f"Error in analyze endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/analytics/results/{request_id}")
async def get_results(request_id: str):
    """Get cached analytics results"""
    try:
        result = await analytics_engine.get_cached_results(request_id)
        
        if result:
            return JSONResponse(content=asdict(result))
        else:
            raise HTTPException(status_code=404, detail="Results not found")
            
    except Exception as e:
        logger.error(f"Error retrieving results: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/analytics/train")
async def train_models(background_tasks: BackgroundTasks):
    """Trigger model retraining"""
    try:
        background_tasks.add_task(analytics_engine.train_models_with_new_data)
        return {"message": "Model training started", "status": "success"}
        
    except Exception as e:
        logger.error(f"Error starting model training: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/analytics/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

if __name__ == "__main__":
    uvicorn.run("analytics_engine:app", host="0.0.0.0", port=8001, reload=True)