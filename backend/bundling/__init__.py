"""
Bundling & Cross-sell Module - Phase 4

Sistema inteligente de bundling y cross-sell automation.

Autor: Spirit Tours Bundling Team
Fecha: 2025-10-18
"""

from .bundle_engine import (
    BundlingEngine,
    CrossSellEngine,
    Product,
    ProductType,
    BundleType,
    DiscountStrategy,
    Bundle,
    BundleRule,
    CrossSellRecommendation,
    get_bundling_engine,
    get_cross_sell_engine
)

__all__ = [
    # Engines
    "BundlingEngine",
    "CrossSellEngine",
    "get_bundling_engine",
    "get_cross_sell_engine",
    
    # Data Classes
    "Product",
    "Bundle",
    "BundleRule",
    "CrossSellRecommendation",
    
    # Enums
    "ProductType",
    "BundleType",
    "DiscountStrategy",
]
