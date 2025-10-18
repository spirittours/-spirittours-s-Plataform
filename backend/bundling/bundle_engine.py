"""
Cross-sell Bundle Automation Engine (Phase 4)

Sistema inteligente de creación de paquetes y automatización de cross-sell:
- Motor de bundling con reglas de negocio
- Recomendaciones de productos complementarios
- Pricing dinámico con descuentos por bundle
- Automatización de upsell
- Análisis de compatibilidad de productos

Autor: Spirit Tours Bundling Team
Fecha: 2025-10-18
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)


# ============================================================================
# ENUMS & DATA CLASSES
# ============================================================================

class ProductType(str, Enum):
    """Tipos de productos turísticos."""
    FLIGHT = "flight"
    HOTEL = "hotel"
    TOUR = "tour"
    ACTIVITY = "activity"
    TRANSPORT = "transport"
    INSURANCE = "insurance"
    MEAL_PLAN = "meal_plan"
    GUIDE = "guide"


class BundleType(str, Enum):
    """Tipos de bundles/paquetes."""
    BASIC = "basic"  # Hotel + Flight
    STANDARD = "standard"  # Hotel + Flight + Transport
    PREMIUM = "premium"  # Hotel + Flight + Transport + Activity
    ALL_INCLUSIVE = "all_inclusive"  # Todo incluido
    CUSTOM = "custom"  # Personalizado por cliente


class DiscountStrategy(str, Enum):
    """Estrategias de descuento para bundles."""
    PERCENTAGE = "percentage"  # Porcentaje fijo
    TIERED = "tiered"  # Por cantidad de items
    SEASONAL = "seasonal"  # Por temporada
    EARLY_BIRD = "early_bird"  # Reserva anticipada
    COMBO = "combo"  # Combinación específica


@dataclass
class Product:
    """Representa un producto turístico."""
    product_id: str
    product_type: ProductType
    name: str
    description: str
    base_price: Decimal
    supplier_id: str
    destination: str
    duration_days: int
    available_from: date
    available_to: date
    max_capacity: int
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def is_available(self, check_date: date) -> bool:
        """Verificar disponibilidad en fecha."""
        return self.available_from <= check_date <= self.available_to


@dataclass
class BundleRule:
    """Regla de bundling."""
    rule_id: str
    rule_name: str
    required_products: List[ProductType]
    optional_products: List[ProductType]
    min_products: int
    max_products: int
    discount_strategy: DiscountStrategy
    discount_value: Decimal
    valid_from: date
    valid_to: date
    priority: int = 100  # Menor número = mayor prioridad
    
    def applies_to(self, products: List[Product], booking_date: date) -> bool:
        """Verificar si la regla aplica a un set de productos."""
        if not (self.valid_from <= booking_date <= self.valid_to):
            return False
        
        product_types = [p.product_type for p in products]
        
        # Verificar productos requeridos
        for required in self.required_products:
            if required not in product_types:
                return False
        
        # Verificar cantidad
        if not (self.min_products <= len(products) <= self.max_products):
            return False
        
        return True


@dataclass
class Bundle:
    """Paquete turístico."""
    bundle_id: str
    bundle_name: str
    bundle_type: BundleType
    products: List[Product]
    base_price: Decimal
    discounted_price: Decimal
    discount_amount: Decimal
    discount_percentage: Decimal
    applied_rules: List[str]
    created_at: datetime
    valid_until: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertir a diccionario."""
        return {
            "bundle_id": self.bundle_id,
            "bundle_name": self.bundle_name,
            "bundle_type": self.bundle_type.value,
            "products": [
                {
                    "product_id": p.product_id,
                    "type": p.product_type.value,
                    "name": p.name,
                    "price": float(p.base_price)
                }
                for p in self.products
            ],
            "pricing": {
                "base_price": float(self.base_price),
                "discounted_price": float(self.discounted_price),
                "discount_amount": float(self.discount_amount),
                "discount_percentage": float(self.discount_percentage),
                "savings": float(self.discount_amount)
            },
            "applied_rules": self.applied_rules,
            "created_at": self.created_at.isoformat(),
            "valid_until": self.valid_until.isoformat()
        }


@dataclass
class CrossSellRecommendation:
    """Recomendación de cross-sell."""
    recommendation_id: str
    primary_product: Product
    suggested_products: List[Product]
    compatibility_score: Decimal  # 0-100
    potential_bundle: Optional[Bundle]
    reason: str
    estimated_uplift: Decimal  # Incremento esperado en valor
    
    def to_dict(self) -> Dict[str, Any]:
        """Convertir a diccionario."""
        return {
            "recommendation_id": self.recommendation_id,
            "primary_product": {
                "product_id": self.primary_product.product_id,
                "name": self.primary_product.name,
                "type": self.primary_product.product_type.value
            },
            "suggested_products": [
                {
                    "product_id": p.product_id,
                    "name": p.name,
                    "type": p.product_type.value,
                    "price": float(p.base_price)
                }
                for p in self.suggested_products
            ],
            "compatibility_score": float(self.compatibility_score),
            "bundle": self.potential_bundle.to_dict() if self.potential_bundle else None,
            "reason": self.reason,
            "estimated_uplift": float(self.estimated_uplift)
        }


# ============================================================================
# BUNDLING ENGINE
# ============================================================================

class BundlingEngine:
    """
    Motor de bundling y creación de paquetes.
    
    Crea bundles automáticamente aplicando reglas de negocio
    y optimizando precios.
    """
    
    def __init__(self):
        """Inicializar Bundling Engine."""
        self.bundle_rules: List[BundleRule] = []
        self._initialize_default_rules()
        logger.info("BundlingEngine initialized")
    
    def _initialize_default_rules(self):
        """Inicializar reglas de bundling por defecto."""
        today = date.today()
        future = date(2030, 12, 31)
        
        # Regla 1: Bundle Básico (Hotel + Flight)
        self.bundle_rules.append(BundleRule(
            rule_id="RULE-BASIC",
            rule_name="Basic Package - Flight + Hotel",
            required_products=[ProductType.FLIGHT, ProductType.HOTEL],
            optional_products=[],
            min_products=2,
            max_products=2,
            discount_strategy=DiscountStrategy.PERCENTAGE,
            discount_value=Decimal("10"),
            valid_from=today,
            valid_to=future,
            priority=100
        ))
        
        # Regla 2: Bundle Estándar (Hotel + Flight + Transport)
        self.bundle_rules.append(BundleRule(
            rule_id="RULE-STANDARD",
            rule_name="Standard Package - Flight + Hotel + Transport",
            required_products=[ProductType.FLIGHT, ProductType.HOTEL, ProductType.TRANSPORT],
            optional_products=[],
            min_products=3,
            max_products=3,
            discount_strategy=DiscountStrategy.PERCENTAGE,
            discount_value=Decimal("15"),
            valid_from=today,
            valid_to=future,
            priority=90
        ))
        
        # Regla 3: Bundle Premium (Hotel + Flight + Transport + Activity)
        self.bundle_rules.append(BundleRule(
            rule_id="RULE-PREMIUM",
            rule_name="Premium Package - Flight + Hotel + Transport + Activities",
            required_products=[ProductType.FLIGHT, ProductType.HOTEL, ProductType.TRANSPORT],
            optional_products=[ProductType.ACTIVITY, ProductType.TOUR],
            min_products=4,
            max_products=6,
            discount_strategy=DiscountStrategy.PERCENTAGE,
            discount_value=Decimal("20"),
            valid_from=today,
            valid_to=future,
            priority=80
        ))
        
        # Regla 4: Bundle Todo Incluido
        self.bundle_rules.append(BundleRule(
            rule_id="RULE-ALL-INCLUSIVE",
            rule_name="All-Inclusive Package",
            required_products=[ProductType.FLIGHT, ProductType.HOTEL, ProductType.TRANSPORT, ProductType.MEAL_PLAN],
            optional_products=[ProductType.ACTIVITY, ProductType.TOUR, ProductType.GUIDE, ProductType.INSURANCE],
            min_products=5,
            max_products=10,
            discount_strategy=DiscountStrategy.PERCENTAGE,
            discount_value=Decimal("25"),
            valid_from=today,
            valid_to=future,
            priority=70
        ))
        
        # Regla 5: Early Bird (reserva con 60+ días anticipación)
        self.bundle_rules.append(BundleRule(
            rule_id="RULE-EARLY-BIRD",
            rule_name="Early Bird Discount",
            required_products=[ProductType.FLIGHT, ProductType.HOTEL],
            optional_products=[ProductType.TRANSPORT, ProductType.ACTIVITY, ProductType.TOUR],
            min_products=2,
            max_products=10,
            discount_strategy=DiscountStrategy.EARLY_BIRD,
            discount_value=Decimal("5"),  # 5% adicional
            valid_from=today,
            valid_to=future,
            priority=50
        ))
        
        logger.info(f"Initialized {len(self.bundle_rules)} default bundle rules")
    
    async def create_bundle(
        self,
        products: List[Product],
        booking_date: date,
        travel_date: date
    ) -> Optional[Bundle]:
        """
        Crear bundle automáticamente aplicando las mejores reglas.
        
        Args:
            products: Lista de productos a incluir
            booking_date: Fecha de reserva
            travel_date: Fecha de viaje
        
        Returns:
            Bundle creado con descuentos aplicados, o None si no aplican reglas
        """
        logger.info(f"Creating bundle for {len(products)} products")
        
        # Encontrar reglas aplicables
        applicable_rules = [
            rule for rule in self.bundle_rules
            if rule.applies_to(products, booking_date)
        ]
        
        if not applicable_rules:
            logger.info("No applicable bundle rules found")
            return None
        
        # Ordenar por prioridad (menor número = mayor prioridad)
        applicable_rules.sort(key=lambda r: r.priority)
        
        # Calcular precio base
        base_price = sum(p.base_price for p in products)
        
        # Aplicar reglas (acumular descuentos)
        total_discount_pct = Decimal("0")
        applied_rule_ids = []
        
        for rule in applicable_rules:
            if rule.discount_strategy == DiscountStrategy.PERCENTAGE:
                total_discount_pct += rule.discount_value
                applied_rule_ids.append(rule.rule_id)
            
            elif rule.discount_strategy == DiscountStrategy.EARLY_BIRD:
                # Verificar si aplica early bird (60+ días anticipación)
                days_advance = (travel_date - booking_date).days
                if days_advance >= 60:
                    total_discount_pct += rule.discount_value
                    applied_rule_ids.append(rule.rule_id)
        
        # Limitar descuento máximo al 30%
        total_discount_pct = min(total_discount_pct, Decimal("30"))
        
        # Calcular precio final
        discount_amount = base_price * (total_discount_pct / Decimal("100"))
        discounted_price = base_price - discount_amount
        
        # Determinar tipo de bundle
        bundle_type = self._determine_bundle_type(products)
        
        # Crear bundle
        bundle = Bundle(
            bundle_id=f"BUNDLE-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            bundle_name=self._generate_bundle_name(products),
            bundle_type=bundle_type,
            products=products,
            base_price=base_price,
            discounted_price=discounted_price,
            discount_amount=discount_amount,
            discount_percentage=total_discount_pct,
            applied_rules=applied_rule_ids,
            created_at=datetime.now(),
            valid_until=datetime.now() + timedelta(days=7)  # Válido 7 días
        )
        
        logger.info(
            f"Bundle created: {bundle.bundle_id} - "
            f"Base: {base_price}, Discounted: {discounted_price}, "
            f"Savings: {discount_amount} ({total_discount_pct}%)"
        )
        
        return bundle
    
    def _determine_bundle_type(self, products: List[Product]) -> BundleType:
        """Determinar tipo de bundle basado en productos."""
        product_types = set(p.product_type for p in products)
        
        if ProductType.MEAL_PLAN in product_types and len(products) >= 5:
            return BundleType.ALL_INCLUSIVE
        elif len(products) >= 4:
            return BundleType.PREMIUM
        elif ProductType.TRANSPORT in product_types:
            return BundleType.STANDARD
        elif ProductType.FLIGHT in product_types and ProductType.HOTEL in product_types:
            return BundleType.BASIC
        else:
            return BundleType.CUSTOM
    
    def _generate_bundle_name(self, products: List[Product]) -> str:
        """Generar nombre descriptivo para el bundle."""
        # Obtener destino del primer producto con destino
        destination = "Destination"
        for p in products:
            if p.destination:
                destination = p.destination
                break
        
        # Contar tipos de productos
        product_types = set(p.product_type for p in products)
        
        if len(product_types) >= 5:
            return f"All-Inclusive Package to {destination}"
        elif len(product_types) >= 4:
            return f"Premium Package to {destination}"
        elif len(product_types) >= 3:
            return f"Standard Package to {destination}"
        else:
            return f"Basic Package to {destination}"
    
    async def optimize_bundle_price(
        self,
        bundle: Bundle,
        target_margin: Decimal = Decimal("20")
    ) -> Bundle:
        """
        Optimizar precio del bundle para alcanzar margen objetivo.
        
        Args:
            bundle: Bundle a optimizar
            target_margin: Margen objetivo en porcentaje
        
        Returns:
            Bundle con precio optimizado
        """
        logger.info(f"Optimizing bundle price for {bundle.bundle_id}")
        
        # Calcular precio objetivo con margen
        cost_price = bundle.base_price * Decimal("0.7")  # Asumimos 70% es costo
        target_price = cost_price / (Decimal("1") - target_margin / Decimal("100"))
        
        # Si el precio descontado actual es menor al objetivo, ajustar
        if bundle.discounted_price < target_price:
            # Recalcular descuento
            new_discount_amount = bundle.base_price - target_price
            new_discount_pct = (new_discount_amount / bundle.base_price) * Decimal("100")
            
            bundle.discounted_price = target_price
            bundle.discount_amount = new_discount_amount
            bundle.discount_percentage = new_discount_pct
            
            logger.info(f"Bundle price optimized to {target_price} (margin: {target_margin}%)")
        
        return bundle


# ============================================================================
# CROSS-SELL RECOMMENDATION ENGINE
# ============================================================================

class CrossSellEngine:
    """
    Motor de recomendaciones de cross-sell.
    
    Analiza productos y sugiere complementos para aumentar el valor
    de la reserva.
    """
    
    def __init__(self, bundling_engine: BundlingEngine):
        """Inicializar Cross-sell Engine."""
        self.bundling_engine = bundling_engine
        self._initialize_compatibility_matrix()
        logger.info("CrossSellEngine initialized")
    
    def _initialize_compatibility_matrix(self):
        """
        Inicializar matriz de compatibilidad de productos.
        
        Define qué productos se complementan bien entre sí.
        """
        self.compatibility: Dict[ProductType, Dict[ProductType, Decimal]] = {
            ProductType.FLIGHT: {
                ProductType.HOTEL: Decimal("95"),
                ProductType.TRANSPORT: Decimal("85"),
                ProductType.INSURANCE: Decimal("90"),
                ProductType.TOUR: Decimal("70"),
                ProductType.ACTIVITY: Decimal("65")
            },
            ProductType.HOTEL: {
                ProductType.FLIGHT: Decimal("95"),
                ProductType.MEAL_PLAN: Decimal("90"),
                ProductType.TOUR: Decimal("80"),
                ProductType.ACTIVITY: Decimal("75"),
                ProductType.TRANSPORT: Decimal("70")
            },
            ProductType.TOUR: {
                ProductType.HOTEL: Decimal("80"),
                ProductType.GUIDE: Decimal("85"),
                ProductType.MEAL_PLAN: Decimal("70"),
                ProductType.TRANSPORT: Decimal("75"),
                ProductType.ACTIVITY: Decimal("60")
            },
            ProductType.TRANSPORT: {
                ProductType.FLIGHT: Decimal("85"),
                ProductType.HOTEL: Decimal("70"),
                ProductType.TOUR: Decimal("75"),
                ProductType.ACTIVITY: Decimal("65")
            }
        }
    
    async def get_recommendations(
        self,
        primary_product: Product,
        available_products: List[Product],
        max_recommendations: int = 5
    ) -> List[CrossSellRecommendation]:
        """
        Obtener recomendaciones de cross-sell para un producto.
        
        Args:
            primary_product: Producto principal
            available_products: Productos disponibles para recomendar
            max_recommendations: Máximo de recomendaciones
        
        Returns:
            Lista de recomendaciones ordenadas por score
        """
        logger.info(f"Generating cross-sell recommendations for {primary_product.product_id}")
        
        recommendations = []
        
        # Filtrar productos compatibles
        compatible_products = []
        
        for product in available_products:
            if product.product_id == primary_product.product_id:
                continue
            
            # Obtener score de compatibilidad
            score = self._get_compatibility_score(
                primary_product.product_type,
                product.product_type
            )
            
            if score > Decimal("50"):  # Umbral mínimo de compatibilidad
                compatible_products.append((product, score))
        
        # Ordenar por score
        compatible_products.sort(key=lambda x: x[1], reverse=True)
        
        # Crear recomendaciones
        for product, score in compatible_products[:max_recommendations]:
            # Intentar crear bundle
            potential_bundle = await self.bundling_engine.create_bundle(
                [primary_product, product],
                date.today(),
                date.today() + timedelta(days=30)
            )
            
            # Calcular uplift estimado
            if potential_bundle:
                estimated_uplift = potential_bundle.discount_amount
            else:
                estimated_uplift = product.base_price * Decimal("0.1")
            
            # Generar razón de la recomendación
            reason = self._generate_recommendation_reason(
                primary_product.product_type,
                product.product_type,
                score
            )
            
            recommendation = CrossSellRecommendation(
                recommendation_id=f"REC-{datetime.now().strftime('%Y%m%d%H%M%S')}-{len(recommendations)}",
                primary_product=primary_product,
                suggested_products=[product],
                compatibility_score=score,
                potential_bundle=potential_bundle,
                reason=reason,
                estimated_uplift=estimated_uplift
            )
            
            recommendations.append(recommendation)
        
        logger.info(f"Generated {len(recommendations)} cross-sell recommendations")
        
        return recommendations
    
    def _get_compatibility_score(
        self,
        product_type_1: ProductType,
        product_type_2: ProductType
    ) -> Decimal:
        """Obtener score de compatibilidad entre dos tipos de productos."""
        if product_type_1 in self.compatibility:
            if product_type_2 in self.compatibility[product_type_1]:
                return self.compatibility[product_type_1][product_type_2]
        
        # Score por defecto
        return Decimal("50")
    
    def _generate_recommendation_reason(
        self,
        primary_type: ProductType,
        suggested_type: ProductType,
        score: Decimal
    ) -> str:
        """Generar razón de recomendación."""
        reasons = {
            (ProductType.FLIGHT, ProductType.HOTEL): "Los clientes que reservan vuelos generalmente necesitan alojamiento",
            (ProductType.FLIGHT, ProductType.TRANSPORT): "Facilite el traslado desde el aeropuerto",
            (ProductType.FLIGHT, ProductType.INSURANCE): "Proteja su viaje con seguro de viaje",
            (ProductType.HOTEL, ProductType.MEAL_PLAN): "Incluya plan de comidas para mayor comodidad",
            (ProductType.HOTEL, ProductType.TOUR): "Descubra la zona con tours guiados",
            (ProductType.TOUR, ProductType.GUIDE): "Mejore la experiencia con guía profesional",
        }
        
        key = (primary_type, suggested_type)
        if key in reasons:
            return reasons[key]
        
        return f"Productos altamente compatibles (score: {float(score)}/100)"
    
    async def get_upsell_suggestions(
        self,
        current_bundle: Bundle,
        available_products: List[Product]
    ) -> List[Dict[str, Any]]:
        """
        Obtener sugerencias de upsell para un bundle existente.
        
        Args:
            current_bundle: Bundle actual del cliente
            available_products: Productos adicionales disponibles
        
        Returns:
            Lista de sugerencias de upsell
        """
        logger.info(f"Generating upsell suggestions for bundle {current_bundle.bundle_id}")
        
        suggestions = []
        
        # Productos ya en el bundle
        bundle_product_ids = {p.product_id for p in current_bundle.products}
        bundle_product_types = {p.product_type for p in current_bundle.products}
        
        # Buscar productos que mejoren el bundle
        for product in available_products:
            if product.product_id in bundle_product_ids:
                continue
            
            # Calcular compatibilidad promedio con productos del bundle
            compatibility_scores = []
            for bundle_product in current_bundle.products:
                score = self._get_compatibility_score(
                    bundle_product.product_type,
                    product.product_type
                )
                compatibility_scores.append(score)
            
            avg_compatibility = sum(compatibility_scores) / len(compatibility_scores)
            
            if avg_compatibility > Decimal("60"):
                # Crear nuevo bundle con el producto adicional
                new_products = current_bundle.products + [product]
                new_bundle = await self.bundling_engine.create_bundle(
                    new_products,
                    date.today(),
                    date.today() + timedelta(days=30)
                )
                
                if new_bundle:
                    additional_value = new_bundle.discounted_price - current_bundle.discounted_price
                    
                    suggestions.append({
                        "product": {
                            "product_id": product.product_id,
                            "name": product.name,
                            "type": product.product_type.value,
                            "price": float(product.base_price)
                        },
                        "compatibility_score": float(avg_compatibility),
                        "additional_cost": float(additional_value),
                        "new_bundle_price": float(new_bundle.discounted_price),
                        "new_total_savings": float(new_bundle.discount_amount),
                        "reason": f"Agregue {product.product_type.value} y aumente el descuento total"
                    })
        
        # Ordenar por compatibilidad
        suggestions.sort(key=lambda x: x["compatibility_score"], reverse=True)
        
        logger.info(f"Generated {len(suggestions)} upsell suggestions")
        
        return suggestions[:5]  # Top 5


# ============================================================================
# SINGLETON PATTERN
# ============================================================================

_bundling_engine: Optional[BundlingEngine] = None
_cross_sell_engine: Optional[CrossSellEngine] = None


def get_bundling_engine() -> BundlingEngine:
    """Obtener instancia singleton del Bundling Engine."""
    global _bundling_engine
    
    if _bundling_engine is None:
        _bundling_engine = BundlingEngine()
    
    return _bundling_engine


def get_cross_sell_engine() -> CrossSellEngine:
    """Obtener instancia singleton del Cross-sell Engine."""
    global _cross_sell_engine, _bundling_engine
    
    if _cross_sell_engine is None:
        if _bundling_engine is None:
            _bundling_engine = BundlingEngine()
        _cross_sell_engine = CrossSellEngine(_bundling_engine)
    
    return _cross_sell_engine
