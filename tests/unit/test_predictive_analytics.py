"""
🧪 UNIT TESTS - Predictive Analytics
Suite completa de tests unitarios para el motor de análisis predictivo con ML

Autor: GenSpark AI Developer  
Fase: 7 - Testing & Quality Assurance
Fecha: 2024-09-24
"""

import pytest
import numpy as np
import pandas as pd
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime, timedelta
from decimal import Decimal
import pickle
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler

# Import modules to test
from backend.analytics.predictive_analytics import (
    PredictiveAnalyticsEngine,
    PredictionResult,
    ModelPerformance,
    PredictionType,
    ModelType,
    create_analytics_engine
)

class TestPredictionResult:
    """Test suite para PredictionResult dataclass"""
    
    def test_prediction_result_initialization(self):
        """Test inicialización básica de PredictionResult"""
        result = PredictionResult(
            prediction_type=PredictionType.REVENUE_FORECAST,
            model_type=ModelType.ARIMA,
            prediction_value=[1000, 1100, 1200],
            confidence_score=0.85
        )
        
        assert result.prediction_type == PredictionType.REVENUE_FORECAST
        assert result.model_type == ModelType.ARIMA
        assert result.prediction_value == [1000, 1100, 1200]
        assert result.confidence_score == 0.85
        assert isinstance(result.generated_at, datetime)
    
    def test_prediction_result_with_metadata(self):
        """Test PredictionResult con metadata completo"""
        metadata = {
            "forecast_period": "30 days",
            "model_accuracy": 0.92,
            "training_samples": 1000
        }
        
        result = PredictionResult(
            prediction_type=PredictionType.CUSTOMER_CHURN,
            model_type=ModelType.GRADIENT_BOOSTING,
            prediction_value={"high_risk": 15, "medium_risk": 25},
            confidence_score=0.92,
            metadata=metadata
        )
        
        assert result.metadata["forecast_period"] == "30 days"
        assert result.metadata["model_accuracy"] == 0.92
        assert result.metadata["training_samples"] == 1000

class TestModelPerformance:
    """Test suite para ModelPerformance dataclass"""
    
    def test_model_performance_initialization(self):
        """Test inicialización de ModelPerformance"""
        performance = ModelPerformance(
            model_name="test_model",
            accuracy=0.95,
            precision=0.93,
            recall=0.91,
            f1_score=0.92
        )
        
        assert performance.model_name == "test_model"
        assert performance.accuracy == 0.95
        assert performance.precision == 0.93
        assert performance.recall == 0.91
        assert performance.f1_score == 0.92
        assert isinstance(performance.last_trained, datetime)

class TestPredictiveAnalyticsEngine:
    """Test suite principal para PredictiveAnalyticsEngine"""
    
    @pytest.fixture
    def analytics_engine(self):
        """Fixture para crear instancia del motor de analytics"""
        return PredictiveAnalyticsEngine(model_storage_path="test_models/")
    
    def test_engine_initialization(self, analytics_engine):
        """Test inicialización correcta del motor"""
        assert analytics_engine.model_storage_path == "test_models/"
        assert isinstance(analytics_engine.models, dict)
        assert isinstance(analytics_engine.scalers, dict)
        assert isinstance(analytics_engine.encoders, dict)
        assert isinstance(analytics_engine.performance_metrics, dict)
        assert isinstance(analytics_engine.feature_columns, dict)
    
    def test_generate_sample_revenue_data(self, analytics_engine):
        """Test generación de datos de ejemplo de ingresos"""
        revenue_data = analytics_engine._generate_sample_revenue_data()
        
        assert isinstance(revenue_data, pd.DataFrame)
        assert 'date' in revenue_data.columns
        assert 'revenue' in revenue_data.columns
        assert len(revenue_data) > 0
        assert all(revenue_data['revenue'] >= 0)  # Revenues should be positive
    
    def test_generate_sample_customer_data(self, analytics_engine):
        """Test generación de datos de ejemplo de clientes"""
        customer_data = analytics_engine._generate_sample_customer_data()
        
        assert isinstance(customer_data, pd.DataFrame)
        expected_columns = [
            'customer_age', 'total_bookings', 'avg_booking_value',
            'days_since_last_booking', 'customer_satisfaction',
            'support_tickets', 'email_engagement', 'mobile_app_usage'
        ]
        
        for col in expected_columns:
            assert col in customer_data.columns
        
        assert len(customer_data) == 1000  # Default sample size
        assert all(customer_data['customer_satisfaction'] >= 0)
        assert all(customer_data['customer_satisfaction'] <= 5)
    
    def test_generate_sample_booking_data(self, analytics_engine):
        """Test generación de datos de ejemplo de bookings"""
        booking_data = analytics_engine._generate_sample_booking_data()
        
        assert isinstance(booking_data, pd.DataFrame)
        expected_columns = [
            'date', 'daily_bookings', 'day_of_week', 'month', 'is_weekend'
        ]
        
        for col in expected_columns:
            assert col in booking_data.columns
        
        assert all(booking_data['daily_bookings'] >= 0)
        assert all(booking_data['day_of_week'].between(0, 6))
        assert all(booking_data['month'].between(1, 12))
    
    def test_prepare_time_series_data(self, analytics_engine):
        """Test preparación de datos de series temporales"""
        # Create test DataFrame
        dates = pd.date_range('2024-01-01', periods=100, freq='D')
        test_data = pd.DataFrame({
            'date': dates,
            'revenue': np.random.normal(1000, 100, 100)
        })
        
        ts_data = analytics_engine._prepare_time_series_data(test_data, 'revenue')
        
        assert isinstance(ts_data, pd.Series)
        assert len(ts_data) == 100
        assert ts_data.index.freq is not None  # Should have daily frequency
    
    @pytest.mark.asyncio
    async def test_predict_revenue_forecast_basic(self, analytics_engine):
        """Test básico de pronóstico de ingresos"""
        # Mock data
        historical_data = pd.DataFrame()  # Empty - will use sample data
        
        result = await analytics_engine.predict_revenue_forecast(
            historical_data=historical_data,
            forecast_days=7,
            confidence_level=0.95
        )
        
        assert isinstance(result, PredictionResult)
        assert result.prediction_type == PredictionType.REVENUE_FORECAST
        assert result.model_type == ModelType.ARIMA
        assert isinstance(result.prediction_value, list)
        assert len(result.prediction_value) == 7
        assert 0.0 <= result.confidence_score <= 1.0
    
    @pytest.mark.asyncio
    async def test_predict_revenue_forecast_with_data(self, analytics_engine):
        """Test pronóstico de ingresos con datos específicos"""
        # Create realistic revenue data
        dates = pd.date_range('2024-01-01', periods=90, freq='D')
        revenue_data = pd.DataFrame({
            'date': dates,
            'revenue': 1000 + np.cumsum(np.random.normal(5, 20, 90))  # Trending data
        })
        
        result = await analytics_engine.predict_revenue_forecast(
            historical_data=revenue_data,
            forecast_days=14
        )
        
        assert len(result.prediction_value) == 14
        assert 'trend_analysis' in result.metadata
        assert 'seasonal_factors' in result.metadata
        assert result.valid_until is not None
    
    @pytest.mark.asyncio
    async def test_predict_customer_churn_basic(self, analytics_engine):
        """Test básico de predicción de churn"""
        customer_data = pd.DataFrame()  # Empty - will use sample data
        
        result = await analytics_engine.predict_customer_churn(
            customer_features=customer_data,
            threshold=0.5
        )
        
        assert isinstance(result, PredictionResult)
        assert result.prediction_type == PredictionType.CUSTOMER_CHURN
        assert result.model_type == ModelType.GRADIENT_BOOSTING
        assert isinstance(result.prediction_value, dict)
        assert 'probabilities' in result.prediction_value
        assert 'predictions' in result.prediction_value
        assert 'high_risk_count' in result.prediction_value
    
    @pytest.mark.asyncio
    async def test_train_churn_model(self, analytics_engine):
        """Test entrenamiento del modelo de churn"""
        await analytics_engine._train_churn_model()
        
        assert 'churn_model' in analytics_engine.models
        assert 'churn_scaler' in analytics_engine.scalers
        assert 'churn_features' in analytics_engine.feature_columns
        assert 'churn_model' in analytics_engine.performance_metrics
        
        # Verify model type
        model = analytics_engine.models['churn_model']
        assert isinstance(model, GradientBoostingClassifier)
        
        # Verify scaler
        scaler = analytics_engine.scalers['churn_scaler']
        assert isinstance(scaler, StandardScaler)
    
    def test_generate_churn_training_data(self, analytics_engine):
        """Test generación de datos de entrenamiento para churn"""
        training_data = analytics_engine._generate_churn_training_data()
        
        assert isinstance(training_data, pd.DataFrame)
        assert len(training_data) == 5000  # Default size
        assert 'churned' in training_data.columns
        
        # Verify churn logic makes sense
        high_satisfaction = training_data[training_data['customer_satisfaction'] >= 4.5]
        low_satisfaction = training_data[training_data['customer_satisfaction'] < 3.0]
        
        # High satisfaction customers should have lower churn rate
        high_sat_churn_rate = high_satisfaction['churned'].mean()
        low_sat_churn_rate = low_satisfaction['churned'].mean()
        
        assert low_sat_churn_rate > high_sat_churn_rate
    
    @pytest.mark.asyncio
    async def test_predict_demand_forecast(self, analytics_engine):
        """Test pronóstico de demanda"""
        booking_data = pd.DataFrame()  # Will use sample data
        external_factors = {
            "weather_score": 0.8,
            "events_count": 2,
            "season": "high"
        }
        
        result = await analytics_engine.predict_demand_forecast(
            historical_bookings=booking_data,
            external_factors=external_factors,
            forecast_horizon=7
        )
        
        assert isinstance(result, PredictionResult)
        assert result.prediction_type == PredictionType.DEMAND_FORECAST
        assert len(result.prediction_value) == 7
        assert 'external_factors' in result.metadata
        assert 'capacity_analysis' in result.metadata
    
    @pytest.mark.asyncio
    async def test_predict_price_optimization(self, analytics_engine):
        """Test optimización de precios"""
        tour_data = pd.DataFrame()  # Will use sample data
        market_conditions = {
            "competitor_avg_price": 150.0,
            "demand_level": "high",
            "season_factor": 1.2
        }
        
        result = await analytics_engine.predict_price_optimization(
            tour_data=tour_data,
            market_conditions=market_conditions,
            optimization_goal="revenue"
        )
        
        assert isinstance(result, PredictionResult)
        assert result.prediction_type == PredictionType.PRICE_OPTIMIZATION
        assert 'optimization_goal' in result.metadata
        assert 'market_conditions' in result.metadata
    
    @pytest.mark.asyncio
    async def test_predict_booking_probability(self, analytics_engine):
        """Test predicción de probabilidad de booking"""
        lead_data = pd.DataFrame()  # Will use sample data
        
        result = await analytics_engine.predict_booking_probability(
            lead_data=lead_data
        )
        
        assert isinstance(result, PredictionResult)
        assert result.prediction_type == PredictionType.BOOKING_PROBABILITY
        assert isinstance(result.prediction_value, dict)
        assert 'probabilities' in result.prediction_value
        assert 'segments' in result.prediction_value
    
    def test_analyze_revenue_trends(self, analytics_engine):
        """Test análisis de tendencias de ingresos"""
        # Create test series with trend
        dates = pd.date_range('2024-01-01', periods=100, freq='D')
        revenue_series = pd.Series(
            1000 + np.arange(100) * 10 + np.random.normal(0, 50, 100),
            index=dates
        )
        forecast = np.array([2050, 2100, 2150])
        
        trends = analytics_engine._analyze_revenue_trends(revenue_series, forecast)
        
        assert isinstance(trends, dict)
        assert 'historical_avg' in trends
        assert 'recent_avg' in trends
        assert 'forecast_avg' in trends
        assert 'avg_growth_rate' in trends
        assert 'trend_direction' in trends
        
        # Should detect upward trend
        assert trends['avg_growth_rate'] > 0
        assert trends['trend_direction'] in ['up', 'down', 'stable']
    
    def test_preprocess_customer_features(self, analytics_engine):
        """Test preprocesamiento de características de clientes"""
        # Create test customer data
        customer_data = pd.DataFrame({
            'age': [25, 35, 45],
            'income': [50000, 75000, 100000],
            'satisfaction': [4.0, 3.5, 4.5],
            'category': ['A', 'B', 'A']  # Non-numeric column
        })
        
        processed = analytics_engine._preprocess_customer_features(customer_data)
        
        assert isinstance(processed, np.ndarray)
        assert processed.shape[0] == 3  # 3 customers
        assert processed.shape[1] == 3  # 3 numeric columns
    
    def test_analyze_churn_segments(self, analytics_engine):
        """Test análisis de segmentos de riesgo de churn"""
        # Test probabilities with known distribution
        probabilities = np.array([0.1, 0.2, 0.4, 0.6, 0.8, 0.9])
        
        segments = analytics_engine._analyze_churn_segments(probabilities)
        
        assert isinstance(segments, dict)
        assert 'low_risk' in segments
        assert 'medium_risk' in segments
        assert 'high_risk' in segments
        
        # Verify counts
        assert segments['low_risk'] == 2  # 0.1, 0.2
        assert segments['medium_risk'] == 2  # 0.4, 0.6
        assert segments['high_risk'] == 2   # 0.8, 0.9
    
    def test_create_fallback_predictions(self, analytics_engine):
        """Test creación de predicciones de fallback"""
        # Test revenue fallback
        revenue_fallback = analytics_engine._create_fallback_revenue_prediction(14)
        
        assert isinstance(revenue_fallback, PredictionResult)
        assert revenue_fallback.prediction_type == PredictionType.REVENUE_FORECAST
        assert len(revenue_fallback.prediction_value) == 14
        assert revenue_fallback.metadata.get("fallback_mode") is True
        
        # Test churn fallback
        churn_fallback = analytics_engine._create_fallback_churn_prediction()
        
        assert isinstance(churn_fallback, PredictionResult)
        assert churn_fallback.prediction_type == PredictionType.CUSTOMER_CHURN
        assert churn_fallback.metadata.get("fallback_mode") is True

class TestAnalyticsUtils:
    """Test suite para utilidades del motor de analytics"""
    
    @pytest.mark.asyncio
    async def test_create_analytics_engine(self):
        """Test creación de instancia del motor de analytics"""
        with patch.object(PredictiveAnalyticsEngine, 'initialize_models', new_callable=AsyncMock):
            engine = await create_analytics_engine("test_models/")
            
            assert isinstance(engine, PredictiveAnalyticsEngine)
            assert engine.model_storage_path == "test_models/"

@pytest.mark.integration
class TestAnalyticsIntegration:
    """Test de integración para análisis predictivo completo"""
    
    @pytest.mark.asyncio
    async def test_full_analytics_workflow(self):
        """Test workflow completo de analytics"""
        engine = PredictiveAnalyticsEngine("test_models/")
        
        # Initialize models
        await engine.initialize_models()
        
        # Test multiple predictions
        predictions = []
        
        # Revenue forecast
        revenue_result = await engine.predict_revenue_forecast(
            historical_data=pd.DataFrame(),
            forecast_days=7
        )
        predictions.append(revenue_result)
        
        # Customer churn
        churn_result = await engine.predict_customer_churn(
            customer_features=pd.DataFrame()
        )
        predictions.append(churn_result)
        
        # Demand forecast
        demand_result = await engine.predict_demand_forecast(
            historical_bookings=pd.DataFrame(),
            forecast_horizon=7
        )
        predictions.append(demand_result)
        
        # Verify all predictions
        for prediction in predictions:
            assert isinstance(prediction, PredictionResult)
            assert prediction.confidence_score >= 0.0
            assert prediction.confidence_score <= 1.0
            assert prediction.generated_at is not None
    
    @pytest.mark.asyncio
    async def test_model_training_and_prediction(self):
        """Test entrenamiento de modelo y predicción"""
        engine = PredictiveAnalyticsEngine("test_models/")
        
        # Train churn model
        await engine._train_churn_model()
        
        # Verify model was trained
        assert 'churn_model' in engine.models
        assert 'churn_model' in engine.performance_metrics
        
        # Test prediction with trained model
        customer_data = engine._generate_sample_customer_data()
        
        result = await engine.predict_customer_churn(
            customer_features=customer_data.head(100)
        )
        
        assert len(result.prediction_value['probabilities']) == 100
        assert isinstance(result.feature_importance, dict)
        assert len(result.feature_importance) > 0

class TestErrorHandling:
    """Test suite para manejo de errores"""
    
    @pytest.mark.asyncio
    async def test_revenue_forecast_with_error(self):
        """Test manejo de errores en pronóstico de ingresos"""
        engine = PredictiveAnalyticsEngine("test_models/")
        
        # Mock an error in the forecasting process
        with patch.object(engine, '_prepare_time_series_data') as mock_prepare:
            mock_prepare.side_effect = Exception("Data preparation error")
            
            result = await engine.predict_revenue_forecast(
                historical_data=pd.DataFrame(),
                forecast_days=7
            )
            
            # Should return fallback prediction
            assert result.metadata.get("fallback_mode") is True
    
    @pytest.mark.asyncio
    async def test_churn_prediction_with_error(self):
        """Test manejo de errores en predicción de churn"""
        engine = PredictiveAnalyticsEngine("test_models/")
        
        # Mock model error
        engine.models['churn_model'] = Mock()
        engine.models['churn_model'].predict_proba.side_effect = Exception("Model error")
        
        result = await engine.predict_customer_churn(
            customer_features=pd.DataFrame()
        )
        
        # Should return fallback prediction
        assert result.metadata.get("fallback_mode") is True

if __name__ == "__main__":
    # Configurar pytest para running individual
    pytest.main([__file__, "-v", "--tb=short"])