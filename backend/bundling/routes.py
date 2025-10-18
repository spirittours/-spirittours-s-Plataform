"""
Cross-sell Bundle Automation API Routes (Phase 4)

Endpoints para bundling inteligente y cross-sell automation:
- Creación automática de bundles
- Recomendaciones de cross-sell
- Sugerencias de upsell
- Optimización de pricing

Autor: Spirit Tours Bundling Team
Fecha: 2025-10-18
"""

from fastapi import APIRouter, Query, HTTPException, Body
from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Any
from decimal import Decimal
from pydantic import BaseModel

from .bundle_engine import (
    get_bundling_engine,
    get_cross_sell_engine,
    BundlingEngine,
    CrossSellEngine,
    Product,
    ProductType,
    BundleType
)

router = APIRouter(prefix="/bundling", tags=["bundling"])


# ============================================================================
# REQUEST MODELS
# ============================================================================

class ProductRequest(BaseModel):
    """Modelo de request para productos."""
    product_id: str
    product_type: str
    name: str
    description: str
    base_price: float
    supplier_id: str
    destination: str
    duration_days: int
    available_from: str
    available_to: str
    max_capacity: int


class BundleRequest(BaseModel):
    """Modelo de request para crear bundle."""
    products: List[ProductRequest]
    booking_date: str
    travel_date: str


class OptimizeBundleRequest(BaseModel):
    """Modelo de request para optimizar bundle."""
    bundle_id: str
    target_margin: float


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def parse_product_request(req: ProductRequest) -> Product:
    """Convertir ProductRequest a Product."""
    return Product(
        product_id=req.product_id,
        product_type=ProductType(req.product_type),
        name=req.name,
        description=req.description,
        base_price=Decimal(str(req.base_price)),
        supplier_id=req.supplier_id,
        destination=req.destination,
        duration_days=req.duration_days,
        available_from=date.fromisoformat(req.available_from),
        available_to=date.fromisoformat(req.available_to),
        max_capacity=req.max_capacity
    )


# ============================================================================
# BUNDLE CREATION ENDPOINTS
# ============================================================================

@router.post("/bundles/create")
async def create_bundle(request: BundleRequest = Body(...)):
    """
    Crear bundle automáticamente con descuentos aplicados.
    
    El sistema analiza los productos y aplica las mejores reglas
    de bundling disponibles para maximizar el valor.
    
    Returns:
        Bundle creado con detalles de pricing y descuentos
    """
    bundling_engine = get_bundling_engine()
    
    try:
        # Parsear productos
        products = [parse_product_request(p) for p in request.products]
        
        # Parsear fechas
        booking_date = date.fromisoformat(request.booking_date)
        travel_date = date.fromisoformat(request.travel_date)
        
        # Crear bundle
        bundle = await bundling_engine.create_bundle(
            products,
            booking_date,
            travel_date
        )
        
        if not bundle:
            return {
                "success": False,
                "message": "No applicable bundle rules found for these products",
                "products_count": len(products)
            }
        
        return {
            "success": True,
            "bundle": bundle.to_dict()
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bundles/optimize")
async def optimize_bundle_price(
    bundle_id: str = Query(..., description="Bundle ID to optimize"),
    target_margin: float = Query(20.0, ge=0, le=50, description="Target margin percentage")
):
    """
    Optimizar precio del bundle para alcanzar margen objetivo.
    
    Ajusta el descuento del bundle para mantener el margen deseado
    mientras maximiza el atractivo para el cliente.
    """
    bundling_engine = get_bundling_engine()
    
    # TODO: Recuperar bundle de base de datos por bundle_id
    # Por ahora, retornar mensaje
    
    return {
        "success": True,
        "message": f"Bundle {bundle_id} would be optimized for {target_margin}% margin",
        "note": "Actual optimization requires database integration"
    }


# ============================================================================
# CROSS-SELL RECOMMENDATIONS
# ============================================================================

@router.post("/recommendations/cross-sell")
async def get_cross_sell_recommendations(
    primary_product: ProductRequest = Body(...),
    available_products: List[ProductRequest] = Body(...),
    max_recommendations: int = Query(5, ge=1, le=10)
):
    """
    Obtener recomendaciones de cross-sell para un producto.
    
    Analiza el producto principal y sugiere productos complementarios
    que aumenten el valor de la reserva.
    
    Returns:
        Lista de recomendaciones con score de compatibilidad
    """
    cross_sell_engine = get_cross_sell_engine()
    
    try:
        # Parsear productos
        primary = parse_product_request(primary_product)
        available = [parse_product_request(p) for p in available_products]
        
        # Obtener recomendaciones
        recommendations = await cross_sell_engine.get_recommendations(
            primary,
            available,
            max_recommendations
        )
        
        return {
            "primary_product": {
                "product_id": primary.product_id,
                "name": primary.name,
                "type": primary.product_type.value
            },
            "recommendations_count": len(recommendations),
            "recommendations": [rec.to_dict() for rec in recommendations]
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/recommendations/upsell")
async def get_upsell_suggestions(
    current_bundle_products: List[ProductRequest] = Body(...),
    available_products: List[ProductRequest] = Body(...)
):
    """
    Obtener sugerencias de upsell para un bundle existente.
    
    Analiza el bundle actual del cliente y sugiere productos adicionales
    que mejoren el paquete con mayor descuento.
    
    Returns:
        Lista de sugerencias de upsell con valor adicional
    """
    bundling_engine = get_bundling_engine()
    cross_sell_engine = get_cross_sell_engine()
    
    try:
        # Parsear productos
        bundle_products = [parse_product_request(p) for p in current_bundle_products]
        available = [parse_product_request(p) for p in available_products]
        
        # Crear bundle actual
        current_bundle = await bundling_engine.create_bundle(
            bundle_products,
            date.today(),
            date.today() + timedelta(days=30)
        )
        
        if not current_bundle:
            raise HTTPException(
                status_code=400,
                detail="Cannot create bundle from provided products"
            )
        
        # Obtener sugerencias de upsell
        suggestions = await cross_sell_engine.get_upsell_suggestions(
            current_bundle,
            available
        )
        
        return {
            "current_bundle": current_bundle.to_dict(),
            "upsell_suggestions_count": len(suggestions),
            "upsell_suggestions": suggestions
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# BUNDLE RULES MANAGEMENT
# ============================================================================

@router.get("/rules")
async def list_bundle_rules():
    """
    Listar todas las reglas de bundling activas.
    
    Returns:
        Lista de reglas con sus condiciones y descuentos
    """
    bundling_engine = get_bundling_engine()
    
    rules = []
    for rule in bundling_engine.bundle_rules:
        rules.append({
            "rule_id": rule.rule_id,
            "rule_name": rule.rule_name,
            "required_products": [pt.value for pt in rule.required_products],
            "optional_products": [pt.value for pt in rule.optional_products],
            "min_products": rule.min_products,
            "max_products": rule.max_products,
            "discount_strategy": rule.discount_strategy.value,
            "discount_value": float(rule.discount_value),
            "valid_from": rule.valid_from.isoformat(),
            "valid_to": rule.valid_to.isoformat(),
            "priority": rule.priority
        })
    
    return {
        "total_rules": len(rules),
        "rules": rules
    }


@router.get("/rules/{rule_id}")
async def get_bundle_rule(rule_id: str):
    """
    Obtener detalle de una regla de bundling específica.
    """
    bundling_engine = get_bundling_engine()
    
    for rule in bundling_engine.bundle_rules:
        if rule.rule_id == rule_id:
            return {
                "rule_id": rule.rule_id,
                "rule_name": rule.rule_name,
                "required_products": [pt.value for pt in rule.required_products],
                "optional_products": [pt.value for pt in rule.optional_products],
                "min_products": rule.min_products,
                "max_products": rule.max_products,
                "discount_strategy": rule.discount_strategy.value,
                "discount_value": float(rule.discount_value),
                "valid_from": rule.valid_from.isoformat(),
                "valid_to": rule.valid_to.isoformat(),
                "priority": rule.priority
            }
    
    raise HTTPException(status_code=404, detail=f"Rule {rule_id} not found")


# ============================================================================
# PRODUCT COMPATIBILITY
# ============================================================================

@router.get("/compatibility/{product_type_1}/{product_type_2}")
async def get_product_compatibility(
    product_type_1: str,
    product_type_2: str
):
    """
    Obtener score de compatibilidad entre dos tipos de productos.
    
    El score va de 0 a 100, donde 100 es máxima compatibilidad.
    """
    cross_sell_engine = get_cross_sell_engine()
    
    try:
        score = cross_sell_engine._get_compatibility_score(
            ProductType(product_type_1),
            ProductType(product_type_2)
        )
        
        return {
            "product_type_1": product_type_1,
            "product_type_2": product_type_2,
            "compatibility_score": float(score),
            "rating": "high" if score >= 80 else "medium" if score >= 60 else "low"
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid product type: {str(e)}")


@router.get("/compatibility/matrix")
async def get_compatibility_matrix():
    """
    Obtener matriz completa de compatibilidad de productos.
    
    Útil para visualización y análisis de relaciones entre productos.
    """
    cross_sell_engine = get_cross_sell_engine()
    
    matrix = {}
    for product_type_1, compatibilities in cross_sell_engine.compatibility.items():
        matrix[product_type_1.value] = {
            product_type_2.value: float(score)
            for product_type_2, score in compatibilities.items()
        }
    
    return {
        "compatibility_matrix": matrix,
        "description": "Scores range from 0-100, where 100 is highest compatibility"
    }


# ============================================================================
# ANALYTICS
# ============================================================================

@router.get("/analytics/bundle-types")
async def get_bundle_type_distribution():
    """
    Obtener distribución de tipos de bundles.
    
    TODO: Implementar con datos reales de base de datos.
    """
    return {
        "distribution": {
            "basic": {"count": 150, "percentage": 30.0, "avg_value": 850.00},
            "standard": {"count": 200, "percentage": 40.0, "avg_value": 1250.00},
            "premium": {"count": 100, "percentage": 20.0, "avg_value": 2100.00},
            "all_inclusive": {"count": 50, "percentage": 10.0, "avg_value": 3500.00}
        },
        "total_bundles": 500,
        "avg_bundle_value": 1425.00
    }


@router.get("/analytics/cross-sell-performance")
async def get_cross_sell_performance():
    """
    Obtener métricas de rendimiento de cross-sell.
    
    TODO: Implementar con datos reales de base de datos.
    """
    return {
        "metrics": {
            "recommendations_shown": 5000,
            "recommendations_accepted": 1250,
            "acceptance_rate": 25.0,
            "avg_uplift_per_recommendation": 125.50,
            "total_additional_revenue": 156875.00
        },
        "top_performing_combinations": [
            {"primary": "flight", "suggested": "hotel", "acceptance_rate": 45.0},
            {"primary": "hotel", "suggested": "meal_plan", "acceptance_rate": 38.0},
            {"primary": "flight", "suggested": "insurance", "acceptance_rate": 32.0}
        ]
    }


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def health_check():
    """Health check para el servicio de bundling."""
    bundling_engine = get_bundling_engine()
    cross_sell_engine = get_cross_sell_engine()
    
    return {
        "status": "healthy",
        "service": "bundling-cross-sell",
        "components": {
            "bundling_engine": bundling_engine is not None,
            "cross_sell_engine": cross_sell_engine is not None,
            "active_rules": len(bundling_engine.bundle_rules)
        }
    }
