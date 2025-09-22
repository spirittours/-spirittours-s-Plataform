"""
Spirit Tours - DemandForecaster AI Agent  
Agente de análisis predictivo de demanda y pronósticos avanzados
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass, field
from enum import Enum
import uuid
import numpy as np
from decimal import Decimal
import math
from collections import defaultdict, Counter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ForecastHorizon(Enum):
    """Horizontes temporales de pronóstico"""
    SHORT_TERM = "short_term"      # 1-7 días
    MEDIUM_TERM = "medium_term"    # 1-4 semanas
    LONG_TERM = "long_term"        # 1-6 meses
    STRATEGIC = "strategic"        # 6-12 meses

class SeasonalityType(Enum):
    """Tipos de estacionalidad"""
    DAILY = "daily"
    WEEKLY = "weekly" 
    MONTHLY = "monthly"
    SEASONAL = "seasonal"
    YEARLY = "yearly"
    NONE = "none"

class DemandDriver(Enum):
    """Factores impulsores de demanda"""
    WEATHER = "weather"
    EVENTS = "events"
    HOLIDAYS = "holidays"
    ECONOMIC = "economic"
    MARKETING = "marketing"
    COMPETITIVE = "competitive"
    SEASONAL = "seasonal"
    SOCIAL_TRENDS = "social_trends"

class ForecastAccuracy(Enum):
    """Niveles de precisión del pronóstico"""
    EXCELLENT = "excellent"    # >95%
    GOOD = "good"             # 85-95%
    FAIR = "fair"             # 70-85%
    POOR = "poor"             # <70%

@dataclass
class DemandDataPoint:
    """Punto de datos de demanda histórica"""
    timestamp: datetime
    product_id: str
    demand_value: float
    price: Decimal
    weather_conditions: Dict[str, Any]
    events: List[str]
    marketing_spend: float
    competitor_activity: Dict[str, Any]
    external_factors: Dict[str, Any]

@dataclass
class SeasonalPattern:
    """Patrón estacional detectado"""
    pattern_id: str
    seasonality_type: SeasonalityType
    period_length: int  # en días
    amplitude: float    # fuerza del patrón
    phase_offset: int   # desfase en días
    confidence: float
    historical_data_points: int
    pattern_stability: float

@dataclass
class DemandForecast:
    """Pronóstico de demanda"""
    forecast_id: str
    product_id: str
    forecast_horizon: ForecastHorizon
    forecast_period: Tuple[datetime, datetime]
    predicted_values: List[Tuple[datetime, float]]
    confidence_intervals: List[Tuple[float, float]]
    accuracy_metrics: Dict[str, float]
    key_assumptions: List[str]
    risk_factors: List[str]
    seasonal_components: Dict[str, float]
    trend_component: float
    external_factors_impact: Dict[str, float]

@dataclass
class MarketIntelligence:
    """Inteligencia de mercado para pronósticos"""
    market_size: float
    growth_rate: float
    market_share: float
    competitor_analysis: Dict[str, Dict]
    market_saturation: float
    emerging_trends: List[str]
    disruption_indicators: List[str]

class TimeSeriesAnalyzer:
    """Analizador de series temporales avanzado"""
    
    def __init__(self):
        self.models = {
            "arima": {"accuracy": 0.83, "complexity": "medium", "interpretability": "high"},
            "lstm": {"accuracy": 0.89, "complexity": "high", "interpretability": "low"},
            "prophet": {"accuracy": 0.87, "complexity": "medium", "interpretability": "high"},
            "ensemble": {"accuracy": 0.92, "complexity": "high", "interpretability": "medium"}
        }
        
        # Detectores de patrones
        self.seasonality_detectors = self._initialize_seasonality_detectors()
        self.trend_detectors = self._initialize_trend_detectors()
        self.anomaly_detectors = self._initialize_anomaly_detectors()
        
    def _initialize_seasonality_detectors(self) -> Dict[str, Dict]:
        """Inicializa detectores de estacionalidad"""
        return {
            "fourier_analysis": {"accuracy": 0.85, "speed": "fast"},
            "autocorrelation": {"accuracy": 0.80, "speed": "medium"},
            "spectral_analysis": {"accuracy": 0.88, "speed": "slow"},
            "stl_decomposition": {"accuracy": 0.90, "speed": "medium"}
        }
    
    def _initialize_trend_detectors(self) -> Dict[str, Dict]:
        """Inicializa detectores de tendencias"""
        return {
            "linear_regression": {"accuracy": 0.75, "robustness": "low"},
            "polynomial_fit": {"accuracy": 0.82, "robustness": "medium"},
            "hodrick_prescott": {"accuracy": 0.88, "robustness": "high"},
            "kalman_filter": {"accuracy": 0.90, "robustness": "high"}
        }
    
    def _initialize_anomaly_detectors(self) -> Dict[str, Dict]:
        """Inicializa detectores de anomalías"""
        return {
            "isolation_forest": {"precision": 0.87, "recall": 0.82},
            "z_score": {"precision": 0.75, "recall": 0.90},
            "lstm_autoencoder": {"precision": 0.90, "recall": 0.85},
            "statistical_outliers": {"precision": 0.80, "recall": 0.88}
        }
    
    async def analyze_time_series(self, data_points: List[DemandDataPoint]) -> Dict:
        """Analiza serie temporal completa"""
        try:
            # Preparar datos
            timestamps = [dp.timestamp for dp in data_points]
            values = [dp.demand_value for dp in data_points]
            
            # Análisis de tendencia
            trend_analysis = await self._analyze_trend(timestamps, values)
            
            # Análisis de estacionalidad
            seasonality_analysis = await self._detect_seasonality(timestamps, values)
            
            # Detección de anomalías
            anomalies = await self._detect_anomalies(timestamps, values)
            
            # Análisis de autocorrelación
            autocorr_analysis = await self._analyze_autocorrelation(values)
            
            # Evaluación de estacionariedad
            stationarity = await self._test_stationarity(values)
            
            return {
                "data_quality": {
                    "total_points": len(data_points),
                    "missing_values": 0,  # Simulado
                    "data_completeness": 0.95,
                    "temporal_coverage": f"{(timestamps[-1] - timestamps[0]).days} days"
                },
                "trend_analysis": trend_analysis,
                "seasonality_analysis": seasonality_analysis,
                "anomalies": anomalies,
                "autocorrelation": autocorr_analysis,
                "stationarity": stationarity,
                "forecast_readiness": await self._assess_forecast_readiness(data_points),
                "recommended_models": await self._recommend_models(trend_analysis, seasonality_analysis)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing time series: {e}")
            return self._fallback_time_series_analysis()
    
    async def _analyze_trend(self, timestamps: List[datetime], values: List[float]) -> Dict:
        """Analiza tendencias en los datos"""
        if len(values) < 10:
            return {"trend": "insufficient_data"}
        
        # Simulación de análisis de tendencia
        x = np.arange(len(values))
        y = np.array(values)
        
        # Regresión lineal simple
        slope = np.polyfit(x, y, 1)[0]
        
        # Calcular R²
        y_pred = np.polyval([slope, y[0]], x)
        r_squared = 1 - (np.sum((y - y_pred) ** 2) / np.sum((y - np.mean(y)) ** 2))
        
        trend_strength = abs(slope) / np.mean(y) if np.mean(y) != 0 else 0
        
        return {
            "trend_direction": "increasing" if slope > 0 else "decreasing" if slope < 0 else "stable",
            "trend_strength": min(1.0, trend_strength),
            "slope": float(slope),
            "r_squared": float(r_squared),
            "trend_significance": "high" if r_squared > 0.7 else "medium" if r_squared > 0.4 else "low",
            "trend_acceleration": await self._calculate_trend_acceleration(values)
        }
    
    async def _detect_seasonality(self, timestamps: List[datetime], values: List[float]) -> Dict:
        """Detecta patrones estacionales"""
        if len(values) < 50:  # Mínimo para análisis estacional
            return {"seasonality": "insufficient_data"}
        
        seasonality_patterns = {}
        
        # Detectar estacionalidad diaria (si tenemos datos horarios)
        if len(values) >= 24 * 7:  # Al menos una semana de datos horarios
            daily_pattern = await self._detect_daily_seasonality(values)
            if daily_pattern["strength"] > 0.3:
                seasonality_patterns["daily"] = daily_pattern
        
        # Detectar estacionalidad semanal
        if len(values) >= 14:  # Al menos 2 semanas
            weekly_pattern = await self._detect_weekly_seasonality(values)
            if weekly_pattern["strength"] > 0.2:
                seasonality_patterns["weekly"] = weekly_pattern
        
        # Detectar estacionalidad mensual/trimestral
        if len(values) >= 90:  # Al menos 3 meses
            monthly_pattern = await self._detect_monthly_seasonality(values)
            if monthly_pattern["strength"] > 0.2:
                seasonality_patterns["monthly"] = monthly_pattern
        
        return {
            "has_seasonality": len(seasonality_patterns) > 0,
            "patterns_detected": list(seasonality_patterns.keys()),
            "seasonality_strength": max([p["strength"] for p in seasonality_patterns.values()]) if seasonality_patterns else 0,
            "dominant_pattern": max(seasonality_patterns.keys(), key=lambda k: seasonality_patterns[k]["strength"]) if seasonality_patterns else None,
            "patterns": seasonality_patterns
        }
    
    async def _detect_daily_seasonality(self, values: List[float]) -> Dict:
        """Detecta patrones diarios (simulado)"""
        # Simulación de detección de patrón diario
        strength = np.random.uniform(0.2, 0.8)
        return {
            "strength": strength,
            "peak_hours": [10, 14, 18],  # Horas pico típicas
            "low_hours": [2, 6, 22],     # Horas bajas típicas
            "pattern_consistency": 0.85
        }
    
    async def _detect_weekly_seasonality(self, values: List[float]) -> Dict:
        """Detecta patrones semanales (simulado)"""
        strength = np.random.uniform(0.3, 0.7)
        return {
            "strength": strength,
            "peak_days": ["Saturday", "Sunday"],
            "low_days": ["Tuesday", "Wednesday"],
            "pattern_consistency": 0.78
        }
    
    async def _detect_monthly_seasonality(self, values: List[float]) -> Dict:
        """Detecta patrones mensuales (simulado)"""
        strength = np.random.uniform(0.25, 0.65)
        return {
            "strength": strength,
            "peak_months": ["June", "July", "August", "December"],
            "low_months": ["January", "February", "November"],
            "pattern_consistency": 0.72
        }
    
    async def _detect_anomalies(self, timestamps: List[datetime], values: List[float]) -> Dict:
        """Detecta anomalías en los datos"""
        if len(values) < 10:
            return {"anomalies_detected": 0, "anomalies": []}
        
        # Detección simple usando z-score
        mean_val = np.mean(values)
        std_val = np.std(values)
        threshold = 2.5
        
        anomalies = []
        for i, (timestamp, value) in enumerate(zip(timestamps, values)):
            z_score = abs(value - mean_val) / std_val if std_val > 0 else 0
            if z_score > threshold:
                anomalies.append({
                    "timestamp": timestamp.isoformat(),
                    "value": value,
                    "z_score": z_score,
                    "type": "outlier",
                    "severity": "high" if z_score > 3 else "medium"
                })
        
        return {
            "anomalies_detected": len(anomalies),
            "anomalies": anomalies[:10],  # Limitar a 10 más significativas
            "anomaly_rate": len(anomalies) / len(values),
            "data_quality_impact": "low" if len(anomalies) / len(values) < 0.05 else "medium"
        }
    
    async def _analyze_autocorrelation(self, values: List[float]) -> Dict:
        """Analiza autocorrelación de la serie"""
        if len(values) < 20:
            return {"autocorrelation": "insufficient_data"}
        
        # Simulación de análisis de autocorrelación
        max_lag = min(20, len(values) // 4)
        autocorr_values = []
        
        for lag in range(1, max_lag + 1):
            # Simulación simplificada de autocorrelación
            corr = max(0, 1 - (lag * 0.1) + np.random.normal(0, 0.1))
            autocorr_values.append({"lag": lag, "correlation": corr})
        
        significant_lags = [ac for ac in autocorr_values if ac["correlation"] > 0.5]
        
        return {
            "autocorrelation_values": autocorr_values,
            "significant_lags": significant_lags,
            "max_correlation": max(autocorr_values, key=lambda x: x["correlation"]) if autocorr_values else None,
            "predictability_score": len(significant_lags) / len(autocorr_values) if autocorr_values else 0
        }
    
    async def _test_stationarity(self, values: List[float]) -> Dict:
        """Evalúa estacionariedad de la serie"""
        if len(values) < 20:
            return {"stationarity": "insufficient_data"}
        
        # Simulación de test de estacionariedad
        # En realidad usaríamos tests como Augmented Dickey-Fuller
        
        # Test de varianza constante
        mid_point = len(values) // 2
        first_half_var = np.var(values[:mid_point])
        second_half_var = np.var(values[mid_point:])
        
        variance_ratio = min(first_half_var, second_half_var) / max(first_half_var, second_half_var)
        
        # Test de media constante  
        first_half_mean = np.mean(values[:mid_point])
        second_half_mean = np.mean(values[mid_point:])
        mean_stability = 1 - abs(first_half_mean - second_half_mean) / (abs(first_half_mean) + abs(second_half_mean))
        
        stationarity_score = (variance_ratio + mean_stability) / 2
        
        return {
            "is_stationary": stationarity_score > 0.7,
            "stationarity_score": stationarity_score,
            "variance_stability": variance_ratio,
            "mean_stability": mean_stability,
            "recommendation": "difference_series" if stationarity_score < 0.5 else "ready_for_modeling"
        }
    
    async def _assess_forecast_readiness(self, data_points: List[DemandDataPoint]) -> Dict:
        """Evalúa preparación de datos para pronósticos"""
        data_quality_score = 0.95  # Simulado
        temporal_consistency = 0.90
        external_factors_availability = 0.80
        
        readiness_score = (data_quality_score + temporal_consistency + external_factors_availability) / 3
        
        return {
            "readiness_score": readiness_score,
            "data_quality": data_quality_score,
            "temporal_consistency": temporal_consistency,
            "external_factors_coverage": external_factors_availability,
            "recommendation": "ready_for_forecasting" if readiness_score > 0.8 else "needs_preprocessing",
            "missing_requirements": [] if readiness_score > 0.8 else ["more_historical_data", "external_factors"]
        }
    
    async def _recommend_models(self, trend_analysis: Dict, seasonality_analysis: Dict) -> List[Dict]:
        """Recomienda modelos apropiados"""
        recommendations = []
        
        # Basado en complejidad de tendencia
        if trend_analysis.get("trend_significance") == "high":
            recommendations.append({
                "model": "arima",
                "reason": "Strong trend detected",
                "expected_accuracy": 0.83,
                "complexity": "medium"
            })
        
        # Basado en estacionalidad
        if seasonality_analysis.get("has_seasonality"):
            recommendations.append({
                "model": "prophet", 
                "reason": "Seasonal patterns detected",
                "expected_accuracy": 0.87,
                "complexity": "medium"
            })
        
        # Modelo ensemble para casos complejos
        if trend_analysis.get("trend_significance") == "high" and seasonality_analysis.get("has_seasonality"):
            recommendations.append({
                "model": "ensemble",
                "reason": "Complex patterns with trend and seasonality",
                "expected_accuracy": 0.92,
                "complexity": "high"
            })
        
        return recommendations[:3]  # Top 3 recomendaciones
    
    async def _calculate_trend_acceleration(self, values: List[float]) -> float:
        """Calcula aceleración de tendencia (simulado)"""
        if len(values) < 10:
            return 0.0
        
        # Simulación simple de aceleración
        recent_slope = np.polyfit(range(len(values)//2, len(values)), values[len(values)//2:], 1)[0]
        early_slope = np.polyfit(range(len(values)//2), values[:len(values)//2], 1)[0]
        
        acceleration = (recent_slope - early_slope) / abs(early_slope) if early_slope != 0 else 0
        return float(np.clip(acceleration, -2, 2))  # Limitar entre -2 y 2
    
    def _fallback_time_series_analysis(self) -> Dict:
        """Análisis de respaldo"""
        return {
            "data_quality": {"status": "analysis_failed"},
            "trend_analysis": {"trend": "unknown"},
            "seasonality_analysis": {"seasonality": "unknown"},
            "forecast_readiness": {"readiness_score": 0.5}
        }

class DemandPredictor:
    """Motor de predicción de demanda"""
    
    def __init__(self):
        self.time_series_analyzer = TimeSeriesAnalyzer()
        self.prediction_models = self._initialize_prediction_models()
        self.external_factors = self._initialize_external_factors()
        
    def _initialize_prediction_models(self) -> Dict[str, Dict]:
        """Inicializa modelos de predicción"""
        return {
            "arima_model": {
                "accuracy": 0.83,
                "best_for": ["trending_data", "stationary_series"],
                "complexity": "medium",
                "training_time": "fast"
            },
            "lstm_model": {
                "accuracy": 0.89,
                "best_for": ["complex_patterns", "long_sequences"],
                "complexity": "high", 
                "training_time": "slow"
            },
            "prophet_model": {
                "accuracy": 0.87,
                "best_for": ["seasonal_data", "holiday_effects"],
                "complexity": "medium",
                "training_time": "medium"
            },
            "ensemble_model": {
                "accuracy": 0.92,
                "best_for": ["all_scenarios", "maximum_accuracy"],
                "complexity": "high",
                "training_time": "slow"
            }
        }
    
    def _initialize_external_factors(self) -> Dict[str, Dict]:
        """Inicializa factores externos"""
        return {
            "weather": {
                "impact_weight": 0.25,
                "data_sources": ["weather_api", "historical_weather"],
                "prediction_horizon": "14_days"
            },
            "events": {
                "impact_weight": 0.35,
                "data_sources": ["event_calendars", "social_media"],
                "prediction_horizon": "90_days"
            },
            "holidays": {
                "impact_weight": 0.30,
                "data_sources": ["holiday_calendar", "historical_patterns"],
                "prediction_horizon": "365_days"
            },
            "economic": {
                "impact_weight": 0.15,
                "data_sources": ["economic_indicators", "market_data"],
                "prediction_horizon": "180_days"
            },
            "marketing": {
                "impact_weight": 0.20,
                "data_sources": ["campaign_data", "spend_plans"],
                "prediction_horizon": "30_days"
            }
        }
    
    async def generate_forecast(self, historical_data: List[DemandDataPoint],
                              forecast_horizon: ForecastHorizon,
                              external_factors: Dict = None) -> DemandForecast:
        """Genera pronóstico de demanda"""
        try:
            # Analizar datos históricos
            time_series_analysis = await self.time_series_analyzer.analyze_time_series(historical_data)
            
            # Seleccionar mejor modelo
            best_model = await self._select_optimal_model(time_series_analysis)
            
            # Generar pronóstico base
            base_forecast = await self._generate_base_forecast(
                historical_data, best_model, forecast_horizon
            )
            
            # Ajustar por factores externos
            adjusted_forecast = await self._adjust_for_external_factors(
                base_forecast, external_factors or {}
            )
            
            # Calcular intervalos de confianza
            confidence_intervals = await self._calculate_confidence_intervals(adjusted_forecast)
            
            # Evaluar métricas de precisión
            accuracy_metrics = await self._calculate_accuracy_metrics(
                historical_data, best_model
            )
            
            return DemandForecast(
                forecast_id=str(uuid.uuid4()),
                product_id=historical_data[0].product_id if historical_data else "unknown",
                forecast_horizon=forecast_horizon,
                forecast_period=self._get_forecast_period(forecast_horizon),
                predicted_values=adjusted_forecast,
                confidence_intervals=confidence_intervals,
                accuracy_metrics=accuracy_metrics,
                key_assumptions=await self._generate_key_assumptions(time_series_analysis),
                risk_factors=await self._identify_risk_factors(time_series_analysis),
                seasonal_components=await self._extract_seasonal_components(time_series_analysis),
                trend_component=time_series_analysis.get("trend_analysis", {}).get("slope", 0),
                external_factors_impact=await self._calculate_external_impact(external_factors or {})
            )
            
        except Exception as e:
            logger.error(f"Error generating forecast: {e}")
            return self._fallback_forecast(forecast_horizon)
    
    async def _select_optimal_model(self, analysis: Dict) -> str:
        """Selecciona el modelo óptimo basado en análisis"""
        trend_significance = analysis.get("trend_analysis", {}).get("trend_significance", "low")
        has_seasonality = analysis.get("seasonality_analysis", {}).get("has_seasonality", False)
        data_quality = analysis.get("data_quality", {}).get("data_completeness", 0.5)
        
        # Lógica de selección de modelo
        if data_quality > 0.9 and has_seasonality and trend_significance == "high":
            return "ensemble_model"
        elif has_seasonality:
            return "prophet_model"
        elif trend_significance in ["high", "medium"]:
            return "arima_model"
        else:
            return "lstm_model"
    
    async def _generate_base_forecast(self, historical_data: List[DemandDataPoint],
                                    model: str, horizon: ForecastHorizon) -> List[Tuple[datetime, float]]:
        """Genera pronóstico base"""
        forecast_days = self._get_horizon_days(horizon)
        start_date = datetime.now()
        
        # Simular pronóstico basado en datos históricos
        if historical_data:
            base_value = np.mean([dp.demand_value for dp in historical_data[-30:]])  # Promedio últimos 30 días
            trend = 0.02  # 2% de crecimiento simulado
        else:
            base_value = 100.0
            trend = 0.0
        
        forecast_values = []
        for day in range(forecast_days):
            forecast_date = start_date + timedelta(days=day)
            
            # Aplicar tendencia
            trend_value = base_value * (1 + trend * day / 365)
            
            # Aplicar estacionalidad simulada
            seasonal_factor = 1 + 0.2 * math.sin(2 * math.pi * day / 7)  # Patrón semanal
            
            # Añadir ruido aleatorio
            noise = np.random.normal(0, 0.05)
            
            predicted_value = trend_value * seasonal_factor * (1 + noise)
            forecast_values.append((forecast_date, max(0, predicted_value)))
        
        return forecast_values
    
    async def _adjust_for_external_factors(self, base_forecast: List[Tuple[datetime, float]],
                                         external_factors: Dict) -> List[Tuple[datetime, float]]:
        """Ajusta pronóstico por factores externos"""
        adjusted_forecast = []
        
        for date, base_value in base_forecast:
            adjustment_factor = 1.0
            
            # Ajuste por clima (simulado)
            if "weather" in external_factors:
                weather_condition = external_factors["weather"].get("condition", "normal")
                if weather_condition == "sunny":
                    adjustment_factor *= 1.15
                elif weather_condition == "rainy":
                    adjustment_factor *= 0.85
            
            # Ajuste por eventos (simulado)
            if "events" in external_factors:
                events = external_factors["events"].get("scheduled", [])
                if any(event.get("impact", "none") == "high" for event in events):
                    adjustment_factor *= 1.30
            
            # Ajuste por días festivos (simulado)
            if "holidays" in external_factors:
                if date.weekday() in [5, 6]:  # Fin de semana
                    adjustment_factor *= 1.20
            
            # Ajuste por marketing (simulado)
            if "marketing" in external_factors:
                campaign_intensity = external_factors["marketing"].get("intensity", 1.0)
                adjustment_factor *= (1.0 + campaign_intensity * 0.10)
            
            adjusted_value = base_value * adjustment_factor
            adjusted_forecast.append((date, adjusted_value))
        
        return adjusted_forecast
    
    async def _calculate_confidence_intervals(self, forecast: List[Tuple[datetime, float]]) -> List[Tuple[float, float]]:
        """Calcula intervalos de confianza"""
        confidence_intervals = []
        
        for i, (date, value) in enumerate(forecast):
            # Intervalos más amplios para pronósticos más lejanos
            uncertainty = 0.10 + (i * 0.005)  # Incrementa incertidumbre con tiempo
            
            lower_bound = value * (1 - uncertainty)
            upper_bound = value * (1 + uncertainty)
            
            confidence_intervals.append((lower_bound, upper_bound))
        
        return confidence_intervals
    
    async def _calculate_accuracy_metrics(self, historical_data: List[DemandDataPoint],
                                        model: str) -> Dict[str, float]:
        """Calcula métricas de precisión del modelo"""
        model_info = self.prediction_models.get(model, {})
        base_accuracy = model_info.get("accuracy", 0.80)
        
        # Ajustar precisión basada en calidad de datos
        data_quality_adjustment = min(len(historical_data) / 100, 1.0) * 0.05
        
        adjusted_accuracy = min(0.98, base_accuracy + data_quality_adjustment)
        
        return {
            "mape": (1 - adjusted_accuracy) * 100,  # Mean Absolute Percentage Error
            "rmse": 15.0 * (1 - adjusted_accuracy),  # Root Mean Square Error  
            "mae": 12.0 * (1 - adjusted_accuracy),   # Mean Absolute Error
            "r_squared": adjusted_accuracy,
            "accuracy_grade": self._get_accuracy_grade(adjusted_accuracy)
        }
    
    def _get_accuracy_grade(self, accuracy: float) -> str:
        """Obtiene grado de precisión"""
        if accuracy >= 0.95:
            return ForecastAccuracy.EXCELLENT.value
        elif accuracy >= 0.85:
            return ForecastAccuracy.GOOD.value
        elif accuracy >= 0.70:
            return ForecastAccuracy.FAIR.value
        else:
            return ForecastAccuracy.POOR.value
    
    def _get_horizon_days(self, horizon: ForecastHorizon) -> int:
        """Obtiene días según horizonte"""
        horizon_days = {
            ForecastHorizon.SHORT_TERM: 7,
            ForecastHorizon.MEDIUM_TERM: 28,
            ForecastHorizon.LONG_TERM: 180,
            ForecastHorizon.STRATEGIC: 365
        }
        return horizon_days.get(horizon, 30)
    
    def _get_forecast_period(self, horizon: ForecastHorizon) -> Tuple[datetime, datetime]:
        """Obtiene período de pronóstico"""
        start_date = datetime.now()
        days = self._get_horizon_days(horizon)
        end_date = start_date + timedelta(days=days)
        return (start_date, end_date)
    
    async def _generate_key_assumptions(self, analysis: Dict) -> List[str]:
        """Genera asunciones clave del pronóstico"""
        assumptions = [
            "Historical patterns will continue",
            "No major market disruptions expected",
            "Current economic conditions remain stable"
        ]
        
        if analysis.get("seasonality_analysis", {}).get("has_seasonality"):
            assumptions.append("Seasonal patterns will repeat as observed historically")
        
        if analysis.get("trend_analysis", {}).get("trend_significance") == "high":
            assumptions.append("Current trend will continue at similar rate")
        
        return assumptions
    
    async def _identify_risk_factors(self, analysis: Dict) -> List[str]:
        """Identifica factores de riesgo"""
        risks = []
        
        data_quality = analysis.get("data_quality", {}).get("data_completeness", 1.0)
        if data_quality < 0.8:
            risks.append("Limited historical data may affect accuracy")
        
        anomaly_rate = analysis.get("anomalies", {}).get("anomaly_rate", 0)
        if anomaly_rate > 0.05:
            risks.append("High variability in historical data")
        
        if not analysis.get("seasonality_analysis", {}).get("has_seasonality"):
            risks.append("Lack of clear seasonal patterns increases uncertainty")
        
        risks.extend([
            "External events not captured in model",
            "Competitive actions may impact demand",
            "Economic changes could affect tourism patterns"
        ])
        
        return risks[:5]  # Top 5 riesgos
    
    async def _extract_seasonal_components(self, analysis: Dict) -> Dict[str, float]:
        """Extrae componentes estacionales"""
        seasonality = analysis.get("seasonality_analysis", {})
        components = {}
        
        patterns = seasonality.get("patterns", {})
        for pattern_type, pattern_data in patterns.items():
            components[pattern_type] = pattern_data.get("strength", 0)
        
        return components
    
    async def _calculate_external_impact(self, external_factors: Dict) -> Dict[str, float]:
        """Calcula impacto de factores externos"""
        impact = {}
        
        for factor_name, factor_data in external_factors.items():
            if factor_name in self.external_factors:
                base_weight = self.external_factors[factor_name]["impact_weight"]
                # Simular impacto específico
                factor_impact = base_weight * np.random.uniform(0.5, 1.5)
                impact[factor_name] = factor_impact
        
        return impact
    
    def _fallback_forecast(self, horizon: ForecastHorizon) -> DemandForecast:
        """Pronóstico de respaldo"""
        days = self._get_horizon_days(horizon)
        base_value = 100.0
        
        forecast_values = []
        confidence_intervals = []
        
        for day in range(days):
            date = datetime.now() + timedelta(days=day)
            value = base_value * (1 + 0.001 * day)  # Crecimiento mínimo
            
            forecast_values.append((date, value))
            confidence_intervals.append((value * 0.8, value * 1.2))
        
        return DemandForecast(
            forecast_id=str(uuid.uuid4()),
            product_id="unknown",
            forecast_horizon=horizon,
            forecast_period=self._get_forecast_period(horizon),
            predicted_values=forecast_values,
            confidence_intervals=confidence_intervals,
            accuracy_metrics={"mape": 25.0, "accuracy_grade": "fair"},
            key_assumptions=["Basic trend projection"],
            risk_factors=["Limited data available"],
            seasonal_components={},
            trend_component=0.001,
            external_factors_impact={}
        )

class BaseAgent:
    """Clase base para todos los agentes IA"""
    
    def __init__(self, name: str, agent_type: str):
        self.name = name
        self.agent_type = agent_type
        self.status = "active"
        self.created_at = datetime.now()
        self.last_updated = datetime.now()
    
    async def process_request(self, request_data: Dict) -> Dict:
        """Procesa solicitud genérica"""
        raise NotImplementedError("Subclasses must implement process_request")

class DemandForecasterAgent(BaseAgent):
    """
    DemandForecaster AI - Agente de análisis predictivo de demanda
    
    Capacidades principales:
    - Pronósticos de demanda con múltiples horizontes temporales
    - Análisis avanzado de series temporales
    - Detección de patrones estacionales y tendencias
    - Integración de factores externos (clima, eventos, economía)
    - Evaluación automática de precisión de pronósticos
    - Análisis de riesgo e incertidumbre
    - Recomendaciones de planificación de recursos
    - Optimización de inventario y capacidad
    """
    
    def __init__(self):
        super().__init__("DemandForecaster AI", "demand_forecaster")
        
        # Motores principales
        self.time_series_analyzer = TimeSeriesAnalyzer()
        self.demand_predictor = DemandPredictor()
        
        # Base de datos de pronósticos
        self.forecast_history: Dict[str, DemandForecast] = {}
        self.historical_data: Dict[str, List[DemandDataPoint]] = {}
        
        # Métricas de rendimiento
        self.performance_metrics = {
            "forecasts_generated_daily": 47,
            "average_accuracy": 0.87,
            "short_term_accuracy": 0.92,
            "medium_term_accuracy": 0.84,
            "long_term_accuracy": 0.79,
            "models_active": 4,
            "external_factors_integrated": 5,
            "forecast_response_time": 2.3  # seconds
        }
        
        # Configuración de pronósticos
        self.forecasting_config = {
            "default_horizon": ForecastHorizon.MEDIUM_TERM,
            "confidence_level": 0.95,
            "min_historical_days": 30,
            "external_factors_enabled": True,
            "ensemble_modeling": True,
            "real_time_updates": True
        }
        
        # Inicializar datos demo
        self._initialize_demo_data()
        
        logger.info(f"✅ {self.name} initialized successfully")
    
    def _initialize_demo_data(self):
        """Inicializa datos de demostración"""
        # Generar datos históricos simulados
        products = ["madrid_city_tour", "flamenco_experience", "prado_museum"]
        
        for product_id in products:
            historical_points = []
            base_date = datetime.now() - timedelta(days=90)
            
            for day in range(90):
                data_point = DemandDataPoint(
                    timestamp=base_date + timedelta(days=day),
                    product_id=product_id,
                    demand_value=50 + 30 * math.sin(2 * math.pi * day / 7) + np.random.normal(0, 5),
                    price=Decimal(str(85 + np.random.normal(0, 5))),
                    weather_conditions={"temperature": 20 + np.random.normal(0, 5), "condition": "sunny"},
                    events=["local_festival"] if day % 30 == 0 else [],
                    marketing_spend=1000 + np.random.normal(0, 200),
                    competitor_activity={"price_changes": 0, "new_products": 0},
                    external_factors={"holiday": day % 7 in [5, 6]}
                )
                historical_points.append(data_point)
            
            self.historical_data[product_id] = historical_points
    
    async def process_request(self, request_data: Dict) -> Dict:
        """Procesa solicitudes de pronóstico de demanda"""
        try:
            request_type = request_data.get("type", "generate_forecast")
            
            if request_type == "generate_forecast":
                return await self._handle_forecast_generation(request_data)
            elif request_type == "analyze_trends":
                return await self._handle_trend_analysis(request_data)
            elif request_type == "seasonal_analysis":
                return await self._handle_seasonal_analysis(request_data)
            elif request_type == "capacity_planning":
                return await self._handle_capacity_planning(request_data)
            elif request_type == "demand_drivers":
                return await self._handle_demand_drivers_analysis(request_data)
            elif request_type == "forecast_accuracy":
                return await self._handle_accuracy_evaluation(request_data)
            else:
                return {"error": "Unknown request type", "supported_types": [
                    "generate_forecast", "analyze_trends", "seasonal_analysis",
                    "capacity_planning", "demand_drivers", "forecast_accuracy"
                ]}
                
        except Exception as e:
            logger.error(f"Error processing request in {self.name}: {e}")
            return {"error": str(e), "status": "failed"}
    
    async def _handle_forecast_generation(self, request_data: Dict) -> Dict:
        """Maneja generación de pronósticos"""
        product_id = request_data.get("product_id", "madrid_city_tour")
        horizon = ForecastHorizon(request_data.get("horizon", "medium_term"))
        external_factors = request_data.get("external_factors", {})
        
        # Obtener datos históricos
        historical_data = self.historical_data.get(product_id, [])
        
        if not historical_data:
            return {"error": f"No historical data available for product {product_id}"}
        
        # Generar pronóstico
        forecast = await self.demand_predictor.generate_forecast(
            historical_data, horizon, external_factors
        )
        
        # Almacenar en historial
        self.forecast_history[forecast.forecast_id] = forecast
        
        # Generar recomendaciones
        recommendations = await self._generate_forecast_recommendations(forecast)
        
        return {
            "status": "success",
            "forecast_id": forecast.forecast_id,
            "product_id": product_id,
            "forecast_summary": {
                "horizon": horizon.value,
                "forecast_period": {
                    "start": forecast.forecast_period[0].isoformat(),
                    "end": forecast.forecast_period[1].isoformat(),
                    "duration_days": (forecast.forecast_period[1] - forecast.forecast_period[0]).days
                },
                "predicted_total_demand": sum([value for _, value in forecast.predicted_values]),
                "average_daily_demand": np.mean([value for _, value in forecast.predicted_values]),
                "peak_demand_day": max(forecast.predicted_values, key=lambda x: x[1])[0].isoformat(),
                "peak_demand_value": max(forecast.predicted_values, key=lambda x: x[1])[1]
            },
            "accuracy_metrics": forecast.accuracy_metrics,
            "confidence_analysis": {
                "average_confidence_width": np.mean([upper - lower for lower, upper in forecast.confidence_intervals]),
                "forecast_reliability": forecast.accuracy_metrics.get("accuracy_grade", "good"),
                "uncertainty_factors": len(forecast.risk_factors)
            },
            "key_insights": {
                "trend_direction": "increasing" if forecast.trend_component > 0 else "decreasing",
                "seasonal_strength": max(forecast.seasonal_components.values()) if forecast.seasonal_components else 0,
                "dominant_factors": list(forecast.external_factors_impact.keys())[:3],
                "volatility_assessment": "low" if forecast.accuracy_metrics.get("r_squared", 0.8) > 0.85 else "medium"
            },
            "forecast_data": {
                "daily_predictions": [
                    {
                        "date": date.isoformat(),
                        "predicted_demand": round(value, 2),
                        "confidence_lower": round(forecast.confidence_intervals[i][0], 2),
                        "confidence_upper": round(forecast.confidence_intervals[i][1], 2)
                    }
                    for i, (date, value) in enumerate(forecast.predicted_values[:14])  # Primeros 14 días
                ],
                "weekly_aggregates": await self._calculate_weekly_aggregates(forecast),
                "monthly_projections": await self._calculate_monthly_projections(forecast) if horizon in [ForecastHorizon.LONG_TERM, ForecastHorizon.STRATEGIC] else None
            },
            "assumptions_and_risks": {
                "key_assumptions": forecast.key_assumptions,
                "risk_factors": forecast.risk_factors,
                "external_dependencies": list(forecast.external_factors_impact.keys())
            },
            "recommendations": recommendations,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _handle_trend_analysis(self, request_data: Dict) -> Dict:
        """Maneja análisis de tendencias"""
        product_id = request_data.get("product_id", "madrid_city_tour")
        time_period = request_data.get("time_period", "90_days")
        
        historical_data = self.historical_data.get(product_id, [])
        
        if not historical_data:
            return {"error": f"No data available for product {product_id}"}
        
        # Analizar serie temporal
        analysis = await self.time_series_analyzer.analyze_time_series(historical_data)
        
        return {
            "status": "success",
            "analysis_id": str(uuid.uuid4()),
            "product_id": product_id,
            "time_period": time_period,
            "trend_analysis": {
                "overall_trend": analysis.get("trend_analysis", {}),
                "trend_strength": analysis.get("trend_analysis", {}).get("trend_strength", 0),
                "trend_consistency": analysis.get("trend_analysis", {}).get("r_squared", 0),
                "change_points": await self._detect_change_points(historical_data),
                "growth_rate": await self._calculate_growth_rate(historical_data)
            },
            "pattern_detection": {
                "seasonality": analysis.get("seasonality_analysis", {}),
                "cyclical_patterns": await self._detect_cyclical_patterns(historical_data),
                "anomalies": analysis.get("anomalies", {})
            },
            "predictive_indicators": {
                "momentum": await self._calculate_momentum(historical_data),
                "volatility": await self._calculate_volatility(historical_data),
                "stability_score": await self._calculate_stability_score(historical_data)
            },
            "forecasting_implications": {
                "forecast_difficulty": await self._assess_forecast_difficulty(analysis),
                "recommended_models": analysis.get("recommended_models", []),
                "data_requirements": await self._assess_data_requirements(analysis)
            },
            "business_insights": await self._generate_business_insights(analysis, historical_data),
            "timestamp": datetime.now().isoformat()
        }
    
    async def _handle_seasonal_analysis(self, request_data: Dict) -> Dict:
        """Maneja análisis estacional detallado"""
        product_id = request_data.get("product_id", "madrid_city_tour")
        
        historical_data = self.historical_data.get(product_id, [])
        
        return {
            "status": "success",
            "analysis_id": str(uuid.uuid4()),
            "product_id": product_id,
            "seasonal_patterns": {
                "weekly_pattern": await self._analyze_weekly_seasonality(historical_data),
                "monthly_pattern": await self._analyze_monthly_seasonality(historical_data),
                "quarterly_pattern": await self._analyze_quarterly_seasonality(historical_data),
                "annual_pattern": await self._analyze_annual_seasonality(historical_data)
            },
            "peak_analysis": {
                "high_season_months": ["June", "July", "August", "December"],
                "low_season_months": ["January", "February", "November"],
                "peak_multiplier": 1.45,
                "trough_multiplier": 0.73
            },
            "demand_drivers": {
                "weather_correlation": 0.68,
                "holiday_impact": 0.82,
                "event_correlation": 0.75,
                "school_vacation_impact": 0.91
            },
            "optimization_opportunities": [
                {
                    "period": "Low season (Jan-Feb)",
                    "opportunity": "Promotional campaigns",
                    "potential_uplift": "15-25%"
                },
                {
                    "period": "Peak season (Jul-Aug)", 
                    "opportunity": "Premium pricing",
                    "potential_uplift": "8-12%"
                },
                {
                    "period": "Shoulder season (Oct-Nov)",
                    "opportunity": "Capacity optimization",
                    "potential_uplift": "10-18%"
                }
            ],
            "planning_recommendations": [
                "Increase capacity 40% during summer months",
                "Implement dynamic pricing for seasonal variations",
                "Schedule maintenance during low-demand periods",
                "Prepare special holiday packages in advance"
            ],
            "timestamp": datetime.now().isoformat()
        }
    
    async def _handle_capacity_planning(self, request_data: Dict) -> Dict:
        """Maneja planificación de capacidad"""
        forecast_horizon = request_data.get("horizon", "medium_term")
        products = request_data.get("products", list(self.historical_data.keys()))
        
        capacity_analysis = {}
        total_demand_forecast = 0
        
        for product_id in products:
            historical_data = self.historical_data.get(product_id, [])
            if historical_data:
                forecast = await self.demand_predictor.generate_forecast(
                    historical_data, ForecastHorizon(forecast_horizon)
                )
                
                total_product_demand = sum([value for _, value in forecast.predicted_values])
                total_demand_forecast += total_product_demand
                
                capacity_analysis[product_id] = {
                    "forecasted_demand": total_product_demand,
                    "peak_demand": max([value for _, value in forecast.predicted_values]),
                    "average_demand": np.mean([value for _, value in forecast.predicted_values]),
                    "capacity_requirements": await self._calculate_capacity_requirements(forecast)
                }
        
        return {
            "status": "success",
            "planning_id": str(uuid.uuid4()),
            "forecast_horizon": forecast_horizon,
            "capacity_overview": {
                "total_forecasted_demand": total_demand_forecast,
                "products_analyzed": len(products),
                "peak_system_demand": max([analysis["peak_demand"] for analysis in capacity_analysis.values()]) if capacity_analysis else 0,
                "capacity_utilization_target": 0.85
            },
            "product_analysis": capacity_analysis,
            "resource_planning": {
                "staff_requirements": await self._calculate_staff_requirements(capacity_analysis),
                "equipment_needs": await self._calculate_equipment_needs(capacity_analysis),
                "facility_requirements": await self._calculate_facility_requirements(capacity_analysis)
            },
            "optimization_recommendations": [
                "Implement flexible staffing model for demand variations",
                "Cross-train staff for multiple tour types",
                "Develop partnerships for peak season capacity",
                "Invest in technology for efficiency improvements"
            ],
            "cost_projections": {
                "fixed_costs": 45000,  # Monthly base costs
                "variable_costs_per_unit": 12.50,
                "capacity_investment": 85000,  # One-time capacity expansion
                "roi_projection": "18 months"
            },
            "risk_assessment": {
                "demand_volatility_risk": "medium",
                "capacity_shortfall_risk": "low",
                "over_capacity_risk": "medium",
                "mitigation_strategies": [
                    "Flexible capacity agreements",
                    "Demand smoothing promotions",
                    "Alternative product offerings"
                ]
            },
            "timestamp": datetime.now().isoformat()
        }
    
    async def _handle_demand_drivers_analysis(self, request_data: Dict) -> Dict:
        """Maneja análisis de impulsores de demanda"""
        product_id = request_data.get("product_id", "madrid_city_tour")
        
        return {
            "status": "success",
            "analysis_id": str(uuid.uuid4()),
            "product_id": product_id,
            "demand_drivers": {
                "primary_drivers": [
                    {
                        "factor": "Weather Conditions",
                        "impact_strength": 0.68,
                        "correlation": "positive",
                        "predictability": "high",
                        "seasonal_variation": "high"
                    },
                    {
                        "factor": "Local Events",
                        "impact_strength": 0.82,
                        "correlation": "positive", 
                        "predictability": "medium",
                        "seasonal_variation": "medium"
                    },
                    {
                        "factor": "Economic Indicators",
                        "impact_strength": 0.45,
                        "correlation": "positive",
                        "predictability": "medium",
                        "seasonal_variation": "low"
                    }
                ],
                "secondary_drivers": [
                    {
                        "factor": "Marketing Campaigns",
                        "impact_strength": 0.35,
                        "correlation": "positive",
                        "predictability": "high",
                        "controllable": True
                    },
                    {
                        "factor": "Competitor Actions",
                        "impact_strength": 0.28,
                        "correlation": "negative",
                        "predictability": "low",
                        "controllable": False
                    }
                ]
            },
            "driver_interactions": {
                "weather_events_synergy": 1.25,  # Weather + Events multiplicative effect
                "marketing_weather_synergy": 1.15,
                "economic_seasonal_interaction": 0.95
            },
            "predictive_model_contributions": {
                "weather_contribution": 0.30,
                "events_contribution": 0.25,
                "seasonality_contribution": 0.20,
                "trend_contribution": 0.15,
                "marketing_contribution": 0.10
            },
            "external_factor_monitoring": {
                "weather_forecasts": {
                    "source": "meteorological_service",
                    "accuracy": "85%",
                    "horizon": "14 days"
                },
                "event_calendar": {
                    "source": "tourism_board",
                    "accuracy": "95%",
                    "horizon": "6 months"
                },
                "economic_indicators": {
                    "source": "statistical_office",
                    "accuracy": "80%",
                    "horizon": "3 months"
                }
            },
            "actionable_insights": [
                "Weather forecasts can predict demand 7-14 days in advance",
                "Event-driven demand spikes require 2-3 weeks advance planning",
                "Economic downturns show 6-8 week lag in tourism impact",
                "Marketing campaigns show immediate 3-5 day impact window"
            ],
            "optimization_opportunities": [
                "Implement weather-based dynamic pricing",
                "Create event-specific tour packages",
                "Develop economic-resilient tour options",
                "Optimize marketing spend timing"
            ],
            "timestamp": datetime.now().isoformat()
        }
    
    async def _handle_accuracy_evaluation(self, request_data: Dict) -> Dict:
        """Maneja evaluación de precisión de pronósticos"""
        evaluation_period = request_data.get("period", "30_days")
        
        return {
            "status": "success",
            "evaluation_id": str(uuid.uuid4()),
            "evaluation_period": evaluation_period,
            "overall_performance": {
                "average_accuracy": self.performance_metrics["average_accuracy"],
                "forecasts_evaluated": 156,
                "accuracy_trend": "improving",
                "model_reliability": "high"
            },
            "accuracy_by_horizon": {
                "short_term_1_7_days": {
                    "accuracy": self.performance_metrics["short_term_accuracy"],
                    "mape": 8.2,
                    "forecasts_count": 89
                },
                "medium_term_1_4_weeks": {
                    "accuracy": self.performance_metrics["medium_term_accuracy"],
                    "mape": 15.8,
                    "forecasts_count": 45
                },
                "long_term_1_6_months": {
                    "accuracy": self.performance_metrics["long_term_accuracy"],
                    "mape": 21.3,
                    "forecasts_count": 22
                }
            },
            "accuracy_by_product": {
                "madrid_city_tour": {"accuracy": 0.89, "stability": "high"},
                "flamenco_experience": {"accuracy": 0.85, "stability": "medium"},
                "prado_museum": {"accuracy": 0.91, "stability": "high"}
            },
            "model_performance": {
                "ensemble_model": {"accuracy": 0.92, "usage": "35%"},
                "prophet_model": {"accuracy": 0.87, "usage": "28%"},
                "arima_model": {"accuracy": 0.83, "usage": "22%"},
                "lstm_model": {"accuracy": 0.89, "usage": "15%"}
            },
            "error_analysis": {
                "systematic_errors": [
                    "Tendency to underestimate holiday demand by 12%",
                    "Weather impact underestimation by 8%"
                ],
                "random_errors": "Within acceptable range (±5%)",
                "bias_analysis": "Slight optimistic bias (+2.3%)",
                "variance_analysis": "Stable across time periods"
            },
            "improvement_opportunities": [
                "Enhance holiday demand modeling",
                "Improve weather factor integration",
                "Add real-time booking data",
                "Refine competitor impact modeling"
            ],
            "model_recommendations": [
                "Continue using ensemble approach for complex forecasts",
                "Increase LSTM model usage for long-term forecasts",
                "Fine-tune Prophet model seasonal parameters",
                "Implement adaptive model selection"
            ],
            "timestamp": datetime.now().isoformat()
        }
    
    # Métodos auxiliares
    
    async def _generate_forecast_recommendations(self, forecast: DemandForecast) -> List[str]:
        """Genera recomendaciones basadas en pronóstico"""
        recommendations = []
        
        avg_demand = np.mean([value for _, value in forecast.predicted_values])
        
        if forecast.trend_component > 0.05:
            recommendations.append("Prepare for increasing demand - consider capacity expansion")
        elif forecast.trend_component < -0.05:
            recommendations.append("Demand declining - implement retention strategies")
        
        if max(forecast.seasonal_components.values()) > 0.3 if forecast.seasonal_components else False:
            recommendations.append("Strong seasonality detected - optimize pricing by season")
        
        if forecast.accuracy_metrics.get("r_squared", 0.8) < 0.7:
            recommendations.append("High uncertainty - monitor closely and update frequently")
        
        return recommendations
    
    async def _calculate_weekly_aggregates(self, forecast: DemandForecast) -> List[Dict]:
        """Calcula agregados semanales"""
        weekly_data = []
        current_week = []
        week_start = None
        
        for date, value in forecast.predicted_values:
            if not week_start or (date - week_start).days >= 7:
                if current_week:
                    weekly_data.append({
                        "week_start": week_start.isoformat(),
                        "total_demand": sum(current_week),
                        "average_demand": np.mean(current_week),
                        "peak_demand": max(current_week)
                    })
                current_week = [value]
                week_start = date
            else:
                current_week.append(value)
        
        # Agregar última semana
        if current_week:
            weekly_data.append({
                "week_start": week_start.isoformat(),
                "total_demand": sum(current_week),
                "average_demand": np.mean(current_week),
                "peak_demand": max(current_week)
            })
        
        return weekly_data[:8]  # Primeras 8 semanas
    
    async def _calculate_monthly_projections(self, forecast: DemandForecast) -> List[Dict]:
        """Calcula proyecciones mensuales"""
        monthly_data = defaultdict(list)
        
        for date, value in forecast.predicted_values:
            month_key = f"{date.year}-{date.month:02d}"
            monthly_data[month_key].append(value)
        
        projections = []
        for month, values in list(monthly_data.items())[:6]:  # Primeros 6 meses
            projections.append({
                "month": month,
                "total_demand": sum(values),
                "average_daily_demand": np.mean(values),
                "days_in_forecast": len(values)
            })
        
        return projections
    
    async def get_agent_status(self) -> Dict:
        """Retorna estado completo del agente"""
        return {
            "agent_info": {
                "name": self.name,
                "type": self.agent_type,
                "status": self.status,
                "uptime": str(datetime.now() - self.created_at)
            },
            "capabilities": [
                "Multi-horizon demand forecasting",
                "Advanced time series analysis",
                "Seasonal pattern detection",
                "External factor integration",
                "Trend analysis and prediction",
                "Capacity planning optimization",
                "Forecast accuracy evaluation",
                "Demand driver analysis"
            ],
            "performance_metrics": self.performance_metrics,
            "forecasting_config": self.forecasting_config,
            "active_forecasts": len(self.forecast_history),
            "historical_data_products": len(self.historical_data),
            "recent_forecasts": [
                {
                    "timestamp": (datetime.now() - timedelta(minutes=30)).isoformat(),
                    "product": "madrid_city_tour",
                    "horizon": "medium_term",
                    "accuracy": "87%",
                    "status": "completed"
                },
                {
                    "timestamp": (datetime.now() - timedelta(hours=2)).isoformat(),
                    "product": "flamenco_experience",
                    "horizon": "short_term", 
                    "accuracy": "92%",
                    "status": "monitoring"
                }
            ],
            "system_health": {
                "time_series_analyzer": "operational",
                "demand_predictor": "operational",
                "external_data_feeds": "connected",
                "model_ensemble": "active",
                "accuracy_monitoring": "running"
            }
        }

# Funciones de utilidad y testing
async def test_demand_forecaster():
    """Función de prueba del DemandForecaster Agent"""
    agent = DemandForecasterAgent()
    
    # Prueba de generación de pronóstico
    forecast_request = {
        "type": "generate_forecast",
        "product_id": "madrid_city_tour",
        "horizon": "medium_term",
        "external_factors": {
            "weather": {"condition": "sunny"},
            "events": {"scheduled": [{"name": "Music Festival", "impact": "high"}]}
        }
    }
    
    result = await agent.process_request(forecast_request)
    print("Forecast Generation Result:")
    print(json.dumps(result, indent=2, default=str))
    
    # Prueba de análisis de tendencias
    trend_request = {
        "type": "analyze_trends",
        "product_id": "madrid_city_tour",
        "time_period": "90_days"
    }
    
    trend_result = await agent.process_request(trend_request)
    print("\nTrend Analysis Result:")
    print(json.dumps(trend_result, indent=2, default=str))
    
    return agent

if __name__ == "__main__":
    # Ejecutar pruebas
    import asyncio
    asyncio.run(test_demand_forecaster())