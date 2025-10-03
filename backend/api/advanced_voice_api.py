"""
Advanced Voice API - Spirit Tours Omnichannel Platform
API REST para gestión avanzada de voces, cloning y multi-dialectos
"""

from fastapi import APIRouter, HTTPException, File, UploadFile, Form, BackgroundTasks, Depends
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
import json
import base64
import tempfile
import os

from ..services.advanced_voice_service import (
    advanced_voice_service,
    VoiceProfile,
    VoiceCloningRequest,
    VoiceSynthesisRequest,
    VoiceType,
    VoiceLanguage,
    VoiceGender,
    EmotionalTone,
    SpeakingStyle,
    VoiceProvider
)

# Configure logging
logger = logging.getLogger(__name__)

# Create API router
router = APIRouter(
    prefix="/api/v1/advanced-voice",
    tags=["Advanced Voice Management"],
    responses={
        404: {"description": "Not found"},
        500: {"description": "Internal server error"}
    }
)

# ============== REQUEST/RESPONSE MODELS ==============

class VoiceCloningRequestAPI(BaseModel):
    """Modelo API para clonado de voz"""
    name: str = Field(..., description="Nombre de la voz")
    description: str = Field(..., description="Descripción de la voz")
    language: VoiceLanguage = Field(..., description="Idioma de la voz")
    voice_type: VoiceType = Field(default=VoiceType.PERSONAL_CLONE, description="Tipo de voz")
    created_by: str = Field(..., description="Usuario que crea la voz")

class VoiceUpdateRequest(BaseModel):
    """Modelo para actualizar configuraciones de voz"""
    stability: Optional[float] = Field(None, ge=0.0, le=1.0)
    similarity_boost: Optional[float] = Field(None, ge=0.0, le=1.0)
    style: Optional[float] = Field(None, ge=0.0, le=1.0)
    use_speaker_boost: Optional[bool] = None
    emotional_tone: Optional[EmotionalTone] = None
    speaking_style: Optional[SpeakingStyle] = None
    description: Optional[str] = None

class VoicePreviewRequest(BaseModel):
    """Modelo para generar preview de voz"""
    voice_id: str
    sample_text: Optional[str] = None

class BulkSynthesisRequest(BaseModel):
    """Modelo para síntesis masiva de voz"""
    texts: List[str] = Field(..., description="Lista de textos a sintetizar")
    voice_id: str = Field(..., description="ID de la voz a usar")
    language: Optional[VoiceLanguage] = None
    emotional_tone: Optional[EmotionalTone] = None
    speaking_style: Optional[SpeakingStyle] = None

# ============== VOICE CLONING ENDPOINTS ==============

@router.post("/clone-voice", response_model=Dict[str, Any])
async def clone_voice(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    description: str = Form(...),
    language: VoiceLanguage = Form(...),
    voice_type: VoiceType = Form(VoiceType.PERSONAL_CLONE),
    created_by: str = Form(...),
    audio_files: List[UploadFile] = File(...)
):
    """
    Clonar una voz personal o de empleado
    
    Requiere 1-5 archivos de audio de alta calidad (WAV/MP3, mínimo 30 segundos cada uno)
    """
    try:
        if not audio_files or len(audio_files) == 0:
            raise HTTPException(status_code=400, detail="Se requiere al menos un archivo de audio")
        
        if len(audio_files) > 5:
            raise HTTPException(status_code=400, detail="Máximo 5 archivos de audio permitidos")
        
        # Validar archivos de audio
        allowed_formats = ['.wav', '.mp3', '.m4a', '.flac']
        temp_files = []
        
        try:
            for upload_file in audio_files:
                # Validar formato
                file_extension = os.path.splitext(upload_file.filename)[1].lower()
                if file_extension not in allowed_formats:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Formato no soportado: {file_extension}. Formatos permitidos: {allowed_formats}"
                    )
                
                # Validar tamaño (máximo 50MB por archivo)
                content = await upload_file.read()
                if len(content) > 50 * 1024 * 1024:  # 50MB
                    raise HTTPException(status_code=400, detail=f"Archivo muy grande: {upload_file.filename}")
                
                # Guardar temporalmente
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_extension)
                temp_file.write(content)
                temp_file.close()
                temp_files.append(temp_file.name)
            
            # Crear solicitud de clonado
            cloning_request = VoiceCloningRequest(
                name=name,
                description=description,
                audio_files=temp_files,
                language=language,
                voice_type=voice_type,
                created_by=created_by
            )
            
            # Procesar clonado en background
            background_tasks.add_task(
                _process_voice_cloning,
                cloning_request,
                temp_files
            )
            
            return {
                "status": "processing",
                "message": f"Iniciando clonado de voz '{name}'. El proceso puede tardar 2-5 minutos.",
                "request_info": {
                    "name": name,
                    "audio_files_count": len(audio_files),
                    "language": language.value,
                    "voice_type": voice_type.value
                },
                "estimated_completion": "2-5 minutos"
            }
            
        except HTTPException:
            # Limpiar archivos temporales en caso de error
            for temp_file in temp_files:
                try:
                    os.unlink(temp_file)
                except:
                    pass
            raise
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in clone voice endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error procesando clonado de voz: {str(e)}")

async def _process_voice_cloning(request: VoiceCloningRequest, temp_files: List[str]):
    """Procesar clonado de voz en background"""
    try:
        logger.info(f"🎭 Processing voice cloning for: {request.name}")
        
        # Ejecutar clonado
        result = await advanced_voice_service.clone_voice(request)
        
        if result.get("success"):
            logger.info(f"✅ Voice cloning completed successfully: {result['voice_id']}")
        else:
            logger.error(f"❌ Voice cloning failed: {result.get('error')}")
            
    except Exception as e:
        logger.error(f"❌ Error processing voice cloning: {str(e)}")
    finally:
        # Limpiar archivos temporales
        for temp_file in temp_files:
            try:
                os.unlink(temp_file)
            except:
                pass

@router.get("/clone-status/{voice_id}", response_model=Dict[str, Any])
async def get_clone_status(voice_id: str):
    """Obtener estado de un proceso de clonado"""
    try:
        # Verificar si existe la voz
        profiles = await advanced_voice_service.get_voice_profiles()
        voice_found = None
        
        for profile in profiles:
            if profile["voice_id"] == voice_id:
                voice_found = profile
                break
        
        if voice_found:
            return {
                "status": "completed",
                "voice_id": voice_id,
                "voice_profile": voice_found,
                "message": "Clonado completado exitosamente"
            }
        else:
            return {
                "status": "processing",
                "voice_id": voice_id,
                "message": "Clonado en proceso o no encontrado"
            }
            
    except Exception as e:
        logger.error(f"❌ Error getting clone status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== VOICE MANAGEMENT ENDPOINTS ==============

@router.get("/voices", response_model=Dict[str, Any])
async def get_voices(
    language: Optional[VoiceLanguage] = None,
    voice_type: Optional[VoiceType] = None,
    gender: Optional[VoiceGender] = None,
    search: Optional[str] = None
):
    """Obtener lista de voces disponibles con filtros opcionales"""
    try:
        profiles = await advanced_voice_service.get_voice_profiles(
            language=language,
            voice_type=voice_type,
            gender=gender
        )
        
        # Filtrar por búsqueda de texto
        if search:
            search_lower = search.lower()
            profiles = [
                p for p in profiles 
                if search_lower in p["name"].lower() or search_lower in p["description"].lower()
            ]
        
        # Agrupar por categorías
        grouped_voices = {
            "personal_clones": [p for p in profiles if p["voice_type"] == "personal_clone"],
            "employee_clones": [p for p in profiles if p["voice_type"] == "employee_clone"],
            "professional_voices": [p for p in profiles if p["voice_type"] == "professional"],
            "synthetic_voices": [p for p in profiles if p["voice_type"] == "synthetic"]
        }
        
        # Estadísticas
        language_stats = {}
        for profile in profiles:
            lang = profile["language"]
            language_stats[lang] = language_stats.get(lang, 0) + 1
        
        return {
            "status": "success",
            "total_voices": len(profiles),
            "voices": profiles,
            "grouped_voices": grouped_voices,
            "statistics": {
                "by_language": language_stats,
                "by_type": {
                    "personal_clones": len(grouped_voices["personal_clones"]),
                    "employee_clones": len(grouped_voices["employee_clones"]),
                    "professional_voices": len(grouped_voices["professional_voices"]),
                    "synthetic_voices": len(grouped_voices["synthetic_voices"])
                }
            },
            "available_filters": {
                "languages": [lang.value for lang in VoiceLanguage],
                "voice_types": [vt.value for vt in VoiceType],
                "genders": [g.value for g in VoiceGender],
                "emotional_tones": [et.value for et in EmotionalTone],
                "speaking_styles": [ss.value for ss in SpeakingStyle]
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting voices: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/voices/{voice_id}", response_model=Dict[str, Any])
async def get_voice_details(voice_id: str):
    """Obtener detalles completos de una voz específica"""
    try:
        profiles = await advanced_voice_service.get_voice_profiles()
        voice_profile = None
        
        for profile in profiles:
            if profile["voice_id"] == voice_id:
                voice_profile = profile
                break
        
        if not voice_profile:
            raise HTTPException(status_code=404, detail=f"Voice not found: {voice_id}")
        
        return {
            "status": "success",
            "voice_profile": voice_profile,
            "capabilities": {
                "supports_emotional_tones": True,
                "supports_speaking_styles": True,
                "supports_speed_control": True,
                "supports_pitch_control": voice_profile["voice_type"] in ["professional", "synthetic"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting voice details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/voices/{voice_id}", response_model=Dict[str, Any])
async def update_voice_settings(voice_id: str, settings: VoiceUpdateRequest):
    """Actualizar configuraciones de una voz"""
    try:
        # Convertir a diccionario, excluyendo valores None
        settings_dict = settings.dict(exclude_unset=True)
        
        result = await advanced_voice_service.update_voice_settings(voice_id, settings_dict)
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return {
            "status": "success",
            "voice_id": voice_id,
            "updated_settings": result["updated_fields"],
            "message": "Configuraciones actualizadas exitosamente"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating voice settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/voices/{voice_id}", response_model=Dict[str, Any])
async def delete_voice(voice_id: str):
    """Eliminar una voz clonada"""
    try:
        result = await advanced_voice_service.delete_voice(voice_id)
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return {
            "status": "success",
            "voice_id": voice_id,
            "message": "Voz eliminada exitosamente"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting voice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== VOICE SYNTHESIS ENDPOINTS ==============

@router.post("/synthesize", response_model=Dict[str, Any])
async def synthesize_speech(request: VoiceSynthesisRequest):
    """Sintetizar voz con configuraciones avanzadas"""
    try:
        if len(request.text) > 5000:
            raise HTTPException(status_code=400, detail="Texto muy largo (máximo 5000 caracteres)")
        
        result = await advanced_voice_service.synthesize_speech(request)
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return {
            "status": "success",
            "audio_data": result["audio_data"],
            "audio_format": result["audio_format"],
            "duration": result["duration"],
            "voice_info": result["voice_profile"],
            "synthesis_info": result["synthesis_info"],
            "text_stats": {
                "original_length": len(request.text),
                "word_count": len(request.text.split()),
                "estimated_speaking_time": f"{result['duration']:.1f} seconds"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error synthesizing speech: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/synthesize-bulk", response_model=Dict[str, Any])
async def synthesize_bulk(request: BulkSynthesisRequest, background_tasks: BackgroundTasks):
    """Sintetizar múltiples textos en lote"""
    try:
        if len(request.texts) > 50:
            raise HTTPException(status_code=400, detail="Máximo 50 textos por lote")
        
        total_chars = sum(len(text) for text in request.texts)
        if total_chars > 20000:
            raise HTTPException(status_code=400, detail="Demasiados caracteres en total (máximo 20,000)")
        
        # Procesar en background
        background_tasks.add_task(
            _process_bulk_synthesis,
            request
        )
        
        return {
            "status": "processing",
            "message": f"Procesando síntesis de {len(request.texts)} textos",
            "batch_info": {
                "text_count": len(request.texts),
                "total_characters": total_chars,
                "voice_id": request.voice_id,
                "estimated_completion": f"{len(request.texts) * 2} seconds"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error in bulk synthesis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def _process_bulk_synthesis(request: BulkSynthesisRequest):
    """Procesar síntesis masiva en background"""
    try:
        logger.info(f"🔄 Processing bulk synthesis: {len(request.texts)} texts")
        
        results = []
        for i, text in enumerate(request.texts):
            synthesis_request = VoiceSynthesisRequest(
                text=text,
                voice_id=request.voice_id,
                language=request.language,
                emotional_tone=request.emotional_tone,
                speaking_style=request.speaking_style
            )
            
            result = await advanced_voice_service.synthesize_speech(synthesis_request)
            results.append({
                "index": i,
                "success": result.get("success"),
                "audio_data": result.get("audio_data") if result.get("success") else None,
                "error": result.get("error") if not result.get("success") else None
            })
        
        logger.info(f"✅ Bulk synthesis completed: {len(results)} results")
        
        # Aquí podrías guardar los resultados en base de datos o notificar al usuario
        
    except Exception as e:
        logger.error(f"❌ Error in bulk synthesis processing: {str(e)}")

@router.post("/preview", response_model=Dict[str, Any])
async def get_voice_preview(request: VoicePreviewRequest):
    """Generar preview de audio para una voz específica"""
    try:
        result = await advanced_voice_service.get_voice_preview(
            voice_id=request.voice_id,
            sample_text=request.sample_text
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return {
            "status": "success",
            "preview": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating voice preview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== VOICE ANALYSIS ENDPOINTS ==============

@router.get("/analysis/languages", response_model=Dict[str, Any])
async def get_language_analysis():
    """Análisis de idiomas y dialectos disponibles"""
    try:
        profiles = await advanced_voice_service.get_voice_profiles()
        
        language_analysis = {}
        for profile in profiles:
            lang = profile["language"]
            if lang not in language_analysis:
                language_analysis[lang] = {
                    "language_code": lang,
                    "language_name": _get_language_name(lang),
                    "voice_count": 0,
                    "voice_types": set(),
                    "genders": set(),
                    "providers": set()
                }
            
            analysis = language_analysis[lang]
            analysis["voice_count"] += 1
            analysis["voice_types"].add(profile["voice_type"])
            analysis["genders"].add(profile["gender"])
            analysis["providers"].add(profile.get("provider", "unknown"))
        
        # Convertir sets a listas
        for analysis in language_analysis.values():
            analysis["voice_types"] = list(analysis["voice_types"])
            analysis["genders"] = list(analysis["genders"])
            analysis["providers"] = list(analysis["providers"])
        
        return {
            "status": "success",
            "total_languages": len(language_analysis),
            "languages": language_analysis,
            "recommendations": {
                "most_voices": max(language_analysis.keys(), key=lambda k: language_analysis[k]["voice_count"]) if language_analysis else None,
                "least_voices": min(language_analysis.keys(), key=lambda k: language_analysis[k]["voice_count"]) if language_analysis else None
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Error in language analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def _get_language_name(language_code: str) -> str:
    """Obtener nombre amigable del idioma"""
    language_names = {
        "es-ES": "Español de España",
        "es-MX": "Español de México",
        "es-AR": "Español de Argentina",
        "es-CL": "Español de Chile",
        "es-CO": "Español de Colombia",
        "es-PE": "Español de Perú",
        "en-US": "English (United States)",
        "en-GB": "English (United Kingdom)",
        "en-AU": "English (Australia)",
        "en-CA": "English (Canada)",
        "en-IE": "English (Ireland)",
        "fr-FR": "Français (France)",
        "fr-CA": "Français (Canada)",
        "de-DE": "Deutsch (Deutschland)",
        "de-AT": "Deutsch (Österreich)",
        "it-IT": "Italiano (Italia)",
        "pt-BR": "Português (Brasil)",
        "pt-PT": "Português (Portugal)"
    }
    return language_names.get(language_code, language_code)

@router.get("/recommendations/{agent_type}", response_model=Dict[str, Any])
async def get_voice_recommendations(
    agent_type: str,
    customer_language: Optional[VoiceLanguage] = None,
    customer_preference: Optional[str] = None
):
    """Obtener recomendaciones de voz para un tipo de agente específico"""
    try:
        profiles = await advanced_voice_service.get_voice_profiles()
        
        # Filtrar por idioma si se especifica
        if customer_language:
            profiles = [p for p in profiles if p["language"] == customer_language.value]
        
        # Recomendaciones específicas por tipo de agente
        agent_recommendations = {
            "sales": {
                "emotional_tones": [EmotionalTone.CONFIDENT, EmotionalTone.FRIENDLY, EmotionalTone.ENTHUSIASTIC],
                "speaking_styles": [SpeakingStyle.SALES, SpeakingStyle.CONVERSATIONAL],
                "preferred_gender": None
            },
            "support": {
                "emotional_tones": [EmotionalTone.EMPATHETIC, EmotionalTone.CALM, EmotionalTone.PROFESSIONAL],
                "speaking_styles": [SpeakingStyle.CUSTOMER_SERVICE, SpeakingStyle.FORMAL],
                "preferred_gender": None
            },
            "booking": {
                "emotional_tones": [EmotionalTone.PROFESSIONAL, EmotionalTone.FRIENDLY],
                "speaking_styles": [SpeakingStyle.FORMAL, SpeakingStyle.CONVERSATIONAL],
                "preferred_gender": None
            },
            "consultant": {
                "emotional_tones": [EmotionalTone.AUTHORITATIVE, EmotionalTone.PROFESSIONAL, EmotionalTone.WARM],
                "speaking_styles": [SpeakingStyle.EDUCATIONAL, SpeakingStyle.PRESENTATION],
                "preferred_gender": None
            }
        }
        
        agent_config = agent_recommendations.get(agent_type, agent_recommendations["sales"])
        
        # Puntuar voces basado en criterios
        scored_voices = []
        for profile in profiles:
            score = 0
            
            # Puntuación por tono emocional
            if profile["emotional_tone"] in [et.value for et in agent_config["emotional_tones"]]:
                score += 3
            
            # Puntuación por estilo de habla
            if profile["speaking_style"] in [ss.value for ss in agent_config["speaking_styles"]]:
                score += 3
            
            # Puntuación por tipo de voz
            if profile["voice_type"] == "professional":
                score += 2
            elif profile["voice_type"] in ["personal_clone", "employee_clone"]:
                score += 1
            
            # Puntuación por uso y rating
            score += profile["rating"]
            score += min(profile["usage_count"] / 100, 1)  # Máximo 1 punto por uso
            
            scored_voices.append({
                **profile,
                "recommendation_score": score
            })
        
        # Ordenar por puntuación
        scored_voices.sort(key=lambda x: x["recommendation_score"], reverse=True)
        
        return {
            "status": "success",
            "agent_type": agent_type,
            "customer_language": customer_language.value if customer_language else "any",
            "recommendations": scored_voices[:10],  # Top 10
            "criteria_used": {
                "preferred_emotional_tones": [et.value for et in agent_config["emotional_tones"]],
                "preferred_speaking_styles": [ss.value for ss in agent_config["speaking_styles"]],
                "voice_type_preference": "professional > personal_clone > employee_clone > synthetic"
            },
            "total_evaluated": len(profiles)
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting voice recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== SERVICE STATUS ENDPOINTS ==============

@router.get("/status", response_model=Dict[str, Any])
async def get_service_status():
    """Obtener estado del servicio de voz avanzada"""
    try:
        stats = advanced_voice_service.get_service_stats()
        
        return {
            "status": "operational",
            "timestamp": datetime.now().isoformat(),
            "service_info": stats,
            "health_checks": {
                "service_initialized": True,
                "voice_profiles_loaded": len(advanced_voice_service.voice_profiles) > 0,
                "providers_available": {
                    "elevenlabs": advanced_voice_service.elevenlabs_client is not None,
                    "openai": advanced_voice_service.openai_client is not None
                }
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Error getting service status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health", response_model=Dict[str, Any])
async def health_check():
    """Health check específico para Advanced Voice Service"""
    try:
        return {
            "service": "Advanced Voice Service",
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "checks": {
                "service_running": True,
                "voice_profiles_count": len(advanced_voice_service.voice_profiles),
                "cloned_voices_count": len(advanced_voice_service.cloned_voices),
                "cache_size": len(advanced_voice_service.voice_cache)
            },
            "capabilities": {
                "voice_cloning": advanced_voice_service.elevenlabs_client is not None,
                "multi_language_synthesis": True,
                "emotional_tones": len(EmotionalTone),
                "speaking_styles": len(SpeakingStyle)
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Error in health check: {str(e)}")
        return {
            "service": "Advanced Voice Service",
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }