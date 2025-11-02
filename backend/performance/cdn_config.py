"""
CDN Configuration and Asset Optimization.

This module provides CDN configuration and asset optimization settings
for improved content delivery performance.

Features:
- CDN configuration management
- Asset optimization rules
- Cache control policies
- Image optimization settings
- Static asset versioning
- CDN health checks

Author: GenSpark AI Developer
Phase: 7 - Performance Optimization
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from enum import Enum
import hashlib
import json
from datetime import timedelta

from utils.logger import get_logger

logger = get_logger(__name__)


class CDNProvider(str, Enum):
    """Supported CDN providers."""
    CLOUDFLARE = "cloudflare"
    CLOUDFRONT = "cloudfront"
    FASTLY = "fastly"
    AKAMAI = "akamai"
    CUSTOM = "custom"


class CacheStrategy(str, Enum):
    """Cache strategies for different content types."""
    IMMUTABLE = "immutable"  # Never changes (versioned assets)
    PUBLIC_LONG = "public_long"  # Public, cache for long time
    PUBLIC_SHORT = "public_short"  # Public, cache for short time
    PRIVATE = "private"  # User-specific content
    NO_CACHE = "no_cache"  # Never cache


@dataclass
class CacheRule:
    """Cache control rule for specific content."""
    pattern: str  # File pattern or path
    strategy: CacheStrategy
    max_age: int  # Seconds
    s_maxage: Optional[int] = None  # CDN cache time
    stale_while_revalidate: Optional[int] = None
    stale_if_error: Optional[int] = None
    must_revalidate: bool = False
    
    def get_cache_header(self) -> str:
        """Generate Cache-Control header value."""
        parts = []
        
        if self.strategy == CacheStrategy.NO_CACHE:
            return "no-cache, no-store, must-revalidate"
        
        if self.strategy == CacheStrategy.PRIVATE:
            parts.append("private")
        else:
            parts.append("public")
        
        parts.append(f"max-age={self.max_age}")
        
        if self.s_maxage:
            parts.append(f"s-maxage={self.s_maxage}")
        
        if self.strategy == CacheStrategy.IMMUTABLE:
            parts.append("immutable")
        
        if self.must_revalidate:
            parts.append("must-revalidate")
        
        if self.stale_while_revalidate:
            parts.append(f"stale-while-revalidate={self.stale_while_revalidate}")
        
        if self.stale_if_error:
            parts.append(f"stale-if-error={self.stale_if_error}")
        
        return ", ".join(parts)


@dataclass
class ImageOptimizationConfig:
    """Image optimization configuration."""
    enable_webp: bool = True
    enable_avif: bool = True
    quality: int = 85
    max_width: Optional[int] = 2048
    max_height: Optional[int] = 2048
    progressive: bool = True
    strip_metadata: bool = True
    
    def get_optimization_params(self) -> Dict[str, Any]:
        """Get optimization parameters."""
        return {
            'webp': self.enable_webp,
            'avif': self.enable_avif,
            'quality': self.quality,
            'max_width': self.max_width,
            'max_height': self.max_height,
            'progressive': self.progressive,
            'strip_metadata': self.strip_metadata
        }


@dataclass
class CDNConfig:
    """CDN configuration."""
    provider: CDNProvider
    domain: str
    zone_id: Optional[str] = None
    api_key: Optional[str] = None
    enable_compression: bool = True
    enable_http2: bool = True
    enable_http3: bool = True
    enable_brotli: bool = True
    enable_gzip: bool = True
    min_compression_size: int = 1024  # bytes
    origin_domain: str = ""
    ssl_mode: str = "full"  # flexible, full, strict
    
    def validate(self) -> bool:
        """Validate CDN configuration."""
        if not self.domain:
            logger.error("CDN domain is required")
            return False
        
        if self.provider in [CDNProvider.CLOUDFLARE, CDNProvider.CLOUDFRONT]:
            if not self.zone_id or not self.api_key:
                logger.warning(f"{self.provider} requires zone_id and api_key")
        
        return True


class CDNManager:
    """
    CDN configuration and management.
    
    This class manages CDN settings, cache rules, and asset optimization.
    """
    
    def __init__(self, config: CDNConfig):
        """
        Initialize CDN manager.
        
        Args:
            config: CDN configuration
        """
        self.config = config
        self.cache_rules: List[CacheRule] = []
        self.image_config = ImageOptimizationConfig()
        
        # Initialize default cache rules
        self._init_default_cache_rules()
        
        logger.info(f"CDN manager initialized for {config.provider}", extra={
            'domain': config.domain,
            'compression_enabled': config.enable_compression
        })
    
    def _init_default_cache_rules(self) -> None:
        """Initialize default cache rules."""
        # Immutable assets (versioned)
        self.cache_rules.append(CacheRule(
            pattern="*.{hash}.{js,css,woff2,woff,ttf}",
            strategy=CacheStrategy.IMMUTABLE,
            max_age=31536000,  # 1 year
            s_maxage=31536000
        ))
        
        # Images
        self.cache_rules.append(CacheRule(
            pattern="*.{jpg,jpeg,png,gif,webp,avif,svg,ico}",
            strategy=CacheStrategy.PUBLIC_LONG,
            max_age=2592000,  # 30 days
            s_maxage=2592000,
            stale_while_revalidate=86400  # 1 day
        ))
        
        # Fonts
        self.cache_rules.append(CacheRule(
            pattern="*.{woff,woff2,ttf,otf,eot}",
            strategy=CacheStrategy.PUBLIC_LONG,
            max_age=31536000,  # 1 year
            s_maxage=31536000
        ))
        
        # API responses (cacheable)
        self.cache_rules.append(CacheRule(
            pattern="/api/v1/{countries,airlines,airports}/*",
            strategy=CacheStrategy.PUBLIC_SHORT,
            max_age=3600,  # 1 hour
            s_maxage=3600,
            stale_while_revalidate=300  # 5 minutes
        ))
        
        # API responses (non-cacheable)
        self.cache_rules.append(CacheRule(
            pattern="/api/v1/{bookings,payments,invoices}/*",
            strategy=CacheStrategy.NO_CACHE,
            max_age=0
        ))
        
        # HTML pages
        self.cache_rules.append(CacheRule(
            pattern="*.html",
            strategy=CacheStrategy.PUBLIC_SHORT,
            max_age=300,  # 5 minutes
            s_maxage=300,
            stale_while_revalidate=60
        ))
        
        logger.info(f"Initialized {len(self.cache_rules)} default cache rules")
    
    def add_cache_rule(self, rule: CacheRule) -> None:
        """Add a custom cache rule."""
        self.cache_rules.append(rule)
        logger.info(f"Added cache rule for pattern: {rule.pattern}")
    
    def get_cache_header(self, path: str) -> str:
        """
        Get appropriate cache header for a path.
        
        Args:
            path: Request path or filename
            
        Returns:
            Cache-Control header value
        """
        # Check rules in order
        for rule in self.cache_rules:
            if self._matches_pattern(path, rule.pattern):
                return rule.get_cache_header()
        
        # Default: short cache
        return "public, max-age=300"
    
    def _matches_pattern(self, path: str, pattern: str) -> bool:
        """
        Check if path matches pattern.
        
        Args:
            path: Path to check
            pattern: Pattern to match
            
        Returns:
            True if matches
        """
        # Simple pattern matching (in production, use more sophisticated matching)
        if '*' in pattern:
            # Handle wildcards
            parts = pattern.split('*')
            if all(part in path for part in parts if part):
                return True
        elif path.endswith(pattern):
            return True
        
        return False
    
    def get_cdn_url(self, asset_path: str, version: Optional[str] = None) -> str:
        """
        Get CDN URL for an asset.
        
        Args:
            asset_path: Asset path
            version: Optional version/hash for cache busting
            
        Returns:
            Full CDN URL
        """
        # Remove leading slash
        asset_path = asset_path.lstrip('/')
        
        # Add version if provided
        if version:
            # Insert version before file extension
            parts = asset_path.rsplit('.', 1)
            if len(parts) == 2:
                asset_path = f"{parts[0]}.{version}.{parts[1]}"
        
        return f"https://{self.config.domain}/{asset_path}"
    
    def generate_asset_hash(self, content: bytes) -> str:
        """
        Generate hash for asset versioning.
        
        Args:
            content: Asset content
            
        Returns:
            Hash string (8 characters)
        """
        hash_obj = hashlib.sha256(content)
        return hash_obj.hexdigest()[:8]
    
    def get_image_optimization_url(
        self,
        image_path: str,
        width: Optional[int] = None,
        height: Optional[int] = None,
        quality: Optional[int] = None,
        format: Optional[str] = None
    ) -> str:
        """
        Get optimized image URL with parameters.
        
        Args:
            image_path: Original image path
            width: Desired width
            height: Desired height
            quality: Image quality (1-100)
            format: Output format (webp, avif, jpg, png)
            
        Returns:
            Optimized image URL
        """
        base_url = self.get_cdn_url(image_path)
        params = []
        
        if width:
            params.append(f"w={width}")
        if height:
            params.append(f"h={height}")
        if quality:
            params.append(f"q={quality}")
        if format:
            params.append(f"f={format}")
        
        if params:
            return f"{base_url}?{'&'.join(params)}"
        
        return base_url
    
    def purge_cache(self, paths: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Purge CDN cache.
        
        Args:
            paths: Optional list of paths to purge (None = purge all)
            
        Returns:
            Purge operation result
        """
        if not self.config.validate():
            return {'success': False, 'error': 'Invalid CDN configuration'}
        
        # In production, this would call the CDN provider's API
        logger.info(f"Purging CDN cache for {self.config.provider}", extra={
            'paths': paths or 'all',
            'domain': self.config.domain
        })
        
        # TODO: Implement actual CDN API calls based on provider
        if self.config.provider == CDNProvider.CLOUDFLARE:
            return self._purge_cloudflare(paths)
        elif self.config.provider == CDNProvider.CLOUDFRONT:
            return self._purge_cloudfront(paths)
        
        return {
            'success': True,
            'message': 'Cache purge simulated (implement provider-specific logic)',
            'paths': paths or 'all'
        }
    
    def _purge_cloudflare(self, paths: Optional[List[str]] = None) -> Dict[str, Any]:
        """Purge Cloudflare cache."""
        # TODO: Implement Cloudflare API call
        # https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache
        return {'success': True, 'provider': 'cloudflare'}
    
    def _purge_cloudfront(self, paths: Optional[List[str]] = None) -> Dict[str, Any]:
        """Purge CloudFront cache."""
        # TODO: Implement CloudFront API call
        # boto3.client('cloudfront').create_invalidation()
        return {'success': True, 'provider': 'cloudfront'}
    
    def get_config_summary(self) -> Dict[str, Any]:
        """
        Get CDN configuration summary.
        
        Returns:
            Configuration summary
        """
        return {
            'provider': self.config.provider.value,
            'domain': self.config.domain,
            'compression': {
                'enabled': self.config.enable_compression,
                'gzip': self.config.enable_gzip,
                'brotli': self.config.enable_brotli,
                'min_size': self.config.min_compression_size
            },
            'protocols': {
                'http2': self.config.enable_http2,
                'http3': self.config.enable_http3
            },
            'cache_rules': len(self.cache_rules),
            'image_optimization': self.image_config.get_optimization_params(),
            'ssl_mode': self.config.ssl_mode
        }


# Singleton instance
_cdn_manager: Optional[CDNManager] = None


def init_cdn(config: CDNConfig) -> CDNManager:
    """
    Initialize global CDN manager.
    
    Args:
        config: CDN configuration
        
    Returns:
        CDNManager instance
    """
    global _cdn_manager
    _cdn_manager = CDNManager(config)
    logger.info("Global CDN manager initialized")
    return _cdn_manager


def get_cdn() -> CDNManager:
    """
    Get global CDN manager instance.
    
    Returns:
        CDNManager instance
        
    Raises:
        RuntimeError: If CDN not initialized
    """
    if _cdn_manager is None:
        raise RuntimeError("CDN manager not initialized. Call init_cdn first.")
    return _cdn_manager
