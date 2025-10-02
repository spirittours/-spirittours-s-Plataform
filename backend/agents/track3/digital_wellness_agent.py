"""
Digital Wellness Agent - Track 3
Agente especializado en bienestar digital, equilibrio tecnológico y salud mental
en experiencias de viaje.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import asyncio
import aiohttp
from dataclasses import dataclass, field
import numpy as np
from enum import Enum
import hashlib
import re
from collections import defaultdict

# Configuración de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WellnessLevel(Enum):
    """Niveles de bienestar digital"""
    EXCELLENT = "excellent"
    GOOD = "good"
    MODERATE = "moderate"
    NEEDS_IMPROVEMENT = "needs_improvement"
    CRITICAL = "critical"

class DigitalActivity(Enum):
    """Tipos de actividad digital"""
    SCREEN_TIME = "screen_time"
    SOCIAL_MEDIA = "social_media"
    BOOKING_APPS = "booking_apps"
    NAVIGATION = "navigation"
    COMMUNICATION = "communication"
    ENTERTAINMENT = "entertainment"
    WORK = "work"
    PHOTOGRAPHY = "photography"

class StressIndicator(Enum):
    """Indicadores de estrés digital"""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    SEVERE = "severe"

@dataclass
class DigitalWellnessProfile:
    """Perfil de bienestar digital del usuario"""
    user_id: str
    screen_time_daily_avg: float  # horas
    app_usage_pattern: Dict[str, float]
    notification_frequency: int
    digital_breaks_taken: int
    wellness_score: float
    stress_level: StressIndicator
    recommendations: List[str] = field(default_factory=list)
    achievements: List[Dict[str, Any]] = field(default_factory=list)
    
    def calculate_wellness_score(self) -> float:
        """Calcula el puntaje de bienestar digital"""
        score = 100
        
        # Penalización por tiempo de pantalla excesivo
        if self.screen_time_daily_avg > 8:
            score -= 30
        elif self.screen_time_daily_avg > 6:
            score -= 20
        elif self.screen_time_daily_avg > 4:
            score -= 10
        
        # Penalización por notificaciones excesivas
        if self.notification_frequency > 100:
            score -= 20
        elif self.notification_frequency > 50:
            score -= 10
        
        # Bonus por pausas digitales
        score += min(self.digital_breaks_taken * 5, 20)
        
        # Ajuste por nivel de estrés
        stress_penalties = {
            StressIndicator.LOW: 0,
            StressIndicator.MODERATE: -10,
            StressIndicator.HIGH: -20,
            StressIndicator.SEVERE: -30
        }
        score += stress_penalties.get(self.stress_level, -10)
        
        return max(0, min(100, score))

@dataclass
class DigitalDetoxPlan:
    """Plan de desintoxicación digital"""
    plan_id: str
    duration_days: int
    daily_goals: List[Dict[str, Any]]
    restricted_apps: List[str]
    allowed_hours: Dict[str, Tuple[int, int]]
    mindfulness_activities: List[Dict[str, Any]]
    offline_alternatives: List[str]
    progress_tracking: Dict[str, Any]
    rewards: List[Dict[str, Any]]
    
    def completion_rate(self) -> float:
        """Calcula la tasa de completitud del plan"""
        if not self.daily_goals:
            return 0
        
        completed = sum(1 for goal in self.daily_goals if goal.get("completed", False))
        return round(completed / len(self.daily_goals) * 100, 2)

@dataclass
class MindfulTechUsage:
    """Uso consciente de tecnología"""
    session_id: str
    start_time: datetime
    end_time: Optional[datetime]
    purpose: str
    apps_used: List[str]
    distractions_count: int
    focus_score: float
    mindful_breaks: List[Dict[str, Any]]
    productivity_rating: float
    
    def session_duration(self) -> float:
        """Calcula duración de la sesión en minutos"""
        if not self.end_time:
            return 0
        return (self.end_time - self.start_time).total_seconds() / 60

class DigitalWellnessAgent:
    """
    Agente de IA para bienestar digital y equilibrio tecnológico
    """
    
    def __init__(self):
        self.agent_id = "digital_wellness_agent"
        self.version = "2.0.0"
        self.capabilities = [
            "screen_time_monitoring",
            "digital_detox_planning",
            "mindfulness_recommendations",
            "tech_life_balance",
            "notification_management",
            "sleep_hygiene_tech",
            "eye_strain_prevention",
            "posture_reminders",
            "social_media_wellness",
            "digital_boundaries"
        ]
        
        # Límites saludables recomendados
        self.healthy_limits = {
            "daily_screen_time_hours": 4,
            "social_media_minutes": 30,
            "continuous_use_minutes": 45,
            "notifications_per_hour": 5,
            "evening_cutoff_hour": 21,
            "morning_delay_minutes": 30
        }
        
        # Actividades de mindfulness
        self.mindfulness_activities = [
            {
                "name": "Respiración 4-7-8",
                "duration_minutes": 5,
                "description": "Inhala por 4, mantén por 7, exhala por 8",
                "benefits": ["Reduce ansiedad", "Mejora enfoque"],
                "difficulty": "beginner"
            },
            {
                "name": "Meditación guiada sin pantalla",
                "duration_minutes": 10,
                "description": "Meditación con audio, sin mirar pantalla",
                "benefits": ["Calma mental", "Reduce fatiga visual"],
                "difficulty": "beginner"
            },
            {
                "name": "Caminata consciente",
                "duration_minutes": 15,
                "description": "Camina sin dispositivos, observa el entorno",
                "benefits": ["Ejercicio", "Desconexión digital"],
                "difficulty": "beginner"
            },
            {
                "name": "Journaling analógico",
                "duration_minutes": 10,
                "description": "Escribe en papel tus pensamientos",
                "benefits": ["Claridad mental", "Creatividad"],
                "difficulty": "intermediate"
            }
        ]
        
        # Alternativas offline para actividades digitales
        self.offline_alternatives = {
            "social_media": ["Conversación en persona", "Llamada telefónica", "Carta escrita"],
            "entertainment": ["Lectura de libros", "Juegos de mesa", "Deportes"],
            "photography": ["Sketching", "Pintura", "Observación mindful"],
            "navigation": ["Mapa físico", "Preguntar direcciones", "Exploración intuitiva"],
            "shopping": ["Tiendas locales", "Mercados", "Artesanías"]
        }
        
        # Ejercicios para salud digital
        self.wellness_exercises = {
            "eye_exercises": [
                {"name": "20-20-20", "description": "Cada 20 min, mira algo a 20 pies por 20 seg"},
                {"name": "Parpadeo consciente", "description": "Parpadea 20 veces lentamente"},
                {"name": "Enfoque lejano-cercano", "description": "Alterna enfoque entre objetos"}
            ],
            "posture_stretches": [
                {"name": "Rotación de cuello", "description": "Gira cuello lentamente"},
                {"name": "Estiramiento de hombros", "description": "Rota hombros hacia atrás"},
                {"name": "Estiramiento de muñecas", "description": "Flexiona y extiende muñecas"}
            ],
            "mental_breaks": [
                {"name": "Box breathing", "description": "Respiración en caja 4x4"},
                {"name": "Body scan", "description": "Escaneo corporal de tensiones"},
                {"name": "Gratitud", "description": "Lista 3 cosas por las que agradecer"}
            ]
        }
        
        self.user_profiles = {}
        self.detox_plans = {}
        self.metrics = {
            "profiles_analyzed": 0,
            "detox_plans_created": 0,
            "wellness_improvements": 0,
            "mindful_sessions_tracked": 0,
            "recommendations_given": 0
        }
    
    async def analyze_digital_wellness(
        self,
        user_data: Dict[str, Any]
    ) -> DigitalWellnessProfile:
        """
        Analiza el bienestar digital del usuario
        """
        try:
            # Extraer datos de uso
            screen_time = user_data.get("screen_time_hours", 6)
            app_usage = user_data.get("app_usage", {})
            notifications = user_data.get("daily_notifications", 50)
            breaks = user_data.get("digital_breaks", 2)
            
            # Calcular nivel de estrés digital
            stress_level = self._calculate_digital_stress(
                screen_time, notifications, app_usage
            )
            
            # Crear perfil
            profile = DigitalWellnessProfile(
                user_id=user_data.get("user_id", "unknown"),
                screen_time_daily_avg=screen_time,
                app_usage_pattern=app_usage,
                notification_frequency=notifications,
                digital_breaks_taken=breaks,
                wellness_score=0,  # Se calculará después
                stress_level=stress_level
            )
            
            # Calcular puntaje de bienestar
            profile.wellness_score = profile.calculate_wellness_score()
            
            # Generar recomendaciones
            profile.recommendations = await self._generate_wellness_recommendations(profile)
            
            # Identificar logros
            profile.achievements = self._identify_achievements(profile)
            
            # Guardar perfil
            self.user_profiles[profile.user_id] = profile
            self.metrics["profiles_analyzed"] += 1
            
            return profile
            
        except Exception as e:
            logger.error(f"Error analyzing digital wellness: {e}")
            raise
    
    async def create_digital_detox_plan(
        self,
        user_id: str,
        duration_days: int = 7,
        intensity: str = "moderate"
    ) -> DigitalDetoxPlan:
        """
        Crea un plan de desintoxicación digital personalizado
        """
        try:
            profile = self.user_profiles.get(user_id)
            if not profile:
                raise ValueError(f"Profile not found for user {user_id}")
            
            # Generar ID del plan
            plan_id = f"DETOX-{user_id}-{datetime.now().strftime('%Y%m%d')}"
            
            # Crear objetivos diarios basados en intensidad
            daily_goals = self._create_daily_goals(duration_days, intensity, profile)
            
            # Definir apps restringidas
            restricted_apps = self._identify_problematic_apps(profile)
            
            # Establecer horarios permitidos
            allowed_hours = self._set_allowed_hours(intensity)
            
            # Seleccionar actividades de mindfulness
            mindfulness = self._select_mindfulness_activities(intensity, duration_days)
            
            # Sugerir alternativas offline
            offline = self._suggest_offline_alternatives(profile)
            
            # Configurar tracking de progreso
            progress = {
                "start_date": datetime.now().isoformat(),
                "current_day": 1,
                "goals_completed": 0,
                "total_goals": len(daily_goals),
                "streak_days": 0,
                "wellness_score_start": profile.wellness_score,
                "wellness_score_current": profile.wellness_score
            }
            
            # Definir recompensas
            rewards = self._create_reward_system(duration_days, intensity)
            
            plan = DigitalDetoxPlan(
                plan_id=plan_id,
                duration_days=duration_days,
                daily_goals=daily_goals,
                restricted_apps=restricted_apps,
                allowed_hours=allowed_hours,
                mindfulness_activities=mindfulness,
                offline_alternatives=offline,
                progress_tracking=progress,
                rewards=rewards
            )
            
            # Guardar plan
            self.detox_plans[plan_id] = plan
            self.metrics["detox_plans_created"] += 1
            
            return plan
            
        except Exception as e:
            logger.error(f"Error creating digital detox plan: {e}")
            raise
    
    async def track_mindful_usage(
        self,
        session_data: Dict[str, Any]
    ) -> MindfulTechUsage:
        """
        Rastrea el uso consciente de tecnología
        """
        try:
            session = MindfulTechUsage(
                session_id=f"SESSION-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                start_time=datetime.fromisoformat(session_data.get("start_time", datetime.now().isoformat())),
                end_time=datetime.fromisoformat(session_data["end_time"]) if session_data.get("end_time") else None,
                purpose=session_data.get("purpose", "general"),
                apps_used=session_data.get("apps_used", []),
                distractions_count=session_data.get("distractions", 0),
                focus_score=0,  # Se calculará
                mindful_breaks=session_data.get("breaks", []),
                productivity_rating=0  # Se calculará
            )
            
            # Calcular puntaje de enfoque
            session.focus_score = self._calculate_focus_score(session)
            
            # Calcular rating de productividad
            session.productivity_rating = self._calculate_productivity(session)
            
            self.metrics["mindful_sessions_tracked"] += 1
            
            return session
            
        except Exception as e:
            logger.error(f"Error tracking mindful usage: {e}")
            raise
    
    async def recommend_tech_life_balance(
        self,
        lifestyle_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Recomienda estrategias de equilibrio tecnología-vida
        """
        try:
            recommendations = {
                "daily_schedule": {},
                "boundaries": [],
                "healthy_habits": [],
                "tech_free_zones": [],
                "family_time": [],
                "sleep_hygiene": [],
                "work_life_balance": []
            }
            
            # Horario diario optimizado
            recommendations["daily_schedule"] = {
                "morning_routine": {
                    "06:00-07:00": "Tech-free morning routine",
                    "07:00-07:30": "Mindful breakfast without screens",
                    "07:30-08:00": "Quick email check (limited)"
                },
                "work_hours": {
                    "09:00-10:30": "Deep work (notifications off)",
                    "10:30-10:45": "Tech break - stretching",
                    "10:45-12:00": "Collaborative work",
                    "12:00-13:00": "Lunch break (no screens)"
                },
                "evening": {
                    "18:00-19:00": "Family time (devices away)",
                    "19:00-20:00": "Leisure tech use allowed",
                    "20:00-21:00": "Wind down activities",
                    "21:00+": "Digital sunset - no screens"
                }
            }
            
            # Límites digitales
            recommendations["boundaries"] = [
                "No teléfonos durante las comidas",
                "Cargar dispositivos fuera del dormitorio",
                "Modo avión durante tiempo familiar",
                "Email solo en horario laboral",
                "1 día sin redes sociales por semana"
            ]
            
            # Hábitos saludables
            recommendations["healthy_habits"] = [
                {
                    "habit": "Regla 20-20-20 para vista",
                    "frequency": "Cada 20 minutos",
                    "benefit": "Previene fatiga visual"
                },
                {
                    "habit": "Caminata sin teléfono",
                    "frequency": "1 vez al día",
                    "benefit": "Desconexión y ejercicio"
                },
                {
                    "habit": "Meditación matutina",
                    "frequency": "Diaria",
                    "benefit": "Comenzar el día con calma"
                }
            ]
            
            # Zonas libres de tecnología
            recommendations["tech_free_zones"] = [
                {"zone": "Dormitorio", "reason": "Mejor calidad de sueño"},
                {"zone": "Comedor", "reason": "Conversación familiar"},
                {"zone": "Baño", "reason": "Momento de desconexión"},
                {"zone": "Área de lectura", "reason": "Concentración profunda"}
            ]
            
            # Tiempo familiar
            recommendations["family_time"] = [
                "Juegos de mesa semanales",
                "Cenas sin dispositivos",
                "Paseos dominicales sin tecnología",
                "Proyectos creativos juntos",
                "Hora de cuentos sin pantallas"
            ]
            
            # Higiene del sueño
            recommendations["sleep_hygiene"] = [
                "Apagar pantallas 1 hora antes de dormir",
                "Usar modo nocturno después de las 19:00",
                "Alarma analógica en lugar de teléfono",
                "Rutina de relajación sin tech",
                "Temperatura ambiente y oscuridad"
            ]
            
            # Balance trabajo-vida
            recommendations["work_life_balance"] = [
                "Horarios definidos de trabajo",
                "Workspace separado en casa",
                "Notificaciones laborales solo en horario",
                "Vacaciones verdaderamente desconectadas",
                "Hobbies offline regulares"
            ]
            
            self.metrics["recommendations_given"] += 1
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error recommending tech-life balance: {e}")
            return {}
    
    async def monitor_travel_tech_wellness(
        self,
        trip_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Monitorea el bienestar digital durante viajes
        """
        try:
            wellness_report = {
                "trip_id": trip_data.get("trip_id"),
                "duration_days": trip_data.get("duration", 7),
                "tech_usage_analysis": {},
                "wellness_scores": {},
                "recommendations": [],
                "digital_memories": {},
                "disconnection_opportunities": []
            }
            
            # Análisis de uso tecnológico en viaje
            wellness_report["tech_usage_analysis"] = {
                "navigation_apps": {
                    "usage_hours": trip_data.get("navigation_hours", 2),
                    "recommendation": "Usar mapas físicos para exploración más consciente"
                },
                "social_media": {
                    "posts_per_day": trip_data.get("social_posts", 5),
                    "recommendation": "Limitar a 1-2 posts significativos por día"
                },
                "photography": {
                    "photos_per_day": trip_data.get("daily_photos", 50),
                    "recommendation": "Practicar fotografía mindful: calidad sobre cantidad"
                },
                "communication": {
                    "messages_per_day": trip_data.get("daily_messages", 30),
                    "recommendation": "Establecer horarios específicos para comunicación"
                }
            }
            
            # Puntajes de bienestar por día
            wellness_report["wellness_scores"] = {
                "day_1": self._calculate_daily_wellness(trip_data, 1),
                "day_3": self._calculate_daily_wellness(trip_data, 3),
                "day_5": self._calculate_daily_wellness(trip_data, 5),
                "day_7": self._calculate_daily_wellness(trip_data, 7),
                "average": 75  # Promedio estimado
            }
            
            # Recomendaciones específicas para viaje
            wellness_report["recommendations"] = [
                {
                    "timing": "Mañana",
                    "activity": "Desayuno sin revisar teléfono",
                    "benefit": "Comenzar el día presente y consciente"
                },
                {
                    "timing": "Durante tours",
                    "activity": "Modo avión excepto para fotos",
                    "benefit": "Inmersión total en la experiencia"
                },
                {
                    "timing": "Atardeceres",
                    "activity": "Observar sin fotografiar",
                    "benefit": "Memoria sensorial más profunda"
                },
                {
                    "timing": "Noche",
                    "activity": "Journaling en lugar de scrolling",
                    "benefit": "Reflexión y procesamiento del día"
                }
            ]
            
            # Gestión de memorias digitales
            wellness_report["digital_memories"] = {
                "photo_organization": "Seleccionar 5 mejores fotos por día",
                "backup_strategy": "Respaldar en la nube cada 2 días",
                "sharing_approach": "Compartir álbum al final del viaje",
                "analog_complement": "Llevar diario escrito o sketches"
            }
            
            # Oportunidades de desconexión
            destinations = trip_data.get("destinations", [])
            wellness_report["disconnection_opportunities"] = [
                {
                    "activity": "Spa o wellness center",
                    "duration_hours": 3,
                    "digital_detox_level": "complete",
                    "benefit": "Relajación profunda sin distracciones"
                },
                {
                    "activity": "Hiking o naturaleza",
                    "duration_hours": 4,
                    "digital_detox_level": "partial",
                    "benefit": "Conexión con la naturaleza"
                },
                {
                    "activity": "Experiencia cultural local",
                    "duration_hours": 2,
                    "digital_detox_level": "moderate",
                    "benefit": "Inmersión cultural auténtica"
                },
                {
                    "activity": "Meditación o yoga",
                    "duration_hours": 1,
                    "digital_detox_level": "complete",
                    "benefit": "Mindfulness y presencia"
                }
            ]
            
            return wellness_report
            
        except Exception as e:
            logger.error(f"Error monitoring travel tech wellness: {e}")
            return {}
    
    async def prevent_digital_burnout(
        self,
        usage_patterns: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Previene el agotamiento digital
        """
        try:
            burnout_prevention = {
                "risk_level": "",
                "warning_signs": [],
                "immediate_actions": [],
                "long_term_strategies": [],
                "support_resources": [],
                "recovery_plan": {}
            }
            
            # Evaluar nivel de riesgo
            risk_score = self._calculate_burnout_risk(usage_patterns)
            if risk_score > 80:
                burnout_prevention["risk_level"] = "critical"
            elif risk_score > 60:
                burnout_prevention["risk_level"] = "high"
            elif risk_score > 40:
                burnout_prevention["risk_level"] = "moderate"
            else:
                burnout_prevention["risk_level"] = "low"
            
            # Identificar señales de advertencia
            burnout_prevention["warning_signs"] = self._identify_warning_signs(usage_patterns)
            
            # Acciones inmediatas según riesgo
            if burnout_prevention["risk_level"] in ["critical", "high"]:
                burnout_prevention["immediate_actions"] = [
                    "Tomar descanso digital de 24 horas",
                    "Eliminar apps no esenciales temporalmente",
                    "Activar modo no molestar permanente",
                    "Delegar tareas digitales urgentes",
                    "Buscar apoyo profesional si es necesario"
                ]
            else:
                burnout_prevention["immediate_actions"] = [
                    "Establecer límites de tiempo de pantalla",
                    "Programar descansos cada hora",
                    "Reducir notificaciones al mínimo",
                    "Practicar técnica Pomodoro",
                    "Implementar digital sunset diario"
                ]
            
            # Estrategias a largo plazo
            burnout_prevention["long_term_strategies"] = [
                {
                    "strategy": "Minimalismo digital",
                    "description": "Reducir apps y servicios a lo esencial",
                    "timeline": "3 meses",
                    "expected_benefit": "Reducción 50% en distracciones"
                },
                {
                    "strategy": "Ritmos circadianos tech",
                    "description": "Alinear uso tech con ritmos naturales",
                    "timeline": "1 mes",
                    "expected_benefit": "Mejor calidad de sueño"
                },
                {
                    "strategy": "Batch processing",
                    "description": "Agrupar tareas digitales similares",
                    "timeline": "2 semanas",
                    "expected_benefit": "Mayor eficiencia y menos cambio de contexto"
                }
            ]
            
            # Recursos de apoyo
            burnout_prevention["support_resources"] = [
                {"type": "App", "name": "Forest", "purpose": "Gamificar tiempo sin teléfono"},
                {"type": "Book", "name": "Digital Minimalism", "author": "Cal Newport"},
                {"type": "Community", "name": "Digital Wellness Institute", "url": "digitalwellnessinstitute.org"},
                {"type": "Tool", "name": "Screen time trackers", "purpose": "Monitoreo consciente"}
            ]
            
            # Plan de recuperación
            if burnout_prevention["risk_level"] in ["critical", "high"]:
                burnout_prevention["recovery_plan"] = {
                    "week_1": "Desintoxicación digital parcial",
                    "week_2": "Reintroducción controlada",
                    "week_3": "Establecimiento de nuevos hábitos",
                    "week_4": "Consolidación y evaluación",
                    "ongoing": "Mantenimiento y ajustes"
                }
            
            return burnout_prevention
            
        except Exception as e:
            logger.error(f"Error preventing digital burnout: {e}")
            return {}
    
    async def optimize_notification_management(
        self,
        notification_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Optimiza la gestión de notificaciones
        """
        try:
            optimization = {
                "current_load": {},
                "recommended_settings": {},
                "batch_schedule": {},
                "priority_matrix": {},
                "quiet_hours": {},
                "vip_list": []
            }
            
            # Análisis de carga actual
            daily_notifications = notification_data.get("daily_count", 100)
            optimization["current_load"] = {
                "daily_total": daily_notifications,
                "hourly_average": daily_notifications / 24,
                "peak_hours": notification_data.get("peak_hours", [9, 12, 15, 18]),
                "interruption_cost_minutes": daily_notifications * 2  # 2 min por interrupción
            }
            
            # Configuración recomendada por app
            optimization["recommended_settings"] = {
                "social_media": {
                    "setting": "off",
                    "check_frequency": "2 times daily",
                    "reason": "Reduce FOMO y comparación social"
                },
                "email": {
                    "setting": "VIP only",
                    "check_frequency": "3 times daily",
                    "reason": "Mantener foco en trabajo profundo"
                },
                "messaging": {
                    "setting": "important contacts",
                    "check_frequency": "hourly",
                    "reason": "Balance entre disponibilidad y concentración"
                },
                "news": {
                    "setting": "daily digest",
                    "check_frequency": "once daily",
                    "reason": "Evitar sobrecarga informativa"
                },
                "travel_apps": {
                    "setting": "critical only",
                    "check_frequency": "as needed",
                    "reason": "Solo cambios importantes en itinerario"
                }
            }
            
            # Horario de batch para revisar notificaciones
            optimization["batch_schedule"] = {
                "morning": "08:00 - 15 minutes",
                "lunch": "12:30 - 10 minutes",
                "afternoon": "16:00 - 10 minutes",
                "evening": "19:00 - 15 minutes",
                "total_daily_time": "50 minutes vs current 200 minutes"
            }
            
            # Matriz de prioridad
            optimization["priority_matrix"] = {
                "urgent_important": ["Emergency contacts", "Flight changes"],
                "not_urgent_important": ["Work emails", "Bill reminders"],
                "urgent_not_important": ["Sale alerts", "App updates"],
                "not_urgent_not_important": ["Social media", "Marketing"]
            }
            
            # Horas de silencio
            optimization["quiet_hours"] = {
                "sleep": {"start": "22:00", "end": "07:00", "mode": "do not disturb"},
                "focus": {"times": ["09:00-11:00", "14:00-16:00"], "mode": "work focus"},
                "meals": {"times": ["breakfast", "lunch", "dinner"], "mode": "family time"},
                "relax": {"start": "20:00", "end": "22:00", "mode": "wind down"}
            }
            
            # Lista VIP (solo estas personas pueden interrumpir)
            optimization["vip_list"] = [
                "Family members",
                "Emergency contacts",
                "Current project team",
                "Healthcare providers"
            ]
            
            return optimization
            
        except Exception as e:
            logger.error(f"Error optimizing notifications: {e}")
            return {}
    
    async def create_family_tech_plan(
        self,
        family_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Crea un plan tecnológico familiar
        """
        try:
            family_plan = {
                "family_id": family_data.get("family_id"),
                "members": [],
                "shared_rules": [],
                "device_contracts": {},
                "screen_free_activities": [],
                "tech_education": [],
                "parental_controls": {}
            }
            
            # Reglas por miembro de la familia
            for member in family_data.get("members", []):
                age = member.get("age", 0)
                role = member.get("role", "child")
                
                if role == "child":
                    if age < 6:
                        screen_time = 1
                        content = "educational only"
                    elif age < 12:
                        screen_time = 2
                        content = "age-appropriate"
                    else:
                        screen_time = 3
                        content = "monitored"
                else:
                    screen_time = 4
                    content = "self-regulated"
                
                family_plan["members"].append({
                    "name": member.get("name"),
                    "age": age,
                    "daily_limit_hours": screen_time,
                    "content_type": content,
                    "bedtime_cutoff": "1 hour before sleep"
                })
            
            # Reglas compartidas familiares
            family_plan["shared_rules"] = [
                "No dispositivos durante comidas familiares",
                "Cargar dispositivos en estación central de noche",
                "Domingo = día de actividades sin pantallas",
                "Pedir permiso antes de descargar apps nuevas",
                "Compartir contraseñas con padres (menores)",
                "Respetar tiempo de tarea sin distracciones"
            ]
            
            # Contratos de dispositivos
            family_plan["device_contracts"] = {
                "smartphone": {
                    "age_minimum": 12,
                    "responsibilities": [
                        "Cuidar el dispositivo",
                        "No usar mientras camina",
                        "Responder a padres siempre"
                    ],
                    "privileges": ["Apps sociales apropiadas", "Juegos educativos"],
                    "consequences": "Pérdida temporal si se rompen reglas"
                },
                "tablet": {
                    "age_minimum": 6,
                    "responsibilities": ["Uso en áreas comunes", "Pedir permiso"],
                    "privileges": ["Videos educativos", "Apps de aprendizaje"],
                    "consequences": "Reducción de tiempo de pantalla"
                }
            }
            
            # Actividades sin pantallas
            family_plan["screen_free_activities"] = [
                {"activity": "Noche de juegos de mesa", "frequency": "Semanal"},
                {"activity": "Cocinar juntos", "frequency": "2 veces/semana"},
                {"activity": "Lectura familiar", "frequency": "Diaria antes de dormir"},
                {"activity": "Deportes o parque", "frequency": "3 veces/semana"},
                {"activity": "Proyectos de arte/manualidades", "frequency": "Fin de semana"}
            ]
            
            # Educación tecnológica
            family_plan["tech_education"] = [
                {
                    "topic": "Seguridad en internet",
                    "age_group": "8+",
                    "concepts": ["Privacidad", "Extraños online", "Cyberbullying"]
                },
                {
                    "topic": "Ciudadanía digital",
                    "age_group": "10+",
                    "concepts": ["Huella digital", "Respeto online", "Fake news"]
                },
                {
                    "topic": "Balance saludable",
                    "age_group": "Todos",
                    "concepts": ["Señales de adicción", "Importancia del sueño", "Ejercicio"]
                }
            ]
            
            # Controles parentales
            family_plan["parental_controls"] = {
                "content_filtering": "Enabled for under 16",
                "time_restrictions": "Customized by age",
                "app_approval": "Required for under 14",
                "location_sharing": "Family members only",
                "purchase_approval": "Always required"
            }
            
            return family_plan
            
        except Exception as e:
            logger.error(f"Error creating family tech plan: {e}")
            return {}
    
    # Métodos privados de apoyo
    
    def _calculate_digital_stress(
        self,
        screen_time: float,
        notifications: int,
        app_usage: Dict[str, float]
    ) -> StressIndicator:
        """Calcula el nivel de estrés digital"""
        stress_score = 0
        
        # Factor tiempo de pantalla
        if screen_time > 8:
            stress_score += 40
        elif screen_time > 6:
            stress_score += 25
        elif screen_time > 4:
            stress_score += 10
        
        # Factor notificaciones
        if notifications > 100:
            stress_score += 30
        elif notifications > 50:
            stress_score += 20
        elif notifications > 25:
            stress_score += 10
        
        # Factor multitasking (muchas apps)
        if len(app_usage) > 15:
            stress_score += 20
        elif len(app_usage) > 10:
            stress_score += 10
        
        # Factor redes sociales
        social_time = app_usage.get("social_media", 0)
        if social_time > 3:
            stress_score += 20
        elif social_time > 1.5:
            stress_score += 10
        
        if stress_score >= 70:
            return StressIndicator.SEVERE
        elif stress_score >= 50:
            return StressIndicator.HIGH
        elif stress_score >= 30:
            return StressIndicator.MODERATE
        else:
            return StressIndicator.LOW
    
    async def _generate_wellness_recommendations(
        self,
        profile: DigitalWellnessProfile
    ) -> List[str]:
        """Genera recomendaciones de bienestar"""
        recommendations = []
        
        if profile.screen_time_daily_avg > 6:
            recommendations.append("Reducir tiempo de pantalla en 2 horas diarias")
        
        if profile.notification_frequency > 50:
            recommendations.append("Desactivar notificaciones no esenciales")
        
        if profile.digital_breaks_taken < 3:
            recommendations.append("Tomar descansos de 5 minutos cada hora")
        
        if profile.stress_level in [StressIndicator.HIGH, StressIndicator.SEVERE]:
            recommendations.append("Considerar detox digital de fin de semana")
        
        recommendations.append("Practicar regla 20-20-20 para salud visual")
        recommendations.append("Establecer horario sin pantallas antes de dormir")
        
        return recommendations
    
    def _identify_achievements(self, profile: DigitalWellnessProfile) -> List[Dict[str, Any]]:
        """Identifica logros del usuario"""
        achievements = []
        
        if profile.screen_time_daily_avg < 4:
            achievements.append({
                "badge": "Screen Time Champion",
                "description": "Menos de 4 horas diarias de pantalla"
            })
        
        if profile.digital_breaks_taken >= 5:
            achievements.append({
                "badge": "Break Master",
                "description": "5+ descansos digitales al día"
            })
        
        if profile.wellness_score >= 80:
            achievements.append({
                "badge": "Digital Wellness Guru",
                "description": "Puntaje de bienestar excelente"
            })
        
        return achievements
    
    def _create_daily_goals(
        self,
        days: int,
        intensity: str,
        profile: DigitalWellnessProfile
    ) -> List[Dict[str, Any]]:
        """Crea objetivos diarios para detox"""
        goals = []
        
        base_goals = {
            "light": {
                "screen_time_reduction": 1,
                "notification_free_hours": 2,
                "mindful_sessions": 1
            },
            "moderate": {
                "screen_time_reduction": 2,
                "notification_free_hours": 4,
                "mindful_sessions": 2
            },
            "intensive": {
                "screen_time_reduction": 4,
                "notification_free_hours": 8,
                "mindful_sessions": 3
            }
        }
        
        intensity_goals = base_goals.get(intensity, base_goals["moderate"])
        
        for day in range(1, days + 1):
            goals.append({
                "day": day,
                "goals": [
                    f"Reducir tiempo de pantalla en {intensity_goals['screen_time_reduction']} horas",
                    f"Mantener {intensity_goals['notification_free_hours']} horas sin notificaciones",
                    f"Completar {intensity_goals['mindful_sessions']} sesiones mindfulness",
                    "No revisar redes sociales antes del desayuno",
                    "Digital sunset 1 hora antes de dormir"
                ],
                "completed": False,
                "notes": ""
            })
        
        return goals
    
    def _identify_problematic_apps(self, profile: DigitalWellnessProfile) -> List[str]:
        """Identifica apps problemáticas"""
        problematic = []
        
        for app, usage in profile.app_usage_pattern.items():
            if usage > 2:  # Más de 2 horas diarias
                problematic.append(app)
        
        # Siempre incluir ciertas categorías
        problematic.extend(["Social Media", "News", "Games"])
        
        return list(set(problematic))
    
    def _set_allowed_hours(self, intensity: str) -> Dict[str, Tuple[int, int]]:
        """Establece horarios permitidos para uso tech"""
        if intensity == "intensive":
            return {
                "weekday": (18, 20),  # 6-8 PM
                "weekend": (10, 12)   # 10 AM - 12 PM
            }
        elif intensity == "moderate":
            return {
                "weekday": (12, 13, 18, 21),  # Lunch y evening
                "weekend": (10, 13, 18, 21)    # Más flexible
            }
        else:
            return {
                "weekday": (7, 21),   # 7 AM - 9 PM
                "weekend": (8, 22)    # 8 AM - 10 PM
            }
    
    def _select_mindfulness_activities(
        self,
        intensity: str,
        days: int
    ) -> List[Dict[str, Any]]:
        """Selecciona actividades de mindfulness"""
        activities_per_day = {
            "light": 1,
            "moderate": 2,
            "intensive": 3
        }
        
        num_activities = activities_per_day.get(intensity, 2)
        selected = []
        
        for day in range(1, days + 1):
            daily_activities = []
            for i in range(num_activities):
                activity = self.mindfulness_activities[i % len(self.mindfulness_activities)]
                daily_activities.append({
                    **activity,
                    "scheduled_time": f"{9 + i * 4}:00"  # Distribuir en el día
                })
            selected.append({
                "day": day,
                "activities": daily_activities
            })
        
        return selected
    
    def _suggest_offline_alternatives(
        self,
        profile: DigitalWellnessProfile
    ) -> List[str]:
        """Sugiere alternativas offline"""
        alternatives = []
        
        for app_category in profile.app_usage_pattern.keys():
            if app_category.lower() in self.offline_alternatives:
                alternatives.extend(self.offline_alternatives[app_category.lower()])
        
        return list(set(alternatives))[:10]  # Top 10 alternativas
    
    def _create_reward_system(self, days: int, intensity: str) -> List[Dict[str, Any]]:
        """Crea sistema de recompensas"""
        rewards = [
            {
                "milestone": "Day 1 Complete",
                "reward": "30 min de tech recreativo guilt-free",
                "unlocked": False
            },
            {
                "milestone": "3 Days Streak",
                "reward": "Película o serie favorita",
                "unlocked": False
            },
            {
                "milestone": "Week Complete",
                "reward": "Experiencia especial offline",
                "unlocked": False
            }
        ]
        
        if days >= 14:
            rewards.append({
                "milestone": "2 Weeks Master",
                "reward": "Gadget o app premium de bienestar",
                "unlocked": False
            })
        
        if days >= 30:
            rewards.append({
                "milestone": "Monthly Champion",
                "reward": "Viaje o experiencia significativa",
                "unlocked": False
            })
        
        return rewards
    
    def _calculate_focus_score(self, session: MindfulTechUsage) -> float:
        """Calcula puntaje de enfoque"""
        base_score = 100
        
        # Penalización por distracciones
        base_score -= session.distractions_count * 10
        
        # Bonus por pausas mindful
        base_score += len(session.mindful_breaks) * 5
        
        # Penalización por muchas apps
        if len(session.apps_used) > 3:
            base_score -= (len(session.apps_used) - 3) * 5
        
        return max(0, min(100, base_score))
    
    def _calculate_productivity(self, session: MindfulTechUsage) -> float:
        """Calcula rating de productividad"""
        if session.purpose == "work":
            # Para trabajo, menos apps y distracciones es mejor
            return max(0, 10 - session.distractions_count - len(session.apps_used) / 2)
        elif session.purpose == "leisure":
            # Para ocio, la satisfacción importa más
            return 5 + (session.focus_score / 20)
        else:
            return 5  # Neutral
    
    def _calculate_daily_wellness(
        self,
        trip_data: Dict[str, Any],
        day: int
    ) -> float:
        """Calcula bienestar digital diario durante viaje"""
        base_score = 70
        
        # Factores que mejoran el puntaje
        if day in trip_data.get("offline_days", []):
            base_score += 20
        
        if day in trip_data.get("mindful_days", []):
            base_score += 10
        
        # Factores que reducen el puntaje
        daily_screen = trip_data.get(f"day_{day}_screen_time", 4)
        if daily_screen > 6:
            base_score -= 20
        elif daily_screen > 4:
            base_score -= 10
        
        return min(100, max(0, base_score))
    
    def _calculate_burnout_risk(self, usage_patterns: Dict[str, Any]) -> float:
        """Calcula riesgo de burnout digital"""
        risk_score = 0
        
        # Tiempo de pantalla excesivo
        screen_time = usage_patterns.get("daily_screen_hours", 0)
        if screen_time > 10:
            risk_score += 30
        elif screen_time > 8:
            risk_score += 20
        
        # Falta de descansos
        breaks = usage_patterns.get("breaks_per_day", 0)
        if breaks < 2:
            risk_score += 25
        elif breaks < 4:
            risk_score += 15
        
        # Uso nocturno
        night_usage = usage_patterns.get("night_usage_hours", 0)
        if night_usage > 2:
            risk_score += 20
        elif night_usage > 1:
            risk_score += 10
        
        # Multitasking excesivo
        concurrent_apps = usage_patterns.get("average_concurrent_apps", 0)
        if concurrent_apps > 5:
            risk_score += 15
        
        # Notificaciones
        notifications = usage_patterns.get("daily_notifications", 0)
        if notifications > 150:
            risk_score += 20
        elif notifications > 100:
            risk_score += 10
        
        return min(100, risk_score)
    
    def _identify_warning_signs(self, usage_patterns: Dict[str, Any]) -> List[str]:
        """Identifica señales de advertencia de burnout"""
        signs = []
        
        if usage_patterns.get("daily_screen_hours", 0) > 10:
            signs.append("Tiempo de pantalla excesivo (>10 horas/día)")
        
        if usage_patterns.get("sleep_disruptions", 0) > 3:
            signs.append("Interrupciones frecuentes del sueño por tecnología")
        
        if usage_patterns.get("eye_strain_complaints", False):
            signs.append("Fatiga visual y dolores de cabeza frecuentes")
        
        if usage_patterns.get("social_isolation_score", 0) > 7:
            signs.append("Aislamiento social por preferir interacciones digitales")
        
        if usage_patterns.get("anxiety_when_disconnected", False):
            signs.append("Ansiedad al estar sin dispositivos")
        
        if usage_patterns.get("productivity_decline", False):
            signs.append("Disminución de productividad por distracciones digitales")
        
        return signs
    
    def get_metrics(self) -> Dict[str, Any]:
        """Obtiene métricas del agente"""
        return {
            "agent_id": self.agent_id,
            "version": self.version,
            "metrics": self.metrics,
            "active_profiles": len(self.user_profiles),
            "active_detox_plans": len(self.detox_plans),
            "capabilities": self.capabilities
        }

# Funciones principales para uso del agente
async def main():
    """Función principal para pruebas"""
    agent = DigitalWellnessAgent()
    
    # Ejemplo de análisis de bienestar digital
    user_data = {
        "user_id": "user123",
        "screen_time_hours": 7,
        "app_usage": {
            "social_media": 3,
            "work": 3,
            "entertainment": 1
        },
        "daily_notifications": 80,
        "digital_breaks": 2
    }
    
    profile = await agent.analyze_digital_wellness(user_data)
    print(f"Wellness Score: {profile.wellness_score}")
    print(f"Stress Level: {profile.stress_level.value}")
    print(f"Recommendations: {profile.recommendations}")
    
    # Crear plan de detox
    detox_plan = await agent.create_digital_detox_plan(
        user_id="user123",
        duration_days=7,
        intensity="moderate"
    )
    print(f"\nDetox Plan: {detox_plan.plan_id}")
    print(f"Duration: {detox_plan.duration_days} days")
    print(f"Completion Rate: {detox_plan.completion_rate()}%")

if __name__ == "__main__":
    asyncio.run(main())