"""
Translation Management API

API endpoints for managing translations and language resources.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Header, Query
from fastapi.responses import JSONResponse

from backend.i18n.translation_service import translation_service
from backend.i18n.translation_models import (
    TranslationUpdateRequest,
    TranslationResponse,
    LanguagesResponse,
    LanguageInfo,
    MissingTranslationsResponse,
    TranslationStatistics
)


router = APIRouter(prefix='/api/translations', tags=['translations'])


@router.get('/languages', response_model=LanguagesResponse)
async def get_supported_languages():
    """
    Get list of all supported languages.
    
    Returns information about each supported language including:
    - Language code
    - Language name (in English and native)
    - Text direction (LTR/RTL)
    
    **Example Response:**
    ```json
    {
        "languages": [
            {
                "code": "en",
                "name": "English",
                "native_name": "English",
                "direction": "ltr",
                "is_rtl": false
            },
            {
                "code": "he",
                "name": "Hebrew",
                "native_name": "עברית",
                "direction": "rtl",
                "is_rtl": true
            }
        ],
        "total": 6,
        "default_language": "en"
    }
    ```
    """
    languages = translation_service.get_supported_languages()
    
    return LanguagesResponse(
        languages=[LanguageInfo(**lang) for lang in languages],
        total=len(languages),
        default_language=translation_service.DEFAULT_LANGUAGE
    )


@router.get('/{language}', response_model=TranslationResponse)
async def get_translations(
    language: str,
    namespace: str = Query(default='translation', description='Translation namespace')
):
    """
    Get all translations for a specific language.
    
    **Parameters:**
    - `language`: Language code (e.g., 'en', 'es', 'he')
    - `namespace`: Translation namespace (default: 'translation')
    
    **Example Response:**
    ```json
    {
        "namespace": "translation",
        "language": "en",
        "translations": {
            "common": {
                "welcome": "Welcome",
                "login": "Login"
            },
            "tours": {
                "title": "Discover Amazing Tours"
            }
        },
        "total_keys": 150
    }
    ```
    """
    translations = translation_service.load_translations(language, namespace)
    all_keys = translation_service.get_all_keys(translations)
    
    return TranslationResponse(
        namespace=namespace,
        language=language,
        translations=translations,
        total_keys=len(all_keys)
    )


@router.put('/{language}', response_model=TranslationResponse)
async def update_translations(
    language: str,
    request: TranslationUpdateRequest
):
    """
    Update translations for a specific language.
    
    **Parameters:**
    - `language`: Language code to update
    - `request`: Translation update request with key-value pairs
    
    **Request Body:**
    ```json
    {
        "namespace": "translation",
        "language": "en",
        "updates": {
            "common.welcome": "Welcome to Spirit Tours",
            "tours.new_feature": "New Feature"
        }
    }
    ```
    
    **Response:**
    Returns the complete updated translations for the language.
    
    **Note:** This endpoint requires admin authentication (not implemented yet).
    """
    # TODO: Add authentication check for admin users
    
    translations = translation_service.update_translations(
        language=language,
        updates=request.updates,
        namespace=request.namespace
    )
    
    all_keys = translation_service.get_all_keys(translations)
    
    return TranslationResponse(
        namespace=request.namespace,
        language=language,
        translations=translations,
        total_keys=len(all_keys)
    )


@router.get('/{language}/missing', response_model=MissingTranslationsResponse)
async def get_missing_translations(
    language: str,
    namespace: str = Query(default='translation', description='Translation namespace')
):
    """
    Get list of missing translations for a language.
    
    Compares the specified language against the default language (English)
    and returns all translation keys that are missing.
    
    **Parameters:**
    - `language`: Language code to check
    - `namespace`: Translation namespace (default: 'translation')
    
    **Example Response:**
    ```json
    {
        "language": "fr",
        "namespace": "translation",
        "missing_keys": [
            "tours.new_feature",
            "booking.confirmation_email"
        ],
        "total_missing": 2,
        "completion_percentage": 98.5
    }
    ```
    """
    if language == translation_service.DEFAULT_LANGUAGE:
        return MissingTranslationsResponse(
            language=language,
            namespace=namespace,
            missing_keys=[],
            total_missing=0,
            completion_percentage=100.0
        )
    
    missing_keys = translation_service.get_missing_translations(language, namespace)
    
    # Calculate completion percentage
    default_translations = translation_service.load_translations(
        translation_service.DEFAULT_LANGUAGE,
        namespace
    )
    total_keys = len(translation_service.get_all_keys(default_translations))
    existing_keys = total_keys - len(missing_keys)
    completion = (existing_keys / total_keys * 100) if total_keys > 0 else 0.0
    
    return MissingTranslationsResponse(
        language=language,
        namespace=namespace,
        missing_keys=missing_keys,
        total_missing=len(missing_keys),
        completion_percentage=round(completion, 2)
    )


@router.get('/statistics', response_model=TranslationStatistics)
async def get_translation_statistics(
    namespace: str = Query(default='translation', description='Translation namespace')
):
    """
    Get statistics about translations for all languages.
    
    Provides comprehensive statistics including:
    - Total number of translation keys
    - Number of translations per language
    - Completion percentage per language
    - List of missing translations per language
    
    **Parameters:**
    - `namespace`: Translation namespace (default: 'translation')
    
    **Example Response:**
    ```json
    {
        "total_keys": 150,
        "total_languages": 6,
        "translations_by_language": {
            "en": 150,
            "es": 148,
            "he": 145,
            "ar": 145,
            "fr": 140,
            "de": 138
        },
        "completion_by_language": {
            "en": 100.0,
            "es": 98.7,
            "he": 96.7,
            "ar": 96.7,
            "fr": 93.3,
            "de": 92.0
        },
        "missing_translations": {
            "es": ["tours.new_feature"],
            "he": ["tours.new_feature", "booking.promo"],
            "ar": ["tours.new_feature", "booking.promo"],
            "fr": ["tours.new_feature", "booking.promo", "..."],
            "de": ["tours.new_feature", "booking.promo", "..."]
        }
    }
    ```
    """
    stats = translation_service.get_translation_statistics(namespace)
    
    return TranslationStatistics(**stats)


@router.post('/detect-language')
async def detect_language(
    accept_language: Optional[str] = Header(None, alias='Accept-Language')
):
    """
    Detect preferred language from Accept-Language header.
    
    Parses the Accept-Language header and returns the most preferred
    supported language based on quality values.
    
    **Headers:**
    - `Accept-Language`: Browser language preferences (e.g., "en-US,en;q=0.9,es;q=0.8")
    
    **Example Response:**
    ```json
    {
        "detected_language": "en",
        "default_language": "en",
        "supported_languages": ["en", "es", "he", "ar", "fr", "de"]
    }
    ```
    """
    detected = translation_service.detect_language_from_header(accept_language)
    
    return {
        'detected_language': detected,
        'default_language': translation_service.DEFAULT_LANGUAGE,
        'supported_languages': list(translation_service.SUPPORTED_LANGUAGES.keys())
    }


@router.post('/clear-cache')
async def clear_translation_cache():
    """
    Clear the translation cache.
    
    Forces reloading of all translation files from disk on next request.
    Useful after updating translation files manually.
    
    **Note:** This endpoint requires admin authentication (not implemented yet).
    
    **Example Response:**
    ```json
    {
        "message": "Translation cache cleared successfully"
    }
    ```
    """
    # TODO: Add authentication check for admin users
    
    translation_service.clear_cache()
    
    return {
        'message': 'Translation cache cleared successfully'
    }


@router.get('/health')
async def translation_health_check():
    """
    Health check endpoint for translation service.
    
    Verifies that:
    - Translation service is running
    - Default language translations are accessible
    - Translation directory is readable
    
    **Example Response:**
    ```json
    {
        "status": "healthy",
        "service": "translation",
        "default_language": "en",
        "total_languages": 6,
        "translations_accessible": true
    }
    ```
    """
    try:
        # Try to load default language translations
        translation_service.load_translations(translation_service.DEFAULT_LANGUAGE)
        
        languages = translation_service.get_supported_languages()
        
        return {
            'status': 'healthy',
            'service': 'translation',
            'default_language': translation_service.DEFAULT_LANGUAGE,
            'total_languages': len(languages),
            'translations_accessible': True
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                'status': 'unhealthy',
                'service': 'translation',
                'error': str(e),
                'translations_accessible': False
            }
        )
