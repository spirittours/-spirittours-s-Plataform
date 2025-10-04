"""
AI Content Generation - Multi-Provider Base Architecture

This module defines the abstract base class and common interfaces for all AI providers.
Supports OpenAI GPT-4, Anthropic Claude, Google Gemini, Meta Llama, Mistral, and Qwen.

Design Patterns:
- Abstract Factory Pattern: For provider instantiation
- Strategy Pattern: For provider selection
- Template Method Pattern: For content generation workflow

Author: Spirit Tours Development Team
Created: 2025-10-04
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class AIProvider(str, Enum):
    """Supported AI providers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    GROQ = "groq"          # Meta Llama via Groq
    MISTRAL = "mistral"
    TOGETHER = "together"  # Qwen via Together AI
    

class ContentType(str, Enum):
    """Types of content that can be generated"""
    POST = "post"
    CAPTION = "caption"
    HASHTAGS = "hashtags"
    COMMENT_RESPONSE = "comment_response"
    THREAD = "thread"
    VIDEO_SCRIPT = "video_script"
    REPURPOSE = "repurpose"


class ToneStyle(str, Enum):
    """Tone/style for content generation"""
    PROFESSIONAL = "professional"
    CASUAL = "casual"
    FRIENDLY = "friendly"
    ENTHUSIASTIC = "enthusiastic"
    INSPIRATIONAL = "inspirational"
    EDUCATIONAL = "educational"
    HUMOROUS = "humorous"
    STORYTELLING = "storytelling"


class SocialPlatform(str, Enum):
    """Social media platforms"""
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    TWITTER = "twitter"
    LINKEDIN = "linkedin"
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"


@dataclass
class ContentRequest:
    """
    Unified content generation request structure
    """
    content_type: ContentType
    platform: SocialPlatform
    prompt: str
    language: str = "en"
    tone: ToneStyle = ToneStyle.FRIENDLY
    max_tokens: int = 800
    temperature: float = 0.7
    
    # Optional context
    topic: Optional[str] = None
    target_audience: Optional[str] = None
    keywords: Optional[List[str]] = None
    reference_content: Optional[str] = None
    
    # Platform-specific constraints
    character_limit: Optional[int] = None
    include_hashtags: bool = True
    include_emoji: bool = True
    include_cta: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for logging/storage"""
        return {
            "content_type": self.content_type.value,
            "platform": self.platform.value,
            "prompt": self.prompt,
            "language": self.language,
            "tone": self.tone.value,
            "max_tokens": self.max_tokens,
            "temperature": self.temperature,
            "topic": self.topic,
            "target_audience": self.target_audience,
            "keywords": self.keywords,
            "character_limit": self.character_limit,
            "include_hashtags": self.include_hashtags,
            "include_emoji": self.include_emoji,
            "include_cta": self.include_cta
        }


@dataclass
class ContentResponse:
    """
    Unified content generation response structure
    """
    provider: AIProvider
    content: str
    metadata: Dict[str, Any]
    
    # Token usage
    input_tokens: int
    output_tokens: int
    total_tokens: int
    
    # Quality metrics
    confidence_score: Optional[float] = None
    
    # Alternate versions (for A/B testing)
    alternatives: Optional[List[str]] = None
    
    # Timestamps
    generation_time_ms: Optional[int] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response"""
        return {
            "provider": self.provider.value,
            "content": self.content,
            "metadata": self.metadata,
            "tokens": {
                "input": self.input_tokens,
                "output": self.output_tokens,
                "total": self.total_tokens
            },
            "confidence_score": self.confidence_score,
            "alternatives": self.alternatives,
            "generation_time_ms": self.generation_time_ms
        }


@dataclass
class ProviderConfig:
    """
    Configuration for an AI provider
    """
    provider: AIProvider
    api_key: str
    model: str
    max_tokens: int = 800
    temperature: float = 0.7
    
    # Rate limiting
    requests_per_minute: int = 60
    tokens_per_minute: int = 90000
    
    # Retry configuration
    max_retries: int = 3
    retry_delay_seconds: int = 2
    
    # Capabilities
    supports_multilingual: bool = True
    supports_streaming: bool = False
    best_for_languages: List[str] = None
    
    # Cost (per 1K tokens)
    cost_per_1k_input: float = 0.0
    cost_per_1k_output: float = 0.0
    
    def __post_init__(self):
        """Initialize default values"""
        if self.best_for_languages is None:
            self.best_for_languages = ["en"]


class AIProviderAdapter(ABC):
    """
    Abstract base class for all AI provider adapters
    
    This class defines the interface that all provider-specific adapters must implement.
    Each adapter handles the specifics of communicating with a particular AI service.
    """
    
    def __init__(self, config: ProviderConfig):
        """
        Initialize the adapter with provider-specific configuration
        
        Args:
            config: ProviderConfig object with API keys and settings
        """
        self.config = config
        self.provider = config.provider
        self._initialize_client()
    
    @abstractmethod
    def _initialize_client(self):
        """
        Initialize the provider-specific HTTP client or SDK
        
        This method should set up authentication, headers, and any
        provider-specific configuration needed for API calls.
        """
        pass
    
    @abstractmethod
    async def generate_content(self, request: ContentRequest) -> ContentResponse:
        """
        Generate content using the provider's API
        
        Args:
            request: ContentRequest object with generation parameters
            
        Returns:
            ContentResponse object with generated content and metadata
            
        Raises:
            ProviderError: If generation fails
            RateLimitError: If rate limit exceeded
        """
        pass
    
    @abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        """
        Test the connection to the provider's API
        
        Returns:
            Dict with connection status and provider information:
            {
                "connected": bool,
                "provider": str,
                "model": str,
                "error": Optional[str]
            }
        """
        pass
    
    def _build_system_prompt(self, request: ContentRequest) -> str:
        """
        Build the system prompt based on request parameters
        
        This method constructs a detailed system prompt that guides the AI
        to generate content that matches the platform, tone, and requirements.
        
        Args:
            request: ContentRequest object
            
        Returns:
            System prompt string
        """
        platform_guidelines = self._get_platform_guidelines(request.platform)
        tone_instructions = self._get_tone_instructions(request.tone)
        language_instruction = self._get_language_instruction(request.language)
        
        system_prompt = f"""You are an expert social media content creator for Spirit Tours, 
a company specializing in spiritual and wellness tourism experiences.

{language_instruction}

PLATFORM: {request.platform.value.upper()}
{platform_guidelines}

TONE: {request.tone.value}
{tone_instructions}

CONTENT TYPE: {request.content_type.value}

REQUIREMENTS:
- Target audience: {request.target_audience or 'General spiritual/wellness seekers'}
- Character limit: {request.character_limit or 'Platform appropriate'}
- Include hashtags: {'Yes' if request.include_hashtags else 'No'}
- Include emojis: {'Yes' if request.include_emoji else 'No'}
- Include CTA: {'Yes' if request.include_cta else 'No'}

BRAND VOICE:
- Authentic and inspiring
- Focuses on transformation and personal growth
- Emphasizes community and connection
- Celebrates diverse spiritual traditions
- Professional yet warm and welcoming

Generate content that is engaging, authentic, and optimized for the platform."""

        return system_prompt
    
    def _get_platform_guidelines(self, platform: SocialPlatform) -> str:
        """Get platform-specific content guidelines"""
        guidelines = {
            SocialPlatform.FACEBOOK: """
- Optimal length: 400-500 characters
- Use conversational tone
- Ask questions to encourage engagement
- Use 3-5 relevant hashtags
- Include call-to-action
- Visual content descriptions welcome
""",
            SocialPlatform.INSTAGRAM: """
- First 125 characters are crucial (preview)
- Use line breaks for readability
- 10-15 hashtags recommended
- Emojis enhance engagement
- Tell a story or share value
- Strong call-to-action in caption
""",
            SocialPlatform.TWITTER: """
- Maximum 280 characters
- Front-load key message
- Use 1-2 hashtags maximum
- Concise and punchy
- One clear call-to-action
- Thread-friendly if needed
""",
            SocialPlatform.LINKEDIN: """
- Professional yet personable
- 1,300 characters ideal
- Use bullet points or paragraphs
- Industry insights and value
- 3-5 professional hashtags
- Thought leadership angle
""",
            SocialPlatform.TIKTOK: """
- Hook in first 3 seconds
- 150 characters max for caption
- Trending sounds/hashtags
- Call-to-action at end
- Energetic and authentic
- Entertainment + value
""",
            SocialPlatform.YOUTUBE: """
- Compelling first paragraph
- Timestamps for video sections
- 3-5 relevant hashtags
- Links in description
- SEO-optimized
- Clear call-to-action
"""
        }
        return guidelines.get(platform, "")
    
    def _get_tone_instructions(self, tone: ToneStyle) -> str:
        """Get tone-specific writing instructions"""
        instructions = {
            ToneStyle.PROFESSIONAL: "Maintain professionalism while being warm. Use industry terminology appropriately.",
            ToneStyle.CASUAL: "Write conversationally as if talking to a friend. Keep it relaxed and approachable.",
            ToneStyle.FRIENDLY: "Be warm, welcoming, and personable. Show genuine care and interest.",
            ToneStyle.ENTHUSIASTIC: "Show excitement and passion! Use energetic language and exclamation points.",
            ToneStyle.INSPIRATIONAL: "Uplift and motivate. Share wisdom and encourage transformation.",
            ToneStyle.EDUCATIONAL: "Teach and inform. Provide valuable insights and actionable information.",
            ToneStyle.HUMOROUS: "Be witty and entertaining. Use appropriate humor to engage.",
            ToneStyle.STORYTELLING: "Narrate compellingly. Create emotional connection through story."
        }
        return instructions.get(tone, "")
    
    def _get_language_instruction(self, language: str) -> str:
        """Get language-specific instructions"""
        language_map = {
            "en": "Generate content in English.",
            "es": "Genera el contenido en español. Usa lenguaje natural y culturalmente apropiado.",
            "zh": "用中文生成内容。使用自然且符合文化背景的语言。",
            "pt": "Gere o conteúdo em português. Use linguagem natural e culturalmente apropriada.",
            "fr": "Générez le contenu en français. Utilisez un langage naturel et culturellement approprié.",
            "de": "Erstellen Sie den Inhalt auf Deutsch. Verwenden Sie eine natürliche und kulturell angemessene Sprache."
        }
        return language_map.get(language, f"Generate content in {language}.")
    
    def _extract_hashtags(self, content: str) -> List[str]:
        """Extract hashtags from generated content"""
        import re
        hashtags = re.findall(r'#\w+', content)
        return hashtags
    
    def _count_tokens_estimate(self, text: str) -> int:
        """
        Estimate token count (rough approximation)
        1 token ≈ 4 characters for English
        """
        return len(text) // 4
    
    def _validate_character_limit(self, content: str, limit: int) -> bool:
        """Check if content meets character limit"""
        return len(content) <= limit if limit else True


class ProviderError(Exception):
    """Base exception for provider-related errors"""
    pass


class RateLimitError(ProviderError):
    """Raised when provider rate limit is exceeded"""
    pass


class AuthenticationError(ProviderError):
    """Raised when authentication fails"""
    pass


class ContentGenerationError(ProviderError):
    """Raised when content generation fails"""
    pass


class ProviderUnavailableError(ProviderError):
    """Raised when provider service is unavailable"""
    pass


# Platform character limits (for reference)
PLATFORM_LIMITS = {
    SocialPlatform.FACEBOOK: 63206,  # Practical limit ~400-500
    SocialPlatform.INSTAGRAM: 2200,
    SocialPlatform.TWITTER: 280,
    SocialPlatform.LINKEDIN: 3000,   # Practical limit ~1300
    SocialPlatform.TIKTOK: 150,
    SocialPlatform.YOUTUBE: 5000
}


def get_platform_character_limit(platform: SocialPlatform) -> int:
    """Get the character limit for a specific platform"""
    return PLATFORM_LIMITS.get(platform, 1000)


# Language codes supported
SUPPORTED_LANGUAGES = {
    "en": "English",
    "es": "Spanish",
    "zh": "Chinese",
    "pt": "Portuguese",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic"
}


def get_supported_languages() -> Dict[str, str]:
    """Get dictionary of supported language codes and names"""
    return SUPPORTED_LANGUAGES.copy()
