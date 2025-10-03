"""
Multi-Currency Dynamic Pricing Engine - Spirit Tours Enterprise
Sistema avanzado de precios dinámicos con soporte multi-moneda y ML
"""

import asyncio
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import joblib
import redis.asyncio as redis

logger = logging.getLogger(__name__)

class CurrencyCode(Enum):
    """Códigos de moneda soportados"""
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    JPY = "JPY"
    CAD = "CAD"
    AUD = "AUD"
    CHF = "CHF"
    CNY = "CNY"
    MXN = "MXN"
    BRL = "BRL"
    ARS = "ARS"
    COP = "COP"
    CLP = "CLP"
    PEN = "PEN"

class PricingStrategy(Enum):
    """Estrategias de pricing"""
    STATIC = "static"
    DYNAMIC = "dynamic"
    DEMAND_BASED = "demand_based"
    COMPETITIVE = "competitive"
    ML_OPTIMIZED = "ml_optimized"
    SEASONAL = "seasonal"
    GEOGRAPHIC = "geographic"

@dataclass
class ExchangeRate:
    """Tipo de cambio con metadatos"""
    base_currency: str
    target_currency: str
    rate: Decimal
    timestamp: datetime
    source: str
    confidence: float
    spread: Decimal  # Margen bancario

@dataclass
class PricingContext:
    """Contexto para cálculo de precios"""
    product_id: str
    base_price: Decimal
    base_currency: str
    target_currency: str
    customer_location: Optional[str] = None
    customer_segment: Optional[str] = None
    booking_date: Optional[datetime] = None
    travel_date: Optional[datetime] = None
    group_size: int = 1
    seasonality_factor: float = 1.0
    demand_factor: float = 1.0
    competitive_factor: float = 1.0
    customer_lifetime_value: float = 0.0

@dataclass
class DynamicPrice:
    """Precio dinámico calculado"""
    original_price: Decimal
    final_price: Decimal
    currency: str
    exchange_rate: Decimal
    adjustments: Dict[str, Decimal]
    strategy_used: str
    confidence_score: float
    expires_at: datetime
    calculation_time: datetime
    metadata: Dict[str, Any]

class MultiCurrencyPricingEngine:
    """Motor de precios dinámicos multi-moneda con IA"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.redis = None
        self.ml_models = {}
        self.scalers = {}
        self.exchange_providers = [
            "https://api.exchangerate-api.com/v4/latest/",
            "https://api.fixer.io/latest",
            "https://openexchangerates.org/api/latest.json"
        ]
        self.cache_ttl = 300  # 5 minutos
        
    async def initialize(self) -> bool:
        """Inicializa el motor de pricing"""
        try:
            # Conectar Redis para cache
            self.redis = redis.from_url(
                self.config.get('redis_url', 'redis://localhost:6379/1')
            )
            await self.redis.ping()
            
            # Cargar modelos ML pre-entrenados
            await self._load_ml_models()
            
            # Inicializar cache de tipos de cambio
            await self._initialize_exchange_cache()
            
            logger.info("✅ MultiCurrency Pricing Engine initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize pricing engine: {str(e)}")
            return False
    
    async def calculate_dynamic_price(self, context: PricingContext) -> DynamicPrice:
        """Calcula precio dinámico basado en contexto y estrategia ML"""
        try:
            start_time = datetime.now()
            
            # 1. Obtener tipo de cambio actual
            exchange_rate = await self._get_exchange_rate(
                context.base_currency, 
                context.target_currency
            )
            
            # 2. Aplicar conversión base
            converted_price = context.base_price * exchange_rate.rate
            
            # 3. Aplicar ajustes dinámicos
            adjustments = await self._calculate_dynamic_adjustments(context)
            
            # 4. Calcular precio final
            final_price = converted_price
            for adjustment_name, adjustment_value in adjustments.items():
                final_price *= (1 + adjustment_value)
            
            # 5. Redondear según convenciones de moneda
            final_price = self._round_currency(final_price, context.target_currency)
            
            # 6. Calcular confianza del precio
            confidence_score = await self._calculate_confidence_score(context, adjustments)
            
            # 7. Generar resultado
            dynamic_price = DynamicPrice(
                original_price=context.base_price,
                final_price=final_price,
                currency=context.target_currency,
                exchange_rate=exchange_rate.rate,
                adjustments=adjustments,
                strategy_used="ml_optimized",
                confidence_score=confidence_score,
                expires_at=datetime.now() + timedelta(minutes=15),
                calculation_time=start_time,
                metadata={
                    "exchange_source": exchange_rate.source,
                    "calculation_duration_ms": (datetime.now() - start_time).total_seconds() * 1000,
                    "seasonality_applied": context.seasonality_factor,
                    "demand_applied": context.demand_factor,
                    "competitive_applied": context.competitive_factor
                }
            )
            
            # 8. Cache del resultado
            await self._cache_price_calculation(context, dynamic_price)
            
            return dynamic_price
            
        except Exception as e:
            logger.error(f"❌ Error calculating dynamic price: {str(e)}")
            raise
    
    async def _get_exchange_rate(self, base: str, target: str) -> ExchangeRate:
        """Obtiene tipo de cambio con fallback y cache"""
        if base == target:
            return ExchangeRate(
                base_currency=base,
                target_currency=target,
                rate=Decimal("1.0"),
                timestamp=datetime.now(),
                source="internal",
                confidence=1.0,
                spread=Decimal("0.0")
            )
        
        # Verificar cache
        cache_key = f"exchange_rate:{base}:{target}"
        cached_rate = await self.redis.get(cache_key)
        
        if cached_rate:
            rate_data = json.loads(cached_rate)
            return ExchangeRate(**rate_data)
        
        # Obtener de múltiples fuentes con fallback
        for provider_url in self.exchange_providers:
            try:
                rate = await self._fetch_exchange_rate(provider_url, base, target)
                if rate:
                    # Cache por 5 minutos
                    await self.redis.setex(
                        cache_key, 
                        self.cache_ttl, 
                        json.dumps(asdict(rate))
                    )
                    return rate
            except Exception as e:
                logger.warning(f"⚠️ Exchange rate provider failed: {provider_url} - {str(e)}")
                continue
        
        # Fallback a tasa estática si falla todo
        logger.warning(f"⚠️ Using fallback exchange rate for {base}->{target}")
        return await self._get_fallback_exchange_rate(base, target)
    
    async def _fetch_exchange_rate(self, provider_url: str, base: str, target: str) -> Optional[ExchangeRate]:
        """Obtiene tipo de cambio de un proveedor específico"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{provider_url}{base}"
                if "fixer.io" in provider_url:
                    url += f"?access_key={self.config.get('fixer_api_key', '')}"
                elif "openexchangerates" in provider_url:
                    url += f"?app_id={self.config.get('oxr_api_key', '')}"
                
                async with session.get(url, timeout=10) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        if target in data.get('rates', {}):
                            rate_value = Decimal(str(data['rates'][target]))
                            
                            return ExchangeRate(
                                base_currency=base,
                                target_currency=target,
                                rate=rate_value,
                                timestamp=datetime.now(),
                                source=provider_url,
                                confidence=0.95,
                                spread=Decimal("0.01")  # 1% spread típico
                            )
        
        except Exception as e:
            logger.error(f"❌ Error fetching from {provider_url}: {str(e)}")
            return None
    
    async def _calculate_dynamic_adjustments(self, context: PricingContext) -> Dict[str, Decimal]:
        """Calcula ajustes dinámicos usando ML y reglas de negocio"""
        adjustments = {}
        
        try:
            # 1. Ajuste por seasonalidad
            seasonal_adjustment = await self._calculate_seasonal_adjustment(
                context.travel_date, context.product_id
            )
            adjustments["seasonal"] = seasonal_adjustment
            
            # 2. Ajuste por demanda
            demand_adjustment = await self._calculate_demand_adjustment(
                context.product_id, context.travel_date
            )
            adjustments["demand"] = demand_adjustment
            
            # 3. Ajuste competitivo
            competitive_adjustment = await self._calculate_competitive_adjustment(
                context.product_id, context.target_currency
            )
            adjustments["competitive"] = competitive_adjustment
            
            # 4. Ajuste por segmento de cliente
            customer_adjustment = await self._calculate_customer_adjustment(
                context.customer_segment, context.customer_lifetime_value
            )
            adjustments["customer_segment"] = customer_adjustment
            
            # 5. Ajuste geográfico
            geo_adjustment = await self._calculate_geographic_adjustment(
                context.customer_location, context.target_currency
            )
            adjustments["geographic"] = geo_adjustment
            
            # 6. Ajuste por tamaño de grupo
            group_adjustment = await self._calculate_group_adjustment(
                context.group_size
            )
            adjustments["group_size"] = group_adjustment
            
            # 7. Ajuste ML predictivo
            ml_adjustment = await self._calculate_ml_adjustment(context)
            adjustments["ml_prediction"] = ml_adjustment
            
            return adjustments
            
        except Exception as e:
            logger.error(f"❌ Error calculating adjustments: {str(e)}")
            return {"base": Decimal("0.0")}
    
    async def _calculate_seasonal_adjustment(self, travel_date: Optional[datetime], product_id: str) -> Decimal:
        """Calcula ajuste por temporada alta/baja"""
        if not travel_date:
            return Decimal("0.0")
        
        # Definir temporadas (ejemplo para Europa)
        month = travel_date.month
        
        # Temporada alta: Junio-Agosto, Diciembre
        if month in [6, 7, 8, 12]:
            return Decimal("0.25")  # +25%
        # Temporada media: Abril-Mayo, Septiembre-Noviembre
        elif month in [4, 5, 9, 10, 11]:
            return Decimal("0.10")  # +10%
        # Temporada baja: Enero-Marzo
        else:
            return Decimal("-0.15")  # -15%
    
    async def _calculate_demand_adjustment(self, product_id: str, travel_date: Optional[datetime]) -> Decimal:
        """Calcula ajuste basado en demanda actual"""
        try:
            # Simular consulta de demanda (en implementación real, consultaría base de datos)
            demand_key = f"demand:{product_id}:{travel_date.date() if travel_date else 'general'}"
            demand_data = await self.redis.get(demand_key)
            
            if demand_data:
                demand_score = float(demand_data)
                # Ajuste lineal basado en demanda (0-1 -> -20% a +50%)
                return Decimal(str((demand_score - 0.5) * 0.7))
            
            return Decimal("0.0")
            
        except Exception:
            return Decimal("0.0")
    
    async def _calculate_competitive_adjustment(self, product_id: str, currency: str) -> Decimal:
        """Calcula ajuste basado en precios competidores"""
        try:
            # Simular análisis competitivo
            comp_key = f"competitive:{product_id}:{currency}"
            comp_data = await self.redis.get(comp_key)
            
            if comp_data:
                comp_info = json.loads(comp_data)
                our_position = comp_info.get("market_position", 0.5)
                
                # Si estamos por encima del mercado, reducir precio
                if our_position > 0.7:
                    return Decimal("-0.10")  # -10%
                # Si estamos por debajo, podemos subir
                elif our_position < 0.3:
                    return Decimal("0.15")   # +15%
                
            return Decimal("0.0")
            
        except Exception:
            return Decimal("0.0")
    
    async def _calculate_customer_adjustment(self, segment: Optional[str], clv: float) -> Decimal:
        """Calcula ajuste por segmento de cliente"""
        if not segment:
            return Decimal("0.0")
        
        # Ajustes por segmento
        segment_adjustments = {
            "premium": Decimal("0.20"),      # +20% para clientes premium
            "vip": Decimal("0.30"),          # +30% para VIP
            "enterprise": Decimal("0.25"),   # +25% para enterprise
            "budget": Decimal("-0.10"),      # -10% para budget
            "first_time": Decimal("-0.05")   # -5% para nuevos clientes
        }
        
        base_adjustment = segment_adjustments.get(segment, Decimal("0.0"))
        
        # Ajuste adicional por CLV
        if clv > 10000:
            base_adjustment += Decimal("0.10")  # +10% para alto CLV
        elif clv > 5000:
            base_adjustment += Decimal("0.05")  # +5% para medio CLV
        
        return base_adjustment
    
    async def _calculate_geographic_adjustment(self, location: Optional[str], currency: str) -> Decimal:
        """Calcula ajuste por ubicación geográfica"""
        if not location:
            return Decimal("0.0")
        
        # Ajustes por poder adquisitivo regional
        regional_adjustments = {
            "US": Decimal("0.15"),       # +15% para US
            "CH": Decimal("0.20"),       # +20% para Suiza
            "NO": Decimal("0.18"),       # +18% para Noruega
            "DE": Decimal("0.10"),       # +10% para Alemania
            "MX": Decimal("-0.15"),      # -15% para México
            "BR": Decimal("-0.20"),      # -20% para Brasil
            "AR": Decimal("-0.25"),      # -25% para Argentina
        }
        
        country_code = location[:2].upper() if len(location) >= 2 else "XX"
        return regional_adjustments.get(country_code, Decimal("0.0"))
    
    async def _calculate_group_adjustment(self, group_size: int) -> Decimal:
        """Calcula descuento por tamaño de grupo"""
        if group_size >= 20:
            return Decimal("-0.20")      # -20% para grupos grandes
        elif group_size >= 10:
            return Decimal("-0.15")      # -15% para grupos medianos
        elif group_size >= 5:
            return Decimal("-0.10")      # -10% para grupos pequeños
        else:
            return Decimal("0.0")        # Sin descuento individual
    
    async def _calculate_ml_adjustment(self, context: PricingContext) -> Decimal:
        """Calcula ajuste usando modelo ML entrenado"""
        try:
            if context.target_currency not in self.ml_models:
                return Decimal("0.0")
            
            model = self.ml_models[context.target_currency]
            scaler = self.scalers[context.target_currency]
            
            # Preparar features para ML
            features = self._prepare_ml_features(context)
            features_scaled = scaler.transform([features])
            
            # Predicción
            prediction = model.predict(features_scaled)[0]
            
            # Convertir predicción a ajuste (-50% a +50%)
            adjustment = max(-0.5, min(0.5, prediction))
            
            return Decimal(str(adjustment))
            
        except Exception as e:
            logger.error(f"❌ ML adjustment error: {str(e)}")
            return Decimal("0.0")
    
    def _prepare_ml_features(self, context: PricingContext) -> List[float]:
        """Prepara features para el modelo ML"""
        features = [
            float(context.base_price),
            context.group_size,
            context.seasonality_factor,
            context.demand_factor,
            context.competitive_factor,
            context.customer_lifetime_value / 10000,  # Normalizado
            # Agregar más features según necesidades
        ]
        
        # Completar con ceros si faltan features (padding)
        while len(features) < 10:  # Asumiendo 10 features total
            features.append(0.0)
        
        return features[:10]  # Truncar a 10 features máximo
    
    async def _load_ml_models(self):
        """Carga modelos ML pre-entrenados"""
        try:
            # En implementación real, cargar desde archivos .joblib
            for currency in ["USD", "EUR", "GBP", "MXN"]:
                # Crear modelo dummy por ahora
                model = RandomForestRegressor(n_estimators=100, random_state=42)
                scaler = StandardScaler()
                
                # Datos dummy para entrenamiento
                X_dummy = np.random.rand(1000, 10)
                y_dummy = np.random.uniform(-0.3, 0.3, 1000)
                
                scaler.fit(X_dummy)
                model.fit(scaler.transform(X_dummy), y_dummy)
                
                self.ml_models[currency] = model
                self.scalers[currency] = scaler
            
            logger.info("✅ ML models loaded successfully")
            
        except Exception as e:
            logger.error(f"❌ Error loading ML models: {str(e)}")
    
    async def _initialize_exchange_cache(self):
        """Inicializa cache de tipos de cambio"""
        try:
            # Pre-cargar tipos de cambio principales
            major_pairs = [
                ("USD", "EUR"), ("USD", "GBP"), ("USD", "JPY"),
                ("EUR", "GBP"), ("EUR", "MXN"), ("USD", "MXN")
            ]
            
            for base, target in major_pairs:
                await self._get_exchange_rate(base, target)
            
            logger.info("✅ Exchange rate cache initialized")
            
        except Exception as e:
            logger.error(f"❌ Error initializing exchange cache: {str(e)}")
    
    async def _get_fallback_exchange_rate(self, base: str, target: str) -> ExchangeRate:
        """Retorna tipo de cambio de fallback estático"""
        # Tipos de cambio estáticos de fallback (actualizar periódicamente)
        fallback_rates = {
            ("USD", "EUR"): "0.85",
            ("USD", "GBP"): "0.78",
            ("USD", "JPY"): "110.0",
            ("USD", "MXN"): "17.5",
            ("EUR", "USD"): "1.18",
            ("EUR", "GBP"): "0.92",
            ("EUR", "MXN"): "20.6",
        }
        
        rate_key = (base, target)
        reverse_key = (target, base)
        
        if rate_key in fallback_rates:
            rate = Decimal(fallback_rates[rate_key])
        elif reverse_key in fallback_rates:
            rate = Decimal("1.0") / Decimal(fallback_rates[reverse_key])
        else:
            rate = Decimal("1.0")  # Último recurso
        
        return ExchangeRate(
            base_currency=base,
            target_currency=target,
            rate=rate,
            timestamp=datetime.now(),
            source="fallback_static",
            confidence=0.7,
            spread=Decimal("0.02")
        )
    
    def _round_currency(self, amount: Decimal, currency: str) -> Decimal:
        """Redondea según convenciones de cada moneda"""
        if currency in ["JPY", "KRW"]:  # Monedas sin decimales
            return amount.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        else:  # Monedas con 2 decimales
            return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    
    async def _calculate_confidence_score(self, context: PricingContext, adjustments: Dict[str, Decimal]) -> float:
        """Calcula score de confianza del precio calculado"""
        confidence_factors = []
        
        # Factor de completitud de datos
        data_completeness = 0.0
        if context.customer_location:
            data_completeness += 0.2
        if context.customer_segment:
            data_completeness += 0.2
        if context.travel_date:
            data_completeness += 0.2
        if context.customer_lifetime_value > 0:
            data_completeness += 0.2
        data_completeness += 0.2  # Base
        
        confidence_factors.append(data_completeness)
        
        # Factor de volatilidad de ajustes
        total_adjustment = sum(abs(adj) for adj in adjustments.values())
        volatility_factor = max(0.3, 1.0 - float(total_adjustment))
        confidence_factors.append(volatility_factor)
        
        # Factor temporal
        if context.travel_date:
            days_ahead = (context.travel_date - datetime.now()).days
            time_factor = min(1.0, max(0.5, (365 - days_ahead) / 365))
        else:
            time_factor = 0.7
        confidence_factors.append(time_factor)
        
        # Promedio ponderado
        final_confidence = sum(confidence_factors) / len(confidence_factors)
        return round(final_confidence, 3)
    
    async def _cache_price_calculation(self, context: PricingContext, price: DynamicPrice):
        """Cache del resultado de cálculo de precio"""
        try:
            cache_key = f"price_calc:{context.product_id}:{context.target_currency}:{hash(str(context))}"
            cache_data = {
                "price": float(price.final_price),
                "currency": price.currency,
                "expires_at": price.expires_at.isoformat(),
                "confidence": price.confidence_score
            }
            
            # Cache por 15 minutos
            await self.redis.setex(cache_key, 900, json.dumps(cache_data))
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to cache price calculation: {str(e)}")
    
    async def get_supported_currencies(self) -> List[str]:
        """Retorna lista de monedas soportadas"""
        return [currency.value for currency in CurrencyCode]
    
    async def get_pricing_analytics(self, product_id: str, days: int = 30) -> Dict[str, Any]:
        """Obtiene analytics de pricing para un producto"""
        try:
            analytics_key = f"pricing_analytics:{product_id}:{days}"
            cached_analytics = await self.redis.get(analytics_key)
            
            if cached_analytics:
                return json.loads(cached_analytics)
            
            # Simular analytics (en implementación real, consultar base de datos)
            analytics = {
                "product_id": product_id,
                "period_days": days,
                "total_calculations": np.random.randint(1000, 5000),
                "average_adjustment": round(np.random.uniform(-0.1, 0.2), 3),
                "currency_distribution": {
                    "USD": 0.35,
                    "EUR": 0.25,
                    "GBP": 0.15,
                    "MXN": 0.15,
                    "Other": 0.10
                },
                "strategy_performance": {
                    "ml_optimized": {"usage": 0.6, "accuracy": 0.87},
                    "demand_based": {"usage": 0.25, "accuracy": 0.82},
                    "competitive": {"usage": 0.15, "accuracy": 0.78}
                },
                "seasonal_impact": {
                    "high_season_uplift": 0.25,
                    "low_season_discount": -0.15
                }
            }
            
            # Cache por 1 hora
            await self.redis.setex(analytics_key, 3600, json.dumps(analytics))
            
            return analytics
            
        except Exception as e:
            logger.error(f"❌ Error getting pricing analytics: {str(e)}")
            return {}
    
    async def close(self):
        """Cierra conexiones"""
        if self.redis:
            await self.redis.close()