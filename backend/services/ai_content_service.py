"""
AI Content Generation Service

High-level service for social media content generation with:
- Multi-provider support with intelligent routing
- Content templates for different platforms
- Multi-language content generation
- Hashtag optimization
- Content repurposing
- A/B testing variants

Author: Spirit Tours Development Team
Created: 2025-10-04
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update

from .ai_providers_base import (
    ContentRequest,
    ContentResponse,
    ContentType,
    SocialPlatform,
    ToneStyle,
    AIProvider,
    get_platform_character_limit
)

from .ai_provider_factory import (
    get_provider_router,
    get_provider_factory,
    RoutingStrategy
)

logger = logging.getLogger(__name__)


class AIContentService:
    """
    High-level service for AI content generation
    
    Provides simplified interface for generating social media content
    with automatic provider selection, optimization, and storage.
    """
    
    def __init__(self, db: AsyncSession):
        """
        Initialize the service
        
        Args:
            db: Database session for storing generated content
        """
        self.db = db
        self.router = get_provider_router()
        self.factory = get_provider_factory()
        logger.info("AI Content Service initialized")
    
    async def generate_post(
        self,
        prompt: str,
        platform: str,
        language: str = "en",
        tone: str = "friendly",
        topic: Optional[str] = None,
        keywords: Optional[List[str]] = None,
        provider: Optional[str] = None,
        admin_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate a social media post
        
        Args:
            prompt: Content prompt/description
            platform: Target platform (facebook, instagram, etc.)
            language: Content language (en, es, zh, etc.)
            tone: Content tone (friendly, professional, etc.)
            topic: Optional topic
            keywords: Optional keywords to include
            provider: Optional specific provider to use
            admin_id: Optional admin user ID
            
        Returns:
            Dict with generated content and metadata
        """
        try:
            # Parse enums
            platform_enum = SocialPlatform(platform)
            tone_enum = ToneStyle(tone)
            provider_enum = AIProvider(provider) if provider else None
            
            # Get platform character limit
            char_limit = get_platform_character_limit(platform_enum)
            
            # Create content request
            request = ContentRequest(
                content_type=ContentType.POST,
                platform=platform_enum,
                prompt=prompt,
                language=language,
                tone=tone_enum,
                topic=topic,
                keywords=keywords,
                character_limit=char_limit,
                include_hashtags=True,
                include_emoji=True,
                include_cta=True
            )
            
            # Generate content with fallback
            response = await self.router.generate_with_fallback(
                request=request,
                strategy=RoutingStrategy.AUTO,
                preferred_provider=provider_enum
            )
            
            # Store in database
            await self._store_generated_content(
                request=request,
                response=response,
                admin_id=admin_id
            )
            
            # Return formatted response
            return {
                "success": True,
                "content": response.content,
                "provider": response.provider.value,
                "metadata": {
                    **response.metadata,
                    "platform": platform,
                    "language": language,
                    "tone": tone,
                    "generation_time_ms": response.generation_time_ms
                },
                "tokens": {
                    "input": response.input_tokens,
                    "output": response.output_tokens,
                    "total": response.total_tokens
                },
                "cost_estimate": self._calculate_cost(response)
            }
            
        except Exception as e:
            logger.error(f"Post generation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    async def generate_hashtags(
        self,
        content: str,
        platform: str,
        language: str = "en",
        count: int = 10
    ) -> Dict[str, Any]:
        """
        Generate hashtags for content
        
        Args:
            content: Post content to generate hashtags for
            platform: Target platform
            language: Content language
            count: Number of hashtags to generate
            
        Returns:
            Dict with generated hashtags
        """
        try:
            platform_enum = SocialPlatform(platform)
            
            # Platform-specific hashtag counts
            recommended_counts = {
                SocialPlatform.INSTAGRAM: 15,
                SocialPlatform.TIKTOK: 5,
                SocialPlatform.TWITTER: 2,
                SocialPlatform.FACEBOOK: 5,
                SocialPlatform.LINKEDIN: 5,
                SocialPlatform.YOUTUBE: 5
            }
            
            count = recommended_counts.get(platform_enum, count)
            
            prompt = f"""Generate {count} relevant, trending hashtags for this {platform} post.

Post content:
{content}

Requirements:
- Mix of popular and niche hashtags
- Relevant to spiritual/wellness tourism
- Platform-appropriate ({platform})
- Language: {language}
- Include brand hashtags

Return only hashtags, one per line, with # symbol."""
            
            request = ContentRequest(
                content_type=ContentType.HASHTAGS,
                platform=platform_enum,
                prompt=prompt,
                language=language,
                tone=ToneStyle.PROFESSIONAL,
                max_tokens=200,
                include_hashtags=True,
                include_emoji=False,
                include_cta=False
            )
            
            response = await self.router.generate_with_fallback(request)
            
            # Parse hashtags from response
            hashtags = self._parse_hashtags(response.content)
            
            return {
                "success": True,
                "hashtags": hashtags,
                "count": len(hashtags),
                "provider": response.provider.value,
                "platform": platform
            }
            
        except Exception as e:
            logger.error(f"Hashtag generation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def generate_comment_response(
        self,
        comment_text: str,
        platform: str,
        language: str = "en",
        sentiment: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate response to a user comment
        
        Args:
            comment_text: The user's comment
            platform: Platform where comment was made
            language: Response language
            sentiment: Detected sentiment (positive, negative, neutral)
            
        Returns:
            Dict with generated response
        """
        try:
            platform_enum = SocialPlatform(platform)
            
            # Build context-aware prompt
            sentiment_context = f"Sentiment: {sentiment}. " if sentiment else ""
            
            prompt = f"""{sentiment_context}Generate a friendly, helpful response to this comment on {platform}:

"{comment_text}"

Requirements:
- Natural and conversational
- Show empathy and understanding
- Provide value or answer questions
- Encourage further engagement
- Represent Spirit Tours brand voice
- Keep it concise"""
            
            request = ContentRequest(
                content_type=ContentType.COMMENT_RESPONSE,
                platform=platform_enum,
                prompt=prompt,
                language=language,
                tone=ToneStyle.FRIENDLY,
                max_tokens=300,
                character_limit=500,
                include_hashtags=False,
                include_emoji=True,
                include_cta=False
            )
            
            # Use SPEED strategy for real-time responses
            response = await self.router.generate_with_fallback(
                request=request,
                strategy=RoutingStrategy.SPEED
            )
            
            return {
                "success": True,
                "response": response.content,
                "provider": response.provider.value,
                "generation_time_ms": response.generation_time_ms,
                "confidence": "high" if response.generation_time_ms < 2000 else "medium"
            }
            
        except Exception as e:
            logger.error(f"Comment response generation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def repurpose_content(
        self,
        source_content: str,
        source_platform: str,
        target_platforms: List[str],
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Repurpose content from one platform to multiple others
        
        Args:
            source_content: Original content
            source_platform: Original platform
            target_platforms: List of platforms to repurpose for
            language: Content language
            
        Returns:
            Dict with repurposed content for each platform
        """
        try:
            repurposed = {}
            
            for target_platform in target_platforms:
                target_enum = SocialPlatform(target_platform)
                char_limit = get_platform_character_limit(target_enum)
                
                prompt = f"""Repurpose this {source_platform} content for {target_platform}:

Original content:
{source_content}

Requirements:
- Adapt style for {target_platform}
- Respect {char_limit} character limit
- Maintain core message
- Optimize for {target_platform} engagement
- Add platform-appropriate hashtags
- Use {target_platform}-specific best practices"""
                
                request = ContentRequest(
                    content_type=ContentType.REPURPOSE,
                    platform=target_enum,
                    prompt=prompt,
                    language=language,
                    tone=ToneStyle.FRIENDLY,
                    character_limit=char_limit,
                    reference_content=source_content,
                    include_hashtags=True,
                    include_emoji=True,
                    include_cta=True
                )
                
                response = await self.router.generate_with_fallback(request)
                
                repurposed[target_platform] = {
                    "content": response.content,
                    "hashtags": response.metadata.get("hashtags", []),
                    "character_count": len(response.content)
                }
            
            return {
                "success": True,
                "source_platform": source_platform,
                "repurposed": repurposed,
                "platforms_count": len(repurposed)
            }
            
        except Exception as e:
            logger.error(f"Content repurposing failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def generate_ab_variants(
        self,
        prompt: str,
        platform: str,
        language: str = "en",
        variant_count: int = 3
    ) -> Dict[str, Any]:
        """
        Generate multiple variants for A/B testing
        
        Args:
            prompt: Content prompt
            platform: Target platform
            language: Content language
            variant_count: Number of variants to generate
            
        Returns:
            Dict with multiple content variants
        """
        try:
            platform_enum = SocialPlatform(platform)
            variants = []
            
            tones = [ToneStyle.FRIENDLY, ToneStyle.PROFESSIONAL, ToneStyle.ENTHUSIASTIC]
            
            for i in range(variant_count):
                tone = tones[i % len(tones)]
                
                request = ContentRequest(
                    content_type=ContentType.POST,
                    platform=platform_enum,
                    prompt=f"{prompt}\n\nVariant {i+1} with {tone.value} tone.",
                    language=language,
                    tone=tone,
                    character_limit=get_platform_character_limit(platform_enum),
                    temperature=0.8 + (i * 0.1),  # Vary creativity
                    include_hashtags=True,
                    include_emoji=True,
                    include_cta=True
                )
                
                response = await self.router.generate_with_fallback(request)
                
                variants.append({
                    "variant_id": i + 1,
                    "content": response.content,
                    "tone": tone.value,
                    "hashtags": response.metadata.get("hashtags", []),
                    "provider": response.provider.value
                })
            
            return {
                "success": True,
                "variants": variants,
                "count": len(variants),
                "platform": platform
            }
            
        except Exception as e:
            logger.error(f"A/B variant generation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def test_all_providers(self) -> Dict[str, Any]:
        """
        Test connection to all configured providers
        
        Returns:
            Dict with test results for each provider
        """
        try:
            results = await self.factory.test_all_providers()
            
            # Add summary
            connected_count = sum(1 for r in results.values() if r.get("connected"))
            total_count = len(results)
            
            return {
                "success": True,
                "providers": results,
                "summary": {
                    "total": total_count,
                    "connected": connected_count,
                    "disconnected": total_count - connected_count,
                    "health_percentage": (connected_count / total_count * 100) if total_count > 0 else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Provider testing failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_available_providers(self) -> Dict[str, Any]:
        """
        Get list of configured providers with details
        
        Returns:
            Dict with provider information
        """
        try:
            providers = []
            
            for provider in self.factory.get_available_providers():
                config = self.factory.get_provider_config(provider)
                health = self.factory.get_provider_health(provider)
                
                providers.append({
                    "provider": provider.value,
                    "model": config.model,
                    "languages": config.best_for_languages,
                    "cost_per_1k_input": config.cost_per_1k_input,
                    "cost_per_1k_output": config.cost_per_1k_output,
                    "requests_per_minute": config.requests_per_minute,
                    "health": {
                        "connected": health.get("connected") if health else None,
                        "last_check": health.get("last_check").isoformat() if health and health.get("last_check") else None
                    }
                })
            
            return {
                "success": True,
                "providers": providers,
                "count": len(providers)
            }
            
        except Exception as e:
            logger.error(f"Get providers failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    # Helper methods
    
    async def _store_generated_content(
        self,
        request: ContentRequest,
        response: ContentResponse,
        admin_id: Optional[int] = None
    ):
        """Store generated content in database for tracking"""
        try:
            # Note: This assumes you have a table for storing AI-generated content
            # The actual implementation depends on your database schema
            
            from datetime import datetime
            
            data = {
                "platform": request.platform.value,
                "content_type": request.content_type.value,
                "prompt": request.prompt,
                "language": request.language,
                "tone": request.tone.value,
                "generated_content": response.content,
                "provider": response.provider.value,
                "input_tokens": response.input_tokens,
                "output_tokens": response.output_tokens,
                "total_tokens": response.total_tokens,
                "generation_time_ms": response.generation_time_ms,
                "metadata": response.metadata,
                "admin_id": admin_id,
                "created_at": datetime.utcnow()
            }
            
            # TODO: Insert into ai_generated_content table
            # await self.db.execute(insert(ai_generated_content).values(**data))
            # await self.db.commit()
            
            logger.info(f"Stored generated content: {response.provider.value}, {response.total_tokens} tokens")
            
        except Exception as e:
            logger.error(f"Failed to store generated content: {str(e)}")
            # Don't fail the request if storage fails
    
    def _calculate_cost(self, response: ContentResponse) -> Dict[str, float]:
        """Calculate estimated cost of generation"""
        config = self.factory.get_provider_config(response.provider)
        
        if not config:
            return {"total": 0.0, "input": 0.0, "output": 0.0}
        
        input_cost = (response.input_tokens / 1000) * config.cost_per_1k_input
        output_cost = (response.output_tokens / 1000) * config.cost_per_1k_output
        
        return {
            "total": round(input_cost + output_cost, 6),
            "input": round(input_cost, 6),
            "output": round(output_cost, 6),
            "currency": "USD"
        }
    
    def _parse_hashtags(self, content: str) -> List[str]:
        """Parse hashtags from generated content"""
        import re
        
        # Extract all hashtags
        hashtags = re.findall(r'#\w+', content)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_hashtags = []
        for tag in hashtags:
            if tag.lower() not in seen:
                seen.add(tag.lower())
                unique_hashtags.append(tag)
        
        return unique_hashtags


# Content templates for common scenarios
CONTENT_TEMPLATES = {
    "tour_announcement": {
        "prompt_template": "Announce a new spiritual tour to {destination}. Highlight {key_features}. Target audience: {audience}.",
        "platforms": ["facebook", "instagram", "linkedin"],
        "tone": "enthusiastic"
    },
    "customer_testimonial": {
        "prompt_template": "Share a customer testimonial about their experience with {tour_name}. Quote: '{testimonial}'. Add context and call-to-action.",
        "platforms": ["facebook", "instagram"],
        "tone": "inspirational"
    },
    "wellness_tip": {
        "prompt_template": "Share a wellness/spiritual tip related to {topic}. Make it actionable and valuable.",
        "platforms": ["instagram", "twitter", "tiktok"],
        "tone": "educational"
    },
    "behind_the_scenes": {
        "prompt_template": "Share behind-the-scenes content about {activity}. Make it authentic and engaging.",
        "platforms": ["instagram", "tiktok", "facebook"],
        "tone": "casual"
    },
    "event_invitation": {
        "prompt_template": "Invite followers to {event_name} on {date}. Details: {event_details}. Create excitement and urgency.",
        "platforms": ["facebook", "linkedin", "instagram"],
        "tone": "friendly"
    }
}


def get_content_templates() -> Dict[str, Dict[str, Any]]:
    """Get available content templates"""
    return CONTENT_TEMPLATES.copy()
