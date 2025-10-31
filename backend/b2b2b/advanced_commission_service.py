"""
Sistema Avanzado de Comisiones - Spirit Tours Phase 4

Extensión del sistema de comisiones con características avanzadas:
- Comisiones escalonadas (tiered) dinámicas
- Bonos por volumen y performance
- Comisiones por producto/servicio
- Comisiones por temporada
- Gamificación y rankings
- Incentivos especiales
- Comisiones diferidas y acumuladas
- Split commissions (múltiples beneficiarios)
"""
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional
from decimal import Decimal
from enum import Enum

from .models import Agent, AgentTier, Commission, AgentBooking
from .commission_service import get_commission_service


class CommissionTierType(str, Enum):
    """Tipo de tier de comisión."""
    VOLUME_BASED = "volume_based"  # Por volumen de ventas
    COUNT_BASED = "count_based"  # Por número de bookings
    REVENUE_BASED = "revenue_based"  # Por ingresos generados
    PERFORMANCE_BASED = "performance_based"  # Por KPIs


class BonusType(str, Enum):
    """Tipo de bono."""
    VOLUME_MILESTONE = "volume_milestone"  # Alcanzar volumen objetivo
    BOOKING_COUNT = "booking_count"  # Número de reservas
    CUSTOMER_RETENTION = "customer_retention"  # Retención de clientes
    UPSELL = "upsell"  # Ventas adicionales
    REFERRAL = "referral"  # Referencias
    SEASONAL = "seasonal"  # Temporada alta
    EARLY_BIRD = "early_bird"  # Reservas anticipadas
    TEAM_PERFORMANCE = "team_performance"  # Performance del equipo


class ProductCategory(str, Enum):
    """Categoría de producto para comisiones."""
    FLIGHTS = "flights"
    HOTELS = "hotels"
    TOURS = "tours"
    PACKAGES = "packages"
    INSURANCE = "insurance"
    TRANSPORT = "transport"
    ACTIVITIES = "activities"


class CommissionTier:
    """Representa un nivel (tier) de comisión."""
    
    def __init__(
        self,
        tier_name: str,
        threshold_min: Decimal,
        threshold_max: Optional[Decimal],
        commission_rate: Decimal,
        bonus_rate: Optional[Decimal] = None
    ):
        self.tier_name = tier_name
        self.threshold_min = threshold_min
        self.threshold_max = threshold_max
        self.commission_rate = commission_rate
        self.bonus_rate = bonus_rate or Decimal("0")
    
    def applies_to(self, value: Decimal) -> bool:
        """Verificar si el tier aplica al valor dado."""
        if self.threshold_max:
            return self.threshold_min <= value < self.threshold_max
        else:
            return value >= self.threshold_min
    
    def calculate_commission(self, amount: Decimal) -> Decimal:
        """Calcular comisión para este tier."""
        base_commission = amount * self.commission_rate / Decimal("100")
        bonus = amount * self.bonus_rate / Decimal("100")
        return base_commission + bonus


class AdvancedCommissionService:
    """
    Servicio Avanzado de Comisiones.
    
    Gestiona comisiones escalonadas, bonos, incentivos y gamificación.
    """
    
    def __init__(self):
        """Inicializar servicio avanzado de comisiones."""
        self.base_service = get_commission_service()
        
        # Configuración de tiers por defecto
        self.volume_tiers = [
            CommissionTier("Bronze", Decimal("0"), Decimal("10000"), Decimal("3")),
            CommissionTier("Silver", Decimal("10000"), Decimal("25000"), Decimal("4"), Decimal("0.5")),
            CommissionTier("Gold", Decimal("25000"), Decimal("50000"), Decimal("5"), Decimal("1")),
            CommissionTier("Platinum", Decimal("50000"), None, Decimal("6"), Decimal("2"))
        ]
        
        # Comisiones por categoría de producto
        self.product_commissions = {
            ProductCategory.FLIGHTS: Decimal("2"),
            ProductCategory.HOTELS: Decimal("5"),
            ProductCategory.TOURS: Decimal("8"),
            ProductCategory.PACKAGES: Decimal("10"),
            ProductCategory.INSURANCE: Decimal("15"),
            ProductCategory.TRANSPORT: Decimal("4"),
            ProductCategory.ACTIVITIES: Decimal("7")
        }
        
        # Multiplicadores por temporada
        self.seasonal_multipliers = {
            "high_season": Decimal("1.2"),  # +20%
            "shoulder": Decimal("1.0"),
            "low_season": Decimal("1.3")  # +30% para incentivar ventas
        }
    
    async def calculate_tiered_commission(
        self,
        agent: Agent,
        booking_amount: Decimal,
        period_start: date,
        period_end: date
    ) -> Dict[str, Any]:
        """
        Calcular comisión escalonada basada en volumen del período.
        
        Args:
            agent: Agente
            booking_amount: Monto de la reserva actual
            period_start: Inicio del período
            period_end: Fin del período
        
        Returns:
            Comisión calculada con tier aplicado
        """
        # Obtener volumen total del agente en el período
        total_volume = await self._get_agent_volume(
            agent.agent_code,
            period_start,
            period_end
        )
        
        # Incluir la reserva actual
        total_volume += booking_amount
        
        # Determinar tier aplicable
        applicable_tier = None
        for tier in self.volume_tiers:
            if tier.applies_to(total_volume):
                applicable_tier = tier
                break
        
        if not applicable_tier:
            applicable_tier = self.volume_tiers[0]  # Tier base
        
        # Calcular comisión
        commission_amount = applicable_tier.calculate_commission(booking_amount)
        
        return {
            "booking_amount": float(booking_amount),
            "period_volume": float(total_volume),
            "tier_name": applicable_tier.tier_name,
            "base_rate": float(applicable_tier.commission_rate),
            "bonus_rate": float(applicable_tier.bonus_rate),
            "commission_amount": float(commission_amount),
            "next_tier": self._get_next_tier_info(total_volume)
        }
    
    async def calculate_product_commission(
        self,
        booking_amount: Decimal,
        product_category: ProductCategory,
        season_type: str = "shoulder"
    ) -> Dict[str, Any]:
        """
        Calcular comisión por categoría de producto con multiplicador de temporada.
        
        Args:
            booking_amount: Monto de la reserva
            product_category: Categoría del producto
            season_type: Tipo de temporada (high_season, shoulder, low_season)
        
        Returns:
            Comisión calculada
        """
        # Base rate por categoría
        base_rate = self.product_commissions.get(product_category, Decimal("5"))
        
        # Multiplicador de temporada
        seasonal_multiplier = self.seasonal_multipliers.get(
            season_type,
            Decimal("1.0")
        )
        
        # Tasa efectiva
        effective_rate = base_rate * seasonal_multiplier
        
        # Calcular comisión
        commission_amount = booking_amount * effective_rate / Decimal("100")
        
        return {
            "booking_amount": float(booking_amount),
            "product_category": product_category.value,
            "season_type": season_type,
            "base_rate": float(base_rate),
            "seasonal_multiplier": float(seasonal_multiplier),
            "effective_rate": float(effective_rate),
            "commission_amount": float(commission_amount)
        }
    
    async def calculate_bonus(
        self,
        agent: Agent,
        bonus_type: BonusType,
        period_start: date,
        period_end: date
    ) -> Dict[str, Any]:
        """
        Calcular bonos especiales por performance.
        
        Args:
            agent: Agente
            bonus_type: Tipo de bono
            period_start: Inicio del período
            period_end: Fin del período
        
        Returns:
            Bono calculado
        """
        bonus_amount = Decimal("0")
        details = {}
        
        if bonus_type == BonusType.VOLUME_MILESTONE:
            # Bono por alcanzar milestone de volumen
            volume = await self._get_agent_volume(
                agent.agent_code,
                period_start,
                period_end
            )
            
            # Milestones con bonos
            milestones = [
                (Decimal("50000"), Decimal("500")),
                (Decimal("100000"), Decimal("1500")),
                (Decimal("250000"), Decimal("5000")),
                (Decimal("500000"), Decimal("15000"))
            ]
            
            for threshold, bonus in milestones:
                if volume >= threshold:
                    bonus_amount = bonus
                    details = {
                        "milestone_reached": float(threshold),
                        "current_volume": float(volume)
                    }
        
        elif bonus_type == BonusType.BOOKING_COUNT:
            # Bono por número de reservas
            count = await self._get_booking_count(
                agent.agent_code,
                period_start,
                period_end
            )
            
            # Bonos por cantidad
            if count >= 100:
                bonus_amount = Decimal("1000")
            elif count >= 50:
                bonus_amount = Decimal("500")
            elif count >= 25:
                bonus_amount = Decimal("200")
            
            details = {"booking_count": count}
        
        elif bonus_type == BonusType.REFERRAL:
            # Bono por referencias (nuevos sub-agentes)
            new_subagents = await self._get_new_subagents_count(
                agent.agent_code,
                period_start,
                period_end
            )
            
            # €100 por cada nuevo sub-agente
            bonus_amount = Decimal(str(new_subagents)) * Decimal("100")
            details = {"new_subagents": new_subagents}
        
        return {
            "agent_code": agent.agent_code,
            "bonus_type": bonus_type.value,
            "period": {
                "from": period_start.isoformat(),
                "to": period_end.isoformat()
            },
            "bonus_amount": float(bonus_amount),
            "details": details
        }
    
    async def get_leaderboard(
        self,
        period_start: date,
        period_end: date,
        metric: str = "volume",
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Obtener ranking de agentes (leaderboard) para gamificación.
        
        Args:
            period_start: Inicio del período
            period_end: Fin del período
            metric: Métrica para ranking (volume, count, commission)
            limit: Número de posiciones a retornar
        
        Returns:
            Lista de agentes ordenados por performance
        """
        # TODO: Obtener datos reales de base de datos
        # Por ahora, mock data para demostración
        
        leaderboard = []
        
        # Simular datos
        agents_data = [
            {"agent_code": "AGT-001", "name": "Top Agent 1", "volume": 125000, "count": 85, "commission": 6250},
            {"agent_code": "AGT-002", "name": "Top Agent 2", "volume": 98000, "count": 72, "commission": 4900},
            {"agent_code": "AGT-003", "name": "Top Agent 3", "volume": 87000, "count": 68, "commission": 4350},
        ]
        
        # Ordenar por métrica
        if metric == "volume":
            agents_data.sort(key=lambda x: x["volume"], reverse=True)
        elif metric == "count":
            agents_data.sort(key=lambda x: x["count"], reverse=True)
        elif metric == "commission":
            agents_data.sort(key=lambda x: x["commission"], reverse=True)
        
        # Formatear leaderboard
        for idx, agent_data in enumerate(agents_data[:limit], 1):
            leaderboard.append({
                "rank": idx,
                "agent_code": agent_data["agent_code"],
                "agent_name": agent_data["name"],
                "volume": agent_data["volume"],
                "booking_count": agent_data["count"],
                "total_commission": agent_data["commission"],
                "badge": self._get_badge(idx)
            })
        
        return leaderboard
    
    async def get_commission_forecast(
        self,
        agent: Agent,
        months_ahead: int = 3
    ) -> Dict[str, Any]:
        """
        Proyección de comisiones futuras basada en tendencia.
        
        Args:
            agent: Agente
            months_ahead: Meses a proyectar
        
        Returns:
            Proyección de comisiones
        """
        # Obtener histórico de últimos 6 meses
        end_date = date.today()
        start_date = end_date - timedelta(days=180)
        
        # TODO: Obtener datos históricos reales
        historical_data = [
            {"month": "2025-04", "volume": 15000, "commission": 750},
            {"month": "2025-05", "volume": 18000, "commission": 900},
            {"month": "2025-06", "volume": 22000, "commission": 1100},
            {"month": "2025-07", "volume": 25000, "commission": 1375},
            {"month": "2025-08", "volume": 28000, "commission": 1540},
            {"month": "2025-09", "volume": 32000, "commission": 1760}
        ]
        
        # Calcular tendencia (simple promedio de crecimiento)
        if len(historical_data) >= 2:
            first_month = historical_data[0]["commission"]
            last_month = historical_data[-1]["commission"]
            growth_rate = (last_month - first_month) / first_month / len(historical_data)
        else:
            growth_rate = 0.05  # 5% default
        
        # Proyectar
        projection = []
        last_commission = historical_data[-1]["commission"] if historical_data else 1000
        
        for i in range(1, months_ahead + 1):
            projected_commission = last_commission * (1 + growth_rate) ** i
            
            projection.append({
                "month_offset": i,
                "projected_commission": round(projected_commission, 2),
                "confidence": max(0.5, 1 - (i * 0.1))  # Confianza decrece con tiempo
            })
        
        return {
            "agent_code": agent.agent_code,
            "historical_data": historical_data,
            "growth_rate": round(growth_rate * 100, 2),
            "projection": projection
        }
    
    # Helper methods
    
    async def _get_agent_volume(
        self,
        agent_code: str,
        start_date: date,
        end_date: date
    ) -> Decimal:
        """Obtener volumen total de ventas del agente en el período."""
        # TODO: Implementar query real a base de datos
        return Decimal("35000")  # Mock data
    
    async def _get_booking_count(
        self,
        agent_code: str,
        start_date: date,
        end_date: date
    ) -> int:
        """Obtener número de reservas del agente en el período."""
        # TODO: Implementar query real a base de datos
        return 42  # Mock data
    
    async def _get_new_subagents_count(
        self,
        agent_code: str,
        start_date: date,
        end_date: date
    ) -> int:
        """Obtener número de nuevos sub-agentes referidos en el período."""
        # TODO: Implementar query real a base de datos
        return 3  # Mock data
    
    def _get_next_tier_info(self, current_volume: Decimal) -> Optional[Dict[str, Any]]:
        """Obtener información del siguiente tier disponible."""
        for tier in self.volume_tiers:
            if tier.threshold_min > current_volume:
                remaining = tier.threshold_min - current_volume
                return {
                    "tier_name": tier.tier_name,
                    "threshold": float(tier.threshold_min),
                    "remaining": float(remaining),
                    "progress_percent": float(current_volume / tier.threshold_min * 100)
                }
        return None
    
    def _get_badge(self, rank: int) -> str:
        """Obtener badge por posición en ranking."""
        if rank == 1:
            return "🥇 Champion"
        elif rank == 2:
            return "🥈 Excellence"
        elif rank == 3:
            return "🥉 Outstanding"
        elif rank <= 5:
            return "⭐ Top Performer"
        else:
            return "✨ Rising Star"


# Singleton global
_advanced_commission_service: Optional[AdvancedCommissionService] = None


def get_advanced_commission_service() -> AdvancedCommissionService:
    """
    Obtener instancia global del servicio avanzado de comisiones.
    
    Returns:
        AdvancedCommissionService
    """
    global _advanced_commission_service
    if _advanced_commission_service is None:
        _advanced_commission_service = AdvancedCommissionService()
    return _advanced_commission_service
