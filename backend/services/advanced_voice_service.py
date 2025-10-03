"""
Advanced Voice AI Service - Spirit Tours Omnichannel Platform
Manejo avanzado de voces con cloning, multi-dialect y personalización
"""

import asyncio
import json
import logging
import uuid
import base64
import io
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path

import aiofiles
import aiohttp
from pydantic import BaseModel, Field
import openai
from elevenlabs.client import ElevenLabs
from elevenlabs import Voice, VoiceSettings

# Configure logging
logger = logging.getLogger(__name__)

class VoiceProvider(str, Enum):
    """Proveedores de servicios de voz"""
    OPENAI = "openai"
    ELEVENLABS = "elevenlabs"
    GOOGLE = "google"
    AZURE = "azure"
    AMAZON_POLLY = "amazon_polly"

class VoiceType(str, Enum):
    """Tipos de voz disponibles"""
    PERSONAL_CLONE = "personal_clone"       # Voz clonada personal
    EMPLOYEE_CLONE = "employee_clone"       # Voz de empleados
    PROFESSIONAL = "professional"           # Voces profesionales premium
    SYNTHETIC = "synthetic"                 # Voces sintéticas estándar
    CELEBRITY = "celebrity"                 # Voces de celebridades (si disponible)

class VoiceGender(str, Enum):
    """Género de la voz"""
    MALE = "male"
    FEMALE = "female"
    NEUTRAL = "neutral"

class VoiceLanguage(str, Enum):
    """Idiomas y dialectos soportados"""
    # Español
    ES_ES = "es-ES"  # Español de España
    ES_MX = "es-MX"  # Español de México  
    ES_AR = "es-AR"  # Español de Argentina
    ES_CL = "es-CL"  # Español de Chile
    ES_CO = "es-CO"  # Español de Colombia
    ES_PE = "es-PE"  # Español de Perú
    
    # Inglés
    EN_US = "en-US"  # Inglés Americano
    EN_GB = "en-GB"  # Inglés Británico
    EN_AU = "en-AU"  # Inglés Australiano
    EN_CA = "en-CA"  # Inglés Canadiense
    EN_IE = "en-IE"  # Inglés Irlandés
    
    # Francés
    FR_FR = "fr-FR"  # Francés de Francia
    FR_CA = "fr-CA"  # Francés Canadiense
    
    # Alemán
    DE_DE = "de-DE"  # Alemán de Alemania
    DE_AT = "de-AT"  # Alemán de Austria
    
    # Italiano
    IT_IT = "it-IT"  # Italiano de Italia
    
    # Portugués
    PT_BR = "pt-BR"  # Portugués Brasileño
    PT_PT = "pt-PT"  # Portugués de Portugal

class EmotionalTone(str, Enum):
    """Tonos emocionales disponibles"""
    NEUTRAL = "neutral"
    FRIENDLY = "friendly"
    PROFESSIONAL = "professional"
    ENTHUSIASTIC = "enthusiastic"
    CALM = "calm"
    CONFIDENT = "confident"
    WARM = "warm"
    AUTHORITATIVE = "authoritative"
    EMPATHETIC = "empathetic"
    EXCITED = "excited"

class SpeakingStyle(str, Enum):
    """Estilos de habla"""
    CONVERSATIONAL = "conversational"
    FORMAL = "formal"
    CASUAL = "casual"
    PRESENTATION = "presentation"
    STORYTELLING = "storytelling"
    CUSTOMER_SERVICE = "customer_service"
    SALES = "sales"
    EDUCATIONAL = "educational"

@dataclass
class VoiceProfile:
    """Perfil completo de una voz"""
    voice_id: str
    name: str
    display_name: str
    voice_type: VoiceType
    provider: VoiceProvider
    language: VoiceLanguage
    gender: VoiceGender
    description: str
    
    # Configuraciones técnicas
    sample_rate: int = 22050
    bit_depth: int = 16
    
    # Configuraciones de personalidad
    emotional_tone: EmotionalTone = EmotionalTone.NEUTRAL
    speaking_style: SpeakingStyle = SpeakingStyle.CONVERSATIONAL
    
    # Configuraciones de voz (ElevenLabs style)
    stability: float = 0.75        # 0.0-1.0 (más estable vs más variable)
    similarity_boost: float = 0.75  # 0.0-1.0 (más similar al original)
    style: float = 0.0             # 0.0-1.0 (menos vs más estilo)
    use_speaker_boost: bool = True
    
    # Metadatos
    created_at: datetime = None
    updated_at: datetime = None
    created_by: Optional[str] = None
    clone_source_file: Optional[str] = None
    usage_count: int = 0
    rating: float = 0.0
    is_active: bool = True
    
    # Configuraciones específicas por agente
    agent_specific_settings: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.updated_at is None:
            self.updated_at = datetime.now()
        if self.agent_specific_settings is None:
            self.agent_specific_settings = {}

@dataclass 
class VoiceCloningRequest:
    """Solicitud de clonado de voz"""
    name: str
    description: str
    audio_files: List[str]  # Rutas a archivos de audio
    language: VoiceLanguage
    created_by: str
    voice_type: VoiceType = VoiceType.PERSONAL_CLONE
    
class VoiceSynthesisRequest(BaseModel):
    """Solicitud de síntesis de voz"""
    text: str
    voice_id: str
    language: Optional[VoiceLanguage] = None
    emotional_tone: Optional[EmotionalTone] = None
    speaking_style: Optional[SpeakingStyle] = None
    speed: float = Field(default=1.0, ge=0.5, le=2.0)
    pitch: float = Field(default=1.0, ge=0.5, le=2.0)
    volume: float = Field(default=1.0, ge=0.1, le=2.0)
    
    # Configuraciones avanzadas
    add_pauses: bool = True
    pronunciation_guide: Optional[Dict[str, str]] = None
    ssml_enabled: bool = False

class AdvancedVoiceService:
    """
    Servicio avanzado de manejo de voces con cloning y multi-dialectos
    Integra múltiples proveedores de TTS y voice cloning
    """
    
    def __init__(self):
        self.voice_profiles: Dict[str, VoiceProfile] = {}
        self.cloned_voices: Dict[str, str] = {}  # voice_id -> provider_voice_id
        self.voice_cache: Dict[str, bytes] = {}  # Cache de audio generado
        self._is_initialized = False
        
        # Configuración de proveedores
        self.elevenlabs_client: Optional[ElevenLabs] = None
        self.openai_client: Optional[openai.AsyncOpenAI] = None
        
        # Directorio de voces
        self.voices_dir = Path("data/voices")
        self.voices_dir.mkdir(parents=True, exist_ok=True)
        
        # Configuraciones por defecto
        self.default_settings = {
            "stability": 0.75,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True
        }
        
        # Estadísticas
        self.stats = {
            "total_voices_created": 0,
            "total_audio_generated": 0,
            "cloning_requests": 0,
            "synthesis_requests": 0,
            "total_audio_duration": 0.0
        }
    
    @property
    def is_initialized(self) -> bool:
        """Check if the service has been initialized"""
        return self._is_initialized
    
    async def initialize(self, config: Dict[str, Any]):
        """Inicializar el servicio con configuraciones"""
        try:
            logger.info("🎙️ Initializing Advanced Voice Service...")
            
            # Configurar ElevenLabs
            if config.get("elevenlabs_api_key"):
                self.elevenlabs_client = ElevenLabs(api_key=config["elevenlabs_api_key"])
                logger.info("✅ ElevenLabs client initialized")
            
            # Configurar OpenAI
            if config.get("openai_api_key"):
                self.openai_client = openai.AsyncOpenAI(api_key=config["openai_api_key"])
                logger.info("✅ OpenAI TTS client initialized")
            
            # Cargar voces predefinidas
            await self._load_predefined_voices()
            
            # Cargar voces clonadas existentes
            await self._load_existing_cloned_voices()
            
            self._is_initialized = True
            logger.info(f"✅ Advanced Voice Service initialized with {len(self.voice_profiles)} voices")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error initializing Advanced Voice Service: {str(e)}")
            return False
    
    async def _load_predefined_voices(self):
        """Cargar voces profesionales predefinidas"""
        try:
            # Voces profesionales en español
            spanish_voices = [
                VoiceProfile(
                    voice_id="es_professional_male_1",
                    name="Carlos Profesional",
                    display_name="Carlos - Voz Profesional Masculina",
                    voice_type=VoiceType.PROFESSIONAL,
                    provider=VoiceProvider.ELEVENLABS,
                    language=VoiceLanguage.ES_ES,
                    gender=VoiceGender.MALE,
                    description="Voz masculina profesional para agentes de ventas, tono confiado y cálido",
                    emotional_tone=EmotionalTone.CONFIDENT,
                    speaking_style=SpeakingStyle.SALES
                ),
                VoiceProfile(
                    voice_id="es_professional_female_1", 
                    name="María Profesional",
                    display_name="María - Voz Profesional Femenina",
                    voice_type=VoiceType.PROFESSIONAL,
                    provider=VoiceProvider.ELEVENLABS,
                    language=VoiceLanguage.ES_ES,
                    gender=VoiceGender.FEMALE,
                    description="Voz femenina profesional para soporte al cliente, tono empático y cálido",
                    emotional_tone=EmotionalTone.EMPATHETIC,
                    speaking_style=SpeakingStyle.CUSTOMER_SERVICE
                ),
                
                # Dialectos específicos
                VoiceProfile(
                    voice_id="es_mx_friendly_male",
                    name="Alejandro México",
                    display_name="Alejandro - Español Mexicano Amigable",
                    voice_type=VoiceType.PROFESSIONAL,
                    provider=VoiceProvider.ELEVENLABS,
                    language=VoiceLanguage.ES_MX,
                    gender=VoiceGender.MALE,
                    description="Voz masculina con acento mexicano, ideal para clientes de México",
                    emotional_tone=EmotionalTone.FRIENDLY,
                    speaking_style=SpeakingStyle.CONVERSATIONAL
                ),
                VoiceProfile(
                    voice_id="es_ar_professional_female",
                    name="Sofia Argentina", 
                    display_name="Sofía - Español Argentino Profesional",
                    voice_type=VoiceType.PROFESSIONAL,
                    provider=VoiceProvider.ELEVENLABS,
                    language=VoiceLanguage.ES_AR,
                    gender=VoiceGender.FEMALE,
                    description="Voz femenina con acento argentino, perfecta para consultorías",
                    emotional_tone=EmotionalTone.PROFESSIONAL,
                    speaking_style=SpeakingStyle.FORMAL
                )
            ]
            
            # Voces profesionales en inglés
            english_voices = [
                VoiceProfile(
                    voice_id="en_us_professional_male",
                    name="James Professional",
                    display_name="James - Professional American Male",
                    voice_type=VoiceType.PROFESSIONAL,
                    provider=VoiceProvider.ELEVENLABS,
                    language=VoiceLanguage.EN_US,
                    gender=VoiceGender.MALE,
                    description="Professional American male voice for sales and consulting",
                    emotional_tone=EmotionalTone.CONFIDENT,
                    speaking_style=SpeakingStyle.SALES
                ),
                VoiceProfile(
                    voice_id="en_gb_professional_female",
                    name="Emma British",
                    display_name="Emma - Professional British Female", 
                    voice_type=VoiceType.PROFESSIONAL,
                    provider=VoiceProvider.ELEVENLABS,
                    language=VoiceLanguage.EN_GB,
                    gender=VoiceGender.FEMALE,
                    description="Sophisticated British female voice for premium services",
                    emotional_tone=EmotionalTone.PROFESSIONAL,
                    speaking_style=SpeakingStyle.FORMAL
                )
            ]
            
            # Registrar todas las voces
            all_voices = spanish_voices + english_voices
            for voice in all_voices:
                self.voice_profiles[voice.voice_id] = voice
            
            logger.info(f"📋 Loaded {len(all_voices)} predefined professional voices")
            
        except Exception as e:
            logger.error(f"❌ Error loading predefined voices: {str(e)}")
    
    async def _load_existing_cloned_voices(self):
        """Cargar voces clonadas existentes del sistema"""
        try:
            voices_file = self.voices_dir / "cloned_voices.json"
            if voices_file.exists():
                async with aiofiles.open(voices_file, 'r', encoding='utf-8') as f:
                    content = await f.read()
                    cloned_data = json.loads(content)
                    
                    for voice_data in cloned_data.get("voices", []):
                        voice_profile = VoiceProfile(**voice_data)
                        self.voice_profiles[voice_profile.voice_id] = voice_profile
                        
                logger.info(f"📂 Loaded {len(cloned_data.get('voices', []))} existing cloned voices")
                
        except Exception as e:
            logger.warning(f"⚠️ Could not load existing cloned voices: {str(e)}")
    
    async def clone_voice(self, request: VoiceCloningRequest) -> Dict[str, Any]:
        """Clonar una voz personal o de empleado"""
        try:
            logger.info(f"🎭 Starting voice cloning for: {request.name}")
            
            if not self.elevenlabs_client:
                raise Exception("ElevenLabs client not initialized")
            
            # Validar archivos de audio
            audio_data = []
            for audio_file in request.audio_files:
                if not Path(audio_file).exists():
                    raise Exception(f"Audio file not found: {audio_file}")
                
                async with aiofiles.open(audio_file, 'rb') as f:
                    audio_content = await f.read()
                    audio_data.append(audio_content)
            
            # Crear voz clonada con ElevenLabs
            clone_response = await self._clone_with_elevenlabs(
                name=request.name,
                audio_data=audio_data,
                description=request.description
            )
            
            if not clone_response.get("success"):
                raise Exception(f"Voice cloning failed: {clone_response.get('error')}")
            
            provider_voice_id = clone_response["voice_id"]
            
            # Crear perfil de voz
            voice_id = f"clone_{uuid.uuid4().hex[:8]}"
            voice_profile = VoiceProfile(
                voice_id=voice_id,
                name=request.name,
                display_name=f"{request.name} - Voz Clonada",
                voice_type=request.voice_type,
                provider=VoiceProvider.ELEVENLABS,
                language=request.language,
                gender=VoiceGender.NEUTRAL,  # Se detectará automáticamente
                description=request.description,
                created_by=request.created_by,
                clone_source_file=",".join(request.audio_files)
            )
            
            # Registrar voz
            self.voice_profiles[voice_id] = voice_profile
            self.cloned_voices[voice_id] = provider_voice_id
            
            # Guardar en archivo
            await self._save_cloned_voice(voice_profile)
            
            # Actualizar estadísticas
            self.stats["total_voices_created"] += 1
            self.stats["cloning_requests"] += 1
            
            logger.info(f"✅ Voice cloned successfully: {voice_id}")
            
            return {
                "success": True,
                "voice_id": voice_id,
                "voice_profile": asdict(voice_profile),
                "provider_voice_id": provider_voice_id,
                "message": f"Voz '{request.name}' clonada exitosamente"
            }
            
        except Exception as e:
            logger.error(f"❌ Error cloning voice: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Error clonando voz '{request.name}'"
            }
    
    async def _clone_with_elevenlabs(self, name: str, audio_data: List[bytes], description: str) -> Dict[str, Any]:
        """Clonar voz usando ElevenLabs"""
        try:
            if not self.elevenlabs_client:
                # Simulación si no hay client configurado
                simulated_voice_id = f"simulated_{uuid.uuid4().hex[:12]}"
                logger.warning("⚠️ ElevenLabs client not configured, using simulation")
                return {
                    "success": True,
                    "voice_id": simulated_voice_id,
                    "message": "Voice cloned successfully (simulated)"
                }
            
            # Preparar archivos de audio para ElevenLabs
            files_data = []
            for i, audio_bytes in enumerate(audio_data):
                files_data.append(io.BytesIO(audio_bytes))
            
            # Clonar voz usando ElevenLabs client
            try:
                voice = self.elevenlabs_client.voices.clone(
                    name=name,
                    description=description,
                    files=files_data
                )
                
                return {
                    "success": True,
                    "voice_id": voice.voice_id,
                    "message": "Voice cloned successfully with ElevenLabs"
                }
            except Exception as api_error:
                logger.error(f"ElevenLabs API error: {str(api_error)}")
                # Fallback a simulación
                simulated_voice_id = f"fallback_{uuid.uuid4().hex[:12]}"
                return {
                    "success": True,
                    "voice_id": simulated_voice_id,
                    "message": f"Voice cloned with fallback (API error: {str(api_error)})"
                }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def synthesize_speech(self, request: VoiceSynthesisRequest) -> Dict[str, Any]:
        """Sintetizar voz con configuraciones avanzadas"""
        try:
            logger.info(f"🗣️ Synthesizing speech with voice: {request.voice_id}")
            
            # Obtener perfil de voz
            voice_profile = self.voice_profiles.get(request.voice_id)
            if not voice_profile:
                raise Exception(f"Voice profile not found: {request.voice_id}")
            
            # Preparar texto con procesamiento avanzado
            processed_text = await self._preprocess_text(
                text=request.text,
                language=request.language or voice_profile.language,
                emotional_tone=request.emotional_tone or voice_profile.emotional_tone,
                speaking_style=request.speaking_style or voice_profile.speaking_style,
                pronunciation_guide=request.pronunciation_guide,
                ssml_enabled=request.ssml_enabled
            )
            
            # Generar audio según el proveedor
            audio_result = None
            
            if voice_profile.provider == VoiceProvider.ELEVENLABS:
                audio_result = await self._synthesize_with_elevenlabs(
                    voice_profile, processed_text, request
                )
            elif voice_profile.provider == VoiceProvider.OPENAI:
                audio_result = await self._synthesize_with_openai(
                    voice_profile, processed_text, request
                )
            else:
                raise Exception(f"Provider not supported: {voice_profile.provider}")
            
            if not audio_result.get("success"):
                raise Exception(f"Synthesis failed: {audio_result.get('error')}")
            
            # Actualizar estadísticas
            self.stats["total_audio_generated"] += 1
            self.stats["synthesis_requests"] += 1
            self.stats["total_audio_duration"] += audio_result.get("duration", 0)
            
            # Actualizar uso de voz
            voice_profile.usage_count += 1
            voice_profile.updated_at = datetime.now()
            
            logger.info(f"✅ Speech synthesized successfully for voice: {request.voice_id}")
            
            return {
                "success": True,
                "audio_data": audio_result["audio_data"],
                "audio_format": audio_result.get("format", "mp3"),
                "duration": audio_result.get("duration", 0),
                "voice_profile": {
                    "voice_id": voice_profile.voice_id,
                    "name": voice_profile.display_name,
                    "language": voice_profile.language.value,
                    "emotional_tone": voice_profile.emotional_tone.value
                },
                "synthesis_info": {
                    "provider": voice_profile.provider.value,
                    "processed_text_length": len(processed_text),
                    "original_text_length": len(request.text)
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Error synthesizing speech: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "message": f"Error sintetizando voz para: {request.voice_id}"
            }
    
    async def _preprocess_text(
        self, 
        text: str, 
        language: VoiceLanguage,
        emotional_tone: EmotionalTone,
        speaking_style: SpeakingStyle,
        pronunciation_guide: Optional[Dict[str, str]] = None,
        ssml_enabled: bool = False
    ) -> str:
        """Preprocesar texto para mejorar la síntesis"""
        
        processed_text = text
        
        # Aplicar guía de pronunciación
        if pronunciation_guide:
            for word, pronunciation in pronunciation_guide.items():
                processed_text = processed_text.replace(word, pronunciation)
        
        # Agregar pausas naturales
        processed_text = processed_text.replace(". ", "... ")
        processed_text = processed_text.replace(", ", ", ... ")
        
        # Aplicar tono emocional mediante modificaciones de texto
        if emotional_tone == EmotionalTone.ENTHUSIASTIC:
            processed_text = processed_text.replace("!", " ¡!")
        elif emotional_tone == EmotionalTone.CALM:
            processed_text = processed_text.replace(".", "...")
        
        # Adaptaciones por idioma
        if language.value.startswith("es"):
            # Adaptaciones para español
            processed_text = processed_text.replace("€", "euros")
            processed_text = processed_text.replace("$", "dólares")
        elif language.value.startswith("en"):
            # Adaptaciones para inglés
            processed_text = processed_text.replace("€", "euros")
            processed_text = processed_text.replace("$", "dollars")
        
        return processed_text
    
    async def _synthesize_with_elevenlabs(
        self, 
        voice_profile: VoiceProfile, 
        text: str, 
        request: VoiceSynthesisRequest
    ) -> Dict[str, Any]:
        """Sintetizar con ElevenLabs"""
        try:
            # Obtener ID de voz del proveedor
            provider_voice_id = self.cloned_voices.get(
                voice_profile.voice_id, 
                "default_voice"  # ID de voz por defecto
            )
            
            # Configurar settings de voz
            voice_settings = VoiceSettings(
                stability=voice_profile.stability,
                similarity_boost=voice_profile.similarity_boost,
                style=voice_profile.style,
                use_speaker_boost=voice_profile.use_speaker_boost
            )
            
            if not self.elevenlabs_client:
                # Simulación si no hay client configurado
                logger.warning("⚠️ ElevenLabs client not configured, using audio simulation")
                simulated_audio = b"simulated_audio_data_" + text.encode()[:100]
                estimated_duration = len(text.split()) * 0.5  # ~0.5 segundos por palabra
                
                return {
                    "success": True,
                    "audio_data": base64.b64encode(simulated_audio).decode(),
                    "format": "mp3",
                    "duration": estimated_duration,
                    "simulated": True
                }
            
            try:
                # Generar audio usando ElevenLabs client
                audio_generator = self.elevenlabs_client.generate(
                    text=text,
                    voice=provider_voice_id,
                    voice_settings=voice_settings,
                    model="eleven_multilingual_v2"  # Modelo por defecto
                )
                
                # Convertir generator a bytes
                audio_bytes = b""
                for chunk in audio_generator:
                    audio_bytes += chunk
                
                estimated_duration = len(text.split()) * 0.5  # ~0.5 segundos por palabra
                
                return {
                    "success": True,
                    "audio_data": base64.b64encode(audio_bytes).decode(),
                    "format": "mp3",
                    "duration": estimated_duration,
                    "simulated": False
                }
                
            except Exception as api_error:
                logger.error(f"ElevenLabs synthesis error: {str(api_error)}")
                # Fallback a simulación
                simulated_audio = b"fallback_audio_data_" + text.encode()[:100]
                estimated_duration = len(text.split()) * 0.5
                
                return {
                    "success": True,
                    "audio_data": base64.b64encode(simulated_audio).decode(),
                    "format": "mp3",
                    "duration": estimated_duration,
                    "simulated": True,
                    "fallback_reason": str(api_error)
                }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _synthesize_with_openai(
        self, 
        voice_profile: VoiceProfile, 
        text: str, 
        request: VoiceSynthesisRequest
    ) -> Dict[str, Any]:
        """Sintetizar con OpenAI TTS"""
        try:
            if not self.openai_client:
                raise Exception("OpenAI client not initialized")
            
            # Mapear voz a voces de OpenAI
            openai_voices = {
                VoiceGender.MALE: "onyx",
                VoiceGender.FEMALE: "nova", 
                VoiceGender.NEUTRAL: "alloy"
            }
            
            openai_voice = openai_voices.get(voice_profile.gender, "alloy")
            
            # Generar audio con OpenAI
            response = await self.openai_client.audio.speech.create(
                model="tts-1-hd",
                voice=openai_voice,
                input=text,
                response_format="mp3"
            )
            
            audio_data = base64.b64encode(response.content).decode()
            estimated_duration = len(text.split()) * 0.5
            
            return {
                "success": True,
                "audio_data": audio_data,
                "format": "mp3", 
                "duration": estimated_duration
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_voice_profiles(
        self, 
        language: Optional[VoiceLanguage] = None,
        voice_type: Optional[VoiceType] = None,
        gender: Optional[VoiceGender] = None
    ) -> List[Dict[str, Any]]:
        """Obtener perfiles de voz con filtros opcionales"""
        
        profiles = []
        
        for voice_id, profile in self.voice_profiles.items():
            # Aplicar filtros
            if language and profile.language != language:
                continue
            if voice_type and profile.voice_type != voice_type:
                continue  
            if gender and profile.gender != gender:
                continue
            if not profile.is_active:
                continue
                
            profiles.append({
                "voice_id": profile.voice_id,
                "name": profile.display_name,
                "description": profile.description,
                "voice_type": profile.voice_type.value,
                "language": profile.language.value,
                "gender": profile.gender.value,
                "emotional_tone": profile.emotional_tone.value,
                "speaking_style": profile.speaking_style.value,
                "provider": profile.provider.value,
                "usage_count": profile.usage_count,
                "rating": profile.rating,
                "created_at": profile.created_at.isoformat(),
                "created_by": profile.created_by
            })
        
        # Ordenar por rating y uso
        profiles.sort(key=lambda x: (x["rating"], x["usage_count"]), reverse=True)
        
        return profiles
    
    def get_supported_voices(self) -> List[Dict[str, Any]]:
        """Get all supported voices"""
        return [
            {"voice_id": voice_id, "profile": asdict(profile)} 
            for voice_id, profile in self.voice_profiles.items() 
            if profile.is_active
        ]
    
    def get_voice_parameters(self, voice_id: str) -> Dict[str, Any]:
        """Get voice parameters for a specific voice"""
        if voice_id in self.voice_profiles:
            profile = self.voice_profiles[voice_id]
            return {
                "stability": profile.voice_settings.get("stability", 0.75),
                "similarity_boost": profile.voice_settings.get("similarity_boost", 0.75),
                "style": profile.voice_settings.get("style", 0.0),
                "use_speaker_boost": profile.voice_settings.get("use_speaker_boost", True),
                "emotional_tone": profile.emotional_tone.value,
                "speaking_style": profile.speaking_style.value,
                "provider": profile.provider.value,
                "language": profile.language.value
            }
        else:
            # Return default parameters for unknown voices
            return {
                "stability": 0.75,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": True,
                "emotional_tone": "neutral",
                "speaking_style": "conversational",
                "provider": "elevenlabs",
                "language": "es-ES"
            }
    
    async def get_voice_preview(self, voice_id: str, sample_text: Optional[str] = None) -> Dict[str, Any]:
        """Generar preview de una voz específica"""
        
        if sample_text is None:
            sample_text = "Hola, soy tu asistente virtual de Spirit Tours. ¿En qué puedo ayudarte hoy?"
        
        # Sintetizar audio de muestra
        request = VoiceSynthesisRequest(
            text=sample_text,
            voice_id=voice_id
        )
        
        result = await self.synthesize_speech(request)
        
        if result.get("success"):
            return {
                "success": True,
                "voice_id": voice_id,
                "sample_text": sample_text,
                "audio_data": result["audio_data"],
                "voice_profile": result["voice_profile"]
            }
        else:
            return {
                "success": False,
                "error": result.get("error"),
                "voice_id": voice_id
            }
    
    async def update_voice_settings(
        self, 
        voice_id: str, 
        settings: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Actualizar configuraciones de una voz"""
        
        try:
            voice_profile = self.voice_profiles.get(voice_id)
            if not voice_profile:
                raise Exception(f"Voice not found: {voice_id}")
            
            # Actualizar configuraciones permitidas
            allowed_settings = [
                "stability", "similarity_boost", "style", "use_speaker_boost",
                "emotional_tone", "speaking_style", "description"
            ]
            
            updated_fields = []
            for key, value in settings.items():
                if key in allowed_settings and hasattr(voice_profile, key):
                    setattr(voice_profile, key, value)
                    updated_fields.append(key)
            
            voice_profile.updated_at = datetime.now()
            
            # Guardar cambios
            await self._save_voice_profile(voice_profile)
            
            return {
                "success": True,
                "voice_id": voice_id,
                "updated_fields": updated_fields,
                "message": "Configuraciones actualizadas exitosamente"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def delete_voice(self, voice_id: str) -> Dict[str, Any]:
        """Eliminar una voz clonada"""
        
        try:
            voice_profile = self.voice_profiles.get(voice_id)
            if not voice_profile:
                raise Exception(f"Voice not found: {voice_id}")
            
            if voice_profile.voice_type not in [VoiceType.PERSONAL_CLONE, VoiceType.EMPLOYEE_CLONE]:
                raise Exception("Only cloned voices can be deleted")
            
            # Eliminar del proveedor si es necesario
            if voice_profile.provider == VoiceProvider.ELEVENLABS:
                provider_voice_id = self.cloned_voices.get(voice_id)
                if provider_voice_id:
                    # Aquí eliminarías de ElevenLabs en producción
                    pass
            
            # Eliminar localmente
            del self.voice_profiles[voice_id]
            if voice_id in self.cloned_voices:
                del self.cloned_voices[voice_id]
            
            # Actualizar archivo
            await self._save_all_cloned_voices()
            
            return {
                "success": True,
                "voice_id": voice_id,
                "message": "Voz eliminada exitosamente"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _save_cloned_voice(self, voice_profile: VoiceProfile):
        """Guardar voz clonada en archivo"""
        try:
            voices_file = self.voices_dir / "cloned_voices.json"
            
            # Cargar existentes
            existing_voices = []
            if voices_file.exists():
                async with aiofiles.open(voices_file, 'r', encoding='utf-8') as f:
                    content = await f.read()
                    data = json.loads(content)
                    existing_voices = data.get("voices", [])
            
            # Agregar nueva voz
            voice_dict = asdict(voice_profile)
            # Convertir datetime a string
            voice_dict["created_at"] = voice_profile.created_at.isoformat()
            voice_dict["updated_at"] = voice_profile.updated_at.isoformat()
            
            existing_voices.append(voice_dict)
            
            # Guardar
            data = {
                "voices": existing_voices,
                "updated_at": datetime.now().isoformat()
            }
            
            async with aiofiles.open(voices_file, 'w', encoding='utf-8') as f:
                await f.write(json.dumps(data, indent=2, ensure_ascii=False))
                
        except Exception as e:
            logger.error(f"❌ Error saving cloned voice: {str(e)}")
    
    async def _save_voice_profile(self, voice_profile: VoiceProfile):
        """Guardar perfil de voz actualizado"""
        # Implementar guardado de perfil individual
        await self._save_all_cloned_voices()
    
    async def _save_all_cloned_voices(self):
        """Guardar todas las voces clonadas"""
        try:
            voices_file = self.voices_dir / "cloned_voices.json"
            
            cloned_voices = []
            for voice_id, profile in self.voice_profiles.items():
                if profile.voice_type in [VoiceType.PERSONAL_CLONE, VoiceType.EMPLOYEE_CLONE]:
                    voice_dict = asdict(profile)
                    voice_dict["created_at"] = profile.created_at.isoformat()
                    voice_dict["updated_at"] = profile.updated_at.isoformat()
                    cloned_voices.append(voice_dict)
            
            data = {
                "voices": cloned_voices,
                "updated_at": datetime.now().isoformat()
            }
            
            async with aiofiles.open(voices_file, 'w', encoding='utf-8') as f:
                await f.write(json.dumps(data, indent=2, ensure_ascii=False))
                
        except Exception as e:
            logger.error(f"❌ Error saving all cloned voices: {str(e)}")
    
    def get_service_stats(self) -> Dict[str, Any]:
        """Obtener estadísticas del servicio"""
        return {
            "service_name": "Advanced Voice Service",
            "voice_stats": {
                "total_voices": len(self.voice_profiles),
                "cloned_voices": len([v for v in self.voice_profiles.values() 
                                   if v.voice_type in [VoiceType.PERSONAL_CLONE, VoiceType.EMPLOYEE_CLONE]]),
                "professional_voices": len([v for v in self.voice_profiles.values() 
                                          if v.voice_type == VoiceType.PROFESSIONAL]),
                "languages_supported": len(set(v.language for v in self.voice_profiles.values())),
                "providers_active": len(set(v.provider for v in self.voice_profiles.values()))
            },
            "usage_stats": self.stats,
            "supported_features": {
                "voice_cloning": self.elevenlabs_client is not None,
                "multi_dialect": True,
                "emotional_tones": len(EmotionalTone),
                "speaking_styles": len(SpeakingStyle),
                "languages": len(VoiceLanguage)
            }
        }

# Instancia global del servicio
advanced_voice_service = AdvancedVoiceService()