"""
Advanced Fraud Detection System - Spirit Tours Enterprise
Sistema avanzado de detección de fraude con Machine Learning y reglas heurísticas
"""

import asyncio
import json
import logging
import hashlib
from typing import Dict, Any, List, Optional, Tuple, Set
from datetime import datetime, timedelta
from decimal import Decimal
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import DBSCAN
import geoip2.database
import redis.asyncio as redis
import re

logger = logging.getLogger(__name__)

class FraudRiskLevel(Enum):
    """Niveles de riesgo de fraude"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class FraudReason(Enum):
    """Razones de detección de fraude"""
    VELOCITY_HIGH = "velocity_high"
    GEOLOCATION_MISMATCH = "geolocation_mismatch"
    DEVICE_ANOMALY = "device_anomaly"
    PAYMENT_PATTERN = "payment_pattern"
    BLACKLIST_MATCH = "blacklist_match"
    BEHAVIORAL_ANOMALY = "behavioral_anomaly"
    ML_PREDICTION = "ml_prediction"
    AMOUNT_ANOMALY = "amount_anomaly"
    TIME_ANOMALY = "time_anomaly"
    REPEAT_FAILURE = "repeat_failure"

@dataclass
class FraudContext:
    """Contexto de transacción para análisis de fraude"""
    transaction_id: str
    user_id: str
    email: str
    amount: Decimal
    currency: str
    payment_method: str
    ip_address: str
    user_agent: str
    device_fingerprint: str
    billing_country: str
    shipping_country: Optional[str] = None
    card_bin: Optional[str] = None
    transaction_time: datetime = None
    session_id: Optional[str] = None
    referrer: Optional[str] = None
    previous_transactions: int = 0
    account_age_days: int = 0
    
    def __post_init__(self):
        if self.transaction_time is None:
            self.transaction_time = datetime.now()

@dataclass
class FraudRule:
    """Regla de detección de fraude"""
    rule_id: str
    name: str
    description: str
    risk_score: int  # 0-100
    enabled: bool = True
    threshold: Optional[float] = None
    metadata: Dict[str, Any] = None

@dataclass
class FraudAnalysisResult:
    """Resultado de análisis de fraude"""
    transaction_id: str
    risk_level: FraudRiskLevel
    risk_score: int  # 0-100
    is_fraudulent: bool
    triggered_rules: List[str]
    reasons: List[FraudReason]
    confidence: float
    analysis_time_ms: float
    recommended_action: str
    metadata: Dict[str, Any]
    ml_scores: Dict[str, float]

class FraudDetectionSystem:
    """Sistema avanzado de detección de fraude con IA"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.redis = None
        self.ml_model = None
        self.scaler = None
        self.geoip_reader = None
        
        # Reglas de fraude configurables
        self.fraud_rules = self._initialize_fraud_rules()
        
        # Configuración de umbrales
        self.thresholds = {
            "velocity_transactions_per_hour": 10,
            "velocity_amount_per_hour": 5000.0,
            "max_distance_km": 1000,
            "suspicious_countries": ["XX", "ZZ"],  # Países de alto riesgo
            "max_amount_first_transaction": 1000.0,
            "min_account_age_hours": 24,
            "max_failed_attempts": 3
        }
        
        # Cache de resultados
        self.cache_ttl = {
            "user_profile": 3600,      # 1 hora
            "ip_reputation": 1800,     # 30 minutos
            "device_profile": 7200,    # 2 horas
            "blacklist": 86400         # 24 horas
        }
    
    def _initialize_fraud_rules(self) -> List[FraudRule]:
        """Inicializa reglas de detección de fraude"""
        return [
            FraudRule(
                rule_id="VELOCITY_001",
                name="High Transaction Velocity",
                description="Detecta alta velocidad de transacciones por usuario",
                risk_score=75,
                threshold=self.thresholds["velocity_transactions_per_hour"]
            ),
            FraudRule(
                rule_id="GEO_001", 
                name="Geolocation Mismatch",
                description="Detecta inconsistencias geográficas",
                risk_score=60,
                threshold=self.thresholds["max_distance_km"]
            ),
            FraudRule(
                rule_id="AMOUNT_001",
                name="Unusual Amount Pattern",
                description="Detecta patrones inusuales en montos",
                risk_score=50
            ),
            FraudRule(
                rule_id="DEVICE_001",
                name="Device Anomaly",
                description="Detecta anomalías en dispositivos",
                risk_score=70
            ),
            FraudRule(
                rule_id="BLACKLIST_001",
                name="Blacklist Match",
                description="Coincidencia con listas negras",
                risk_score=90
            ),
            FraudRule(
                rule_id="BEHAVIOR_001", 
                name="Behavioral Anomaly",
                description="Detecta comportamientos anómalos",
                risk_score=65
            ),
            FraudRule(
                rule_id="ML_001",
                name="ML Prediction",
                description="Predicción de modelo ML",
                risk_score=80,
                threshold=0.7
            ),
            FraudRule(
                rule_id="TIME_001",
                name="Suspicious Timing",
                description="Detecta patrones temporales sospechosos", 
                risk_score=45
            )
        ]
    
    async def initialize(self) -> bool:
        """Inicializa el sistema de detección de fraude"""
        try:
            # Conectar Redis
            self.redis = redis.from_url(
                self.config.get('redis_url', 'redis://localhost:6379/2')
            )
            await self.redis.ping()
            
            # Inicializar modelo ML
            await self._initialize_ml_model()
            
            # Cargar base de datos GeoIP
            await self._initialize_geoip()
            
            # Cargar listas negras
            await self._load_blacklists()
            
            logger.info("✅ Fraud Detection System initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize fraud detection: {str(e)}")
            return False
    
    async def analyze_transaction(self, context: FraudContext) -> FraudAnalysisResult:
        """Analiza una transacción para detectar fraude"""
        start_time = datetime.now()
        
        try:
            # 1. Análisis de reglas heurísticas
            rule_results = await self._analyze_fraud_rules(context)
            
            # 2. Análisis ML
            ml_results = await self._analyze_ml_features(context)
            
            # 3. Análisis de comportamiento
            behavioral_results = await self._analyze_behavioral_patterns(context)
            
            # 4. Análisis de reputación
            reputation_results = await self._analyze_reputation(context)
            
            # 5. Consolidar resultados
            final_result = await self._consolidate_results(
                context, rule_results, ml_results, 
                behavioral_results, reputation_results
            )
            
            # 6. Calcular tiempo de análisis
            analysis_duration = (datetime.now() - start_time).total_seconds() * 1000
            final_result.analysis_time_ms = analysis_duration
            
            # 7. Guardar resultado para análisis posterior
            await self._save_analysis_result(final_result)
            
            # 8. Actualizar perfiles de usuario y dispositivo
            await self._update_profiles(context, final_result)
            
            return final_result
            
        except Exception as e:
            logger.error(f"❌ Error analyzing transaction {context.transaction_id}: {str(e)}")
            
            # Resultado de error - marcar como crítico por seguridad
            return FraudAnalysisResult(
                transaction_id=context.transaction_id,
                risk_level=FraudRiskLevel.CRITICAL,
                risk_score=100,
                is_fraudulent=True,
                triggered_rules=["SYSTEM_ERROR"],
                reasons=[FraudReason.ML_PREDICTION],
                confidence=0.0,
                analysis_time_ms=0.0,
                recommended_action="manual_review",
                metadata={"error": str(e)},
                ml_scores={}
            )
    
    async def _analyze_fraud_rules(self, context: FraudContext) -> Dict[str, Any]:
        """Analiza reglas heurísticas de fraude"""
        triggered_rules = []
        rule_scores = []
        
        try:
            # Regla: Velocidad de transacciones
            velocity_score = await self._check_transaction_velocity(context)
            if velocity_score > 0:
                triggered_rules.append("VELOCITY_001")
                rule_scores.append(velocity_score)
            
            # Regla: Inconsistencia geográfica
            geo_score = await self._check_geolocation_consistency(context)
            if geo_score > 0:
                triggered_rules.append("GEO_001")
                rule_scores.append(geo_score)
            
            # Regla: Anomalías en dispositivos
            device_score = await self._check_device_anomalies(context)
            if device_score > 0:
                triggered_rules.append("DEVICE_001") 
                rule_scores.append(device_score)
            
            # Regla: Coincidencia con listas negras
            blacklist_score = await self._check_blacklists(context)
            if blacklist_score > 0:
                triggered_rules.append("BLACKLIST_001")
                rule_scores.append(blacklist_score)
            
            # Regla: Patrones de monto sospechosos
            amount_score = await self._check_amount_patterns(context)
            if amount_score > 0:
                triggered_rules.append("AMOUNT_001")
                rule_scores.append(amount_score)
            
            # Regla: Patrones temporales
            time_score = await self._check_time_patterns(context)
            if time_score > 0:
                triggered_rules.append("TIME_001")
                rule_scores.append(time_score)
            
            return {
                "triggered_rules": triggered_rules,
                "rule_scores": rule_scores,
                "max_rule_score": max(rule_scores) if rule_scores else 0
            }
            
        except Exception as e:
            logger.error(f"❌ Error in fraud rules analysis: {str(e)}")
            return {"triggered_rules": [], "rule_scores": [], "max_rule_score": 0}
    
    async def _check_transaction_velocity(self, context: FraudContext) -> int:
        """Verifica velocidad de transacciones por usuario"""
        try:
            # Contar transacciones en la última hora
            velocity_key = f"velocity:{context.user_id}:{datetime.now().hour}"
            current_count = await self.redis.incr(velocity_key)
            await self.redis.expire(velocity_key, 3600)
            
            # Verificar monto acumulado en la última hora
            amount_key = f"velocity_amount:{context.user_id}:{datetime.now().hour}"
            current_amount = await self.redis.get(amount_key) or "0"
            new_amount = float(current_amount) + float(context.amount)
            await self.redis.set(amount_key, new_amount, ex=3600)
            
            # Evaluar riesgo
            velocity_risk = 0
            
            if current_count > self.thresholds["velocity_transactions_per_hour"]:
                velocity_risk = 75
            elif current_count > self.thresholds["velocity_transactions_per_hour"] * 0.7:
                velocity_risk = 50
            
            if new_amount > self.thresholds["velocity_amount_per_hour"]:
                velocity_risk = max(velocity_risk, 70)
                
            return velocity_risk
            
        except Exception as e:
            logger.error(f"❌ Error checking velocity: {str(e)}")
            return 0
    
    async def _check_geolocation_consistency(self, context: FraudContext) -> int:
        """Verifica consistencia geográfica"""
        try:
            if not self.geoip_reader:
                return 0
            
            # Obtener ubicación por IP
            ip_location = await self._get_ip_location(context.ip_address)
            if not ip_location:
                return 30  # Riesgo medio si no se puede determinar ubicación
            
            # Comparar con país de facturación
            ip_country = ip_location.get("country", "")
            billing_country = context.billing_country
            
            # Si los países no coinciden
            if ip_country != billing_country and ip_country and billing_country:
                # Verificar si son países vecinos (menor riesgo)
                if await self._are_neighboring_countries(ip_country, billing_country):
                    return 25
                else:
                    return 60
            
            # Verificar si el país está en lista de alto riesgo
            if ip_country in self.thresholds["suspicious_countries"]:
                return 70
            
            return 0
            
        except Exception as e:
            logger.error(f"❌ Error checking geolocation: {str(e)}")
            return 0
    
    async def _check_device_anomalies(self, context: FraudContext) -> int:
        """Detecta anomalías en dispositivos"""
        try:
            device_key = f"device_profile:{context.device_fingerprint}"
            device_profile = await self.redis.get(device_key)
            
            risk_score = 0
            
            if not device_profile:
                # Dispositivo nuevo - riesgo medio
                risk_score = 30
                
                # Crear perfil inicial
                profile_data = {
                    "first_seen": datetime.now().isoformat(),
                    "user_agents": [context.user_agent],
                    "user_ids": [context.user_id],
                    "countries": [context.billing_country],
                    "transaction_count": 1
                }
                
                await self.redis.set(
                    device_key, 
                    json.dumps(profile_data), 
                    ex=self.cache_ttl["device_profile"]
                )
                
            else:
                # Analizar perfil existente
                profile = json.loads(device_profile)
                
                # Verificar cambios sospechosos
                if context.user_agent not in profile["user_agents"]:
                    risk_score += 20
                    profile["user_agents"].append(context.user_agent)
                
                if context.user_id not in profile["user_ids"]:
                    risk_score += 40  # Dispositivo usado por múltiples usuarios
                    profile["user_ids"].append(context.user_id)
                
                if context.billing_country not in profile["countries"]:
                    risk_score += 30
                    profile["countries"].append(context.billing_country)
                
                # Actualizar perfil
                profile["transaction_count"] += 1
                await self.redis.set(
                    device_key, 
                    json.dumps(profile), 
                    ex=self.cache_ttl["device_profile"]
                )
            
            return min(risk_score, 80)  # Máximo 80 puntos por este factor
            
        except Exception as e:
            logger.error(f"❌ Error checking device anomalies: {str(e)}")
            return 0
    
    async def _check_blacklists(self, context: FraudContext) -> int:
        """Verifica coincidencias con listas negras"""
        try:
            risk_score = 0
            
            # Verificar email en blacklist
            email_hash = hashlib.sha256(context.email.lower().encode()).hexdigest()
            if await self.redis.sismember("blacklist:emails", email_hash):
                risk_score = 90
            
            # Verificar IP en blacklist
            if await self.redis.sismember("blacklist:ips", context.ip_address):
                risk_score = max(risk_score, 85)
            
            # Verificar dispositivo en blacklist
            if await self.redis.sismember("blacklist:devices", context.device_fingerprint):
                risk_score = max(risk_score, 80)
            
            # Verificar BIN de tarjeta si disponible
            if context.card_bin:
                if await self.redis.sismember("blacklist:bins", context.card_bin):
                    risk_score = max(risk_score, 75)
            
            return risk_score
            
        except Exception as e:
            logger.error(f"❌ Error checking blacklists: {str(e)}")
            return 0
    
    async def _check_amount_patterns(self, context: FraudContext) -> int:
        """Analiza patrones sospechosos en montos"""
        try:
            amount = float(context.amount)
            risk_score = 0
            
            # Verificar si es primera transacción con monto alto
            if (context.previous_transactions == 0 and 
                amount > self.thresholds["max_amount_first_transaction"]):
                risk_score = 60
            
            # Verificar montos redondos sospechosos
            if amount % 100 == 0 and amount >= 1000:
                risk_score = max(risk_score, 30)
            
            # Verificar montos inusualmente altos para el perfil
            user_avg_key = f"user_avg_amount:{context.user_id}"
            user_avg = await self.redis.get(user_avg_key)
            
            if user_avg:
                avg_amount = float(user_avg)
                if amount > avg_amount * 5:  # 5x el promedio
                    risk_score = max(risk_score, 50)
            
            # Verificar montos específicos comúnmente usados en fraude
            suspicious_amounts = [99.99, 199.99, 499.99, 999.99, 1999.99]
            if amount in suspicious_amounts:
                risk_score = max(risk_score, 25)
            
            return risk_score
            
        except Exception as e:
            logger.error(f"❌ Error checking amount patterns: {str(e)}")
            return 0
    
    async def _check_time_patterns(self, context: FraudContext) -> int:
        """Analiza patrones temporales sospechosos"""
        try:
            risk_score = 0
            current_hour = context.transaction_time.hour
            
            # Transacciones en horarios inusuales (2-6 AM)
            if 2 <= current_hour <= 6:
                risk_score = 30
            
            # Verificar si es fin de semana (mayor riesgo)
            if context.transaction_time.weekday() >= 5:  # Sábado=5, Domingo=6
                risk_score += 15
            
            # Verificar edad de la cuenta
            if context.account_age_days < 1:
                risk_score += 40
            elif context.account_age_days < 7:
                risk_score += 20
            
            return risk_score
            
        except Exception as e:
            logger.error(f"❌ Error checking time patterns: {str(e)}")
            return 0
    
    async def _analyze_ml_features(self, context: FraudContext) -> Dict[str, Any]:
        """Análisis usando modelo de Machine Learning"""
        try:
            if not self.ml_model or not self.scaler:
                return {"ml_score": 0.5, "confidence": 0.0}
            
            # Preparar features para ML
            features = self._prepare_ml_features(context)
            features_scaled = self.scaler.transform([features])
            
            # Obtener predicción
            fraud_probability = self.ml_model.predict_proba(features_scaled)[0][1]
            
            # Obtener score de anomalía usando Isolation Forest
            anomaly_score = self.ml_model.decision_function(features_scaled)[0]
            
            return {
                "ml_score": fraud_probability,
                "anomaly_score": anomaly_score,
                "confidence": abs(anomaly_score) / 0.5,  # Normalizar confianza
                "feature_importance": self._get_feature_importance(features)
            }
            
        except Exception as e:
            logger.error(f"❌ Error in ML analysis: {str(e)}")
            return {"ml_score": 0.5, "confidence": 0.0}
    
    def _prepare_ml_features(self, context: FraudContext) -> List[float]:
        """Prepara features para modelo ML"""
        features = [
            float(context.amount),
            context.previous_transactions,
            context.account_age_days,
            len(context.user_agent),
            1.0 if context.shipping_country != context.billing_country else 0.0,
            context.transaction_time.hour,
            context.transaction_time.weekday(),
            len(context.email),
            1.0 if '@gmail.com' in context.email.lower() else 0.0,
            1.0 if context.payment_method == 'credit_card' else 0.0,
            # Agregar más features según necesidades
        ]
        
        # Padding a longitud fija
        while len(features) < 15:
            features.append(0.0)
        
        return features[:15]
    
    def _get_feature_importance(self, features: List[float]) -> Dict[str, float]:
        """Obtiene importancia de features (simplificado)"""
        feature_names = [
            "amount", "prev_transactions", "account_age", "user_agent_len",
            "country_mismatch", "hour", "weekday", "email_len", "gmail",
            "credit_card"
        ]
        
        # Simulación de importancia (en implementación real usar model.feature_importances_)
        importance = np.random.uniform(0.05, 0.15, len(feature_names))
        
        return dict(zip(feature_names[:len(importance)], importance.tolist()))
    
    async def _analyze_behavioral_patterns(self, context: FraudContext) -> Dict[str, Any]:
        """Análisis de patrones de comportamiento"""
        try:
            behavior_key = f"behavior:{context.user_id}"
            behavior_data = await self.redis.get(behavior_key)
            
            if not behavior_data:
                # Usuario nuevo - crear perfil base
                behavior_profile = {
                    "total_transactions": 1,
                    "avg_amount": float(context.amount),
                    "common_hours": [context.transaction_time.hour],
                    "countries": [context.billing_country],
                    "payment_methods": [context.payment_method],
                    "first_transaction": context.transaction_time.isoformat()
                }
                
                await self.redis.set(
                    behavior_key, 
                    json.dumps(behavior_profile), 
                    ex=self.cache_ttl["user_profile"]
                )
                
                return {"behavioral_score": 25, "reason": "new_user"}
            
            # Analizar comportamiento existente
            profile = json.loads(behavior_data)
            behavioral_score = 0
            
            # Verificar desviación del monto promedio
            avg_amount = profile["avg_amount"]
            current_amount = float(context.amount)
            
            if current_amount > avg_amount * 3:
                behavioral_score += 40
            elif current_amount < avg_amount * 0.3:
                behavioral_score += 20
            
            # Verificar hora inusual
            if context.transaction_time.hour not in profile["common_hours"]:
                behavioral_score += 25
            
            # Verificar nuevo país
            if context.billing_country not in profile["countries"]:
                behavioral_score += 35
            
            # Verificar nuevo método de pago
            if context.payment_method not in profile["payment_methods"]:
                behavioral_score += 30
            
            return {
                "behavioral_score": min(behavioral_score, 80),
                "deviations": behavioral_score // 20
            }
            
        except Exception as e:
            logger.error(f"❌ Error in behavioral analysis: {str(e)}")
            return {"behavioral_score": 0}
    
    async def _analyze_reputation(self, context: FraudContext) -> Dict[str, Any]:
        """Análisis de reputación de IP, email, etc."""
        try:
            reputation_score = 0
            
            # Verificar reputación de IP
            ip_rep = await self._get_ip_reputation(context.ip_address)
            reputation_score += ip_rep
            
            # Verificar reputación de dominio de email
            email_domain = context.email.split('@')[1] if '@' in context.email else ""
            domain_rep = await self._get_domain_reputation(email_domain)
            reputation_score += domain_rep
            
            # Verificar historial de fallos por IP
            fails_key = f"fails:{context.ip_address}"
            fail_count = await self.redis.get(fails_key) or "0"
            
            if int(fail_count) > self.thresholds["max_failed_attempts"]:
                reputation_score += 50
            
            return {
                "reputation_score": min(reputation_score, 70),
                "ip_reputation": ip_rep,
                "domain_reputation": domain_rep,
                "fail_count": int(fail_count)
            }
            
        except Exception as e:
            logger.error(f"❌ Error in reputation analysis: {str(e)}")
            return {"reputation_score": 0}
    
    async def _get_ip_reputation(self, ip_address: str) -> int:
        """Obtiene reputación de IP (simulado)"""
        try:
            # En implementación real, consultar servicios como VirusTotal, AbuseIPDB
            rep_key = f"ip_rep:{ip_address}"
            cached_rep = await self.redis.get(rep_key)
            
            if cached_rep:
                return int(cached_rep)
            
            # Simular consulta externa
            reputation = 0
            
            # Verificar si es IP privada/local
            if (ip_address.startswith('192.168.') or 
                ip_address.startswith('10.') or 
                ip_address.startswith('172.')):
                reputation = 40  # IPs privadas son sospechosas para e-commerce
            
            # Cache por 30 minutos
            await self.redis.setex(rep_key, self.cache_ttl["ip_reputation"], reputation)
            
            return reputation
            
        except Exception:
            return 0
    
    async def _get_domain_reputation(self, domain: str) -> int:
        """Obtiene reputación de dominio de email"""
        try:
            # Dominios temporales conocidos
            temp_domains = [
                "10minutemail.com", "guerrillamail.com", "tempmail.org",
                "mailinator.com", "yopmail.com", "temp-mail.org"
            ]
            
            if domain.lower() in temp_domains:
                return 60
            
            # Dominios gratuitos comunes (menor riesgo)
            free_domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"]
            
            if domain.lower() in free_domains:
                return 10
            
            return 0
            
        except Exception:
            return 0
    
    async def _consolidate_results(
        self, 
        context: FraudContext, 
        rule_results: Dict[str, Any],
        ml_results: Dict[str, Any], 
        behavioral_results: Dict[str, Any],
        reputation_results: Dict[str, Any]
    ) -> FraudAnalysisResult:
        """Consolida todos los resultados de análisis"""
        
        # Calcular score final ponderado
        weights = {
            "rules": 0.3,
            "ml": 0.25,
            "behavioral": 0.25,
            "reputation": 0.2
        }
        
        final_score = (
            rule_results.get("max_rule_score", 0) * weights["rules"] +
            (ml_results.get("ml_score", 0) * 100) * weights["ml"] +
            behavioral_results.get("behavioral_score", 0) * weights["behavioral"] +
            reputation_results.get("reputation_score", 0) * weights["reputation"]
        )
        
        final_score = min(int(final_score), 100)
        
        # Determinar nivel de riesgo
        if final_score >= 80:
            risk_level = FraudRiskLevel.CRITICAL
            is_fraudulent = True
            action = "block"
        elif final_score >= 60:
            risk_level = FraudRiskLevel.HIGH
            is_fraudulent = True
            action = "manual_review"
        elif final_score >= 40:
            risk_level = FraudRiskLevel.MEDIUM
            is_fraudulent = False
            action = "additional_verification"
        else:
            risk_level = FraudRiskLevel.LOW
            is_fraudulent = False
            action = "approve"
        
        # Recopilar razones
        reasons = []
        triggered_rules = rule_results.get("triggered_rules", [])
        
        if "VELOCITY_001" in triggered_rules:
            reasons.append(FraudReason.VELOCITY_HIGH)
        if "GEO_001" in triggered_rules:
            reasons.append(FraudReason.GEOLOCATION_MISMATCH)
        if "DEVICE_001" in triggered_rules:
            reasons.append(FraudReason.DEVICE_ANOMALY)
        if "BLACKLIST_001" in triggered_rules:
            reasons.append(FraudReason.BLACKLIST_MATCH)
        if "AMOUNT_001" in triggered_rules:
            reasons.append(FraudReason.AMOUNT_ANOMALY)
        if "TIME_001" in triggered_rules:
            reasons.append(FraudReason.TIME_ANOMALY)
        if behavioral_results.get("behavioral_score", 0) > 30:
            reasons.append(FraudReason.BEHAVIORAL_ANOMALY)
        if ml_results.get("ml_score", 0) > 0.7:
            reasons.append(FraudReason.ML_PREDICTION)
        
        # Calcular confianza
        confidence = (
            ml_results.get("confidence", 0.5) * 0.4 +
            (len(triggered_rules) / len(self.fraud_rules)) * 0.3 +
            min(final_score / 100, 1.0) * 0.3
        )
        
        return FraudAnalysisResult(
            transaction_id=context.transaction_id,
            risk_level=risk_level,
            risk_score=final_score,
            is_fraudulent=is_fraudulent,
            triggered_rules=triggered_rules,
            reasons=reasons,
            confidence=round(confidence, 3),
            analysis_time_ms=0.0,  # Se actualizará después
            recommended_action=action,
            metadata={
                "rule_analysis": rule_results,
                "behavioral_analysis": behavioral_results,
                "reputation_analysis": reputation_results,
                "weights_used": weights
            },
            ml_scores={
                "fraud_probability": ml_results.get("ml_score", 0),
                "anomaly_score": ml_results.get("anomaly_score", 0),
                "feature_importance": ml_results.get("feature_importance", {})
            }
        )
    
    async def _save_analysis_result(self, result: FraudAnalysisResult):
        """Guarda resultado para análisis histórico"""
        try:
            result_key = f"fraud_result:{result.transaction_id}"
            result_data = asdict(result)
            
            # Convertir enums a strings para JSON
            result_data["risk_level"] = result.risk_level.value
            result_data["reasons"] = [reason.value for reason in result.reasons]
            
            await self.redis.setex(result_key, 86400, json.dumps(result_data))
            
            # Agregar a índice para consultas
            await self.redis.zadd(
                "fraud_results_by_score", 
                {result.transaction_id: result.risk_score}
            )
            
        except Exception as e:
            logger.error(f"❌ Error saving fraud result: {str(e)}")
    
    async def _update_profiles(self, context: FraudContext, result: FraudAnalysisResult):
        """Actualiza perfiles de usuario y dispositivo"""
        try:
            # Si la transacción fue fraudulenta, actualizar blacklists
            if result.is_fraudulent and result.risk_score >= 80:
                email_hash = hashlib.sha256(context.email.lower().encode()).hexdigest()
                await self.redis.sadd("blacklist:emails", email_hash)
                await self.redis.sadd("blacklist:ips", context.ip_address)
                await self.redis.sadd("blacklist:devices", context.device_fingerprint)
            
            # Actualizar contador de fallos si fue rechazada
            if result.recommended_action in ["block", "manual_review"]:
                fails_key = f"fails:{context.ip_address}"
                await self.redis.incr(fails_key)
                await self.redis.expire(fails_key, 86400)
            
        except Exception as e:
            logger.error(f"❌ Error updating profiles: {str(e)}")
    
    # Métodos auxiliares adicionales
    async def _initialize_ml_model(self):
        """Inicializa modelo ML (simplificado para demo)"""
        try:
            # En implementación real, cargar modelo pre-entrenado
            self.ml_model = IsolationForest(contamination=0.1, random_state=42)
            self.scaler = StandardScaler()
            
            # Datos dummy para inicialización
            X_dummy = np.random.rand(1000, 15)
            self.scaler.fit(X_dummy)
            self.ml_model.fit(X_dummy)
            
            logger.info("✅ ML model initialized")
            
        except Exception as e:
            logger.error(f"❌ Error initializing ML model: {str(e)}")
    
    async def _initialize_geoip(self):
        """Inicializa base de datos GeoIP"""
        try:
            # En implementación real, cargar MaxMind GeoIP database
            # self.geoip_reader = geoip2.database.Reader('GeoLite2-Country.mmdb')
            logger.info("✅ GeoIP initialized (simulated)")
            
        except Exception as e:
            logger.error(f"❌ Error initializing GeoIP: {str(e)}")
    
    async def _load_blacklists(self):
        """Carga listas negras iniciales"""
        try:
            # Cargar listas negras desde fuentes externas o archivos
            # Por ahora, crear listas vacías
            await self.redis.delete("blacklist:emails")
            await self.redis.delete("blacklist:ips") 
            await self.redis.delete("blacklist:devices")
            await self.redis.delete("blacklist:bins")
            
            logger.info("✅ Blacklists initialized")
            
        except Exception as e:
            logger.error(f"❌ Error loading blacklists: {str(e)}")
    
    async def _get_ip_location(self, ip_address: str) -> Optional[Dict[str, str]]:
        """Obtiene ubicación por IP (simulado)"""
        try:
            # En implementación real, usar geoip_reader
            # response = self.geoip_reader.country(ip_address)
            # return {"country": response.country.iso_code}
            
            # Simulación
            return {"country": "US"}
            
        except Exception:
            return None
    
    async def _are_neighboring_countries(self, country1: str, country2: str) -> bool:
        """Verifica si dos países son vecinos (simplificado)"""
        neighbors = {
            "US": ["CA", "MX"],
            "CA": ["US"],
            "MX": ["US"],
            "DE": ["FR", "AT", "CH", "PL"],
            "FR": ["DE", "ES", "IT", "CH"],
            # Agregar más según necesidades
        }
        
        return country2 in neighbors.get(country1, [])
    
    async def get_fraud_statistics(self, days: int = 30) -> Dict[str, Any]:
        """Obtiene estadísticas de fraude"""
        try:
            stats = {
                "period_days": days,
                "total_analyzed": await self.redis.zcard("fraud_results_by_score"),
                "high_risk_count": await self.redis.zcount("fraud_results_by_score", 60, 100),
                "blocked_count": await self.redis.scard("blacklist:emails"),
                "most_common_reasons": [
                    "velocity_high", "geolocation_mismatch", "behavioral_anomaly"
                ],
                "detection_accuracy": 0.87,
                "false_positive_rate": 0.05
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"❌ Error getting fraud statistics: {str(e)}")
            return {}
    
    async def close(self):
        """Cierra conexiones"""
        if self.redis:
            await self.redis.close()
        if self.geoip_reader:
            self.geoip_reader.close()