"""
Multi-Religious Perspective Service for Virtual Guide
Handles content generation and delivery based on user's religious perspective
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload

from ..virtual_guide.models_enhanced import (
    UserPreferences, PerspectiveContent, ContentTranslation,
    TouristDestination, AudioGuide, PerspectiveChangeLog,
    ReligiousPerspective, SupportedLanguage, ContentType,
    VoiceGender, ContentDetailLevel, ContentInteraction
)
from ..ai_integration.content_generator import AIContentGenerator
from ..services.translation_service import TranslationService
from ..services.tts_service import TextToSpeechService
from ..cache.redis_cache import RedisCache

logger = logging.getLogger(__name__)

class PerspectiveService:
    """Service for managing multi-religious perspective content"""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
        self.ai_generator = AIContentGenerator()
        self.translator = TranslationService()
        self.tts_service = TextToSpeechService()
        self.cache = RedisCache()
        
        # Perspective templates for content generation
        self.perspective_templates = {
            ReligiousPerspective.CATHOLIC: {
                "focus": "Catholic traditions, saints, papal history, sacraments",
                "tone": "reverential, traditional, emphasizing Church teachings",
                "references": "Catholic Bible, Catechism, papal documents",
                "practices": "Mass, rosary, pilgrimages, veneration of saints"
            },
            ReligiousPerspective.PROTESTANT: {
                "focus": "Scripture, personal relationship with Jesus, grace through faith",
                "tone": "personal, evangelical, Bible-centered",
                "references": "Protestant Bible, reformation history",
                "practices": "Bible study, prayer, worship services"
            },
            ReligiousPerspective.ORTHODOX: {
                "focus": "Ancient traditions, icons, mysticism, theosis",
                "tone": "mystical, traditional, liturgical",
                "references": "Orthodox Bible, Church Fathers, liturgy",
                "practices": "Divine Liturgy, veneration of icons, fasting"
            },
            ReligiousPerspective.JEWISH: {
                "focus": "Torah, Talmud, Jewish history, covenant",
                "tone": "scholarly, traditional, emphasizing Jewish heritage",
                "references": "Torah, Tanakh, Talmud, Midrash",
                "practices": "Shabbat, kosher laws, prayer services, festivals"
            },
            ReligiousPerspective.ISLAMIC: {
                "focus": "Quran, Prophet Muhammad, Five Pillars, Ummah",
                "tone": "respectful, emphasizing submission to Allah",
                "references": "Quran, Hadith, Sunnah",
                "practices": "Salah, Ramadan, Hajj, Zakat"
            },
            ReligiousPerspective.HINDU: {
                "focus": "Dharma, karma, multiple deities, spiritual liberation",
                "tone": "philosophical, devotional, emphasizing cosmic order",
                "references": "Vedas, Upanishads, Bhagavad Gita",
                "practices": "Puja, meditation, yoga, festivals"
            },
            ReligiousPerspective.BUDDHIST: {
                "focus": "Four Noble Truths, Eightfold Path, enlightenment",
                "tone": "contemplative, peaceful, emphasizing mindfulness",
                "references": "Tripitaka, sutras, Buddhist texts",
                "practices": "Meditation, mindfulness, compassion practices"
            },
            ReligiousPerspective.NEUTRAL: {
                "focus": "Historical facts, cultural significance, architecture",
                "tone": "objective, educational, culturally sensitive",
                "references": "Historical documents, archaeological findings",
                "practices": "General visitor guidelines"
            },
            ReligiousPerspective.ACADEMIC: {
                "focus": "Scholarly analysis, comparative religion, archaeology",
                "tone": "analytical, evidence-based, multi-perspective",
                "references": "Academic journals, research papers, excavations",
                "practices": "Research methodologies, critical analysis"
            }
        }
    
    async def get_or_create_user_preferences(
        self,
        user_id: str,
        initial_perspective: Optional[ReligiousPerspective] = None,
        initial_language: Optional[SupportedLanguage] = None
    ) -> UserPreferences:
        """Get or create user preferences with initial settings"""
        
        # Check cache first
        cache_key = f"user_prefs:{user_id}"
        cached_prefs = await self.cache.get(cache_key)
        if cached_prefs:
            return UserPreferences(**json.loads(cached_prefs))
        
        # Query database
        query = select(UserPreferences).where(UserPreferences.user_id == user_id)
        result = await self.db.execute(query)
        prefs = result.scalar_one_or_none()
        
        if not prefs:
            # Create new preferences
            prefs = UserPreferences(
                user_id=user_id,
                religious_perspective=initial_perspective or ReligiousPerspective.NEUTRAL,
                primary_language=initial_language or SupportedLanguage.EN_US,
                created_at=datetime.utcnow()
            )
            self.db.add(prefs)
            await self.db.commit()
            await self.db.refresh(prefs)
        
        # Cache preferences
        await self.cache.setex(
            cache_key,
            3600,  # 1 hour
            json.dumps(prefs.__dict__, default=str)
        )
        
        return prefs
    
    async def change_perspective(
        self,
        user_id: str,
        new_perspective: ReligiousPerspective,
        destination_id: Optional[int] = None,
        reason: Optional[str] = None,
        location: Optional[Tuple[float, float]] = None
    ) -> Dict[str, Any]:
        """Change user's religious perspective with logging"""
        
        # Get current preferences
        prefs = await self.get_or_create_user_preferences(user_id)
        old_perspective = prefs.religious_perspective
        
        # Log the change
        change_log = PerspectiveChangeLog(
            user_preference_id=prefs.id,
            from_perspective=old_perspective,
            to_perspective=new_perspective,
            destination_id=destination_id,
            trigger="manual",
            reason=reason,
            changed_at=datetime.utcnow()
        )
        
        if location:
            change_log.latitude = location[0]
            change_log.longitude = location[1]
        
        self.db.add(change_log)
        
        # Update preferences
        prefs.religious_perspective = new_perspective
        prefs.last_perspective_change = datetime.utcnow()
        
        await self.db.commit()
        
        # Clear cache
        await self.cache.delete(f"user_prefs:{user_id}")
        
        # Get suggested content for new perspective
        suggested_content = None
        if destination_id:
            suggested_content = await self.get_perspective_content(
                destination_id,
                new_perspective,
                prefs.primary_language
            )
        
        return {
            "success": True,
            "previous_perspective": old_perspective.value,
            "new_perspective": new_perspective.value,
            "changed_at": change_log.changed_at.isoformat(),
            "suggested_content": suggested_content
        }
    
    async def get_perspective_content(
        self,
        destination_id: int,
        perspective: ReligiousPerspective,
        language: SupportedLanguage,
        detail_level: Optional[ContentDetailLevel] = None,
        include_audio: bool = True
    ) -> Dict[str, Any]:
        """Get content for a destination from a specific religious perspective"""
        
        # Check cache
        cache_key = f"perspective_content:{destination_id}:{perspective.value}:{language.value}"
        cached_content = await self.cache.get(cache_key)
        if cached_content:
            return json.loads(cached_content)
        
        # Query database for existing content
        query = select(PerspectiveContent).where(
            and_(
                PerspectiveContent.destination_id == destination_id,
                PerspectiveContent.perspective == perspective,
                PerspectiveContent.language == language
            )
        ).options(selectinload(PerspectiveContent.audio_guide))
        
        result = await self.db.execute(query)
        content = result.scalar_one_or_none()
        
        if not content:
            # Generate content using AI
            content = await self.generate_perspective_content(
                destination_id, perspective, language, detail_level
            )
        
        # Prepare response
        response = {
            "destination_id": destination_id,
            "perspective": perspective.value,
            "language": language.value,
            "title": content.title,
            "subtitle": content.subtitle,
            "introduction": content.introduction,
            "main_content": content.main_content,
            "conclusion": content.conclusion,
            "significance": content.significance,
            "religious_importance": content.religious_importance,
            "holy_texts_references": content.holy_texts_references,
            "prayers_meditations": content.prayers_meditations,
            "behavior_guidelines": content.behavior_guidelines,
            "dress_code": content.dress_code_perspective,
            "sacred_times": content.sacred_times,
            "images": content.images,
            "videos": content.videos
        }
        
        # Add audio guide if available and requested
        if include_audio and content.audio_guide:
            response["audio_guide"] = {
                "url": content.audio_guide.audio_url,
                "duration": content.audio_guide.duration_seconds,
                "chapters": content.audio_guide.chapters,
                "voice_gender": content.audio_guide.voice_gender.value
            }
        elif include_audio:
            # Generate audio on demand
            audio_url = await self.generate_audio_guide(content)
            response["audio_guide"] = {
                "url": audio_url,
                "duration": len(content.main_content) // 15,  # Rough estimate
                "generated": True
            }
        
        # Track interaction
        await self.track_content_interaction(
            user_id=None,  # Will be filled by caller
            destination_id=destination_id,
            perspective_content_id=content.id,
            interaction_type="view",
            perspective=perspective,
            language=language
        )
        
        # Cache for 1 hour
        await self.cache.setex(cache_key, 3600, json.dumps(response))
        
        return response
    
    async def generate_perspective_content(
        self,
        destination_id: int,
        perspective: ReligiousPerspective,
        language: SupportedLanguage,
        detail_level: Optional[ContentDetailLevel] = None
    ) -> PerspectiveContent:
        """Generate perspective-specific content using AI"""
        
        # Get destination info
        query = select(TouristDestination).where(TouristDestination.id == destination_id)
        result = await self.db.execute(query)
        destination = result.scalar_one()
        
        # Get perspective template
        template = self.perspective_templates.get(
            perspective,
            self.perspective_templates[ReligiousPerspective.NEUTRAL]
        )
        
        # Create prompt for AI
        prompt = self._create_perspective_prompt(
            destination, perspective, template, language, detail_level
        )
        
        # Generate content
        ai_response = await self.ai_generator.generate_content(prompt)
        
        # Parse AI response
        content_data = self._parse_ai_response(ai_response)
        
        # Create database entry
        content = PerspectiveContent(
            destination_id=destination_id,
            perspective=perspective,
            language=language,
            title=content_data.get("title", destination.name),
            subtitle=content_data.get("subtitle", ""),
            introduction=content_data.get("introduction", ""),
            main_content=content_data.get("main_content", ""),
            conclusion=content_data.get("conclusion", ""),
            significance=content_data.get("significance", ""),
            historical_context=content_data.get("historical_context", ""),
            religious_importance=content_data.get("religious_importance", 5),
            holy_texts_references=content_data.get("holy_texts_references", {}),
            religious_figures=content_data.get("religious_figures", []),
            prayers_meditations=content_data.get("prayers", {}),
            behavior_guidelines=content_data.get("behavior_guidelines", ""),
            dress_code_perspective=content_data.get("dress_code", {}),
            sacred_times=content_data.get("sacred_times", {}),
            ai_generated=True,
            ai_model="gpt-4",
            created_at=datetime.utcnow()
        )
        
        self.db.add(content)
        await self.db.commit()
        await self.db.refresh(content)
        
        return content
    
    def _create_perspective_prompt(
        self,
        destination: TouristDestination,
        perspective: ReligiousPerspective,
        template: Dict,
        language: SupportedLanguage,
        detail_level: Optional[ContentDetailLevel]
    ) -> str:
        """Create AI prompt for perspective-specific content generation"""
        
        detail_instructions = {
            ContentDetailLevel.BRIEF: "Keep content brief, 1-2 minutes reading time",
            ContentDetailLevel.STANDARD: "Provide standard detail, 5-10 minutes reading time",
            ContentDetailLevel.DETAILED: "Provide comprehensive detail, 15-30 minutes reading time",
            ContentDetailLevel.EXPERT: "Provide expert-level detail with citations, 30+ minutes"
        }
        
        prompt = f"""
        Generate tourist guide content for {destination.name} from a {perspective.value} perspective.
        
        Location: {destination.name}
        Address: {destination.address}, {destination.city}, {destination.country}
        Category: {destination.category}
        
        Religious Perspective: {perspective.value}
        Focus: {template['focus']}
        Tone: {template['tone']}
        References: {template['references']}
        Practices: {template['practices']}
        
        Language: {language.value}
        Detail Level: {detail_instructions.get(detail_level, detail_instructions[ContentDetailLevel.STANDARD])}
        
        Please provide:
        1. Title (engaging, perspective-appropriate)
        2. Subtitle (brief description)
        3. Introduction (welcoming, sets context)
        4. Main Content (detailed information from this perspective)
        5. Religious/Cultural Significance (why this matters to this faith/perspective)
        6. Historical Context (relevant history)
        7. Holy Text References (if applicable)
        8. Prayers or Meditations (appropriate for this location)
        9. Behavior Guidelines (do's and don'ts)
        10. Dress Code (if applicable)
        11. Sacred Times (special days, hours)
        12. Conclusion (inspiring, memorable)
        
        Format as JSON with these keys: title, subtitle, introduction, main_content,
        significance, historical_context, religious_importance (1-10), holy_texts_references,
        prayers, behavior_guidelines, dress_code, sacred_times, conclusion
        """
        
        return prompt
    
    def _parse_ai_response(self, response: str) -> Dict:
        """Parse AI-generated content response"""
        try:
            # Try to parse as JSON
            return json.loads(response)
        except json.JSONDecodeError:
            # Fallback: extract content manually
            logger.warning("Failed to parse AI response as JSON, using fallback parser")
            return {
                "title": "Generated Content",
                "main_content": response,
                "introduction": response[:500] if len(response) > 500 else response,
                "significance": "This location holds special significance.",
                "religious_importance": 5
            }
    
    async def generate_audio_guide(
        self,
        content: PerspectiveContent,
        voice_gender: Optional[VoiceGender] = None,
        speed: float = 1.0
    ) -> str:
        """Generate audio guide from text content"""
        
        # Prepare text for TTS
        audio_text = f"""
        {content.title}.
        {content.introduction}
        {content.main_content}
        {content.significance if content.significance else ''}
        {content.conclusion if content.conclusion else ''}
        """
        
        # Select voice based on language and gender
        voice_config = self._get_voice_config(content.language, voice_gender)
        
        # Generate audio
        audio_url = await self.tts_service.generate_audio(
            text=audio_text,
            language=content.language.value,
            voice=voice_config["voice"],
            speed=speed
        )
        
        # Create audio guide record
        audio_guide = AudioGuide(
            destination_id=content.destination_id,
            perspective=content.perspective,
            language=content.language,
            title=f"Audio Guide: {content.title}",
            description=content.subtitle,
            audio_url=audio_url,
            duration_seconds=len(audio_text) // 15,  # Rough estimate
            voice_gender=voice_gender or VoiceGender.NEUTRAL,
            generation_method="tts",
            tts_engine="google",
            created_at=datetime.utcnow()
        )
        
        self.db.add(audio_guide)
        content.audio_guide_id = audio_guide.id
        await self.db.commit()
        
        return audio_url
    
    def _get_voice_config(
        self,
        language: SupportedLanguage,
        gender: Optional[VoiceGender]
    ) -> Dict:
        """Get voice configuration for TTS"""
        
        # Voice mapping for different languages
        voice_map = {
            SupportedLanguage.EN_US: {
                VoiceGender.MALE: {"voice": "en-US-Standard-B"},
                VoiceGender.FEMALE: {"voice": "en-US-Standard-C"},
                VoiceGender.NEUTRAL: {"voice": "en-US-Standard-A"}
            },
            SupportedLanguage.ES_ES: {
                VoiceGender.MALE: {"voice": "es-ES-Standard-B"},
                VoiceGender.FEMALE: {"voice": "es-ES-Standard-A"},
                VoiceGender.NEUTRAL: {"voice": "es-ES-Standard-C"}
            },
            SupportedLanguage.AR_SA: {
                VoiceGender.MALE: {"voice": "ar-XA-Standard-B"},
                VoiceGender.FEMALE: {"voice": "ar-XA-Standard-A"},
                VoiceGender.NEUTRAL: {"voice": "ar-XA-Standard-C"}
            },
            SupportedLanguage.HE_IL: {
                VoiceGender.MALE: {"voice": "he-IL-Standard-B"},
                VoiceGender.FEMALE: {"voice": "he-IL-Standard-A"},
                VoiceGender.NEUTRAL: {"voice": "he-IL-Standard-C"}
            }
            # Add more language mappings as needed
        }
        
        # Get voice for language and gender
        lang_voices = voice_map.get(language, voice_map[SupportedLanguage.EN_US])
        return lang_voices.get(gender or VoiceGender.NEUTRAL, lang_voices[VoiceGender.NEUTRAL])
    
    async def track_content_interaction(
        self,
        user_id: Optional[str],
        destination_id: int,
        perspective_content_id: int,
        interaction_type: str,
        perspective: ReligiousPerspective,
        language: SupportedLanguage,
        duration_seconds: Optional[int] = None,
        rating: Optional[int] = None
    ):
        """Track user interaction with content for analytics"""
        
        if not user_id:
            return  # Skip tracking for anonymous users
        
        # Get user preferences
        prefs = await self.get_or_create_user_preferences(user_id)
        
        # Create interaction record
        interaction = ContentInteraction(
            user_preference_id=prefs.id,
            destination_id=destination_id,
            perspective_content_id=perspective_content_id,
            interaction_type=interaction_type,
            perspective_used=perspective,
            language_used=language,
            duration_seconds=duration_seconds,
            rated=rating,
            interaction_time=datetime.utcnow()
        )
        
        self.db.add(interaction)
        await self.db.commit()
    
    async def get_perspective_recommendations(
        self,
        user_id: str,
        current_location: Tuple[float, float],
        radius_km: float = 5.0
    ) -> List[Dict]:
        """Get content recommendations based on user's perspective and location"""
        
        # Get user preferences
        prefs = await self.get_or_create_user_preferences(user_id)
        
        # Find nearby destinations
        query = f"""
        SELECT d.*, 
               ST_Distance_Sphere(
                   ST_MakePoint(d.longitude, d.latitude),
                   ST_MakePoint(%s, %s)
               ) / 1000 as distance_km
        FROM tourist_destinations d
        WHERE ST_Distance_Sphere(
            ST_MakePoint(d.longitude, d.latitude),
            ST_MakePoint(%s, %s)
        ) / 1000 < %s
        ORDER BY distance_km
        LIMIT 10
        """
        
        result = await self.db.execute(
            query,
            (current_location[1], current_location[0],
             current_location[1], current_location[0], radius_km)
        )
        
        destinations = result.fetchall()
        
        recommendations = []
        for dest in destinations:
            # Check if perspective content exists
            content_query = select(PerspectiveContent).where(
                and_(
                    PerspectiveContent.destination_id == dest.id,
                    PerspectiveContent.perspective == prefs.religious_perspective,
                    PerspectiveContent.language == prefs.primary_language
                )
            )
            content_result = await self.db.execute(content_query)
            has_content = content_result.scalar_one_or_none() is not None
            
            recommendations.append({
                "destination_id": dest.id,
                "name": dest.name,
                "distance_km": round(dest.distance_km, 2),
                "category": dest.category,
                "has_perspective_content": has_content,
                "religious_significance": dest.is_religious_site,
                "recommended_for_perspective": self._is_recommended_for_perspective(
                    dest, prefs.religious_perspective
                )
            })
        
        return recommendations
    
    def _is_recommended_for_perspective(
        self,
        destination: TouristDestination,
        perspective: ReligiousPerspective
    ) -> bool:
        """Check if destination is recommended for a specific perspective"""
        
        if not destination.is_religious_site:
            return True  # Non-religious sites are recommended for all
        
        if destination.religions_associated:
            # Map perspectives to religions
            perspective_religion_map = {
                ReligiousPerspective.CATHOLIC: ["christianity", "catholic"],
                ReligiousPerspective.PROTESTANT: ["christianity", "protestant"],
                ReligiousPerspective.ORTHODOX: ["christianity", "orthodox"],
                ReligiousPerspective.JEWISH: ["judaism", "jewish"],
                ReligiousPerspective.ISLAMIC: ["islam", "muslim"],
                ReligiousPerspective.HINDU: ["hinduism", "hindu"],
                ReligiousPerspective.BUDDHIST: ["buddhism", "buddhist"]
            }
            
            religions = perspective_religion_map.get(perspective, [])
            return any(r in destination.religions_associated for r in religions)
        
        return True
    
    async def get_perspective_statistics(
        self,
        user_id: str
    ) -> Dict[str, Any]:
        """Get statistics about user's perspective usage"""
        
        # Get user preferences
        prefs = await self.get_or_create_user_preferences(user_id)
        
        # Get perspective change history
        history_query = select(PerspectiveChangeLog).where(
            PerspectiveChangeLog.user_preference_id == prefs.id
        ).order_by(PerspectiveChangeLog.changed_at.desc()).limit(10)
        
        result = await self.db.execute(history_query)
        history = result.scalars().all()
        
        # Get content interactions
        interactions_query = select(ContentInteraction).where(
            ContentInteraction.user_preference_id == prefs.id
        )
        
        result = await self.db.execute(interactions_query)
        interactions = result.scalars().all()
        
        # Calculate statistics
        perspective_usage = {}
        for interaction in interactions:
            if interaction.perspective_used:
                persp = interaction.perspective_used.value
                perspective_usage[persp] = perspective_usage.get(persp, 0) + 1
        
        return {
            "current_perspective": prefs.religious_perspective.value,
            "total_perspective_changes": len(history),
            "recent_changes": [
                {
                    "from": h.from_perspective.value if h.from_perspective else None,
                    "to": h.to_perspective.value,
                    "when": h.changed_at.isoformat(),
                    "location": h.location_name
                }
                for h in history[:5]
            ],
            "perspective_usage": perspective_usage,
            "most_used_perspective": max(perspective_usage, key=perspective_usage.get)
                if perspective_usage else prefs.religious_perspective.value,
            "total_content_viewed": len(interactions),
            "average_rating": sum(i.rated for i in interactions if i.rated) / 
                len([i for i in interactions if i.rated]) if any(i.rated for i in interactions) else 0
        }