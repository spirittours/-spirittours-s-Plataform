"""
AI Content Generation - Provider Factory and Intelligent Routing

This module implements:
- Factory pattern for provider instantiation
- Intelligent routing based on content requirements
- Fallback chain for high availability
- Provider health monitoring

Author: Spirit Tours Development Team
Created: 2025-10-04
"""

import os
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum

from .ai_providers_base import (
    AIProvider,
    AIProviderAdapter,
    ProviderConfig,
    ContentRequest,
    ContentResponse,
    SocialPlatform,
    ContentType,
    ProviderError,
    RateLimitError
)

from .ai_provider_adapters import (
    OpenAIAdapter,
    AnthropicAdapter,
    GoogleGeminiAdapter,
    GroqAdapter
)

logger = logging.getLogger(__name__)


class RoutingStrategy(str, Enum):
    """Provider selection strategies"""
    QUALITY = "quality"      # Best quality, higher cost
    SPEED = "speed"          # Fastest response
    COST = "cost"            # Lowest cost
    BALANCED = "balanced"    # Balance of all factors
    AUTO = "auto"            # Intelligent routing based on request


class AIProviderFactory:
    """
    Factory for creating and managing AI provider adapters
    
    Features:
    - Lazy initialization of providers
    - Configuration management
    - Health monitoring
    - Automatic fallback
    """
    
    def __init__(self):
        """Initialize the factory"""
        self._adapters: Dict[AIProvider, AIProviderAdapter] = {}
        self._provider_configs: Dict[AIProvider, ProviderConfig] = {}
        self._provider_health: Dict[AIProvider, Dict[str, Any]] = {}
        self._load_configurations()
        logger.info("AI Provider Factory initialized")
    
    def _load_configurations(self):
        """Load provider configurations from environment variables"""
        
        # OpenAI Configuration
        if os.getenv("OPENAI_API_KEY"):
            self._provider_configs[AIProvider.OPENAI] = ProviderConfig(
                provider=AIProvider.OPENAI,
                api_key=os.getenv("OPENAI_API_KEY"),
                model=os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview"),
                max_tokens=int(os.getenv("OPENAI_MAX_TOKENS", "800")),
                temperature=float(os.getenv("OPENAI_TEMPERATURE", "0.7")),
                requests_per_minute=5000,
                tokens_per_minute=450000,
                supports_multilingual=True,
                best_for_languages=["en", "es", "zh", "pt", "fr", "de"],
                cost_per_1k_input=0.01,
                cost_per_1k_output=0.03
            )
        
        # Anthropic Configuration
        if os.getenv("ANTHROPIC_API_KEY"):
            self._provider_configs[AIProvider.ANTHROPIC] = ProviderConfig(
                provider=AIProvider.ANTHROPIC,
                api_key=os.getenv("ANTHROPIC_API_KEY"),
                model=os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022"),
                max_tokens=int(os.getenv("ANTHROPIC_MAX_TOKENS", "800")),
                temperature=float(os.getenv("ANTHROPIC_TEMPERATURE", "0.7")),
                requests_per_minute=4000,
                tokens_per_minute=400000,
                supports_multilingual=True,
                best_for_languages=["en", "es", "fr"],
                cost_per_1k_input=0.003,
                cost_per_1k_output=0.015
            )
        
        # Google Gemini Configuration
        if os.getenv("GOOGLE_AI_API_KEY"):
            self._provider_configs[AIProvider.GOOGLE] = ProviderConfig(
                provider=AIProvider.GOOGLE,
                api_key=os.getenv("GOOGLE_AI_API_KEY"),
                model=os.getenv("GOOGLE_AI_MODEL", "gemini-pro"),
                max_tokens=int(os.getenv("GOOGLE_AI_MAX_TOKENS", "800")),
                temperature=float(os.getenv("GOOGLE_AI_TEMPERATURE", "0.7")),
                requests_per_minute=15,  # Free tier
                tokens_per_minute=1000000,
                supports_multilingual=True,
                best_for_languages=["en", "es", "zh", "pt", "fr", "de", "ja", "ko"],
                cost_per_1k_input=0.00025,
                cost_per_1k_output=0.0005
            )
        
        # Groq (Meta Llama) Configuration
        if os.getenv("GROQ_API_KEY"):
            self._provider_configs[AIProvider.GROQ] = ProviderConfig(
                provider=AIProvider.GROQ,
                api_key=os.getenv("GROQ_API_KEY"),
                model=os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile"),
                max_tokens=int(os.getenv("GROQ_MAX_TOKENS", "800")),
                temperature=float(os.getenv("GROQ_TEMPERATURE", "0.7")),
                requests_per_minute=30,  # Free tier
                tokens_per_minute=30000,
                supports_multilingual=True,
                best_for_languages=["en", "es"],
                cost_per_1k_input=0.00059,
                cost_per_1k_output=0.00079
            )
        
        logger.info(f"Loaded configurations for {len(self._provider_configs)} providers")
    
    def get_adapter(self, provider: AIProvider) -> AIProviderAdapter:
        """
        Get or create an adapter for the specified provider
        
        Args:
            provider: The AI provider to get
            
        Returns:
            Configured AIProviderAdapter instance
            
        Raises:
            ValueError: If provider not configured
        """
        if provider not in self._provider_configs:
            raise ValueError(f"Provider {provider.value} not configured. Check environment variables.")
        
        # Return existing adapter if available
        if provider in self._adapters:
            return self._adapters[provider]
        
        # Create new adapter
        config = self._provider_configs[provider]
        
        adapter_classes = {
            AIProvider.OPENAI: OpenAIAdapter,
            AIProvider.ANTHROPIC: AnthropicAdapter,
            AIProvider.GOOGLE: GoogleGeminiAdapter,
            AIProvider.GROQ: GroqAdapter
        }
        
        adapter_class = adapter_classes.get(provider)
        if not adapter_class:
            raise ValueError(f"No adapter implementation for {provider.value}")
        
        adapter = adapter_class(config)
        self._adapters[provider] = adapter
        
        logger.info(f"Created new adapter for {provider.value}")
        return adapter
    
    def get_available_providers(self) -> List[AIProvider]:
        """Get list of configured providers"""
        return list(self._provider_configs.keys())
    
    def get_provider_config(self, provider: AIProvider) -> Optional[ProviderConfig]:
        """Get configuration for a specific provider"""
        return self._provider_configs.get(provider)
    
    async def test_all_providers(self) -> Dict[str, Any]:
        """Test connection to all configured providers"""
        results = {}
        
        for provider in self.get_available_providers():
            try:
                adapter = self.get_adapter(provider)
                test_result = await adapter.test_connection()
                results[provider.value] = test_result
                
                # Update health status
                self._provider_health[provider] = {
                    "connected": test_result.get("connected", False),
                    "last_check": datetime.utcnow(),
                    "error": test_result.get("error")
                }
                
            except Exception as e:
                logger.error(f"Error testing {provider.value}: {str(e)}")
                results[provider.value] = {
                    "connected": False,
                    "provider": provider.value,
                    "error": str(e)
                }
        
        return results
    
    def get_provider_health(self, provider: AIProvider) -> Optional[Dict[str, Any]]:
        """Get health status for a specific provider"""
        return self._provider_health.get(provider)


class AIProviderRouter:
    """
    Intelligent router for selecting optimal AI provider
    
    Features:
    - Content-aware routing
    - Language-based selection
    - Cost optimization
    - Automatic fallback
    """
    
    def __init__(self, factory: AIProviderFactory):
        """
        Initialize the router
        
        Args:
            factory: AIProviderFactory instance
        """
        self.factory = factory
        self._fallback_chains = self._build_fallback_chains()
        logger.info("AI Provider Router initialized")
    
    def _build_fallback_chains(self) -> Dict[RoutingStrategy, List[AIProvider]]:
        """Build fallback chains for different routing strategies"""
        available = self.factory.get_available_providers()
        
        chains = {
            RoutingStrategy.QUALITY: [
                AIProvider.OPENAI,
                AIProvider.ANTHROPIC,
                AIProvider.GOOGLE,
                AIProvider.GROQ
            ],
            RoutingStrategy.SPEED: [
                AIProvider.GROQ,
                AIProvider.GOOGLE,
                AIProvider.OPENAI,
                AIProvider.ANTHROPIC
            ],
            RoutingStrategy.COST: [
                AIProvider.GOOGLE,
                AIProvider.GROQ,
                AIProvider.ANTHROPIC,
                AIProvider.OPENAI
            ],
            RoutingStrategy.BALANCED: [
                AIProvider.GOOGLE,
                AIProvider.OPENAI,
                AIProvider.ANTHROPIC,
                AIProvider.GROQ
            ]
        }
        
        # Filter to only include available providers
        filtered_chains = {}
        for strategy, chain in chains.items():
            filtered_chains[strategy] = [p for p in chain if p in available]
        
        return filtered_chains
    
    def select_provider(
        self,
        request: ContentRequest,
        strategy: RoutingStrategy = RoutingStrategy.AUTO,
        preferred_provider: Optional[AIProvider] = None
    ) -> AIProvider:
        """
        Select the optimal provider based on request and strategy
        
        Args:
            request: Content generation request
            strategy: Routing strategy to use
            preferred_provider: Optional preferred provider (overrides routing)
            
        Returns:
            Selected AIProvider
            
        Raises:
            ValueError: If no providers available
        """
        available = self.factory.get_available_providers()
        
        if not available:
            raise ValueError("No AI providers configured")
        
        # If preferred provider specified and available, use it
        if preferred_provider and preferred_provider in available:
            return preferred_provider
        
        # Auto strategy: intelligent routing based on request
        if strategy == RoutingStrategy.AUTO:
            strategy = self._determine_strategy(request)
        
        # Get fallback chain for strategy
        chain = self._fallback_chains.get(strategy, available)
        
        # Filter by language if specific language requirements
        if request.language and request.language != "en":
            chain = self._filter_by_language(chain, request.language)
        
        # Return first available provider from chain
        if chain:
            selected = chain[0]
            logger.info(f"Selected provider: {selected.value} (strategy: {strategy.value})")
            return selected
        
        # Fallback to any available provider
        return available[0]
    
    def _determine_strategy(self, request: ContentRequest) -> RoutingStrategy:
        """
        Determine optimal strategy based on request characteristics
        
        Args:
            request: Content generation request
            
        Returns:
            Recommended RoutingStrategy
        """
        # Real-time content (comment responses) = SPEED
        if request.content_type == ContentType.COMMENT_RESPONSE:
            return RoutingStrategy.SPEED
        
        # High-value content (LinkedIn, YouTube) = QUALITY
        if request.platform in [SocialPlatform.LINKEDIN, SocialPlatform.YOUTUBE]:
            return RoutingStrategy.QUALITY
        
        # Short-form content (Twitter, TikTok) = COST
        if request.platform in [SocialPlatform.TWITTER, SocialPlatform.TIKTOK]:
            return RoutingStrategy.COST
        
        # Default: balanced
        return RoutingStrategy.BALANCED
    
    def _filter_by_language(
        self,
        providers: List[AIProvider],
        language: str
    ) -> List[AIProvider]:
        """
        Filter providers by language capability
        
        Args:
            providers: List of providers to filter
            language: ISO language code
            
        Returns:
            Filtered list of providers
        """
        filtered = []
        
        for provider in providers:
            config = self.factory.get_provider_config(provider)
            if config and language in config.best_for_languages:
                filtered.append(provider)
        
        # If no providers support the language, return original list
        return filtered if filtered else providers
    
    async def generate_with_fallback(
        self,
        request: ContentRequest,
        strategy: RoutingStrategy = RoutingStrategy.AUTO,
        preferred_provider: Optional[AIProvider] = None
    ) -> ContentResponse:
        """
        Generate content with automatic fallback on failure
        
        Args:
            request: Content generation request
            strategy: Routing strategy
            preferred_provider: Optional preferred provider
            
        Returns:
            ContentResponse from first successful provider
            
        Raises:
            ProviderError: If all providers fail
        """
        # Get fallback chain
        if strategy == RoutingStrategy.AUTO:
            strategy = self._determine_strategy(request)
        
        chain = self._fallback_chains.get(strategy, self.factory.get_available_providers())
        
        # If preferred provider specified, put it first
        if preferred_provider and preferred_provider in chain:
            chain = [preferred_provider] + [p for p in chain if p != preferred_provider]
        
        last_error = None
        
        # Try each provider in chain
        for provider in chain:
            try:
                logger.info(f"Attempting content generation with {provider.value}")
                adapter = self.factory.get_adapter(provider)
                response = await adapter.generate_content(request)
                logger.info(f"Successfully generated content with {provider.value}")
                return response
                
            except RateLimitError as e:
                logger.warning(f"{provider.value} rate limit exceeded, trying next provider")
                last_error = e
                continue
                
            except Exception as e:
                logger.error(f"{provider.value} failed: {str(e)}, trying next provider")
                last_error = e
                continue
        
        # All providers failed
        error_msg = f"All providers failed. Last error: {str(last_error)}"
        logger.error(error_msg)
        raise ProviderError(error_msg)
    
    def get_fallback_chain(self, strategy: RoutingStrategy) -> List[AIProvider]:
        """Get the fallback chain for a strategy"""
        return self._fallback_chains.get(strategy, [])


# Global factory and router instances
_factory: Optional[AIProviderFactory] = None
_router: Optional[AIProviderRouter] = None


def get_provider_factory() -> AIProviderFactory:
    """Get or create the global provider factory"""
    global _factory
    if _factory is None:
        _factory = AIProviderFactory()
    return _factory


def get_provider_router() -> AIProviderRouter:
    """Get or create the global provider router"""
    global _router
    if _router is None:
        factory = get_provider_factory()
        _router = AIProviderRouter(factory)
    return _router


def reset_factory():
    """Reset factory and router (useful for testing)"""
    global _factory, _router
    _factory = None
    _router = None
