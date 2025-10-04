"""
AI Content Generation API Endpoints

RESTful API for:
- Content generation (posts, captions, hashtags)
- Comment response generation
- Content repurposing
- A/B testing variants
- Provider management and testing

Author: Spirit Tours Development Team
Created: 2025-10-04
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
import logging

from ..database import get_db
from ..services.ai_content_service import AIContentService, get_content_templates
from ..services.ai_providers_base import (
    SocialPlatform,
    ToneStyle,
    ContentType,
    AIProvider,
    get_supported_languages
)

# Import auth dependency (adjust based on your auth setup)
# from ..dependencies import get_current_admin_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI Content Generation"])


# ===== Request/Response Models =====

class GeneratePostRequest(BaseModel):
    """Request model for post generation"""
    prompt: str = Field(..., description="Content prompt/description", min_length=10)
    platform: str = Field(..., description="Target platform")
    language: str = Field(default="en", description="Content language code")
    tone: str = Field(default="friendly", description="Content tone")
    topic: Optional[str] = Field(None, description="Optional topic")
    keywords: Optional[List[str]] = Field(None, description="Optional keywords")
    provider: Optional[str] = Field(None, description="Specific provider to use")
    
    class Config:
        json_schema_extra = {
            "example": {
                "prompt": "Create an engaging post about our upcoming spiritual retreat in Sedona",
                "platform": "instagram",
                "language": "en",
                "tone": "enthusiastic",
                "topic": "Spiritual Retreats",
                "keywords": ["meditation", "wellness", "transformation"],
                "provider": "openai"
            }
        }


class GenerateHashtagsRequest(BaseModel):
    """Request model for hashtag generation"""
    content: str = Field(..., description="Post content", min_length=10)
    platform: str = Field(..., description="Target platform")
    language: str = Field(default="en", description="Content language")
    count: Optional[int] = Field(default=10, ge=1, le=30, description="Number of hashtags")


class GenerateCommentResponseRequest(BaseModel):
    """Request model for comment response generation"""
    comment_text: str = Field(..., description="User's comment", min_length=1)
    platform: str = Field(..., description="Platform where comment was made")
    language: str = Field(default="en", description="Response language")
    sentiment: Optional[str] = Field(None, description="Detected sentiment")


class RepurposeContentRequest(BaseModel):
    """Request model for content repurposing"""
    source_content: str = Field(..., description="Original content", min_length=10)
    source_platform: str = Field(..., description="Original platform")
    target_platforms: List[str] = Field(..., description="Target platforms", min_items=1)
    language: str = Field(default="en", description="Content language")


class GenerateVariantsRequest(BaseModel):
    """Request model for A/B testing variants"""
    prompt: str = Field(..., description="Content prompt", min_length=10)
    platform: str = Field(..., description="Target platform")
    language: str = Field(default="en", description="Content language")
    variant_count: int = Field(default=3, ge=2, le=5, description="Number of variants")


class ContentTemplateRequest(BaseModel):
    """Request model for template-based generation"""
    template_id: str = Field(..., description="Template identifier")
    variables: Dict[str, Any] = Field(..., description="Template variables")
    platforms: Optional[List[str]] = Field(None, description="Target platforms")
    language: str = Field(default="en", description="Content language")


# ===== API Endpoints =====

@router.post("/generate/post")
async def generate_post(
    request: GeneratePostRequest,
    db: AsyncSession = Depends(get_db),
    # current_admin = Depends(get_current_admin_user)  # Uncomment when auth is ready
):
    """
    Generate a social media post using AI
    
    **Features:**
    - Platform-optimized content
    - Multi-language support
    - Customizable tone
    - Automatic hashtag inclusion
    - Smart provider selection
    
    **Supported Platforms:** facebook, instagram, twitter, linkedin, tiktok, youtube
    
    **Supported Languages:** en, es, zh, pt, fr, de
    
    **Supported Tones:** professional, casual, friendly, enthusiastic, inspirational, educational
    """
    try:
        service = AIContentService(db)
        
        result = await service.generate_post(
            prompt=request.prompt,
            platform=request.platform,
            language=request.language,
            tone=request.tone,
            topic=request.topic,
            keywords=request.keywords,
            provider=request.provider,
            # admin_id=current_admin.id  # Uncomment when auth is ready
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Content generation failed")
            )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Generate post endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during content generation"
        )


@router.post("/generate/hashtags")
async def generate_hashtags(
    request: GenerateHashtagsRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate optimized hashtags for content
    
    **Features:**
    - Platform-appropriate hashtag counts
    - Mix of popular and niche hashtags
    - Trend-aware suggestions
    - Multi-language support
    """
    try:
        service = AIContentService(db)
        
        result = await service.generate_hashtags(
            content=request.content,
            platform=request.platform,
            language=request.language,
            count=request.count
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Hashtag generation failed")
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Generate hashtags endpoint error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/generate/comment-response")
async def generate_comment_response(
    request: GenerateCommentResponseRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate AI response to user comments
    
    **Features:**
    - Real-time response generation
    - Sentiment-aware responses
    - Brand voice consistency
    - Multi-language support
    - Fast response times (optimized for speed)
    """
    try:
        service = AIContentService(db)
        
        result = await service.generate_comment_response(
            comment_text=request.comment_text,
            platform=request.platform,
            language=request.language,
            sentiment=request.sentiment
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Response generation failed")
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Generate comment response endpoint error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/repurpose")
async def repurpose_content(
    request: RepurposeContentRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Repurpose content from one platform to multiple others
    
    **Use Case:** Transform a long-form LinkedIn post into Instagram captions,
    Twitter threads, and TikTok scripts automatically.
    
    **Features:**
    - Platform-specific optimization
    - Character limit compliance
    - Style adaptation
    - Hashtag optimization per platform
    """
    try:
        service = AIContentService(db)
        
        result = await service.repurpose_content(
            source_content=request.source_content,
            source_platform=request.source_platform,
            target_platforms=request.target_platforms,
            language=request.language
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Content repurposing failed")
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Repurpose content endpoint error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/generate/variants")
async def generate_ab_variants(
    request: GenerateVariantsRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate multiple variants for A/B testing
    
    **Use Case:** Create 3-5 different versions of the same content
    with varying tones and styles to test which performs best.
    
    **Features:**
    - Multiple tone variations
    - Different creativity levels
    - Same core message
    - Easy A/B testing
    """
    try:
        service = AIContentService(db)
        
        result = await service.generate_ab_variants(
            prompt=request.prompt,
            platform=request.platform,
            language=request.language,
            variant_count=request.variant_count
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Variant generation failed")
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Generate variants endpoint error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/providers")
async def get_available_providers(db: AsyncSession = Depends(get_db)):
    """
    Get list of available AI providers
    
    **Returns:**
    - Provider names
    - Models
    - Language support
    - Cost information
    - Health status
    """
    try:
        service = AIContentService(db)
        result = await service.get_available_providers()
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Failed to get providers")
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Get providers endpoint error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/providers/test")
async def test_all_providers(db: AsyncSession = Depends(get_db)):
    """
    Test connection to all configured AI providers
    
    **Use Case:** Health check to verify all providers are accessible
    and credentials are valid.
    
    **Returns:**
    - Connection status for each provider
    - Error messages if any
    - Overall health percentage
    """
    try:
        service = AIContentService(db)
        result = await service.test_all_providers()
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Provider testing failed")
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Test providers endpoint error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/templates")
async def get_templates():
    """
    Get available content templates
    
    **Use Case:** Pre-defined content templates for common scenarios
    like tour announcements, testimonials, wellness tips, etc.
    
    **Returns:**
    - Template IDs
    - Prompt templates
    - Recommended platforms
    - Default tone
    """
    try:
        templates = get_content_templates()
        
        return {
            "success": True,
            "templates": templates,
            "count": len(templates)
        }
        
    except Exception as e:
        logger.error(f"Get templates endpoint error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/templates/generate")
async def generate_from_template(
    request: ContentTemplateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate content using a predefined template
    
    **Use Case:** Quickly create content for common scenarios using
    templates with variable substitution.
    
    **Example:**
    ```json
    {
      "template_id": "tour_announcement",
      "variables": {
        "destination": "Sedona, Arizona",
        "key_features": "Red rock vortexes, meditation, energy healing",
        "audience": "spiritual seekers"
      },
      "platforms": ["facebook", "instagram"],
      "language": "en"
    }
    ```
    """
    try:
        templates = get_content_templates()
        
        if request.template_id not in templates:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Template '{request.template_id}' not found"
            )
        
        template = templates[request.template_id]
        
        # Build prompt from template
        prompt = template["prompt_template"].format(**request.variables)
        
        # Get platforms (use template default if not specified)
        platforms = request.platforms or template["platforms"]
        
        service = AIContentService(db)
        results = {}
        
        # Generate for each platform
        for platform in platforms:
            result = await service.generate_post(
                prompt=prompt,
                platform=platform,
                language=request.language,
                tone=template["tone"]
            )
            
            if result.get("success"):
                results[platform] = result
        
        return {
            "success": True,
            "template_id": request.template_id,
            "results": results,
            "platforms_count": len(results)
        }
        
    except KeyError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required template variable: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Generate from template endpoint error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/config")
async def get_ai_configuration():
    """
    Get AI content generation configuration
    
    **Returns:**
    - Supported platforms
    - Supported languages
    - Supported tones
    - Content types
    - Available providers
    """
    try:
        return {
            "success": True,
            "config": {
                "platforms": [p.value for p in SocialPlatform],
                "languages": get_supported_languages(),
                "tones": [t.value for t in ToneStyle],
                "content_types": [ct.value for ct in ContentType],
                "providers": [p.value for p in AIProvider]
            }
        }
        
    except Exception as e:
        logger.error(f"Get config endpoint error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ===== Health Check =====

@router.get("/health")
async def health_check():
    """
    Health check endpoint for AI service
    
    **Returns:** Service status and availability
    """
    return {
        "status": "healthy",
        "service": "AI Content Generation",
        "version": "1.0.0",
        "timestamp": "2025-10-04"
    }
