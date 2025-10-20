# Enhanced Virtual Guide System Models with Multi-Religious Perspectives and Languages
# Sistema mejorado de guía virtual con perspectivas religiosas múltiples y soporte multiidioma

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, JSON, ForeignKey, Date, Time, Enum, Index, ARRAY, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import enum
import uuid

Base = declarative_base()

# ==================== ENUMS FOR RELIGIOUS AND LANGUAGE SUPPORT ====================

class ReligiousPerspective(enum.Enum):
    """Religious perspectives for content personalization"""
    CATHOLIC = "catholic"
    PROTESTANT = "protestant"  # Evangelical/Protestant
    ORTHODOX = "orthodox"  # Eastern Orthodox
    JEWISH = "jewish"
    ISLAMIC = "islamic"
    HINDU = "hindu"
    BUDDHIST = "buddhist"
    NEUTRAL = "neutral"  # Non-religious, historical/cultural
    ACADEMIC = "academic"  # Scholarly perspective
    SPIRITUAL = "spiritual"  # General spiritual without specific religion
    ATHEIST = "atheist"  # Scientific/secular perspective

class SupportedLanguage(enum.Enum):
    """Supported languages for the virtual guide - Most requested worldwide"""
    # English variants
    EN_US = "en-US"  # American English
    EN_GB = "en-GB"  # British English
    EN_AU = "en-AU"  # Australian English
    EN_CA = "en-CA"  # Canadian English
    EN_IN = "en-IN"  # Indian English
    
    # Spanish variants
    ES_ES = "es-ES"  # Spain Spanish
    ES_MX = "es-MX"  # Mexican Spanish
    ES_AR = "es-AR"  # Argentinian Spanish
    ES_CO = "es-CO"  # Colombian Spanish
    ES_PE = "es-PE"  # Peruvian Spanish
    ES_CL = "es-CL"  # Chilean Spanish
    ES_VE = "es-VE"  # Venezuelan Spanish
    
    # Chinese variants
    ZH_CN = "zh-CN"  # Mandarin Chinese (Simplified)
    ZH_TW = "zh-TW"  # Mandarin Chinese (Traditional)
    ZH_HK = "zh-HK"  # Cantonese (Hong Kong)
    
    # Arabic variants
    AR_SA = "ar-SA"  # Arabic (Saudi Arabia)
    AR_EG = "ar-EG"  # Arabic (Egyptian)
    AR_AE = "ar-AE"  # Arabic (UAE)
    AR_MA = "ar-MA"  # Arabic (Moroccan)
    AR_DZ = "ar-DZ"  # Arabic (Algerian)
    AR_IQ = "ar-IQ"  # Arabic (Iraqi)
    AR_SY = "ar-SY"  # Arabic (Syrian)
    AR_JO = "ar-JO"  # Arabic (Jordanian)
    AR_LB = "ar-LB"  # Arabic (Lebanese)
    
    # French variants
    FR_FR = "fr-FR"  # French (France)
    FR_CA = "fr-CA"  # French (Canadian)
    FR_BE = "fr-BE"  # French (Belgian)
    FR_CH = "fr-CH"  # French (Swiss)
    FR_MA = "fr-MA"  # French (Moroccan)
    
    # Other major languages
    DE_DE = "de-DE"  # German (Germany)
    DE_AT = "de-AT"  # German (Austria)
    DE_CH = "de-CH"  # German (Swiss)
    IT_IT = "it-IT"  # Italian
    JA_JP = "ja-JP"  # Japanese
    KO_KR = "ko-KR"  # Korean
    PT_BR = "pt-BR"  # Portuguese (Brazil)
    PT_PT = "pt-PT"  # Portuguese (Portugal)
    RU_RU = "ru-RU"  # Russian
    HI_IN = "hi-IN"  # Hindi
    HE_IL = "he-IL"  # Hebrew
    TR_TR = "tr-TR"  # Turkish
    PL_PL = "pl-PL"  # Polish
    NL_NL = "nl-NL"  # Dutch
    NL_BE = "nl-BE"  # Dutch (Belgian)
    
    # Nordic languages
    SV_SE = "sv-SE"  # Swedish
    NO_NO = "no-NO"  # Norwegian
    DA_DK = "da-DK"  # Danish
    FI_FI = "fi-FI"  # Finnish
    IS_IS = "is-IS"  # Icelandic
    
    # Other important languages
    EL_GR = "el-GR"  # Greek
    TH_TH = "th-TH"  # Thai
    VI_VN = "vi-VN"  # Vietnamese
    ID_ID = "id-ID"  # Indonesian
    MS_MY = "ms-MY"  # Malay
    TA_IN = "ta-IN"  # Tamil
    TE_IN = "te-IN"  # Telugu
    BN_BD = "bn-BD"  # Bengali
    UR_PK = "ur-PK"  # Urdu
    FA_IR = "fa-IR"  # Persian/Farsi
    UK_UA = "uk-UA"  # Ukrainian
    CS_CZ = "cs-CZ"  # Czech
    HU_HU = "hu-HU"  # Hungarian
    RO_RO = "ro-RO"  # Romanian
    BG_BG = "bg-BG"  # Bulgarian
    HR_HR = "hr-HR"  # Croatian
    SR_RS = "sr-RS"  # Serbian
    SK_SK = "sk-SK"  # Slovak
    SL_SI = "sl-SI"  # Slovenian
    ET_EE = "et-EE"  # Estonian
    LV_LV = "lv-LV"  # Latvian
    LT_LT = "lt-LT"  # Lithuanian
    MT_MT = "mt-MT"  # Maltese
    GA_IE = "ga-IE"  # Irish
    CY_GB = "cy-GB"  # Welsh
    EU_ES = "eu-ES"  # Basque
    CA_ES = "ca-ES"  # Catalan
    GL_ES = "gl-ES"  # Galician
    AF_ZA = "af-ZA"  # Afrikaans
    SW_KE = "sw-KE"  # Swahili
    AM_ET = "am-ET"  # Amharic
    TL_PH = "tl-PH"  # Filipino/Tagalog

class ContentType(enum.Enum):
    """Types of tourist content"""
    HISTORICAL = "historical"
    RELIGIOUS = "religious"
    CULTURAL = "cultural"
    SPIRITUAL = "spiritual"
    ARCHITECTURAL = "architectural"
    ARCHAEOLOGICAL = "archaeological"
    NATURAL = "natural"
    GASTRONOMIC = "gastronomic"
    ENTERTAINMENT = "entertainment"
    SHOPPING = "shopping"
    PRACTICAL = "practical"
    EDUCATIONAL = "educational"
    KIDS_FRIENDLY = "kids_friendly"

class VoiceGender(enum.Enum):
    """Voice gender options for audio guides"""
    MALE = "male"
    FEMALE = "female"
    NEUTRAL = "neutral"
    CHILD = "child"

class ContentDetailLevel(enum.Enum):
    """Level of detail for content"""
    BRIEF = "brief"  # Quick overview, 1-2 minutes
    STANDARD = "standard"  # Normal detail, 5-10 minutes
    DETAILED = "detailed"  # In-depth, 15-30 minutes
    EXPERT = "expert"  # Comprehensive, 30+ minutes

# ==================== USER PREFERENCES ====================

class UserPreferences(Base):
    """User preferences for virtual guide experience"""
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String(100), nullable=False, unique=True)
    session_id = Column(String(100))  # For anonymous users
    
    # Religious perspective - can change anytime
    religious_perspective = Column(Enum(ReligiousPerspective), default=ReligiousPerspective.NEUTRAL, nullable=False)
    secondary_perspective = Column(Enum(ReligiousPerspective))  # For comparative views
    allow_perspective_mixing = Column(Boolean, default=False)  # Mix perspectives in content
    
    # Language preferences
    primary_language = Column(Enum(SupportedLanguage), default=SupportedLanguage.EN_US, nullable=False)
    secondary_language = Column(Enum(SupportedLanguage))
    tertiary_language = Column(Enum(SupportedLanguage))
    auto_translate = Column(Boolean, default=True)
    preferred_dialect = Column(String(20))  # Specific dialect within language
    
    # Voice and audio preferences
    voice_gender = Column(Enum(VoiceGender), default=VoiceGender.NEUTRAL)
    voice_speed = Column(Float, default=1.0)  # 0.5 to 2.0
    voice_pitch = Column(Float, default=1.0)  # 0.5 to 2.0
    auto_play_audio = Column(Boolean, default=True)
    background_music = Column(Boolean, default=False)
    ambient_sounds = Column(Boolean, default=True)
    audio_descriptions = Column(Boolean, default=False)  # For visually impaired
    
    # Content preferences
    content_detail_level = Column(Enum(ContentDetailLevel), default=ContentDetailLevel.STANDARD)
    include_practical_info = Column(Boolean, default=True)
    include_cultural_context = Column(Boolean, default=True)
    include_religious_content = Column(Boolean, default=True)
    include_historical_dates = Column(Boolean, default=True)
    include_personal_stories = Column(Boolean, default=True)
    child_friendly_mode = Column(Boolean, default=False)
    academic_citations = Column(Boolean, default=False)
    
    # Accessibility
    high_contrast = Column(Boolean, default=False)
    large_text = Column(Boolean, default=False)
    simplified_language = Column(Boolean, default=False)
    screen_reader_mode = Column(Boolean, default=False)
    sign_language_videos = Column(Boolean, default=False)
    haptic_feedback = Column(Boolean, default=True)
    
    # GPS and navigation
    gps_accuracy = Column(String(20), default="high")  # high, medium, low
    activation_radius_meters = Column(Integer, default=50)
    advance_notification = Column(Boolean, default=True)
    navigation_voice = Column(Boolean, default=True)
    offline_maps_quality = Column(String(20), default="standard")  # low, standard, high
    
    # Privacy and sharing
    share_location = Column(Boolean, default=True)
    location_precision = Column(String(20), default="approximate")  # exact, approximate, city
    anonymous_mode = Column(Boolean, default=False)
    share_with_group = Column(Boolean, default=True)
    public_reviews = Column(Boolean, default=True)
    data_collection = Column(Boolean, default=True)
    
    # Notification preferences
    push_notifications = Column(Boolean, default=True)
    email_notifications = Column(Boolean, default=False)
    sms_notifications = Column(Boolean, default=False)
    notification_quiet_hours = Column(JSON)  # {"start": "22:00", "end": "08:00"}
    
    # UI preferences
    theme = Column(String(20), default="auto")  # light, dark, auto
    map_style = Column(String(20), default="standard")  # standard, satellite, terrain
    measurement_units = Column(String(20), default="metric")  # metric, imperial
    date_format = Column(String(20), default="DD/MM/YYYY")
    time_format = Column(String(20), default="24h")  # 12h, 24h
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    last_perspective_change = Column(DateTime)
    last_language_change = Column(DateTime)
    
    # Relationships
    perspective_history = relationship("PerspectiveChangeLog", back_populates="user_preference")
    favorite_destinations = relationship("FavoriteDestination", back_populates="user_preference")
    content_interactions = relationship("ContentInteraction", back_populates="user_preference")

class PerspectiveChangeLog(Base):
    """Log of perspective changes for analytics and quick switching"""
    __tablename__ = "perspective_change_logs"
    
    id = Column(Integer, primary_key=True)
    user_preference_id = Column(Integer, ForeignKey("user_preferences.id"))
    from_perspective = Column(Enum(ReligiousPerspective))
    to_perspective = Column(Enum(ReligiousPerspective), nullable=False)
    destination_id = Column(Integer, ForeignKey("tourist_destinations.id"))
    trigger = Column(String(50))  # manual, suggested, location_based
    reason = Column(Text)  # Optional user feedback
    satisfaction_rating = Column(Integer)  # 1-5 stars
    changed_at = Column(DateTime, default=datetime.utcnow)
    session_duration = Column(Integer)  # Seconds in previous perspective
    
    # Location when changed
    latitude = Column(Float)
    longitude = Column(Float)
    location_name = Column(String(200))
    
    # Relationships
    user_preference = relationship("UserPreferences", back_populates="perspective_history")
    destination = relationship("TouristDestination")

# ==================== MULTI-PERSPECTIVE CONTENT ====================

class TouristDestination(Base):
    """Tourist destinations with GPS coordinates"""
    __tablename__ = "tourist_destinations"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    category = Column(Enum(ContentType), nullable=False)
    
    # GPS coordinates
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float)
    gps_radius_meters = Column(Integer, default=50)  # Activation radius
    indoor_location = Column(Boolean, default=False)
    floor_number = Column(Integer)  # For indoor locations
    
    # Address
    address = Column(String(500))
    city = Column(String(100))
    region = Column(String(100))
    country = Column(String(100))
    postal_code = Column(String(20))
    
    # Multi-religious significance
    is_religious_site = Column(Boolean, default=False)
    religions_associated = Column(ARRAY(String))  # List of religions
    contested_site = Column(Boolean, default=False)  # Multiple religious claims
    sensitivity_level = Column(String(20), default="low")  # low, medium, high
    
    # Operating info
    opening_hours = Column(JSON)  # {"monday": {"open": "09:00", "close": "17:00"}}
    admission_fee = Column(JSON)  # {"adult": 20, "child": 10, "currency": "USD"}
    dress_code = Column(JSON)  # {"required": ["covered_shoulders"], "forbidden": ["shorts"]}
    photography_allowed = Column(Boolean, default=True)
    
    # Metadata
    unesco_site = Column(Boolean, default=False)
    popularity_score = Column(Float, default=0.0)
    average_visit_duration = Column(Integer)  # minutes
    best_time_to_visit = Column(JSON)  # {"months": [3,4,5], "time": "morning"}
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # Relationships
    perspective_contents = relationship("PerspectiveContent", back_populates="destination")
    audio_guides = relationship("AudioGuide", back_populates="destination")
    points_of_interest = relationship("PointOfInterest", back_populates="destination")
    tours = relationship("TourRoute", secondary="tour_route_destinations")
    
    # Indexes
    __table_args__ = (
        Index('idx_destination_location', 'latitude', 'longitude'),
        Index('idx_destination_city_country', 'city', 'country'),
    )

class PerspectiveContent(Base):
    """Religion/perspective-specific content for destinations"""
    __tablename__ = "perspective_contents"
    
    id = Column(Integer, primary_key=True)
    destination_id = Column(Integer, ForeignKey("tourist_destinations.id"), nullable=False)
    perspective = Column(Enum(ReligiousPerspective), nullable=False)
    language = Column(Enum(SupportedLanguage), nullable=False)
    
    # Main content
    title = Column(String(300), nullable=False)
    subtitle = Column(String(500))
    introduction = Column(Text, nullable=False)
    main_content = Column(Text, nullable=False)
    conclusion = Column(Text)
    
    # Perspective-specific significance
    significance = Column(Text)  # Why this matters from this perspective
    historical_context = Column(Text)  # Historical background
    religious_importance = Column(Integer)  # 1-10 scale
    
    # Religious references and texts
    holy_texts_references = Column(JSON)  # {"bible": ["Matthew 5:1-12"], "quran": ["2:125"]}
    religious_figures = Column(JSON)  # Associated prophets, saints, etc.
    religious_events = Column(JSON)  # Important events that occurred here
    miracles_traditions = Column(JSON)  # Miracles or traditions associated
    
    # Practices and guidelines
    prayers_meditations = Column(JSON)  # Specific prayers or meditations
    rituals_practices = Column(JSON)  # Religious practices performed here
    dress_code_perspective = Column(JSON)  # Specific requirements
    behavior_guidelines = Column(Text)  # Do's and don'ts
    dietary_considerations = Column(JSON)  # Food restrictions if applicable
    
    # Special times and dates
    sacred_times = Column(JSON)  # Holy days, prayer times
    pilgrimage_seasons = Column(JSON)  # Best times for religious visits
    festivals_celebrations = Column(JSON)  # Related religious festivals
    
    # Interfaith considerations
    interfaith_sensitivity = Column(Text)  # Notes for respectful interfaith visits
    shared_heritage = Column(JSON)  # Shared significance across religions
    conflicting_narratives = Column(JSON)  # Different religious interpretations
    
    # Modern relevance
    contemporary_significance = Column(Text)  # Current religious importance
    community_activities = Column(JSON)  # Current religious activities
    pilgrimage_info = Column(JSON)  # Modern pilgrimage details
    
    # Media and audio
    audio_guide_id = Column(Integer, ForeignKey("audio_guides.id"))
    audio_duration_seconds = Column(Integer)
    images = Column(JSON)  # Perspective-specific images
    videos = Column(JSON)  # Perspective-specific videos
    virtual_tour_url = Column(String(500))
    
    # For kids
    kids_version_available = Column(Boolean, default=False)
    kids_content = Column(Text)  # Simplified version for children
    kids_activities = Column(JSON)  # Interactive activities for children
    
    # Quality and verification
    content_source = Column(String(200))  # Source of information
    verified_by = Column(String(200))  # Religious authority or expert
    verification_date = Column(DateTime)
    last_review_date = Column(DateTime)
    accuracy_score = Column(Float)  # 0-100
    
    # AI generation metadata
    ai_generated = Column(Boolean, default=False)
    ai_model = Column(String(100))
    ai_prompt_template = Column(Text)
    human_edited = Column(Boolean, default=False)
    editor_notes = Column(Text)
    
    # Statistics
    view_count = Column(Integer, default=0)
    average_rating = Column(Float)
    helpful_votes = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # Relationships
    destination = relationship("TouristDestination", back_populates="perspective_contents")
    audio_guide = relationship("AudioGuide", foreign_keys=[audio_guide_id])
    translations = relationship("ContentTranslation", back_populates="perspective_content")
    user_feedback = relationship("ContentFeedback", back_populates="perspective_content")
    
    # Indexes and constraints
    __table_args__ = (
        UniqueConstraint('destination_id', 'perspective', 'language', 
                        name='_destination_perspective_language_uc'),
        Index('idx_perspective_language', 'perspective', 'language'),
        Index('idx_perspective_rating', 'perspective', 'average_rating'),
    )

class ContentTranslation(Base):
    """High-quality translations for perspective content"""
    __tablename__ = "content_translations"
    
    id = Column(Integer, primary_key=True)
    perspective_content_id = Column(Integer, ForeignKey("perspective_contents.id"), nullable=False)
    language = Column(Enum(SupportedLanguage), nullable=False)
    
    # Translated content
    title = Column(String(300), nullable=False)
    subtitle = Column(String(500))
    introduction = Column(Text, nullable=False)
    main_content = Column(Text, nullable=False)
    conclusion = Column(Text)
    significance = Column(Text)
    historical_context = Column(Text)
    
    # Translated religious content
    prayers_meditations = Column(JSON)
    behavior_guidelines = Column(Text)
    interfaith_sensitivity = Column(Text)
    contemporary_significance = Column(Text)
    
    # Kids content translation
    kids_content = Column(Text)
    
    # Translation metadata
    translation_method = Column(String(50))  # manual, ai, professional, community
    translator_id = Column(String(100))
    translator_name = Column(String(200))
    translation_service = Column(String(100))  # Google, DeepL, OpenAI, etc.
    
    # Quality control
    quality_score = Column(Float)  # 0-100
    fluency_score = Column(Float)
    accuracy_score = Column(Float)
    cultural_appropriateness = Column(Float)
    reviewed = Column(Boolean, default=False)
    reviewer_id = Column(String(100))
    review_notes = Column(Text)
    
    # Native speaker verification
    native_verified = Column(Boolean, default=False)
    native_verifier_id = Column(String(100))
    native_verifier_country = Column(String(100))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # Relationships
    perspective_content = relationship("PerspectiveContent", back_populates="translations")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('perspective_content_id', 'language', 
                        name='_translation_content_language_uc'),
        Index('idx_translation_language', 'language'),
        Index('idx_translation_quality', 'quality_score'),
    )

class AudioGuide(Base):
    """Audio guides with multi-language and perspective support"""
    __tablename__ = "audio_guides"
    
    id = Column(Integer, primary_key=True)
    destination_id = Column(Integer, ForeignKey("tourist_destinations.id"))
    perspective = Column(Enum(ReligiousPerspective), nullable=False)
    language = Column(Enum(SupportedLanguage), nullable=False)
    
    # Audio details
    title = Column(String(300), nullable=False)
    description = Column(Text)
    audio_url = Column(String(500), nullable=False)
    backup_url = Column(String(500))  # Fallback URL
    duration_seconds = Column(Integer, nullable=False)
    file_size_mb = Column(Float)
    audio_format = Column(String(20))  # mp3, m4a, ogg
    
    # Voice characteristics
    voice_gender = Column(Enum(VoiceGender), default=VoiceGender.NEUTRAL)
    voice_name = Column(String(100))  # TTS voice name
    voice_accent = Column(String(50))
    speaking_rate = Column(Float, default=1.0)
    pitch = Column(Float, default=1.0)
    
    # Content structure
    chapters = Column(JSON)  # [{"title": "Intro", "start": 0, "end": 60}]
    transcription = Column(Text)  # Full text transcription
    keywords = Column(JSON)  # For searching
    
    # Background audio
    has_background_music = Column(Boolean, default=False)
    background_music_url = Column(String(500))
    ambient_sounds_url = Column(String(500))
    
    # Generation method
    generation_method = Column(String(50))  # tts, human, hybrid
    narrator_id = Column(String(100))
    narrator_name = Column(String(200))
    tts_engine = Column(String(50))  # Google, Amazon, Azure, ElevenLabs
    
    # Quality
    audio_quality = Column(String(20))  # low, medium, high, studio
    bitrate = Column(Integer)  # kbps
    sample_rate = Column(Integer)  # Hz
    
    # Accessibility
    includes_descriptions = Column(Boolean, default=False)  # For visually impaired
    simplified_language = Column(Boolean, default=False)
    kids_friendly = Column(Boolean, default=False)
    
    # Statistics
    play_count = Column(Integer, default=0)
    completion_rate = Column(Float)  # Percentage who finish
    average_rating = Column(Float)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # Relationships
    destination = relationship("TouristDestination", back_populates="audio_guides")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('destination_id', 'perspective', 'language', 
                        name='_audio_destination_perspective_language_uc'),
        Index('idx_audio_perspective_language', 'perspective', 'language'),
    )

# ==================== USER INTERACTION TRACKING ====================

class ContentInteraction(Base):
    """Track user interactions with content for personalization"""
    __tablename__ = "content_interactions"
    
    id = Column(Integer, primary_key=True)
    user_preference_id = Column(Integer, ForeignKey("user_preferences.id"))
    destination_id = Column(Integer, ForeignKey("tourist_destinations.id"))
    perspective_content_id = Column(Integer, ForeignKey("perspective_contents.id"))
    
    # Interaction details
    interaction_type = Column(String(50))  # view, listen, share, save
    perspective_used = Column(Enum(ReligiousPerspective))
    language_used = Column(Enum(SupportedLanguage))
    
    # Engagement metrics
    duration_seconds = Column(Integer)
    completion_percentage = Column(Float)
    scrolled_percentage = Column(Float)
    audio_played = Column(Boolean, default=False)
    photos_viewed = Column(Integer, default=0)
    
    # User actions
    saved_to_favorites = Column(Boolean, default=False)
    shared = Column(Boolean, default=False)
    downloaded = Column(Boolean, default=False)
    rated = Column(Integer)  # 1-5 stars
    reported_issue = Column(Boolean, default=False)
    
    # Context
    triggered_by_gps = Column(Boolean, default=False)
    distance_meters = Column(Float)  # Distance from POI when accessed
    weather = Column(String(50))
    time_of_day = Column(String(20))  # morning, afternoon, evening, night
    day_of_week = Column(String(20))
    
    # Device info
    device_type = Column(String(50))  # mobile, tablet, web
    os = Column(String(50))
    app_version = Column(String(20))
    
    interaction_time = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user_preference = relationship("UserPreferences", back_populates="content_interactions")
    destination = relationship("TouristDestination")
    perspective_content = relationship("PerspectiveContent")

class ContentFeedback(Base):
    """User feedback on perspective content"""
    __tablename__ = "content_feedback"
    
    id = Column(Integer, primary_key=True)
    perspective_content_id = Column(Integer, ForeignKey("perspective_contents.id"), nullable=False)
    user_id = Column(String(100))
    
    # Ratings
    overall_rating = Column(Integer, nullable=False)  # 1-5 stars
    accuracy_rating = Column(Integer)  # 1-5
    relevance_rating = Column(Integer)  # 1-5
    clarity_rating = Column(Integer)  # 1-5
    respect_rating = Column(Integer)  # 1-5 for religious sensitivity
    
    # Feedback
    helpful = Column(Boolean)
    feedback_text = Column(Text)
    improvement_suggestions = Column(Text)
    
    # Specific issues
    factual_error = Column(Boolean, default=False)
    translation_error = Column(Boolean, default=False)
    cultural_insensitivity = Column(Boolean, default=False)
    outdated_info = Column(Boolean, default=False)
    
    # User context
    user_perspective = Column(Enum(ReligiousPerspective))
    user_language = Column(Enum(SupportedLanguage))
    is_expert = Column(Boolean, default=False)
    expertise_area = Column(String(200))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    perspective_content = relationship("PerspectiveContent", back_populates="user_feedback")

class FavoriteDestination(Base):
    """User's favorite destinations"""
    __tablename__ = "favorite_destinations"
    
    id = Column(Integer, primary_key=True)
    user_preference_id = Column(Integer, ForeignKey("user_preferences.id"), nullable=False)
    destination_id = Column(Integer, ForeignKey("tourist_destinations.id"), nullable=False)
    
    # Favorite details
    preferred_perspective = Column(Enum(ReligiousPerspective))
    notes = Column(Text)
    visit_planned = Column(Boolean, default=False)
    visit_date = Column(Date)
    visited = Column(Boolean, default=False)
    
    added_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user_preference = relationship("UserPreferences", back_populates="favorite_destinations")
    destination = relationship("TouristDestination")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_preference_id', 'destination_id', 
                        name='_user_destination_favorite_uc'),
    )

# ==================== POINT OF INTEREST (POI) ====================

class PointOfInterest(Base):
    """Specific points of interest within destinations"""
    __tablename__ = "points_of_interest"
    
    id = Column(Integer, primary_key=True)
    destination_id = Column(Integer, ForeignKey("tourist_destinations.id"), nullable=False)
    name = Column(String(200), nullable=False)
    
    # Location
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    indoor_location = Column(Boolean, default=False)
    floor = Column(Integer)
    room_number = Column(String(50))
    
    # Multi-perspective descriptions
    descriptions = Column(JSON)  # {"catholic": "...", "jewish": "...", "neutral": "..."}
    
    # Trigger settings
    activation_radius = Column(Integer, default=10)  # meters
    dwell_time_seconds = Column(Integer, default=5)  # Time to stay before trigger
    
    # Order in tour
    suggested_order = Column(Integer)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    destination = relationship("TouristDestination", back_populates="points_of_interest")

# ==================== TOUR ROUTES ====================

class TourRoute(Base):
    """Predefined tour routes"""
    __tablename__ = "tour_routes"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    
    # Tour characteristics
    theme = Column(String(100))  # Religious, Historical, Cultural
    difficulty = Column(String(20))  # easy, moderate, challenging
    duration_minutes = Column(Integer)
    distance_km = Column(Float)
    
    # Multi-perspective support
    available_perspectives = Column(ARRAY(String))
    default_perspective = Column(Enum(ReligiousPerspective))
    
    # Languages
    available_languages = Column(ARRAY(String))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

# ==================== ASSOCIATION TABLES ====================

class TourRouteDestination(Base):
    """Association between tours and destinations"""
    __tablename__ = "tour_route_destinations"
    
    id = Column(Integer, primary_key=True)
    tour_route_id = Column(Integer, ForeignKey("tour_routes.id"), nullable=False)
    destination_id = Column(Integer, ForeignKey("tourist_destinations.id"), nullable=False)
    order_in_tour = Column(Integer, nullable=False)
    
    # Optional stop
    is_optional = Column(Boolean, default=False)
    time_at_location = Column(Integer)  # Suggested minutes
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('tour_route_id', 'destination_id', 
                        name='_tour_destination_uc'),
    )

# ==================== COMMUNICATION CHANNELS ====================

class TourCommunicationChannel(Base):
    """Communication channels for tour groups"""
    __tablename__ = "tour_communication_channels"
    
    id = Column(Integer, primary_key=True)
    channel_code = Column(String(8), unique=True, nullable=False)
    tour_id = Column(String(100))
    tour_name = Column(String(200))
    
    # Channel settings
    active = Column(Boolean, default=True)
    allow_tourist_messages = Column(Boolean, default=True)
    allow_location_sharing = Column(Boolean, default=True)
    auto_delete_hours = Column(Integer, default=24)
    
    # Participants
    guide_id = Column(String(100))
    driver_id = Column(String(100))
    max_participants = Column(Integer, default=100)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    
    # Relationships
    participants = relationship("ChannelParticipant", back_populates="channel")
    messages = relationship("ChannelMessage", back_populates="channel")
    shared_locations = relationship("SharedLocation", back_populates="channel")

class ChannelParticipant(Base):
    """Participants in communication channels"""
    __tablename__ = "channel_participants"
    
    id = Column(Integer, primary_key=True)
    channel_id = Column(Integer, ForeignKey("tour_communication_channels.id"), nullable=False)
    user_id = Column(String(100), nullable=False)
    
    # Role
    role = Column(String(20))  # tourist, guide, driver, admin
    display_name = Column(String(100))
    avatar_url = Column(String(500))
    
    # Permissions
    can_send_messages = Column(Boolean, default=True)
    can_share_location = Column(Boolean, default=True)
    can_see_others_location = Column(Boolean, default=False)
    
    # Status
    joined_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime)
    is_online = Column(Boolean, default=False)
    
    # Preferences
    preferred_language = Column(Enum(SupportedLanguage))
    muted = Column(Boolean, default=False)
    
    # Relationships
    channel = relationship("TourCommunicationChannel", back_populates="participants")

class ChannelMessage(Base):
    """Messages in communication channels"""
    __tablename__ = "channel_messages"
    
    id = Column(Integer, primary_key=True)
    channel_id = Column(Integer, ForeignKey("tour_communication_channels.id"), nullable=False)
    sender_id = Column(String(100), nullable=False)
    
    # Message content
    message_type = Column(String(20))  # text, image, audio, location, alert
    content = Column(Text)
    media_url = Column(String(500))
    
    # Translation
    original_language = Column(Enum(SupportedLanguage))
    translations = Column(JSON)  # {"en-US": "...", "es-ES": "..."}
    
    # Metadata
    is_announcement = Column(Boolean, default=False)
    is_emergency = Column(Boolean, default=False)
    
    sent_at = Column(DateTime, default=datetime.utcnow)
    edited_at = Column(DateTime)
    deleted_at = Column(DateTime)
    
    # Relationships
    channel = relationship("TourCommunicationChannel", back_populates="messages")

class SharedLocation(Base):
    """Temporary shared locations"""
    __tablename__ = "shared_locations"
    
    id = Column(Integer, primary_key=True)
    channel_id = Column(Integer, ForeignKey("tour_communication_channels.id"), nullable=False)
    user_id = Column(String(100), nullable=False)
    
    # Location data
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy_meters = Column(Float)
    altitude = Column(Float)
    
    # Sharing settings
    share_duration_minutes = Column(Integer, default=30)
    share_with_role = Column(JSON)  # ["guide", "driver"]
    is_emergency = Column(Boolean, default=False)
    
    # Status
    shared_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    stopped_manually = Column(Boolean, default=False)
    
    # Relationships
    channel = relationship("TourCommunicationChannel", back_populates="shared_locations")
    
    # Indexes
    __table_args__ = (
        Index('idx_shared_location_expiry', 'expires_at'),
    )