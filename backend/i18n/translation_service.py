"""
Translation Service

Service for managing translations and language resources.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Optional
from fastapi import HTTPException


class TranslationService:
    """
    Service for managing translation files and language resources.
    
    This service provides functionality to:
    - Load translations from JSON files
    - Update translations dynamically
    - Get missing translations
    - Calculate translation statistics
    - Manage supported languages
    """
    
    SUPPORTED_LANGUAGES = {
        'en': {'name': 'English', 'native_name': 'English', 'dir': 'ltr'},
        'es': {'name': 'Spanish', 'native_name': 'Español', 'dir': 'ltr'},
        'he': {'name': 'Hebrew', 'native_name': 'עברית', 'dir': 'rtl'},
        'ar': {'name': 'Arabic', 'native_name': 'العربية', 'dir': 'rtl'},
        'fr': {'name': 'French', 'native_name': 'Français', 'dir': 'ltr'},
        'de': {'name': 'German', 'native_name': 'Deutsch', 'dir': 'ltr'},
    }
    
    RTL_LANGUAGES = ['he', 'ar']
    DEFAULT_LANGUAGE = 'en'
    
    def __init__(self, translations_dir: str = None):
        """
        Initialize translation service.
        
        Args:
            translations_dir: Path to translations directory
                            (default: frontend/src/locales)
        """
        if translations_dir is None:
            # Default to frontend locales directory
            current_dir = Path(__file__).parent
            project_root = current_dir.parent.parent
            translations_dir = project_root / 'frontend' / 'src' / 'locales'
        
        self.translations_dir = Path(translations_dir)
        self._cache: Dict[str, Dict[str, any]] = {}
    
    def get_translation_file_path(self, language: str, namespace: str = 'translation') -> Path:
        """Get path to translation file for a language and namespace"""
        return self.translations_dir / language / f'{namespace}.json'
    
    def load_translations(self, language: str, namespace: str = 'translation') -> Dict[str, any]:
        """
        Load translations for a specific language and namespace.
        
        Args:
            language: Language code (e.g., 'en', 'es')
            namespace: Translation namespace (default: 'translation')
            
        Returns:
            Dictionary with translations
            
        Raises:
            HTTPException: If language is not supported or file not found
        """
        if language not in self.SUPPORTED_LANGUAGES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported language: {language}"
            )
        
        # Check cache
        cache_key = f"{language}:{namespace}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        # Load from file
        file_path = self.get_translation_file_path(language, namespace)
        
        if not file_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Translation file not found: {file_path}"
            )
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                translations = json.load(f)
            
            # Cache translations
            self._cache[cache_key] = translations
            return translations
            
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Invalid JSON in translation file: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error loading translations: {str(e)}"
            )
    
    def update_translations(
        self,
        language: str,
        updates: Dict[str, str],
        namespace: str = 'translation'
    ) -> Dict[str, any]:
        """
        Update translations for a language.
        
        Args:
            language: Language code
            updates: Dictionary of key-value pairs to update
            namespace: Translation namespace
            
        Returns:
            Updated translations dictionary
        """
        # Load current translations
        translations = self.load_translations(language, namespace)
        
        # Apply updates (supports nested keys with dot notation)
        for key, value in updates.items():
            keys = key.split('.')
            current = translations
            
            # Navigate to nested location
            for k in keys[:-1]:
                if k not in current:
                    current[k] = {}
                current = current[k]
            
            # Set value
            current[keys[-1]] = value
        
        # Save to file
        file_path = self.get_translation_file_path(language, namespace)
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(translations, f, ensure_ascii=False, indent=2)
            
            # Update cache
            cache_key = f"{language}:{namespace}"
            self._cache[cache_key] = translations
            
            return translations
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error saving translations: {str(e)}"
            )
    
    def get_all_keys(self, translations: Dict[str, any], prefix: str = '') -> List[str]:
        """
        Recursively get all translation keys from a nested dictionary.
        
        Args:
            translations: Translations dictionary
            prefix: Key prefix for nested keys
            
        Returns:
            List of all translation keys (with dot notation)
        """
        keys = []
        for key, value in translations.items():
            full_key = f"{prefix}.{key}" if prefix else key
            if isinstance(value, dict):
                keys.extend(self.get_all_keys(value, full_key))
            else:
                keys.append(full_key)
        return keys
    
    def get_missing_translations(
        self,
        language: str,
        namespace: str = 'translation'
    ) -> List[str]:
        """
        Get list of missing translations for a language compared to default language.
        
        Args:
            language: Target language code
            namespace: Translation namespace
            
        Returns:
            List of missing translation keys
        """
        if language == self.DEFAULT_LANGUAGE:
            return []
        
        # Get all keys from default language
        default_translations = self.load_translations(self.DEFAULT_LANGUAGE, namespace)
        default_keys = set(self.get_all_keys(default_translations))
        
        # Get keys from target language
        target_translations = self.load_translations(language, namespace)
        target_keys = set(self.get_all_keys(target_translations))
        
        # Find missing keys
        missing_keys = default_keys - target_keys
        return sorted(list(missing_keys))
    
    def get_translation_statistics(self, namespace: str = 'translation') -> Dict[str, any]:
        """
        Get statistics about translations for all languages.
        
        Args:
            namespace: Translation namespace
            
        Returns:
            Dictionary with statistics
        """
        # Get total keys from default language
        default_translations = self.load_translations(self.DEFAULT_LANGUAGE, namespace)
        default_keys = self.get_all_keys(default_translations)
        total_keys = len(default_keys)
        
        translations_by_language = {}
        completion_by_language = {}
        missing_translations = {}
        
        for lang_code in self.SUPPORTED_LANGUAGES.keys():
            try:
                lang_translations = self.load_translations(lang_code, namespace)
                lang_keys = self.get_all_keys(lang_translations)
                count = len(lang_keys)
                
                translations_by_language[lang_code] = count
                completion_by_language[lang_code] = (count / total_keys * 100) if total_keys > 0 else 0
                
                if lang_code != self.DEFAULT_LANGUAGE:
                    missing = self.get_missing_translations(lang_code, namespace)
                    if missing:
                        missing_translations[lang_code] = missing
                        
            except HTTPException:
                # Language file doesn't exist
                translations_by_language[lang_code] = 0
                completion_by_language[lang_code] = 0.0
                missing_translations[lang_code] = default_keys
        
        return {
            'total_keys': total_keys,
            'total_languages': len(self.SUPPORTED_LANGUAGES),
            'translations_by_language': translations_by_language,
            'completion_by_language': completion_by_language,
            'missing_translations': missing_translations
        }
    
    def get_supported_languages(self) -> List[Dict[str, any]]:
        """
        Get list of all supported languages with their information.
        
        Returns:
            List of language information dictionaries
        """
        languages = []
        for code, info in self.SUPPORTED_LANGUAGES.items():
            languages.append({
                'code': code,
                'name': info['name'],
                'native_name': info['native_name'],
                'direction': info['dir'],
                'is_rtl': code in self.RTL_LANGUAGES
            })
        return languages
    
    def detect_language_from_header(self, accept_language: Optional[str]) -> str:
        """
        Detect preferred language from Accept-Language header.
        
        Args:
            accept_language: Accept-Language header value
            
        Returns:
            Detected language code or default language
        """
        if not accept_language:
            return self.DEFAULT_LANGUAGE
        
        # Parse Accept-Language header (simplified)
        # Example: "en-US,en;q=0.9,es;q=0.8"
        languages = []
        for lang_spec in accept_language.split(','):
            parts = lang_spec.strip().split(';')
            lang = parts[0].split('-')[0].lower()  # Get base language code
            
            # Extract quality value
            quality = 1.0
            if len(parts) > 1:
                try:
                    quality = float(parts[1].split('=')[1])
                except (IndexError, ValueError):
                    pass
            
            if lang in self.SUPPORTED_LANGUAGES:
                languages.append((lang, quality))
        
        # Sort by quality (descending)
        languages.sort(key=lambda x: x[1], reverse=True)
        
        return languages[0][0] if languages else self.DEFAULT_LANGUAGE
    
    def clear_cache(self):
        """Clear the translation cache"""
        self._cache.clear()


# Global translation service instance
translation_service = TranslationService()
