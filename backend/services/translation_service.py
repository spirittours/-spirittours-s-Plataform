"""
Advanced Multi-Language Translation Service
Supports 80+ language variants with dialect-specific translations
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import hashlib
import httpx
from googletrans import Translator as GoogleTranslator
import deepl
import openai
from azure.cognitiveservices.language.textanalytics import TextAnalyticsClient
from azure.core.credentials import AzureKeyCredential

from ..cache.redis_cache import RedisCache
from ..virtual_guide.models_enhanced import SupportedLanguage

logger = logging.getLogger(__name__)

class TranslationService:
    """Comprehensive translation service with multiple providers"""
    
    def __init__(self):
        self.cache = RedisCache()
        self.google_translator = GoogleTranslator()
        
        # Initialize translation providers (keys from environment)
        self.providers = {
            "google": self._translate_google,
            "deepl": self._translate_deepl,
            "openai": self._translate_openai,
            "azure": self._translate_azure,
            "local": self._translate_local  # Fallback local translation
        }
        
        # Language code mappings
        self.language_map = self._init_language_mappings()
        
        # Dialect-specific adjustments
        self.dialect_adjustments = self._init_dialect_adjustments()
        
        # Religious/cultural term dictionaries
        self.specialized_terms = self._init_specialized_terms()
    
    def _init_language_mappings(self) -> Dict[str, str]:
        """Initialize language code mappings for different services"""
        return {
            # English variants
            "en-US": "en",
            "en-GB": "en",
            "en-AU": "en",
            "en-CA": "en",
            "en-IN": "en",
            
            # Spanish variants
            "es-ES": "es",
            "es-MX": "es",
            "es-AR": "es",
            "es-CO": "es",
            "es-PE": "es",
            "es-CL": "es",
            "es-VE": "es",
            
            # Chinese variants
            "zh-CN": "zh-CN",
            "zh-TW": "zh-TW",
            "zh-HK": "zh-HK",
            
            # Arabic variants
            "ar-SA": "ar",
            "ar-EG": "ar",
            "ar-AE": "ar",
            "ar-MA": "ar",
            "ar-DZ": "ar",
            "ar-IQ": "ar",
            "ar-SY": "ar",
            "ar-JO": "ar",
            "ar-LB": "ar",
            
            # French variants
            "fr-FR": "fr",
            "fr-CA": "fr",
            "fr-BE": "fr",
            "fr-CH": "fr",
            "fr-MA": "fr",
            
            # German variants
            "de-DE": "de",
            "de-AT": "de",
            "de-CH": "de",
            
            # Portuguese variants
            "pt-BR": "pt",
            "pt-PT": "pt",
            
            # Dutch variants
            "nl-NL": "nl",
            "nl-BE": "nl",
            
            # Other languages
            "it-IT": "it",
            "ja-JP": "ja",
            "ko-KR": "ko",
            "ru-RU": "ru",
            "hi-IN": "hi",
            "he-IL": "he",
            "tr-TR": "tr",
            "pl-PL": "pl",
            "sv-SE": "sv",
            "no-NO": "no",
            "da-DK": "da",
            "fi-FI": "fi",
            "is-IS": "is",
            "el-GR": "el",
            "th-TH": "th",
            "vi-VN": "vi",
            "id-ID": "id",
            "ms-MY": "ms",
            "ta-IN": "ta",
            "te-IN": "te",
            "bn-BD": "bn",
            "ur-PK": "ur",
            "fa-IR": "fa",
            "uk-UA": "uk",
            "cs-CZ": "cs",
            "hu-HU": "hu",
            "ro-RO": "ro",
            "bg-BG": "bg",
            "hr-HR": "hr",
            "sr-RS": "sr",
            "sk-SK": "sk",
            "sl-SI": "sl",
            "et-EE": "et",
            "lv-LV": "lv",
            "lt-LT": "lt",
            "mt-MT": "mt",
            "ga-IE": "ga",
            "cy-GB": "cy",
            "eu-ES": "eu",
            "ca-ES": "ca",
            "gl-ES": "gl",
            "af-ZA": "af",
            "sw-KE": "sw",
            "am-ET": "am",
            "tl-PH": "tl"
        }
    
    def _init_dialect_adjustments(self) -> Dict[str, Dict[str, str]]:
        """Initialize dialect-specific term adjustments"""
        return {
            # English US vs UK differences
            "en-US_to_en-GB": {
                "elevator": "lift",
                "apartment": "flat",
                "vacation": "holiday",
                "subway": "underground",
                "sidewalk": "pavement",
                "gas": "petrol",
                "restroom": "toilet",
                "truck": "lorry",
                "parking lot": "car park"
            },
            
            # Spanish regional differences
            "es-ES_to_es-MX": {
                "ordenador": "computadora",
                "móvil": "celular",
                "coche": "carro",
                "autobús": "camión",
                "zumo": "jugo",
                "patata": "papa",
                "gafas": "lentes"
            },
            
            # Portuguese PT vs BR
            "pt-PT_to_pt-BR": {
                "autocarro": "ônibus",
                "comboio": "trem",
                "pequeno-almoço": "café da manhã",
                "telemóvel": "celular",
                "ecrã": "tela"
            },
            
            # Chinese simplified vs traditional
            "zh-CN_to_zh-TW": {
                "软件": "軟體",
                "信息": "資訊",
                "网络": "網路",
                "程序": "程式",
                "服务器": "伺服器"
            },
            
            # French regional differences
            "fr-FR_to_fr-CA": {
                "week-end": "fin de semaine",
                "parking": "stationnement",
                "shopping": "magasinage",
                "e-mail": "courriel"
            }
        }
    
    def _init_specialized_terms(self) -> Dict[str, Dict[str, Dict[str, str]]]:
        """Initialize religious and cultural specialized terms"""
        return {
            "religious": {
                # Christian terms
                "en": {
                    "mass": "Mass",
                    "eucharist": "Eucharist",
                    "baptism": "Baptism",
                    "communion": "Holy Communion",
                    "trinity": "Holy Trinity",
                    "virgin_mary": "Virgin Mary",
                    "apostle": "Apostle",
                    "gospel": "Gospel",
                    "resurrection": "Resurrection",
                    "salvation": "Salvation"
                },
                "es": {
                    "mass": "Misa",
                    "eucharist": "Eucaristía",
                    "baptism": "Bautismo",
                    "communion": "Santa Comunión",
                    "trinity": "Santísima Trinidad",
                    "virgin_mary": "Virgen María",
                    "apostle": "Apóstol",
                    "gospel": "Evangelio",
                    "resurrection": "Resurrección",
                    "salvation": "Salvación"
                },
                "ar": {
                    "mass": "القداس",
                    "eucharist": "القربان المقدس",
                    "baptism": "المعمودية",
                    "communion": "التناول المقدس",
                    "trinity": "الثالوث الأقدس",
                    "virgin_mary": "العذراء مريم",
                    "apostle": "رسول",
                    "gospel": "الإنجيل",
                    "resurrection": "القيامة",
                    "salvation": "الخلاص"
                },
                
                # Islamic terms
                "en_islamic": {
                    "prayer": "Salah",
                    "pilgrimage": "Hajj",
                    "fasting": "Sawm",
                    "charity": "Zakat",
                    "mosque": "Masjid",
                    "quran": "Quran",
                    "prophet": "Prophet (PBUH)",
                    "mecca": "Makkah",
                    "medina": "Madinah"
                },
                
                # Jewish terms
                "en_jewish": {
                    "sabbath": "Shabbat",
                    "synagogue": "Synagogue",
                    "torah": "Torah",
                    "rabbi": "Rabbi",
                    "kosher": "Kosher",
                    "passover": "Pesach",
                    "temple": "Beit HaMikdash",
                    "prayer": "Tefillah",
                    "blessing": "Bracha"
                },
                
                "he": {
                    "sabbath": "שבת",
                    "synagogue": "בית כנסת",
                    "torah": "תורה",
                    "rabbi": "רב",
                    "kosher": "כשר",
                    "passover": "פסח",
                    "temple": "בית המקדש",
                    "prayer": "תפילה",
                    "blessing": "ברכה"
                }
            },
            
            "cultural": {
                # Cultural specific terms
                "places": {
                    "en": {
                        "holy_sepulchre": "Church of the Holy Sepulchre",
                        "western_wall": "Western Wall",
                        "dome_rock": "Dome of the Rock",
                        "nativity": "Church of the Nativity",
                        "gethsemane": "Garden of Gethsemane",
                        "mount_olives": "Mount of Olives",
                        "sea_galilee": "Sea of Galilee",
                        "dead_sea": "Dead Sea"
                    },
                    "es": {
                        "holy_sepulchre": "Iglesia del Santo Sepulcro",
                        "western_wall": "Muro de los Lamentos",
                        "dome_rock": "Cúpula de la Roca",
                        "nativity": "Iglesia de la Natividad",
                        "gethsemane": "Jardín de Getsemaní",
                        "mount_olives": "Monte de los Olivos",
                        "sea_galilee": "Mar de Galilea",
                        "dead_sea": "Mar Muerto"
                    },
                    "ar": {
                        "holy_sepulchre": "كنيسة القيامة",
                        "western_wall": "حائط البراق",
                        "dome_rock": "قبة الصخرة",
                        "nativity": "كنيسة المهد",
                        "gethsemane": "بستان جثسيماني",
                        "mount_olives": "جبل الزيتون",
                        "sea_galilee": "بحيرة طبريا",
                        "dead_sea": "البحر الميت"
                    }
                }
            }
        }
    
    async def translate(
        self,
        text: str,
        source_language: str,
        target_language: str,
        context: Optional[str] = None,
        perspective: Optional[str] = None,
        preserve_formatting: bool = True,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """Main translation method with multi-provider support"""
        
        # Check cache first
        if use_cache:
            cache_key = self._generate_cache_key(text, source_language, target_language, context)
            cached = await self.cache.get(cache_key)
            if cached:
                return json.loads(cached)
        
        # Prepare text
        prepared_text = self._prepare_text_for_translation(text, source_language, preserve_formatting)
        
        # Try multiple providers in order of preference
        translation_result = None
        provider_used = None
        
        for provider_name in ["openai", "deepl", "google", "azure", "local"]:
            try:
                provider_func = self.providers[provider_name]
                translation_result = await provider_func(
                    prepared_text,
                    source_language,
                    target_language,
                    context
                )
                provider_used = provider_name
                break
            except Exception as e:
                logger.warning(f"Translation failed with {provider_name}: {e}")
                continue
        
        if not translation_result:
            # Fallback to basic translation
            translation_result = self._basic_translation(text, source_language, target_language)
            provider_used = "basic"
        
        # Apply dialect adjustments
        if self._needs_dialect_adjustment(target_language):
            translation_result = self._apply_dialect_adjustments(
                translation_result,
                target_language
            )
        
        # Apply specialized terms if perspective is provided
        if perspective:
            translation_result = self._apply_specialized_terms(
                translation_result,
                target_language,
                perspective
            )
        
        # Post-process translation
        final_translation = self._post_process_translation(
            translation_result,
            target_language,
            preserve_formatting
        )
        
        result = {
            "original_text": text,
            "translated_text": final_translation,
            "source_language": source_language,
            "target_language": target_language,
            "provider": provider_used,
            "context": context,
            "perspective": perspective,
            "confidence_score": self._calculate_confidence_score(
                text, final_translation, provider_used
            ),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Cache result
        if use_cache:
            await self.cache.setex(cache_key, 86400, json.dumps(result))  # 24 hours
        
        return result
    
    def _generate_cache_key(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        context: Optional[str]
    ) -> str:
        """Generate unique cache key for translation"""
        key_parts = [text, source_lang, target_lang, context or ""]
        key_string = "|".join(key_parts)
        return f"translation:{hashlib.md5(key_string.encode()).hexdigest()}"
    
    def _prepare_text_for_translation(
        self,
        text: str,
        source_language: str,
        preserve_formatting: bool
    ) -> str:
        """Prepare text for translation"""
        if not preserve_formatting:
            # Remove extra whitespace
            text = " ".join(text.split())
        
        # Protect special tokens (like HTML tags, placeholders)
        protected_tokens = []
        import re
        
        # Protect HTML tags
        html_pattern = r'<[^>]+>'
        for match in re.finditer(html_pattern, text):
            token = f"__PROTECTED_{len(protected_tokens)}__"
            protected_tokens.append(match.group())
            text = text.replace(match.group(), token, 1)
        
        # Protect variables like {name}, [placeholder]
        var_pattern = r'(\{[^}]+\}|\[[^\]]+\])'
        for match in re.finditer(var_pattern, text):
            token = f"__PROTECTED_{len(protected_tokens)}__"
            protected_tokens.append(match.group())
            text = text.replace(match.group(), token, 1)
        
        return text
    
    async def _translate_google(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        context: Optional[str]
    ) -> str:
        """Translate using Google Translate"""
        try:
            # Map language codes
            src = self.language_map.get(source_lang, source_lang)
            dest = self.language_map.get(target_lang, target_lang)
            
            result = self.google_translator.translate(
                text,
                src=src,
                dest=dest
            )
            return result.text
        except Exception as e:
            logger.error(f"Google translation failed: {e}")
            raise
    
    async def _translate_deepl(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        context: Optional[str]
    ) -> str:
        """Translate using DeepL API"""
        # Requires DEEPL_AUTH_KEY in environment
        import os
        auth_key = os.getenv("DEEPL_AUTH_KEY")
        if not auth_key:
            raise ValueError("DeepL auth key not configured")
        
        translator = deepl.Translator(auth_key)
        
        # Map language codes for DeepL
        src = self._map_to_deepl_code(source_lang)
        dest = self._map_to_deepl_code(target_lang)
        
        result = translator.translate_text(
            text,
            source_lang=src,
            target_lang=dest
        )
        return result.text
    
    async def _translate_openai(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        context: Optional[str]
    ) -> str:
        """Translate using OpenAI GPT"""
        import os
        openai.api_key = os.getenv("OPENAI_API_KEY")
        
        # Get full language names
        source_name = self._get_language_name(source_lang)
        target_name = self._get_language_name(target_lang)
        
        prompt = f"""
        Translate the following text from {source_name} to {target_name}.
        {f'Context: {context}' if context else ''}
        Maintain the original tone and style.
        Consider cultural nuances and regional dialect for {target_lang}.
        
        Text to translate:
        {text}
        
        Translation:
        """
        
        response = await openai.ChatCompletion.acreate(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a professional translator with expertise in religious and cultural texts."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=2000
        )
        
        return response.choices[0].message.content.strip()
    
    async def _translate_azure(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        context: Optional[str]
    ) -> str:
        """Translate using Azure Cognitive Services"""
        import os
        subscription_key = os.getenv("AZURE_TRANSLATOR_KEY")
        endpoint = os.getenv("AZURE_TRANSLATOR_ENDPOINT")
        
        if not subscription_key or not endpoint:
            raise ValueError("Azure translator not configured")
        
        path = '/translate'
        constructed_url = endpoint + path
        
        params = {
            'api-version': '3.0',
            'from': self.language_map.get(source_lang, source_lang),
            'to': [self.language_map.get(target_lang, target_lang)]
        }
        
        headers = {
            'Ocp-Apim-Subscription-Key': subscription_key,
            'Content-type': 'application/json',
            'X-ClientTraceId': str(uuid.uuid4())
        }
        
        body = [{'text': text}]
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                constructed_url,
                params=params,
                headers=headers,
                json=body
            )
        
        result = response.json()
        return result[0]['translations'][0]['text']
    
    async def _translate_local(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        context: Optional[str]
    ) -> str:
        """Local/offline translation using pre-trained models"""
        # This would use local ML models for offline translation
        # For now, returning a simple mapping
        
        # Check if we have a direct translation in our specialized terms
        base_lang = self.language_map.get(target_lang, target_lang)
        
        # Simple word-by-word translation for demo
        # In production, this would use a proper offline translation model
        return f"[Offline translation to {target_lang}] {text}"
    
    def _basic_translation(
        self,
        text: str,
        source_lang: str,
        target_lang: str
    ) -> str:
        """Basic fallback translation"""
        return f"[Translation unavailable from {source_lang} to {target_lang}] {text}"
    
    def _needs_dialect_adjustment(self, language: str) -> bool:
        """Check if dialect adjustments are needed"""
        dialect_languages = [
            "en-GB", "en-AU", "en-CA", "en-IN",
            "es-MX", "es-AR", "es-CO", "es-PE", "es-CL",
            "zh-TW", "zh-HK",
            "pt-BR",
            "fr-CA", "fr-BE", "fr-CH",
            "de-AT", "de-CH",
            "nl-BE"
        ]
        return language in dialect_languages
    
    def _apply_dialect_adjustments(
        self,
        text: str,
        target_language: str
    ) -> str:
        """Apply dialect-specific adjustments"""
        # Determine base language and dialect
        base_lang = target_language.split("-")[0]
        
        # Find appropriate adjustments
        adjustment_key = None
        for key in self.dialect_adjustments.keys():
            if target_language in key:
                adjustment_key = key
                break
        
        if adjustment_key and adjustment_key in self.dialect_adjustments:
            adjustments = self.dialect_adjustments[adjustment_key]
            for original, replacement in adjustments.items():
                text = text.replace(original, replacement)
        
        return text
    
    def _apply_specialized_terms(
        self,
        text: str,
        target_language: str,
        perspective: str
    ) -> str:
        """Apply perspective-specific specialized terms"""
        base_lang = self.language_map.get(target_language, target_language)
        
        # Get religious terms for the perspective
        if perspective in ["catholic", "protestant", "orthodox"]:
            terms = self.specialized_terms.get("religious", {}).get(base_lang, {})
        elif perspective == "islamic":
            terms = self.specialized_terms.get("religious", {}).get(f"{base_lang}_islamic", {})
        elif perspective == "jewish":
            terms = self.specialized_terms.get("religious", {}).get(f"{base_lang}_jewish", {})
        else:
            return text
        
        # Apply term replacements
        for key, value in terms.items():
            # Case-insensitive replacement
            import re
            pattern = re.compile(re.escape(key), re.IGNORECASE)
            text = pattern.sub(value, text)
        
        return text
    
    def _post_process_translation(
        self,
        text: str,
        target_language: str,
        preserve_formatting: bool
    ) -> str:
        """Post-process translated text"""
        
        # Fix spacing issues
        if not preserve_formatting:
            text = " ".join(text.split())
        
        # Fix punctuation for RTL languages
        if target_language in ["he-IL", "ar-SA", "ar-EG", "ar-AE", "fa-IR", "ur-PK"]:
            # Adjust punctuation for RTL
            text = self._adjust_rtl_punctuation(text)
        
        # Fix capitalization
        if target_language.startswith("de"):
            # German noun capitalization
            text = self._fix_german_capitalization(text)
        
        return text
    
    def _adjust_rtl_punctuation(self, text: str) -> str:
        """Adjust punctuation for RTL languages"""
        # Swap parentheses and brackets for RTL
        replacements = {
            "(": ")",
            ")": "(",
            "[": "]",
            "]": "[",
            "{": "}",
            "}": "{"
        }
        
        for old, new in replacements.items():
            text = text.replace(old, f"__TEMP_{old}__")
        
        for old, new in replacements.items():
            text = text.replace(f"__TEMP_{old}__", new)
        
        return text
    
    def _fix_german_capitalization(self, text: str) -> str:
        """Fix German noun capitalization"""
        # In German, all nouns should be capitalized
        # This is a simplified version - full implementation would use NLP
        import re
        
        # Common German noun patterns
        noun_patterns = [
            r'\b(der|die|das|ein|eine|einer)\s+([a-z])',
            r'\b(im|am|zum|zur|vom|beim)\s+([a-z])'
        ]
        
        for pattern in noun_patterns:
            text = re.sub(
                pattern,
                lambda m: m.group(1) + " " + m.group(2).upper(),
                text
            )
        
        return text
    
    def _calculate_confidence_score(
        self,
        original: str,
        translated: str,
        provider: str
    ) -> float:
        """Calculate translation confidence score"""
        # Provider-based base scores
        provider_scores = {
            "openai": 0.95,
            "deepl": 0.93,
            "google": 0.88,
            "azure": 0.90,
            "local": 0.70,
            "basic": 0.50
        }
        
        base_score = provider_scores.get(provider, 0.50)
        
        # Adjust based on text length ratio
        len_ratio = len(translated) / len(original) if len(original) > 0 else 1.0
        
        # Expected ratios for common language pairs
        if 0.5 < len_ratio < 2.0:
            length_score = 1.0
        elif 0.3 < len_ratio < 3.0:
            length_score = 0.8
        else:
            length_score = 0.6
        
        return min(base_score * length_score, 1.0)
    
    def _get_language_name(self, language_code: str) -> str:
        """Get full language name from code"""
        language_names = {
            "en-US": "American English",
            "en-GB": "British English",
            "es-ES": "Spanish (Spain)",
            "es-MX": "Spanish (Mexico)",
            "zh-CN": "Simplified Chinese",
            "zh-TW": "Traditional Chinese",
            "ar-SA": "Arabic (Saudi Arabia)",
            "fr-FR": "French (France)",
            "de-DE": "German",
            "it-IT": "Italian",
            "ja-JP": "Japanese",
            "ko-KR": "Korean",
            "pt-BR": "Portuguese (Brazil)",
            "pt-PT": "Portuguese (Portugal)",
            "ru-RU": "Russian",
            "hi-IN": "Hindi",
            "he-IL": "Hebrew",
            # Add more as needed
        }
        
        return language_names.get(language_code, language_code)
    
    def _map_to_deepl_code(self, language_code: str) -> str:
        """Map language code to DeepL format"""
        deepl_map = {
            "en-US": "EN-US",
            "en-GB": "EN-GB",
            "de-DE": "DE",
            "fr-FR": "FR",
            "es-ES": "ES",
            "pt-PT": "PT-PT",
            "pt-BR": "PT-BR",
            "it-IT": "IT",
            "nl-NL": "NL",
            "pl-PL": "PL",
            "ru-RU": "RU",
            "ja-JP": "JA",
            "zh-CN": "ZH"
        }
        
        return deepl_map.get(language_code, language_code.upper())
    
    async def batch_translate(
        self,
        texts: List[str],
        source_language: str,
        target_languages: List[str],
        context: Optional[str] = None,
        perspective: Optional[str] = None
    ) -> Dict[str, List[Dict]]:
        """Batch translate multiple texts to multiple languages"""
        results = {}
        
        for target_lang in target_languages:
            translations = []
            for text in texts:
                translation = await self.translate(
                    text,
                    source_language,
                    target_lang,
                    context,
                    perspective
                )
                translations.append(translation)
            
            results[target_lang] = translations
        
        return results
    
    async def detect_language(self, text: str) -> str:
        """Detect the language of the text"""
        try:
            result = self.google_translator.detect(text)
            
            # Map detected language to our format
            for our_code, google_code in self.language_map.items():
                if google_code == result.lang:
                    return our_code
            
            return result.lang
        except Exception as e:
            logger.error(f"Language detection failed: {e}")
            return "en-US"  # Default fallback