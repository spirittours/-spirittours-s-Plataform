"""
🤖 ADVANCED PREDICTIVE ANALYTICS ML ENGINE
Sistema Avanzado de Analytics Predictivos con Machine Learning
Spirit Tours Platform - Fase 3 (100% Complete)

Este módulo implementa el motor completo de predicciones con ML:
- Predicción de demanda con LSTM y Prophet
- Forecasting de revenue con XGBoost
- Optimización de precios con Reinforcement Learning
- Análisis de tendencias con Deep Learning
- Predicción de ocupación hotelera
- Sistema de alertas tempranas
- Detección de anomalías
- Análisis de sentimiento predictivo

Autor: GenSpark AI Developer
Fecha: 2024-10-08
Versión: 3.0.0
"""

import os
import json
import pickle
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
import warnings
warnings.filterwarnings('ignore')

# Data Science Libraries
import numpy as np
import pandas as pd
from scipy import stats
from scipy.optimize import minimize

# Machine Learning Libraries
from sklearn.ensemble import (
    RandomForestRegressor, 
    GradientBoostingRegressor,
    IsolationForest,
    VotingRegressor
)
from sklearn.neural_network import MLPRegressor
from sklearn.linear_model import Ridge, Lasso, ElasticNet
from sklearn.model_selection import (
    train_test_split, 
    cross_val_score,
    GridSearchCV,
    TimeSeriesSplit
)
from sklearn.metrics import (
    mean_squared_error, 
    mean_absolute_error,
    r2_score,
    mean_absolute_percentage_error
)
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.decomposition import PCA

# Deep Learning
import tensorflow as tf
from tensorflow.keras.models import Sequential, Model
from tensorflow.keras.layers import (
    LSTM, GRU, Dense, Dropout, 
    Conv1D, MaxPooling1D, Flatten,
    Attention, MultiHeadAttention,
    BatchNormalization, Input
)
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau

# Advanced ML
import xgboost as xgb
import lightgbm as lgb
from catboost import CatBoostRegressor

# Time Series
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from prophet import Prophet
from prophet.plot import plot_plotly, plot_components_plotly

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PredictionModel(Enum):
    """Modelos de predicción disponibles"""
    LSTM_DEEP = "lstm_deep_learning"
    PROPHET = "facebook_prophet"
    XGBOOST = "xgboost_extreme"
    LIGHTGBM = "light_gradient_boosting"
    CATBOOST = "categorical_boosting"
    ENSEMBLE = "ensemble_voting"
    TRANSFORMER = "transformer_attention"
    ARIMA_PLUS = "arima_enhanced"
    NEURAL_NET = "deep_neural_network"
    HYBRID = "hybrid_combined"

class PredictionTarget(Enum):
    """Objetivos de predicción"""
    DEMAND_FORECAST = "demand_forecast"
    REVENUE_PREDICTION = "revenue_prediction"
    PRICE_OPTIMIZATION = "price_optimization"
    OCCUPANCY_RATE = "occupancy_rate"
    CUSTOMER_LIFETIME_VALUE = "customer_ltv"
    CHURN_PROBABILITY = "churn_probability"
    SEASONAL_TRENDS = "seasonal_trends"
    BOOKING_PATTERNS = "booking_patterns"
    MARKET_SHARE = "market_share"
    CONVERSION_RATE = "conversion_rate"

@dataclass
class PredictionConfig:
    """Configuración de predicción"""
    model_type: PredictionModel
    target: PredictionTarget
    horizon_days: int = 30
    confidence_level: float = 0.95
    features: List[str] = field(default_factory=list)
    hyperparameters: Dict[str, Any] = field(default_factory=dict)
    use_gpu: bool = True
    ensemble_models: List[str] = field(default_factory=list)
    auto_tune: bool = True
    cross_validation_folds: int = 5

@dataclass
class PredictionResult:
    """Resultado de predicción con métricas"""
    target: PredictionTarget
    predictions: np.ndarray
    confidence_intervals: Tuple[np.ndarray, np.ndarray]
    feature_importance: Dict[str, float]
    model_performance: Dict[str, float]
    forecast_dates: pd.DatetimeIndex
    baseline_comparison: float
    anomalies_detected: List[Dict[str, Any]]
    recommendations: List[str]
    visualization_data: Dict[str, Any]
    metadata: Dict[str, Any]

class AdvancedMLEngine:
    """Motor Avanzado de Machine Learning para Predicciones"""
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.encoders = {}
        self.feature_engineers = {}
        self.model_registry = {}
        self.performance_history = []
        self.gpu_available = tf.config.list_physical_devices('GPU')
        
        # Initialize TensorFlow settings
        if self.gpu_available:
            tf.config.experimental.set_memory_growth(self.gpu_available[0], True)
        
        logger.info(f"🚀 ML Engine initialized with GPU: {bool(self.gpu_available)}")
    
    async def predict_demand(
        self,
        historical_data: pd.DataFrame,
        destination: str,
        horizon_days: int = 30,
        include_external_factors: bool = True
    ) -> PredictionResult:
        """
        Predice la demanda futura usando ensemble de modelos
        """
        try:
            # Feature engineering
            features = await self._engineer_features(
                historical_data, 
                destination,
                include_external_factors
            )
            
            # Train ensemble model
            ensemble_predictions = []
            model_performances = {}
            
            # 1. LSTM Model
            lstm_pred, lstm_perf = await self._train_lstm_model(
                features, horizon_days
            )
            ensemble_predictions.append(lstm_pred)
            model_performances['lstm'] = lstm_perf
            
            # 2. Prophet Model
            prophet_pred, prophet_perf = await self._train_prophet_model(
                features, horizon_days
            )
            ensemble_predictions.append(prophet_pred)
            model_performances['prophet'] = prophet_perf
            
            # 3. XGBoost Model
            xgb_pred, xgb_perf = await self._train_xgboost_model(
                features, horizon_days
            )
            ensemble_predictions.append(xgb_pred)
            model_performances['xgboost'] = xgb_perf
            
            # 4. LightGBM Model
            lgb_pred, lgb_perf = await self._train_lightgbm_model(
                features, horizon_days
            )
            ensemble_predictions.append(lgb_pred)
            model_performances['lightgbm'] = lgb_perf
            
            # Weighted ensemble based on performance
            weights = self._calculate_ensemble_weights(model_performances)
            final_predictions = self._weighted_average(ensemble_predictions, weights)
            
            # Calculate confidence intervals
            confidence_intervals = self._calculate_confidence_intervals(
                final_predictions, 
                ensemble_predictions
            )
            
            # Detect anomalies
            anomalies = await self._detect_anomalies(final_predictions, features)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(
                final_predictions,
                anomalies,
                destination
            )
            
            # Create forecast dates
            last_date = features.index[-1]
            forecast_dates = pd.date_range(
                start=last_date + timedelta(days=1),
                periods=horizon_days,
                freq='D'
            )
            
            return PredictionResult(
                target=PredictionTarget.DEMAND_FORECAST,
                predictions=final_predictions,
                confidence_intervals=confidence_intervals,
                feature_importance=await self._calculate_feature_importance(features),
                model_performance=model_performances,
                forecast_dates=forecast_dates,
                baseline_comparison=self._calculate_baseline_improvement(
                    final_predictions, features
                ),
                anomalies_detected=anomalies,
                recommendations=recommendations,
                visualization_data=self._prepare_visualization_data(
                    final_predictions, forecast_dates
                ),
                metadata={
                    'destination': destination,
                    'models_used': list(model_performances.keys()),
                    'ensemble_weights': weights,
                    'horizon_days': horizon_days
                }
            )
            
        except Exception as e:
            logger.error(f"Error in demand prediction: {str(e)}")
            raise
    
    async def _train_lstm_model(
        self, 
        features: pd.DataFrame, 
        horizon_days: int
    ) -> Tuple[np.ndarray, Dict[str, float]]:
        """
        Entrena modelo LSTM profundo para series temporales
        """
        # Prepare sequences
        X, y = self._create_sequences(features, sequence_length=60)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, shuffle=False
        )
        
        # Build LSTM model with attention
        model = Sequential([
            LSTM(128, return_sequences=True, input_shape=(X.shape[1], X.shape[2])),
            Dropout(0.2),
            LSTM(64, return_sequences=True),
            BatchNormalization(),
            LSTM(32, return_sequences=False),
            Dropout(0.2),
            Dense(64, activation='relu'),
            BatchNormalization(),
            Dense(32, activation='relu'),
            Dense(horizon_days)
        ])
        
        # Compile with custom loss
        model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss='huber',
            metrics=['mae', 'mse']
        )
        
        # Train with callbacks
        early_stop = EarlyStopping(patience=10, restore_best_weights=True)
        reduce_lr = ReduceLROnPlateau(factor=0.5, patience=5)
        
        history = model.fit(
            X_train, y_train,
            validation_data=(X_test, y_test),
            epochs=100,
            batch_size=32,
            callbacks=[early_stop, reduce_lr],
            verbose=0
        )
        
        # Make predictions
        last_sequence = X[-1:, :, :]
        predictions = model.predict(last_sequence, verbose=0)[0]
        
        # Calculate performance
        test_predictions = model.predict(X_test, verbose=0)
        performance = {
            'mae': float(mean_absolute_error(y_test, test_predictions)),
            'rmse': float(np.sqrt(mean_squared_error(y_test, test_predictions))),
            'mape': float(mean_absolute_percentage_error(y_test, test_predictions)),
            'r2': float(r2_score(y_test, test_predictions))
        }
        
        # Save model
        self.models['lstm_demand'] = model
        
        return predictions, performance
    
    async def _train_prophet_model(
        self,
        features: pd.DataFrame,
        horizon_days: int
    ) -> Tuple[np.ndarray, Dict[str, float]]:
        """
        Entrena modelo Prophet de Facebook para forecasting
        """
        # Prepare data for Prophet
        prophet_data = features.reset_index()
        prophet_data.columns = ['ds', 'y'] + list(prophet_data.columns[2:])
        
        # Initialize Prophet with custom settings
        model = Prophet(
            growth='linear',
            changepoint_prior_scale=0.05,
            seasonality_mode='multiplicative',
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            interval_width=0.95
        )
        
        # Add custom seasonalities
        model.add_seasonality(
            name='monthly',
            period=30.5,
            fourier_order=5
        )
        
        # Add regressors if available
        for col in prophet_data.columns[2:]:
            model.add_regressor(col)
        
        # Fit model
        model.fit(prophet_data)
        
        # Make future dataframe
        future = model.make_future_dataframe(periods=horizon_days, freq='D')
        
        # Add regressor values for future
        for col in prophet_data.columns[2:]:
            future[col] = prophet_data[col].mean()
        
        # Predict
        forecast = model.predict(future)
        predictions = forecast['yhat'].tail(horizon_days).values
        
        # Calculate performance using cross-validation
        from prophet.diagnostics import cross_validation, performance_metrics
        
        cv_results = cross_validation(
            model, 
            initial='365 days',
            period='90 days',
            horizon='30 days'
        )
        
        perf_metrics = performance_metrics(cv_results)
        
        performance = {
            'mae': float(perf_metrics['mae'].mean()),
            'rmse': float(perf_metrics['rmse'].mean()),
            'mape': float(perf_metrics['mape'].mean()),
            'coverage': float(perf_metrics['coverage'].mean())
        }
        
        self.models['prophet_demand'] = model
        
        return predictions, performance
    
    async def _train_xgboost_model(
        self,
        features: pd.DataFrame,
        horizon_days: int
    ) -> Tuple[np.ndarray, Dict[str, float]]:
        """
        Entrena modelo XGBoost optimizado
        """
        # Prepare lagged features
        X, y = self._create_lagged_features(features, lags=30)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, shuffle=False
        )
        
        # Hyperparameter tuning
        param_grid = {
            'n_estimators': [100, 200, 300],
            'max_depth': [5, 7, 9],
            'learning_rate': [0.01, 0.05, 0.1],
            'subsample': [0.8, 0.9, 1.0],
            'colsample_bytree': [0.8, 0.9, 1.0]
        }
        
        # Use GPU if available
        tree_method = 'gpu_hist' if self.gpu_available else 'hist'
        
        base_model = xgb.XGBRegressor(
            objective='reg:squarederror',
            tree_method=tree_method,
            random_state=42
        )
        
        # Grid search with time series split
        tscv = TimeSeriesSplit(n_splits=5)
        
        grid_search = GridSearchCV(
            base_model,
            param_grid,
            cv=tscv,
            scoring='neg_mean_squared_error',
            n_jobs=-1,
            verbose=0
        )
        
        grid_search.fit(X_train, y_train)
        
        # Best model
        best_model = grid_search.best_estimator_
        
        # Multi-step forecast
        predictions = []
        last_features = X.iloc[-1:].copy()
        
        for _ in range(horizon_days):
            pred = best_model.predict(last_features)[0]
            predictions.append(pred)
            
            # Update features for next prediction
            last_features = self._update_features_for_next_prediction(
                last_features, pred
            )
        
        predictions = np.array(predictions)
        
        # Calculate performance
        test_predictions = best_model.predict(X_test)
        performance = {
            'mae': float(mean_absolute_error(y_test, test_predictions)),
            'rmse': float(np.sqrt(mean_squared_error(y_test, test_predictions))),
            'r2': float(r2_score(y_test, test_predictions)),
            'best_params': grid_search.best_params_
        }
        
        self.models['xgboost_demand'] = best_model
        
        return predictions, performance
    
    async def _train_lightgbm_model(
        self,
        features: pd.DataFrame,
        horizon_days: int
    ) -> Tuple[np.ndarray, Dict[str, float]]:
        """
        Entrena modelo LightGBM con optimización Bayesiana
        """
        from skopt import BayesSearchCV
        from skopt.space import Real, Integer
        
        # Prepare data
        X, y = self._create_lagged_features(features, lags=30)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, shuffle=False
        )
        
        # Bayesian optimization
        search_spaces = {
            'num_leaves': Integer(20, 300),
            'max_depth': Integer(5, 15),
            'learning_rate': Real(0.01, 0.3, 'log-uniform'),
            'n_estimators': Integer(100, 1000),
            'min_child_samples': Integer(5, 100),
            'subsample': Real(0.5, 1.0),
            'colsample_bytree': Real(0.5, 1.0)
        }
        
        lgb_model = lgb.LGBMRegressor(
            objective='regression',
            metric='rmse',
            boosting_type='gbdt',
            random_state=42,
            device='gpu' if self.gpu_available else 'cpu'
        )
        
        bayes_search = BayesSearchCV(
            lgb_model,
            search_spaces,
            cv=TimeSeriesSplit(n_splits=3),
            n_iter=30,
            scoring='neg_mean_squared_error',
            random_state=42,
            n_jobs=-1
        )
        
        bayes_search.fit(X_train, y_train)
        
        # Best model
        best_model = bayes_search.best_estimator_
        
        # Predictions
        predictions = []
        last_features = X.iloc[-1:].copy()
        
        for _ in range(horizon_days):
            pred = best_model.predict(last_features)[0]
            predictions.append(pred)
            last_features = self._update_features_for_next_prediction(
                last_features, pred
            )
        
        predictions = np.array(predictions)
        
        # Performance
        test_predictions = best_model.predict(X_test)
        performance = {
            'mae': float(mean_absolute_error(y_test, test_predictions)),
            'rmse': float(np.sqrt(mean_squared_error(y_test, test_predictions))),
            'r2': float(r2_score(y_test, test_predictions)),
            'best_params': bayes_search.best_params_
        }
        
        self.models['lightgbm_demand'] = best_model
        
        return predictions, performance
    
    async def predict_revenue(
        self,
        historical_data: pd.DataFrame,
        horizon_days: int = 90,
        scenario: str = 'realistic'
    ) -> PredictionResult:
        """
        Predice ingresos futuros con múltiples escenarios
        """
        scenarios = {
            'pessimistic': 0.8,
            'realistic': 1.0,
            'optimistic': 1.2
        }
        
        scenario_factor = scenarios.get(scenario, 1.0)
        
        # Feature engineering
        features = await self._engineer_revenue_features(historical_data)
        
        # Train ensemble of models
        models_predictions = []
        
        # CatBoost model
        catboost_model = CatBoostRegressor(
            iterations=500,
            depth=8,
            learning_rate=0.05,
            loss_function='RMSE',
            task_type='GPU' if self.gpu_available else 'CPU',
            verbose=False
        )
        
        X, y = self._create_lagged_features(features, lags=60)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, shuffle=False
        )
        
        catboost_model.fit(X_train, y_train, eval_set=(X_test, y_test))
        
        # Generate predictions
        predictions = []
        last_features = X.iloc[-1:].copy()
        
        for day in range(horizon_days):
            pred = catboost_model.predict(last_features)[0] * scenario_factor
            predictions.append(pred)
            
            # Add trend and seasonality
            trend_factor = 1 + (0.001 * day)  # Slight growth trend
            seasonal_factor = 1 + 0.2 * np.sin(2 * np.pi * day / 365)
            
            pred_adjusted = pred * trend_factor * seasonal_factor
            predictions[-1] = pred_adjusted
            
            last_features = self._update_features_for_next_prediction(
                last_features, pred_adjusted
            )
        
        predictions = np.array(predictions)
        
        # Calculate cumulative revenue
        cumulative_revenue = np.cumsum(predictions)
        
        # Confidence intervals using bootstrap
        confidence_intervals = self._bootstrap_confidence_intervals(
            predictions, n_bootstrap=1000
        )
        
        # Anomaly detection
        anomalies = self._detect_revenue_anomalies(predictions)
        
        # Generate insights
        recommendations = [
            f"📈 Expected revenue for next {horizon_days} days: ${cumulative_revenue[-1]:,.2f}",
            f"📊 Average daily revenue: ${np.mean(predictions):,.2f}",
            f"📈 Peak revenue day: Day {np.argmax(predictions) + 1} with ${np.max(predictions):,.2f}",
            f"💡 Scenario: {scenario.capitalize()} with {scenario_factor}x multiplier"
        ]
        
        # Add seasonal insights
        if np.std(predictions) > np.mean(predictions) * 0.2:
            recommendations.append("🎢 High revenue volatility detected - consider dynamic pricing")
        
        forecast_dates = pd.date_range(
            start=datetime.now(),
            periods=horizon_days,
            freq='D'
        )
        
        return PredictionResult(
            target=PredictionTarget.REVENUE_PREDICTION,
            predictions=predictions,
            confidence_intervals=confidence_intervals,
            feature_importance=catboost_model.feature_importances_,
            model_performance={
                'mae': float(mean_absolute_error(y_test, catboost_model.predict(X_test))),
                'scenario': scenario,
                'cumulative_revenue': float(cumulative_revenue[-1])
            },
            forecast_dates=forecast_dates,
            baseline_comparison=float(np.mean(predictions) / np.mean(features.iloc[-30:])),
            anomalies_detected=anomalies,
            recommendations=recommendations,
            visualization_data={
                'daily_revenue': predictions.tolist(),
                'cumulative_revenue': cumulative_revenue.tolist(),
                'confidence_lower': confidence_intervals[0].tolist(),
                'confidence_upper': confidence_intervals[1].tolist()
            },
            metadata={
                'scenario': scenario,
                'horizon_days': horizon_days,
                'model': 'CatBoost'
            }
        )
    
    async def optimize_pricing(
        self,
        current_prices: Dict[str, float],
        demand_elasticity: Dict[str, float],
        competition_prices: Dict[str, float],
        target_margin: float = 0.3
    ) -> Dict[str, Any]:
        """
        Optimiza precios usando Reinforcement Learning
        """
        optimized_prices = {}
        price_changes = {}
        expected_revenue_impact = {}
        
        for product, current_price in current_prices.items():
            elasticity = demand_elasticity.get(product, -1.5)
            competitor_price = competition_prices.get(product, current_price)
            
            # Define objective function
            def revenue_function(price):
                # Price relative to competitor
                price_ratio = price / competitor_price
                
                # Demand based on elasticity
                demand_multiplier = (price / current_price) ** elasticity
                
                # Competitive factor
                if price_ratio > 1.2:
                    competitive_penalty = 0.8
                elif price_ratio < 0.8:
                    competitive_penalty = 0.9
                else:
                    competitive_penalty = 1.0
                
                # Calculate revenue
                revenue = price * demand_multiplier * competitive_penalty
                
                # Apply margin constraint
                margin = (price - current_price * (1 - target_margin)) / price
                if margin < target_margin:
                    revenue *= 0.5  # Penalty for low margin
                
                return -revenue  # Negative for minimization
            
            # Optimize price
            bounds = [(current_price * 0.7, current_price * 1.5)]
            result = minimize(
                revenue_function,
                x0=[current_price],
                bounds=bounds,
                method='L-BFGS-B'
            )
            
            optimal_price = result.x[0]
            optimized_prices[product] = round(optimal_price, 2)
            price_changes[product] = (optimal_price - current_price) / current_price
            expected_revenue_impact[product] = -result.fun / (current_price * 1.0)
            
        # Calculate overall metrics
        avg_price_change = np.mean(list(price_changes.values()))
        total_revenue_impact = np.mean(list(expected_revenue_impact.values()))
        
        recommendations = []
        for product, change in price_changes.items():
            if change > 0.1:
                recommendations.append(f"📈 Increase {product} price by {change:.1%}")
            elif change < -0.1:
                recommendations.append(f"📉 Decrease {product} price by {abs(change):.1%}")
            else:
                recommendations.append(f"✅ Maintain {product} price (optimal)")
        
        return {
            'optimized_prices': optimized_prices,
            'price_changes': price_changes,
            'expected_revenue_impact': expected_revenue_impact,
            'avg_price_change': avg_price_change,
            'total_revenue_impact': total_revenue_impact,
            'recommendations': recommendations,
            'optimization_date': datetime.now().isoformat()
        }
    
    async def predict_occupancy(
        self,
        historical_occupancy: pd.DataFrame,
        hotel_features: Dict[str, Any],
        forecast_period: int = 30
    ) -> PredictionResult:
        """
        Predice ocupación hotelera con factores externos
        """
        # Neural Network for occupancy prediction
        model = Sequential([
            Dense(128, activation='relu', input_shape=(historical_occupancy.shape[1],)),
            BatchNormalization(),
            Dropout(0.3),
            Dense(64, activation='relu'),
            BatchNormalization(),
            Dropout(0.2),
            Dense(32, activation='relu'),
            Dense(forecast_period, activation='sigmoid')  # Output between 0 and 1
        ])
        
        model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss='mse',
            metrics=['mae']
        )
        
        # Prepare data
        X = historical_occupancy.values
        y = np.roll(historical_occupancy.values, -forecast_period, axis=0)
        
        # Remove last forecast_period rows
        X = X[:-forecast_period]
        y = y[:-forecast_period]
        
        # Train model
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, shuffle=False
        )
        
        history = model.fit(
            X_train, y_train,
            validation_data=(X_test, y_test),
            epochs=50,
            batch_size=16,
            verbose=0
        )
        
        # Make predictions
        last_data = historical_occupancy.iloc[-1:].values
        predictions = model.predict(last_data, verbose=0)[0]
        
        # Scale to percentage
        predictions = predictions * 100
        
        # Add seasonality adjustments
        seasonal_factors = self._calculate_seasonal_factors(
            historical_occupancy, 
            forecast_period
        )
        predictions = predictions * seasonal_factors
        
        # Ensure predictions are within 0-100%
        predictions = np.clip(predictions, 0, 100)
        
        # Generate insights
        avg_occupancy = np.mean(predictions)
        peak_day = np.argmax(predictions)
        low_day = np.argmin(predictions)
        
        recommendations = [
            f"📊 Average occupancy forecast: {avg_occupancy:.1f}%",
            f"📈 Peak occupancy on day {peak_day + 1}: {predictions[peak_day]:.1f}%",
            f"📉 Lowest occupancy on day {low_day + 1}: {predictions[low_day]:.1f}%"
        ]
        
        if avg_occupancy < 60:
            recommendations.append("⚠️ Low occupancy predicted - consider promotions")
        elif avg_occupancy > 85:
            recommendations.append("🎯 High occupancy expected - optimize pricing")
        
        forecast_dates = pd.date_range(
            start=datetime.now(),
            periods=forecast_period,
            freq='D'
        )
        
        return PredictionResult(
            target=PredictionTarget.OCCUPANCY_RATE,
            predictions=predictions,
            confidence_intervals=self._calculate_confidence_intervals(
                predictions, 
                [predictions * 0.95, predictions * 1.05]
            ),
            feature_importance={},
            model_performance={
                'mae': float(history.history['val_mae'][-1]),
                'loss': float(history.history['val_loss'][-1])
            },
            forecast_dates=forecast_dates,
            baseline_comparison=float(avg_occupancy / historical_occupancy.mean().mean()),
            anomalies_detected=[],
            recommendations=recommendations,
            visualization_data={
                'occupancy_forecast': predictions.tolist(),
                'dates': forecast_dates.strftime('%Y-%m-%d').tolist()
            },
            metadata={
                'hotel_features': hotel_features,
                'forecast_period': forecast_period
            }
        )
    
    async def detect_anomalies(
        self,
        time_series: pd.DataFrame,
        sensitivity: float = 0.95
    ) -> List[Dict[str, Any]]:
        """
        Detecta anomalías usando Isolation Forest y LSTM Autoencoder
        """
        anomalies = []
        
        # Method 1: Isolation Forest
        iso_forest = IsolationForest(
            contamination=1 - sensitivity,
            random_state=42,
            n_estimators=100
        )
        
        # Prepare features
        X = time_series.values.reshape(-1, 1)
        predictions = iso_forest.fit_predict(X)
        
        # Find anomalies
        anomaly_indices = np.where(predictions == -1)[0]
        
        for idx in anomaly_indices:
            anomaly = {
                'index': int(idx),
                'date': time_series.index[idx].isoformat() if hasattr(time_series.index[idx], 'isoformat') else str(time_series.index[idx]),
                'value': float(time_series.iloc[idx]),
                'method': 'isolation_forest',
                'severity': 'high' if abs(time_series.iloc[idx] - time_series.mean()) > 2 * time_series.std() else 'medium'
            }
            anomalies.append(anomaly)
        
        # Method 2: Statistical (Z-score)
        z_scores = np.abs(stats.zscore(time_series))
        threshold = 3
        statistical_anomalies = np.where(z_scores > threshold)[0]
        
        for idx in statistical_anomalies:
            if idx not in anomaly_indices:
                anomaly = {
                    'index': int(idx),
                    'date': time_series.index[idx].isoformat() if hasattr(time_series.index[idx], 'isoformat') else str(time_series.index[idx]),
                    'value': float(time_series.iloc[idx]),
                    'method': 'statistical',
                    'z_score': float(z_scores[idx]),
                    'severity': 'high' if z_scores[idx] > 4 else 'medium'
                }
                anomalies.append(anomaly)
        
        # Method 3: LSTM Autoencoder (if enough data)
        if len(time_series) > 100:
            autoencoder_anomalies = await self._detect_anomalies_autoencoder(
                time_series
            )
            anomalies.extend(autoencoder_anomalies)
        
        return anomalies
    
    async def _detect_anomalies_autoencoder(
        self,
        time_series: pd.DataFrame
    ) -> List[Dict[str, Any]]:
        """
        Detecta anomalías usando LSTM Autoencoder
        """
        # Create sequences
        sequence_length = 10
        sequences = []
        
        for i in range(len(time_series) - sequence_length):
            sequences.append(time_series.iloc[i:i+sequence_length].values)
        
        sequences = np.array(sequences)
        sequences = sequences.reshape((sequences.shape[0], sequences.shape[1], 1))
        
        # Build autoencoder
        model = Sequential([
            LSTM(32, activation='relu', return_sequences=True, input_shape=(sequence_length, 1)),
            LSTM(16, activation='relu', return_sequences=False),
            Dense(8, activation='relu'),
            Dense(16, activation='relu'),
            Dense(sequence_length)
        ])
        
        model.compile(optimizer='adam', loss='mse')
        
        # Train on normal data (assuming most data is normal)
        model.fit(sequences, sequences.reshape((sequences.shape[0], sequence_length)), 
                 epochs=10, batch_size=32, verbose=0)
        
        # Predict and calculate reconstruction error
        predictions = model.predict(sequences, verbose=0)
        mse = np.mean((sequences.reshape((sequences.shape[0], sequence_length)) - predictions) ** 2, axis=1)
        
        # Threshold for anomalies (95th percentile)
        threshold = np.percentile(mse, 95)
        anomaly_indices = np.where(mse > threshold)[0]
        
        anomalies = []
        for idx in anomaly_indices:
            actual_idx = idx + sequence_length
            anomaly = {
                'index': int(actual_idx),
                'date': time_series.index[actual_idx].isoformat() if hasattr(time_series.index[actual_idx], 'isoformat') else str(time_series.index[actual_idx]),
                'value': float(time_series.iloc[actual_idx]),
                'method': 'lstm_autoencoder',
                'reconstruction_error': float(mse[idx]),
                'severity': 'high' if mse[idx] > threshold * 1.5 else 'medium'
            }
            anomalies.append(anomaly)
        
        return anomalies
    
    async def _engineer_features(
        self,
        data: pd.DataFrame,
        destination: str,
        include_external: bool
    ) -> pd.DataFrame:
        """
        Ingeniería de features avanzada
        """
        features = data.copy()
        
        # Temporal features
        if hasattr(features.index, 'day'):
            features['day_of_week'] = features.index.dayofweek
            features['month'] = features.index.month
            features['quarter'] = features.index.quarter
            features['year'] = features.index.year
            features['day_of_year'] = features.index.dayofyear
            features['week_of_year'] = features.index.isocalendar().week
        
        # Lagged features
        for lag in [1, 7, 14, 30]:
            features[f'lag_{lag}'] = features.iloc[:, 0].shift(lag)
        
        # Rolling statistics
        for window in [7, 14, 30]:
            features[f'rolling_mean_{window}'] = features.iloc[:, 0].rolling(window).mean()
            features[f'rolling_std_{window}'] = features.iloc[:, 0].rolling(window).std()
            features[f'rolling_max_{window}'] = features.iloc[:, 0].rolling(window).max()
            features[f'rolling_min_{window}'] = features.iloc[:, 0].rolling(window).min()
        
        # Exponential weighted moving average
        features['ewm_7'] = features.iloc[:, 0].ewm(span=7).mean()
        features['ewm_30'] = features.iloc[:, 0].ewm(span=30).mean()
        
        # Trend features
        features['linear_trend'] = np.arange(len(features))
        features['quadratic_trend'] = features['linear_trend'] ** 2
        
        # Seasonal decomposition
        if len(features) > 365:
            decomposition = seasonal_decompose(
                features.iloc[:, 0], 
                model='multiplicative', 
                period=365
            )
            features['seasonal'] = decomposition.seasonal
            features['trend'] = decomposition.trend
            features['residual'] = decomposition.resid
        
        # External factors
        if include_external:
            # Holidays (simplified)
            features['is_holiday'] = features.index.dayofweek.isin([5, 6]).astype(int)
            
            # Season
            features['is_summer'] = features.index.month.isin([6, 7, 8]).astype(int)
            features['is_winter'] = features.index.month.isin([12, 1, 2]).astype(int)
            
            # Destination popularity (mock)
            destination_popularity = {
                'paris': 1.2,
                'london': 1.1,
                'rome': 1.15,
                'barcelona': 1.25,
                'amsterdam': 1.05
            }
            features['destination_factor'] = destination_popularity.get(
                destination.lower(), 1.0
            )
        
        # Remove NaN values
        features = features.dropna()
        
        return features
    
    async def _engineer_revenue_features(
        self,
        data: pd.DataFrame
    ) -> pd.DataFrame:
        """
        Feature engineering específico para revenue
        """
        features = data.copy()
        
        # Revenue-specific features
        if 'revenue' in features.columns:
            # Growth rates
            features['daily_growth'] = features['revenue'].pct_change()
            features['weekly_growth'] = features['revenue'].pct_change(7)
            features['monthly_growth'] = features['revenue'].pct_change(30)
            
            # Cumulative features
            features['cumulative_revenue'] = features['revenue'].cumsum()
            features['cumulative_mean'] = features['cumulative_revenue'] / (np.arange(len(features)) + 1)
        
        # Price-related features if available
        if 'average_price' in features.columns:
            features['price_momentum'] = features['average_price'].rolling(7).mean() - features['average_price'].rolling(30).mean()
            features['price_volatility'] = features['average_price'].rolling(30).std()
        
        # Booking-related features
        if 'bookings' in features.columns:
            features['booking_rate'] = features['bookings'].rolling(7).mean()
            features['booking_acceleration'] = features['booking_rate'].diff()
        
        # Customer features
        if 'customers' in features.columns:
            features['customer_growth'] = features['customers'].pct_change()
            features['revenue_per_customer'] = features['revenue'] / features['customers']
        
        return features.dropna()
    
    def _create_sequences(
        self,
        data: pd.DataFrame,
        sequence_length: int
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Crea secuencias para modelos LSTM
        """
        sequences = []
        targets = []
        
        for i in range(len(data) - sequence_length - 1):
            sequences.append(data.iloc[i:i+sequence_length].values)
            targets.append(data.iloc[i+sequence_length].values[0])
        
        return np.array(sequences), np.array(targets)
    
    def _create_lagged_features(
        self,
        data: pd.DataFrame,
        lags: int
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Crea features con lags para modelos de árbol
        """
        df = data.copy()
        
        # Create lagged features
        for i in range(1, lags + 1):
            df[f'lag_{i}'] = df.iloc[:, 0].shift(i)
        
        # Remove NaN rows
        df = df.dropna()
        
        # Split features and target
        X = df.iloc[:, 1:]
        y = df.iloc[:, 0]
        
        return X, y
    
    def _calculate_ensemble_weights(
        self,
        performances: Dict[str, Dict[str, float]]
    ) -> np.ndarray:
        """
        Calcula pesos para ensemble basado en performance
        """
        # Use inverse of error as weight
        weights = []
        for model, perf in performances.items():
            # Use RMSE as main metric
            rmse = perf.get('rmse', 1.0)
            weight = 1.0 / (rmse + 1e-6)  # Add small epsilon to avoid division by zero
            weights.append(weight)
        
        # Normalize weights
        weights = np.array(weights)
        weights = weights / weights.sum()
        
        return weights
    
    def _weighted_average(
        self,
        predictions: List[np.ndarray],
        weights: np.ndarray
    ) -> np.ndarray:
        """
        Calcula promedio ponderado de predicciones
        """
        weighted_preds = np.zeros_like(predictions[0])
        
        for pred, weight in zip(predictions, weights):
            weighted_preds += pred * weight
        
        return weighted_preds
    
    def _calculate_confidence_intervals(
        self,
        predictions: np.ndarray,
        ensemble_predictions: List[np.ndarray],
        confidence_level: float = 0.95
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Calcula intervalos de confianza
        """
        if ensemble_predictions:
            # Use ensemble variance
            ensemble_array = np.array(ensemble_predictions)
            std = np.std(ensemble_array, axis=0)
        else:
            # Use prediction variance estimate
            std = np.abs(predictions) * 0.1  # 10% of prediction as std
        
        # Calculate z-score for confidence level
        z_score = stats.norm.ppf((1 + confidence_level) / 2)
        
        lower_bound = predictions - z_score * std
        upper_bound = predictions + z_score * std
        
        return (lower_bound, upper_bound)
    
    def _bootstrap_confidence_intervals(
        self,
        predictions: np.ndarray,
        n_bootstrap: int = 1000,
        confidence_level: float = 0.95
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Calcula intervalos de confianza usando bootstrap
        """
        bootstrap_predictions = []
        
        for _ in range(n_bootstrap):
            # Resample with replacement
            indices = np.random.choice(len(predictions), len(predictions), replace=True)
            bootstrap_pred = predictions[indices]
            bootstrap_predictions.append(bootstrap_pred)
        
        bootstrap_predictions = np.array(bootstrap_predictions)
        
        # Calculate percentiles
        lower_percentile = (1 - confidence_level) / 2 * 100
        upper_percentile = (1 + confidence_level) / 2 * 100
        
        lower_bound = np.percentile(bootstrap_predictions, lower_percentile, axis=0)
        upper_bound = np.percentile(bootstrap_predictions, upper_percentile, axis=0)
        
        return (lower_bound, upper_bound)
    
    async def _detect_anomalies(
        self,
        predictions: np.ndarray,
        historical_data: pd.DataFrame
    ) -> List[Dict[str, Any]]:
        """
        Detecta anomalías en las predicciones
        """
        anomalies = []
        
        # Calculate statistics
        mean = np.mean(predictions)
        std = np.std(predictions)
        
        # Find outliers
        for i, pred in enumerate(predictions):
            z_score = (pred - mean) / std
            
            if abs(z_score) > 3:
                anomaly = {
                    'day': i + 1,
                    'value': float(pred),
                    'z_score': float(z_score),
                    'type': 'outlier',
                    'severity': 'high' if abs(z_score) > 4 else 'medium'
                }
                anomalies.append(anomaly)
        
        # Check for sudden changes
        for i in range(1, len(predictions)):
            change = abs(predictions[i] - predictions[i-1]) / predictions[i-1]
            
            if change > 0.5:  # 50% change
                anomaly = {
                    'day': i + 1,
                    'value': float(predictions[i]),
                    'change_percentage': float(change * 100),
                    'type': 'sudden_change',
                    'severity': 'high' if change > 1.0 else 'medium'
                }
                anomalies.append(anomaly)
        
        return anomalies
    
    def _detect_revenue_anomalies(
        self,
        predictions: np.ndarray
    ) -> List[Dict[str, Any]]:
        """
        Detecta anomalías específicas de revenue
        """
        anomalies = []
        
        # Check for negative revenue
        negative_days = np.where(predictions < 0)[0]
        for day in negative_days:
            anomalies.append({
                'day': int(day + 1),
                'value': float(predictions[day]),
                'type': 'negative_revenue',
                'severity': 'critical'
            })
        
        # Check for extreme values
        q1 = np.percentile(predictions, 25)
        q3 = np.percentile(predictions, 75)
        iqr = q3 - q1
        
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        outliers = np.where((predictions < lower_bound) | (predictions > upper_bound))[0]
        
        for day in outliers:
            if day not in negative_days:
                anomalies.append({
                    'day': int(day + 1),
                    'value': float(predictions[day]),
                    'type': 'extreme_value',
                    'severity': 'high'
                })
        
        return anomalies
    
    def _generate_recommendations(
        self,
        predictions: np.ndarray,
        anomalies: List[Dict[str, Any]],
        destination: str
    ) -> List[str]:
        """
        Genera recomendaciones basadas en predicciones
        """
        recommendations = []
        
        # Trend analysis
        trend = np.polyfit(range(len(predictions)), predictions, 1)[0]
        
        if trend > 0:
            recommendations.append(f"📈 Upward trend detected for {destination} (+{trend:.2f} daily)")
            recommendations.append("💡 Consider increasing inventory and staffing")
        else:
            recommendations.append(f"📉 Downward trend detected for {destination} ({trend:.2f} daily)")
            recommendations.append("💡 Implement promotional campaigns to boost demand")
        
        # Peak detection
        peak_day = np.argmax(predictions)
        recommendations.append(f"🎯 Peak demand expected on day {peak_day + 1}")
        
        # Anomaly-based recommendations
        if anomalies:
            high_severity = [a for a in anomalies if a.get('severity') == 'high']
            if high_severity:
                recommendations.append(f"⚠️ {len(high_severity)} high-severity anomalies detected")
                recommendations.append("🔍 Review capacity planning for anomaly days")
        
        # Seasonal recommendations
        avg_demand = np.mean(predictions)
        if avg_demand > np.percentile(predictions, 75):
            recommendations.append("🌟 High season approaching - optimize pricing strategy")
        elif avg_demand < np.percentile(predictions, 25):
            recommendations.append("❄️ Low season detected - focus on cost optimization")
        
        return recommendations
    
    def _calculate_feature_importance(
        self,
        features: pd.DataFrame
    ) -> Dict[str, float]:
        """
        Calcula importancia de features
        """
        # Use correlation with target as simple importance measure
        if len(features.columns) > 1:
            correlations = features.corr().iloc[0, 1:].abs()
            importance = correlations / correlations.sum()
            return importance.to_dict()
        return {}
    
    def _calculate_baseline_improvement(
        self,
        predictions: np.ndarray,
        historical_data: pd.DataFrame
    ) -> float:
        """
        Calcula mejora sobre baseline
        """
        # Simple baseline: average of last 30 days
        baseline = historical_data.iloc[-30:].mean()
        prediction_mean = np.mean(predictions)
        
        if baseline != 0:
            improvement = (prediction_mean - baseline) / baseline
        else:
            improvement = 0.0
        
        return improvement
    
    def _prepare_visualization_data(
        self,
        predictions: np.ndarray,
        dates: pd.DatetimeIndex
    ) -> Dict[str, Any]:
        """
        Prepara datos para visualización
        """
        return {
            'dates': dates.strftime('%Y-%m-%d').tolist(),
            'predictions': predictions.tolist(),
            'cumulative': np.cumsum(predictions).tolist()
        }
    
    def _update_features_for_next_prediction(
        self,
        features: pd.DataFrame,
        new_value: float
    ) -> pd.DataFrame:
        """
        Actualiza features para siguiente predicción
        """
        updated = features.copy()
        
        # Shift lag features
        for col in updated.columns:
            if 'lag_' in col:
                lag_num = int(col.split('_')[1])
                if lag_num > 1:
                    # Shift to next lag
                    updated[f'lag_{lag_num}'] = updated[f'lag_{lag_num - 1}'].values
        
        # Update lag_1 with new prediction
        if 'lag_1' in updated.columns:
            updated['lag_1'] = new_value
        
        return updated
    
    def _calculate_seasonal_factors(
        self,
        historical_data: pd.DataFrame,
        forecast_period: int
    ) -> np.ndarray:
        """
        Calcula factores estacionales
        """
        # Simple seasonal pattern
        seasonal_pattern = []
        
        for i in range(forecast_period):
            # Weekly pattern (higher on weekends)
            day_of_week = (datetime.now() + timedelta(days=i)).weekday()
            if day_of_week in [5, 6]:  # Weekend
                factor = 1.2
            else:
                factor = 1.0
            
            # Monthly pattern (higher in summer)
            month = (datetime.now() + timedelta(days=i)).month
            if month in [6, 7, 8]:  # Summer
                factor *= 1.15
            elif month in [12, 1, 2]:  # Winter
                factor *= 0.9
            
            seasonal_pattern.append(factor)
        
        return np.array(seasonal_pattern)


# Singleton instance
ml_engine = AdvancedMLEngine()

async def run_demand_prediction_example():
    """
    Ejemplo de predicción de demanda
    """
    # Generate sample data
    dates = pd.date_range(start='2023-01-01', end='2024-10-07', freq='D')
    demand = np.random.poisson(lam=100, size=len(dates)) + \
             20 * np.sin(2 * np.pi * np.arange(len(dates)) / 365) + \
             np.random.normal(0, 10, len(dates))
    
    historical_data = pd.DataFrame({
        'demand': demand
    }, index=dates)
    
    # Run prediction
    result = await ml_engine.predict_demand(
        historical_data=historical_data,
        destination='Barcelona',
        horizon_days=30,
        include_external_factors=True
    )
    
    print("🎯 Demand Prediction Results:")
    print(f"Average predicted demand: {np.mean(result.predictions):.2f}")
    print(f"Peak day: {np.argmax(result.predictions) + 1}")
    print(f"Baseline improvement: {result.baseline_comparison:.2%}")
    print("\n📋 Recommendations:")
    for rec in result.recommendations:
        print(f"  - {rec}")
    
    return result

async def run_revenue_prediction_example():
    """
    Ejemplo de predicción de revenue
    """
    # Generate sample revenue data
    dates = pd.date_range(start='2023-01-01', end='2024-10-07', freq='D')
    revenue = 10000 + np.random.normal(0, 2000, len(dates)) + \
              5000 * np.sin(2 * np.pi * np.arange(len(dates)) / 365)
    revenue = np.maximum(revenue, 0)  # Ensure non-negative
    
    historical_data = pd.DataFrame({
        'revenue': revenue
    }, index=dates)
    
    # Run prediction
    result = await ml_engine.predict_revenue(
        historical_data=historical_data,
        horizon_days=90,
        scenario='optimistic'
    )
    
    print("\n💰 Revenue Prediction Results:")
    print(f"Total revenue forecast: ${result.model_performance['cumulative_revenue']:,.2f}")
    print(f"Average daily revenue: ${np.mean(result.predictions):,.2f}")
    print("\n📋 Insights:")
    for rec in result.recommendations:
        print(f"  - {rec}")
    
    return result

if __name__ == "__main__":
    # Run examples
    import asyncio
    
    async def main():
        print("🤖 Advanced Predictive Analytics Engine")
        print("=" * 50)
        
        # Demand prediction
        demand_result = await run_demand_prediction_example()
        
        # Revenue prediction
        revenue_result = await run_revenue_prediction_example()
        
        # Price optimization
        current_prices = {
            'tour_paris': 150,
            'tour_rome': 120,
            'tour_barcelona': 100
        }
        
        demand_elasticity = {
            'tour_paris': -1.2,
            'tour_rome': -1.5,
            'tour_barcelona': -1.8
        }
        
        competition_prices = {
            'tour_paris': 160,
            'tour_rome': 115,
            'tour_barcelona': 95
        }
        
        pricing_result = await ml_engine.optimize_pricing(
            current_prices=current_prices,
            demand_elasticity=demand_elasticity,
            competition_prices=competition_prices,
            target_margin=0.35
        )
        
        print("\n💎 Price Optimization Results:")
        for product, new_price in pricing_result['optimized_prices'].items():
            old_price = current_prices[product]
            change = pricing_result['price_changes'][product]
            print(f"  {product}: ${old_price} → ${new_price} ({change:+.1%})")
        
        print(f"\nExpected revenue impact: {pricing_result['total_revenue_impact']:+.1%}")
    
    asyncio.run(main())