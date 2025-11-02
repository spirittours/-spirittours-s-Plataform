"""
Translation Models

Pydantic models for translation requests and responses.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class TranslationKey(BaseModel):
    """Single translation key with values for all languages"""
    key: str = Field(..., description="Translation key (e.g., 'common.welcome')")
    namespace: str = Field(default="translation", description="Translation namespace")
    translations: Dict[str, str] = Field(..., description="Translations by language code")
    
    class Config:
        json_schema_extra = {
            "example": {
                "key": "common.welcome",
                "namespace": "translation",
                "translations": {
                    "en": "Welcome",
                    "es": "Bienvenido",
                    "he": "ברוך הבא",
                    "ar": "أهلا بك",
                    "fr": "Bienvenue",
                    "de": "Willkommen"
                }
            }
        }


class TranslationUpdateRequest(BaseModel):
    """Request to update translations"""
    namespace: str = Field(default="translation", description="Translation namespace")
    language: str = Field(..., description="Language code (e.g., 'en', 'es')")
    updates: Dict[str, str] = Field(..., description="Key-value pairs to update")
    
    class Config:
        json_schema_extra = {
            "example": {
                "namespace": "translation",
                "language": "en",
                "updates": {
                    "common.welcome": "Welcome to Spirit Tours",
                    "common.login": "Sign In"
                }
            }
        }


class TranslationResponse(BaseModel):
    """Response with translation data"""
    namespace: str
    language: str
    translations: Dict[str, str]
    total_keys: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "namespace": "translation",
                "language": "en",
                "translations": {
                    "common.welcome": "Welcome",
                    "common.login": "Login"
                },
                "total_keys": 2
            }
        }


class LanguageInfo(BaseModel):
    """Information about a supported language"""
    code: str = Field(..., description="Language code (e.g., 'en', 'es')")
    name: str = Field(..., description="Language name in English")
    native_name: str = Field(..., description="Language name in native language")
    direction: str = Field(..., description="Text direction: 'ltr' or 'rtl'")
    is_rtl: bool = Field(..., description="Whether the language is right-to-left")
    
    class Config:
        json_schema_extra = {
            "example": {
                "code": "he",
                "name": "Hebrew",
                "native_name": "עברית",
                "direction": "rtl",
                "is_rtl": True
            }
        }


class LanguagesResponse(BaseModel):
    """Response with list of supported languages"""
    languages: List[LanguageInfo]
    total: int
    default_language: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "languages": [
                    {
                        "code": "en",
                        "name": "English",
                        "native_name": "English",
                        "direction": "ltr",
                        "is_rtl": False
                    }
                ],
                "total": 6,
                "default_language": "en"
            }
        }


class MissingTranslationsResponse(BaseModel):
    """Response with missing translations"""
    language: str
    namespace: str
    missing_keys: List[str]
    total_missing: int
    completion_percentage: float
    
    class Config:
        json_schema_extra = {
            "example": {
                "language": "fr",
                "namespace": "translation",
                "missing_keys": ["tours.new_feature", "booking.confirmation"],
                "total_missing": 2,
                "completion_percentage": 95.5
            }
        }


class TranslationStatistics(BaseModel):
    """Statistics about translations"""
    total_keys: int
    total_languages: int
    translations_by_language: Dict[str, int]
    completion_by_language: Dict[str, float]
    missing_translations: Dict[str, List[str]]
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_keys": 150,
                "total_languages": 6,
                "translations_by_language": {
                    "en": 150,
                    "es": 148,
                    "he": 145
                },
                "completion_by_language": {
                    "en": 100.0,
                    "es": 98.7,
                    "he": 96.7
                },
                "missing_translations": {
                    "es": ["tours.new_feature"],
                    "he": ["tours.new_feature", "booking.promo"]
                }
            }
        }
